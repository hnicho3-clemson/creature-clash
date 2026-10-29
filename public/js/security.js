'use strict';
/* Creature Clash — input and save-data hardening.
   Everything read back from localStorage (or typed into a field) is treated as untrusted:
   parsed without prototype keys, then rebuilt from an allowlist with type, range and length checks.
   Pure functions only, so they can be unit-tested outside the browser (see tests/security.test.js). */
(function(root){
  const MAX_SAVE_CHARS=262144;            // refuse to parse anything bigger than 256 KB
  const BAD_KEYS=new Set(['__proto__','constructor','prototype']);
  const NAME_MAX=24;
  const DNA_MAX=1e7, XP_MAX=1e9, LEVEL_MAX=999, STAT_MAX=1e9;
  const HEX=/^#[0-9a-fA-F]{6}$/;
  const KEY_CODE=/^[A-Za-z][A-Za-z0-9]{0,23}$/;
  const SLUG=/^[A-Za-z0-9_-]{1,32}$/;
  const ROT_KEY=/^[dw]\d{1,7}$/;

  const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const num=(v,lo,hi,d)=>(typeof v==='number'&&Number.isFinite(v))?Math.min(hi,Math.max(lo,v)):d;
  const int=(v,lo,hi,d)=>{const n=num(v,lo,hi,null);return n==null?d:Math.round(n);};
  const bool=(v,d)=>typeof v==='boolean'?v:d;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

  /* JSON.parse that drops __proto__ / constructor / prototype keys and oversized input */
  function parse(text){
    if(typeof text!=='string'||text.length>MAX_SAVE_CHARS)throw new Error('save rejected');
    return JSON.parse(text,(k,v)=>BAD_KEYS.has(k)?undefined:v);
  }

  /* Display text: Unicode-normalized, no control, bidi-override or zero-width characters, length-capped by code point.
     Legit characters (accents, emoji, punctuation like < & ") are kept; the UI escapes them on output. */
  function cleanText(s,max,fallback){
    if(typeof s!=='string')return fallback;
    let t=s.normalize('NFC')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g,' ')
      .replace(/[​-‏‪-‮⁠-⁩﻿]/g,'')
      .replace(/\s+/g,' ').trim();
    t=Array.from(t).slice(0,max).join('').trim();
    return t||fallback;
  }
  const cleanName=(s,fallback)=>cleanText(s,NAME_MAX,fallback==null?'Unnamed':fallback);
  const color=(v,d)=>typeof v==='string'&&HEX.test(v)?v.toLowerCase():d;

  // play styles a design may pick (matches STYLES in parts.js; no style means Auto)
  const STYLES=['tank','bruiser','spitter','support','scout','allrounder'];
  // head sprouts a design may pick (matches SPROUTS in creature.js; none picked means one is chosen from the seed)
  const SPROUT_KINDS=['leaf','bud','shroom','clover','fern','wisp','none'];
  /* creature design: {v,name,color,accent,pattern,body:{w,h,l},parts:[{id,p:[x,y,z],s,r,m}],seed,style?,sprout?} */
  function design(raw,ctx){
    if(!isObj(raw))return null;
    const partIds=ctx.partIds, patterns=ctx.patterns, maxParts=ctx.maxParts||64;
    const b=isObj(raw.body)?raw.body:{};
    const parts=[];
    if(Array.isArray(raw.parts))for(const p of raw.parts){
      if(parts.length>=maxParts)break;
      if(!isObj(p)||typeof p.id!=='string'||!own(partIds,p.id))continue;
      const v=Array.isArray(p.p)&&p.p.length===3&&p.p.every(n=>typeof n==='number'&&Number.isFinite(n))?p.p.map(n=>num(n,-1,1,0)):null;
      if(!v)continue;
      const l=Math.hypot(v[0],v[1],v[2]);if(!l)continue;
      const u=Math.abs(l-1)<1e-6?v:[v[0]/l,v[1]/l,v[2]/l];
      parts.push({id:p.id,p:u,s:num(p.s,.6,1.6,1),r:num(p.r,-Math.PI,Math.PI,0),m:bool(p.m,partIds[p.id].mirror!==false)});
    }
    return {v:2,name:cleanName(raw.name),color:color(raw.color,'#55c8ff'),accent:color(raw.accent,'#ffd23d'),
      pattern:patterns.includes(raw.pattern)?raw.pattern:patterns[0],
      body:{w:num(b.w,.7,1.6,1),h:num(b.h,.7,1.5,1),l:num(b.l,.8,1.8,1)},
      parts,seed:int(raw.seed,1,99991,13),...(typeof raw.blurb==='string'?{blurb:cleanText(raw.blurb,200,'')}:{}),...(typeof raw.style==='string'&&STYLES.includes(raw.style)?{style:raw.style}:{}),...(typeof raw.sprout==='string'&&SPROUT_KINDS.includes(raw.sprout)?{sprout:raw.sprout}:{})};
  }
  function slots(raw,ctx,count){
    if(!Array.isArray(raw))return null;
    const out=[];for(let i=0;i<Math.min(raw.length,count);i++)out.push(raw[i]==null?null:design(raw[i],ctx));
    return out;
  }

  function idList(raw,partIds,base){
    const out=base.slice();
    if(Array.isArray(raw))for(const id of raw)if(typeof id==='string'&&own(partIds,id)&&!out.includes(id))out.push(id);
    return out;
  }
  function flagMap(raw,keyRe){
    const out={};if(!isObj(raw))return out;let n=0;
    for(const k of Object.keys(raw)){if(n>=500)break;if(keyRe.test(k)&&raw[k]===true){out[k]=true;n++;}}
    return out;
  }
  /* PlayerProgress. Unknown fields are dropped; numbers are clamped; part lists keep only real part ids. */
  function progress(raw,def,partIds){
    if(!isObj(raw)||typeof raw.dna!=='number')return def;
    const st=isObj(raw.stats)?raw.stats:{};
    return {v:2,dna:int(raw.dna,0,DNA_MAX,0),xp:int(raw.xp,0,XP_MAX,0),level:int(raw.level,1,LEVEL_MAX,1),
      unlocked:idList(raw.unlocked,partIds,def.unlocked),owned:idList(raw.owned,partIds,def.owned),
      campaign:flagMap(raw.campaign,SLUG),daily:flagMap(raw.daily,ROT_KEY),lastSlot:int(raw.lastSlot,-1,63,-1),
      stats:{matches:int(st.matches,0,STAT_MAX,0),wins:int(st.wins,0,STAT_MAX,0),kills:int(st.kills,0,STAT_MAX,0)}};
  }

  /* Accessibility settings: only known keys, each checked against its default's type and an allowlist. */
  function a11y(raw,def,palettes){
    const out=JSON.parse(JSON.stringify(def));if(!isObj(raw))return out;
    const ranges={uiScale:[.9,1.5],gameSpeed:[.55,1],sens:[.3,2]};
    for(const k of Object.keys(def)){
      if(k==='keys'||!own(raw,k))continue;
      if(k==='palette'){if(typeof raw.palette==='string'&&own(palettes,raw.palette))out.palette=raw.palette;continue;}
      if(ranges[k]){out[k]=num(raw[k],ranges[k][0],ranges[k][1],def[k]);continue;}
      if(typeof def[k]==='boolean')out[k]=bool(raw[k],def[k]);
    }
    if(isObj(raw.keys))for(const k of Object.keys(def.keys))if(typeof raw.keys[k]==='string'&&KEY_CODE.test(raw.keys[k]))out.keys[k]=raw.keys[k];
    return out;
  }
  function settings(raw,toggleKeys){
    const out={};if(!isObj(raw))return out;
    for(const k of ['bloom','shadows','sound','music'])if(typeof raw[k]==='boolean')out[k]=raw[k];
    if(isObj(raw.toggles)){out.toggles={};for(const k of toggleKeys)if(typeof raw.toggles[k]==='boolean')out.toggles[k]=raw.toggles[k];}
    return out;
  }

  /* dev console amounts: whole numbers in a sane range */
  function devAmount(arg,d,lo,hi){
    if(arg==null||arg==='')return d;
    if(!/^-?\d{1,9}$/.test(String(arg).trim()))return null;
    const n=parseInt(arg,10);return n<lo||n>hi?null:n;
  }

  /* HTML escaping for text and double- or single-quoted attributes */
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  root.Sec={parse,cleanText,cleanName,color,design,slots,progress,a11y,settings,devAmount,esc,MAX_SAVE_CHARS,NAME_MAX,DNA_MAX};
})(typeof window!=='undefined'?window:globalThis);
