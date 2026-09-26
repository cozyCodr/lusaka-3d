# Lusaka 3D

A browser-based 3D map of Lusaka, built progressively with three.js: a base
city from open data, procedural detail, and hand-built landmarks.

## Run

```bash
python3 -m http.server 5199
```

Open http://localhost:5199 (append `#still` to skip the intro flyover).

## Landmarks

| Landmark | Status | Reference |
|---|---|---|
| National Assembly of Zambia | v1: front accurate, sides/rear guessed | [REFERENCE.md](REFERENCE.md) |

## Approach

1. **Base sketch** — OpenStreetMap footprints and roads (© OpenStreetMap
   contributors, ODbL), elevation from Copernicus DEM.
2. **Procedural detail** — building types generated from OSM tags.
3. **Hero landmarks** — modelled from reference photos, every part tagged
   high / medium / low confidence (toggle "Confidence view" in the app).
