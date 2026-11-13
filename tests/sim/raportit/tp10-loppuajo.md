# Talousraportti tp10-loppuajo

Peli: KOTI-01 V1.5. Ajettu 2026-11-13 komennolla `node tests/sim/run.js --profile kaikki --seeds 20 --quiet --out tests/sim/raportit --name tp10-loppuajo`.

Botti on "järkevä ahne" pelaaja (tests/sim/policy.js). Offline-kasvu kuten pelissä: enintään 8 h poissaolosta simuloidaan. Testilöytö (simuloitu ulkopeli) kerran vuorokaudessa laboratorion avauduttua.

## Profiili AKTIIVINEN (käynti 15 min välein klo 8–24)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 5.3 h | 0.2 h | 4.8 h | 5.3 h | 5.8 h | pv 1 |
| HAUTOMO OSTETTU | 20/20 | 7.4 h | 1.0 h | 5.8 h | 6.8 h | 9.0 h | pv 1 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 18.4 h | 4.6 h | 13.8 h | 14.8 h | 24.0 h | pv 1 |
| KEHIKKO OSTETTU | 20/20 | 10.3 h | 0.9 h | 8.8 h | 10.0 h | 13.0 h | pv 1 |
| ENSIMMÄINEN SUODATIN | 20/20 | 29.9 h | 1.0 h | 28.3 h | 29.5 h | 31.5 h | pv 2 |
| HOITAJASIENI | 20/20 | 27.6 h | 4.0 h | 24.0 h | 24.0 h | 32.0 h | pv 2 |
| KELLARI | 1/20 | 2.1 vrk | 0.0 h | 2.1 vrk | 2.1 vrk | 2.1 vrk | pv 3 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 6.7 h | 0.5 h | 5.8 h | 6.8 h | 7.8 h | pv 1 |
| TILAUS TÄYTETTY | 20/20 | 37.9 h | 4.2 h | 32.8 h | 36.5 h | 2.1 vrk | pv 2 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| terraario | 9.9 | 1.5 | 74.9 | 19.6 h | 18.2 h | 42/198 |
| hautomo | 1.0 | 7.4 | 60.0 | avaus |  |  |
| kehikko | 1.6 | 10.3 | 60.0 | 13.9 h | 17.0 h | 28/32 |
| agar | 1.6 | 8.1 | 3.0 | avaus |  |  |
| kellari | 0.1 | 51.0 | 300.0 | – | – | 0/1 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| raw:heltta | 157.6 | 29 % | 111.9 | 1.4 |
| villi | 106.5 | 20 % | 4.3 | 24.8 |
| raw:hamara | 79.4 | 15 % | 14.8 | 5.4 |
| valokalvo | 70.5 | 13 % | 7.3 | 9.7 |
| raw:ruusu | 38.4 | 7 % | 11.5 | 3.4 |
| raw:kalvo | 31.9 | 6 % | 12.4 | 2.6 |
| itio:hamara | 22.6 | 4 % | 16.4 | 1.4 |
| itio:heltta | 15.6 | 3 % | 11.7 | 1.3 |
| lampo | 11.0 | 2 % | 0.6 | 20.0 |
| itio:ruusu | 3.0 | 1 % | 2.0 | 1.5 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 117.3 (hajonta 9.0)
- Odottavia päätöksiä käynnin alussa: 1.9 (hajonta 0.2); botin toimia per käynti 6.9
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 2.6/ajo, joista mutaatioita 0.2, kontaminaatioita 0.1; retkiä/testilöytöjä 14.1; kysyntäpiikkejä 2.1
- Korjuita 72.8, itiöiden ottoja 40.1, suodattimia 5.0 (kehikon tuotteita yhteensä 13.0), taulun tilauksia 3.5, ketjun askelia 7.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 37 | 1 | 70 | 20/20 |
| 2 | 87 | 1 | 210 | 20/20 |
| 3 | 130 | 116 | 145 | 2/20 |

## Profiili 4/VRK (käynnit klo 8, 12, 17, 22)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 20/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 32.8 h | 2.9 h | 28.0 h | 33.0 h | 38.0 h | pv 2 |
| HAUTOMO OSTETTU | 20/20 | 44.4 h | 9.0 h | 33.0 h | 2.0 vrk | 3.0 vrk | pv 3 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 2.4 vrk | 8.1 h | 2.0 vrk | 2.4 vrk | 3.4 vrk | pv 3 |
| KEHIKKO OSTETTU | 20/20 | 2.4 vrk | 6.3 h | 2.0 vrk | 2.4 vrk | 3.4 vrk | pv 3 |
| ENSIMMÄINEN SUODATIN | 20/20 | 4.6 vrk | 14.2 h | 3.6 vrk | 4.4 vrk | 6.0 vrk | pv 5 |
| HOITAJASIENI | 20/20 | 2.7 vrk | 10.6 h | 2.0 vrk | 2.4 vrk | 4.0 vrk | pv 3 |
| KELLARI | 6/20 | 7.5 vrk | 24.6 h | 6.2 vrk | 7.0 vrk | 9.0 vrk | pv 8 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 2.6 vrk | 25.2 h | 38.0 h | 2.4 vrk | 6.0 vrk | pv 3 |
| TILAUS TÄYTETTY | 20/20 | 6.2 vrk | 33.8 h | 4.2 vrk | 6.0 vrk | 10.0 vrk | pv 7 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| terraario | 9.9 | 7.8 | 75.5 | 3.0 vrk | 3.4 vrk | 38/197 |
| hautomo | 1.0 | 44.4 | 60.0 | avaus |  |  |
| kehikko | 1.7 | 58.5 | 60.0 | 2.0 vrk | 2.2 vrk | 29/33 |
| agar | 1.1 | 38.0 | 3.0 | avaus |  |  |
| kellari | 0.3 | 179.7 | 300.0 | – | – | 0/6 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| villi | 203.1 | 35 % | 8.2 | 24.9 |
| raw:hamara | 166.7 | 29 % | 31.8 | 5.2 |
| raw:heltta | 68.8 | 12 % | 41.6 | 1.7 |
| itio:hamara | 38.7 | 7 % | 26.9 | 1.4 |
| raw:ruusu | 34.8 | 6 % | 11.0 | 3.2 |
| raw:kalvo | 28.7 | 5 % | 11.6 | 2.5 |
| valokalvo | 14.5 | 3 % | 1.5 | 10.0 |
| itio:heltta | 13.1 | 2 % | 9.0 | 1.5 |
| itio:ruusu | 4.0 | 1 % | 2.7 | 1.5 |
| lampo | 2.0 | 0 % | 0.1 | 20.0 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 26.1 (hajonta 5.6)
- Odottavia päätöksiä käynnin alussa: 3.6 (hajonta 0.6); botin toimia per käynti 13.2
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 0/20
- Risteytyksiä 2.7/ajo, joista mutaatioita 0.3, kontaminaatioita 0.2; retkiä/testilöytöjä 25.0; kysyntäpiikkejä 6.2
- Korjuita 32.2, itiöiden ottoja 37.9, suodattimia 5.6 (kehikon tuotteita yhteensä 7.3), taulun tilauksia 4.4, ketjun askelia 7.0 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 14 | 3 | 30 | 20/20 |
| 2 | 36 | 14 | 57 | 20/20 |
| 3 | 25 | 1 | 60 | 20/20 |
| 4 | 31 | 6 | 57 | 20/20 |
| 5 | 41 | 0 | 87 | 20/20 |
| 6 | 65 | 1 | 254 | 18/20 |
| 7 | 43 | 15 | 91 | 12/20 |
| 8 | 90 | 25 | 135 | 5/20 |
| 9 | 106 | 16 | 196 | 2/20 |
| 10 | 107 | 102 | 111 | 2/20 |

## Profiili 2/VRK (käynnit klo 8 ja 20)

20 siementä, enintään 14 vrk, nopeus ×1. Tilaus täytetty 16/20 ajossa.

### Virstanpylväät (tunteja pelin alusta)

| Virstanpylväs | saavutettu | keskiarvo | hajonta | min | mediaani | max | mediaanipäivä |
|---|---|---|---|---|---|---|---|
| ENSIMMÄINEN MYYNTI | 20/20 | 0.0 h | 0.0 h | 0.0 h | 0.0 h | 0.0 h | pv 1 |
| LABORATORIO AUKI | 20/20 | 3.0 vrk | 7.1 h | 2.5 vrk | 3.0 vrk | 3.5 vrk | pv 4 |
| HAUTOMO OSTETTU | 20/20 | 3.9 vrk | 15.2 h | 3.0 vrk | 3.5 vrk | 4.5 vrk | pv 4 |
| ENSIMMÄINEN RISTEYTYS | 20/20 | 4.4 vrk | 15.2 h | 3.5 vrk | 4.0 vrk | 5.0 vrk | pv 5 |
| KEHIKKO OSTETTU | 20/20 | 5.3 vrk | 18.4 h | 3.5 vrk | 5.5 vrk | 6.5 vrk | pv 6 |
| ENSIMMÄINEN SUODATIN | 20/20 | 9.0 vrk | 31.3 h | 5.5 vrk | 9.0 vrk | 11.5 vrk | pv 10 |
| HOITAJASIENI | 20/20 | 4.9 vrk | 22.4 h | 3.5 vrk | 4.5 vrk | 7.5 vrk | pv 5 |
| KELLARI | 1/20 | 12.5 vrk | 0.0 h | 12.5 vrk | 12.5 vrk | 12.5 vrk | pv 13 |
| ENSIMMÄINEN TAULUN TILAUS | 20/20 | 4.8 vrk | 31.2 h | 3.5 vrk | 4.5 vrk | 8.5 vrk | pv 5 |
| TILAUS TÄYTETTY | 16/20 | 11.6 vrk | 38.6 h | 7.0 vrk | 11.5 vrk | 13.5 vrk | pv 12 |

### Ostot ja takaisinmaksu

Takaisinmaksu = aika ostosta siihen, kun ostoksen tuotanto (toteutuneilla myyntihinnoilla) kattaa hinnan. Kellari: tila + sinne sijoitetut astiat. Suodatin arvotetaan tilauksen palkkiolla (300 / 5 = 60), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Mittari lasketaan vain ajon loppuun asti (tilaus täytetty), joten myöhäiset ostot jäävät usein maksamatta. Hautomo ja agar avaavat risteytyksen, niille ei lasketa rahatuottoa.

| Ostos | kpl/ajo | 1. osto (h) | hinta ka. | takaisinmaksu ka. | mediaani | maksanut itsensä |
|---|---|---|---|---|---|---|
| terraario | 9.0 | 21.0 | 72.3 | 5.6 vrk | 7.0 vrk | 39/180 |
| hautomo | 1.0 | 92.4 | 60.0 | avaus |  |  |
| kehikko | 1.6 | 126.6 | 60.0 | 3.8 vrk | 4.0 vrk | 25/32 |
| agar | 1.4 | 80.7 | 3.0 | avaus |  |  |
| kellari | 0.1 | 300.0 | 300.0 | – | – | 0/1 |

### Tuotteiden osuus myynnistä

| Tuote | hopeaa/ajo | osuus | kpl/ajo | keskihinta |
|---|---|---|---|---|
| villi | 186.0 | 40 % | 7.5 | 25.0 |
| raw:hamara | 140.9 | 31 % | 28.0 | 5.0 |
| raw:heltta | 39.7 | 9 % | 23.5 | 1.7 |
| itio:hamara | 37.1 | 8 % | 25.5 | 1.5 |
| raw:kalvo | 27.9 | 6 % | 11.3 | 2.5 |
| itio:heltta | 13.2 | 3 % | 9.0 | 1.5 |
| raw:ruusu | 7.6 | 2 % | 2.2 | 3.5 |
| valokalvo | 5.0 | 1 % | 0.5 | 10.0 |
| itio:ruusu | 3.4 | 1 % | 2.3 | 1.5 |

### Käynnit ja umpikujat

- Käyntejä tilaukseen asti: 24.9 (hajonta 3.3)
- Odottavia päätöksiä käynnin alussa: 3.3 (hajonta 0.6); botin toimia per käynti 12.5
- Tyhjiä käyntejä (ei yhtään tapahtumaa): 0 %
- Umpikujat: jumissa-käyntejä (mikään ei kasva eikä mitään voi tehdä) 0.0/ajo, pelastusitiöitä 0.0/ajo, risteytyksen vanhempi menetetty 0/20 ajossa (–; ka. 0.0 käyntiä), tilaus jäi täyttämättä 4/20
- Risteytyksiä 2.6/ajo, joista mutaatioita 0.3, kontaminaatioita 0.2; retkiä/testilöytöjä 23.9; kysyntäpiikkejä 8.2
- Korjuita 23.0, itiöiden ottoja 36.3, suodattimia 5.0 (kehikon tuotteita yhteensä 5.5), taulun tilauksia 3.9, ketjun askelia 6.8 per ajo

### Hopeakäyrä (hopeaa päivän viimeisen käynnin jälkeen)

| Päivä | keskiarvo | min | max | ajoja käynnissä |
|---|---|---|---|---|
| 1 | 26 | 0 | 29 | 20/20 |
| 2 | 14 | 4 | 30 | 20/20 |
| 3 | 36 | 14 | 61 | 20/20 |
| 4 | 31 | 1 | 57 | 20/20 |
| 5 | 23 | 3 | 50 | 20/20 |
| 6 | 23 | 1 | 58 | 20/20 |
| 7 | 27 | 1 | 55 | 20/20 |
| 8 | 23 | 3 | 44 | 20/20 |
| 9 | 30 | 1 | 60 | 19/20 |
| 10 | 45 | 0 | 93 | 19/20 |
| 11 | 45 | 0 | 129 | 18/20 |
| 12 | 65 | 3 | 225 | 17/20 |
| 13 | 73 | 1 | 220 | 12/20 |
| 14 | 54 | 4 | 120 | 7/20 |

