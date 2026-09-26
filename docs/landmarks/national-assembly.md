# National Assembly of Zambia — reference notes

What the model is built from, and how sure we are of each part.

## Sources

- **Satellite** — Google Maps, zoom 19, centred on -15.39227, 28.30904
  (20 m scale bar ≈ 53 px). Lusaka has no Google 3D mesh, so no heights.
- **Front photo** — Wikimedia Commons, `File:Zambia_National_Assembly_Building.jpg`,
  plus ~20 near-identical press/stock shots from the bottom of the walkway.
- **OpenStreetMap** — relation "National Assembly" (wikidata Q1784088): an
  outer ring and two inner light wells, traced from imagery. Supersedes the
  scale-bar estimates below where they differ.
- **Official history** — parliament.gov.zm/node/111: hilltop site (former
  homestead of headman Lusaka), ~1 ha, four levels (lower ground, podium,
  first floor with chamber for 120, gallery level). Opened 1967.

## Measurements (satellite)

| Element | Value | Confidence |
|---|---|---|
| Podium ring footprint | 72 m × 51.5 m (OSM; scale bar read ~77 × 60) | high |
| Wing depths | front/back 11.7 m, NW/SE ends 8.7 m (OSM light wells) | high |
| Long-axis bearing | 118° (WNW–ESE); front faces 28° (NNE) | high |
| Chamber block footprint | 37 m × 28 m, filling the gap between the light wells | high |
| Light wells | 8.8 m × 28 m either side of the chamber; the SE one planted | high |
| Approach walkway | ~55 m, straight, from Parliament Rd turning circle down to the front | high |
| Neighbours | now taken from OSM footprints (see data/core.json) | high |

## Heights (estimated from front photos by floor count)

| Element | Value | Confidence |
|---|---|---|
| Podium | ~10 m: glazed ground floor behind columns, lettered fascia, finned upper floor | medium |
| Chamber block | ~24 m, windowless, vertical copper-red fins | medium |
| Walkway drop | ~4.5 m over its length, shallow terraced steps | medium |

## Known gaps

- No usable side, rear or aerial photos: those facades repeat the front's
  language and are **guesses** (shown red in the app's confidence view).
- Roof plant on the chamber is visible from above but its form is simplified.
- Better sources if found later: phone photos around the perimeter, ZNBC
  Official Opening of Parliament broadcasts (drone shots).
