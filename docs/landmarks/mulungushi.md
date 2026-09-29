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
  plan). A second set (2026-09-28): the terracotta ends and back with
  staggered windows, the colonnade under the canopy, the end columns, the
  African Union statue, the flagpole avenue, urns, lights and night views.
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
| KK Wing: form | 19.5 m to the white roof frame (2.6 m deep, 3.5 m overhang, ~12 m wide); curved front of white fins 2.4 m apart, 1.6 m deep, over sky-blue glass, with a white band across them at 7 m; ends and back in terracotta panels with deep windows staggered floor to floor over a glazed ground floor, slender white columns under the frame at both ends; terracotta central block to 25 m | high form (photos), medium heights |
| KK Wing: front | granite podium 1.8 m high and 9 m deep with red walls; six broad steps at the entrance; canopy with "KENNETH KAUNDA WING" on round white columns | high form, medium sizes |
| Yard | traced from the aerial: paving from the podium to the east drive and the roads north and south (the OSM footpaths inside it are covered, the drives around it left clear); seven lawn panels; a 16 m round basin; the African Union statue (Africa slab and three figures on a stepped plinth) at the south end of the flag walk, facing east; 24 steel flagpoles in two rows on the striped walk between the north lawns and the drive; grey urns along the podium; solar street lights along the east edge; date palms along the north parking drive and a double avenue along the east path | layout high (aerial), statue low (proportions from photos) |

## Known gaps

- The Kenneth Kaunda Wing's west side (terracotta with punched windows here) and the rear courtyards are simplified.
- The fins are straight segments following the traced front; the real front is a smooth curve.
- The fountain jets on the granite wall, the flags themselves, the car parks and the smaller planting are not modelled.
- South of the plaza, OSM maps the palm walk and a line along the forest edge as service roads; the model lays a grass verge and the paved walk over them, since on the ground there is only the walk between two rows of palms.
- The East Wing's lower strip along its west side is not separated from the main volume.
