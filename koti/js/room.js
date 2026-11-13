// Ruutujen apufunktiot. Huoneen piirto on iso.js:ssä (isometrinen näkymä, TP4).
// cellXY/cellAt ovat vanhan suoran ruudukon koordinaatit (efektien oletuslokaattori käyttää niitä).
import {ROOMS} from './data.js';
import {clamp} from './gfx.js';

export const CELL=44, GAP=2, GX0=5;
export function gridY0(r){ return r==='kellari' ? 84 : 72; }
export function cellXY(r,i){ const c=i%4, y=(i/4)|0; return [GX0+c*(CELL+GAP), gridY0(r)+y*(CELL+GAP)]; }
export function cellAt(r,x,y){ const n=ROOMS[r].w*ROOMS[r].h; for(let i=0;i<n;i++){ const [cx,cy]=cellXY(r,i); if(x>=cx&&x<cx+CELL&&y>=cy&&y<cy+CELL) return i; } return -1; }

// astian elinvoima 0…1 (kosteus ja kasvu): käytetään poikkileikkauksessa ja isometrisessä näkymässä
export function vesselV(vs){ if(!vs||!vs.strain) return 0.15;
  const wet = vs.moist>0.25 ? 1 : vs.moist/0.25;
  return clamp(0.3 + 0.5*vs.growth + 0.2*wet - (vs.moist<0.1?0.25:0), 0, 1); }
