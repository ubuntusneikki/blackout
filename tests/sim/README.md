# Talouden simulaattori (TP2)

Päätön simulaattori, joka pelaa kotipeliä pelin omalla logiikalla (`koti/js/data.js`, `state.js`, `sim.js`, `events.js` ja TP5:n `retki.js`, jos se on pelissä) ja raportoi talouden luvut. Ei selainta, ei riippuvuuksia: Node 22.

```
node tests/sim/run.js --profile 4 --seeds 20
node tests/sim/run.js --profile kaikki --seeds 20 --out tests/sim/raportit --name perus-tp0
```

Tulos: markdown-raportti (myös tulosteena) ja JSON samaan kansioon, oletuksena `tests/sim/out/` (ei versionhallinnassa).

## Valitsimet

| Valitsin | Oletus | Merkitys |
|---|---|---|
| `--profile` | `4` | `aktiivinen` (15 min välein klo 8–24), `4` (klo 8, 12, 17, 22), `2` (klo 8, 20), `kaikki` tai pilkuin eroteltu lista |
| `--seeds` | 20 | siemenet 1…N (mutaatio, kontaminaatio, kysyntäpiikit, löydöt) |
| `--days` | 14 | ajon enimmäispituus, ajo päättyy myös tilauksen täyttyessä |
| `--speed` | 1 | pelin nopeus (`S.speed`); 1 = oikea aika, 60 = pelin TESTI-tila |
| `--sell-floor` | 0.6 | botti myy, kunnes yksikköhinta on alle 60 % perushinnasta (piikkituote kokonaan) |
| `--no-retki` | | ei testilöytöjä eikä rihmaretkiä |
| `--out`, `--name` | | raportin kansio ja tiedostonimi |
| `--full` | | JSON:iin myös jokaisen ajon loki ja hopeakäyrä |
| `--quiet` | | ei raporttia tulosteeseen |

## Miten se toimii

- `engine.js` korvaa `localStorage`, `location`, `Date.now` ja `Math.random` (siemennetty), lataa pelimoduulit ja kuuntelee tapahtumaväylää (`on('*')`). Mittarit kerätään tapahtumista, joten pelilogiikkaa ei kopioida.
- Käynti: poissaolo simuloidaan kuten `main.js`:n `catchUp` (enintään 8 h, loppu aika ei kulu pelissä), sitten `syncKnown`, `checkUnlocks` ja `rescue`. Botti toimii, odottaa 30 s ja toimii uudelleen käynnin keston ajan (aktiivinen 2 min, 4/vrk 3 min, 2/vrk 4 min).
- `profiles.js`: käyntien kellonajat. Uuden profiilin voi lisätä yhdellä rivillä.
- `policy.js`: botti on joukko moduuleja (`laitteet, korjuu, taulu, myynti, ostot, sijoitus, laboratorio, kehikko, vaihto, istutus, hoito, retki`), jotka ajetaan järjestyksessä, kunnes mitään ei enää tapahdu. Uusi mekaniikka lisätään omana moduulinaan `MODULES`-olioon ja nimenä `DEFAULT_ORDER`-listaan. Moduuli saa `ctx`:n (`G` = sim.js, `S` = tila, `D` = data.js, `ST` = state.js, `R` = retki.js tai null, `now()`, `opt`, `plan`) ja palauttaa tekemiensä toimien määrän.

## TP3-tuki

Botti tunnistaa TP3:n rajapinnan, jos se on pelissä: satoaallot (`G.waves`), kehikon reseptit (`D.FRAME`, `G.startFrame(dev, kanta)`), torin taulu (`S.board`, `G.deliverBoard`, `G.boardHave`) ja virstanpylväsketju (tapahtuma `virstanpylvas`). Taulun tilaus (`tilaus-valmis`, `lahde: 'taulu'`) ei merkitse päätilausta täytetyksi.

## Botin politiikka lyhyesti

- Myy raakasadon ja ylimääräiset itiöt hintakynnykseen asti, pitää risteytykseen tarvittavat itiöt ja tilauksen tarvitsemat kalvoheltat.
- Pitää jokaista vielä tarvittavaa risteytyksen vanhempaa kasvamassa vähintään yhdessä astiassa (emokanta), ottaa siitä itiöt, kun varasto on alle 2.
- Ostaa hautomon heti laboratorion avauduttua, kehikon heti kalvoheltan jälkeen ja säästää niihin; muuten ostaa astian, jolla on paras tuotto hintaan nähden, jos ruutuja on vapaana. Toinen kehikko, jos kalvohelttaa kertyy. Kellari, kun huone on täynnä ja rahaa on.
- Kun kehikko on, vaihtaa astioita kalvohelttaan vain kehikon tarpeen verran.
- Retki: TP5:n rihmaretki (lyhyt aina kun voi, syvä kun suodattimia on yli tilauksen tarpeen); ilman sitä asetusten TESTILÖYTÖ kerran vuorokaudessa laboratorion jälkeen.

## Mittarit

- Virstanpylväät: ensimmäinen myynti, laboratorio, hautomo, ensimmäinen risteytys, kehikko, ensimmäinen suodatin, hoitajasieni, kellari, tilaus täytetty (keskiarvo, hajonta, min, mediaani, max).
- Ostot ja takaisinmaksu: aika ostosta siihen, kun ostoksen tuotanto toteutuneilla myyntihinnoilla kattaa hinnan. Suodatin arvotetaan tilauksen palkkiolla (300 / 5), josta puolet kehikolle ja puolet kalvohelttaa kasvattaneille astioille. Kellari: tila + sinne sijoitetut astiat. Lasketaan vain ajon loppuun, joten myöhäiset ostot jäävät maksamatta.
- Tuotteiden osuus myynnistä, keskihinnat.
- Käynnit: odottavat päätökset käynnin alussa (valmiit sadot ja laitteet, tyhjät astiat, käynnistettävät laitteet, myytävää, toimitus, sijoitettavaa), botin toimet per käynti, tyhjät käynnit.
- Umpikujat: jumissa-käynnit (mikään ei kasva eikä mitään voi tehdä), pelastusitiöt, käynnit, joilla risteytyksen vanhempaa ei ole itiöinä eikä kasvamassa, täyttämättömät tilaukset.
- Hopeakäyrä päivittäin.

## Rajoitukset

- Botti on yksi järkevä pelaaja, ei optimi. Luvut kertovat suunnan ja mittasuhteet; vertaa aina samalla botilla ennen ja jälkeen muutoksen.
- Käynnin aikana peli kulkee oikeassa ajassa (30 s välein), joten käynnin pituus vaikuttaa vain nopeisiin kasvuihin (ensimmäinen 60 s kasvu).
