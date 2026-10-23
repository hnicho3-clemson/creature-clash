'use strict';
/* Creature Clash — biomes, seeded mirrored map, world building, labels & announcements */
const BIOMES=[
  {id:'volcanic',name:'Volcanic Rim',ground:'#4a332e',ground2:'#2c201f',lane:'#a07a5a',laneEdge:'#3a2420',wall:'#2a1c20',skyTop:'#07040f',skyMid:'#3d1030',skyHorizon:'#ff7044',fog:'#4a1a24',sun:'#ffc290',sunI:2.4,hemiSky:'#ff9a7a',hemiGround:'#2a1010',twig:'#5a3a2a',critter:'#ff9a4a',geyser:'#ff6a1a',planet:'#ff8a4a',detail:['#3a2a28','#5a3a30','#ff5a1a'],props:['spire','rock','ember'],rough:.92,bloom:.9},
  {id:'tundra',name:'Frostbite Flats',ground:'#e6eef8',ground2:'#bccbe0',lane:'#9fb7d4',laneEdge:'#6f86a8',wall:'#c4d4ea',skyTop:'#050a24',skyMid:'#1c3a7a',skyHorizon:'#a6d6ff',fog:'#8fb0dc',sun:'#fff3e0',sunI:1.7,hemiSky:'#cfe6ff',hemiGround:'#5a6a8a',twig:'#7a5a40',critter:'#8ad8ff',geyser:'#bff4ff',planet:'#8ac8ff',detail:['#ffffff','#cfe0f5','#9fd8ff'],props:['pine','crystal','snowrock'],rough:.6,bloom:1.3},
  {id:'candy',name:'Sugar Rush Meadows',ground:'#8fe0a8',ground2:'#5fc489',lane:'#ffd0e4',laneEdge:'#e386b4',wall:'#b483d6',skyTop:'#120632',skyMid:'#6a2fa0',skyHorizon:'#ffb0d6',fog:'#c89ad8',sun:'#fff0f8',sunI:2.0,hemiSky:'#ffd6f0',hemiGround:'#3a6a5a',twig:'#c88a5a',critter:'#ffe14a',geyser:'#ff5ab0',planet:'#ffd060',detail:['#ff5ab0','#5ad1ff','#ffe14a','#ffffff','#9a6bff'],props:['lollipop','gumdrop','donut'],rough:.75,bloom:1.05},
  {id:'kitchen',name:'Giant Kitchen',ground:'#ece6da',ground2:'#c9bfae',lane:'#c08a58',laneEdge:'#6a4a30',wall:'#d6cec2',skyTop:'#08081e',skyMid:'#2a2a6a',skyHorizon:'#ffd7a0',fog:'#b8a890',sun:'#fff4e0',sunI:1.9,hemiSky:'#fff0d8',hemiGround:'#6a5a4a',twig:'#c8a070',critter:'#ffd23d',geyser:'#ffffff',planet:'#ffcf6a',detail:['#fff8e8','#f0c060','#e04040','#ffffff'],props:['mug','fork','cheese'],rough:.45,bloom:1.25,tiles:true,boulder:'meatball'},
  {id:'junk',name:'Junkyard Jumble',ground:'#6a5a48',ground2:'#463c33',lane:'#8a8272',laneEdge:'#3a342c',wall:'#3a3430',skyTop:'#08060a',skyMid:'#3a2438',skyHorizon:'#ff9a52',fog:'#5a4840',sun:'#ffd0a0',sunI:2.1,hemiSky:'#ffcfa0',hemiGround:'#2a2420',twig:'#6a5040',critter:'#b8ff4f',geyser:'#9aff6a',planet:'#ff9a5a',detail:['#5a5048','#8a7a6a','#c84a2a','#7a8a9a'],props:['tire','crate','barrel'],rough:.8,bloom:.9,boulder:'scrap'},
  {id:'swamp',name:'Murkmire Bog',ground:'#3f5c33',ground2:'#283f22',lane:'#8a7a52',laneEdge:'#463a26',wall:'#22301f',skyTop:'#030b0a',skyMid:'#163e34',skyHorizon:'#9fd78c',fog:'#2f4a38',sun:'#efffd0',sunI:2.0,hemiSky:'#b6e6a0',hemiGround:'#1a2a14',twig:'#4a3a22',critter:'#c0ff6a',geyser:'#9aff6a',planet:'#c0ff90',detail:['#4f7a3a','#6a9a3a','#2f5a2a'],props:['mushroom','reed','stump'],rough:.85,bloom:.85},
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
  hemi.color.copy(col(B.hemiSky));hemi.groundColor.copy(col(B.hemiGround));hemi.intensity=.55;
  sun.color.copy(col(B.sun));sun.intensity=B.sunI;
  scene.fog=new T.Fog(col(B.fog),110,380);
  if(envRT)envRT.dispose();envRT=makeEnvMap(B);scene.environment=envRT.texture;
  if(skyMesh){scene.remove(skyMesh);skyMesh.material.dispose();}
  skyMesh=new T.Mesh(geo('skysph',()=>new T.SphereGeometry(1000,48,24)),skyMaterial(B,1));skyMesh.renderOrder=-1;scene.add(skyMesh);
  if(planet)scene.remove(planet);
  planet=new T.Group();const pm=own(new T.MeshStandardMaterial({color:col(B.planet),roughness:.8,emissive:col(B.planet),emissiveIntensity:.25,fog:false}));
  planet.add(new T.Mesh(geo('planet',()=>new T.SphereGeometry(70,48,32)),pm));
  const ring=new T.Mesh(geo('planetRing',()=>new T.RingGeometry(95,150,96)),own(new T.MeshBasicMaterial({color:col(B.skyHorizon).multiplyScalar(.9),transparent:true,opacity:.45,side:T.DoubleSide,fog:false})));ring.rotation.x=1.2;ring.rotation.y=.3;planet.add(ring);
  planet.position.set(260,330,-620);scene.add(planet);
  buildTerrain(map,group,B);buildProps(map,group,B);buildDetails(map,group,B);buildBases(map,group);
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
  switch(B.id){
    case 'volcanic':
      add('spire',new T.ConeGeometry(1.3,6.5,7,3),rock,LM(0,3,0),(it)=>col('#2e2226').lerp(col('#4a2e2a'),it.tint));collide('spire',1.1);
      add('spire',new T.ConeGeometry(.35,1.2,6),own(new T.MeshBasicMaterial({color:col('#ff6a1a').multiplyScalar(3),toneMapped:false})),LM(0,6.3,0));
      add('rock',new T.DodecahedronGeometry(1.6,0),rock,LM(0,.8,0,0,0,0,1,.75,1),(it)=>col('#3a2a28').lerp(col('#5a3c32'),it.tint));collide('rock',1.4);
      add('ember',new T.OctahedronGeometry(.9,0),own(new T.MeshStandardMaterial({color:col('#ff7a2a'),emissive:col('#ff4a10'),emissiveIntensity:2.2,roughness:.3,flatShading:true})),LM(0,1,0,0,0,0,1,1.8,1));collide('ember',.7);break;
    case 'tundra':
      add('pine',new T.CylinderGeometry(.22,.3,1.4,8),own(new T.MeshStandardMaterial({color:col('#6a4a34'),roughness:.9})),LM(0,.7,0));
      [[2.1,2.4,1.9],[1.65,2.1,3.0],[1.1,1.8,4.0]].forEach(([r,h,y])=>{add('pine',new T.ConeGeometry(r,h,9),own(new T.MeshStandardMaterial({color:col('#1f5a4a'),roughness:.8,flatShading:true})),LM(0,y,0));add('pine',new T.ConeGeometry(r*.62,h*.45,9),own(new T.MeshStandardMaterial({color:col('#f4f8ff'),roughness:.7,flatShading:true})),LM(0,y+h*.32,0));});collide('pine',1.2);
      add('crystal',new T.OctahedronGeometry(1,0),own(new T.MeshPhysicalMaterial({color:col('#9fe6ff'),emissive:col('#3ab0ff'),emissiveIntensity:.5,roughness:.08,clearcoat:1,transparent:true,opacity:.85,flatShading:true})),LM(0,1.6,0,0,0,.15,1,2.4,1));collide('crystal',.9);
      add('snowrock',new T.DodecahedronGeometry(1.5,1),rock,LM(0,.6,0,0,0,0,1,.7,1),()=>col('#dfe9f6'));collide('snowrock',1.3);break;
    case 'candy':
      add('lollipop',new T.CylinderGeometry(.12,.12,4,8),own(new T.MeshStandardMaterial({color:col('#fff8f0'),roughness:.4})),LM(0,2,0));
      add('lollipop',new T.CylinderGeometry(1.5,1.5,.38,40),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.2,clearcoat:1})),LM(0,4.3,0,Math.PI/2,0,0),(it)=>palette[Math.floor(it.tint*palette.length)%palette.length].clone());
      add('lollipop',new T.TorusGeometry(.9,.12,8,36),own(new T.MeshPhysicalMaterial({color:col('#ffffff'),roughness:.2,clearcoat:1})),LM(0,4.3,.2));collide('lollipop',.5);
      add('gumdrop',new T.SphereGeometry(1.3,28,16,0,TAU,0,Math.PI*.62),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.35,clearcoat:1,clearcoatRoughness:.1})),LM(0,0,0,0,0,0,1,1.25,1),(it)=>palette[Math.floor(it.tint*7)%palette.length].clone());collide('gumdrop',1.2);
      add('donut',new T.TorusGeometry(1.2,.55,16,36),own(new T.MeshStandardMaterial({color:col('#d89a5a'),roughness:.8})),LM(0,.5,0,Math.PI/2,0,0));
      add('donut',new T.TorusGeometry(1.2,.5,16,36),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.25,clearcoat:1})),LM(0,.68,0,Math.PI/2,0,0,1.02,1.02,.62),(it)=>palette[Math.floor(it.tint*11)%palette.length].clone());collide('donut',1.6);break;
    case 'kitchen':{
      const cer=own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.2,clearcoat:1}));
      const mug=new T.CylinderGeometry(1.3,1.15,2.6,32,1,true);add('mug',mug,own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.2,clearcoat:1,side:T.DoubleSide})),LM(0,1.3,0),(it)=>palette[Math.floor(it.tint*4)%palette.length].clone().lerp(col('#7ab0ff'),it.tint>.5?.6:0));
      add('mug',new T.CylinderGeometry(1.15,1.15,.15,32),cer,LM(0,.08,0));add('mug',new T.TorusGeometry(.62,.16,10,24,Math.PI),cer,LM(1.25,1.35,0,0,0,-Math.PI/2));add('mug',new T.CircleGeometry(1.2,24),own(new T.MeshStandardMaterial({color:col('#3a2010'),roughness:.15})),LM(0,2.2,0,-Math.PI/2,0,0));collide('mug',1.4);
      const steel=own(new T.MeshStandardMaterial({color:col('#d8dde6'),metalness:1,roughness:.18}));add('fork',new T.BoxGeometry(.32,4.4,.12),steel,LM(0,2.8,0,0,0,.18));for(let k=-1.5;k<=1.5;k++)add('fork',new T.BoxGeometry(.09,1.4,.09),steel,LM(k*.16+.25,.6,0,0,0,.18));add('fork',new T.BoxGeometry(.7,.25,.12),steel,LM(.2,1.3,0,0,0,.18));collide('fork',.5);
      add('cheese',new T.CylinderGeometry(2,2,1.6,3,1),own(new T.MeshStandardMaterial({color:col('#ffd24a'),roughness:.55,flatShading:true})),LM(0,.8,0));add('cheese',new T.SphereGeometry(.35,10,8),own(new T.MeshStandardMaterial({color:col('#d8a020'),roughness:.8})),LM(.4,1.6,.2));collide('cheese',1.3);break;}
    case 'junk':{
      add('tire',new T.TorusGeometry(1.3,.55,12,28),own(new T.MeshStandardMaterial({color:col('#1c1c20'),roughness:.85})),LM(0,.55,0,Math.PI/2,0,0));add('tire',new T.CylinderGeometry(.8,.8,.5,20),own(new T.MeshStandardMaterial({color:col('#8a8a96'),metalness:.8,roughness:.35})),LM(0,.55,0));collide('tire',1.6);
      add('crate',new T.BoxGeometry(2.2,2.2,2.2),own(new T.MeshStandardMaterial({color:0xffffff,roughness:.85})),LM(0,1.1,0),(it)=>col('#8a6038').lerp(col('#5a7a6a'),it.tint>.7?.6:0));add('crate',new T.BoxGeometry(2.3,.3,2.3),own(new T.MeshStandardMaterial({color:col('#5a4028'),roughness:.9})),LM(0,1.6,0));collide('crate',1.4);
      add('barrel',new T.CylinderGeometry(.9,.9,2.2,18),own(new T.MeshStandardMaterial({color:0xffffff,metalness:.6,roughness:.45})),LM(0,1.1,0),(it)=>it.tint>.5?col('#b0482a'):col('#3a6a9a'));add('barrel',new T.CircleGeometry(.82,18),own(new T.MeshBasicMaterial({color:col('#9aff6a').multiplyScalar(2.2),toneMapped:false})),LM(0,2.22,0,-Math.PI/2,0,0));collide('barrel',1);break;}
    case 'swamp':
      add('mushroom',new T.CylinderGeometry(.3,.45,2.2,10),own(new T.MeshStandardMaterial({color:col('#efe6c8'),roughness:.8})),LM(0,1.1,0));
      add('mushroom',new T.SphereGeometry(1.6,24,12,0,TAU,0,Math.PI/2),own(new T.MeshPhysicalMaterial({color:0xffffff,roughness:.3,clearcoat:.8,emissive:col('#2affc0'),emissiveIntensity:.35})),LM(0,2.05,0,0,0,0,1,.7,1),(it)=>it.tint>.5?col('#c23a6a'):col('#6a3ac2'));
      add('mushroom',new T.SphereGeometry(.16,10,8),own(new T.MeshBasicMaterial({color:col('#9affe0').multiplyScalar(2.6),toneMapped:false})),LM(.7,2.65,.3));collide('mushroom',.55);
      for(let i=0;i<5;i++)add('reed',new T.CylinderGeometry(.05,.07,2.6,5),own(new T.MeshStandardMaterial({color:col('#6a8a3a'),roughness:.8})),LM(Math.cos(i*1.3)*.5,1.3,Math.sin(i*1.3)*.5,(i%3-1)*.15,0,(i%2-.5)*.2));
      add('reed',new T.CapsuleGeometry(.12,.5,4,8),own(new T.MeshStandardMaterial({color:col('#5a3a20'),roughness:.9})),LM(.2,2.5,.1));
      add('stump',new T.CylinderGeometry(1.1,1.5,1.5,12),own(new T.MeshStandardMaterial({color:col('#5a3e26'),roughness:.9,flatShading:true})),LM(0,.75,0));
      add('stump',new T.CylinderGeometry(1.1,1.1,.06,24),own(new T.MeshStandardMaterial({color:col('#c8a070'),roughness:.8})),LM(0,1.52,0));collide('stump',1.3);break;
  }
}
function buildDetails(map,group,B){
  const R=mulberry32(map.seed^0x5f3759df);const list=[];
  for(let i=0;i<3200&&list.length<2600;i++){const x=(R()*2-1)*94,z=(R()*2-1)*(map.zWall+2);const d=map.laneDistAt(x,z);if(d<map.lw*.5+.6)continue;if(Math.hypot(Math.abs(x)-86,z)<14)continue;
    list.push({x,y:map.heightAt(x,z),z,s:.5+R()*.9,rot:R()*TAU,rx:(R()-.5)*.3,rz:(R()-.5)*.3,tint:R()});}
  const pal=B.detail.map(col);let gm;
  if(B.id==='swamp'||B.id==='candy'){gm=own(new T.ConeGeometry(.07,.7,4));gm.translate(0,.35,0);}else if(B.id==='kitchen')gm=own(new T.BoxGeometry(.16,.16,.16));else if(B.id==='tundra')gm=own(new T.OctahedronGeometry(.18,0));else gm=own(new T.DodecahedronGeometry(.16,0));
  const im=makeInstanced(gm,own(new T.MeshStandardMaterial({color:0xffffff,roughness:.8,flatShading:true})),list,null,(it)=>{const c=pal[Math.floor(it.tint*pal.length)%pal.length].clone();if(B.id==='volcanic'&&it.tint>.9)c.multiplyScalar(4);return c;});
  im.castShadow=false;group.add(im);
}
function buildBases(map,group){
  for(const team of ['blue','red']){const s=TEAMS[team].sign;const g=new T.Group();g.position.set(s*86,map.heightAt(s*86,0),0);
    const hex=new T.Mesh(own(new T.CylinderGeometry(9,10,.4,6)),own(new T.MeshPhysicalMaterial({color:col('#141a34'),roughness:.35,metalness:.5,clearcoat:1})));hex.position.y=.1;hex.receiveShadow=true;g.add(hex);
    const glow=new T.Mesh(own(new T.TorusGeometry(9.5,.12,8,6)),own(new T.MeshBasicMaterial({color:col(TEAMS[team].hex).multiplyScalar(4),toneMapped:false})));glow.rotation.x=Math.PI/2;glow.rotation.z=Math.PI/6;glow.position.y=.34;g.add(glow);
    for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6;const p=new T.Mesh(cylG(.25,.35,4,8),pmat('#c9d6ee',{metalness:.9,roughness:.2}));p.position.set(Math.cos(a)*9.6,2,Math.sin(a)*9.6);p.castShadow=true;g.add(p);
      const tip=new T.Mesh(sphereG(),glowMat(TEAMS[team].hex,3));tip.scale.setScalar(.32);tip.position.set(Math.cos(a)*9.6,4.2,Math.sin(a)*9.6);g.add(tip);}
    group.add(g);}
}
function buildNestView(n,B){
  const g=new T.Group();const s=n.main?1.85:1;const tc=TEAMS[n.team].hex;
  const pad=new T.Mesh(geo('nestPad',()=>new T.CylinderGeometry(3,3.4,.35,40)),pmat('#1a1d2e',{roughness:.5,clearcoat:.6}));pad.position.y=.1;pad.receiveShadow=true;g.add(pad);
  const ringMat=own(new T.MeshBasicMaterial({color:col(tc).multiplyScalar(4),toneMapped:false}));
  const ring=new T.Mesh(geo('nestRing',()=>new T.TorusGeometry(3.15,.09,8,64)),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.3;g.add(ring);
  const twig=pmat(B.twig,{roughness:.85,clearcoat:.1});const twig2=pmat('#a07a50',{roughness:.85,clearcoat:.1});
  const bowl=new T.Group();g.add(bowl);
  for(let i=0;i<9;i++){const t=new T.Mesh(geo('twigRing',()=>new T.TorusGeometry(1,.17,6,26)),i%2?twig:twig2);const y=.45+i*.11;const r=1.35+i*.09;t.scale.set(r,r,1+i*.05);t.position.y=y;t.rotation.set(Math.PI/2+(Math.random()-.5)*.3,(Math.random()-.5)*.3,Math.random()*TAU);t.castShadow=true;bowl.add(t);}
  for(let i=0;i<10;i++){const a=i/10*TAU+Math.random()*.4;const st=new T.Mesh(cylG(.05,.07,1.6,5),twig2);st.position.set(Math.cos(a)*2,1.2,Math.sin(a)*2);st.rotation.set(Math.sin(a)*.9,0,-Math.cos(a)*.9);bowl.add(st);}
  const eggMat=own(new T.MeshPhysicalMaterial({color:col(tc).lerp(new T.Color(1,1,1),.35),emissive:col(tc),emissiveIntensity:.7,roughness:.15,clearcoat:1}));
  const eggs=[];for(let i=0;i<3;i++){const a=i/3*TAU;const e=new T.Mesh(sphereG(),eggMat);e.scale.set(.55,.75,.55);e.position.set(Math.cos(a)*.55,1.35,Math.sin(a)*.55);e.rotation.z=Math.cos(a)*.25;e.castShadow=true;bowl.add(e);eggs.push(e);}
  let crystal=null;
  if(n.main){crystal=new T.Mesh(geo('mainCrystal',()=>new T.OctahedronGeometry(.9,0)),own(new T.MeshStandardMaterial({color:col(tc),emissive:col(tc),emissiveIntensity:2.6,roughness:.2,flatShading:true})));crystal.scale.set(1,1.8,1);crystal.position.y=3.6;g.add(crystal);
    const halo=new T.Mesh(geo('halo',()=>new T.TorusGeometry(1.4,.05,6,48)),ringMat);halo.position.y=3.6;halo.rotation.x=Math.PI/2.3;g.add(halo);n.halo=halo;}
  g.scale.setScalar(s);
  return {group:g,bowl,eggs,crystal,ringMat,eggMat,hitT:0,dead:false,deadT:0,pulse:0,s};
}
function buildBoulderView(B){const g=new T.Group();const k=B.boulder||B.id;let m;
  const spec={volcanic:['#3a2420',{emissive:col('#ff4a10'),emissiveIntensity:.9}],tundra:['#f4f8ff',{roughness:.6}],candy:['#ff5ab0',{roughness:.12,clearcoat:1}],swamp:['#4a6a32',{roughness:.9}],meatball:['#7a3a20',{roughness:.7}],scrap:['#7a7f8a',{metalness:.8,roughness:.4}]}[k]||['#777777',{}];
  m=own(new T.MeshPhysicalMaterial(Object.assign({color:col(spec[0]),flatShading:k!=='candy'&&k!=='tundra'},spec[1])));
  const ball=new T.Mesh(geo('boulderG'+k,()=>{const gg=new T.IcosahedronGeometry(2.2,k==='candy'||k==='tundra'?4:1);if(k!=='candy'){const p=gg.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);const s=1+(hash2(Math.round(v.x*10),Math.round(v.z*10+v.y*7))-.5)*.18;p.setXYZ(i,v.x*s,v.y*s,v.z*s);}gg.computeVertexNormals();}return gg;}),m);
  ball.castShadow=true;g.add(ball);g.userData.ball=ball;return g;}
function buildGeyserView(B){
  const g=new T.Group();
  const base=new T.Mesh(geo('geyBase',()=>new T.CylinderGeometry(.9,1.7,.7,10,1,true)),pmat('#3a3640',{roughness:.8,flatShading:true,side:T.DoubleSide}));base.position.y=.25;base.castShadow=true;g.add(base);
  const disc=new T.Mesh(geo('geyDisc',()=>new T.CircleGeometry(.9,20)),own(new T.MeshBasicMaterial({color:col(B.geyser).multiplyScalar(2),toneMapped:false})));disc.rotation.x=-Math.PI/2;disc.position.y=.45;g.add(disc);g.userData.disc=disc;
  return g;
}
const CRITTER=D('Snorflet','#ffd23d','#ff7ae8','spots',[.5,.46,.56],[P('shortLegs',.6,-.62,.45,{s:.45}),P('shortLegs',.6,-.62,-.45,{s:.45}),P('googlyEye',.34,.46,.82,{s:.8})]);
const BOSS=D('The Grand Gobbler','#7a3aff','#ff5ad6','spots',[2.3,1.9,2.6],[P('shortLegs',.6,-.62,.55,{s:1.9}),P('shortLegs',.6,-.62,0,{s:1.9}),P('shortLegs',.6,-.62,-.55,{s:1.9}),P('horns',.35,.75,.5,{s:1.8}),P('basicJaw',0,-.2,.98,{s:2.2}),P('spikes',0,.98,-.2,{s:1.8}),P('spikes',0,.85,-.55,{s:1.6}),P('googlyEye',.36,.42,.82,{s:1.7}),P('googlyEye',0,.6,.8,{s:1.5,m:false}),P('crownMini',0,1,.1,{s:2})]);
function spawnNeutral(type,x,z,B){
  const boss=type==='boss';const d=clone(boss?BOSS:CRITTER);if(!boss){d.color=B.critter;d.accent=pick(['#ff7ae8','#55f0ff','#ffffff']);d.seed=Math.floor(Math.random()*9999);}
  const n={kind:'neutral',type,name:d.name,d,x,z,y:world.map.heightAt(x,z),hx:x,hz:z,vx:0,vz:0,vy:0,yaw:Math.random()*TAU,radius:boss?2.6:.6,maxHp:boss?900:60,alive:true,respawnT:0,wanderT:0,tx:x,tz:z,slamCd:2,slamT:0,lastHurt:-99,team:'neutral',state:'alive',kx:0,kz:0,grounded:true,flee:0};
  n.hp=n.maxHp;n.view=buildCreatureView(d,{});n.height=n.view.height;n.view.root.position.set(x,n.y,z);world.group.add(n.view.root);
  n.tag=makeTag('tag3d neutral','<div class="tn">'+esc(n.name)+'</div><div class="tb"><i></i></div>');
  world.neutrals.push(n);return n;
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
function tname(c){if(!c)return '<span class="n">The arena</span>';const cls=c.kind==='creature'?(c.team==='blue'?'b':'r'):'n';return '<span class="'+cls+'">'+esc(c.isPlayer?'You':c.name)+'</span>';}
function killfeed(html){if(typeof announce==='function')announce(html);const d=document.createElement('div');d.className='kf';d.innerHTML=html;kfEl.prepend(d);while(kfEl.children.length>6)kfEl.lastChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),700);},6000);}
function clearAnnouncements(){kfEl.innerHTML='';bannerQ=[];bannerEl.innerHTML='';for(const f of ftPool){f.life=0;f.el.style.display='none';}}
