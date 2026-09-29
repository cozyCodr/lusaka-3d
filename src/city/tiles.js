// Streams the OSM city in 1 km tiles around the camera (data/tiles, built by
// tools/osm_tiles.py). Two levels: "full" (every building, road and area)
// near the focus point, "far" (large buildings, main roads, big areas) out to
// the haze; nothing beyond. Geometry is built in a small pool of workers.
import * as THREE from 'three';
import { CITY_Y } from '../terrain.js';

const WORKERS = 3;
const HYSTERESIS = 1.15; // unload only once this much further out than the load radius

// Worn asphalt: soft patches of lighter and darker surface in world space,
// so long roads do not read as flat ribbons. Markings vary with it too.
function asphalt(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRoadXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRoadXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vRoadXZ;
float roadHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float roadNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(roadHash(i), roadHash(i + vec2(1, 0)), f.x), mix(roadHash(i + vec2(0, 1)), roadHash(i + vec2(1, 1)), f.x), f.y);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= 0.84 + 0.22 * roadNoise(vRoadXZ / 7.0) + 0.08 * roadNoise(vRoadXZ / 1.3);`);
  };
  return mat;
}

export function createTileManager({ scene, footprints, onMesh = () => {}, base = './data/tiles' }) {
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const mats = {
    buildings: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
    roads: asphalt(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })),
    areas: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  };
  const CONF = { buildings: 'med', roads: 'high', areas: 'high' };

  const tiles = new Map(); // key -> { tx, tz, level, meshes, pending }
  const queue = [];
  const jobs = new Map();
  let nextId = 1, index = null, stats = { full: 0, far: 0, buildings: 0 };

  const pool = Array.from({ length: WORKERS }, () => {
    const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    w.busy = false;
    w.onmessage = ({ data }) => {
      w.busy = false;
      const job = jobs.get(data.id);
      jobs.delete(data.id);
      if (job) finish(job, data);
      pump();
    };
    return w;
  });

  function toMesh(kind, batch) {
    if (!batch.position.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(batch.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(batch.normal, 3));
    g.setAttribute('color', new THREE.BufferAttribute(batch.color, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mats[kind]);
    m.castShadow = kind === 'buildings';
    m.receiveShadow = true;
    m.userData.conf = CONF[kind];
    m.matrixAutoUpdate = false;
    return m;
  }

  function clear(t) {
    for (const m of t.meshes) {
      group.remove(m);
      m.geometry.dispose();
    }
    t.meshes = [];
    if (t.level === 'full') footprints.removeGroup(t.key);
    if (t.level) stats[t.level]--;
    stats.buildings -= t.buildings ?? 0;
    t.level = null;
    t.buildings = 0;
  }

  function finish(job, data) {
    const t = tiles.get(job.key);
    if (!t || t.pending !== job.level) return; // superseded while in flight
    t.pending = null;
    if (data.error) {
      console.warn('tile', job.key, data.error);
      t.failed = job.level; // do not retry this level in a loop
      return;
    }
    clear(t);
    for (const kind of ['areas', 'roads', 'buildings']) {
      const m = toMesh(kind, data[kind]);
      if (!m) continue;
      group.add(m);
      onMesh(m);
      t.meshes.push(m);
    }
    if (job.level === 'full') for (const fp of data.footprints) footprints.add(fp, job.key);
    t.level = job.level;
    t.buildings = data.count;
    stats[t.level]++;
    stats.buildings += t.buildings;
  }

  function pump() {
    for (const w of pool) {
      if (w.busy || !queue.length) continue;
      const job = queue.shift();
      const t = tiles.get(job.key);
      if (!t || t.pending !== job.level) continue;
      const id = nextId++;
      jobs.set(id, job);
      w.busy = true;
      w.postMessage({ id, url: new URL(`${base}/${job.level}/${job.key}.json`, location.href).href, tx: t.tx, tz: t.tz, tile: index.tile, level: job.level });
    }
  }

  // Distance from a point to the nearest edge of a tile.
  const distTo = (t, x, z) => {
    const s = index.tile;
    const dx = Math.max(t.tx * s - x, 0, x - (t.tx + 1) * s);
    const dz = Math.max(t.tz * s - z, 0, z - (t.tz + 1) * s);
    return Math.hypot(dx, dz);
  };

  let last = 0;
  function update(focus, altitude, now = performance.now()) {
    if (!index || now - last < 300) return;
    last = now;
    const fullR = THREE.MathUtils.clamp(900 + altitude * 1.2, 900, 2200);
    const farR = THREE.MathUtils.clamp(5500 + altitude * 2.5, 5500, 14000);
    const wanted = [];
    for (const t of tiles.values()) {
      const d = distTo(t, focus.x, focus.z);
      let want = d < fullR ? 'full' : d < farR ? 'far' : null;
      // Hysteresis: keep what is loaded until clearly out of range.
      if (!want && t.level === 'far' && d < farR * HYSTERESIS) want = 'far';
      if (want === 'far' && t.level === 'full' && d < fullR * HYSTERESIS) want = 'full';
      const current = t.pending ?? t.level;
      if (want === current || want === t.failed) continue;
      if (!want) {
        t.pending = null;
        clear(t);
        continue;
      }
      t.pending = want;
      wanted.push({ key: t.key, level: want, d });
    }
    if (wanted.length) {
      queue.push(...wanted);
      // Full tiles first, then nearest first.
      queue.sort((a, b) => (a.level === b.level ? a.d - b.d : a.level === 'full' ? -1 : 1));
      pump();
    }
  }

  const ready = fetch(`${base}/index.json`).then((r) => r.json()).then((ix) => {
    index = ix;
    for (const key of Object.keys(ix.tiles)) {
      const [tx, tz] = key.split('_').map(Number);
      tiles.set(key, { key, tx, tz, level: null, pending: null, meshes: [] });
    }
    return ix;
  });

  return {
    group,
    ready,
    update,
    get stats() {
      return { ...stats, queued: queue.length + jobs.size, total: tiles.size };
    },
  };
}

// A large plain ground under the whole city.
export function cityGround() {
  const geo = new THREE.PlaneGeometry(60000, 60000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8f8a5e, roughness: 1 }));
  m.position.y = CITY_Y - 0.02;
  m.receiveShadow = true;
  m.userData.conf = 'ground';
  return m;
}
