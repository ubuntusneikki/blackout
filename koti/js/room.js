// huoneen ja kellarin ruudukko
import {P, AMB, STRAINS, VESSELS, DEVICES, ROOMS} from './data.js';
import {px, rect, rng, BAYER, clamp, ease, W, text, textC, vitalRect} from './gfx.js';
import {S, strain, neighbors} from './state.js';

export const CELL=44, GAP=2, GX0=5;
export function gridY0(r){ return r==='kellari' ? 84 : 72; }
export function cellXY(r,i){ const c=i%4, y=(i/4)|0; return [GX0+c*(CELL+GAP), gridY0(r)+y*(CELL+GAP)]; }
export function cellAt(r,x,y){ const n=ROOMS[r].w*ROOMS[r].h; for(let i=0;i<n;i++){ const [cx,cy]=cellXY(r,i); if(x>=cx&&x<cx+CELL&&y>=cy&&y<cy+CELL) return i; } return -1; }

export function vesselV(vs){ if(!vs||!vs.strain) return 0.15;
  const wet = vs.moist>0.25 ? 1 : vs.moist/0.25;
  return clamp(0.3 + 0.5*vs.growth + 0.2*wet - (vs.moist<0.1?0.25:0), 0, 1); }

// ---------- taustat ----------
function drawWall(){
  const r=rng(11); rect(0,14,W,258,P.bg0);
  for(let y=14;y<272;y+=7){ const off=((y/7)|0)%2?0:7;
    for(let x=-14+off;x<W;x+=14){ const q=r(); rect(x+1,y+1,12,5,q<0.15?P.br2:q<0.55?P.br1:P.br0); } }
}
function drawStone(t){
  const r=rng(23); rect(0,14,W,258,P.ks0);
  for(let y=14;y<272;y+=10){ const off=((y/10)|0)%2?0:9;
    for(let x=-18+off;x<W;x+=18){ const q=r(); rect(x+1,y+1,16,8,q<0.2?P.ks2:q<0.6?P.ks1:'#30303a'); } }
  // kosteus valuu seinällä
  for(let k=0;k<7;k++){ const x=12+k*27+((k*7)%5); for(let y=20;y<60+((k*13)%30);y++) if(BAYER[y&3][x&3]<6) px(x,y,'#3a4a5a'); }
  // kapea ikkunaraja katutasoon
  rect(60,20,72,10,P.ui0); rect(60,20,72,1,P.ks2);
  for(let x=62;x<130;x+=4) px(x,28,'#2a1648');
  text('KELLARI  KOSTEA / VIILEÄ',8,40,P.uiD);
  text('ASTIAT KUIVUVAT HITAASTI',8,50,'#4f7d86');
  text('KOSTEAT KANNAT KASVAVAT +20%',8,58,'#4f7d86');
}
const SKY=(()=>{ const r=rng(77), segs=[];
  for(let s=0;s<5;s++){ const b=[]; let x=0; while(x<34){ const w=6+(r()*9|0), h=8+(r()*22|0); b.push({x,w,h}); x+=w+1; } segs.push(b); }
  return segs; })();
function drawWindow(t){
  const X0=8,Y0=18,WW=176,HH=44;
  rect(X0-3,Y0-3,WW+6,HH+6,P.cu1); rect(X0-3,Y0-3,WW+6,1,P.cu3); rect(X0-3,Y0+HH+2,WW+6,1,P.cu0);
  for(let y=Y0;y<Y0+HH;y++){ const f=(y-Y0)/HH; rect(X0,y,WW,1, f<0.35?'#1b2a4a': f<0.7?'#3a3a5e':'#5a3a6a'); }
  for(let s=0;s<5;s++){ const sx=X0+s*35+1;
    SKY[s].forEach(b=>{ const by=Y0+HH-b.h;
      rect(sx+b.x,by,b.w,b.h,'#2a2238'); rect(sx+b.x,by,1,b.h,'#3a3048');
      for(let wy=by+2;wy<Y0+HH-2;wy+=4) for(let wx=sx+b.x+1;wx<sx+b.x+b.w-1;wx+=3) if(((wx*7+wy*13)%9)<1) px(wx,wy,'#ffcf7a'); });
    // villi rihmasto kiipeää talojen yli (kylmä violetti)
    const rr=rng(300+s);
    for(let k=0;k<7;k++){ let x=sx+(rr()*33|0), y=Y0+HH-1; const h=4+(rr()*14|0);
      for(let q=0;q<h;q++){ px(x,y-q, q===h-1?'#c8a8ff':'#6a3cc0'); if(rr()<0.3) x+=rr()<0.5?-1:1; } }
    for(let k=0;k<3;k++){ const x=sx+4+(rr()*26|0), y=Y0+HH-6-(rr()*20|0); if(Math.sin(t*1.3+k+s)>0.3) px(x,y,'#c8a8ff'); }
  }
  rect(X0+WW/2-1,Y0,2,HH,P.cu1); rect(X0,Y0+HH/2-1,WW,1,P.cu0);
}

// ---------- ruudut ----------
function drawEmpty(x,y,hl){
  const col=hl?AMB[1]:P.ui2;
  for(let k=0;k<CELL;k+=4){ px(x+k,y+CELL-1,col); px(x+k,y,col); }
  for(let k=0;k<CELL;k+=4){ px(x,y+k,col); px(x+CELL-1,y+k,col); }
}
function drawMiniVessel(vs,x,y,t,r,i){
  const T=strain(vs.strain), SW=CELL, SH=CELL, soil=y+SH-8;
  if (vs.type==='purkki'){
    rect(x+7,y+6,SW-14,SH-6,P.gl1); rect(x+9,y+8,SW-18,SH-10,P.gl0);
    rect(x+12,y+2,SW-24,5,P.so3); rect(x+12,y+2,SW-24,1,P.st0);
  } else if (vs.type==='palvelin'){
    rect(x+2,y+2,SW-4,SH-2,P.bg3); rect(x+5,y+6,SW-10,SH-8,'#1e1418');
    for(let k=0;k<5;k++){ px(x+3,y+8+k*7,P.bg4); px(x+SW-4,y+8+k*7,(Math.sin(t*5+k+i)>0)?P.grn:AMB[0]); }
  } else {
    rect(x+2,y+2,SW-4,SH-2,P.cu1); rect(x+2,y+2,SW-4,1,P.cu3); rect(x+4,y+5,SW-8,SH-6,P.gl0);
    if (vs.type==='akvaario'){ for(let yy=y+16;yy<soil;yy++) for(let xx=x+4;xx<x+SW-4;xx++) if(BAYER[yy&3][xx&3]<7) px(xx,yy,P.wa1); rect(x+4,y+16,SW-8,1,P.wa2); }
  }
  const sx0 = vs.type==='purkki'? x+9 : x+5, sx1 = vs.type==='purkki'? x+SW-10 : x+SW-6;
  rect(sx0,soil,sx1-sx0+1,SH-(soil-y)-1,P.so1); rect(sx0,soil,sx1-sx0+1,1,P.so2);
  for(let k=0;k<5;k++) px(sx0+2+k,y+16-k,P.gl1);
  if (T){
    const life=0.25+0.75*vs.growth, dry=vs.moist<0.1;
    const n = T.style==='tall'?3: T.style==='nubs'?4: T.style==='web'?3:3;
    for(let k=0;k<n;k++){
      const fx = sx0 + Math.round((k+1)*(sx1-sx0)/(n+1));
      const h = Math.max(2, Math.round((T.style==='tall'?20: k===1?15:9)*life*(vs.type==='purkki'?0.85:1)));
      const w = Math.max(2, Math.round((T.style==='tall'?3: T.style==='nubs'?5: T.style==='web'?9: k===1?10:7)*life));
      rect(fx,soil-h,1,h,P.st1);
      const capH=Math.max(1,Math.round(w*(T.style==='nubs'?0.6:0.4)));
      for(let q=0;q<capH;q++){ const hw=Math.round(w/2*(0.5+0.5*(q+1)/capH));
        rect(fx-hw, soil-h-capH+q+(dry?1:0), hw*2+1, 1, q===0?T.col[2]:T.col[1]); }
      if (T.style==='web' && k<n-1 && life>0.4){ const nx=sx0+Math.round((k+2)*(sx1-sx0)/(n+1));
        for(let xx=fx;xx<nx;xx+=2) px(xx, soil-h-capH+2+((xx>>1)&1), T.col[2]); }
      if(!dry && Math.sin(t*2+k+i)>0.2) px(fx-1,soil-h-capH-1,T.mutant?AMB[2]:T.col[0]);
    }
    if (T.mutant) for(let k=0;k<4;k++){ const a=t*1.2+k*1.57; px(x+SW/2+Math.cos(a)*15, y+SH/2+Math.sin(a)*12, AMB[2]); }
  }
  if (vs.ready){ const by=y-3+(Math.sin(t*4)>0?0:1); rect(x+SW/2,by,1,4,AMB[2]); px(x+SW/2,by+5,AMB[2]);
    for(let k=0;k<8;k++){ const a=t*1.5+k*0.78; px(x+SW/2+Math.cos(a)*18, y+SH/2+Math.sin(a)*14, AMB[1]); } }
  else if (vs.strain && vs.moist<0.25 && Math.sin(t*6)>0){ const dx=x+SW-9, dy=y+7;
    px(dx+1,dy,P.wa2); rect(dx,dy+1,3,2,P.wa2); px(dx+1,dy+3,P.wa1); }
  if (vs.strain && !T.auto){ rect(x+5,y+SH-2,SW-10,1,P.ui1); rect(x+5,y+SH-2,Math.round((SW-10)*vs.growth),1,vs.ready?AMB[1]:T.col[1]); }
}
function progress(x,y,v,col){ rect(x+5,y+CELL-3,CELL-10,2,P.ui1); rect(x+5,y+CELL-3,Math.round((CELL-10)*v),2,col); }
function doneGlow(x,y,t){ for(let k=0;k<8;k++){ const a=t*1.5+k*0.78; px(x+CELL/2+Math.cos(a)*18, y+CELL/2+Math.sin(a)*14, AMB[1]); }
  const by=y-3+(Math.sin(t*4)>0?0:1); rect(x+CELL/2,by,1,4,AMB[2]); px(x+CELL/2,by+5,AMB[2]); }
function drawDevice(d,x,y,t){
  if (d.type==='hautomo'){
    // lämmin kupu: puinen jalusta, lasikupu ja malja
    rect(x+4,y+34,CELL-8,7,P.cu0); rect(x+4,y+34,CELL-8,1,P.cu2);
    for(let yy=0;yy<28;yy++){ const half=Math.round(17*Math.sqrt(1-Math.pow((28-yy)/28,2)));
      rect(x+CELL/2-half,y+6+yy,half*2,1, yy===0?P.gl2:P.gl0); px(x+CELL/2-half,y+6+yy,P.gl2); px(x+CELL/2+half-1,y+6+yy,P.gl1); }
    const glow = d.busy ? (0.5+0.5*Math.sin(t*1.5)) : 0;
    if (d.busy) for(let yy=y+14;yy<y+34;yy++) for(let xx=x+10;xx<x+CELL-10;xx++) if(BAYER[yy&3][xx&3]<3+glow*3) px(xx,yy,'#4a2a14');
    rect(x+12,y+30,CELL-24,3,'#e8e0c0'); rect(x+13,y+29,CELL-26,1,'#fff6dc');   // malja
    if (d.dish){ const a=strain(d.dish.a), b=strain(d.dish.b), r=Math.round(2+d.t*8);
      for(let k=-r;k<=r;k++){ const xx=x+CELL/2+k; px(xx,y+29, (k<0?a:b).col[k%2?1:2]); } }
    for(let k=0;k<5;k++) px(x+12+k,y+12+k,P.gl3);
    if (d.busy && !d.done) progress(x,y,d.t,'#c4428f');
    if (d.done) doneGlow(x,y,t);
  } else if (d.type==='kuivain'){
    rect(x+5,y+4,2,CELL-6,P.cu1); rect(x+CELL-7,y+4,2,CELL-6,P.cu1);
    for(let k=0;k<3;k++){ const yy=y+9+k*11; rect(x+5,yy,CELL-10,1,P.cu2);
      if (d.busy){ const T=STRAINS[d.job], v=1-0.6*d.t;
        for(let j=0;j<5;j++){ const xx=x+9+j*6; rect(xx,yy+1,3,2+((j+k)&1), v>0.6?T.col[1]:T.col[0]); px(xx+1,yy+1,T.col[2]); } } }
    if (d.busy && !d.done) progress(x,y,d.t,AMB[0]);
    if (d.done) doneGlow(x,y,t);
  } else if (d.type==='kehikko'){
    const X=x+6,Y=y+5,S2=CELL-12;
    rect(X,Y,S2,2,P.cu1); rect(X,Y+S2-2,S2,2,P.cu1); rect(X,Y,2,S2,P.cu1); rect(X+S2-2,Y,2,S2,P.cu1); rect(X,Y,S2,1,P.cu3);
    const col=STRAINS.kalvo.col;
    if (d.busy){ const fill=d.done?1:d.t, m=Math.round((S2/2-2)*fill);
      for(let yy=Y+2;yy<Y+S2-2;yy++) for(let xx=X+2;xx<X+S2-2;xx++){
        const e=Math.min(xx-X-2,X+S2-3-xx,yy-Y-2,Y+S2-3-yy); if(e<m){ const q=(xx*3+yy*5)&7; px(xx,yy, q===0?col[2]:q<3?col[1]:col[0]); } } }
    if (d.busy && !d.done) progress(x,y,d.t,col[1]);
    if (d.done) doneGlow(x,y,t);
  }
}
export function drawRoomBg(r,t){
  if (r==='kellari'){ drawStone(t); vitalRect(0,14,W,258,0.85); }
  else { drawWall(); drawWindow(t); vitalRect(0,14,W,258,0.55); }
  const y0=gridY0(r), rows=ROOMS[r].h;
  for(let k=0;k<rows;k++){ const yy=y0+k*(CELL+GAP)+CELL; rect(2,yy,W-4,2,r==='kellari'?'#22222a':P.so3); }
}
export function drawCells(r,t,opt){
  const cells=S.rooms[r].cells;
  cells.forEach((c,i)=>{ const [x,y]=cellXY(r,i);
    if (!c){ drawEmpty(x,y,opt.placeable); return; }
    if (c.kind==='vessel'){ drawMiniVessel(c,x,y,t,r,i); vitalRect(x,y,CELL,CELL,vesselV(c)); }
    else drawDevice(c,x,y,t);
    if (opt.pick && opt.pick.r===r && opt.pick.i===i && Math.sin(t*8)>-0.3){ rect(x,y,CELL,1,AMB[2]); rect(x,y+CELL-1,CELL,1,AMB[2]); rect(x,y,1,CELL,AMB[2]); rect(x+CELL-1,y,1,CELL,AMB[2]); }
  });
  // hoitajasienen rihmayhteydet naapureihin
  cells.forEach((c,i)=>{ if(!c||c.kind!=='vessel'||!c.strain) return; const T=strain(c.strain); if(!T.auto) return;
    const [x,y]=cellXY(r,i), cx=x+CELL/2, cy=y+CELL/2;
    neighbors(r,i).forEach(j=>{ if(!cells[j]||cells[j].kind!=='vessel') return; const [nx,ny]=cellXY(r,j), dx=Math.sign(nx-x), dy=Math.sign(ny-y);
      for(let k=0;k<5;k++){ const ph=((t*6+k)%5)|0; px(cx+dx*(CELL/2+k-2), cy+dy*(CELL/2+k-2), ph===k?T.col[2]:T.col[0]); } }); });
}
