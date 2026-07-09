/* ============================================================
   Part C: muster + tactical field
============================================================ */
const PCOLORS=['#5888f0','#50b068','#e0a840','#a868d8'];
function partySpeed(units){
  if(!units.length) return 0;
  let s=Math.max(2, 6-units.length);
  if(units.length<=2 && units.some(u=>u.trait==='ninja'||u.trait==='scout')) s+=2;
  if(units.some(u=>u.trait==='mount')) s=Math.max(s+1,4);
  return s;
}
const partyPower=us=>us.reduce((a,u)=>a+u.atk,0);
const partyDefT=us=>us.reduce((a,u)=>a+u.def,0);
const healers=us=>us.filter(u=>u.trait==='healer').length;

/* ---------- MUSTER ---------- */
let slots, selUnit=null, sortMode='name', curBattle=null;
const partyIds=p=>[...slots[p].front,...slots[p].back].filter(v=>v!==null);
const partyUnitsOf=p=>partyIds(p).map(id=>G.roster.find(u=>u.id===id));
function locate(id){
  for(let p=0;p<4;p++) for(const row of ['front','back']){
    const i=slots[p][row].indexOf(id); if(i>=0) return {p,row,i};
  } return null;
}
function startBattle(cfg){
  curBattle=cfg;
  slots=[0,1,2,3].map(()=>({front:[null,null,null],back:[null,null,null]}));
  selUnit=null;
  G.roster.forEach(u=>{ if(u.hp<=0) u.hp=1; });
  $('muster').innerHTML=`
  <div id="battleName" class="ffwin">
    <div class="bn-chapter">⚔ ${cfg.sub} ⚔</div>
    <div class="bn-title">${cfg.name}</div>
    <div class="bn-sub">HOSTILE SOULS: ${cfg.foes.length+cfg.garrison.length} · MUSTER YOUR ${G.roster.length}</div>
  </div>
  <div id="stage">
    <div class="stars"></div>
    <div class="range far"></div><div class="range near"></div>
    <div class="ground"></div>
    <div id="parties">
      <div class="pbox" data-p="0"></div><div class="pbox" data-p="1"></div>
      <div class="pbox" data-p="2"></div><div class="pbox" data-p="3"></div>
    </div>
  </div>
  <div id="musterBtns" class="ffwin">
    <span class="sortbtns"><span class="btnlabel">SORT</span>
      <button class="ff on" data-sort="name">NAME</button>
      <button class="ff" data-sort="level">LV</button>
      <button class="ff" data-sort="type">TYPE</button></span>
    <span class="btngap"></span>
    <button class="ff" id="autoBtn">AUTO-FILL</button>
    <button class="ff" id="backWorldBtn">◀ WORLD</button>
  </div>
  <button id="deployBtn" class="ff gold" disabled>⚔ START BATTLE ⚔</button>
  <div class="m-main">
    <div id="detail" class="ffwin"><div class="d-empty">— NO UNIT SELECTED —</div></div>
    <div id="roster" class="ffwin"><div class="shead">ROSTER</div><div id="rosterList"></div></div>
  </div>
  <div id="confirmModal" class="modal"><div class="inner ffwin">
    <div class="shead">REVIEW YOUR BANNERS</div>
    <div id="cfParties"></div>
    <div class="modalbtns"><button id="cfCancel" class="ff">◀ BACK</button>
      <button id="cfGo" class="ff gold">MARCH! ▶</button></div>
  </div></div>
  <div id="pickModal" class="modal"><div class="inner ffwin" style="max-width:420px">
    <div class="shead" id="pickTitle"></div><div id="pickList"></div>
    <div class="modalbtns"><button id="pickClose" class="ff">◀ CANCEL</button></div>
  </div></div>`;
  show('muster');
  document.querySelectorAll('.sortbtns button').forEach(b=>b.onclick=()=>{
    sortMode=b.dataset.sort;
    document.querySelectorAll('.sortbtns button').forEach(x=>x.classList.toggle('on',x===b));
    drawMuster();
  });
  $('autoBtn').onclick=autoFill;
  $('backWorldBtn').onclick=()=>enterWorld();
  $('deployBtn').onclick=confirmMuster;
  $('pickClose').onclick=()=>$('pickModal').classList.remove('show');
  autoFill();
}
function sortedRoster(){
  const r=G.roster.map(u=>u.id);
  const U=id=>G.roster.find(u=>u.id===id);
  if(sortMode==='level') r.sort((a,b)=>U(b).lv-U(a).lv);
  else if(sortMode==='type') r.sort((a,b)=>U(a).job.localeCompare(U(b).job)||U(b).lv-U(a).lv);
  else r.sort((a,b)=>U(a).name.localeCompare(U(b).name));
  const c=r.indexOf(G.roster[0].id); if(c>0){r.splice(c,1); r.unshift(G.roster[0].id);}
  return r;
}
function autoFill(){
  slots=[0,1,2,3].map(()=>({front:[null,null,null],back:[null,null,null]}));
  const rest=[...G.roster];
  const take=f=>{const i=rest.findIndex(f); return i>=0?rest.splice(i,1)[0]:null;};
  const put=(p,row,u)=>{ if(!u)return; const i=slots[p][row].indexOf(null); if(i>=0)slots[p][row][i]=u.id; };
  /* vanguard: commander + heavies front, healer+mage back */
  put(0,'front',take(u=>u.job==='Commander'));
  put(0,'front',take(u=>['Knight','Paladin','Dark Knight','Warden','Charger','Centaur'].includes(u.job)));
  put(0,'front',take(u=>['Monk','Master','Mystic','Soldier','Captain','Berserker','War Priest'].includes(u.job)));
  put(0,'back',take(u=>u.trait==='healer'));
  put(0,'back',take(u=>['Mage','Wizard','Sage'].includes(u.job)));
  /* reserve squad */
  put(1,'front',take(u=>u.trait==='mount'));
  put(1,'front',take(u=>['Soldier','Captain','Berserker','Monk','Master'].includes(u.job)));
  put(1,'back',take(u=>u.trait==='healer'));
  put(1,'back',take(u=>['Archer','Sniper','Ranger'].includes(u.job)));
  /* outriders: fast pair */
  put(2,'front',take(u=>u.trait==='ninja'));
  put(2,'back',take(u=>u.trait==='scout'));
  /* leftovers */
  rest.forEach(u=>{
    for(let p=0;p<4;p++){ for(const row of ['front','back']){
      const i=slots[p][row].indexOf(null);
      if(i>=0 && partyIds(p).length<6){ slots[p][row][i]=u.id; return; }
    }}
  });
  selUnit=null; drawMuster();
}
function drawMuster(){
  const L=$('rosterList'); L.innerHTML='';
  sortedRoster().forEach(id=>{
    const u=G.roster.find(x=>x.id===id), loc=locate(id);
    const d=document.createElement('div');
    d.className='unit'+(selUnit===id?' sel':'')+(loc?' assigned':'');
    d.innerHTML=`<span class="ubadge ${loc?'':'none'}" style="background:${loc?PCOLORS[loc.p]:'transparent'}"></span>
      ${spriteImg(u.job)}<span class="uname">${u.name}${u.star?'★':''}</span>
      <span class="ulv">LV${u.lv}</span><span class="ujob">${u.job}</span>`;
    d.onclick=()=>{selUnit=selUnit===id?null:id; drawMuster();};
    L.appendChild(d);
  });
  drawDetail();
  document.querySelectorAll('.pbox').forEach(box=>{
    const p=+box.dataset.p, units=partyUnitsOf(p);
    const rowHTML=(row,cls,label)=>`<div class="rowlabel">${label}</div>
      <div class="rowgrid">${slots[p][row].map((uid,i)=>{
        if(uid===null) return `<div class="slot open ${cls}" data-row="${row}" data-i="${i}"></div>`;
        const u=G.roster.find(x=>x.id===uid);
        return `<div class="slot filled ${cls}" data-row="${row}" data-i="${i}">${spriteImg(u.job)}<span class="sname">${u.name}</span></div>`;
      }).join('')}</div>`;
    let warn='&nbsp;';
    if(units.length){
      if(!healers(units)) warn='⚠ NO HEALER';
      if(!slots[p].front.some(v=>v!==null)) warn='⚠ EMPTY FRONT ROW';
    }
    box.innerHTML=`<div class="phead"><span class="pennant"></span>
      <input class="pname" value="${G.pNames[p]}" maxlength="12" spellcheck="false">
      <span class="pcount">${units.length}/6</span></div>
      ${rowHTML('back','back-slot','BACK ROW')}
      ${rowHTML('front','front-slot','FRONT ROW')}
      <div class="pstats"><span>SPD<b>${partySpeed(units)}</b></span><span>ATK<b>${partyPower(units)}</b></span>
      <span>DEF<b>${partyDefT(units)}</b></span><span>HEAL<b>${healers(units)}</b></span></div>
      <div class="pwarn">${warn}</div>`;
    box.querySelector('.pname').oninput=e=>{G.pNames[p]=e.target.value.toUpperCase()||('PARTY '+(p+1));};
    box.querySelectorAll('.slot').forEach(s=>{ s.onclick=()=>openPicker(p,s.dataset.row,+s.dataset.i); });
  });
  const n=[0,1,2,3].reduce((a,p)=>a+partyIds(p).length,0);
  const btn=$('deployBtn');
  btn.disabled=n!==G.roster.length;
  btn.textContent=n===G.roster.length?'⚔ START BATTLE ⚔':`⚔ START BATTLE (${n}/${G.roster.length} MUSTERED)`;
}
function drawDetail(){
  const D=$('detail');
  const u=G.roster.find(x=>x.id===selUnit);
  if(!u){ D.innerHTML='<div class="d-empty">— NO UNIT SELECTED —<br><br>TAP A SLOT TO PLACE SOLDIERS</div>'; return; }
  D.innerHTML=`
    <div class="d-top">
      <div class="d-portrait">${spriteImg(u.job)}</div>
      <div class="d-id">
        <div class="d-name">${u.name}${u.star?' ★':''}</div>
        <div class="d-job">${u.job}</div>
        <div class="d-lv">LEVEL ${u.lv}</div>
        <div class="statrow"><span class="sl">HP</span><div class="sbar"><i class="hp" style="width:${Math.round(u.hp/u.maxhp*100)}%"></i></div><span class="sv">${u.hp}</span></div>
        <div class="statrow"><span class="sl">ATK</span><div class="sbar"><i class="atk" style="width:${clamp(u.atk*2.4,4,100)}%"></i></div><span class="sv">${u.atk}</span></div>
        <div class="statrow"><span class="sl">DEF</span><div class="sbar"><i class="def" style="width:${clamp(u.def*2.4,4,100)}%"></i></div><span class="sv">${u.def}</span></div>
        <div class="statrow"><span class="sl">MAG</span><div class="sbar"><i class="mag" style="width:${clamp(u.mag*2.4,4,100)}%"></i></div><span class="sv">${u.mag}</span></div>
        ${u.trait?`<span class="traitchip">◆ ${u.trait.toUpperCase()}</span>`:''}
      </div>
    </div>
    <div class="movebox front"><span class="mrow">FRONT</span> · <span class="mvname">${u.front.n}</span><br>${u.front.d}</div>
    <div class="movebox back"><span class="mrow">BACK</span> · <span class="mvname">${u.back.n}</span><br>${u.back.d}</div>
    ${u.spec?`<div class="movebox spec"><span class="mrow">SPECIAL</span> · <span class="mvname">${u.spec.n}</span><br>${u.spec.d}</div>`:''}`;
}
function openPicker(p,row,i){
  const cur=slots[p][row][i];
  $('pickTitle').textContent=`${G.pNames[p]} · ${row.toUpperCase()} ROW · SLOT ${i+1}`;
  const list=$('pickList'); list.innerHTML='';
  if(cur!==null){
    const e=document.createElement('div'); e.className='unit';
    e.innerHTML=`<span class="ubadge none"></span><span style="width:24px;text-align:center;color:var(--dim);font-size:12px">—</span>
      <span class="uname" style="color:var(--dim)">EMPTY</span><span class="ujob">leave unused</span>`;
    e.onclick=()=>{slots[p][row][i]=null; $('pickModal').classList.remove('show'); drawMuster();};
    list.appendChild(e);
  }
  const avail=sortedRoster().filter(id=>{const l=locate(id); return !l||id===cur;});
  avail.forEach(id=>{
    const u=G.roster.find(x=>x.id===id);
    const d=document.createElement('div'); d.className='unit'+(id===cur?' sel':'');
    d.innerHTML=`<span class="ubadge none"></span>${spriteImg(u.job)}
      <span class="uname">${u.name}</span><span class="ulv">LV${u.lv}</span><span class="ujob">${u.job}</span>`;
    d.onclick=()=>{ slots[p][row][i]=id; selUnit=id; $('pickModal').classList.remove('show'); drawMuster(); };
    list.appendChild(d);
  });
  $('pickModal').classList.add('show');
}
function confirmMuster(){
  const cf=$('cfParties'); cf.innerHTML='';
  [0,1,2,3].forEach(p=>{
    const units=partyUnitsOf(p); if(!units.length) return;
    cf.innerHTML+=`<div class="cfp"><div class="cfname"><span class="pennant" style="background:${PCOLORS[p]}"></span>${G.pNames[p]}</div>
      <div class="cfrow">${slots[p].back.filter(v=>v!==null).map(id=>spriteImg(G.roster.find(u=>u.id===id).job)).join('')||'&nbsp;'}</div>
      <div class="cfrow frontr">${slots[p].front.filter(v=>v!==null).map(id=>spriteImg(G.roster.find(u=>u.id===id).job)).join('')||'&nbsp;'}</div>
      <div class="cfstats">SPD ${partySpeed(units)} · ATK ${partyPower(units)} · HEAL ${healers(units)}</div></div>`;
  });
  $('confirmModal').classList.add('show');
  $('cfCancel').onclick=()=>$('confirmModal').classList.remove('show');
  $('cfGo').onclick=()=>{ $('confirmModal').classList.remove('show'); initField(curBattle); };
}

/* ---------- FIELD MAPS ---------- */
const MAPS={
 fields:{rows:[
  ".............","..c.....s....","........s....","...c.........",".wwwwbwww....",
  ".............",".s...c.......","..C..........",".............","....c.....s.."],
  epos:[[10,1],[11,3],[9,2]], camp:[2,7], fort:[11,1], useFort:false},
 village:{rows:[
  ".............","..c..c...####","........#.F#.","...c....#..#.","....c...##b#.",
  ".....c.......",".c...........","..C....c.....","........c....","............."],
  epos:[[7,1],[12,4],[6,3]], camp:[2,7], fort:[10,2], useFort:true},
 pass:{rows:[
  "##...........","#....s...####","......s..#F#.",".#.......#.#.","##.......#b#.",
  "#............","##...s.......",".#C..........","##...........","#.....s......"],
  epos:[[7,1],[11,4],[6,5]], camp:[2,7], fort:[10,2], useFort:true},
 keep:{rows:[
  ".............","....#########","....#...s..F#","....#..###..#","....#..#.#..#",
  "....##b##.#b#",".wwwwbwwwwww.","..c..........","..C....c.....","............."],
  epos:[[6,2],[9,2],[6,4]], camp:[2,8], fort:[11,2], useFort:true},
};
/* field state */
let F=null;
function initField(cfg){
  const M=MAPS[cfg.map];
  const W=13,H=10,TS=44;
  const grid=M.rows.map(r=>r.split(''));
  grid[M.camp[1]][M.camp[0]]='C';
  grid[M.fort[1]][M.fort[0]]=M.useFort?'F':'C';
  F={cfg,W,H,TS,grid,
    HQ_PL:{side:'pl',x:M.camp[0],y:M.camp[1],type:'CAMP',garrison:[],towers:1,defMult:0.65},
    HQ_EN:{side:'en',x:M.fort[0],y:M.fort[1],type:M.useFort?'KEEP':'CAMP',garrison:[],towers:0,defMult:0.5},
    towers:[],parties:[],turn:1,phase:'deploy',animating:false,
    explored:new Set(),visible:new Set(),
    deployQueue:[],deployIdx:0,placing:null,moveMode:false,selP:null,reach:null,
  };
  $('field').innerHTML=`
   <div id="topbar" class="ffwin">
     <span>TURN <b id="turnNum" style="color:var(--gold)">1</b></span>
     <span id="phase" style="color:var(--gold)">DEPLOYMENT</span>
     <span id="bcount" style="color:var(--dim)"></span>
     <button id="endTurn" class="ff">END TURN</button>
   </div>
   <div id="mapwrap"><div id="map"></div></div>
   <div id="log" class="ffwin"></div>
   <div id="bpanel" class="ffwin"></div>
   <div id="tabbar" class="ffwin">
     <button class="ff on" data-tab="map">MAP</button>
     <button class="ff" data-tab="parties">PARTIES</button>
     <button class="ff" data-tab="cmdr">COMMANDER</button>
   </div>`;
  show('field');
  buildTiles();
  const TILEC={'.':'t-plain','c':'t-crate','#':'t-wall','w':'t-water','b':'t-bridge','F':'t-fort','C':'t-camp','s':'t-scrub'};
  F.TILECLASS=TILEC; F.COST={'.':1,'b':1,'F':1,'C':1,'s':2};
  /* enemy parties from cfg.foes split into packs */
  const groups=Array.from({length:cfg.packs},()=>[]);
  cfg.foes.forEach((f,i)=>groups[i%cfg.packs].push(f));
  const ENAMES=['IRON FIST','ASHEN BOW','NIGHT FANGS','BLACK PENNANT'];
  groups.forEach((g,gi)=>{
    if(!g.length) return;
    const units=g.map(([j,lv],k)=>{const u=mkUnit('COV.'+String.fromCharCode(65+gi*4+k),j,lv);
      u.row=(JOBS[j].rng||['Priest','Bishop','Sage','Mage','Wizard'].includes(j))?'back':'front'; return u;});
    const [ex,ey]=M.epos[gi%M.epos.length];
    F.parties.push({id:ENAMES[gi%4],side:'en',units,x:ex,y:ey,face:'W',done:false});
  });
  F.HQ_EN.garrison=cfg.garrison.map(([j,lv],k)=>{const u=mkUnit('GAR.'+(k+1),j,lv); u.row='front'; return u;});
  F.parties.forEach(makeToken);
  /* player deploy queue */
  [0,1,2,3].forEach(p=>{
    const ids=partyIds(p); if(!ids.length) return;
    slots[p].front.forEach(uid=>{if(uid!==null)G.roster.find(u=>u.id===uid).row='front';});
    slots[p].back.forEach(uid=>{if(uid!==null)G.roster.find(u=>u.id===uid).row='back';});
    F.deployQueue.push({id:G.pNames[p],color:PCOLORS[p],side:'pl',units:ids.map(id=>G.roster.find(u=>u.id===id)),face:'E',done:false});
  });
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) F.explored.add(x+','+y);
  computeVision(); drawGarrisonBadges();
  $('endTurn').onclick=()=>{ if(F.phase!=='player'||F.animating)return;
    F.parties.filter(p=>p.side==='pl').forEach(p=>p.done=true); nextParty(); };
  document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>{
    if(F.phase==='deploy')return;
    setTab(b.dataset.tab);
    if(b.dataset.tab==='map'){ if(F.selP&&!F.selP.done)showOrders(F.selP); }
    else if(b.dataset.tab==='parties') showPartiesTab();
    else showCommanderTab();
  });
  mapClickWire();
  flog('Deployment: raise fortifications, then place your banners.','imp');
  showDeployCard();
}
const tileAt=(x,y)=>F.tileEls[y*F.W+x];
const passable=(x,y)=>x>=0&&y>=0&&x<F.W&&y<F.H&&F.COST[F.grid[y][x]]!==undefined;
const cheb=(x1,y1,x2,y2)=>Math.max(Math.abs(x1-x2),Math.abs(y1-y2));
const DIRS={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]};
const ARROW={N:'▲',S:'▼',E:'▶',W:'◀'};
function buildTiles(){
  const TILEC={'.':'t-plain','c':'t-crate','#':'t-wall','w':'t-water','b':'t-bridge','F':'t-fort','C':'t-camp','s':'t-scrub'};
  const mapEl=$('map');
  mapEl.style.gridTemplateColumns=`repeat(${F.W},${F.TS}px)`;
  F.tileEls=[];
  for(let y=0;y<F.H;y++)for(let x=0;x<F.W;x++){
    const t=document.createElement('div');
    t.className='tile '+TILEC[F.grid[y][x]]+(((x+y)%2)&&'.c'.includes(F.grid[y][x])?' alt':'');
    t.dataset.x=x; t.dataset.y=y;
    t.innerHTML='<div class="fog"></div>';
    mapEl.appendChild(t); F.tileEls.push(t);
  }
}
function visionOf(p){
  const alive=p.units.filter(u=>u.hp>0);
  let r=2;
  if(partySpeed(alive)>=5)r=3;
  if(alive.some(u=>u.trait==='scout'))r=4;
  return r;
}
function addVision(set,x,y,r){
  for(let yy=Math.max(0,y-r);yy<=Math.min(F.H-1,y+r);yy++)
    for(let xx=Math.max(0,x-r);xx<=Math.min(F.W-1,x+r);xx++)
      if(cheb(x,y,xx,yy)<=r)set.add(xx+','+yy);
}
function computeVision(){
  F.visible=new Set();
  F.parties.filter(p=>p.side==='pl').forEach(p=>addVision(F.visible,p.x,p.y,visionOf(p)));
  addVision(F.visible,F.HQ_PL.x,F.HQ_PL.y,2);
  F.towers.forEach(t=>addVision(F.visible,t.x,t.y,4));
  F.visible.forEach(k=>F.explored.add(k));
  renderFog();
}
function renderFog(){
  for(let y=0;y<F.H;y++)for(let x=0;x<F.W;x++){
    const k=x+','+y,f=tileAt(x,y).querySelector('.fog');
    f.className='fog '+(F.visible.has(k)?'lit':F.explored.has(k)?'dim':'dark');
  }
  F.parties.forEach(p=>{ if(p.side==='en')p.el.style.display=F.visible.has(p.x+','+p.y)?'':'none'; });
  updateTopbar();
}
function makeToken(p){
  const el=document.createElement('div');
  el.className=`token ${p.side}`;
  el.innerHTML=`<div class="body" style="${p.color?`border-color:${p.color}`:''}"><img src="${SPRITES[p.units[0].job]}" style="width:24px;height:28px;image-rendering:pixelated"></div>
    <span class="face ${p.face}">${ARROW[p.face]}</span><span class="stance"></span>
    <div class="hpbar"><i></i></div>`;
  el.onclick=e=>{e.stopPropagation(); clickToken(p);};
  $('mapwrap').appendChild(el);
  p.el=el; placeTok(p);
}
function placeTok(p){
  p.el.style.left=(p.x*F.TS+8+5)+'px'; p.el.style.top=(p.y*F.TS+8+5)+'px';
  const f=p.el.querySelector('.face'); f.className='face '+p.face; f.textContent=ARROW[p.face];
  p.el.querySelector('.stance').textContent=p.stance==='defend'?'🛡':'';
  const hp=p.units.reduce((a,u)=>a+Math.max(0,u.hp),0),mx=p.units.reduce((a,u)=>a+u.maxhp,0);
  const bar=p.el.querySelector('.hpbar i'); const pct=Math.max(0,hp/mx*100);
  bar.style.width=pct+'%'; bar.className=pct<30?'low':pct<60?'mid':'';
  p.el.classList.toggle('moved',!!p.done&&p.side==='pl');
}
function makeTowerToken(t){
  const el=document.createElement('div'); el.className='tower'; el.textContent='♖';
  el.style.left=(t.x*F.TS+8+10)+'px'; el.style.top=(t.y*F.TS+8+4)+'px';
  $('mapwrap').appendChild(el);
}
function drawGarrisonBadges(){
  [F.HQ_PL,F.HQ_EN].forEach(hq=>{
    const t=tileAt(hq.x,hq.y);
    let b=t.querySelector('.gbadge');
    if(!b){b=document.createElement('div'); b.className='gbadge'; t.appendChild(b);}
    const n=hq.garrison.filter(u=>u.hp>0).length;
    b.textContent=n>0?'🛡'+n:'';
    b.style.color=hq.side==='pl'?'#9ec2ff':'#ffb0a8';
  });
}
function partyAtF(x,y){ return F.parties.find(p=>p.x===x&&p.y===y&&p.units.some(u=>u.hp>0)); }
function bfsF(p){
  const spd=partySpeed(p.units.filter(u=>u.hp>0));
  const dist={},prev={}; dist[p.x+','+p.y]=0;
  const q=[[p.x,p.y]];
  while(q.length){
    const [cx,cy]=q.shift(); const d=dist[cx+','+cy];
    for(const k in DIRS){
      const nx=cx+DIRS[k][0],ny=cy+DIRS[k][1];
      if(!passable(nx,ny))continue;
      if(partyAtF(nx,ny))continue;
      if(nx===F.HQ_EN.x&&ny===F.HQ_EN.y&&F.HQ_EN.garrison.some(u=>u.hp>0))continue;
      const nd=d+F.COST[F.grid[ny][nx]];
      if(nd>spd)continue;
      const key=nx+','+ny;
      if(dist[key]===undefined||nd<dist[key]){dist[key]=nd; prev[key]=cx+','+cy; q.push([nx,ny]);}
    }
  }
  return {dist,prev,spd};
}
function pathToF(reach,x,y){
  const path=[]; let key=x+','+y;
  while(key&&reach.prev[key]){
    const [px,py]=key.split(',').map(Number);
    path.unshift([px,py]); key=reach.prev[key];
  }
  return path;
}
async function walk(p,path){
  F.animating=true;
  for(const [x,y] of path){
    p.face=x>p.x?'E':x<p.x?'W':y>p.y?'S':'N';
    p.x=x; p.y=y; placeTok(p);
    if(p.side==='pl')computeVision(); else renderFog();
    await new Promise(r=>setTimeout(r,140));
  }
  F.animating=false;
}
function clearHi(){ F.tileEls.forEach(t=>t.classList.remove('movable','atkable')); }
function adjacentEnemies(p){
  const out=[];
  for(const k in DIRS){
    const x=p.x+DIRS[k][0],y=p.y+DIRS[k][1];
    const occ=partyAtF(x,y);
    if(occ&&occ.side!==p.side&&(p.side==='en'||F.visible.has(x+','+y)))out.push(occ);
    if(p.side==='pl'&&x===F.HQ_EN.x&&y===F.HQ_EN.y)out.push(F.HQ_EN);
    if(p.side==='en'&&x===F.HQ_PL.x&&y===F.HQ_PL.y)out.push(F.HQ_PL);
  }
  return out;
}
/* deploy phase */
function spawnTilesF(){
  const out=[];
  for(let y=0;y<F.H;y++)for(let x=0;x<F.W;x++)
    if(cheb(x,y,F.HQ_PL.x,F.HQ_PL.y)<=2&&passable(x,y)&&!(x===F.HQ_PL.x&&y===F.HQ_PL.y)&&!partyAtF(x,y)&&!F.towers.some(t=>t.x===x&&t.y===y))
      out.push([x,y]);
  return out;
}
function towerTilesF(){
  const out=[];
  for(let y=0;y<F.H;y++)for(let x=0;x<F.W;x++)
    if(cheb(x,y,F.HQ_PL.x,F.HQ_PL.y)<=4&&passable(x,y)&&!(x===F.HQ_PL.x&&y===F.HQ_PL.y)&&!partyAtF(x,y)&&!F.towers.some(t=>t.x===x&&t.y===y))
      out.push([x,y]);
  return out;
}
function showDeployCard(){
  setTab('map');
  const bpanel=$('bpanel');
  if(F.HQ_PL.towers>0){
    bpanel.innerHTML=`<div class="shead">FORTIFICATIONS FIRST</div>
      <div class="dp-stats">Your CAMP can raise <b style="color:var(--gold)">1 WATCHTOWER</b> — vision 4, within 4 tiles.</div>
      <div class="modalbtns"><button class="ff gold" id="dpTower">PLACE TOWER ♖</button>
      <button class="ff" id="dpSkip">SKIP</button></div><div class="dp-hint"></div>`;
    $('dpTower').onclick=()=>{ F.placing='tower'; clearHi();
      towerTilesF().forEach(([x,y])=>tileAt(x,y).classList.add('movable'));
      bpanel.querySelector('.dp-hint').textContent='TAP A TILE WITHIN 4 OF YOUR START POINT.'; };
    $('dpSkip').onclick=()=>{F.HQ_PL.towers=0; showDeployCard();};
  } else if(F.deployIdx<F.deployQueue.length){
    const p=F.deployQueue[F.deployIdx];
    bpanel.innerHTML=`<div class="shead">DEPLOY YOUR BANNERS · ${F.deployIdx+1}/${F.deployQueue.length}</div>
      <div class="dp-card"><span class="pennant" style="background:${p.color}"></span>
      <b style="color:${p.color}">${p.id}</b>
      <span class="dp-sprites">${p.units.map(u=>spriteImg(u.job)).join('')}</span></div>
      <div class="dp-stats">SPD ${partySpeed(p.units)} · ATK ${partyPower(p.units)} · HEAL ${healers(p.units)} · VISION ${visionOf(p)}</div>
      <div class="modalbtns"><button class="ff gold" id="dpDeploy">DEPLOY ▶</button>
      <button class="ff" id="dpReserve">RESERVE 🛡</button></div>
      <div class="dp-hint">RESERVE: garrison the CAMP — last defense with a defense bonus.</div>`;
    $('dpDeploy').onclick=()=>{ F.placing='party'; clearHi();
      spawnTilesF().forEach(([x,y])=>tileAt(x,y).classList.add('movable'));
      bpanel.querySelector('.dp-hint').textContent='TAP A HIGHLIGHTED TILE — YOUR SPAWN GROUND.'; };
    $('dpReserve').onclick=()=>{ F.HQ_PL.garrison.push(...F.deployQueue[F.deployIdx].units);
      flog(F.deployQueue[F.deployIdx].id+' garrisons the camp.');
      drawGarrisonBadges(); F.deployIdx++; showDeployCard(); };
  } else startFieldBattle();
}
function startFieldBattle(){
  F.placing=null; clearHi(); F.phase='player';
  computeVision();
  flog('Battle begins.','imp'); updateTopbar();
  nextParty();
}
/* guided player turn */
function nextParty(){
  const cand=F.parties.find(p=>p.side==='pl'&&!p.done);
  if(cand){ selectParty(cand); return; }
  F.selP=null; F.parties.forEach(q=>q.el.classList.remove('sel'));
  clearHi(); hideOrders();
  $('bpanel').innerHTML='<div class="dp-hint" style="padding:14px 0;text-align:center">ALL BANNERS HAVE THEIR ORDERS.<br>THE ENEMY MOVES...</div>';
  setTimeout(()=>{if(F.phase==='player')enemyTurn();},650);
}
function selectParty(p){
  F.selP=p;
  F.parties.forEach(q=>q.el.classList.toggle('sel',q===F.selP));
  clearHi(); F.reach=null; F.moveMode=false;
  showOrders(p);
}
function clickToken(p){
  if(F.phase!=='player'||F.animating||F.placing)return;
  if(p.side==='en'){
    if(F.selP&&!F.selP.done&&!F.selP.acted&&adjacentEnemies(F.selP).includes(p)) fieldAttack(F.selP,p);
    else showPartyPanel(p);
    return;
  }
  if(p.done){showPartyPanel(p); return;}
  selectParty(p);
}
function ordersEl(){
  let o=$('orders');
  if(!o){o=document.createElement('div'); o.id='orders'; $('mapwrap').appendChild(o);}
  return o;
}
function hideOrders(){ const o=$('orders'); if(o)o.style.display='none'; }
function positionOrders(o,p){
  const OW=132;
  let left=(p.x+1)*F.TS+16;
  if((p.x+1)*F.TS+16+OW>F.W*F.TS+16)left=p.x*F.TS+8-OW-4;
  let top=Math.max(4,Math.min(p.y*F.TS,F.H*F.TS-160));
  o.style.left=left+'px'; o.style.top=top+'px';
}
function showOrders(p){
  setTab('map'); showPartyPanel(p);
  const targets=(!p.acted)?adjacentEnemies(p):[];
  const canStill=!p.moved&&!p.acted;
  const o=ordersEl(); o.style.display='block';
  o.innerHTML=`
    <div class="o-title"><span class="pennant" style="background:${p.color}"></span>${p.id}</div>
    ${!p.moved&&!p.acted?'<button class="ff obtn" id="odMove">👣 MOVE</button>':''}
    ${targets.map((t,i)=>`<button class="ff obtn gold" data-atk="${i}">⚔ ${t.type?('SIEGE '+t.type):t.id}</button>`).join('')}
    ${canStill?'<button class="ff obtn" id="odDefend">🛡 DEFEND</button><button class="ff obtn" id="odRest">✚ REST</button>':''}
    <div class="o-face">FACE · ENDS TURN</div>
    <div class="o-arrows">${Object.keys(DIRS).map(d=>`<button class="ff" data-d="${d}">${ARROW[d]}</button>`).join('')}</div>
    <button class="ff obtn gold" id="odKeep">KEEP ${ARROW[p.face]} ✓</button>`;
  positionOrders(o,p);
  const mv=o.querySelector('#odMove');
  if(mv)mv.onclick=()=>{ F.moveMode=true; clearHi();
    F.reach=bfsF(p);
    for(const key in F.reach.dist){ const [x,y]=key.split(',').map(Number);
      if(x===p.x&&y===p.y)continue; tileAt(x,y).classList.add('movable'); }
    o.style.display='none'; };
  o.querySelectorAll('[data-atk]').forEach(b=>b.onclick=()=>{
    const t=targets[+b.dataset.atk];
    if(t.type)fieldSiege(p,t); else fieldAttack(p,t); });
  const df=o.querySelector('#odDefend');
  if(df)df.onclick=()=>{p.stance='defend'; p.moved=true; p.acted=true; placeTok(p);
    flog(p.id+' digs in.'); showOrders(p);};
  const rs=o.querySelector('#odRest');
  if(rs)rs.onclick=()=>{const h=healers(p.units.filter(u=>u.hp>0));
    p.units.forEach(u=>{if(u.hp>0)u.hp=clamp(u.hp+6+h*4,1,u.maxhp);});
    p.stance='rest'; p.moved=true; p.acted=true; placeTok(p);
    flog(p.id+' rests and recovers.','good'); showOrders(p);};
  o.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>finishParty(p,b.dataset.d));
  o.querySelector('#odKeep').onclick=()=>finishParty(p,p.face);
}
function finishParty(p,dir){ p.face=dir; p.done=true; placeTok(p); clearHi(); hideOrders(); nextParty(); }
function mapClickWire(){
  $('map').addEventListener('click',e=>{
    const t=e.target.closest('.tile'); if(!t||F.animating)return;
    const x=+t.dataset.x,y=+t.dataset.y;
    if(F.placing&&t.classList.contains('movable')){
      if(F.placing==='party'){
        const p=F.deployQueue[F.deployIdx];
        p.x=x; p.y=y; F.parties.push(p); makeToken(p);
        flog(p.id+' takes the field.');
        F.deployIdx++; F.placing=null; clearHi(); computeVision(); showDeployCard();
      } else {
        F.towers.push({x,y}); makeTowerToken(F.towers[F.towers.length-1]);
        F.HQ_PL.towers--; F.placing=null; clearHi(); computeVision(); showDeployCard();
        flog('Watchtower raised.','imp');
      }
      return;
    }
    if(!F.selP||F.phase!=='player'||F.selP.done)return;
    if(F.moveMode&&t.classList.contains('movable')) doMove(F.selP,x,y);
  });
}
async function doMove(p,x,y){
  const path=pathToF(F.reach,x,y);
  p.moved=true; F.moveMode=false; clearHi();
  await walk(p,path);
  placeTok(p); showOrders(p);
}
/* panels */
function setTab(t){ document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); }
function showPartyPanel(p){
  const alive=p.units.filter(u=>u.hp>0);
  const hp=alive.reduce((a,u)=>a+u.hp,0),mx=p.units.reduce((a,u)=>a+u.maxhp,0);
  const isPl=p.side==='pl';
  $('bpanel').innerHTML=`
    <div class="dp-card">${isPl?`<span class="pennant" style="background:${p.color}"></span>`:'☠'}
      <b style="color:${isPl?(p.color||'var(--gold)'):'var(--danger)'}">${p.id}</b>
      <span class="dp-sprites">${alive.map(u=>spriteImg(u.job)).join('')}</span>
      <span style="margin-left:auto;font-size:7px">HP ${hp}/${mx}</span></div>
    <div class="dp-stats">SPD ${partySpeed(alive)} · ATK ${partyPower(alive)} · DEF ${partyDefT(alive)} · HEAL ${healers(alive)} · VISION ${visionOf(p)}${p.stance==='defend'?' · 🛡':''}</div>
    <div class="abilrow">${alive.map(u=>`<span class="abil"><b>${u.name}</b> ${u.row==='front'?'▲'+u.front.n:'▽'+u.back.n}</span>`).join('')}</div>`;
}
function showPartiesTab(){
  $('bpanel').innerHTML='<div class="shead">YOUR BANNERS</div>'+
    F.parties.filter(p=>p.side==='pl').map(p=>{
      const alive=p.units.filter(u=>u.hp>0);
      const hp=alive.reduce((a,u)=>a+u.hp,0),mx=p.units.reduce((a,u)=>a+u.maxhp,0);
      return `<div class="dp-card ptab" data-id="${p.id}">
        <span class="pennant" style="background:${p.color}"></span><b style="color:${p.color}">${p.id}</b>
        <span class="dp-sprites">${alive.map(u=>spriteImg(u.job)).join('')}</span>
        <span style="margin-left:auto;font-size:6px">HP ${hp}/${mx}${p.done?' · DONE':''}</span></div>`;
    }).join('')+
    `<div class="dp-card"><span style="font-size:12px">🛡</span><b style="color:var(--dim)">GARRISON</b>
      <span class="dp-sprites">${F.HQ_PL.garrison.filter(u=>u.hp>0).map(u=>spriteImg(u.job)).join('')||'<span style="color:var(--danger);font-size:6px">UNDEFENDED!</span>'}</span></div>`;
  document.querySelectorAll('.ptab').forEach(d=>d.onclick=()=>{
    const p=F.parties.find(q=>q.id===d.dataset.id);
    if(p){setTab('map'); clickToken(p);} });
}
function showCommanderTab(){
  const c=G.roster[0];
  $('bpanel').innerHTML=`<div class="shead">COMMANDER</div>
    <div class="dp-card">${spriteImg(c.job)}<b style="color:var(--gold)">${c.name}</b>
      <span style="font-size:6px;color:var(--dim)">LV ${c.lv}</span>
      <span style="margin-left:auto;font-size:6px">HP ${Math.max(0,c.hp)}/${c.maxhp}</span></div>
    <div class="abilrow">${CMD_ABILITIES.filter(a=>G.abilities.includes(a.k)).map(a=>`<span class="abil"><b>${a.n}</b> ${a.d}</span>`).join('')}</div>`;
}
function updateTopbar(){
  $('turnNum').textContent=F.turn;
  $('phase').textContent=F.phase==='deploy'?'DEPLOYMENT':F.phase==='player'?'YOUR MOVE':'ENEMY MOVE';
  const mine=F.parties.filter(p=>p.side==='pl').length;
  const seen=F.parties.filter(p=>p.side==='en'&&F.visible.has(p.x+','+p.y)).length;
  $('bcount').innerHTML=`BANNERS <b style="color:var(--gold)">${mine}</b> · FOES SIGHTED <b style="color:var(--danger)">${seen}</b>`;
}
function flog(msg,cls){ const l=$('log');
  l.innerHTML+=`<div class="${cls||''}">▸ ${msg}</div>`; l.scrollTop=l.scrollHeight; }
