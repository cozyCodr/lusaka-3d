// UI vocabulary: shared Tailwind class strings and small element builders.

export const cls = {
  item:
    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-stone-200 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none',
  switchTrack: 'relative h-5 w-9 shrink-0 rounded-full bg-white/15 transition-colors',
  switchTrackOn: 'bg-amber-500',
  switchKnob: 'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
  switchKnobOn: 'translate-x-4',
  segWrap: 'mx-4 my-1.5 grid gap-1 rounded-xl bg-white/5 p-1',
  segOn: 'rounded-lg px-2 py-1.5 text-sm transition-colors bg-amber-500 text-stone-950 font-medium',
  segOff: 'rounded-lg px-2 py-1.5 text-sm transition-colors text-stone-300 hover:bg-white/10',
  hud: 'pointer-events-none fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-baseline gap-2 rounded-2xl bg-stone-950/70 px-4 py-2 text-stone-100 shadow-lg ring-1 ring-white/10 backdrop-blur-md',
  pedal: 'pointer-events-auto fixed z-10 origin-bottom select-none touch-none drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)] transition-[filter] duration-75',
};

// A row of mutually exclusive choices. options: [[value, label, title?], ...].
// Returns the element and set(value) to change the highlighted choice.
export function segmented(label, options, current, onPick) {
  const wrap = document.createElement('div');
  wrap.className = cls.segWrap;
  wrap.style.gridTemplateColumns = `repeat(${options.length}, minmax(0, 1fr))`;
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', label);
  const buttons = options.map(([value, text, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    if (title) b.title = title;
    b.textContent = text;
    b.addEventListener('click', () => onPick(value));
    wrap.append(b);
    return [value, b];
  });
  const set = (v) => {
    for (const [value, b] of buttons) {
      b.setAttribute('aria-checked', String(value === v));
      b.className = value === v ? cls.segOn : cls.segOff;
    }
  };
  set(current);
  return { el: wrap, set };
}

// A menu row that runs an action.
export function menuItem(text, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls.item;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// A menu row with an on/off switch; onChange receives the new state.
export function menuToggle(text, onChange) {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'switch');
  b.className = cls.item;
  const track = document.createElement('span');
  const knob = document.createElement('span');
  track.append(knob);
  b.append(Object.assign(document.createElement('span'), { textContent: text }), track);
  let on = false;
  const render = () => {
    b.setAttribute('aria-checked', String(on));
    track.className = `${cls.switchTrack} ${on ? cls.switchTrackOn : ''}`;
    knob.className = `${cls.switchKnob} ${on ? cls.switchKnobOn : ''}`;
  };
  b.addEventListener('click', () => {
    on = !on;
    render();
    onChange(on);
  });
  render();
  return b;
}

// Top-right hamburger: toggles the menu, closes on Escape or a click outside.
export function setupMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  const iconOpen = document.getElementById('icon-open');
  const iconClose = document.getElementById('icon-close');
  const set = (open) => {
    menu.classList.toggle('hidden', !open);
    iconOpen.classList.toggle('hidden', open);
    iconClose.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => set(menu.classList.contains('hidden')));
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) set(false);
  });
  return { close: () => set(false) };
}

const MODE_LABELS = { map: 'Map', fly: 'Fly', walk: 'Walk', drive: 'Drive' };

// Segmented Map / Fly / Walk switch bound to the store.
export function modeSwitch(store, onPick) {
  const options = Object.entries(MODE_LABELS).map(([mode, label], i) => [mode, label, `${label} (${i + 1})`]);
  const seg = segmented('Camera mode', options, store.getState().mode, (mode) => {
    onPick?.();
    store.getState().setMode(mode);
  });
  store.subscribe(({ mode }) => seg.set(mode));
  return seg.el;
}

// Help overlay (toggle with ?) and a short hint whenever the mode changes.
export function setupHelp() {
  const panel = document.getElementById('help');
  const set = (open) => panel.classList.toggle('hidden', !open);
  document.getElementById('help-close').addEventListener('click', () => set(false));
  const backdrop = document.getElementById('help-backdrop');
  backdrop.addEventListener('click', (e) => e.target === backdrop && set(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  return { toggle: (open) => set(open ?? panel.classList.contains('hidden')) };
}

const HINTS = {
  map: 'Map · drag to pan · right-drag to turn in place · scroll to zoom · ? for help',
  fly: 'Fly · drag to look · WASD to move · Space / C up and down · Shift to boost',
  walk: 'Walk · drag to look · WASD to move · Shift to run · double-click to jump there',
  drive: 'Drive · W / S or arrows to drive and brake · A / D to steer · Space handbrake · R to reset',
};

export function modeHint(store) {
  const el = document.getElementById('mode-hint');
  let timer;
  const show = ({ mode }) => {
    el.textContent = HINTS[mode];
    el.classList.remove('opacity-0');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.add('opacity-0'), 4000);
  };
  let last = store.getState().mode;
  store.subscribe((s) => {
    if (s.mode !== last) show(s);
    last = s.mode;
  });
  return { show: () => show(store.getState()) };
}

// Drive mode: speed and gear, and on touch screens a steering wheel and pedals.
// touch: the drive module's { gas, brake, steer, steering } (pedals 0…1, steer
// -1…1 with + to the left).
const SVG = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
const metal = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3c8cd"/><stop offset=".5" stop-color="#8a9096"/><stop offset="1" stop-color="#55595e"/></linearGradient>`;
// A pedal: brushed-metal plate, a ribbed rubber pad on it.
function pedalSvg(w, h, id) {
  const ribs = Array.from({ length: Math.floor((h - 28) / 12) }, (_, i) =>
    `<rect x="12" y="${16 + i * 12}" width="${w - 24}" height="5" rx="2.5" fill="#1b1b1b"/><rect x="12" y="${16 + i * 12}" width="${w - 24}" height="1" fill="#4a4a4a"/>`).join('');
  return SVG(w, h, `<defs>${metal(id)}</defs>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="url(#${id})" stroke="#2c2f33" stroke-width="2"/>
    <rect x="8" y="9" width="${w - 16}" height="${h - 18}" rx="8" fill="#2a2a2a"/>${ribs}`);
}
// A three-spoke wheel with a marker at twelve o'clock.
const WHEEL = SVG(150, 150, `<defs>${metal('wheel-metal')}</defs>
  <circle cx="75" cy="75" r="66" fill="none" stroke="#1d1d1f" stroke-width="16"/>
  <circle cx="75" cy="75" r="66" fill="none" stroke="#3a3a3d" stroke-width="2" stroke-dasharray="3 5"/>
  <path d="M75 75 L14 84 M75 75 L136 84 M75 75 L75 138" stroke="#2a2a2d" stroke-width="13" stroke-linecap="round"/>
  <circle cx="75" cy="75" r="20" fill="url(#wheel-metal)" stroke="#1d1d1f" stroke-width="3"/>
  <rect x="71" y="5" width="8" height="12" rx="2" fill="#f59e0b"/>`);

// Keep a finger's events on the control even if it slides off (when the browser allows).
const capture = (el, e) => {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    // not a live pointer (e.g. synthetic); the control tracks the finger itself
  }
};

export function driveHud(touch) {
  const root = document.createElement('div');
  root.className = 'hidden';
  const hud = document.createElement('div');
  hud.className = cls.hud;
  const speed = Object.assign(document.createElement('span'), { className: 'text-2xl font-semibold tabular-nums' });
  const unit = Object.assign(document.createElement('span'), { className: 'text-xs text-stone-400', textContent: 'km/h' });
  const gear = Object.assign(document.createElement('span'), { className: 'ml-2 rounded-md bg-white/10 px-1.5 text-sm font-medium tabular-nums' });
  hud.append(speed, unit, gear);
  root.append(hud);
  if (matchMedia('(pointer: coarse)').matches) {
    // pedals: press lower on the pedal for more; the pad tips forward as it goes down
    const pedal = (key, label, w, h, pos) => {
      const b = document.createElement('div');
      b.className = `${cls.pedal} ${pos}`;
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', label);
      b.innerHTML = pedalSvg(w, h, `pedal-${key}`);
      const set = (v) => {
        touch[key] = v;
        b.style.transform = `perspective(300px) rotateX(${18 * v}deg) translateY(${4 * v}px)`;
        b.style.filter = `brightness(${1 - 0.25 * v})`;
      };
      const press = (e) => {
        const r = b.getBoundingClientRect();
        set(0.5 + 0.5 * Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
      };
      let finger = null;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        finger = e.pointerId;
        capture(b, e);
        press(e);
        navigator.vibrate?.(8);
      });
      b.addEventListener('pointermove', (e) => e.pointerId === finger && press(e));
      for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, (e) => {
        if (e.pointerId !== finger) return;
        finger = null;
        set(0);
      });
      return b;
    };
    // steering wheel: turn it with a thumb, up to 135° each way; it springs back when let go
    const wheel = document.createElement('div');
    wheel.className = `${cls.pedal} bottom-5 left-4 rounded-full`;
    wheel.setAttribute('role', 'slider');
    wheel.setAttribute('aria-label', 'Steering wheel');
    wheel.innerHTML = WHEEL;
    let angle = 0, grab = null;
    const draw = () => {
      wheel.firstElementChild.style.transform = `rotate(${angle}deg)`;
      const a = Math.abs(angle) < 3 ? 0 : angle;
      touch.steer = -Math.sign(a) * Math.abs(a / 135) ** 1.4; // clockwise turns right
    };
    const at = (e) => {
      const r = wheel.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    wheel.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(wheel, e);
      grab = { last: at(e), id: e.pointerId };
      touch.steering = true;
    });
    wheel.addEventListener('pointermove', (e) => {
      if (!grab || e.pointerId !== grab.id) return;
      const now = at(e);
      let d = now - grab.last;
      d = ((d + 540) % 360) - 180; // unwrap
      grab.last = now;
      angle = Math.max(-135, Math.min(135, angle + d));
      draw();
    });
    const release = (e) => {
      if (!grab || e.pointerId !== grab.id) return;
      grab = null;
      let t = performance.now();
      const back = (now) => {
        if (grab) return;
        angle *= Math.exp(-10 * Math.min(0.05, (now - t) / 1000));
        t = now;
        if (Math.abs(angle) < 0.5) angle = 0;
        draw();
        if (angle) requestAnimationFrame(back);
        else touch.steering = false;
      };
      requestAnimationFrame(back);
    };
    for (const ev of ['pointerup', 'pointercancel']) wheel.addEventListener(ev, release);
    root.append(
      wheel,
      pedal('brake', 'Brake', 92, 84, 'bottom-6 right-24'),
      pedal('gas', 'Accelerator', 64, 128, 'bottom-6 right-4'),
    );
    hud.classList.replace('bottom-6', 'bottom-44');
  }
  document.body.append(root);
  return {
    show(on) {
      root.classList.toggle('hidden', !on);
      if (!on) Object.assign(touch, { gas: 0, brake: 0, steer: 0, steering: false });
    },
    set({ kmh, gear: g }) {
      speed.textContent = kmh;
      gear.textContent = g;
    },
  };
}
