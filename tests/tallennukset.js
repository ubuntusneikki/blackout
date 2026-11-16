// Aja: python3 -m http.server 8765 (repon juuressa) ja sitten node tests/tallennukset.js
const BASE=process.env.BASE||'http://localhost:8765';
// vanhat tallennukset (V0.2 ja V0.3) + ulkosivu v1-tallennuksen kanssa
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:384,height:672}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 const saves={
  v02:{sato:10,uute:2,speed:60,rows:3,healed:2,places:[{lat:1,lon:1}],slots:[{id:1,type:'terraario',strain:'heltta',growth:0.5,moist:1,ready:false},{id:2,type:'purkki',strain:'kaapa',growth:1,moist:1,ready:true},null,{id:5,type:'akvaario',strain:null,growth:0,moist:1,ready:false},null,null,null,null,null],spores:{heltta:2,kaapa:1,hoitaja:1},vesselInv:['palvelin'],kotiLast:Date.now(),found:{a:1},cells:{},memories:[1,2]},
  v03:{speed:60,rows:2,mk:42,goods:{'r:heltta':3,'j:ruusu':2,'r:kaapa':1},seen:{heltta:1},market:{sat:{},spike:null,nextSpike:900},slots:[{id:1,type:'terraario',strain:null,growth:0,moist:1,ready:false},null,null,null,null,null,null,null,null],spores:{heltta:2},vesselInv:[],kotiLast:Date.now(),found:{},cells:{},memories:[],walked:0}
 };
 saves.v1kuivaus={schema:1,speed:60,hopea:10,rooms:{huone:{owned:true,cells:[{id:1,kind:'device',type:'kuivain',t:0.5,busy:true,done:false,job:'heltta',n:4},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]},kellari:{owned:false,cells:new Array(12).fill(null)}},cur:'huone',inv:{'dry:heltta':3,'raw:ruusu':2},spores:{heltta:1},vesselInv:[],deviceInv:['kuivain'],bought:{purkki:0,terraario:0},sold:12,known:{heltta:1,ruusu:1},tried:{},market:{sat:{'dry:heltta':2},spike:{id:'dry:ruusu',left:100},nextSpike:5000},flags:{lab:true},order:null,kotiLast:Date.now()};
 // V1.5/V2.1 (ennen genomia): mutaatioavaimet kanta~perk, nimet, kesken oleva malja vanhalla reseptituloksella, hylätty pari
 const C=(o)=>Object.assign(new Array(16).fill(null),o);
 saves.v15mutaatiot={schema:1,speed:60,hopea:50,rooms:{huone:{owned:true,cells:C({0:{id:1,kind:'vessel',type:'terraario',strain:'kalvo~grow',growth:0.6,moist:0.8,ready:false,waves:0},
   1:{id:2,kind:'device',type:'hautomo',t:0.4,busy:true,done:false,dish:{a:'heltta',b:'ruusu',res:{kind:'new',key:'kalvo',n:2}}},
   2:{id:3,kind:'device',type:'kehikko',t:0.2,busy:true,done:false,job:'heltta~yield'},3:{id:4,kind:'vessel',type:'purkki',strain:'hoitaja~grow',growth:1,moist:1,ready:false,waves:0}})},kellari:{owned:false,cells:new Array(12).fill(null)}},
   cur:'huone',inv:{'raw:heltta~yield':4,'raw:kalvo':2,agar:2,suodatin:1},spores:{heltta:2,'heltta~yield':3,'kalvo~grow':1,hoitaja:1},vesselInv:[],deviceInv:[],bought:{},sold:40,
   known:{heltta:1,ruusu:1,kalvo:1,hoitaja:1,'heltta~yield':1,'kalvo~grow':1},tried:{'heltta+ruusu':'ok','hamara+ruusu':'fail'},market:{sat:{'raw:heltta~yield':3},spike:null,nextSpike:900},
   flags:{lab:true,retki:true},order:null,retki:{cur:null,n:3,deep:0},names:{'heltta~yield':'AAMUN KULTA'},book:{seen:{heltta:1,'heltta~yield':1}},kotiLast:Date.now()};
 let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
 for (const [n,sv] of Object.entries(saves)){
   await pg.goto(''+BASE+'/koti/manifest.webmanifest'); await pg.evaluate(s=>localStorage.setItem('solmu_yhteinen_v1',JSON.stringify(s)),sv);
   await pg.goto(''+BASE+'/koti/'); await pg.waitForTimeout(500);
   ok(await pg.evaluate(()=>{ const S=__S(); return !!S.seed && !!S.kannat && !!S.tieto && !!S.crossN && !JSON.stringify(S).includes('~'); }), n+': genomikentät on ja vanhat ~-avaimet muunnettu');
   ok(await pg.evaluate(()=>{ const S=__S(); const keys=[...Object.keys(S.spores),...Object.keys(S.known)]; for (const r in S.rooms) for (const c of S.rooms[r].cells) if (c&&c.strain) keys.push(c.strain);
     return keys.every(k=>{ try { return !!__G.prodName('itio:'+k) && (k in {heltta:1,ruusu:1,hamara:1,kalvo:1,hoitaja:1,verkko:1,yoruusu:1} || !!S.kannat[k]); } catch(e){ return false; } }); }), n+': jokainen kanta löytyy pohjakannoista tai rekisteristä');
   ok(await pg.evaluate(()=>Number.isFinite(__S().hopea)), n+': hopea on luku');
   console.log(n, JSON.stringify(await pg.evaluate(()=>{ const S=__S(); return {hopea:S.hopea, inv:S.inv, spores:S.spores, known:S.known, cells:S.rooms.huone.cells.map(c=>c&&(c.type+':'+(c.strain||'-'))), vi:S.vesselInv, mem:S.memories}; })));
 }
 // V1.5-tallennuksen yksityiskohdat (viimeisin ladattu on v15mutaatiot)
 ok(await pg.evaluate(()=>{ const S=__S(); const k=Object.keys(S.names)[0]; return S.names[k]==='AAMUN KULTA' && S.kannat[k] && S.kannat[k].mut && S.spores[k]===3 && S.known[k]===1 && S.inv['raw:'+k]===4 && __G.prodName('itio:'+k)==='AAMUN KULTA-ITIÖ'; }),'vanha mutaatio säilyy nimineen pienenä mutaationa (itiöt, sato, kantakirja)');
 ok(await pg.evaluate(()=>{ const S=__S(), c=S.rooms.huone.cells; return S.kannat[c[0].strain] && c[0].growth>=0.6 && c[3].strain==='hoitaja' && S.kannat[c[2].job]; }),'astioiden ja kehikon kannat muunnettu, kasvu säilyy');
 ok(await pg.evaluate(()=>{ const S=__S(), t=S.tieto; return ['heltta','ruusu','kalvo','hoitaja'].every(k=>t[k]&&t[k].k&&t[k].g) && Object.keys(S.kannat).every(k=>t[k]&&t[k].k&&t[k].g); }),'vanhan tallennuksen kantojen piirteet ovat tunnettuja');
 ok(await pg.evaluate(()=>{ const S=__S(), d=S.rooms.huone.cells[1]; const r=d.dish.res; if (!(r.kind==='villi' || (r.kind==='new' && r.g && r.from))) return false; __sim(30000); const o=__G.openDish(d); return !!o && (o.kind==='villi' || !!S.kannat[o.key] || o.key in {heltta:1,ruusu:1}); }),'kesken ollut malja arvotaan uudelleen genomilla ja avautuu');
 // toinen lataus ei muuta mitään (muunnos on idempotentti)
 const before=await pg.evaluate(()=>JSON.stringify([__S().kannat,__S().spores,__S().names])); await pg.reload(); await pg.waitForTimeout(500);
 ok(before===await pg.evaluate(()=>JSON.stringify([__S().kannat,__S().spores,__S().names])),'muunnos on idempotentti');
 // ulko lukee ja kirjoittaa v1-tallennusta rikkomatta kodin kenttiä
 await pg.goto(''+BASE+'/ulko/?sim&demo'); await pg.waitForTimeout(2500);
 await pg.evaluate(()=>{ const f=DBG.finds[0]; DBG.collect(f); });
 const s=await pg.evaluate(()=>JSON.parse(localStorage.getItem('solmu_yhteinen_v1')));
 console.log('ulko jälkeen', s.schema, !!s.rooms, s.hopea, s.spores, s.vesselInv, s.memories);
 await pg.goto(''+BASE+'/koti/'); await pg.waitForTimeout(400);
 console.log('koti taas', await pg.evaluate(()=>({h:__S().hopea, k:__S().known})));
 console.log('errors',errs); if (errs.length) fails++; await b.close(); process.exitCode=fails?1:0;
})();
