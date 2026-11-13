// rihmaretki (TP5): symbiontti kurottaa rihmansa kodin ovesta villiin ja palaa löytöjen kanssa.
// Simuloi ulkopeliä tässä protossa. Puhdasta pelilogiikkaa ilman DOM:ia, jotta simulaattori voi ajaa sen.
//
// Rajapinta (myös talouden simulaattorin botille):
//   RETKET                  retkityyppien luvut (lyhyt, syva)
//   retkiOpen()             onko ovi auki (ensimmäinen myynti tehty)
//   canStart(tyyppi)        voiko retken aloittaa nyt (ovi auki, ei retkeä käynnissä, syvälle 1 suodatin)
//   start(tyyppi)           lähettää symbiontin retkelle, palauttaa true/false
//   status()                null | {tyyppi, t (0..1), left (pelisekunteja), back (palannut)}
//   collect()               ottaa löydöt vastaan, kun symbiontti on palannut; palauttaa {tyyppi, loot:[...]} tai null
//   tick(dt)                etenee pelisekunteina (sim.tick kutsuu)
// Löytö on {kind:'spore', key, n} | {kind:'item', id:'villi'|'agar', n} | {kind:'vessel', key}.
// Tallennus: S.retki = {cur:null|{type, t, back}, n, deep}, lippu S.flags.retki.
import {STRAINS, VESSELS} from './data.js';
import {S, save, addInv, addSpore} from './state.js';
import {emit} from './events.js';

export const RETKET = {
  lyhyt:{name:'LYHYT RETKI', time:7200,  cost:null,       txt:'2 H. LÄHIKORTTELIT. HÄMÄRÄNUPPI, VILLI NÄYTE TAI AGAR-MALJA.'},
  syva: {name:'SYVÄ RETKI',  time:28800, cost:'suodatin', txt:'8 H. SYVÄ VILLI. KULUTTAA 1 ITIÖSUODATTIMEN. HARVINAISIA LÖYTÖJÄ.'}
};
export const OPEN_SOLD = 1;       // ovi aukeaa ensimmäisestä myynnistä
export const HAMARA_BY = 3;       // hämäränuppi taattu viimeistään 3. retkeltä
export const HAMARA_P = 0.45;     // muuten todennäköisyys lyhyellä retkellä, kunnes kanta on tunnettu

export function retkiOpen(){ return !!S.flags.retki; }
export function checkOpen(){
  if (!S.flags.retki && S.sold>=OPEN_SOLD){ S.flags.retki=true;
    emit('avaus',{mita:'retki', vihje:'OVI ON AUKI. VOIN KUROTTAA RIHMANI ULOS JA TUODA LÖYTÖJÄ. NAPAUTA OVEA.'}); }
}
export function canStart(type){
  const R=RETKET[type]; if (!R || !retkiOpen() || S.retki.cur) return false;
  if (R.cost && !((S.inv[R.cost]||0)>0)) return false;
  return true;
}
export function start(type){
  if (!canStart(type)) return false; const R=RETKET[type];
  if (R.cost) addInv(R.cost,-1);
  S.retki.cur={type, t:0, back:false};
  emit('retki-alku',{retki:type, viesti:'SYMBIONTTI LÄHTI: '+R.name+' ('+(R.time/3600)+' H)'}); save(); return true;
}
export function status(){ const c=S.retki.cur; if (!c) return null;
  return {tyyppi:c.type, t:c.t, left:(1-c.t)*RETKET[c.type].time, back:c.back}; }
export function tick(dt){
  const c=S.retki && S.retki.cur; if (!c || c.back) return;
  c.t += dt/RETKET[c.type].time;
  if (c.t>=1){ c.t=1; c.back=true; emit('retki-palasi',{retki:c.type, viesti:'SYMBIONTTI PALASI RETKELTÄ. NAPAUTA OVEA.'}); }
}

const pick = list => { let s=0; for (const o of list) s+=o.w; let r=Math.random()*s;
  for (const o of list){ r-=o.w; if (r<=0) return o; } return list[list.length-1]; };
// löydöt arvotaan, kun symbiontti palaa ja pelaaja ottaa ne vastaan
function roll(type){
  const loot=[], n=S.retki.n+1;   // monesko retki
  const needHamara = !S.known.hamara && (n>=HAMARA_BY || (type==='lyhyt' && Math.random()<HAMARA_P));
  if (type==='lyhyt'){
    if (needHamara) loot.push({kind:'spore', key:'hamara', n:2});
    else loot.push(pick([
      {w:S.known.hamara?3:0, v:{kind:'spore', key:'hamara', n:1+(Math.random()<0.5?1:0)}},
      {w:3,                  v:{kind:'item', id:'villi', n:1}},
      {w:S.flags.lab?4:0,    v:{kind:'item', id:'agar', n:2}},
      {w:S.flags.lab?0:2,    v:{kind:'spore', key:Math.random()<0.5?'heltta':'ruusu', n:2}}
    ].filter(o=>o.w>0)).v);
  } else {
    // syvä: ensimmäinen syvä retki tuo aina harvinaisen astian
    const base = Object.keys(STRAINS).filter(k=>S.known[k] && !STRAINS[k].auto);
    const opts = [
      {w:3, v:()=>({kind:'vessel', key:Math.random()<0.5?'akvaario':'palvelin'})},
      {w:3, v:()=>({kind:'item', id:'villi', n:2+(Math.random()<0.5?1:0)})},
      {w:base.length?3:0, v:()=>({kind:'spore', key:base[(Math.random()*base.length)|0]+'~'+(Math.random()<0.5?'grow':'yield'), n:2})}
    ].filter(o=>o.w>0);
    loot.push(S.retki.deep===0 ? opts[0].v() : pick(opts).v());
    if (needHamara) loot.push({kind:'spore', key:'hamara', n:2});
  }
  return loot;
}
export function lootName(o){
  if (o.kind==='vessel') return VESSELS[o.key].name;
  if (o.kind==='item') return o.n+' × '+(o.id==='villi'?'VILLI NÄYTE':'AGAR-MALJA');
  const [b,perk]=o.key.split('~'); return o.n+' × '+STRAINS[b].name+(perk?' (M)':'')+'-ITIÖ';
}
export function collect(){
  const c=S.retki.cur; if (!c || !c.back) return null;
  const loot=roll(c.type);
  for (const o of loot){
    if (o.kind==='spore'){ addSpore(o.key,o.n); const b=o.key.split('~')[0]; o.first=!S.known[b]; S.known[b]=1; if (o.key.includes('~')) S.known[o.key]=1; }
    else if (o.kind==='item') addInv(o.id,o.n);
    else S.vesselInv.push(o.key);
  }
  S.retki.n++; if (c.type==='syva') S.retki.deep++;
  S.retki.cur=null;
  const res={tyyppi:c.type, loot};
  emit('retki-loyto',{retki:c.type, loot}); save(); return res;
}
