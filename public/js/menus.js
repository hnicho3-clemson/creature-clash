'use strict';
/* Creature Clash — menus, build phase, Workshop editor, Test Drive, results, dev console, main loop */
const OVERLAYS=['death','results','pause'];
function showScreen(name){if(name!=='menu')clearMenuStage();for(const s of ['menu','build','workshop','hud','chal'])$('#'+s).hidden=s!==name;for(const o of OVERLAYS)$('#'+o).hidden=true;paused=false;}
function newSeed(){return Math.floor(Math.random()*999999)+1;}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* =========================================================
   Main menu
   ========================================================= */
function openMenu(){
  exitLock();hideTouch();build=null;match=null;cam.lock=null;cam.cine=null;timeScale=1;
  let rebuilt=false;if(!world||world.mode==='test'||world.creatures.length){buildWorld(newSeed());rebuilt=true;}
  phase='menu';setRenderView(scene,camera,world.map.biome.bloom);showScreen('menu');clearAnnouncements();refreshMenu();if(rebuilt||!menuStage.active)buildMenuStage();
}
/* live 3D home stage: your creature and two teammates idling in the arena */
const menuStage={active:false,ents:[],t:0};
function clearMenuStage(){for(const e of menuStage.ents)disposeView(e.view);menuStage.ents=[];menuStage.active=false;if(menuStage.pod){disposePod(menuStage.pod);menuStage.pod=null;}}
function buildMenuStage(){
  clearMenuStage();if(!world)return;const map=world.map;const x0=-60,z0=map.laneZ(0,x0);
  const mine=typeof playerDesignForChallenge==='function'?playerDesignForChallenge():clone(PRESETS[0]);
  const pals=[pick(BOT_PRESETS),pick(BOT_PRESETS)];
  const spots=[[mine,0,0,null],[pals[0],-3.6,-3.8,pick(BOT_COLORS)],[pals[1],-3.2,3.9,pick(BOT_COLORS)]];
  for(const [d0,dx,dz,tint] of spots){const d=clone(d0);if(tint){d.color=tint[0];d.accent=tint[1];}const v=buildCreatureView(d,{team:'blue'});world.group.add(v.root);
    const e={kind:'creature',x:x0+dx,z:z0+dz,y:0,yaw:0,vx:0,vy:0,vz:0,kx:0,kz:0,state:'alive',grounded:true,view:v,emoteT:0,next:2+Math.random()*4,voicePitch:clamp(1.75-d.body.w*d.body.h*d.body.l*.42,.55,1.7)};e.y=map.heightAt(e.x,e.z);e.hx=e.x;e.hz=e.z;menuStage.ents.push(e);}
  menuStage.c=new T.Vector3(x0-1.2,menuStage.ents[0].y,z0);menuStage.active=true;menuStage.t=0;
}
function menuCamPose(t){const st=menuStage;const narrow=innerWidth/innerHeight<1;const c=st.c;
  const drift=A11Y.reduceMotion?0:Math.sin(t*.12)*.18;const ang=.42+drift;const dist=narrow?12.5:10.5;
  const P=new T.Vector3(c.x+Math.cos(ang)*dist,c.y+(narrow?4.2:2.8),c.z+Math.sin(ang)*dist);
  const fwd=new T.Vector3().subVectors(c,P).setY(0).normalize();const right=new T.Vector3(-fwd.z,0,fwd.x);
  const L=c.clone().add(new T.Vector3(0,narrow?.2:1.5,0)).addScaledVector(right,narrow?0:3.4);if(narrow)L.y-=2.2;return {P,L};}
function menuStageCreatures(rdt,now,P){
  for(const e of menuStage.ents){if(e.hidden)continue;
    if(!e.scripted){const want=Math.atan2(P.x-e.x,P.z-e.z)+Math.sin(menuStage.t*.5+e.x)*.25;e.yaw+=angDiff(e.yaw,want)*Math.min(1,rdt*3);
      e.next-=rdt;if(e.next<=0&&!A11Y.reduceMotion){e.next=4+Math.random()*6;e.emoteT=1.4;if(Math.random()<.5)voice(e,'happy');}else if(e.emoteT>0)e.emoteT-=rdt;}
    else if(e.emoteT>0)e.emoteT-=rdt;
    animateCreatureView(e,rdt,now*.001);}}
function updateMenuStage(rdt,now){
  const st=menuStage;st.t+=rdt;const {P,L}=menuCamPose(st.t);const c=st.c;
  camera.position.copy(P);camera.lookAt(L);cam.fx=c.x;cam.fz=c.z;sunFollow(c.x,c.y,c.z);menuStageCreatures(rdt,now,P);
  if(st.pod){const p=st.pod;animatePod(p,rdt,now*.001);const q=p.g.position;
    if(Math.random()<.06&&!A11Y.reduceMotion)emit(q.x+(Math.random()-.5)*p.S*.6,q.y+p.S*.3,q.z+(Math.random()-.5)*p.S*.6,{n:1,color:'#d8d8e4',glow:.7,speed:.6,up:1.8,grav:-1.2,life:1.8,size:.5,drag:1});}
}
const HOME_TIPS=['Long legs are fast, but wobbly creatures tip over easily!','Shells and armor plates shrug off bites and claws.','Venom stingers are great against armored creatures.','Hold your revive button next to a knocked-down teammate to save them.','Lure enemies onto geysers to launch them sky high!','Beating the Grand Gobbler gives your whole team a boost.','Mystery pods unlock new parts as you level up.','Try the Workshop Test Drive to practice with new parts.','Watch out for rolling boulders crossing the lanes!','Big ears and wide eyes help you spot enemies on the minimap.'];
function refreshMenu(){
  const total=Object.keys(PARTS).filter(k=>PARTS[k].tier!=='Free').length;const owned=progress.owned.filter(k=>PARTS[k]&&PARTS[k].tier!=='Free').length;const unl=Object.keys(PARTS).filter(k=>PARTS[k].tier!=='Free'&&isUnlocked(k)).length;
  $('#mLevel').textContent=progress.level;$('#mXp').style.width=(progress.xp/xpNeeded(progress.level)*100).toFixed(1)+'%';$('#mXpText').textContent=progress.xp+' / '+xpNeeded(progress.level)+' XP';
  $('#mDna').textContent=progress.dna;$('#mParts').textContent=owned+' parts owned';
  $('#mTip').textContent=pick(HOME_TIPS);try{$('#mBuildArt').src=Portrait.design(BOT_PRESETS[5],false,384);$('#mChalArt').src=Portrait.design(BOSS,false,384);}catch(e){}
  $('#mRecord').textContent=progress.stats.wins+' wins · '+progress.stats.kills+' creatures beaten';
  if(typeof refreshCampaignCard==='function')refreshCampaignCard();
}
$('#mPlay').addEventListener('click',()=>{AudioFX.init();sfx('ui');openBuild();});
$('#mWorkshop').addEventListener('click',()=>{AudioFX.init();sfx('ui');openWorkshop('menu');});
$('#mHowto').addEventListener('click',()=>{sfx('ui');$('#howto').hidden=false;});$('#howtoClose').addEventListener('click',()=>{sfx('ui');$('#howto').hidden=true;});
$('#mIntro').addEventListener('click',()=>{AudioFX.init();sfx('ui');startIntro();});

/* =========================================================
   Build phase (2 minutes)
   ========================================================= */
let build=null;
function openBuild(opts){opts=opts||{};
  AudioFX.init();exitLock();hideTouch();match=null;cam.cine=null;
  buildWorld(newSeed());phase='build';setRenderView(scene,camera,world.map.biome.bloom);showScreen('build');clearAnnouncements();
  const names=shuffle(BOT_NAMES);let ni=0;const bots=[];
  const mk=(team,lane,slot)=>{const d=clone(pick(BOT_PRESETS));const tint=pick(BOT_COLORS);d.color=tint[0];d.accent=tint[1];d.seed=Math.floor(Math.random()*99991);return {name:names[ni++],design:d,team,lane,slot,readyAt:4+Math.random()*22,ready:false};};
  bots.push(mk('blue',-1,0),mk('blue',1,2));[-1,0,1].forEach((k,i)=>bots.push(mk('red',k,i)));
  build={time:S.buildSec,elapsed:0,ready:false,revealed:false,bots,choice:null,choiceKey:null,rot:opts.rot||null};
  const bo=buildOptions();const last=bo.find(o=>o.key==='slot'+progress.lastSlot&&o.ok)||bo.find(o=>o.key.startsWith('slot')&&o.ok)||bo.find(o=>o.key==='preset0');
  selectBuildChoice(last.key,last.design);
  $('#bMeta').textContent=world.map.biome.name+' · seed '+world.seed+' · 3v3 vs bots';
  const rb=$('#bRot');if(build.rot){const c=CONSTRAINTS[build.rot.constraint];rb.hidden=false;rb.innerHTML='<b>'+(build.rot.kind==='daily'?'Daily':'Weekly')+' challenge · '+esc(c.name)+'</b> '+esc(c.desc)+' <span class="goal">Goal: '+esc(GOALS[build.rot.goal].name)+'</span>';}else rb.hidden=true;
  renderBuild();
}
function buildOptions(){
  const con=build&&build.rot?CONSTRAINTS[build.rot.constraint]:null;
  const out=[];for(let i=0;i<slotCount();i++){const d=slots[i];if(!d)continue;const v=validateDesign(d);const cw=con&&con.check(d);out.push({key:'slot'+i,label:'Slot '+(i+1),design:d,ok:v.selectable&&!cw,why:v.issues[0]||(v.notOwned.length?'Uses parts you don’t own: '+v.notOwned.map(id=>PARTS[id].name).join(', '):'')||cw||''});}
  PRESETS.forEach((d,i)=>{const dd=con?con.fix(clone(d)):d;out.push({key:'preset'+i,label:'Starter',design:dd,ok:!con||!con.check(dd),why:con?con.check(dd)||'':''});});
  if(build&&build.custom)out.unshift({key:'custom',label:'Edited',design:build.custom,ok:validateDesign(build.custom).selectable&&!(con&&con.check(build.custom)),why:''});
  return out;
}
function selectBuildChoice(key,design){build.choiceKey=key;build.choice=clone(design);if(key.startsWith('slot')){progress.lastSlot=+key.slice(4);saveProgress();}}
function renderBuild(){
  if(!build)return;const opts=buildOptions();
  $('#bList').innerHTML=opts.map(o=>'<button class="bopt'+(o.key===build.choiceKey?' sel':'')+(o.ok?'':' bad')+'" data-key="'+o.key+'"'+(o.ok?'':' aria-disabled="true"')+'><img alt="" src="'+Portrait.design(o.design)+'"><span><b>'+esc(o.design.name)+'</b><small>'+esc(o.label)+' · '+calcStats(o.design).role+'</small>'+(o.ok?'':'<small class="why">'+esc(o.why)+'</small>')+'</span></button>').join('');
  $$('#bList .bopt').forEach(b=>b.addEventListener('click',()=>{const o=opts.find(x=>x.key===b.dataset.key);if(!o)return;if(!o.ok){sfx('deny');return;}sfx('ui');selectBuildChoice(o.key,o.design);renderBuild();}));
  const d=build.choice;const st=calcStats(d);
  $('#bPick').innerHTML='<img class="bigpor" alt="" src="'+Portrait.design(d)+'"><div class="bpname">'+esc(d.name)+'</div><div class="chiprow"><span class="chip role">'+st.role+'</span>'+(st.special?'<span class="chip sp">'+SPECIALS[st.special].name+'</span>':'')+st.attacks.map(a=>'<span class="chip">'+esc(a.name)+'</span>').join('')+'</div>'+statBars(st);
  $('#bReady').textContent=build.ready?'Ready ✓':'Ready';$('#bReady').classList.toggle('done',build.ready);
  renderBuildTeams();
}
function renderBuildTeams(){
  const card=(b,sil)=>'<div class="tmate">'+(sil===2?'<div class="qmark" aria-hidden="true">?</div>':'<img alt="" class="'+(sil?'sil':'')+'" src="'+Portrait.design(b.design,!!sil)+'">')+'<span><b>'+esc(sil===2?'Unknown':b.name)+'</b><small>'+(sil?(sil===2?'Hidden until the last 15 s':'Silhouette'):calcStats(b.design).role+' · '+esc(b.design.name))+'</small></span><i class="rdy'+(b.ready?' on':'')+'">'+(b.ready?'Ready':'Building')+'</i></div>';
  $('#bBlue').innerHTML='<div class="tmate me"><img alt="" src="'+Portrait.design(build.choice)+'"><span><b>You</b><small>'+esc(build.choice.name)+'</small></span><i class="rdy'+(build.ready?' on':'')+'">'+(build.ready?'Ready':'Building')+'</i></div>'+build.bots.filter(b=>b.team==='blue').map(b=>card(b,0)).join('');
  $('#bRed').innerHTML=build.bots.filter(b=>b.team==='red').map(b=>card(b,build.revealed?1:2)).join('');
}
function statBars(st){const row=(k,v,m)=>'<span>'+k+'</span><i><b style="width:'+clamp(v/m*100,3,100).toFixed(0)+'%"></b></i><span>'+v.toFixed(1)+'</span>';
  return '<div class="stats">'+row('Speed',st.speed,8)+row('Tough',st.toughness,14)+row('Damage',st.damage,14)+row('Stable',st.stability,10)+'<span>Health</span><i><b style="width:'+clamp(st.hp/180*100,3,100)+'%"></b></i><span>'+st.hp+'</span><span>Detect</span><i><b style="width:'+clamp(st.detect/44*100,3,100)+'%"></b></i><span>'+st.detect+'m</span></div>';}
function updateBuild(dt){
  build.time-=dt;build.elapsed+=dt;const t=fmtTime(build.time);$('#bTimer').textContent=t;$('#bTimer').classList.toggle('low',build.time<15);
  if(phase==='workshop'&&ws.mode==='build'){$('#wsTimer').textContent='Build phase · '+t;$('#wsTimer').classList.toggle('low',build.time<15);}
  let changed=false;for(const b of build.bots)if(!b.ready&&build.elapsed>=b.readyAt){b.ready=true;changed=true;}
  if(!build.revealed&&build.time<=15){build.revealed=true;changed=true;if(phase==='build')banner('Enemy silhouettes revealed','gold');}
  if(changed&&phase==='build')renderBuildTeams();
  if(build.ready&&build.bots.every(b=>b.ready)){beginBattle();return;}
  if(build.time<=0)lockAndBegin();
}
function lockAndBegin(){
  if(phase==='workshop'&&ws.mode==='build'){const v=validateDesign(ws.design);if(v.selectable)build.choice=clone(ws.design);}
  const con=build.rot?CONSTRAINTS[build.rot.constraint]:null;
  const ok=build.choice&&(build.choiceKey&&build.choiceKey.startsWith('preset')||validateDesign(build.choice).selectable)&&!(con&&con.check(build.choice));
  if(!ok)build.choice=con?con.fix(clone(PRESETS[0])):clone(PRESETS[0]);beginBattle();
}
function beginBattle(){
  const b=build;build=null;if(phase==='workshop')closeStudio();
  for(const bot of b.bots)bot.ready=true;
  startMatch({mode:'battle',rot:b.rot,player:b.choice,bots:b.bots.map(x=>({design:x.design,team:x.team,name:x.name,lane:x.lane,slot:x.slot}))});
}
$('#bReady').addEventListener('click',()=>{if(!build)return;sfx('ui');build.ready=!build.ready;if(build.ready)for(const b of build.bots)if(!b.ready)b.readyAt=Math.min(b.readyAt,build.elapsed+.6+Math.random()*1.2);renderBuild();});
$('#bEdit').addEventListener('click',()=>{if(!build)return;sfx('ui');const key=build.choiceKey;openWorkshop('build',build.choice,key&&key.startsWith('slot')?+key.slice(4):-1);});
$('#bBack').addEventListener('click',()=>{sfx('ui');openMenu();});

/* =========================================================
   Workshop: studio scene + Spore-style editor
   ========================================================= */
const studio={scene:new T.Scene(),cam:new T.PerspectiveCamera(36,innerWidth/innerHeight,.1,800),yaw:-.65,pitch:.2,dist:9,ty:1.4,ready:false,view:null,ent:null,walk:false};
cameras.push(studio.cam);
function labTex(kind){const c=document.createElement('canvas');const x=c.getContext('2d');
  if(kind==='hex'){c.width=c.height=512;x.fillStyle='#000';x.fillRect(0,0,512,512);x.strokeStyle='rgba(120,220,255,.55)';x.lineWidth=2;const r=22,h=r*Math.sqrt(3);
    for(let row=-1;row<16;row++)for(let q=-1;q<14;q++){const cx=q*r*3+(row%2?r*1.5:0),cy=row*h/2;x.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU;const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;if(k)x.lineTo(px,py);else x.moveTo(px,py);}x.closePath();x.stroke();}
    const g=x.createRadialGradient(256,256,40,256,256,256);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=g;x.fillRect(0,0,512,512);}
  else{c.width=256;c.height=160;const R=mulberry32(kind.length*97+(kind.charCodeAt(kind.length-1)||1));x.fillStyle='#02060c';x.fillRect(0,0,256,160);
    x.strokeStyle='rgba(111,230,242,.25)';x.lineWidth=1;for(let i=0;i<256;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,160);x.stroke();}for(let i=0;i<160;i+=16){x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke();}
    const hue=['#6fe6f2','#ff86dc','#c4ff6e','#ffd27a'][Math.floor(R()*4)];x.strokeStyle=hue;x.lineWidth=2.5;x.beginPath();let y=80;for(let i=0;i<=256;i+=6){y=clamp(y+(R()-.5)*26,20,140);if(i)x.lineTo(i,y);else x.moveTo(i,y);}x.stroke();
    x.fillStyle=hue;for(let i=0;i<6;i++)x.fillRect(12,14+i*10,30+R()*80,4);x.globalAlpha=.6;for(let i=0;i<8;i++)x.fillRect(180+i*8,150-R()*60,5,160);x.globalAlpha=1;}
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}
function initStudio(){
  if(studio.ready)return;studio.ready=true;const sc=studio.scene;
  sc.background=col('#03040a');sc.fog=new T.FogExp2(col('#04050d'),.042);
  const B={skyTop:'#020208',skyMid:'#0a0c22',skyHorizon:'#1b2550',wall:'#020206',sun:'#ffe6c8'};
  sc.environment=makeEnvMap(B).texture;
  const sky=new T.Mesh(new T.SphereGeometry(300,24,12),skyMaterial({skyTop:'#010104',skyMid:'#06071a',skyHorizon:'#0c1030',wall:'#010103'},.35));sky.material.fog=false;sky.renderOrder=-1;sc.add(sky);studio.sky=sky;
  // lighting: warm key spot, cool rim, soft magenta fill, platform under-glow
  const hemiS=new T.HemisphereLight(0x8aa0ff,0x100818,.3);sc.add(hemiS);studio.hemi=hemiS;
  const key=new T.SpotLight(0xffe2c0,1.5,0,.5,.65,1);key.position.set(-3.5,10,5.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;key.shadow.normalBias=.03;key.shadow.camera.near=2;key.shadow.camera.far=30;sc.add(key);sc.add(key.target);key.target.position.set(0,1,0);studio.key=key;
  const rim=new T.SpotLight(0x6fe6f2,2.4,0,.55,.7,1);rim.position.set(5,6,-7);sc.add(rim);sc.add(rim.target);rim.target.position.set(0,1.2,0);
  const rim2=new T.SpotLight(0xff86dc,1.4,0,.6,.8,1);rim2.position.set(-7,4,-4);sc.add(rim2);sc.add(rim2.target);rim2.target.position.set(0,1,0);
  const under=new T.PointLight(0x6fe6f2,.6,7,2);under.position.set(0,.3,0);sc.add(under);
  const dark=(c,o)=>new T.MeshPhysicalMaterial(Object.assign({color:col(c),metalness:.75,roughness:.38,clearcoat:.6,clearcoatRoughness:.25},o||{}));
  const glow=(c,i)=>new T.MeshBasicMaterial({color:col(c).multiplyScalar(i),toneMapped:false});
  // platform
  const base=new T.Mesh(new T.CylinderGeometry(4.2,4.6,.6,72),dark('#0d1124'));base.position.y=-.3;base.receiveShadow=true;sc.add(base);
  const step=new T.Mesh(new T.CylinderGeometry(5.5,5.8,.3,72),dark('#090c1a',{roughness:.5}));step.position.y=-.75;step.receiveShadow=true;sc.add(step);
  const hex=labTex('hex');hex.wrapS=hex.wrapT=T.RepeatWrapping;
  const top=new T.Mesh(new T.CircleGeometry(3.75,72),new T.MeshPhysicalMaterial({color:col('#0b0f1f'),metalness:.6,roughness:.22,clearcoat:1,clearcoatRoughness:.08,emissive:col('#4ad8ff'),emissiveIntensity:.55,emissiveMap:hex}));top.rotation.x=-Math.PI/2;top.position.y=.005;top.receiveShadow=true;sc.add(top);
  const r1=new T.Mesh(new T.TorusGeometry(3.8,.045,8,128),glow('#6fe6f2',2.6));r1.rotation.x=Math.PI/2;r1.position.y=.02;sc.add(r1);
  const r2=new T.Mesh(new T.TorusGeometry(5.6,.03,8,128),glow('#ff86dc',1.8));r2.rotation.x=Math.PI/2;r2.position.y=-.59;sc.add(r2);
  const segs=new T.Group();for(let k=0;k<6;k++){const a=new T.Mesh(new T.RingGeometry(2.25,2.4,24,1,k/6*TAU,TAU/6*.7),new T.MeshBasicMaterial({color:col('#6fe6f2').multiplyScalar(1.4),toneMapped:false,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));segs.add(a);}segs.rotation.x=-Math.PI/2;segs.position.y=.012;sc.add(segs);studio.segs=segs;
  for(let k=0;k<8;k++){const a=k/8*TAU+.2;const l=new T.Mesh(new T.BoxGeometry(.12,.06,.5),glow('#6fe6f2',1.6));l.position.set(Math.cos(a)*4.4,-.02,Math.sin(a)*4.4);l.rotation.y=-a;sc.add(l);}
  // floor with faint radial light lines
  const floor=new T.Mesh(new T.CircleGeometry(40,64),new T.MeshPhysicalMaterial({color:col('#05060d'),metalness:.55,roughness:.3,clearcoat:.8,clearcoatRoughness:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.9;floor.receiveShadow=true;sc.add(floor);
  for(let k=0;k<16;k++){const a=k/16*TAU;const l=new T.Mesh(new T.BoxGeometry(.05,.02,7),glow(k%2?'#3a6aff':'#6fe6f2',.9));l.position.set(Math.cos(a)*10,-.89,Math.sin(a)*10);l.rotation.y=-a+Math.PI/2;sc.add(l);}
  // lab walls: panels with light strips and monitors
  const wallM=dark('#0b0e1c',{roughness:.55});
  for(let k=0;k<18;k++){const a=k/18*TAU;const g=new T.Group();g.position.set(Math.cos(a)*15,0,Math.sin(a)*15);g.rotation.y=-a-Math.PI/2;
    const pnl=new T.Mesh(new T.BoxGeometry(4.6,9,.4),wallM);pnl.position.y=3.6;g.add(pnl);
    const strip=new T.Mesh(new T.BoxGeometry(4.2,.06,.05),glow(k%3?'#6fe6f2':'#ff86dc',1.5));strip.position.set(0,.6,.23);g.add(strip);
    const strip2=strip.clone();strip2.position.y=7.2;g.add(strip2);
    if(k%2===0){const mon=new T.Mesh(new T.PlaneGeometry(2.4,1.5),new T.MeshBasicMaterial({map:labTex('mon'+k),toneMapped:false,color:new T.Color(1.4,1.4,1.4)}));mon.position.set(0,3.4,.21);g.add(mon);studio.mons=(studio.mons||[]).concat(mon);}
    else{for(let v=0;v<3;v++){const vent=new T.Mesh(new T.BoxGeometry(3,.12,.08),dark('#1a2038'));vent.position.set(0,2.6+v*.5,.22);g.add(vent);}}
    sc.add(g);}
  // specimen tubes with glowing fluid, floating specimens and bubbles
  studio.tubes=[];const tubeCols=['#6fe6f2','#ff86dc','#c4ff6e','#ffd27a','#8a7aff','#6fe6f2'];
  for(let k=0;k<6;k++){const a=k/6*TAU+.52;const g=new T.Group();g.position.set(Math.cos(a)*9,-.9,Math.sin(a)*9);const c=tubeCols[k];
    const bs=new T.Mesh(new T.CylinderGeometry(1.05,1.2,.6,32),dark('#151a30'));bs.position.y=.3;g.add(bs);
    const cap=new T.Mesh(new T.CylinderGeometry(1.1,1,.5,32),dark('#151a30'));cap.position.y=5.1;g.add(cap);
    const lr=new T.Mesh(new T.TorusGeometry(.95,.035,6,48),glow(c,2.2));lr.rotation.x=Math.PI/2;lr.position.y=.62;g.add(lr);const lr2=lr.clone();lr2.position.y=4.84;g.add(lr2);
    const liq=new T.Mesh(new T.CylinderGeometry(.86,.86,4.1,32,1,true),new T.MeshBasicMaterial({color:col(c).multiplyScalar(.55),transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));liq.position.y=2.7;g.add(liq);
    const glass=new T.Mesh(new T.CylinderGeometry(.92,.92,4.3,40,1,true),new T.MeshPhysicalMaterial({color:0xffffff,roughness:.04,metalness:0,transparent:true,opacity:.12,clearcoat:1,depthWrite:false,side:T.DoubleSide}));glass.position.y=2.7;g.add(glass);
    const spec=new T.Mesh(new T.IcosahedronGeometry(.42,3),new T.MeshPhysicalMaterial({color:col(c).multiplyScalar(.5),emissive:col(c),emissiveIntensity:.35,roughness:.35,clearcoat:1,sheen:1,sheenColor:col(c)}));spec.position.y=2.6;spec.scale.set(1,.85,1.15);g.add(spec);
    for(const s of [-1,1]){const e=new T.Mesh(sphereG(),pmat('#f4efe8',{roughness:.2,clearcoat:1}));e.scale.setScalar(.09);e.position.set(s*.14,.15,.36);spec.add(e);}
    const bub=[];for(let i=0;i<7;i++){const b=new T.Mesh(sphereG(),new T.MeshBasicMaterial({color:col(c).multiplyScalar(1.6),toneMapped:false,transparent:true,opacity:.7}));b.scale.setScalar(.03+Math.random()*.04);b.position.set((Math.random()-.5)*1.2,.8+Math.random()*3.8,(Math.random()-.5)*1.2);g.add(b);bub.push(b);}
    sc.add(g);studio.tubes.push({g,spec,bub,ph:Math.random()*TAU});}
  // holographic DNA helix
  const helix=new T.Group();helix.position.set(-6.2,.2,-4.2);const hm1=new T.MeshBasicMaterial({color:col('#6fe6f2').multiplyScalar(1.8),toneMapped:false,transparent:true,opacity:.85}),hm2=new T.MeshBasicMaterial({color:col('#ff86dc').multiplyScalar(1.8),toneMapped:false,transparent:true,opacity:.85}),hr=new T.MeshBasicMaterial({color:col('#b8c8ff'),toneMapped:false,transparent:true,opacity:.35});
  for(let i=0;i<34;i++){const y=i*.17,a=i*.42;const p1=new T.Mesh(sphereG(),hm1),p2=new T.Mesh(sphereG(),hm2);p1.scale.setScalar(.075);p2.scale.setScalar(.075);p1.position.set(Math.cos(a)*.55,y,Math.sin(a)*.55);p2.position.set(-Math.cos(a)*.55,y,-Math.sin(a)*.55);helix.add(p1,p2);
    if(i%2===0){const rung=new T.Mesh(new T.CylinderGeometry(.015,.015,1.1,4),hr);rung.position.set(0,y,0);rung.rotation.set(0,-a,Math.PI/2);helix.add(rung);}}
  const hb=new T.Mesh(new T.CylinderGeometry(.9,1,.25,32),dark('#141a30'));hb.position.y=-.95;helix.add(hb);const hbr=new T.Mesh(new T.TorusGeometry(.85,.03,6,40),glow('#6fe6f2',2.2));hbr.rotation.x=Math.PI/2;hbr.position.y=-.82;helix.add(hbr);
  sc.add(helix);studio.helix=helix;
  // overhead rig and hanging cables
  const rig=new T.Mesh(new T.TorusGeometry(4.2,.22,12,96),dark('#10142a'));rig.rotation.x=Math.PI/2;rig.position.y=9.5;sc.add(rig);
  const rigL=new T.Mesh(new T.TorusGeometry(4.2,.05,6,96),glow('#ffe6c8',1.4));rigL.rotation.x=Math.PI/2;rigL.position.y=9.27;sc.add(rigL);
  const cableM=new T.MeshPhysicalMaterial({color:col('#0a0c16'),roughness:.5,clearcoat:.5});
  for(let k=0;k<5;k++){const a=k/5*TAU+.3;const x0=Math.cos(a)*4.1,z0=Math.sin(a)*4.1,x1=Math.cos(a+.25)*12,z1=Math.sin(a+.25)*12;
    const c=new T.Mesh(taperTube([[x0,9.4,z0],[x0*1.4,5,z0*1.4],[x1*.75,.2,z1*.75],[x1,-.85,z1]],.09,.09,{segs:40,radial:8,cap:false}),cableM);sc.add(c);}
  // faint light cone from the key light
  const cone=new T.Mesh(new T.ConeGeometry(3.4,10,48,1,true),new T.MeshBasicMaterial({color:col('#ffe2c0'),transparent:true,opacity:.012,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}));cone.position.set(0,4.6,0);sc.add(cone);studio.cone=cone;
  // genetic scan ring
  const scan=new T.Mesh(new T.TorusGeometry(1,.012,6,96),new T.MeshBasicMaterial({color:col('#6fe6f2').multiplyScalar(2.4),toneMapped:false,transparent:true,opacity:.8}));scan.rotation.x=Math.PI/2;sc.add(scan);studio.scan=scan;
  // floating dust
  const N=320,dp=new Float32Array(N*3);for(let i=0;i<N;i++){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*9;dp[i*3]=Math.cos(a)*r;dp[i*3+1]=Math.random()*9;dp[i*3+2]=Math.sin(a)*r;}
  const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dp,3));
  const dust=new T.Points(dg,new T.PointsMaterial({color:col('#ffe8d0').multiplyScalar(1.3),size:.045,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sc.add(dust);studio.dust=dust;
  const mk=(c,s)=>{const m=new T.Mesh(new T.TorusGeometry(.32,.035,8,40),new T.MeshBasicMaterial({color:col(c).multiplyScalar(3),toneMapped:false,depthTest:false,transparent:true}));m.renderOrder=10;m.visible=false;m.scale.setScalar(s||1);sc.add(m);return m;};
  studio.hover=mk('#ff86dc');studio.sel=[mk('#6fe6f2'),mk('#6fe6f2')];
  studio.ray=new T.Raycaster();studio.ptr=new T.Vector2();
}
const ws={design:null,slot:-1,sel:-1,placing:null,tab:'Body',mode:'menu',drag:null,orbit:null,undo:[],moved:false,statsOpen:false};
function openWorkshop(mode,design,slot){
  initStudio();exitLock();hideTouch();
  ws.mode=mode;ws.slot=slot==null?-1:slot;
  if(design)ws.design=clone(design);else if(ws.slot>=0&&slots[ws.slot])ws.design=clone(slots[ws.slot]);else if(!ws.design){const i=slots.findIndex(Boolean);ws.slot=i;ws.design=i>=0?clone(slots[i]):newDesign();}
  if(mode==='build'&&ws.slot<0)ws.design.name=ws.design.name.replace(/^(?!My )/,'My ');
  ws.sel=-1;ws.placing=null;ws.undo=[];
  phase='workshop';showScreen('workshop');setRenderView(studio.scene,studio.cam,.82);
  $('#wsMode').textContent=mode==='build'?'Build phase edit':'Workshop';$('#wsTimer').hidden=mode!=='build';$('#wsTest').hidden=mode==='build';
  $('#wsDone').textContent=mode==='build'?'Use this creature':'Main menu';
  {const li=store.get(SaveKey('studioLight'),0);setStudioLight(Number.isInteger(li)&&li>=0&&li<LIGHT_MODES.length?li:0);}rebuildStudio(true);renderTabs();renderPalette();renderSlots();renderStats();renderSel();hint();
}
function closeStudio(){if(studio.view){disposeView(studio.view);studio.view=null;}studio.hover.visible=false;for(const s of studio.sel)s.visible=false;}
function rebuildStudio(resetCam){
  if(studio.view)disposeView(studio.view);
  const v=buildCreatureView(ws.design,{});studio.scene.add(v.root);studio.view=v;
  studio.ent={x:0,y:0,z:0,yaw:0,vx:0,vy:0,vz:0,kx:0,kz:0,state:'alive',grounded:true,view:v};
  if(resetCam){studio.dist=clamp(v.height*2.4+3,6,13);}studio.ty=v.height*.5;
  updateSelMarkers();
}
function pushUndo(){ws.undo.push(JSON.stringify(ws.design));if(ws.undo.length>40)ws.undo.shift();}
function changed(rebuild){if(rebuild!==false)rebuildStudio();renderStats();renderSlots();renderPalette();}
const FAM_TABS=['Body'].concat(FAMS);
function renderTabs(){$('#wsTabs').innerHTML=FAM_TABS.map(t=>'<button role="tab" aria-selected="'+(t===ws.tab)+'" data-tab="'+t+'">'+t+'</button>').join('');$$('#wsTabs button').forEach(b=>b.addEventListener('click',()=>{ws.tab=b.dataset.tab;sfx('ui');renderTabs();renderPalette();}));}
function renderPalette(){
  const el=$('#wsPal');
  if(ws.tab==='Body'){const b=ws.design.body;const sw=(which)=>SWATCHES.map(c=>'<button class="sw'+(ws.design[which]===c?' on':'')+'" data-w="'+which+'" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>').join('')+'<label class="swc" aria-label="Custom color"><input type="color" data-w="'+which+'" value="'+ws.design[which]+'"></label>';
    el.innerHTML='<div class="bodyed">'+[['w','Width',.7,1.6],['h','Height',.7,1.5],['l','Length',.8,1.8]].map(([k,n,a,z])=>'<label class="sl"><span>'+n+'</span><input type="range" id="bd_'+k+'" min="'+a+'" max="'+z+'" step=".01" value="'+b[k]+'"><output>'+b[k].toFixed(2)+'</output></label>').join('')+
      '<div class="sect">Pattern</div><div class="pats">'+PATTERNS.map(p=>'<button class="chip'+(ws.design.pattern===p?' on':'')+'" data-pat="'+p+'">'+p+'</button>').join('')+'</div>'+
      '<div class="sect">Main color</div><div class="sws">'+sw('color')+'</div><div class="sect">Accent color</div><div class="sws">'+sw('accent')+'</div></div>';
    for(const k of ['w','h','l']){const s=$('#bd_'+k);s.addEventListener('pointerdown',()=>pushUndo());s.addEventListener('input',()=>{ws.design.body[k]=+s.value;s.nextElementSibling.textContent=(+s.value).toFixed(2);rebuildStudio();renderStats();});}
    $$('#wsPal [data-pat]').forEach(x=>x.addEventListener('click',()=>{pushUndo();ws.design.pattern=x.dataset.pat;sfx('ui');changed();}));
    $$('#wsPal .sw').forEach(x=>x.addEventListener('click',()=>{pushUndo();ws.design[x.dataset.w]=x.dataset.c;sfx('ui');changed();}));
    $$('#wsPal input[type=color]').forEach(x=>{x.addEventListener('change',()=>{pushUndo();ws.design[x.dataset.w]=x.value;changed();});});
    return;}
  const ids=Object.keys(PARTS).filter(k=>PARTS[k].fam===ws.tab).sort((a,b)=>PARTS[a].lv-PARTS[b].lv);
  el.innerHTML='<div class="pgrid">'+ids.map(id=>{const d=PARTS[id];
    if(!isUnlocked(id))return '<div class="pc pod"><div class="podimg" aria-hidden="true"></div><span class="pn">Mystery pod</span><span class="pf">Level up to unlock</span></div>';
    const tier='<span class="pt t-'+d.tier+'">'+(d.tier==='Free'?'Free':d.tier)+'</span>';const img='<img alt="" src="'+Portrait.part(id)+'">';
    if(!isOwned(id))return '<div class="pc buy" title="'+esc(d.desc)+'">'+img+'<span class="pn">'+esc(d.name)+'</span>'+tier+'<span class="pd">'+esc(d.desc)+'</span><button class="btn small buybtn" data-buy="'+id+'"'+(progress.dna<partPrice(id)?' disabled':'')+'>Buy · '+partPrice(id)+' DNA</button></div>';
    const used=ws.design.parts.filter(p=>p.id===id).length;
    return '<button class="pc'+(ws.placing===id?' on':'')+'" data-id="'+id+'" title="'+esc(d.desc)+'">'+img+'<span class="pn">'+esc(d.name)+'</span>'+tier+'<span class="pd">'+esc(d.desc)+'</span>'+(used?'<span class="used">×'+used+'</span>':'')+'</button>';}).join('')+'</div>';
  $$('#wsPal .pc[data-id]').forEach(b=>b.addEventListener('click',()=>pickPart(b.dataset.id)));
  $$('#wsPal [data-buy]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.buy;if(tryBuyPart(id)){sfx('buy');banner('Bought '+PARTS[id].name,'drop');renderPalette();renderStats();renderSlots();updateTopDna();}else sfx('deny');}));
}
function updateTopDna(){$('#wsDna').textContent=progress.dna;}
function pickPart(id){const d=PARTS[id];AudioFX.init();
  if(d.mount==='cover'){pushUndo();const i=ws.design.parts.findIndex(p=>p.id===id);if(i>=0){ws.design.parts.splice(i,1);sfx('remove');}else{ws.design.parts.push({id,p:[0,1,0],s:1,r:0,m:false});sfx('place');}ws.sel=-1;changed();return;}
  if(d.max&&ws.design.parts.filter(p=>p.id===id).length>=d.max){sfx('deny');hint('You can only have '+d.max+' '+d.name+'.');return;}
  ws.placing=ws.placing===id?null:id;ws.sel=-1;sfx('ui');renderPalette();renderSel();hint();
  if(isCoarse&&ws.placing){/* on phones, quick-place at the default spot */pushUndo();ws.design.parts.push({id,p:norm3(d.def||[0,1,0]),s:1,r:0,m:d.mirror!==false});ws.sel=ws.design.parts.length-1;ws.placing=null;sfx('place');changed();renderSel();hint('Placed. Drag it on your creature to move it.');}
}
function hint(t){const el=$('#wsHint');if(t){el.textContent=t;return;}
  el.textContent=ws.placing?'Click your creature to attach '+PARTS[ws.placing].name+'. Esc cancels.':ws.sel>=0?'Drag the part to move it. Delete removes it.':isCoarse?'Tap a part to add it. Drag to spin the camera.':'Pick a part, then click your creature to attach it. Drag empty space to orbit, scroll to zoom.';}
function renderSlots(){
  const n=slotCount();let h='';for(let i=0;i<n;i++){const d=slots[i];const v=d?validateDesign(d):null;h+='<button class="slot'+(i===ws.slot?' on':'')+(v&&!v.selectable?' warn':'')+'" data-slot="'+i+'" title="'+(d?esc(d.name)+(v&&!v.selectable?' · can’t be selected: '+esc(v.issues[0]||'uses parts you don’t own'):''):'Empty slot')+'"><span>'+(i+1)+'</span>'+(d?'<img alt="" src="'+Portrait.design(d)+'">':'<em>Empty</em>')+'</button>';}
  $('#wsSlots').innerHTML=h;updateTopDna();
  $$('#wsSlots .slot').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.slot;sfx('ui');ws.slot=i;if(slots[i]){ws.design=clone(slots[i]);ws.undo=[];ws.sel=-1;rebuildStudio(true);}else{hint('Empty slot selected. Save to store this creature here.');}$('#wsName').value=ws.design.name;renderSlots();renderStats();renderPalette();renderSel();}));
  $('#wsName').value=ws.design.name;
}
function renderStats(){
  const v=validateDesign(ws.design);const st=v.stats;const bar=(k,val,max)=>{const f=val/max;return '<div class="bud'+(f>1?' over':'')+'"><span>'+k+'</span><i><b style="width:'+clamp(f*100,2,100).toFixed(0)+'%"></b></i><span>'+(Number.isInteger(val)?val:val.toFixed(1))+' / '+max+'</span></div>';};
  let issues='';for(const s of v.issues)issues+='<li>'+esc(s)+'</li>';if(v.notOwned.length)issues+='<li>Buy or remove: '+v.notOwned.map(id=>esc(PARTS[id].name)).join(', ')+'</li>';
  $('#wsStats').innerHTML='<div class="mehead"><span class="chip role">'+st.role+'</span>'+(st.special?'<span class="chip sp">'+SPECIALS[st.special].name+'</span>':'<span class="chip dim">No special</span>')+'</div>'+statBars(st)+
    '<div class="sect">Budget</div>'+bar('Weight',st.weight,BUDGET.weight)+bar('Complexity',st.complexity,BUDGET.complexity)+bar('Parts',st.partCount,BUDGET.parts)+
    '<div class="sect">Attacks</div><div class="chiprow">'+st.attacks.map(a=>'<span class="chip">'+esc(a.name)+'</span>').join('')+'</div>'+
    (st.armor||st.thorns||st.glide||st.jump>1||st.kbResist<1?'<div class="sect">Traits</div><div class="chiprow">'+(st.armor?'<span class="chip">Armored</span>':'')+(st.thorns?'<span class="chip">Thorns '+st.thorns.toFixed(0)+'</span>':'')+(st.glide?'<span class="chip">Glides</span>':'')+(st.jump>1?'<span class="chip">Big jumps</span>':'')+(st.kbResist<1?'<span class="chip">Knockback resist</span>':'')+'</div>':'')+
    (issues?'<ul class="issues">'+issues+'</ul>':'<p class="okmsg">Ready for battle.</p>');
}
function renderSel(){
  const el=$('#wsSel');if(ws.sel<0||!ws.design.parts[ws.sel]){el.hidden=true;updateSelMarkers();return;}
  const p=ws.design.parts[ws.sel];const d=PARTS[p.id];el.hidden=false;
  el.innerHTML='<div class="selhead"><b>'+esc(d.name)+'</b><button class="xbtn" id="selClose" aria-label="Deselect">×</button></div>'+
    '<label class="sl"><span>Size</span><input type="range" id="selS" min=".6" max="1.6" step=".01" value="'+p.s+'"><output>'+p.s.toFixed(2)+'</output></label>'+
    (d.mount==='cover'?'':'<label class="sl"><span>Twist</span><input type="range" id="selR" min="-3.14" max="3.14" step=".01" value="'+(p.r||0)+'"><output>'+Math.round((p.r||0)*57.3)+'°</output></label>'+
    '<label class="optrow"><input type="checkbox" id="selM"'+(p.m?' checked':'')+'> Mirror on both sides</label>')+
    '<div class="row"><button class="btn small ghost" id="selDup">Duplicate</button><button class="btn small danger" id="selDel">Remove</button></div>';
  $('#selClose').addEventListener('click',()=>{ws.sel=-1;renderSel();hint();});
  const sS=$('#selS');sS.addEventListener('pointerdown',pushUndo);sS.addEventListener('input',()=>{p.s=+sS.value;sS.nextElementSibling.textContent=p.s.toFixed(2);rebuildStudio();renderStats();});
  const sR=$('#selR');if(sR){sR.addEventListener('pointerdown',pushUndo);sR.addEventListener('input',()=>{p.r=+sR.value;sR.nextElementSibling.textContent=Math.round(p.r*57.3)+'°';rebuildStudio();});}
  const sM=$('#selM');if(sM)sM.addEventListener('change',()=>{pushUndo();p.m=sM.checked;changed();});
  $('#selDel').addEventListener('click',removeSel);
  $('#selDup').addEventListener('click',()=>{const d2=PARTS[p.id];if(d2.max&&ws.design.parts.filter(q=>q.id===p.id).length>=d2.max){sfx('deny');return;}pushUndo();const q=clone(p);q.p=norm3([q.p[0]*.8,q.p[1]+.25,q.p[2]-.15]);ws.design.parts.push(q);ws.sel=ws.design.parts.length-1;sfx('place');changed();renderSel();});
  updateSelMarkers();
}
function removeSel(){if(ws.sel<0)return;pushUndo();ws.design.parts.splice(ws.sel,1);ws.sel=-1;sfx('remove');changed();renderSel();hint();}
function updateSelMarkers(){for(const m of studio.sel)m.visible=false;if(ws.sel<0||!studio.view)return;const p=ws.design.parts[ws.sel];if(!p)return;const d=PARTS[p.id];if(d.mount==='cover')return;
  const pts=[p.p];if(p.m&&Math.abs(p.p[0])>.06)pts.push([-p.p[0],p.p[1],p.p[2]]);
  pts.forEach((q,i)=>{const fr=surfaceFrame(q,ws.design.body);const m=studio.sel[i];m.visible=true;m.position.copy(fr.pos);m.position.y+=studio.view.pivot.position.y;m.quaternion.copy(fr.q);m.scale.setScalar(.8+p.s*.5);});}
function wsRay(e){const r=canvas.getBoundingClientRect();studio.ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);studio.ray.setFromCamera(studio.ptr,studio.cam);
  const hits=studio.ray.intersectObjects(studio.view.pivot.children,true);for(const h of hits){let o=h.object;if(o===studio.view.shield||!shownChain(o))continue;while(o&&o!==studio.view.pivot){if(o.userData.inst!=null)return {part:o.userData.inst,point:h.point};if(o.userData.body)return {body:true,point:h.point};o=o.parent;}}return null;}
function shownChain(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
function bodyPointFromRay(e){const r=canvas.getBoundingClientRect();studio.ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);studio.ray.setFromCamera(studio.ptr,studio.cam);
  const h=studio.ray.intersectObject(studio.view.body,false)[0];if(!h)return null;const lp=studio.view.pivot.worldToLocal(h.point.clone());const b=ws.design.body;return norm3([lp.x/b.w,lp.y/b.h,lp.z/b.l]);}
canvas.addEventListener('pointerdown',e=>{
  if(phase!=='workshop'||!studio.view)return;AudioFX.init();canvas.setPointerCapture(e.pointerId);
  const hit=wsRay(e);
  if(ws.placing){const p=bodyPointFromRay(e);if(p){const d=PARTS[ws.placing];pushUndo();ws.design.parts.push({id:ws.placing,p,s:1,r:0,m:d.mirror!==false&&Math.abs(p[0])>.12});ws.sel=ws.design.parts.length-1;if(!e.shiftKey)ws.placing=null;sfx('place');changed();renderSel();hint();return;}}
  if(hit&&hit.part!=null&&!ws.placing){ws.sel=hit.part;ws.drag={idx:hit.part,startX:e.clientX,startY:e.clientY};ws.moved=false;renderSel();hint();return;}
  ws.orbit={x:e.clientX,y:e.clientY,moved:false};
});
canvas.addEventListener('pointermove',e=>{
  if(phase!=='workshop'||!studio.view)return;
  if(ws.drag){if(!ws.moved&&Math.hypot(e.clientX-ws.drag.startX,e.clientY-ws.drag.startY)<4)return;const p=bodyPointFromRay(e);if(!p)return;if(!ws.moved){pushUndo();ws.moved=true;}
    const part=ws.design.parts[ws.drag.idx];part.p=p;if(part.m&&Math.abs(p[0])<.06)part.p[0]=0;
    for(const g of studio.view.partGroups){if(g.userData.inst!==ws.drag.idx)continue;const q=g.userData.mir?[-p[0],p[1],p[2]]:p;const fr=surfaceFrame(q,ws.design.body);g.position.copy(fr.pos);
      if(PARTS[part.id].mount!=='leg')g.quaternion.copy(fr.q).multiply(new T.Quaternion().setFromAxisAngle(_zAxis,(g.userData.mir?-1:1)*(part.r||0)));}
    updateSelMarkers();return;}
  if(ws.orbit){const dx=e.clientX-ws.orbit.x,dy=e.clientY-ws.orbit.y;if(Math.abs(dx)+Math.abs(dy)>2)ws.orbit.moved=true;studio.yaw-=dx*.008;studio.pitch=clamp(studio.pitch+dy*.005,-.05,1.1);ws.orbit.x=e.clientX;ws.orbit.y=e.clientY;return;}
  if(ws.placing){const p=bodyPointFromRay(e);if(p){const fr=surfaceFrame(p,ws.design.body);studio.hover.visible=true;studio.hover.position.copy(fr.pos);studio.hover.position.y+=studio.view.pivot.position.y;studio.hover.quaternion.copy(fr.q);}else studio.hover.visible=false;}
  else studio.hover.visible=false;
});
canvas.addEventListener('pointerup',e=>{
  if(phase!=='workshop')return;
  if(ws.drag){if(ws.moved){changed();}ws.drag=null;return;}
  if(ws.orbit){if(!ws.orbit.moved&&ws.sel>=0){ws.sel=-1;renderSel();hint();}ws.orbit=null;}
});
canvas.addEventListener('wheel',e=>{if(phase==='workshop')studio.dist=clamp(studio.dist+e.deltaY*.01,4,13);},{passive:true});
function wsKey(e){
  if(e.code==='Escape'){if(ws.placing){ws.placing=null;studio.hover.visible=false;renderPalette();hint();}else if(ws.sel>=0){ws.sel=-1;renderSel();hint();}return;}
  if((e.code==='Delete'||e.code==='Backspace')&&ws.sel>=0){e.preventDefault();removeSel();return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();doUndo();return;}
  if(e.code==='KeyM'&&ws.sel>=0){pushUndo();const p=ws.design.parts[ws.sel];p.m=!p.m;changed();renderSel();}
}
function doUndo(){const s=ws.undo.pop();if(!s){sfx('deny');return;}ws.design=JSON.parse(s);ws.sel=-1;sfx('remove');changed();renderSel();}
function updateStudio(rdt,now){
  if(!studio.view)return;const e=studio.ent;
  if(studio.walk){e.vx=Math.sin(studio.view.lastYaw||0)*0;e.vz=3.2;}else{e.vx=0;e.vz=0;}
  animateCreatureView(e,rdt,now*.001);studio.view.root.position.set(0,0,0);
  if(!ws.drag&&!ws.orbit&&!ws.placing&&ws.sel<0&&!A11Y.reduceMotion)studio.yaw+=rdt*.12;
  const cp=Math.cos(studio.pitch);studio.cam.position.set(Math.sin(studio.yaw)*cp*studio.dist,studio.ty+Math.sin(studio.pitch)*studio.dist,Math.cos(studio.yaw)*cp*studio.dist);studio.cam.lookAt(0,studio.ty,0);
  studio.sky.material.uniforms.time.value=now*.001;
  const t=now*.001,still=A11Y.reduceMotion;
  if(!still){studio.segs.rotation.z+=rdt*.25;studio.helix.rotation.y+=rdt*.35;}
  for(const tb of studio.tubes){tb.spec.position.y=2.6+Math.sin(t*.8+tb.ph)*.18;tb.spec.rotation.y+=rdt*.2;for(const b of tb.bub){b.position.y+=rdt*(.4+b.scale.x*6);if(b.position.y>4.7)b.position.y=.8;}}
  const h=studio.view.height||3;const sp=still?.5:(Math.sin(t*.7)*.5+.5);studio.scan.position.y=.08+sp*h*1.02;const r=Math.max(studio.view.R[0],studio.view.R[2])*1.45;studio.scan.scale.setScalar(r*(.85+Math.sin(sp*Math.PI)*.25));studio.scan.material.opacity=.25+.55*Math.sin(sp*Math.PI);
  if(!still){const p=studio.dust.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)+rdt*.12;if(y>9)y=0;p.setY(i,y);p.setX(i,p.getX(i)+Math.sin(t*.3+i)*rdt*.04);}p.needsUpdate=true;}
  if(studio.mons)for(const m of studio.mons){const f=1.25+Math.sin(t*3+m.id)*.08+(Math.random()<.004?.6:0);m.material.color.setRGB(f,f,f);}
  studio.key.target.position.y=h*.45;
}
$('#wsName').addEventListener('input',e=>{ws.design.name=Sec.cleanName(e.target.value);});
$('#wsUndo').addEventListener('click',doUndo);
$('#wsNew').addEventListener('click',()=>{sfx('ui');pushUndo();ws.design=newDesign();ws.sel=-1;ws.slot=slots.findIndex((s,i)=>!s&&i<slotCount());rebuildStudio(true);changed(false);renderSel();$('#wsName').value=ws.design.name;});
$('#wsSave').addEventListener('click',()=>{let i=ws.slot;if(i<0||i>=slotCount())i=slots.findIndex((s,k)=>!s&&k<slotCount());if(i<0)i=0;
  slots[i]=clone(ws.design);ws.slot=i;saveSlots();sfx('buy');banner('Saved to slot '+(i+1),'good');renderSlots();
  if(build){build.custom=null;selectBuildChoice('slot'+i,ws.design);}});
$('#wsTest').addEventListener('click',()=>{sfx('ui');startTestDrive();});
const LIGHT_MODES=[['Dim',1.5,.012,.3],['Off',0,0,.42],['Bright',3.4,.035,.16]];
function setStudioLight(i){studio.lightMode=i;const m=LIGHT_MODES[i];if(studio.key){studio.key.intensity=m[1];studio.cone.material.opacity=m[2];studio.cone.visible=m[2]>0;studio.hemi.intensity=m[3];}$('#wsLight').textContent='Spotlight: '+m[0];store.set(SaveKey('studioLight'),i);}
$('#wsLight').addEventListener('click',()=>{sfx('ui');setStudioLight(((studio.lightMode||0)+1)%LIGHT_MODES.length);});
$('#wsWalk').addEventListener('click',()=>{studio.walk=!studio.walk;$('#wsWalk').textContent=studio.walk?'Stop walking':'Walk preview';sfx('ui');});
$('#wsDone').addEventListener('click',()=>{sfx('ui');
  if(ws.mode==='build'&&build){const v=validateDesign(ws.design);const cw=build.rot&&CONSTRAINTS[build.rot.constraint].check(ws.design);if(!v.selectable||cw){sfx('deny');hint(cw||v.issues[0]||'Buy or remove: '+v.notOwned.map(id=>PARTS[id].name).join(', '));return;}
    if(ws.slot>=0&&slots[ws.slot]&&JSON.stringify(slots[ws.slot])===JSON.stringify(ws.design))selectBuildChoice('slot'+ws.slot,ws.design);else{build.custom=clone(ws.design);selectBuildChoice('custom',ws.design);}
    closeStudio();phase='build';setRenderView(scene,camera,world.map.biome.bloom);showScreen('build');renderBuild();return;}
  closeStudio();openMenu();});
$('#wsStatsToggle').addEventListener('click',()=>{ws.statsOpen=!ws.statsOpen;$('#workshop').classList.toggle('statsopen',ws.statsOpen);});

/* ---------- Test Drive (no DNA, no XP) ---------- */
let testSeed=newSeed();
function startTestDrive(){
  closeStudio();buildWorld(testSeed,{mode:'test'});clearAnnouncements();
  startMatch({mode:'test',player:ws.design,bots:[]});banner('Test Drive · no DNA here','good');
}
function endTestDrive(){exitLock();hideTouch();match=null;phase='workshop';openWorkshop(ws.mode,ws.design,ws.slot);}
$('#tdBack').addEventListener('click',()=>{sfx('ui');endTestDrive();});
$('#tdBot').addEventListener('click',()=>{if(!match||match.mode!=='test')return;sfx('ui');const c=spawnCreature(pick(BOT_PRESETS),'red',false,pick(BOT_NAMES)+' (sparring)',0,1,pick(BOT_COLORS));
  c.x=clamp(match.player.x+Math.sin(cam.yaw)*12,-90,90);c.z=clamp(match.player.z+Math.cos(cam.yaw)*12,-world.map.zMax,world.map.zMax);c.y=world.map.heightAt(c.x,c.z);c.brain.slow=1.6;c.brain.idle=true;banner('Sparring bot joined','gold');});

/* =========================================================
   Death screen, results, pause, dev console
   ========================================================= */
function showDeathScreen(k){
  cam.cine=null;const p=match.player;$('#dCaption').textContent=pick(CAPTIONS);
  $('#dKiller').innerHTML=k?'Eliminated by <b>'+esc(k.name)+'</b>, '+esc(k.st.role.toLowerCase())+', after '+fmtTime(match.time)+' of battle.':'Eliminated after '+fmtTime(match.time)+' of battle.';
  $('#dStats').innerHTML=[[p.kills,'Kills'],[Math.round(p.dmgDealt),'Damage'],[p.nestsKilled,'Nests'],[fmtTime(match.time),'Survived']].map(([v,k])=>'<div class="stat"><div class="v">'+v+'</div><div class="k">'+k+'</div></div>').join('');
  $('#dEarn').innerHTML=earnChips();$('#death').hidden=false;
}
function earnChips(){const e=match.earned;let h='<span class="chip xp">+'+e.xp+' XP</span><span class="chip dna">+'+e.dna+' DNA</span>';if(match.rot){const r=match.rot;const nm=r.kind==='daily'?'Daily':'Weekly';h+=e.rot?'<span class="chip lv">'+nm+' challenge complete · +'+r.xp+' XP</span>':(progress.daily[r.key]?'<span class="chip dim">'+nm+' challenge already claimed</span>':'<span class="chip bad">'+nm+' goal not met yet: '+esc(GOALS[r.goal].name)+'</span>');}for(const d of e.drops)h+='<span class="chip drop">Part drop: '+esc(d)+'</span>';for(const l of e.levels)h+='<span class="chip lv">Unlocked: '+esc(l)+'</span>';if(e.levels.length)h+='<span class="chip lv">Level '+progress.level+'</span>';return h;}
function showResults(){
  match.resultsShown=true;$('#death').hidden=true;$('#spectbar').hidden=true;hideTouch();
  if(match.mode==='challenge'&&typeof showChallengeResults==='function'){showChallengeResults();return;}
  if(match.rot&&typeof checkRotGoal==='function')checkRotGoal(true);
  const me=match.player;const won=me&&match.winner===me.team;
  const t=$('#rTitle');t.textContent=match.winner?(won?'Victory':'Defeat'):'Draw';t.className='restitle '+(match.winner?(won?'win':'lose'):'draw');
  $('#rReason').textContent=match.reason;$('#rBiome').textContent=world.map.biome.name+' · seed '+world.seed;
  let h='<tr><th>Creature</th><th>Role</th><th>Kills</th><th>Damage</th><th>Nests</th><th>Status</th></tr>';
  for(const c of world.creatures.slice().sort((a,b)=>a.team===b.team?b.kills-a.kills:a.team==='blue'?-1:1)){h+='<tr class="'+c.team+(c.isPlayer?' me':'')+'"><td>'+esc(c.isPlayer?'You ('+c.d.name+')':c.name)+'</td><td>'+c.st.role+'</td><td>'+c.kills+'</td><td>'+Math.round(c.dmgDealt)+'</td><td>'+c.nestsKilled+'</td><td class="'+(c.state==='dead'?'dead':'')+'">'+(c.state==='dead'?'Fossil':'Alive')+'</td></tr>';}
  $('#rBoard').innerHTML=h;$('#rEarn').innerHTML=earnChips();$('#rNew').textContent='Play again';$('#rMenu').textContent='Main menu';$('#results').hidden=false;
}
const optMap={optTimer:'timerIsHardLimit',optMain:'mainNestNeedsClearedLane',optFinish:'downedCanBeFinishedOff',optSpit:'nestsSpitGoo'};
for(const id in optMap){const el=$('#'+id);el.checked=!!S[optMap[id]];el.addEventListener('change',()=>{S[optMap[id]]=el.checked;});}
const savedSet=Sec.settings(store.get(SETTINGS_KEY,{}),Object.values(optMap));
function saveSettings(){store.set(SETTINGS_KEY,{bloom:quality.bloom,shadows:quality.shadows,sound:AudioFX.on,music:Music.on,toggles:{timerIsHardLimit:S.timerIsHardLimit,mainNestNeedsClearedLane:S.mainNestNeedsClearedLane,downedCanBeFinishedOff:S.downedCanBeFinishedOff,nestsSpitGoo:S.nestsSpitGoo}});}
if(savedSet.toggles)for(const k in savedSet.toggles)if(k in S)S[k]=!!savedSet.toggles[k];for(const id in optMap)$('#'+id).checked=!!S[optMap[id]];
for(const id in optMap)$('#'+id).addEventListener('change',saveSettings);
if(savedSet.bloom===false){quality.bloom=false;if(bloomPass)bloomPass.enabled=false;}if(savedSet.shadows===false){quality.shadows=false;sun.castShadow=false;}if(savedSet.sound===false)AudioFX.on=false;if(savedSet.music===false)Music.on=false;
$('#optBloom').checked=quality.bloom;$('#optBloom').addEventListener('change',e=>{quality.bloom=e.target.checked;if(bloomPass)bloomPass.enabled=quality.bloom;saveSettings();});
if(!composer){$('#optBloom').disabled=true;$('#optBloom').closest('.opt').querySelector('span').textContent='Not available on this device.';}
$('#optShadows').checked=quality.shadows;$('#optShadows').addEventListener('change',e=>{quality.shadows=e.target.checked;sun.castShadow=quality.shadows;saveSettings();});
$('#optSound').checked=AudioFX.on;$('#optSound').addEventListener('change',e=>{AudioFX.on=e.target.checked;saveSettings();});
$('#optMusic').checked=Music.on;$('#optMusic').addEventListener('change',e=>{Music.setOn(e.target.checked);updateMusicBtn();saveSettings();});
function updateMusicBtn(){$('#musicLbl').textContent=Music.on?'Music on':'Music off';$('#musicBtn').setAttribute('aria-pressed',String(Music.on));}
$('#musicBtn').addEventListener('click',()=>{AudioFX.init();Music.setOn(!Music.on);$('#optMusic').checked=Music.on;updateMusicBtn();saveSettings();musicFor();});updateMusicBtn();
function musicFor(){if(!AudioFX.ctx)return;Music.start(phase==='battle'?(match&&match.mode==='test'?'build':'battle'):phase==='build'?'build':'menu');}
addEventListener('pointerdown',()=>{AudioFX.init();musicFor();},{capture:true});
function openPause(){if(phase!=='battle'||!match)return;paused=true;$('#pause').hidden=false;exitLock();$('#quitBtn').textContent=match.mode==='test'?'Back to Workshop':'Quit to menu';}
function closePause(){paused=false;$('#pause').hidden=true;if(match&&!match.eliminated&&!match.over&&!isCoarse)requestLock();}
$('#resumeBtn').addEventListener('click',()=>{sfx('ui');closePause();});
$('#quitBtn').addEventListener('click',()=>{sfx('ui');paused=false;$('#pause').hidden=true;if(match&&match.mode==='test')endTestDrive();else if(match&&match.mode==='challenge'&&typeof quitChallenge==='function')quitChallenge();else openMenu();});
$('#pauseBtn').addEventListener('click',()=>{if(paused)closePause();else openPause();});
$('#newBtn').addEventListener('click',()=>{sfx('ui');openBuild();});
$('#dMenu').addEventListener('click',()=>{sfx('ui');openMenu();});
$('#rNew').addEventListener('click',()=>{sfx('ui');if(match&&match.mode==='challenge')retryChallenge();else openBuild(match&&match.rot?{rot:match.rot}:{});});
$('#rMenu').addEventListener('click',()=>{sfx('ui');if(match&&match.mode==='challenge')openChallenges();else openMenu();});
$('#spectNew').addEventListener('click',()=>{sfx('ui');openBuild();});
$('#spectBtn').addEventListener('click',()=>{sfx('ui');$('#death').hidden=true;cam.spect=null;cycleSpect(0);});
$('#spectPrev').addEventListener('click',()=>cycleSpect(-1));$('#spectNext').addEventListener('click',()=>cycleSpect(1));
$('#ffBtn').addEventListener('click',()=>{ffMul=ffMul===1?2:ffMul===2?4:1;$('#ffBtn').textContent='Speed '+ffMul+'×';});

const DEV={open:false,god:false,auto:false};
const devlog=$('#devlog'),devin=$('#devin');
function dlog(s){devlog.textContent+=s+'\n';devlog.scrollTop=devlog.scrollHeight;}
function toggleDev(force){if(!DEV_BUILD){DEV.open=false;return;}DEV.open=force==null?!DEV.open:force;$('#devcon').hidden=!DEV.open;if(DEV.open){exitLock();for(const k in keys)keys[k]=false;setTimeout(()=>devin.focus(),0);if(!devlog.textContent)dlog('Creature Clash dev console. Type help for commands.');}else{devin.blur();if(phase==='battle'&&match&&!match.over&&!match.eliminated&&!paused&&!isCoarse)requestLock();}}
const COMMANDS={
  help:()=>dlog('addDNA [n]      add DNA (default 10)\nresetDNA        set DNA to 0\nunlockAllParts  unlock every creature part\nspawnBot [team] spawn a test bot in front of the camera (red or blue)\ngodMode         toggle invincibility\naddXP [n]       SUGGESTION: add XP (default 100)\nclear           clear this log'),
  clear:()=>{devlog.textContent='';},
  addDNA:a=>{const v=Sec.devAmount(a,10,1,100000);if(v==null){dlog('addDNA takes a whole number from 1 to 100000.');return;}progress.dna=Math.min(Sec.DNA_MAX,progress.dna+v);saveProgress();dlog('DNA +'+v+' → '+progress.dna);if(phase==='workshop')renderPalette();refreshMenu();},
  resetDNA:()=>{progress.dna=0;saveProgress();dlog('DNA reset to 0');if(phase==='workshop')renderPalette();refreshMenu();},
  unlockAllParts:()=>{for(const k in PARTS){if(PARTS[k].tier!=='Free'&&!progress.unlocked.includes(k))progress.unlocked.push(k);}saveProgress();dlog('All parts unlocked. They still cost DNA to buy.');if(phase==='workshop')renderPalette();refreshMenu();},
  spawnBot:a=>{if(phase!=='battle'||!match){dlog('Start a battle first.');return;}const team=(a||'red').toLowerCase()==='blue'?'blue':'red';const c=spawnCreature(pick(BOT_PRESETS),team,false,pick(BOT_NAMES)+' (test)',0,1,pick(BOT_COLORS));
    c.x=clamp(cam.fx+Math.sin(cam.yaw)*6,-90,90);c.z=clamp(cam.fz+Math.cos(cam.yaw)*6,-world.map.zMax,world.map.zMax);c.y=world.map.heightAt(c.x,c.z)+2;c.lane=world.map.laneAt(c.x,c.z);dlog('Spawned '+c.name+' on '+team+'.');},
  godMode:()=>{DEV.god=!DEV.god;dlog('God mode '+(DEV.god?'ON':'OFF'));},
  addXP:a=>{const v=Sec.devAmount(a,100,1,100000);if(v==null){dlog('addXP takes a whole number from 1 to 100000.');return;}const u=grantXP(v);dlog('XP +'+v+' → level '+progress.level+(u.length?' · unlocked '+u.join(', '):''));if(phase==='workshop')renderPalette();refreshMenu();},
};
devin.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='Escape'||e.code==='Backquote'){e.preventDefault();toggleDev(false);return;}
  if(e.ctrlKey&&e.shiftKey&&e.code==='KeyC'){e.preventDefault();toggleDev(false);return;}
  if(e.key==='Enter'&&!DEV_BUILD){devin.value='';return;}
  if(e.key==='Enter'){const raw=devin.value.trim();devin.value='';if(!raw)return;dlog('> '+raw);const [cmd,...rest]=raw.split(/\s+/);const fn=COMMANDS[cmd]||COMMANDS[Object.keys(COMMANDS).find(k=>k.toLowerCase()===cmd.toLowerCase())];if(fn)fn(rest[0]);else dlog('Unknown command. Type help.');}});

/* =========================================================
   Main loop
   ========================================================= */
let last=performance.now();const clock={t:0};
function frame(now){
  requestAnimationFrame(frame);
  const rdt=Math.min(.05,(now-last)/1000);last=now;
  if(phase==='intro'){updateIntro(rdt,now);renderFrame(now*.001,0);return;}
  if(build)updateBuild(rdt);
  if(AudioFX.ctx&&((frame.n=(frame.n||0)+1)%30===0))musicFor();
  if(phase==='workshop'){updateStudio(rdt,now);renderFrame(now*.001,0);return;}
  if(!world)return;
  const dt=paused?0:rdt*timeScale*(match&&match.eliminated&&!match.over?ffMul:1)*(phase==='battle'?A11Y.gameSpeed:1);
  clock.t+=dt;
  if(phase==='battle'&&match&&!paused){const steps=Math.ceil(dt/.02);const sd=dt/Math.max(1,steps);for(let i=0;i<steps;i++)simulate(sd);}
  else if(phase==='menu'||phase==='build'){for(const n of world.neutrals)idleNeutral(n,rdt);}
  updateCamera(rdt);
  const adt=phase==='battle'?dt:rdt;
  for(const c of world.creatures){c.showCamo=match&&match.player&&c.team===match.player.team;animateCreatureView(c,dt,clock.t);}
  for(const n of world.neutrals){if(!n.alive){n.view.root.visible=false;continue;}n.view.root.visible=true;animateCreatureView(n,adt,clock.t+(phase!=='battle'?now*.001:0));}
  for(const n of world.nests)animateNest(n,adt,now*.001);
  updateParticles(adt);
  updateFloatTexts(rdt);updateBanner(rdt);updateHUD(rdt);updateLabels();
  if(skyMesh){skyMesh.material.uniforms.time.value=now*.001;skyMesh.position.copy(camera.position);}
  if(planet)planet.rotation.y+=rdt*.01;
  const desat=match&&cam.cine&&!match.resultsShown&&$('#death').hidden?.55:0;
  renderFrame(now*.001,desat);
}
function idleNeutral(n,dt){if(!n.alive)return;n.wanderT-=dt;if(n.wanderT<=0){n.wanderT=2+Math.random()*3;const a=Math.random()*TAU,r=Math.random()*(n.type==='boss'?3:6);n.tx=n.hx+Math.cos(a)*r;n.tz=n.hz+Math.sin(a)*r;}
  const d=Math.hypot(n.tx-n.x,n.tz-n.z);const sp=n.type==='boss'?1.2:1.8;if(d>.5){n.vx=(n.tx-n.x)/d*sp;n.vz=(n.tz-n.z)/d*sp;n.yaw+=angDiff(n.yaw,Math.atan2(n.vx,n.vz))*Math.min(1,dt*4);}else{n.vx*=.9;n.vz*=.9;}
  n.x+=n.vx*dt;n.z+=n.vz*dt;n.y=world.map.heightAt(n.x,n.z);}

/* boot */
startIntro();
requestAnimationFrame(frame);
if(DEV_BUILD)window.__cc={get world(){return world;},get match(){return match;},get build(){return build;},get progress(){return progress;},S,PRESETS,BOT_PRESETS,PARTS,validateDesign,calcStats,openBuild,openWorkshop,openMenu,startTestDrive,lockAndBegin,A11Y,applyA11y,renderA11y,applyPreset,addCaption,announce,TEAMS,startCampaign,CAMPAIGN,openChallenges,rotating,CONSTRAINTS,
  get ws(){return ws;},wsApi:{pickPart,removeSel,doUndo,renderPalette,endTestDrive,tryBuyPart},autoPilot:(on)=>{DEV.auto=!!on;if(match&&match.player&&!match.player.brain)match.player.brain={t:0,mode:'lane',target:null,laneI:-1,retreat:false,atkT:0,jit:0};}};
