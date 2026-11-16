# Talousraportti

Peli: KOTI-01 V2.2. Ajettu 2026-11-13 komennolla `node tests/sim/run.js --profile kaikki --seeds 20`.

Botti on "järkevä ahne" pelaaja (tests/sim/policy.js). Offline-kasvu kuten pelissä: enintään 8 h poissaolosta simuloidaan. Testilöytö (simuloitu ulkopeli) kerran vuorokaudessa laboratorion avauduttua.

## Profiili AKTIIVINEN (käynti 15 min välein klo 8–24)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 5.3 h | 0.4 h | 4.8 h | 5.3 h | 5.8 h | pv 1 |
| HAUTOMO OSTETTU | 20/20 | 7.2 h | 0.7 h | 6.0 h | 7.3 h | 8.8 h | pv 1 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 17.2 h | 4.7 h | 14.0 h | 15.3 h | 32.0 h | pv 1 |
| KEHIKKO OSTETTU | 20/20 | 12.7 h | 3.9 h | 10.0 h | 12.0 h | 24.0 h | pv 1 |
| ENSIMMÄINEN SUODATIN | 20/20 | 23.0 h | 6.4 h | 13.5 h | 24.0 h | 32.3 h | pv 2 |
| VERKKOMUOTOINEN KANTA | 20/20 | 8.1 h | 2.0 h | 4.3 h | 8.5 h | 10.5 h | pv 1 |
| HOITAJASIENI | 0/20 | – | – | – | – | – | – |
| KELLARI | 19/20 | 33.1 h | 2.3 h | 29.5 h | 32.8 h | 38.3 h | pv 2 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 6.6 h | 0.4 h | 5.8 h | 6.8 h | 7.3 h | pv 1 |
| TILAUS TÄYTETTY | 20/20 | 33.7 h | 3.9 h | 29.5 h | 32.5 h | 2.0 vrk | pv 2 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| terraario | 6.0 | 1.5 | 55.7 | 11.1 h | 9.0 h | 66/120 |
| hautomo | 1.0 | 7.2 | 60.0 | avaus |  |  |
| agar | 2.1 | 7.1 | 3.0 | avaus |  |  |
| kehikko | 1.7 | 12.7 | 60.0 | 9.8 h | 11.7 h | 31/34 |
| purkki | 6.2 | 7.9 | 23.3 | 13.0 h | 13.0 h | 65/124 |
| kellari | 1.0 | 33.1 | 300.0 | – | – | 0/19 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| raw:heltta | 129.1 | 26 % | 93.6 | 1.4 |
| villi | 89.4 | 18 % | 3.6 | 24.8 |
| raw:ruusu | 69.1 | 14 % | 20.9 | 3.3 |
| raw:hamara | 49.7 | 10 % | 9.7 | 5.1 |
| raw:kalvo | 48.4 | 10 % | 21.0 | 2.3 |
| valokalvo | 36.6 | 7 % | 3.7 | 10.0 |
| itio:heltta | 15.5 | 3 % | 11.6 | 1.3 |
| raw:xgtfw3l | 13.0 | 3 % | 6.6 | 2.0 |
| lampo | 10.9 | 2 % | 0.6 | 19.8 |
| raw:x1rnk6lz | 10.5 | 2 % | 7.0 | 1.5 |
| raw:x10112ld | 8.1 | 2 % | 1.7 | 4.8 |
| itio:hamara | 3.8 | 1 % | 2.6 | 1.5 |
| raw:x131kkkg | 3.1 | 1 % | 2.1 | 1.5 |
| itio:ruusu | 3.1 | 1 % | 2.1 | 1.5 |
| raw:xcskgi7 | 3.1 | 1 % | 0.9 | 3.6 |
| raw:x6ci5mt | 2.9 | 1 % | 0.8 | 3.6 |
| raw:xz94ftm | 2.5 | 0 % | 1.6 | 1.5 |
| raw:xv1aejg | 1.8 | 0 % | 1.0 | 1.8 |
| itio:x10112ld | 0.8 | 0 % | 0.6 | 1.5 |
| itio:xgtfw3l | 0.6 | 0 % | 0.4 | 1.5 |
| raw:x1pupq09 | 0.6 | 0 % | 0.2 | 2.9 |
| itio:x6ci5mt | 0.4 | 0 % | 0.3 | 1.5 |
| itio:x131kkkg | 0.2 | 0 % | 0.2 | 1.5 |
| itio:xv1aejg | 0.1 | 0 % | 0.1 | 1.5 |
| itio:x1pupq09 | 0.1 | 0 % | 0.1 | 1.5 |
| itio:x4i0yiu | 0.1 | 0 % | 0.1 | 1.5 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 102.0 (hajonta 10.5)
- Odottavia päätöksiä käynnin alussa: 2.5 (hajonta 0.3); botin toimia per käynti 8.2
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 2.3/ajo, joista mutaatioita 0.1, kontaminaatioita 0.1; retkiä/testilöytöjä 12.1; kysyntäpiikkejä 2.0
- Korjuita 86.8, itiöiden ottoja 24.6, suodattimia 5.4 (kehikon tuotteita yhteensä 9.6), taulun tilauksia 3.5, ketjun askelia 7.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 24 | 3 | 45 | 20/20 |
| 2 | 34 | 2 | 194 | 20/20 |

## Profiili 4/VRK (käynnit klo 8, 12, 17, 22)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 34.0 h | 2.5 h | 28.0 h | 33.0 h | 38.0 h | pv 2 |
| HAUTOMO OSTETTU | 20/20 | 2.1 vrk | 5.5 h | 38.0 h | 2.0 vrk | 2.6 vrk | pv 3 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 3.2 vrk | 18.5 h | 2.4 vrk | 3.0 vrk | 5.6 vrk | pv 4 |
| KEHIKKO OSTETTU | 20/20 | 2.9 vrk | 8.7 h | 2.2 vrk | 3.0 vrk | 3.6 vrk | pv 4 |
| ENSIMMÄINEN SUODATIN | 20/20 | 5.2 vrk | 24.3 h | 3.6 vrk | 5.0 vrk | 7.0 vrk | pv 6 |
| VERKKOMUOTOINEN KANTA | 20/20 | 26.9 h | 5.5 h | 14.0 h | 28.0 h | 33.0 h | pv 2 |
| HOITAJASIENI | 0/20 | – | – | – | – | – | – |
| KELLARI | 12/20 | 6.8 vrk | 19.3 h | 5.2 vrk | 6.6 vrk | 8.0 vrk | pv 7 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 2.6 vrk | 21.6 h | 2.0 vrk | 2.2 vrk | 5.0 vrk | pv 3 |
| TILAUS TÄYTETTY | 20/20 | 6.2 vrk | 28.6 h | 4.6 vrk | 6.0 vrk | 8.4 vrk | pv 7 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| purkki | 8.2 | 0.0 | 29.2 | 4.9 vrk | 5.2 vrk | 19/163 |
| hautomo | 1.0 | 51.1 | 60.0 | avaus |  |  |
| kehikko | 1.6 | 70.0 | 60.0 | 2.1 vrk | 2.0 vrk | 27/31 |
| terraario | 4.0 | 78.8 | 46.8 | 40.2 h | 38.0 h | 45/80 |
| kellari | 0.6 | 163.6 | 300.0 | – | – | 0/12 |
| agar | 0.8 | 52.6 | 3.0 | avaus |  |  |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| villi | 177.1 | 40 % | 7.1 | 24.9 |
| raw:heltta | 91.3 | 21 % | 50.8 | 1.8 |
| raw:x1rnk6lz | 27.1 | 6 % | 14.4 | 1.9 |
| raw:hamara | 25.9 | 6 % | 4.5 | 5.8 |
| raw:xgtfw3l | 16.8 | 4 % | 8.1 | 2.1 |
| valokalvo | 15.5 | 4 % | 1.6 | 10.0 |
| itio:heltta | 13.1 | 3 % | 8.9 | 1.5 |
| raw:x131kkkg | 12.9 | 3 % | 6.7 | 1.9 |
| raw:kalvo | 10.0 | 2 % | 3.8 | 2.7 |
| itio:hamara | 8.4 | 2 % | 5.7 | 1.5 |
| raw:ruusu | 6.9 | 2 % | 1.9 | 3.7 |
| raw:xqj7yi5 | 6.7 | 2 % | 3.8 | 1.8 |
| raw:xz94ftm | 5.9 | 1 % | 3.3 | 1.8 |
| raw:x1pupq09 | 4.9 | 1 % | 1.8 | 2.7 |
| raw:xsfvzjq | 4.6 | 1 % | 2.8 | 1.7 |
| itio:ruusu | 3.1 | 1 % | 2.1 | 1.5 |
| raw:x6ci5mt | 2.4 | 1 % | 0.6 | 3.9 |
| raw:x10112ld | 1.8 | 0 % | 0.4 | 4.6 |
| raw:xcskgi7 | 1.7 | 0 % | 0.5 | 3.8 |
| lampo | 1.0 | 0 % | 0.1 | 20.0 |
| itio:x10112ld | 0.8 | 0 % | 0.6 | 1.5 |
| itio:xgtfw3l | 0.6 | 0 % | 0.4 | 1.5 |
| itio:x6ci5mt | 0.5 | 0 % | 0.4 | 1.5 |
| itio:x4i0yiu | 0.4 | 0 % | 0.3 | 1.5 |
| itio:x131kkkg | 0.3 | 0 % | 0.2 | 1.5 |
| itio:xcx9zgo | 0.1 | 0 % | 0.1 | 1.5 |
| itio:xv1aejg | 0.1 | 0 % | 0.1 | 1.5 |
| itio:x1pupq09 | 0.1 | 0 % | 0.1 | 1.5 |
| itio:xqj7yi5 | 0.1 | 0 % | 0.1 | 1.5 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 26.3 (hajonta 4.7)
- Odottavia päätöksiä käynnin alussa: 4.0 (hajonta 0.7); botin toimia per käynti 15.0
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 3.3/ajo, joista mutaatioita 0.4, kontaminaatioita 0.1; retkiä/testilöytöjä 25.3; kysyntäpiikkejä 6.2
- Korjuita 38.2, itiöiden ottoja 14.5, suodattimia 5.3 (kehikon tuotteita yhteensä 6.9), taulun tilauksia 2.6, ketjun askelia 7.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 13 | 8 | 16 | 20/20 |
| 2 | 38 | 17 | 55 | 20/20 |
| 3 | 28 | 1 | 58 | 20/20 |
| 4 | 20 | 1 | 47 | 20/20 |
| 5 | 36 | 1 | 212 | 20/20 |
| 6 | 113 | 12 | 298 | 18/20 |
| 7 | 34 | 2 | 143 | 11/20 |
| 8 | 44 | 6 | 89 | 6/20 |
| 9 | 33 | 24 | 45 | 3/20 |

## Profiili 2/VRK (käynnit klo 8 ja 20)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 16/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 3.2 vrk | 8.9 h | 2.5 vrk | 3.0 vrk | 4.0 vrk | pv 4 |
| HAUTOMO OSTETTU | 20/20 | 4.5 vrk | 13.1 h | 3.0 vrk | 4.5 vrk | 5.0 vrk | pv 5 |
| ENSIMMÄINEN RISTEYTYS | 19/20 | 6.1 vrk | 22.6 h | 4.5 vrk | 7.0 vrk | 7.0 vrk | pv 8 |
| KEHIKKO OSTETTU | 20/20 | 6.0 vrk | 18.5 h | 4.5 vrk | 6.0 vrk | 7.5 vrk | pv 7 |
| ENSIMMÄINEN SUODATIN | 19/20 | 10.0 vrk | 34.7 h | 7.5 vrk | 10.0 vrk | 12.5 vrk | pv 11 |
| VERKKOMUOTOINEN KANTA | 20/20 | 2.5 vrk | 12.9 h | 36.0 h | 2.5 vrk | 3.0 vrk | pv 3 |
| HOITAJASIENI | 2/20 | 12.0 vrk | 36.0 h | 10.5 vrk | 10.5 vrk | 13.5 vrk | pv 11 |
| KELLARI | 5/20 | 12.3 vrk | 16.3 h | 11.5 vrk | 12.0 vrk | 13.5 vrk | pv 13 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 5.4 vrk | 47.1 h | 4.0 vrk | 4.5 vrk | 11.0 vrk | pv 5 |
| TILAUS TÄYTETTY | 16/20 | 11.4 vrk | 24.5 h | 9.5 vrk | 11.5 vrk | 13.5 vrk | pv 12 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| purkki | 6.9 | 0.0 | 24.9 | 8.8 vrk | 10.5 vrk | 12/137 |
| hautomo | 1.0 | 108.0 | 60.0 | avaus |  |  |
| agar | 0.7 | 105.0 | 3.0 | avaus |  |  |
| kehikko | 1.5 | 142.8 | 60.0 | 3.6 vrk | 3.0 vrk | 26/30 |
| terraario | 3.9 | 160.8 | 45.7 | 2.6 vrk | 2.0 vrk | 37/77 |
| kellari | 0.3 | 295.2 | 300.0 | – | – | 0/5 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| villi | 163.5 | 46 % | 6.6 | 25.0 |
| raw:heltta | 80.5 | 23 % | 43.9 | 1.8 |
| raw:x1rnk6lz | 22.2 | 6 % | 11.9 | 1.9 |
| itio:heltta | 13.7 | 4 % | 9.3 | 1.5 |
| raw:xgtfw3l | 11.3 | 3 % | 5.7 | 2.0 |
| valokalvo | 10.0 | 3 % | 1.0 | 10.0 |
| raw:hamara | 8.2 | 2 % | 1.4 | 5.8 |
| itio:hamara | 6.9 | 2 % | 4.7 | 1.5 |
| raw:ruusu | 6.3 | 2 % | 1.7 | 3.7 |
| raw:xz94ftm | 5.3 | 1 % | 2.8 | 1.9 |
| raw:x131kkkg | 5.0 | 1 % | 2.5 | 2.0 |
| raw:kalvo | 4.4 | 1 % | 1.6 | 2.9 |
| raw:xv1aejg | 4.1 | 1 % | 2.3 | 1.8 |
| raw:xsfvzjq | 3.7 | 1 % | 2.0 | 1.9 |
| itio:ruusu | 2.8 | 1 % | 1.9 | 1.5 |
| raw:x10112ld | 1.8 | 1 % | 0.4 | 4.6 |
| raw:xcskgi7 | 1.4 | 0 % | 0.4 | 3.9 |
| raw:x6ci5mt | 1.2 | 0 % | 0.3 | 3.9 |
| lampo | 1.0 | 0 % | 0.1 | 20.0 |
| itio:x10112ld | 0.8 | 0 % | 0.6 | 1.5 |
| itio:xgtfw3l | 0.5 | 0 % | 0.4 | 1.5 |
| raw:xqj7yi5 | 0.4 | 0 % | 0.2 | 2.1 |
| itio:x6ci5mt | 0.4 | 0 % | 0.3 | 1.5 |
| itio:x131kkkg | 0.3 | 0 % | 0.2 | 1.5 |
| itio:x4i0yiu | 0.3 | 0 % | 0.2 | 1.5 |
| itio:xcx9zgo | 0.1 | 0 % | 0.1 | 1.5 |
| itio:xv1aejg | 0.1 | 0 % | 0.1 | 1.5 |
| itio:x1pupq09 | 0.1 | 0 % | 0.1 | 1.5 |
| itio:xqj7yi5 | 0.1 | 0 % | 0.1 | 1.5 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 24.7 (hajonta 2.5)
- Odottavia päätöksiä käynnin alussa: 3.8 (hajonta 0.7); botin toimia per käynti 14.3
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 4/20
- Risteytyksiä 3.1/ajo, joista mutaatioita 0.4, kontaminaatioita 0.2; retkiä/testilöytöjä 23.7; kysyntäpiikkejä 8.1
- Korjuita 31.4, itiöiden ottoja 14.5, suodattimia 4.8 (kehikon tuotteita yhteensä 6.0), taulun tilauksia 2.8, ketjun askelia 6.7 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 6 | 4 | 8 | 20/20 |
| 2 | 13 | 8 | 16 | 20/20 |
| 3 | 26 | 17 | 46 | 20/20 |
| 4 | 37 | 16 | 54 | 20/20 |
| 5 | 34 | 4 | 55 | 20/20 |
| 6 | 24 | 1 | 59 | 20/20 |
| 7 | 16 | 1 | 54 | 20/20 |
| 8 | 17 | 2 | 44 | 20/20 |
| 9 | 19 | 1 | 49 | 20/20 |
| 10 | 33 | 2 | 206 | 20/20 |
| 11 | 59 | 4 | 265 | 19/20 |
| 12 | 69 | 1 | 298 | 15/20 |
| 13 | 89 | 4 | 292 | 11/20 |
| 14 | 58 | 22 | 109 | 5/20 |

