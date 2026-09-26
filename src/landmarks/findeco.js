// Findeco House (1978–79, Dušan Milenković & Branimir Ganović), Cairo Road at
// Independence Ave: 90 m, 23 floors, Yugoslav modernism. A low podium on the
// OSM footprint, a narrow neck that steps out into a notched-corner shaft of
// banded floors, a crown that cantilevers wider still, and rooftop masts.
// Sources and confidence: docs/landmarks/findeco-house.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';

// OSM way 1069663212, world metres (x east, z south).
export const FOOTPRINT = [
  [-2735.3, 3563.9], [-2740.9, 3532.0], [-2735.7, 3531.1], [-2738.4, 3515.8], [-2729.0, 3514.2],
  [-2726.4, 3528.7], [-2708.9, 3525.7], [-2711.9, 3509.1], [-2691.8, 3505.6], [-2689.1, 3521.4],
  [-2683.2, 3554.9],
];
export const CENTRE = { x: -2717.3, z: 3527.5 };
const ROT_Y = THREE.MathUtils.degToRad(10); // footprint edges run at bearings 80° / 350°

const DIM = {
  podiumH: 7,
  neck: 12, neckTop: 12,
  steps: [16, 20, 23], stepH: 2.4, // floors stepping out from the neck to the shaft
  shaft: 26, notch: 3, floorH: 3.4, floors: 15,
  crown: [28, 30], crownFloorH: 3.6,
  total: 90,
};
DIM.shaftBase = DIM.neckTop + DIM.steps.length * DIM.stepH;
DIM.shaftTop = DIM.shaftBase + DIM.floors * DIM.floorH;
DIM.crownTop = DIM.shaftTop + DIM.crown.length * DIM.crownFloorH;

const BAY = 1.3;
const TILE_BAYS = 8, TILE_FLOORS = 6;

// One tile = 8 bays x 6 floors of spandrel bands, ribbon glazing and mullions.
function facadeTextures() {
  const w = 512, h = 384;
  const color = document.createElement('canvas');
  const glow = document.createElement('canvas');
  color.width = glow.width = w;
  color.height = glow.height = h;
  const g = color.getContext('2d'), e = glow.getContext('2d');
  const r = rng(58);
  const bw = w / TILE_BAYS, fh = h / TILE_FLOORS;
  g.fillStyle = '#6b5847';
  g.fillRect(0, 0, w, h);
  e.fillStyle = '#000';
  e.fillRect(0, 0, w, h);
  for (let f = 0; f < TILE_FLOORS; f++) {
    const y = f * fh + fh * 0.36;
    const gh = fh * 0.56;
    const grad = g.createLinearGradient(0, y, 0, y + gh);
    grad.addColorStop(0, '#39424a');
    grad.addColorStop(1, '#22282d');
    g.fillStyle = grad;
    g.fillRect(0, y, w, gh);
    for (let b = 0; b < TILE_BAYS; b++) {
      if (r() < 0.55) {
        const v = 150 + Math.floor(r() * 105);
        e.fillStyle = `rgb(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.58)})`;
        e.fillRect(b * bw + 3, y + 2, bw - 6, gh - 4);
      }
    }
    // spandrel shading line
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, y + gh, w, 3);
  }
  g.fillStyle = '#4a3d31';
  for (let b = 0; b <= TILE_BAYS; b++) g.fillRect(b * bw - 3, 0, 6, h);
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: mk(color, true), emissive: mk(glow, true) };
}

function facadeMaterial(tex, width, height) {
  const map = tex.map.clone();
  const em = tex.emissive.clone();
  const rx = width / (BAY * TILE_BAYS), ry = height / (DIM.floorH * TILE_FLOORS);
  map.repeat.set(rx, ry);
  em.repeat.set(rx, ry);
  const side = new THREE.MeshStandardMaterial({
    map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, roughness: 0.55, metalness: 0.2,
  });
  return side;
}

// A box whose side faces carry the facade and whose top/bottom are plain.
function faced(w, h, d, side, cap) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, cap, cap, side, side]);
}

function podium(mat) {
  const shape = new THREE.Shape(FOOTPRINT.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DIM.podiumH, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // extrude upward; shape y (= -z) maps back to world z
  const m = new THREE.Mesh(geo, mat);
  m.position.y = CITY_Y - 0.3;
  return tag(m, 'med');
}

export function buildFindeco() {
  const tex = facadeTextures();
  const concrete = new THREE.MeshStandardMaterial({ color: 0xcfc6b5, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.8 });
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xd7c4a3, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.9 });
  const sign = new THREE.MeshStandardMaterial({ color: 0x8cc63f, roughness: 0.6, emissive: 0x8cc63f, emissiveIntensity: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.8 });

  const world = new THREE.Group();
  world.name = 'findeco';
  world.add(podium(podiumMat));

  // Tower in its own frame: origin at the footprint centre, city ground level.
  const tower = new THREE.Group();
  tower.position.set(CENTRE.x, CITY_Y + DIM.podiumH - 0.3, CENTRE.z);
  tower.rotation.y = ROT_Y;
  world.add(tower);
  const at = (mesh, y, conf) => {
    mesh.position.y = y;
    tower.add(tag(mesh, conf));
    return mesh;
  };

  // Neck and the inverted steps out to the shaft.
  at(new THREE.Mesh(new THREE.BoxGeometry(DIM.neck, DIM.neckTop - DIM.podiumH, DIM.neck), dark), (DIM.neckTop + DIM.podiumH) / 2 - DIM.podiumH, 'med');
  DIM.steps.forEach((s, i) => {
    at(new THREE.Mesh(new THREE.BoxGeometry(s, DIM.stepH, s), concrete), DIM.neckTop - DIM.podiumH + (i + 0.5) * DIM.stepH, 'med');
  });

  // Shaft: two crossed boxes make a square with notched corners.
  const shaftH = DIM.floors * DIM.floorH;
  const yShaft = DIM.shaftBase - DIM.podiumH + shaftH / 2;
  const n = DIM.notch;
  const matWide = facadeMaterial(tex, DIM.shaft, shaftH);
  const matNarrow = facadeMaterial(tex, DIM.shaft - 2 * n, shaftH);
  at(faced(DIM.shaft, shaftH, DIM.shaft - 2 * n, matWide, roofMat), yShaft, 'high');
  at(faced(DIM.shaft - 2 * n, shaftH, DIM.shaft, matNarrow, roofMat), yShaft, 'high');
  // Floor slabs expressed at every floor edge.
  for (let f = 0; f <= DIM.floors; f += 1) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DIM.shaft - 2 * n + 0.3, 0.25, DIM.shaft + 0.3), concrete);
    at(slab, DIM.shaftBase - DIM.podiumH + f * DIM.floorH, 'med').castShadow = false;
  }

  // Crown: floors cantilever wider, with sign panels on each face.
  DIM.crown.forEach((w, i) => {
    const y = DIM.shaftTop - DIM.podiumH + (i + 0.5) * DIM.crownFloorH;
    at(faced(w, DIM.crownFloorH, w, facadeMaterial(tex, w, DIM.crownFloorH), concrete), y, 'high');
  });
  const signH = DIM.crownFloorH * 1.6;
  const signY = DIM.shaftTop - DIM.podiumH + DIM.crown.length * DIM.crownFloorH - signH / 2 - 0.4;
  for (let k = 0; k < 4; k++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(DIM.crown.at(-1) * 0.9, signH, 0.3), sign);
    const holder = new THREE.Group();
    holder.rotation.y = (k * Math.PI) / 2;
    p.position.set(0, signY, DIM.crown.at(-1) / 2 + 0.25);
    holder.add(tag(p, 'med'));
    tower.add(holder);
  }
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(DIM.crown.at(-1) + 0.4, 0.8, DIM.crown.at(-1) + 0.4), concrete);
  at(parapet, DIM.crownTop - DIM.podiumH + 0.4, 'med');

  // Rooftop plant and masts up to the quoted 90 m.
  at(new THREE.Mesh(new THREE.BoxGeometry(10, 3.5, 8), roofMat), DIM.crownTop - DIM.podiumH + 1.75, 'low');
  const mastTop = DIM.total - DIM.podiumH;
  const mastBase = DIM.crownTop - DIM.podiumH + 3.5;
  for (const [x, z, s] of [[-2.5, -1.5, 1], [3, 2, 0.8]]) {
    const len = (mastTop - mastBase) * s;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, len, 6), steel);
    mast.position.set(x, mastBase + len / 2, z);
    tower.add(tag(mast, 'med'));
  }

  const glowMats = [matWide, matNarrow];
  tower.traverse((o) => {
    if (o.isMesh && Array.isArray(o.material) && o.material[0].emissiveMap && !glowMats.includes(o.material[0])) {
      glowMats.push(o.material[0]);
    }
  });

  return {
    group: world,
    centre: new THREE.Vector3(CENTRE.x, CITY_Y + DIM.total / 2, CENTRE.z),
    setNight(nt) {
      for (const m of glowMats) m.emissiveIntensity = nt * 1.3;
      sign.emissiveIntensity = nt * 0.8;
    },
  };
}
