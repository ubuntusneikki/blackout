// piirron perusosat: puskuri, pikselit, fontti, napit
import {P, AMB} from './data.js';
export const W = 192, H = 336;
export const screen = document.getElementById('c');
export const sctx = screen.getContext('2d');
export const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
export const g = buf.getContext('2d', {willReadFrequently:true});
export function px(x,y,col){ g.fillStyle=col; g.fillRect(x|0,y|0,1,1); }
export function rect(x,y,w,h,col){ g.fillStyle=col; g.fillRect(x|0,y|0,w|0,h|0); }
export function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);

const F={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
'4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111',
'9':'111101111001110','/':'001001010100100',':':'000010000010000','-':'000000111000000','.':'000000000000010',
'>':'100010001010100','<':'001010100010001',' ':'000000000000000','%':'101001010100101','+':'000010111010000',
'!':'010010010000010','=':'000111000111000','(':'010100100100010',')':'010001001001010',',':'000000000010100',
'?':'110001010000010','×':'000101010101000','"':'101101000000000'};
export function text(str,x,y,col,sc){ sc=sc||1; for(const ch0 of String(str)){ let ch=ch0,u=false;
  if(ch==='Ä'){ch='A';u=true;} else if(ch==='Ö'){ch='O';u=true;}
  const gl=F[ch]||F[' ']; for(let i=0;i<15;i++) if(gl[i]==='1') rect(x+(i%3)*sc,y+((i/3)|0)*sc,sc,sc,col);
  if(u){rect(x,y-2*sc,sc,sc,col);rect(x+2*sc,y-2*sc,sc,sc,col);} x+=4*sc; } }
export const tw=(s,sc)=>(String(s).length*4-1)*(sc||1);
export function textC(str,cx,y,col,sc){ text(str,Math.round(cx-tw(str,sc)/2),y,col,sc); }
export function wrapLines(str,maxw){ const out=[]; let line='';
  for(const w of String(str).split(' ')){ const t=line?line+' '+w:w; if(tw(t)>maxw&&line){ out.push(line); line=w; } else line=t; }
  if(line) out.push(line); return out; }
export function wrap(str,x,y,maxw,col,lh){ const L=wrapLines(str,maxw); L.forEach((l,i)=>text(l,x,y+i*(lh||8),col)); return L.length; }
// luvut: alle 10 yhdellä desimaalilla (pilkku), muuten kokonaislukuna
export const fmt=x=> x<10 ? (Math.round(x*10)/10).toFixed(1).replace('.',',') : String(Math.round(x));

// osumat
export let HIT=[];
export function resetHit(){ HIT.length=0; }
export function hit(x,y,w,h,fn){ HIT.push({x,y,w,h,fn}); }
// napit: n = tavallinen, a = meripihka (tee tämä nyt), g = valittu, d = ei käytössä
export function button(x,y,w,h,label,fn,style){
  const st=style||'n';
  const bgc= st==='a'?AMB[1]: st==='d'?P.ui1 : st==='g'?'#1d5c58' : P.ui2;
  const hi = st==='a'?AMB[2]: st==='d'?P.ui1 : st==='g'?'#34b8ac' : P.bg4;
  const fg = st==='a'?P.ui0 : st==='d'?P.uiD : P.ui3;
  rect(x,y,w,h,bgc); rect(x,y,w,1,hi);
  textC(label,x+w/2,y+((h-5)>>1),fg);
  if (st!=='d') hit(x,y,w,h,fn);
}
export function bar(x,y,v,col){ for(let i=0;i<10;i++) rect(x+i*6,y,5,5,i<Math.round(v*10)?col:P.ui1); }
// elinvoima: v=0 haalea, v=1 täysi väri
export function vital(d,i,v){
  const r=d[i],gg=d[i+1],b=d[i+2], l=0.3*r+0.59*gg+0.11*b, s=0.1+0.9*v, br=0.6+0.4*v;
  d[i]  =clamp((l*0.9 +(r -l*0.9 )*s)*br,0,255);
  d[i+1]=clamp((l*1.0 +(gg-l*1.0 )*s)*br,0,255);
  d[i+2]=clamp((l*0.84+(b -l*0.84)*s)*br,0,255);
}
export function vitalRect(x,y,w,h,v){ if(v>=1) return; x=Math.max(0,x|0); y=Math.max(0,y|0); w=Math.min(W-x,w|0); h=Math.min(H-y,h|0); if(w<=0||h<=0) return;
  const img=g.getImageData(x,y,w,h), d=img.data; for(let i=0;i<d.length;i+=4) vital(d,i,v); g.putImageData(img,x,y); }
