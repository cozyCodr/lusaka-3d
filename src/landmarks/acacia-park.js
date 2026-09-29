// Acacia Park, Great East Road at Thabo Mbeki Road (opposite East Park):
// a campus of two-storey office buildings in beige render around shaded car
// parks and a palm court, home to bank head offices.
// - Ecobank: a round drum with a pinwheel roof of alternating terracotta and
//   grey sheets over a ring canopy on columns, between two wings; the Aon
//   block at the west tip and an Ecobank stair tower at the east.
// - FNB head office: a long wing lettered First National Bank, the dark FNB
//   tower with its logo, a curved glazed stair, and the dark Emirates tower;
//   black shade sails over the bays in front, palms along the wall.
// - Zanaco: the long block with a curved end on the car park, a red band.
// - UBA and Access: signs on the south-east wing and its second drum.
// Forms from the founder's and Reiz Real Estate's drone photos; outlines
// from OSM (ways 674694885, 674694884, 674694882).
// Sources: docs/landmarks/acacia-park.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex, extrudeFootprint, glowing } from './lib.js';
import { buildParking, edges, onEdge } from './yard.js';

const ECO = [[978.1, -146.9], [976.3, -145.7], [961.7, -141.9], [946.6, -142.7], [964.2, -158.2], [960.4, -163.1], [958.9, -167.5],
  [958.9, -172.2], [960.5, -176.6], [963.3, -180.3], [967.2, -183.0], [971.8, -184.2], [976.5, -184.0], [980.9, -182.3], [986.2, -177.4],
  [1005.3, -194.2], [1004.3, -179.2], [998.7, -165.3], [997.6, -163.9], [1001.6, -159.9], [1005.2, -162.2], [1025.2, -139.7],
  [1048.2, -132.3], [1043.3, -112.3], [1033.8, -114.7], [1031.6, -112.0], [1029.2, -109.4], [1025.9, -106.3], [1022.3, -103.4],
  [1023.6, -95.9], [1017.9, -98.9], [1014.8, -101.0], [1012.5, -103.9], [1009.4, -106.7], [1007.8, -110.0], [1004.9, -116.0],
  [1000.9, -115.7], [978.6, -139.5], [982.2, -142.5]];
const ZAN = [[968.0, -115.8], [1006.3, -69.5], [1023.0, -78.2], [1000.5, -100.0], [992.3, -110.2], [985.7, -116.3], [981.1, -117.8],
  [980.8, -120.3], [978.2, -122.2], [975.0, -122.2], [968.0, -120.9], [966.1, -118.1]];
const FNB = [[1088.2, -103.2], [1091.9, -103.8], [1095.6, -103.2], [1099.1, -101.6], [1101.9, -99.1], [1103.8, -95.9], [1035.9, -48.7],
  [1032.9, -52.9], [1035.0, -57.5], [1035.6, -62.6], [1034.8, -67.6]];
// The paved site inside the service loop (from the aerial and OSM ways).
const SITE = [[906, -177], [933, -201], [1007, -203], [1016, -200], [1073, -130], [1097, -108], [1104, -96], [1036, -48], [1012, -65],
  [953, -123], [942, -135]];
const LAWN = [[950, -138], [975, -138], [995, -118], [985, -116], [978, -123], [966, -121], [952, -128]];
const DRUM = { x: 972.5, z: -171, r: 12.3 }; // Ecobank
const DRUM2 = { x: 1020, z: -111, r: 9 };
const H = 8.8;

const WALL = '#d8c4a3';
// Two storeys of paired windows in a 4 m bay (bottom-up; UVs in metres).
function windows(awnings = false) {
  const t = canvasTex(128, 282, (g, w, h) => {
    g.translate(0, h);
    g.scale(1, -1);
    const y = (m) => (m / H) * h;
    g.fillStyle = WALL;
    g.fillRect(0, 0, w, h);
    for (const [b, top] of [[0.9, 3.2], [4.9, 7.3]]) {
      g.fillStyle = '#1f2833';
      g.fillRect(24, y(b), 80, y(top) - y(b));
      g.fillStyle = '#6f757c';
      g.fillRect(62, y(b), 4, y(top) - y(b));
      if (awnings && b > 4) {
        g.fillStyle = '#3f6f9e';
        g.fillRect(20, y(top), 88, y(top + 0.45) - y(top));
      }
    }
    g.fillStyle = '#c9b594';
    g.fillRect(0, y(H - 0.5), w, y(H) - y(H - 0.5));
  });
  t.repeat.set(1 / 4, 1 / H);
  return t;
}
const word = (text, fg, bg, font = 'bold 110px sans-serif', w = 1024, h = 192) => canvasTex(w, h, (g) => {
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  } else g.clearRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 6);
}, { repeat: false });

export function buildAcaciaPark() {
  const group = new THREE.Group();
  group.name = 'acacia-park';
  group.position.y = CITY_Y;
  const put = (m, conf, o) => group.add(tag(m, conf, o));
  const plain = glowing(windows(), { roughness: 0.85 });
  const shaded = glowing(windows(true), { roughness: 0.85 });
  const glows = [plain, shaded];
  const slate = new THREE.MeshStandardMaterial({ color: 0x5b6068, roughness: 0.7, metalness: 0.2 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xb9b9b4, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.7 });

  // paving, the palm court lawn
  const pave = extrudeFootprint(SITE, [], 0.05, [new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.95 }), dark], 0);
  put(pave, 'med', { cast: false });
  put(extrudeFootprint(LAWN, [], 0.15, [new THREE.MeshStandardMaterial({ color: 0x5f9a3a, roughness: 1 }), white], 0), 'med', { cast: false });

  // the buildings
  put(extrudeFootprint(ECO, [], H, [slate, plain], 0), 'high');
  put(extrudeFootprint(ZAN, [], H, [pale, plain], 0), 'high');
  put(extrudeFootprint(FNB, [], H, [pale, shaded], 0), 'high');
  // a thin eaves line of grey sunshade fins along the parapets
  for (const pts of [ECO, ZAN, FNB]) {
    for (const e of edges(pts)) {
      if (e.len < 6) continue;
      put(onEdge(e, new THREE.Mesh(new THREE.BoxGeometry(e.len, 0.12, 1), new THREE.MeshStandardMaterial({ color: 0x8b9aa6, roughness: 0.5 })), 0.5, 0.5, H - 0.6), 'med', { cast: false });
    }
  }

  // ---------- Ecobank drum ----------
  {
    const { x, z, r } = DRUM;
    const tall = canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = WALL;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#1f2833';
      for (let k = 0; k < 16; k++) g.fillRect(k * 32 + 6, 12, 20, h * 0.42);
      for (let k = 0; k < 16; k++) g.fillRect(k * 32 + 4, h * 0.62, 24, h * 0.34);
    });
    const dm = glowing(tall, { roughness: 0.8 });
    glows.push(dm);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H + 1.2, 48, 1, true), dm);
    drum.position.set(x, (H + 1.2) / 2, z);
    put(drum, 'high');
    // pinwheel roof: alternating terracotta and grey sheets
    const stripes = canvasTex(512, 32, (g, w, h) => {
      for (let k = 0; k < 24; k++) {
        g.fillStyle = k % 2 ? '#b5654a' : '#a3a6a8';
        g.fillRect((k * w) / 24, 0, w / 24 + 1, h);
      }
    }, { repeat: false });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.6, 2.4, 48, 1), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, metalness: 0.3 }));
    roof.position.set(x, H + 1.2 + 1.2, z);
    put(roof, 'high');
    // ring canopy on columns round the front, and the teal Ecobank band
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 3.8, r + 3.8, 0.9, 48, 1, false, Math.PI * 0.55, Math.PI * 1.1), white);
    ring.position.set(x, 4.6, z);
    put(ring, 'high');
    const teal = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.2), new THREE.MeshStandardMaterial({ map: word('Ecobank', '#ffffff', '#1b93a8', 'bold 120px sans-serif', 768, 144), roughness: 0.5 }));
    // the front faces the car park to the north-west
    const fx = -0.72, fz = -0.69;
    teal.position.set(x + fx * (r + 3.85), 4.6, z + fz * (r + 3.85));
    teal.lookAt(x + fx * 100, 4.6, z + fz * 100);
    put(teal, 'high', { cast: false });
    const col = new THREE.CylinderGeometry(0.3, 0.3, 4.2, 12);
    for (let k = -3; k <= 3; k++) {
      const a = Math.atan2(fx, fz) + k * 0.22;
      const c = new THREE.Mesh(col, white);
      c.position.set(x + Math.sin(a) * (r + 3.2), 2.1, z + Math.cos(a) * (r + 3.2));
      put(c, 'high');
    }
  }
  // the second drum on the south-east wing
  {
    const { x, z, r } = DRUM2;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H + 1, 40), [plain, pale, pale]);
    d.position.set(x, (H + 1) / 2, z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r + 0.4, 1.6, 40), pale);
    cap.position.set(x, H + 1.8, z);
    put(d, 'med');
    put(cap, 'med');
  }

  // ---------- dark sign towers ----------
  const tower = (x, z, w, d, h, ry, face) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [dark, dark, dark, dark, face ?? dark, dark]);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    put(m, 'high');
    return m;
  };
  const logo = (draw) => new THREE.MeshStandardMaterial({ map: canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#4a4d52';
    g.fillRect(0, 0, w, h);
    draw(g, w, h);
  }, { repeat: false }), roughness: 0.6 });
  const fnbFace = edges(FNB).reduce((a, e) => (e.len > a.len && e.nz < 0 ? e : a), { len: 0 }); // the long north-west face
  const ry = Math.atan2(fnbFace.nx, fnbFace.nz);
  const alongFnb = (t, off) => [fnbFace.a[0] + fnbFace.ux * fnbFace.len * t + fnbFace.nx * off, fnbFace.a[1] + fnbFace.uz * fnbFace.len * t + fnbFace.nz * off];
  {
    const [x, z] = alongFnb(0.5, 1.2);
    tower(x, z, 7, 2.6, H + 1.8, ry, logo((g, w) => {
      g.fillStyle = '#1aa3a0';
      g.beginPath();
      g.arc(w / 2, 150, 70, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2b600';
      g.beginPath();
      g.arc(w / 2, 150, 54, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = 'bold 64px sans-serif';
      g.textAlign = 'center';
      g.fillText('FNB', w / 2, 300);
      g.font = '22px sans-serif';
      g.fillText('Zambia', w / 2, 340);
      g.fillText('Head Office', w / 2, 368);
    }));
  }
  {
    const [x, z] = alongFnb(0.72, 1.2);
    tower(x, z, 6, 2.6, H + 1.2, ry, logo((g, w) => {
      g.fillStyle = '#d71921';
      g.font = 'bold 44px serif';
      g.textAlign = 'center';
      g.fillText('Emirates', w / 2, 260);
    }));
    const [gx, gz] = alongFnb(0.62, 0.9); // curved glazed stair between the towers
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, H, 20, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2a3440, roughness: 0.2, metalness: 0.4 }));
    glass.position.set(gx, H / 2, gz);
    glass.rotation.y = ry - Math.PI / 2;
    put(glass, 'high');
  }
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.6), new THREE.MeshStandardMaterial({ map: word('First National Bank', '#2b2b2b', null, 'bold 96px sans-serif'), transparent: true }));
  put(onEdge(fnbFace, letters, 0.28, 0.1, 6.3), 'high', { cast: false });
  // Aon block at the west tip of the Ecobank wing, Ecobank stair tower east
  tower(951, -147, 7, 7, H + 1.4, -0.72, logo((g, w) => {
    g.fillStyle = '#e31b23';
    g.font = 'bold italic 80px sans-serif';
    g.textAlign = 'center';
    g.fillText('AON', w / 2, 120);
  }));
  tower(1001, -163, 5, 5, H + 2, -0.72, logo((g, w) => {
    g.fillStyle = '#1b93a8';
    g.fillRect(20, 40, w - 40, 70);
    g.fillStyle = '#fff';
    g.font = 'bold 38px sans-serif';
    g.textAlign = 'center';
    g.fillText('Ecobank', w / 2, 88);
  }));
  // Zanaco at the curved end of its block; UBA and Access on the south-east wing
  {
    const band = new THREE.Mesh(new THREE.BoxGeometry(9, 1.8, 0.4), new THREE.MeshStandardMaterial({ map: word('ZANACO', '#ffffff', '#c8102e'), roughness: 0.6 }));
    band.position.set(969, 6.6, -124);
    band.rotation.y = Math.atan2(-0.6, -0.8);
    put(band, 'high');
    const uba = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.8), new THREE.MeshStandardMaterial({ map: word('UBA', '#ffffff', '#e0115f', 'bold 140px sans-serif', 512, 154), roughness: 0.6 }));
    uba.position.set(1044, 7.2, -136);
    uba.rotation.y = Math.atan2(0.3, -0.95);
    put(uba, 'med', { cast: false });
    const access = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.4), new THREE.MeshStandardMaterial({ map: word('access', '#f47b20', '#ffffff', 'bold 120px sans-serif', 512, 120), roughness: 0.6 }));
    access.position.set(DRUM2.x - 7, 7.6, DRUM2.z - 6.5);
    access.rotation.y = Math.atan2(-0.72, -0.69);
    put(access, 'low', { cast: false });
  }

  // black shade sails over the bays in front of FNB
  const sail = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  for (const t of [0.12, 0.24, 0.84, 0.94]) {
    const [x, z] = alongFnb(t, 4.2);
    const s = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.2, 4, 1, true), sail);
    s.position.set(x, 3.1, z);
    s.rotation.y = ry + Math.PI / 4;
    put(s, 'high');
    for (const [dx, dz] of [[-2.6, -2.6], [2.6, 2.6]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.1, 6), dark);
      p.position.set(x + dx * Math.cos(ry), 1.55, z + dz * Math.sin(ry));
      put(p, 'low');
    }
  }

  // palms: in the court and along the FNB and Ecobank fronts
  const make = palmFactory();
  const r = rng(53);
  const palms = [[958, -132], [966, -130], [974, -133], [982, -126], [988, -121], [960, -137]];
  for (const t of [0.05, 0.36, 0.44, 0.58, 0.8]) palms.push(alongFnb(t, 2.2));
  for (const [x, z] of palms) {
    const p = make(6 + r() * 3, r);
    p.scale.set(1.2, 1, 1.2);
    p.position.set(x, 0, z);
    put(p, 'med');
  }

  // car parks: bays, planted islands, trees and cars, off the roads
  buildParking({
    group, lamps: glows, parks: [SITE], buildings: [ECO, ZAN, FNB, LAWN],
    axis: [[0.821, -0.571], [0.571, 0.821]],
    roads: new URL('../../data/landmarks/acacia-park-roads.json', import.meta.url),
    reserved: (x, z) => Math.hypot(x - DRUM.x, z - DRUM.z) < DRUM.r + 7 || Math.hypot(x - DRUM2.x, z - DRUM2.z) < DRUM2.r + 3,
    seed: 23,
  });

  return {
    group,
    footprints: [ECO.flat(), ZAN.flat(), FNB.flat()],
    setNight(n) {
      for (const m of glows) m.emissiveIntensity = n * 0.6;
    },
  };
}
