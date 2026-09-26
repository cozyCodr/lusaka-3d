import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildAssembly } from './building.js';
import { buildCity } from './city.js';
import { SITE, sunVector } from './geo.js';
import { buildFindeco } from './landmarks/findeco.js';
import { buildSite } from './site.js';
import { menuItem, menuToggle, setupMenu } from './ui.js';
import { lerp, smoothstep } from './util.js';

// ---------- renderer, scene, camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfd6d8, 500, 5000);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 9000);

// The hand-built Parliament site, placed on its OSM outline and bearing.
const assembly = buildAssembly();
const site = buildSite();
const parliament = new THREE.Group();
parliament.add(assembly.group, site.group);
parliament.position.set(SITE.x, 0, SITE.z);
parliament.rotation.y = SITE.rotY;
parliament.updateMatrixWorld(true);
scene.add(parliament);

const findeco = buildFindeco();
scene.add(findeco.group);

const status = document.getElementById('status');
buildCity().then(({ group, stats }) => {
  scene.add(group);
  if (confidenceOn) setConfidence(true);
  status.textContent = `${stats.buildings.toLocaleString()} buildings and ${stats.roads.toLocaleString()} roads from OpenStreetMap`;
});

// ---------- sky and light ----------
const sky = new Sky();
sky.scale.setScalar(1500);
sky.renderOrder = -1; // drawn first without depth, so the city beyond it still shows
sky.frustumCulled = false;
scene.add(sky);
sky.material.uniforms.turbidity.value = 6;
sky.material.uniforms.rayleigh.value = 1.6;
sky.material.uniforms.mieCoefficient.value = 0.004;
sky.material.uniforms.mieDirectionalG.value = 0.85;

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -350, right: 350, top: 350, bottom: -350, near: 1, far: 1600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4a32, 0.7);
scene.add(hemi);

const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene();
const skyForEnv = new Sky();
skyForEnv.scale.setScalar(1500);
skyForEnv.material.uniforms = sky.material.uniforms;
skyScene.add(skyForEnv);
let envRT = null;
function refreshEnvironment() {
  envRT?.dispose();
  envRT = pmrem.fromScene(skyScene);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45;
}

const sunDir = new THREE.Vector3();

// Keep the shadow map centred on whatever the camera is looking at.
function placeSun() {
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).addScaledVector(sunDir, 700);
}

const warm = new THREE.Color(0xffa860);
const white = new THREE.Color(0xfff6ea);
const fogDay = new THREE.Color(0xd4d9d6);
const fogDusk = new THREE.Color(0x3b3445);

// t: 0 = morning (sun low in the east, lighting the front), 0.5 = noon, 1 = dusk.
function setTime(t) {
  const bearing = 85 - 170 * t;
  const elevation = lerp(14, -4, t) + 58 * Math.sin(Math.PI * t);
  sunVector(bearing, elevation, sunDir);
  sky.material.uniforms.sunPosition.value.copy(sunDir);
  placeSun();

  const day = smoothstep(elevation / 12);
  const low = 1 - smoothstep((elevation - 5) / 30);
  const night = smoothstep((4 - elevation) / 8);
  sun.intensity = 3.4 * day;
  sun.color.copy(white).lerp(warm, low);
  hemi.intensity = lerp(0.1, 0.45, day);
  scene.fog.color.copy(fogDay).lerp(fogDusk, night);
  renderer.toneMappingExposure = lerp(0.55, 0.75, night);
  bloom.strength = 0.12 + night * 0.9;

  assembly.setNight(night);
  site.setNight(night);
  findeco.setNight(night);
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.2, 0.55, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- controls and flyover ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 12;
controls.maxDistance = 4000;

// Flyover path in the site's local frame, then carried into the world.
const W = site.walk;
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -W.drop + 1.7, W.end + 8),
  new THREE.Vector3(0, -2.2, W.end - 22),
  new THREE.Vector3(0, 1.8, W.start + 8),
  new THREE.Vector3(24, 16, 44),
  new THREE.Vector3(78, 34, 8),
  new THREE.Vector3(62, 48, -70),
  new THREE.Vector3(-40, 44, -72),
  new THREE.Vector3(-88, 30, 22),
  new THREE.Vector3(-52, 20, 96),
].map((p) => p.applyMatrix4(parliament.matrixWorld)), false, 'centripetal');
const assemblyLook = new THREE.Vector3(0, 8, 0).applyMatrix4(parliament.matrixWorld);
let fly = null;

// Move the camera along a curve while easing the look-at point.
function flyAlong(curve, look0, look1, seconds) {
  fly = { curve, look0: look0.clone(), look1: look1.clone(), seconds, t0: performance.now() };
  controls.enabled = false;
}
function endFly() {
  if (!fly) return;
  controls.target.copy(fly.look1);
  fly = null;
  controls.enabled = true;
}
renderer.domElement.addEventListener('pointerdown', endFly);
renderer.domElement.addEventListener('wheel', endFly, { passive: true });

function stepFly(now) {
  const raw = Math.min(1, (now - fly.t0) / (fly.seconds * 1000));
  const u = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
  camera.position.copy(fly.curve.getPointAt(u));
  controls.target.copy(fly.look0).lerp(fly.look1, u);
  camera.lookAt(controls.target);
  if (raw >= 1) endFly();
}

const startFlyover = () => flyAlong(path, new THREE.Vector3(0, 10, 0).applyMatrix4(parliament.matrixWorld), assemblyLook, 26);

// Glide between the current view and a destination via a raised midpoint.
function glideTo(position, target, seconds = 5) {
  const from = camera.position.clone();
  const mid = from.clone().lerp(position, 0.5);
  mid.y = Math.max(from.y, position.y) + from.distanceTo(position) * 0.25;
  flyAlong(new THREE.CatmullRomCurve3([from, mid, position]), controls.target, target, seconds);
}
const CITY_VIEW = { position: new THREE.Vector3(300, 1900, 5200), target: new THREE.Vector3(-1000, -4.5, 2100) };
// Findeco from the south-east, across Independence Ave.
const FINDECO_VIEW = {
  position: findeco.centre.clone().add(new THREE.Vector3(120, 5, 150)),
  target: findeco.centre.clone().add(new THREE.Vector3(0, 5, 0)),
};

// ---------- confidence view ----------
const CONF_COLORS = { high: 0x3fbf6a, med: 0xf0b429, low: 0xe5484d, ground: 0x6d6d6a };
const confMats = Object.fromEntries(
  Object.entries(CONF_COLORS).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })]),
);
let confidenceOn = false;
function setConfidence(on) {
  confidenceOn = on;
  scene.traverse((o) => {
    if (!o.isMesh || !o.userData.conf) return;
    if (on) {
      o.userData.orig ??= o.material;
      o.material = confMats[o.userData.conf];
    } else if (o.userData.orig) {
      o.material = o.userData.orig;
    }
  });
  document.getElementById('legend').classList.toggle('hidden', !on);
}

// ---------- UI ----------
const slider = document.getElementById('time');
slider.addEventListener('input', () => setTime(slider.value / 100));
slider.addEventListener('change', refreshEnvironment);

const menu = setupMenu();
// Close the menu when a camera move starts, so the view is unobstructed.
const go = (fn) => () => {
  menu.close();
  fn();
};
document.getElementById('actions').append(
  menuItem('Replay flyover', go(startFlyover)),
  menuItem('City view', go(() => glideTo(CITY_VIEW.position, CITY_VIEW.target))),
  menuItem('National Assembly', go(() => glideTo(path.getPointAt(1), assemblyLook))),
  menuItem('Findeco House', go(() => glideTo(FINDECO_VIEW.position, FINDECO_VIEW.target))),
);
document.getElementById('layers').append(menuToggle('Confidence view', setConfidence));

// ---------- loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Debug handle for inspecting views from the console.
window.lusaka = { camera, controls };

const clock = new THREE.Clock();
renderer.setAnimationLoop((now) => {
  site.update(clock.getElapsedTime());
  if (fly) stepFly(now);
  else controls.update();
  sky.position.copy(camera.position); // the dome is finite; keep the camera inside it
  placeSun();
  composer.render();
});

setTime(slider.value / 100);
refreshEnvironment();
// #still skips the intro and opens on the flyover's final framing.
if (location.hash === '#findeco') {
  camera.position.copy(FINDECO_VIEW.position);
  controls.target.copy(FINDECO_VIEW.target);
} else if (location.hash === '#still') {
  camera.position.copy(path.getPointAt(1));
  controls.target.copy(assemblyLook);
} else {
  startFlyover();
}
