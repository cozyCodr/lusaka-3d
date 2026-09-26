"""Convert raw Overpass JSON into the compact city file the app loads.

Usage: python3 tools/osm_to_json.py data/raw/core.json data/raw/rels.json > data/core.json

Coordinates become local metres around the Parliament origin: x = east,
z = south (three.js convention, north is -z), rounded to 0.1 m.
Data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import random
import sys

LAT0, LON0 = -15.3922718, 28.3090371
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110540

# Buildings modelled by hand; skip their OSM footprint.
HAND_MODELLED = {"National Assembly", "Findeco House", "Lusaka National Museum", "Government Complex", "Cathedral of the Holy Cross", "Bank of Zambia", "National Heroes Stadium", "Hilton Garden Inn Lusaka Society Business Park"}
# Unnamed OSM buildings that are modelled by hand, by way id.
HAND_MODELLED_IDS = {
    283005457,  # Bank of Zambia south block (skybridge partner)
    625074826,  # retail box inside the Society Business Park podium
}

ROADS = {  # highway tag -> (kind index, width m)
    "primary": (0, 12), "primary_link": (0, 8), "trunk": (0, 14),
    "secondary": (1, 10), "secondary_link": (1, 7), "tertiary": (1, 8),
    "residential": (2, 6), "unclassified": (2, 6), "living_street": (2, 5),
    "service": (3, 4), "track": (3, 3),
    "footway": (4, 2), "path": (4, 1.6), "steps": (4, 2), "pedestrian": (4, 5),
}

AREAS = {  # tag value -> kind index: 0 grass, 1 pitch, 2 water, 3 wood, 4 paved
    "grass": 0, "park": 0, "garden": 0, "recreation_ground": 0, "golf_course": 0, "farmland": 0,
    "cemetery": 0, "pitch": 1, "stadium": 1, "water": 2, "reservoir": 2, "basin": 2,
    "wood": 3, "forest": 3, "scrub": 3, "retail": 4, "commercial": 4,
}

# building tag -> type index used for colour and height rules in the app
BTYPES = {"house": 0, "detached": 0, "residential": 0, "semidetached_house": 0, "bungalow": 0,
          "apartments": 1, "retail": 2, "commercial": 2, "supermarket": 2, "office": 3,
          "school": 4, "university": 4, "hospital": 4, "church": 5, "mosque": 5,
          "industrial": 6, "warehouse": 6, "roof": 7}


def xz(p):
    return round((p["lon"] - LON0) * KX, 1), round(-(p["lat"] - LAT0) * KZ, 1)


def ring(geom):
    pts = [xz(p) for p in geom]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def area(pts):
    return abs(sum(x0 * z1 - x1 * z0 for (x0, z0), (x1, z1) in zip(pts, pts[1:] + pts[:1]))) / 2


def height(tags, pts, rnd):
    if "height" in tags:
        try:
            return round(float(tags["height"].split()[0]), 1)
        except ValueError:
            pass
    if "building:levels" in tags:
        try:
            return round(float(tags["building:levels"]) * 3.2 + 0.6, 1)
        except ValueError:
            pass
    t = BTYPES.get(tags.get("building"), -1)
    a = area(pts)
    base = {0: 3.6, 1: 9.8, 2: 5.0, 3: 12.0, 4: 6.5, 5: 9.0, 6: 7.0, 7: 4.0}.get(t)
    if base is None:
        base = 3.6 if a < 150 else 5.5 if a < 600 else 8.0
    return round(base * (0.85 + rnd.random() * 0.3), 1)


def flat(pts):
    return [c for p in pts for c in p]


def main(core_path, rels_path):
    rnd = random.Random(42)
    core = json.load(open(core_path))["elements"]
    rels = json.load(open(rels_path))["elements"]
    buildings, roads, areas = [], [], []

    def add_building(tags, pts):
        if len(pts) < 3 or area(pts) < 6:
            return
        buildings.append([BTYPES.get(tags.get("building"), 8), height(tags, pts, rnd)] + flat(pts))

    for e in core:
        tags = e.get("tags", {})
        if e["type"] != "way" or "geometry" not in e:
            continue
        pts = ring(e["geometry"])
        if "building" in tags:
            if tags.get("name") not in HAND_MODELLED and e["id"] not in HAND_MODELLED_IDS:
                add_building(tags, pts)
        elif "highway" in tags and tags["highway"] in ROADS:
            kind, width = ROADS[tags["highway"]]
            line = [xz(p) for p in e["geometry"]]
            roads.append([kind, width] + flat(line))
        else:
            v = tags.get("leisure") or tags.get("landuse") or tags.get("natural")
            if v in AREAS and len(pts) >= 3:
                areas.append([AREAS[v]] + flat(pts))

    for e in rels:
        tags = e.get("tags", {})
        if tags.get("name") in HAND_MODELLED:
            continue
        for m in e.get("members", []):
            if m.get("role") == "outer" and "geometry" in m:
                add_building(tags, ring(m["geometry"]))

    json.dump({
        "origin": {"lat": LAT0, "lon": LON0},
        "attribution": "(c) OpenStreetMap contributors, ODbL",
        "buildings": buildings, "roads": roads, "areas": areas,
    }, sys.stdout, separators=(",", ":"))
    print(f"buildings {len(buildings)}, roads {len(roads)}, areas {len(areas)}", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
