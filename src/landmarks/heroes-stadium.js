// National Heroes Stadium, off Great North Road (OSM relation 9099651): an
// oval bowl ~262 x 306 m, pitch running north-south. Outside: a white
// concrete frame of concourse slabs and columns with grey louvred infill,
// orange tiled stair towers, and a blue glass curtain wall on each long side
// (the main front faces east, towards the car parks and Great North Road).
// On top, the signature roof: a ring of 36 inflated white petals, each with a
// gold stripe over the crown and an orange lattice underside, hung from a
// steel ring truss. Inside: red and blue seating in two tiers, a red running
// track on a teal apron, a scoreboard and four floodlight masts.
// Also here: the Gabon Disaster Memorial, west of the stadium.
// Sources: docs/landmarks/heroes-stadium.md.
import * as THREE from 'three';
import { CITY_Y } from '../geo.js';
import { rng, tag } from '../util.js';
import { canvasTex } from './lib.js';

// OSM centroid; local axes are world axes (x east, z south).
export const STADIUM = { x: -3898.1, z: -2511.8 };
const OUTER = { a: 131, b: 152.8 }; // OSM outer ring half-axes (roof edge)
const OPEN = { a: 89.7, b: 109.7 }; // OSM inner ring: the roof opening
const WALL = { a: 122, b: 142, h: 31 };
const PETALS = 36;
export const GABON = { x: -4309.5, z: -2578.5 };

const ell = (a, b, t, y = 0) => new THREE.Vector3(a * Math.cos(t), y, b * Math.sin(t));
// Outward normal of the ellipse at parameter t, as a rotation about y.
const facing = (a, b, t) => Math.atan2(Math.cos(t) / a, Math.sin(t) / b);

// ---------- textures ----------
function facadeTexture() {
  const PX = 16, W = 8, H = WALL.h; // one 8 m bay, full height
  const t = canvasTex(W * PX, H * PX, (g, w, h) => {
    const y = (m) => h - m * PX; // metres above ground -> canvas y
    g.fillStyle = '#6f7478';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a4aaad';
    g.lineWidth = 2;
    for (let m = 6; m < H; m += 0.5) {
      g.beginPath(); g.moveTo(0, y(m)); g.lineTo(w, y(m)); g.stroke();
    }
    g.fillStyle = '#2d3033'; // shaded colonnade at ground level
    g.fillRect(0, y(5), w, 5 * PX);
    g.fillStyle = '#eeebe4';
    for (const m of [5, 13, 21, 29]) g.fillRect(0, y(m + 1.2), w, 1.2 * PX); // concourse slabs
    g.fillRect(0, 0, w, 2 * PX); // top band
    g.fillRect(0, 0, PX, h); // column
  });
  t.repeat.set(1, 1);
  return t;
}

function tileTexture(hex, w, h) {
  const t = canvasTex(64, 64, (g, cw, ch) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i <= cw; i += 8) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, ch); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(cw, i); g.stroke();
    }
  });
  t.repeat.set(w / 4, h / 4);
  return t;
}

function glassTexture(w, h) {
  const t = canvasTex(64, 64, (g, cw, ch) => {
    const grad = g.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#2c4f86');
    grad.addColorStop(1, '#1d3561');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#9aa6b4';
    g.fillRect(0, 0, cw, 2);
    g.fillRect(0, 0, 2, ch);
  });
  t.repeat.set(w / 2, h / 1.6);
  return t;
}

// Petal top: white membrane, a gold stripe over the crown along the radial axis.
function petalTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fbf8f0');
    grad.addColorStop(1, '#ddd5c4');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,110,90,0.12)';
    for (let i = 0; i < w; i += w / 24) g.fillRect(i, 0, 2, h);
    // radial axis is u = 0.25 and u = 0.75 in SphereGeometry's layout
    for (const u of [0.25, 0.75]) {
      const grad2 = g.createLinearGradient(0, 0, 0, h);
      grad2.addColorStop(0, '#e2ad3b');
      grad2.addColorStop(1, '#c98f22');
      g.fillStyle = grad2;
      g.beginPath();
      g.moveTo(w * (u - 0.035), 0);
      g.lineTo(w * (u + 0.035), 0);
      g.lineTo(w * (u + 0.012), h);
      g.lineTo(w * (u - 0.012), h);
      g.fill();
    }
  }, { repeat: false });
}

function latticeTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#c8612a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,24,14,0.55)';
    g.lineWidth = 2;
    for (let i = -h; i < w; i += 14) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke();
    }
  }, { repeat: false });
}

// ---------- parts ----------
// Sloped ring of seats between two ellipses, coloured per quad.
function seatingTier(inner, outer, rows, colourAt) {
  const N = 144;
  const pos = [], col = [];
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2;
    for (let r = 0; r < rows; r++) {
      const f0 = r / rows, f1 = (r + 1) / rows;
      const lerp = (f, t) => ell(
        inner.a + (outer.a - inner.a) * f, inner.b + (outer.b - inner.b) * f, t, inner.y + (outer.y - inner.y) * f,
      );
      const p00 = lerp(f0, t0), p01 = lerp(f0, t1), p10 = lerp(f1, t0), p11 = lerp(f1, t1);
      pos.push(...p00.toArray(), ...p10.toArray(), ...p11.toArray(), ...p00.toArray(), ...p11.toArray(), ...p01.toArray());
      c.set(colourAt((t0 + t1) / 2, r));
      if (r % 2) c.offsetHSL(0, 0, -0.05); // step shading
      for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
}

// Ends (north and south) red, long sides blue, aisles every 12 degrees.
function seatColour(t) {
  const aisle = Math.abs(((t * 180) / Math.PI) % 12) < 0.6;
  if (aisle) return 0xd8d4cc;
  return Math.abs(Math.sin(t)) > 0.82 ? 0xb3262a : 0x2a4fa3;
}

function track() {
  const g = new THREE.Group();
  const apron = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: 0x2f8f86, roughness: 0.9 }));
  apron.scale.set(62, 106, 1);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.6;
  const stadiumShape = (half, r) => {
    const s = new THREE.Shape();
    s.moveTo(-r, -half);
    s.lineTo(-r, half);
    s.absarc(0, half, r, Math.PI, 0, true);
    s.lineTo(r, -half);
    s.absarc(0, -half, r, 0, Math.PI, true);
    return s;
  };
  const outer = stadiumShape(42.2, 46);
  outer.holes.push(stadiumShape(42.2, 36.5));
  const red = new THREE.Mesh(new THREE.ShapeGeometry(outer, 24), new THREE.MeshStandardMaterial({ color: 0xb4512f, roughness: 0.9 }));
  red.rotation.x = -Math.PI / 2;
  red.position.y = 0.65;
  const pitchTex = canvasTex(64, 256, (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#3f8a33' : '#4a9a3b';
      c.fillRect(0, (i * h) / 16, w, h / 16);
    }
  }, { repeat: false });
  const infield = new THREE.Mesh(new THREE.ShapeGeometry(stadiumShape(42.2, 36.5), 24), new THREE.MeshStandardMaterial({ color: 0x3f8a33, roughness: 1 }));
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.66;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(67, 109), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 1 }));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.68;
  g.add(apron, red, infield, pitch);
  return g;
}

function petalRing() {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ map: petalTexture(), roughness: 0.6, side: THREE.FrontSide });
  const under = new THREE.MeshStandardMaterial({ map: latticeTexture(), roughness: 0.8, side: THREE.BackSide });
  const geo = new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const mid = { a: (OPEN.a + OUTER.a) / 2, b: (OPEN.b + OUTER.b) / 2 };
  // Place petals at equal arc lengths along the mid ellipse.
  const samples = 2000, pts = [], acc = [0];
  for (let i = 0; i <= samples; i++) pts.push(ell(mid.a, mid.b, (i / samples) * Math.PI * 2));
  for (let i = 1; i <= samples; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const perimeter = acc[samples];
  const halfWidth = (perimeter / PETALS) * 0.54;
  let j = 0;
  for (let k = 0; k < PETALS; k++) {
    const target = (k / PETALS) * perimeter;
    while (acc[j] < target) j++;
    const t = (j / samples) * Math.PI * 2;
    const p = ell(mid.a, mid.b, t, WALL.h - 1);
    const halfLen = (Math.hypot(OUTER.a * Math.cos(t), OUTER.b * Math.sin(t)) - Math.hypot(OPEN.a * Math.cos(t), OPEN.b * Math.sin(t))) / 2 + 2;
    for (const m of [top, under]) {
      const petal = new THREE.Mesh(geo, m);
      petal.scale.set(halfWidth, 9.5, halfLen);
      petal.position.copy(p);
      petal.rotation.y = facing(mid.a, mid.b, t);
      g.add(petal);
    }
  }
  // Steel ring truss along the roof opening, and one behind the wall top.
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bdc1, metalness: 0.7, roughness: 0.4 });
  for (const [a, b, y, r] of [[OPEN.a + 2, OPEN.b + 2, WALL.h + 0.5, 0.7], [WALL.a, WALL.b, WALL.h, 0.5]]) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 96 }, (_, i) => ell(a, b, (i / 96) * Math.PI * 2, y)), true);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 240, r, 6, true), steel));
  }
  return g;
}

// A flat panel on the wall ellipse at parameter t: width w along the tangent.
function onWall(mesh, t, proud = 0) {
  const p = ell(WALL.a, WALL.b, t);
  const ry = facing(WALL.a, WALL.b, t);
  mesh.position.x = p.x + Math.sin(ry) * proud;
  mesh.position.z = p.z + Math.cos(ry) * proud;
  mesh.rotation.y = ry;
  return mesh;
}

// A ramp that follows the wall's curve 6 m out, from the ground at t0 up to
// the first concourse (5 m) at t1, with solid white balustrades and a
// landing back to the wall at the top.
function rampAlongWall(t0, t1, mat) {
  const OUT = 6, W = 3.6, RISE = 5, WALL_H = 1.1, N = 24;
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const at = (t, off, y) => {
    const p = ell(WALL.a + off, WALL.b + off, t);
    return [p.x, y, p.z];
  };
  for (let k = 0; k < N; k++) {
    const u0 = k / N, u1 = (k + 1) / N;
    const ta = t0 + (t1 - t0) * u0, tb = t0 + (t1 - t0) * u1;
    const ya = 0.15 + RISE * u0, yb = 0.15 + RISE * u1;
    const inA = at(ta, OUT - W / 2, ya), outA = at(ta, OUT + W / 2, ya);
    const inB = at(tb, OUT - W / 2, yb), outB = at(tb, OUT + W / 2, yb);
    quad(inA, outA, outB, inB); // deck
    const drop = (p) => [p[0], p[1] - 0.5, p[2]];
    quad(drop(inA), drop(outA), drop(outB), drop(inB)); // soffit
    for (const [a, b] of [[inA, inB], [outA, outB]]) {
      quad(drop(a), drop(b), [b[0], b[1] + WALL_H, b[2]], [a[0], a[1] + WALL_H, a[2]]); // balustrade
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat.side === THREE.DoubleSide ? mat : Object.assign(mat.clone(), { side: THREE.DoubleSide })));
  // Landing from the top of the ramp back to the wall, and a pier under it.
  const landing = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.5, OUT + W / 2), mat);
  const top = ell(WALL.a + (OUT + W / 2) / 2, WALL.b + (OUT + W / 2) / 2, t1);
  landing.position.set(top.x, RISE - 0.1, top.z);
  landing.rotation.y = facing(WALL.a, WALL.b, t1);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(1.2, RISE - 0.35, 1.2), mat);
  const base = ell(WALL.a + OUT, WALL.b + OUT, t1);
  pier.position.set(base.x, (RISE - 0.35) / 2, base.z);
  g.add(landing, pier);
  return g;
}

function frontage(glassMat, orangeMat, white) {
  const g = new THREE.Group();
  for (const centre of [0, Math.PI]) { // east (main) and west fronts
    // curved blue curtain wall, in five facets
    for (let i = -2; i <= 2; i++) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(14, 25, 1), glassMat);
      pane.position.y = 16.5;
      g.add(onWall(pane, centre + i * 0.06, 2.5));
    }
    // orange tiled stair towers flanking it
    for (const dt of [-0.24, 0.24, -0.62, 0.62]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 7), orangeMat);
      tower.position.y = 12;
      g.add(onWall(tower, centre + dt, 3));
    }
    // ramps either side of the glass, rising along the facade to the concourse
    for (const side of [-1, 1]) g.add(rampAlongWall(centre + side * 0.165, centre + side * 0.03, white));
  }
  return g;
}

function floodlights(headMat, steel) {
  const g = new THREE.Group();
  for (const t of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const base = ell(OUTER.a * 1.12, OUTER.b * 1.12, t);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 55, 8), steel);
    mast.position.set(base.x, 27.5, base.z);
    const head = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 1), headMat);
    head.position.set(base.x, 56, base.z);
    head.lookAt(0, 20, 0);
    g.add(mast, head);
  }
  return g;
}

export function buildHeroesStadium() {
  const g = new THREE.Group();
  g.name = 'heroes-stadium';
  g.position.set(STADIUM.x, CITY_Y, STADIUM.z);
  const put = (mesh, conf) => {
    g.add(tag(mesh, conf));
    return mesh;
  };
  const white = new THREE.MeshStandardMaterial({ color: 0xeeebe4, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.6, roughness: 0.4 });

  // Plaza and the east car park (Great North Road is ~370 m east).
  const plaza = put(new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: 0xcbbca4, roughness: 0.95 })), 'med');
  plaza.scale.set(OUTER.a * 1.25, OUTER.b * 1.2, 1);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.05;
  const parkTex = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#4a4a4c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e4e4e4';
    for (let i = 0; i < w; i += 16) c.fillRect(i, 0, 2, h * 0.4);
  });
  parkTex.repeat.set(30, 60);
  const park = put(new THREE.Mesh(new THREE.PlaneGeometry(110, 230), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 0.95 })), 'low');
  park.rotation.x = -Math.PI / 2;
  park.position.set(OUTER.a * 1.25 + 70, 0.06, 0);

  // Outer wall: white frame, louvres, colonnade.
  const wallTex = facadeTexture();
  const perimeter = Math.PI * (3 * (WALL.a + WALL.b) - Math.sqrt((3 * WALL.a + WALL.b) * (WALL.a + 3 * WALL.b)));
  wallTex.repeat.set(Math.round(perimeter / 8), 1);
  const wall = put(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, WALL.h, 160, 1, true), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, side: THREE.DoubleSide })), 'high');
  wall.scale.set(WALL.a, 1, WALL.b);
  wall.position.y = WALL.h / 2;

  // Glass fronts and orange towers.
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTexture(14, 25), roughness: 0.15, metalness: 0.5, emissive: 0x9fc3ff, emissiveIntensity: 0,
  });
  const orangeMat = new THREE.MeshStandardMaterial({ map: tileTexture('#e5731f', 18, 24), roughness: 0.7 });
  put(frontage(glassMat, orangeMat, white), 'high');

  // Bowl: two tiers of seats, the track and pitch.
  put(seatingTier({ a: 58, b: 102, y: 0.8 }, { a: 95, b: 126, y: 13 }, 14, seatColour), 'med');
  put(seatingTier({ a: 98, b: 129, y: 16 }, { a: 119, b: 140, y: 30 }, 14, seatColour), 'med');
  const concourse = put(new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), white), 'med');
  concourse.scale.set(101, 132, 1);
  concourse.rotation.x = -Math.PI / 2;
  concourse.position.y = 14;
  put(track(), 'high');

  // Scoreboard at the north end of the upper tier.
  const board = put(new THREE.Mesh(new THREE.BoxGeometry(26, 11, 1.2), [white, white, white, white, new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.3 }), white]), 'med');
  board.position.set(0, 33, -128);

  // Roof petals, floodlights.
  put(petalRing(), 'high');
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, emissive: 0xfff6dc, emissiveIntensity: 0 });
  put(floodlights(headMat, steel), 'med');

  // Footprint for walk collisions: the outer wall.
  const footprint = [];
  for (let i = 0; i < 48; i++) {
    const p = ell(WALL.a + 1, WALL.b + 1, (i / 48) * Math.PI * 2);
    footprint.push(STADIUM.x + p.x, STADIUM.z + p.z);
  }

  return {
    group: g,
    footprints: [footprint],
    setNight(n) {
      glassMat.emissiveIntensity = n * 0.35;
      headMat.emissiveIntensity = n * 4;
    },
  };
}

// ---------- Gabon Disaster Memorial ----------
function footballTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f4f4f2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1b1b';
    const r = rng(5);
    for (let i = 0; i < 12; i++) {
      const cx = r() * w, cy = 12 + r() * (h - 24), s = 9;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      }
      g.fill();
    }
  }, { repeat: false });
}

// Obelisk topped by a football, over the graves of the Zambia national team
// lost off Gabon in 1993; the stadium stands to the east.
export function buildGabonMemorial() {
  const g = new THREE.Group();
  g.name = 'gabon-disaster-memorial';
  g.position.set(GABON.x, CITY_Y, GABON.z);
  const put = (mesh, conf) => {
    g.add(tag(mesh, conf));
    return mesh;
  };
  const stone = new THREE.MeshStandardMaterial({ color: 0xa7a39b, roughness: 0.95 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1efea, roughness: 0.8 });
  const paving = put(new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xc4b8a6, roughness: 0.95 })), 'med');
  paving.position.y = 0.1;
  const plinth = put(new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 3), stone), 'med');
  plinth.position.y = 0.6;
  const obelisk = put(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.2, 7, 4), stone), 'high');
  obelisk.geometry.rotateY(Math.PI / 4);
  obelisk.position.y = 1 + 3.5;
  const plaque = put(new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3), new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.4 })), 'high');
  plaque.position.set(0.95, 3.6, 0); // on the east face, towards the stadium
  plaque.rotation.set(0, Math.PI / 2, -0.09, 'YXZ');
  const ball = put(new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), new THREE.MeshStandardMaterial({ map: footballTexture(), roughness: 0.5 })), 'high');
  ball.position.y = 8.1;
  // Graves: white headstones in rows behind a low hedge, east of the obelisk.
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.5, 1.8), white, 30);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 30; i++) {
    m.makeTranslation(9 + Math.floor(i / 10) * 4, 0.25, -13.5 + (i % 10) * 3);
    stones.setMatrixAt(i, m);
  }
  put(stones, 'low');
  const hedge = put(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 32), new THREE.MeshStandardMaterial({ color: 0x3f6b2d, roughness: 1 })), 'low');
  hedge.position.set(20.5, 0.5, 0);
  return { group: g, footprints: [] };
}
