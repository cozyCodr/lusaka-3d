// The National Assembly: a hollow podium ring (72 x 51.5 m, from the OSM
// outline) around a tall copper-finned chamber block (37 x 28 m) flanked by
// two light wells. Local frame: +z is the front (faces bearing 28°, toward the
// walkway), +x is the NW end. Dimensions: REFERENCE.md.
import * as THREE from 'three';
import { tag } from './util.js';
import { copperTexture, letteringTexture, windowGlowTexture } from './textures.js';

export const DIM = {
  ringW: 72,
  ringD: 51.5,
  wing: 11.7, // front and back wings
  endWing: 8.7, // NW and SE wings
  groundH: 4.5,
  fasciaH: 1.2,
  upperH: 4.3,
  chamberW: 37,
  chamberD: 28,
  chamberH: 24,
};
DIM.podiumH = DIM.groundH + DIM.fasciaH + DIM.upperH + 0.6;
DIM.wellW = (DIM.ringW - 2 * DIM.endWing - DIM.chamberW) / 2;

function materials() {
  const copperMap = copperTexture();
  const glow = windowGlowTexture();
  glow.repeat.set(5, 1);
  return {
    concrete: new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.85 }),
    column: new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x1c2830, roughness: 0.12, metalness: 0.4, emissive: 0xffcf8a, emissiveIntensity: 0,
    }),
    upper: new THREE.MeshStandardMaterial({
      color: 0x3a2c22, roughness: 0.7, emissive: 0xffb866, emissiveMap: glow, emissiveIntensity: 0,
    }),
    roof: new THREE.MeshStandardMaterial({ color: 0xbdb6aa, roughness: 0.95 }),
    fin: new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.6 }),
    copper: new THREE.MeshStandardMaterial({ map: copperMap, color: 0xffffff, roughness: 0.5, metalness: 0.55 }),
    copperCore: new THREE.MeshStandardMaterial({ color: 0x5a2e1e, roughness: 0.7, metalness: 0.3 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.6, metalness: 0.3 }),
    lettering: new THREE.MeshStandardMaterial({ map: letteringTexture(), roughness: 0.6 }),
  };
}

// Vertical fins along a face, as one instanced mesh.
function finRow(mat, { length, height, spacing, depth, thickness, y }) {
  const count = Math.floor(length / spacing);
  const geo = new THREE.BoxGeometry(thickness, height, depth);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const start = -((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    m.makeTranslation(start + i * spacing, y, 0);
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

// One podium wing, outward face on local +z, length along x.
function wing(M, { length, depth, conf, lettering = false }) {
  const g = new THREE.Group();
  const { groundH, fasciaH, upperH } = DIM;

  const glass = new THREE.Mesh(new THREE.BoxGeometry(length, groundH, depth - 3), M.glass);
  glass.position.y = groundH / 2;
  g.add(glass);

  const colGeo = new THREE.BoxGeometry(0.6, groundH, 0.6);
  for (let x = -length / 2 + 2.5; x <= length / 2 - 2.5; x += 5) {
    for (const z of [depth / 2 - 0.6, -depth / 2 + 0.6]) {
      const c = new THREE.Mesh(colGeo, M.column);
      c.position.set(x, groundH / 2, z);
      g.add(c);
    }
  }

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(length, fasciaH, depth), M.concrete);
  fascia.position.y = groundH + fasciaH / 2;
  g.add(fascia);

  const upperY = groundH + fasciaH + upperH / 2;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(length, upperH, depth - 1), [
    M.upper, M.upper, M.roof, M.roof, M.upper, M.upper,
  ]);
  upper.position.y = upperY;
  g.add(upper);

  for (const side of [1, -1]) {
    const fins = finRow(M.fin, {
      length, height: upperH, spacing: 1.4, depth: 0.7, thickness: 0.22, y: upperY,
    });
    fins.position.z = side * (depth / 2 - 0.3);
    g.add(fins);
  }

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.6, depth + 0.4), M.concrete);
  parapet.position.y = groundH + fasciaH + upperH + 0.3;
  g.add(parapet);

  if (lettering) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.55, fasciaH * 0.85), M.lettering);
    sign.position.set(0, groundH + fasciaH / 2, depth / 2 + 0.02);
    g.add(sign);
  }
  return tag(g, conf);
}

function chamber(M) {
  const { chamberW: w, chamberD: d, chamberH: h } = DIM;
  const g = new THREE.Group();

  const core = new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, h, d - 1.2), M.copperCore);
  core.position.y = h / 2;
  g.add(tag(core, 'med'));

  // Fins on all four faces; only the front one is photographed.
  const faces = [
    { len: w, rot: 0, off: d / 2, conf: 'high' },
    { len: w, rot: Math.PI, off: d / 2, conf: 'low' },
    { len: d, rot: Math.PI / 2, off: w / 2, conf: 'med' },
    { len: d, rot: -Math.PI / 2, off: w / 2, conf: 'med' },
  ];
  for (const f of faces) {
    const holder = new THREE.Group();
    holder.rotation.y = f.rot;
    const fins = finRow(M.copper, {
      length: f.len, height: h - 1.2, spacing: 1.1, depth: 0.9, thickness: 0.4, y: (h - 1.2) / 2,
    });
    fins.position.z = f.off - 0.45;
    holder.add(fins);
    g.add(tag(holder, f.conf));
  }

  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 1.2, d + 0.3), M.copper);
  cap.position.y = h - 0.6;
  g.add(tag(cap, 'med'));

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.3, d - 1), M.roof);
  roof.position.y = h - 0.05;
  g.add(tag(roof, 'high'));

  // Rooftop plant seen from above, simplified.
  const plant = [
    [-8, -5, 6, 2.2, 4], [4, -6, 8, 1.8, 5], [9, 5, 4, 2.6, 4], [-6, 6, 5, 1.5, 3],
  ];
  for (const [x, z, sx, sy, sz] of plant) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.plant);
    p.position.set(x, h + sy / 2, z);
    g.add(tag(p, 'low'));
  }
  return g;
}

export function buildAssembly() {
  const M = materials();
  const root = new THREE.Group();
  const { ringW, ringD, wing: wd, endWing: ed } = DIM;
  const sideLen = ringD - 2 * wd;

  const wings = [
    { length: ringW, rot: 0, x: 0, z: ringD / 2 - wd / 2, conf: 'high', lettering: true },
    { length: ringW, rot: Math.PI, x: 0, z: -(ringD / 2 - wd / 2), conf: 'low' },
    { length: sideLen, depth: ed, rot: Math.PI / 2, x: ringW / 2 - ed / 2, z: 0, conf: 'low' },
    { length: sideLen, depth: ed, rot: -Math.PI / 2, x: -(ringW / 2 - ed / 2), z: 0, conf: 'low' },
  ];
  for (const w of wings) {
    const g = wing(M, { length: w.length, depth: w.depth ?? wd, conf: w.conf, lettering: w.lettering });
    g.rotation.y = w.rot;
    g.position.set(w.x, 0, w.z);
    root.add(g);
  }

  root.add(chamber(M));

  // Courtyard floor and the planted light well on the SE side (-x).
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(ringW - 2 * ed, ringD - 2 * wd),
    new THREE.MeshStandardMaterial({ color: 0xa9a293, roughness: 0.95 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.02;
  root.add(tag(court, 'high', { cast: false }));

  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.wellW - 1.5, ringD - 2 * wd - 1.5),
    new THREE.MeshStandardMaterial({ color: 0x4f7a34, roughness: 1 }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(-(DIM.chamberW / 2 + DIM.wellW / 2), 0.04, 0);
  root.add(tag(lawn, 'high', { cast: false }));

  return {
    group: root,
    setNight(n) {
      M.glass.emissiveIntensity = n * 0.9;
      M.upper.emissiveIntensity = n * 1.6;
    },
  };
}
