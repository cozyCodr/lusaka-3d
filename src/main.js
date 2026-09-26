import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildAssembly } from './building.js';
import { buildSite } from './site.js';
import { button, setOn } from './ui.js';
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
scene.fog = new THREE.Fog(0xcfd6d8, 180, 520);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 2000);

const assembly = buildAssembly();
const site = buildSite();
scene.add(assembly.group, site.group);

// ---------- sky and light ----------
const sky = new Sky();
sky.scale.setScalar(1500);
scene.add(sky);
sky.material.uniforms.turbidity.value = 6;
sky.material.uniforms.rayleigh.value = 1.6;
sky.material.uniforms.mieCoefficient.value = 0.004;
sky.material.uniforms.mieDirectionalG.value = 0.85;

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 600 });
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

// The front faces a bearing of ~30°; +x points roughly NW (see REFERENCE.md).
const FRONT_BEARING = 30;
function sunDirection(bearing, elevation) {
  const a = THREE.MathUtils.degToRad(bearing - FRONT_BEARING);
  const e = THREE.MathUtils.degToRad(elevation);
  return new THREE.Vector3(-Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}

const warm = new THREE.Color(0xffa860);
const white = new THREE.Color(0xfff6ea);
const fogDay = new THREE.Color(0xd4d9d6);
const fogDusk = new THREE.Color(0x3b3445);

// t: 0 = morning (sun low in the east, lighting the front), 0.5 = noon, 1 = dusk.
function setTime(t) {
  const bearing = 85 - 170 * t;
  const elevation = lerp(14, -4, t) + 58 * Math.sin(Math.PI * t);
  const dir = sunDirection(bearing, elevation);

  sky.material.uniforms.sunPosition.value.copy(dir);
  sun.position.copy(dir).multiplyScalar(250);
  sun.target.position.set(0, 0, 0);

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
controls.maxDistance = 380;

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
], false, 'centripetal');
const lookFrom = new THREE.Vector3(0, 10, 0);
const lookTo = new THREE.Vector3(0, 8, 0);
const FLY_SECONDS = 26;
let fly = null;

function startFlyover() {
  fly = { t0: performance.now() };
  controls.enabled = false;
}
function endFlyover() {
  if (!fly) return;
  fly = null;
  controls.target.copy(lookTo);
  controls.enabled = true;
}
renderer.domElement.addEventListener('pointerdown', endFlyover);
renderer.domElement.addEventListener('wheel', endFlyover, { passive: true });

function stepFlyover(now) {
  const raw = Math.min(1, (now - fly.t0) / (FLY_SECONDS * 1000));
  const u = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
  camera.position.copy(path.getPointAt(u));
  camera.lookAt(lookFrom.clone().lerp(lookTo, u));
  if (raw >= 1) endFlyover();
}

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

const actions = document.getElementById('actions');
actions.append(
  button('Replay flyover', startFlyover),
  (() => {
    const b = button('Confidence view', () => {
      setConfidence(!confidenceOn);
      setOn(b, confidenceOn);
    });
    setOn(b, false);
    return b;
  })(),
);

// ---------- loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop((now) => {
  site.update(clock.getElapsedTime());
  if (fly) stepFlyover(now);
  else controls.update();
  composer.render();
});

setTime(slider.value / 100);
refreshEnvironment();
// #still skips the intro and opens on the flyover's final framing.
if (location.hash === '#still') {
  camera.position.copy(path.getPointAt(1));
  controls.target.copy(lookTo);
} else {
  startFlyover();
}
