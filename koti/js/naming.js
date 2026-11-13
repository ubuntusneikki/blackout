// TP7: mutaation nimeäminen. Pikselityylinen nimikenttä: näkymätön <input> kerää näppäimistön
// (puhelimella tavallinen näppäimistö), ja nimi piirretään pikselifontilla kankaalle.
// Käyttävät paljastus (mutaation jälkeen) ja kantakirja (NIMEÄ UUDELLEEN).
import {P, AMB} from './data.js';
import {W, H, rect, text, textC, tw, button, hit, screen, LH} from './gfx.js';
import {S, strain} from './state.js';
import * as sim from './sim.js';

const GOLD = ['#7a4a14', '#e8a02a', '#ffe08a'];
let N = null;            // {key, done, y}
let inp = null;
function input(){
  if (inp) return inp;
  inp = document.createElement('input');
  Object.assign(inp, {type:'text', maxLength:sim.NAME_MAX, autocomplete:'off', spellcheck:false, enterKeyHint:'done'});
  inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('aria-label', 'KANNAN NIMI');
  // läpinäkyvä: teksti ja kursori piirretään kankaalle pikselifontilla
  Object.assign(inp.style, {position:'fixed', opacity:'0.01', color:'transparent', caretColor:'transparent', background:'transparent',
    border:'0', outline:'none', fontSize:'16px', padding:'0', margin:'0', zIndex:'5', display:'none'});
  inp.addEventListener('input', () => { const v = sim.cleanName(inp.value); if (v !== inp.value) inp.value = v; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); confirm(); } });
  document.body.appendChild(inp);
  return inp;
}
export const isOpen = () => !!N;
export function value(){ return inp ? inp.value : ''; }
export function open(key, suggest, done){
  N = {key, done, y:0}; const el = input(); el.value = sim.cleanName(suggest || ''); el.style.display = 'block';
  place(); setTimeout(() => { try { el.focus({preventScroll:true}); el.setSelectionRange(el.value.length, el.value.length); } catch(e){} }, 30);
}
export function close(){ N = null; if (inp){ inp.blur(); inp.style.display = 'none'; } }
function confirm(){ if (!N) return; const n = N; const v = inp.value.trim();
  if (v){ if (sim.renameStrain(n.key, v) === null && S.names[n.key] !== v) return; }   // nimi varattu: kenttä jää auki
  close(); n.done && n.done(true); }
function skip(){ if (!N) return; const n = N; close(); n.done && n.done(false); }
// kentän paikka näytöllä: kankaan koordinaatit → sivun pikselit
const FX = 40, FW = W - 80, FH = 34;
function place(){ if (!N || !inp) return; const r = screen.getBoundingClientRect(), sx = r.width/W, sy = r.height/H;
  Object.assign(inp.style, {left:(r.left + FX*sx) + 'px', top:(r.top + (N.y + 22)*sy) + 'px', width:(FW*sx) + 'px', height:(FH*sy) + 'px'}); }
addEventListener('resize', place);

// piirto: otsikko, kenttä, vihje ja napit. y = paneelin yläreuna.
export function draw(t, y){
  if (!N) return; if (N.y !== y){ N.y = y; place(); }
  const T = strain(N.key);
  rect(16, y - 8, W - 32, 160, P.ui0); rect(16, y - 8, W - 32, 1, GOLD[1]); rect(16, y + 151, W - 32, 1, P.ui2);
  textC('NIMEÄ KANTASI', W/2, y, GOLD[2]);
  // kenttä
  const fy = y + 22, v = inp ? inp.value : '';
  rect(FX - 2, fy - 2, FW + 4, FH + 4, GOLD[1]); rect(FX, fy, FW, FH, '#0b1018');
  const sc = 2, w = tw(v || ' ', sc), tx = Math.round(W/2 - w/2), ty = fy + Math.round((FH - LH*sc)/2) + 2;
  if (v) text(v, tx, ty, GOLD[2], sc);
  const focused = document.activeElement === inp;
  if (focused && Math.sin(t*6) > 0) rect(v ? tx + w + 3 : W/2 - 1, ty - 1, 2, LH*sc + 2, AMB[2]);
  const left = sim.NAME_MAX - v.length; text(left + '', FX + FW - tw(left + '') - 4, fy + FH + 6, P.uiD);
  text('A-Ö, 0-9, VIIVA', FX, fy + FH + 6, P.uiD);
  // napautus kenttään avaa näppäimistön (input on kentän päällä; tämä on varmistus)
  hit(FX, fy, FW, FH, () => { try { inp.focus(); } catch(e){} });
  button(40, y + 100, 140, 30, 'OHITA', skip, 'n');
  button(W - 180, y + 100, 140, 30, 'NIMEÄ', confirm, v.trim() ? 'a' : 'd');
}
