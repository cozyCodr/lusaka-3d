// Indo Zambia Bank head office, corner of Great East Road and Addis Ababa
// Drive, Rhodespark. A long building along Great East Road, stepping in
// height. From the north-east (the Addis Ababa Drive junction): a white
// corner block with a tall terracotta panel and the IZB logo (its end wall
// facing the junction is white, split by a diagonal terracotta field);
// terraced floors whose white slab edges carry planted hedges; a teal tower
// with maroon-glazed window columns under the INDO ZAMBIA BANK fascia; a
// lower glass block framed in white with a planted slab; and a white tower at
// the south-west end over the entrance canopy.
// A black railing, grass verge, palms and solar street lights line the road.
// Sources: docs/landmarks/indo-zambia-bank.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';
import { canvasTex, glowing } from './lib.js';

// Frame: origin at the building's west corner on the road side, local +x
// along Great East Road to the north-east, +z into the site (south-east);
// the front faces -z. From the aerial (OSM way 1061966800 is a Microsoft
// footprint traced during construction).
const ORIGIN = { x: -376.5, z: 966.5 };
const ANGLE = 0.7206; // local +x = (0.752, -0.660) in world x/z
const L = 66, D = 27, FLOOR = 3.6;

// Front segments, u ranges along the road.
// Seen from the road, north-east is on the left: the photos read right to left.
const ENTRY = [0, 8], GLASS = [8, 26], TOWER = [26, 39], TERRACE = [39, 52], CORNER = [52, 66];

// ---------- textures (whole faces, UV 0..1; canvas y down) ----------
const MAROON = '#7a2638', TEAL = '#8fbcc0', WHITE = '#f2f1ec', TERRA = '#c9804f';

function izbLogo(g, x, y, s) {
  g.fillStyle = '#b3242c';
  g.font = `bold ${s}px sans-serif`;
  g.textBaseline = 'top';
  g.fillText('IZB', x, y);
  const w = g.measureText('IZB').width;
  g.fillStyle = '#f2a900';
  g.fillRect(x + w + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8);
  g.fillStyle = '#b3242c';
  g.beginPath();
  g.moveTo(x + w + s * 0.1, y + s * 0.9);
  g.lineTo(x + w + s * 0.9, y + s * 0.1);
  g.lineTo(x + w + s * 0.9, y + s * 0.5);
  g.closePath();
  g.fill();
}
function slots(g, x0, x1, y0, y1, rows, w) {
  g.fillStyle = '#26303a';
  for (let r = 0; r < rows; r++) {
    const y = y0 + ((y1 - y0) * (r + 0.35)) / rows;
    for (let x = x0 + 6; x + w < x1; x += w * 1.8) g.fillRect(x, y, w, (y1 - y0) / rows * 0.3);
  }
}
const swFront = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  g.fillStyle = TERRA; // the tall terracotta panel, with slot windows
  g.fillRect(w * 0.35, h * 0.06, w * 0.6, h * 0.94);
  slots(g, w * 0.35, w * 0.95, h * 0.1, h, 7, 34);
  izbLogo(g, w * 0.4, h * 0.015, 26);
}, { repeat: false });
const swEnd = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  g.fillStyle = TERRA; // diagonal field, lower right
  g.beginPath();
  g.moveTo(w, h * 0.05);
  g.lineTo(w, h);
  g.lineTo(w * 0.25, h);
  g.closePath();
  g.fill();
  slots(g, w * 0.3, w, h * 0.2, h, 7, 50);
  izbLogo(g, w * 0.12, h * 0.08, 46);
}, { repeat: false });
const towerFront = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = TEAL;
  g.fillRect(0, 0, w, h);
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h * 0.09);
  g.fillStyle = MAROON;
  g.font = 'bold 20px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('INDO ZAMBIA BANK', w / 2, h * 0.045);
  for (const x of [0.12, 0.42, 0.72]) {
    g.fillStyle = '#2a2f3a';
    g.fillRect(w * x, h * 0.1, w * 0.16, h * 0.9);
    for (let y = h * 0.12; y < h; y += h / 14) {
      g.fillStyle = (Math.floor(y) % 3) ? '#5b2a4a' : '#8c2a3a';
      g.fillRect(w * x + 3, y, w * 0.16 - 6, h / 14 - 5);
    }
  }
}, { repeat: false });
const glazing = (tint = '#1f2a36', cols = 6, rows = 2) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = tint;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#9aa4ad';
  for (let c = 0; c <= cols; c++) g.fillRect((c * w) / cols - 2, 0, 4, h);
  for (let r = 0; r <= rows; r++) g.fillRect(0, (r * h) / rows - 2, w, 4);
}, { repeat: false });
const neFront = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  izbLogo(g, w * 0.2, h * 0.05, 40);
}, { repeat: false });
const officeSide = () => {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = WHITE;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a3440';
    g.fillRect(12, 30, w - 24, 60);
  });
  return t;
};

export function buildIndoZambiaBank() {
  const group = new THREE.Group();
  group.name = 'indo-zambia-bank';
  group.position.set(ORIGIN.x, CITY_Y, ORIGIN.z);
  group.rotation.y = ANGLE;
  const put = (m, conf, o) => group.add(tag(m, conf, o));
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.6 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.9 });
  const hedge = new THREE.MeshStandardMaterial({ color: 0x4e7d2c, roughness: 1 });
  const glows = [];
  const glow = (tex, o) => {
    const m = glowing(tex, { roughness: 0.3, metalness: 0.3, ...o });
    glows.push(m);
    return m;
  };
  // a box between u0..u1, v0..v1, y0..y1 with per-face materials
  // [+x, -x, top, bottom, +z (back), -z (front)]
  const box = (u0, u1, v0, v1, y0, y1, mats) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mats);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return m;
  };
  const faces = (front, rest = white, top = roof) => [rest, rest, top, top, rest, front];

  // the body behind the front blocks, with office windows
  const side = officeSide();
  side.repeat.set(12, 5);
  const body = new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 });
  put(box(2, L - 2, 10, D, 0, 6 * FLOOR, [body, body, roof, roof, body, body]), 'med');

  // north-east corner block: terracotta panel, diagonal end wall facing the junction
  const swH = 7 * FLOOR + 1;
  put(box(CORNER[0], CORNER[1], 0, 22, 0, swH, [new THREE.MeshStandardMaterial({ map: swEnd(), roughness: 0.7 }), white, roof, roof, white, new THREE.MeshStandardMaterial({ map: swFront(), roughness: 0.7 })]), 'high');

  // terraced floors: recessed glazing, white slabs with hedges on their edges
  const tH = 6 * FLOOR;
  put(box(TERRACE[0], TERRACE[1], 2.5, 12, 0, tH, faces(glow(glazing('#1d2833', 5, 6)))), 'high');
  for (let f = 1; f <= 6; f++) {
    const y = f * FLOOR;
    put(box(TERRACE[0], TERRACE[1], 0, 2.6, y - 0.45, y, white), 'high');
    put(box(TERRACE[0] + 0.3, TERRACE[1] - 0.3, 0.2, 0.9, y, y + 0.6, hedge), 'high');
  }

  // teal tower with maroon window columns and the name fascia
  const towerH = 7 * FLOOR + 1.5;
  put(box(TOWER[0], TOWER[1], 0, 14, 0, towerH, faces(glow(towerFront()))), 'high');
  put(box(TOWER[0] - 0.4, TOWER[1] + 0.4, -0.3, 14, towerH, towerH + 0.6, white), 'high');

  // lower glass block: tall glazed ground floor, planted slab, two floors
  // of dark glazing set back in a white frame
  put(box(GLASS[0], GLASS[1], 1.5, 16, 0, 7.5, faces(glow(glazing('#2b3350', 8, 2)))), 'high');
  put(box(GLASS[0] - 0.4, GLASS[1] + 0.4, 0.5, 16, 7.5, 8.3, white), 'high');
  put(box(GLASS[0], GLASS[1], 0.7, 1.5, 8.3, 8.9, hedge), 'high');
  put(box(GLASS[0] + 0.5, GLASS[1] - 1.5, 3, 16, 8.3, 15.5, faces(glow(glazing('#1b2430', 7, 2)))), 'high');
  put(box(GLASS[0], GLASS[1] - 1, 2.2, 16, 15.5, 16.3, white), 'high');
  for (const u of [GLASS[0] + 0.2, GLASS[1] - 1.2]) put(box(u - 0.35, u + 0.35, 2.2, 3, 8.3, 15.5, white), 'high'); // frame

  // south-west tower over the entrance, with its dark canopy on columns
  const neH = 5 * FLOOR + 1;
  put(box(ENTRY[0], ENTRY[1], 2, 16, 0, neH, faces(new THREE.MeshStandardMaterial({ map: neFront(), roughness: 0.7 }))), 'high');
  const canopy = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.5, metalness: 0.4 });
  put(box(ENTRY[0] - 7, ENTRY[0] + 1, 0, 12, 7.2, 7.8, canopy), 'high');
  const col = new THREE.CylinderGeometry(0.4, 0.4, 7.2, 14);
  for (const v of [1.5, 10.5]) {
    const c = new THREE.Mesh(col, white);
    c.position.set(ENTRY[0] - 6, 3.6, v);
    put(c, 'high');
  }
  // paved forecourt at the entrance
  put(box(-16, ENTRY[1] + 2, -4, D, 0, 0.1, new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.95 })), 'med', { cast: false });

  // solar panels on the roofs (from the aerial)
  const panel = new THREE.MeshStandardMaterial({ color: 0x1c2a44, roughness: 0.3, metalness: 0.5 });
  put(box(CORNER[0] + 4, CORNER[1] - 2, 4, 20, swH + 0.2, swH + 0.5, panel), 'med', { cast: false });
  put(box(12, 50, 15, 25, 6 * FLOOR + 0.2, 6 * FLOOR + 0.5, panel), 'med', { cast: false });

  // along the road: grass verge, black railing, palms, solar street lights
  put(box(-2, L + 4, -9, 0, 0, 0.12, new THREE.MeshStandardMaterial({ color: 0x5f8f38, roughness: 1 })), 'med', { cast: false });
  const railTex = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#1b1c1e';
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, h - 3, w, 3);
    for (let x = 2; x < w; x += 7) g.fillRect(x, 0, 2, h);
  });
  railTex.repeat.set((L + 6) / 3, 1);
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(L + 6, 1.6), new THREE.MeshStandardMaterial({ map: railTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  rail.position.set(L / 2 + 1, 0.8, -8.5);
  put(rail, 'high', { cast: false });
  const r = rng(41);
  const trunk = new THREE.MeshStandardMaterial({ color: 0x6e5a45, roughness: 1 });
  const frond = new THREE.MeshStandardMaterial({ color: 0x4d7f2e, roughness: 1, side: THREE.DoubleSide });
  for (let u = 3; u < L; u += 7) {
    // small fan palms, as in the photos
    const p = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6), trunk);
    t.position.y = 0.8;
    p.add(t);
    for (let k = 0; k < 7; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), frond);
      f.geometry.translate(0, 0.9, 0);
      f.position.y = 1.6;
      f.rotation.set(0.8 + r() * 0.3, (k / 7) * Math.PI * 2, 0, 'YXZ');
      p.add(f);
    }
    p.position.set(u + r(), 0, -4.5);
    put(p, 'med');
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.6 });
  const solar = new THREE.MeshStandardMaterial({ color: 0x1d2a44, roughness: 0.3, metalness: 0.5 });
  for (const u of [18, 50]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9, 8), steel);
    pole.position.set(u, 4.5, -10);
    const pv = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1), solar);
    pv.position.set(u, 9.3, -10);
    pv.rotation.x = -0.35;
    put(pole, 'med');
    put(pv, 'med');
  }

  group.updateMatrixWorld(true);
  const world = (u, v) => {
    const p = group.localToWorld(new THREE.Vector3(u, 0, v));
    return [p.x, p.z];
  };
  return {
    group,
    frame: group,
    footprints: [[world(0, 0), world(L, 0), world(L, D), world(0, D)].flat()],
    setNight(n) {
      for (const m of glows) m.emissiveIntensity = n * 0.7;
    },
  };
}
