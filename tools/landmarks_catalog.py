"""Build the landmark candidate catalogue from an Overpass export.

Usage: python3 tools/landmarks_catalog.py data/raw/landmarks.json > data/landmarks.json

Each entry: name, category, lat/lon, world x/z (metres, x = east, z = south,
same origin as data/core.json), whether it falls inside the current city
box, and its OSM id / Wikidata id. Ordinary churches (533 of them) are left
out; the procedural church generator covers those.
Data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import sys

LAT0, LON0 = -15.3922718, 28.3090371
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110540
CORE_BOX = (-15.4058, 28.2760, -15.3788, 28.3230)  # S, W, N, E of data/core.json

CATEGORY_KEYS = [
    ("government", "parliament", "government"), ("government", None, "government"),
    ("office", "government", "government"), ("office", "diplomatic", "embassy"),
    ("diplomatic", None, "embassy"), ("tourism", "hotel", "hotel"), ("shop", "mall", "mall"),
    ("amenity", "marketplace", "market"), ("amenity", "hospital", "hospital"),
    ("amenity", "university", "education"), ("amenity", "college", "education"),
    ("amenity", "courthouse", "government"), ("amenity", "townhall", "government"),
    ("amenity", "conference_centre", "venue"), ("amenity", "theatre", "venue"),
    ("amenity", "library", "culture"), ("amenity", "bus_station", "transport"),
    ("amenity", "place_of_worship", "worship"), ("leisure", "stadium", "venue"),
    ("leisure", "golf_course", "leisure"), ("leisure", "park", "monument"),
    ("historic", None, "monument"), ("tourism", "museum", "culture"),
    ("tourism", None, "attraction"), ("aeroway", None, "transport"),
    ("office", None, "company"), ("building", None, "building"),
]
JUNK = {"clinic/hospital/pharmacy"}


def category(t):
    for key, value, cat in CATEGORY_KEYS:
        if key in t and (value is None or t[key] == value):
            return None if t[key] in JUNK else cat
    return None


def main(path):
    out, seen = [], set()
    s, w, n, e = CORE_BOX
    for el in json.load(open(path))["elements"]:
        t = el.get("tags", {})
        name = t.get("name", "").strip()
        cat = category(t)
        if not name or not cat:
            continue
        if cat == "worship" and "wikidata" not in t and "cathedral" not in name.lower():
            continue
        c = el.get("center") or {"lat": el.get("lat"), "lon": el.get("lon")}
        if c["lat"] is None or (name, cat) in seen:
            continue
        seen.add((name, cat))
        x = (c["lon"] - LON0) * KX
        z = -(c["lat"] - LAT0) * KZ
        out.append({
            "name": name, "category": cat,
            "lat": round(c["lat"], 6), "lon": round(c["lon"], 6),
            "x": round(x), "z": round(z), "km": round(math.hypot(x, z) / 1000, 2),
            "inCore": s <= c["lat"] <= n and w <= c["lon"] <= e,
            "osm": f"{el['type']}/{el['id']}", "wikidata": t.get("wikidata"),
        })
    out.sort(key=lambda r: (r["category"], r["km"]))
    json.dump({"attribution": "(c) OpenStreetMap contributors, ODbL", "places": out}, sys.stdout, indent=1)
    print(f"{len(out)} places", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
