"""Cut Greater Lusaka out of an OSM extract into 1 km tiles at two detail levels.

Usage:
  python3 tools/osm_tiles.py data/raw/zambia-latest.osm.pbf data/tiles

Writes data/tiles/index.json, data/tiles/full/<tx>_<tz>.json and
data/tiles/far/<tx>_<tz>.json. World frame: metres from the Parliament origin,
x = east, z = south; tile (tx, tz) covers x in [tx*1000, tx*1000+1000) and z
likewise. Coordinates inside a tile are integer decimetres relative to the
tile's corner, to keep files small.

  full: every building, road and land-use area in the tile.
  far:  buildings >= 250 m2 or >= 12 m tall, main roads, large areas.

Data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import os
import random
import sys
from collections import defaultdict

import osmium

LAT0, LON0 = -15.3922718, 28.3090371
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110540
BBOX = (-15.56, 28.18, -15.28, 28.52)  # S, W, N, E: Greater Lusaka incl. the airport
TILE = 1000

# Buildings modelled by hand in src/landmarks; their OSM footprints are skipped.
HAND_MODELLED = {
    "National Assembly", "Findeco House", "Lusaka National Museum", "Government Complex",
    "Cathedral of the Holy Cross", "Bank of Zambia", "National Heroes Stadium",
    "Hilton Garden Inn Lusaka Society Business Park", "Cabinet Office", "State House",
}
HAND_MODELLED_WAYS = {
    283005457,  # Bank of Zambia south block (skybridge partner)
    625074826,  # retail box inside the Society Business Park podium
}

ROADS = {  # highway tag -> (kind, width m); kinds 0-1 are "main"
    "motorway": (0, 16), "trunk": (0, 14), "trunk_link": (0, 8), "primary": (0, 12), "primary_link": (0, 8),
    "secondary": (1, 10), "secondary_link": (1, 7), "tertiary": (1, 8), "tertiary_link": (1, 6),
    "residential": (2, 6), "unclassified": (2, 6), "living_street": (2, 5),
    "service": (3, 4), "track": (3, 3),
    "footway": (4, 2), "path": (4, 1.6), "steps": (4, 2), "pedestrian": (4, 5), "cycleway": (4, 2),
}
AEROWAYS = {"runway": (5, 45), "taxiway": (5, 20), "taxilane": (5, 12)}  # drawn like roads
AREAS = {  # tag value -> kind: 0 grass, 1 pitch, 2 water, 3 wood, 4 paved, 5 runway
    "grass": 0, "park": 0, "garden": 0, "recreation_ground": 0, "golf_course": 0, "farmland": 0,
    "meadow": 0, "village_green": 0, "cemetery": 0, "orchard": 0, "nature_reserve": 3,
    "pitch": 1, "stadium": 1, "track": 1,
    "water": 2, "reservoir": 2, "basin": 2, "wetland": 2,
    "wood": 3, "forest": 3, "scrub": 3,
    "retail": 4, "commercial": 4, "parking": 4, "apron": 5, "runway": 5, "taxiway": 5,
}
BTYPES = {"house": 0, "detached": 0, "residential": 0, "semidetached_house": 0, "bungalow": 0, "terrace": 0,
          "apartments": 1, "retail": 2, "commercial": 2, "supermarket": 2, "office": 3,
          "school": 4, "university": 4, "hospital": 4, "college": 4, "church": 5, "mosque": 5, "cathedral": 5,
          "industrial": 6, "warehouse": 6, "hangar": 6, "roof": 7}
BASE_H = {0: 3.6, 1: 9.8, 2: 5.0, 3: 12.0, 4: 6.5, 5: 9.0, 6: 7.0, 7: 4.0}


def xz(lat, lon):
    return (lon - LON0) * KX, -(lat - LAT0) * KZ


def in_bbox(lat, lon):
    s, w, n, e = BBOX
    return s <= lat <= n and w <= lon <= e


def ring_area(pts):
    return abs(sum(x0 * z1 - x1 * z0 for (x0, z0), (x1, z1) in zip(pts, pts[1:] + pts[:1]))) / 2


def height(tags, pts, rnd):
    for key, scale in (("height", 1), ("building:levels", 3.2)):
        v = tags.get(key)
        if v:
            try:
                return float(v.split()[0].replace(",", ".")) * scale + (0.6 if scale != 1 else 0)
            except ValueError:
                pass
    t = BTYPES.get(tags.get("building"), -1)
    base = BASE_H.get(t)
    if base is None:
        a = ring_area(pts)
        base = 3.6 if a < 150 else 5.5 if a < 600 else 8.0
    return base * (0.85 + rnd.random() * 0.3)


class Collector(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.rnd = random.Random(42)
        self.buildings, self.roads, self.areas = [], [], []

    def area(self, a):
        tags = a.tags
        if "building" not in tags and not any(k in tags for k in ("landuse", "leisure", "natural", "aeroway", "amenity")):
            return
        try:
            outer = next(iter(a.outer_rings()))
        except StopIteration:
            return
        coords = [(n.location.lat, n.location.lon) for n in outer if n.location.valid()]
        if len(coords) < 4 or not in_bbox(*coords[0]):
            return
        pts = [xz(lat, lon) for lat, lon in coords[:-1]]
        tagd = {t.k: t.v for t in tags}
        if "building" in tagd:
            if tagd.get("name") in HAND_MODELLED or (a.from_way() and a.orig_id() in HAND_MODELLED_WAYS):
                return
            if ring_area(pts) < 6:
                return
            h = height(tagd, pts, self.rnd)
            self.buildings.append((BTYPES.get(tagd.get("building"), 8), h, pts))
            return
        v = tagd.get("aeroway") or tagd.get("leisure") or tagd.get("landuse") or tagd.get("natural") or tagd.get("amenity")
        if v in AREAS:
            self.areas.append((AREAS[v], pts))

    def way(self, w):
        hw = w.tags.get("highway")
        aw = w.tags.get("aeroway")
        spec = ROADS.get(hw) or AEROWAYS.get(aw)
        if not spec or w.is_closed() and w.tags.get("area") == "yes":
            return
        coords = [(n.location.lat, n.location.lon) for n in w.nodes if n.location.valid()]
        if len(coords) < 2 or not any(in_bbox(*c) for c in coords):
            return
        kind, width = spec
        self.roads.append((kind, width, [xz(*c) for c in coords]))


def tile_of(x, z):
    return math.floor(x / TILE), math.floor(z / TILE)


def quant(pts, tx, tz):
    ox, oz = tx * TILE, tz * TILE
    out = []
    for x, z in pts:
        out += [round((x - ox) * 10), round((z - oz) * 10)]
    return out


def main(src, dst):
    c = Collector()
    c.apply_file(src, locations=True, idx="flex_mem")
    print(f"buildings {len(c.buildings)}, roads {len(c.roads)}, areas {len(c.areas)}", file=sys.stderr)

    full = defaultdict(lambda: {"b": [], "r": [], "a": []})
    far = defaultdict(lambda: {"b": [], "r": [], "a": []})

    for t, h, pts in c.buildings:
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        tx, tz = tile_of(cx, cz)
        rec = [t, round(h * 10)] + quant(pts, tx, tz)
        full[(tx, tz)]["b"].append(rec)
        if ring_area(pts) >= 250 or h >= 12:
            far[(tx, tz)]["b"].append(rec)

    for kind, width, pts in c.roads:
        # Split into per-tile runs by segment midpoint; runs share their end points.
        run, run_tile = [pts[0]], None
        for a, b in zip(pts, pts[1:]):
            t = tile_of((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if run_tile is not None and t != run_tile:
                emit(full, far, run_tile, kind, width, run)
                run = [a]
            run_tile = t
            run.append(b)
        if run_tile is not None:
            emit(full, far, run_tile, kind, width, run)

    for kind, pts in c.areas:
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        tx, tz = tile_of(cx, cz)
        rec = [kind] + quant(pts, tx, tz)
        full[(tx, tz)]["a"].append(rec)
        if ring_area(pts) >= 5000:
            far[(tx, tz)]["a"].append(rec)

    for t in full:  # every tile has a far file, possibly empty
        far[t]
    for level, tiles in (("full", full), ("far", far)):
        os.makedirs(os.path.join(dst, level), exist_ok=True)
        for (tx, tz), d in tiles.items():
            with open(os.path.join(dst, level, f"{tx}_{tz}.json"), "w") as fh:
                json.dump(d, fh, separators=(",", ":"))

    s, w, n, e = BBOX
    x0, z1 = xz(s, w)
    x1, z0 = xz(n, e)
    index = {
        "tile": TILE,
        "attribution": "(c) OpenStreetMap contributors, ODbL",
        "bounds": {"minX": round(x0), "maxX": round(x1), "minZ": round(z0), "maxZ": round(z1)},
        "tiles": {f"{tx}_{tz}": [len(d["b"]), len(d["r"])] for (tx, tz), d in full.items()},
    }
    with open(os.path.join(dst, "index.json"), "w") as fh:
        json.dump(index, fh, separators=(",", ":"))
    print(f"{len(full)} tiles", file=sys.stderr)


def emit(full, far, t, kind, width, run):
    rec = [kind, round(width * 10)] + quant(run, *t)
    full[t]["r"].append(rec)
    if kind <= 1 or kind == 5:
        far[t]["r"].append(rec)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
