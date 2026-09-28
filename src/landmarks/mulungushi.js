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
import { tag } from '../util.js';
import { canvasTex, extrudeFootprint, glowing } from './lib.js';

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
const KK_H = 19.5, KK_FRAME = 2.6, KK_CENTRE_H = 25;

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
  const roofGrid = new THREE.MeshStandardMaterial({ map: pergola(), roughness: 0.8 });
  // world-UV caps: the roof texture tiles in metres
  put(extrudeFootprint(KK, [], KK_H, [roofGrid, clay]), 'med');
  const centre = extrudeFootprint(KK_CENTRE, [], KK_CENTRE_H, [roofPale, clay]);
  put(centre, 'high');
  // the deep white roof frame, overhanging the walls
  put(ring(offset(KK, 3.5), offset(KK, -9), KK_H - 0.2, KK_H + KK_FRAME, [white, white]), 'high');

  // glass behind the fins, the fins, and the red plinth walls, along the
  // front and both ends (every edge except the west side)
  const kkGlass = glowing(curtain('#3f6f9e'), { roughness: 0.15, metalness: 0.5 });
  const finGeo = new THREE.BoxGeometry(0.4, KK_H - 3, 1.5);
  const finPos = [];
  const edges = [];
  for (let i = KK_FRONT[0]; i < KK_FRONT[1]; i++) edges.push([i, i + 1]);
  edges.push([KK.length - 1, 0], [KK_FRONT[1], KK_FRONT[1] + 1]); // north and south ends
  const glassOut = offset(KK, 0.3), finOut = offset(KK, 2.2), plinthOut = offset(KK, 9);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xa4513a, roughness: 0.9 });
  const mid = Math.floor((KK_FRONT[0] + KK_FRONT[1]) / 2);
  for (const [i, j] of edges) {
    const seg = (pts, h, y, mat, thick) => {
      const [a, b] = [pts[i], pts[j]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const m = new THREE.Mesh(thick ? new THREE.BoxGeometry(len, h, thick) : new THREE.PlaneGeometry(len, h), mat);
      m.position.set((a[0] + b[0]) / 2, CITY_Y + y + h / 2, (a[1] + b[1]) / 2);
      m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      return m;
    };
    const gl = seg(glassOut, KK_H - 0.5, 0.2, kkGlass);
    gl.material.side = THREE.DoubleSide;
    put(gl, 'high');
    if (i !== mid && i < KK_FRONT[1]) put(seg(plinthOut, 2.8, 0, plinthMat, 0.6), 'med'); // gap at the entrance
    const [a, b] = [finOut[i], finOut[j]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      finPos.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -Math.atan2(b[1] - a[1], b[0] - a[0])]);
    }
  }
  const fins = new THREE.InstancedMesh(finGeo, white, finPos.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  finPos.forEach(([x, z, ry], k) => {
    q.setFromAxisAngle(up, ry);
    mtx.compose(new THREE.Vector3(x, CITY_Y + 3 + (KK_H - 3) / 2, z), q, new THREE.Vector3(1, 1, 1));
    fins.setMatrixAt(k, mtx);
  });
  put(fins, 'high');
  // entrance canopy at the middle of the front
  {
    const [a, b] = [offset(KK, 8)[mid], offset(KK, 8)[mid + 1]];
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.7, 0.8, 14), white);
    const [c, d] = [KK[mid], KK[mid + 1]];
    canopy.position.set((a[0] + b[0] + c[0] + d[0]) / 4, CITY_Y + 7, (a[1] + b[1] + c[1] + d[1]) / 4);
    canopy.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    put(canopy, 'med');
  }

  const flat = (pts) => pts.flat();
  return {
    group,
    footprints: [flat(OLD), flat(EAST), flat(KK)],
    setNight(n) {
      glassMat.emissiveIntensity = n * 0.8;
      screenMat.emissiveIntensity = n * 0.5;
      glassWall.material.emissiveIntensity = n * 0.4;
      kkGlass.emissiveIntensity = n * 0.6;
      clay.emissiveIntensity = n * 0.5;
    },
  };
}
