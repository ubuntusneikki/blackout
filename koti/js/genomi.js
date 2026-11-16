// V2.2: kannat genomeina. Puhdasta logiikkaa ilman DOMia ja ilman pelin tilaa (simulaattori ajaa saman koodin).
//
// Genomi on kolme geeniryhmää, jotka periytyvät kokonaisina:
//   M = [muodon pohjakanta, väri0, väri1, väri2]         MUOTO: rakenne (sprite) ja pigmentti
//   K = [alkuperä, kyky ('' | HOIDA | TARTU | KULJETA | AISTI), luonne 0–6]   KYKY
//   G = [alkuperä, sato 0–6, nopeus 1–6, kostea 0/1, lämmin 0/1]              KASVU
// Alkuperä = pohjakanta, jolta ryhmä on peräisin (nimi ja värisävy). Sama genomi on aina sama kanta: idOf().
// Rekisteri (S.kannat) tallentaa risteymistä {g, seed, pa, pb, from, mut, stab, nimi}; pohjakannat ovat data.js:ssä.
//
// Kaikki arvonta on determinististä siemenestä: jälkeläisen siemen = hash(pelaajan siemen, vanhempien siemenet,
// monesko malja tästä parista). Sama siemen antaa saman kannan millä tahansa laitteella (moninpeliä varten
// palvelimelle riittää myöhemmin siemen ja geenit). Math.random ei saa esiintyä tässä tiedostossa.
import {STRAINS, BASE_GENES, KYVYT, SPEED_TIME, CONTAM_P, MUT_P, MUT_PRICE, MUT_STAB, HYBRID_PRICE, PRICE_RATE,
  FRAME, FRAME_SHAPE, SHAPE_NAME} from './data.js';

// ---------- siemen ja satunnaisuus ----------
export function hash(str){ let h = 0x811c9dc5; for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function rng(seed){ let a = seed | 0; return function(){ a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- genomit ja tunnisteet ----------
// kyvyttömällä kannalla KYKY-ryhmällä ei ole alkuperää: kaksi kyvytöntä ryhmää ovat sama asia (ei kaksoiskantoja)
export function baseGenes(id){ const B = BASE_GENES[id], T = STRAINS[id]; return {M:[id, ...T.col], K:[B.K[0] ? id : '', ...B.K], G:[id, ...B.G]}; }
const copy = g => ({M:g.M.slice(), K:g.K.slice(), G:g.G.slice()});
export const sig = g => JSON.stringify([g.M, g.K, g.G]);
const BASE_SIG = {}; for (const id in BASE_GENES) BASE_SIG[sig(baseGenes(id))] = id;
export function idOf(g){ const s = sig(g); return BASE_SIG[s] || 'x' + hash(s).toString(36); }
export function genesOf(reg, id){ return STRAINS[id] ? baseGenes(id) : (reg && reg[id] ? reg[id].g : null); }
export function seedOf(reg, id){ return STRAINS[id] ? hash('solmu:' + id) : (reg && reg[id] ? reg[id].seed : 0); }
export function stabOf(reg, id){ return STRAINS[id] ? 1 : (reg && reg[id] ? reg[id].stab : 1); }

// ---------- värit ----------
const hex2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return '#' + [0, 1, 2].map(i => hex2(A[i] + (B[i] - A[i])*k)).join(''); };
function hsl(h, s, l){ h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2*l - 1))*s, x = c*(1 - Math.abs((h/60) % 2 - 1)), m = l - c/2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + hex2((r + m)*255) + hex2((g + m)*255) + hex2((b + m)*255); }
function toHsl(hex){ const [r, g, b] = rgb(hex).map(v => v/255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn)/2, d = mx - mn;
  if (!d) return [0, 0, l]; const s = d/(1 - Math.abs(2*l - 1));
  const h = mx === r ? 60*(((g - b)/d) % 6) : mx === g ? 60*((b - r)/d + 2) : 60*((r - g)/d + 4); return [h, s, l]; }
const shiftHue = (hex, deg) => { const [h, s, l] = toHsl(hex); return hsl(h + deg, s, l); };

// ---------- ominaisuudet geeneistä ----------
const DESC = new Map();
// kannan näkyvät ominaisuudet: sama muoto kuin data.js:n STRAINS-rivillä + geenien arvot.
// meta = rekisterin rivi (mut vaikuttaa hintaan); pohjakannoille meta jää pois ja hinta tulee STRAINS-taulusta.
export function describe(g, meta){
  const key = sig(g) + (meta && meta.mut ? meta.mut.t : ''); let d = DESC.get(key); if (d) return d;
  const mb = g.M[0], MB = STRAINS[mb], baseId = BASE_SIG[sig(g)];
  const sato = g.G[1], nopeus = g.G[2], grow = sato === 0 ? 420 : SPEED_TIME[nopeus];
  // pigmentti saa sävyä kasvun antaneelta linjalta, jotta risteymä erottuu muotonsa antajasta
  const col = g.G[0] !== mb ? g.M.slice(1).map((c, i) => mix(c, STRAINS[g.G[0]].col[i], 0.3)) : g.M.slice(1);
  let price = 0;
  if (baseId) price = STRAINS[baseId].price;
  else if (sato > 0) price = Math.round(PRICE_RATE*Math.pow(grow/3600, 0.85)/Math.pow(sato, 0.6)*HYBRID_PRICE*(meta && meta.mut ? MUT_PRICE[meta.mut.t] : 1)*10)/10;
  d = {base:mb, style:MB.style, col, tint:col.some((c, i) => c !== MB.col[i]), wet:!!g.G[3], warm:!!g.G[4], grow, yield:sato, price,
    sato, nopeus, kyky:g.K[1], luonne:g.K[2], auto:sato === 0, tends:g.K[1] === 'HOIDA', oM:g.M[0], oK:g.K[0], oG:g.G[0]};
  DESC.set(key, d); return d;
}
// kehikon muotti kannalle: pohjakannan oma rivi tai muodon rivi (null = ei kelpaa kehikkoon)
export function frameOf(reg, id){ if (FRAME[id]) return FRAME[id]; const g = genesOf(reg, id); return g ? (FRAME_SHAPE[STRAINS[g.M[0]].style] || null) : null; }

// ---------- piirteet tekstinä ----------
export const climateTxt = d => (d.wet ? 'KOSTEA' : 'KUIVA') + ' / ' + (d.warm ? 'LÄMMIN' : 'VIILEÄ');
export const kykyTxt = d => d.kyky ? d.kyky + ' ' + d.luonne : 'EI KYKYÄ';
export const kasvuTxt = d => d.sato ? 'SATO ' + d.sato + ' · NOPEUS ' + d.nopeus : 'EI SATOA';
// piirrerivit paljastukseen ja kantakirjaan: [otsikko, arvo, ryhmä]; tieto = {k, g} (tuntematon ryhmä näkyy kysymysmerkkinä)
export function traitRows(d, tieto){ const t = tieto || {};
  return [['MUOTO', SHAPE_NAME[d.style] + ' (' + STRAINS[d.oM].name + ')', 'M'],
          ['KYKY', t.k ? kykyTxt(d) : '?', 'K'],
          ['KASVU', t.g ? kasvuTxt(d) : '?', 'G'],
          ['ILMASTO', t.g ? climateTxt(d) : '?', 'G']]; }

// ---------- nimet ----------
const STEM = {heltta:'HELTTA', ruusu:'RUUSU', hamara:'NUPPI', kalvo:'KALVO', hoitaja:'HOITAJA', yoruusu:'YÖRUUSU', verkko:'VERKKO'};
const PREFIX = {heltta:'SINI', ruusu:'RUUSU', hamara:'HÄMÄRÄ', kalvo:'KALVO', hoitaja:'HOITO', yoruusu:'YÖ', verkko:'VERKKO'};
const MUT_PREFIX = {sato:'KULTA', nopeus:'PIKA', luonne:'TERÄ', vari:'KIRJO', ilmasto:'KARA', hyppy:'JALO', kyky:'TAITO', ainut:'AINO'};
export const NAME_MAX = 14;
// automaattinen nimi osista: mutaation tai kasvun (muuten kyvyn) antajan etuliite + muodon antajan runko
export function autoName(g, mut, taken){
  const m = g.M[0], other = g.G[0] !== m ? g.G[0] : (g.K[0] && g.K[0] !== m) ? g.K[0] : null;
  const pre = mut ? MUT_PREFIX[mut.k] : other ? PREFIX[other] : 'UUSI';
  const base = (pre + STEM[m]).slice(0, NAME_MAX); let n = base, i = 2;
  while (taken && taken(n)) n = base.slice(0, NAME_MAX - 2) + ' ' + (i++);
  return n; }

// ---------- mutaatiot ----------
// palauttaa {g, mut:{t:porras, k:laji, txt, grp}}; arvot nousevat (cozy: mutaatio on aina löytö, ei rangaistus)
export function mutate(g0, tier, r){
  for (let n = 0; n < 12; n++){
    const g = copy(g0), pickOf = list => list[Math.floor(r()*list.length)];
    if (tier === 'pieni'){
      const k = pickOf(['sato', 'sato', 'nopeus', 'nopeus', 'luonne', 'vari']);
      if (k === 'sato'){ if (g.G[1] < 1 || g.G[1] >= 5) continue; g.G[1]++; return {g, mut:{t:tier, k, txt:'SATO +1', grp:'G'}}; }
      if (k === 'nopeus'){ if (g.G[1] < 1 || g.G[2] >= 5) continue; g.G[2]++; return {g, mut:{t:tier, k, txt:'NOPEUS +1', grp:'G'}}; }
      if (k === 'luonne'){ if (!g.K[1] || g.K[2] >= 5) continue; g.K[2]++; return {g, mut:{t:tier, k, txt:'LUONNE +1', grp:'K'}}; }
      const deg = (r() < 0.5 ? -1 : 1)*(25 + Math.floor(r()*30)); for (let i = 1; i <= 3; i++) g.M[i] = shiftHue(g.M[i], deg);
      return {g, mut:{t:tier, k, txt:'UUSI VÄRISÄVY', grp:'M'}};
    }
    if (tier === 'harv'){
      const k = pickOf(['ilmasto', 'hyppy', 'kyky']);
      if (k === 'ilmasto'){ const w = r() < 0.5; if (w) g.G[3] = g.G[3] ? 0 : 1; else g.G[4] = g.G[4] ? 0 : 1;
        return {g, mut:{t:tier, k, txt:'ILMASTO: ' + (w ? (g.G[3] ? 'KOSTEA' : 'KUIVA') : (g.G[4] ? 'LÄMMIN' : 'VIILEÄ')), grp:'G'}}; }
      if (k === 'hyppy'){ if (g.G[1] < 1) continue; const s = r() < 0.5;
        if (s){ if (g.G[1] > 3) continue; g.G[1] += 2; return {g, mut:{t:tier, k, txt:'SATO +2', grp:'G'}}; }
        if (g.G[2] > 3) continue; g.G[2] += 2; return {g, mut:{t:tier, k, txt:'NOPEUS +2', grp:'G'}}; }
      const ky = pickOf(KYVYT.filter(x => x !== g.K[1])); g.K[0] = g.K[0] || g.M[0]; g.K[1] = ky; g.K[2] = 1 + Math.floor(r()*3);
      return {g, mut:{t:tier, k, txt:'UUSI KYKY: ' + ky, grp:'K'}};
    }
    // ainutlaatuinen: oma väritys siemenestä ja yksi arvo yli tavallisen rajan
    const h = r()*360; g.M[1] = hsl(h, 0.55, 0.22); g.M[2] = hsl(h, 0.62, 0.52); g.M[3] = hsl(h + 20, 0.9, 0.82);
    const k = pickOf(g.G[1] > 0 ? (g.K[1] ? ['sato', 'nopeus', 'luonne'] : ['sato', 'nopeus']) : (g.K[1] ? ['luonne'] : ['nopeus']));
    if (k === 'sato') g.G[1] = 6; else if (k === 'nopeus') g.G[2] = 6; else g.K[2] = 6;
    return {g, mut:{t:tier, k:'ainut', txt:'OMA VÄRI, ' + k.toUpperCase() + ' 6', grp:k === 'luonne' ? 'K' : 'G'}};
  }
  const g = copy(g0), deg = 30 + Math.floor(r()*30); for (let i = 1; i <= 3; i++) g.M[i] = shiftHue(g.M[i], deg);
  return {g, mut:{t:tier, k:'vari', txt:'UUSI VÄRISÄVY', grp:'M'}};
}

// ---------- risteytys ----------
// reg = kantarekisteri, a ja b = vanhempien tunnisteet, pseed = pelaajan siemen, n = monesko malja tästä parista.
// Palauttaa {kind:'villi', seed} tai {kind:'new', key, g, seed, from:{M,K,G}, mut, stab, pa, pb}.
// from kertoo, kummalta vanhemmalta ('a' | 'b') kukin ryhmä tuli.
export function cross(reg, a, b, pseed, n){
  const sa = seedOf(reg, a), sb = seedOf(reg, b), seed = hash([pseed >>> 0, Math.min(sa, sb), Math.max(sa, sb), n | 0].join(':'));
  const r = rng(seed);
  if (r() < CONTAM_P) return {kind:'villi', seed};
  const ga = genesOf(reg, a), gb = genesOf(reg, b);
  // kaikki ryhmäyhdistelmät, jotka eivät ole kumpikaan vanhempi; jos vanhemmat eroavat vain yhdessä ryhmässä, tulos on vanhempi
  const combos = [], seen = {};
  for (let m = 1; m < 7; m++){ const from = {M:m & 1 ? 'b' : 'a', K:m & 2 ? 'b' : 'a', G:m & 4 ? 'b' : 'a'};
    const g = {M:(m & 1 ? gb : ga).M.slice(), K:(m & 2 ? gb : ga).K.slice(), G:(m & 4 ? gb : ga).G.slice()}, id = idOf(g);
    if (id === a || id === b || seen[id]) continue; seen[id] = 1; combos.push({g, from}); }
  let c = combos.length ? combos[Math.floor(r()*combos.length)] : (r() < 0.5 ? {g:copy(ga), from:{M:'a', K:'a', G:'a'}} : {g:copy(gb), from:{M:'b', K:'b', G:'b'}});
  const stab0 = Math.min(stabOf(reg, a), stabOf(reg, b)), k = Math.min(2, 1 + (1 - stab0)), u = r();
  const tier = u < MUT_P.ainut*k ? 'ainut' : u < (MUT_P.ainut + MUT_P.harv)*k ? 'harv' : u < (MUT_P.ainut + MUT_P.harv + MUT_P.pieni)*k ? 'pieni' : null;
  let g = c.g, mut = null;
  if (tier){ const m = mutate(g, tier, r); g = m.g; mut = m.mut; }
  const stab = Math.max(0.1, Math.round((stab0 - 0.1 - (mut ? MUT_STAB[mut.t] : 0))*100)/100);
  return {kind:'new', key:idOf(g), g, seed, from:c.from, mut, stab, pa:a, pb:b};
}
// villi linja retkeltä: tunnetun pohjakannan mutatoitunut sukulainen (siemenestä)
export function wildVariant(baseId, seed){
  const r = rng(seed), m = mutate(baseGenes(baseId), r() < 0.2 ? 'harv' : 'pieni', r);
  return {kind:'new', key:idOf(m.g), g:m.g, seed, from:{M:'a', K:'a', G:'a'}, mut:m.mut, stab:Math.max(0.1, 1 - 0.1 - MUT_STAB[m.mut.t]), pa:baseId, pb:null, villi:true};
}
// vanhan tallennuksen mutaatio (kanta~grow / kanta~yield) genomiksi
export function legacyMutant(baseId, perk){
  const g = baseGenes(baseId); if (g.G[1] < 1) return null;
  if (perk === 'yield') g.G[1] = Math.min(6, g.G[1] + 1); else g.G[2] = Math.min(6, g.G[2] + 1);
  const mut = perk === 'yield' ? {t:'pieni', k:'sato', txt:'SATO +1', grp:'G'} : {t:'pieni', k:'nopeus', txt:'NOPEUS +1', grp:'G'};
  return {kind:'new', key:idOf(g), g, seed:hash('vanha:' + baseId + '~' + perk), from:{M:'a', K:'a', G:'a'}, mut, stab:0.8, pa:baseId, pb:null};
}
