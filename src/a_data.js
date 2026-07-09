/* ============================================================
   BANNER COMMAND — The Banners of Coronal
   Part A: storage, data, sprites, game state
============================================================ */

/* ---------- safe storage: artifact | Hostinger | memory ---------- */
const Store={
  mem:{},
  async get(k){
    try{ if(window.storage){ const r=await window.storage.get(k); return r?r.value:null; } }catch(e){}
    try{ return localStorage.getItem(k); }catch(e){}
    return this.mem[k]??null;
  },
  async set(k,v){
    try{ if(window.storage){ await window.storage.set(k,v); return; } }catch(e){}
    try{ localStorage.setItem(k,v); return; }catch(e){}
    this.mem[k]=v;
  }
};

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- JOBS ----------
   tier 1 base → tier 2 branch (LV8) → ★ mastery (LV16)
   growth per level: [hp, atk, def, mag]
*/
const JOBS={
 Commander:{t:1,atk:9,def:8,mag:6,hp:46,spd:5,trait:'leader',rng:false,
  front:{n:'Rally Strike',d:'A solid blow that steadies the front line.'},
  back:{n:'Command',d:'Bark orders; nearby allies fight harder.'},
  spec:null, g:[6,2,1.6,1.4],
  pal:{B:'#a83040',b:'#7c2430',H:'#e8c860',h:'#b09640',L:'#402838',W:'#e8e8f4',w:'#9aa4c0'},weapon:'sword'},
 Knight:{t:1,atk:8,def:11,mag:2,hp:50,spd:4,trait:null,rng:false,
  front:{n:'Shield Bash',d:'Heavy strike; may stagger.'},back:{n:'Cover',d:'Guards the front rank.'},
  spec:null, g:[7,1.5,2,0.4], tree:['Paladin','Dark Knight'],
  pal:{B:'#7888a8',b:'#57678a',H:'#a8b8d8',h:'#6878a0',L:'#485878',W:'#e8e8f4',w:'#9aa4c0'},weapon:'sword'},
 Paladin:{t:2,atk:10,def:14,mag:6,hp:62,spd:4,trait:null,rng:false,base:'Knight',
  front:{n:'Holy Edge',d:'Radiant strike.'},back:{n:'Aegis',d:'Shelters the wounded.'},
  spec:{n:'LAY HANDS',type:'heal',pow:1.6,d:'Heal the most wounded ally.'}, g:[8,1.8,2.2,1],
  pal:{B:'#a8b8d8',b:'#8494bc',H:'#e8d890',h:'#c0ac60',L:'#5a6a90',W:'#ffe89a',w:'#c8a850'},weapon:'sword'},
 'Dark Knight':{t:2,atk:13,def:11,mag:7,hp:58,spd:4,trait:null,rng:false,base:'Knight',
  front:{n:'Doom Cleave',d:'A dreadful blow.'},back:{n:'Dread Aura',d:'Foes falter before you.'},
  spec:{n:'SOUL REND',type:'drain',pow:1.4,d:'Steal a foe\'s life.'}, g:[7,2.4,1.8,1.1],
  pal:{B:'#3a3448',b:'#28242f',H:'#584868',h:'#3c3248',L:'#241f30',W:'#c8a8f0',w:'#8868b0'},weapon:'sword'},
 Soldier:{t:1,atk:9,def:7,mag:2,hp:42,spd:5,trait:null,rng:false,
  front:{n:'Sword Arm',d:'Reliable steel.'},back:{n:'Spear Wall',d:'A careful poke from safety.'},
  spec:null, g:[6,2,1.4,0.4], tree:['Captain','Berserker'],
  pal:{B:'#b04838',b:'#84332a',H:'#804028',h:'#5c2e1e',L:'#583028',W:'#d0d0d8',w:'#8890a0'},weapon:'spear'},
 Captain:{t:2,atk:11,def:10,mag:4,hp:54,spd:5,trait:null,rng:false,base:'Soldier',
  front:{n:'Officer\'s Cut',d:'Precise, practiced steel.'},back:{n:'Hold the Line',d:'Steadies the ranks.'},
  spec:{n:'WAR DRUM',type:'buff',pow:0.25,d:'Rouse the banner: ATK up.'}, g:[7,2.2,1.8,0.8],
  pal:{B:'#c05848',b:'#904038',H:'#a05030',h:'#744026',L:'#684038',W:'#ffe89a',w:'#c8a850'},weapon:'spear'},
 Berserker:{t:2,atk:15,def:6,mag:1,hp:60,spd:6,trait:null,rng:false,base:'Soldier',
  front:{n:'Reckless Swing',d:'All fury, no guard.'},back:{n:'Hurl Axe',d:'Even the back row rages.'},
  spec:{n:'BLOOD RAGE',type:'rage',pow:0.5,d:'ATK way up, DEF down.'}, g:[9,3,1,0.2],
  pal:{B:'#d84838',b:'#a03028',H:'#603020',h:'#442418',L:'#502820',W:'#e8e8f4',w:'#9aa4c0'},weapon:'spear'},
 Archer:{t:1,atk:8,def:5,mag:3,hp:34,spd:5,trait:null,rng:true,
  front:{n:'Point Blank',d:'Risky close shot; high crit.'},back:{n:'Aimed Shot',d:'Full damage from safety.'},
  spec:null, g:[5,2,1,0.7], tree:['Sniper','Ranger'],
  pal:{B:'#488048',b:'#356035',H:'#684828',h:'#4c341e',L:'#304828',W:'#b89858',w:'#8a7040'},weapon:'bow'},
 Sniper:{t:2,atk:12,def:6,mag:4,hp:42,spd:6,trait:null,rng:true,base:'Archer',
  front:{n:'Skewer',d:'A bolt at arm\'s length.'},back:{n:'Deadeye',d:'Finds the gap in any armor.'},
  spec:{n:'PIERCING BOLT',type:'pierce',pow:1.5,d:'Ignores half of DEF.'}, g:[6,2.6,1.2,0.8],
  pal:{B:'#587858',b:'#405c40',H:'#785838',h:'#584028',L:'#385038',W:'#ffe89a',w:'#c8a850'},weapon:'bow'},
 Ranger:{t:2,atk:10,def:8,mag:5,hp:48,spd:6,trait:'scout',rng:true,base:'Archer',
  front:{n:'Hatchet',d:'Woodsman\'s answer.'},back:{n:'Twin Arrows',d:'Two shafts, one breath.'},
  spec:{n:'MARK PREY',type:'mark',pow:0.3,d:'Marked foe takes more damage.'}, g:[7,2.2,1.5,1],
  pal:{B:'#6a8a4a',b:'#4e6836',H:'#8a6838',h:'#684e28',L:'#4a5c34',W:'#b89858',w:'#8a7040'},weapon:'bow'},
 Scout:{t:1,atk:6,def:4,mag:3,hp:32,spd:7,trait:'scout',rng:true,
  front:{n:'Skirmish',d:'Quick jab, then fall back.'},back:{n:'Keen Eye',d:'The army\'s eyes; a careful shot.'},
  spec:null, g:[5,1.5,1,0.7], tree:['Pathfinder','Outrider'],
  pal:{B:'#8a8a58',b:'#68683f',H:'#5c4a2e',h:'#42351f',L:'#4c4c30',W:'#b89858',w:'#8a7040'},weapon:'bow'},
 Pathfinder:{t:2,atk:8,def:6,mag:5,hp:40,spd:8,trait:'scout',rng:true,base:'Scout',
  front:{n:'Trail Knife',d:'Fast and gone.'},back:{n:'Longwatch',d:'Nothing escapes notice.'},
  spec:{n:'SMOKE VEIL',type:'veil',pow:0.35,d:'Party evades: enemy ATK down.'}, g:[6,1.8,1.3,1],
  pal:{B:'#a0a068',b:'#7c7c4e',H:'#6c5836',h:'#504024',L:'#5c5c3a',W:'#ffe89a',w:'#c8a850'},weapon:'bow'},
 Outrider:{t:2,atk:10,def:5,mag:3,hp:38,spd:9,trait:'scout',rng:true,base:'Scout',
  front:{n:'Ride-by Cut',d:'Strike at full gallop.'},back:{n:'Harass',d:'Sting and scatter.'},
  spec:{n:'HIT & FADE',type:'fade',pow:1.2,d:'Strike, then dodge the reply.'}, g:[6,2.2,1,0.6],
  pal:{B:'#98885a',b:'#746842',H:'#4c3e26',h:'#362c1a',L:'#585030',W:'#e8e8f4',w:'#9aa4c0'},weapon:'spear'},
 Ninja:{t:1,atk:10,def:4,mag:4,hp:32,spd:8,trait:'ninja',rng:false,
  front:{n:'Dual Slash',d:'Two fast strikes.'},back:{n:'Shuriken',d:'Thrown steel; full damage.'},
  spec:null, g:[5,2.2,0.9,0.8], tree:['Assassin','Shadow'],
  pal:{B:'#383848',b:'#26262f',H:'#282838',h:'#1a1a26',L:'#202030',W:'#c8c8d8',w:'#8890a0'},weapon:'katana'},
 Assassin:{t:2,atk:14,def:5,mag:5,hp:38,spd:9,trait:'ninja',rng:false,base:'Ninja',
  front:{n:'Throat Line',d:'One cut decides.'},back:{n:'Poison Fang',d:'Steel that keeps working.'},
  spec:{n:'EXECUTE',type:'exec',pow:2.2,d:'Massive damage to a weakened foe.'}, g:[5,2.8,1,0.9],
  pal:{B:'#48283a',b:'#341c2a',H:'#301c28',h:'#20121a',L:'#281824',W:'#e86868',w:'#a83838'},weapon:'katana'},
 Shadow:{t:2,atk:11,def:6,mag:8,hp:36,spd:9,trait:'ninja',rng:false,base:'Ninja',
  front:{n:'Umbral Cut',d:'A blade of dusk.'},back:{n:'Dark Star',d:'Thrown night.'},
  spec:{n:'VANISH',type:'vanish',pow:0.4,d:'Untargetable until next act.'}, g:[5,2.2,1.1,1.6],
  pal:{B:'#2a2a44',b:'#1c1c30',H:'#404068',h:'#2c2c48',L:'#181828',W:'#a8b8ff',w:'#6878c0'},weapon:'katana'},
 Mage:{t:1,atk:4,def:3,mag:12,hp:28,spd:4,trait:null,rng:true,
  front:{n:'Staff Whack',d:'Desperate. Please move back.'},back:{n:'Fire',d:'Searing bolt at one foe.'},
  spec:{n:'FIRE SWEEP',type:'aoe',pow:0.8,d:'Flame across the enemy front.'}, g:[4,0.8,0.7,2.6], tree:['Wizard','Sage'],
  pal:{B:'#7048a8',b:'#523480',H:'#503080',h:'#3a2260',L:'#382060',W:'#f0c858',w:'#a88838'},weapon:'staff'},
 Wizard:{t:2,atk:5,def:4,mag:17,hp:34,spd:4,trait:null,rng:true,base:'Mage',
  front:{n:'Arc Staff',d:'Crackling defense.'},back:{n:'Thunder',d:'A spear of lightning.'},
  spec:{n:'METEOR',type:'aoeAll',pow:0.7,d:'Stone and fire on all foes.'}, g:[4,1,0.9,3.2],
  pal:{B:'#8858c8',b:'#6842a0',H:'#6038a0',h:'#462878',L:'#442878',W:'#ffe89a',w:'#c8a850'},weapon:'staff'},
 Sage:{t:2,atk:5,def:6,mag:14,hp:40,spd:4,trait:'healer',rng:true,base:'Mage',
  front:{n:'Wisdom Rod',d:'Gentle correction.'},back:{n:'Holy Spark',d:'Light that burns the cruel.'},
  spec:{n:'SANCTUARY',type:'healAll',pow:0.9,d:'Mend the whole banner.'}, g:[5,1,1.3,2.8],
  pal:{B:'#b8a8e0',b:'#9484c0',H:'#e8d890',h:'#c0ac60',L:'#7868a8',W:'#ffe89a',w:'#c8a850'},weapon:'staff'},
 Priest:{t:1,atk:4,def:5,mag:9,hp:32,spd:4,trait:'healer',rng:true,
  front:{n:'Mace Swing',d:'Feeble, but faith endures.'},back:{n:'Smite',d:'A small, earnest light.'},
  spec:{n:'CURE',type:'heal',pow:1.4,d:'Heal the most wounded ally.'}, g:[5,0.9,1.2,2], tree:['Bishop','War Priest'],
  pal:{B:'#e8e8e0',b:'#b8b8b0',H:'#d8c878',h:'#b09a58',L:'#a8a098',W:'#f0c858',w:'#a88838'},weapon:'mace'},
 Bishop:{t:2,atk:5,def:7,mag:13,hp:40,spd:4,trait:'healer',rng:true,base:'Priest',
  front:{n:'Censure',d:'A stern word made steel.'},back:{n:'Radiance',d:'Burning grace.'},
  spec:{n:'BLESSING',type:'healAll',pow:0.8,d:'Mend the whole banner.'}, g:[5,1,1.6,2.6],
  pal:{B:'#f0f0e8',b:'#c8c8c0',H:'#f0dc90',h:'#c8b468',L:'#b8b0a8',W:'#ffe89a',w:'#c8a850'},weapon:'mace'},
 'War Priest':{t:2,atk:10,def:9,mag:10,hp:48,spd:5,trait:'healer',rng:false,base:'Priest',
  front:{n:'Zeal Hammer',d:'Faith with follow-through.'},back:{n:'Litany',d:'Wounds close at the words.'},
  spec:{n:'CURE',type:'heal',pow:1.7,d:'Heal the most wounded ally.'}, g:[7,2,1.8,1.8],
  pal:{B:'#d0c8a8',b:'#a8a080',H:'#b09040',h:'#846c2c',L:'#888060',W:'#e8e8f4',w:'#9aa4c0'},weapon:'mace'},
 Monk:{t:1,atk:9,def:6,mag:4,hp:40,spd:6,trait:null,rng:false,
  front:{n:'Combo Fists',d:'Chains hits as HP drops.'},back:{n:'Chakra',d:'Breath; self-mend.'},
  spec:{n:'CHAKRA',type:'selfheal',pow:1.2,d:'Restore own body.'}, g:[6,2.1,1.4,0.8], tree:['Master','Mystic'],
  pal:{B:'#d88838',b:'#a86428',H:'#382820',h:'#241a14',L:'#a86028',W:'#e8d8b8',w:'#b0a088'},weapon:'none'},
 Master:{t:2,atk:13,def:9,mag:5,hp:52,spd:7,trait:null,rng:false,base:'Monk',
  front:{n:'Hundred Fists',d:'The wall of knuckles.'},back:{n:'Focus Palm',d:'Force across distance.'},
  spec:{n:'PRESSURE POINT',type:'stun',pow:1.1,d:'Strike; delay the foe\'s next act.'}, g:[7,2.6,1.8,0.8],
  pal:{B:'#e89848',b:'#b87434',H:'#282018',h:'#181410',L:'#b87034',W:'#ffe89a',w:'#c8a850'},weapon:'none'},
 Mystic:{t:2,atk:9,def:8,mag:11,hp:46,spd:6,trait:'healer',rng:false,base:'Monk',
  front:{n:'Spirit Fist',d:'Body and soul as one.'},back:{n:'Inner Light',d:'Calm that spreads.'},
  spec:{n:'CHI FLOW',type:'healAll',pow:0.7,d:'Breath for the whole banner.'}, g:[6,1.8,1.6,2],
  pal:{B:'#e8b060',b:'#b88848',H:'#484038',h:'#302a24',L:'#b88848',W:'#a8b8ff',w:'#6878c0'},weapon:'none'},
 Centaur:{t:1,atk:7,def:8,mag:2,hp:46,spd:5,trait:'mount',rng:false,
  front:{n:'Lance Charge',d:'Momentum made pointy.'},back:{n:'Hoof Guard',d:'Kicks anyone who flanks.'},
  spec:null, g:[7,1.6,1.7,0.4], tree:['Charger','Warden'],
  pal:{B:'#986848',b:'#704c34',H:'#684828',h:'#4c341e',L:'#584030',W:'#d0d0d8',w:'#8890a0'},weapon:'lance'},
 Charger:{t:2,atk:12,def:9,mag:2,hp:56,spd:6,trait:'mount',rng:false,base:'Centaur',
  front:{n:'Full Tilt',d:'The earth complains.'},back:{n:'Rear Kick',d:'Never stand behind a horse.'},
  spec:{n:'TRAMPLE',type:'aoe',pow:0.7,d:'Ride down the enemy front.'}, g:[8,2.4,1.8,0.3],
  pal:{B:'#b07850',b:'#88583a',H:'#785030',h:'#583a22',L:'#684838',W:'#ffe89a',w:'#c8a850'},weapon:'lance'},
 Warden:{t:2,atk:9,def:13,mag:4,hp:60,spd:5,trait:'mount',rng:false,base:'Centaur',
  front:{n:'Bulwark Lance',d:'A wall that walks.'},back:{n:'Shield Sweep',d:'Covers the column.'},
  spec:{n:'STAND FAST',type:'guard',pow:0.4,d:'Party DEF up; hold the ground.'}, g:[8,1.8,2.4,0.7],
  pal:{B:'#88a0a8',b:'#647c84',H:'#587078',h:'#405458',L:'#4c6068',W:'#e8e8f4',w:'#9aa4c0'},weapon:'lance'},
};
const TRAIT_DESC={healer:'+3 party regen each map turn',ninja:'+2 spd in a party of 1-2',scout:'vision 4; +2 spd in a party of 1-2',mount:'raises party spd floor to 4',leader:'the player. abilities unlock as the story advances.'};

/* ---------- COMMANDER story abilities ---------- */
const CMD_ABILITIES=[
 {k:'rally',n:'RALLY',d:'The banner\'s ATK rises.',type:'buff',pow:0.3,ch:1},
 {k:'warcry',n:'WAR CRY',d:'Enemy ATB thrown back.',type:'atbhit',pow:45,ch:3},
 {k:'mend',n:'MEND BANNER',d:'Heal the whole party.',type:'healAll',pow:0.8,ch:5},
 {k:'flame',n:'FLAME OF COMMAND',d:'Fire scours every foe.',type:'aoeAll',pow:0.6,ch:7},
 {k:'second',n:'SECOND WIND',d:'A fallen ally rises.',type:'revive',pow:0.4,ch:9},
];

/* ---------- sprites ---------- */
const SPRITE_MAP=[
".....HHHH.....","....HHHHHH....","....hSSSSh....","....S.SS.S....",".....SSSS.....",
"....BBBBBB....","...BBBBBBBB...","..SBBbBBbBBS..","...BBBBBBBB...","...bBBBBBBb...",
"....LLLLLL....","....LL..LL....","....LL..LL....","....SS..SS....",];
const WEAPONS={
 sword:{col:12,from:3,to:9,tip:'#e8e8f4',guard:8}, spear:{col:12,from:1,to:11,tip:'#d0d0d8'},
 bow:{col:12,from:3,to:10,tip:'#b89858',bow:true}, staff:{col:12,from:2,to:11,tip:'#f0c858',orb:true},
 mace:{col:12,from:5,to:9,tip:'#f0c858',orb:true}, katana:{col:12,from:4,to:9,tip:'#c8c8d8'},
 lance:{col:12,from:0,to:11,tip:'#d0d0d8'}, none:null,
};
const SPRITES={};
function makeSprite(job){
  const J=JOBS[job]; const pal={S:'#e8b888','.':null,...J.pal};
  const c=document.createElement('canvas'); c.width=14; c.height=14;
  const g=c.getContext('2d');
  SPRITE_MAP.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(pal[ch]){g.fillStyle=pal[ch]; g.fillRect(x,y,1,1);} }));
  g.fillStyle='#181828'; g.fillRect(5,3,1,1); g.fillRect(8,3,1,1);
  const w=WEAPONS[J.weapon];
  if(w){ g.fillStyle=pal.w||'#999';
    for(let y=w.from;y<=w.to;y++) g.fillRect(w.col,y,1,1);
    g.fillStyle=w.tip; g.fillRect(w.col,w.from,1,1);
    if(w.guard!==undefined) g.fillRect(w.col-1,w.guard,3,1);
    if(w.orb) g.fillRect(w.col-1,w.from,1,1);
    if(w.bow){ g.fillRect(w.col-1,w.from+1,1,1); g.fillRect(w.col-1,w.to-1,1,1); }
  }
  return c.toDataURL();
}
Object.keys(JOBS).forEach(j=>SPRITES[j]=makeSprite(j));
const spriteImg=(job,cls='')=>`<img src="${SPRITES[job]}" class="${cls}" alt="">`;

/* ---------- units & growth ---------- */
function baseStats(u){
  const J=JOBS[u.job];
  const lv=u.lv-1, star=u.star?1.25:1;
  u.maxhp=Math.round((J.hp+J.g[0]*lv)*star);
  u.atk=Math.round((J.atk+J.g[1]*lv)*star);
  u.def=Math.round((J.def+J.g[2]*lv)*star);
  u.mag=Math.round((J.mag+J.g[3]*lv)*star);
  u.spd=J.spd;
  u.trait=J.trait; u.rng=J.rng;
  u.front=J.front; u.back=J.back; u.spec=J.spec;
}
let UID=1;
function mkUnit(name,job,lv){
  const u={id:UID++,name,job,lv,xp:0,star:false,row:'front'};
  baseStats(u); u.hp=u.maxhp;
  return u;
}
function xpNeed(lv){ return lv*40; }
function grantXP(u,amt){
  if(u.hp<=0) amt=Math.round(amt*0.5);
  u.xp+=amt; let ups=0;
  while(u.xp>=xpNeed(u.lv) && u.lv<40){ u.xp-=xpNeed(u.lv); u.lv++; ups++; }
  if(ups){ const oldMax=u.maxhp; baseStats(u); u.hp=clamp(u.hp+(u.maxhp-oldMax),1,u.maxhp); }
  return ups;
}

/* ---------- game state ---------- */
const G={
  roster:[], node:0, chapter:1, cleared:{}, abilities:[], mode:'title',
  pNames:['VANGUARD','RESERVE','OUTRIDERS','REARGUARD'],
  openEnded:false, battlesWon:0,
};
function newGame(){
  UID=1;
  G.roster=[
    mkUnit('COMMANDER','Commander',3),
    mkUnit('GARRICK','Knight',2),
    mkUnit('THEA','Priest',2),
    mkUnit('BRAND','Soldier',2),
  ];
  G.node=0; G.chapter=1; G.cleared={}; G.abilities=['rally'];
  G.openEnded=false; G.battlesWon=0;
  G.pNames=['VANGUARD','RESERVE','OUTRIDERS','REARGUARD'];
}
async function saveGame(){
  try{ await Store.set('boc-save', JSON.stringify({
    roster:G.roster, node:G.node, chapter:G.chapter, cleared:G.cleared,
    abilities:G.abilities, openEnded:G.openEnded, battlesWon:G.battlesWon, pNames:G.pNames, uid:UID
  })); toast('GAME SAVED'); }catch(e){}
}
async function loadGame(){
  try{
    const raw=await Store.get('boc-save'); if(!raw) return false;
    const d=JSON.parse(raw);
    Object.assign(G,{roster:d.roster,node:d.node,chapter:d.chapter,cleared:d.cleared,
      abilities:d.abilities,openEnded:d.openEnded,battlesWon:d.battlesWon,pNames:d.pNames||G.pNames});
    UID=d.uid||100;
    G.roster.forEach(u=>{const hp=u.hp; baseStats(u); u.hp=clamp(hp,0,u.maxhp);});
    return true;
  }catch(e){ return false; }
}

/* ---------- WORLD ---------- */
const RECRUITS={
 wren:()=>mkUnit('WREN','Archer',3), sable:()=>mkUnit('SABLE','Ninja',4),
 orval:()=>mkUnit('ORVAL','Mage',4), kiros:()=>mkUnit('KIROS','Monk',5),
 mirelle:()=>mkUnit('MIRELLE','Scout',5), eppa:()=>mkUnit('EPPA','Centaur',6),
 haldis:()=>mkUnit('HALDIS','Priest',6),
};
const NODES=[
 {i:0, x:12,y:82, n:'ASHFORD CAMP', type:'story', ch:1, links:[1],
  text:'The Covenant burned the muster fields at dawn. You are the last officer standing, and the banner is yours now. <b>Garrick</b>, <b>Thea</b> and <b>Brand</b> await orders.<span class="sp"> — Drive the raiders from the camp.</span>',
  map:'fields', foes:[['Soldier',2],['Soldier',2],['Archer',2]], packs:2, garrison:[['Soldier',2]],
  reward:{ability:'rally', text:'You learn to <b>RALLY</b> the banner. (Commander special)'} },
 {i:1, x:26,y:70, n:'OLD ROAD', type:'free', links:[0,2]},
 {i:2, x:38,y:78, n:'MILLBROOK', type:'story', ch:2, links:[1,3,4],
  text:'Millbrook\'s granaries feed the whole valley — and the Covenant means to take them. A young fletcher fights alone on the palisade.<span class="sp"> — Hold the village.</span>',
  map:'village', foes:[['Soldier',3],['Archer',3],['Soldier',3],['Priest',3]], packs:2, garrison:[['Soldier',3]],
  reward:{recruit:'wren', text:'<b>WREN</b> the Archer joins your banner!'} },
 {i:3, x:30,y:56, n:'FERRY CROSSING', type:'free', links:[2,5]},
 {i:4, x:52,y:70, n:'THORNWOOD', type:'story', ch:3, links:[2,5,6],
  text:'Smoke in the thornwood: a Covenant hunting party has cornered two fugitives — a knife in the dark and a scholar of fire.<span class="sp"> — Break the hunt.</span>',
  map:'fields', foes:[['Ninja',4],['Ninja',4],['Soldier',4],['Archer',4]], packs:3, garrison:[['Soldier',4]],
  reward:{recruit:'sable', recruit2:'orval', ability:'warcry', text:'<b>SABLE</b> the Ninja and <b>ORVAL</b> the Mage join! You learn <b>WAR CRY</b>.'} },
 {i:5, x:44,y:48, n:'STONE BRIDGE', type:'story', ch:4, links:[3,4,7],
  text:'One bridge over the Coronal river still stands, and a monk of the old temple holds it alone against a column.<span class="sp"> — Take the bridge. Keep the monk.</span>',
  map:'fields', foes:[['Knight',5],['Soldier',5],['Priest',5],['Archer',5]], packs:3, garrison:[['Soldier',5],['Archer',5]],
  reward:{recruit:'kiros', text:'<b>KIROS</b> the Monk joins your banner!'} },
 {i:6, x:68,y:62, n:'PINEHOLLOW', type:'free', links:[4,8]},
 {i:7, x:38,y:34, n:'HIGHWATCH RUIN', type:'story', ch:5, links:[5,9],
  text:'The old watchtower sees the whole valley. A ranger has lived in its bones for years, and the Covenant wants her spyglass silenced.<span class="sp"> — Take the ruin. Take the vantage.</span>',
  map:'pass', foes:[['Archer',6],['Archer',6],['Ninja',6],['Mage',6]], packs:3, garrison:[['Archer',6]],
  reward:{recruit:'mirelle', ability:'mend', text:'<b>MIRELLE</b> the Scout joins! You learn <b>MEND BANNER</b>.'} },
 {i:8, x:78,y:48, n:'SALTMARSH', type:'free', links:[6,10]},
 {i:9, x:52,y:26, n:'FENMOOR', type:'story', ch:6, links:[7,10],
  text:'The moor folk ride horse-kin older than the kingdom. Their herald offers two riders — if you can clear the Covenant camp fouling their springs.<span class="sp"> — Honor the bargain.</span>',
  map:'village', foes:[['Soldier',7],['Knight',7],['Archer',7],['Priest',7],['Mage',7]], packs:3, garrison:[['Soldier',7],['Soldier',7]],
  reward:{recruit:'eppa', recruit2:'haldis', text:'<b>EPPA</b> the Centaur and <b>HALDIS</b> the Priest join! Your banner is eleven strong.'} },
 {i:10, x:70,y:30, n:'RIDGEGATE PASS', type:'story', ch:7, links:[8,9,11],
  text:'The only road to the capital climbs through Ridgegate, and the Covenant has walled the pass. Their captain flies a black pennant.<span class="sp"> — Force the pass.</span>',
  map:'pass', foes:[['Knight',9],['Berserker',9],['Sniper',9],['Bishop',9]], packs:3, garrison:[['Knight',9],['Archer',9]],
  reward:{ability:'flame', text:'You learn <b>FLAME OF COMMAND</b>.'} },
 {i:11, x:84,y:18, n:'BLACKFEN KEEP', type:'story', ch:8, links:[10,12],
  text:'Blackfen guards the capital\'s flank: moat, wall, and a garrison that has never fallen. Yours will be the first banner over it.<span class="sp"> — Storm the keep.</span>',
  map:'keep', foes:[['Dark Knight',11],['Captain',11],['Wizard',11],['War Priest',11]], packs:3, garrison:[['Knight',11],['Soldier',11],['Archer',11]],
  reward:{text:'The road to <b>CORONAL CITY</b> lies open.'} },
 {i:12, x:92,y:8, n:'CORONAL CITY', type:'story', ch:9, links:[11],
  text:'The capital. The Covenant\'s Warlord holds the throne hall behind every wall the old kings ever raised. Every banner you gathered marches at your back.<span class="sp"> — Take back the crown.</span>',
  map:'keep', foes:[['Dark Knight',13],['Berserker',13],['Assassin',13],['Wizard',13],['Bishop',13]], packs:4, garrison:[['Paladin',13],['Captain',13],['Sniper',13]],
  reward:{ability:'second', text:'<b>THE CROWN IS FREE.</b> You learn <b>SECOND WIND</b>. The land opens — the Covenant\'s remnants still roam. Hunt them.'} },
];
const FREE_FOE_POOL=['Soldier','Archer','Knight','Ninja','Mage','Priest','Monk','Scout'];
const ELITE_POOL=['Captain','Berserker','Sniper','Ranger','Assassin','Shadow','Wizard','Sage','Bishop','War Priest','Master','Charger','Paladin','Dark Knight'];
