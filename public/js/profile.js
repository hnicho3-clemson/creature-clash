'use strict';
/* Creature Clash — player card. The first time a signed-in player enters the game they pick a display name
   and a portrait (a picture of one of the game's creatures). No bio and no photo upload, so kids can't share
   personal details. Change it later from Settings > Player card. Guests don't have a card. */
const Profile=(function(){
  let shownThisVisit=false,choice=null;
  const el=id=>document.getElementById(id);
  const imgFor=id=>{const i=Sec.PORTRAITS.indexOf(id);try{return Portrait.design(BOT_PRESETS[i]||PRESETS[0],false,192);}catch(e){return '';}};

  function renderGrid(){
    el('pGrid').innerHTML=Sec.PORTRAITS.map((id,i)=>{const d=BOT_PRESETS[i]||PRESETS[0];
      return '<button type="button" role="radio" aria-checked="'+(id===choice)+'" tabindex="'+(id===choice||(!choice&&i===0)?0:-1)+'" data-pic="'+id+'"><img alt="" src="'+imgFor(id)+'"><span>'+Sec.esc(d.name)+'</span></button>';}).join('');
    const btns=[...el('pGrid').querySelectorAll('button')];
    btns.forEach((b,i)=>{
      b.addEventListener('click',()=>{sfx('ui');pick(b.dataset.pic);});
      b.addEventListener('keydown',e=>{const k=e.key;const n=k==='ArrowRight'||k==='ArrowDown'?1:k==='ArrowLeft'||k==='ArrowUp'?-1:0;if(!n)return;e.preventDefault();const j=(i+n+btns.length)%btns.length;pick(btns[j].dataset.pic);});
    });
  }
  function pick(id){choice=id;el('pErr').textContent='';renderGrid();const b=el('pGrid').querySelector('[data-pic="'+id+'"]');if(b)b.focus();}

  function open(){
    const u=Cloud.user;if(!u)return;
    choice=u.portrait||null;el('pName').value=u.displayName||'';el('pErr').textContent='';el('pName').removeAttribute('aria-invalid');
    el('pLater').hidden=!u.needsProfile;el('profileTitle').textContent=u.needsProfile?'Pick a name and a portrait':'Your player card';
    renderGrid();el('profile').hidden=false;exitLock();
  }
  // Called after sign-in and whenever a menu popup closes. Opens once per visit, on the main menu only.
  function maybeShow(){
    if(shownThisVisit||!Cloud.on||!Cloud.user||!Cloud.user.needsProfile||phase!=='menu')return;
    if(!el('welcome').hidden||!el('a11y').hidden||!el('howto').hidden)return;
    shownThisVisit=true;open();
  }
  function later(){el('profile').hidden=true;}

  el('pName').addEventListener('input',()=>{el('pErr').textContent='';el('pName').removeAttribute('aria-invalid');});
  el('pLater').addEventListener('click',()=>{sfx('ui');later();});
  el('profileForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const n=Sec.displayName(el('pName').value);
    if(!n.ok){el('pErr').textContent=n.message;el('pName').setAttribute('aria-invalid','true');el('pName').focus();return;}
    if(!choice){el('pErr').textContent='Tap a portrait to pick one.';return;}
    const btn=el('pSave');btn.disabled=true;btn.textContent='Saving…';
    try{
      const r=await cloudApi('/api/account/profile','POST',{displayName:n.value,portrait:choice});
      Cloud.user=r.user;el('profile').hidden=true;renderAccountChip();sfx('win');banner('Nice to meet you, '+r.user.displayName+'!','good');
    }catch(err){el('pErr').textContent=(err&&err.message)||'That did not save. Please try again.';}
    finally{btn.disabled=false;btn.textContent='Save my card';}
  });
  el('a11yCard').addEventListener('click',()=>{sfx('ui');closeA11y();open();});
  return {maybeShow,open,later,imgFor,
    signedIn(){el('a11yCard').hidden=!Cloud.on;setTimeout(maybeShow,400);}};
})();
