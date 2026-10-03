"""Cut Greater Lusaka out of an OSM extract into 1 km tiles at two detail levels.

Usage:
  python3 tools/osm_tiles.py data/raw/zambia-latest.osm.pbf data/tiles

Writes data/tiles/index.json, data/tiles/full/<tx>_<tz>.json and
data/tiles/far/<tx>_<tz>.json. World frame: metres from the Parliament origin,
x = east, z = south; tile (tx, tz) covers x in [tx*1000, tx*1000+1000) and z
likewise. Coordinates inside a tile are integer decimetres relative to the
tile's corner, to keep files small.

  full: every building, road and land-use area in the tile, plus walls:
        the walls, fences and hedges mapped in OSM, and estimated plot walls
        round houses where none are mapped (see plot_walls).
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
from shapely import STRtree, set_precision
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import linemerge, unary_union

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
    "Michael Sata's Mausoleum", "Levy Mwanawasa's Mausoleum", "Frederick Chiluba's Mausoleum",
    "Mulungushi International Conference Centre", "Kenneth Kaunda International Conference Centre",
    "Manda Hill Mall",
}
HAND_MODELLED_WAYS = {
    283005457,  # Bank of Zambia south block (skybridge partner)
    625074826,  # retail box inside the Society Business Park podium
    1061490855, 1061490873, 1062089194,  # Pyramid Tower podium (Microsoft footprints)
    1061966800,  # Indo Zambia Bank head office (Microsoft footprint)
    614461977, 437561941, 802797488, 802797489,  # East Park Mall, Builders Warehouse, the south strips
    674694885, 674694884, 674694882,  # Acacia Park: Ecobank, Zanaco, FNB
}

ROADS = {  # highway tag -> (kind, width m); kinds 0-1 are "main"
    "motorway": (0, 16), "trunk": (0, 14), "trunk_link": (0, 8), "primary": (0, 12), "primary_link": (0, 8),
    "secondary": (1, 10), "secondary_link": (1, 7), "tertiary": (1, 8), "tertiary_link": (1, 6),
    "residential": (2, 6), "unclassified": (2, 6), "living_street": (2, 5),
    "service": (3, 4), "track": (3, 3),
    "footway": (4, 2), "path": (4, 1.6), "steps": (4, 2), "pedestrian": (4, 5), "cycleway": (4, 2),
}
# Ways whose OSM tagging does not match what is on the ground (checked on
# imagery): way id -> (kind, width m).
ROAD_FIXES = {
    680357976: (3, 10.6),  # MICC: the drive along the palm avenue is ~10.6 m of concrete, not a 4 m lane
    405672365: None,       # MICC: a "service road" through the palm avenue; the model draws the walk there
}
BARRIERS = {"wall": 0, "fence": 1, "hedge": 2}  # wall record kinds; 3 estimated plot wall, 4 gate
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
        self.buildings, self.roads, self.areas, self.barriers = [], [], [], []

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
            # seeded per building, so skipping one never shifts the others' heights
            h = height(tagd, pts, random.Random(a.id))
            self.buildings.append((BTYPES.get(tagd.get("building"), 8), h, pts))
            return
        v = tagd.get("aeroway") or tagd.get("leisure") or tagd.get("landuse") or tagd.get("natural") or tagd.get("amenity")
        if v in AREAS:
            self.areas.append((AREAS[v], pts))

    def way(self, w):
        if w.tags.get("barrier") in BARRIERS:
            coords = [(n.location.lat, n.location.lon) for n in w.nodes if n.location.valid()]
            if len(coords) >= 2 and any(in_bbox(*c) for c in coords):
                self.barriers.append((BARRIERS[w.tags["barrier"]], [xz(*c) for c in coords]))
            return
        hw = w.tags.get("highway")
        aw = w.tags.get("aeroway")
        spec = ROAD_FIXES[w.id] if w.id in ROAD_FIXES else ROADS.get(hw) or AEROWAYS.get(aw)
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

    full = defaultdict(lambda: {"b": [], "r": [], "a": [], "w": []})
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
        for t, run in split_runs(pts):
            emit(full, far, t, kind, width, run)

    for kind, pts in c.barriers:
        for t, run in split_runs(pts):
            full[t]["w"].append([kind] + quant(run, *t))
    for t, kind, pts in plot_walls(c):
        full[t]["w"].append([kind] + quant(pts, *t))

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


def split_runs(pts):
    """Split a line into per-tile runs by segment midpoint; runs share their end points."""
    run, run_tile = [pts[0]], None
    for a, b in zip(pts, pts[1:]):
        t = tile_of((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if run_tile is not None and t != run_tile:
            yield run_tile, run
            run = [a]
        run_tile = t
        run.append(b)
    if run_tile is not None:
        yield run_tile, run


# ---------- estimated plot walls ----------
# On imagery nearly every house in Lusaka stands in a walled plot: a straight
# wall along the street a couple of metres back from the road edge, with a
# gate where the drive comes in, side walls running straight back from the
# street, and a rear wall shared with the plot behind (about 15 x 25 m in
# Chilenje, 40 x 60 m and more in Kabulonga and Rhodes Park). OSM maps only
# some of them, so where none are mapped the plots are estimated, squared to
# the nearest street: the front at the street wall line, the sides halfway to
# the neighbours along the street, the back halfway to the building behind
# (or a depth that grows with the house), then cut back from other streets
# and open spaces. Packed compounds, where walls are rare, are left open.
# Kinds: 3 plot wall, 4 gate.
PAVEMENT = {0: 2.2, 1: 1.8, 2: 0.35, 3: 0.3, 4: 0, 5: 0}  # as drawn by src/city/worker.js
SETBACK = {0: 2.5, 1: 2.0, 2: 1.6}  # verge between the road edge and the wall (service ways are mostly drives)
FRONT_MAX = 45  # houses further than this from a street get no plot
GATE = 3.6


def is_house(t, h, area):
    # houses, and the offices, shops and clinics in house-sized buildings (Rhodes Park, Longacres)
    return t not in (6, 7) and h < 6.5 and 50 <= area < 600


def plot_walls(c, only=None):
    sites, houses = [], []
    for t, h, pts in c.buildings:
        if len(pts) < 3:
            continue
        poly = Polygon(pts).buffer(0)
        if poly.is_empty or poly.area < 50:  # outbuildings share their house's plot
            continue
        sites.append(poly)
        houses.append(is_house(t, h, poly.area))
    ways = [(LineString(pts), w / 2 + PAVEMENT[k] + SETBACK[k]) for k, w, pts in c.roads
            if k in SETBACK and len(pts) >= 2]
    streets = [l.buffer(off, cap_style="flat") for l, off in ways]
    opens = [Polygon(pts).buffer(0) for _, pts in c.areas if len(pts) >= 3]  # parks, pitches, water, paving
    blds = [Polygon(pts).buffer(0.5) for _, _, pts in c.buildings if len(pts) >= 3]
    mapped = [LineString(pts).buffer(3) for _, pts in c.barriers]
    lists = {"site": sites, "way": [l for l, _ in ways], "street": streets, "open": opens, "bld": blds, "mapped": mapped}
    trees = {k: STRtree(v) for k, v in lists.items()}
    near = lambda k, g: [lists[k][i] for i in trees[k].query(g)]

    def plot_of(i):
        house = sites[i]
        cen = house.centroid
        # the nearest street sets the frame: t along it, n away from it towards the house
        best = None
        for j in trees["way"].query(cen.buffer(FRONT_MAX + 10)):
            line, off = ways[j]
            d = line.distance(cen)
            if d - off < FRONT_MAX and (best is None or d - off < best[0]):
                best = (d - off, j)
        if best is None:
            return None
        line, off = ways[best[1]]
        s = line.project(cen)
        p0, p1 = line.interpolate(max(0, s - 2)), line.interpolate(min(line.length, s + 2))
        tx_, tz_ = p1.x - p0.x, p1.y - p0.y
        l = math.hypot(tx_, tz_)
        if l < 1e-6:
            return None
        tx_, tz_ = tx_ / l, tz_ / l
        foot = line.interpolate(s)
        nx, nz = -tz_, tx_
        if (cen.x - foot.x) * nx + (cen.y - foot.y) * nz < 0:
            nx, nz = -nx, -nz
        frame = lambda x, z: ((x - foot.x) * tx_ + (z - foot.y) * tz_, (x - foot.x) * nx + (z - foot.y) * nz)
        rng_ = lambda poly: [frame(x, z) for x, z in poly.exterior.coords]
        hp = rng_(house)
        ht0, ht1 = min(p[0] for p in hp), max(p[0] for p in hp)
        hn0, hn1 = min(p[1] for p in hp), max(p[1] for p in hp)
        front = off
        if hn0 < front:  # the house reaches the street wall line (mapping offsets): no plot
            return None
        width, depth = ht1 - ht0, hn1 - hn0
        t0, t1 = ht0 - max(3, 0.5 * width), ht1 + max(3, 0.5 * width)
        back = hn1 + min(25, max(5, 0.8 * depth))
        others = []
        for j in trees["site"].query(house.buffer(60)):
            if j == i:
                continue
            q = rng_(sites[j])
            others.append((min(p[0] for p in q), max(p[0] for p in q), min(p[1] for p in q), max(p[1] for p in q)))
        for a0, a1, b0, b1 in others:  # neighbours along the street
            if b1 > hn0 - 3 and b0 < hn1 + 3:
                if a1 <= ht0:
                    t0 = max(t0, (a1 + ht0) / 2)
                elif a0 >= ht1:
                    t1 = min(t1, (ht1 + a0) / 2)
        for a0, a1, b0, b1 in others:  # buildings behind
            if a1 > t0 + 1 and a0 < t1 - 1 and b0 >= hn1 - 0.5:
                back = min(back, (hn1 + b0) / 2)
        if t1 - t0 < 8 or back - front < 8:  # too tight: a packed compound
            return None
        world = lambda t, n: (foot.x + t * tx_ + n * nx, foot.y + t * tz_ + n * nz)
        rect = Polygon([world(t0, front), world(t1, front), world(t1, back), world(t0, back)])
        gate = Point(world(min(max((ht0 + ht1) / 2, t0 + GATE), t1 - GATE), front))
        return rect, (gate, tx_, tz_)

    tiles = only or sorted({tile_of(p.centroid.x, p.centroid.y) for p, hs in zip(sites, houses) if hs})
    print(f"plot walls: {len(tiles)} tiles", file=sys.stderr)
    out = []
    for n, (tx, tz) in enumerate(tiles):
        cell_box = box(tx * TILE, tz * TILE, (tx + 1) * TILE, (tz + 1) * TILE)
        ctx = cell_box.buffer(60, join_style="mitre")
        street = unary_union(near("street", ctx))
        opened = unary_union(near("open", ctx))
        plots, gates = [], []
        taken = Polygon()
        # bigger houses claim their plots first; later plots stop at earlier ones, so plots never overlap
        for i in sorted(trees["site"].query(ctx), key=lambda i: -sites[i].area):
            if not houses[i]:
                continue
            r = plot_of(i)
            if not r:
                continue
            rect, gate = r
            plot = rect.difference(street).difference(opened).difference(taken)
            parts = [g for g in getattr(plot, "geoms", [plot]) if g.geom_type == "Polygon" and g.intersects(sites[i].centroid)]
            if not parts:
                continue
            plots.append(parts[0])
            taken = taken.union(parts[0].buffer(0.05))
            if parts[0].exterior.distance(gate[0]) < 0.6:
                gates.append(gate)
        if not plots:
            continue
        # neighbours share their side and rear lines; snapping merges the copies
        lines = unary_union([set_precision(p.exterior, 0.25) for p in plots])
        lines = linemerge(lines) if lines.geom_type == "MultiLineString" else lines
        cut = unary_union(near("bld", ctx) + near("mapped", ctx) + [g.buffer(GATE / 2) for g, _, _ in gates])
        lines = lines.difference(cut).intersection(cell_box)
        for g in getattr(lines, "geoms", [lines]):
            if g.geom_type == "LineString" and g.length > 1:
                out.append(((tx, tz), 3, list(g.simplify(0.2).coords)))
        for g, ux, uz in gates:  # the gate spans the gap, along the street
            if cell_box.contains(g):
                out.append(((tx, tz), 4, [(g.x - ux * GATE / 2, g.y - uz * GATE / 2), (g.x + ux * GATE / 2, g.y + uz * GATE / 2)]))
        if n % 50 == 0:
            print(f"  plot walls {n}/{len(tiles)}", file=sys.stderr)
    return out


def emit(full, far, t, kind, width, run):
    rec = [kind, round(width * 10)] + quant(run, *t)
    full[t]["r"].append(rec)
    if kind <= 1 or kind == 5:
        far[t]["r"].append(rec)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
