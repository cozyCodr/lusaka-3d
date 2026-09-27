# Lusaka 3D

A browser-based 3D map of Lusaka, built progressively with three.js: a base
city from open data, procedural detail, and hand-built landmarks.

## Run

```bash
python3 tools/serve.py
```

Open http://localhost:5199 (append `#still` to skip the intro flyover).

## Docs

- [Development planner](docs/DEVELOPMENT_PLANNER.md) — what's next and what's done
- [Landmarks](docs/LANDMARKS.md) — every well-known place, by tier

## Landmarks

| Landmark | Status | Reference |
|---|---|---|
| National Assembly of Zambia | v1: OSM outline, front accurate, sides/rear guessed | [docs/landmarks/national-assembly.md](docs/landmarks/national-assembly.md) |
| Findeco House | v2: pedestal, finned shaft, bracketed crown from reference photos | [docs/landmarks/findeco-house.md](docs/landmarks/findeco-house.md) |
| Government Complex, Freedom Statue, National Museum (+ steel figure) | v1: Independence Avenue cluster from reference photos | [docs/landmarks/independence-avenue.md](docs/landmarks/independence-avenue.md) |
| Cathedral of the Holy Cross | v1: prow tower, folded-plate nave, glass-grid walls from reference photos | [docs/landmarks/cathedral-holy-cross.md](docs/landmarks/cathedral-holy-cross.md) |
| National Heroes Stadium (+ Gabon Disaster Memorial) | v1: petal roof, louvred bowl, glass and orange fronts from reference photos | [docs/landmarks/heroes-stadium.md](docs/landmarks/heroes-stadium.md) |
| Society Business Park (mall + Hilton Garden Inn tower) | v3: one building; tower on the mall podium, spine-arc-sail crown | [docs/landmarks/hilton-garden-inn.md](docs/landmarks/hilton-garden-inn.md) |
| Cabinet Office + Cenotaph square | v1: colonial block, eagle slabs, colonnades, Cenotaph from reference photos | [docs/landmarks/cabinet-office.md](docs/landmarks/cabinet-office.md) |
| State House (+ grounds) | v1: brick block, curved portico, garden loggia, gates, lawn and woodland | [docs/landmarks/state-house.md](docs/landmarks/state-house.md) |
| Bank of Zambia | v1: finned head office, lettered lower wing, skybridges to the banded south block | [docs/landmarks/bank-of-zambia.md](docs/landmarks/bank-of-zambia.md) |

Open any landmark directly with its slug, e.g. `#freedom-statue`, `#findeco-house`.

## City data

All of Greater Lusaka (about 37 × 31 km, including the airport) is cut from
the OpenStreetMap Zambia extract into 1,330 tiles of 1 km: 466k buildings,
34k roads and runways. Tiles near the camera load in full; further out a
light version (large buildings, main roads); beyond that, haze. Geometry is
built in web workers.

Rebuild the tiles from a fresh extract (Geofabrik, ~250 MB):

```bash
curl -L -o data/raw/zambia-latest.osm.pbf https://download.geofabrik.de/africa/zambia-latest.osm.pbf
pip install osmium
python3 tools/osm_tiles.py data/raw/zambia-latest.osm.pbf data/tiles
```

## Approach

1. **Base sketch** — OpenStreetMap footprints and roads (© OpenStreetMap
   contributors, ODbL), streamed in 1 km tiles; elevation from Copernicus DEM (planned).
2. **Procedural detail** — building types generated from OSM tags.
3. **Hero landmarks** — modelled from reference photos, every part tagged
   high / medium / low confidence (toggle "Confidence view" in the app).
