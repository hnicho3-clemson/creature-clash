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
/* live 3D home stage: your spirit and two teammates idling in the grove */
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
const HOME_TIPS=['Long legs are fast, but wobbly creatures tip over easily!','Shells and bark plates shrug off bites and claws.','Venom stingers are great against armored creatures.','Hold your revive button next to a knocked-down teammate to save them.','Lure enemies onto puffball vents to launch them sky high!','Beating the Grand Gobbler gives your whole team a boost.','Mystery seeds sprout into new parts as you level up.','Try the Workshop Test Drive to practice with new parts.','Watch out for rolling mossballs crossing the lanes!','Pick a head sprout in the Workshop Body tab: twin leaf, flower bud, toadstool and more!','Big ears and wide eyes help you spot enemies on the minimap.'];
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
  $('#bList').innerHTML=opts.map(o=>'<button class="bopt'+(o.key===build.choiceKey?' sel':'')+(o.ok?'':' bad')+'" data-key="'+o.key+'"'+(o.ok?'':' aria-disabled="true"')+'><img alt="" src="'+Portrait.design(o.design)+'"><span><b>'+esc(o.design.name)+'</b><small>'+esc(o.label)+' · '+(()=>{const q=calcStats(o.design);return q.styleAuto?q.role:STYLES[q.style].name+' style';})()+'</small>'+(o.ok?'':'<small class="why">'+esc(o.why)+'</small>')+'</span></button>').join('');
  $$('#bList .bopt').forEach(b=>b.addEventListener('click',()=>{const o=opts.find(x=>x.key===b.dataset.key);if(!o)return;if(!o.ok){sfx('deny');return;}sfx('ui');selectBuildChoice(o.key,o.design);renderBuild();}));
  const d=build.choice;const st=calcStats(d);
  $('#bPick').innerHTML='<img class="bigpor" alt="" src="'+Portrait.design(d)+'"><div class="bpname">'+esc(d.name)+'</div><div class="chiprow"><span class="chip role">'+st.role+'</span>'+(st.special?'<span class="chip sp">'+SPECIALS[st.special].name+'</span>':'')+st.attacks.map(a=>'<span class="chip">'+esc(a.name)+'</span>').join('')+'</div>'+statBars(st)+
    '<div class="bstyle" role="group" aria-label="Play style"><span class="lbl">Play style</span><div class="bsty">'+['auto'].concat(STYLE_IDS).map(id=>{const on=id==='auto'?st.styleAuto:(!st.styleAuto&&st.style===id);return '<button data-bsty="'+id+'" aria-pressed="'+on+'">'+styleIcon(id)+(id==='auto'?'Auto':esc(STYLES[id].name))+'</button>';}).join('')+'</div>'+
    '<p class="bperk">'+esc(STYLES[st.style].name)+(st.styleAuto?' (auto)':'')+' · '+esc(STYLES[st.style].perkText)+'</p></div>';
  $$('#bPick [data-bsty]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.bsty;const d2=build.choice;if(id==='auto')delete d2.style;else d2.style=id;sfx('ui');
    const k=build.choiceKey;if(k&&k.startsWith('slot')){const i=+k.slice(4);if(slots[i]){if(id==='auto')delete slots[i].style;else slots[i].style=id;saveSlots();}}else if(k==='custom'&&build.custom){build.custom=clone(d2);}
    renderBuild();}));
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
function ringTex(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#b88a58';x.fillRect(0,0,512,512);const R=mulberry32(5);
  for(let r=250;r>6;r-=6+R()*9){x.strokeStyle='rgba(90,56,30,'+(.25+R()*.35)+')';x.lineWidth=1+R()*2.2;x.beginPath();for(let k=0;k<=64;k++){const a=k/64*TAU;const rr=r*(1+(Math.sin(a*3+r)*.012));const px=256+Math.cos(a)*rr,py=256+Math.sin(a)*rr;if(k)x.lineTo(px,py);else x.moveTo(px,py);}x.stroke();}
  const g=x.createRadialGradient(256,256,200,256,256,256);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(40,24,10,.75)');x.fillStyle=g;x.fillRect(0,0,512,512);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}
/* Workshop set: a moonlit glade with a tree-stump stage, glowing flower lanterns and drifting pollen */
function initStudio(){
  if(studio.ready)return;studio.ready=true;const sc=studio.scene;
  sc.background=col('#050c0a');sc.fog=new T.FogExp2(col('#08140f'),.036);
  const B={skyTop:'#020806',skyMid:'#0a1e1a',skyHorizon:'#24463a',wall:'#020604',sun:'#fff1d8'};
  sc.environment=makeEnvMap(B).texture;
  const sky=new T.Mesh(new T.SphereGeometry(300,24,12),skyMaterial({skyTop:'#010403',skyMid:'#061612',skyHorizon:'#12302a',wall:'#010302'},.6));sky.material.fog=false;sky.renderOrder=-1;sc.add(sky);studio.sky=sky;
  // lighting: warm moonbeam key, mint spirit rim, soft blossom fill, glow from the stump
  const hemiS=new T.HemisphereLight(0xb8e0c8,0x0c140a,.3);sc.add(hemiS);studio.hemi=hemiS;
  const key=new T.SpotLight(0xfff0d0,1.5,0,.5,.65,1);key.position.set(-3.5,10,5.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;key.shadow.normalBias=.03;key.shadow.camera.near=2;key.shadow.camera.far=30;sc.add(key);sc.add(key.target);key.target.position.set(0,1,0);studio.key=key;
  const rim=new T.SpotLight(0x8fffd0,2.2,0,.55,.7,1);rim.position.set(5,6,-7);sc.add(rim);sc.add(rim.target);rim.target.position.set(0,1.2,0);
  const rim2=new T.SpotLight(0xffa8cc,1.1,0,.6,.8,1);rim2.position.set(-7,4,-4);sc.add(rim2);sc.add(rim2.target);rim2.target.position.set(0,1,0);
  const under=new T.PointLight(0xffd88a,.5,7,2);under.position.set(0,.3,0);sc.add(under);
  const bark=new T.MeshPhysicalMaterial({color:col('#5a3e28'),roughness:.92,normalMap:skinTex('scales').normal,normalScale:new T.Vector2(2.4,2.4)});
  const mossM=new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,flatShading:true});
  const glow=(c,i)=>new T.MeshBasicMaterial({color:col(c).multiplyScalar(i),toneMapped:false});
  // the stump stage
  const stump=new T.Mesh(new T.CylinderGeometry(4.1,4.6,1.4,48,2),bark);stump.position.y=-.7;stump.receiveShadow=true;stump.castShadow=true;sc.add(stump);
  const top=new T.Mesh(new T.CircleGeometry(4.1,64),new T.MeshStandardMaterial({map:ringTex(),roughness:.85}));top.rotation.x=-Math.PI/2;top.position.y=.005;top.receiveShadow=true;sc.add(top);
  const mossRim=new T.Mesh(new T.TorusGeometry(4.1,.22,8,64),mossM);mossRim.rotation.x=Math.PI/2;mossRim.scale.z=.6;mossRim.position.y=0;sc.add(mossRim);
  for(let k=0;k<7;k++){const a=k/7*TAU+.3;const x0=Math.cos(a)*4.1,z0=Math.sin(a)*4.1,x1=Math.cos(a+.15)*7.2,z1=Math.sin(a+.15)*7.2;
    const rt=new T.Mesh(taperTube([[x0*.95,-.2,z0*.95],[x0*1.25,-.55,z0*1.25],[x1,-.9,z1]],.55,.12,{segs:16,radial:10}),bark);rt.castShadow=true;rt.receiveShadow=true;sc.add(rt);}
  const segs=new T.Group();for(let k=0;k<6;k++){const a=new T.Mesh(new T.RingGeometry(2.25,2.36,24,1,k/6*TAU,TAU/6*.6),new T.MeshBasicMaterial({color:col('#ffd88a').multiplyScalar(1.1),toneMapped:false,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}));segs.add(a);}segs.rotation.x=-Math.PI/2;segs.position.y=.012;sc.add(segs);studio.segs=segs;
  // forest floor, ferns and little toadstools
  const floor=new T.Mesh(new T.CircleGeometry(40,64),new T.MeshStandardMaterial({color:col('#24381e'),roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.9;floor.receiveShadow=true;sc.add(floor);
  const R=mulberry32(91);const leaf=new T.SphereGeometry(1,8,6);leaf.scale(.22,.04,.9);leaf.translate(0,0,.9);
  const fernM=new T.MeshStandardMaterial({color:col('#3f7a34'),roughness:.8,side:T.DoubleSide});
  for(let k=0;k<26;k++){const a=R()*TAU,r=6.5+R()*6;const g=new T.Group();g.position.set(Math.cos(a)*r,-.9,Math.sin(a)*r);g.scale.setScalar(.8+R()*.9);for(let i=0;i<7;i++){const f=new T.Mesh(leaf,fernM);f.rotation.set(-.5-(i%2)*.3,i/7*TAU,0);g.add(f);}sc.add(g);}
  const capM=new T.MeshPhysicalMaterial({color:col('#d9473b'),roughness:.4,clearcoat:.7}),stemM=new T.MeshStandardMaterial({color:col('#efe2c4'),roughness:.8});
  for(let k=0;k<12;k++){const a=R()*TAU,r=5+R()*7;const s=.4+R()*.7;const st=new T.Mesh(new T.CylinderGeometry(.12*s,.18*s,.9*s,8),stemM);st.position.set(Math.cos(a)*r,-.9+.45*s,Math.sin(a)*r);sc.add(st);
    const cp=new T.Mesh(new T.SphereGeometry(.5*s,16,8,0,TAU,0,Math.PI/2),capM);cp.scale.y=.7;cp.position.set(st.position.x,-.9+.88*s,st.position.z);cp.castShadow=true;sc.add(cp);}
  // a ring of giant trunks with hanging moss
  for(let k=0;k<14;k++){const a=k/14*TAU+R()*.2;const r=15+R()*4;const tr=new T.Mesh(new T.CylinderGeometry(1+R()*.6,1.8+R()*.8,40,10),bark);tr.position.set(Math.cos(a)*r,18,Math.sin(a)*r);sc.add(tr);
    for(let v=0;v<3;v++){const vn=new T.Mesh(new T.CylinderGeometry(.04,.14,4+R()*5,4),mossM);vn.position.set(tr.position.x+(R()-.5)*2.4,9+R()*5,tr.position.z+(R()-.5)*2.4);sc.add(vn);}}
  // glowing flower lanterns, each with a floating seed and drifting motes
  studio.tubes=[];const tubeCols=['#8fffd0','#ffa8cc','#ffd88a','#b8a0ff','#8fffd0','#ffd88a'];
  for(let k=0;k<6;k++){const a=k/6*TAU+.52;const g=new T.Group();g.position.set(Math.cos(a)*9,-.9,Math.sin(a)*9);const c=tubeCols[k];
    const stem=new T.Mesh(taperTube([[0,0,0],[.3,2.4,0],[0,4.2,0],[-.5,5.2,0]],.12,.07,{segs:20,radial:8}),new T.MeshStandardMaterial({color:col('#3f6a34'),roughness:.7}));g.add(stem);
    for(const s of [-1,1]){const lf=new T.Mesh(leaf,fernM);lf.position.set(.1,1.2+s*.3,0);lf.rotation.set(-.3,s>0?0:Math.PI,0);lf.scale.setScalar(1.1);g.add(lf);}
    const bulb=new T.Mesh(new T.SphereGeometry(1,32,20,0,TAU,0,Math.PI*.78),new T.MeshPhysicalMaterial({color:col(c),emissive:col(c),emissiveIntensity:.35,roughness:.3,transparent:true,opacity:.4,side:T.DoubleSide,depthWrite:false}));bulb.rotation.z=Math.PI;bulb.position.set(-.5,4.4,0);bulb.scale.set(1,1.2,1);g.add(bulb);
    const liq=new T.Mesh(new T.SphereGeometry(.7,20,14),new T.MeshBasicMaterial({color:col(c).multiplyScalar(.6),transparent:true,opacity:.35,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));liq.position.set(-.5,3.9,0);g.add(liq);
    const spec=new T.Mesh(new T.IcosahedronGeometry(.28,3),glow(c,2.2));spec.position.set(-.5,3.9,0);g.add(spec);
    const bub=[];for(let i=0;i<7;i++){const b=new T.Mesh(sphereG(),new T.MeshBasicMaterial({color:col(c).multiplyScalar(1.6),toneMapped:false,transparent:true,opacity:.7}));b.scale.setScalar(.03+Math.random()*.04);b.position.set(-.5+(Math.random()-.5)*1.2,.8+Math.random()*3.8,(Math.random()-.5)*1.2);g.add(b);bub.push(b);}
    sc.add(g);studio.tubes.push({g,spec,bub,ph:Math.random()*TAU,base:3.9});}
  // a spiralling vine of glowing buds
  const helix=new T.Group();helix.position.set(-6.2,.2,-4.2);const hm1=glow('#8fffd0',1.6),hm2=glow('#ffa8cc',1.6);const vm=new T.MeshStandardMaterial({color:col('#4f8a34'),roughness:.7});
  const vp=[];for(let i=0;i<34;i++){const y=i*.17,a=i*.42;vp.push([Math.cos(a)*.55,y,Math.sin(a)*.55]);if(i%3===0){const bud=new T.Mesh(sphereG(),i%2?hm1:hm2);bud.scale.setScalar(.09);bud.position.set(Math.cos(a)*.62,y,Math.sin(a)*.62);helix.add(bud);const lf=new T.Mesh(leaf,vm);lf.scale.setScalar(.35);lf.position.set(Math.cos(a)*.55,y,Math.sin(a)*.55);lf.rotation.y=-a;helix.add(lf);}}
  helix.add(new T.Mesh(taperTube(vp,.05,.03,{segs:80,radial:6}),vm));
  const hb=new T.Mesh(new T.DodecahedronGeometry(.9,0),new T.MeshStandardMaterial({color:col('#6a6e62'),roughness:.9,flatShading:true}));hb.scale.y=.5;hb.position.y=-.8;helix.add(hb);
  sc.add(helix);studio.helix=helix;
  // light shaft from the canopy
  const cone=new T.Mesh(new T.ConeGeometry(3.4,10,48,1,true),new T.MeshBasicMaterial({color:col('#fff0d0'),transparent:true,opacity:.012,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}));cone.position.set(0,4.6,0);sc.add(cone);studio.cone=cone;
  // spirit scan ring
  const scan=new T.Mesh(new T.TorusGeometry(1,.012,6,96),new T.MeshBasicMaterial({color:col('#8fffd0').multiplyScalar(2),toneMapped:false,transparent:true,opacity:.8}));scan.rotation.x=Math.PI/2;sc.add(scan);studio.scan=scan;
  // drifting pollen and fireflies
  const N=320,dp=new Float32Array(N*3);for(let i=0;i<N;i++){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*9;dp[i*3]=Math.cos(a)*r;dp[i*3+1]=Math.random()*9;dp[i*3+2]=Math.sin(a)*r;}
  const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dp,3));
  const dust=new T.Points(dg,new T.PointsMaterial({color:col('#ffe9a0').multiplyScalar(1.5),size:.06,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sc.add(dust);studio.dust=dust;
  const mk=(c,s)=>{const m=new T.Mesh(new T.TorusGeometry(.32,.035,8,40),new T.MeshBasicMaterial({color:col(c).multiplyScalar(3),toneMapped:false,depthTest:false,transparent:true}));m.renderOrder=10;m.visible=false;m.scale.setScalar(s||1);sc.add(m);return m;};
  studio.hover=mk('#ffa8cc');studio.sel=[mk('#8fffd0'),mk('#8fffd0')];
  studio.ray=new T.Raycaster();studio.ptr=new T.Vector2();
}
const ws={design:null,slot:-1,sel:-1,placing:null,tab:'Body',mode:'menu',drag:null,orbit:null,undo:[],redo:[],moved:false,statsOpen:false,dirty:false,lastNudge:0,confirm:null};
function openWorkshop(mode,design,slot){
  initStudio();exitLock();hideTouch();
  ws.mode=mode;ws.slot=slot==null?-1:slot;
  if(design)ws.design=clone(design);else if(ws.slot>=0&&slots[ws.slot])ws.design=clone(slots[ws.slot]);else if(!ws.design){const i=slots.findIndex(Boolean);ws.slot=i;ws.design=i>=0?clone(slots[i]):newDesign();}
  if(mode==='build'&&ws.slot<0)ws.design.name=ws.design.name.replace(/^(?!My )/,'My ');
  ws.sel=-1;ws.placing=null;ws.undo=[];ws.redo=[];ws.dirty=false;ws.confirm=null;
  phase='workshop';showScreen('workshop');setRenderView(studio.scene,studio.cam,.82);
  $('#wsMode').textContent=mode==='build'?'Build phase edit':'Workshop';$('#wsTimer').hidden=mode!=='build';$('#wsTest').hidden=mode==='build';
  $('#wsDone').textContent=mode==='build'?'Use this creature':'Main menu';
  {const li=store.get(SaveKey('studioLight'),0);setStudioLight(Number.isInteger(li)&&li>=0&&li<LIGHT_MODES.length?li:0);}rebuildStudio(true);renderTabs();renderPalette();renderSlots();renderStats();renderSel();hint();setDirty(false);
}
function closeStudio(){if(studio.view){disposeView(studio.view);studio.view=null;}studio.hover.visible=false;for(const s of studio.sel)s.visible=false;}
function rebuildStudio(resetCam){
  if(studio.view)disposeView(studio.view);
  const v=buildCreatureView(ws.design,{});studio.scene.add(v.root);studio.view=v;
  studio.ent={x:0,y:0,z:0,yaw:0,vx:0,vy:0,vz:0,kx:0,kz:0,state:'alive',grounded:true,view:v};
  if(resetCam){studio.dist=clamp(v.height*2.4+3,6,13);}studio.ty=v.height*.5;
  updateSelMarkers();
}
function pushUndo(){ws.undo.push(JSON.stringify(ws.design));if(ws.undo.length>60)ws.undo.shift();ws.redo.length=0;setDirty(true);}
function setDirty(v){ws.dirty=v;const b=$('#wsSave');if(b){b.textContent=v?'Save •':'Save';b.title=v?'You have unsaved changes':'Saved';}updateUndoBtns();}
function updateUndoBtns(){const u=$('#wsUndo'),r=$('#wsRedo');if(u)u.disabled=!ws.undo.length;if(r)r.disabled=!ws.redo.length;}
function changed(rebuild){if(rebuild!==false)rebuildStudio();renderStats();renderSlots();renderPalette();}
const FAM_TABS=['Style','Body'].concat(FAMS);
// side panels sit just under the top bar, however many rows its buttons wrap to
if(window.ResizeObserver){const top=$('#wsTop');new ResizeObserver(()=>{if(top.offsetHeight)$('#workshop').style.setProperty('--wstop',(top.offsetTop+top.offsetHeight-10)+'px');}).observe(top);}
function renderTabs(){$('#wsTabs').innerHTML=FAM_TABS.map(t=>'<button role="tab" aria-selected="'+(t===ws.tab)+'" data-tab="'+t+'">'+t+'</button>').join('');$$('#wsTabs button').forEach(b=>b.addEventListener('click',()=>{ws.tab=b.dataset.tab;sfx('ui');renderTabs();renderPalette();}));}
function renderPalette(){
  const el=$('#wsPal');
  if(ws.tab==='Style'){renderStylePalette(el);return;}
  if(ws.tab==='Body'){const b=ws.design.body;const sw=(which)=>SWATCHES.map(c=>'<button class="sw'+(ws.design[which]===c?' on':'')+'" data-w="'+which+'" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>').join('')+'<label class="swc" aria-label="Custom color"><input type="color" data-w="'+which+'" value="'+ws.design[which]+'"></label>';
    el.innerHTML='<div class="bodyed">'+[['w','Width',.7,1.6],['h','Height',.7,1.5],['l','Length',.8,1.8]].map(([k,n,a,z])=>'<label class="sl"><span>'+n+'</span><input type="range" id="bd_'+k+'" min="'+a+'" max="'+z+'" step=".01" value="'+b[k]+'"><output>'+b[k].toFixed(2)+'</output></label>').join('')+
      '<div class="sect">Pattern</div><div class="pats">'+PATTERNS.map(p=>'<button class="chip'+(ws.design.pattern===p?' on':'')+'" data-pat="'+p+'">'+p+'</button>').join('')+'</div>'+
      '<div class="sect">Head sprout</div><div class="pats">'+SPROUTS.map(k=>'<button class="chip'+(sproutKind(ws.design)===k?' on':'')+'" data-spr="'+k+'" aria-pressed="'+(sproutKind(ws.design)===k)+'">'+SPROUT_NAMES[k]+'</button>').join('')+'</div>'+(ws.design.parts.some(x=>PARTS[x.id]&&PARTS[x.id].build==='hat')?'<p class="note">Hats sit where the sprout grows, so the sprout hides while a hat is on.</p>':'')+
      '<div class="sect">Main color</div><div class="sws">'+sw('color')+'</div><div class="sect">Accent color</div><div class="sws">'+sw('accent')+'</div></div>';
    for(const k of ['w','h','l']){const s=$('#bd_'+k);s.addEventListener('pointerdown',()=>pushUndo());s.addEventListener('input',()=>{ws.design.body[k]=+s.value;s.nextElementSibling.textContent=(+s.value).toFixed(2);rebuildStudio();renderStats();});}
    $$('#wsPal [data-pat]').forEach(x=>x.addEventListener('click',()=>{pushUndo();ws.design.pattern=x.dataset.pat;sfx('ui');changed();}));
    $$('#wsPal [data-spr]').forEach(x=>x.addEventListener('click',()=>{pushUndo();ws.design.sprout=x.dataset.spr;sfx('ui');changed();}));
    $$('#wsPal .sw').forEach(x=>x.addEventListener('click',()=>{pushUndo();ws.design[x.dataset.w]=x.dataset.c;sfx('ui');changed();}));
    $$('#wsPal input[type=color]').forEach(x=>{x.addEventListener('change',()=>{pushUndo();ws.design[x.dataset.w]=x.value;changed();});});
    return;}
  const ids=Object.keys(PARTS).filter(k=>PARTS[k].fam===ws.tab).sort((a,b)=>PARTS[a].lv-PARTS[b].lv);
  el.innerHTML='<div class="pgrid">'+ids.map(id=>{const d=PARTS[id];
    if(!isUnlocked(id))return '<div class="pc pod"><div class="podimg" aria-hidden="true"></div><span class="pn">Mystery seed</span><span class="pf">Level up to unlock</span></div>';
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
  if(d.fam==='Weapon'){const wi=ws.design.parts.findIndex(p=>PARTS[p.id]&&PARTS[p.id].fam==='Weapon');
    if(wi>=0){if(ws.design.parts[wi].id===id){ws.sel=wi;ws.placing=null;sfx('ui');renderPalette();renderSel();hint('That weapon is already equipped. Drag it to move it.');return;}
      pushUndo();const old=PARTS[ws.design.parts[wi].id].name;ws.design.parts[wi].id=id;ws.design.parts[wi].m=false;ws.sel=wi;ws.placing=null;sfx('place');changed();renderSel();hint('Swapped '+old+' for '+d.name+'. Creatures have one weapon slot.');return;}}
  if(d.max&&ws.design.parts.filter(p=>p.id===id).length>=d.max){sfx('deny');hint('You can only have '+d.max+' '+d.name+'.');return;}
  ws.placing=ws.placing===id?null:id;ws.sel=-1;sfx('ui');renderPalette();renderSel();hint();
  if(isCoarse&&ws.placing){/* on phones, quick-place at the default spot */pushUndo();ws.design.parts.push({id,p:norm3(d.def||[0,1,0]),s:1,r:0,m:d.mirror!==false});ws.sel=ws.design.parts.length-1;ws.placing=null;sfx('place');changed();renderSel();hint('Placed. Drag it on your creature to move it.');}
}
function hint(t){const el=$('#wsHint');if(t){el.textContent=t;return;}
  el.textContent=ws.placing?'Click your creature to attach '+PARTS[ws.placing].name+'. Hold Shift to place several. Esc cancels.':ws.sel>=0?(isCoarse?'Drag the part to move it.':'Drag or use the arrow keys to move it. [ ] resizes, Q and E twist, Delete removes.'):isCoarse?'Tap a part to add it. Drag to spin the camera.':'Pick a part, then click your creature to attach it. Drag empty space to orbit, scroll to zoom.';}
function renderSlots(){
  const n=slotCount();let h='';for(let i=0;i<n;i++){const d=slots[i];const v=d?validateDesign(d):null;h+='<button class="slot'+(i===ws.slot?' on':'')+(v&&!v.selectable?' warn':'')+'" data-slot="'+i+'" title="'+(d?esc(d.name)+(v&&!v.selectable?' · can’t be selected: '+esc(v.issues[0]||'uses parts you don’t own'):''):'Empty slot')+'"><span>'+(i+1)+'</span>'+(d?'<img alt="" src="'+Portrait.design(d)+'">':'<em>Empty</em>')+'</button>';}
  $('#wsSlots').innerHTML=h;updateTopDna();
  $$('#wsSlots .slot').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.slot;if(i===ws.slot&&!ws.dirty)return;
    if(ws.dirty&&slots[i]&&ws.confirm!=='slot'+i){ws.confirm='slot'+i;sfx('deny');hint('You have unsaved changes. Click slot '+(i+1)+' again to switch anyway, or Save first.');return;}
    ws.confirm=null;sfx('ui');ws.slot=i;if(slots[i]){ws.design=clone(slots[i]);ws.undo=[];ws.redo=[];ws.sel=-1;ws.placing=null;rebuildStudio(true);setDirty(false);}else{hint('Empty slot selected. Save to store this creature here.');}$('#wsName').value=ws.design.name;renderSlots();renderStats();renderPalette();renderSel();}));
  $('#wsName').value=ws.design.name;
}
function renderStats(){
  const v=validateDesign(ws.design);const st=v.stats;const bar=(k,val,max)=>{const f=val/max;return '<div class="bud'+(f>1?' over':'')+'"><span>'+k+'</span><i><b style="width:'+clamp(f*100,2,100).toFixed(0)+'%"></b></i><span>'+(Number.isInteger(val)?val:val.toFixed(1))+' / '+max+'</span></div>';};
  let issues='';for(const s of v.issues)issues+='<li>'+esc(s)+'</li>';if(v.notOwned.length)issues+='<li>Buy or remove: '+v.notOwned.map(id=>esc(PARTS[id].name)).join(', ')+'</li>';
  const sty=STYLES[st.style];
  const styleBox='<div class="stylebox"><div class="styhead">'+styleIcon(st.style)+'<b>'+esc(sty.name)+'</b><small>'+(st.styleAuto?'Auto':'Play style')+'</small><button class="btn small ghost" id="wsStyleGo">Change</button></div><p>'+esc(sty.perkText)+'</p>'+
    (!st.styleAuto&&ROLE_STYLE[st.role]!==st.style?'<p class="stymis">Your parts play more like a '+esc(STYLES[ROLE_STYLE[st.role]].name)+'. The perk still applies.</p>':'')+'</div>';
  $('#wsStats').innerHTML=styleBox+'<div class="mehead"><span class="chip role">'+st.role+'</span>'+(st.special?'<span class="chip sp">'+SPECIALS[st.special].name+'</span>':'<span class="chip dim">No special</span>')+'</div>'+statBars(st)+
    '<div class="sect">Budget</div>'+bar('Weight',st.weight,BUDGET.weight)+bar('Complexity',st.complexity,BUDGET.complexity)+bar('Parts',st.partCount,BUDGET.parts)+
    '<div class="sect">Attacks</div><div class="chiprow">'+st.attacks.map(a=>'<span class="chip">'+esc(a.name)+'</span>').join('')+'</div>'+
    (st.armor||st.thorns||st.glide||st.jump>1||st.kbResist<1?'<div class="sect">Traits</div><div class="chiprow">'+(st.armor?'<span class="chip">Armored</span>':'')+(st.thorns?'<span class="chip">Thorns '+st.thorns.toFixed(0)+'</span>':'')+(st.glide?'<span class="chip">Glides</span>':'')+(st.jump>1?'<span class="chip">Big jumps</span>':'')+(st.kbResist<1?'<span class="chip">Knockback resist</span>':'')+'</div>':'')+
    (issues?'<ul class="issues">'+issues+'</ul>':'<p class="okmsg">Ready for battle.</p>')+partListHTML();
  $('#wsStyleGo').addEventListener('click',()=>{ws.tab='Style';sfx('ui');renderTabs();renderPalette();if(ws.statsOpen){ws.statsOpen=false;$('#workshop').classList.remove('statsopen');}});
  bindPartList();
}
/* "On your creature": every placed part in one list, grouped by family, to select, mirror or remove */
function partListHTML(){
  const ps=ws.design.parts;if(!ps.length)return '<div class="sect">On your creature</div><p class="note">No parts yet. Pick some from the left.</p>';
  const order=FAMS;const rows=ps.map((p,i)=>({p,i,d:PARTS[p.id]})).filter(r=>r.d).sort((a,b)=>order.indexOf(a.d.fam)-order.indexOf(b.d.fam)||a.i-b.i);
  let h='<div class="sect plhead"><span>On your creature · '+ps.length+'</span><button class="btn small ghost" id="plClear" title="Remove every part (you can undo)">'+(ws.confirm==='clear'?'Really clear?':'Clear all')+'</button></div><ul class="plist" aria-label="Parts on your creature">';
  let fam='';
  for(const r of rows){if(r.d.fam!==fam){fam=r.d.fam;h+='<li class="plfam">'+esc(fam)+'</li>';}
    const canMir=r.d.mount!=='cover'&&r.d.fam!=='Weapon'&&Math.abs(r.p.p[0])>.06;const owned=isOwned(r.p.id);
    h+='<li class="plrow'+(r.i===ws.sel?' on':'')+(owned?'':' unowned')+'"><button class="plsel" data-pi="'+r.i+'" aria-pressed="'+(r.i===ws.sel)+'"><img alt="" src="'+Portrait.part(r.p.id)+'"><span>'+esc(r.d.name)+(r.p.m&&canMir?' <em>×2</em>':'')+(owned?'':' <em class="bad">not owned</em>')+'</span></button>'+
      (canMir?'<button class="plb" data-pm="'+r.i+'" aria-label="'+(r.p.m?'Stop mirroring ':'Mirror ')+esc(r.d.name)+'" title="Mirror on both sides" aria-pressed="'+!!r.p.m+'">⇋</button>':'')+
      '<button class="plb del" data-pd="'+r.i+'" aria-label="Remove '+esc(r.d.name)+'" title="Remove">×</button></li>';}
  return h+'</ul>';}
function bindPartList(){
  $$('#wsStats [data-pi]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.pi;ws.placing=null;ws.sel=ws.sel===i?-1:i;sfx('ui');renderSel();renderStats();renderPalette();hint();}));
  $$('#wsStats [data-pm]').forEach(b=>b.addEventListener('click',()=>{const p=ws.design.parts[+b.dataset.pm];if(!p)return;pushUndo();p.m=!p.m;sfx('ui');changed();renderSel();}));
  $$('#wsStats [data-pd]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.pd;pushUndo();ws.design.parts.splice(i,1);if(ws.sel===i)ws.sel=-1;else if(ws.sel>i)ws.sel--;sfx('remove');changed();renderSel();hint();}));
  const cl=$('#plClear');if(cl)cl.addEventListener('click',()=>{if(ws.confirm!=='clear'){ws.confirm='clear';sfx('deny');renderStats();setTimeout(()=>{if(ws.confirm==='clear'){ws.confirm=null;if(phase==='workshop')renderStats();}},3500);return;}
    ws.confirm=null;pushUndo();ws.design.parts=[];ws.sel=-1;sfx('remove');changed();renderSel();hint('All parts removed. Undo brings them back.');});
}
/* ---------- play style picker (Workshop "Style" tab) ---------- */
const STYLE_ICONS={tank:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',bruiser:'<path d="M5 11V7a2 2 0 014 0V6a2 2 0 014 0v1a2 2 0 014 0v1a2 2 0 014 0v6a7 7 0 01-7 7h-2a8 8 0 01-8-8v-1a2 2 0 014 0"/>',
  spitter:'<path d="M12 3c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z"/>',support:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',scout:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  allrounder:'<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/>',auto:'<path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>'};
function styleIcon(id){return '<svg class="styicon sty-'+id+'" viewBox="0 0 24 24" aria-hidden="true">'+STYLE_ICONS[id]+'</svg>';}
function renderStylePalette(el){
  const st=calcStats(ws.design);const cur=STYLES[ws.design.style]?ws.design.style:'auto';const auto=ROLE_STYLE[st.role];
  const card=(id,name,blurb,perk,extra)=>'<button class="stycard'+(cur===id?' on':'')+'" data-style="'+id+'" aria-pressed="'+(cur===id)+'">'+styleIcon(id)+'<span><b>'+esc(name)+'</b>'+extra+'<small>'+esc(blurb)+'</small><i>'+esc(perk)+'</i></span></button>';
  let h='<p class="note">Pick how you want to play this creature. Your style gives a small perk and suggests parts. Auto follows whatever your parts are best at.</p><div class="stygrid">'+
    card('auto','Auto','Your parts decide.','Right now: '+STYLES[auto].name+' · '+STYLES[auto].perkText,'')+
    STYLE_IDS.map(id=>card(id,STYLES[id].name,STYLES[id].blurb,STYLES[id].perkText,auto===id?'<em class="fit">fits your build</em>':'')).join('')+'</div>';
  const show=cur==='auto'?auto:cur;const S2=STYLES[show];
  h+='<div class="sect">Suggested parts for '+esc(S2.name)+'</div><div class="sugg">'+S2.suggest.map(id=>{const d=PARTS[id];
      if(!isUnlocked(id))return '<span class="sg pod" title="Locked: level up to unlock"><span class="podimg mini" aria-hidden="true"></span><small>Mystery seed</small></span>';
      const on=ws.design.parts.some(p=>p.id===id);
      return '<button class="sg'+(on?' have':'')+'" data-sg="'+id+'" title="'+esc(d.desc)+'"><img alt="" src="'+Portrait.part(id)+'"><small>'+esc(d.name)+'</small>'+(on?'<em>on</em>':isOwned(id)?'':'<em class="buy">'+partPrice(id)+' DNA</em>')+'</button>';}).join('')+'</div>'+
    '<div class="sect">Start fresh</div><p class="note">Builds a new '+esc(S2.name)+' from the best parts you own. Your current creature stays in its slot until you save over it.</p>'+
    '<button class="btn small" id="styTpl">New '+esc(S2.name)+' from template</button>';
  el.innerHTML=h;
  $$('#wsPal [data-style]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.style;pushUndo();if(id==='auto')delete ws.design.style;else ws.design.style=id;sfx('ui');changed(false);}));
  $$('#wsPal [data-sg]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.sg;const d=PARTS[id];sfx('ui');ws.tab=d.fam;renderTabs();renderPalette();
    if(isOwned(id)){if(!ws.design.parts.some(p=>p.id===id)||d.fam==='Weapon')pickPart(id);else{ws.sel=ws.design.parts.findIndex(p=>p.id===id);renderSel();hint();}}else hint(d.name+' is unlocked. Buy it here for '+partPrice(id)+' DNA.');}));
  $('#styTpl').addEventListener('click',()=>{pushUndo();const nd=styleTemplate(show);ws.design=nd;ws.sel=-1;ws.placing=null;ws.slot=slots.findIndex((x,i)=>!x&&i<slotCount());sfx('place');rebuildStudio(true);changed(false);renderSel();$('#wsName').value=nd.name;
    hint('Here is a starter '+STYLES[show].name+'. Tweak it, then Save.'+(ws.slot<0?' All slots are full, so saving replaces slot 1 unless you pick another.':''));});
}
function renderSel(){
  const el=$('#wsSel');if(ws.sel<0||!ws.design.parts[ws.sel]){el.hidden=true;updateSelMarkers();return;}
  const p=ws.design.parts[ws.sel];const d=PARTS[p.id];el.hidden=false;
  el.innerHTML='<div class="selhead"><b>'+esc(d.name)+'</b><button class="xbtn" id="selClose" aria-label="Deselect">×</button></div>'+
    '<label class="sl"><span>Size</span><input type="range" id="selS" min=".6" max="1.6" step=".01" value="'+p.s+'"><output>'+p.s.toFixed(2)+'</output></label>'+
    (d.mount==='cover'?'':'<label class="sl"><span>Twist</span><input type="range" id="selR" min="-3.14" max="3.14" step=".01" value="'+(p.r||0)+'"><output>'+Math.round((p.r||0)*57.3)+'°</output></label>'+
    (d.fam==='Weapon'?'<p class="selnote">One weapon slot. Pick another weapon to swap it.</p>':'<label class="optrow"><input type="checkbox" id="selM"'+(p.m?' checked':'')+'> Mirror on both sides</label>'))+
    '<div class="row"><button class="btn small ghost" id="selReset" title="Put it back where this part normally goes">Reset</button>'+(d.mount==='cover'||d.fam==='Weapon'?'':'<button class="btn small ghost" id="selDup">Duplicate</button>')+'<button class="btn small danger" id="selDel">Remove</button></div>';
  $('#selClose').addEventListener('click',()=>{ws.sel=-1;renderSel();hint();});
  const sS=$('#selS');sS.addEventListener('pointerdown',pushUndo);sS.addEventListener('input',()=>{p.s=+sS.value;sS.nextElementSibling.textContent=p.s.toFixed(2);rebuildStudio();renderStats();});
  const sR=$('#selR');if(sR){sR.addEventListener('pointerdown',pushUndo);sR.addEventListener('input',()=>{p.r=+sR.value;sR.nextElementSibling.textContent=Math.round(p.r*57.3)+'°';rebuildStudio();});}
  const sM=$('#selM');if(sM)sM.addEventListener('change',()=>{pushUndo();p.m=sM.checked;changed();});
  $('#selDel').addEventListener('click',removeSel);
  $('#selReset').addEventListener('click',()=>{pushUndo();p.s=1;p.r=0;if(d.mount!=='cover')p.p=norm3(d.def||[0,1,0]);p.m=d.mirror!==false&&d.fam!=='Weapon';sfx('ui');changed();renderSel();});
  const dupB=$('#selDup');if(dupB)dupB.addEventListener('click',()=>{const d2=PARTS[p.id];if(d2.max&&ws.design.parts.filter(q=>q.id===p.id).length>=d2.max){sfx('deny');return;}pushUndo();const q=clone(p);q.p=norm3([q.p[0]*.8,q.p[1]+.25,q.p[2]-.15]);ws.design.parts.push(q);ws.sel=ws.design.parts.length-1;sfx('place');changed();renderSel();});
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
  if(ws.placing){const p=bodyPointFromRay(e);if(p){const d=PARTS[ws.placing];pushUndo();ws.design.parts.push({id:ws.placing,p,s:1,r:0,m:d.mirror!==false&&d.fam!=='Weapon'&&Math.abs(p[0])>.12});ws.sel=ws.design.parts.length-1;if(!e.shiftKey)ws.placing=null;sfx('place');changed();renderSel();hint();return;}}
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
  if((e.ctrlKey||e.metaKey)&&(e.code==='KeyY'||(e.code==='KeyZ'&&e.shiftKey))){e.preventDefault();doRedo();return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();doUndo();return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();$('#wsSave').click();return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyD'&&ws.sel>=0){e.preventDefault();const b=$('#selDup');if(b)b.click();return;}
  if(ws.sel<0)return;
  const step=e.shiftKey?3:1;
  if(e.code==='ArrowLeft'){e.preventDefault();nudgeSel('around',-.07*step);return;}
  if(e.code==='ArrowRight'){e.preventDefault();nudgeSel('around',.07*step);return;}
  if(e.code==='ArrowUp'){e.preventDefault();nudgeSel('up',.05*step);return;}
  if(e.code==='ArrowDown'){e.preventDefault();nudgeSel('up',-.05*step);return;}
  if(e.code==='BracketRight'||e.key==='+'||e.key==='='){e.preventDefault();nudgeSel('size',.05);return;}
  if(e.code==='BracketLeft'||e.key==='-'){e.preventDefault();nudgeSel('size',-.05);return;}
  if(e.code==='KeyQ'){nudgeSel('twist',-.15);return;}
  if(e.code==='KeyE'){nudgeSel('twist',.15);return;}
  if(e.code==='KeyM'){const p=ws.design.parts[ws.sel];if(PARTS[p.id].fam==='Weapon'||PARTS[p.id].mount==='cover')return;pushUndo();p.m=!p.m;changed();renderSel();}
}
function doUndo(){const s=ws.undo.pop();if(!s){sfx('deny');return;}ws.redo.push(JSON.stringify(ws.design));ws.design=JSON.parse(s);ws.sel=-1;sfx('remove');setDirty(true);changed();renderSel();$('#wsName').value=ws.design.name;}
function doRedo(){const s=ws.redo.pop();if(!s){sfx('deny');return;}ws.undo.push(JSON.stringify(ws.design));ws.design=JSON.parse(s);ws.sel=-1;sfx('place');setDirty(true);changed();renderSel();$('#wsName').value=ws.design.name;}
/* keyboard nudges for the selected part; quick repeats share one undo step */
function nudgeUndo(){const now=performance.now();if(now-ws.lastNudge>700)pushUndo();ws.lastNudge=now;}
function nudgeSel(kind,amt){const p=ws.design.parts[ws.sel];if(!p)return;const d=PARTS[p.id];nudgeUndo();
  if(kind==='size'){p.s=clamp(+(p.s+amt).toFixed(2),.6,1.6);}
  else if(kind==='twist'){if(d.mount==='cover')return;p.r=clamp((p.r||0)+amt,-3.14,3.14);}
  else if(d.mount!=='cover'){let [x,y,z]=p.p;if(kind==='around'){const a=Math.atan2(x,z)+amt,r=Math.hypot(x,z);x=Math.sin(a)*r;z=Math.cos(a)*r;}else{y=clamp(y+amt,-1,1);}p.p=norm3([x,y,z]);if(p.m&&Math.abs(p.p[0])<.06)p.p[0]=0;}
  rebuildStudio();renderStats();renderSel();}
function updateStudio(rdt,now){
  if(!studio.view)return;const e=studio.ent;
  if(studio.walk){e.vx=Math.sin(studio.view.lastYaw||0)*0;e.vz=3.2;}else{e.vx=0;e.vz=0;}
  animateCreatureView(e,rdt,now*.001);studio.view.root.position.set(0,0,0);
  if(!ws.drag&&!ws.orbit&&!ws.placing&&ws.sel<0&&!A11Y.reduceMotion)studio.yaw+=rdt*.12;
  const cp=Math.cos(studio.pitch);studio.cam.position.set(Math.sin(studio.yaw)*cp*studio.dist,studio.ty+Math.sin(studio.pitch)*studio.dist,Math.cos(studio.yaw)*cp*studio.dist);studio.cam.lookAt(0,studio.ty,0);
  studio.sky.material.uniforms.time.value=now*.001;
  const t=now*.001,still=A11Y.reduceMotion;
  if(!still){studio.segs.rotation.z+=rdt*.25;studio.helix.rotation.y+=rdt*.35;}
  for(const tb of studio.tubes){tb.spec.position.y=(tb.base||2.6)+Math.sin(t*.8+tb.ph)*.18;tb.spec.rotation.y+=rdt*.2;for(const b of tb.bub){b.position.y+=rdt*(.4+b.scale.x*6);if(b.position.y>4.7)b.position.y=.8;}}
  const h=studio.view.height||3;const sp=still?.5:(Math.sin(t*.7)*.5+.5);studio.scan.position.y=.08+sp*h*1.02;const r=Math.max(studio.view.R[0],studio.view.R[2])*1.45;studio.scan.scale.setScalar(r*(.85+Math.sin(sp*Math.PI)*.25));studio.scan.material.opacity=.25+.55*Math.sin(sp*Math.PI);
  if(!still){const p=studio.dust.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)+rdt*.12;if(y>9)y=0;p.setY(i,y);p.setX(i,p.getX(i)+Math.sin(t*.3+i)*rdt*.04);}p.needsUpdate=true;}
  if(studio.mons)for(const m of studio.mons){const f=1.25+Math.sin(t*3+m.id)*.08+(Math.random()<.004?.6:0);m.material.color.setRGB(f,f,f);}
  studio.key.target.position.y=h*.45;
}
$('#wsName').addEventListener('focus',()=>{ws.nameUndo=true;});
$('#wsName').addEventListener('input',e=>{if(ws.nameUndo){pushUndo();ws.nameUndo=false;}ws.design.name=Sec.cleanName(e.target.value);setDirty(true);});
$('#wsUndo').addEventListener('click',doUndo);
$('#wsNew').addEventListener('click',()=>{sfx('ui');pushUndo();ws.design=newDesign();ws.sel=-1;ws.placing=null;ws.slot=slots.findIndex((s,i)=>!s&&i<slotCount());ws.tab='Style';rebuildStudio(true);renderTabs();changed(false);renderSel();$('#wsName').value=ws.design.name;hint('New creature. Pick a play style to start from a template, or build from scratch.');});
$('#wsRedo').addEventListener('click',doRedo);
$('#wsCopy').addEventListener('click',()=>{const i=slots.findIndex((s,k)=>!s&&k<slotCount());if(i<0){sfx('deny');hint('No empty slot to copy into. Delete a creature first.');return;}
  const d=clone(ws.design);d.name=Sec.cleanName((d.name.length>18?d.name.slice(0,18):d.name)+' copy');slots[i]=d;ws.design=clone(d);ws.slot=i;saveSlots();setDirty(false);sfx('buy');banner('Copied to slot '+(i+1),'good');renderSlots();$('#wsName').value=d.name;});
$('#wsDel').addEventListener('click',()=>{const i=ws.slot;if(i<0||!slots[i]){sfx('deny');hint('This creature is not saved in a slot yet.');return;}
  if(slots.filter(Boolean).length<=1){sfx('deny');hint('Keep at least one saved creature.');return;}
  if(ws.confirm!=='del'){ws.confirm='del';$('#wsDel').textContent='Really delete?';sfx('deny');setTimeout(()=>{if(ws.confirm==='del'){ws.confirm=null;$('#wsDel').textContent='Delete';}},3500);return;}
  ws.confirm=null;$('#wsDel').textContent='Delete';slots[i]=null;saveSlots();if(progress.lastSlot===i){progress.lastSlot=-1;saveProgress();}ws.slot=-1;setDirty(true);sfx('remove');banner('Deleted slot '+(i+1),'bad');renderSlots();hint('Slot '+(i+1)+' is empty. The creature is still here until you leave, so Save brings it back.');});
$('#wsSave').addEventListener('click',()=>{let i=ws.slot;if(i<0||i>=slotCount())i=slots.findIndex((s,k)=>!s&&k<slotCount());if(i<0)i=0;
  slots[i]=clone(ws.design);ws.slot=i;saveSlots();setDirty(false);sfx('buy');banner('Saved to slot '+(i+1),'good');renderSlots();
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
requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$('#boot');if(b&&!b.classList.contains('failed'))b.hidden=true;})); // the loading screen goes once the first frame is drawn
if(DEV_BUILD)window.__cc={get world(){return world;},get match(){return match;},get build(){return build;},get progress(){return progress;},S,PRESETS,BOT_PRESETS,PARTS,validateDesign,calcStats,openBuild,openWorkshop,openMenu,startTestDrive,lockAndBegin,A11Y,applyA11y,renderA11y,applyPreset,addCaption,announce,TEAMS,startCampaign,CAMPAIGN,openChallenges,rotating,CONSTRAINTS,
  get ws(){return ws;},wsApi:{pickPart,removeSel,doUndo,renderPalette,endTestDrive,tryBuyPart},autoPilot:(on)=>{DEV.auto=!!on;if(match&&match.player&&!match.player.brain)match.player.brain={t:0,mode:'lane',target:null,laneI:-1,retreat:false,atkT:0,jit:0};}};
