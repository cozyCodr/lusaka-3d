# Development planner

The source of truth for what to do next and what is actually finished.
Work priorities in order. Tick a box only when the item works in the app
(page loads with no console errors, checked in a browser). A priority moves
to **Completed** with a dated one-line summary only when every box,
including **Verify**, is ticked.

**Current priority: P6 — Tier 1 landmarks: Cathedral of the Holy Cross next** (P2 controls mostly done 2026-09-26; joystick, URL views and click-to-select remain) (founder call, 2026-09-26: Tier 1 order approved, build in order; ask the founder for reference photos before calling a landmark done).

---

## P1 — Landmark catalogue

Know every well-known place, where it is, and how much detail it deserves.

- [x] Export named notable places across Greater Lusaka from OSM (`tools/queries/landmarks.overpassql`)
- [x] Build `data/landmarks.json`: 451 places with world coordinates, category, Wikidata id (`tools/landmarks_catalog.py`)
- [x] Curate `docs/LANDMARKS.md`: Tier 1 icons (22), Tier 2 notable (~50), Tier 3 category generators
- [ ] Confirm the "not in OSM yet" list (Kwacha House and ZESCO head office turned up in the wider export) (Kwacha House, Zanaco, ZESCO, Showgrounds…) on satellite and add coordinates
- [x] Founder review: Tier 1 order approved as is (2026-09-26)
- [ ] **Verify:** every Tier 1 row has coordinates that land on the right building in the app

## P2 — Controls and movement

Getting around should feel like a game and a map, not a 3D viewer. Build a
single camera rig with modes, and keep the mode, selection and time of day in
a small `zustand/vanilla` store that both the engine and the HUD read.

- [x] Camera rig with a mode state machine (`src/controls/rig.js`); mode lives in a `zustand/vanilla` store (`src/store.js`) shared with the menu
- [x] **Map** (default, replaces Orbit): drag to pan, zoom to cursor, WASD / arrows to move; right-drag and Q / E / R / F turn and tilt in place (founder feedback 2026-09-26: rotation swung the view around a distant pivot); two-finger touch orbits a point just ahead; never below ground, target kept on the map
- [x] **Fly**: drag to look, WASD / arrows, Space / C up and down, Shift boost, speed scales with altitude
- [x] **Walk**: eye height on the ground, drag to look, WASD, Shift to run, slides along building footprints (OSM + hand-built landmarks)
- [x] Double-click the ground or a landmark to glide there (walk mode: jump there)
- [ ] Click a landmark to select it and show its info (waits on the founder's info-card spec, P3)
- [x] Touch in Map mode: one-finger pan, pinch zoom, two-finger rotate and tilt
- [ ] Touch in Fly and Walk: on-screen joystick
- [ ] Shareable view in the URL (`#lat,lon,zoom,heading,tilt`) and back / forward between views
- [x] Help overlay on `?` and in the menu; mode switch in the menu and on keys 1 / 2 / 3; a hint when the mode changes
- [ ] **Verify:** each mode works on desktop and on a phone-sized viewport; no clipping through the ground or out of the map

## P3 — On-screen interface redesign

Founder direction (2026-09-26): no floating panels over the scene; controls
live in a collapsible top-right hamburger menu; clicking a place should show
more about it (details to come). Keep a visual language drawn from Zambia
(copper, flag green, orange).

- [x] Replace the title card and control panel with a collapsible top-right menu (time of day, go to, layers); OSM credit as a small corner line
- [ ] Design tokens in a Tailwind `@theme` (colour, type, radius, blur); shared component class module
- [ ] Top-left: compact wordmark and a live location line (district / nearest landmark)
- [ ] Search / command palette (`⌘K` or `/`) over the landmark catalogue: type, pick, glide there
- [ ] Bottom toolbar of icon buttons with tooltips: mode switch, time of day, layers, confidence
- [ ] Time of day as a compact popover (presets: sunrise, noon, golden hour, dusk, night + slider)
- [ ] Layers popover: buildings, roads, labels, landmarks only, confidence view
- [ ] Click a place to get more info on it (founder to detail the contents); first cut: name, type, confidence breakdown, sources, "fly here"
- [ ] Floating 3D labels for landmarks that fade with distance
- [ ] Compass with north arrow and a minimap
- [ ] Loading screen with progress while city data streams in
- [ ] Mobile layout: bottom sheet for panels, thumb-reachable toolbar
- [ ] **Verify:** reviewed at 1440 px, 1024 px and 375 px wide, light and dusk scenes; founder sign-off

## P4 — Map coverage: the CBD and beyond

Most Tier 1 icons sit 2.5–4.5 km south of the current box, along Cairo Road
and Independence Avenue.

- [x] Widen the OSM export south to -15.445 (CBD, Independence Ave, Rhodes Park): 48k buildings, 4.5k roads
- [ ] Split city data into 1 km tiles (`data/tiles/x_z.json`) and load them by camera distance
- [ ] Build geometry in a Web Worker so loading never freezes the page
- [ ] Place landmark labels from `data/landmarks.json` for everything inside loaded tiles
- [ ] **Verify:** fly from the Parliament to Findeco House with no hitch; memory stable after 5 minutes of flying

## P5 — Procedural detail

Make OSM boxes read as Lusaka.

- [ ] Pitched iron roofs on houses (hip or gable from footprint shape), roof colours as now
- [ ] Window bands and floor lines on offices and flats; shopfront canopies on retail
- [ ] Perimeter walls and gates around residential plots
- [ ] Street trees (jacaranda, msasa, palms) along primary roads; scattered yard trees
- [ ] Road markings and pavements on primary and secondary roads
- [ ] **Verify:** a street-level view in a residential area and on Cairo Road reads as Lusaka to the founder

## P6 — Tier 1 landmarks

One item per landmark, in the order in `docs/LANDMARKS.md`. Each follows the
Tier 1 checklist there (reference notes, OSM outline, model, confidence tags).

- [x] National Assembly of Zambia (v1)
- [x] Findeco House (v2, rebuilt from the founder's reference photos: notes in docs/landmarks/findeco-house.md)
- [x] Freedom Statue (v1, from the founder's photos: notes in docs/landmarks/independence-avenue.md)
- [ ] Cathedral of the Holy Cross
- [x] Lusaka National Museum, with the steel figure (v1)
- [x] Government Complex (v1)
- [ ] Bank of Zambia
- [ ] Cabinet Office
- [ ] Embassy Park and the presidential mausoleums
- [ ] Mulungushi and Kenneth Kaunda International Conference Centres
- [ ] Manda Hill Mall and East Park Mall
- [ ] National Heroes Stadium
- [ ] **Verify:** each landmark checked against its reference photos and shown in confidence view

## P7 — Terrain

- [ ] Copernicus DEM (30 m) for the map area, converted to a height grid
- [ ] Replace the flat city ground and the hand-made Parliament hill with the real surface
- [ ] Buildings, roads and landmarks sit on the terrain
- [ ] **Verify:** known ridges (Parliament hill, Kabulonga) visible; nothing floating or buried

## P8 — Category generators (Tier 3)

- [ ] Market generator (77 markets)
- [ ] Church generator (533 places of worship)
- [ ] Embassy compound generator (41 missions, with national flags)
- [ ] School generator
- [ ] Filling station generator (add `amenity=fuel` to the export)
- [ ] **Verify:** spot-check five of each against satellite

## P9 — Lighting and polish

- [x] Sky dome follows the camera (it was black away from the Parliament)
- [ ] Fix the pale sun smear in the sky at dusk
- [ ] Night: street lights along primary roads, lit windows city-wide, stars
- [ ] Brighter lamp glow on the Parliament walkway
- [ ] Seasonal look: dry-season haze vs rainy-season green
- [ ] **Verify:** morning, noon, dusk and night all look intentional at city and street scale

## Backlog (unordered)

- National Assembly v2: side and rear facades from new photos; ZNBC Opening of Parliament drone footage
- Kenneth Kaunda International Airport as a separate "island" scene (17 km out)
- Photogrammetry or Gaussian splats for landmarks where someone can shoot ~60 photos

---

## Completed

- **P0 — Foundation** (2026-09-26): National Assembly v1 with walkway, time of day, flyover and confidence view; 16k-building OSM base city around the Parliament; private GitHub repo.
