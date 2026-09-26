// Registry of hand-built landmarks (the Parliament lives in main.js with its
// hill site). Each entry builds its meshes and names a camera view; main.js
// adds them to the scene, drives their night lighting and lists them in the
// menu. To add a landmark: write src/landmarks/<slug>.js, register it here,
// and add its OSM name to HAND_MODELLED in tools/osm_to_json.py.
import * as THREE from 'three';
import { buildBankOfZambia } from './bank-of-zambia.js';
import { buildCathedral } from './cathedral.js';
import { buildFindeco } from './findeco.js';
import { buildFreedomStatue } from './freedom-statue.js';
import { buildGovernmentComplex } from './government-complex.js';
import { buildNationalMuseum } from './national-museum.js';

// A view in a landmark's local frame: camera position and look-at point.
const local = (group, from, to) => {
  group.updateMatrixWorld(true);
  return {
    position: group.localToWorld(new THREE.Vector3(...from)),
    target: group.localToWorld(new THREE.Vector3(...to)),
  };
};

const REGISTRY = [
  {
    name: 'Findeco House',
    build: buildFindeco,
    // world frame; from the south-east across Independence Ave
    view: (lm) => ({
      position: lm.centre.clone().add(new THREE.Vector3(120, 5, 150)),
      target: lm.centre.clone().add(new THREE.Vector3(0, 5, 0)),
    }),
  },
  {
    name: 'Freedom Statue',
    build: buildFreedomStatue,
    view: (lm) => local(lm.group, [4, 4.5, 22], [0, 5, 0]),
  },
  {
    name: 'Government Complex',
    build: buildGovernmentComplex,
    view: (lm) => local(lm.frame, [-40, 35, 170], [0, 28, 0]),
  },
  {
    name: 'Cathedral of the Holy Cross',
    build: buildCathedral,
    view: (lm) => local(lm.group, [-38, 10, 100], [0, 14, 20]),
  },
  {
    name: 'Bank of Zambia',
    build: buildBankOfZambia,
    view: (lm) => local(lm.group, [-30, 16, 105], [8, 16, 0]),
  },
  {
    name: 'National Museum',
    build: buildNationalMuseum,
    view: (lm) => local(lm.group, [-14, 6, 62], [0, 9, 0]),
  },
];

export function buildLandmarks() {
  return REGISTRY.map((entry) => {
    const lm = entry.build();
    return {
      name: entry.name,
      group: lm.group,
      footprints: lm.footprints ?? [],
      setNight: lm.setNight ?? (() => {}),
      view: entry.view(lm),
    };
  });
}
