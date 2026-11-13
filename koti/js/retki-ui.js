// rihmaretken näkymät: oven modaali ja paluun paljastus (TP5). TP4:n isometrisessä huoneessa ovi on napautuskohde,
// joka avaa saman modaalin: U.modal={type:'retki'}.
import {P, AMB, WILD, SYM, STRAINS, VESSELS} from './data.js';
import {W, px, dot, bay, bevel, rect, rng, BAYER, clamp, text, textC, tw, wrap, button, hit, bar, isGuided, guideMark} from './gfx.js';
import {S, strain} from './state.js';
import * as retki from './retki.js';

const AGAR = ['#6a6250','#c9bc9c','#efe6cc'];
export function timeLeft(sec){ const m=Math.ceil(sec/60); return m>=60 ? Math.floor(m/60)+' H '+(m%60)+' MIN' : m+' MIN'; }
function lootCol(o){
  if (o.kind==='spore'){ const T=strain(o.key); return T.mutant?AMB[2]:T.col[2]; }
  if (o.kind==='item') return o.id==='villi'?WILD[2]:AGAR[2];
  return P.gl3;
}
function lootPal(o){
  if (o.kind==='spore'){ const T=strain(o.key); return T.col; }
  if (o.kind==='item') return o.id==='villi'?WILD:AGAR;
  return [P.gl1,P.gl2,P.gl3];
}

// oviaukko: lämmin sisävalo, ulkona kylmä violetti villi
function door(cx,cy,w,h,t,open){
  rect(cx-w/2-3,cy-h-3,w+6,h+3,P.cu1); rect(cx-w/2-3,cy-h-3,w+6,.5,P.cu3); rect(cx-w/2-.5,cy-h-.5,w+1,h+.5,P.cu0);
  rect(cx-w/2,cy-h,w,h,'#140b1e');
  const r=rng(41);
  for(let k=0;k<w*4;k++){ const x=cx-w/2+(r()*w*2|0)/2, y=cy-h+(r()*h*2|0)/2; if (Math.sin(t*1.7+k)>0.2) dot(x,y,k%5?WILD[1]:WILD[2]); }
  // ovi lehti auki
  if (open<1) rect(cx-w/2,cy-h,Math.round(w*(1-open)),h,P.br2);
}

// ---------- modaali (piirretään ui.js:n modaalikehykseen) ----------
export function drawRetkiModal(m,X,Y,WW,HH,t,ctx){
  textC('OVI',X+WW/2,Y+6,AMB[2]);
  let y=Y+18;
  const st=retki.status();
  door(X+WW/2,y+44,26,40,t, st&&!st.back ? 0.6 : 0.15);
  y+=52;
  if (!retki.retkiOpen()){
    wrap('OVI ON VIELÄ KIINNI. MYY ENSIMMÄINEN SATO MARKKINALLA, NIIN SYMBIONTTI USKALTAA KUROTTAA RIHMANSA ULOS.',X+10,y,154,P.uiD);
    return;
  }
  if (st && st.back){
    wrap('SYMBIONTTI PALASI '+(st.tyyppi==='syva'?'SYVÄLTÄ':'LYHYELTÄ')+' RETKELTÄ. RIHMOISSA ON JOTAIN.',X+10,y,154,P.ui3); y+=24;
    button(X+16,y,WW-32,18,'OTA LÖYDÖT VASTAAN',()=>{ const res=retki.collect(); if(res) ctx.reveal(res); },'a');
    return;
  }
  if (st){
    const R=retki.RETKET[st.tyyppi];
    text('SYMBIONTTI ON RETKELLÄ',X+10,y,P.ui3); y+=10;
    text(R.name,X+10,y,SYM); y+=12;
    bar(X+10,y,st.t,SYM); text(timeLeft(st.left/S.speed),X+76,y,P.uiD); y+=14;
    wrap('YKSI RETKI KERRALLAAN. KOTI JATKAA KASVUAAN SILLÄ AIKAA.',X+10,y,154,P.uiD);
    return;
  }
  text('LÄHETÄ SYMBIONTTI RETKELLE',X+10,y,AMB[1]); y+=12;
  for (const type of ['lyhyt','syva']){
    const R=retki.RETKET[type], ok=retki.canStart(type);
    if (ok) bevel(X+6,y,WW-12,34,'#243142',P.ui2,'#151d28','#070b11'); else bevel(X+6,y,WW-12,34,P.ui1,'#222f3f','#141c28','#0a0f16');
    text(R.name,X+10,y+4,ok?P.ui3:P.uiD);
    const right = R.cost ? 'SUODATIN '+(S.inv[R.cost]||0) : 'ILMAINEN';
    text(right,X+WW-10-tw(right),y+4,ok?(R.cost?AMB[2]:P.grn):P.uiD);
    wrap(R.txt,X+10,y+14,152,ok?P.uiD:P.ui2);
    if (ok) hit(X+6,y,WW-12,34,()=>{ retki.start(type); ctx.close(); });
    if (ok && isGuided('row:'+R.name)) guideMark(X+6,y,WW-12,34);
    y+=38;
  }
}

// ---------- paluun paljastus ----------
export function drawRetkiReveal(R,a,ctx){
  const res=R.res, cx=W/2, cy=150;
  rect(0,0,W,336,'#06080c');
  // villi ulkona: kylmä violetti rihmasto kasvaa reunoilta
  const r=rng(5);
  for(let n=0;n<26;n++){ let x=r()*W, y=r()<0.5?14:300, ang=y<100?1.57:-1.57; const len=40+r()*60;
    for(let i=0;i<len*clamp(a/1.5,0,1);i++){ ang+=(r()-0.5)*0.5; x+=Math.cos(ang); y+=Math.sin(ang)*0.8; const c=i%7?WILD[0]:WILD[1]; dot(x,y,c); dot(x-Math.cos(ang)*.5,y-Math.sin(ang)*.4,c); } }
  // ovi
  door(cx,cy+40,40,64,a,clamp(a/0.8,0,1));
  rect(cx-24,cy+40,48,2,P.lamp);
  // symbiontin rihmat palaavat oveen löytöjen kanssa
  const back=clamp((a-0.6)/1.6,0,1);
  res.loot.forEach((o,k)=>{
    const sx=k%2?W+10:-10, sy=40+k*50, ex=cx+(k%2?6:-6), ey=cy+10;
    const px0=sx+(ex-sx)*back, py0=sy+(ey-sy)*back;
    for(let i=0;i<=80;i++){ const f=i/80, x=sx+(px0-sx)*f+Math.sin(f*9+a*2+k)*4, y=sy+(py0-sy)*f;
      if (BAYER[i&3][k&3]<12) dot(x,y,i%3?SYM:'#34b8ac'); }
    const pal=lootPal(o); rect(px0-2,py0-2,5,5,pal[0]); rect(px0-1.5,py0-1.5,4,4,pal[1]); rect(px0-1,py0-1.5,2,1,pal[2]);
  });
  const done=a>2.6;
  if (!done){ textC('SYMBIONTTI PALAA...',cx,30,P.uiD); hit(0,0,W,336,()=>{ R.t0-=3000; }); return; }
  // hehku oven ympärillä
  const pulse=0.5+0.5*Math.sin(a*3);
  for(let y=-50;y<=50;y+=.5) for(let x=-60;x<=60;x+=.5){ const d=Math.hypot(x/60,y/50); if(d>1||d<0.75) continue;
    if(bay(cx+x,cy+y)<(1-d)*60*pulse) dot(cx+x,cy+8+y,SYM); }
  textC('SYMBIONTTI PALASI',cx,26,SYM,2);
  text(res.tyyppi==='syva'?'SYVÄ RETKI':'LYHYT RETKI',4,4,P.uiD);
  let y=222;
  res.loot.forEach(o=>{ textC(retki.lootName(o),cx,y,lootCol(o)); y+=10;
    if (o.first){ textC('UUSI KANTA KANTAKIRJAAN!',cx,y,AMB[2]); y+=10; }
    if (o.kind==='vessel'){ textC('HARVINAINEN ASTIA. ASETA SE RUUTUUN.',cx,y,P.uiD); y+=10; }
    if (o.kind==='spore' && o.key.includes('~')){ textC('MUTAATIOHERKKÄ VILLI KANTA',cx,y,AMB[1]); y+=10; } });
  button(cx-34,300,68,14,'JATKA',()=>ctx.close(),'a');
}
