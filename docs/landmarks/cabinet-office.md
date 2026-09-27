# Cabinet Office and the Cenotaph — reference notes

Independence Avenue, facing the Cenotaph square. Model:
`src/landmarks/cabinet-office.js` (compound, square and Cenotaph).

## Sources

- **Founder's reference photos (2026-09-27)** — 19 images: the slabs' eagle
  ends and arcades, the colonial block head-on and from the car park, the
  colonnades linking them, the Cenotaph (swords, stepped base) from several
  sides, the square with its flags and chain fence.
- **OpenStreetMap** — relation 9356697 "Cabinet Office" (old name Central
  Offices, "Colonial Legislative Council (Legco) office", 4 levels): an outline
  that reads as two 14 × 76 m slabs running towards the square, the colonial
  block between them with end porticoes, narrow links, and rear wings. The
  Independence Avenue loop (way 436890693) encloses the square; footways mark
  the Cenotaph platform on the axis.
- **Esri imagery, zoom 18** — confirms the layout, but is offset ~50 m from
  OSM here, so OSM is used for placement.

## Model (frame: +z towards the square, bearing 39°; +x north-west)

| Element | Value | Confidence |
|---|---|---|
| Slabs | OSM, 14.7 × 76 m; arcade 5.5 m + 4 floors of 3.5 m ≈ 21 m; window slits under box hoods on every face; eagle on the square-facing end | form high, height medium |
| Colonial block | x -38…33, 13 m deep; 3 storeys of 4.2 m under a red hipped roof; arched ground windows, sash windows above, rustication, cornice | high form, medium size |
| Porticoes | columned end porticoes with balconies; four columns, three doors and awnings at the centre | medium |
| Colonnades | arched links, 7.5 m | medium |
| Rear wings | OSM fingers behind the colonial block, 8.5 m with hipped roofs | low |
| Square | paved racetrack inside the road loop (124 × 38 m), chain fence, red brick path to the Cenotaph, 14 flags | medium |
| Cenotaph | dark stone tower ~11 m on three steps, light cap, two swords on each broad face, plaque | high form, medium size |

## Known gaps

- The slab window rhythm and hood spacing are uniform approximations.
- Rear wings and their heights are inferred from the outline only.
- Flags are generic tricolours, not the real set of nations.
