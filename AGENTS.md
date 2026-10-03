# Lusaka 3D — instructions for coding agents

A progressive 3D map of Lusaka in three.js: an OpenStreetMap base city
streamed in tiles, and hand-built landmarks with honest confidence tags.
These instructions apply to AI coding agents and human contributors alike;
[CONTRIBUTING.md](CONTRIBUTING.md) covers the contribution process and
licensing.

## Every task

1. **Start** by reading the current priority in `docs/DEVELOPMENT_PLANNER.md`.
   Work priorities in order unless the maintainer or the issue says otherwise.
2. **Verify in a browser** before calling anything done: the page loads, no
   console errors, and the change looks right from the relevant views
   (`#<landmark-slug>` opens a landmark's view; `#still` skips the intro).
   Tests and linters alone are not verification for visual work.
3. **End** by ticking finished items `[x]` in the planner in the same change.
   A priority moves to **Completed** with a dated one-line summary only when
   every box, including Verify, is ticked.

## Layout

- `index.html` — page shell and the top-right menu; styles come from the
  prebuilt `styles/app.css` (Tailwind, source `src/styles.css`).
- `src/` — ES modules, no build step (three.js, zustand and earcut from
  jsDelivr; import maps do not apply inside workers, so the worker imports
  full URLs).
  - `main.js` — renderer, sky, lighting, camera moves, menu wiring, and the
    `window.lusaka` debug handle (including `capture` for screenshots).
  - `quality.js` — Low / Medium / High tiers; read `quality` for anything
    costly (pixel ratio, shadows, tile radius, tree density) so phones stay smooth.
  - `city/tiles.js` + `city/worker.js` — stream the OSM city in 1 km tiles
    (full near the focus, far beyond; radii grow with altitude). Windows,
    shopfronts and roof ribs are drawn in the building shader in `tiles.js`
    from per-vertex facade coordinates the worker writes (`FACADES`).
    Walls: OSM walls and fences as mapped, plus plot walls the tiler
    estimates round houses (`plot_walls` in `tools/osm_tiles.py`).
  - `city/trees.js` — tree models; the worker places them per tile, clear of
    roads, buildings and paved areas, and `main.js` keeps them off landmarks.
  - `drive/` — Drive mode: `car.js` (the Corolla model, `data/models/corolla.glb`,
    CC BY 4.0, prepared by `tools/prepare_car.mjs`) and `drive.js`
    (Rapier raycast vehicle, drivetrain, chase camera, colliders streamed
    round the car from `collide.js`'s footprint and wall-segment indexes).
  - `controls/rig.js` — Map / Fly / Walk camera modes (it stands aside in Drive); the mode lives in the
    zustand store in `store.js`, shared with the menu in `ui.js`.
  - `terrain.js` — worker-safe ground height; `geo.js` re-exports it with
    three.js-side helpers. `collide.js` — footprint index for Walk mode.
  - `building.js` + `site.js` — the National Assembly and its hill.
  - `landmarks/<slug>.js` — the other hand-built landmarks, registered in
    `landmarks/index.js` (menu entry, camera view, night lighting, walk
    footprints), with shared helpers in `landmarks/lib.js`.
- `data/tiles/` — generated city tiles (ODbL; rebuild with `tools/osm_tiles.py`).
  `data/landmarks.json` — the catalogue of named places. `data/raw/` holds
  the OSM extract (git-ignored, never deployed).
- `tools/` — the tiler (which also skips hand-built buildings), the landmark
  catalogue builder, and the dev server (`serve.py`; `--capture` for screenshots).
- `docs/LANDMARKS.md` — what to build and at what tier;
  `docs/landmarks/<slug>.md` — reference notes per hand-built landmark;
  `docs/screenshots/` — README images.

## Rules

- **World frame:** metres from the Parliament origin (-15.3922718,
  28.3090371), x = east, z = south, y = up; the city ground is at
  `CITY_Y` = -4.5. Never introduce a second frame without documenting it in
  `terrain.js`. Landmark-local frames come from `siteFrame(x, z, bearing)`.
- **Honesty:** every hand-built part gets a confidence tag (`high` / `med` /
  `low`). Never present a guess as measured; record sources, licences and
  gaps in the landmark's notes.
- **Placement:** prefer OSM outlines over estimates. Check that nothing you
  add (lawns, plazas, walkways) overlaps an OSM road or neighbouring building.
- **No photographs** are embedded in models or committed; textures are drawn
  procedurally. Photos are reference only.
- **Public exterior only:** model what can be seen from public places. No
  interiors or security details of government or other sensitive sites.
- **Attribution:** keep the "© OpenStreetMap contributors" credit visible;
  `data/tiles/` is ODbL-derived data.
- **Styling:** Tailwind utility classes; shared class strings live in
  `src/ui.js`. After changing class names, run `npm run build:css` and commit
  `styles/app.css`.
- **Performance:** keep 60 fps while tiles stream; build heavy geometry in
  the worker or with instancing, and dispose of what you unload.
- **Commits** describe the change and nothing else — no AI or tool
  attribution, no co-author trailers.
