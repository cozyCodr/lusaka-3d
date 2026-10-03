// Drive mode: a Corolla you can drive round the city.
//
// Physics is Rapier (WASM, loaded the first time you drive) with its raycast
// vehicle: four suspension rays with springs, dampers and tyre grip, on a
// 1200 kg chassis with a low centre of mass. On top of that sits a simple
// drivetrain after Marco Monster's "Car Physics for Games": an engine torque
// curve, the Corolla's 4-speed automatic (U340E ratios), front-wheel drive,
// aerodynamic drag and rolling resistance, speed-sensitive steering with
// Ackermann geometry, brakes and a handbrake. Colliders are made only near
// the car: building footprints and walls from the streamed tiles, the
// landmarks' footprints, and the ground (the Parliament hill as a heightfield).
import * as THREE from 'three';
import { buildCar, CAR } from './car.js';

const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/+esm';

// Toyota Corolla E140 1.6 (1ZR-FE) with the U340E automatic.
const MASS = 1200;
const COM_Y = 0.5; // centre of mass above the ground
const TORQUE = [[800, 105], [2000, 128], [3200, 142], [4400, 150], [5200, 154], [6000, 146], [6400, 135]]; // rpm, N·m
const IDLE = 800, REDLINE = 6400;
const GEARS = [2.847, 1.552, 1.0, 0.7], REVERSE = 2.343, FINAL = 4.237, EFFICIENCY = 0.8;
const SHIFT_TIME = 0.35;
const C_DRAG = 0.37, C_ROLL = 11; // drag = ½·Cd·A·ρ with Cd 0.29, A 2.1 m²; rolling ≈ 30 × drag
const BRAKE = 10500; // N in all, about 0.9 g
const FRONT_BRAKE = 0.65;
const STEER_MAX = 0.6; // rad at standstill, falling with speed
const GRIP = 1.6, HANDBRAKE_GRIP = 0.7;
const SUSPENSION = { rest: 0.3, travel: 0.2, stiffness: 30, compression: 2.2, relaxation: 2.5, maxForce: 22000 };
const HARD_Y = 0.62; // suspension hard points, above the ground
const RADIUS = 140; // colliders are kept this close to the car
const STEP = 1 / 60;

const torqueAt = (rpm) => {
  for (let i = 1; i < TORQUE.length; i++) {
    if (rpm <= TORQUE[i][0]) {
      const [r0, t0] = TORQUE[i - 1], [r1, t1] = TORQUE[i];
      return t0 + ((t1 - t0) * (Math.max(rpm, r0) - r0)) / (r1 - r0);
    }
  }
  return TORQUE[TORQUE.length - 1][1];
};
const approach = (v, target, up, down, dt) => (v < target ? Math.min(target, v + (target > 0 || v < 0 ? up : down) * dt) : Math.max(target, v - (target < 0 || v > 0 ? up : down) * dt));

export function createDrive({ scene, camera, dom, heightAt, siteNear, footprints, walls, onStatus = () => {} }) {
  let R = null, world = null, body = null, vehicle = null, loading = null;
  const car = buildCar();
  car.group.visible = false;
  scene.add(car.group);

  // ---------- input ----------
  const keys = new Set();
  const touch = { left: false, right: false, gas: false, brake: false };
  let active = false;
  addEventListener('keydown', (e) => {
    if (!active || e.metaKey || e.ctrlKey) return;
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyR' && !e.repeat) reset();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const held = (...codes) => codes.some((c) => keys.has(c));
  const input = { throttle: 0, brake: 0, steer: 0 };

  // camera orbit by dragging; it eases back behind the car when let go
  let orbit = 0, orbitPitch = 0, dragging = null;
  dom.addEventListener('pointerdown', (e) => {
    if (!active || e.pointerType === 'touch') return;
    dragging = { x: e.clientX, y: e.clientY };
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    orbit -= (e.clientX - dragging.x) * 0.006;
    orbitPitch = THREE.MathUtils.clamp(orbitPitch + (e.clientY - dragging.y) * 0.004, -0.3, 0.8);
    dragging = { x: e.clientX, y: e.clientY };
  });
  addEventListener('pointerup', () => (dragging = null));

  // ---------- physics ----------
  async function load() {
    onStatus('Loading car physics…');
    R = (await import(RAPIER_URL)).default;
    await R.init();
    world = new R.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = STEP;
    // the city floor; the Parliament hill is added as a heightfield when near it
    world.createCollider(R.ColliderDesc.cuboid(40000, 1, 40000).setTranslation(0, heightAt(1e5, 1e5) - 1, 0).setFriction(1));
    body = world.createRigidBody(R.RigidBodyDesc.dynamic().setAngularDamping(0.6).setCanSleep(false).setCcdEnabled(true));
    // chassis box from the sills to the waistline; mass and a low centre of mass set explicitly
    const hx = CAR.width / 2 - 0.04, hy = 0.32, hz = CAR.length / 2 - 0.05;
    const I = (a, b) => (MASS / 12) * (4 * a * a + 4 * b * b);
    world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(0, 0.7, 0)
      .setMassProperties(MASS, { x: 0, y: COM_Y, z: 0.1 }, { x: I(hy, hz), y: I(hx, hz), z: I(hx, hy) }, { w: 1, x: 0, y: 0, z: 0 })
      .setFriction(0.3).setRestitution(0.1), body);
    // a roof box so rolling over or hitting a low wall does not pass through the cabin
    world.createCollider(R.ColliderDesc.cuboid(hx - 0.1, 0.2, 1.0).setTranslation(0, 1.2, -0.1).setDensity(0), body);
    vehicle = world.createVehicleController(body);
    vehicle.indexUpAxis = 1;
    vehicle.setIndexForwardAxis = 2; // a setter in the Rapier API
    car.wheels.forEach((w, i) => {
      vehicle.addWheel({ x: w.rest.x, y: HARD_Y, z: w.rest.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, SUSPENSION.rest, CAR.wheelRadius);
      vehicle.setWheelSuspensionStiffness(i, SUSPENSION.stiffness);
      vehicle.setWheelSuspensionCompression(i, SUSPENSION.compression);
      vehicle.setWheelSuspensionRelaxation(i, SUSPENSION.relaxation);
      vehicle.setWheelMaxSuspensionTravel(i, SUSPENSION.travel);
      vehicle.setWheelMaxSuspensionForce(i, SUSPENSION.maxForce);
      vehicle.setWheelFrictionSlip(i, GRIP);
      vehicle.setWheelSideFrictionStiffness(i, 1);
    });
    onStatus('');
  }

  // Static colliders round the car: one thin box per footprint edge and per wall segment.
  const colliders = new Map(); // source object -> [collider]
  let lastSync = null, hill = null;
  function edgeBox(ax, az, bx, bz, half, y0, h) {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.05) return null;
    const yaw = Math.atan2(bx - ax, bz - az);
    return world.createCollider(R.ColliderDesc.cuboid(half, h / 2, len / 2 + half)
      .setTranslation((ax + bx) / 2, y0 + h / 2, (az + bz) / 2)
      .setRotation({ w: Math.cos(yaw / 2), x: 0, y: Math.sin(yaw / 2), z: 0 })
      .setFriction(0.4));
  }
  function syncColliders(force = false) {
    const p = body.translation();
    if (!force && lastSync && Math.hypot(p.x - lastSync.x, p.z - lastSync.z) < 15) return;
    lastSync = { x: p.x, z: p.z };
    const keep = new Set();
    for (const fp of footprints.near(p.x, p.z, RADIUS)) {
      keep.add(fp);
      if (colliders.has(fp)) continue;
      const list = [], pts = fp.pts;
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const g = heightAt((pts[i] + pts[j]) / 2, (pts[i + 1] + pts[j + 1]) / 2);
        const c = edgeBox(pts[j], pts[j + 1], pts[i], pts[i + 1], 0.3, g - 1, 9);
        if (c) list.push(c);
      }
      colliders.set(fp, list);
    }
    for (const w of walls.near(p.x, p.z, RADIUS)) {
      keep.add(w);
      if (colliders.has(w)) continue;
      const [ax, az, bx, bz, half, h] = w.seg;
      const c = edgeBox(ax, az, bx, bz, Math.max(half, 0.1), heightAt(ax, az) - 0.5, h + 0.5);
      colliders.set(w, c ? [c] : []);
    }
    for (const [src, list] of colliders) {
      if (keep.has(src)) continue;
      for (const c of list) world.removeCollider(c, false);
      colliders.delete(src);
    }
    // the Parliament hill: a heightfield patch while the car is near it
    const near = siteNear(p.x, p.z, 400);
    if (near && !hill) {
      const n = 100, size = 400;
      const h = new Float32Array((n + 1) * (n + 1));
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) h[j * (n + 1) + i] = heightAt(near.x - size / 2 + (j * size) / n, near.z - size / 2 + (i * size) / n);
      hill = world.createCollider(R.ColliderDesc.heightfield(n, n, h, { x: size, y: 1, z: size }, R.HeightFieldFlags.FIX_INTERNAL_EDGES).setTranslation(near.x, 0, near.z).setFriction(1));
    } else if (!near && hill) {
      world.removeCollider(hill, false);
      hill = null;
    }
  }

  // ---------- drivetrain ----------
  const state = { gear: 0, reverse: false, shift: 0, rpm: IDLE, speed: 0 };
  let acc = 0;
  function physicsStep(dt) {
    const v = vehicle.currentVehicleSpeed(); // m/s along the car, signed
    state.speed = v;
    // brake pedal from rest selects reverse; the throttle selects drive again
    if (!state.reverse && input.brake > 0.1 && input.throttle < 0.05 && v < 0.6) state.reverse = true;
    if (state.reverse && input.throttle > 0.1 && v > -0.6) state.reverse = false;
    const pedal = state.reverse ? input.brake : input.throttle;
    const braking = state.reverse ? input.throttle : input.brake;

    const ratio = (state.reverse ? REVERSE : GEARS[state.gear]) * FINAL;
    const wheelRpm = (Math.abs(v) / CAR.wheelRadius) * (60 / (2 * Math.PI));
    // the torque converter lets the engine rev up from a standstill
    state.rpm = THREE.MathUtils.clamp(Math.max(wheelRpm * ratio, IDLE + pedal * 1800), IDLE, REDLINE);
    if (!state.reverse) {
      // automatic: shift up near the redline at full throttle, early when cruising
      if (state.shift <= 0 && state.gear < GEARS.length - 1 && wheelRpm * ratio > THREE.MathUtils.lerp(2400, 5900, pedal)) { state.gear++; state.shift = SHIFT_TIME; }
      else if (state.shift <= 0 && state.gear > 0 && wheelRpm * ratio < THREE.MathUtils.lerp(1300, 3200, pedal)) { state.gear--; state.shift = SHIFT_TIME; }
    } else state.gear = 0;
    state.shift -= dt;
    const torque = state.rpm >= REDLINE - 10 ? 0 : torqueAt(state.rpm) * pedal * (state.shift > 0 ? 0.3 : 1);
    const force = (torque * ratio * EFFICIENCY) / CAR.wheelRadius * (state.reverse ? -1 : 1);
    vehicle.setWheelEngineForce(0, force / 2);
    vehicle.setWheelEngineForce(1, force / 2);

    // brakes (an impulse per step, per wheel); a light hold when stopped
    const hand = held('Space') ? 1 : 0;
    const hold = pedal < 0.05 && Math.abs(v) < 0.4 ? 0.15 : 0;
    const b = Math.max(braking, hold);
    for (let i = 0; i < 4; i++) {
      const share = i < 2 ? FRONT_BRAKE / 2 : (1 - FRONT_BRAKE) / 2;
      vehicle.setWheelBrake(i, (b * BRAKE * share + (i >= 2 ? hand * BRAKE * 0.4 : 0)) * dt);
      vehicle.setWheelFrictionSlip(i, i >= 2 && hand ? HANDBRAKE_GRIP : GRIP);
    }

    // steering: less lock at speed; the inside wheel turns more (Ackermann)
    const lock = (STEER_MAX / (1 + Math.abs(v) / 12)) * input.steer;
    if (Math.abs(lock) > 1e-4) {
      const turnR = CAR.wheelbase / Math.tan(Math.abs(lock));
      const inner = Math.atan(CAR.wheelbase / (turnR - CAR.track / 2)), outer = Math.atan(CAR.wheelbase / (turnR + CAR.track / 2));
      const s = Math.sign(lock); // + turns left: the left wheel (index 0) is inside
      vehicle.setWheelSteering(0, s * (s > 0 ? inner : outer));
      vehicle.setWheelSteering(1, s * (s > 0 ? outer : inner));
    } else {
      vehicle.setWheelSteering(0, 0);
      vehicle.setWheelSteering(1, 0);
    }

    // drag and rolling resistance, as an impulse at the centre of mass
    const lv = body.linvel();
    const sp = Math.hypot(lv.x, lv.y, lv.z);
    const k = -(C_DRAG * sp + C_ROLL) * dt;
    body.applyImpulse({ x: lv.x * k, y: lv.y * k, z: lv.z * k }, true);

    vehicle.updateVehicle(dt, R.QueryFilterFlags.EXCLUDE_DYNAMIC);
    world.step();
  }

  // ---------- spawn and reset ----------
  function clearAt(x, z) {
    if (footprints.blocked(x, z, 2.8)) return false;
    return !walls.near(x, z, 6).some(({ seg: [ax, az, bx, bz] }) => {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      return Math.hypot(x - ax - dx * t, z - az - dz * t) < 2.8;
    });
  }
  function place(x, z, yaw) {
    for (let r = 0, a = 0; r < 120 && !clearAt(x, z); r += 1.5, a += 2.4) { x += Math.cos(a) * r * 0.3; z += Math.sin(a) * r * 0.3; }
    body.setTranslation({ x, y: heightAt(x, z) + 0.5, z }, true);
    body.setRotation({ w: Math.cos(yaw / 2), x: 0, y: Math.sin(yaw / 2), z: 0 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    Object.assign(state, { gear: 0, reverse: false, shift: 0 });
    camYaw = yaw;
    syncColliders(true);
  }
  // R: upright again where you are, facing the same way
  function reset() {
    if (!body) return;
    const p = body.translation(), q = body.rotation();
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
    place(p.x, p.z, Math.atan2(fwd.x, fwd.z));
  }

  // ---------- camera ----------
  let camYaw = 0;
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  const ray = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 0 } };
  function chase(dt, snap = false) {
    const p = body.translation(), r = body.rotation();
    q.set(r.x, r.y, r.z, r.w);
    const fwd = tmp.set(0, 0, 1).applyQuaternion(q);
    const heading = Math.atan2(fwd.x, fwd.z);
    const lv = body.linvel();
    const speed = Math.hypot(lv.x, lv.z);
    // follow the heading, and look back along the motion when reversing
    const target = state.reverse && speed > 1 ? heading + Math.PI : heading;
    let d = target - camYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    camYaw += d * (snap ? 1 : 1 - Math.exp(-3.5 * dt));
    if (!dragging) {
      orbit *= Math.exp(-1.5 * dt);
      orbitPitch *= Math.exp(-1.5 * dt);
    }
    const k = Math.min(1, speed / 28);
    const narrow = camera.aspect < 1 ? 1.5 : 1; // portrait phones: pull back so the road ahead shows
    const dist = THREE.MathUtils.lerp(5.8, 7.6, k) * narrow, height = THREE.MathUtils.lerp(2.1, 2.6, k) * narrow + orbitPitch * 4;
    const yaw = camYaw + orbit;
    look.set(p.x + lv.x * 0.15, p.y + 1.1, p.z + lv.z * 0.15);
    const want = new THREE.Vector3(p.x - Math.sin(yaw) * dist, p.y + height, p.z - Math.cos(yaw) * dist);
    // pull in rather than pass through a wall
    const dir = want.clone().sub(look), len = dir.length();
    dir.divideScalar(len);
    ray.origin = { x: look.x, y: look.y, z: look.z };
    ray.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = world.castRay(new R.Ray(ray.origin, ray.dir), len, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC);
    if (hit) want.copy(look).addScaledVector(dir, Math.max(1.5, hit.timeOfImpact - 0.3));
    want.y = Math.max(want.y, heightAt(want.x, want.z) + 0.6);
    if (snap) camPos.copy(want);
    else camPos.lerp(want, 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos);
    camera.lookAt(look);
    const fov = THREE.MathUtils.lerp(60, 70, k);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  // ---------- per frame ----------
  const spin = [0, 0, 0, 0];
  function update(dt) {
    if (!active || !vehicle) return;
    // smooth the digital inputs (units per second)
    const up = held('KeyW', 'ArrowUp') || touch.gas ? 1 : 0;
    const down = held('KeyS', 'ArrowDown') || touch.brake ? 1 : 0;
    const steer = (held('KeyA', 'ArrowLeft') || touch.left ? 1 : 0) - (held('KeyD', 'ArrowRight') || touch.right ? 1 : 0);
    input.throttle = approach(input.throttle, up, 4, 8, dt);
    input.brake = approach(input.brake, down, 6, 10, dt);
    const steerRate = 3 / (1 + Math.abs(state.speed) / 20);
    input.steer = approach(input.steer, steer, steerRate, 6, dt);

    acc = Math.min(acc + dt, STEP * 4);
    while (acc >= STEP) {
      physicsStep(STEP);
      acc -= STEP;
    }
    syncColliders();

    // the model follows the body; wheels follow their suspension, steering and roll
    const p = body.translation(), r = body.rotation();
    car.group.position.set(p.x, p.y, p.z);
    car.group.quaternion.set(r.x, r.y, r.z, r.w);
    car.wheels.forEach((w, i) => {
      const len = vehicle.wheelSuspensionLength(i) ?? SUSPENSION.rest;
      w.steer.position.y = HARD_Y - len;
      w.steer.rotation.y = vehicle.wheelSteering(i) ?? 0;
      spin[i] = vehicle.wheelRotation(i) ?? spin[i];
      w.roll.rotation.x = spin[i];
    });
    car.setLights(night, input.brake > 0.1 && !state.reverse ? 1 : 0);
    chase(dt);
  }

  let night = 0;
  return {
    get active() {
      return active;
    },
    get state() {
      return { kmh: Math.round(Math.abs(state.speed) * 3.6), gear: state.reverse ? 'R' : String(state.gear + 1), rpm: Math.round(state.rpm) };
    },
    touch,
    get position() {
      return body ? body.translation() : null;
    },
    // Start driving at (x, z), facing yaw (radians; 0 = +z).
    async start(x, z, yaw) {
      active = true;
      if (!world) await (loading ??= load());
      if (!active) return; // left Drive while loading
      car.group.visible = true;
      body.setEnabled(true);
      camera.near = 0.2;
      camera.updateProjectionMatrix();
      place(x, z, yaw);
      chase(0, true);
    },
    stop() {
      active = false;
      keys.clear();
      car.group.visible = false;
      body?.setEnabled(false);
      camera.fov = 42;
      camera.updateProjectionMatrix();
    },
    update,
    debug: () => ({ R, world, body, vehicle, colliders }),
    setNight(n) {
      night = n;
    },
  };
}
