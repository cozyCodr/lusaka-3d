// Shared building blocks for hand-built landmarks.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';

export function canvasTex(w, h, draw, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Box whose four sides share one material and whose top/bottom share another.
export function faced(w, h, d, side, cap) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, cap, cap, side, side]);
}

// Box beam from a to b (used for corbels, brackets, frames).
export function beam(a, b, thickness, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.BoxGeometry(thickness, dir.length(), thickness), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Rounded limb from a to b (capsule), for sculpted figures. Low segment counts
// with flatShading give a faceted, hammered-metal look.
export function limb(a, b, radius, mat, { radial = 10, caps = 4 } = {}) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, dir.length(), caps, radial), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Chain of oval links along a polyline, each link turned 90° from the last.
export function chain(points, mat, { r = 0.1, tube = 0.028 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.TorusGeometry(r, tube, 6, 14);
  geo.scale(1, 1.5, 1);
  const up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dir = new THREE.Vector3().subVectors(b, a);
    const n = Math.max(1, Math.round(dir.length() / (r * 2.4)));
    for (let j = 0; j < n; j++) {
      const link = new THREE.Mesh(geo, mat);
      link.position.copy(a).addScaledVector(dir, (j + 0.5) / n);
      link.quaternion.setFromUnitVectors(up, dir.clone().normalize());
      link.rotateY((k++ % 2) * (Math.PI / 2));
      g.add(link);
    }
  }
  return g;
}

// Extrude an OSM outline (world x/z, optional holes) straight up from city level.
// Material groups: [0] = roof and floor caps, [1] = walls.
export function extrudeFootprint(outer, holes, height, materials, base = CITY_Y) {
  const toV = ([x, z]) => new THREE.Vector2(x, -z);
  const shape = new THREE.Shape(outer.map(toV));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(toV)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // extrude upward; shape y (= -z) maps back to world z
  const m = new THREE.Mesh(geo, materials);
  m.position.y = base;
  return m;
}

// Frame for a landmark: origin at a world point on city ground, local +z
// facing the given compass bearing (degrees).
export function siteFrame(x, z, frontBearing) {
  const g = new THREE.Group();
  g.position.set(x, CITY_Y, z);
  g.rotation.y = THREE.MathUtils.degToRad(180 - frontBearing);
  return g;
}

// A w x d rectangle in a landmark frame, as a flat world footprint [x0, z0, ...].
export function rectFootprint(frame, w, d, cx = 0, cz = 0) {
  frame.updateMatrixWorld(true);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].flatMap(([x, z]) => {
    const p = frame.localToWorld(new THREE.Vector3(cx + x, 0, cz + z));
    return [p.x, p.z];
  });
}

// Instanced vertical fins along local x, centred, at the given z.
export function finRow(mat, { length, height, spacing, depth, thickness, y, z }) {
  const count = Math.floor(length / spacing) + 1;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(thickness, height, depth), mat, count);
  const m = new THREE.Matrix4();
  const start = -((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    m.makeTranslation(start + i * spacing, y, z);
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

// Lit-window emissive texture: `cols` x `rows` cells, a fraction of them lit.
export function windowGlow(cols, rows, seed, { litFraction = 0.5, glassTop = 0.1, glassH = 0.6 } = {}) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return canvasTex(cols * 32, rows * 32, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() > litFraction) continue;
        const v = 150 + Math.floor(rnd() * 105);
        g.fillStyle = `rgb(${v},${Math.floor(v * 0.84)},${Math.floor(v * 0.6)})`;
        g.fillRect(c * 32 + 3, r * 32 + 32 * glassTop, 26, 32 * glassH);
      }
    }
  });
}

// Night glow: a warm material whose emissive map lights only the dark,
// blue-tinted glazing of its texture.
export function glowing(tex, o = {}) {
  const src = tex.image, c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lit = d[i] + d[i + 1] + d[i + 2] < 360 && d[i + 2] > d[i] + 10;
    d[i] = lit ? 255 : 0;
    d[i + 1] = lit ? 214 : 0;
    d[i + 2] = lit ? 150 : 0;
  }
  g.putImageData(img, 0, 0);
  const mask = new THREE.CanvasTexture(c);
  mask.colorSpace = THREE.SRGBColorSpace;
  mask.wrapS = tex.wrapS;
  mask.wrapT = tex.wrapT;
  mask.repeat.copy(tex.repeat); // set any repeat on tex before calling
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: mask, emissiveIntensity: 0, ...o });
}
