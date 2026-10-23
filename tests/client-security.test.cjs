'use strict';
/* Creature Clash security regression tests. Run: node tests/security.test.js
   Negative tests feed malicious or corrupted data and expect it to be rejected or neutralised;
   positive tests check that normal saves and names still work. */
const fs=require('fs'),path=require('path'),assert=require('assert');
require('../public/js/security.js');const Sec=globalThis.Sec;
const ROOT=path.join(__dirname,'..');

let pass=0,fail=0;
function t(name,fn){try{fn();pass++;console.log('  ok  '+name);}catch(e){fail++;console.log('  FAIL '+name+'\n       '+e.message);}}

const PARTS={basicJaw:{mirror:false},shortLegs:{},fins:{},googlyEye:{}};
const CTX={partIds:PARTS,patterns:['spots','stripes','belly','plain'],maxParts:48};
const DEF_PROGRESS={v:2,dna:0,xp:0,level:1,unlocked:['basicJaw','shortLegs'],owned:['basicJaw','shortLegs'],campaign:{},daily:{},lastSlot:-1,stats:{matches:0,wins:0,kills:0}};
const DEF_A11Y={uiScale:1,contrast:false,palette:'default',reduceMotion:false,flashes:true,captions:false,announce:true,gameSpeed:1,aimAssist:false,autoLock:false,toggleRevive:false,toggleGlide:false,sens:1,invertY:false,welcomed:false,keys:{forward:'KeyW',jump:'Space'}};
const PAL={default:1,deutan:1,tritan:1};
const goodDesign={v:2,name:'Sir Shellby',color:'#55c8ff',accent:'#ffd23d',pattern:'spots',body:{w:1.1,h:.9,l:1.2},parts:[{id:'basicJaw',p:[0,-.2,.98],s:1,r:0,m:false},{id:'shortLegs',p:[.6,-.6,.4],s:1.2,r:.5,m:true}],seed:42};

console.log('Save parsing');
t('rejects __proto__ prototype pollution',()=>{const o=Sec.parse('{"__proto__":{"polluted":1},"a":{"constructor":{"prototype":{"x":1}}}}');assert.strictEqual(({}).polluted,undefined);assert.strictEqual(Object.getPrototypeOf(o),Object.prototype);assert.ok(!Object.prototype.hasOwnProperty.call(o.a,'constructor'));});
t('rejects oversized save data',()=>assert.throws(()=>Sec.parse('"'+'x'.repeat(Sec.MAX_SAVE_CHARS)+'"')));
t('rejects non-string input',()=>assert.throws(()=>Sec.parse(null)));
t('parses a normal save',()=>assert.deepStrictEqual(Sec.parse('{"dna":5}'),{dna:5}));

console.log('Creature names');
t('script tags kept as text, escaped on output',()=>{const n=Sec.cleanName('<img src=x onerror=alert(1)>');assert.strictEqual(Sec.esc(n).includes('<'),false);assert.ok(Sec.esc(n).startsWith('&lt;img'));});
t('caps names at 24 characters',()=>assert.strictEqual(Array.from(Sec.cleanName('A'.repeat(500))).length,24));
t('strips bidi override / zero-width spoofing',()=>assert.strictEqual(Sec.cleanName('Evil‮gnp.exe​'),'Evilgnp.exe'));
t('strips control characters and newlines',()=>assert.strictEqual(Sec.cleanName('Line1\n\r\u0000Line2'),'Line1 Line2'));
t('empty or whitespace name falls back',()=>{assert.strictEqual(Sec.cleanName('   '),'Unnamed');assert.strictEqual(Sec.cleanName(42),'Unnamed');});
t('keeps accents, emoji and punctuation',()=>assert.strictEqual(Sec.cleanName('Café Chömp 🦖 & "Co"'),'Café Chömp 🦖 & "Co"'));
t('emoji are not split when capping',()=>assert.ok(!/[\uD800-\uDBFF]$/.test(Sec.cleanName('🦖'.repeat(30)))));
t('esc covers single quotes too',()=>assert.strictEqual(Sec.esc(`'"<>&`),'&#39;&quot;&lt;&gt;&amp;'));

console.log('Creature designs');
t('valid design survives unchanged',()=>{const d=Sec.design(goodDesign,CTX);assert.strictEqual(d.name,'Sir Shellby');assert.strictEqual(d.parts.length,2);assert.strictEqual(d.body.w,1.1);assert.strictEqual(d.seed,42);});
t('HTML in colour value is rejected',()=>{const d=Sec.design({...goodDesign,color:'#fff" onmouseover="alert(1)',accent:'red;background:url(x)'},CTX);assert.strictEqual(d.color,'#55c8ff');assert.strictEqual(d.accent,'#ffd23d');});
t('unknown part ids are dropped',()=>{const d=Sec.design({...goodDesign,parts:[...goodDesign.parts,{id:'__proto__',p:[1,0,0]},{id:'<script>',p:[1,0,0]},{id:'toString',p:[1,0,0]}]},CTX);assert.strictEqual(d.parts.length,2);});
t('NaN / Infinity / huge numbers are clamped',()=>{const d=Sec.design({...goodDesign,body:{w:1e308,h:'x',l:-5},parts:[{id:'fins',p:[Infinity,0,0]},{id:'fins',p:[1,0,0],s:99,r:1e9}]},CTX);assert.deepStrictEqual(d.body,{w:1.6,h:1,l:.8});assert.strictEqual(d.parts.length,1);assert.strictEqual(d.parts[0].s,1.6);assert.ok(Math.abs(d.parts[0].r)<=Math.PI);});
t('part count capped to stop memory/CPU abuse',()=>{const many=Array.from({length:5000},()=>({id:'fins',p:[1,0,0]}));assert.strictEqual(Sec.design({...goodDesign,parts:many},CTX).parts.length,48);});
t('unknown pattern falls back',()=>assert.strictEqual(Sec.design({...goodDesign,pattern:'"><svg onload=alert(1)>'},CTX).pattern,'spots'));
t('extra fields are not carried over (mass assignment)',()=>{const d=Sec.design({...goodDesign,isAdmin:true,dna:9999},CTX);assert.strictEqual(d.isAdmin,undefined);assert.strictEqual(d.dna,undefined);});
t('slot list keeps nulls and drops garbage',()=>{const s=Sec.slots([goodDesign,null,'junk',7],CTX,64);assert.strictEqual(s.length,4);assert.ok(s[0]);assert.strictEqual(s[1],null);assert.strictEqual(s[2],null);});
t('non-array slots rejected',()=>assert.strictEqual(Sec.slots({0:goodDesign},CTX,64),null));
t('legit design round-trips exactly (no drift, blurb kept)',()=>{const d1=Sec.design({...goodDesign,blurb:'A tanky shell boi.'},CTX);const d2=Sec.design(JSON.parse(JSON.stringify(d1)),CTX);assert.deepStrictEqual(d2,d1);assert.strictEqual(d1.blurb,'A tanky shell boi.');});
t('missing mirror flag uses part default',()=>{const d=Sec.design({...goodDesign,parts:[{id:'basicJaw',p:[0,0,1]},{id:'fins',p:[1,0,0]}]},CTX);assert.strictEqual(d.parts[0].m,false);assert.strictEqual(d.parts[1].m,true);});

console.log('Progress (DNA, XP, parts)');
t('normal progress loads',()=>{const p=Sec.progress({dna:130,xp:40,level:3,unlocked:['basicJaw','fins'],owned:['basicJaw'],campaign:{wobbles:true},daily:{d20384:true},lastSlot:2,stats:{matches:4,wins:2,kills:7}},DEF_PROGRESS,PARTS);assert.strictEqual(p.dna,130);assert.ok(p.unlocked.includes('fins'));assert.strictEqual(p.campaign.wobbles,true);assert.strictEqual(p.lastSlot,2);});
t('negative / NaN / huge DNA clamped',()=>{assert.strictEqual(Sec.progress({dna:-500},DEF_PROGRESS,PARTS).dna,0);assert.strictEqual(Sec.progress({dna:1e300},DEF_PROGRESS,PARTS).dna,Sec.DNA_MAX);});
t('missing / non-number DNA means default profile',()=>assert.strictEqual(Sec.progress({dna:'999'},DEF_PROGRESS,PARTS),DEF_PROGRESS));
t('fake part ids removed from unlocked/owned',()=>{const p=Sec.progress({dna:0,unlocked:['hackPart',{}],owned:['__proto__']},DEF_PROGRESS,PARTS);assert.deepStrictEqual(p.unlocked,['basicJaw','shortLegs']);assert.deepStrictEqual(p.owned,['basicJaw','shortLegs']);});
t('campaign / daily keys allowlisted',()=>{const p=Sec.progress({dna:0,campaign:{'<b>x</b>':true,ok:'yes',good:true},daily:{evil:true,w12:true}},DEF_PROGRESS,PARTS);assert.deepStrictEqual(p.campaign,{good:true});assert.deepStrictEqual(p.daily,{w12:true});});
t('level and lastSlot bounded',()=>{const p=Sec.progress({dna:0,level:1e9,lastSlot:-99},DEF_PROGRESS,PARTS);assert.strictEqual(p.level,999);assert.strictEqual(p.lastSlot,-1);});

console.log('Settings');
t('accessibility settings keep valid values',()=>{const a=Sec.a11y({uiScale:1.3,palette:'deutan',contrast:true,keys:{jump:'KeyF'}},DEF_A11Y,PAL);assert.strictEqual(a.uiScale,1.3);assert.strictEqual(a.palette,'deutan');assert.strictEqual(a.contrast,true);assert.strictEqual(a.keys.jump,'KeyF');assert.strictEqual(a.keys.forward,'KeyW');});
t('CSS injection through uiScale blocked',()=>assert.strictEqual(Sec.a11y({uiScale:'1;}body{display:none'},DEF_A11Y,PAL).uiScale,1));
t('unknown palette and HTML key codes rejected',()=>{const a=Sec.a11y({palette:'constructor',keys:{jump:'<img src=x>'}},DEF_A11Y,PAL);assert.strictEqual(a.palette,'default');assert.strictEqual(a.keys.jump,'Space');});
t('unknown a11y fields ignored',()=>assert.strictEqual(Sec.a11y({evil:1},DEF_A11Y,PAL).evil,undefined));
t('game settings only accept booleans and known toggles',()=>{const s=Sec.settings({bloom:'false',shadows:false,toggles:{timerIsHardLimit:true,__proto__x:true,battleSec:true}},['timerIsHardLimit']);assert.deepStrictEqual(s,{shadows:false,toggles:{timerIsHardLimit:true}});});

console.log('Dev console');
t('addDNA default and normal amounts',()=>{assert.strictEqual(Sec.devAmount(undefined,10,1,1e5),10);assert.strictEqual(Sec.devAmount('100',10,1,1e5),100);});
t('addDNA rejects negatives, decimals, exponents, huge values, junk',()=>{for(const a of ['-50','1.5','1e9','999999999','abc','10;alert(1)','0x10'])assert.strictEqual(Sec.devAmount(a,10,1,1e5),null,a);});

console.log('Static checks on the shipped code');
const html=fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8');
const vercel=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));
const csp=vercel.headers.find(h=>h.source==='/(.*)').headers.find(h=>h.key==='Content-Security-Policy').value;
const js=fs.readdirSync(path.join(ROOT,'public','js')).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(path.join(ROOT,'public','js',f),'utf8')]);
t('site sends a strict Content-Security-Policy header (no inline or eval scripts, no framing)',()=>{assert.ok(/script-src 'self' https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.147\.0\/;/.test(csp));assert.ok(!/unsafe-eval/.test(csp));assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));assert.ok(/frame-ancestors 'none'/.test(csp));assert.ok(/object-src 'none'/.test(csp));assert.ok(/connect-src 'self'/.test(csp));});
t('HSTS, nosniff, frame and referrer headers are set',()=>{const keys=vercel.headers.find(h=>h.source==='/(.*)').headers.map(h=>h.key);for(const k of ['Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy'])assert.ok(keys.includes(k),k);});
t('third-party requests send no referrer',()=>{for(const m of html.matchAll(/<(script|link)[^>]+(src|href)="https:[^"]+"[^>]*>/g))if(!/preconnect/.test(m[0]))assert.ok(/referrerpolicy="no-referrer"/.test(m[0]),m[0]);});
t('every third-party script is pinned with Subresource Integrity',()=>{const ext=[...html.matchAll(/<script[^>]+src="https:[^"]+"[^>]*>/g)].map(m=>m[0]);assert.ok(ext.length>0);for(const s of ext){assert.ok(/integrity="sha384-[A-Za-z0-9+/=]{64}"/.test(s),'missing SRI: '+s);assert.ok(/crossorigin="anonymous"/.test(s));}});
t('no inline <script> blocks or inline event handlers in page',()=>{assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html));assert.ok(!/\son[a-z]+="/i.test(html));});
t('no page has inline scripts or inline event handlers (the CSP would block them)',()=>{for(const f of fs.readdirSync(path.join(ROOT,'public')).filter(f=>f.endsWith('.html'))){const h=fs.readFileSync(path.join(ROOT,'public',f),'utf8');assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(h),f);assert.ok(!/\son[a-z]+=["']/i.test(h),f);assert.ok(!/javascript:/i.test(h),f);}});
t('security.js loads before core.js',()=>assert.ok(html.indexOf('js/security.js')>0&&html.indexOf('js/security.js')<html.indexOf('js/core.js')));
t('no eval / new Function / document.write anywhere',()=>{for(const [f,s] of js)assert.ok(!/\beval\(|new Function\(|document\.write/.test(s),f);});
t('all localStorage reads go through the safe parser',()=>{for(const [f,s] of js){if(f==='security.js')continue;const raw=s.split('\n').filter(l=>l.includes('localStorage.getItem('));for(const r of raw)assert.ok(/Sec\.parse/.test(r),f+': '+r);}});
t('saved data is sanitised on load',()=>{const all=js.map(x=>x[1]).join('\n');for(const k of ['Sec.progress(','Sec.slots(','Sec.a11y(','Sec.settings('])assert.ok(all.includes(k),k);});
t('creature name input is sanitised',()=>assert.ok(js.find(x=>x[0]==='menus.js')[1].includes("ws.design.name=Sec.cleanName(e.target.value)")));
t('dev console and debug hooks only exist when opened with #dev',()=>{const core=js.find(x=>x[0]==='core.js')[1],menus=js.find(x=>x[0]==='menus.js')[1];assert.ok(/const DEV_BUILD=\(\(\)=>\{try\{return location\.hash==='#dev';/.test(core));assert.ok(menus.includes('function toggleDev(force){if(!DEV_BUILD){DEV.open=false;return;}'));assert.ok(menus.includes("if(e.key==='Enter'&&!DEV_BUILD)"));assert.ok(menus.includes('if(DEV_BUILD)window.__cc='));});
t('no hard-coded secrets or API keys',()=>{for(const [f,s] of js)assert.ok(!/sk-[A-Za-z0-9]{16}|api[_-]?key\s*[:=]\s*['"][^'"]{8}|BEGIN (RSA|PRIVATE)/i.test(s),f);});

console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
