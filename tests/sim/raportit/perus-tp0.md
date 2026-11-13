# Talousraportti perus-tp0

Peli: KOTI-01 V1.1. Ajettu 2026-11-13 komennolla `node tests/sim/run.js --profile kaikki --seeds 20 --out tests/sim/raportit --name perus-tp0 --quiet`.

Botti on "järkevä ahne" pelaaja (tests/sim/policy.js). Offline-kasvu kuten pelissä: enintään 8 h poissaolosta simuloidaan. Testilöytö (simuloitu ulkopeli) kerran vuorokaudessa laboratorion avauduttua.

## Profiili AKTIIVINEN (käynti 15 min välein klo 8–24)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 1.3 h | 0.0 h | 1.3 h | 1.3 h | 1.3 h | pv 1 |
| HAUTOMO OSTETTU | 20/20 | 1.8 h | 0.0 h | 1.8 h | 1.8 h | 1.8 h | pv 1 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 10.5 h | 3.1 h | 9.8 h | 9.8 h | 24.0 h | pv 1 |
| KEHIKKO OSTETTU | 20/20 | 10.5 h | 3.1 h | 9.8 h | 9.8 h | 24.0 h | pv 1 |
| ENSIMMÄINEN SUODATIN | 20/20 | 13.4 h | 3.0 h | 12.3 h | 12.8 h | 26.5 h | pv 1 |
| HOITAJASIENI | 19/20 | 24.4 h | 1.8 h | 24.0 h | 24.0 h | 32.0 h | pv 2 |
| KELLARI | 20/20 | 28.4 h | 1.5 h | 28.0 h | 28.0 h | 34.8 h | pv 2 |
| TILAUS TÄYTETTY | 20/20 | 28.4 h | 1.5 h | 28.0 h | 28.0 h | 34.8 h | pv 2 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| purkki | 6.7 | 0.0 | 24.4 | 1.7 h | 1.0 h | 68/133 |
| hautomo | 1.0 | 1.8 | 60.0 | avaus |  |  |
| agar | 4.1 | 1.8 | 3.0 | avaus |  |  |
| terraario | 5.0 | 8.4 | 50.0 | 4.8 h | 2.0 h | 58/100 |
| kehikko | 1.0 | 10.5 | 120.0 | 15.9 h | 16.3 h | 20/20 |
| kellari | 1.0 | 28.4 | 300.0 | – | – | 0/20 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| raw:heltta | 164.6 | 27 % | 159.5 | 1.0 |
| raw:ruusu | 158.9 | 26 % | 112.2 | 1.4 |
| raw:hamara | 158.0 | 26 % | 231.1 | 0.7 |
| raw:kalvo | 83.0 | 14 % | 59.2 | 1.4 |
| itio:heltta | 22.1 | 4 % | 6.0 | 3.7 |
| itio:ruusu | 15.2 | 3 % | 4.0 | 3.8 |
| itio:hamara | 2.6 | 0 % | 0.7 | 4.0 |
| villi | 2.5 | 0 % | 0.1 | 25.0 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 82.4 (hajonta 5.9)
- Odottavia päätöksiä käynnin alussa: 7.6 (hajonta 0.6); botin toimia per käynti 16.6
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 2.1/ajo, joista mutaatioita 0.1, kontaminaatioita 0.1; retkiä/testilöytöjä 2.0; kysyntäpiikkejä 2.0
- Korjuita 535.2, itiöiden ottoja 23.9, suodattimia 5.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 39 | 5 | 143 | 20/20 |
| 2 | 23 | 0 | 40 | 20/20 |

## Profiili 4/VRK (käynnit klo 8, 12, 17, 22)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 28.0 h | 0.0 h | 28.0 h | 28.0 h | 28.0 h | pv 2 |
| HAUTOMO OSTETTU | 20/20 | 38.0 h | 0.0 h | 38.0 h | 38.0 h | 38.0 h | pv 2 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 2.0 vrk | 0.0 h | 2.0 vrk | 2.0 vrk | 2.0 vrk | pv 3 |
| KEHIKKO OSTETTU | 20/20 | 3.4 vrk | 1.6 h | 3.2 vrk | 3.4 vrk | 3.6 vrk | pv 4 |
| ENSIMMÄINEN SUODATIN | 20/20 | 3.6 vrk | 2.5 h | 3.4 vrk | 3.6 vrk | 4.0 vrk | pv 4 |
| HOITAJASIENI | 20/20 | 2.4 vrk | 3.3 h | 2.4 vrk | 2.4 vrk | 3.0 vrk | pv 3 |
| KELLARI | 2/20 | 4.8 vrk | 5.0 h | 4.6 vrk | 4.6 vrk | 5.0 vrk | pv 5 |
| TILAUS TÄYTETTY | 20/20 | 4.6 vrk | 2.5 h | 4.4 vrk | 4.6 vrk | 5.0 vrk | pv 5 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| purkki | 6.5 | 0.0 | 23.8 | 14.5 h | 14.0 h | 21/129 |
| hautomo | 1.0 | 38.0 | 60.0 | avaus |  |  |
| agar | 4.2 | 38.0 | 3.0 | avaus |  |  |
| kehikko | 1.0 | 81.0 | 120.0 | 24.0 h | 24.0 h | 20/20 |
| terraario | 2.9 | 81.8 | 39.5 | – | – | 0/57 |
| kellari | 0.1 | 115.0 | 300.0 | – | – | 0/2 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| raw:ruusu | 100.8 | 27 % | 54.2 | 1.9 |
| raw:kalvo | 85.6 | 23 % | 50.8 | 1.7 |
| raw:hamara | 84.0 | 23 % | 45.1 | 1.9 |
| raw:heltta | 49.9 | 13 % | 26.4 | 1.9 |
| itio:heltta | 25.0 | 7 % | 6.3 | 4.0 |
| itio:ruusu | 16.0 | 4 % | 4.0 | 4.0 |
| itio:hamara | 4.8 | 1 % | 1.2 | 4.0 |
| villi | 3.8 | 1 % | 0.2 | 25.0 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 20.0 (hajonta 0.3)
- Odottavia päätöksiä käynnin alussa: 6.1 (hajonta 0.2); botin toimia per käynti 13.1
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 3.2/ajo, joista mutaatioita 0.4, kontaminaatioita 0.2; retkiä/testilöytöjä 4.1; kysyntäpiikkejä 5.0
- Korjuita 65.2, itiöiden ottoja 18.2, suodattimia 5.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 38 | 38 | 38 | 20/20 |
| 2 | 8 | 8 | 8 | 20/20 |
| 3 | 71 | 71 | 76 | 20/20 |
| 4 | 20 | 9 | 37 | 20/20 |
| 5 | 203 | 11 | 287 | 20/20 |

## Profiili 2/VRK (käynnit klo 8 ja 20)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 2.5 vrk | 0.0 h | 2.5 vrk | 2.5 vrk | 2.5 vrk | pv 3 |
| HAUTOMO OSTETTU | 20/20 | 3.5 vrk | 0.0 h | 3.5 vrk | 3.5 vrk | 3.5 vrk | pv 4 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 4.0 vrk | 2.6 h | 4.0 vrk | 4.0 vrk | 4.5 vrk | pv 5 |
| KEHIKKO OSTETTU | 20/20 | 6.1 vrk | 3.6 h | 6.0 vrk | 6.0 vrk | 6.5 vrk | pv 7 |
| ENSIMMÄINEN SUODATIN | 20/20 | 6.8 vrk | 5.9 h | 6.5 vrk | 7.0 vrk | 7.0 vrk | pv 8 |
| HOITAJASIENI | 20/20 | 4.6 vrk | 4.3 h | 4.5 vrk | 4.5 vrk | 5.0 vrk | pv 5 |
| KELLARI | 7/20 | 8.8 vrk | 5.9 h | 8.5 vrk | 9.0 vrk | 9.0 vrk | pv 10 |
| TILAUS TÄYTETTY | 20/20 | 8.8 vrk | 5.9 h | 8.5 vrk | 9.0 vrk | 9.0 vrk | pv 10 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| purkki | 5.7 | 0.0 | 21.9 | 36.0 h | 36.0 h | 22/113 |
| hautomo | 1.0 | 84.0 | 60.0 | avaus |  |  |
| agar | 4.2 | 84.0 | 3.0 | avaus |  |  |
| kehikko | 1.0 | 145.2 | 120.0 | 2.3 vrk | 2.0 vrk | 20/20 |
| terraario | 2.6 | 160.8 | 38.4 | – | – | 0/51 |
| kellari | 0.4 | 210.9 | 300.0 | – | – | 0/7 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| raw:ruusu | 131.8 | 35 % | 75.1 | 1.8 |
| raw:hamara | 90.9 | 24 % | 49.8 | 1.8 |
| raw:kalvo | 59.5 | 16 % | 35.0 | 1.7 |
| raw:heltta | 40.2 | 11 % | 21.6 | 1.9 |
| itio:heltta | 26.3 | 7 % | 6.6 | 4.0 |
| itio:ruusu | 16.4 | 4 % | 4.1 | 4.0 |
| villi | 5.0 | 1 % | 0.2 | 25.0 |
| itio:hamara | 2.4 | 1 % | 0.6 | 4.0 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 18.6 (hajonta 0.5)
- Odottavia päätöksiä käynnin alussa: 6.3 (hajonta 0.4); botin toimia per käynti 14.1
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 3.2/ajo, joista mutaatioita 0.3, kontaminaatioita 0.2; retkiä/testilöytöjä 7.6; kysyntäpiikkejä 6.0
- Korjuita 66.4, itiöiden ottoja 18.0, suodattimia 5.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 22 | 22 | 22 | 20/20 |
| 2 | 38 | 38 | 38 | 20/20 |
| 3 | 50 | 50 | 50 | 20/20 |
| 4 | 12 | 12 | 12 | 20/20 |
| 5 | 52 | 48 | 70 | 20/20 |
| 6 | 106 | 88 | 120 | 20/20 |
| 7 | 16 | 0 | 30 | 20/20 |
| 8 | 20 | 2 | 39 | 20/20 |
| 9 | 83 | 2 | 298 | 20/20 |

