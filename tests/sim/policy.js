// Botin politiikka: "järkevä ahne" pelaaja. Politiikka koostuu moduuleista, jotka ajetaan järjestyksessä
// jokaisella käynnin kierroksella. Uusi mekaniikka (satoaallot, muottireseptit, rihmaretki, torin taulu)
// lisätään omana moduulinaan: { name, act(ctx) -> tehtyjen toimien määrä }.
//
// ctx: { G (sim.js), S (tila), D (data.js), ST (state.js), profile, metrics, now(), opt, plan }

const base = k => k.split('~')[0];
// TP3: satoaallot (G.waves) tai vanha ready-lippu
const isReady = (ctx, c) => ctx.G.waves ? ctx.G.waves(c) > 0 : !!c.ready;
// TP3: kehikon reseptit (D.FRAME: kanta -> {tuote|out, need, time}); vanha kehikko = kalvo -> suodatin
export function frameRecipes(ctx){ const { D } = ctx;
  if (!D.FRAME) return [{ key: 'kalvo', out: 'suodatin', need: D.DEVICES.kehikko.need }];
  return Object.entries(D.FRAME).map(([key, f]) => ({ key, out: f.tuote || f.out || f.product || f.id, need: f.need || 3 })); }
// taulun tilaus: given on totuusarvo (koko tilaus kerralla) tai määrä
const boardLeft = o => o.given === true ? 0 : (o.n || 0) - (o.given || 0);
// torin taulun tarpeet tuotteittain (TP3)
export function boardNeed(ctx){ const out = {}; for (const o of (ctx.S.board || [])){ const left = boardLeft(o); if (left > 0) out[o.tuote] = (out[o.tuote] || 0) + left; } return out; }
const cells = ctx => ctx.ST.allCells();
const vessels = ctx => cells(ctx).filter(o => o.c.kind === 'vessel');
const devices = (ctx, type) => cells(ctx).filter(o => o.c.kind === 'device' && o.c.type === type);
const ownsDevice = (ctx, type) => devices(ctx, type).length + ctx.S.deviceInv.filter(t => t === type).length;
const spores = (ctx, b) => Object.entries(ctx.S.spores).filter(([k]) => base(k) === b).reduce((a, [, n]) => a + n, 0);
const sporeKey = (ctx, b) => Object.keys(ctx.S.spores).filter(k => base(k) === b && ctx.S.spores[k] > 0).sort((x, y) => (y.includes('~') - x.includes('~')))[0];
const freeCells = ctx => { const out = []; for (const r of ['kellari', 'huone']){ const R = ctx.S.rooms[r]; if (!R.owned) continue; R.cells.forEach((c, i) => { if (!c) out.push([r, i]); }); } return out; };

// tuottoarvio: yksikköä per käyntiväli (kasvu jatkuu korjuun jälkeen kohdasta 0.35)
function yieldOf(ctx, vs, key){ const { D, G } = ctx, T = ctx.ST.strain(key), m = D.MATCH_MULT[G.matchOf(vs, key)];
  return Math.max(1, Math.round(T.yield * D.VESSELS[vs.type].size * m)); }
function cycleSec(ctx, vs, key){ const { D, G } = ctx, T = ctx.ST.strain(key); return 0.65 * T.grow / D.MATCH_MULT[G.matchOf(vs, key)]; }
// mitä kalvoheltta on arvoltaan, kun kehikko on: suodatin / tarve
function unitValue(ctx, b){ const { D, S } = ctx;
  if (b === 'kalvo' && kalvoNeed(ctx) > 0) return D.SELL_BASE.suodatin / D.DEVICES.kehikko.need;
  return D.SELL_BASE.raw; }
function plantScore(ctx, vs, key){
  const gap = ctx.plan.gapSec, n = yieldOf(ctx, vs, key), cyc = Math.max(cycleSec(ctx, vs, key), gap);
  return n * unitValue(ctx, base(key)) / cyc;
}

// risteytysten vanhemmat, joiden tulos on vielä tuntematon (tai kalvoheltta tarvitaan lisää)
export function neededParents(ctx){ const { S, D } = ctx, out = new Set();
  for (const r of D.RECIPES) if (!S.known[r.out]) { out.add(r.a); out.add(r.b); }
  return [...out]; }
// itiövaraus: montako itiötä kannasta pidetään (risteytykset ja kalvoheltan levitys)
function reserve(ctx, b){
  const { S } = ctx;
  if (!S.flags.lab) return (b === 'heltta' || b === 'ruusu' || (b === 'hamara' && !S.known.hoitaja)) ? 1 : 0;
  if (b === 'heltta') return 2;
  if (b === 'ruusu') return 1;
  if (b === 'hamara') return S.known.hoitaja ? 0 : 1;
  if (b === 'kalvo') return 99;      // kalvoheltan itiöt istutetaan, ei myydä
  if (b === 'hoitaja') return 99;
  return 0;
}
function kalvoNeed(ctx){ // montako kalvohelttaa tilaus vielä tarvitsee (suodattimina)
  const { S, D } = ctx; if (S.flags.done) return 0;
  // tilaus tulee ketjun lopussa: kun kalvoheltta ja kehikko ovat, kalvohelttaa kasvatetaan jo valmiiksi (kuten pelaaja)
  const order = S.order || (S.known.kalvo && ownsDevice(ctx, 'kehikko') ? { need: (D.ORDER && D.ORDER.need) || 5, given: 0 } : null);
  if (!order) return 0;
  const left = order.need - order.given - (S.inv.suodatin || 0) - devices(ctx, 'kehikko').filter(o => o.c.busy).length;
  return Math.max(0, left) * D.DEVICES.kehikko.need; }
// ketjun askel "kasvata tuote kehikossa": pidä halvimman reseptin sato kehikkoa varten (siniheltta), kunnes askel on tehty
function muottiReserve(ctx){ const { S, G, D } = ctx; if (!D.FRAME || !ownsDevice(ctx, 'kehikko') || S.flags.frame) return null;
  const st = G.chainStep && G.chainStep(); if (st && ['tilaus'].includes(st.id)) return null;
  return D.FRAME_ORDER ? D.FRAME_ORDER.find(k => S.known[k]) : 'heltta'; }
function kalvoTarget(ctx){ // montako kalvohelttaa halutaan kasvamaan: kehikoiden tarve per käynti, ei enempää
  const { S, D } = ctx; if (!S.known.kalvo || !ownsDevice(ctx, 'kehikko') || !kalvoNeed(ctx)) return 0;
  const suitable = vessels(ctx).filter(o => ctx.G.matchOf(o.c, 'kalvo') >= 1).length;
  return Math.min(suitable, Math.ceil(D.DEVICES.kehikko.need * ownsDevice(ctx, 'kehikko') / 3) + 1);
}

export const MODULES = {
  // valmiit laitteet: malja auki, suodatin talteen
  laitteet: { act(ctx){ let n = 0;
    for (const { c } of cells(ctx)) if (c.kind === 'device' && c.done){ if (c.type === 'hautomo') ctx.G.openDish(c); else ctx.G.collectDevice(c); n++; }
    return n; } },

  // korjuu: sato tai itiöt sen mukaan, tarvitaanko itiöitä
  korjuu: { act(ctx){ const { S, G } = ctx; let n = 0;
    const kalvoGrowing = vessels(ctx).filter(o => o.c.strain && base(o.c.strain) === 'kalvo').length;
    for (const { c } of vessels(ctx)){ if (!isReady(ctx, c)) continue; const b = base(c.strain);
      let need = spores(ctx, b) < Math.min(reserve(ctx, b), b === 'kalvo' ? 0 : 9);
      if (neededParents(ctx).includes(b) && spores(ctx, b) < 2) need = true;
      if (b === 'kalvo' && kalvoGrowing + spores(ctx, 'kalvo') < kalvoTarget(ctx)) need = true;
      if (need) G.takeSpores(c); else G.harvest(c); n++; }
    return n; } },

  // sumutus: vain jos kasvu muuten pysähtyisi
  hoito: { act(ctx){ let n = 0;
    for (const { c } of vessels(ctx)){ const V = ctx.D.VESSELS[c.type]; if (c.strain && V.dry > 0 && c.moist < 0.5 && !ctx.ST.strain(c.strain).auto){ ctx.G.mist(c); n++; } }
    return n; } },

  // kalvoheltta parempiin astioihin, kun kehikko on: kompostoi muut kannat pois
  vaihto: { act(ctx){ const { S, G } = ctx; let n = 0;
    if (!S.known.kalvo || !ownsDevice(ctx, 'kehikko') || S.flags.done) return 0;
    // parhaiten kalvoheltalle sopivat astiat ensin; valmis sato korjataan ennen vaihtoa
    const cand = vessels(ctx).filter(o => o.c.strain && !['kalvo', 'hoitaja'].includes(base(o.c.strain)) && G.matchOf(o.c, 'kalvo') >= 1)
      .sort((x, y) => G.matchOf(y.c, 'kalvo') - G.matchOf(x.c, 'kalvo') || ctx.D.VESSELS[y.c.type].size - ctx.D.VESSELS[x.c.type].size);
    for (const { c } of cand){
      const b0 = base(c.strain);
      if (neededParents(ctx).includes(b0) && vessels(ctx).filter(o => o.c.strain && base(o.c.strain) === b0).length <= 1) continue;
      if (!spores(ctx, 'kalvo')) break;
      const growing = vessels(ctx).filter(o => o.c.strain && base(o.c.strain) === 'kalvo').length;
      if (growing >= kalvoTarget(ctx)) break;
      if (isReady(ctx, c)) G.harvest(c);
      G.clearVessel(c); G.plant(c, sporeKey(ctx, 'kalvo')); n++;
    }
    return n; } },

  // istutus: paras kanta vapaaseen astiaan; hoitaja keskelle naapureita
  istutus: { act(ctx){ const { S, G } = ctx; let n = 0;
    // emokanta: risteytykseen tarvittavaa kantaa pidetään kasvamassa yhdessä astiassa, jotta itiöitä saa lisää
    for (const b of neededParents(ctx)){
      if (vessels(ctx).some(o => o.c.strain && base(o.c.strain) === b) || !spores(ctx, b)) continue;
      const free = vessels(ctx).filter(o => !o.c.strain).sort((x, y) => G.matchOf(y.c, b) - G.matchOf(x.c, b))[0];
      if (free){ G.plant(free.c, sporeKey(ctx, b)); n++; }
    }
    for (const { c } of vessels(ctx)){ if (c.strain) continue;
      const kalvoGrowing = vessels(ctx).filter(o => o.c.strain && base(o.c.strain) === 'kalvo').length;
      const opts = Object.keys(S.spores).filter(k => S.spores[k] > 0 && (spores(ctx, base(k)) > reserve(ctx, base(k)) || base(k) === 'hoitaja'
        || (base(k) === 'kalvo' && (kalvoGrowing < kalvoTarget(ctx) || !S.order))));
      if (!opts.length){ // varaus estää: istuta silti, jos mitään ei kasva (ei umpikujaa)
        if (vessels(ctx).some(o => o.c.strain)) continue;
        opts.push(...Object.keys(S.spores).filter(k => S.spores[k] > 0)); }
      const k = opts.sort((a, b) => plantScore(ctx, c, b) - plantScore(ctx, c, a))[0];
      if (k){ G.plant(c, k); n++; } }
    return n; } },

  // laboratorio: kalvoheltta ensin, sitten hoitaja, sitten lisää kalvohelttaa
  laboratorio: { act(ctx){ const { S, G } = ctx; let n = 0;
    for (const { c } of devices(ctx, 'hautomo')){ if (c.busy || !(S.inv.agar > 0)) continue;
      let pair = null;
      const has = b => spores(ctx, b) > 0;
      if (!S.known.kalvo && has('heltta') && has('ruusu')) pair = ['heltta', 'ruusu'];
      else if (!S.known.hoitaja && has('heltta') && has('hamara')) pair = ['heltta', 'hamara'];
      else if (S.known.kalvo && !S.flags.done && spores(ctx, 'kalvo') === 0 && has('heltta') && has('ruusu')) pair = ['heltta', 'ruusu'];
      if (pair && G.startDish(c, sporeKey(ctx, pair[0]), sporeKey(ctx, pair[1]))) n++; }
    return n; } },

  // kehikko: suodatin tilaukseen ensin, sitten taulun tarvitsema tuote, sitten arvokkain resepti
  kehikko: { act(ctx){ const { S, G, D } = ctx; let n = 0;
    const raw = k => (S.inv['raw:' + k] || 0), bn = boardNeed(ctx);
    const price = id => (D.SELL_BASE[id] !== undefined ? D.SELL_BASE[id] : (G.basePrice(id) || 0));
    for (const { c } of devices(ctx, 'kehikko')){ if (c.busy) continue;
      const opts = frameRecipes(ctx).filter(r => raw(r.key) >= r.need).map(r => ({ ...r,
        score: (r.out === 'suodatin' && S.order && !S.flags.done ? 1000 : 0) + (bn[r.out] ? 500 : 0) + price(r.out) - r.need * (G.basePrice('raw:' + r.key) || 2) }))
        .filter(r => r.score > 0).sort((a, b) => b.score - a.score);
      if (!opts.length) continue;
      const ok = D.FRAME ? G.startFrame(c, opts[0].key) : (G.startFrame(c), c.busy);
      if (ok) n++; }
    return n; } },

  // torin taulu (TP3): toimita heti, kun tuotteita on
  taulu: { act(ctx){ const { S, G } = ctx; let n = 0;
    if (!S.board || !G.deliverBoard) return 0;
    for (const o of S.board.slice()){ if (boardLeft(o) <= 0) continue;
      const have = G.boardHave(o), ok = typeof have === 'number' ? have >= boardLeft(o) : !!have;
      if (ok){ const h0 = S.hopea; G.deliverBoard(o.id); if (S.hopea !== h0 || boardLeft(o) <= 0) n++; } }
    return n; } },

  // myynti: myy kunnes yksikköhinta painuu alle kynnyksen; piikkituote kokonaan
  myynti: { act(ctx){ const { S, G, D, opt } = ctx; let n = 0;
    for (const id of G.sellables()){
      const [k, s] = id.split(':');
      if (id === 'raw:kalvo' && S.known.kalvo && !S.order) continue;   // kehikkoa odotetaan
      if (id === 'suodatin' && !S.flags.done) continue;
      let can = G.owned(id);
      if (k === 'raw' && muottiReserve(ctx) === s) can = Math.max(0, can - D.FRAME[s].need);
      if (k === 'itio') can = Math.max(0, spores(ctx, base(s)) - reserve(ctx, base(s)) - (S.flags.lab ? 1 : 0));
      if (k === 'itio') can = Math.min(can, S.spores[s] || 0);
      if (id === 'raw:kalvo') can = Math.max(0, can - kalvoNeed(ctx));
      const bn = boardNeed(ctx); if (bn[id]) can = Math.max(0, can - bn[id]);
      if (id === 'suodatin' && !S.order && !S.flags.done) continue;
      const spike = S.market.spike && S.market.spike.id === id;
      let q = 0; while (q < can && (spike || G.unitPrice(id, q) >= opt.sellFloor * G.basePrice(id))) q++;
      if (q > 0){ G.sell(id, q); n++; } }
    if (S.order && !S.flags.done && S.inv.suodatin > 0){ G.deliver(); n++; }
    return n; } },

  // ostot: säästä seuraavaan virstanpylvääseen, osta astioita ylijäämällä
  ostot: { act(ctx){ const { S, G, D } = ctx; let n = 0;
    const tryBuy = k => { const it = D.SHOP[k]; if (!it || (it.need && !it.need(S))) return false; const p = it.price(S); if (S.hopea < p) return false;
      const h0 = S.hopea; G.buy(k); if (S.hopea < h0){ n++; return true; } return false; };
    if (S.flags.lab && !ownsDevice(ctx, 'hautomo')) tryBuy('hautomo');
    if (ownsDevice(ctx, 'hautomo') && !(S.inv.agar > 0) && (!S.known.hoitaja || !S.flags.done)) tryBuy('agar');
    if (!ownsDevice(ctx, 'kehikko') && (D.FRAME || S.known.kalvo)) tryBuy('kehikko');
    // toinen kehikko, jos kalvohelttaa kertyy enemmän kuin yksi kehikko ehtii kasvattaa
    else if (ctx.opt.extraFrames && S.order && !S.flags.done && ownsDevice(ctx, 'kehikko') < 1 + ctx.opt.extraFrames
      && (S.inv['raw:kalvo'] || 0) >= 2 * ctx.D.DEVICES.kehikko.need && kalvoNeed(ctx) > 2 * ctx.D.DEVICES.kehikko.need) tryBuy('kehikko');
    // varaus seuraavaa pakollista hankintaa varten
    let keep = 0;
    if (!ownsDevice(ctx, 'hautomo')) keep = S.sold >= ctx.D.LAB_UNLOCK_SOLD - 4 ? D.SHOP.hautomo.price(S) : 0;
    else if (!ownsDevice(ctx, 'kehikko')) keep = S.known.kalvo || devices(ctx, 'hautomo').some(o => o.c.busy) ? D.SHOP.kehikko.price(S) : 0;
    const devicesToCome = (ownsDevice(ctx, 'hautomo') ? 0 : 1) + (ownsDevice(ctx, 'kehikko') ? 0 : 1);
    const free = freeCells(ctx).length - S.vesselInv.length - S.deviceInv.length;
    // kellari, kun huone on täynnä
    if (!S.rooms.kellari.owned && ownsDevice(ctx, 'kehikko') && free <= 0 && S.hopea >= D.SHOP.kellari.price(S) + keep) tryBuy('kellari');
    // astiat: paras tuotto per hinta, jos tilaa ja ylijäämää
    if (free - devicesToCome > 0){
      const opts = ['terraario', 'purkki'].map(k => { const p = D.SHOP[k].price(S); const probe = { type: k };
        const best = Math.max(...Object.keys(S.known).filter(x => ctx.D.STRAINS[x] && !ctx.D.STRAINS[x].auto).map(x => plantScore(ctx, probe, x)));
        return { k, p, roi: best / p }; }).sort((a, b) => b.roi - a.roi);
      const o = opts[0]; if (S.hopea - o.p >= keep) tryBuy(o.k);
    }
    return n; } },

  // sijoitus: laitteet huoneeseen, astiat kellariin ensin (kostea kasvaa nopeammin)
  sijoitus: { act(ctx){ const { S, G } = ctx; let n = 0;
    while (S.deviceInv.length){ const f = freeCells(ctx).filter(([r]) => r === 'huone')[0] || freeCells(ctx)[0]; if (!f) break; G.place(f[0], f[1], 'device', S.deviceInv[0]); n++; }
    while (S.vesselInv.length){ const f = freeCells(ctx)[0]; if (!f) break; G.place(f[0], f[1], 'vessel', S.vesselInv[0]); n++; }
    return n; } },

  // retki: TP5:n rihmaretki (koti/js/retki.js), jos se on pelissä; muuten asetusten TESTILÖYTÖ kerran vuorokaudessa.
  // Rihmaretki: nouda paluu, lähde lyhyelle aina kun voi, syvälle kun suodattimia on yli tilauksen tarpeen.
  retki: { act(ctx){ const { S, G, opt, R } = ctx;
    if (!opt.retki) return 0;
    if (R){ let n = 0;
      const st = R.status && R.status();
      if (st && st.back){ R.collect(); n++; }
      const spare = (S.inv.suodatin || 0) - (S.order && !S.flags.done ? S.order.need - S.order.given : 0);
      if (opt.deepRetki && spare > 0 && R.canStart('syva')){ R.start('syva'); n++; }
      else if (R.canStart('lyhyt')){ R.start('lyhyt'); n++; }
      return n; }
    if (!S.flags.lab) return 0;
    const day = Math.floor(ctx.now() / 86400);
    if (ctx.plan.lastRetkiDay === day) return 0;
    if ((ctx.plan.retkiCount || 0) >= opt.retkiMax) return 0;
    S.retkiReady = 0; G.retki(); ctx.plan.lastRetkiDay = day; ctx.plan.retkiCount = (ctx.plan.retkiCount || 0) + 1; return 1; } }
};

export const DEFAULT_ORDER = ['laitteet', 'korjuu', 'taulu', 'myynti', 'ostot', 'sijoitus', 'laboratorio', 'kehikko', 'vaihto', 'istutus', 'hoito', 'retki'];
export const DEFAULT_OPT = { sellFloor: 0.6, retki: true, retkiMax: 99, extraFrames: 1, deepRetki: true };

export function makePolicy({ order = DEFAULT_ORDER, opt = {} } = {}){
  const o = { ...DEFAULT_OPT, ...opt };
  return {
    name: 'ahne', order, opt: o,
    create(base){
      const hrs = base.profile.hours, gaps = hrs.slice(1).map((h, i) => (h - hrs[i]) * 3600);
      const ctx = { ...base, opt: o, plan: { gapSec: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 86400 } };
      return {
        // yksi kierros: moduulit järjestyksessä, toistetaan kunnes mitään ei tapahdu
        act(){ let total = 0; for (let i = 0; i < 6; i++){ let n = 0; for (const k of order) n += MODULES[k].act(ctx); total += n; if (!n) break; } return total; }
      };
    }
  };
}
