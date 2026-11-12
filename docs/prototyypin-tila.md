# Prototyyppien tila (12.11.2026)

Huom: protot tehtiin ennen ydinvision v2:ta. Kartan parantaminen (HERÄTÄ, `places`, uute parannusaineena) on poistettu (tehtävät 1–2), ja uutteen tilalle tuli markkina ja jalosteet.

## KOTI-01 v0.3

- Huone: 2×3 hylly (laajennus 3×3), astian poikkileikkaus. Testinopeus ×60 oletuksena, offline-kasvu enintään 8 h.

| Kanta | Ilmasto | Kasvuaika (×1) | Perussato |
|---|---|---|---|
| Siniheltta | kostea, viileä | 10 min | 3 |
| Ruususieni | kuiva, lämmin | 15 min | 4 |
| Tulikääpä | kostea, lämmin | 20 min | 6 |
| Hämäränuppi | kuiva, viileä | 12,5 min | 3 |
| Hoitajasieni | kostea, viileä | 6,7 min | ei satoa; sumuttaa naapuriastiat |

| Astia | Ilmasto | Koko | Kuivuu | Saatavuus |
|---|---|---|---|---|
| Lasipurkki | kuiva, viileä | 0,7 | 20 min | markkina |
| Terraario | kostea, viileä | 1,0 | 40 min | markkina |
| Akvaario | kostea, lämmin | 1,2 | ei kuivu | ulkoa |
| Palvelinkaappi | kuiva, lämmin | 1,1 | 15 min | ulkoa |

- Sopivuuskerroin (ilmasto-osumat 0/1/2): ×0,5 / ×0,8 / ×1,3, vaikuttaa kasvuun ja satoon.
- Sato = perussato × koko × sopivuus; korjuun jälkeen kasvu jatkuu 35 %:sta; 35 % todennäköisyys lisäitiöön.
- Sato kertyy kannoittain (`goods['r:kanta']`). Valuutan työnimi **MK**.

### Markkina (simuloitu)

| Tuote | Perushinta |
|---|---|
| Perussato | siniheltta 2, ruusu 3, kääpä 4, hämärä 3 MK/kpl |
| Jaloste (3 perussatoa → 1) | Sinitee 10, Ruusuhillo 14, Taula 19, Hämärämuste 14 MK (raaka-aine × 3 × 1,6) |
| Itiöt | siniheltta 4, ruusu 8, kääpä 10, hämärä 7, hoitaja 25 MK |

- Hinta = perushinta × piikki / (1 + kyllääntyminen). Jokainen myyty kappale lisää kyllääntymistä (perussato 0,06, jaloste 0,14, itiö 0,2), joten isot erät myydään kappale kappaleelta halvemmalla.
- Kyllääntyminen puolittuu tunnissa pelinopeudella ×1 (×60: minuutissa). Markkina kulkee myös offline-ajan.
- Kysyntäpiikki 30–70 min välein (×1), kestää 25 min, kerroin ×1,8–2,6. Osuu kantaan, jota pelaaja on jo korjannut (perussato tai jaloste). Piikki näkyy vihjeessä ja MARKKINA-nappi hehkuu meripihkana, jos pelaajalla on piikin tuotetta.
- Ostot: lasipurkki 10 + 6n, terraario 25 + 12n, hyllyn laajennus 80 MK.
- Vanha tallennus: `sato` × 2 + `uute` × 15 → MK.

## ULKO-01 v0.2

- HERÄTÄ, herätetyt paikat ja niiden palkinnot poistettu. Kartta piirretään vakiokylläisyydellä (`MAP_V` 0,3), jotta hehkuvat löydöt erottuvat. Alapalkissa SYKE, MUISTOT ja KOTIIN.

- OSM-ruudut noin 550 m, välimuisti 7 vrk, demokaupunki varalla.
- Löydöt: 150 m solut, 16 % soluista saa päivittäin löydön (noin 3–6/km²). Ensilöytö uudesta solusta +1 itiö.
- Etäisyydet: syke 260 m, välähdys 90 m, tunnistus 45 m, keräys 25 m, pito 2,4 s.
- Paikkatyypit: puisto (heltta, hoitaja, muisto), ranta (kääpä, akvaario), teollinen (ruusu, palvelinkaappi), arkisto (muisto, hämärä), piha (hämärä, heltta), verkko (muisto, palvelinkaappi).
- 10 muistoa (symbiontin lauseet). Kolme suoraan vanhaan teemaan viitannutta lausetta päivitetty villiintymiseen, muut odottavat tarinatyötä.

## ISO-testi

- three.js r128, ortografinen isometrinen kamera, renderöinti 256 px, varjostin: paletti + Bayer-pistekuviointi + ääriviivat; elinvoimaväritys maailmankoordinaateilla.
- Rakennukset OSM-pohjista, korkeus `building:levels` tai arvottu, kattokoristeet ja puut instansseina.

## Blender

- Huonetesti (room.py) ja katupakkaus 1 (kit.py): penkki, katulamppu, bussikatos, kioski, auto, vesisäiliö, aita, sähkökaappi, pyöräteline, sienirengas + lamellitalo, pistetalo, kivitalo.
- Heikoimmat: penkki (pieni, tumma), pyöräteline (epäselvä), lampun hehku.
