# Embassy Park Presidential Burial Site — reference notes

The national monument on Independence Avenue, opposite the Cabinet Office,
where Zambia's former presidents are buried. Five are buried here (Kaunda,
Chiluba, Mwanawasa, Banda and Sata), but only three mausoleums have been
built; Kaunda's and Banda's are still being planned and are not modelled.
Model: `src/landmarks/embassy-park.js`.

## Sources

- **Wikimedia Commons** — nine photos by Icem4k / Isaac Kanguya, July 2021,
  CC BY-SA 4.0: three each of the Sata, Mwanawasa and Chiluba mausoleums
  (e.g. `File:Sata's_mausoleum.png`, `File:Mwanawasa’s_mausoleum_II.png`,
  `File:Chiluba's_mausoleum.png`). Used as reference only; nothing embedded.
- **MAKANDAY**, "Embassy Park – the place of rest for Zambia's departed
  fathers" — a named photo of the Chiluba mausoleum (credit Harold Machuku)
  and the design symbolism.
- **Wikipedia**, Embassy Park Presidential Burial Site — who is buried there,
  and that only three mausoleums are built.
- **OpenStreetMap** — the park (way 436890691), its ring road, and the three
  mausoleum footprints (ways 1061983719 Sata, 1061983883 Mwanawasa,
  1062088974 Chiluba). The tiler skips the three footprints.
- **Esri World Imagery, zoom 19** — roof shapes and colours, Sata's upper
  pavilion at the back of its terrace and the stair side, Chiluba's round
  enclosure, and a white ring that the photos show to be a round podium
  striped in the flag's colours.
- **Research aids, not evidence** — photos found and checked with Codex CLI
  (gpt-6-astra, one sub-agent per mausoleum), which also drew orthographic
  reference sheets from them; unphotographed sides were left blank. A
  Hunyuan3D-2 mesh made from one Mwanawasa photo confirmed the disc-on-four-piers
  massing (height about 0.43 of the diameter). The pack is kept outside the
  repository.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| Sata: plan | lower block 14.4 × 17 m on the OSM footprint, stair side facing SW (bearing 221°) to Independence Avenue | high plan, medium facing (aerial) |
| Sata: form | 3.3 m lower block with a glazed centre between solid wings and glazed side bays; railed terrace; 9.6 × 8.6 m glazed upper pavilion at the back, 3 m, flat roof slab with a white balustrade and a portrait medallion (a plain disc); open straight stair, 20 risers | high form (photos), medium sizes (codex estimates 6.5–8 m to the top rail; model 7.9 m) |
| Mwanawasa: form | round drum (r 6.3 m) with four big arched glazed openings, four flared piers on the diagonals with a brown band, flat disc roof 16 m across, 1.1 m thick, top at 6.8 m; brick plinth | high form (photos, aerial, mesh), medium height |
| Mwanawasa: entrance | brick steps on one side, facing NE toward the podium | low (facing not seen) |
| Chiluba: form | white 16-sided drum (r 7.4 m, 5.6 m) with semicircular glazed arches on three sides and tall entry bays on the fourth; cream fascia ring (r 8.5 m); 12-sided charcoal roof; louvred lantern, cap and cross (top ≈ 12.5 m); eight dark struts in pairs near the diagonals, leaning out to their feet; red-brown plinth | high form (photos), medium sizes (codex estimates 10–12 m overall) |
| Chiluba: setting | paved ring and hedge about 28 m across, from the aerial; entry bays face SW | medium ring, low facing |
| Flag podium | round, 11.4 m across, 0.8 m, sides striped green / red / black / orange, pale top with a white rim | medium (aerial size, photo colours) |

## Known gaps

- The facing of the Mwanawasa and Chiluba entrances is a guess: the photos give no compass bearings.
- The backs of all three mausoleums were not photographed; the model repeats the sides.
- Chiluba's red-fascia photo shows an unfinished stage; the finished white and cream scheme is modelled.
- Paths, hedges, lamp posts, the gates and the site wall are not modelled yet.
- Kaunda's and Banda's graves have no mausoleum and are not shown.
