// Indo Zambia Bank head office, corner of Great East Road and Addis Ababa
// Drive, Rhodespark. A long building along Great East Road. At the
// north-east (junction) end: a wedge block, terracotta with slot windows on
// the road side and white split by a diagonal terracotta field on the end
// wall, with a white wing behind it of stacked cantilevered white boxes under
// a hedge and pergola, and a tall terracotta strip with the logo at the rear
// corner. Along the road: terraced floors with hedges on their slabs, then a
// tower of pale blue panels and dark and maroon window columns under a
// projecting INDO ZAMBIA BANK band. At the south-west end a two-storey glass
// box in a thick white frame turns the corner onto the forecourt, under two
// cantilevered white trays of glazing that wrap round too; behind it the
// white entrance tower with the IZB logo, whose dark canopy on white columns
// projects over the steps and the forecourt. The main body behind is white
// with vertical window strips and solar panels on the roof.
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
const GLASS = [0, 26], TOWER = [26, 38], TERRACE = [38, 52], CORNER = [52, 66];
const ENTRY = [0, 12, 14, D]; // u0, u1, v0, v1: behind the glass box
const WEDGE_D = 12; // depth of the wedge block at the north-east front corner

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
const officeSide = () => canvasTex(128, 128, (g, w, h) => {
  // white with vertical window strips (drone photo)
  g.fillStyle = WHITE;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#26303a';
  g.fillRect(44, 0, 40, h);
  g.fillStyle = '#e6e5df';
  for (let y = 0; y < h; y += 32) g.fillRect(44, y, 40, 4);
});
const rearStrip = () => canvasTex(128, 512, (g, w, h) => {
  g.fillStyle = TERRA;
  g.fillRect(0, 0, w, h);
  slots(g, 0, w, h * 0.12, h, 8, 20);
  izbLogo(g, w * 0.18, h * 0.03, 26);
}, { repeat: false });

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
  const panel = new THREE.MeshStandardMaterial({ color: 0x1c2a44, roughness: 0.3, metalness: 0.5 });
  const glows = [];
  const glow = (tex, o) => {
    const m = glowing(tex, { roughness: 0.2, metalness: 0.4, ...o });
    glows.push(m);
    return m;
  };
  // box over u0..u1, v0..v1, y0..y1; materials [+x (NE), -x (SW), top, bottom, +z (rear), -z (front)]
  const box = (u0, u1, v0, v1, y0, y1, mats) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mats);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return m;
  };
  const front = (mat, rest = white) => [rest, rest, roof, roof, rest, mat];
  const hedgeOn = (u0, u1, v, y) => put(box(u0 + 0.2, u1 - 0.2, v, v + 0.7, y, y + 0.55, hedge), 'high');

  // main body behind: white with vertical window strips, solar panels on top
  const side = officeSide();
  side.repeat.set(14, 5);
  const body = new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 });
  put(box(ENTRY[1], CORNER[0], 13, D, 0, 19, [body, body, roof, roof, body, body]), 'med');
  put(box(ENTRY[1] + 2, CORNER[0] - 2, 15, D - 2, 19.2, 19.5, panel), 'med', { cast: false });

  // ---------- north-east end ----------
  const [c0, c1] = CORNER;
  const cH = 25.5;
  // the wedge block at the road corner
  put(box(c0, c1, 0, WEDGE_D, 0, cH, [new THREE.MeshStandardMaterial({ map: cornerEnd(), roughness: 0.7 }), white, roof, roof, white, new THREE.MeshStandardMaterial({ map: cornerFront(), roughness: 0.7 })]), 'high');
  // the white wing behind it, with cantilevered white boxes on its end wall
  const wingH = 23;
  put(box(c0, c1 - 2, WEDGE_D, D - 4, 0, wingH, front(white, white)), 'high');
  const winMat = glow(curtain(4, 2, '#1f2833'));
  for (let f = 0; f < 5; f++) {
    const y0 = 3 + f * 4, off = f % 2 ? 0.6 : 0;
    put(box(c1 - 2, c1 + 0.2 + off, WEDGE_D + 1 + off, WEDGE_D + 8 + off, y0, y0 + 3.4, [winMat, white, white, white, white, white]), 'high');
  }
  hedgeOn(c0, c1 - 2, WEDGE_D + 0.2, wingH);
  for (let v = WEDGE_D + 0.6; v < D - 4.5; v += 0.9) put(box(c1 - 6, c1 - 2, v, v + 0.2, wingH + 2.2, wingH + 2.5, dark), 'med'); // pergola
  const letters = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#9a2433';
    g.font = 'bold 44px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('INDO ZAMBIA BANK', w / 2, h / 2 + 2);
  }, { repeat: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.25), new THREE.MeshStandardMaterial({ map: letters, transparent: true, roughness: 0.6 }));
  sign.position.set(c1 - 1.9, wingH + 1.2, (WEDGE_D + D - 4) / 2);
  sign.rotation.y = Math.PI / 2;
  put(sign, 'high', { cast: false });
  // the tall terracotta strip at the rear corner
  put(box(c0 + 2, c1, D - 4, D, 0, cH - 1, [new THREE.MeshStandardMaterial({ map: rearStrip(), roughness: 0.7 }), white, roof, roof, white, white]), 'high');

  // ---------- along the road ----------
  // terraced floors: recessed glazing, white slabs with hedges, pergola on top
  const [t0, t1] = TERRACE;
  const tH = 6 * FLOOR;
  put(box(t0, t1, 2.2, 13, 0, tH, front(glow(curtain(6, 6)))), 'high');
  for (let f = 1; f <= 6; f++) {
    const y = f * FLOOR;
    put(box(t0, t1, 0, 2.4, y - 0.5, y, white), 'high');
    hedgeOn(t0, t1, 0.1, y);
  }
  for (let u = t0 + 0.4; u < t1; u += 0.9) put(box(u, u + 0.2, 1, 11, tH + 2.2, tH + 2.5, dark), 'med');

  // tower: pale blue panels and window columns, projecting name band
  const [w0, w1] = TOWER;
  const twH = 23;
  put(box(w0, w1, 0, 14, 0, twH, front(glow(towerFront()))), 'high');
  const band = canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = WHITE;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a2433';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('INDO ZAMBIA BANK', w / 2, h / 2 + 2);
  }, { repeat: false });
  put(box(w0 + 0.5, w1 + 0.5, -1.2, 3, twH - 3.2, twH - 1, front(new THREE.MeshStandardMaterial({ map: band, roughness: 0.6 }))), 'high');
  put(box(w0, w1, 0, 14, twH, twH + 0.8, white), 'high');
  put(box(w0 - 0.6, w0, -0.6, 14, 0, twH + 0.8, white), 'high');

  // ---------- south-west end ----------
  // glass box turning the corner: glazed on the road and forecourt sides,
  // in a thick white frame, on a white plinth, a hedge on top
  const [g0, g1] = GLASS, GD = 14;
  const gl = glow(curtain(10, 3, '#222c3d'));
  const glSide = glow(curtain(5, 3, '#222c3d'));
  // the two glass walls meet at the corner with no post between them
  put(box(g0 + 0.4, g1 - 1.2, 0.4, GD, 0, 0.9, white), 'high');
  put(box(g0 + 0.4, g1 - 1.2, 0.4, GD - 1, 0.9, 10, [white, glSide, roof, roof, white, gl]), 'high');
  put(box(g1 - 1.2, g1, 0, GD, 0, 11.2, white), 'high'); // pier against the tower
  put(box(g0, g1, 0, GD, 10, 11.2, white), 'high'); // top slab
  hedgeOn(g0 + 1, g1 - 1, 0.2, 11.2);
  put(box(g0 + 0.2, g0 + 0.9, 1.2, GD - 1, 11.2, 11.75, hedge), 'high');
  // two white trays of glazing above, overhanging the road and the forecourt
  const tray = (y0, y1, over, inset) => {
    const tg = glow(curtain(9, 1)), ts = glow(curtain(4, 1));
    put(box(g0 + inset, g1, 2 + inset, GD, y0, y1, [white, ts, roof, roof, white, tg]), 'high');
    put(box(g0 + inset - over, g1 + 0.3, 2 + inset - over, GD, y1, y1 + 0.9, white), 'high');
    put(box(g0 + inset - over, g1 + 0.3, 2 + inset - over, GD, y0 - 0.5, y0, white), 'high');
  };
  tray(12.2, 16, 1.2, 1.5);
  tray(16.9, 20.6, 2, 2.5);
  put(box(g0 + 4, g1, 4, GD, 11.2, 23, white), 'high'); // white volume behind the trays

  // entrance tower behind the glass box, canopy out over the forecourt
  const [e0, e1, ev0, ev1] = ENTRY;
  const eH = 24;
  const logoFace = new THREE.MeshStandardMaterial({ map: canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = WHITE; g.fillRect(0, 0, w, h); izbLogo(g, w * 0.45, h * 0.03, 34);
  }, { repeat: false }), roughness: 0.6 });
  put(box(e0, e1, ev0, ev1, 0, eH, [white, logoFace, roof, roof, white, white]), 'high');
  put(box(e0 - 9, e0 + 0.5, ev0 - 1, ev0 + 10, 5.6, 6.2, dark), 'high');
  const col = new THREE.CylinderGeometry(0.45, 0.45, 5.6 - 0.9, 16);
  for (const v of [ev0, ev0 + 4.5, ev0 + 9]) {
    const c = new THREE.Mesh(col, white);
    c.position.set(e0 - 8, 0.9 + (5.6 - 0.9) / 2, v);
    put(c, 'high');
  }
  // raised podium with steps down to the forecourt
  put(box(e0 - 9, e0, ev0 - 1, ev1 - 2, 0, 0.9, white), 'high');
  for (let k = 0; k < 5; k++) put(box(e0 - 9 - (k + 1) * 0.35, e0 - 9 - k * 0.35, ev0, ev0 + 8, 0, 0.9 - k * 0.18, white), 'med');
  // forecourt paving, gate pillars and a stone-clad wall on its south-west side
  put(box(-26, e0, -6, D, 0, 0.1, new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.95 })), 'med', { cast: false });
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a8a74, roughness: 0.95 });
  put(box(-26, -25.4, 6, D, 0, 2.4, stone), 'med');
  for (const v of [-6, 4]) put(box(-26.4, -24.6, v, v + 2, 0, 3.2, white), 'med');

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
  for (const u of [18, 50]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9, 8), steel);
    pole.position.set(u, 4.5, -10);
    const pv = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1), panel);
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
