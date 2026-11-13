// TP8: aloitusopastuksen läpipeluu. Pelaa uuden pelin ensimmäisen käynnin napauttamalla VAIN hehkuvia kohteita
// (todistaa, ettei opastus jumitu) ja ottaa kuvan jokaisesta askeleesta. Toinen ajo tekee asiat väärässä järjestyksessä.
// Myöhemmät avautumiset (laboratorio, taulu, retki, kehikko, hoitaja, kellari) ajetaan tilaa muokkaamalla.
// Aja: python3 -m http.server 8765 (repon juuressa) ja sitten node tests/opastus.js [kuvakansio]
const BASE=process.env.BASE||'http://localhost:8765';
const OUT=process.argv[2]||null;
const {chromium}=require('playwright');
const fs=require('fs');
if (OUT) fs.mkdirSync(OUT,{recursive:true});
let fail=0; const ok=(c,m)=>{ console.log((c?'OK   ':'VIRHE ')+m); if(!c) fail++; };

async function tapBox(pg,b){
  const r=await pg.evaluate(()=>{ const c=document.getElementById('c').getBoundingClientRect(); return {x:c.left,y:c.top,w:c.width,h:c.height}; });
  const x=r.x+(b.x+b.w/2)/192*r.w, y=r.y+(b.y+b.h*(b.key&&b.key.startsWith('floor')?0.5:b.key&&b.key.startsWith('spot')?0.2:0.6))/336*r.h;
  // suoraan kankaalle: puhelinversion HTML-palkki voi peittää alakulman
  await pg.evaluate(([x,y])=>{ const c=document.getElementById('c');
    for (const t of ['pointerdown','pointerup']) c.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,bubbles:true})); },[x,y]);
}
// napauttaa hehkuvia kohteita, kunnes ehto täyttyy; odottaessa kelaa peliaikaa
async function follow(pg, until, shots, tag, max){
  const seen=[]; let idle=0;
  for (let n=0; n<(max||250); n++){
    if (await pg.evaluate(until)) return seen;
    const st=await pg.evaluate(()=>{ const c=__OP.cur(); return c?{id:c.id, text:c.text, keys:c.keys, boxes:__OP.boxes()}:null; });
    if (st && seen[seen.length-1]!==st.id){ seen.push(st.id); if (shots && OUT) await pg.screenshot({path:`${OUT}/${tag}-${String(seen.length).padStart(2,'0')}-${st.id}.png`}); }
    if (st && st.boxes.length){ idle=0; await tapBox(pg, st.boxes[0]); await pg.waitForTimeout(150); continue; }
    // ei kohdetta: odota (kasvu, kuivuminen, lupausnäkymän ajastin)
    idle++; await pg.evaluate(()=>__sim(20)); await pg.waitForTimeout(st && st.id==='lupaus' ? 1000 : 120);
    if (idle>120) break;
  }
  return seen;
}
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:384,height:672}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const fresh=async()=>{ await pg.goto(BASE+'/koti/?reset'); await pg.waitForTimeout(1200); await pg.evaluate(()=>localStorage.clear()); };

  // 1) ensimmäinen käynti pelkästään hehkua seuraamalla
  await fresh();
  let steps=await follow(pg, ()=>!!__S().opastus.nahty.ensi, true, 'ensi');
  const S1=await pg.evaluate(()=>{ const S=__S(); return {sold:S.sold, purkki:S.bought.purkki, fh:S.flags.firstHarvest, n:S.opastus.nahty}; });
  console.log('askeleet:', steps.join(' > '));
  ok(S1.n.ensi, 'ensimmäinen käynti päättyi lupausnäkymään');
  for (const k of ['istuta','kasvaa','korjaa','myy','ruusu','osta','sijoita','lupaus']) ok(steps.includes(k), 'askel '+k+' nähtiin');
  ok(S1.sold>0 && S1.purkki>0 && S1.fh, 'korjattu, myyty ja ostettu purkki');

  // 2) väärä järjestys: ostetaan ja istutetaan ensin itse, sitten seurataan hehkua
  await fresh();
  await pg.evaluate(()=>{ const S=__S(), G=__G; G.buy('purkki'); G.place('huone',7,'vessel','purkki');
    const p=S.rooms.huone.cells[5]; G.plant(p,'ruusu'); });
  await pg.waitForTimeout(200); console.log('väärä järjestys, alku:', await pg.evaluate(()=>JSON.stringify([__OP.cur()&&__OP.cur().id, __S().rooms.huone.cells.map(c=>c&&c.strain).join(',')])));
  steps=await follow(pg, ()=>!!__S().opastus.nahty.ensi, true, 'vaara');
  console.log('askeleet (väärä järjestys):', steps.join(' > '));
  ok(await pg.evaluate(()=>!!__S().opastus.nahty.ensi), 'väärässä järjestyksessä ei jumitu');
  ok(!steps.includes('osta') && !steps.includes('ruusu') && !steps.includes('istuta'), 'jo tehdyt askeleet ohitettiin');

  // 3) myöhemmät avautumiset: laboratorio paljastukseen asti
  await fresh();
  await pg.evaluate(()=>{ const S=__S(); S.opastus.nahty={ensi:1,korjaa:1,sumutus:1,ruusu:1,hinta:1}; S.hopea=200; S.sold=14;
    S.spores={heltta:2, ruusu:2}; S.inv={'raw:heltta':3}; __G.sell('raw:heltta',1); });
  await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>__U.modal&&__U.modal.type==='opastus'), 'laboratorion ensiesittely on modaali');
  if (OUT) await pg.screenshot({path:`${OUT}/lab-01-esittely.png`});
  steps=await follow(pg, ()=>{ const d=__S().rooms.huone.cells.find(c=>c&&c.type==='hautomo'); return d&&d.busy; }, true, 'lab');
  console.log('askeleet (laboratorio):', steps.join(' > '));
  ok(await pg.evaluate(()=>{ const d=__S().rooms.huone.cells.find(c=>c&&c.type==='hautomo'); return d&&d.busy&&d.dish.a!==d.dish.b; }), 'risteytys aloitettiin hehkua seuraamalla');
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>__OP.cur()&&__OP.cur().id==='lab-odota'), 'TULE AAMULLA KATSOMAAN näkyy');
  if (OUT) await pg.screenshot({path:`${OUT}/lab-odota.png`});
  await pg.evaluate(()=>{ __sim(8*3600); });
  steps=await follow(pg, ()=>!!__S().opastus.nahty.lab, true, 'lab-paljastus', 40);
  ok(await pg.evaluate(()=>!!__S().opastus.nahty.lab), 'laboratorio-osio päättyi paljastukseen');
  await pg.evaluate(()=>{ __U.view='room'; __U.rev=null; __U.modal=null; });

  // 4) taulu, retki, kellari ja hoitaja: kukin näkyy kerran ja kohde hehkuu
  for (const [id, setup] of [
    ['retki', ()=>{}],
    ['taulu', ()=>{}],
    ['kellari', ()=>{ const S=__S(); S.opastus.nahty.kehikko=1; S.known.kalvo=1; S.hopea=400; }],
  ]){
    await pg.evaluate(setup); await pg.waitForTimeout(300);
    const c=await pg.evaluate(()=>{ const c=__OP.cur(); return c&&{id:c.id, n:__OP.boxes().length}; });
    ok(c && c.id===id && c.n>0, 'avautuminen '+id+' hehkuu ('+JSON.stringify(c)+')');
    if (OUT) await pg.screenshot({path:`${OUT}/myoh-${id}.png`});
    await follow(pg, (k=>new Function('return !!__S().opastus.nahty["'+k+'"]'))(id), false, id, 80);
    ok(await pg.evaluate(k=>!!__S().opastus.nahty[k], id), id+' merkitty nähdyksi');
    await pg.evaluate(()=>{ __U.modal=null; __U.view='room'; });
  }
  // hoitaja: naapuriruudut hehkuvat
  await pg.evaluate(()=>{ const S=__S(); S.cur='huone'; S.opastus.nahty['kellari-mene']=1; const c=S.rooms.huone.cells; c[9]={id:999,kind:'vessel',type:'terraario',strain:'hoitaja',growth:1,moist:1,ready:false,waves:0}; });
  await pg.waitForTimeout(300);
  const h=await pg.evaluate(()=>{ const c=__OP.cur(); return c&&{id:c.id, n:__OP.boxes().length}; });
  ok(h && h.id==='hoitaja' && h.n===4, 'hoitajan neljä naapuriruutua hehkuvat ('+JSON.stringify(h)+')');
  if (OUT) await pg.screenshot({path:`${OUT}/myoh-hoitaja.png`});

  // 5) asetukset: pois päältä ja alusta
  await pg.evaluate(()=>{ __OP.setEnabled(false); }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>!__OP.cur()), 'OPASTUS POIS piilottaa vihjeet');
  await pg.evaluate(()=>{ __OP.restart(); __OP.setEnabled(true); }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>!__S().opastus.nahty.ensi), 'ALOITA ALUSTA nollaa opastuksen');

  // 6) vanha tallennus ilman opastus-kenttää: kokenut pelaaja ei saa ensimmäisen käynnin opastusta
  const old=await pg.evaluate(()=>{ const S=JSON.parse(JSON.stringify(__S())); delete S.opastus; S.sold=30; S.flags.firstHarvest=true; S.flags.lab=true; return JSON.stringify(S); });
  const pg2=await b.newPage({viewport:{width:384,height:672}}); pg2.on('pageerror',e=>errs.push(e.message));
  await pg2.addInitScript(v=>{ if(!sessionStorage.getItem('x')){ sessionStorage.setItem('x',1); localStorage.setItem('solmu_yhteinen_v1', v); } }, old);
  await pg.close(); await pg2.goto(BASE+'/koti/'); await pg2.waitForTimeout(1000);
  ok(await pg2.evaluate(()=>{ const n=__S().opastus.nahty; return n.ensi && n['lab-esittely']; }), 'vanha tallennus merkitään valmiiksi');

  ok(!errs.length, 'ei virheitä '+JSON.stringify(errs));
  await b.close(); process.exitCode=fail?1:0;
})();
