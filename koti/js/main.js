// KOTI v1: silmukka, syöte ja synkronointi
import {W, H, screen, sctx, buf, HIT} from './gfx.js';
import {S, SAVE_KEY, save, mergeIncoming} from './state.js';
import * as sim from './sim.js';
import {U, render, audioInit, openHautomo, switchRoom} from './ui.js';
import {STRAINS} from './data.js';
import * as fx from './fx.js';
import {play} from './audio.js';

// offline-kasvu (enintään 8 h)
function catchUp(){ const away=Math.min(8*3600,(Date.now()-(S.kotiLast||Date.now()))/1000)*S.speed; if (away>1) sim.simulate(away); }
// itiöt voivat tulla myös testilöydöistä tai vanhasta tallennuksesta: kanta on silloin tunnettu
function syncKnown(){ for (const k in S.spores){ const b=k.split('~')[0]; if (STRAINS[b]) S.known[b]=1; } }
// aamupaljastus: valmistunut malja avautuu heti, kun peli avataan
function morningReveal(){ for (const r in S.rooms) for (const c of S.rooms[r].cells) if (c&&c.type==='hautomo'&&c.done){ openHautomo(c); return; } }
catchUp(); syncKnown(); sim.checkUnlocks(); sim.rescue(); morningReveal(); save();

let lastMs=performance.now(), lastFrame=0, lastSave=0;
function loop(ms){
  const dt=Math.min(1,(ms-lastMs)/1000); lastMs=ms;
  if (!U.modal && U.view!=='reveal') sim.tick(dt*S.speed);
  if (ms-lastFrame>90){ lastFrame=ms; draw(ms); }
  if (ms-lastSave>3000){ lastSave=ms; save(); sim.rescue(); }
  requestAnimationFrame(loop);
}
function draw(ms){ render(ms); fx.draw(ms); sctx.imageSmoothingEnabled=false; sctx.drawImage(buf,0,0,W,H,0,0,screen.width,screen.height); }
function fit(){ const k=Math.max(1,Math.floor(Math.min(innerWidth/W,innerHeight/H))); screen.width=W*k; screen.height=H*k; }
addEventListener('resize',fit); fit();
let down=null;
screen.addEventListener('pointerdown',e=>{ audioInit();
  const r=screen.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*H;
  down={x,y,cx:e.clientX};
  for(let i=HIT.length-1;i>=0;i--){ const h=HIT[i]; if(x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h){ play('tap'); h.fn(); draw(performance.now()); return; } }
});
// pyyhkäisy vaihtaa tilaa
screen.addEventListener('pointerup',e=>{ if(!down) return; const r=screen.getBoundingClientRect(), dx=(e.clientX-down.cx)/r.width*W;
  if (Math.abs(dx)>40 && U.view==='room' && !U.modal && down.y>14 && down.y<272) switchRoom(); down=null; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ save(); return; }
  try { const inc=JSON.parse(localStorage.getItem(SAVE_KEY)); if(inc) mergeIncoming(inc); } catch(e){}
  catchUp(); syncKnown(); morningReveal(); lastMs=performance.now(); });
addEventListener('storage',e=>{ if(e.key!==SAVE_KEY||!e.newValue) return; try { mergeIncoming(JSON.parse(e.newValue)); syncKnown(); } catch(_){} });
window.__S=()=>S; window.__sim=sim.simulate; window.__U=U; window.__G=sim;
requestAnimationFrame(loop);
