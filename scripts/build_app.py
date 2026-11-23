"""Construit app/data/mof.json : tous les artisans de France dans un seul fichier.

Lit les JSON de app-communes/data/ (artisans fictifs, voir build_communes.py)
et garde seulement les champs utiles à l'app. Quand de vraies données MOF
seront disponibles, il suffira de produire ce même fichier à partir d'elles.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "app-communes" / "data"
DST = ROOT / "app" / "data" / "mof.json"
CITIES = ["lyon", "paris", "bordeaux", "marseille", "strasbourg", "toulouse", "nantes"]
KEEP = ("name", "ini", "job", "cat", "year", "shop", "town", "cp", "lat", "lng", "rating")

people = []
for s in CITIES:
    d = json.loads((SRC / f"{s}.json").read_text())
    people += [{k: p[k] for k in KEEP} for p in d["people"]]
people.sort(key=lambda p: (p["cp"], p["name"]))
DST.write_text("[\n" + ",\n".join(json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in people) + "\n]\n")
print(f"OK : {DST.relative_to(ROOT)} ({len(people)} artisans)")
