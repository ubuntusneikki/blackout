// Talouden simulaattori. Ajo repon juuresta:
//   node tests/sim/run.js --profile 4 --seeds 20
// Valitsimet: --profile aktiivinen|4|2|kaikki  --seeds N  --days N  --speed N  --no-retki
//             --sell-floor 0.6  --out tests/sim/out  --name perus  --quiet  --full (JSON:iin loki ja hopeakäyrä)
import fs from 'node:fs';
import path from 'node:path';
import { runOne, MILESTONES, D } from './engine.js';
import { PROFILES, PROFILE_ALIASES } from './profiles.js';
import { makePolicy } from './policy.js';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const profArg = String(arg('profile', '4'));
const profKeys = profArg === 'kaikki' || profArg === 'all' ? ['aktiivinen', '4', '2'] : profArg.split(',').map(p => PROFILE_ALIASES[p] || p);
for (const p of profKeys) if (!PROFILES[p]){ console.error('tuntematon profiili: ' + p + ' (aktiivinen, 4, 2, kaikki)'); process.exit(1); }
const seeds = +arg('seeds', 20), days = +arg('days', 14), speed = +arg('speed', 1);
const outDir = arg('out', 'tests/sim/out'), name = arg('name', null), quiet = !!arg('quiet', false);
const policy = makePolicy({ opt: { retki: !arg('no-retki', false), sellFloor: +arg('sell-floor', 0.6) } });

// ---- tilastot ----
const stat = xs => { const v = xs.filter(x => x !== null && x !== undefined && !Number.isNaN(x)); if (!v.length) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  const s = v.slice().sort((a, b) => a - b); return { n: v.length, mean: m, sd, min: s[0], med: s[(s.length - 1) >> 1], max: s[s.length - 1] }; };
const f1 = x => x === null || x === undefined ? '–' : (Math.round(x * 10) / 10).toFixed(1);
const dayOf = h => h === null ? '–' : 'pv ' + (Math.floor(h / 24) + 1);
const fmtH = h => h === null || h === undefined ? '–' : h < 48 ? f1(h) + ' h' : f1(h / 24) + ' vrk';

function runProfile(pk){
  const profile = PROFILES[pk], runs = [];
  for (let s = 1; s <= seeds; s++) runs.push({ seed: s, ...runOne({ profile, seed: s, days, speed, policy }) });
  return { key: pk, profile, runs };
}

function report(res){
  const { profile, runs } = res, L = [];
  const N = runs.length, done = runs.filter(r => r.done).length;
  L.push(`## Profiili ${profile.name} (${profile.desc})`, '');
  L.push(`${N} siementä, enintään ${days} vrk, nopeus ×${speed}. Tilaus täytetty ${done}/${N} ajossa.`, '');
  L.push('### Virstanpylväät (tunteja pelin alusta)', '', '| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |', '|---|---|---|---|---|---|---|---|');
  const msStats = {};
  for (const [k, label] of MILESTONES){ const st = stat(runs.map(r => r.milestones[k])); msStats[k] = st;
    L.push(`| ${label} | ${st ? st.n : 0}/${N} | ${st ? fmtH(st.mean) : '–'} | ${st ? f1(st.sd) + ' h' : '–'} | ${st ? fmtH(st.min) : '–'} | ${st ? fmtH(st.med) : '–'} | ${st ? fmtH(st.max) : '–'} | ${st ? dayOf(st.med) : '–'} |`); }
  L.push('');
  // ostot ja takaisinmaksu
  const byKey = {};
  for (const r of runs) r.purchases.forEach((p, i) => { const idx = r.purchases.slice(0, i).filter(q => q.key === p.key).length + 1;
    const k = p.key + (['terraario', 'purkki', 'agar'].includes(p.key) ? '' : ''); (byKey[k] = byKey[k] || { all: [], first: [] }).all.push(p); if (idx === 1) byKey[k].first.push(p); });
  L.push('### Ostot ja takaisinmaksu', '', 'Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.', '',
    '| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |', '|---|---|---|---|---|---|---|');
  for (const k of Object.keys(byKey)){ const all = byKey[k].all, first = stat(byKey[k].first.map(p => p.t));
    const pay = stat(all.map(p => p.paybackH)), paid = all.filter(p => p.paybackH !== null).length;
    const noValue = k === 'hautomo' || k === 'agar';
    L.push(`| ${k} | ${f1(all.length / N)} | ${first ? f1(first.mean) : '–'} | ${f1(stat(all.map(p => p.price)).mean)} | ${noValue ? 'avaus' : pay ? fmtH(pay.mean) : '–'} | ${noValue ? '' : pay ? fmtH(pay.med) : '–'} | ${noValue ? '' : paid + '/' + all.length} |`); }
  L.push('');
  // myynnin jakauma
  const tot = {}; let all = 0;
  for (const r of runs) for (const id in r.sales){ tot[id] = (tot[id] || 0) + r.sales[id]; all += r.sales[id]; }
  L.push('### Tuotteiden osuus myynnistä', '', '| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |', '|---|---|---|---|---|');
  for (const id of Object.keys(tot).sort((a, b) => tot[b] - tot[a])){ const n = runs.reduce((a, r) => a + (r.salesN[id] || 0), 0);
    L.push(`| ${id} | ${f1(tot[id] / N)} | ${Math.round(100 * tot[id] / all)} % | ${f1(n / N)} | ${f1(tot[id] / n)} |`); }
  L.push('');
  // käynnit
  const pend = stat(runs.map(r => r.pendingMean)), acts = stat(runs.map(r => r.actsMean));
  const empty = stat(runs.map(r => r.emptyVisits / r.visits)), idle = stat(runs.map(r => r.idleVisits));
  const C = k => stat(runs.map(r => r.counts[k]));
  L.push('### Käynnit ja umpikujat', '',
    `- Käyntejä tilaukseen asti: ${f1(stat(runs.map(r => r.visits)).mean)} (hajonta ${f1(stat(runs.map(r => r.visits)).sd)})`,
    `- Odottavia päätöksiä käynnin alussa: ${f1(pend.mean)} (hajonta ${f1(pend.sd)}); botin toimia per käynti ${f1(acts.mean)}`,
    `- Tyhjiä käyntejä (ei yhtään tapahtumaa): ${Math.round(100 * empty.mean)} %`,
    `- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) ${f1(idle.mean)}/ajo, pelastusitiöitä ${f1(C('rescue').mean)}/ajo, risteytyksen vanhempi menetetty ${runs.filter(r => r.lostVisits).length}/${N} ajossa (${[...new Set(runs.flatMap(r => r.lost))].join(', ') || '–'}; ka. ${f1(stat(runs.map(r => r.lostVisits)).mean)} käyntiä), tilaus jäi täyttämättä ${N - done}/${N}`,
    `- Risteytyksiä ${f1(C('cross').mean)}/ajo, joista mutaatioita ${f1(C('mutation').mean)}, kontaminaatioita ${f1(C('contamination').mean)}; retkiä/testilöytöjä ${f1(C('retki').mean)}; kysyntäpiikkejä ${f1(C('spike').mean)}`,
    `- Korjuita ${f1(C('harvest').mean)}, itiöiden ottoja ${f1(C('sporeTake').mean)}, suodattimia ${f1(C('filter').mean)} (kehikon tuotteita yhteensä ${f1(C('frame').mean)}), taulun tilauksia ${f1(C('board').mean)}, ketjun askelia ${f1(C('chain').mean)} per ajo`, '');
  // hopeakäyrä: jokaisen päivän viimeinen käynti
  const maxDay = Math.ceil(Math.max(...runs.map(r => r.endH)) / 24);
  L.push('### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)', '', '| Päivä | keskiarvo | min | max | ajoja käynnissä |', '|---|---|---|---|---|');
  for (let d = 1; d <= maxDay; d++){
    const vals = runs.map(r => { const pts = r.curve.filter(([h]) => Math.floor(h / 24) + 1 === d); return pts.length ? pts[pts.length - 1][1] : null; });
    const st = stat(vals); if (st) L.push(`| ${d} | ${Math.round(st.mean)} | ${Math.round(st.min)} | ${Math.round(st.max)} | ${st.n}/${N} |`);
  }
  L.push('');
  return { md: L.join('\n'), summary: { profile: res.key, seeds: N, done, milestones: Object.fromEntries(Object.entries(msStats).map(([k, s]) => [k, s && { ...s }])) } };
}

const results = profKeys.map(runProfile);
const parts = results.map(report);
const head = [`# Talousraportti ${name || ''}`.trim(), '',
  `Peli: ${D.VERSION}. Ajettu ${new Date(Date.UTC(2026, 10, 13)).toISOString().slice(0, 10)} komennolla \`node tests/sim/run.js ${args.join(' ')}\`.`, '',
  'Botti on "järkevä ahne" pelaaja (tests/sim/policy.js). Offline-kasvu kuten pelissä: enintään 8 h poissaolosta simuloidaan. Testilöytö (simuloitu ulkopeli) kerran vuorokaudessa laboratorion avauduttua.', ''].join('\n');
const md = head + '\n' + parts.map(p => p.md).join('\n');
const full = !!arg('full', false);
const json = { version: D.VERSION, args, days, speed, profiles: results.map((r, i) => ({ ...parts[i].summary, runs: r.runs.map(x => full ? x : { ...x, log: undefined, curve: undefined }) })) };

fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, name || ('raportti-' + profKeys.join('-') + '-' + seeds));
fs.writeFileSync(base + '.md', md + '\n'); fs.writeFileSync(base + '.json', JSON.stringify(json, null, 1));
if (!quiet) console.log(md);
console.error('kirjoitettu ' + base + '.md ja .json');
