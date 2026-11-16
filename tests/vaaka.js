// V2.0: vaakatila ja kierto. Aja: python3 -m http.server 8765 (repon juuressa) ja sitten node tests/vaaka.js [kuvakansio]
// Tarkistaa neljällä näyttökoolla, että peli täyttää näytön, asettelu vaihtuu kierrettäessä, napautukset osuvat
// (istutus, markkina, lähikuva) ja toisen taakse jäävä esine on valittavissa. Kuvat tallennetaan, jos kansio annetaan.
const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');
const out=process.argv[2]||null;
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c){ fails++; process.exitCode=1; } };
const SIZES=[[390,844,3],[844,390,3],[412,915,2.625],[915,412,2.625]];
(async()=>{
  const b=await chromium.launch(); const errs=[];
  for (const [w,h,dpr] of SIZES){
    const pg=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
    pg.on('pageerror',e=>errs.push(w+'x'+h+': '+e.message));
    await pg.goto(BASE+'/koti/?reset'); await pg.waitForTimeout(900);
    await pg.evaluate(()=>{ __S().opastus.pois=true; });
    const land=w>h, tag=w+'x'+h;
    const info=()=>pg.evaluate(()=>import('./js/gfx.js').then(m=>{ const c=document.getElementById('c'), r=c.getBoundingClientRect();
      return {W:m.W,H:m.H,land:m.LAY.land,ox:m.LAY.ox,by:m.LAY.by,r:[r.left,r.top,r.width,r.height],cw:c.width,ch:c.height,iw:innerWidth,ih:innerHeight}; }));
    // napautus käyttöliittymän loogiseen pisteeseen
    const tap=async(x,y)=>{ const i=await info(); await pg.mouse.click(i.r[0]+x/i.W*i.r[2], i.r[1]+y/i.H*i.r[3]); await pg.waitForTimeout(250); };
    const shot=async n=>{ if(out) await pg.screenshot({path:`${out}/${tag}_${n}.png`}); };
    let i=await info();
    ok(i.land===land, tag+': asettelu on '+(land?'vaaka':'pysty'));
    ok(i.r[2]<=i.iw+0.5 && i.r[3]<=i.ih+0.5, tag+': kangas mahtuu näytölle');
    ok(Math.max(i.r[2]/i.iw, i.r[3]/i.ih)>=0.98 && Math.min(i.r[2]/i.iw, i.r[3]/i.ih)>=(land?0.97:0.78), tag+': kangas täyttää näytön ('+Math.round(i.r[2])+'×'+Math.round(i.r[3])+')');
    if (land) ok(i.W>=384 && i.H>=176, tag+': vaaka-asettelun vähimmäiskoko ('+i.W*2+'×'+i.H*2+' natiivia)');
    const k=i.r[2]*dpr/(i.W*2); if (Math.abs(k-Math.round(k))<0.01) ok(i.cw===i.W*2*Math.round(k), tag+': kokonaislukukerroin '+Math.round(k));
    else console.log('     '+tag+': kerroin '+k.toFixed(2)+' (piirto ×'+(i.cw/(i.W*2))+', selain pienentää)');
    await shot('1-uusi');
    // istuta: napauta terraariota (ruutu 4), ISTUTA, ensimmäinen rivi
    const box=await pg.evaluate(()=>__ISO.cellBoxUi('huone',4));
    await tap(box.x+box.w/2, box.y+box.h/2); await pg.waitForTimeout(400);
    ok(await pg.evaluate(()=>__U.view==='vessel'), tag+': astian napautus avaa lähikuvan');
    i=await info(); await tap(i.ox+120, i.by+7);
    ok(await pg.evaluate(()=>__U.modal&&__U.modal.type==='plant'), tag+': ISTUTA avaa valinnan');
    await tap(i.ox+60, land?45:70);
    ok(await pg.evaluate(()=>__S().rooms.huone.cells[4].strain==='heltta'), tag+': istutus rivistä onnistuu');
    await pg.evaluate(()=>__sim(4000)); await pg.waitForTimeout(300); await shot('2-lahikuva');
    await tap(i.ox+100, i.by+7);   // KORJAA SATO
    ok(await pg.evaluate(()=>(__S().inv['raw:heltta']||0)>0), tag+': sadonkorjuu napista');
    await tap(i.ox+10, i.by+7); await pg.waitForTimeout(500);
    ok(await pg.evaluate(()=>__U.view==='room'), tag+': paluu huoneeseen');
    // markkina: myy
    await tap(i.ox+20, i.by+7);
    ok(await pg.evaluate(()=>__U.modal&&__U.modal.type==='market'), tag+': MARKKINA aukeaa');
    const h0=await pg.evaluate(()=>__S().hopea); await tap(i.ox+60, land?45:95); await shot('3-markkina');
    ok(await pg.evaluate(h=>__S().hopea>h,h0), tag+': myynti rivistä onnistuu');
    if (land){ await tap(40, i.H/2); ok(await pg.evaluate(()=>!__U.modal), tag+': napautus huoneeseen sulkee sivupaneelin ikkunan'); }
    else await pg.evaluate(()=>{ __U.modal=null; });
    // piiloon jäävä esine: täytä ruudut 1 ja 5/6 ja napauta takimmaisen alaosaa
    await pg.evaluate(()=>{ const S=__S(), c=S.rooms.huone.cells, V=(id,type)=>({id,kind:'vessel',type,strain:'heltta',growth:.5,moist:.9,ready:false,waves:0});
      c[1]=V(901,'terraario'); c[5]=V(902,'terraario'); c[6]=V(903,'terraario'); }); await pg.waitForTimeout(400);
    const b1=await pg.evaluate(()=>__ISO.cellBoxUi('huone',1)); await tap(b1.x+b1.w/2, b1.y+b1.h*0.75);
    const m=await pg.evaluate(()=>__U.modal&&__U.modal.type==='pick'&&__U.modal.list.map(q=>q.i));
    ok(m && m.includes(1) && m.length>=2, tag+': päällekkäinen kohta kysyy kumpaa tarkoitettiin ('+JSON.stringify(m)+')');
    await shot('4-kumpi'); await pg.evaluate(()=>{ __U.modal=null; });
    // kantakirja ja kierto kesken pelin
    await pg.evaluate(()=>{ __U.view='book'; __U.book={tab:'puu',page:null,p:0}; }); await pg.waitForTimeout(300); await shot('5-sukupuu');
    await pg.setViewportSize({width:h,height:w}); await pg.waitForTimeout(700);
    i=await info(); ok(i.land===!land && i.r[2]<=i.iw+0.5 && i.r[3]<=i.ih+0.5, tag+': kierto vaihtaa asettelun lennosta');
    await pg.evaluate(()=>{ __U.view='room'; }); await pg.waitForTimeout(400);
    const b4=await pg.evaluate(()=>__ISO.cellBoxUi('huone',4)); await tap(b4.x+b4.w/2, b4.y+b4.h*0.3); await pg.waitForTimeout(400);
    ok(await pg.evaluate(()=>__U.view==='vessel'||(__U.modal&&__U.modal.type==='pick')), tag+': napautus osuu kierron jälkeen');
    await pg.close();
  }
  ok(!errs.length,'ei JS-virheitä '+JSON.stringify(errs));
  await b.close();
})();
