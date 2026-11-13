// TP7: paljastus 2.0. Yksi näytös hautomon maljalle, rihmaretken paluulle ja suodatintilaukselle.
// Pelilogiikka (sim.openDish, retki.collect) arpoo ja antaa tuloksen; tämä moduuli vain näyttää sen.
//
// Rajapinta:
//   pending()            jonossa odottavat paljastukset (valmiit maljat ja palannut retki)
//   queueOnOpen()        pelin avautuessa: jos jotain valmistui poissa ollessa, avaa jonon odotusnäkymään
//   openMalja(dev)       pelaaja napautti valmista hautomoa
//   openRetki()          pelaaja otti retken löydöt vastaan
//   showDone()           suodatintilaus täytetty (V1 läpäisty)
//   drawReveal(t)        piirto (ui.js render, kun U.view==='reveal')
// Tapahtumat: paljastus-alku {lahde, tulos}, paljastus-tulos {lahde, tulos} (äänet), paljastus-loppu {lahde, tulos}.
// Näytöksen vaiheet: himmennys → malja/rihmakimppu sykkii → kansi aukeaa ja itiöt pyörteilevät →
// kannan siluetti täyttyy väreillä alhaalta ylös → nimi ja tulos (sointu). Napautus hyppää tulokseen.
import {P, AMB, WILD, SYM, STRAINS, ORDER, CUR} from './data.js';
import {W, H, g, px, rect, rng, BAYER, clamp, ease, text, textC, tw, wrap, wrapLines, button, hit, LH, img} from './nat.js';
import {S, strain} from './state.js';
import * as sim from './sim.js';
import * as retki from './retki.js';
import {emit} from './events.js';
import {sprite} from './iso.js';
import {U} from './ui.js';
import * as naming from './naming.js';

const now = () => performance.now();
const AGAR = ['#6a6250', '#c9bc9c', '#efe6cc'];
const GOLD = ['#7a4a14', '#e8a02a', '#ffe08a', '#fff6d0'];
const CX = W/2, CY = 270;                     // maljan keskipiste
const RV = {queue:[], cur:null};              // cur = {lahde, res, t0, wait, dev, i, n, said}
export const state = RV;

// ---------- jono ----------
function doneDishes(){ const out = [];
  for (const r of ['huone','kellari']){ const R = S.rooms[r]; if (!R || !R.owned) continue;
    for (const c of R.cells) if (c && c.type === 'hautomo' && c.done && c.dish) out.push(c); }
  return out; }
export function pending(){ const st = retki.status(); return doneDishes().length + (st && st.back ? 1 : 0); }
// ensin maljat, sitten retki
function buildQueue(){ const q = doneDishes().map(dev => ({lahde:'malja', dev})); const st = retki.status();
  if (st && st.back) q.push({lahde:'retki'}); return q; }
export function queueOnOpen(){
  if (U.view === 'reveal') return;
  RV.queue = buildQueue(); if (!RV.queue.length) return;
  RV.total = RV.queue.length; next();
}
function next(){
  const it = RV.queue.shift(); if (!it){ RV.cur = null; return false; }
  RV.cur = {lahde:it.lahde, dev:it.dev, res:null, wait:true, t0:now(), i:RV.total - RV.queue.length, n:RV.total};
  U.modal = null; U.view = 'reveal'; return true;
}
// napautus odotusnäkymässä: tulos arvotaan/otetaan vastaan vasta nyt
function begin(){
  const c = RV.cur; let res = null;
  if (c.lahde === 'malja'){ res = c.dev && c.dev.done ? sim.openDish(c.dev) : null; }
  else if (c.lahde === 'retki'){ const r = retki.collect(); res = r ? {kind:'retki', ...r} : null; }
  if (!res){ finish(true); return; }
  start(c.lahde, res);
}
function start(lahde, res){
  // tuttu kanta: lyhyempi näytös
  const short = res.kind === 'new' && !res.first && !String(res.key).includes('~');
  RV.cur = {...(RV.cur || {}), lahde, res, wait:false, t0:now(), sp:short ? 1.7 : 1, said:false, nameDone:false};
  U.modal = null; U.view = 'reveal';
  emit('paljastus-alku', {lahde, tulos:res});
}
export function openMalja(dev){ if (!dev || !dev.done) return; RV.queue = []; RV.total = 1;
  RV.cur = {lahde:'malja', dev, i:1, n:1}; begin(); }
export function openRetki(){ RV.queue = []; RV.total = 1; RV.cur = {lahde:'retki', i:1, n:1}; begin(); }
export function showDone(){ RV.queue = []; RV.cur = {i:1, n:1}; start('tilaus', {kind:'done'}); }
function finish(skipEmit){
  const c = RV.cur;
  if (c && c.res && !skipEmit) emit('paljastus-loppu', {lahde:c.lahde, tulos:c.res});
  naming.close();
  if (!next()){ U.view = 'room'; RV.cur = null; }
}
// "myöhemmin": jono jää odottamaan (PALJASTUS-nappi huoneessa)
function later(){ RV.queue = []; RV.cur = null; U.view = 'room'; }

// ---------- piirtoapurit ----------
function dim(a){ const k = clamp(a, 0, 1); rect(0, 0, W, H, '#06080c');
  // reunoilta keskelle tummeneva pistekuvio (lämmin valo keskellä)
  if (k < 1) return;
  const r = rng(3);
  for (let n = 0; n < 220; n++){ const x = r()*W | 0, y = r()*H | 0; px(x, y, n % 9 ? '#0d121b' : '#141c28'); } }
function halo(cx, cy, rx, ry, col, amt, inner){
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++){
    const d = Math.hypot(x/rx, y/ry); if (d > 1 || d < (inner || 0)) continue;
    if (BAYER[(cy + y) & 3][(cx + x) & 3] < (1 - d)*16*amt) px(cx + x, cy + y, col); } }
const SIL = {};
// siluetti: kaikki näkyvät pikselit yhdellä värillä (välimuistissa)
function silhouette(s, col){ const key = s.c.width + 'x' + s.c.height + col + (s.key || '');
  if (s.sil && s.sil[col]) return s.sil[col];
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const q = c.getContext('2d');
  q.drawImage(s.c, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, s.w, s.h);
  (s.sil = s.sil || {})[col] = c; return c; }
function shroomSprite(key){ const b = strain(key).base; return sprite('sieni_' + b + '_kypsa'); }
// kannan sieni: siluetti tummana ja väri täyttyy alhaalta ylös (f 0..1). k = skaala.
function drawFill(key, cx, by, f, k, gold){
  const s = shroomSprite(key); if (!s) return;
  const w = s.w*k, h = s.h*k, x = Math.round(cx - w/2), y = Math.round(by - h);
    if (gold) img(silhouette(s, GOLD[2]), x - k, y, w, h), img(silhouette(s, GOLD[2]), x + k, y, w, h),
            img(silhouette(s, GOLD[2]), x, y - k, w, h), img(silhouette(s, GOLD[2]), x, y + k, w, h);
  img(silhouette(s, '#120d18'), x, y, w, h);
  const rows = Math.round(s.h*clamp(f, 0, 1));
  if (rows > 0) img(s.c, 0, s.h - rows, s.w, rows, x, y + h - rows*k, w, rows*k);
  // täyttymisen reuna hohtaa
  if (f > 0 && f < 1){ const ey = y + h - rows*k; rect(x, ey, w, 1, strain(key).col[2]); }
}
// agar-malja ylhäältä vinosti: soikea lasi, agar ja kansi
function dish(cx, cy, lid, glow, t){
  const rx = 74, ry = 30;
  halo(cx, cy, rx + 26, ry + 22, AMB[1], glow*(0.6 + 0.4*Math.sin(t*4)), 0.55);
  for (let y = -ry - 6; y <= ry + 6; y++) for (let x = -rx - 4; x <= rx + 4; x++){
    const d = (x*x)/((rx + 4)*(rx + 4)) + (y*y)/((ry + 6)*(ry + 6)); if (d > 1) continue;
    const e = (x*x)/(rx*rx) + (y*y)/(ry*ry);
    px(cx + x, cy + y, e > 1 ? (y > 0 ? '#5f6a70' : '#9fb2b8') : e > 0.82 ? AGAR[0] : (BAYER[(cy + y) & 3][(cx + x) & 3] < 3 ? '#3a3428' : '#2a2620')); }
  if (lid < 1){ const ly = Math.round(cy - 4 - ease(lid)*90), a = 1 - lid;
    for (let x = -rx - 6; x <= rx + 6; x++){ const yy = Math.round(Math.sqrt(Math.max(0, 1 - (x*x)/((rx + 6)*(rx + 6))))*(ry + 8));
      for (const s of [-1, 1]){ const Y = ly + s*yy; if (BAYER[Y & 3][(cx + x) & 3] < 16*a + 1) px(cx + x, Y, s < 0 ? '#e8f4f4' : '#9fb2b8'); } }
    if (a > 0.3) rect(cx - 30, ly - ry - 6, 60, 1, '#ffffff'); }
}
// rihmasto kasvaa kahdesta pisteestä; hylkiminen vetäytyy erilleen, villi leviää violettina
function mycel(cx, cy, A, B, grow, mode, t){
  const pts = [[cx - 30, A, rng(7)], [cx + 30, B, rng(9)]];
  pts.forEach(([sx, T, r], side) => {
    for (let n = 0; n < 18; n++){ let x = sx, y = cy, ang = r()*6.28; const len = Math.floor(grow*40*(0.6 + r()*0.6));
      for (let i = 0; i < len; i++){ ang += (r() - 0.5)*0.6; x += Math.cos(ang); y += Math.sin(ang)*0.45;
        if (mode === 'fail' && (side ? x < cx + 8 : x > cx - 8)) break;
        if ((x - cx)*(x - cx)/(70*70) + (y - cy)*(y - cy)/(26*26) > 1) break;
        const col = mode === 'villi' && i > len*0.45 ? WILD[1 + (i % 3 === 0 ? 1 : 0)] : T.col[i % 3 === 0 ? 2 : 1]; px(x, y, col); } } });
}
// villi violetti leviää maljan reunoilta
function wildSpread(cx, cy, f, t){ const r = rng(21);
  for (let n = 0; n < 260*f; n++){ const a = r()*6.283, d = 1 - r()*f*0.9; const x = cx + Math.cos(a)*70*d, y = cy + Math.sin(a)*26*d;
    px(x, y, n % 5 ? WILD[1] : WILD[2]); }
  if (f > 0.5) halo(cx, cy, 110, 60, WILD[1], (f - 0.5)*1.2, 0.5); }
// itiöpyörre kannen auetessa
function swirl(cx, cy, a, cols, n){
  const r = rng(13);
  for (let k = 0; k < n; k++){ const ph = r()*6.283, sp = 0.6 + r(), rr = 6 + (a*60*sp + k*3) % 120, ang = ph + a*(2 + r()*2);
    const x = cx + Math.cos(ang)*rr, y = cy - a*40*sp + Math.sin(ang)*rr*0.45; if (a*sp > 2.5) continue;
    px(x, y, cols[k % cols.length]); if (k % 4 === 0) px(x + 1, y, cols[k % cols.length]); } }
// kultainen purkaus
function goldBurst(cx, cy, a){ const r = rng(31);
  for (let k = 0; k < 90; k++){ const ang = r()*6.283, sp = 40 + r()*160, d = sp*ease(clamp(a*1.6, 0, 1));
    const x = cx + Math.cos(ang)*d, y = cy + Math.sin(ang)*d*0.7 + a*a*30; if (a > 1.6) continue;
    px(x, y, GOLD[1 + (k % 3)]); if (k % 3 === 0) px(x, y + 1, GOLD[2]); } }
// kantakirjan sivu välähtää (uusi kanta)
function bookFlash(x, y, a){ const on = a < 2 && Math.sin(a*12) > -0.2;
  rect(x, y, 22, 28, on ? AMB[2] : P.ui2); rect(x + 2, y + 2, 18, 24, on ? '#fff6dc' : P.ui1); rect(x + 11, y + 2, 1, 24, on ? AMB[1] : P.ui2);
  for (let k = 0; k < 4; k++){ rect(x + 4, y + 6 + k*5, 5, 1, P.uiD); rect(x + 14, y + 6 + k*5, 5, 1, P.uiD); } }

function resultTitle(res){
  if (res.kind === 'fail') return {s:'EI TULOSTA', col:P.uiD};
  if (res.kind === 'villi') return {s:'KONTAMINAATIO', col:WILD[2]};
  const T = strain(res.key);
  if (T.mutant) return {s:'MUTAATIO!', col:GOLD[2]};
  return {s:res.first ? 'UUSI KANTA!' : 'ONNISTUI', col:T.col[2]};
}

// ---------- piirto ----------
export function drawReveal(t){
  const c = RV.cur; if (!c){ U.view = 'room'; return; }
  if (c.wait) return drawWait(c, t);
  const res = c.res, a = (now() - c.t0)/1000*c.sp;
  if (res.kind === 'done') return drawDone(c, a, t);
  if (res.kind === 'retki') return drawRetki(c, a, t);
  drawDish(c, a, t);
}

// odotusnäkymä: malja tai rihmakimppu sykkii, napautus avaa
function drawWait(c, t){
  dim(1);
  const pulse = 0.5 + 0.5*Math.sin(t*3);
  if (c.lahde === 'malja'){ dish(CX, CY, 0, 0.7 + 0.3*pulse, t);
    textC('MALJA ON KYPSÄ', CX, 120, AMB[2], 2); }
  else { bundle(CX, CY, t, 0.7 + 0.3*pulse); textC('SYMBIONTTI PALASI', CX, 120, SYM, 2); }
  if (c.n > 1) textC(c.i + ' / ' + c.n, CX, 156, P.uiD);
  textC('NAPAUTA AVATAKSESI', CX, 400, Math.sin(t*4) > -0.3 ? AMB[2] : AMB[1]);
  hit(0, 40, W, 520, () => begin());
  button(CX - 60, 600, 120, 28, 'MYÖHEMMIN', () => later());
}
// rihmakimppu: symbiontin rihmat palaavat ovesta kerältä
function bundle(cx, cy, t, glow){
  halo(cx, cy, 90, 70, SYM, glow*0.6, 0);
  const r = rng(5);
  for (let n = 0; n < 40; n++){ let ang = r()*6.283, x = cx + Math.cos(ang)*6, y = cy + Math.sin(ang)*4; const len = 30 + r()*40;
    for (let i = 0; i < len; i++){ ang += (r() - 0.5)*0.5 + Math.sin(t*1.5 + n)*0.02; x += Math.cos(ang)*0.9; y += Math.sin(ang)*0.6;
      px(x, y, i % 6 ? '#34b8ac' : SYM); } }
  rect(cx - 3, cy - 3, 7, 7, SYM); rect(cx - 2, cy - 2, 5, 5, '#e8fff0');
}

// maljan näytös: kansi → itiöt → siluetti → tulos
function drawDish(c, a, t){
  const res = c.res, A = strain(res.a), B = strain(res.b);
  const T = res.kind === 'new' ? strain(res.key) : null, mut = T && T.mutant;
  const fail = res.kind === 'fail', villi = res.kind === 'villi';
  const RES = fail ? 3.2 : 3.4;                       // tuloksen hetki
  dim(1);
  // tuloksen hohde kannan takana (piirretään ensin, ettei se peitä sientä)
  if (T && a >= RES){ const pulse = 0.5 + 0.5*Math.sin(a*3); halo(CX, CY - 40, 130, 100, mut ? GOLD[2] : T.col[2], 0.35 + 0.3*pulse, 0); }
  text(A.short + ' × ' + B.short, 8, 8, P.uiD);
  const lid = clamp((a - 0.9)/0.7, 0, 1);
  const glowA = a < 0.9 ? 0.4 + 0.6*Math.abs(Math.sin(a*5)) : clamp(1.6 - a, 0, 1);
  dish(CX, CY, lid, glowA, t);
  // rihmasto kasvaa
  const grow = clamp((a - 1.2)/1.2, 0, 1);
  if (fail){ const back = clamp((a - 2.3)/0.8, 0, 1); mycel(CX - back*14, CY, A, B, grow*(1 - back*0.6), 'fail', t);
    if (back > 0) mycel(CX + back*14, CY, B, A, 0, 'fail', t); }
  else mycel(CX, CY, A, B, grow*(villi ? 1 : 1 - clamp((a - 2.2)/0.6, 0, 0.8)), villi ? 'villi' : 'ok', t);
  if (villi) wildSpread(CX, CY, clamp((a - 2.0)/1.2, 0, 1), t);
  // itiöpyörre kannen auetessa
  if (lid > 0 && a < 3.6) swirl(CX, CY - 6, a - 0.9, villi ? [WILD[1], WILD[2], A.col[2]] : [A.col[2], B.col[2], '#e8fff0'], 70);
  // siluetti täyttyy alhaalta ylös
  if (T){ const f = clamp((a - 2.2)/1.1, 0, 1), shown = clamp((a - 1.9)/0.3, 0, 1);
    if (shown > 0) drawFill(res.key, CX, CY + 4, f, 3, mut && a > RES); }
  if (a < RES){ if (a < 0.9) textC('MALJA AUKEAA...', CX, 400, P.uiD);
    hit(0, 0, W, H, () => { c.t0 = now() - (RES + 0.05)*1000/c.sp; }); return; }
  // ---- tulos ----
  if (!c.said){ c.said = true; emit('paljastus-tulos', {lahde:c.lahde, tulos:res}); }
  const b = a - RES, rt = resultTitle(res);
  if (mut) goldBurst(CX, CY - 40, b);
  textC(rt.s, CX, 60, rt.col, 2);
  let y = 370;
  if (T){
    const nm = (mut && c.nameDone && S.names[res.key]) ? S.names[res.key] : T.name;
    wrapLines(nm, W - 40).forEach(l => { textC(l, CX, y, mut ? GOLD[2] : T.col[2], 2); y += 2*LH + 2; });
    if (mut){ textC(T.orig, CX, y, GOLD[1]); y += LH + 2; }
    textC('+' + res.n + ' ITIÖPUSSIA', CX, y + 2, P.ui3); y += LH + 8;
    if (res.first){ textC('UUSI KANTA KANTAKIRJAAN', CX, y, AMB[2]); bookFlash(W - 40, 54, b); y += LH + 4; }
    if (res.hint && !mut && !res.first) wrap(res.hint, 24, y + 4, W - 48, SYM);
  } else if (fail){
    wrap('RIHMASTOT HYLKIVÄT TOISIAAN. ' + A.short + ' JA ' + B.short + ' EIVÄT SOVI YHTEEN. PARI MERKITTIIN HAUTOMOON YLIVIIVATTUNA.', 24, y, W - 48, P.ui3);
  } else {
    textC('+1 VILLI NÄYTE', CX, y, WILD[2], 2); y += 2*LH + 6;
    wrap('VILLI ITIÖ PÄÄSI MALJAAN JA VALTASI SEN. MARKKINA MAKSAA NÄYTTEESTÄ HYVIN.', 24, y, W - 48, P.ui3);
  }
  // mutaatio: nimeäminen ennen jatkamista
  if (mut && !c.nameDone){
    if (b > 0.9){ if (!naming.isOpen()) naming.open(res.key, res.suggest || sim.suggestName(res.key), () => { c.nameDone = true; });
      naming.draw(t, 470); }
    return;
  }
  if (b > 0.5) button(CX - 70, 600, 140, 30, RV.queue.length ? 'SEURAAVA' : 'JATKA', () => finish(), 'a');
}

// retken paluu: löydöt nousevat rihmakimpusta yksi kerrallaan
function drawRetki(c, a, t){
  const res = c.res, loot = res.loot, by = 330;
  dim(1);
  text(res.tyyppi === 'syva' ? 'SYVÄ RETKI' : 'LYHYT RETKI', 8, 8, P.uiD);
  bundle(CX, by, t, a < 0.9 ? 0.4 + 0.6*Math.abs(Math.sin(a*5)) : 0.5);
  const step = 0.9, RES = 1.0 + loot.length*step;
  textC('SYMBIONTTI PALASI', CX, 60, SYM, 2);
  loot.forEach((o, k) => {
    const s = clamp((a - 1.0 - k*step)/0.7, 0, 1); if (s <= 0) return;
    const n = loot.length, tx = CX + (k - (n - 1)/2)*120, ty = 220, x = CX + (tx - CX)*ease(s), y = by + (ty - by)*ease(s);
    // rihma kimpusta löytöön
    for (let i = 0; i <= 30; i++){ const f = i/30; px(CX + (x - CX)*f + Math.sin(f*8 + t*2 + k)*3, by + (y - by)*f, i % 3 ? '#34b8ac' : SYM); }
    lootIcon(o, x, y, s, a);
    if (s >= 1){ let ly = y + 40;
      wrapLines(retki.lootName(o), 110).forEach(l => { textC(l, x, ly, lootCol(o)); ly += LH + 1; });
      if (o.first){ textC('UUSI KANTA!', x, ly + 2, AMB[2]); }
      else if (o.kind === 'vessel') textC('HARVINAINEN', x, ly + 2, P.uiD);
      else if (o.kind === 'spore' && o.key.includes('~')) textC('MUTAATIOHERKKÄ', x, ly + 2, GOLD[1]); }
  });
  if (a < RES + 0.3){ hit(0, 0, W, H, () => { c.t0 = now() - (RES + 0.35)*1000; }); return; }
  if (!c.said){ c.said = true; emit('paljastus-tulos', {lahde:'retki', tulos:res}); }
  if (loot.some(o => o.first)){ textC('UUSI KANTA KANTAKIRJAAN', CX, 420, AMB[2]); bookFlash(W - 40, 54, a - RES); }
  if (loot.some(o => o.kind === 'vessel')) textC('ASETA ASTIA RUUTUUN RAKENNUSTILASSA.', CX, 440, P.uiD);
  button(CX - 70, 600, 140, 30, RV.queue.length ? 'SEURAAVA' : 'JATKA', () => finish(), 'a');
}
function lootCol(o){ if (o.kind === 'spore'){ const T = strain(o.key); return T.mutant ? GOLD[2] : T.col[2]; }
  if (o.kind === 'item') return o.id === 'villi' ? WILD[2] : AGAR[2]; return P.gl3; }
function lootIcon(o, x, y, s, a){
  if (o.kind === 'spore'){ const T = strain(o.key); halo(x | 0, y | 0, 34, 30, T.mutant ? GOLD[2] : T.col[2], 0.45*s, 0);
    drawFill(o.key, x, y + 24, s >= 1 ? clamp((a - 1)/0.6, 0.15, 1) : 0, 1, T.mutant); return; }
  const pal = o.kind === 'item' ? (o.id === 'villi' ? WILD : AGAR) : [P.gl1, P.gl2, P.gl3];
  halo(x | 0, y | 0, 30, 26, pal[2], 0.4*s, 0);
  if (o.kind === 'vessel'){ rect(x - 12, y - 16, 24, 32, pal[1]); rect(x - 10, y - 14, 20, 28, pal[0]); rect(x - 12, y - 16, 24, 2, pal[2]); }
  else { rect(x - 10, y - 6, 20, 12, pal[1]); rect(x - 8, y - 4, 16, 8, pal[2]); }
}

// suodatintilaus täytetty
function drawDone(c, a, t){
  dim(1);
  for (let k = 0; k < 120; k++){ const ang = k*0.7 + a*0.3, rr = (a*80 + k*7) % 280; px(CX + Math.cos(ang)*rr, CY + Math.sin(ang)*rr*0.8, k % 3 ? SYM : AMB[2]); }
  if (a > 0.8) textC('V1 LÄPÄISTY', CX, CY - 20, AMB[2], 2);
  if (a > 1.6) wrap('TORIN VÄKI SAI SUODATTIMENSA. +' + ORDER.reward + ' ' + CUR + '.', 40, CY + 30, W - 80, P.ui3);
  if (!c.said && a > 0.8){ c.said = true; emit('paljastus-tulos', {lahde:'tilaus', tulos:c.res}); }
  if (a > 2.2) button(CX - 70, 600, 140, 30, 'JATKA', () => finish(), 'a');
  else hit(0, 0, W, H, () => { c.t0 = now() - 2300; });
}
