// Suorituskyvyn mittaus. Aja: python3 -m http.server 8765 (repon juuressa) ja sitten node tests/fps.js [hidastus]
// Mittaa yhden kuvan piirtoajan osissa (render = käyttöliittymä ja huonekerros, fx = efektit, composite = kokoaminen
// näytölle) eri näkymissä sekä toteutuneen kuvataajuuden. Hidastus (oletus 4) on Chromen CPU-kuristus, jolla
// jäljitellään keskitason puhelinta; headless-Chrome piirtää ohjelmallisesti, joten luvut ovat suuntaa antavia.
const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');
const RATE=+(process.argv[2]||4);
(async()=>{
  const b=await chromium.launch();
  for (const [w,h,dpr] of [[390,844,3],[844,390,3]]){
    const pg=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
    pg.on('pageerror',e=>{ console.log('VIRHE '+e.message); process.exitCode=1; });
    await pg.goto(BASE+'/koti/?reset'); await pg.waitForTimeout(900);
    const cdp=await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:RATE});
    // täysi huone: 12 kasvustoa eri vaiheissa, hautomo käynnissä
    await pg.evaluate(()=>{ const S=__S(); S.opastus.pois=true; const ks=['heltta','ruusu','hamara','kalvo'], ts=['terraario','purkki','akvaario'];
      for(let i=0;i<12;i++) S.rooms.huone.cells[i]={kind:'vessel',type:ts[i%3],strain:ks[i%4],growth:i%3===0?1:0.3+0.05*i,moist:i%5===0?0.2:0.8,ready:i%3===0,waves:i%3===0?2:0};
      S.rooms.huone.cells[13]={kind:'device',type:'hautomo',t:0.4,busy:true,done:false,dish:['heltta','ruusu']};
      S.spores.heltta=3; S.hopea=500; S.rooms.kellari.owned=true; });
    const measure=(label)=>pg.evaluate(async label=>{
      const ui=await import('./js/ui.js'), fx=await import('./js/fx.js'), iso=await import('./js/iso.js'), gfx=await import('./js/gfx.js');
      const N=40, T={r:0,f:0,c:0}; const k=gfx.screen.width/gfx.buf.width;
      for(let i=0;i<N+5;i++){ const ms=performance.now(); const a=performance.now(); ui.render(ms); const b=performance.now(); fx.draw(ms); const c=performance.now();
        iso.composite(gfx.sctx,gfx.buf,k,ui.U.view); gfx.sctx.getImageData(0,0,1,1); const d=performance.now();
        if(i>=5){ T.r+=b-a; T.f+=c-b; T.c+=d-c; } }
      // toteutunut kuvataajuus: lasketaan näytölle kootut kuvat sekunnin ajalta
      const F=window.__fps, n0=F?F.frames:0, t0=performance.now(); await new Promise(r=>setTimeout(r,1500)); const fps=F?((F.frames-n0)/((performance.now()-t0)/1000)):null;
      return {label, render:+(T.r/N).toFixed(2), fx:+(T.f/N).toFixed(2), composite:+(T.c/N).toFixed(2), yht:+((T.r+T.f+T.c)/N).toFixed(2), fps:fps==null?null:+fps.toFixed(1)};
    },label);
    const rows=[];
    rows.push(await measure('huone (12 kasvustoa)'));
    await pg.evaluate(()=>import('./js/ui.js').then(m=>m.switchRoom())); await pg.waitForTimeout(50);
    rows.push(await measure('tilan vaihto + kellari'));
    await pg.evaluate(()=>import('./js/ui.js').then(m=>m.switchRoom())); await pg.waitForTimeout(700);
    await pg.evaluate(()=>{ const S=__S(); __U.sel={c:S.rooms.huone.cells[1],r:'huone',i:1}; __U.view='vessel'; }); await pg.waitForTimeout(500);
    rows.push(await measure('lähikuva'));
    await pg.evaluate(()=>{ __U.view='room'; __U.modal={type:'market',tab:'sell',page:0}; }); await pg.waitForTimeout(100);
    rows.push(await measure('markkina (ikkuna)'));
    console.log('\n'+w+'×'+h+' dpr '+dpr+', CPU-hidastus ×'+RATE+' (ms / kuva)'); console.table(rows);
    await pg.close();
  }
  await b.close();
})();
