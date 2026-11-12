# Prototyyppien tila (12.11.2026)

Huom: protot tehtiin ennen ydinvision v2:ta. Kartan parantaminen (HERÄTÄ, `places`, uute parannusaineena) on poistettu (tehtävät 1–2), ja uutteen tilalle tuli markkina ja jalosteet.

## KOTI-01 v1.0 (kotipeli v1, ks. kotipeli-v1.md)

Toteutuneet luvut. Ajat ovat pelinopeudella ×1; testinopeus ×60 on oletus.

| Kanta | Ilmasto | Kasvu | Sato | Mistä |
|---|---|---|---|---|
| Siniheltta | kostea, viileä | 10 min | 3 | alussa (2 itiötä) |
| Ruususieni | kuiva, lämmin | 15 min | 4 | alussa (2 itiötä) |
| Hämäränuppi | kuiva, viileä | 12 min | 3 | ulkoa / TESTILÖYTÖ |
| Kalvoheltta | kostea, lämmin | 20 min | 3 | siniheltta × ruususieni |
| Hoitajasieni | kostea, viileä | 7 min | – | siniheltta × hämäränuppi, sumuttaa 4 naapuria |

- Ensimmäinen kasvu 60 s. Sato = perussato × astian koko × sopivuus (×0,5/0,8/1,3), mutaatio sato +1 tai kasvu ×1,25.
- Kypsästä kannasta joko KORJAA SATO tai OTA ITIÖT (1 itiöpussi); kummastakin kasvu jatkuu 35 %:sta. Satunnainen lisäitiö poistettu.
- Horros: kuivunut kanta pysähtyy ja jatkaa sumutuksesta. KOMPOSTI tyhjentää astian.
- Huone 4×4, kellari 4×3 (astiat kuivuvat puolet hitaammin, kosteat kannat +20 %). Rakennustila siirtää ja vaihtaa esineitä myös tilojen välillä.
- Hautomo 8 h, mutaatio 10 %, kontaminaatio 5 % (villi näyte). Tulos arvotaan maljaa aloittaessa ja paljastetaan avatessa. Valmis malja avautuu itsestään, kun koti avataan (aamupaljastus).
- Kuivausteline 30 min, enintään 5 kpl kerralla. Kehikko 2 h, 3 kalvoheltan satoa → itiösuodatin.
- Markkina (HOPEA): raaka 2, kuivattu 5, suodatin 45, villi näyte 25, itiöpussi 4. Jokainen myyty −4 % (0,96ⁿ), palautuu puoliintumisajalla 2 h. Kysyntäpiikki ×2 kolme tuntia: ensimmäinen 2 h kohdalla, sitten kerran vuorokaudessa.
- Kauppa: lasipurkki 10 + 5n, terraario 30 + 10n, agar 3; kun 10 kpl myyty: kuivausteline 40, hautomo 60; kun kalvoheltta tunnettu: kehikko 120, kellari 300.
- Tilaus syntyy kehikon ostosta: 5 suodatinta → 300 hopeaa, muisto #11 ja "V1 LÄPÄISTY".
- Pelastus: jos kasvustot ja itiöt loppuvat kokonaan, symbiontti antaa yhden siniheltan itiön.
- **Läpipeluu** (`tests/v1-lapipeluu.js`, botti pelaa jatkuvasti ja optimoiden): tilaus täyttyy noin 19–22 pelitunnissa, eli testinopeudella noin 20 minuutissa. Hitain vaihe on hautomon 8 h.

## ULKO-01 v0.3

- Kotipeli v1: tulikääpä ja hoitajasieni poistettu löydöistä (puisto: siniheltta ja muistot, ranta: siniheltta, akvaario ja muistot). Muisto #11 tulee kodin tilauksesta, ei kartalta.

### v0.2

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
