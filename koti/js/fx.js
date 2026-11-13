// TP6: visuaaliset efektit. Piirretään puskuriin g render()-kutsun jälkeen (main.js: fx.draw).
// Kytkeytyy vain events.js:n tapahtumiin. Paikat kysytään lokaattorilta, jonka isometrinen näkymä (TP4)
// voi vaihtaa: setLocator({cell(r,i)->{x,y,w,h}|null, window()->{x,y,w,h}|null, counter()->{x,y}}).
import {P, AMB, WILD, CUR} from './data.js';
import {W, H, g, px, rect, BAYER, clamp, text, tw, screen} from './gfx.js';
import {S, strain} from './state.js';
import {on} from './events.js';
import {U} from './ui.js';
import {cellXY, CELL} from './room.js';
import {play} from './audio.js';

const reduced = (()=>{ try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } })();

// ---------- apufunktiot muille piirtäjille (huojunta ja hengitys) ----------
// sway: sienen latvan vaakasiirtymä pikseleinä; h01 = korkeus tyvestä (0) latvaan (1)
export function sway(t, seed, h01){ if (reduced) return 0; return Math.round(Math.sin(t*1.1+seed*1.7)*0.6*h01 + Math.sin(t*2.3+seed)*0.4*h01); }
// breath: hehkun hidas syke 0..1 (noin 5 s jakso, jokaisella oma vaihe)
export function breath(t, seed){ return reduced ? 0.6 : 0.5+0.5*Math.sin(t*1.25+seed*2.1); }

// ---------- lokaattori ----------
const defaultLocator = {
  cell(r,i){
    if (U.view==='vessel' && U.sel && U.sel.r===r && U.sel.i===i) return {x:24, y:78, w:143, h:136, xsec:true};
    if (U.view!=='room' || r!==S.cur) return null;
    const [x,y]=cellXY(r,i); return {x,y,w:CELL,h:CELL};
  },
  window(){ return U.view==='room' && S.cur==='huone' ? {x:8,y:18,w:176,h:44} : null; },
  counter(){ const s=Math.floor(S.hopea)+' '+CUR; return {x:W-4-tw(s)/2, y:6}; }
};
let L = defaultLocator;
export function setLocator(loc){ L = Object.assign({}, defaultLocator, loc||{}); }

// astia- tai laiteobjektista ruudun laatikko
function boxOf(obj){
  if (!obj) return null;
  for (const r in S.rooms){ const i=S.rooms[r].cells.indexOf(obj); if (i>=0) return L.cell(r,i); }
  return null;
}
let tapX=W/2, tapY=H/2;
screen.addEventListener('pointerdown', e=>{ const b=screen.getBoundingClientRect(); tapX=(e.clientX-b.left)/b.width*W; tapY=(e.clientY-b.top)/b.height*H; }, true);

// ---------- hiukkaset ----------
// layer 'world' piirretään vain kun modaalia ei ole; 'ui' aina (kolikot lentävät modaalin yli)
const PS=[], MAXP=260;
function add(p){ if (PS.length>=MAXP) PS.shift(); p.age=0; p.layer=p.layer||'world'; PS.push(p); return p; }
function burst(x,y,n,cols,o){ o=o||{};
  for (let k=0;k<n;k++){ const a=(o.dir!=null? o.dir+(Math.random()-0.5)*(o.spread||1.2) : Math.random()*6.283), sp=(o.speed||30)*(0.4+Math.random()*0.8);
    add({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(o.up||0),g:o.g!=null?o.g:60,drag:o.drag||1.5,life:(o.life||0.9)*(0.6+Math.random()*0.6),
         col:cols[(Math.random()*cols.length)|0],size:Math.random()<(o.big||0)?2:1}); } }
// leijuva teksti (+3, +12 H)
function floatText(s,x,y,col,layer){ add({kind:'text',s,x:x-tw(s)/2,y,vx:0,vy:-12,g:0,drag:0,life:1.1,col,layer}); }
// kolikko lentää kaarena kohteeseen; perillä pieni ääni ja laskurin välähdys
function coin(x0,y0,x1,y1,delay,toCounter){
  add({kind:'coin',x:x0,y:y0,x0,y0,x1,y1,delay,life:0.55+delay,arc:-18-Math.random()*14,toCounter,layer:'ui',vx:0,vy:0,g:0,drag:0});
}
let counterFlash=-1e9;

// ---------- tapahtumat ----------
function colsOf(key){ const T=key&&strain(key); return T ? [T.col[1],T.col[2],T.col[2]] : [AMB[1],AMB[2]]; }
function centerTop(b){ return b.xsec ? [96, 170] : [b.x+b.w/2, b.y+b.h*0.45]; }
function onCell(d, fn){ const b=boxOf(d.astia||d.laite||d.esine); if (b) fn(b, ...centerTop(b)); }

on('korjuu', d=>onCell(d,(b,x,y)=>{
  const c=colsOf(d.kanta), big=b.xsec?1.8:1;
  burst(x,y,reduced?6:Math.round(22*big),[...c,AMB[2]],{speed:38*big,up:25*big,g:80,life:0.9,big:b.xsec?0.4:0});
  if (!reduced) burst(x,y,10,[c[0]],{speed:10,up:8,g:-6,life:1.6,drag:0.6});   // itiöpöly jää leijumaan
  floatText('+'+(d.n||1),x,y-8,AMB[2]); }));
on('laite-keruu', d=>onCell(d,(b,x,y)=>{ burst(x,y,reduced?6:18,[AMB[1],AMB[2],P.ui3],{speed:32,up:20,g:70}); }));
on('itiot', d=>onCell(d,(b,x,y)=>{ const c=colsOf(d.kanta);
  burst(x,y,reduced?5:(b.xsec?30:16),c,{speed:14,up:16,g:-10,drag:0.9,life:1.8}); floatText('+1',x,y-8,c[1]); }));
on('sumutus', d=>onCell(d,(b,x,y)=>{
  const n=reduced?6:(b.xsec?40:16), top=b.xsec?b.y-4:b.y+2;
  for (let k=0;k<n;k++) add({x:b.x+4+Math.random()*(b.w-8),y:top-Math.random()*6,vx:(Math.random()-0.5)*4,vy:12+Math.random()*16,g:30,drag:0.5,
    life:(b.h/40)*(0.5+Math.random()*0.5),col:Math.random()<0.4?'#e8fff0':P.wa2}); }));
on('istutus', d=>onCell(d,(b)=>{ const x=b.xsec?96:b.x+b.w/2, y=b.xsec?212:b.y+b.h-8;
  burst(x,y,reduced?4:10,[P.so2,P.so3],{dir:-1.57,spread:1.6,speed:24,g:90,life:0.6});
  burst(x,y-2,reduced?2:6,colsOf(d.kanta),{dir:-1.57,spread:0.8,speed:14,g:-4,life:1.2}); }));
on('komposti', d=>onCell(d,(b)=>{ const x=b.xsec?96:b.x+b.w/2, y=b.xsec?200:b.y+b.h*0.6;
  burst(x,y,reduced?4:14,[P.so1,P.so2,P.so3],{speed:16,g:70,life:0.8}); }));
on('sijoitus', d=>onCell(d,(b,x)=>{ burst(x,b.y+b.h-3,reduced?4:12,[P.ui3,P.bg4,P.so3],{dir:-1.57,spread:2.6,speed:20,g:50,life:0.5}); }));
on('malja-alku', d=>onCell(d,(b,x,y)=>{ burst(x,y,reduced?3:8,['#fff6dc',P.gl3||'#e8fff0'],{dir:-1.57,spread:0.6,speed:12,g:-8,life:1}); }));
on('laite-alku', d=>onCell(d,(b,x,y)=>{ burst(x,y,reduced?3:8,colsOf('kalvo'),{speed:12,g:-4,life:1}); }));
on('laite-valmis', d=>{ const b=boxOf(d.laite); if (b && !reduced) ring(b, AMB[2]); });

// myynti: kolikot lentävät napautuskohdasta laskuriin
on('myynti', d=>{
  const c=L.counter(), n=reduced?0:clamp(Math.ceil((d.hopea||1)/3),2,10);
  for (let k=0;k<n;k++) coin(tapX+(Math.random()-0.5)*8, tapY+(Math.random()-0.5)*4, c.x, c.y, k*0.06, true);
  if (reduced) counterFlash=performance.now();
  floatText('+'+Math.round(d.hopea||0)+' '+CUR, c.x-8, c.y+12, AMB[2], 'ui');
});
on('toimitus', d=>{ const c=L.counter(); floatText('+'+(d.n||1),tapX,tapY-6,AMB[2],'ui'); });
on('osto', d=>{ const c=L.counter(), n=reduced?0:clamp(Math.ceil((d.hinta||3)/10),2,6);
  for (let k=0;k<n;k++) coin(c.x, c.y, tapX+(Math.random()-0.5)*10, tapY, k*0.05, false);
  floatText('-'+(d.hinta||0)+' '+CUR, c.x-8, c.y+12, P.ui3, 'ui'); });
// iso juhla: itiöitä koko ruudulle
function confetti(cols){ if (reduced) return; for (let k=0;k<70;k++) add({x:Math.random()*W,y:-4-Math.random()*60,vx:(Math.random()-0.5)*10,vy:10+Math.random()*20,g:6,drag:0.3,life:4+Math.random()*2,col:cols[k%cols.length],layer:'ui'}); }
on('avaus', ()=>confetti([AMB[2],'#8fd0a0','#e8fff0']));
on('tilaus-valmis', d=>{ if (d.lahde!=='taulu') confetti([AMB[2],AMB[1],'#a8fbee','#ffa6d6']); else counterFlash=performance.now(); });
on('virstanpylvas', ()=>confetti([AMB[2],'#a8fbee']));
on('kysyntapiikki', ()=>{ counterFlash=performance.now(); });

// valmistumisen rengas
const RINGS=[];
function ring(b,col){ RINGS.push({b,col,t0:performance.now()}); }

// ---------- kypsymisen ja horroksen tunnistus tilamuutoksista ----------
// (kunnes sim.js lähettää omat tapahtumansa; silloin nämä eivät tuplaannu, koska tila on jo merkitty)
const seen=new WeakMap(); let firstScan=true;
on('kypsyi', d=>{ if (d.astia) mark(d.astia, true); });
on('horros', d=>{ if (d.astia) mark(d.astia, false); });
on('herasi', d=>{ if (d.astia){ mark(d.astia, false); onCell(d,(b,x,y)=>burst(x,y,reduced?3:8,colsOf(d.astia.strain),{speed:10,g:-6,life:1})); } });
function mark(c, fromEvent){ const s=seen.get(c)||{}; s.ready=c.ready; s.dry=c.moist<0.1; seen.set(c,s); if (fromEvent){ const b=boxOf(c); if (b) ring(b,AMB[2]); } }
function scanStates(){
  for (const r in S.rooms){ if (!S.rooms[r].owned) continue; for (const c of S.rooms[r].cells){ if (!c || c.kind!=='vessel') continue;
    const s=seen.get(c), dry=!!c.strain && c.moist<0.1;
    if (s && !firstScan){
      if (c.ready && !s.ready){ play('kypsyi'); const b=boxOf(c); if (b && !reduced){ ring(b,AMB[2]); burst(b.x+b.w/2,b.y+b.h*0.4,10,colsOf(c.strain),{speed:14,g:-6,life:1.2}); } }
      if (dry && !s.dry) play('horros');
    }
    seen.set(c,{ready:c.ready, dry}); } }
  firstScan=false;
}

// ---------- ambient: itiöpöly ja valolammikot ----------
function ambient(t, dt){
  if (U.view!=='room' || U.modal) return;
  const cells=S.rooms[S.cur].cells, night=nightness();
  cells.forEach((c,i)=>{ if (!c || c.kind!=='vessel' || !c.strain) return; const b=L.cell(S.cur,i); if (!b) return;
    const T=strain(c.strain); if (!T) return; const dry=c.moist<0.1, life=0.3+0.7*c.growth;
    // valolammikko astian alle: kannan värinen pistekuvioitu hehku, hengittää ja sammuu kuivuessa
    if (!dry){ const k=breath(t,i)*life*(0.55+0.45*night), cx=b.x+b.w/2, cy=b.y+b.h+1, rx=b.w*0.48;
      for (let yy=-1;yy<=2;yy++) for (let xx=-rx;xx<=rx;xx++){ const X=(cx+xx)|0, Y=cy+yy, d=Math.hypot(xx/rx,yy/2.5);
        if (d<1 && BAYER[Y&3][X&3] < (1-d)*15*k) px(X,Y, d<0.4?T.col[2]:T.col[1]); } }
    // itiöpöly nousee kasvavista astioista
    if (!reduced && !dry && Math.random() < dt*0.7*life) add({x:b.x+6+Math.random()*(b.w-12),y:b.y+b.h*0.5,vx:(Math.random()-0.5)*2,vy:-3-Math.random()*3,g:0,drag:0,life:2.5+Math.random()*2,col:T.mutant&&Math.random()<0.4?AMB[2]:T.col[Math.random()<0.3?2:1],mote:true});
  });
}

// ---------- ikkuna: oikea vuorokaudenaika ----------
// tyyliohje: ei auringonvaloa eikä siniharmaata päivää. Päivä = pölyinen sienisumu ja vino valokaista,
// aamu ja ilta = meripihkainen horisontti, yö = syvä violetti ja villi rihmasto hehkuu kirkkaammin.
function hourNow(){ const d=new Date(); return d.getHours()+d.getMinutes()/60; }
export function nightness(h){ h=h==null?hourNow():h; // 0 = keskipäivä, 1 = keskiyö
  if (h>=22||h<5) return 1; if (h>=9&&h<17) return 0; if (h<9) return 1-(h-5)/4; return (h-17)/5; }
function dusk(h){ return Math.max(0, 1-Math.abs(h-7)/2.2, 1-Math.abs(h-19.5)/2.5); }
function windowLight(t){
  const w=L.window(); if (!w) return;
  const h=window.__fxHour!=null?window.__fxHour:hourNow(), n=nightness(h), dk=dusk(h);
  for (let y=w.y;y<w.y+w.h;y++){ const f=(y-w.y)/w.h;
    for (let x=w.x;x<w.x+w.w;x++){ const b=BAYER[y&3][x&3];
      if (n>0.05 && b < n*(f<0.5?9:4)) px(x,y,f<0.5?'#130f24':'#24203f');            // yö tummentaa taivaan
      else if (n<0.95 && f<0.6 && b < (1-n)*1.5) px(x,y,'#5a4a6a');                    // päivän sumu
      if (dk>0.05 && f>0.55 && b < dk*4*(f-0.55)/0.45) px(x,y, f>0.85?'#ffcf7a':'#d99a5b'); } }  // horisontti
  // yöllä villin rihmaston kärjet välkkyvät
  if (n>0.3) for (let k=0;k<14;k++){ const x=w.x+((k*53+7)%w.w), y=w.y+w.h-3-((k*29)%Math.max(4,w.h/2));
    if (Math.sin(t*1.7+k*2.3)>0.4) px(x,y,'#d6b0ff'); }
  // päivällä vino valokaista ikkunasta huoneeseen (vain ruutujen väliin, ei esineiden päälle)
  const bandK=(1-n)*0.9;
  if (bandK>0.05 && U.view==='room' && !U.modal){
    const cellsB=[]; for (let i=0;i<S.rooms[S.cur].cells.length;i++){ const b=L.cell(S.cur,i); if (b) cellsB.push(b); }
    const y0=w.y+w.h+3, y1=272, img=g.getImageData(0,y0,W,y1-y0), D=img.data;
    for (let y=y0;y<y1;y++){ const x0=w.x+30+(y-y0)*0.5, bw=40, fall=1-(y-y0)/(y1-y0)*0.7;
      for (let x=Math.max(0,x0|0);x<Math.min(W,x0+bw);x++){
        if (cellsB.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)) continue;
        const e=Math.min(x-x0, x0+bw-x)/8; let k=bandK*fall*Math.min(1,e)*0.9;   // pehmeät reunat
        if (BAYER[y&3][x&3] < 3) k*=1.6;                                           // pistekuvioitu kirkkaus
        const i=((y-y0)*W+x)*4; D[i]=Math.min(255,D[i]*(1+k)+60*k); D[i+1]=Math.min(255,D[i+1]*(1+k*0.85)+44*k); D[i+2]=Math.min(255,D[i+2]*(1+k*0.4)+18*k); } }
    g.putImageData(img,0,y0);
    // pölyhiukkaset valokaistassa
    if (!reduced && Math.random()<0.15) add({x:w.x+30+Math.random()*80,y:w.y+w.h+Math.random()*120,vx:(Math.random()-0.5)*2,vy:-1,g:0,drag:0,life:3,col:'#fff0c0',mote:true});
  }
}

// ---------- piirto ----------
let lastMs=0;
export function draw(ms){
  const dt=Math.min(0.25,(ms-(lastMs||ms))/1000); lastMs=ms; const t=ms/1000;
  scanStates();
  const modal=!!U.modal, inRoom=U.view==='room';
  if (!modal && inRoom) windowLight(t);
  if (!modal) ambient(t, dt);
  // valmistumisen renkaat
  for (let k=RINGS.length-1;k>=0;k--){ const R=RINGS[k], a=(ms-R.t0)/700; if (a>1){ RINGS.splice(k,1); continue; } if (modal) continue;
    const b=R.b, cx=b.x+b.w/2, cy=b.y+b.h/2, r=6+a*b.w*0.6;
    for (let q=0;q<28;q++){ const ang=q/28*6.283; if ((q+((a*8)|0))&1) continue; px(cx+Math.cos(ang)*r, cy+Math.sin(ang)*r*0.75, R.col); } }
  // hiukkaset
  for (let k=PS.length-1;k>=0;k--){ const p=PS[k]; p.age+=dt;
    if (p.age>p.life){ if (p.kind==='coin'){ if (p.toCounter){ counterFlash=ms; play('tick'); } } PS.splice(k,1); continue; }
    if (p.kind==='coin'){ const a=clamp((p.age-p.delay)/(p.life-p.delay),0,1); if (a<=0) { if(!modal||p.layer==='ui') px(p.x0,p.y0,AMB[2]); continue; }
      const e=a*a*(3-2*a); p.x=p.x0+(p.x1-p.x0)*e; p.y=p.y0+(p.y1-p.y0)*e+p.arc*Math.sin(a*Math.PI); }
    else { p.vy+=p.g*dt; const dr=Math.max(0,1-p.drag*dt); p.vx*=dr; p.vy*=dr; p.x+=p.vx*dt; p.y+=p.vy*dt; }
    if (modal && p.layer!=='ui') continue;
    if (p.x<0||p.x>=W||p.y<0||p.y>=H) continue;
    const fade=1-p.age/p.life;
    if (p.kind==='text'){ text(p.s,p.x+1,p.y+1,P.ui0); text(p.s,p.x,p.y,p.col); continue; }
    if (p.kind==='coin'){ rect(p.x-1,p.y-1,3,3,AMB[0]); rect(p.x-1,p.y-1,2,2,AMB[2]); px(p.x,p.y,AMB[1]); continue; }
    if (p.mote && BAYER[p.y&3][p.x&3] > fade*20) continue;     // häivytys pistekuvioina
    if (!p.mote && fade<0.3 && ((k+((p.age*10)|0))&1)) continue;
    rect(p.x,p.y,p.size||1,p.size||1,p.col);
  }
  // laskurin välähdys kolikon osuessa
  const fa=(ms-counterFlash)/220;
  if (fa>=0 && fa<1 && U.view!=='reveal'){ const s=Math.floor(S.hopea)+' '+CUR, x=W-4-tw(s), y=fa<0.5?3:4;
    rect(x-2,0,tw(s)+4,13,P.ui0); text(s,x,y,fa<0.5?'#fff0c0':AMB[2]); }
}
