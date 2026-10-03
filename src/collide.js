// Spatial indexes for collisions: building footprints (Walk mode, and the
// car's colliders in Drive mode) and wall segments (Drive mode). Shapes are
// in world x/z; a uniform grid keeps lookups cheap.

const CELL = 40;

function inside(pts, x, z) {
  let hit = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], zi = pts[i + 1], xj = pts[j], zj = pts[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

export function createFootprintIndex() {
  const grid = new Map();
  const groups = new Map(); // group -> [{ item, cells }]
  const key = (cx, cz) => `${cx},${cz}`;

  return {
    // pts: flat [x0, z0, x1, z1, ...]; group lets a streamed tile drop its footprints.
    add(pts, group = null) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
        minZ = Math.min(minZ, pts[i + 1]); maxZ = Math.max(maxZ, pts[i + 1]);
      }
      const item = { pts, minX, maxX, minZ, maxZ };
      const cells = [];
      for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
        for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
          const k = key(cx, cz);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(item);
          cells.push(k);
        }
      }
      if (group !== null) {
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push({ item, cells });
      }
    },
    removeGroup(group) {
      for (const { item, cells } of groups.get(group) ?? []) {
        for (const k of cells) {
          const list = grid.get(k);
          const i = list?.indexOf(item) ?? -1;
          if (i >= 0) list.splice(i, 1);
        }
      }
      groups.delete(group);
    },
    // Every footprint with a bounding box within r of (x, z): [{ pts, minX, … }].
    near(x, z, r) {
      const out = new Set();
      for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
        for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
          for (const it of grid.get(key(cx, cz)) ?? []) {
            if (it.maxX > x - r && it.minX < x + r && it.maxZ > z - r && it.minZ < z + r) out.add(it);
          }
        }
      }
      return out;
    },
    // True when (x, z) lies within `pad` metres inside or near any footprint.
    blocked(x, z, pad = 0.35) {
      const cell = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
      if (!cell) return false;
      for (const it of cell) {
        if (x < it.minX - pad || x > it.maxX + pad || z < it.minZ - pad || z > it.maxZ + pad) continue;
        if (inside(it.pts, x, z) || inside(it.pts, x + pad, z) || inside(it.pts, x - pad, z) ||
            inside(it.pts, x, z + pad) || inside(it.pts, x, z - pad)) return true;
      }
      return false;
    },
  };
}

// Wall segments [x0, z0, x1, z1, half thickness, height] per tile, for the car.
export function createSegmentIndex() {
  const grid = new Map();
  const groups = new Map();
  const key = (cx, cz) => `${cx},${cz}`;
  return {
    // segs: flat Float32Array, 6 numbers per segment
    add(segs, group) {
      const items = [];
      for (let i = 0; i < segs.length; i += 6) {
        const it = { seg: segs.subarray(i, i + 6) };
        const cx = Math.floor((segs[i] + segs[i + 2]) / 2 / CELL), cz = Math.floor((segs[i + 1] + segs[i + 3]) / 2 / CELL);
        const k = key(cx, cz);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(it);
        items.push([k, it]);
      }
      groups.set(group, items);
    },
    removeGroup(group) {
      for (const [k, it] of groups.get(group) ?? []) {
        const list = grid.get(k);
        const i = list?.indexOf(it) ?? -1;
        if (i >= 0) list.splice(i, 1);
      }
      groups.delete(group);
    },
    near(x, z, r) {
      const out = [];
      for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
        for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) out.push(...(grid.get(key(cx, cz)) ?? []));
      }
      return out;
    },
  };
}
