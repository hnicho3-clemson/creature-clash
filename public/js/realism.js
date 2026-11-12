'use strict';
/* Creature Clash — Remaster material library.
   The look follows the Unreal Engine 5 Ocarina of Time fan remake: scanned-style rock, moss, bark and soil materials,
   dense card foliage, volumetric light shafts and soft bounced light. Everything here is generated in the browser:
   tileable textures are painted from noise once at load, and a triplanar shader wraps them onto any shape
   (so rocks, creatures and tree trunks need no UVs) with moss growing on upward faces. */
const REAL=true;
LP.sph=[36,24];LP.rad=20;LP.tube=24;LP.torR=12;LP.torT=40;LP.circ=32; // smooth primitives again

/* ---------- tileable noise (periodic, so every texture wraps without seams) ---------- */
function pHash(i,j,s){let h=(i*374761393+j*668265263+s*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function pNoise(x,y,Px,Py,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const mx=k=>((k%Px)+Px)%Px,my=k=>((k%Py)+Py)%Py;const a=pHash(mx(xi),my(yi),s),b=pHash(mx(xi+1),my(yi),s),c=pHash(mx(xi),my(yi+1),s),d=pHash(mx(xi+1),my(yi+1),s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function pFbm(u,v,Px,Py,oct,s){let t=0,a=.5,n=0,f=1;for(let o=0;o<oct;o++){t+=pNoise(u*Px*f,v*Py*f,Px*f,Py*f,s+o*17)*a;n+=a;a*=.5;f*=2;}return t/n;}
function pVor(u,v,N,s){const x=u*N,y=v*N;const xi=Math.floor(x),yi=Math.floor(y);let f1=9,f2=9,id=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=xi+i,cy=yi+j;const mx=((cx%N)+N)%N,my=((cy%N)+N)%N;const px=cx+pHash(mx,my,s),py=cy+pHash(mx,my,s+7);
    const dx=px-x,dy=py-y;const d=Math.sqrt(dx*dx+dy*dy);if(d<f1){f2=f1;f1=d;id=pHash(mx,my,s+3);}else if(d<f2)f2=d;}return [f1,f2,id];}
// 3D value noise for shaping geometry
function h3(x,y,z,s){let h=(x*374761393+y*668265263+z*2147483647+s*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function vn3(x,y,z,s){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const xf=x-xi,yf=y-yi,zf=z-zi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const L=(a,b,t)=>a+(b-a)*t;const c=(i,j,k)=>h3(xi+i,yi+j,zi+k,s);
  return L(L(L(c(0,0,0),c(1,0,0),u),L(c(0,1,0),c(1,1,0),u),v),L(L(c(0,0,1),c(1,0,1),u),L(c(0,1,1),c(1,1,1),u),v),w);}
function fbm3(x,y,z,oct,s){let t=0,a=.5,n=0,f=1;for(let o=0;o<oct;o++){t+=vn3(x*f,y*f,z*f,s+o*31)*a;n+=a;a*=.5;f*=2.03;}return t/n;}

/* ---------- texture painting ---------- */
const RTEX={};
function dataTex(W,H,data,srgb){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const id=x.createImageData(W,H);id.data.set(data);x.putImageData(id,0,0);
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(srgb)t.encoding=T.sRGBEncoding;return t;}
/* fn(u,v) -> [r,g,b,height]; albedo is stored linear around 0.5 so the shader can use it as a x2 detail multiplier on any tint */
function genMaps(W,fn,nStr){const N=W*W;const hh=new Float32Array(N);const C=new Uint8ClampedArray(N*4);
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const o=fn(x/W,y/W);const i=y*W+x;hh[i]=o[3];C[i*4]=o[0]*255;C[i*4+1]=o[1]*255;C[i*4+2]=o[2]*255;C[i*4+3]=255;}
  const Nm=new Uint8ClampedArray(N*4);
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const i=y*W+x;const l=hh[y*W+(x-1+W)%W],r=hh[y*W+(x+1)%W],u=hh[((y-1+W)%W)*W+x],d=hh[((y+1)%W)*W+x];
    let nx=(l-r)*nStr,ny=(d-u)*nStr,nz=1;const k=1/Math.hypot(nx,ny,nz);Nm[i*4]=(nx*k*.5+.5)*255;Nm[i*4+1]=(ny*k*.5+.5)*255;Nm[i*4+2]=(nz*k*.5+.5)*255;Nm[i*4+3]=255;}
  return {map:dataTex(W,W,C,false),normal:dataTex(W,W,Nm,false)};}
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function buildTextures(){
  if(RTEX.rock)return;const t0=performance.now();
  // ROCK: weathered granite — plates split by cracks, pitting, grain, faint lichen
  RTEX.rock=genMaps(512,(u,v)=>{const n=pFbm(u,v,3,3,6,1),n2=pFbm(u,v,12,12,4,9),n3=pFbm(u,v,40,40,2,13);
    const V=pVor(u,v,3,21);const e=V[1]-V[0];const cm=sm(.42,.6,pFbm(u,v,5,5,3,44));const crack=(1-sm(0,.035,e))*cm;
    const G=pVor(u,v,34,7);const grain=G[2];const gs=sm(.5,.15,G[0]);
    const lich=sm(.66,.74,pFbm(u,v,5,5,3,77))*sm(.35,.6,n);
    const blot=pFbm(u,v,6,6,3,91);let l=.47+(n-.5)*.75+(n2-.5)*.3+(blot-.5)*.25+(V[2]-.5)*.12-crack*.34+(grain-.5)*.2*gs+(n3-.5)*.1;if(grain>.9)l-=.16*gs;if(grain<.07)l+=.14*gs;
    const cool=pFbm(u,v,2,2,2,5);let r=l*(1.03+.07*(1-cool)),g=l,b=l*(.92+.12*cool);
    r=r*(1-lich*.4)+lich*.42;g=g*(1-lich*.4)+lich*.41;b=b*(1-lich*.4)+lich*.26;
    return [r,g,b,n*.8+n2*.5+n3*.12+gs*(grain-.5)*.1+V[2]*.08-crack*.5];},9);
  // MOSS: soft clumps with fibres
  RTEX.moss=genMaps(256,(u,v)=>{const n=pFbm(u,v,5,5,5,4),fib=pFbm(u,v,64,64,2,8),fib2=pFbm(u,v,24,24,3,18);const c=pVor(u,v,14,5);const cl=1-sm(0,.6,c[0]);
    const l=.2+n*.28+fib*.22+cl*.18+(fib2-.5)*.12;return [l*1.0,l*1.1,l*.7,n*.35+fib*.35+cl*.6];},6);
  // BARK: vertical fibrous grooves
  RTEX.bark=genMaps(512,(u,v)=>{const w=pFbm(u,v,4,2,4,3);const g=Math.abs(Math.sin((u*9+w*1.6)*TAU));const ridge=1-Math.pow(g,.35);const fine=pFbm(u,v,32,8,3,11);const k=pFbm(u,v,8,3,3,19);
    const l=.34+ridge*.3+fine*.16+(k-.5)*.12;return [l*1.08,l*.98,l*.86,ridge*.7+fine*.3];},6);
  // GRASS GROUND: fine blades, clover spots and darker patches
  RTEX.grass=genMaps(512,(u,v)=>{const n=pFbm(u,v,6,6,5,2),f=pFbm(u,v,96,32,2,5),f2=pFbm(u,v,32,96,2,6);const c=pVor(u,v,26,9);const clov=c[2]>.82?sm(.32,.18,c[0]):0;
    const l=.4+(n-.5)*.34+(f+f2-1)*.22+clov*.18;return [l*.98,l*1.04,l*.86,f*.4+f2*.4+clov*.5+n*.2];},5);
  // DIRT: packed soil with small pebbles and roots
  RTEX.dirt=genMaps(512,(u,v)=>{const n=pFbm(u,v,6,6,5,3);const p=pVor(u,v,22,4);const pb=sm(.32,.14,p[0])*(p[2]>.55?1:0);const f=pFbm(u,v,48,48,2,8);
    const l=.42+(n-.5)*.26+pb*(.12+p[2]*.2)+(f-.5)*.12;return [l*1.05,l*.98,l*.9,n*.35+pb*.7+f*.15];},5);
  // low-frequency noise for macro variation and moss masks
  {const W=128,D=new Uint8ClampedArray(W*W*4);for(let y=0;y<W;y++)for(let x=0;x<W;x++){const v=pFbm(x/W,y/W,3,3,4,61)*255;const i=(y*W+x)*4;D[i]=D[i+1]=D[i+2]=v;D[i+3]=255;}RTEX.noise=dataTex(W,W,D,false);}
  RTEX.leaf=leafCard();RTEX.grassCard=grassCard();RTEX.fern=fernCard();
  if(DEV_BUILD)console.log('remaster textures',Math.round(performance.now()-t0)+'ms');
}
/* foliage cards are painted with the 2D canvas; they are pale and neutral so each biome tints them */
function cardTex(c){const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;}
function leafCard(){const W=512,c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d');const R=mulberry32(12);
  for(let i=0;i<110;i++){const a=R()*TAU,r=Math.sqrt(R())*215;const px=W/2+Math.cos(a)*r,py=W/2+Math.sin(a)*r;const L=26+R()*26,Wd=L*(.38+R()*.12);const v=150+R()*95;
    x.save();x.translate(px,py);x.rotate(R()*TAU);const g=x.createLinearGradient(-L,0,L,0);g.addColorStop(0,`rgb(${v*.82|0},${v*.86|0},${v*.7|0})`);g.addColorStop(1,`rgb(${v|0},${v|0},${v*.86|0})`);x.fillStyle=g;
    x.beginPath();x.moveTo(-L,0);x.quadraticCurveTo(0,-Wd,L,0);x.quadraticCurveTo(0,Wd,-L,0);x.fill();x.strokeStyle=`rgba(60,60,40,.35)`;x.lineWidth=1.2;x.beginPath();x.moveTo(-L,0);x.lineTo(L,0);x.stroke();x.restore();}
  return cardTex(c);}
function grassCard(){const W=256,c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d');const R=mulberry32(7);
  for(let i=0;i<75;i++){const bx=18+R()*220,h=110+R()*140,w=4+R()*6,lean=(R()-.5)*90;const g=x.createLinearGradient(0,W,0,W-h);const v=170+R()*80;g.addColorStop(0,'rgb(40,46,30)');g.addColorStop(.35,`rgb(${v*.7|0},${v*.78|0},${v*.55|0})`);g.addColorStop(1,`rgb(${v|0},${v|0},${v*.8|0})`);
    x.fillStyle=g;x.beginPath();x.moveTo(bx-w,W);x.quadraticCurveTo(bx-w*.5+lean*.3,W-h*.6,bx+lean,W-h);x.quadraticCurveTo(bx+w*.5+lean*.3,W-h*.6,bx+w,W);x.fill();}
  return cardTex(c);}
function fernCard(){const W=128,H=512,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.strokeStyle='rgb(120,130,80)';x.lineWidth=3;x.beginPath();x.moveTo(W/2,H);x.quadraticCurveTo(W/2+6,H/2,W/2,6);x.stroke();
  for(let i=0;i<26;i++){const t=i/26;const y=H-12-t*(H-30);const L=(1-t*.85)*54;for(const s of [-1,1]){const v=170+((i*37)%60);x.fillStyle=`rgb(${v*.8|0},${v*.9|0},${v*.6|0})`;x.save();x.translate(W/2+s*2,y);x.rotate(s*(1.25-t*.4));
    x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(L*.5,-7,L,0);x.quadraticCurveTo(L*.5,7,0,0);x.fill();x.restore();}}
  return cardTex(c);}

/* ---------- triplanar PBR (rock / bark / moss) ---------- */
const TP_COMMON='#ifdef TP_OBJECT\nuniform mat3 normalMatrix;\n#endif\nuniform sampler2D tpAlbedo,tpNormal,tpMossA,tpMossN,tpNoise;uniform float tpScale,tpMoss,tpMossLo,tpMossHi,tpNStr,tpRough;uniform vec3 tpMossCol;varying vec3 vTP,vTN;\n'+
 'vec3 tpTri(sampler2D t,vec3 p,vec3 w){return texture2D(t,p.zy).rgb*w.x+texture2D(t,p.xz).rgb*w.y+texture2D(t,p.xy).rgb*w.z;}\n'+
 'vec3 tpTriN(sampler2D t,vec3 p,vec3 w,vec3 n,float k){vec3 tx=texture2D(t,p.zy).xyz*2.-1.,ty=texture2D(t,p.xz).xyz*2.-1.,tz=texture2D(t,p.xy).xyz*2.-1.;tx.xy*=k;ty.xy*=k;tz.xy*=k;'+
 'tx=vec3(tx.xy+n.zy,abs(tx.z)*n.x);ty=vec3(ty.xy+n.xz,abs(ty.z)*n.y);tz=vec3(tz.xy+n.xy,abs(tz.z)*n.z);return normalize(tx.zyx*w.x+ty.xzy*w.y+tz.xyz*w.z);}\n';
const TP_VS_HEAD='varying vec3 vTP,vTN;\n';
const TP_VS_BODY='\n#ifdef TP_OBJECT\nvTP=position;vTN=normal;\n#else\n{vec4 tpw=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ntpw=instanceMatrix*tpw;\n#endif\ntpw=modelMatrix*tpw;vTP=tpw.xyz;vTN=normalize((vec4(transformedNormal,0.)*viewMatrix).xyz);}\n#endif\n';
function tpMat(o){o=o||{};buildTextures();const tx=RTEX[o.tex||'rock'];
  const m=new T.MeshStandardMaterial({color:o.tint?col(o.tint):0xffffff,roughness:1,metalness:0,vertexColors:!!o.vertexColors,envMapIntensity:o.env||1});
  m.userData.lp=true;m.userData.real=true;if(o.space==='object')m.defines={TP_OBJECT:''};
  const U={tpAlbedo:{value:tx.map},tpNormal:{value:tx.normal},tpMossA:{value:RTEX.moss.map},tpMossN:{value:RTEX.moss.normal},tpNoise:{value:RTEX.noise},
    tpScale:{value:o.scale||.6},tpMoss:{value:o.moss||0},tpMossLo:{value:o.mossLo!=null?o.mossLo:.3},tpMossHi:{value:o.mossHi!=null?o.mossHi:.75},tpNStr:{value:o.nStr||1},tpRough:{value:o.rough||.86},tpMossCol:{value:col(o.mossCol||'#6f8f36')}};
  m.userData.tpU=U;
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);if(o.uniforms)Object.assign(sh.uniforms,o.uniforms);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+TP_VS_HEAD+(o.vsHead||'')).replace('#include <worldpos_vertex>','#include <worldpos_vertex>'+TP_VS_BODY+(o.vsBody||''));
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+TP_COMMON+(o.fsHead||''))
     .replace('#include <map_fragment>','vec3 tpN0=normalize(vTN);vec3 tpW=pow(abs(tpN0),vec3(4.));tpW/=dot(tpW,vec3(1.));vec3 tpP=vTP*tpScale;\n'+
       'vec3 tpA=tpTri(tpAlbedo,tpP,tpW)*2.;float tpNz=tpTri(tpNoise,tpP*.11,tpW).r;\n'+
       'float tpM=smoothstep(tpMossLo,tpMossHi,tpN0.y+(tpNz-.5)*1.2)*tpMoss;vec3 tpMA=tpTri(tpMossA,tpP*1.4,tpW)*2.*tpMossCol;\n'+
       'vec3 tpNf=normalize(mix(tpTriN(tpNormal,tpP,tpW,tpN0,tpNStr),tpTriN(tpMossN,tpP*1.4,tpW,tpN0,tpNStr*.9),tpM));\n#include <map_fragment>')
     .replace('#include <color_fragment>','#include <color_fragment>\n'+(o.paint||'')+'\ndiffuseColor.rgb=mix(diffuseColor.rgb*tpA,tpMA,tpM)*(.82+.36*tpNz);')
     .replace('#include <normal_fragment_maps>','#ifdef TP_OBJECT\nnormal=normalize(normalMatrix*tpNf);\n#else\nnormal=normalize((viewMatrix*vec4(tpNf,0.)).xyz);\n#endif')
     .replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(tpRough*(.9+.2*(1.-tpA.g*.5)),.97,tpM);');
    if(o.extra)o.extra(sh);};
  m.customProgramCacheKey=()=>'tp'+(o.space||'w')+(o.key||'');return m;}

/* terrain: grass and soil blended by the path mask, mapped from above */
function groundMat(){buildTextures();const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,envMapIntensity:.7});m.userData.lp=true;m.userData.keep=true;
  const U={gGrass:{value:RTEX.grass.map},gGrassN:{value:RTEX.grass.normal},gDirt:{value:RTEX.dirt.map},gDirtN:{value:RTEX.dirt.normal},gNoise:{value:RTEX.noise}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float lane;varying float vLane;varying vec3 vGP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLane=lane;vGP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D gGrass,gGrassN,gDirt,gDirtN,gNoise;varying float vLane;varying vec3 vGP;')
     .replace('#include <map_fragment>','vec2 gUV=vGP.xz*.32;float gN=texture2D(gNoise,vGP.xz*.021).r;float gN2=texture2D(gNoise,vGP.xz*.09+.3).r;float gL=smoothstep(.38,.62,vLane+(gN2-.5)*.55);\n'+
       'vec3 gA=mix(texture2D(gGrass,gUV).rgb*mix(1.,texture2D(gGrass,gUV*.27).rgb.g*2.,.35),texture2D(gDirt,gUV*1.15).rgb,gL)*2.;vec3 gT=mix(texture2D(gGrassN,gUV).xyz,texture2D(gDirtN,gUV*1.15).xyz,gL)*2.-1.;\n#include <map_fragment>')
     .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=gA*(.8+.4*gN);')
     .replace('#include <normal_fragment_maps>','{vec3 gn=normalize(vec3(gT.x*1.3,1.,-gT.y*1.3));normal=normalize((viewMatrix*vec4(gn,0.)).xyz);}');};
  m.customProgramCacheKey=()=>'ground';return m;}

/* leaf / grass / fern cards: alpha-tested, two-sided, with a little light passing through (fake translucency and bounce) */
function cardMat(tex,o){o=o||{};const m=new T.MeshStandardMaterial({map:tex,alphaTest:o.alphaTest||.5,side:T.DoubleSide,roughness:o.rough||.78,metalness:0,envMapIntensity:.8});m.alphaToCoverage=true;m.userData.lp=true;m.userData.real=true;
  const k=o.trans!=null?o.trans:.22;m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <output_fragment>','outgoingLight+=diffuseColor.rgb*'+k.toFixed(2)+';\n#include <output_fragment>');};
  m.customProgramCacheKey=()=>'card'+k;return m;}
function cardDepth(tex,a){return new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:tex,alphaTest:a||.5});}

/* ---------- geometry ---------- */
// average normals across duplicated seam vertices so displaced spheres shade smoothly
function weldNormals(g){g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal;const acc=new Map();const key=i=>Math.round(p.getX(i)*1e4)+'_'+Math.round(p.getY(i)*1e4)+'_'+Math.round(p.getZ(i)*1e4);
  for(let i=0;i<p.count;i++){const k=key(i);const a=acc.get(k)||[0,0,0];a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);acc.set(k,a);}
  for(let i=0;i<p.count;i++){const a=acc.get(key(i));const l=Math.hypot(a[0],a[1],a[2])||1;n.setXYZ(i,a[0]/l,a[1]/l,a[2]/l);}n.needsUpdate=true;return g;}
/* a natural boulder: noisy sphere with a few softly sheared faces (like split stone), sunk flat at the base */
function rockShape(v,seed,o){o=o||{};let r=1+(fbm3(v.x*1.5+seed,v.y*1.5,v.z*1.5,5,seed|0)-.5)*(o.bump||.5);
  r+=Math.abs(fbm3(v.x*4+seed,v.y*4,v.z*4,3,(seed|0)+9)-.5)*-.12+(fbm3(v.x*9+seed,v.y*9,v.z*9,3,(seed|0)+23)-.5)*(o.fine!=null?o.fine:.07);
  const R=mulberry32((seed|0)*13+1);for(let k=0;k<(o.cuts||5);k++){const a=R()*TAU,e=(R()-.35)*1.2;const nx=Math.cos(a)*Math.cos(e),ny=Math.sin(e),nz=Math.sin(a)*Math.cos(e);const c=.62+R()*.2;const d=(v.x*nx+v.y*ny+v.z*nz)*r;
    if(d>c){const over=d-c;r-=over*(.8-.3*Math.exp(-over*8));}}
  return r;}
function rockGeo(seed,o){o=o||{};const g=new T.SphereGeometry(1,o.w||64,o.h||44);const p=g.attributes.position;const v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const r=rockShape(v,seed,o);let y=v.y*r*(o.sy||1);const fl=o.flat!=null?o.flat:-.55;if(y<fl)y=fl+(y-fl)*.15;p.setXYZ(i,v.x*r,y,v.z*r);}
  return weldNormals(g);}
// a cloud of leaf cards filling some ellipsoid blobs; normals point out of the canopy so it shades like a soft volume
function leafCloud(blobs,count,seed){const R=mulberry32(seed);const P=[],N=[],U=[],I=[];let tot=0;for(const b of blobs)tot+=b[3]*b[3]*b[3];
  const ctr=new T.Vector3();for(const b of blobs)ctr.add(new T.Vector3(b[0],b[1],b[2]).multiplyScalar(b[3]*b[3]*b[3]/tot));
  const tmp=new T.Vector3(),a1=new T.Vector3(),a2=new T.Vector3(),nn=new T.Vector3();
  for(let c=0;c<count;c++){let pick=R()*tot,b=blobs[0];for(const q of blobs){pick-=q[3]*q[3]*q[3];if(pick<=0){b=q;break;}}
    const d=new T.Vector3(R()*2-1,R()*2-1,R()*2-1).normalize();const rr=b[3]*(.45+.55*Math.sqrt(R()));const pos=new T.Vector3(b[0]+d.x*rr,b[1]+d.y*rr*(b[4]||.8),b[2]+d.z*rr);
    const s=(o=>o)(.75+R()*.6)*(b[5]||1.1);nn.copy(pos).sub(ctr).normalize().lerp(new T.Vector3(0,1,0),.25).normalize();
    tmp.set(R()*2-1,R()*2-1,R()*2-1).normalize();a1.crossVectors(tmp,nn.clone().lerp(tmp,.5).normalize()).normalize();a2.crossVectors(a1,tmp).normalize();
    const i0=P.length/3;for(const [sx,sy,uu,vv] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){P.push(pos.x+(a1.x*sx+a2.x*sy)*s,pos.y+(a1.y*sx+a2.y*sy)*s,pos.z+(a1.z*sx+a2.z*sy)*s);N.push(nn.x,nn.y,nn.z);U.push(uu,vv);}
    I.push(i0,i0+1,i0+2,i0,i0+2,i0+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeBoundingSphere();return g;}
// grass clump: three crossed cards with up-facing normals (lit like the ground they grow from)
function grassClumpGeo(w,h){const P=[],N=[],U=[],I=[];for(let k=0;k<3;k++){const a=k/3*Math.PI;const cx=Math.cos(a)*w*.5,cz=Math.sin(a)*w*.5;const i0=P.length/3;
  P.push(-cx,0,-cz, cx,0,cz, cx,h,cz, -cx,h,-cz);for(let j=0;j<4;j++)N.push(0,1,0);U.push(0,0,1,0,1,1,0,1);I.push(i0,i0+1,i0+2,i0,i0+2,i0+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);return g;}
// fern: arching fronds around a centre, each bent in two segments
function fernGeo(n){const P=[],N=[],U=[],I=[];for(let k=0;k<n;k++){const a=k/n*TAU+(k%2)*.3;const ca=Math.cos(a),sa=Math.sin(a);const L=1.1+(k%3)*.15,w=.2;const rx=-sa,rz=ca;
  const pts=[[0,0],[L*.55,L*.42],[L,L*.3]];const i0=P.length/3;pts.forEach(([d,h],j)=>{for(const s of [-1,1]){P.push(ca*d+rx*w*s,h,sa*d+rz*w*s);N.push(ca*.3,1,sa*.3);U.push(s<0?0:1,j/2);}});
  for(let j=0;j<2;j++){const b=i0+j*2;I.push(b,b+1,b+3,b,b+3,b+2);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g;}

/* stone takes the player's colour as a mineral cast: muted toward weathered grey-brown so it still reads as rock */
function stoneTint(hex,k){const c=new T.Color(hex);const g=new T.Color('#8c877c');return '#'+c.lerp(g,k==null?.32:k).getHexString();}
// filmic, natural grade for the remaster (the storybook build pushes saturation)
if(typeof finalPass!=='undefined'&&finalPass){finalPass.uniforms.sat.value=1.0;finalPass.uniforms.exposure.value=.95;finalPass.uniforms.vig.value=1.25;}
