// Paljastus ja kantakirja (TP7, V2.2 genomi). Aja: python3 -m http.server 8765 (repon juuressa) ja node tests/tp7-paljastus.js [kuvakansio]
// Hakee siemenestä jokaisen tuloksen (uusi risteymä, tuttu, pieni/harvinainen/ainutlaatuinen mutaatio + nimeäminen, kontaminaatio,
// tutkimusmalja, retki), testaa piirteiden paljastumisen, jonon (malja ja retki valmiina poissa ollessa) ja ottaa kuvat.
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
    await pg.evaluate(()=>{ const S=__S(); S.flags.lab=true; S.flags.retki=true; S.sold=20; S.inv.agar=9; S.opastus.pois=true;
      S.spores={heltta:5, ruusu:5, hamara:5}; S.known.hamara=1; S.book.seen.hamara=1; S.tieto.hamara={};
      S.deviceInv.push('hautomo'); __G.place('huone',0,'device','hautomo'); }); };
  // Tulos on määrätty siemenestä ja parin maljojen järjestysnumerosta: aloitetaan maljoja, kunnes haluttu tulos osuu.
  // want: 'uusi' (risteymä ilman mutaatiota), 'pieni' | 'harv' | 'ainut' (mutaatio), 'villi', tai kannan avain (sama tulos uudelleen)
  const dish=(a,b,want)=>pg.evaluate(([a,b,want])=>{ const S=__S(), d=S.rooms.huone.cells[0];
    for (let i=0;i<20000;i++){ S.spores[a]=5; S.spores[b]=5; S.inv.agar=9; d.busy=false; d.dish=null;
      __G.startDish(d,a,b); const r=d.dish.res;
      const hit = want==='villi' ? r.kind==='villi' : r.kind==='new' && (want==='uusi' ? !r.mut : r.mut ? r.mut.t===want : r.key===want);
      if (hit){ __sim(30000); __RV.openMalja(d); return r.key||r.kind; } }
    return null; },[a,b,want]);
  const view=()=>pg.evaluate(()=>__U.view);
  const tapCenter=()=>pg.mouse.click(192,300);
  const jatka=()=>pg.mouse.click(192,615);
  const name=k=>pg.evaluate(k=>__G.prodName('itio:'+k),k);

  await fresh();
  // 1. uusi risteymä: periytyy ryhmittäin, tunnettujen vanhempien piirteet tunnetaan heti
  const k1=await dish('heltta','ruusu','uusi');
  await pg.waitForTimeout(2400); await shot('1-uusi-keski');
  await pg.waitForTimeout(2400); await shot('1-uusi-loppu');
  ok(k1 && k1[0]==='x','risteymä saa oman avaimen ('+k1+', '+await name(k1)+')');
  ok(await pg.evaluate(k=>__S().known[k]===1 && __S().spores[k]===2 && !!__S().kannat[k],k1),'uusi kanta tunnettu, rekisterissä ja itiöt saatu');
  ok(await pg.evaluate(k=>{ const t=__S().tieto[k]; return t.k===1 && t.g===1; },k1),'tunnettujen vanhempien piirteet periytyvät tunnettuina');
  ok(await pg.evaluate(k=>{ const g=__S().kannat[k].g; return ['heltta','ruusu'].includes(g.M[0]) && ['heltta','ruusu'].includes(g.G[0]); },k1),'geeniryhmät tulevat vanhemmilta');
  ok(await pg.evaluate(()=>__S().tried['heltta+ruusu']==='ok'),'kokeiltu pari muistetaan');
  await jatka(); await pg.waitForTimeout(200); ok(await view()==='room','JATKA palaa huoneeseen');
  // 2. sama geeniyhdistelmä uudelleen = tuttu kanta, itiöt pinoutuvat
  await dish('heltta','ruusu',k1);
  await pg.waitForTimeout(1300); await shot('2-tuttu-keski');
  await pg.waitForTimeout(1500); await shot('2-tuttu-loppu');
  ok(await pg.evaluate(k=>__S().spores[k]===4,k1),'sama yhdistelmä pinoutuu samaan kantaan');
  await jatka(); await pg.waitForTimeout(200);
  // 3. pieni mutaatio + nimeäminen
  const k3=await dish('heltta','ruusu','pieni');
  await pg.waitForTimeout(2600); await shot('3-mutaatio-keski');
  await pg.waitForTimeout(2600); await shot('3-mutaatio-nimeaminen');
  const sug=await pg.evaluate(()=>document.querySelector('input').value);
  ok(sug && sug+'-ITIÖ'===await name(k3),'nimiehdotus on kannan oletusnimi ('+sug+')');
  await pg.evaluate(()=>{ const i=document.querySelector('input'); i.value=''; i.focus(); });
  await pg.keyboard.type('Aamun kulta!#'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>document.querySelector('input').value)==='AAMUN KULTA','nimi suodatetaan isoiksi sallituiksi merkeiksi');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); await shot('3-mutaatio-nimetty');
  ok(await pg.evaluate(k=>__S().names[k]==='AAMUN KULTA',k3),'nimi tallentuu');
  ok(await name(k3)==='AAMUN KULTA-ITIÖ','nimi näkyy myynnissä');
  ok(await pg.evaluate(k=>{ const m=__S().kannat[k].mut; return m && m.t==='pieni' && !!m.txt; },k3),'mutaatio on kirjattu kantaan');
  await jatka(); await pg.waitForTimeout(200);
  // 4. tutkimaton vanhempi: siltä peritty ryhmä jää kysymysmerkiksi, tutkimusmalja paljastaa
  const k4=await pg.evaluate(()=>{ const S=__S(), d=S.rooms.huone.cells[0];
    for (let i=0;i<500;i++){ S.spores.heltta=5; S.spores.hamara=5; S.inv.agar=9; d.busy=false; d.dish=null; __G.startDish(d,'heltta','hamara'); const r=d.dish.res;
      if (r.kind==='new' && !r.mut && r.from.K===(d.dish.a==='hamara'?'a':'b')){ __sim(30000); __RV.openMalja(d); return r.key; } } return null; });
  await pg.waitForTimeout(4600); await shot('4-tuntematon-kyky');
  ok(await pg.evaluate(k=>!__S().tieto[k].k,k4),'tutkimattomalta vanhemmalta peritty kyky on tuntematon');
  await jatka(); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ const d=__S().rooms.huone.cells[0]; __U.modal={type:'device',c:d,r:'huone',i:0,pickA:'hamara'}; });
  await pg.waitForTimeout(200); await shot('4-hautomo-valinta'); await pg.evaluate(()=>{ __U.modal=null; });
  ok(await pg.evaluate(()=>{ const d=__S().rooms.huone.cells[0]; const o=__G.startStudy(d,'hamara'); __sim(7300); return o && d.done; }),'tutkimusmalja valmistuu 2 tunnissa');
  await pg.evaluate(()=>__RV.openMalja(__S().rooms.huone.cells[0]));
  await pg.waitForTimeout(4200); await shot('4-tutkittu');
  ok(await pg.evaluate(()=>{ const t=__S().tieto.hamara; return t.k===1 && t.g===1; }),'tutkimus paljastaa kyvyn ja kasvun');
  await jatka(); await pg.waitForTimeout(200);
  // sato paljastaa kasvun
  ok(await pg.evaluate(k=>{ const S=__S(); delete S.tieto[k].g; const c=S.rooms.huone.cells.find(c=>c&&c.kind==='vessel'); if (c.strain) __G.clearVessel(c);
    S.spores[k]=1; __G.plant(c,k); for(let i=0;i<200&&!c.ready;i++){ __G.mist(c); __sim(600); } __G.harvest(c); return S.tieto[k].g===1; },k4),'ensimmäinen sato paljastaa kasvun');
  // 5. kontaminaatio
  await dish('ruusu','hamara','villi');
  await pg.waitForTimeout(2600); await shot('5-kontaminaatio-keski');
  await pg.waitForTimeout(1200); await shot('5-kontaminaatio-loppu');
  ok(await pg.evaluate(()=>__S().inv.villi===1),'villi näyte saatu');
  await jatka(); await pg.waitForTimeout(200);
  // 6. harvinainen ja ainutlaatuinen mutaatio
  const k6=await dish('ruusu','hamara','harv');
  await pg.waitForTimeout(5200); await shot('6-harvinainen');
  ok(!!k6 && await pg.evaluate(k=>__S().kannat[k].mut.t==='harv',k6),'harvinainen mutaatio löytyy siemenestä');
  await pg.evaluate(()=>{ const i=document.querySelector('input'); if (i) i.blur(); }); await pg.keyboard.press('Escape'); await pg.mouse.click(110,600); await pg.waitForTimeout(300);
  await jatka(); await pg.waitForTimeout(300);
  ok(await view()==='room','nimeämisen ohitus ja JATKA palaavat huoneeseen');
  const k7=await dish('heltta','hamara','ainut');
  await pg.waitForTimeout(5600); await shot('6-ainutlaatuinen');
  ok(!!k7 && await pg.evaluate(k=>__S().kannat[k].mut.t==='ainut',k7),'ainutlaatuinen mutaatio löytyy siemenestä');
  await pg.mouse.click(110,600); await pg.waitForTimeout(300); await jatka(); await pg.waitForTimeout(300);
  // determinismi: sama siemen ja sama maljan järjestysnumero antavat saman tuloksen
  ok(await pg.evaluate(()=>{ const S=__S(), d=S.rooms.huone.cells[0]; const go=()=>{ S.spores.heltta=5; S.spores.ruusu=5; S.inv.agar=9; d.busy=false; d.dish=null; __G.startDish(d,'heltta','ruusu'); return JSON.stringify(d.dish.res); };
    const n=S.crossN['heltta+ruusu']; const r1=go(); S.crossN['heltta+ruusu']=n; const r2=go(); d.busy=false; d.dish=null; return r1===r2; }),'sama malja antaa aina saman tuloksen');
  // 7. retki
  await pg.evaluate(()=>{ __R.start('lyhyt'); __sim(8000); __RV.openRetki(); });
  await pg.waitForTimeout(1500); await shot('7-retki-keski');
  await pg.waitForTimeout(1500); await shot('7-retki-loppu');
  await jatka(); await pg.waitForTimeout(200);
  ok(await view()==='room','retken jälkeen huoneessa');
  // 8. jono: malja ja retki valmiina poissa ollessa
  await pg.evaluate(()=>{ const S=__S(), d=S.rooms.huone.cells[0]; S.spores.heltta=5; S.spores.hamara=5; S.inv.agar=9; __G.startDish(d,'heltta','hamara'); __R.start('lyhyt'); });
  // uusi sivu, jonka tallennus on 9 h vanha (vanhan sivun oma tallennus ei ylikirjoita sitä)
  const save=await pg.evaluate(()=>{ const S=JSON.parse(JSON.stringify(__S())); S.kotiLast=Date.now()-9*3600*1000; return JSON.stringify(S); });
  await pg.close(); pg=await b.newPage({viewport:{width:384,height:672}}); pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(sv=>{ if (!sessionStorage.getItem('tp7')){ sessionStorage.setItem('tp7','1'); localStorage.setItem('solmu_yhteinen_v1',sv); } }, save);
  await pg.goto(BASE+'/koti/'); await pg.waitForTimeout(900);
  ok(await view()==='reveal','jono avautuu pelin alkaessa');
  ok(await pg.evaluate(()=>__RV.state.cur.wait && __RV.state.cur.lahde==='malja' && __RV.state.queue.length===1),'ensin malja, sitten retki, odottaa napautusta');
  await shot('8-jono-odottaa');
  await pg.waitForTimeout(1500); ok(await pg.evaluate(()=>__RV.state.cur.wait),'ei automaattista ohitusta');
  await tapCenter(); await pg.waitForTimeout(5600); await shot('8-jono-malja');
  if (await pg.evaluate(()=>{ const i=document.querySelector('input'); return i && i.style.display!=='none'; })){ await pg.mouse.click(110,600); await pg.waitForTimeout(300); }
  await jatka(); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>__RV.state.cur && __RV.state.cur.lahde==='retki' && __RV.state.cur.wait),'seuraavaksi retki odottaa');
  await shot('8-jono-retki-odottaa');
  await tapCenter(); await pg.waitForTimeout(3500); await jatka(); await pg.waitForTimeout(300);
  ok(await view()==='room','jono tyhjä: huone');
  ok(await pg.evaluate(k=>!!__S().kannat[k] && __S().names[k]==='AAMUN KULTA',k3),'kannat ja nimet säilyvät tallennuksessa');
  // 9. kantakirja ja sukupuu
  await shot('9-huone-kannat-hehkuu');
  await pg.evaluate(()=>{ __U.book={tab:'lista',page:null,p:0}; __U.view='book'; }); await pg.waitForTimeout(200); await shot('9-kantakirja');
  await pg.evaluate(()=>{ __U.book.p=1; }); await pg.waitForTimeout(200); await shot('9-kantakirja-2');
  await pg.evaluate(()=>{ __U.book.p=0; __U.book.tab='puu'; }); await pg.waitForTimeout(200); await shot('9-sukupuu');
  await pg.evaluate(k=>{ __U.book.page=k; },k3); await pg.waitForTimeout(200); await shot('9-sivu-mutaatio');
  await pg.evaluate(k=>{ __U.book.page=k; },k4); await pg.waitForTimeout(200); await shot('9-sivu-risteyma');
  await pg.evaluate(()=>{ __U.book.page='verkko'; }); await pg.waitForTimeout(200); await shot('9-sivu-tuntematon');
  await pg.evaluate(()=>{ __U.book.page='ruusu'; }); await pg.waitForTimeout(200); await shot('9-sivu-ruusu');
  console.log('virheet',errs); if (errs.length) fails++;
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
