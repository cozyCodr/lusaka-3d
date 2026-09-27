# Contributing to Lusaka 3D

Thanks for helping rebuild Lusaka. You do not need to write code to make a
real difference — good photos of a building are often the most valuable
contribution of all.

## Ways to help

### 1. Send reference photos (no code needed)

Every landmark is modelled from photographs, and the parts nobody has
photographed are guesses (they show red in *Layers → Confidence view*).
Photos from new angles fix that.

- [Open an issue](https://github.com/cozyCodr/lusaka-3d/issues/new?template=landmark.md)
  with the building's name and your photos attached.
- **Most useful:** the sides and back, the roofline, the corners, anything
  seen from above, and one straight-on photo of each face.
- **Only share photos you took yourself** or that you have the right to share.
  Say where each photo came from. We use photos as reference only; they are
  never embedded in the model or committed to the repository.
- Do not photograph security details (guard posts, cameras, restricted areas).
  We model what the public can see from the street.

### 2. Suggest a landmark or report a problem

- Something missing, in the wrong place, or wrong? Open an issue with a
  screenshot (the link in your address bar, e.g. `#state-house`, helps us
  find the view).
- The list of places and their priority lives in [docs/LANDMARKS.md](docs/LANDMARKS.md).

### 3. Build a landmark or improve the app

Check the [development planner](docs/DEVELOPMENT_PLANNER.md) for what is
next, and comment on an issue before starting something big so two people do
not build the same building.

## Getting set up

```bash
git clone https://github.com/cozyCodr/lusaka-3d.git
cd lusaka-3d
python3 tools/serve.py          # http://localhost:5199
```

There is no build step for the app: plain ES modules, three.js from a CDN.
If you change Tailwind class names in `index.html` or `src/`, rebuild the CSS
and commit it:

```bash
npm install && npm run build:css
```

[AGENTS.md](AGENTS.md) has the project conventions (world frame, file
layout, rules); read it before changing code — it applies to people and AI
coding agents alike.

## Adding a landmark

1. **Find it** in `data/landmarks.json` for its coordinates and OSM id.
2. **Gather references:** its OpenStreetMap outline (always preferred over
   estimates), satellite imagery for the roof and extent, and photos.
3. **Write the notes** in `docs/landmarks/<slug>.md`: sources (with licences),
   a measurements table with a confidence for each part, and known gaps.
   Copy the shape of an existing file such as
   [docs/landmarks/bank-of-zambia.md](docs/landmarks/bank-of-zambia.md).
4. **Model it** in `src/landmarks/<slug>.js`, reusing the helpers in
   `src/landmarks/lib.js`. Tag every part `high`, `med` or `low` confidence
   with `tag()`. Textures are procedural — never embed a photograph.
5. **Register it** in `src/landmarks/index.js` (name, builder, camera view)
   and add its OSM name or way id to `HAND_MODELLED` in `tools/osm_tiles.py`
   so the plain OSM box is not drawn underneath it.
6. **Check it** in the browser: no console errors, looks right from its
   reference angles, nothing sits on an OSM road, and it works in Walk mode.
7. **Add a screenshot** to `docs/screenshots/<slug>.jpg`: run
   `python3 tools/serve.py 5201 --capture`, open http://localhost:5201, and in
   the browser console run
   `await lusaka.capture('<slug>', lusaka.landmarks.find(l => l.name === '<Name>').view)`.
8. **Update the docs:** its row in `docs/LANDMARKS.md` and the README gallery.

## Pull requests

- One landmark or one change per pull request.
- Describe what changed and what it was built from; include a screenshot for
  anything visual.
- Commit messages describe the change and nothing else.
- Keep the OpenStreetMap credit visible in the app.

## Licensing of contributions

The project is licensed under [PolyForm Noncommercial 1.0.0](LICENSE.md),
and the maintainer may grant separate commercial licences on request. So
that both remain possible, **by submitting a contribution you agree that:**

1. you wrote it, or otherwise have the right to submit it;
2. it may be distributed under the project's licence; and
3. the maintainer may also license it to others, including commercially.

Add this line to your pull request description to confirm:

> I agree to the licensing terms in CONTRIBUTING.md.

Changes to OpenStreetMap-derived data in `data/tiles/` stay under the
[ODbL](data/tiles/README.md). Better still, fix map errors upstream on
[openstreetmap.org](https://www.openstreetmap.org) so everyone benefits;
the next tile rebuild will pick them up.

## Be kind

Be respectful and constructive with everyone. Critique the model, not the
person. The maintainer may remove content or contributors that make the
project unwelcoming.
