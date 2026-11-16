// näkymät, modaalit ja paljastus
import {P, AMB, WILD, SYM, VESSELS, DEVICES, STRAINS, STRAIN_ORDER, ORIGIN_TXT, SHOP, CUR, ORDER, ROOMS, VERSION, SELL_BASE, LAB_UNLOCK_SOLD, FRAME, FRAME_ORDER, PRODUCTS, WAVES, TENDER} from './data.js';
import {W, H, LAY, COL, g, px, dot, bay, rect, rng, BAYER, clamp, ease, text, textC, tw, wrap, wrapLines, fmt, button, hit, bar, HIT, resetHit, bevel, frame, veil} from './gfx.js';
import {S, save, strain, replaceState, newGame, knows} from './state.js';
import {traitRows, kykyTxt, kasvuTxt} from './genomi.js';
import * as sim from './sim.js';
import {on} from './events.js';
import {vesselV} from './room.js';
import {drawIso, pickAt, toLayer, cellBoxUi, startTransition, startZoom, zoomActive, ZOOM} from './iso.js';
import {emit} from './events.js';
import {drawXsec} from './xsec.js';
import * as retki from './retki.js';
import {drawRetkiModal, timeLeft} from './retki-ui.js';
import * as reveal from './reveal.js';
import * as book from './book.js';
import * as opastus from './opastus.js';
import {isGuided, guideMark} from './gfx.js';

export const U = {doorGlow:false, view:'room', sel:null, modal:null, build:false, pick:null, msg:'', msgT:-1e9, msgCol:P.ui3, rev:null, burst:null};
const now=()=>performance.now();
export function toast(m){ U.msg=m; U.msgT=now(); U.msgCol=P.ui3; }
export function say(m){ U.msg=m; U.msgT=now()+4000; U.msgCol=SYM; }     // symbiontin vihje näkyy pidempään
// ---------- ääni (TP6: audio.js kuuntelee tapahtumat itse) ----------
import {init as audioStart, play, isEnabled, setEnabled, setScene} from './audio.js';
export function audioInit(){ audioStart(); }
export function sound(kind){ play(kind); }
// tapahtumaväylän kuuntelija: viesti paneeliin ja symbiontin vihje
on('*',(d)=>{ if (d.vihje) say(d.vihje); else if (d.viesti) toast(d.viesti); });
on('tilaus-valmis',(d)=>{ if (d.lahde!=='taulu') reveal.showDone(); });

// TP7: paljastus on reveal.js:ssä (malja, retki, jono); kantakirja book.js:ssä
export function openHautomo(dev){ reveal.openMalja(dev); }

// ---------- yläpalkki ja paneeli ----------
// Asettelu tulee gfx.js:n LAY-oliosta: pystyssä paneeli on huoneen alla, vaakatilassa 192 leveä sivupaneeli oikealla.
// PY() = paneelin sisällön yläreuna (vaakatilassa opastuksen vihjerivi vie tilaa yläpalkin alta).
const PY=()=>LAY.py+(LAY.land?opastus.stripH():0);
function sideBg(){ if (!LAY.land) return; const x=LAY.ox; rect(x,0,COL,H,P.ui0); rect(x-.5,0,.5,H,'#05080d'); rect(x,0,.5,H,P.ui2); }
function topBar(){
  const x0=LAY.ox, w=W-x0;
  rect(x0,0,w,13,P.ui0); rect(x0,0,w,.5,'#1a2430'); rect(x0,12.5,w,.5,'#05080d'); rect(x0,13,w,.5,P.ui2); rect(x0,13.5,w,.5,'#05080d');
  const title = U.view==='vessel'&&U.sel ? 'SOLMU > '+VESSELS[U.sel.c.type].name : U.view==='book' ? 'SOLMU > KANTAKIRJA' : 'SOLMU > '+ROOMS[S.cur].name;
  text(title,x0+4,4,P.ui3);
  const res=Math.floor(S.hopea)+' '+CUR; text(res,W-4-tw(res),4,AMB[2]);
  hit(x0,0,w,13,()=>{ U.modal={type:'settings'}; });
}
function panel(lines){
  if (!LAY.land){ rect(0,272,W,64,P.ui0); rect(0,272,W,.5,'#05080d'); rect(0,272.5,W,.5,P.ui2); rect(0,273,W,.5,'#1a2430'); }
  const age=now()-U.msgT;
  if (U.msg && age<7000) wrap(U.msg,LAY.ox+5,PY()+6,182,U.msgCol);
  else if (lines) lines();
}
// yksi lyhyt vihje kerrallaan: tärkein asia ensin
function hint(){
  const cells=[]; for (const r in S.rooms) if (S.rooms[r].owned) S.rooms[r].cells.forEach(c=>{ if(c) cells.push(c); });
  const vs=cells.filter(c=>c.kind==='vessel');
  if (U.build) return U.pick ? 'NAPAUTA RUUTUA, JOHON SIIRRÄT. TILAA VOI VAIHTAA KESKEN SIIRRON.' : 'NAPAUTA ESINETTÄ, JONKA HALUAT SIIRTÄÄ.';
  if (cells.some(c=>c.kind==='device'&&c.done)) return 'LAITE ON VALMIS. NAPAUTA SITÄ.';
  const rs=retki.status(); if (rs&&rs.back) return 'SYMBIONTTI PALASI. NAPAUTA OVEA.';
  if (vs.some(c=>c.ready)) return 'SATO ON VALMIS. NAPAUTA HEHKUVAA ASTIAA.';
  if (!vs.some(c=>c.strain)) return 'NAPAUTA TERRAARIOTA JA ISTUTA SINIHELTTA.';
  if (vs.some(c=>c.strain&&c.moist<0.1)) return 'KANTA ON HORROKSESSA. SUMUTA SE.';
  if (S.vesselInv.length||S.deviceInv.length) return 'UUSI ESINE ODOTTAA. NAPAUTA VAPAATA RUUTUA.';
  const sp=S.market.spike; if (sp && sim.owned(sp.id)>0) return 'KYSYNTÄPIIKKI: '+sim.prodName(sp.id)+' ×2. AVAA MARKKINA.';
  if (S.board.some(o=>!o.given && sim.boardHave(o)>=o.n)) return 'VOIT TÄYTTÄÄ TILAUKSEN. AVAA MARKKINA.';
  if (S.order && !S.flags.done) return 'TILAUS: '+S.order.given+' / '+S.order.need+' ITIÖSUODATINTA TORIN VÄELLE.';
  if (Object.keys(S.inv).some(k=>k.startsWith('raw:'))) return 'SATOA ON VARASTOSSA. MYY SE MARKKINALLA.';
  if (retki.retkiOpen() && !rs && !S.retki.n) return 'OVI ON AUKI. NAPAUTA SITÄ JA LÄHETÄ SYMBIONTTI RETKELLE.';
  const st=sim.chainStep();
  if (st && st.id==='myy') return 'TAVOITE: '+st.txt+' ('+Math.min(S.sold,LAB_UNLOCK_SOLD)+' / '+LAB_UNLOCK_SOLD+').';
  if (st && st.id!=='tilaus') return 'TAVOITE: '+st.txt+'.';
  return 'RISTEYTÄ KANTOJA HAUTOMOSSA. JOKAINEN MALJA VOI YLLÄTTÄÄ.';
}
// lupausnäkymä: kellonaika, jolloin asia valmistuu
export function clock(gameSec){ const d=new Date(Date.now()+gameSec/S.speed*1000); return d.getHours()+'.'+String(d.getMinutes()).padStart(2,'0'); }
function promiseLine(){ const up=sim.upcoming().slice(0,2); if (!up.length) return '';
  return 'SEURAAVAKSI: '+up.map(o=>o.mita+' '+clock(o.t)).join(' · '); }

// ---------- huone ----------
function anyPlaceable(){ return S.vesselInv.length+S.deviceInv.length>0; }
// pieni meripihkamerkki napin kulmassa: uutta katsottavaa, mutta ei kiireellistä (täysi meripihka = tee tämä nyt)
function pip(x,y){ rect(x-.5,y-.5,3,3,P.ui0); rect(x,y,2,2,AMB[1]); rect(x,y,1,1,AMB[2]); }
function drawRoom(t){
  const r=S.cur, ox=LAY.ox, by=LAY.by;
  // ovi hehkuu, kun retki on mahdollinen (syaani) tai symbiontti on palannut (meripihka)
  const rs=retki.status(); U.doorGlow = rs&&rs.back ? 'amb' : (!rs && retki.retkiOpen());
  drawIso(t,{placeable: U.build ? !!U.pick : anyPlaceable(), pick:U.pick, doorGlow:U.doorGlow, guide:opastus.isoTargets()});
  hit(0,LAY.ry,LAY.rw,LAY.rh,(x,y)=>{ const [lx,ly]=toLayer(x,y), p=pickAt(lx,ly); if(!p) return;
    if (p.kind!=='cell'){ tapSpot(p.id); return; }
    // päällekkäiset esineet: jos napautuksen alla on myös piiloon jäävä esine, kysytään kumpaa tarkoitettiin
    const cands=[{r:p.r,i:p.i},...(p.also||[])], g=cands.find(c=>isGuided('cell:'+c.r+':'+c.i));
    if (cands.length>1 && !g && !(U.build&&U.pick)) U.modal={type:'pick',list:cands}; else tapCell((g||p).r,(g||p).i); });
  sideBg();
  const pend=reveal.pending(), showPend = pend>1 || (pend && !U.build);
  // opastuksen vihje näkyy symbiontin rivillä; silloin paneelin oma vihje jää pois
  let hy=PY()+6;
  panel(()=>{ if (!opastus.current()) hy+=wrap(hint(),ox+5,hy,182,P.uiD)*8;
    if (!LAY.land){ const pl=promiseLine(); if (pl) text(pl,5,307,SYM); } });
  if (LAY.land){   // sivupaneelissa on tilaa: seuraavaksi valmistuvat asiat omina riveinään
    const up=sim.upcoming(), y0=Math.max(hy+8, PY()+44), max=Math.floor((by-(showPend?20:2)-y0-10)/9);
    if (up.length && max>0){ text('SEURAAVAKSI',ox+5,y0,P.uiD);
      up.slice(0,max).forEach((o,k)=>{ const c=clock(o.t); text(o.mita,ox+5,y0+10+k*9,SYM); text(c,W-5-tw(c),y0+10+k*9,P.ui3); }); }
  }
  // TP7: myöhemmäksi jätetyt paljastukset odottavat
  if (showPend) button(W-64,by-18,60,14,'PALJASTUS',()=>reveal.queueOnOpen(),'a');
  const cellar=S.rooms.kellari.owned, bw=cellar?45:60, gap=2;
  let bx=ox+4;
  const spikeOwned = S.market.spike && sim.owned(S.market.spike.id)>0;
  const orderReady = S.order && !S.flags.done && (S.inv.suodatin||0)>0;
  const boardReady = orderReady || S.board.some(o=>!o.given && sim.boardHave(o)>=o.n);
  button(bx,by,bw,14,'MARKKINA',()=>{ U.modal={type:'market',tab:boardReady?'board':'sell',page:0}; }, (spikeOwned||boardReady)?'a':'n'); bx+=bw+gap;
  button(bx,by,bw,14,'KANNAT',()=>book.open()); if (book.newCount()) pip(bx+bw-4.5,by+2); bx+=bw+gap;
  button(bx,by,bw,14,U.build?'VALMIS':'RAKENNA',()=>{ U.build=!U.build; U.pick=null; }, U.build?'g':'n'); bx+=bw+gap;
  if (cellar) button(bx,by,W-4-bx,14,r==='huone'?'KELLARI':'HUONE',()=>switchRoom());
}
export function switchRoom(){ if(!S.rooms.kellari.owned) return; const from=S.cur; S.cur = S.cur==='huone'?'kellari':'huone'; startTransition(from,S.cur); save(); }
// tilan erikoiskohteet: ovi (rihmaretki, TP5 kuuntelee tapahtumaa 'ovi') ja kellarin tikkaat
function tapSpot(id){
  if (U.build) return;
  if (id==='tikkaat') switchRoom();
  else if (id==='ovi') emit('ovi',{});
}
// rihmaretki (TP5): ovi avaa retkivalinnan, kun ovi on auki (ensimmäisestä myynnistä)
on('ovi',()=>{ if (retki.retkiOpen() || retki.status()) U.modal={type:'retki'}; else toast('OVI JOHTAA ULOS RIHMASTOON. RETKET AVAUTUVAT PIAN.'); });
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
const climate=T=>(T.wet?'KOSTEA':'KUIVA')+' / '+(T.warm?'LÄMMIN':'VIILEÄ');
// kannan ilmasto on kysymysmerkki, kunnes kasvu tunnetaan (ensimmäinen sato tai tutkimusmalja)
const climateK=T=>knows(T.key).g?climate(T):'ILMASTO ?';
function drawVessel(t){
  const vs=U.sel&&U.sel.c; if(!vs||S.rooms[U.sel.r].cells[U.sel.i]!==vs){ U.view='room'; return; }
  const V=VESSELS[vs.type], T=strain(vs.strain), ox=LAY.ox, py=PY(), by=LAY.by;
  // poikkileikkaus piirretään omaan kerrokseen (xsec.js), puskurin huonealue jää läpinäkyväksi
  drawXsec(vs, t, vesselV(vs), {ready:vs.ready||vs.waves>0, burst: U.burst ? (now()-U.burst)/700 : -1});
  sideBg();
  panel(()=>{
    text(V.name+'  '+climate(V)+(U.sel.r==='kellari'?'  KELLARI':''),ox+5,py+6,P.uiD);
    text(T?T.name:'TYHJÄ',ox+5,py+15,T?(T.mutant?AMB[2]:T.col[2]):P.ui3);
    if (T && T.mutant && tw(T.name)+tw(T.orig)<178) text(T.orig,ox+9+tw(T.name),py+15,P.uiD);   // mutaatio pienellä nimen perässä
  });
  text('KOSTEUS',ox+5,py+25,P.ui3); bar(ox+46,py+25,vs.moist, vs.moist<0.25?P.red:P.wa2);
  const w=sim.waves(vs);
  if (T && !T.auto){ text('KASVU',ox+5,py+33,P.ui3); bar(ox+46,py+33,w>=WAVES?1:vs.growth, w>=WAVES?AMB[1]:T.col[1]);
    for(let k=0;k<WAVES;k++){ rect(ox+108+k*4,py+33,3,5,k<w?AMB[1]:P.ui1); rect(ox+108+k*4,py+33,3,.5,k<w?AMB[2]:'#2a3646'); } }
  const care=sim.tended()[U.sel.r+':'+U.sel.i];
  if (T){ const m=sim.matchOf(vs,vs.strain), kg=knows(T.key).g; text(kg?['HUONO ASTIA','KELPO ASTIA','TÄYDELLINEN'][m]:'ILMASTO ?',ox+116,py+25, !kg?P.uiD:m===2?P.grn:m===1?P.ui3:P.red);
    if (vs.moist<0.1) text('HORROS',ox+124,py+33,P.wa2); else if (T.tends) text(T.auto?'HOITAA NAAPUREITA':'HOITAA',ox+(T.auto?5:124),py+33,T.col[2]);
    else if (care) text('HOITO +'+Math.round((sim.tendGrow(care)-1)*100)+'%',ox+124,py+33,STRAINS.hoitaja.col[2]); }
  if (LAY.land && T && by-py>100){   // sivupaneelissa on tilaa kannan tiedoille
    // piirteet ryhmittäin; tuntematon ryhmä näkyy kysymysmerkkinä (kasvu selviää sadosta, kyky tutkimusmaljasta)
    const tk=knows(T.key), rows=traitRows(T,tk).map(([a,v])=>[a,v]);
    if (tk.g && !T.auto){ const m=Math.round(T.grow/60); rows.push(['KASVUAIKA',(m>=60?Math.floor(m/60)+' H':'')+(m%60?' '+(m%60)+' MIN':'')], ['ARVO',fmt(T.price)+' '+CUR]); }
    rect(ox+5,py+46,182,.5,P.ui2);
    rows.forEach(([a,v],k)=>{ if (py+52+k*10>by-12) return; text(a,ox+5,py+52+k*10,P.uiD); text(v,ox+62,py+52+k*10,v==='?'?AMB[1]:P.ui3); });
  }
  button(ox+4,by,24,14,'<',()=>{ const s=U.sel; startZoom(-1,s?cellBoxUi(s.r,s.i):null); U.view='room'; });
  button(ox+30,by,38,14,'SUMUTA',()=>sim.mist(vs), (vs.strain&&vs.moist<0.35&&V.dry>0)?'g':(V.dry>0?'n':'d'));
  if (!T) button(ox+70,by,118,14,'ISTUTA',()=>{ U.modal={type:'plant',vs}; }, Object.keys(S.spores).length?'a':'d');
  else if (w){ button(ox+70,by,76,14,w>1?'KORJAA '+w+' AALTOA':'KORJAA SATO',()=>{ sim.harvest(vs); U.burst=now(); },'a'); button(ox+148,by,40,14,'ITIÖT',()=>{ sim.takeSpores(vs); U.burst=now(); },'n'); }
  else { button(ox+70,by,72,14, vs.moist<0.1?'HORROKSESSA':(T.auto?(T.tends?'HOITAA':'EI SATOA'):'KASVAA '+Math.floor(vs.growth*100)+'%'),()=>{},'d');
         button(ox+144,by,44,14,'KOMPOSTI',()=>{ U.modal={type:'confirmClear',vs}; }); }
}

// ---------- modaalit ----------
function drawModal(t){
  const m=U.modal; if(!m) return;
  // pystyssä ikkuna himmentää näkymän; vaakatilassa se täyttää sivupaneelin ja huone jää näkyviin (napautus huoneeseen sulkee)
  const land=LAY.land;
  if (!land) veil(P.bg0);
  resetHit();
  if (land) hit(0,0,LAY.rw,H,()=>{ U.modal=null; });
  const X=land?LAY.ox+2:8, Y=land?PY()+1:40, WW=land?COL-4:176, HH=land?H-Y-2:250, TW=WW-22;
  frame(X,Y,WW,HH);
  let y=Y+20;
  // rivejä sivulle: pystyssä kiinteä määrä, vaakatilassa niin monta kuin mahtuu SULJE-napin yläpuolelle
  const fitN=max=>land?Math.max(1,Math.min(max,Math.floor((Y+HH-20-y)/23))):max;
  const row=(label,right,sub,fn,ok,side,sideFn,rightCol,subCol)=>{
    const rw=WW-12-(side?38:0);
    if (ok) bevel(X+6,y,rw,20,'#243142',P.ui2,'#151d28','#070b11'); else bevel(X+6,y,rw,20,P.ui1,'#222f3f','#141c28','#0a0f16');
    text(label,X+10,y+4,ok?P.ui3:P.uiD); if(right) text(right,X+6+rw-4-tw(right),y+4,ok?(rightCol||P.ui3):P.uiD);
    if(sub) text(sub,X+10,y+12,subCol||(ok?P.uiD:P.ui2));
    if(ok) hit(X+6,y,rw,20,fn);
    if(side) button(X+WW-6-36,y,36,20,side,sideFn,ok?'n':'d');
    if(ok && isGuided('row:'+label)) guideMark(X+6,y,rw,20);
    y+=23; };
  const pager=(n,per)=>{ const pages=Math.max(1,Math.ceil(n/per)); m.page=Math.min(m.page||0,pages-1);
    if(pages>1){ button(X+WW-36,Y+HH-18,30,13,'>',()=>{ m.page=(m.page+1)%pages; }); text((m.page+1)+'/'+pages,X+8,Y+HH-14,P.uiD); }
    return m.page*per; };
  const title=s=>textC(s,X+WW/2,Y+6,AMB[2]);
  const sp=S.market.spike;

  if (m.type==='market'){
    if (!land) title('MARKKINA');
    const TY=land?Y+5:Y+15;
    const tabs=[['sell','MYY'],['buy','OSTA']]; if (S.order || S.board.length) tabs.push(['board','TAULU']);
    const boardReady=(S.order&&S.inv.suodatin>0&&!S.flags.done) || S.board.some(o=>!o.given && sim.boardHave(o)>=o.n);
    const tw_=Math.floor((WW-12-(tabs.length-1)*2)/tabs.length);
    tabs.forEach(([k,l],j)=>{ button(X+6+j*(tw_+2),TY,tw_,11,l,()=>{ m.tab=k; m.page=0; }, m.tab===k?'g':(k==='board'&&boardReady?'a':'n'));
      if (isGuided('tab:'+l)) guideMark(X+6+j*(tw_+2),TY,tw_,11); });
    y=TY+16;
    // hopea näkyy yläpalkissa; tässä vain kysyntäpiikki, kun sellainen on
    if (sp){ const h=Math.max(1,Math.ceil(sp.left/3600)); text('KYSYNTÄPIIKKI: '+sim.prodName(sp.id)+' ×2  '+h+' H',X+8,y,AMB[1]); y+=10; }
    if (m.tab==='sell'){
      const ids=sim.sellables();
      if (!ids.length) wrap('EI MYYTÄVÄÄ. KORJAA ENSIN SATOA.',X+10,y,TW,P.uiD);
      const per=fitN(8), first=pager(ids.length,per);
      ids.slice(first,first+per).forEach(id=>{
        const n=sim.owned(id), up=sim.unitPrice(id), spike=sp&&sp.id===id, low=up<sim.basePrice(id)*0.8;
        // yksi asia rivillä: mitä, montako ja hinta. Tila väreillä: piikki meripihkana, pudonnut hinta ruusuna.
        const sub = 'SINULLA '+n+(spike?'  KYSYNTÄPIIKKI':low?'  HINTA ALHAALLA':'');
        row(sim.prodName(id), fmt(up)+' H', sub, ()=>sim.sell(id,1), true, 'KAIKKI', ()=>sim.sell(id,n),
            spike?AMB[2]:low?'#c4428f':P.ui3, spike?AMB[1]:low?'#c4428f':P.uiD);
      });
      if (ids.length && !land) text('HINTA LASKEE 4% JOKAISESTA MYYDYSTÄ',X+8,Y+HH-32,P.uiD);
    } else if (m.tab==='buy'){
      const keys=Object.keys(SHOP).filter(k=>!SHOP[k].need||SHOP[k].need(S));
      const per=fitN(8), first=pager(keys.length,per);
      keys.slice(first,first+per).forEach(k=>{ const it=SHOP[k], p=it.price(S), own=k==='agar'?'  ('+(S.inv.agar||0)+')':'';
        row(it.name+own, p+' H', it.sub, ()=>sim.buy(k), S.hopea>=p, null, null, AMB[2]); });
      if (!S.flags.lab && y+22<Y+HH-20) wrap('MYY SATOA, NIIN TORILLE TULEE LISÄÄ OSTETTAVAA.',X+10,y+4,TW,P.uiD);
    } else {
      // torin taulu: ketjun tavoite, torin väen suodatintilaus ja kolme vaihtuvaa tilausta
      const st=sim.chainStep();
      if (st && st.id!=='tilaus'){ if (!land){ text('TAVOITE',X+10,y,P.uiD); y+=8; } wrap(st.txt+(st.reward?'  +'+st.reward+' '+CUR:''),X+10,y,TW,SYM); y+=land?10:12; }
      const o=S.order;
      if (o && !S.flags.done){
        row('TORIN VÄKI: SUODATTIMET',o.given+' / '+o.need,'PALKINTO '+ORDER.reward+' '+CUR+'  SINULLA '+(S.inv.suodatin||0),()=>sim.deliver(),(S.inv.suodatin||0)>0,null,null,AMB[2]);
      } else if (o) { text('TORIN VÄKI SAI SUODATTIMENSA.',X+10,y,SYM); y+=10; }
      S.board.forEach(b=>{ if (land && y+20>Y+HH-18) return; const have=sim.boardHave(b);
        if (b.given) row(b.n+' × '+sim.prodName(b.tuote),'VALMIS','UUSI TILAUS '+clock(S.boardNext),()=>{},false);
        else row(b.n+' × '+sim.prodName(b.tuote),b.palkkio+' H','SINULLA '+have+'  MYYNTINÄ NOIN '+Math.round(sim.quote(b.tuote,b.n)),()=>sim.deliverBoard(b.id),have>=b.n,null,null,AMB[2]); });
      if (S.board.length && !land) text('YKSI TILAUS VAIHTUU JOKA AAMU',X+8,Y+HH-32,P.uiD);
    }
  }
  else if (m.type==='place'){
    title('ASETA RUUTUUN');
    const seen={}, list=[];
    S.vesselInv.forEach(t=>{ if(seen[t]) return; seen[t]=1; const n=S.vesselInv.filter(x=>x===t).length, V=VESSELS[t];
      list.push(()=>row(V.name,'× '+n,climate(V)+(V.rare?'  HARVINAINEN':''),()=>{ sim.place(m.r,m.i,'vessel',t); U.modal=null; toast(V.name+' ASETETTU'); },true)); });
    S.deviceInv.forEach(t=>{ if(seen[t]) return; seen[t]=1; const n=S.deviceInv.filter(x=>x===t).length, D=DEVICES[t];
      list.push(()=>row(D.name,'× '+n,D.txt.slice(0,TW/3.5|0),()=>{ sim.place(m.r,m.i,'device',t); U.modal=null; toast(D.name+' ASETETTU'); },true)); });
    const per=fitN(8), first=pager(list.length,per); list.slice(first,first+per).forEach(f=>f());
  }
  else if (m.type==='plant'){
    const vs=m.vs; title('ISTUTA: '+VESSELS[vs.type].name);
    const keys=Object.keys(S.spores);
    if(!keys.length) wrap('EI ITIÖITÄ. OTA ITIÖT KYPSÄSTÄ KANNASTA TAI LÄHETÄ SYMBIONTTI RETKELLE.',X+10,y,TW,P.uiD);
    const per=fitN(8), first=pager(keys.length,per);
    keys.slice(first,first+per).forEach(k=>{ const T=strain(k), mm=sim.matchOf(vs,k), kg=knows(k).g;
      row(T.short,kg?['HUONO','KELPO','TÄYDELLINEN'][mm]:'?','ITIÖITÄ '+S.spores[k]+'  '+climateK(T),
        ()=>{ sim.plant(vs,k); U.modal=null; }, true, null, null, !kg?AMB[1]:mm===2?P.grn:mm===1?P.ui3:P.red); });
  }
  else if (m.type==='pick'){
    title('KUMPI?');
    m.list.forEach((q,k)=>{ const c=S.rooms[q.r].cells[q.i]; if (!c) return;
      const ves=c.kind==='vessel', T=ves&&strain(c.strain), hot=ves?(c.ready||c.waves>0):c.done;
      const sub = ves ? (T?T.name+(hot?'  SATO VALMIS':c.moist<0.1?'  HORROS':''):'TYHJÄ') : (c.done?'VALMIS':c.busy?'TYÖSSÄ':'VAPAA');
      row((ves?VESSELS:DEVICES)[c.type].name, k?'TAKANA':'EDESSÄ', sub, ()=>{ U.modal=null; tapCell(q.r,q.i); }, true, null, null, P.uiD, hot?AMB[2]:T?T.col[2]:P.uiD); });
  }
  else if (m.type==='confirmClear'){
    title('KOMPOSTOI KASVUSTO?');
    wrap('KANTA PALAA MULTAAN JA ASTIA TYHJENEE. ITIÖITÄ EI SAA TAKAISIN.',X+10,y,TW,P.ui3); y+=28;
    row('KOMPOSTOI','',null,()=>{ sim.clearVessel(m.vs); U.modal=null; toast('ASTIA ON TYHJÄ'); },true);
  }
  else if (m.type==='device'){
    const d=m.c, D=DEVICES[d.type]; title(D.name);
    if (!land){ wrap(D.txt,X+10,y,TW,P.uiD); y+=18; }
    if (d.busy){
      const left=(1-d.t)*sim.devTime(d)/S.speed, mins=Math.ceil(left/60);
      if (d.type==='hautomo'&&d.dish&&d.dish.study){ text('TUTKIMUS:',X+10,y,P.ui3); text(strain(d.dish.a).name,X+10,y+8,strain(d.dish.a).col[2]); }
      else if (d.type==='hautomo'&&d.dish){ text(strain(d.dish.a).name+' ×',X+10,y,P.ui3); text(strain(d.dish.b).name,X+10,y+8,P.ui3); }
      if (d.type==='kehikko'){ const F=sim.frameOf(d.job||'kalvo')||FRAME.kalvo; text(strain(d.job||'kalvo').short+' > '+PRODUCTS[F.out].name,X+10,y,P.ui3); }
      y+=20; bar(X+10,y,d.t,AMB[1]); text(mins>=60?Math.floor(mins/60)+' H '+(mins%60)+' MIN':mins+' MIN',X+76,y,P.uiD); y+=12;
    } else if (d.type==='hautomo'){
      const ag=S.inv.agar||0; text('AGAR-MALJOJA: '+ag,X+10,y,ag?P.ui3:P.red); y+=10;
      if (!ag){ wrap('OSTA AGAR-MALJOJA MARKKINALTA.',X+10,y,TW,P.uiD); }
      else {
        text(m.pickA?'VALITSE TOINEN KANTA':'VALITSE KANTA',X+10,y,AMB[1]); y+=10;
        const keys=Object.keys(S.spores).filter(k=>k!==m.pickA);
        if (m.pickA) { text(strain(m.pickA).name+' ×',X+10,y,strain(m.pickA).col[2]); y+=10; }
        // tutkimusmalja: yksi kanta yksin maljalle paljastaa sen kysymysmerkit
        const study = m.pickA && sim.unknownTraits(m.pickA);
        if (study) row('TUTKI TÄMÄ KANTA','2 H','PALJASTAA KYVYN JA KASVUN',()=>{ if (sim.startStudy(d,m.pickA)) U.modal=null; },true,null,null,AMB[2],SYM);
        if (!keys.length && !study) wrap(m.pickA?'RISTEYTYKSEEN TARVITSET TOISEN KANNAN ITIÖT. OTA ITIÖT KYPSISTÄ KANNOISTA.':'TARVITSET ITIÖPUSSEJA. OTA ITIÖT KYPSISTÄ KANNOISTA.',X+10,y,TW,P.uiD);
        const per=fitN(study?5:6), first=pager(keys.length,per);
        keys.slice(first,first+per).forEach(k=>{ const T=strain(k), tk=knows(k);
          const tried = m.pickA && S.tried[sim.pairKey(m.pickA,k)];
          const sub = tried==='ok'?'TUTTU PARI: UUSI MALJA VOI ANTAA TOISEN':(tk.k?kykyTxt(T):'KYKY ?')+'  '+(tk.g?kasvuTxt(T):'KASVU ?');
          row(T.short,'× '+S.spores[k], sub, ()=>{
            if (!m.pickA){ m.pickA=k; m.page=0; return; }
            if (sim.startDish(d,m.pickA,k)) U.modal=null; }, true, null, null, T.mutant?AMB[2]:T.col[2]); });
      }
    } else if (d.type==='kehikko'){
      text('VALITSE KANTA JA MUOTO',X+10,y,AMB[1]); y+=10;
      // kelpaavat kannat: muoto ratkaisee tuotteen (lakki, ryväs, verkko). Ensin ne, joista satoa on tarpeeksi.
      const fk=Object.keys(S.known).filter(k=>strain(k)&&sim.frameOf(k)&&(STRAINS[k]||(S.inv['raw:'+k]||0)>0))
        .sort((a,b)=>((S.inv['raw:'+b]||0)>=sim.frameOf(b).need)-((S.inv['raw:'+a]||0)>=sim.frameOf(a).need) || (S.inv['raw:'+b]||0)-(S.inv['raw:'+a]||0));
      const perF=fitN(6), firstF=pager(fk.length,perF);
      fk.slice(firstF,firstF+perF).forEach(k=>{ const F=sim.frameOf(k), have=S.inv['raw:'+k]||0, m=Math.round(F.time/60);
        const aika=(m>=60?Math.floor(m/60)+' H':'')+(m%60?' '+(m%60)+' MIN':'');
        row(PRODUCTS[F.out].name, have+' / '+F.need, strain(k).short+' '+aika+'  '+SELL_BASE[F.out]+' '+CUR,
          ()=>{ if (sim.startFrame(d,k)) U.modal=null; }, have>=F.need, null, null, AMB[2]); });
      if (!land) wrap('SATO KASVAA KEHIKKOON ELÄVÄKSI TUOTTEEKSI. TUOTE ON ARVOKKAAMPI KUIN SATO.',X+10,Y+HH-46,TW,P.uiD);
    }
  }
  else if (m.type==='retki') drawRetkiModal(m,X,Y,WW,HH,t,{close:()=>{ U.modal=null; }, reveal:()=>reveal.openRetki()});
  else if (m.type==='settings'){
    title('ASETUKSET');
    const list=[
      ()=>row('ÄÄNI', isEnabled()?'PÄÄLLÄ':'POIS','ÄÄNET, AMBIENT JA VÄRINÄ',()=>{ setEnabled(!isEnabled()); },true),
      ()=>row('NOPEUS', S.speed===60?'×60 TESTI':'×1 OIKEA','KASVU OIKEASSA AJASSA TAI 60X',()=>{ S.speed = S.speed===60?1:60; save(); },true),
      ()=>row('OPASTUS', opastus.enabled()?'PÄÄLLÄ':'POIS','SYMBIONTIN VIHJEET JA HEHKU',()=>{ opastus.setEnabled(!opastus.enabled()); },true),
      ()=>row('ALOITA OPASTUS ALUSTA','','NÄYTTÄÄ VIHJEET UUDELLEEN',()=>{ opastus.restart(); opastus.setEnabled(true); U.modal=null; toast('OPASTUS ALKAA ALUSTA'); },true)];
    if (window.SOLMU_PWA) list.push(()=>row('TALLENNUS JA ASENNUS','','VIENTI, TUONTI JA ASENNUSOHJE',()=>{ U.modal=null; window.SOLMU_PWA.open(); },true));
    list.push(()=>row('UUSI PELI','','POISTAA TALLENNUKSEN',()=>{ U.modal={type:'confirmReset'}; },true));
    const per=land?Math.max(1,Math.floor((Y+HH-32-y)/23)):8, first=pager(list.length,per); list.slice(first,first+per).forEach(f=>f());
    const ver=window.SOLMU_PWA&&window.SOLMU_PWA.version?window.SOLMU_PWA.version():VERSION;
    if (land) text(ver,X+10,Y+HH-29,P.uiD); else text(ver,X+10,y+4,P.uiD);
  }
  else if (m.type==='opastus'){   // laboratorion ensiesittely: opastuksen ainoa modaali
    title(m.title);
    wrap(m.txt,X+10,y,TW,P.ui3);
    button(X+WW/2-30,Y+HH-(land?18:40),60,14,'SELVÄ',()=>{ U.modal=null; },'a');
  }
  else if (m.type==='confirmReset'){
    title('ALOITA ALUSTA?');
    row('KYLLÄ, UUSI PELI','',null,()=>{ replaceState(newGame()); U.modal=null; U.view='room'; U.sel=null; save(); toast('UUSI PELI ALOITETTU'); },true);
  }
  if (!(land && m.type==='opastus')) button(X+WW/2-30,Y+HH-18,60,13,'SULJE',()=>{ U.modal=null; });
}

export function render(ms){
  const t=ms/1000; resetHit(); g.clearRect(0,0,W,H);
  opastus.guide(U);
  setScene(U.view==='reveal'?'reveal':S.cur);
  // poikkileikkaukseen zoomatessa huone näkyy taustalla
  if (U.view==='vessel' && zoomActive() && ZOOM.dir>0) drawIso(t,{});
  if (U.view==='reveal') reveal.drawReveal(t);
  else {
    if (U.view==='vessel') drawVessel(t); else if (U.view==='book') book.drawBook(t); else { U.view='room'; drawRoom(t); }
    if (U.view!=='book' || !LAY.land) topBar();
  }
  drawModal(t);
  if (U.view!=='reveal' && !(U.view==='book' && LAY.land)) opastus.drawStrip(t);
}
