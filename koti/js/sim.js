// pelilogiikka: kasvu, laitteet, laboratorio, markkina
import {VESSELS, DEVICES, STRAINS, RECIPES, MATCH_MULT, FIRST_GROW, MUTATION_P, CONTAM_P, CELLAR,
  SELL_BASE, PRICE_DROP, SAT_HALF, SPIKE_EVERY, SPIKE_LEN, SPIKE_MULT, SHOP, LAB_UNLOCK_SOLD, ORDER, HINT, CUR} from './data.js';
import {S, save, strain, neighbors, allCells, addInv, addSpore, vessel, device} from './state.js';

import {emit} from './events.js';
import * as retki from './retki.js';

export function matchOf(vs, key){ const V=VESSELS[vs.type], T=strain(key); return (V.wet===T.wet?1:0)+(V.warm===T.warm?1:0); }
function growTime(vs){ const T=strain(vs.strain); return vs.fast ? FIRST_GROW : T.grow; }

export function simulate(dt){ while (dt>0){ const step=Math.min(dt,5); dt-=step; tick(step); } }
export function tick(dt){
  for (const {c,r,i} of allCells()){
    const cellar = r==='kellari';
    if (c.kind==='vessel'){
      const V=VESSELS[c.type];
      if (V.dry>0) c.moist=Math.max(0, c.moist - dt/(V.dry/(cellar?CELLAR.dry:1))); else c.moist=1;
      const T=strain(c.strain);
      if (T && T.auto){ c.moist=1;
        neighbors(r,i).forEach(j=>{ const n=S.rooms[r].cells[j]; if(n && n.kind==='vessel' && n.moist<0.85) n.moist=Math.min(1,n.moist+dt/40); }); }
      // horros: kuivunut kanta ei kuole, se vain pysähtyy
      if (T && !c.ready && c.moist>0.1){
        let rate = MATCH_MULT[matchOf(c,c.strain)] / growTime(c);
        if (cellar && T.wet) rate *= CELLAR.wetGrow;
        c.growth += dt*rate;
        if (c.growth>=1){ c.growth=1; c.ready=!T.auto; }
      }
    } else if (c.busy && !c.done){
      c.t += dt/DEVICES[c.type].time;
      if (c.t>=1){ c.t=1; c.done=true; c.doneAt=Date.now(); emit('laite-valmis',{laite:c}); }
    }
  }
  retki.tick(dt);
  marketTick(dt);
}

// ---------- kasvatus ----------
export function plant(vs,key){
  vs.strain=key; vs.growth=0; vs.ready=false; vs.moist=Math.max(vs.moist,0.6);
  vs.fast = !S.flags.firstHarvest && !allCells().some(o=>o.c.fast);
  addSpore(key,-1); emit('istutus',{astia:vs, kanta:key, viesti:strain(key).name+' ISTUTETTU'}); save();
}
function yieldOf(vs){ const T=strain(vs.strain); return Math.max(1, Math.round(T.yield*VESSELS[vs.type].size*MATCH_MULT[matchOf(vs,vs.strain)])); }
export function harvest(vs){
  const T=strain(vs.strain), n=yieldOf(vs);
  addInv('raw:'+T.base, n); vs.ready=false; vs.growth=0.35; vs.fast=false;
  const first=!S.flags.firstHarvest; S.flags.firstHarvest=true;
  emit('korjuu',{astia:vs, kanta:vs.strain, n, viesti:'+'+n+' × '+STRAINS[T.base].name, vihje:first?HINT.firstHarvest:null});
  save();
}
export function takeSpores(vs){
  const T=strain(vs.strain); addSpore(vs.strain,1); vs.ready=false; vs.growth=0.35; vs.fast=false;
  if (!S.flags.firstHarvest){ S.flags.firstHarvest=true; }
  emit('itiot',{astia:vs, kanta:vs.strain, viesti:'+1 ITIÖPUSSI: '+T.name}); save();
}
export function mist(vs){ vs.moist=1; emit('sumutus',{astia:vs, viesti:'SUMUTETTU'}); save(); }
export function clearVessel(vs){ vs.strain=null; vs.growth=0; vs.ready=false; vs.fast=false; emit('komposti',{astia:vs, viesti:'ASTIA ON TYHJÄ'}); save(); }

// ---------- laboratorio ----------
export function recipeFor(a,b){ const A=a.split('~')[0], B=b.split('~')[0];
  return RECIPES.find(r=>(r.a===A&&r.b===B)||(r.a===B&&r.b===A)); }
export function startDish(dev,a,b){
  if ((S.inv.agar||0)<1 || a===b || !S.spores[a] || !S.spores[b]) return false;
  addInv('agar',-1); addSpore(a,-1); addSpore(b,-1);
  // tulos arvotaan heti ja paljastetaan, kun malja kypsyy
  let res;
  const rec=recipeFor(a,b);
  if (Math.random()<CONTAM_P) res={kind:'villi'};
  else if (!rec) res={kind:'fail'};
  else if (Math.random()<MUTATION_P) res={kind:'new', key:rec.out+'~'+(Math.random()<0.5?'grow':'yield'), n:2};
  else res={kind:'new', key:rec.out, n:2};
  dev.dish={a,b,res}; dev.busy=true; dev.done=false; dev.t=0; dev.seen=false;
  S.tried[[a.split('~')[0],b.split('~')[0]].sort().join('+')]=1;
  emit('malja-alku',{laite:dev, a, b, viesti:'MALJA HAUTOMOSSA. KYPSYY 8 H'}); save(); return true;
}
// maljan avaus: palauttaa tuloksen paljastusta varten
export function openDish(dev){
  const d=dev.dish; if (!d||!dev.done) return null; const res=d.res;
  if (res.kind==='new'){ addSpore(res.key,res.n); const base=res.key.split('~')[0], first=!S.known[base]; S.known[base]=1;
    if (res.key.includes('~')) S.known[res.key]=1;
    res.first=first; }
  if (res.kind==='villi') addInv('villi',1);
  dev.dish=null; dev.busy=false; dev.done=false; dev.t=0;
  if (res.kind==='new' && !S.flags.firstCross){ S.flags.firstCross=true; res.hint=HINT.firstCross; }
  else if (res.kind==='new' && res.key.includes('~') && !S.flags.mutation){ S.flags.mutation=true; res.hint=HINT.mutation; }
  const out={...res, a:d.a, b:d.b}; emit('malja-auki',{laite:dev, tulos:out}); save(); return out;
}

// ---------- kehikko ----------
export function startFrame(dev){
  if ((S.inv['raw:kalvo']||0)<DEVICES.kehikko.need) return;
  addInv('raw:kalvo',-DEVICES.kehikko.need); dev.busy=true; dev.done=false; dev.t=0; emit('laite-alku',{laite:dev, viesti:'KALVOHELTTA KASVAA KEHIKKOON'}); save();
}
export function collectDevice(dev){
  if (!dev.done) return;
  let viesti='';
  if (dev.type==='kehikko'){ addInv('suodatin',1); viesti='+1 ITIÖSUODATIN. ELÄVÄ HENGITYSKALVO.'; }
  dev.busy=false; dev.done=false; dev.t=0; emit('laite-keruu',{laite:dev, viesti}); save();
}

// ---------- markkina ----------
export function prodName(id){ const [k,s]=id.split(':');
  if (k==='raw') return STRAINS[s].name;
  if (k==='itio') return strain(s).short+'-ITIÖ'; if (k==='suodatin') return 'ITIÖSUODATIN'; if (k==='villi') return 'VILLI NÄYTE'; return id; }
export function basePrice(id){ return SELL_BASE[id.split(':')[0]]; }
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
  checkUnlocks(); save();
}
function marketTick(dt){
  const M=S.market, f=Math.pow(0.5, dt/SAT_HALF);
  for (const id in M.sat){ M.sat[id]*=f; if (M.sat[id]<0.01) delete M.sat[id]; }
  if (M.spike){ M.spike.left-=dt; if (M.spike.left<=0) M.spike=null; }
  M.nextSpike-=dt;
  if (M.nextSpike<=0){ M.nextSpike=SPIKE_EVERY;
    const pool=['raw:heltta','raw:ruusu'];
    for (const k in S.known){ if (k.includes('~')||!STRAINS[k]||STRAINS[k].auto) continue; pool.push('raw:'+k); }
    if (S.known.kalvo) pool.push('suodatin');
    M.spike={id:pool[(Math.random()*pool.length)|0], left:SPIKE_LEN};
    emit('kysyntapiikki',{tuote:M.spike.id, viesti:'KYSYNTÄPIIKKI: '+prodName(M.spike.id)+' ×2 KOLMEN TUNNIN AJAN'});
  }
}
export function buy(key){
  const it=SHOP[key]; if (!it || (it.need && !it.need(S))) return; const p=it.price(S); if (S.hopea<p) return;
  S.hopea-=p; let viesti='';
  if (it.kind==='vessel'){ S.bought[key]++; S.vesselInv.push(key); viesti='OSTIT: '+it.name+'. NAPAUTA VAPAATA RUUTUA'; }
  else if (it.kind==='device'){ S.deviceInv.push(key); viesti='OSTIT: '+it.name+'. NAPAUTA VAPAATA RUUTUA'; }
  else if (it.kind==='item'){ addInv(key,1); viesti='+1 '+it.name; }
  else if (it.kind==='room'){ S.rooms[key].owned=true; viesti='KELLARI ON NYT KÄYTÖSSÄ. VAIHDA TILAA ALHAALTA.'; }
  emit('osto',{tuote:key, hinta:p, viesti});
  if (key==='kehikko' && !S.order){ S.order={need:ORDER.need, given:0}; emit('tilaus-uusi',{tilaus:S.order, vihje:HINT.order}); }
  save();
}
export function checkUnlocks(){
  if (!S.flags.lab && S.sold>=LAB_UNLOCK_SOLD){ S.flags.lab=true; emit('avaus',{mita:'laboratorio', vihje:HINT.lab}); }
  retki.checkOpen();
}
export function deliver(){
  const o=S.order; if (!o||o.given>=o.need||!(S.inv.suodatin>0)) return;
  const n=Math.min(S.inv.suodatin, o.need-o.given); addInv('suodatin',-n); o.given+=n;
  if (o.given>=o.need && !S.flags.done){ S.flags.done=true; S.hopea+=ORDER.reward; emit('tilaus-valmis',{tilaus:o, palkkio:ORDER.reward}); }
  else emit('toimitus',{tilaus:o, n, viesti:'TILAUS: '+o.given+' / '+o.need+' SUODATINTA'});
  save();
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
  emit('sijoitus',{huone:roomKey, ruutu:i, esine:cells[i], viesti:(kind==='vessel'?VESSELS[type].name:DEVICES[type].name)+' ASETETTU'}); save(); return cells[i];
}
export function move(fromR, fi, toR, ti){
  const a=S.rooms[fromR].cells, b=S.rooms[toR].cells; if (b[ti]) { const t=b[ti]; b[ti]=a[fi]; a[fi]=t; } else { b[ti]=a[fi]; a[fi]=null; }
  emit('siirto',{mista:[fromR,fi], minne:[toR,ti], viesti:'SIIRRETTY'}); save();
}
