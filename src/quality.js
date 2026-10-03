// Quality tiers. Picked once at start from the device (phones and low-memory
// machines get less), overridable with ?quality=low|medium|high or the menu;
// the choice is remembered in this browser. Changing tier reloads the page,
// since antialiasing can only be set when the renderer is created.

export const TIERS = {
  low: {
    label: 'Low',
    pixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMap: 1024,
    bloom: false,
    fullR: [500, 1000], // full-detail tile radius, at ground level and from high up
    farR: [3000, 7000],
    workers: 2,
    trees: 0.25, // share of trees drawn
    treeShadows: false,
  },
  medium: {
    label: 'Medium',
    pixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMap: 2048,
    bloom: true,
    fullR: [700, 1600],
    farR: [4500, 10000],
    workers: 2,
    trees: 0.55,
    treeShadows: false,
  },
  high: {
    label: 'High',
    pixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMap: 4096,
    bloom: true,
    fullR: [900, 2200],
    farR: [5500, 14000],
    workers: 3,
    trees: 1,
    treeShadows: true,
  },
};

const KEY = 'lusaka.quality';
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

// Best guess for this device.
export function detectTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 900;
  const mem = navigator.deviceMemory ?? 8; // Chrome only; Safari reports nothing
  const cores = navigator.hardwareConcurrency ?? 8;
  if (coarse && small) return mem <= 4 || cores <= 4 ? 'low' : 'medium';
  return mem <= 4 || cores <= 4 ? 'medium' : 'high';
}

const fromUrl = new URLSearchParams(location.search).get('quality');
export const tierName = TIERS[fromUrl] ? fromUrl : TIERS[read()] ? read() : detectTier();
export const quality = TIERS[tierName];
export const isAuto = !TIERS[fromUrl] && !TIERS[read()];

export function setTier(name) {
  try {
    if (name === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, name);
  } catch {
    // storage blocked: the URL parameter still works
  }
  const url = new URL(location.href);
  url.searchParams.delete('quality');
  // replacing with the same URL (it has a #view) does not reload, so reload then
  if (url.href === location.href) location.reload();
  else location.replace(url);
}
