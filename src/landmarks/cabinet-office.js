// Cabinet Office (old Central Offices / Legco), Independence Avenue, OSM
// relation 9356697, with the Cenotaph square in front of it.
//
// Three linked buildings facing the square (NE): in the middle the colonial
// block — three yellow rusticated storeys under a red hipped roof, columned
// porticoes at the centre and both ends, arched ground-floor windows; either
// side a 1970s slab running towards the square — an arched arcade at ground
// level, four floors of window slits under projecting box hoods, the
// copper-red eagle on the end facing the avenue; arched colonnades link them.
// In front, inside the Independence Avenue loop, the paved square with the
// Cenotaph (dark stone tower, two swords, stepped base), a chain fence and a
// row of flags. Sources: docs/landmarks/cabinet-office.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { canvasTex, siteFrame } from './lib.js';

// Frame: local +z faces the square (bearing 39°), +x runs north-west along
// the colonial front. Parts below are the OSM outline in this frame.
export const CABINET = { x: -90, z: 3405, bearing: 39 };
const SLABS = [
  { x0: 59.8, x1: 74.5, z0: -36, z1: 40 }, // north-west slab
  { x0: -70.7, x1: -56.2, z0: -38.4, z1: 38.3 }, // south-east slab
];
const COLONIAL = { x0: -38, x1: 33, z0: -13, z1: 0 };
const LINKS = [
  { x0: -56.2, x1: -38, z0: -12.8, z1: -7.8 },
  { x0: 33, x1: 59.8, z0: -11.3, z1: -7 },
];
const REAR = [ // wings behind the colonial block
  { x0: -38.3, x1: -31.1, z0: -20.7, z1: -13 }, { x0: -31.3, x1: -25.5, z0: -32.1, z1: -13 },
  { x0: -20.5, x1: -13.6, z0: -37.4, z1: -13 }, { x0: -6.1, x1: 0.8, z0: -47.2, z1: -13 },
  { x0: 14.9, x1: 47.5, z0: -33.6, z1: -13 },
];
const SQUARE = { x: -5.5, z: 92, len: 124, r: 19 }; // inside the road loop
const CENOTAPH = { x: -7.8, z: 92 };
const OSM_OUTER = [[-122.9, 3326.9], [-111.5, 3336.5], [-140.7, 3373.1], [-120.1, 3390.5], [-114.7, 3383.8], [-106.6, 3390.6], [-107.8, 3392.2], [-68.6, 3425.3], [-67.0, 3423.3], [-60.4, 3428.9], [-65.0, 3434.7], [-51.1, 3446.5], [-22.3, 3410.4], [-11.3, 3419.7], [-59.1, 3479.6], [-70.0, 3470.4], [-54.2, 3450.5], [-68.1, 3438.7], [-73.3, 3445.2], [-78.8, 3440.6], [-85.9, 3449.6], [-90.2, 3446.0], [-79.5, 3432.6], [-83.4, 3429.3], [-97.6, 3447.0], [-102.8, 3442.6], [-92.2, 3429.4], [-98.1, 3424.4], [-115.0, 3445.5], [-120.1, 3441.2], [-99.1, 3414.9], [-109.9, 3405.7], [-122.7, 3421.7], [-147.5, 3400.7], [-139.9, 3391.2], [-128.8, 3400.5], [-123.2, 3393.4], [-144.4, 3375.5], [-160.0, 3395.0], [-170.3, 3386.3]];

const YELLOW = '#e2bd57';
const SLAB_GROUND = 5.5, SLAB_FLOOR = 3.5, SLAB_FLOORS = 4;
const SLAB_TOP = SLAB_GROUND + SLAB_FLOOR * SLAB_FLOORS; // 19.5
const COL_FLOOR = 4.2, COL_TOP = 3 * COL_FLOOR; // 12.6

// ---------- textures: one tile = one bay (width) x the given height ----------
function archTex(pitch, h) {
  return canvasTex(128, Math.round((128 * h) / pitch), (g, w, H) => {
    g.fillStyle = YELLOW;
    g.fillRect(0, 0, w, H);
    const pier = w * 0.12, r = (w - 2 * pier) / 2, spring = H * 0.45;
    g.fillStyle = '#3a3f44';
    g.beginPath();
    g.moveTo(pier, H);
    g.lineTo(pier, spring);
    g.arc(w / 2, spring, r, Math.PI, 0);
    g.lineTo(w - pier, H);
    g.fill();
    g.strokeStyle = 'rgba(210,215,220,0.55)'; // glazing grid behind the arch
    g.lineWidth = 2;
    for (let x = pier + r / 2; x < w - pier; x += r / 2) {
      g.beginPath(); g.moveTo(x, H); g.lineTo(x, spring - r * 0.8); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, w, 4);
  });
}

function slabUpperTex() {
  return canvasTex(96, 140, (g, w, h) => {
    g.fillStyle = YELLOW;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b3036';
    for (const x of [w * 0.28, w * 0.58]) g.fillRect(x, h * 0.3, w * 0.14, h * 0.55);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (const x of [w * 0.28, w * 0.58]) g.fillRect(x, h * 0.3, w * 0.14, 3);
    g.fillStyle = '#6b5a33'; // dark floor line
    g.fillRect(0, h - 4, w, 4);
  });
}

function slabGlow() {
  return canvasTex(96, 140, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd9a0';
    for (const x of [w * 0.28, w * 0.58]) g.fillRect(x, h * 0.3, w * 0.14, h * 0.55);
  });
}

// Colonial facade, full height: arched windows below, sash windows above,
// rusticated joints, string course and cornice.
function colonialTex(glow = false) {
  return canvasTex(116, 406, (g, w, h) => {
    const m = h / COL_TOP; // px per metre
    g.fillStyle = glow ? '#000' : YELLOW;
    g.fillRect(0, 0, w, h);
    if (!glow) {
      g.strokeStyle = 'rgba(120,90,30,0.35)';
      g.lineWidth = 1;
      for (let y = 0; y < h; y += m * 0.6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#efd489';
      g.fillRect(0, h - COL_FLOOR * m - 5, w, 6); // string course
      g.fillRect(0, 0, w, 10); // cornice
    }
    const win = glow ? '#ffd9a0' : '#2f343a';
    const cx = w / 2, ww = m * 1.2;
    // ground floor: arched window
    const gb = h - m * 0.9, gt = h - m * 3.2;
    g.fillStyle = win;
    g.beginPath();
    g.moveTo(cx - ww / 2, gb);
    g.lineTo(cx - ww / 2, gt + ww / 2);
    g.arc(cx, gt + ww / 2, ww / 2, Math.PI, 0);
    g.lineTo(cx + ww / 2, gb);
    g.fill();
    // upper floors: sash windows with white frames
    for (const f of [1, 2]) {
      const bottom = h - f * COL_FLOOR * m - m * 1.0, top = bottom - m * 2.0;
      if (!glow) { g.fillStyle = '#f4efe2'; g.fillRect(cx - ww / 2 - 3, top - 3, ww + 6, bottom - top + 6); }
      g.fillStyle = win;
      g.fillRect(cx - ww / 2, top, ww, bottom - top);
      if (!glow) {
        g.fillStyle = '#f4efe2';
        g.fillRect(cx - 1, top, 2, bottom - top);
        g.fillRect(cx - ww / 2, (top + bottom) / 2, ww, 2);
      }
    }
  });
}

function stoneTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#4b4641';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) {
      for (let x = (y / 14) % 2 ? -12 : 0; x < w; x += 24) {
        const v = Math.floor(Math.random() * 30) - 15;
        g.fillStyle = `rgb(${80 + v},${74 + v},${68 + v})`;
        g.fillRect(x + 1, y + 1, 22, 12);
      }
    }
  });
}

function eagleTex() {
  return canvasTex(256, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#b4502f';
    const cx = w / 2;
    for (const s of [-1, 1]) { // spread wings with feather tips
      g.beginPath();
      g.moveTo(cx, h * 0.45);
      g.quadraticCurveTo(cx + s * w * 0.25, h * 0.05, cx + s * w * 0.48, h * 0.12);
      for (let i = 0; i < 5; i++) g.lineTo(cx + s * w * (0.46 - i * 0.07), h * (0.3 + i * 0.06));
      g.closePath();
      g.fill();
    }
    g.beginPath(); // body and tail
    g.ellipse(cx, h * 0.55, w * 0.06, h * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(cx - w * 0.07, h * 0.72); g.lineTo(cx + w * 0.07, h * 0.72); g.lineTo(cx, h * 0.98);
    g.fill();
    g.beginPath(); // head
    g.arc(cx, h * 0.3, w * 0.04, 0, Math.PI * 2);
    g.fill();
  }, { repeat: false });
}

function flagTex(seed) {
  const palettes = [['#009e49', '#fcd116', '#ce1126'], ['#1f3a93', '#ffffff', '#d21034'], ['#000000', '#dd0000', '#ffce00'],
    ['#198a00', '#ffffff', '#1f5fa7'], ['#e30a17', '#ffffff', '#e30a17'], ['#0072c6', '#fcdd09', '#0072c6'], ['#ef7d00', '#198a00', '#000000']];
  const p = palettes[seed % palettes.length];
  return canvasTex(96, 64, (g, w, h) => {
    const vertical = seed % 2;
    p.forEach((c, i) => {
      g.fillStyle = c;
      if (vertical) g.fillRect((i * w) / 3, 0, w / 3 + 1, h);
      else g.fillRect(0, (i * h) / 3, w, h / 3 + 1);
    });
  }, { repeat: false });
}

// ---------- helpers ----------
// Four outward-facing wall planes around a box, each textured per metre.
function walls(r, y0, h, makeMat) {
  const g = new THREE.Group();
  const lx = r.x1 - r.x0, lz = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  for (const [len, px, pz, ry] of [
    [lx, cx, r.z1 + 0.03, 0], [lx, cx, r.z0 - 0.03, Math.PI],
    [lz, r.x1 + 0.03, cz, Math.PI / 2], [lz, r.x0 - 0.03, cz, -Math.PI / 2],
  ]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), makeMat(len));
    m.position.set(px, y0 + h / 2, pz);
    m.rotation.y = ry;
    g.add(m);
  }
  return g;
}

function block(r, y0, h, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, h, r.z1 - r.z0), mat);
  m.position.set((r.x0 + r.x1) / 2, y0 + h / 2, (r.z0 + r.z1) / 2);
  return m;
}

// Hipped roof over a rectangle, ridge along the longer side.
function hipRoof(r, y, rise, mat) {
  const long = r.x1 - r.x0 >= r.z1 - r.z0;
  const [a0, a1, b0, b1] = long ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  const half = (b1 - b0) / 2, bm = (b0 + b1) / 2;
  const P = (a, b, yy) => (long ? [a, yy, b] : [b, yy, a]);
  const c = [P(a0, b0, y), P(a1, b0, y), P(a1, b1, y), P(a0, b1, y)];
  const r0 = P(a0 + half, bm, y + rise), r1 = P(a1 - half, bm, y + rise);
  const tris = [c[0], c[1], r1, c[0], r1, r0, c[2], c[3], r0, c[2], r0, r1, c[1], c[2], r1, c[3], c[0], r0];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function racetrack(cx, cz, len, r) {
  const half = len / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(cx - half, -(cz - r));
  s.lineTo(cx + half, -(cz - r));
  s.absarc(cx + half, -cz, r, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(cx - half, -(cz + r));
  s.absarc(cx - half, -cz, r, -Math.PI / 2, Math.PI / 2, true);
  return s;
}

// ---------- parts ----------
function slab(r, mats, hoodMat) {
  const g = new THREE.Group();
  g.add(tag(block({ x0: r.x0 + 1.2, x1: r.x1 - 1.2, z0: r.z0 + 1.2, z1: r.z1 - 1.2 }, 0, SLAB_GROUND, mats.dark), 'med'));
  g.add(tag(walls(r, 0, SLAB_GROUND, (len) => mats.arcade(len)), 'high'));
  g.add(tag(block(r, SLAB_GROUND, SLAB_FLOORS * SLAB_FLOOR + 1.2, mats.plain), 'med'));
  g.add(tag(walls(r, SLAB_GROUND, SLAB_FLOORS * SLAB_FLOOR, (len) => mats.upper(len)), 'high'));
  g.add(tag(walls(r, SLAB_TOP, 1.2, () => mats.plain), 'med'));
  // Box hoods over the windows: one per 2.4 m bay per floor, all four faces.
  const faces = [];
  const lx = r.x1 - r.x0, lz = r.z1 - r.z0;
  for (const [len, fixed, axis, sign] of [[lx, r.z1, 'x', 1], [lx, r.z0, 'x', -1], [lz, r.x1, 'z', 1], [lz, r.x0, 'z', -1]]) {
    const n = Math.floor(len / 2.4);
    for (let f = 0; f < SLAB_FLOORS; f++) {
      for (let i = 0; i < n; i++) {
        const along = (axis === 'x' ? r.x0 : r.z0) + (i + 0.5) * (len / n);
        const y = SLAB_GROUND + f * SLAB_FLOOR + 2.9;
        faces.push(axis === 'x' ? [along, y, fixed + sign * 0.4, 0] : [fixed + sign * 0.4, y, along, Math.PI / 2]);
      }
    }
  }
  const hoods = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.9, 0.8), hoodMat, faces.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  faces.forEach(([x, y, z, ry], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    hoods.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, s));
  });
  g.add(tag(hoods, 'high'));
  // Roof plant box.
  const plant = block({ x0: r.x0 + 3, x1: r.x1 - 3, z0: r.z0 + 8, z1: r.z0 + 18 }, SLAB_TOP + 1.2, 3, mats.plain);
  g.add(tag(plant, 'low'));
  // Eagle on the end facing the square.
  const eagle = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.8), mats.eagle);
  eagle.position.set((r.x0 + r.x1) / 2, SLAB_TOP - 1.6, r.z1 + 0.5);
  g.add(tag(eagle, 'high'));
  return g;
}

function colonial(mats) {
  const g = new THREE.Group();
  const C = COLONIAL;
  g.add(tag(block(C, 0, COL_TOP, mats.plain), 'med'));
  g.add(tag(walls(C, 0, COL_TOP, (len) => mats.colonial(len)), 'high'));
  g.add(tag(hipRoof({ x0: C.x0 - 0.8, x1: C.x1 + 0.8, z0: C.z0 - 0.8, z1: C.z1 + 0.8 }, COL_TOP, 5, mats.roof), 'high'));
  const cornice = block({ x0: C.x0 - 0.6, x1: C.x1 + 0.6, z0: C.z0 - 0.6, z1: C.z1 + 0.6 }, COL_TOP - 0.5, 0.6, mats.cream);
  g.add(tag(cornice, 'med'));
  const col = new THREE.CylinderGeometry(0.42, 0.48, 8.2, 12);
  // End porticoes: projecting, columns through two storeys, balustraded balcony.
  for (const [xa, xb] of [[C.x0, C.x0 + 10], [C.x1 - 11, C.x1]]) {
    g.add(tag(block({ x0: xa, x1: xb, z0: C.z1, z1: C.z1 + 2.5 }, 8.4, 0.7, mats.cream), 'med'));
    g.add(tag(block({ x0: xa, x1: xb, z0: C.z1 + 2.2, z1: C.z1 + 2.5 }, 9.1, 1.0, mats.cream), 'med'));
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(col, mats.cream);
      c.position.set(xa + 1 + (i * (xb - xa - 2)) / 3, 4.1, C.z1 + 1.8);
      g.add(tag(c, 'high'));
    }
  }
  // Centre: four engaged columns and three doors under dark awnings.
  const mid = (C.x0 + C.x1) / 2;
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(col, mats.cream);
    c.position.set(mid - 6 + i * 4, 4.1, C.z1 + 0.5);
    g.add(tag(c, 'high'));
  }
  for (let i = 0; i < 3; i++) {
    const x = mid - 4 + i * 4;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), mats.door);
    door.position.set(x, 1.4, C.z1 + 0.06);
    const awning = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.9, 12, 1, false, 0, Math.PI), mats.awning);
    awning.rotation.z = Math.PI / 2;
    awning.position.set(x, 3.3, C.z1 + 0.1);
    g.add(tag(door, 'high'), tag(awning, 'high'));
  }
  return g;
}

function cenotaph(mats) {
  const g = new THREE.Group();
  g.position.set(CENOTAPH.x, 0, CENOTAPH.z);
  const base = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9 });
  [[11, 9.5], [8.5, 7.2], [6, 5]].forEach(([w, d], i) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), base);
    s.position.y = 0.175 + i * 0.35;
    g.add(s);
  });
  const H = 11;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, H, 4, 1), mats.stone);
  tower.geometry.rotateY(Math.PI / 4);
  tower.scale.set(1.25, 1, 0.85);
  tower.position.y = 1.05 + H / 2;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 2.8), new THREE.MeshStandardMaterial({ color: 0x8a847b, roughness: 0.9 }));
  cap.position.y = 1.05 + H + 0.2;
  g.add(tower, cap);
  const sword = new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.6, metalness: 0.3 });
  for (const side of [1, -1]) {
    for (const x of [-0.7, 0.7]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 7, 0.06), sword);
      blade.position.set(x, 1.05 + 5.5, side * 1.36);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.06), sword);
      guard.position.set(x, 1.05 + 8.1, side * 1.36);
      g.add(blade, guard);
    }
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.06), sword);
    plaque.position.set(0, 1.9, side * 1.45);
    g.add(plaque);
  }
  return tag(g, 'high');
}

function square(flags) {
  const g = new THREE.Group();
  const paving = new THREE.Mesh(new THREE.ShapeGeometry(racetrack(SQUARE.x, SQUARE.z, SQUARE.len, SQUARE.r), 24),
    new THREE.MeshStandardMaterial({ color: 0xcfc3b0, roughness: 0.95 }));
  paving.rotation.x = -Math.PI / 2;
  paving.position.y = 0.08;
  const brick = new THREE.Mesh(new THREE.PlaneGeometry(4, SQUARE.r - 5.5), new THREE.MeshStandardMaterial({ color: 0xb05a3c, roughness: 0.95 }));
  brick.rotation.x = -Math.PI / 2;
  brick.position.set(CENOTAPH.x, 0.1, CENOTAPH.z + 5.5 + (SQUARE.r - 5.5) / 2);
  g.add(paving, brick);
  // Chain fence: white posts around the edge.
  const pts = racetrack(SQUARE.x, SQUARE.z, SQUARE.len - 2, SQUARE.r - 1).getSpacedPoints(150);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 1, 0.15), new THREE.MeshStandardMaterial({ color: 0xf2f2f0 }), pts.length);
  const m = new THREE.Matrix4();
  pts.forEach((p, i) => posts.setMatrixAt(i, m.makeTranslation(p.x, 0.5, -p.y)));
  g.add(posts);
  // Row of flags along the far edge, facing the avenue.
  const pole = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.4, roughness: 0.4 });
  for (let i = 0; i < 14; i++) {
    const x = SQUARE.x - 46 + i * 7;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9, 6), pole);
    p.position.set(x, 4.5, SQUARE.z + SQUARE.r - 3);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), flags[i % flags.length]);
    cloth.position.set(x + 0.95, 8.2, SQUARE.z + SQUARE.r - 3);
    g.add(p, cloth);
  }
  return tag(g, 'med');
}

export function buildCabinetOffice() {
  const f = siteFrame(CABINET.x, CABINET.z, CABINET.bearing);
  f.name = 'cabinet-office';
  const glowMats = [];
  const perLen = (base, pitch, h, extra = {}) => (len) => {
    const map = base.clone();
    map.needsUpdate = true;
    map.repeat.set(len / pitch, 1);
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...extra });
    if (extra.emissiveMap) {
      mat.emissiveMap = extra.emissiveMap.clone();
      mat.emissiveMap.needsUpdate = true;
      mat.emissiveMap.repeat.set(len / pitch, extra.rows ?? 1);
      delete mat.rows;
      glowMats.push(mat);
    }
    return mat;
  };
  const upperBase = slabUpperTex();
  upperBase.repeat.y = SLAB_FLOORS;
  const mats = {
    plain: new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.85 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf0dc9a, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.3, metalness: 0.3 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xa4452f, roughness: 0.8, side: THREE.DoubleSide }),
    door: new THREE.MeshStandardMaterial({ color: 0x7a4a2c, roughness: 0.7 }),
    awning: new THREE.MeshStandardMaterial({ color: 0x2f3a33, roughness: 0.8, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 }),
    eagle: new THREE.MeshStandardMaterial({ map: eagleTex(), transparent: true, alphaTest: 0.3, metalness: 0.5, roughness: 0.5 }),
    arcade: perLen(archTex(4.2, SLAB_GROUND), 4.2, SLAB_GROUND),
    upper: (len) => {
      const map = upperBase.clone();
      map.needsUpdate = true;
      map.repeat.set(len / 2.4, SLAB_FLOORS);
      const em = slabGlow();
      em.repeat.set(len / 2.4, SLAB_FLOORS);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 });
      glowMats.push(mat);
      return mat;
    },
    colonial: (len) => {
      const map = colonialTex();
      map.repeat.set(len / 3.6, 1);
      const em = colonialTex(true);
      em.repeat.set(len / 3.6, 1);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 });
      glowMats.push(mat);
      return mat;
    },
    link: perLen(archTex(4.5, 7.5), 4.5, 7.5),
  };
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0xe8c464, roughness: 0.85 });

  for (const r of SLABS) f.add(slab(r, mats, hoodMat));
  f.add(colonial(mats));
  for (const l of LINKS) {
    f.add(tag(block(l, 0, 7.5, mats.plain), 'med'));
    f.add(tag(walls(l, 0, 7.5, mats.link), 'high'));
  }
  for (const r of REAR) {
    f.add(tag(block(r, 0, 8.5, mats.plain), 'low'));
    f.add(tag(hipRoof({ x0: r.x0 - 0.4, x1: r.x1 + 0.4, z0: r.z0 - 0.4, z1: r.z1 + 0.4 }, 8.5, 2.5, mats.roof), 'low'));
  }
  f.add(square([0, 1, 2, 3, 4, 5, 6].map((i) => new THREE.MeshStandardMaterial({ map: flagTex(i), side: THREE.DoubleSide }))));
  f.add(cenotaph(mats));

  f.updateMatrixWorld(true);
  const cenoBase = [[-5.5, -4.75], [5.5, -4.75], [5.5, 4.75], [-5.5, 4.75]].flatMap(([x, z]) => {
    const p = f.localToWorld(new THREE.Vector3(CENOTAPH.x + x, 0, CENOTAPH.z + z));
    return [p.x, p.z];
  });
  return {
    group: f,
    footprints: [OSM_OUTER.flat(), cenoBase],
    setNight(n) {
      for (const m of glowMats) m.emissiveIntensity = n * 1.1;
    },
  };
}
