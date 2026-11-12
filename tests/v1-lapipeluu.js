// Aja: python3 -m http.server 8765 (repon juuressa) ja sitten node tests/v1-lapipeluu.js
const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');
const bot=require('./v1-botti.js');
(async()=>{
 const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:384,height:672}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(''+BASE+'/koti/?reset'); await pg.waitForTimeout(300);
 await pg.evaluate(()=>{ window.__SHOP=k=>({purkki:10,terraario:30,agar:3,hautomo:60,kehikko:120,kellari:300})[k]; });
 for (let run=0; run<3; run++){
   if(run) { await pg.goto(''+BASE+'/koti/?reset'); await pg.waitForTimeout(300); await pg.evaluate(()=>{ window.__SHOP=k=>({purkki:10,terraario:30,agar:3,hautomo:60,kehikko:120,kellari:300})[k]; }); }
   const r=await pg.evaluate('('+bot.toString()+')()');
   if(!r.log.join('').includes('TILAUS TÄYTETTY')) process.exitCode=1;
   console.log(JSON.stringify({h:r.gameHours,hopea:r.hopea,sp:r.spores,inv:r.inv}), r.log.join(" | "));
 }
 console.log('errors',errs); if(errs.length) process.exitCode=1;
 await b.close();
})();
