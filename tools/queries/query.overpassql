[out:json][timeout:120];
(
  way["building"](-15.4058,28.2760,-15.3788,28.3230);
  relation["building"](-15.4058,28.2760,-15.3788,28.3230);
  way["highway"](-15.4058,28.2760,-15.3788,28.3230);
  way["landuse"](-15.4058,28.2760,-15.3788,28.3230);
  way["leisure"~"park|pitch|golf_course|stadium|garden"](-15.4058,28.2760,-15.3788,28.3230);
  way["natural"~"water|wood|scrub"](-15.4058,28.2760,-15.3788,28.3230);
  way["railway"="rail"](-15.4058,28.2760,-15.3788,28.3230);
);
out geom tags;
