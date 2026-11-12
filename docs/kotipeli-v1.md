# Kotipeli v1 – suodatinputki

Tämä on kotipelin ensimmäisen version määrittely. Se korvaa CLAUDE.md:n tehtävät 2–5. Luvut ovat lähtöarvoja, joita säädetään testauksen perusteella.

## Suunta: sienet ovat eläviä, eivät tavaroita

Pelaaja ei valmista esineitä vaan kasvattaa elävää rihmastoa. Kantoja risteytetään ja ohjataan kasvamaan haluttuun muotoon ja tekemään haluttuja asioita. "Tuote" on aina elävä kasvusto: esimerkiksi itiösuodatin on kehikkoon kasvatettu tiivis, elävä kalvo.

Pitkän aikavälin suunta on kantojen geneettinen muokkaus (ominaisuuksien valinta ja yhdistely). V1:ssä tämä näkyy risteytyksenä laboratoriossa ja muottikasvatuksena. Pidä tämä mielessä nimeämisessä, teksteissä ja grafiikassa: ei tehtaita eikä koneita, vaan laboratorio, kasvatus ja elävät materiaalit.

## Tavoite

Yksi putki alusta loppuun, jossa on kasvatus, risteytys, myynti, osto, rakentaminen ja suunnittelu:

**Kasvata → myy → osta → risteytä laboratoriossa → kasvata muotoon → automatisoi → rakenna → suunnittele → täytä tilaus**

Läpipeluu oikeassa ajassa (×1) noin viikko, testinopeudella (×60) noin tunti.

## Kannat

| Kanta | Ilmasto | Kasvuaika (×1) | Perussato | Mistä | Rooli |
|---|---|---|---|---|---|
| Siniheltta | kostea, viileä | 10 min | 3 | alussa | perussato, risteytysten pohja |
| Ruususieni | kuiva, lämmin | 15 min | 4 | alussa (2 itiötä) | perussato, risteytys |
| Hämäränuppi | kuiva, viileä | 12 min | 3 | ulkoa (testissä asetusten TESTILÖYTÖ) | risteytys |
| Kalvoheltta | kostea, lämmin | 20 min | 3 | risteytys: siniheltta × ruususieni | tiivis, verkkomainen rihmasto, suodattimien raaka-aine |
| Hoitajasieni | kostea, viileä | 7 min | ei satoa | risteytys: siniheltta × hämäränuppi | automaatio: sumuttaa 4 naapuriruutua |

Astiat ja ilmaston sopivuus toimivat kuten nyt (lasipurkki ja terraario markkinalta, kerroin ×0,5 / ×0,8 / ×1,3).

## Laboratorio: tietoinen risteytys

1. **Ota itiöt:** kun kanta on kypsä, pelaaja voi korjata sadon TAI ottaa itiöt. Itiöt antavat yhden itiöpussin kyseisestä kannasta, ja kasvu jatkuu 35 %:sta kuten korjuun jälkeen.
2. **Agar-malja:** ostettava kulutustavara. Pelaaja yhdistää maljassa kaksi itiöpussia (kaksi eri kantaa).
3. **Hautomo:** laite, joka vie yhden ruudun. Siinä kypsyy yksi malja kerrallaan, 8 h (×1).
4. **Tulos:**
   - Jos yhdistelmä on reseptitaulukossa, syntyy 2 itiötä uutta kantaa.
   - Jos ei ole, "rihmastot hylkivät toisiaan" ja malja menetetään. Teksti vihjaa, että yhdistelmä ei toimi.
   - **Mutaatio 10 %:** uusi kanta saa yhden parannuksen (kasvu +25 % tai sato +1). Mutaatiokanta näkyy kultaisena hohteena ja omalla nimellään, esim. "SINIHELTTA (MUTAATIO)".
   - **Kontaminaatio 5 %:** villi itiö saastuttaa maljan. Malja pilaantuu, mutta siitä saa yhden "VILLIN NÄYTTEEN", jonka markkina ostaa hyvään hintaan.
5. **Aamupaljastus:** jos hautomo valmistui pelaajan ollessa poissa, peli avautuu paljastushetkellä: malja aukeaa, ja tulos näytetään isosti. Tämä on pelin tärkein koukku, joten siihen kannattaa panostaa (animaatio, ääni, hehku).

Kantakirja: luettelo kaikista kannoista. Löytämättömät näkyvät ???-paikkoina. Vihje kertoo, kumpi puolisko yhdistelmästä on jo tiedossa.

## Muottikasvatus ja kuivaus

- **Kehikko** (laite, yksi ruutu): 3 kalvoheltan satoa kasvatetaan kehikkoon 2 h (×1), tuloksena **ITIÖSUODATIN**, elävä hengityskalvo, joka suodattaa villin rihmaston itiöpölyn. Jokainen ulos lähtevä tarvitsee sellaisen.
- **Kuivausteline** (laite, yksi ruutu): mikä tahansa sato → kuivattu sieni 30 minuutissa (×1). Kuivattu on arvokkaampaa kuin raaka.

Laitteet ottavat raaka-aineen varastosta. Pelaaja käynnistää ja korjaa ne napauttamalla. Valmis laite hehkuu meripihkana kuten valmis astia.

## Automaatio

**Hoitajasieni** sijoitetaan astiaan kuten muut kannat. Se pitää neljän vieressä olevan ruudun astiat kosteina. Sen paikka on v1:n tärkein suunnittelupäätös.

## Tilat, rakentaminen ja suunnittelu

- **Huone:** 4×4 ruutua. Jokainen astia ja laite vie yhden ruudun.
- **Rakennustila:** pelaaja valitsee esineen ja siirtää sen vapaaseen ruutuun. Hinta 0, siirtely on vapaata.
- **Kellari** (ostettava lisätila): 4×3 ruutua, ilmasto kostea ja viileä. Kellarissa astiat kuivuvat puolet hitaammin, ja kosteaa ilmastoa rakastavat kannat kasvavat 20 % nopeammin. Tilat vaihdetaan napilla tai pyyhkäisyllä.
- **Suunnittelu syntyy kolmesta asiasta:** rajallinen tila, hoitajasienen naapuruus ja tilojen ilmasto. Tavoite on, että pelaaja rakentaa kellariin kalvoheltta-viljelmän hoitajan ympärille.

Grafiikka saa tässä vaiheessa olla yksinkertainen ruudukko. Isometrinen huone tulee myöhemmin Blenderistä.

## Markkina ja talous

Valuutan työnimi: **HOPEA**.

**Markkina ostaa:**

| Tuote | Perushinta |
|---|---|
| Raaka sato (per kpl) | 2 |
| Kuivattu sieni | 5 |
| Itiösuodatin | 45 |
| Villi näyte | 25 |
| Ylimääräinen itiöpussi | 4 |

**Markkina myy:**

| Tuote | Hinta |
|---|---|
| Lasipurkki | 10, +5 jokaisesta ostosta |
| Terraario | 30, +10 jokaisesta ostosta |
| Agar-malja | 3 |
| Kuivausteline | 40 |
| Hautomo | 60 |
| Kehikko | 120 |
| Kellari | 300 |

**Elävät hinnat:**
- Jokainen myyty kappale laskee kyseisen tuotteen hintaa 4 %, ja hinta palautuu kohti perushintaa (puoliintumisaika 2 h, ×1).
- Kerran päivässä yksi tuote saa kysyntäpiikin: hinta ×2 kolmen tunnin ajan. Näytä se markkinalla selvästi.
- Näytä myydessä, paljonko hinta laskee, jotta pelaaja oppii hajauttamaan.

## Tilaus: v1:n päätös

Kun kehikko on ostettu, torin väki jättää tilauksen: **"5 ITIÖSUODATINTA TORIN VÄELLE, JOTTA HE VOIVAT LÄHTEÄ ULOS."**

Palkinto: 300 hopeaa, symbiontin muisto ja "v1 läpäisty" -hetki.

## Eteneminen

| Vaihe | Mitä avautuu | Ajoitus (×1) |
|---|---|---|
| Alku | terraario + siniheltta, 2 lasipurkkia, 2 ruususienen itiötä, 20 hopeaa. Markkina auki. | 0 min |
| Ensimmäinen sato | korjuu, myynti, ensimmäinen osto | noin 1 min (ensimmäinen kasvu nopeutettu) |
| 10 satoa myyty | symbiontti vihjaa laboratoriosta, hautomo ja agar-maljat markkinalle | päivä 1 |
| Ensimmäinen risteytys | kalvoheltta, aamupaljastus | päivät 1–2 |
| Kuivausteline | parempi tulo | päivä 2 |
| Hämäränuppi ulkoa | hoitajasienen risteytys | päivät 3–4 |
| Kellari | suunnittelu | päivä 5 |
| Kehikko ja tilaus | ensimmäiset suodattimet, tilaus täytetty | noin viikko |

Ensimmäisen sadon kasvu on poikkeuksellisesti noin minuutti, jotta koukku toimii heti.

## Tuntuma

- Jokaisessa toiminnossa on palaute: korjuun hehkupurkaus, kolikkoääni myydessä ja aamupaljastuksen animaatio.
- **Ei rangaistusta poissaolosta:** kuivunut kanta vaipuu horrokseen eikä kuole. Se jatkaa, kun sitä sumutetaan.
- Elinvoimaväritys säilyy: hyvin voiva astia on kirkas, kuivuva haalistuu.
- Symbiontti kommentoi lyhyesti tärkeitä hetkiä: ensimmäinen sato, ensimmäinen risteytys, mutaatio ja tilaus.

## Ei v1:ssä

Kuljetusrihmat ja linjat, ominaisuuksien geneettinen muokkaus, sisustus, isometrinen huone, useampi lisätila, moninpeli ja ulkopelin muutokset (paitsi löydöt).

## Hyväksymiskriteerit

- Uudesta pelistä pääsee tilauksen täyttämiseen testinopeudella noin tunnissa ilman umpikujia. Testaa koko putki läpi Playwrightilla.
- Vanhat tallennukset eivät rikkoudu: uudet kentät `ensure()`-oletuksilla.
- Jokaisesta uudesta näkymästä kuvakaappaus ennen kuin se merkitään valmiiksi.
- `docs/prototyypin-tila.md` päivitetään toteutuneilla luvuilla.
