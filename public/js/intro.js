/* Creature Clash — opening cutscene.
   Dusk in the Enchanted Forest. A mossy clearing is full of sleeping stones, and one of them is YOUR spirit.
   It shivers, opens its eyes, sprouts and stands up; then every stone around it wakes, and the whole crowd
   waddles off toward the grove. It all happens in the live level, and the camera glides straight into the
   home screen with no cut. */
const intro={t:0,done:false,started:false,subIdx:-1,stage:'forest',rocks:[],flags:{},look:new T.Vector3(),K:null,A:null};
const INTRO_LEN=14.5;
const INTRO_SUBS=[[.5,'Deep in the Enchanted Forest…'],[3.4,'…one little stone begins to stir.'],[6.4,'All across the clearing, the stones wake up!'],[9.4,'Off they go! The Great Creature Clash is about to begin!'],[12.2,'Your grove is waiting!']];
const _iv=new T.Vector3(),_iv2=new T.Vector3(),_iv3=new T.Vector3();
const ease=k=>k*k*(3-2*k);

function introSubs(t){const sub=INTRO_SUBS.reduce((a,s,i)=>t>=s[0]?i:a,-1);if(sub!==intro.subIdx){intro.subIdx=sub;const txt=sub>=0?INTRO_SUBS[sub][1]:'';$('#introSub').textContent=txt;if(txt)announce(txt);}}
// kept for older callers: the acorn pod no longer exists
function disposePod(){}function animatePod(){}

/* ---------- the clearing: a crowd of sleeping stones ---------- */
function introRock(d,x,z,yaw){const map=world.map;const v=buildCreatureView(d,{});world.group.add(v.root);
  const e={kind:'creature',x,z,y:map.heightAt(x,z),yaw,vx:0,vy:0,vz:0,kx:0,kz:0,state:'alive',grounded:true,view:v,emoteT:0,sleep:1,eyesShut:1,sproutK:.05,
    voicePitch:clamp(1.75-d.body.w*d.body.h*d.body.l*.42,.55,1.7),wakeAt:99,path:null};return e;}
function buildClearing(){
  const st=menuStage;const map=world.map;const c=st.c;const R=mulberry32(map.seed^0x5eed);
  const K=new T.Vector3(c.x-11,0,c.z-8);K.y=map.heightAt(K.x,K.z);intro.K=K;
  const A=new T.Vector3(K.x+2.6,0,K.z+2.4);A.y=map.heightAt(A.x,A.z);intro.A=A;
  for(const r of intro.rocks)disposeView(r.view);intro.rocks=[];
  // the stage spirits start asleep too: yours in the front of the clearing, your two buddies where they will stand
  st.ents.forEach((e,i)=>{e.sleep=1;e.eyesShut=1;e.sproutK=.05;e.scripted=true;e.emoteT=0;if(i===0){e.x=A.x;e.z=A.z;e.y=A.y;e.yaw=.6;}});
  const N=11;for(let i=0;i<N;i++){const a=i/N*TAU+R()*.5,rr=2.8+R()*4.8;const x=K.x+Math.cos(a)*rr,z=K.z+Math.sin(a)*rr;
    if(Math.hypot(x-A.x,z-A.z)<2.2)continue;const d=clone(BOT_PRESETS[(i*5+3)%BOT_PRESETS.length]);const tc=BOT_COLORS[i%BOT_COLORS.length];d.color=tc[0];d.accent=tc[1];d.seed=(R()*1e6)|0;
    const e=introRock(d,x,z,R()*TAU);e.wakeAt=6.2+R()*1.9;
    // waddle toward the grove, then on past it toward the lanes
    // waddle off together, deeper into the forest (away from where the home-screen camera will sit)
    const away=new T.Vector3(-Math.cos(.42),0,-Math.sin(.42)),side=new T.Vector3(-away.z,0,away.x);
    const w1=K.clone().addScaledVector(away,5+R()*3).addScaledVector(side,(R()-.5)*7),w2=K.clone().addScaledVector(away,30+R()*8).addScaledVector(side,(R()-.5)*12);
    e.path=[w1,w2];e.speed=3.6+R()*1.3;intro.rocks.push(e);}
}
function wakeRock(e,loud){if(e.awake)return;e.awake=true;e.wakeT=0;if(loud){if(AudioFX.ctx)AudioFX.voice(e.voicePitch,'happy',.7);AudioFX.play('popup',.5);}
  const p=e.view.root.position;emit(p.x,p.y+.8,p.z,{n:10,color:'#c8ffe0',glow:1.6,speed:2,up:2,life:.9,size:.18,grav:-.5});}
// eyes open, sprout pops, the stone rises onto its stubby legs and does a happy wiggle
function stepWake(e,rdt){if(!e.awake)return;e.wakeT+=rdt;const k=e.wakeT;
  e.eyesShut=1-smooth(0,.25,k);e.sproutK=.05+.95*smooth(.25,.6,k)*(1+Math.sin(clamp((k-.25)/.5,0,1)*Math.PI)*.25);
  e.sleep=1-smooth(.55,.95,k);if(k>.95&&!e.danced){e.danced=true;e.emoteT=1.1;AudioFX.play('jump',.4);}}
function walkPath(e,rdt){if(!e.awake||!e.path||!e.path.length||e.wakeT<1.6){e.vx=e.vz=0;return;}const map=world.map;const w=e.path[0];const dx=w.x-e.x,dz=w.z-e.z;const d=Math.hypot(dx,dz);
  if(d<.4){e.path.shift();if(!e.path.length){e.vx=e.vz=0;e.gone=true;}return;}
  const sp=e.speed*smooth(1.6,2.4,e.wakeT);e.vx=dx/d*sp;e.vz=dz/d*sp;e.x+=e.vx*rdt;e.z+=e.vz*rdt;e.y=map.heightAt(e.x,e.z);
  e.yaw+=angDiff(e.yaw,Math.atan2(dx,dz))*Math.min(1,rdt*5);}

/* ---------- start / skip / finish ---------- */
function startIntro(){
  if(A11Y.reduceMotion||isAutomation()){finishIntro(true);return;}
  // the cutscene plays in a leafy forest: the home stage keeps whichever of these it lands in
  buildWorld(newSeed(),{biome:pick(['grove','glow','autumn','lotus'])});
  setRenderView(scene,camera,world.map.biome.bloom);
  buildMenuStage();buildClearing();
  phase='intro';intro.stage='forest';
  for(const s of ['menu','build','workshop','hud','chal'])$('#'+s).hidden=true;
  $('#introGate').hidden=false;$('#introUI').hidden=true;intro.t=0;intro.started=false;intro.done=false;intro.flags={};
}
function isAutomation(){try{return !!navigator.webdriver;}catch(e){return false;}}
function beginCutscene(){AudioFX.init();$('#introGate').hidden=true;$('#introUI').hidden=false;intro.started=true;intro.t=0;intro.subIdx=-1;intro.flags={};intro.shot=null;$('#introSkip').focus();
  const f=$('#introFade');f.style.background='#020604';f.style.transition='none';f.style.opacity='1';}
function finishIntro(instant,seamless){if(intro.done)return;intro.done=true;$('#introGate').hidden=true;$('#introUI').hidden=true;$('#introSub').textContent='';
  settleIntroStage();
  openMenu();const fade=$('#introFade');fade.style.background='';
  if(seamless||instant)fade.style.opacity='0';
  else{fade.style.transition='none';fade.style.opacity='1';requestAnimationFrame(()=>{fade.style.transition='opacity .9s ease';fade.style.opacity='0';});}
  document.body.classList.add('menuEnter');setTimeout(()=>document.body.classList.remove('menuEnter'),1600);
  if(AudioFX.ctx&&!instant)AudioFX.play('win',.6);if(typeof showWelcomeIfNeeded==='function')setTimeout(showWelcomeIfNeeded,instant?300:1400);}
// skipping (or ending): the crowd has moved on, your team stands awake on the home stage
function settleIntroStage(){for(const r of intro.rocks)disposeView(r.view);intro.rocks=[];const st=menuStage;if(!st||!st.active||!world)return;const map=world.map;
  for(const e of st.ents){e.sleep=0;e.eyesShut=0;e.sproutK=null;e.scripted=false;e.hidden=false;e.awake=false;e.x=e.hx;e.z=e.hz;e.y=map.heightAt(e.x,e.z);e.vx=e.vz=0;e.vy=0;e.grounded=true;
    if(e.view.sprout)e.view.sprout.g.scale.setScalar(e.view.sprout.base);if(e.view.ring)e.view.ring.visible=true;}}

/* ---------- the shots ---------- */
function introWorldTick(rdt,now){const tm=now*.001;
  for(const n of world.neutrals){idleNeutral(n,rdt);if(!n.alive){n.view.root.visible=false;continue;}animateCreatureView(n,rdt,tm);}
  for(const n of world.nests)animateNest(n,rdt,tm);updateParticles(rdt);
  if(skyMesh){skyMesh.material.uniforms.time.value=tm;skyMesh.position.copy(camera.position);}}
function shotPose(t,out){const K=intro.K,A=intro.A,st=menuStage,c=st.c;
  // A: a slow, low glide across the sleeping clearing
  const pA=_iv.set(K.x+9-t*.7,K.y+1.1+t*.05,K.z+7.5+t*.55),lA=_iv2.set(K.x+.5,K.y+.7,K.z);
  if(t<3.3){out.P.copy(pA);out.L.copy(lA);return out;}
  // B: close on your stone as it wakes
  const tb=t-3.3;const pB=_iv.set(A.x+2.6-tb*.25,A.y+.9+tb*.12,A.z+3.1-tb*.1),lB=_iv2.set(A.x,A.y+.75+smooth(1.6,2.6,tb)*.5,A.z);
  if(t<6.2){out.P.copy(pB);out.L.copy(lB);return out;}
  // C: rise up and back to see the whole clearing come alive
  const kc=ease(clamp((t-6.2)/2.6,0,1));const pC=_iv3.set(K.x+4,K.y+8,K.z+15);out.P.copy(pB).lerp(pC,kc);out.L.copy(lB).lerp(_iv.set(lerp(K.x,c.x,.35),K.y+.8,lerp(K.z,c.z,.35)),kc);
  if(t<9.2)return out;
  // D: track the crowd as it waddles toward the grove
  let mx=0,mz=0,n=0;for(const r of intro.rocks){if(r.gone)continue;mx+=r.x;mz+=r.z;n++;}if(n){mx/=n;mz/=n;}else{mx=c.x;mz=c.z;}
  const kd=ease(clamp((t-9.2)/2.4,0,1));const pD=_iv2.set(mx+7,world.map.heightAt(mx,mz)+3.4,mz+8);out.P.lerp(pD,kd);out.L.lerp(_iv3.set(mx,world.map.heightAt(mx,mz)+.8,mz),kd);
  if(t<11.6)return out;
  // E: glide into the exact home-screen framing
  const pose=menuCamPose(st.t);const ke=ease(clamp((t-11.6)/2.6,0,1));out.P.lerp(pose.P,ke);out.P.y+=Math.sin(ke*Math.PI)*3.5;out.L.lerp(pose.L,ke);return out;}
const _pose={P:new T.Vector3(),L:new T.Vector3()};
function updateIntro(rdt,now){
  const time=now*.001;const st=menuStage;if(!world||!intro.K){return;}const map=world.map;
  introWorldTick(rdt,now);st.t+=rdt;
  if(!intro.started){// behind the "press to play" gate: a slow drift over the sleeping stones
    intro.t=(intro.t+rdt*.2)%2.5;shotPose(intro.t,_pose);}
  else{intro.t+=rdt;const t=intro.t;const F=intro.flags;introSubs(t);
    $('#introFade').style.opacity=String(1-smooth(0,1.3,t));
    const e0=st.ents[0];
    if(t>3.9&&!F.shiver){F.shiver=true;e0.emoteT=.35;AudioFX.play('land',.35);const p=e0.view.root.position;emit(p.x,p.y+.2,p.z,{n:12,color:map.biome.ground,glow:.6,speed:3,flat:true,life:.6,size:.25,grav:0});}
    if(t>4.6&&!F.w0){F.w0=true;wakeRock(e0,true);}
    if(t>6.4&&!F.walk0){F.walk0=true;e0.path=[new T.Vector3(e0.hx,0,e0.hz)];e0.speed=3.3;}
    if(t>9.6&&!F.pals){F.pals=true;st.ents.slice(1).forEach((e,i)=>setTimeout(()=>wakeRock(e,true),i*350));}
    for(const r of intro.rocks){if(!r.awake&&t>r.wakeAt)wakeRock(r,Math.random()<.4);}
    shotPose(t,_pose);
    if(t>=INTRO_LEN)finishIntro(false,true);}
  // everybody: wake up, walk, animate
  for(const e of st.ents){stepWake(e,rdt);if(e.path){walkPath(e,rdt);if(e.path&&!e.path.length){e.path=null;e.vx=e.vz=0;}}
    else if(e.awake&&e.wakeT>1.2){e.yaw+=angDiff(e.yaw,Math.atan2(camera.position.x-e.x,camera.position.z-e.z))*Math.min(1,rdt*3);}
    if(e.emoteT>0)e.emoteT-=rdt;animateCreatureView(e,rdt,time);if(e.view.ring)e.view.ring.visible=!(e.sleep>.05)&&intro.t>9.5;}
  for(const r of intro.rocks){stepWake(r,rdt);walkPath(r,rdt);if(r.emoteT>0)r.emoteT-=rdt;r.view.root.visible=!r.gone;if(!r.gone)animateCreatureView(r,rdt,time);}
  const shot=!intro.started?-1:intro.t<3.3?0:intro.t<6.2?1:2;const cut=shot!==intro.shot&&shot<=1;intro.shot=shot;
  const k=cut||!intro.started?1:1-Math.exp(-rdt*6);camera.position.lerp(_pose.P,k);intro.look.lerp(_pose.L,k);
  if(!intro.started&&!intro.lookInit){intro.lookInit=true;camera.position.copy(_pose.P);intro.look.copy(_pose.L);}
  camera.lookAt(intro.look);sunFollow(st.c.x,st.c.y,st.c.z);
}

$('#introPlay').addEventListener('click',()=>beginCutscene());
$('#introSkip').addEventListener('click',()=>{sfx('ui');finishIntro(false);});
addEventListener('keydown',e=>{if(phase!=='intro')return;if(!intro.started&&(e.key==='Enter'||e.key===' ')){e.preventDefault();beginCutscene();return;}if(intro.started&&(e.key==='Escape'||e.key==='Enter'||e.key===' ')){e.preventDefault();finishIntro(false);}},true);
