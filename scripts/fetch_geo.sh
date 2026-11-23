#!/usr/bin/env bash
# Télécharge les données géographiques brutes dans geo-raw/ (≈ 300 Mo).
# Nécessaire seulement pour régénérer app-communes/data/*.json avec build_communes.py.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p geo-raw && cd geo-raw

# Contours des communes par département (IGN, via gregoiredavid/france-geojson)
B=https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements
for d in 01-ain 38-isere 69-rhone 42-loire 75-paris 77-seine-et-marne 78-yvelines 91-essonne \
         92-hauts-de-seine 93-seine-saint-denis 94-val-de-marne 95-val-d-oise 60-oise 33-gironde \
         17-charente-maritime 24-dordogne 47-lot-et-garonne 40-landes 13-bouches-du-rhone 83-var \
         84-vaucluse 30-gard 67-bas-rhin 68-haut-rhin 57-moselle 88-vosges 31-haute-garonne 81-tarn \
         82-tarn-et-garonne 32-gers 09-ariege 11-aude 44-loire-atlantique 49-maine-et-loire 85-vendee \
         35-ille-et-vilaine 56-morbihan; do
  curl -sfL -o "c-$d.json" "$B/$d/communes-$d.geojson" || echo "échec $d"
done

# Fleuves, mer, lacs, pays voisins (Natural Earth)
N=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_10m_rivers_lake_centerlines ne_10m_rivers_europe ne_10m_ocean ne_10m_lakes \
         ne_10m_lakes_europe ne_10m_admin_0_countries; do
  curl -sfL -o "$f.json" "$N/$f.geojson" || echo "échec $f"
done

# Population et codes postaux des communes (Etalab)
npm pack @etalab/decoupage-administratif --silent >/dev/null
mkdir -p da && tar xzf etalab-decoupage-administratif-*.tgz -C da
echo "OK : données dans geo-raw/"
