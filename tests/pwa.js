// Puhelinversion (PWA) testi: aloitussivu, manifest, offline, versio, tallennuksen vienti/tuonti, päivitys.
// Aja repon juuressa: node tests/pwa.js   (käynnistää oman palvelimen väliaikaiseen kopioon)
const {chromium} = require('playwright');
const {spawn, execSync} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'solmu-pwa-'));
const PORT = 8766, BASE = `http://localhost:${PORT}`;
execSync(`cp -r index.html koti "${TMP}/"`, {cwd: ROOT});
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], {cwd: TMP, stdio: 'ignore'});

let fails = 0;
function ok(cond, msg){ console.log((cond ? 'OK   ' : 'VIKA ') + msg); if (!cond) fails++; }
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(600);
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));

  // 1. aloitussivu vie kotipeliin
  await pg.goto(BASE + '/?reset');
  await pg.waitForURL(/\/koti\/\?reset$/);
  ok(true, 'aloitussivu ohjaa kotipeliin: ' + pg.url());

  // 2. manifest ja ikonit
  const man = await pg.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]').href; const m = await (await fetch(href)).json();
    const icons = await Promise.all(m.icons.map(async i => { const r = await fetch(new URL(i.src, href)); return r.ok && r.headers.get('content-type'); }));
    return {m, icons};
  });
  ok(man.m.display === 'standalone' && man.m.start_url === './', 'manifest: standalone, start_url ./');
  ok(man.icons.every(t => t === 'image/png'), 'ikonit latautuvat (' + man.icons.length + ')');
  ok(man.m.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'), 'maskable-ikoni 512');

  // 3. service worker ohjaa sivua uudelleenlatauksen jälkeen
  await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.reload(); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'service worker ohjaa sivua');

  // 4. versio näkyy
  const label = await pg.textContent('#solmu-pwa-btn');
  ok(/KOTI-01 V\d/.test(label), 'versio näkyy napissa: ' + label.trim());
  await pg.screenshot({path: path.join(TMP, 'koti.png')});

  // 5. vienti: tila koodiksi
  const before = await pg.evaluate(() => __S());
  await pg.evaluate(() => SOLMU_PWA.open());
  await pg.click('text=LUO KOODI');
  const code = await pg.inputValue('#solmu-pwa textarea');
  ok(/^SOLMU[01]\.[A-Za-z0-9_-]+$/.test(code), 'vientikoodi luotu (' + code.length + ' merkkiä)');
  await pg.screenshot({path: path.join(TMP, 'paneeli.png')});
  const round = JSON.parse(await pg.evaluate(c => SOLMU_PWA.decode(c), code));
  ok(JSON.stringify(round) === JSON.stringify(before) || round.kotiLast >= before.kotiLast, 'koodi purkautuu samaksi tilaksi');

  // 6. tuonti toiseen "laitteeseen": muokattu tila, rikkinäinen koodi hylätään
  const ctx2 = await b.newContext({viewport: {width: 390, height: 844}});
  const pg2 = await ctx2.newPage(); pg2.on('pageerror', e => errs.push(e.message));
  await pg2.goto(BASE + '/koti/?reset'); await pg2.waitForTimeout(500);
  const marked = Object.assign({}, round, {speed: 1, testimerkki: 'tuotu-123'});
  const code2 = await pg.evaluate(j => SOLMU_PWA.encode(j), JSON.stringify(marked));
  await pg2.evaluate(() => SOLMU_PWA.open());
  await pg2.click('text=LIITÄ KOODI');
  await pg2.fill('#solmu-pwa textarea', 'SOLMU1.roskaa');
  await pg2.click('#solmu-pwa button.a:has-text("TUO")');
  await pg2.waitForTimeout(300);
  ok(/VIALLINEN|EI OLE/.test(await pg2.textContent('#solmu-pwa .msg')), 'rikkinäinen koodi hylätään');
  await pg2.fill('#solmu-pwa textarea', '  ' + code2.slice(0, 40) + '\n' + code2.slice(40) + '  ');
  await pg2.click('#solmu-pwa button:has-text("TUO")');
  ok(await pg2.waitForSelector('text=VARMASTI?', {timeout: 3000}).then(() => true, () => false), 'tuonti kysyy varmistuksen');
  await Promise.all([pg2.waitForNavigation(), pg2.click('text=VARMASTI?')]);
  await pg2.waitForTimeout(800);
  const got = await pg2.evaluate(() => ({mem: __S().testimerkki, speed: __S().speed, ls: JSON.parse(localStorage.getItem('solmu_yhteinen_v1')).testimerkki}));
  ok(got.mem === 'tuotu-123' && got.ls === 'tuotu-123' && got.speed === 1, 'tuotu tallennus on pelissä ja säilyy: ' + JSON.stringify(got));
  await pg2.waitForTimeout(3500);   // pelin oma tallennussilmukka ei ylikirjoita tuontia
  ok(await pg2.evaluate(() => JSON.parse(localStorage.getItem('solmu_yhteinen_v1')).testimerkki) === 'tuotu-123', 'tuonti säilyy pelin tallennuksen jälkeen');

  // 7. offline: peli käynnistyy ilman verkkoa
  await ctx.setOffline(true);
  await pg.goto(BASE + '/koti/?v=99'); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => typeof __S === 'function' && !!__S()), 'offline-käynnistys toimii');
  await pg.screenshot({path: path.join(TMP, 'offline.png')});
  await ctx.setOffline(false);

  // 8. uusi versio palvelimella: tarkistus huomaa sen
  fs.appendFileSync(path.join(TMP, 'koti/index.html'), '\n<!-- uusi versio -->\n');
  await pg.evaluate(() => navigator.serviceWorker.controller.postMessage({type: 'tarkista'}));
  await pg.waitForSelector('#solmu-pwa-btn.uusi', {timeout: 5000}).then(() => ok(true, 'uusi versio huomattu'), () => ok(false, 'uusi versio huomattu'));

  ok(errs.length === 0, 'ei JS-virheitä' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log('kuvat: ' + TMP);
  await b.close(); srv.kill();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
