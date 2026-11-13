// KOTI v1: silmukka, syöte ja synkronointi
import {W, H, screen, sctx, buf, HIT} from './gfx.js';
import {S, SAVE_KEY, save, mergeIncoming} from './state.js';
import * as sim from './sim.js';
import {U, render, audioInit, openHautomo, switchRoom} from './ui.js';
import {STRAINS} from './data.js';
import * as fx from './fx.js';
import {play} from './audio.js';
import {loadAtlas, composite, zoomActive} from './iso.js';
import * as ISO from './iso.js';
import {isoLocator} from './iso.js';
import * as retki from './retki.js';
import * as reveal from './reveal.js';
import {emit} from './events.js';

// offline-kasvu (enintään 8 h) ja yhteenveto palatessa
function catchUp(){ const real=(Date.now()-(S.kotiLast||Date.now()))/1000, away=Math.min(8*3600,real)*S.speed; if (away<=1) return;
  const a=sim.snapshot(); sim.simulate(away); const b=sim.snapshot();
  if (away<600) return;   // alle 10 pelimin poissaolo: ei yhteenvetoa
  const parts=[]; if (b.w>a.w) parts.push((b.w-a.w)+' SATOAALTOA'); if (b.dev>a.dev) parts.push((b.dev-a.dev)+' LAITE VALMIS');
  if (b.board!==a.board) parts.push('UUSI TILAUS TAULULLA'); if (b.spike && b.spike!==a.spike) parts.push('KYSYNTÄPIIKKI');
  const h=real/3600, aika=h>=1?Math.floor(h)+' H':Math.max(1,Math.round(real/60))+' MIN';
  emit('paluu',{poissa:real, ...b, viesti: parts.length ? 'POISSA '+aika+': '+parts.join(', ')+'.' : null}); }
// itiöt voivat tulla myös testilöydöistä tai vanhasta tallennuksesta: kanta on silloin tunnettu
function syncKnown(){ for (const k in S.spores){ const b=k.split('~')[0]; if (STRAINS[b]) S.known[b]=1; } }
// aamupaljastus (TP7): poissa ollessa valmistuneet maljat ja retki odottavat jonossa; pelaaja avaa ne napautuksella
function morningReveal(){ reveal.queueOnOpen(); }
catchUp(); syncKnown(); sim.checkUnlocks(); sim.progressChain(); sim.rescue(); morningReveal(); save();

let lastMs=performance.now(), lastFrame=0, lastSave=0;
function loop(ms){
  const dt=Math.min(1,(ms-lastMs)/1000); lastMs=ms;
  if (!U.modal && U.view!=='reveal') sim.tick(dt*S.speed);
  if (ms-lastFrame>90){ lastFrame=ms; draw(ms); }
  if (ms-lastSave>3000){ lastSave=ms; save(); sim.rescue(); }
  requestAnimationFrame(loop);
}
// näyttö on 384×672 (huonekerros 1:1, käyttöliittymäpuskuri ×2); kerroin K laitepikseleinä
let K=1;
function draw(ms){ render(ms); fx.draw(ms); composite(sctx, buf, K, U.view); }
function fit(){
  const dpr=window.devicePixelRatio||1, s=Math.min(innerWidth*dpr/(2*W), innerHeight*dpr/(2*H)), n=Math.floor(s);
  // kokonaislukukerroin laitepikseleinä, jos se täyttää näytön melkein; muuten venytys (pikselöity)
  K=Math.max(1,n); const use = n>=1 && n/s>=0.85 ? n : s;
  screen.width=2*W*K; screen.height=2*H*K;
  screen.style.width=(2*W*use/dpr)+'px'; screen.style.height=(2*H*use/dpr)+'px';
}
addEventListener('resize',fit); fit();
let down=null;
screen.addEventListener('pointerdown',e=>{ audioInit();
  const r=screen.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*H;
  down={x,y,cx:e.clientX};
  for(let i=HIT.length-1;i>=0;i--){ const h=HIT[i]; if(x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h){ play('tap'); h.fn(x,y); draw(performance.now()); return; } }
});
// pyyhkäisy vaihtaa tilaa
screen.addEventListener('pointerup',e=>{ if(!down) return; const r=screen.getBoundingClientRect(), dx=(e.clientX-down.cx)/r.width*W;
  if (Math.abs(dx)>40 && U.view==='room' && !U.modal && down.y>14 && down.y<272) switchRoom(); down=null; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ save(); return; }
  try { const inc=JSON.parse(localStorage.getItem(SAVE_KEY)); if(inc) mergeIncoming(inc); } catch(e){}
  catchUp(); syncKnown(); morningReveal(); lastMs=performance.now(); });
addEventListener('storage',e=>{ if(e.key!==SAVE_KEY||!e.newValue) return; try { mergeIncoming(JSON.parse(e.newValue)); syncKnown(); } catch(_){} });
window.__S=()=>S; window.__sim=sim.simulate; window.__U=U; window.__G=sim; window.__ISO=ISO; window.__R=retki; window.__RV=reveal;
fx.setLocator(isoLocator);   // TP6:n efektit isometrisen huoneen ja poikkileikkauksen ruutuihin
loadAtlas('gfx/').then(()=>requestAnimationFrame(loop));
