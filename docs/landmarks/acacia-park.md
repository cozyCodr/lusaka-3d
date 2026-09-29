# Acacia Park — reference notes

The office park at the corner of Great East Road and Thabo Mbeki Road,
opposite East Park Mall: head offices of FNB Zambia and UBA Zambia (Stand
22768), Ecobank, Zanaco and others. Owned by Real Estate Investments Zambia
(Reiz). Model: `src/landmarks/acacia-park.js`.

## Sources

- **Founder's reference photos (2026-09-29)** — drone views of the Ecobank
  drum and wings, the FNB head office front with the Emirates tower and
  shade sails, the palm court with Access, and UBA's front.
- **Reiz Real Estate, reizreit.com/acacia-park** — six drone and street
  photos (reference only): Ecobank from the car park and above, the Aon
  block, the Zanaco curved end, FNB.
- **FNB Zambia, "About us"; UBA Zambia (Wikipedia)** — the address.
- **OpenStreetMap** — ways 674694885 (Ecobank block), 674694884 (Zanaco),
  674694882 (FNB), and the service roads round the site; the tiler skips
  the three buildings. `data/landmarks/acacia-park-roads.json` keeps the car
  park layout off the roads (ODbL).
- **Esri World Imagery, zoom 19** — the pinwheel roof, the second drum, the
  palm court and the car parks.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| Buildings | three OSM outlines, two storeys, 8.8 m, beige render, paired windows, grey sunshade fins at the eaves | high plan, medium height |
| Ecobank drum | r 12.3 m on the OSM arc, pinwheel roof of alternating terracotta and grey sheets, ring canopy on seven white columns with the teal Ecobank band | high form (photos, aerial) |
| Sign towers | dark towers: FNB (logo, Zambia Head Office), Emirates, Aon at the west tip, an Ecobank stair tower; curved glazed stair between FNB and Emirates; First National Bank in letters on the FNB wing | high form, medium positions |
| Other signs | Zanaco red band at the curved end of its block; UBA and Access on the south-east wing | medium (UBA, Access low) |
| Second drum | r 9 m with a shallow cap on the south-east wing, from the aerial | medium |
| Site | paved inside the service loop; palm court lawn; palms along the FNB front; black shade sails over FNB's bays; car parks with bays, planted islands, trees, lamps and cars (shared `yard.js`) | medium |

## Known gaps

- UBA's own two-storey building (tall glazed bays, palms) is not placed: its position on the site is unknown.
- The north-east FNB wing's awnings and the Emirates block's side are simplified.
