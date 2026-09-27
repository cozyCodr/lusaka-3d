# Lusaka landmarks

What to build, in what order, and at what level of detail. The machine-readable
catalogue is [`data/landmarks.json`](../data/landmarks.json): **451 named places**
from OpenStreetMap with coordinates in the app's world frame (x = east, z = south,
metres from the Parliament). Regenerate it with:

```bash
python3 tools/landmarks_catalog.py data/raw/landmarks.json > data/landmarks.json
```

(Overpass query: `tools/queries/landmarks.overpassql`. Data © OpenStreetMap contributors, ODbL.)

## How much detail each place gets

| Tier | Treatment | Effort | Count |
|---|---|---|---|
| **1 · Icons** | Hand-modelled like the Assembly: reference pass (satellite + photos), `docs/landmarks/<slug>.md`, confidence tags | 2–4 h each | 22 |
| **2 · Notable** | Correct OSM footprint + measured height + a type-specific facade (hotel, mall, ministry, hospital…) and a floating label | 15–30 min each | ~50 |
| **3 · Generated** | One procedural generator per category, applied to every OSM match | one generator each | hundreds |

**Where things are:** the map (`data/core.json`) now runs from the Parliament
south through the CBD (Cairo Road, Independence Avenue) to -15.445, so the
"In current map" column below is from the older, smaller box: most Tier 1
icons are now inside. Kwacha House (Zamtel) and the ZESCO head office turned
up in the wider export.

## Tier 1 — icons

| Place | Type | km from Parliament | In current map | Wikidata | Notes |
|---|---|---|---|---|---|
| National Assembly of Zambia | government | 0 | ✓ | ✓ | v1 built — [notes](landmarks/national-assembly.md) |
| Hilton Garden Inn + Society Business Park shell | hotel | 4.1 | ✓ |  | v2 built from the founder's photos — [notes](landmarks/hilton-garden-inn.md) |
| Findeco House | building | 4.46 | ✓ | ✓ | v1 built — [notes](landmarks/findeco-house.md) |
| Freedom Statue | monument | 3.93 | ✓ |  | v1 built — stands in front of Government Complex, not at the museum; [notes](landmarks/independence-avenue.md) |
| Cathedral of the Holy Cross | worship | 2.99 | ✓ |  | v1 built — [notes](landmarks/cathedral-holy-cross.md) |
| Lusaka National Museum | culture | 3.79 | ✓ | ✓ | v1 built, with the steel figure in front — [notes](landmarks/independence-avenue.md) |
| Government Complex | government | 3.88 | ✓ |  | v1 built — [notes](landmarks/independence-avenue.md) |
| Bank of Zambia | building | 4.22 | ✓ |  | v1 built — [notes](landmarks/bank-of-zambia.md) |
| Cabinet Office | government | 3.4 | ✓ |  | v1 built with the Cenotaph square — [notes](landmarks/cabinet-office.md) |
| Embassy Park Presidential Burial Site | monument | 3.26 | — | ✓ | Three presidential mausoleums |
| Supreme Court | government | 2.95 | — |  |  |
| Lusaka City Council Civic Centre | government | 3.29 | — |  | Civic centre clock tower |
| The Pamodzi Hotel | hotel | 2.9 | — | ✓ |  |
| Intercontinental Hotel | hotel | 2.91 | — |  |  |
| Mulungushi International Conference Centre | venue | 0.59 | ✓ |  | Inside the current map |
| Kenneth Kaunda International Conference Centre | venue | 0.42 | ✓ |  | Inside the current map; newest civic landmark |
| Manda Hill Mall | mall | 0.62 | ✓ |  | Inside the current map |
| East Park Mall | mall | 1.39 | ✓ |  | Inside the current map |
| Levy Junction Shopping Mall | mall | 3.44 | — |  |  |
| National Heroes Stadium | venue | 4.64 | ✓ | ✓ | v1 built, with the Gabon Disaster Memorial — [notes](landmarks/heroes-stadium.md) |
| University of Zambia (UNZA) | education | 2.5 | — | ✓ | Great East Road campus; library block |
| Kenneth Kaunda International Airport | transport | 17.06 | — | ✓ | 17 km out: separate "island" scene |
| State House | building | 4.51 | — | ✓ | Satellite massing only: no ground photos sought (security) |

## Tier 2 — notable places

| Place | Type | km | In map | Wikidata | Notes |
|---|---|---|---|---|---|
| University Teaching Hospital | hospital | 4.28 | — | ✓ |  |
| Levy Mwanawasa University Teaching Hospital | hospital | 4.86 | — |  |  |
| Lusaka Playhouse | venue | 3.1 | — |  |  |
| Southern Sun Ridgeway Lusaka | hotel | 3.15 | — |  |  |
| Radisson Blu | hotel | 0.87 | ✓ |  |  |
| Protea Hotel Towers | hotel | 0.93 | ✓ |  |  |
| Protea Hotel Cairo Road | hotel | 4.27 | — |  |  |
| Lusaka Grand Hotel | hotel | 3.02 | — |  |  |
| Arcades Shopping Mall | mall | 0.84 | ✓ |  |  |
| Longacres Mall | mall | 2.3 | — |  |  |
| Cairo Mall | mall | 4.48 | — |  |  |
| Kamwala Shopping World | mall | 4.25 | — |  |  |
| Novare Great North Mall | mall | 4.77 | — |  |  |
| Crossroads Mall | mall | 6.9 | — |  |  |
| Pinnacle Mall | mall | 5.66 | — |  |  |
| City Market | market | 4.7 | — |  |  |
| Sunday Crafts Market | market | 0.83 | ✓ |  |  |
| Intercity Bus Terminal | transport | 4.05 | — |  |  |
| Millennium Bus Station | transport | 4.0 | — |  |  |
| High Court | government | 2.99 | — |  |  |
| Subordinates Courts | government | 4.15 | — |  |  |
| Ministry of Finance | government | 3.18 | — |  |  |
| Ministry of Foreign Affairs | government | 3.08 | — |  |  |
| Ministry of Health | government | 2.75 | — |  |  |
| Mulungushi House | government | 3.67 | — |  |  |
| Electoral Commission of Zambia | government | 2.76 | — |  |  |
| National Pension Scheme Authority | government | 3.46 | — |  |  |
| Zambia Revenue Authority (ZRA) | government | 3.62 | — |  |  |
| Anti Corruption Commission | government | 4.52 | — |  |  |
| Lusaka Boma | government | 3.68 | — |  |  |
| National Archives | building | 3.79 | — | ✓ |  |
| Evelyn Hone College | education | 3.45 | — | ✓ |  |
| Cenotaph | monument | 3.34 | ✓ |  | built with the Cabinet Office — [notes](landmarks/cabinet-office.md) |
| Lusaka Memorial | monument | 4.33 | — |  |  |
| Gabon Disaster Memorial | monument | 5.02 | ✓ |  | built with the stadium — [notes](landmarks/heroes-stadium.md) |
| E W Tarry's Building | monument | 3.95 | — |  |  |
| Kenneth Kaunda Chilenje House National Monument | monument | 6.2 | — |  |  |
| Kabwata Cultural Village | attraction | 4.51 | — |  |  |
| Cathedral of the Child Jesus | worship | 2.48 | — |  |  |
| Lusaka Golf Club | leisure | 3.5 | — | ✓ |  |
| Chainama Hills Golf Club | leisure | 4.01 | — | ✓ |  |
| Lusaka City Airport | transport | 3.42 | — | ✓ |  |
| Nationalist Stadium | venue | 4.2 | — |  |  |
| Woodlands Stadium | venue | 7.23 | — | ✓ |  |
| Independence Stadium | venue | 4.83 | — | ✓ |  |
| Embassy of the United States of America | embassy | 7.09 | — | ✓ |  |
| High Commission of the United Kingdom of Great Britain | embassy | 3.41 | — | ✓ |  |
| Embassy of the People's Republic of China | embassy | 2.92 | — |  |  |
| High Commission of the Republic of South Africa | embassy | 6.25 | — | ✓ |  |

The rest of the catalogue by category: 55 hotels, 58 malls, 91 government
offices, 41 embassies, 37 colleges and universities, 36 hospitals. All are in
`data/landmarks.json`; promote any of them to Tier 2 by adding a row here.

## Tier 3 — category generators

| Generator | OSM matches | Look |
|---|---|---|
| Market | 77 (`amenity=marketplace`) | Rows of stalls with iron-sheet roofs, umbrellas, crowds of crates |
| Church | 533 (`amenity=place_of_worship`) | Gabled hall with front tower or cross; size from footprint |
| Embassy / high commission | 41 | Walled compound, gatehouse, flagpole with the country's flag |
| School | ~60 (`building=school`) | Long single-storey classroom blocks around a yard |
| Filling station | from OSM `amenity=fuel` (not yet exported) | Canopy + pumps + shop, brand colours |
| Residential plot | ~6,000 houses | Perimeter wall, gate, pitched iron roof, yard trees |

## Not in OSM yet — verify before modelling

Well known, but missing or unnamed in the export. Locations are from memory
and **must be confirmed** (satellite + a photo) before any work.

| Place | Expected location | Type |
|---|---|---|
| Zanaco head office | Cairo Road | Bank HQ |
| Lusaka Showgrounds (A&C Show) | Great East Road, near Mulungushi | Showground |
| Kulima Tower | CBD (bus station exists in OSM) | Office tower |
| MTN, Airtel, Zamtel head offices | Various | Company offices |
| Stanbic, Absa, FNB head offices | Addis Ababa Dr / Cairo Rd area | Bank HQs |
| Mulungushi Village | Near the conference centre | Complex |

## Adding a landmark (Tier 1 checklist)

1. Look it up in `data/landmarks.json` for the exact coordinates and OSM id.
2. Pull its OSM outline (way or relation) — prefer it over scale-bar measurements.
3. Collect references: satellite (footprint, roof), front photos, any side or
   aerial shots. Note sources and licences in `docs/landmarks/<slug>.md`.
4. Model it in `src/landmarks/<slug>.js`, tagging every part high / med / low.
5. Remove its OSM footprint from the base city (`HAND_MODELLED` in the converter).
6. Add it to the table above and tick it off in the planner.
