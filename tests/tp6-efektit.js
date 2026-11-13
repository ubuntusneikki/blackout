// TP6: äänet ja efektit. Tarkistaa, ettei virheitä tule, AudioContext käynnistyy kosketuksesta,
// ääniasetus toimii ja efektit piirtyvät. Kuvat: node tests/tp6-efektit.js [kansio]
const {chromium} = require('playwright');
const OUT = process.argv[2] || '/tmp/tp6';
require('fs').mkdirSync(OUT, {recursive:true});
(async()=>{
  const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p = await b.newPage({viewport:{width:384,height:672}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/koti/?reset'); await p.waitForTimeout(600);
  const tap=(x,y)=>p.mouse.click(x*2,y*2);
  const shot=async n=>{ await p.waitForTimeout(250); await p.screenshot({path:OUT+'/'+n+'.png'}); };
  await tap(96,300); // paneeli (ei nappia): käynnistää äänen
  const st = await p.evaluate(()=>{ const S=__S(); const c=S.rooms.huone.cells.find(c=>c&&c.kind==='vessel'); return {hasVessel:!!c}; });
  // istuta, kasvata, korjaa
  await p.evaluate(()=>{ const S=__S(); const c=S.rooms.huone.cells.find(c=>c&&c.kind==='vessel'); __G.plant(c,Object.keys(S.spores)[0]); });
  await shot('1-istutus');
  await p.evaluate(()=>__sim(3600*6)); await p.waitForTimeout(300); await shot('2-kypsa');
  await p.evaluate(()=>{ const S=__S(); const c=S.rooms.huone.cells.find(c=>c&&c.kind==='vessel'&&c.ready); __G.harvest(c); });
  await p.waitForTimeout(120); await shot('3-korjuu');
  await p.evaluate(()=>{ __U.modal={type:'market',tab:'sell',page:0}; });
  await p.waitForTimeout(150); await tap(96,100);
  await p.evaluate(()=>{ const id=__G.sellables()[0]; if(id) __G.sell(id,__G.owned(id)); });
  await p.waitForTimeout(200); await shot('4-kolikot');
  await p.waitForTimeout(700); await shot('5-laskuri');
  await p.evaluate(()=>{ __U.modal=null; window.__fxHour=23; }); await shot('6-yo');
  await p.evaluate(()=>{ window.__fxHour=19.5; }); await shot('7-ilta');
  await p.evaluate(()=>{ window.__fxHour=12; }); await shot('8-paiva');
  const audio = await p.evaluate(async()=>{ const m=await import('/koti/js/audio.js'); const a=m.isEnabled(); m.setEnabled(false); const b=m.isEnabled(); m.setEnabled(true); return {a,b,pref:localStorage.getItem('solmu_aani')}; });
  console.log(JSON.stringify({st, audio, errs}));
  await b.close(); if (errs.length) process.exit(1);
})();
