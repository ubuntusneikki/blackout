# Prototyyppien tila (12.11.2026)

Huom: protot tehtiin ennen ydinvision v2:ta. Kartan parantaminen (HERÄTÄ, `places`, uute parannusaineena) on vanhaa suuntaa ja poistetaan (CLAUDE.md, tehtävä 1–2).

## KOTI-01 v0.2

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
- Markkina: lasipurkki 4 + 3n, terraario 10 + 6n, hyllyn laajennus 30 satoa. Jalostus 5 satoa → 1 uute (vanhaa suuntaa).

## ULKO-01 v0.1

- OSM-ruudut noin 550 m, välimuisti 7 vrk, demokaupunki varalla.
- Löydöt: 150 m solut, 16 % soluista saa päivittäin löydön (noin 3–6/km²). Ensilöytö uudesta solusta +1 itiö.
- Etäisyydet: syke 260 m, välähdys 90 m, tunnistus 45 m, keräys 25 m, pito 2,4 s.
- Paikkatyypit: puisto (heltta, hoitaja, muisto), ranta (kääpä, akvaario), teollinen (ruusu, palvelinkaappi), arkisto (muisto, hämärä), piha (hämärä, heltta), verkko (muisto, palvelinkaappi).
- 10 muistoa (symbiontin lauseet) – tekstit kirjoitettu vanhalla "kuihtumisen" teemalla, päivitettävä villiintymiseen.

## ISO-testi

- three.js r128, ortografinen isometrinen kamera, renderöinti 256 px, varjostin: paletti + Bayer-pistekuviointi + ääriviivat; elinvoimaväritys maailmankoordinaateilla.
- Rakennukset OSM-pohjista, korkeus `building:levels` tai arvottu, kattokoristeet ja puut instansseina.

## Blender

- Huonetesti (room.py) ja katupakkaus 1 (kit.py): penkki, katulamppu, bussikatos, kioski, auto, vesisäiliö, aita, sähkökaappi, pyöräteline, sienirengas + lamellitalo, pistetalo, kivitalo.
- Heikoimmat: penkki (pieni, tumma), pyöräteline (epäselvä), lampun hehku.
