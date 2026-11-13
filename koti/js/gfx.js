// piirron perusosat: puskuri, pikselit, fontti, napit
import {P, AMB} from './data.js';
// Käyttöliittymän koordinaatit ovat loogisia (192×336), mutta puskuri on natiivi 384×672 (RES=2),
// samaa tarkkuutta kuin isometrinen huone ja poikkileikkaus. 0,5 loogista = yksi pikseli.
export const W = 192, H = 336, RES = 2;
export const screen = document.getElementById('c');
export const sctx = screen.getContext('2d');
export const buf = document.createElement('canvas'); buf.width = W*RES; buf.height = H*RES;
export const g = buf.getContext('2d', {willReadFrequently:true});
g.setTransform(RES,0,0,RES,0,0);
const q = v => Math.round(v*RES)/RES;
export function px(x,y,col){ g.fillStyle=col; g.fillRect(x|0,y|0,1,1); }            // looginen pikseli (2×2)
export function dot(x,y,col){ g.fillStyle=col; g.fillRect(Math.floor(x*RES)/RES,Math.floor(y*RES)/RES,1/RES,1/RES); }   // yksi natiivipikseli
export function rect(x,y,w,h,col){ g.fillStyle=col; g.fillRect(q(x),q(y),q(w),q(h)); }
// pistekuvion kynnys natiivipikselin kohdalla (x, y loogisina, 0,5:n askelin)
export const bay=(x,y)=>BAYER[Math.floor(y*RES)&3][Math.floor(x*RES)&3];
// koko näkymän himmennys natiivina shakkiruutuna
export function veil(col){ g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle=col;
  for(let y=0;y<H*RES;y++) for(let x=y&1;x<W*RES;x+=2) g.fillRect(x,y,1,1); g.restore(); }
export function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);

const F={'·':'00000000000010000000000000000000000','…':'00000000000000000000000000000010101',
A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',
C:'01110100011000010000100001000101110',D:'11110100011000110001100011000111110',
E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',
G:'01110100011000010111100011000101111',H:'10001100011000111111100011000110001',
I:'01110001000010000100001000010001110',J:'00111000100001000010000101001001100',
K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',
M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',
O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',
Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',
S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',
U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',
W:'10001100011000110101101011010101010',X:'10001100010101000100010101000110001',
Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111',
0:'01110100011001110101110011000101110',1:'00100011000010000100001000010001110',
2:'01110100010000100010001000100011111',3:'11110000010000101110000010000111110',
4:'00010001100101010010111110001000010',5:'11111100001111000001000011000101110',
6:'00110010001000011110100011000101110',7:'11111000010001000100010000100001000',
8:'01110100011000101110100011000101110',9:'01110100011000101111000010001001100',
' ':'00000000000000000000000000000000000','.':'00000000000000000000000000110001100',
',':'00000000000000000000011000010001000',':':'00000011000110000000011000110000000',
'-':'00000000000000011111000000000000000','+':'00000001000010011111001000010000000',
'=':'00000000001111100000111110000000000','/':'00001000010001000100010001000010000',
'>':'01000001000001000001000100010001000','<':'00010001000100010000010000010000010',
'!':'00100001000010000100001000000000100','?':'01110100010000100010001000000000100',
'%':'11001110010001000100010001001110011','(':'00010001000100001000010000010000010',
')':'01000001000001000010000100010001000','"':'01010010100101000000000000000000000',
'×':'00000100010101000100010101000100000'};
// 5×7-fontti natiivitarkkuudella, vahvana (pystyvedot 2 px): glyfi 6×7, väli 1 px.
// sc=2: sama glyfi Scale2x-pehmennettynä 12×14 px (isot otsikot pysyvät 1 px:n tarkkuudessa).
const GC={};
function epx(b,w,h){ const o=new Uint8Array(4*w*h), at=(x,y)=>x<0||y<0||x>=w||y>=h?0:b[y*w+x];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const p=at(x,y),A=at(x,y-1),B=at(x+1,y),C=at(x-1,y),D=at(x,y+1);
    let p1=p,p2=p,p3=p,p4=p;
    if(C===A&&C!==D&&A!==B) p1=A; if(A===B&&A!==C&&B!==D) p2=B; if(D===C&&D!==B&&C!==A) p3=C; if(B===D&&B!==A&&D!==C) p4=D;
    const i=(2*y)*(2*w)+2*x; o[i]=p1; o[i+1]=p2; o[i+2*w]=p3; o[i+2*w+1]=p4; }
  return o; }
function glyph(ch,sc){ const key=ch+sc; if(GC[key]) return GC[key];
  const src=F[ch]||F[' '], b=new Uint8Array(42);
  for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(src[r*5+c]==='1'){ b[r*6+c]=1; b[r*6+c+1]=1; }
  return (GC[key] = sc===2 ? {w:12,h:14,b:epx(b,6,7)} : {w:6,h:7,b}); }
// teksti loogisissa koordinaateissa (x, y = vanhan 3×5-fontin yläkulma), piirto natiivipikseleinä
export function text(str,x,y,col,sc){ sc=sc===2?2:1; let nx=Math.round(x*RES), ny=Math.round(y*RES)+sc;
  g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle=col;
  for(const ch0 of String(str)){ let ch=ch0,u=false;
    if(ch==='Ä'){ch='A';u=true;} else if(ch==='Ö'){ch='O';u=true;}
    const gl=glyph(ch,sc); for(let i=0;i<gl.b.length;i++) if(gl.b[i]) g.fillRect(nx+i%gl.w,ny+((i/gl.w)|0),1,1);
    if(u){ if(sc===1){ g.fillRect(nx+1,ny-2,2,1); g.fillRect(nx+4,ny-2,2,1); }
      else { g.fillRect(nx+2,ny-4,3,2); g.fillRect(nx+8,ny-4,3,2); } }
    nx+=7*sc; }
  g.restore(); }
export const tw=(s,sc)=>(String(s).length*7-1)*(sc===2?2:1)/RES;
export function textC(str,cx,y,col,sc){ text(str,cx-tw(str,sc)/2,y,col,sc); }
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
// biopunk-paneeli: tumma teräsreuna viistetyin kulmin, 1 px valo ylhäällä ja varjo alhaalla
export function bevel(x,y,w,h,fill,hi,lo,edge){
  rect(x+.5,y,w-1,.5,edge); rect(x+.5,y+h-.5,w-1,.5,edge); rect(x,y+.5,.5,h-1,edge); rect(x+w-.5,y+.5,.5,h-1,edge);
  rect(x+.5,y+.5,w-1,h-1,fill); rect(x+.5,y+.5,w-1,.5,hi); rect(x+.5,y+h-1,w-1,.5,lo); }
// kehys: kaksoisreuna ja teal-kulmat (modaalit)
export function frame(x,y,w,h){
  bevel(x,y,w,h,P.ui0,P.ui2,'#070b11','#05080d'); rect(x+1,y+1,w-2,.5,'#24303f'); 
  const c='#34b8ac', d='#1d5c58', L=5;
  for(const [cx,cy,sx,sy] of [[x+1,y+1,1,1],[x+w-1.5,y+1,-1,1],[x+1,y+h-1.5,1,-1],[x+w-1.5,y+h-1.5,-1,-1]]){
    rect(sx>0?cx:cx-L+.5,cy,L,.5,c); rect(cx,sy>0?cy:cy-L+.5,.5,L,c); dot(cx+sx*.5+(sx<0?0:0),cy+sy*.5,d); } }
// napit: n = tavallinen, a = meripihka (tee tämä nyt), g = valittu, d = ei käytössä
const BTN={ n:['#2b3a4c','#4f647c','#18212d','#070b11',P.ui3], a:[AMB[1],AMB[2],'#a8661c',AMB[0],P.ui0],
  g:['#1d5c58','#34b8ac','#123c3a','#0a2624',P.ui3], d:[P.ui1,'#222f3f','#141c28','#0a0f16',P.uiD] };
export function button(x,y,w,h,label,fn,style){
  const st=BTN[style]?style:'n', [f,hi,lo,e,fg]=BTN[st];
  bevel(x,y,w,h,f,hi,lo,e);
  textC(label,x+w/2,y+((h-5)>>1),fg);
  if (st!=='d') hit(x,y,w,h,fn);
}
export function bar(x,y,v,col){ const n=Math.round(v*10);
  for(let i=0;i<10;i++){ const on=i<n; rect(x+i*6,y,5.5,5,on?col:P.ui1); rect(x+i*6,y,5.5,.5,on?'#ffffff40':'#2a3646'); rect(x+i*6,y+4.5,5.5,.5,on?'#00000040':'#0d131c'); } }
// elinvoima: v=0 haalea, v=1 täysi väri
export function vital(d,i,v){
  const r=d[i],gg=d[i+1],b=d[i+2], l=0.3*r+0.59*gg+0.11*b, s=0.1+0.9*v, br=0.6+0.4*v;
  d[i]  =clamp((l*0.9 +(r -l*0.9 )*s)*br,0,255);
  d[i+1]=clamp((l*1.0 +(gg-l*1.0 )*s)*br,0,255);
  d[i+2]=clamp((l*0.84+(b -l*0.84)*s)*br,0,255);
}
export function vitalRect(x,y,w,h,v){ if(v>=1) return; x=Math.max(0,x|0)*RES; y=Math.max(0,y|0)*RES; w=Math.min(W*RES-x,(w|0)*RES); h=Math.min(H*RES-y,(h|0)*RES); if(w<=0||h<=0) return;
  const img=g.getImageData(x,y,w,h), d=img.data; for(let i=0;i<d.length;i+=4) vital(d,i,v); g.putImageData(img,x,y); }
