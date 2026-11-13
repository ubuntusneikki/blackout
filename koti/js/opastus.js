// Aloitusopastus (TP8): tilapohjainen, yksi hehkuva kohde kerrallaan. Ei lukitse mitään eikä muuta pelilogiikkaa.
// Joka ruudulla guide(U) valitsee ensimmäisen askeleen, jonka ehto täyttyy nykyisessä tilassa. Jos pelaaja tekee
// asiat toisin, ehdot vain lakkaavat täyttymästä ja opastus siirtyy seuraavaan. Kerran opetettavat asiat
// merkitään S.opastus.nahty[id] = 1 (tapahtumista events.js:n kautta tai kun vihje on näkynyt tarpeeksi kauan).
//
// Kohteet annetaan avaimina, joita piirto vertaa (isGuided):
//   'btn:MARKKINA'  napin teksti (loppu-* = alkuosa, esim. 'btn:KORJAA*')
//   'tab:OSTA'      markkinan välilehti        'row:LASIPURKKI'  modaalin rivin otsikko (myös loppu-*)
//   'cell:huone:4'  esine isometrisessä huoneessa   'floor:huone:7'  vapaa lattiaruutu   'spot:ovi'
import {S, save, strain, neighbors} from './state.js';
import {on, emit} from './events.js';
import * as sim from './sim.js';
import * as retki from './retki.js';
import {VESSELS, STRAINS, SHOP, FRAME, FRAME_ORDER, PRODUCTS, SYM, P} from './data.js';
import {rect, dot, text, wrapLines, W, setGuideTest} from './gfx.js';

export const defaults = () => ({vaihe:null, nahty:{}, pois:false});
const O = () => S.opastus || (S.opastus = defaults());
const seen = id => !!O().nahty[id];
export function mark(id){ if (!O().nahty[id]){ O().nahty[id] = 1; save(); } }
export function enabled(){ return !O().pois; }
export function setEnabled(v){ O().pois = !v; save(); }
export function restart(){ const p = O().pois; S.opastus = defaults(); S.opastus.pois = p; shown = {}; flash = null; save(); }

// ---------- tapahtumat ----------
let flash = null;                 // lyhyt selitys ilman kohdetta: {id, text, until}
const say = (id, txt, ms) => { if (!seen(id)){ mark(id); flash = {id, text:txt, until:performance.now() + (ms||6000)}; } };
on('myynti', () => { if (enabled()) say('hinta', 'HINTA LASKEE JOKAISESTA MYYDYSTÄ JA NOUSEE TAAS PARISSA TUNNISSA.'); });
on('sumutus', () => mark('sumutus'));
on('istutus', d => { if (d.kanta && d.kanta.split('~')[0] === 'ruusu') mark('ruusu'); });
on('korjuu', d => { mark('korjaa'); if ((d.aallot||0) >= 2) mark('aallot'); });
on('retki-alku', () => mark('retki'));
on('laite-alku', d => { if (d.resepti) mark('kehikko'); });
on('malja-auki', () => mark('lab'));           // varalla, kunnes TP7:n paljastus-loppu on käytössä
on('paljastus-loppu', d => { if (d.lahde === 'malja') mark('lab'); });
on('osto', d => { if (d.tuote === 'kellari') mark('kellari'); });
// pelaaja lähtee: ensimmäinen käynti on ohi, jos lupausnäkymä oli jo esillä
document.addEventListener('visibilitychange', () => { if (document.hidden && O().vaihe === 'lupaus') mark('ensi'); });

// ---------- apurit ----------
function cellsOf(pred){ const out = []; for (const r in S.rooms){ if (!S.rooms[r].owned) continue;
  S.rooms[r].cells.forEach((c, i) => { if (c && pred(c, r, i)) out.push({c, r, i}); }); } return out; }
const vessels = () => cellsOf(c => c.kind === 'vessel');
const isReady = c => !!(c.ready || c.waves > 0);
const plantedKinds = () => Object.keys(S.spores).filter(k => S.spores[k] > 0);
// reitti esineeseen: ensin oikeaan näkymään, sitten itse kohde (inner = avaimet astian lähikuvassa tai laitteen modaalissa)
function toCell(U, r, i, inner, modalType){
  if (U.modal){ if (modalType && U.modal.type === modalType && U.modal.c === S.rooms[r].cells[i]) return inner || []; return ['btn:SULJE']; }
  if (U.view === 'vessel'){ if (U.sel && U.sel.r === r && U.sel.i === i) return inner || []; return ['btn:<']; }
  if (U.view !== 'room') return ['btn:< TAKAISIN'];
  if (U.build) return ['btn:VALMIS'];
  if (S.cur !== r) return ['btn:' + (r === 'kellari' ? 'KELLARI' : 'HUONE')];
  return ['cell:' + r + ':' + i];
}
function toMarket(U, tab, rows){
  const m = U.modal;
  if (m && m.type === 'market'){ if (m.tab !== tab) return ['tab:' + {sell:'MYY', buy:'OSTA', board:'TAULU'}[tab]]; return rows; }
  if (m) return ['btn:SULJE'];
  if (U.view === 'vessel') return ['btn:<'];
  if (U.view !== 'room') return ['btn:< TAKAISIN'];
  if (U.build) return ['btn:VALMIS'];
  return ['btn:MARKKINA'];
}
const toShop = (U, k) => toMarket(U, 'buy', ['row:' + SHOP[k].name + '*']);
// asetettava esine: vapaa ruutu nykyisestä tilasta (ensin muiden astioiden vierestä), modaalissa oikea rivi
function toPlace(U, name){
  const m = U.modal;
  if (m && m.type === 'place') return ['row:' + name];
  if (m) return ['btn:SULJE'];
  if (U.view === 'vessel') return ['btn:<'];
  if (U.view !== 'room' || U.build) return U.build ? ['btn:VALMIS'] : ['btn:< TAKAISIN'];
  const cells = S.rooms[S.cur].cells, free = [];
  cells.forEach((c, i) => { if (!c) free.push(i); });
  if (!free.length) return [];
  // etummaiset ruudut (suurin sarake + rivi) eivät jää muiden esineiden taakse; ensin muiden astioiden vierestä
  const w = 4, depth = i => (i % w) + ((i / w) | 0), near = free.filter(i => neighbors(S.cur, i).some(j => cells[j]));
  const pool = near.length ? near : free; pool.sort((a, b) => depth(b) - depth(a) || a - b);
  return ['floor:' + S.cur + ':' + pool[0]];
}
function inGame(gs){ const s = gs/S.speed; return s >= 5400 ? Math.round(s/3600) + ' H' : s >= 90 ? Math.round(s/60) + ' MIN' : Math.max(1, Math.round(s)) + ' S'; }

// ---------- askeleet ----------
// Jokainen palauttaa null (ei nyt) tai {id, text, keys[], show?: ms jonka jälkeen merkitään nähdyksi}
const FIRST = [
  // horros ja sumutus: keskeyttää muun, kerran
  U => { if (seen('sumutus')) return null;
    const v = vessels().find(({c}) => c.strain && VESSELS[c.type].dry > 0 && !(strain(c.strain)||{}).auto && c.moist < 0.35); if (!v) return null;
    return {id:'sumutus', text: v.c.moist < 0.1 ? 'KUIVUNUT SIENI NUKKUU. SE HERÄÄ, KUN SUMUTAT.' : 'ASTIA KUIVUU. SUMUTA SE, NIIN KASVU JATKUU.',
      keys: toCell(U, v.r, v.i, ['btn:SUMUTA'])}; },
  U => { if (seen('korjaa')) return null; const v = vessels().find(({c}) => isReady(c)); if (!v) return null;
    return {id:'korjaa', text:'SIENI ON KYPSÄ. NAPAUTA SITÄ JA KORJAA SATO.', keys: toCell(U, v.r, v.i, ['btn:KORJAA*'])}; },
  U => { if (vessels().some(({c}) => c.strain)) return null;
    const empty = vessels().filter(({c}) => !c.strain), v = empty.find(({c}) => c.type === 'terraario') || empty[0];
    if (!v || !plantedKinds().length) return null;
    const k = S.spores.heltta ? 'heltta' : plantedKinds()[0], name = strain(k).short;
    const plantOpen = U.modal && U.modal.type === 'plant' && U.modal.vs === v.c;
    return {id:'istuta', text: k === 'heltta' ? 'ISTUTA SINIHELTTA TERRAARIOON. SE VIIHTYY KOSTEASSA.' : 'ISTUTA ITIÖT ASTIAAN.',
      keys: plantOpen ? ['row:' + name] : toCell(U, v.r, v.i, ['btn:ISTUTA'], null)}; },
  U => { if (S.flags.firstHarvest) return null; const v = vessels().find(({c}) => c.strain && !isReady(c)); if (!v) return null;
    return {id:'kasvaa', text:'SIENI KASVAA. ODOTA HETKI.', keys: U.view === 'room' && !U.modal ? toCell(U, v.r, v.i) : []}; },
  U => { if (S.sold > 0) return null; const raw = Object.keys(S.inv).filter(k => k.startsWith('raw:') && S.inv[k] > 0); if (!raw.length) return null;
    return {id:'myy', text:'VIE SATO TORILLE. AVAA MARKKINA JA MYY.', keys: toMarket(U, 'sell', raw.map(k => 'row:' + sim.prodName(k)))}; },
  U => { if (seen('ruusu') || !S.sold || !(S.spores.ruusu > 0)) return null;
    const v = vessels().find(({c}) => !c.strain && c.type === 'purkki'); if (!v) return null;
    const plantOpen = U.modal && U.modal.type === 'plant' && U.modal.vs === v.c;
    return {id:'ruusu', text: plantOpen ? 'RUUSUSIENI ON KUIVAN JA LÄMPIMÄN KANTA. PURKKI ON KUIVA, JOTEN SE SOPII.' : 'ISTUTA RUUSUSIENI LASIPURKKIIN. SE VIIHTYY KUIVASSA.',
      keys: plantOpen ? ['row:RUUSUSIENI'] : toCell(U, v.r, v.i, ['btn:ISTUTA'])}; },
  U => { if (!S.sold || S.bought.purkki > 0 || S.vesselInv.length || S.hopea < SHOP.purkki.price(S)) return null;
    return {id:'osta', text:'HOPEA RIITTÄÄ UUTEEN LASIPURKKIIN. OSTA SE MARKKINALTA.', keys: toShop(U, 'purkki')}; },
  U => { if (!S.vesselInv.length) return null; const t = S.vesselInv[0];
    return {id:'sijoita', text:'NAPAUTA HEHKUVAA RUUTUA JA ASETA ' + VESSELS[t].name + ' SIIHEN.', keys: toPlace(U, VESSELS[t].name)}; },
  U => { if (!S.sold) return null; const up = sim.upcoming().find(o => o.aalto) || sim.upcoming()[0]; if (!up) return null;
    return {id:'lupaus', text:'SEURAAVA SATO ' + inGame(up.t) + '. VOIT LÄHTEÄ, KASVU JATKUU. TULE TAKAISIN.', keys:[], show:9000, done:'ensi'}; }
];

const LATER = [
  U => { if (seen('sumutus')) return null; return FIRST[0](U); },
  // laboratorio: ensiesittely (ainoa modaali) ja ensimmäinen risteytys paljastukseen asti
  U => { if (!S.flags.lab || seen('lab')) return null; return labStep(U); },
  U => { if (seen('aallot')) return null; const v = vessels().find(({c}) => (c.waves||0) >= 2); if (!v) return null;
    return {id:'aallot', text:'KYPSÄ KASVUSTO KERÄÄ JOPA 3 SATOAALTOA. EHDIT HYVIN TULLA MYÖHEMMIN.', keys: toCell(U, v.r, v.i, ['btn:KORJAA*'])}; },
  U => { if (seen('retki') || !retki.retkiOpen() || retki.status() || S.retki.n) return null;
    const keys = U.modal && U.modal.type === 'retki' ? ['row:LYHYT RETKI'] : U.modal ? ['btn:SULJE'] : U.view === 'room' && !U.build ? ['spot:ovi'] : toCell(U, 'huone', 0);
    return {id:'retki', text:'OVI ON AUKI. LÄHETÄ SYMBIONTTI RETKELLE HAKEMAAN LÖYTÖJÄ.', keys: keys.filter(k => !k.startsWith('cell'))}; },
  U => { if (seen('taulu') || !S.board.length) return null;
    if (U.modal && U.modal.type === 'market' && U.modal.tab === 'board') return {id:'taulu', text:'TILAUKSET MAKSAVAT PAREMMIN KUIN MYYNTI. YKSI VAIHTUU JOKA AAMU.', keys:[], show:5000};
    return {id:'taulu', text:'TORIN TAULULLA ON TILAUKSIA. NE MAKSAVAT PAREMMIN KUIN MYYNTI.', keys: toMarket(U, 'board', [])}; },
  U => { if (seen('kehikko') || !S.flags.lab || !seen('lab')) return null; return frameStep(U); },
  U => { if (seen('hoitaja')) return null; const h = vessels().find(({c}) => c.strain && (strain(c.strain)||{}).auto); if (!h) return null;
    const keys = U.view === 'room' && !U.modal && S.cur === h.r ? neighbors(h.r, h.i).map(j => (S.rooms[h.r].cells[j] ? 'cell:' : 'floor:') + h.r + ':' + j) : [];
    return {id:'hoitaja', text:'HOITAJASIENI PITÄÄ NELJÄ NAAPURIAAN KOSTEINA JA KASVATTAA NIITÄ. ASETA ASTIAT SEN VIEREEN.', keys, show:12000}; },
  U => { if (seen('kellari') || !SHOP.kellari.need(S) || S.hopea < SHOP.kellari.price(S)) return null;
    return {id:'kellari', text:'KELLARI ON MYYNNISSÄ. SIELLÄ ON KOSTEAA JA VIILEÄÄ, JA ASTIAT KUIVUVAT HITAAMMIN.', keys: toShop(U, 'kellari')}; },
  U => { if (seen('kellari-mene') || !S.rooms.kellari.owned) return null; if (S.cur === 'kellari'){ mark('kellari-mene'); return null; }
    return {id:'kellari-mene', text:'KELLARI ON NYT SINUN. VAIHDA TILAA ALHAALTA TAI PYYHKÄISEMÄLLÄ.', keys: U.view === 'room' && !U.modal ? ['btn:KELLARI'] : []}; }
];

function devCell(type){ return cellsOf(c => c.type === type)[0]; }
function labStep(U){
  if (!seen('lab-esittely')){
    if (U.view === 'room' && !U.modal){ U.modal = {type:'opastus', title:'LABORATORIO', txt:LAB_TXT}; mark('lab-esittely'); }
    return {id:'lab-esittely', text:'LABORATORIO AUKESI.', keys:[]};
  }
  const hau = devCell('hautomo');
  if (!hau){
    if (S.deviceInv.includes('hautomo')) return {id:'lab-aseta', text:'ASETA HAUTOMO HEHKUVAAN RUUTUUN.', keys: toPlace(U, 'HAUTOMO')};
    if (S.hopea < SHOP.hautomo.price(S)) return {id:'lab-saasta', text:'HAUTOMO MAKSAA ' + SHOP.hautomo.price(S) + ' HOPEAA. MYY SATOA, NIIN SAAT SEN.', keys:[]};
    return {id:'lab-osta', text:'OSTA HAUTOMO MARKKINALTA. SE KYPSYTTÄÄ AGAR-MALJAN.', keys: toShop(U, 'hautomo')};
  }
  const d = hau.c;
  if (d.done) return {id:'lab-avaa', text:'MALJA ON KYPSÄ. AVAA SE JA KATSO, MITÄ SYNTYI.', keys: U.view === 'room' && !U.modal ? ['btn:PALJASTUS', 'cell:' + hau.r + ':' + hau.i] : []};
  if (d.busy) return {id:'lab-odota', text:'MALJA KYPSYY ' + inGame((1 - d.t)*sim.devTime(d)) + '. TULE AAMULLA KATSOMAAN.', keys:[], show:9000, done:'lab-odota'};
  if (!(S.inv.agar > 0)){
    if (S.hopea < SHOP.agar.price(S)) return null;
    return {id:'lab-agar', text:'OSTA AGAR-MALJA. SILLÄ KAKSI KANTAA KASVAVAT YHDESSÄ.', keys: toShop(U, 'agar')};
  }
  const kinds = plantedKinds();
  if (kinds.length < 2){
    const v = vessels().find(({c}) => isReady(c) && !kinds.includes(c.strain));
    return {id:'lab-itiot', text:'TARVITSET KAHDEN KANNAN ITIÖT. OTA ITIÖT KYPSÄSTÄ SIENESTÄ.', keys: v ? toCell(U, v.r, v.i, ['btn:ITIÖT']) : []};
  }
  // ehdotus: siniheltta × ruususieni (kalvoheltta), jos itiöt ovat; muuten mitkä tahansa kaksi
  const pair = S.spores.heltta > 0 && S.spores.ruusu > 0 && !S.tried['heltta+ruusu'] ? ['heltta', 'ruusu'] : kinds.slice(0, 2);
  const m = U.modal, inDev = m && m.type === 'device' && m.c === d;
  const pick = inDev && m.pickA ? pair.find(k => k !== m.pickA) || kinds.find(k => k !== m.pickA) : pair[0];
  return {id:'lab-malja', text: inDev ? 'VALITSE KAKSI KANTAA. ' + strain(pair[0]).short + ' JA ' + strain(pair[1]).short + ' VOIVAT SOPIA YHTEEN.' : 'NAPAUTA HAUTOMOA JA ALOITA ENSIMMÄINEN RISTEYTYS.',
    keys: inDev ? ['row:' + strain(pick).short] : toCell(U, hau.r, hau.i, null, 'device')};
}
const LAB_TXT = 'NYT VOIT RISTEYTTÄÄ KANTOJA. HAUTOMO KYPSYTTÄÄ AGAR-MALJAN, JOLLA KAHDEN KANNAN RIHMASTOT KASVAVAT YHDESSÄ. KUN MALJA AUKEAA, NÄET MITÄ SYNTYI: UUSI KANTA, EI MITÄÄN TAI VILLI ITIÖ.';
function frameStep(U){
  const ke = devCell('kehikko');
  if (!ke){
    if (S.deviceInv.includes('kehikko')) return {id:'keh-aseta', text:'ASETA KEHIKKO HEHKUVAAN RUUTUUN.', keys: toPlace(U, 'KEHIKKO')};
    if (S.hopea < SHOP.kehikko.price(S)) return null;
    return {id:'keh-osta', text:'KEHIKKO KASVATTAA SADOSTA ELÄVÄN TUOTTEEN, JOKA ON ARVOKKAAMPI KUIN SATO.', keys: toShop(U, 'kehikko')};
  }
  const d = ke.c; if (d.busy || d.done) return null;
  const ok = FRAME_ORDER.find(k => S.known[k] && (S.inv['raw:' + k]||0) >= FRAME[k].need); if (!ok) return null;
  const m = U.modal, inDev = m && m.type === 'device' && m.c === d;
  return {id:'keh-resepti', text: inDev ? 'VALITSE KANTA JA MUOTO. ' + STRAINS[ok].name + ' KASVAA ' + PRODUCTS[FRAME[ok].out].name + 'KSI.' : 'NAPAUTA KEHIKKOA JA VALITSE, MITÄ SIIHEN KASVATETAAN.',
    keys: inDev ? ['row:' + PRODUCTS[FRAME[ok].out].name] : toCell(U, ke.r, ke.i, null, 'device')};
}

// ---------- valinta ----------
let cur = null, shown = {}, lastMs = 0;
export function guide(U){
  const now = performance.now(), dt = Math.min(500, now - (lastMs || now)); lastMs = now;
  if (!enabled() || U.view === 'reveal'){ cur = null; return null; }
  let st = null;
  if (flash && now < flash.until) st = {id:flash.id, text:flash.text, keys:[]};
  else { flash = null;
    const list = seen('ensi') ? LATER : FIRST;
    for (const f of list){ st = f(U); if (st) break; } }
  // laboratorion ensiesittely on auki: ensin SELVÄ
  if (st && U.modal && U.modal.type === 'opastus') st = {...st, keys:['btn:SELVÄ']};
  if (st && st.show){ shown[st.id] = (shown[st.id]||0) + dt; if (shown[st.id] > st.show){ mark(st.done || st.id); } }
  // ensimmäinen käynti päättyy myös, jos kaikki on jo tehty eikä mitään kasva (esim. vanha tallennus)
  if (!st && !seen('ensi') && S.sold > 0) mark('ensi');
  if ((st && st.id) !== O().vaihe){ O().vaihe = st ? st.id : null; if (st) emit('opastus', {askel:st.id}); }
  cur = st; return st;
}
export const current = () => cur;
export function isGuided(key){ if (!cur) return false;
  for (const g of cur.keys) if (g === key || (g.endsWith('*') && key.startsWith(g.slice(0, -1)))) return true; return false; }
setGuideTest(isGuided);
// iso.js: kohderuudut ja -paikat huoneessa
export function isoTargets(){ return cur ? cur.keys.filter(k => k.startsWith('cell:') || k.startsWith('floor:') || k.startsWith('spot:')) : []; }

// symbiontin vihjerivi yläpalkin alla: enintään 2 riviä
export function drawStrip(t){
  if (!cur || !cur.text) return;
  const L = wrapLines(cur.text, W - 18).slice(0, 2), h = 5 + L.length*9;
  rect(0, 14, W, h, 'rgba(11,16,24,0.86)'); rect(0, 14 + h, W, .5, '#34b8ac'); rect(0, 14.5 + h, W, .5, '#1d5c58');
  const p = Math.sin(t*3) > 0;   // symbiontin merkki: pieni sykkivä solmu
  rect(4.5, 18.5, 2, 2, p ? SYM : '#34b8ac'); rect(5, 16.5, 1, 6, '#34b8ac'); rect(3, 19, 5, 1, '#34b8ac'); dot(5.5, 19.5, '#ffffff');
  L.forEach((l, k) => text(l, 11, 17 + k*9, SYM));
}
