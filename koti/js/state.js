// tallennus ja tila. Avain on yhteinen ulkosivun kanssa (CLAUDE.md: Yhteinen tallennus).
import {STRAINS, BASE_GENES, ROOMS, SELL_BASE, SPIKE_FIRST, LEGACY, CHAIN} from './data.js';
import * as GN from './genomi.js';
export const SAVE_KEY = 'solmu_yhteinen_v1';

let uid = 1;
export function newId(){ return uid++; }
export function vessel(type){ return {id:newId(), kind:'vessel', type, strain:null, growth:0, moist:1, ready:false, waves:0}; }
export function device(type){ const d={id:newId(), kind:'device', type, t:0, busy:false, done:false};
  if (type==='hautomo'){ d.dish=null; } if (type==='kehikko'){ d.job=null; } return d; }
function emptyRoom(r){ return {owned:r==='huone', cells:new Array(ROOMS[r].w*ROOMS[r].h).fill(null)}; }

export function newGame(){
  const huone=emptyRoom('huone'), kellari=emptyRoom('kellari');
  huone.cells[4]=vessel('terraario'); huone.cells[5]=vessel('purkki'); huone.cells[6]=vessel('purkki');
  return {
    schema:1, speed:60, hopea:20,
    rooms:{huone, kellari}, cur:'huone',
    inv:{}, spores:{heltta:2, ruusu:2}, vesselInv:[], deviceInv:[],
    bought:{purkki:0, terraario:0}, sold:0,
    known:{heltta:1, ruusu:1}, tried:{},
    market:{sat:{}, spike:null, nextSpike:SPIKE_FIRST},
    flags:{firstHarvest:false, lab:false, firstCross:false, mutation:false, done:false, hasHautomo:false, frame:false, retki:false},
    order:null, retki:{cur:null, n:0, deep:0}, kotiLast:Date.now(),
    // TP3: torin taulu, virstanpylväsketju, kerran saadut tuotteet
    board:[], boardNext:0, boardSeq:0, boardDone:0, chain:0, made:{},
    // TP8: aloitusopastus (opastus.js). vaihe = nykyinen askel, nahty = kerran opetetut asiat
    opastus:{vaihe:null, nahty:{}, pois:false},
    // TP7: mutaatioiden nimet (avain kanta~perk -> nimi) ja kantakirjan nähdyt sivut (hehku = uutta)
    names:{}, book:{seen:{heltta:1, ruusu:1}},
    // V2.2: genomit. seed = pelaajan siemen (risteytysten arvonta), kannat = risteymien rekisteri (tunniste -> {g, seed, pa, pb,
    // from, mut, stab, nimi}), tieto = tunnetut piirreryhmät (k = kyky, g = kasvu), crossN = maljojen määrä parista
    seed:(Math.random()*4294967296)>>>0, kannat:{}, tieto:{heltta:{k:1, g:1}, ruusu:{k:1, g:1}}, crossN:{}
  };
}

// vanha (KOTI-01 V0.2/V0.3) tallennus -> v1
function migrate(s){
  const d=newGame(); const huone=emptyRoom('huone');
  let hopea = (s.mk||0) + (s.sato||0)*2 + (s.uute||0)*15;
  (s.slots||[]).forEach((vs,i)=>{ if(!vs) return; const r=(i/3)|0, c=i%3; const nv={...vs, kind:'vessel'};
    if (nv.strain && !STRAINS[nv.strain]){ nv.strain=null; nv.growth=0; nv.ready=false; }
    huone.cells[r*4+c]=nv; });
  const inv={};
  for (const id in (s.goods||{})){ const n=s.goods[id], k=id.slice(2);
    if (id[0]==='r' && STRAINS[k]) inv['raw:'+k]=(inv['raw:'+k]||0)+n;
    else hopea += n*(id[0]==='j'?10:2); }
  const spores={}; for (const k in (s.spores||{})){ if (STRAINS[k]) spores[k]=s.spores[k]; else hopea += s.spores[k]*SELL_BASE.itio; }
  if (!spores.ruusu) spores.ruusu=2;   // v1:n alkuitiöt, jotta risteytys on mahdollinen
  const known={heltta:1, ruusu:1}; for (const k in spores) known[k]=1; for (const k in (s.seen||{})) if (STRAINS[k]) known[k]=1;
  huone.cells.forEach(c=>{ if(c&&c.strain) known[c.strain]=1; });
  const out={...d, speed:s.speed||60, hopea:Math.max(hopea,d.hopea), rooms:{huone, kellari:d.rooms.kellari}, inv, spores, known,
    vesselInv:(s.vesselInv||[]).slice(), bought:{purkki:(s.bought||{}).purkki||0, terraario:(s.bought||{}).terraario||0},
    kotiLast:s.kotiLast||Date.now()};
  out.flags.firstHarvest=!!s.firstHarvest;
  return out;
}
export function ensure(s){
  if (!s || typeof s!=='object') return newGame();
  if (!s.schema) s=migrate(s);
  const d=newGame(), pre22=!s.tieto || typeof s.tieto!=='object';   // tallennus ajalta ennen genomia
  if (pre22) delete s.tieto;
  if (!s.opastus) s.opastus=experienced(s);
  for (const k in d) if (s[k]===undefined) s[k]=d[k];
  for (const k in d.flags) if (s.flags[k]===undefined) s.flags[k]=d.flags[k];
  for (const k in d.market) if (s.market[k]===undefined) s.market[k]=d.market[k];
  for (const r in d.rooms) if (!s.rooms[r]) s.rooms[r]=d.rooms[r];
  // rihmaretki (TP5): ovi on auki, jos vanhassa tallennuksessa on jo myyty; asetusten testilöydön kentät pois
  if (!s.retki || typeof s.retki!=='object') s.retki=d.retki;
  for (const k in d.retki) if (s.retki[k]===undefined) s.retki[k]=d.retki[k];
  if (!s.flags.retki && (s.sold||0)>=1) s.flags.retki=true;
  delete s.retkiReady; delete s.trips;
  // TP7: vanhan tallennuksen tunnetut kannat on jo nähty (kantakirja ei hehku turhaan)
  if (!s.book || typeof s.book!=='object') s.book={seen:{...s.known}};
  if (!s.book.seen) s.book.seen={...s.known};
  if (!s.names || typeof s.names!=='object') s.names={};
  dropDrying(s);
  upgradeV12(s);
  upgradeV22(s, pre22);
  // ulkosivu voi tuoda vanhoja kenttiä; ne eivät haittaa
  return s;
}
export const S = ensure(load());
fixUid();
function load(){ let s=null; try { s=JSON.parse(localStorage.getItem(SAVE_KEY)); } catch(e){}
  if (new URLSearchParams(location.search).has('reset')) s=null; return s; }
export function fixUid(){ let m=0; for (const r in S.rooms) S.rooms[r].cells.forEach(c=>{ if(c&&c.id>m) m=c.id; }); uid=m+1; }
export function replaceState(ns){ CACHE.clear(); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, ns); fixUid(); }
export function save(){ S.kotiLast=Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} }

// koti omistaa nämä kentät: toisen välilehden tallennus ei ylikirjoita niitä
export const KOTI_OWNS = ['rooms','cur','hopea','inv','deviceInv','bought','sold','known','tried','market','flags','order','retki','kotiLast','speed',
  'board','boardNext','boardSeq','boardDone','chain','made','opastus','names','book','seed','kannat','tieto','crossN'];
export function mergeIncoming(inc){ const keep={}; for (const k of KOTI_OWNS) keep[k]=S[k];
  const n=ensure(inc); for (const k of KOTI_OWNS) n[k]=keep[k]; replaceState(n); }

// TP8: tallennus ennen opastusta. Jos peli on jo käynnissä, ensimmäinen käynti ja jo avautuneet asiat on nähty.
function experienced(s){
  const o={vaihe:null, nahty:{}, pois:false}, f=s.flags||{}, cells=[];
  for (const r in (s.rooms||{})) (s.rooms[r].cells||[]).forEach(c=>{ if(c) cells.push(c); });
  if (!(f.firstHarvest || (s.sold||0)>0)) return o;
  const n=o.nahty; n.ensi=n.korjaa=n.sumutus=n.ruusu=n.hinta=1;
  if (cells.some(c=>(c.waves||0)>=2)) n.aallot=1;
  if ((s.retki&&s.retki.n) || f.retki) n.retki=1;
  if (f.lab){ n['lab-esittely']=1; n.taulu=1; }
  if (f.firstCross || f.hasHautomo) n.lab=1;
  if (f.frame || cells.some(c=>c.type==='kehikko')) n.kehikko=1;
  if (cells.some(c=>c.strain&&c.strain.split('~')[0]==='hoitaja')) n.hoitaja=1;
  if (s.rooms&&s.rooms.kellari&&s.rooms.kellari.owned){ n.kellari=1; n['kellari-mene']=1; }
  return o;
}
// TP0: kuivausteline ja kuivatut sienet poistettiin. Vanhat kuivatut ja telineet hyvitetään hopeana.
function dropDrying(s){
  for (const id of Object.keys(s.inv)) if (id.startsWith('dry:')){ s.hopea += s.inv[id]*LEGACY.dry; delete s.inv[id]; }
  for (const id of Object.keys(s.market.sat)) if (id.startsWith('dry:')) delete s.market.sat[id];
  if (s.market.spike && s.market.spike.id.startsWith('dry:')) s.market.spike=null;
  const keep=[]; for (const t of s.deviceInv){ if (t==='kuivain') s.hopea+=LEGACY.kuivain; else keep.push(t); } s.deviceInv=keep;
  for (const r in s.rooms) s.rooms[r].cells.forEach((c,i)=>{ if (c && c.type==='kuivain'){
    s.hopea += LEGACY.kuivain + (c.busy ? (c.n||0)*LEGACY.dry : 0); s.rooms[r].cells[i]=null; } });
}
// TP3 (V1.2): satoaallot, kehikon resepti, ketju. Vanhat tallennukset jatkuvat ilman umpikujaa.
function upgradeV12(s){
  for (const r in s.rooms) s.rooms[r].cells.forEach(c=>{ if (!c) return;
    if (c.kind==='vessel' && c.waves===undefined) c.waves = c.ready?1:0;
    if (c.type==='kehikko' && c.busy && !c.job) c.job='kalvo';
    if (c.type==='hautomo') s.flags.hasHautomo=true; });
  for (const id in s.inv) if (s.inv[id]>0) s.made[id]=1;
  if (s.chain===0 && s.flags.firstHarvest){   // ohita ketjun askeleet, jotka vanha tallennus on jo tehnyt (ei palkkioita)
    while (CHAIN[s.chain] && CHAIN[s.chain].id!=='tilaus' && CHAIN[s.chain].done(s)) s.chain++;
    // vanha peli, jossa tilaus on jo auki tai täytetty: hyppää suoraan tilaukseen
    if (s.order) s.chain=CHAIN.findIndex(c=>c.id==='tilaus');
  }
}
// V2.2: genomit. Vanhat mutaatioavaimet (kanta~grow, kanta~yield) muunnetaan rekisterin kannoiksi ja nimet säilyvät.
// Kaikki ennestään tunnetut kannat ovat kokonaan tunnettuja (ei kysymysmerkkejä vanhaan peliin). Ajetaan joka latauksella.
function upgradeV22(s, pre22){
  if (!s.kannat || typeof s.kannat!=='object') s.kannat={};
  if (pre22){ s.tieto={}; for (const k in s.known) s.tieto[k]={k:1, g:1}; }   // vanhan tallennuksen kannat tunnetaan kokonaan
  if (!s.crossN || typeof s.crossN!=='object') s.crossN={};
  if (!s.seed) s.seed=(Math.random()*4294967296)>>>0;
  const map={};
  const conv=k=>{ if (typeof k!=='string' || !k.includes('~')) return k; if (map[k]!==undefined) return map[k];
    const [b,perk]=k.split('~'), r=STRAINS[b]&&GN.legacyMutant(b,perk);
    if (!r) return (map[k]=STRAINS[b]?b:null);
    if (!s.kannat[r.key]) s.kannat[r.key]={g:r.g, seed:r.seed, pa:r.pa, pb:null, from:r.from, mut:r.mut, stab:r.stab,
      nimi:GN.autoName(r.g, r.mut, n=>takenIn(s,n))};
    if (s.names[k]){ s.names[r.key]=s.names[k]; }
    s.tieto[r.key]={k:1, g:1};
    return (map[k]=r.key); };
  const rekey=o=>{ if (!o) return; for (const k of Object.keys(o)) if (k.includes('~')){ const n=conv(k), v=o[k]; delete o[k];
    if (n) o[n]=typeof v==='number' ? (o[n]||0)+v : v; } };
  rekey(s.spores); rekey(s.known); rekey(s.book.seen);
  for (const k of Object.keys(s.tieto)) if (k.includes('~')) delete s.tieto[k];
  // tuoteavaimet (raw:kanta~perk, itio:kanta~perk) varastossa, markkinassa ja taulun tilauksissa
  const pid=id=>{ if (typeof id!=='string' || !id.includes('~')) return id; const i=id.indexOf(':'), n=conv(id.slice(i+1)); return n ? id.slice(0,i+1)+n : null; };
  const rekeyP=o=>{ if (!o) return; for (const k of Object.keys(o)) if (k.includes('~')){ const n=pid(k), v=o[k]; delete o[k]; if (n) o[n]=(o[n]||0)+v; } };
  rekeyP(s.inv); rekeyP(s.made); if (s.market){ rekeyP(s.market.sat); if (s.market.spike && s.market.spike.id) s.market.spike.id=pid(s.market.spike.id); if (s.market.spike && !s.market.spike.id) s.market.spike=null; }
  if (Array.isArray(s.board)) s.board=s.board.filter(o=>!o || !o.tuote || (o.tuote=pid(o.tuote)));
  // kokeillut parit: avaimet uusiksi, hylkimistä ei enää ole
  for (const k of Object.keys(s.tried||{})){ const v=s.tried[k]; if (k.includes('~')){ delete s.tried[k]; const ab=k.split('+').map(conv); if (ab[0] && ab[1]) s.tried[ab.sort().join('+')]=v==='fail'?1:v; } else if (v==='fail') s.tried[k]=1; }
  for (const k of Object.keys(s.names)) if (k.includes('~')){ conv(k); delete s.names[k]; }
  for (const r in s.rooms) s.rooms[r].cells.forEach(c=>{ if (!c) return;
    if (c.kind==='vessel' && c.strain){ c.strain=conv(c.strain); if (!c.strain || !(STRAINS[c.strain]||s.kannat[c.strain])){ c.strain=null; c.growth=0; c.ready=false; c.waves=0; } }
    if (c.type==='kehikko' && c.job) c.job=conv(c.job);
    if (c.type==='hautomo' && c.dish && !c.dish.study){ const d=c.dish; d.a=conv(d.a); d.b=conv(d.b);
      // kesken oleva vanha malja (resepti tai hylkiminen): tulos arvotaan uudelleen perinnöllisyydellä
      if (!d.res || !d.res.g && d.res.kind!=='villi'){ if (d.a && d.b && d.a!==d.b){ const pk=[d.a,d.b].sort().join('+'); s.crossN[pk]=(s.crossN[pk]||0)+1;
          d.res=GN.cross(s.kannat, d.a, d.b, s.seed, s.crossN[pk]); d.res.n=2; }
        else { c.dish=null; c.busy=false; c.done=false; c.t=0; } } } });
}
function takenIn(s,n,except){ if (Object.values(STRAINS).some(T=>T.name===n)) return true;
  for (const k in s.kannat) if (k!==except && s.kannat[k].nimi===n && !s.names[k]) return true;
  return Object.keys(s.names).some(k=>k!==except && s.names[k]===n); }
export const nameTaken=(n,except)=>takenIn(S,n,except);
// uusi kanta rekisteriin (risteytyksen, retken tai tutkimuksen tulos genomi.js:stä). Palauttaa true, jos kanta on uusi.
export function register(res){
  if (STRAINS[res.key] || S.kannat[res.key]) return false;
  S.kannat[res.key]={g:res.g, seed:res.seed, pa:res.pa, pb:res.pb, from:res.from, mut:res.mut||null, stab:res.stab,
    nimi:GN.autoName(res.g, res.mut, n=>nameTaken(n))};
  if (res.villi) S.kannat[res.key].villi=1;
  CACHE.delete(res.key); return true;
}
// tunnetut piirreryhmät: k = kyky ja luonne, g = kasvu ja ilmasto (muoto näkyy aina)
export function knows(key){ return (S.tieto && S.tieto[key]) || {}; }
export function learn(key, grp){ const t=S.tieto[key]||(S.tieto[key]={}); if (t[grp]) return false; t[grp]=1; return true; }
// apurit
// kanta tunnisteella: pohjakanta (data.js STRAINS) tai rekisterin risteymä. Palauttaa aina saman muotoisen olion:
// name, short, col, style, wet, warm, grow, yield, price, base (muodon antaja = sprite), kyky, luonne, sato, nopeus,
// auto (ei satoa), tends (HOIDA: hoitaa naapureita), tint (väri poikkeaa spritestä), mutant, mut, orig, pa, pb, from.
const CACHE=new Map();
export function strain(key){ if(!key) return null;
  let d=CACHE.get(key);
  if (!d){
    if (STRAINS[key]){ const T=STRAINS[key]; d={...GN.describe(GN.baseGenes(key)), ...T, key, base:key, short:T.name, gen:0}; }
    else { const R=S && S.kannat && S.kannat[key]; if (!R) return null;
      d={...GN.describe(R.g,R), key, nimi:R.nimi, mutant:!!R.mut, mut:R.mut, pa:R.pa, pb:R.pb, from:R.from, villi:!!R.villi, stab:R.stab,
        orig:R.mut ? 'MUTAATIO: '+R.mut.txt : null,
        txt:R.villi ? 'VILLI LINJA' : R.mut ? 'MUTAATIO' : 'RISTEYMÄ'}; }
    CACHE.set(key,d);
  }
  if (STRAINS[key]) return d;
  const own=S.names[key];
  return {...d, name:own||d.nimi, short:own||d.nimi, named:!!own}; }
export function roomOf(r){ return S.rooms[r]; }
export function neighbors(r,i){ const {w,h}={w:4,h:r==='kellari'?3:4}; const c=i%w, y=(i/w)|0, out=[];
  if(c>0) out.push(i-1); if(c<w-1) out.push(i+1); if(y>0) out.push(i-w); if(y<h-1) out.push(i+w); return out; }
export function allCells(){ const out=[]; for (const r in S.rooms){ if(!S.rooms[r].owned) continue; S.rooms[r].cells.forEach((c,i)=>{ if(c) out.push({c,r,i}); }); } return out; }
export function addInv(id,n){ S.inv[id]=(S.inv[id]||0)+n; if (n>0) S.made[id]=1; if (S.inv[id]<=0) delete S.inv[id]; }
export function addSpore(k,n){ S.spores[k]=(S.spores[k]||0)+n; if (S.spores[k]<=0) delete S.spores[k]; }
