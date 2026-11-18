'use strict';
/* Creature Clash — core: utilities, settings, audio, renderer, shared materials, particles */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const T=window.THREE;
if(!T){document.getElementById('loaderr').hidden=false;throw new Error('Three.js failed to load');}

/* ---------- utilities ---------- */
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(x,z){const h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h);}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);const u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);return lerp(lerp(a,b,u),lerp(c,d,u),v);}
function fbm(x,z){return vnoise(x,z)*.55+vnoise(x*2.1+5.2,z*2.1+1.3)*.3+vnoise(x*4.3+9.1,z*4.3+7.7)*.15;}
const col=h=>new T.Color(h).convertSRGBToLinear();
const pick=(arr,r=Math.random)=>arr[Math.floor(r()*arr.length)];
const dist2=(ax,az,bx,bz)=>{const dx=ax-bx,dz=az-bz;return dx*dx+dz*dz;};
const fmtTime=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const esc=Sec.esc;
const clone=o=>JSON.parse(JSON.stringify(o));
const norm3=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:Sec.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
// SaveKeys.Key(name): dev_ prefix in debug builds (this prototype is a dev build)
const SaveKey=name=>'dev_cc_'+name;
// Developer tools (console, debug hooks) only when the page is opened with #dev at the end of its link.
const DEV_BUILD=(()=>{try{return location.hash==='#dev';}catch(e){return false;}})();
/* accessibility settings (UI in a11y.js) */
const A11Y_DEFAULT={uiScale:1,contrast:false,palette:'default',reduceMotion:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),flashes:true,captions:false,announce:true,gameSpeed:1,aimAssist:false,autoLock:false,toggleRevive:false,toggleGlide:false,sens:1,invertY:false,welcomed:false,
  keys:{forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',dodge:'ShiftLeft',special:'KeyQ',revive:'KeyE',lock:'Tab',atk1:'Digit1',atk2:'Digit2',atk3:'Digit3',atk4:'Digit4',pause:'KeyP'}};
const A11Y=Sec.a11y(store.get(SaveKey('a11y'),{}),A11Y_DEFAULT,{default:1,deutan:1,tritan:1}); // keep in sync with PALETTES in a11y.js
function saveA11y(){store.set(SaveKey('a11y'),A11Y);}

/* ---------- MatchSettings & RewardRules (SUGGESTION = not accepted yet) ---------- */
const S={
  buildSec:120, battleSec:600, teamSize:3,
  laneNestHp:1500, mainNestHp:6000,          // SUGGESTION
  downedSec:12, reviveSec:3, reviveHpFrac:.3, // SUGGESTION
  catchUpHeal:8,                              // SUGGESTION
  // OPEN QUESTION
  timerIsHardLimit:true,
  // SUGGESTIONS
  mainNestNeedsClearedLane:false,
  downedCanBeFinishedOff:true,
  nestsSpitGoo:true,
  outOfCombatRegen:3,
};
const RW={dnaPlayer:25,dnaBot:15,dropChance:.5,xpMatch:100,xpWin:50,xpKill:10,xpNest:15};
const TEAMS={blue:{id:'blue',name:'Moon',hex:'#5ab4ff',sign:-1},red:{id:'red',name:'Sun',hex:'#ff5a4a',sign:1}};
const other=t=>t==='blue'?'red':'blue';

/* ---------- audio ---------- */
const AudioFX={ctx:null,master:null,on:true,music:null,musicOn:true,
  init(){if(this.ctx)return;try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.45;this.master.connect(this.ctx.destination);}catch(e){this.ctx=null;}},
  tone(type,f0,f1,dur,vol,delay,dest){const c=this.ctx;if(!c)return;const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest||this.master);o.start(t);o.stop(t+dur+.03);},
  noise(dur,vol,freq,delay){const c=this.ctx;if(!c)return;const t=c.currentTime+(delay||0);if(!this.nb){this.nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=this.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}const s=c.createBufferSource();s.buffer=this.nb;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=c.createGain();g.gain.setValueAtTime(Math.max(.0002,vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur+.02);},
  play(name,vol){if(!this.ctx||!this.on||vol<=.02)return;const v=vol;const p=.9+Math.random()*.2;
    switch(name){
      case 'jump':this.tone('triangle',220*p,560*p,.18,.25*v);break;
      case 'land':this.noise(.12,.25*v,500);break;
      case 'dodge':this.tone('sine',700*p,240*p,.16,.15*v);this.noise(.12,.12*v,2500);break;
      case 'bite':this.tone('square',320*p,110,.08,.12*v);this.noise(.06,.2*v,1800);break;
      case 'peck':this.tone('square',900*p,600,.04,.08*v);break;
      case 'slash':this.noise(.1,.25*v,4200);this.tone('sawtooth',900*p,300,.07,.05*v);break;
      case 'pinch':this.tone('square',500*p,1400*p,.06,.1*v);this.noise(.05,.15*v,3000);break;
      case 'sting':this.tone('square',1200*p,500,.07,.08*v);break;
      case 'spin':this.tone('sawtooth',160,420,.35,.07*v);this.noise(.3,.12*v,900);break;
      case 'charge':this.tone('sawtooth',110,240,.35,.1*v);break;
      case 'spit':this.tone('sine',650*p,180,.14,.22*v);this.noise(.08,.1*v,1200);break;
      case 'zap':this.tone('sawtooth',1800*p,200,.18,.12*v);this.noise(.15,.2*v,6000);break;
      case 'splat':this.noise(.16,.25*v,900);this.tone('sine',200*p,70,.12,.15*v);break;
      case 'hit':this.noise(.1,.3*v,1400);this.tone('sine',150*p,60,.12,.25*v);this.tone('sine',900*p,1500*p,.09,.1*v,.02);break;
      case 'thorns':this.tone('square',1600*p,900,.05,.08*v);break;
      case 'downed':this.tone('triangle',600,180,.5,.22*v);this.tone('triangle',400,120,.5,.12*v,.08);break;
      case 'death':this.tone('sawtooth',520*p,55,.65,.16*v);this.tone('sine',1400,300,.35,.12*v,.1);this.noise(.4,.2*v,700,.05);break;
      case 'nest':this.noise(.7,.4*v,500);this.tone('sine',110,38,.7,.35*v);break;
      case 'flop':this.tone('sine',140,45,.4,.4*v);this.noise(.35,.3*v,400);break;
      case 'heal':[523,659,784].forEach((f,i)=>this.tone('sine',f,f*1.01,.22,.12*v,i*.06));break;
      case 'shield':this.tone('sine',300,900,.3,.15*v);this.tone('triangle',600,1200,.25,.06*v,.05);break;
      case 'ink':this.noise(.5,.3*v,500);this.tone('sine',300,90,.4,.15*v);break;
      case 'camo':this.tone('sine',900,300,.4,.1*v);this.tone('sine',1200,400,.35,.06*v,.05);break;
      case 'burrow':this.noise(.6,.3*v,300);break;
      case 'popup':this.noise(.3,.35*v,700);this.tone('triangle',150,500,.2,.2*v);break;
      case 'inflate':this.tone('sine',200,800,.4,.2*v);break;
      case 'boing':this.tone('triangle',180,700,.2,.2*v);break;
      case 'swish':this.noise(.12,.22*v,2600);this.tone('sine',500*p,220*p,.1,.08*v);break;
      case 'squeak':this.tone('square',900*p,1700*p,.07,.09*v);this.tone('square',1500*p,800*p,.08,.07*v,.06);break;
      case 'flip':this.tone('triangle',260*p,900*p,.16,.16*v);this.noise(.08,.12*v,3000);break;
      case 'bubble':this.tone('sine',300*p,1200*p,.07,.1*v);break;
      case 'whoosh':this.noise(.35,.18*v,1500);this.tone('sine',260,520,.3,.05*v);break;
      case 'revive':[392,523,659,784].forEach((f,i)=>this.tone('triangle',f,f,.18,.14*v,i*.07));break;
      case 'geyser':this.noise(.9,.25*v,1600);this.tone('sine',90,40,.8,.15*v);break;
      case 'ui':this.tone('sine',880,1320,.06,.12*v);break;
      case 'place':this.tone('triangle',500,900,.08,.15);this.noise(.05,.1,3000);break;
      case 'remove':this.tone('triangle',700,250,.12,.12);break;
      case 'buy':[660,880,1320].forEach((f,i)=>this.tone('square',f,f,.08,.07,i*.06));break;
      case 'deny':this.tone('square',200,140,.15,.08);break;
      case 'win':[523,659,784,1046].forEach((f,i)=>this.tone('triangle',f,f,.3,.18,i*.12));break;
      case 'lose':[392,330,262,196].forEach((f,i)=>this.tone('triangle',f,f*.97,.35,.16,i*.15));break;
      case 'drop':[784,988,1175,1568].forEach((f,i)=>this.tone('sine',f,f,.12,.13,i*.05));break;
      case 'count':this.tone('square',660,660,.09,.08);break;
      case 'go':this.tone('square',990,990,.25,.1);break;
    }}
};
/* creature voices: pitch from body size */
AudioFX.voice=function(pitch,kind,vol){if(!this.ctx||!this.on||vol<=.02)return;const p=pitch*(.92+Math.random()*.16);
  if(kind==='hurt'){this.tone('square',820*p,420*p,.12,.06*vol);this.tone('sine',1100*p,560*p,.14,.09*vol,.01);}
  else if(kind==='attack'){this.tone('triangle',380*p,620*p,.08,.08*vol);}
  else if(kind==='death'){this.tone('sawtooth',700*p,140*p,.7,.07*vol);this.tone('sine',900*p,200*p,.65,.08*vol,.05);}
  else if(kind==='happy'){[1,1.25,1.5].forEach((f,i)=>this.tone('triangle',520*p*f,560*p*f,.09,.07*vol,i*.07));}};
function voice(c,kind){if(!c||!c.voicePitch)return;let v=1;if(typeof cam!=='undefined'){const d=Math.hypot(c.x-cam.fx,c.z-cam.fz);v=clamp(1-d/45,0,1);}AudioFX.voice(c.voicePitch,kind,v);}
/* procedural Y2K synth music */
const Music={on:true,ctx:null,out:null,mode:null,next:0,step:0,timer:null,
  start(mode){if(!AudioFX.ctx)return;this.ctx=AudioFX.ctx;if(!this.out){this.out=this.ctx.createGain();this.out.gain.value=.0001;this.out.connect(this.ctx.destination);
      this.dl=this.ctx.createDelay(1);this.dl.delayTime.value=.27;const fb=this.ctx.createGain();fb.gain.value=.32;this.dl.connect(fb);fb.connect(this.dl);this.dl.connect(this.out);}
    if(this.mode===mode)return;this.mode=mode;this.bpm=mode==='battle'?118:mode==='build'?104:88;
    if(!this.timer){this.next=this.ctx.currentTime+.1;this.timer=setInterval(()=>this.tick(),90);}this.fade();},
  fade(){if(!this.out)return;const t=this.ctx.currentTime;this.out.gain.cancelScheduledValues(t);this.out.gain.setTargetAtTime(this.on&&this.mode?(this.mode==='battle'?.16:.13):.0001,t,.6);},
  setOn(v){this.on=v;this.fade();},
  note(type,f,t,d,v,dest,filt){const c=this.ctx;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    if(filt){const f2=c.createBiquadFilter();f2.type='lowpass';f2.frequency.value=filt;o.connect(f2);f2.connect(g);}else o.connect(g);g.connect(this.out);if(dest)g.connect(dest);o.start(t);o.stop(t+d+.05);},
  hit(t,kind){const c=this.ctx;if(kind==='kick'){this.note('sine',120,t,.25,.5);const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.2);g.gain.setValueAtTime(.6,t);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(g);g.connect(this.out);o.start(t);o.stop(t+.3);return;}
    if(!AudioFX.nb)AudioFX.noise(.01,.0002,100);const s=c.createBufferSource();s.buffer=AudioFX.nb;const f=c.createBiquadFilter();f.type=kind==='hat'?'highpass':'bandpass';f.frequency.value=kind==='hat'?7000:1800;const g=c.createGain();const d=kind==='hat'?.05:.16;g.gain.setValueAtTime(kind==='hat'?.12:.25,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(this.out);s.start(t);s.stop(t+d+.02);},
  tick(){if(!this.ctx||!this.mode)return;const spb=60/this.bpm/4;const ahead=this.ctx.currentTime+.35;
    const prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];const mf=m=>440*Math.pow(2,(m-69)/12);
    while(this.next<ahead){const s=this.step;const bar=Math.floor(s/16)%4;const ch=prog[bar];const t=this.next;const battle=this.mode==='battle';
      if(this.on){
        if(s%16===0)for(const n of ch){this.note('sawtooth',mf(n),t,spb*15,.035,null,900);this.note('sawtooth',mf(n)*1.006,t,spb*15,.03,null,700);}
        if(s%4===0||(battle&&s%4===3))this.note('triangle',mf(ch[0]-24),t,spb*2.6,.22,null,600);
        const arp=[0,1,2,1,0,2,1,2];if(s%2===0)this.note('square',mf(ch[arp[(s/2)%8]]+12),t,spb*1.5,battle?.035:.025,this.dl,2600);
        if(battle){if(s%8===0)this.hit(t,'kick');if(s%8===4)this.hit(t,'snare');if(s%2===0)this.hit(t,'hat');}
        else if(this.mode==='build'){if(s%8===0)this.hit(t,'kick');if(s%4===2)this.hit(t,'hat');}}
      this.next+=spb;this.step++;}}
};
const SETTINGS_KEY=SaveKey('settings');
function sfx(name,at){let v=1;if(at&&typeof cam!=='undefined'){const d=Math.hypot(at.x-cam.fx,at.z-cam.fz);v=clamp(1-d/55,0,1);}AudioFX.play(name,v);if(A11Y.captions&&typeof addCaption==='function')addCaption(name,at,v);}

/* ---------- renderer ---------- */
const canvas=$('#gl');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
catch(e){$('#loaderr').innerHTML='<div><b>WebGL is turned off or not supported here.</b><br>Creature Clash needs a browser with 3D graphics enabled.</div>';$('#loaderr').hidden=false;throw e;}
let pixelRatio=Math.min(window.devicePixelRatio||1,1.75);
renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();
const camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,2200);
const cameras=[camera];
const hemi=new T.HemisphereLight(0xffffff,0x444444,.55);scene.add(hemi);
const sun=new T.DirectionalLight(0xffffff,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
{const sc=sun.shadow.camera;sc.left=-34;sc.right=34;sc.top=34;sc.bottom=-34;sc.near=1;sc.far=240;}
sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
const SUN_DIR=new T.Vector3(-.62,.7,.46).normalize();// golden-hour sun: longer, more readable shadows
const quality={bloom:true,shadows:true,ao:true};

const FinalShader={uniforms:{tDiffuse:{value:null},exposure:{value:.97},desat:{value:0},vig:{value:1.5},time:{value:0},sat:{value:1.16}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform sampler2D tDiffuse;uniform float exposure,desat,vig,time,sat;varying vec2 vUv;'+
  'vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}'+
  'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exposure;c=aces(c);c=pow(c,vec3(1./2.2));float l=dot(c,vec3(.2126,.7152,.0722));c*=mix(vec3(.94,.98,1.07),vec3(1.05,1.0,.93),smoothstep(.15,.85,l));c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.22);l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat*(1.-desat));vec2 d=vUv-.5;c*=1.-dot(d,d)*vig;c+=(fract(sin(dot(vUv+fract(time),vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}'};
let composer=null,finalPass=null,bloomPass=null,renderPass=null;
/* ---------- modern lighting pass ----------
   1. the scene renders into a 4x MSAA target that keeps its depth
   2. SSAO (12 samples, half resolution) is computed from that depth, with normals rebuilt from the faceted geometry
   3. the composite blurs the AO along depth edges, darkens creases with a cool tint, and adds a soft sun glow into the haze */
const AO_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const AO_COMMON='uniform sampler2D tDepth;uniform mat4 proj,invProj;varying vec2 vUv;vec3 vp(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 v=invProj*vec4(vec3(uv,d)*2.-1.,1.);return v.xyz/v.w;}';
const AO_FS=AO_COMMON+'uniform vec2 res;uniform float radius,power;'+
 'void main(){float d=texture2D(tDepth,vUv).x;if(d>.99999){gl_FragColor=vec4(1.);return;}vec2 t=1./res;vec3 p=vp(vUv);'+
 'vec3 r=vp(vUv+vec2(t.x,0.)),l=vp(vUv-vec2(t.x,0.)),u=vp(vUv+vec2(0.,t.y)),dn=vp(vUv-vec2(0.,t.y));'+
 'vec3 dx=abs(r.z-p.z)<abs(p.z-l.z)?r-p:p-l;vec3 dy=abs(u.z-p.z)<abs(p.z-dn.z)?u-p:p-dn;vec3 n=normalize(cross(dx,dy));'+
 'float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float a0=ign*6.2831853;'+
 'vec3 tg=normalize(abs(n.y)<.9?cross(n,vec3(0.,1.,0.)):cross(n,vec3(1.,0.,0.)));vec3 bt=cross(n,tg);float rad=radius*clamp(-p.z/14.,1.,3.);float occ=0.;'+
 'for(int i=0;i<12;i++){float fi=float(i);float k=(fi+.5)/12.;float ang=a0+fi*2.39996;float sr=sqrt(1.-k);vec3 h=vec3(cos(ang)*sr,sin(ang)*sr,sqrt(k));float sc=mix(.12,1.,fract(fi/12.+ign));sc*=sc;'+
 'vec3 s=p+(tg*h.x+bt*h.y+n*h.z)*rad*sc;vec4 c=proj*vec4(s,1.);vec2 su=c.xy/c.w*.5+.5;if(su.x<0.||su.x>1.||su.y<0.||su.y>1.)continue;'+
 'float sz=vp(su).z;float rc=smoothstep(0.,1.,rad/max(abs(p.z-sz),1e-4));occ+=(sz>=s.z+.03*rad?1.:0.)*rc;}'+
 'float ao=clamp(1.-occ/12.*power,0.,1.);gl_FragColor=vec4(ao,ao,ao,1.);}';
const COMP_FS='#include <packing>\n'+AO_COMMON+'uniform sampler2D tColor,tAO,shMap;uniform vec2 aoRes,colRes;uniform float aoK,fogNear,fogFar,fogDen,glowK,volK,dofK;uniform vec3 sunDirV,sunCol,aoTint,camPos,sunDirW;uniform mat4 camWorld,shMat;'+
 'void main(){vec4 c=texture2D(tColor,vUv);float d0=texture2D(tDepth,vUv).x;vec3 p0=vp(vUv);float ao=1.;'+
 'if(aoK>0.&&d0<.99999){float sum=0.,w=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y))/aoRes;float dz=vp(vUv+o).z;float ww=exp(-abs(dz-p0.z)*2.5);sum+=texture2D(tAO,vUv+o).x*ww;w+=ww;}ao=sum/max(w,1e-4);}'+
 'c.rgb*=mix(vec3(1.),mix(aoTint,vec3(1.),ao),aoK);'+
 'float dist=d0>.99999?1e5:length(p0);vec3 vd=normalize(p0);float g=max(dot(vd,sunDirV),0.);float fogF=smoothstep(fogNear,fogFar,dist);'+
 'if(fogDen>0.)fogF=1.-exp(-pow(fogDen*min(dist,4000.),2.));'+
 // distance blur (soft depth of field on the far background)
 'if(dofK>0.){float bk=smoothstep(32.,120.,dist)*dofK;if(bk>.01){vec3 acc=c.rgb;for(int i=0;i<8;i++){float a=float(i)*.785398;acc+=texture2D(tColor,vUv+vec2(cos(a),sin(a))*bk*2.6/colRes).rgb;}c.rgb=acc/9.;}}'+
 'c.rgb+=sunCol*(pow(g,7.)*.85+pow(g,40.)*1.2)*fogF*glowK;'+
 // volumetric light: march the view ray through the sun shadow map, so light shafts appear where sunlight reaches the haze
 'if(volK>0.){vec3 wp=(camWorld*vec4(d0>.99999?vd*80.:p0,1.)).xyz;vec3 rd=wp-camPos;float L=min(length(rd),80.);rd=normalize(rd);'+
 'float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float lit=0.;const int NS=20;'+
 'for(int i=0;i<NS;i++){float t=(float(i)+ign)/float(NS);vec3 q=camPos+rd*L*t*t;vec4 sc=shMat*vec4(q,1.);sc.xyz/=sc.w;float v=1.;'+
 'if(sc.x>0.&&sc.x<1.&&sc.y>0.&&sc.y<1.&&sc.z<1.)v=step(sc.z-.003,unpackRGBAToDepth(texture2D(shMap,sc.xy)));lit+=v;}lit/=float(NS);'+
 'float mu=dot(rd,sunDirW);float ph=.35+1.15*pow(max(mu,0.),5.)+.25*(1.+mu*mu)*.5;float dens=1.-exp(-L*.022);'+
 'c.rgb+=sunCol*lit*dens*ph*volK;}'+
 'gl_FragColor=c;}';
let litPass=null;
function makeLitPass(w,h){
  const gl2=renderer.capabilities.isWebGL2;const dt=new T.DepthTexture(w,h);dt.type=T.UnsignedIntType;
  const rt=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples:gl2?4:0,depthTexture:dt});
  const aoRT=new T.WebGLRenderTarget(Math.max(1,w>>1),Math.max(1,h>>1));
  const shared={tDepth:{value:dt},proj:{value:new T.Matrix4()},invProj:{value:new T.Matrix4()}};
  const aoMat=new T.ShaderMaterial({uniforms:Object.assign({res:{value:new T.Vector2(w,h)},radius:{value:1.15},power:{value:1.7}},shared),vertexShader:AO_VS,fragmentShader:AO_FS,depthTest:false,depthWrite:false});
  const compMat=new T.ShaderMaterial({uniforms:Object.assign({tColor:{value:rt.texture},tAO:{value:aoRT.texture},aoRes:{value:new T.Vector2(w>>1,h>>1)},aoK:{value:.95},aoTint:{value:new T.Color(.16,.2,.32)},
    fogNear:{value:60},fogFar:{value:300},fogDen:{value:0},glowK:{value:0},volK:{value:0},dofK:{value:0},sunDirV:{value:new T.Vector3()},sunCol:{value:new T.Color()},shMap:{value:null},shMat:{value:new T.Matrix4()},camWorld:{value:new T.Matrix4()},camPos:{value:new T.Vector3()},sunDirW:{value:new T.Vector3()},colRes:{value:new T.Vector2(w,h)}},shared),vertexShader:AO_VS,fragmentShader:COMP_FS,depthTest:false,depthWrite:false});
  const pass=new T.Pass();pass.needsSwap=true;pass.scene=scene;pass.camera=camera;
  const aoQ=new T.FullScreenQuad(aoMat),compQ=new T.FullScreenQuad(compMat);const _sd=new T.Vector3();
  pass.setSize=(W,H)=>{rt.setSize(W,H);compMat.uniforms.colRes.value.set(W,H);dt.image.width=W;dt.image.height=H;aoRT.setSize(Math.max(1,W>>1),Math.max(1,H>>1));aoMat.uniforms.res.value.set(W,H);compMat.uniforms.aoRes.value.set(Math.max(1,W>>1),Math.max(1,H>>1));};
  pass.render=(r,writeBuffer)=>{const sc=pass.scene,cm=pass.camera;r.setRenderTarget(rt);r.clear();r.render(sc,cm);
    shared.proj.value.copy(cm.projectionMatrix);shared.invProj.value.copy(cm.projectionMatrixInverse);
    const useAO=quality.ao;if(useAO){r.setRenderTarget(aoRT);aoQ.render(r);}compMat.uniforms.aoK.value=useAO?.95:0;
    const f=sc.fog;const U=compMat.uniforms;const inWorld=sc===scene&&f&&(f.isFog||f.isFogExp2);U.volK.value=0;U.dofK.value=0;U.fogDen.value=0;
    if(inWorld){if(f.isFog){U.fogNear.value=f.near*.35;U.fogFar.value=f.far;}else{U.fogDen.value=f.density*.8;}U.glowK.value=pass.glowK!=null?pass.glowK:.55;
      if(pass.volK&&quality.vol!==false&&quality.shadows&&sun.castShadow&&sun.shadow.map){U.volK.value=pass.volK;U.shMap.value=sun.shadow.map.texture;U.shMat.value.copy(sun.shadow.matrix);U.camWorld.value.copy(cm.matrixWorld);U.camPos.value.setFromMatrixPosition(cm.matrixWorld);U.sunDirW.value.copy(sun.position).sub(sun.target.position).normalize();}
      U.dofK.value=pass.dofK||0;
      _sd.copy(sun.position).sub(sun.target.position).normalize().transformDirection(cm.matrixWorldInverse);U.sunDirV.value.copy(_sd);U.sunCol.value.copy(sun.color).multiplyScalar(.5);}else U.glowK.value=0;
    r.setRenderTarget(pass.renderToScreen?null:writeBuffer);compQ.render(r);};
  return pass;}
let curScene=scene,curCam=camera;
(function setupComposer(){
  try{
    if(!T.EffectComposer||!T.RenderPass||!T.UnrealBloomPass||!T.ShaderPass||!T.CopyShader||!T.LuminosityHighPassShader)throw new Error('no post');
    const rt=new T.WebGLRenderTarget(Math.floor(innerWidth*pixelRatio),Math.floor(innerHeight*pixelRatio),{type:T.HalfFloatType});
    composer=new T.EffectComposer(renderer,rt);
    if(!T.Pass||!T.FullScreenQuad)throw new Error('no pass');renderPass=litPass=makeLitPass(Math.floor(innerWidth*pixelRatio),Math.floor(innerHeight*pixelRatio));composer.addPass(renderPass);
    bloomPass=new T.UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.6,.55,.9);composer.addPass(bloomPass);
    finalPass=new T.ShaderPass(FinalShader);composer.addPass(finalPass);
    renderer.toneMapping=T.NoToneMapping;renderer.outputEncoding=T.LinearEncoding;
  }catch(e){composer=null;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputEncoding=T.sRGBEncoding;renderer.toneMappingExposure=1.05;}
})();
function setRenderView(sc,cm,bloomT){curScene=sc;curCam=cm;if(renderPass){renderPass.scene=sc;renderPass.camera=cm;}if(bloomPass&&bloomT!=null)bloomPass.threshold=(typeof REAL!=="undefined"&&REAL)?bloomT*1.1:bloomT;}
function renderFrame(time,desat){if(composer){finalPass.uniforms.time.value=time;finalPass.uniforms.desat.value=desat||0;composer.render();}else renderer.render(curScene,curCam);}
function onResize(){const w=innerWidth,h=innerHeight;for(const c of cameras){c.aspect=w/h;c.updateProjectionMatrix();}renderer.setSize(w,h,false);if(composer)composer.setSize(w,h);}
addEventListener('resize',onResize);

const pmrem=new T.PMREMGenerator(renderer);
const SKY_VS='varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}';
const SKY_FS='uniform vec3 top,mid,hor,bot;uniform float time,stars;varying vec3 vDir;'+
 'float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}'+
 'void main(){vec3 d=normalize(vDir);float h=d.y;vec3 c=h>0.?mix(hor,mid,smoothstep(0.,.32,h)):mix(hor,bot,smoothstep(0.,-.25,h));c=mix(c,top,smoothstep(.32,1.,h));'+
 'vec3 q=d*220.;vec3 cell=floor(q);float s=h3(cell);vec3 f=fract(q)-.5;float st=step(.986,s)*smoothstep(.06,.5,h)*smoothstep(.17,.0,length(f));float tw=.55+.45*sin(time*2.3+s*80.);c+=vec3(st*tw*3.0*stars);'+
 'float neb=sin(d.x*5.+d.z*3.)*sin(d.z*4.-d.y*6.)*.5+.5;c+=mid*neb*.18*smoothstep(.15,.8,h);gl_FragColor=vec4(c,1.);}';
function skyMaterial(B,starsAmt){return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:col(B.skyTop)},mid:{value:col(B.skyMid)},hor:{value:col(B.skyHorizon)},bot:{value:col(B.wall)},time:{value:0},stars:{value:starsAmt}},vertexShader:SKY_VS,fragmentShader:SKY_FS});}
function makeEnvMap(B){
  const es=new T.Scene();const sm=skyMaterial(B,0);const sky=new T.Mesh(new T.SphereGeometry(50,32,16),sm);es.add(sky);
  const pg=new T.PlaneGeometry(1,1);
  const key=new T.Mesh(pg,new T.MeshBasicMaterial({color:col(B.sun||'#ffffff').multiplyScalar(7),side:T.DoubleSide}));key.scale.set(22,14,1);key.position.copy(SUN_DIR).multiplyScalar(38);key.lookAt(0,0,0);es.add(key);
  const fill=new T.Mesh(pg,new T.MeshBasicMaterial({color:col(B.skyHorizon).multiplyScalar(2.2),side:T.DoubleSide}));fill.scale.set(30,10,1);fill.position.set(30,6,-30);fill.lookAt(0,0,0);es.add(fill);
  const rt=pmrem.fromScene(es,.03);
  sky.geometry.dispose();sm.dispose();pg.dispose();key.material.dispose();fill.material.dispose();
  return rt;
}

/* ---------- shared geometry & materials ---------- */
const GEO={};const geo=(k,fn)=>GEO[k]||(GEO[k]=fn());
const MAT={};const matc=(k,fn)=>MAT[k]||(MAT[k]=fn());
/* Low-poly art direction: every primitive is capped to a small number of segments so the whole game reads as one
   retro, faceted style (flat shading does the rest). Eyes and the sky keep their smooth geometry. */
// Flat shading rebuilds normals from screen derivatives; sub-pixel slivers (distant grass) give a zero vector and NaN pixels
// that bloom smears into black blots. Guard it once for every material.
T.ShaderChunk.normal_fragment_begin=T.ShaderChunk.normal_fragment_begin.replace('vec3 normal = normalize( cross( fdx, fdy ) );','vec3 fcr = cross( fdx, fdy );\n\tvec3 normal = dot( fcr, fcr ) > 1e-30 ? normalize( fcr ) : vec3( 0.0, 0.0, 1.0 );');
const LP={sph:[12,8],rad:9,tube:10,torR:6,torT:16,circ:12};
const lpSph=(r,w,h,...a)=>new T.SphereGeometry(r,Math.min(w==null?LP.sph[0]:w,LP.sph[0]),Math.min(h==null?LP.sph[1]:h,LP.sph[1]),...a);
const lpCyl=(a,b,h,n,hs,...x)=>new T.CylinderGeometry(a,b,h,Math.min(n==null?LP.rad:n,LP.rad),hs==null?1:hs,...x);
const lpCone=(r,h,n,hs,...x)=>new T.ConeGeometry(r,h,Math.min(n==null?LP.rad:n,LP.rad),hs==null?1:hs,...x);
const lpTor=(r,t,rs,ts,arc)=>new T.TorusGeometry(r,t,Math.min(rs==null?LP.torR:rs,LP.torR),Math.min(ts==null?LP.torT:ts,LP.torT),arc==null?TAU:arc);
const lpCirc=(r,n,...x)=>new T.CircleGeometry(r,Math.min(n==null?LP.circ:n,LP.circ),...x);
const sphereG=()=>geo('sph',()=>lpSph(1,12,8));
const smoothSphereG=()=>geo('sphSmooth',()=>new T.SphereGeometry(1,28,18));
const capsuleG=(r,l)=>geo('cap'+r.toFixed(2)+'_'+l.toFixed(2),()=>new T.CapsuleGeometry(r,l,3,8));
const coneG=(r,h,n=12)=>geo('cone'+r+'_'+h+'_'+n,()=>lpCone(r,h,n));
const cylG=(a,b,h,n=12)=>geo('cyl'+a+'_'+b+'_'+h+'_'+n,()=>lpCyl(a,b,h,n));
/* wind clock shared by grass, trees and leaves (vertex sway, see windify) */
const WIND={value:0};
function windify(m,k,y0){const prev=m.onBeforeCompile;m.onBeforeCompile=(sh,r)=>{if(prev)prev(sh,r);sh.uniforms.windT=WIND;sh.uniforms.windK={value:k};sh.uniforms.windY0={value:y0||0};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float windT,windK,windY0;').replace('#include <begin_vertex>',
   '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 wp0=vec3(instanceMatrix[3][0],0.,instanceMatrix[3][2]);\n#else\nvec3 wp0=vec3(modelMatrix[3][0],0.,modelMatrix[3][2]);\n#endif\nfloat wh=max(0.,transformed.y-windY0);float wph=windT*1.7+wp0.x*.21+wp0.z*.17;'+
   'transformed.x+=(sin(wph)*.7+sin(wph*2.3+1.3)*.3)*windK*wh;transformed.z+=(cos(wph*.8+.6)*.5)*windK*wh;');};
  const ck=m.customProgramCacheKey?m.customProgramCacheKey():'';m.customProgramCacheKey=()=>ck+'wind'+k+'_'+(y0||0);return m;}
/* toon-ish matte material for the low-poly look: flat shaded, no gloss, a soft painted rim light */
function lpMatOpts(o){return Object.assign({roughness:.86,metalness:0,flatShading:true},o||{});}
function physMat(hex,o){return new T.MeshPhysicalMaterial(Object.assign({color:col(hex),roughness:.42,metalness:0,clearcoat:.85,clearcoatRoughness:.2},o||{}));}
/* low-poly matte variant (used by the world dressing) */
const lmat=(hex,o)=>matc('l'+hex+JSON.stringify(o||{}),()=>new T.MeshStandardMaterial(Object.assign({color:col(hex)},lpMatOpts(o))));
const pmat=(hex,o)=>matc('p'+hex+JSON.stringify(o||{}),()=>physMat(hex,o));
const glowMat=(hex,i)=>matc('g'+hex+i,()=>new T.MeshBasicMaterial({color:col(hex).multiplyScalar(i),toneMapped:false}));
let disposables=[];const own=x=>{disposables.push(x);return x;};
let stripeTex=null;
function getStripeTex(){if(stripeTex)return stripeTex;const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=['#ff5ad6','#ffe14a','#55f0ff','#b8ff4f'][i%4];x.fillRect(0,i*8,64,8);}stripeTex=new T.CanvasTexture(c);stripeTex.encoding=T.sRGBEncoding;stripeTex.wrapS=stripeTex.wrapT=T.RepeatWrapping;return stripeTex;}

/* ---------- particles (instanced, glowing) ---------- */
const PMAX=1400;
const partMesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),PMAX);
partMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);partMesh.setColorAt(0,new T.Color(1,1,1));partMesh.instanceColor.setUsage(T.DynamicDrawUsage);partMesh.frustumCulled=false;partMesh.count=0;scene.add(partMesh);
const parts=[];const _m=new T.Matrix4(),_q=new T.Quaternion(),_s=new T.Vector3(),_p=new T.Vector3(),_c=new T.Color(),_e=new T.Euler();
/* solid bodies: creatures push each other apart instead of passing through (several passes, so crowds settle).
   Uses the larger of the physics radius and the visible body, and removes the closing speed so bodies stop rather than jitter. */
function bodyR(m){return Math.max(m.radius||0,m.view&&m.view.radius?m.view.radius*.92:0)||.8;}
function separateBodies(list,iters){const n=list.length;for(let it=0;it<(iters||3);it++){let moved=false;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=list[i],b=list[j];const dx=b.x-a.x,dz=b.z-a.z;const min=bodyR(a)+bodyR(b);if(Math.abs(dx)>min||Math.abs(dz)>min)continue;
    {const ha=a.view&&a.view.height||1.4,hb=b.view&&b.view.height||1.4;const dy=(b.y||0)-(a.y||0);if(dy>ha*.8||-dy>hb*.8)continue;}// one is clearly above the other (jumping over)
    let d=Math.hypot(dx,dz);let nx,nz;if(d<1e-4){const r=((i*7+j*13)%17)/17*TAU;nx=Math.cos(r);nz=Math.sin(r);d=0;}else{nx=dx/d;nz=dz/d;}if(d>=min)continue;
    if(a.pinned&&b.pinned)continue;const wa=a.pinned?0:b.pinned?1:(a.isDummy||a.type==='boss')?.02:(b.isDummy||b.type==='boss')?.98:.5;
    const push=min-d;a.x-=nx*push*wa;a.z-=nz*push*wa;b.x+=nx*push*(1-wa);b.z+=nz*push*(1-wa);moved=true;
    // cancel the part of each velocity that drives them into each other
    for(const [m,sg] of [[a,1],[b,-1]]){const vn=((m.vx||0)*nx+(m.vz||0)*nz)*sg;if(vn>0){m.vx-=nx*vn*sg;m.vz-=nz*vn*sg;}}}
  if(!moved)break;}}
function emit(x,y,z,o){const n=o.n||8;const c=col(o.color||'#ffffff');const glow=o.glow||1;
  for(let i=0;i<n&&parts.length<PMAX;i++){const a=Math.random()*TAU,u=o.flat?0:(Math.random()*2-1);const sp=(o.speed||5)*(.4+Math.random()*.8);const r=Math.sqrt(1-u*u);
    const p={x:x+(Math.random()-.5)*(o.jit||0),y:y+(Math.random()-.5)*(o.jit||0)*.5,z:z+(Math.random()-.5)*(o.jit||0),vx:Math.cos(a)*r*sp,vy:(o.flat?0:u*sp)+(o.up||0)*(.6+Math.random()*.6),vz:Math.sin(a)*r*sp,
      life:(o.life||.7)*(.6+Math.random()*.6),max:0,size:(o.size||.15)*(.6+Math.random()*.8),r:c.r*glow,g:c.g*glow,b:c.b*glow,grav:o.grav==null?14:o.grav,drag:o.drag||1.5,rot:Math.random()*TAU};p.max=p.life;parts.push(p);}}
function updateParticles(dt){let w=0;for(let i=0;i<parts.length;i++){const p=parts[i];p.life-=dt;if(p.life<=0)continue;p.vy-=p.grav*dt;const dr=Math.exp(-p.drag*dt);p.vx*=dr;p.vz*=dr;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=dt*4;
    if(world&&p.grav>0){const gh=world.map.heightAt(p.x,p.z);if(p.y<gh){p.y=gh;p.vy*=-.3;p.vx*=.6;p.vz*=.6;}}
    const k=p.life/p.max;const s=p.size*(k<.3?k/.3:1);_p.set(p.x,p.y,p.z);_e.set(p.rot,p.rot*.7,0);_q.setFromEuler(_e);_s.set(s,s,s);_m.compose(_p,_q,_s);partMesh.setMatrixAt(w,_m);_c.setRGB(p.r,p.g,p.b);partMesh.setColorAt(w,_c);parts[w++]=p;}
  parts.length=w;partMesh.count=w;partMesh.instanceMatrix.needsUpdate=true;if(partMesh.instanceColor)partMesh.instanceColor.needsUpdate=true;}
