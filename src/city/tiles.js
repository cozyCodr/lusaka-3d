// Streams the OSM city in 1 km tiles around the camera (data/tiles, built by
// tools/osm_tiles.py). Two levels: "full" (every building, road and area)
// near the focus point, "far" (large buildings, main roads, big areas) out to
// the haze; nothing beyond. Geometry is built in a small pool of workers.
import * as THREE from 'three';
import { CITY_Y } from '../terrain.js';
import { treeMeshes } from './trees.js';

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

// Facades (worker.js, FACADES): windows drawn from per-vertex bay and floor
// coordinates, so a whole city needs no textures. Distant walls blend to the
// average of glass and wall instead of shimmering; at night a share of the
// windows lights up. Iron roofs get their ribs from the same coordinates.
const night = { value: 0 };
function facades(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 facade;\nvarying vec4 vFac;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFac = facade;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vFac;
uniform float uNight;
float facHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
// window rectangle in a bay and floor: x0, x1, y0, y1
vec4 facWindow(float k, float floorNo) {
  if (k < 1.5) return vec4(0.3, 0.7, 0.3, 0.72);            // house
  if (k < 2.5) return vec4(0.22, 0.78, 0.3, 0.75);          // flats
  if (k < 3.5) return floorNo < 0.5 ? vec4(0.08, 0.92, 0.06, 0.68) : vec4(0.2, 0.8, 0.3, 0.72); // shopfronts below
  if (k < 4.5) return vec4(0.06, 0.94, 0.3, 0.9);           // office ribbon glazing
  if (k < 5.5) return vec4(0.14, 0.86, 0.32, 0.76);         // schools, hospitals
  if (k < 6.5) return vec4(0.4, 0.6, 0.22, 0.8);            // tall church windows
  return vec4(0.08, 0.92, 0.8, 0.9);                        // clerestory strip on sheds
}
float facBox(vec2 f, vec4 r, vec2 w) {
  return smoothstep(r.x - w.x, r.x + w.x, f.x) * (1.0 - smoothstep(r.y - w.x, r.y + w.x, f.x)) *
    smoothstep(r.z - w.y, r.z + w.y, f.y) * (1.0 - smoothstep(r.w - w.y, r.w + w.y, f.y));
}
float facGlass = 0.0, facLit = 0.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float k = floor(vFac.z + 0.5);
  vec2 c = vFac.xy, w = fwidth(c);
  if (k > 0.5 && k < 7.5) {
    vec2 f = fract(c), cell = floor(c);
    vec4 r = facWindow(k, cell.y);
    float far = smoothstep(0.2, 0.55, max(w.x, w.y)); // a bay only a few pixels wide
    float m = c.x >= 0.0 && c.y >= 0.0 ? facBox(f, r, w) : 0.0;
    // shopfronts: a mullion down the middle of each pane, so they read as glass, not garage doors
    if (k > 2.5 && k < 3.5 && cell.y < 0.5) m *= smoothstep(0.012, 0.012 + 2.0 * w.x, abs(f.x - 0.5));
    float share = (r.y - r.x) * (r.w - r.z);
    float on = step(facHash(cell + vFac.w * 113.0), k > 3.5 && k < 4.5 ? 0.45 : 0.3);
    facGlass = mix(m, share * 0.85, far);
    facLit = mix(m * on, share * 0.3, far);
    // shop signs: a coloured fascia band over the shopfronts
    if (k > 2.5 && k < 3.5 && cell.y < 0.5 && c.x >= 0.0) {
      vec3 sign = vec3(facHash(vec2(vFac.w, 1.0)), facHash(vec2(vFac.w, 2.0)), facHash(vec2(vFac.w, 3.0)));
      float band = smoothstep(0.76, 0.78, f.y) * (1.0 - smoothstep(0.93, 0.95, f.y)) * (1.0 - far);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.35), sign * sign, 0.6) * 0.75, band * 0.85);
    }
    vec3 glass = k > 3.5 && k < 4.5 ? vec3(0.05, 0.09, 0.11) : vec3(0.045, 0.05, 0.055);
    diffuseColor.rgb = mix(diffuseColor.rgb, glass, facGlass);
    // a darker plinth where the walls meet the ground
    diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(-0.05, 0.3, c.y));
  } else if (k > 7.5) {
    // corrugated iron: ribs catch the light, fading out with distance
    diffuseColor.rgb *= 1.0 + 0.09 * sin(c.x * 6.2832) * (1.0 - smoothstep(0.15, 0.45, w.x));
  }
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.2, facGlass);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.7, 0.4) * 1.4 * facLit * uNight;');
  };
  return mat;
}

export function createTileManager({ scene, footprints, quality, clearings = () => false, onMesh = () => {}, base = './data/tiles' }) {
  const { fullR: [full0, full1], farR: [far0, far1], workers } = quality;
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const mats = {
    buildings: facades(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 })),
    roads: asphalt(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })),
    areas: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  };
  const CONF = { buildings: 'med', roads: 'high', areas: 'high' };

  const tiles = new Map(); // key -> { tx, tz, level, meshes, pending }
  const queue = [];
  const jobs = new Map();
  let nextId = 1, index = null, stats = { full: 0, far: 0, buildings: 0 };

  const pool = Array.from({ length: workers }, () => {
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
    if (batch.facade) g.setAttribute('facade', new THREE.BufferAttribute(batch.facade, 4));
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
      if (m.isInstancedMesh) m.dispose(); // frees the instance buffers
      if (!m.userData.sharedGeometry) m.geometry.dispose();
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
    // trees, kept off landmark buildings and grounds the worker cannot see
    if (data.trees?.length) {
      const keep = (x, z) => !footprints.blocked(x, z, 2) && !clearings(x, z);
      for (const m of treeMeshes(data.trees, { keep, shadows: quality.treeShadows && job.level === 'full' })) {
        group.add(m);
        onMesh(m);
        t.meshes.push(m);
      }
    }
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
      w.postMessage({ id, url: new URL(`${base}/${job.level}/${job.key}.json`, location.href).href, tx: t.tx, tz: t.tz, tile: index.tile, level: job.level, treeDensity: quality.trees });
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
    const fullR = THREE.MathUtils.clamp(full0 + altitude * 1.2, full0, full1);
    const farR = THREE.MathUtils.clamp(far0 + altitude * 2.5, far0, far1);
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
    // 0 day … 1 night: lights a share of the city's windows
    setNight(n) {
      night.value = n;
    },
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
