/* ============================================================
   Part B: screens — title, world, story, party menu
============================================================ */
const root=$('root');
function screenHTML(){
 root.innerHTML=`
 <div id="title" class="screen">
   <h1>BANNER<br>COMMAND</h1>
   <div class="tsub">THE BANNERS OF CORONAL</div>
   <div class="tscene"><div class="m1"></div><div class="kp"><i style="left:10px;top:18px"></i><i style="left:26px;top:24px"></i><i style="left:42px;top:16px"></i></div></div>
   <div class="modalbtns">
     <button class="ff gold" id="btnNew">NEW CAMPAIGN</button>
     <button class="ff" id="btnLoad">CONTINUE</button>
   </div>
   <div class="dp-hint">FF6-INSPIRED PARTY STRATEGY · OGRE BATTLE COMBAT · FFT SCALE</div>
 </div>

 <div id="world" class="screen">
   <div id="wbar" class="ffwin">
     <span style="color:var(--gold)">CH.<b id="wch"></b></span>
     <span id="wname" style="color:var(--dim)"></span>
     <span class="gap"></span>
     <button class="ff" id="btnParty">PARTY</button>
     <button class="ff" id="btnSave">SAVE</button>
   </div>
   <div class="wmap" id="wmap"></div>
   <div id="wpanel" class="ffwin"></div>
 </div>

 <div id="muster" class="screen"></div>
 <div id="field" class="screen"></div>

 <div id="storyModal" class="modal"><div class="inner ffwin">
   <div class="shead" id="stTitle"></div>
   <div class="storybox" id="stText"></div>
   <div class="modalbtns"><button class="ff gold" id="stGo">TO BATTLE ⚔</button><button class="ff" id="stBack">NOT YET</button></div>
 </div></div>

 <div id="rewardModal" class="modal"><div class="inner ffwin">
   <div class="shead">★ VICTORY ★</div>
   <div class="storybox" id="rwText"></div>
   <div id="rwLevels" class="dp-stats" style="text-align:left"></div>
   <div class="modalbtns"><button class="ff gold" id="rwOk">ONWARD ▶</button></div>
 </div></div>

 <div id="partyModal" class="modal"><div class="inner ffwin">
   <div class="shead">THE BANNER · <span id="pmCount"></span> SOULS</div>
   <div class="m-main">
     <div id="pmDetail" class="ffwin"><div class="d-empty">SELECT A SOLDIER</div></div>
     <div id="pmList" style="max-height:300px;overflow-y:auto"></div>
   </div>
   <div class="modalbtns"><button class="ff" id="pmClose">◀ RETURN</button></div>
 </div></div>

 <div id="toast" style="display:none;position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:95;font-size:7px;letter-spacing:1px" class="ffwin"></div>`;
}
function show(scr){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  $(scr).classList.add('on');
  G.mode=scr;
}
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.style.display='block';
  clearTimeout(t._t); t._t=setTimeout(()=>t.style.display='none',1600);
}
function announce(html){
  const a=$('announce'); a.innerHTML=html; a.classList.add('show');
  clearTimeout(a._t); a._t=setTimeout(()=>a.classList.remove('show'),2400);
}

/* ---------- TITLE ---------- */
function initTitle(){
  show('title');
  $('btnNew').onclick=()=>{ newGame(); enterWorld(); };
  $('btnLoad').onclick=async()=>{
    if(await loadGame()){ enterWorld(); toast('CAMPAIGN LOADED'); }
    else toast('NO SAVE FOUND');
  };
}

/* ---------- WORLD MAP ---------- */
function nodeUnlocked(n){
  if(n.type==='free') return true;
  return n.ch<=G.chapter || G.cleared[n.i];
}
function enterWorld(){
  show('world');
  $('wch').textContent=G.openEnded?'∞':G.chapter;
  const cur=NODES[G.node];
  $('wname').textContent=cur.n;
  const wm=$('wmap'); wm.innerHTML='';
  /* river decoration */
  const rv=document.createElement('div'); rv.className='wriver';
  rv.style.cssText='left:46%;top:8%;height:84%;transform:rotate(14deg)'; wm.appendChild(rv);
  /* routes */
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','wroutes');
  NODES.forEach(n=>n.links.forEach(l=>{
    if(l<n.i) return;
    const m=NODES[l];
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',n.x+'%'); line.setAttribute('y1',n.y+'%');
    line.setAttribute('x2',m.x+'%'); line.setAttribute('y2',m.y+'%');
    line.setAttribute('stroke','#f4f0da'); line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-dasharray','3 5'); line.setAttribute('opacity','.8');
    svg.appendChild(line);
  }));
  wm.appendChild(svg);
  /* nodes */
  NODES.forEach(n=>{
    const el=document.createElement('div');
    const unlocked=nodeUnlocked(n);
    el.className='wnode'+(n.type==='story'?' story':'')+(G.cleared[n.i]?' done':'')+(unlocked?'':' locked')+(n.i===G.node?' cur':'');
    el.style.left=n.x+'%'; el.style.top=n.y+'%';
    el.innerHTML=n.type==='story'?(G.cleared[n.i]?'✓':'★'):'•';
    el.onclick=()=>tapNode(n,unlocked);
    wm.appendChild(el);
    const lb=document.createElement('div'); lb.className='wlabel';
    lb.style.left=n.x+'%'; lb.style.top=n.y+'%'; lb.textContent=n.n;
    wm.appendChild(lb);
  });
  /* commander token */
  const tk=document.createElement('div'); tk.id='cmdtoken';
  tk.innerHTML=spriteImg('Commander');
  tk.style.left=cur.x+'%'; tk.style.top=cur.y+'%';
  wm.appendChild(tk);
  /* panel */
  const injured=G.roster.filter(u=>u.hp<u.maxhp*0.5).length;
  $('wpanel').innerHTML=`<b style="color:var(--gold)">${cur.n}</b> — ${cur.type==='story'?(G.cleared[cur.i]?'The banners have passed this way.':'A chapter awaits.'):'Open country. Anything could find you here.'}<br>
   <span style="color:var(--dim)">BANNER: ${G.roster.length} SOULS · ${injured?injured+' WOUNDED · ':''}TAP A CONNECTED LOCATION TO MARCH.</span>`;
  $('btnParty').onclick=openPartyMenu;
  $('btnSave').onclick=saveGame;
}
function tapNode(n,unlocked){
  if(!unlocked){ toast('THE ROAD IS NOT YET OPEN'); return; }
  const cur=NODES[G.node];
  if(n.i===G.node){ arriveNode(n); return; }
  if(!cur.links.includes(n.i)){ toast('NO ROUTE FROM HERE'); return; }
  G.node=n.i;
  const tk=$('cmdtoken');
  tk.style.left=n.x+'%'; tk.style.top=n.y+'%';
  setTimeout(()=>{ enterWorld(); arriveNode(n); },520);
}
function arriveNode(n){
  if(n.type==='story'){
    if(!G.cleared[n.i] && n.ch===G.chapter){ openStory(n); }
    else if(G.cleared[n.i] && G.openEnded){ offerHunt(n); }
    return;
  }
  /* free node */
  if(Math.random()<0.6){
    const lv=G.openEnded? clamp(G.roster[0].lv-1,3,30) : clamp(G.chapter*2,2,26);
    const pool=(lv>=9?ELITE_POOL:FREE_FOE_POOL);
    const count=3+rnd(3);
    const foes=[]; for(let i=0;i<count;i++) foes.push([pick(pool),lv+rnd(2)]);
    startBattle({name:n.n.toUpperCase()+' — AMBUSH', sub:'RANDOM ENCOUNTER', map:pick(['fields','village','pass']),
      foes, packs:2, garrison:[[pick(FREE_FOE_POOL),lv]], node:null});
  } else {
    G.roster.forEach(u=>{ u.hp=clamp(u.hp+Math.round(u.maxhp*0.5),1,u.maxhp); });
    toast('A QUIET CAMP — THE BANNER RESTS (+50% HP)');
    enterWorld();
  }
}
function offerHunt(n){
  const lv=clamp(G.roster[0].lv,10,34);
  const foes=[]; const count=4+rnd(3);
  for(let i=0;i<count;i++) foes.push([pick(ELITE_POOL),lv+rnd(3)]);
  $('stTitle').textContent='COVENANT REMNANT — '+n.n;
  $('stText').innerHTML='Survivors of the Covenant have dug in here. The land will not be quiet until they are broken.<span class="sp"> — Hunt them for glory and experience.</span>';
  $('storyModal').classList.add('show');
  $('stGo').onclick=()=>{ $('storyModal').classList.remove('show');
    startBattle({name:'REMNANT HUNT — '+n.n, sub:'OPEN CAMPAIGN', map:n.map||'fields', foes, packs:3,
      garrison:[[pick(ELITE_POOL),lv],[pick(ELITE_POOL),lv]], node:null}); };
  $('stBack').onclick=()=>$('storyModal').classList.remove('show');
}
function openStory(n){
  $('stTitle').textContent='CHAPTER '+n.ch+' — '+n.n;
  $('stText').innerHTML=n.text;
  $('storyModal').classList.add('show');
  $('stGo').onclick=()=>{ $('storyModal').classList.remove('show');
    startBattle({name:n.n, sub:'CHAPTER '+n.ch, map:n.map, foes:n.foes.slice(), packs:n.packs,
      garrison:n.garrison.slice(), node:n}); };
  $('stBack').onclick=()=>$('storyModal').classList.remove('show');
}

/* ---------- PARTY MENU & PROMOTION ---------- */
let pmSel=null;
function openPartyMenu(){
  $('partyModal').classList.add('show');
  $('pmCount').textContent=G.roster.length;
  drawPM();
  $('pmClose').onclick=()=>$('partyModal').classList.remove('show');
}
function drawPM(){
  const L=$('pmList'); L.innerHTML='';
  G.roster.forEach(u=>{
    const d=document.createElement('div');
    d.className='unit'+(pmSel===u.id?' sel':'');
    const promo=(JOBS[u.job].t===1&&u.lv>=8&&u.job!=='Commander')||(JOBS[u.job].t===2&&u.lv>=16&&!u.star);
    d.innerHTML=`<span class="ubadge none"></span>${spriteImg(u.job)}
      <span class="uname">${u.name}${u.star?' ★':''}${promo?' <span style="color:var(--gold)">▲</span>':''}</span>
      <span class="ulv">LV${u.lv}</span><span class="ujob">${u.job}</span>`;
    d.onclick=()=>{pmSel=u.id; drawPM();};
    L.appendChild(d);
  });
  drawPMDetail();
}
function drawPMDetail(){
  const D=$('pmDetail');
  const u=G.roster.find(x=>x.id===pmSel);
  if(!u){ D.innerHTML='<div class="d-empty">SELECT A SOLDIER</div>'; return; }
  const J=JOBS[u.job];
  let promoHTML='';
  if(J.t===1 && u.lv>=8 && J.tree){
    promoHTML=`<div class="dp-hint">READY FOR PROMOTION — CHOOSE A PATH:</div><div class="jbranchbtns">`+
      J.tree.map(t=>{const T=JOBS[t];
        return `<button class="ff gold" data-promo="${t}">${t.toUpperCase()}<br><span style="font-size:5px;color:#3a2a08">${T.spec?T.spec.n:'—'} · ${T.front.n}</span></button>`;}).join('')+`</div>`;
  } else if(J.t===2 && u.lv>=16 && !u.star){
    promoHTML=`<div class="dp-hint">THE PATH'S END:</div><div class="jbranchbtns">
      <button class="ff gold" data-master="1">MASTER THE ${u.job.toUpperCase()} ★<br><span style="font-size:5px;color:#3a2a08">ALL STATS +25%</span></button></div>`;
  } else if(u.job==='Commander'){
    promoHTML=`<div class="dp-hint">ABILITIES OF COMMAND:</div><div class="abilrow">`+
      CMD_ABILITIES.map(a=>G.abilities.includes(a.k)
        ?`<span class="abil"><b>${a.n}</b> ${a.d}</span>`
        :`<span class="abil" style="opacity:.4"><b>???</b> chapter ${a.ch}</span>`).join('')+`</div>`;
  }
  D.innerHTML=`
    <div class="d-top">
      <div class="d-portrait">${spriteImg(u.job)}</div>
      <div class="d-id">
        <div class="d-name">${u.name}${u.star?' ★':''}</div>
        <div class="d-job">${u.job}</div>
        <div class="d-lv">LEVEL ${u.lv} · XP ${u.xp}/${xpNeed(u.lv)}</div>
        <div class="xpbar" style="margin:3px 0 6px"><i style="width:${Math.round(u.xp/xpNeed(u.lv)*100)}%"></i></div>
        <div class="statrow"><span class="sl">HP</span><div class="sbar"><i class="hp" style="width:${Math.round(u.hp/u.maxhp*100)}%"></i></div><span class="sv">${u.hp}/${u.maxhp}</span></div>
        <div class="statrow"><span class="sl">ATK</span><div class="sbar"><i class="atk" style="width:${clamp(u.atk*2.4,4,100)}%"></i></div><span class="sv">${u.atk}</span></div>
        <div class="statrow"><span class="sl">DEF</span><div class="sbar"><i class="def" style="width:${clamp(u.def*2.4,4,100)}%"></i></div><span class="sv">${u.def}</span></div>
        <div class="statrow"><span class="sl">MAG</span><div class="sbar"><i class="mag" style="width:${clamp(u.mag*2.4,4,100)}%"></i></div><span class="sv">${u.mag}</span></div>
        ${u.trait?`<span class="traitchip">◆ ${u.trait.toUpperCase()}</span>`:''}
      </div>
    </div>
    <div class="movebox front"><span class="mrow">FRONT ROW</span> · <span class="mvname">${u.front.n}</span><br>${u.front.d}</div>
    <div class="movebox back"><span class="mrow">BACK ROW</span> · <span class="mvname">${u.back.n}</span><br>${u.back.d}</div>
    ${u.spec?`<div class="movebox spec"><span class="mrow">SPECIAL</span> · <span class="mvname">${u.spec.n}</span><br>${u.spec.d}</div>`:''}
    ${promoHTML}`;
  D.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>{
    u.job=b.dataset.promo; const keep=u.hp/u.maxhp;
    baseStats(u); u.hp=Math.max(1,Math.round(u.maxhp*keep));
    toast(u.name+' IS NOW A '+u.job.toUpperCase()+'!'); drawPM(); saveGame();
  });
  const mb=D.querySelector('[data-master]');
  if(mb) mb.onclick=()=>{
    u.star=true; const keep=u.hp/u.maxhp;
    baseStats(u); u.hp=Math.max(1,Math.round(u.maxhp*keep));
    toast(u.name+' HAS MASTERED THE '+u.job.toUpperCase()+'! ★'); drawPM(); saveGame();
  };
}
