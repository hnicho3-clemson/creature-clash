'use strict';
/* Creature Clash — part catalog, attacks, presets, stats, validation, progress */
const FAMS=['Locomotion','Offense','Weapon','Defense','Utility','Cosmetic'];
const TIER_PRICE={Basic:50,Standard:65,Advanced:80,Rare:90,Free:0};
const BUDGET={weight:60,complexity:40,parts:24}; // SUGGESTION

/* Part placement: p is a direction on the body (unit sphere); parts face out along the body's surface normal.
   mount: leg (hangs down), cover (wraps the body), surface (everything else). */
const PARTS={
  // Locomotion
  shortLegs:{name:'Short Legs',fam:'Locomotion',tier:'Basic',lv:1,mount:'leg',leg:{len:.72,thick:.22,speed:.4,splay:.16},s:{stability:.5,weight:1},cx:1,def:[.6,-.62,.48],desc:'Stubby and stable. Hard to knock over.'},
  longLegs:{name:'Long Legs',fam:'Locomotion',tier:'Standard',lv:2,mount:'leg',leg:{len:1.55,thick:.15,speed:2.2,splay:.16},s:{stability:-.4,weight:1},cx:1,mut:'Zoomies',def:[.6,-.62,.48],desc:'Fast strides, but easy to tip over.'},
  spiderLegs:{name:'Spider Legs',fam:'Locomotion',tier:'Advanced',lv:5,mount:'leg',leg:{len:1.9,thick:.1,speed:1.5,splay:2.0,knee:-1.75},s:{stability:.9,weight:.7},cx:1.3,def:[.72,-.45,.3],desc:'Wide, creepy stance. Very stable.'},
  frogLegs:{name:'Frog Legs',fam:'Locomotion',tier:'Advanced',lv:6,mount:'leg',leg:{len:1.0,thick:.27,speed:1.0,splay:.3,frog:true},s:{stability:.2,weight:1.4},jump:1.45,cx:1.4,def:[.62,-.6,-.4],desc:'Springy. Jumps much higher.'},
  fins:{name:'Fins',fam:'Locomotion',tier:'Standard',lv:3,mount:'surface',build:'fin',s:{speed:.5,stability:.3,weight:.5},once:true,cx:1,def:[.97,-.15,0],desc:'Flappy side fins. A little extra speed.'},
  wings:{name:'Wings',fam:'Locomotion',tier:'Rare',lv:8,mount:'surface',build:'wing',s:{speed:.6,weight:1},once:true,glide:true,mut:'Zoomies',cx:2,def:[.55,.75,-.2],desc:'Hold jump in the air to glide.'},
  // Offense
  basicJaw:{name:'Basic Jaw',fam:'Offense',tier:'Basic',lv:1,mount:'surface',build:'jaw',s:{damage:2,weight:2},atk:'bite',mut:'Big Bite',cx:2,def:[0,-.2,.98],mirror:false,desc:'Chomp. Reliable melee damage.'},
  beak:{name:'Beak',fam:'Offense',tier:'Standard',lv:3,mount:'surface',build:'beak',s:{damage:1.5,weight:1},atk:'peck',cx:1.5,def:[0,-.05,1],mirror:false,desc:'Fast pecks that pierce armor.'},
  smallClaws:{name:'Small Claws',fam:'Offense',tier:'Basic',lv:1,mount:'surface',build:'claw',s:{damage:.8,weight:.6},atk:'slash',cx:1,def:[.78,-.3,.55],desc:'Quick swipes in front of you.'},
  bigClaws:{name:'Big Claws',fam:'Offense',tier:'Advanced',lv:6,mount:'surface',build:'bigclaw',s:{damage:1.4,weight:1.4},atk:'maul',cx:1.5,def:[.78,-.3,.55],desc:'Slow, heavy mauls that hit everything in front.'},
  pincers:{name:'Pincers',fam:'Offense',tier:'Standard',lv:4,mount:'surface',build:'pincer',s:{damage:1.2,weight:1.2},atk:'pinch',cx:1.5,def:[.78,-.25,.55],desc:'Pinch and slow your target.'},
  horns:{name:'Horns',fam:'Offense',tier:'Standard',lv:2,mount:'surface',build:'horn',s:{damage:1,stability:-.2,weight:1.2},atk:'charge',mut:'Big Bite',cx:1.2,def:[.35,.75,.55],desc:'Charge forward and ram.'},
  tailClub:{name:'Tail Club',fam:'Offense',tier:'Advanced',lv:5,mount:'surface',build:'tail',tailEnd:'club',s:{damage:2.5,weight:3.5},atk:'spin',cx:2.5,def:[0,-.05,-1],mirror:false,desc:'Spin to hit everything around you.'},
  spitGland:{name:'Spit Gland',fam:'Offense',tier:'Advanced',lv:5,mount:'surface',build:'gland',gland:'spit',s:{damage:1.5,weight:1.5},atk:'spit',cx:2,def:[0,-.55,.82],mirror:false,desc:'Lob glowing goo from range.'},
  stinger:{name:'Stinger',fam:'Offense',tier:'Rare',lv:9,mount:'surface',build:'tail',tailEnd:'stinger',s:{damage:2,weight:1.5},atk:'sting',mut:'Venom',cx:2,def:[0,.1,-1],mirror:false,desc:'Venom that eats through armor.'},
  zapAntennae:{name:'Zap Antennae',fam:'Offense',tier:'Rare',lv:10,mount:'surface',build:'antenna',s:{damage:1,weight:.5},atk:'zap',cx:2,def:[.3,.92,.25],desc:'Chain lightning at close range.'},
  // Weapons: one weapon slot per creature, held out front. SUGGESTION: names, stats and unlock levels.
  fishSword:{name:'Fish Sword',fam:'Weapon',tier:'Basic',lv:1,mount:'surface',build:'weapon',weapon:'fish',s:{damage:1.2,weight:1},atk:'fishSlap',max:1,cx:1.5,def:[.62,-.12,.78],mirror:false,desc:'A sword made of fish. Wide, slappy swings.'},
  rubberMallet:{name:'Rubber Mallet',fam:'Weapon',tier:'Standard',lv:2,mount:'surface',build:'weapon',weapon:'mallet',s:{damage:1.6,weight:1.8},atk:'bonk',max:1,cx:1.8,def:[.62,-.12,.78],mirror:false,desc:'Squeaky bonks that send enemies flying.'},
  poolNoodle:{name:'Pool Noodle Lance',fam:'Weapon',tier:'Standard',lv:3,mount:'surface',build:'weapon',weapon:'noodle',s:{damage:.6,weight:.5},atk:'noodle',max:1,cx:1.2,def:[.62,-.12,.78],mirror:false,desc:'Huge reach and big pushback, tiny damage.'},
  spatula:{name:'Flipping Spatula',fam:'Weapon',tier:'Advanced',lv:4,mount:'surface',build:'weapon',weapon:'spatula',s:{damage:1.3,weight:1.2},atk:'flip',max:1,cx:1.8,def:[.62,-.12,.78],mirror:false,desc:'Flips enemies into the air like pancakes.'},
  bubbleBlaster:{name:'Bubble Blaster',fam:'Weapon',tier:'Advanced',lv:6,mount:'surface',build:'weapon',weapon:'blaster',s:{damage:1,weight:1.6},atk:'bubble',max:1,cx:2,def:[.62,-.12,.78],mirror:false,desc:'Rapid-fire bubbles from range.'},
  boomerangBone:{name:'Boomerang Bone',fam:'Weapon',tier:'Rare',lv:9,mount:'surface',build:'weapon',weapon:'bone',s:{damage:1.8,weight:1.2},atk:'boomerang',max:1,cx:2.2,def:[.62,-.12,.78],mirror:false,desc:'Throw it out and it comes back. Hits both ways.'},
  // Defense
  spikes:{name:'Spikes',fam:'Defense',tier:'Standard',lv:2,mount:'surface',build:'spike',s:{toughness:.6,weight:.5},thorns:2,cx:.7,def:[0,.98,0],mirror:false,desc:'Anyone who bites you gets poked back.'},
  quills:{name:'Quills',fam:'Defense',tier:'Advanced',lv:7,mount:'surface',build:'quills',s:{toughness:.8,weight:.8},thorns:3,cx:1,def:[0,.85,-.5],mirror:false,desc:'A pincushion of pain for attackers.'},
  armorPlates:{name:'Armor Plates',fam:'Defense',tier:'Standard',lv:4,mount:'surface',build:'plate',s:{toughness:1.2,weight:1.5},armor:true,mut:'Thick Hide',cx:1,def:[.75,.45,0],desc:'Armor. Shrugs off bites and claws.'},
  shell:{name:'Shell',fam:'Defense',tier:'Advanced',lv:5,mount:'cover',build:'shell',s:{toughness:4,speed:-.6,weight:5},armor:true,mut:'Thick Hide',max:1,cx:3,desc:'Big armored shell. Slow but tough.'},
  bellyPadding:{name:'Belly Padding',fam:'Defense',tier:'Basic',lv:1,mount:'cover',build:'belly',s:{toughness:1.5,weight:2},kbResist:.6,special:'bellyflop',max:1,cx:1.5,desc:'Soaks knockback. Unlocks Belly Flop.'},
  inflateSac:{name:'Inflate Sac',fam:'Defense',tier:'Rare',lv:11,mount:'surface',build:'gland',gland:'inflate',s:{toughness:1,weight:1},special:'inflate',max:1,cx:2,def:[0,-.42,.88],mirror:false,desc:'Puff up and bounce attacks away.'},
  // Utility
  wideEyes:{name:'Wide Eyes',fam:'Utility',tier:'Basic',lv:1,mount:'surface',build:'eye',eye:.36,s:{weight:.2},detect:4,cx:.5,def:[.34,.5,.8],desc:'Spot enemies from farther away.'},
  bigEars:{name:'Big Ears',fam:'Utility',tier:'Standard',lv:3,mount:'surface',build:'ear',s:{weight:.3},detect:7,cx:.6,def:[.5,.8,.1],desc:'Hear enemies coming on the minimap.'},
  snoot:{name:'Sniffer Snoot',fam:'Utility',tier:'Basic',lv:1,mount:'surface',build:'nose',s:{weight:.4},detect:5,cx:.6,def:[0,.05,1],mirror:false,desc:'Smell out nearby creatures.'},
  healingGland:{name:'Healing Gland',fam:'Utility',tier:'Rare',lv:8,mount:'surface',build:'gland',gland:'heal',s:{weight:1.5},special:'heal',max:1,cx:2,def:[0,.9,-.35],mirror:false,desc:'Heal Pulse for you and nearby teammates.'},
  shieldNode:{name:'Shield Node',fam:'Utility',tier:'Advanced',lv:4,mount:'surface',build:'crystal',s:{weight:1},special:'shield',max:1,cx:2,def:[0,.95,.15],mirror:false,desc:'Shield Bubble that absorbs damage.'},
  inkSac:{name:'Ink Sac',fam:'Utility',tier:'Advanced',lv:6,mount:'surface',build:'gland',gland:'ink',s:{weight:1},special:'ink',max:1,cx:2,def:[0,-.45,-.85],mirror:false,desc:'Ink Cloud that blinds and slows enemies.'},
  camoCrest:{name:'Camo Crest',fam:'Utility',tier:'Rare',lv:10,mount:'surface',build:'crest',s:{weight:.8},special:'camo',max:1,cx:2,def:[0,.97,-.2],mirror:false,desc:'Camouflage. Turn invisible for a few seconds.'},
  burrowPaws:{name:'Burrow Paws',fam:'Utility',tier:'Advanced',lv:7,mount:'surface',build:'paw',s:{weight:1},special:'burrow',cx:1.5,def:[.6,-.7,.6],desc:'Burrow underground, then pop up.'},
  // Cosmetic (looks only, no stats)
  googlyEye:{name:'Googly Eye',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'eye',eye:.26,s:{},cx:0,def:[.34,.46,.82],desc:'Essential.'},
  partyHat:{name:'Party Hat',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'hat',hat:'party',s:{},cx:0,def:[.1,.99,.1],mirror:false,desc:'Every battle is a party.'},
  topHat:{name:'Top Hat',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'hat',hat:'top',s:{},cx:0,def:[0,1,.1],mirror:false,desc:'Distinguished.'},
  beanie:{name:'Propeller Beanie',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'hat',hat:'beanie',s:{},cx:0,def:[0,1,.05],mirror:false,desc:'Does not help you fly.'},
  crownMini:{name:'Tiny Crown',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'hat',hat:'crown',s:{},cx:0,def:[0,1,.1],mirror:false,desc:'Royalty, technically.'},
  bowTie:{name:'Bow Tie',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'bow',s:{},cx:0,def:[0,-.58,.82],mirror:false,desc:'Formal violence.'},
  mustache:{name:'Mustache',fam:'Cosmetic',tier:'Free',lv:1,mount:'surface',build:'stache',s:{},cx:0,def:[0,.02,1],mirror:false,desc:'Instantly 30% more trustworthy.'},
};
for(const id in PARTS)PARTS[id].id=id;
const partPrice=id=>TIER_PRICE[PARTS[id].tier];

const ATTACKS={
  bite:{id:'bite',name:'Bite',type:'bite',dmg:13,range:1.6,arc:.4,cd:.6,st:10,kb:4,single:true,melee:true,sound:'bite'},
  peck:{id:'peck',name:'Peck',type:'pierce',dmg:8,range:1.5,arc:.5,cd:.3,st:6,kb:1.5,single:true,melee:true,sound:'peck'},
  slash:{id:'slash',name:'Claw Swipe',type:'slash',dmg:10,range:1.6,arc:.15,cd:.42,st:8,kb:3,melee:true,sound:'slash'},
  maul:{id:'maul',name:'Maul',type:'slash',dmg:16,range:1.9,arc:.05,cd:.8,st:14,kb:6,melee:true,sound:'slash'},
  pinch:{id:'pinch',name:'Pinch',type:'bite',dmg:14,range:1.6,arc:.35,cd:.9,st:11,kb:1,single:true,melee:true,slow:1.6,sound:'pinch'},
  charge:{id:'charge',name:'Horn Charge',type:'blunt',dmg:20,range:0,cd:3.2,st:25,kb:12,dash:.42,sound:'charge'},
  spin:{id:'spin',name:'Tail Spin',type:'blunt',dmg:16,range:2.6,arc:-1,cd:2.6,st:22,kb:9,sound:'spin'},
  spit:{id:'spit',name:'Goo Spit',type:'spit',dmg:11,range:24,cd:.75,st:9,kb:2.5,ranged:true,sound:'spit'},
  sting:{id:'sting',name:'Venom Sting',type:'venom',dmg:8,range:1.8,arc:.35,cd:.9,st:12,kb:2,venom:true,single:true,melee:true,sound:'sting'},
  zap:{id:'zap',name:'Zap',type:'shock',dmg:12,range:9,arc:.35,cd:1.3,st:12,kb:3,ranged:true,sound:'zap'},
  // weapon attacks (SUGGESTION values)
  fishSlap:{id:'fishSlap',name:'Fish Slap',type:'slash',dmg:11,range:2.1,arc:.05,cd:.5,st:9,kb:4.5,melee:true,weapon:true,sound:'swish'},
  bonk:{id:'bonk',name:'Mallet Bonk',type:'blunt',dmg:17,range:1.9,arc:.3,cd:1.1,st:15,kb:11,melee:true,weapon:true,sound:'squeak'},
  noodle:{id:'noodle',name:'Noodle Poke',type:'blunt',dmg:7,range:3.6,arc:.75,cd:.45,st:7,kb:8,single:true,melee:true,weapon:true,sound:'peck'},
  flip:{id:'flip',name:'Pancake Flip',type:'blunt',dmg:12,range:1.8,arc:.35,cd:1.6,st:15,kb:3,single:true,melee:true,weapon:true,launch:10,sound:'flip'},
  bubble:{id:'bubble',name:'Bubble Burst',type:'blunt',dmg:6,range:18,cd:.32,st:6,kb:1.5,ranged:true,weapon:true,sound:'bubble'},
  boomerang:{id:'boomerang',name:'Bone Throw',type:'blunt',dmg:13,range:14,cd:2,st:14,kb:5,ranged:true,weapon:true,sound:'whoosh'},
  headbutt:{id:'headbutt',name:'Headbutt',type:'blunt',dmg:7,range:1.3,arc:.4,cd:.7,st:8,kb:4,single:true,melee:true,sound:'bite'},
};
const SPECIALS={
  bellyflop:{name:'Belly Flop',cd:12},shield:{name:'Shield Bubble',cd:14},heal:{name:'Heal Pulse',cd:12},
  ink:{name:'Ink Cloud',cd:14},camo:{name:'Camouflage',cd:16},burrow:{name:'Burrow',cd:12},inflate:{name:'Inflate',cd:13},
};

/* ---------- play styles ----------
   The player picks a style for each creature (or leaves it on Auto, which follows the parts, as the design intends).
   A style gives a small perk, suggested parts and a starter template. SUGGESTION: perks and values. */
const STYLES={
  tank:{name:'Tank',blurb:'Hold the lane and soak up hits.',perkText:'+10% health',perk:{hp:1.1},suggest:['shell','armorPlates','bellyPadding','rubberMallet','shortLegs','spikes']},
  bruiser:{name:'Bruiser',blurb:'Dive in and hit hard up close.',perkText:'+8% damage with up-close attacks',perk:{melee:1.08},suggest:['bigClaws','basicJaw','fishSword','horns','longLegs','tailClub']},
  spitter:{name:'Spitter',blurb:'Fight from a safe distance.',perkText:'+10% damage with ranged attacks',perk:{ranged:1.1},suggest:['spitGland','bubbleBlaster','zapAntennae','boomerangBone','wideEyes','fins']},
  support:{name:'Support',blurb:'Heal, shield and revive your team.',perkText:'Revive 30% faster, heals and shields 25% stronger',perk:{revive:1.3,heal:1.25},suggest:['healingGland','shieldNode','inkSac','poolNoodle','bigEars','shortLegs']},
  scout:{name:'Scout',blurb:'Fast, sneaky, first to spot enemies.',perkText:'+8% speed and +6 m detection',perk:{speed:1.08,detect:6},suggest:['wings','camoCrest','longLegs','snoot','bigEars','smallClaws']},
  allrounder:{name:'All-rounder',blurb:'A bit of everything.',perkText:'+15% stamina recovery',perk:{stamina:1.15},suggest:['basicJaw','smallClaws','spatula','longLegs','spikes','wideEyes']},
};
const STYLE_IDS=Object.keys(STYLES);
const ROLE_STYLE={Tank:'tank',Bruiser:'bruiser',Spitter:'spitter',Support:'support',Scout:'scout',Allrounder:'allrounder'};

/* ---------- designs ---------- */
const PATTERNS=['spots','stripes','belly','plain'];
const SWATCHES=['#ff8a3d','#ffd23d','#b8ff4f','#2fc4a8','#5ad1ff','#3b6bff','#9a6bff','#ff6fae','#ff4d5e','#f4ead2','#8a6a52','#2a2f45'];
function P(id,x,y,z,o){o=o||{};const d=PARTS[id];return {id,p:norm3([x,y,z]),s:o.s||1,r:o.r||0,m:o.m!=null?o.m:d.mirror!==false};}
function D(name,color,accent,pattern,body,parts,extra){return Object.assign({v:2,name,color,accent,pattern,body:{w:body[0],h:body[1],l:body[2]},parts,seed:(name.length*7919)%99991+13},extra||{});}
const PRESETS=[
  D('Chompsworth','#ff8a3d','#ffd36b','spots',[1.05,.9,1.25],[P('longLegs',.6,-.62,.45),P('longLegs',.6,-.62,-.45),P('basicJaw',0,-.2,.98),P('smallClaws',.78,-.25,.55),P('horns',.35,.75,.5),P('googlyEye',.34,.46,.8),P('bellyPadding',0,-1,0),P('partyHat',.15,.99,.05),P('fishSword',.62,-.12,.78)],{blurb:'Long-legged biter with a fish sword. Fast and hits hard, but tips over easily.'}),
  D('Sir Shellby','#2fc4a8','#1d5f86','spots',[1.25,1,1.35],[P('shortLegs',.62,-.62,.55),P('shortLegs',.62,-.62,0),P('shortLegs',.62,-.62,-.55),P('shell',0,1,0),P('spikes',0,.98,.25,{s:1.2}),P('spikes',0,.92,-.4),P('tailClub',0,-.05,-1),P('basicJaw',0,-.2,.98),P('googlyEye',.34,.5,.8),P('shieldNode',0,.6,.8,{s:.8}),P('topHat',0,.98,.3,{s:.9}),P('rubberMallet',.62,-.12,.78)],{blurb:'Armored tank with a squeaky mallet. Slow and sturdy, with a tail club for crowds.'}),
  D('Gloopa','#9a6bff','#c8ff5a','stripes',[1,1.05,1.1],[P('shortLegs',.6,-.62,.45),P('shortLegs',.6,-.62,-.45),P('fins',.97,-.15,0),P('spitGland',0,-.55,.82),P('basicJaw',0,-.2,.98),P('wideEyes',.42,.42,.8),P('wideEyes',0,.6,.8,{m:false}),P('shieldNode',0,.98,-.1),P('beanie',0,1,.15)],{blurb:'Ranged spitter. Lobs glowing goo from a safe distance.'}),
  D('Doc Wobble','#ff6fae','#7af0ff','belly',[.95,.95,1.1],[P('longLegs',.6,-.62,.45),P('longLegs',.6,-.62,-.45),P('wings',.55,.75,-.2),P('stinger',0,.1,-1),P('healingGland',0,.9,-.35),P('smallClaws',.78,-.25,.55),P('googlyEye',.34,.46,.82),P('mustache',0,.0,1),P('poolNoodle',.62,-.12,.78)],{blurb:'Support. Heals the team, pokes from afar with a pool noodle and stings armor with venom.'}),
];
const BOT_PRESETS=PRESETS.concat([
  D('Zappity','#ffd23d','#3b6bff','stripes',[.95,.9,1.05],[P('frogLegs',.62,-.6,.4),P('frogLegs',.62,-.6,-.45),P('zapAntennae',.3,.92,.25),P('beak',0,-.05,1),P('bigEars',.62,.7,0),P('googlyEye',.32,.42,.84)],{blurb:'Hops in and zaps everything.'}),
  D('Inkwell','#3b6bff','#ff6fae','spots',[1.1,.85,1.2],[P('spiderLegs',.72,-.45,.45),P('spiderLegs',.72,-.45,0),P('spiderLegs',.72,-.45,-.45),P('pincers',.78,-.25,.6),P('inkSac',0,-.45,-.85),P('armorPlates',.75,.45,0),P('snoot',0,.05,1),P('googlyEye',.3,.5,.8)],{blurb:'Armored pincher that hides in ink.'}),
  D('Burrowbelly','#8a6a52','#ffd36b','belly',[1.15,1,1.2],[P('shortLegs',.6,-.62,-.4),P('burrowPaws',.62,-.65,.55),P('bigClaws',.82,-.1,.45),P('basicJaw',0,-.2,.98),P('quills',0,.85,-.5),P('googlyEye',.32,.5,.82)],{blurb:'Digs under you, then mauls.'}),
  D('Puffington','#ff6fae','#f4ead2','plain',[1.1,1.1,1.1],[P('shortLegs',.6,-.62,.4),P('shortLegs',.6,-.62,-.4),P('inflateSac',0,-.42,.88),P('quills',0,.9,0),P('beak',0,0,1),P('wideEyes',.34,.46,.82),P('bowTie',0,-.62,.78)],{blurb:'Spiky pufferball. Do not hug.'}),
  D('Sir Bonksalot','#c08aff','#ffd23d','spots',[1.2,1,1.25],[P('shortLegs',.62,-.62,.5),P('shortLegs',.62,-.62,-.45),P('armorPlates',.75,.45,0),P('rubberMallet',.62,-.12,.78),P('basicJaw',0,-.2,.98),P('googlyEye',.34,.5,.8),P('crownMini',0,1,.1)],{blurb:'Armored knight with a squeaky mallet.'}),
  D('Flipjack','#ffa04a','#7a3a1a','stripes',[1,.95,1.15],[P('longLegs',.6,-.62,.45),P('longLegs',.6,-.62,-.45),P('spatula',.62,-.12,.78),P('smallClaws',.78,-.3,.55),P('wideEyes',.34,.46,.82),P('mustache',0,.02,1)],{blurb:'Short-order cook. Flips you, then claws you.'}),
  D('Boomer','#4affd8','#1a6a8a','plain',[.95,.9,1.1],[P('frogLegs',.62,-.6,.4),P('frogLegs',.62,-.6,-.45),P('boomerangBone',.62,-.12,.78),P('snoot',0,.05,1),P('bigEars',.5,.8,.1),P('googlyEye',.32,.42,.84)],{blurb:'Throws a bone from far away, then hops off.'}),
]);
function newDesign(){return D('New Creature',pick(SWATCHES),pick(SWATCHES),'spots',[1,.95,1.15],[P('shortLegs',.6,-.62,.45),P('shortLegs',.6,-.62,-.45),P('basicJaw',0,-.2,.98),P('googlyEye',.34,.46,.82)],{seed:Math.floor(Math.random()*99991)});}

/* Starter template for a play style, built from the best parts the player owns. Each row is one "slot":
   the first owned option is used. Legs come in mirrored pairs. SUGGESTION: the layouts. */
const STYLE_TEMPLATES={
  tank:{body:[1.25,1,1.35],color:'#2fc4a8',accent:'#1d5f86',pattern:'spots',rows:[['shell','bellyPadding'],['rubberMallet','fishSword'],['basicJaw','beak'],['armorPlates','spikes'],['shieldNode'],['googlyEye']],legs:[['shortLegs'],3]},
  bruiser:{body:[1.05,.9,1.25],color:'#ff8a3d',accent:'#ffd36b',pattern:'stripes',rows:[['fishSword','spatula','rubberMallet'],['bigClaws','smallClaws'],['basicJaw','beak'],['horns'],['bellyPadding'],['googlyEye']],legs:[['longLegs','shortLegs'],2]},
  spitter:{body:[1,1.05,1.1],color:'#9a6bff',accent:'#c8ff5a',pattern:'stripes',rows:[['bubbleBlaster','boomerangBone','fishSword'],['spitGland','zapAntennae','basicJaw'],['wideEyes'],['shieldNode','bellyPadding'],['fins'],['googlyEye']],legs:[['shortLegs'],2]},
  support:{body:[.95,.95,1.1],color:'#ff6fae',accent:'#7af0ff',pattern:'belly',rows:[['poolNoodle','fishSword'],['healingGland','shieldNode','bellyPadding'],['basicJaw','beak'],['bigEars','snoot'],['googlyEye']],legs:[['shortLegs'],2]},
  scout:{body:[.9,.85,1.1],color:'#ffd23d',accent:'#3b6bff',pattern:'spots',rows:[['fishSword','poolNoodle'],['wings','fins'],['camoCrest','snoot'],['smallClaws','basicJaw'],['bigEars','wideEyes'],['googlyEye']],legs:[['longLegs','shortLegs'],2]},
  allrounder:{body:[1,.95,1.15],color:'#5ad1ff',accent:'#ffd23d',pattern:'spots',rows:[['spatula','fishSword'],['basicJaw'],['smallClaws'],['spikes','bellyPadding'],['wideEyes'],['googlyEye']],legs:[['longLegs','shortLegs'],2]},
};
function styleTemplate(style,owned){
  owned=owned||(id=>isOwned(id));const t=STYLE_TEMPLATES[style]||STYLE_TEMPLATES.allrounder;
  const parts=[];const add=id=>{const d=PARTS[id];parts.push({id,p:norm3(d.def||[0,1,0]),s:1,r:0,m:d.mirror!==false});};
  const leg=t.legs[0].find(owned)||'shortLegs';const n=t.legs[1];for(let i=0;i<n;i++){const z=n===1?0:.5-i*(1/(n-1));const L=PARTS[leg].def;parts.push({id:leg,p:norm3([L[0],L[1],z]),s:1,r:0,m:true});}
  for(const row of t.rows){const id=row.find(owned);if(id)add(id);}
  const d=D('New '+STYLES[style].name,t.color,t.accent,t.pattern,t.body,parts,{style,seed:Math.floor(Math.random()*99991)+1});
  // keep it inside the budget: drop extras from the end, never the legs
  for(let guard=0;guard<20&&!validateDesign(d).ok;guard++){const i=d.parts.map((p,k)=>[p,k]).reverse().find(([p])=>PARTS[p.id].mount!=='leg');if(!i)break;d.parts.splice(i[1],1);}
  return d;
}

/* ---------- stats, attacks, validation ---------- */
function expandParts(d){const out=[];d.parts.forEach((p,i)=>{const def=PARTS[p.id];if(!def)return;out.push({id:p.id,p:p.p,s:p.s||1,r:p.r||0,def,idx:i,mir:false});
  if(p.m&&def.mount!=='cover'&&def.fam!=='Weapon'&&Math.abs(p.p[0])>.06)out.push({id:p.id,p:[-p.p[0],p.p[1],p.p[2]],s:p.s||1,r:-(p.r||0),def,idx:i,mir:true});});return out;}
function buildAttacks(d){const out=[];const its=expandParts(d);its.sort((a,b)=>(b.def.fam==='Weapon')-(a.def.fam==='Weapon'));for(const it of its){const a=it.def.atk;if(a&&!out.find(x=>x.id===a)){out.push(Object.assign({},ATTACKS[a],{scale:it.s}));if(out.length>=4)break;}}if(!out.length)out.push(Object.assign({},ATTACKS.headbutt,{scale:1}));return out;}
function specialOf(d){for(const p of d.parts){const def=PARTS[p.id];if(def&&def.special)return def.special;}return null;}
function calcStats(d){
  const b=d.body;const vol=b.w*b.h*b.l/1.2;
  let sp=4,to=5+(vol-1)*2,da=5,stb=5,we=8+vol*3,cx=2,armor=false,thorns=0,kb=1,jump=1,glide=false,detect=20,count=0,hasSpit=false;
  const once=new Set(),legs=[];
  for(const it of expandParts(d)){const def=it.def,s=it.s,st=def.s||{};count++;
    we+=(st.weight||0)*s;cx+=def.cx||0;to+=(st.toughness||0)*s;da+=(st.damage||0)*(.6+.4*s);stb+=st.stability||0;
    if(st.speed&&!(def.once&&once.has(it.id)))sp+=st.speed;if(def.once)once.add(it.id);
    if(def.leg)legs.push(it);if(def.armor)armor=true;if(def.thorns)thorns=Math.max(thorns,def.thorns*s);if(def.kbResist)kb=Math.min(kb,def.kbResist);if(def.jump)jump=Math.max(jump,def.jump);if(def.glide)glide=true;if(def.detect)detect+=def.detect;if(def.atk&&ATTACKS[def.atk].ranged)hasSpit=true;}
  if(legs.length){let ls=0;for(const l of legs)ls+=l.def.leg.speed*(.75+.25*l.s);sp+=ls/legs.length;stb+=(Math.min(legs.length,8)-4)*.5;if(legs.length<2)sp-=1;}
  sp-=Math.max(0,we-14)*.06;stb+=(we-10)*.06;
  if(!legs.length)sp=Math.min(sp,1.5+(once.has('fins')?.4:0));
  sp=Math.max(1.2,sp);stb=Math.max(1,stb);detect=Math.min(detect,44);
  let hp=Math.round(100+5*to);const special=specialOf(d);
  let role='Allrounder';
  if(armor&&to>=8)role='Tank';else if(hasSpit)role='Spitter';else if(special==='heal'||special==='shield'&&da<7)role='Support';else if(sp>=5.5&&da>=7)role='Bruiser';else if(detect>=32&&sp>=5)role='Scout';
  // play style: picked by the player, or matches the build's role when left on Auto
  const style=STYLES[d.style]?d.style:ROLE_STYLE[role];const pk=STYLES[style].perk;
  if(pk.hp)hp=Math.round(hp*pk.hp);if(pk.speed)sp*=pk.speed;if(pk.detect)detect+=pk.detect;
  return {speed:sp,toughness:to,damage:da,stability:stb,weight:we,complexity:cx,partCount:count,hp,armor,thorns,kbResist:kb,jump,glide,detect,role,style,styleAuto:!STYLES[d.style],perk:pk,special,attacks:buildAttacks(d),moveSpeed:sp*1.55,radius:Math.max(b.w,b.l)*.95,legCount:legs.length};
}
function isUnlocked(id){const d=PARTS[id];return !!d&&(d.tier==='Free'||progress.level>=d.lv||progress.unlocked.includes(id));}
function isOwned(id){const d=PARTS[id];return !!d&&(d.tier==='Free'||progress.owned.includes(id));}
function validateDesign(d){
  const st=calcStats(d);const issues=[];
  if(st.weight>BUDGET.weight)issues.push('Too heavy: weight '+st.weight.toFixed(1)+' of '+BUDGET.weight+'.');
  if(st.complexity>BUDGET.complexity)issues.push('Too complex: '+st.complexity.toFixed(1)+' of '+BUDGET.complexity+'.');
  if(st.partCount>BUDGET.parts)issues.push('Too many parts: '+st.partCount+' of '+BUDGET.parts+'.');
  const counts={};for(const p of d.parts)counts[p.id]=(counts[p.id]||0)+1;
  for(const id in counts){const def=PARTS[id];if(def&&def.max&&counts[id]>def.max)issues.push('Only '+def.max+' '+def.name+' allowed.');}
  if(d.parts.filter(p=>PARTS[p.id]&&PARTS[p.id].fam==='Weapon').length>1)issues.push('Only one weapon. Creatures have one weapon slot.');
  const notOwned=Object.keys(counts).filter(id=>PARTS[id]&&!isOwned(id));
  const locked=Object.keys(counts).filter(id=>PARTS[id]&&!isUnlocked(id));
  return {ok:!issues.length,issues,notOwned,locked,stats:st,selectable:!issues.length&&!notOwned.length};
}

/* ---------- PlayerProgress (dev profile) ---------- */
function defaultProgress(){const basics=Object.keys(PARTS).filter(k=>PARTS[k].tier==='Basic');return {v:2,dna:0,xp:0,level:1,unlocked:basics.slice(),owned:basics.slice(),campaign:{},daily:{},lastSlot:-1,stats:{matches:0,wins:0,kills:0}};}
let progress=defaultProgress();
(function loadProgress(){const p=store.get(SaveKey('progress2'),null);progress=Sec.progress(p,defaultProgress(),PARTS);})();
function saveProgress(){store.set(SaveKey('progress2'),progress);}
const xpNeeded=l=>200+100*(l-1); // SUGGESTION
function grantXP(n){n=Math.min(1e6,Math.max(0,Math.round(+n)||0));progress.xp=Math.min(1e9,progress.xp+n);const fresh=[];while(progress.xp>=xpNeeded(progress.level)&&progress.level<999){progress.xp-=xpNeeded(progress.level);progress.level++;for(const k in PARTS){const d=PARTS[k];if(d.tier!=='Free'&&d.lv<=progress.level&&!progress.unlocked.includes(k)){progress.unlocked.push(k);fresh.push(d.name);}}}saveProgress();return fresh;}
// The only DNA source. Only MatchManager creates KillReports.
function awardKillDNA(report){if(!report||!report.fromMatch)return 0;const n=report.victimIsPlayer?RW.dnaPlayer:RW.dnaBot;progress.dna+=n;saveProgress();return n;}
function grantDroppedPart(id){if(!progress.unlocked.includes(id))progress.unlocked.push(id);if(!progress.owned.includes(id))progress.owned.push(id);saveProgress();}
function tryBuyPart(id){if(!isUnlocked(id)||isOwned(id))return false;const c=partPrice(id);if(progress.dna<c)return false;progress.dna-=c;progress.owned.push(id);saveProgress();return true;}

/* ---------- CreatureLibrary: saved slots ---------- */
const SLOT_BASE=6;
function slotCount(){return SLOT_BASE+Math.floor((progress.level-1)/5);} // SUGGESTION: +1 slot every 5 levels
const DESIGN_CTX={partIds:PARTS,patterns:PATTERNS,maxParts:BUDGET.parts*2};
let slots=Sec.slots(store.get(SaveKey('slots'),null),DESIGN_CTX,64);
if(!Array.isArray(slots)){slots=[clone(PRESETS[0]),null,null,null,null,null];slots[0].name='My Chompsworth';}
function saveSlots(){store.set(SaveKey('slots'),slots);}
function getSlot(i){return slots[i]||null;}
