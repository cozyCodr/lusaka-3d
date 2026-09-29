// Manda Hill Mall, Great East Road: Zambia's first mall, rebuilt 2013–16.
// A long block of shops facing south-east onto the road. A street runs along
// its whole front at ground level, under steel portal frames on stone-clad
// pillars, between the shopfronts and two raised parking decks (with more
// parking beneath). Footbridges cross the street from the decks to the white
// entrance blocks; the main entrance is a white block the street passes
// under, shaded by big dark sloping sun-roofs, at the end of the entrance
// drive from the road, with the sign pylons and palms at the gate.
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
const STREET = 13; // the street along the front: v 0..STREET
const DECK = 4.2; // deck level: cars park beneath
const DECKS = [[-165, -3], [17, 88]]; // u ranges; v from STREET to DECK_V (aerial)
const DECK_V = 77;
const DRIVE = [-3, 17]; // in and out lanes (OSM ways 369606711, 405672369) and a planted median
const MEDIAN = [5.5, 10, 30]; // u0, u1, v start
const GATE = [-32, 34]; // no fence or palms here: the slip roads curve out to Great East Road
const RAMP = [[-135, 30], [-112, 56]]; // opening in the south-west deck, ramp down
const ATRIUM = [[-20, -44], [22, -6]]; // u/v corners; white box to 19 m
const MAIN = [-3.3, 8.5]; // main entrance block (OSM), bridged over the street
const ENTRANCES = [[44, 52], [-60, -51], [-178, -168]]; // side entrances (OSM), with footbridges

// ---------- textures ----------
function frontTex() {
  // one 24 m bay, bottom-up: shopfronts at street level, a beige band of
  // brand signs above
  const t = canvasTex(512, 256, (g, w, h) => {
    const y = (m) => h - (m / H) * h;
    g.fillStyle = '#e3dccd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#243444';
    g.fillRect(0, y(4.8), w, y(0.3) - y(4.8)); // glazing
    g.fillStyle = '#d6d0c4';
    for (let x = 0; x < w; x += 64) g.fillRect(x, y(4.8), 8, y(0) - y(4.8)); // columns
    g.fillStyle = '#4a4540';
    g.fillRect(0, y(5.4), w, y(4.8) - y(5.4)); // fascia
    const r = rng(9);
    const signs = ['#c8102e', '#1d3f8f', '#f2f2f2', '#111', '#e87722', '#0a7d3b', '#7a1f5c'];
    for (let x = 24; x < w - 60; x += 110) {
      for (const m of [7.2, 9.6]) {
        if (r() < 0.35) continue;
        g.fillStyle = signs[Math.floor(r() * signs.length)];
        g.fillRect(x + r() * 10, y(m + 1.2), 64 + r() * 26, y(m) - y(m + 1.2));
      }
    }
  });
  t.repeat.set(FACADE_W / 24, 1); // on a plane: UVs run 0..1
  return t;
}
function wordTex(text, color, bg, font = 'bold 150px sans-serif') {
  return canvasTex(1024, 192, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 6);
  }, { repeat: false });
}
function stoneTex() {
  const t = canvasTex(64, 64, (g, w, h) => {
    const r = rng(5);
    for (let y = 0; y < h; y += 8) {
      for (let x = (y / 8) % 2 ? -8 : 0; x < w; x += 16) {
        const v = 150 + Math.floor(r() * 50);
        g.fillStyle = `rgb(${v},${v - 18},${v - 38})`;
        g.fillRect(x, y, 15, 7);
      }
    }
  });
  t.repeat.set(1, 3);
  return t;
}
function parkingTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a877f';
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
  const steel = new THREE.MeshStandardMaterial({ color: 0x9da2a8, roughness: 0.45, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x4a4b4d, roughness: 0.95 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.9 });
  const box = (u0, v0, u1, v1, y0, y1, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mat);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return m;
  };
  const railTex = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#d9dbdc';
    g.fillRect(0, 0, w, 4);
    g.fillRect(0, h - 3, w, 3);
    for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 2, h);
  });
  railTex.repeat.set(1 / 4, 1);
  const railMat = new THREE.MeshStandardMaterial({ map: railTex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 });
  // a rail along local u (alongU) or v, at height y
  const rail = (a0, a1, at, y, alongU = true) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(a1 - a0), 1.1), railMat);
    if (alongU) r.position.set((a0 + a1) / 2, y + 0.55, at);
    else { r.position.set(at, y + 0.55, (a0 + a1) / 2); r.rotation.y = Math.PI / 2; }
    put(f, r, 'med', { cast: false });
  };

  // shopfronts and the street along the front
  const front = glowing(frontTex(), { roughness: 0.8 });
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(FACADE_W, H), front);
  facade.position.set(0.5, H / 2, 0.12);
  put(f, facade, 'med', { cast: false });
  put(f, box(-178, 0.1, 176, 2.4, 0, 0.3, paving), 'med', { cast: false }); // pavement at the shops
  put(f, box(-178, 2.4, 90, STREET, 0, 0.14, asphalt), 'med', { cast: false });
  // big brand signs, from the founder's photos
  const sign = (text, color, bg, u, y, w, hgt) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshStandardMaterial({ map: wordTex(text, color, bg), roughness: 0.6 }));
    m.position.set(u, y, 0.3);
    put(f, m, 'high', { cast: false });
  };
  sign('SHOPRITE', '#d0121b', '#e3dccd', -34, 9.5, 20, 3.6);
  sign('SHOPRITE', '#d0121b', '#e3dccd', -118, 9.5, 18, 3.3);
  sign('game', '#b3124e', '#f4f1ea', 40, 10, 9, 2.4);

  // white atrium box and the white entrance faces
  const [[a0, b0], [a1, b1]] = ATRIUM;
  put(f, box(a0, b0, a1, b1, H - 1, 19, white), 'high');
  const logo = new THREE.MeshStandardMaterial({ map: wordTex('MANDA HILL', '#8a2f45', '#f3f2ee', 'bold 130px serif'), roughness: 0.6 });
  for (const [u0, u1] of [MAIN, ...ENTRANCES]) {
    const w = u1 - u0 + 0.6;
    const face = new THREE.Mesh(new THREE.BoxGeometry(w, H + 1.5, 1.4), [white, white, white, white, white, white]);
    face.position.set((u0 + u1) / 2, (H + 1.5) / 2, 0.5);
    put(f, face, 'high');
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, w * 0.17), logo);
    l.position.set((u0 + u1) / 2, 9.2, 1.25);
    put(f, l, 'high', { cast: false });
    // sloping steel canopy out over the street
    const c = box(u0 - 4, 0, u1 + 4, 8, -0.2, 0.2, dark);
    c.position.y = H - 1.2;
    c.rotation.x = 0.12;
    put(f, c, 'high');
  }
  // main entrance: a white block bridged over the street, and the dark
  // sloping sun-roofs above it
  put(f, box(MAIN[0], 1.2, MAIN[1], STREET, DECK, H, white), 'high');
  for (const u of [MAIN[0] + 0.5, MAIN[1] - 0.5]) put(f, box(u - 0.35, STREET - 1, u + 0.35, STREET - 0.3, 0, DECK, white), 'med');
  const sun1 = box(-18, -6, 20, 18, -0.25, 0.25, dark);
  sun1.position.y = 18;
  sun1.rotation.x = -0.1;
  const sun2 = box(-30, -2, -8, 14, -0.25, 0.25, dark);
  sun2.position.y = 15.5;
  sun2.rotation.x = -0.1;
  put(f, sun1, 'med');
  put(f, sun2, 'med');
  for (const [u, v] of [[-17, 16], [19, 16], [-29, 12], [-9, 12]]) put(f, box(u - 0.2, v - 0.2, u + 0.2, v + 0.2, H, 17.5, steel), 'low');

  // portal frames across the street: stone-clad pillars and grey steel
  const portals = [];
  const clear = (u) => ![MAIN, ...ENTRANCES].some(([u0, u1]) => u > u0 - 4 && u < u1 + 4) && !(u > DRIVE[0] - 2 && u < DRIVE[1] + 2);
  for (let u = -174; u <= 88; u += 10) if (clear(u)) portals.push(u);
  const pillarGeo = new THREE.BoxGeometry(1, 5.5, 1);
  const postGeo = new THREE.BoxGeometry(0.35, 5, 0.35);
  const beamGeo = new THREE.BoxGeometry(0.35, 0.45, STREET - 2);
  const pil = new THREE.InstancedMesh(pillarGeo, stone, portals.length * 2);
  const pos = new THREE.InstancedMesh(postGeo, steel, portals.length * 2);
  const bea = new THREE.InstancedMesh(beamGeo, steel, portals.length);
  const m4 = new THREE.Matrix4();
  portals.forEach((u, i) => {
    for (const [k, v] of [[0, 2], [1, STREET - 0.5]]) {
      pil.setMatrixAt(i * 2 + k, m4.makeTranslation(u, 2.75, v));
      pos.setMatrixAt(i * 2 + k, m4.makeTranslation(u, 8, v));
    }
    bea.setMatrixAt(i, m4.makeTranslation(u, 10.5, STREET / 2 + 0.75));
  });
  put(f, pil, 'high');
  put(f, pos, 'high');
  put(f, bea, 'high');

  // footbridges from the decks across the street to the side entrances
  for (const [u0, u1] of ENTRANCES) {
    if (u0 < DECKS[0][0]) continue;
    const u = (u0 + u1) / 2;
    put(f, box(u - 1.8, 1.2, u + 1.8, STREET, DECK - 0.4, DECK, paving), 'high');
    rail(1.2, STREET, u - 1.8, DECK, false);
    rail(1.2, STREET, u + 1.8, DECK, false);
  }

  // the two parking decks, with parking beneath, a ramp and rails
  const top = new THREE.MeshStandardMaterial({ map: parkingTex(), roughness: 0.95 });
  // Each deck is a slab on a grid of columns: the top car park on it and
  // the ground car park beneath.
  const SLAB = 0.6;
  const ground = new THREE.MeshStandardMaterial({ map: parkingTex(), roughness: 0.95, color: 0xb5b2aa });
  const colGeo = new THREE.BoxGeometry(0.5, DECK - SLAB, 0.5);
  const cols = [];
  DECKS.forEach(([u0, u1], k) => {
    const shape = new THREE.Shape([[u0, STREET], [u1, STREET], [u1, DECK_V], [u0, DECK_V]].map(([u, v]) => new THREE.Vector2(u, -v)));
    if (k === 0) {
      const [[r0, s0], [r1, s1]] = RAMP;
      shape.holes.push(new THREE.Path([[r0, s0], [r1, s0], [r1, s1], [r0, s1]].map(([u, v]) => new THREE.Vector2(u, -v))));
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const slab = new THREE.Mesh(geo, [top, white]);
    slab.position.y = DECK - SLAB;
    put(f, slab, 'med');
    put(f, box(u0, STREET, u1, DECK_V, 0, 0.1, ground), 'med', { cast: false }); // the ground car park
    for (let u = u0 + 1; u < u1; u += 8) {
      for (let v = STREET + 1; v < DECK_V; v += 8.5) {
        const [[r0, s0], [r1, s1]] = RAMP;
        if (k === 0 && u > r0 - 1 && u < r1 + 1 && v > s0 - 1 && v < s1 + 1) continue;
        cols.push([u, v]);
      }
    }
    rail(u0, u1, DECK_V, DECK);
    rail(u0, u1, STREET, DECK);
  });
  const colMesh = new THREE.InstancedMesh(colGeo, white, cols.length);
  cols.forEach(([u, v], i) => colMesh.setMatrixAt(i, m4.makeTranslation(u, (DECK - SLAB) / 2, v)));
  put(f, colMesh, 'med');
  {
    const [[r0, s0], [r1, s1]] = RAMP;
    const len = s1 - s0, ramp = new THREE.Mesh(new THREE.BoxGeometry(r1 - r0 - 1, 0.3, Math.hypot(len, DECK)), asphalt);
    ramp.position.set((r0 + r1) / 2, DECK / 2, (s0 + s1) / 2);
    ramp.rotation.x = Math.atan2(DECK, len);
    put(f, ramp, 'med');
  }

  // entrance drive between the decks, and the bridge joining the two top
  // car parks over it, near the mall
  put(f, box(DRIVE[0], STREET, DRIVE[1], DECK_V, 0, 0.14, asphalt), 'med', { cast: false });
  {
    // the planted median down the drive: kerbed hedge and round trees
    const [m0, m1, mv] = MEDIAN;
    put(f, box(m0, mv, m1, DECK_V - 1, 0, 0.3, paving), 'med');
    put(f, box(m0 + 0.4, mv + 0.4, m1 - 0.4, DECK_V - 1.4, 0.3, 1.1, new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 1 })), 'high');
    const trunk = new THREE.MeshStandardMaterial({ color: 0x6e5a45, roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x4b7a2e, roughness: 1, flatShading: true });
    for (let v = mv + 4; v < DECK_V - 3; v += 9) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2.6, 6), trunk);
      t.position.set((m0 + m1) / 2, 2.4, v);
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), leaf);
      c.position.set((m0 + m1) / 2, 4.6, v);
      put(f, t, 'med');
      put(f, c, 'med');
    }
  }
  put(f, box(DRIVE[0], STREET + 3, DRIVE[1], STREET + 14, DECK - 0.6, DECK, top), 'high');
  put(f, box(DRIVE[0], STREET + 13.4, DRIVE[1], STREET + 14, DECK - 1.4, DECK - 0.6, white), 'high'); // edge beam
  rail(DRIVE[0], DRIVE[1], STREET + 3, DECK);
  rail(DRIVE[0], DRIVE[1], STREET + 14, DECK);
  // gate: sign pylons, the flagpole, palms along the road
  const signMat = new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.6 });
  const base = new THREE.MeshStandardMaterial({ color: 0x8c8479, roughness: 0.95 });
  for (const u of [DRIVE[0] - 4, DRIVE[1] + 4]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 1.4), [base, base, signMat, signMat, signMat, signMat]);
    body.position.set(u, 3 + 6, DECK_V + 1.5);
    put(f, body, 'high');
    put(f, box(u - 2, DECK_V + 0.3, u + 2, DECK_V + 2.7, 0, 3, stone), 'high');
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 14, 8), steel);
  pole.position.set((MEDIAN[0] + MEDIAN[1]) / 2, 7, DECK_V - 2);
  put(f, pole, 'med');
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({
    map: canvasTex(96, 64, (g, w, h) => {
      g.fillStyle = '#198a00'; g.fillRect(0, 0, w, h);
      for (const [i, c] of ['#de2010', '#111', '#ef7d00'].entries()) { g.fillStyle = c; g.fillRect(w * 0.55 + i * w * 0.15, h * 0.35, w * 0.15, h * 0.65); }
    }, { repeat: false }), side: THREE.DoubleSide,
  }));
  flag.position.set((MEDIAN[0] + MEDIAN[1]) / 2 + 1.25, 13, DECK_V - 2);
  put(f, flag, 'med', { cast: false });
  // short bollards linked by a sagging chain along the road edge, in front
  // of the palms (founder's description), either side of the drive
  const FENCE_V = DECK_V + 5.2, SPAN = 2.4, POST_H = 0.75;
  const posts = [];
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.5, metalness: 0.6 });
  for (const [u0, u1] of [[DECKS[0][0], GATE[0]], [GATE[1], DECKS[1][1]]]) {
    const n = Math.round((u1 - u0) / SPAN), pts = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      posts.push(u);
      pts.push(new THREE.Vector3(u, POST_H - 0.1, FENCE_V));
      if (i < n) pts.push(new THREE.Vector3(u + (u1 - u0) / n / 2, POST_H - 0.35, FENCE_V));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    put(f, new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 4, 0.025, 4), chainMat), 'med', { cast: false });
  }
  const bollards = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.08, POST_H, 8), chainMat, posts.length);
  posts.forEach((u, i) => bollards.setMatrixAt(i, m4.makeTranslation(u, POST_H / 2, FENCE_V)));
  put(f, bollards, 'med');

  const make = palmFactory();
  const r = rng(29);
  for (let u = -160; u <= 86; u += 9) {
    if (u > GATE[0] - 2 && u < GATE[1] + 2) continue;
    const p = make(6.5 + r() * 2, r);
    p.scale.set(1.3, 1, 1.3);
    p.position.set(u, 0, DECK_V + 2.5);
    put(f, p, 'med');
  }

  f.updateMatrixWorld(true);
  const toWorld = (pts) => pts.flatMap(([u, v]) => {
    const p = f.localToWorld(new THREE.Vector3(u, 0, v));
    return [p.x, p.z];
  });
  return {
    group,
    frame: f,
    footprints: [MALL.flat(), ...DECKS.map(([u0, u1]) => toWorld([[u0, STREET], [u1, STREET], [u1, DECK_V], [u0, DECK_V]]))],
    setNight(n) {
      front.emissiveIntensity = n * 0.7;
    },
  };
}
