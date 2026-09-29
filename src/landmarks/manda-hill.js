// Manda Hill Mall, Great East Road: Zambia's first mall, rebuilt 2013–16.
// A long two-level block of shops facing south-east onto the road, with a
// row of dark steel canopy frames along its front, a white atrium box and a
// projecting white entrance block in the middle. In front, two raised parking
// decks over a lower car park, split by the entrance drive, with palms along
// the road and the tall Manda Hill sign pylons at the gate.
// Sources: docs/landmarks/manda-hill.md.
import * as THREE from 'three';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex, extrudeFootprint, glowing, siteFrame } from './lib.js';

// OSM way 288298886, world metres.
const MALL = [[-383.2, 673.6], [-362.8, 655.6], [-359.5, 659.3], [-336.3, 638.9], [-352.1, 621.2], [-323.6, 596.0],
  [-320.7, 599.2], [-262.2, 547.7], [-265.1, 544.5], [-156.4, 448.7], [-134.3, 429.2], [-102.2, 465.2], [-97.7, 461.3],
  [-83.2, 477.6], [-79.5, 474.4], [-55.5, 501.3], [-143.7, 579.1], [-139.6, 583.8], [-149.4, 592.5], [-154.6, 586.8],
  [-184.6, 613.3], [-174.5, 624.6], [-170.9, 628.7], [-175.6, 632.9], [-179.5, 636.3], [-183.1, 632.2], [-192.7, 621.5],
  [-222.4, 647.6], [-217.6, 653.0], [-227.1, 661.4], [-232.3, 655.6], [-303.2, 718.0], [-311.7, 725.5], [-309.3, 728.1],
  [-318.3, 736.0], [-323.2, 730.6], [-328.3, 735.0]];
const H = 13; // roofline
const FACADE_W = 357; // the shopfront panel along the front

// Local frame (from the aerial): origin on the front facade by the main
// entrance, +x (u) along the front to the north-east, +z (v) out to the road.
const FRAME = { x: -190.2, z: 619.4, bearing: 139 };
const DECK = 3.2; // parking deck level (and the shop floor)
const DECKS = [[-165, -15], [-2, 88]]; // u ranges; v from 0 to DECK_V
const DECK_V = 77;
const DRIVE = [-15, -2];
const RAMP = [[-135, 22], [-112, 48]]; // opening in the south-west deck, ramp down
const ATRIUM = [[-20, -44], [22, -6]]; // u/v corners; white box to 19 m
const ENTRANCES = [[-3.3, 8.5, 20], [44, 52, 7], [-60, -51, 7.5], [-178, -168, 4]]; // u0, u1, depth (OSM)

// ---------- textures ----------
function frontTex() {
  // one 24 m bay: lower car-park level, shopfronts, beige band with signs
  const t = canvasTex(512, 256, (g, w, h) => {
    const y = (m) => h - (m / H) * h;
    g.fillStyle = '#e3dccd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2d31';
    g.fillRect(0, y(DECK), w, h - y(DECK)); // under the deck
    g.fillStyle = '#20303f';
    g.fillRect(6, y(DECK + 4.6), w - 12, y(DECK) - y(DECK + 4.6)); // glazing
    g.strokeStyle = '#c9c4ba';
    g.lineWidth = 3;
    for (let x = 6; x < w; x += 64) { g.beginPath(); g.moveTo(x, y(DECK + 4.6)); g.lineTo(x, y(DECK)); g.stroke(); }
    const r = rng(9);
    const signs = ['#c8102e', '#1d3f8f', '#f2f2f2', '#111', '#e87722', '#0a7d3b', '#7a1f5c'];
    for (let x = 30; x < w - 60; x += 120) {
      g.fillStyle = signs[Math.floor(r() * signs.length)];
      g.fillRect(x, y(DECK + 7.4), 70 + r() * 30, 22);
    }
  });
  t.repeat.set(FACADE_W / 24, 1); // on a plane: UVs run 0..1
  return t;
}
function deckEdgeTex() {
  // road face of the deck: columns and the dark lower car park
  const t = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#cfc8b8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#23262a';
    g.fillRect(14, 16, w - 28, h - 16);
  });
  t.repeat.set(1 / 8, 1 / DECK);
  return t;
}
function parkingTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f6e6a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e6df';
    for (let x = 0; x < w; x += 32) { g.fillRect(x, 0, 3, 90); g.fillRect(x, h - 90, 3, 90); }
  });
  t.repeat.set(1 / 20, 1 / 20);
  return t;
}
function signTex() {
  return canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#6d6f73';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3242c';
    g.fillRect(0, 0, w, 120);
    g.fillStyle = '#f4efe6';
    g.fillRect(10, 18, w - 20, 84);
    g.fillStyle = '#b3242c';
    g.font = 'bold 22px sans-serif';
    g.textAlign = 'center';
    g.fillText('MANDA', w / 2, 60);
    g.fillText('HILL', w / 2, 86);
    const r = rng(3);
    for (let y = 140; y < h - 40; y += 48) {
      g.fillStyle = ['#f2f2f2', '#c8102e', '#1d3f8f', '#111'][Math.floor(r() * 4)];
      g.fillRect(12, y, w - 24, 38);
    }
  }, { repeat: false });
}

export function buildMandaHill() {
  const group = new THREE.Group();
  group.name = 'manda-hill';
  const put = (parent, m, conf, o) => parent.add(tag(m, conf, o));

  // the block of shops on its OSM outline
  const beige = new THREE.MeshStandardMaterial({ color: 0xe3dccd, roughness: 0.85 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xa9a59b, roughness: 0.9 });
  put(group, extrudeFootprint(MALL, [], H, [roof, beige]), 'high');

  const f = siteFrame(FRAME.x, FRAME.z, FRAME.bearing);
  group.add(f);
  const white = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6 });
  const box = (u0, v0, u1, v1, y0, y1, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mat);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return m;
  };

  // front facade: shopfronts and signs along the whole front
  const front = glowing(frontTex(), { roughness: 0.8 });
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(FACADE_W, H), front);
  facade.position.set(0.5, H / 2, 0.12);
  put(f, facade, 'med', { cast: false });

  // white atrium box and the white entrance blocks
  const [[a0, b0], [a1, b1]] = ATRIUM;
  put(f, box(a0, b0, a1, b1, H - 1, 19, white), 'high');
  for (const [u0, u1, d] of ENTRANCES) put(f, box(u0 - 0.3, -0.5, u1 + 0.3, d + 0.3, 0, H + 1.5, white), 'med');
  // flat white canopy over the main entrance, on columns
  put(f, box(-6, 20, 12, 30, DECK + 5.2, DECK + 5.9, white), 'high');
  const colGeo = new THREE.CylinderGeometry(0.35, 0.35, DECK + 5.2, 12);
  for (const u of [-5, 3, 11]) {
    const c = new THREE.Mesh(colGeo, white);
    c.position.set(u, (DECK + 5.2) / 2, 29.3);
    put(f, c, 'med');
  }

  // dark steel canopy frames along the front, at deck level
  const posts = [];
  for (let u = -176; u <= 176; u += 8) {
    if (ENTRANCES.some(([u0, u1]) => u > u0 - 3 && u < u1 + 3)) continue;
    posts.push(u);
  }
  const postGeo = new THREE.BoxGeometry(0.3, 7.5, 0.3);
  const beamGeo = new THREE.BoxGeometry(0.25, 0.35, 7.3);
  const pm = new THREE.InstancedMesh(postGeo, steel, posts.length);
  const bm = new THREE.InstancedMesh(beamGeo, steel, posts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.14);
  posts.forEach((u, i) => {
    pm.setMatrixAt(i, m4.makeTranslation(u, DECK + 3.75, 7));
    bm.setMatrixAt(i, m4.compose(new THREE.Vector3(u, DECK + 8, 3.5), q, new THREE.Vector3(1, 1, 1)));
  });
  put(f, pm, 'high');
  put(f, bm, 'high');
  // a strip of canopy roofing between the frames
  put(f, box(-176, 0, 176, 7.3, DECK + 7.9, DECK + 8.1, new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.6, transparent: true, opacity: 0.55 })), 'med', { cast: false });

  // the two parking decks: roofs of the lower car park, with ramps and rails
  const top = new THREE.MeshStandardMaterial({ map: parkingTex(), roughness: 0.95 });
  const edge = new THREE.MeshStandardMaterial({ map: deckEdgeTex(), roughness: 0.9 });
  const footprints = [];
  DECKS.forEach(([u0, u1], k) => {
    const shape = new THREE.Shape([[u0, 0], [u1, 0], [u1, DECK_V], [u0, DECK_V]].map(([u, v]) => new THREE.Vector2(u, -v)));
    if (k === 0) {
      const [[r0, s0], [r1, s1]] = RAMP;
      shape.holes.push(new THREE.Path([[r0, s0], [r1, s0], [r1, s1], [r0, s1]].map(([u, v]) => new THREE.Vector2(u, -v))));
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: DECK, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    put(f, new THREE.Mesh(geo, [top, edge]), 'med');
    footprints.push([u0, u1]);
  });
  {
    // ramp down through the south-west deck
    const [[r0, s0], [r1, s1]] = RAMP;
    const len = s1 - s0, ramp = new THREE.Mesh(new THREE.BoxGeometry(r1 - r0 - 1, 0.3, Math.hypot(len, DECK)), new THREE.MeshStandardMaterial({ color: 0x5c5b58, roughness: 0.95 }));
    ramp.position.set((r0 + r1) / 2, DECK / 2, (s0 + s1) / 2);
    ramp.rotation.x = Math.atan2(DECK, len);
    put(f, ramp, 'low');
  }
  const railTex = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#d9dbdc';
    g.fillRect(0, 0, w, 4);
    g.fillRect(0, h - 3, w, 3);
    for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 2, h);
  });
  railTex.repeat.set(1 / 4, 1);
  const railMat = new THREE.MeshStandardMaterial({ map: railTex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 });
  for (const [u0, u1] of DECKS) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, 1.1), railMat);
    r.position.set((u0 + u1) / 2, DECK + 0.55, DECK_V);
    put(f, r, 'med', { cast: false });
  }

  // entrance drive between the decks
  const drive = box(DRIVE[0], 0, DRIVE[1], DECK_V + 2, 0, 0.12, new THREE.MeshStandardMaterial({ color: 0x46474a, roughness: 0.95 }));
  put(f, drive, 'med', { cast: false });

  // sign pylons at the gate
  const signMat = new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8c8479, roughness: 0.95 });
  for (const u of [DRIVE[0] - 4, DRIVE[1] + 4]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 1.4), [stone, stone, signMat, signMat, signMat, signMat]);
    body.position.set(u, 3 + 6, DECK_V + 4);
    put(f, body, 'med');
    put(f, box(u - 2, DECK_V + 2.8, u + 2, DECK_V + 5.2, 0, 3, stone), 'med');
  }

  // palms along the road
  const make = palmFactory();
  const r = rng(29);
  for (let u = -160; u <= 86; u += 9) {
    if (u > DRIVE[0] - 8 && u < DRIVE[1] + 8) continue;
    const p = make(6.5 + r() * 2, r);
    p.scale.set(1.3, 1, 1.3);
    p.position.set(u, 0, DECK_V + 2.5);
    put(f, p, 'med');
  }

  // walk footprints: the deck edges (the mall body is added below)
  f.updateMatrixWorld(true);
  const toWorld = (pts) => pts.flatMap(([u, v]) => {
    const p = f.localToWorld(new THREE.Vector3(u, 0, v));
    return [p.x, p.z];
  });
  return {
    group,
    frame: f,
    footprints: [MALL.flat(), ...footprints.map(([u0, u1]) => toWorld([[u0, 0], [u1, 0], [u1, DECK_V], [u0, DECK_V]]))],
    setNight(n) {
      front.emissiveIntensity = n * 0.7;
    },
  };
}
