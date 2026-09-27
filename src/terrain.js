// Ground height, with no three.js dependency so the tile worker can use it.
// World frame: metres around the Parliament origin, x = east, z = south, y up.
// The city ground sits at CITY_Y; the Parliament stands on a hill above it,
// described in the Parliament site's local frame (placed by SITE).
import { smoothstep } from './util.js';

export const CITY_Y = -4.5;

// OSM outline centre and facade bearing (28°): local +z faces the walkway.
export const SITE = { x: 0.75, z: 3.6, bearing: 28 };
SITE.rotY = ((180 - SITE.bearing) * Math.PI) / 180;

const FRONT = 51.5 / 2; // z of the Assembly's front facade (DIM.ringD / 2 in building.js)
export const WALK = { start: FRONT + 6, end: FRONT + 62, width: 9, drop: -CITY_Y, steps: 14 };
export const HILL = { flat: 85, foot: 150, size: 340 };

// Ground height in the site's local frame: a flat hilltop that falls steeply
// toward the road in front and gently everywhere else, down to city level.
export function groundHeight(x, z) {
  const front = -WALK.drop * smoothstep((z - WALK.start) / (WALK.end - WALK.start));
  const r = Math.hypot(x * 0.8, z);
  const around = -WALK.drop * smoothstep((r - HILL.flat) / (HILL.foot - HILL.flat));
  return Math.min(front, around);
}

const c = Math.cos(SITE.rotY), s = Math.sin(SITE.rotY);

export function toSiteLocal(x, z) {
  const dx = x - SITE.x, dz = z - SITE.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

// Ground height anywhere in the world: the Parliament hill, else city level.
export function heightAt(x, z) {
  const [lx, lz] = toSiteLocal(x, z);
  return groundHeight(lx, lz);
}
