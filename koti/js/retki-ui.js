// rihmaretken näkymät: oven modaali (TP5). Paluun paljastus on reveal.js:ssä (TP7). TP4:n isometrisessä huoneessa ovi on napautuskohde,
// joka avaa saman modaalin: U.modal={type:'retki'}.
import {P, AMB, WILD, SYM, STRAINS, VESSELS} from './data.js';
import {W, px, dot, bay, bevel, rect, rng, BAYER, clamp, text, textC, tw, wrap, button, hit, bar} from './gfx.js';
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
    button(X+16,y,WW-32,18,'OTA LÖYDÖT VASTAAN',()=>ctx.reveal(),'a');
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
    y+=38;
  }
}

