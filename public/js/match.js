'use strict';
/* Creature Clash — entities, combat, MatchManager rules, bots, input, camera, HUD */
let UID=0;
class Creature{
  constructor(d,team,isPlayer,name){
    this.id=++UID;this.kind='creature';this.d=d;this.team=team;this.isPlayer=isPlayer;this.name=name;
    this.st=calcStats(d);this.maxHp=this.st.hp;this.hp=this.maxHp;this.radius=this.st.radius;
    this.state='alive';this.x=0;this.y=0;this.z=0;this.vx=0;this.vy=0;this.vz=0;this.kx=0;this.kz=0;this.yaw=0;this.grounded=true;
    this.stamina=100;this.moveX=0;this.moveZ=0;this.aimYaw=null;this.faceT=0;
    this.attacks=this.st.attacks;this.cds=this.attacks.map(()=>0);this.special=this.st.special;this.specCd=0;
    this.muts={};this.kills=0;this.dmgDealt=0;this.nestDmg=0;this.nestsKilled=0;
    this.downedT=0;this.downedBy=null;this.reviveP=0;this.reviving=false;this.lastHitBy=null;this.lastHurt=-99;
    this.dodgeT=0;this.invulnT=0;this.dashT=0;this.dashHit=null;this.dashDmg=0;this.spinT=0;this.biteT=0;this.slashT=0;this.flop=false;
    this.shield=0;this.shieldT=0;this.venomT=0;this.venomSrc=null;this.emoteT=0;this.deadT=0;this.blessT=0;this.spitT=0;this.spitTarget=null;
    this.slowT=0;this.camoT=0;this.burrowT=0;this.inflateT=0;this.zapT=0;this.glideHeld=false;
    this.brain=isPlayer?null:{t:Math.random()*.3,mode:'lane',target:null,laneI:-1,retreat:false,atkT:0,jit:Math.random()*TAU};
  }
  get alive(){return this.state==='alive';}
  get height(){return this.view?this.view.height:3;}
  setMove(x,z){const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}this.moveX=x;this.moveZ=z;}
  jump(){if(!this.alive||!this.grounded||this.stamina<12||this.reviving||this.burrowT>0)return;this.vy=(this.st.legCount&&this.d.parts.some(p=>p.id==='longLegs')?11.5:10)*this.st.jump;this.grounded=false;this.stamina-=12;sfx(this.st.jump>1?'boing':'jump',this);}
  dodge(){if(!this.alive||this.dodgeT>0||this.stamina<22||this.burrowT>0)return;let dx=this.moveX,dz=this.moveZ;if(Math.hypot(dx,dz)<.1){dx=-Math.sin(this.yaw);dz=-Math.cos(this.yaw);}const l=Math.hypot(dx,dz);this.kx+=dx/l*15;this.kz+=dz/l*15;this.dodgeT=.6;this.invulnT=.32;this.stamina-=22;this.vy=Math.max(this.vy,4);this.grounded=false;if(this.view)this.view.jv+=1.2;sfx('dodge',this);}
}
function spawnCreature(design,team,isPlayer,name,lane,slot,tint){
  const d=clone(design);if(tint){d.color=tint[0];d.accent=tint[1];}if(!d.seed)d.seed=Math.floor(Math.random()*99991);
  const c=new Creature(d,team,isPlayer,name);c.lane=lane;
  const s=TEAMS[team].sign;c.x=s*88;c.z=(slot-1)*5;c.y=world.map.heightAt(c.x,c.z);c.yaw=team==='blue'?Math.PI/2:-Math.PI/2;
  c.view=buildCreatureView(d,{team});c.view.lastYaw=c.yaw;c.radius=c.view.radius;world.group.add(c.view.root);
  const vol=d.body.w*d.body.h*d.body.l;c.voicePitch=clamp(1.75-vol*.42-(d.parts.some(p=>p.id==='basicJaw'&&p.s>1.2)?.15:0),.55,1.7);
  c.tag=makeTag('tag3d '+team,'<div class="tn"><span class="tglyph" aria-hidden="true">'+(team==='blue'?'●':'◆')+'</span>'+esc(name)+'</div><div class="tb"><i></i></div><div class="tdown" hidden>DOWNED</div>');
  world.creatures.push(c);return c;
}
const DUMMY=D('Training Dummy','#e8d2a0','#c84a3a','stripes',[.85,1.25,.85],[P('googlyEye',.34,.4,.85),P('bowTie',0,-.45,.88)]);

/* ---------- MatchManager ---------- */
let phase='menu';let match=null;let timeScale=1,ffMul=1;let paused=false;
const cam={yaw:Math.PI/2,pitch:.34,dist:11,shake:0,lock:null,fx:0,fy:0,fz:0,spect:null,cine:null};
const BOT_COLORS=[['#ffd23d','#ff7a3d'],['#5ad1ff','#2a5cff'],['#7dff6a','#1f9a5a'],['#ff5a7a','#ffd0e0'],['#c08aff','#5a2aa8'],['#ffa04a','#7a3a1a'],['#4affd8','#1a6a8a'],['#ff7ae8','#7a2a8a'],['#e8f06a','#6a8a2a'],['#9af0ff','#ff6a9a']];
const BOT_NAMES=['Blorbo','Sir Noodlethigh','Gloria Gumbo','Captain Wigglebottom','Snackrifice','Professor Plonk','Muffinmaw','Dame Squelch','Tater Thunk','Lord Flopsy','Wobbletron','Gristle McGee','Nibbles the Unkind','Bean Supreme','Count Chompula','Puddlebutt'];
const CAPTIONS=['Returned to the primordial soup.','Cause of death: bit off more than it could chew.','Extinction speedrun complete.','Evolution has requested a refund.','Your genes have left the chat.','Fossil record updated.','Natural selection said no.','Tragically out-wobbled.','Now a cautionary tale for future species.','Respawning is a myth. Sorry.','Reclassified as a snack.','Achievement unlocked: Fossil.'];

/* opts: {mode:'battle'|'test'|'challenge', player:design, bots:[{design,team,name,lane,tint}], rules:{}} */
function startMatch(opts){
  AudioFX.init();
  match={mode:opts.mode||'battle',rules:opts.rules||{},time:0,countdown:opts.mode==='test'?0:3.2,over:false,winner:null,reason:'',nestsDestroyed:{blue:0,red:0},deaths:{blue:0,red:0},
    earned:{xp:0,dna:0,drops:[],levels:[]},xpGranted:false,player:null,eliminated:false,resultsShown:false,endT:0,challenge:opts.challenge||null,rot:opts.rot?clone(opts.rot):null,stats:{}};
  match.player=spawnCreature(opts.player,'blue',true,'You',0,1);
  for(const b of opts.bots||[])spawnCreature(b.design,b.team,false,b.name,b.lane,b.slot!=null?b.slot:1,b.tint);
  if(match.mode==='test'){const p=match.player;p.x=-14;p.z=world.map.laneZ(0,-14);p.y=world.map.heightAt(p.x,p.z);
    [[-2,-3],[2,2.5],[6,-1]].forEach(([dx,dz],i)=>{const d=spawnCreature(DUMMY,'red',false,'Training Dummy',0,1);d.isDummy=true;d.brain=null;d.x=dx;d.z=world.map.laneZ(0,dx)+dz;d.y=world.map.heightAt(d.x,d.z);d.yaw=-Math.PI/2;});}
  if(opts.setup)opts.setup(match);
  cam.yaw=Math.PI/2;cam.lock=null;cam.spect=null;cam.cine=null;timeScale=1;ffMul=1;cam.fx=match.player.x;cam.fz=match.player.z;
  phase='battle';setRenderView(scene,camera,world.map.biome.bloom);
  showScreen('hud');$('#biomeName').textContent=world.map.biome.name;
  $('#hud').classList.toggle('test',match.mode==='test');$('#hud').classList.toggle('challenge',match.mode==='challenge');
  $('#spectbar').hidden=true;$('#ffBtn').textContent='Speed 1×';
  buildPips();buildAbilityBar();
  if(isCoarse)$('#touch').hidden=false;else requestLock();
}
function buildPips(){for(const team of ['blue','red']){const el=$(team==='blue'?'#pipsBlue':'#pipsRed');el.innerHTML='';const ns=world.nests.filter(n=>n.team===team);const ordered=team==='blue'?ns.slice().sort((a,b)=>(a.main?-1:0)-(b.main?-1:0)):ns.slice().sort((a,b)=>(a.main?1:0)-(b.main?1:0));
  for(const n of ordered){const p=document.createElement('i');p.className='pip'+(n.main?' main':'');el.appendChild(p);n.pip=p;}}}
function nestAttackable(n){if(!n.alive)return false;if(n.main&&S.mainNestNeedsClearedLane){return [-1,0,1].some(k=>world.nests.filter(m=>m.team===n.team&&m.lane===k).every(m=>!m.alive));}return true;}
function inkAt(x,z,enemyOf){for(const k of world.inks){if(k.team===enemyOf)continue;if(dist2(x,z,k.x,k.z)<k.r*k.r)return k;}return null;}
function canSee(obs,t){if(!t||t.kind!=='creature')return true;const d=Math.hypot(t.x-obs.x,t.z-obs.z);if(t.burrowT>0)return false;if(t.camoT>0&&d>3)return false;
  if(d>2.5&&(inkAt(t.x,t.z,t.team)||inkAt(obs.x,obs.z,obs.team)))return false;return true;}
function targetsFor(c){const out=[];for(const e of world.creatures){if(e.team===c.team||e.burrowT>0)continue;if(e.state==='alive'||(e.state==='downed'&&S.downedCanBeFinishedOff))out.push(e);}
  for(const n of world.nests)if(n.team!==c.team&&n.alive)out.push(n);for(const n of world.neutrals)if(n.alive)out.push(n);return out;}
function dmgMul(c){return (.55+c.st.damage*.06)*(c.muts['Big Bite']?1.15:1)*(c.blessT>0?1.15:1)*(match&&match.rules.dmgMul&&c.isPlayer?match.rules.dmgMul:1);}
function tryAttack(c,i,aimYaw){
  if(!c.alive||c.dashT>0||c.reviving||c.burrowT>0)return false;const a=c.attacks[i];if(!a||c.cds[i]>0||c.stamina<a.st)return false;
  if(aimYaw!=null)c.yaw=aimYaw;c.aimYaw=c.yaw;c.faceT=.35;c.cds[i]=a.cd;c.stamina-=a.st;const mul=dmgMul(c)*(.7+.3*(a.scale||1));
  if(c.camoT>0){c.camoT=0;emit(c.x,c.y+1,c.z,{n:14,color:'#55f0ff',speed:4,life:.5,size:.14,glow:2});}
  if(c.view)c.view.jv+=.5;if(Math.random()<.35)voice(c,'attack');
  if(a.melee){if(a.id==='slash'||a.id==='maul'||a.id==='pinch')c.slashT=.3;else c.biteT=a.id==='peck'?.15:.3;meleeHit(c,a,mul);sfx(a.sound,c);}
  else switch(a.id){
    case 'spin':c.spinT=.5;aoeHit(c,c.x,c.z,a.range+c.radius,a.dmg*mul,a.type,a.kb,!!c.muts.Venom,true);emit(c.x,c.y+.8,c.z,{n:18,color:c.d.accent,speed:9,flat:true,life:.4,grav:0,size:.18,glow:1.5});sfx('spin',c);break;
    case 'charge':c.dashT=a.dash;c.dashHit=new Set();c.dashDmg=a.dmg*mul;sfx('charge',c);break;
    case 'spit':fireSpit(c,a,mul);break;
    case 'zap':fireZap(c,a,mul);break;
  }
  if(match&&c.isPlayer)match.stats.attacks=(match.stats.attacks||0)+1;
  return true;
}
function meleeHit(c,a,mul){
  const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);let best=null,bd=1e9;const hits=[];
  for(const t of targetsFor(c)){const dx=t.x-c.x,dz=t.z-c.z;const d=Math.hypot(dx,dz);const reach=c.radius+a.range+t.radius*.6;if(d>reach)continue;if(d>.01&&(dx*fx+dz*fz)/d<a.arc)continue;if(Math.abs((t.y||0)-c.y)>3.5)continue;if(a.single){if(d<bd){bd=d;best=t;}}else hits.push(t);}
  if(a.single&&best)hits.push(best);
  for(const t of hits){const dx=t.x-c.x,dz=t.z-c.z,d=Math.hypot(dx,dz)||1;hurt(t,a.dmg*mul,a.type,c,dx/d,dz/d,a.kb,!!a.venom||!!c.muts.Venom);
    if(a.slow&&t.kind==='creature')t.slowT=a.slow;
    emit(t.x-dx/d*t.radius*.7,(t.y||0)+1.2,t.z-dz/d*t.radius*.7,{n:8,color:a.venom?'#b8ff4f':'#fff3c0',speed:6,life:.35,size:.12,glow:2.2});
    if(t.kind==='creature'&&t.state==='alive'){ // thorns and inflate push back on melee attackers
      if(t.st.thorns>0){hurtCreature(c,t.st.thorns,'thorns',t,-dx/d,-dz/d,1.5,false);sfx('thorns',c);}
      if(t.inflateT>0){c.kx-=dx/d*10;c.kz-=dz/d*10;c.vy=Math.max(c.vy,4);c.grounded=false;sfx('boing',t);}}}
}
function aoeHit(src,x,z,r,dmg,type,kb,venom,melee){for(const t of targetsFor(src)){const dx=t.x-x,dz=t.z-z;const d=Math.hypot(dx,dz);if(d>r+t.radius*.6)continue;const n=d||1;hurt(t,dmg,type,src,dx/n,dz/n,kb,venom);
  if(melee&&t.kind==='creature'&&t.state==='alive'&&t.st.thorns>0)hurtCreature(src,t.st.thorns,'thorns',t,-dx/n,-dz/n,1,false);}}
function fireSpit(c,a,mul){
  const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);const sx=c.x+fx*(c.radius+.3),sz=c.z+fz*(c.radius+.3),sy=c.y+c.view.baseY;
  const sp=27,g=9;let vy=1.5;const t=c.spitTarget;
  if(t&&(t.alive||t.state==='downed')){const d=Math.hypot(t.x-sx,t.z-sz);const tt=d/sp;vy=((t.y||0)+(t.height||2)*.5-sy)/tt+.5*g*tt;vy=clamp(vy,-6,12);}
  else if(c.isPlayer){vy=clamp(-(cam.pitch-.34)*14+2,-4,8);}
  const mesh=new T.Mesh(sphereG(),glowMat('#b8ff4f',2.6));mesh.scale.setScalar(.3);world.group.add(mesh);
  world.projectiles.push({kind:'spit',x:sx,y:sy,z:sz,vx:fx*sp,vy,vz:fz*sp,g,life:1.1,team:c.team,src:c,dmg:a.dmg*mul,type:'spit',kb:a.kb,r:.35,splash:0,venom:!!c.muts.Venom,mesh,color:'#b8ff4f'});
  c.spitT=.25;sfx('spit',c);
}
function fireZap(c,a,mul){
  const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);let best=null,bd=1e9;
  for(const t of targetsFor(c)){if(t.kind==='creature'&&t.state!=='alive')continue;const dx=t.x-c.x,dz=t.z-c.z,d=Math.hypot(dx,dz);if(d>a.range+t.radius)continue;if(d>.01&&(dx*fx+dz*fz)/d<a.arc)continue;if(d<bd){bd=d;best=t;}}
  c.zapT=.25;sfx('zap',c);const sy=c.y+c.height*.85;
  if(!best){bolt(c.x,sy,c.z,c.x+fx*a.range*.6,sy-.5,c.z+fz*a.range*.6);return;}
  const ty=(best.y||0)+(best.height||2)*.5;bolt(c.x,sy,c.z,best.x,ty,best.z);hurt(best,a.dmg*mul,'shock',c,fx,fz,a.kb,false);
  let nx=null,nd=25;for(const t of targetsFor(c)){if(t===best||t.kind!=='creature'||t.state!=='alive')continue;const d=dist2(t.x,t.z,best.x,best.z);if(d<nd){nd=d;nx=t;}}
  if(nx){bolt(best.x,ty,best.z,nx.x,nx.y+nx.height*.5,nx.z);hurt(nx,a.dmg*mul*.6,'shock',c,fx,fz,a.kb*.5,false);}
}
function bolt(ax,ay,az,bx,by,bz){const pts=[];const n=9;for(let i=0;i<=n;i++){const t=i/n;const j=(i===0||i===n)?0:.45;pts.push(new T.Vector3(lerp(ax,bx,t)+(Math.random()-.5)*j,lerp(ay,by,t)+(Math.random()-.5)*j,lerp(az,bz,t)+(Math.random()-.5)*j));}
  const g=new T.BufferGeometry().setFromPoints(pts);const l=new T.Line(g,glowMat('#9af0ff',4));world.group.add(l);world.bolts.push({l,t:.14});
  emit(bx,by,bz,{n:10,color:'#9af0ff',speed:6,life:.35,size:.1,glow:3});}
function lobGoo(n,t){
  const top=n.view.s*(n.main?3.6:1.6);const x0=n.x,y0=n.y+top,z0=n.z;const T0=clamp(Math.hypot(t.x-x0,t.z-z0)/14,.55,1.3);const g=20;
  const tx=t.x+(t.vx+t.kx)*T0*.5,tz=t.z+(t.vz+t.kz)*T0*.5,ty=t.y+.8;
  const mesh=new T.Mesh(sphereG(),glowMat(TEAMS[n.team].hex,3));mesh.scale.setScalar(n.main?.5:.38);world.group.add(mesh);
  world.projectiles.push({kind:'goo',x:x0,y:y0,z:z0,vx:(tx-x0)/T0,vy:(ty-y0)/T0+.5*g*T0,vz:(tz-z0)/T0,g,life:3,team:n.team,src:n,dmg:n.main?11:6,type:'goo',kb:5,r:.5,splash:1.9,venom:false,mesh,color:TEAMS[n.team].hex});
  n.view.pulse=.4;
}
function hurt(t,amt,type,src,dx,dz,kb,venom){
  if(!match||match.over)return;
  if(t.kind==='creature')return hurtCreature(t,amt,type,src,dx,dz,kb,venom);
  if(t.kind==='nest')return hurtNest(t,amt,src);
  if(t.kind==='neutral')return hurtNeutral(t,amt,src,dx,dz,kb);
}
function hurtCreature(c,amt,type,src,dx,dz,kb,venom){
  if(c.state==='dead'||!match||match.over)return;
  if(c.state==='downed'){if(match.mode==='test'&&c.isPlayer)return;if(S.downedCanBeFinishedOff&&src&&src.kind==='creature'&&src.team!==c.team)killCreature(c,src);return;}
  if(c.burrowT>0)return;
  if(c.invulnT>0){floatText(c,'dodged','miss');return;}
  if(c.isPlayer&&DEV.god){floatText(c,'god mode','miss');return;}
  let m=1;if(c.st.armor){if(venom||type==='venom')m*=1.4;else if(type==='bite'||type==='slash')m*=.7;}
  if(c.muts['Thick Hide'])m*=.85;if(c.inflateT>0)m*=.4;
  let dmg=amt*m;
  if(c.shield>0){const ab=Math.min(c.shield,dmg);c.shield-=ab;dmg-=ab;if(c.shield<=0){c.shieldT=0;emit(c.x,c.y+1.5,c.z,{n:16,color:'#55f0ff',speed:7,life:.5,size:.15,glow:2});}}
  if(venom){c.venomT=3;c.venomSrc=src;}
  c.hp-=dmg;c.lastHurt=match.time;if(src&&src.kind==='creature'){c.lastHitBy=src;src.dmgDealt+=dmg;}
  if(c.isDummy){if(c.hp<1)c.hp=1;c.dummyT=3;}
  const sf=Math.max(.6,c.st.stability/5)/(c.st.kbResist||1)*(c.inflateT>0?4:1);c.kx+=dx*kb/sf;c.kz+=dz*kb/sf;if(kb>6&&!c.isDummy){c.vy=Math.max(c.vy,kb*.35/sf);c.grounded=false;}
  if(c.view){c.view.jv-=3.2;c.view.flash=1;for(const e of c.view.eyes){e.vx+=(Math.random()-.5)*4;e.vy+=(Math.random()-.5)*4;}}
  if(dmg>.5)floatText(c,Math.round(dmg),type==='thorns'?'weak':m>1.05?'crit':m<.95?'weak':'');if(type!=='thorns'&&Math.random()<.7)voice(c,'hurt');
  if(type!=='thorns'){sfx('hit',c);emit(c.x,c.y+c.view.baseY,c.z,{n:7,color:c.d.color,speed:6,life:.5,size:.14,glow:1.2});}
  if(c.isPlayer){if(c.hp<c.maxHp*.3&&!c._lowAnn){c._lowAnn=true;announce('Low health');}cam.shake=Math.max(cam.shake,type==='thorns'?.1:.35);hurtFlash=type==='thorns'?.2:.6;match.stats.damageTaken=(match.stats.damageTaken||0)+dmg;}
  if(c.hp<=0){c.hp=0;downCreature(c,src&&src.kind==='creature'&&src.team!==c.team?src:c.lastHitBy);}
}
function downCreature(c,by){
  if(c.state!=='alive')return;c.state='downed';c.downedT=S.downedSec;c.downedBy=by||null;c.reviveP=0;c.shield=0;c.shieldT=0;c.dashT=0;c.reviving=false;c.camoT=0;c.inflateT=0;c.burrowT=0;
  killfeed(tname(by)+' downed '+tname(c));sfx('downed',c);if(c.view)c.view.jv-=2;
  if(cam.lock===c&&!S.downedCanBeFinishedOff)cam.lock=null;
  if(match.mode==='test'&&c.isPlayer){setTimeout(()=>{if(match&&match.mode==='test'&&c.state==='downed'){c.state='alive';c.hp=c.maxHp;c.x=-14;c.z=world.map.laneZ(0,-14);c.invulnT=1;banner('Back on your feet','good');}},1500);}
}
function makeKillReport(k,v){return {fromMatch:match.mode==='battle',killerId:k.id,victimId:v.id,victimIsPlayer:v.isPlayer,time:match.time};}
function killCreature(c,killer){
  if(c.state==='dead')return;if(c.isDummy)return;c.state='dead';c.deadT=0;c.hp=0;c.reviving=false;match.deaths[c.team]++;
  const k=killer&&killer.kind==='creature'&&killer.team!==c.team?killer:null;
  if(k){k.kills++;k.emoteT=1.4;
    const trait=traitOf(c);if(trait&&k.state==='alive'&&k.muts[trait]!==Infinity){k.muts[trait]=Infinity;if(k.isPlayer)banner('Mutation absorbed: '+trait,'mut');}
    if(k.isPlayer){const report=makeKillReport(k,c);const dna=awardKillDNA(report);match.earned.dna+=dna;if(dna)floatText(k,'+'+dna+' DNA','dna',k.height+1.2);
      if(report.fromMatch){const missing=[...new Set(c.d.parts.map(p=>p.id))].filter(p=>PARTS[p]&&PARTS[p].tier!=='Free'&&!progress.unlocked.includes(p));
        if(missing.length&&Math.random()<RW.dropChance){const p=pick(missing);grantDroppedPart(p);match.earned.drops.push(PARTS[p].name);banner('Part drop: '+PARTS[p].name,'drop');sfx('drop');}}}}
  killfeed(tname(k)+' clashed '+tname(c));
  emit(c.x,c.y+1.5,c.z,{n:34,color:c.d.color,speed:11,life:1,size:.22,glow:1.4,up:4});emit(c.x,c.y+1.5,c.z,{n:14,color:'#ffffff',speed:7,life:.6,size:.12,glow:3});
  sfx('death',c);voice(c,'death');if(cam.lock===c)cam.lock=null;
  if(c.isPlayer)onPlayerEliminated(k);
  if(typeof onChallengeEvent==='function')onChallengeEvent('kill',{killer:k,victim:c});
}
function traitOf(c){const order=['Venom','Thick Hide','Zoomies','Big Bite'];const have=c.d.parts.map(p=>PARTS[p.id]&&PARTS[p.id].mut).filter(Boolean);return order.find(m=>have.includes(m))||null;}
function revive(c,by){c.state='alive';c.hp=Math.round(c.maxHp*S.reviveHpFrac);c.reviveP=0;c.invulnT=1.2;c.venomT=0;
  killfeed(tname(by)+' revived '+tname(c));sfx('revive',c);emit(c.x,c.y+1,c.z,{n:24,color:'#62ff9a',speed:4,life:1,size:.16,glow:2,up:5,grav:-2});if(c.isPlayer)banner('Revived!','good');}
function hurtNest(n,amt,src){
  if(!n.alive||match.over)return;
  if(!nestAttackable(n)){if(src&&src.isPlayer&&Math.random()<.3)floatText(n,'clear a lane first','miss');return;}
  n.hp-=amt;n.lastHurt=match.time;if(src&&src.kind==='creature')src.nestDmg+=amt;n.view.hitT=.25;
  if(src&&src.isPlayer)floatText(n,Math.round(amt),'nest');
  emit(n.x,n.y+n.height*.5,n.z,{n:4,color:'#c8a070',speed:5,life:.5,size:.12});
  if(n.hp<=0)destroyNest(n,src);
}
function destroyNest(n,src){
  n.alive=false;n.hp=0;match.nestsDestroyed[other(n.team)]++;if(src&&src.kind==='creature')src.nestsKilled++;
  if(n.pip)n.pip.classList.add('dead');n.view.dead=true;
  emit(n.x,n.y+2,n.z,{n:60,color:TEAMS[n.team].hex,speed:14,life:1.3,size:.3,glow:2.2,up:8});emit(n.x,n.y+1,n.z,{n:40,color:'#a07a50',speed:9,life:1.1,size:.25,up:6});
  sfx('nest',n);cam.shake=Math.max(cam.shake,Math.max(0,.9-Math.hypot(n.x-cam.fx,n.z-cam.fz)/60));
  const mine=match.player&&n.team===match.player.team;
  banner((mine?'Our ':'Enemy ')+(n.main?'main nest':'nest')+' destroyed',mine?'bad':'gold');
  killfeed(tname(src)+' cracked a <span class="'+(n.team==='blue'?'b':'r')+'">'+TEAMS[n.team].name+(n.main?' main nest':' nest')+'</span>');
  for(const c of world.colliders)if(c.nest===n)c.r=n.radius*.55;
  if(typeof onChallengeEvent==='function')onChallengeEvent('nest',{nest:n,by:src});
  checkWin();
}
function hurtNeutral(n,amt,src,dx,dz,kb){
  if(!n.alive)return;n.hp-=amt;n.lastHurt=match.time;n.flee=3;if(n.view){n.view.jv-=2.5;n.view.flash=1;}
  if(n.type!=='boss'){n.kx=(n.kx||0)+dx*kb*.8;n.kz=(n.kz||0)+dz*kb*.8;}
  if(src&&src.isPlayer)floatText(n,Math.round(amt),'');sfx('hit',n);
  if(n.hp<=0){n.alive=false;n.state='dead';n.deadT=0;n.respawnT=n.type==='boss'?150:40;
    emit(n.x,n.y+1,n.z,{n:n.type==='boss'?70:20,color:n.d.color,speed:n.type==='boss'?14:7,life:1,size:.2,glow:1.5,up:5});
    // neutral rewards: health or temporary mutations, never DNA
    if(src&&src.kind==='creature'&&src.state==='alive'){
      if(n.type==='boss'){for(const c of world.creatures)if(c.team===src.team&&c.state==='alive'){c.blessT=90;emit(c.x,c.y+1,c.z,{n:20,color:'#ffd166',speed:4,life:1.2,size:.16,glow:2.5,up:5,grav:-2});}
        banner(TEAMS[src.team].name+' team got the Boss Blessing',src.team===(match.player&&match.player.team)?'gold':'bad');killfeed(tname(src)+' toppled <span class="n">The Grand Gobbler</span>');sfx('win');}
      else if(Math.random()<.5){const h=Math.min(35,src.maxHp-src.hp);src.hp+=h;floatText(src,'+'+Math.round(h),'heal');emit(src.x,src.y+1,src.z,{n:12,color:'#62ff9a',speed:3,life:.9,size:.14,glow:2,up:4,grav:-2});sfx('heal',src);}
      else{const m=pick(['Venom','Thick Hide','Zoomies','Big Bite']);if(src.muts[m]!==Infinity)src.muts[m]=45;if(src.isPlayer)banner('Temporary mutation: '+m,'mut');}
      if(typeof onChallengeEvent==='function')onChallengeEvent('neutral',{n,by:src});}}
}
function checkWin(){
  if(match.over||match.mode!=='battle')return;
  for(const t of ['blue','red'])if(!world.nests.some(n=>n.team===t&&n.alive))return endMatch(other(t),TEAMS[t].name+' lost every nest.');
  const mb=world.nests.find(n=>n.team==='blue'&&n.main).alive,mr=world.nests.find(n=>n.team==='red'&&n.main).alive;
  if(!mb&&!mr){const w=tiebreak();return endMatch(w.team,'Both main nests fell. '+w.why);}
}
function tiebreak(){const nd=match.nestsDestroyed,de=match.deaths;
  if(nd.blue!==nd.red){const t=nd.blue>nd.red?'blue':'red';return {team:t,why:TEAMS[t].name+' destroyed more nests ('+nd[t]+' to '+nd[other(t)]+').'};}
  if(de.blue!==de.red){const t=de.blue<de.red?'blue':'red';return {team:t,why:'Nests tied, so fewer deaths decided it ('+de[t]+' to '+de[other(t)]+').'};}
  return {team:null,why:'Nests and deaths were tied.'};}
function grantMatchXP(won){
  if(match.xpGranted||!match.player||match.mode!=='battle')return;match.xpGranted=true;const p=match.player;
  const xp=RW.xpMatch+p.kills*RW.xpKill+p.nestsKilled*RW.xpNest+(won?RW.xpWin:0);match.earned.xp=xp;match.earned.levels=grantXP(xp);
  progress.stats.matches++;progress.stats.kills+=p.kills;if(won)progress.stats.wins++;saveProgress();
}
function endMatch(winner,reason){
  if(match.over)return;match.over=true;match.winner=winner;match.reason=reason;match.endT=0;
  const won=match.player&&winner===match.player.team;
  if(match.mode==='battle'){if(!match.eliminated)grantMatchXP(won);else if(won&&!match.winBonus){match.winBonus=true;match.earned.xp+=RW.xpWin;const l=grantXP(RW.xpWin);match.earned.levels.push(...l);progress.stats.wins++;saveProgress();}}
  timeScale=.35;for(const c of world.creatures)if(c.team===winner&&c.state==='alive'){c.emoteT=4;voice(c,'happy');}
  sfx(won?'win':winner?'lose':'ui');exitLock();
}
function onPlayerEliminated(k){
  match.eliminated=true;grantMatchXP(false);if(match.rot&&typeof checkRotGoal==='function')checkRotGoal(false);
  if(match.mode==='challenge'){if(typeof onChallengeEvent==='function')onChallengeEvent('playerDied',{killer:k});return;}
  cam.cine={t:0,target:match.player,killer:k};timeScale=.25;hideTouch();exitLock();
  setTimeout(()=>{if(!match||match.resultsShown||match.mode!=='battle')return;timeScale=1;showDeathScreen(k);},2300);
}

/* ---------- simulation ---------- */
let hurtFlash=0;
function simulate(dt){
  if(match.countdown>0){match.countdown-=dt;for(const c of world.creatures){c.setMove(0,0);updateCreature(c,dt);}return;}
  if(!match.over)match.time+=dt;
  if(match.player&&match.player.state!=='dead'&&!DEV.auto)playerControl(dt);
  for(const c of world.creatures)if((!c.isPlayer||DEV.auto)&&c.brain)botUpdate(c,dt);
  if(match.over)for(const c of world.creatures){c.setMove(0,0);c.reviving=false;}
  for(const c of world.creatures)updateCreature(c,dt);
  for(const n of world.neutrals)updateNeutral(n,dt);
  if(!match.over){for(const n of world.nests)updateNest(n,dt);for(const g of world.geysers)updateGeyser(g,dt);for(const b of world.boulders)updateBoulder(b,dt);}
  updateProjectiles(dt);updateInks(dt);
  resolveCollisions();
  if(!match.over)updateRules(dt);
  if(match.mode==='challenge'&&typeof updateChallenge==='function'&&!match.over)updateChallenge(dt);
  if(match.over){match.endT+=dt/Math.max(timeScale,.01);if(match.endT>2.2&&!match.resultsShown){timeScale=1;showResults();}}
}
function updateCreature(c,dt){
  const map=world.map;
  for(let i=0;i<c.cds.length;i++)if(c.cds[i]>0)c.cds[i]-=dt;
  if(c.specCd>0)c.specCd-=dt;c.dodgeT-=dt;c.invulnT-=dt;c.faceT-=dt;c.biteT-=dt;c.slashT-=dt;c.spinT-=dt;c.emoteT-=dt;c.spitT-=dt;c.zapT-=dt;c.slowT-=dt;c.inflateT-=dt;
  if(c.camoT>0){c.camoT-=dt;if(c.camoT<=0)emit(c.x,c.y+1,c.z,{n:10,color:'#55f0ff',speed:3,life:.5,size:.12,glow:2});}
  if(c.shieldT>0){c.shieldT-=dt;if(c.shieldT<=0)c.shield=0;}
  if(c.blessT>0)c.blessT-=dt;
  if(c.isDummy){c.dummyT=(c.dummyT||0)-dt;if(c.dummyT<=0&&c.hp<c.maxHp){c.hp=c.maxHp;emit(c.x,c.y+1.5,c.z,{n:10,color:'#62ff9a',speed:2,life:.7,size:.12,glow:2,up:3,grav:-2});}}
  for(const k in c.muts){if(c.muts[k]!==Infinity){c.muts[k]-=dt;if(c.muts[k]<=0)delete c.muts[k];}}
  if(c.state==='dead'){c.deadT+=dt;const kd=Math.exp(-3*dt);c.kx*=kd;c.kz*=kd;c.x+=c.kx*dt;c.z+=c.kz*dt;c.vy-=30*dt;c.y+=c.vy*dt;const gh=map.heightAt(c.x,c.z);if(c.y<gh){c.y=gh;c.vy=0;}return;}
  if(c.venomT>0){c.venomT-=dt;if(c.state==='alive'&&!(c.isPlayer&&DEV.god)&&!c.isDummy){c.hp-=4*dt;if(Math.random()<dt*3)emit(c.x,c.y+c.height*.6,c.z,{n:1,color:'#b8ff4f',speed:1,life:.6,size:.1,glow:2,up:2,grav:-1});if(c.hp<=0){c.hp=0;downCreature(c,c.venomSrc&&c.venomSrc.kind==='creature'?c.venomSrc:c.lastHitBy);}}}
  if(c.state==='downed'){c.moveX=c.moveZ=0;const kd=Math.exp(-5*dt);c.kx*=kd;c.kz*=kd;c.vx*=kd;c.vz*=kd;c.x+=(c.vx+c.kx)*dt;c.z+=(c.vz+c.kz)*dt;c.vy-=30*dt;c.y+=c.vy*dt;const gh=map.heightAt(c.x,c.z);if(c.y<gh){c.y=gh;c.vy=0;}return;}
  if(c.burrowT>0){c.burrowT-=dt;if(Math.random()<dt*14)emit(c.x,c.y+.2,c.z,{n:2,color:map.biome.lane,speed:2,life:.6,size:.2,up:2});
    if(c.burrowT<=0){aoeHit(c,c.x,c.z,3+c.radius,14*dmgMul(c),'blunt',9,false,false);emit(c.x,c.y+.3,c.z,{n:30,color:map.biome.lane,speed:9,life:.7,size:.24,up:6});sfx('popup',c);c.vy=9;c.grounded=false;if(c.view)c.view.jv+=1.5;}}
  c.stamina=Math.min(100,c.stamina+20*dt);
  let spd=c.st.moveSpeed*(c.muts.Zoomies?1.15:1)*(c.blessT>0?1.1:1)*(c.slowT>0?.6:1)*(c.burrowT>0?1.5:1)*(inkAt(c.x,c.z,c.team)?.65:1)*(c.isPlayer&&match.rules.speedMul?match.rules.speedMul:1);
  if(c.reviving||c.isDummy)spd=0;
  let tvx=c.moveX*spd,tvz=c.moveZ*spd;
  if(c.dashT>0){c.dashT-=dt;const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);tvx=fx*21;tvz=fz*21;
    for(const t of targetsFor(c)){if(c.dashHit.has(t))continue;if(Math.hypot(t.x-c.x,t.z-c.z)<c.radius+t.radius+.4){c.dashHit.add(t);hurt(t,c.dashDmg,'blunt',c,fx,fz,12,!!c.muts.Venom);emit(t.x,(t.y||0)+1.2,t.z,{n:14,color:'#fff3c0',speed:8,life:.4,size:.15,glow:2.2});
      if(t.kind==='creature'&&t.state==='alive'&&t.st.thorns>0)hurtCreature(c,t.st.thorns,'thorns',t,-fx,-fz,1,false);if(t.kind==='nest'){c.dashT=0;c.kx-=fx*6;c.kz-=fz*6;}}}
    if(Math.random()<.6)emit(c.x,c.y+.2,c.z,{n:1,color:'#d0c0a0',speed:1.5,life:.5,size:.2,up:1});}
  const glide=c.st.glide&&!c.grounded&&c.glideHeld&&c.vy<0;
  const acc=c.grounded?12:(glide?6:3.5);const f=1-Math.exp(-acc*dt);c.vx+=(tvx*(glide?1.3:1)-c.vx)*f;c.vz+=(tvz*(glide?1.3:1)-c.vz)*f;
  const kd=Math.exp(-(c.grounded?6:1.2)*dt);c.kx*=kd;c.kz*=kd;
  c.x+=(c.vx+c.kx)*dt;c.z+=(c.vz+c.kz)*dt;
  const preVy=c.vy;c.vy-=30*dt;if(glide)c.vy=Math.max(c.vy,-2.5);c.y+=c.vy*dt;
  const gh=map.heightAt(c.x,c.z);
  if(c.grounded&&c.vy<=0&&c.y-gh<.6){c.y=gh;c.vy=0;}
  else if(c.y<=gh){if(!c.grounded)land(c,preVy);c.y=gh;c.vy=0;c.grounded=true;}
  else c.grounded=false;
  if(glide&&Math.random()<dt*8)emit(c.x,c.y+c.height*.6,c.z,{n:1,color:c.d.accent,speed:.5,life:.5,size:.1,glow:1.5,grav:0});
  let want=null;if(c.faceT>0&&c.aimYaw!=null)want=c.aimYaw;else if(Math.hypot(c.moveX,c.moveZ)>.1)want=Math.atan2(c.moveX,c.moveZ);
  if(want!=null&&c.dashT<=0)c.yaw+=angDiff(c.yaw,want)*(1-Math.exp(-12*dt));
  if(c.grounded&&c.burrowT<=0&&Math.hypot(c.vx,c.vz)>3&&Math.random()<dt*6)emit(c.x,c.y+.1,c.z,{n:1,color:map.biome.lane,speed:1,life:.45,size:.13,up:1.2,grav:4});
}
function land(c,vy){if(c.view)c.view.jv-=clamp(-vy*.06,0,.9);if(vy<-9)sfx('land',c);
  emit(c.x,c.y+.1,c.z,{n:Math.min(14,Math.floor(-vy*.6)),color:world.map.biome.lane,speed:4,flat:true,life:.5,size:.18,up:1,grav:6});
  if(c.flop){c.flop=false;const mul=dmgMul(c);aoeHit(c,c.x,c.z,5.5,20*mul,'blunt',11,!!c.muts.Venom,false);emit(c.x,c.y+.2,c.z,{n:40,color:c.d.accent,speed:13,flat:true,life:.6,size:.25,glow:1.6,grav:0});
    sfx('flop',c);if(c.isPlayer||Math.hypot(c.x-cam.fx,c.z-cam.fz)<20)cam.shake=Math.max(cam.shake,.55);if(c.view)c.view.jv-=1.4;}}
function trySpecial(c){
  if(!c.alive||c.specCd>0||c.reviving||c.burrowT>0)return false;const sp=SPECIALS[c.special];if(!sp)return false;
  switch(c.special){
    case 'bellyflop':if(!c.grounded)return false;c.vy=12;c.grounded=false;c.flop=true;sfx('jump',c);break;
    case 'shield':c.shield=60;c.shieldT=6;sfx('shield',c);break;
    case 'heal':for(const m of world.creatures)if(m.team===c.team&&m.state==='alive'&&Math.hypot(m.x-c.x,m.z-c.z)<9){const h=Math.min(30,m.maxHp-m.hp);m.hp+=h;if(h>0)floatText(m,'+'+Math.round(h),'heal');emit(m.x,m.y+1,m.z,{n:14,color:'#ff8ad0',speed:3,life:1,size:.15,glow:2.2,up:4,grav:-2});}
      emit(c.x,c.y+.4,c.z,{n:40,color:'#ff8ad0',speed:9,flat:true,life:.7,size:.18,glow:2,grav:0});sfx('heal',c);break;
    case 'ink':world.inks.push({x:c.x,z:c.z,r:5.5,t:5,team:c.team});emit(c.x,c.y+1,c.z,{n:60,color:'#2a1640',speed:7,life:1.4,size:.6,grav:-.5,drag:2});sfx('ink',c);
      for(const e of world.creatures)if(e.team!==c.team&&e.brain&&Math.hypot(e.x-c.x,e.z-c.z)<7){e.brain.target=null;e.brain.t=.6;}if(cam.lock&&cam.lock!==c&&Math.hypot(cam.lock.x-c.x,cam.lock.z-c.z)<6&&c.team!==match.player.team)cam.lock=null;break;
    case 'camo':c.camoT=5;sfx('camo',c);emit(c.x,c.y+1,c.z,{n:20,color:'#55f0ff',speed:4,life:.6,size:.13,glow:2});if(cam.lock===c)cam.lock=null;break;
    case 'burrow':if(!c.grounded)return false;c.burrowT=2.5;c.invulnT=0;sfx('burrow',c);emit(c.x,c.y+.3,c.z,{n:24,color:world.map.biome.lane,speed:6,life:.6,size:.22,up:4});if(cam.lock===c)cam.lock=null;break;
    case 'inflate':c.inflateT=3.5;sfx('inflate',c);break;
  }
  c.specCd=sp.cd;if(c.isPlayer&&match)match.stats.specials=(match.stats.specials||0)+1;return true;
}
function updateNest(n,dt){
  if(!n.alive||!S.nestsSpitGoo)return;n.spitCd-=dt;if(n.spitCd>0)return;
  const range=n.main?18:14;let best=null,bd=range*range;for(const c of world.creatures){if(c.team===n.team||c.state!=='alive'||!canSee(n,c))continue;const d=dist2(c.x,c.z,n.x,n.z);if(d<bd){bd=d;best=c;}}
  if(!best){n.spitCd=.3;return;}n.spitCd=n.main?1.4:1.7;lobGoo(n,best);
}
function updateGeyser(g,dt){
  g.t+=dt;const ph=g.t%g.period;
  if(ph>g.period-1.3&&Math.random()<dt*14)emit(g.x,g.y+.5,g.z,{n:1,color:world.map.biome.geyser,speed:1.5,life:.6,size:.15,glow:1.6,up:3,grav:-2});
  if(ph<dt*1.01&&g.t>1){g.erupting=.9;g.hit.clear();sfx('geyser',g);}
  if(g.erupting>0){g.erupting-=dt;emit(g.x,g.y+.6,g.z,{n:4,color:world.map.biome.geyser,speed:2.5,life:.9,size:.3,glow:1.8,up:16,grav:10,jit:.6});
    for(const c of world.creatures){if(c.state!=='alive'||g.hit.has(c)||c.isDummy||c.burrowT>0)continue;if(Math.hypot(c.x-g.x,c.z-g.z)<2.3+c.radius*.5){g.hit.add(c);c.vy=17;c.grounded=false;if(c.view)c.view.jv+=1.5;
      if(!(c.isPlayer&&DEV.god)){c.hp-=6;c.lastHurt=match.time;floatText(c,'6','');if(c.hp<=0){c.hp=0;downCreature(c,c.lastHitBy);}}
      if(typeof onChallengeEvent==='function')onChallengeEvent('geyser',{c});}}}
  g.view.userData.disc.scale.setScalar(1+(g.erupting>0?.3:0)+Math.sin(g.t*6)*.04);
}
function updateBoulder(b,dt){
  const zM=world.map.zMax+6;b.t+=dt;const ph=b.t%b.period;const travel=2*zM/9;
  if(!b.active&&ph>b.period-2.2&&!b.warn){b.warn=true;sfx('geyser',{x:b.x,z:-b.dir*zM});}
  if(!b.active&&ph<dt*1.01&&b.t>2){b.active=true;b.warn=false;b.z=-b.dir*zM;b.hit.clear();b.view.visible=true;}
  if(b.warn&&Math.random()<dt*12)emit(b.x+(Math.random()-.5)*4,world.map.heightAt(b.x,-b.dir*(zM-6))+.3,-b.dir*(zM-6),{n:1,color:world.map.biome.lane,speed:2,life:.7,size:.25,up:2});
  if(!b.active)return;
  b.z+=b.dir*9*dt;b.y=world.map.heightAt(b.x,b.z);b.view.position.set(b.x,b.y+b.r*.9,b.z);b.view.userData.ball.rotation.x+=b.dir*9*dt/b.r;
  if(Math.random()<dt*10)emit(b.x,b.y+.2,b.z-b.dir*b.r,{n:1,color:world.map.biome.lane,speed:2,life:.5,size:.25,up:1.5});
  if(Math.abs(b.z)>zM+1||(ph>travel+1)){b.active=false;b.view.visible=false;return;}
  for(const c of world.creatures){if(c.state!=='alive'||b.hit.has(c)||c.burrowT>0||c.isDummy)continue;if(Math.hypot(c.x-b.x,c.z-b.z)<b.r+c.radius*.8&&c.y<b.y+b.r*2){b.hit.add(c);const sx=Math.sign(c.x-b.x)||1;
    c.kx+=sx*14;c.kz+=b.dir*8;c.vy=13;c.grounded=false;if(c.view)c.view.jv+=2;sfx('flop',c);emit(c.x,c.y+1,c.z,{n:20,color:'#fff3c0',speed:9,life:.5,size:.18,glow:2});
    if(!(c.isPlayer&&DEV.god)){const dm=c.inflateT>0?7:18;c.hp-=dm;c.lastHurt=match.time;floatText(c,String(dm),'crit');voice(c,'hurt');if(c.hp<=0){c.hp=0;downCreature(c,c.lastHitBy);}}
    if(c.isPlayer)cam.shake=Math.max(cam.shake,.6);}}
}
function updateInks(dt){let w=0;for(const k of world.inks){k.t-=dt;if(k.t<=0)continue;if(Math.random()<dt*20){const a=Math.random()*TAU,r=Math.random()*k.r;emit(k.x+Math.cos(a)*r,world.map.heightAt(k.x,k.z)+.5+Math.random()*2,k.z+Math.sin(a)*r,{n:1,color:'#2a1640',speed:.4,life:1.2,size:.7,grav:-.2,drag:1});}world.inks[w++]=k;}world.inks.length=w;
  let wb=0;for(const b of world.bolts){b.t-=dt;if(b.t<=0){world.group.remove(b.l);b.l.geometry.dispose();continue;}world.bolts[wb++]=b;}world.bolts.length=wb;}
function updateProjectiles(dt){
  const PR=world.projectiles;let w=0;
  for(let i=0;i<PR.length;i++){const p=PR[i];p.life-=dt;p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;let boom=false,hitT=null;
    if(Math.random()<.7)emit(p.x,p.y,p.z,{n:1,color:p.color,speed:.5,life:.3,size:p.r*.6,glow:2,grav:0});
    for(const c of world.creatures){if(c.team===p.team||c.state!=='alive'||c.burrowT>0)continue;if(Math.hypot(c.x-p.x,c.z-p.z)<c.radius+p.r&&p.y>c.y-.3&&p.y<c.y+c.height+.3){boom=true;hitT=c;break;}}
    if(!boom&&p.kind==='spit'){for(const n of world.nests){if(n.team===p.team||!n.alive)continue;if(Math.hypot(n.x-p.x,n.z-p.z)<n.radius+p.r&&p.y<n.y+n.height){boom=true;hitT=n;break;}}
      if(!boom)for(const n of world.neutrals){if(!n.alive)continue;if(Math.hypot(n.x-p.x,n.z-p.z)<n.radius+p.r&&p.y<n.y+n.view.height+.3){boom=true;hitT=n;break;}}}
    if(!boom&&(p.y<world.map.heightAt(p.x,p.z)||p.life<=0))boom=true;
    if(boom){
      if(p.splash>0){for(const c of world.creatures){if(c.team===p.team||c.state!=='alive'||c.burrowT>0)continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<p.splash+c.radius){const n=d||1;hurt(c,p.dmg,p.type,p.src,(c.x-p.x)/n,(c.z-p.z)/n,p.kb,false);}}}
      else if(hitT)hurt(hitT,p.dmg,p.type,p.src,p.vx/27,p.vz/27,p.kb,p.venom);
      emit(p.x,p.y,p.z,{n:p.splash?18:10,color:p.color,speed:p.splash?7:5,life:.5,size:.16,glow:2});sfx('splat',p);
      world.group.remove(p.mesh);continue;}
    p.mesh.position.set(p.x,p.y,p.z);PR[w++]=p;}
  PR.length=w;
}
function updateNeutral(n,dt){
  const map=world.map;
  if(!n.alive){if(n.noRespawn)return;n.deadT=(n.deadT||0)+dt;n.respawnT-=dt;if(n.respawnT<=0){n.alive=true;n.state='alive';n.hp=n.maxHp;n.x=n.hx;n.z=n.hz;n.y=map.heightAt(n.x,n.z)+4;n.vy=0;n.deadT=0;emit(n.x,n.y,n.z,{n:16,color:n.d.color,speed:4,life:.8,size:.15,glow:2});}return;}
  n.flee-=dt;let mx=0,mz=0,spd=n.type==='boss'?2.6:3.2;
  let near=null,nd=1e9;for(const c of world.creatures){if(c.state!=='alive'||c.isDummy||c.burrowT>0||c.camoT>0)continue;const d=Math.hypot(c.x-n.x,c.z-n.z);if(d<nd){nd=d;near=c;}}
  if(n.type==='boss'){
    n.slamCd-=dt;const home=Math.hypot(n.x-n.hx,n.z-n.hz);
    if(n.slamT>0){n.slamT-=dt;if(n.slamT<=0){emit(n.x,n.y+.3,n.z,{n:50,color:'#c08aff',speed:15,flat:true,life:.7,size:.3,glow:1.8,grav:0});sfx('flop',n);if(Math.hypot(n.x-cam.fx,n.z-cam.fz)<25)cam.shake=Math.max(cam.shake,.6);
        for(const c of world.creatures){if(c.state!=='alive'||c.burrowT>0)continue;const d=Math.hypot(c.x-n.x,c.z-n.z);if(d<6.5+c.radius){const k=d||1;if(!(c.isPlayer&&DEV.god)){const dm=c.inflateT>0?9:22;c.hp-=dm;c.lastHurt=match.time;floatText(c,String(dm),'');}c.kx+=(c.x-n.x)/k*14/Math.max(.6,c.st.stability/5);c.kz+=(c.z-n.z)/k*14/Math.max(.6,c.st.stability/5);c.vy=6;c.grounded=false;if(c.hp<=0){c.hp=0;downCreature(c,c.lastHitBy);}}}}}
    else if(near&&nd<12&&home<12){const d=nd;if(d>4){mx=(near.x-n.x)/d;mz=(near.z-n.z)/d;}if(d<6&&n.slamCd<=0){n.slamT=.85;n.slamCd=3.6;}n.yaw+=angDiff(n.yaw,Math.atan2(near.x-n.x,near.z-n.z))*Math.min(1,dt*4);}
    else if(home>1){mx=(n.hx-n.x)/home;mz=(n.hz-n.z)/home;}
  } else {
    if(near&&(nd<7||n.flee>0)){const d=nd||1;mx=(n.x-near.x)/d;mz=(n.z-near.z)/d;spd=5;}
    else{n.wanderT-=dt;if(n.wanderT<=0){n.wanderT=2+Math.random()*3;const a=Math.random()*TAU,r=Math.random()*6;n.tx=n.hx+Math.cos(a)*r;n.tz=n.hz+Math.sin(a)*r;}const d=Math.hypot(n.tx-n.x,n.tz-n.z);if(d>.5){mx=(n.tx-n.x)/d;mz=(n.tz-n.z)/d;spd=1.8;}}
    const home=Math.hypot(n.x-n.hx,n.z-n.hz);if(home>11){mx=(n.hx-n.x)/home;mz=(n.hz-n.z)/home;}
  }
  const f=1-Math.exp(-8*dt);n.vx+=(mx*spd-n.vx)*f;n.vz+=(mz*spd-n.vz)*f;n.kx*=Math.exp(-5*dt);n.kz*=Math.exp(-5*dt);
  n.x+=(n.vx+n.kx)*dt;n.z+=(n.vz+n.kz)*dt;n.vy-=30*dt;n.y+=n.vy*dt;const gh=map.heightAt(n.x,n.z);if(n.y<gh){n.y=gh;n.vy=0;}
  if(n.type!=='boss'&&Math.hypot(mx,mz)>.1)n.yaw+=angDiff(n.yaw,Math.atan2(mx,mz))*Math.min(1,dt*8);
  if(n.type!=='boss'&&Math.random()<dt*.3&&n.vy===0)n.vy=6;
}
function updateRules(dt){
  const W=world;
  for(const c of W.creatures){if(c.state!=='downed')continue;c.downedT-=dt;let rv=null;
    for(const m of W.creatures){if(m.team!==c.team||m.state!=='alive'||!m.reviving)continue;if(Math.hypot(m.x-c.x,m.z-c.z)<c.radius+m.radius+1.6){rv=m;break;}}
    if(rv){c.reviveP+=dt;if(Math.random()<dt*10)emit(c.x,c.y+1,c.z,{n:1,color:'#62ff9a',speed:1,life:.6,size:.12,glow:2,up:3,grav:-2});if(c.reviveP>=S.reviveSec){revive(c,rv);if(rv.isPlayer&&typeof onChallengeEvent==='function')onChallengeEvent('revive',{c});continue;}}
    else c.reviveP=Math.max(0,c.reviveP-dt*.5);
    if(c.downedT<=0)killCreature(c,c.downedBy);}
  const alive={blue:0,red:0};for(const c of W.creatures)if(c.state==='alive'&&!c.isDummy)alive[c.team]++;
  for(const c of W.creatures){if(c.state!=='alive'||c.isDummy)continue;let heal=0;
    if(alive[c.team]<alive[other(c.team)]&&W.nests.some(n=>n.team===c.team&&n.alive&&Math.hypot(n.x-c.x,n.z-c.z)<12+n.radius)){heal+=S.catchUpHeal;if(Math.random()<dt*4)emit(c.x,c.y+.5,c.z,{n:1,color:'#62ff9a',speed:.5,life:.8,size:.12,glow:2,up:2.5,grav:-1});}
    if(match.time-c.lastHurt>6&&!(match.rules.noRegen&&c.isPlayer))heal+=S.outOfCombatRegen;
    c.hp=Math.min(c.maxHp,c.hp+heal*dt);}
  if(match.mode==='battle'&&S.timerIsHardLimit&&match.time>=S.battleSec){const w=tiebreak();endMatch(w.team,'Time ran out. '+w.why);}
}
function resolveCollisions(){
  const W=world;const movers=[];for(const c of W.creatures)if(c.state!=='dead'&&c.burrowT<=0)movers.push(c);for(const n of W.neutrals)if(n.alive)movers.push(n);
  for(let i=0;i<movers.length;i++)for(let j=i+1;j<movers.length;j++){const a=movers[i],b=movers[j];const dx=b.x-a.x,dz=b.z-a.z;const d=Math.hypot(dx,dz);const min=a.radius+b.radius;if(d<min&&d>1e-4){
    const wa=a.isDummy||a.type==='boss'?.02:b.isDummy||b.type==='boss'?.98:.5;const push=min-d;const nx=dx/d,nz=dz/d;a.x-=nx*push*wa;a.z-=nz*push*wa;b.x+=nx*push*(1-wa);b.z+=nz*push*(1-wa);}}
  for(const m of W.creatures.concat(W.neutrals)){if(m.state==='dead'&&m.kind==='creature')continue;for(const o of W.colliders){const dx=m.x-o.x,dz=m.z-o.z;const d=Math.hypot(dx,dz);const min=m.radius+o.r;if(d<min&&d>1e-4){m.x=o.x+dx/d*min;m.z=o.z+dz/d*min;}}
    m.x=clamp(m.x,-W.map.xMax,W.map.xMax);m.z=clamp(m.z,-W.map.zMax,W.map.zMax);}
}

/* ---------- BotBrain ---------- */
function nearestOwnNest(c){let best=null,bd=1e9;for(const n of world.nests){if(n.team!==c.team||!n.alive)continue;const d=dist2(n.x,n.z,c.x,c.z);if(d<bd){bd=d;best=n;}}return best;}
function lanePoint(c){
  const lane=world.map.lanes[(c.lane|0)+1];const pts=lane.pts;const b=c.brain;
  let lo=0,hi=pts.length-1;if(b.laneI>=0){lo=Math.max(0,b.laneI-12);hi=Math.min(pts.length-1,b.laneI+12);}
  let bi=lo,bd=1e9;for(let i=lo;i<=hi;i++){const d=dist2(pts[i].x,pts[i].z,c.x,c.z);if(d<bd){bd=d;bi=i;}}
  if(bd>400){bi=0;bd=1e9;for(let i=0;i<pts.length;i++){const d=dist2(pts[i].x,pts[i].z,c.x,c.z);if(d<bd){bd=d;bi=i;}}}
  b.laneI=bi;const dir=c.team==='blue'?1:-1;const t=pts[clamp(bi+dir*6,0,pts.length-1)];
  return {x:t.x,z:t.z+Math.sin(b.jit)*1.6};
}
function steerTo(c,gx,gz,f){
  let dx=gx-c.x,dz=gz-c.z;const d=Math.hypot(dx,dz);if(d<.6){c.setMove(0,0);return;}dx/=d;dz/=d;let ax=0,az=0;
  for(const o of world.colliders){const ox=o.x-c.x,oz=o.z-c.z;const od=Math.hypot(ox,oz);const rr=o.r+c.radius+2.4;if(od>rr||od<.01)continue;const ahead=(ox*dx+oz*dz)/od;if(ahead<.15)continue;
    const sgn=(ox*dz-oz*dx)>0?1:-1;const w=(1-od/rr)*ahead*2.2;ax-=dz*w*sgn;az+=dx*w*sgn;}
  for(const m of world.creatures){if(m===c||m.team!==c.team||m.state==='dead')continue;const ox=m.x-c.x,oz=m.z-c.z;const od=Math.hypot(ox,oz);if(od<3&&od>.01){ax-=ox/od*.35;az-=oz/od*.35;}}
  for(const g of world.geysers){const ph=g.t%g.period;if(!(g.erupting>0||ph>g.period-1.5))continue;const ox=g.x-c.x,oz=g.z-c.z;const od=Math.hypot(ox,oz);if(od<3.6&&od>.01){ax-=ox/od*2.2;az-=oz/od*2.2;}}
  for(const b of world.boulders){if(!b.active)continue;const ahead=(c.z-b.z)*b.dir;if(ahead<-3||ahead>16||Math.abs(c.x-b.x)>b.r+c.radius+2.5)continue;const sx=Math.sign(c.x-b.x)||1;ax+=sx*2.6;}
  let mx=dx+ax,mz=dz+az;const l=Math.hypot(mx,mz)||1;c.setMove(mx/l*(f==null?1:f),mz/l*(f==null?1:f));
}
function botUpdate(c,dt){
  const b=c.brain;if(c.state!=='alive'){c.setMove(0,0);c.reviving=false;return;}
  c.glideHeld=true;b.t-=dt;b.atkT-=dt;if(b.t<=0){b.t=.18+Math.random()*.16;botDecide(c);}
  botAct(c,dt);
}
function botDecide(c){
  const b=c.brain;b.target=null;const blind=!!inkAt(c.x,c.z,c.team);
  let dm=null,dd=22*22;for(const m of world.creatures){if(m.team!==c.team||m.state!=='downed')continue;const d=dist2(m.x,m.z,c.x,c.z);if(d<dd){dd=d;dm=m;}}
  let foe=null,fd=1e9,fs=1e9;const allyTargets=new Set();for(const m of world.creatures)if(m!==c&&m.team===c.team&&m.brain&&m.brain.mode==='fight'&&m.brain.target)allyTargets.add(m.brain.target);
  for(const e of world.creatures){if(e.team===c.team||e.isDummy&&!b.hitDummies)continue;if(!(e.state==='alive'||(e.state==='downed'&&S.downedCanBeFinishedOff&&!b.noFinish)))continue;if(!canSee(c,e))continue;const d=Math.hypot(e.x-c.x,e.z-c.z);const range=e.state==='downed'?9:(blind?3:allyTargets.has(e)?22:16);if(d>=range)continue;
    const sc=d-(1-e.hp/e.maxHp)*7-(allyTargets.has(e)?5:0)-(e.state==='downed'?4:0);if(sc<fs){fs=sc;fd=d;foe=e;}}
  if(dm&&!(foe&&fd<3.5)){b.mode='revive';b.target=dm;return;}
  const hpF=c.hp/c.maxHp;const onlyNest=!foe&&b.mode==='siege';if(b.retreat){if(hpF>.7)b.retreat=false;}else if(hpF<(onlyNest?.16:.28)&&!b.brave)b.retreat=true;
  if(b.retreat){if(foe&&fd<3.5){b.mode='fight';b.target=foe;return;}
    if(c.special==='burrow'||c.special==='camo'||c.special==='ink')trySpecial(c);
    let cr=null,cd=18;for(const n of world.neutrals){if(!n.alive||n.type==='boss')continue;const d=Math.hypot(n.x-c.x,n.z-c.z);if(d<cd){cd=d;cr=n;}}
    if(cr){b.mode='hunt';b.target=cr;return;}b.mode='retreat';b.foe=foe;return;}
  if(foe){b.mode='fight';b.target=foe;return;}
  if(b.fixedTarget){b.mode='hunt';b.target=b.fixedTarget;return;}
  let nest=null,nd=1e9;for(const n of world.nests){if(n.team===c.team||!nestAttackable(n))continue;const d=Math.hypot(n.x-c.x,n.z-c.z);if(d<24&&d<nd){nd=d;nest=n;}}
  if(nest){let en=0,al=1;for(const e of world.creatures){if(e.state!=='alive'||e.isDummy)continue;if(e.team!==c.team&&Math.hypot(e.x-nest.x,e.z-nest.z)<18)en++;else if(e!==c&&e.team===c.team&&Math.hypot(e.x-c.x,e.z-c.z)<14)al++;}
    if(en>al&&!b.brave&&nest.hp>nest.maxHp*.25){b.mode='hold';b.target=null;return;}b.mode='siege';b.target=nest;return;}
  b.mode=b.idle?'idle':'lane';
}
function botAct(c,dt){
  const b=c.brain;c.reviving=false;const t=b.target;
  if(b.mode==='idle'){c.setMove(0,0);return;}
  if(b.mode==='hold'){const pts=world.map.lanes[(c.lane|0)+1].pts;lanePoint(c);const back=c.team==='blue'?-1:1;const q=pts[clamp(b.laneI+back*10,0,pts.length-1)];steerTo(c,q.x,q.z,.8);return;}
  if(b.mode==='revive'&&t){if(t.state!=='downed'){b.t=0;return;}const d=Math.hypot(t.x-c.x,t.z-c.z);if(d<c.radius+t.radius+1.2){c.setMove(0,0);c.reviving=true;return;}steerTo(c,t.x,t.z,1);return;}
  if((b.mode==='fight'||b.mode==='hunt'||b.mode==='siege')&&t){const gone=t.kind==='creature'?t.state==='dead':!t.alive;if(gone){b.t=0;c.setMove(0,0);return;}botFight(c,t,dt);return;}
  if(b.mode==='retreat'){
    const danger=(b.foe&&b.foe.state==='alive'&&Math.hypot(b.foe.x-c.x,b.foe.z-c.z)<12)||world.nests.some(n=>n.team!==c.team&&n.alive&&Math.hypot(n.x-c.x,n.z-c.z)<(n.main?18:14)+4);
    if(danger){const pts=world.map.lanes[(c.lane|0)+1].pts;lanePoint(c);const back=c.team==='blue'?-1:1;const q=pts[clamp(b.laneI+back*8,0,pts.length-1)];steerTo(c,q.x,q.z,1);}else c.setMove(0,0);return;}
  const p=lanePoint(c);steerTo(c,p.x,p.z,1);
  if(Math.random()<dt*.05)c.jump();
}
function botFight(c,t,dt){
  const b=c.brain;const dx=t.x-c.x,dz=t.z-c.z,d=Math.hypot(dx,dz)||.001;const yawTo=Math.atan2(dx,dz);
  const reachBase=c.radius+t.radius*.6;const ri=c.attacks.findIndex(a=>a.id==='spit');const zi=c.attacks.findIndex(a=>a.id==='zap');
  let want=ri>=0?(t.kind==='nest'?t.radius+7:10):zi>=0?7:reachBase+1.1;
  if(t.kind==='creature'&&t.state==='downed')want=reachBase+1;
  if(d>want+.8)steerTo(c,t.x,t.z,1);
  else if(ri>=0&&d<want-3)c.setMove(-dx/d,-dz/d);
  else{const s=Math.sin(match.time*1.3+b.jit);c.setMove(-dz/d*.5*s,dx/d*.5*s);}
  c.aimYaw=yawTo;c.faceT=.3;c.spitTarget=t;
  const facing=Math.abs(angDiff(c.yaw,yawTo))<.5;
  if(b.atkT<=0&&!(b.passive)){
    for(let i=0;i<c.attacks.length;i++){const a=c.attacks[i];if(c.cds[i]>0||c.stamina<a.st)continue;let go=false;
      if(a.id==='spit')go=d<22;else if(a.id==='zap')go=facing&&d<a.range+t.radius;
      else if(a.id==='charge')go=facing&&d>3.5&&d<11&&t.kind!=='nest'&&Math.random()<.25;
      else if(a.id==='spin')go=d<a.range+c.radius+t.radius*.6;
      else go=facing&&d<a.range+reachBase;
      if(go){tryAttack(c,i,null);b.atkT=(.18+Math.random()*.3)*(b.slow||1);break;}}}
  if(c.specCd<=0&&!b.passive){const hpF=c.hp/c.maxHp;
    switch(c.special){
      case 'heal':if(hpF<.6||world.creatures.some(m=>m.team===c.team&&m.state==='alive'&&m.hp/m.maxHp<.5&&Math.hypot(m.x-c.x,m.z-c.z)<9))trySpecial(c);break;
      case 'shield':case 'inflate':if(hpF<.65&&t.kind==='creature'&&d<9)trySpecial(c);break;
      case 'bellyflop':if(d<4&&t.kind!=='neutral'&&Math.random()<.04)trySpecial(c);break;
      case 'ink':if(t.kind==='creature'&&d<5&&hpF<.7)trySpecial(c);break;
      case 'camo':if(t.kind==='creature'&&d>6&&d<14&&Math.random()<.02)trySpecial(c);break;
      case 'burrow':if(t.kind==='creature'&&d>5&&d<12&&Math.random()<.03)trySpecial(c);break;}}
  if(t.kind==='creature'&&t.state==='alive'&&d<4.5&&(t.biteT>0||t.slashT>0||t.dashT>0)&&Math.random()<.035)c.dodge();
}

/* ---------- player input ---------- */
const keys={};let pointerLocked=false,noLock=false,dragging=false,lastMX=0,lastMY=0,wantLock=false;
const isCoarse=matchMedia('(pointer: coarse)').matches;if(isCoarse)document.body.classList.add('coarse');
const touch={mx:0,mz:0,revive:false,jumpHeld:false};
function requestLock(){if(noLock||isCoarse)return;wantLock=true;try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{noLock=true;});}catch(e){noLock=true;}}
function exitLock(){wantLock=false;if(document.pointerLockElement)try{document.exitPointerLock();}catch(e){}}
document.addEventListener('pointerlockchange',()=>{const was=pointerLocked;pointerLocked=document.pointerLockElement===canvas;if(was&&!pointerLocked&&wantLock&&phase==='battle'&&match&&!match.over&&!match.eliminated&&!DEV.open)openPause();});
document.addEventListener('pointerlockerror',()=>{noLock=true;});
function playerAlive(){return phase==='battle'&&match&&match.player&&match.player.state==='alive'&&!match.over&&match.countdown<=0;}
function aimYaw(){const p=match.player;if(cam.lock)return Math.atan2(cam.lock.x-p.x,cam.lock.z-p.z);return cam.yaw;}
function assistTarget(p){let best=null,bs=1e9;const fy=cam.yaw;for(const t of targetsFor(p)){if(t.kind==='creature'&&(t.state!=='alive'||!canSee(p,t)))continue;const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz);if(d>10+t.radius)continue;const rel=Math.abs(angDiff(fy,Math.atan2(dx,dz)));if(rel>1.2)continue;const sc=d+rel*4-(t.kind==='creature'?3:0);if(sc<bs){bs=sc;best=t;}}return best;}
function playerAttack(i){if(!playerAlive()||paused||DEV.open)return;const p=match.player;let tg=cam.lock,yaw=aimYaw();if(!tg&&A11Y.aimAssist){tg=assistTarget(p);if(tg)yaw=Math.atan2(tg.x-p.x,tg.z-p.z);}p.spitTarget=tg;tryAttack(p,i,yaw);}
function playerSpecial(){if(!playerAlive()||paused||DEV.open)return;const p=match.player;p.aimYaw=aimYaw();p.faceT=.3;trySpecial(p);}
function toggleLock(){if(!playerAlive())return;if(cam.lock){cam.lock=null;return;}const p=match.player;let best=null,bs=-1e9;
  for(const e of world.creatures){if(e.team===p.team||e.state!=='alive'||!canSee(p,e))continue;const dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz);if(d>p.st.detect+8)continue;const fwd=(dx*Math.sin(cam.yaw)+dz*Math.cos(cam.yaw))/(d||1);const sc=fwd*2-d/16;if(sc>bs){bs=sc;best=e;}}cam.lock=best;if(best)sfx('ui');}
addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.shiftKey&&(e.code==='KeyC'||e.key==='C'||e.key==='c')){e.preventDefault();toggleDev();return;}
  if(e.code==='Backquote'){e.preventDefault();toggleDev();return;}
  if(DEV.open){if(e.code==='Escape')toggleDev(false);return;}
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
  if(phase==='workshop'){wsKey(e);return;}
  const K=A11Y.keys;
  if(e.code===K.lock){e.preventDefault();if(!e.repeat)toggleLock();return;}
  if(e.code==='Space'||e.code==='Tab'||e.code.startsWith('Arrow'))e.preventDefault();
  keys[e.code]=true;if(e.repeat)return;
  if(phase!=='battle'||!match)return;
  if(e.code===K.pause||(e.code==='Escape'&&!pointerLocked)){if(paused)closePause();else if(!match.over&&(!match.eliminated||match.mode!=='battle'))openPause();return;}
  if(paused)return;
  if(!playerAlive())return;const p=match.player;
  if(e.code===K.jump){if(A11Y.toggleGlide&&!p.grounded&&p.st.glide)p.glideToggle=!p.glideToggle;else p.jump();}
  else if(e.code===K.dodge||(K.dodge==='ShiftLeft'&&e.code==='ShiftRight'))p.dodge();
  else if(e.code===K.atk1)playerAttack(0);else if(e.code===K.atk2)playerAttack(1);else if(e.code===K.atk3)playerAttack(2);else if(e.code===K.atk4)playerAttack(3);
  else if(e.code===K.special)playerSpecial();
  else if(e.code===K.revive&&A11Y.toggleRevive){p.revToggle=!p.revToggle;announce(p.revToggle?'Reviving':'Stopped reviving');}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{
  AudioFX.init();canvas.focus();
  if(phase!=='battle'||!match||paused)return;
  if(match.eliminated&&!match.over&&match.mode==='battle'){cycleSpect(1);return;}
  if(!pointerLocked&&!noLock&&!isCoarse){requestLock();return;}
  dragging=true;lastMX=e.clientX;lastMY=e.clientY;
  if(e.button===0)playerAttack(0);else if(e.button===2)playerAttack(1);
});
addEventListener('mouseup',()=>{dragging=false;});
addEventListener('mousemove',e=>{
  if(phase!=='battle')return;
  const sv=A11Y.sens,iy=A11Y.invertY?-1:1;
  if(pointerLocked){cam.yaw-=e.movementX*.0026*sv;cam.pitch=clamp(cam.pitch+e.movementY*.002*sv*iy,.05,.95);}
  else if(noLock&&dragging){cam.yaw-=(e.clientX-lastMX)*.005*sv;cam.pitch=clamp(cam.pitch+(e.clientY-lastMY)*.004*sv*iy,.05,.95);lastMX=e.clientX;lastMY=e.clientY;}
});
canvas.addEventListener('wheel',e=>{if(phase==='battle')cam.dist=clamp(cam.dist+e.deltaY*.01,6,22);},{passive:true});
function playerControl(dt){
  const p=match.player;if(paused||DEV.open){p.setMove(0,0);p.reviving=false;return;}
  if(p.state!=='alive'){p.setMove(0,0);return;}
  const K=A11Y.keys;let f=0,r=0;if(keys[K.forward])f+=1;if(keys[K.back])f-=1;if(keys[K.right])r+=1;if(keys[K.left])r-=1;if(keys.ArrowUp)f+=1;if(keys.ArrowDown)f-=1;
  f+=touch.mz;r+=touch.mx;
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
  p.setMove(fx*f+rx*r,fz*f+rz*r);
  if(p.grounded)p.glideToggle=false;
  if(p.revToggle&&!world.creatures.some(m=>m.team===p.team&&m.state==='downed'&&Math.hypot(m.x-p.x,m.z-p.z)<m.radius+p.radius+3))p.revToggle=false;
  p.reviving=(A11Y.toggleRevive?!!p.revToggle:!!keys[K.revive])||touch.revive;p.glideHeld=(A11Y.toggleGlide?!!p.glideToggle:!!keys[K.jump])||touch.jumpHeld;
  if(!cam.lock&&A11Y.autoLock){p._al=(p._al||0)-dt;if(p._al<=0){p._al=.4;let best=null,bd=14;for(const e of world.creatures){if(e.team===p.team||e.state!=='alive'||e.isDummy&&match.mode!=='test'||!canSee(p,e))continue;const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<bd){bd=d;best=e;}}if(best){cam.lock=best;announce('Locked on to '+best.name);}}}
  if(cam.lock){if((cam.lock.state!=='alive'&&!(cam.lock.state==='downed'&&S.downedCanBeFinishedOff))||!canSee(p,cam.lock))cam.lock=null;else if(Math.hypot(cam.lock.x-p.x,cam.lock.z-p.z)>40)cam.lock=null;else{p.aimYaw=aimYaw();p.faceT=Math.max(p.faceT,.1);}}
}
const joy=$('#joy'),knob=$('#knob');let joyId=null,lookId=null,lookX=0,lookY=0;
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);AudioFX.init();});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;touch.mx=touch.mz=0;knob.style.transform='';};
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
function joyMove(e){const r=joy.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}touch.mx=dx;touch.mz=-dy;knob.style.transform='translate('+dx*34+'px,'+dy*34+'px)';}
const look=$('#look');
look.addEventListener('pointerdown',e=>{lookId=e.pointerId;look.setPointerCapture(e.pointerId);lookX=e.clientX;lookY=e.clientY;AudioFX.init();if(match&&match.eliminated&&!match.over)cycleSpect(1);});
look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;cam.yaw-=(e.clientX-lookX)*.007;cam.pitch=clamp(cam.pitch+(e.clientY-lookY)*.005,.05,.95);lookX=e.clientX;lookY=e.clientY;});
look.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null;});look.addEventListener('pointercancel',e=>{if(e.pointerId===lookId)lookId=null;});
for(const btn of $$('#tbtns .tb')){const act=btn.dataset.act;
  btn.addEventListener('pointerdown',e=>{e.preventDefault();AudioFX.init();if(act==='jump')touch.jumpHeld=true;if(!playerAlive())return;const p=match.player;
    if(act==='jump')p.jump();else if(act==='dodge')p.dodge();else if(act==='spec')playerSpecial();else if(act==='lock')toggleLock();else if(act==='revive')touch.revive=true;else if(act.startsWith('atk'))playerAttack(+act.slice(3));});
  const up=()=>{if(act==='revive')touch.revive=false;if(act==='jump')touch.jumpHeld=false;};btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);}
function hideTouch(){$('#touch').hidden=true;touch.mx=touch.mz=0;touch.revive=false;touch.jumpHeld=false;}

/* ---------- camera ---------- */
function spectList(){const me=match.player;let l=world.creatures.filter(c=>c.team===me.team&&c.state!=='dead'&&c!==me);if(!l.length)l=world.creatures.filter(c=>c.state!=='dead');return l;}
function cycleSpect(dir){const l=spectList();if(!l.length)return;let i=l.indexOf(cam.spect);i=(i+dir+l.length)%l.length;cam.spect=l[i];$('#spectName').textContent=cam.spect.name;}
function updateCamera(rdt){
  const map=world.map;let tgt=null;
  if(phase==='menu'&&menuStage.active&&!$('#menu').hidden){updateMenuStage(rdt,performance.now());return;}
  if(phase!=='battle'||!match){const t=performance.now()*.00005;cam.fx=Math.cos(t)*20;cam.fz=Math.sin(t)*10;const r=78;camera.position.set(Math.cos(t*1.6)*r,48,Math.sin(t*1.6)*r*.55+8);camera.lookAt(0,0,0);sunFollow(0,0,0);return;}
  if(cam.cine&&$('#death').hidden&&!match.resultsShown){cam.cine.t+=rdt;const p=cam.cine.target;const a=cam.yaw+Math.PI+cam.cine.t*.6;const d=7.5;
    const fx=p.x,fy=p.y+1.2,fz=p.z;camera.position.set(fx+Math.sin(a)*d,fy+3.2,fz+Math.cos(a)*d);camera.lookAt(fx,fy,fz);cam.fx=fx;cam.fz=fz;sunFollow(fx,fy,fz);return;}
  if(match.player.state!=='dead')tgt=match.player;
  else{if(!cam.spect||cam.spect.state==='dead'){const l=spectList();cam.spect=l[0]||match.player;$('#spectName').textContent=cam.spect.name;}tgt=cam.spect;}
  if(match.over){const n=world.nests.filter(n=>!n.alive).sort((a,b)=>(b.main?1:0)-(a.main?1:0))[0];if(n&&match.endT<2.2&&tgt.state==='dead')tgt=n;}
  if(keys.ArrowLeft)cam.yaw+=1.9*rdt;if(keys.ArrowRight)cam.yaw-=1.9*rdt;
  if(cam.lock&&tgt===match.player){const want=Math.atan2(cam.lock.x-tgt.x,cam.lock.z-tgt.z);cam.yaw+=angDiff(cam.yaw,want)*(1-Math.exp(-6*rdt));}
  const th=(tgt.height||3);const k=1-Math.exp(-10*rdt);
  cam.fx=lerp(cam.fx,tgt.x,k);cam.fy=lerp(cam.fy,(tgt.y||0)+th*.8,k);cam.fz=lerp(cam.fz,tgt.z,k);
  const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);const dist=cam.dist*(tgt.kind==='nest'?1.8:1)*(match.player.view?Math.max(1,match.player.view.height/3.2):1);
  let x=cam.fx-Math.sin(cam.yaw)*cp*dist,y=cam.fy+sp*dist+.6,z=cam.fz-Math.cos(cam.yaw)*cp*dist;
  const gh=map.heightAt(x,z)+1.2;if(y<gh)y=gh;
  cam.shake=Math.max(0,cam.shake-rdt*1.6);const sh=A11Y.reduceMotion?0:cam.shake*cam.shake;
  camera.position.set(x+(Math.random()-.5)*sh,y+(Math.random()-.5)*sh,z+(Math.random()-.5)*sh);
  camera.lookAt(cam.fx+Math.sin(cam.yaw)*2,cam.fy+.4,cam.fz+Math.cos(cam.yaw)*2);
  sunFollow(cam.fx,cam.fy,cam.fz);
}
function sunFollow(x,y,z){sun.position.set(x+SUN_DIR.x*90,y+SUN_DIR.y*90,z+SUN_DIR.z*90);sun.target.position.set(x,y,z);sun.target.updateMatrixWorld();}
function animateNest(n,dt,time){const v=n.view;v.hitT=Math.max(0,v.hitT-dt);v.pulse=Math.max(0,v.pulse-dt);
  v.group.rotation.z=Math.sin(time*60)*.03*v.hitT*4;
  if(v.dead){v.deadT+=dt;for(const e of v.eggs)e.scale.multiplyScalar(Math.exp(-dt*3));v.bowl.rotation.x=lerp(v.bowl.rotation.x,.25,dt*2);v.bowl.position.y=lerp(v.bowl.position.y,-.3,dt*2);v.ringMat.color.setRGB(.06,.06,.08);if(v.crystal){v.crystal.position.y=lerp(v.crystal.position.y,.8,dt*2);v.crystal.material.emissiveIntensity=lerp(v.crystal.material.emissiveIntensity,0,dt*2);}if(n.halo)n.halo.visible=false;if(v.deadT<4&&Math.random()<dt*6)emit(n.x,n.y+1.5,n.z,{n:1,color:'#6a6070',speed:1,life:1.6,size:.4,up:3,grav:-1,drag:.5});return;}
  const pulse=1+Math.sin(time*2+n.x)*.03+v.pulse*.25;for(const e of v.eggs)e.scale.set(.55*pulse,.75*pulse,.55*pulse);
  v.eggMat.emissiveIntensity=.6+Math.sin(time*2.5+n.x)*.2+v.pulse*2;
  if(v.crystal){v.crystal.rotation.y+=dt*.8;v.crystal.position.y=3.6+Math.sin(time*1.5)*.2;}if(n.halo)n.halo.rotation.z+=dt*.6;}

/* ---------- HUD ---------- */
const H={timer:$('#timer'),dna:$('#dnaVal'),lv:$('#lvVal'),xp:$('#xpFill'),hp:$('#hpFill'),sh:$('#shFill'),hpt:$('#hpText'),st:$('#stFill'),muts:$('#muts'),name:$('#meName'),role:$('#meRole'),
  dB:$('#deathsBlue'),dR:$('#deathsRed'),prompt:$('#prompt'),ret:$('#reticle'),down:$('#downedOverlay'),downT:$('#downedT'),flash:$('#hurtFlash'),count:$('#countdown'),abil:$('#abilities'),obj:$('#objective')};
let abSlots=[];const cache={};
function setText(el,key,val){if(cache[key]!==val){cache[key]=val;el.textContent=val;}}
function buildAbilityBar(){H.abil.innerHTML='';abSlots=[];const p=match.player;const keysLbl=['LMB','RMB','3','4'];
  p.attacks.forEach((a,i)=>{const d=document.createElement('div');d.className='ab';d.innerHTML='<div class="cd"></div><div class="cdn"></div><span class="an">'+esc(a.name)+'</span><kbd>'+(isCoarse?'Atk '+(i+1):(i<2?keysLbl[i]+' / ':'')+keyName(A11Y.keys['atk'+(i+1)]))+'</kbd>';H.abil.appendChild(d);abSlots.push({el:d,cd:d.querySelector('.cd'),n:d.querySelector('.cdn'),get:()=>[p.cds[i],a.cd]});});
  const sp=SPECIALS[p.special];if(sp){const d=document.createElement('div');d.className='ab special';d.innerHTML='<div class="cd"></div><div class="cdn"></div><span class="an">'+esc(sp.name)+'</span><kbd>'+(isCoarse?'Special':keyName(A11Y.keys.special))+'</kbd>';H.abil.appendChild(d);abSlots.push({el:d,cd:d.querySelector('.cd'),n:d.querySelector('.cdn'),get:()=>[p.specCd,sp.cd]});}
  for(const k in cache)delete cache[k];
  setText(H.name,'nm',p.d.name);setText(H.role,'role',p.st.role);
  $$('#tbtns .tb').forEach(b=>{const a=b.dataset.act;if(a.startsWith('atk')){const at=p.attacks[+a.slice(3)];b.hidden=!at;if(at)b.textContent=at.name.split(' ').pop();}else if(a==='spec'){b.hidden=!sp;if(sp)b.textContent=sp.name.split(' ').pop();}});}
function updateHUD(dt){
  setText(H.dna,'dna',String(progress.dna));setText(H.lv,'lv',String(progress.level));const xpf=(progress.xp/xpNeeded(progress.level)*100).toFixed(1)+'%';if(cache.xpf!==xpf){cache.xpf=xpf;H.xp.style.width=xpf;}
  if(phase!=='battle'||!match)return;
  if(match.mode==='battle'){const left=S.battleSec-match.time;setText(H.timer,'tm',fmtTime(left));H.timer.classList.toggle('low',left<60);}
  else if(match.mode==='challenge'&&match.challenge&&match.challenge.time){const left=match.challenge.time-match.time;setText(H.timer,'tm',fmtTime(left));H.timer.classList.toggle('low',left<20);}
  else setText(H.timer,'tm','∞');
  setText(H.dB,'db',match.deaths.blue+' fossils');setText(H.dR,'dr',match.deaths.red+' fossils');
  const p=match.player;
  const hpP=(p.hp/p.maxHp*100).toFixed(1)+'%';if(cache.hp!==hpP){cache.hp=hpP;H.hp.style.width=hpP;}
  const shP=(Math.min(1,p.shield/p.maxHp)*100).toFixed(1)+'%';if(cache.sh!==shP){cache.sh=shP;H.sh.style.width=shP;}
  setText(H.hpt,'hpt',Math.ceil(p.hp)+' / '+p.maxHp+(p.shield>0?'  +'+Math.ceil(p.shield):''));
  const stP=p.stamina.toFixed(0)+'%';if(cache.st!==stP){cache.st=stP;H.st.style.width=stP;}
  const st=[];for(const k in p.muts)st.push('<span class="chip">'+esc(k)+(p.muts[k]===Infinity?'':' · '+Math.ceil(p.muts[k])+'s')+'</span>');
  if(p.blessT>0)st.push('<span class="chip bless">Boss Blessing · '+Math.ceil(p.blessT)+'s</span>');if(p.venomT>0)st.push('<span class="chip bad">Poisoned</span>');if(p.slowT>0)st.push('<span class="chip bad">Pinched</span>');
  if(p.camoT>0)st.push('<span class="chip good">Hidden · '+Math.ceil(p.camoT)+'s</span>');if(p.burrowT>0)st.push('<span class="chip good">Burrowed</span>');if(p.inflateT>0)st.push('<span class="chip good">Inflated</span>');if(inkAt(p.x,p.z,p.team))st.push('<span class="chip bad">Inked</span>');
  const mk=st.join('');if(cache.mk!==mk){cache.mk=mk;H.muts.innerHTML=mk;}
  for(const s of abSlots){const [cd,max]=s.get();const f=Math.max(0,cd)/max;const k=f.toFixed(3);if(s.k!==k){s.k=k;s.cd.style.setProperty('--cd',f);s.n.textContent=cd>0.05?(cd>=1?Math.ceil(cd):cd.toFixed(1)):'';s.el.classList.toggle('ready',cd<=0);}}
  let pr='';
  if(p.state==='alive'&&!match.over){let dm=null;for(const m of world.creatures){if(m.team!==p.team||m.state!=='downed')continue;if(Math.hypot(m.x-p.x,m.z-p.z)<m.radius+p.radius+3){dm=m;break;}}
    if(dm)pr=(isCoarse?'Hold Revive':(A11Y.toggleRevive?'Press ':'Hold ')+keyName(A11Y.keys.revive))+' to revive '+dm.name+(dm.reviveP>0?' · '+Math.round(dm.reviveP/S.reviveSec*100)+'%':'');
    else if(p.st.glide&&!p.grounded&&!p.glideHeld&&p.vy<-2)pr=(isCoarse?'Hold Jump':(A11Y.toggleGlide?'Press ':'Hold ')+keyName(A11Y.keys.jump))+' to glide';}
  setText(H.prompt,'pr',pr);
  const dn=p.state==='downed'&&match.mode!=='test';if(H.down.hidden===dn)H.down.hidden=!dn;if(dn)setText(H.downT,'dt',String(Math.ceil(p.downedT)));
  hurtFlash=Math.max(0,hurtFlash-dt*2);H.flash.style.opacity=(A11Y.flashes&&!A11Y.reduceMotion?hurtFlash:hurtFlash*.35).toFixed(2);
  const cd=match.countdown>0?(match.countdown>.6?String(Math.ceil(match.countdown-.6)):'Clash!'):'';if(cache.cd!==cd){if(cd){sfx(cd==='Clash!'?'go':'count');announce(cd==='Clash!'?'Fight!':cd);}}setText(H.count,'cd',cd);
  if(cam.lock&&cam.lock.state!=='dead'){const sp=toScreen(cam.lock.x,cam.lock.y+cam.lock.height*.55,cam.lock.z);if(sp){H.ret.style.display='block';H.ret.style.left=sp.x+'px';H.ret.style.top=sp.y+'px';}else H.ret.style.display='none';}else H.ret.style.display='none';
  const sb=$('#spectbar');const showS=match.mode==='battle'&&match.eliminated&&$('#death').hidden&&!match.resultsShown;if(sb.hidden===showS)sb.hidden=!showS;
  drawMinimap();
}
const mm=$('#minimap').getContext('2d');
function visibleToTeam(e,team){for(const c of world.creatures){if(c.team!==team||c.state==='dead')continue;if(Math.hypot(c.x-e.x,c.z-e.z)<c.st.detect&&canSee(c,e))return true;}return false;}
function drawMinimap(){
  const W=440,Hh=280,map=world.map;mm.clearRect(0,0,W,Hh);
  const sx=W/200,sz=Hh/(2*(map.zMax+6));const X=x=>W/2+x*sx,Z=z=>Hh/2+z*sz;
  mm.lineCap='round';mm.lineJoin='round';
  for(const L of map.lanes){mm.strokeStyle='rgba(180,210,255,.22)';mm.lineWidth=map.lw*sx;mm.beginPath();L.pts.forEach((p,i)=>i?mm.lineTo(X(p.x),Z(p.z)):mm.moveTo(X(p.x),Z(p.z)));mm.stroke();}
  for(const t of ['blue','red']){mm.fillStyle=t==='blue'?'rgba(59,167,255,.25)':'rgba(255,77,94,.25)';mm.beginPath();mm.arc(X(TEAMS[t].sign*86),Z(0),13*sx,0,TAU);mm.fill();}
  for(const k of world.inks){mm.fillStyle='rgba(40,20,70,.7)';mm.beginPath();mm.arc(X(k.x),Z(k.z),k.r*sx,0,TAU);mm.fill();}
  for(const n of world.nests){const s=(n.main?8:5.5)*sx*.9;mm.save();mm.translate(X(n.x),Z(n.z));mm.rotate(Math.PI/4);mm.fillStyle=n.alive?TEAMS[n.team].hex:'rgba(255,255,255,.15)';mm.strokeStyle='rgba(255,255,255,.7)';mm.lineWidth=1.5;mm.fillRect(-s/2,-s/2,s,s);mm.strokeRect(-s/2,-s/2,s,s);mm.restore();}
  for(const n of world.neutrals){if(!n.alive)continue;mm.fillStyle=n.type==='boss'?'#c08aff':'#ffd166';mm.beginPath();mm.arc(X(n.x),Z(n.z),n.type==='boss'?9:3.5,0,TAU);mm.fill();}
  const me=match.player;
  for(const c of world.creatures){if(c.state==='dead')continue;if(c.team!==me.team&&!c.isDummy&&!visibleToTeam(c,me.team))continue;const x=X(c.x),z=Z(c.z);
    if(c.isPlayer){mm.save();mm.translate(x,z);mm.rotate(-c.yaw+Math.PI/2);mm.fillStyle='#ffffff';mm.shadowColor='#55f0ff';mm.shadowBlur=10;mm.beginPath();mm.moveTo(11,0);mm.lineTo(-7,7);mm.lineTo(-3,0);mm.lineTo(-7,-7);mm.closePath();mm.fill();mm.restore();
      mm.strokeStyle='rgba(85,240,255,.25)';mm.lineWidth=1;mm.beginPath();mm.arc(x,z,c.st.detect*sx,0,TAU);mm.stroke();continue;}
    mm.fillStyle=TEAMS[c.team].hex;mm.strokeStyle='#fff';mm.lineWidth=2;mm.beginPath();if(c.team===me.team)mm.arc(x,z,6.5,0,TAU);else{mm.moveTo(x,z-8);mm.lineTo(x+8,z);mm.lineTo(x,z+8);mm.lineTo(x-8,z);mm.closePath();}if(c.state==='downed')mm.stroke();else{mm.fill();mm.stroke();}}
}
function updateLabels(){
  const W=world;const maxD=60;const me=match&&match.player;
  for(const c of W.creatures){const t=c.tag;if(!t)continue;const hidden=c.isPlayer||c.state==='dead'||phase!=='battle'||c.burrowT>0||(c.camoT>0&&me&&c.team!==me.team);
    if(hidden){if(t.style.display!=='none')t.style.display='none';continue;}
    const d=Math.hypot(c.x-camera.position.x,c.z-camera.position.z);const p=d<maxD?toScreen(c.x,c.y+c.height*(c.inflateT>0?1.4:1)+.5,c.z):null;if(!p){if(t.style.display!=='none')t.style.display='none';continue;}
    t.style.display='flex';const s=clamp(1.25-d/70,.6,1.1);t.style.transform='translate('+(p.x|0)+'px,'+(p.y|0)+'px) translate(-50%,-100%) scale('+s.toFixed(2)+')';
    const w=(c.hp/c.maxHp*100).toFixed(0)+'%';if(t._w!==w){t._w=w;t.querySelector('.tb i').style.width=w;}
    const dn=c.state==='downed';const de=t.querySelector('.tdown');if(de.hidden===dn)de.hidden=!dn;if(dn){const txt='DOWNED '+Math.ceil(c.downedT)+(c.reviveP>0?' · '+Math.round(c.reviveP/S.reviveSec*100)+'%':'');if(de._t!==txt){de._t=txt;de.textContent=txt;}}}
  for(const n of W.nests){const t=n.tag;const d=Math.hypot(n.x-camera.position.x,n.z-camera.position.z);const show=phase==='battle'&&n.alive&&d<70&&(n.hp<n.maxHp||d<35);const p=show?toScreen(n.x,n.y+n.height*n.view.s*.62+1,n.z):null;
    if(!p){if(t.style.display!=='none')t.style.display='none';continue;}t.style.display='flex';t.style.transform='translate('+(p.x|0)+'px,'+(p.y|0)+'px) translate(-50%,-100%)';const w=(n.hp/n.maxHp*100).toFixed(1)+'%';if(t._w!==w){t._w=w;t.querySelector('.tb i').style.width=w;}}
  for(const n of W.neutrals){const t=n.tag;const d=Math.hypot(n.x-camera.position.x,n.z-camera.position.z);const show=phase==='battle'&&n.alive&&d<(n.type==='boss'?55:30)&&(n.hp<n.maxHp||n.type==='boss');const p=show?toScreen(n.x,n.y+n.view.height+.4,n.z):null;
    if(!p){if(t.style.display!=='none')t.style.display='none';continue;}t.style.display='flex';t.style.transform='translate('+(p.x|0)+'px,'+(p.y|0)+'px) translate(-50%,-100%)';const w=(n.hp/n.maxHp*100).toFixed(1)+'%';if(t._w!==w){t._w=w;t.querySelector('.tb i').style.width=w;}}
}
