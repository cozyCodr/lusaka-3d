import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildAssembly } from './building.js';
import { cityGround, createTileManager } from './city/tiles.js';
import { createFootprintIndex } from './collide.js';
import { createRig } from './controls/rig.js';
import { CITY_Y, heightAt, SITE, sunVector } from './geo.js';
import { buildLandmarks } from './landmarks/index.js';
import { buildSite } from './site.js';
import { store } from './store.js';
import { menuItem, menuToggle, modeHint, modeSwitch, setupHelp, setupMenu } from './ui.js';
import { lerp, smoothstep } from './util.js';

// ---------- renderer, scene, camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfd6d8, 500, 5000);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 40000);

// The hand-built Parliament site, placed on its OSM outline and bearing.
const assembly = buildAssembly();
const site = buildSite();
const parliament = new THREE.Group();
parliament.add(assembly.group, site.group);
parliament.position.set(SITE.x, 0, SITE.z);
parliament.rotation.y = SITE.rotY;
parliament.updateMatrixWorld(true);
scene.add(parliament);

const landmarks = buildLandmarks();
for (const lm of landmarks) scene.add(lm.group);

// Walk-mode collisions: every OSM footprint plus the hand-built landmarks.
const footprints = createFootprintIndex();
for (const lm of landmarks) for (const fp of lm.footprints) footprints.add(fp);
// National Assembly ring, from its OSM outline.
footprints.add([-18.8, -36.0, 44.8, -1.9, 20.2, 43.2, -43.3, 9.1]);

const status = document.getElementById('status');
// The OSM city streams in 1 km tiles around the camera (see city/tiles.js).
scene.add(cityGround());
const city = createTileManager({
  scene,
  footprints,
  onMesh: (m) => {
    if (!confidenceOn) return;
    m.userData.orig = m.material;
    m.material = confMats[m.userData.conf];
  },
});
city.ready.then((ix) => Object.assign(BOUNDS, ix.bounds));
function showStatus() {
  const s = city.stats;
  status.textContent = `${Math.round(s.buildings).toLocaleString()} buildings in ${s.full + s.far} of ${s.total} tiles` +
    (s.queued ? ' · loading…' : '');
}

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

// Keep the shadow map centred on what the camera is looking at.
const focus = new THREE.Vector3();
function placeSun() {
  if (rig.mode === 'map' || fly) focus.copy(controls.target);
  else focus.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 60);
  sun.target.position.copy(focus);
  sun.position.copy(focus).addScaledVector(sunDir, 700);
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
  for (const lm of landmarks) lm.setNight(night);
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.2, 0.55, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- controls and flyover ----------
// Map bounds: the tiled OSM area (tools/osm_tiles.py BBOX).
const BOUNDS = { minX: -13800, maxX: 22600, minZ: -12400, maxZ: 18500 }; // refined from data/tiles/index.json
const rig = createRig({
  camera, dom: renderer.domElement, heightAt, collide: footprints, bounds: BOUNDS, store,
  pick: (x, y) => pickPoint(x, y),
});
const controls = rig.map;
controls.target.set(0, 8, 0);

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
  store.getState().setMode('map'); // scripted moves end in map mode, looking at a target
  fly = { curve, look0: look0.clone(), look1: look1.clone(), seconds, t0: performance.now() };
  rig.setEnabled(false);
}
function endFly() {
  if (!fly) return;
  controls.target.copy(fly.look1);
  fly = null;
  rig.setEnabled(true);
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
const CITY_VIEW = { position: new THREE.Vector3(2500, 7500, 17000), target: new THREE.Vector3(3000, -4.5, 2500) }; // all of Lusaka from the south

// ---------- double-click to go somewhere ----------
const raycaster = new THREE.Raycaster();
const pickables = [parliament, ...landmarks.map((lm) => lm.group)];
// Hand-built landmarks by raycast; everywhere else by marching the ray to the ground.
function pickPoint(clientX, clientY) {
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables, true)[0];
  if (hit) return hit.point;
  const { origin, direction } = raycaster.ray;
  const p = origin.clone();
  for (let t = 0, step = 2; t < 8000; t += step, step *= 1.02) {
    p.copy(origin).addScaledVector(direction, t);
    if (p.y <= heightAt(p.x, p.z)) return p.setY(heightAt(p.x, p.z));
  }
  return null;
}
renderer.domElement.addEventListener('dblclick', (e) => {
  const p = pickPoint(e.clientX, e.clientY);
  if (!p) return;
  if (rig.mode === 'walk') return rig.walkTo(p);
  // Glide in, keeping the current viewing direction, to a comfortable distance.
  const off = camera.position.clone().sub(controls.target);
  const dist = THREE.MathUtils.clamp(off.length() * 0.45, 60, 600);
  glideTo(p.clone().add(off.setLength(dist)), p, 2.2);
});

// ---------- keyboard shortcuts ----------
const help = setupHelp();
modeHint(store);
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const modes = { Digit1: 'map', Digit2: 'fly', Digit3: 'walk' };
  if (modes[e.code]) {
    endFly();
    store.getState().setMode(modes[e.code]);
  }
  if (e.key === '?') help.toggle();
});


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
  ...landmarks.map((lm) => menuItem(lm.name, go(() => glideTo(lm.view.position, lm.view.target)))),
);
document.getElementById('layers').append(menuToggle('Confidence view', setConfidence));
document.getElementById('controls').append(
  modeSwitch(store, () => endFly()),
  menuItem('Keyboard & mouse', go(() => help.toggle(true))),
);

// ---------- loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Debug handle for inspecting views from the console.
window.lusaka = {
  camera, controls, rig, store, city, landmarks, capture,
  views: { city: CITY_VIEW, assembly: { position: path.getPointAt(1), target: assemblyLook } },
};

// Save a still of a view to docs/screenshots/<name>.jpg (needs `tools/serve.py --capture`).
// view: { position, target } in world metres; time: 0 morning … 1 dusk.
async function capture(name, view, { time = 0.12, width = 1600, height = 900 } = {}) {
  endFly();
  store.getState().setMode('map');
  slider.value = time * 100;
  setTime(time);
  refreshEnvironment();
  camera.position.copy(view.position);
  controls.target.copy(view.target);
  controls.update();
  const ratio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Do the per-frame work here too: a background tab gets no animation
  // frames, so the loop alone would leave the sky and tiles behind.
  const frame = () => {
    city.update(controls.target, Math.max(0, camera.position.y - CITY_Y), performance.now());
    sky.position.copy(camera.position);
    placeSun();
  };
  frame();
  await wait(600);
  for (let i = 0; i < 90 && (frame(), city.stats.queued > 0); i++) await wait(250); // let nearby tiles stream in
  await wait(800);
  frame();
  composer.render();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.88); // same task as the render
  const blob = await (await fetch(url)).blob();
  const res = await fetch(`/__capture/${name}.jpg`, { method: 'POST', body: blob });
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  return res.status;
}

const clock = new THREE.Clock();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.1);
  site.update(clock.elapsedTime);
  if (fly) stepFly(now);
  else rig.update(dt);
  // Stream tiles around what the camera is looking at; see further when higher up.
  const altitude = Math.max(0, camera.position.y - CITY_Y);
  const focusPoint = rig.mode === 'map' || fly ? controls.target : camera.position;
  city.update(focusPoint, altitude, now);
  scene.fog.near = 500 + altitude * 1.5;
  scene.fog.far = 5000 + altitude * 4;
  if (now - (showStatus.t ?? 0) > 1000) {
    showStatus.t = now;
    showStatus();
  }
  sky.position.copy(camera.position); // the dome is finite; keep the camera inside it
  placeSun();
  composer.render();
});

setTime(slider.value / 100);
refreshEnvironment();
// #still skips the intro and opens on the flyover's final framing.
// #<landmark-slug> (e.g. #findeco-house) opens on that landmark's view.
const opening = landmarks.find((lm) => location.hash === `#${lm.name.toLowerCase().replace(/\s+/g, '-')}`);
if (opening) {
  camera.position.copy(opening.view.position);
  controls.target.copy(opening.view.target);
} else if (location.hash === '#still') {
  camera.position.copy(path.getPointAt(1));
  controls.target.copy(assemblyLook);
} else {
  startFlyover();
}
