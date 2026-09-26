// UI vocabulary: shared Tailwind class strings and small element builders.

export const cls = {
  item:
    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-stone-200 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none',
  switchTrack: 'relative h-5 w-9 shrink-0 rounded-full bg-white/15 transition-colors',
  switchTrackOn: 'bg-amber-500',
  switchKnob: 'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
  switchKnobOn: 'translate-x-4',
};

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
