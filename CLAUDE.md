# Solmu – projektin muistio Claude Codelle

Sijaintipohjainen mobiilipeli (Turku ensin), jota Juuso kehittää yksin. Kommunikoi suomeksi. Pelin käyttöliittymäteksti on suomeksi ja ISOIN KIRJAIMIN (pikselifontti).

## Visio lyhyesti (koko teksti: docs/ydinvisio.md)

- **Maailma:** kaupunkien alla kulkenut, ihmisten jalostama sienirihmasto mutatoitui ja villiintyi. Villi rihmasto on *kaunis, kiehtova ja ahne*, ei paha.
- **Tavoite:** ei korjata maailmaa eikä kesytetä rihmastoa, vaan opitaan elämään sen kanssa. Vanhoja kantoja etsitään ja niistä risteytetään uusia.
- **Symbiontti:** viimeisiä kesyjä kantoja, muistaa ajan ennen villiintymistä.
- **Sävy:** cozy mutta jännittävä.
- **Painopiste nyt: KOTIPELI.** Ulkopeli pidetään minimissä (löytöjen lähde). Pidä kaikki mahdollisimman yksinkertaisena: tavoite on hieno, toimiva peruspeli.
- **Ydinsilmukka:** löydä → kasvata → jalosta ja risteytä → myy simuloidulla markkinalla → kehitä tuotantoa ja rakenna/muokkaa kotia → …

Kartan parantaminen ja värin palauttaminen kaupunkiin **on poistettu** suunnasta ja koodista (tehtävä 1).

## Suunta: sienet ovat eläviä, eivät tavaroita

Pelaaja ei valmista esineitä vaan kasvattaa elävää rihmastoa: kantoja risteytetään ja ohjataan kasvamaan haluttuun muotoon. "Tuote" on aina elävä kasvusto (esim. itiösuodatin on kehikkoon kasvatettu elävä kalvo). Nimeämisessä, teksteissä ja grafiikassa: ei tehtaita eikä koneita, vaan laboratorio, kasvatus ja elävät materiaalit. Pitkän aikavälin suunta on kantojen geneettinen muokkaus.

## Rakenne

```
index.html          aloitussivu: ohjaa suoraan kotipeliin
ulko/index.html     ULKO-01 (JÄÄDYTETTY: ulkopeli ei kuulu tähän protoon, saaliit simuloidaan kotona)
koti/index.html     KOTI-01 v1: kotipeli ES-moduuleina koti/js/ (data, gfx, events, state, sim, retki, retki-ui, room, iso, xsec, ui, main)
                    iso.js = isometrinen päänäkymä (atlas koti/gfx/, 384 px kerros UI-puskurin alla, osumat, siirtymät)
koti/pwa.js, sw.js  puhelinversio: asennus (manifest.webmanifest, ikonit/), offline, tallennuksen vienti/tuonti koodina
iso/index.html      kokeilu (JÄÄDYTETTY): isometrinen 3D-kartta three.js r128:lla + pikselöintivarjostin
blender/            Blender-skriptit (bpy): room.py (huone), kit.py (katupakkaus + talot), koti.py (kodin spritet), koti_atlas.py (atlas + esikatselu), pix.py (pikselöinti), sheet.py
docs/               ydinvisio.md, kotipeli-v1.md (+ suunnitelma), prototyypin-tila.md, grafiikka-koti.md (kodin spritet ja atlas)
tests/              Playwright-skriptit: v1-lapipeluu.js (botti pelaa tilaukseen asti), tallennukset.js, pwa.js
```

Ei build-vaihetta: staattisia sivuja GitHub Pagesissa. Paikallisesti: `python3 -m http.server` repon juuressa.
Koti on ES-moduuleina (`koti/js/*.js`) ilman bundleria; se vaatii http-palvelimen (file:// ei toimi).

**Tapahtumaväylä** (`koti/js/events.js`): pelilogiikka (`sim.js`) ei kutsu käyttöliittymää, vaan lähettää `emit('korjuu', {...})`. Äänet, efektit ja viestit kuunnellaan `on(nimi, fn)` tai `on('*', fn)`. Datan kenttä `viesti` näytetään paneelissa ja `vihje` symbiontin lyhyenä vihjeenä. Tapahtumien lista on events.js:n alussa.

**Rajaukset (Juuso 13.11.2026):** ei ulkopeliä eikä muistoja/tarinaa tähän protoon; kuivaus poistettu kokonaan (pelin ydin on elävien kantojen muokkaus tehtäviin). Symbiontti antaa vain lyhyitä vihjeitä.

## Yhteinen tallennus

- `localStorage` avain **`solmu_yhteinen_v1`**, sama ulko- ja kotisivulla (toimii vain samassa origin-osoitteessa).
- Kodin v1-skeema (`schema:1`): `speed, hopea, rooms{huone,kellari}{owned, cells[]}, cur, inv{raw:kanta, suodatin, villi, agar}, spores{kanta:n}, vesselInv[], deviceInv[], bought, sold, known{}, tried{}, market{sat, spike, nextSpike}, flags{}, order, retki{cur, n, deep}, kotiLast, board[], boardNext, boardSeq, boardDone, chain, made{}`. Rihmaretki (`retki.js`, TP5): `retki.cur = {type:'lyhyt'|'syva', t, back}`, ovi aukeaa ensimmäisestä myynnistä (`flags.retki`). Ulko käyttää: `spores, vesselInv, found, cells, memories, walked`.
- Ruutu on `{kind:'vessel', type, strain, growth, moist, ready, waves}` tai `{kind:'device', type, t, busy, done, dish|job}`. `waves` = kypsät satoaallot (≤3), kehikon `job` = syötekanta (`FRAME` data.js:ssä). Mutaatiokannan avain on `kanta~grow` tai `kanta~yield`.
- Kuivausteline ja `dry:*`-tuotteet poistettiin (TP0): `ensure()` hyvittää ne hopeana (kuivattu 5, teline 40).
- Tallennus ilman `schema`-kenttää on vanha (V0.2/V0.3): `state.js` `migrate()` muuntaa sen (sato, uute, mk, jalosteet ja tulikääpä → hopeaksi; hylly 3 sarakkeesta 4×4-ruudukkoon).
- Koti omistaa kentät `KOTI_OWNS` (state.js). Kun toinen välilehti kirjoittaa (`storage`-tapahtuma), koti ottaa uuden tilan mutta pitää nämä omat arvonsa. Ulko tekee muutokset aina tuoreimpaan tallennukseen (`mutate`).
- Kotiproton offline-kasvu käyttää `kotiLast`-kenttää (ei `last`).
- Jos skeema muuttuu, tee `ensure()`-funktioon oletusarvot äläkä riko vanhoja tallennuksia.

## Visuaaliset säännöt

- **Pikselitaide 192 px leveänä** (iso-kokeilu 256 px), skaalaus kokonaisluvulla, `image-rendering: pixelated`.
  - Poikkeus: kodin isometrinen huone on 384 px leveä (ruutu 88×44 px, ks. docs/grafiikka-koti.md), Juuson hyväksymä 2026-11-12. 192 px:n raja oli ulkopelin yhtenäistä tarkkuutta varten; ulkopelin tarkkuus päätetään myöhemmin.
- **Kodin käyttöliittymä natiivisti 384×672** (Juuso 2026-11-13): `gfx.js` käyttää loogisia 192×336-koordinaatteja, mutta puskuri on natiivi (RES=2), joten 0,5 loogista = 1 pikseli, samaa tarkkuutta kuin huone ja poikkileikkaus. Pistekuvioissa `dot()` ja `bay()` 0,5:n askelin; paneelit `bevel()`/`frame()` 1 px:n valo- ja varjoreunoin.
- **Lähikuva (poikkileikkaus)** käyttää samoja Blender-malleja kuin huone: `koti.py`:n `lk_*`-spritet (kamera edestä 76°, astiat 340 px/m, sienet 290 px/m) → `python3 koti_atlas.py <render> ../koti/gfx --lk` → `koti/gfx/lahikuva.png/json`. xsec.js piirtää koodigrafiikalla vain, jos atlas tai kannan sprite puuttuu.
- **5×7 vahva pikselifontti** (F-taulukko gfx.js:ssä, pystyvedot 2 px, glyfi 6×7, väli 1 px), Ä/Ö pisteillä glyfin yläpuolella; `sc=2` on Scale2x-pehmennetty. Ulkopelissä on yhä vanha 3×5.
- **Paletti** (pix.py `PAL` ja iso/index.html `PAL` ovat sama lista): tumma viileä pohja, lämmin sisävalo, kantojen omat värit:
  - siniheltta `#1d5c58 #34b8ac #a8fbee`, ruususieni `#5a1f4a #c4428f #ffa6d6`, tulikääpä `#6b2e12 #d9702a #ffc46a`, hämäränuppi `#3a1f5a #8a4ad0 #d6b0ff`, hoitajasieni `#2f5a3a #8fd0a0 #e8fff0`, meripihka `#7a4a14 #e8a02a #ffe08a`.
- **Hehku = pelattavaa:** vain asiat, joihin voi tarttua, hehkuvat. Meripihka = "tee tämä nyt" (valmis sato, ensisijainen nappi).
- **Elinvoimaväritys** (v = 0…1): `L = .3r+.59g+.11b; harmaa = L*(.9,1,.84); väri = (harmaa + (c-harmaa)*(0.1+0.9v)) * (0.6+0.4v)`. Kotona: hyvin voiva astia kylläinen, kuivuva haalistuu.
- **Uusi värikieli (ei vielä toteutettu):** villi rihmasto kylmä violetti, ihmisten koti ja hoidetut kannat lämpimiä.

## Blender-putki

- `pip install bpy` (testattu bpy 5.3, Python 3.13) toimii ilman Blender-asennusta. Renderöijä **Cycles CPU** (EEVEE ei toimi ilman näytönohjainta).
- Ortografinen kamera, kierto `(60°, 0, 45°)`, `cycles.filter_width = 0.01` (terävät pikselit), `view_transform = 'Standard'`.
- Jokainen kuva renderöidään kahdesti: väri + ID-kerros (Object Info → Random), josta `pix.py` tekee ääriviivat. Sen jälkeen paletti + järjestetty pistekuviointi.
- `kit.py -- sheet <kansio>` (palikat 14 px/m, talot 4 px/m), `-- scene <kansio> 6` (katukulma), `-- blend <kansio>` (.glb jokaisesta + katukulma.blend).
- Mittakaavahuomio: isometrisessä kartassa 1 px ≈ 1 m, joten katupalikat näkyvät vain lähizoomissa tai liioiteltuina.

## Testaus

- Selaintestit Playwrightilla (headless Chrome). WebGL: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- URL-parametrit: koti `?reset` (uusi peli); ulko `?sim` (ei GPS:ää), `?demo` (demokaupunki ilman OSM:ää); iso `?demo`.
- Debug-koukut: koti `window.__S()` (tila), `__sim(s)` (pelisekunteja eteenpäin), `__G` (pelilogiikka), `__R` (rihmaretki), `__U` (käyttöliittymä); ulko `window.DBG` (P, finds, S, collect), iso `window.DBG`.
- Katso aina kuvakaappaus ennen kuin sanot jonkin visuaalisen asian olevan valmis.
- Puhelinversio: `node tests/pwa.js` (oma palvelin). Service worker hakee verkosta ensin, joten uusi versio näkyy seuraavalla käynnistyksellä; tiedostolistaa ei tarvitse päivittää. Tallennuksen tuonti kulkee sessionStoragen (`solmu_tuonti`) kautta, ettei pelin oma save() ylikirjoita sitä.
- Julkaisu: GitHub Pages. Käyttäjä ohittaa välimuistin lisäämällä `?v=N`; näytä versionumero käyttöliittymässä (`VERSION`).

## Tehtävät järjestyksessä

1. ~~**Ulko:** poista HERÄTÄ-toiminto, `places`-piirto ja parantamisen palkinnot. Jätä löydöt, syke ja muistot.~~ Tehty (ULKO-01 V0.2).
2. ~~**Kotipeli v1:**~~ toteutettu (KOTI-01 V1.0). Koko määrittely on tiedostossa **docs/kotipeli-v1.md** (suodatinputki: kasvatus, laboratorio ja risteytys, muottikasvatus, kuivaus, hoitajasieni, 4×4-huone ja kellari, HOPEA-markkina, tilaus). Se korvaa aiemmat tehtävät 2–5. KOTI-01 V0.3:n markkina (MK, jalosteet) sovitetaan tähän määrittelyyn.

Ennen isoja suunnittelumuutoksia kysy Juusolta. Pienissä toteutusvalinnoissa valitse yksinkertaisin toimiva ratkaisu ja kerro se.
