// KOTI v1: sisältö ja luvut (ks. docs/kotipeli-v1.md). Luvut ovat lähtöarvoja.
export const VERSION = 'KOTI-01 V1.1';

export const P = {
  bg0:'#0b1018', bg1:'#141c28', bg2:'#1f2a38', bg3:'#2c3a4a', bg4:'#46566a',
  br0:'#22191c', br1:'#33242a', br2:'#4a3330',
  cu0:'#5e321e', cu1:'#a8602f', cu2:'#d99a5b', cu3:'#f3d08a',
  gl0:'#16262e', gl1:'#2d4a55', gl2:'#4f7d86', gl3:'#9fd3d6',
  so0:'#140e0b', so1:'#2a1d16', so2:'#45301f', so3:'#6a4a30',
  mo1:'#3f6a26', mo2:'#79a83a', mo3:'#c2df6a',
  st0:'#8a7d68', st1:'#c9bc9c', st2:'#efe6cc',
  lamp:'#ffcf7a', lampD:'#7a5a2e',
  wa0:'#103540', wa1:'#1d6a78', wa2:'#5fc7d0',
  ui0:'#101722', ui1:'#1c2735', ui2:'#3a4b60', ui3:'#d8e2ea', uiD:'#6a7a8c',
  red:'#e0504a', grn:'#6ae07a',
  ks0:'#2a2a34', ks1:'#3a3a46', ks2:'#4c4c58'   // kellarin kivi
};
export const AMB = ['#7a4a14','#e8a02a','#ffe08a'];
export const WILD = ['#2a1648','#6a3cc0','#c8a8ff'];   // villi rihmasto: kylmä violetti
export const SYM = '#a8fbee';                          // symbiontin ääni

// astiat: ilmasto kostea/lämmin
export const VESSELS = {
  purkki:   {name:'LASIPURKKI',     wet:false, warm:false, size:0.7, dry:1200},
  terraario:{name:'TERRAARIO',      wet:true,  warm:false, size:1.0, dry:2400},
  akvaario: {name:'AKVAARIO',       wet:true,  warm:true,  size:1.2, dry:0,   rare:true},
  palvelin: {name:'PALVELINKAAPPI', wet:false, warm:true,  size:1.1, dry:900, rare:true}
};
// laitteet: elävää kasvatusta, ei koneita
export const DEVICES = {
  hautomo: {name:'HAUTOMO',       time:28800, txt:'LÄMMIN KUPU. KYPSYTTÄÄ AGAR-MALJAN.'},
  kehikko: {name:'KEHIKKO',       time:7200,  txt:'KALVOHELTTA KASVAA KEHIKKOON SUODATTIMEKSI.', need:3}
};
// kannat
export const STRAINS = {
  heltta: {name:'SINIHELTTA',   wet:true,  warm:false, grow:600,  yield:3, col:['#1d5c58','#34b8ac','#a8fbee'], style:'cap'},
  ruusu:  {name:'RUUSUSIENI',   wet:false, warm:true,  grow:900,  yield:4, col:['#5a1f4a','#c4428f','#ffa6d6'], style:'cluster'},
  hamara: {name:'HÄMÄRÄNUPPI',  wet:false, warm:false, grow:720,  yield:3, col:['#3a1f5a','#8a4ad0','#d6b0ff'], style:'nubs'},
  kalvo:  {name:'KALVOHELTTA',  wet:true,  warm:true,  grow:1200, yield:3, col:['#6b2e2a','#e07a64','#ffd2bf'], style:'web'},
  hoitaja:{name:'HOITAJASIENI', wet:true,  warm:false, grow:420,  yield:0, col:['#2f5a3a','#8fd0a0','#e8fff0'], style:'tall', auto:true}
};
export const STRAIN_ORDER = ['heltta','ruusu','hamara','kalvo','hoitaja'];
export const ORIGIN_TXT = { heltta:'ALUSSA', ruusu:'ALUSSA', hamara:'LÖYTYY ULKOA' };
// risteytysreseptit (järjestys ei merkitse)
export const RECIPES = [
  {a:'heltta', b:'ruusu',  out:'kalvo'},
  {a:'heltta', b:'hamara', out:'hoitaja'}
];
export const MATCH_MULT = [0.5, 0.8, 1.3];
export const FIRST_GROW = 60;         // ensimmäinen kasvu noin minuutti (×1)
export const MUTATION_P = 0.10, CONTAM_P = 0.05;
export const CELLAR = {dry:0.5, wetGrow:1.2};

// markkina
export const CUR = 'HOPEA';
export const SELL_BASE = { raw:2, suodatin:45, villi:25, itio:4 };
export const PRICE_DROP = 0.96;       // jokainen myyty kappale −4 %
export const SAT_HALF = 7200;         // palautuminen: puoliintumisaika 2 h (×1)
export const SPIKE_EVERY = 86400, SPIKE_FIRST = 7200, SPIKE_LEN = 10800, SPIKE_MULT = 2;
export const SHOP = {
  purkki:   {name:'LASIPURKKI',    kind:'vessel', price:s=>10+5*s.bought.purkki,    sub:'KUIVA / VIILEÄ'},
  terraario:{name:'TERRAARIO',     kind:'vessel', price:s=>30+10*s.bought.terraario, sub:'KOSTEA / VIILEÄ'},
  agar:     {name:'AGAR-MALJA',    kind:'item',   price:()=>3,   sub:'RISTEYTYKSEEN', need:s=>s.flags.lab},
  hautomo:  {name:'HAUTOMO',       kind:'device', price:()=>60,  sub:'KYPSYTTÄÄ MALJAN 8 H', need:s=>s.flags.lab},
  kehikko:  {name:'KEHIKKO',       kind:'device', price:()=>120, sub:'KALVOHELTTA > SUODATIN', need:s=>!!s.known.kalvo},
  kellari:  {name:'KELLARI',       kind:'room',   price:()=>300, sub:'4×3, KOSTEA JA VIILEÄ', need:s=>!!s.known.kalvo&&!s.rooms.kellari.owned}
};
export const LAB_UNLOCK_SOLD = 10;
export const ORDER = {need:5, reward:300, txt:'5 ITIÖSUODATINTA TORIN VÄELLE, JOTTA HE VOIVAT LÄHTEÄ ULOS.'};
// poistettujen tuotteiden hyvitys vanhoissa tallennuksissa (kuivausteline ja kuivatut sienet poistettiin TP0:ssa)
export const LEGACY = {dry:5, kuivain:40};
export const ROOMS = { huone:{name:'HUONE', w:4, h:4}, kellari:{name:'KELLARI', w:4, h:3} };

// symbiontin lyhyet vihjeet (ei tarinaa: muistot poistettiin TP0:ssa)
export const HINT = {
  firstHarvest:'ENSIMMÄINEN SATO! MYY SE MARKKINALLA.',
  lab:'HAUTOMO JA AGAR-MALJAT OVAT NYT MARKKINALLA. RISTEYTÄ KAKSI KANTAA.',
  firstCross:'UUSI KANTA! KATSO KANTAKIRJAA.',
  mutation:'MUTAATIO! KANTA SAI PARANNUKSEN.',
  order:'TILAUS: 5 ITIÖSUODATINTA. KASVATA NE KEHIKOSSA KALVOHELTASTA.',
  pocket:'SAIT YHDEN SINIHELTAN ITIÖN. ÄLÄ MYY KAIKKIA ITIÖITÄ.'
};
