import json, math, random, glob, os
import shapely
from shapely.geometry import shape, mapping, Point, box
from shapely.ops import unary_union

import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = str(ROOT / "app-communes")
os.makedirs(OUT, exist_ok=True)
G = str(ROOT / "geo-raw")

CITIES = [
    ("lyon", "Lyon", 45.7578, 4.8320),
    ("paris", "Paris", 48.8566, 2.3522),
    ("bordeaux", "Bordeaux", 44.8378, -0.5792),
    ("marseille", "Marseille", 43.2965, 5.3698),
    ("strasbourg", "Strasbourg", 48.5734, 7.7521),
    ("toulouse", "Toulouse", 43.6047, 1.4442),
    ("nantes", "Nantes", 47.2184, -1.5536),
]
CLIP_KM = 62

POP = {x["code"]: x for x in json.load(open(f"{G}/da/package/data/communes.json")) if x.get("type") == "commune-actuelle"}
communes = []
for f in sorted(glob.glob(f"{G}/c-*.json")):
    for ft in json.load(open(f))["features"]:
        communes.append((ft["properties"]["nom"], ft["properties"]["code"], shape(ft["geometry"])))
print("communes", len(communes))

def load(name):
    return [shape(f["geometry"]) for f in json.load(open(f"{G}/{name}.json"))["features"] if f["geometry"]]

rivers = load("ne_10m_rivers_europe") + load("ne_10m_rivers_lake_centerlines")
lakes = load("ne_10m_lakes") + load("ne_10m_lakes_europe")
ocean = load("ne_10m_ocean")
countries = [(f["properties"].get("NAME_FR") or f["properties"]["NAME"], shape(f["geometry"]))
             for f in json.load(open(f"{G}/ne_10m_admin_0_countries.json"))["features"]
             if f["properties"]["ADM0_A3"] != "FRA"]

def rnd(geom, n=4):
    return shapely.set_precision(geom, 10 ** -n)

def fc(feats):
    return {"type": "FeatureCollection", "features": feats}

def feat(geom, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(geom)}

# ---------- people data ----------
CATS = {"Bouche": ["Pâtissier-confiseur", "Boulanger", "Chocolatier", "Cuisinier", "Fromager", "Boucher-charcutier", "Glacier"],
        "Bois & pierre": ["Ébéniste", "Charpentier", "Tailleur de pierre", "Menuisier"],
        "Métal": ["Ferronnier d'art", "Coutelier", "Orfèvre", "Horloger"],
        "Mode & beauté": ["Coiffeur", "Tailleur", "Bottier", "Maroquinier", "Brodeur"],
        "Art & décor": ["Verrier", "Céramiste", "Doreur", "Relieur", "Tapissier"]}
JOBS = [(c, j) for c, js in CATS.items() for j in js]
FIRST = ["Camille", "Julien", "Élodie", "Mathieu", "Claire", "Antoine", "Sophie", "Nicolas", "Léa", "Thomas", "Inès", "Hugo",
         "Manon", "Pierre", "Chloé", "Yanis", "Margaux", "Bastien", "Amandine", "Rémi", "Sarah", "Victor", "Laure", "Karim"]
LAST = ["Morel", "Lefèvre", "Garnier", "Rousseau", "Chevalier", "Faure", "Mercier", "Blanchard", "Girard", "Bonnet", "Lambert",
        "Fontaine", "Roux", "Perrin", "Masson", "Barbier", "Benali", "Dupuis", "Marchand", "Vidal", "Leclerc", "Aubry", "Colin", "Renaud"]
STREETS = ["rue des Artisans", "quai Saint-Antoine", "rue du Commerce", "place du Marché", "rue Victor-Hugo",
           "avenue de la République", "rue des Tanneurs", "rue de la Forge", "passage des Arts", "rue Pasteur",
           "Grande Rue", "rue de l'Église", "rue Jean-Jaurès", "place de la Mairie"]
YEARS = [2000, 2004, 2007, 2011, 2015, 2019, 2023]
random.seed(7)

index = []
for slug, name, lat, lng in CITIES:
    kx = 111 * math.cos(math.radians(lat))
    dlat, dlng = CLIP_KM / 111, CLIP_KM / kx
    clip = box(lng - dlng, lat - dlat, lng + dlng, lat + dlat)
    sel = [(n, c, g.intersection(clip)) for n, c, g in communes if g.intersects(clip)]
    sel = [(n, c, g) for n, c, g in sel if not g.is_empty and g.area > 0]
    geoms = shapely.coverage_simplify([g for _, _, g in sel], 0.0012)
    cfeats = []
    clist = []
    for (n, c, g0), g in zip(sel, geoms):
        g = rnd(g)
        if g.is_empty:
            continue
        p = g0.representative_point()
        area = g0.area * 111 * kx
        cfeats.append(feat(g, {"i": len(clist)}))
        info = POP.get(c, {})
        cps = info.get("codesPostaux") or [c[:2] + "000"]
        clist.append({"n": n, "d": c[:2], "lat": round(p.y, 5), "lng": round(p.x, 5), "p": info.get("population", 300), "cp": cps[0]})
        clist[-1]["_g"] = g0

    def clipped(list_, tol):
        out = []
        for g in list_:
            if g.intersects(clip):
                x = g.intersection(clip).simplify(tol)
                if not x.is_empty:
                    out.append(rnd(x))
        return out
    riv = clipped(rivers, 0.001)
    wat = clipped(ocean + lakes, 0.0015)
    frn = []
    for cn, g in countries:
        if g.intersects(clip):
            x = rnd(g.intersection(clip).simplify(0.0015))
            if not x.is_empty and x.area > 0:
                frn.append(feat(x, {"n": cn}))

    # artisans: sampled inside real communes, denser toward the centre
    people = []
    near = [cm for cm in clist if math.hypot((cm["lng"] - lng) * kx, (cm["lat"] - lat) * 111) < 46]
    weights = [cm["p"] ** 0.75 for cm in near]
    while len(people) < 36:
        cm = random.choices(near, weights)[0]
        g = cm["_g"]
        x0, y0, x1, y1 = g.bounds
        for _ in range(200):
            pt = Point(random.uniform(x0, x1), random.uniform(y0, y1))
            if g.contains(pt):
                break
        else:
            continue
        cat, job = random.choice(JOBS)
        f, l = random.choice(FIRST), random.choice(LAST)
        people.append({"name": f"{f} {l}", "ini": f[0] + l[0], "job": job, "cat": cat, "year": random.choice(YEARS),
                       "shop": random.choice(["Atelier ", "Maison ", "La Fabrique ", "Chez "]) + l,
                       "addr": f"{random.randint(1, 80)} {random.choice(STREETS)}", "town": cm["n"], "cp": cm["cp"],
                       "lat": round(pt.y, 5), "lng": round(pt.x, 5), "rating": round(4.5 + random.random() * 0.5, 1)})
    for cm in clist:
        del cm["_g"]
    data = {"name": name, "lat": lat, "lng": lng,
            "communes": fc(cfeats), "info": clist, "rank": sorted(range(len(clist)), key=lambda i: -clist[i]["p"]),
            "rivers": fc([feat(g, {}) for g in riv]), "water": fc([feat(g, {}) for g in wat]),
            "foreign": fc(frn), "people": people}
    path = f"{OUT}/data/{slug}.json"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
    index.append({"slug": slug, "n": name, "lat": lat, "lng": lng})
    print(slug, len(cfeats), "communes", len(people), "people", os.path.getsize(path) // 1024, "KB", "rivers", len(riv), "water", len(wat), "foreign", len(frn))
