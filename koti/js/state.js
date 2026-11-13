// tallennus ja tila. Avain on yhteinen ulkosivun kanssa (CLAUDE.md: Yhteinen tallennus).
import {STRAINS, ROOMS, SELL_BASE, SPIKE_FIRST, LEGACY, CHAIN} from './data.js';
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
    names:{}, book:{seen:{heltta:1, ruusu:1}}
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
    else hopea += n*(id[0]==='j'?10:SELL_BASE.raw); }
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
  const d=newGame();
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
  // ulkosivu voi tuoda vanhoja kenttiä; ne eivät haittaa
  return s;
}
export const S = ensure(load());
fixUid();
function load(){ let s=null; try { s=JSON.parse(localStorage.getItem(SAVE_KEY)); } catch(e){}
  if (new URLSearchParams(location.search).has('reset')) s=null; return s; }
export function fixUid(){ let m=0; for (const r in S.rooms) S.rooms[r].cells.forEach(c=>{ if(c&&c.id>m) m=c.id; }); uid=m+1; }
export function replaceState(ns){ for (const k of Object.keys(S)) delete S[k]; Object.assign(S, ns); fixUid(); }
export function save(){ S.kotiLast=Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} }

// koti omistaa nämä kentät: toisen välilehden tallennus ei ylikirjoita niitä
export const KOTI_OWNS = ['rooms','cur','hopea','inv','deviceInv','bought','sold','known','tried','market','flags','order','retki','kotiLast','speed',
  'board','boardNext','boardSeq','boardDone','chain','made','opastus','names','book'];
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
// apurit
// kanta avaimella; mutaatiolla on pelaajan antama nimi (S.names) tai oletus "SINIHELTTA (MUTAATIO)".
// orig = alkuperäinen kanta ja mutaatio pienellä ("SINIHELTTA, MUTAATIO: SATO +1").
export const PERK_TXT = {grow:'KASVU +25%', yield:'SATO +1'};
export function strain(key){ if(!key) return null; const [base,perk]=key.split('~'); const T=STRAINS[base]; if(!T) return null;
  if (!perk) return {...T, key, base, short:T.name};
  const own = S && S.names && S.names[key];
  return {...T, key, base, perk, mutant:true, named:!!own, name: own || T.name+' (MUTAATIO)', short: own || T.name+' (M)',
    orig: T.name+', MUTAATIO: '+PERK_TXT[perk],
    grow: perk==='grow'?T.grow/1.25:T.grow, yield: perk==='yield'?T.yield+1:T.yield}; }
export function roomOf(r){ return S.rooms[r]; }
export function neighbors(r,i){ const {w,h}={w:4,h:r==='kellari'?3:4}; const c=i%w, y=(i/w)|0, out=[];
  if(c>0) out.push(i-1); if(c<w-1) out.push(i+1); if(y>0) out.push(i-w); if(y<h-1) out.push(i+w); return out; }
export function allCells(){ const out=[]; for (const r in S.rooms){ if(!S.rooms[r].owned) continue; S.rooms[r].cells.forEach((c,i)=>{ if(c) out.push({c,r,i}); }); } return out; }
export function addInv(id,n){ S.inv[id]=(S.inv[id]||0)+n; if (n>0) S.made[id]=1; if (S.inv[id]<=0) delete S.inv[id]; }
export function addSpore(k,n){ S.spores[k]=(S.spores[k]||0)+n; if (S.spores[k]<=0) delete S.spores[k]; }
