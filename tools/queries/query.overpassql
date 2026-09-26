[out:json][timeout:120];
(
  way["building"](-15.4450,28.2620,-15.3600,28.3300);
  relation["building"](-15.4450,28.2620,-15.3600,28.3300);
  way["highway"](-15.4450,28.2620,-15.3600,28.3300);
  way["landuse"](-15.4450,28.2620,-15.3600,28.3300);
  way["leisure"~"park|pitch|golf_course|stadium|garden"](-15.4450,28.2620,-15.3600,28.3300);
  way["natural"~"water|wood|scrub"](-15.4450,28.2620,-15.3600,28.3300);
  way["railway"="rail"](-15.4450,28.2620,-15.3600,28.3300);
);
out geom tags;
