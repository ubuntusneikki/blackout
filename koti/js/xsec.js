// Astian poikkileikkaus (lähikuva) biopunk-tyylissä: piirretään omaan 384×516-kerrokseen (XL),
// samaan tarkkuuteen kuin isometrinen huone. Kerros kootaan näytölle iso.js:n composite()-funktiolla.
// Tyyli: docs/moodboard-biopunk.md (tumma teräs, hillitty teal-lasi, lämmin valolista, elävä hehku).
import {P, AMB, STRAINS} from './data.js';
import {rng, BAYER, clamp, ease, vital} from './gfx.js';
import {strain} from './state.js';

export const XW = 384, XH = 516;
export const XL = document.createElement('canvas'); XL.width = XW; XL.height = XH;
const X = XL.getContext('2d');
// sisätila (kerroksen koordinaatit). UI-koordinaateissa sama alue on noin (24…167, 78…214), kuten ennen.
export const SOIL = 400, TY0 = 128, BASE = 444;
export const INNER = { purkki:[96,288], terraario:[52,332], akvaario:[52,332], palvelin:[76,308] };
// UI-koordinaatit efekteille (fx.js): astian sisätila ja kasvuston keskikohta
export const XSEC_BOX_UI = {x:24, y:78, w:143, h:136};
export const ORIGIN = [96, 214];

// ---------- värit ----------
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const toHex = c => '#' + c.map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v,i) => v + (B[i]-v)*t)); };
const VC = new Map();
// elinvoima värille (sama kaava kuin vital(), mutta paletille: halpa joka ruudulla)
export function vcol(h, v){ const lv = Math.round(clamp(v,0,1)*10), k = h + lv; let c = VC.get(k);
  if (!c){ const d = [...hex(h), 255]; vital(d, 0, lv/10); c = toHex(d.slice(0,3)); VC.set(k, c); } return c; }

const px = (x, y, c) => { X.fillStyle = c; X.fillRect(x|0, y|0, 1, 1); };
const rect = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x|0, y|0, w|0, h|0); };
function dith(x0, y0, w, h, col, lvl){ for (let y = y0|0; y < y0 + h; y++) for (let x = x0|0; x < x0 + w; x++) if (BAYER[y&3][x&3] < lvl) px(x, y, col); }
function halo(cx, cy, rx, ry, col, amt, clip){
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++){
    if (clip && (x < clip[0] || x > clip[1] || y < clip[2] || y > clip[3])) continue;
    const d = Math.hypot((x - cx)/rx, (y - cy)/ry); if (d > 1) continue;
    if (BAYER[y&3][x&3] < (1 - d)*16*amt) px(x, y, col); }
}

// ---------- tausta: laboratorion seinä ja lattia (staattinen, astiatyypin mukaan) ----------
const BG = {};
const STEEL = ['#0b1018','#141c28','#1f262c','#23303a','#2e393e','#405853'];
function background(type){
  if (BG[type]) return BG[type];
  const c = document.createElement('canvas'); c.width = XW; c.height = XH; const g = c.getContext('2d');
  const sp = (x, y, col) => { g.fillStyle = col; g.fillRect(x|0, y|0, 1, 1); }, sr = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x|0, y|0, w|0, h|0); };
  const R = rng(17);
  // seinäpaneelit
  sr(0, 0, XW, XH, STEEL[1]);
  for (let px0 = -20; px0 < XW; px0 += 72){
    sr(px0, 0, 1, 452, STEEL[0]); sr(px0 + 1, 0, 1, 452, STEEL[2]);
    for (let y = 40; y < 452; y += 96){ sr(px0 + 1, y, 71, 1, STEEL[0]); sr(px0 + 1, y + 1, 71, 1, STEEL[2]);
      for (const dx of [6, 65]) { sp(px0 + dx, y + 6, STEEL[4]); sp(px0 + dx, y + 7, STEEL[0]); } }
  }
  for (let i = 0; i < 900; i++){ const x = R()*XW|0, y = R()*452|0; sp(x, y, R() < 0.5 ? STEEL[0] : STEEL[2]); }   // kulumaa
  // lämmin valolista ylhäällä ja valo seinällä
  sr(0, 10, XW, 6, '#2a1d16'); sr(0, 12, XW, 2, '#ffcf7a'); sr(0, 14, XW, 1, '#a8602f'); sr(0, 16, XW, 1, STEEL[0]);
  for (let y = 17; y < 120; y++){ const a = (1 - (y - 17)/103); for (let x = 0; x < XW; x++) if (BAYER[y&3][x&3] < a*a*5) sp(x, y, '#45301f'); }
  // kupariputki ja venttiili taustalla
  sr(0, 70, XW, 7, '#5e321e'); sr(0, 70, XW, 2, '#a8602f'); sr(0, 71, XW, 1, '#f3d08a'); sr(0, 76, XW, 1, '#2a1d16');
  for (const x of [30, 182, 340]){ sr(x, 66, 6, 15, '#45301f'); sr(x, 66, 6, 1, '#d99a5b'); }
  sr(212, 58, 10, 12, '#5e321e'); sr(207, 54, 20, 4, '#a8602f'); sr(207, 54, 20, 1, '#ffcf7a');   // venttiili
  // ravinneputki oikealla (neste animoidaan erikseen)
  sr(352, 0, 14, 452, STEEL[0]); sr(354, 0, 10, 452, '#103540'); sr(355, 0, 2, 452, '#1d6a78'); sr(362, 0, 1, 452, STEEL[2]);
  for (let y = 30; y < 452; y += 110){ sr(350, y, 18, 8, STEEL[3]); sr(350, y, 18, 1, STEEL[5]); }
  // sammal ja köynnös nurkissa (hillitty, ei myrkynvihreä)
  for (const [x0, dir] of [[0, 1], [XW - 1, -1]]){ for (let k = 0; k < 7; k++){ let x = x0, y = 16 + k*9, len = 20 + R()*50;
    for (let i = 0; i < len; i++){ x += dir*(R() < 0.6 ? 1 : 0); y += R() < 0.7 ? 1 : 0; const q = R();
      sp(x, y, q < 0.15 ? '#79a83a' : q < 0.6 ? '#3f6a26' : '#24402a'); if (R() < 0.25) sp(x + dir, y, '#3f6a26'); } } }
  // lattia
  sr(0, 452, XW, XH - 452, STEEL[2]); sr(0, 452, XW, 2, STEEL[4]); sr(0, 454, XW, 1, STEEL[0]);
  for (let x = -10; x < XW; x += 48){ sr(x, 455, 1, XH, STEEL[1]); }
  for (let y = 478; y < XH; y += 24) sr(0, y, XW, 1, STEEL[1]);
  dith(0, 455, XW, 30, STEEL[1], 6);
  // varjo astian alla
  halo(192, 462, 170, 12, STEEL[0], 1.4);
  BG[type] = c; return c;
}

// ---------- astia: takaosa (sisäseinä ja alusta) ja etuosa (lasi ja kehys) ----------
function vesselBack(type){
  const [x0, x1] = INNER[type];
  if (type === 'palvelin'){
    // kaappi: tumma runko, hyllyt, sisällä lämmin hämärä
    rect(x0 - 22, TY0 - 40, x1 - x0 + 45, BASE - TY0 + 52, STEEL[0]);
    rect(x0 - 20, TY0 - 38, x1 - x0 + 41, BASE - TY0 + 48, '#1a1416');
    rect(x0, TY0 - 4, x1 - x0 + 1, SOIL - TY0 + 4, '#16181e');
    for (let y = TY0; y < SOIL; y++) for (let x = x0; x <= x1; x++) if (BAYER[y&3][x&3] === 0 && ((x + y) & 7) === 0) px(x, y, '#22262e');
    return;
  }
  const top = type === 'purkki' ? TY0 + 16 : TY0;
  rect(x0, top, x1 - x0 + 1, SOIL - top, '#0e181e');                                     // takalasi
  for (let y = top; y < SOIL; y++) for (let x = x0; x <= x1; x++){ const b = BAYER[y&3][x&3];
    if (b === 0 && ((x*3 + y) % 11) === 0) px(x, y, '#16262e'); }
  // takalasin heijastus ja kehyksen takapylväät
  for (let i = 0; i < 60; i++) px(x0 + 18 + i, top + 70 - i, '#16262e');
  if (type !== 'purkki'){ rect(x0 + 8, top, 3, SOIL - top, '#1a1c1e'); rect(x1 - 10, top, 3, SOIL - top, '#1a1c1e'); }
}
function substrate(type, v, T, t){
  const [x0, x1] = INNER[type], R = rng(5);
  const soilA = vcol('#45301f', v), soilB = vcol('#2a1d16', v), soilC = vcol('#140e0b', v);
  const m1 = vcol('#24402a', v), m2 = vcol('#3f6a26', v), m3 = vcol('#79a83a', v), m4 = vcol('#c2df6a', v);
  // multakerrokset poikkileikkauksena
  rect(x0, SOIL, x1 - x0 + 1, BASE - SOIL, soilB);
  for (let y = SOIL; y < BASE; y++) for (let x = x0; x <= x1; x++){ const b = BAYER[y&3][x&3];
    if (y < SOIL + 12 && b < 7) px(x, y, soilA); else if (y > SOIL + 26 && b < 8) px(x, y, soilC); }
  for (let i = 0; i < 14; i++){ const x = x0 + 8 + R()*(x1 - x0 - 24), y = SOIL + 14 + R()*26, w = 4 + R()*8|0;   // kivet
    rect(x, y, w, 3, vcol('#5a5048', v)); rect(x + 1, y, w - 2, 1, vcol('#8a7d68', v)); }
  // rihmasto mullassa: elävä verkko, joka sykkii kannan värillä
  if (T){ const th = vcol(mix(T.col[0], '#0e181e', 0.2), v), hi = vcol(T.col[2], v), rr = rng(42);
    for (let n = 0; n < 9; n++){ let x = x0 + 12 + rr()*(x1 - x0 - 24), y = SOIL + 4;
      for (let i = 0; i < 46; i++){ px(x, y, th); const q = rr(); if (q < 0.45) x += n & 1 ? 1 : -1; else if (q < 0.8) y++; else y--;
        y = clamp(y, SOIL + 3, BASE - 3); x = clamp(x, x0 + 2, x1 - 2);
        if (v > 0.35 && ((i + Math.floor(t*12) + n*7) % 40) === 0){ px(x, y, hi); px(x + 1, y, hi); } } } }
  // sammalpinta
  for (let x = x0; x <= x1; x++){ const h = 3 + (R()*4|0);
    for (let k = 0; k < h; k++) px(x, SOIL - k + 2, k === h - 1 ? (R() < 0.2 ? m4 : m3) : k > h - 3 ? m2 : m1); }
  for (let i = 0; i < 16; i++){ const x = x0 + 6 + R()*(x1 - x0 - 12)|0, w = 6 + R()*10|0;                      // möykyt
    for (let k = 0; k < w; k++){ const hh = Math.round(Math.sin(k/w*Math.PI)*3); for (let q = 0; q < hh; q++) px(x + k, SOIL - 2 - q, q === hh - 1 ? m3 : m2); } }
}
function vesselFront(type, t, opt){
  const [x0, x1] = INNER[type];
  const glassHi = '#9fd3d6', glassMid = '#4f7d86', glassLo = '#2d4a55';
  if (type === 'palvelin'){
    // ylä- ja alahylly, pystykiskot, lasiovi ilman näyttöjä (päätös C)
    rect(x0 - 22, TY0 - 40, x1 - x0 + 45, 30, STEEL[2]); rect(x0 - 22, TY0 - 40, x1 - x0 + 45, 2, STEEL[4]);
    for (let y = TY0 - 34; y < TY0 - 14; y += 5) rect(x0 - 10, y, x1 - x0 + 21, 2, STEEL[0]);
    rect(x0 - 22, BASE, x1 - x0 + 45, 16, STEEL[2]); rect(x0 - 22, BASE, x1 - x0 + 45, 2, STEEL[4]);
    for (let y = BASE + 5; y < BASE + 15; y += 4) rect(x0 - 10, y, x1 - x0 + 21, 2, STEEL[0]);
    for (const x of [x0 - 22, x1 + 6]){ rect(x, TY0 - 40, 16, BASE - TY0 + 56, STEEL[2]); rect(x, TY0 - 40, 2, BASE - TY0 + 56, STEEL[4]); rect(x + 14, TY0 - 40, 2, BASE - TY0 + 56, STEEL[0]);
      for (let y = TY0; y < BASE; y += 18){ px(x + 7, y, STEEL[5]); px(x + 8, y, STEEL[0]); } }
    rect(x0, TY0 - 10, x1 - x0 + 1, 6, '#5e321e'); rect(x0, TY0 - 10, x1 - x0 + 1, 1, '#a8602f');           // kupariputki hyllyn alla
  } else if (type === 'purkki'){
    // lasilieriö: pyöristetyt olkapäät, teräskansi, jalusta
    const top = TY0 + 16;
    for (let k = 0; k < 14; k++) for (let q = 0; q < 14 - k; q++){ px(x0 + k, top + q, STEEL[1]); px(x1 - k, top + q, STEEL[1]); }
    for (let y = top; y < SOIL + 4; y++){ rect(x0 - 2, y, 2, 1, glassLo); px(x0, y, glassHi); px(x0 + 1, y, glassMid); px(x1, y, glassLo); rect(x1 + 1, y, 2, 1, STEEL[0]); }
    rect(x0 + 34, TY0 - 14, x1 - x0 - 67, 30, STEEL[3]); rect(x0 + 34, TY0 - 14, x1 - x0 - 67, 2, STEEL[5]); rect(x0 + 34, TY0 + 14, x1 - x0 - 67, 2, STEEL[0]);
    for (let x = x0 + 40; x < x1 - 36; x += 6) rect(x, TY0 - 10, 2, 22, STEEL[2]);
    rect(x0 + 24, TY0 + 14, x1 - x0 - 47, 4, STEEL[2]);
    rect(x0 - 10, BASE, x1 - x0 + 21, 12, STEEL[3]); rect(x0 - 10, BASE, x1 - x0 + 21, 2, STEEL[5]); rect(x0 - 16, BASE + 12, x1 - x0 + 33, 6, STEEL[2]);
  } else {
    // terraario ja akvaario: tumma teräskehys, kansi ja jalusta
    for (const x of [x0 - 10, x1 + 1]){ rect(x, TY0 - 14, 10, BASE - TY0 + 14, '#3a2a20'); rect(x, TY0 - 14, 2, BASE - TY0 + 14, '#6a4a30'); rect(x + 8, TY0 - 14, 2, BASE - TY0 + 14, '#1f1510'); }
    rect(x0 - 10, TY0 - 14, x1 - x0 + 21, 14, STEEL[2]); rect(x0 - 10, TY0 - 14, x1 - x0 + 21, 2, STEEL[4]); rect(x0 - 10, TY0 - 2, x1 - x0 + 21, 2, STEEL[0]);
    for (let x = x0 + 4; x < x1 - 4; x += 8) rect(x, TY0 - 9, 4, 2, STEEL[1]);
    rect(x0 - 14, BASE, x1 - x0 + 29, 10, STEEL[3]); rect(x0 - 14, BASE, x1 - x0 + 29, 2, STEEL[5]); rect(x0 - 18, BASE + 10, x1 - x0 + 37, 6, STEEL[2]);
    // etulasin reunavalo vasemmalla, tumma reuna oikealla
    rect(x0, TY0, 2, SOIL - TY0, glassHi); rect(x0 + 2, TY0, 1, SOIL - TY0, glassMid); rect(x1 - 1, TY0, 2, SOIL - TY0, glassLo);
  }
  // kansiputki ravinneputkeen
  const lidY = type === 'purkki' ? TY0 - 14 : type === 'palvelin' ? TY0 - 40 : TY0 - 14;
  rect(260, lidY - 22, 4, 22, '#1d6a78'); rect(260, lidY - 22, 1, 22, '#5fc7d0'); rect(260, lidY - 24, 94, 4, '#1d6a78'); rect(260, lidY - 24, 94, 1, '#5fc7d0');
  // lasin heijastusviirut (etulasi)
  if (type !== 'palvelin'){
    const top0 = type === 'purkki' ? TY0 + 16 : TY0;
    for (let y = top0 + 1; y < SOIL - 4; y += 2) for (let x = x0 + 3; x < x1 - 1; x++) if (BAYER[y&3][x&3] === 0 && ((x*7 + y*3) % 13) === 0) px(x, y, '#16262e');   // lasin sävy
    if (opt && opt.wet > 0.3){ const R = rng(3);   // kosteassa astiassa huurua ja pisaroita lasissa
      for (let i = 0; i < 40*opt.wet; i++){ const x = x0 + 6 + R()*(x1 - x0 - 12), y = top0 + 6 + R()*(SOIL - top0 - 30); px(x, y, glassMid); px(x, y + 1, glassHi); if (R() < 0.3) px(x, y + 2, glassMid); } }
    const top = type === 'purkki' ? TY0 + 16 : TY0;
    for (let i = 0; i < 90; i++){ if (i % 3 === 2) continue; px(x0 + 12 + i*0.5, top + 8 + i, glassMid); }
    for (let i = 0; i < 40; i++) px(x0 + 24 + i*0.5, top + 8 + i, glassHi);
    for (let i = 0; i < 26; i++) px(x1 - 30 + i*0.4, SOIL - 40 - i, glassLo);
  }
}
function water(t, x0, x1){
  const wl = 300;
  for (let y = wl; y < SOIL + 2; y++) for (let x = x0 + 1; x < x1; x++) if (BAYER[y&3][x&3] < 6) px(x, y, '#1d6a78');
  for (let x = x0 + 1; x < x1; x++) px(x, wl + (Math.sin(x*0.15 + t*2) > 0.6 ? 1 : 0), '#5fc7d0');
  for (let i = 0; i < 12; i++){ const bx = x0 + 14 + i*23, by = SOIL - ((t*16 + i*31) % 96); if (by > wl + 2){ px(bx, by, '#5fc7d0'); px(bx + 1, by - 1, '#93d7a8'); } }
}
// akvaariossa sienet kasvavat kivisaarekkeella veden yläpuolella
function island(v){
  const cx = 192, w = 136, top = 288, R = rng(9);
  for (let y = top; y < SOIL + 2; y++){ const half = Math.round(w/2 + (y - top)*0.22 + Math.sin(y*0.3)*2);
    for (let x = cx - half; x <= cx + half; x++){ const b = BAYER[y&3][x&3], edge = x > cx + half - 10;
      px(x, y, vcol(edge ? (b < 6 ? '#2a2c2e' : '#1a1c1e') : b < 3 ? '#5a5048' : b < 11 ? '#3a342e' : '#2a2420', v)); } }
  for (let i = 0; i < 10; i++){ const x = cx - w/2 + R()*w, y = top + 8 + R()*90; px(x, y, vcol('#8a7d68', v)); px(x + 1, y, vcol('#5a5048', v)); }
  for (let x = cx - w/2 - 2; x <= cx + w/2 + 2; x++){ const h = 2 + ((x*7) % 4); for (let k = 0; k < h; k++) px(x, top - k + 1, vcol(k === h - 1 ? '#79a83a' : k > 1 ? '#3f6a26' : '#24402a', v)); }
  return [cx - w/2 + 6, cx + w/2 - 6, top];
}

// ---------- sienet: oma siluetti jokaiselle kannalle ----------
// Sävyramppi: tumma varsi → keskisävy → vaalea lakki → hehku kärjissä. Kaikki värit vcol():n kautta (elinvoima).
function stemCols(T, v){ return [vcol(mix(T.col[0], '#0b1018', 0.3), v), vcol(mix(T.col[0], '#c9bc9c', 0.45), v), vcol(mix(T.col[1], '#efe6cc', 0.5), v)]; }
function stem(x, y0, y1, w, sc, bend){
  for (let y = y1; y <= y0; y++){ const f = (y0 - y)/Math.max(1, y0 - y1), xx = Math.round(x + Math.sin(f*Math.PI*0.7)*bend);
    rect(xx - (w >> 1), y, w, 1, sc[1]); px(xx - (w >> 1), y, sc[2]); if (w > 2) px(xx + (w >> 1) - (w % 2 ? 0 : 1), y, sc[0]); }
  return Math.round(x + Math.sin(0.7*Math.PI)*bend);
}
function dome(cx, y, w, h, c, gills){
  for (let i = 0; i < h; i++){ const k = (h - i)/h, half = Math.round((w/2)*Math.sqrt(1 - k*k*0.9));
    for (let x = cx - half; x <= cx + half; x++){ let col = c[1];
      if (x > cx + half*0.45) col = c[0]; else if (x < cx - half*0.2 && i < h*0.55) col = c[2];
      if (i === 0 || x === cx - half) col = c[2]; if (x === cx + half) col = c[3];
      px(x, y - h + i, col); } }
  if (gills){ const half = Math.round(w/2); for (let x = cx - half + 2; x <= cx + half - 2; x++) if (x & 1) px(x, y + 1, c[4]); rect(cx - half + 1, y, half*2 - 1, 1, c[3]); }
}
const SHAPE = {
  // siniheltta: iso kupu täplineen, heltat hehkuvat alapuolelta, pieniä tyvellä
  cap(x, base, s, c, sc, o){ const parts = [[0, 1, 0], [-0.55, 0.38, -1], [0.5, 0.3, 1], [-0.85, 0.2, -1]]; let top = base;
    for (const [dx, k, b] of parts){ if (k < 0.3 && s < 0.5) continue; const hh = Math.round(120*s*k), w = Math.round(64*s*k + 6), xx = x + Math.round(dx*70*s);
      const sx = stem(xx, base, base - hh, Math.max(2, Math.round(w/7)), sc, b*o.sway); const cy = base - hh + o.droop;
      dome(sx, cy, w, Math.max(3, Math.round(w*0.48)), c, true);
      if (w > 22) for (const [ex, ey] of [[-0.25, 0.5], [0.05, 0.75], [0.2, 0.4], [-0.05, 0.3]]) { const sx2 = Math.round(sx + ex*w), sy2 = Math.round(cy - ey*w*0.48); rect(sx2, sy2, 2, 2, c[4]); px(sx2, sy2, '#ffffff'); }
      if (w > 16) px(sx - w*0.2, cy - w*0.35, '#ffffff');
      top = Math.min(top, cy - w*0.48); }
    return top; },
  // ruususieni: rypäs suippoja lakkeja ohuilla kaartuvilla varsilla, pisarat
  cluster(x, base, s, c, sc, o){ let top = base; const parts = [[0, 1, 0.2], [-0.4, 0.75, -0.5], [0.42, 0.8, 0.6], [-0.75, 0.5, -0.8], [0.75, 0.55, 0.9], [0.15, 0.45, 0.3]];
    for (const [dx, k, b] of parts){ if (k < 0.6 && s < 0.45) continue; const hh = Math.round(110*s*k), w = Math.round(30*s*k + 5), xx = x + Math.round(dx*60*s);
      const sx = stem(xx, base, base - hh, Math.max(2, Math.round(w/8)), sc, b*10*s + b*o.sway); const cy = base - hh + o.droop, h = Math.round(w*1.1);
      for (let i = 0; i < h; i++){ const f = i/h, half = Math.round(w/2*Math.pow(f, 0.8));
        for (let xq = sx - half; xq <= sx + half; xq++) px(xq, cy - h + i, xq > sx + half*0.4 ? c[0] : (xq < sx - half*0.3 || i < 3) ? c[2] : c[1]); }
      rect(sx - (w >> 1), cy, w, 1, c[3]);
      if (w > 10){ px(sx - 2, cy - h*0.5, c[4]); px(sx + 1, cy - h*0.3, c[4]); px(sx - 1, cy - h*0.75, '#ffffff'); }
      top = Math.min(top, cy - h); }
    return top; },
  // hämäränuppi: läpikuultavat pallot, joiden sisällä valopiste
  nubs(x, base, s, c, sc, o, t){ let top = base; const parts = [[0, 1], [-0.5, 0.7], [0.55, 0.8], [-0.9, 0.45], [0.9, 0.5], [0.25, 0.4]];
    parts.forEach(([dx, k], n) => { if (k < 0.5 && s < 0.45) return; const hh = Math.round(46*s*k), r = Math.round(20*s*k + 3), xx = x + Math.round(dx*70*s);
      const sx = stem(xx, base, base - hh, Math.max(2, Math.round(r/4)), sc, o.sway*0.5); const cy = base - hh - r + o.droop;
      for (let y = -r; y <= r; y++) for (let xq = -r; xq <= r; xq++){ const d = Math.hypot(xq, y)/r; if (d > 1) continue;
        let col = d > 0.82 ? (xq + y > 0 ? c[3] : c[2]) : (xq + y > r*0.3 ? c[0] : c[1]); if (d < 0.82 && BAYER[(cy+y)&3][(sx+xq)&3] < 5) col = c[0]; px(sx + xq, cy + y, col); }
      const pulse = 0.5 + 0.5*Math.sin(t*2 + n); halo(sx, cy, r*0.5, r*0.5, c[4], 0.6*pulse*o.glow); px(sx, cy, '#ffffff'); px(sx - r*0.45, cy - r*0.45, c[4]);
      top = Math.min(top, cy - r); });
    return top; },
  // kalvoheltta: kupu ja sen alta roikkuva hehkuva verkkohame
  web(x, base, s, c, sc, o){ let top = base; const parts = [[0, 1], [-0.62, 0.62], [0.6, 0.55]];
    for (const [dx, k] of parts){ if (k < 0.6 && s < 0.45) continue; const hh = Math.round(118*s*k), w = Math.round(56*s*k + 6), xx = x + Math.round(dx*72*s);
      const sx = stem(xx, base, base - hh, Math.max(2, Math.round(w/8)), sc, o.sway*0.4); const cy = base - hh + o.droop;
      // hame: ristikko lakin reunasta alaspäin, kapenee
      const len = Math.round(hh*0.62);
      for (let i = 2; i < len; i++){ const half = Math.round(w*0.42*(1 - i/len*0.35));
        for (let xq = sx - half; xq <= sx + half; xq++){ const a = ((xq - sx + 64) + i) % 6, b = ((xq - sx + 64) - i + 600) % 6;
          if (a === 0 || b === 0) px(xq, cy + i, i > len - 4 ? c[4] : c[2]); } }
      dome(sx, cy, w, Math.max(3, Math.round(w*0.5)), c, false);
      top = Math.min(top, cy - w*0.5); }
    return top; },
  // hoitajasieni: pitkä ohut varsi, pieni lakki, sivuille kurottavat rihmat ja pisarat
  tall(x, base, s, c, sc, o, t){ let top = base; const parts = [[0, 1], [-0.5, 0.7], [0.48, 0.62]];
    parts.forEach(([dx, k], n) => { const hh = Math.round(200*s*k), xx = x + Math.round(dx*80*s);
      const sx = stem(xx, base, base - hh, 3, sc, o.sway*0.7); const cy = base - hh + o.droop;
      for (const [f, dir, len] of [[0.35, -1, 26], [0.55, 1, 30], [0.72, -1, 20], [0.85, 1, 16]]){ const y0 = base - hh*f, L = Math.round(len*s*k + 4);
        for (let i = 0; i < L; i++) px(sx + dir*i, y0 - i*0.55, sc[2]);
        const tx = sx + dir*L, ty = y0 - L*0.55; px(tx, ty, c[4]); px(tx, ty + 1, c[2]);
        if (o.glow > 0 && ((t*2 + n + f*5) % 3) < 1.5) px(tx, ty + 3, c[4]); }
      dome(sx, cy, Math.round(16*s*k + 6), Math.round(9*s*k + 3), c, false); px(sx - 2, cy - 4, '#ffffff');
      top = Math.min(top, cy - 12); });
    return top; }
};
const SCALE = {cap:1.45, cluster:1.5, nubs:1.7, web:1.4, tall:1.1};
const STYLE_ALIAS = {rypas:'cluster', 'rypäs':'cluster', verkko:'web'};
function strainCols(T, v){ return [T.col[0], T.col[1], mix(T.col[1], T.col[2], 0.55), mix(T.col[0], '#0b1018', 0.35), T.col[2]].map(h => vcol(h, v)); }

// ---------- piirto ----------
// vs: astia, v: elinvoima 0…1, opt: {ready, burst (0…1 tai -1)}. Palauttaa kasvuston yläreunan (kerros-y).
const VWET = {terraario:1, akvaario:1};
export function drawXsec(vs, t, v, opt){
  opt = opt || {};
  const type = INNER[vs.type] ? vs.type : 'terraario', [x0, x1] = INNER[type], T = strain(vs.strain);
  X.drawImage(background(type), 0, 0);
  // ravinneputken neste
  for (let i = 0; i < 9; i++){ const y = 452 - ((t*30 + i*53) % 452); px(356, y, '#5fc7d0'); px(357, y - 1, '#93d7a8'); }
  vesselBack(type);
  let gx0 = x0 + 10, gx1 = x1 - 10, ground = SOIL;
  if (type === 'akvaario'){ substrate(type, v, T, t); const [a, b, top] = island(v); water(t, x0, x1); gx0 = a; gx1 = b; ground = top; }
  else substrate(type, v, T, t);
  let topY = ground;
  if (T){
    const dry = vs.moist < 0.1, life = 0.18 + 0.82*ease(vs.growth), glow = dry ? 0 : clamp(v*1.2 - 0.2, 0, 1);
    const style = SHAPE[T.style] ? T.style : (STYLE_ALIAS[T.style] || 'cap');
    const c = strainCols(T, v), sc = stemCols(T, v), cx = Math.round((gx0 + gx1)/2);
    const room = (gx1 - gx0)/260, s = life*(SCALE[style] || 1.3)*(type === 'purkki' ? 0.8 : 1)*Math.min(1, room + 0.15);
    // valolammikko alustalla ja hengittävä hehku
    const br = 0.6 + 0.4*Math.sin(t*1.3);
    if (glow > 0){ halo(cx, ground + 2, 120*s + 20, 9, vcol(T.col[1], v), 0.45*glow*br, [x0 + 2, x1 - 2, 0, XH]);
      halo(cx, ground - 60*s, 80*s + 12, 60*s + 8, vcol(T.col[0], v), 0.18*glow*br, [x0 + 3, x1 - 3, TY0 + 2, ground]); }
    topY = SHAPE[style](cx, ground, s, c, sc, {sway: dry ? 0 : Math.round(Math.sin(t*0.9)*1.5), droop: dry ? 3 : 0, glow}, t);
    if (T.auto){ // hoitajan rihmat kulkevat ulos astiasta naapureihin
      for (let k = 0; k < 3; k++){ const yy = BASE + 22 + k*7, ph = (t*40 + k*31) % (XW + 40);
        for (let x = 0; x < XW; x++) if (((x + k*3) % 5) === 0 && (x < x0 - 16 || x > x1 + 16)) px(x, yy, sc[0]);
        px(ph - 20, yy, c[4]); px(ph - 19, yy, c[4]); } }
    // itiöt leijuvat
    if (!dry && life > 0.5) for (let i = 0; i < (T.mutant ? 30 : 18); i++){ const sx = x0 + 10 + ((i*53) % (x1 - x0 - 20)), y = ground - 20 - ((t*(6 + i%4*3) + i*29) % (ground - TY0 - 30));
      px(sx + Math.round(Math.sin(t + i)*3), y, T.mutant && i % 3 === 0 ? AMB[2] : c[i % 3 ? 2 : 4]); }
    if (T.mutant) for (let k = 0; k < 6; k++){ const a = t*1.2 + k*1.047; px(cx + Math.cos(a)*90*s, topY + 40*s + Math.sin(a)*30*s, AMB[2]); }
  }
  vesselFront(type, t, {wet: VWET[type] ? vs.moist : 0});
  // valmis sato: meripihkainen merkki kasvuston yllä
  if (opt.ready){ const bx = Math.round((gx0 + gx1)/2), by = Math.round(Math.max(TY0 + 34, topY - 26) + (Math.sin(t*4) > 0 ? 0 : -2));
    rect(bx - 3, by - 20, 7, 13, AMB[0]); rect(bx - 2, by - 19, 5, 11, AMB[1]); rect(bx - 1, by - 19, 2, 8, AMB[2]);
    rect(bx - 3, by - 4, 7, 6, AMB[0]); rect(bx - 2, by - 3, 5, 4, AMB[2]); }
  if (opt.burst >= 0 && opt.burst < 1){ const a = opt.burst, cx = (gx0 + gx1)/2;
    for (let k = 0; k < 32; k++){ const ang = k*0.196, r = a*130; rect(cx + Math.cos(ang)*r, topY + 40 + Math.sin(ang)*r*0.7, 2, 2, AMB[2]); } }
  return topY;
}
