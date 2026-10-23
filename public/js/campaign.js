'use strict';
/* Creature Clash — solo challenge campaign (doubles as the tutorial) and daily / weekly challenges */
const LEGLESS=D('Slidey Pete','#55c8ff','#ffd23d','spots',[1.15,.85,1.35],[P('fins',.97,-.15,0),P('fins',.9,-.35,-.4,{s:.8}),P('basicJaw',0,-.2,.98),P('googlyEye',.32,.48,.82),P('bellyPadding',0,-1,0),P('tailClub',0,-.05,-1)]);
function playerDesignForChallenge(){const i=progress.lastSlot;if(i>=0&&slots[i]&&validateDesign(slots[i]).selectable)return clone(slots[i]);const j=slots.findIndex(s=>s&&validateDesign(s).selectable);if(j>=0)return clone(slots[j]);return clone(PRESETS[0]);}
const mz=x=>world.map.laneZ(0,x);
function placeAt(c,x,z,yaw){c.x=x;c.z=z;c.y=world.map.heightAt(x,z);if(yaw!=null)c.yaw=yaw;}
function cBot(design,team,name,x,z,tweak){const c=spawnCreature(design,team,false,name,0,1,pick(BOT_COLORS));placeAt(c,x,z,team==='red'?-Math.PI/2:Math.PI/2);if(tweak)tweak(c.brain,c);return c;}
function addBeacon(x,z){const y=world.map.heightAt(x,z);const g=new T.Group();g.position.set(x,y,z);
  const ring=new T.Mesh(geo('beaconRing',()=>new T.TorusGeometry(1.8,.1,8,48)),glowMat('#55f0ff',3));ring.rotation.x=Math.PI/2;ring.position.y=.2;g.add(ring);
  const beam=new T.Mesh(geo('beaconBeam',()=>new T.CylinderGeometry(1.5,1.7,16,32,1,true)),matc('beaconBeamM',()=>new T.MeshBasicMaterial({color:col('#55f0ff').multiplyScalar(1.4),transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false})));beam.position.y=8;g.add(beam);
  world.group.add(g);return {x,z,g,ring};}
function ensureGeyserNear(x,z){let best=null,bd=1e9;for(const g of world.geysers){const d=dist2(g.x,g.z,x,z);if(d<bd){bd=d;best=g;}}
  if(best&&bd<45*45)return best;const gx=x,gz=z;const gy={x:gx,z:gz,y:world.map.heightAt(gx,gz),period:6.5,t:0,hit:new Set(),erupting:0};gy.view=buildGeyserView(world.map.biome);gy.view.position.set(gx,gy.y,gz);world.group.add(gy.view);world.geysers.push(gy);return gy;}

const CAMPAIGN=[
  {id:'wobbles',name:'First Wobbles',xp:50,biome:'candy',lesson:'Moving, jumping and the camera',desc:'Reach three glowing beacons. Move with WASD or the joystick, jump with Space, and steer the camera with the mouse.',
    setup(m){placeAt(m.player,-30,mz(-30),Math.PI/2);m.cs={i:0,b:[addBeacon(-16,mz(-16)+3),addBeacon(-2,mz(-2)-4),addBeacon(14,mz(14)+3)]};m.cs.b.forEach((b,i)=>b.g.visible=i===0);},
    objective:m=>'Reach the glowing beacons · '+m.cs.i+' of 3',
    update(m){const b=m.cs.b[m.cs.i];if(!b)return;b.ring.rotation.z+=.03;if(Math.hypot(m.player.x-b.x,m.player.z-b.z)<2.6){b.g.visible=false;sfx('drop');emit(b.x,b.g.position.y+1,b.z,{n:30,color:'#55f0ff',speed:6,life:.8,size:.16,glow:2.5,up:4});m.cs.i++;if(m.cs.b[m.cs.i])m.cs.b[m.cs.i].g.visible=true;else return 'win';}}},
  {id:'snack',name:'Snack Attack',xp:60,biome:'swamp',lesson:'Attacking and lock-on',desc:'Defeat three Snorflets. Left click attacks and Tab locks on. Snorflets give health or a mutation, but never DNA.',
    setup(m){placeAt(m.player,-10,mz(-10),Math.PI/2);m.cs={n:0};for(let i=0;i<3;i++){const s=spawnNeutral('critter',4+i*4,mz(4+i*4)+(i-1)*5,world.map.biome);s.noRespawn=true;}},
    objective:m=>'Defeat the Snorflets · '+m.cs.n+' of 3',
    on(m,t,d){if(t==='neutral'&&d.by===m.player&&d.n.type==='critter'){m.cs.n++;if(m.cs.n>=3)return 'win';}}},
  {id:'egg',name:'Crack an Egg',xp:80,time:120,biome:'volcanic',lesson:'Nests and dodging',desc:'Destroy the enemy nest before time runs out. Nests spit goo, so dodge it with Shift.',
    setup(m){placeAt(m.player,-12,mz(-12),Math.PI/2);m.cs={nest:addNest({team:'red',lane:0,x:14,z:mz(14),main:false,outer:true},700)};},
    objective:()=>'Destroy the red nest',
    on(m,t,d){if(t==='nest'&&d.nest===m.cs.nest)return 'win';}},
  {id:'legless',name:'Win With No Legs',xp:100,biome:'tundra',forced:LEGLESS,lesson:'Form equals function',desc:'You get a legless creature that slides slowly. Let the enemy come to you and fight smart.',
    setup(m){placeAt(m.player,-8,mz(-8),Math.PI/2);m.cs={e:cBot(BOT_PRESETS[7],'red','Puffington',10,mz(10),b=>{b.slow=2.2;b.fixedTarget=m.player;b.brave=true;})};},
    objective:m=>'Defeat '+m.cs.e.name,
    on(m,t,d){if(t==='kill'&&d.victim===m.cs.e)return 'win';}},
  {id:'geyser',name:'Hot Seat',xp:100,time:150,biome:'volcanic',lesson:'Using hazards',desc:'Geysers launch anything standing on them. Lure the enemy onto a geyser just as it erupts.',
    setup(m){const g=ensureGeyserNear(-10,-16);placeAt(m.player,g.x+5,g.z+2,0);m.cs={g,e:cBot(BOT_PRESETS[5],'red','Inkwell',g.x-9,g.z-3,b=>{b.passive=true;b.fixedTarget=m.player;b.brave=true;})};m.cs.e.maxHp=m.cs.e.hp=400;},
    objective:()=>'Get the enemy launched by a geyser. Watch for the bubbles.',
    on(m,t,d){if(t==='geyser'&&d.c===m.cs.e)return 'win';}},
  {id:'rescue',name:'No Fossil Left Behind',xp:120,biome:'swamp',lesson:'Reviving teammates',desc:'Your teammate is down. Stand next to them and hold E to revive them, then win the fight together.',
    setup(m){placeAt(m.player,-14,mz(-14),Math.PI/2);const t=cBot(PRESETS[1],'blue','Sir Shellby',-4,mz(-4));t.state='downed';t.hp=0;t.downedT=30;m.cs={t,e:cBot(BOT_PRESETS[4],'red','Zappity',14,mz(14),b=>{b.slow=1.8;b.noFinish=true;})};},
    objective:m=>m.cs.t.state==='downed'?'Revive your teammate · hold E next to them':'Defeat '+m.cs.e.name,
    update(m){if(m.cs.t.state==='dead')return 'fail:Your teammate became a fossil.';if(m.cs.e.state==='dead'&&m.cs.t.state==='alive')return 'win';}},
  {id:'glass',name:'Glass Cannon',xp:150,biome:'candy',rules:{dmgMul:1.6,noRegen:true},lesson:'Risk and reward',desc:'You start at half health with no regeneration, but hit 60% harder. Defeat both bots.',
    setup(m){placeAt(m.player,-12,mz(-12),Math.PI/2);m.player.hp=Math.round(m.player.maxHp*.5);m.cs={n:0,es:[cBot(BOT_PRESETS[0],'red','Chompsworth',10,mz(10)-3,b=>{b.slow=2.1;b.fixedTarget=m.player;}),cBot(BOT_PRESETS[2],'red','Gloopa',18,mz(18)+3,b=>{b.slow=2.1;b.fixedTarget=m.player;})]};},
    objective:m=>'Defeat both bots · '+m.cs.n+' of 2',
    on(m,t,d){if(t==='kill'&&m.cs.es.includes(d.victim)){m.cs.n++;if(m.cs.n>=2)return 'win';}}},
  {id:'gobbler',name:'Topple the Gobbler',xp:200,biome:'volcanic',lesson:'Boss fights',desc:'Take on The Grand Gobbler alone. When it rears up, get out of the way before it slams.',
    setup(m){const b=spawnNeutral('boss',8,mz(8)+2,world.map.biome);b.noRespawn=true;b.hx=8;b.hz=mz(8)+2;placeAt(m.player,-10,mz(-10),Math.PI/2);m.cs={b};},
    objective:()=>'Defeat The Grand Gobbler',
    on(m,t,d){if(t==='neutral'&&d.n===m.cs.b)return 'win';}},
  {id:'defend',name:'Hold the Nest',xp:200,time:90,timeWin:true,biome:'tundra',lesson:'Defending',desc:'Bots are coming for your nest. Keep it alive for 90 seconds.',
    setup(m){const n=addNest({team:'blue',lane:0,x:-22,z:mz(-22),main:false},1200);placeAt(m.player,-16,mz(-16),Math.PI/2);m.cs={n,wave:0,next:3};},
    update(m,dt){m.cs.next-=dt;if(m.cs.next<=0&&m.cs.wave<6){m.cs.wave++;m.cs.next=13;cBot(pick(BOT_PRESETS),'red',pick(BOT_NAMES),36,mz(36)+(Math.random()-.5)*6,b=>{b.slow=1.8;b.brave=true;});banner('Wave '+m.cs.wave+' incoming','bad');}
      if(!m.cs.n.alive)return 'fail:Your nest was destroyed.';},
    objective:m=>'Protect your nest · wave '+m.cs.wave+' of 6'},
  {id:'exam',name:'Final Exam',xp:250,lesson:'Everything at once',desc:'One of you, two of them. Bring your best Workshop creature.',
    setup(m){placeAt(m.player,-14,mz(-14),Math.PI/2);m.cs={n:0,es:[cBot(pick(BOT_PRESETS),'red',pick(BOT_NAMES),12,mz(12)-3,b=>{b.fixedTarget=m.player;b.slow=1.35;}),cBot(pick(BOT_PRESETS),'red',pick(BOT_NAMES),18,mz(18)+3,b=>{b.fixedTarget=m.player;b.slow=1.35;})]};},
    objective:m=>'Defeat both bots · '+m.cs.n+' of 2',
    on(m,t,d){if(t==='kill'&&m.cs.es.includes(d.victim)){m.cs.n++;if(m.cs.n>=2)return 'win';}}},
];
CAMPAIGN.forEach((c,i)=>{c.kind='campaign';c.index=i;});
const campaignUnlocked=i=>i===0||!!progress.campaign[CAMPAIGN[i-1].id];

function startCampaign(def){
  exitLock();hideTouch();build=null;clearAnnouncements();
  buildWorld(4242+def.index*97,{mode:'test',biome:def.biome});
  const pd=def.forced?clone(def.forced):playerDesignForChallenge();
  startMatch({mode:'challenge',challenge:def,player:pd,bots:[],rules:def.rules||{},setup:m=>def.setup(m)});
  banner(def.name,'gold');
}
function updateChallenge(dt){
  const m=match,def=m.challenge;if(!def||m.over)return;
  const txt=def.objective?def.objective(m):'';if(cache.obj!==txt){cache.obj=txt;H.obj.textContent=txt;announce(txt);}
  if(def.time&&m.time>=def.time){handleChallengeResult(def.timeWin?'win':'fail:Time ran out.');return;}
  if(def.update)handleChallengeResult(def.update(m,dt));
}
function onChallengeEvent(type,data){
  if(!match||match.mode!=='challenge'||match.over)return;
  if(type==='playerDied'){handleChallengeResult('fail:You got clashed.');return;}
  const def=match.challenge;if(def.on)handleChallengeResult(def.on(match,type,data));
}
function handleChallengeResult(r){if(!r)return;if(r==='win')finishChallenge(true,'Challenge complete!');else if(r.startsWith('fail'))finishChallenge(false,r.slice(5)||'Challenge failed.');}
function finishChallenge(win,reason){
  if(match.over)return;match.over=true;match.winner=win?'blue':'red';match.reason=reason;match.endT=0;match.chWin=win;
  const def=match.challenge;let xp=0,levels=[];match.firstClear=false;
  if(win&&!progress.campaign[def.id]){progress.campaign[def.id]=true;xp=def.xp;levels=grantXP(xp);match.firstClear=true;}
  saveProgress();match.earned.xp=xp;match.earned.levels=levels;
  timeScale=.35;sfx(win?'win':'lose');exitLock();hideTouch();
  if(win)for(const c of world.creatures)if(c.team==='blue'&&c.state==='alive')c.emoteT=4;
}
function showChallengeResults(){
  const def=match.challenge,win=match.chWin;const next=CAMPAIGN[def.index+1];
  const t=$('#rTitle');t.textContent=win?'Challenge complete':'Challenge failed';t.className='restitle '+(win?'win':'lose');
  $('#rReason').textContent=match.reason+(win?'':' '+def.desc);$('#rBiome').textContent='Campaign '+(def.index+1)+' of '+CAMPAIGN.length+' · '+def.name;
  $('#rBoard').innerHTML='';
  let h='';if(match.firstClear)h+='<span class="chip xp">+'+match.earned.xp+' XP</span>';else if(win)h+='<span class="chip dim">Already cleared · no XP this time</span>';
  for(const l of match.earned.levels)h+='<span class="chip lv">Unlocked: '+esc(l)+'</span>';if(match.earned.levels.length)h+='<span class="chip lv">Level '+progress.level+'</span>';
  $('#rEarn').innerHTML=h;$('#rNew').textContent=win&&next?'Next challenge':'Retry';$('#rMenu').textContent='All challenges';$('#results').hidden=false;
}
function retryChallenge(){const def=match.challenge;const next=CAMPAIGN[def.index+1];startCampaign(match.chWin&&next?next:def);}
function quitChallenge(){openChallenges();}

/* ---------- daily & weekly challenges (Lane Battle with a twist) ---------- */
function trimTo(d,ok){for(let guard=0;guard<40&&!ok(d);guard++){const i=d.parts.map((p,k)=>[p,k]).reverse().find(([p])=>PARTS[p.id].mount!=='leg'&&PARTS[p.id].fam!=='Offense');if(!i)break;d.parts.splice(i[1],1);}return d;}
const CONSTRAINTS={
  half:{name:'Half Budget',desc:'Weight 30, complexity 20 and 12 parts at most.',check:d=>{const s=calcStats(d);if(s.weight>30)return 'Weight must be 30 or less.';if(s.complexity>20)return 'Complexity must be 20 or less.';if(s.partCount>12)return 'Use 12 parts or fewer.';return null;},fix:d=>trimTo(d,x=>!CONSTRAINTS.half.check(x))},
  swim:{name:'Swimmers Only',desc:'No legs allowed. Bring at least one pair of fins.',check:d=>d.parts.some(p=>PARTS[p.id].mount==='leg')?'Remove all legs.':!d.parts.some(p=>p.id==='fins')?'Add Fins.':null,fix:d=>{d.parts=d.parts.filter(p=>PARTS[p.id].mount!=='leg');if(!d.parts.some(p=>p.id==='fins'))d.parts.push(P('fins',.97,-.15,0));return d;}},
  tiny:{name:'Tiny Terrors',desc:'Body width, height and length of 0.85 or less.',check:d=>Math.max(d.body.w,d.body.h,d.body.l)>.85?'Shrink your body to 0.85 or less.':null,fix:d=>{for(const k of ['w','h','l'])d.body[k]=Math.min(d.body[k],.85);return d;}},
  oneatk:{name:'One Trick',desc:'Only one kind of attack part.',check:d=>new Set(d.parts.map(p=>PARTS[p.id].atk).filter(Boolean)).size>1?'Keep only one kind of attack.':null,fix:d=>{const f=d.parts.map(p=>PARTS[p.id].atk).find(Boolean);d.parts=d.parts.filter(p=>!PARTS[p.id].atk||PARTS[p.id].atk===f);return d;}},
  nodef:{name:'Squishy',desc:'No defense parts at all.',check:d=>d.parts.some(p=>PARTS[p.id].fam==='Defense')?'Remove your defense parts.':null,fix:d=>{d.parts=d.parts.filter(p=>PARTS[p.id].fam!=='Defense');return d;}},
  stilts:{name:'Stilt Walkers',desc:'Long Legs or Spider Legs only.',check:d=>{const l=d.parts.filter(p=>PARTS[p.id].mount==='leg');if(!l.length)return 'Add Long Legs or Spider Legs.';if(l.some(p=>p.id!=='longLegs'&&p.id!=='spiderLegs'))return 'Swap other legs for Long or Spider Legs.';return null;},fix:d=>{let any=false;d.parts.forEach(p=>{if(PARTS[p.id].mount==='leg'){p.id='longLegs';any=true;}});if(!any)d.parts.push(P('longLegs',.6,-.62,.45),P('longLegs',.6,-.62,-.45));return d;}},
};
const GOALS={
  win:{name:'Win the Lane Battle',check:(m,final)=>final&&m.winner===m.player.team},
  kills3:{name:'Get 3 kills in one battle',check:m=>m.player.kills>=3},
  nests2:{name:'Destroy 2 nests yourself',check:m=>m.player.nestsKilled>=2},
  survive:{name:'Still be alive when the battle ends',check:(m,final)=>final&&m.player.state!=='dead'},
};
function dayIndex(){const d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);}
function rotating(kind){const di=dayIndex(),wi=Math.floor((di+3)/7);const ks=Object.keys(CONSTRAINTS),gs=Object.keys(GOALS);
  return kind==='daily'?{kind,key:'d'+di,constraint:ks[di%ks.length],goal:gs[(di*7+3)%gs.length],xp:150}:{kind,key:'w'+wi,constraint:ks[(wi*5+2)%ks.length],goal:['win','nests2','kills3'][wi%3],xp:500};} // XP values: SUGGESTION
function untilReset(kind){const now=new Date();const next=new Date(now);next.setHours(24,0,0,0);if(kind==='weekly'){const add=(8-((now.getDay()+6)%7+1))%7;next.setDate(next.getDate()+add);}const h=Math.max(0,Math.round((next-now)/36e5));return h>=24?Math.floor(h/24)+'d '+(h%24)+'h':h+'h';}
function checkRotGoal(final){const r=match&&match.rot;if(!r||r.done)return;if(GOALS[r.goal].check(match,final)){r.done=true;if(!progress.daily[r.key]){progress.daily[r.key]=true;const lv=grantXP(r.xp);match.earned.xp+=r.xp;match.earned.levels.push(...lv);match.earned.rot=r;saveProgress();banner((r.kind==='daily'?'Daily':'Weekly')+' challenge complete!','gold');sfx('drop');}}}

/* ---------- challenges screen ---------- */
function openChallenges(){exitLock();hideTouch();match=null;build=null;if(!world||world.mode==='test'||world.creatures.length)buildWorld(newSeed());phase='menu';setRenderView(scene,camera,world.map.biome.bloom);showScreen('chal');clearAnnouncements();renderChallenges();}
function renderChallenges(){
  $('#campList').innerHTML=CAMPAIGN.map((c,i)=>{const done=!!progress.campaign[c.id],open=campaignUnlocked(i);
    return '<button class="camp'+(done?' done':'')+(open?'':' locked')+'" data-i="'+i+'"'+(open?'':' aria-disabled="true"')+'><span class="cn">'+(i+1)+'</span><span class="cb"><b>'+esc(c.name)+'</b><small>'+esc(open?c.lesson:'Clear the previous challenge to unlock')+'</small></span><span class="cx">'+(done?'Cleared':'+'+c.xp+' XP')+'</span></button>';}).join('');
  $$('#campList .camp').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;if(!campaignUnlocked(i)){sfx('deny');return;}sfx('ui');showCampDetail(i);}));
  for(const kind of ['daily','weekly']){const r=rotating(kind);const c=CONSTRAINTS[r.constraint],g=GOALS[r.goal];const done=!!progress.daily[r.key];
    $('#'+kind+'Card').innerHTML='<div class="rotc'+(done?' done':'')+'"><div class="rothead"><b>'+esc(c.name)+'</b><span class="chip '+(done?'good':'xp')+'">'+(done?'Claimed':'+'+r.xp+' XP')+'</span></div><p>'+esc(c.desc)+'</p><p class="goal">Goal: '+esc(g.name)+'</p><div class="rotfoot"><small>Resets in '+untilReset(kind)+'</small><button class="btn small '+(done?'ghost':'primary')+'" data-rot="'+kind+'">'+(done?'Play anyway':'Play')+'</button></div></div>';}
  $$('[data-rot]').forEach(b=>b.addEventListener('click',()=>{sfx('ui');openBuild({rot:rotating(b.dataset.rot)});}));
  showCampDetail(Math.max(0,CAMPAIGN.findIndex((c,i)=>campaignUnlocked(i)&&!progress.campaign[c.id])));
}
function showCampDetail(i){const c=CAMPAIGN[i];if(i<0||!c)return;const pd=c.forced?c.forced:playerDesignForChallenge();
  $$('#campList .camp').forEach(b=>b.classList.toggle('sel',+b.dataset.i===i));
  $('#campDetail').innerHTML='<div class="eyebrow">Challenge '+(i+1)+' · '+esc(c.lesson)+'</div><h3>'+esc(c.name)+'</h3><p>'+esc(c.desc)+'</p>'+(c.time?'<p class="goal">Time limit: '+fmtTime(c.time)+'</p>':'')+
    '<div class="campme"><img alt="" src="'+Portrait.design(pd)+'"><span><small>'+(c.forced?'Creature for this challenge':'Your creature')+'</small><b>'+esc(pd.name)+'</b>'+(c.forced?'':'<small>Change it by picking a slot in the Workshop.</small>')+'</span></div>'+
    '<div class="row"><button class="btn primary" id="campGo">'+(progress.campaign[c.id]?'Play again':'Start')+'</button></div>';
  $('#campGo').addEventListener('click',()=>{sfx('ui');startCampaign(c);});}
function refreshCampaignCard(){const n=CAMPAIGN.filter(c=>progress.campaign[c.id]).length;const d=progress.daily[rotating('daily').key];$('#mChalSub').textContent='Campaign '+n+' of '+CAMPAIGN.length+' cleared · Daily challenge '+(d?'claimed':'ready');}
$('#mChal').addEventListener('click',()=>{AudioFX.init();sfx('ui');openChallenges();});
$('#chalBack').addEventListener('click',()=>{sfx('ui');openMenu();});
