// Procedural canvas textures, so no photographs are baked into the model.
import * as THREE from 'three';
import { rng } from './util.js';

function canvasTexture(w, h, draw, { repeat = [1, 1], color = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Weathered copper: vertical streaks with patches of darker oxidation.
export function copperTexture() {
  const r = rng(7);
  return canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#b0603f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = r() * w;
      const len = 20 + r() * 160;
      const dark = r() < 0.5;
      g.fillStyle = dark ? `rgba(70,30,20,${0.05 + r() * 0.12})` : `rgba(230,150,100,${0.04 + r() * 0.1})`;
      g.fillRect(x, r() * h, 1 + r() * 3, len);
    }
    // faint horizontal panel seams
    g.fillStyle = 'rgba(40,18,10,0.35)';
    for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
  });
}

// Pale concrete paving with a joint grid.
export function pavingTexture() {
  const r = rng(3);
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#d9cfbf';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '90,80,70' : '255,250,240'},${r() * 0.08})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(120,105,90,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
    }
  });
}

// Lit window strips for the finned upper storey (used as an emissive map).
export function windowGlowTexture() {
  const r = rng(11);
  return canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    const bay = 16;
    for (let x = 0; x < w; x += bay) {
      const on = r();
      if (on < 0.3) continue;
      const v = 120 + Math.floor(r() * 135);
      g.fillStyle = `rgb(${v},${Math.floor(v * 0.78)},${Math.floor(v * 0.5)})`;
      g.fillRect(x + 3, 12, bay - 6, h - 24);
    }
  });
}

// "NATIONAL ASSEMBLY OF ZAMBIA" in spaced capitals on the dark fascia.
export function letteringTexture() {
  return canvasTexture(2048, 96, (g, w, h) => {
    g.fillStyle = '#2b2119';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#efe3cf';
    g.font = '600 58px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const text = 'NATIONAL  ASSEMBLY  OF  ZAMBIA';
    g.letterSpacing = '14px';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// Zambian flag: green field, eagle above red/black/orange stripes at the fly.
export function zambiaFlagTexture() {
  return canvasTexture(300, 200, (g, w, h) => {
    g.fillStyle = '#198a00';
    g.fillRect(0, 0, w, h);
    const sx = w * 0.7, sw = w * 0.1, sy = h * 0.375;
    g.fillStyle = '#de2010'; g.fillRect(sx, sy, sw, h - sy);
    g.fillStyle = '#000'; g.fillRect(sx + sw, sy, sw, h - sy);
    g.fillStyle = '#ef7d00'; g.fillRect(sx + 2 * sw, sy, sw, h - sy);
    // simplified eagle: two swept wings and a body
    g.fillStyle = '#ef7d00';
    g.beginPath();
    g.moveTo(w * 0.72, h * 0.12);
    g.quadraticCurveTo(w * 0.85, h * 0.3, w * 0.98, h * 0.1);
    g.quadraticCurveTo(w * 0.88, h * 0.24, w * 0.85, h * 0.3);
    g.quadraticCurveTo(w * 0.82, h * 0.24, w * 0.72, h * 0.12);
    g.fill();
  });
}
