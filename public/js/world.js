'use strict';
/* Creature Clash — biomes, seeded mirrored map, world building, labels & announcements */
const BIOMES=[
  {id:'grove',name:'Mossy Hollow',ground:'#4f7a3a',ground2:'#355a2a',lane:'#b59a6a',laneEdge:'#5a4a30',wall:'#1d2e1c',skyTop:'#06121a',skyMid:'#1a3a3a',skyHorizon:'#c8e6a0',fog:'#3a5a44',sun:'#fff1cc',sunI:1.8,hemiSky:'#cfe8b0',hemiGround:'#1a2614',twig:'#5a3e26',critter:'#8fd16a',geyser:'#c8ff9a',planet:'#f4f0d8',detail:['#5f9a3c','#7fbf5a','#4f8a34','#ff9ec4','#fff3b0'],props:['toadstool','fern','mossrock'],rough:.9,bloom:.85,boulder:'mossball',trunk:'#3a2a1c',canopy:'#24402a',firefly:'#ffe9a0',shaft:'#fff2c8'},
  {id:'glow',name:'Glimmerwood',ground:'#24343a',ground2:'#18242a',lane:'#5f6e70',laneEdge:'#2a3438',wall:'#0c1418',skyTop:'#02040a',skyMid:'#0c1e2e',skyHorizon:'#3a7a8a',fog:'#12303a',sun:'#bcd8ff',sunI:1.3,hemiSky:'#7aa8c8',hemiGround:'#0a1418',twig:'#3a3a44',critter:'#7fe3c0',geyser:'#7fffd0',planet:'#dfe8ff',detail:['#2f5a5a','#3f7a7a','#285050','#7fffd0','#b49ae0'],props:['glowshroom','lantern','deadtree'],rough:.85,bloom:.7,boulder:'stone',trunk:'#141a20',canopy:'#0e2228',firefly:'#8fffe0',shaft:'#9fdcff'},
  {id:'lotus',name:'Lotus Marsh',ground:'#55784a',ground2:'#3f6a5a',lane:'#c8b088',laneEdge:'#6a5a40',wall:'#22332e',skyTop:'#140a24',skyMid:'#5a2a5a',skyHorizon:'#ffb3a0',fog:'#6a4a5a',sun:'#ffd0b0',sunI:1.7,hemiSky:'#ffd0e0',hemiGround:'#1a2a24',twig:'#5a4a30',critter:'#ff9ec4',geyser:'#ffb3d0',planet:'#ffe8d8',detail:['#4f8a5a','#6fae6a','#3f7a4a','#ff9ec4','#ffffff'],props:['lotus','reed','lilypad'],rough:.8,bloom:.85,boulder:'mossball',trunk:'#2e2a22',canopy:'#2a4436',firefly:'#ffc8e0',shaft:'#ffd8c8'},
  {id:'autumn',name:'Amberleaf Glade',ground:'#7a6232',ground2:'#5a4626',lane:'#c8a070',laneEdge:'#5a3a22',wall:'#2a1c14',skyTop:'#0e0814',skyMid:'#4a2030',skyHorizon:'#ffb070',fog:'#5a3a2a',sun:'#ffd8a0',sunI:1.9,hemiSky:'#ffd8b0',hemiGround:'#2a1a10',twig:'#6a4a2a',critter:'#f2b84b',geyser:'#ffb060',planet:'#ffe8c8',detail:['#c8642a','#e0943a','#8a7a32','#a0402a','#f2c84b'],props:['maple','acorn','stump'],rough:.9,bloom:.85,boulder:'acorn',trunk:'#3a2416',canopy:'#7a3018',firefly:'#ffd080',shaft:'#ffd8a0'},
  {id:'ruins',name:'Rootdeep Ruins',ground:'#33382c',ground2:'#262a22',lane:'#6e685a',laneEdge:'#3a362e',wall:'#121412',skyTop:'#030306',skyMid:'#16141e',skyHorizon:'#8a7aa0',fog:'#2a2830',sun:'#e8e0ff',sunI:1.45,hemiSky:'#c0b8e0',hemiGround:'#121210',twig:'#4a3a2a',critter:'#b49ae0',geyser:'#c8a0ff',planet:'#e8e0ff',detail:['#3f5a3a','#5a7a4a','#33452e','#b49ae0'],props:['pillar','rootarch','rock'],rough:.9,bloom:.75,boulder:'stone',trunk:'#1a1614',canopy:'#1c2a20',firefly:'#d8c0ff',shaft:'#d8d0ff'},
  {id:'frost',name:'Frostfern Thicket',ground:'#c9d6e0',ground2:'#a2b6c6',lane:'#8a9cae',laneEdge:'#6f8496',wall:'#c4d4e0',skyTop:'#050a1c',skyMid:'#1c3a6a',skyHorizon:'#8ab8d8',fog:'#4a6a8a',sun:'#fff6e8',sunI:1.4,hemiSky:'#d8ecff',hemiGround:'#5a6a7a',twig:'#6a5040',critter:'#7ec8e3',geyser:'#d8f4ff',planet:'#f0f6ff',detail:['#ffffff','#cfe0f0','#e8f0f8','#7fe3c0'],props:['pine','crystal','snowrock'],rough:.6,bloom:1.2,boulder:'snowball',trunk:'#3a2e28',canopy:'#1f4a44',pines:true,firefly:'#d8f4ff',shaft:'#e8f4ff'},
];

function makeMap(seed,opts){
  opts=opts||{};const R=mulberry32(seed>>>0);
  let biome=BIOMES[Math.floor(R()*BIOMES.length)];if(opts.biome)biome=BIOMES.find(b=>b.id===opts.biome)||biome;
  const Lz=31+R()*5,lw=7+R()*2.5;
  const amp=[1+R()*3.2,R()*3,1+R()*3.2],fr=[.04+R()*.05,.03+R()*.05,.04+R()*.05],ph=[R()*TAU,R()*TAU,R()*TAU];const nOff=R()*100;
  function laneZ(k,x){const ax=Math.abs(x);const t=smooth(86,60,ax);const env=smooth(84,62,ax);if(k===0)return amp[1]*Math.sin(ax*fr[1]+ph[1])*env;return k*(Lz*t-amp[k+1]*Math.abs(Math.sin(ax*fr[k+1]+ph[k+1]))*env);}
  const lanes=[-1,0,1].map(k=>{const pts=[];for(let x=-88;x<=88;x++)pts.push({x,z:laneZ(k,x)});return {k,pts};});
  const FX0=-100,FZ0=-70,FW=201,FH=141;const fd=new Float32Array(FW*FH);const fl=new Int8Array(FW*FH);
  for(let j=0;j<FH;j++)for(let i=0;i<FW;i++){const x=FX0+i,z=FZ0+j;let best=99,bl=0;
    for(let li=0;li<3;li++){const pts=lanes[li].pts;const s=Math.max(0,Math.floor(x-16+88)),e=Math.min(pts.length-2,Math.ceil(x+16+88));
      for(let q=s;q<=e;q++){const a=pts[q],b=pts[q+1];const vx=b.x-a.x,vz=b.z-a.z;const L=vx*vx+vz*vz;let t=L>0?((x-a.x)*vx+(z-a.z)*vz)/L:0;t=clamp(t,0,1);const dx=x-(a.x+vx*t),dz=z-(a.z+vz*t);const d=Math.sqrt(dx*dx+dz*dz);if(d<best){best=d;bl=li;}}}
    const k=j*FW+i;fd[k]=best;fl[k]=bl;}
  function laneDistAt(x,z){const fx=clamp(x-FX0,0,FW-1.001),fz=clamp(z-FZ0,0,FH-1.001);const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;const k=j*FW+i;return lerp(lerp(fd[k],fd[k+1],u),lerp(fd[k+FW],fd[k+FW+1],u),v);}
  function laneAt(x,z){const i=Math.round(clamp(x-FX0,0,FW-1)),j=Math.round(clamp(z-FZ0,0,FH-1));return fl[j*FW+i]-1;}
  const hills=[];for(let i=0;i<10;i++){const h={x:-(6+R()*76),z:(R()*2-1)*(Lz+8),r:4+R()*6,h:.7+R()*1.8};hills.push(h,{x:-h.x,z:h.z,r:h.r,h:h.h});}
  const zWall=Lz+12,xWall=95;
  function heightAt(x,z){const d=laneDistAt(x,z);const flat=smooth(lw*.5+.4,lw*.5+5,d);
    let h=0;for(let i=0;i<hills.length;i++){const hl=hills[i];const dx=x-hl.x,dz=z-hl.z;const q=(dx*dx+dz*dz)/(hl.r*hl.r);if(q<4)h+=hl.h*Math.exp(-q*1.5);}
    h=h*flat+(fbm(Math.abs(x)*.07+nOff,z*.07)-.5)*1.1*flat;h*=smooth(11,17,Math.hypot(Math.abs(x)-86,z));
    const e=Math.max(Math.abs(z)-zWall,Math.abs(x)-xWall);if(e>0)h+=e*e*.2+e*1.3+fbm(Math.abs(x)*.12+nOff,z*.12)*e*.6;return h;}
  const map={seed,biome,Lz,lw,lanes,laneZ,laneDistAt,laneAt,heightAt,zMax:Lz+10.5,xMax:93,zWall,xWall,hills,mode:opts.mode||'battle'};
  map.nests=[];if(map.mode!=='test'){for(const team of ['blue','red']){const s=TEAMS[team].sign;for(const k of [-1,0,1])for(const nx of [22,48]){const x=s*nx;map.nests.push({team,lane:k,x,z:laneZ(k,x),main:false,outer:nx===22});}map.nests.push({team,lane:'main',x:s*79,z:0,main:true,outer:false});}}
  map.boss={x:0,z:(laneZ(-1,0)+laneZ(0,0))/2};
  const nearNest=(x,z,r)=>map.nests.some(n=>dist2(n.x,n.z,x,z)<r*r||dist2(n.x,n.z,-x,z)<r*r);
  const wild=(minD)=>{for(let tries=0;tries<200;tries++){const x=-(6+R()*70),z=(R()*2-1)*(Lz+6);if(laneDistAt(x,z)<lw*.5+minD)continue;if(Math.hypot(x+86,z)<18)continue;if(nearNest(x,z,7))continue;if(dist2(x,z,map.boss.x,map.boss.z)<100)continue;return {x,z};}return null;};
  map.geysers=[];for(let i=0;i<3;i++){const p=wild(3.5);if(!p)continue;const period=6+R()*3,off=R()*period;map.geysers.push({x:p.x,z:p.z,period,off},{x:-p.x,z:p.z,period,off});}
  map.spawns=[];for(let i=0;i<3;i++){const p=wild(4.5);if(!p)continue;if(map.geysers.some(g=>dist2(g.x,g.z,p.x,p.z)<36))continue;map.spawns.push(p,{x:-p.x,z:p.z});}
  map.boulders=[];if(map.mode==='battle'){for(let i=0;i<2;i++){const o={x:-(16+R()*30)-i*20,dir:i%2?1:-1,period:24+R()*8,off:R()*20};map.boulders.push(o,{x:-o.x,dir:o.dir,period:o.period,off:o.off});}}
  map.props=[];const types=biome.props;
  for(let i=0;i<95;i++){const x=-(3+R()*88),z=(R()*2-1)*(Lz+10);const type=types[Math.floor(R()*types.length)];const d=laneDistAt(x,z);
    if(d<lw*.5+2.2)continue;if(Math.hypot(x+86,z)<17)continue;if(nearNest(x,z,6.5))continue;if(dist2(x,z,map.boss.x,map.boss.z)<90)continue;
    if(map.geysers.some(g=>dist2(g.x,g.z,x,z)<16))continue;if(map.spawns.some(g=>dist2(g.x,g.z,x,z)<12))continue;
    const s=.7+R()*.8,rot=R()*TAU,tint=R();map.props.push({x,z,type,s,rot,tint},{x:-x,z,type,s,rot:-rot,tint});}
  return map;
}

let world=null;let skyMesh=null,planet=null,envRT=null;
function buildWorld(seed,opts){
  opts=opts||{};
  if(world)teardownWorld();disposables=[];
  const map=makeMap(seed,opts);const B=map.biome;
  const group=new T.Group();scene.add(group);
  world={seed,map,group,creatures:[],nests:[],neutrals:[],projectiles:[],geysers:[],colliders:[],tags:[],inks:[],bolts:[],boulders:[],mode:map.mode};
  hemi.color.copy(col(B.hemiSky));hemi.groundColor.copy(col(B.hemiGround));hemi.intensity=.42;
  sun.color.copy(col(B.sun));sun.intensity=B.sunI;
  scene.fog=new T.Fog(col(B.fog),70,330);
  if(envRT)envRT.dispose();envRT=makeEnvMap(B);scene.environment=envRT.texture;
  if(skyMesh){scene.remove(skyMesh);skyMesh.material.dispose();}
  skyMesh=new T.Mesh(geo('skysph',()=>new T.SphereGeometry(1000,48,24)),skyMaterial(B,1));skyMesh.renderOrder=-1;scene.add(skyMesh);
  if(planet)scene.remove(planet);
  // the moon: a soft glowing disc with a wide halo, low over the treeline
  planet=new T.Group();const tp=skinTex('pebble');const pm=own(new T.MeshStandardMaterial({color:col(B.planet),roughness:1,emissive:col(B.planet),emissiveIntensity:.85,normalMap:tp.normal,normalScale:new T.Vector2(.6,.6),fog:false}));
  planet.add(new T.Mesh(geo('moon',()=>new T.SphereGeometry(34,48,32)),pm));
  const halo=new T.Sprite(own(new T.SpriteMaterial({map:haloTex(),color:col(B.planet).multiplyScalar(.9),transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false})));halo.scale.setScalar(300);planet.add(halo);
  planet.position.set(300,250,-640);scene.add(planet);
  buildTerrain(map,group,B);buildProps(map,group,B);buildDetails(map,group,B);buildBases(map,group);buildForestWall(map,group,B);buildFireflies(map,group,B);buildLightShafts(map,group,B);
  for(const ns of map.nests)addNest(ns);
  for(const g of map.geysers){const gy={x:g.x,z:g.z,y:map.heightAt(g.x,g.z),period:g.period,t:g.off,hit:new Set(),erupting:0};gy.view=buildGeyserView(B);gy.view.position.set(gy.x,gy.y,gy.z);group.add(gy.view);world.geysers.push(gy);}
  for(const sp of map.spawns)spawnNeutral('critter',sp.x,sp.z,B);
  for(const b of map.boulders){const bo={x:b.x,z:0,y:0,dir:b.dir,period:b.period,t:b.off,r:2.2,active:false,warn:false,hit:new Set()};bo.view=buildBoulderView(B);bo.view.visible=false;group.add(bo.view);world.boulders.push(bo);}
  if(map.mode!=='test')spawnNeutral('boss',map.boss.x,map.boss.z,B);
  if(bloomPass)bloomPass.threshold=B.bloom;
  return world;
}
function addNest(ns,hpOverride){const map=world.map;const n={kind:'nest',team:ns.team,lane:ns.lane,main:ns.main,outer:ns.outer,x:ns.x,z:ns.z,y:map.heightAt(ns.x,ns.z),radius:ns.main?4.4:2.5,maxHp:hpOverride||(ns.main?S.mainNestHp:S.laneNestHp),alive:true,spitCd:1+Math.random(),lastHurt:-99,height:ns.main?7:3};
  n.hp=n.maxHp;n.view=buildNestView(n,map.biome);n.view.group.position.set(n.x,n.y,n.z);world.group.add(n.view.group);world.nests.push(n);world.colliders.push({x:n.x,z:n.z,r:n.radius*.92,nest:n});n.tag=makeTag('tag3d nest '+n.team,'<div class="tb"><i></i></div>');return n;}
function teardownWorld(){
  for(const t of world.tags)t.remove();
  for(const c of world.creatures)disposeView(c.view);for(const n of world.neutrals)disposeView(n.view);
  scene.remove(world.group);
  for(const x of disposables){try{x.dispose&&x.dispose();}catch(e){}}
  disposables=[];parts.length=0;partMesh.count=0;world=null;
}
function buildTerrain(map,group,B){
  const SX=212,SZ=2*(map.zWall+14);const W=212,H=Math.round(SZ);
  const g=own(new T.PlaneGeometry(SX,SZ,W,H));g.rotateX(-Math.PI/2);
  const pos=g.attributes.position;const cols=new Float32Array(pos.count*3);
  const cg=col(B.ground),cg2=col(B.ground2),cl=col(B.lane),ce=col(B.laneEdge),cw=col(B.wall),tmp=new T.Color(),blueC=col('#3ba7ff'),redC=col('#ff4d5e');const hw=map.lw*.5;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=map.heightAt(x,z);pos.setY(i,h);const d=map.laneDistAt(x,z);
    const n=fbm(x*.12+3,z*.12+7);tmp.copy(cg).lerp(cg2,B.tiles?((Math.floor((x+200)/4)+Math.floor((z+200)/4))%2)*.75+n*.15:clamp(n*1.4-.2,0,1));
    const lane=1-smooth(hw-.5,hw+.3,d);const edge=Math.exp(-((d-hw)*(d-hw))/.35);tmp.lerp(cl,lane*(.85+.15*n));tmp.lerp(ce,edge*.55);
    const bd=Math.hypot(Math.abs(x)-86,z);if(bd<15){const pad=1-smooth(12,15,bd);tmp.lerp(cl,pad*.8);const rim=Math.exp(-((bd-12.5)*(bd-12.5))/.25);tmp.lerp(x<0?blueC:redC,rim*.7);}
    const wall=smooth(.5,4,Math.max(Math.abs(z)-map.zWall,Math.abs(x)-map.xWall));tmp.lerp(cw,wall);if(h>1.2&&wall<.5)tmp.multiplyScalar(1+(h-1.2)*.05);
    const sp=.9+hash2(Math.floor(x*2),Math.floor(z*2))*.18;cols[i*3]=tmp.r*sp;cols[i*3+1]=tmp.g*sp;cols[i*3+2]=tmp.b*sp;}
  g.setAttribute('color',new T.BufferAttribute(cols,3));g.computeVertexNormals();
  const mesh=new T.Mesh(g,own(new T.MeshStandardMaterial({vertexColors:true,roughness:B.rough,metalness:0,envMapIntensity:.6})));mesh.receiveShadow=true;group.add(mesh);
  const sk=new T.Mesh(own(new T.PlaneGeometry(1400,1400)),own(new T.MeshStandardMaterial({color:col(B.wall),roughness:1})));sk.rotation.x=-Math.PI/2;sk.position.y=-1;group.add(sk);
}
function makeInstanced(geom,mat,list,localM,colors){
  const im=new T.InstancedMesh(geom,mat,list.length);const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
  list.forEach((it,i)=>{p.set(it.x,it.y,it.z);q.setFromEuler(new T.Euler(it.rx||0,it.rot||0,it.rz||0));s.set(it.s,it.s*(it.sy||1),it.s);m.compose(p,q,s);if(localM)m.multiply(localM);im.setMatrixAt(i,m);if(colors)im.setColorAt(i,colors(it,i));});
  im.castShadow=true;im.receiveShadow=true;own(im);return im;
}
const LM=(x,y,z,rx,ry,rz,sx,sy,sz)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),new T.Vector3(sx||1,sy||1,sz||1));
function buildProps(map,group,B){
  const byType={};for(const p of map.props){p.y=map.heightAt(p.x,p.z)-.1;(byType[p.type]=byType[p.type]||[]).push(p);}
  const add=(type,geom,mat,lm,colors)=>{const list=byType[type];if(!list||!list.length)return;group.add(makeInstanced(own(geom),mat,list,lm,colors));};
  const collide=(type,r)=>{for(const p of byType[type]||[])world.colliders.push({x:p.x,z:p.z,r:r*p.s});};
  const rock=own(new T.MeshStandardMaterial({color:0xffffff,roughness:.85,flatShading:true}));const palette=B.detail.map(col);
  const leafG=(w,l)=>{const g=new T.SphereGeometry(1,10,6);g.scale(w,.06,l);g.translate(0,0,l);const p=g.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);p.setY(i,p.getY(i)+z*.5-z*z*.22);}g.computeVertexNormals();return g;};
  const glowB=(hex,k)=>own(new T.MeshBasicMaterial({color:col(hex).multiplyScalar(k),toneMapped:false}));
  switch(B.id){
    case 'grove':
      add('toadstool',new T.CylinderGeometry(.32,.48,2.3,12),own(new T.MeshStandardMaterial({color:col('#efe2c4'),roughness:.8})),LM(0,1.15,0));
      add('toadstool',new T.SphereGeometry(1.5,28,14,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.42,clearcoat:.7,clearcoatRoughness:.3})),LM(0,2.15,0,0,0,0,1,.72,1),(it)=>it.tint>.75?col('#e8843a'):col('#d9473b'));
      add('toadstool',new T.CircleGeometry(1.48,28),own(new T.MeshStandardMaterial({color:col('#d8c8a4'),roughness:.9,side:T.DoubleSide})),LM(0,2.14,0,Math.PI/2,0,0));
      [[.55,.95,.3],[-.6,.85,.45],[.1,1.08,-.55],[-.2,1.1,.05],[.85,.55,-.6],[-.95,.45,-.3]].forEach(([x,y,z])=>add('toadstool',new T.SphereGeometry(.2,10,8),own(new T.MeshStandardMaterial({color:col('#fff6e6'),roughness:.6})),LM(x,2.15+y*.72,z,0,0,0,1,.5,1)));
      collide('toadstool',.55);
      for(let i=0;i<7;i++){const a=i/7*TAU;add('fern',leafG(.28,1.15),own(new T.MeshStandardMaterial({color:col('#4f8a34'),roughness:.7,side:T.DoubleSide})),LM(0,.15,0,-.55-(i%2)*.25,a,0),(it)=>col('#4f8a34').lerp(col('#7fbf5a'),it.tint));}
      add('mossrock',new T.DodecahedronGeometry(1.5,1),rock,LM(0,.55,0,0,0,0,1,.7,1),(it)=>col('#6a6e62').lerp(col('#7d8076'),it.tint));
      add('mossrock',new T.SphereGeometry(1.45,18,8,0,TAU,0,Math.PI*.42),own(new T.MeshStandardMaterial({color:col('#5f9a3c'),roughness:.95,flatShading:true})),LM(0,.82,0,0,0,0,1,.55,1),(it)=>col('#5f9a3c').lerp(col('#8fd16a'),it.tint*.5));collide('mossrock',1.3);break;
    case 'glow':
      add('glowshroom',new T.CylinderGeometry(.18,.3,3.2,10),own(new T.MeshStandardMaterial({color:col('#cfd8e0'),roughness:.7,emissive:col('#2a6a6a'),emissiveIntensity:.25})),LM(0,1.6,0,0,0,.08));
      add('glowshroom',new T.SphereGeometry(1.25,24,12,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.3,clearcoat:.8,emissive:0xffffff,emissiveIntensity:.0})),LM(.25,3.15,0,0,0,0,1,.55,1),(it)=>it.tint>.5?col('#4fd6c0'):col('#9a7ae0'));
      add('glowshroom',new T.CircleGeometry(1.2,24),glowB('#7fffe0',1.6),LM(.25,3.13,0,Math.PI/2,0,0));
      add('glowshroom',new T.CylinderGeometry(.1,.16,1.6,8),own(new T.MeshStandardMaterial({color:col('#cfd8e0'),roughness:.7})),LM(1.1,.8,.6));
      add('glowshroom',new T.SphereGeometry(.6,16,8,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:col('#b49ae0'),roughness:.3,clearcoat:.8})),LM(1.1,1.6,.6,0,0,0,1,.55,1));
      add('glowshroom',new T.CircleGeometry(.58,16),glowB('#c8a0ff',1.8),LM(1.1,1.59,.6,Math.PI/2,0,0));collide('glowshroom',.45);
      add('lantern',new T.TorusGeometry(1.1,.06,6,20,Math.PI*.6),own(new T.MeshStandardMaterial({color:col('#3f6a4a'),roughness:.7})),LM(-1.1,.0,0,0,0,0));
      add('lantern',new T.CylinderGeometry(.06,.08,1.6,6),own(new T.MeshStandardMaterial({color:col('#3f6a4a'),roughness:.7})),LM(-1.1,.8,0));
      add('lantern',new T.SphereGeometry(.32,14,10),glowB('#ffd86a',2.4),LM(-.05,.95,0,0,0,0,1,1.3,1));
      add('lantern',new T.ConeGeometry(.36,.3,10,1,true),own(new T.MeshStandardMaterial({color:col('#4f8a5a'),roughness:.6,side:T.DoubleSide})),LM(-.05,1.33,0,Math.PI,0,0));collide('lantern',.3);
      add('deadtree',new T.CylinderGeometry(.18,.75,6.5,7),own(new T.MeshStandardMaterial({color:col('#1a2026'),roughness:.9,flatShading:true})),LM(0,3.1,0,0,0,.06));
      [[.6,4.2,0,0,0,-.9,2.6],[-.5,3.6,.3,.3,0,.95,2.2],[.1,5.4,-.4,-.6,0,-.3,1.8]].forEach(([x,y,z,rx,ry,rz,l])=>add('deadtree',new T.CylinderGeometry(.06,.22,l,6),own(new T.MeshStandardMaterial({color:col('#1a2026'),roughness:.9,flatShading:true})),LM(x,y,z,rx,ry,rz)));
      add('deadtree',new T.SphereGeometry(.14,8,6),glowB('#8fffe0',2.6),LM(1.5,4.9,0));collide('deadtree',.7);break;
    case 'lotus':{
      const pond=own(new T.MeshPhysicalMaterial({color:col('#24424e'),roughness:.06,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.4}));
      add('lotus',new T.CircleGeometry(2.4,32),pond,LM(0,.14,0,-Math.PI/2,0,0));add('lilypad',new T.CircleGeometry(2.6,32),pond,LM(0,.14,0,-Math.PI/2,0,0));
      add('lotus',new T.CylinderGeometry(1.1,1.1,.06,24,1,false,0,TAU*.9),own(new T.MeshStandardMaterial({color:col('#4f8a4a'),roughness:.55})),LM(.2,.2,.1));
      for(let i=0;i<8;i++){const a=i/8*TAU;add('lotus',new T.SphereGeometry(1,12,8),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.5,sheen:1,sheenColor:col('#ffffff')})),LM(Math.cos(a)*.42,.62,Math.sin(a)*.42,Math.sin(a)*.65,0,-Math.cos(a)*.65,.24,.5,.13),(it)=>col('#ff9ec4').lerp(col('#ffffff'),it.tint*.6));}
      for(let i=0;i<5;i++){const a=i/5*TAU+.3;add('lotus',new T.SphereGeometry(1,12,8),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.5,sheen:1,sheenColor:col('#ffffff')})),LM(Math.cos(a)*.18,.8,Math.sin(a)*.18,Math.sin(a)*.3,0,-Math.cos(a)*.3,.17,.4,.1),(it)=>col('#ffc0d8').lerp(col('#ffffff'),it.tint*.5));}
      add('lotus',new T.SphereGeometry(.16,12,8),glowB('#ffe08a',1.5),LM(0,.82,0));
      for(const [x,z,r] of [[.8,.6,1],[-1.1,.2,.8],[.2,-1.3,.7]])add('lilypad',new T.CylinderGeometry(r,r,.06,22,1,false,0,TAU*.88),own(new T.MeshStandardMaterial({color:col('#5a9a4a'),roughness:.5})),LM(x,.2,z,0,x*2,0));
      add('lilypad',new T.SphereGeometry(.2,10,8),own(new T.MeshStandardMaterial({color:col('#fff3f8'),roughness:.5})),LM(.85,.32,.55,0,0,0,1,.6,1));
      for(let i=0;i<6;i++)add('reed',new T.CylinderGeometry(.05,.07,2.8,5),own(new T.MeshStandardMaterial({color:col('#6a8a3a'),roughness:.8})),LM(Math.cos(i*1.3)*.5,1.4,Math.sin(i*1.3)*.5,(i%3-1)*.15,0,(i%2-.5)*.2));
      add('reed',new T.CapsuleGeometry(.13,.55,4,8),own(new T.MeshStandardMaterial({color:col('#5a3a20'),roughness:.9})),LM(.2,2.7,.1));
      add('reed',new T.CapsuleGeometry(.12,.5,4,8),own(new T.MeshStandardMaterial({color:col('#5a3a20'),roughness:.9})),LM(-.35,2.4,-.3));break;}
    case 'autumn':
      add('maple',new T.CylinderGeometry(.35,.6,4.4,9),own(new T.MeshStandardMaterial({color:col('#4a2e1c'),roughness:.9})),LM(0,2.2,0));
      [[0,5.3,0,2.3],[1.3,4.6,.6,1.6],[-1.2,4.7,-.4,1.7],[.3,4.5,-1.3,1.5],[-.4,6.3,.4,1.4]].forEach(([x,y,z,r])=>add('maple',new T.IcosahedronGeometry(r,1),own(new T.MeshStandardMaterial({color:0xffffff,roughness:.8,flatShading:true})),LM(x,y,z),(it)=>col('#c8452a').lerp(col('#f2a03a'),it.tint)));collide('maple',.7);
      add('acorn',new T.SphereGeometry(1,22,16),own(new T.MeshPhysicalMaterial({color:col('#b07a3a'),roughness:.35,clearcoat:.8})),LM(0,1.1,0,0,0,.35,1,1.25,1));
      add('acorn',new T.SphereGeometry(1.05,20,10,0,TAU,0,Math.PI/2),own(new T.MeshStandardMaterial({color:col('#6a4424'),roughness:.95,flatShading:true})),LM(-.28,1.75,0,0,0,.35,1,.6,1));
      add('acorn',new T.CylinderGeometry(.08,.12,.5,6),own(new T.MeshStandardMaterial({color:col('#4a2e1c'),roughness:.9})),LM(-.5,2.4,0,0,0,.35));collide('acorn',1.0);
      add('stump',new T.CylinderGeometry(1.1,1.5,1.5,12),own(new T.MeshStandardMaterial({color:col('#5a3e26'),roughness:.9,flatShading:true})),LM(0,.75,0));
      add('stump',new T.CylinderGeometry(1.1,1.1,.06,24),own(new T.MeshStandardMaterial({color:col('#c8a070'),roughness:.8})),LM(0,1.52,0));
      add('stump',new T.CylinderGeometry(.1,.14,.5,8),own(new T.MeshStandardMaterial({color:col('#efe2c4'),roughness:.8})),LM(.6,1.75,.2));add('stump',new T.SphereGeometry(.32,14,8,0,TAU,0,Math.PI/2),own(new T.MeshStandardMaterial({color:col('#e8843a'),roughness:.5})),LM(.6,1.98,.2,0,0,0,1,.6,1));collide('stump',1.3);break;
    case 'ruins':
      add('pillar',new T.CylinderGeometry(.85,.95,5,8),rock,LM(0,2.5,0,0,0,.04),(it)=>col('#6a6a62').lerp(col('#5a5c56'),it.tint));
      add('pillar',new T.CylinderGeometry(1.25,1.25,.5,8),rock,LM(0,.25,0),()=>col('#5a5a52'));
      add('pillar',new T.SphereGeometry(1,16,8,0,TAU,0,Math.PI*.45),own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,flatShading:true})),LM(0,4.9,0,0,0,0,.95,.5,.95));
      add('pillar',new T.TorusGeometry(.92,.05,6,24),glowB('#c8a0ff',2.2),LM(0,2.3,0,Math.PI/2,0,0));collide('pillar',1);
      add('rootarch',new T.TorusGeometry(2.6,.42,10,24,Math.PI),own(new T.MeshStandardMaterial({color:col('#4a3626'),roughness:.9,flatShading:true})),LM(0,0,0,0,0,0,1,1.15,1));
      add('rootarch',new T.SphereGeometry(.16,8,6),glowB('#d8c0ff',2.6),LM(.6,3.1,0));
      add('rock',new T.DodecahedronGeometry(1.5,0),rock,LM(0,.7,0,0,0,0,1,.75,1),(it)=>col('#4a4a44').lerp(col('#5e5e56'),it.tint));collide('rock',1.3);break;
    case 'frost':
      add('pine',new T.CylinderGeometry(.22,.3,1.4,8),own(new T.MeshStandardMaterial({color:col('#6a4a34'),roughness:.9})),LM(0,.7,0));
      [[2.1,2.4,1.9],[1.65,2.1,3.0],[1.1,1.8,4.0]].forEach(([r,h,y])=>{add('pine',new T.ConeGeometry(r,h,9),own(new T.MeshStandardMaterial({color:col('#1f5a4a'),roughness:.8,flatShading:true})),LM(0,y,0));add('pine',new T.ConeGeometry(r*.62,h*.45,9),own(new T.MeshStandardMaterial({color:col('#f4f8ff'),roughness:.7,flatShading:true})),LM(0,y+h*.32,0));});collide('pine',1.2);
      add('crystal',new T.OctahedronGeometry(1,0),own(new T.MeshPhysicalMaterial({color:col('#c8fff0'),emissive:col('#3fd6a0'),emissiveIntensity:.45,roughness:.08,clearcoat:1,transparent:true,opacity:.85,flatShading:true})),LM(0,1.6,0,0,0,.15,1,2.4,1));collide('crystal',.9);
      add('snowrock',new T.DodecahedronGeometry(1.5,1),rock,LM(0,.6,0,0,0,0,1,.7,1),()=>col('#dfe9f6'));collide('snowrock',1.3);break;
  }
}
function buildDetails(map,group,B){
  const R=mulberry32(map.seed^0x5f3759df);const list=[];
  for(let i=0;i<3200&&list.length<2600;i++){const x=(R()*2-1)*94,z=(R()*2-1)*(map.zWall+2);const d=map.laneDistAt(x,z);if(d<map.lw*.5+.6)continue;if(Math.hypot(Math.abs(x)-86,z)<14)continue;
    list.push({x,y:map.heightAt(x,z),z,s:.5+R()*.9,rot:R()*TAU,rx:(R()-.5)*.3,rz:(R()-.5)*.3,tint:R()});}
  const pal=B.detail.map(col);let gm;
  if(B.id==='frost')gm=own(new T.OctahedronGeometry(.18,0));else{gm=own(new T.ConeGeometry(.08,.85,4));gm.translate(0,.42,0);}
  const im=makeInstanced(gm,own(new T.MeshStandardMaterial({color:0xffffff,roughness:.8,flatShading:true})),list,null,(it)=>{const c=pal[Math.floor(it.tint*pal.length)%pal.length].clone();if(B.id==='glow'&&it.tint>.82)c.multiplyScalar(3.2);return c;});
  im.castShadow=false;group.add(im);
}
function buildBases(map,group){
  const stoneM=own(new T.MeshStandardMaterial({color:col('#6e6e64'),roughness:.92,flatShading:true}));const mossM=own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,flatShading:true}));
  for(const team of ['blue','red']){const s=TEAMS[team].sign;const g=new T.Group();g.position.set(s*86,map.heightAt(s*86,0),0);
    const disc=new T.Mesh(own(new T.CylinderGeometry(9.4,10,.4,40)),own(new T.MeshStandardMaterial({color:col('#5a5a50'),roughness:.9})));disc.position.y=.1;disc.receiveShadow=true;g.add(disc);
    const moss=new T.Mesh(own(new T.RingGeometry(3,9.2,40,2)),own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,transparent:true,opacity:.55})));moss.rotation.x=-Math.PI/2;moss.position.y=.32;g.add(moss);
    const glow=new T.Mesh(own(new T.TorusGeometry(9.5,.1,8,80)),own(new T.MeshBasicMaterial({color:col(TEAMS[team].hex).multiplyScalar(3),toneMapped:false})));glow.rotation.x=Math.PI/2;glow.position.y=.34;g.add(glow);
    for(let i=0;i<7;i++){const a=i/7*TAU+.2;const st=new T.Mesh(own(new T.DodecahedronGeometry(1,0)),stoneM);st.scale.set(.7,2.4+((i*37)%5)*.25,.55);st.position.set(Math.cos(a)*9.8,1.9,Math.sin(a)*9.8);st.rotation.y=-a;st.castShadow=true;g.add(st);
      const cap=new T.Mesh(own(new T.SphereGeometry(.75,10,6,0,TAU,0,Math.PI/2)),mossM);cap.scale.set(.9,.4,.8);cap.position.set(st.position.x,st.position.y+st.scale.y*.82,st.position.z);g.add(cap);
      const tip=new T.Mesh(sphereG(),glowMat(TEAMS[team].hex,2.6));tip.scale.setScalar(.26);tip.position.set(Math.cos(a)*9.8,st.position.y+st.scale.y+.75,Math.sin(a)*9.8);g.add(tip);}
    group.add(g);}
}
function buildNestView(n,B){
  const g=new T.Group();const s=n.main?1.85:1;const tc=TEAMS[n.team].hex;
  const pad=new T.Mesh(geo('nestPad',()=>new T.CylinderGeometry(3,3.4,.35,40)),pmat('#5a5c50',{roughness:.9}));const pmoss=new T.Mesh(geo('nestMoss',()=>new T.CylinderGeometry(2.7,2.9,.08,40)),pmat('#4f7a3a',{roughness:.95}));pmoss.position.y=.3;g.add(pmoss);pad.position.y=.1;pad.receiveShadow=true;g.add(pad);
  const ringMat=own(new T.MeshBasicMaterial({color:col(tc).multiplyScalar(4),toneMapped:false}));
  const ring=new T.Mesh(geo('nestRing',()=>new T.TorusGeometry(3.15,.09,8,64)),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.3;g.add(ring);
  const twig=pmat(B.twig,{roughness:.85,clearcoat:.1});const twig2=pmat('#a07a50',{roughness:.85,clearcoat:.1});
  const bowl=new T.Group();g.add(bowl);
  for(let i=0;i<9;i++){const t=new T.Mesh(geo('twigRing',()=>new T.TorusGeometry(1,.17,6,26)),i%2?twig:twig2);const y=.45+i*.11;const r=1.35+i*.09;t.scale.set(r,r,1+i*.05);t.position.y=y;t.rotation.set(Math.PI/2+(Math.random()-.5)*.3,(Math.random()-.5)*.3,Math.random()*TAU);t.castShadow=true;bowl.add(t);}
  for(let i=0;i<10;i++){const a=i/10*TAU+Math.random()*.4;const st=new T.Mesh(cylG(.05,.07,1.6,5),twig2);st.position.set(Math.cos(a)*2,1.2,Math.sin(a)*2);st.rotation.set(Math.sin(a)*.9,0,-Math.cos(a)*.9);bowl.add(st);}
  const eggMat=own(new T.MeshPhysicalMaterial({color:col(tc).lerp(new T.Color(1,1,1),.45),emissive:col(tc),emissiveIntensity:.9,roughness:.25,clearcoat:1,sheen:1,sheenColor:new T.Color(1,1,1)}));
  const eggs=[];for(let i=0;i<3;i++){const a=i/3*TAU;const e=new T.Mesh(sphereG(),eggMat);e.scale.set(.55,.75,.55);e.position.set(Math.cos(a)*.55,1.35,Math.sin(a)*.55);e.rotation.z=Math.cos(a)*.25;e.castShadow=true;bowl.add(e);eggs.push(e);}
  let crystal=null;
  if(n.main){const bark=pmat('#4a3322',{roughness:.9,flatShading:true});const tr=new T.Mesh(geo('heartTrunk',()=>new T.CylinderGeometry(.22,.5,4.6,8)),bark);tr.position.y=2.6;tr.castShadow=true;g.add(tr);
    for(const [x,y,z,r] of [[0,5.5,0,1.5],[.9,5,.4,1.05],[-.85,5.1,-.3,1.1],[.2,6.2,-.2,1]]){const c=new T.Mesh(geo('heartLeaf'+r,()=>new T.IcosahedronGeometry(r,1)),own(new T.MeshStandardMaterial({color:col(tc).lerp(col('#3f6a34'),.62),emissive:col(tc),emissiveIntensity:.18,roughness:.8,flatShading:true})));c.position.set(x,y,z);c.castShadow=true;g.add(c);}
    crystal=new T.Mesh(geo('heartSeed',()=>new T.IcosahedronGeometry(.62,2)),own(new T.MeshStandardMaterial({color:col(tc),emissive:col(tc),emissiveIntensity:2.6,roughness:.25})));crystal.scale.set(1,1.3,1);crystal.position.y=3.6;g.add(crystal);
    const halo=new T.Mesh(geo('halo',()=>new T.TorusGeometry(1.4,.05,6,48)),ringMat);halo.position.y=3.6;halo.rotation.x=Math.PI/2.3;g.add(halo);n.halo=halo;}
  g.scale.setScalar(s);
  return {group:g,bowl,eggs,crystal,ringMat,eggMat,hitT:0,dead:false,deadT:0,pulse:0,s};
}
function buildBoulderView(B){const g=new T.Group();const k=B.boulder||B.id;let m;
  const spec={mossball:['#4f7a3a',{roughness:.95}],stone:['#5e5e58',{roughness:.9}],acorn:['#a0703a',{roughness:.4,clearcoat:.7}],snowball:['#f4f8ff',{roughness:.6}]}[k]||['#777777',{}];
  m=own(new T.MeshPhysicalMaterial(Object.assign({color:col(spec[0]),flatShading:k==='stone'||k==='mossball'},spec[1])));
  const ball=new T.Mesh(geo('boulderG'+k,()=>{const gg=new T.IcosahedronGeometry(2.2,k==='acorn'||k==='snowball'?4:1);if(k!=='acorn'){const p=gg.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);const s=1+(hash2(Math.round(v.x*10),Math.round(v.z*10+v.y*7))-.5)*.18;p.setXYZ(i,v.x*s,v.y*s,v.z*s);}gg.computeVertexNormals();}return gg;}),m);
  ball.castShadow=true;g.add(ball);if(k==='acorn'){const cap=new T.Mesh(geo('boulderCap',()=>new T.SphereGeometry(2.3,20,10,0,TAU,0,Math.PI/2)),own(new T.MeshStandardMaterial({color:col('#6a4424'),roughness:.95,flatShading:true})));cap.scale.y=.6;cap.position.y=.9;ball.add(cap);}g.userData.ball=ball;return g;}
function buildGeyserView(B){
  const g=new T.Group();
  const base=new T.Mesh(geo('geyBase',()=>new T.CylinderGeometry(.9,1.7,.7,10,1,true)),pmat('#4a4038',{roughness:.9,flatShading:true,side:T.DoubleSide}));base.position.y=.25;base.castShadow=true;g.add(base);
  for(let i=0;i<6;i++){const a=i/6*TAU;const pb=new T.Mesh(sphereG(),pmat('#efe2c4',{roughness:.7,sheen:.6,sheenColor:col('#ffffff')}));const r=.32+((i*7)%3)*.1;pb.scale.set(r,r*.8,r);pb.position.set(Math.cos(a)*1.55,r*.6,Math.sin(a)*1.55);pb.castShadow=true;g.add(pb);}
  const disc=new T.Mesh(geo('geyDisc',()=>new T.CircleGeometry(.9,20)),own(new T.MeshBasicMaterial({color:col(B.geyser).multiplyScalar(2),toneMapped:false})));disc.rotation.x=-Math.PI/2;disc.position.y=.45;g.add(disc);g.userData.disc=disc;
  return g;
}
const CRITTER=D('Snorflet','#ffd23d','#ff7ae8','spots',[.5,.46,.56],[P('shortLegs',.6,-.62,.45,{s:.45}),P('shortLegs',.6,-.62,-.45,{s:.45}),P('beadEye',.34,.4,.84,{s:.85})]);
const BOSS=D('The Grand Gobbler','#4f7a5a','#d9473b','spots',[2.3,1.9,2.6],[P('shortLegs',.6,-.62,.55,{s:1.9}),P('shortLegs',.6,-.62,0,{s:1.9}),P('shortLegs',.6,-.62,-.55,{s:1.9}),P('horns',.35,.75,.5,{s:1.8}),P('basicJaw',0,-.2,.98,{s:2.2}),P('spikes',0,.98,-.2,{s:1.8}),P('spikes',0,.85,-.55,{s:1.6}),P('beadEye',.36,.42,.82,{s:1.6}),P('googlyEye',0,.6,.8,{s:1.5,m:false}),P('crownMini',0,1,.1,{s:2})]);
function spawnNeutral(type,x,z,B){
  const boss=type==='boss';const d=clone(boss?BOSS:CRITTER);if(!boss){d.color=B.critter;d.accent=pick(['#ff9ec4','#7fe3c0','#f4ead2','#f2b84b']);d.seed=Math.floor(Math.random()*9999);}
  const n={kind:'neutral',type,name:d.name,d,x,z,y:world.map.heightAt(x,z),hx:x,hz:z,vx:0,vz:0,vy:0,yaw:Math.random()*TAU,radius:boss?2.6:.6,maxHp:boss?900:60,alive:true,respawnT:0,wanderT:0,tx:x,tz:z,slamCd:2,slamT:0,lastHurt:-99,team:'neutral',state:'alive',kx:0,kz:0,grounded:true,flee:0};
  n.hp=n.maxHp;n.view=buildCreatureView(d,{});n.height=n.view.height;n.view.root.position.set(x,n.y,z);world.group.add(n.view.root);
  n.tag=makeTag('tag3d neutral','<div class="tn">'+esc(n.name)+'</div><div class="tb"><i></i></div>');
  world.neutrals.push(n);return n;
}


/* ---------- enchanted-forest dressing: soft halo, giant treeline, fireflies, light shafts ---------- */
let _haloTex=null;function haloTex(){if(_haloTex)return _haloTex;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.2,'rgba(255,255,255,.35)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return _haloTex=new T.CanvasTexture(c);}
function buildForestWall(map,group,B){
  const R=mulberry32(map.seed^0x1234567);const list=[];const zE=map.zWall+6,xE=map.xWall+6;
  for(let i=0;i<150;i++){let x,z;const side=R();
    if(side<.7){x=(R()*2-1)*(xE+16);z=(R()<.5?-1:1)*(zE+4+R()*26);}else{x=(R()<.5?-1:1)*(xE+4+R()*22);z=(R()*2-1)*(zE+20);}
    list.push({x,z,y:map.heightAt(x,z)-1,s:1.5+R()*1.5,rot:R()*TAU,tint:R()});}
  const trunkM=own(new T.MeshStandardMaterial({color:0xffffff,roughness:.95,flatShading:true}));const canM=own(new T.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true}));
  const tc=col(B.trunk),cc=col(B.canopy);
  const trunk=own(new T.CylinderGeometry(.9,1.6,24,7));trunk.translate(0,12,0);
  group.add(makeInstanced(trunk,trunkM,list,null,(it)=>tc.clone().multiplyScalar(.8+it.tint*.4)));
  if(B.pines){[[6,10,14],[4.6,9,20],[3,8,25]].forEach(([r,h,y])=>{const c=own(new T.ConeGeometry(r,h,8));c.translate(0,y,0);group.add(makeInstanced(c,canM,list,null,(it)=>cc.clone().multiplyScalar(.75+it.tint*.5)));});}
  else{[[0,24,0,8],[4.5,20,2,6],[-4,21,-2,6.4],[1,28,-1,5.5]].forEach(([x,y,z,r])=>{const c=own(new T.IcosahedronGeometry(r,1));c.translate(x,y,z);group.add(makeInstanced(c,canM,list,null,(it)=>cc.clone().multiplyScalar(.7+it.tint*.6)));});}
  // hanging moss / vines on the near treeline for silhouette
  const vl=list.filter((it,i)=>i%2===0);const vine=own(new T.CylinderGeometry(.05,.18,7,4));vine.translate(2.2,13,0);
  group.add(makeInstanced(vine,own(new T.MeshStandardMaterial({color:col(B.canopy).multiplyScalar(1.3),roughness:.9})),vl));
}
const FIREFLY_VS='uniform float time;attribute float seed;varying float vA;void main(){vec3 p=position;float t=time*.6+seed*20.;p.x+=sin(t*1.3)*1.4;p.y+=sin(t*1.7+seed)*.7;p.z+=cos(t*1.1)*1.4;'+
  'vec4 mv=modelViewMatrix*vec4(p,1.);vA=.35+.65*pow(.5+.5*sin(time*2.4+seed*40.),3.);gl_PointSize=clamp(90./-mv.z,1.5,9.)*(.6+vA*.6);gl_Position=projectionMatrix*mv;}';
const FIREFLY_FS='uniform vec3 c;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);float a=smoothstep(.5,0.,r);gl_FragColor=vec4(c*a*vA*2.2,1.);}';
function buildFireflies(map,group,B){
  const R=mulberry32(map.seed^0x777);const N=420;const pos=new Float32Array(N*3),sd=new Float32Array(N);
  for(let i=0;i<N;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall+4);pos[i*3]=x;pos[i*3+1]=map.heightAt(x,z)+.6+R()*5.5;pos[i*3+2]=z;sd[i]=R();}
  const g=own(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('seed',new T.BufferAttribute(sd,1));
  const m=own(new T.ShaderMaterial({uniforms:{time:{value:0},c:{value:col(B.firefly||'#ffe9a0')}},vertexShader:FIREFLY_VS,fragmentShader:FIREFLY_FS,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
  const pts=new T.Points(g,m);pts.frustumCulled=false;pts.onBeforeRender=()=>{m.uniforms.time.value=performance.now()*.001;};group.add(pts);
}
let _shaftTex=null;function shaftTex(){if(_shaftTex)return _shaftTex;const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');
  for(let i=0;i<64;i++){const e=Math.sin(i/63*Math.PI);const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.25,'rgba(255,255,255,'+(.9*e*e)+')');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(i,0,1,128);}
  return _shaftTex=new T.CanvasTexture(c);}
function buildLightShafts(map,group,B){
  const R=mulberry32(map.seed^0x4242);const m=own(new T.MeshBasicMaterial({map:shaftTex(),color:col(B.shaft||'#fff2c8'),transparent:true,opacity:.055,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false,toneMapped:false}));
  const geom=own(new T.CylinderGeometry(2.4,5,46,18,1,true));
  for(let i=0;i<6;i++){const x=-(16+R()*50),z=(R()*2-1)*(map.Lz+4);for(const sx of [1,-1]){const sh=new T.Mesh(geom,m);sh.position.set(x*sx,map.heightAt(x*sx,z)+20,z);sh.rotation.set(.28,0,.32*sx);sh.renderOrder=3;group.add(sh);}}
}

/* ---------- labels, floating text, banners, killfeed ---------- */
const labelLayer=$('#labels');
function makeTag(cls,html){const d=document.createElement('div');d.className=cls;d.innerHTML=html;d.style.display='none';labelLayer.appendChild(d);if(world)world.tags.push(d);return d;}
const ftPool=[];for(let i=0;i<40;i++){const d=document.createElement('div');d.className='ft';d.style.display='none';labelLayer.appendChild(d);ftPool.push({el:d,life:0,x:0,y:0,z:0,vy:0});}
let ftI=0;
function floatText(ent,text,kind,yOff){const f=ftPool[ftI++%ftPool.length];f.el.className='ft '+(kind||'');f.el.textContent=text;f.life=1.0;f.x=ent.x+(Math.random()-.5)*.8;f.z=ent.z+(Math.random()-.5)*.8;f.y=(ent.y||0)+(yOff!=null?yOff:(ent.height||3)+.4);f.vy=2.2;f.el.style.display='block';}
const _v=new T.Vector3();
function toScreen(x,y,z){_v.set(x,y,z).project(camera);if(_v.z>1||_v.z<-1)return null;return {x:(_v.x*.5+.5)*innerWidth,y:(-_v.y*.5+.5)*innerHeight};}
function updateFloatTexts(dt){for(const f of ftPool){if(f.life<=0)continue;f.life-=dt;f.y+=f.vy*dt;f.vy*=.96;const p=toScreen(f.x,f.y,f.z);if(!p||f.life<=0){f.el.style.display='none';if(f.life<=0)f.life=0;continue;}f.el.style.display='block';f.el.style.opacity=Math.min(1,f.life*2.5);f.el.style.transform='translate('+(p.x|0)+'px,'+(p.y|0)+'px) translate(-50%,-50%) scale('+(1+Math.max(0,f.life-.8)*2)+')';}}
const bannerEl=$('#banner');let bannerQ=[],bannerT=0;
function banner(text,kind){if(typeof announce==='function')announce(text);bannerQ.push({text,kind:kind||'good'});if(bannerQ.length>4)bannerQ.shift();}
function updateBanner(dt){bannerT-=dt;if(bannerT<=0){if(bannerQ.length){const b=bannerQ.shift();bannerEl.innerHTML='<div class="bn '+b.kind+'">'+esc(b.text)+'</div>';bannerT=2.1;}else if(bannerEl.firstChild){bannerEl.innerHTML='';}}}
const kfEl=$('#killfeed');
function tname(c){if(!c)return '<span class="n">The forest</span>';const cls=c.kind==='creature'?(c.team==='blue'?'b':'r'):'n';return '<span class="'+cls+'">'+esc(c.isPlayer?'You':c.name)+'</span>';}
function killfeed(html){if(typeof announce==='function')announce(html);const d=document.createElement('div');d.className='kf';d.innerHTML=html;kfEl.prepend(d);while(kfEl.children.length>6)kfEl.lastChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),700);},6000);}
function clearAnnouncements(){kfEl.innerHTML='';bannerQ=[];bannerEl.innerHTML='';for(const f of ftPool){f.life=0;f.el.style.display='none';}}
