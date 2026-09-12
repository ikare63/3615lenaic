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

  function republicanDate(date){
    const months=['VENDÉMIAIRE','BRUMAIRE','FRIMAIRE','NIVÔSE','PLUVIÔSE','VENTÔSE','GERMINAL','FLORÉAL','PRAIRIAL','MESSIDOR','THERMIDOR','FRUCTIDOR'];
    const complementary=['DE LA VERTU','DU GÉNIE','DU TRAVAIL','DE L’OPINION','DES RÉCOMPENSES','DE LA RÉVOLUTION'];
    const y=date.getFullYear();
    const thisStart=new Date(y,8,22);
    const start=date>=thisStart?thisStart:new Date(y-1,8,22);
    const republicanYear=start.getFullYear()-1791;
    const dayIndex=Math.floor((new Date(y,date.getMonth(),date.getDate())-start)/86400000);
    if(dayIndex<360){
      const month=Math.floor(dayIndex/30),day=dayIndex%30+1;
      return `${day} ${months[month]} AN ${republicanYear}`;
    }
    const day=dayIndex-359;
    return `${day} JOUR ${complementary[Math.min(day-1,5)]} AN ${republicanYear}`;
  }
  function decimalTime(date){
    const seconds=date.getHours()*3600+date.getMinutes()*60+date.getSeconds()+date.getMilliseconds()/1000;
    const total=Math.floor(seconds*100000/86400);
    const h=Math.floor(total/10000),m=Math.floor((total%10000)/100),sec=total%100;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  function updateClock(){
    const d=new Date();
    setText('clockDate',d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).toUpperCase());
    setText('clockTime',d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    setText('republicanDate',republicanDate(d));
    setText('decimalTime',decimalTime(d));
  }
  updateClock();setInterval(updateClock,250);

  function seededIndex(seed,max){
    let h=2166136261;
    for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}
    return Math.abs(h>>>0)%max;
  }
  function renderAbsurdities(){
    const key=localDateKey();
    const openings=[
      'Bonjour Lénaïc. Le terminal a terminé ses vérifications',
      'Bienvenue à bord. Les archives personnelles sont ouvertes',
      'Connexion établie. Aucun incident majeur n’a été signalé',
      'Nouveau jour détecté. Les circuits semblent étonnamment coopératifs',
      'Bonjour Lénaïc. Le tableau de bord est réveillé',
      'Session quotidienne initialisée. L’otarie confirme sa présence',
      'Le terminal 3615 LÉNAÏC est opérationnel',
      'Les données du jour sont prêtes. Le café reste sous ta responsabilité'
    ];
    const middles=[
      'Tu peux avancer tranquillement, une chose après l’autre.',
      'Les petites actions restent officiellement reconnues comme des actions.',
      'Aucun comité ne t’oblige à tout faire parfaitement.',
      'Le programme peut évoluer sans provoquer d’effondrement administratif.',
      'Le niveau général de mystère demeure acceptable.',
      'Garde un peu de place pour l’imprévu et une autre pour le goûter.',
      'Les priorités ont été examinées par un sous-comité qui nie toute responsabilité.',
      'La machine estime que la journée est statistiquement compatible avec une journée.'
    ];
    const endings=[
      'Bonne exploration.','Le poste de commande est à toi.','Les boutons attendent des instructions.',
      'La situation est sous contrôle, au sens large.','Aucune urgence cosmique n’a été détectée.',
      'Le terminal te souhaite une journée raisonnablement glorieuse.','Merci de ne pas nourrir les formulaires après minuit.'
    ];
    setText('absurdWelcome',`${openings[seededIndex(key+'wo',openings.length)]}. ${middles[seededIndex(key+'wm',middles.length)]} ${endings[seededIndex(key+'we',endings.length)]}`);

    const horoscopeOpen=[
      'Une archive oubliée','Un café légèrement trop ambitieux','Une chaussette indépendante','Un cousin dont personne ne se souvenait',
      'Une notification administrative','Mercure, qui nie toute responsabilité','Un document classé au mauvais endroit','Une idée arrivée sans rendez-vous',
      'Un détail généalogique minuscule','Une otarie intérieure'
    ];
    const verbs=[
      'bouleversera discrètement','tentera de négocier avec','mettra en doute','apportera une précision inutile à','fera semblant de comprendre',
      'réorganisera sans autorisation','observera avec une gravité excessive','provoquera un léger incident diplomatique dans','éclairera brièvement','demandera des justificatifs à'
    ];
    const ends=[
      'ta journée administrative.','ton arbre généalogique.','la hiérarchie naturelle de tes tiroirs.','tes projets les plus raisonnables.',
      'un repas qui ne demandait rien.','ta capacité à ignorer les petits détails.','le conseil secret des Gémeaux.','une décision prise beaucoup trop tôt.',
      'tes finances, mais poliment.','la partie de ton cerveau chargée de retrouver les mots de passe.'
    ];
    const advice=[
      'Conseil cosmique : ne signe rien avec une biscotte.','Les astres recommandent une pause avant toute décision impliquant une imprimante.',
      'Un silence bien placé vaudra aujourd’hui environ trois explications.','Évite de confier une mission importante à un objet qui clignote.',
      'La prudence est conseillée, surtout face aux listes déroulantes.','Aujourd’hui, ton intuition a raison, mais elle refuse de montrer ses sources.',
      'Une bonne surprise est possible entre deux tâches parfaitement banales.'
    ];
    setText('geminiHoroscope',`${horoscopeOpen[seededIndex(key+'a',horoscopeOpen.length)]} ${verbs[seededIndex(key+'b',verbs.length)]} ${ends[seededIndex(key+'c',ends.length)]} ${advice[seededIndex(key+'d',advice.length)]}`);
    const objects=['trombone','cuillère','ticket de caisse','stylo vert','chaussette sobre','dossier beige','petit poisson administratif'];
    setText('geminiLucky',`NOMBRE VAGUEMENT FAVORABLE : ${seededIndex(key+'n',89)+1} · OBJET PROTECTEUR : ${objects[seededIndex(key+'o',objects.length)].toUpperCase()}.`);
  }

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
  const CAP_SNAPSHOT_KEY='lenaic-cap-snapshot-v1';
  function readCapSnapshot(){
    try{return JSON.parse(localStorage.getItem(CAP_SNAPSHOT_KEY)||'null')}catch(e){return null}
  }
  const CULINA_SNAPSHOT_KEY='lenaic-culina-snapshot-v1';
  function readCulinaSnapshot(){
    try{return JSON.parse(localStorage.getItem(CULINA_SNAPSHOT_KEY)||'null')}catch(e){return null}
  }
  const STYLIA_SNAPSHOT_KEY='lenaic-stylia-snapshot-v1';
  function readStyliaSnapshot(){
    try{return JSON.parse(localStorage.getItem(STYLIA_SNAPSHOT_KEY)||'null')}catch(e){return null}
  }
  const EXPRESS_SNAPSHOT_KEY='lenaic-express-snapshot-v1';
  function readExpressSnapshot(){
    try{return JSON.parse(localStorage.getItem(EXPRESS_SNAPSHOT_KEY)||'null')}catch(e){return null}
  }
  function expressAgeHours(article){
    const d=article?.published_at?new Date(article.published_at):null;
    return d&&Number.isFinite(d.getTime())?(Date.now()-d.getTime())/36e5:9999;
  }
  function expressFallbackScore(article){
    let boosts={};
    try{boosts=JSON.parse(localStorage.getItem('lex_category_boosts')||'{}')}catch(e){}
    const age=Math.max(0,expressAgeHours(article));
    const recency=Math.max(0,30-age/6);
    return Number(article?.score||0)+Number(boosts[article?.category]||0)*9+recency;
  }
  function expressHiddenSets(){
    let hidden=[],sources=[];
    try{hidden=JSON.parse(localStorage.getItem('lex_hidden')||'[]')}catch(e){}
    try{sources=JSON.parse(localStorage.getItem('lex_hidden_sources')||'[]')}catch(e){}
    return {hidden:new Set(hidden),sources:new Set(sources)};
  }
  function styliaShadeHex(name=''){
    // Même palette que Stylia : chaque nuance transmise garde sa vraie couleur dans 3615.
    const map={
      'Noir':'#171717','Noir délavé':'#4a4c4e',
      'Blanc':'#f7f7f2','Écru':'#eee5d1','Crème':'#f3e5c6',
      'Gris':'#8f9291','Gris clair':'#c7c9c6','Gris moyen':'#8f9291','Anthracite':'#4e5052',
      'Beige':'#d9c3a4','Sable':'#d9c3a4','Taupe':'#a8957e','Lin':'#d9ccb4',
      'Marron':'#79513a','Camel':'#b57943','Cognac':'#9b5a31','Chocolat':'#5a3928','Noisette':'#856046',
      'Rouge':'#ee003d','Écarlate':'#ee003d','Carmin':'#a61b31','Bordeaux':'#6f2331','Brique':'#ad4d3b','Grenat':'#67202a',
      'Orange':'#ed7c2d','Terracotta':'#bb6246','Rouille':'#9d5030','Corail':'#e98070',
      'Jaune':'#ffeb2e','Citron':'#ffeb2e','Jaune pâle':'#f0df9f','Moutarde':'#c69120','Ocre':'#c88c31','Doré':'#d2a13a',
      'Vert':'#35c97d','Kaki':'#73754c','Olive':'#7b7c45','Forêt':'#244c37','Sauge':'#9da88e','Menthe':'#b8d5c0',
      'Bleu':'#3c75b5','Bleu marine':'#233a55','Bleu ciel':'#91c3e5','Bleu roi':'#3159a3','Bleu pétrole':'#2d636d','Denim':'#587996',
      'Violet':'#9e239d','Prune':'#6f4163','Aubergine':'#513344','Lilas':'#baa6cf','Lavande':'#a79cca',
      'Rose':'#f40063','Rose poudré':'#d8aba9','Vieux rose':'#b98382','Fuchsia':'#d60073','Saumon':'#e78d7b'
    };
    return map[name]||'#7f8c8d';
  }
  function formatShortDate(key){
    if(!key)return '—';
    const d=new Date(key+'T12:00:00');
    return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}):key;
  }
  function renderCapLive(){
    const snap=readCapSnapshot();
    const current=Boolean(snap&&snap.date===localDateKey());
    const card=$('capSummaryCard');
    const measureReminder=$('capMeasuresReminder');

    card?.classList.toggle('stale',!current);
    card?.classList.toggle('completed',Boolean(current&&snap?.activity?.completed));

    if(!current){
      setText('capRecapState','À ACTUALISER');
      setText('capActivityState','OUVRE CAP');
      setText('capActivityIcon','◌');
      setText('capActivityTitle','ACTIVITÉ DU JOUR');
      setText('capActivityMeta','Ouvre CAP une fois pour synchroniser le récapitulatif.');
      setText('capActivityProgress','SYNCHRO LOCALE');
      if($('capActivityBar'))$('capActivityBar').style.width='0%';
      setText('capYesterdayScore','—');
      setText('capYesterdayLabel','EN ATTENTE');
      setText('capYesterdayMeta','Score Cap d’hier');
      setText('capYesterdayCoverage','OUVRE CAP POUR ACTUALISER');
      if(measureReminder)measureReminder.hidden=true;
      return;
    }

    setText('capRecapState','À JOUR');
    const a=snap.activity||{};
    const activityState=a.completed?'SÉANCE TERMINÉE':(a.rest&&a.progress>=100?'REPOS VALIDÉ':'PRÉVU AUJOURD’HUI');
    setText('capActivityState',activityState);
    setText('capActivityIcon',a.icon||'•');
    setText('capActivityTitle',(a.title||'Activité du jour').toUpperCase());
    setText('capActivityMeta',[a.duration,a.focus].filter(Boolean).join(' · ')||'Programme CAP');
    setText('capActivityProgress',`${Math.round(Number(a.progress)||0)} % · ${a.label||''}`);
    if($('capActivityBar'))$('capActivityBar').style.width=`${Math.max(0,Math.min(100,Number(a.progress)||0))}%`;

    const y=snap.yesterday||{};
    setText('capYesterdayScore',y.score==null?'—':String(Math.round(Number(y.score)||0)));
    setText('capYesterdayLabel',(y.label||'DONNÉES INSUFFISANTES').toUpperCase());
    setText('capYesterdayMeta',y.score==null?'Score non calculable':`Score Cap du ${formatShortDate(y.date)} / 100`);
    setText('capYesterdayCoverage',y.score==null?'DONNÉES INSUFFISANTES':`${Math.round(Number(y.coverage)||0)} % DES DONNÉES`);

    const m=snap.measurements||{};
    const days=Number(m.daysUntil);
    const shouldRemind=Boolean(m.latestDate && Number.isFinite(days) && days<=1);
    if(measureReminder)measureReminder.hidden=!shouldRemind;
    if(shouldRemind){
      measureReminder.classList.toggle('due',days<=0);
      if(days===1){
        setText('capMeasuresValue','DEMAIN');
        setText('capMeasuresText',`Mensurations prévues le ${formatShortDate(m.nextDueDate)}.`);
      }else if(days===0){
        setText('capMeasuresValue','AUJOURD’HUI');
        setText('capMeasuresText','Échéance des mensurations aujourd’hui.');
      }else{
        const late=Math.abs(days);
        setText('capMeasuresValue','EN RETARD');
        setText('capMeasuresText',`Échéance dépassée de ${late} jour${late>1?'s':''}.`);
      }
      setText('capMeasuresLast',`DERNIÈRE : ${formatShortDate(m.latestDate)}`);
    }
  }
  function formatClock(ts){
    const d=new Date(Number(ts));
    return Number.isFinite(d.getTime())?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
  }
  function culinaPlansToday(){
    const snap=readCulinaSnapshot();
    if(!snap||!Array.isArray(snap.planned))return [];
    return snap.planned.filter(p=>localDateKey(new Date(Number(p.at)))===localDateKey()).sort((a,b)=>a.at-b.at);
  }
  function renderCulinaSlot(prefix,plan){
    const slot=$(prefix==='culinaLunch'?'culinaLunchSlot':'culinaDinnerSlot');
    if(!plan){
      setText(prefix+'Name','RIEN DE PROGRAMMÉ');
      setText(prefix+'Meta','Programme un repas dans Culina.');
      slot?.classList.remove('ready','missing');
      return;
    }
    const missing=Math.max(0,Number(plan.missingCount)||0);
    setText(prefix+'Name',(plan.name||'Repas Culina').toUpperCase());
    const stock=missing?`${missing} ingrédient${missing>1?'s':''} manquant${missing>1?'s':''}`:'ingrédients principaux disponibles';
    setText(prefix+'Meta',`${formatClock(plan.at)} · ${Math.round(Number(plan.calories)||0)} kcal · ${stock}`);
    slot?.classList.toggle('missing',missing>0);
    slot?.classList.toggle('ready',missing===0);
  }
  function renderCulinaLive(){
    const plans=culinaPlansToday();
    const lunch=plans.find(p=>p.mealType==='lunch')||null;
    const dinner=plans.find(p=>p.mealType==='dinner')||null;
    renderCulinaSlot('culinaLunch',lunch);
    renderCulinaSlot('culinaDinner',dinner);
    const count=plans.length;
    setText('culinaLiveState',count?`${count} PRÉVU${count>1?'S':''}`:'AUCUN REPAS');
    const missing=plans.reduce((n,p)=>n+(Number(p.missingCount)||0),0);
    setText('culinaLiveFoot',count?(missing?`${missing} MANQUANT${missing>1?'S':''} AU TOTAL · NON COMPTABILISÉ DANS CAP`:'TOUT LE PRINCIPAL EST DISPONIBLE · NON COMPTABILISÉ DANS CAP'):'REPAS PRÉVUS · NON COMPTABILISÉS DANS CAP');
  }
  function renderStyliaLive(){
    const snap=readStyliaSnapshot();
    const card=document.querySelector('.stylia-live-card');
    const current=Boolean(snap&&snap.date===localDateKey());
    card?.classList.toggle('ready',current);
    card?.classList.toggle('stale',Boolean(snap&&!current));
    const partsEl=$('styliaParts');
    if(!snap){
      setText('styliaLiveState','AUCUNE TENUE');
      setText('styliaOutfitName','AUCUNE TENUE DU JOUR');
      setText('styliaOutfitWhy','Valide une tenue dans Stylia pour l’afficher ici.');
      setText('styliaLiveFoot','DERNIÈRE TENUE VALIDÉE');
      if(partsEl)partsEl.innerHTML='';
      setText('styliaStatus','PRÊT');
      setText('styliaStatusDetail','Tenue du jour');
      return;
    }
    setText('styliaLiveState',current?'TENUE VALIDÉE':'DERNIÈRE TENUE');
    setText('styliaOutfitName',(snap.name||'Tenue Stylia').toUpperCase());
    setText('styliaOutfitWhy',snap.why||'Tenue validée depuis Stylia.');
    const defs=[['top','HAUT'],['bottom','BAS'],['outer','COUCHE'],['shoes','CHAUSSURES'],['accessory','ACCESSOIRE']];
    const parts=defs.filter(([key])=>snap[key]).map(([key,label])=>({label,...snap[key]}));
    if(partsEl)partsEl.innerHTML=parts.map(part=>`<div class="stylia-part"><span>${part.label}</span><strong>${String(part.piece||'—').toUpperCase()}</strong><small><i class="stylia-swatch" style="background:${styliaShadeHex(part.shade)}"></i>${String(part.shade||'—').toUpperCase()}</small></div>`).join('');
    const when=snap.generatedAt?new Date(snap.generatedAt):null;
    const time=when&&Number.isFinite(when.getTime())?when.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
    setText('styliaLiveFoot',`${current?'AUJOURD’HUI':'ARCHIVE'} · ${time}${snap.rain?' · PARAPLUIE CONSEILLÉ':''}`);
    setText('styliaStatus',current?'VALIDÉE':'À ACTUALISER');
    setText('styliaStatusDetail',current?(snap.accessory?.piece==='Parapluie'?'Tenue validée + parapluie':snap.name||'Tenue validée'):'Valide une tenue dans Stylia');
  }

  function expressCategoryLabel(key){
    return ({genealogie:'GÉNÉALOGIE',histoire:'HISTOIRE',local:'LOCAL',tech:'WEB / TECH',culture:'CULTURE',sciences:'SCIENCES',general:'ACTUALITÉ'})[key]||String(key||'ACTUALITÉ').toUpperCase();
  }
  function expressPublishedLabel(value){
    const d=value?new Date(value):null;
    if(!d||!Number.isFinite(d.getTime()))return '';
    const today=localDateKey(d)===localDateKey();
    return today?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
  }
  function renderExpressArticles(articles,meta={}){
    const box=$('expressHeadlines');
    if(!box)return;
    const rows=(Array.isArray(articles)?articles:[]).slice(0,5);
    if(!rows.length){
      box.innerHTML='<div class="express-empty">Aucun titre disponible pour le moment.</div>';
      setText('expressLiveState','AUCUN TITRE');
      setText('expressLiveFoot','OUVRE LÉNAÏC EXPRESS POUR ACTUALISER');
      return;
    }
    box.innerHTML=rows.map((a,i)=>`<article class="express-story">
      <span class="express-story-rank">${String(i+1).padStart(2,'0')}</span>
      <div class="express-story-main"><strong>${escapeHtml3615(a.title||'Sans titre')}</strong><small>${escapeHtml3615(a.categoryLabel||expressCategoryLabel(a.category))} · ${escapeHtml3615(a.source||'Source')}${expressPublishedLabel(a.publishedAt||a.published_at)?' · '+escapeHtml3615(expressPublishedLabel(a.publishedAt||a.published_at)):''}</small></div>
      <a class="express-story-link" href="${escapeAttr3615(a.url||'../lenaic-express/') }" target="_blank" rel="noopener noreferrer">LIRE ↗</a>
    </article>`).join('');
    document.querySelector('.express-live-card')?.classList.add('ready');
    setText('expressLiveState',`${rows.length} TITRE${rows.length>1?'S':''}`);
    const dt=meta.editionGeneratedAt||meta.generatedAt;
    const d=dt?new Date(dt):null;
    const stamp=d&&Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    setText('expressLiveFoot',`ÉDITION ${stamp} · APERÇU PERSONNALISÉ`);
  }
  function escapeHtml3615(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function escapeAttr3615(value){return escapeHtml3615(value)}
  let expressFetchInFlight=false;
  async function fetchJsonWithTimeout(url,timeoutMs=7000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const res=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(!res.ok)throw new Error('HTTP '+res.status);
      return await res.json();
    }finally{
      clearTimeout(timer);
    }
  }
  async function loadExpressFallback(){
    if(expressFetchInFlight)return;
    expressFetchInFlight=true;
    const box=$('expressHeadlines');
    setText('expressLiveState','SYNCHRO…');
    try{
      // Chemin absolu : évite toute ambiguïté entre /3615lenaic/ et /lenaic-express/.
      const data=await fetchJsonWithTimeout('/lenaic-express/data/actualites.json?ts='+Date.now(),7000);
      const {hidden,sources}=expressHiddenSets();
      const arr=(Array.isArray(data.articles)?data.articles:[])
        .filter(a=>!hidden.has(a.id)&&!sources.has(a.source))
        .sort((a,b)=>expressFallbackScore(b)-expressFallbackScore(a))
        .slice(0,5)
        .map(a=>({id:a.id,title:a.title,category:a.category,categoryLabel:expressCategoryLabel(a.category),source:a.source,url:a.url,publishedAt:a.published_at,score:expressFallbackScore(a)}));
      renderExpressArticles(arr,{editionGeneratedAt:data.generated_at,generatedAt:new Date().toISOString()});
    }catch(e){
      if(box)box.innerHTML='<div class="express-empty">Impossible de récupérer l’édition. Ouvre Lénaïc Express puis reviens ici.</div>';
      setText('expressLiveState','INDISPONIBLE');
      setText('expressLiveFoot','OUVRIR LÉNAÏC EXPRESS →');
    }finally{
      expressFetchInFlight=false;
    }
  }

  function renderExpressLive(){
    const snap=readExpressSnapshot();
    if(snap&&Array.isArray(snap.top)&&snap.top.length){
      renderExpressArticles(snap.top,snap);
      return;
    }
    loadExpressFallback();
  }


  const ARBORIS_DATA_KEY='memoire-famille-data';
  const SCRIPTORIA_DATA_KEY='scriptoria-data';
  const PISTORIA_DATA_KEY='pistoria_private_v3';
  const ARIANE_DATA_KEY='ariane-local-v2';

  function readLocalJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}
  }
  function upperText(value,fallback='—'){
    const text=String(value||'').trim();return (text||fallback).toUpperCase();
  }
  function personDisplayName(p){return [p?.firstNames,p?.lastName].filter(Boolean).join(' ').trim()||'Individu sans nom'}
  function timeValue(obj,fields=['createdAt','updatedAt']){
    for(const field of fields){const t=Date.parse(obj?.[field]||'');if(Number.isFinite(t))return t}
    return 0;
  }
  function renderGenealogyOffice(){
    let ready=0;

    const arboris=readLocalJson(ARBORIS_DATA_KEY);
    if(arboris&&Array.isArray(arboris.people)){
      ready++;
      const people=arboris.people;
      const latest=[...people].sort((a,b)=>timeValue(b,['createdAt','updatedAt'])-timeValue(a,['createdAt','updatedAt']))[0]||null;
      setText('arborisSummaryTitle',latest?upperText(personDisplayName(latest)):'AUCUN INDIVIDU');
      const details=[];
      if(latest?.sosa)details.push(`Sosa ${latest.sosa}`);
      if(latest?.branch)details.push(latest.branch);
      details.push(`${people.length} individu${people.length>1?'s':''}`);
      setText('arborisSummaryMeta',`Dernier ajouté · ${details.join(' · ')}`);
    }else{
      setText('arborisSummaryTitle','OUVRE ARBORIS UNE FOIS');
      setText('arborisSummaryMeta','Aucune donnée Arboris trouvée dans ce navigateur.');
    }

    const scriptoria=readLocalJson(SCRIPTORIA_DATA_KEY);
    if(scriptoria&&Array.isArray(scriptoria.records)){
      ready++;
      const registers=Array.isArray(scriptoria.registers)?scriptoria.registers:[];
      const notes=scriptoria.settings?.registerYearNotes||{};
      const partialYears=Object.entries(notes)
        .filter(([,v])=>!v?.complete && /partiel|incompl|en cours|lacunaire/i.test(`${v?.status||''} ${v?.note||''}`))
        .map(([year,v])=>({year:Number(year)||0,v}))
        .filter(x=>x.year)
        .sort((a,b)=>b.year-a.year);
      const currentReg=[...registers]
        .filter(r=>/en cours|partiellement|à vérifier/i.test(String(r?.status||'')))
        .sort((a,b)=>timeValue(b,['updatedAt','createdAt'])-timeValue(a,['updatedAt','createdAt']))[0]||null;
      let label='BASE DES REGISTRES';
      let count=scriptoria.records.length;
      let meta='';
      if(partialYears.length){
        const year=partialYears[0].year;
        count=scriptoria.records.filter(r=>String(r?.date||r?.year||'').startsWith(String(year))).length;
        label=`ANNÉE ${year}`;
        meta=`${count} acte${count>1?'s':''} pour ${year} · ${scriptoria.records.length} au total`;
      }else if(currentReg){
        label=currentReg.title||currentReg.cote||'REGISTRE EN COURS';
        count=scriptoria.records.filter(r=>r.registerId===currentReg.id).length;
        const loc=currentReg.communeParish||currentReg.commune||currentReg.parish||'';
        const period=[currentReg.startYear,currentReg.endYear].filter(Boolean).join('–');
        meta=[`${count} acte${count>1?'s':''}`,loc,period].filter(Boolean).join(' · ');
      }else{
        const years=scriptoria.records.map(r=>Number(String(r?.date||r?.year||'').slice(0,4))).filter(Boolean);
        const latestYear=years.length?Math.min(...years):null;
        if(latestYear){label=`REGISTRES JUSQU’À ${latestYear}`}
        meta=`${scriptoria.records.length} acte${scriptoria.records.length>1?'s':''} · ${registers.length} registre${registers.length>1?'s':''}`;
      }
      setText('scriptoriaSummaryTitle',upperText(label));
      setText('scriptoriaSummaryMeta',meta||`${scriptoria.records.length} actes indexés`);
    }else{
      setText('scriptoriaSummaryTitle','OUVRE SCRIPTORIA UNE FOIS');
      setText('scriptoriaSummaryMeta','Aucune donnée Scriptoria trouvée dans ce navigateur.');
    }

    const pistoria=readLocalJson(PISTORIA_DATA_KEY);
    if(pistoria&&Array.isArray(pistoria.investigations)){
      ready++;
      const open=pistoria.investigations
        .filter(inv=>!['resolved','archived','closed'].includes(String(inv?.status||'').toLowerCase()))
        .sort((a,b)=>(Number(a?.priorityRank)||999999)-(Number(b?.priorityRank)||999999));
      const inv=open[0]||null;
      if(inv){
        const step=(inv.steps||[]).find(st=>String(st?.status||'').toLowerCase()==='todo')
          ||(inv.steps||[]).find(st=>!['done','found','partial','negative','skipped','locked'].includes(String(st?.status||'').toLowerCase()))
          ||null;
        const who=[inv.sosa?`Sosa ${inv.sosa}`:'',inv.person||''].filter(Boolean).join(' · ');
        setText('pistoriaSummaryTitle',upperText(who||'PISTE PRIORITAIRE'));
        setText('pistoriaSummaryMeta',step?.title||`${open.length} enquête${open.length>1?'s':''} encore ouverte${open.length>1?'s':''}`);
      }else{
        setText('pistoriaSummaryTitle','AUCUNE ENQUÊTE OUVERTE');
        setText('pistoriaSummaryMeta',`${pistoria.investigations.length} enquête${pistoria.investigations.length>1?'s':''} dans Pistoria`);
      }
    }else{
      setText('pistoriaSummaryTitle','OUVRE PISTORIA UNE FOIS');
      setText('pistoriaSummaryMeta','Aucune donnée Pistoria trouvée dans ce navigateur.');
    }

    setText('genealogyOfficeState',ready===3?'À JOUR':ready?`${ready}/3 DISPONIBLES`:'EN ATTENTE');
    setText('genealogyOfficeFoot',ready===3?'ARBORIS · SCRIPTORIA · PISTORIA':'OUVRE LES OUTILS POUR INITIALISER LE RÉCAP');
  }

  function renderArianeLive(){
    const ariane=readLocalJson(ARIANE_DATA_KEY);
    const nextBox=$('arianeNextBox');
    if(!ariane||!Array.isArray(ariane.cases)){
      setText('arianeLiveState','EN ATTENTE');
      setText('arianeCaseTitle','OUVRE ARIANE UNE FOIS');
      setText('arianeCaseMeta','Aucune donnée Ariane trouvée dans ce navigateur.');
      setText('arianeLiveFoot','DOSSIERS D’ENQUÊTES');
      if(nextBox)nextBox.hidden=true;
      return;
    }
    let current=ariane.cases.find(c=>c.id===ariane.activeId)||null;
    if(!current)current=ariane.cases.find(c=>!['Terminée','Archivée'].includes(c?.status))||ariane.cases[0]||null;
    if(!current){
      setText('arianeLiveState','AUCUNE ENQUÊTE');
      setText('arianeCaseTitle','AUCUN DOSSIER');
      setText('arianeCaseMeta','Crée une enquête dans Ariane pour la retrouver ici.');
      setText('arianeLiveFoot','0 DOSSIER');
      if(nextBox)nextBox.hidden=true;
      return;
    }
    const items=Array.isArray(current.items)?current.items:[];
    const remaining=items.filter(i=>!i.done);
    const next=remaining[0]||null;
    setText('arianeLiveState',upperText(current.status||'EN COURS'));
    setText('arianeCaseTitle',upperText(current.title||'DOSSIER SANS TITRE'));
    const meta=[current.place,current.type,`${remaining.length} cote${remaining.length>1?'s':''} restante${remaining.length>1?'s':''}`].filter(Boolean).join(' · ');
    setText('arianeCaseMeta',meta||'Enquête active');
    setText('arianeLiveFoot',`${remaining.length}/${items.length} À VÉRIFIER · ${ariane.cases.length} DOSSIER${ariane.cases.length>1?'S':''}`);
    if(nextBox)nextBox.hidden=!next;
    if(next){
      setText('arianeNextAction',upperText(next.label||'PIÈCE À VÉRIFIER'));
      const ref=[next.cote?`Cote ${next.cote}`:'',next.dossier?`Dossier ${next.dossier}`:''].filter(Boolean).join(' · ');
      setText('arianeNextRef',ref||'Référence à compléter dans Ariane');
    }
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
    panel.hidden=!morning;
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
    const planned=culinaPlansToday().length;
    setText('busStatus','ACTIF');setText('busStatusDetail',`${pending.length} message${pending.length>1?'s':''} en attente`);
    setText('culinaStatus',meals?`${meals} À VALIDER`:(planned?`${planned} PRÉVU${planned>1?'S':''}`:'PRÊT'));
    setText('culinaStatusDetail',meals?'Repas en attente dans CAP':(planned?'Repas du jour synchronisés':'Cuisine & repas'));
    const sleep=capSleepForToday();
    setText('capStatus',hasCompleteSleep(sleep)?'NUIT OK':'PRÊT');
    setText('capStatusDetail',hasCompleteSleep(sleep)?`${sleep.hours} h enregistrées`:'Santé & récupération');
  }
  if(window.LenaicBus)LenaicBus.subscribe(()=>{renderSleepPanel();renderBusStatus();renderCapLive();renderCulinaLive();renderStyliaLive();renderExpressLive();renderGenealogyOffice();renderArianeLive()});
  window.addEventListener('storage',e=>{
    if(e.key==='cap-data'){renderSleepPanel();renderBusStatus()}
    if(e.key===CAP_SNAPSHOT_KEY)renderCapLive();
    if(e.key===CULINA_SNAPSHOT_KEY){renderCulinaLive();renderBusStatus()}
    if(e.key===STYLIA_SNAPSHOT_KEY){renderStyliaLive();renderBusStatus()}
    if(e.key===EXPRESS_SNAPSHOT_KEY){renderExpressLive();renderBusStatus()}
    if([ARBORIS_DATA_KEY,SCRIPTORIA_DATA_KEY,PISTORIA_DATA_KEY].includes(e.key))renderGenealogyOffice();
    if(e.key===ARIANE_DATA_KEY)renderArianeLive();
  });

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

  renderContext();renderAbsurdities();renderSleepPanel();renderCapLive();renderCulinaLive();renderStyliaLive();renderExpressLive();renderGenealogyOffice();renderArianeLive();renderBusStatus();renderOtarieStatus();
  setInterval(()=>{renderContext();renderCapLive();renderCulinaLive();renderStyliaLive();renderExpressLive();renderBusStatus();},60000);
  setInterval(renderCulinaLive,3000);
})();
