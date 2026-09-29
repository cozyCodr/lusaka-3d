// State House, Independence Avenue (OSM relation 11672459), and its grounds.
//
// House: a long two-storey red-brick block (122 m east-west) with white
// string courses, white-framed sash windows, a white balustraded parapet over
// low red roofs and brick chimneys; lower end wings. South (entrance) front:
// a semicircular two-storey portico of four white columns under a curved
// entablature and balustrade, on the OSM turning circle. North (garden)
// front: a flat four-column loggia and red steps down to the great lawn.
// Grounds (from imagery): woodland between the house and the avenue, a
// ~450 m lawn to the north; brick-pier gates with urns on Independence
// Avenue, railings along it. Built from public photos of the exterior only.
// Sources: docs/landmarks/state-house.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex } from './lib.js';

// OSM outline (world x/z; its edges are axis-aligned).
const OUTLINE = [[2054.6, 4029.0], [2054.5, 4039.4], [2028.7, 4039.3], [2028.6, 4062.9], [2016.3, 4062.8], [2016.4, 4045.1], [2000.1, 4045.1], [2000.1, 4050.0], [1993.5, 4049.9], [1993.4, 4063.3], [1982.6, 4063.3], [1982.5, 4073.1], [1971.4, 4073.1], [1971.4, 4062.6], [1965.6, 4062.6], [1965.7, 4051.9], [1958.3, 4051.9], [1958.3, 4047.7], [1932.1, 4047.6], [1932.2, 4028.5]];
const CORE = { x0: 1958.3, x1: 2028.7, z0: 4028.6, z1: 4051.9 }; // taller centre
const WING_H = 8.6, CORE_H = 9.8;
const PORTICO = { x: 1977, z: 4072, r: 6.8 };
const LOGGIA = { x: 1993, z: 4028.6 };
// Independence Avenue north carriageway (OSM way 98620621).
const AVENUE = [[1772, 4215], [1885, 4261], [1906, 4270], [2254, 4415], [2306, 4439]];
const GATE = { x: 1906, z: 4270 }; // where the OSM drive meets the avenue
// Grounds boundary: the OSM walls on the west and north (checked on Esri
// imagery), then east of the house from imagery at zoom 17 (~1.15 m/px).
const GROUNDS = [[1757, 3445], [2042, 3561], [2458, 3477], [2496, 3633], [2340, 3650], [2300, 4180], [2292, 4400],
  [1790, 4205], [1736, 4076], [1731, 4063], [1809, 3971], [1802, 3794], [1691, 3525]];
// The boundary wall on the golf course side (north, along Los Angeles
// Boulevard, the Lusaka Golf Club across the road), from the north-west
// corner to the workers' compound: OSM way 288543270, checked on imagery.
// Plain red face brick, the same as the house (founder, 2026-09-29).
const NORTH_WALL = [[1757, 3445], [2042, 3561], [2458, 3477]];
const LAWN = [[1850, 3610], [2300, 3610], [2270, 3960], [2100, 4000], [1900, 3985], [1860, 3900]];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- textures ----------
function brickFacade(h) {
  // one tile: a 4 m bay, full height h; two floors of sash windows
  const PX = 32;
  const t = canvasTex(4 * PX, Math.round(h * PX), (g, w, H) => {
    const y = (m) => H - m * PX;
    g.fillStyle = '#9a4a33';
    g.fillRect(0, 0, w, H);
    g.fillStyle = 'rgba(60,25,15,0.25)';
    for (let r = 0; r < H; r += 5) g.fillRect(0, r, w, 1);
    g.fillStyle = '#f3efe6';
    g.fillRect(0, y(0.6), w, 0.6 * PX); // plinth
    g.fillRect(0, y(h / 2 + 0.2), w, 0.35 * PX); // string course
    g.fillRect(0, y(h - 0.3), w, 0.3 * PX);
    for (const [bottom, top] of [[0.9, 3.4], [h / 2 + 0.8, h - 1.1]]) {
      const x0 = w * 0.3, x1 = w * 0.7;
      g.fillStyle = '#f3efe6';
      g.fillRect(x0 - 4, y(top) - 4, x1 - x0 + 8, (top - bottom) * PX + 8);
      g.fillStyle = '#30353a';
      g.fillRect(x0, y(top), x1 - x0, (top - bottom) * PX);
      g.fillStyle = '#f3efe6';
      g.fillRect((x0 + x1) / 2 - 1.5, y(top), 3, (top - bottom) * PX);
      for (let k = 1; k < 3; k++) g.fillRect(x0, y(top) + (k * (top - bottom) * PX) / 3, x1 - x0, 2);
    }
  });
  t.repeat.set(1 / 4, 1 / h);
  return t;
}

function balustradeTex() {
  const t = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#f3efe6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a4a3c';
    for (let x = 6; x < w; x += 12) g.fillRect(x, 8, 5, h - 14);
  });
  t.repeat.set(1 / 3, 1);
  return t;
}

// ---------- helpers ----------
function extrude(outline, h, mats, y = 0) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mats);
  m.position.y = y;
  return m;
}

function rectOutline({ x0, x1, z0, z1 }) {
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
}

function hipRoof({ x0, x1, z0, z1 }, y, rise, mat) {
  const long = x1 - x0 >= z1 - z0;
  const half = (long ? z1 - z0 : x1 - x0) / 2;
  const c = [V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1)];
  const r0 = long ? V(x0 + half, y + rise, (z0 + z1) / 2) : V((x0 + x1) / 2, y + rise, z0 + half);
  const r1 = long ? V(x1 - half, y + rise, (z0 + z1) / 2) : V((x0 + x1) / 2, y + rise, z1 - half);
  const tris = long
    ? [c[0], r1, c[1], c[0], r0, r1, c[2], r0, c[3], c[2], r1, r0, c[1], r1, c[2], c[3], r0, c[0]]
    : [c[0], r0, c[1], c[1], r0, r1, c[1], r1, c[2], c[2], r1, c[3], c[3], r1, r0, c[3], r0, c[0]];
  const geo = new THREE.BufferGeometry().setFromPoints(tris);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function polygon(points, y, mat) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

function inside(pts, x, z) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

// Point `off` metres north (away from the road) of the avenue polyline at parameter t.
function avenueOffset(off) {
  return AVENUE.map(([x, z], i) => {
    const [ax, az] = AVENUE[Math.max(0, i - 1)], [bx, bz] = AVENUE[Math.min(AVENUE.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az);
    return [x + ((bz - az) / len) * off, z - ((bx - ax) / len) * off];
  });
}

// ---------- parts ----------
function house(m) {
  const g = new THREE.Group();
  const wingWall = new THREE.MeshStandardMaterial({ map: brickFacade(WING_H), roughness: 0.9 });
  const coreWall = new THREE.MeshStandardMaterial({ map: brickFacade(CORE_H), roughness: 0.9 });
  g.add(tag(extrude(OUTLINE, WING_H, [m.roof, wingWall]), 'high'));
  g.add(tag(extrude(rectOutline(CORE), CORE_H, [m.roof, coreWall]), 'med'));
  // Balustraded parapets and low red roofs behind them.
  const bal = new THREE.MeshStandardMaterial({ map: balustradeTex(), roughness: 0.8 });
  g.add(tag(extrude(OUTLINE, 0.9, [m.white, bal], WING_H), 'med'));
  g.add(tag(extrude(rectOutline(CORE), 0.9, [m.white, bal], CORE_H), 'med'));
  g.add(tag(hipRoof({ x0: CORE.x0 + 1.5, x1: CORE.x1 - 1.5, z0: CORE.z0 + 1.5, z1: CORE.z1 - 1.5 }, CORE_H + 0.1, 3, m.tiles), 'low'));
  for (const w of [{ x0: 1933.5, x1: 1957, z0: 4030, z1: 4046.5 }, { x0: 2030, x1: 2053.2, z0: 4030, z1: 4038.2 }]) {
    g.add(tag(hipRoof(w, WING_H + 0.1, 2.2, m.tiles), 'low'));
  }
  for (const [x, z] of [[1945, 4034], [2041, 4033], [1962, 4034], [2024, 4034]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.2), m.brick);
    c.position.set(x, CORE_H + 1.3, z);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.5), m.white);
    cap.position.set(x, CORE_H + 2.7, z);
    g.add(tag(c, 'low'), tag(cap, 'low'));
  }
  return g;
}

function portico(m) {
  const g = new THREE.Group();
  const { x, z, r } = PORTICO;
  const H = CORE_H;
  const col = new THREE.CylinderGeometry(0.42, 0.5, H - 1.6, 16);
  for (const deg of [22, 64, 116, 158]) {
    const a = (deg * Math.PI) / 180;
    const c = new THREE.Mesh(col, m.white);
    c.position.set(x + r * Math.cos(a), (H - 1.6) / 2 + 0.6, z + r * Math.sin(a));
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), m.white);
    base.position.set(c.position.x, 0.85, c.position.z);
    g.add(tag(c, 'high'), tag(base, 'high'));
  }
  // Curved entablature and balustrade (three.js cylinders start at +z).
  const ent = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 1.4, 32, 1, false, -Math.PI / 2, Math.PI), m.whiteDS);
  ent.position.set(x, H - 0.3, z);
  const roof = new THREE.Mesh(new THREE.CircleGeometry(r + 0.6, 32, 0, Math.PI), m.white);
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(x, H + 0.4, z);
  const balMat = new THREE.MeshStandardMaterial({ map: balustradeTex(), roughness: 0.8, side: THREE.DoubleSide });
  balMat.map.repeat.set(7, 1);
  const bal = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.4, r + 0.4, 1.0, 32, 1, true, -Math.PI / 2, Math.PI), balMat);
  bal.position.set(x, H + 0.9, z);
  g.add(tag(ent, 'high'), tag(roof, 'high'), tag(bal, 'high'));
  // Steps and the door under the portico.
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.8 - i * 0.6, r + 1.8 - i * 0.6, 0.2, 32, 1, false, -Math.PI / 2, Math.PI), m.white);
    s.position.set(x, 0.1 + i * 0.2, z);
    g.add(tag(s, 'med'));
  }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), m.door);
  door.position.set(x, 2.4, 4073.15);
  const fanlight = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), m.glass);
  fanlight.position.set(x, 5.5, 4073.15);
  g.add(tag(door, 'high'), tag(fanlight, 'med'));
  return g;
}

function loggia(m) {
  const g = new THREE.Group();
  const { x, z } = LOGGIA;
  const H = CORE_H;
  const recess = new THREE.Mesh(new THREE.PlaneGeometry(13, H - 1.2), m.recess);
  recess.rotation.y = Math.PI;
  recess.position.set(x, (H - 1.2) / 2 + 0.6, z - 0.05);
  g.add(tag(recess, 'med'));
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, H - 1.4, 16), m.white);
    c.position.set(x - 6 + i * 4, (H - 1.4) / 2 + 0.6, z - 1.6);
    g.add(tag(c, 'high'));
  }
  const ent = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 2.4), m.white);
  ent.position.set(x, H - 0.2, z - 1.2);
  g.add(tag(ent, 'high'));
  const red = new THREE.MeshStandardMaterial({ color: 0x9c3b2a, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(30 - i * 2, 0.2, 1.6), red);
    s.position.set(x, 0.5 - i * 0.2, z - 3.6 - i * 1.6);
    g.add(tag(s, 'med'));
  }
  return g;
}

function gate(m) {
  const g = new THREE.Group();
  const [ax, az] = AVENUE[1], [bx, bz] = AVENUE[3];
  const along = Math.atan2(bz - az, bx - ax);
  const [gx, gz] = avenueOffset(9)[2];
  g.position.set(gx, 0, gz);
  g.rotation.y = -along;
  const urn = new THREE.SphereGeometry(0.45, 12, 8);
  for (const off of [-9, -4.2, 4.2, 9]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.6, 1.3), m.brick);
    pier.position.set(off, 1.8, 0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), m.white);
    cap.position.set(off, 3.8, 0);
    const u = new THREE.Mesh(urn, m.white);
    u.position.set(off, 4.4, 0);
    g.add(pier, cap, u);
  }
  const rail = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.6, metalness: 0.3 });
  for (const [a, b] of [[-8.3, -4.9], [4.9, 8.3], [-3.5, 3.5]]) {
    for (let x = a; x <= b; x += 0.25) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.04), rail);
      bar.position.set(x, 1.4, 0);
      g.add(bar);
    }
  }
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 1), m.white);
  kerb.position.y = 0.15;
  g.add(kerb);
  return tag(g, 'high');
}

// Railings with brick piers along the avenue, either side of the gate.
function perimeter(m) {
  const g = new THREE.Group();
  const line = avenueOffset(9);
  const bars = [], piers = [];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < len; d += 0.5) {
      const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
      if (Math.hypot(x - line[2][0], z - line[2][1]) < 10) continue; // the gate
      bars.push([x, z]);
      if (Math.round(d * 2) % 60 === 0) piers.push([x, z]);
    }
  }
  const rail = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.6, metalness: 0.3 });
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), rail, bars.length);
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2.8, 1), m.brick, piers.length);
  const mx = new THREE.Matrix4();
  bars.forEach(([x, z], i) => bm.setMatrixAt(i, mx.makeTranslation(x, 1.1, z)));
  piers.forEach(([x, z], i) => pm.setMatrixAt(i, mx.makeTranslation(x, 1.4, z)));
  g.add(bm, pm);

  // the face-brick wall on the golf course side, with piers every 3 m
  const bricks = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#9a4a33';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(230,220,205,0.55)';
    for (let r = 0; r < 8; r++) {
      c.fillRect(0, r * 8, w, 1);
      for (let x = (r % 2) * 16; x < w; x += 32) c.fillRect(x, r * 8, 1, 8);
    }
  });
  const wallH = 2.4, wallMat = new THREE.MeshStandardMaterial({ map: bricks, roughness: 0.95 });
  const pierPts = [];
  for (let i = 1; i < NORTH_WALL.length; i++) {
    const [ax, az] = NORTH_WALL[i - 1], [bx, bz] = NORTH_WALL[i];
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.BoxGeometry(len, wallH, 0.23);
    // brick courses in metres on the long faces
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (len / 4), uv.getY(k) * (wallH / 2));
    bricks.wrapS = bricks.wrapT = THREE.RepeatWrapping;
    const w = new THREE.Mesh(geo, wallMat);
    w.position.set((ax + bx) / 2, wallH / 2, (az + bz) / 2);
    w.rotation.y = -Math.atan2(bz - az, bx - ax);
    g.add(w);
    for (let d = 0; d <= len; d += 3) pierPts.push([ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len, w.rotation.y]);
  }
  const pier = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, wallH + 0.25, 0.45), wallMat, pierPts.length);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  pierPts.forEach(([x, z, ry], i) => pier.setMatrixAt(i, mx.compose(new THREE.Vector3(x, (wallH + 0.25) / 2, z), q.setFromAxisAngle(up, ry), one)));
  g.add(pier);
  return tag(g, 'med');
}

// Lawn, woodland and palms. Trees avoid the house, the drive and the lawn.
function grounds() {
  const g = new THREE.Group();
  g.add(tag(polygon(GROUNDS, 0.02, new THREE.MeshStandardMaterial({ color: 0x5d7f3a, roughness: 1 })), 'med'));
  g.add(tag(polygon(LAWN, 0.025, new THREE.MeshStandardMaterial({ color: 0x86a653, roughness: 1 })), 'med'));
  const drive = [[1906, 4270], [1912, 4228], [1962, 4112], [1976, 4091]];
  const nearDrive = (x, z) => drive.some(([ax, az], i) => {
    if (i === 0) return false;
    const [bx, bz] = drive[i - 1];
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - (ax + t * dx), z - (az + t * dz)) < 14;
  }) || Math.hypot(x - 1976, z - 4091) < 34;
  const r = rng(404);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x35592a, roughness: 1, flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: 0x4b3a2b, roughness: 1 });
  const spots = [];
  for (let tries = 0; spots.length < 520 && tries < 20000; tries++) {
    const x = 1790 + r() * 560, z = 3600 + r() * 820;
    if (!inside(GROUNDS, x, z)) continue;
    const onLawn = inside(LAWN, x, z);
    if (onLawn && r() > 0.06) continue; // a few specimen trees on the lawn
    if (x > 1925 && x < 2062 && z > 4018 && z < 4085) continue; // the house
    if (nearDrive(x, z)) continue;
    spots.push([x, z, 4 + r() * 5]);
  }
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leaf, spots.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 1, 6), bark, spots.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, z, s], i) => {
    canopy.setMatrixAt(i, mx.compose(V(x, s * 1.3, z), q, V(s, s * 0.8, s)));
    trunk.setMatrixAt(i, mx.compose(V(x, s * 0.45, z), q, V(1, s * 0.9, 1)));
  });
  g.add(tag(canopy, 'low'), tag(trunk, 'low'));
  // Palms by the portico and the garden front, as in the photos.
  const make = palmFactory();
  for (const [x, z] of [[1962, 4080], [1992, 4080], [1978, 4100], [1982, 4020], [2006, 4018], [1960, 4024]]) {
    const p = make(9 + r() * 4, r);
    p.position.set(x, 0, z);
    g.add(tag(p, 'med'));
  }
  return g;
}

export function buildStateHouse() {
  const root = new THREE.Group();
  root.name = 'state-house';
  root.position.y = CITY_Y;
  const m = {
    white: new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.75 }),
    whiteDS: new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.75, side: THREE.DoubleSide }),
    brick: new THREE.MeshStandardMaterial({ color: 0x9a4a33, roughness: 0.9 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: 0.9 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0xa4452f, roughness: 0.8, side: THREE.DoubleSide }),
    door: new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.2, metalness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 }),
    recess: new THREE.MeshStandardMaterial({ color: 0x5a2c20, roughness: 0.9 }),
  };
  root.add(grounds(), house(m), portico(m), loggia(m), gate(m), perimeter(m));
  return {
    group: root,
    footprints: [OUTLINE.flat()],
    setNight(n) {
      m.glass.emissiveIntensity = n * 1.2;
    },
  };
}
