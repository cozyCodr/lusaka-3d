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
| Hilton Garden Inn (Society Business Park) | v1: banded slab, curved glass end and sail from web photos | [docs/landmarks/hilton-garden-inn.md](docs/landmarks/hilton-garden-inn.md) |
| Bank of Zambia | v1: finned head office, lettered lower wing, skybridges to the banded south block | [docs/landmarks/bank-of-zambia.md](docs/landmarks/bank-of-zambia.md) |

Open any landmark directly with its slug, e.g. `#freedom-statue`, `#findeco-house`.

## City data

`data/core.json` covers ~7.3 × 9.4 km from Heroes Stadium south through the
Parliament and the CBD (83.5k buildings, 6.3k roads). Rebuild it from a fresh Overpass export:

```bash
python3 tools/osm_to_json.py data/raw/core.json data/raw/rels.json > data/core.json
```

The Overpass queries live in `tools/queries/`.

## Approach

1. **Base sketch** — OpenStreetMap footprints and roads (© OpenStreetMap
   contributors, ODbL), elevation from Copernicus DEM.
2. **Procedural detail** — building types generated from OSM tags.
3. **Hero landmarks** — modelled from reference photos, every part tagged
   high / medium / low confidence (toggle "Confidence view" in the app).
