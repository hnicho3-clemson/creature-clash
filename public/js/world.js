'use strict';
/* Creature Clash — biomes, seeded mirrored map, world building, labels & announcements */
const BIOMES=[
  {id:'grove',name:'Mossy Hollow',ground:'#6aa84a',ground2:'#4f8f3c',lane:'#b08c58',laneEdge:'#8a6a44',wall:'#2c4a34',skyTop:'#2f5f86',skyMid:'#79afc0',skyHorizon:'#f6e2b0',fog:'#93bca8',sun:'#fff0cc',sunI:2.56,hemiSky:'#d8f0ff',hemiGround:'#3a5a2a',twig:'#5a3e26',critter:'#8fd16a',geyser:'#c8ff9a',planet:'#f4f0d8',detail:['#5f9a3c','#7fbf5a','#4f8a34','#ff9ec4','#fff3b0'],props:['toadstool','fern','mossrock'],rough:.9,bloom:1.75,boulder:'mossball',trunk:'#6a4a32',canopy:'#3f8f44',firefly:'#ffe9a0',shaft:'#fff2c8',canopy2:'#6ab048',grass:['#5aa040','#73b84c','#4f9a3c','#8cc858'],flowers:['#ff9ec4','#fff3b0','#ffffff','#ffb36b','#b8a0ff'],stone:'#9a9c90',trees:['round','round','tall','pine']},
  {id:'glow',name:'Glimmerwood',ground:'#3f6f6a',ground2:'#2f5a58',lane:'#5e6078',laneEdge:'#3e4458',wall:'#18303a',skyTop:'#151c42',skyMid:'#33508a',skyHorizon:'#7ac8c8',fog:'#3f5f7a',sun:'#c8dcff',sunI:2.07,hemiSky:'#a0c8e8',hemiGround:'#1a2a30',twig:'#3a3a44',critter:'#7fe3c0',geyser:'#7fffd0',planet:'#dfe8ff',detail:['#2f5a5a','#3f7a7a','#285050','#7fffd0','#b49ae0'],props:['glowshroom','lantern','deadtree'],rough:.85,bloom:1.35,boulder:'stone',trunk:'#4a4258',canopy:'#2a7a74',firefly:'#8fffe0',shaft:'#9fdcff',canopy2:'#4a5aa0',grass:['#3f8a80','#4fa094','#3a7a7a','#5ab8a8'],flowers:['#8fffe0','#c8a0ff','#7fd0ff'],stone:'#7a8494',trees:['round','tall','tall'],fruit:'#8fffe0'},
  {id:'lotus',name:'Lotus Marsh',ground:'#7ab060',ground2:'#5a9a6a',lane:'#c2a47a',laneEdge:'#9a7a5a',wall:'#3a5a4e',skyTop:'#4a3c80',skyMid:'#b26e9c',skyHorizon:'#ffd2b0',fog:'#c8a4b4',sun:'#ffe0c0',sunI:2.32,hemiSky:'#ffe0f0',hemiGround:'#3a5a44',twig:'#5a4a30',critter:'#ff9ec4',geyser:'#ffb3d0',planet:'#ffe8d8',detail:['#4f8a5a','#6fae6a','#3f7a4a','#ff9ec4','#ffffff'],props:['lotus','reed','lilypad'],rough:.8,bloom:1.75,boulder:'mossball',trunk:'#6a5040',canopy:'#5aa070',firefly:'#ffc8e0',shaft:'#ffd8c8',canopy2:'#e8a0c0',grass:['#6aa858','#80bc64','#5a9a50','#94c874'],flowers:['#ff9ec4','#ffffff','#ffc8e0','#fff3b0'],stone:'#a49a90',trees:['round','round','tall'],fruit:'#ffc0dc'},
  {id:'autumn',name:'Amberleaf Glade',ground:'#8a7a36',ground2:'#6e6230',lane:'#bc9462',laneEdge:'#9a6a3a',wall:'#4a2e1e',skyTop:'#3c3c70',skyMid:'#c27464',skyHorizon:'#ffd394',fog:'#c49a74',sun:'#ffe0a8',sunI:2.1,hemiSky:'#ffe8c8',hemiGround:'#4a3218',twig:'#6a4a2a',critter:'#f2b84b',geyser:'#ffb060',planet:'#ffe8c8',detail:['#c8642a','#e0943a','#8a7a32','#a0402a','#f2c84b'],props:['maple','acorn','stump'],rough:.9,bloom:1.95,boulder:'acorn',trunk:'#5a3a24',canopy:'#e07a2a',firefly:'#ffd080',shaft:'#ffd8a0',canopy2:'#f2b83a',grass:['#a8a040','#c0b048','#8a9a3a','#d0a040'],flowers:['#ffd86a','#ff8a4a','#ffffff','#e8604a'],stone:'#a89a84',trees:['round','round','tall'],fruit:null},
  {id:'ruins',name:'Rootdeep Ruins',ground:'#5e7048',ground2:'#4a5c40',lane:'#857d6a',laneEdge:'#6a6458',wall:'#22281e',skyTop:'#2a2c52',skyMid:'#5e5e92',skyHorizon:'#cabce2',fog:'#727090',sun:'#f0e8ff',sunI:2.44,hemiSky:'#d8d0f0',hemiGround:'#22241c',twig:'#4a3a2a',critter:'#b49ae0',geyser:'#c8a0ff',planet:'#e8e0ff',detail:['#3f5a3a','#5a7a4a','#33452e','#b49ae0'],props:['pillar','rootarch','rock'],rough:.9,bloom:1.6,boulder:'stone',trunk:'#4a3a2e',canopy:'#4a8050',firefly:'#d8c0ff',shaft:'#d8d0ff',canopy2:'#6a6aa0',grass:['#5a8048','#6a9050','#4a7040','#7aa060'],flowers:['#c8a0ff','#ffffff','#9ad0ff'],stone:'#8e8c84',trees:['round','tall','tall'],fruit:'#d8c0ff'},
  {id:'frost',name:'Frostfern Thicket',ground:'#d6e2ec',ground2:'#b8cad8',lane:'#8ea2b8',laneEdge:'#8aa0b4',wall:'#d0e0ec',skyTop:'#3a5c9c',skyMid:'#8cb6de',skyHorizon:'#eaf4ff',fog:'#aac6de',sun:'#fff6e8',sunI:1.5,hemiSky:'#cfe2f4',hemiGround:'#5a6a7a',twig:'#6a5040',critter:'#7ec8e3',geyser:'#d8f4ff',planet:'#f0f6ff',detail:['#ffffff','#cfe0f0','#e8f0f8','#7fe3c0'],props:['pine','crystal','snowrock'],rough:.6,bloom:2.3,boulder:'snowball',trunk:'#5a4438',canopy:'#2f6a5a',pines:true,firefly:'#d8f4ff',shaft:'#e8f4ff',canopy2:'#3f7a6a',grass:['#d8ecf8','#bcdcf0','#ffffff','#a8e8e0'],flowers:['#a8e8ff','#ffffff','#c8b0ff'],stone:'#b8c4d0',trees:['pine','pine','pine'],fruit:null},
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
  // trees inside the arena (mirrored, they block movement like props) and their clearances
  const clear=(x,z,r)=>!(map.props.some(p=>dist2(p.x,p.z,x,z)<r*r)||map.geysers.some(g=>dist2(g.x,g.z,x,z)<(r+2)*(r+2))||map.spawns.some(g=>dist2(g.x,g.z,x,z)<(r+2)*(r+2)));
  map.trees=[];const tk=biome.trees||['round'];
  for(let i=0;i<160&&map.trees.length<52;i++){const x=-(4+R()*86),z=(R()*2-1)*(Lz+11);const kind=tk[Math.floor(R()*tk.length)];const s=.85+R()*.55,rot=R()*TAU,tint=R();
    if(laneDistAt(x,z)<lw*.5+3.6)continue;if(Math.hypot(x+86,z)<19)continue;if(nearNest(x,z,8))continue;if(dist2(x,z,map.boss.x,map.boss.z)<140)continue;if(!clear(x,z,3.2))continue;if(map.trees.some(t=>dist2(t.x,t.z,x,z)<20))continue;
    map.trees.push({x,z,kind,s,rot,tint},{x:-x,z,kind,s,rot:-rot,tint});}
  return map;
}

let world=null;let skyMesh=null,planet=null,envRT=null;
function buildWorld(seed,opts){
  opts=opts||{};
  if(world)teardownWorld();disposables=[];
  const map=makeMap(seed,opts);const B=map.biome;
  const group=new T.Group();scene.add(group);
  world={seed,map,group,creatures:[],nests:[],neutrals:[],projectiles:[],geysers:[],colliders:[],tags:[],inks:[],bolts:[],boulders:[],mode:map.mode};
  hemi.color.copy(col(B.hemiSky));hemi.groundColor.copy(col(B.hemiGround));hemi.intensity=.5;
  sun.color.copy(col(B.sun));sun.intensity=B.sunI;
  scene.fog=new T.Fog(col(B.fog),75,330);
  if(REAL){// remaster light: thick sunlit haze, bounced ground light (a stand-in for Lumen GI), volumetric shafts
    const fogC=col(B.fog).lerp(col(B.skyHorizon),.45).lerp(col(B.sun),.12);scene.fog=new T.FogExp2(fogC,B.id==='frost'?.0105:.0125);
    hemi.intensity=.62;hemi.groundColor.copy(col(B.ground)).multiplyScalar(.75);hemi.color.lerp(col(B.skyHorizon),.3);sun.intensity=B.sunI*1.05;
    if(litPass){litPass.volK=B.id==='glow'||B.id==='ruins'?.2:.15;litPass.dofK=1;litPass.glowK=.45;}}
  if(envRT)envRT.dispose();envRT=makeEnvMap(B);scene.environment=envRT.texture;
  if(skyMesh){scene.remove(skyMesh);skyMesh.material.dispose();}
  skyMesh=new T.Mesh(geo('skysph',()=>new T.SphereGeometry(1000,48,24)),skyMaterial(B,.35));skyMesh.renderOrder=-1;scene.add(skyMesh);
  if(planet)scene.remove(planet);
  // the moon: a soft glowing disc with a wide halo, low over the treeline
  planet=new T.Group();const tp=skinTex('pebble');const pm=own(new T.MeshStandardMaterial({color:col(B.planet),roughness:1,emissive:col(B.planet),emissiveIntensity:.85,normalMap:tp.normal,normalScale:new T.Vector2(.6,.6),fog:false}));
  planet.add(new T.Mesh(geo('moon',()=>new T.SphereGeometry(34,48,32)),pm));
  const halo=new T.Sprite(own(new T.SpriteMaterial({map:haloTex(),color:col(B.planet).multiplyScalar(.9),transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false})));halo.scale.setScalar(300);planet.add(halo);
  planet.position.set(300,250,-640);scene.add(planet);
  buildTerrain(map,group,B);buildProps(map,group,B);buildDetails(map,group,B);if(REAL){buildFlagstones(map,group,B);buildBoulders(map,group,B);buildGardenReal(map,group,B);buildTreesReal(map,group,B);}else{buildGarden(map,group,B);buildTrees(map,group,B);}buildBases(map,group);buildForestWall(map,group,B);buildFireflies(map,group,B);
  for(const ns of map.nests)addNest(ns);
  for(const g of map.geysers){const gy={x:g.x,z:g.z,y:map.heightAt(g.x,g.z),period:g.period,t:g.off,hit:new Set(),erupting:0};gy.view=buildGeyserView(B);gy.view.position.set(gy.x,gy.y,gy.z);group.add(gy.view);world.geysers.push(gy);}
  for(const sp of map.spawns)spawnNeutral('critter',sp.x,sp.z,B);
  for(const b of map.boulders){const bo={x:b.x,z:0,y:0,dir:b.dir,period:b.period,t:b.off,r:2.2,active:false,warn:false,hit:new Set()};bo.view=buildBoulderView(B);bo.view.visible=false;group.add(bo.view);world.boulders.push(bo);}
  if(map.mode!=='test')spawnNeutral('boss',map.boss.x,map.boss.z,B);
  lowpolyfy(group);
  if(bloomPass){bloomPass.threshold=REAL?B.bloom*1.1:B.bloom;if(REAL)bloomPass.strength=.32;}
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
  const pos=g.attributes.position;const cols=new Float32Array(pos.count*3);const laneA=new Float32Array(pos.count);
  const cg=col(B.ground),cg2=col(B.ground2),cl=REAL?col(B.lane).lerp(col('#8a7d6a'),.55):col(B.lane),ce=col(B.laneEdge),cw=col(B.wall),tmp=new T.Color(),blueC=col('#3ba7ff'),redC=col('#ff4d5e');const hw=map.lw*.5;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=map.heightAt(x,z);pos.setY(i,h);const d=map.laneDistAt(x,z);
    const n=fbm(x*.12+3,z*.12+7);tmp.copy(cg).lerp(cg2,clamp(n*1.6-.35,0,1));const patch=vnoise(x*.05+11,z*.05+3);tmp.multiplyScalar(.94+patch*.14);
    const lane=1-smooth(hw-.5,hw+.3,d);const edge=Math.exp(-((d-hw)*(d-hw))/.35);tmp.lerp(cl,lane*(.85+.15*n));tmp.lerp(ce,edge*.45);if(lane>.5)tmp.multiplyScalar(1+(1-smooth(0,hw*.7,d))*.08);
    const bd=Math.hypot(Math.abs(x)-86,z);if(bd<15){const pad=1-smooth(12,15,bd);tmp.lerp(cl,pad*.8);const rim=Math.exp(-((bd-12.5)*(bd-12.5))/.25);tmp.lerp(x<0?blueC:redC,rim*.7);}
    const wall=smooth(.5,4,Math.max(Math.abs(z)-map.zWall,Math.abs(x)-map.xWall));tmp.lerp(cw,wall);if(h>1.2&&wall<.5)tmp.multiplyScalar(1+(h-1.2)*.05);
    laneA[i]=Math.max(1-smooth(hw-1.2,hw+.6,d),Math.hypot(Math.abs(x)-86,z)<13?1:0);const sp=REAL?1:.9+hash2(Math.floor(x*2),Math.floor(z*2))*.18;cols[i*3]=tmp.r*sp;cols[i*3+1]=tmp.g*sp;cols[i*3+2]=tmp.b*sp;}
  g.setAttribute('color',new T.BufferAttribute(cols,3));g.setAttribute('lane',new T.BufferAttribute(laneA,1));g.computeVertexNormals();
  const mesh=new T.Mesh(g,own(REAL?groundMat():new T.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,envMapIntensity:.5,flatShading:true})));mesh.material.userData.keep=true;mesh.receiveShadow=true;group.add(mesh);
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
  const rock=own(REAL?tpMat({tex:'rock',moss:B.id==='frost'?.9:.75,mossCol:B.id==='frost'?'#f4f8ff':(B.grass||B.detail)[0],mossLo:.25,scale:.42,nStr:2,key:'prop'}):new T.MeshStandardMaterial({color:0xffffff,roughness:.85,flatShading:true}));
  const RG=(seed,sy)=>REAL?rockGeo(seed,{sy:sy||.8,w:48,h:32}):null;const palette=B.detail.map(col);
  const leafG=(w,l)=>{const g=lpSph(1,10,6);g.scale(w,.06,l);g.translate(0,0,l);const p=g.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);p.setY(i,p.getY(i)+z*.5-z*z*.22);}g.computeVertexNormals();return g;};
  const glowB=(hex,k)=>own(new T.MeshBasicMaterial({color:col(hex).multiplyScalar(k),toneMapped:false}));
  switch(B.id){
    case 'grove':
      add('toadstool',lpCyl(.32,.48,2.3,12),own(new T.MeshStandardMaterial({color:col('#efe2c4'),roughness:.8})),LM(0,1.15,0));
      add('toadstool',lpSph(1.5,28,14,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.42,clearcoat:.7,clearcoatRoughness:.3})),LM(0,2.15,0,0,0,0,1,.72,1),(it)=>it.tint>.75?col('#e8843a'):col('#d9473b'));
      add('toadstool',lpCirc(1.48,28),own(new T.MeshStandardMaterial({color:col('#d8c8a4'),roughness:.9,side:T.DoubleSide})),LM(0,2.14,0,Math.PI/2,0,0));
      [[.55,.95,.3],[-.6,.85,.45],[.1,1.08,-.55],[-.2,1.1,.05],[.85,.55,-.6],[-.95,.45,-.3]].forEach(([x,y,z])=>add('toadstool',lpSph(.2,10,8),own(new T.MeshStandardMaterial({color:col('#fff6e6'),roughness:.6})),LM(x,2.15+y*.72,z,0,0,0,1,.5,1)));
      collide('toadstool',.55);
      for(let i=0;i<7;i++){const a=i/7*TAU;add('fern',leafG(.28,1.15),own(new T.MeshStandardMaterial({color:col('#4f8a34'),roughness:.7,side:T.DoubleSide})),LM(0,.15,0,-.55-(i%2)*.25,a,0),(it)=>col('#4f8a34').lerp(col('#7fbf5a'),it.tint));}
      add('mossrock',REAL?RG(3.1,.75).scale(1.5,1.5,1.5):new T.DodecahedronGeometry(1.5,1),rock,LM(0,REAL?.35:.55,0,0,0,0,1,.7,1),(it)=>col('#6a6e62').lerp(col('#7d8076'),it.tint));
      if(!REAL)add('mossrock',lpSph(1.45,18,8,0,TAU,0,Math.PI*.42),own(new T.MeshStandardMaterial({color:col('#5f9a3c'),roughness:.95,flatShading:true})),LM(0,.82,0,0,0,0,1,.55,1),(it)=>col('#5f9a3c').lerp(col('#8fd16a'),it.tint*.5));collide('mossrock',1.3);break;
    case 'glow':
      add('glowshroom',lpCyl(.18,.3,3.2,10),own(new T.MeshStandardMaterial({color:col('#cfd8e0'),roughness:.7,emissive:col('#2a6a6a'),emissiveIntensity:.25})),LM(0,1.6,0,0,0,.08));
      add('glowshroom',lpSph(1.25,24,12,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.3,clearcoat:.8,emissive:0xffffff,emissiveIntensity:.0})),LM(.25,3.15,0,0,0,0,1,.55,1),(it)=>it.tint>.5?col('#4fd6c0'):col('#9a7ae0'));
      add('glowshroom',lpCirc(1.2,24),glowB('#7fffe0',1.6),LM(.25,3.13,0,Math.PI/2,0,0));
      add('glowshroom',lpCyl(.1,.16,1.6,8),own(new T.MeshStandardMaterial({color:col('#cfd8e0'),roughness:.7})),LM(1.1,.8,.6));
      add('glowshroom',lpSph(.6,16,8,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:col('#b49ae0'),roughness:.3,clearcoat:.8})),LM(1.1,1.6,.6,0,0,0,1,.55,1));
      add('glowshroom',lpCirc(.58,16),glowB('#c8a0ff',1.8),LM(1.1,1.59,.6,Math.PI/2,0,0));collide('glowshroom',.45);
      add('lantern',lpTor(1.1,.06,6,20,Math.PI*.6),own(new T.MeshStandardMaterial({color:col('#3f6a4a'),roughness:.7})),LM(-1.1,.0,0,0,0,0));
      add('lantern',lpCyl(.06,.08,1.6,6),own(new T.MeshStandardMaterial({color:col('#3f6a4a'),roughness:.7})),LM(-1.1,.8,0));
      add('lantern',lpSph(.32,14,10),glowB('#ffd86a',2.4),LM(-.05,.95,0,0,0,0,1,1.3,1));
      add('lantern',lpCone(.36,.3,10,1,true),own(new T.MeshStandardMaterial({color:col('#4f8a5a'),roughness:.6,side:T.DoubleSide})),LM(-.05,1.33,0,Math.PI,0,0));collide('lantern',.3);
      add('deadtree',lpCyl(.18,.75,6.5,7),own(new T.MeshStandardMaterial({color:col('#1a2026'),roughness:.9,flatShading:true})),LM(0,3.1,0,0,0,.06));
      [[.6,4.2,0,0,0,-.9,2.6],[-.5,3.6,.3,.3,0,.95,2.2],[.1,5.4,-.4,-.6,0,-.3,1.8]].forEach(([x,y,z,rx,ry,rz,l])=>add('deadtree',lpCyl(.06,.22,l,6),own(new T.MeshStandardMaterial({color:col('#1a2026'),roughness:.9,flatShading:true})),LM(x,y,z,rx,ry,rz)));
      add('deadtree',lpSph(.14,8,6),glowB('#8fffe0',2.6),LM(1.5,4.9,0));collide('deadtree',.7);break;
    case 'lotus':{
      const pond=own(new T.MeshPhysicalMaterial({color:col('#24424e'),roughness:.06,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.4}));pond.userData.keep=true;
      add('lotus',lpCirc(2.4,32),pond,LM(0,.14,0,-Math.PI/2,0,0));add('lilypad',lpCirc(2.6,32),pond,LM(0,.14,0,-Math.PI/2,0,0));
      add('lotus',lpCyl(1.1,1.1,.06,24,1,false,0,TAU*.9),own(new T.MeshStandardMaterial({color:col('#4f8a4a'),roughness:.55})),LM(.2,.2,.1));
      for(let i=0;i<8;i++){const a=i/8*TAU;add('lotus',lpSph(1,12,8),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.5,sheen:1,sheenColor:col('#ffffff')})),LM(Math.cos(a)*.42,.62,Math.sin(a)*.42,Math.sin(a)*.65,0,-Math.cos(a)*.65,.24,.5,.13),(it)=>col('#ff9ec4').lerp(col('#ffffff'),it.tint*.6));}
      for(let i=0;i<5;i++){const a=i/5*TAU+.3;add('lotus',lpSph(1,12,8),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.5,sheen:1,sheenColor:col('#ffffff')})),LM(Math.cos(a)*.18,.8,Math.sin(a)*.18,Math.sin(a)*.3,0,-Math.cos(a)*.3,.17,.4,.1),(it)=>col('#ffc0d8').lerp(col('#ffffff'),it.tint*.5));}
      add('lotus',lpSph(.16,12,8),glowB('#ffe08a',1.5),LM(0,.82,0));
      for(const [x,z,r] of [[.8,.6,1],[-1.1,.2,.8],[.2,-1.3,.7]])add('lilypad',lpCyl(r,r,.06,22,1,false,0,TAU*.88),own(new T.MeshStandardMaterial({color:col('#5a9a4a'),roughness:.5})),LM(x,.2,z,0,x*2,0));
      add('lilypad',lpSph(.2,10,8),own(new T.MeshStandardMaterial({color:col('#fff3f8'),roughness:.5})),LM(.85,.32,.55,0,0,0,1,.6,1));
      for(let i=0;i<6;i++)add('reed',lpCyl(.05,.07,2.8,5),own(new T.MeshStandardMaterial({color:col('#6a8a3a'),roughness:.8})),LM(Math.cos(i*1.3)*.5,1.4,Math.sin(i*1.3)*.5,(i%3-1)*.15,0,(i%2-.5)*.2));
      add('reed',new T.CapsuleGeometry(.13,.55,4,8),own(new T.MeshStandardMaterial({color:col('#5a3a20'),roughness:.9})),LM(.2,2.7,.1));
      add('reed',new T.CapsuleGeometry(.12,.5,4,8),own(new T.MeshStandardMaterial({color:col('#5a3a20'),roughness:.9})),LM(-.35,2.4,-.3));break;}
    case 'autumn':
      add('maple',lpCyl(.35,.6,4.4,9),own(new T.MeshStandardMaterial({color:col('#4a2e1c'),roughness:.9})),LM(0,2.2,0));
      [[0,5.3,0,2.3],[1.3,4.6,.6,1.6],[-1.2,4.7,-.4,1.7],[.3,4.5,-1.3,1.5],[-.4,6.3,.4,1.4]].forEach(([x,y,z,r])=>add('maple',new T.IcosahedronGeometry(r,1),own(new T.MeshStandardMaterial({color:0xffffff,roughness:.8,flatShading:true})),LM(x,y,z),(it)=>col('#c8452a').lerp(col('#f2a03a'),it.tint)));collide('maple',.7);
      add('acorn',lpSph(1,22,16),own(new T.MeshPhysicalMaterial({color:col('#b07a3a'),roughness:.35,clearcoat:.8})),LM(0,1.1,0,0,0,.35,1,1.25,1));
      add('acorn',lpSph(1.05,20,10,0,TAU,0,Math.PI/2),own(new T.MeshStandardMaterial({color:col('#6a4424'),roughness:.95,flatShading:true})),LM(-.28,1.75,0,0,0,.35,1,.6,1));
      add('acorn',lpCyl(.08,.12,.5,6),own(new T.MeshStandardMaterial({color:col('#4a2e1c'),roughness:.9})),LM(-.5,2.4,0,0,0,.35));collide('acorn',1.0);
      add('stump',lpCyl(1.1,1.5,1.5,12),own(new T.MeshStandardMaterial({color:col('#5a3e26'),roughness:.9,flatShading:true})),LM(0,.75,0));
      add('stump',lpCyl(1.1,1.1,.06,24),own(new T.MeshStandardMaterial({color:col('#c8a070'),roughness:.8})),LM(0,1.52,0));
      add('stump',lpCyl(.1,.14,.5,8),own(new T.MeshStandardMaterial({color:col('#efe2c4'),roughness:.8})),LM(.6,1.75,.2));add('stump',lpSph(.32,14,8,0,TAU,0,Math.PI/2),own(new T.MeshStandardMaterial({color:col('#e8843a'),roughness:.5})),LM(.6,1.98,.2,0,0,0,1,.6,1));collide('stump',1.3);break;
    case 'ruins':
      add('pillar',lpCyl(.85,.95,5,8),rock,LM(0,2.5,0,0,0,.04),(it)=>col('#6a6a62').lerp(col('#5a5c56'),it.tint));
      add('pillar',lpCyl(1.25,1.25,.5,8),rock,LM(0,.25,0),()=>col('#5a5a52'));
      add('pillar',lpSph(1,16,8,0,TAU,0,Math.PI*.45),own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,flatShading:true})),LM(0,4.9,0,0,0,0,.95,.5,.95));
      add('pillar',lpTor(.92,.05,6,24),glowB('#c8a0ff',2.2),LM(0,2.3,0,Math.PI/2,0,0));collide('pillar',1);
      add('rootarch',lpTor(2.6,.42,10,24,Math.PI),own(new T.MeshStandardMaterial({color:col('#4a3626'),roughness:.9,flatShading:true})),LM(0,0,0,0,0,0,1,1.15,1));
      add('rootarch',lpSph(.16,8,6),glowB('#d8c0ff',2.6),LM(.6,3.1,0));
      add('rock',REAL?RG(5.7,.8).scale(1.5,1.5,1.5):new T.DodecahedronGeometry(1.5,0),rock,LM(0,.7,0,0,0,0,1,.75,1),(it)=>col('#4a4a44').lerp(col('#5e5e56'),it.tint));collide('rock',1.3);break;
    case 'frost':
      add('pine',lpCyl(.22,.3,1.4,8),own(new T.MeshStandardMaterial({color:col('#6a4a34'),roughness:.9})),LM(0,.7,0));
      [[2.1,2.4,1.9],[1.65,2.1,3.0],[1.1,1.8,4.0]].forEach(([r,h,y])=>{add('pine',lpCone(r,h,9),own(new T.MeshStandardMaterial({color:col('#1f5a4a'),roughness:.8,flatShading:true})),LM(0,y,0));add('pine',lpCone(r*.62,h*.45,9),own(new T.MeshStandardMaterial({color:col('#f4f8ff'),roughness:.7,flatShading:true})),LM(0,y+h*.32,0));});collide('pine',1.2);
      add('crystal',new T.OctahedronGeometry(1,0),own(new T.MeshPhysicalMaterial({color:col('#c8fff0'),emissive:col('#3fd6a0'),emissiveIntensity:.45,roughness:.08,clearcoat:1,transparent:true,opacity:.85,flatShading:true})),LM(0,1.6,0,0,0,.15,1,2.4,1));collide('crystal',.9);
      add('snowrock',REAL?RG(8.2,.75).scale(1.5,1.5,1.5):new T.DodecahedronGeometry(1.5,1),rock,LM(0,.6,0,0,0,0,1,.7,1),()=>col('#dfe9f6'));collide('snowrock',1.3);break;
  }
}
function buildDetails(map,group,B){return;
  const R=mulberry32(map.seed^0x5f3759df);const list=[];
  for(let i=0;i<3200&&list.length<2600;i++){const x=(R()*2-1)*94,z=(R()*2-1)*(map.zWall+2);const d=map.laneDistAt(x,z);if(d<map.lw*.5+.6)continue;if(Math.hypot(Math.abs(x)-86,z)<14)continue;
    list.push({x,y:map.heightAt(x,z),z,s:.5+R()*.9,rot:R()*TAU,rx:(R()-.5)*.3,rz:(R()-.5)*.3,tint:R()});}
  const pal=B.detail.map(col);let gm;
  if(B.id==='frost')gm=own(new T.OctahedronGeometry(.18,0));else{gm=own(lpCone(.08,.85,4));gm.translate(0,.42,0);}
  const im=makeInstanced(gm,own(new T.MeshStandardMaterial({color:0xffffff,roughness:.8,flatShading:true})),list,null,(it)=>{const c=pal[Math.floor(it.tint*pal.length)%pal.length].clone();if(B.id==='glow'&&it.tint>.82)c.multiplyScalar(3.2);return c;});
  im.castShadow=false;group.add(im);
}
function buildBases(map,group){
  const stoneM=own(REAL?tpMat({tex:'rock',tint:'#8a887c',moss:.8,mossCol:'#5f7f2e',scale:.45,nStr:2,key:'base'}):new T.MeshStandardMaterial({color:col('#6e6e64'),roughness:.92,flatShading:true}));const mossM=own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,flatShading:true}));
  for(const team of ['blue','red']){const s=TEAMS[team].sign;const g=new T.Group();g.position.set(s*86,map.heightAt(s*86,0),0);
    if(!REAL){const disc=new T.Mesh(own(lpCyl(9.4,10,.4,40)),own(new T.MeshStandardMaterial({color:col('#5a5a50'),roughness:.9})));disc.position.y=.1;disc.receiveShadow=true;g.add(disc);
    const moss=new T.Mesh(own(new T.RingGeometry(3,9.2,40,2)),own(new T.MeshStandardMaterial({color:col('#4f7a3a'),roughness:.95,transparent:true,opacity:.55})));moss.rotation.x=-Math.PI/2;moss.position.y=.32;g.add(moss);}
    const glow=new T.Mesh(own(lpTor(9.5,.07,4,48)),own(new T.MeshBasicMaterial({color:col(TEAMS[team].hex).multiplyScalar(1.4),toneMapped:false})));glow.rotation.x=Math.PI/2;glow.position.y=.34;g.add(glow);
    for(let i=0;i<7;i++){const a=i/7*TAU+.2;const st=new T.Mesh(own(REAL?rockGeo(i*2.3+1,{w:32,h:24,cuts:6}):new T.DodecahedronGeometry(1,0)),stoneM);st.scale.set(.7,2.4+((i*37)%5)*.25,.55);st.position.set(Math.cos(a)*9.8,1.9,Math.sin(a)*9.8);st.rotation.y=-a;st.castShadow=true;g.add(st);
      if(!REAL){const cap=new T.Mesh(own(lpSph(.75,10,6,0,TAU,0,Math.PI/2)),mossM);cap.scale.set(.9,.4,.8);cap.position.set(st.position.x,st.position.y+st.scale.y*.82,st.position.z);g.add(cap);}
      const tip=new T.Mesh(sphereG(),glowMat(TEAMS[team].hex,2.6));tip.scale.setScalar(.26);tip.position.set(Math.cos(a)*9.8,st.position.y+st.scale.y+.75,Math.sin(a)*9.8);g.add(tip);}
    group.add(g);}
}
function buildNestView(n,B){
  const g=new T.Group();const s=n.main?1.85:1;const tc=TEAMS[n.team].hex;
  const pad=new T.Mesh(geo(REAL?'nestPadR':'nestPad',()=>REAL?rockGeo(4.4,{w:64,h:24,sy:.12,bump:.18,cuts:0,flat:-.02,fine:.04}).scale(3.2,1,3.2):lpCyl(3,3.4,.35,40)),REAL?matc('nestStone',()=>tpMat({tex:'rock',tint:'#a49e90',moss:.7,mossLo:1.0,mossHi:1.4,mossCol:'#5f7f2e',scale:.5,nStr:2,key:'nest'})):pmat('#5a5c50',{roughness:.9}));const pmoss=new T.Mesh(geo('nestMoss',()=>lpCyl(2.7,2.9,.08,40)),pmat('#4f7a3a',{roughness:.95}));pmoss.position.y=.3;if(!REAL)g.add(pmoss);pad.position.y=.1;pad.receiveShadow=true;g.add(pad);
  const ringMat=own(new T.MeshBasicMaterial({color:col(tc).multiplyScalar(4),toneMapped:false}));
  const ring=new T.Mesh(geo('nestRing',()=>lpTor(3.15,.09,8,64)),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.3;g.add(ring);
  const twig=REAL?matc('twigR'+B.twig,()=>tpMat({tex:'bark',tint:B.twig,scale:1.6,nStr:2,key:'twig'})):pmat(B.twig,{roughness:.85,clearcoat:.1});const twig2=REAL?matc('twigR2',()=>tpMat({tex:'bark',tint:'#a07a50',scale:1.6,nStr:2,key:'twig'})):pmat('#a07a50',{roughness:.85,clearcoat:.1});
  const bowl=new T.Group();g.add(bowl);
  for(let i=0;i<9;i++){const t=new T.Mesh(geo('twigRing',()=>lpTor(1,.17,6,26)),i%2?twig:twig2);const y=.45+i*.11;const r=1.35+i*.09;t.scale.set(r,r,1+i*.05);t.position.y=y;t.rotation.set(Math.PI/2+(Math.random()-.5)*.3,(Math.random()-.5)*.3,Math.random()*TAU);t.castShadow=true;bowl.add(t);}
  for(let i=0;i<10;i++){const a=i/10*TAU+Math.random()*.4;const st=new T.Mesh(cylG(.05,.07,1.6,5),twig2);st.position.set(Math.cos(a)*2,1.2,Math.sin(a)*2);st.rotation.set(Math.sin(a)*.9,0,-Math.cos(a)*.9);bowl.add(st);}
  const eggMat=own(new T.MeshPhysicalMaterial({color:col(tc).lerp(new T.Color(1,1,1),.45),emissive:col(tc),emissiveIntensity:.9,roughness:.25,clearcoat:1,sheen:1,sheenColor:new T.Color(1,1,1)}));
  const eggs=[];for(let i=0;i<3;i++){const a=i/3*TAU;const e=new T.Mesh(sphereG(),eggMat);e.scale.set(.55,.75,.55);e.position.set(Math.cos(a)*.55,1.35,Math.sin(a)*.55);e.rotation.z=Math.cos(a)*.25;e.castShadow=true;bowl.add(e);eggs.push(e);}
  let crystal=null;
  if(n.main){const bark=REAL?matc('heartBark',()=>tpMat({tex:'bark',tint:'#6a4a32',moss:.6,mossLo:-.1,scale:1,nStr:2,key:'hbark'})):pmat('#4a3322',{roughness:.9,flatShading:true});const tr=new T.Mesh(geo('heartTrunk',()=>lpCyl(.22,.5,4.6,8)),bark);tr.position.y=2.6;tr.castShadow=true;g.add(tr);
    if(REAL){const lc=matc('heartLeafR'+n.team,()=>{const m=nearFade(windify(cardMat(RTEX.leaf,{trans:.3}),.015,4),3,6);m.color=col(tc).lerp(col('#4f8a3a'),.55).multiplyScalar(1.3);m.emissive=col(tc).multiplyScalar(.12);return m;});
      const cl=new T.Mesh(geo('heartCanopyR',()=>leafCloud([[0,5.5,0,1.7,.8,.75],[1,5,.4,1.2,.8,.7],[-.95,5.1,-.3,1.25,.8,.7],[.2,6.3,-.2,1.1,.85,.7]],200,51)),lc);cl.castShadow=true;cl.customDepthMaterial=cardDepth(RTEX.leaf);g.add(cl);}
    else for(const [x,y,z,r] of [[0,5.5,0,1.5],[.9,5,.4,1.05],[-.85,5.1,-.3,1.1],[.2,6.2,-.2,1]]){const c=new T.Mesh(geo('heartLeaf'+r,()=>new T.IcosahedronGeometry(r,1)),own(new T.MeshStandardMaterial({color:col(tc).lerp(col('#3f6a34'),.62),emissive:col(tc),emissiveIntensity:.18,roughness:.8,flatShading:true})));c.position.set(x,y,z);c.castShadow=true;g.add(c);}
    crystal=new T.Mesh(geo('heartSeed',()=>new T.IcosahedronGeometry(.62,2)),own(new T.MeshStandardMaterial({color:col(tc),emissive:col(tc),emissiveIntensity:2.6,roughness:.25})));crystal.scale.set(1,1.3,1);crystal.position.y=3.6;g.add(crystal);
    const halo=new T.Mesh(geo('halo',()=>lpTor(1.4,.05,6,48)),ringMat);halo.position.y=3.6;halo.rotation.x=Math.PI/2.3;g.add(halo);n.halo=halo;}
  g.scale.setScalar(s);
  return {group:g,bowl,eggs,crystal,ringMat,eggMat,hitT:0,dead:false,deadT:0,pulse:0,s};
}
function buildBoulderView(B){const g=new T.Group();const k=B.boulder||B.id;let m;
  const spec={mossball:['#4f7a3a',{roughness:.95}],stone:['#5e5e58',{roughness:.9}],acorn:['#a0703a',{roughness:.4,clearcoat:.7}],snowball:['#f4f8ff',{roughness:.6}]}[k]||['#777777',{}];
  m=own(new T.MeshPhysicalMaterial(Object.assign({color:col(spec[0]),flatShading:k==='stone'||k==='mossball'},spec[1])));
  const ball=new T.Mesh(geo('boulderG'+k,()=>{const gg=new T.IcosahedronGeometry(2.2,k==='acorn'||k==='snowball'?4:1);if(k!=='acorn'){const p=gg.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);const s=1+(hash2(Math.round(v.x*10),Math.round(v.z*10+v.y*7))-.5)*.18;p.setXYZ(i,v.x*s,v.y*s,v.z*s);}gg.computeVertexNormals();}return gg;}),m);
  ball.castShadow=true;g.add(ball);if(k==='acorn'){const cap=new T.Mesh(geo('boulderCap',()=>lpSph(2.3,20,10,0,TAU,0,Math.PI/2)),own(new T.MeshStandardMaterial({color:col('#6a4424'),roughness:.95,flatShading:true})));cap.scale.y=.6;cap.position.y=.9;ball.add(cap);}g.userData.ball=ball;return g;}
function buildGeyserView(B){
  const g=new T.Group();
  const base=new T.Mesh(geo('geyBase',()=>lpCyl(.9,1.7,.7,10,1,true)),pmat('#4a4038',{roughness:.9,flatShading:true,side:T.DoubleSide}));base.position.y=.25;base.castShadow=true;g.add(base);
  for(let i=0;i<6;i++){const a=i/6*TAU;const pb=new T.Mesh(sphereG(),pmat('#efe2c4',{roughness:.7,sheen:.6,sheenColor:col('#ffffff')}));const r=.32+((i*7)%3)*.1;pb.scale.set(r,r*.8,r);pb.position.set(Math.cos(a)*1.55,r*.6,Math.sin(a)*1.55);pb.castShadow=true;g.add(pb);}
  const disc=new T.Mesh(geo('geyDisc',()=>lpCirc(.9,20)),own(new T.MeshBasicMaterial({color:col(B.geyser).multiplyScalar(2),toneMapped:false})));disc.rotation.x=-Math.PI/2;disc.position.y=.45;g.add(disc);g.userData.disc=disc;
  return g;
}
const CRITTER=D('Snorflet','#9a9a90','#6fae4a','hood',[.6,.55,.6],[P('shortLegs',.45,-.86,.3,{s:.45}),P('shortLegs',.45,-.86,-.3,{s:.45}),P('beadEye',.24,.05,.96,{s:.75})]);
const BOSS=D('The Grand Gobbler','#6a6a64','#4f7a3a','spots',[2.3,1.9,2.6],[P('shortLegs',.6,-.62,.55,{s:1.9}),P('shortLegs',.6,-.62,0,{s:1.9}),P('shortLegs',.6,-.62,-.55,{s:1.9}),P('horns',.35,.75,.5,{s:1.8}),P('basicJaw',0,-.2,.98,{s:2.2}),P('spikes',0,.98,-.2,{s:1.8}),P('spikes',0,.85,-.55,{s:1.6}),P('beadEye',.36,.42,.82,{s:1.6}),P('googlyEye',0,.6,.8,{s:1.5,m:false}),P('crownMini',0,1,.1,{s:2})]);
function spawnNeutral(type,x,z,B){
  const boss=type==='boss';const d=clone(boss?BOSS:CRITTER);if(!boss){d.color=pick(['#9a9a90','#8a8a80','#7f98a0','#c8a878','#d8c070']);d.accent=pick(['#6fae4a','#5f8a3c','#a8d0e8','#b49ae0']);d.seed=Math.floor(Math.random()*9999);}
  const n={kind:'neutral',type,name:d.name,d,x,z,y:world.map.heightAt(x,z),hx:x,hz:z,vx:0,vz:0,vy:0,yaw:Math.random()*TAU,radius:boss?2.6:.6,maxHp:boss?900:60,alive:true,respawnT:0,wanderT:0,tx:x,tz:z,slamCd:2,slamT:0,lastHurt:-99,team:'neutral',state:'alive',kx:0,kz:0,grounded:true,flee:0};
  n.hp=n.maxHp;n.view=buildCreatureView(d,{});n.height=n.view.height;n.view.root.position.set(x,n.y,z);world.group.add(n.view.root);
  n.tag=makeTag('tag3d neutral','<div class="tn">'+esc(n.name)+'</div><div class="tb"><i></i></div>');
  world.neutrals.push(n);return n;
}


/* =========================================================
   Low-poly garden dressing (Animal Crossing / Pikmin inspired): chunky two-tone trees, crystal grass that sways,
   little flowers, round bushes and pebbles. Everything is instanced, so the whole arena is a handful of draw calls.
   ========================================================= */
// screen-door fade for anything close to the camera, so foliage never hides your spirit
function nearFade(m,n0,n1){const prev=m.onBeforeCompile;m.onBeforeCompile=(sh,r)=>{if(prev)prev(sh,r);
  sh.fragmentShader=sh.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n{float fa=smoothstep('+n0.toFixed(1)+','+n1.toFixed(1)+',length(vViewPosition));if(fa<.999){float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(ign>fa)discard;}}');};
  const ck=m.customProgramCacheKey?m.customProgramCacheKey():'';m.customProgramCacheKey=()=>ck+'fade'+n0+'_'+n1;return m;}
// per-face two-tone shading baked into vertex colours: sunlit tops, cool shaded undersides (the Hob / AC canopy look)
function faceTone(g,lo,hi,o){g=g.index?g.toNonIndexed():g;g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal;const c=new Float32Array(p.count*3);o=o||{};const R=mulberry32(o.seed||7);
  for(let i=0;i<p.count;i+=3){const ny=(n.getY(i)+n.getY(i+1)+n.getY(i+2))/3;const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;let k=lerp(lo,hi,smooth(-.55,.85,ny))*(.94+R()*.12);
    if(o.yGrad)k*=lerp(o.yGrad[0],1,smooth(o.yGrad[1],o.yGrad[2],y));for(let j=0;j<3;j++){c[(i+j)*3]=k;c[(i+j)*3+1]=k;c[(i+j)*3+2]=k;}}
  g.setAttribute('color',new T.BufferAttribute(c,3));return g;}
function blob(r,x,y,z,sy,seed){const g=new T.IcosahedronGeometry(r,1);const p=g.attributes.position;const R=mulberry32(seed);
  for(let i=0;i<p.count;i++){const k=1+(hash2(Math.round(p.getX(i)*9+seed),Math.round(p.getY(i)*9+p.getZ(i)*7))-.5)*.16;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*(sy||.82),p.getZ(i)*k);}
  g.translate(x,y,z);return g;}
const TREE_GEO={};
function treeGeos(kind){if(TREE_GEO[kind])return TREE_GEO[kind];let trunk,canopy;
  const roots=[];for(let i=0;i<4;i++){const a=i/4*TAU+.4;const r=lpCone(.26,1.2,4);r.rotateZ(Math.PI/2+.5);r.rotateY(-a);r.translate(Math.cos(a)*.42,.22,Math.sin(a)*.42);roots.push(r);}
  if(kind==='pine'){const t=lpCyl(.22,.42,2.2,6);t.translate(0,1.1,0);trunk=faceTone(mergeGeos([t,...roots].map(g=>g.toNonIndexed())),.55,1,{yGrad:[.6,0,1.5]});
    const layers=[];[[2.3,2.4,2.2],[1.8,2.2,3.5],[1.25,2,4.7],[.7,1.5,5.8]].forEach(([r,h,y],i)=>{const c=lpCone(r,h,7);const pp=c.attributes.position;for(let k=0;k<pp.count;k++){if(pp.getY(k)<-h*.4){const a=Math.atan2(pp.getZ(k),pp.getX(k));pp.setY(k,pp.getY(k)+Math.sin(a*3+i)*.12);}}c.translate(0,y,0);layers.push(c.toNonIndexed());});
    canopy=faceTone(mergeGeos(layers),.5,1.18,{seed:3});}
  else{const tall=kind==='tall';const h=tall?4.2:3.1;
    const t=lpCyl(.28,.5,h,6);t.translate(0,h/2,0);const br=lpCyl(.08,.16,1.6,4);br.rotateZ(-.8);br.translate(.55,h*.72,0);const br2=lpCyl(.07,.14,1.3,4);br2.rotateZ(.85);br2.translate(-.45,h*.6,.1);
    trunk=faceTone(mergeGeos([t,br,br2,...roots].map(g=>g.toNonIndexed())),.55,1,{yGrad:[.6,0,1.5]});
    const B=tall?[[0,h+1.7,0,1.5,.95],[.2,h+.5,.3,1.45,.9],[-.1,h+2.9,-.1,1.05,1],[.9,h+1.2,-.5,1,.9],[-.8,h+1,.4,1.05,.9]]
               :[[0,h+1.1,0,2,.8],[1.25,h+.6,.5,1.35,.8],[-1.15,h+.7,-.45,1.4,.8],[.25,h+2.1,-.15,1.3,.85],[-.35,h+.35,1.1,1.15,.8],[.4,h+.4,-1.2,1.1,.8]];
    canopy=faceTone(mergeGeos(B.map(([x,y,z,r,sy],i)=>blob(r,x,y,z,sy,i*17+(tall?5:1)).toNonIndexed())),.52,1.2,{seed:tall?9:4});}
  return TREE_GEO[kind]={trunk,canopy};}
function buildTrees(map,group,B){
  const list=map.trees||[];if(!list.length)return;
  for(const t of list){t.y=map.heightAt(t.x,t.z)-.15;world.colliders.push({x:t.x,z:t.z,r:.75*t.s});}
  const trunkM=own(nearFade(new T.MeshStandardMaterial(lpMatOpts({vertexColors:true,roughness:.95})),3,6.5));
  const canM=own(nearFade(windify(new T.MeshStandardMaterial(lpMatOpts({vertexColors:true,roughness:.9})),.016,2.5),4,8.5));
  const tc=col(B.trunk),c1=col(B.canopy),c2=col(B.canopy2||B.canopy);
  const byKind={};for(const t of list)(byKind[t.kind]=byKind[t.kind]||[]).push(t);
  for(const kind in byKind){const L=byKind[kind];const G=treeGeos(kind);
    group.add(makeInstanced(G.trunk,trunkM,L,null,(it)=>tc.clone().multiplyScalar(.85+it.tint*.3)));
    const cm=makeInstanced(G.canopy,canM,L,null,(it)=>c1.clone().lerp(c2,it.tint>.72?.75:it.tint*.25).multiplyScalar(.9+it.tint*.2));group.add(cm);}
  // glowing fruit / blossoms tucked under the canopies (Glimmerwood orbs, Lotus blossoms, Ruins wisps)
  if(B.fruit){const fl=[];const R=mulberry32(map.seed^0xf00d);for(const t of list){if(t.kind==='pine')continue;const n=2+Math.floor(R()*3);for(let i=0;i<n;i++){const a=R()*TAU,r=(.9+R()*1.1)*t.s;fl.push({x:t.x+Math.cos(a)*r,y:t.y+(t.kind==='tall'?4.4:3.4)*t.s+R()*.6,z:t.z+Math.sin(a)*r,s:.16+R()*.1,rot:0});}}
    const glow=B.id==='glow'||B.id==='ruins';const fm=own(glow?new T.MeshBasicMaterial({color:col(B.fruit).multiplyScalar(2.2),toneMapped:false}):new T.MeshStandardMaterial(lpMatOpts({color:col(B.fruit)})));
    const fi=makeInstanced(own(new T.IcosahedronGeometry(1,0)),fm,fl);fi.castShadow=false;group.add(fi);}
}
const GARDEN_GEO={};
function tuftGeo(tall){const k='tuft'+(tall?1:0);if(GARDEN_GEO[k])return GARDEN_GEO[k];const R=mulberry32(tall?33:21);const parts=[];const n=tall?7:5;
  for(let i=0;i<n;i++){const h=(tall?.9:.45)+R()*(tall?.7:.4);const b=lpCone(.06+R()*.03,h,3);b.translate(0,h/2,0);b.rotateZ((R()-.5)*.5);b.rotateX((R()-.5)*.5);b.rotateY(R()*TAU);
    const a=i/n*TAU+R();b.translate(Math.cos(a)*.13,0,Math.sin(a)*.13);parts.push(b.toNonIndexed());}
  const g=mergeGeos(parts);const p=g.attributes.position;const c=new Float32Array(p.count*3);let ym=0;for(let i=0;i<p.count;i++)ym=Math.max(ym,p.getY(i));
  for(let i=0;i<p.count;i++){const t=clamp(p.getY(i)/ym,0,1);const v=lerp(.45,1.18,Math.pow(t,.8));c[i*3]=v;c[i*3+1]=v;c[i*3+2]=v;}g.setAttribute('color',new T.BufferAttribute(c,3));g.computeVertexNormals();return GARDEN_GEO[k]=g;}
function buildGarden(map,group,B){
  const R=mulberry32(map.seed^0x5f3759df);const hw=map.lw*.5;const nearBase=(x,z,r)=>Math.hypot(Math.abs(x)-86,z)<r;
  const blocked=(x,z,r)=>(map.trees||[]).some(t=>dist2(t.x,t.z,x,z)<r*r*.5)||map.nests.some(n=>dist2(n.x,n.z,x,z)<(n.main?36:12));
  // grass tufts: thick along the path edges and in the meadows, thinner under trees
  const shortL=[],tallL=[];
  for(let i=0;i<9000&&shortL.length<3200;i++){const x=(R()*2-1)*94,z=(R()*2-1)*(map.zWall+3);const d=map.laneDistAt(x,z);
    if(d<hw+.25)continue;if(nearBase(x,z,13.5))continue;if(map.nests.some(n=>dist2(n.x,n.z,x,z)<(n.main?30:10)))continue;
    const edge=d<hw+2.2;if(!edge&&R()<.45)continue;const it={x,y:map.heightAt(x,z)-.03,z,s:.75+R()*.6,rot:R()*TAU,tint:R()};
    if(!edge&&d>hw+3&&R()<.16)tallL.push(it);else shortL.push(it);}
  const gp=(B.grass||B.detail).map(col);
  const grassM=own(windify(new T.MeshStandardMaterial(lpMatOpts({vertexColors:true,roughness:.8})),B.id==='frost'?.03:.12,0));
  const gcol=(it)=>gp[Math.floor(it.tint*gp.length)%gp.length].clone().multiplyScalar(.92+it.tint*.16);
  for(const [L,tall] of [[shortL,false],[tallL,true]]){if(!L.length)continue;const im=makeInstanced(tuftGeo(tall),grassM,L,null,gcol);im.castShadow=false;group.add(im);}
  // flowers: a stem and a five-petal head, in little clusters
  const fl=[];for(let i=0;i<1400&&fl.length<520;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall+1);const d=map.laneDistAt(x,z);if(d<hw+.7||nearBase(x,z,14)||blocked(x,z,2))continue;
    const n=1+Math.floor(R()*3);const c=Math.floor(R()*99);for(let k=0;k<n;k++){const xx=x+(R()-.5)*1.2,zz=z+(R()-.5)*1.2;fl.push({x:xx,y:map.heightAt(xx,zz)-.02,z:zz,s:.8+R()*.6,rot:R()*TAU,tint:R(),c});}}
  if(fl.length){const fc=(B.flowers||['#ffffff']).map(col);
    const stem=own(lpCyl(.02,.03,.55,3));stem.translate(0,.27,0);
    const petals=[];for(let i=0;i<5;i++){const a=i/5*TAU;const pt=new T.IcosahedronGeometry(.075,0);pt.scale(1.2,.45,1);pt.translate(Math.cos(a)*.08,.56,Math.sin(a)*.08);petals.push(pt.toNonIndexed());}const head=own(mergeGeos(petals));head.computeVertexNormals();
    const ctr=own(new T.IcosahedronGeometry(.05,0));ctr.translate(0,.58,0);
    const fwm=(c)=>own(windify(new T.MeshStandardMaterial(lpMatOpts(c?{color:col(c)}:{})),.1,0));
    const a=makeInstanced(stem,fwm('#4f8a34'),fl);a.castShadow=false;group.add(a);
    const b=makeInstanced(head,fwm(null),fl,null,(it)=>fc[it.c%fc.length].clone());b.castShadow=false;group.add(b);
    const c=makeInstanced(ctr,fwm('#ffd24a'),fl);c.castShadow=false;group.add(c);}
  // round bushes along the edges of the meadows
  const bl=[];for(let i=0;i<600&&bl.length<64;i++){const x=-(3+R()*88),z=(R()*2-1)*(map.Lz+10);const d=map.laneDistAt(x,z);if(d<hw+1.6||nearBase(x,z,16)||blocked(x,z,3.5)||map.props.some(p=>dist2(p.x,p.z,x,z)<7)||map.geysers.some(g=>dist2(g.x,g.z,x,z)<16)||map.spawns.some(g=>dist2(g.x,g.z,x,z)<9))continue;
    if(bl.some(b=>dist2(b.x,b.z,x,z)<9))continue;const it={x,y:map.heightAt(x,z)-.2,z,s:.7+R()*.6,rot:R()*TAU,tint:R()};bl.push(it,{x:-x,y:it.y,z,s:it.s,rot:-it.rot,tint:it.tint});}
  if(bl.length){const bg=own(faceTone(mergeGeos([blob(.9,0,.55,0,.8,2),blob(.7,.75,.4,.2,.8,7),blob(.65,-.7,.38,-.15,.8,11),blob(.55,.1,.95,-.3,.85,13)].map(g=>g.toNonIndexed())),.55,1.18,{seed:5}));
    const bm=own(nearFade(windify(new T.MeshStandardMaterial(lpMatOpts({vertexColors:true})),.025,.3),2,4.5));const c1=col(B.canopy2||B.canopy),c2=col(B.canopy);
    group.add(makeInstanced(bg,bm,bl,null,(it)=>c1.clone().lerp(c2,it.tint*.6).multiplyScalar(1.05)));}
  // pebbles sprinkled along the path edges
  const pl=[];for(let i=0;i<3000&&pl.length<420;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall);const d=map.laneDistAt(x,z);if(d<hw-.4||d>hw+2.6||nearBase(x,z,13))continue;pl.push({x,y:map.heightAt(x,z)-.04,z,s:.35+R()*.8,sy:.55,rot:R()*TAU,rx:(R()-.5)*.3,tint:R()});}
  if(pl.length){const sc=col(B.stone||'#9a9c90');const im=makeInstanced(own(new T.DodecahedronGeometry(.32,0)),own(new T.MeshStandardMaterial(lpMatOpts({}))),pl,null,(it)=>sc.clone().multiplyScalar(.82+it.tint*.3));im.castShadow=false;group.add(im);}
}

/* =========================================================
   Remaster dressing: flagstone paths, mossy boulders, bark + leaf-card trees, grass clumps, ferns and leafy bushes
   ========================================================= */
const REAL_GEO={};
function flagGeo(k){return REAL_GEO['flag'+k]||(REAL_GEO['flag'+k]=(()=>{const g=rockGeo(k*3.7+.5,{w:28,h:16,bump:.55,cuts:7,sy:.16,flat:-.05,fine:.03});return g;})());}
function buildFlagstones(map,group,B){
  const R=mulberry32(map.seed^0xf1a6);const L=[[],[],[]];const hw=map.lw*.5;const stone=col(B.stone||'#9a9c90');
  for(const lane of map.lanes){for(let x=-84;x<=84;x+=1.05){const z0=map.laneZ(lane.k,x);
      for(let s=-hw+.6;s<=hw-.6;s+=1.15){if(R()<.18)continue;const xx=x+(R()-.5)*.45,zz=z0+s+(R()-.5)*.4;if(Math.hypot(Math.abs(xx)-86,zz)<12.8)continue;
        if(map.nests.some(n=>dist2(n.x,n.z,xx,zz)<(n.main?22:9)))continue;const edge=Math.abs(s)/hw;if(R()<edge*.55)continue;
        L[Math.floor(R()*3)].push({x:xx,y:map.heightAt(xx,zz)-.02,z:zz,s:.5+R()*.22,sy:1,rot:R()*TAU,tint:R()});}}}
  for(const sx of [-1,1]){for(let r=1.2;r<12;r+=1.1){const n=Math.max(4,Math.floor(TAU*r/1.15));for(let i=0;i<n;i++){if(R()<.12)continue;const a=i/n*TAU+R()*.2+r;const xx=sx*86+Math.cos(a)*r,zz=Math.sin(a)*r;
      L[Math.floor(R()*3)].push({x:xx,y:map.heightAt(xx,zz)-.02,z:zz,s:.5+R()*.2,sy:1,rot:R()*TAU,tint:R()});}}}
  const m=own(tpMat({tex:'rock',moss:.7,mossLo:1.08,mossHi:1.45,mossCol:(B.grass||B.detail)[0],scale:.55,nStr:1.8,rough:.8,key:'flag'}));
  L.forEach((list,k)=>{if(!list.length)return;const im=makeInstanced(flagGeo(k),m,list,null,(it)=>stone.clone().multiplyScalar(.8+it.tint*.35));im.castShadow=false;group.add(im);});
}
function buildBoulders(map,group,B){
  const R=mulberry32(map.seed^0xb0b0);const hw=map.lw*.5;const L=[[],[],[]];
  for(let i=0;i<500&&L[0].length+L[1].length+L[2].length<44;i++){const x=-(4+R()*86),z=(R()*2-1)*(map.Lz+10);const big=R()<.35;const s=big?1.1+R()*1.1:.35+R()*.45;
    if(map.laneDistAt(x,z)<hw+(big?3:1.2))continue;if(Math.hypot(x+86,z)<16)continue;if(map.nests.some(n=>dist2(n.x,n.z,x,z)<64))continue;if(dist2(x,z,map.boss.x,map.boss.z)<120)continue;
    if((map.trees||[]).some(t=>dist2(t.x,t.z,x,z)<9))continue;if(map.props.some(p=>dist2(p.x,p.z,x,z)<9))continue;if(map.geysers.some(g=>dist2(g.x,g.z,x,z)<20)||map.spawns.some(g=>dist2(g.x,g.z,x,z)<16))continue;
    const k=Math.floor(R()*3);const it={x,y:map.heightAt(x,z)-s*.25,z,s,sy:.85,rot:R()*TAU,tint:R()};L[k].push(it,{x:-x,y:it.y,z,s,sy:.85,rot:-it.rot,tint:it.tint});
    if(big){world.colliders.push({x,z,r:s*.9},{x:-x,z,r:s*.9});}}
  const m=own(tpMat({tex:'rock',moss:B.id==='frost'?.95:.85,mossCol:B.id==='frost'?'#f4f8ff':(B.grass||B.detail)[0],mossLo:.2,scale:.38,nStr:2.2,key:'boulder'}));const sc=col(B.stone||'#9a9c90');
  L.forEach((list,k)=>{if(!list.length)return;if(!REAL_GEO['bould'+k])REAL_GEO['bould'+k]=rockGeo(k*5.1+2,{w:56,h:40});group.add(makeInstanced(REAL_GEO['bould'+k],m,list,null,(it)=>sc.clone().multiplyScalar(.75+it.tint*.35)));});
}
function realTreeGeos(kind){const key='rtree'+kind;if(REAL_GEO[key])return REAL_GEO[key];
  const pine=kind==='pine',tall=kind==='tall';const h=pine?2.6:tall?4.4:3.4;
  // trunk with flared roots, gently leaning, lumpy bark
  const t=new T.CylinderGeometry(pine?.2:.3,pine?.42:.58,h,18,10,true);t.translate(0,h/2,0);const p=t.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i),z=p.getZ(i);const a=Math.atan2(z,x);const flare=1+Math.pow(Math.max(0,1-y/1.1),2)*(1.1+.5*Math.sin(a*4))+(fbm3(x*2,y*1.4,z*2,3,4)-.5)*.35;
    p.setXYZ(i,x*flare+Math.sin(y*.6)*.12,y,z*flare);}
  t.computeVertexNormals();const parts=[t];
  if(!pine){for(const [rz,ry,l,y0] of [[-.85,0,1.9,h*.78],[.9,2.2,1.6,h*.68],[-.7,4.1,1.4,h*.86]]){const b=new T.CylinderGeometry(.07,.17,l,8,1,true);b.translate(0,l/2,0);b.rotateZ(rz);b.rotateY(ry);b.translate(0,y0,0);parts.push(b);}}
  const trunk=mergeGeos(parts.map(g=>g.toNonIndexed()));
  const blobs=pine?[[0,h+.6,0,2.1,.45,1.2],[0,h+1.8,0,1.65,.45,1.1],[0,h+2.9,0,1.2,.5,1],[0,h+3.9,0,.75,.6,.9]]
    :tall?[[0,h+1.8,0,1.7,.9],[.6,h+.5,.4,1.5,.8],[-.2,h+3.1,-.1,1.25,.9],[1.1,h+1.3,-.6,1.2,.8],[-1,h+1.1,.5,1.25,.8]]
    :[[0,h+1.2,0,2.2,.75],[1.4,h+.6,.6,1.55,.75],[-1.3,h+.7,-.5,1.6,.75],[.3,h+2.1,-.2,1.5,.8],[-.4,h+.3,1.3,1.35,.75],[.5,h+.4,-1.4,1.3,.75]];
  const canopy=leafCloud(blobs,pine?260:tall?300:340,kind.length*7+3);
  return REAL_GEO[key]={trunk,canopy};}
function cardInstanced(geom,mat,depth,list,colors,shadow){const im=makeInstanced(geom,mat,list,null,colors);im.castShadow=!!shadow;if(depth)im.customDepthMaterial=depth;return im;}
function buildTreesReal(map,group,B){
  const list=map.trees||[];if(!list.length)return;
  for(const t of list){t.y=map.heightAt(t.x,t.z)-.1;world.colliders.push({x:t.x,z:t.z,r:.75*t.s});}
  const bark=own(nearFade(tpMat({tex:'bark',tint:B.trunk,moss:.7,mossLo:-.2,mossHi:.6,mossCol:(B.grass||B.detail)[0],scale:.7,nStr:2,key:'bark'}),3,6.5));
  const leafM=own(nearFade(windify(cardMat(RTEX.leaf,{trans:.26}),.02,2.5),4,8.5));const leafD=cardDepth(RTEX.leaf);
  const c1=col(B.canopy),c2=col(B.canopy2||B.canopy);const byKind={};for(const t of list)(byKind[t.kind]=byKind[t.kind]||[]).push(t);
  for(const kind in byKind){const L=byKind[kind];const G=realTreeGeos(kind);
    group.add(makeInstanced(G.trunk,bark,L,null,(it)=>new T.Color(1,1,1).multiplyScalar(.85+it.tint*.3)));
    group.add(cardInstanced(G.canopy,leafM,leafD,L,(it)=>c1.clone().lerp(c2,it.tint>.72?.75:it.tint*.25).multiplyScalar(1.1+it.tint*.25),true));}
  if(B.fruit){const fl=[];const R=mulberry32(map.seed^0xf00d);for(const t of list){if(t.kind==='pine')continue;const n=2+Math.floor(R()*3);for(let i=0;i<n;i++){const a=R()*TAU,r=(1+R()*1.1)*t.s;fl.push({x:t.x+Math.cos(a)*r,y:t.y+(t.kind==='tall'?4.6:3.6)*t.s+R()*.6,z:t.z+Math.sin(a)*r,s:.12+R()*.08,rot:0});}}
    const glow=B.id==='glow'||B.id==='ruins';const fm=own(glow?new T.MeshBasicMaterial({color:col(B.fruit).multiplyScalar(3),toneMapped:false}):new T.MeshStandardMaterial({color:col(B.fruit),roughness:.5}));
    const fi=makeInstanced(own(new T.SphereGeometry(1,12,8)),fm,fl);fi.castShadow=false;group.add(fi);}
}
function buildGardenReal(map,group,B){
  buildTextures();const R=mulberry32(map.seed^0x5f3759df);const hw=map.lw*.5;const nearBase=(x,z,r)=>Math.hypot(Math.abs(x)-86,z)<r;
  const treeNear=(x,z,r)=>(map.trees||[]).some(t=>dist2(t.x,t.z,x,z)<r*r);
  // grass clumps: dense along the path edges and meadows
  const gl=[];for(let i=0;i<40000&&gl.length<14000;i++){const x=(R()*2-1)*94,z=(R()*2-1)*(map.zWall+3);const d=map.laneDistAt(x,z);
    if(d<hw-.3)continue;if(nearBase(x,z,13))continue;if(map.nests.some(n=>dist2(n.x,n.z,x,z)<(n.main?30:10)))continue;const edge=d<hw+2.5;if(!edge&&R()<.35)continue;
    gl.push({x,y:map.heightAt(x,z)-.05,z,s:(edge?.45:.55)+R()*.4,sy:.75+R()*.45,rot:R()*TAU,tint:R()});}
  const gp=(B.grass||B.detail).map(col);const gm=own(windify(cardMat(RTEX.grassCard,{alphaTest:.42,trans:.3,rough:.85}),.12,0));
  group.add(cardInstanced(grassClumpGeo(1.1,.9),gm,null,gl,(it)=>gp[Math.floor(it.tint*gp.length)%gp.length].clone().multiplyScalar(1.15+it.tint*.3),false));
  // ferns in the shade near trees and boulders
  const fl=[];for(let i=0;i<4000&&fl.length<420;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall+1);const d=map.laneDistAt(x,z);if(d<hw+1.2||nearBase(x,z,15))continue;if(!treeNear(x,z,5)&&R()<.8)continue;
    fl.push({x,y:map.heightAt(x,z)-.05,z,s:.7+R()*.6,rot:R()*TAU,tint:R()});}
  if(fl.length){const fm=own(windify(cardMat(RTEX.fern,{alphaTest:.45,trans:.3}),.08,0));const fc=col(B.canopy).lerp(gp[0],.5);
    group.add(cardInstanced(fernGeo(7),fm,null,fl,(it)=>fc.clone().multiplyScalar(1.2+it.tint*.3),false));}
  // flowers (kept from the garden set, smooth)
  const fw=[];for(let i=0;i<1400&&fw.length<380;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall+1);const d=map.laneDistAt(x,z);if(d<hw+.9||nearBase(x,z,14)||treeNear(x,z,1.5))continue;
    const n=1+Math.floor(R()*3);const c=Math.floor(R()*99);for(let k=0;k<n;k++){const xx=x+(R()-.5)*1.1,zz=z+(R()-.5)*1.1;fw.push({x:xx,y:map.heightAt(xx,zz)-.02,z:zz,s:.7+R()*.5,rot:R()*TAU,tint:R(),c});}}
  if(fw.length){const fc=(B.flowers||['#ffffff']).map(col);const stem=own(new T.CylinderGeometry(.015,.022,.5,5));stem.translate(0,.25,0);
    const petals=[];for(let i=0;i<5;i++){const a=i/5*TAU;const pt=new T.SphereGeometry(.07,10,6);pt.scale(1.3,.3,.8);pt.translate(Math.cos(a)*.08,.51,Math.sin(a)*.08);petals.push(pt.toNonIndexed());}const head=own(mergeGeos(petals));head.computeVertexNormals();
    const ctr=own(new T.SphereGeometry(.04,10,6));ctr.translate(0,.53,0);const wm=c=>own(windify(new T.MeshStandardMaterial({color:c?col(c):0xffffff,roughness:.6}),.1,0));
    for(const [g,m,cf] of [[stem,wm('#4f7a34'),null],[head,wm(null),(it)=>fc[it.c%fc.length].clone()],[ctr,wm('#ffd24a'),null]]){const im=makeInstanced(g,m,fw,null,cf);im.castShadow=false;group.add(im);}}
  // leafy bushes
  const bl=[];for(let i=0;i<600&&bl.length<70;i++){const x=-(3+R()*88),z=(R()*2-1)*(map.Lz+10);const d=map.laneDistAt(x,z);if(d<hw+1.8||nearBase(x,z,16)||treeNear(x,z,3)||map.props.some(p=>dist2(p.x,p.z,x,z)<7)||map.geysers.some(g=>dist2(g.x,g.z,x,z)<16)||map.spawns.some(g=>dist2(g.x,g.z,x,z)<9))continue;
    if(bl.some(b=>dist2(b.x,b.z,x,z)<9))continue;const it={x,y:map.heightAt(x,z)-.1,z,s:.7+R()*.6,rot:R()*TAU,tint:R()};bl.push(it,{x:-x,y:it.y,z,s:it.s,rot:-it.rot,tint:it.tint});}
  if(bl.length){if(!REAL_GEO.bush)REAL_GEO.bush=leafCloud([[0,.6,0,.95,.7,.75],[.8,.45,.2,.7,.7,.7],[-.75,.42,-.15,.7,.7,.7],[.1,1,-.3,.6,.8,.65]],120,77);
    const bm=own(nearFade(windify(cardMat(RTEX.leaf,{trans:.26}),.03,.3),2,4.5));const c1=col(B.canopy2||B.canopy),c2=col(B.canopy);
    group.add(cardInstanced(REAL_GEO.bush,bm,cardDepth(RTEX.leaf),bl,(it)=>c1.clone().lerp(c2,it.tint*.6).multiplyScalar(1.15),true));}
  // pebbles along the path edges
  const pl=[];for(let i=0;i<3000&&pl.length<300;i++){const x=(R()*2-1)*92,z=(R()*2-1)*(map.zWall);const d=map.laneDistAt(x,z);if(d<hw-.2||d>hw+2.4||nearBase(x,z,13))continue;pl.push({x,y:map.heightAt(x,z)-.05,z,s:.18+R()*.3,sy:.7,rot:R()*TAU,tint:R()});}
  if(pl.length){if(!REAL_GEO.peb)REAL_GEO.peb=rockGeo(9.9,{w:20,h:14});const sc=col(B.stone||'#9a9c90');const im=makeInstanced(REAL_GEO.peb,own(tpMat({tex:'rock',scale:1.2,nStr:1.6,key:'peb'})),pl,null,(it)=>sc.clone().multiplyScalar(.75+it.tint*.4));im.castShadow=false;group.add(im);}
}
function buildForestWallReal(map,group,B){
  const R=mulberry32(map.seed^0x1234567);const list=[];const zE=map.zWall+6,xE=map.xWall+6;
  for(let i=0;i<130;i++){let x,z;if(R()<.7){x=(R()*2-1)*(xE+16);z=(R()<.5?-1:1)*(zE+4+R()*26);}else{x=(R()<.5?-1:1)*(xE+4+R()*22);z=(R()*2-1)*(zE+20);}
    list.push({x,z,y:map.heightAt(x,z)-1,s:3+R()*2.5,rot:R()*TAU,tint:R()});}
  const kind=B.pines?'pine':'tall';const G=realTreeGeos(kind);
  const bark=own(tpMat({tex:'bark',tint:B.trunk,moss:.5,mossCol:(B.grass||B.detail)[0],scale:.35,nStr:2,key:'barkW'}));const leafM=own(windify(cardMat(RTEX.leaf,{trans:.22}),.006,8));
  group.add(makeInstanced(G.trunk,bark,list,null,(it)=>new T.Color(1,1,1).multiplyScalar(.7+it.tint*.3)));
  const c=col(B.canopy);group.add(cardInstanced(G.canopy,leafM,cardDepth(RTEX.leaf),list,(it)=>c.clone().multiplyScalar(.85+it.tint*.35),true));
}

/* ---------- enchanted-forest dressing: soft halo, giant treeline, fireflies, light shafts ---------- */
let _haloTex=null;function haloTex(){if(_haloTex)return _haloTex;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.2,'rgba(255,255,255,.35)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return _haloTex=new T.CanvasTexture(c);}
function buildForestWall(map,group,B){if(REAL)return buildForestWallReal(map,group,B);
  const R=mulberry32(map.seed^0x1234567);const list=[];const zE=map.zWall+6,xE=map.xWall+6;
  for(let i=0;i<150;i++){let x,z;const side=R();
    if(side<.7){x=(R()*2-1)*(xE+16);z=(R()<.5?-1:1)*(zE+4+R()*26);}else{x=(R()<.5?-1:1)*(xE+4+R()*22);z=(R()*2-1)*(zE+20);}
    list.push({x,z,y:map.heightAt(x,z)-1,s:1.5+R()*1.5,rot:R()*TAU,tint:R()});}
  const trunkM=own(new T.MeshStandardMaterial({color:0xffffff,roughness:.95,flatShading:true}));const canM=own(windify(new T.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true}),.01,14));
  const tc=col(B.trunk),cc=col(B.canopy);
  const trunk=own(lpCyl(.9,1.6,24,7));trunk.translate(0,12,0);
  group.add(makeInstanced(trunk,trunkM,list,null,(it)=>tc.clone().multiplyScalar(.8+it.tint*.4)));
  if(B.pines){[[6,10,14],[4.6,9,20],[3,8,25]].forEach(([r,h,y])=>{const c=own(lpCone(r,h,8));c.translate(0,y,0);group.add(makeInstanced(c,canM,list,null,(it)=>cc.clone().multiplyScalar(.75+it.tint*.5)));});}
  else{[[0,24,0,8],[4.5,20,2,6],[-4,21,-2,6.4],[1,28,-1,5.5]].forEach(([x,y,z,r])=>{const c=own(new T.IcosahedronGeometry(r,1));c.translate(x,y,z);group.add(makeInstanced(c,canM,list,null,(it)=>cc.clone().multiplyScalar(.7+it.tint*.6)));});}
  // hanging moss / vines on the near treeline for silhouette
  const vl=list.filter((it,i)=>i%2===0);const vine=own(lpCyl(.05,.18,7,4));vine.translate(2.2,13,0);
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
  const R=mulberry32(map.seed^0x4242);const m=own(new T.MeshBasicMaterial({map:shaftTex(),color:col(B.shaft||'#fff2c8'),transparent:true,opacity:.018,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false,toneMapped:false}));
  const geom=own(lpCyl(2.4,5,46,18,1,true));
  for(let i=0,n=0;i<40&&n<6;i++){const x=-(16+R()*50),z=(R()*2-1)*(map.Lz+4);if(map.laneDistAt(x,z)<map.lw*.5+9)continue;n++;for(const sx of [1,-1]){const sh=new T.Mesh(geom,m);sh.position.set(x*sx,map.heightAt(x*sx,z)+20,z);sh.rotation.set(.28,0,.32*sx);sh.renderOrder=3;group.add(sh);}}
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
