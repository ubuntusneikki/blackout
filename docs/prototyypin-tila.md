# Prototyyppien tila (12.11.2026)

Huom: protot tehtiin ennen ydinvision v2:ta. Kartan parantaminen (HERÄTÄ, `places`, uute parannusaineena) on poistettu (tehtävät 1–2), ja uutteen tilalle tuli markkina ja jalosteet.

## KOTI-01 v1.1 (kotipeli v1, ks. kotipeli-v1.md)

TP0 (v1.1): tapahtumaväylä `events.js`, kuivausteline ja kuivatut sienet poistettu (vanhat hyvitetään hopeana), muistot ja symbiontin tarinarepliikit poistettu (vain lyhyet vihjeet), ULOS-nappi poistettu kodista. Ulko ja iso jäädytetty.

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
- Kehikko 2 h, 3 kalvoheltan satoa → itiösuodatin. (Kuivausteline poistettu v1.1:ssä.)
- Markkina (HOPEA): raaka 2, suodatin 45, villi näyte 25, itiöpussi 4. Jokainen myyty −4 % (0,96ⁿ), palautuu puoliintumisajalla 2 h. Kysyntäpiikki ×2 kolme tuntia: ensimmäinen 2 h kohdalla, sitten kerran vuorokaudessa.
- Kauppa: lasipurkki 10 + 5n, terraario 30 + 10n, agar 3; kun 10 kpl myyty: hautomo 60; kun kalvoheltta tunnettu: kehikko 120, kellari 300.
- Tilaus syntyy kehikon ostosta: 5 suodatinta → 300 hopeaa ja "V1 LÄPÄISTY".
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

## KOTI-01 V1.2 (TP3: loopin syventäminen)

- **Satoaallot:** kypsä kasvusto kerää enintään 3 aaltoa (uusi aalto alkaa 35 %:sta). Korjuu ottaa kaikki, OTA ITIÖT yhden aallon.
- **Kannoille omat arvot:** siniheltta nopea ja halpa, ruususieni hidas ja arvokas, hämäränuppi harvinainen, kalvoheltta muottikanta. Hinta on kannan `price`.
- **Kehikko yleismuottina** (60 HOPEAA, avautuu laboratorion myötä): SINIHELTTA → VALOKALVO, RUUSUSIENI → LÄMPÖRIHMA, KALVOHELTTA ja VERKKOHELTTA → ITIÖSUODATIN.
- **Hoitajasieni:** naapurit eivät kuivu ja kasvavat +10 %.
- **Torin taulu:** 3 tilausta tunnetuista tuotteista, yksi vaihtuu joka pelivuorokausi. Virstanpylväsketju (sato → myynti → hautomo → risteytys → taulu → kehikko) päättyy suodatintilaukseen.
- **Lupausnäkymä:** SEURAAVAKSI-rivi huoneessa ja yhteenveto palatessa (`paluu`-tapahtuma).
- **Uudet kannat** (Juuso hyväksyi nimet 13.11.): YÖRUUSU = ruususieni × hämäränuppi, VERKKOHELTTA = kalvoheltta × hämäränuppi.
- **Mitoitus TP2:n simulaattorilla** (20 siementä, ×1): kasvuajat tunneissa (siniheltta ja verkkoheltta 1 h, kalvoheltta 2 h, ruususieni ja hämäränuppi 3 h, yöruusu 6 h), itiöpussi 1,5 H, laboratorio aukeaa 15 myydystä. Tilauksen mediaani: aktiivinen 2,0 vrk, 4 käyntiä/vrk 6,0 vrk (tavoite 6–8), 2 käyntiä/vrk 11,5 vrk.
- Havainto: 4/vrk-profiililla laboratorio aukeaa vasta noin 2,6 vrk:n kohdalla, joten alkuvaihe on pitkä pelkillä kahdella kannalla.

## KOTI-01 V1.5 (TP10: viimeistely ja pelitesti)

- **Akvaario korjattu** (`blender/koti.py`): vesi on matala (0,14 m) ja lasi korkeampi (0,74 m), joten kypsä sieni mahtuu kannen alle sekä huoneessa että lähikuvassa. Vedenpinta ja vesi ovat karheita ja himmeitä, joten kirkasta valkoista nauhaa ei enää näy.
- **Palvelinkaappi:** hyllyn reunan sammalpalikat vaihdettu roikkuviksi sammalrihmoiksi (lähikuvassa ne näyttivät vihreiltä virhepalikoilta).
- **Simulaattorin botti** (`tests/sim/policy.js`): botti jätti kehikon tyhjäksi päiviksi, koska se myi siniheltan ennen kuin ehti kasvattaa siitä tuotteen (ketjun askel "kasvata tuote kehikossa"), eikä se kasvattanut kalvohelttaa ennen tilausta. Nyt se pitää halvimman reseptin sadon kehikolle ja kasvattaa kalvohelttaa valmiiksi, kuten pelaaja tekisi. Pelin luvut eivät muuttuneet.
- **Loppuajo** (20 siementä, ×1): tilauksen mediaani aktiivinen 1,5 vrk, 4 käyntiä/vrk 6,0 vrk (ka. 6,2, tavoite 6–8), 2 käyntiä/vrk 11,5 vrk (16/20 ajoa 14 vrk:ssa). Laboratorio aukeaa 4/vrk-profiililla noin 33 h:n kohdalla (päivän 2 aamu). Kokeilu: laboratorio 10 myynnistä (nyt 15) avaisi sen 24 h:ssa ja lyhentäisi tilauksen noin 5,5 vrk:een, eli alle tavoitteen, joten raja pidettiin.
- Pages julkaisee mainin onnistuneesti (pages build and deployment, PR #14:n merge).
