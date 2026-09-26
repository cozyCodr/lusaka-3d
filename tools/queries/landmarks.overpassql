[out:json][timeout:180];
(
  nwr["name"]["tourism"~"hotel|museum|attraction|gallery|zoo|theme_park"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["shop"="mall"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["office"="government"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["government"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["amenity"~"townhall|courthouse|university|college|hospital|marketplace|embassy|bus_station|conference_centre|theatre|library|place_of_worship"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["diplomatic"="embassy"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["leisure"~"stadium|golf_course|park"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["historic"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["aeroway"~"aerodrome|terminal"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["building"]["building:levels"~"^([6-9]|[1-9][0-9])$"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["office"]["wikidata"](-15.55,28.18,-15.28,28.50);
  nwr["name"]["wikidata"]["building"](-15.55,28.18,-15.28,28.50);
);
out center tags;
