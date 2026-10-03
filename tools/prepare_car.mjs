// Prepare the drivable car for the web (src/drive/car.js).
//
// Source: "Toyota Corolla 2020" by ItsDiyor on Sketchfab, CC BY 4.0
// (https://sketchfab.com/3d-models/toyota-corolla-2020-6d7d34ee42734d1ab28a6b1f1c5fc4fc).
// Download it (glb) into data/raw/cars/ (git-ignored), then:
//
//   npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions sharp
//   node tools/prepare_car.mjs data/raw/cars/toyota-corolla-2020/source/MDL13625_reversed.glb data/models/corolla.glb
//
// The model's wheels are merged into its body meshes. This splits each wheel
// out (every connected part lying wholly inside that wheel's cylinder), puts
// a pivot node at each hub (wheel_FL, wheel_FR, wheel_RL, wheel_RR), bakes the
// 0.1 scale, and resizes the textures to 1024 px WebP.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, quantize } from '@gltf-transform/functions';
import sharp from 'sharp';

const [src, dst] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const root = doc.getRoot();
const S = 0.1;
const HUBS = { FL: [0.766, 1.383], FR: [-0.766, 1.383], RL: [0.766, -1.317], RR: [-0.766, -1.317] };

// bake the scale into positions
const seen = new Set();
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const a = p.getAttribute('POSITION');
  if (seen.has(a)) continue;
  seen.add(a);
  const arr = a.getArray().slice();
  for (let i = 0; i < arr.length; i++) arr[i] *= S;
  a.setArray(arr);
}
for (const n of root.listNodes()) if (n.getName() === 'Index_Out') n.setScale([1, 1, 1]);

// pass 1: tyre radius from the components near each hub
function components(p) {
  const pos = p.getAttribute('POSITION').getArray();
  const idx = p.getIndices().getArray();
  const n = pos.length / 3;
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const key = new Map(); // weld equal positions so UV seams do not split parts
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos[3 * i] * 2000)},${Math.round(pos[3 * i + 1] * 2000)},${Math.round(pos[3 * i + 2] * 2000)}`;
    if (key.has(k)) union(i, key.get(k)); else key.set(k, i);
  }
  for (let t = 0; t < idx.length; t += 3) { union(idx[t], idx[t + 1]); union(idx[t], idx[t + 2]); }
  const comp = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let c = comp.get(r);
    if (!c) comp.set(r, (c = { verts: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
    c.verts.push(i);
    for (let j = 0; j < 3; j++) { c.min[j] = Math.min(c.min[j], pos[3 * i + j]); c.max[j] = Math.max(c.max[j], pos[3 * i + j]); }
  }
  return { comp, find, pos, idx };
}

let R = 0;
const parts = [];
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const c = components(p);
  parts.push([mesh, p, c]);
  for (const k of c.comp.values()) {
    const cz = (k.min[2] + k.max[2]) / 2, cx = (k.min[0] + k.max[0]) / 2;
    const h = HUBS.FL;
    if (Math.abs(cz - h[1]) < 0.1 && Math.abs(cx - h[0]) < 0.15 && k.min[1] < 0.03) R = Math.max(R, (k.max[1] - k.min[1]) / 2);
  }
}
const HUB_Y = R + 0.004;
console.log('tyre radius', R.toFixed(3), 'hub y', HUB_Y.toFixed(3));

// pass 2: a part belongs to a wheel if it lies wholly inside that wheel's cylinder
const wheelOf = (k, pos) => {
  for (const [name, [hx, hz]] of Object.entries(HUBS)) {
    if (Math.abs((k.min[0] + k.max[0]) / 2 - hx) > 0.17) continue;
    let ok = true;
    for (const v of k.verts) {
      const dy = pos[3 * v + 1] - HUB_Y, dz = pos[3 * v + 2] - hz;
      if (Math.hypot(dy, dz) > R + 0.012 || Math.abs(pos[3 * v] - hx) > 0.17) { ok = false; break; }
    }
    if (ok) return name;
  }
  return null;
};

const sceneRoot = root.listScenes()[0];
const carNode = doc.createNode('corolla');
sceneRoot.addChild(carNode);
const bodyNode = doc.createNode('body');
carNode.addChild(bodyNode);
const wheelMeshes = Object.fromEntries(Object.keys(HUBS).map((k) => [k, doc.createMesh(`wheel_${k}`)]));
const bodyMesh = doc.createMesh('body');
const counts = {};
for (const [mesh, p, { comp, find, pos, idx }] of parts) {
  const label = new Map();
  for (const [r, k] of comp) label.set(r, wheelOf(k, pos));
  const buckets = {};
  for (let t = 0; t < idx.length; t += 3) {
    const l = label.get(find(idx[t])) ?? 'body';
    (buckets[l] ??= []).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  for (const [l, list] of Object.entries(buckets)) {
    counts[l] = (counts[l] ?? 0) + list.length / 3;
    const np = p.clone();
    np.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(p.getIndices().getBuffer()));
    (l === 'body' ? bodyMesh : wheelMeshes[l]).addPrimitive(np);
  }
}
bodyNode.setMesh(bodyMesh);
for (const [name, [hx, hz]] of Object.entries(HUBS)) {
  // pivot at the hub; the mesh sits back at the car's origin under it
  const pivot = doc.createNode(`wheel_${name}`).setTranslation([hx, HUB_Y, hz]);
  const holder = doc.createNode(`wheel_${name}_mesh`).setTranslation([-hx, -HUB_Y, -hz]).setMesh(wheelMeshes[name]);
  pivot.addChild(holder);
  carNode.addChild(pivot);
}
// drop the old hierarchy
for (const n of root.listNodes()) if (!['corolla', 'body'].includes(n.getName()) && !n.getName().startsWith('wheel_')) n.dispose();
console.log('triangles', counts);

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  quantize(),
);
await io.write(dst, doc);
