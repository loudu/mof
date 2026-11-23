/* Fond de carte : Plan IGN vectoriel (Géoplateforme), restylé dans un esprit épuré et doux.
   Rendu par MapLibre GL sous Leaflet (plugin maplibre-gl-leaflet), donc les épingles,
   fiches et cercles de app.js ne changent pas. En cas d'échec (WebGL absent, style
   injoignable), on retombe sur le Plan IGN raster. */
window.mofFond = (function(){
  const STYLE = "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";
  const RASTER = "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";
  const ATTR = 'Plan IGN &copy; <a href="https://www.ign.fr/">IGN</a>';

  /* Palette */
  const C = {
    land:"#f5f4f1", green:"#d6ebcf", greenSoft:"#e6f1df", water:"#aadaff", waterText:"#4f7fae",
    build:"#ebe8e3", buildLine:"#dcd8d1", buildSpecial:"#e9e6ef",
    hwy:"#fbd872", hwyCase:"#e7b23f", main:"#fff1bf", mainCase:"#e5cf91",
    road:"#ffffff", roadCase:"#d9dce1", rail:"#c3c7cc",
    text:"#3c4043", textSoft:"#6b7076", halo:"#ffffff"
  };
  /* Couches supprimées : courbes de niveau, relief, parcelles, bornes, limites fines, détails ponctuels */
  const DROP = [/oro_courbe/,/oro_lin/,/oro_relief/,/parcellaire/,/toponyme_routier_borne/,/toponyme_oro/,/limite_lin/,/toponyme_limite/,/bati_ponc/,/bati_lin/,/routier_ponc/,/^toponyme_bati_ponc$/];
  const has = (l,re) => re.test(l.id) || re.test(l["source-layer"]||"");

  function roadColor(id, inner){
    if(/autoroute|bretelle/.test(id)) return inner?C.hwy:C.hwyCase;
    if(/principale/.test(id)) return inner?C.main:C.mainCase;
    return inner?C.road:C.roadCase;
  }

  function restyle(style){
    style.layers = style.layers.filter(l => l.type!=="circle" && !DROP.some(re => re.test(l["source-layer"]||"")));
    for(const l of style.layers){
      const p = l.paint || (l.paint = {}), sl = l["source-layer"]||"", id = l.id;
      if(l.type==="background"){p["background-color"]=C.land;continue}
      if(l.type==="fill"){
        if(/fond_opaque/.test(sl)) p["fill-color"]=C.land;
        else if(/bati_zone_surf/.test(sl)) p["fill-color"]=/activit/.test(id)?"#eceae6":"#efece6";
        else if(/hydro/.test(sl)||/hydro/.test(id)) p["fill-color"]=C.water;
        else if(/vegetation/.test(sl)) p["fill-color"]=/fermee|bois/i.test(id)?C.green:C.greenSoft;
        else if(/sportif/.test(id)) p["fill-color"]=C.greenSoft;
        else if(/^bati_surf$/.test(sl)) {p["fill-color"]=/religieux|mairie|public|gare/.test(id)?C.buildSpecial:C.build;p["fill-outline-color"]=C.buildLine}
        else if(/bati_zai/.test(sl)) p["fill-color"]=/Vert/.test(id)?C.greenSoft:C.land;
        else if(/ocs_nature_sol/.test(sl)) p["fill-color"]=C.land;
        else if(/routier_surf/.test(sl)) p["fill-color"]=C.road;
        delete p["fill-pattern"];
      }
      else if(l.type==="line"){
        if(/hydro/.test(sl)) p["line-color"]=C.water;
        else if(/^routier_(route|chemin)/.test(sl)||/^routier_liaison/.test(sl)){
          if(/filet ext/i.test(id)) p["line-color"]=roadColor(id,false);
          else if(/filet int|axe/i.test(id)) p["line-color"]=/axe/.test(id)?C.hwy:roadColor(id,true);
          else p["line-color"]=C.roadCase;
          delete p["line-pattern"];
        }
        else if(/ferre/.test(sl)) {p["line-color"]=C.rail}
        else if(/bati/.test(sl)) p["line-color"]=C.buildLine;
      }
      else if(l.type==="symbol"){
        if(!l.layout || !l.layout["text-field"]) continue;
        p["text-halo-color"]=C.halo; p["text-halo-width"]=1.4;
        if(/odonyme/.test(sl)) {p["text-color"]=C.textSoft; l.layout["text-size"]=/desabr/.test(id)?12.5:11.5; l.minzoom=Math.min(l.minzoom||15,14.5)}
        else if(/hydro/.test(sl)) p["text-color"]=C.waterText;
        else if(/localite/.test(sl)) p["text-color"]=C.text;
        else p["text-color"]=C.textSoft;
      }
    }
    return style;
  }

  async function add(map){
    const raster = () => L.tileLayer(RASTER,{maxZoom:19,attribution:ATTR}).addTo(map);
    if(!L.maplibreGL || !window.maplibregl || !(maplibregl.supported ? maplibregl.supported() : true)) return raster();
    try{
      const r = await fetch(STYLE); if(!r.ok) throw new Error("style "+r.status);
      const gl = L.maplibreGL({style: restyle(await r.json()), attribution: ATTR, interactive:false}).addTo(map);
      return gl;
    }catch(e){ console.warn("Plan IGN vectoriel indisponible, repli raster", e); return raster(); }
  }
  return {add, restyle};
})();
