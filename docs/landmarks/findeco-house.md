# Findeco House — reference notes

Zambia's tallest building, at the junction of Cairo Road and Independence
Avenue. Model: `src/landmarks/findeco.js`.

## Sources

- **Wikipedia, FINDECO House** — 90 m (295 ft), 23 floors, built 1978–79,
  Yugoslav modernism, architects Dušan Milenković & Branimir Ganović, main
  contractor ZECCO; rooftop sign since 2013 (Samsung, later others).
- **OpenStreetMap** — way 1069663212 (`building=office`, wikidata Q21007716):
  the podium footprint, 52.8 × 34 m with notches, edges at bearings 80° / 350°.
- **Satellite** — Google Maps zoom 20: square roof with notched corners, about
  26 m across (scale bar ≈ 0.19 m/px); long shadow to the south-west.
- **Photos** — Wikipedia infobox, The Skyscraper Center elevation, African
  State Architecture (Lutz Marten, 2021), several press shots from Cairo Road.
  Consistent across eras: narrow neck over the podium, floors stepping out to
  the shaft, banded shaft, crown cantilevered wider than the shaft, masts.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| Height to mast tips | 90 m | high (Wikipedia) |
| Floors | 23 (podium 2, neck, 3 stepped, 15 shaft, 2 crown) | medium: split estimated |
| Podium footprint | OSM outline, extruded 7 m | footprint high, height medium |
| Shaft plan | 26 × 26 m, corners notched 3 m | medium (satellite roof) |
| Neck | 12 × 12 m, 5 m tall | medium (photos) |
| Steps to shaft | 16 → 20 → 23 m, 2.4 m each | medium |
| Crown | 28 then 30 m wide, 3.6 m floors | medium |
| Orientation | 10° off north, from the OSM edges | high |
| Rooftop plant and masts | simplified | low / medium |

## Known gaps

- The shaft colour changed over the decades (grey bands in 1980s photos,
  bronze-brown today); the model uses today's bronze-brown.
- Crown signs are plain green panels: no brand artwork, and the real sign
  changes every few years.
- Podium detail (angled canopies, shopfronts along Cairo Road) is simplified.
