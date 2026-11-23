# MOF près de moi

Web app qui liste les **Meilleurs Ouvriers de France (MOF)** autour de l'utilisateur, sur une carte, avec une **géolocalisation fictive** (pour l'instant). Interface en français.

Ce projet a démarré dans une conversation claude.ai (novembre 2026) et a été migré ici. Ce fichier résume tout le contexte de cette conversation.

## État actuel : deux versions

### 1. `app-communes/` — version publiée comme artefact claude.ai
- Lien de l'artefact : https://claude.ai/artifact/LVEHdw8u4jXEPyVwTTnPtp (il reste sur claude.ai)
- `index.html` + `leaflet.css` + `data/<ville>.json` (un fichier par ville, chargé avec fetch)
- Fond de carte **vectoriel dessiné à la main** : contours et noms des communes (IGN), fleuves, mer, lacs, pays voisins (Natural Earth). Pas de rues.
- Pourquoi : la page d'un artefact claude.ai tourne sous une CSP stricte. Les images distantes (donc les tuiles OSM) et les fetch vers d'autres domaines sont bloqués, et les styles ne peuvent venir que de fonts.googleapis.com. Leaflet JS est chargé depuis cdnjs ; son CSS est servi comme fichier propre de l'artefact.
- Position « dans une commune » vérifiée par point-dans-polygone sur les vrais contours (pas de position dans la mer).

### 2. `app-rues/` — version avec les rues (fichier autonome)
- `mof-carte-rues.html` : un seul fichier, données intégrées, à ouvrir dans un navigateur avec internet.
- Fond **OpenStreetMap** (tile.openstreetmap.org) : rues et noms de rue visibles.
- Géocodage inverse : IGN Géoplateforme (`data.geopf.fr/geocodage/reverse`), avec repli sur `api-adresse.data.gouv.fr`. Il affiche l'adresse réelle de la position simulée et le nom de rue réel de chaque artisan (sans numéro).
- Source : `template.html` (contient `/*DATA*/`) + `data_inline.json`. Regénérer avec `python3 scripts/build_rues.py`.
- **Jamais testée avec les vraies tuiles ni le géocodage** : l'environnement de développement d'origine bloquait ces domaines. Toute la logique (épingles, fiches, liste, déplacement) a été testée sans erreur avec Playwright, sur ordinateur et mobile. **À vérifier en premier.**

## Fonctionnalités (communes aux deux versions)
- Choix parmi 7 villes : Lyon, Paris, Bordeaux, Marseille, Strasbourg, Toulouse, Nantes.
- Position simulée : point rouge déplaçable par glisser-déposer, clic sur la carte, ou bouton « Simuler un déplacement ». Cercle de rayon (1/2 à 50 km).
- **Épingles numérotées par distance** (1 = la plus proche) ; les 3 plus proches sont plus grandes ; l'épingle sélectionnée devient rouge.
- **Fiche (popup Leaflet)** au clic sur une épingle : nom, métier, année MOF, distance et temps (à pied ou à vélo), atelier, adresse, description, note, bouton « Itinéraire » (OSM directions) et bouton « Voir dans la liste ».
- Encadré « Les plus proches » en haut à droite de la carte : top 3 + bouton pour cadrer la carte sur les 5 plus proches. Replié sur mobile.
- Cadrage auto sur moi + les 5 plus proches au chargement, au changement de ville et après un déplacement simulé (zoom max 17 dans la version rues, donc niveau rue en ville).
- Liste à droite : recherche, filtres par catégorie (Bouche, Bois & pierre, Métal, Mode & beauté, Art & décor), tri (distance, promotion, nom).
- Un clic sur la carte quand une fiche est ouverte ferme la fiche sans déplacer la position.
- Réglages mémorisés dans localStorage (dans un try/catch).
- Thème clair/sombre. Identité : bandeau tricolore, bleu `#12307a`, rouge `#d0202e`, polices Playfair Display + Work Sans.

## Données
- **Les artisans sont fictifs** (36 par ville), générés par `scripts/build_communes.py` avec seed 7. Ils sont placés en des points réels à l'intérieur de vraies communes, avec une probabilité proportionnelle à population^0,75. Noms de rue et numéros fictifs dans les JSON ; la version rues les remplace par le nom de rue réel au point.
- Ne jamais présenter ces artisans comme réels. La mention « données fictives » doit rester visible.
- Régénérer les données : `bash scripts/fetch_geo.sh` (télécharge ≈ 300 Mo dans `geo-raw/`), puis `pip install shapely` et `python3 scripts/build_communes.py`, puis `python3 scripts/build_rues.py`.
- Sources : contours des communes IGN via github.com/gregoiredavid/france-geojson ; population et codes postaux via le paquet npm `@etalab/decoupage-administratif` ; Natural Earth (github.com/nvkelso/natural-earth-vector).

## Limites connues
- Paris, Lyon et Marseille n'ont pas leurs arrondissements (une seule commune chacune).
- Version communes : coins de la zone (au-delà d'environ 55 km) parfois incomplets, car certains départements limitrophes manquent.
- Les fichiers HTML locaux s'ouvrent mal sur mobile.

## Prochaines étapes proposées
1. Vérifier `app-rues/mof-carte-rues.html` dans un vrai navigateur : tuiles OSM et adresses.
2. Héberger l'app (GitHub Pages par exemple) pour avoir un lien utilisable sur téléphone.
3. Une fois l'app hébergée : remplacer ou compléter la position fictive par la vraie (`navigator.geolocation`, qui exige HTTPS).
4. Plus tard : une vraie source de données MOF à la place des artisans fictifs (vérifier licence et droits).

## Conventions
- Interface et textes en français.
- Pages statiques, sans framework ; Leaflet 1.9.4.
- Respecter la politique d'usage des tuiles OSM (attribution visible, pas de téléchargement massif).
