// Registry of hand-built landmarks (the Parliament lives in main.js with its
// hill site). Each entry builds its meshes and names a camera view; main.js
// adds them to the scene, drives their night lighting and lists them in the
// menu. To add a landmark: write src/landmarks/<slug>.js, register it here,
// and add its OSM name to HAND_MODELLED in tools/osm_to_json.py.
import * as THREE from 'three';
import { buildBankOfZambia } from './bank-of-zambia.js';
import { buildCabinetOffice } from './cabinet-office.js';
import { buildCathedral } from './cathedral.js';
import { buildEmbassyPark } from './embassy-park.js';
import { buildFindeco } from './findeco.js';
import { buildFreedomStatue } from './freedom-statue.js';
import { buildGovernmentComplex } from './government-complex.js';
import { buildGabonMemorial, buildHeroesStadium } from './heroes-stadium.js';
import { buildHiltonGardenInn } from './hilton-garden-inn.js';
import { buildIndoZambiaBank } from './indo-zambia-bank.js';
import { buildMandaHill } from './manda-hill.js';
import { buildMulungushi } from './mulungushi.js';
import { buildPyramidTower } from './pyramid-tower.js';
import { buildStateHouse } from './state-house.js';
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
    view: (lm) => local(lm.frame, [-30, 16, 105], [14, 16, 0]),
  },
  {
    name: 'National Heroes Stadium',
    build: buildHeroesStadium,
    view: (lm) => local(lm.group, [300, 95, 170], [0, 12, 0]),
  },
  {
    name: 'Gabon Disaster Memorial',
    build: buildGabonMemorial,
    view: (lm) => local(lm.group, [-16, 3, 3], [12, 5, -1]),
  },
  {
    name: 'Hilton Garden Inn',
    build: buildHiltonGardenInn,
    view: (lm) => local(lm.frame, [-240, 30, 70], [0, 38, -40]),
  },
  {
    name: 'Cabinet Office',
    build: buildCabinetOffice,
    view: (lm) => local(lm.group, [30, 14, 165], [-5, 9, 20]),
  },
  {
    name: 'State House',
    build: buildStateHouse,
    view: (lm) => local(lm.group, [1935, 34, 4165], [1985, 10, 4060]),
  },
  {
    name: 'Embassy Park',
    build: buildEmbassyPark,
    // world frame; from Independence Avenue, looking NE across all three
    view: () => ({ position: new THREE.Vector3(-20, 24, 3318), target: new THREE.Vector3(42, 0, 3252) }),
  },
  {
    name: 'Mulungushi Conference Centre',
    build: buildMulungushi,
    // world frame; from the south-east over the plaza: the Kenneth Kaunda Wing,
    // the Old and East Wings behind it
    view: () => ({ position: new THREE.Vector3(640, 75, 60), target: new THREE.Vector3(450, 2, -160) }),
  },
  {
    name: 'Manda Hill Mall',
    build: buildMandaHill,
    // from over Great East Road, looking at the front and the decks
    view: (lm) => local(lm.frame, [-70, 55, 200], [-10, 4, 20]),
  },
  {
    name: 'Indo Zambia Bank',
    build: buildIndoZambiaBank,
    // from across Great East Road, as in the founder's street photos
    view: (lm) => local(lm.frame, [36, 5, -80], [33, 12, 0]),
  },
  {
    name: 'Pyramid Tower',
    build: buildPyramidTower,
    view: (lm) => local(lm.frame, [120, 22, 250], [0, 55, 0]),
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
