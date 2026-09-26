// Hilton Garden Inn, Society Business Park, west of Cairo Road (OSM way
// 1185077883, 25 x 18 m): a slab tower of warm grey-bronze spandrel bands and
// dark ribbon glazing; its east end (towards Cairo Road) is a curved blue
// glass half-drum that rises past the roof into a tall glass sail. At the
// foot, a glazed lobby under a curved canopy with the red hotel lettering.
// Sources: docs/landmarks/hilton-garden-inn.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { canvasTex, faced, siteFrame, windowGlow } from './lib.js';

// Frame on the OSM centroid; local +z points east along the long axis (80°).
export const HGI = { x: -2970.0, z: 2816.0, bearing: 80, w: 18, len: 25 };
const LOBBY = 5.5, FLOOR = 3.3, FLOORS = 21;
const TOP = LOBBY + FLOORS * FLOOR; // ~75 m
const R = 6.5; // radius of the curved east end, narrower than the slab (photos)
const SLAB_END = HGI.len / 2 - R; // where the slab meets the drum

function bandTexture() {
  const t = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#8c7c6a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#26292c';
    g.fillRect(0, h * 0.12, w, h * 0.5);
    g.fillStyle = 'rgba(170,190,210,0.10)';
    g.fillRect(0, h * 0.12, w, h * 0.15);
    g.fillStyle = '#5b4f44';
    for (let x = 0; x < w; x += 32) g.fillRect(x, h * 0.12, 3, h * 0.5);
    g.fillStyle = 'rgba(255,240,220,0.12)';
    g.fillRect(0, h * 0.62, w, 3);
  });
  return t;
}

function blueGlass(w, h) {
  const t = canvasTex(64, 64, (g, cw, ch) => {
    const grad = g.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#4f7fb8');
    grad.addColorStop(1, '#2a4f86');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = 'rgba(220,230,240,0.55)';
    g.fillRect(0, 0, cw, 2);
    g.fillRect(0, 0, 2, ch);
  });
  t.repeat.set(w / 1.6, h / FLOOR);
  return t;
}

function signTexture() {
  return canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#6f7478';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8102e';
    g.font = 'italic 600 70px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Hilton Garden Inn', w / 2 + 40, h / 2 + 4);
    g.save(); // the leaf mark, as a simple red lozenge pair
    g.translate(w / 2 - 330, h / 2);
    g.rotate(Math.PI / 4);
    g.fillRect(-18, -18, 16, 16);
    g.fillRect(2, 2, 16, 16);
    g.restore();
  }, { repeat: false });
}

export function buildHiltonGardenInn() {
  const f = siteFrame(HGI.x, HGI.z, HGI.bearing);
  f.name = 'hilton-garden-inn';
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };
  const roof = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.9 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbdb6aa, roughness: 0.85 });
  const slabLen = SLAB_END + HGI.len / 2;
  const bandGlow = windowGlow(16, FLOORS, 61, { litFraction: 0.6, glassTop: 0.38, glassH: 0.5 });
  const bandMap = bandTexture();
  bandMap.repeat.set(slabLen / 4, FLOORS); // box UVs are 0..1 per face
  bandGlow.repeat.set(slabLen / 16, 1);
  const bands = new THREE.MeshStandardMaterial({
    map: bandMap, roughness: 0.6, metalness: 0.15, emissive: 0xffffff, emissiveMap: bandGlow, emissiveIntensity: 0,
  });

  // Slab: from the west end to where the drum begins.
  const slab = put(faced(HGI.w, FLOORS * FLOOR, slabLen, bands, roof), 'high');
  slab.position.set(0, LOBBY + (FLOORS * FLOOR) / 2, (SLAB_END - HGI.len / 2) / 2);
  for (let i = 0; i <= FLOORS; i += 3) { // slab edges, every third floor
    const edge = put(new THREE.Mesh(new THREE.BoxGeometry(HGI.w + 0.4, 0.35, slabLen + 0.2), concrete), 'med');
    edge.position.set(0, LOBBY + i * FLOOR, (SLAB_END - HGI.len / 2) / 2);
  }

  // Curved blue glass east end, rising above the roof.
  const drumH = FLOORS * FLOOR + 7;
  const drumMat = new THREE.MeshStandardMaterial({
    map: blueGlass(Math.PI * R, drumH), roughness: 0.12, metalness: 0.55, emissive: 0x9fc3ff, emissiveIntensity: 0,
    side: THREE.DoubleSide,
  });
  const drum = put(new THREE.Mesh(new THREE.CylinderGeometry(R, R, drumH, 32, 1, true, -Math.PI / 2, Math.PI), drumMat), 'high');
  drum.position.set(0, LOBBY + drumH / 2, SLAB_END);
  const cap = put(new THREE.Mesh(new THREE.CircleGeometry(R, 32, 0, Math.PI), roof), 'med');
  cap.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  cap.position.set(0, LOBBY + drumH, SLAB_END);

  // The sail: a tall tapering glass blade on the drum's outer face.
  const sailShape = new THREE.Shape([
    new THREE.Vector2(-R * 0.55, 0), new THREE.Vector2(R * 0.55, 0), new THREE.Vector2(0.4, 16), new THREE.Vector2(-0.4, 16),
  ]);
  const sail = put(new THREE.Mesh(new THREE.ExtrudeGeometry(sailShape, { depth: 1.2, bevelEnabled: false }), drumMat), 'med');
  sail.position.set(0, LOBBY + drumH, SLAB_END + R - 1.2);
  // Roof plant on the slab.
  const plant = put(new THREE.Mesh(new THREE.BoxGeometry(10, 3, 9), roof), 'low');
  plant.position.set(0, TOP + 1.5, -4);

  // Lobby: glazed ground floor, curved canopy with the red lettering (south side).
  const lobbyGlass = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.15, metalness: 0.5, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const lobby = put(faced(HGI.w + 4, LOBBY, HGI.len + 2, lobbyGlass, concrete), 'med');
  lobby.position.y = LOBBY / 2;
  const canopy = put(new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.4, 24, 1, false, Math.PI, Math.PI), [new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.5 }), concrete, concrete]), 'low');
  canopy.position.set(-HGI.w / 2 - 2, 4.6, 0);

  const footprint = [[-2984.1, 2809.3], [-2980.8, 2827.1], [-2955.8, 2822.5], [-2959.1, 2804.7]].flat();
  return {
    group: f,
    footprints: [footprint],
    setNight(n) {
      bands.emissiveIntensity = n * 1.2;
      drumMat.emissiveIntensity = n * 0.35;
      lobbyGlass.emissiveIntensity = n * 0.8;
    },
  };
}
