'use strict';
/* Creature Clash — opening cutscene (AAA pass).
   A fleet flown by real creature pilots carries YOUR creature's drop pod to the arena planet.
   The pod re-enters, then lands for real in the live arena, right on the home-screen stage,
   and the camera glides straight into the menu with no cut. */
const intro={scene:null,cam:new T.PerspectiveCamera(46,innerWidth/innerHeight,.1,5000),t:0,ships:[],trail:[],pod:null,done:false,started:false,subIdx:-1,stage:'space',shake:0};
cameras.push(intro.cam);
const INTRO_LEN=12.8,INTRO_SWITCH=7.45,INTRO_IMPACT=1.6;
const INTRO_SUBS=[[.3,'Somewhere in the Wobble Galaxy…'],[3.0,'The Great Creature Clash is about to begin!'],[4.8,'Drop pod away! Hold on tight!'],[7.5,'Touchdown in 3… 2… 1…'],[9.7,'Your team is waiting!']];
const _iv=new T.Vector3(),_iv2=new T.Vector3(),_iv3=new T.Vector3(),_iq=new T.Quaternion(),_iq2=new T.Quaternion(),_DOWN=new T.Vector3(0,-1,0),_YAX=new T.Vector3(0,1,0);

/* ---------- procedural surface maps (same pipeline as creature skin) ---------- */
function mapsFromHeight(h,W,H,S,rough){
  const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
  const cn=mk(),cr=mk();const xn=cn.getContext('2d'),xr=cr.getContext('2d');const dn=xn.createImageData(W,H),dr=xr.createImageData(W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const l=h[y*W+(x+W-1)%W],r=h[y*W+(x+1)%W],u=h[((y+H-1)%H)*W+x],d=h[((y+1)%H)*W+x];
    let nx=(l-r)*S,ny=(d-u)*S,nz=1;const ln=Math.hypot(nx,ny,nz);
    dn.data[i*4]=(nx/ln*.5+.5)*255;dn.data[i*4+1]=(ny/ln*.5+.5)*255;dn.data[i*4+2]=(nz/ln*.5+.5)*255;dn.data[i*4+3]=255;
    const rr=clamp(rough[i]*255,0,255);dr.data[i*4]=dr.data[i*4+1]=dr.data[i*4+2]=rr;dr.data[i*4+3]=255;}
  xn.putImageData(dn,0,0);xr.putImageData(dr,0,0);
  const tn=new T.CanvasTexture(cn),tr=new T.CanvasTexture(cr);for(const t of [tn,tr]){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;}
  return {normal:tn,rough:tr};
}
/* hull plating: staggered panels, bevelled seams, rivet rows, a little grime */
function hullTex(){
  if(TEXC.hull)return TEXC.hull;const W=256,H=256;const h=new Float32Array(W*H),ro=new Float32Array(W*H);const R=mulberry32(77);
  let y0=0;
  while(y0<H){const rh=Math.min(H-y0,26+Math.floor(R()*38));const seams=[];let sx=Math.floor(R()*40);while(sx<W){seams.push(sx);sx+=44+Math.floor(R()*80);}
    for(let y=y0;y<y0+rh;y++)for(let x=0;x<W;x++){let k=0;while(k<seams.length&&seams[k]<=x)k++;const pid=y0*31+k*7;const off=(hash2(pid,3)-.5)*.06;const i=y*W+x;
      let ex=99;for(const s of seams)ex=Math.min(ex,Math.abs(x-s));const e=Math.min(y-y0,y0+rh-1-y,ex);
      let v=1+off;if(e<1)v=.15;else if(e<2)v=.6+off;
      const ry=y-y0-4;if(ry>=-1.5&&ry<=1.5){const rx=((x+3)%9)-4;if(rx*rx+ry*ry<=2.2)v=1.28;}
      h[i]=v+(vnoise(x*.15,y*.15)-.5)*.02;
      ro[i]=.42+(hash2(pid,9)-.5)*.12+(vnoise(x*.05+pid,y*.05)-.5)*.25+(e<2?.3:0);}
    y0+=rh;}
  const m=mapsFromHeight(h,W,H,3.0,ro);m.normal.repeat.set(4,2);m.rough.repeat.set(4,2);return TEXC.hull=m;
}
function glowTex(){if(TEXC.glow)return TEXC.glow;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.6)');g.addColorStop(.45,'rgba(255,255,255,.14)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return TEXC.glow=new T.CanvasTexture(c);}
function glowSprite(hex,k,s){const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:col(hex).multiplyScalar(k),blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));sp.scale.setScalar(s);return sp;}
function nebulaTex(seed){const W=256;const c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d');const d=x.createImageData(W,W);const o=seed*13.7;
  for(let j=0;j<W;j++)for(let i=0;i<W;i++){const u=i/W-.5,v=j/W-.5;const r=Math.hypot(u,v)*2;const n=fbm(i*.018+o,j*.018+o)*.6+fbm(i*.055+o*2,j*.055)*.4;
    const a=clamp((n-.36)*2.4,0,1)*Math.pow(clamp(1-r,0,1),1.5);const k=(j*W+i)*4;d.data[k]=d.data[k+1]=d.data[k+2]=255;d.data[k+3]=a*255;}
  x.putImageData(d,0,0);return new T.CanvasTexture(c);}
const flameGeo=r=>geo('flame'+r,()=>{const c=new T.ConeGeometry(r,1,20,1,true);c.rotateX(Math.PI/2);c.translate(0,0,.5);return c;});
const flameMat=(hex,k,op)=>new T.MeshBasicMaterial({color:col(hex).multiplyScalar(k),transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});

/* ---------- shaders: planet, clouds, atmosphere, ring, re-entry plasma ---------- */
const INTRO_NOISE='float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}'+
  'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}'+
  'float fb(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}';
const SPHERE_VS='uniform float rad;varying vec3 vP;varying vec3 vN;varying vec3 vW;varying vec3 vNv;void main(){vP=position/rad;vN=normalize(mat3(modelMatrix)*normal);vNv=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const PLANET_FS='uniform vec3 g1,g2,sea,det,atmo,ice,L;uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vW;varying vec3 vNv;'+INTRO_NOISE+
  'void main(){vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);vec3 q=vP*2.2;float w=fb(q+fb(q*1.3)*1.2);float land=smoothstep(.48,.52,w);'+
  'float h2=fb(vP*6.+3.);vec3 c=mix(sea*(.7+.5*fb(vP*4.)),mix(g1,g2,smoothstep(.35,.65,h2)),land);'+
  'float d=smoothstep(.62,.7,fb(vP*14.+7.))*land;c=mix(c,det,d*.8);'+
  'float coast=(1.-smoothstep(0.,.025,abs(w-.5)));c+=coast*atmo*.18;'+
  'c=mix(c,ice,smoothstep(.8,.92,abs(vP.y)+(fb(vP*5.)-.5)*.25));'+
  'float ndl=dot(N,L);float day=smoothstep(-.12,.35,ndl);vec3 col=c*(.025+1.15*max(ndl,0.)+day*.1);'+
  'vec3 H=normalize(L+V);col+=(1.-land)*pow(max(dot(N,H),0.),60.)*day*.8*vec3(1.,.95,.85);'+
  'col+=det*d*(1.-day)*1.8;'+
  'float fr=pow(1.-max(dot(N,V),0.),3.);col+=atmo*fr*(.12+1.5*smoothstep(-.3,.6,ndl));gl_FragColor=vec4(col,1.);}';
const CLOUD_FS='uniform vec3 L;uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vW;varying vec3 vNv;'+INTRO_NOISE+
  'void main(){vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float c=fb(vP*3.2+vec3(time*.012,0.,time*.004));float a=smoothstep(.53,.72,c);'+
  'float lit=.05+1.15*smoothstep(-.1,.5,dot(N,L));float edge=smoothstep(0.,.3,dot(N,V));gl_FragColor=vec4(vec3(1.,.98,.96)*lit,a*.85*edge);}';
const ATMO_FS='uniform vec3 atmo,L;varying vec3 vP;varying vec3 vN;varying vec3 vW;varying vec3 vNv;'+
  'void main(){float i=pow(smoothstep(0.,.42,-normalize(vNv).z),2.);float lit=.15+smoothstep(-.45,.6,dot(normalize(vN),L));gl_FragColor=vec4(atmo*i*lit*1.7,1.);}';
const RING_VS='varying vec3 vL;void main(){vL=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const RING_FS='uniform float r0,r1;uniform vec3 c1,c2;varying vec3 vL;'+INTRO_NOISE+
  'void main(){float r=(length(vL.xy)-r0)/(r1-r0);float b=n3(vec3(r*38.,0.,0.))*.6+n3(vec3(r*130.,4.,0.))*.4;'+
  'float gap=1.-(smoothstep(.44,.48,r)*(1.-smoothstep(.52,.56,r)))*.9;'+
  'float a=smoothstep(0.,.06,r)*(1.-smoothstep(.9,1.,r))*(.2+.65*b)*gap;gl_FragColor=vec4(mix(c1,c2,b)*1.15,a*.75);}';
const PLASMA_VS='varying vec3 vNv;varying vec3 vV;varying vec3 vP;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vNv=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const PLASMA_FS='uniform float k,time;uniform vec3 c1,c2;varying vec3 vNv;varying vec3 vV;varying vec3 vP;'+INTRO_NOISE+
  'void main(){float f=pow(1.-abs(dot(normalize(vNv),normalize(vV))),1.6);float n=n3(vP*4.+vec3(0.,time*9.,0.));'+
  'float lead=1.-smoothstep(-1.,.4,vP.y);float tail=1.-smoothstep(.2,1.,vP.y);'+
  'float a=k*(f*.9+.3*lead)*(.5+.9*n)*tail;gl_FragColor=vec4(mix(c1,c2,lead*.8+n*.2)*a*2.4,1.);}';

/* ---------- ships: painted panel hulls, chrome engines, real creature pilots ---------- */
const V2=(r,y)=>new T.Vector2(r,y);
function introShip(color,accent,pilotD,scale,flameHex){
  const g=new T.Group();const tx=hullTex();const fl=flameHex||'#6fe6f2';const blink=[];
  const paint=new T.MeshPhysicalMaterial({color:col(color),roughness:.75,roughnessMap:tx.rough,normalMap:tx.normal,normalScale:new T.Vector2(.6,.6),metalness:.15,clearcoat:1,clearcoatRoughness:.06});
  const trim=new T.MeshPhysicalMaterial({color:col(accent),roughness:.7,roughnessMap:tx.rough,normalMap:tx.normal,normalScale:new T.Vector2(.5,.5),metalness:.1,clearcoat:1,clearcoatRoughness:.08});
  const chrome=new T.MeshPhysicalMaterial({color:col('#d4dbe8'),metalness:1,roughness:.14,side:T.DoubleSide});
  const gun=new T.MeshPhysicalMaterial({color:col('#2c3140'),metalness:.8,roughness:.9,roughnessMap:tx.rough,normalMap:tx.normal});
  const prof=[V2(0,-2.5),V2(.3,-2.42),V2(.6,-2.12),V2(.84,-1.6),V2(.98,-.85),V2(1.04,0),V2(1,.85),V2(.86,1.55),V2(.66,2.05),V2(.5,2.3),V2(.2,2.36),V2(0,2.37)];
  const hg=new T.LatheGeometry(prof,72);hg.rotateX(Math.PI/2);const hull=new T.Mesh(hg,paint);hull.scale.set(1,.78,1);g.add(hull);
  const ng=new T.LatheGeometry(prof.slice(0,4).concat([V2(.86,-1.5)]),72);ng.rotateX(Math.PI/2);const nose=new T.Mesh(ng,trim);nose.scale.set(1.012,.79,1.004);g.add(nose);
  const belly=new T.Mesh(sphereG(),gun);belly.scale.set(.82,.34,1.9);belly.position.set(0,-.48,.15);g.add(belly);
  const band=new T.Mesh(new T.TorusGeometry(1.0,.07,12,72),trim);band.scale.set(1.02,.8,1);band.position.z=.55;g.add(band);
  for(const s of [-1,1]){const hl=new T.Mesh(sphereG(),glowMat('#fff6d8',3));hl.scale.set(.1,.07,.05);hl.position.set(s*.5,-.26,-2.05);g.add(hl);}
  // cockpit + pilot
  const ck=new T.Group();ck.position.set(0,.52,-.75);g.add(ck);
  const glass=new T.Mesh(new T.SphereGeometry(.68,40,24,0,TAU,0,Math.PI/2),new T.MeshPhysicalMaterial({color:col('#cfefff'),roughness:.02,transparent:true,opacity:.22,clearcoat:1,clearcoatRoughness:0,iridescence:.5,depthWrite:false,envMapIntensity:2}));
  glass.scale.set(1,.92,1.3);glass.renderOrder=2;ck.add(glass);
  const rim=new T.Mesh(new T.TorusGeometry(.68,.05,10,64),chrome);rim.scale.set(1,1.3,1);rim.rotation.x=Math.PI/2;ck.add(rim);
  let pilot=null;
  if(pilotD){const v=buildCreatureView(pilotD,{});if(v.cshadow)v.root.remove(v.cshadow);v.cshadow=null;const s=Math.min(.95/v.height,.55/v.radius);v.root.scale.setScalar(s);ck.add(v.root);
    pilot={view:v,x:0,y:-.42,z:.05,yaw:Math.PI,state:'alive',grounded:true,vx:0,vy:0,vz:0,emoteT:0,voicePitch:1.2};}
  // swept wings with nav-light pods
  const ws=new T.Shape();ws.moveTo(0,-.7);ws.lineTo(1.75,.25);ws.quadraticCurveTo(2.15,.42,2.05,.78);ws.lineTo(1.7,.95);ws.lineTo(0,1.25);ws.lineTo(0,-.7);
  const wg=new T.ExtrudeGeometry(ws,{depth:.1,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3,curveSegments:10});wg.translate(0,0,-.05);wg.rotateX(Math.PI/2);
  for(const s of [-1,1]){const w=new T.Mesh(wg,trim);w.scale.x=s;w.position.set(s*.7,-.18,.35);w.rotation.z=s*.07;g.add(w);
    const tp=new T.Mesh(capsuleG(.1,.7),chrome);tp.rotation.x=Math.PI/2;tp.position.set(s*2.72,-.04,1.0);g.add(tp);
    const nav=new T.Mesh(sphereG(),glowMat(s>0?'#7dff6a':'#ff5a7a',4));nav.scale.setScalar(.09);nav.position.set(s*2.72,-.04,.6);g.add(nav);
    const nsp=glowSprite(s>0?'#7dff6a':'#ff5a7a',2,1);nsp.position.copy(nav.position);g.add(nsp);blink.push(nsp);}
  // tail fin + antenna beacon
  const fs=new T.Shape();fs.moveTo(-.3,0);fs.lineTo(.85,0);fs.lineTo(.95,.12);fs.lineTo(.7,1.0);fs.quadraticCurveTo(.58,1.12,.45,1.0);fs.lineTo(-.3,0);
  const fg=new T.ExtrudeGeometry(fs,{depth:.06,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:3,curveSegments:8});fg.translate(0,0,-.03);fg.rotateY(-Math.PI/2);
  const fin=new T.Mesh(fg,trim);fin.position.set(0,.5,1.0);g.add(fin);
  const ant=new T.Mesh(cylG(.02,.02,.5,6),chrome);ant.position.set(.35,.85,.6);g.add(ant);
  const bea=glowSprite('#ffe14a',2.6,.55);bea.position.set(.35,1.12,.6);g.add(bea);blink.push(bea);
  // twin engines: chrome nacelles, hot inner disc, layered flames, heat glow
  const flames=[];
  for(const s of [-1,1]){const n=new T.Group();n.position.set(s*.62,-.14,1.85);g.add(n);
    const lg=new T.LatheGeometry([V2(0,-.6),V2(.22,-.6),V2(.34,-.48),V2(.38,-.2),V2(.38,.32),V2(.43,.5),V2(.41,.62),V2(.3,.62),V2(.27,.46)],40);lg.rotateX(Math.PI/2);n.add(new T.Mesh(lg,chrome));
    const disc=new T.Mesh(new T.CircleGeometry(.28,28),glowMat(fl,3.4));disc.position.z=.47;n.add(disc);
    const core=new T.Mesh(flameGeo(.16),flameMat(fl,4,.9));core.position.z=.55;n.add(core);
    const outer=new T.Mesh(flameGeo(.3),flameMat(fl,1.8,.5));outer.position.z=.55;n.add(outer);
    const hs=glowSprite(fl,1.6,1.5);hs.position.z=.7;n.add(hs);flames.push({core,outer,hs});}
  g.scale.setScalar(scale||1);g.userData={flames,blink,pilot};return g;
}

/* ---------- drop pod: ceramic shell, scorched heat shield, glass dome with YOUR creature inside ---------- */
function buildPod(design){
  const g=new T.Group();const tx=hullTex();const disp=[];const o=x=>{disp.push(x);return x;};
  const shellM=o(new T.MeshPhysicalMaterial({color:col('#f2efe8'),roughness:.8,roughnessMap:tx.rough,normalMap:tx.normal,normalScale:new T.Vector2(.5,.5),clearcoat:.8,clearcoatRoughness:.12,emissive:col('#ff6a1a'),emissiveIntensity:0}));
  const heatM=o(new T.MeshPhysicalMaterial({color:col('#4a2e26'),roughness:.85,metalness:.2,normalMap:tx.normal,emissive:col('#ff5a10'),emissiveIntensity:0}));
  const accM=o(new T.MeshPhysicalMaterial({color:col('#ff8a3d'),roughness:.35,clearcoat:1,clearcoatRoughness:.1}));
  const gunM=o(new T.MeshPhysicalMaterial({color:col('#2c3140'),metalness:.85,roughness:.35}));
  g.add(new T.Mesh(o(new T.LatheGeometry([V2(0,-1.05),V2(.55,-1.0),V2(.82,-.78),V2(.97,-.45),V2(1.02,-.1),V2(1.0,.1),V2(.92,.12)],64)),shellM));
  g.add(new T.Mesh(o(new T.LatheGeometry([V2(0,-1.22),V2(.4,-1.18),V2(.66,-1.04),V2(.8,-.88),V2(.78,-.8)],64)),heatM));
  const band=new T.Mesh(o(new T.TorusGeometry(1.0,.09,12,64)),gunM);band.rotation.x=Math.PI/2;band.position.y=.1;g.add(band);
  const lights=[];for(let i=0;i<8;i++){const a=i/8*TAU;const l=new T.Mesh(sphereG(),glowMat('#6fe6f2',3.5));l.scale.setScalar(.055);l.position.set(Math.cos(a)*1.08,.1,Math.sin(a)*1.08);g.add(l);lights.push(l);}
  const fs=new T.Shape();fs.moveTo(0,0);fs.lineTo(.42,-.15);fs.lineTo(.5,-.62);fs.lineTo(0,-.4);fs.lineTo(0,0);
  const fgeo=o(new T.ExtrudeGeometry(fs,{depth:.05,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:2}));fgeo.translate(0,0,-.025);
  for(let i=0;i<3;i++){const f=new T.Mesh(fgeo,accM);const a=i/3*TAU+.5;f.position.set(Math.cos(a)*.88,-.35,Math.sin(a)*.88);f.rotation.y=-a;g.add(f);}
  const lid=new T.Group();lid.position.y=.12;g.add(lid);
  const glass=new T.Mesh(o(new T.SphereGeometry(.97,48,24,0,TAU,0,Math.PI/2)),o(new T.MeshPhysicalMaterial({color:col('#d8f4ff'),roughness:.03,transparent:true,opacity:.2,clearcoat:1,clearcoatRoughness:0,iridescence:.6,depthWrite:false,envMapIntensity:2.2})));
  glass.scale.y=1.12;glass.renderOrder=2;lid.add(glass);
  const lr=new T.Mesh(o(new T.TorusGeometry(.97,.06,10,64)),gunM);lr.rotation.x=Math.PI/2;lid.add(lr);
  const ribG=o(new T.TorusGeometry(.98,.025,6,48,Math.PI));for(let i=0;i<4;i++){const r=new T.Mesh(ribG,gunM);r.scale.y=1.12;r.rotation.y=i/4*Math.PI;lid.add(r);}
  const cap=new T.Mesh(o(new T.CylinderGeometry(.16,.22,.12,20)),accM);cap.position.y=1.12;lid.add(cap);
  const bea=new T.Mesh(sphereG(),glowMat('#ff5a7a',4));bea.scale.setScalar(.09);bea.position.y=1.23;lid.add(bea);
  const v=buildCreatureView(design,{});if(v.cshadow)v.root.remove(v.cshadow);v.cshadow=null;const fit=Math.min(1.55/v.height,.78/v.radius);v.root.scale.setScalar(fit);g.add(v.root);
  const crea={view:v,x:0,y:-.62,z:0,yaw:0,state:'alive',grounded:true,vx:0,vy:0,vz:0,emoteT:0};
  const pl=new T.Mesh(o(new T.SphereGeometry(1,32,20)),o(new T.ShaderMaterial({uniforms:{k:{value:0},time:{value:0},c1:{value:col('#ff7a2a')},c2:{value:col('#fff0c0')}},vertexShader:PLASMA_VS,fragmentShader:PLASMA_FS,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})));
  pl.scale.set(1.45,2.9,1.45);pl.position.y=.95;pl.visible=false;g.add(pl);
  return {g,shellM,heatM,lid,lights,plasma:pl,crea,fit,disp,S:1,speed:30,vel:new T.Vector3(),released:false,owned:false};
}
function disposePod(p){if(!p)return;if(p.g.parent)p.g.parent.remove(p.g);if(p.lid.parent)p.lid.parent.remove(p.lid);if(p.scorch&&p.scorch.parent)p.scorch.parent.remove(p.scorch);disposeView(p.crea.view);for(const x of p.disp){try{x.dispose();}catch(e){}}p.disp.length=0;}
function animatePod(p,rdt,time){animateCreatureView(p.crea,rdt,time);const on=Math.floor(time*8)%p.lights.length;for(let i=0;i<p.lights.length;i++)p.lights[i].scale.setScalar(.055*(i===on?1.8:1));p.plasma.material.uniforms.time.value=time;}

/* ---------- space scene ---------- */
const INTRO_SPACE={skyTop:'#030214',skyMid:'#1d1150',skyHorizon:'#2a1d6a',wall:'#05030f',sun:'#fff0e0'};
function buildIntro(){
  const sc=new T.Scene();intro.scene=sc;sc.background=col('#020108');sc.add(intro.cam);
  const sky=new T.Mesh(new T.SphereGeometry(2000,32,16),skyMaterial(INTRO_SPACE,1.4));sky.renderOrder=-1;sc.add(sky);intro.sky=sky;
  sc.environment=makeEnvMap(INTRO_SPACE).texture;
  // two layers of stars
  for(const [N,sz,br] of [[2200,1.6,1.8],[260,3.2,3]]){const sp=new Float32Array(N*3);for(let i=0;i<N;i++){const v=new T.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize().multiplyScalar(900+Math.random()*700);sp[i*3]=v.x;sp[i*3+1]=v.y;sp[i*3+2]=v.z;}
    const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(sp,3));sc.add(new T.Points(sg,new T.PointsMaterial({color:new T.Color(br,br,br*1.15),size:sz,sizeAttenuation:false,toneMapped:false,transparent:true,depthWrite:false})));}
  // nebula clouds
  [['#7a3ad8',.55,-700,220,-1000,1100,1],['#2a8aff',.4,800,-120,-900,1000,2],['#ff5ab0',.35,300,420,1000,1200,3],['#3affd8',.22,-900,-300,600,900,4]].forEach(([c,op,x,y,z,s,seed])=>{
    const m=new T.SpriteMaterial({map:nebulaTex(seed),color:col(c),transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});const sp=new T.Sprite(m);sp.position.set(x,y,z);sp.scale.setScalar(s);sc.add(sp);});
  // lighting matches the arena: same sun direction as the env map
  sc.add(new T.HemisphereLight(col('#8f9cff'),col('#1a1030'),.45));
  const sun=new T.DirectionalLight(col('#fff0e0'),2.8);sun.position.copy(SUN_DIR).multiplyScalar(300);sc.add(sun);
  const rim=new T.DirectionalLight(col('#6fe6f2'),1.4);rim.position.set(80,-60,-300);sc.add(rim);
  const sunSp=glowSprite('#fff2d8',6,320);sunSp.position.copy(SUN_DIR).multiplyScalar(1400);sc.add(sunSp);
  const sunCore=glowSprite('#ffffff',10,70);sunCore.position.copy(sunSp.position);sc.add(sunCore);
  // the arena planet: shader surface, cloud deck, atmosphere and ring
  const pm=new T.ShaderMaterial({uniforms:{rad:{value:140},g1:{value:new T.Color()},g2:{value:new T.Color()},sea:{value:new T.Color()},det:{value:new T.Color()},atmo:{value:new T.Color()},ice:{value:col('#eef2ff')},L:{value:SUN_DIR.clone()},time:{value:0}},vertexShader:SPHERE_VS,fragmentShader:PLANET_FS});
  const planet=new T.Mesh(new T.SphereGeometry(140,128,96),pm);planet.position.set(0,-170,-420);sc.add(planet);intro.planet=planet;intro.planetM=pm;
  const cm=new T.ShaderMaterial({uniforms:{rad:{value:141.6},L:{value:SUN_DIR.clone()},time:{value:0}},vertexShader:SPHERE_VS,fragmentShader:CLOUD_FS,transparent:true,depthWrite:false});
  const clouds=new T.Mesh(new T.SphereGeometry(141.6,96,64),cm);clouds.position.copy(planet.position);sc.add(clouds);intro.clouds=clouds;intro.cloudM=cm;
  const am=new T.ShaderMaterial({uniforms:{rad:{value:151},atmo:{value:new T.Color()},L:{value:SUN_DIR.clone()}},vertexShader:SPHERE_VS,fragmentShader:ATMO_FS,side:T.BackSide,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
  const atmo=new T.Mesh(new T.SphereGeometry(151,96,64),am);atmo.position.copy(planet.position);sc.add(atmo);intro.atmoM=am;
  const rm=new T.ShaderMaterial({uniforms:{r0:{value:190},r1:{value:262},c1:{value:new T.Color()},c2:{value:new T.Color()}},vertexShader:RING_VS,fragmentShader:RING_FS,transparent:true,depthWrite:false,side:T.DoubleSide});
  const ring=new T.Mesh(new T.RingGeometry(190,262,192,2),rm);ring.position.copy(planet.position);ring.rotation.set(1.25,.2,.1);sc.add(ring);intro.ringM=rm;
  const tp=skinTex('pebble');const moon=new T.Mesh(new T.SphereGeometry(18,64,48),new T.MeshStandardMaterial({color:col('#b8b0d8'),roughness:.95,normalMap:tp.normal,normalScale:new T.Vector2(1.4,1.4)}));moon.position.set(260,90,-600);sc.add(moon);intro.moon=moon;
  // the fleet, each ship flown by a real creature
  const fleet=[['#ff8a3d','#ffd36b',1.6,0,1,6],['#5ad1ff','#2a5cff',1,-9,-1,14],['#ff6fae','#ffe14a',1,9,2.5,18],['#b8ff4f','#1f9a5a',.9,-15,4,26],['#9a6bff','#55f0ff',.9,15,-2,30],['#ffd23d','#ff4d5e',.8,-4,7,38]];
  intro.ships=fleet.map(([c,a,s,x,y,z],i)=>{const g=introShip(c,a,BOT_PRESETS[(i*3+1)%BOT_PRESETS.length],s,i===0?'#ffb04a':'#6fe6f2');g.position.set(x,y,z+30);sc.add(g);return {g,x,y,z:z+30,speed:26-i*1.2,ph:i*1.3,lead:i===0};});
  // pooled glow puffs for engine trails and re-entry embers
  const tg=new T.SphereGeometry(1,8,6);for(let i=0;i<220;i++){const m=new T.Mesh(tg,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));m.visible=false;sc.add(m);intro.trail.push({m,life:0});}
  // speed streaks that ride with the camera
  const SN=220,arr=new Float32Array(SN*6);for(let i=0;i<SN;i++)resetStreak(arr,i,true);
  const sgeo=new T.BufferGeometry();sgeo.setAttribute('position',new T.BufferAttribute(arr,3));
  const sl=new T.LineSegments(sgeo,new T.LineBasicMaterial({color:new T.Color(1.4,1.7,2.2),transparent:true,opacity:.45,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));sl.frustumCulled=false;intro.cam.add(sl);intro.streaks={mesh:sl,arr,n:SN};
}
function resetStreak(a,i,any){const x=(Math.random()-.5)*70,y=(Math.random()-.5)*44,z=any?-Math.random()*140:-140+Math.random()*10,len=1.5+Math.random()*5;a.set([x,y,z,x,y,z-len],i*6);}
function updateStreaks(speed,rdt){const s=intro.streaks;if(!s)return;s.mesh.visible=speed>1;if(speed<=1)return;const a=s.arr;
  for(let i=0;i<s.n;i++){const k=i*6;a[k+2]+=speed*rdt;a[k+5]+=speed*rdt;if(a[k+5]>1)resetStreak(a,i,false);}s.mesh.geometry.attributes.position.needsUpdate=true;}
function setIntroBiome(B){const u=intro.planetM.uniforms;u.g1.value.copy(col(B.ground));u.g2.value.copy(col(B.ground2));u.sea.value.copy(col(B.wall)).multiplyScalar(.75);u.det.value.copy(col(B.detail[2]||B.detail[0]));u.atmo.value.copy(col(B.skyHorizon));
  intro.atmoM.uniforms.atmo.value.copy(col(B.skyHorizon));intro.ringM.uniforms.c1.value.copy(col(B.lane));intro.ringM.uniforms.c2.value.copy(col(B.planet));}
let trailI=0;
function introTrail(p,color,size,life){const t=intro.trail[trailI++%intro.trail.length];t.m.position.copy(p);t.m.material.color.copy(col(color)).multiplyScalar(2.2);t.m.scale.setScalar(size);t.life=t.max=life;t.m.visible=true;}
function whoosh(d,f0,f1,v){if(!AudioFX.ctx)return;AudioFX.noise(d,v,f0);AudioFX.tone('sawtooth',f0/6,f1/6,d,v*.25);}
function introSubs(t){const sub=INTRO_SUBS.reduce((a,s,i)=>t>=s[0]?i:a,-1);if(sub!==intro.subIdx){intro.subIdx=sub;const txt=sub>=0?INTRO_SUBS[sub][1]:'';$('#introSub').textContent=txt;if(txt)announce(txt);}}

function startIntro(){
  if(A11Y.reduceMotion||isAutomation()){finishIntro(true);return;}
  clearMenuStage();
  // the arena you land in is built up front, so the landing happens in the real level
  if(!world||world.mode==='test'||world.creatures.length)buildWorld(newSeed());
  if(!intro.scene)buildIntro();setIntroBiome(world.map.biome);
  if(intro.pod&&!intro.pod.owned)disposePod(intro.pod);
  intro.pod=buildPod(typeof playerDesignForChallenge==='function'?playerDesignForChallenge():clone(PRESETS[0]));
  const lead=intro.ships[0].g;intro.pod.g.scale.setScalar(.36);intro.pod.g.position.set(0,-1.05,.2);lead.add(intro.pod.g);
  intro.ships.forEach(s=>s.g.position.set(s.x,s.y,s.z));
  phase='intro';intro.stage='space';setRenderView(intro.scene,intro.cam,.85);
  for(const s of ['menu','build','workshop','hud','chal'])$('#'+s).hidden=true;
  $('#introGate').hidden=false;$('#introUI').hidden=true;intro.t=0;intro.started=false;intro.done=false;
}
function isAutomation(){try{return !!navigator.webdriver;}catch(e){return false;}}
function beginCutscene(){AudioFX.init();$('#introGate').hidden=true;$('#introUI').hidden=false;intro.started=true;intro.t=0;intro.subIdx=-1;intro.stage='space';$('#introSkip').focus();
  intro.ships.forEach(s=>{s.g.position.set(s.x,s.y,s.z);});intro.flags={};whoosh(1.4,900,200,.18);}
function finishIntro(instant,seamless){if(intro.done)return;intro.done=true;$('#introGate').hidden=true;$('#introUI').hidden=true;$('#introSub').textContent='';
  if(intro.stage==='ground')settleIntroStage();intro.stage='space';
  openMenu();const fade=$('#introFade');
  if(seamless||instant)fade.style.opacity='0';
  else{fade.style.transition='none';fade.style.opacity='1';requestAnimationFrame(()=>{fade.style.transition='opacity .9s ease';fade.style.opacity='0';});}
  document.body.classList.add('menuEnter');setTimeout(()=>document.body.classList.remove('menuEnter'),1600);
  if(AudioFX.ctx&&!instant)AudioFX.play('win',.6);const after=()=>{if(typeof walkthroughPending!=='undefined'&&walkthroughPending){finishWalkthrough();return;}if(typeof showWelcomeIfNeeded==='function')showWelcomeIfNeeded();if($('#welcome').hidden&&typeof Profile!=='undefined')Profile.maybeShow();};setTimeout(after,instant?300:1400);}

/* ---------- space shots ---------- */
function updateIntro(rdt,now){
  if(intro.stage==='ground'){updateIntroGround(rdt,now);return;}
  const time=now*.001;const sh=intro.ships;const cam=intro.cam;const pod=intro.pod;
  intro.sky.material.uniforms.time.value=time;intro.sky.position.copy(cam.position);
  intro.planet.rotation.y+=rdt*.012;intro.clouds.rotation.y+=rdt*.018;intro.cloudM.uniforms.time.value=time;intro.moon.rotation.y+=rdt*.05;
  for(const s of sh){s.g.position.z-=s.speed*rdt*(intro.started?1:0);
    s.g.position.x=s.x+Math.sin(time*.9+s.ph)*.8;s.g.position.y=s.y+Math.sin(time*1.3+s.ph)*.5;s.g.rotation.z=Math.sin(time*.9+s.ph)*.18;s.g.rotation.x=Math.sin(time*1.1+s.ph)*.05;
    const u=s.g.userData;const thr=intro.started?1:.45;
    for(const f of u.flames){const fl=.85+Math.random()*.3;f.core.scale.set(1,1,1.3*thr*fl);f.outer.scale.set(1,1,2.4*thr*(.9+Math.random()*.2));f.hs.material.opacity=.75+Math.random()*.25;}
    for(const b of u.blink)b.visible=((time+s.ph)%1.1)<.18;
    if(u.pilot)animateCreatureView(u.pilot,rdt,time+s.ph);
    if(intro.started&&Math.random()<.85)for(const f of u.flames){f.core.getWorldPosition(_iv);_iv.z+=.5*s.g.scale.x;introTrail(_iv,s.lead?'#ffb04a':'#6fe6f2',.14*s.g.scale.x,.45);}}
  for(const tr of intro.trail){if(tr.life<=0)continue;tr.life-=rdt;tr.m.material.opacity=Math.max(0,tr.life/tr.max)*.8;if(tr.life<=0)tr.m.visible=false;}
  if(pod)animatePod(pod,rdt,time);
  const lead=sh[0].g;
  if(!intro.started){// hangar idle: slow arc in front of the lead ship so you can see the pilot and the docked pod
    const a=-.6+Math.sin(time*.12)*.55;cam.position.set(lead.position.x+Math.sin(a)*12,lead.position.y+2.6+Math.sin(time*.3)*.4,lead.position.z-Math.cos(a)*12);cam.lookAt(lead.position.x,lead.position.y-.2,lead.position.z+1);updateStreaks(0,rdt);return;}
  intro.t+=rdt;const t=intro.t;const F=intro.flags;introSubs(t);
  // pod flight once released
  if(pod.released){
    const dist=pod.g.position.distanceTo(intro.podTarget);const d=_iv2.subVectors(intro.podTarget,pod.g.position).normalize();
    pod.speed*=1+rdt*.55;pod.vel.lerp(d.multiplyScalar(pod.speed),1-Math.exp(-rdt*2.2));
    pod.g.position.addScaledVector(pod.vel,rdt*clamp((dist-22)/30,.12,1));
    _iq.setFromUnitVectors(_DOWN,_iv3.copy(pod.vel).normalize());_iq2.setFromAxisAngle(_YAX,time*2.6);pod.g.quaternion.copy(_iq).multiply(_iq2);
    const heat=smooth(5.3,7.0,t);pod.plasma.visible=heat>.01;pod.plasma.material.uniforms.k.value=heat*1.25;pod.shellM.emissiveIntensity=heat*1.1;pod.heatM.emissiveIntensity=heat*3.2;
    if(Math.random()<.95){_iv.copy(pod.g.position).addScaledVector(pod.vel,-.03);introTrail(_iv,heat>.25?'#ff8a3d':'#6fe6f2',.3+heat*.9,.55+heat*.4);}
    if(heat>.3&&Math.random()<heat)introTrail(_iv.copy(pod.g.position).add(_iv2.set((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2)).addScaledVector(pod.vel,-.05),'#ffd27a',.12,.4);}
  if(t<3.0){// shot A: the fleet roars past the camera toward the planet
    const k=smooth(0,3,t);cam.position.set(lerp(0,lead.position.x+5,k*.6),lerp(2.5,lead.position.y+3,k*.6),lerp(22,lead.position.z+16,k*.55));
    cam.lookAt(lerp(0,lead.position.x,k),lerp(-2,lead.position.y,k),lerp(-60,lead.position.z-10,k));updateStreaks(90,rdt);
    if(t>.9&&!F.w2){F.w2=true;whoosh(.9,1400,300,.22);}}
  else if(t<5.0){// shot B: tracking close on the lead ship, its pilot waves, the pod drops away
    const k=(t-3)/2;const ph=lerp(-.9,.5,smooth(0,1,k));const r=10.5;
    cam.position.set(lead.position.x+Math.cos(ph)*r,lead.position.y+1.8,lead.position.z+Math.sin(ph)*r);cam.lookAt(lead.position.x,lead.position.y-.2,lead.position.z);updateStreaks(40,rdt);
    const pil=sh[0].g.userData.pilot;if(t>3.45&&!F.wave&&pil){F.wave=true;pil.emoteT=1.3;voice(pil,'happy');}
    if(pil&&pil.emoteT>0)pil.emoteT-=rdt;
    if(t>4.55&&!F.drop){F.drop=true;intro.scene.attach(pod.g);pod.released=true;pod.speed=30;pod.vel.set(0,-8,-26);
      const pp=intro.planet.position;intro.podTarget=_iv.subVectors(pod.g.position,pp).normalize().add(_iv2.set(0,0,-.35)).normalize().multiplyScalar(140).add(pp).clone();
      AudioFX.play('boing',.7);AudioFX.play('spit',.7);whoosh(.7,600,120,.2);}}
  else{// shot C: chase the pod into the atmosphere
    const vd=_iv3.copy(pod.vel).normalize();const want=_iv.copy(pod.g.position).addScaledVector(vd,-(7+(1-smooth(5,5.8,t))*9)).add(_iv2.set(1.2,2.4,0));
    cam.position.lerp(want,1-Math.exp(-rdt*4));cam.lookAt(_iv.copy(pod.g.position).addScaledVector(vd,6));updateStreaks(160,rdt);
    if(t>5.6&&!F.rumble){F.rumble=true;AudioFX.noise(2.4,.3,300);AudioFX.tone('sine',80,40,2.2,.25);}
    const shake=smooth(5.3,7.0,t)*.3;cam.position.x+=(Math.random()-.5)*shake;cam.position.y+=(Math.random()-.5)*shake;}
  $('#introFade').style.opacity=String(smooth(6.95,INTRO_SWITCH,t));
  if(t>=INTRO_SWITCH)introToGround();
}

/* ---------- ground shots: the pod lands for real on the home-screen stage ---------- */
function introToGround(){
  intro.stage='ground';const pod=intro.pod;
  if(!world||world.mode==='test'||world.creatures.length)buildWorld(newSeed());
  setRenderView(scene,camera,world.map.biome.bloom);
  buildMenuStage();const st=menuStage;const c=st.c;const map=world.map;
  const e0=st.ents[0];e0.hidden=true;e0.view.root.visible=false;
  const L=new T.Vector3(c.x-7.5,0,c.z+1.6);L.y=map.heightAt(L.x,L.z);
  if(pod.g.parent)pod.g.parent.remove(pod.g);scene.add(pod.g);pod.S=1/pod.fit;pod.g.scale.setScalar(pod.S);pod.L=L;
  pod.start=L.clone().add(new T.Vector3(-55,105,-34));pod.g.position.copy(pod.start);pod.plasma.visible=true;pod.owned=true;st.pod=pod;
  pod.g.traverse(o=>{if(o.isMesh)o.castShadow=!(o.material&&o.material.transparent);});
  intro.camLook=new T.Vector3(L.x,L.y+25,L.z);intro.shake=0;intro.squash=0;intro.squashV=0;intro.flags.g={};
  camera.position.copy(c).add(_iv.set(8,1.4,7));camera.lookAt(intro.camLook);sunFollow(c.x,c.y,c.z);
}
function podRestPose(pod){const map=world.map;const L=pod.L,S=pod.S;const x=L.x+2.3*S,z=L.z-1.4*S;pod.lid.position.set(x,map.heightAt(x,z)+.62*S,z);pod.lidRestQ=new T.Quaternion().setFromEuler(new T.Euler(1.32,.6,.2));}
function introWorldTick(rdt,now){const tm=now*.001;
  for(const n of world.neutrals){idleNeutral(n,rdt);if(!n.alive){n.view.root.visible=false;continue;}animateCreatureView(n,rdt,tm);}
  for(const n of world.nests)animateNest(n,rdt,tm);updateParticles(rdt);
  if(skyMesh){skyMesh.material.uniforms.time.value=tm;skyMesh.position.copy(camera.position);}if(planet)planet.rotation.y+=rdt*.01;}
function updateIntroGround(rdt,now){
  intro.t+=rdt;const t=intro.t;const tg=t-INTRO_SWITCH;const time=now*.001;const pod=intro.pod;const st=menuStage;const map=world.map;const L=pod.L,S=pod.S;const F=intro.flags.g;
  introSubs(t);introWorldTick(rdt,now);animatePod(pod,rdt,time);st.t+=rdt;
  $('#introFade').style.opacity=String(1-smooth(0,.55,tg));
  const rest=_iv2.copy(L).setY(L.y+1.22*S);
  if(tg<INTRO_IMPACT){// screaming in from the sky, trailing fire and smoke
    const k=tg/INTRO_IMPACT;const e=k*k*(1.25-.25*k);pod.g.position.lerpVectors(pod.start,rest,e);
    _iq.setFromUnitVectors(_DOWN,_iv.subVectors(rest,pod.start).normalize());_iq.slerp(_iq2.identity(),smooth(.72,1,k));pod.g.quaternion.copy(_iq).multiply(_iq2.setFromAxisAngle(_YAX,time*3));
    const heat=1-smooth(.3,1,k)*.7;pod.plasma.material.uniforms.k.value=heat;pod.shellM.emissiveIntensity=heat*.9;pod.heatM.emissiveIntensity=heat*3;
    const q=pod.g.position;emit(q.x,q.y+S,q.z,{n:3,color:'#ff8a3d',glow:3,speed:2.5,life:.6,size:.45*S,grav:-2,jit:S});
    emit(q.x,q.y+S*1.5,q.z,{n:2,color:'#4a4650',glow:.5,speed:1.2,life:1.8,size:.9*S,grav:-2.5,jit:S,drag:1.2});
    intro.camLook.lerp(q,1-Math.exp(-rdt*7));
    if(tg>.15&&!F.in){F.in=true;whoosh(1.4,1800,140,.25);}}
  else{
    if(!F.impact){F.impact=true;pod.g.position.copy(rest);pod.g.quaternion.identity();pod.plasma.visible=false;
      const B=map.biome;const x=L.x,y=L.y+.2,z=L.z;
      emit(x,y,z,{n:50,color:B.ground,glow:.9,speed:16,flat:true,life:1.2,size:.55,grav:0,drag:2.5,up:1.5});
      emit(x,y+.5,z,{n:34,color:'#ffb04a',glow:3.2,speed:9,up:9,life:.9,size:.22,grav:22});
      emit(x,y+.5,z,{n:20,color:B.detail[0],glow:1,speed:7,up:12,life:1.3,size:.35,grav:26});
      emit(x,y+1,z,{n:14,color:'#ffffff',glow:1.8,speed:3,life:.3,size:1.4,grav:0});
      AudioFX.play('nest',.9);AudioFX.play('land',1);if(AudioFX.ctx){AudioFX.noise(1.2,.35,180);AudioFX.tone('sine',70,30,1,.35);}
      intro.shake=1;intro.squashV=-7;for(const e of st.ents)if(!e.hidden)e.emoteT=1.2;
      const sm=new T.MeshBasicMaterial({map:shadowTex(),transparent:true,opacity:.8,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});pod.disp.push(sm);
      const sc=new T.Mesh(geo('csPlane',()=>{const p=new T.PlaneGeometry(1,1);p.rotateX(-Math.PI/2);return p;}),sm);sc.scale.set(S*4.2,1,S*4.2);sc.position.set(L.x,L.y+.06,L.z);scene.add(sc);pod.scorch=sc;}
    intro.squashV+=(-intro.squash*230-intro.squashV*9)*rdt;intro.squash+=intro.squashV*rdt;const sq=clamp(intro.squash*.06,-.3,.3);pod.g.scale.set(S*(1-sq*.5),S*(1+sq),S*(1-sq*.5));
    const cool=Math.exp(-(tg-INTRO_IMPACT)*1.2);pod.heatM.emissiveIntensity=cool*1.4;pod.shellM.emissiveIntensity=cool*.3;
    if(tg<3.6&&Math.random()<.5)emit(L.x+(Math.random()-.5)*S,L.y+S*1.1,L.z+(Math.random()-.5)*S,{n:1,color:'#e8e8f0',glow:.8,speed:1,up:2.5,grav:-1.5,life:1.4,size:.6*S,drag:1});
    // the lid pops off and tumbles away
    if(tg>=2.5&&!F.lid){F.lid=true;scene.attach(pod.lid);pod.lidLoose=true;pod.lidV=new T.Vector3(3.5,13,-2.5);pod.lidW=new T.Vector3(4,1,2.5);
      AudioFX.play('popup',.9);AudioFX.play('boing',.8);const lp=pod.lid.position;emit(lp.x,lp.y,lp.z,{n:22,color:'#ffffff',glow:1.4,speed:5,up:3,life:.8,size:.4,grav:-1});}
    if(pod.lidLoose&&!pod.lidRest){pod.lidV.y-=26*rdt;pod.lid.position.addScaledVector(pod.lidV,rdt);pod.lid.rotation.x+=pod.lidW.x*rdt;pod.lid.rotation.y+=pod.lidW.y*rdt;pod.lid.rotation.z+=pod.lidW.z*rdt;
      const lp=pod.lid.position;const gh=map.heightAt(lp.x,lp.z)+.62*S;
      if(lp.y<gh&&pod.lidV.y<0){lp.y=gh;if(Math.abs(pod.lidV.y)>5){pod.lidV.y*=-.35;pod.lidV.x*=.6;pod.lidV.z*=.6;pod.lidW.multiplyScalar(.5);AudioFX.play('land',.5);emit(lp.x,gh-.5*S,lp.z,{n:10,color:map.biome.ground,glow:.8,speed:5,flat:true,life:.7,size:.35,grav:0});}
        else{pod.lidRest=true;pod.lidRestQ=new T.Quaternion().setFromEuler(new T.Euler(1.32,pod.lid.rotation.y,.2));}}}
    if(pod.lidRest)pod.lid.quaternion.slerp(pod.lidRestQ,1-Math.exp(-rdt*8));
    // your creature hops out and bounds over to its spot
    const e0=st.ents[0];
    if(tg>=2.7&&e0.hidden){e0.hidden=false;e0.scripted=true;pod.crea.view.root.visible=false;e0.hop={x0:L.x,z0:L.z,y0:L.y+.6*S};voice(e0,'happy');AudioFX.play('jump',.9);}
    if(e0.hop&&!e0.hopDone){const k=clamp((tg-2.7)/.85,0,1);const h=e0.hop;e0.x=lerp(h.x0,e0.hx,k);e0.z=lerp(h.z0,e0.hz,k);e0.y=lerp(h.y0,map.heightAt(e0.x,e0.z),k)+Math.sin(Math.PI*k)*4.5;
      e0.vy=k<1?Math.cos(Math.PI*k)*16:0;e0.grounded=k>=1;e0.yaw=Math.atan2(e0.hx-h.x0,e0.hz-h.z0);
      if(k>=1){e0.hopDone=true;e0.scripted=false;e0.vy=0;e0.view.j=-.35;emit(e0.x,e0.y+.1,e0.z,{n:16,color:map.biome.ground,glow:.8,speed:6,flat:true,life:.6,size:.35,grav:0});AudioFX.play('land',.8);for(const e of st.ents)e.emoteT=1.4;}}
    _iv.copy(L).setY(L.y+S);_iv.lerp(_iv3.copy(st.c).setY(st.c.y+1),smooth(2.7,3.6,tg));intro.camLook.lerp(_iv,1-Math.exp(-rdt*4));}
  // the teammates watch the pod come in, then face the camera
  const facing=tg<INTRO_IMPACT+.4?pod.g.position:camera.position;menuStageCreatures(rdt,now,facing);
  // camera: low hero angle, then a glide into the exact home-screen framing
  const pose=menuCamPose(st.t);const kb=smooth(3.2,5.2,tg);
  const base=_iv.copy(st.c).add(_iv2.set(8-tg*.25,1.4+tg*.08,7));
  camera.position.copy(base).lerp(pose.P,kb);
  intro.shake*=Math.exp(-rdt*3.5);const sk=intro.shake*.7*(A11Y.reduceMotion?0:1);camera.position.x+=(Math.random()-.5)*sk;camera.position.y+=(Math.random()-.5)*sk;
  camera.lookAt(_iv3.copy(intro.camLook).lerp(pose.L,kb));sunFollow(st.c.x,st.c.y,st.c.z);
  if(t>=INTRO_LEN)finishIntro(false,true);
}
/* skipping mid-landing: snap everything to its resting place */
function settleIntroStage(){const pod=intro.pod,st=menuStage;if(!st.active||!pod||st.pod!==pod)return;const map=world.map;const L=pod.L,S=pod.S;
  pod.g.position.set(L.x,L.y+1.22*S,L.z);pod.g.quaternion.identity();pod.g.scale.setScalar(S);pod.plasma.visible=false;pod.heatM.emissiveIntensity=0;pod.shellM.emissiveIntensity=0;pod.crea.view.root.visible=false;
  if(!pod.lidLoose){scene.attach(pod.lid);pod.lidLoose=true;}podRestPose(pod);pod.lidRest=true;pod.lid.quaternion.copy(pod.lidRestQ);
  if(!pod.scorch){const sm=new T.MeshBasicMaterial({map:shadowTex(),transparent:true,opacity:.8,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});pod.disp.push(sm);
    const sc=new T.Mesh(geo('csPlane',()=>{const p=new T.PlaneGeometry(1,1);p.rotateX(-Math.PI/2);return p;}),sm);sc.scale.set(S*4.2,1,S*4.2);sc.position.set(L.x,L.y+.06,L.z);scene.add(sc);pod.scorch=sc;}
  for(const e of st.ents){e.hidden=false;e.scripted=false;e.hop=null;e.x=e.hx;e.z=e.hz;e.y=map.heightAt(e.x,e.z);e.vy=0;e.grounded=true;}}

$('#introPlay').addEventListener('click',()=>beginCutscene());
$('#introSkip').addEventListener('click',()=>{sfx('ui');finishIntro(false);});
addEventListener('keydown',e=>{if(phase!=='intro')return;if(!intro.started&&(e.key==='Enter'||e.key===' ')){e.preventDefault();beginCutscene();return;}if(intro.started&&(e.key==='Escape'||e.key==='Enter'||e.key===' ')){e.preventDefault();finishIntro(false);}},true);
