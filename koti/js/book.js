// TP7: kantakirja ja sukupuu. V2.2: seitsemän pohjakantaa ja pelaajan omat risteymät ja mutaatiot genomeineen.
// Näkymä U.view==='book', alinäkymä U.book = {tab:'lista'|'puu', page:avain|null, p:sivunumero, focus:sukupuun kanta}.
// Hehku = pelattavaa: KANNAT-nappi hehkuu vain, kun kirjassa on uutta (newCount() > 0).
import {P, AMB, WILD, STRAINS, STRAIN_ORDER, ORIGIN_TXT, VESSELS, PRODUCTS, SELL_BASE, CUR, MATCH_MULT, MUT_NAME} from './data.js';
import {W, H, LAY, g, px, rect, text, textC, tw, wrap, wrapLines, button, hit, fmt, LH, img} from './nat.js';
import {S, save, strain, knows} from './state.js';
import {traitRows} from './genomi.js';
import {strainSprite} from './iso.js';
import {U} from './ui.js';
import * as naming from './naming.js';
import * as sim from './sim.js';

const GOLD = ['#7a4a14', '#e8a02a', '#ffe08a'];
const TOP = 32, BOT = 540;                   // sisältöalue yläpalkin ja alapaneelin välissä
const B = () => (U.book = U.book || {tab:'lista', page:null, p:0, focus:null});

// kirjan avaimet: seitsemän pohjakantaa ja sen jälkeen pelaajan omat kannat syntymäjärjestyksessä
const own = () => Object.keys(S.kannat).filter(k => S.known[k]);
export function keys(){ return [...STRAIN_ORDER, ...own()]; }
export function newKeys(){ return keys().filter(k => S.known[k] && !S.book.seen[k]); }
export const newCount = () => newKeys().length;
function markSeen(k){ if (S.known[k] && !S.book.seen[k]){ S.book.seen[k] = 1; save(); } }
export function open(){ const b = B(); b.page = null; U.view = 'book'; }
function leave(){ for (const k of keys()) if (S.known[k]) S.book.seen[k] = 1; save(); naming.close(); U.view = 'room'; U.book.page = null; }

// ---------- tiedot ----------
function bestVessel(T){ const v = Object.keys(VESSELS).filter(k => VESSELS[k].wet === T.wet && VESSELS[k].warm === T.warm); return v.map(k => VESSELS[k].name).join(', ') || '-'; }
function hours(sec){ const m = Math.round(sec/60); return m >= 60 ? (m % 60 ? Math.floor(m/60) + ' H ' + (m % 60) + ' MIN' : (m/60) + ' H') : m + ' MIN'; }
const nameOf = k => { const T = strain(k); return T ? T.short : '?'; };
function origin(k){ const T = strain(k);
  if (STRAINS[k]) return ORIGIN_TXT[k] || '-';
  if (T.villi) return 'VILLI LINJA RETKELTÄ: ' + nameOf(T.pa);
  if (!T.pb) return 'MUTAATIO: ' + nameOf(T.pa);
  return nameOf(T.pa) + ' × ' + nameOf(T.pb); }
const colOf = k => { const T = strain(k); return T.mutant ? GOLD[2] : T.col[2]; };
const parents = k => { const T = strain(k); return T && !STRAINS[k] ? [T.pa, T.pb].filter(Boolean) : []; };

// ---------- sienen kuva ----------
function shroom(k, cx, by, sc, known){
  const s = strainSprite(k); if (!s) return;
    const w = s.w*sc, h = s.h*sc, x = Math.round(cx - w/2), y = Math.round(by - h);
  if (!known){ g.globalAlpha = 1; img(sil(s), x, y, w, h); return; }
  img(s.c, x, y, w, h);
  if (strain(k).mutant){ rect(x + w - 2, y, 4, 4, GOLD[2]); rect(x + w - 1, y + 1, 2, 2, GOLD[1]); }
}
function sil(s){ if (s.silBook) return s.silBook; const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const q = c.getContext('2d');
  q.drawImage(s.c, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#1f2a38'; q.fillRect(0, 0, s.w, s.h); return (s.silBook = c); }
function frame(x, y, w, h, col, fill){ rect(x, y, w, h, fill || P.ui0); rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, P.ui1); rect(x, y, 1, h, P.ui1); rect(x + w - 1, y, 1, h, P.ui1); }

// ---------- piirto ----------
// Pystyssä kirja on yläpalkin ja alapaneelin välissä. Vaakatilassa (V2.0) se täyttää koko ruudun:
// napit ylärivillä, kortit kahdessa rivissä, sukupuu vasemmalta oikealle ja kannan sivu kolmena palstana.
export function drawBook(t){
  const b = B(), land = LAY.land;
  if (land) rect(0, 0, W, H, P.bg1); else rect(0, TOP - 4, W, BOT - TOP + 4, P.bg1);
  if (b.page) return drawPage(b.page, t);
  // välilehdet
  if (land){
    button(8, 6, 110, 24, '< TAKAISIN', leave);
    button(126, 6, 110, 24, 'KANNAT', () => { b.tab = 'lista'; }, b.tab === 'lista' ? 'g' : 'n');
    button(240, 6, 110, 24, 'SUKUPUU', () => { b.tab = 'puu'; }, b.tab === 'puu' ? 'g' : 'n');
  } else {
    const tw2 = (W - 24)/2;
    button(8, TOP, tw2, 24, 'KANNAT', () => { b.tab = 'lista'; }, b.tab === 'lista' ? 'g' : 'n');
    button(16 + tw2, TOP, tw2, 24, 'SUKUPUU', () => { b.tab = 'puu'; }, b.tab === 'puu' ? 'g' : 'n');
  }
  if (b.tab === 'puu') drawTree(t); else drawList(t);
  if (!land) button(8, 628, 120, 30, '< TAKAISIN', leave);
}

// kortit 3 × 3 sivulla (vaakatilassa kaksi riviä niin leveästi kuin mahtuu)
function drawList(t){
  const b = B(), ks = keys(), land = LAY.land, cw = 118, ch = 144;
  const cols = land ? Math.max(3, Math.floor((W - 16 + 5)/(cw + 5))) : 3, PER = land ? cols*2 : 9, pages = Math.ceil(ks.length/PER); b.p = Math.min(b.p || 0, pages - 1);
  const known = STRAIN_ORDER.filter(k => S.known[k]).length, omia = own().length;
  if (land){ let x = 362; const s1 = 'POHJAKANTOJA ' + known + ' / ' + STRAIN_ORDER.length; text(s1, x, 14, P.uiD); x += tw(s1) + 16;
    if (omia) text('OMIA ' + omia, x, 14, GOLD[1]); }
  else { text('POHJAKANTOJA ' + known + ' / ' + STRAIN_ORDER.length, 8, TOP + 34, P.uiD);
    if (omia){ const s = 'OMIA KANTOJA ' + omia; text(s, W - 8 - tw(s), TOP + 34, GOLD[1]); } }
  const x0 = land ? Math.round((W - (cols*(cw + 5) - 5))/2) : 8, y0 = land ? 38 + Math.max(0, Math.round((H - 352)/2)) : TOP + 50;
  ks.slice(b.p*PER, (b.p + 1)*PER).forEach((k, n) => {
    const x = x0 + (n % cols)*(cw + 5), y = y0 + ((n/cols) | 0)*(ch + 6), kn = !!S.known[k], T = strain(k), isNew = kn && !S.book.seen[k];
    frame(x, y, cw, ch, isNew ? AMB[2] : kn ? (T.mutant ? GOLD[1] : T.col[1]) : P.ui1);
    if (isNew && Math.sin(t*4) > -0.2){ rect(x + cw - 34, y + 4, 30, 11, AMB[1]); text('UUSI', x + cw - 31, y + 6, P.ui0); }
    shroom(k, x + cw/2, y + 96, 2, kn);
    if (!kn) textC('???', x + cw/2, y + 50, P.uiD, 2);
    const nm = kn ? T.short : '???';
    wrapLines(nm, cw - 8).slice(0, 2).forEach((l, i) => textC(l, x + cw/2, y + 104 + i*(LH + 2), kn ? colOf(k) : P.uiD));
    if (kn && T.mutant) textC(wrapLines(T.mut.txt, cw - 6)[0], x + cw/2, y + 128, GOLD[1]);
    else if (kn && sim.unknownTraits(k)) textC('? TUTKIMATTA', x + cw/2, y + 128, AMB[1]);
    else if (kn && !T.auto) textC(fmt(T.price) + ' ' + CUR.slice(0, 1), x + cw/2, y + 128, P.uiD);
    hit(x, y, cw, ch, () => { B().page = k; markSeen(k); });
  });
  if (pages > 1) button(W - 88, land ? 6 : 628, 80, land ? 24 : 30, (b.p + 1) + ' / ' + pages + ' >', () => { b.p = (b.p + 1) % pages; });
  if (land) return;
  const tried = Object.keys(S.tried).length;
  wrap('JÄLKELÄINEN PERII MUODON, KYVYN JA KASVUN VANHEMMILTAAN. JOSKUS MALJA MUTATOITUU. KOKEILTUJA PAREJA: ' + tried + '.', 8, 556, W - 16, P.uiD);
}

// sukupuu: valittu kanta, sen vanhemmat ja isovanhemmat. Viivan väri = lapsen väri. Napautus siirtää puun siihen kantaan
// (pohjakannasta avautuu sivu). Pystyssä puu kasvaa ylhäältä alas, vaakatilassa vasemmalta oikealle.
function node(k, x, y, t, focus){
  const T = strain(k), on = !!(T && S.known[k]), isNew = on && !S.book.seen[k];
  frame(x - 26, y - 30, 52, 56, focus ? AMB[2] : isNew ? AMB[2] : on ? (T.mutant ? GOLD[1] : T.col[1]) : P.ui1, P.ui0);
  shroom(k, x, y + 20, 1, on);
  const nm = on ? wrapLines(T.short, 104)[0] : '???';
  rect(x - tw(nm)/2 - 2, y + 28, tw(nm) + 4, 11, P.bg1); textC(nm, x, y + 30, on ? colOf(k) : P.uiD);
  hit(x - 30, y - 32, 60, 72, () => { const b = B(); if (parents(k).length && !focus) b.focus = k; else { b.page = k; markSeen(k); } });
}
function link(x0, y0, x1, y1, col, land){
  const mid = land ? Math.round((x0 + x1)/2) : Math.round((y0 + y1)/2);
  if (land){ rect(Math.min(x0, mid), y0, Math.abs(mid - x0) + 2, 2, col); rect(mid, Math.min(y0, y1), 2, Math.abs(y1 - y0) + 2, col); rect(Math.min(mid, x1), y1, Math.abs(x1 - mid) + 2, 2, col); }
  else { rect(x0, Math.min(y0, mid), 2, Math.abs(mid - y0) + 2, col); rect(Math.min(x0, x1), mid, Math.abs(x1 - x0) + 2, 2, col); rect(x1, Math.min(mid, y1), 2, Math.abs(y1 - mid) + 2, col); }
}
function drawTree(t){
  const b = B(), land = LAY.land, mine = own();
  if (!b.focus || !S.known[b.focus] || !S.kannat[b.focus]) b.focus = mine.length ? mine[mine.length - 1] : null;
  if (!b.focus){
    wrap('SUKUPUU ALKAA ENSIMMÄISESTÄ RISTEYMÄSTÄSI. PANE KAHDEN KANNAN ITIÖT SAMALLE AGAR-MALJALLE HAUTOMOON.', land ? 40 : 24, land ? 90 : 160, land ? W - 80 : W - 48, P.uiD);
    return; }
  const k = b.focus, ps = parents(k), yo = land ? Math.max(0, Math.round((H - 352)/2)) : 0;
  // paikat: [syvyys 0 = isovanhemmat, 1 = vanhemmat, 2 = valittu], poikittain 0..1
  const at = (d, f) => land ? [Math.round(70 + d*(W - 190)/2), Math.round(70 + yo + f*250)] : [Math.round(40 + f*(W - 80)), 110 + d*150];
  const [fx, fy] = at(2, 0.5);
  ps.forEach((p, i) => { const pf = ps.length === 1 ? 0.5 : 0.25 + i*0.5, [x, y] = at(1, pf), gps = parents(p);
    link(x, y, fx, fy, strain(k).col[1], land);
    gps.forEach((gp, j) => { const gf = pf + (gps.length === 1 ? 0 : (j - 0.5)*0.26), [gx, gy] = at(0, gf);
      link(gx, gy, x, y, strain(p).col[1], land); node(gp, gx, gy, t, false); });
    node(p, x, y, t, false); });
  node(k, fx, fy, t, true);
  // mistä kukin ryhmä tuli
  const T = strain(k), kids = mine.filter(c => parents(c).includes(k)).map(nameOf);
  const lines = [];
  if (T.pb && T.from) for (const [lab, grp] of [['MUOTO', 'M'], ['KYKY', 'K'], ['KASVU', 'G']]) lines.push([lab, nameOf(T.from[grp] === 'a' ? T.pa : T.pb), strain(T.from[grp] === 'a' ? T.pa : T.pb).col[2]]);
  if (T.mut) lines.push([MUT_NAME[T.mut.t], T.mut.txt, GOLD[2]]);
  if (kids.length) lines.push(['JÄLKELÄISET', kids.join(', '), P.ui3]);
  if (land){ const s = lines.filter(l => l[0] !== 'JÄLKELÄISET').map(l => l[0] + ': ' + l[1]).join('  '); text(wrapLines(s, W - 380)[0] || '', 362, 14, P.uiD); return; }
  let y = 500; lines.forEach(([a, v, col]) => { text(a, 8, y, P.uiD); const n = wrap(v, 116, y, W - 124, col); y += Math.max(1, n)*(LH + 3) + 2; });
  if (mine.length > 1) button(W - 128, 628, 120, 30, 'SEURAAVA >', () => { b.focus = mine[(mine.indexOf(k) + 1) % mine.length]; });
}

// kannan sivu
function drawPage(k, t){
  const T = strain(k), kn = !!S.known[k], b = B(), land = LAY.land, FT = land ? 36 : TOP, derived = !STRAINS[k];
  frame(8, FT, W - 16, land ? H - FT - 8 : 500, kn ? (T.mutant ? GOLD[1] : T.col[1]) : P.ui1, P.ui0);
  // kuva
  rect(20, FT + 14, 130, 170, '#0b1018');
  shroom(k, 85, FT + 172, 3, kn);
  let x = 162, y = FT + 16; const nw = land ? 226 : W - x - 20;       // nimipalstan leveys
  if (!kn){
    textC('???', 85, FT + 70, P.uiD, 2);
    text('TUNTEMATON KANTA', x, y, P.uiD); y += LH + 10;
    wrap('LÖYTYY ' + (ORIGIN_TXT[k] || 'RETKELTÄ') + '.', x, y, nw, P.ui3);
  } else {
    const tk = knows(k);
    wrapLines(T.name, nw/2).forEach(l => { text(l, x, y, colOf(k), 2); y += 2*LH + 4; });   // kaksinkertainen fontti: puolet leveydestä
    if (T.mutant){ wrap(MUT_NAME[T.mut.t], x, y, nw, GOLD[1]); y += LH + 6; }
    else { text(T.txt, x, y, P.uiD); y += LH + 6; }
    const sp = S.spores[k] || 0; text('ITIÖITÄ: ' + sp, x, y + 4, sp ? P.ui3 : P.uiD);
    // piirteet ryhmittäin (tuntematon = ?), sitten luvut, jotka kasvu paljastaa
    const rows = traitRows(T, tk).map(([a, v, grp]) => [a, v, v === '?' ? AMB[1] : (T.mut && T.mut.grp === grp ? GOLD[2] : P.ui3)]);
    if (tk.k && T.tends) rows.push(['TEHTÄVÄ', 'HOITAA NAAPUREITA: EIVÄT KUIVU, KASVU +' + Math.round((sim.tendGrow(T.luonne) - 1)*100) + '%']);
    if (tk.g){ rows.push(['PARAS ASTIA', bestVessel(T)]);
      if (!T.auto) rows.push(['KASVUAIKA', hours(T.grow) + ' / AALTO'], ['MYYNTIARVO', fmt(T.price) + ' ' + CUR + ' / KPL']); }
    const F = sim.frameOf(k); if (F && !T.auto) rows.push(['MUOTTI', F.need + ' SATOA > ' + PRODUCTS[F.out].name + ' (' + SELL_BASE[F.out] + ' ' + CUR + ')']);
    rows.push(['ALKUPERÄ', origin(k)]);
    if (T.mutant) rows.push(['MUTAATIO', T.mut.txt, GOLD[2]]);
    // pystyssä tiedot ovat kuvan alla, vaakatilassa omana palstanaan oikealla
    const rx = land ? 404 : 22, vx = rx + 108, vw = W - vx - 20;
    y = land ? FT + 16 : TOP + 200;
    for (const [a, v, col] of rows){ text(a, rx, y, P.uiD); const n = wrap(v, vx, y, vw, col || P.ui3); y += Math.max(1, n)*(LH + 3) + (land ? 3 : 5); }
    if (!tk.g || !tk.k) wrap((!tk.g ? 'KASVU SELVIÄÄ ENSIMMÄISESTÄ SADOSTA. ' : '') + (!tk.k ? 'KYKY SELVIÄÄ TUTKIMUSMALJASTA HAUTOMOSSA.' : ''), rx, y + 2, W - rx - 20, AMB[1]);
    if (derived){
      if (naming.isOpen()) naming.draw(t, land ? H - 164 : 380, land ? 8 : 0);
      else { button(land ? 162 : W - 200, land ? H - 52 : TOP + 456, 180, 30, 'NIMEÄ UUDELLEEN', () => naming.open(k, S.names[k] || sim.suggestName(k), () => {}), 'n');
        button(land ? 20 : 20, land ? H - 52 : TOP + 456, 130, 30, 'SUKUPUU', () => { b.focus = k; b.tab = 'puu'; b.page = null; }, 'n'); }
    }
  }
  if (land) button(8, 6, 110, 24, '< KIRJA', () => { naming.close(); b.page = null; });
  else button(8, 628, 120, 30, '< KIRJA', () => { naming.close(); b.page = null; });
}
