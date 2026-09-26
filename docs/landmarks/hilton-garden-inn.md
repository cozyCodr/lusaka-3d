# Society Business Park: Hilton Garden Inn tower and the shell building — reference notes

West of Cairo Road. Model: `src/landmarks/hilton-garden-inn.js` (both
buildings).

## Sources

- **Founder's reference photos (2026-09-27)** — twelve views: along Cairo
  Road by day, golden hour and night; an aerial over Cairo Road; close views
  of the crown and of the canted bronze spandrels; the shell building with the
  tower behind it, its lettering and its curved street frontage. v2 is built
  from these (v1, from web thumbnails, got the crown and colours wrong).
- **Hilton / listing sites** — 18 hotel floors, 148 rooms.
- **OpenStreetMap** — way 1185077883 (`building=hotel`), 25 × 18 m, long axis
  at bearing 80°. The shell building is **not in OSM**; the multi-storey car
  park south of it is way 653340455.
- **Esri World Imagery, zoom 19** — the tower roof (displaced north-west by
  its height), the crescent podium on the Cairo Road side, and the shell
  building ~80 m west: a racetrack plan ~56 × 34 m.

## One building (founder, 2026-09-27)

The tower and the shell are one building: a mall podium runs from a curved
frontage on Cairo Road back to the rounded shell at its west end, and the
hotel tower stands on the podium roof. A second batch of eight photos (from
Cairo Road, head-on at the east end, the crown close up) set the crown.

## Model (frame: origin on the tower's OSM centroid, +z east along 80°, +x north)

| Element | Value | Confidence |
|---|---|---|
| Podium, Cairo Road wing | local x -14..30, z -55..34, curved east front; shops + three levels, 16.1 m; rounded cream bands over louvred glass; roof garden | form high, extent medium |
| Podium, rear wing | x -8..50, z -108..-48, linking to the shell | low |
| Shell | racetrack ~56 × 34 m at (8, -80), shops + six levels ≈ 29 m, lettering on top | medium |
| Tower | OSM footprint, 18 hotel floors of 3.3 m from the podium roof to ≈ 75.5 m; faceted corners; rose-cream canted spandrels over bronze glass | high |
| Spine | 6 m glass spine up the middle of the east end, 2.5 m proud | high |
| Crown | the spine arcs back over the roof (quarter ellipse, 20 m rise) into a raked glass sail peaking 25 m above the roof over the west end | high form, medium size |
| Roof box | dark box under the arc with the red Hilton sign on the south face | medium |
| OSM | retail way 625074826 sits inside the podium and is skipped by id | high |

## Known gaps

- The podium's exact outline is read from imagery; the rear wing is a guess.
- Crown pieces are solid glass shapes; the real ones are framed and open.
- The spandrels are bands with ledges, not true canted panels.
- The old red-brick Society House is still a plain OSM shape.
