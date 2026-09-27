# Lusaka 3D — agent instructions

A progressive 3D map of Lusaka in three.js: an OpenStreetMap base city,
procedural detail, and hand-built landmarks with honest confidence tags.

## Every run

1. **Start** by reading the current priority in `docs/DEVELOPMENT_PLANNER.md`.
   Work priorities in order.
2. **End** by ticking finished items `[x]` in the planner in the same session,
   only once they work in the app (page loads, no console errors, checked in a
   browser). A priority moves to **Completed** with a dated one-line summary
   only when every box, including Verify, is ticked.

## Layout

- `src/` — ES modules, no build step (three.js from jsDelivr via importmap).
  `main.js` wires renderer, sky, camera and UI; `city/tiles.js` streams the
  OSM city in 1 km tiles, built in `city/worker.js`; `terrain.js` is the
  worker-safe ground height;
  `building.js` + `site.js` are the Parliament; `landmarks/<slug>.js` are the
  other hand-built landmarks, registered in `landmarks/index.js` (menu entry,
  camera view, night lighting) with shared helpers in `landmarks/lib.js`;
  `geo.js` owns the world frame.
- `data/tiles/` — generated city tiles (committed; rebuild with
  `tools/osm_tiles.py`); `data/raw/` holds the OSM extract and other raw
  exports (ignored).
- `tools/` — the tiler (`osm_tiles.py`, which also skips hand-built
  buildings), the landmark catalogue builder, and the no-cache dev server.
- `docs/LANDMARKS.md` — what to build and at what tier;
  `docs/landmarks/<slug>.md` — reference notes per hand-built landmark.

## Rules

- World frame: metres from the Parliament origin (-15.3922718, 28.3090371),
  x = east, z = south, y = up. Never introduce a second frame without
  documenting it in `geo.js`.
- Every hand-built part gets a confidence tag (`high` / `med` / `low`). Do not
  present a guess as measured.
- Prefer OSM outlines over estimates; record sources and licences in the
  landmark's notes. Credit OpenStreetMap in the UI.
- No photographs are embedded in the model; textures are procedural.
- Run with `python3 tools/serve.py` (port 5199, caching disabled).
- Commits describe the change and nothing else. No AI attribution.
