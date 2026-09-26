// Bank of Zambia head office, off Cairo Road (OSM way 283005464, 8 levels):
// a 54 x 28 m block whose seven upper floors are a deep grid of projecting
// floor slabs and close vertical fins, capped by a heavy overhanging fascia.
// On the west front, the north half sits on a lower wing whose sloping
// concrete skirt is lettered BANK OF ZAMBIA over a red-brick base; the south
// half is the glazed entrance with a canopy, flags, and a fountain lawn in
// front. Two enclosed skybridges leave the south end for the neighbouring
// block. Sources: docs/landmarks/bank-of-zambia.md.
import * as THREE from 'three';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex, faced, finRow, rectFootprint, siteFrame, windowGlow } from './lib.js';

// Frame on the OSM centroid; local +z faces the west front (bearing 260°),
// local +x runs south along the front (the skybridge end).
export const BOZ = { x: -2762.95, z: 3187.35, bearing: 260, w: 54.3, d: 28.4 };
const GROUND = 6.5, FLOOR = 3.5, FLOORS = 7;
const TOP = GROUND + FLOORS * FLOOR; // 31 m
const SOUTH_NEIGHBOUR_GAP = 16; // to OSM way 283005457

function letteringTexture() {
  return canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#c4bba9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6d6556';
    g.font = '600 30px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.letterSpacing = '10px';
    g.fillText('BANK OF ZAMBIA', w / 2, h / 2);
  }, { repeat: false });
}

function brickTexture(w, h) {
  const r = rng(47);
  const t = canvasTex(128, 128, (g, cw, ch) => {
    g.fillStyle = '#8f4633';
    g.fillRect(0, 0, cw, ch);
    for (let row = 0; row < 16; row++) {
      for (let x = row % 2 ? -8 : 0; x < cw; x += 16) {
        const v = Math.floor(r() * 24) - 12;
        g.fillStyle = `rgb(${150 + v},${72 + v},${52 + v})`;
        g.fillRect(x + 1, row * 8 + 1, 14, 6);
      }
    }
  });
  t.repeat.set(w / 2, h / 2);
  return t;
}

// All four faces of the upper block: a slab at every floor and fins between.
function facadeGrid(f, put, concrete, confFront) {
  const { w, d } = BOZ;
  for (let i = 0; i <= FLOORS; i++) {
    const slab = put(new THREE.Mesh(new THREE.BoxGeometry(w + 2.2, 0.8, d + 2.2), concrete), i === 0 ? 'high' : confFront);
    slab.position.y = GROUND + i * FLOOR;
  }
  const faces = [
    { len: w, rot: 0, off: d / 2 + 0.55, conf: confFront }, // west front
    { len: w, rot: Math.PI, off: d / 2 + 0.55, conf: 'low' }, // east back
    { len: d, rot: Math.PI / 2, off: w / 2 + 0.55, conf: 'med' }, // south end
    { len: d, rot: -Math.PI / 2, off: w / 2 + 0.55, conf: 'med' }, // north end
  ];
  for (const face of faces) {
    const holder = new THREE.Group();
    holder.rotation.y = face.rot;
    holder.add(finRow(concrete, {
      length: face.len, height: FLOORS * FLOOR, spacing: 1.5, depth: 1.1, thickness: 0.34,
      y: GROUND + (FLOORS * FLOOR) / 2, z: face.off,
    }));
    f.add(tag(holder, face.conf));
  }
}

export function buildBankOfZambia() {
  const f = siteFrame(BOZ.x, BOZ.z, BOZ.bearing);
  f.name = 'bank-of-zambia';
  const { w, d } = BOZ;
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc2b8a5, roughness: 0.88 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.9 });
  const glow = windowGlow(36, FLOORS, 57, { litFraction: 0.5, glassTop: 0.12, glassH: 0.7 });
  glow.repeat.set(1, 1);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2a3036, roughness: 0.25, metalness: 0.4, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0,
  });

  // Upper block: glazed core behind the grid, heavy fascia on top.
  const core = put(faced(w - 0.4, FLOORS * FLOOR, d - 0.4, glass, roof), 'high');
  core.position.y = GROUND + (FLOORS * FLOOR) / 2;
  facadeGrid(f, put, concrete, 'high');
  const fascia = put(faced(w + 3, 3.4, d + 3, concrete, roof), 'high');
  fascia.position.y = TOP + 1.7;
  const plant = put(new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 7), roof), 'low');
  plant.position.set(-6, TOP + 3.4 + 1.1, -3);

  // Ground floor behind the lower wing and the entrance.
  const gf = put(faced(w - 3, GROUND, d - 3, glass, roof), 'med');
  gf.position.y = GROUND / 2;

  // Lower wing on the north half of the front: brick base, sloping lettered skirt.
  const wingX0 = -w / 2, wingX1 = 2, wingLen = wingX1 - wingX0;
  const front = d / 2, proj = 6, baseH = 3.2;
  const brick = new THREE.MeshStandardMaterial({ map: brickTexture(wingLen, baseH), roughness: 0.95 });
  const base = put(new THREE.Mesh(new THREE.BoxGeometry(wingLen, baseH, proj + 1), brick), 'high');
  base.position.set((wingX0 + wingX1) / 2, baseH / 2, front + proj / 2 - 0.5);
  const skirtLen = Math.hypot(proj, GROUND - baseH);
  const skirt = put(new THREE.Mesh(new THREE.PlaneGeometry(wingLen, skirtLen), new THREE.MeshStandardMaterial({ map: letteringTexture(), roughness: 0.85, side: THREE.DoubleSide })), 'high');
  skirt.rotation.x = -Math.atan2(proj, GROUND - baseH);
  skirt.position.set((wingX0 + wingX1) / 2, (GROUND + baseH) / 2, front + proj / 2);
  for (const x of [wingX0, wingX1]) {
    const end = put(new THREE.Mesh(new THREE.BufferGeometry(), concrete), 'high');
    end.geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      x, baseH, front + proj, x, GROUND, front, x, baseH, front,
    ], 3));
    end.geometry.computeVertexNormals();
    end.material = concrete.clone();
    end.material.side = THREE.DoubleSide;
  }

  // Entrance on the south half: canopy on slim posts, flags.
  const canopy = put(new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 6), concrete), 'high');
  canopy.position.set(14, 4.2, front + 3);
  const steel = new THREE.MeshStandardMaterial({ color: 0xd4d6d8, metalness: 0.6, roughness: 0.4 });
  for (const x of [8.8, 19.2]) {
    const post = put(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), steel), 'high');
    post.position.set(x, 2, front + 5.6);
  }
  const flagColours = [0x198a00, 0x2f5fa7, 0x198a00];
  flagColours.forEach((c, i) => {
    const x = 22 + i * 1.6;
    const pole = put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 7, 6), steel), 'med');
    pole.position.set(x, 3.5, front + 7);
    const cloth = put(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide })), 'low');
    cloth.position.set(x + 0.72, 6.4, front + 7);
  });

  // Skybridges from the south end to the neighbouring block, floors 3 and 6.
  for (const y of [GROUND + 2 * FLOOR + 1.75, GROUND + 5 * FLOOR + 1.75]) {
    const bridge = put(faced(SOUTH_NEIGHBOUR_GAP + 1, 3, 3.2, glass, concrete), 'med');
    bridge.position.set(w / 2 + (SOUTH_NEIGHBOUR_GAP + 1) / 2, y, 6);
    const band = put(new THREE.Mesh(new THREE.BoxGeometry(SOUTH_NEIGHBOUR_GAP + 1, 0.6, 3.6), concrete), 'med');
    band.position.set(w / 2 + (SOUTH_NEIGHBOUR_GAP + 1) / 2, y - 1.8, 6);
  }

  // Fountain lawn in front of the entrance (the service road is ~35 m out).
  const lawn = put(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0x5f8f3c, roughness: 1 })), 'med');
  lawn.position.set(12, 0.05, front + 16);
  const basin = put(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 8, 32), concrete), 'med');
  basin.rotation.x = Math.PI / 2;
  basin.position.set(12, 0.35, front + 16);
  const water = put(new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), new THREE.MeshStandardMaterial({ color: 0x3d8fc4, roughness: 0.1, metalness: 0.3 })), 'med');
  water.rotation.x = -Math.PI / 2;
  water.position.set(12, 0.3, front + 16);
  const make = palmFactory();
  const r = rng(83);
  for (const [x, z] of [[-2, front + 10], [24, front + 12]]) {
    const p = make(9 + r() * 2, r);
    p.position.set(x, 0, z);
    put(p, 'med');
  }

  return {
    group: f,
    footprints: [rectFootprint(f, w + 2, d + 2), rectFootprint(f, wingLen, proj + 1, (wingX0 + wingX1) / 2, front + proj / 2)],
    setNight(n) {
      glass.emissiveIntensity = n * 1.2;
    },
  };
}
