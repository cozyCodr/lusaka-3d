# Mulungushi International Conference Centre — reference notes

Zambia's main conference venue, off Great East Road. Three buildings:
the Old Wing (1970, built by Energoprojekt of Belgrade in 107 days for the
third Non-Aligned summit), the East Wing (2001, for the OAU summit that
founded the African Union) and the Kenneth Kaunda Wing (2022, China Aid).
Model: `src/landmarks/mulungushi.js`.

## Sources

- **Founder's reference photos (2026-09-28)** — sixteen views of the Kenneth
  Kaunda Wing: street and plaza views, drone shots from the east and south,
  the entrance with its lettering, corner close-ups of the fins and the
  terracotta cladding, and the architect's renders (used only to confirm the
  plan).
- **Web photos of the older wings** (reference only): the MICC's own
  TripAdvisor photos ("our main building", "our new wing building"), the
  Industrial Development Corporation's MICC page, Lusaka Times (2009), and
  nesvrstani.rs (Non-Aligned heritage).
- **Esri World Imagery, zoom 18–19** — the plan of all three buildings, the
  Old Wing's raised hall, the East Wing's octagonal hall roof, and the
  Kenneth Kaunda Wing's roof frame, which sits a few metres off its OSM
  outline.
- **OpenStreetMap** — relations 14208530 (Old and East Wings) and 14208532
  (Kenneth Kaunda Wing). The tiler skips both.
- **Research aids, not evidence** — six 3D-look still renders of the older
  wings made with Vertex AI (`gemini-2.5-flash-image`) from the web photos
  and the aerial, to see the sides nobody photographed. Kept outside the
  repository.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| Old Wing: plan | OSM outline, ~59 × 72 m with a porch to the south | high |
| Old Wing: form | recessed glazed ground floor 3.8 m (set back 1.6 m); upper storey of concrete piers and grilles 3.4 m; rust-brown precast fascia 2.6 m deep with a notched top, 1.2 m proud; raised hall (~26 × 45 m, from the aerial) 4.2 m higher with its own fascia | high form (photos), medium heights |
| East Wing | OSM wedge, 12.5 m, silver aluminium panels; green-blue glass curtain wall on the face towards the Old Wing; dark octagonal hall roof, 40 m across | high form, medium height |
| KK Wing: plan | traced from the aerial: a curved east front ~200 m long, north and south wings, a ~58 m square central block | high |
| KK Wing: form | 19.5 m to the white roof frame (2.6 m deep, 3.5 m overhang, ~12 m wide); white fins 2.4 m apart along the front and both ends, 1.5 m deep, over sky-blue glass; grid roofs over the wings; terracotta central block to 25 m with deep punched windows; red plinth walls 2.8 m, 9 m in front, open at the entrance; entrance canopy | high form (photos), medium heights |

## Known gaps

- The Kenneth Kaunda Wing's west side (terracotta with punched windows here) and the rear courtyards are simplified.
- The fins are straight segments following the traced front; the real front is a smooth curve.
- The plaza, fountains, car parks, the African Union statue and the landscaping are not modelled.
- The East Wing's lower strip along its west side is not separated from the main volume.
