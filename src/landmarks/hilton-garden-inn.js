// Society Business Park, west of Cairo Road: one building. A mall podium runs
// from a curved frontage on Cairo Road back to the rounded six-storey "shell"
// at its west end; the Hilton Garden Inn tower stands on the podium roof.
//
// Podium: rounded cream floor bands over louvred glass, shops at street level,
// a roof garden around the tower. Tower (OSM way 1185077883, 25 x 18 m): 18
// hotel floors of rose-cream canted spandrels over bronze glass, faceted
// corners; a glass spine runs up the middle of the east end and, above the
// roof, arcs back over the tower into a raked glass sail that peaks over the
// west end. Sources: docs/landmarks/hilton-garden-inn.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { canvasTex, siteFrame, windowGlow } from './lib.js';

// One frame for the whole building: origin on the tower's OSM centroid, local
// +z east along the long axis (bearing 80) towards Cairo Road, +x north.
export const HGI = { x: -2970.0, z: 2816.0, bearing: 80, w: 18, len: 25 };
const PODIUM = 16.1; // shops (5 m) + three mall levels
const FLOOR = 3.3, FLOORS = 18;
const BASE = PODIUM, TOP = PODIUM + FLOORS * FLOOR; // ~75.5 m
const SHELL = { x: 8, z: -80, len: 56, w: 34, levels: 6, level: 3.8 }; // from imagery
// Podium wings (local), measured on imagery against the OSM neighbours.
const FRONT_WING = { x0: -14, x1: 30, z0: -55, z1: 34 }; // Cairo Road wing, under the tower
const REAR_WING = { x0: -8, x1: 50, z0: -108, z1: -48 }; // links to the shell

// ---------- shapes (local x/z, extruded upward) ----------
const V2 = (x, z) => new THREE.Vector2(x, -z);

function extrudeUp(shape, height, materials) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 20 });
  geo.rotateX(-Math.PI / 2); // shape (x, y) -> local (x, -z), extruded up
  return new THREE.Mesh(geo, materials);
}

// Rectangle with per-corner radii: [south-west, north-west, north-east, south-east]
// (x0/x1 = south/north, z0/z1 = west/east).
function roundedRect({ x0, x1, z0, z1 }, [rsw, rnw, rne, rse], grow = 0) {
  x0 -= grow; x1 += grow; z0 -= grow; z1 += grow;
  const s = new THREE.Shape();
  s.moveTo(...V2(x0, z0 + rsw).toArray());
  s.lineTo(...V2(x0, z1 - rse).toArray());
  s.quadraticCurveTo(...V2(x0, z1).toArray(), ...V2(x0 + rse, z1).toArray());
  s.lineTo(...V2(x1 - rne, z1).toArray());
  s.quadraticCurveTo(...V2(x1, z1).toArray(), ...V2(x1, z1 - rne).toArray());
  s.lineTo(...V2(x1, z0 + rnw).toArray());
  s.quadraticCurveTo(...V2(x1, z0).toArray(), ...V2(x1 - rnw, z0).toArray());
  s.lineTo(...V2(x0 + rsw, z0).toArray());
  s.quadraticCurveTo(...V2(x0, z0).toArray(), ...V2(x0, z0 + rsw).toArray());
  return s;
}

// Racetrack centred on (cx, cz): straight length along z, round ends.
function racetrack(cx, cz, len, r, grow = 0) {
  r += grow;
  const half = len / 2 - (r - grow);
  const s = new THREE.Shape();
  s.moveTo(...V2(cx - r, cz - half).toArray());
  s.absarc(cx, -(cz - half), r, Math.PI, 0, true);
  s.lineTo(...V2(cx + r, cz + half).toArray());
  s.absarc(cx, -(cz + half), r, 0, Math.PI, true);
  s.closePath();
  return s;
}

function chamfered(hw, z0, z1, c) {
  const pts = [[-hw + c, z0], [hw - c, z0], [hw, z0 + c], [hw, z1 - c], [hw - c, z1], [-hw + c, z1], [-hw, z1 - c], [-hw, z0 + c]];
  return new THREE.Shape(pts.map(([x, z]) => V2(x, z)));
}

// A shape in the local y/z plane, extruded across x from -w/2 to w/2.
function sideProfile(points, width, mat) {
  const s = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 24 });
  geo.rotateY(-Math.PI / 2); // shape x -> local +z, extrusion -> local -x
  geo.translate(width / 2, 0, 0);
  return new THREE.Mesh(geo, mat);
}

// ---------- textures (extrude UVs are in metres) ----------
function slabTexture() {
  const t = canvasTex(128, 110, (g, w, h) => {
    g.fillStyle = '#2e2522';
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h * 0.38);
    grad.addColorStop(0, 'rgba(220,170,120,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h * 0.38);
    g.fillStyle = '#4a3a33';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h * 0.38);
    const band = g.createLinearGradient(0, h * 0.38, 0, h);
    band.addColorStop(0, '#dcb9a6');
    band.addColorStop(1, '#b88e7c');
    g.fillStyle = band;
    g.fillRect(0, h * 0.38, w, h * 0.62);
  });
  t.repeat.set(1 / 4, 1 / FLOOR);
  return t;
}

// Champagne glass for the spine, arc and sail: mullion grid, soft gradient.
function spineTexture() {
  const t = canvasTex(64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d8c3a2');
    grad.addColorStop(0.5, '#a89274');
    grad.addColorStop(1, '#7c6a58');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,58,48,0.8)';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, 0, 2, h);
  });
  t.repeat.set(1 / 1.5, 1 / FLOOR);
  return t;
}

function louvreTexture() {
  const t = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#39424a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b8b2a4';
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, w, 10);
  });
  t.repeat.set(1 / 2, 1 / 3.8);
  return t;
}

function lettersTexture(text, colour, font) {
  return canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = colour;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  }, { repeat: false });
}

// ---------- the building ----------
export function buildHiltonGardenInn() {
  const f = siteFrame(HGI.x, HGI.z, HGI.bearing);
  f.name = 'society-business-park';
  const put = (mesh, conf, y = 0) => {
    mesh.position.y += y;
    f.add(tag(mesh, conf));
    return mesh;
  };

  const roof = new THREE.MeshStandardMaterial({ color: 0xa9a399, roughness: 0.9 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.7 });
  const creamRose = new THREE.MeshStandardMaterial({ color: 0xd7b8a6, roughness: 0.7 });
  const louvres = new THREE.MeshStandardMaterial({ map: louvreTexture(), roughness: 0.5, metalness: 0.2, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const shops = new THREE.MeshStandardMaterial({ color: 0x33393f, roughness: 0.2, metalness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const garden = new THREE.MeshStandardMaterial({ color: 0x5e8f43, roughness: 1 });

  // ---- mall podium: two wings, shops at street level, rounded cream bands ----
  const wings = [
    { shape: (g) => roundedRect(FRONT_WING, [3, 3, 16, 16], g), conf: 'med' }, // curved Cairo Road front
    { shape: (g) => roundedRect(REAR_WING, [4, 4, 4, 4], g), conf: 'low' },
  ];
  const levels = [5, 8.7, 12.4, PODIUM];
  for (const wg of wings) {
    put(extrudeUp(wg.shape(-1.2), 5, [roof, shops]), wg.conf);
    put(extrudeUp(wg.shape(-0.8), PODIUM - 5, [roof, louvres]), wg.conf, 5);
    levels.forEach((y, i) => {
      put(extrudeUp(wg.shape(i === 0 ? 1.8 : 0.6), 1.0, [cream, cream]), wg.conf, y - 0.5);
    });
  }
  // Roof garden around the tower.
  put(extrudeUp(roundedRect({ x0: -12, x1: 28, z0: -40, z1: 30 }, [2, 2, 12, 12]), 0.3, [garden, cream]), 'med', PODIUM + 0.5);
  const sbp = put(new THREE.Mesh(new THREE.PlaneGeometry(22, 1.6), new THREE.MeshStandardMaterial({
    map: lettersTexture('SOCIETY BUSINESS PARK', '#8a3b2e', '600 64px "Helvetica Neue", Arial, sans-serif'),
    transparent: true, alphaTest: 0.3,
  })), 'med', 6.6);
  sbp.position.set((FRONT_WING.x0 + FRONT_WING.x1) / 2, sbp.position.y, FRONT_WING.z1 + 1.9);

  // ---- the shell: the mall's rounded west end, six levels ----
  const S = SHELL;
  put(extrudeUp(racetrack(S.x, S.z, S.len - 3, S.w / 2 - 1.5), 5, [roof, shops]), 'med');
  put(extrudeUp(racetrack(S.x, S.z, S.len - 2.4, S.w / 2 - 1.2), S.levels * S.level, [roof, louvres]), 'high', 5);
  for (let i = 0; i <= S.levels; i++) {
    const grow = i === 0 ? 1.1 : 0.4;
    put(extrudeUp(racetrack(S.x, S.z, S.len, S.w / 2, grow), 1.1, [cream, cream]), 'high', 5 + i * S.level - 0.55);
  }
  const shellTop = 5 + S.levels * S.level + 0.55;
  put(extrudeUp(racetrack(S.x, S.z, S.len * 0.55, S.w * 0.35), 3, [roof, cream]), 'low', shellTop);
  const shellWords = put(new THREE.Mesh(new THREE.PlaneGeometry(30, 2.4), new THREE.MeshStandardMaterial({
    map: lettersTexture('SOCIETY BUSINESS PARK', '#8a3b2e', '600 64px "Helvetica Neue", Arial, sans-serif'),
    transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
  })), 'med', shellTop + 1.4);
  shellWords.rotation.y = -Math.PI / 2; // along the south long face
  shellWords.position.set(S.x - S.w / 2 + 0.5, shellWords.position.y, S.z + 2);

  // ---- the tower, standing on the podium roof ----
  const hw = HGI.w / 2, z0 = -HGI.len / 2, z1 = HGI.len / 2;
  const glow = windowGlow(32, FLOORS, 61, { litFraction: 0.6, glassTop: 0.04, glassH: 0.32 });
  glow.repeat.set(1 / 64, 1 / (FLOORS * FLOOR));
  const slabMat = new THREE.MeshStandardMaterial({
    map: slabTexture(), roughness: 0.45, metalness: 0.25, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTexture(), roughness: 0.18, metalness: 0.6, emissive: 0xffd8a8, emissiveIntensity: 0, side: THREE.DoubleSide,
  });
  put(extrudeUp(chamfered(hw, z0, z1, 1.6), FLOORS * FLOOR, [roof, slabMat]), 'high', BASE);
  const ledge = chamfered(hw + 0.6, z0 - 0.6, z1 + 0.6, 1.9);
  for (let i = 0; i <= FLOORS; i++) put(extrudeUp(ledge, 0.28, [creamRose, creamRose]), 'med', BASE + i * FLOOR - 0.1);

  // Spine up the middle of the east end, proud of the face.
  const SPINE_W = 6, SPINE_OUT = 2.5;
  put(extrudeUp(roundedRect({ x0: -SPINE_W / 2, x1: SPINE_W / 2, z0: z1 - 1, z1: z1 + SPINE_OUT }, [0, 0, 1.2, 1.2]), FLOORS * FLOOR, [roof, spineMat]), 'high', BASE);

  // Above the roof the spine arcs back over the tower (a quarter-ellipse band)...
  const zc = z0 + 12, ARC_H = 20, BAND = 3.2;
  const aOut = z1 + SPINE_OUT - zc, aIn = aOut - BAND, bOut = ARC_H, bIn = ARC_H - BAND;
  const arcPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * (Math.PI / 2);
    arcPts.push([zc + aOut * Math.cos(t), bOut * Math.sin(t)]);
  }
  for (let i = 24; i >= 0; i--) {
    const t = (i / 24) * (Math.PI / 2);
    arcPts.push([zc + aIn * Math.cos(t), Math.max(0, bIn * Math.sin(t))]);
  }
  put(sideProfile(arcPts, SPINE_W, spineMat), 'high', TOP);
  // ...into a raked glass sail rising to its peak over the west end.
  const PEAK = 25;
  put(sideProfile([[z0 + 1, 0], [zc + 0.5, 0], [zc + 0.5, ARC_H], [z0 + 1, PEAK]], SPINE_W - 2.5, spineMat), 'high', TOP);

  // Roof box with the red Hilton sign, under the arc.
  const box = put(new THREE.Mesh(new THREE.BoxGeometry(HGI.w - 4, 3.5, 9), new THREE.MeshStandardMaterial({ color: 0x2f2926, roughness: 0.6 })), 'med', TOP + 1.75);
  box.position.z = 5.5;
  const signMat = new THREE.MeshStandardMaterial({
    map: lettersTexture('Hilton', '#e0312f', 'bold 96px Georgia, serif'), transparent: true, alphaTest: 0.3, emissive: 0xff3b30, emissiveIntensity: 0,
  });
  const sign = put(new THREE.Mesh(new THREE.PlaneGeometry(7, 1.7), signMat), 'med', TOP + 1.9);
  sign.rotation.y = -Math.PI / 2; // south face
  sign.position.set(-(HGI.w - 4) / 2 - 0.05, sign.position.y, 5.5);

  // Collision footprints in world coordinates: the two wings and the shell.
  f.updateMatrixWorld(true);
  const toWorld = (shape) => shape.getPoints(6).flatMap((p) => {
    const w = f.localToWorld(new THREE.Vector3(p.x, 0, -p.y));
    return [w.x, w.z];
  });

  return {
    group: f,
    frame: f,
    footprints: [toWorld(wings[0].shape(0)), toWorld(wings[1].shape(0)), toWorld(racetrack(S.x, S.z, S.len, S.w / 2))],
    setNight(n) {
      slabMat.emissiveIntensity = n * 1.2;
      spineMat.emissiveIntensity = n * 0.25;
      signMat.emissiveIntensity = n * 2;
      louvres.emissiveIntensity = n * 0.3;
      shops.emissiveIntensity = n * 0.8;
    },
  };
}
