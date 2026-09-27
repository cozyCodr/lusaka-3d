// Pyramid Tower ("Burj Kalingalinga", the Continental Pyramid Hotel), Thabo
// Mbeki Road. A square tower whose four glass faces are folded: each face
// rises from its corners to a raised zigzag strip of pale silver glass, so
// the facets catch the light differently (blue by day, gold at sunset). The
// roof is flat to the edge; set well back inside it, a low windowed plinth
// carries a grey pyramid.
// It stands at the north-west corner of a two-storey glass podium whose roof
// carries white terraces, a pale-blue glass roof, a round pool and a raised
// block against the tower. Not in OSM; placed from Esri imagery, shaped from
// the as-built photos (the architect's renders were not used).
// Sources: docs/landmarks/pyramid-tower.md.
import * as THREE from 'three';
import { rng, tag } from '../util.js';
import { canvasTex, siteFrame } from './lib.js';

// Tower centre; local +z faces bearing 190 (SSW), local +x runs ~ESE.
export const PYRAMID = { x: 1452, z: 785, bearing: 190 };
const W = 32; // shaft width at the corners
const FOLD = 3.2; // how far the zigzag strip stands out from the corners
const BAND = 0.11; // half-width of the silver strip, as a fraction of W
const SHAFT_TOP = 100, CROWN_H = 2.5, PEAK_H = 22;
const INSET = 0.82; // the pyramid's base, as a fraction of the shaft width: it sits inside the roof edge
const FLOORS = 27;
// Zigzag centreline across a face: [height fraction, across fraction].
const ZIGZAG = [[0, 0.7], [0.42, 0.28], [0.72, 0.62], [1, 0.46]];
// Podium in the tower frame, from imagery (world corners converted).
const PODIUM = [[-24, -18], [103, -18], [85, 66], [-25, 38]];
const PODIUM_H = 9;

// ---------- textures (UVs: u across a face 0..1, v up 0..1) ----------
function glazing(base, line, glow = false) {
  const r = rng(glow ? 17 : 5);
  return canvasTex(256, 864, (g, w, h) => {
    g.fillStyle = glow ? '#000' : base;
    g.fillRect(0, 0, w, h);
    const cols = 20, fh = h / FLOORS, cw = w / cols;
    for (let f = 0; f < FLOORS; f++) {
      for (let c = 0; c < cols; c++) {
        if (glow) {
          if (r() < 0.55) continue;
          const v = 150 + Math.floor(r() * 105);
          g.fillStyle = `rgb(${v},${Math.floor(v * 0.85)},${Math.floor(v * 0.6)})`;
          g.fillRect(c * cw + 2, f * fh + 4, cw - 4, fh - 9);
        } else {
          g.strokeStyle = line;
          g.lineWidth = 1;
          g.strokeRect(c * cw, f * fh, cw, fh);
        }
      }
    }
  }, { repeat: false });
}

// ---------- folded shaft ----------
// One face in face-local coordinates (x across, y up, z out), built as three
// strips per zigzag segment: left panel, raised silver strip, right panel.
function foldedFace(flip) {
  const glass = [], band = [], uvG = [], uvB = [];
  const H = SHAFT_TOP;
  const across = (f) => ((flip ? 1 - f : f) - 0.5) * W;
  const pt = (x, y, z) => [x, y, z];
  const uv = (x, y) => [x / W + 0.5, y / H];
  const quad = (pos, uvs, a, b, c, d) => {
    for (const p of [a, b, c, a, c, d]) {
      pos.push(...p);
      uvs.push(...uv(p[0], p[1]));
    }
  };
  for (let i = 1; i < ZIGZAG.length; i++) {
    const [v0, f0] = ZIGZAG[i - 1], [v1, f1] = ZIGZAG[i];
    const y0 = v0 * H, y1 = v1 * H, c0 = across(f0), c1 = across(f1), b = BAND * W;
    const L0 = pt(-W / 2, y0, 0), L1 = pt(-W / 2, y1, 0), R0 = pt(W / 2, y0, 0), R1 = pt(W / 2, y1, 0);
    const bl0 = pt(c0 - b, y0, FOLD), bl1 = pt(c1 - b, y1, FOLD), br0 = pt(c0 + b, y0, FOLD), br1 = pt(c1 + b, y1, FOLD);
    quad(glass, uvG, L0, bl0, bl1, L1); // left panel slopes out to the strip
    quad(band, uvB, bl0, br0, br1, bl1); // the strip
    quad(glass, uvG, br0, R0, R1, br1); // right panel slopes back to the corner
  }
  const make = (pos, uvs) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals(); // non-indexed: one flat normal per facet
    return g;
  };
  return { glass: make(glass, uvG), band: make(band, uvB) };
}

function shaft(mats) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const { glass, band } = foldedFace(k % 2 === 1);
    const face = new THREE.Group();
    face.add(new THREE.Mesh(glass, mats.glass), new THREE.Mesh(band, mats.band));
    face.rotation.y = (k * Math.PI) / 2;
    face.position.set(Math.sin(face.rotation.y) * (W / 2), 0, Math.cos(face.rotation.y) * (W / 2));
    g.add(face);
  }
  return g;
}

// ---------- podium ----------
function prism(outline, h, mats) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, mats);
}
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

function podiumWallTexture() {
  const t = canvasTex(64, 128, (g, w, h) => {
    // extrude side UVs run bottom-up in canvas space: glazing first, white fascia on top
    const grad = g.createLinearGradient(0, 0, 0, h * 0.72);
    grad.addColorStop(0, '#1d3f73');
    grad.addColorStop(1, '#3a6db4');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h * 0.72);
    g.fillStyle = 'rgba(220,230,245,0.55)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h * 0.72);
    g.fillRect(0, h * 0.36, w, 2);
    g.fillStyle = '#eceef0';
    g.fillRect(0, h * 0.72, w, h * 0.28);
  });
  t.repeat.set(1 / 8, 1 / PODIUM_H);
  return t;
}

function podium(put) {
  const white = new THREE.MeshStandardMaterial({ color: 0xeceef0, roughness: 0.75 });
  const deck = new THREE.MeshStandardMaterial({ color: 0xdcdcd8, roughness: 0.85 });
  const walls = new THREE.MeshStandardMaterial({ map: podiumWallTexture(), roughness: 0.2, metalness: 0.45, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const glassRoof = new THREE.MeshStandardMaterial({ color: 0x9fb6d6, roughness: 0.15, metalness: 0.4 });
  const pool = new THREE.MeshStandardMaterial({ color: 0x3aa7dc, roughness: 0.08, metalness: 0.2 });
  put(prism(PODIUM, PODIUM_H, [deck, walls]), 'med', 0);
  // White parapet around the roof edge.
  const shape = new THREE.Shape(PODIUM.map(([x, z]) => new THREE.Vector2(x, -z)));
  const inner = PODIUM.map(([x, z]) => [x * 0.985 + 40 * 0.015, z * 0.975 + 20 * 0.025]);
  shape.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  const parapet = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }), white);
  parapet.geometry.rotateX(-Math.PI / 2);
  put(parapet, 'med', PODIUM_H);
  // Raised roof block along the tower, the pale-blue glass roof, the round pool.
  put(prism(rect(16, 58, -15, 16), 4, [white, white]), 'med', PODIUM_H);
  put(prism(rect(22, 76, 22, 50), 0.4, [glassRoof, white]), 'med', PODIUM_H);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.8, 40), white);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.9, 40), pool);
  ring.position.set(6, 0, 44);
  water.position.set(6, 0, 44);
  put(ring, 'med', PODIUM_H + 0.4);
  put(water, 'med', PODIUM_H + 0.45);
  return walls;
}

export function buildPyramidTower() {
  const f = siteFrame(PYRAMID.x, PYRAMID.z, PYRAMID.bearing);
  f.name = 'pyramid-tower';
  const put = (mesh, conf, y) => {
    mesh.position.y = y;
    f.add(tag(mesh, conf));
    return mesh;
  };

  const podiumWalls = podium(put);

  const mats = {
    glass: new THREE.MeshStandardMaterial({
      map: glazing('#2c5aa5', 'rgba(200,215,240,0.35)'), emissive: 0xffffff,
      emissiveMap: glazing('', '', true), emissiveIntensity: 0,
      roughness: 0.1, metalness: 0.7, side: THREE.DoubleSide,
    }),
    band: new THREE.MeshStandardMaterial({
      map: glazing('#cdd4dc', 'rgba(120,130,145,0.45)'), roughness: 0.15, metalness: 0.65, side: THREE.DoubleSide,
    }),
  };
  put(shaft(mats), 'high', 0);

  // Roof: a flat slab following the folded outline of the shaft top.
  const grey = new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.6, metalness: 0.4 });
  const top = [];
  for (let k = 0; k < 4; k++) {
    const flip = k % 2 === 1, a = (k * Math.PI) / 2;
    const f1 = ZIGZAG[ZIGZAG.length - 1][1], c = ((flip ? 1 - f1 : f1) - 0.5) * W, b = BAND * W;
    // face-local (x across, z out) -> tower frame, walking each face left to right
    for (const [x, z] of [[-W / 2, 0], [c - b, FOLD], [c + b, FOLD]]) {
      const zz = W / 2 + z;
      top.push([x * Math.cos(a) + zz * Math.sin(a), -x * Math.sin(a) + zz * Math.cos(a)]);
    }
  }
  const roofShape = new THREE.Shape(top.map(([x, z]) => new THREE.Vector2(x, -z)));
  const roofSlab = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 0.8, bevelEnabled: false }), grey);
  roofSlab.geometry.rotateX(-Math.PI / 2);
  put(roofSlab, 'high', SHAFT_TOP);

  // Inset plinth with a ring of windows, then the pyramid on the same base.
  const base = W * INSET;
  const ringTex = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#c3c8ce';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f5aa3';
    for (let x = 4; x < w; x += 16) g.fillRect(x, 6, 10, h - 12);
  });
  const ring = new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
  put(new THREE.Mesh(new THREE.BoxGeometry(base, CROWN_H, base), [ring, ring, grey, grey, ring, ring]), 'high', SHAFT_TOP + 0.8 + CROWN_H / 2);
  const pyramid = new THREE.Mesh(
    new THREE.ConeGeometry((base * Math.SQRT2) / 2, PEAK_H, 4),
    new THREE.MeshStandardMaterial({ color: 0xb0b4ba, roughness: 0.4, metalness: 0.6, flatShading: true }),
  );
  pyramid.geometry.rotateY(Math.PI / 4);
  put(pyramid, 'high', SHAFT_TOP + 0.8 + CROWN_H + PEAK_H / 2);

  f.updateMatrixWorld(true);
  const toWorld = (pts) => pts.flatMap(([x, z]) => {
    const p = f.localToWorld(new THREE.Vector3(x, 0, z));
    return [p.x, p.z];
  });
  const half = W / 2 + FOLD;

  return {
    group: f,
    frame: f,
    footprints: [toWorld(PODIUM), toWorld(rect(-half, half, -half, half))],
    setNight(n) {
      mats.glass.emissiveIntensity = n * 1.1;
      ring.emissiveIntensity = n * 0.8;
      podiumWalls.emissiveIntensity = n * 0.6;
    },
  };
}
