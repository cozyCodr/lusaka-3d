// Pyramid Tower ("Burj Kalingalinga", the Continental Pyramid Hotel), Thabo
// Mbeki Road: a square tower of blue glass crossed on every face by a pale
// silver zigzag band, a ring of windows under a grey pyramid crown, standing
// at the north corner of a low glass podium with a lilac roof and a rooftop
// pool. Not in OSM; placed and sized from Esri imagery. The architect's
// renders (gold-glass tower) were not used; this is the as-built tower.
// Sources: docs/landmarks/pyramid-tower.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';
import { canvasTex, siteFrame } from './lib.js';

// Tower centre and facade alignment (faces at bearings 10° / 100°).
export const PYRAMID = { x: 1452, z: 785, bearing: 190 };
const W = 32; // shaft width
const SHAFT_TOP = 100, CROWN_H = 3.5, PEAK_H = 18;
// Podium outline from imagery (world x/z).
const PODIUM = [[1431.7, 762.8], [1556.9, 784.7], [1523.8, 865.2], [1420.6, 817.6]];
const PODIUM_H = 13;

// One face: blue glass grid with a pale zigzag band; `flip` mirrors the band.
function faceTexture(flip, glow = false) {
  const r = rng(flip ? 7 : 3);
  return canvasTex(256, 800, (g, w, h) => {
    const X = (u) => (flip ? 1 - u : u) * w;
    const Y = (v) => (1 - v) * h;
    if (glow) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
    } else {
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#3f6fc4');
      grad.addColorStop(0.5, '#1f4c9e');
      grad.addColorStop(1, '#2a5bb3');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    // zigzag band: up and to one side, kink back, then up to the top
    g.beginPath();
    const band = [[0.55, 0], [0.85, 0], [0.42, 0.42], [0.78, 0.72], [0.62, 1], [0.34, 1], [0.5, 0.74], [0.14, 0.44]];
    band.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
    g.closePath();
    if (glow) {
      g.save();
      g.clip();
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      g.restore();
    } else {
      g.fillStyle = '#d7dce2';
      g.fill();
    }
    // glazing grid: 27 floors, 20 panels across
    const floors = 27, cols = 20;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const x = (c * w) / cols, y = (f * h) / floors;
        if (glow) {
          if (r() < 0.55) continue;
          const v = 150 + Math.floor(r() * 105);
          g.fillStyle = `rgb(${v},${Math.floor(v * 0.85)},${Math.floor(v * 0.6)})`;
          g.fillRect(x + 2, y + 4, w / cols - 4, h / floors - 10);
        } else {
          g.strokeStyle = 'rgba(210,225,245,0.45)';
          g.lineWidth = 1;
          g.strokeRect(x, y, w / cols, h / floors);
        }
      }
    }
  }, { repeat: false });
}

function podiumTexture() {
  const t = canvasTex(64, 128, (g, w, h) => {
    // extrude side UVs run bottom-up in canvas space here: the grey band is the top storey
    const grad = g.createLinearGradient(0, 0, 0, h * 0.65);
    grad.addColorStop(0, '#23467f');
    grad.addColorStop(1, '#3a66b0');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h * 0.65);
    g.fillStyle = 'rgba(220,230,245,0.5)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h * 0.65);
    g.fillRect(0, h * 0.32, w, 2);
    g.fillStyle = '#d9dadb';
    g.fillRect(0, h * 0.65, w, h * 0.35);
  });
  t.repeat.set(1 / 8, 1 / PODIUM_H);
  return t;
}

function extrude(outline, h, mats) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mats);
  m.position.y = CITY_Y;
  return m;
}

export function buildPyramidTower() {
  const group = new THREE.Group();
  group.name = 'pyramid-tower';

  // Podium (world frame).
  const roof = new THREE.MeshStandardMaterial({ color: 0xb3adbd, roughness: 0.85 }); // lilac-grey roof, as seen from above
  const podiumGlass = new THREE.MeshStandardMaterial({ map: podiumTexture(), roughness: 0.25, metalness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
  group.add(tag(extrude(PODIUM, PODIUM_H, [roof, podiumGlass]), 'med'));

  // Tower frame: local +z faces bearing 190°.
  const f = siteFrame(PYRAMID.x, PYRAMID.z, PYRAMID.bearing);
  group.add(f);
  const put = (mesh, conf, y) => {
    mesh.position.y = y;
    f.add(tag(mesh, conf));
    return mesh;
  };
  const faces = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({
    map: faceTexture(i % 2 === 1), emissive: 0xffffff, emissiveMap: faceTexture(i % 2 === 1, true), emissiveIntensity: 0,
    roughness: 0.12, metalness: 0.55,
  }));
  const cap = new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.6, metalness: 0.4 });
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  put(new THREE.Mesh(new THREE.BoxGeometry(W, SHAFT_TOP, W), [faces[0], faces[1], cap, cap, faces[2], faces[3]]), 'high', SHAFT_TOP / 2);

  // Crown: a white ledge, a ring of windows, then the pyramid.
  const white = new THREE.MeshStandardMaterial({ color: 0xe9ebee, roughness: 0.6 });
  put(new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.8, W + 1.2), white), 'high', SHAFT_TOP + 0.4);
  const ringTex = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#c9ced4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f5aa3';
    for (let x = 4; x < w; x += 16) g.fillRect(x, 6, 10, h - 12);
  });
  const ring = new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
  put(new THREE.Mesh(new THREE.BoxGeometry(W - 1, CROWN_H, W - 1), [ring, ring, cap, cap, ring, ring]), 'high', SHAFT_TOP + 0.8 + CROWN_H / 2);
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(((W + 0.6) * Math.SQRT2) / 2, PEAK_H, 4), new THREE.MeshStandardMaterial({ color: 0xa3a7ad, roughness: 0.45, metalness: 0.6, flatShading: true }));
  pyramid.geometry.rotateY(Math.PI / 4);
  put(pyramid, 'high', SHAFT_TOP + 0.8 + CROWN_H + PEAK_H / 2);

  // Rooftop pool and decks on the podium.
  const deck = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8 });
  const pool = new THREE.MeshStandardMaterial({ color: 0x3aa3d9, roughness: 0.1, metalness: 0.2 });
  const deckMesh = put(new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 14), deck), 'low', PODIUM_H + 0.15);
  deckMesh.position.set(-6, deckMesh.position.y, -30);
  const poolMesh = put(new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 6), pool), 'low', PODIUM_H + 0.2);
  poolMesh.position.set(-6, poolMesh.position.y, -30);

  f.updateMatrixWorld(true);
  const shaftFootprint = [[-W / 2, -W / 2], [W / 2, -W / 2], [W / 2, W / 2], [-W / 2, W / 2]].flatMap(([x, z]) => {
    const p = f.localToWorld(new THREE.Vector3(x, 0, z));
    return [p.x, p.z];
  });

  return {
    group,
    frame: f,
    footprints: [PODIUM.flat(), shaftFootprint],
    setNight(n) {
      for (const m of faces) m.emissiveIntensity = n * 1.1;
      ring.emissiveIntensity = n * 0.8;
      podiumGlass.emissiveIntensity = n * 0.6;
    },
  };
}
