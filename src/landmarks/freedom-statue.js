// Freedom Statue, Independence Avenue, in front of Government Complex:
// a bronze man in torn vest and shorts, legs braced, both fists raised
// overhead breaking his chains, on a rock atop a white pedestal lettered
// FREEDOM (plaque: monument to freedom fighters, unveiled by Kenneth Kaunda
// on the tenth independence anniversary). Railed plaza, brick walkway with
// flagpoles out to the avenue. Sources: docs/landmarks/independence-avenue.md.
import * as THREE from 'three';
import { zambiaFlagTexture } from '../textures.js';
import { tag } from '../util.js';
import { canvasTex, chain, limb, siteFrame } from './lib.js';

// OSM node 1150426134; faces the avenue (bearing 171).
export const STATUE = { x: -1997.2, z: 3389.5, bearing: 171 };
const WALK_LEN = 49; // to the kerb of Independence Avenue

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// The figure in a 1.9 m human frame (y up, facing +z), scaled up afterwards.
function figure(bronze) {
  const g = new THREE.Group();
  const J = {
    footL: V(-0.3, 0.06, 0.34), footR: V(0.36, 0.06, -0.36),
    kneeL: V(-0.3, 0.5, 0.3), kneeR: V(0.3, 0.5, -0.16),
    hipL: V(-0.16, 0.96, 0), hipR: V(0.16, 0.96, 0),
    pelvis: V(0, 1.0, 0), chest: V(0, 1.42, 0.02), neck: V(0, 1.6, 0.02),
    head: V(0, 1.76, 0.05),
    shL: V(-0.25, 1.52, 0), shR: V(0.25, 1.52, 0),
    elL: V(-0.55, 1.7, 0.05), elR: V(0.53, 1.74, 0.02),
    fistL: V(-0.47, 2.06, 0.1), fistR: V(0.44, 2.1, 0.06),
  };
  const add = (m) => g.add(m);
  // legs: shins, thighs (thicker at the top for the shorts)
  add(limb(J.footL, J.kneeL, 0.065, bronze));
  add(limb(J.footR, J.kneeR, 0.065, bronze));
  add(limb(J.kneeL, J.hipL, 0.085, bronze));
  add(limb(J.kneeR, J.hipR, 0.085, bronze));
  add(limb(J.kneeL.clone().lerp(J.hipL, 0.45), J.hipL, 0.11, bronze));
  add(limb(J.kneeR.clone().lerp(J.hipR, 0.45), J.hipR, 0.11, bronze));
  // feet
  for (const [f, dz] of [[J.footL, 0.1], [J.footR, 0.1]]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.26), bronze);
    foot.position.copy(f).add(V(0, -0.03, dz));
    add(foot);
  }
  // pelvis and torso (flattened front to back), chest broader
  const hips = limb(J.hipL, J.hipR, 0.14, bronze);
  add(hips);
  const torso = limb(J.pelvis, J.chest, 0.17, bronze);
  torso.scale.set(1, 1, 0.75);
  add(torso);
  const chest = limb(J.shL.clone().add(V(0.06, -0.06, 0)), J.shR.clone().add(V(-0.06, -0.06, 0)), 0.14, bronze);
  add(chest);
  add(limb(J.chest, J.neck, 0.06, bronze));
  // head tipped back, shouting
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), bronze);
  head.scale.set(0.9, 1.1, 1);
  head.position.copy(J.head);
  add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.08), bronze);
  jaw.position.copy(J.head).add(V(0, -0.11, 0.05));
  jaw.rotation.x = 0.35;
  add(jaw);
  // arms raised, forearms up, fists clenched
  add(limb(J.shL, J.elL, 0.07, bronze));
  add(limb(J.shR, J.elR, 0.07, bronze));
  add(limb(J.elL, J.fistL, 0.058, bronze));
  add(limb(J.elR, J.fistR, 0.058, bronze));
  for (const f of [J.fistL, J.fistR]) {
    const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075), bronze);
    fist.position.copy(f);
    add(fist);
  }
  // broken chains: a stub above each fist, a length hanging outside each arm
  add(chain([J.fistL, J.fistL.clone().add(V(-0.12, 0.2, 0)), J.fistL.clone().add(V(-0.28, 0.26, 0.02))], bronze));
  add(chain([J.fistL, V(-0.6, 1.88, 0.14), V(-0.64, 1.6, 0.14), V(-0.6, 1.4, 0.12)], bronze));
  add(chain([J.fistR, J.fistR.clone().add(V(0.14, 0.18, 0)), J.fistR.clone().add(V(0.3, 0.2, -0.02))], bronze));
  add(chain([J.fistR, V(0.6, 1.9, 0.1), V(0.63, 1.62, 0.1), V(0.58, 1.44, 0.08)], bronze));
  // rock underfoot
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), bronze);
  rock.scale.set(1.25, 0.28, 1.05);
  rock.position.y = 0.02;
  add(rock);
  return g;
}

function letteringTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#f2efe8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b9b4aa';
    g.fillRect(0, h * 0.62, w, h * 0.38); // weathered lower band
    g.fillStyle = '#2e2620';
    g.font = '600 150px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('FREEDOM', w / 2, h * 0.36);
    g.fillStyle = '#8f949a';
    g.fillRect(w * 0.37, h * 0.68, w * 0.26, h * 0.26); // plaque
  }, { repeat: false });
}

function railing(mat, size, gateWidth) {
  const g = new THREE.Group();
  const half = size / 2;
  const bars = [];
  const perimeter = [
    [[-half, -half], [half, -half]], [[half, -half], [half, half]],
    [[half, half], [gateWidth / 2, half]], [[-gateWidth / 2, half], [-half, half]],
    [[-half, half], [-half, -half]],
  ];
  for (const [[x0, z0], [x1, z1]] of perimeter) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(len / 0.2);
    for (let i = 0; i <= n; i++) bars.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), mat);
    rail.position.set((x0 + x1) / 2, 1.35, (z0 + z1) / 2);
    rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    g.add(rail);
  }
  const bar = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 1.5, 0.025), mat, bars.length);
  const m = new THREE.Matrix4();
  bars.forEach(([x, z], i) => bar.setMatrixAt(i, m.makeTranslation(x, 0.75, z)));
  g.add(bar);
  return g;
}

export function buildFreedomStatue() {
  const f = siteFrame(STATUE.x, STATUE.z, STATUE.bearing);
  f.name = 'freedom-statue';
  const bronze = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, metalness: 0.65, roughness: 0.42 });
  const white = new THREE.MeshStandardMaterial({ color: 0xefece6, roughness: 0.8 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb4b0a8, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.6, metalness: 0.4 });
  const brick = new THREE.MeshStandardMaterial({ color: 0xa4674d, roughness: 0.95 });
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };

  // Plaza, steps, pedestal with lettering on the avenue side and relief sides.
  put(new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), brick), 'high').position.y = 0.1;
  put(new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 3.4), white), 'med').position.y = 0.35;
  put(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.7), white), 'med').position.y = 0.65;
  const ped = put(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 1.8), [
    new THREE.MeshStandardMaterial({ color: 0x5b4a39, roughness: 0.7, metalness: 0.3 }), // relief panel
    new THREE.MeshStandardMaterial({ color: 0x5b4a39, roughness: 0.7, metalness: 0.3 }),
    white, white,
    new THREE.MeshStandardMaterial({ map: letteringTexture(), roughness: 0.8 }),
    white,
  ]), 'high');
  ped.position.y = 0.8 + 1.2;
  const top = put(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.0), white), 'med');
  top.position.y = 3.3;

  const fig = figure(bronze);
  fig.scale.setScalar(1.65);
  fig.position.y = 3.4;
  put(fig, 'med');

  // Railing with a gate towards the avenue, square concrete gateposts.
  put(railing(iron, 9, 2.4), 'high');
  for (const x of [-1.6, 1.6]) {
    const post = put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.1, 0.7), grey), 'high');
    post.position.set(x, 1.05, 4.5);
  }

  // Brick walkway to the avenue, flagpoles either side, lawns.
  const walk = put(new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, WALK_LEN - 6), brick), 'high');
  walk.position.set(0, 0.06, 6 + (WALK_LEN - 6) / 2);
  const kerb = new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.9 });
  for (const x of [-4.1, 4.1]) {
    const k = put(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, WALK_LEN - 6), kerb), 'med');
    k.position.set(x, 0.1, 6 + (WALK_LEN - 6) / 2);
  }
  const lawn = new THREE.MeshStandardMaterial({ color: 0x5d8f3a, roughness: 1 });
  for (const x of [-15, 15]) {
    const l = put(new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, WALK_LEN - 4), lawn), 'med');
    l.position.set(x, 0.05, 4 + (WALK_LEN - 4) / 2);
  }
  const pole = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.4, roughness: 0.4 });
  const flag = new THREE.MeshStandardMaterial({ map: zambiaFlagTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  for (const z of [WALK_LEN - 12, WALK_LEN - 4]) {
    for (const x of [-5.5, 5.5]) {
      const p = put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 8, 8), pole), 'high');
      p.position.set(x, 4, z);
      const c = put(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), flag), 'med');
      c.position.set(x + Math.sign(x) * 0.95, 7.3, z);
    }
  }

  // The big tree beside the plaza, trunk painted white at the base.
  const trunk = put(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 5, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 })), 'med');
  trunk.position.set(6.8, 2.5, 3);
  const paint = put(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 1.4, 8), white), 'med');
  paint.position.set(6.8, 0.7, 3);
  const crown = put(new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), new THREE.MeshStandardMaterial({ color: 0x3b6a2c, roughness: 1, flatShading: true })), 'med');
  crown.scale.set(1, 0.7, 1);
  crown.position.set(7.5, 7.5, 2);

  return { group: f };
}
