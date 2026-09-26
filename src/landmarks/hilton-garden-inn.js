// Society Business Park, west of Cairo Road: the Hilton Garden Inn tower and
// the curved "shell" building beside it.
//
// Tower (OSM way 1185077883, 25 x 18 m): a slab with faceted corners, every
// floor a projecting rose-cream spandrel over dark bronze glass; the east end
// is a shallow curve of gold glass running full height; on the roof a set-back
// box with the red Hilton sign, and behind it two curved gold-glass fins that
// sweep up from the east end to a tall point over the west end.
// Shell (not in OSM; measured on imagery): a racetrack-plan block, six floors
// of rounded cream bands with louvred glass between, over shops, lettered
// SOCIETY BUSINESS PARK on top. Sources: docs/landmarks/hilton-garden-inn.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { canvasTex, siteFrame, windowGlow } from './lib.js';

// Frames: local +z points east along the long axis (bearing 80), +x north.
export const HGI = { x: -2970.0, z: 2816.0, bearing: 80, w: 18, len: 25 };
export const SHELL = { x: -3050.0, z: 2822.0, bearing: 80, len: 56, w: 34 };
const LOBBY = 5.5, FLOOR = 3.3, FLOORS = 21;
const TOP = LOBBY + FLOORS * FLOOR; // ~75 m
const GLASS_END = 9.5; // where the banded slab meets the curved glass east end

// ---------- shapes (local x/z, extruded upward) ----------
function extrudeUp(shape, height, materials) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2); // shape (x, y) -> local (x, -z), extruded up
  return new THREE.Mesh(geo, materials);
}

// Chamfered rectangle: x half-width hw, z from z0 to z1, corners cut by c.
function chamfered(hw, z0, z1, c) {
  const pts = [[-hw + c, z0], [hw - c, z0], [hw, z0 + c], [hw, z1 - c], [hw - c, z1], [-hw + c, z1], [-hw, z1 - c], [-hw, z0 + c]];
  return new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
}

// Racetrack: straight length along z, semicircular ends of radius r.
function racetrack(len, r) {
  const half = len / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(-r, half);
  s.absarc(0, half, r, Math.PI, 0, true);
  s.lineTo(r, -half);
  s.absarc(0, -half, r, 0, Math.PI, true);
  s.closePath();
  return s;
}

// ---------- textures (extrude UVs are in metres) ----------
function slabTexture() {
  const t = canvasTex(128, 110, (g, w, h) => {
    g.fillStyle = '#2e2522'; // bronze glass
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h * 0.5);
    grad.addColorStop(0, 'rgba(220,170,120,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h * 0.38);
    g.fillStyle = '#4a3a33';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h * 0.38);
    const band = g.createLinearGradient(0, h * 0.38, 0, h);
    band.addColorStop(0, '#dcb9a6');
    band.addColorStop(1, '#b88e7c'); // canted spandrel: lit above, shaded below
    g.fillStyle = band;
    g.fillRect(0, h * 0.38, w, h * 0.62);
  });
  t.repeat.set(1 / 4, 1 / FLOOR);
  return t;
}

function goldGlass(sx, sy) {
  const t = canvasTex(64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d9a45a');
    grad.addColorStop(0.5, '#a8743c');
    grad.addColorStop(1, '#6f4a2c');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,40,25,0.8)';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, 0, 2, h);
  });
  t.repeat.set(sx, sy);
  return t;
}

function shellBandTexture() {
  const t = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#39424a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b8b2a4'; // vertical louvres
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, w, 10);
  });
  t.repeat.set(1 / 2, 1 / 3.8);
  return t;
}

function lettersTexture(text, colour, font) {
  const t = canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = colour;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  }, { repeat: false });
  return t;
}

// A thin vertical fin in the local y/z plane, profile y = f(z) over [z0, z1].
function fin(z0, z1, profile, thickness, mat) {
  const s = new THREE.Shape();
  s.moveTo(z0, 0);
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    s.lineTo(z, profile(z));
  }
  s.lineTo(z1, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // shape x -> local z, extrusion -> local -x
  return new THREE.Mesh(geo, mat);
}

// ---------- tower ----------
function tower() {
  const f = siteFrame(HGI.x, HGI.z, HGI.bearing);
  f.name = 'hilton-garden-inn';
  const put = (mesh, conf, y = 0) => {
    mesh.position.y += y;
    f.add(tag(mesh, conf));
    return mesh;
  };
  const hw = HGI.w / 2, z0 = -HGI.len / 2, z1 = HGI.len / 2;
  const roof = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.9 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xd7b8a6, roughness: 0.7 });
  const glow = windowGlow(32, FLOORS, 61, { litFraction: 0.6, glassTop: 0.04, glassH: 0.32 });
  glow.repeat.set(1 / 64, 1 / (FLOORS * FLOOR));
  const slabMat = new THREE.MeshStandardMaterial({
    map: slabTexture(), roughness: 0.45, metalness: 0.25, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0,
  });
  const gold = new THREE.MeshStandardMaterial({
    map: goldGlass(1 / 2, 1 / 2.4), roughness: 0.15, metalness: 0.7, emissive: 0xffb866, emissiveIntensity: 0, side: THREE.DoubleSide,
  });

  // Banded slab with faceted corners, and a projecting ledge at every floor.
  put(extrudeUp(chamfered(hw, z0, GLASS_END, 1.6), FLOORS * FLOOR, [roof, slabMat]), 'high', LOBBY);
  const ledge = chamfered(hw + 0.6, z0 - 0.6, GLASS_END, 1.9);
  for (let i = 0; i <= FLOORS; i++) put(extrudeUp(ledge, 0.28, [cream, cream]), 'med', LOBBY + i * FLOOR - 0.1);

  // Curved gold-glass east end, full height.
  const arc = new THREE.Shape();
  arc.moveTo(-hw, -GLASS_END);
  arc.quadraticCurveTo(0, -(z1 + 1.5), hw, -GLASS_END);
  arc.closePath();
  put(extrudeUp(arc, FLOORS * FLOOR + 3, [roof, gold]), 'high', LOBBY);

  // Roof: set-back box with the red sign on the south face, then the fins.
  const box = put(new THREE.Mesh(new THREE.BoxGeometry(12, 5, 14), new THREE.MeshStandardMaterial({ color: 0x2f2926, roughness: 0.6 })), 'med', TOP + 2.5);
  box.position.z = -3;
  const sign = put(new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshStandardMaterial({
    map: lettersTexture('Hilton', '#e0312f', 'bold 96px Georgia, serif'), transparent: true, alphaTest: 0.3,
    emissive: 0xff3b30, emissiveIntensity: 0,
  })), 'med', TOP + 2.8);
  sign.rotation.y = -Math.PI / 2; // south face is local -x
  sign.position.set(-6.05, sign.position.y, -3);
  // Outer fin: rises from the east end to a tall point over the west end.
  const outer = (z) => 24 * Math.sqrt(Math.max(0, 1 - ((z - (z0 + 1.5)) / (z1 + 3 - (z0 + 1.5))) ** 2));
  put(fin(z0 + 1.5, z1 + 3, outer, 0.9, gold), 'high', TOP).position.x = hw - 0.5;
  // West edge of the outer fin: near-vertical from the roof up to the point.
  put(fin(z0, z0 + 1.5, (z) => 24 * ((z - z0) / 1.5), 0.9, gold), 'med', TOP).position.x = hw - 0.5;
  // Inner fin: lower and rounder, set in from the south face.
  const inner = (z) => 15 * Math.sqrt(Math.max(0, 1 - ((z - (z0 + 7)) / (z1 + 2 - (z0 + 7))) ** 2));
  const innerFin = put(fin(z0 + 7, z1 + 2, inner, 0.7, gold), 'med', TOP);
  innerFin.position.x = -hw + 3.5;
  // Lattice ribs tying the fins together.
  for (let z = z0 + 4; z < z1; z += 3) {
    const h = Math.min(outer(z), inner(z) || outer(z)) - 0.5;
    if (h <= 1) continue;
    const rib = put(new THREE.Mesh(new THREE.BoxGeometry(HGI.w - 4, 0.25, 0.25), gold), 'low', TOP + h);
    rib.position.set(1, rib.position.y, z);
  }

  // Lobby and canopy with the hotel lettering (south side).
  const lobbyGlass = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.15, metalness: 0.5, emissive: 0xffd9a0, emissiveIntensity: 0 });
  put(extrudeUp(chamfered(hw + 2, z0 - 1, z1 + 1, 2), LOBBY, [roof, lobbyGlass]), 'med');
  const canopy = put(new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, 16), cream), 'low', 4.8);
  canopy.position.x = -hw - 3.5;
  const words = put(new THREE.Mesh(new THREE.PlaneGeometry(14, 1.2), new THREE.MeshStandardMaterial({
    map: lettersTexture('Hilton Garden Inn', '#c8102e', 'italic 600 80px Georgia, serif'), transparent: true, alphaTest: 0.3,
  })), 'low', 4.8);
  words.rotation.y = -Math.PI / 2;
  words.position.set(-hw - 5.05, words.position.y, 0);

  const glowMats = { slabMat, gold, lobbyGlass, sign: sign.material };
  return { frame: f, glowMats };
}

// ---------- shell building ----------
function shell() {
  const f = siteFrame(SHELL.x, SHELL.z, SHELL.bearing);
  f.name = 'society-business-park-shell';
  const put = (mesh, conf, y = 0) => {
    mesh.position.y += y;
    f.add(tag(mesh, conf));
    return mesh;
  };
  const r = SHELL.w / 2;
  const cream = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.7 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xa9a399, roughness: 0.9 });
  const bands = new THREE.MeshStandardMaterial({ map: shellBandTexture(), roughness: 0.5, metalness: 0.2, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const shops = new THREE.MeshStandardMaterial({ color: 0x33393f, roughness: 0.2, metalness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const GROUND = 5, SF = 3.8, N = 6;

  put(extrudeUp(racetrack(SHELL.len - 3, r - 1.5), GROUND, [roof, shops]), 'med');
  put(extrudeUp(racetrack(SHELL.len - 2.4, r - 1.2), N * SF, [roof, bands]), 'high', GROUND);
  for (let i = 0; i <= N; i++) {
    // rounded cream bands, the lowest deepest (the curved balconies at street level)
    const grow = i === 0 ? 2.2 : 0.8;
    put(extrudeUp(racetrack(SHELL.len + grow, r + grow / 2), 1.1, [cream, cream]), 'high', GROUND + i * SF - 0.55);
  }
  const top = GROUND + N * SF + 0.55;
  put(extrudeUp(racetrack(SHELL.len * 0.55, r * 0.7), 3, [roof, cream]), 'low', top);
  const letters = put(new THREE.Mesh(new THREE.PlaneGeometry(30, 2.4), new THREE.MeshStandardMaterial({
    map: lettersTexture('SOCIETY BUSINESS PARK', '#8a3b2e', '600 64px "Helvetica Neue", Arial, sans-serif'),
    transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
  })), 'med', top + 1.4);
  letters.rotation.y = -Math.PI / 2; // along the south long face
  letters.position.set(-r + 0.5, letters.position.y, 2);

  // Footprint for walk collisions (local racetrack -> world).
  f.updateMatrixWorld(true);
  const footprint = racetrack(SHELL.len + 2, r + 1).getPoints(8).flatMap((p) => {
    const w = f.localToWorld(new THREE.Vector3(p.x, 0, -p.y));
    return [w.x, w.z];
  });
  return { frame: f, footprint, glowMats: { bands, shops } };
}

export function buildHiltonGardenInn() {
  const group = new THREE.Group();
  group.name = 'society-business-park';
  const t = tower();
  const s = shell();
  group.add(t.frame, s.frame);
  const towerFootprint = [[-2984.1, 2809.3], [-2980.8, 2827.1], [-2955.8, 2822.5], [-2959.1, 2804.7]].flat();
  return {
    group,
    frame: t.frame,
    footprints: [towerFootprint, s.footprint],
    setNight(n) {
      t.glowMats.slabMat.emissiveIntensity = n * 1.2;
      t.glowMats.gold.emissiveIntensity = n * 0.25;
      t.glowMats.lobbyGlass.emissiveIntensity = n * 0.8;
      t.glowMats.sign.emissiveIntensity = n * 2;
      s.glowMats.bands.emissiveIntensity = n * 0.3;
      s.glowMats.shops.emissiveIntensity = n * 0.8;
    },
  };
}
