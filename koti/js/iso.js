// Isometrinen kotinäkymä (TP4): sprite-atlas, ruutujen ankkurit, syvyysjärjestys, elinvoimavälimuisti,
// hehku koodilla, osumat, tilan vaihdon siirtymä ja poikkileikkauksen zoomaus.
// Huone piirretään omaan 384 px leveään kerrokseen (ISO) käyttöliittymäpuskurin (192 px, ×2) alle.
// Koordinaatit: kerroksen piste (lx, ly) = käyttöliittymän piste (lx/2, (ly+IY)/2).
import {P, AMB, STRAINS, ROOMS, CUR, SYM} from './data.js';
import {vital, rng, BAYER, clamp, ease, W, H, RES, LAY, onLayout, tw, GUIDE_BOXES} from './gfx.js';
import {S, strain, neighbors} from './state.js';
import {XL} from './xsec.js';

export const IW = 384, IH = 516, IY = 28;          // kerros alkaa käyttöliittymän y=14 kohdalta
export const layer = document.createElement('canvas'); layer.width = IW; layer.height = IH;
const L = layer.getContext('2d');
// Kerroksen paikka näytöllä natiivipikseleinä (ORG = huone, XORG = poikkileikkaus). Pystyssä yläpalkin alla,
// vaakatilassa keskellä vasenta huonealuetta (ylä- ja alareuna rajautuvat pois; tilan kuva on kerroksen keskellä).
export const ORG = {x:0, y:IY}, XORG = {x:0, y:IY};
onLayout(() => {
  if (!LAY.land){ ORG.x = XORG.x = 0; ORG.y = XORG.y = IY; return; }
  ORG.x = XORG.x = Math.round((LAY.rw*RES - IW)/2); ORG.y = Math.round((H*RES - IH)/2);
  XORG.y = Math.min(0, Math.round(H*RES - 462));     // lähikuva: astian jalusta alareunaan, kansi saa rajautua
});
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

// ---------- atlas ----------
// Tila: 'loading' → 'ok' tai 'fail' (paikkamerkit samoilla nimillä)
let ATL = {state:'loading', img:null, meta:null, sprites:{}};
const PH_META = { tile:[88,44], rooms:{
  tila_huone:{n:[4,4], tile0:[0,-66], dc:[44,22], dr:[-44,22]},
  tila_kellari:{n:[4,3], tile0:[-22,-55], dc:[44,22], dr:[-44,22]} } };
export function loadAtlas(base){
  base = base || 'gfx/';
  return fetch(base + 'atlas.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(js => new Promise((ok, bad) => {
    const im = new Image(); im.onload = () => { ATL = {state:'ok', img:im, meta:js.meta, sprites:js.sprites}; ok(); }; im.onerror = bad; im.src = base + 'atlas.png';
  })).catch(() => { ATL = {state:'fail', img:null, meta:PH_META, sprites:{}}; });
}
export const atlasState = () => ATL.state;

// paikkamerkin koot nimen etuliitteen mukaan (w, h, ax, ay)
function phDims(name){
  if (name === 'tila_huone') return [384, 320, 192, 226];
  if (name === 'tila_kellari') return [384, 296, 192, 206];
  if (name.startsWith('astia_')) return name.endsWith('_etu') ? [70, 65, 35, 60] : [74, 92, 37, 76];
  if (name.startsWith('laite_')) return [60, 88, 30, 75];
  if (name.startsWith('sieni_')) return name.endsWith('_itu') ? [16, 14, 8, 11] : name.endsWith('_nuori') ? [20, 26, 10, 22] : [26, 38, 13, 34];
  return [32, 32, 16, 16];
}
function placeholder(name){
  const [w, h, ax, ay] = phDims(name), c = mk(w, h), g = c.getContext('2d');
  if (name.startsWith('tila_')){
    const m = PH_META.rooms[name], n = m.n;
    g.fillStyle = '#1c2735'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < n[1]; r++) for (let q = 0; q < n[0]; q++){
      const x = ax + m.tile0[0] + q*m.dc[0] + r*m.dr[0], y = ay + m.tile0[1] + q*m.dc[1] + r*m.dr[1];
      g.fillStyle = (q + r) & 1 ? '#3a4b60' : '#2c3a4a';
      g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 44, y); g.lineTo(x, y + 22); g.lineTo(x - 44, y); g.closePath(); g.fill();
    }
  } else if (!name.endsWith('_etu')){
    const base = name.startsWith('sieni_') ? (STRAINS[name.split('_')[1]] || STRAINS.heltta).col[1] : name.startsWith('laite_') ? '#46566a' : '#2d4a55';
    g.fillStyle = base; g.fillRect(2, 0, w - 4, h - 4); g.fillStyle = '#d8e2ea'; g.fillRect(2, 0, w - 4, 1);
  }
  const s = {c, w, h, ax, ay}; if (name.startsWith('astia_') && !name.endsWith('_etu')) s.plant = {x:ax, y:ay - 21};
  return s;
}
const BASE = {};
// spritepohja omana kankaanaan (alfa-osumia, elinvoimaa ja ääriviivoja varten)
export function sprite(name){
  if (BASE[name]) return BASE[name];
  const d = ATL.sprites[name];
  if (!d || ATL.state !== 'ok'){ if (ATL.state === 'loading') return null; return (BASE[name] = placeholder(name)); }
  const c = mk(d.w, d.h); c.getContext('2d').drawImage(ATL.img, d.x, d.y, d.w, d.h, 0, 0, d.w, d.h);
  return (BASE[name] = {c, w:d.w, h:d.h, ax:d.ax, ay:d.ay, plant:d.plant});
}
export const hasSprite = name => !!ATL.sprites[name];

// elinvoimavälimuisti: 6 tasoa (0, 0.2 … 1), vital()-kaava kuten muualla pelissä
const VC = {};
export const vLevel = v => clamp(Math.round(v*5), 0, 5);
function spriteV(name, v, tint){
  const lv = vLevel(v), key = name + '@' + lv + (tint ? '#' + tint.join(',') : '');
  if (VC[key]) return VC[key];
  const b = tint ? tinted(name, tint) : sprite(name); if (!b) return null;
  if (lv === 5) return (VC[key] = b);
  const c = mk(b.w, b.h), g = c.getContext('2d'); g.drawImage(b.c, 0, 0);
  const img = g.getImageData(0, 0, b.w, b.h), d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i+3]) vital(d, i, lv/5);
  g.putImageData(img, 0, 0);
  return (VC[key] = {...b, c});
}
// sävytys: kirkkaus → kannan kolme väriä (uusille kannoille ilman omia spritejä) tai sekoitus yhteen väriin (harvinaiset astiat)
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const TC = {};
function tinted(name, tint){
  const key = name + '#' + tint.join(','); if (TC[key]) return TC[key];
  const b = sprite(name); if (!b) return null;
  const c = mk(b.w, b.h), g = c.getContext('2d'); g.drawImage(b.c, 0, 0);
  const img = g.getImageData(0, 0, b.w, b.h), d = img.data;
  if (tint.length === 3){                       // kantaväri: korvaa kylläiset (sienen) pikselit
    const cols = tint.map(hex);
    for (let i = 0; i < d.length; i += 4){ if (!d[i+3]) continue;
      const r = d[i], gg = d[i+1], bb = d[i+2], mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
      if (mx - mn < 40) continue;                // jalka ja harmaat osat ennallaan
      const l = (0.3*r + 0.59*gg + 0.11*bb)/255, k = l < 0.35 ? 0 : l < 0.65 ? 1 : 2;
      d[i] = cols[k][0]; d[i+1] = cols[k][1]; d[i+2] = cols[k][2]; }
  } else {                                      // [väri, määrä]
    const col = hex(tint[0]), a = tint[1];
    for (let i = 0; i < d.length; i += 4){ if (!d[i+3]) continue;
      for (let k = 0; k < 3; k++) d[i+k] = d[i+k]*(1-a) + col[k]*a; }
  }
  g.putImageData(img, 0, 0);
  return (TC[key] = {...b, c});
}
// ääriviiva: pikselit, jotka ovat tyhjiä mutta koskettavat spriteä (hehku = pelattavaa)
const OC = {};
function outline(s, col, key){
  key = key + '|' + col; if (OC[key]) return OC[key];
  const c = mk(s.w + 2, s.h + 2), g = c.getContext('2d');
  const src = s.c.getContext('2d').getImageData(0, 0, s.w, s.h).data, a = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && src[(y*s.w + x)*4 + 3] > 0;
  g.fillStyle = col;
  for (let y = -1; y <= s.h; y++) for (let x = -1; x <= s.w; x++)
    if (!a(x, y) && (a(x-1, y) || a(x+1, y) || a(x, y-1) || a(x, y+1))) g.fillRect(x + 1, y + 1, 1, 1);
  return (OC[key] = c);
}
// spriten näytepisteet (6 px:n ruudukko, vain näkyvät pikselit): peittymisen arviointiin
function samples(s){ if (s.smp) return s.smp; const out = [];
  for (let y = 3; y < s.h; y += 6) for (let x = 3; x < s.w; x += 6) if (alphaAt(s, x, y) > 0) out.push([x, y]);
  return (s.smp = out); }
function alphaAt(s, x, y){
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return 0;
  if (!s.alpha) s.alpha = s.c.getContext('2d').getImageData(0, 0, s.w, s.h).data;
  return s.alpha[((y|0)*s.w + (x|0))*4 + 3];
}

// ---------- tilat ja ankkurit ----------
// Tilan ankkuri kerroksessa: kuva keskelle pystysuunnassa
function roomAnchor(r){ const s = sprite('tila_' + r) || {h: r === 'kellari' ? 296 : 320, ay: r === 'kellari' ? 206 : 226};
  return [IW/2, Math.round((IH - s.h)/2) + s.ay - 8]; }
const meta = () => (ATL.meta || PH_META);
export function cellAnchor(r, i, ox, oy){
  const m = meta().rooms['tila_' + r], w = ROOMS[r].w, c = i % w, q = (i / w) | 0, [ax, ay] = roomAnchor(r);
  return [ax + m.tile0[0] + c*m.dc[0] + q*m.dr[0] + (ox||0), ay + m.tile0[1] + c*m.dc[1] + q*m.dr[1] + (oy||0)];
}
// napautettavat kohteet tilan kuvassa (kuvan omat koordinaatit)
const SPOTS = {
  huone:   [{id:'ovi',     x:92,  y:76, w:52,  h:124}, {id:'ikkuna', x:244, y:74, w:104, h:104, noTap:true}],
  kellari: [{id:'tikkaat', x:44,  y:58, w:36,  h:140}]
};
function spotBox(r, id, ox, oy){ const s = sprite('tila_' + r); if (!s) return null; const sp = SPOTS[r].find(q => q.id === id); if (!sp) return null;
  const [ax, ay] = roomAnchor(r); return {x: ax - s.ax + sp.x + (ox||0), y: ay - s.ay + sp.y + (oy||0), w: sp.w, h: sp.h}; }

// ---------- vuorokaudenaika ja ikkuna ----------
// V2.0: tausta on tasainen ja tumma (villit rihmat ja leijuvat itiöt poistettu: ne eivät kertoneet pelaajalle mitään).
// Ikkuna ja valokaista piirretään tähän kerrokseen heti tilan kuvan jälkeen, joten esineet peittävät ne oikein.
function hourNow(){ if (window.__fxHour != null) return window.__fxHour; const d = new Date(); return d.getHours() + d.getMinutes()/60; }
export function nightness(h){ h = h == null ? hourNow() : h;   // 0 = keskipäivä, 1 = keskiyö
  if (h >= 22 || h < 5) return 1; if (h >= 9 && h < 17) return 0; if (h < 9) return 1 - (h - 5)/4; return (h - 17)/5; }
const dusk = h => Math.max(0, 1 - Math.abs(h - 7)/2.2, 1 - Math.abs(h - 19.5)/2.5);
const BAND = {};
// tyyliohje: ei auringonvaloa. Päivä = pölyinen sumu ja vino lämmin valokaista, aamu ja ilta = meripihkainen horisontti, yö = syvä violetti.
function windowFx(tila, ox, oy, t){
  const [rax, ray] = roomAnchor('huone'), sp = SPOTS.huone.find(q => q.id === 'ikkuna');
  const bx = sp.x, by = sp.y, bw = sp.w, bh = sp.h, X0 = rax - tila.ax + ox, Y0 = ray - tila.ay + oy;
  const h = hourNow(), n = nightness(h), dk = dusk(h);
  // lasi on suunnikas (yläreuna laskee oikealle): efektit vain lasin päälle
  const gx0 = Math.round(bx + bw*0.07), gx1 = Math.round(bx + bw*0.94), gh = Math.round(bh*0.48), SL = 0.4, gTop = x => Math.round(by + bh*0.145 + (x - gx0)*SL);
  for (let x = gx0; x < gx1; x++){ const t0 = gTop(x);
    for (let y = t0; y < t0 + gh; y++){ const f = (y - t0)/gh, b = BAYER[y&3][x&3];
      if (n > 0.05 && b < n*(f < 0.5 ? 9 : 4)) px(X0 + x, Y0 + y, f < 0.5 ? '#130f24' : '#24203f');
      else if (n < 0.95 && f < 0.6 && b < (1 - n)*1.5) px(X0 + x, Y0 + y, '#5a4a6a');
      if (dk > 0.05 && f > 0.55 && b < dk*4*(f - 0.55)/0.45) px(X0 + x, Y0 + y, f > 0.85 ? '#ffcf7a' : '#d99a5b'); } }
  // yöllä ikkunan takana villin rihmaston kärjet välkkyvät hiljaa (ainoa merkki ulkomaailmasta)
  if (n > 0.3) for (let k = 0; k < 8; k++){ const x = gx0 + ((k*53 + 7) % (gx1 - gx0)), y = gTop(x) + gh - 3 - ((k*29) % (gh >> 1));
    if (Math.sin(t*1.1 + k*2.3) > 0.5) px(X0 + x, Y0 + y, '#d6b0ff'); }
  // päivällä vino valokaista ikkunasta lattialle: valmiiksi laskettu kerros (10 tasoa), vain tilan pinnoille
  const lv = Math.round((1 - n)*10); if (!lv) return;
  let c = BAND[lv];
  if (!c){ c = BAND[lv] = mk(tila.w, tila.h); const g = c.getContext('2d'), img = g.createImageData(tila.w, tila.h), D = img.data;
    const LEN = 150, DX = -0.75, k0 = lv/10*0.9, yb = gTop(gx0) + gh;
    for (let y = yb; y < tila.h; y++) for (let x = 0; x < tila.w; x++){
      const s0 = (y - yb - (x - gx0)*SL)/(1 - DX*SL); if (s0 < 0 || s0 > LEN) continue;
      const xw = x - DX*s0; if (xw < gx0 || xw > gx1) continue;
      if (alphaAt(tila, x, y) < 200) continue;
      const e = Math.min(xw - gx0, gx1 - xw)/12, fall = 1 - s0/LEN; let k = k0*fall*fall*Math.min(1, e);
      if (BAYER[y&3][x&3] < 3) k *= 1.6;
      const i = (y*tila.w + x)*4; D[i] = 255; D[i+1] = 232; D[i+2] = 176; D[i+3] = Math.min(90, k*80); }
    g.putImageData(img, 0, 0); }
  L.drawImage(c, X0, Y0);
}
// valolammikko lattialla astian alla: elävä kasvusto valaisee ympäristöään kannan värillä, hengittää ja sammuu kuivuessa
// Kolme lisäävää soikiota (ei pistekuviota eikä reunanpehmennystä), rajattuna tilan kuvaan, jotta valo ei vuoda tyhjään.
let POOL = null;
function pools(tila, X0, Y0, list){
  if (!list.length) return;
  if (!POOL || POOL.width !== tila.w || POOL.height !== tila.h) POOL = mk(tila.w, tila.h);
  const g = POOL.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, tila.w, tila.h);
  for (const [x, y, col, k] of list){ g.fillStyle = col; g.globalAlpha = clamp(0.11*k, 0, 0.2);
    for (const [rx, ry] of [[66, 33], [50, 25], [34, 17]])
      for (let dy = -ry; dy <= ry; dy++){ const hw = Math.round(rx*Math.sqrt(1 - (dy*dy)/(ry*ry))); if (hw > 0) g.fillRect(Math.round(x - X0) - hw, Math.round(y - Y0) + dy, 2*hw, 1); } }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(tila.c, 0, 0);
  L.save(); L.globalCompositeOperation = 'lighter'; L.drawImage(POOL, X0, Y0); L.restore();
}

// ---------- piirto ----------
const px = (x, y, col) => { L.fillStyle = col; L.fillRect(x|0, y|0, 1, 1); };
const rect = (x, y, w, h, col) => { L.fillStyle = col; L.fillRect(x|0, y|0, w|0, h|0); };
function diamond(x, y, col, dash){
  for (let k = 0; k <= 44; k++){ if (dash && ((k >> 1) & 1)) continue; const dy = k >> 1;
    px(x - 44 + k, y - dy, col); px(x + 44 - k, y - dy, col); px(x - 44 + k, y + dy, col); px(x + 44 - k, y + dy, col); }
}
function dithHalo(cx, cy, rx, ry, col, amt){
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++){ const d = Math.hypot(x/rx, y/ry); if (d > 1) continue;
    const X = (cx + x)|0, Y = (cy + y)|0; if (BAYER[Y&3][X&3] < (1 - d)*amt*16) px(X, Y, col); }
}
function draw(s, x, y){ L.drawImage(s.c, Math.round(x - s.ax), Math.round(y - s.ay)); }
// sieni kahdessa osassa: yläosa huojuu ±1 px
function drawShroom(s, x, y, sway){
  const X = Math.round(x - s.ax), Y = Math.round(y - s.ay), cut = Math.round(s.ay*0.55);
  if (!sway){ L.drawImage(s.c, X, Y); return; }
  L.drawImage(s.c, 0, cut, s.w, s.h - cut, X, Y + cut, s.w, s.h - cut);
  L.drawImage(s.c, 0, 0, s.w, cut, X + sway, Y, s.w, cut);
}

// harvinaiset astiat ilman omia spritejä: terraario sävytettynä
const RARE = { akvaario:['terraario', ['#3fb8d8', 0.35]], palvelin:['terraario', ['#4a2a36', 0.45]] };
function vesselSprites(type, v){
  const own = type === 'purkki' ? 'lasipurkki' : type;
  const [base, tint] = (hasSprite('astia_' + own) || ATL.state !== 'ok') ? [own, null] : (RARE[type] || ['terraario', null]);
  const n = 'astia_' + base;
  return [spriteV(n, v, tint), spriteV(n + '_etu', v, tint)];
}
const JOB_PROD = {heltta:'valokalvo', ruusu:'lamporihma', kalvo:'suodatin', verkko:'suodatin'};
const isReady = c => !!(c.ready || c.waves > 0);
function shroomSprite(key, vs, v){
  const base = key.split('~')[0], T = strain(key);
  const stage = (isReady(vs) || vs.growth >= 0.999) ? 'kypsa' : vs.growth >= 0.4 ? 'nuori' : 'itu';
  const own = 'sieni_' + base + '_' + stage;
  if (hasSprite(own) || ATL.state !== 'ok') return [spriteV(own, v), stage];
  return [spriteV('sieni_heltta_' + stage, v, T ? T.col : null), stage];   // uusi kanta: lainattu muoto omin värein
}
function deviceSprite(d){
  if (d.type === 'hautomo') return 'laite_hautomo_' + (d.done ? 'valmis' : d.busy ? 'kaynnissa' : 'tyhja');
  if (d.type === 'kehikko'){
    if (!d.busy && !d.done) return 'laite_kehikko_tyhja';
    // TP3: d.job = syötekanta (heltta, ruusu, kalvo, verkko); tuotteen nimi kelpaa myös
    const job = typeof d.job === 'string' ? d.job : (d.job && (d.job.out || d.job.kanta)) || 'kalvo';
    const prod = JOB_PROD[job.split('~')[0]] || job;
    const p = hasSprite('laite_kehikko_' + prod + '_valmis') ? prod : 'suodatin';
    return 'laite_kehikko_' + p + '_' + (d.done ? 'valmis' : d.t < 0.5 ? 'kasvaa_1' : 'kasvaa_2');
  }
  const own = 'laite_' + d.type; return hasSprite(own) ? own : 'laite_hautomo_tyhja';
}
export function vesselV(vs){ if (!vs || !vs.strain) return 1;
  const wet = vs.moist > 0.25 ? 1 : vs.moist/0.25;
  return clamp(0.3 + 0.5*vs.growth + 0.2*wet - (vs.moist < 0.1 ? 0.25 : 0), 0, 1); }

// meripihkainen pisaramerkki: "tee tämä nyt"
function readyMarker(x, y, t){
  const by = Math.round(y - 6 + (Math.sin(t*4) > 0 ? 0 : -2));
  rect(x - 2, by - 14, 5, 9, AMB[0]); rect(x - 1, by - 13, 3, 7, AMB[1]); rect(x, by - 13, 1, 5, AMB[2]);
  rect(x - 2, by - 3, 5, 4, AMB[0]); rect(x - 1, by - 2, 3, 2, AMB[2]);
}
function bar(x, y, v, col){ rect(x - 13, y, 26, 3, P.ui0); rect(x - 12, y + 1, 24, 1, P.ui1); rect(x - 12, y + 1, Math.round(24*clamp(v,0,1)), 1, col); }
// sumutusmerkki (kuivuva astia): sininen pisara tummalla ääriviivalla
const DROP = ['...o...','..oao..','..oao..','.oaaao.','oaabaao','oabbaao','oaaaaao','.oaaao.','..ooo..'];
function drop(x, y, t){ const b = Math.round(y - 12 + (Math.sin(t*5) > 0 ? 0 : -1)), X = Math.round(x) - 3;
  DROP.forEach((row, q) => { for (let k = 0; k < 7; k++){ const ch = row[k]; if (ch === '.') continue;
    px(X + k, b + q, ch === 'o' ? P.wa0 : ch === 'b' ? '#d8fbff' : P.wa2); } }); }

// viimeksi piirretyt kohteet (osumat ja efektien lokaattori)
let DRAWN = [];
function drawRoomAt(r, t, opt, ox, oy){
  const room = S.rooms[r], tila = sprite('tila_' + r); if (!tila) return;
  const [rax, ray] = roomAnchor(r);
  draw(tila, rax + ox, ray + oy);
  if (r === 'huone' && ATL.state === 'ok') windowFx(tila, ox, oy, t);
  const n = ROOMS[r].w*ROOMS[r].h, cells = room.cells, list = [];
  const night = nightness(), pl = [];
  cells.forEach((c, i) => { if (!c || c.kind !== 'vessel' || !c.strain || c.moist < 0.1) return; const T = strain(c.strain); if (!T) return;
    const [x, y] = cellAnchor(r, i, ox, oy), br = 0.75 + 0.25*Math.sin(t*1.25 + i*2.1);
    pl.push([x, y, T.col[1], br*(0.3 + 0.7*c.growth)*(0.5 + 0.5*night)]); });
  pools(tila, rax - tila.ax + ox, ray - tila.ay + oy, pl);
  // lattia: vapaat ruudut, kun jotain voi sijoittaa
  for (let i = 0; i < n; i++){ const [x, y] = cellAnchor(r, i, ox, oy);
    DRAWN.push({r, i, kind:'floor', x, y});
    if (!cells[i] && opt.placeable) diamond(x, y, Math.sin(t*3) > -0.4 ? AMB[1] : AMB[0], true);
    if (opt.pick && opt.pick.r === r && opt.pick.i === i) diamond(x, y, AMB[2], false);
  }
  // hoitajan rihmayhteydet lattiaa pitkin
  cells.forEach((c, i) => { if (!c || c.kind !== 'vessel' || !c.strain) return; const T = strain(c.strain); if (!T || !T.auto) return;
    const [x0, y0] = cellAnchor(r, i, ox, oy);
    neighbors(r, i).forEach(j => { if (!cells[j] || cells[j].kind !== 'vessel') return; const [x1, y1] = cellAnchor(r, j, ox, oy);
      for (let k = 8; k < 36; k += 4){ const f = k/44; px(x0 + (x1 - x0)*f, y0 + (y1 - y0)*f + 2, T.col[1]); } }); });
  // oven hehku, kun ovi on toiminnassa (TP5 asettaa opt.doorGlow)
  // doorGlow: true = retki valittavissa (symbiontin syaani), 'amb' = retkeltä palattu (meripihka, tee tämä nyt)
  if (r === 'huone' && opt.doorGlow){ const b = spotBox(r, 'ovi', ox, oy); if (b){ const col = opt.doorGlow === 'amb' ? AMB[2] : SYM;
    // oven karmi hehkuu sykkien (ovi on vasemmassa seinässä: yläreuna nousee oikealle)
    const pulse = 0.5 + 0.5*Math.sin(t*2.5), x0 = b.x + 4, x1 = b.x + b.w - 4, sl = 0.5;
    const yTop = x => b.y + 26 - (x - x0)*sl, yBot = x => b.y + b.h - 4 - (x - x0)*sl;
    for (const x of [x0, x1]) for (let y = yTop(x); y < yBot(x); y++) if (BAYER[(y|0)&3][x&3] < 6 + pulse*10) px(x, y, col);
    for (let x = x0; x <= x1; x++) if (BAYER[(yTop(x)|0)&3][x&3] < 6 + pulse*10) px(x, yTop(x), col);
    if (opt.doorGlow === 'amb') readyMarker((x0 + x1)/2, yTop((x0 + x1)/2) - 2, t); } }
  // syvyysjärjestys c + r
  for (let i = 0; i < n; i++) if (cells[i]){ const w = ROOMS[r].w; list.push({i, c:cells[i], d:(i % w) + ((i / w) | 0), col:i % w}); }
  list.sort((a, b) => a.d - b.d || a.col - b.col);
  const over = [];   // merkit piirretään kaikkien esineiden päälle
  for (const it of list){
    const c = it.c, i = it.i, lifted = opt.pick && opt.pick.r === r && opt.pick.i === i;
    let [x, y] = cellAnchor(r, i, ox, oy); const fy = y; if (lifted) y -= 5 + Math.round(Math.sin(t*4));
    const seed = (c.id || i)*1.7;
    if (c.kind === 'vessel'){
      const v = vesselV(c), [base, front] = vesselSprites(c.type, v); if (!base) continue;
      const T = strain(c.strain), dry = c.strain && c.moist < 0.1;
      if (isReady(c)) L.drawImage(outline(base, Math.sin(t*3) > 0 ? AMB[2] : AMB[1], 'v' + c.type + vLevel(v)), Math.round(x - base.ax) - 1, Math.round(y - base.ay) - 1);
      // tyhjä astia ja itiöitä varastossa: hiljainen syaani ääriviiva (istuta tähän)
      else if (!c.strain && Object.keys(S.spores).length && Math.sin(t*2) > 0.2) L.drawImage(outline(base, SYM, 'e' + c.type), Math.round(x - base.ax) - 1, Math.round(y - base.ay) - 1);
      draw(base, x, y);
      const pxp = base.plant ? x - base.ax + base.plant.x : x, pyp = base.plant ? y - base.ay + base.plant.y : y - 21;
      let top = pyp - 10;
      if (T){
        const [sh, stage] = shroomSprite(c.strain, c, v);
        if (sh){
          top = pyp - sh.ay;
          // hengittävä hehku vain kypsällä, hyvinvoivalla kasvustolla
          if (!dry && stage === 'kypsa' && v > 0.6){ const br = 0.5 + 0.5*Math.sin(t*1.3 + seed); dithHalo(pxp, top + sh.h*0.25, sh.w*0.45 + 2, sh.h*0.22 + 2, T.col[1], br*0.22); }
          drawShroom(sh, pxp, pyp + (dry ? 1 : 0), (!dry && stage !== 'itu') ? Math.round(Math.sin(t*0.9 + seed)*1.2) : 0);
        }
      }
      draw(front, x, y);
      const topY = y - base.ay;
      if (isReady(c)){ const w = c.waves || 0; over.push(() => { readyMarker(x, topY, t);
        for (let k = 0; k < w; k++) rect(x - 7 + k*5, topY - 3, 3, 2, AMB[2]); }); }   // satoaallot pisteinä
      else if (c.strain && c.moist < 0.25) over.push(() => drop(x, topY, t));
      if (c.strain && !isReady(c) && !(T && T.auto)) bar(x, fy + 13, c.growth, T ? T.col[1] : P.ui3);
      DRAWN.push({r, i, kind:'obj', s:base, x, y, box:{x:x - base.ax, y:topY, w:base.w, h:base.h}});
    } else {
      const s = spriteV(deviceSprite(c), 1); if (!s) continue;
      if (c.done) L.drawImage(outline(s, Math.sin(t*3) > 0 ? AMB[2] : AMB[1], deviceSprite(c)), Math.round(x - s.ax) - 1, Math.round(y - s.ay) - 1);
      if (c.busy && !c.done && c.type === 'hautomo') dithHalo(x, y - s.ay*0.5, 26, 30, '#d9702a', 0.15 + 0.1*Math.sin(t*1.5));
      draw(s, x, y);
      const topY = y - s.ay;
      if (c.done) over.push(() => readyMarker(x, topY, t));
      else if (c.busy) bar(x, fy + 13, c.t, c.type === 'hautomo' ? '#c4428f' : AMB[1]);
      DRAWN.push({r, i, kind:'obj', s, x, y, box:{x:x - s.ax, y:topY, w:s.w, h:s.h}});
    }
    if (lifted){ const o = DRAWN[DRAWN.length - 1]; if (Math.sin(t*8) > -0.3) L.drawImage(outline(o.s, AMB[2], 'pick' + o.s.w + 'x' + o.s.h + (c.type||'')), Math.round(o.box.x) - 1, Math.round(o.box.y) - 1); }
  }
  // V2.0: toisen taakse jäävä esine. Jos alle puolet esineestä näkyy, sen ääriviiva piirretään edessä olevien läpi
  // ja napautus päällekkäiseen kohtaan antaa valita (pickAt palauttaa myös takana olevat: also).
  const objs = DRAWN.filter(o => o.kind === 'obj' && o.r === r);
  objs.forEach((o, k) => { const P0 = samples(o.s); let seen = 0;
    for (const [sx, sy] of P0){ const X = o.box.x + sx, Y = o.box.y + sy; let cov = false;
      for (let j = k + 1; j < objs.length && !cov; j++){ const q = objs[j]; cov = alphaAt(q.s, X - q.box.x, Y - q.box.y) > 0; }
      if (!cov) seen++; }
    o.hidden = P0.length > 0 && seen/P0.length < 0.5;
    if (o.hidden){ const c = cells[o.i], hot = c && (c.kind === 'vessel' ? isReady(c) : c.done);
      L.drawImage(outline(o.s, hot ? AMB[1] : P.gl2, 'hid' + o.s.w + 'x' + o.s.h + (c ? c.type : '')), Math.round(o.box.x) - 1, Math.round(o.box.y) - 1); } });
  over.forEach(f => f());
  for (const sp of SPOTS[r]) if (!sp.noTap){ const b = spotBox(r, sp.id, ox, oy); if (b) DRAWN.push({r, kind:'spot', id:sp.id, box:b}); }
  if (opt.guide && opt.guide.length) guideTargets(r, t, opt.guide, ox, oy);
}
// aloitusopastus (TP8): kohde sykkii meripihkana ja sen yllä pomppii nuoli. Laatikot talteen käyttöliittymän koordinaateissa.
function guideArrow(x, y, t){
  const b = Math.round(Math.sin(t*6)*2), X = Math.round(x), Y = Math.round(y) - 4 + b;
  for (let k = 0; k < 5; k++){ rect(X - k - 1, Y - k - 1, 2*k + 3, 1, AMB[0]); rect(X - k, Y - k, 2*k + 1, 1, AMB[2]); }
  rect(X - 2, Y - 11, 5, 6, AMB[0]); rect(X - 1, Y - 10, 3, 6, AMB[2]);
}
function guideTargets(r, t, keys, ox, oy){
  const on = Math.sin(t*5) > -0.2, col = on ? AMB[2] : AMB[1];
  for (const k of keys){ const [kind, kr, ki] = k.split(':'); if (kind !== 'spot' && kr !== r) continue;
    let box = null;
    if (kind === 'cell'){ const o = DRAWN.find(q => q.kind === 'obj' && q.r === r && q.i === +ki);
      if (o){ L.drawImage(outline(o.s, col, 'guide' + o.s.w + 'x' + o.s.h), Math.round(o.box.x) - 1, Math.round(o.box.y) - 1); box = o.box; }
      else if (kind === 'cell') continue; }
    if (kind === 'floor' || (kind === 'cell' && !box)){ const [x, y] = cellAnchor(r, +ki, ox, oy);
      diamond(x, y, col, false); diamond(x, y - 1, AMB[0], true); box = {x:x - 44, y:y - 22, w:88, h:44}; }
    if (kind === 'spot'){ if (r !== 'huone' && kr === 'ovi') continue; box = spotBox(r, kr, ox, oy); if (!box) continue;
      for (let k2 = 0; k2 < box.h; k2 += 2) if (on){ px(box.x, box.y + k2, AMB[2]); px(box.x + box.w - 1, box.y + k2, AMB[2]); } }
    if (!box) continue;
    guideArrow(box.x + box.w/2, box.y - 6, t);
    GUIDE_BOXES.push({...boxUi(box), key:k});
  }
}

// tilan vaihdon siirtymä: kellariin mennään alas, huoneeseen ylös
export const TRANS = {from:null, to:null, t0:0, dur:450};
export function startTransition(from, to){ TRANS.from = from; TRANS.to = to; TRANS.t0 = performance.now(); }

export function drawIso(t, opt){
  DRAWN = [];
  if (ATL.state === 'loading'){ L.fillStyle = P.bg0; L.fillRect(0, 0, IW, IH); return; }
  L.fillStyle = P.bg0; L.fillRect(0, 0, IW, IH);
  const a = (performance.now() - TRANS.t0)/TRANS.dur;
  if (TRANS.from && a < 1){
    const e = ease(a), dir = TRANS.to === 'kellari' ? -1 : 1;
    drawRoomAt(TRANS.from, t, {}, 0, Math.round(dir*IH*e));
    drawRoomAt(TRANS.to, t, opt, 0, Math.round(-dir*IH*(1 - e)));
  } else { TRANS.from = null; drawRoomAt(S.cur, t, opt, 0, 0); }
}

// osuma kerroksen pisteeseen: esine (alfa, edestä taakse) → lattiaruutu → erikoiskohde
export function pickAt(lx, ly){
  if (TRANS.from) return null;
  for (let k = DRAWN.length - 1; k >= 0; k--){ const o = DRAWN[k]; if (o.kind !== 'obj') continue;
    if (alphaAt(o.s, lx - o.box.x, ly - o.box.y) > 0){ const also = [];
      for (let j = k - 1; j >= 0; j--){ const q = DRAWN[j]; if (q.kind === 'obj' && q.hidden && alphaAt(q.s, lx - q.box.x, ly - q.box.y) > 0) also.push({r:q.r, i:q.i}); }
      return {kind:'cell', r:o.r, i:o.i, also}; } }
  let best = null, bd = 1e9;
  for (const o of DRAWN) if (o.kind === 'floor'){ const d = Math.abs(lx - o.x)/44 + Math.abs(ly - o.y)/22; if (d <= 1 && d < bd){ bd = d; best = o; } }
  if (best) return {kind:'cell', r:best.r, i:best.i};
  for (const o of DRAWN) if (o.kind === 'spot' && lx >= o.box.x && lx < o.box.x + o.box.w && ly >= o.box.y && ly < o.box.y + o.box.h) return {kind:'spot', id:o.id, r:o.r};
  return null;
}
// käyttöliittymän koordinaatit (192-avaruus) ↔ kerros
export const toLayer = (x, y) => [x*2 - ORG.x, y*2 - ORG.y];
export const toUi = (lx, ly) => [(lx + ORG.x)/2, (ly + ORG.y)/2];
const boxUi = b => ({x:(b.x + ORG.x)/2, y:(b.y + ORG.y)/2, w:b.w/2, h:b.h/2});
// poikkileikkauskerroksen piste käyttöliittymän koordinaatteina (efektit)
export const xsecUi = (lx, ly) => [(lx + XORG.x)/2, (ly + XORG.y)/2];
// ruudun (tai sen esineen) näkyvä laatikko käyttöliittymän koordinaateissa, null jos ei näkyvissä
export function cellBoxUi(r, i){
  const o = DRAWN.find(q => q.kind === 'obj' && q.r === r && q.i === i); if (o) return boxUi(o.box);
  const f = DRAWN.find(q => q.kind === 'floor' && q.r === r && q.i === i); if (f) return boxUi({x:f.x - 44, y:f.y - 22, w:88, h:44});
  return null;
}
// efektien lokaattori (TP6, fx.js setLocator): kaikki käyttöliittymän koordinaateissa
export const isoLocator = {
  cell: (r, i) => (window.__U && __U.view === 'vessel') ? ((__U.sel && __U.sel.r === r && __U.sel.i === i) ? {x:(48 + XORG.x)/2, y:(128 + XORG.y)/2, w:143, h:136, xsec:true} : null) : cellBoxUi(r, i),
  window: () => { if (S.cur !== 'huone' || !DRAWN.length) return null; const b = spotBox('huone', 'ikkuna', 0, 0); return b ? boxUi(b) : null; },
  counter: () => { const s = Math.floor(S.hopea) + ' ' + CUR; return {x: W - 4 - tw(s)/2, y: 6}; }
};

// ---------- kokoaminen näytölle ----------
// Poikkileikkauksen zoomaus: ZOOM = {dir:+1 sisään / -1 ulos, box (UI), t0, snap = poikkileikkauskerroksen kopio}
export const ZOOM = {dir:0, box:null, t0:0, dur:260, snap:null};
export function zoomActive(){ return ZOOM.dir !== 0 && performance.now() - ZOOM.t0 < ZOOM.dur; }
export function startZoom(dir, box){
  ZOOM.dir = dir; ZOOM.box = box || {x:W/2 - 20, y:120, w:40, h:40}; ZOOM.t0 = performance.now();
  if (dir < 0){ ZOOM.snap = mk(IW, IH); ZOOM.snap.getContext('2d').drawImage(XL, 0, 0); }
}
// sctx: näytön konteksti, k: kerroin natiivipikselistä näytön pikseliin, view: 'room' | 'vessel' | muu (vain puskuri)
export function composite(sctx, buf, k, view){
  const SW = buf.width, SH = buf.height;
  sctx.imageSmoothingEnabled = false;
  sctx.fillStyle = P.bg0; sctx.fillRect(0, 0, SW*k, SH*k);
  const z = zoomActive();
  // huonealue natiivina: kerrokset rajataan siihen (vaakatilassa sivupaneeli jää oikealle)
  const rx = 0, ry = LAY.ry*RES, rw = LAY.rw*RES, rh = LAY.rh*RES;
  sctx.save(); sctx.beginPath(); sctx.rect(rx*k, ry*k, rw*k, rh*k); sctx.clip();
  if (view === 'room' || z) sctx.drawImage(layer, 0, 0, IW, IH, ORG.x*k, ORG.y*k, IW*k, IH*k);
  if (view === 'vessel' && !z && LAY.land && rw > IW){   // lähikuvan seinä ja lattia jatkuvat huonealueen reunoihin
    const fy = Math.max(0, 452 + XORG.y);
    sctx.fillStyle = '#141c28'; sctx.fillRect(0, 0, rw*k, fy*k); sctx.fillStyle = '#1f262c'; sctx.fillRect(0, fy*k, rw*k, (rh - fy)*k); }
  if (view === 'vessel' || z){
    // poikkileikkaus kasvaa ruudun laatikosta koko näkymään (tai kutistuu takaisin)
    let a = 1; if (z){ a = ease((performance.now() - ZOOM.t0)/ZOOM.dur); if (ZOOM.dir < 0) a = 1 - a; }
    const full = {x:XORG.x/2, y:XORG.y/2, w:IW/2, h:IH/2}, b = ZOOM.box || full, lerp = (p, q) => p + (q - p)*a;
    const x = lerp(b.x, full.x), y = lerp(b.y, full.y), w = lerp(b.w, full.w), h = lerp(b.h, full.h);
    if (z) sctx.globalAlpha = Math.min(1, 0.3 + a);
    sctx.drawImage(z && ZOOM.dir < 0 ? ZOOM.snap : XL, 0, 0, IW, IH, Math.round(x*2*k), Math.round(y*2*k), Math.round(w*2*k), Math.round(h*2*k));
    sctx.globalAlpha = 1;
  }
  sctx.restore();
  sctx.drawImage(buf, 0, 0, SW, SH, 0, 0, SW*k, SH*k);
}
