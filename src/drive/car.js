// A drivable car, drawn procedurally: a Toyota Corolla (E140, 2006–2013),
// the commonest saloon on Lusaka's roads. Proportions from the spec sheet:
// 4.54 m long, 1.76 m wide, 1.47 m tall, 2.60 m wheelbase, 1.53 m track,
// 195/65 R15 tyres (0.32 m radius). Local frame: +z is the front, y = 0 is
// the ground under the car at rest, x = 0 the centre line.
import * as THREE from 'three';

export const CAR = {
  length: 4.54, width: 1.76, height: 1.47,
  wheelbase: 2.6, track: 1.53, wheelRadius: 0.32, wheelWidth: 0.2,
};

// Side profiles, [z, y] in metres: the lower body (to the waist, with
// wheel arches), the glasshouse, and the roof panel over it.
const ARCH = 0.42, ARCH_Y = 0.3;
const arch = (cz) => Array.from({ length: 9 }, (_, i) => [cz + ARCH * Math.cos((i / 8) * Math.PI), ARCH_Y + ARCH * Math.sin((i / 8) * Math.PI)]);
const LOWER = [
  [-2.22, 0.36], [-2.22, 0.76], [-2.14, 0.96], [-1.3, 1.02], [1.24, 1.02], [1.95, 0.88], [2.2, 0.74],
  [2.22, 0.42], [2.16, 0.34], ...arch(1.3), ...arch(-1.3), [-2.16, 0.34],
];
const CABIN = [[-1.3, 1.0], [-0.62, 1.42], [0.42, 1.44], [1.24, 1.0]];
const ROOF = [[-0.68, 1.4], [0.48, 1.42], [0.42, 1.48], [-0.6, 1.47]];

function sideShape(points) {
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  return s;
}

// Extrude a side profile across the car's width, centred on x = 0.
function extrudeAcross(points, width, bevel) {
  const g = new THREE.ExtrudeGeometry(sideShape(points), { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  g.translate(0, 0, -(width - 2 * bevel) / 2);
  g.rotateY(-Math.PI / 2); // shape x (car z) -> world z; extrusion -> x
  return g;
}

export function buildCar({ color = 0xb8bcc0 } = {}) {
  const group = new THREE.Group();
  group.name = 'car';
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.32 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2128, metalness: 0.2, roughness: 0.08 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.9, roughness: 0.2 });
  const head = new THREE.MeshStandardMaterial({ color: 0xe8edf0, emissive: 0xfff3d6, emissiveIntensity: 0, roughness: 0.15 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff2010, emissiveIntensity: 0, roughness: 0.3 });

  const body = new THREE.Mesh(extrudeAcross(LOWER, CAR.width - 0.08, 0.04), paint);
  body.castShadow = true;
  const cabin = new THREE.Mesh(extrudeAcross(CABIN, CAR.width - 0.26, 0.03), glass);
  const roof = new THREE.Mesh(extrudeAcross(ROOF, CAR.width - 0.24, 0.02), paint);
  cabin.castShadow = roof.castShadow = true;
  group.add(body, cabin, roof);

  for (const sx of [-1, 1]) {
    const x = sx * (CAR.width / 2 - 0.13);
    // B-pillar
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.09), trim);
    pillar.position.set(x + sx * 0.01, 1.2, -0.1);
    group.add(pillar);
    // door handles and mirrors
    for (const z of [0.5, -0.65]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), chrome);
      h.position.set(sx * (CAR.width / 2 - 0.02), 0.9, z);
      group.add(h);
    }
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), paint);
    mirror.position.set(sx * (CAR.width / 2 + 0.08), 1.08, 1.05);
    group.add(mirror);
    // lights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.05), head);
    hl.position.set(sx * 0.6, 0.79, 2.21);
    hl.rotation.y = sx * 0.12;
    group.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.06), tail);
    tl.position.set(sx * 0.6, 0.84, -2.25);
    group.add(tl);
  }
  // bumpers, grille and plates (Zambia: white front, yellow rear)
  for (const [z, d] of [[2.27, 1], [-2.27, -1]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(CAR.width - 0.1, 0.16, 0.08), trim);
    bumper.position.set(0, 0.42, z);
    group.add(bumper);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: d > 0 ? 0xf2f2ee : 0xf2c932, roughness: 0.5 }));
    plate.position.set(0, d > 0 ? 0.56 : 0.62, z + d * 0.03);
    group.add(plate);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.04), trim);
  grille.position.set(0, 0.66, 2.225);
  group.add(grille);

  // wheels: tyre, rim and hub, each in its own group so it can steer and roll
  const tyreGeo = new THREE.CylinderGeometry(CAR.wheelRadius, CAR.wheelRadius, CAR.wheelWidth, 20);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, CAR.wheelWidth + 0.01, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xa9adb1, metalness: 0.8, roughness: 0.35 });
  const wheels = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { // FL, FR, RL, RR (x: +1 = left of a car facing +z)
    const steer = new THREE.Group();
    steer.position.set((x * CAR.track) / 2, CAR.wheelRadius, (z * CAR.wheelbase) / 2);
    const roll = new THREE.Group();
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    // a spoke so the rolling shows
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(CAR.wheelWidth + 0.02, 0.3, 0.05), rimMat);
    roll.add(tyre, rim, spoke);
    steer.add(roll);
    group.add(steer);
    wheels.push({ steer, roll, rest: steer.position.clone() });
  }

  return {
    group,
    wheels,
    // 0 day … 1 night; brake 0 … 1
    setLights(night, brake = 0) {
      head.emissiveIntensity = night * 3;
      tail.emissiveIntensity = night * 0.8 + brake * 2.2;
    },
  };
}
