# Development planner

The source of truth for what to do next and what is actually finished.
Work priorities in order. Tick a box only when the item works in the app
(page loads with no console errors, checked in a browser). A priority moves
to **Completed** with a dated one-line summary only when every box,
including **Verify**, is ticked.

**Current priority: P10 — The experience: ground variety and the guided tour next** (founder call, 2026-10-03: make the whole city look good and give people something to do; start with trees, then facades and lighting, then the guided tour and click-to-learn; P6 landmarks continue alongside as photos arrive).

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
- [x] Widen north to -15.36 and west to 28.262 for Heroes Stadium: 83.5k buildings, 6.3k roads, `data/core.json` now 7.7 MB (tiling below is now pressing)
- [x] Cover all of Greater Lusaka (founder, 2026-09-27: Kabulonga, Ibex, Salama, Meanwood, the airport were missing): OSM Zambia extract → 1,330 × 1 km tiles, 466k buildings (`tools/osm_tiles.py`)
- [x] Split city data into 1 km tiles and load them by camera distance: full detail near, a light far level, haze beyond; radii grow with altitude
- [x] Build geometry in a pool of Web Workers so loading never freezes the page (60 fps while streaming)
- [ ] Place landmark labels from `data/landmarks.json` for everything inside loaded tiles
- [x] Runways and taxiways from OSM aeroway lines
- [ ] **Verify:** fly from the Parliament to Findeco House with no hitch; memory stable after 5 minutes of flying (a 6 s sweep held 60 fps, 138 MB heap; the 5-minute soak is still to do)

## P5 — Procedural detail

Make OSM boxes read as Lusaka.

- [ ] Pitched iron roofs on houses (hip or gable from footprint shape), roof colours as now
- [ ] Window bands and floor lines on offices and flats; shopfront canopies on retail
- [ ] Perimeter walls and gates around residential plots
- [ ] Street trees (jacaranda, msasa, palms) along primary roads; scattered yard trees
- [x] Road markings and pavements on primary and secondary roads (asphalt with wear, kerbed pavements, centre dashes and edge lines near the camera; tracks stay dirt)
- [ ] **Verify:** a street-level view in a residential area and on Cairo Road reads as Lusaka to the founder

## P6 — Tier 1 landmarks

One item per landmark, in the order in `docs/LANDMARKS.md`. Each follows the
Tier 1 checklist there (reference notes, OSM outline, model, confidence tags).

- [x] National Assembly of Zambia (v1)
- [x] Findeco House (v2, rebuilt from the founder's reference photos: notes in docs/landmarks/findeco-house.md)
- [x] Freedom Statue (v1, from the founder's photos: notes in docs/landmarks/independence-avenue.md)
- [x] Cathedral of the Holy Cross (v1, from the founder's photos: notes in docs/landmarks/cathedral-holy-cross.md)
- [x] Lusaka National Museum, with the steel figure (v1)
- [x] Government Complex (v1)
- [x] Bank of Zambia (v1, from the founder's photos: notes in docs/landmarks/bank-of-zambia.md)
- [x] Cabinet Office, with the Cenotaph square (v1, from the founder's photos: notes in docs/landmarks/cabinet-office.md)
- [x] Embassy Park and the presidential mausoleums (v1, from Commons photos sourced with Codex CLI and the aerial: notes in docs/landmarks/embassy-park.md; founder's photos still wanted for the entrance facings)
- [x] Society Business Park: Hilton Garden Inn tower and the shell building (added to Tier 1 by the founder, 2026-09-27; v2 from the founder's photos)
- [x] State House and its grounds (v1, from the founder's photos: notes in docs/landmarks/state-house.md)
- [x] Pyramid Tower, "Burj Kalingalinga" (added by the founder, 2026-09-27; v1 from the founder's photos and imagery)
- [x] Mulungushi and Kenneth Kaunda International Conference Centres (v1: all three wings, from the founder's KK Wing photos, web photos of the older wings, Vertex AI renders and the aerial: notes in docs/landmarks/mulungushi.md)
- [x] Manda Hill Mall (v2, from the founder's photos, web photos and the aerial: notes in docs/landmarks/manda-hill.md)
- [x] Indo Zambia Bank head office (added by the founder, 2026-09-29; v1 from the founder's photos: notes in docs/landmarks/indo-zambia-bank.md)
- [x] East Park Mall (v1, from the founder's photos, Google places and OSM: notes in docs/landmarks/east-park.md)
- [x] Acacia Park office park (added by the founder, 2026-09-29; v1 from the founder's and Reiz photos: notes in docs/landmarks/acacia-park.md)
- [x] National Heroes Stadium, with the Gabon Disaster Memorial (v1, from the founder's photos: notes in docs/landmarks/heroes-stadium.md)
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

## P10 — The experience

Make the whole city look good, not just the landmarks, and give visitors
something to do. Phones are a first-class target: every item is checked on a
mid-range phone as well as a laptop (see Mobile below).

**Look**
- [x] Trees (src/city/trees.js, placed in the tile worker): msasa/acacia, jacaranda in flower, flamboyant, mango, palm and eucalyptus; avenues along main and residential roads, yards round houses, OSM woods and parks, scattered bush; a 2 m occupancy grid keeps them off roads, pavements, buildings, car parks, pitches and water, and a hull round each landmark keeps them off the hand-built grounds. ~77k on High at 60 fps (laptop), a tenth on Low; far tiles get a light scatter
- [x] Building facades by type (OSM tags), drawn in the building shader from per-vertex bay and floor coordinates (no textures): windows sized for houses, flats, offices (ribbon glazing), schools and hospitals, churches and sheds; shopfronts with signboards on retail; hipped iron roofs on rectangular houses, corrugated iron on the rest and on warehouses; a darker plinth at the ground; a share of windows lit at night; distant walls fade to an average so they do not shimmer
- [x] Boundary walls round houses, as imagery shows them (founder call 2026-10-03): the 307 km of walls, fences and hedges mapped in OSM drawn where mapped; elsewhere the tiler estimates a walled plot round each house-sized building, squared to its nearest street (front wall on the verge, sides halfway to the neighbours, back halfway to the plot behind), with a steel gate on the street side; packed compounds left open; checked against Esri imagery of Chilenje, Rhodes Park and Kabulonga; tagged low confidence
- [x] Lighting: warmer low sun and golden haze, a colour grade (gentle contrast, warmth, vignette), golden hour by default (time 0.08), wall-base darkening as cheap contact occlusion; the sky light was already image-based
- [ ] Screen-space ambient occlusion on High (GTAO needs work with the logarithmic depth buffer)
- [ ] Ground: varied red dirt, dry grass and pavement instead of one flat green (terrain itself is P7)
- [ ] Life: cars moving on main roads, a few pedestrians at the malls, flags moving

**Experience**
- [x] Drive mode (key 4): a Toyota Corolla 2020 model by ItsDiyor (CC BY 4.0, wheels split out by tools/prepare_car.mjs; the credit on its Zambian plates and in the help), its own lamps lit for brakes, reversing and dusk, on Rapier's raycast vehicle (WASM, loaded on first drive): springs, dampers and tyre grip; the real U340E 4-speed ratios, 1ZR torque curve, front-wheel drive, drag and rolling resistance after Marco Monster; speed-sensitive steering with Ackermann; brakes, handbrake, reverse on the brake pedal, R to reset; drawn between physics steps so it glides at any refresh rate; chase camera that pulls in at walls; colliders for footprints, walls and landmarks streamed round the car; on touch screens a steering wheel (±135°, springs back) and analog pedals. Tested: 0–100 km/h ≈ 11 s, 60–0 in 2.2 s
- [ ] Driving, next: engine sound (Web Audio, keyed to rpm), traffic on main roads (cars following OSM roads, left-hand traffic), the Lusaka blue minibus, a walking person in Walk mode
- [ ] Guided tour: a cinematic flight from landmark to landmark with a short card at each stop
- [ ] Click to learn: landmark cards; name, street and type for any OSM building
- [ ] Search and share: fly to a place by name; links that open at a view
- [ ] Polish: loading screen, ambient sound (optional, off by default)

**Mobile**
- [x] Quality tiers (src/quality.js): Low, Medium, High picked from the device at start (phones: Medium, or Low with ≤ 4 GB or ≤ 4 cores), switchable in the menu under Controls or with ?quality=; lower tiers draw fewer pixels, smaller or no shadows, no bloom, less city with closer haze, fewer workers (tree density hook in place)
- [ ] Touch controls feel natural (pinch, two-finger turn, tap to glide); the menu fits a phone screen
- [ ] **Verify:** 30+ fps on a mid-range Android phone and an iPhone over mobile data, 60 fps on a laptop; the founder signs off on the look

## Backlog (unordered)

- National Assembly v2: side and rear facades from new photos; ZNBC Opening of Parliament drone footage
- Kenneth Kaunda International Airport as a separate "island" scene (17 km out)
- Photogrammetry or Gaussian splats for landmarks where someone can shoot ~60 photos

---

## Completed

- **P0 — Foundation** (2026-09-26): National Assembly v1 with walkway, time of day, flyover and confidence view; 16k-building OSM base city around the Parliament; private GitHub repo.
