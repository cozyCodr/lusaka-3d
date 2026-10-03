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
const SHED_ROOF = 0xa9aba7; // galvanised iron on warehouses and workshops
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

const NO_FACADE = [0, 0, 0, 0];

class Batch {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
    this.fac = [];
  }
  // f: optional facade coordinates per corner, [u, v, kind, seed] (see FACADES)
  tri(a, b, c, color, f) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    [a, b, c].forEach((p, i) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(nx, ny, nz);
      this.col.push(color[0], color[1], color[2]);
      if (f) this.fac.push(...f[i]);
    });
  }
  out() {
    const o = { position: new Float32Array(this.pos), normal: new Float32Array(this.nrm), color: new Float32Array(this.col) };
    if (this.fac.length) o.facade = new Float32Array(this.fac);
    return o;
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

// Facades are drawn in the building shader (tiles.js) from per-vertex
// coordinates: u counts window bays along a wall (a whole number per wall, so
// no window wraps a corner), v counts floors from the ground, kind picks the
// window pattern and seed varies lit windows at night. Roofs use u for the
// corrugation of iron sheets.
// Facade kinds: 0 plain, 1 house, 2 flats, 3 shops, 4 offices, 5 schools and
// hospitals, 6 churches, 7 sheds and warehouses, 8 iron roof.
// Per building type: [kind, floor height, bay width] (null floor: one tall storey).
const FACADES = [[1, 3, 3.6], [2, 3, 3.4], [3, 4, 4.5], [4, 3.5, 1.8], [5, 3.5, 3.2], [6, null, 3], [7, null, 6], [0, 3, 4]];
const facadeFor = (type, h) => (type === 8 ? (h < 5.5 ? FACADES[0] : h < 10 ? FACADES[4] : FACADES[3]) : FACADES[type] ?? FACADES[7]);
const CORRUGATION = 0.8; // metres per sheet rib, as drawn
const PITCH = Math.tan((22 * Math.PI) / 180), EAVE = 0.45;

function convexHull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => list.reduce((h, q) => {
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
    h.push(q);
    return h;
  }, []);
  return [...half(p).slice(0, -1), ...half(p.reverse()).slice(0, -1)];
}

// Smallest rectangle round a footprint: centre, long axis (ux, uz), length, width.
function orientedBox(pts) {
  const hull = convexHull(pts);
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const [x0, z0] = hull[i], [x1, z1] = hull[(i + 1) % hull.length];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l < 1e-6) continue;
    const ux = (x1 - x0) / l, uz = (z1 - z0) / l;
    let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
    for (const [x, z] of hull) {
      const s = x * ux + z * uz, t = -x * uz + z * ux;
      s0 = Math.min(s0, s); s1 = Math.max(s1, s); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
    }
    const area = (s1 - s0) * (t1 - t0);
    if (!best || area < best.area) {
      const sc = (s0 + s1) / 2, tc = (t0 + t1) / 2;
      best = { area, cx: sc * ux - tc * uz, cz: sc * uz + tc * ux, ux, uz, L: s1 - s0, W: t1 - t0 };
    }
  }
  if (best && best.W > best.L) Object.assign(best, { ux: -best.uz, uz: best.ux, L: best.W, W: best.L });
  return best;
}

// A hipped iron roof over a near-rectangular house, with eaves and a soffit.
function hipRoof(b, box, y, color, seed) {
  const { cx, cz, ux, uz } = box;
  const a = box.L / 2 + EAVE, w = box.W / 2 + EAVE;
  const r = Math.max(0, a - w), top = y + w * PITCH;
  const P = (s, t, h) => [cx + s * ux - t * uz, h, cz + s * uz + t * ux];
  const F = (u) => [u / CORRUGATION, 0, 8, seed];
  // a face pointing up (or down, for the soffit)
  const up = (p, q, o, f, col = color, dir = 1) => {
    const ny = (q[2] - p[2]) * (o[0] - p[0]) - (q[0] - p[0]) * (o[2] - p[2]);
    if (ny * dir > 0) b.tri(p, q, o, col, f);
    else b.tri(p, o, q, col, [f[0], f[2], f[1]]);
  };
  const e = y; // eave height
  // long slopes: ribs run down the slope, so u runs along the ridge
  for (const t of [-w, w]) {
    up(P(-a, t, e), P(a, t, e), P(r, 0, top), [F(-a), F(a), F(r)]);
    up(P(-a, t, e), P(r, 0, top), P(-r, 0, top), [F(-a), F(r), F(-r)]);
  }
  // hip ends: u runs across
  for (const s of [-1, 1]) up(P(s * a, -w, e), P(s * a, w, e), P(s * r, 0, top), [F(-w), F(w), F(0)]);
  // soffit, so the roof is not hollow from below
  const dark = color.map((v) => v * 0.55);
  const none = [NO_FACADE, NO_FACADE, NO_FACADE];
  up(P(-a, -w, e), P(a, w, e), P(a, -w, e), none, dark, -1);
  up(P(-a, -w, e), P(-a, w, e), P(a, w, e), none, dark, -1);
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
    const area = Math.abs(signedArea(pts));
    const house = type === 0 || (type === 8 && h < 5.5 && area < 400);
    const iron = house || type === 6;
    const roof = rgb(house ? IRON_ROOFS[Math.floor(r() * IRON_ROOFS.length)] : type === 6 ? SHED_ROOF : FLAT_ROOF);
    const bseed = r();
    // walls, in whole bays and floors
    const [kind, fh, bay] = facadeFor(type, h);
    const floors = fh ? Math.max(1, Math.round((y1 - gMin) / fh)) : 1;
    const v = (y) => ((y - gMin) / (y1 - gMin)) * floors;
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const bays = Math.round(Math.hypot(bx - ax, bz - az) / bay);
      const u0 = bays ? 0 : -1, u1 = bays || -1; // walls too short for a window stay blank
      const f = [[u0, v(y0), kind, bseed], [u0, v(y1), kind, bseed], [u1, v(y1), kind, bseed], [u1, v(y0), kind, bseed]];
      b.tri([ax, y0, az], [ax, y1, az], [bx, y1, bz], wall, [f[0], f[1], f[2]]);
      b.tri([ax, y0, az], [bx, y1, bz], [bx, y0, bz], wall, [f[0], f[2], f[3]]);
    }
    // roof: hipped on rectangular houses, flat elsewhere (iron on houses and sheds)
    const box = house && pts.length <= 12 ? orientedBox(pts) : null;
    if (box && area > 0.85 * box.L * box.W && box.W > 3) {
      hipRoof(b, box, y1 - 0.3, roof, bseed);
      continue;
    }
    let ux = 1, uz = 0, longest = 0;
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const l = Math.hypot(bx - ax, bz - az);
      if (l > longest) [longest, ux, uz] = [l, (bx - ax) / l, (bz - az) / l];
    }
    const rf = (p) => (iron ? [(p[0] * ux + p[2] * uz) / CORRUGATION, 0, 8, bseed] : NO_FACADE);
    const idx = earcut(pts.flat());
    for (let i = 0; i < idx.length; i += 3) {
      const p = [pts[idx[i]], pts[idx[i + 1]], pts[idx[i + 2]]].map(([x, z]) => [x, y1, z]);
      const cross = (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]);
      if (cross < 0) b.tri(p[0], p[1], p[2], roof, p.map(rf));
      else b.tri(p[0], p[2], p[1], roof, [p[0], p[2], p[1]].map(rf));
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

// ---------- walls ----------
// Wall records (tools/osm_tiles.py): kinds 0 wall, 1 fence, 2 hedge mapped in
// OSM; 3 estimated plot wall, 4 gate. Plot walls are what imagery shows round
// nearly every house: plastered or bare block, a little over head height.
// Per kind: [height, thickness, colours].
const WALL_KINDS = [
  [2.2, 0.22, [0xd9cdb4, 0xc8c0b0, 0xe3ddd0, 0xa9a59b]],
  [1.8, 0.06, [0x5a5c5a, 0x6b6d69]],
  [1.7, 1.0, [0x48693a, 0x557a40]],
  [2.3, 0.22, [0xd9cdb4, 0xe6e1d6, 0xc9bfa8, 0x9d9a92, 0xc9a46c, 0xcfae9a, 0xb7b2a8]],
  [2.0, 0.1, [0x2f3134, 0x3a3d40, 0x5b3a2a]],
];

const inHulls = (hulls, x, z) => hulls.some((h) => x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1 &&
  h.pts.every((a, i) => {
    const b = h.pts[(i + 1) % h.pts.length];
    return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) >= 0;
  }));

// Returns two batches: mapped (OSM) and estimated, which carry different confidence.
function walls(list, ox, oz, seed, hulls) {
  const mapped = new Batch(), est = new Batch();
  const segs = []; // for the car's colliders: x0, z0, x1, z1, half thickness, height
  const r = rng(seed ^ 0x2545f491);
  for (const rec of list) {
    const kind = rec[0];
    const [H, T, pal] = WALL_KINDS[kind] ?? WALL_KINDS[0];
    const b = kind >= 3 ? est : mapped;
    const col = rgb(pal[Math.floor(r() * pal.length)]).map((v) => v * (0.94 + r() * 0.1));
    const top = col.map((v) => Math.min(1, v * 1.12)); // coping catches the light
    const h = kind === 3 ? H + r() * 0.4 : H;
    const pts = densify(points(rec, 1, ox, oz), 8);
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.05 || inHulls(hulls, (ax + bx) / 2, (az + bz) / 2)) continue;
      segs.push(ax, az, bx, bz, T / 2, h);
      const nx = (-(bz - az) / len) * (T / 2), nz = ((bx - ax) / len) * (T / 2);
      const ga = heightAt(ax, az), gb = heightAt(bx, bz);
      const lift = kind === 4 ? 0.05 : -0.3;
      const A = [ax + nx, ga + lift, az + nz], B = [bx + nx, gb + lift, bz + nz], C = [bx - nx, gb + lift, bz - nz], D = [ax - nx, ga + lift, az - nz];
      const up = (p, g) => [p[0], g + h, p[2]];
      const A2 = up(A, ga), B2 = up(B, gb), C2 = up(C, gb), D2 = up(D, ga);
      b.tri(A, B, B2, col); b.tri(A, B2, A2, col); // one side
      b.tri(C, D, D2, col); b.tri(C, D2, C2, col); // the other
      b.tri(A2, B2, C2, top); b.tri(A2, C2, D2, top); // top
      // ends, only where the run starts and stops (joins are hidden inside the wall)
      if (i === 1) { b.tri(D, A, A2, col); b.tri(D, A2, D2, col); }
      if (i === pts.length - 1) { b.tri(B, C, C2, col); b.tri(B, C2, B2, col); }
    }
  }
  return { mapped: mapped.out(), estimated: est.out(), segs: new Float32Array(segs) };
}

// ---------- trees ----------
// Lusaka is a green city: avenues of jacaranda and flamboyant, mango and
// broad-crowned trees in every yard, woodland in the parks. Trees are placed
// per full tile on a 2 m occupancy grid so that none stands on a road, a
// pavement, a building, a car park, a pitch or water.
// Species: 0 broad (msasa / acacia), 1 jacaranda, 2 flamboyant, 3 mango,
// 4 palm, 5 eucalyptus. Output: [x, y, z, scale, rotation, species] each.
const GRID = 2;
const pick = (r, weights) => {
  let t = r() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) if ((t -= weights[i]) < 0) return i;
  return 0;
};
const AVENUE = [3, 4, 0, 1, 0, 0], GARDEN = [3, 1.6, 1, 3.5, 0.8, 0.6], WOOD = [7, 0.3, 0.2, 0.5, 0, 2.5], BUSH = [8, 0.2, 0.3, 0.6, 0, 1];

function trees(d, ox, oz, tile, density, seed) {
  const N = Math.ceil(tile / GRID);
  const blocked = new Uint8Array(N * N); // 1 = no tree
  const kind = new Uint8Array(N * N); // 1 park grass, 2 wood
  const houses = new Uint16Array(Math.ceil(tile / 20) ** 2);
  const H = Math.ceil(tile / 20);
  const cell = (x, z) => {
    const i = Math.floor((x - ox) / GRID), j = Math.floor((z - oz) / GRID);
    return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i;
  };
  const fillPoly = (pts, arr, v) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const i0 = Math.max(0, Math.floor((x0 - ox) / GRID)), i1 = Math.min(N - 1, Math.floor((x1 - ox) / GRID));
    const j0 = Math.max(0, Math.floor((z0 - oz) / GRID)), j1 = Math.min(N - 1, Math.floor((z1 - oz) / GRID));
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * GRID;
      for (let i = i0; i <= i1; i++) {
        const x = ox + (i + 0.5) * GRID;
        let hit = false;
        for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
          const [xa, za] = pts[a], [xb, zb] = pts[b];
          if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa) hit = !hit;
        }
        if (hit) arr[j * N + i] = v;
      }
    }
  };
  // areas: pitches, water, paving and runways are off limits; parks and woods invite trees
  for (const rec of d.a) {
    const pts = points(rec, 1, ox, oz);
    if (pts.length < 3) continue;
    if (rec[0] === 0) fillPoly(pts, kind, 1);
    else if (rec[0] === 3) fillPoly(pts, kind, 2);
    else fillPoly(pts, blocked, 1);
  }
  // buildings, with a 2 m margin added below; small ones count as houses with yards
  for (const rec of d.b) {
    const pts = points(rec, 2, ox, oz);
    if (pts.length < 3) continue;
    fillPoly(pts, blocked, 1);
    if (rec[0] === 0 || (rec[0] === 8 && Math.abs(signedArea(pts)) < 400)) {
      const [x, z] = pts[0];
      const i = Math.floor((x - ox) / 20), j = Math.floor((z - oz) / 20);
      if (i >= 0 && j >= 0 && i < H && j < H) houses[j * H + i]++;
    }
  }
  // walls and hedges, with room for a trunk beside them
  for (const rec of d.w ?? []) {
    for (const [x, z] of densify(points(rec, 1, ox, oz), 1)) {
      const c = cell(x, z);
      if (c >= 0) blocked[c] = 1;
    }
  }
  // roads and their pavements, plus a little room for the crown
  const roadSide = [];
  for (const rec of d.r) {
    const [k, w10] = rec;
    const pts = densify(points(rec, 2, ox, oz), 1.5);
    const r = w10 / 20 + (PAVEMENT[k] ?? 0) + 1.2;
    const rc = Math.ceil(r / GRID);
    for (const [x, z] of pts) {
      const c = cell(x, z);
      if (c < 0 && (x < ox - r || z < oz - r || x > ox + tile + r || z > oz + tile + r)) continue;
      const ci = Math.floor((x - ox) / GRID), cj = Math.floor((z - oz) / GRID);
      for (let dj = -rc; dj <= rc; dj++) {
        for (let di = -rc; di <= rc; di++) {
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= N || j >= N) continue;
          if (Math.hypot(di * GRID, dj * GRID) <= r) blocked[j * N + i] = 1;
        }
      }
    }
    if (k <= 2) roadSide.push([k, w10 / 20 + (PAVEMENT[k] ?? 0) + 1.8, points(rec, 2, ox, oz)]);
  }
  const free = (x, z) => {
    const ci = Math.floor((x - ox) / GRID), cj = Math.floor((z - oz) / GRID);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= N || j >= N || blocked[j * N + i]) return false;
      }
    }
    return true;
  };
  const r = rng(seed ^ 0x5bd1e995);
  const out = [];
  const plant = (x, z, weights, size) => {
    if (!free(x, z)) return;
    const c = cell(x, z);
    blocked[c] = 1; // one tree per spot
    out.push(x, heightAt(x, z), z, size * (1.15 + r() * 0.6), r() * Math.PI * 2, pick(r, weights));
  };
  // avenues along main and residential roads, both sides
  for (const [k, off, pts] of roadSide) {
    const gap = k === 0 ? 10 : k === 1 ? 11 : 13, p = (k === 2 ? 0.55 : 0.8) * density;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 1) continue;
      const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      for (let d0 = gap / 2; d0 < len; d0 += gap) {
        const x = x0 + ((x1 - x0) * d0) / len, z = z0 + ((z1 - z0) * d0) / len;
        for (const side of [-1, 1]) if (r() < p) plant(x + nx * off * side, z + nz * off * side, k === 2 ? GARDEN : AVENUE, 1.05);
      }
    }
  }
  // yards, parks, woods and open bush, on jittered grids
  const scatter = (step, test) => {
    for (let z = oz + step / 2; z < oz + tile; z += step) {
      for (let x = ox + step / 2; x < ox + tile; x += step) {
        const px = x + (r() - 0.5) * step, pz = z + (r() - 0.5) * step;
        const c = cell(px, pz);
        if (c >= 0) test(px, pz, c);
      }
    }
  };
  scatter(7, (x, z, c) => {
    if (kind[c] === 2 && r() < 0.85 * density) plant(x, z, WOOD, 1.1);
  });
  scatter(8, (x, z, c) => {
    const i = Math.floor((x - ox) / 20), j = Math.floor((z - oz) / 20);
    let n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) n += houses[(j + dj) * H + i + di] ?? 0;
    if (n && r() < Math.min(0.85, 0.22 * n) * density) plant(x, z, GARDEN, 1);
    else if (kind[c] === 1 && r() < 0.4 * density) plant(x, z, GARDEN, 1.1);
  });
  scatter(18, (x, z, c) => {
    if (!kind[c] && r() < 0.3 * density) plant(x, z, BUSH, 0.95);
  });
  return new Float32Array(out);
}

self.onmessage = async ({ data: job }) => {
  const { id, url, tx, tz, tile, level, treeDensity = 0, clearings = [] } = job;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const d = await res.json();
    const ox = tx * tile, oz = tz * tile;
    const seed = (tx * 73856093) ^ (tz * 19349663);
    const bld = buildings(d.b, ox, oz, seed, level === 'full');
    const out = { id, count: d.b.length, buildings: bld.batch, roads: roads(d.r, ox, oz, level === 'full'), areas: areas(d.a, ox, oz), footprints: bld.footprints };
    const w = walls(d.w ?? [], ox, oz, seed, clearings);
    out.walls = w.mapped;
    out.plotWalls = w.estimated;
    out.wallSegs = w.segs;
    // far tiles (main roads and big buildings only) get a lighter scatter so the horizon is not bare
    const density = level === 'full' ? treeDensity : treeDensity * 0.3;
    out.trees = density > 0 ? trees(d, ox, oz, tile, density, seed) : new Float32Array(0);
    const transfer = [];
    for (const k of ['buildings', 'roads', 'areas', 'walls', 'plotWalls']) transfer.push(out[k].position.buffer, out[k].normal.buffer, out[k].color.buffer);
    if (out.buildings.facade) transfer.push(out.buildings.facade.buffer);
    for (const f of out.footprints) transfer.push(f.buffer);
    transfer.push(out.trees.buffer, out.wallSegs.buffer);
    self.postMessage(out, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
