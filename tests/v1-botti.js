// pelaa uuden pelin tilaukseen asti pelilogiikan kautta; palauttaa ajan ja tapahtumat
module.exports = function(){
  const G=__G, S=__S(); const log=[]; let T=0; const STEP=60;
  const cells=()=>{ const o=[]; for(const r in S.rooms){ if(!S.rooms[r].owned) continue; S.rooms[r].cells.forEach((c,i)=>{ if(c) o.push({c,r,i}); }); } return o; };
  const free=()=>{ for(const r of ['kellari','huone']){ if(!S.rooms[r].owned) continue; const i=S.rooms[r].cells.findIndex(c=>!c); if(i>=0) return [r,i]; } return null; };
  const ev=(m)=>log.push((Math.round(T/360)/10)+'h: '+m);
  const has=k=>(S.spores[k]||0);
  let flags={};
  while(T<200*3600 && !S.flags.done){
    // laitteet
    for(const {c} of cells()) if(c.kind==='device'&&c.done){ if(c.type==='hautomo'){ const r=G.openDish(c); ev('malja: '+r.kind+(r.key?' '+r.key:'')); } else G.collectDevice(c); }
    // astiat
    for(const {c} of cells()) if(c.kind==='vessel'){
      if(c.ready){ const b=c.strain.split('~')[0];
        const needSp = S.flags.lab && ((b==='heltta'&&has('heltta')<2)||(b==='ruusu'&&has('ruusu')<1)||(b==='hamara'&&has('hamara')<1)||(b==='kalvo'&&has(c.strain)<1));
        if(needSp) G.takeSpores(c); else G.harvest(c); }
      if(c.strain && c.moist<0.3) G.mist(c);
      if(c.strain && !c.ready && S.order && c.type!=='purkki' && !c.strain.startsWith('kalvo') && !c.strain.startsWith('hoitaja') && Object.keys(S.spores).some(k=>k.startsWith('kalvo'))) G.clearVessel(c);
      if(!c.strain){ const pref = S.known.kalvo&&c.type!=='purkki' ? Object.keys(S.spores).filter(k=>k.startsWith('kalvo')) : [];
        const opts = pref.length?pref:Object.keys(S.spores).filter(k=>!(S.flags.lab&&has(k)<=1&&k!=='heltta'&&!k.startsWith('kalvo')));
        const k = opts.sort((a,b)=>G.matchOf(c,b)-G.matchOf(c,a))[0]; if(k) G.plant(c,k); }
    }
    // myynti: kaikki paitsi kehikon kalvoheltta ja tilauksen suodattimet
    for(const id of G.sellables()){ if(id.startsWith('itio:')) { const k=id.slice(5); if (has(k)>3 && !k.startsWith('kalvo')) G.sell(id,has(k)-3); continue; }
      if(id==='raw:kalvo'&&S.rooms && cells().some(o=>o.c.type==='kehikko')) continue;
      if(id==='suodatin' && S.order && !S.flags.done) continue;
      G.sell(id,G.owned(id)); }
    if(S.order && S.inv.suodatin) G.deliver();
    // ostot
    const buyIf=(k,cond)=>{ const h0=S.hopea; if(cond) G.buy(k); if(S.hopea<h0) { ev('osto '+k+' (hopeaa '+Math.round(S.hopea)+')'); return true; } return false; };
    if(S.flags.lab){
      if(!flags.hautomo) flags.hautomo=buyIf('hautomo',true);
      if(flags.hautomo && (S.inv.agar||0)<1) buyIf('agar',true);
    }
    if(S.known.kalvo && !flags.keh) flags.keh=buyIf('kehikko',true);
    if(flags.keh && !flags.kel) flags.kel=buyIf('kellari',S.hopea>360);
    const vcount=cells().filter(o=>o.c.kind==='vessel').length;
    if(vcount<6 && free()) buyIf('terraario', S.hopea>(flags.hautomo?(flags.keh?40:140):70));
    // sijoitus
    while((S.deviceInv.length||S.vesselInv.length) && free()){ const [r,i]=free(); if(S.deviceInv.length) G.place('huone'===r&&S.rooms.huone.cells[i]?r:r,i,'device',S.deviceInv[0]); else G.place(r,i,'vessel',S.vesselInv[0]); }
    // hautomo
    const h=cells().find(o=>o.c.type==='hautomo'&&!o.c.busy);
    if(h && S.inv.agar){ if(!S.known.kalvo && has('heltta')&&has('ruusu')) G.startDish(h.c,'heltta','ruusu');
      else if(S.known.kalvo && !S.known.hoitaja && has('heltta')&&has('hamara')) G.startDish(h.c,'heltta','hamara'); }
    // kehikko
    const k=cells().find(o=>o.c.type==='kehikko'&&!o.c.busy); if(k) G.startFrame(k.c);
    // testilöytö (hämäränuppi) kerran laboratorion jälkeen
    if(S.flags.lab && !flags.retki){ S.retkiReady=0; G.retki(); flags.retki=1; ev('testilöytö'); }
    if(S.flags.lab && !flags.lab){ flags.lab=1; ev('labra auki'); }
    if(S.known.kalvo && !flags.kalvo){ flags.kalvo=1; ev('kalvoheltta tunnettu'); }
    if(S.order && !flags.order){ flags.order=1; ev('tilaus'); }
    G.rescue();
    __sim(STEP); T+=STEP;
  }
  ev(S.flags.done?'TILAUS TÄYTETTY':'EI VALMIS');
  return {gameHours: Math.round(T/360)/10, spores:S.spores, inv:S.inv, hopea:Math.round(S.hopea), log};
};
