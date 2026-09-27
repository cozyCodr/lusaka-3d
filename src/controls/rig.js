// Camera rig: one camera, three modes, keyboard and pointer input.
//   map  — drag to pan, wheel zooms to the cursor, WASD / arrows move;
//          right-drag (or Ctrl / Shift-drag) and Q / E / R / F turn and tilt
//          the camera in place, from where you stand. Two-finger touch
//          rotates around a point just ahead.
//   fly  — drone: drag to look, WASD move, Space / C up and down, Shift boost;
//          speed grows with altitude.
//   walk — eye height on the ground, drag to look, WASD, Shift to run;
//          building footprints block the way.
// The rig never lets the camera below the ground or out of the map.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

const EYE = 1.7;
const BODY = 0.6; // walker radius: keeps walls beyond the near clip plane
const NEAR = { map: 0.5, fly: 0.5, walk: 0.1 };
const UP = new THREE.Vector3(0, 1, 0);

// pick(clientX, clientY) -> world point under the screen position, or null.
export function createRig({ camera, dom, heightAt, collide, bounds, store, pick }) {
  const map = new MapControls(camera, dom);
  Object.assign(map, {
    enableDamping: true,
    dampingFactor: 0.08,
    screenSpacePanning: false,
    zoomToCursor: true,
    maxPolarAngle: Math.PI * 0.48,
    minDistance: 8,
    maxDistance: 16000,
    zoomSpeed: 1.2,
  });

  const keys = new Set();
  let yaw = 0, pitch = 0; // fly / walk look angles
  let dragging = null;
  let enabled = true;

  // ---------- input ----------
  const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  addEventListener('keydown', (e) => {
    if (typing() || e.metaKey || e.ctrlKey) return;
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // Map mode, mouse: turning happens in place. We take the rotate gesture
  // before MapControls sees it, turn the camera about its own position, and
  // keep the orbit target straight ahead at the same distance.
  let turning = null;
  function turnInPlace(dYaw, dPitch) {
    const dist = camera.position.distanceTo(map.target);
    anglesFromCamera();
    yaw += dYaw;
    pitch = THREE.MathUtils.clamp(pitch + dPitch, -1.5, -0.04); // keep looking down a little
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    map.target.copy(camera.position).addScaledVector(dir, dist);
    camera.lookAt(map.target);
  }
  dom.addEventListener('pointerdown', (e) => {
    if (mode !== 'map' || !enabled || e.pointerType === 'touch') return;
    const rotating = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey || e.shiftKey));
    if (!rotating) return;
    e.stopImmediatePropagation(); // MapControls would orbit around a distant target
    e.preventDefault();
    turning = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dom.setPointerCapture(e.pointerId);
  }, { capture: true });
  dom.addEventListener('pointermove', (e) => {
    if (!turning || e.pointerId !== turning.id) return;
    turnInPlace(-(e.clientX - turning.x) * 0.004, -(e.clientY - turning.y) * 0.004);
    turning.x = e.clientX;
    turning.y = e.clientY;
  });
  const endTurn = (e) => {
    if (turning && e.pointerId === turning.id) turning = null;
  };
  dom.addEventListener('pointerup', endTurn);
  dom.addEventListener('pointercancel', endTurn);
  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  // Map mode, touch: two-finger rotate orbits a point just ahead, not a
  // pivot left far away by panning.
  const touches = new Map();
  dom.addEventListener('pointerdown', (e) => {
    if (mode !== 'map' || !enabled || e.pointerType !== 'touch') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size !== 2) return;
    const [[x0, y0], [x1, y1]] = [...touches.values()];
    const r = dom.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((((x0 + x1) / 2 - r.left) / r.width) * 2 - 1, -(((y0 + y1) / 2 - r.top) / r.height) * 2 + 1), camera);
    const hit = pick?.((x0 + x1) / 2, (y0 + y1) / 2);
    const altitude = camera.position.y - heightAt(camera.position.x, camera.position.z);
    const cap = THREE.MathUtils.clamp(altitude, map.minDistance + 4, 80);
    const dist = Math.min(hit ? hit.distanceTo(camera.position) : cap, cap);
    map.target.copy(ray.ray.origin).addScaledVector(ray.ray.direction, dist);
  }, { capture: true });
  const dropTouch = (e) => touches.delete(e.pointerId);
  dom.addEventListener('pointerup', dropTouch);
  dom.addEventListener('pointercancel', dropTouch);

  // Look-drag for fly and walk (map mode uses MapControls' own handlers).
  dom.addEventListener('pointerdown', (e) => {
    if (store.getState().mode === 'map' || !enabled) return;
    dragging = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    dragging.x = e.clientX;
    dragging.y = e.clientY;
    yaw -= dx * 0.0035;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0035, -1.45, 1.45);
  });
  const endDrag = () => (dragging = null);
  dom.addEventListener('pointerup', endDrag);
  dom.addEventListener('pointercancel', endDrag);

  // ---------- helpers ----------
  const axis = (pos, neg) => (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  const forwardAxis = () => axis('KeyW', 'KeyS') + axis('ArrowUp', 'ArrowDown');
  const strafeAxis = () => axis('KeyD', 'KeyA') + axis('ArrowRight', 'ArrowLeft');

  function clampToMap(v) {
    v.x = THREE.MathUtils.clamp(v.x, bounds.minX, bounds.maxX);
    v.z = THREE.MathUtils.clamp(v.z, bounds.minZ, bounds.maxZ);
    return v;
  }

  function lookFromAngles() {
    const dir = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(camera.position.clone().add(dir));
  }

  function anglesFromCamera() {
    const dir = camera.getWorldDirection(new THREE.Vector3());
    yaw = Math.atan2(-dir.x, -dir.z);
    pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  }

  // ---------- modes ----------
  function enterMode(mode, prev) {
    map.enabled = enabled && mode === 'map';
    camera.near = NEAR[mode];
    camera.updateProjectionMatrix();
    if (mode === 'map') {
      // Orbit around the ground point ahead of the camera.
      const dir = camera.getWorldDirection(new THREE.Vector3());
      const ahead = prev === 'walk' ? 40 : Math.max(60, camera.position.y * 1.5);
      const t = camera.position.clone().addScaledVector(dir, ahead);
      t.y = heightAt(t.x, t.z);
      map.target.copy(t);
      if (prev === 'walk') camera.position.addScaledVector(dir, -30).add(new THREE.Vector3(0, 25, 0));
      map.update();
    } else {
      anglesFromCamera();
      if (mode === 'walk') {
        // Drop to the ground at the point you were looking at (map) or below you (fly).
        const p = prev === 'map' ? map.target.clone() : camera.position.clone();
        pitch = 0;
        placeWalker(p);
      }
    }
  }

  function placeWalker(p) {
    // Nudge out of any building we landed in.
    for (let r = 0; r < 60 && collide.blocked(p.x, p.z, BODY); r += 2) p.x += 2;
    camera.position.set(p.x, heightAt(p.x, p.z) + EYE, p.z);
    lookFromAngles();
  }

  let mode = store.getState().mode;
  store.subscribe((s) => {
    if (s.mode === mode) return;
    const prev = mode;
    mode = s.mode;
    enterMode(mode, prev);
  });

  // ---------- per frame ----------
  const tmp = new THREE.Vector3();
  function update(dt) {
    if (!enabled) return;
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const f = forwardAxis(), s = strafeAxis();

    if (mode === 'map') {
      // Keyboard pans along the ground, relative to the view; speed scales with distance.
      const dist = camera.position.distanceTo(map.target);
      const speed = dist * (boost ? 1.6 : 0.8) * dt;
      if (f || s) {
        const fwd = camera.getWorldDirection(tmp).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(fwd, UP);
        const move = fwd.multiplyScalar(f * speed).addScaledVector(right, s * speed);
        camera.position.add(move);
        map.target.add(move);
      }
      const turn = axis('KeyQ', 'KeyE') * dt * 1.2;
      const tilt = axis('KeyR', 'KeyF') * dt * 0.8;
      if (turn || tilt) turnInPlace(turn, tilt);
      if (!turning) map.update();
      // Keep the target on the map and the camera above ground.
      const before = map.target.clone();
      clampToMap(map.target);
      camera.position.add(map.target.clone().sub(before));
      const floor = heightAt(camera.position.x, camera.position.z) + 3;
      if (camera.position.y < floor) camera.position.y = floor;
      return;
    }

    const kturn = axis('KeyQ', 'KeyE') * dt * 1.4;
    yaw += kturn;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);

    if (mode === 'fly') {
      const ground = heightAt(camera.position.x, camera.position.z);
      const alt = Math.max(1, camera.position.y - ground);
      const speed = THREE.MathUtils.clamp(alt * 0.9, 12, 450) * (boost ? 3 : 1) * dt;
      const look = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      camera.position.addScaledVector(look, f * speed).addScaledVector(right, s * speed);
      camera.position.y += axis('Space', 'KeyC') * speed;
      clampToMap(camera.position);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, heightAt(camera.position.x, camera.position.z) + 2, 9000);
    } else {
      const speed = (boost ? 9 : 3.5) * dt;
      const step = fwd.multiplyScalar(f * speed).addScaledVector(right, s * speed);
      const p = camera.position;
      // Slide along walls: try the full step, then each axis on its own.
      if (!collide.blocked(p.x + step.x, p.z + step.z, BODY)) p.add(step);
      else if (!collide.blocked(p.x + step.x, p.z, BODY)) p.x += step.x;
      else if (!collide.blocked(p.x, p.z + step.z, BODY)) p.z += step.z;
      clampToMap(p);
      p.y = THREE.MathUtils.lerp(p.y, heightAt(p.x, p.z) + EYE, Math.min(1, dt * 12));
    }
    lookFromAngles();
  }

  return {
    map,
    update,
    get mode() {
      return mode;
    },
    setEnabled(on) {
      enabled = on;
      map.enabled = on && mode === 'map';
      if (on && mode !== 'map') anglesFromCamera();
    },
    // Walk to a ground point (double-click in walk mode).
    walkTo(p) {
      placeWalker(p.clone());
    },
  };
}
