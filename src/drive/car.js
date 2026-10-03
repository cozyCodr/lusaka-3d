// The drivable car: "Toyota Corolla 2020" by ItsDiyor (Sketchfab), CC BY 4.0,
// https://sketchfab.com/3d-models/toyota-corolla-2020-6d7d34ee42734d1ab28a6b1f1c5fc4fc
// Prepared for the web with tools/prepare_car.mjs: the wheels split out of
// the merged body with their pivots at the hubs, textures resized to WebP.
// The credit is also on the car itself, on its Zambian number plates.
// Local frame: +z is the front, y = 0 the ground under the tyres, x = 0 the
// centre line; +x is the car's left.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CAR = {
  length: 4.65, width: 1.79, height: 1.46,
  wheelRadius: 0.323, wheelWidth: 0.22,
  // hub positions [x, z]: FL, FR, RL, RR (wheelbase 2.70 m, track 1.53 m)
  hubs: [[0.766, 1.383], [-0.766, 1.383], [0.766, -1.317], [-0.766, -1.317]],
  hubY: 0.327,
};
CAR.wheelbase = CAR.hubs[0][1] - CAR.hubs[2][1];
CAR.track = CAR.hubs[0][0] - CAR.hubs[1][0];

const URL_GLB = new URL('../../data/models/corolla.glb', import.meta.url).href;
const WHEELS = ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'];

// A Zambian plate (white front, yellow rear) that carries the model's credit.
function plateTexture(rear) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 112;
  const g = c.getContext('2d');
  g.fillStyle = rear ? '#f2c932' : '#f4f4ef';
  g.fillRect(0, 0, 512, 112);
  g.strokeStyle = '#111';
  g.lineWidth = 6;
  g.strokeRect(5, 5, 502, 102);
  g.fillStyle = '#111';
  g.textAlign = 'center';
  g.font = 'bold 50px "Arial Narrow", Arial, sans-serif';
  g.fillText('ItsDiyor', 256, 62);
  g.font = 'bold 22px Arial, sans-serif';
  g.fillText('CC BY 4.0 · SKETCHFAB', 256, 94);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export async function loadCar({ color = 0xeeeeea } = {}) {
  const gltf = await new GLTFLoader().loadAsync(URL_GLB);
  const group = new THREE.Group();
  group.name = 'car';
  const model = gltf.scene;
  group.add(model);

  let plateMat = null;
  const paint = new THREE.MeshPhysicalMaterial({ name: 'Paint_Color', color, metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 });
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    const m = o.material;
    // body paint: a clear coat over the colour, as on a real car
    if (m.name === 'Paint_Color') {
      paint.aoMap ??= m.aoMap;
      o.material = paint;
    }
    if (m.name === 'metal_white') plateMat = m;
  });
  // plates: the model's own front plate maps only part of its texture, mirrored, so it
  // is hidden and a new plate goes over it; the rear plate goes in the boot recess
  if (plateMat) plateMat.visible = false;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.135), new THREE.MeshStandardMaterial({ map: plateTexture(false), roughness: 0.5 }));
  front.name = 'front-plate';
  front.position.set(0.005, 0.378, 2.312);
  group.add(front);
  // rear plate: in the recess on the boot lid, under the badge (measured on the model)
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.114), new THREE.MeshStandardMaterial({ map: plateTexture(true), roughness: 0.5 }));
  rear.name = 'rear-plate';
  rear.position.set(0, 0.765, -2.262);
  rear.rotation.set(-0.22, Math.PI, 0, 'YXZ'); // the boot face leans back about 12°
  group.add(rear);

  // wheels: pivot (steer about y) > spin (roll about x) > the wheel mesh
  const wheels = WHEELS.map((name) => {
    const pivot = model.getObjectByName(name);
    const spin = new THREE.Group();
    for (const child of [...pivot.children]) spin.add(child);
    pivot.add(spin);
    return { steer: pivot, roll: spin, rest: pivot.position.clone() };
  });

  // lights: the model's own lamp lenses (the transparent "Index_0_2" material) glow.
  // Its red texels at the back are the tail and brake lights, its clear texels the
  // headlights at the front and the reversing lights at the back.
  // The model's positions are quantized, so the shader works in the car's frame through
  // a matrix from world space (updated with the lights) rather than raw attributes.
  const lamps = { night: { value: 0 }, brake: { value: 0 }, reverse: { value: 0 }, toCar: { value: new THREE.Matrix4() } };
  model.traverse((o) => {
    if (!o.isMesh || o.material.name !== 'Index_0_2' || o.material.userData.lamps) return;
    const m = o.material;
    m.userData.lamps = true;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uNight: lamps.night, uBrake: lamps.brake, uReverse: lamps.reverse, uToCar: lamps.toCar });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarPos;\nuniform mat4 uToCar;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarPos = (uToCar * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarPos;\nuniform float uNight, uBrake, uReverse;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 c = diffuseColor.rgb;
  float red = step(0.12, c.r) * step(2.0 * max(c.g, c.b), c.r);
  float clear = step(0.25, c.g) * step(abs(c.r - c.g) + abs(c.g - c.b), 0.08);
  float back = step(vCarPos.z, -1.8), front = step(1.8, vCarPos.z);
  float tail = red * back * (0.4 * uNight + 0.55 * uBrake);
  float head = clear * front * uNight;
  float rev = clear * back * uReverse;
  totalEmissiveRadiance += vec3(1.0, 0.02, 0.01) * tail * 5.0 + vec3(1.0, 0.95, 0.85) * (head * 4.0 + rev * 3.0);
  diffuseColor.a = max(diffuseColor.a, min(1.0, tail + head + rev));
}`);
    };
    m.needsUpdate = true;
  });

  return {
    group,
    wheels,
    // 0 day … 1 night; brake and reverse 0 or 1
    setLights(night, brake = 0, reverse = 0) {
      group.updateMatrixWorld();
      lamps.toCar.value.copy(group.matrixWorld).invert();
      lamps.night.value = night;
      lamps.brake.value = brake;
      lamps.reverse.value = reverse;
    },
  };
}
