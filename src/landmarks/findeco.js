// Findeco House (1978–79, Dušan Milenković & Branimir Ganović), Cairo Road at
// Independence Ave: 23 floors, Yugoslav modernism. From the ground up: a low
// podium on the OSM footprint; a narrow pedestal whose angled corbels carry a
// thick base slab; an 18-floor shaft of sand-coloured finned spandrels over
// dark ribbon glazing, corners notched; a setback glass floor with V-brackets
// carrying a wider glazed crown floor; a battered parapet with raised corners
// and the sign; lattice masts. Sources: docs/landmarks/findeco-house.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';
import { beam, canvasTex, faced } from './lib.js';

// OSM way 1069663212, world metres (x east, z south).
export const FOOTPRINT = [
  [-2735.3, 3563.9], [-2740.9, 3532.0], [-2735.7, 3531.1], [-2738.4, 3515.8], [-2729.0, 3514.2],
  [-2726.4, 3528.7], [-2708.9, 3525.7], [-2711.9, 3509.1], [-2691.8, 3505.6], [-2689.1, 3521.4],
  [-2683.2, 3554.9],
];
export const CENTRE = { x: -2717.3, z: 3527.5 };
const ROT_Y = THREE.MathUtils.degToRad(10); // footprint edges run at bearings 80° / 350°

// Heights are above the podium roof unless noted.
const D = {
  podiumH: 6, // above ground
  pedestal: 11, pedestalH: 5.5,
  baseSlabH: 1.4,
  shaft: 28, notch: 2, floorH: 3.3, floors: 18,
  topSlabH: 1.2,
  setback: 22, setbackH: 3.2,
  crown: 32, crownH: 3.8, crownSlabH: 0.9,
  parapetBottom: 32.6, parapetTop: 35.4, parapetH: 4, earH: 1.6,
  mastTop: 90, // quoted total height, above ground
};
D.shaftBase = D.pedestalH + D.baseSlabH;
D.shaftTop = D.shaftBase + D.floors * D.floorH;
D.setbackBase = D.shaftTop + D.topSlabH;
D.crownBase = D.setbackBase + D.setbackH;
D.parapetBase = D.crownBase + D.crownH;
D.roof = D.parapetBase + D.parapetH;

const BAY = 1.25;
const TILE_BAYS = 8, TILE_FLOORS = 6;


// Shaft facade tile: 8 bays x 6 floors. Each floor is a sand spandrel with a
// row of projecting fins (lit from the upper left) over dark ribbon glazing.
function shaftTextures() {
  const w = 512, h = 384, bw = w / TILE_BAYS, fh = h / TILE_FLOORS;
  const r = rng(58);
  const lit = [];
  for (let i = 0; i < TILE_BAYS * TILE_FLOORS; i++) lit.push(r() < 0.5 ? 0 : 150 + Math.floor(r() * 105));
  const glassTop = 0.02, glassH = 0.42; // fractions of a floor
  const map = canvasTex(w, h, (g) => {
    for (let f = 0; f < TILE_FLOORS; f++) {
      const y0 = f * fh;
      const gy = y0 + fh * glassTop, gh = fh * glassH;
      const grad = g.createLinearGradient(0, gy, 0, gy + gh);
      grad.addColorStop(0, '#3b4650');
      grad.addColorStop(1, '#1f252b');
      g.fillStyle = grad;
      g.fillRect(0, gy, w, gh);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let b = 0; b < TILE_BAYS; b++) g.fillRect(b * bw, gy, 2, gh);
      // spandrel with fins
      const sy = gy + gh, sh = y0 + fh - sy;
      g.fillStyle = '#c2ae84';
      g.fillRect(0, sy, w, sh);
      for (let b = 0; b < TILE_BAYS; b++) {
        for (const k of [0.25, 0.75]) {
          const fx = b * bw + bw * k - 6;
          g.fillStyle = '#e2d3ae';
          g.fillRect(fx, sy + 2, 10, sh - 4);
          g.fillStyle = 'rgba(40,30,15,0.45)';
          g.fillRect(fx + 10, sy + 4, 5, sh - 6);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(0, sy, w, 3);
    }
  });
  const emissive = canvasTex(w, h, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    for (let f = 0; f < TILE_FLOORS; f++) {
      for (let b = 0; b < TILE_BAYS; b++) {
        const v = lit[f * TILE_BAYS + b];
        if (!v) continue;
        g.fillStyle = `rgb(${v},${Math.floor(v * 0.84)},${Math.floor(v * 0.6)})`;
        g.fillRect(b * bw + 3, f * fh + fh * glassTop + 2, bw - 6, fh * glassH - 4);
      }
    }
  });
  return { map, emissive };
}

// Crown glazing: dark blue glass with close mullions, one floor tall.
function crownGlassTexture() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#2d3c4c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(160,190,220,0.18)';
    g.fillRect(0, 0, w, h * 0.35);
    g.fillStyle = '#5b6168';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h);
  });
}

function repeatMat(base, emissiveBase, width, height, tileW, tileH, extra = {}) {
  const map = base.clone();
  map.repeat.set(width / tileW, height / tileH);
  const opts = { map, roughness: 0.55, metalness: 0.15, ...extra };
  if (emissiveBase) {
    const em = emissiveBase.clone();
    em.repeat.copy(map.repeat);
    Object.assign(opts, { emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 });
  }
  return new THREE.MeshStandardMaterial(opts);
}



// For each of the four faces, call fn(frame) where frame maps (along, out) to
// a point on that face: along runs across the face, out is distance from centre.
function aroundFaces(fn) {
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const c = Math.cos(a), s = Math.sin(a);
    fn((along, out, y) => new THREE.Vector3(along * c + out * s, y, -along * s + out * c), a);
  }
}

// Square frustum (battered parapet): open sides only.
function frustum(bottomW, topW, h, mat) {
  const geo = new THREE.CylinderGeometry(topW / Math.SQRT2, bottomW / Math.SQRT2, h, 4, 1, true);
  geo.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geo, mat);
  m.material.side = THREE.DoubleSide;
  return m;
}

function podium(mat) {
  const shape = new THREE.Shape(FOOTPRINT.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: D.podiumH, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // extrude upward; shape y (= -z) maps back to world z
  const m = new THREE.Mesh(geo, mat);
  m.position.y = CITY_Y - 0.3;
  return tag(m, 'med');
}

export function buildFindeco() {
  const shaftTex = shaftTextures();
  const crownGlass = crownGlassTexture();
  const concrete = new THREE.MeshStandardMaterial({ color: 0xcbbb98, roughness: 0.9 });
  const concreteGrey = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.92 });
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.9 });
  const parapetMat = concreteGrey.clone();
  const sign = new THREE.MeshStandardMaterial({
    color: 0x8cc63f, roughness: 0.6, emissive: 0x8cc63f, emissiveIntensity: 0, side: THREE.DoubleSide,
  });
  const lattice = new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 0.7, roughness: 0.4, wireframe: true });

  const world = new THREE.Group();
  world.name = 'findeco';
  world.add(podium(podiumMat));

  // Tower frame: origin on the footprint centre at podium-roof level.
  const tower = new THREE.Group();
  tower.position.set(CENTRE.x, CITY_Y - 0.3 + D.podiumH, CENTRE.z);
  tower.rotation.y = ROT_Y;
  world.add(tower);
  const add = (mesh, conf) => tower.add(tag(mesh, conf));
  const put = (mesh, y, conf) => {
    mesh.position.y = y;
    add(mesh, conf);
    return mesh;
  };

  // Pedestal, and corbels angling out from it to the base slab.
  put(new THREE.Mesh(new THREE.BoxGeometry(D.pedestal, D.pedestalH, D.pedestal), concrete), D.pedestalH / 2, 'med');
  aroundFaces((p) => {
    for (const along of [-D.pedestal / 2 + 1, D.pedestal / 2 - 1]) {
      add(beam(p(along, D.pedestal / 2, 0.6), p(along * 1.6, D.shaft / 2 - 0.6, D.pedestalH), 0.7, concrete), 'med');
    }
  });
  put(new THREE.Mesh(new THREE.BoxGeometry(D.shaft + 0.8, D.baseSlabH, D.shaft + 0.8), concrete), D.pedestalH + D.baseSlabH / 2, 'high');

  // Shaft: two crossed boxes give a square with notched corners.
  const shaftH = D.floors * D.floorH;
  const yShaft = D.shaftBase + shaftH / 2;
  const tileW = BAY * TILE_BAYS, tileH = D.floorH * TILE_FLOORS;
  const matWide = repeatMat(shaftTex.map, shaftTex.emissive, D.shaft, shaftH, tileW, tileH);
  const matNarrow = repeatMat(shaftTex.map, shaftTex.emissive, D.shaft - 2 * D.notch, shaftH, tileW, tileH);
  put(faced(D.shaft, shaftH, D.shaft - 2 * D.notch, matWide, roofMat), yShaft, 'high');
  put(faced(D.shaft - 2 * D.notch, shaftH, D.shaft, matNarrow, roofMat), yShaft, 'high');

  // Top slab, setback glass floor, and V-brackets out to the crown floor.
  put(new THREE.Mesh(new THREE.BoxGeometry(D.shaft + 0.6, D.topSlabH, D.shaft + 0.6), concrete), D.shaftTop + D.topSlabH / 2, 'high');
  const setbackGlass = repeatMat(crownGlass, null, D.setback, D.setbackH, 4, D.setbackH, { roughness: 0.2, metalness: 0.5 });
  put(faced(D.setback, D.setbackH, D.setback, setbackGlass, roofMat), D.setbackBase + D.setbackH / 2, 'high');
  aroundFaces((p) => {
    for (const along of [-D.shaft / 4, D.shaft / 4]) {
      const foot = p(along, D.shaft / 2 - 1.5, D.setbackBase);
      for (const spread of [-3, 3]) {
        add(beam(foot, p(along + spread, D.crown / 2 - 0.4, D.crownBase), 0.8, concreteGrey), 'high');
      }
    }
  });

  // Crown floor: thick slab under a glazed band, wider than the shaft.
  put(new THREE.Mesh(new THREE.BoxGeometry(D.crown, D.crownSlabH, D.crown), concreteGrey), D.crownBase + D.crownSlabH / 2, 'high');
  const crownGlassMat = repeatMat(crownGlass, null, D.crown - 0.6, D.crownH - D.crownSlabH, 4, D.crownH - D.crownSlabH, { roughness: 0.2, metalness: 0.5 });
  put(faced(D.crown - 0.6, D.crownH - D.crownSlabH, D.crown - 0.6, crownGlassMat, roofMat), D.crownBase + D.crownSlabH + (D.crownH - D.crownSlabH) / 2, 'high');

  // Battered parapet, raised corners, roof deck, and the sign on each face.
  put(frustum(D.parapetBottom, D.parapetTop, D.parapetH, parapetMat), D.parapetBase + D.parapetH / 2, 'high');
  put(new THREE.Mesh(new THREE.BoxGeometry(D.parapetBottom - 0.5, 0.4, D.parapetBottom - 0.5), roofMat), D.parapetBase + 0.2, 'med');
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(3.2, D.earH, 3.2), parapetMat);
    ear.position.set(sx * (D.parapetTop / 2 - 1.4), D.roof + D.earH / 2 - 0.2, sz * (D.parapetTop / 2 - 1.4));
    add(ear, 'high');
  }
  const batter = Math.atan2((D.parapetTop - D.parapetBottom) / 2, D.parapetH);
  const signW = D.parapetBottom * 0.72, signH = D.parapetH * 0.8;
  aroundFaces((p, a) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), sign);
    s.position.copy(p(0, (D.parapetBottom + D.parapetTop) / 4 + 0.12, D.parapetBase + D.parapetH / 2));
    s.rotation.set(0, a, 0, 'YXZ');
    s.rotateX(batter); // lean the top outward with the parapet
    add(s, 'med');
  });

  // Rooftop plant and lattice masts reaching the quoted 90 m.
  put(new THREE.Mesh(new THREE.BoxGeometry(9, 3, 7), roofMat), D.roof + 1.5, 'low');
  const roofAbsolute = D.podiumH + D.roof;
  for (const [x, z, frac, base] of [[-8, -6, 1, 3], [6, -9, 0.7, 2.4], [9, 7, 0.55, 2], [-10, 8, 0.45, 2], [1, 2, 0.8, 2.6]]) {
    const h = (D.mastTop - roofAbsolute) * frac;
    const geo = new THREE.CylinderGeometry(0.25, base / 2, h, 4, Math.max(3, Math.round(h / 2)));
    const mast = new THREE.Mesh(geo, lattice);
    mast.position.set(x, D.roof + h / 2, z);
    add(mast, 'med');
  }

  const glowMats = [matWide, matNarrow];
  return {
    group: world,
    footprints: [FOOTPRINT.flat()],
    centre: new THREE.Vector3(CENTRE.x, CITY_Y + 45, CENTRE.z),
    setNight(nt) {
      for (const m of glowMats) m.emissiveIntensity = nt * 1.3;
      sign.emissiveIntensity = nt * 0.8;
    },
  };
}
