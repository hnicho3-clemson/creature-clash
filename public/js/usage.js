'use strict';
/* Creature Clash — counts games played and minutes of play for the anonymous stats (see telemetry.js).
   Test Drive is not counted. A match's minutes are sent once: when the player is knocked out, the match or
   challenge ends, they leave for a menu, start another match, or close the page. */
{
  const base={startMatch,endMatch,finishChallenge,onPlayerEliminated,openMenu,openChallenges};
  function done(m){
    const u=m&&m.usage;if(!u||u.sent)return;u.sent=true;
    Telemetry.stat('match_end',(performance.now()-u.t0)/60000);
  }
  startMatch=function(){
    done(match);
    const r=base.startMatch.apply(this,arguments);
    if(match&&(match.mode==='battle'||match.mode==='challenge')){match.usage={t0:performance.now(),sent:false};Telemetry.stat(match.mode+'_start');}
    return r;
  };
  endMatch=function(){const m=match;const r=base.endMatch.apply(this,arguments);done(m);return r;};
  finishChallenge=function(){const m=match;const r=base.finishChallenge.apply(this,arguments);done(m);return r;};
  onPlayerEliminated=function(){const m=match;const r=base.onPlayerEliminated.apply(this,arguments);done(m);return r;};
  openMenu=function(){done(match);return base.openMenu.apply(this,arguments);};
  openChallenges=function(){done(match);return base.openChallenges.apply(this,arguments);};
  addEventListener('pagehide',()=>done(match));
}
