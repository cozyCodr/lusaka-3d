// World frame: metres around the Parliament origin (-15.39227, 28.30904),
// x = east, z = south, y = up; the city ground sits at CITY_Y. The hand-built
// Parliament site lives in its own local frame, placed by SITE.
import { groundHeight } from './site.js';

export const CITY_Y = -4.5;

// OSM outline centre and facade bearing (28°): local +z faces the walkway.
export const SITE = { x: 0.75, z: 3.6, bearing: 28 };
SITE.rotY = ((180 - SITE.bearing) * Math.PI) / 180;

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

// Unit vector toward the sun for a compass bearing and elevation (degrees).
export function sunVector(bearing, elevation, out) {
  const b = (bearing * Math.PI) / 180, e = (elevation * Math.PI) / 180;
  return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e));
}
