// tapahtumaväylä: pelilogiikka kertoo mitä tapahtui, käyttöliittymä, äänet ja efektit kuuntelevat.
// Tapahtuman data voi sisältää kentät viesti (näytetään paneelissa) ja vihje (symbiontin lyhyt vihje).
// Tapahtumat: istutus, korjuu, itiot, sumutus, komposti, sijoitus, siirto, malja-alku, malja-auki,
// laite-alku, laite-valmis, laite-keruu, myynti, osto, avaus, kysyntapiikki, tilaus-uusi, toimitus,
// tilaus-valmis, pelastus, testiloyto.
// TP3: kypsyi {astia,kanta,aalto}, horros/herasi {astia}, virhe {syy,viesti}, virstanpylvas {nimi,palkkio},
// paluu {poissa, w, dev}. Torin taulun tilaukset käyttävät tilaus-uusi / tilaus-valmis kentällä lahde:'taulu'
// (torin väen suodatintilaus: lahde:'torin vaki'). Kehikko: laite-alku / laite-keruu {resepti, tuote, n}.
const L = {};
export function on(name, fn){ (L[name] = L[name] || []).push(fn); return () => { L[name] = L[name].filter(f => f !== fn); }; }
export function emit(name, data){
  data = data || {};
  for (const fn of (L[name] || [])) fn(data, name);
  for (const fn of (L['*'] || [])) fn(data, name);
}
