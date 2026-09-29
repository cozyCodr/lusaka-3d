// Car parks for landmark sites: rows of bays with white lines either side of
// aisles, kerbed planted islands with flat-crowned shade trees or twin lamp
// posts, and parked cars. Laid out on given axes inside given car-park
// polygons, and never on a road: OSM roads and drives for the site
// (data/landmarks/<slug>-roads.json, ODbL: [width, x0, z0, x1, z1, ...] per
// way) are kept clear by half their width plus a margin.
import * as THREE from 'three';
import { rng, tag } from '../util.js';

export const inside = (pts, x, z) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};

const sign = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return a > 0 ? 1 : -1;
};
// Edges of an outline with their outward normals.
export function edges(pts) {
  const s = sign(pts), out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    out.push({ a, b, len, ux, uz, nx: s * uz, nz: -s * ux });
  }
  return out;
}
// A mesh placed along an edge: local x along it, local +z outward.
export function onEdge(e, mesh, t, off, y) {
  mesh.position.set(e.a[0] + e.ux * e.len * t + e.nx * off, y, e.a[1] + e.uz * e.len * t + e.nz * off);
  mesh.rotation.y = Math.atan2(e.nx, e.nz);
  return mesh;
}

// Loads a site's roads; resolves to a test (x, z, r) => clear of every road.
export async function roadClearance(url) {
  const roads = await (await fetch(url)).json();
  const segs = [];
  for (const [w, ...c] of roads) for (let i = 2; i < c.length; i += 2) segs.push([c[i - 2], c[i - 1], c[i], c[i + 1], w / 2]);
  return (x, z, r) => segs.every(([ax, az, bx, bz, hw]) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    return Math.hypot(x - ax - t * dx, z - az - t * dz) > hw + r;
  });
}

// group: its y = 0 is city ground. axis: [along, across] unit vectors.
export async function buildParking({ group, lamps, parks, buildings, axis, roads, reserved = () => false, seed = 77, fill = 0.42 }) {
  let clear;
  try {
    clear = await roadClearance(roads);
  } catch {
    return;
  }
  const [AX, AY] = axis;
  const free = (x, z, r) => parks.some((p) => inside(p, x, z)) &&
    [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => !buildings.some((b) => inside(b, x + dx, z + dz))) && clear(x, z, r);

  const lines = [], islands = [], trees = [], cars = [], poles = [];
  const r = rng(seed);
  const all = parks.flat();
  const us = all.map(([x, z]) => x * AX[0] + z * AX[1]), vs = all.map(([x, z]) => x * AY[0] + z * AY[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const at = (u, v) => [u * AX[0] + v * AY[0], u * AX[1] + v * AY[1]];
  const MODULE = 16.5, BAY = 2.6;
  for (let v = v0; v < v1; v += MODULE) {
    for (const [side, mid] of [[0, 2.5], [1, 14]]) { // two rows of 5 m bays, a 6.5 m aisle between
      let k = 0;
      for (let u = u0; u < u1; u += BAY, k++) {
        const [x, z] = at(u + BAY / 2, v + mid);
        if (reserved(x, z)) continue;
        if (k % 11 === 5 && free(x, z, 2.6)) { // a planted island every 11 bays
          islands.push([x, z]);
          if (k % 33 === 5 && side === 0) poles.push([x, z]);
          else trees.push([x, z, 0.8 + r() * 0.5]);
          continue;
        }
        if (!free(x, z, 1.6)) continue;
        const [lx, lz] = at(u, v + mid);
        if (free(lx, lz, 0.4)) lines.push([lx, lz]);
        if (r() < fill) cars.push([x, z, r()]);
      }
    }
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const heading = Math.atan2(AY[0], AY[1]); // local +z along the bay
  const place = (mesh, i, x, y, z, rot = heading, sx = 1, sy = 1, sz = 1) => {
    q.setFromAxisAngle(up, rot);
    mesh.setMatrixAt(i, m4.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz)));
  };
  const add = (mesh, conf) => group.add(tag(mesh, conf));

  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e7e0, roughness: 0.8 });
  const lm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.02, 4.8), paint, lines.length);
  lines.forEach(([x, z], i) => place(lm, i, x, 0.075, z));
  add(lm, 'low');

  const kerb = new THREE.MeshStandardMaterial({ color: 0xc7c2b8, roughness: 0.9 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x5f8f38, roughness: 1 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x4f8a36, roughness: 1, flatShading: true });
  const ik = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.18, 4.8), kerb, islands.length);
  const ig = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.22, 4.5), grass, islands.length);
  const ic = new THREE.InstancedMesh(new THREE.ConeGeometry(0.45, 0.8, 5), iris, islands.length * 4);
  islands.forEach(([x, z], i) => {
    place(ik, i, x, 0.09, z);
    place(ig, i, x, 0.11, z);
    for (let k = 0; k < 4; k++) {
      const d = -1.5 + k, o = 0.5 * (k % 2 ? 1 : -1);
      place(ic, i * 4 + k, x + AY[0] * d + AX[0] * o, 0.6, z + AY[1] * d + AX[1] * o, heading + k);
    }
  });
  add(ik, 'med');
  add(ig, 'med');
  add(ic, 'low');

  const bark = new THREE.MeshStandardMaterial({ color: 0x5d4b3a, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4b7a34, roughness: 1, flatShading: true });
  const tt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.22, 3.6, 6), bark, trees.length);
  const tc = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6, 0), leaf, trees.length);
  trees.forEach(([x, z, s], i) => {
    place(tt, i, x, 1.8 * s, z, 0, s, s, s);
    place(tc, i, x, 4.1 * s, z, i, 1.1 * s, 0.5 * s, 1.1 * s);
  });
  add(tt, 'low');
  add(tc, 'low');

  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, emissive: 0xfff1d6, emissiveIntensity: 0 });
  lamps?.push(lampMat);
  const pp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.15, 10, 8), steel, poles.length);
  const ph = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.4), lampMat, poles.length * 2);
  poles.forEach(([x, z], i) => {
    place(pp, i, x, 5, z, 0);
    place(ph, i * 2, x + AX[0] * 0.6, 9.9, z + AX[1] * 0.6);
    place(ph, i * 2 + 1, x - AX[0] * 0.6, 9.9, z - AX[1] * 0.6);
  });
  add(pp, 'low');
  add(ph, 'low');

  const body = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2530, roughness: 0.2, metalness: 0.4 });
  const cb = new THREE.InstancedMesh(new THREE.BoxGeometry(1.75, 0.75, 4.3), body, cars.length);
  const cc = new THREE.InstancedMesh(new THREE.BoxGeometry(1.55, 0.6, 2.2), glass, cars.length);
  const palette = [0xf2f2f0, 0xf2f2f0, 0xf2f2f0, 0xc5c8cc, 0xc5c8cc, 0x8a8e93, 0x2b2d31, 0x8c1c1c, 0x2c4a7a, 0xb9b39f];
  const col = new THREE.Color();
  cars.forEach(([x, z, t], i) => {
    const flip = t < 0.5 ? 0 : Math.PI;
    place(cb, i, x, 0.62, z, heading + flip + (t - 0.5) * 0.08);
    place(cc, i, x - AY[0] * 0.2, 1.3, z - AY[1] * 0.2, heading + flip);
    cb.setColorAt(i, col.setHex(palette[Math.floor(t * 997) % palette.length]));
  });
  add(cb, 'low');
  add(cc, 'low');
  return { clear };
}
