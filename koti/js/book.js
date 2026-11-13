// TP7: kantakirja ja sukupuu. Kaikki 7 kantaa ja pelaajan mutaatiot; löytämättömät ???-paikkoina.
// Näkymä U.view==='book', alinäkymä U.book = {tab:'lista'|'puu', page:avain|null, p:sivunumero}.
// Hehku = pelattavaa: KANNAT-nappi hehkuu vain, kun kirjassa on uutta (newCount() > 0).
import {P, AMB, STRAINS, STRAIN_ORDER, ORIGIN_TXT, RECIPES, VESSELS, FRAME, PRODUCTS, SELL_BASE, CUR, MATCH_MULT} from './data.js';
import {W, H, g, px, rect, text, textC, tw, wrap, wrapLines, button, hit, fmt, LH, img} from './nat.js';
import {S, save, strain} from './state.js';
import {sprite} from './iso.js';
import {U} from './ui.js';
import * as naming from './naming.js';
import * as sim from './sim.js';

const GOLD = ['#7a4a14', '#e8a02a', '#ffe08a'];
const TOP = 32, BOT = 540;                   // sisältöalue yläpalkin ja alapaneelin välissä
const B = () => (U.book = U.book || {tab:'lista', page:null, p:0});

// kirjan avaimet: perus 7 + tunnetut mutaatiot kantansa perään
export function keys(){ const out = [];
  for (const k of STRAIN_ORDER){ out.push(k); for (const p of ['grow','yield']) if (S.known[k + '~' + p]) out.push(k + '~' + p); }
  return out; }
export function newKeys(){ return keys().filter(k => S.known[k] && !S.book.seen[k]); }
export const newCount = () => newKeys().length;
function markSeen(k){ if (S.known[k] && !S.book.seen[k]){ S.book.seen[k] = 1; save(); } }
export function open(){ const b = B(); b.page = null; U.view = 'book'; }
function leave(){ for (const k of keys()) if (S.known[k]) S.book.seen[k] = 1; save(); naming.close(); U.view = 'room'; U.book.page = null; }

// ---------- tiedot ----------
const climate = T => (T.wet ? 'KOSTEA' : 'KUIVA') + ' / ' + (T.warm ? 'LÄMMIN' : 'VIILEÄ');
function bestVessel(T){ const v = Object.keys(VESSELS).filter(k => VESSELS[k].wet === T.wet && VESSELS[k].warm === T.warm); return v.map(k => VESSELS[k].name).join(', ') || '-'; }
function hours(sec){ const m = Math.round(sec/60); return m >= 60 ? (m % 60 ? Math.floor(m/60) + ' H ' + (m % 60) + ' MIN' : (m/60) + ' H') : m + ' MIN'; }
function parentsOf(base){ return RECIPES.find(r => r.out === base) || null; }
function origin(k){ const T = strain(k);
  if (T.mutant) return 'MUTAATIO: ' + STRAINS[T.base].name;
  const r = parentsOf(k); if (r) return 'RISTEYTYS: ' + STRAINS[r.a].name + ' × ' + STRAINS[r.b].name;
  return ORIGIN_TXT[k] === 'LÖYTYY ULKOA' ? 'RIHMARETKELTÄ' : (ORIGIN_TXT[k] || '-'); }
// löytämättömän vihje: tunnettu puolisko (vain yksi, ettei resepti paljastu)
function hintOf(k){ const r = parentsOf(k);
  if (!r) return k === 'hamara' ? 'LÖYTYY RIHMARETKELTÄ' : '';
  const a = S.known[r.a], b = S.known[r.b];
  if (a || b) return 'TOINEN PUOLISKO: ' + STRAINS[a ? r.a : r.b].name;
  return 'RISTEYTYS. ETSI ENSIN VANHEMMAT.'; }
const colOf = k => { const T = strain(k); return T.mutant ? GOLD[2] : T.col[2]; };

// ---------- sienen kuva ----------
function shroom(k, cx, by, sc, known){
  const s = sprite('sieni_' + k.split('~')[0] + '_kypsa'); if (!s) return;
    const w = s.w*sc, h = s.h*sc, x = Math.round(cx - w/2), y = Math.round(by - h);
  if (!known){ g.globalAlpha = 1; img(sil(s), x, y, w, h); return; }
  img(s.c, x, y, w, h);
  if (k.includes('~')){ rect(x + w - 2, y, 4, 4, GOLD[2]); rect(x + w - 1, y + 1, 2, 2, GOLD[1]); }
}
function sil(s){ if (s.silBook) return s.silBook; const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const q = c.getContext('2d');
  q.drawImage(s.c, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#1f2a38'; q.fillRect(0, 0, s.w, s.h); return (s.silBook = c); }
function frame(x, y, w, h, col, fill){ rect(x, y, w, h, fill || P.ui0); rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, P.ui1); rect(x, y, 1, h, P.ui1); rect(x + w - 1, y, 1, h, P.ui1); }

// ---------- piirto ----------
export function drawBook(t){
  const b = B();
  rect(0, TOP - 4, W, BOT - TOP + 4, P.bg1);
  if (b.page) return drawPage(b.page, t);
  // välilehdet
  const tw2 = (W - 24)/2;
  button(8, TOP, tw2, 24, 'KANNAT', () => { b.tab = 'lista'; }, b.tab === 'lista' ? 'g' : 'n');
  button(16 + tw2, TOP, tw2, 24, 'SUKUPUU', () => { b.tab = 'puu'; }, b.tab === 'puu' ? 'g' : 'n');
  if (b.tab === 'puu') drawTree(t); else drawList(t);
  button(8, 628, 120, 30, '< TAKAISIN', leave);
}

// kortit 3 × 3 sivulla
function drawList(t){
  const b = B(), ks = keys(), PER = 9, pages = Math.ceil(ks.length/PER); b.p = Math.min(b.p || 0, pages - 1);
  const known = STRAIN_ORDER.filter(k => S.known[k]).length;
  text('KANTOJA ' + known + ' / ' + STRAIN_ORDER.length, 8, TOP + 34, P.uiD);
  const mut = ks.filter(k => k.includes('~')).length; if (mut){ const s = 'MUTAATIOITA ' + mut; text(s, W - 8 - tw(s), TOP + 34, GOLD[1]); }
  const cw = 118, ch = 144, x0 = 8, y0 = TOP + 50;
  ks.slice(b.p*PER, (b.p + 1)*PER).forEach((k, n) => {
    const x = x0 + (n % 3)*(cw + 5), y = y0 + ((n/3) | 0)*(ch + 6), kn = !!S.known[k], T = strain(k), isNew = kn && !S.book.seen[k];
    frame(x, y, cw, ch, isNew ? AMB[2] : kn ? (T.mutant ? GOLD[1] : T.col[1]) : P.ui1);
    if (isNew && Math.sin(t*4) > -0.2){ rect(x + cw - 34, y + 4, 30, 11, AMB[1]); text('UUSI', x + cw - 31, y + 6, P.ui0); }
    shroom(k, x + cw/2, y + 96, 2, kn);
    if (!kn) textC('???', x + cw/2, y + 50, P.uiD, 2);
    const nm = kn ? T.short : '???';
    wrapLines(nm, cw - 8).slice(0, 2).forEach((l, i) => textC(l, x + cw/2, y + 104 + i*(LH + 2), kn ? colOf(k) : P.uiD));
    if (kn && T.mutant) textC(T.perk === 'grow' ? 'KASVU +25%' : 'SATO +1', x + cw/2, y + 128, GOLD[1]);
    else if (kn && !T.auto) textC(fmt(T.price) + ' ' + CUR.slice(0, 1), x + cw/2, y + 128, P.uiD);
    hit(x, y, cw, ch, () => { B().page = k; markSeen(k); });
  });
  if (pages > 1) button(W - 88, 628, 80, 30, (b.p + 1) + ' / ' + pages + ' >', () => { b.p = (b.p + 1) % pages; });
  const tried = Object.keys(S.tried).length;
  wrap('UUSIA KANTOJA SYNTYY, KUN KAKSI ITIÖPUSSIA KYPSYY SAMALLA AGAR-MALJALLA. KOKEILTUJA PAREJA: ' + tried + '.', 8, 556, W - 16, P.uiD);
}

// sukupuu: kannat solmuina, risteytykset viivoina vanhemmista lapseen, mutaatiot kultaisina haaroina
const NODE = {heltta:[64, 100], ruusu:[192, 100], hamara:[320, 100], kalvo:[128, 250], yoruusu:[256, 250], hoitaja:[192, 380], verkko:[288, 470]};
const BUS = {kalvo:170, yoruusu:190, hoitaja:320, verkko:420};
function drawTree(t){
  const kn = k => !!S.known[k];
  // viivat: pystyviiva vanhemmista väylälle ja väylältä lapseen
  for (const r of RECIPES){ const [cx, cy] = NODE[r.out], by = BUS[r.out], on = kn(r.out);
    const col = on ? STRAINS[r.out].col[1] : P.ui2, dash = !on;
    const vline = (x, y0, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (!dash || (y & 3) < 2) rect(x, y, 2, 1, col); };
    const hline = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (!dash || (x & 3) < 2) rect(x, y, 1, 2, col); };
    const ps = [NODE[r.a], NODE[r.b]];
    for (const [px0, py0] of ps) vline(px0, py0 + 26, by);
    hline(Math.min(ps[0][0], ps[1][0], cx), Math.max(ps[0][0], ps[1][0], cx), by);
    vline(cx, by, cy - 30);
    if (on){ rect(cx - 2, by - 2, 6, 6, col); }
  }
  for (const k of Object.keys(NODE)){ const [x, y] = NODE[k], on = kn(k), T = STRAINS[k], isNew = on && !S.book.seen[k];
    frame(x - 26, y - 30, 52, 56, isNew ? AMB[2] : on ? T.col[1] : P.ui1, P.ui0);
    shroom(k, x, y + 20, 1, on);
    if (!on) textC('?', x, y - 8, P.uiD, 2);
    textC(on ? T.name : '???', x, y + 30, on ? T.col[2] : P.uiD);
    hit(x - 30, y - 32, 60, 72, () => { B().page = k; markSeen(k); });
    // mutaatiot haarautuvat oikealle kultaisina
    ['grow','yield'].forEach((p, j) => { const mk = k + '~' + p; if (!S.known[mk]) return;
      const mx = x + 34 + j*0, my = y - 22 + j*22;
      rect(x + 26, my + 6, 8, 2, GOLD[1]);
      frame(mx, my, 18, 16, !S.book.seen[mk] ? AMB[2] : GOLD[1], '#2a1e0c'); textC(p === 'grow' ? 'P' : 'K', mx + 9, my + 5, GOLD[2]);
      hit(mx - 2, my - 2, 22, 20, () => { B().page = mk; markSeen(mk); }); });
  }
  const fails = Object.keys(S.tried).filter(p => S.tried[p] === 'fail');
  let y = 510;
  if (fails.length){ text('HYLKIVÄT PARIT:', 8, y, P.uiD); y += LH + 4;
    const s = fails.map(p => p.split('+').map(k => STRAINS[k] ? STRAINS[k].name : k).join(' × ')).join(', ');
    wrap(s, 8, y, W - 16, '#c4428f'); }
  else wrap('NAPAUTA KANTAA. KULTAISET HAARAT OVAT MUTAATIOITA (P = PIKA, K = KULTA).', 8, y, W - 16, P.uiD);
}

// kannan sivu
function drawPage(k, t){
  const T = strain(k), kn = !!S.known[k], b = B();
  frame(8, TOP, W - 16, 500, kn ? (T.mutant ? GOLD[1] : T.col[1]) : P.ui1, P.ui0);
  // kuva
  rect(20, TOP + 14, 130, 170, '#0b1018');
  shroom(k, 85, TOP + 172, 3, kn);
  let x = 162, y = TOP + 16;
  if (!kn){
    textC('???', 85, TOP + 70, P.uiD, 3);
    text('TUNTEMATON KANTA', x, y, P.uiD); y += LH + 10;
    wrap(hintOf(k), x, y, W - x - 20, P.ui3);
  } else {
    wrapLines(T.name, W - x - 20).forEach(l => { text(l, x, y, colOf(k), 2); y += 2*LH + 4; });
    if (T.mutant){ wrap(T.orig, x, y, W - x - 20, GOLD[1]); y += 2*(LH + 2); }
    else { text(T.txt, x, y, P.uiD); y += LH + 6; }
    const sp = S.spores[k] || 0; text('ITIÖITÄ: ' + sp, x, y + 4, sp ? P.ui3 : P.uiD);
    // tiedot
    const rows = [['ILMASTO', climate(T)], ['PARAS ASTIA', bestVessel(T)]];
    if (T.auto) rows.push(['TEHTÄVÄ', 'HOITAA NAAPUREITA: EIVÄT KUIVU, KASVU +10%']);
    else { rows.push(['KASVUAIKA', hours(T.grow) + ' / AALTO'], ['SATO', T.yield + ' / AALTO (PARHAASSA ' + Math.max(1, Math.round(T.yield*MATCH_MULT[2])) + ')'],
      ['MYYNTIARVO', fmt(T.price) + ' ' + CUR + ' / KPL']); }
    const F = FRAME[T.base]; if (F) rows.push(['MUOTTI', F.need + ' SATOA > ' + PRODUCTS[F.out].name + ' (' + SELL_BASE[F.out] + ' ' + CUR + ')']);
    rows.push(['ALKUPERÄ', origin(k)]);
    y = TOP + 200;
    for (const [a, v] of rows){ text(a, 22, y, P.uiD); const n = wrap(v, 130, y, W - 150, P.ui3); y += Math.max(1, n)*(LH + 3) + 7; }
    // mitä tästä voi risteyttää (vain tunnetut tulokset)
    const kids = RECIPES.filter(r => (r.a === T.base || r.b === T.base) && S.known[r.out]).map(r => STRAINS[r.out].name);
    if (kids.length){ text('RISTEYTYKSISSÄ', 22, y, P.uiD); wrap(kids.join(', '), 130, y, W - 150, P.ui3); y += LH + 10; }
    if (T.mutant){
      if (naming.isOpen()) naming.draw(t, 380);
      else button(W - 200, TOP + 456, 180, 30, 'NIMEÄ UUDELLEEN', () => naming.open(k, S.names[k] || sim.suggestName(k), () => {}), 'n');
    }
  }
  button(8, 628, 120, 30, '< KIRJA', () => { naming.close(); b.page = null; });
}
