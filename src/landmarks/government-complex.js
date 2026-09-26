// Government Complex, Independence Avenue: a white low-rise complex around
// three courtyards (OSM relation 14785138), with a wide slab rising from its
// south side — dense full-height white fins over dark glazing front and back,
// solid panelled end walls, a set-back penthouse band — and a stacked,
// cantilevered entrance block facing the Freedom Statue.
// Sources: docs/landmarks/independence-avenue.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { canvasTex, extrudeFootprint, faced, finRow, siteFrame, windowGlow } from './lib.js';

// OSM relation 14785138, world metres.
const OUTER = [
  [-2093.6, 3251.4], [-2088.6, 3283.1], [-1966.9, 3264.4], [-1957.5, 3325.2], [-2001.2, 3331.9],
  [-2019.8, 3334.7], [-2089.3, 3345.4], [-2088.5, 3350.7], [-2127.4, 3356.7], [-2128.5, 3350.0],
  [-2140.0, 3351.8], [-2154.9, 3256.1], [-2160.8, 3257.0], [-2165.8, 3224.7], [-2158.9, 3223.6],
  [-2159.8, 3218.3], [-2094.1, 3208.2], [-2087.6, 3250.5],
];
const COURTS = [
  [[-2142.0, 3259.3], [-2105.2, 3253.7], [-2101.4, 3278.2], [-2138.2, 3283.9]],
  [[-2080.9, 3331.7], [-2087.1, 3291.9], [-2023.3, 3282.1], [-2018.7, 3311.7], [-2061.0, 3318.2], [-2059.4, 3328.4]],
  [[-1974.5, 3274.6], [-1969.9, 3304.3], [-2010.1, 3310.4], [-2014.7, 3280.8]],
];

// Slab measured on Esri imagery at a known scale, nudged 4 m south onto the
// south wing (tall roofs sit displaced in imagery); heights from photos.
export const SLAB = { x: -2008.3, z: 3318, bearing: 171, w: 94, d: 27, h: 44 };
const PODIUM_H = 11;
const FLOOR_H = 3.4;

function podiumMaterials() {
  const wall = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#ebe7df';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#39424a';
    g.fillRect(0, h * 0.18, w, h * 0.38); // window strip
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, h * 0.56, w, 2);
  });
  wall.repeat.set(1 / 6, 1 / 3.6); // one window strip per 3.6 m floor (ExtrudeGeometry UVs are in metres)
  return [
    new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ map: wall, roughness: 0.85 }),
  ];
}

// Solid end walls: large pale panels with fine joints.
function panelTexture(w, h) {
  const t = canvasTex(128, 128, (g, cw, ch) => {
    g.fillStyle = '#e6e1d6';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = 'rgba(80,70,60,0.28)';
    g.fillRect(0, 0, cw, 2);
    g.fillRect(0, 0, 2, ch);
  });
  t.repeat.set(w / 4, h / FLOOR_H);
  return t;
}

export function buildGovernmentComplex() {
  const world = new THREE.Group();
  world.name = 'government-complex';
  world.add(tag(extrudeFootprint(OUTER, COURTS, PODIUM_H, podiumMaterials()), 'med'));

  const white = new THREE.MeshStandardMaterial({ color: 0xe9e5dc, roughness: 0.8 });
  const fin = new THREE.MeshStandardMaterial({ color: 0xe4dfd4, roughness: 0.75 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.95 });
  const floors = Math.round(SLAB.h / FLOOR_H);
  const glow = windowGlow(24, floors, 91, { litFraction: 0.45, glassTop: 0.15, glassH: 0.65 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x323a42, roughness: 0.25, metalness: 0.4,
    emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0,
  });

  const f = siteFrame(SLAB.x, SLAB.z, SLAB.bearing);
  world.add(f);
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };
  const base = PODIUM_H;
  const midY = base + SLAB.h / 2;

  // Glazed core (down to the ground, through the podium), fins, end walls.
  const core = put(faced(SLAB.w - 6, SLAB.h + base, SLAB.d - 2, glass, roof), 'med');
  core.position.y = (SLAB.h + base) / 2;
  for (const side of [1, -1]) {
    const row = finRow(fin, {
      length: SLAB.w - 6.5, height: SLAB.h, spacing: 1.9, depth: 1.5, thickness: 0.45, y: midY, z: side * (SLAB.d / 2 - 0.6),
    });
    put(row, 'high');
  }
  const endMat = new THREE.MeshStandardMaterial({ map: panelTexture(SLAB.d, SLAB.h), roughness: 0.8 });
  for (const side of [1, -1]) {
    const end = put(faced(3.2, SLAB.h + base + 0.6, SLAB.d + 0.8, endMat, white), 'high');
    end.position.set(side * (SLAB.w / 2 - 1.6), (SLAB.h + base + 0.6) / 2, 0);
  }
  const cap = put(new THREE.Mesh(new THREE.BoxGeometry(SLAB.w, 0.9, SLAB.d + 0.4), white), 'high');
  cap.position.y = base + SLAB.h + 0.45;

  // Penthouse band, set back and centred, with a mast and a dish.
  const pent = put(new THREE.Mesh(new THREE.BoxGeometry(SLAB.w * 0.4, 6, SLAB.d - 5), white), 'med');
  pent.position.set(0, base + SLAB.h + 3.9, -1);
  const mast = put(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 9, 5), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 0.7, roughness: 0.4, wireframe: true })), 'low');
  mast.position.set(8, base + SLAB.h + 6.9 + 4.5, -4);
  const dish = put(new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), white), 'low');
  dish.position.set(-6, base + SLAB.h + 7.2, -3);
  dish.rotation.x = -0.9;

  // Stacked cantilevered entrance block on the south face, towards the statue.
  const front = SLAB.d / 2;
  const stack = [
    { w: 34, h: 3.6, d: 9, y: 4.2, z: front + 4.5 },
    { w: 28, h: 3.4, d: 7, y: 7.8, z: front + 3.5 },
  ];
  for (const s of stack) {
    const block = put(faced(s.w, s.h, s.d, white, roof), 'med');
    block.position.set(0, s.y + s.h / 2, s.z);
    const band = put(new THREE.Mesh(new THREE.PlaneGeometry(s.w - 1, s.h * 0.4), glass), 'med');
    band.position.set(0, s.y + s.h * 0.45, s.z + s.d / 2 + 0.02);
  }
  const lobby = put(new THREE.Mesh(new THREE.BoxGeometry(30, 4.2, 6), glass), 'med');
  lobby.position.set(0, 2.1, front + 2);

  return {
    group: world,
    frame: f,
    setNight(n) {
      glass.emissiveIntensity = n * 1.2;
    },
  };
}
