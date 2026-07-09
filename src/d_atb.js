/* ============================================================
   Part D: ATB battle engine + field combat glue + rewards + boot
============================================================ */
function facingBonusFrom(fx,fy,def){
  const dx=Math.sign(def.x-fx),dy=Math.sign(def.y-fy);
  const appr=Math.abs(dx)>=Math.abs(dy)?(dx>0?'E':'W'):(dy>0?'S':'N');
  const OPP={N:'S',S:'N',E:'W',W:'E'};
  if(def.face===OPP[appr])return{mult:1.5,label:'BACK ATTACK!',adv:60,flip:true};
  if(def.face===appr)return{mult:1.0,label:'ENGAGEMENT',adv:20,flip:false};
  return{mult:1.25,label:'SIDE ATTACK!',adv:40,flip:false};
}
function fieldAttack(att,def){
  const fb=facingBonusFrom(att.x,att.y,def);
  att.moved=true; att.acted=true;
  announce(`<div class="big">${fb.label}</div>${att.side==='pl'?att.id:'☠ '+att.id} engages ${def.id}!`);
  return openATB({pl:att.side==='pl'?att:def, en:att.side==='pl'?def:att,
    attackerIsPl:att.side==='pl', fb, siege:null});
}
function fieldSiege(att,hq){
  const gU=hq.garrison.filter(u=>u.hp>0);
  if(!gU.length){
    if(hq===F.HQ_EN){flog(att.id+' storms the undefended keep!','good'); fieldEnd(true);}
    else{flog('The camp falls!','bad'); fieldEnd(false);}
    return Promise.resolve();
  }
  att.moved=true; att.acted=true;
  const gar={id:hq.type+' GARRISON', side:att.side==='pl'?'en':'pl', units:hq.garrison, isGarrison:hq};
  announce(`<div class="big">SIEGE!</div>${att.side==='pl'?att.id:'☠ '+att.id} assaults the ${hq.type}!`);
  return openATB({pl:att.side==='pl'?att:gar, en:att.side==='pl'?gar:att,
    attackerIsPl:att.side==='pl', fb:{mult:1,label:'SIEGE',adv:0,flip:false}, siege:hq});
}

/* ================= ATB BATTLE ================= */
let B=null;
const ACTICON={attack:'⚔',defend:'🛡',special:'✦',retreat:'🏃'};
function openATB(cfg){
  let resolveEnd;
  const done=new Promise(res=>{resolveEnd=res;});
  hideOrders(); clearHi();
  const modal=document.createElement('div');
  modal.id='atb'; modal.className='modal show';
  modal.innerHTML=`<div class="inner ffwin">
    <div id="atbTop">
      <span class="abadge">${cfg.fb.label}</span>
      <span style="color:var(--dim)" id="atbNames"></span>
      <span style="color:var(--dim);font-size:6px">TAP A UNIT TO SET ORDERS</span>
    </div>
    <div id="atbArena">
      <div class="atbside" id="enSide"></div>
      <div class="atbside" id="plSide"></div>
    </div>
    <div id="atbBtns">
      <button class="ff" id="btnRows">⇅ CHANGE ROWS</button>
      <button class="ff" id="btnRetreatAll">🏃 FULL RETREAT</button>
    </div>
    <div id="atbLog"></div>
    <div id="actMenu"></div>
  </div>`;
  document.body.appendChild(modal);
  const plParty=cfg.pl, enParty=cfg.en;
  $('atbNames').textContent=(plParty.id||'BANNER')+' VS '+(enParty.id||'FOE');
  B={cfg, pl:[], en:[], over:false, ticker:null, queue:[], acting:false,
     plFlip:false, buffs:{plAtk:1,plDef:1,enAtk:1,enDef:1}, cds:{}, t:0, onEnd:resolveEnd};
  const mkSide=(party,side)=>{
    return party.units.filter(u=>u.hp>0).map(u=>{
      const bu={u, side, atb:rnd(25), act:'attack', retreated:false,
        marked:false, vanished:false, rageT:0, fadeT:0, row:u.row||'front'};
      if(party.isGarrison){ bu.act = bu.row==='front'?'defend':'attack'; }
      return bu;
    });
  };
  B.pl=mkSide(plParty,'pl'); B.en=mkSide(enParty,'en');
  /* initiative & back-attack row flip */
  if(cfg.attackerIsPl){ B.pl.forEach(b=>b.atb+=cfg.fb.adv); if(cfg.fb.flip) B.en.forEach(b=>b.row=b.row==='front'?'back':'front'); }
  else { B.en.forEach(b=>b.atb+=cfg.fb.adv); if(cfg.fb.flip) B.pl.forEach(b=>b.row=b.row==='front'?'back':'front'); }
  renderATB();
  $('btnRows').onclick=()=>{ if(B.over)return;
    B.plFlip=!B.plFlip;
    $('btnRows').classList.toggle('gold',B.plFlip);
    atbLog(B.plFlip?'The banner prepares to wheel about — all wait for the turn!':'Wheel-about cancelled.','imp');
  };
  $('btnRetreatAll').onclick=()=>{ if(B.over)return;
    B.pl.forEach(b=>{ if(b.u.hp>0&&!b.retreated) b.act='retreat'; });
    renderATB(); atbLog('Full retreat ordered!','imp');
  };
  B.ticker=setInterval(tickATB,90);
  return done;
}
function unitCard(b){
  const u=b.u;
  const pct=Math.max(0,u.hp/u.maxhp*100);
  return `<div class="au ${b.side==='en'?'en':''} ${u.hp<=0?'dead':''}" data-id="${u.id}">
    <span class="aact">${b.retreated?'💨':ACTICON[b.act]||''}${b.vanished?'◌':''}${b.marked?'◎':''}</span>
    ${spriteImg(u.job)}
    <div class="aun">${u.name}</div>
    <div class="auhp"><i class="${pct<30?'low':pct<60?'mid':''}" style="width:${pct}%"></i></div>
    <div class="auatb"><i class="${b.atb>=100?'full':''}" style="width:${clamp(b.atb,0,100)}%"></i></div>
  </div>`;
}
function renderATB(){
  const col=(arr,row)=>`<div class="atbcol">${arr.filter(b=>b.row===row&&!b.retreated).map(unitCard).join('')}</div>`;
  /* enemy: back col outer-left, front col inner; player: front inner, back outer-right */
  $('enSide').innerHTML=col(B.en,'back')+col(B.en,'front');
  $('plSide').innerHTML=col(B.pl,'front')+col(B.pl,'back');
  document.querySelectorAll('#plSide .au').forEach(el=>{
    el.onclick=e=>{e.stopPropagation(); openActMenu(+el.dataset.id, el);};
  });
  $('actMenu').style.display='none';
}
function openActMenu(uid,anchor){
  if(B.over)return;
  const b=B.pl.find(x=>x.u.id===uid); if(!b||b.u.hp<=0||b.retreated)return;
  const m=$('actMenu');
  const isCmdr=b.u.job==='Commander';
  let html=`<button data-a="attack" class="${b.act==='attack'?'cur':''}">⚔ ATTACK</button>
    <button data-a="defend" class="${b.act==='defend'?'cur':''}">🛡 DEFEND</button>`;
  if(isCmdr){
    html+=CMD_ABILITIES.filter(a=>G.abilities.includes(a.k)).map(a=>{
      const cd=Math.max(0,Math.ceil(((B.cds[a.k]||0)-B.t)/1000));
      return `<button data-cmd="${a.k}" ${cd?'disabled':''} class="${b.act==='special'&&b.cmdAb===a.k?'cur':''}">✦ ${a.n}${cd?' ('+cd+')':''}</button>`;
    }).join('');
  } else if(b.u.spec){
    html+=`<button data-a="special" class="${b.act==='special'?'cur':''}">✦ ${b.u.spec.n}</button>`;
  }
  html+=`<button data-a="retreat" class="${b.act==='retreat'?'cur':''}">🏃 RETREAT</button>`;
  m.innerHTML=html;
  const arena=$('atbArena').getBoundingClientRect();
  const r=anchor.getBoundingClientRect();
  const inner=anchor.closest('.inner').getBoundingClientRect();
  m.style.left=clamp(r.left-inner.left-14,4,inner.width-112)+'px';
  m.style.top=clamp(r.top-inner.top+r.height-6,4,inner.height-150)+'px';
  m.style.display='block';
  m.querySelectorAll('[data-a]').forEach(btn=>btn.onclick=e=>{
    e.stopPropagation(); b.act=btn.dataset.a; b.cmdAb=null; renderATB();
  });
  m.querySelectorAll('[data-cmd]').forEach(btn=>btn.onclick=e=>{
    e.stopPropagation(); b.act='special'; b.cmdAb=btn.dataset.cmd; renderATB();
  });
}
document.addEventListener('click',()=>{ const m=$('actMenu'); if(m)m.style.display='none'; });
function atbLog(msg,cls){ const l=$('atbLog'); if(!l)return;
  l.innerHTML+=`<div class="${cls||''}">▸ ${msg}</div>`; l.scrollTop=l.scrollHeight; }
function dmgPop(uid,txt,cls){
  const el=document.querySelector(`#atb .au[data-id="${uid}"]`);
  if(!el)return;
  const p=document.createElement('div'); p.className='dmgpop '+(cls||'');
  p.textContent=txt;
  p.style.left=(14+rnd(24))+'px'; p.style.top='4px';
  el.appendChild(p); setTimeout(()=>p.remove(),820);
}
function flash(uid,cls){
  const el=document.querySelector(`#atb .au[data-id="${uid}"]`);
  if(el){el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);}
}
function livingSide(arr){ return arr.filter(b=>b.u.hp>0&&!b.retreated); }
function pickTarget(attackerSide){
  const foes=livingSide(attackerSide==='pl'?B.en:B.pl).filter(b=>!b.vanished);
  if(!foes.length)return null;
  const taunts=foes.filter(b=>b.act==='defend'&&b.row==='front');
  if(taunts.length)return pick(taunts);
  const front=foes.filter(b=>b.row==='front');
  if(front.length)return pick(front);
  return pick(foes);
}
function dealDamage(src,tgt,raw,cls){
  let dmg=raw;
  if(tgt.act==='defend')dmg*=0.5;
  if(tgt.marked)dmg*=1.3;
  if(tgt.fadeT>B.t)dmg*=0.4;
  const sideDef=tgt.side==='pl'?B.buffs.plDef:B.buffs.enDef;
  dmg=Math.max(1,Math.round(dmg/sideDef));
  tgt.u.hp=Math.max(0,tgt.u.hp-dmg);
  flash(tgt.u.id,'hit');
  dmgPop(tgt.u.id,dmg,cls);
  if(tgt.u.hp<=0){ tgt.act='attack'; atbLog(tgt.u.name+' falls!',tgt.side==='pl'?'':'imp'); }
  return dmg;
}
function unitAct(b){
  const u=b.u, foeSide=b.side==='pl'?'en':'pl';
  const atkMul=(b.side==='pl'?B.buffs.plAtk:B.buffs.enAtk)*(b.rageT>B.t?1.5:1);
  b.vanished=false;
  flash(u.id,'acting');
  if(b.act==='retreat'){
    b.retreated=true; atbLog(u.name+' withdraws from the field.','imp');
    renderATB(); return;
  }
  if(b.act==='defend'){ b.atb=0; return; } /* hold stance, regain readiness */
  if(b.act==='special'){
    if(u.job==='Commander'&&b.cmdAb){ commanderAbility(b); b.atb=0; return; }
    if(u.spec){ castSpec(b,u.spec,atkMul); b.atb=0; return; }
  }
  /* ATTACK */
  const tgt=pickTarget(b.side);
  if(!tgt){b.atb=0; return;}
  const rowPen=(b.row==='back'&&!u.rng)?0.6:1;
  const crit=Math.random()<0.08;
  let raw=(u.atk*2 - tgt.u.def)*rowPen*atkMul*(0.9+Math.random()*0.2);
  if(b.row==='front'&&u.rng&&u.job!=='Priest')raw*=1.15; /* point blank */
  raw=Math.max(2,raw)*(crit?1.7:1);
  dealDamage(b,tgt,raw,crit?'crit':'');
  if(u.job==='Assassin'&&tgt.u.hp>0&&tgt.u.hp<tgt.u.maxhp*0.3&&Math.random()<0.3){
    dealDamage(b,tgt,raw*0.8,'crit'); atbLog(u.name+' presses the kill!','imp');
  }
  b.atb=0;
}
function castSpec(b,sp,atkMul){
  const u=b.u, allies=livingSide(b.side==='pl'?B.pl:B.en), foes=livingSide(b.side==='pl'?B.en:B.pl);
  const M=u.mag;
  switch(sp.type){
    case 'heal':{ const t=allies.slice().sort((a,c)=>a.u.hp/a.u.maxhp-c.u.hp/c.u.maxhp)[0];
      if(t){const h=Math.round(M*2.2*sp.pow); t.u.hp=clamp(t.u.hp+h,0,t.u.maxhp); dmgPop(t.u.id,'+'+h,'heal'); atbLog(u.name+': '+sp.n+' heals '+t.u.name+'.');} break;}
    case 'healAll':{ allies.forEach(t=>{const h=Math.round(M*1.5*sp.pow); t.u.hp=clamp(t.u.hp+h,0,t.u.maxhp); dmgPop(t.u.id,'+'+h,'heal');}); atbLog(u.name+': '+sp.n+'!','imp'); break;}
    case 'selfheal':{ const h=Math.round(u.maxhp*0.35*sp.pow); u.hp=clamp(u.hp+h,0,u.maxhp); dmgPop(u.id,'+'+h,'heal'); break;}
    case 'aoe':{ const front=foes.filter(f=>f.row==='front'); (front.length?front:foes).forEach(t=>dealDamage(b,t,(M*2-t.u.def*0.5)*sp.pow*atkMul,'magic')); atbLog(u.name+': '+sp.n+'!','imp'); break;}
    case 'aoeAll':{ foes.forEach(t=>dealDamage(b,t,(M*2-t.u.def*0.4)*sp.pow*atkMul,'magic')); atbLog(u.name+': '+sp.n+'!','imp'); break;}
    case 'drain':{ const t=pickTarget(b.side); if(t){const d=dealDamage(b,t,(M+u.atk)*sp.pow*atkMul,'magic'); u.hp=clamp(u.hp+Math.round(d*0.6),0,u.maxhp); dmgPop(u.id,'+'+Math.round(d*0.6),'heal');} break;}
    case 'pierce':{ const t=pickTarget(b.side); if(t)dealDamage(b,t,(u.atk*2-t.u.def*0.5)*sp.pow*atkMul,'crit'); break;}
    case 'exec':{ const weak=foes.slice().sort((a,c)=>a.u.hp-c.u.hp)[0]; if(weak)dealDamage(b,weak,(u.atk*sp.pow+ (weak.u.hp<weak.u.maxhp*0.35?u.atk:0))*atkMul,'crit'); atbLog(u.name+': EXECUTE!','imp'); break;}
    case 'stun':{ const t=pickTarget(b.side); if(t){dealDamage(b,t,(u.atk*1.6)*sp.pow*atkMul,''); t.atb=Math.min(t.atb,-30); atbLog(t.u.name+' is staggered!');} break;}
    case 'mark':{ const t=foes[rnd(foes.length)]; if(t){t.marked=true; dmgPop(t.u.id,'MARKED','magic'); atbLog(u.name+' marks '+t.u.name+'.');} break;}
    case 'buff':{ if(b.side==='pl')B.buffs.plAtk=1+sp.pow; else B.buffs.enAtk=1+sp.pow; atbLog(u.name+': '+sp.n+' — ATK UP!','imp'); break;}
    case 'guard':{ if(b.side==='pl')B.buffs.plDef=1+sp.pow; else B.buffs.enDef=1+sp.pow; atbLog(u.name+': '+sp.n+' — DEF UP!','imp'); break;}
    case 'veil':{ if(b.side==='pl')B.buffs.enAtk=Math.max(0.5,1-sp.pow); else B.buffs.plAtk=Math.max(0.5,1-sp.pow); atbLog(u.name+': '+sp.n+'!'); break;}
    case 'vanish':{ b.vanished=true; dmgPop(u.id,'VANISH','magic'); break;}
    case 'fade':{ const t=pickTarget(b.side); if(t)dealDamage(b,t,(u.atk*2-t.u.def)*sp.pow,''); b.fadeT=B.t+4000; break;}
    case 'rage':{ b.rageT=B.t+8000; dmgPop(u.id,'RAGE!','crit'); break;}
  }
}
function commanderAbility(b){
  const a=CMD_ABILITIES.find(x=>x.k===b.cmdAb); if(!a)return;
  B.cds[a.k]=B.t+12000;
  const allies=livingSide(B.pl), foes=livingSide(B.en);
  switch(a.type){
    case 'buff': B.buffs.plAtk=1+a.pow; atbLog('RALLY! The banner\'s blood is up!','imp'); break;
    case 'atbhit': foes.forEach(f=>f.atb=Math.max(-20,f.atb-a.pow)); atbLog('WAR CRY! The foe reels!','imp'); break;
    case 'healAll': allies.forEach(t=>{const h=Math.round(b.u.mag*2*a.pow+10); t.u.hp=clamp(t.u.hp+h,0,t.u.maxhp); dmgPop(t.u.id,'+'+h,'heal');}); atbLog('MEND BANNER!','imp'); break;
    case 'aoeAll': foes.forEach(t=>dealDamage(b,t,(b.u.mag*2.4-t.u.def*0.4)*a.pow,'magic')); atbLog('FLAME OF COMMAND!','imp'); break;
    case 'revive':{ const dead=B.pl.filter(x=>x.u.hp<=0&&!x.retreated);
      if(dead.length){const t=pick(dead); t.u.hp=Math.round(t.u.maxhp*a.pow); t.atb=0; dmgPop(t.u.id,'RISE!','heal'); atbLog(t.u.name+' rises again!','imp'); renderATB();}
      else atbLog('No fallen to raise.'); break;}
  }
  b.act='attack'; b.cmdAb=null;
}
function tickATB(){
  if(B.over)return;
  B.t+=90;
  /* row flip: wait for all */
  const alive=livingSide(B.pl);
  if(B.plFlip){
    alive.forEach(b=>{ if(b.atb<100) b.atb+=(b.u.spd*2+8)*0.9; });
    if(alive.length&&alive.every(b=>b.atb>=100)){
      alive.forEach(b=>{b.row=b.row==='front'?'back':'front'; b.atb=0;});
      B.plFlip=false; $('btnRows').classList.remove('gold');
      atbLog('THE BANNER WHEELS ABOUT — rows reversed!','imp');
      renderATB();
    }
  } else {
    alive.forEach(b=>{ b.atb+=(b.u.spd*2+8)*0.9; if(b.atb>=100&&!B.queue.includes(b))B.queue.push(b); });
  }
  livingSide(B.en).forEach(b=>{ b.atb+=(b.u.spd*2+8)*0.9; if(b.atb>=100&&!B.queue.includes(b))B.queue.push(b); });
  /* enemy simple AI: heal if healer & ally hurt */
  B.en.forEach(b=>{
    if(b.u.hp<=0)return;
    if(b.u.spec&&(b.u.spec.type==='heal'||b.u.spec.type==='healAll')){
      const hurt=livingSide(B.en).some(x=>x.u.hp<x.u.maxhp*0.55);
      b.act=hurt?'special':'attack';
    }
  });
  if(!B.acting&&B.queue.length){
    B.acting=true;
    const b=B.queue.shift();
    if(b.u.hp>0&&!b.retreated) unitAct(b);
    updateBars();
    setTimeout(()=>{B.acting=false; checkATBEnd();},170);
  }
  updateBars();
  checkATBEnd();
}
function updateBars(){
  document.querySelectorAll('#atb .au').forEach(el=>{
    const id=+el.dataset.id;
    const b=B.pl.find(x=>x.u.id===id)||B.en.find(x=>x.u.id===id);
    if(!b)return;
    const pct=Math.max(0,b.u.hp/b.u.maxhp*100);
    const hi=el.querySelector('.auhp i'); hi.style.width=pct+'%';
    hi.className=pct<30?'low':pct<60?'mid':'';
    const ai=el.querySelector('.auatb i'); ai.style.width=clamp(b.atb,0,100)+'%';
    ai.className=b.atb>=100?'full':'';
    el.classList.toggle('dead',b.u.hp<=0);
    el.querySelector('.aact').textContent=(b.retreated?'💨':ACTICON[b.act]||'')+(b.vanished?'◌':'')+(b.marked?'◎':'');
  });
}
function checkATBEnd(){
  if(B.over)return;
  const plAlive=livingSide(B.pl).length, enAlive=livingSide(B.en).length;
  const plRetreated=B.pl.some(b=>b.retreated&&b.u.hp>0);
  if(enAlive===0) endATB(plAlive>0?'win':'draw');
  else if(plAlive===0) endATB(plRetreated?'retreat':'loss');
}
function endATB(result){
  B.over=true; clearInterval(B.ticker);
  setTimeout(()=>{
    const modal=$('atb'); if(modal)modal.remove();
    const onEnd=B.onEnd;
    resolveFieldBattle(result);
    if(onEnd)onEnd();
  },700);
}
function resolveFieldBattle(result){
  const cfg=B.cfg;
  const plParty=cfg.pl, enParty=cfg.en;
  const plField=plParty.isGarrison?null:plParty;
  const enField=enParty.isGarrison?null:enParty;
  if(result==='win'){
    /* xp to player fighters */
    const totalLv=enParty.units.reduce((a,u)=>a+u.lv,0);
    const fighters=plParty.units;
    const each=Math.max(6,Math.round(totalLv*12/Math.max(1,fighters.length)));
    let lvups=[];
    fighters.forEach(u=>{ const ups=grantXP(u,each); if(ups)lvups.push(u.name+' → LV'+u.lv); });
    if(lvups.length){ announce('<div class="big">LEVEL UP!</div>'+lvups.join(' · ')); }
    if(enField){
      flog('☠ '+enField.id+' is routed!','good');
      enField.el.remove(); F.parties=F.parties.filter(q=>q!==enField);
    }
    if(cfg.siege&&cfg.siege===F.HQ_EN){
      flog('The keep garrison is destroyed! Move a banner onto it to seize victory.','imp');
    }
  } else if(result==='loss'||result==='draw'){
    if(plField){
      flog(plField.id+' was destroyed!','bad');
      plField.el.remove(); F.parties=F.parties.filter(q=>q!==plField);
    } else if(plParty.isGarrison){
      flog('The camp garrison has fallen!','bad');
    }
    if(enField&&enField.units.every(u=>u.hp<=0)){
      enField.el.remove(); F.parties=F.parties.filter(q=>q!==enField);
    }
  } else if(result==='retreat'&&plField){
    /* survivors withdraw one tile toward camp */
    plField.units.forEach(u=>{ if(u.hp<=0)u.hp=1; });
    const dx=Math.sign(F.HQ_PL.x-plField.x),dy=Math.sign(F.HQ_PL.y-plField.y);
    const nx=plField.x+dx,ny=plField.y+dy;
    if(passable(nx,ny)&&!partyAtF(nx,ny)){plField.x=nx; plField.y=ny;}
    plField.done=true; placeTok(plField);
    flog(plField.id+' withdraws, bloodied but alive.','imp');
  }
  drawGarrisonBadges();
  F.parties.forEach(placeTok); computeVision();
  checkFieldEnd();
  if(F.phase==='player'&&!F.fieldOver){
    if(F.selP&&F.parties.includes(F.selP)&&!F.selP.done) showOrders(F.selP);
    else nextParty();
  }
}
/* ---------- ENEMY FIELD TURN ---------- */
async function enemyTurn(){
  F.phase='enemy'; updateTopbar(); clearHi(); hideOrders();
  F.selP=null; F.parties.forEach(p=>p.el.classList.remove('sel'));
  for(const e of F.parties.filter(p=>p.side==='en')){
    if(F.fieldOver)return;
    if(!F.parties.includes(e))continue;
    await new Promise(r=>setTimeout(r,300));
    const r0=bfsF(e);
    let best=null;
    const consider=(def,isHQ)=>{
      for(const k in DIRS){
        const ax=def.x+DIRS[k][0],ay=def.y+DIRS[k][1];
        const key=ax+','+ay;
        const atStart=(ax===e.x&&ay===e.y);
        if(!atStart&&(r0.dist[key]===undefined||partyAtF(ax,ay)))continue;
        if(!atStart&&!passable(ax,ay))continue;
        let score;
        if(isHQ){ const g=def.garrison.reduce((a,u)=>a+Math.max(0,u.hp),0);
          score=80-g*0.4+(g===0?220:0); }
        else{ const fb=facingBonusFrom(ax,ay,def);
          const hp=def.units.reduce((a,u)=>a+Math.max(0,u.hp),0);
          score=fb.mult*100-hp*0.25-(def.stance==='defend'?25:0); }
        if(!best||score>best.score)best={def,isHQ,ax,ay,score,atStart};
      }
    };
    F.parties.filter(p=>p.side==='pl').forEach(t=>consider(t,false));
    consider(F.HQ_PL,true);
    if(best&&best.score>40){
      if(!best.atStart)await walk(e,pathToF(r0,best.ax,best.ay));
      e.face=best.def.x>e.x?'E':best.def.x<e.x?'W':best.def.y>e.y?'S':'N'; placeTok(e);
      if(best.isHQ)await fieldSiege(e,best.def); else await fieldAttack(e,best.def);
      continue;
    }
    /* march */
    let tgt=null,td=1e9;
    F.parties.filter(p=>p.side==='pl').forEach(t=>{const d=Math.abs(t.x-e.x)+Math.abs(t.y-e.y); if(d<td){td=d;tgt=t;}});
    const goal=tgt&&td<8?tgt:F.HQ_PL;
    let bk=null,bd=1e9;
    for(const key in r0.dist){const [x,y]=key.split(',').map(Number);
      if(partyAtF(x,y))continue;
      const d=Math.abs(goal.x-x)+Math.abs(goal.y-y);
      if(d<bd){bd=d;bk=[x,y];}}
    if(bk){ await walk(e,pathToF(r0,bk[0],bk[1]));
      e.face=goal.x>e.x?'E':goal.x<e.x?'W':goal.y>e.y?'S':'N'; placeTok(e); }
  }
  if(F.fieldOver)return;
  /* regen */
  F.parties.forEach(p=>{
    const h=healers(p.units.filter(u=>u.hp>0));
    p.units.forEach(u=>{if(u.hp>0)u.hp=clamp(u.hp+2+h*3,1,u.maxhp);});
    placeTok(p);
  });
  [F.HQ_PL,F.HQ_EN].forEach(hq=>hq.garrison.forEach(u=>{if(u.hp>0)u.hp=clamp(u.hp+4,1,u.maxhp);}));
  F.turn++;
  F.phase='player';
  F.parties.forEach(p=>{p.moved=false;p.acted=false;p.done=false;p.stance=null;placeTok(p);});
  computeVision(); drawGarrisonBadges();
  flog('— Turn '+F.turn+'. Banners recover. —');
  updateTopbar(); checkFieldEnd();
  if(!F.fieldOver)nextParty();
}
function checkFieldEnd(){
  if(F.fieldOver)return;
  const pl=F.parties.some(p=>p.side==='pl');
  const en=F.parties.some(p=>p.side==='en');
  const enGar=F.HQ_EN.garrison.some(u=>u.hp>0);
  const plGar=F.HQ_PL.garrison.some(u=>u.hp>0);
  const fortTaken=F.parties.find(p=>p.side==='pl'&&F.cfg.useFortCheck!==false&&p.x===F.HQ_EN.x&&p.y===F.HQ_EN.y);
  if(fortTaken||(!en&&!enGar)){ fieldEnd(true); return; }
  if(!pl&&!plGar) fieldEnd(false);
}
function fieldEnd(win){
  F.fieldOver=true; hideOrders();
  const es=$('endscreen'); es.style.display='flex';
  $('endText').textContent=win?'★ VICTORY ★':'DEFEAT...';
  $('endBtns').innerHTML='';
  if(win){
    G.battlesWon++;
    /* survivors heal a little; fallen rise at 1 */
    G.roster.forEach(u=>{ if(u.hp<=0)u.hp=1; u.hp=clamp(u.hp+Math.round(u.maxhp*0.3),1,u.maxhp); });
    const n=curBattle.node;
    $('endSub').textContent=n?'The chapter is won.':'The field is yours.';
    const b=document.createElement('button'); b.className='ff gold'; b.textContent='CLAIM THE FIELD ▶';
    b.onclick=()=>{ es.style.display='none'; applyRewards(n); };
    $('endBtns').appendChild(b);
  } else {
    G.roster.forEach(u=>{ u.hp=Math.max(u.hp,Math.round(u.maxhp*0.5)); });
    $('endSub').textContent='The banner limps home to lick its wounds. The road remains.';
    const b=document.createElement('button'); b.className='ff'; b.textContent='WITHDRAW ◀';
    b.onclick=()=>{ es.style.display='none'; enterWorld(); };
    $('endBtns').appendChild(b);
  }
}
function applyRewards(n){
  if(!n){ /* random encounter */
    saveGame(); enterWorld(); return;
  }
  G.cleared[n.i]=true;
  let txt=n.reward.text||'';
  if(n.reward.recruit){ G.roster.push(RECRUITS[n.reward.recruit]()); }
  if(n.reward.recruit2){ G.roster.push(RECRUITS[n.reward.recruit2]()); }
  if(n.reward.ability&&!G.abilities.includes(n.reward.ability)) G.abilities.push(n.reward.ability);
  if(n.ch>=G.chapter) G.chapter=n.ch+1;
  if(n.i===12){ G.openEnded=true; }
  $('rwText').innerHTML=txt;
  $('rwLevels').innerHTML='BANNER: '+G.roster.length+' SOULS · COMMANDER LV '+G.roster[0].lv;
  $('rewardModal').classList.add('show');
  $('rwOk').onclick=()=>{ $('rewardModal').classList.remove('show'); saveGame(); enterWorld(); };
}
/* ---------- BOOT ---------- */
screenHTML();
initTitle();
