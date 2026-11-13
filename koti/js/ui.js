// näkymät, modaalit ja paljastus
import {P, AMB, WILD, SYM, VESSELS, DEVICES, STRAINS, STRAIN_ORDER, ORIGIN_TXT, RECIPES, SHOP, CUR, ORDER, ROOMS, VERSION, SELL_BASE, LAB_UNLOCK_SOLD, FRAME, FRAME_ORDER, PRODUCTS, WAVES, TENDER} from './data.js';
import {W, H, g, px, rect, rng, BAYER, clamp, ease, text, textC, tw, wrap, wrapLines, fmt, button, hit, bar, vitalRect, HIT, resetHit} from './gfx.js';
import {S, save, strain, replaceState, newGame} from './state.js';
import * as sim from './sim.js';
import {on} from './events.js';
import {vesselV} from './room.js';
import {drawIso, pickAt, toLayer, cellBoxUi, startTransition, startZoom, zoomActive, ZOOM} from './iso.js';
import {emit} from './events.js';
import {drawXsec} from './xsec.js';
import * as retki from './retki.js';
import {drawRetkiModal, drawRetkiReveal, timeLeft} from './retki-ui.js';

export const U = {doorGlow:false, view:'room', sel:null, modal:null, build:false, pick:null, msg:'', msgT:-1e9, msgCol:P.ui3, rev:null, burst:null};
const now=()=>performance.now();
export function toast(m){ U.msg=m; U.msgT=now(); U.msgCol=P.ui3; }
export function say(m){ U.msg=m; U.msgT=now()+4000; U.msgCol=SYM; }     // symbiontin vihje näkyy pidempään
// ---------- ääni ----------
let AC=null;
export function audioInit(){ if(AC) return; try { AC=new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} }
function tone(f,t0,dur,vol,type){ const o=AC.createOscillator(), gg=AC.createGain(); o.type=type||'sine'; o.frequency.value=f;
  gg.gain.setValueAtTime(0.0001,t0); gg.gain.exponentialRampToValueAtTime(vol,t0+0.01); gg.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(gg).connect(AC.destination); o.start(t0); o.stop(t0+dur+0.05); }
export function sound(kind){ if(!AC) return; const t=AC.currentTime;
  if (kind==='coin'){ tone(1319,t,0.08,0.05,'square'); tone(1760,t+0.07,0.18,0.05,'square'); }
  else if (kind==='harvest'){ [659,880].forEach((f,k)=>tone(f,t+k*0.08,0.5,0.05)); }
  else if (kind==='reveal'){ [392,523,659,784,1047].forEach((f,k)=>tone(f,t+k*0.11,1.2,0.05)); }
  else if (kind==='fail'){ [330,277].forEach((f,k)=>tone(f,t+k*0.15,0.6,0.04,'triangle')); } }
// tapahtumaväylän kuuntelijat: viesti paneeliin, symbiontin vihje ja ääni
on('*',(d)=>{ if (d.vihje) say(d.vihje); else if (d.viesti) toast(d.viesti); });
const SOUND_OF = {korjuu:'harvest', itiot:'harvest', 'laite-keruu':'harvest', myynti:'coin', osto:'coin', toimitus:'coin', 'tilaus-valmis':'coin', virstanpylvas:'coin', virhe:'fail'};
on('*',(d,name)=>{ if (SOUND_OF[name]) sound(SOUND_OF[name]); });
on('tilaus-valmis',(d)=>{ if (d.lahde!=='taulu') startReveal({kind:'done'}); });

export function startReveal(res){ U.rev={res, t0:now()}; U.modal=null; U.view='reveal'; sound(res.kind==='fail'?'fail':'reveal'); }
export function openHautomo(dev){ const res=sim.openDish(dev); if(res) startReveal(res); }

// ---------- yläpalkki ja paneeli ----------
function topBar(){
  rect(0,0,W,13,P.ui0); rect(0,13,W,1,P.ui2);
  const title = U.view==='vessel'&&U.sel ? 'SOLMU > '+VESSELS[U.sel.c.type].name : U.view==='book' ? 'SOLMU > KANTAKIRJA' : 'SOLMU > '+ROOMS[S.cur].name;
  text(title,4,4,P.ui3);
  const res=Math.floor(S.hopea)+' '+CUR; text(res,W-4-tw(res),4,AMB[2]);
  hit(0,0,W,13,()=>{ U.modal={type:'settings'}; });
}
function panel(lines){
  rect(0,272,W,64,P.ui0); rect(0,272,W,1,P.ui2);
  const age=now()-U.msgT;
  if (U.msg && age<7000) wrap(U.msg,5,278,182,U.msgCol);
  else if (lines) lines();
}
function hint(){
  const cells=[]; for (const r in S.rooms) if (S.rooms[r].owned) S.rooms[r].cells.forEach(c=>{ if(c) cells.push(c); });
  const vs=cells.filter(c=>c.kind==='vessel');
  if (U.build) return U.pick ? 'NAPAUTA RUUTUA, JOHON SIIRRÄT. VAIHDA TILAA, JOS HALUAT VIEDÄ SEN TOISEEN TILAAN.' : 'RAKENNUSTILA: NAPAUTA ESINETTÄ, JONKA HALUAT SIIRTÄÄ.';
  if (cells.some(c=>c.kind==='device'&&c.done)) return 'LAITE ON VALMIS. NAPAUTA HEHKUVAA RUUTUA.';
  const rs=retki.status(); if (rs&&rs.back) return 'SYMBIONTTI PALASI RETKELTÄ. NAPAUTA OVEA.';
  if (vs.some(c=>c.ready)) return 'SATO ON VALMIS. NAPAUTA HEHKUVAA ASTIAA.';
  if (!vs.some(c=>c.strain)) return 'TERRAARIO ODOTTAA. NAPAUTA SITÄ JA ISTUTA SINIHELTTA.';
  if (vs.some(c=>c.strain&&c.moist<0.1)) return 'JOKU KANTA ON HORROKSESSA. SUMUTA SE, NIIN SE HERÄÄ.';
  if (S.vesselInv.length||S.deviceInv.length) return 'UUSI ESINE ODOTTAA. NAPAUTA VAPAATA RUUTUA.';
  const sp=S.market.spike; if (sp && sim.owned(sp.id)>0) return 'KYSYNTÄPIIKKI: '+sim.prodName(sp.id)+' ×2. AVAA MARKKINA.';
  if (S.order && !S.flags.done) return 'TILAUS: '+S.order.given+' / '+S.order.need+' ITIÖSUODATINTA TORIN VÄELLE.';
  if (Object.keys(S.inv).some(k=>k.startsWith('raw:'))) return 'SATO ODOTTAA VARASTOSSA. MYY SE MARKKINALLA.';
  if (retki.retkiOpen() && !rs && !S.retki.n) return 'OVI ON AUKI. LÄHETÄ SYMBIONTTI RETKELLE: NAPAUTA OVEA.';
  if (S.board.some(o=>!o.given && sim.boardHave(o)>=o.n)) return 'VOIT TÄYTTÄÄ TILAUKSEN TORIN TAULULTA. AVAA MARKKINA.';
  const st=sim.chainStep();
  if (st && st.id==='myy') return 'TAVOITE: '+st.txt+' ('+Math.min(S.sold,LAB_UNLOCK_SOLD)+' / '+LAB_UNLOCK_SOLD+').';
  if (st && st.id!=='tilaus') return 'TAVOITE: '+st.txt+'.';
  return 'RISTEYTÄ KANTOJA HAUTOMOSSA. KANTAKIRJA KERTOO, MITÄ PUUTTUU.';
}
// lupausnäkymä: kellonaika, jolloin asia valmistuu
export function clock(gameSec){ const d=new Date(Date.now()+gameSec/S.speed*1000); return d.getHours()+'.'+String(d.getMinutes()).padStart(2,'0'); }
function promiseLine(){ const up=sim.upcoming().slice(0,2); if (!up.length) return '';
  return 'SEURAAVAKSI: '+up.map(o=>o.mita+' '+clock(o.t)).join(' · '); }

// ---------- huone ----------
function anyPlaceable(){ return S.vesselInv.length+S.deviceInv.length>0; }
function drawRoom(t){
  const r=S.cur;
  U.doorGlow=doorGlow();
  drawIso(t,{placeable: U.build ? !!U.pick : anyPlaceable(), pick:U.pick, doorGlow:U.doorGlow});
  hit(0,14,W,258,(x,y)=>{ const [lx,ly]=toLayer(x,y), p=pickAt(lx,ly); if(!p) return;
    if (p.kind==='cell') tapCell(p.r,p.i); else tapSpot(p.id); });
  panel(()=>{ wrap(hint(),5,278,182,P.uiD); const pl=promiseLine(); if (pl) text(pl,5,307,SYM); });
  const cellar=S.rooms.kellari.owned, bw=cellar?45:60, gap=2;
  let bx=4;
  const spikeOwned = S.market.spike && sim.owned(S.market.spike.id)>0;
  const orderReady = S.order && !S.flags.done && (S.inv.suodatin||0)>0;
  const boardReady = orderReady || S.board.some(o=>!o.given && sim.boardHave(o)>=o.n);
  button(bx,318,bw,14,'MARKKINA',()=>{ U.modal={type:'market',tab:boardReady?'board':'sell',page:0}; }, (spikeOwned||boardReady)?'a':'n'); bx+=bw+gap;
  button(bx,318,bw,14,'KANNAT',()=>{ U.view='book'; }); bx+=bw+gap;
  button(bx,318,bw,14,U.build?'VALMIS':'RAKENNA',()=>{ U.build=!U.build; U.pick=null; }, U.build?'g':'n'); bx+=bw+gap;
  if (cellar) button(bx,318,W-4-bx,14,r==='huone'?'KELLARI':'HUONE',()=>switchRoom());
}
export function switchRoom(){ if(!S.rooms.kellari.owned) return; const from=S.cur; S.cur = S.cur==='huone'?'kellari':'huone'; startTransition(from,S.cur); save(); }
// tilan erikoiskohteet: ovi (rihmaretki, TP5 kuuntelee tapahtumaa 'ovi') ja kellarin tikkaat
function tapSpot(id){
  if (U.build) return;
  if (id==='tikkaat') switchRoom();
  else if (id==='ovi') emit('ovi',{});
}
// ovi avaa rihmaretken (TP5), kun ensimmäinen myynti on tehty
on('ovi',()=>{ if (retki.retkiOpen() || retki.status()) U.modal={type:'retki'}; else toast('OVI JOHTAA ULOS RIHMASTOON. RETKI AVAUTUU ENSIMMÄISEN MYYNNIN JÄLKEEN.'); });
// oven hehku: 'amb' = symbiontti palasi (tee tämä nyt), true = ovi auki ja vapaa
function doorGlow(){ const rs=retki.status(); return rs&&rs.back ? 'amb' : (!rs && retki.retkiOpen() ? true : false); }
function tapCell(r,i){
  const c=S.rooms[r].cells[i];
  if (U.build){
    if (U.pick){ if (U.pick.r===r && U.pick.i===i){ U.pick=null; return; } sim.move(U.pick.r,U.pick.i,r,i); U.pick=null; toast('SIIRRETTY'); return; }
    if (c) U.pick={r,i}; return;
  }
  if (!c){ if (anyPlaceable()) U.modal={type:'place',r,i}; else toast('TYHJÄ RUUTU. OSTA ASTIOITA JA LAITTEITA MARKKINALTA.'); return; }
  if (c.kind==='vessel'){ startZoom(1,cellBoxUi(r,i)); U.sel={c,r,i}; U.view='vessel'; return; }
  if (c.done){ if (c.type==='hautomo') openHautomo(c); else sim.collectDevice(c); return; }
  U.modal={type:'device', c, r, i, pickA:null};
}

// ---------- astia ----------
function drawVessel(t){
  const vs=U.sel&&U.sel.c; if(!vs||S.rooms[U.sel.r].cells[U.sel.i]!==vs){ U.view='room'; return; }
  const V=VESSELS[vs.type], T=strain(vs.strain);
  // poikkileikkaus piirretään omaan kerrokseen (xsec.js), puskurin keskiosa jää läpinäkyväksi
  drawXsec(vs, t, vesselV(vs), {ready:vs.ready||vs.waves>0, burst: U.burst ? (now()-U.burst)/700 : -1});
  panel(()=>{
    text(V.name+'  '+(V.wet?'KOSTEA':'KUIVA')+' / '+(V.warm?'LÄMMIN':'VIILEÄ')+(U.sel.r==='kellari'?'  KELLARI':''),5,278,P.uiD);
    text(T?T.name:'TYHJÄ',5,287,T?(T.mutant?AMB[2]:T.col[2]):P.ui3);
  });
  text('KOSTEUS',5,297,P.ui3); bar(46,297,vs.moist, vs.moist<0.25?P.red:P.wa2);
  const w=sim.waves(vs);
  if (T && !T.auto){ text('KASVU',5,305,P.ui3); bar(46,305,w>=WAVES?1:vs.growth, w>=WAVES?AMB[1]:T.col[1]);
    for(let k=0;k<WAVES;k++) rect(108+k*4,305,3,5,k<w?AMB[2]:P.ui1); }
  const care=sim.tended()[U.sel.r+':'+U.sel.i];
  if (T){ const m=sim.matchOf(vs,vs.strain); text(['HUONO ASTIA','KELPO ASTIA','TÄYDELLINEN'][m],116,297, m===2?P.grn:m===1?P.ui3:P.red);
    if (vs.moist<0.1) text('HORROS',124,305,P.wa2); else if (T.auto) text('HOITAA NAAPUREITA',124,305,T.col[2]);
    else if (care) text('HOITAJA +'+Math.round((TENDER.grow-1)*100)+'%',124,305,STRAINS.hoitaja.col[2]); }
  button(4,318,24,14,'<',()=>{ const s=U.sel; startZoom(-1,s?cellBoxUi(s.r,s.i):null); U.view='room'; });
  button(30,318,38,14,'SUMUTA',()=>sim.mist(vs), (vs.strain&&vs.moist<0.35&&V.dry>0)?'g':(V.dry>0?'n':'d'));
  if (!T) button(70,318,118,14,'ISTUTA',()=>{ U.modal={type:'plant',vs}; }, Object.keys(S.spores).length?'a':'d');
  else if (w){ button(70,318,76,14,w>1?'KORJAA '+w+' AALTOA':'KORJAA SATO',()=>{ sim.harvest(vs); U.burst=now(); },'a'); button(148,318,40,14,'ITIÖT',()=>{ sim.takeSpores(vs); U.burst=now(); },'n'); }
  else { button(70,318,72,14, vs.moist<0.1?'HORROKSESSA':(T.auto?'HOITAA':'KASVAA '+Math.floor(vs.growth*100)+'%'),()=>{},'d');
         button(144,318,44,14,'KOMPOSTI',()=>{ U.modal={type:'confirmClear',vs}; }); }
}

// ---------- kantakirja ----------
function drawBook(t){
  rect(0,14,W,258,P.bg1);
  textC('KANTAKIRJA',W/2,20,AMB[2]);
  let y=30;
  const keys=STRAIN_ORDER.slice(); for (const k in S.known) if (k.includes('~')) keys.push(k);
  const PER=9, pages=Math.ceil(keys.length/PER); U.bookPage=Math.min(U.bookPage||0,pages-1);
  keys.slice(U.bookPage*PER,(U.bookPage+1)*PER).forEach(k=>{
    const T=strain(k), kn=!!S.known[k];
    rect(4,y,W-8,24,P.ui0); rect(4,y,W-8,1,P.ui1);
    // pieni sieni-ikoni
    const ix=16, iy=y+18;
    if (kn){ rect(ix,iy-6,1,6,P.st1); rect(ix-4,iy-9,9,3,T.col[1]); rect(ix-3,iy-10,7,1,T.col[2]); if(T.mutant) px(ix+5,iy-11,AMB[2]); }
    else textC('?',ix,iy-9,P.uiD);
    text(kn?T.name:'???',30,y+4,kn?(T.mutant?AMB[2]:T.col[2]):P.uiD);
    if (kn && !T.auto && !T.mutant){ const pr=fmt(T.price)+' H'; text(pr,W-8-tw(pr),y+4,P.uiD); }
    let sub;
    if (kn){ sub=(T.wet?'KOSTEA':'KUIVA')+' / '+(T.warm?'LÄMMIN':'VIILEÄ')+'  '+T.txt;
      if (T.mutant) sub=T.perk==='grow'?'MUTAATIO: KASVU +25%':'MUTAATIO: SATO +1'; }
    else { const rec=RECIPES.find(r=>r.out===k);
      if (rec){ const a=S.known[rec.a]?STRAINS[rec.a].name:null, b=S.known[rec.b]?STRAINS[rec.b].name:null;
        sub = 'RISTEYTYS: '+(a||'???')+' × '+(a&&b?'???':(b||'???')); }
      else sub = ORIGIN_TXT[k]||''; }
    text(sub,30,y+13,P.uiD);
    y+=26;
  });
  const tried=Object.keys(S.tried).length; text('KOKEILTUJA YHDISTELMIÄ: '+tried,6,264,P.uiD);
  if (pages>1) button(W-34,318,30,14,(U.bookPage+1)+'/'+pages,()=>{ U.bookPage=(U.bookPage+1)%pages; });
  panel(()=>wrap('UUSIA KANTOJA SYNTYY, KUN KAKSI ITIÖPUSSIA KYPSYY SAMALLA AGAR-MALJALLA HAUTOMOSSA.',5,278,182,P.uiD));
  button(4,318,60,14,'< TAKAISIN',()=>{ U.view='room'; });
}

// ---------- paljastus ----------
function drawReveal(t){
  const R=U.rev, a=(now()-R.t0)/1000, res=R.res;
  if (res.kind==='retki'){ drawRetkiReveal(R,a,{close:()=>{ U.view='room'; U.rev=null; }}); return; }
  rect(0,0,W,H,'#06080c');
  const cx=W/2, cy=130;
  if (res.kind==='done'){ // tilaus täytetty
    for(let k=0;k<60;k++){ const r=rng(k)(); const ang=k*0.7+a*0.3, rr=(a*40+k*7)%140; px(cx+Math.cos(ang)*rr, cy+Math.sin(ang)*rr*0.8, k%3?SYM:AMB[2]); }
    if (a>0.8) textC('V1 LÄPÄISTY',cx,cy-10,AMB[2],2);
    if (a>1.6) wrap('TORIN VÄKI SAI SUODATTIMENSA. +'+ORDER.reward+' '+CUR+'.',16,cy+20,160,P.ui3);
    if (a>2.2){ button(cx-34,290,68,14,'JATKA',()=>{ U.view='room'; U.rev=null; },'a'); }
    return;
  }
  const A=strain(res.a), B=strain(res.b);
  // malja
  const lid = clamp((a-0.5)/0.8,0,1);
  for(let y=-26;y<=26;y++) for(let x=-40;x<=40;x++){ const d=(x*x)/(40*40)+(y*y)/(26*26); if(d>1) continue;
    px(cx+x,cy+y, d>0.86?'#9a9480':'#2a2620'); }
  // rihmasto kasvaa kahdesta pisteestä
  const grow=clamp((a-1.2)/1.6,0,1), fail=res.kind==='fail', wild=res.kind==='villi';
  const r1=rng(7), r2=rng(9);
  for(const [sx,T,r] of [[cx-16,A,r1],[cx+16,B,r2]]){
    for(let n=0;n<14;n++){ let x=sx, y=cy, ang=r()*6.28; const len=Math.floor(grow*22*(0.6+r()*0.6));
      for(let i=0;i<len;i++){ ang+= (r()-0.5)*0.6; x+=Math.cos(ang); y+=Math.sin(ang)*0.7;
        if (fail && Math.abs(x-cx)<5) break;
        const col = wild && i>len*0.5 ? WILD[1] : T.col[i%3===0?2:1]; px(x,y,col); } }
  }
  // kansi nousee
  const ly=cy-30-lid*50;
  if (lid<1) for(let x=-42;x<=42;x++){ if(BAYER[ly&3][(cx+x)&3]<16*(1-lid)+1){ px(cx+x,ly,'#d8d0b8'); if(Math.abs(x)<40) px(cx+x,ly+1,'#8a846e'); } }
  if (a<0.5) textC('MALJA AUKEAA...',cx,cy+44,P.uiD);
  const done=a>3;
  if (done){
    if (res.kind==='new'){ const T=strain(res.key);
      const pulse=0.5+0.5*Math.sin(a*3);
      for(let y=-34;y<=34;y++) for(let x=-50;x<=50;x++){ const d=Math.hypot(x/50,y/34); if(d>1||d<0.8) continue; if(BAYER[(cy+y)&3][(cx+x)&3]<(1-d)*60*pulse) px(cx+x,cy+y,T.mutant?AMB[2]:T.col[2]); }
      textC(res.first?'UUSI KANTA!':'ONNISTUI',cx,30,T.mutant?AMB[2]:T.col[2],2);
      wrapLines(T.name,180).forEach((l,i)=>textC(l,cx,182+i*14,T.mutant?AMB[2]:T.col[2],res.first?2:1));
      textC('+'+res.n+' ITIÖPUSSIA',cx,214,P.ui3);
      if (T.mutant) textC(T.perk==='grow'?'MUTAATIO: KASVU +25%':'MUTAATIO: SATO +1',cx,224,AMB[1]);
      if (res.hint) wrap(res.hint,10,240,172,SYM);
    } else if (fail){
      textC('EI TULOSTA',cx,30,P.uiD,2);
      wrap('RIHMASTOT HYLKIVÄT TOISIAAN. '+A.name+' JA '+B.name+' EIVÄT SOVI YHTEEN. KOKEILE TOISTA PARIA.',10,182,172,P.ui3);
    } else {
      textC('KONTAMINAATIO',cx,30,WILD[2],2);
      wrap('VILLI ITIÖ PÄÄSI MALJAAN. MALJA PILAANTUI, MUTTA SAIT VILLIN NÄYTTEEN. MARKKINA MAKSAA SIITÄ HYVIN.',10,182,172,P.ui3);
    }
    button(cx-34,300,68,14,'JATKA',()=>{ U.view='room'; U.rev=null; },'a');
  } else hit(0,0,W,H,()=>{ R.t0=now()-3100; });
  text(A.name+' × '+B.name,4,4,P.uiD);
}

// ---------- modaalit ----------
function drawModal(t){
  const m=U.modal; if(!m) return;
  for(let y=0;y<H;y++) for(let x=(y&1);x<W;x+=2) px(x,y,P.bg0);
  resetHit();
  const X=8,Y=40,WW=176,HH=250;
  rect(X,Y,WW,HH,P.ui0); rect(X,Y,WW,1,P.ui2); rect(X,Y+HH-1,WW,1,P.ui2); rect(X,Y,1,HH,P.ui2); rect(X+WW-1,Y,1,HH,P.ui2);
  let y=Y+20;
  const row=(label,right,sub,fn,ok,side,sideFn,rightCol,subCol)=>{
    const rw=WW-12-(side?38:0);
    rect(X+6,y,rw,20,ok?P.ui2:P.ui1); rect(X+6,y,rw,1,ok?P.bg4:P.ui1);
    text(label,X+10,y+4,ok?P.ui3:P.uiD); if(right) text(right,X+6+rw-4-tw(right),y+4,ok?(rightCol||P.ui3):P.uiD);
    if(sub) text(sub,X+10,y+12,subCol||(ok?P.uiD:P.ui2));
    if(ok) hit(X+6,y,rw,20,fn);
    if(side) button(X+WW-6-36,y,36,20,side,sideFn,ok?'n':'d');
    y+=23; };
  const pager=(n,per)=>{ const pages=Math.max(1,Math.ceil(n/per)); m.page=Math.min(m.page||0,pages-1);
    if(pages>1){ button(X+WW-36,Y+HH-18,30,13,'>',()=>{ m.page=(m.page+1)%pages; }); text((m.page+1)+'/'+pages,X+8,Y+HH-14,P.uiD); }
    return m.page*per; };
  const title=s=>textC(s,X+WW/2,Y+6,AMB[2]);
  const sp=S.market.spike;

  if (m.type==='market'){
    title('MARKKINA');
    const tabs=[['sell','MYY'],['buy','OSTA']]; if (S.order || S.board.length) tabs.push(['board','TAULU']);
    const boardReady=(S.order&&S.inv.suodatin>0&&!S.flags.done) || S.board.some(o=>!o.given && sim.boardHave(o)>=o.n);
    const tw_=Math.floor((WW-12-(tabs.length-1)*2)/tabs.length);
    tabs.forEach(([k,l],j)=>button(X+6+j*(tw_+2),Y+15,tw_,11,l,()=>{ m.tab=k; m.page=0; }, m.tab===k?'g':(k==='board'&&boardReady?'a':'n')));
    y=Y+31; text('HOPEAA: '+Math.floor(S.hopea),X+8,y,P.ui3);
    if (sp){ const h=Math.max(1,Math.ceil(sp.left/3600)), s2='PIIKKI ×2  '+h+' H'; text(s2,X+WW-8-tw(s2),y,AMB[1]); }
    y+=10;
    if (m.tab==='sell'){
      const ids=sim.sellables();
      if (!ids.length) wrap('EI MYYTÄVÄÄ. KORJAA SATOA TAI KASVATA SUODATTIMIA.',X+10,y,154,P.uiD);
      const first=pager(ids.length,8);
      ids.slice(first,first+8).forEach(id=>{
        const n=sim.owned(id), up=sim.unitPrice(id), nx=sim.unitPrice(id,1), spike=sp&&sp.id===id;
        const sub = '× '+n+'  '+(spike?'×2  ':'')+fmt(up)+' > '+fmt(nx);
        row(sim.prodName(id), fmt(up)+' H', sub, ()=>sim.sell(id,1), true, 'KAIKKI', ()=>sim.sell(id,n),
            spike?AMB[2]:P.ui3, spike?AMB[1]:(up<sim.basePrice(id)*0.8?'#c4428f':P.uiD));
      });
      if (ids.length) text('HINTA LASKEE 4% JOKAISESTA MYYDYSTÄ',X+8,Y+HH-32,P.uiD);
    } else if (m.tab==='buy'){
      const keys=Object.keys(SHOP).filter(k=>!SHOP[k].need||SHOP[k].need(S));
      const first=pager(keys.length,8);
      keys.slice(first,first+8).forEach(k=>{ const it=SHOP[k], p=it.price(S), own=k==='agar'?'  ('+(S.inv.agar||0)+')':'';
        row(it.name+own, p+' H', it.sub, ()=>sim.buy(k), S.hopea>=p, null, null, AMB[2]); });
      if (!S.flags.lab) wrap('MYY SATOA. MITÄ ENEMMÄN MYYT, SITÄ ENEMMÄN TORILLE TULEE.',X+10,y+4,154,P.uiD);
    } else {
      // torin taulu: ketjun tavoite, torin väen suodatintilaus ja kolme vaihtuvaa tilausta
      const st=sim.chainStep();
      if (st && st.id!=='tilaus'){ text('TAVOITE',X+10,y,P.uiD); y+=8; wrap(st.txt+(st.reward?'  +'+st.reward+' '+CUR:''),X+10,y,154,SYM); y+=12; }
      const o=S.order;
      if (o && !S.flags.done){
        row('TORIN VÄKI: SUODATTIMET',o.given+' / '+o.need,'PALKINTO '+ORDER.reward+' '+CUR+'  SINULLA '+(S.inv.suodatin||0),()=>sim.deliver(),(S.inv.suodatin||0)>0,null,null,AMB[2]);
      } else if (o) { text('TORIN VÄKI SAI SUODATTIMENSA.',X+10,y,SYM); y+=10; }
      S.board.forEach(b=>{ const have=sim.boardHave(b);
        if (b.given) row(b.n+' × '+sim.prodName(b.tuote),'VALMIS','UUSI TILAUS '+clock(S.boardNext),()=>{},false);
        else row(b.n+' × '+sim.prodName(b.tuote),b.palkkio+' H','SINULLA '+have+'  MYYNTINÄ NOIN '+Math.round(sim.quote(b.tuote,b.n)),()=>sim.deliverBoard(b.id),have>=b.n,null,null,AMB[2]); });
      if (S.board.length) text('YKSI TILAUS VAIHTUU JOKA AAMU',X+8,Y+HH-32,P.uiD);
    }
  }
  else if (m.type==='place'){
    title('ASETA RUUTUUN');
    const seen={};
    S.vesselInv.forEach(t=>{ if(seen[t]) return; seen[t]=1; const n=S.vesselInv.filter(x=>x===t).length, V=VESSELS[t];
      row(V.name,'× '+n,(V.wet?'KOSTEA':'KUIVA')+' / '+(V.warm?'LÄMMIN':'VIILEÄ')+(V.rare?'  HARVINAINEN':''),()=>{ sim.place(m.r,m.i,'vessel',t); U.modal=null; toast(V.name+' ASETETTU'); },true); });
    S.deviceInv.forEach(t=>{ if(seen[t]) return; seen[t]=1; const n=S.deviceInv.filter(x=>x===t).length, D=DEVICES[t];
      row(D.name,'× '+n,D.txt.slice(0,40),()=>{ sim.place(m.r,m.i,'device',t); U.modal=null; toast(D.name+' ASETETTU'); },true); });
  }
  else if (m.type==='plant'){
    const vs=m.vs; title('ISTUTA: '+VESSELS[vs.type].name);
    const keys=Object.keys(S.spores);
    if(!keys.length) wrap('EI ITIÖITÄ. OTA ITIÖT KYPSÄSTÄ KANNASTA TAI ETSI ULKOA.',X+10,y,154,P.uiD);
    const first=pager(keys.length,8);
    keys.slice(first,first+8).forEach(k=>{ const T=strain(k), mm=sim.matchOf(vs,k);
      row(T.short,['HUONO','KELPO','TÄYDELLINEN'][mm],'ITIÖITÄ '+S.spores[k]+'  '+(T.wet?'KOSTEA':'KUIVA')+' / '+(T.warm?'LÄMMIN':'VIILEÄ'),
        ()=>{ sim.plant(vs,k); U.modal=null; }, true, null, null, mm===2?P.grn:mm===1?P.ui3:P.red); });
  }
  else if (m.type==='confirmClear'){
    title('KOMPOSTOI KASVUSTO?');
    wrap('KANTA PALAA MULTAAN, JA ASTIA TYHJENEE UUTTA ISTUTUSTA VARTEN. ITIÖITÄ EI SAA TAKAISIN.',X+10,y,154,P.ui3); y+=40;
    row('KOMPOSTOI','',null,()=>{ sim.clearVessel(m.vs); U.modal=null; toast('ASTIA ON TYHJÄ'); },true);
  }
  else if (m.type==='device'){
    const d=m.c, D=DEVICES[d.type]; title(D.name);
    wrap(D.txt,X+10,y,154,P.uiD); y+=18;
    if (d.busy){
      const left=(1-d.t)*sim.devTime(d)/S.speed, mins=Math.ceil(left/60);
      text(d.type==='hautomo'&&d.dish?strain(d.dish.a).name+' ×':'',X+10,y,P.ui3);
      if (d.type==='hautomo'&&d.dish) text(strain(d.dish.b).name,X+10,y+8,P.ui3);
      if (d.type==='kehikko'){ const F=FRAME[d.job||'kalvo']; text(STRAINS[d.job||'kalvo'].name+' > '+PRODUCTS[F.out].name,X+10,y,P.ui3); }
      y+=20; bar(X+10,y,d.t,AMB[1]); text(mins>=60?Math.floor(mins/60)+' H '+(mins%60)+' MIN':mins+' MIN',X+76,y,P.uiD); y+=12;
    } else if (d.type==='hautomo'){
      const ag=S.inv.agar||0; text('AGAR-MALJOJA: '+ag,X+10,y,ag?P.ui3:P.red); y+=10;
      if (!ag){ wrap('OSTA AGAR-MALJOJA MARKKINALTA.',X+10,y,154,P.uiD); }
      else {
        text(m.pickA?'VALITSE TOINEN KANTA':'VALITSE ENSIMMÄINEN KANTA',X+10,y,AMB[1]); y+=10;
        const keys=Object.keys(S.spores).filter(k=>k!==m.pickA);
        if (m.pickA) { text(strain(m.pickA).name+' ×',X+10,y,strain(m.pickA).col[2]); y+=10; }
        if (!keys.length) wrap('TARVITSET KAHDEN ERI KANNAN ITIÖT. OTA ITIÖT KYPSISTÄ KANNOISTA.',X+10,y,154,P.uiD);
        const first=pager(keys.length,6);
        keys.slice(first,first+6).forEach(k=>{ const T=strain(k);
          const tried = m.pickA && S.tried[[m.pickA.split('~')[0],k.split('~')[0]].sort().join('+')];
          row(T.short,'× '+S.spores[k], tried?'KOKEILTU PARI':(T.wet?'KOSTEA':'KUIVA')+' / '+(T.warm?'LÄMMIN':'VIILEÄ'), ()=>{
            if (!m.pickA){ m.pickA=k; m.page=0; return; }
            if (sim.startDish(d,m.pickA,k)) U.modal=null; }, true, null, null, T.mutant?AMB[2]:T.col[2]); });
      }
    } else if (d.type==='kehikko'){
      text('VALITSE KANTA JA MUOTO',X+10,y,AMB[1]); y+=10;
      FRAME_ORDER.filter(k=>S.known[k]).forEach(k=>{ const F=FRAME[k], have=S.inv['raw:'+k]||0, m=Math.round(F.time/60);
        const aika=(m>=60?Math.floor(m/60)+' H':'')+(m%60?' '+(m%60)+' MIN':'');
        row(PRODUCTS[F.out].name, have+' / '+F.need, STRAINS[k].name+' '+aika+'  '+SELL_BASE[F.out]+' '+CUR,
          ()=>{ if (sim.startFrame(d,k)) U.modal=null; }, have>=F.need, null, null, AMB[2]); });
      wrap('SATO KASVAA KEHIKKOON ELÄVÄKSI TUOTTEEKSI. TUOTE ON ARVOKKAAMPI KUIN SATO.',X+10,Y+HH-46,154,P.uiD);
    }
  }
  else if (m.type==='retki') drawRetkiModal(m,X,Y,WW,HH,t,{close:()=>{ U.modal=null; }, reveal:res=>startReveal({kind:'retki', ...res})});
  else if (m.type==='settings'){
    title('ASETUKSET');
    row('NOPEUS', S.speed===60?'×60 TESTI':'×1 OIKEA','KASVU OIKEASSA AJASSA TAI 60X',()=>{ S.speed = S.speed===60?1:60; save(); },true);
    if (window.SOLMU_PWA) row('TALLENNUS JA ASENNUS','','VIENTI, TUONTI JA ASENNUSOHJE',()=>{ U.modal=null; window.SOLMU_PWA.open(); },true);
    row('UUSI PELI','','POISTAA TALLENNUKSEN',()=>{ U.modal={type:'confirmReset'}; },true);
    y+=4; text(VERSION,X+10,y,P.uiD);
  }
  else if (m.type==='confirmReset'){
    title('ALOITA ALUSTA?');
    row('KYLLÄ, UUSI PELI','',null,()=>{ replaceState(newGame()); U.modal=null; U.view='room'; U.sel=null; save(); toast('UUSI PELI ALOITETTU'); },true);
  }
  button(X+WW/2-30,Y+HH-18,60,13,'SULJE',()=>{ U.modal=null; });
}

export function render(ms){
  const t=ms/1000; resetHit(); g.clearRect(0,0,W,H);
  // poikkileikkaukseen zoomatessa huone näkyy taustalla
  if (U.view==='vessel' && zoomActive() && ZOOM.dir>0) drawIso(t,{});
  if (U.view==='reveal' && U.rev) drawReveal(t);
  else {
    if (U.view==='vessel') drawVessel(t); else if (U.view==='book') drawBook(t); else { U.view='room'; drawRoom(t); }
    topBar();
  }
  drawModal(t);
}
