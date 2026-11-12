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
index.html          aloitussivu (linkit protoihin)
ulko/index.html     ULKO-01: 2D-pikselikartta OSM-datasta, GPS, syke, löydöt (yksi tiedosto)
koti/index.html     KOTI-01: hylly + astian poikkileikkaus, kasvatus, markkina (yksi tiedosto)
iso/index.html      kokeilu: isometrinen 3D-kartta three.js r128:lla + pikselöintivarjostin
blender/            Blender-skriptit (bpy): room.py (huone), kit.py (katupakkaus + talot), koti.py (kodin spritet), koti_sheet.py, pix.py (pikselöinti), sheet.py
docs/               ydinvisio.md, prototyypin-tila.md, kotipeli-v1.md, grafiikka-koti.md (kodin spritet ja atlas), kuvat/
```

Ei build-vaihetta: staattisia sivuja GitHub Pagesissa. Paikallisesti: `python3 -m http.server` repon juuressa.
Kun koti kasvaa, sen saa pilkkoa ES-moduuleiksi (`koti/js/*.js`), mutta pidä peli ajettavana ilman bundleria.

## Yhteinen tallennus

- `localStorage` avain **`solmu_yhteinen_v1`**, sama ulko- ja kotisivulla (toimii vain samassa origin-osoitteessa).
- Kenttiä: `speed, rows, slots[9], spores{kanta:n}, vesselInv[], bought, expand, kotiLast, firstHarvest, found{}, cells{}, memories[], walked, mk, goods{tuote-id:n}, seen{kanta:1}, market{sat{}, spike, nextSpike}`.
- Tuote-id: `r:kanta` perussato, `j:kanta` jaloste, `s:kanta` itiö (itiöt ovat `spores`-kentässä). Valuutan työnimi on MK.
- Vanhat kentät `sato`, `uute`, `places`, `healed` voivat olla vanhoissa tallennuksissa. Kodin `ensure()` muuntaa `sato`- ja `uute`-arvot rahaksi.
- Koti omistaa kentät `KOTI_OWNS` (slots, kotiLast, mk, goods, market, bought, expand, rows). Kun toinen välilehti kirjoittaa (`storage`-tapahtuma), koti ottaa uuden tilan mutta pitää nämä omat arvonsa. Ulko tekee muutokset aina tuoreimpaan tallennukseen (`mutate`).
- Kotiproton offline-kasvu käyttää `kotiLast`-kenttää (ei `last`).
- Jos skeema muuttuu, tee `ensure()`-funktioon oletusarvot äläkä riko vanhoja tallennuksia.

## Visuaaliset säännöt

- **Pikselitaide 192 px leveänä** (iso-kokeilu 256 px), skaalaus kokonaisluvulla, `image-rendering: pixelated`.
- **3×5 pikselifontti** (F-taulukko koodissa), Ä/Ö pisteillä glyfin yläpuolella.
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
- Debug-koukut: koti `window.__S()`, ulko `window.DBG` (P, finds, S, collect), iso `window.DBG`.
- Katso aina kuvakaappaus ennen kuin sanot jonkin visuaalisen asian olevan valmis.
- Julkaisu: GitHub Pages. Käyttäjä ohittaa välimuistin lisäämällä `?v=N`; näytä versionumero käyttöliittymässä (`VERSION`).

## Tehtävät järjestyksessä

1. ~~**Ulko:** poista HERÄTÄ-toiminto, `places`-piirto ja parantamisen palkinnot. Jätä löydöt, syke ja muistot.~~ Tehty (ULKO-01 V0.2).
2. **Kotipeli v1:** koko määrittely on tiedostossa **docs/kotipeli-v1.md** (suodatinputki: kasvatus, laboratorio ja risteytys, muottikasvatus, kuivaus, hoitajasieni, 4×4-huone ja kellari, HOPEA-markkina, tilaus). Se korvaa aiemmat tehtävät 2–5. KOTI-01 V0.3:n markkina (MK, jalosteet) sovitetaan tähän määrittelyyn.

Ennen isoja suunnittelumuutoksia kysy Juusolta. Pienissä toteutusvalinnoissa valitse yksinkertaisin toimiva ratkaisu ja kerro se.
