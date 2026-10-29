'use strict';
/* Creature Clash — accessibility: settings panel, presets, team palettes, captions, announcements, key remapping, focus handling */
const PALETTES={
  default:{label:'Blue vs Red',blue:['#3ba7ff','Blue'],red:['#ff4d5e','Red']},
  deutan:{label:'Blue vs Orange (red-green safe)',blue:['#3d7dff','Blue'],red:['#ff9f1c','Orange']},
  tritan:{label:'Teal vs Pink (blue-yellow safe)',blue:['#1fc7c1','Teal'],red:['#ff4fa3','Pink']},
};
const KEY_ACTIONS=[['forward','Move forward'],['back','Move back'],['left','Move left'],['right','Move right'],['jump','Jump and glide'],['dodge','Dodge'],['atk1','Attack 1'],['atk2','Attack 2'],['atk3','Attack 3'],['atk4','Attack 4'],['special','Special ability'],['revive','Revive teammate'],['lock','Lock on'],['pause','Pause']];
function keyName(code){if(!code)return '—';const m={Space:'Space',ShiftLeft:'Left Shift',ShiftRight:'Right Shift',ControlLeft:'Left Ctrl',ControlRight:'Right Ctrl',AltLeft:'Left Alt',AltRight:'Right Alt',Tab:'Tab',Enter:'Enter',Backspace:'Backspace',CapsLock:'Caps Lock',ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',BracketLeft:'[',BracketRight:']',Minus:'-',Equal:'='};
  if(m[code])return m[code];if(code.startsWith('Key'))return code.slice(3);if(code.startsWith('Digit'))return code.slice(5);if(code.startsWith('Numpad'))return 'Num '+code.slice(6);return code;}

function applyA11y(){
  const b=document.body;b.classList.toggle('hc',!!A11Y.contrast);b.classList.toggle('rm',!!A11Y.reduceMotion);
  document.documentElement.style.setProperty('--ui',String(A11Y.uiScale));
  const p=PALETTES[A11Y.palette]||PALETTES.default;for(const t of ['blue','red']){TEAMS[t].hex=p[t][0];TEAMS[t].name=p[t][1];document.documentElement.style.setProperty('--'+t,p[t][0]);}
  $('#tnBlue').textContent=TEAMS.blue.name+' nests';$('#tnRed').textContent=TEAMS.red.name+' nests';$('#bBlueTitle').textContent=TEAMS.blue.name+' team';$('#bRedTitle').textContent=TEAMS.red.name+' team';
  if(bloomPass)bloomPass.strength=A11Y.flashes&&!A11Y.reduceMotion?.6:.38;
  renderControlsHelp();
}
function renderControlsHelp(){const K=A11Y.keys,k=c=>'<kbd>'+esc(keyName(c))+'</kbd>';
  $('#controlsText').innerHTML='<b>Move</b> '+k(K.forward)+k(K.left)+k(K.back)+k(K.right)+' · <b>Camera</b> mouse or '+k('ArrowLeft')+k('ArrowRight')+' · <b>Attacks</b> left click, right click, '+k(K.atk1)+'–'+k(K.atk4)+' · <b>Special</b> '+k(K.special)+'<br><b>Jump</b> '+k(K.jump)+' ('+(A11Y.toggleGlide?'press again in the air':'hold')+' to glide with wings) · <b>Dodge</b> '+k(K.dodge)+' · <b>Lock on</b> '+k(K.lock)+' · <b>Revive</b> '+(A11Y.toggleRevive?'press':'hold')+' '+k(K.revive)+' · <b>Pause</b> '+k(K.pause)+(DEV_BUILD?' · <b>Dev console</b> '+k('ControlLeft')+'+'+k('ShiftLeft')+'+'+k('KeyC'):'');}

/* ---------- screen reader announcements & sound captions ---------- */
let annQ=[],annT=0;const srLive=$('#srLive');
function announce(text){if(!A11Y.announce||!text)return;const t=String(text).replace(/<[^>]+>/g,'').trim();if(!t||annQ.includes(t))return;annQ.push(t);if(annQ.length>4)annQ.shift();}
setInterval(()=>{if(!annQ.length)return;srLive.textContent=annQ.shift();},900);
const CAPTION_TEXT={geyser:'Geyser rumbling',nest:'Nest cracked',flop:'Heavy thud',zap:'Electric zap',spit:'Goo spit',ink:'Ink cloud',burrow:'Digging underground',popup:'Something burst out of the ground',death:'Creature defeated',downed:'Creature downed',revive:'Teammate revived',heal:'Healing chime',shield:'Shield bubble',charge:'Charging stomp',inflate:'Puffing up',camo:'Creature vanished',drop:'Part drop chime',win:'Victory fanfare',lose:'Defeat jingle'};
const capEl=$('#captions');const capSeen={};
function addCaption(name,at,vol){if(phase!=='battle'||!CAPTION_TEXT[name]||vol<.12)return;const now=performance.now();if(capSeen[name]&&now-capSeen[name]<1200)return;capSeen[name]=now;
  let dir='';if(at&&match&&match.player){const dx=at.x-cam.fx,dz=at.z-cam.fz;if(Math.hypot(dx,dz)>3){const rel=angDiff(cam.yaw,Math.atan2(dx,dz));dir=Math.abs(rel)<.6?'Ahead':Math.abs(rel)>2.5?'Behind':rel>0?'Left':'Right';}}
  const d=document.createElement('div');d.className='cap';d.innerHTML=(dir?'<span class="capdir">'+dir+'</span>':'')+esc(CAPTION_TEXT[name])+(vol<.4?' <span class="capfar">(far)</span>':'');capEl.appendChild(d);while(capEl.children.length>3)capEl.firstChild.remove();setTimeout(()=>d.remove(),3200);}

/* ---------- focus handling for dialogs ---------- */
const MODALS=['howto','a11y','welcome','pause','death','results','profile'];
function visibleModal(){for(let i=MODALS.length-1;i>=0;i--){const el=$('#'+MODALS[i]);if(el&&!el.hidden)return el;}return null;}
function focusables(el){return Array.from(el.querySelectorAll('button,input,select,[href],[tabindex]:not([tabindex="-1"])')).filter(x=>!x.disabled&&!x.hidden&&x.offsetParent!==null);}
const lastFocus={};
for(const id of MODALS){const el=$('#'+id);if(!el)continue;new MutationObserver(()=>{if(!el.hidden){lastFocus[id]=document.activeElement;setTimeout(()=>{const f=focusables(el);(el.querySelector('[data-autofocus]')||f[0]||el).focus();},30);}else if(lastFocus[id]&&lastFocus[id].focus&&document.contains(lastFocus[id])){try{lastFocus[id].focus();}catch(e){}}}).observe(el,{attributes:true,attributeFilter:['hidden']});}
addEventListener('keydown',e=>{const m=visibleModal();if(!m)return;
  if(e.key==='Tab'){const f=focusables(m);if(!f.length)return;const i=f.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();const n=f[(i+(e.shiftKey?-1:1)+f.length)%f.length];n.focus();}
  else if(e.key==='Escape'&&(m.id==='a11y'||m.id==='welcome'||m.id==='howto')&&!rebinding){e.preventDefault();e.stopImmediatePropagation();closeA11y();$('#welcome').hidden=true;$('#howto').hidden=true;}
  else if(e.key==='Escape'&&m.id==='profile'){e.preventDefault();e.stopImmediatePropagation();Profile.later();}},true);

/* ---------- accessibility panel ---------- */
let rebinding=null;
function openA11y(){renderA11y();$('#a11y').hidden=false;exitLock();if(phase==='battle'&&match&&!match.over&&!paused)openPause();}
function closeA11y(){$('#a11y').hidden=true;rebinding=null;}
function sw(id,label,desc,val){return '<label class="opt"><input type="checkbox" id="'+id+'"'+(val?' checked':'')+'><div><b>'+label+'</b><span>'+desc+'</span></div></label>';}
function renderA11y(){
  const P=Object.keys(PALETTES).map(k=>'<option value="'+k+'"'+(A11Y.palette===k?' selected':'')+'>'+esc(PALETTES[k].label)+'</option>').join('');
  const sizes=[[.9,'Smaller'],[1,'Standard'],[1.15,'Large'],[1.3,'Larger'],[1.5,'Largest']].map(([v,l])=>'<option value="'+v+'"'+(Math.abs(A11Y.uiScale-v)<.01?' selected':'')+'>'+l+' ('+Math.round(v*100)+'%)</option>').join('');
  const speeds=[[1,'Normal'],[.85,'85%'],[.7,'70%'],[.55,'55%']].map(([v,l])=>'<option value="'+v+'"'+(Math.abs(A11Y.gameSpeed-v)<.01?' selected':'')+'>'+l+'</option>').join('');
  $('#a11yBody').innerHTML=
   '<div class="presets" role="group" aria-label="Quick presets"><span class="sect">Quick presets</span><div class="row">'+
     '<button class="btn ghost small" data-preset="vision">Easier to see</button><button class="btn ghost small" data-preset="color">Colorblind friendly</button><button class="btn ghost small" data-preset="motion">Motion sensitive</button><button class="btn ghost small" data-preset="motor">Easier controls</button><button class="btn ghost small" data-preset="reset">Reset all</button></div></div>'+
   '<div class="sect">Display</div>'+
     '<label class="fieldrow"><span><b>Interface size</b><small>Makes menus, HUD and labels bigger.</small></span><select id="a_ui">'+sizes+'</select></label>'+
     '<label class="fieldrow"><span><b>Team colors</b><small>Teams also use shapes: circles for your team, diamonds for enemies.</small></span><select id="a_pal">'+P+'</select></label>'+
     sw('a_hc','High contrast','Solid panels, brighter text and thicker outlines.',A11Y.contrast)+
     sw('a_rm','Reduce motion','No camera shake, menu animations or auto-rotating previews.',A11Y.reduceMotion)+
     sw('a_fl','Screen flashes and strong glow','Red damage flash and bright bloom. Turn off if flashes bother you.',A11Y.flashes)+
   '<div class="sect">Sound and reading</div>'+
     sw('a_cap','Sound captions','Shows important sounds on screen with their direction.',A11Y.captions)+
     sw('a_ann','Screen reader announcements','Reads out kills, nests, objectives and countdowns.',A11Y.announce)+
   '<div class="sect">Gameplay</div>'+
     '<label class="fieldrow"><span><b>Game speed</b><small>Slows battles and challenges down. Does not change rewards.</small></span><select id="a_spd">'+speeds+'</select></label>'+
     sw('a_aim','Aim assist','Attacks turn toward the nearest enemy in front of you.',A11Y.aimAssist)+
     sw('a_lock','Automatic lock-on','Locks onto the nearest visible enemy for you.',A11Y.autoLock)+
     sw('a_trev','Toggle revive','Press once to start reviving instead of holding.',A11Y.toggleRevive)+
     sw('a_tgl','Toggle glide','Press jump again in the air to glide instead of holding.',A11Y.toggleGlide)+
   '<div class="sect">Camera</div>'+
     '<label class="fieldrow"><span><b>Camera sensitivity</b><small>'+Math.round(A11Y.sens*100)+'%</small></span><input type="range" id="a_sens" min=".3" max="2" step=".05" value="'+A11Y.sens+'"></label>'+
     sw('a_inv','Invert vertical camera','Moving the mouse up looks down.',A11Y.invertY)+
   '<div class="sect">Keyboard controls</div><div class="keys">'+KEY_ACTIONS.map(([k,l])=>'<div class="keyrow"><span>'+l+'</span><button class="btn ghost small keybtn" data-key="'+k+'" aria-label="'+l+': '+esc(keyName(A11Y.keys[k]))+'. Press to change.">'+esc(keyName(A11Y.keys[k]))+'</button></div>').join('')+'</div>'+
   '<div class="row"><button class="btn ghost small" id="a_keysReset">Reset keys</button></div>';
  const on=(id,f)=>{const el=$('#'+id);el.addEventListener('change',()=>{f(el);saveA11y();applyA11y();if(id==='a_sens')renderA11y();});};
  on('a_ui',el=>A11Y.uiScale=+el.value);on('a_pal',el=>{A11Y.palette=el.value;});on('a_hc',el=>A11Y.contrast=el.checked);on('a_rm',el=>A11Y.reduceMotion=el.checked);on('a_fl',el=>A11Y.flashes=el.checked);
  on('a_cap',el=>A11Y.captions=el.checked);on('a_ann',el=>A11Y.announce=el.checked);on('a_spd',el=>A11Y.gameSpeed=+el.value);on('a_aim',el=>A11Y.aimAssist=el.checked);on('a_lock',el=>A11Y.autoLock=el.checked);
  on('a_trev',el=>A11Y.toggleRevive=el.checked);on('a_tgl',el=>A11Y.toggleGlide=el.checked);on('a_sens',el=>A11Y.sens=+el.value);on('a_inv',el=>A11Y.invertY=el.checked);
  $$('#a11yBody [data-preset]').forEach(b=>b.addEventListener('click',()=>{applyPreset(b.dataset.preset);sfx('ui');}));
  $$('#a11yBody .keybtn').forEach(b=>b.addEventListener('click',()=>{rebinding=b.dataset.key;b.textContent='Press a key…';b.classList.add('listening');$('#a11yNote').textContent='Press the new key for '+KEY_ACTIONS.find(x=>x[0]===rebinding)[1]+'. Escape cancels.';}));
  $('#a_keysReset').addEventListener('click',()=>{A11Y.keys=clone(A11Y_DEFAULT.keys);saveA11y();applyA11y();renderA11y();announce('Keys reset to defaults');});
  if(phase==='battle'&&match)buildAbilityBar();
}
function applyPreset(k){
  if(k==='vision'){A11Y.uiScale=Math.max(A11Y.uiScale,1.3);A11Y.contrast=true;A11Y.captions=true;}
  else if(k==='color'){A11Y.palette='deutan';}
  else if(k==='motion'){A11Y.reduceMotion=true;A11Y.flashes=false;}
  else if(k==='motor'){A11Y.aimAssist=true;A11Y.autoLock=true;A11Y.toggleRevive=true;A11Y.toggleGlide=true;A11Y.gameSpeed=.85;}
  else if(k==='reset'){const keys=A11Y.keys;Object.assign(A11Y,clone(A11Y_DEFAULT));A11Y.keys=keys;A11Y.welcomed=true;}
  saveA11y();applyA11y();renderA11y();announce('Preset applied');$('#a11yNote').textContent='Preset applied. You can fine-tune anything below.';
}
addEventListener('keydown',e=>{if(!rebinding)return;e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='Escape'){rebinding=null;renderA11y();$('#a11yNote').textContent='';return;}
  const clash=Object.keys(A11Y.keys).find(k=>k!==rebinding&&A11Y.keys[k]===e.code);if(clash)A11Y.keys[clash]=A11Y.keys[rebinding];
  A11Y.keys[rebinding]=e.code;const name=KEY_ACTIONS.find(x=>x[0]===rebinding)[1];rebinding=null;saveA11y();applyA11y();renderA11y();
  $('#a11yNote').textContent=name+' is now '+keyName(e.code)+(clash?'. Swapped with '+KEY_ACTIONS.find(x=>x[0]===clash)[1]+'.':'.');announce($('#a11yNote').textContent);},true);
$('#a11yClose').addEventListener('click',()=>{sfx('ui');closeA11y();});
$('#mA11y').addEventListener('click',()=>{AudioFX.init();sfx('ui');openA11y();});
$('#pA11y').addEventListener('click',()=>{sfx('ui');openA11y();});
$('#welcomeA11y').addEventListener('click',()=>{A11Y.welcomed=true;saveA11y();$('#welcome').hidden=true;openA11y();});
/* Walkthrough: the intro cutscene, then How to play. The tour no longer starts by itself. */
let walkthroughPending=false;
$('#a11yWalk').addEventListener('click',()=>{sfx('ui');closeA11y();walkthroughPending=true;AudioFX.init();startIntro();});
function finishWalkthrough(){if(!walkthroughPending)return;walkthroughPending=false;$('#howto').hidden=false;}
$('#welcomePlay').addEventListener('click',()=>{A11Y.welcomed=true;saveA11y();$('#welcome').hidden=true;if(typeof Profile!=='undefined')Profile.maybeShow();});
$$('#welcome [data-preset]').forEach(b=>b.addEventListener('click',()=>{applyPreset(b.dataset.preset);b.classList.add('on');b.setAttribute('aria-pressed','true');}));
applyA11y();
function showWelcomeIfNeeded(){if(!A11Y.welcomed&&phase==='menu')$('#welcome').hidden=false;}
