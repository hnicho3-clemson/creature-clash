'use strict';
/* Creature Clash — anonymous usage counts and error reports.
   Everything goes only to our own server (/api/telemetry). No cookies are sent, no player or browser ID exists,
   and nothing goes to an outside analytics or error service.
   - Counts: a page view, once a day per browser a "visitor", match starts, and minutes played per match.
     Skipped when the browser asks not to be tracked (Global Privacy Control or Do Not Track).
   - Errors: the message and where in our code it happened, with emails, codes and tokens scrubbed out. */
const Telemetry=(function(){
  // The game server runs on this computer, so localhost counts. Opening a file directly or with #dev does not.
  const local=location.protocol==='file:';
  const dev=location.hash==='#dev';
  const optOut=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
  const enabled=!local&&!dev;
  let errorsSent=0;const seen=new Set();

  function post(path,body){
    if(!enabled)return;
    try{fetch(path,{method:'POST',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json','X-CC-Request':'1'},body:JSON.stringify(body)}).catch(()=>{});}catch(e){/* never break the game */}
  }
  function stat(event,minutes){if(optOut)return;post('/api/telemetry/stat',minutes==null?{event}:{event,minutes:Math.round(minutes*100)/100});}

  // Same scrubbing as the server does, so private text never leaves the browser in the first place.
  function scrub(v,max){
    let s=typeof v==='string'?v:v==null?'':String(v);
    s=s.slice(0,max*4).replace(/[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}/g,'[email]').replace(/(https?:\/\/[^\s?#"')]+)[?#][^\s"')]*/g,'$1')
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g,'[token]').replace(/\b\d{6,}\b/g,'[number]');
    return s.slice(0,max);
  }
  // Only our own files count; errors from browser extensions or other sites are not ours to fix.
  const ours=f=>!f||f.indexOf(location.origin+'/')===0;
  const shortFile=f=>{try{return new URL(f).pathname;}catch(e){return '';}};
  function report(message,file,line,col,stack){
    if(errorsSent>=5||!message)return;
    const le=document.getElementById('loaderr');if(le&&!le.hidden&&errorsSent)return; // engine failed: later errors are just fallout
    if(/^Script error\.?$/i.test(message)||!ours(file))return;
    const location_=file?shortFile(file)+(line?':'+line+(col?':'+col:''):''):'';
    const key=message+'|'+location_;if(seen.has(key))return;seen.add(key);errorsSent++;
    const st=typeof stack==='string'?stack.split('\n').slice(0,6).map(l=>l.replace(location.origin,'').trim()).join('\n'):'';
    post('/api/telemetry/error',{message:scrub(message,300),location:scrub(location_,160),stack:scrub(st,1200)});
    showBootError();
  }
  // If the game breaks before it finishes loading, tell the player instead of spinning forever.
  function showBootError(){
    const b=document.getElementById('boot');if(!b||b.hidden)return;
    const t=b.querySelector('[data-boot-text]');if(t)t.textContent='Something went wrong while loading the game. Reload the page to try again.';
    const r=b.querySelector('[data-boot-reload]');if(r)r.hidden=false;b.classList.add('failed');
  }

  window.addEventListener('error',e=>{
    const t=e.target;
    if(t&&t!==window&&t.tagName==='SCRIPT'){report('Script failed to load: '+shortFile(t.src)+' from '+(()=>{try{return new URL(t.src).host;}catch(x){return '?';}})(),'',0,0,'');return;}
    report(e.message,e.filename,e.lineno,e.colno,e.error&&e.error.stack);
  },true);
  window.addEventListener('unhandledrejection',e=>{
    const r=e.reason;
    if(r&&r.code==='network')return; // offline: already shown to the player, not a bug
    report('Unhandled promise rejection: '+(r&&r.message?r.message:String(r)),'',0,0,r&&r.stack);
  });

  // Page view, plus one "visitor" a day per browser. The stored value is only today's date.
  stat('page_view');
  if(typeof Sec!=='undefined')try{ // the game page only, where the safe storage parser is loaded
    const today=new Date().toISOString().slice(0,10);
    const raw=localStorage.getItem('cc_seen_day');let last=null;try{last=raw==null||typeof Sec==='undefined'?null:Sec.parse(raw);}catch(e){last=null;}
    if(last!==today){localStorage.setItem('cc_seen_day',JSON.stringify(today));stat('daily_visitor');}
  }catch(e){/* storage off: skip the visitor count */}

  return {stat,report};
})();
