// Embassy Park Presidential Burial Site, Independence Avenue: the three
// built mausoleums on their OSM footprints, and the round podium striped in
// the flag's colours. Kaunda's and Banda's graves have no mausoleum yet and
// are not modelled.
// - Michael Sata: a two-storey rendered block; a straight stair climbs the
//   front to a railed terrace around a smaller glazed pavilion whose flat
//   roof carries a white balustrade and a portrait medallion.
// - Levy Mwanawasa: a round drum with four big arched glazed openings under a
//   broad flat disc roof, carried on four flared piers with a brown band.
// - Frederick Chiluba: a white drum with semicircular glazed arches, dark
//   raking struts, a cream fascia ring, a faceted charcoal roof, a louvred
//   lantern and a cross.
// Sources: docs/landmarks/embassy-park.md.
import * as THREE from 'three';
import { tag } from '../util.js';
import { beam, canvasTex, glowing, siteFrame, rectFootprint } from './lib.js';

// Footprint centres from OSM (ways 1061983719, 1061983883, 1062088974);
// bearings are the way each front faces.
const SATA = { x: 0.7, z: 3227.5, bearing: 221 }; // stair faces SW, to Independence Ave (aerial)
const MWANAWASA = { x: 36.3, z: 3256, bearing: 45 }; // entrance steps: bearing guessed
const CHILUBA = { x: 76, z: 3288.5, bearing: 240 }; // entry bays: bearing guessed
const PODIUM = { x: 53.8, z: 3239.4, r: 5.7 }; // the white ring on the aerial

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

// ---------- shared textures ----------
// A rail panel: top rail, bottom rail and balusters, cut out with alphaTest.
function railTex(color, spacing = 10) {
  const t = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, 4);
    g.fillRect(0, h - 3, w, 3);
    for (let x = 2; x < w; x += spacing) g.fillRect(x, 0, 2, h);
  });
  return t;
}
function railing(len, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat);
  m.geometry.translate(0, h / 2, 0);
  return m;
}

// Wall texture for a drum: `draw(g, cx, w, h)` paints one opening centred at
// canvas x = cx; openings sit at the given fractions of the way round (0 =
// local +z, increasing towards +x), drawn twice so they wrap the seam.
function drumTex(wall, at, draw, size = [1024, 160]) {
  return canvasTex(size[0], size[1], (g, w, h) => {
    g.fillStyle = wall;
    g.fillRect(0, 0, w, h);
    for (const f of at) for (const shift of [-w, 0, w]) draw(g, f * w + shift, w, h);
  }, { repeat: false });
}
function grid(g, x0, y0, x1, y1, cols, rows, color = '#7a6348') {
  g.strokeStyle = color;
  g.lineWidth = 2;
  for (let i = 1; i < cols; i++) {
    const x = x0 + ((x1 - x0) * i) / cols;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = y0 + ((y1 - y0) * j) / rows;
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  }
}

// ---------- Michael Sata ----------
const S = { W: 14.4, D: 17, LOW: 3.3, UW: 9.6, UD: 8.6, UH: 3.0, STAIR: 6 };

function sataFacade(kind) {
  // kind: 'front' (solid wings, glazed centre), 'side' (glazed bays), 'upper'
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = kind === 'upper' ? '#8f8373' : '#a99a82';
    g.fillRect(0, 0, w, h);
    const bay = (x0, x1, top, louvre) => {
      g.fillStyle = '#1f2833';
      g.fillRect(x0, top, x1 - x0, h - top - 6);
      grid(g, x0, top, x1, h - 6, 3, 2, '#c9c2b4');
      if (louvre) {
        g.fillStyle = '#4a4540';
        g.fillRect(x0, top - 18, x1 - x0, 14);
      }
    };
    if (kind === 'front') {
      bay(w * 0.33, w * 0.67, 34);
    } else if (kind === 'side') {
      for (let i = 0; i < 4; i++) bay(20 + i * 124, 110 + i * 124, 36, true);
    } else {
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#3a3835';
        g.fillRect(i * (w / 3), 0, 14, h);
        bay(i * (w / 3) + 14, (i + 1) * (w / 3), 8);
      }
      g.fillStyle = '#3a3835';
      g.fillRect(w - 14, 0, 14, h);
    }
  });
}

function buildSata(mats) {
  const f = siteFrame(SATA.x, SATA.z, SATA.bearing);
  const render = std(0xa99a82), deck = std(0xbcae98), fascia = std(0xb1a48d);
  const front = glowing(sataFacade('front'), { roughness: 0.8 });
  const side = glowing(sataFacade('side'), { roughness: 0.8 });
  const upper = glowing(sataFacade('upper'), { roughness: 0.6 });
  mats.push(front, side, upper);

  // Paved apron, then the lower block (box faces: +x, -x, top, bottom, +z, -z).
  const apron = new THREE.Mesh(new THREE.BoxGeometry(S.W + 7, 0.1, S.D + S.STAIR + 4), std(0xc9b89c));
  apron.position.set(0, 0.05, S.STAIR / 2);
  f.add(tag(apron, 'med', { cast: false }));
  const low = new THREE.Mesh(new THREE.BoxGeometry(S.W, S.LOW, S.D), [side, side, deck, render, front, render]);
  low.position.y = S.LOW / 2;
  f.add(tag(low, 'med'));

  // Upper glazed pavilion toward the back, its roof slab and balustrade.
  const uz = -S.D / 2 + S.UD / 2 + 0.8;
  const up = new THREE.Mesh(new THREE.BoxGeometry(S.UW, S.UH, S.UD), [upper, upper, deck, deck, upper, upper]);
  up.position.set(0, S.LOW + S.UH / 2, uz);
  f.add(tag(up, 'med'));
  const slab = new THREE.Mesh(new THREE.BoxGeometry(S.UW + 0.8, 0.8, S.UD + 0.8), fascia);
  slab.position.set(0, S.LOW + S.UH + 0.4, uz);
  f.add(tag(slab, 'med'));
  const white = new THREE.MeshStandardMaterial({ map: railTex('#f2f2ee', 12), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  const top = S.LOW + S.UH + 0.8;
  for (const [len, x, z, ry] of [
    [S.UW + 0.6, 0, uz + S.UD / 2 + 0.3, 0], [S.UW + 0.6, 0, uz - S.UD / 2 - 0.3, 0],
    [S.UD + 0.6, S.UW / 2 + 0.3, uz, Math.PI / 2], [S.UD + 0.6, -S.UW / 2 - 0.3, uz, Math.PI / 2],
  ]) {
    const r = railing(len, 0.8, white);
    r.position.set(x, top, z);
    r.rotation.y = ry;
    f.add(tag(r, 'high', { cast: false }));
  }
  // Portrait medallion on the front of the roof slab (a plain disc).
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), std(0x8fb6d6, { roughness: 0.3 }));
  disc.position.set(0, S.LOW + S.UH + 0.4, uz + S.UD / 2 + 0.41);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 24), std(0xf2f2ee));
  rim.position.copy(disc.position);
  f.add(tag(disc, 'high'), tag(rim, 'high'));

  // Dark rails round the terrace, open where the stair arrives.
  const dark = new THREE.MeshStandardMaterial({ map: railTex('#2a2a2a', 9), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const gap = 1.5;
  const wing = S.W / 2 - gap;
  for (const [len, x, z, ry] of [
    [wing, -(gap + wing / 2), S.D / 2, 0], [wing, gap + wing / 2, S.D / 2, 0],
    [S.D, S.W / 2, 0, Math.PI / 2], [S.D, -S.W / 2, 0, Math.PI / 2], [S.W, 0, -S.D / 2, 0],
  ]) {
    const r = railing(len, 1.05, dark);
    r.position.set(x, S.LOW, z);
    r.rotation.y = ry;
    f.add(tag(r, 'med', { cast: false }));
  }

  // Straight stair up the front, with handrails.
  const steps = 20, rise = S.LOW / steps, run = S.STAIR / steps;
  const stairMat = std(0x9e9588);
  // Open stair: treads on two sloped stringers.
  const tread = new THREE.BoxGeometry(2.4, 0.08, run + 0.04);
  for (let i = 0; i < steps; i++) {
    const s = new THREE.Mesh(tread, stairMat);
    s.position.set(0, rise * (i + 1) - 0.04, S.D / 2 + S.STAIR - (i + 0.5) * run);
    f.add(tag(s, 'med'));
  }
  for (const x of [-1.25, 1.25]) {
    const foot = new THREE.Vector3(x, 0.15, S.D / 2 + S.STAIR);
    const head = new THREE.Vector3(x, S.LOW - 0.15, S.D / 2);
    const stringer = beam(foot, head, 0.3, stairMat);
    stringer.scale.set(0.5, 1, 1.6);
    f.add(tag(stringer, 'med'));
  }
  const rail = std(0x2a2a2a, { roughness: 0.5 });
  for (const x of [-1.35, 1.35]) {
    const a = new THREE.Vector3(x, 1.0, S.D / 2 + S.STAIR);
    const b = new THREE.Vector3(x, S.LOW + 1.0, S.D / 2);
    f.add(tag(beam(a, b, 0.06, rail), 'med'));
    for (let t = 0; t <= 1; t += 0.25) {
      const p = a.clone().lerp(b, t);
      f.add(tag(beam(new THREE.Vector3(x, p.y - 1.0, p.z), p, 0.05, rail), 'med'));
    }
  }
  return { frame: f, footprint: rectFootprint(f, S.W, S.D) };
}

// ---------- Levy Mwanawasa ----------
const M = { R: 6.3, WALL: 5.7, DISC_R: 8, DISC_H: 1.1, PLINTH: 0.4 };

function buildMwanawasa(mats) {
  const f = siteFrame(MWANAWASA.x, MWANAWASA.z, MWANAWASA.bearing);
  const beige = std(0xd9c9a8), band = std(0x7a4e35);
  // Plinth with brick steps at the entrance (+z).
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(M.DISC_R + 0.4, M.DISC_R + 0.4, M.PLINTH, 40), std(0xa0624a));
  plinth.position.y = M.PLINTH / 2;
  f.add(tag(plinth, 'med'));
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(7 - i, M.PLINTH / 2, 1.2), std(0xa0624a));
    s.position.set(0, M.PLINTH / 4 + (i * M.PLINTH) / 2, M.DISC_R + 0.4 + 0.6 - i * 0.6);
    f.add(tag(s, 'low'));
  }

  // Drum with four big arched glazed openings (one per quarter).
  const tex = drumTex('#d9c9a8', [0, 0.25, 0.5, 0.75], (g, cx, w, h) => {
    const aw = w * 0.2, top = h * 0.18, spring = h * 0.78;
    g.fillStyle = '#1e2630';
    g.beginPath();
    g.moveTo(cx - aw / 2, h);
    g.lineTo(cx - aw / 2, spring);
    g.ellipse(cx, spring, aw / 2, spring - top, 0, Math.PI, 0);
    g.lineTo(cx + aw / 2, h);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    grid(g, cx - aw / 2, top, cx + aw / 2, h, 8, 5, '#6d5a44');
    g.restore();
  });
  const drumMat = glowing(tex, { roughness: 0.75 });
  mats.push(drumMat);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(M.R, M.R, M.WALL - M.PLINTH, 48, 1, true), drumMat);
  drum.position.y = M.PLINTH + (M.WALL - M.PLINTH) / 2;
  f.add(tag(drum, 'med'));

  // Four flared piers on the diagonals, each with a brown band.
  const profile = [[1.35, 0], [1.25, 0.6], [0.95, 1.6], [0.75, 2.6], [0.8, 3.4], [1.05, 4.3], [1.4, 5.0], [1.6, 5.4]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const pierGeo = new THREE.LatheGeometry(profile, 20);
  const bandGeo = new THREE.CylinderGeometry(0.82, 0.78, 0.55, 20);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const p = new THREE.Mesh(pierGeo, beige);
    p.position.set(Math.sin(a) * 6.8, M.PLINTH, Math.cos(a) * 6.8);
    const b = new THREE.Mesh(bandGeo, band);
    b.position.set(p.position.x, M.PLINTH + 2.75, p.position.z);
    f.add(tag(p, 'med'), tag(b, 'med'));
  }

  // The disc roof.
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(M.DISC_R, M.DISC_R, M.DISC_H, 64), std(0xcfc3aa));
  disc.position.y = M.WALL + M.DISC_H / 2;
  f.add(tag(disc, 'high'));
  const soffit = new THREE.Mesh(new THREE.CylinderGeometry(M.DISC_R - 0.3, M.DISC_R - 0.3, 0.1, 48), std(0xa99c84));
  soffit.position.y = M.WALL - 0.05;
  f.add(tag(soffit, 'med', { cast: false }));
  return { frame: f, footprint: ring(f, M.DISC_R + 0.4) };
}

// ---------- Frederick Chiluba ----------
const C = { R: 7.4, WALL: 5.6, PLINTH: 0.45, FASCIA_R: 8.5, FASCIA_H: 1.2, ROOF_H: 3.4 };

function buildChiluba(mats) {
  const f = siteFrame(CHILUBA.x, CHILUBA.z, CHILUBA.bearing);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(9.3, 9.3, C.PLINTH, 32), std(0x8f5a45));
  plinth.position.y = C.PLINTH / 2;
  f.add(tag(plinth, 'med'));

  // Round paved ring and hedge from the aerial.
  const pave = new THREE.Mesh(new THREE.RingGeometry(12.2, 13.8, 64), std(0xcdbfa6));
  pave.rotation.x = -Math.PI / 2;
  pave.position.y = 0.04;
  f.add(tag(pave, 'med', { cast: false }));
  const hedgeShape = new THREE.Shape().absarc(0, 0, 14.6, 0, Math.PI * 2);
  hedgeShape.holes.push(new THREE.Path().absarc(0, 0, 13.9, 0, Math.PI * 2, true));
  const hedge = new THREE.Mesh(new THREE.ExtrudeGeometry(hedgeShape, { depth: 0.7, bevelEnabled: false, curveSegments: 48 }), std(0x4f7a2a, { roughness: 0.95 }));
  hedge.rotation.x = -Math.PI / 2;
  f.add(tag(hedge, 'med'));

  // White drum: glazed semicircular arches on three sides, entry bays at +z.
  const tex = drumTex('#eef0ec', [0.25, 0.5, 0.75], (g, cx, w, h) => {
    const aw = w * 0.11, r = aw / 2;
    g.fillStyle = '#1f2630';
    g.beginPath();
    g.moveTo(cx - r, h);
    g.lineTo(cx - r, h - h * 0.12);
    g.arc(cx, h - h * 0.12, r, Math.PI, 0);
    g.lineTo(cx + r, h);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    grid(g, cx - r, h - h * 0.12 - r, cx + r, h, 6, 3, '#8a6a45');
    g.restore();
  });
  // Entry side: tall rectangular dark bays between pale posts (drawn at u = 0).
  const ctx = tex.image.getContext('2d');
  for (const shift of [0, tex.image.width]) {
    const cx = shift, w = tex.image.width * 0.1, h = tex.image.height;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(cx - w / 2, h * 0.3, w, h * 0.7);
    ctx.fillStyle = '#e4e0d4';
    for (const x of [-w / 6, w / 6]) ctx.fillRect(cx + x - 4, h * 0.3, 8, h * 0.7);
  }
  tex.needsUpdate = true;
  const wallMat = glowing(tex, { roughness: 0.8 });
  mats.push(wallMat);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(C.R, C.R, C.WALL, 16, 1, true), wallMat);
  drum.position.y = C.PLINTH + C.WALL / 2;
  f.add(tag(drum, 'med'));

  // Cream fascia ring, faceted charcoal roof, lantern and cross.
  const topY = C.PLINTH + C.WALL;
  const fascia = new THREE.Mesh(new THREE.CylinderGeometry(C.FASCIA_R, C.FASCIA_R, C.FASCIA_H, 48), std(0xe8e2d0));
  fascia.position.y = topY + C.FASCIA_H / 2 - 0.3;
  f.add(tag(fascia, 'high'));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(C.FASCIA_R - 0.2, C.ROOF_H, 12), std(0x3b4046, { roughness: 0.5, metalness: 0.4, flatShading: true }));
  const roofBase = topY + C.FASCIA_H - 0.35;
  roof.position.y = roofBase + C.ROOF_H / 2;
  f.add(tag(roof, 'med'));
  const louvre = canvasTex(64, 32, (g, w, h) => {
    g.fillStyle = '#e6e6e2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#8b8f94';
    for (let y = 4; y < h - 2; y += 5) g.fillRect(0, y, w, 2);
  });
  const lanternY = roofBase + C.ROOF_H - 0.6;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 8), [
    new THREE.MeshStandardMaterial({ map: louvre, roughness: 0.7 }), std(0x3b4046), std(0x3b4046),
  ]);
  lantern.position.y = lanternY + 0.6;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.6, 8), std(0x3b4046, { flatShading: true }));
  cap.position.y = lanternY + 1.5;
  const metal = std(0xb9b9b4, { metalness: 0.6, roughness: 0.4 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), metal);
  post.position.y = lanternY + 2.5;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), metal);
  arm.position.y = lanternY + 2.8;
  f.add(tag(lantern, 'med'), tag(cap, 'med'), tag(post, 'high'), tag(arm, 'high'));

  // Dark struts, in pairs near the diagonals, leaning out towards their feet.
  const strut = std(0x2f3438, { roughness: 0.6 });
  for (let k = 0; k < 4; k++) {
    for (const d of [-0.13, 0.13]) {
      const a = Math.PI / 4 + (k * Math.PI) / 2 + d;
      const foot = new THREE.Vector3(Math.sin(a) * 9.0, C.PLINTH, Math.cos(a) * 9.0);
      const head = new THREE.Vector3(Math.sin(a) * 7.9, topY - 0.3, Math.cos(a) * 7.9);
      f.add(tag(beam(foot, head, 0.55, strut), 'med'));
    }
  }
  return { frame: f, footprint: ring(f, 9.3) };
}

// ---------- the flag podium ----------
function buildPodium() {
  const f = siteFrame(PODIUM.x, PODIUM.z, 0);
  const tex = canvasTex(1024, 32, (g, w, h) => {
    const cols = ['#198a00', '#de2010', '#111111', '#ef7d00'];
    const n = 32;
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % 4];
      g.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  }, { repeat: false });
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(PODIUM.r, PODIUM.r, 0.8, 64, 1), [side, std(0xd9d3c4), std(0xd9d3c4)]);
  drum.position.y = 0.4;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PODIUM.r - 0.15, 0.15, 6, 64), std(0xf4f2ec));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.82;
  f.add(tag(drum, 'med'), tag(rim, 'med'));
  return { frame: f, footprint: ring(f, PODIUM.r) };
}

// A circle in a frame, as a flat world footprint.
function ring(frame, r, n = 16) {
  frame.updateMatrixWorld(true);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = frame.localToWorld(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
    out.push(p.x, p.z);
  }
  return out;
}

export function buildEmbassyPark() {
  const group = new THREE.Group();
  group.name = 'embassy-park';
  const glassMats = [];
  const parts = [buildSata(glassMats), buildMwanawasa(glassMats), buildChiluba(glassMats), buildPodium()];
  for (const p of parts) group.add(p.frame);
  return {
    group,
    footprints: parts.map((p) => p.footprint),
    setNight(n) {
      for (const m of glassMats) m.emissiveIntensity = n * 0.5;
    },
  };
}
