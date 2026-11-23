# MOF près de moi

Carte des Meilleurs Ouvriers de France autour d'une position simulée. Les artisans sont fictifs.

- `app/` : l'app principale. Géolocalisation ou recherche d'adresse partout en France, fond Plan IGN. À servir en https (la géolocalisation l'exige) ou en local avec `python3 -m http.server`, puis http://localhost:8000/app/.
- `app-rues/mof-carte-rues.html` : ouvrir directement dans un navigateur (fond OpenStreetMap avec les rues).
- `app-communes/` : servir le dossier, par exemple avec `python3 -m http.server`, puis ouvrir http://localhost:8000.
- Le contexte complet du projet est dans `CLAUDE.md`.
