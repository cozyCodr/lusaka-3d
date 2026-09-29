# State House — reference notes

Independence Avenue, east of the CBD. Model: `src/landmarks/state-house.js`
(house, grounds, gate). Built from publicly published photos of the
exterior only; no interior or security layout is modelled.

## Sources

- **Founder's reference photos (2026-09-27)** — 13 images. Used: the entrance
  front with its curved portico (two views), the garden front with the loggia
  and red steps (three views, one duplicated), views across the lawn, the
  gates on Independence Avenue (current and a historic photo). **Set aside:**
  one image watermarked "Meta AI" (AI-generated, not a photo), and a long
  colonnaded building with statues flanking the steps that could not be
  confirmed as State House. Two illustrations (line drawing, flat cartoon)
  were used only to confirm the symmetric stepped massing.
- **OpenStreetMap** — relation 11672459 "State House": a 122 m east-west
  outline, straight north side, stepped south side with a projection for the
  portico; the drive (ways 676259399/400/411) from Independence Avenue to a
  turning circle in front of it; a tennis court in the grounds.
- **Esri World Imagery, zoom 17** — the grounds: woodland between the house
  and the avenue, a ~450 m open lawn to the north, the eastern boundary line.
  No grounds boundary exists in OSM (Overpass was also unavailable), so the
  boundary is read from imagery.

## Measurements

| Element | Value | Confidence |
|---|---|---|
| House outline | OSM; wings 8.6 m, taller centre 9.8 m (two storeys) | footprint high, heights medium |
| Walls | red brick, white plinth, string course and cornice, white-framed sash windows | high |
| North boundary wall | plain red face brick like the house, ~2.4 m with piers every 3 m, along Los Angeles Boulevard opposite the golf course, from the north-west corner to the workers' compound (OSM way 288543270, checked on imagery) | high line (OSM, imagery), medium height (founder) |
| Parapet and roof | white balustrade; low red hipped roofs behind; brick chimneys | medium |
| Entrance portico | semicircular, radius 6.8 m, four white columns, curved entablature and balustrade, steps, door with fanlight; on the OSM projection facing the turning circle | high form, medium size |
| Garden loggia | four columns across two storeys, recessed brick, red steps to the lawn | high form, medium size |
| Gates | four brick piers with white caps and urns, black railings, on the avenue where the drive meets it | high |
| Perimeter | railings with brick piers along the avenue | medium |
| Grounds | ~500 × 800 m from imagery; lawn polygon north; ~520 woodland trees placed clear of the house and drive; palms by both fronts | low (tree positions), medium (extent) |

## Known gaps

- Window rhythm is a repeating bay, not the real arrangement; the arched
  French windows of the garden front are not modelled.
- The east and west boundaries of the grounds are not walled in the model yet.
- Outbuildings in the grounds are plain OSM boxes.
