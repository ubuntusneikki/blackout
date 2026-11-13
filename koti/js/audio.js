// TP6: äänet ilman äänitiedostoja (WebAudio-synteesi) ja värinä.
// Kytkeytyy vain events.js:n tapahtumiin. Käynnistyy ensimmäisestä kosketuksesta (selaimen sääntö).
// Äänimaailma: lasi, neste ja elävä rihmasto. Pentatoninen asteikko, pieni satunnaisvaihtelu ja
// toiston vaimennus, jotta sama ääni ei ärsytä sadannella kerralla.
import {on} from './events.js';

const PREF_KEY = 'solmu_aani';          // laitekohtainen asetus, ei osa pelitallennusta
let enabled = true;
try { enabled = localStorage.getItem(PREF_KEY) !== '0'; } catch(e){}

let AC = null, OUT = null, SFX = null, AMBG = null, VERB = null, noiseBuf = null;
let scene = 'huone';

// D-molli-pentatoninen (D F G A C), useampi oktaavi
const SCALE = []; for (let o=0;o<4;o++) for (const s of [0,3,5,7,10]) SCALE.push(146.83*Math.pow(2,(o*12+s)/12));
const note = i => SCALE[Math.max(0,Math.min(SCALE.length-1,i))];
const rnd = (a,b) => a+Math.random()*(b-a);
const pick = a => a[(Math.random()*a.length)|0];

export function isEnabled(){ return enabled; }
export function setEnabled(v){
  enabled = !!v; try { localStorage.setItem(PREF_KEY, enabled?'1':'0'); } catch(e){}
  if (!AC) { if (enabled) init(); return; }
  OUT.gain.setTargetAtTime(enabled?0.8:0, AC.currentTime, 0.05);
  if (enabled) { AC.resume(); play('tap'); }
}

export function init(){
  if (AC) { if (AC.state==='suspended' && !document.hidden) AC.resume(); return; }
  try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ AC=null; return; }
  const comp = AC.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=4; comp.connect(AC.destination);
  OUT = AC.createGain(); OUT.gain.value = enabled?0.8:0; OUT.connect(comp);
  SFX = AC.createGain(); SFX.gain.value = 1; SFX.connect(OUT);
  AMBG = AC.createGain(); AMBG.gain.value = 0; AMBG.connect(OUT);
  // pieni huonekaiku generoidusta impulssivasteesta
  VERB = AC.createConvolver(); VERB.buffer = impulse(1.8, 2.6);
  const wet = AC.createGain(); wet.gain.value = 0.32; VERB.connect(wet).connect(OUT);
  noiseBuf = AC.createBuffer(1, AC.sampleRate*2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  startAmbient();
  AMBG.gain.setTargetAtTime(1, AC.currentTime+0.3, 1.5);   // ambient nousee pehmeästi
}
function impulse(sec, decay){
  const n=AC.sampleRate*sec, b=AC.createBuffer(2,n,AC.sampleRate);
  for (let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay); }
  return b;
}

// ---------- rakennuspalikat ----------
// sävy: sini + valinnainen yläsävel (lasimainen kello), pehmeä attack, eksponentiaalinen häivytys
function tone(f, t0, dur, vol, o){
  o = o||{};
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type||'sine'; osc.frequency.setValueAtTime(f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0+(o.glide||dur));
  if (o.detune) osc.detune.value = o.detune;
  const a = o.attack||0.008;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0+a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  let node = osc.connect(g);
  if (o.lp){ const f2=AC.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=o.lp; node=g.connect(f2); }
  node.connect(o.dest||SFX); if (o.verb!==false) node.connect(VERB);
  osc.start(t0); osc.stop(t0+dur+0.05);
  return osc;
}
// lasikello: perussävel + epäharmoninen yläsävel
function bell(f, t0, dur, vol, o){
  tone(f, t0, dur, vol, o);
  tone(f*2.76, t0, dur*0.45, vol*0.28, Object.assign({}, o, {to:null}));
}
// suodatettu kohina (sumu, puhallus, multa)
function noise(t0, dur, vol, o){
  o = o||{};
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = o.type||'bandpass'; f.Q.value = o.q||1;
  f.frequency.setValueAtTime(o.f||1500, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0+dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(vol, t0+(o.attack||0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  s.connect(f).connect(g).connect(o.dest||SFX); if (o.verb) g.connect(VERB);
  s.start(t0, Math.random()*1.5); s.stop(t0+dur+0.05);
}
// kupla / pisara: nopea sävelkorkeuden liuku
function drop(t0, f0, f1, vol, dest){ tone(f0, t0, 0.09, vol, {to:f1, glide:0.05, dest, attack:0.003}); }

// ---------- toiston vaimennus ----------
// sama ääni tiheään toistettuna hiljenee ja sen vaihtelu kasvaa; liian tiheä toisto ohitetaan
const recent = {};
function fatigue(name, minGap){
  const now = performance.now(), r = recent[name] || (recent[name]={last:-1e9, heat:0});
  const dt = now - r.last; if (dt < (minGap||45)) return -1;
  r.heat = Math.max(0, r.heat - dt/1500) + 1; r.last = now;
  return Math.max(0.35, 1 - (r.heat-1)*0.12);          // 1 → 0.35
}

// ---------- äänet ----------
const SOUNDS = {
  // käyttöliittymän kosketus: hiljainen lasinen tikitys
  tap(t,v){ tone(rnd(2350,2650), t, 0.035, 0.022*v, {verb:false, type:'triangle'}); },
  // istutus: mullan pehmeä "plop" ja itiön kirkas pilkahdus
  istutus(t,v){ tone(190, t, 0.16, 0.12*v, {to:85, glide:0.12}); noise(t, 0.12, 0.05*v, {type:'lowpass', f:900});
    bell(note(10+((Math.random()*3)|0)), t+0.09, 0.5, 0.03*v); },
  // sumutus: ilmava suhahdus, joka avautuu ylös + pari pisaraa
  sumutus(t,v){ noise(t, 0.42, 0.06*v, {f:2800, to:6500, q:0.8, attack:0.05, verb:true}); noise(t+0.06, 0.3, 0.03*v, {f:5000, q:2});
    drop(t+0.3, rnd(1500,1800), 700, 0.025*v); },
  // korjuu: märkä irtoaminen ja nouseva lasikellosarja (3 säveltä pentatonisesta)
  korjuu(t,v,d){ tone(320, t, 0.12, 0.09*v, {to:120, glide:0.1, type:'triangle', lp:1200}); noise(t, 0.09, 0.05*v, {type:'lowpass', f:1400});
    const base = 7+((Math.random()*3)|0), n = Math.min(5, 2+((d&&d.n)||1)>>1);
    for (let k=0;k<Math.max(3,n);k++) bell(note(base+k+(k>2?1:0)), t+0.07+k*0.075, 0.9, 0.05*v*(1-k*0.1)); },
  // itiöt talteen: pehmeä puhallus ja laskeutuvat kimallukset
  itiot(t,v){ noise(t, 0.35, 0.05*v, {f:1200, to:3200, q:0.7, attack:0.04, verb:true});
    for (let k=0;k<4;k++) bell(note(16-k*2+((Math.random()*2)|0)), t+0.05+k*0.06, 0.6, 0.025*v); },
  // kolikko (hopea): kirkas kello, korkeus vaihtelee; lennon päätteeksi pieni "tik"
  coin(t,v){ const i=12+((Math.random()*4)|0); bell(note(i), t, 0.55, 0.05*v); bell(note(i+2), t+0.06, 0.7, 0.045*v); },
  tick(t,v){ bell(note(14+((Math.random()*5)|0)), t, 0.25, 0.022*v, {verb:false}); },
  // osto: lämmin tömähdys ja nouseva kaksoiskello
  osto(t,v){ tone(110, t, 0.22, 0.12*v, {to:70, glide:0.18, type:'triangle', lp:600}); bell(note(9), t+0.05, 0.5, 0.04*v); bell(note(12), t+0.13, 0.7, 0.04*v); },
  // esine paikalleen: puinen naputus
  sijoitus(t,v){ tone(260, t, 0.08, 0.1*v, {to:180, type:'triangle', lp:900}); noise(t, 0.05, 0.05*v, {f:700, q:3}); tone(390, t+0.07, 0.07, 0.06*v, {to:300, type:'triangle', lp:900}); },
  siirto(t,v){ SOUNDS.sijoitus(t,v*0.7); },
  // komposti: vaimea mullan murina
  komposti(t,v){ noise(t, 0.4, 0.07*v, {type:'lowpass', f:500, to:180, attack:0.03}); tone(90, t, 0.3, 0.08*v, {to:55, lp:300}); },
  // malja hautomoon: lasin kilahdus ja kupla
  malja(t,v){ bell(note(15), t, 0.35, 0.035*v); bell(note(17), t+0.02, 0.3, 0.02*v); drop(t+0.12, 300, 900, 0.04*v); drop(t+0.22, 420, 1100, 0.03*v); },
  // laite valmis / kypsyi: hiljainen kahden sävelen ilmoitus (ei hälytys)
  valmis(t,v){ bell(note(10), t, 0.9, 0.04*v); bell(note(14), t+0.14, 1.1, 0.04*v); },
  kypsyi(t,v){ for (let k=0;k<3;k++) bell(note(12+k*2), t+k*0.09, 0.9, 0.022*v); },
  // horros: alas liukuva huokaus
  herasi(t,v){ tone(note(4), t, 0.6, 0.03*v, {to:note(9), glide:0.4, type:'triangle', lp:900, attack:0.05}); },
  horros(t,v){ tone(note(7), t, 0.8, 0.03*v, {to:note(2), glide:0.7, type:'triangle', lp:800, attack:0.08}); },
  // paljastus: pehmeä sointu, joka aukeaa (Dm9 → F-maj7 -henki)
  reveal(t,v){ [0,2,4,6,8].forEach((i,k)=>{ const f=note(5+i);
      tone(f, t+k*0.11, 2.6, 0.032*v, {attack:0.25, type:'triangle', lp:1800}); tone(f, t+k*0.11, 2.6, 0.02*v, {attack:0.3, detune:7}); });
    bell(note(17), t+0.65, 1.6, 0.03*v); },
  uusi(t,v){ SOUNDS.reveal(t,v); [12,14,15,17,19].forEach((i,k)=>bell(note(i), t+1.0+k*0.08, 1.2, 0.03*v)); },
  // epäonnistunut risteytys: kaksi laskevaa vaimeaa säveltä
  fail(t,v){ [note(7), note(5)].forEach((f,k)=>tone(f, t+k*0.18, 0.8, 0.045*v, {type:'triangle', lp:900, attack:0.03})); },
  // kontaminaatio: villi, kylmä violetti huojunta
  villi(t,v){ for (const [f,dt] of [[note(6),0],[note(6)*1.06,0.05],[note(9)*1.414/1.33,0.12]]){
      const o=tone(f, t+dt, 2.2, 0.03*v, {attack:0.3, lp:1400});
      const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=5.5; lg.gain.value=f*0.012; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t+2.4); }
    noise(t, 1.6, 0.025*v, {f:900, to:300, q:4, attack:0.4, verb:true}); },
  // virhe: pehmeä kaksoisbuup, ei kirkuva
  virhe(t,v){ tone(196, t, 0.12, 0.07*v, {type:'triangle', lp:700}); tone(175, t+0.13, 0.16, 0.07*v, {type:'triangle', lp:700}); },
  // avaus, tilaus valmis: isompi juhla
  avaus(t,v){ [0,2,4,5,7,9].forEach((i,k)=>bell(note(8+i), t+k*0.08, 1.4, 0.04*v)); SOUNDS.reveal(t+0.4, v*0.7); },
  // kysyntäpiikki: torilta kuplii
  piikki(t,v){ for (let k=0;k<5;k++) drop(t+k*0.07, rnd(350,600), rnd(900,1400), 0.03*v); bell(note(13), t+0.38, 0.6, 0.03*v); }
};

export function play(name, data){
  if (!AC || !enabled || !SOUNDS[name] || AC.state!=='running') return;
  const v = fatigue(name, name==='tick'?25:60); if (v<0) return;
  try { SOUNDS[name](AC.currentTime+0.01, v, data); } catch(e){}
}

// ---------- värinä (Android; iOS ohittaa) ----------
export function haptic(p){ if (!enabled || !navigator.vibrate) return; try { navigator.vibrate(p); } catch(e){} }

// ---------- ambient: matala humina, ilmanvaihto ja pisarat ----------
let ambTimer = null, humGain = null, airF = null;
function startAmbient(){
  const t = AC.currentTime;
  humGain = AC.createGain(); humGain.gain.value = 0.018; humGain.connect(AMBG);
  const hf = AC.createBiquadFilter(); hf.type='lowpass'; hf.frequency.value=260; hf.connect(humGain);
  for (const [f,type,vol] of [[55,'sine',1],[55.35,'sine',0.8],[110.2,'triangle',0.25],[164.9,'sine',0.1]]){
    const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.value=f; g.gain.value=vol; o.connect(g).connect(hf); o.start(t); }
  // hidas "hengitys" huminaan
  const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=0.07; lg.gain.value=0.007; lfo.connect(lg).connect(humGain.gain); lfo.start(t);
  // ilmanvaihto: tumma kohina
  const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
  airF=AC.createBiquadFilter(); airF.type='lowpass'; airF.frequency.value=420; airF.Q.value=0.5;
  const ag=AC.createGain(); ag.gain.value=0.012; s.connect(airF).connect(ag).connect(AMBG); s.start(t);
  scheduleDrip();
}
function scheduleDrip(){
  const cellar = scene==='kellari';
  const wait = cellar ? rnd(1800,6000) : rnd(4500,13000);
  ambTimer = setTimeout(()=>{
    if (AC && enabled && AC.state==='running'){
      const t=AC.currentTime+0.01, r=Math.random();
      if (r<0.7) { drop(t, rnd(1200,2000)*(cellar?0.8:1), rnd(500,700), rnd(0.008,0.018), AMBG); if (Math.random()<0.3) drop(t+rnd(0.15,0.4), rnd(1300,1900), 600, 0.008, AMBG); }
      else if (r<0.9) { for (let k=0;k<3;k++) drop(t+k*rnd(0.06,0.12), rnd(250,420), rnd(600,900), 0.007, AMBG); }   // kuplat astiassa
      else bell(note(13+((Math.random()*6)|0)), t, 2.5, 0.006, {dest:AMBG});   // kaukainen lasin soitto
    }
    scheduleDrip();
  }, wait);
}
// näkymä vaikuttaa ambientiin: kellari kosteampi ja matalampi, paljastuksessa ambient vaimenee
export function setScene(s){
  if (s===scene) return; scene = s; if (!AC) return;
  const t=AC.currentTime;
  if (airF) airF.frequency.setTargetAtTime(s==='kellari'?300:420, t, 0.8);
  AMBG.gain.setTargetAtTime(s==='reveal'?0.25:1, t, 0.6);
}

// taustalle vaihdettaessa ääni pois (akku), takaisin tultaessa päälle
document.addEventListener('visibilitychange', ()=>{ if (!AC) return; if (document.hidden) AC.suspend(); else if (enabled) AC.resume(); });

// ---------- kytkentä pelitapahtumiin ----------
const MAP = {
  istutus:['istutus',12], korjuu:['korjuu',[18,40,28]], itiot:['itiot',14], sumutus:['sumutus',8],
  komposti:['komposti',20], sijoitus:['sijoitus',15], siirto:['siirto',10],
  'malja-alku':['malja',12], 'laite-alku':['malja',12], 'laite-valmis':['valmis',null], 'laite-keruu':['korjuu',[18,40,28]],
  myynti:['coin',10], osto:['osto',[12,30,12]], toimitus:['coin',[10,30,10]], kysyntapiikki:['piikki',null],
  avaus:['avaus',[20,60,20,60,40]], virstanpylvas:['avaus',[20,60,20,60,40]], herasi:['herasi',null], paluu:['valmis',null], 'tilaus-uusi':['valmis',null],
  testiloyto:['itiot',10], pelastus:['itiot',null], virhe:['virhe',[25,50,25]], kypsyi:['kypsyi',null], horros:['horros',null],
  'retki-alku':['itiot',12], 'retki-palasi':['valmis',[15,40,15]], 'retki-loyto':['reveal',[20,60,40]]   // TP5 rihmaretki
};
on('*', (d, name) => {
  const m = MAP[name]; if (!m) return;
  play(m[0], d); if (m[1]) haptic(m[1]);
});
// taulun tilaus on pienempi juhla kuin torin väen suodatintilaus
on('tilaus-valmis', d => { if (d.lahde==='taulu'){ play('coin'); play('valmis'); haptic([15,40,15]); } else { play('avaus'); haptic([30,60,30,60,80]); } });
on('malja-auki', d => { const k = d.tulos && d.tulos.kind;
  if (k==='fail') { play('fail'); haptic([40,80,40]); }
  else if (k==='villi') { play('villi'); haptic([30,50,30,50,30]); }
  else if (d.tulos && d.tulos.first) { play('uusi'); haptic([20,60,20,60,60]); }
  else { play('reveal'); haptic([20,60,40]); } });
