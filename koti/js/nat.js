// TP7: piirto natiiveissa 384×672-koordinaateissa. gfx.js:n käyttöliittymäkoordinaatit ovat loogisia
// (192×336, puskuri ×2); paljastus, kantakirja ja nimeäminen on piirretty suoraan natiivipikseleinä,
// joten nämä ohuet kääreet jakavat koordinaatit kahdella. Nimet ovat samat kuin gfx.js:ssä.
import * as G from './gfx.js';
export const N = G.RES || 2;
export const W = G.W*N, H = G.H*N;
export const LH = 10;                                  // rivin korkeus natiivina (fontti 7 px + väli)
export const g = G.g, BAYER = G.BAYER, rng = G.rng, clamp = G.clamp, ease = G.ease, fmt = G.fmt, screen = G.screen;
export const px = (x, y, col) => G.dot(x/N, y/N, col);
export const rect = (x, y, w, h, col) => G.rect(x/N, y/N, w/N, h/N, col);
export const text = (s, x, y, col, sc) => G.text(s, x/N, y/N, col, sc);
export const textC = (s, x, y, col, sc) => G.textC(s, x/N, y/N, col, sc);
export const tw = (s, sc) => G.tw(s, sc)*N;
export const wrapLines = (s, maxw) => G.wrapLines(s, maxw/N);
export const wrap = (s, x, y, maxw, col, lh) => G.wrap(s, x/N, y/N, maxw/N, col, (lh || 14)/N);
export const button = (x, y, w, h, label, fn, style) => G.button(x/N, y/N, w/N, h/N, label, fn, style);
export const hit = (x, y, w, h, fn) => G.hit(x/N, y/N, w/N, h/N, fn);
export const bevel = (x, y, w, h, ...c) => G.bevel(x/N, y/N, w/N, h/N, ...c);
// kuva natiivikoordinaatteihin: img(lähde, x, y, w, h) tai img(lähde, sx, sy, sw, sh, x, y, w, h)
export function img(c, ...a){ g.imageSmoothingEnabled = false;
  if (a.length === 4) g.drawImage(c, a[0]/N, a[1]/N, a[2]/N, a[3]/N);
  else g.drawImage(c, a[0], a[1], a[2], a[3], a[4]/N, a[5]/N, a[6]/N, a[7]/N); }
