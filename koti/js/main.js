// KOTI v1: silmukka, syöte ja synkronointi
import {W, H, RES, LAY, setLayout, screen, sctx, buf, HIT, rect, text, tw, fmt} from './gfx.js';
import {S, SAVE_KEY, save, mergeIncoming, strain} from './state.js';
import * as sim from './sim.js';
import {U, render, audioInit, openHautomo, switchRoom} from './ui.js';
import {STRAINS, P, AMB} from './data.js';
import * as fx from './fx.js';
import {play} from './audio.js';
import {loadAtlas, composite, zoomActive} from './iso.js';
import * as ISO from './iso.js';
import {isoLocator} from './iso.js';
import * as retki from './retki.js';
import * as reveal from './reveal.js';
import {emit} from './events.js';
import * as opastus from './opastus.js';
import {GUIDE_BOXES} from './gfx.js';

// offline-kasvu (enintään 8 h) ja yhteenveto palatessa
function catchUp(){ const real=(Date.now()-(S.kotiLast||Date.now()))/1000, away=Math.min(8*3600,real)*S.speed; if (away<=1) return;
  const a=sim.snapshot(); sim.simulate(away); const b=sim.snapshot();
  if (away<600) return;   // alle 10 pelimin poissaolo: ei yhteenvetoa
  const parts=[]; if (b.w>a.w) parts.push((b.w-a.w)+' SATOAALTOA'); if (b.dev>a.dev) parts.push((b.dev-a.dev)+' LAITE VALMIS');
  if (b.board!==a.board) parts.push('UUSI TILAUS TAULULLA'); if (b.spike && b.spike!==a.spike) parts.push('KYSYNTÄPIIKKI');
  const h=real/3600, aika=h>=1?Math.floor(h)+' H':Math.max(1,Math.round(real/60))+' MIN';
  emit('paluu',{poissa:real, ...b, viesti: parts.length ? 'POISSA '+aika+': '+parts.join(', ')+'.' : null}); }
// itiöt voivat tulla myös testilöydöistä tai vanhasta tallennuksesta: kanta on silloin tunnettu
function syncKnown(){ for (const k in S.spores){ if (strain(k)){ S.known[k]=1; if (!S.tieto[k]) S.tieto[k]=STRAINS[k]&&(k==='heltta'||k==='ruusu')?{k:1,g:1}:{}; } else delete S.spores[k]; } }
// aamupaljastus (TP7): poissa ollessa valmistuneet maljat ja retki odottavat jonossa; pelaaja avaa ne napautuksella
function morningReveal(){ reveal.queueOnOpen(); }
catchUp(); syncKnown(); sim.checkUnlocks(); sim.progressChain(); sim.rescue(); morningReveal(); save();

// V2.1: piirretään jokaisella näytön virkistyksellä (aiemmin enintään 90 ms:n välein eli noin 11 kuvaa sekunnissa,
// minkä takia siirtymät nykivät). FPS = toteutunut kuvataajuus; ?fps näyttää sen ja yhden kuvan piirtoajan ruudulla.
let lastMs=performance.now(), lastSave=0;
const FPS={show:/[?&]fps\b/.test(location.search), n:0, t0:performance.now(), fps:0, ms:0, acc:0, frames:0};
window.__fps=FPS;
function loop(ms){
  const dt=Math.min(1,(ms-lastMs)/1000); lastMs=ms;
  if (!U.modal && U.view!=='reveal') sim.tick(dt*S.speed);
  const a=performance.now(); draw(ms); FPS.acc+=performance.now()-a; FPS.n++; FPS.frames++;
  if (ms-FPS.t0>=500){ FPS.fps=Math.round(FPS.n*1000/(ms-FPS.t0)); FPS.ms=FPS.acc/FPS.n; FPS.n=0; FPS.acc=0; FPS.t0=ms; }
  if (ms-lastSave>3000){ lastSave=ms; save(); sim.rescue(); }
  requestAnimationFrame(loop);
}
// Näyttö: pystyssä 384×672 natiivipikseliä (huonekerros 1:1). Vaakatilassa (V2.0) huone on vasemmalla ja sivupaneeli
// oikealla: natiivikoko vähintään 768×352, ja ylimääräinen tila annetaan huoneelle ja paneelille (ei mustia reunoja).
// K = kokonaislukukerroin laitepikseleinä; jos se jättäisi yli 15 % näytöstä tyhjäksi, venytetään näytön kokoon.
const PORT=[384,672], LAND_MIN=[768,352], LAND_MAX=[1024,448];
let K=1;
function draw(ms){ render(ms); fx.draw(ms);
  if (FPS.show){ const s=FPS.fps+' FPS '+fmt(FPS.ms)+' MS'; rect(0,H-10,tw(s)+5,10,P.ui0); text(s,2,H-8,AMB[2]); }
  composite(sctx, buf, K, U.view); }
function fit(){
  const dpr=window.devicePixelRatio||1, dw=innerWidth*dpr, dh=innerHeight*dpr;
  const sP=Math.min(dw/PORT[0], dh/PORT[1]), sL=Math.min(dw/LAND_MIN[0], dh/LAND_MIN[1]), land=sL>sP;
  const s=land?sL:sP, n=Math.floor(s), use = n>=1 && n/s>=0.85 ? n : s;
  let nw=PORT[0], nh=PORT[1];
  if (land){ nw=Math.min(LAND_MAX[0], Math.max(LAND_MIN[0], Math.floor(dw/use)&~1)); nh=Math.min(LAND_MAX[1], Math.max(LAND_MIN[1], Math.floor(dh/use)&~1)); }
  // Kun kokonaislukukerroin ei täytä näyttöä (esim. 412 px leveä näyttö, dpr 2,625), piirretään seuraavalla
  // kokonaisluvulla ja annetaan selaimen pienentää pehmeästi: pikselit pysyvät tasakokoisina (ei 2/3 px:n vaihtelua).
  // V2.1: kokonaislukukertoimella kangas on natiivikokoinen ja selain suurentaa sen (image-rendering: pixelated):
  // näytölle kootaan 384×672 pikseliä eikä esim. 1152×2016, mikä keventää jokaista kuvaa.
  const whole = use===n;
  K=whole ? 1 : Math.max(1,Math.ceil(s)); screen.style.imageRendering = whole ? '' : 'auto';
  if (nw!==buf.width || nh!==buf.height || land!==LAY.land) setLayout(nw, nh, land);
  if (screen.width!==nw*K || screen.height!==nh*K){ screen.width=nw*K; screen.height=nh*K; }
  screen.style.width=(nw*use/dpr)+'px'; screen.style.height=(nh*use/dpr)+'px';
  // kangas kokonaisen laitepikselin kohdalle, jotta suurennetut pikselit pysyvät tasakokoisina
  screen.style.position='fixed'; screen.style.left=Math.max(0,Math.round((dw-nw*use)/2))/dpr+'px'; screen.style.top=Math.max(0,Math.round((dh-nh*use)/2))/dpr+'px';
}
let fitT=0;
function refit(){ fit(); draw(performance.now()); clearTimeout(fitT); fitT=setTimeout(()=>{ fit(); draw(performance.now()); },250); }   // kierto: koko asettuu vasta hetken päästä
addEventListener('resize',refit); addEventListener('orientationchange',refit); fit();

let down=null;
screen.addEventListener('pointerdown',e=>{ audioInit();
  const r=screen.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*H;
  down={x,y,cx:e.clientX};
  for(let i=HIT.length-1;i>=0;i--){ const h=HIT[i]; if(x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h){ play('tap'); h.fn(x,y); draw(performance.now()); return; } }
});
// pyyhkäisy vaihtaa tilaa
screen.addEventListener('pointerup',e=>{ if(!down) return; const r=screen.getBoundingClientRect(), dx=(e.clientX-down.cx)/r.width*W;
  if (Math.abs(dx)>40 && U.view==='room' && !U.modal && down.x<LAY.rw && down.y>LAY.ry && down.y<LAY.ry+LAY.rh) switchRoom(); down=null; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ save(); return; }
  try { const inc=JSON.parse(localStorage.getItem(SAVE_KEY)); if(inc) mergeIncoming(inc); } catch(e){}
  catchUp(); syncKnown(); morningReveal(); lastMs=performance.now(); });
addEventListener('storage',e=>{ if(e.key!==SAVE_KEY||!e.newValue) return; try { mergeIncoming(JSON.parse(e.newValue)); syncKnown(); } catch(_){} });
window.__OP={cur:opastus.current, boxes:()=>GUIDE_BOXES.map(b=>({...b})), ...opastus};   // TP8: opastuksen testikoukku
window.__S=()=>S; window.__sim=sim.simulate; window.__U=U; window.__G=sim; window.__ISO=ISO; window.__R=retki; window.__RV=reveal;
fx.setLocator(isoLocator);   // TP6:n efektit isometrisen huoneen ja poikkileikkauksen ruutuihin
loadAtlas('gfx/').then(()=>requestAnimationFrame(loop));
