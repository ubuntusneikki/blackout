# Moodboard: biopunk-laboratorio (tyyliohje)

Tiivistelmä Juuson Pinterest-moodboardista (50 kuvaa, kansio `pinterest-biopunk`, 2026-11-12). Ohje **täydentää** hyväksyttyä kodin tyyliä (tyylitesti 3, `docs/grafiikka-koti.md`), ei korvaa sitä. Lukija on grafiikan atlas-työpaketti: alla on konkreettiset suositukset ja lopussa kohdat, joissa moodboard on ristiriidassa hyväksytyn tyylin kanssa. Ne odottavat Juuson päätöstä.

Avainkuvat ovat pienennettyinä kansiossa `docs/kuvat/moodboard/` (numero = moodboardin tiedostonumero). Paletit: `docs/kuvat/moodboard/paletit.png`.

| Kuva | Miksi se on mukana |
|---|---|
| `03_kasvihuone_dioraama` | Habbo-tyylinen isometrinen huone: tiheä, mutta luettava; lämmin vihreä hehku tummassa. |
| `09_teal_huone_leikkaus` | Yksivärinen teal-huone, valokaista ylhäältä, kerros ja portaat alas (malli huone + kellari). |
| `11_akvaario_poikkileikkaus` | Aukileikattu lasikuutio: lasin reunakorostus, vesi läpikuultava, pohja kerroksina. |
| `08_biosailio_laite` | Pikselitaiteena tehty elävä säiliölaite: lasisylinteri, sisällä hehkuva neste, valuma lattialle. |
| `27_kasvatussailiot` | Kasvatussäiliörivi: kuplat, kasvusto nesteessä, kupariputket tummalla teräksellä. |
| `30_hehkuvat_akvaariot` | Pimeä huone, jonka ainoa valo tulee säiliöistä. Valolammikot lattialla. |
| `37_labra_ylhaalta` | Sama aihe lämpimänä: hehkulamput, puupöytä, kolvi meripihkanesteellä. |
| `45_violetti_biolabra` | Violetti/UV-valaistu kasvilabra, ritilälattia, hehkuvat kasvit. |
| `47_villi_violetti_dioraama` | Kylmän violetti, villi kasvusto, joka valtaa rakenteen. Malli villille rihmastolle. |
| `14_pikselisienet` | Pikselisienet: sävyramppi, kiiltopisteet, pisarat, siluetti pienessä koossa. |
| `15_kantojen_hehkuvarit` | Jokaisella kasvilla oma värikoodi ja oma siluetti; hehku kärjissä. |

## 1. Moodboard lyhyesti

Kuvat jakautuvat viiteen ryhmään:

1. **Isometriset dioraamat ja huoneet** (03, 09, 17, 26, 28, 29, 31, 33, 35, 46, 50): aukileikattu kuutio, paksu pohjalaatta, tiheästi esineitä, yksi lämmin valonlähde.
2. **Hehkuvat säiliöt ja laboratoriot** (04/22, 08, 27, 30, 37, 45): lasisylinterit ja akvaariot ovat huoneen valonlähde.
3. **Sienet ja kasvit konseptina** (02, 07, 12, 14, 15, 32, 40, 42): selkeä siluetti, oma väri, hehkuvat kärjet, korallimaiset ja kerroksiset muodot.
4. **Luonto valtaa kaupungin** (01, 10, 18, 23, 24, 25, 36, 38, 39, 44, 48, 49): ruoste, betoni, sammal, köynnökset. Tämä on ulkomaailman tunnelmaa.
5. **Muut tunnelmakuvat** (05, 06, 13, 16, 19, 20, 21, 34, 41): kotoisa sotku, kojut, hyllyt täynnä esineitä.

Yhteinen henki: **pimeä ja viileä tila, jonka valo tulee elävästä asiasta** (säiliöstä, kasvista, sienestä), ja sitä vastaan yksi lämmin ihmisen valo (lamppu, ovi, ikkuna).

## 2. Värimaailma ja paletit

Mitattu avainkuvista (mediaanileikkaus 8 väriin):

- **Pohja** on lähes musta, viileä sininen tai teal: `#0b1622`, `#1f262c`, `#012a26` (09), `#24203f` (45). Pohja vie 50–70 % kuvasta.
- **Hehku** on aina kylläisin väri, ja sitä on vähän (10–15 %): teal `#31b293 / #93d7a8` (30), syaani `#2fc6d7` (11), myrkynvihreä `#52d26f / #bddb54` (27, 08), UV-violetti (45).
- **Lämmin vastaväri**: kupariputket `#a8602f`, hehkulamppu `#ffcf7a`, meripihkaneste (37). Lämpimiä pintoja on vähän, mutta ne ovat lähellä katsojaa.

Ehdotetut paletit (`paletit.png`). Kaikki paitsi villin violetin ja myrkynvihreän ääripäät löytyvät jo `pix.py`:n `PAL`-listasta tai ovat sen lähellä:

| Paletti | Värit | Käyttö |
|---|---|---|
| Labran pohja | `#0b1018 #141c28 #1f262c #23303a #2e393e #405853 #4f7d86` | Seinät, lattia, teräs, paneelit, jalustat. |
| Kasvatusneste ja lasi | `#103540 #1d6a78 #31b293 #5fc7d0 #93d7a8 #e8fff0` | Lasin heijastus, kosteus, ravinneputkien neste, hautomon merkkivalo. |
| Lämmin vastavalo | `#45301f #6a4a30 #a8602f #d99a5b #ffcf7a #fff0c0` | Valolista, lamppu, kupari, ovi. Meripihka on edelleen "tee tämä nyt". |
| Villi rihmasto | `#130f24 #24203f #3a1f5a #4e628e #8a4ad0 #d6b0ff` | Villi rihmasto, ikkunan takainen yö, vieraat näytteet. |
| Moodboardin myrkynvihreä | `#1f3a22 #318c59 #52d26f #bddb54 #e8f5a0` | **Ei käyttöön ilman päätöstä**, ks. ristiriita A. |

Sääntö, joka toistuu kaikissa hyvissä kuvissa: **yksi kylläinen hehkuväri esinettä kohden**, kaikki muu sammutettua. Kantojen värit (siniheltta, ruususieni, hämäränuppi, hoitajasieni) ovat nämä hehkuvärit, joten huoneen kalusteet pidetään sammutettuina.

## 3. Valaistus

- **Elävä valonlähde.** Säiliö, sieni tai kalvo valaisee ympäristöään (30, 27, 45). Peli: hehkuva sieni tai kalvo heittää lattialle pehmeän **valolammikon** kannan värillä. Tee se koodilla (lisäävä sekoitus, 2–3 pistekuvioitua kehää), ei renderöintiin, jotta se seuraa elinvoimaa ja sammuu, kun astia kuivuu.
- **Yksi lämmin valo.** Valolista tai lamppu antaa huoneelle "kotia" (03, 33, 37). Hyväksytty tyyli (lämmin päävalo vasemmalta ylhäältä) on tämän mukainen: pidä se.
- **Valokaista ylhäältä** (09): vino vaalea kaista ikkunasta lattialle on halpa ja tehokas tunnelma. Sopii hyväksyttyyn syvään ikkunakarmiin (hämärä valo, ei maisemaa).
- **Lasin reunavalo.** Lasissa on aina 1–2 px kirkas pystykaistale valon puolella ja tumma reuna varjon puolella (11, 27, 30). Sisältö näkyy hieman vaalennettuna ja lasin värillä sävytettynä.
- Ei auringonvaloa, ei siniharmaata päivänvaloa. Valo on aina joko lämmintä ihmisvaloa tai elävää hehkua.

## 4. Materiaalit

| Materiaali | Miten se tehdään pikseleinä | Missä |
|---|---|---|
| Lasi | Läpikuultava, kirkas reunakorostus, 1 px heijastusviiva kulmassa, takalasi tummempi kuin etulasi. | Terraario, lasipurkki, hautomon luukku |
| Neste | Kuplat 1–2 px pisteinä nousevassa jonossa, pinnan viiva kirkkaampi. Animaatio koodilla. | Ravinneputket, maljat, hautomo |
| Tumma teräs ja paneelit | 2–3 sävyä, paneelien saumat 1 px tummempi viiva, niittejä tai ruuveja säästeliäästi. | Seinät, jalustat, hautomon runko |
| Kupari | Lämmin putki, kirkas kiiltopiste, punainen tai meripihka venttiilikahva (08, 27). | Putket seinillä, liitokset |
| Ritilä | Säännöllinen 2 px kuvio, alla pimeää (27, 45). | Kellarin lattia tai laboratorioalue |
| Elävä kalvo | Puolikirkas, verkkomainen, reunoilta hehkuva (02:n kerroksiset levyt). | Kehikko, itiösuodatin |
| Sammal ja rihmasto | Pehmeät möykyt, 2–3 vihreää tai violettia sävyä, ei teräviä reunoja. | Kellarin nurkat, villi rihmasto |

## 5. Muotokieli

- **Sylinteri ja kapseli.** Laboratorion tärkein muoto on pystysylinteri, jossa on tumma kansi ja jalusta (08, 27, 30). Lasi on keskellä ja hehkuu, metalli ylhäällä ja alhaalla on tumma. Tämä antaa jokaiselle astialle saman tunnistettavan rakenteen: **tumma kehys, hehkuva elävä sisus**.
- **Aukileikattu dioraama.** Huone on kuutio, josta kaksi seinää on poistettu, ja sen alla näkyy paksu pohjalaatta (03, 09, 11, 26). Pohjalaatan reunaan voi piirtää kerroksia (lattia, putket, maa).
- **Sävytetyt ääriviivat.** Moodboardin pikselitaiteessa (03, 08, 14, 42) ääriviiva on kohteen oman värin tummin sävy, ei musta, ja valon puolella ääriviiva on vaaleampi (selout). Nykyinen `pix.py` piirtää ulkoreunan värillä `#0b1018` ja tummentaa sisäreunat kertoimella 0,6. Se on lähellä tätä: ulkoreuna kannattaa vaihtaa sävytetyksi vain sienille (ks. kohta 6).
- **Tiheys ilman sotkua.** Hyvät huoneet (03, 09) ovat täynnä pieniä esineitä, mutta jokaisella on selvä siluetti ja kalusteet ovat sammutettuja. Koristeesineet eivät saa kilpailla hehkusta.
- **Orgaaninen vastaan suora.** Rakenteet ovat suoria ja kulmikkaita, elävä on pyöreää, kerroksista ja haarautuvaa (02, 15, 40). Tämä kontrasti kertoo heti, mikä on elävää.

## 6. Sienet

Pikselisienet (14, 42) ja konseptit (02, 12, 15, 40) antavat nämä säännöt:

- **Siluetti ensin.** Jokaisella kannalla on oma, mustana tunnistettava muoto. Kaksi samaa lakkimuotoa eri värisenä ei riitä.
- **Sävyramppi 4 askelta + hehku.** Tumma varsi, keskisävy, vaalea lakki, ja kirkkain hehkuväri vain kärjissä tai heltoissa (15). Varsi on tumma, kärki kirkas: bioluminesenssi kasvaa tyvestä kärkeen.
- **Yksi tunnistettava yksityiskohta** (14, 07): pisarat, täplät, roikkuvat reunat tai valkoinen kiiltopiste lakissa.
- **Hehku valuu ympäristöön** (08:n valuma): kypsän sienen alle tai astian pohjalle 1–2 px kannan värinen hehku.

Suositukset kannoittain (värit CLAUDE.md:n paletista):

| Kanta | Muoto | Tunnistettava yksityiskohta | Viite |
|---|---|---|---|
| Siniheltta | Ryhmä ohuita varsia, matalat lakit | Heltat hehkuvat alapuolelta, syaanit kärjet | 15 (keskirivin teal-ryhmä), 14 ylin |
| Ruususieni | Yksi pullea lakki, paksu varsi | Kultaiset tai vaaleanpunaiset pisarat lakissa | 14 toinen, 42 alavasen |
| Hämäränuppi | Pallomainen nuppu, lyhyt varsi | Läpikuultava kuori, jonka sisällä valopiste | 40 (violetit kuplat), 12 |
| Kalvoheltta | Kerroksiset levyt tai verkko | Levyjen reunat hehkuvat, välissä ohut kalvo | 02 (kerroksiset levyt ja korallit) |
| Hoitajasieni | Pitkä ja ohut, rihmat sivuille | Vaaleat rihmat kurottavat naapuriruutuihin, kärjissä pisara | 15 (alarivin vaalea ryhmä), 02 korallit |

Kasvuvaiheet (`itu`, `nuori`, `kypsa`) erottuvat koon lisäksi hehkun määrällä: itu on lähes hehkuton, ja kypsässä hehkuu koko lakki.

## 7. Mitä sovelletaan kotipeliin

**Laboratorio (huone ja kellari)**
- Pidä hyväksytty perusta: tummat teräs- ja paneelipinnat, lämmin valolista ja ravinneputket.
- Lisää moodboardista: ravinneputkiin näkyvä neste ja kuplat (27), yksi kupariputki ja venttiili lämpimäksi vastaväriksi, sekä valokaista ikkunasta lattialle (09).
- Kellari on viileämpi ja tummempi, ja siinä on ritilälattia (27, 45). Villin rihmaston violetti saa näkyä vain kellarin nurkissa tai seinän raoista (47), jos ristiriita D ratkeaa niin.

**Astiat**
- Kaikki astiat noudattavat kaavaa *tumma jalusta, lasi, tumma kansi tai kehys*. Lasin takaosa (`astia_x`) ja etukulma (`astia_x_etu`) saavat reunakorostuksen kohdan 3 mukaan.
- Lasipurkki: matala sylinteri, metallikansi. Terraario: suorakulmainen lasikuutio teräskehyksellä (kuten tyylitesti 3). Lasin sävy on hyvin hillitty teal, jotta kannan väri näkyy sen läpi oikein.
- Astia ei hehku itse. Hehku tulee sienestä, ja astian elinvoima näkyy sen kautta.

**Laitteet (elävinä kasvatuspisteinä, ei koneina)**
- **Hautomo:** terraarion sukulainen, sylinteri tai kaappi, jonka lasiluukun takana maljat. Tila näkyy maljojen hehkusta: tyhjä = tumma, käynnissä = himmeä kannan väri, valmis = meripihka.
- **Kehikko:** pystykehys (tumma teräs), johon elävä kalvo kasvaa. Kalvo on puolikirkas ja hehkuu reunoiltaan. Kasvuvaiheet: kehys tyhjä → rihmaa kulmissa → verkko → umpinainen hehkuva kalvo.
- **Malja (kuvake ja hautomon sisältö):** pyöreä, kannen alla pesäke, jonka väri kertoo kannan.

**Käyttöliittymä**
- Kuvakkeet 16–24 px: sama sävyramppi ja sävytetty ääriviiva kuin sienissä, yksi hehkuväri.

## 8. Ristiriidat hyväksytyn tyylin kanssa (kysymykset Juusolle)

**A. Myrkynvihreä hehku.** Moodboardin säiliöt (08, 27) hehkuvat kirkkaan myrkynvihreinä. Hyväksytyssä tyylissä hehku on kannan väri ja meripihka tarkoittaa "tee tämä nyt", eikä myrkynvihreä ole kenenkään kannan väri. Lisäksi se sekoittuisi hoitajasienen vaaleanvihreään.
*Kysymys:* Jätetäänkö myrkynvihreä pois ja käytetään säiliöissä ja putkissa hillittyä teal-nestettä? (Suositus: kyllä.)

**B. Koristehehku ja "hehku = pelattavaa".** Moodboardissa hehkuvat näytöt, kyltit, LED-listat ja neonit. Sääntömme mukaan vain asiat, joihin voi tarttua, hehkuvat.
*Kysymys:* Sallitaanko himmeä, ei-pelattava tunnelmahehku (esim. ravinneputken neste, valolista), kunhan se on selvästi himmeämpi kuin pelattavat asiat? (Suositus: kyllä, mutta korkeintaan keskisävy, ei koskaan kirkkain sävy.)

**C. Näytöt, tekstikyltit ja konsolit.** Moodboardin laboratorioissa (27, 45, 06) on paljon tietokoneita, näyttöjä ja kylttejä ("TANK 03: ACTIVE"). Periaatteemme mukaan ei koneita eikä tehtaita, vaan elävää kasvatusta.
*Kysymys:* Jätetäänkö näytöt ja kyltit kokonaan pois ja kerrotaan tila vain elävillä merkeillä (hehku, nesteen väri, kalvon kasvu)? (Suositus: kyllä. Korkeintaan yksi pieni käsinkirjoitettu lappu tai muistiinpano tunnelmaksi.)

**D. Rappio ja villi violetti kotona.** Puolet moodboardista on ruostetta, sammalta ja luonnon valtaamaa kaupunkia. Hyväksytty koti on siisti ja futuristinen, eikä tyylitesti 3:ssa ole rihmastoa seinillä. CLAUDE.md:n uusi värikieli sanoo, että villi rihmasto on kylmä violetti ja koti lämmin.
*Kysymys:* Saako villi violetti rihmasto näkyä kotona edes kellarin nurkissa (uhka ja tunnelma), vai pidetäänkö koti täysin siistinä ja villi rihmasto vain ikkunan takana? (Suositus: kellarissa pieni määrä, huone siisti.)

**E. Huone ja kellari samassa dioraamassa.** Moodboardin dioraamoissa (09, 11) kerrokset näkyvät päällekkäin leikkauksena. Nykyinen suunnitelma käsittelee huonetta ja kellaria erillisinä tiloina.
*Kysymys:* Kokeillaanko näkymää, jossa kellari näkyy huoneen alla samassa aukileikatussa kuutiossa (portaat alas kuten 09)? Se näyttäisi upealta, mutta kangas kasvaa korkeammaksi. (Suositus: ei v1:ssä, erilliset tilat riittävät. Muistiin myöhemmäksi.)

## Lähteet

Kuvat ovat Juuson Pinterest-kokoelmasta ja muiden tekijöiden töitä (näkyvät signeeraukset mm. Molt (03), nashor_kim (08), JOSAQ (09, 31, 35), Rappenem (07), David Puerta (26), New World -konseptitaide (15), Redfall-konseptitaide (02), Paladins/Evil Mojo (32), pixpilgames (16), abueloretrowave (01)). Repoon on otettu vain pienennetyt viitekuvat tyylin dokumentointia varten. Niitä ei käytetä peligrafiikkana eikä niistä kopioida mitään sellaisenaan.
