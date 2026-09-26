// Cathedral of the Holy Cross (Anglican), 74 Independence Avenue (OSM way
// 1422882767). The entrance is at the east end: a tall tan-brick mass with a
// shallow prow front, framed by two tall concrete columns that carry a
// projecting pitched canopy with a coffered underside; a lower coffered porch
// on thin steel posts over the doors, stained-glass grids either side, and
// broad steps. Behind it, a tall nave roofed in folded plates, so its side
// walls rise to a peak in every bay: the south wall a concrete grid of
// coloured glass above a row of brick-gabled aisle bays; the north wall brick
// with slit windows and a white grille bay near the front. Low annexes flank
// the front; a lower pointed block closes the west end.
// Sources: docs/landmarks/cathedral-holy-cross.md.
import * as THREE from 'three';
import { palmFactory } from '../site.js';
import { rng, tag } from '../util.js';
import { canvasTex, extrudeFootprint, siteFrame } from './lib.js';

// Frame origin on the nave axis; local +z faces the entrance (bearing 82°),
// local +x is the north side. Outline points below are OSM, in this frame.
export const CATHEDRAL = { x: -582.0, z: 2932.0, bearing: 82 };

const NAVE = { z0: -27, z1: 27, half: 8, eave: 18, peak: 21.5, bays: 8 };
const AISLE = { south: [-13, -8], north: [8, 15], eave: 6.5, peak: 9.5 };
const TOWER = { back: 29, top: 26 };
const TOWER_PLAN = [[-10.2, 29], [8.6, 29.2], [6.6, 42.7], [-1.8, 46.5], [-8.9, 43.9]];
const WEST_PLAN = [[8, -26.8], [8, -41], [-0.8, -47], [-9, -42.1], [-9.1, -27.3]];

// ---------- textures (procedural; sizes are metres per tile) ----------
function brickTex(slits = false) {
  const r = rng(slits ? 12 : 11);
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b39a74';
    g.fillRect(0, 0, w, h);
    const bw = 32, bh = 10;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -off; x < w; x += bw) {
        const v = Math.floor(r() * 26) - 13;
        g.fillStyle = `rgb(${179 + v},${154 + v},${116 + v})`;
        g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    if (slits) {
      g.fillStyle = '#2a2622';
      for (let i = 0; i < 3; i++) g.fillRect(20 + r() * (w - 40), 30 + r() * (h - 110), 7, 60);
    }
  });
  t.repeat.set(1 / (slits ? 6 : 2.4), 1 / (slits ? 6 : 2.4));
  return t;
}

// Concrete grid holding coloured glass; `glow` returns the matching emissive map.
function glassGridTex(glow = false) {
  const r = rng(29);
  const colours = ['#3d5670', '#4d6a55', '#8a4a38', '#a58649', '#584a66', '#3f6b6b', '#9c8f5c', '#6e3a40', '#5e6770', '#6f7a66'];
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = glow ? '#000' : '#cfc6b3';
    g.fillRect(0, 0, w, h);
    // tall cells in a heavy concrete grid
    const cols = 6, rows = 4, cw = w / cols, ch = h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.fillStyle = colours[Math.floor(r() * colours.length)];
        if (glow && r() < 0.25) continue;
        g.fillRect(i * cw + 7, j * ch + 7, cw - 14, ch - 14);
      }
    }
  });
  t.repeat.set(1 / 3.2, 1 / 3.2);
  return t;
}

function grilleTex() {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ece8df';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b3833';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 32 + 8, j * 32 + 8, 16, 16);
  });
  t.repeat.set(1 / 1.6, 1 / 1.6);
  return t;
}

function cofferTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2c22';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a07a52';
    g.lineWidth = 7;
    for (let i = 0; i <= w; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
  }, { repeat: false });
}

// ---------- geometry helpers (all in the cathedral frame) ----------
// A vertical wall in the plane x = const, outlined by [z, y] points.
function sideWall(x, outline, mat) {
  const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateY(-Math.PI / 2); // shape x -> +z; face normal -> -x (material is double-sided)
  const m = new THREE.Mesh(geo, mat);
  m.position.x = x;
  return m;
}

function quads(list, mat) {
  const pos = [];
  for (const [a, b, c, d] of list) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

// Pitched hip canopy: a shallow square frustum stretched to w x d, eave at y.
function hipCanopy(w, d, eaveY, rise, mat, underside) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.35, Math.SQRT1_2, 1, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(geo, mat);
  roof.scale.set(w, rise, d);
  roof.position.y = eaveY + rise / 2;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 1.0, d + 0.2), mat);
  fascia.position.y = eaveY + 0.1;
  const under = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, d - 0.4), underside);
  under.rotation.x = Math.PI / 2;
  under.position.y = eaveY - 0.42;
  g.add(roof, fascia, under);
  return g;
}

export function buildCathedral() {
  const f = siteFrame(CATHEDRAL.x, CATHEDRAL.z, CATHEDRAL.bearing);
  f.name = 'cathedral-holy-cross';
  const put = (mesh, conf) => {
    f.add(tag(mesh, conf));
    return mesh;
  };

  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.95, side: THREE.DoubleSide });
  const brickSlits = new THREE.MeshStandardMaterial({ map: brickTex(true), roughness: 0.95, side: THREE.DoubleSide });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7f8b80, roughness: 0.8, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({
    map: glassGridTex(), emissive: 0xffffff, emissiveMap: glassGridTex(true), emissiveIntensity: 0,
    roughness: 0.4, side: THREE.DoubleSide,
  });
  const grille = new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: 0.8, side: THREE.DoubleSide });
  const coffer = new THREE.MeshStandardMaterial({ map: cofferTex(), roughness: 0.8, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 0.7, roughness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5234, roughness: 0.7 });

  // ---------- nave: folded-plate roof and peaked side walls ----------
  const bay = (NAVE.z1 - NAVE.z0) / NAVE.bays;
  const roofQuads = [];
  for (let i = 0; i < NAVE.bays; i++) {
    const z0 = NAVE.z0 + i * bay, z1 = z0 + bay, zm = z0 + bay / 2;
    const outline = [[z0, 0], [z1, 0], [z1, NAVE.eave], [zm, NAVE.peak], [z0, NAVE.eave]];
    put(sideWall(-NAVE.half, outline, glass), 'high'); // south: coloured-glass grid
    const nearFront = i === NAVE.bays - 1;
    put(sideWall(NAVE.half, outline, nearFront ? grille : brickSlits), nearFront ? 'high' : 'med'); // north
    const h = NAVE.half;
    roofQuads.push(
      [[-h, NAVE.eave, z0], [h, NAVE.eave, z0], [h, NAVE.peak, zm], [-h, NAVE.peak, zm]],
      [[-h, NAVE.peak, zm], [h, NAVE.peak, zm], [h, NAVE.eave, z1], [-h, NAVE.eave, z1]],
    );
    // concrete ribs at the folds, full height, both sides
    for (const s of [-1, 1]) {
      const rib = put(new THREE.Mesh(new THREE.BoxGeometry(0.7, NAVE.eave, 0.7), concrete), 'med');
      rib.position.set(s * (h + 0.2), NAVE.eave / 2, z0);
    }
  }
  put(quads(roofQuads, roofMat), 'high');
  // west gable closing the nave
  put(quads([[[-NAVE.half, 0, NAVE.z0], [NAVE.half, 0, NAVE.z0], [NAVE.half, NAVE.eave, NAVE.z0], [-NAVE.half, NAVE.eave, NAVE.z0]]], brick), 'med');

  // ---------- aisles: brick-gabled bays along both sides ----------
  for (const [side, [xa, xb]] of Object.entries(AISLE).filter(([k]) => k === 'south' || k === 'north')) {
    const depth = xb - xa;
    for (let i = 0; i < NAVE.bays; i++) {
      const z0 = NAVE.z0 + i * bay;
      if (z0 + bay > 12 && z0 < 22) continue; // annexes take this stretch
      const w = bay - 1.4, zm = z0 + bay / 2;
      // one extruded pentagon per bay: gable faces outward, ridge runs out from the nave
      const pent = new THREE.Shape([
        new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, AISLE.eave),
        new THREE.Vector2(0, AISLE.peak), new THREE.Vector2(-w / 2, AISLE.eave),
      ]);
      const unit = new THREE.Mesh(new THREE.ExtrudeGeometry(pent, { depth, bevelEnabled: false }), [brick, brick]);
      unit.geometry.rotateY(Math.PI / 2); // extrusion along +x
      unit.position.set(xa, 0, zm);
      put(unit, 'med');
      // glass strip in the gap to the next bay
      const strip = put(new THREE.Mesh(new THREE.PlaneGeometry(1.4, AISLE.peak), side === 'south' ? glass : brick), 'med');
      strip.rotation.y = Math.PI / 2;
      strip.position.set(side === 'south' ? xa + 0.3 : xb - 0.3, AISLE.peak / 2, z0 + bay);
    }
  }

  // ---------- annexes near the front, and the low west end ----------
  const annexRoof = new THREE.MeshStandardMaterial({ color: 0x5f7d62, roughness: 0.8 });
  for (const [xa, xb] of [[-23, -13], [15, 22.6]]) {
    const a = put(new THREE.Mesh(new THREE.BoxGeometry(xb - xa, 7, 10), brick), 'low');
    a.position.set((xa + xb) / 2, 3.5, 17);
    const roof = put(new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.SQRT1_2, 1, 4), annexRoof), 'low');
    roof.geometry.rotateY(Math.PI / 4);
    roof.scale.set(xb - xa + 0.8, 2.5, 10.8);
    roof.position.set((xa + xb) / 2, 8.25, 17);
  }
  // Footprint helper expects world-style [x, z]; our frame uses the same axes.
  put(extrudeFootprint(WEST_PLAN, [], 12, [roofMat, brick], 0), 'low');

  // ---------- entrance tower ----------
  put(extrudeFootprint(TOWER_PLAN, [], TOWER.top, [concrete, brick], 0), 'high');
  put(hipCanopy(22, 20, TOWER.top + 2, 3.2, concrete, coffer), 'high').position.set(-0.8, 0, 38.5);
  for (const x of [-11, 9]) { // in line with the brick corners, just proud of them
    const col = put(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, TOWER.top + 2, 4), concrete), 'high');
    col.geometry.rotateY(Math.PI / 4);
    col.position.set(x, (TOWER.top + 2) / 2, 45.5);
  }
  // porch: low coffered canopy on thin steel posts, tie-rods up to the high canopy
  const porchY = 7.5;
  put(hipCanopy(16, 8, porchY, 1.2, concrete, coffer), 'high').position.set(-1.2, 0, 48.5);
  for (const x of [-7.5, -3, 1, 5]) {
    const post = put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, porchY, 8), steel), 'high');
    post.position.set(x, porchY / 2, 52);
    const rod = put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, TOWER.top + 2 - porchY, 6), steel), 'med');
    rod.position.set(x, porchY + (TOWER.top + 2 - porchY) / 2, 48); // within both canopies
  }
  // doors on the prow and stained-glass grids either side
  const [pl, pc, pr] = [TOWER_PLAN[4], TOWER_PLAN[3], TOWER_PLAN[2]];
  for (const [a, b] of [[pl, pc], [pc, pr]]) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]; // outward normal of the prow face
    const pane = put(new THREE.Mesh(new THREE.PlaneGeometry(len - 1.2, 6), glass), 'high');
    pane.position.set(mid[0] + n[0] * 0.08, 1.5 + 3, mid[1] + n[1] * 0.08);
    pane.rotation.y = -ang;
    const door = put(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.2), wood), 'high');
    const t = a === pc ? 0.2 : 0.8; // doors sit either side of the prow
    door.position.set(a[0] + (b[0] - a[0]) * t + n[0] * 0.12, 1.5 + 2.1, a[1] + (b[1] - a[1]) * t + n[1] * 0.12);
    door.rotation.y = -ang;
  }

  // ---------- steps, lawn, palms ----------
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xa8a39a, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const h = 1.5 - i * 0.25;
    const s = put(new THREE.Mesh(new THREE.BoxGeometry(26, h, 0.5), stepMat), 'high');
    s.position.set(-1, h / 2, 47 + i * 0.5 + 0.25);
  }
  const terrace = put(new THREE.Mesh(new THREE.BoxGeometry(26, 1.5, 6), stepMat), 'med');
  terrace.position.set(-1, 0.75, 44);
  const lawn = put(new THREE.Mesh(new THREE.BoxGeometry(70, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0x7c9a48, roughness: 1 })), 'med');
  lawn.position.set(-1, 0.04, 70);
  const make = palmFactory();
  const r = rng(71);
  for (const [x, z] of [[-18, 60], [15, 58], [22, 66], [-26, 72]]) {
    const p = make(8 + r() * 3, r);
    p.position.set(x, 0, z);
    put(p, 'med');
  }

  // Footprint for walk-mode collisions: the OSM outline, in world coordinates.
  f.updateMatrixWorld(true);
  const outline = [...TOWER_PLAN.slice(1, 4), [-8.9, 43.9], [-13, 10.8], [-13, -24.4], ...WEST_PLAN.slice().reverse(), [15.2, -23.9], [15, 29]];
  const footprint = outline.flatMap(([x, z]) => {
    const p = f.localToWorld(new THREE.Vector3(x, 0, z));
    return [p.x, p.z];
  });

  return {
    group: f,
    footprints: [footprint],
    setNight(n) {
      glass.emissiveIntensity = n * 1.1;
    },
  };
}
