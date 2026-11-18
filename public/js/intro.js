/* Creature Clash — opening cutscene.
   Dusk in the Enchanted Forest. A mossy clearing is scattered with plain grey stones, and one of them is YOUR spirit.
   It shivers, colour flows into it, its eyes pop open, a sprout grows, its limbs grow out and it stands up; then every
   stone around it wakes and the crowd waddles off into the forest. The light warms from misty blue dusk to golden
   sunlight as the camera cranes into the title screen with no cut.
   Camera: six fixed, hand-composed shots joined by hard cuts. Every camera position and line of sight is tested
   against trees, canopies, rocks, creatures and the terrain, and nudged to a clear angle, so nothing clips. */
const intro={t:0,done:false,started:false,subIdx:-1,stage:'forest',rocks:[],flags:{},look:new T.Vector3(),K:null,A:null,shots:null,shot:-1,light:null,glow:null};
const INTRO_LEN=17.6;
const INTRO_SUBS=[[.6,'Deep in the Enchanted Forest…'],[4.3,'…one little stone begins to stir.'],[9.9,'All across the clearing, the stones wake up!'],[12.6,'Off they go! The Great Creature Clash is about to begin!'],[15.3,'Your grove is waiting!']];
const SHOT_AT=[0,4.0,6.0,9.6,12.4,14.8];// establishing, stir, wake close-up, clearing wakes, crowd leaves, crane to title
const _iv=new T.Vector3(),_iv2=new T.Vector3(),_iv3=new T.Vector3();
const ease=k=>k*k*(3-2*k);
const bump=(a,b,c,t)=>t<a||t>c?0:t<b?smooth(a,b,t):1-smooth(b,c,t);

function introSubs(t){const sub=INTRO_SUBS.reduce((a,s,i)=>t>=s[0]?i:a,-1);if(sub!==intro.subIdx){intro.subIdx=sub;const txt=sub>=0?INTRO_SUBS[sub][1]:'';$('#introSub').textContent=txt;if(txt)announce(txt);}}
// kept for older callers: the acorn pod no longer exists
function disposePod(){}function animatePod(){}

/* ---------- dormant stones ---------- */
function makeDormant(e){e.sleep=1;e.eyesShut=1;e.colorK=0;e.eyeK=0;e.limbK=0;e.sproutK=.001;e.glowK=0;e.emoteT=0;e.awake=false;e.wakeT=0;e.wk=0;e.shiv=0;}
function clearDormant(e){e.sleep=0;e.eyesShut=0;e.colorK=null;e.eyeK=null;e.limbK=null;e.sproutK=null;e.glowK=0;e.shiv=0;}
function introRock(d,x,z,yaw){const map=world.map;const v=buildCreatureView(d,{});world.group.add(v.root);
  const e={kind:'creature',x,z,y:map.heightAt(x,z),yaw,vx:0,vy:0,vz:0,kx:0,kz:0,state:'alive',grounded:true,view:v,
    voicePitch:clamp(1.75-d.body.w*d.body.h*d.body.l*.42,.55,1.7),wakeAt:99,wakeSp:1.5,path:null};makeDormant(e);return e;}
function introCreatures(){return intro.rocks.concat(menuStage&&menuStage.ents?menuStage.ents:[]);}
function spotFree(x,z,r){const map=world.map;if(world.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+r))return false;
  if((map.trees||[]).some(t=>Math.hypot(x-t.x,z-t.z)<1.2*t.s+r))return false;return !introCreatures().some(e=>Math.hypot(x-e.x,z-e.z)<r+1.3);}
function segFree(ax,az,bx,bz,r){for(let i=1;i<=16;i++){const k=i/16;if(!spotFreeStatic(lerp(ax,bx,k),lerp(az,bz,k),r))return false;}return true;}
function spotFreeStatic(x,z,r){const map=world.map;return !world.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+r)&&!(map.trees||[]).some(t=>Math.hypot(x-t.x,z-t.z)<1.2*t.s+r);}
function buildClearing(){
  const st=menuStage;const map=world.map;const c=st.c;const R=mulberry32(map.seed^0x5eed);
  const K=new T.Vector3(c.x-11,0,c.z-8);K.y=map.heightAt(K.x,K.z);intro.K=K;
  const A=new T.Vector3(K.x+2.6,0,K.z+2.4);A.y=map.heightAt(A.x,A.z);intro.A=A;
  for(const r of intro.rocks)disposeView(r.view);intro.rocks=[];
  // the stage spirits start as plain stones too: yours at the front of the clearing, your two buddies where they will stand
  st.ents.forEach((e,i)=>{makeDormant(e);e.scripted=true;e.path=null;if(i===0){e.x=A.x;e.z=A.z;e.y=A.y;e.yaw=.6;}e.view.ring&&(e.view.ring.visible=false);});
  const away=new T.Vector3(-Math.cos(.42),0,-Math.sin(.42)),side=new T.Vector3(-away.z,0,away.x);intro.away=away;intro.side=side;
  for(let i=0,n=0;i<60&&n<11;i++){const a=R()*TAU,rr=2.6+R()*5;const x=K.x+Math.cos(a)*rr,z=K.z+Math.sin(a)*rr;
    if(Math.hypot(x-A.x,z-A.z)<2.4||!spotFree(x,z,.9))continue;
    const d=clone(BOT_PRESETS[(n*5+3)%BOT_PRESETS.length]);const tc=BOT_COLORS[n%BOT_COLORS.length];d.color=tc[0];d.accent=tc[1];d.seed=(R()*1e6)|0;
    const e=introRock(d,x,z,R()*TAU);e.wakeAt=9.7+R()*1.6;e.wakeSp=1.35+R()*.4;
    // waddle off together, deeper into the forest (away from where the home-screen camera will sit) on a clear route
    for(let tries=0;tries<8;tries++){const w1=K.clone().addScaledVector(away,5+R()*3).addScaledVector(side,(R()-.5)*7),w2=K.clone().addScaledVector(away,28+R()*8).addScaledVector(side,(R()-.5)*12);
      if(segFree(x,z,w1.x,w1.z,.8)&&segFree(w1.x,w1.z,w2.x,w2.z,.8)){e.path=[w1,w2];break;}}
    e.speed=3.2+R()*1.1;intro.rocks.push(e);n++;}
  planShots();
}

/* ---------- camera safety ---------- */
function propAt(x,y,z,pad){for(const p of (world.map.props||[])){const r=(p.s||1)*2.3+(pad||0),h=(p.s||1)*4.2;if(y<(world.map.heightAt(p.x,p.z)+h)&&Math.hypot(x-p.x,z-p.z)<r)return true;}return false;}
function canopyAt(x,y,z){for(const t of (world.map.trees||[])){const top=t.y+(t.kind==='pine'?7.2:t.kind==='tall'?7.8:6.8)*t.s,low=t.y+(t.kind==='pine'?1.8:2.8)*t.s;
  if(y>low-.6&&y<top+.9&&Math.hypot(x-t.x,z-t.z)<2.7*t.s+.6)return true;}return false;}
function camClear(P,L,subject,checkCrowd,L2,nestR){const map=world.map;if(L2&&!camClear(P,L2,subject,checkCrowd,null,nestR))return false;
  if(P.y<map.heightAt(P.x,P.z)+.5)return false;
  if(world.colliders.some(c=>Math.hypot(P.x-c.x,P.z-c.z)<c.r+.9))return false;
  if(canopyAt(P.x,P.y,P.z))return false;
  if(propAt(P.x,P.y,P.z,.8))return false;
  if(world.nests.some(n=>Math.hypot(P.x-n.x,P.z-n.z)<(n.main?6.5:3.8)*(nestR||1)&&P.y<n.y+(n.main?6:3)*(nestR||1)))return false;
  for(const e of introCreatures()){if(Math.hypot(P.x-e.x,P.z-e.z)<(e.view.radius||1)+.8&&P.y<e.y+(e.view.height||1.6)+.6)return false;}
  for(let i=1;i<14;i++){const k=i/14;const x=lerp(P.x,L.x,k),y=lerp(P.y,L.y,k),z=lerp(P.z,L.z,k);
    if(y<map.heightAt(x,z)+.12)return false;
    if(y<6&&world.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r*.9))return false;
    if(canopyAt(x,y,z))return false;
    if(propAt(x,y,z,0))return false;
    if(world.nests.some(n=>Math.hypot(x-n.x,z-n.z)<(n.main?5:3)&&y<(n.y||0)+(n.main?5.5:2.2)))return false;
    if(checkCrowd)for(const e of introCreatures()){if(e===subject)continue;if(Math.hypot(x-e.x,z-e.z)<(e.view.radius||1)*.9&&y<e.y+(e.view.height||1.4))return false;}}
  return true;}
/* search around a preferred angle for a camera spot that is clear at both ends of its move */
function findShot(target,yaw0,dist,h,o){o=o||{};const map=world.map;const yaws=[0,.25,-.25,.5,-.5,.8,-.8,1.1,-1.1,1.5,-1.5,2,-2,2.6,-2.6,3.1];const dists=[1,.85,1.2,.7,1.45,1.7];
  const hs=o.hs||[0,1,2.2];for(const dh of hs)for(const dy of yaws)for(const ds of dists){const yaw=yaw0+dy;const P0=new T.Vector3(target.x+Math.sin(yaw)*dist*ds,0,target.z+Math.cos(yaw)*dist*ds);P0.y=Math.max(target.y+h+dh,map.heightAt(P0.x,P0.z)+.6);
    const P1=P0.clone();if(o.dolly)P1.lerp(target,o.dolly);if(o.slide){const tx=Math.cos(yaw),tz=-Math.sin(yaw);P1.x+=tx*o.slide;P1.z+=tz*o.slide;}if(o.lift)P1.y+=o.lift;P1.y=Math.max(P1.y,map.heightAt(P1.x,P1.z)+.6);
    const L0=target.clone(),L1=o.L1?o.L1.clone():target.clone();
    const F=o.feet||null;if(camClear(P0,L0,o.subject,o.crowd,F,o.nestR)&&camClear(P1,L1,o.subject,o.crowd,F,o.nestR)&&camClear(P0.clone().lerp(P1,.5),L0.clone().lerp(L1,.5),o.subject,o.crowd,F,o.nestR))return {P0,P1,L0,L1,yaw};}
  const P0=new T.Vector3(target.x+Math.sin(yaw0)*dist,target.y+h+4,target.z+Math.cos(yaw0)*dist);return {P0,P1:P0.clone(),L0:target.clone(),L1:target.clone(),yaw:yaw0};}
function planShots(){const K=intro.K,A=intro.A,e0=menuStage.ents[0];const S=[];
  const T1=K.clone().add(_iv.set(0,.5,0));const y1=Math.atan2(9,7.5);
  S[0]=findShot(T1,y1,10.5,1.3,{slide:1.8});// establishing: low, slow sideways glide across the sleeping stones
  const T2=A.clone().add(_iv.set(0,.5,0));const y2=Math.atan2(A.x-K.x,A.z-K.z)+.5;
  const feet=A.clone().add(_iv3.set(0,.2,0));S[1]=findShot(T2,y2,4.4,1.05,{dolly:.14,subject:e0,crowd:true,feet,hs:[0,.5,1]});// medium on your stone, slow push in
  const T3=A.clone().add(_iv.set(0,.62,0));
  const hh=(e0.view.height||2);S[2]=findShot(T3,S[1].yaw+1.15,2.9,.75,{dolly:-.38,lift:hh*.42,L1:A.clone().add(_iv2.set(0,hh*.62,0)),subject:e0,crowd:true,feet,hs:[0,.4,.8]});// close-up, low and slightly heroic
  e0.yaw=S[2].yaw;// your spirit wakes facing the lens
  const T4=K.clone().add(_iv.set(0,.4,0));
  S[3]=findShot(T4,y1-1.05,13.5,6.4,{dolly:.08,lift:-1.2,nestR:2.6});// wide and high: the whole clearing wakes
  const T5=K.clone().addScaledVector(intro.away,13).add(_iv.set(0,.8,0));T5.y=world.map.heightAt(T5.x,T5.z)+.8;
  S[4]=findShot(T5,Math.atan2(intro.side.x,intro.side.z),9,2.2,{nestR:1.3});
  // final shot: descend from above and behind the home stage into the exact home-screen framing (path checked end to end)
  const pose=menuCamPose(0);const back=pose.P.clone().sub(pose.L).setY(0).normalize();let best=null;
  const bdirs=[0,.45,-.45,.9,-.9,1.4,-1.4].map(a=>back.clone().applyAxisAngle(_iv.set(0,1,0),a));
  outer:for(const [bk,up] of [[7,5],[5,4.5],[9,6],[4,3.5],[3,6.5],[6,8],[2,9]])for(const bd of bdirs){const P0=pose.P.clone().addScaledVector(bd,bk);P0.y+=up;let ok=true;
    for(let i=0;i<=10&&ok;i++){const k=i/10,e=ease(k);const P=P0.clone().lerp(pose.P,e);ok=camClear(P,pose.L,null,false);}if(ok){best=P0;break outer;}}
  S[5]={P0:best||pose.P.clone().add(_iv.set(0,7,0)),L0:pose.L.clone()};// fixed camera beside the route, panning with the crowd
  intro.shots=S;}

/* ---------- waking ---------- */
function wakeRock(e,loud,sp){if(e.awake)return;e.awake=true;e.wakeT=0;e.wk=0;if(sp)e.wakeSp=sp;
  if(loud){if(AudioFX.ctx)AudioFX.voice(e.voicePitch,'happy',.6);AudioFX.play('popup',.45);}
  const p=e.view.root.position;emit(p.x,p.y+.6,p.z,{n:14,color:'#c8ffe0',glow:1.8,speed:1.6,up:2.2,life:1.1,size:.16,grav:-.6});}
/* colour flows in -> eyes pop in (closed) and blink open -> sprout grows -> limbs grow out -> it rises onto its feet -> happy wiggle */
function stepWake(e,rdt){if(!e.awake)return;e.wakeT+=rdt;const k=e.wk=e.wakeT*(e.wakeSp||1);
  e.colorK=smooth(0,1.1,k);e.eyeK=clamp((k-.35)/.38,0,1);
  e.eyesShut=Math.max(1-smooth(.78,.98,k),bump(1.25,1.32,1.42,k));
  e.sproutK=.001+smooth(.95,1.45,k)*(1+Math.sin(clamp((k-.95)/.6,0,1)*Math.PI)*.22);
  e.limbK=smooth(1.1,1.95,k);e.sleep=1-smooth(1.75,2.55,k);e.glowK=bump(0,.6,2.2,k)*4;
  if(k>2.75&&!e.danced){e.danced=true;e.emoteT=1.05;AudioFX.play('jump',.35);}}
function walkPath(e,rdt){if(!e.awake||!e.path||!e.path.length||e.wk<3.1){e.vx=e.vz=0;return;}const map=world.map;const w=e.path[0];const dx=w.x-e.x,dz=w.z-e.z;const d=Math.hypot(dx,dz);
  if(d<.4){e.path.shift();if(!e.path.length){e.vx=e.vz=0;e.gone=e!==menuStage.ents[0]&&!menuStage.ents.includes(e);}return;}
  const sp=e.speed*smooth(3.1,4.2,e.wk)*smooth(0,1.2,d);const tx=dx/d*sp,tz=dz/d*sp;
  // accelerate smoothly (the rig reads the velocity for lean, stride and arm swing)
  e.vx=lerp(e.vx,tx,1-Math.exp(-rdt*4));e.vz=lerp(e.vz,tz,1-Math.exp(-rdt*4));e.x+=e.vx*rdt;e.z+=e.vz*rdt;e.y=map.heightAt(e.x,e.z);
  e.yaw+=angDiff(e.yaw,Math.atan2(dx,dz))*Math.min(1,rdt*4);}

/* ---------- light: misty blue dusk -> warm sunlight for the title card ---------- */
function captureIntroLight(){intro.light={sun:sun.intensity,hemi:hemi.intensity,fog:scene.fog&&scene.fog.isFogExp2?scene.fog.density:null,fogC:scene.fog?scene.fog.color.clone():null,
  vol:litPass?litPass.volK:0,glowK:litPass?litPass.glowK:0,exp:finalPass?finalPass.uniforms.exposure.value:1,vig:finalPass?finalPass.uniforms.vig.value:1,bloom:bloomPass?bloomPass.strength:0,sunC:sun.color.clone()};
  if(!intro.glow){intro.glow=new T.PointLight(col('#b8ffd8'),0,7,2);intro.glow.castShadow=false;}scene.add(intro.glow);}
function applyIntroLight(t){const L=intro.light;if(!L)return;const d=smooth(8.8,16.6,t);const sw=bump(14.8,16.4,17.6,t);
  sun.intensity=L.sun*lerp(.4,1,d);hemi.intensity=L.hemi*lerp(.5,1,d);sun.color.copy(L.sunC).lerp(col('#9fb4ff'),(1-d)*.6);
  if(L.fog!=null){scene.fog.density=L.fog*lerp(1.75,1,d);scene.fog.color.copy(L.fogC).lerp(col('#3a5270'),(1-d)*.7);}
  if(litPass){litPass.volK=L.vol*lerp(2.6,1,d)+sw*.1;litPass.glowK=L.glowK*lerp(.6,1,d)+sw*.25;}
  if(finalPass){finalPass.uniforms.exposure.value=L.exp*lerp(.66,1,d)+sw*.08;finalPass.uniforms.vig.value=L.vig*lerp(1.7,1,d);}if(bloomPass)bloomPass.strength=L.bloom+sw*.22;
  const e0=menuStage.ents[0];if(intro.glow&&e0){intro.glow.position.set(e0.x,e0.y+.9,e0.z);intro.glow.intensity=(t<6.3?.35+.25*Math.sin(t*2.2):0)+(e0.glowK||0)*1.1;}}
function restoreIntroLight(){const L=intro.light;if(!L)return;sun.intensity=L.sun;hemi.intensity=L.hemi;sun.color.copy(L.sunC);if(L.fog!=null){scene.fog.density=L.fog;scene.fog.color.copy(L.fogC);}
  if(litPass){litPass.volK=L.vol;litPass.glowK=L.glowK;}if(finalPass){finalPass.uniforms.exposure.value=L.exp;finalPass.uniforms.vig.value=L.vig;}if(bloomPass)bloomPass.strength=L.bloom;if(intro.glow&&intro.glow.parent)intro.glow.parent.remove(intro.glow);intro.light=null;}

/* ---------- start / skip / finish ---------- */
function startIntro(){
  if(A11Y.reduceMotion||isAutomation()){finishIntro(true);return;}
  buildWorld(newSeed(),{biome:pick(['grove','glow','autumn','lotus'])});
  setRenderView(scene,camera,world.map.biome.bloom);
  buildMenuStage();buildClearing();captureIntroLight();applyIntroLight(0);
  phase='intro';intro.stage='forest';
  for(const s of ['menu','build','workshop','hud','chal'])$('#'+s).hidden=true;
  $('#introGate').hidden=false;$('#introUI').hidden=true;intro.t=0;intro.started=false;intro.done=false;intro.flags={};intro.shot=-1;intro.lookInit=false;
}
function isAutomation(){try{return !!navigator.webdriver;}catch(e){return false;}}
function beginCutscene(){AudioFX.init();$('#introGate').hidden=true;$('#introUI').hidden=false;intro.started=true;intro.t=0;intro.subIdx=-1;intro.flags={};intro.shot=-1;$('#introSkip').focus();
  const f=$('#introFade');f.style.background='#020604';f.style.transition='none';f.style.opacity='1';}
function finishIntro(instant,seamless){if(intro.done)return;intro.done=true;$('#introGate').hidden=true;$('#introUI').hidden=true;$('#introSub').textContent='';
  settleIntroStage();restoreIntroLight();
  openMenu();const fade=$('#introFade');fade.style.background='';
  if(seamless||instant)fade.style.opacity='0';
  else{fade.style.transition='none';fade.style.opacity='1';requestAnimationFrame(()=>{fade.style.transition='opacity .9s ease';fade.style.opacity='0';});}
  document.body.classList.add('menuEnter');setTimeout(()=>document.body.classList.remove('menuEnter'),1600);
  if(AudioFX.ctx&&!instant)AudioFX.play('win',.6);if(typeof showWelcomeIfNeeded==='function')setTimeout(showWelcomeIfNeeded,instant?300:1400);}
// skipping (or ending): the crowd has moved on, your team stands awake on the home stage
function settleIntroStage(){for(const r of intro.rocks)disposeView(r.view);intro.rocks=[];const st=menuStage;if(!st||!st.active||!world)return;const map=world.map;
  for(const e of st.ents){clearDormant(e);e.scripted=false;e.hidden=false;e.awake=false;e.path=null;e.x=e.hx;e.z=e.hz;e.y=map.heightAt(e.x,e.z);e.vx=e.vz=0;e.vy=0;e.grounded=true;
    if(e.view.sprout)e.view.sprout.g.scale.setScalar(e.view.sprout.base);if(e.view.ring)e.view.ring.visible=true;}}

/* ---------- the shots ---------- */
function introWorldTick(rdt,now){const tm=now*.001;
  for(const n of world.neutrals){idleNeutral(n,rdt);if(!n.alive){n.view.root.visible=false;continue;}animateCreatureView(n,rdt,tm);}
  for(const n of world.nests)animateNest(n,rdt,tm);updateParticles(rdt);
  if(skyMesh){skyMesh.material.uniforms.time.value=tm;skyMesh.position.copy(camera.position);}}
function shotIndex(t){let i=0;for(let k=0;k<SHOT_AT.length;k++)if(t>=SHOT_AT[k])i=k;return i;}
function shotPose(t,out){const S=intro.shots;const i=shotIndex(t);const t0=SHOT_AT[i],t1=i+1<SHOT_AT.length?SHOT_AT[i+1]:INTRO_LEN;const u=ease(clamp((t-t0)/(t1-t0),0,1));
  if(i<4){const s=S[i];out.P.copy(s.P0).lerp(s.P1,u);out.L.copy(s.L0).lerp(s.L1,i===2?ease(smooth(7.9,8.9,t)):u);
    if(i===2){const e0=menuStage.ents[0];const r=ease(smooth(7.6,9.2,t));out.P.copy(s.P0).lerp(s.P1,r*.85+u*.15);out.L.x=lerp(out.L.x,e0.x,.5);out.L.z=lerp(out.L.z,e0.z,.5);}return out;}
  // crowd shot: the camera stays put and pans to follow the stones
  let mx=0,my=0,mz=0,n=0;for(const r of intro.rocks){if(r.gone||!r.awake)continue;mx+=r.x;my+=r.y;mz+=r.z;n++;}
  const tgt=n?_iv3.set(mx/n,my/n+.7,mz/n):S[4].L0;intro.pan=(intro.pan||tgt.clone()).lerp(tgt,.06);
  if(i===4){out.P.copy(S[4].P0);out.L.copy(intro.pan);return out;}
  // descend into the exact home-screen framing; the look point settles a beat before the camera does
  const pose=menuCamPose(menuStage.t);const s5=S[5];const e=ease(u);out.P.copy(s5.P0).lerp(pose.P,e);out.L.copy(s5.L0).lerp(pose.L,ease(clamp(u*1.3,0,1)));
  for(let g=0;g<10&&canopyAt(out.P.x,out.P.y,out.P.z);g++)out.P.y+=.6;
  out.P.y=Math.max(out.P.y,world.map.heightAt(out.P.x,out.P.z)+.6);return out;}
const _pose={P:new T.Vector3(),L:new T.Vector3()};
function updateIntro(rdt,now){
  const time=now*.001;const st=menuStage;if(!world||!intro.K){return;}const map=world.map;
  introWorldTick(rdt,now);st.t+=rdt;const e0=st.ents[0];
  if(!intro.started){// behind the "press to play" gate: the establishing shot, barely drifting
    shotPose(0,_pose);_pose.P.x+=Math.sin(time*.25)*.25;applyIntroLight(0);}
  else{intro.t+=rdt;const t=intro.t;const F=intro.flags;introSubs(t);applyIntroLight(t);
    $('#introFade').style.opacity=String(1-smooth(0,1.6,t));
    // a few light motes drift up from your stone while it sleeps
    if(t<6.4&&Math.random()<rdt*2.5){const p=e0.view.root.position;emit(p.x+(Math.random()-.5)*.8,p.y+.4,p.z+(Math.random()-.5)*.8,{n:1,color:'#c8ffe0',glow:2,speed:.3,up:.8,life:1.6,size:.08,grav:-.3});}
    if(t>4.7&&!F.s1){F.s1=true;e0.shiv=.35;AudioFX.play('land',.25);}
    if(t>5.45&&!F.s2){F.s2=true;e0.shiv=.6;AudioFX.play('land',.35);const p=e0.view.root.position;emit(p.x,p.y+.1,p.z,{n:12,color:map.biome.ground,glow:.6,speed:2.6,flat:true,life:.6,size:.22,grav:0});}
    if(t>6.3&&!F.w0){F.w0=true;wakeRock(e0,true,1);}
    if(t>10&&!F.walk0){F.walk0=true;e0.path=[new T.Vector3(e0.hx,0,e0.hz)];e0.speed=2.6;}
    if(t>10.1&&!F.pals){F.pals=true;st.ents.slice(1).forEach((e,i)=>setTimeout(()=>wakeRock(e,true,1.4),i*400));}
    for(const r of intro.rocks){if(!r.awake&&t>r.wakeAt)wakeRock(r,Math.random()<.35);}
    shotPose(t,_pose);
    if(t>=INTRO_LEN)finishIntro(false,true);}
  // everybody: wake up, walk, animate (with the full locomotion rig)
  for(const e of st.ents){stepWake(e,rdt);if(e.path){walkPath(e,rdt);if(e.path&&!e.path.length){e.path=null;e.vx=e.vz=0;}}
    else if(e.awake&&e.wk>2.9){e.yaw+=angDiff(e.yaw,Math.atan2(camera.position.x-e.x,camera.position.z-e.z))*Math.min(1,rdt*2.5);}
    if(e.emoteT>0)e.emoteT-=rdt;animateCreatureView(e,rdt,time);shiver(e,rdt,time);if(e.view.ring)e.view.ring.visible=e.awake&&e.sleep<.05&&intro.t>14.8;}
  for(const r of intro.rocks){stepWake(r,rdt);walkPath(r,rdt);if(r.emoteT>0)r.emoteT-=rdt;r.view.root.visible=!r.gone;if(!r.gone)animateCreatureView(r,rdt,time);}
  // fixed shots: hard cut between them, gentle damping only within a shot
  const shot=intro.started?shotIndex(intro.t):-1;const cut=shot!==intro.shot;intro.shot=shot;
  const k=cut||!intro.lookInit?1:1-Math.exp(-rdt*(shot>=4?3:8));intro.lookInit=true;camera.position.lerp(_pose.P,k);intro.look.lerp(_pose.L,k);
  camera.lookAt(intro.look);sunFollow(st.c.x,st.c.y,st.c.z);
}
function shiver(e,rdt,time){if(!(e.shiv>0)){if(e.shook){e.shook=false;e.view.root.rotation.z=0;}return;}e.shook=true;e.shiv=Math.max(0,e.shiv-rdt);const a=Math.min(1,e.shiv*3)*.035;const r=e.view.root;r.position.x+=Math.sin(time*63)*a;r.position.z+=Math.cos(time*71)*a;r.rotation.z=Math.sin(time*55)*a*1.5;}

$('#introPlay').addEventListener('click',()=>beginCutscene());
$('#introSkip').addEventListener('click',()=>{sfx('ui');finishIntro(false);});
addEventListener('keydown',e=>{if(phase!=='intro')return;if(!intro.started&&(e.key==='Enter'||e.key===' ')){e.preventDefault();beginCutscene();return;}if(intro.started&&(e.key==='Escape'||e.key==='Enter'||e.key===' ')){e.preventDefault();finishIntro(false);}},true);
