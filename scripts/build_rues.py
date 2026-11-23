"""Construit app-rues/mof-carte-rues.html (un seul fichier autonome).

1. Extrait des JSON de app-communes/data/ les artisans et la liste des communes
   (sans les contours) -> app-rues/data_inline.json
2. Insère ces données à la place de /*DATA*/ dans app-rues/template.html
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "app-communes" / "data"
DST = ROOT / "app-rues"
CITIES = ["lyon", "paris", "bordeaux", "marseille", "strasbourg", "toulouse", "nantes"]
KEEP = ("name", "ini", "job", "cat", "year", "shop", "town", "cp", "lat", "lng", "rating")

out = {}
for s in CITIES:
    d = json.loads((SRC / f"{s}.json").read_text())
    out[s] = {"name": d["name"], "lat": d["lat"], "lng": d["lng"],
              "info": [[c["n"], c["cp"], c["lat"], c["lng"]] for c in d["info"]],
              "people": [{k: p[k] for k in KEEP} for p in d["people"]]}
data = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
(DST / "data_inline.json").write_text(data)
html = (DST / "template.html").read_text().replace("/*DATA*/", data)
(DST / "mof-carte-rues.html").write_text(html)
print(f"OK : app-rues/mof-carte-rues.html ({len(html)//1024} Ko)")
