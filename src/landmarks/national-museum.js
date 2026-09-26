// Lusaka National Museum, Nasser Road (OSM way 288801150): a white-tiled box
// floating over a dark glazed ground floor on a raised plinth; a pleated
// central bay of tall windows between folded pilasters; thin dark bands on
// the solid wings; a red block on the roof; NATIONAL MUSEUM lettered across
// the ground-floor glazing; broad steps. In front stands a large figure made
// of polished steel shards on a black steel frame, holding a brush out.
// Sources: docs/landmarks/independence-avenue.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { beam, canvasTex, faced, limb, rectFootprint, siteFrame, windowGlow } from './lib.js';

// OSM outline: 48.9 m wide (south face, bearing 79°) x 50.3 m deep.
export const MUSEUM = { x: -1904.2, z: 3272.0, bearing: 169, w: 48.9, d: 50.3 };
const PLINTH = 1.5, GROUND = 4.5, UPPER = 14;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function tileTexture(bands) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#eeebe4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,112,100,0.22)';
    g.lineWidth = 1;
    for (let i = 0; i <= w; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
    g.fillStyle = '#2f3338';
    for (const b of bands) g.fillRect(0, h * b, w, h * 0.022);
  }, { repeat: false });
}

function letteringTexture() {
  return canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#1f2327';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f1ea';
    g.font = '600 84px "Helvetica Neue", Arial, sans-serif';
    g.textBaseline = 'middle';
    const letters = 'NATIONAL MUSEUM'.split('');
    letters.forEach((ch, i) => {
      g.textAlign = 'center';
      g.fillText(ch, (w * (i + 0.5)) / letters.length, h / 2);
    });
  }, { repeat: false });
}

// Faceted steel figure: big torso leaning forward, head up, right hand raised
// with a brush, left forearm on the knee, folded legs; frame legs beneath.
function steelFigure() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.2, flatShading: true });
  const frame = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.6, metalness: 0.5 });
  const brush = new THREE.MeshStandardMaterial({ color: 0x6b2b22, roughness: 0.6 });
  const facet = { radial: 6, caps: 2 };
  const add = (m) => g.add(m);

  // frame legs and cross braces
  const feet = [V(-1.2, 0, 1.4), V(1.1, 0, 1.2), V(-1.0, 0, -0.9), V(1.0, 0, -1.1)];
  const tops = [V(-0.9, 1.9, 0.9), V(0.8, 1.9, 0.8), V(-0.7, 1.9, -0.5), V(0.7, 1.9, -0.6)];
  feet.forEach((f, i) => add(beam(f, tops[i], 0.12, frame)));
  for (const [a, b] of [[0, 1], [2, 3], [0, 2], [1, 3]]) add(beam(tops[a], tops[b], 0.1, frame));
  add(beam(feet[0], tops[1], 0.08, frame));
  add(beam(feet[3], tops[2], 0.08, frame));

  // folded legs: thighs forward, shins down at the front
  add(limb(V(-0.6, 2.2, 0), V(-0.7, 2.3, 1.5), 0.42, steel, facet));
  add(limb(V(0.6, 2.2, 0), V(0.8, 2.2, 1.4), 0.42, steel, facet));
  add(limb(V(-0.7, 2.3, 1.5), V(-0.9, 1.2, 1.9), 0.34, steel, facet));
  add(limb(V(0.8, 2.2, 1.4), V(1.0, 1.1, 1.7), 0.34, steel, facet));
  // torso leaning forward, broad chest
  const torso = limb(V(0, 2.4, 0), V(0, 4.3, 0.55), 0.72, steel, facet);
  torso.scale.set(1.15, 1, 0.8);
  add(torso);
  add(limb(V(-0.85, 4.25, 0.45), V(0.85, 4.25, 0.45), 0.36, steel, facet)); // shoulders
  // head, looking up
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), steel);
  head.scale.set(0.9, 1.1, 1);
  head.position.set(0, 5.15, 0.7);
  add(head);
  add(limb(V(0, 4.5, 0.55), V(0, 4.85, 0.65), 0.22, steel, facet));
  // right arm raised and bent, hand forward holding the brush
  const shR = V(0.95, 4.2, 0.45), elR = V(1.35, 3.6, 1.2), hand = V(1.2, 4.4, 1.7);
  add(limb(shR, elR, 0.26, steel, facet));
  add(limb(elR, hand, 0.22, steel, facet));
  const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), steel);
  fist.position.copy(hand);
  add(fist);
  add(beam(hand, hand.clone().add(V(-0.9, 0.35, 0.3)), 0.05, frame));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.04), brush);
  blade.position.copy(hand).add(V(-1.15, 0.45, 0.38));
  blade.rotation.set(0, 0.3, 0.35);
  add(blade);
  // left arm down, forearm resting on the knee
  const shL = V(-0.95, 4.2, 0.45), elL = V(-1.15, 3.1, 0.9), handL = V(-0.8, 2.7, 1.6);
  add(limb(shL, elL, 0.26, steel, facet));
  add(limb(elL, handL, 0.22, steel, facet));
  return g;
}

export function buildNationalMuseum() {
  const f = siteFrame(MUSEUM.x, MUSEUM.z, MUSEUM.bearing);
  f.name = 'national-museum';
  const { w, d } = MUSEUM;
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };
  const white = new THREE.MeshStandardMaterial({ color: 0xeeebe4, roughness: 0.75 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xb0aba2, roughness: 0.95 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xa9a59d, roughness: 0.9 });
  const brickWall = new THREE.MeshStandardMaterial({ color: 0xa55a42, roughness: 0.95 });
  const glowG = windowGlow(16, 1, 23, { litFraction: 0.8, glassTop: 0.1, glassH: 0.8 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x22272c, roughness: 0.15, metalness: 0.5, emissive: 0xffffff, emissiveMap: glowG, emissiveIntensity: 0,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2327, roughness: 0.3, metalness: 0.3 });

  // Plinth with brick sides, and broad steps down from the central bay.
  put(faced(w + 4, PLINTH, d + 4, brickWall, concrete), 'med').position.y = PLINTH / 2;
  for (let i = 0; i < 6; i++) {
    const step = put(new THREE.Mesh(new THREE.BoxGeometry(22, PLINTH - i * 0.25, 0.45), concrete), 'high');
    step.position.set(0, (PLINTH - i * 0.25) / 2, d / 2 + 2 + 0.225 + i * 0.45);
  }

  // Dark glazed ground floor behind columns.
  const gf = put(faced(w - 3, GROUND, d - 3, glass, roof), 'high');
  gf.position.y = PLINTH + GROUND / 2;
  for (let x = -w / 2 + 2; x <= w / 2 - 2; x += 5.8) {
    const col = put(new THREE.Mesh(new THREE.BoxGeometry(0.8, GROUND, 0.8), white), 'med');
    col.position.set(x, PLINTH + GROUND / 2, d / 2 - 0.8);
  }
  const sign = put(new THREE.Mesh(new THREE.PlaneGeometry(w - 6, 1.1), new THREE.MeshStandardMaterial({ map: letteringTexture(), roughness: 0.5 })), 'high');
  sign.position.set(0, PLINTH + GROUND - 1.1, d / 2 - 1.48);

  // White tiled upper volume; dark bands on the wings.
  const wingTex = tileTexture([0.12, 0.6]);
  const upper = put(faced(w, UPPER, d, new THREE.MeshStandardMaterial({ map: wingTex, roughness: 0.75 }), roof), 'high');
  upper.position.y = PLINTH + GROUND + UPPER / 2;

  // Central pleated bay on the front: tall windows between folded pilasters.
  const bayW = 20, bays = 7, pitch = bayW / bays;
  const yTop = PLINTH + GROUND + UPPER;
  const win = put(new THREE.Mesh(new THREE.PlaneGeometry(bayW, UPPER * 0.5), dark), 'high');
  win.position.set(0, yTop - UPPER * 0.33, d / 2 + 0.03);
  for (let i = 0; i <= bays; i++) {
    const p = put(new THREE.Mesh(new THREE.BoxGeometry(1.1, UPPER, 1.1), white), 'high');
    p.rotation.y = Math.PI / 4;
    p.position.set(-bayW / 2 + i * pitch, yTop - UPPER / 2, d / 2 + 0.1);
  }

  // Red block on the roof.
  const red = put(new THREE.Mesh(new THREE.BoxGeometry(21, 3, 14), new THREE.MeshStandardMaterial({ color: 0xc23a2b, roughness: 0.7 })), 'high');
  red.position.set(0, yTop + 1.5, -4);

  // Steel figure on the forecourt, left of the steps (as seen from the road).
  const fig = steelFigure();
  fig.scale.setScalar(1.4); // taller than the ground floor, as in the photos
  fig.position.set(-6, 0, d / 2 + 8);
  fig.rotation.y = 0.35;
  put(fig, 'med');

  return {
    group: f,
    footprints: [rectFootprint(f, w + 4, d + 4), rectFootprint(f, 4, 4, -6, d / 2 + 8)],
    setNight(n) {
      glass.emissiveIntensity = n * 1.4;
    },
  };
}
