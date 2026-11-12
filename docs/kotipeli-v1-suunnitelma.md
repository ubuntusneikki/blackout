# Kotipeli v1 – toteutussuunnitelma

Määrittely: [kotipeli-v1.md](kotipeli-v1.md). Tämä on vaiheistus. Jokainen vaihe on pelattava kokonaisuus, joka testataan Playwrightilla ja kuvakaappauksin ennen seuraavaa.

## Vaihe 0 – Pohja ja markkinan sovitus

- Koti pilkotaan ES-moduuleiksi (`koti/js/`: tila, piirto, fontti, markkina, laboratorio, laitteet, käyttöliittymä). Peli toimii edelleen ilman bundleria. Käytös ei muutu.
- Markkina (KOTI-01 V0.3) sovitetaan määrittelyyn:
  - Valuutta MK → **HOPEA**. Vanha `mk` siirretään `hopea`-kenttään.
  - Jalosteet (Sinitee, Ruusuhillo, Taula, Hämärämuste) ja JALOSTA-nappi poistetaan. Tilalle tulee myöhemmin kuivattu sieni (vaihe 4). Vanhat jalosteet muunnetaan hopeaksi.
  - Hinnat määrittelyn mukaan: raaka sato 2 (kaikki kannat), itiöpussi 4.
  - Jokainen myyty kappale −4 % (kerroin 0,96ⁿ), palautuminen puoliintumisajalla 2 h (×1).
  - Kysyntäpiikki kerran päivässä: ×2 kolmen tunnin ajan, näkyy markkinalla selvästi.
  - Myyntirivillä näkyy, paljonko hinta laskee ("SEURAAVA 1,92 → 1,84").
  - Alku: 20 hopeaa, 2 ruususienen itiötä.

## Vaihe 1 – Huone 4×4 ja rakennustila

- Hylly (2×3/3×3 ja hyllyn laajennus) vaihtuu 4×4-ruudukkoon. Jokainen astia ja laite vie ruudun.
- Rakennustila: valitse esine → napauta vapaata ruutua. Siirto on ilmaista.
- Vanha tallennus: astiat siirretään 3-sarakkeisesta 4-sarakkeiseen ruudukkoon samoihin riveihin.
- Hoitajasienen naapurit = 4 vierekkäistä ruutua (ei kulmia), kuten nyt.

## Vaihe 2 – Kannat ja hoito

- Kantataulukko v1: siniheltta, ruususieni, hämäränuppi, kalvoheltta (uusi), hoitajasieni (vain risteytyksestä).
- Kypsä kanta: **KORJAA SATO** tai **OTA ITIÖT** (1 itiöpussi, kasvu jatkuu 35 %:sta). Satunnainen lisäitiö korjuusta poistuu, jotta itiöiden ottaminen on oma valinta.
- Ensimmäinen kasvu noin minuutti (×1).
- Horros: kuivunut kanta ei kuole, se jatkaa sumutuksesta. Toimii jo nyt, sanoitus päivitetään.

## Vaihe 3 – Laboratorio

- Agar-malja (kulutustavara) ja hautomo (laite, 1 ruutu) markkinalle, kun 10 satoa on myyty. Symbiontti vihjaa laboratoriosta.
- Hautomossa malja, johon valitaan kaksi itiöpussia. Kypsyy 8 h (×1).
- Tulos: resepti → 2 itiötä uutta kantaa. Ei reseptiä → "rihmastot hylkivät toisiaan", malja menetetään. Mutaatio 10 % (kasvu +25 % tai sato +1, kultainen hohde, oma nimi). Kontaminaatio 5 % → VILLI NÄYTE.
- **Aamupaljastus:** kun koti avataan ja hautomo on valmistunut poissa ollessa, malja aukeaa koko ruudun animaationa (hehku, ääni, iso tulos).
- Kantakirja: kaikki kannat, löytämättömät ???-paikkoina ja vihje tunnetusta puoliskosta.
- Mutaatiokanta tallennetaan omana kantanaan (esim. `heltta+m1`), jolla on kantansa ominaisuudet ja yksi parannus.

## Vaihe 4 – Kuivausteline ja kehikko

- Kuivausteline: sato varastosta → kuivattu sieni 30 min (×1). Myyntihinta 5.
- Kehikko: 3 kalvoheltan satoa → ITIÖSUODATIN 2 h (×1). Myyntihinta 45.
- Laitteet käynnistetään ja korjataan napauttamalla. Valmis laite hehkuu meripihkana.
- Grafiikka eläväksi kasvustoksi (rihmakalvo kehikossa, sienet telineellä), ei koneiksi.

## Vaihe 5 – Kellari

- Ostettava (300). Oma 4×3-ruudukko, kostea ja viileä: astiat kuivuvat puolet hitaammin, kosteaa rakastavat kannat kasvavat 20 % nopeammin.
- Tilan vaihto napilla ja pyyhkäisyllä. Rakennustilassa esineen voi siirtää tilasta toiseen.

## Vaihe 6 – Eteneminen ja tilaus

- Avautumiset määrittelyn taulukon mukaan.
- Symbiontin lyhyet kommentit: ensimmäinen sato, ensimmäinen risteytys, mutaatio, tilaus.
- Kun kehikko on ostettu: tilaus "5 ITIÖSUODATINTA TORIN VÄELLE". Palkinto: 300 hopeaa, muisto ja "v1 läpäisty" -hetki.
- Palaute: korjuun hehkupurkaus, kolikkoääni, paljastusanimaatio.

## Vaihe 7 – Läpipeluu ja dokumentit

- Playwright-testi pelaa uuden pelin tilaukseen asti testinopeudella ilman umpikujia ja mittaa ajan (tavoite noin tunti ×60).
- Vanhojen tallennusten testi (V0.2- ja V0.3-tallennukset).
- `docs/prototyypin-tila.md` päivitetään toteutuneilla luvuilla.
