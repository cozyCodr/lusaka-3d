// The hilltop site: sloping lawns, the terraced approach walkway with red lamp
// posts, palms, flagpoles, the Parliament Rd turning circle, and neighbours.
import * as THREE from 'three';
import { DIM } from './building.js';
import { pavingTexture, zambiaFlagTexture } from './textures.js';
import { rng, smoothstep, tag } from './util.js';

const FRONT = DIM.ringD / 2; // z of the front facade
const WALK = { start: FRONT + 6, end: FRONT + 62, width: 9, drop: 4.5, steps: 14 };

// Ground height: flat hilltop, falling toward the road in front.
export function groundHeight(x, z) {
  const slope = -WALK.drop * smoothstep((z - WALK.start) / (WALK.end - WALK.start));
  const roll = Math.sin(x * 0.03) * Math.cos(z * 0.025) * 0.6 * smoothstep((Math.abs(x) - 60) / 60);
  return slope + roll;
}

function terrain() {
  const size = 520, seg = 160;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const r = rng(5);
  const base = new THREE.Color(0x5d8a3a);
  const dry = new THREE.Color(0x9a9a55);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    const c = base.clone().lerp(dry, Math.min(1, Math.max(0, (Math.hypot(x, z) - 90) / 160)) * 0.8 + r() * 0.12);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.userData.conf = 'ground';
  return mesh;
}

function walkway(paving) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9 });

  // Forecourt between the facade and the first step.
  const fc = new THREE.Mesh(new THREE.BoxGeometry(34, 1, WALK.start - FRONT + 0.5), mat);
  fc.position.set(0, -0.48, (FRONT + WALK.start) / 2);
  fc.material.map.repeat.set(8, 2);
  g.add(fc);

  const len = (WALK.end - WALK.start) / WALK.steps;
  for (let i = 0; i < WALK.steps; i++) {
    const z0 = WALK.start + i * len;
    const top = groundHeight(0, z0) + 0.05;
    const m = mat.clone();
    m.map = paving.clone();
    m.map.repeat.set(2.2, len / 4);
    const step = new THREE.Mesh(new THREE.BoxGeometry(WALK.width, 3, len), m);
    step.position.set(0, top - 1.5, z0 + len / 2);
    g.add(step);
  }
  return tag(g, 'high');
}

function lamps() {
  const g = new THREE.Group();
  const pole = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5 });
  const globe = new THREE.MeshStandardMaterial({ color: 0xfff4de, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 4.2, 10);
  const globeGeo = new THREE.SphereGeometry(0.32, 16, 12);
  const len = (WALK.end - WALK.start) / WALK.steps;
  for (let i = 0; i < WALK.steps; i += 2) {
    const z = WALK.start + i * len + len / 2;
    for (const x of [-WALK.width / 2 - 0.9, WALK.width / 2 + 0.9]) {
      const y = groundHeight(x, z);
      const p = new THREE.Mesh(poleGeo, pole);
      p.position.set(x, y + 2.1, z);
      const b = new THREE.Mesh(globeGeo, globe);
      b.position.set(x, y + 4.4, z);
      g.add(p, b);
    }
  }
  tag(g, 'high');
  return { group: g, globe };
}

function shrubs() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f5a24, roughness: 1 });
  const geo = new THREE.IcosahedronGeometry(0.7, 1);
  const r = rng(9);
  for (let z = WALK.start + 1; z < WALK.end; z += 2.4) {
    for (const x of [-WALK.width / 2 - 2.4, WALK.width / 2 + 2.4]) {
      const s = new THREE.Mesh(geo, mat);
      s.position.set(x + (r() - 0.5) * 0.4, groundHeight(x, z) + 0.45, z);
      s.scale.setScalar(0.8 + r() * 0.4);
      g.add(s);
    }
  }
  return tag(g, 'high');
}

// Low-poly palm: tapered, slightly leaning trunk and drooping fronds.
function palmFactory() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e5a45, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f6e2a, roughness: 0.9, side: THREE.DoubleSide });
  const frondGeo = new THREE.PlaneGeometry(1.1, 5, 1, 8);
  frondGeo.translate(0, 2.5, 0);
  const p = frondGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / 5;
    p.setZ(i, -t * t * 2.4);
    p.setX(i, p.getX(i) * (1 - t * 0.85));
  }
  frondGeo.rotateX(-Math.PI / 2 + 0.5);
  frondGeo.computeVertexNormals();

  return (h, r) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 8, 1), trunkMat);
    trunk.position.y = h / 2;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.y = h;
    const n = 11;
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      f.rotation.y = (i / n) * Math.PI * 2 + r() * 0.3;
      f.rotation.x = (r() - 0.5) * 0.3;
      crown.add(f);
    }
    g.add(crown);
    g.rotation.z = (r() - 0.5) * 0.12;
    g.rotation.x = (r() - 0.5) * 0.12;
    return g;
  };
}

function palms() {
  const g = new THREE.Group();
  const r = rng(21);
  const make = palmFactory();
  const spots = [];
  for (let x = 12; x <= 40; x += 7) spots.push([x, FRONT + 3.5], [-x, FRONT + 3.5]);
  for (const [x, z] of [[18, 52], [-20, 50], [27, 64], [-29, 66], [45, 40], [-46, 42]]) spots.push([x, FRONT + z - 30]);
  for (const [x, z] of spots) {
    const p = make(9 + r() * 4, r);
    p.position.set(x, groundHeight(x, z), z);
    g.add(p);
  }
  return tag(g, 'high');
}

function flags() {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.4 });
  const flagMat = new THREE.MeshStandardMaterial({ map: zambiaFlagTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  const cloths = [];
  for (let i = 0; i < 6; i++) {
    const x = -48 + i * 3.2, z = FRONT + 30;
    const y = groundHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 10, 8), poleMat);
    pole.position.set(x, y + 5, z);
    const geo = new THREE.PlaneGeometry(2.4, 1.6, 16, 6);
    geo.translate(1.2, 0, 0);
    const cloth = new THREE.Mesh(geo, flagMat);
    cloth.position.set(x + 0.06, y + 9, z);
    cloth.rotation.y = -0.6;
    cloth.userData.base = geo.attributes.position.array.slice();
    cloth.userData.phase = i * 0.7;
    cloths.push(cloth);
    g.add(pole, cloth);
  }
  tag(g, 'med');
  return {
    group: g,
    update(t) {
      for (const c of cloths) {
        const pos = c.geometry.attributes.position;
        const b = c.userData.base;
        for (let i = 0; i < pos.count; i++) {
          const x = b[i * 3];
          const k = x / 2.4;
          pos.array[i * 3 + 2] = Math.sin(x * 2.2 - t * 5 + c.userData.phase) * 0.18 * k;
          pos.array[i * 3 + 1] = b[i * 3 + 1] - k * k * 0.12;
        }
        pos.needsUpdate = true;
        c.geometry.computeVertexNormals();
      }
    },
  };
}

function road() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x3b3b3d, roughness: 0.95 });
  const g = new THREE.Group();
  const y = -WALK.drop + 0.06;
  const zc = WALK.end + 14;
  const ring = new THREE.Mesh(new THREE.RingGeometry(9, 16, 48), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, y, zc);
  const island = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: 0x5f8f3c, roughness: 1 }),
  );
  island.rotation.x = -Math.PI / 2;
  island.position.set(0, y - 0.01, zc);
  const link = new THREE.Mesh(new THREE.PlaneGeometry(8, 9), mat);
  link.rotation.x = -Math.PI / 2;
  link.position.set(0, y + 0.01, WALK.end + 2);
  // Parliament Rd running across the front, parallel to the facade.
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), mat);
  rd.rotation.x = -Math.PI / 2;
  rd.position.set(0, y - 0.02, zc + 22);
  g.add(ring, island, link, rd);
  return tag(g, 'high', { cast: false });
}

// Neighbours from the satellite view, as plain massing.
function neighbours() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.9 });

  // SW courtyard office block: behind and toward the NW end (+x).
  const office = new THREE.Group();
  const [ow, od, oh, ot] = [68, 57, 12, 13];
  for (const [w, d, x, z] of [
    [ow, ot, 0, od / 2 - ot / 2], [ow, ot, 0, -od / 2 + ot / 2],
    [ot, od - 2 * ot, ow / 2 - ot / 2, 0], [ot, od - 2 * ot, -ow / 2 + ot / 2, 0],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, oh, d), wall);
    b.position.set(x, oh / 2, z);
    office.add(b);
  }
  office.position.set(92, 0, -68);
  office.rotation.y = 0.12;
  g.add(office);

  // Newer octagonal building with a green pyramidal roof: behind, toward -x.
  const oct = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 10, 8), wall);
  base.position.y = 5;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(24, 9, 8),
    new THREE.MeshStandardMaterial({ color: 0x7fa88a, roughness: 0.6, metalness: 0.2 }),
  );
  roof.position.y = 14.5;
  oct.add(base, roof);
  oct.position.set(-38, 0, -95);
  oct.rotation.y = Math.PI / 8;
  g.add(oct);
  return tag(g, 'low');
}

function trees(avoid) {
  const g = new THREE.Group();
  const r = rng(33);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2e5325, roughness: 1, flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: 0x4b3a2b, roughness: 1 });
  const canopy = new THREE.IcosahedronGeometry(1, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1, 6);
  let placed = 0;
  while (placed < 140) {
    const x = (r() - 0.5) * 420, z = (r() - 0.5) * 420;
    if (avoid(x, z)) continue;
    const s = 3 + r() * 4;
    const y = groundHeight(x, z);
    const t = new THREE.Mesh(trunkGeo, bark);
    t.scale.y = s * 0.8;
    t.position.set(x, y + s * 0.4, z);
    const c = new THREE.Mesh(canopy, leaf);
    c.scale.set(s, s * 0.8, s);
    c.position.set(x, y + s * 1.2, z);
    g.add(t, c);
    placed++;
  }
  return tag(g, 'low');
}

export function buildSite() {
  const g = new THREE.Group();
  const paving = pavingTexture();
  const lampSet = lamps();
  const flagSet = flags();

  const avoid = (x, z) =>
    (Math.abs(x) < 62 && z > -52 && z < WALK.end + 45) || // building, lawns, walkway, road
    (x > 45 && x < 140 && z < -25 && z > -110) || // office block
    (Math.hypot(x + 38, z + 95) < 32) || // octagon
    Math.abs(z - (WALK.end + 36)) < 8; // Parliament Rd

  g.add(terrain(), walkway(paving), lampSet.group, shrubs(), palms(), flagSet.group, road(), neighbours(), trees(avoid));

  return {
    group: g,
    walk: WALK,
    setNight(n) {
      lampSet.globe.emissiveIntensity = n * 6;
    },
    update(t) {
      flagSet.update(t);
    },
  };
}
