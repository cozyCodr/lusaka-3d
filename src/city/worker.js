// Tile worker: fetches one city tile (data/tiles/<level>/<tx>_<tz>.json) and
// builds its geometry off the main thread. Replies with transferable typed
// arrays: one {position, normal, color} batch each for buildings, roads and
// areas, plus the building footprints (world x/z) for walk collisions.
// Module worker: import maps do not apply here, so imports are full URLs or
// dependency-free local modules.
import earcut from 'https://cdn.jsdelivr.net/npm/earcut@3.0.1/+esm';
import { heightAt } from '../terrain.js';

// Building type -> wall palette (see BTYPES in tools/osm_tiles.py).
const WALLS = [
  [0xe8dcc0, 0xe9c7a0, 0xf0ece4, 0xecd9a0, 0xc98b62, 0xd9c7b0],
  [0xdcd6cc, 0xe4ddd0, 0xcfc6b8],
  [0xe6e2da, 0xd0cfc9, 0xefe7d6],
  [0x9fb0b8, 0xcfcac0, 0xb8c2c6],
  [0xe0cfa8, 0xe8dcc0],
  [0xefe9df],
  [0xb8b8b0, 0xa9a69c],
  [0xa0a0a0],
  [0xe4dccb, 0xd8cdb8, 0xeee6d6, 0xd9b99a],
];
const IRON_ROOFS = [0x8d8f8f, 0x8a4b32, 0x4f6f55, 0x4b6177, 0x9b3b2e, 0x7b7d7f];
const FLAT_ROOF = 0xb9b3a8;
// Road kinds (tools/osm_tiles.py): 0 primary/trunk, 1 secondary/tertiary,
// 2 residential, 3 service (3 m wide: track), 4 footpaths, 5 runways/taxiways.
const ROAD_COLORS = [0x3e3f41, 0x434446, 0x48494b, 0x4e4f51, 0xaaa59c, 0x46474a];
const DIRT = 0x8a7358; // tracks
const ROAD_LIFT = [0.12, 0.1, 0.08, 0.07, 0.06, 0.11];
// Detail near the camera: concrete pavements (width each side) and white
// markings (centre dash [length, gap], solid edge lines).
const PAVEMENT = [2.2, 1.8, 0.35, 0.3, 0, 0]; // smaller roads: just a kerb
const PAVEMENT_COLOR = 0x9e9a92, PAVEMENT_LIFT = 0.065; // under every carriageway, so junctions stay clean
const CENTRE_DASH = [[3, 6], [3, 6], null, null, null, [30, 20]];
const EDGE_LINE = [true, false, false, false, false, false];
const PAINT = 0xe6e4dc;
const JUNCTION = 9; // no markings this close to a way's ends (ways split at junctions)
const AREA_COLORS = [0x6f9444, 0x7aa551, 0x4a7f98, 0x3f6a33, 0xb4ad9f, 0x5b5b5d];

// Hex sRGB -> linear RGB, which is what three.js expects in vertex colours.
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex) => [lin(((hex >> 16) & 255) / 255), lin(((hex >> 8) & 255) / 255), lin((hex & 255) / 255)];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Batch {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
  }
  tri(a, b, c, color) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(nx, ny, nz);
      this.col.push(color[0], color[1], color[2]);
    }
  }
  out() {
    return { position: new Float32Array(this.pos), normal: new Float32Array(this.nrm), color: new Float32Array(this.col) };
  }
}

// Dequantize "x0, z0, x1, z1, ..." (decimetres from the tile corner) to world [x, z] points.
function points(rec, from, ox, oz) {
  const pts = [];
  for (let i = from; i + 1 < rec.length; i += 2) pts.push([ox + rec[i] / 10, oz + rec[i + 1] / 10]);
  return pts;
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

function buildings(list, ox, oz, seed, wantFootprints) {
  const b = new Batch();
  const r = rng(seed);
  const footprints = [];
  for (const rec of list) {
    const [type, h10] = rec;
    let pts = points(rec, 2, ox, oz);
    if (pts.length < 3) continue;
    if (wantFootprints) footprints.push(Float32Array.from(pts.flat()));
    if (signedArea(pts) < 0) pts = pts.reverse();
    const h = h10 / 10;
    let gMin = Infinity, gMax = -Infinity;
    for (const [x, z] of pts) {
      const g = heightAt(x, z);
      gMin = Math.min(gMin, g);
      gMax = Math.max(gMax, g);
    }
    const y0 = gMin - 0.4, y1 = gMax + h;
    const pal = WALLS[type] ?? WALLS[8];
    const wall = rgb(pal[Math.floor(r() * pal.length)]).map((v) => Math.min(1, v * (0.96 + r() * 0.08)));
    const roof = rgb(type === 0 || (type === 8 && h < 5) ? IRON_ROOFS[Math.floor(r() * IRON_ROOFS.length)] : FLAT_ROOF);
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      b.tri([ax, y0, az], [ax, y1, az], [bx, y1, bz], wall);
      b.tri([ax, y0, az], [bx, y1, bz], [bx, y0, bz], wall);
    }
    const idx = earcut(pts.flat());
    for (let i = 0; i < idx.length; i += 3) {
      const p = [pts[idx[i]], pts[idx[i + 1]], pts[idx[i + 2]]].map(([x, z]) => [x, y1, z]);
      const cross = (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]);
      if (cross < 0) b.tri(p[0], p[1], p[2], roof);
      else b.tri(p[0], p[2], p[1], roof);
    }
  }
  return { batch: b.out(), footprints };
}

function densify(pts, step = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

function roads(list, ox, oz, detail) {
  const b = new Batch();
  const paint = rgb(PAINT), pavement = rgb(PAVEMENT_COLOR);
  for (const rec of list) {
    const [kind, w10] = rec;
    const pts = densify(points(rec, 2, ox, oz));
    if (pts.length < 2) continue;
    const color = rgb(kind === 3 && w10 <= 30 ? DIRT : ROAD_COLORS[kind]);
    const hw = w10 / 20;
    // per point: position, unit normal (to the left), ground height, distance along
    const frame = [];
    let s = 0;
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      let tx = c[0] - a[0], tz = c[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      frame.push({ x: p[0], z: p[1], nx: -tz / l, nz: tx / l, y: heightAt(p[0], p[1]), s });
    });
    const total = s;
    // a strip between lateral offsets o0..o1, from distance s0 to s1
    const strip = (o0, o1, lift, col, s0 = 0, s1 = total) => {
      const at = (f, g, t, o) => {
        const x = f.x + (g.x - f.x) * t, z = f.z + (g.z - f.z) * t, y = f.y + (g.y - f.y) * t + lift;
        const nx = f.nx + (g.nx - f.nx) * t, nz = f.nz + (g.nz - f.nz) * t;
        return [x + nx * o, y, z + nz * o];
      };
      for (let i = 1; i < frame.length; i++) {
        const f = frame[i - 1], g = frame[i];
        if (g.s <= s0 || f.s >= s1 || g.s === f.s) continue;
        const t0 = Math.max(0, (s0 - f.s) / (g.s - f.s)), t1 = Math.min(1, (s1 - f.s) / (g.s - f.s));
        const l0 = at(f, g, t0, o1), r0 = at(f, g, t0, o0), l1 = at(f, g, t1, o1), r1 = at(f, g, t1, o0);
        b.tri(l0, r1, l1, col);
        b.tri(l0, r0, r1, col);
      }
    };
    strip(-hw, hw, ROAD_LIFT[kind], color);
    if (!detail) continue;
    const pw = PAVEMENT[kind];
    if (pw) {
      strip(hw, hw + pw, PAVEMENT_LIFT, pavement);
      strip(-hw - pw, -hw, PAVEMENT_LIFT, pavement);
    }
    const lift = ROAD_LIFT[kind] + 0.015;
    const dash = CENTRE_DASH[kind];
    if (dash && total > 2 * JUNCTION) {
      const w = kind === 5 ? 0.45 : 0.08;
      for (let d = JUNCTION; d + dash[0] < total - JUNCTION; d += dash[0] + dash[1]) strip(-w, w, lift, paint, d, d + dash[0]);
    }
    if (EDGE_LINE[kind] && total > 2 * JUNCTION) {
      strip(hw - 0.45, hw - 0.3, lift, paint, JUNCTION, total - JUNCTION);
      strip(-hw + 0.3, -hw + 0.45, lift, paint, JUNCTION, total - JUNCTION);
    }
  }
  return b.out();
}

function areas(list, ox, oz) {
  const b = new Batch();
  for (const rec of list) {
    const pts = points(rec, 1, ox, oz);
    if (pts.length < 3) continue;
    const color = rgb(AREA_COLORS[rec[0]] ?? AREA_COLORS[0]);
    let cx = 0, cz = 0;
    for (const [x, z] of pts) { cx += x; cz += z; }
    const y = heightAt(cx / pts.length, cz / pts.length) + 0.03 + rec[0] * 0.004;
    const idx = earcut(pts.flat());
    for (let i = 0; i < idx.length; i += 3) {
      const p = [pts[idx[i]], pts[idx[i + 1]], pts[idx[i + 2]]].map(([x, z]) => [x, y, z]);
      const cross = (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]);
      if (cross < 0) b.tri(p[0], p[1], p[2], color);
      else b.tri(p[0], p[2], p[1], color);
    }
  }
  return b.out();
}

self.onmessage = async ({ data: job }) => {
  const { id, url, tx, tz, tile, level } = job;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const d = await res.json();
    const ox = tx * tile, oz = tz * tile;
    const seed = (tx * 73856093) ^ (tz * 19349663);
    const bld = buildings(d.b, ox, oz, seed, level === 'full');
    const out = { id, count: d.b.length, buildings: bld.batch, roads: roads(d.r, ox, oz, level === 'full'), areas: areas(d.a, ox, oz), footprints: bld.footprints };
    const transfer = [];
    for (const k of ['buildings', 'roads', 'areas']) transfer.push(out[k].position.buffer, out[k].normal.buffer, out[k].color.buffer);
    for (const f of out.footprints) transfer.push(f.buffer);
    self.postMessage(out, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
