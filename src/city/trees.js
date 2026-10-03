// Low-poly trees for the streamed city: one merged, vertex-coloured model per
// species, drawn as one InstancedMesh per species per tile. Placement comes
// from the tile worker (worker.js, trees()): [x, y, z, scale, rotation, species].
// Species: 0 broad (msasa / acacia), 1 jacaranda (in flower: it is the
// season from September to November), 2 flamboyant, 3 mango, 4 palm,
// 5 eucalyptus.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../util.js';

const lin = new THREE.Color();
function part(geo, hex, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.scale(sx, sy, sz);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  lin.setHex(hex);
  const c = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < c.length; i += 3) c.set([lin.r, lin.g, lin.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
const trunk = (h, r0, r1, hex = 0x5d4b3a) => part(new THREE.CylinderGeometry(r1, r0, h, 5), hex, { y: h / 2 });
const blob = (r, hex, o) => part(new THREE.IcosahedronGeometry(r, 0), hex, o);

function species() {
  const r = rng(101);
  const jitter = (hexes) => hexes[Math.floor(r() * hexes.length)];
  return [
    // 0 broad: msasa / acacia, a wide flat crown on a forked trunk
    mergeGeometries([
      trunk(3.6, 0.32, 0.2),
      part(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 4), 0x5d4b3a, { x: 0.6, y: 4, rz: -0.5 }),
      blob(3.6, 0x55803a, { y: 5.4, sy: 0.42 }),
      blob(2.6, 0x4a7334, { x: 1.8, y: 5.2, z: 0.8, sy: 0.45 }),
      blob(2.4, 0x5f8a40, { x: -1.6, y: 5.5, z: -0.9, sy: 0.4 }),
    ]),
    // 1 jacaranda in flower: lilac clouds over a few green leaves
    mergeGeometries([
      trunk(3.2, 0.3, 0.18, 0x4f4136),
      blob(2.8, jitter([0xa48fcf, 0x9a86c6]), { y: 5, sy: 0.7 }),
      blob(2.2, 0xb09cd6, { x: 1.9, y: 4.6, z: 0.6, sy: 0.65 }),
      blob(2.1, 0x9580c0, { x: -1.7, y: 4.8, z: -0.7, sy: 0.65 }),
      blob(1.5, 0x6d8a52, { x: 0.4, y: 3.9, z: -1.6, sy: 0.6 }),
    ]),
    // 2 flamboyant: a wide umbrella of scarlet over green
    mergeGeometries([
      trunk(3, 0.3, 0.2, 0x6a5a4a),
      blob(4, 0x4f7a35, { y: 4.6, sy: 0.32 }),
      blob(3.4, 0xd4482c, { y: 5.1, sy: 0.3 }),
      blob(2, 0xe06a2e, { x: 2, y: 5, z: 0.6, sy: 0.35 }),
    ]),
    // 3 mango: dense, dark and rounded, low on the trunk
    mergeGeometries([
      trunk(2, 0.34, 0.24),
      blob(3.3, 0x2f5a26, { y: 4.4, sy: 0.85 }),
      blob(2.3, 0x386a2c, { x: 1.4, y: 3.6, z: 1, sy: 0.8 }),
    ]),
    // 4 palm: a slim trunk and drooping fronds
    mergeGeometries([
      trunk(8, 0.22, 0.16, 0x7a6a55),
      ...Array.from({ length: 8 }, (_, k) => part(new THREE.BoxGeometry(0.5, 0.06, 3.2), k % 2 ? 0x4c7d2c : 0x5a8a34,
        { x: Math.sin((k / 8) * Math.PI * 2) * 1.4, y: 7.7, z: Math.cos((k / 8) * Math.PI * 2) * 1.4, ry: (k / 8) * Math.PI * 2, rx: 0.45 })),
    ]),
    // 5 eucalyptus: tall pale trunk, a narrow open crown
    mergeGeometries([
      trunk(10, 0.3, 0.15, 0xc9c0b0),
      blob(2.4, 0x6b8a5a, { y: 11, sy: 1.5 }),
      blob(1.6, 0x7a966a, { x: 1, y: 9, z: 0.5, sy: 1.2 }),
    ]),
  ];
}

let shared = null;
function get() {
  if (!shared) {
    shared = {
      geos: species(),
      mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
    };
  }
  return shared;
}

// Build a tile's tree meshes. keep(x, z) filters out spots taken by landmarks.
export function treeMeshes(data, { keep = () => true, shadows = false } = {}) {
  const { geos, mat } = get();
  const per = geos.map(() => []);
  for (let i = 0; i < data.length; i += 6) if (keep(data[i], data[i + 2])) per[data[i + 5]].push(i);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  const meshes = [];
  per.forEach((idx, sp) => {
    if (!idx.length) return;
    const mesh = new THREE.InstancedMesh(geos[sp], mat, idx.length);
    idx.forEach((i, n) => {
      const k = data[i + 3];
      mesh.setMatrixAt(n, m4.compose(p.set(data[i], data[i + 1], data[i + 2]), q.setFromAxisAngle(up, data[i + 4]), s.set(k, k, k)));
      const v = 0.85 + ((i * 7919) % 100) / 400;
      mesh.setColorAt(n, tint.setRGB(v, v, v));
    });
    mesh.computeBoundingSphere();
    mesh.castShadow = shadows;
    mesh.receiveShadow = false;
    mesh.userData.conf = 'low';
    mesh.userData.sharedGeometry = true;
    meshes.push(mesh);
  });
  return meshes;
}
