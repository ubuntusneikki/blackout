// astian poikkileikkaus (yksityiskohtanäkymä)
import {P, AMB} from './data.js';
import {px, rect, rng, BAYER, clamp, ease, W, H} from './gfx.js';
import {strain} from './state.js';

export const TX0=24, TX1=167, TY0=78, SOIL=214, TY1=250, ORIGIN=[96,214];
export const INNER = { purkki:[46,145], terraario:[TX0,TX1], akvaario:[TX0,TX1], palvelin:[32,159] };
const statCache={};
export function staticFor(type){
  if (statCache[type]) return statCache[type];
  const c=document.createElement('canvas'); c.width=W; c.height=H; const s=c.getContext('2d');
  const R=rng(11);
  const sp=(x,y,col)=>{ s.fillStyle=col; s.fillRect(x|0,y|0,1,1); }, sr=(x,y,w,h,col)=>{ s.fillStyle=col; s.fillRect(x|0,y|0,w|0,h|0); };
  sr(0,0,W,H,P.bg0);
  for(let y=16;y<262;y+=7){ const off=((y/7)|0)%2?0:7;
    for(let x=-14+off;x<W;x+=14){ const q=R(); sr(x+1,y+1,12,5,q<0.15?P.br2:q<0.55?P.br1:P.br0); } }
  const [x0,x1]=INNER[type];
  if (type==='terraario'||type==='akvaario'){
    sr(110,40,82,4,P.cu1); sr(110,40,82,1,P.cu3); sr(110,43,82,1,P.cu0);
    sr(110,40,4,34,P.cu1); sr(110,40,1,34,P.cu3); sr(107,70,10,4,P.cu2);
    sr(150,38,6,8,P.cu2); sr(147,34,12,2,P.cu1);
    sr(TX0-3,TY0-6,TX1-TX0+7,7,P.cu1); sr(TX0-3,TY0-6,TX1-TX0+7,1,P.cu3);
    for(let x=TX0+6;x<TX1-4;x+=6) if(x<100||x>120) sr(x,TY0-3,3,1,P.cu0);
  }
  if (type==='palvelin'){
    sr(x0-8,TY0-10,x1-x0+17,TY1-TY0+14,P.bg3); sr(x0-8,TY0-10,x1-x0+17,1,P.bg4);
    for(let x=x0;x<x1;x+=3) sp(x,TY0-6,P.bg1), sp(x,TY0-4,P.bg1);
  }
  if (type==='purkki'){
    sr(x0+16,TY0-2,x1-x0-31,8,P.so3); sr(x0+16,TY0-2,x1-x0-31,1,P.st0); sr(x0+14,TY0+6,x1-x0-27,2,P.gl2);
  }
  // sisus
  const top = type==='purkki'? TY0+8 : TY0+1;
  sr(x0,top,x1-x0+1,SOIL-top,type==='palvelin'?'#1e1418':P.gl0);
  if (type==='purkki'){ for(let k=0;k<10;k++) for(let q=0;q<10-k;q++){ sp(x0+k,top+q,P.bg0); sp(x1-k,top+q,P.bg0); } }
  for(let y=top;y<SOIL;y++) for(let x=x0;x<=x1;x++) if(BAYER[y&3][x&3]===0&&((x+y)&7)===0) sp(x,y,type==='palvelin'?'#2e1c20':P.gl1);
  if (type!=='palvelin'){ for(let i=0;i<26;i++) sp(x0+6+i,top+34-i,P.gl1); for(let i=0;i<12;i++) sp(x0+12+i,top+38-i,P.gl1); }
  for(let i=0;i<50;i++){ const x=x0+2+(R()*(x1-x0-3))|0, y=top+3+(R()*R()*60)|0; sp(x,y,R()<0.3?P.gl2:P.gl1); }
  // multa
  sr(x0+1,SOIL,x1-x0,TY1-SOIL,P.so1);
  for(let y=SOIL;y<TY1;y++) for(let x=x0+1;x<=x1;x++){ const t=BAYER[y&3][x&3];
    if(y<SOIL+8&&t<6) sp(x,y,P.so2); else if(y>SOIL+22&&t<6) sp(x,y,P.so0); }
  for(const [x,y,w] of [[x0+16,236,7],[x0+94,240,8],[x0+60,244,5],[x0+38,226,4]]) if(x+w<x1){ sr(x,y,w,3,P.st0); sr(x+1,y,w-2,1,P.st1); }
  // runko
  if (type==='terraario'||type==='akvaario'){
    for(const x of [TX0-3,TX1+1]){ sr(x,TY0,3,TY1-TY0+3,P.cu1); sr(x,TY0,1,TY1-TY0+3,P.cu3); }
    sr(TX0-3,TY1,TX1-TX0+7,4,P.cu1); sr(TX0-3,TY1,TX1-TX0+7,1,P.cu3);
  } else if (type==='purkki'){
    for(let y=top;y<TY1;y++){ sp(x0-1,y,P.gl2); sp(x1+1,y,P.gl2); } sr(x0-1,TY1,x1-x0+3,2,P.gl2);
  } else {
    for(let y=TY0;y<TY1;y+=6){ sr(x0-6,y,3,3,P.bg1); sr(x1+4,y,3,3,P.bg1); }
  }
  sr(0,TY1+4,W,2,P.so3); sr(0,TY1+6,W,2,P.so1);
  statCache[type]=c; return c;
}

function haloIn(cx,cy,rad,col,strength,x0,x1){
  for(let y=(cy-rad)|0;y<=cy+rad;y++) for(let x=(cx-rad)|0;x<=cx+rad;x++){
    const d=Math.hypot(x-cx,(y-cy)*1.3); if(d>rad||x<=x0||x>=x1||y<=TY0+2||y>=SOIL) continue;
    if(BAYER[y&3][x&3] < (1-d/rad)*16*strength) px(x,y,col); }
}
function capShroom(x,h,w,col,life,t,ph,x0,x1,opts){
  const [lo,mid,hi]=col, round=opts&&opts.round, dry=opts&&opts.dry;
  const hh=Math.max(3,Math.round(h*(0.2+0.8*life))), ww=Math.max(3,Math.round(w*(0.35+0.65*life)));
  const top=SOIL-1-hh, capH=Math.max(2,Math.round(ww*(round?0.7:0.48))), droop=dry?2:0;
  if(life>0.05&&!dry) haloIn(x,top-capH/2,ww*0.85+4,lo,life*(0.75+0.25*Math.sin(t*2.2+ph)),x0,x1);
  const sw=ww>30?4:ww>16?3:ww>7?2:1, sx=x-(sw>>1);
  rect(sx,top,sw,hh,P.st1); if(sw>1) rect(sx+sw-1,top,1,hh,P.st0); if(sw>2) rect(sx,top,1,hh,P.st2);
  for(let i=0;i<capH;i++){ const k=(capH-i)/capH, half=Math.round((ww/2)*Math.sqrt(1-k*k*0.85));
    for(let xx=x-half;xx<=x+half;xx++){ let c=mid; if(i===0||(xx===x-half&&i<capH-1)) c=hi; if(xx>x+half-Math.max(1,half/3)) c=lo;
      px(xx,top-capH+i+droop,c);} }
  if(ww>12) for(const [dx,dy] of [[-7,2],[2,1],[-2,4],[7,3],[-11,5],[11,6]]) if(Math.abs(dx)<ww/2-1&&dy<capH-1) px(x+dx,top-capH+dy+droop,hi);
  return top-capH;
}
const LAYOUT = {
  cap:    [[0.5,74,42],[0.76,40,20],[0.26,22,12],[0.9,12,8]],
  cluster:[[0.32,34,20],[0.2,22,13],[0.44,16,10],[0.66,30,18],[0.78,18,11]],
  nubs:   [[0.15,10,9],[0.28,15,11],[0.42,9,8],[0.55,18,12],[0.7,11,9],[0.84,14,10]],
  tall:   [[0.3,62,7],[0.5,84,8],[0.7,52,6]],
  web:    [[0.2,30,22],[0.42,44,26],[0.64,36,24],[0.84,24,18]]
};
export function drawContents(vs,t){
  const T=strain(vs.strain), [x0,x1]=INNER[vs.type], wid=x1-x0;
  const sc = vs.type==='purkki'?0.8:1, life=0.2+0.8*ease(vs.growth), dry=vs.moist<0.1;
  let topY=SOIL;
  if (T.style==='shelf'){
    const sx=x0+Math.round(wid*0.55);
    rect(sx,140,5,SOIL-140,P.so2); rect(sx,140,1,SOIL-140,P.so3); rect(sx+4,140,1,SOIL-140,P.so0);
    [[160,18],[178,22],[194,15],[150,12]].forEach(([y,w],k)=>{
      const ww=Math.max(2,Math.round(w*(0.25+0.75*life))), hh=Math.max(2,Math.round(ww*0.45)), [lo,mid,hi]=T.col;
      if(!dry) haloIn(sx+5+ww/2,y-hh/2,ww*0.7+3,lo,life*0.7,x0,x1);
      for(let i=0;i<hh;i++){ const kk=(i+1)/hh, len=Math.round(ww*Math.sqrt(1-(1-kk)*(1-kk)*0.9));
        for(let x=0;x<len;x++){ let c=i===0?hi:(i===hh-1?lo:mid); if(x===len-1&&i>0) c=lo; if(i>0&&i<hh-1&&x%4===2) c=hi; px(sx+5+x,y-hh+i,c);} }
      topY=Math.min(topY,y-hh);
    });
  } else {
    LAYOUT[T.style].forEach(([f,h,w],k)=>{
      const y=capShroom(x0+Math.round(wid*f), h*sc, w*sc, T.col, life, t, k*1.3, x0, x1, {round:T.style==='nubs', dry});
      topY=Math.min(topY,y);
    });
    if (T.style==='web' && life>0.3){ // kalvoheltta: tiivis verkko lakkien välissä
      const y0=SOIL-Math.round(36*sc*(0.2+0.8*life)), [lo,mid,hi]=T.col;
      for(let x=x0+Math.round(wid*0.16);x<x0+Math.round(wid*0.88);x++) for(let yy=y0-4;yy<y0+6;yy++){
        const q=(x*3+yy*5)&7; if(q===0) px(x,yy,hi); else if(q===3&&BAYER[yy&3][x&3]<8*life) px(x,yy,mid); }
    }
    if (T.auto){ // hoitajan rihmat ulos astiasta
      for(let k=0;k<3;k++){ const yy=SOIL+4+k*6, ph=(t*14+k*9)%60;
        for(let x=x0;x<=x1;x++) if(((x+k)%3)===0) px(x,yy,T.col[0]);
        px(x0+((ph*3)%(x1-x0)),yy,T.col[2]); }
    }
  }
  // rihmasto
  const rr=rng(42+vs.id);
  for(let n=0;n<6;n++){ let x=x0+10+(rr()*(wid-20)|0), y=SOIL+1;
    for(let i=0;i<28;i++){ px(x,y,'#1d4a46'); const q=rr(); if(q<0.45)x+=(n&1?1:-1); else if(q<0.8)y++; else y--; y=clamp(y,SOIL+1,TY1-2); x=clamp(x,x0+2,x1-2);
      if(!dry && ((i+Math.floor(t*10)+n*5)%30)===0) px(x,y,T.col[2]); } }
  // itiöt
  if(!dry && life>0.5) for(let i=0;i<(T.mutant?24:14);i++){ const sx=x0+8+((i*37)%(wid-16)), y=SOIL-12-((t*(3+i%4*1.5)+i*17)%100);
    if(y>TY0+12) px(sx+Math.round(Math.sin(t+i)*2),y,T.mutant&&i%3===0?AMB[2]:T.col[i%3?1:2]); }
  return topY;
}
export function drawWater(t,x0,x1){
  for(let y=118;y<SOIL;y++) for(let x=x0+1;x<x1;x++) if(BAYER[y&3][x&3]<5) px(x,y,P.wa1);
  for(let x=x0+1;x<x1;x++) px(x,118+(Math.sin(x*0.3+t*2)>0.6?1:0),P.wa2);
  for(let i=0;i<8;i++){ const bx=x0+12+i*17, by=SOIL-((t*12+i*23)%92); px(bx,by,P.wa2); }
}

