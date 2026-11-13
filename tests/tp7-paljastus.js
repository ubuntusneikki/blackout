// TP7: paljastus 2.0 ja kantakirja. Aja: python3 -m http.server 8765 (repon juuressa) ja node tests/tp7-paljastus.js [kuvakansio]
// Pakottaa jokaisen tuloksen (uusi, tuttu, mutaatio + nimeäminen, hylkiminen, kontaminaatio, retki), testaa jonon
// (malja ja retki valmiina yhtä aikaa poissa ollessa) ja ottaa kuvat näytöksen keskeltä ja lopusta.
const BASE=process.env.BASE||'http://localhost:8765';
const OUT=process.argv[2]||'/tmp/tp7';
const fs=require('fs'); fs.mkdirSync(OUT,{recursive:true});
const {chromium}=require('playwright');
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  const b=await chromium.launch(); let pg=await b.newPage({viewport:{width:384,height:672}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const shot=n=>pg.screenshot({path:OUT+'/'+n+'.png'});
  const fresh=async()=>{ await pg.goto(BASE+'/koti/?reset'); await pg.waitForTimeout(600);
    await pg.evaluate(()=>{ const S=__S(); S.flags.lab=true; S.flags.retki=true; S.sold=20; S.inv.agar=9;
      S.spores={heltta:5, ruusu:5, hamara:5}; S.known.hamara=1; S.book.seen.hamara=1;
      S.deviceInv.push('hautomo'); __G.place('huone',0,'device','hautomo'); }); };
  // malja tietyllä tuloksella; avataan napautuksella (openMalja)
  const dish=(a,b,res)=>pg.evaluate(([a,b,res])=>{ const d=__S().rooms.huone.cells[0]; __G.startDish(d,a,b); d.dish.res=res; __sim(30000); __RV.openMalja(d); },[a,b,res]);
  const view=()=>pg.evaluate(()=>__U.view);
  const tapCenter=()=>pg.mouse.click(192,300);
  const jatka=()=>pg.mouse.click(192,615);

  await fresh();
  // 1. uusi kanta
  await dish('heltta','ruusu',{kind:'new',key:'kalvo',n:2});
  await pg.waitForTimeout(2400); await shot('1-uusi-keski');
  await pg.waitForTimeout(1800); await shot('1-uusi-loppu');
  ok(await pg.evaluate(()=>__S().known.kalvo===1 && __S().spores.kalvo===2),'uusi kanta tunnettu ja itiöt saatu');
  ok(await pg.evaluate(()=>__S().tried['heltta+ruusu']==='ok'),'onnistunut pari muistetaan');
  await jatka(); await pg.waitForTimeout(200); ok(await view()==='room','JATKA palaa huoneeseen');
  // 2. tuttu kanta (lyhyempi näytös)
  await dish('heltta','ruusu',{kind:'new',key:'kalvo',n:2});
  await pg.waitForTimeout(1300); await shot('2-tuttu-keski');
  await pg.waitForTimeout(1300); await shot('2-tuttu-loppu');
  await jatka(); await pg.waitForTimeout(200);
  // 3. mutaatio + nimeäminen
  await dish('heltta','ruusu',{kind:'new',key:'heltta~yield',n:2});
  await pg.waitForTimeout(2600); await shot('3-mutaatio-keski');
  await pg.waitForTimeout(2200); await shot('3-mutaatio-nimeaminen');
  const sug=await pg.evaluate(()=>document.querySelector('input').value);
  ok(sug==='KULTAHELTTA','ehdotus KULTAHELTTA ('+sug+')');
  await pg.evaluate(()=>{ const i=document.querySelector('input'); i.value=''; i.focus(); });
  await pg.keyboard.type('Aamun kulta!#'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>document.querySelector('input').value)==='AAMUN KULTA','nimi suodatetaan isoiksi sallituiksi merkeiksi');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); await shot('3-mutaatio-nimetty');
  ok(await pg.evaluate(()=>__S().names['heltta~yield']==='AAMUN KULTA'),'nimi tallentuu');
  ok(await pg.evaluate(()=>__G.prodName('itio:heltta~yield'))==='AAMUN KULTA-ITIÖ','nimi näkyy myynnissä');
  await jatka(); await pg.waitForTimeout(200);
  // 4. hylkiminen
  await dish('heltta','kalvo',{kind:'fail'});
  await pg.waitForTimeout(2600); await shot('4-hylkiminen-keski');
  await pg.waitForTimeout(1200); await shot('4-hylkiminen-loppu');
  ok(await pg.evaluate(()=>__G.failedPair('kalvo','heltta')),'hylätty pari merkitään');
  await jatka(); await pg.waitForTimeout(200);
  // hautomon valinta: hylätty pari yliviivattuna
  await pg.evaluate(()=>{ const d=__S().rooms.huone.cells[0]; __U.modal={type:'device',c:d,r:'huone',i:0,pickA:'heltta'}; });
  await pg.waitForTimeout(200); await shot('4-hautomo-yliviivattu'); await pg.evaluate(()=>{ __U.modal=null; });
  // 5. kontaminaatio
  await dish('ruusu','hamara',{kind:'villi'});
  await pg.waitForTimeout(2600); await shot('5-kontaminaatio-keski');
  await pg.waitForTimeout(1200); await shot('5-kontaminaatio-loppu');
  ok(await pg.evaluate(()=>__S().inv.villi===1),'villi näyte saatu');
  await jatka(); await pg.waitForTimeout(200);
  // 6. retki
  await pg.evaluate(()=>{ __R.start('lyhyt'); __sim(8000); __S().known.hamara=0; delete __S().known.hamara; __RV.openRetki(); });
  await pg.waitForTimeout(1500); await shot('6-retki-keski');
  await pg.waitForTimeout(1500); await shot('6-retki-loppu');
  await jatka(); await pg.waitForTimeout(200);
  ok(await view()==='room','retken jälkeen huoneessa');
  // 7. jono: malja ja retki valmiina poissa ollessa
  await pg.evaluate(()=>{ const S=__S(), d=S.rooms.huone.cells[0]; __G.startDish(d,'heltta','hamara'); d.dish.res={kind:'new',key:'hoitaja',n:2};
    __R.start('lyhyt'); });
  // uusi sivu, jonka tallennus on 9 h vanha (vanhan sivun oma tallennus ei ylikirjoita sitä)
  const save=await pg.evaluate(()=>{ const S=JSON.parse(JSON.stringify(__S())); S.kotiLast=Date.now()-9*3600*1000; return JSON.stringify(S); });
  await pg.close(); pg=await b.newPage({viewport:{width:384,height:672}}); pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(sv=>{ if (!sessionStorage.getItem('tp7')){ sessionStorage.setItem('tp7','1'); localStorage.setItem('solmu_yhteinen_v1',sv); } }, save);
  await pg.goto(BASE+'/koti/'); await pg.waitForTimeout(900);
  ok(await view()==='reveal','jono avautuu pelin alkaessa');
  ok(await pg.evaluate(()=>__RV.state.cur.wait && __RV.state.cur.lahde==='malja' && __RV.state.queue.length===1),'ensin malja, sitten retki, odottaa napautusta');
  await shot('7-jono-odottaa');
  await pg.waitForTimeout(1500); ok(await pg.evaluate(()=>__RV.state.cur.wait),'ei automaattista ohitusta');
  await tapCenter(); await pg.waitForTimeout(4500); await shot('7-jono-malja');
  await jatka(); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>__RV.state.cur && __RV.state.cur.lahde==='retki' && __RV.state.cur.wait),'seuraavaksi retki odottaa');
  await shot('7-jono-retki-odottaa');
  await tapCenter(); await pg.waitForTimeout(3500); await jatka(); await pg.waitForTimeout(300);
  ok(await view()==='room','jono tyhjä: huone');
  // 8. kantakirja ja sukupuu
  ok(await pg.evaluate(()=>__S().known.hoitaja===1),'hoitaja tunnettu');
  await shot('8-huone-kannat-hehkuu');
  await pg.evaluate(()=>{ __U.book={tab:'lista',page:null,p:0}; __U.view='book'; }); await pg.waitForTimeout(200); await shot('8-kantakirja');
  await pg.evaluate(()=>{ __U.book.tab='puu'; }); await pg.waitForTimeout(200); await shot('8-sukupuu');
  await pg.evaluate(()=>{ __U.book.page='heltta~yield'; }); await pg.waitForTimeout(200); await shot('8-sivu-mutaatio');
  await pg.evaluate(()=>{ __U.book.page='verkko'; }); await pg.waitForTimeout(200); await shot('8-sivu-tuntematon');
  await pg.evaluate(()=>{ __U.book.page='ruusu'; }); await pg.waitForTimeout(200); await shot('8-sivu-ruusu');
  console.log('virheet',errs); if (errs.length) fails++;
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
