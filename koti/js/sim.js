// pelilogiikka: kasvu, laitteet, laboratorio, markkina
import {VESSELS, DEVICES, STRAINS, RECIPES, MATCH_MULT, FIRST_GROW, MUTATION_P, CONTAM_P, CELLAR,
  SELL_BASE, PRICE_DROP, SAT_HALF, SPIKE_EVERY, SPIKE_LEN, SPIKE_MULT, SHOP, LAB_UNLOCK_SOLD, ORDER, HINT, CUR,
  WAVES, REGROW, TENDER, FRAME, PRODUCTS, BOARD, CHAIN} from './data.js';
import {S, save, strain, neighbors, allCells, addInv, addSpore, vessel, device} from './state.js';

import {emit} from './events.js';
import * as retki from './retki.js';

export function matchOf(vs, key){ const V=VESSELS[vs.type], T=strain(key); return (V.wet===T.wet?1:0)+(V.warm===T.warm?1:0); }
function growTime(vs){ const T=strain(vs.strain); return vs.fast ? FIRST_GROW : T.grow; }
export function devTime(d){ return d.type==='kehikko' ? FRAME[d.job||'kalvo'].time : DEVICES[d.type].time; }
// hoitajasienen naapurit (ruutuindeksit huoneittain)
export function tended(){ const out={}; for (const {c,r,i} of allCells()){ const T=c.kind==='vessel'&&strain(c.strain);
  if (T && T.auto) neighbors(r,i).forEach(j=>{ out[r+':'+j]=1; }); } return out; }

export function simulate(dt){ while (dt>0){ const step=Math.min(dt,5); dt-=step; tick(step); } }
export function tick(dt){
  const tend=tended();
  for (const {c,r,i} of allCells()){
    const cellar = r==='kellari';
    if (c.kind==='vessel'){
      const V=VESSELS[c.type], T=strain(c.strain), care=tend[r+':'+i];
      const was=c.moist;
      if (V.dry>0 && !care && !(T&&T.auto)) c.moist=Math.max(0, c.moist - dt/(V.dry/(cellar?CELLAR.dry:1))); else c.moist=1;
      if (T && was>0.1 && c.moist<=0.1) emit('horros',{astia:c});
      if (T && was<=0.1 && c.moist>0.1) emit('herasi',{astia:c});
      // horros: kuivunut kanta ei kuole, se vain pysähtyy. Kypsä kasvusto kerää satoaaltoja (enintään WAVES).
      if (T && (c.waves||0)<WAVES && c.moist>0.1){
        let rate = MATCH_MULT[matchOf(c,c.strain)] / growTime(c);
        if (cellar && T.wet) rate *= CELLAR.wetGrow;
        if (care) rate *= TENDER.grow;
        c.growth += dt*rate;
        if (c.growth>=1){
          if (T.auto){ c.growth=1; }
          else { c.waves=(c.waves||0)+1; c.ready=true; c.fast=false; c.growth = c.waves<WAVES ? REGROW : 1;
            emit('kypsyi',{astia:c, kanta:c.strain, aalto:c.waves}); }
        }
      }
    } else if (c.busy && !c.done){
      c.t += dt/devTime(c);
      if (c.t>=1){ c.t=1; c.done=true; c.doneAt=Date.now(); emit('laite-valmis',{laite:c}); }
    }
  }
  retki.tick(dt);
  marketTick(dt);
  boardTick(dt);
}

// ---------- kasvatus ----------
export function plant(vs,key){
  if (!(S.spores[key]>0)) return virhe('ei-itioita','EI ITIÖITÄ');
  vs.strain=key; vs.growth=0; vs.ready=false; vs.waves=0; vs.moist=Math.max(vs.moist,0.6);
  vs.fast = !S.flags.firstHarvest && !allCells().some(o=>o.c.fast);
  addSpore(key,-1); emit('istutus',{astia:vs, kanta:key, viesti:strain(key).name+' ISTUTETTU'}); save();
}
function yieldOf(vs){ const T=strain(vs.strain); return Math.max(1, Math.round(T.yield*VESSELS[vs.type].size*MATCH_MULT[matchOf(vs,vs.strain)])); }
export function waves(vs){ return vs.waves||(vs.ready?1:0); }
// korjuu ottaa kaikki kypsät aallot
export function harvest(vs){
  const w=waves(vs); if (!w) return;
  const T=strain(vs.strain), n=yieldOf(vs)*w;
  addInv('raw:'+T.base, n); takeWaves(vs,w);
  const first=!S.flags.firstHarvest; S.flags.firstHarvest=true;
  emit('korjuu',{astia:vs, kanta:vs.strain, n, aallot:w, viesti:'+'+n+' × '+STRAINS[T.base].name+(w>1?'  ('+w+' AALTOA)':''), vihje:first?HINT.firstHarvest:null});
  progressChain(); save();
}
// itiöt: yksi aalto antaa yhden itiöpussin
export function takeSpores(vs){
  if (!waves(vs)) return;
  const T=strain(vs.strain); addSpore(vs.strain,1); takeWaves(vs,1);
  if (!S.flags.firstHarvest){ S.flags.firstHarvest=true; }
  emit('itiot',{astia:vs, kanta:vs.strain, viesti:'+1 ITIÖPUSSI: '+T.name}); progressChain(); save();
}
function takeWaves(vs,w){ const full=waves(vs)>=WAVES; vs.waves=waves(vs)-w; vs.ready=vs.waves>0; vs.fast=false;
  if (full) vs.growth=REGROW; }
export function mist(vs){ vs.moist=1; emit('sumutus',{astia:vs, viesti:'SUMUTETTU'}); save(); }
export function clearVessel(vs){ vs.strain=null; vs.growth=0; vs.ready=false; vs.waves=0; vs.fast=false; emit('komposti',{astia:vs, viesti:'ASTIA ON TYHJÄ'}); save(); }

// ---------- laboratorio ----------
export function recipeFor(a,b){ const A=a.split('~')[0], B=b.split('~')[0];
  return RECIPES.find(r=>(r.a===A&&r.b===B)||(r.a===B&&r.b===A)); }
export function startDish(dev,a,b){
  if ((S.inv.agar||0)<1 || a===b || !S.spores[a] || !S.spores[b]){ virhe('malja','TARVITSET AGAR-MALJAN JA KAHDEN KANNAN ITIÖT'); return false; }
  addInv('agar',-1); addSpore(a,-1); addSpore(b,-1);
  // tulos arvotaan heti ja paljastetaan, kun malja kypsyy
  let res;
  const rec=recipeFor(a,b);
  if (Math.random()<CONTAM_P) res={kind:'villi'};
  else if (!rec) res={kind:'fail'};
  else if (Math.random()<MUTATION_P) res={kind:'new', key:rec.out+'~'+(Math.random()<0.5?'grow':'yield'), n:2};
  else res={kind:'new', key:rec.out, n:2};
  dev.dish={a,b,res}; dev.busy=true; dev.done=false; dev.t=0; dev.seen=false;
  if (!S.tried[pairKey(a,b)]) S.tried[pairKey(a,b)]=1;
  emit('malja-alku',{laite:dev, a, b, viesti:'MALJA HAUTOMOSSA. KYPSYY 8 H'}); save(); return true;
}
// maljan avaus: palauttaa tuloksen paljastusta varten
export function openDish(dev){
  const d=dev.dish; if (!d||!dev.done) return null; const res=d.res;
  if (res.kind==='new'){ addSpore(res.key,res.n); const base=res.key.split('~')[0], first=!S.known[base]; S.known[base]=1;
    if (res.key.includes('~')) S.known[res.key]=1;
    res.first=first; }
  if (res.kind==='villi') addInv('villi',1);
  // kokeiltu pari muistetaan tuloksen kanssa: 'ok' | 'fail' (kontaminaatio ei kerro parista mitään)
  const pair=pairKey(d.a,d.b); if (res.kind==='new') S.tried[pair]='ok'; else if (res.kind==='fail') S.tried[pair]='fail';
  if (res.kind==='new' && res.key.includes('~')) res.suggest=suggestName(res.key);
  dev.dish=null; dev.busy=false; dev.done=false; dev.t=0;
  if (res.kind==='new' && !S.flags.firstCross){ S.flags.firstCross=true; res.hint=HINT.firstCross; }
  else if (res.kind==='new' && res.key.includes('~') && !S.flags.mutation){ S.flags.mutation=true; res.hint=HINT.mutation; }
  const out={...res, a:d.a, b:d.b}; emit('malja-auki',{laite:dev, tulos:out}); progressChain(); save(); return out;
}

export function pairKey(a,b){ return [a.split('~')[0],b.split('~')[0]].sort().join('+'); }
// hylätty pari (paljastettu): näytetään hautomossa yliviivattuna
export function failedPair(a,b){ return S.tried[pairKey(a,b)]==='fail'; }

// ---------- mutaation nimeäminen (TP7) ----------
export const NAME_MAX = 14;
const NAME_PREFIX = {grow:'PIKA', yield:'KULTA'};
const NAME_STEM = {heltta:'HELTTA', ruusu:'RUUSU', hamara:'NUPPI', kalvo:'KALVO', hoitaja:'HOITAJA', yoruusu:'YÖRUUSU', verkko:'VERKKO'};
// sallitut merkit: pikselifontin kirjaimet A–Ö, numerot, välilyönti ja viiva
export function cleanName(str){ return String(str||'').toUpperCase().replace(/[^A-ZÄÖ0-9 \-]/g,'').replace(/ +/g,' ').trimStart().slice(0,NAME_MAX); }
function nameTaken(n, except){ if (Object.values(STRAINS).some(T=>T.name===n)) return true;
  return Object.keys(S.names).some(k=>k!==except && S.names[k]===n); }
export function suggestName(key){ const [b,perk]=key.split('~');
  const base=(NAME_PREFIX[perk]||'')+(NAME_STEM[b]||b.toUpperCase()); let n=base.slice(0,NAME_MAX), i=2;
  while (nameTaken(n,key)) n=(base.slice(0,NAME_MAX-2)+' '+(i++));
  return n; }
// palauttaa uuden nimen tai null (tyhjä nimi palauttaa oletusnimen)
export function renameStrain(key, str){
  if (!key.includes('~') || !STRAINS[key.split('~')[0]]) return null;
  const n=cleanName(str).trim();
  if (!n){ delete S.names[key]; save(); return null; }
  if (nameTaken(n,key)){ virhe('nimi','NIMI ON JO KÄYTÖSSÄ'); return null; }
  const old=S.names[key]||null; S.names[key]=n;
  emit('nimeys',{kanta:key, nimi:n, vanha:old, viesti:'KANTA NIMETTY: '+n}); save(); return n;
}

// ---------- kehikko: elävä muotti ----------
export function startFrame(dev, key){
  key=key||'kalvo'; const F=FRAME[key]; if (!F || dev.busy) return false;
  if ((S.inv['raw:'+key]||0)<F.need){ virhe('kehikko','TARVITSET '+F.need+' × '+STRAINS[key].name); return false; }
  addInv('raw:'+key,-F.need); dev.job=key; dev.busy=true; dev.done=false; dev.t=0;
  emit('laite-alku',{laite:dev, resepti:key, tuote:F.out, n:1, viesti:STRAINS[key].name+' KASVAA KEHIKKOON: '+PRODUCTS[F.out].name}); save(); return true;
}
export function collectDevice(dev){
  if (!dev.done) return;
  let viesti='', extra={};
  if (dev.type==='kehikko'){ const key=dev.job||'kalvo', out=FRAME[key].out; addInv(out,1); S.flags.frame=true;
    viesti='+1 '+PRODUCTS[out].name+'. '+PRODUCTS[out].txt; extra={resepti:key, tuote:out, n:1}; dev.job=null; }
  dev.busy=false; dev.done=false; dev.t=0; emit('laite-keruu',{laite:dev, ...extra, viesti}); progressChain(); save();
}

// ---------- markkina ----------
export function prodName(id){ const [k,s]=id.split(':');
  if (k==='raw') return STRAINS[s].name;
  if (k==='itio') return strain(s).short+'-ITIÖ'; if (PRODUCTS[k]) return PRODUCTS[k].name; if (k==='villi') return 'VILLI NÄYTE'; return id; }
export function basePrice(id){ const [k,s]=id.split(':'); return k==='raw' ? STRAINS[s].price : SELL_BASE[k]; }
export function unitPrice(id, extra){ const M=S.market, sat=(M.sat[id]||0)+(extra||0);
  const sp = M.spike && M.spike.id===id ? SPIKE_MULT : 1; return basePrice(id)*sp*Math.pow(PRICE_DROP, sat); }
export function quote(id,n){ let s=0; for(let i=0;i<n;i++) s+=unitPrice(id,i); return s; }
export function owned(id){ const [k,s]=id.split(':'); return k==='itio' ? (S.spores[s]||0) : (S.inv[id]||0); }
export function sellables(){ const ids=[];
  for (const id of Object.keys(S.inv)) if (id!=='agar' && S.inv[id]>0) ids.push(id);
  for (const k of Object.keys(S.spores)) if (S.spores[k]>0) ids.push('itio:'+k);
  const sp=S.market.spike; ids.sort((a,b)=>((b===(sp&&sp.id))-(a===(sp&&sp.id))) || basePrice(b)-basePrice(a));
  return ids; }
export function sell(id,n){
  n=Math.min(n,owned(id)); if (n<=0) return;
  const got=quote(id,n); const [k,s]=id.split(':');
  if (k==='itio') addSpore(s,-n); else addInv(id,-n);
  S.hopea+=got; S.market.sat[id]=(S.market.sat[id]||0)+n; S.sold+=n;
  emit('myynti',{tuote:id, n, hopea:got, viesti:'MYIT '+n+' × '+prodName(id)+' +'+Math.round(got*10)/10+' '+CUR});
  checkUnlocks(); progressChain(); save();
}
function marketTick(dt){
  const M=S.market, f=Math.pow(0.5, dt/SAT_HALF);
  for (const id in M.sat){ M.sat[id]*=f; if (M.sat[id]<0.01) delete M.sat[id]; }
  if (M.spike){ M.spike.left-=dt; if (M.spike.left<=0) M.spike=null; }
  M.nextSpike-=dt;
  if (M.nextSpike<=0){ M.nextSpike=SPIKE_EVERY;
    const pool=['raw:heltta','raw:ruusu'];
    for (const k in S.known){ if (k.includes('~')||!STRAINS[k]||STRAINS[k].auto) continue; pool.push('raw:'+k); }
    for (const p in PRODUCTS) if (S.made[p]) pool.push(p);
    M.spike={id:pool[(Math.random()*pool.length)|0], left:SPIKE_LEN};
    emit('kysyntapiikki',{tuote:M.spike.id, viesti:'KYSYNTÄPIIKKI: '+prodName(M.spike.id)+' ×2 KOLMEN TUNNIN AJAN'});
  }
}
export function buy(key){
  const it=SHOP[key]; if (!it || (it.need && !it.need(S))) return; const p=it.price(S); if (S.hopea<p) return virhe('hopea','HOPEA EI RIITÄ');
  S.hopea-=p; let viesti='';
  if (it.kind==='vessel'){ S.bought[key]++; S.vesselInv.push(key); viesti='OSTIT: '+it.name+'. NAPAUTA VAPAATA RUUTUA'; }
  else if (it.kind==='device'){ S.deviceInv.push(key); viesti='OSTIT: '+it.name+'. NAPAUTA VAPAATA RUUTUA'; }
  else if (it.kind==='item'){ addInv(key,1); viesti='+1 '+it.name; }
  else if (it.kind==='room'){ S.rooms[key].owned=true; viesti='KELLARI ON NYT KÄYTÖSSÄ. VAIHDA TILAA ALHAALTA.'; }
  emit('osto',{tuote:key, hinta:p, viesti});
  save();
}
export function checkUnlocks(){
  if (!S.flags.lab && S.sold>=LAB_UNLOCK_SOLD){ S.flags.lab=true; emit('avaus',{mita:'laboratorio', vihje:HINT.lab}); }
  retki.checkOpen();
  if (S.flags.lab && !S.board.length){ fillBoard(); emit('avaus',{mita:'taulu', vihje:HINT.board}); }
}
function virhe(syy, viesti){ emit('virhe',{syy, viesti}); return false; }

// ---------- virstanpylväsketju ----------
export function chainStep(){ return CHAIN[S.chain]||null; }
export function progressChain(){
  let st;
  while ((st=CHAIN[S.chain]) && st.done(S)){
    S.chain++; if (st.reward) S.hopea+=st.reward;
    emit('virstanpylvas',{nimi:st.id, palkkio:st.reward, viesti:'TAVOITE: '+st.txt+(st.reward?'  +'+st.reward+' '+CUR:'')});
  }
  // suodatintilaus on ketjun viimeinen askel
  if (CHAIN[S.chain] && CHAIN[S.chain].id==='tilaus' && !S.order){ S.order={need:ORDER.need, given:0};
    emit('tilaus-uusi',{tilaus:S.order, lahde:'torin vaki', vihje:HINT.order}); }
}

// ---------- torin taulu ----------
function boardPool(){ const ids=[];
  for (const k in S.known){ const T=STRAINS[k]; if (!T||k.includes('~')||T.auto) continue; ids.push('raw:'+k); }
  for (const p in PRODUCTS) if (S.made[p]) ids.push(p);
  return ids; }
function newBoardOrder(avoid){
  const pool=boardPool().filter(id=>!avoid.includes(id)); const src=pool.length?pool:boardPool();
  const id=src[(Math.random()*src.length)|0];
  const big=!id.startsWith('raw:'); const n=big ? 1+((Math.random()*2)|0) : BOARD.sizes[(Math.random()*BOARD.sizes.length)|0];
  return {id:S.boardSeq=(S.boardSeq||0)+1, tuote:id, n, palkkio:Math.max(1,Math.round(basePrice(id)*n*BOARD.mult)), given:false}; }
export function fillBoard(){ while (S.board.length<BOARD.slots) S.board.push(newBoardOrder(S.board.map(o=>o.tuote))); S.boardNext=BOARD.every; }
function boardTick(dt){
  if (!S.board.length) return;
  S.boardNext-=dt;
  if (S.boardNext<=0){ S.boardNext+=BOARD.every;
    // aamulla yksi tilaus uusiutuu: ensin täytetty, muuten vanhin
    let k=S.board.findIndex(o=>o.given); if (k<0) k=0;
    const o=newBoardOrder(S.board.filter((_,j)=>j!==k).map(o=>o.tuote)); S.board.splice(k,1); S.board.push(o);
    emit('tilaus-uusi',{tilaus:o, lahde:'taulu', viesti:'TORIN TAULULLA UUSI TILAUS: '+o.n+' × '+prodName(o.tuote)});
  }
}
export function boardHave(o){ return owned(o.tuote); }
export function deliverBoard(seq){
  const o=S.board.find(x=>x.id===seq); if (!o||o.given) return;
  if (owned(o.tuote)<o.n) return virhe('taulu','TARVITSET '+o.n+' × '+prodName(o.tuote));
  addInv(o.tuote,-o.n); o.given=true; S.hopea+=o.palkkio; S.boardDone=(S.boardDone||0)+1; S.made[o.tuote]=1;
  emit('tilaus-valmis',{tilaus:o, lahde:'taulu', palkkio:o.palkkio, viesti:'TILAUS TÄYTETTY: +'+o.palkkio+' '+CUR+'. UUSI TILAUS AAMULLA.'});
  progressChain(); save();
}

// ---------- lupausnäkymä: mitä tapahtuu seuraavaksi (pelisekunteja) ----------
export function upcoming(){
  const out=[];
  for (const {c} of allCells()){
    if (c.kind==='device' && c.busy && !c.done) out.push({mita:c.type==='kehikko'?PRODUCTS[FRAME[c.job||'kalvo'].out].name:DEVICES[c.type].name, t:(1-c.t)*devTime(c)});
    if (c.kind==='vessel' && c.strain && waves(c)<WAVES && c.moist>0.1){ const T=strain(c.strain); if (T.auto) continue;
      const rate=MATCH_MULT[matchOf(c,c.strain)]/growTime(c); out.push({mita:waves(c)?'AALTO '+(waves(c)+1)+'/'+WAVES:'SATO', t:(1-c.growth)/rate, aalto:true}); }
  }
  if (S.board.length) out.push({mita:'TAULU', t:S.boardNext});
  out.sort((a,b)=>a.t-b.t);
  // yksi rivi per laji: lähin sato ja lähin laite
  const seen={}, res=[]; for (const o of out){ const k=o.aalto?'aalto':o.mita; if (seen[k]) continue; seen[k]=1; res.push(o); }
  return res;
}
// yhteenveto poissaolosta: vertaa tilannekuvia
export function snapshot(){ let w=0, dev=0; for (const {c} of allCells()){ if (c.kind==='vessel') w+=waves(c); else if (c.done) dev++; }
  return {w, dev, board:S.board.map(o=>o.id).join(','), spike:S.market.spike&&S.market.spike.id}; }
export function deliver(){
  const o=S.order; if (!o||o.given>=o.need||!(S.inv.suodatin>0)) return;
  const n=Math.min(S.inv.suodatin, o.need-o.given); addInv('suodatin',-n); o.given+=n;
  if (o.given>=o.need && !S.flags.done){ S.flags.done=true; S.hopea+=ORDER.reward; emit('tilaus-valmis',{tilaus:o, lahde:'torin vaki', palkkio:ORDER.reward}); }
  else emit('toimitus',{tilaus:o, n, viesti:'TILAUS: '+o.given+' / '+o.need+' SUODATINTA'});
  progressChain(); save();
}
// pelastusrengas: ei umpikujia, jos itiöt ja kasvustot loppuvat kokonaan
export function rescue(){
  const growing=allCells().some(o=>o.c.kind==='vessel'&&o.c.strain);
  const anyHeltta=(S.spores.heltta||0)>0;
  if (!growing && !Object.keys(S.spores).length && !anyHeltta){ addSpore('heltta',1); emit('pelastus',{vihje:HINT.pocket}); save(); }
}
export function place(roomKey, i, kind, type){
  const cells=S.rooms[roomKey].cells; if (cells[i]) return;
  const list = kind==='vessel'?S.vesselInv:S.deviceInv; const k=list.indexOf(type); if (k<0) return;
  list.splice(k,1); cells[i] = kind==='vessel'?vessel(type):device(type);
  if (type==='hautomo') S.flags.hasHautomo=true;
  emit('sijoitus',{huone:roomKey, ruutu:i, esine:cells[i], viesti:(kind==='vessel'?VESSELS[type].name:DEVICES[type].name)+' ASETETTU'}); progressChain(); save(); return cells[i];
}
export function move(fromR, fi, toR, ti){
  const a=S.rooms[fromR].cells, b=S.rooms[toR].cells; if (b[ti]) { const t=b[ti]; b[ti]=a[fi]; a[fi]=t; } else { b[ti]=a[fi]; a[fi]=null; }
  emit('siirto',{mista:[fromR,fi], minne:[toR,ti], viesti:'SIIRRETTY'}); save();
}
