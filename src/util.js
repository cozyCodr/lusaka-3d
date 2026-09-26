// Shared helpers: seeded randomness, shadow flags, and confidence tagging.

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// conf: 'high' (measured / photographed), 'med' (estimated), 'low' (guessed).
export function tag(obj, conf, { cast = true, receive = true } = {}) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = cast;
    o.receiveShadow = receive;
    if (conf) o.userData.conf = conf;
  });
  return obj;
}

export const smoothstep = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export const lerp = (a, b, t) => a + (b - a) * t;
