// UI vocabulary: shared Tailwind class strings and small element builders.

export const cls = {
  button:
    'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-white/15 bg-white/5 hover:bg-white/15 active:bg-white/25 transition-colors',
  buttonOn: 'bg-amber-500/25 ring-amber-400/60 text-amber-100',
};

export function button(text, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls.button;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

export function setOn(el, on) {
  for (const c of cls.buttonOn.split(' ')) el.classList.toggle(c, on);
  el.setAttribute('aria-pressed', String(on));
}
