// Mulungushi International Conference Centre, off Great East Road: the 1970
// Old Wing (Energoprojekt, built in 107 days for the Non-Aligned summit) and
// the 2001 East Wing across the service road, and the 2022 Kenneth Kaunda
// Wing to the north-west, the part most people picture today.
// - Old Wing: two storeys on its OSM outline; a recessed glazed ground floor,
//   an upper floor of concrete piers and grilles, and the deep rust-brown
//   patterned precast fascia with a notched top edge. A taller hall block in
//   the middle carries a second fascia, the step seen in the photos.
// - East Wing: a tall wedge clad in silver aluminium panels, with a
//   green-blue glass curtain wall facing the Old Wing and the dark octagonal
//   roof of the main hall.
// - Kenneth Kaunda Wing: two wings under a deep white roof frame, fronted by
//   a long curved screen of tall white fins over glass, a taller terracotta
//   central block with punched windows, and red plinth walls along the front.
// Sources: docs/landmarks/mulungushi.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex, extrudeFootprint, glowing, limb } from './lib.js';

// OSM relation 14208530, world metres.
const OLD = [[413.7, -350.9], [415.0, -347.0], [435.3, -282.2], [460.7, -289.1], [464.8, -276.9], [465.6, -274.2],
  [482.4, -279.1], [477.5, -294.9], [491.0, -299.1], [483.2, -328.2], [486.2, -331.5], [484.5, -337.7],
  [479.9, -338.8], [470.3, -367.3]];
const EAST = [[485.5, -379.4], [493.4, -353.4], [488.9, -343.0], [500.6, -307.5], [510.9, -301.6], [519.0, -275.3],
  [561.0, -347.8], [491.3, -385.0], [486.0, -383.8]];
// Raised hall in the middle of the Old Wing, from the aerial.
const HALL = [[441.4, -345.7], [466.3, -354.0], [479.7, -311.0], [450.3, -302.1]];
// The East Wing's glass wall (the west face towards the Old Wing) and the octagon.
const GLASS = [[488.9, -343.0], [500.6, -307.5]];
const OCTAGON = { x: 530, z: -335, r: 20 };
// Kenneth Kaunda Wing, traced from the aerial (OSM relation 14208532 sits a
// few metres off the imagery). FRONT is the curved east face, north to south.
const KK = [[434.8, -198.9], [438.2, -172.4], [444.0, -143.6], [449.8, -114.8], [457.8, -84.6], [469.9, -54.3],
  [483.7, -16.9], [400.8, 0.4], [386.4, -45.7], [382.0, -60.0], [373.4, -116.2], [351.3, -168.9]];
const KK_FRONT = [0, 6]; // indices of the curved front, inclusive
const KK_CENTRE = [[373.4, -116.2], [430.2, -130.6], [437.7, -73.0], [382.0, -60.0]];
const KK_H = 19.5, KK_FRAME = 2.6, KK_CENTRE_H = 25, KK_GROUND = 4.5;
const PODIUM_W = 9, PODIUM_H = 1.8; // granite podium along the front, red walls

const GROUND = 3.8, UPPER = 3.4, FASCIA = 2.6, HALL_H = 4.2, EAST_H = 12.5;

// Outward (d > 0) or inward miter offset of a closed outline.
function offset(pts, d) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n];
    area += x0 * z1 - x1 * z0;
  }
  const s = area > 0 ? 1 : -1; // edge normal pointing out of the shape
  const normal = (a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    return [(s * dz) / l, (-s * dx) / l];
  };
  return pts.map((p, i) => {
    const a = normal(pts[(i - 1 + n) % n], p), b = normal(p, pts[(i + 1) % n]);
    let mx = a[0] + b[0], mz = a[1] + b[1];
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;
    const k = Math.min(3, 1 / Math.max(0.3, mx * a[0] + mz * a[1]));
    return [p[0] + mx * d * k, p[1] + mz * d * k];
  });
}

// ---------- textures (extruded side UVs: u = metres along, v = metres up).
// Each draw works bottom-up: canvas y = 0 is the bottom of the wall. ----------
function wallTex(w, h, repeatW, repeatH, draw) {
  const t = canvasTex(w, h, (g) => {
    g.translate(0, h);
    g.scale(1, -1);
    draw(g, w, h);
  });
  t.repeat.set(1 / repeatW, 1 / repeatH);
  return t;
}
const groundGlass = () => wallTex(128, 128, 3, GROUND, (g, w, h) => {
  g.fillStyle = '#1c2530';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#b9b2a4';
  g.fillRect(0, 0, w, 10); // sill
  g.fillRect(0, 0, 6, h);
  g.fillRect(w / 2 - 2, 0, 4, h);
  g.fillRect(0, h * 0.72, w, 4);
});
const upperScreens = () => wallTex(128, 128, 3, 3, (g, w, h) => {
  // a bay of pale concrete grille between piers, repeated up the whole wall
  // (its top is hidden behind the fascia)
  g.fillStyle = '#9c968c';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#26303a';
  g.fillRect(18, 10, w - 36, h - 20);
  g.fillStyle = '#bdb7ab';
  for (let y = 14; y < h - 14; y += 12) for (let x = 22; x < w - 22; x += 12) g.fillRect(x, y, 6, 6);
  g.fillStyle = '#8a857c';
  g.fillRect(0, 0, 14, h); // pier
});
function fasciaTex() {
  // rust-brown precast relief: two rows of deep blocks, with a notched top
  // edge cut out by alphaTest
  return wallTex(128, 64, 4.8, FASCIA, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const band = h * 0.8;
    g.fillStyle = '#7d3f22';
    g.fillRect(0, 0, w, band);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * 32 + (r ? 16 : 0), y = 4 + r * (band / 2);
        g.fillStyle = '#a2582f';
        g.fillRect(x + 2, y, 26, band / 2 - 8);
        g.fillStyle = '#6a351c';
        g.fillRect(x + 2, y, 26, 4);
      }
    }
    g.fillStyle = '#8f4a27';
    for (let x = 0; x < w; x += 32) g.fillRect(x, band, 16, h - band); // notches
  });
}
const panels = () => wallTex(128, 128, 3, 3, (g, w, h) => {
  g.fillStyle = '#c3c7cb';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8f959b';
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
});
const curtain = (tint = '#2f6a70') => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = tint;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9d2d6';
  g.lineWidth = 3;
  for (let x = 0; x <= w; x += w / 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}, { repeat: false });

const terracotta = () => wallTex(128, 128, 4, 4, (g, w, h) => {
  g.fillStyle = '#8e4b36';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#5e2f22';
  g.fillRect(34, 30, 60, 70); // deep reveal
  g.fillStyle = '#1f2833';
  g.fillRect(44, 38, 40, 56);
});
// KK Wing terracotta: panels with deep windows staggered floor to floor
// (one tile = 8 m x 10 m, two floors), bottom-up like the other wall textures.
const staggered = () => wallTex(256, 320, 8, 10, (g, w, h) => {
  g.fillStyle = '#8f4c3c';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7a3f31';
  g.lineWidth = 2;
  for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let f = 0; f < 2; f++) {
    for (const x of f ? [40, 168] : [104, 232]) {
      const y = 40 + f * 160;
      g.fillStyle = '#5c2e24';
      g.fillRect(x - 22, y - 6, 44, 104); // reveal
      g.fillStyle = '#2b4f73';
      g.fillRect(x - 12, y, 24, 90);
    }
  }
});
// KK Wing ground floor: storey-high glazing with white mullions.
const groundBand = () => wallTex(128, 128, 2.4, KK_GROUND, (g, w, h) => {
  g.fillStyle = '#35597f';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#eef0f0';
  g.fillRect(0, 0, 6, h);
  g.fillRect(0, 0, w, 6);
  g.fillRect(0, h - 10, w, 10);
  g.fillRect(0, h * 0.62, w, 4);
});
const pergola = () => {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#6f7275';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9e7e2';
    for (let i = 0; i < w; i += 16) {
      g.fillRect(i, 0, 3, h);
      g.fillRect(0, i, w, 3);
    }
  });
  t.repeat.set(1 / 16, 1 / 16);
  return t;
};

// A band (ring) from `inner` to `outer` outlines, extruded from y0 to y1.
function ring(outer, inner, y0, y1, mats) {
  const m = extrudeFootprint(outer, [inner], y1 - y0, mats);
  m.position.y += y0;
  return m;
}

// ---------- the yard in front of the Kenneth Kaunda Wing ----------
// From the aerial and the founder's photos: a paved plaza with a round basin,
// lawn panels, the African Union statue, a double row of steel flagpoles,
// big grey urns, solar street lights and two avenues of palms.
// All traced from the aerial at 0.29 m/px. The paving stops at the drives and
// roads around the yard (the tiles draw those), and covers the OSM footpaths
// inside it.
const YARD_EAST = [[525, -28], [531, -40], [502, -142], [500, -146], [476, -211], [446, -208]];
const LAWNS = [
  [[452, -200], [468, -202], [472, -170], [466, -165], [448, -172]],
  [[468, -202], [476, -202], [486, -162], [480, -152], [472, -170]],
  [[458, -162], [480, -143], [463, -135], [456, -150]],
  [[482, -151], [491, -152], [491, -143], [483, -143]],
  [[478, -93], [493, -95], [489, -60], [480, -80]],
  [[498, -99], [507, -99], [507, -90], [498, -90]],
  [[496, -84], [512, -83], [523, -53], [519, -37], [495, -38], [492, -58], [500, -63]],
];
const BASIN = { x: 480, z: -115, r: 8 };
const STATUE = { x: 482.5, z: -157, face: Math.PI / 2 }; // faces east, down the flag walk
const FLAGS = [[478, -200], [490, -152]]; // the striped walk between the north lawns and the drive
// South of the plaza, OSM maps the paved walk through the palm avenue (way
// 405672365) and a line along the forest edge (680357976) as service roads;
// on the ground there is only the walk, between two rows of palms, on a grass
// verge. The verge and the walk are laid over the tile roads there.
const PALM_WALK = [[500.6, -162], [542, -27]];
const VERGE = [[502, -150], [523, -150], [561, -26], [525, -28], [531, -40], [502, -142]];
// palms: along the north parking drive, and either side of the palm walk
const PALM_ROWS = [[[480, -229], [497, -182], 9], [[502.8, -145], [538, -22], 9], [[508.9, -146], [544, -23], 9]];

function flatSlab(pts, y, thick, mat) {
  const m = extrudeFootprint(pts, [], thick, [mat, mat]);
  m.position.y += y;
  return m;
}

function buildYard(podiumEdge) {
  const g = new THREE.Group();
  const put = (m, conf) => g.add(tag(m, conf, { cast: m.userData.cast ?? true }));
  const footprints = [];
  const paveTex = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#bdb8ae';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a8a39a';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
  });
  paveTex.repeat.set(1 / 3, 1 / 3);
  const pave = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.9 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x5d8f37, roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd6d9dc, roughness: 0.3, metalness: 0.8 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xc9cbcd, roughness: 0.7 });

  // plaza and lawns (thin slabs just above the city ground)
  const plaza = [];
  for (let i = KK_FRONT[0]; i <= KK_FRONT[1]; i++) plaza.push(podiumEdge[i]);
  const slabPlaza = flatSlab([...plaza, ...YARD_EAST], 0, 0.08, pave); // podium edge N->S, then back north
  slabPlaza.userData.cast = false;
  put(slabPlaza, 'med');
  for (const l of LAWNS) {
    const lawn = flatSlab(l, 0, 0.14, grass);
    lawn.userData.cast = false;
    put(lawn, 'med');
  }

  // grass verge and the paved palm walk, over the tile roads on that side
  const verge = flatSlab(VERGE, 0, 0.16, grass);
  verge.userData.cast = false;
  put(verge, 'med');
  {
    const [a, b] = PALM_WALK;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    const w = 2.2;
    const walkPave = flatSlab([[a[0] - uz * w, a[1] + ux * w], [b[0] - uz * w, b[1] + ux * w], [b[0] + uz * w, b[1] - ux * w], [a[0] + uz * w, a[1] - ux * w]], 0, 0.2, new THREE.MeshStandardMaterial({ color: 0xc9bca3, roughness: 0.85 }));
    walkPave.userData.cast = false;
    put(walkPave, 'med');
  }

  // round basin
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(BASIN.r, BASIN.r, 0.7, 48), new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.6 }));
  rim.position.set(BASIN.x, CITY_Y + 0.35, BASIN.z);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(BASIN.r - 0.4, BASIN.r - 0.4, 0.1, 48), new THREE.MeshStandardMaterial({ color: 0x6fa3c4, roughness: 0.1, metalness: 0.3 }));
  water.position.set(BASIN.x, CITY_Y + 0.68, BASIN.z);
  put(rim, 'med');
  put(water, 'med');
  footprints.push(ringPts(BASIN.x, BASIN.z, BASIN.r));

  // African Union statue: stepped plinth, the Africa slab, three figures
  const st = new THREE.Group();
  st.position.set(STATUE.x, CITY_Y, STATUE.z);
  st.rotation.y = STATUE.face;
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0xb0b2b4, roughness: 0.8 }));
  base.position.y = 0.45;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 2.6), stone);
  upper.position.set(0, 1.35, 0.4);
  const africa = new THREE.Shape([[-1.7, 0], [-0.4, 0], [0.5, 1.3], [1.3, 2.6], [1.8, 3.6], [2.6, 4.3], [2.3, 5.2],
    [1.4, 6.2], [-0.8, 6.4], [-2.1, 5.6], [-2.6, 4.4], [-2.2, 2.6]].map(([x, y]) => new THREE.Vector2(x, y)));
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(africa, { depth: 1.1, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.6, flatShading: true }));
  slab.position.set(0, 1.8, -0.9);
  st.add(base, upper, slab);
  const skin = new THREE.MeshStandardMaterial({ color: 0x6b4a36, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.8 });
  for (const [x, dress] of [[-1.1, false], [0, false], [1.1, true]]) {
    const fig = new THREE.Group();
    fig.position.set(x, 1.8, 0.8);
    const V = (a, b, c) => new THREE.Vector3(a, b, c);
    fig.add(limb(V(-0.15, 0, 0), V(-0.15, 1.1, 0), 0.13, cloth), limb(V(0.15, 0, 0), V(0.15, 1.1, 0), 0.13, cloth));
    const body = dress
      ? new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 12), cloth)
      : new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 1.1, 10), cloth);
    body.position.y = dress ? 1.2 : 1.55;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.8, 10), cloth);
    torso.position.y = 2.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skin);
    head.position.y = 2.65;
    fig.add(body, torso, head);
    st.add(fig);
  }
  put(st, 'low');
  footprints.push([[-3.5, -2.5], [3.5, -2.5], [3.5, 2.5], [-3.5, 2.5]].flatMap(([x, z]) => {
    const c = Math.cos(STATUE.face), s = Math.sin(STATUE.face);
    return [STATUE.x + x * c + z * s, STATUE.z - x * s + z * c];
  }));

  // double row of steel flagpoles along a paved walkway
  const [fa, fb] = FLAGS;
  const flen = Math.hypot(fb[0] - fa[0], fb[1] - fa[1]);
  const fx = (fb[0] - fa[0]) / flen, fz = (fb[1] - fa[1]) / flen;
  const walk = flatSlab([[fa[0] - fz * 3, fa[1] + fx * 3], [fb[0] - fz * 3, fb[1] + fx * 3], [fb[0] + fz * 3, fb[1] - fx * 3], [fa[0] + fz * 3, fa[1] - fx * 3]], 0, 0.16, new THREE.MeshStandardMaterial({ color: 0xd8c7a6, roughness: 0.8 }));
  walk.userData.cast = false;
  put(walk, 'med');
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.11, 12, 8);
  const nPoles = 12;
  const poles = new THREE.InstancedMesh(poleGeo, steel, nPoles * 2);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (const side of [-2.3, 2.3]) {
    for (let i = 0; i < nPoles; i++) {
      const t = (i + 0.5) / nPoles;
      m4.makeTranslation(fa[0] + (fb[0] - fa[0]) * t - fz * side, CITY_Y + 6, fa[1] + (fb[1] - fa[1]) * t + fx * side);
      poles.setMatrixAt(k++, m4);
    }
  }
  put(poles, 'high');

  // big grey urns along the podium and the walkway ends
  const urnGeo = new THREE.LatheGeometry([[0, 0], [0.35, 0], [0.55, 0.3], [0.6, 0.8], [0.45, 1.4], [0.3, 1.6], [0.32, 1.7], [0, 1.7]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const urnMat = new THREE.MeshStandardMaterial({ color: 0x8c8f93, roughness: 0.6 });
  const urns = [];
  const steps = Math.floor((KK_FRONT[0] + KK_FRONT[1]) / 2);
  for (let i = KK_FRONT[0]; i < KK_FRONT[1]; i++) {
    if (i === steps) continue; // the entrance steps
    const [a, b] = [podiumEdge[i], podiumEdge[i + 1]];
    // the front faces east, so +x steps just off the podium wall
    for (const t of [0.3, 0.7]) urns.push([a[0] + (b[0] - a[0]) * t + 1.5, a[1] + (b[1] - a[1]) * t]);
  }
  urns.push([fa[0] - fz * 3.8, fa[1] + fx * 3.8], [fa[0] + fz * 3.8, fa[1] - fx * 3.8]);
  const urnMesh = new THREE.InstancedMesh(urnGeo, urnMat, urns.length);
  urns.forEach(([x, z], i) => urnMesh.setMatrixAt(i, m4.makeTranslation(x, CITY_Y + 0.08, z)));
  put(urnMesh, 'med');

  // solar street lights along the yard's east edge, just inside the paving
  const lightPts = [];
  for (let i = 1; i < YARD_EAST.length - 1; i++) {
    const [a, b] = [YARD_EAST[i], YARD_EAST[i + 1]];
    const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 18);
    for (let j = 0; j < n; j++) lightPts.push([a[0] + ((b[0] - a[0]) * j) / n - 2.5, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  const lampPole = new THREE.CylinderGeometry(0.08, 0.12, 7, 8);
  const panelGeo = new THREE.BoxGeometry(1.4, 0.06, 0.8);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d2a44, roughness: 0.3, metalness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 0 });
  for (const [x, z] of lightPts) {
    const pole = new THREE.Mesh(lampPole, steel);
    pole.position.set(x, CITY_Y + 3.5, z);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(x, CITY_Y + 7.2, z);
    panel.rotation.z = 0.3;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), lampMat);
    lamp.position.set(x + 0.5, CITY_Y + 6.6, z);
    put(pole, 'med');
    put(panel, 'med');
    put(lamp, 'med');
  }

  // palm avenues
  const make = palmFactory();
  const r = rng(71);
  for (const [a, b, gap] of PALM_ROWS) {
    const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap);
    for (let i = 0; i <= n; i++) {
      // date palms: stout trunks, broad crowns
      const p = make(6.5 + r() * 2, r);
      p.scale.set(1.35, 1, 1.35);
      p.position.set(a[0] + ((b[0] - a[0]) * i) / n, CITY_Y, a[1] + ((b[1] - a[1]) * i) / n);
      put(p, 'med');
    }
  }
  return { group: g, footprints, setNight: (n) => (lampMat.emissiveIntensity = n * 2) };
}

function ringPts(x, z, r, n = 16) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(x + Math.sin((i / n) * Math.PI * 2) * r, z + Math.cos((i / n) * Math.PI * 2) * r);
  return out;
}

export function buildMulungushi() {
  const group = new THREE.Group();
  group.name = 'mulungushi';
  const put = (m, conf) => group.add(tag(m, conf));

  const roofDark = new THREE.MeshStandardMaterial({ color: 0x5d5f60, roughness: 0.9 });
  const roofPale = new THREE.MeshStandardMaterial({ color: 0xb9b8b2, roughness: 0.85 });
  const glassMat = glowing(groundGlass(), { roughness: 0.25, metalness: 0.3 });
  const screenMat = glowing(upperScreens(), { roughness: 0.8 });
  const fascia = new THREE.MeshStandardMaterial({ map: fasciaTex(), roughness: 0.85, alphaTest: 0.5, side: THREE.DoubleSide });

  // Old Wing: recessed glazed ground floor, upper storey, fascia band.
  const inner = offset(OLD, -1.6);
  put(extrudeFootprint(inner, [], GROUND, [roofDark, glassMat]), 'med');
  const upper = extrudeFootprint(OLD, [], UPPER + 1.4, [roofDark, screenMat]);
  upper.position.y += GROUND;
  put(upper, 'med');
  const top = GROUND + UPPER;
  put(ring(offset(OLD, 1.2), offset(OLD, 0.05), top - 0.4, top + FASCIA - 0.4, [roofDark, fascia]), 'high');

  // The raised hall with its own fascia.
  const hallBase = GROUND + UPPER + 1.4;
  const hall = extrudeFootprint(HALL, [], HALL_H, [roofPale, screenMat]);
  hall.position.y += hallBase;
  put(hall, 'med');
  put(ring(offset(HALL, 0.8), offset(HALL, 0.05), hallBase + HALL_H - 1.2, hallBase + HALL_H + 1.0, [roofPale, fascia]), 'med');

  // East Wing: silver-panelled wedge, glass wall, octagonal hall roof.
  const silver = new THREE.MeshStandardMaterial({ map: panels(), roughness: 0.45, metalness: 0.5 });
  put(extrudeFootprint(EAST, [], EAST_H, [roofPale, silver]), 'med');
  const [a, b] = GLASS;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(len, EAST_H - 0.8), glowing(curtain(), { roughness: 0.1, metalness: 0.6 }));
  // outward normal of the west face points away from the wedge (towards -x)
  const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
  const out = nx < 0 ? [nx, nz] : [-nx, -nz];
  glassWall.position.set((a[0] + b[0]) / 2 + out[0] * 0.15, CITY_Y + 0.8 + (EAST_H - 0.8) / 2, (a[1] + b[1]) / 2 + out[1] * 0.15);
  glassWall.rotation.y = Math.atan2(out[0], out[1]);
  put(glassWall, 'high');
  const octDark = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.7, flatShading: true });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(OCTAGON.r, OCTAGON.r, 1.4, 8), octDark);
  drum.position.set(OCTAGON.x, CITY_Y + EAST_H + 0.7, OCTAGON.z);
  drum.rotation.y = Math.PI / 8;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(OCTAGON.r, 3.2, 8), octDark);
  cone.position.set(OCTAGON.x, CITY_Y + EAST_H + 1.4 + 1.6, OCTAGON.z);
  cone.rotation.y = Math.PI / 8;
  put(drum, 'high');
  put(cone, 'med');

  // ---------- Kenneth Kaunda Wing ----------
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.6 });
  const clay = glowing(terracotta(), { roughness: 0.85 });
  const kkClay = glowing(staggered(), { roughness: 0.8 });
  const kkGround = glowing(groundBand(), { roughness: 0.2, metalness: 0.4 });
  const roofGrid = new THREE.MeshStandardMaterial({ map: pergola(), roughness: 0.8 });
  // glazed ground floor all round, terracotta with staggered windows above
  // (the ends and the back; the front is hidden behind glass and fins)
  put(extrudeFootprint(KK, [], KK_GROUND, [roofGrid, kkGround]), 'high');
  const kkUpper = extrudeFootprint(KK, [], KK_H - KK_GROUND, [roofGrid, kkClay]);
  kkUpper.position.y += KK_GROUND;
  put(kkUpper, 'high');
  put(extrudeFootprint(KK_CENTRE, [], KK_CENTRE_H, [roofPale, clay]), 'high');
  // the deep white roof frame, overhanging the walls
  put(ring(offset(KK, 3.5), offset(KK, -9), KK_H - 0.2, KK_H + KK_FRAME, [white, white]), 'high');

  // Along the curved front: glass, the white fins, the granite podium with
  // its red walls, and the entrance steps, canopy and columns.
  const kkGlass = glowing(curtain('#3f6f9e'), { roughness: 0.15, metalness: 0.5 });
  const finGeo = new THREE.BoxGeometry(0.45, KK_H - 3, 1.6);
  const finPos = [];
  const glassOut = offset(KK, 0.3), finOut = offset(KK, 2.2);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xa4513a, roughness: 0.9 });
  const granite = new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 0.8 });
  const mid = Math.floor((KK_FRONT[0] + KK_FRONT[1]) / 2);
  const along = (a, b) => -Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (let i = KK_FRONT[0]; i < KK_FRONT[1]; i++) {
    const [a, b] = [glassOut[i], glassOut[i + 1]];
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]), KK_H - 0.5), kkGlass);
    gl.material.side = THREE.DoubleSide;
    gl.position.set((a[0] + b[0]) / 2, CITY_Y + 0.2 + (KK_H - 0.5) / 2, (a[1] + b[1]) / 2);
    gl.rotation.y = along(a, b);
    put(gl, 'high');
    const [c, d] = [finOut[i], finOut[i + 1]];
    const n = Math.max(1, Math.round(Math.hypot(d[0] - c[0], d[1] - c[1]) / 2.4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      finPos.push([c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, along(c, d)]);
    }
  }
  // the white band across the fins above the ground floor
  const bandOut = offset(KK, 1.6);
  for (let i = KK_FRONT[0]; i < KK_FRONT[1]; i++) {
    const [c, d] = [bandOut[i], bandOut[i + 1]];
    const band = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(d[0] - c[0], d[1] - c[1]) + 0.6, 1.3, 2.6), white);
    band.position.set((c[0] + d[0]) / 2, CITY_Y + 7.4, (c[1] + d[1]) / 2);
    band.rotation.y = along(c, d);
    put(band, 'high');
  }
  const fins = new THREE.InstancedMesh(finGeo, white, finPos.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  finPos.forEach(([x, z, ry], k) => {
    q.setFromAxisAngle(up, ry);
    mtx.compose(new THREE.Vector3(x, CITY_Y + 3 + (KK_H - 3) / 2, z), q, new THREE.Vector3(1, 1, 1));
    fins.setMatrixAt(k, mtx);
  });
  put(fins, 'high');
  const podIn = offset(KK, 0.2), outer = offset(KK, PODIUM_W);
  const podium = [];
  for (let i = KK_FRONT[0]; i <= KK_FRONT[1]; i++) podium.push(podIn[i]);
  for (let i = KK_FRONT[1]; i >= KK_FRONT[0]; i--) podium.push(outer[i]);
  put(extrudeFootprint(podium, [], PODIUM_H, [granite, plinthMat]), 'high');
  {
    // steps down from the podium in front of the entrance, then the canopy
    // on round white columns
    const [a, b] = [outer[mid], outer[mid + 1]], ry = along(a, b);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const beyond = offset(KK, PODIUM_W + 3);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    let dx = (beyond[mid][0] + beyond[mid + 1][0]) / 2 - cx, dz = (beyond[mid][1] + beyond[mid + 1][1]) / 2 - cz;
    const dl = Math.hypot(dx, dz);
    dx /= dl;
    dz /= dl;
    const n = 6;
    for (let k = 0; k < n; k++) {
      const h = (PODIUM_H * (n - k)) / n;
      const step = new THREE.Mesh(new THREE.BoxGeometry(len * 0.6, h, 0.5), granite);
      step.position.set(cx + dx * (0.25 + k * 0.5), CITY_Y + h / 2, cz + dz * (0.25 + k * 0.5));
      step.rotation.y = ry;
      put(step, 'med');
    }
    const [c, d] = [KK[mid], KK[mid + 1]];
    const sign = canvasTex(1024, 64, (c, w, h) => {
      c.fillStyle = '#f1f1ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#7a2e1f';
      c.font = 'bold 40px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('KENNETH KAUNDA WING', w / 2, h / 2 + 2);
    }, { repeat: false });
    const signMat = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(len * 0.75, 1.4, PODIUM_W + 5), [white, white, white, white, signMat, signMat]);
    canopy.position.set((a[0] + b[0] + c[0] + d[0]) / 4, CITY_Y + 9, (a[1] + b[1] + c[1] + d[1]) / 4);
    canopy.rotation.y = ry;
    put(canopy, 'high');
    const colGeo = new THREE.CylinderGeometry(0.45, 0.45, 9 - PODIUM_H, 16);
    for (let k = 0; k < 6; k++) {
      const t = 0.18 + (k / 5) * 0.64;
      const col = new THREE.Mesh(colGeo, white);
      col.position.set(a[0] + (b[0] - a[0]) * t, CITY_Y + PODIUM_H + (9 - PODIUM_H) / 2, a[1] + (b[1] - a[1]) * t);
      put(col, 'high');
    }
  }
  // slender white columns under the roof frame at both ends
  const endColGeo = new THREE.CylinderGeometry(0.3, 0.3, KK_H, 12);
  const colLine = offset(KK, 3.1);
  for (const [i, j] of [[KK.length - 1, 0], [KK_FRONT[1], KK_FRONT[1] + 1]]) {
    const [a, b] = [colLine[i], colLine[j]];
    const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
    for (let k = 0; k <= n; k++) {
      const col = new THREE.Mesh(endColGeo, white);
      col.position.set(a[0] + ((b[0] - a[0]) * k) / n, CITY_Y + KK_H / 2, a[1] + ((b[1] - a[1]) * k) / n);
      put(col, 'high');
    }
  }

  const yard = buildYard(outer);
  group.add(yard.group);

  const flat = (pts) => pts.flat();
  return {
    group,
    footprints: [flat(OLD), flat(EAST), flat(KK), flat(podium), ...yard.footprints],
    setNight(n) {
      glassMat.emissiveIntensity = n * 0.8;
      screenMat.emissiveIntensity = n * 0.5;
      glassWall.material.emissiveIntensity = n * 0.4;
      kkGlass.emissiveIntensity = n * 0.6;
      clay.emissiveIntensity = n * 0.5;
      kkClay.emissiveIntensity = n * 0.5;
      kkGround.emissiveIntensity = n * 0.8;
      yard.setNight(n);
    },
  };
}
