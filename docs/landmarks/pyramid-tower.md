# Pyramid Tower ("Burj Kalingalinga") — reference notes

The Continental Pyramid Hotel on Thabo Mbeki Road, at the western edge of
Kalingalinga; nicknamed "Burj Kalingalinga". Reported at 27 floors, making
it Zambia's tallest building. Model: `src/landmarks/pyramid-tower.js`.

## Sources

- **Founder's reference photos (2026-09-27)** — eight images. Six show the
  tower as built (from the street, the playing field to the south, close up
  at the podium, and an aerial). Two are the architect's renders (gold glass,
  a pyramid-roofed pavilion on the podium); the as-built tower differs, so
  the renders were not used for the model.
- **Web** — reports of the Pyramid Hotel along Thabo Mbeki Road with 27 floors
  (e.g. Africa View Facts, 2024; local social media, 2024).
- **Esri World Imagery, zoom 16–18** — the tower's square pyramid roof and
  long shadow at the north corner of a podium with a lilac roof and a
  rooftop pool, ~200 m east of Thabo Mbeki Road (tower ≈ -15.3993, 28.3226).
- **OpenStreetMap** — the tower is not mapped. Three
  `microsoft/BuildingFootprints` blocks (ways 1061490855, 1061490873,
  1062089194) traced the podium during construction; the tiler skips them and
  the hand-built podium replaces them.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| Position | tower centre (1452, 785) in world metres, faces at 10° / 100° | medium (imagery; roof displaced by height) |
| Shaft | 32 m square, 100 m tall | medium: width from the roof on imagery, height from 27 floors and photo proportions |
| Facade | blue glass on a 27-floor grid, a pale silver zigzag band on every face (mirrored on alternate faces) | high form, medium band geometry |
| Crown | white ledge, a 3.5 m ring of windows, grey pyramid 18 m high (top ≈ 122 m) | high form, medium size |
| Podium | quadrilateral ~130 × 90 m from imagery, 13 m: blue glass with a grey top band, lilac roof, rooftop pool and decks | medium |

## Known gaps

- The faces are flat; the real facade is folded along the zigzag.
- The construction crane seen in most photos is left out.
- The podium's exact outline, entrances and pavilion are simplified.
