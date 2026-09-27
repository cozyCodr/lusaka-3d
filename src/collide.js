// Spatial index over building footprints for Walk-mode collisions.
// Footprints are polygons in world x/z; a uniform grid keeps lookups cheap.

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
