(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const PATHS={
    cap:'../cap/',culina:'../culina/',stylia:'../stylia/',express:'../lenaic-express/',uchronies:'../uchronies/',
    arboris:'../bureau-genealogique/index.html',scriptoria:'../bureau-genealogique/index2.html',pistoria:'../bureau-genealogique/index3.html',
    ariane:'../aide_archive/Ariane.html',scribe:'../aide_archive/Scribe-v3.html'
  };

  function localDateKey(date=new Date()){
    const d=new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function clamp(n,min,max){return Math.min(max,Math.max(min,Number(n)||0))}
  function setText(id,text){const el=$(id);if(el)el.textContent=text}

  function updateClock(){
    const d=new Date();
    setText('clockDate',d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).toUpperCase());
    setText('clockTime',d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  }
  updateClock();setInterval(updateClock,1000);

  function currentContext(){
    const h=new Date().getHours();
    if(h>=4&&h<12)return {code:'MATIN.01',title:'BONJOUR LÉNAÏC',text:'Bien dormi ? Commence la journée par ta nuit, puis laisse CAP faire le calcul.'};
    if(h<14)return {code:'MIDI.02',title:'BONJOUR LÉNAÏC',text:'Le terminal est prêt. Repas, activité et actualités sont à portée de touche.'};
    if(h<19)return {code:'APRÈS-MIDI.03',title:'BON APRÈS-MIDI LÉNAÏC',text:'Tes services personnels sont en ligne. Choisis un terminal ou saisis une commande.'};
    return {code:'SOIR.04',title:'BONSOIR LÉNAÏC',text:'Fin de journée : CAP, Culina et le bureau généalogique restent accessibles depuis ce terminal.'};
  }
  function renderContext(){const c=currentContext();setText('contextCode',c.code);setText('greetingTitle',c.title);setText('greetingText',c.text)}

  function showSection(id){
    document.querySelectorAll('.terminal-section').forEach(s=>s.classList.toggle('active',s.id===id));
    document.querySelectorAll('.service-key').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
    if(id==='otarie')initAquarium();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.section)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.go)));

  let palette=localStorage.getItem('3615-palette-v1')||'cyan';
  function applyPalette(){document.body.dataset.palette=palette==='cyan'?'':palette}
  applyPalette();
  $('paletteBtn').addEventListener('click',()=>{palette=palette==='cyan'?'green':palette==='green'?'amber':'cyan';localStorage.setItem('3615-palette-v1',palette);applyPalette()});

  function readCapState(){
    try{return JSON.parse(localStorage.getItem('cap-data')||'{}')}catch(e){return {}}
  }
  function capSleepForToday(){return readCapState()?.daily?.[localDateKey()]?.sleep||null}
  function hasCompleteSleep(s){return s&&Number(s.hours)>0&&Number.isFinite(Number(s.quality))&&Number.isFinite(Number(s.physical))&&Number.isFinite(Number(s.mental))}
  function latestSleepUpdate(){
    if(!window.LenaicBus)return null;
    return LenaicBus.list({type:'sleep.updated',source:'cap',target:'3615'})
      .filter(e=>e.payload?.date===localDateKey())
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]||null;
  }
  function pendingSleepLog(){
    if(!window.LenaicBus)return null;
    return LenaicBus.pending({type:'sleep.logged',source:'3615',target:'cap'})
      .filter(e=>e.payload?.date===localDateKey())
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]||null;
  }
  function renderSleepPanel(){
    const h=new Date().getHours();
    const morning=h>=4&&h<12;
    const capSleep=capSleepForToday();
    const update=latestSleepUpdate();
    const pending=pendingSleepLog();
    const panel=$('sleepPanel'),form=$('sleepForm'),result=$('sleepResult');
    panel.hidden=!(morning||hasCompleteSleep(capSleep)||update||pending);
    if(panel.hidden)return;

    if(update){
      form.hidden=true;result.hidden=false;
      setText('sleepState','CALCULÉ PAR CAP');
      setText('sleepResultScore',`${Math.round(Number(update.payload.score)||0)} %`);
      setText('sleepResultLabel',(update.payload.label||'NUIT ENREGISTRÉE').toUpperCase());
      setText('sleepResultText',`${update.payload.hours||'—'} h · qualité ${update.payload.quality||0} % · physique ${update.payload.physical||0} % · mental ${update.payload.mental||0} %`);
      if(update.status==='pending')LenaicBus.ack(update.id,{consumer:'3615'});
      return;
    }
    if(hasCompleteSleep(capSleep)){
      form.hidden=true;result.hidden=false;
      setText('sleepState','DÉJÀ DANS CAP');
      setText('sleepResultScore',`${capSleep.hours} h`);
      setText('sleepResultLabel','NUIT DÉJÀ RENSEIGNÉE');
      setText('sleepResultText','Les données sont déjà présentes dans CAP. Ouvre CAP pour voir son score de sommeil.');
      return;
    }
    if(pending){
      form.hidden=true;result.hidden=false;
      setText('sleepState','EN ATTENTE DE CAP');
      setText('sleepResultScore','→ CAP');
      setText('sleepResultLabel','NUIT TRANSMISE');
      setText('sleepResultText','CAP intégrera ces quatre valeurs à sa prochaine ouverture et renverra le score au 3615.');
      return;
    }
    form.hidden=false;result.hidden=true;setText('sleepState','À RENSEIGNER');
  }
  $('sleepForm').addEventListener('submit',e=>{
    e.preventDefault();
    const payload={
      date:localDateKey(),
      hours:clamp($('sleepHours3615').value,0,16),
      quality:clamp($('sleepQuality3615').value,0,100),
      physical:clamp($('sleepPhysical3615').value,0,100),
      mental:clamp($('sleepMental3615').value,0,100),
      loggedAt:new Date().toISOString()
    };
    if(!payload.hours)return;
    if(window.LenaicBus)LenaicBus.publish('sleep.logged',payload,{source:'3615',target:'cap'});
    renderSleepPanel();renderBusStatus();
  });

  function renderBusStatus(){
    if(!window.LenaicBus){setText('busStatus','HORS LIGNE');setText('busStatusDetail','Bus non chargé');return}
    const pending=LenaicBus.pending();
    const meals=LenaicBus.pending({type:'meal.proposed',source:'culina',target:'cap'}).length;
    setText('busStatus','ACTIF');setText('busStatusDetail',`${pending.length} message${pending.length>1?'s':''} en attente`);
    setText('culinaStatus',meals?`${meals} À VALIDER`:'PRÊT');
    setText('culinaStatusDetail',meals?'Repas en attente dans CAP':'Cuisine & repas');
    const sleep=capSleepForToday();
    setText('capStatus',hasCompleteSleep(sleep)?'NUIT OK':'PRÊT');
    setText('capStatusDetail',hasCompleteSleep(sleep)?`${sleep.hours} h enregistrées`:'Santé & récupération');
  }
  if(window.LenaicBus)LenaicBus.subscribe(()=>{renderSleepPanel();renderBusStatus()});
  window.addEventListener('storage',e=>{if(e.key==='cap-data'){renderSleepPanel();renderBusStatus()}});

  const commandMap={
    '0':()=>showSection('home'),'accueil':()=>showSection('home'),'home':()=>showSection('home'),
    '1':()=>showSection('services'),'services':()=>showSection('services'),
    '2':()=>showSection('otarie'),'otarie':()=>showSection('otarie'),
    'cap':PATHS.cap,'culina':PATHS.culina,'stylia':PATHS.stylia,'express':PATHS.express,'lenaic express':PATHS.express,'lénaïc express':PATHS.express,
    'uchronies':PATHS.uchronies,'arboris':PATHS.arboris,'scriptoria':PATHS.scriptoria,'pistoria':PATHS.pistoria,'ariane':PATHS.ariane,'fil d ariane':PATHS.ariane,'scribe':PATHS.scribe
  };
  $('commandForm').addEventListener('submit',e=>{
    e.preventDefault();const raw=$('commandInput').value.trim().toLowerCase();const dest=commandMap[raw];
    if(typeof dest==='function')dest();else if(typeof dest==='string')location.href=dest;else{setText('greetingText',`Commande « ${raw||'vide'} » inconnue. Essaie CAP, CULINA, ARBORIS, OTARIE…`)}
    $('commandInput').value='';
  });
  document.addEventListener('keydown',e=>{
    if(/input|textarea|select/i.test(document.activeElement?.tagName||''))return;
    if(e.key==='0')showSection('home');if(e.key==='1')showSection('services');if(e.key==='2')showSection('otarie');
  });

  // Otarie — migration de l'ancien 3615 si ses données existent encore.
  const OTARIE_KEY='3615-otarie-v1';
  function loadOtarieState(){
    try{const own=JSON.parse(localStorage.getItem(OTARIE_KEY)||'null');if(own)return own}catch(e){}
    try{const old=JSON.parse(localStorage.getItem('3615-lenaic-v2')||'{}');if(old.fishLastFedAt||old.fishHungerBase!=null)return {lastFedAt:old.fishLastFedAt||null,hungerBase:Number(old.fishHungerBase)||0}}catch(e){}
    return {lastFedAt:null,hungerBase:20};
  }
  let otarieState=loadOtarieState();
  function saveOtarie(){localStorage.setItem(OTARIE_KEY,JSON.stringify(otarieState))}
  function hunger(){const last=otarieState.lastFedAt?new Date(otarieState.lastFedAt).getTime():Date.now()-6*3600000;const hours=Math.max(0,(Date.now()-last)/3600000);return Math.round(clamp((Number(otarieState.hungerBase)||0)+hours*4,0,100))}
  function renderOtarieStatus(){const h=hunger();setText('otarieHunger',`${h} %`);$('otarieMeter').style.width=`${h}%`;setText('otarieLastFed',otarieState.lastFedAt?new Date(otarieState.lastFedAt).toLocaleString('fr-FR'):'JAMAIS')}

  const aquarium={canvas:null,ctx:null,w:900,h:360,seal:{x:270,y:180,vx:1.3,vy:.45,dir:1},bubbles:[],fish:[],last:0,raf:0};
  function resizeAquarium(){const c=aquarium.canvas;if(!c)return;const rect=c.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(320,Math.round(rect.width*ratio));c.height=Math.max(220,Math.round(rect.height*ratio));aquarium.w=c.width;aquarium.h=c.height}
  function drawSeaLion(ctx,f){
    const scale=Math.max(.8,Math.min(1.5,aquarium.w/800));
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.dir*scale,scale);ctx.fillStyle='#78a8a0';ctx.strokeStyle='#9affdb';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,46,22,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(34,-8,20,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#9fc6bc';ctx.beginPath();ctx.ellipse(50,-5,10,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#001014';ctx.beginPath();ctx.arc(39,-13,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#648f88';ctx.beginPath();ctx.ellipse(-5,18,18,7,.35,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(-38,4,18,7,-.35,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(56,-6);ctx.lineTo(68,-12);ctx.moveTo(56,-4);ctx.lineTo(69,-4);ctx.moveTo(56,-2);ctx.lineTo(68,4);ctx.stroke();ctx.restore();
  }
  function drawAquarium(){const {ctx,w,h}=aquarium;if(!ctx)return;ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(127,255,212,.22)';ctx.lineWidth=2;for(let i=0;i<6;i++){const x=40+i*(w/6);ctx.beginPath();ctx.moveTo(x,h-20);ctx.quadraticCurveTo(x-20,h-90,x+8,h-150);ctx.stroke()}
    aquarium.fish.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#ffd166';ctx.strokeStyle='#ffedaf';ctx.beginPath();ctx.ellipse(0,0,10,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-16,-6);ctx.lineTo(-16,6);ctx.closePath();ctx.fill();ctx.restore()});
    aquarium.bubbles.forEach(b=>{ctx.strokeStyle='rgba(127,255,212,.5)';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke()});
    drawSeaLion(ctx,aquarium.seal);
  }
  function animateAquarium(t){const dt=Math.min(40,t-aquarium.last||16);aquarium.last=t;const f=aquarium.seal,target=aquarium.fish[0];if(target){const dx=target.x-f.x,dy=target.y-f.y,dist=Math.hypot(dx,dy)||1;f.vx=dx/dist*2.25;f.vy=dy/dist*2.25;f.dir=f.vx>=0?1:-1;if(dist<34){aquarium.fish.shift();otarieState.lastFedAt=new Date().toISOString();otarieState.hungerBase=5;saveOtarie();renderOtarieStatus();setText('otarieMessage','L’OTARIE A ATTRAPÉ UN POISSON.');if(navigator.vibrate)navigator.vibrate(60)}}else if(Math.random()<.012){f.vx+=(Math.random()-.5)*.35;f.vy+=(Math.random()-.5)*.25}
    f.vx=Math.max(-2,Math.min(2,f.vx));f.vy=Math.max(-1.2,Math.min(1.2,f.vy));f.dir=f.vx>=0?1:-1;f.x+=f.vx*dt/16;f.y+=f.vy*dt/16;if(f.x<65){f.x=65;f.vx=Math.abs(f.vx)}if(f.x>aquarium.w-65){f.x=aquarium.w-65;f.vx=-Math.abs(f.vx)}if(f.y<45){f.y=45;f.vy=Math.abs(f.vy)}if(f.y>aquarium.h-50){f.y=aquarium.h-50;f.vy=-Math.abs(f.vy)}aquarium.fish.forEach(p=>{p.y=Math.min(aquarium.h-40,p.y+.45*dt/16)});aquarium.bubbles.forEach(b=>b.y-=b.speed*dt/16);aquarium.bubbles=aquarium.bubbles.filter(b=>b.y>-10);if(Math.random()<.025)aquarium.bubbles.push({x:20+Math.random()*(aquarium.w-40),y:aquarium.h-20,r:2+Math.random()*5,speed:.5+Math.random()});drawAquarium();aquarium.raf=requestAnimationFrame(animateAquarium)}
  function initAquarium(){if(aquarium.canvas)return;const c=$('aquariumCanvas');if(!c)return;aquarium.canvas=c;aquarium.ctx=c.getContext('2d');resizeAquarium();aquarium.seal.x=aquarium.w*.35;aquarium.seal.y=aquarium.h*.5;window.addEventListener('resize',resizeAquarium);renderOtarieStatus();aquarium.raf=requestAnimationFrame(animateAquarium)}
  $('feedOtarieBtn').addEventListener('click',()=>{initAquarium();if(hunger()<15){setText('otarieMessage','PAS MAINTENANT : ELLE N’A PLUS FAIM.');return}if(aquarium.fish.length){setText('otarieMessage','LES POISSONS SONT DÉJÀ DANS LE BASSIN.');return}for(let i=0;i<5;i++)aquarium.fish.push({x:aquarium.w*.52+(i-2)*20,y:32+i*11});setText('otarieMessage','ARRIVÉE DES PETITS POISSONS…')});
  setInterval(renderOtarieStatus,60000);

  renderContext();renderSleepPanel();renderBusStatus();renderOtarieStatus();
})();
