// World frame: metres around the Parliament origin (-15.39227, 28.30904),
// x = east, z = south, y = up. Terrain lives in terrain.js (worker-safe);
// this module adds the three.js-side helpers.
export { CITY_Y, heightAt, SITE, toSiteLocal } from './terrain.js';

// Unit vector toward the sun for a compass bearing and elevation (degrees).
export function sunVector(bearing, elevation, out) {
  const b = (bearing * Math.PI) / 180, e = (elevation * Math.PI) / 180;
  return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e));
}
