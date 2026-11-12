# Kotipelin grafiikka v1

Tämä ohje kertoo, miten kotipelin grafiikka tehdään ja miten se liitetään peliin. Grafiikkatyö ja pelimekaniikka voivat edetä rinnakkain: mekaniikka tehdään ensin paikkamerkeillä, ja grafiikka vaihdetaan tilalle, kun spritet ovat valmiit. Liitäntä niiden välillä on alla määritelty **sprite-atlas**.

## Tyylin lähteet

- `docs/kuvat/huone_tyylitesti.png`: isometrinen huone, valaistus ja kolme elinvoimatasoa. Tämä on kotipelin päätyyli.
- `docs/kuvat/katupakkaus_tyylilevy.png` ja `docs/kuvat/katukulma_vertailu.png`: materiaalit (ruoste, patina, sammal), ääriviivat ja paletti.
- `docs/kuvat/terraario_tyylikuva.png`: poikkileikkausnäkymä (2D, piirretty koodilla).
- Moodboardin henki sanoin: isometriset aukileikatut pikselidioraamat, hehkuvat lasisäiliöt ja akvaariot, lämmin sisävalo tummassa ja viileässä ympäristössä, sammaloitunut rappio, kupariputket.
- Muista Suunta (docs/kotipeli-v1.md): sienet ovat eläviä. Laboratorio näyttää kasvatukselta ja biologialta, ei tehtaalta.

## Tekniset säännöt

- **Kamera:** ortografinen isometrinen, kierto `(60°, 0, 45°)`, kuten `blender/room.py` ja `blender/kit.py`.
- **Mittakaava:** **30 px/m** kaikille kodin spriteille. Huoneen ruutu on 1 m × 1 m, joten 4×4-huone on noin 170 px leveä ja mahtuu 192 px näkymään.
  - Toteutus (`blender/koti.py`): ruutu on tasan **44 × 22 px** (≈31 px/m), jotta ruutujen ankkurit osuvat kokonaislukupikseleihin. Ruudun (c, r) ankkuri on huoneen ankkurista (22·(c−r), 11·(c+r−3)) px; c kulkee takaseinää pitkin vasemmalta oikealle, r takaa eteen. 4×4-huone on 176 px leveä.
  - Astiat renderöidään kahtena kerroksena: `astia_x` (jalusta, multa, takalasit) ja `astia_x_etu` (etukulman kehys), ja sieni piirretään niiden väliin.
- **Renderöinti:** Cycles CPU, `filter_width = 0.01`, väri + ID-kerros, jälkikäsittely `blender/pix.py`:llä (paletti, ääriviivat, pistekuviointi). Läpinäkyvä tausta.
- **Valaistus:** sama kaikissa spriteissä, jotta ne sopivat yhteen: lämmin päävalo vasemmalta ylhäältä ja viileä täyttövalo kamerasta päin. Emissiiviset osat (sienet, LEDit) hehkuvat itse.
- **Ei animaatiota renderöintinä.** Hehkun sykintä, itiöt, pisarat ja purkaukset tehdään pelissä koodilla (kuten nyt).
- **Elinvoima tehdään pelissä:** spritet renderöidään täysin värein. Peli laskee haalistetut versiot `vital()`-kaavalla ja tallentaa ne välimuistiin (esim. 6 tasoa: 0, 0,2 … 1).

## Asset-lista v1

**Tilat (taustakuvat, sisältävät lattian ruudukon):**
- `huone`: 4×4, puulattia, kaksi tiiliseinää, ikkuna iltakaupunkiin, ovi kellariin, kupariputki seinällä.
- `kellari`: 4×3, betoni- tai kivilattia, kostea tiiliseinä, putket, vedenvaluma, sammalta nurkissa, viileämpi valo.

**Astiat (yksi ruutu, renderöidään tyhjinä):**
- `lasipurkki`, `terraario`. Myöhemmin `akvaario` ja `palvelinkaappi` (ulkolöydöt).

**Sienet (päällekkäiset spritet, sijoitetaan astian sisälle ankkuripisteeseen):**
- Kannat: siniheltta, ruususieni, hämäränuppi, kalvoheltta, hoitajasieni.
- Jokaisesta 3 kasvuvaihetta: `itu`, `nuori`, `kypsa`. Mutaatio ja horros tehdään pelissä (kultainen hohde ja elinvoima).
- Kalvoheltta on verkkomainen ja kalvomainen, hoitajasieni pitkä ja ohut, ja sen rihmat kurottavat sivuille.

**Laboratorio ja laitteet (yksi ruutu):**
- `hautomo`: lämmin, lasiluukullinen kaappi, sisällä maljoja, merivihreä merkkivalo. Tilat: `tyhja`, `kaynnissa`, `valmis` (meripihka).
- `kuivausteline`: puinen ritilä, jolla sieniä. Tilat: `tyhja`, `kaynnissa`, `valmis`.
- `kehikko`: pystykehys, johon kalvo kasvaa. Tilat: `tyhja`, `kasvaa_1`, `kasvaa_2`, `valmis` (hehkuva elävä kalvo).

**Kuvakkeet (16×16 tai 24×24, käyttöliittymään):**
- Hopea, itiöpussi (yksi per kanta, kannan värinen), agar-malja, raaka sato (per kanta), kuivattu sieni, itiösuodatin, villi näyte.

## Sprite-atlas: liitäntä grafiikan ja pelin välillä

Blender-skripti tuottaa kansion `koti/gfx/`:

```
koti/gfx/atlas.png      kaikki spritet yhdessä kuvassa
koti/gfx/atlas.json     { "nimi": { "x":0, "y":0, "w":32, "h":40, "ax":16, "ay":36 } }
```

- `ax, ay` = ankkuripiste: ruudun keskipiste lattiatasolla. Peli piirtää spriten niin, että ankkuri osuu ruudun keskelle.
- Sienispriteillä ankkuri on rungon tyvi, ja jokaisella astialla on `json`:issa lisäksi `plant: {x, y}` eli kohta, johon sieni piirretään.
- Nimeäminen: `astia_terraario`, `sieni_heltta_kypsa`, `laite_hautomo_valmis`, `tila_huone`, `ikoni_hopea`.
- Piirtojärjestys pelissä: syvyys = ruudun `x + y`, pienin ensin.
- Paikkamerkit: kunnes atlas on valmis, peli piirtää samankokoiset värilaatikot samoilla nimillä. Kun `atlas.json` löytyy, peli käyttää sitä automaattisesti.

## Työjärjestys

1. **Tyylitesti:** renderöi huone sekä terraario, siniheltta (kypsä) ja hautomo samaan kuvaan pelin mittakaavassa. Näytä Juusolle ennen kuin jatkat.
2. **Koko v1-setti** listan mukaan, atlas ja `atlas.json`.
3. **Esikatselukuva** `docs/kuvat/koti_v1_atlas.png`: kaikki spritet nimettyinä ja yksi koottu esimerkkihuone.
4. **Integraatio peliin** (proto-säie): isometrinen ruudukko, piirtojärjestys, elinvoimavälimuisti, hehku ja purkaukset koodilla.

Tarkista jokainen vaihe kuvakaappauksella. Pienellä resoluutiolla luettavuus on tärkeintä: siluetin pitää erottua, ja jokaisella esineellä on hyvä olla yksi selvä tunnistettava yksityiskohta.
