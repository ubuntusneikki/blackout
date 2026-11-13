// Pelaajaprofiilit: käyntien kellonajat (tunteina vuorokauden alusta).
// Peli alkaa ensimmäisen päivän ensimmäisellä käynnillä.
const range = (a, b, step) => { const out = []; for (let h = a; h < b - 1e-9; h += step) out.push(h); return out; };

export const PROFILES = {
  aktiivinen: { name: 'AKTIIVINEN', desc: 'käynti 15 min välein klo 8–24', hours: range(8, 24, 0.25), visitMin: 2 },
  '4':        { name: '4/VRK',      desc: 'käynnit klo 8, 12, 17, 22',       hours: [8, 12, 17, 22],   visitMin: 3 },
  '2':        { name: '2/VRK',      desc: 'käynnit klo 8 ja 20',             hours: [8, 20],           visitMin: 4 }
};
export const PROFILE_ALIASES = { a: 'aktiivinen', active: 'aktiivinen', '15': 'aktiivinen', '4/vrk': '4', '2/vrk': '2' };

// Palauttaa käyntien alkuhetket sekunteina pelin alusta (ensimmäinen käynti = 0).
export function visitTimes(profile, days){
  const h = profile.hours, t0 = h[0] * 3600, out = [];
  for (let d = 0; d < days; d++) for (const x of h) out.push(d * 86400 + x * 3600 - t0);
  return out;
}
