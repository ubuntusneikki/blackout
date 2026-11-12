// Solmu – service worker (offline-käyttö ja päivitykset).
// Strategia: verkko ensin, välimuisti varalla. Verkossa pelaaja saa aina uusimman version,
// ilman verkkoa peli käynnistyy välimuistista. Tiedostolistaa ei tarvitse ylläpitää:
// kaikki koti/-hakemiston tiedostot, jotka sivu lataa, tallentuvat välimuistiin.
const CACHE = 'solmu-koti';
const CORE = ['./', 'pwa.js', 'manifest.webmanifest',
  'ikonit/ikoni-192.png', 'ikonit/ikoni-512.png', 'ikonit/apple-touch-icon.png'];
const SCOPE = self.registration.scope;
const TIMEOUT = 4000;   // hidas verkko: näytä välimuistin versio, päivitä taustalla

// välimuistin avain ilman kyselyosaa (?v=N, ?reset), jotta versioparametri ei monista tiedostoja
function key(url){ const u = new URL(url, SCOPE); u.search = ''; u.hash = '';
  if (u.href.endsWith('/index.html')) u.href = u.href.slice(0, -'index.html'.length);
  return u.href; }
function inScope(url){ return url.startsWith(SCOPE); }

async function fetchFresh(url){
  // no-cache: selain tarkistaa palvelimelta (GitHub Pages -välimuisti on 10 min)
  const res = await fetch(url, {cache: 'no-cache'});
  if (res.ok && res.type === 'basic'){ const c = await caches.open(CACHE); await c.put(key(url), res.clone()); }
  return res;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(p => fetch(new URL(p, SCOPE), {cache: 'reload'})
      .then(r => r.ok && c.put(key(r.url), r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('solmu-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !inScope(req.url)) return;
  e.respondWith((async () => {
    const net = fetchFresh(req.url);
    net.catch(() => {});
    const cached = caches.match(key(req.url));
    const timer = new Promise(r => setTimeout(r, TIMEOUT));
    try {
      const first = await Promise.race([net, timer.then(() => cached)]);
      if (first) return first;
      return await net;
    } catch (err) {
      const c = await cached; if (c) return c;
      throw err;
    }
  })());
});

// viestit sivulta (pwa.js)
self.addEventListener('message', e => {
  const d = e.data || {};
  // ensimmäisellä käynnistyksellä sivu ehti ladata tiedostot ennen kuin service worker oli valmis:
  // sivu kertoo, mitä se latasi, ja ne tallennetaan offline-käyttöä varten
  if (d.type === 'tallenna'){
    e.waitUntil(Promise.all((d.urls || []).filter(inScope).map(u => fetchFresh(u).catch(() => {}))));
  }
  // päivitystarkistus: hae välimuistin tiedostot uudelleen ja vertaa sisältöä
  if (d.type === 'tarkista'){
    e.waitUntil((async () => {
      const c = await caches.open(CACHE); let changed = false;
      for (const r of await c.keys()){
        try {
          const old = await (await c.match(r)).text();
          const res = await fetch(r.url, {cache: 'no-cache'});
          if (!res.ok) continue;
          const txt = await res.clone().text();
          if (txt !== old){ changed = true; await c.put(r, res); }
        } catch (_) { return; }   // ei verkkoa
      }
      if (changed && e.source) e.source.postMessage({type: 'uusi-versio'});
    })());
  }
});
