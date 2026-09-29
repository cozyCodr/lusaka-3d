// Indo Zambia Bank head office, corner of Great East Road and Addis Ababa
// Drive, Rhodespark. A long building along Great East Road, stepping in
// height. From the north-east (the Addis Ababa Drive junction): a narrow
// tall corner block, a white edge with the IZB logo and a tan terracotta face
// with slot windows (its end wall is white, split by a diagonal terracotta
// field); terraced floors of white slabs with hedges on their edges under a
// slatted pergola; a tower of pale blue panels between columns of dark and
// maroon glazing, with a projecting white INDO ZAMBIA BANK band; the widest
// part, a two-storey glass box in a thick white frame with a hedge on top,
// under two cantilevered white trays of dark glazing; and a white tower with
// the IZB logo behind a dark canopy on white columns at the entrance.
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
// Seen from the road, north-east is on the left: the photos read right to
// left. u ranges, measured off the founder's street elevation (~66 m).
const ENTRY = [0, 13], GLASS = [13, 40], TOWER = [40, 51.5], TERRACE = [51.5, 59], CORNER = [59, 66];

// ---------- textures (whole faces, UV 0..1; canvas y down; for a front
// (-z) face the canvas left is the north-east end) ----------
const WHITE = '#f2f1ec', TERRA = '#cf8c5a', BLUE = '#a8cfe0';

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
  g.fillStyle = '#2a2f36';
  for (let r = 0; r < rows; r++) {
    const y = y0 + ((y1 - y0) * (r + 0.4)) / rows;
    for (let x = x0 + 8; x + w < x1; x += w * 1.7) g.fillRect(x, y, w, ((y1 - y0) / rows) * 0.22);
  }
}
const cornerFront = () => canvasTex(128, 512, (g, w, h) => {
  g.fillStyle = TERRA;
  g.fillRect(0, 0, w, h);
  g.fillStyle = WHITE; // the white edge at the north-east corner
  g.fillRect(0, 0, w * 0.26, h);
  slots(g, w * 0.3, w, h * 0.05, h, 8, 30);
  g.save();
  g.translate(w * 0.13, h * 0.03);
  izbLogo(g, -12, 0, 13);
  g.restore();
}, { repeat: false });
const cornerEnd = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  g.fillStyle = TERRA;
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
  // pale blue panels between five columns of dark frames with maroon panes
  g.fillStyle = BLUE;
  g.fillRect(0, 0, w, h);
  const r = rng(8);
  for (let c = 0; c < 5; c++) {
    const x = 10 + c * 50;
    g.fillStyle = '#39414c';
    g.fillRect(x + 4, 0, 20, h);
    for (let y = 4; y < h; y += 22) {
      g.fillStyle = r() < 0.4 ? '#7b2c3c' : r() < 0.5 ? '#5d3552' : '#2b3340';
      g.fillRect(x + 6, y, 16, 17);
    }
  }
}, { repeat: false });
const curtain = (cols, rows, tint = '#1d2632') => canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = tint;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#5d6772';
  for (let c = 0; c <= cols; c++) g.fillRect((c * w) / cols - 1.5, 0, 3, h);
  for (let r = 0; r <= rows; r++) g.fillRect(0, (r * h) / rows - 1.5, w, 3);
}, { repeat: false });
const entryFront = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  izbLogo(g, w * 0.5, h * 0.03, 34);
  g.fillStyle = '#2a3440'; // glazed ground floor behind the canopy
  g.fillRect(w * 0.1, h * 0.8, w * 0.8, h * 0.2);
}, { repeat: false });
const officeSide = () => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a3440';
  g.fillRect(12, 30, w - 24, 60);
});

export function buildIndoZambiaBank() {
  const group = new THREE.Group();
  group.name = 'indo-zambia-bank';
  group.position.set(ORIGIN.x, CITY_Y, ORIGIN.z);
  group.rotation.y = ANGLE;
  const put = (m, conf, o) => group.add(tag(m, conf, o));
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.6 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.9 });
  const hedge = new THREE.MeshStandardMaterial({ color: 0x4e7d2c, roughness: 1, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x33373d, roughness: 0.5, metalness: 0.4 });
  const glows = [];
  const glow = (tex, o) => {
    const m = glowing(tex, { roughness: 0.2, metalness: 0.4, ...o });
    glows.push(m);
    return m;
  };
  // box over u0..u1, v0..v1, y0..y1; materials [+x, -x, top, bottom, +z, -z(front)]
  const box = (u0, u1, v0, v1, y0, y1, mats) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mats);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return m;
  };
  const front = (mat, rest = white) => [rest, rest, roof, roof, rest, mat];
  const hedgeOn = (u0, u1, v, y) => put(box(u0 + 0.2, u1 - 0.2, v, v + 0.7, y, y + 0.55, hedge), 'high');

  // the body behind, with office windows
  const side = officeSide();
  side.repeat.set(12, 6);
  const body = new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 });
  put(box(2, L - 2, 12, D, 0, 20, [body, body, roof, roof, body, body]), 'med');

  // north-east corner block: the tallest part
  const cH = 25.5;
  put(box(CORNER[0], CORNER[1], 0, 20, 0, cH, [new THREE.MeshStandardMaterial({ map: cornerEnd(), roughness: 0.7 }), white, roof, roof, white, new THREE.MeshStandardMaterial({ map: cornerFront(), roughness: 0.7 })]), 'high');

  // terraced floors: recessed glazing, white slabs with hedges, pergola on top
  const tH = 6 * FLOOR;
  put(box(TERRACE[0], TERRACE[1], 2.2, 12, 0, tH, front(glow(curtain(4, 6)))), 'high');
  for (let f = 1; f <= 6; f++) {
    const y = f * FLOOR;
    put(box(TERRACE[0], TERRACE[1], 0, 2.4, y - 0.5, y, white), 'high');
    hedgeOn(TERRACE[0], TERRACE[1], 0.1, y);
  }
  for (let u = TERRACE[0] + 0.4; u < TERRACE[1]; u += 0.9) put(box(u, u + 0.2, 1, 11, tH + 2.2, tH + 2.5, dark), 'med'); // pergola slats
  put(box(TERRACE[0], TERRACE[0] + 0.3, 1, 11, tH, tH + 2.5, dark), 'med');

  // tower: pale blue panels and window columns, projecting name band
  const twH = 23;
  put(box(TOWER[0], TOWER[1], 0, 14, 0, twH, front(glow(towerFront()))), 'high');
  const band = canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = WHITE;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a2433';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('INDO ZAMBIA BANK', w / 2, h / 2 + 2);
  }, { repeat: false });
  put(box(TOWER[0] + 0.5, TOWER[1] + 0.5, -1.2, 3, twH - 3.2, twH - 1, front(new THREE.MeshStandardMaterial({ map: band, roughness: 0.6 }))), 'high');
  put(box(TOWER[0], TOWER[1], 0, 14, twH, twH + 0.8, white), 'high');
  put(box(TOWER[0] - 0.6, TOWER[0], -0.6, 14, 0, twH + 0.8, white), 'high'); // white fin on its south-west edge

  // the glass block: a two-storey glass box in a thick white frame with a
  // hedge on top, and two cantilevered white trays of dark glazing above
  const [g0, g1] = GLASS;
  put(box(g0 + 1.2, g1 - 1.2, 1.2, 16, 0, 10, front(glow(curtain(10, 3, '#222c3d')))), 'high');
  put(box(g0, g0 + 1.2, 0, 16, 0, 11.2, white), 'high');
  put(box(g1 - 1.2, g1, 0, 16, 0, 11.2, white), 'high');
  put(box(g0, g1, 0, 16, 10, 11.2, white), 'high');
  hedgeOn(g0 + 1, g1 - 1, 0.2, 11.2);
  const tray = (y0, y1, over, u0) => {
    put(box(u0, g1, 2.5, 16, y0, y1, front(glow(curtain(9, 1)))), 'high');
    put(box(u0 - 0.6, g1 + 0.3, 2.5 - over, 16, y1, y1 + 0.9, white), 'high'); // slab over
    put(box(u0 - 0.6, u0, 2.5 - over, 16, y0, y1, white), 'high'); // end cheek
  };
  put(box(g0 + 4, g1, 1.5, 16, 11.2, 12.2, white), 'high');
  tray(12.2, 16, 1.2, g0 + 4.6);
  tray(16.9, 20.6, 2.2, g0 + 6);
  put(box(g0 + 3, g1, 4, 16, 11.2, 23, white), 'high'); // white volume behind the trays

  // south-west entrance tower with the IZB logo, dark canopy on white columns
  const eH = 24;
  put(box(ENTRY[0], ENTRY[1], 1.5, 18, 0, eH, front(glow(entryFront(), { roughness: 0.6, metalness: 0 }))), 'high');
  put(box(ENTRY[0] - 0.5, ENTRY[1] - 1, -7, 3, 5.6, 6.2, dark), 'high');
  const col = new THREE.CylinderGeometry(0.45, 0.45, 5.6, 16);
  for (const u of [1.5, 6, 10.5]) {
    const c = new THREE.Mesh(col, white);
    c.position.set(u, 2.8, -6);
    put(c, 'high');
  }
  put(box(-16, ENTRY[1] + 2, -4, D, 0, 0.1, new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.95 })), 'med', { cast: false });

  // solar panels on the roofs (from the aerial)
  const panel = new THREE.MeshStandardMaterial({ color: 0x1c2a44, roughness: 0.3, metalness: 0.5 });
  put(box(3, 11, 4, 16, eH + 0.2, eH + 0.5, panel), 'med', { cast: false });
  put(box(16, 48, 14, 24, 20.2, 20.5, panel), 'med', { cast: false });

  // along the road: grass verge, a dark boundary wall behind a black railing,
  // small fan palms, solar street lights
  put(box(-2, L + 4, -9, 0, 0, 0.12, new THREE.MeshStandardMaterial({ color: 0x5f8f38, roughness: 1 })), 'med', { cast: false });
  put(box(-2, 40, -7.6, -7.2, 0, 1.9, new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.9 })), 'high');
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
