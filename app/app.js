/* MOF près de moi : une seule app pour toute la France.
   Position : géolocalisation du navigateur, recherche d'adresse (Géoplateforme IGN), ou clic sur la carte.
   Données : data/mof.json (un tableau d'artisans, voir scripts/build_app.py). */
(async function(){
const CATS=["Tous","Bouche","Bois & pierre","Métal","Mode & beauté","Art & décor"];
const EXAMPLES=[["Paris",48.8566,2.3522],["Lyon",45.7578,4.832],["Marseille",43.2965,5.3698],["Toulouse",43.6045,1.444],["Bordeaux",44.8378,-0.5792],["Nantes",47.2184,-1.5536],["Strasbourg",48.5734,7.7521]];
const HOOK={"Pâtissier-confiseur":"Entremets de saison, macarons et pièces montées sur commande.","Boulanger":"Pains au levain naturel, farines de meunerie locale.","Chocolatier":"Ganaches infusées et tablettes bean-to-bar.","Cuisinier":"Table de 20 couverts, menu du marché.","Fromager":"Affinage en cave voûtée, plus de 120 fromages.","Boucher-charcutier":"Viandes maturées, pâté-croûte maison.","Glacier":"Sorbets plein fruit, parfums renouvelés chaque semaine.","Ébéniste":"Mobilier sur mesure et restauration d'ancien.","Charpentier":"Charpentes traditionnelles assemblées à la main.","Tailleur de pierre":"Restauration de patrimoine et sculpture ornementale.","Menuisier":"Escaliers, portes et agencements sur mesure.","Ferronnier d'art":"Rampes, grilles et portails forgés à la main.","Coutelier":"Couteaux forgés, affûtage et réparation.","Orfèvre":"Pièces uniques en argent massif, restauration.","Horloger":"Réparation de montres mécaniques et pendules.","Coiffeur":"Coupe ciseaux, coloration végétale, sur rendez-vous.","Tailleur":"Costumes en grande mesure, trois essayages.","Bottier":"Chaussures sur mesure cousues main.","Maroquinier":"Sacs et petite maroquinerie au point sellier.","Brodeur":"Broderie main pour la mode et l'ameublement.","Verrier":"Vitraux et verre soufflé, atelier ouvert le samedi.","Céramiste":"Grès et porcelaine tournés, cuisson au bois.","Doreur":"Dorure à la feuille sur bois et cadres.","Relieur":"Reliure d'art et restauration de livres anciens.","Tapissier":"Réfection de sièges en garniture traditionnelle."};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const hav=(a,b)=>{const R=6371,t=Math.PI/180,dl=(b.lat-a.lat)*t,dg=(b.lng-a.lng)*t;
  const h=Math.sin(dl/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const fmt=d=>d<1?Math.round(d*1000)+" m":d<100?d.toFixed(1).replace(".",",")+" km":Math.round(d)+" km";
const walk=d=>d<2.5?Math.max(1,Math.round(d/4.5*60))+" min à pied":d<30?Math.max(1,Math.round(d/15*60))+" min à vélo":"en voiture";
const deg=(v,p,n)=>Math.abs(v).toFixed(4).replace(".",",")+"° "+(v>=0?p:n);
const osm=(lat,lng)=>`https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=18/${lat.toFixed(5)}/${lng.toFixed(5)}`;
const inFrance=(lat,lng)=>lat>41&&lat<51.3&&lng>-5.6&&lng<9.8;

/* Données */
let PEOPLE=[];
try{const r=await fetch("data/mof.json");if(!r.ok)throw 0;PEOPLE=await r.json()}
catch(e){$("list").innerHTML=`<li class="empty">Impossible de charger la liste des artisans. Ouvrez l'app depuis un serveur web (par exemple <code>python3 -m http.server</code>), pas en double-cliquant sur le fichier.</li>`;return}

/* Géocodage : Géoplateforme IGN, repli sur la Base Adresse Nationale (même format) */
const GEO=["https://data.geopf.fr/geocodage","https://api-adresse.data.gouv.fr"];
async function geo(path){for(const b of GEO){try{const r=await fetch(b+path);if(!r.ok)continue;return await r.json()}catch(e){}}return null}
const geoCache={};
async function streetAt(lat,lng){
  const k=lat.toFixed(5)+","+lng.toFixed(5);if(geoCache[k])return geoCache[k];
  const j=await geo(`/reverse?lon=${lng}&lat=${lat}&limit=1`);const f=j&&j.features&&j.features[0];if(!f)return null;
  const p=f.properties,dist=hav({lat,lng},{lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]});
  return geoCache[k]={street:p.street||p.name||"",num:p.housenumber||"",cp:p.postcode||"",city:p.city||"",far:dist>0.4}}
async function search(q){const j=await geo(`/search?q=${encodeURIComponent(q)}&limit=6`);
  return j&&j.features?j.features.map(f=>({label:f.properties.label,ctx:f.properties.context||"",type:f.properties.type,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]})):null}

/* État */
const st={pos:null,how:"ex",radius:15,cat:"Tous",q:"",sort:"d",sel:null};
let saved=null;try{saved=JSON.parse(localStorage.getItem("mofApp")||"null")}catch(e){}
if(saved){for(const k of ["pos","how","radius","cat","sort"])if(saved[k]!=null)st[k]=saved[k]}
const save=()=>{try{localStorage.setItem("mofApp",JSON.stringify({pos:st.pos,how:st.how,radius:st.radius,cat:st.cat,sort:st.sort}))}catch(e){}};

$("ex").insertAdjacentHTML("beforeend",EXAMPLES.map((c,i)=>`<button type="button" data-i="${i}">${c[0]}</button>`).join(""));
$("chips").innerHTML=CATS.map(c=>`<button type="button" class="chip" data-c="${c}">${c}</button>`).join("");
$("radius").value=st.radius;$("sort").value=st.sort;

/* Carte : Plan IGN (Géoplateforme, WMTS) */
const map=L.map("map",{zoomSnap:.5,maxZoom:19,minZoom:5});
L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  {maxZoom:19,maxNativeZoom:19,attribution:'Plan IGN &copy; <a href="https://www.ign.fr/">IGN</a>'}).addTo(map);
const pins=L.layerGroup().addTo(map);
let circle=null,me=null,rankOf={},geoReq=0,acc=null;

const meIcon=L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[22,22],iconAnchor:[11,11]});
const pinIcon=(n,on)=>{const top=n<=3,s=on?1.5:top?1.25:1,w=Math.round(26*s),h=Math.round(34*s),c=on?"#d0202e":"#12307a";
  return L.divIcon({className:"pin",iconSize:[w,h],iconAnchor:[w/2,h],
    html:`<svg width="${w}" height="${h}" viewBox="0 0 26 34"><path d="M13 33C13 33 2 19.5 2 12.5a11 11 0 0 1 22 0C24 19.5 13 33 13 33z" fill="${c}" stroke="#fff" stroke-width="1.8"/><circle cx="13" cy="12.5" r="7.5" fill="#fff"/><text x="13" y="16.4" text-anchor="middle" font-size="${n>9?9.5:11}" font-weight="700" font-family="Work Sans,sans-serif" fill="${c}">${n}</text></svg>`})};
const popup=L.popup({maxWidth:290,minWidth:240,autoPanPadding:[24,24],className:"mofpop"});
let quietClose=false;
popup.on("remove",()=>{if(quietClose||st.sel===null)return;st.sel=null;render()});
const dirUrl=p=>`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${st.pos.lat.toFixed(5)}%2C${st.pos.lng.toFixed(5)}%3B${p.lat.toFixed(5)}%2C${p.lng.toFixed(5)}`;
const addrHtml=(p,g)=>g&&g.street&&!g.far?`${esc(g.street)}<br>${esc(g.cp||p.cp)} ${esc(g.city||p.town)}`:`${esc(p.cp)} ${esc(p.town)}`;
function popupHtml(p,n,g){const d=hav(st.pos,p);
  return `<div class="pp"><div class="pp-h"><span class="pp-n">${n}</span><div><div class="pp-name">${esc(p.name)}</div><div class="pp-job">${esc(p.job)}</div></div></div>
  <div class="pp-badges"><span class="mof">MOF ${p.year}</span><span>${fmt(d)} · ${walk(d)}</span></div>
  <p><strong>${esc(p.shop)}</strong><br><span id="pp-addr">${addrHtml(p,g)}</span></p>
  <p>${esc(HOOK[p.job]||"")}</p>
  <p class="pp-rate"><span aria-hidden="true">★</span> ${String(p.rating).replace(".",",")} / 5 · ${esc(p.cat)}</p>
  <div class="pp-act"><a class="btn" href="${dirUrl(p)}" target="_blank" rel="noopener">Itinéraire ↗</a><button type="button" class="btn ghost" data-list="${p.id}">Voir dans la liste</button></div></div>`}

function toast(msg,ms){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("show"),ms||2600)}
const HOW={gps:"Vous êtes",addr:"Position choisie :",map:"Position choisie :",ex:"Exemple :"};

function setPos(lat,lng,how,label,accuracy){
  st.pos={lat,lng};st.how=how;closePop();
  if(!me){me=L.marker(st.pos,{icon:meIcon,draggable:true,zIndexOffset:3000,keyboard:false,title:"Votre position"}).addTo(map);
    me.on("dragend",()=>{const p=me.getLatLng();setPos(p.lat,p.lng,"map")})}
  else me.setLatLng(st.pos);
  if(!circle)circle=L.circle(st.pos,{radius:st.radius*1000,color:"#d0202e",weight:2,dashArray:"6 6",fillColor:"#d0202e",fillOpacity:.04,interactive:false}).addTo(map);
  else circle.setLatLng(st.pos);
  if(acc){map.removeLayer(acc);acc=null}
  if(accuracy&&accuracy>30)acc=L.circle(st.pos,{radius:accuracy,stroke:false,fillColor:"#12307a",fillOpacity:.12,interactive:false}).addTo(map);
  $("how").textContent=HOW[how]||"Vous êtes";
  $("town").textContent=label||"…";
  $("coords").textContent=`${deg(lat,"N","S")}, ${deg(lng,"E","O")}`;
  $("osm").href=osm(lat,lng);
  const req=++geoReq;
  streetAt(lat,lng).then(g=>{if(req!==geoReq)return;
    if(!g||!g.street){if(!label)$("town").textContent=inFrance(lat,lng)?"ici":"hors de France";return}
    $("town").textContent=(g.far?"près de ":"")+(g.num&&!g.far?g.num+" ":"")+g.street+", "+g.cp+" "+g.city});
  render();fitNearest();
  if(!inFrance(lat,lng))toast("Cette position semble hors de France : l'app ne couvre que la France.",4000);
  save();return true}

function ranked(){
  const q=norm(st.q.trim());
  return PEOPLE.map((p,id)=>({...p,id,d:hav(st.pos,p)})).filter(p=>(st.cat==="Tous"||p.cat===st.cat)
    &&(!q||norm(p.name+" "+p.job+" "+p.shop+" "+p.town).includes(q))).sort((a,b)=>a.d-b.d)}
/* Dans le rayon ; sinon les 5 plus proches, où qu'ils soient, pour ne jamais laisser l'écran vide. */
function visible(){
  const all=ranked();let r=all.filter(p=>p.d<=st.radius),far=false;
  if(!r.length&&all.length){r=all.slice(0,5);far=true}
  r.sort(st.sort==="d"?(a,b)=>a.d-b.d:st.sort==="y"?(a,b)=>b.year-a.year||a.d-b.d:(a,b)=>a.name.localeCompare(b.name,"fr"));
  return {r,far}}

function render(){
  if(!st.pos)return;const {r,far}=visible();
  $("rv").textContent=st.radius+" km";
  document.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b.dataset.c===st.cat));
  $("count").textContent=r.length&&!far?`${r.length} artisan${r.length>1?"s":""} MOF à moins de ${st.radius} km`:"";
  $("far").hidden=!far;
  if(far)$("far").textContent=`Aucun artisan MOF à moins de ${st.radius} km. Voici les ${r.length} plus proches.`;
  const byDist=[...r].sort((a,b)=>a.d-b.d);rankOf={};byDist.forEach((p,k)=>rankOf[p.id]=k+1);
  $("list").innerHTML=r.length?r.map(p=>`<li class="card${st.sel===p.id?" on":""}" data-id="${p.id}" tabindex="0">
    <div class="av" aria-hidden="true">${esc(p.ini)}</div>
    <div><div class="nm">${rankOf[p.id]}. ${esc(p.name)}</div><div class="mt">${esc(p.job)} · MOF ${p.year} · ${esc(p.town)}</div></div>
    <div class="km">${fmt(p.d)}<small>${walk(p.d)}</small></div></li>`).join("")
    :`<li class="empty">Aucun artisan MOF ne correspond à cette recherche. Changez de catégorie ou effacez la recherche.</li>`;
  pins.clearLayers();
  byDist.forEach(p=>{const on=st.sel===p.id,n=rankOf[p.id];
    const m=L.marker([p.lat,p.lng],{icon:pinIcon(n,on),zIndexOffset:on?2000:900-n*10,title:`${n}. ${p.name} — ${p.job}, ${fmt(p.d)}`,keyboard:false,riseOnHover:true});
    m.on("click",ev=>{L.DomEvent.stopPropagation(ev);select(p.id,"map")});pins.addLayer(m)});
  $("near").innerHTML=byDist.length?byDist.slice(0,3).map(p=>`<button type="button" class="nr${st.sel===p.id?" on":""}" data-id="${p.id}"><span class="pp-n">${rankOf[p.id]}</span><span class="nr-t"><b>${esc(p.name)}</b><small>${esc(p.job)}</small></span><span class="nr-d">${fmt(p.d)}</span></button>`).join("")
    :`<p class="nr-empty">Aucun MOF ne correspond.</p>`;
  save()}

function closePop(){if(st.sel===null&&!map.hasLayer(popup))return;st.sel=null;quietClose=true;map.closePopup(popup);quietClose=false}

function select(id,from){
  if(from==="list"&&st.sel===id){closePop();render();return}
  st.sel=id;render();popWasOpen=false;
  const p={...PEOPLE[id],id},k=p.lat.toFixed(5)+","+p.lng.toFixed(5);
  if(matchMedia("(max-width:600px)").matches)$("neard").open=false;
  const nb=document.querySelector(".nearbox");const open=nb.offsetHeight>60;
  popup.options.autoPanPaddingTopLeft=[24,open?24:nb.offsetHeight+24];popup.options.autoPanPaddingBottomRight=[open?nb.offsetWidth+24:24,24];
  quietClose=true;popup.setLatLng([p.lat,p.lng]).setContent(popupHtml(p,rankOf[id]||"",geoCache[k])).openOn(map);quietClose=false;
  const el=popup.getElement();
  const lb=el&&el.querySelector("[data-list]");
  if(lb)lb.addEventListener("click",()=>{const c=document.querySelector(`.card[data-id="${id}"]`);if(c){c.scrollIntoView({behavior:"smooth",block:"center"});c.focus({preventScroll:true})}});
  if(!geoCache[k])streetAt(p.lat,p.lng).then(g=>{const a=document.getElementById("pp-addr");if(g&&a&&st.sel===id)a.innerHTML=addrHtml(p,g)});
  if(from==="list"||from==="near"){if(map.getZoom()<15)map.setView([p.lat,p.lng],16);else map.panTo([p.lat,p.lng])}
  if(from==="list"&&matchMedia("(max-width:900px)").matches)$("map").scrollIntoView({behavior:"smooth",block:"start"})}

/* Cadre : moi + les 5 plus proches affichés */
function fitNearest(){
  if(!st.pos)return;const r=visible().r.sort((a,b)=>a.d-b.d).slice(0,5);
  if(!r.length){fitRadius();return}
  map.fitBounds(L.latLngBounds([st.pos,...r.map(p=>[p.lat,p.lng])]),{padding:[50,50],maxZoom:17})}
function fitRadius(){if(circle){circle.setRadius(st.radius*1000);map.fitBounds(circle.getBounds(),{padding:[16,16]})}}

const NearCtl=L.Control.extend({options:{position:"topright"},onAdd(){
  const d=L.DomUtil.create("div","nearbox");
  d.innerHTML=`<details id="neard"><summary>Les plus proches</summary><div id="near"></div><button type="button" class="fitbtn" id="fitnear">Voir les 5 plus proches dans les rues</button></details>`;
  L.DomEvent.disableClickPropagation(d);L.DomEvent.disableScrollPropagation(d);return d}});
new NearCtl().addTo(map);
$("neard").open=!matchMedia("(max-width:600px)").matches;
$("near").addEventListener("click",e=>{const b=e.target.closest(".nr");b&&select(+b.dataset.id,"near")});
$("fitnear").addEventListener("click",fitNearest);

/* Géolocalisation */
function locate(){
  if(!("geolocation" in navigator)){toast("Votre navigateur ne sait pas vous localiser. Tapez une ville ou une adresse.",4000);return}
  if(!window.isSecureContext){toast("La localisation exige une adresse en https. Tapez une ville ou une adresse.",4000);return}
  const b=$("gps");b.disabled=true;b.lastChild.textContent="Localisation…";
  navigator.geolocation.getCurrentPosition(p=>{b.disabled=false;b.lastChild.textContent="Me localiser";
      setPos(p.coords.latitude,p.coords.longitude,"gps",null,p.coords.accuracy)},
    err=>{b.disabled=false;b.lastChild.textContent="Me localiser";
      toast(err.code===1?"Localisation refusée. Tapez une ville ou une adresse, ou autorisez la localisation dans le navigateur."
        :"Impossible de vous localiser pour l'instant. Tapez une ville ou une adresse.",4500)},
    {enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
$("gps").addEventListener("click",locate);

/* Recherche d'adresse avec suggestions */
let sugg=[],sIdx=-1,sReq=0,sTimer=null;
const showSugg=on=>{$("sugg").hidden=!on;$("addr").setAttribute("aria-expanded",on)};
function drawSugg(){
  $("sugg").innerHTML=sugg.map((s,i)=>`<button type="button" role="option" class="${i===sIdx?"on":""}" data-i="${i}" aria-selected="${i===sIdx}">${esc(s.label)}<small>${esc(s.ctx)}</small></button>`).join("");
  showSugg(sugg.length>0)}
function pick(i){const s=sugg[i];if(!s)return;$("addr").value=s.label;showSugg(false);sugg=[];
  setPos(s.lat,s.lng,"addr",s.label)}
$("addr").addEventListener("input",e=>{const q=e.target.value.trim();clearTimeout(sTimer);
  if(q.length<3){sugg=[];showSugg(false);return}
  sTimer=setTimeout(async()=>{const req=++sReq;const r=await search(q);if(req!==sReq)return;
    if(r===null){sugg=[];showSugg(false);toast("La recherche d'adresse ne répond pas. Réessayez dans un instant.");return}
    sugg=r;sIdx=-1;drawSugg()},250)});
$("addr").addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"&&sugg.length){e.preventDefault();sIdx=(sIdx+1)%sugg.length;drawSugg()}
  else if(e.key==="ArrowUp"&&sugg.length){e.preventDefault();sIdx=(sIdx-1+sugg.length)%sugg.length;drawSugg()}
  else if(e.key==="Enter"){e.preventDefault();if(sugg.length)pick(sIdx<0?0:sIdx)}
  else if(e.key==="Escape")showSugg(false)});
$("sugg").addEventListener("mousedown",e=>e.preventDefault());
$("sugg").addEventListener("click",e=>{const b=e.target.closest("button");b&&pick(+b.dataset.i)});
$("addr").addEventListener("blur",()=>setTimeout(()=>showSugg(false),150));

$("ex").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const c=EXAMPLES[+b.dataset.i];
  map.setView([c[1],c[2]],13,{animate:false});setPos(c[1],c[2],"ex",c[0])});

let popWasOpen=false;
map.on("preclick",()=>{popWasOpen=map.hasLayer(popup)});
map.on("click",e=>{if(popWasOpen){popWasOpen=false;return}setPos(e.latlng.lat,e.latlng.lng,"map")});
$("radius").addEventListener("input",e=>{st.radius=+e.target.value;if(circle)circle.setRadius(st.radius*1000);render()});
$("radius").addEventListener("change",fitRadius);
$("sort").addEventListener("change",e=>{st.sort=e.target.value;render()});
$("q").addEventListener("input",e=>{st.q=e.target.value;render()});
$("chips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(b){st.cat=b.dataset.c;closePop();render();fitNearest()}});
$("list").addEventListener("click",e=>{const c=e.target.closest(".card");c&&select(+c.dataset.id,"list")});
$("list").addEventListener("keydown",e=>{const c=e.target.closest(".card");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();select(+c.dataset.id,"list")}});

/* Démarrage : dernière position connue, sinon un exemple (Paris) et une invitation à se localiser. */
if(st.pos&&st.how!=="gps"){map.setView(st.pos,13,{animate:false});setPos(st.pos.lat,st.pos.lng,st.how)}
else{const c=EXAMPLES[0];map.setView([c[1],c[2]],13,{animate:false});setPos(c[1],c[2],"ex",c[0]);
  toast("Touchez « Me localiser » ou tapez une adresse pour voir les MOF autour de vous.",5000)}
})();
