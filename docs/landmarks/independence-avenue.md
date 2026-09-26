# Independence Avenue civic cluster — reference notes

Three Tier 1 landmarks within 150 m of each other on the north side of
Independence Avenue, west of Nasser Road: Government Complex, the Freedom
Statue in front of it, and the Lusaka National Museum with its steel figure.
Models: `src/landmarks/government-complex.js`, `freedom-statue.js`,
`national-museum.js`.

## Sources

- **Founder's reference photos (2026-09-26)** — 18 of the Freedom Statue and
  the museum, then 7 more of Government Complex and the steel figure.
  They settled where the statue stands: every statue photo has the finned
  Government Complex slab behind it, never the museum, and OSM agrees.
- **OpenStreetMap** — Freedom Statue node 1150426134 (`historic=memorial`,
  `memorial=statue`); Government Complex relation 14785138 (outer ring and
  three courtyards); Lusaka National Museum way 288801150 (48.9 × 50.3 m,
  wikidata Q3267774); service road spur to the museum's south face.
- **Esri World Imagery, zoom 18** (0.576 m/px) — Government Complex slab roof
  and shadow; pixel-to-map conversion checked against the museum and statue
  (both within 4 m of OSM).
- **Plaque on the pedestal** — "Monument dedicated to freedom fighters", in
  memory of those who lost their lives for Zambia's freedom, unveiled by
  President Kenneth Kaunda on the tenth anniversary of independence.

## Freedom Statue

| Element | Value | Confidence |
|---|---|---|
| Position, facing | OSM node; faces the avenue (bearing 171°) | high |
| Figure | man in torn vest and shorts, legs braced, fists raised breaking chains, shouting | high form; proportions medium |
| Figure height | ~3.1 m on a rock base | medium |
| Pedestal | white, 2.4 × 2.4 × 1.8 m, FREEDOM in dark letters, plaque below, bronze relief panels on the sides, two white steps | high form, medium size |
| Setting | railing with spear bars and a gate, square concrete gateposts, brick paving, white-trunked tree, walkway with flagpoles to the avenue | high |
| Walkway length | ~34 m, to the north kerb of Kayombo Road (OSM centreline 37 m out, skewed ~8°); Independence Avenue's carriageways lie beyond, 61 m and 73 m out | high |

## Government Complex

| Element | Value | Confidence |
|---|---|---|
| Low-rise complex | OSM outline and courtyards, 11 m, white with dark window strips | footprint high, height medium |
| Slab | 94 × 27 m, 44 m above the podium, bearing 171° | medium (satellite + photos) |
| Slab facade | dense full-height white fins front and back over dark glazing | high |
| End walls | solid, pale panels with fine joints, standing proud of the fins | high |
| Penthouse | centred band ~40% of the slab width, 6 m, mast and dish | medium |
| Entrance | stacked cantilevered white floors over a glazed lobby, on the statue axis | medium |

## National Museum

| Element | Value | Confidence |
|---|---|---|
| Footprint | OSM, front (south) face 48.9 m | high |
| Plinth and steps | 1.5 m plinth, brick sides, broad central steps | medium |
| Ground floor | dark glazing behind columns, NATIONAL MUSEUM spaced across it | high |
| Upper volume | white tile, 14 m, two thin dark bands on the wings | high form, medium height |
| Central bay | 7 tall windows between folded (pleated) pilasters | high |
| Roof | red block, ~21 × 14 × 3 m, set back | high form, medium size |
| Steel figure | seated giant of polished shards on a black steel frame, right hand raised with a brush, left arm on the knee, ~6 m tall | medium: faceted approximation |

## Known gaps

- Back and side facades of all three are inferred from the front.
- The Government Complex low-rise wings vary in height in reality; modelled at one height.
- The steel figure is an approximation: its shard surface is suggested by flat shading, not modelled plate by plate.
