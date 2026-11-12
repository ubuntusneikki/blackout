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
 for (const [n,sv] of Object.entries(saves)){
   await pg.goto(''+BASE+'/index.html'); await pg.evaluate(s=>localStorage.setItem('solmu_yhteinen_v1',JSON.stringify(s)),sv);
   await pg.goto(''+BASE+'/koti/'); await pg.waitForTimeout(500);
   console.log(n, JSON.stringify(await pg.evaluate(()=>{ const S=__S(); return {hopea:S.hopea, inv:S.inv, spores:S.spores, known:S.known, cells:S.rooms.huone.cells.map(c=>c&&(c.type+':'+(c.strain||'-'))), vi:S.vesselInv, mem:S.memories}; })));
 }
 // ulko lukee ja kirjoittaa v1-tallennusta rikkomatta kodin kenttiä
 await pg.goto(''+BASE+'/ulko/?sim&demo'); await pg.waitForTimeout(2500);
 await pg.evaluate(()=>{ const f=DBG.finds[0]; DBG.collect(f); });
 const s=await pg.evaluate(()=>JSON.parse(localStorage.getItem('solmu_yhteinen_v1')));
 console.log('ulko jälkeen', s.schema, !!s.rooms, s.hopea, s.spores, s.vesselInv, s.memories);
 await pg.goto(''+BASE+'/koti/'); await pg.waitForTimeout(400);
 console.log('koti taas', await pg.evaluate(()=>({h:__S().hopea, k:__S().known})));
 await pg.goto(''+BASE+'/'); await pg.waitForTimeout(200); console.log(await pg.textContent('#st'));
 console.log('errors',errs); await b.close();
})();
