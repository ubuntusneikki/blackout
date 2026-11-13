// Solmu – puhelinversio: service worker, asennus, tallennuksen vienti ja tuonti koodina.
// Tavallinen skripti <head>-osassa: ajetaan ennen pelikoodia, jotta tuotu tallennus on
// localStoragessa, kun peli lataa tilansa. Pelikoodiin ei tarvita muutoksia.
// Avoin rajapinta: window.SOLMU_PWA.open() avaa TALLENNUS JA ASENNUS -paneelin.
(function(){
'use strict';
const SAVE_KEY = 'solmu_yhteinen_v1';
const PENDING = 'solmu_tuonti';
const PWA_VERSIO = 'PWA 1';

// ---------- tuonnin luovutus: edellinen sivu kirjoitti tallennuksen sessionStorageen ----------
let imported = false;
try {
  const p = sessionStorage.getItem(PENDING);
  if (p){ localStorage.setItem(SAVE_KEY, p); sessionStorage.removeItem(PENDING); imported = true; }
} catch(e){}

// ---------- koodi: SOLMU1.<base64url(deflate-raw(json))> tai SOLMU0.<base64url(json)> ----------
function b64u(bytes){ let s=''; for (let i=0;i<bytes.length;i+=0x8000) s+=String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(str){ const s=atob(str.replace(/-/g,'+').replace(/_/g,'/')); const b=new Uint8Array(s.length);
  for (let i=0;i<s.length;i++) b[i]=s.charCodeAt(i); return b; }
async function pipe(bytes, stream){ return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

function currentJSON(){
  // pelin muistissa oleva tila on tuorein; varalla localStorage
  try { if (typeof window.__S === 'function'){ const s = window.__S(); if (s) return JSON.stringify(s); } } catch(e){}
  return localStorage.getItem(SAVE_KEY);
}
async function encode(json){
  const raw = new TextEncoder().encode(json);
  if (canZip){ try { return 'SOLMU1.' + b64u(await pipe(raw, new CompressionStream('deflate-raw'))); } catch(e){} }
  return 'SOLMU0.' + b64u(raw);
}
async function decode(code){
  const c = String(code||'').replace(/\s+/g,'');
  const m = /^SOLMU([01])\.([A-Za-z0-9_-]+)$/i.exec(c);
  if (!m) throw new Error('KOODI EI OLE SOLMUN TALLENNUS');
  let bytes = unb64u(m[2]);
  if (m[1]==='1'){
    if (!canZip) throw new Error('SELAIN EI OSAA PURKAA KOODIA');
    bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  }
  const json = new TextDecoder().decode(bytes);
  const s = JSON.parse(json);
  if (!s || typeof s !== 'object' || Array.isArray(s) || !('kotiLast' in s || 'slots' in s || 'rooms' in s))
    throw new Error('KOODI EI OLE SOLMUN TALLENNUS');
  return json;
}
function applyImport(json){
  // peli tallentaa vielä poistuessaan vanhan tilansa; luovutus sessionStoragen kautta voittaa sen
  sessionStorage.setItem(PENDING, json);
  localStorage.setItem(SAVE_KEY, json);
  // ilman kyselyosaa: ?reset aloittaisi uuden pelin tuonnin päälle
  location.replace(location.pathname);
}

// ---------- service worker ----------
let reg = null, lastCheck = 0;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if ('serviceWorker' in navigator && location.protocol !== 'file:'){
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(r => {
      reg = r;
      return navigator.serviceWorker.ready;
    }).then(r => {
      // tiedostot, jotka ladattiin ennen kuin service worker ohjasi sivua
      const urls = [location.href].concat(performance.getEntriesByType('resource').map(e => e.name));
      if (r.active) r.active.postMessage({type:'tallenna', urls});
      lastCheck = Date.now();
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'uusi-versio'){ ui.update = true; refresh(); }
  });
  // pelaaja palaa sovellukseen: tarkista uusi versio (enintään kerran 10 minuutissa)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !reg || Date.now() - lastCheck < 10*60*1000) return;
    lastCheck = Date.now();
    reg.update().catch(() => {});
    navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage({type:'tarkista'}));
  });
}

// ---------- asennus ----------
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refresh(); });
addEventListener('appinstalled', () => { installEvt = null; refresh(); });
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ---------- versio ----------
let gameVersion = '';
function readVersion(){
  try { if (typeof VERSION === 'string') { gameVersion = VERSION; return Promise.resolve(); } } catch(e){}
  // ES-moduuliversio (koti/js/data.js)
  return import('./js/data.js').then(m => { gameVersion = m.VERSION || ''; }).catch(() => {});
}
// suhteellinen import ratkeaa tämän skriptin osoitteesta
function versionText(){ return (gameVersion ? gameVersion + ' · ' : '') + PWA_VERSIO; }

// ---------- käyttöliittymä (DOM, pelin päällä) ----------
const ui = {open:false, mode:null, code:'', msg:'', confirm:false, update:false};
let btn, panel;
const CSS = `
#solmu-pwa-btn{position:fixed;z-index:50;font:10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px;
  color:#6a7a8c;background:#101722;border:0;border-top:2px solid #3a4b60;padding:6px 8px;cursor:pointer;opacity:.85}
#solmu-pwa-btn.uusi{color:#101722;background:#e8a02a;border-top-color:#ffe08a;opacity:1}
#solmu-pwa{position:fixed;inset:0;z-index:60;background:rgba(11,16,24,.94);display:none;overflow:auto;
  font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#d8e2ea;text-transform:uppercase;letter-spacing:1px;
  -webkit-user-select:text;user-select:text}
#solmu-pwa.auki{display:block}
#solmu-pwa .k{max-width:380px;margin:0 auto;padding:max(20px,env(safe-area-inset-top)) 16px 32px;display:flex;flex-direction:column;gap:10px}
#solmu-pwa h2{margin:0;font-size:14px;letter-spacing:3px;color:#ffe08a}
#solmu-pwa h3{margin:8px 0 0;font-size:12px;letter-spacing:2px;color:#a8fbee}
#solmu-pwa p{margin:0;color:#6a7a8c;font-size:11px}
#solmu-pwa button{font:inherit;letter-spacing:2px;text-transform:uppercase;color:#d8e2ea;background:#1c2735;border:0;
  border-top:2px solid #3a4b60;padding:10px;cursor:pointer;text-align:left}
#solmu-pwa button.a{color:#101722;background:#e8a02a;border-top-color:#ffe08a}
#solmu-pwa button.v{color:#ffd0cc;background:#4a1f1f;border-top-color:#e0504a}
#solmu-pwa .r{display:flex;gap:8px}#solmu-pwa .r button{flex:1;text-align:center}
#solmu-pwa textarea{font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#0b1018;color:#a8fbee;border:1px solid #3a4b60;
  padding:8px;min-height:90px;resize:vertical;word-break:break-all;text-transform:none;letter-spacing:0}
#solmu-pwa .msg{color:#ffe08a;font-size:11px;min-height:1.5em}
`;
function el(tag, attrs, text){ const e=document.createElement(tag); for (const k in (attrs||{})) e.setAttribute(k, attrs[k]); if (text!=null) e.textContent=text; return e; }
function button(label, fn, cls){ const b=el('button', cls?{class:cls}:{}, label); b.addEventListener('click', fn); return b; }

function build(){
  const st = el('style'); st.textContent = CSS; document.head.appendChild(st);
  btn = button('', () => ui.update ? location.reload() : open()); btn.id = 'solmu-pwa-btn'; btn.setAttribute('aria-label','Tallennus ja asennus');
  panel = el('div', {id:'solmu-pwa', role:'dialog', 'aria-modal':'true'});
  // estä pelin kosketuskäsittely paneelin alla
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.appendChild(btn); document.body.appendChild(panel);
  addEventListener('resize', place); place();
  refresh();
  if (imported) toast('TALLENNUS TUOTU');
}
// nappi pelikuvan ulkopuolelle, jos tilaa on; muuten oikeaan alakulmaan
function place(){
  if (!btn) return;
  const c = document.getElementById('c'), r = c ? c.getBoundingClientRect() : null;
  const s = btn.style; s.left = s.right = s.top = s.bottom = s.transform = '';
  const sb = 'max(6px, env(safe-area-inset-bottom))';
  if (r && innerHeight - r.bottom >= 30){ s.top = (r.bottom + 4) + 'px'; s.left = '50%'; s.transform = 'translateX(-50%)'; }
  else if (r && innerWidth - r.right >= 120){ s.left = (r.right + 8) + 'px'; s.bottom = sb; }
  else { s.right = '6px'; s.bottom = sb; }
}
function toast(m){ ui.msg = m; refresh(); }

function refresh(){
  if (!btn) return;
  btn.textContent = ui.update ? 'UUSI VERSIO · PÄIVITÄ' : versionText() + '  ≡';
  btn.className = ui.update ? 'uusi' : '';
  panel.className = ui.open ? 'auki' : '';
  if (!ui.open) return;
  const k = el('div', {class:'k'});
  k.appendChild(el('h2', null, 'TALLENNUS JA ASENNUS'));
  k.appendChild(el('p', null, versionText()));
  if (ui.update) k.appendChild(button('UUSI VERSIO SAATAVILLA · PÄIVITÄ', () => location.reload(), 'a'));

  // asennus
  k.appendChild(el('h3', null, 'PUHELIMEEN'));
  if (standalone()) k.appendChild(el('p', null, 'PELI ON ASENNETTU. SE TOIMII MYÖS ILMAN VERKKOA.'));
  else if (installEvt) k.appendChild(button('ASENNA ALOITUSNÄYTÖLLE', async () => {
    const e = installEvt; installEvt = null; e.prompt(); try { await e.userChoice; } catch(_){} refresh(); }, 'a'));
  else if (isIOS) k.appendChild(el('p', null, 'SAFARISSA: NAPAUTA JAA-KUVAKETTA JA VALITSE "LISÄÄ KOTIVALIKKOON".'));
  else k.appendChild(el('p', null, 'AVAA SELAIMEN VALIKKO JA VALITSE "ASENNA SOVELLUS" TAI "LISÄÄ ALOITUSNÄYTÖLLE".'));
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
  k.appendChild(el('p', null, sw ? 'OFFLINE-TILA VALMIS.' : 'OFFLINE-TILA VALMISTUU, KUN PELI ON LADATTU KERRAN.'));

  // vienti
  k.appendChild(el('h3', null, 'VIE TALLENNUS'));
  k.appendChild(el('p', null, 'KOODILLA SIIRRÄT PELIN TOISEEN SELAIMEEN TAI PUHELIMEEN, TAI OTAT VARMUUSKOPION.'));
  if (ui.mode === 'vie'){
    const ta = el('textarea', {readonly:'', 'aria-label':'Tallennuskoodi'}); ta.value = ui.code; k.appendChild(ta);
    const r = el('div', {class:'r'});
    r.appendChild(button('KOPIOI', async () => {
      try { await navigator.clipboard.writeText(ui.code); toast('KOODI KOPIOITU'); }
      catch(e){ ta.focus(); ta.select(); toast('VALITSE KOODI JA KOPIOI SE'); } }, 'a'));
    if (navigator.share) r.appendChild(button('JAA', () => navigator.share({title:'Solmu-tallennus', text:ui.code}).catch(() => {})));
    k.appendChild(r);
  } else k.appendChild(button('LUO KOODI', async () => {
    const json = currentJSON(); if (!json){ toast('EI TALLENNUSTA VIELÄ'); return; }
    ui.code = await encode(json); ui.mode = 'vie'; ui.msg = ''; refresh(); }));

  // tuonti
  k.appendChild(el('h3', null, 'TUO TALLENNUS'));
  if (ui.mode === 'tuo'){
    const ta = el('textarea', {placeholder:'SOLMU1.…', 'aria-label':'Liitä tallennuskoodi', autocapitalize:'off', autocomplete:'off', spellcheck:'false'});
    ta.value = ui.code; ta.addEventListener('input', () => { ui.code = ta.value; ui.confirm = false; });
    k.appendChild(ta);
    k.appendChild(el('p', null, 'TUONTI KORVAA TÄMÄN LAITTEEN NYKYISEN PELIN.'));
    k.appendChild(button(ui.confirm ? 'VARMASTI? KORVAA NYKYINEN PELI' : 'TUO', async () => {
      try {
        const json = await decode(ui.code);
        if (!ui.confirm){ ui.confirm = true; ui.msg = ''; refresh(); return; }
        applyImport(json);
      } catch(e){ ui.confirm = false; toast(/^KOODI|^SELAIN/.test(e.message) ? e.message : 'KOODI ON VIALLINEN'); }
    }, ui.confirm ? 'v' : 'a'));
  } else k.appendChild(button('LIITÄ KOODI', () => { ui.mode = 'tuo'; ui.code = ''; ui.confirm = false; ui.msg = ''; refresh(); }));

  k.appendChild(el('div', {class:'msg', role:'status'}, ui.msg));
  k.appendChild(button('SULJE', close));
  panel.replaceChildren(k);
}
function open(){ ui.open = true; ui.mode = null; ui.code = ''; ui.msg = ''; ui.confirm = false; refresh(); }
function close(){ ui.open = false; ui.mode = null; ui.code = ''; refresh(); }
addEventListener('keydown', e => { if (e.key === 'Escape' && ui.open) close(); });

function start(){ readVersion().then(build); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

window.SOLMU_PWA = {open, close, encode, decode, version: versionText};
})();
