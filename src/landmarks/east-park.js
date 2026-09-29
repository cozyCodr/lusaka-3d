// East Park Mall, Great East Road at Thabo Mbeki Road. A long single-level
// mall of sand-coloured render on a south-west to north-east diagonal, with
// car parks on both long sides; newer charcoal retail strips to the south;
// Builders Warehouse to the north-east.
// - Faces onto the car parks: shopfronts under a covered walkway of steel
//   columns and a grey steel canopy; entrances marked by stone-clad pillars
//   under angled steel canopies.
// - West end, on Thabo Mbeki Road: a dark two-storey facade crowded with shop
//   signs, SHOPRITE in big red letters on top, the Galaxy Casino sign box,
//   a wood-slatted band at the ground floor, grass and grey bollards.
// - The Keg: a round drum with a band of horizontal louvres in the notch on
//   the north-west side, a stone tower beside it, and a paved court with a
//   fountain, tensile shade tents and potted cacti.
// - South strips: charcoal and grey boxes with flat canopies (Micmar, Sikale).
// - Amphitheatre: a stage under a curved roof over a paved lawn.
// Placement from Google Maps places (2026) and Esri imagery; forms from the
// founder's photos. Sources: docs/landmarks/east-park.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';
import { canvasTex, extrudeFootprint, glowing } from './lib.js';
import { buildParking, edges, inside, onEdge } from './yard.js';

// OSM outlines (world metres).
const MALL = [[1233, -104], [1236, -110], [1236, -117], [1233, -123], [1227, -127], [1221, -128], [1215, -126], [1212, -124],
  [1211, -127], [1223, -130], [1225, -147], [1202, -166], [1196, -168], [1192, -166], [1152, -122], [1198, -83], [1288, -12],
  [1294, -20], [1307, -10], [1420, -156], [1428, -149], [1418, -137], [1424, -132], [1351, -44], [1394, -9], [1467, -99],
  [1482, -105], [1522, -153], [1559, -195], [1556, -198], [1607, -262], [1563, -298], [1511, -236], [1515, -213],
  [1497, -192], [1493, -195], [1489, -190], [1473, -203], [1436, -159], [1428, -166], [1490, -238], [1458, -263],
  [1471, -280], [1408, -331], [1393, -311], [1422, -289], [1351, -201], [1344, -192], [1348, -178], [1284, -93],
  [1271, -104], [1260, -105], [1256, -103], [1231, -73], [1214, -87]];
const BUILDERS = [[1586, -385], [1563, -399], [1512, -389], [1506, -382], [1515, -374], [1462, -308], [1516, -267],
  [1584, -353], [1570, -365]];
const STRIP_W = [[1396, 78], [1462, 139], [1462, 150], [1487, 173], [1499, 172], [1540, 208], [1542, 213], [1527, 231],
  [1387, 104], [1391, 99], [1379, 86], [1387, 78]];
const STRIP_E = [[1461, -7], [1428, 31], [1426, 38], [1495, 103], [1506, 102], [1532, 125], [1532, 136], [1573, 171],
  [1598, 190], [1617, 169], [1463, 42], [1486, 16]];
// Car parks the shopfronts face (OSM ways 681628960, 802797491, 802797484).
const PARKS = [
  [[1283, -99], [1190, -177], [1295, -305], [1327, -370], [1551, -406], [1552, -397], [1504, -388], [1502, -381], [1511, -373],
    [1453, -300], [1409, -334], [1383, -300], [1409, -278], [1341, -191], [1324, -204], [1310, -188], [1331, -170], [1324, -149]],
  [[1394, -1], [1470, -92], [1512, -135], [1568, -199], [1566, -205], [1686, -355], [1734, -318], [1736, -297], [1550, -66],
    [1537, -62], [1503, -88], [1488, -88], [1476, -80], [1405, 7]],
  [[1471, -18], [1462, -26], [1387, 60], [1553, 203], [1579, 174], [1421, 39]],
];
const H = 11, STRIP_H = 8.5, BUILDERS_H = 10, CANOPY_Y = 4.6, CANOPY_D = 4;
const CASINO = [[1152, -122], [1198, -83]]; // the west facade on Thabo Mbeki Road
const KEG = { x: 1224, z: -115, r: 12 }; // the round drum at the notch (OSM arc)
const AMPHI = { x: 1632, z: -205, face: -2.2 }; // stage on the east lawn (low confidence)

// ---------- helpers ----------
// ---------- textures ----------
const shopfronts = (h = H, wall = '#d9c8a6') => {
  // one tile covers 64 m of frontage
  const t = canvasTex(1024, 256, (g, w, hh) => {
    const y = (m) => hh - (m / h) * hh;
    g.fillStyle = wall;
    g.fillRect(0, 0, w, hh);
    g.fillStyle = '#24313d';
    g.fillRect(0, y(CANOPY_Y - 0.2), w, y(0.2) - y(CANOPY_Y - 0.2));
    g.fillStyle = '#b9bec2';
    for (let x = 0; x < w; x += 64) g.fillRect(x, y(CANOPY_Y), 6, y(0) - y(CANOPY_Y));
    g.fillRect(0, y(2.6), w, 3);
    const r = rng(7);
    const cols = ['#c8102e', '#1d3f8f', '#f2f2f2', '#111', '#e87722', '#0a7d3b', '#7a1f5c', '#f2c200'];
    for (let x = 8; x < w - 40; x += 64) {
      if (r() < 0.3) continue;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      const sw = 30 + r() * 26;
      g.fillRect(x + 6, y(CANOPY_Y + 1.6 + r() * 0.8), sw, y(CANOPY_Y + 0.6) - y(CANOPY_Y + 1.8));
    }
  });
  t.repeat.set(1, 1);
  return t;
};
const stoneTex = () => {
  const t = canvasTex(64, 128, (g, w, h) => {
  const r = rng(3);
  for (let y = 0; y < h; y += 10) {
    for (let x = (y / 10) % 2 ? -12 : 0; x < w; x += 24) {
      const v = 70 + Math.floor(r() * 60), warm = r() < 0.3 ? 30 : 0;
      g.fillStyle = `rgb(${v + warm},${v + warm * 0.5},${v - 5})`;
      g.fillRect(x, y, 23, 9);
    }
  }
  });
  t.repeat.set(1.5, 6); // ~0.3 m stones on a 2-3 m pillar
  return t;
};
const word = (text, fg, bg, font = 'bold 120px sans-serif', w = 1024, h = 192) => canvasTex(w, h, (g) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 6);
}, { repeat: false });
// The west facade: dark panels hung with shop signs over a slatted band.
const casinoTex = () => canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#4a4543';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#3a3634';
  for (let x = 0; x < w; x += 96) g.fillRect(x, 0, 10, h);
  g.fillStyle = '#6b4a32'; // wood-slatted band
  g.fillRect(0, h * 0.55, w, h * 0.12);
  g.fillStyle = '#5a3e2a';
  for (let y = h * 0.55; y < h * 0.67; y += 5) g.fillRect(0, y, w, 1.5);
  g.fillStyle = '#26313b'; // glazed ground floor
  for (let x = 40; x < w - 40; x += 120) g.fillRect(x, h * 0.7, 90, h * 0.3);
  const r = rng(11);
  const signs = [['#e8e6e1', '#c8102e'], ['#c8102e', '#f2c200'], ['#f2f2f2', '#1d3f8f'], ['#111', '#e6e6e6'], ['#f2f2f2', '#b3242c'], ['#1f2a44', '#eee']];
  for (let x = 120; x < w - 60; x += 70) {
    for (const y of [0.08, 0.2, 0.32]) {
      if (r() < 0.25) continue;
      const [bg, fg] = signs[Math.floor(r() * signs.length)];
      g.fillStyle = bg;
      g.fillRect(x, h * y, 58, h * 0.09);
      g.fillStyle = fg;
      g.fillRect(x + 8, h * y + 8, 42, h * 0.09 - 16);
    }
  }
  g.fillStyle = '#c8102e'; // HUNGRY LION
  g.fillRect(w * 0.3, h * 0.42, w * 0.22, h * 0.1);
  g.fillStyle = '#f2c200';
  g.font = 'bold 20px sans-serif';
  g.fillText('HUNGRY LION', w * 0.33, h * 0.49);
  g.fillStyle = '#f4efe6';
  g.font = 'bold 24px sans-serif';
  g.fillText('DOĞTAŞ exclusive', w * 0.35, h * 0.63);
});

export function buildEastPark() {
  const group = new THREE.Group();
  group.name = 'east-park';
  group.position.y = CITY_Y; // everything below is built from y = 0
  const put = (m, conf, o) => group.add(tag(m, conf, o));
  const sand = new THREE.MeshStandardMaterial({ color: 0xd9c8a6, roughness: 0.85 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xb3ada2, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3c4147, roughness: 0.5, metalness: 0.5 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x6d7278, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 });
  const glows = [];

  // ---------- buildings on their OSM outlines ----------
  put(extrudeFootprint(MALL, [], H, [roof, sand], 0), 'high');
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x8e9194, roughness: 0.8 });
  put(extrudeFootprint(STRIP_W, [], STRIP_H, [roof, charcoal], 0), 'high');
  put(extrudeFootprint(STRIP_E, [], STRIP_H, [roof, charcoal], 0), 'high');
  put(extrudeFootprint(BUILDERS, [], BUILDERS_H, [roof, new THREE.MeshStandardMaterial({ color: 0xc9c9c4, roughness: 0.85 })], 0), 'high');

  // ---------- shopfronts, covered walkways and entrances on every face
  // that looks onto a car park ----------
  const faces = [];
  for (const [pts, h, wall] of [[MALL, H, '#d9c8a6'], [STRIP_W, STRIP_H, '#8e9194'], [STRIP_E, STRIP_H, '#8e9194']]) {
    for (const e of edges(pts)) {
      if (e.len < 8) continue;
      // faces a car park if one lies within ~40 m straight out from it
      const hit = [8, 16, 26, 40].some((d) => [0.25, 0.5, 0.75].some((t) => {
        const x = e.a[0] + e.ux * e.len * t + e.nx * d, z = e.a[1] + e.uz * e.len * t + e.nz * d;
        return PARKS.some((p) => inside(p, x, z)) && !inside(pts, x, z);
      }));
      if (hit && !(pts === MALL && Math.hypot(e.a[0] - CASINO[0][0], e.a[1] - CASINO[0][1]) < 1)) faces.push({ e, h, wall });
    }
  }
  const matFor = new Map();
  const colPts = [];
  let entry = 0;
  for (const { e, h, wall } of faces) {
    if (!matFor.has(wall + h)) {
      const m = glowing(shopfronts(h, wall), { roughness: 0.75 });
      glows.push(m);
      matFor.set(wall + h, m);
    }
    const tex = matFor.get(wall + h);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(e.len, h), tex.clone());
    plane.material.map = tex.map.clone();
    plane.material.map.repeat.set(e.len / 64, 1);
    plane.material.map.needsUpdate = true;
    plane.material.emissiveMap = tex.emissiveMap.clone();
    plane.material.emissiveMap.repeat.set(e.len / 64, 1);
    plane.material.emissiveMap.needsUpdate = true;
    glows.push(plane.material);
    put(onEdge(e, plane, 0.5, 0.08, h / 2), 'med', { cast: false });
    // canopy on steel columns
    put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(e.len, 0.25, CANOPY_D), canopyMat), 0.5, CANOPY_D / 2, CANOPY_Y), 'high');
    for (let d = 3; d < e.len - 1; d += 6) colPts.push([e.a[0] + e.ux * d + e.nx * (CANOPY_D - 0.3), e.a[1] + e.uz * d + e.nz * (CANOPY_D - 0.3)]);
    // an entrance on each long face: stone pillar and an angled canopy
    if (e.len > 34) {
      entry++;
      const t = 0.5;
      put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(2.2, h + 3.5, 2.2), stone), t - 5 / e.len, 1.4, (h + 3.5) / 2), 'med');
      put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(2.2, h + 3.5, 2.2), stone), t + 5 / e.len, 1.4, (h + 3.5) / 2), 'med');
      const c = onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 9), steel), t, 4, h - 1.5);
      c.rotateX(0.12);
      put(c, 'med');
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ map: word(String(entry), '#ffffff', '#4a4a48', 'bold 150px sans-serif', 192, 192) }));
      put(onEdge(e, num, t - 5 / e.len, 2.52, h + 1.5), 'low', { cast: false });
    }
  }
  const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, CANOPY_Y, 8), steel, colPts.length);
  const m4 = new THREE.Matrix4();
  colPts.forEach(([x, z], i) => cols.setMatrixAt(i, m4.makeTranslation(x, CANOPY_Y / 2, z)));
  put(cols, 'high');

  // ---------- the west facade on Thabo Mbeki Road ----------
  {
    const e = edges(MALL).find((k) => Math.hypot(k.a[0] - CASINO[0][0], k.a[1] - CASINO[0][1]) < 1);
    const cm = glowing(casinoTex(), { roughness: 0.7 });
    glows.push(cm);
    put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(e.len, H + 2, 0.6), [cm, cm, roof, roof, cm, cm]), 0.5, 0.3, (H + 2) / 2), 'high');
    const shoprite = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.4), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 144, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#d0121b';
      g.font = 'bold 130px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SHOPRITE', w / 2, h / 2 + 8);
    }, { repeat: false }), transparent: true }));
    put(onEdge(e, shoprite, 0.55, 0.7, H + 3.8), 'high', { cast: false });
    const casino = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(128, 176, (g, w, h) => {
      g.fillStyle = '#f4f0e8';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8102e';
      g.lineWidth = 8;
      g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#e8a317';
      g.beginPath();
      g.arc(w / 2, 58, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c8102e';
      g.font = 'bold 20px sans-serif';
      g.textAlign = 'center';
      g.fillText('GALAXY', w / 2, 130);
      g.fillText('CASINO', w / 2, 154);
    }, { repeat: false }) }));
    put(onEdge(e, casino, 0.08, 0.9, H - 2), 'high');
    // grass and a row of grey bollards along the facade
    put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(e.len, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x5d8f38, roughness: 1 })), 0.5, 3, 0.05), 'med', { cast: false });
    const bol = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 10), new THREE.MeshStandardMaterial({ color: 0x5f6265, roughness: 0.6 }), Math.floor(e.len / 1.8));
    for (let i = 0; i < bol.count; i++) {
      const d = 0.9 + i * 1.8;
      bol.setMatrixAt(i, m4.makeTranslation(e.a[0] + e.ux * d + e.nx * 5.4, 0.5, e.a[1] + e.uz * d + e.nz * 5.4));
    }
    put(bol, 'med');
  }

  // ---------- the Keg: louvred drum, stone tower, court ----------
  {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(KEG.r, KEG.r, H + 1.5, 40), sand);
    drum.position.set(KEG.x, (H + 1.5) / 2, KEG.z);
    put(drum, 'high');
    const louvres = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#c9ccd0';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#8b9096';
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
    });
    louvres.repeat.set(8, 1);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(KEG.r + 1.6, KEG.r + 1.6, 2.6, 48, 1, true), new THREE.MeshStandardMaterial({ map: louvres, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
    band.position.set(KEG.x, 6.2, KEG.z);
    put(band, 'high');
    const glassTex = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#2a3642';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#9ba3aa';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h);
    });
    glassTex.repeat.set(6, 1);
    const kegGlass = glowing(glassTex, { roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide });
    glows.push(kegGlass);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(KEG.r + 0.8, KEG.r + 0.8, 4.8, 48, 1, true), kegGlass);
    glass.position.set(KEG.x, 2.4, KEG.z);
    put(glass, 'high');
    const kegSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), new THREE.MeshStandardMaterial({ map: word('KEG', '#ffffff', '#b3242c', 'bold 150px serif', 512, 144) }));
    kegSign.position.set(KEG.x + (KEG.r + 1.7) * 0.66, 6.2, KEG.z - (KEG.r + 1.7) * 0.75);
    kegSign.lookAt(KEG.x + 50 * 0.66, 6.2, KEG.z - 50 * 0.75);
    put(kegSign, 'high', { cast: false });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.5, H + 4, 3.5), stone);
    tower.position.set(KEG.x - 13, (H + 4) / 2, KEG.z - 14);
    put(tower, 'med');
    // the court towards the car park: paving, fountain, tents, cacti
    const cx = KEG.x + 20, cz = KEG.z - 18;
    const pave = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xcdb99a, roughness: 0.9 }));
    pave.position.set(cx, 0.06, cz);
    pave.rotation.y = -0.7;
    put(pave, 'med', { cast: false });
    const basin = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 2.4), new THREE.MeshStandardMaterial({ color: 0xd7c7a8, roughness: 0.8 }));
    basin.position.set(cx - 3, 0.3, cz + 3);
    basin.rotation.y = -0.7;
    const water = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x5fa9c9, roughness: 0.1 }));
    water.position.set(cx - 3, 0.62, cz + 3);
    water.rotation.y = -0.7;
    put(basin, 'med');
    put(water, 'med');
    const tent = new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
    for (const [dx, dz] of [[4, -4], [9, 1], [0, -9]]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.4, 4, 1, true), tent);
      t.position.set(cx + dx, 4.2, cz + dz);
      t.rotation.y = Math.PI / 4 - 0.7;
      put(t, 'med');
      for (const [px, pz] of [[-2.8, -2.8], [2.8, -2.8], [2.8, 2.8], [-2.8, 2.8]]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), steel);
        p.position.set(cx + dx + px, 1.5, cz + dz + pz);
        put(p, 'low');
      }
    }
    const pot = new THREE.MeshStandardMaterial({ color: 0x6b6f73, roughness: 0.7 });
    const cactus = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.9 });
    const r = rng(19);
    for (let k = 0; k < 6; k++) {
      const x = cx - 8 + k * 3.2, z = cz - 6 + r() * 2;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.8, 12), pot);
      p.position.set(x, 0.4, z);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8 + r(), 8), cactus);
      c.position.set(x, 1.7, z);
      put(p, 'low');
      put(c, 'low');
    }
  }

  // ---------- signs on the south-east side and the Shoprite Select wing ----------
  const edgeNear = (pts, x, z) => edges(pts).reduce((best, e) => {
    const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2, d = Math.hypot(mx - x, mz - z);
    return !best || d < best.d ? { e, d } : best;
  }, null).e;
  const signOn = (e, text, fg, bg, t, y, w) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.19), new THREE.MeshStandardMaterial({ map: word(text, fg, bg), roughness: 0.6 }));
    put(onEdge(e, m, t, 0.2, y), 'high', { cast: false });
  };
  const se = edgeNear(MALL, 1318, -45);
  signOn(se, 'Pick n Pay', '#ffffff', '#c8102e', 0.35, 8.5, 7);
  signOn(se, 'EDGARS', '#1a1a1a', '#f4f1ea', 0.7, 8.5, 7);
  {
    const e = edgeNear(MALL, 1585, -230);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.4, H + 5, 3.4), stone);
    put(onEdge(e, pillar, 0.3, 6, (H + 5) / 2), 'high');
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), new THREE.MeshStandardMaterial({ map: canvasTex(128, 152, (g, w, h) => {
      g.fillStyle = '#d0121b';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      g.fillRect(12, 12, w - 24, h - 58);
      g.fillStyle = '#d0121b';
      g.font = 'bold 60px serif';
      g.textAlign = 'center';
      g.fillText('S', w / 2, 72);
      g.fillStyle = '#ffffff';
      g.font = 'bold 18px sans-serif';
      g.fillText('SHOPRITE', w / 2, 130);
    }, { repeat: false }) }));
    put(onEdge(e, s, 0.3, 7.72, H + 1.5), 'high', { cast: false });
  }
  signOn(edgeNear(STRIP_E, 1440, 20), 'MICMAR', '#1d3f8f', '#f4f4f4', 0.5, 6.6, 8);
  signOn(edgeNear(STRIP_W, 1392, 90), 'SIKALE', '#ffffff', '#8a2a24', 0.5, 6.6, 8);
  signOn(edgeNear(BUILDERS, 1490, -340), 'BUILDERS', '#1a1a1a', '#f2c200', 0.5, 7.5, 12);

  // ---------- amphitheatre on the east lawn ----------
  {
    const a = new THREE.Group();
    a.position.set(AMPHI.x, 0, AMPHI.z);
    a.rotation.y = AMPHI.face;
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb8b1a4, roughness: 0.9 });
    const stage = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 10), concrete);
    stage.position.y = 0.6;
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 0.6), new THREE.MeshStandardMaterial({ color: 0x9c8f7c, roughness: 0.9 }));
    back.position.set(0, 4, -5);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 1.4, 48, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x55595e, roughness: 0.6, metalness: 0.3 }));
    shell.scale.set(0.9, 1, 0.55);
    shell.position.set(0, 9, -1);
    a.add(stage, back, shell);
    for (const x of [-7, 7]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 8), steel);
      p.position.set(x, 4.8, 4);
      a.add(p);
    }
    // paved lawn: stripes of paving and grass
    const paving = new THREE.MeshStandardMaterial({ color: 0xbdb3a3, roughness: 0.9 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x6a9a3e, roughness: 1 });
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(26, 0.1, k % 2 ? 1 : 5), k % 2 ? grass : paving);
      s.position.set(0, 0.05, 8 + k * 3);
      a.add(s);
    }
    put(a, 'low');
  }

  // the car parks load their layout once the road data arrives
  const lamps = [];
  buildYard(group, lamps);

  const flat = (pts) => pts.flat();
  return {
    group,
    footprints: [flat(MALL), flat(STRIP_W), flat(STRIP_E), flat(BUILDERS)],
    setNight(n) {
      for (const m of glows) m.emissiveIntensity = n * 0.6;
      for (const m of lamps) m.emissiveIntensity = n * 2;
    },
  };
}

// ---------- the yard: car parks laid out by src/landmarks/yard.js ----------
function buildYard(group, lamps) {
  buildParking({
    group, lamps, parks: PARKS, buildings: [MALL, STRIP_W, STRIP_E, BUILDERS],
    axis: [[0.612, -0.791], [0.791, 0.612]], // along the mall, across it
    roads: new URL('../../data/landmarks/east-park-roads.json', import.meta.url),
    reserved: (x, z) => Math.hypot(x - (KEG.x + 20), z - (KEG.z - 18)) < 18 || Math.hypot(x - AMPHI.x, z - AMPHI.z) < 30,
  });
}
