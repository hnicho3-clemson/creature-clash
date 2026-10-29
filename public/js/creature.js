'use strict';
/* Creature Clash — procedural creature models: skin shading, organic bodies, placed parts, animation, portraits */

/* =========================================================
   Procedural textures (generated once): skin normal/roughness maps, irises, contact shadow
   ========================================================= */
const TEXC={};
function skinTex(kind){
  if(TEXC['skin'+kind])return TEXC['skin'+kind];
  const W=512,H=256,cx=kind==='scales'?56:80,cy=cx/2;const R=mulberry32(kind==='scales'?11:23);
  const pts=new Float32Array(cx*cy*2);for(let j=0;j<cy;j++)for(let i=0;i<cx;i++){const k=(j*cx+i)*2;pts[k]=(i+.15+R()*.7)/cx;pts[k+1]=(j+.15+R()*.7)/cy;}
  const h=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/W,v=y/H;const gi=Math.floor(u*cx),gj=Math.floor(v*cy);let f1=9,f2=9;
    for(let dj=-1;dj<=1;dj++){const jj=gj+dj;if(jj<0||jj>=cy)continue;for(let di=-1;di<=1;di++){const ii=(gi+di+cx)%cx;const k=(jj*cx+ii)*2;let dx=u-pts[k];dx-=Math.round(dx);const ddx=dx*cx,ddy=(v-pts[k+1])*cy;const d=Math.sqrt(ddx*ddx+ddy*ddy);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}}
    let hh=kind==='scales'?smooth(0,.22,f2-f1)*(1-f1*.35):1-smooth(0,.75,f1);
    hh+=(hash2(x,y)-.5)*.06+(vnoise(x*.09,y*.09)-.5)*.12;h[y*W+x]=hh;}
  const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
  const cn=mk(),cr=mk();const xn=cn.getContext('2d'),xr=cr.getContext('2d');const dn=xn.createImageData(W,H),dr=xr.createImageData(W,H);const S=kind==='scales'?3.2:2.4;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const l=h[y*W+(x+W-1)%W],r=h[y*W+(x+1)%W],u=h[Math.max(0,y-1)*W+x],dd=h[Math.min(H-1,y+1)*W+x];
    let nx=(l-r)*S,ny=(dd-u)*S,nz=1;const ln=Math.hypot(nx,ny,nz);nx/=ln;ny/=ln;nz/=ln;
    dn.data[i*4]=(nx*.5+.5)*255;dn.data[i*4+1]=(ny*.5+.5)*255;dn.data[i*4+2]=(nz*.5+.5)*255;dn.data[i*4+3]=255;
    const rr=clamp(150+(1-h[i])*80,0,255);dr.data[i*4]=rr;dr.data[i*4+1]=rr;dr.data[i*4+2]=rr;dr.data[i*4+3]=255;}
  xn.putImageData(dn,0,0);xr.putImageData(dr,0,0);
  const tn=new T.CanvasTexture(cn),tr=new T.CanvasTexture(cr);for(const t of [tn,tr]){t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;t.anisotropy=4;}
  return TEXC['skin'+kind]={normal:tn,rough:tr};
}
function irisTex(hex){
  if(TEXC['iris'+hex])return TEXC['iris'+hex];
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const cc=new T.Color(hex);const r=mulberry32(hex.length*991+cc.r*1000|0);
  const rgb=(k,a)=>'rgba('+Math.round(clamp(cc.r*k,0,1)*255)+','+Math.round(clamp(cc.g*k,0,1)*255)+','+Math.round(clamp(cc.b*k,0,1)*255)+','+a+')';
  x.fillStyle='#f4efe8';x.fillRect(0,0,128,128);
  const g=x.createRadialGradient(64,64,10,64,64,62);g.addColorStop(0,rgb(1.4,1));g.addColorStop(.55,rgb(1,1));g.addColorStop(.88,rgb(.55,1));g.addColorStop(1,rgb(.15,1));x.fillStyle=g;x.beginPath();x.arc(64,64,62,0,TAU);x.fill();
  for(let i=0;i<220;i++){const a=r()*TAU,r0=18+r()*8,r1=40+r()*20;x.strokeStyle=r()<.5?rgb(1.7,.35):rgb(.4,.3);x.lineWidth=.6+r()*1.2;x.beginPath();x.moveTo(64+Math.cos(a)*r0,64+Math.sin(a)*r0);x.lineTo(64+Math.cos(a+r()*.1)*r1,64+Math.sin(a+r()*.1)*r1);x.stroke();}
  x.fillStyle='rgba(10,8,14,1)';x.beginPath();x.arc(64,64,19,0,TAU);x.fill();
  const lg=x.createRadialGradient(64,64,56,64,64,64);lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,0,.8)');x.fillStyle=lg;x.beginPath();x.arc(64,64,64,0,TAU);x.fill();
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return TEXC['iris'+hex]=t;
}
function shadowTex(){if(TEXC.shadow)return TEXC.shadow;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.5,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return TEXC.shadow=new T.CanvasTexture(c);}

/* =========================================================
   Materials
   ========================================================= */
// soft, slightly fuzzy creature skin: textured bumps, sheen for a subsurface-like rim, light coat
function skinMat(hex,kind,o){return matc('skin'+hex+kind+JSON.stringify(o||{}),()=>{const t=skinTex(kind||'pebble');const c=col(hex);
  return new T.MeshPhysicalMaterial(Object.assign({color:c,normalMap:t.normal,normalScale:new T.Vector2(.55,.55),roughnessMap:t.rough,roughness:.9,metalness:0,sheen:1,sheenColor:c.clone().lerp(new T.Color(1,.92,.88),.55),sheenRoughness:.42,clearcoat:.28,clearcoatRoughness:.35},o||{}));});}
const keratinMat=()=>matc('keratin',()=>new T.MeshPhysicalMaterial({vertexColors:true,roughness:.42,clearcoat:.55,clearcoatRoughness:.25,sheen:.4,sheenColor:new T.Color(1,1,.95)}));
const enamelMat=()=>matc('enamel',()=>new T.MeshPhysicalMaterial({color:col('#fffaf0'),roughness:.18,clearcoat:.8,sheen:.5,sheenColor:new T.Color(1,1,1)}));
const gumMat=()=>matc('gum',()=>new T.MeshPhysicalMaterial({color:col('#c84a66'),roughness:.35,clearcoat:.6,sheen:1,sheenColor:col('#ff9ab0')}));
const mouthMat=()=>matc('mouth',()=>new T.MeshPhysicalMaterial({color:col('#2a0610'),roughness:.55,clearcoat:.3}));
const clawMat=()=>matc('clawK',()=>new T.MeshPhysicalMaterial({vertexColors:true,roughness:.25,clearcoat:1,clearcoatRoughness:.1}));

/* =========================================================
   Geometry helpers
   ========================================================= */
// smooth tapered tube along a curve; optional ridges and a base→tip color gradient
function taperTube(pts,r0,r1,o){o=o||{};const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(p[0],p[1],p[2])));const segs=o.segs||18,rad=o.radial||12;
  const g=new T.TubeGeometry(curve,segs,1,rad,false);const pos=g.attributes.position;const cols=o.c0?new Float32Array(pos.count*3):null;const c0=o.c0?col(o.c0):null,c1=o.c1?col(o.c1):null,tmp=new T.Color();
  for(let ring=0;ring<=segs;ring++){const t=ring/segs;const ctr=curve.getPointAt(t);let r=lerp(r0,r1,Math.pow(t,o.pow||1));if(o.ridges)r*=1+Math.sin(t*o.ridges*TAU)*.06*(1-t);if(o.bulge)r*=1+Math.sin(t*Math.PI)*o.bulge;
    if(c0){tmp.copy(c0).lerp(c1,Math.pow(t,o.cpow||1.3));if(o.bands)tmp.multiplyScalar(Math.sin(t*o.bands*TAU)>0?1:.35);}
    for(let j=0;j<=rad;j++){const i=ring*(rad+1)+j;const vx=pos.getX(i)-ctr.x,vy=pos.getY(i)-ctr.y,vz=pos.getZ(i)-ctr.z;pos.setXYZ(i,ctr.x+vx*r,ctr.y+vy*r,ctr.z+vz*r);if(cols){cols[i*3]=tmp.r;cols[i*3+1]=tmp.g;cols[i*3+2]=tmp.b;}}}
  if(cols)g.setAttribute('color',new T.BufferAttribute(cols,3));g.computeVertexNormals();
  if(o.cap!==false&&r1>.004){const end=curve.getPointAt(1);const cap=new T.SphereGeometry(r1,rad,6);cap.translate(end.x,end.y,end.z);if(cols){const cc=new Float32Array(cap.attributes.position.count*3);for(let i=0;i<cc.length;i+=3){cc[i]=tmp.r;cc[i+1]=tmp.g;cc[i+2]=tmp.b;}cap.setAttribute('color',new T.BufferAttribute(cc,3));}
    const merged=mergeGeos([g,cap]);return merged;}
  return g;}
function mergeGeos(list){const gs=list.map(g=>g.index?g.toNonIndexed():g);const hasC=gs.every(g=>g.attributes.color);
  let count=0;for(const g of gs)count+=g.attributes.position.count;const P=new Float32Array(count*3),N=new Float32Array(count*3),U=new Float32Array(count*2),C=hasC?new Float32Array(count*3):null;let o=0;
  for(const g of gs){const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);if(g.attributes.uv)U.set(g.attributes.uv.array,o*2);if(C)C.set(g.attributes.color.array,o*3);o+=c;}
  const m=new T.BufferGeometry();m.setAttribute('position',new T.BufferAttribute(P,3));m.setAttribute('normal',new T.BufferAttribute(N,3));m.setAttribute('uv',new T.BufferAttribute(U,2));if(C)m.setAttribute('color',new T.BufferAttribute(C,3));return m;}
// muscle-shaped limb segment hanging down -Y from the joint
function limbGeo(len,rTop,rBot){const key='limb'+len.toFixed(2)+'_'+rTop.toFixed(3)+'_'+rBot.toFixed(3);return geo(key,()=>{const pts=[];const n=14;
  pts.push(new T.Vector2(0.0001,rTop*.6));for(let i=0;i<=n;i++){const t=i/n;const r=lerp(rTop,rBot,t)*(1+Math.sin(Math.min(1,t*1.6)*Math.PI)*.14);pts.push(new T.Vector2(r,-t*len));}pts.push(new T.Vector2(0.0001,-len-rBot*.5));
  return new T.LatheGeometry(pts,18);});}
// gentle organic body shape: fuller chest, tapered rump, slightly flattened belly (radial, so part placement stays exact)
function bodyShape(x,y,z){return 1+.075*z+.04*Math.max(0,y)*z-.06*Math.max(0,-y)*Math.max(0,-y)+.02*Math.max(0,y);}
function bodyGeometry(color,accent,seed,pattern){
  const g=new T.SphereGeometry(1,96,64);const pos=g.attributes.position;const cols=new Float32Array(pos.count*3);
  const r=mulberry32(seed|0);const c1=col(color),c2=col(accent),belly=col(color).lerp(new T.Color(1,.97,.9),.48),back=col(color).multiplyScalar(.78);
  const spots=[];for(let i=0;i<9;i++){const v=new T.Vector3(r()*2-1,r()*1.6-.3,r()*2-1).normalize();spots.push({v,s:.87+r()*.07});}
  const v=new T.Vector3(),tmp=new T.Color();const ph=r()*6,no=r()*50;
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const bt=pattern==='plain'?smooth(-.2,-.75,v.y)*.25:smooth(-.05,-.55,v.y);let sp=0;
    if(pattern==='spots')for(const s of spots){const d=v.dot(s.v);sp=Math.max(sp,smooth(s.s,s.s+.035,d)*(1-smooth(s.s+.06,s.s+.1,d)*.25));}
    else if(pattern==='stripes')sp=smooth(.25,.45,Math.sin(v.z*7+ph+Math.sin(v.x*3)*.6))*smooth(-.25,.1,v.y);
    const mott=.93+vnoise(v.x*4+no,v.z*4+v.y*3)*.14;
    tmp.copy(c1).lerp(back,smooth(.2,1,v.y)*.5).lerp(belly,bt*(pattern==='belly'?1:.85)).lerp(c2,sp*(1-bt)*.88);
    const ao=1-.38*smooth(-.55,-1,v.y);tmp.multiplyScalar(mott*ao);cols[i*3]=tmp.r;cols[i*3+1]=tmp.g;cols[i*3+2]=tmp.b;
    const n=bodyShape(v.x,v.y,v.z)*(1+(Math.sin(v.x*6+seed)*Math.sin(v.y*5)*Math.sin(v.z*7))*.018);pos.setXYZ(i,v.x*n,v.y*n,v.z*n);}
  g.setAttribute('color',new T.BufferAttribute(cols,3));g.computeVertexNormals();return g;
}
// frame on the body: position, outward normal, orientation with local +Z out of the body
const _up=new T.Vector3(0,1,0),_fw=new T.Vector3(0,0,1),_zAxis=new T.Vector3(0,0,1);
function surfaceFrame(p,b){
  const k=bodyShape(p[0],p[1],p[2]);const pos=new T.Vector3(p[0]*b.w*k,p[1]*b.h*k,p[2]*b.l*k);
  const n=new T.Vector3(p[0]/b.w,p[1]/b.h,p[2]/b.l).normalize();
  const up=Math.abs(n.y)>.92?_fw:_up;
  const X=new T.Vector3().crossVectors(up,n).normalize();const Y=new T.Vector3().crossVectors(n,X);
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,n));
  return {pos,n,q};
}
const WING_M=new T.Matrix4().set(0,1,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,1);
function finShape(big){const s=new T.Shape();if(big){s.moveTo(0,0);s.quadraticCurveTo(.6,.9,1.7,.8);s.quadraticCurveTo(1.35,.45,1.55,.15);s.quadraticCurveTo(1.15,.2,1.15,-.2);s.quadraticCurveTo(.75,.05,.6,-.35);s.quadraticCurveTo(.35,-.05,0,0);}
  else{s.moveTo(0,-.2);s.quadraticCurveTo(.5,.35,1.05,.15);s.quadraticCurveTo(.6,-.15,.75,-.5);s.quadraticCurveTo(.35,-.35,0,-.2);}
  const g=new T.ShapeGeometry(s,16);g.applyMatrix4(WING_M);return g;}
const IRIS_COLORS=['#3aa6ff','#62d36a','#ffb347','#b07aff','#ff6a7a','#40e0d0'];
const irisGeo=()=>geo('irisCap',()=>{const g=new T.SphereGeometry(1.004,36,10,0,TAU,0,.62);g.rotateX(Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;const k=2*Math.sin(.62);for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/k+.5,p.getY(i)/k+.5);return g;});
const clawGeo=(big)=>geo('claw'+(big?'B':'S'),()=>big?taperTube([[0,0,0],[0,.04,.16],[0,-.04,.32],[0,-.2,.4]],.075,.004,{c0:'#3a2a2a',c1:'#f0e6d0',segs:14,radial:8}):taperTube([[0,0,0],[0,.03,.11],[0,-.03,.21],[0,-.13,.26]],.045,.003,{c0:'#2a2028',c1:'#e8dcc8',segs:12,radial:8}));
const COLLAR={weapon:.2,claw:.2,bigclaw:.26,pincer:.24,horn:.2,tail:.3,antenna:.12,ear:.24,paw:.22,gland:.26,spike:.15,quills:.32,nose:.2,crystal:.22};

/* =========================================================
   Part builders: each returns {g, ...animation refs}; local +Z points out of the body, +Y roughly up
   ========================================================= */
const BUILDERS={
  eye(ctx){const er=ctx.def.eye;const g=new T.Group();const ball=new T.Group();ball.position.z=er*.45;g.add(ball);const googly=ctx.def.id==='googlyEye';
    const scl=new T.Mesh(geo('eyeSph',()=>new T.SphereGeometry(1,32,24)),googly?pmat('#ffffff',{roughness:.1,clearcoat:1}):matc('sclera',()=>new T.MeshPhysicalMaterial({color:col('#f7f1ea'),roughness:.22,clearcoat:1,clearcoatRoughness:.04,sheen:1,sheenColor:col('#ffcfcf')})));scl.scale.setScalar(er);ball.add(scl);
    const gl=new T.Mesh(sphereG(),glowMat('#ffffff',3));gl.scale.setScalar(er*.11);gl.position.set(er*.24,er*.3,er*.95);ball.add(gl);
    if(googly){const rim=new T.Mesh(geo('googRim',()=>new T.TorusGeometry(1,.06,8,32)),pmat('#d8dde6',{roughness:.2,clearcoat:1}));rim.scale.setScalar(er*.98);rim.position.z=-er*.05;ball.add(rim);
      const pu=new T.Mesh(sphereG(),pmat('#0b0b14',{roughness:.08,clearcoat:1}));pu.scale.set(er*.52,er*.52,er*.3);pu.position.z=er*.62;ball.add(pu);
      const dome=new T.Mesh(geo('eyeSph',()=>new T.SphereGeometry(1,32,24)),matc('dome',()=>new T.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.12,roughness:0,clearcoat:1,depthWrite:false})));dome.scale.setScalar(er*1.05);ball.add(dome);
      return {g,eye:{pupil:pu,er,x:0,y:0,vx:0,vy:0,kind:'googly'}};}
    const look=new T.Group();ball.add(look);const ic=IRIS_COLORS[(ctx.d.seed||1)%IRIS_COLORS.length];
    const iris=new T.Mesh(irisGeo(),matc('iris'+ic,()=>new T.MeshPhysicalMaterial({map:irisTex(ic),roughness:.3,clearcoat:1,clearcoatRoughness:.02})));iris.scale.setScalar(er);look.add(iris);
    const lidG=geo('lid',()=>new T.SphereGeometry(1,28,12,0,TAU,0,Math.PI/2));
    const top=new T.Group();const tl=new T.Mesh(lidG,ctx.solid);tl.scale.setScalar(er*1.08);top.add(tl);top.rotation.x=-.55;ball.add(top);
    const bot=new T.Group();const bl=new T.Mesh(lidG,ctx.solid);bl.scale.setScalar(er*1.06);bl.rotation.z=Math.PI;bot.add(bl);bot.rotation.x=.7;ball.add(bot);
    return {g,eye:{pupil:look,er,x:0,y:0,vx:0,vy:0,kind:'iris',top,bot}};},
  jaw(ctx){const g=new T.Group();g.position.z=-.06;
    const cav=new T.Mesh(sphereG(),mouthMat());cav.scale.set(.4,.12,.17);g.add(cav);
    const gum=new T.Mesh(sphereG(),gumMat());gum.scale.set(.39,.055,.15);gum.position.set(0,-.005,.03);g.add(gum);
    const tg=geo('tooth',()=>taperTube([[0,0,0],[0,-.08,.01],[0,-.15,.04]],.05,.006,{segs:8,radial:8}));
    [-.24,-.13,-.04,.04,.13,.24].forEach((x,i)=>{const t=new T.Mesh(tg,enamelMat());const big=i===0||i===5;t.scale.setScalar(big?1.35:.85+((i*37)%5)*.04);t.position.set(x,-.02,.11-Math.abs(x)*.12);g.add(t);});
    const lip=new T.Mesh(geo('lip',()=>new T.TorusGeometry(.38,.045,10,32,Math.PI)),ctx.solid);lip.rotation.x=Math.PI/2;lip.rotation.z=Math.PI;lip.scale.set(1,.42,1);lip.position.set(0,.005,.0);g.add(lip);
    const jaw=new T.Group();jaw.position.set(0,-.05,-.1);g.add(jaw);
    const low=new T.Mesh(sphereG(),ctx.solid);low.scale.set(.39,.16,.31);low.position.set(0,-.07,.14);jaw.add(low);
    const inn=new T.Mesh(sphereG(),mouthMat());inn.scale.set(.34,.08,.25);inn.position.set(0,-.02,.15);jaw.add(inn);
    const tongue=new T.Mesh(capsuleG(.07,.22),matc('tongue',()=>new T.MeshPhysicalMaterial({color:col('#e0607a'),roughness:.4,clearcoat:.8,sheen:1,sheenColor:col('#ffb0c0')})));tongue.rotation.x=Math.PI/2;tongue.scale.set(1.8,1,.6);tongue.position.set(0,.02,.16);jaw.add(tongue);
    const tg2=geo('toothL',()=>taperTube([[0,0,0],[0,.07,.01],[0,.12,.03]],.045,.005,{segs:8,radial:8}));
    [-.18,-.06,.06,.18].forEach((x,i)=>{const t=new T.Mesh(tg2,enamelMat());t.position.set(x,.04,.32-Math.abs(x)*.25);if(i===0||i===3)t.scale.setScalar(1.25);jaw.add(t);});
    return {g,jaw};},
  beak(ctx){const g=new T.Group();
    const up=new T.Mesh(geo('beakU',()=>taperTube([[0,.06,-.05],[0,.08,.25],[0,.02,.52],[0,-.1,.66]],.24,.01,{c0:'#f0902a',c1:'#ffd36a',segs:16,radial:16})),keratinMat());up.scale.set(1,.72,1);g.add(up);
    const jaw=new T.Group();jaw.position.set(0,-.06,0);g.add(jaw);
    const lo=new T.Mesh(geo('beakL',()=>taperTube([[0,0,-.04],[0,-.03,.2],[0,-.02,.42]],.18,.012,{c0:'#d8701a',c1:'#ffb347',segs:12,radial:14})),keratinMat());lo.scale.set(.95,.55,1);jaw.add(lo);
    for(const s of [-1,1]){const n=new T.Mesh(sphereG(),mouthMat());n.scale.setScalar(.025);n.position.set(s*.07,.13,.22);g.add(n);}
    return {g,jaw};},
  claw(ctx,big){const g=new T.Group();const arm=new T.Group();arm.rotation.x=.35;g.add(arm);const th=big?.17:.12;
    const a=new T.Mesh(geo('arm'+(big?'B':'S'),()=>taperTube([[0,0,-.05],[0,-.04,.25],[0,-.02,big?.55:.5]],th*1.25,th*.8,{bulge:.18,segs:14,radial:14,cap:false})),ctx.solid);arm.add(a);
    const hand=new T.Mesh(sphereG(),ctx.solid);hand.scale.set(th*1.25,th*.9,th*1.1);hand.position.z=big?.56:.5;arm.add(hand);
    for(let i=0;i<3;i++){const c=new T.Mesh(clawGeo(big),clawMat());c.position.set((i-1)*th*.75,0,(big?.62:.56)-Math.abs(i-1)*.03);c.rotation.y=(i-1)*.25;arm.add(c);}
    return {g,arm:{g:arm,side:1}};},
  bigclaw(ctx){return BUILDERS.claw(ctx,true);},
  /* held weapons: a stubby arm with a hand, gripping a goofy weapon that points out along +Z */
  weapon(ctx){const g=new T.Group();const k=ctx.def.weapon;const arm=new T.Group();arm.rotation.x=.25;g.add(arm);
    const a=new T.Mesh(geo('wArm',()=>taperTube([[0,0,-.05],[0,-.03,.18],[0,0,.34]],.13,.1,{bulge:.12,segs:10,radial:12,cap:false})),ctx.solid);arm.add(a);
    const hand=new T.Mesh(sphereG(),ctx.solid);hand.scale.set(.13,.12,.13);hand.position.z=.38;arm.add(hand);
    const w=buildWeaponMesh(k);w.position.z=.38;arm.add(w);
    return {g,weapon:{g:arm,k,base:.25}};},

  pincer(ctx){const g=new T.Group();const arm=new T.Group();arm.rotation.x=.3;g.add(arm);
    const a=new T.Mesh(geo('pinArm',()=>taperTube([[0,0,-.05],[0,-.03,.22],[0,0,.46]],.15,.11,{bulge:.15,segs:12,radial:14,cap:false})),ctx.solid);arm.add(a);
    const shellM=matc('pinShell'+ctx.d.accent,()=>new T.MeshPhysicalMaterial({color:col(ctx.d.accent),roughness:.3,clearcoat:1,clearcoatRoughness:.08,sheen:.6,sheenColor:col(ctx.d.accent).lerp(new T.Color(1,1,1),.6),normalMap:skinTex('scales').normal,normalScale:new T.Vector2(.25,.25)}));
    const palm=new T.Mesh(sphereG(),shellM);palm.scale.set(.17,.13,.2);palm.position.z=.5;arm.add(palm);const halves=[];
    for(const s of [-1,1]){const h=new T.Group();h.position.set(s*.06,0,.58);const m=new T.Mesh(geo('pinHalf',()=>taperTube([[0,0,0],[.07,0,.18],[.05,0,.36],[-.05,0,.48]],.1,.008,{segs:14,radial:10})),shellM);if(s<0)m.scale.x=-1;h.add(m);h.rotation.y=-s*.2;arm.add(h);halves.push({h,s});}
    return {g,arm:{g:arm,side:1},pincer:halves};},
  horn(ctx){const g=new T.Group();const h=new T.Mesh(geo('hornG',()=>taperTube([[0,0,-.06],[0,.03,.22],[0,.16,.46],[0,.38,.6],[0,.56,.58]],.17,.012,{ridges:7,c0:'#8a7558',c1:'#fff7e2',cpow:.8,segs:28,radial:14})),keratinMat());g.add(h);return {g};},
  tail(ctx){const g=new T.Group();g.rotation.x=.22;let parent=g;const segs=[];const radii=[.27,.23,.19,.15,.115,.085];
    for(let i=0;i<5;i++){const seg=new T.Group();seg.position.set(0,0,i===0?.05:.34);parent.add(seg);const rA=radii[i],rB=radii[i+1];
      const tube=new T.Mesh(geo('tailSeg'+i,()=>taperTube([[0,0,0],[0,0,.18],[0,0,.36]],rA,rB,{segs:6,radial:16,cap:false})),ctx.solid);seg.add(tube);
      const j=new T.Mesh(sphereG(),ctx.solid);j.scale.setScalar(rA*1.01);seg.add(j);segs.push(seg);parent=seg;}
    const end=new T.Group();end.position.z=.36;parent.add(end);
    if(ctx.def.tailEnd==='club'){const club=new T.Mesh(geo('clubG',()=>{const c=new T.IcosahedronGeometry(.4,2);const p=c.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);const s=1+(vnoise(v.x*6+3,v.y*6+v.z*4)-.5)*.25;p.setXYZ(i,v.x*s,v.y*s,v.z*s*1.15);}c.computeVertexNormals();return c;}),skinMat(ctx.d.accent,'scales',{normalScale:new T.Vector2(1,1)}));club.position.z=.32;end.add(club);
      const sg=geo('clubSpike',()=>taperTube([[0,0,0],[0,.12,0],[0,.24,-.03]],.07,.004,{c0:'#b8a888',c1:'#fff6e0',segs:8,radial:8}));
      for(let i=0;i<8;i++){const sp=new T.Mesh(sg,keratinMat());const a=i/8*TAU;const dir=new T.Vector3(Math.cos(a),Math.sin(a),(i%2?.55:-.15)).normalize();sp.position.copy(dir).multiplyScalar(.36).add(new T.Vector3(0,0,.32));sp.quaternion.setFromUnitVectors(_up,dir);end.add(sp);}}
    else{const st=new T.Mesh(geo('stingG',()=>taperTube([[0,0,0],[0,.1,.18],[0,.32,.28],[0,.52,.2]],.1,.006,{c0:'#2a1a30',c1:'#0a0a10',segs:16,radial:12})),clawMat());end.add(st);
      const drop=new T.Mesh(sphereG(),glowMat('#b8ff4f',2.2));drop.scale.setScalar(.05);drop.position.set(0,.5,.24);end.add(drop);}
    return {g,tail:segs};},
  gland(ctx){const k=ctx.def.gland;const g=new T.Group();
    const spec={spit:['#b8ff4f','#7aff2a',1.4,.3],heal:['#ff8ad0','#ff4ab0',1.6,.28],ink:['#2a1640','#000000',0,.32],inflate:['#ffc2dc','#ff7ab0',.25,.36]}[k];
    const m=ctx.vown(new T.MeshPhysicalMaterial({color:col(spec[0]),emissive:col(spec[1]),emissiveIntensity:spec[2],roughness:.08,clearcoat:1,clearcoatRoughness:.02,transparent:k!=='ink',opacity:k==='inflate'?.88:.95,sheen:1,sheenColor:col(spec[0]).lerp(new T.Color(1,1,1),.6)}));
    const s=new T.Mesh(geo('glandG',()=>new T.SphereGeometry(1,32,20)),m);s.scale.setScalar(spec[3]);s.position.z=spec[3]*.45;g.add(s);
    const vein=new T.Mesh(geo('vein',()=>new T.TorusGeometry(1,.035,6,32)),ctx.solid);vein.scale.setScalar(spec[3]*.75);vein.position.z=spec[3]*.15;g.add(vein);
    if(k==='ink'){for(let i=0;i<3;i++){const d=new T.Mesh(sphereG(),pmat('#7a3aff',{roughness:.1}));d.scale.setScalar(.05);d.position.set(Math.cos(i*2.1)*.18,Math.sin(i*2.1)*.18,spec[3]*.85);g.add(d);}}
    return {g,gland:{m:s,k,base:spec[3]}};},
  crystal(ctx){const g=new T.Group();const base=new T.Mesh(cylG(.2,.26,.12,16),pmat('#c9d6ee',{metalness:.9,roughness:.2}));base.rotation.x=Math.PI/2;base.position.z=.04;g.add(base);
    const c=new T.Mesh(geo('octa',()=>new T.OctahedronGeometry(.22,0)),ctx.vown(new T.MeshPhysicalMaterial({color:col('#55f0ff'),emissive:col('#2ab8ff'),emissiveIntensity:1.8,roughness:.05,clearcoat:1,flatShading:true})));c.scale.set(1,1,1.7);c.position.z=.38;g.add(c);
    return {g,gland:{m:c,k:'shield',base:1}};},
  antenna(ctx){const g=new T.Group();const st=new T.Mesh(geo('antG',()=>taperTube([[0,0,0],[0,.12,.24],[0,.26,.5],[0,.3,.72]],.045,.022,{c0:'#2a2a36',c1:'#10101a',segs:14,radial:8,cap:false})),keratinMat());g.add(st);
    const ball=new T.Mesh(sphereG(),ctx.vown(new T.MeshBasicMaterial({color:col('#9af0ff').multiplyScalar(2.5),toneMapped:false})));ball.scale.setScalar(.1);ball.position.set(0,.3,.74);g.add(ball);
    const cage=new T.Mesh(geo('antRing',()=>new T.TorusGeometry(.12,.012,6,20)),pmat('#c9d6ee',{metalness:.9,roughness:.2}));cage.position.copy(ball.position);g.add(cage);
    return {g,zap:ball};},
  spike(ctx){const g=new T.Group();const s=new T.Mesh(geo('spikeG',()=>taperTube([[0,0,-.04],[0,0,.18],[0,-.05,.42]],.14,.004,{c0:'#a89878',c1:'#fff8e8',segs:12,radial:12})),keratinMat());g.add(s);return {g};},
  quills(ctx){const g=new T.Group();const r=mulberry32(77);const qg=geo('quillG',()=>taperTube([[0,0,0],[0,0,.3],[0,-.02,.62]],.035,.003,{c0:'#2a2018',c1:'#fff4e0',bands:3,segs:12,radial:6}));
    for(let i=0;i<13;i++){const q=new T.Mesh(qg,keratinMat());const a=r()*TAU,rad=Math.sqrt(r())*.36;q.position.set(Math.cos(a)*rad,Math.sin(a)*rad,.02);q.rotation.set(-Math.sin(a)*rad*1.1,Math.cos(a)*rad*1.1,0);q.scale.setScalar(.8+r()*.45);g.add(q);}return {g};},
  plate(ctx){const g=new T.Group();const m=matc('plate'+ctx.d.accent,()=>new T.MeshPhysicalMaterial({color:col(ctx.d.accent).lerp(new T.Color(.62,.64,.7),.55),metalness:.75,roughness:.32,roughnessMap:skinTex('pebble').rough,clearcoat:.6,clearcoatRoughness:.2}));
    const p=new T.Mesh(geo('plateHex',()=>{const s=new T.Shape();for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6;const x=Math.cos(a)*.42,y=Math.sin(a)*.34;if(i)s.lineTo(x,y);else s.moveTo(x,y);}s.closePath();return new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:3,curveSegments:2});}),m);p.position.z=-.01;g.add(p);
    for(let i=0;i<4;i++){const rv=new T.Mesh(sphereG(),pmat('#e8e0c0',{metalness:.7,roughness:.25}));rv.scale.set(.04,.04,.025);rv.position.set(i%2?.27:-.27,i<2?.17:-.17,.09);g.add(rv);}return {g};},
  ear(ctx){const g=new T.Group();g.rotation.x=-.2;const o=new T.Mesh(geo('earO',()=>{const c=new T.ConeGeometry(.26,.66,24,4);c.rotateX(Math.PI/2);c.translate(0,0,.33);return c;}),ctx.solid);o.scale.set(.42,1,1);g.add(o);
    const i=new T.Mesh(geo('earI',()=>{const c=new T.ConeGeometry(.19,.52,20,3);c.rotateX(Math.PI/2);c.translate(0,0,.3);return c;}),matc('earIn',()=>new T.MeshPhysicalMaterial({color:col('#ff9ac0'),roughness:.7,sheen:1,sheenColor:col('#ffd0e0'),sheenRoughness:.3})));i.scale.set(.3,.9,.95);i.position.set(.06,0,0);g.add(i);return {g};},
  nose(ctx){const g=new T.Group();const n=new T.Mesh(sphereG(),skinMat(ctx.d.accent,'pebble',{clearcoat:.9,clearcoatRoughness:.15,normalScale:new T.Vector2(1.2,1.2)}));n.scale.set(.3,.24,.26);n.position.z=.12;g.add(n);
    for(const s of [-1,1]){const h=new T.Mesh(sphereG(),mouthMat());h.scale.set(.06,.045,.04);h.position.set(s*.1,-.05,.355);h.rotation.y=s*.4;g.add(h);}return {g};},
  crest(ctx){const g=new T.Group();const shp=new T.CircleGeometry(.6,24,-Math.PI/2,Math.PI);shp.rotateY(-Math.PI/2);
    const m=ctx.vown(new T.MeshPhysicalMaterial({color:col(ctx.d.accent),emissive:col('#55f0ff'),emissiveIntensity:.2,roughness:.15,clearcoat:1,side:T.DoubleSide,transparent:true,opacity:.85,iridescence:1,sheen:1,sheenColor:new T.Color(1,1,1)}));
    g.add(new T.Mesh(own2(shp),m));const rg=geo('crestRib',()=>taperTube([[0,0,0],[0,.02,.3],[0,0,.6]],.025,.006,{segs:8,radial:6,c0:'#3a2a3a',c1:'#ffffff'}));
    for(let i=0;i<5;i++){const a=(i/4-.5)*Math.PI*.9;const rib=new T.Mesh(rg,keratinMat());rib.rotation.x=-a;g.add(rib);}
    return {g,crest:m};},
  paw(ctx){const g=new T.Group();const arm=new T.Group();arm.rotation.x=.55;g.add(arm);
    const a=new T.Mesh(geo('pawArm',()=>taperTube([[0,0,-.05],[0,-.02,.18],[0,0,.36]],.17,.13,{bulge:.15,segs:10,radial:14,cap:false})),ctx.solid);arm.add(a);
    const sp=new T.Mesh(sphereG(),skinMat('#c8b090','pebble'));sp.scale.set(.28,.09,.26);sp.position.z=.46;arm.add(sp);
    for(let i=0;i<3;i++){const c=new T.Mesh(clawGeo(true),clawMat());c.position.set((i-1)*.12,0,.62);c.scale.setScalar(.85);arm.add(c);}return {g,arm:{g:arm,side:1}};},
  fin(ctx){const g=new T.Group();const m=matc('fin'+ctx.d.accent,()=>new T.MeshPhysicalMaterial({color:col(ctx.d.accent),roughness:.3,clearcoat:1,side:T.DoubleSide,transparent:true,opacity:.86,sheen:1,sheenColor:col(ctx.d.accent).lerp(new T.Color(1,1,1),.6)}));
    g.add(new T.Mesh(geo('finG',()=>finShape(false)),m));const bg=geo('finBone'+ctx.d.accent,()=>taperTube([[0,0,0],[0,0,.45],[0,0,.95]],.03,.006,{segs:8,radial:6,c0:ctx.d.accent,c1:'#ffffff'}));
    for(let i=0;i<4;i++){const b=new T.Mesh(bg,keratinMat());b.rotation.y=(i-1.5)*.35-.2;b.scale.setScalar(.9-Math.abs(i-1.5)*.15);g.add(b);}
    return {g,fin:g};},
  wing(ctx){const g=new T.Group();const m=matc('wing'+ctx.d.accent,()=>new T.MeshPhysicalMaterial({color:col(ctx.d.accent),emissive:col(ctx.d.accent),emissiveIntensity:.2,roughness:.25,clearcoat:1,side:T.DoubleSide,transparent:true,opacity:.7,sheen:1,sheenColor:new T.Color(1,1,1),iridescence:.6}));
    g.add(new T.Mesh(geo('wingG',()=>finShape(true)),m));
    const arm=new T.Mesh(geo('wingArm',()=>taperTube([[0,0,0],[.25,.05,.6],[.55,0,1.15],[.62,0,1.62]],.06,.015,{segs:16,radial:8,cap:true})),ctx.solid);g.add(arm);
    const fg=geo('wingFinger',()=>taperTube([[0,0,0],[-.2,0,.25],[-.5,0,.4]],.025,.006,{segs:8,radial:6}));for(let i=0;i<3;i++){const f=new T.Mesh(fg,ctx.solid);f.position.set(.4+i*.05,0,.95+i*.22);f.rotation.y=-.3*i;g.add(f);}
    return {g,wing:g};},
  hat(ctx){const g=new T.Group();const k=ctx.def.hat;
    if(k==='party'){const h=new T.Mesh(coneG(.32,.8,32),matc('partyhat',()=>new T.MeshPhysicalMaterial({map:getStripeTex(),roughness:.35,clearcoat:1,sheen:.5,sheenColor:new T.Color(1,1,1)})));h.rotation.x=Math.PI/2;h.position.z=.36;g.add(h);
      const pom=new T.Mesh(sphereG(),glowMat('#fff0a0',1.6));pom.scale.setScalar(.1);pom.position.z=.78;g.add(pom);}
    else if(k==='top'){const hm=matc('felt',()=>new T.MeshPhysicalMaterial({color:col('#15131c'),roughness:.8,sheen:1,sheenColor:col('#6a6a8a'),sheenRoughness:.3}));const a=new T.Mesh(cylG(.48,.48,.05,36),hm);a.rotation.x=Math.PI/2;a.position.z=.02;g.add(a);
      const b=new T.Mesh(cylG(.3,.32,.6,36),hm);b.rotation.x=Math.PI/2;b.position.z=.32;g.add(b);const band=new T.Mesh(cylG(.325,.325,.1,36),pmat('#ff4d5e',{sheen:1,sheenColor:col('#ffb0b8')}));band.rotation.x=Math.PI/2;band.position.z=.1;g.add(band);}
    else if(k==='beanie'){const b=new T.Mesh(geo('beanieG',()=>new T.SphereGeometry(.42,32,16,0,TAU,0,Math.PI/2)),matc('knit',()=>new T.MeshPhysicalMaterial({color:col('#ff5ad6'),roughness:.9,normalMap:skinTex('scales').normal,normalScale:new T.Vector2(.8,.8),sheen:1,sheenColor:col('#ffc0f0')})));b.rotation.x=Math.PI/2;b.position.z=-.08;g.add(b);
      const st=new T.Mesh(cylG(.025,.025,.2,8),pmat('#ffe14a'));st.rotation.x=Math.PI/2;st.position.z=.42;g.add(st);
      const prop=new T.Group();prop.position.z=.52;for(const s of [-1,1]){const bl=new T.Mesh(geo('blade',()=>new T.BoxGeometry(.38,.1,.02)),pmat(s>0?'#55f0ff':'#ffe14a'));bl.position.x=s*.19;prop.add(bl);}g.add(prop);return {g,prop};}
    else if(k==='crown'){const gm=pmat('#ffd166',{metalness:1,roughness:.18,clearcoat:.5});const ring=new T.Mesh(geo('crownBand',()=>new T.CylinderGeometry(.34,.36,.18,32,1,true)),matc('crownBandM',()=>new T.MeshStandardMaterial({color:col('#ffd166'),metalness:1,roughness:.18,side:T.DoubleSide})));ring.rotation.x=Math.PI/2;ring.position.z=.05;g.add(ring);
      for(let i=0;i<6;i++){const a=i/6*TAU;const sp=new T.Mesh(coneG(.07,.22,8),gm);sp.rotation.x=Math.PI/2;sp.position.set(Math.cos(a)*.33,Math.sin(a)*.33,.24);g.add(sp);const gem=new T.Mesh(sphereG(),glowMat(i%2?'#ff4d5e':'#55f0ff',2));gem.scale.setScalar(.045);gem.position.set(Math.cos(a)*.355,Math.sin(a)*.355,.05);g.add(gem);}}
    return {g};},
  bow(ctx){const g=new T.Group();const m=matc('satin',()=>new T.MeshPhysicalMaterial({color:col('#ff4d5e'),roughness:.35,sheen:1,sheenColor:col('#ffc0c8'),sheenRoughness:.25,clearcoat:.3}));for(const s of [-1,1]){const w=new T.Mesh(coneG(.16,.3,6),m);w.rotation.z=s*Math.PI/2;w.position.set(s*.15,0,.05);w.scale.set(1,1,.45);g.add(w);}
    const k=new T.Mesh(sphereG(),m);k.scale.setScalar(.07);k.position.z=.06;g.add(k);return {g};},
  stache(ctx){const g=new T.Group();const m=matc('fur',()=>new T.MeshPhysicalMaterial({color:col('#3a2418'),roughness:.85,sheen:1,sheenColor:col('#a07050'),sheenRoughness:.6}));const sg=geo('stacheT',()=>taperTube([[0,0,0],[.12,-.04,.03],[.24,-.02,.02],[.3,.06,0]],.06,.012,{segs:14,radial:10}));
    for(const s of [-1,1]){const c=new T.Mesh(sg,m);c.position.set(s*.02,0,.05);if(s<0)c.scale.x=-1;g.add(c);}return {g};},
  shell(ctx){const g=new T.Group();const b=ctx.b;
    const sg=geo('shellScutes',()=>{const s=new T.SphereGeometry(1,14,8,0,TAU,0,Math.PI/2).toNonIndexed();const p=s.attributes.position;const cc=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i+=6){const k=.78+hash2(i,7)*.32;for(let j=0;j<6&&i+j<p.count;j++){cc[(i+j)*3]=k;cc[(i+j)*3+1]=k;cc[(i+j)*3+2]=k;}}s.setAttribute('color',new T.BufferAttribute(cc,3));s.computeVertexNormals();return s;});
    const sm=matc('shellM'+ctx.d.accent,()=>new T.MeshPhysicalMaterial({color:col(ctx.d.accent),vertexColors:true,roughness:.4,roughnessMap:skinTex('pebble').rough,clearcoat:1,clearcoatRoughness:.12,flatShading:true,sheen:.4,sheenColor:new T.Color(1,1,1)}));
    const sh=new T.Mesh(sg,sm);sh.scale.set(b.w*1.12,b.h*.98,b.l*1.08);sh.position.set(0,b.h*.06,-b.l*.06);g.add(sh);
    const rim=new T.Mesh(geo('rim',()=>new T.TorusGeometry(1,.07,10,64)),skinMat('#e8e0c0','pebble',{clearcoat:.6}));rim.rotation.x=Math.PI/2;rim.scale.set(b.w*1.12,b.l*1.08,1);rim.position.set(0,b.h*.06,-b.l*.06);g.add(rim);return {g};},
  belly(ctx){const g=new T.Group();const b=ctx.b;const bm=skinMat(ctx.d.color==='#f4ead2'?'#ffe0b0':'#fff1d6','scales',{normalScale:new T.Vector2(.35,.35)});
    const m=new T.Mesh(sphereG(),bm);m.scale.set(b.w*.8,b.h*.42,b.l*.85);m.position.y=-b.h*.55;g.add(m);
    for(let i=0;i<4;i++){const s=new T.Mesh(geo('bellyStripe',()=>new T.TorusGeometry(1,.035,8,48)),skinMat('#e8c890','pebble'));s.rotation.x=Math.PI/2;const z=(i-1.5)*.26*b.l;const k=Math.sqrt(Math.max(.1,1-Math.pow(z/(b.l*.85),2)));s.scale.set(b.w*.78*k,b.l*.1,1);s.position.set(0,-b.h*.72,z);g.add(s);}return {g};},
};

/* Weapon meshes (shared by the held part and thrown projectiles). Grip at the origin, weapon along +Z. */
function buildWeaponMesh(k){const g=new T.Group();
  const grip=(c,len)=>{const h=new T.Mesh(cylG(.045,.05,len,10),pmat(c,{roughness:.6}));h.rotation.x=Math.PI/2;h.position.z=len*.5-.12;g.add(h);return h;};
  if(k==='fish'){grip('#6a4022',.36);const guard=new T.Mesh(cylG(.16,.16,.05,16),pmat('#ffd166',{metalness:.8,roughness:.25}));guard.rotation.x=Math.PI/2;guard.position.z=.1;g.add(guard);
    const fm=pmat('#8fb8d8',{metalness:.35,roughness:.25,clearcoat:1,sheen:1,sheenColor:col('#e0f4ff')});
    const body=new T.Mesh(sphereG(),fm);body.scale.set(.09,.17,.5);body.position.z=.58;g.add(body);
    const belly=new T.Mesh(sphereG(),pmat('#e8f0f4',{roughness:.3}));belly.scale.set(.085,.1,.42);belly.position.set(0,-.06,.6);g.add(belly);
    const tail=new T.Mesh(coneG(.16,.22,4),fm);tail.rotation.x=-Math.PI/2;tail.scale.set(.25,1,1);tail.position.z=.15;g.add(tail);
    for(const s of [-1,1]){const e=new T.Mesh(sphereG(),pmat('#ffffff',{roughness:.1}));e.scale.setScalar(.04);e.position.set(s*.075,.05,.95);g.add(e);const pu=new T.Mesh(sphereG(),pmat('#0b0b14'));pu.scale.setScalar(.02);pu.position.set(s*.105,.05,.96);g.add(pu);}
    const fin=new T.Mesh(coneG(.12,.25,3),fm);fin.scale.set(.15,1,1.6);fin.position.set(0,.17,.6);g.add(fin);}
  else if(k==='mallet'){grip('#ffd23d',.75);const head=new T.Mesh(cylG(.17,.17,.5,24),pmat('#ff4d5e',{roughness:.35,clearcoat:1}));head.rotation.z=Math.PI/2;head.position.z=.72;g.add(head);
    for(const s of [-1,1]){const cap=new T.Mesh(cylG(.18,.18,.08,24),pmat('#ffb0c8',{roughness:.5}));cap.rotation.z=Math.PI/2;cap.position.set(s*.27,0,.72);g.add(cap);}
    const band=new T.Mesh(cylG(.175,.175,.06,24),pmat('#ffffff',{roughness:.4}));band.rotation.z=Math.PI/2;band.position.z=.72;g.add(band);}
  else if(k==='noodle'){const n=new T.Mesh(geo('noodleG',()=>taperTube([[0,0,-.1],[0,.05,.5],[0,.02,1.1],[0,-.08,1.7]],.075,.07,{segs:24,radial:12})),pmat('#7dff6a',{roughness:.7,sheen:1,sheenColor:col('#d8ffd0')}));g.add(n);
    const tip=new T.Mesh(sphereG(),pmat('#ff5ad6',{roughness:.6}));tip.scale.setScalar(.09);tip.position.set(0,-.08,1.72);g.add(tip);}
  else if(k==='spatula'){grip('#1a1a24',.5);const neck=new T.Mesh(cylG(.025,.025,.22,8),pmat('#c9d6ee',{metalness:.9,roughness:.2}));neck.rotation.x=Math.PI/2;neck.position.z=.48;g.add(neck);
    const blade=new T.Mesh(geo('spatBlade',()=>new T.BoxGeometry(.34,.025,.38)),pmat('#d8e0ee',{metalness:.95,roughness:.18}));blade.position.z=.76;blade.rotation.x=-.15;g.add(blade);
    for(let i=0;i<3;i++){const sl=new T.Mesh(geo('spatSlot',()=>new T.BoxGeometry(.04,.03,.22)),pmat('#2a2f45'));sl.position.set((i-1)*.09,.005,.78);sl.rotation.x=-.15;g.add(sl);}}
  else if(k==='blaster'){const bm=pmat('#ff8a3d',{roughness:.3,clearcoat:1}),cm=pmat('#3b6bff',{roughness:.3,clearcoat:1});
    const body=new T.Mesh(geo('blBody',()=>new T.BoxGeometry(.2,.22,.5)),bm);body.position.set(0,.06,.3);g.add(body);
    const handle=new T.Mesh(geo('blGrip',()=>new T.BoxGeometry(.12,.26,.12)),cm);handle.position.set(0,-.08,.06);handle.rotation.x=.3;g.add(handle);
    const barrel=new T.Mesh(cylG(.06,.08,.34,14),cm);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.08,.68);g.add(barrel);
    const ring=new T.Mesh(geo('blRing',()=>new T.TorusGeometry(.1,.025,8,20)),pmat('#ffd23d',{metalness:.6,roughness:.3}));ring.position.set(0,.08,.86);g.add(ring);
    const tank=new T.Mesh(sphereG(),matc('blTank',()=>new T.MeshPhysicalMaterial({color:col('#9af0ff'),emissive:col('#2ab8ff'),emissiveIntensity:.6,transparent:true,opacity:.7,roughness:.05,clearcoat:1,iridescence:1})));tank.scale.setScalar(.13);tank.position.set(0,.26,.28);g.add(tank);}
  else if(k==='bone'){const bm=pmat('#f4ead2',{roughness:.55,sheen:.6,sheenColor:col('#ffffff')});
    for(const s of [-1,1]){const arm=new T.Mesh(capsuleG(.05,.42),bm);arm.rotation.set(Math.PI/2,0,0);arm.rotation.y=s*.55;arm.position.set(s*.13,0,.38);g.add(arm);
      for(const t of [-1,1]){const kn=new T.Mesh(sphereG(),bm);kn.scale.setScalar(.065);kn.position.set(s*.27+t*.04,0,.62+t*.03);g.add(kn);}}
    const mid=new T.Mesh(sphereG(),bm);mid.scale.set(.1,.07,.09);mid.position.z=.16;g.add(mid);}
  return g;}
let _viewOwn=null;function own2(x){if(_viewOwn)_viewOwn.push(x);else own(x);return x;}

function legBuild(def,s,side,skin,acc){
  const L=def.leg.len*s,th=def.leg.thick*Math.sqrt(s)*(def.leg.frog?1.15:1);const hip=new T.Group();hip.rotation.z=side*def.leg.splay;
  const thigh=new T.Mesh(limbGeo(L*.5,th*1.28,th*.82),skin);hip.add(thigh);
  const hipJ=new T.Mesh(sphereG(),skin);hipJ.scale.setScalar(th*1.3);hip.add(hipJ);
  const knee=new T.Group();knee.position.y=-L*.5;if(def.leg.knee)knee.rotation.z=side*def.leg.knee;hip.add(knee);
  const kj=new T.Mesh(sphereG(),skin);kj.scale.setScalar(th*.9);knee.add(kj);
  const shin=new T.Mesh(limbGeo(L*.5,th*.86,th*.55),skin);knee.add(shin);
  const foot=new T.Group();foot.position.y=-L*.5;knee.add(foot);
  if(def.leg.knee){const tip=new T.Mesh(geo('spiderTip',()=>taperTube([[0,0,0],[0,-.12,.02],[0,-.22,.06]],.06,.004,{c0:'#2a2028',c1:'#0a0a10',segs:8,radial:8})),clawMat());tip.scale.setScalar(th/.1);foot.add(tip);}
  else{const pad=new T.Mesh(sphereG(),acc);pad.scale.set(th*1.45,th*.62,th*1.7);pad.position.set(0,-th*.08,th*.5);foot.add(pad);
    const toeN=3,tl=def.leg.frog?th*2.2:th*1.1;
    for(let i=0;i<toeN;i++){const a=(i-1)*.42;const toe=new T.Group();toe.position.set(Math.sin(a)*th*.7,-th*.12,th*.9);toe.rotation.y=a;foot.add(toe);
      const tm=new T.Mesh(capsuleG(+(th*.34).toFixed(2),+(tl*.6).toFixed(2)),acc);tm.rotation.x=Math.PI/2;tm.position.z=tl*.35;toe.add(tm);
      const c=new T.Mesh(clawGeo(false),clawMat());c.scale.setScalar(th*3.2);c.position.z=tl*.72;c.rotation.x=.25;toe.add(c);}
    if(def.leg.frog){const web=new T.Mesh(sphereG(),matc('web'+acc.uuid,()=>{const w=acc.clone();w.transparent=true;w.opacity=.8;return w;}));web.scale.set(th*1.9,th*.12,th*1.6);web.position.set(0,-th*.15,th*1.5);foot.add(web);}}
  const a1=def.leg.splay,a2=a1+(def.leg.knee||0);const reach=L*.5*Math.cos(a1)+L*.5*Math.cos(a2)+th*.55;
  return {hip,knee,reach,len:L};
}
function buildCreatureView(d,opts){
  opts=opts||{};const b=d.body;const R=[b.w,b.h,b.l];
  const root=new T.Group();const pivot=new T.Group();root.add(pivot);
  const v={root,pivot,R,b,legs:[],eyes:[],jaws:[],arms:[],weapons:[],pincers:[],tails:[],wings:[],fins:[],glands:[],props:[],zaps:[],crests:[],phase:Math.random()*TAU,j:0,jv:0,tilt:0,flash:0,legLen:.6,turn:0,lastYaw:0,disp:[],partGroups:[],blinkT:1+Math.random()*4,blink:0};
  const vown=x=>{v.disp.push(x);return x;};_viewOwn=v.disp;
  const kind=d.pattern==='stripes'?'scales':'pebble';const tx=skinTex(kind);
  const bodyMat=vown(new T.MeshPhysicalMaterial({vertexColors:true,normalMap:tx.normal,normalScale:new T.Vector2(.5,.5),roughnessMap:tx.rough,roughness:.85,sheen:1,sheenColor:col(d.color).lerp(new T.Color(1,.92,.88),.55),sheenRoughness:.42,clearcoat:.3,clearcoatRoughness:.35,emissive:new T.Color(0,0,0)}));v.bodyMat=bodyMat;
  const solid=skinMat(d.color,kind);const acc=skinMat(d.accent,'pebble',{clearcoat:.55,clearcoatRoughness:.2});
  const body=new T.Mesh(vown(bodyGeometry(d.color,d.accent,d.seed||1,d.pattern||'spots')),bodyMat);body.scale.set(b.w,b.h,b.l);body.userData.body=true;pivot.add(body);v.body=body;
  const ctxBase={d,b,solid,acc,vown};
  for(const it of expandParts(d)){const def=it.def;
    if(def.mount==='leg'){const fr=surfaceFrame(it.p,b);const side=Math.sign(fr.pos.x)||1;const L=legBuild(def,it.s,side,solid,acc);L.hip.position.copy(fr.pos);L.hip.userData.inst=it.idx;pivot.add(L.hip);v.legs.push({hip:L.hip,knee:L.knee,side,reach:L.reach-fr.pos.y,len:L.len,z:fr.pos.z});v.partGroups.push(L.hip);continue;}
    const ctx=Object.assign({def,s:it.s},ctxBase);const built=BUILDERS[def.build](ctx);const g=built.g;
    const holder=new T.Group();holder.add(g);holder.userData.inst=it.idx;holder.userData.mir=it.mir;
    const cr=COLLAR[def.build];if(cr&&def.mount!=='cover'){const c=new T.Mesh(sphereG(),solid);c.scale.set(cr,cr,cr*.38);c.position.z=-cr*.12;holder.add(c);}
    if(def.mount==='cover'){pivot.add(holder);}
    else{const fr=surfaceFrame(it.p,b);holder.position.copy(fr.pos);holder.quaternion.copy(fr.q).multiply(new T.Quaternion().setFromAxisAngle(_zAxis,it.r||0));holder.scale.set(it.mir?-it.s:it.s,it.s,it.s);pivot.add(holder);}
    v.partGroups.push(holder);
    if(built.weapon)v.weapons.push(built.weapon);if(built.eye)v.eyes.push(built.eye);if(built.jaw)v.jaws.push(built.jaw);if(built.arm){built.arm.side=it.mir?-1:1;v.arms.push(built.arm);}if(built.pincer)v.pincers.push(built.pincer);
    if(built.tail)v.tails.push(built.tail);if(built.wing)v.wings.push(built.wing);if(built.fin)v.fins.push(built.fin);if(built.gland)v.glands.push(built.gland);if(built.prop)v.props.push(built.prop);if(built.zap)v.zaps.push(built.zap);if(built.crest)v.crests.push(built.crest);}
  _viewOwn=null;
  const bySide={'-1':[],'1':[]};for(const L of v.legs)bySide[L.side].push(L);
  for(const k in bySide){bySide[k].sort((a,b)=>b.z-a.z);bySide[k].forEach((L,i)=>{L.phase=(i%2)*Math.PI+(L.side>0?Math.PI:0);});}
  let baseY=b.h*.85;for(const L of v.legs)baseY=Math.max(baseY,L.reach);v.baseY=baseY;
  if(v.legs.length)v.legLen=v.legs.reduce((a,L)=>a+L.len,0)/v.legs.length;
  const sb=new T.Mesh(sphereG(),vown(new T.MeshPhysicalMaterial({color:col('#55f0ff'),emissive:col('#2ab8ff'),emissiveIntensity:.6,transparent:true,opacity:.22,roughness:.05,clearcoat:1,depthWrite:false,side:T.DoubleSide,iridescence:1})));
  sb.scale.setScalar(Math.max(b.w,b.h,b.l)*1.75);sb.visible=false;pivot.add(sb);v.shield=sb;
  const stars=new T.Group();stars.position.set(0,b.h*1.3,0);for(let i=0;i<3;i++){const s=new T.Mesh(geo('star',()=>new T.OctahedronGeometry(.13,0)),glowMat('#ffe14a',2.4));s.position.set(Math.cos(i*2.1)*.55,0,Math.sin(i*2.1)*.55);stars.add(s);}stars.visible=false;pivot.add(stars);v.stars=stars;
  const radius=Math.max(b.w,b.l)*.95;v.radius=radius;
  // soft contact shadow keeps creatures grounded
  const csm=vown(new T.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.62,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2}));
  const cs=new T.Mesh(geo('csPlane',()=>{const p=new T.PlaneGeometry(1,1);p.rotateX(-Math.PI/2);return p;}),csm);cs.scale.set(radius*2.7,1,Math.max(b.l,b.w)*2.9);cs.renderOrder=1;root.add(cs);v.cshadow=cs;v.csMat=csm;
  if(opts.team){const tc=col(TEAMS[opts.team].hex).multiplyScalar(3);const rm=vown(new T.MeshBasicMaterial({color:tc.clone(),transparent:true,opacity:.75,toneMapped:false,depthWrite:false}));
    const ring=new T.Mesh(geo('teamRing',()=>new T.RingGeometry(1,1.18,64)),rm);ring.rotation.x=-Math.PI/2;ring.scale.set(radius*1.3,radius*1.3,1);root.add(ring);v.ring=ring;v.ringMat=rm;v.teamCol=tc;}
  pivot.position.y=baseY;root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(pivot);v.height=Math.max(baseY+b.h,(box.max.y||0));
  root.traverse(o=>{if(o.isMesh){const m=o.material;o.castShadow=!(m&&m.transparent&&m.depthWrite===false)&&o!==cs;o.receiveShadow=o===body;}});if(v.ring)v.ring.castShadow=false;
  return v;
}
function disposeView(v){if(!v)return;if(v.root.parent)v.root.parent.remove(v.root);for(const x of v.disp){try{x.dispose();}catch(e){}}v.disp.length=0;}

function animateCreatureView(c,dt,time){
  const v=c.view;if(!v)return;const r=v.root;
  r.position.set(c.x,c.y,c.z);
  if(c.state==='dead'&&c.deadT>9){r.visible=false;return;}
  const hidden=(c.camoT>0&&!c.showCamo);r.visible=!hidden;
  const spinAdd=c.spinT>0?(1-c.spinT/.5)*TAU:0;const emoteAdd=c.emoteT>0&&c.state==='alive'?Math.sin(c.emoteT*5)*1.2:0;
  r.rotation.y=c.yaw+spinAdd+emoteAdd;
  const turn=angDiff(v.lastYaw,c.yaw)/Math.max(dt,1e-3);v.lastYaw=c.yaw;v.turn=lerp(v.turn,turn,.2);
  const sp=Math.hypot((c.vx||0)+(c.kx||0),(c.vz||0)+(c.kz||0));const grounded=c.grounded!==false;
  const walk=(c.state==='alive')&&grounded?clamp(sp/4,0,1):0;
  v.phase+=dt*(sp*2.4/Math.max(.45,v.legLen)+(walk>0?0:1));
  for(const L of v.legs){const p=v.phase+L.phase;
    if(c.state==='dead'){L.hip.rotation.x=lerp(L.hip.rotation.x,0,.1);L.knee.rotation.x=.1+(c.deadT<3?Math.sin(time*25+L.phase)*.25:0);}
    else if(c.state==='downed'){L.hip.rotation.x=Math.sin(time*3+L.phase)*.2;L.knee.rotation.x=.4;}
    else if(!grounded){L.hip.rotation.x=lerp(L.hip.rotation.x,-.55,.2);L.knee.rotation.x=lerp(L.knee.rotation.x,1,.2);}
    else{L.hip.rotation.x=Math.sin(p)*.8*walk;L.knee.rotation.x=Math.max(0,Math.cos(p))*1.05*walk+.06;}}
  v.jv+=(-v.j*170-v.jv*8)*dt;v.j+=v.jv*dt;v.j=clamp(v.j,-.5,.5);
  const breathe=c.state==='alive'?Math.sin(time*2.3+v.phase*.1)*.014:0;
  const sy=1+clamp((c.vy||0)*.016,-.18,.22)+v.j+Math.sin(v.phase*2)*.035*walk+(c.spitT>0?.08:0)+breathe;const sx=1/Math.sqrt(Math.max(.45,sy))+breathe*.6;
  const inf=c.inflateT>0?1.45:1;v.inf=lerp(v.inf||1,inf,1-Math.exp(-dt*10));
  v.pivot.scale.set(sx*v.inf,sy*v.inf,sx*v.inf);
  let py=v.baseY*(v.inf>1.01?1+(v.inf-1)*.6:1)+Math.abs(Math.sin(v.phase))*.13*walk;let tz=0,tx=clamp(sp*.012,0,.15)+(c.dashT>0?.35:0);
  if(c.state==='downed'){tz=1.35;py=v.R[0]*.72;tx=0;}
  else if(c.state==='dead'){tz=Math.PI;py=v.R[1]*.85+(v.legLen*.2)-Math.max(0,c.deadT-6)*.5;tx=0;}
  if(c.emoteT>0&&c.state==='alive')py+=Math.abs(Math.sin(c.emoteT*9))*.8;
  if(c.slamT>0)py+=(.85-c.slamT)*2.2;
  if(c.burrowT>0)v.bur=lerp(v.bur||0,1,1-Math.exp(-dt*8));else v.bur=lerp(v.bur||0,0,1-Math.exp(-dt*10));
  py-=(v.bur||0)*(v.baseY+v.R[1]*2.2);
  v.tilt=lerp(v.tilt,tz,1-Math.exp(-dt*7));
  v.pivot.rotation.z=v.tilt+(c.state==='alive'?Math.sin(v.phase)*.06*walk-clamp(v.turn*.05,-.25,.25):0);
  v.pivot.rotation.x=lerp(v.pivot.rotation.x,tx,.15);v.pivot.position.y=py;
  const gh=typeof world!=='undefined'&&world&&c.kind?world.map.heightAt(c.x,c.z):0;const above=Math.max(0,c.y-gh);
  if(v.cshadow){v.cshadow.position.y=gh-c.y+.04;v.cshadow.visible=c.state!=='dead'&&!hidden&&(v.bur||0)<.5;const k=1/(1+above*.25);v.csMat.opacity=.62*k;const s=1+above*.08;v.cshadow.scale.set(v.radius*2.7*s,1,Math.max(v.R[2],v.R[0])*2.9*s);}
  if(v.ring){v.ring.position.y=gh-c.y+.07;v.ring.visible=c.state!=='dead';if(c.blessT>0)v.ringMat.color.setRGB(2.4,1.6,.3);else v.ringMat.color.copy(v.teamCol);
    v.ringMat.opacity=c.state==='downed'?.35+.3*Math.sin(time*8):.75;}
  // eyes: googly pupils wobble, real eyes look around and blink
  v.blinkT-=dt;if(v.blinkT<=0){v.blink=.16;v.blinkT=2+Math.random()*4.5;}if(v.blink>0)v.blink-=dt;
  const bl=c.state==='dead'?1:c.state==='downed'?.7:(v.blink>0?Math.sin((1-v.blink/.16)*Math.PI):0);
  for(const e of v.eyes){
    if(c.state==='dead'){e.x=Math.cos(time*14+e.er*40)*e.er*.3;e.y=Math.sin(time*14+e.er*40)*e.er*.3;}
    else{const tx2=clamp(-v.turn*.04,-.3,.3)*e.er+(e.kind==='iris'?Math.sin(time*.7+v.phase*.05)*e.er*.12:0),ty2=clamp(-(c.vy||0)*.02,-.3,.3)*e.er+(c.state==='downed'?-e.er*.25:0);
      e.vx+=((tx2-e.x)*140-e.vx*(e.kind==='iris'?14:5))*dt;e.vy+=((ty2-e.y)*140-e.vy*(e.kind==='iris'?14:5))*dt;if(e.kind!=='iris'&&walk>.3&&Math.random()<dt*3){e.vx+=(Math.random()-.5)*1.5;e.vy+=(Math.random()-.5)*1.5;}
      e.x+=e.vx*dt;e.y+=e.vy*dt;const lim=e.er*.36,l=Math.hypot(e.x,e.y);if(l>lim){e.x*=lim/l;e.y*=lim/l;e.vx*=-.5;e.vy*=-.5;}}
    if(e.kind==='iris'){e.pupil.rotation.set(-e.y/e.er*1.1,e.x/e.er*1.1,0);e.top.rotation.x=lerp(-.55,1.5,bl)+(c.biteT>0?.25:0);e.bot.rotation.x=lerp(.7,.15,bl);}
    else{const r0=e.er*.62;e.pupil.position.set(e.x,e.y,Math.sqrt(Math.max(0,r0*r0-e.x*e.x-e.y*e.y)));}}
  for(const j of v.jaws)j.rotation.x=c.biteT>0?Math.sin((.3-c.biteT)/.3*Math.PI)*.75:(c.state==='dead'?.5:.06+Math.sin(time*2+v.phase)*.04+breathe*2);
  for(const a of v.arms)a.g.rotation.y=c.slashT>0?a.side*Math.sin((.3-c.slashT)/.3*Math.PI)*1.0:Math.sin(v.phase+a.side)*.2*walk;
  for(const w of v.weapons){const t=c.swingT>0?1-c.swingT/.35:-1;let rx=w.base+Math.sin(time*2.2+v.phase*.3)*.06+Math.sin(v.phase)*.12*walk,ry=0,pz=0;
    if(t>=0){const e=Math.sin(t*Math.PI);if(w.k==='noodle'||w.k==='blaster'){pz=e*(w.k==='noodle'?.45:.12);rx=w.base-e*.2;}else if(w.k==='spatula'){rx=w.base+e*1.3-Math.sin(t*TAU)*.4;}else if(w.k==='bone'){ry=-e*1.6;rx=w.base-e*.6;}else if(w.k==='fish'){ry=-Math.sin(t*TAU*.75)*1.3;}else{rx=w.base-Math.sin(t*Math.PI*.5)*1.6+(t>.5?(t-.5)*3.2:0);}}
    if(c.boneOut&&w.k==='bone')w.g.children[w.g.children.length-1].visible=false;else if(w.k==='bone')w.g.children[w.g.children.length-1].visible=true;
    w.g.rotation.x=lerp(w.g.rotation.x,rx,1-Math.exp(-dt*22));w.g.rotation.y=lerp(w.g.rotation.y,ry,1-Math.exp(-dt*22));w.g.position.z=pz;}
  for(const pc of v.pincers){const open=c.slashT>0?Math.sin((.3-c.slashT)/.3*Math.PI)*.6:.18+Math.sin(time*3)*.05;for(const h of pc)h.h.rotation.y=-h.s*(.1+open);}
  for(const t of v.tails)t.forEach((s,i)=>{s.rotation.y=Math.sin(time*3-i*.7)*(.14+walk*.14)*(1+i*.15);s.rotation.x=Math.sin(time*2-i)*.05+(c.state==='dead'?0:-.03*i);});
  for(const w of v.wings)w.rotation.x=.25+Math.sin(time*(grounded?5:24))*(grounded?.22:.7);
  for(const f of v.fins)f.rotation.x=Math.sin(time*6+f.id)*.35;
  for(const g of v.glands){const pulse=1+Math.sin(time*(g.k==='heal'?3:5))*.08+(g.k==='spit'&&c.spitT>0?.35:0);if(g.m.material.emissiveIntensity!=null&&g.k!=='ink'&&g.k!=='inflate')g.m.material.emissiveIntensity=(g.k==='heal'?1.2+Math.sin(time*3)*.5:g.k==='shield'?1.4+Math.sin(time*2)*.6:1.2+(c.spitT>0?2:0));
    if(g.k!=='shield')g.m.scale.setScalar(g.base*pulse*(g.k==='inflate'&&c.inflateT>0?1.6:1));else g.m.rotation.z+=dt*1.5;}
  for(const z of v.zaps){const f=c.zapT>0?2.5+Math.random()*3:1+Math.sin(time*9)*.3+(Math.random()<.03?1.5:0);z.scale.setScalar(.1*(c.zapT>0?1.5:1));z.material.color.setRGB(.5*f,.9*f,1.0*f);}
  for(const m of v.crests){m.emissiveIntensity=c.camoT>0?1.5+Math.sin(time*12):.2+Math.sin(time*2)*.1;}
  for(const p of v.props)p.rotation.z+=dt*(8+sp*3);
  v.shield.visible=(c.shield||0)>0;if(v.shield.visible){const s=Math.max(v.R[0],v.R[1],v.R[2])*1.75*(1+Math.sin(time*6)*.03);v.shield.scale.setScalar(s);}
  v.stars.visible=c.state==='downed';if(v.stars.visible)v.stars.rotation.y+=dt*4;
  v.flash=Math.max(0,(v.flash||0)-dt*5);const vn=c.venomT>0?.25+.15*Math.sin(time*10):0;const bls=c.blessT>0?.12+.08*Math.sin(time*4):0;const cm=c.camoT>0?.35+.25*Math.sin(time*15):0;
  v.bodyMat.emissive.setRGB(v.flash*.9+bls*1.2,v.flash*.9+vn+bls*.8+cm*.8,v.flash*.9+cm);
  if(c.state==='dead'&&c.deadT>6){const s=Math.max(.01,1-(c.deadT-6)/3);r.scale.setScalar(s);}else r.scale.setScalar(1);
}

/* =========================================================
   Portraits & part thumbnails (second, small renderer)
   ========================================================= */
const Portrait={pr:null,scene:null,cam:null,cache:{},silMat:null,
  init(){if(this.pr!==null)return !!this.pr;try{const pc=document.createElement('canvas');pc.width=pc.height=192;
    const pr=new T.WebGLRenderer({canvas:pc,antialias:true,alpha:true,preserveDrawingBuffer:true});pr.outputEncoding=T.sRGBEncoding;pr.toneMapping=T.ACESFilmicToneMapping;pr.toneMappingExposure=1.1;pr.setPixelRatio(1);pr.setSize(192,192,false);
    const ps=new T.Scene();const pm=new T.PMREMGenerator(pr);const es=new T.Scene();es.add(new T.Mesh(new T.SphereGeometry(20,16,8),new T.MeshBasicMaterial({color:col('#203070'),side:T.BackSide})));
    const kp=new T.Mesh(new T.PlaneGeometry(14,10),new T.MeshBasicMaterial({color:new T.Color(6,6,6),side:T.DoubleSide}));kp.position.set(-8,12,10);kp.lookAt(0,0,0);es.add(kp);
    const rp=new T.Mesh(new T.PlaneGeometry(10,10),new T.MeshBasicMaterial({color:new T.Color(1,3.5,4),side:T.DoubleSide}));rp.position.set(10,4,-10);rp.lookAt(0,0,0);es.add(rp);
    ps.environment=pm.fromScene(es,.03).texture;
    ps.add(new T.HemisphereLight(0xdde8ff,0x302040,.7));const kl=new T.DirectionalLight(0xffffff,2.2);kl.position.set(-4,8,6);ps.add(kl);const rl=new T.DirectionalLight(0x55f0ff,1.6);rl.position.set(5,3,-6);ps.add(rl);
    this.pr=pr;this.scene=ps;this.cam=new T.PerspectiveCamera(30,1,.05,100);this.silMat=new T.MeshBasicMaterial({color:0x0b0f24});this.canvas=pc;return true;}catch(e){this.pr=false;return false;}},
  frame(obj,yaw,fill){const box=new T.Box3().setFromObject(obj);const c=box.getCenter(new T.Vector3()),sz=box.getSize(new T.Vector3());const r=Math.max(sz.x,sz.y,sz.z)*(fill||1)||1;
    const dist=r*2.1+.2;this.cam.position.set(c.x+Math.sin(yaw)*dist,c.y+r*.45,c.z+Math.cos(yaw)*dist);this.cam.lookAt(c);},
  design(d,sil,size){if(!this.init())return '';size=size||192;const key=(sil?'S':'D')+size+JSON.stringify([d.body,d.color,d.accent,d.pattern,d.parts,d.seed]);if(this.cache[key])return this.cache[key];
    if(size!==192)this.pr.setSize(size,size,false);
    const v=buildCreatureView(d,{});v.cshadow.visible=false;v.root.rotation.y=-.6;this.scene.add(v.root);v.root.updateMatrixWorld(true);this.frame(v.root,0,.9);
    if(sil)this.scene.overrideMaterial=this.silMat;this.pr.render(this.scene,this.cam);this.scene.overrideMaterial=null;
    const url=this.canvas.toDataURL('image/png');this.scene.remove(v.root);disposeView(v);if(size!==192)this.pr.setSize(192,192,false);this.cache[key]=url;return url;},
  part(id){if(!this.init())return '';const key='P'+id;if(this.cache[key])return this.cache[key];const def=PARTS[id];
    const d={color:'#ff8a3d',accent:'#55c8ff',body:{w:1,h:1,l:1},parts:[],seed:1,pattern:'plain'};const g=new T.Group();const sk=skinMat(d.color,'pebble'),ac=skinMat(d.accent,'pebble',{clearcoat:.55});
    if(def.mount==='leg'){const L=legBuild(def,1,1,sk,ac);g.add(L.hip);}
    else{const b=BUILDERS[def.build](Object.assign({def,s:1,d,b:d.body,solid:sk,acc:ac,vown:x=>x}));
      if(def.mount==='cover'){const bm=new T.Mesh(sphereG(),skinMat('#7a86a8','pebble'));bm.scale.set(.98,.98,.98);g.add(bm);}
      g.add(b.g);if(['eye','jaw','beak','nose','stache','bow'].includes(def.build))g.rotation.y=-.5;else g.rotation.y=-1.1;}
    this.scene.add(g);g.updateMatrixWorld(true);this.frame(g,0,1);this.pr.render(this.scene,this.cam);const url=this.canvas.toDataURL('image/png');this.scene.remove(g);this.cache[key]=url;return url;},
};
