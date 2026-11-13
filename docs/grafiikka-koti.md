# Kotipelin grafiikka v1

Tämä ohje kertoo, miten kotipelin grafiikka tehdään ja miten se liitetään peliin. Grafiikkatyö ja pelimekaniikka voivat edetä rinnakkain: mekaniikka tehdään ensin paikkamerkeillä, ja grafiikka vaihdetaan tilalle, kun spritet ovat valmiit. Liitäntä niiden välillä on alla määritelty **sprite-atlas**.

## Tyylin lähteet

- `docs/kuvat/huone_tyylitesti.png`: isometrinen huone, valaistus ja kolme elinvoimatasoa.
- `docs/kuvat/koti_tyylitesti.png` (tyylitesti 2): futuristisempi biopunk-laboratorio Juuson palautteen mukaan: tummat teräs- ja paneelipinnat, laattalattia, lämmin valolista, ravinneputket, köynnökset ja nurkasta seinille kasvava rihmasto. Tyylitesti 3: hautomo terraarion tyyliin (teräsjalusta, tummat paneelit, teräskehys), ikkunassa syvä teräskarmi eikä maisemaa, vain hämärä valo, ei ikkunalautaa eikä rihmastoa seinillä.
- `docs/kuvat/katupakkaus_tyylilevy.png` ja `docs/kuvat/katukulma_vertailu.png`: materiaalit (ruoste, patina, sammal), ääriviivat ja paletti.
- `docs/kuvat/terraario_tyylikuva.png`: poikkileikkausnäkymä (2D, piirretty koodilla).
- Moodboardin henki sanoin: isometriset aukileikatut pikselidioraamat, hehkuvat lasisäiliöt ja akvaariot, lämmin sisävalo tummassa ja viileässä ympäristössä, sammaloitunut rappio, kupariputket.
- Muista Suunta (docs/kotipeli-v1.md): sienet ovat eläviä. Laboratorio näyttää kasvatukselta ja biologialta, ei tehtaalta.

## Tekniset säännöt

- **Kamera:** ortografinen isometrinen, kierto `(60°, 0, 45°)`, kuten `blender/room.py` ja `blender/kit.py`.
- **Mittakaava:** **30 px/m** kaikille kodin spriteille. Huoneen ruutu on 1 m × 1 m, joten 4×4-huone on noin 170 px leveä ja mahtuu 192 px näkymään.
  - Toteutus (`blender/koti.py`, tyylitesti 2): Juuson palautteesta tarkkuus tuplattiin. Ruutu on tasan **88 × 44 px** (≈62 px/m), ja 4×4-huone on 352 px leveä (kangas 384 px). Ruudun (c, r) ankkuri on huoneen ankkurista (44·(c−r), 22·(c+r−3)) px; c kulkee takaseinää pitkin vasemmalta oikealle, r takaa eteen. Ankkurit kirjoitetaan `koti.json`-tiedostoon.
  - Astiat renderöidään kahtena kerroksena: `astia_x` (jalusta, multa, takalasit) ja `astia_x_etu` (etukulman kehys), ja sieni piirretään niiden väliin.
- **Renderöinti:** Cycles CPU, `filter_width = 0.01`, väri + ID-kerros, jälkikäsittely `blender/pix.py`:llä (paletti, ääriviivat, pistekuviointi). Läpinäkyvä tausta.
- **Valaistus:** sama kaikissa spriteissä, jotta ne sopivat yhteen: lämmin päävalo vasemmalta ylhäältä ja viileä täyttövalo kamerasta päin. Emissiiviset osat (sienet, LEDit) hehkuvat itse.
- **Ei animaatiota renderöintinä.** Hehkun sykintä, itiöt, pisarat ja purkaukset tehdään pelissä koodilla (kuten nyt).
- **Elinvoima tehdään pelissä:** spritet renderöidään täysin värein. Peli laskee haalistetut versiot `vital()`-kaavalla ja tallentaa ne välimuistiin (esim. 6 tasoa: 0, 0,2 … 1).

## Asset-lista v1 (toteutettu, `blender/koti.py`)

Muutokset alkuperäiseen listaan (prototyypin loppusuunnitelma 2026-11-13): kuivausteline poistettu, kehikko on yleinen kasvatusmuotti kolmelle tuotteelle, huoneen ovesta lähtee rihmaretki.

**Tilat** (taustakuvat, sisältävät lattian ruudukon):
- `tila_huone` 4×4: laattalattia, paneeliseinät, lämmin valolista, ravinneputket, tuuletin, syvä ikkuna hämärään. Vasemman seinän liukuovesta symbiontin rihma kurottaa ulos (rihmaretki), lattialla muutama hehkuva säie.
- `tila_kellari` 4×3: betonilattia ja lattiakaivo, kosteat betoniseinät, paksut putket ja tippuva vesi, lammikko, tikkaat ylös, häkkivalaisin, sammalta nurkissa, viileämpi valo.

**Astiat** (yksi ruutu, kaksi kerrosta, sieni piirretään väliin):
- `astia_terraario` + `astia_terraario_etu`, `astia_lasipurkki` + `astia_lasipurkki_etu` (lasilieriö teräsjalustalla).
- Harvinaiset löydöt: `astia_akvaario` + `_etu` (matala allas, sieni kivisaarekkeella veden yläpuolella) ja `astia_palvelin` + `_etu` (ruostunut räkkikaappi, sieni keskihyllyn mullassa, ei näyttöjä eikä valoja).

**Sienet** `sieni_<kanta>_<itu|nuori|kypsa>`, kannat `heltta` (siniheltta), `ruusu` (ruususieni), `hamara` (hämäränuppi), `kalvo` (kalvoheltta, verkkomainen kalvohame), `hoitaja` (hoitajasieni, sivuille kurottavat rihmat ja sumupisarat), `yoruusu` (yöruusu, ruususienen rypäsmuoto omin värein) ja `verkko` (verkkoheltta, kalvoheltan verkkomuoto omin värein). Kypsä sieni mahtuu molempiin astioihin. Uusien kantojen ja hoitajasienen värit on lisätty `pix.py`:n palettiin (rivi 6).

**Laitteet** (yksi ruutu):
- `laite_hautomo_<tyhja|kaynnissa|valmis>`.
- `laite_kehikko_tyhja` ja `laite_kehikko_<tuote>_<kasvaa_1|kasvaa_2|valmis>`, tuotteet `valokalvo` (siniheltasta, elävä valaisin), `lamporihma` (ruususienestä), `suodatin` (itiösuodatin, kalvoheltasta). Kasvusto täyttää kehyksen alhaalta ylös; valmis = meripihkainen merkkivalo.

**Kuvakkeet** 32×32: `ikoni_hopea`, `ikoni_agar`, `ikoni_villi`, `ikoni_itio_<kanta>` (itiöampulli), `ikoni_sato_<kanta>`, `ikoni_<tuote>`.

**Moodboard-päätökset** (`docs/moodboard-biopunk.md`, Juuso 2026-11-13) on otettu atlakseen: ei näyttöjä, konsoleita eikä kylttejä (jalustoissa ravinnenesteen ikkuna, tila näkyy teal- tai meripihkaisesta itiökuplasta ja maljojen väristä), ei myrkynvihreää (merkkivalot ja putkien neste hillittyä tealia), valolista keskisävyssä, villiä violettia rihmastoa vähän kellarin takanurkassa ja seinän raossa, huone pysyy siistinä. Hautomo: tyhjä = tumma, käynnissä = maljoissa himmeät kantojen värit, valmis = meripihka.

**Uuden kannan lisääminen:** lisää värit `STRAIN`-taulukkoon ja rivi `KANNAT`-taulukkoon (nimi ja muotofunktio; muodon voi lainata toiselta kannalta tai kirjoittaa uuden `muoto_*`-funktion). Spritet, kuvakkeet ja atlas-merkinnät syntyvät automaattisesti. Uusi kehikkotuote lisätään samoin `TUOTTEET`-taulukkoon ja `membrane()`-funktioon.

## Sprite-atlas: liitäntä grafiikan ja pelin välillä

```
cd blender
python3 koti.py -- /tmp/koti                 # renderöi kaikki (noin 40 s); valinnaisesti nimet tai *-kuviot
python3 koti_atlas.py /tmp/koti ../koti/gfx ../docs/kuvat/koti_v1_atlas.png
```

Tulos:

```
koti/gfx/atlas.png      kaikki spritet yhdessä kuvassa (pix.py:n paletti ja ääriviivat valmiina)
koti/gfx/atlas.json     { "meta": {...}, "sprites": { "nimi": { "x", "y", "w", "h", "ax", "ay", ["plant": {"x", "y"}] } } }
```

- `ax, ay` = ankkuri spriten vasemmasta yläkulmasta: ruudun keskipiste lattiatasolla (sienillä tyvi, kuvakkeilla keskipiste). Peli piirtää spriten niin, että ankkuri osuu ruudun keskelle.
- Astioilla `plant` = kohta, johon sienen ankkuri piirretään. Piirtojärjestys yhdessä ruudussa: `astia_x`, sieni, `astia_x_etu`.
- `meta.rooms[tila]`: `tile0` = ruudun (0, 0) ankkuri tilan ankkurista, `dc` ja `dr` = siirtymä yhden sarakkeen ja rivin verran. Ruudun (c, r) ankkuri = tilan ankkuri + tile0 + c·dc + r·dr. Piirtojärjestys: c + r, pienin ensin.
- `meta.kannat` ja `meta.tuotteet` kertovat pelinäkyvät nimet.
- Paikkamerkit: kunnes peli lukee atlaksen, se voi piirtää samankokoiset värilaatikot samoilla nimillä.

## Työjärjestys

1. ~~**Tyylitesti:** renderöi huone sekä terraario, siniheltta (kypsä) ja hautomo samaan kuvaan pelin mittakaavassa. Näytä Juusolle ennen kuin jatkat.~~ Tehty (tyylitesti 3 hyväksytty).
2. ~~**Koko v1-setti** listan mukaan, atlas ja `atlas.json`.~~ Tehty.
3. ~~**Esikatselukuva** `docs/kuvat/koti_v1_atlas.png`.~~ Tehty (huone ja kellari koottuina).
4. **Integraatio peliin** (proto-säie): isometrinen ruudukko, piirtojärjestys, elinvoimavälimuisti, hehku ja purkaukset koodilla.

Tarkista jokainen vaihe kuvakaappauksella. Pienellä resoluutiolla luettavuus on tärkeintä: siluetin pitää erottua, ja jokaisella esineellä on hyvä olla yksi selvä tunnistettava yksityiskohta.
