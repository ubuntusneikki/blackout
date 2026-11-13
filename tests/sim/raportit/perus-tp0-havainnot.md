# Perusraportti: nykyinen talous (main + PR #6, KOTI-01 V1.1)

Ajo: `node tests/sim/run.js --profile kaikki --seeds 20 --out tests/sim/raportit --name perus-tp0`, nopeus ×1 (oikea aika). Täysi raportti: [perus-tp0.md](perus-tp0.md), data: perus-tp0.json. Ei tasapainomuutoksia tässä PR:ssä.

## Tilaus täytetty (mediaani, 20 siementä)

| Profiili | Tilaus | Kehikko | Laboratorio | Käyntejä | Rihmaretkellä (PR #8) |
|---|---|---|---|---|---|
| Aktiivinen (15 min) | 28 h (pv 2) | 10 h | 1,3 h | 82 | 28 h |
| 4/vrk | 4,6 vrk (pv 5) | 3,4 vrk | 28 h | 20 | 4,0 vrk |
| 2/vrk | 9,0 vrk (pv 10) | 6,0 vrk | 2,5 vrk | 19 | 8,0 vrk |

Tavoite on tilaus noin 6–8 päivässä profiililla 4/vrk. Nyt se tulee 4,6 päivässä, eli peli on liian nopea 4/vrk-pelaajalle ja aivan liian nopea aktiiviselle. 2/vrk-pelaajalle se on hieman yli tavoitteen.

## Havainnot

1. **Kasvuajat eivät merkitse 4/vrk- ja 2/vrk-pelaajalle.** Kannat kasvavat 7–20 minuutissa (×1), joten jokainen astia on valmis jokaisella käynnillä. Tuotanto = astioiden määrä × käyntien määrä. Kantojen erilaiset kasvuajat näkyvät vain aktiivisella pelaajalla. Satoaallot (TP3) korjaavat tätä vain, jos kasvuaika on lähellä käyntiväliä (tunteja, ei minuutteja).
2. **Aktiivinen pelaaja on 4× nopeampi kuin 4/vrk** (28 h vs 4,6 vrk). Jos 15 minuutin käynnit eivät saa olla ylivoimaisia, kasvuaikojen pitää olla tunteja ja tuotannon katon tulla satoaalloista eikä käyntitiheydestä.
3. **Kaikki raakasato on samanhintaista (2 H).** Kannan valintaan vaikuttaa vain sato ja astian sopivuus. Itiöpussi (4 H) on usein arvokkaampi kuin raakasato, joten OTA ITIÖT kannattaa myös myyntiin. Kantojen omat arvot (TP3) tarvitaan.
4. **Hopea ei kerry ennen tilausta.** 4/vrk-käyrä pysyy alle 80 hopean koko ajan (pv 1: 38, pv 2: 8, pv 3: 71, pv 4: 20), koska kaikki menee seuraavaan pakolliseen ostokseen. Kasvun tunne tulee vain astioiden määrästä. Tilauksen 300 H palkkio tuplaa kaikki siihen asti ansaitut tulot.
5. **Kellari ei ehdi peliin ennen tilausta** (4/vrk 2/20, 2/vrk 7/20 ajosta, aina tilauspäivänä). 300 H on tilauksen jälkeistä sisältöä nykyluvuilla.
6. **Kehikko on pullonkaula lopussa:** yksi suodatin per käyntiväli (2 h). 4/vrk tarvitsee 5 käyntiä kehikon jälkeen, 2/vrk 5 käyntiä eli 2,5 vrk. Toinen kehikko 120 H:lla ei yleensä ole varaa.
7. **Takaisinmaksu:** purkki noin 14 h (3–4 käyntiä 4/vrk:llä), kehikko 24 h. Hautomon 8 h kypsytys tarkoittaa yhtä risteytystä per käyntiväli 4/vrk:llä ja kahta päivässä 2/vrk:llä.
8. **Umpikujariski:** kontaminaatio (5 %) syö risteytyksen molemmat itiöt. Jos pelaaja ei pidä ruususientä kasvamassa, sen itiöt voivat loppua kokonaan, eikä `rescue()` auta (se antaa vain siniheltan). Botin varhainen versio jäi näin jumiin noin 6 vuorokaudeksi (aktiivinen, siemen 7), kunnes testilöytö toi ruususienen. Korjaus TP3:lle tai TP8:lle: pelastus myös risteytyksen vanhemmille tai ruususienen itiöt torille.
9. **Päätöksiä on 6–8 per käynti** ja botti tekee 13–17 toimintoa käynnillä (korjuu, sumutus, myynti, osto, sijoitus). Tyhjiä käyntejä ei ole. Sumutus on lähes joka käynnillä pakollinen, koska korjuu ei kostuta astiaa.
10. **Offline-katto 8 h** leikkaa 4/vrk:n 10 tunnin yöstä 2 h ja 2/vrk:n 12 tunnin väleistä 4 h. Nykyisillä kasvuajoilla sillä ei ole väliä, mutta tuntien kasvuajoilla on.

## Ehdotus TP3:n mitoitukseen (ei toteutettu)

- Kasvuajat tunneiksi (esim. siniheltta 3 h, ruususieni 6 h), satoaalto kasvuajan välein enintään 3. Silloin 4/vrk-pelaaja kerää 1–2 aaltoa käynnillä ja aktiivinen ei saa yli 2–3× etua.
- Raakasadon hinnat kannoittain niin, että arvo per ruutu per tunti on suunnilleen sama oikeassa astiassa.
- Tavoitteen 6–8 vrk saa todennäköisesti jo kasvuaikojen muutoksella. Tarkista ajamalla `node tests/sim/run.js --profile kaikki --seeds 20` ennen ja jälkeen.
