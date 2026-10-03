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
  pedal: 'pointer-events-auto grid select-none place-items-center rounded-2xl bg-stone-950/55 text-sm font-medium text-stone-100 shadow-lg ring-1 ring-white/15 backdrop-blur-md touch-none data-[on=true]:bg-amber-500/80 data-[on=true]:text-stone-950',
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

// Drive mode: speed and gear, and on touch screens steering buttons and pedals.
// touch: the drive module's { left, right, gas, brake } flags.
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
    const pad = (label, key, pos) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, className: `${cls.pedal} fixed ${pos}` });
      b.setAttribute('aria-label', key);
      const set = (on) => {
        touch[key] = on;
        b.dataset.on = String(on);
      };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        set(true);
      });
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => set(false));
      return b;
    };
    root.append(
      pad('◀', 'left', 'bottom-6 left-4 h-20 w-16'),
      pad('▶', 'right', 'bottom-6 left-24 h-20 w-16'),
      pad('Brake', 'brake', 'bottom-6 right-24 h-20 w-16'),
      pad('Gas', 'gas', 'bottom-6 right-4 h-28 w-16'),
    );
    hud.classList.replace('bottom-6', 'bottom-32');
  }
  document.body.append(root);
  return {
    show(on) {
      root.classList.toggle('hidden', !on);
      if (!on) for (const k of Object.keys(touch)) touch[k] = false;
    },
    set({ kmh, gear: g }) {
      speed.textContent = kmh;
      gear.textContent = g;
    },
  };
}
