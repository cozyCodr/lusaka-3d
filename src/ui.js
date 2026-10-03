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

const MODE_LABELS = { map: 'Map', fly: 'Fly', walk: 'Walk' };

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
