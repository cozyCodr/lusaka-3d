// The base city from OpenStreetMap (data/core.json, built by
// tools/osm_to_json.py): extruded footprints, road ribbons and land-use
// patches, merged into a few large meshes per 400 m chunk.
import * as THREE from 'three';
import { CITY_Y, heightAt } from './geo.js';
import { rng } from './util.js';

const CHUNK = 400;

// Building type index (see BTYPES in the converter) -> wall palette.
const WALLS = [
  [0xe8dcc0, 0xe9c7a0, 0xf0ece4, 0xecd9a0, 0xc98b62, 0xd9c7b0], // house
  [0xdcd6cc, 0xe4ddd0, 0xcfc6b8], // apartments
  [0xe6e2da, 0xd0cfc9, 0xefe7d6], // retail
  [0x9fb0b8, 0xcfcac0, 0xb8c2c6], // office
  [0xe0cfa8, 0xe8dcc0], // school / hospital
  [0xefe9df], // church
  [0xb8b8b0, 0xa9a69c], // industrial
  [0xa0a0a0], // roof canopy
  [0xe4dccb, 0xd8cdb8, 0xeee6d6, 0xd9b99a], // unknown
];
const IRON_ROOFS = [0x8d8f8f, 0x8a4b32, 0x4f6f55, 0x4b6177, 0x9b3b2e, 0x7b7d7f];
const FLAT_ROOF = 0xb9b3a8;
const ROAD_COLORS = [0x3a3a3c, 0x434345, 0x55524c, 0x8a7358, 0xbdb2a0];
const ROAD_LIFT = [0.12, 0.1, 0.08, 0.07, 0.06];
const AREA_COLORS = [0x6f9444, 0x7aa551, 0x4a7f98, 0x3f6a33, 0xb4ad9f];

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
      this.col.push(color.r, color.g, color.b);
    }
  }
  quad(a, b, c, d, color) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  mesh(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, material);
  }
}

// Group items into spatial chunks so off-screen parts of the city are culled.
class Chunks {
  constructor() {
    this.map = new Map();
  }
  at(x, z) {
    const k = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    if (!this.map.has(k)) this.map.set(k, new Batch());
    return this.map.get(k);
  }
  meshes(material, opts) {
    return [...this.map.values()].map((b) => Object.assign(b.mesh(material), opts));
  }
}

function toPoints(flat, from) {
  const pts = [];
  for (let i = from; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
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

function pick(list, r) {
  return new THREE.Color(list[Math.floor(r() * list.length)]);
}

function buildings(data) {
  const chunks = new Chunks();
  const r = rng(101);
  for (const b of data.buildings) {
    const [type, h] = b;
    let pts = toPoints(b, 2);
    // Walls face outward when the ring has positive signed area in x/z.
    if (signedArea(pts) < 0) pts = pts.reverse();

    let gMin = Infinity, gMax = -Infinity, cx = 0, cz = 0;
    for (const [x, z] of pts) {
      const g = heightAt(x, z);
      gMin = Math.min(gMin, g);
      gMax = Math.max(gMax, g);
      cx += x; cz += z;
    }
    const y0 = gMin - 0.4, y1 = gMax + h;
    const batch = chunks.at(cx / pts.length, cz / pts.length);
    const wall = pick(WALLS[type] ?? WALLS[8], r).offsetHSL(0, 0, (r() - 0.5) * 0.06);
    const roof = new THREE.Color(type === 0 || (type === 8 && h < 5) ? IRON_ROOFS[Math.floor(r() * IRON_ROOFS.length)] : FLAT_ROOF);

    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      batch.quad([ax, y0, az], [ax, y1, az], [bx, y1, bz], [bx, y0, bz], wall);
    }
    const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [i, j, k] of tris) {
      const a = [pts[i][0], y1, pts[i][1]], bb = [pts[j][0], y1, pts[j][1]], c = [pts[k][0], y1, pts[k][1]];
      // Keep roof normals pointing up whatever the triangulation winding.
      const cross = (bb[0] - a[0]) * (c[2] - a[2]) - (bb[2] - a[2]) * (c[0] - a[0]);
      if (cross < 0) batch.tri(a, bb, c, roof);
      else batch.tri(a, c, bb, roof);
    }
  }
  return chunks.meshes(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
    { castShadow: true, receiveShadow: true, userData: { conf: 'med' } },
  );
}

// Split long segments so ribbons follow the hill.
function densify(pts, step = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

function roads(data) {
  const chunks = new Chunks();
  for (const rd of data.roads) {
    const [kind, width] = rd;
    const pts = densify(toPoints(rd, 2));
    if (pts.length < 2) continue;
    const color = new THREE.Color(ROAD_COLORS[kind]);
    const hw = width / 2;
    const edges = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      tx /= l; tz /= l;
      const y = heightAt(p[0], p[1]) + ROAD_LIFT[kind];
      return [[p[0] - tz * hw, y, p[1] + tx * hw], [p[0] + tz * hw, y, p[1] - tx * hw]];
    });
    const batch = chunks.at(pts[0][0], pts[0][1]);
    for (let i = 1; i < edges.length; i++) {
      const [l0, r0] = edges[i - 1], [l1, r1] = edges[i];
      batch.tri(l0, l1, r1, color);
      batch.tri(l0, r1, r0, color);
    }
  }
  // Ribbons are single-sided quads; draw both sides so winding never matters.
  return chunks.meshes(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
    { receiveShadow: true, userData: { conf: 'high' } },
  );
}

function areas(data) {
  const batch = new Batch();
  for (const a of data.areas) {
    const pts = toPoints(a, 1);
    const color = new THREE.Color(AREA_COLORS[a[0]]);
    let cx = 0, cz = 0;
    for (const [x, z] of pts) { cx += x; cz += z; }
    const y = heightAt(cx / pts.length, cz / pts.length) + 0.03;
    const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [i, j, k] of tris) batch.tri([pts[i][0], y, pts[i][1]], [pts[j][0], y, pts[j][1]], [pts[k][0], y, pts[k][1]], color);
  }
  const m = batch.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  m.userData.conf = 'high';
  return m;
}

function ground() {
  const geo = new THREE.PlaneGeometry(40000, 40000, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const r = rng(77);
  const base = new THREE.Color(0x8f8a5e);
  const colors = [];
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const c = base.clone().offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.08, (r() - 0.5) * 0.05);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.position.y = CITY_Y - 0.02;
  m.receiveShadow = true;
  m.userData.conf = 'ground';
  return m;
}

export async function buildCity(url = './data/core.json') {
  const data = await (await fetch(url)).json();
  const g = new THREE.Group();
  g.name = 'city';
  g.add(ground(), areas(data), ...roads(data), ...buildings(data));
  return { group: g, stats: { buildings: data.buildings.length, roads: data.roads.length } };
}
