// Päätön ajoympäristö: lataa pelin oman logiikan (koti/js/data.js, state.js, sim.js, events.js)
// Nodessa ilman DOMia. Kello (Date.now) ja satunnaisuus (Math.random) korvataan, jotta ajo on
// toistettava siemenellä. Pelin logiikkaa ei kopioida: botti kutsuu samoja funktioita kuin käyttöliittymä.
import { visitTimes } from './profiles.js';

// ---- selainrajapinnan tyngät ennen pelimoduulien latausta ----
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: () => {}, removeItem: () => {} };
globalThis.location = { search: '' };

const BASE_MS = Date.UTC(2026, 10, 16, 6, 0, 0);   // ma 16.11.2026 klo 8 Suomen aikaa
let clockSec = 0;
Date.now = () => BASE_MS + Math.round(clockSec * 1000);

let rngState = 1;
function mulberry32(){ rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0; let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
Math.random = mulberry32;

export const D = await import('../../koti/js/data.js');
export const ST = await import('../../koti/js/state.js');
export const G = await import('../../koti/js/sim.js');
const EV = await import('../../koti/js/events.js');
// TP5:n rihmaretki (valinnainen: käytetään, jos tiedosto on pelissä)
export const R = await import('../../koti/js/retki.js').catch(() => null);

// pelin offline-kasvun yläraja (main.js catchUp: enintään 8 h)
export const OFFLINE_CAP = 8 * 3600;

let cur = null;   // käynnissä olevan ajon mittarit
EV.on('*', (data, name) => { if (cur) cur.onEvent(name, data); });

export const MILESTONES = [
  ['firstSale',   'ENSIMMÄINEN MYYNTI'],
  ['lab',         'LABORATORIO AUKI'],
  ['hautomo',     'HAUTOMO OSTETTU'],
  ['firstCross',  'ENSIMMÄINEN RISTEYTYS'],
  ['kehikko',     'KEHIKKO OSTETTU'],
  ['firstFilter', 'ENSIMMÄINEN SUODATIN'],
  ['hoitaja',     'HOITAJASIENI'],
  ['kellari',     'KELLARI'],
  ['firstBoard',  'ENSIMMÄINEN TAULUN TILAUS'],
  ['orderDone',   'TILAUS TÄYTETTY']
];

class Metrics {
  constructor(){
    this.t = 0; this.ms = {}; this.sales = {}; this.salesN = {}; this.purchases = []; this.byCell = {};
    this.counts = { mutation: 0, contamination: 0, fail: 0, cross: 0, rescue: 0, spike: 0, board: 0, chain: 0, frame: 0, retki: 0, harvest: 0, sporeTake: 0, filter: 0 };
    this.visits = []; this.events = []; this.log = [];
  }
  mark(k){ if (this.ms[k] === undefined){ this.ms[k] = this.t; this.log.push(h(this.t) + ' ' + k); } }
  onEvent(name, d){
    const S = ST.S;
    this.events.push(name);
    switch (name){
      case 'myynti': this.mark('firstSale'); this.sales[d.tuote] = (this.sales[d.tuote] || 0) + d.hopea; this.salesN[d.tuote] = (this.salesN[d.tuote] || 0) + d.n; break;
      case 'avaus': if (d.mita === 'laboratorio') this.mark('lab'); break;
      case 'osto': {
        const p = { key: d.tuote, price: d.hinta, t: this.t, credits: [] }; this.purchases.push(p);
        if (d.tuote === 'hautomo' || d.tuote === 'kehikko' || d.tuote === 'kellari') this.mark(d.tuote);
        if (d.tuote === 'kellari') this.byCell['room:kellari'] = p;
        this.log.push(h(this.t) + ' osto ' + d.tuote + ' ' + d.hinta); break; }
      case 'sijoitus': {
        const id = d.esine.id, type = d.esine.type;
        const p = this.purchases.find(q => q.key === type && !q.cell);
        if (p){ p.cell = id; this.byCell[id] = p; } break; }
      case 'malja-auki': {
        const r = d.tulos; this.counts.cross++;
        if (r.kind === 'new'){ this.mark('firstCross'); if (r.key.startsWith('hoitaja')) this.mark('hoitaja'); if (r.key.includes('~')) this.counts.mutation++; }
        else if (r.kind === 'villi') this.counts.contamination++; else this.counts.fail++;
        this.log.push(h(this.t) + ' malja ' + r.kind + (r.key ? ' ' + r.key : '')); break; }
      case 'korjuu': this.counts.harvest++; this.credit(d.astia, 'raw:' + d.kanta.split('~')[0], d.n); break;
      case 'itiot': this.counts.sporeTake++; this.credit(d.astia, 'itio:' + d.kanta, 1); break;
      case 'laite-keruu': if (d.laite.type === 'kehikko'){
        const prod = d.tuote || (/SUODATIN/.test(d.viesti || '') ? 'suodatin' : 'muotti');
        this.counts.frame++; if (prod === 'suodatin'){ this.counts.filter++; this.mark('firstFilter'); }
        this.credit(d.laite, prod, 1); } break;
      case 'tilaus-valmis': if (d.lahde === 'taulu'){ this.counts.board++; this.mark('firstBoard'); } else this.mark('orderDone'); break;
      case 'virstanpylvas': this.counts.chain++; break;
      case 'pelastus': this.counts.rescue++; break;
      case 'kysyntapiikki': this.counts.spike++; break;
      case 'testiloyto': case 'retki-loyto': this.counts.retki++; break;
    }
  }
  credit(obj, prod, n){
    const c = { t: this.t, prod, n };
    const p = this.byCell[obj.id]; if (p) p.credits.push(c);
    if (!obj.id) return;
    const inCellar = ST.S.rooms.kellari.cells.some(x => x && x.id === obj.id);
    if (inCellar && this.byCell['room:kellari']) this.byCell['room:kellari'].credits.push(c);
  }
}
const h = t => (t / 3600).toFixed(1) + 'h';

// ---- odottavat päätökset käynnin alussa ----
export function pendingDecisions(){
  const S = ST.S, cells = ST.allCells(), anySpore = Object.values(S.spores).some(n => n > 0);
  const out = { korjuu: 0, laite: 0, istutus: 0, malja: 0, kehikko: 0, myynti: 0, toimitus: 0, sijoitus: 0 };
  for (const { c } of cells){
    if (c.kind === 'vessel'){ if (G.waves ? G.waves(c) > 0 : c.ready) out.korjuu++; else if (!c.strain && anySpore) out.istutus++; }
    else if (c.done) out.laite++;
    else if (!c.busy && c.type === 'hautomo' && (S.inv.agar || 0) > 0 && Object.keys(S.spores).length >= 2) out.malja++;
    else if (!c.busy && c.type === 'kehikko' && (S.inv['raw:kalvo'] || 0) >= D.DEVICES.kehikko.need) out.kehikko++;
  }
  if (Object.keys(S.inv).some(k => k.startsWith('raw:') || k === 'villi')) out.myynti = 1;
  if (S.order && !S.flags.done && (S.inv.suodatin || 0) > 0) out.toimitus = 1;
  const free = Object.values(S.rooms).some(r => r.owned && r.cells.some(c => !c));
  if (free && (S.vesselInv.length || S.deviceInv.length)) out.sijoitus = 1;
  return out;
}

// main.js: syncKnown + checkUnlocks + rescue pelin avautuessa
function onOpen(){
  const S = ST.S;
  for (const k in S.spores){ const b = k.split('~')[0]; if (D.STRAINS[b]) S.known[b] = 1; }
  G.checkUnlocks(); G.rescue();
}
function advance(sec, speed){ G.simulate(sec * speed); clockSec += sec; if (cur) cur.t = clockSec; }

// Yksi ajo: profiili, siemen, politiikka. Palauttaa mittarit.
export function runOne({ profile, seed, days = 14, speed = 1, policy, stopAtDone = true, offlineCap = OFFLINE_CAP }){
  rngState = (seed * 2654435761) >>> 0;
  clockSec = 0;
  ST.replaceState(ST.newGame());
  const S = ST.S; S.speed = speed;
  const M = cur = new Metrics();
  const times = visitTimes(profile, days);
  const bot = policy.create({ G, S, D, ST, R, profile, metrics: M, now: () => clockSec });
  let last = 0;
  for (const t of times){
    if (t < clockSec) continue;   // käynti venyi seuraavan päälle
    const away = t - clockSec;
    // poissaolo: peli simuloi enintään offlineCap sekuntia (kuten main.js), loppu aika ei kulu pelissä
    G.simulate(Math.min(offlineCap, away) * speed); clockSec = t; M.t = t;
    onOpen();
    const pend = pendingDecisions();
    const growing = ST.allCells().filter(o => o.c.kind === 'vessel' && o.c.strain).length;
    const busy = ST.allCells().filter(o => o.c.kind === 'device' && o.c.busy).length;
    const ev0 = M.events.length;
    // umpikuja: risteytyksen vanhempaa ei ole itiöinä eikä kasvamassa (tulos vielä tuntematon)
    const lost = [];
    const brewing = ST.allCells().filter(o => o.c.dish).map(o => (G.recipeFor(o.c.dish.a, o.c.dish.b) || {}).out);
    for (const r of D.RECIPES) if (!S.known[r.out] && !brewing.includes(r.out)) for (const b of [r.a, r.b]){
      if (!S.known[b]) continue;
      const has = Object.keys(S.spores).some(k => k.split('~')[0] === b && S.spores[k] > 0) || ST.allCells().some(o => o.c.strain && o.c.strain.split('~')[0] === b);
      if (!has && !lost.includes(b)) lost.push(b); }
    if (lost.length) M.lostVisits = (M.lostVisits || 0) + 1, M.lost = [...new Set([...(M.lost || []), ...lost])];
    // käynti: toimi, odota 30 s, toimi... visitMin minuutin ajan
    let acts = 0; const steps = Math.max(1, Math.round(profile.visitMin * 2));
    for (let i = 0; i < steps; i++){
      acts += bot.act();
      if (i < steps - 1) advance(30, speed);
    }
    G.rescue();
    const evN = M.events.length - ev0;
    M.visits.push({ t: clockSec, day: Math.floor(t / 86400) + 1, hopea: S.hopea, pending: Object.values(pend).reduce((a, b) => a + b, 0),
      pendBy: pend, acts, events: evN, idle: growing === 0 && busy === 0 && acts === 0 });
    last = t;
    if (S.flags.done && stopAtDone) break;
  }
  cur = null;
  return summarize(M, S, times, last);
}

function summarize(M, S, times, last){
  // toteutunut keskihinta tuotteittain (myymättömälle perushinta)
  const avg = id => M.salesN[id] ? M.sales[id] / M.salesN[id] : (G.basePrice(id) || 0);
  // suodatin arvotetaan tilauksen palkkiolla (palkkio / tarve); kalvoheltta saa puolet suodattimen arvosta
  // jaettuna tarpeella ja kehikko toisen puolen. Myymätön tuote arvotetaan perushinnalla.
  const filterV = D.ORDER.reward / D.ORDER.need, kalvoV = filterV / 2 / D.DEVICES.kehikko.need;
  const value = c => c.prod === 'suodatin' ? filterV / 2 * c.n : c.prod === 'raw:kalvo' ? Math.max(kalvoV, avg(c.prod)) * c.n : avg(c.prod) * c.n;
  const purchases = M.purchases.map(p => {
    let cost = p.price;
    if (p.key === 'kellari'){   // kellarin takaisinmaksu: tila + sinne sijoitetut astiat
      const ids = new Set(S.rooms.kellari.cells.filter(Boolean).map(c => c.id));
      cost += M.purchases.filter(q => ids.has(q.cell)).reduce((a, q) => a + q.price, 0);
    }
    let cum = 0, pay = null;
    for (const c of p.credits.slice().sort((a, b) => a.t - b.t)){ cum += value(c); if (cum >= cost){ pay = (c.t - p.t) / 3600; break; } }
    return { key: p.key, t: p.t / 3600, price: p.price, cost, earned: Math.round(cum), paybackH: pay };
  });
  const totalSales = Object.values(M.sales).reduce((a, b) => a + b, 0);
  const ms = {}; for (const [k] of MILESTONES) ms[k] = M.ms[k] === undefined ? null : M.ms[k] / 3600;
  const v = M.visits;
  return {
    done: !!S.flags.done, endH: last / 3600, visits: v.length,
    milestones: ms, purchases, sales: M.sales, salesN: M.salesN, totalSales,
    counts: M.counts,
    pendingMean: v.reduce((a, x) => a + x.pending, 0) / Math.max(1, v.length),
    actsMean: v.reduce((a, x) => a + x.acts, 0) / Math.max(1, v.length),
    emptyVisits: v.filter(x => x.events === 0).length,
    idleVisits: v.filter(x => x.idle).length,
    lostVisits: M.lostVisits || 0, lost: M.lost || [],
    curve: v.map(x => [Math.round(x.t / 360) / 10, Math.round(x.hopea * 10) / 10]),
    final: { hopea: Math.round(S.hopea), spores: S.spores, inv: S.inv,
      vessels: ST.allCells().filter(o => o.c.kind === 'vessel').map(o => o.c.type + ':' + (o.c.strain || '-')) },
    log: M.log
  };
}
