(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const PATHS={
    cap:'../cap/',culina:'../culina/',stylia:'../stylia/',express:'../lenaic-express/',uchronies:'../uchronies/',
    arboris:'../bureau-genealogique/index.html',scriptoria:'../bureau-genealogique/index2.html',pistoria:'../bureau-genealogique/index3.html',
    ariane:'../aide_archive/Ariane.html',scribe:'../aide_archive/Scribe-v3.html',nexus:'cms.html'
  };

  const NEXUS_CONFIG_KEY='lenaic-nexus-published-v2';
  const NEXUS_CONFIG_URL='data/nexus-config.json';
  let nexusConfig=null;
  let dynamicCommands={};

  function readJsonStorage(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function htmlSafe(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function currentCmsGreeting(slot,fallback){const v=nexusConfig?.content?.greetings?.[slot];return typeof v==='string'&&v.trim()?v.trim():fallback}

  function renderCmsDirectory(){
    const box=$('servicesDirectory')||document.querySelector('.directory-grid');
    if(!box||!nexusConfig)return;
    const cats=[...(nexusConfig.categories||[])].filter(c=>c.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
    const apps=nexusConfig.applications||[];
    let number=0;
    box.innerHTML=cats.map(cat=>{
      const items=apps.filter(a=>a.visible!==false&&a.category===cat.id).sort((a,b)=>(a.order||0)-(b.order||0));
      if(!items.length)return '';
      number++;
      const links=items.map(a=>`<a href="${htmlSafe(a.url||'#')}"><b>${htmlSafe(a.name||a.id)}</b><small>${htmlSafe(a.description||'')}</small></a>`).join('');
      return `<article class="directory-card${cat.id==='admin'?' nexus-directory':''}"><div class="directory-head"><span>[${String(number).padStart(2,'0')}]</span><strong>${htmlSafe(cat.label||cat.id)}</strong></div>${links}</article>`;
    }).join('');
  }

  function renderCmsSectionServices(){
    if(!nexusConfig)return;
    const map={daily:'dailyServicesGrid',information:'infoServicesGrid',genealogy:'genealogyServicesGrid',leisure:'leisureServicesGrid'};
    const cats=nexusConfig.categories||[];
    const apps=nexusConfig.applications||[];
    for(const [categoryId,containerId] of Object.entries(map)){
      const box=$(containerId);if(!box)continue;
      const items=apps.filter(a=>a.visible!==false&&a.category===categoryId).sort((a,b)=>(a.order||0)-(b.order||0));
      box.innerHTML=items.map(a=>`<a class="portal-app-card" href="${htmlSafe(a.url||'#')}"><b>${htmlSafe(a.name||a.id)}</b><span>${htmlSafe(a.description||'')}</span><i>${htmlSafe(a.command||a.id).toUpperCase()} →</i></a>`).join('');
    }
    const nums={daily:'1',information:'2',genealogy:'3',leisure:'4'};
    for(const c of cats){
      const btn=document.querySelector(`[data-category-tab="${c.id}"]`);if(!btn)continue;
      btn.textContent=`[${nums[c.id]||'·'}] ${String(c.label||c.id).toUpperCase()}`;
      btn.hidden=c.visible===false;
    }
  }

  function applyNexusConfig(cfg){
    if(!cfg)return;
    nexusConfig=cfg;
    const site=cfg.site||{};
    const brand=document.querySelector('.brand-block h1');if(brand&&site.title)brand.textContent=site.title;
    const sub=document.querySelector('.brand-sub');if(sub&&site.subtitle)sub.textContent=site.subtitle;
    const foot=document.querySelectorAll('.footer-line span');if(foot[0]&&site.footerLeft)foot[0].textContent=site.footerLeft;if(foot[1]&&site.footerRight)foot[1].textContent=site.footerRight;
    const bus=document.querySelector('.line-status');if(bus)bus.dataset.cmsHidden=site.showBusStatus===false?'1':'0';
    const official=cfg.content?.officialMessage;if(typeof official==='string'&&official.trim())setText('absurdWelcome',official.trim());else renderAbsurdities();
    renderContext();
    const flow=$('homeCmsFlow');
    if(flow){
      const defs=[...(cfg.homeBlocks||[])].sort((a,b)=>(a.order||0)-(b.order||0));
      defs.forEach((def,i)=>{const el=flow.querySelector(`[data-home-block="${def.id}"]`);if(el){el.style.order=String(i+1);el.dataset.cmsHidden=def.visible===false?'1':'0'}});
    }
    dynamicCommands={};
    for(const a of (cfg.applications||[])){
      if(a.visible===false||!a.url)continue;
      const cmd=String(a.command||a.name||a.id).trim().toLowerCase();
      if(cmd)dynamicCommands[cmd]=a.url;
      dynamicCommands[String(a.id||'').toLowerCase()]=a.url;
      dynamicCommands[String(a.name||'').toLowerCase()]=a.url;
    }
    renderCmsDirectory();
    renderCmsSectionServices();
  }

  function migrateNexusConfig(base,local){
    if(!base)return local;if(!local)return base;
    if(Number(local.version||0)>=Number(base.version||0))return local;
    const next=JSON.parse(JSON.stringify(base));
    if(local.site?.title)next.site.title=local.site.title;
    next.content={...next.content,...(local.content||{}),greetings:{...(next.content?.greetings||{}),...(local.content?.greetings||{})}};
    next.automations={...(next.automations||{}),...(local.automations||{})};
    const oldApps=new Map((local.applications||[]).map(a=>[a.id,a]));
    next.applications=(next.applications||[]).map(a=>{const old=oldApps.get(a.id);if(!old)return a;const keep={};for(const k of ['name','description','url','command','visible','version'])if(old[k]!==undefined)keep[k]=old[k];return {...a,...keep,category:a.category,order:a.order}});
    const oldBlocks=new Map((local.homeBlocks||[]).map(b=>[b.id,b]));
    next.homeBlocks=(next.homeBlocks||[]).map(b=>oldBlocks.has(b.id)?{...b,visible:oldBlocks.get(b.id).visible!==false}:b);
    next.publishedAt=local.publishedAt||null;next.migratedAt=new Date().toISOString();
    try{localStorage.setItem(NEXUS_CONFIG_KEY,JSON.stringify(next))}catch(e){}
    return next;
  }
  async function loadNexusConfig(){
    let base=null;try{const r=await fetch(`${NEXUS_CONFIG_URL}?v=${Date.now()}`,{cache:'no-store'});if(r.ok)base=await r.json()}catch(e){}
    const local=readJsonStorage(NEXUS_CONFIG_KEY);
    applyNexusConfig(migrateNexusConfig(base,local)||base||local);
  }

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

  const WEATHER_CACHE_KEY='3615-weather-cache-v1';
  const WEATHER_MAX_AGE=30*60*1000;
  let weatherData=null;
  let namedayText='—';

  function weatherLabel(code){
    const c=Number(code);
    if(c===0)return ['☀','CIEL CLAIR'];
    if([1,2].includes(c))return ['◐','ÉCLAIRCIES'];
    if(c===3)return ['☁','COUVERT'];
    if([45,48].includes(c))return ['≋','BROUILLARD'];
    if([51,53,55,56,57].includes(c))return ['⌁','BRUINE'];
    if([61,63,65,66,67,80,81,82].includes(c))return ['☂','PLUIE'];
    if([71,73,75,77,85,86].includes(c))return ['✳','NEIGE'];
    if([95,96,99].includes(c))return ['ϟ','ORAGE'];
    return ['◌','VARIABLE'];
  }
  function fmtHour(iso){try{return new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}catch{return '—'}}
  function dayOfYear(d=new Date()){const start=new Date(d.getFullYear(),0,0);return Math.floor((new Date(d.getFullYear(),d.getMonth(),d.getDate())-start)/86400000)}
  function daysInYear(y){return ((y%4===0&&y%100!==0)||y%400===0)?366:365}
  function seasonInfo(d=new Date()){
    const y=d.getFullYear(), today=new Date(y,d.getMonth(),d.getDate());
    const marks=[
      {date:new Date(y,2,20),name:'PRINTEMPS'},
      {date:new Date(y,5,21),name:'ÉTÉ'},
      {date:new Date(y,8,22),name:'AUTOMNE'},
      {date:new Date(y,11,21),name:'HIVER'},
      {date:new Date(y+1,2,20),name:'PRINTEMPS'}
    ];
    let current={name:'HIVER',date:new Date(y-1,11,21)},next=marks[0];
    for(let i=0;i<marks.length-1;i++){if(today>=marks[i].date&&today<marks[i+1].date){current=marks[i];next=marks[i+1];break}}
    if(today<marks[0].date){current={name:'HIVER',date:new Date(y-1,11,21)};next=marks[0]}
    const days=Math.max(0,Math.ceil((next.date-today)/86400000));
    return {name:current.name,next:next.name,days};
  }
  function moonPhase(d=new Date()){
    const syn=29.53058867,epoch=Date.UTC(2000,0,6,18,14),days=(d.getTime()-epoch)/86400000;
    const age=((days%syn)+syn)%syn, f=age/syn;
    if(f<.03||f>.97)return 'NOUVELLE LUNE';
    if(f<.22)return 'PREMIER CROISSANT';
    if(f<.28)return 'PREMIER QUARTIER';
    if(f<.47)return 'GIBBEUSE CROISSANTE';
    if(f<.53)return 'PLEINE LUNE';
    if(f<.72)return 'GIBBEUSE DÉCROISSANTE';
    if(f<.78)return 'DERNIER QUARTIER';
    return 'DERNIER CROISSANT';
  }
  function weatherFromStorage(){try{const x=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||'null');if(x&&Date.now()-Date.parse(x.cachedAt||0)<WEATHER_MAX_AGE)return x.data}catch(e){}return null}
  function saveWeather(data){try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({cachedAt:new Date().toISOString(),data}))}catch(e){}}
  function renderWeather(){
    const w=weatherData;if(!w)return;
    const cur=w.current||{},daily=w.daily||{}, code=cur.weather_code, [icon,label]=weatherLabel(code);
    const max=daily.temperature_2m_max?.[0],min=daily.temperature_2m_min?.[0],rain=daily.precipitation_probability_max?.[0];
    setText('homeWeatherIcon',icon);setText('homeWeatherTemp',`${Math.round(cur.temperature_2m)}°`);setText('homeWeatherLabel',label);setText('homeWeatherMeta',`${Math.round(max)}° / ${Math.round(min)}° · pluie ${Math.round(rain||0)} %`);setText('todayOverviewState',Number(rain||0)>=60?'PARAPLUIE CONSEILLÉ':'CLERMONT-FERRAND');
    setText('dailyWeatherState','À JOUR');setText('dailyWeatherIcon',icon);setText('dailyWeatherTemp',`${Math.round(cur.temperature_2m)}°C`);setText('dailyWeatherLabel',label);
    setText('dailyWeatherFeels',`${Math.round(cur.apparent_temperature)}°C`);setText('dailyWeatherRange',`${Math.round(max)}° / ${Math.round(min)}°`);setText('dailyWeatherRain',`${Math.round(rain||0)} %`);setText('dailyWeatherWind',`${Math.round(cur.wind_speed_10m||0)} KM/H`);
    const f=$('dailyWeatherForecast');if(f){
      const days=(daily.time||[]).slice(0,3).map((t,i)=>{const d=new Date(t+'T12:00:00');const [ic,lab]=weatherLabel(daily.weather_code?.[i]);return `<div><span>${i===0?'AUJ.':d.toLocaleDateString('fr-FR',{weekday:'short'}).toUpperCase()}</span><b>${ic} ${Math.round(daily.temperature_2m_max?.[i])}°</b><small>${lab} · ${Math.round(daily.precipitation_probability_max?.[i]||0)} %</small></div>`}).join('');
      f.innerHTML=days;
    }
    renderEphemeris();
    renderAbsurdities();
  }
  async function loadWeather(force=false){
    if(!force){const cached=weatherFromStorage();if(cached){weatherData=cached;renderWeather();}}
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude=45.7772&longitude=3.0870&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=Europe%2FParis&forecast_days=3';
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);weatherData=await r.json();saveWeather(weatherData);renderWeather();
    }catch(e){if(!weatherData){setText('dailyWeatherState','HORS LIGNE');setText('dailyWeatherLabel','Météo indisponible');setText('homeWeatherLabel','Météo indisponible')}}
  }
  function namedayFromPayload(data){
    const candidates=[data?.name,data?.nom,data?.prenom,data?.prénom,data?.today,data?.fete,data?.fête];
    for(const x of candidates){if(typeof x==='string'&&x.trim())return x.trim()}
    for(const key of ['prenoms','prénoms','fetes','fêtes','names','result']){const x=data?.[key];if(Array.isArray(x)&&x.length)return x.map(v=>typeof v==='string'?v:(v?.name||v?.nom||'')).filter(Boolean).slice(0,3).join(' · ')}
    return '';
  }
  async function loadNameday(){
    try{const r=await fetch('https://dates-des-fetes.com/api/v1/aujourd-hui?pays=fr',{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();namedayText=namedayFromPayload(d)||'—'}catch(e){namedayText='—'}
    renderEphemeris();
  }
  function renderEphemeris(){
    const d=new Date(),season=seasonInfo(d),doy=dayOfYear(d),sunrise=weatherData?.daily?.sunrise?.[0],sunset=weatherData?.daily?.sunset?.[0];
    const full=d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase(),weekday=d.toLocaleDateString('fr-FR',{weekday:'long'}).toUpperCase();
    setText('ephemerisDayName',weekday);setText('ephemerisFullDate',full);setText('ephemerisNameday',namedayText);setText('ephemerisDayOfYear',`${doy} / ${daysInYear(d.getFullYear())}`);
    setText('ephemerisSeason',`${season.name} · J-${season.days} AVANT ${season.next}`);setText('ephemerisSun',sunrise&&sunset?`${fmtHour(sunrise)} → ${fmtHour(sunset)}`:'—');setText('ephemerisMoon',moonPhase(d));setText('ephemerisRepublican',republicanDate(d));
    setText('homeEphemerisDate',`${weekday} ${d.getDate()} ${d.toLocaleDateString('fr-FR',{month:'long'}).toUpperCase()}`);setText('homeEphemerisSeason',`${season.name} · J-${season.days} avant ${season.next.toLowerCase()}`);setText('homeEphemerisSun',sunrise&&sunset?`Soleil ${fmtHour(sunrise)} → ${fmtHour(sunset)}`:`Jour ${doy}/${daysInYear(d.getFullYear())}`);
  }

  function seededIndex(seed,max){
    let h=2166136261;
    for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}
    return Math.abs(h>>>0)%max;
  }
  function renderAbsurdities(){
    const key=localDateKey(),h=new Date().getHours(),weekday=new Date().toLocaleDateString('fr-FR',{weekday:'long'}).toLowerCase();
    const openings=[
      'Bonjour Lénaïc. Le terminal a terminé ses vérifications','Bienvenue à bord. Les archives personnelles sont ouvertes','Connexion établie. Aucun incident majeur n’a été signalé','Nouveau jour détecté. Les circuits semblent étonnamment coopératifs','Le tableau de bord est réveillé. Lui aussi aurait préféré cinq minutes de plus','Session quotidienne initialisée. L’otarie confirme sa présence','Le terminal 3615 LÉNAÏC est opérationnel','Les données du jour sont prêtes. Le café reste sous ta responsabilité','Le Minitel a démarré sans demander de mise à jour. Profitons-en','NEXUS a compté les applications : aucune ne s’est échappée pendant la nuit','Le service informatique imaginaire confirme que tout clignote normalement','Les tubes cathodiques virtuels sont chauds et légèrement prétentieux','Le standard est ouvert. Aucun opérateur humain n’a été dérangé','Le terminal s’est auto-déclaré prêt à affronter les formulaires','Les octets sont rangés. Enfin, la plupart','Le comité central du 3615 vient d’approuver cette journée à une courte majorité','Le système a consulté l’otarie avant de démarrer. Elle n’a opposé aucun veto','Le serveur local n’existe pas vraiment, mais il est quand même de bonne humeur','Le portail a vérifié l’heure deux fois. Elle continue de passer','Les voyants sont au vert, au cyan et parfois à l’ambre pour des raisons esthétiques'
    ];
    const middles=[
      'Tu peux avancer tranquillement, une chose après l’autre.','Les petites actions restent officiellement reconnues comme des actions.','Aucun comité ne t’oblige à tout faire parfaitement.','Le programme peut évoluer sans provoquer d’effondrement administratif.','Le niveau général de mystère demeure acceptable.','Garde un peu de place pour l’imprévu et une autre pour le goûter.','Les priorités ont été examinées par un sous-comité qui nie toute responsabilité.','La machine estime que la journée est statistiquement compatible avec une journée.','Toute tâche terminée avant d’être commencée sera signalée à la direction.','Un clic bien placé vaut parfois trois tableaux Excel.','Les archives ne se consulteront malheureusement pas toutes seules. Nous avons vérifié.','CAP recommande de bouger ; Culina souhaite savoir ce qu’on mange ; Stylia juge silencieusement la tenue.','Les Gémeaux disposent aujourd’hui d’un quota exceptionnel de changements d’avis.','Le bouton retour reste autorisé par décret.','Une pause de cinq minutes ne sera pas inscrite au casier administratif.','Si une liste devient trop longue, le terminal conseille techniquement de fermer les yeux quelques secondes.','L’algorithme du jour a été certifié « probablement raisonnable ».','Les dossiers sans urgence immédiate ont reçu l’autorisation de patienter.','Le progrès reste possible sans ouvrir dix-sept onglets.','La productivité maximale n’est pas une obligation contractuelle du 3615.'
    ];
    const endings=[
      'Bonne exploration.','Le poste de commande est à toi.','Les boutons attendent des instructions.','La situation est sous contrôle, au sens large.','Aucune urgence cosmique n’a été détectée.','Le terminal te souhaite une journée raisonnablement glorieuse.','Merci de ne pas nourrir les formulaires après minuit.','Bonne chance avec les humains et leurs interfaces.','Le service qualité a tamponné « ça devrait aller ».','L’otarie reste joignable en cas de crise diplomatique.','Pense à sauvegarder les découvertes avant de proclamer victoire.','Le 3615 décline toute responsabilité en cas de bonne idée soudaine.','Fin du communiqué. Reprise des activités normales.','La direction remercie le café pour sa coopération.','Le terminal reste ouvert jusqu’à nouvel ordre, c’est-à-dire tout le temps.'
    ];
    const weatherBits=[];
    if(weatherData?.current){const [ic,lab]=weatherLabel(weatherData.current.weather_code);weatherBits.push(`${ic} ${lab.toLowerCase()} à Clermont-Ferrand : le ciel a été officiellement intégré au dossier.`)}
    if(weekday==='vendredi')weatherBits.push('Vendredi détecté : la productivité devient progressivement facultative.');
    if(weekday==='lundi')weatherBits.push('Lundi confirmé par deux sources indépendantes. Aucun recours n’est prévu.');
    if(h>=19)weatherBits.push('Le service du soir rappelle qu’un projet peut parfaitement attendre demain.');
    if(h<9)weatherBits.push('Le terminal accepte les réponses monosyllabiques jusqu’à nouvel ordre.');
    const middlePool=middles.concat(weatherBits);
    setText('absurdWelcome',`${openings[seededIndex(key+'wo',openings.length)]}. ${middlePool[seededIndex(key+'wm',middlePool.length)]} ${endings[seededIndex(key+'we',endings.length)]}`);

    const horoscopeOpen=['Une archive oubliée','Un café légèrement trop ambitieux','Une chaussette indépendante','Un cousin dont personne ne se souvenait','Une notification administrative','Mercure, qui nie toute responsabilité','Un document classé au mauvais endroit','Une idée arrivée sans rendez-vous','Un détail généalogique minuscule','Une otarie intérieure'];
    const verbs=['bouleversera discrètement','tentera de négocier avec','mettra en doute','apportera une précision inutile à','fera semblant de comprendre','réorganisera sans autorisation','observera avec une gravité excessive','provoquera un léger incident diplomatique dans','éclairera brièvement','demandera des justificatifs à'];
    const ends=['ta journée administrative.','ton arbre généalogique.','la hiérarchie naturelle de tes tiroirs.','tes projets les plus raisonnables.','un repas qui ne demandait rien.','ta capacité à ignorer les petits détails.','le conseil secret des Gémeaux.','une décision prise beaucoup trop tôt.','tes finances, mais poliment.','la partie de ton cerveau chargée de retrouver les mots de passe.'];
    const advice=['Conseil cosmique : ne signe rien avec une biscotte.','Les astres recommandent une pause avant toute décision impliquant une imprimante.','Un silence bien placé vaudra aujourd’hui environ trois explications.','Évite de confier une mission importante à un objet qui clignote.','La prudence est conseillée, surtout face aux listes déroulantes.','Aujourd’hui, ton intuition a raison, mais elle refuse de montrer ses sources.','Une bonne surprise est possible entre deux tâches parfaitement banales.'];
    setText('geminiHoroscope',`${horoscopeOpen[seededIndex(key+'a',horoscopeOpen.length)]} ${verbs[seededIndex(key+'b',verbs.length)]} ${ends[seededIndex(key+'c',ends.length)]} ${advice[seededIndex(key+'d',advice.length)]}`);
    const objects=['trombone','cuillère','ticket de caisse','stylo vert','chaussette sobre','dossier beige','petit poisson administratif'];
    setText('geminiLucky',`NOMBRE VAGUEMENT FAVORABLE : ${seededIndex(key+'n',89)+1} · OBJET PROTECTEUR : ${objects[seededIndex(key+'o',objects.length)].toUpperCase()}.`);
  }

  function currentContext(){
    const h=new Date().getHours();
    if(h>=4&&h<12)return {code:'MATIN.01',title:'BONJOUR LÉNAÏC',text:currentCmsGreeting('morning','Bien dormi ? Commence la journée par ta nuit, puis laisse CAP faire le calcul.')};
    if(h<14)return {code:'MIDI.02',title:'BONJOUR LÉNAÏC',text:currentCmsGreeting('noon','Le terminal est prêt. Repas, activité et actualités sont à portée de touche.')};
    if(h<19)return {code:'APRÈS-MIDI.03',title:'BON APRÈS-MIDI LÉNAÏC',text:currentCmsGreeting('afternoon','Tes services personnels sont en ligne. Choisis un terminal ou saisis une commande.')};
    return {code:'SOIR.04',title:'BONSOIR LÉNAÏC',text:currentCmsGreeting('evening','Fin de journée : CAP, Culina et le bureau généalogique restent accessibles depuis ce terminal.')};
  }
  function renderContext(){const c=currentContext();setText('contextCode',c.code);setText('greetingTitle',c.title);setText('greetingText',c.text)}

  function showSection(id){
    document.querySelectorAll('.terminal-section').forEach(s=>s.classList.toggle('active',s.id===id));
    document.querySelectorAll('.service-key').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
    if(id==='detente')initAquarium();
    if(id==='quotidien'){loadWeather();renderEphemeris();renderMeditation()}
    if(id==='genealogie')syncGenealogyTab();
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
  function expressRowsHtml(rows){return rows.map((a,i)=>`<article class="express-story">
      <span class="express-story-rank">${String(i+1).padStart(2,'0')}</span>
      <div class="express-story-main"><strong>${escapeHtml3615(a.title||'Sans titre')}</strong><small>${escapeHtml3615(a.categoryLabel||expressCategoryLabel(a.category))} · ${escapeHtml3615(a.source||'Source')}${expressPublishedLabel(a.publishedAt||a.published_at)?' · '+escapeHtml3615(expressPublishedLabel(a.publishedAt||a.published_at)):''}</small></div>
      <a class="express-story-link" href="${escapeAttr3615(a.url||'../lenaic-express/') }" target="_blank" rel="noopener noreferrer">LIRE ↗</a>
    </article>`).join('')}
  function renderExpressArticles(articles,meta={}){
    const all=Array.isArray(articles)?articles:[],homeRows=all.slice(0,3),infoRows=all.slice(0,8);
    const dt=meta.editionGeneratedAt||meta.generatedAt,d=dt?new Date(dt):null,stamp=d&&Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    const home=$('expressHeadlines');if(home){home.innerHTML=homeRows.length?expressRowsHtml(homeRows):'<div class="express-empty">Aucun titre disponible pour le moment.</div>'}
    const info=$('expressInfoHeadlines');if(info){info.innerHTML=infoRows.length?expressRowsHtml(infoRows):'<div class="express-empty">Aucun titre disponible pour le moment.</div>'}
    document.querySelector('.express-live-card')?.classList.toggle('ready',homeRows.length>0);
    setText('expressLiveState',homeRows.length?`${homeRows.length} TITRES`:'AUCUN TITRE');setText('expressLiveFoot',homeRows.length?`ÉDITION ${stamp} · APERÇU`:'OUVRE LÉNAÏC EXPRESS POUR ACTUALISER');
    setText('expressInfoState',infoRows.length?`${infoRows.length} TITRE${infoRows.length>1?'S':''}`:'AUCUN TITRE');setText('expressInfoFoot',`ÉDITION ${stamp} · PERSONNALISÉE`);
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
        .slice(0,8)
        .map(a=>({id:a.id,title:a.title,category:a.category,categoryLabel:expressCategoryLabel(a.category),source:a.source,url:a.url,publishedAt:a.published_at,score:expressFallbackScore(a)}));
      renderExpressArticles(arr,{editionGeneratedAt:data.generated_at,generatedAt:new Date().toISOString()});
    }catch(e){
      const msg='<div class="express-empty">Impossible de récupérer l’édition. Ouvre Lénaïc Express puis reviens ici.</div>';
      if(box)box.innerHTML=msg;if($('expressInfoHeadlines'))$('expressInfoHeadlines').innerHTML=msg;
      setText('expressLiveState','INDISPONIBLE');setText('expressInfoState','INDISPONIBLE');
      setText('expressLiveFoot','OUVRIR LÉNAÏC EXPRESS →');setText('expressInfoFoot','SOURCE INDISPONIBLE');
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
    syncGenealogyTab();
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

  function syncGenealogyTab(){
    setText('genealogyTabState',$('genealogyOfficeState')?.textContent||'—');
    setText('genealogyTabArboris',$('arborisSummaryTitle')?.textContent||'—');setText('genealogyTabArborisMeta',$('arborisSummaryMeta')?.textContent||'—');
    setText('genealogyTabScriptoria',$('scriptoriaSummaryTitle')?.textContent||'—');setText('genealogyTabScriptoriaMeta',$('scriptoriaSummaryMeta')?.textContent||'—');
    setText('genealogyTabPistoria',$('pistoriaSummaryTitle')?.textContent||'—');setText('genealogyTabPistoriaMeta',$('pistoriaSummaryMeta')?.textContent||'—');
    const action=$('arianeNextAction')?.textContent||$('arianeCaseTitle')?.textContent||'—';setText('genealogyTabAriane',action);setText('genealogyTabArianeMeta',$('arianeNextRef')?.textContent||$('arianeCaseMeta')?.textContent||'—');
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
    if(e.key===NEXUS_CONFIG_KEY)loadNexusConfig();
    if(e.key==='cap-data'){renderSleepPanel();renderBusStatus()}
    if(e.key===CAP_SNAPSHOT_KEY)renderCapLive();
    if(e.key===CULINA_SNAPSHOT_KEY){renderCulinaLive();renderBusStatus()}
    if(e.key===STYLIA_SNAPSHOT_KEY){renderStyliaLive();renderBusStatus()}
    if(e.key===EXPRESS_SNAPSHOT_KEY){renderExpressLive();renderBusStatus()}
    if([ARBORIS_DATA_KEY,SCRIPTORIA_DATA_KEY,PISTORIA_DATA_KEY].includes(e.key)){renderGenealogyOffice();syncGenealogyTab()}
    if(e.key===ARIANE_DATA_KEY){renderArianeLive();syncGenealogyTab()}
    if(e.key===MEDITATION_KEY)renderMeditation();
  });

  const commandMap={
    '0':()=>showSection('home'),'accueil':()=>showSection('home'),'home':()=>showSection('home'),
    '1':()=>showSection('quotidien'),'quotidien':()=>showSection('quotidien'),'daily':()=>showSection('quotidien'),
    '2':()=>showSection('informations'),'info':()=>showSection('informations'),'infos':()=>showSection('informations'),'informations':()=>showSection('informations'),
    '3':()=>showSection('genealogie'),'genealogie':()=>showSection('genealogie'),'généalogie':()=>showSection('genealogie'),
    '4':()=>showSection('detente'),'detente':()=>showSection('detente'),'détente':()=>showSection('detente'),'otarie':()=>showSection('detente'),
    'services':()=>showSection('quotidien'),'meteo':()=>showSection('quotidien'),'météo':()=>showSection('quotidien'),'meditation':()=>showSection('quotidien'),'méditation':()=>showSection('quotidien')
  };
  $('commandForm').addEventListener('submit',e=>{
    e.preventDefault();const raw=$('commandInput').value.trim().toLowerCase();const dest=dynamicCommands[raw]??commandMap[raw];
    if(typeof dest==='function')dest();else if(typeof dest==='string')location.href=dest;else{setText('greetingText',`Commande « ${raw||'vide'} » inconnue. Essaie CAP, CULINA, INFOS, GÉNÉALOGIE, OTARIE ou NEXUS.`)}
    $('commandInput').value='';
  });
  document.addEventListener('keydown',e=>{
    if(/input|textarea|select/i.test(document.activeElement?.tagName||''))return;
    if(e.key==='0')showSection('home');if(e.key==='1')showSection('quotidien');if(e.key==='2')showSection('informations');if(e.key==='3')showSection('genealogie');if(e.key==='4')showSection('detente');
  });

  // Méditation — minuteur local, précis même si l’onglet passe en arrière-plan.
  const MEDITATION_KEY='3615-meditation-v1';
  let meditation={selected:300,remaining:300,running:false,endAt:null,timer:null};
  function meditationStore(){try{return JSON.parse(localStorage.getItem(MEDITATION_KEY)||'{}')}catch{return {}}}
  function meditationSessionsToday(){const d=meditationStore(),key=localDateKey();return (d.sessions||[]).filter(x=>String(x.at||'').startsWith(key))}
  function saveMeditationSession(seconds){const d=meditationStore();d.sessions=Array.isArray(d.sessions)?d.sessions:[];d.sessions.push({at:new Date().toISOString(),seconds});d.sessions=d.sessions.slice(-100);localStorage.setItem(MEDITATION_KEY,JSON.stringify(d))}
  function meditationFmt(sec){sec=Math.max(0,Math.ceil(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
  function renderMeditation(){
    if(meditation.running&&meditation.endAt)meditation.remaining=Math.max(0,(meditation.endAt-Date.now())/1000);
    setText('meditationDisplay',meditationFmt(meditation.remaining));setText('meditationStateLabel',meditation.running?'EN COURS':meditation.remaining<meditation.selected?'EN PAUSE':'PRÊT');
    const pct=meditation.selected?100*(1-meditation.remaining/meditation.selected):0;if($('meditationProgress'))$('meditationProgress').style.width=`${clamp(pct,0,100)}%`;
    const sessions=meditationSessionsToday(),total=Math.round(sessions.reduce((a,x)=>a+(Number(x.seconds)||0),0)/60);setText('meditationHistory',sessions.length?`${sessions.length} séance${sessions.length>1?'s':''} aujourd’hui · ${total} min au total.`:'Aucune séance enregistrée aujourd’hui.');setText('homeMeditationState',sessions.length?`${total} MIN AUJOURD’HUI`:'PRÊT');setText('homeMeditationMeta',sessions.length?`${sessions.length} séance${sessions.length>1?'s':''} terminée${sessions.length>1?'s':''}.`:'Aucune séance aujourd’hui.');
    const btn=$('meditationStartBtn');if(btn)btn.textContent=meditation.running?'PAUSE':(meditation.remaining<meditation.selected?'REPRENDRE':'DÉMARRER');
  }
  function meditationTone(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const ac=new A(),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=528;g.gain.setValueAtTime(.001,ac.currentTime);g.gain.exponentialRampToValueAtTime(.16,ac.currentTime+.03);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.2);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+1.25)}catch(e){}if(navigator.vibrate)navigator.vibrate([120,90,120])}
  function meditationTick(){if(!meditation.running)return;meditation.remaining=Math.max(0,(meditation.endAt-Date.now())/1000);if(meditation.remaining<=0){clearInterval(meditation.timer);meditation.timer=null;meditation.running=false;meditation.remaining=0;saveMeditationSession(meditation.selected);meditationTone();setText('meditationStateLabel','TERMINÉE');renderMeditation();setTimeout(()=>{meditation.remaining=meditation.selected;renderMeditation()},1800);return}renderMeditation()}
  function setMeditationMinutes(min){if(meditation.running)return;const sec=clamp(min,1,90)*60;meditation.selected=sec;meditation.remaining=sec;document.querySelectorAll('[data-meditation-min]').forEach(b=>b.classList.toggle('active',Number(b.dataset.meditationMin)===Number(min)));if($('meditationCustom'))$('meditationCustom').value=Number(min);renderMeditation()}
  document.querySelectorAll('[data-meditation-min]').forEach(b=>b.addEventListener('click',()=>setMeditationMinutes(Number(b.dataset.meditationMin))));
  $('meditationCustom')?.addEventListener('change',e=>setMeditationMinutes(Number(e.target.value)||5));
  $('meditationStartBtn')?.addEventListener('click',()=>{if(meditation.running){meditation.remaining=Math.max(0,(meditation.endAt-Date.now())/1000);meditation.running=false;clearInterval(meditation.timer);meditation.timer=null}else{if(meditation.remaining<=0)meditation.remaining=meditation.selected;meditation.running=true;meditation.endAt=Date.now()+meditation.remaining*1000;meditation.timer=setInterval(meditationTick,250);meditationTick()}renderMeditation()});
  $('meditationResetBtn')?.addEventListener('click',()=>{clearInterval(meditation.timer);meditation.timer=null;meditation.running=false;meditation.remaining=meditation.selected;renderMeditation()});

  // 3615.BIZARRE
  let bizarreSalt=0;
  function renderBizarre(){const key=localDateKey()+'-'+bizarreSalt;const stats=['63 % de chances que ce jour ressemble davantage à un jeudi qu’il ne veut l’admettre.','4 formulaires sur 5 préfèrent être ignorés avant le café.','Le terminal estime à 87 % la probabilité qu’une chaussette soit actuellement mal rangée.','12,4 % des idées excellentes apparaissent exactement quand on devait faire autre chose.','Le coefficient administratif de la journée est fixé à 2,7 trombones.','Selon nos calculs, une pause de cinq minutes dure généralement cinq minutes.','Le niveau de sérieux ambiant est inférieur de 31 % à la moyenne du ministère imaginaire.'];const adv=['Ne prends aucune décision importante sur la base d’une jauge qui clignote.','Si une tâche prend moins de deux minutes, tu peux aussi choisir de la regarder pendant trois.','Aujourd’hui, classe les papiers avant qu’ils ne forment une administration parallèle.','En cas de doute, consulte l’otarie. Elle ne saura pas, mais l’ambiance sera meilleure.','Les boutons « Annuler » sont une conquête sociale. Utilise-les.','Une liste courte reste une liste. Inutile de lui ajouter des cousins.'];const pred=['Un détail inutile deviendra soudain passionnant entre 14 h et 17 h.','Quelqu’un quelque part dira « normalement ça marche » et rien ne sera plus pareil.','Une recherche commencée pour cinq minutes pourrait mystérieusement durer une heure.','Tu retrouveras un objet après avoir cessé de le chercher, conformément au protocole.','Une idée de nouveau micro-site rôde dangereusement dans les environs.'];setText('bizarreStat',stats[seededIndex(key+'s',stats.length)]);setText('bizarreAdvice',adv[seededIndex(key+'a',adv.length)]);setText('bizarrePrediction',pred[seededIndex(key+'p',pred.length)])}
  $('bizarreRefreshBtn')?.addEventListener('click',()=>{bizarreSalt++;renderBizarre()});

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
  function renderOtarieStatus(){const h=hunger();setText('otarieHunger',`${h} %`);if($('otarieMeter'))$('otarieMeter').style.width=`${h}%`;const last=otarieState.lastFedAt?new Date(otarieState.lastFedAt).toLocaleString('fr-FR'):'JAMAIS';setText('otarieLastFed',last);setText('otarieHomeHunger',`${h} %`);setText('otarieHomeLastFed',last);setText('otarieHomeMood',h>75?'TRÈS INTÉRESSÉE PAR LE POISSON':h>45?'SURVEILLE LA CUISINE':h>20?'BAIGNADE EN COURS':'REPUE ET SATISFAITE')}

  let miniOtarieRaf=0;
  function drawMiniOtarie(){
    const c=$('otarieMiniCanvas');if(!c)return;const rect=c.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1),w=Math.max(300,Math.round(rect.width*ratio)),h=Math.max(110,Math.round(rect.height*ratio));if(c.width!==w||c.height!==h){c.width=w;c.height=h}
    const ctx=c.getContext('2d'),t=Date.now()/1000,x=w*(.5+.27*Math.sin(t*.55)),y=h*(.52+.13*Math.sin(t*.83));ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(127,255,212,.18)';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(i*w/4,h);ctx.quadraticCurveTo(i*w/4+20,h*.45,i*w/4+5,h*.15);ctx.stroke()}
    const fake={x,y,vx:1,vy:0,dir:Math.cos(t*.55)>=0?1:-1};const oldW=aquarium.w;aquarium.w=w;drawSeaLion(ctx,fake);aquarium.w=oldW;
    for(let i=0;i<5;i++){const bx=(w*(.15*i+.1)+t*12*(i+1))%w,by=h-(t*18*(i+1))%h;ctx.strokeStyle='rgba(127,255,212,.35)';ctx.beginPath();ctx.arc(bx,by,2+i%3,0,Math.PI*2);ctx.stroke()}
    miniOtarieRaf=requestAnimationFrame(drawMiniOtarie);
  }
  function initMiniOtarie(){if(miniOtarieRaf)return;drawMiniOtarie()}

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

  renderContext();renderAbsurdities();renderEphemeris();renderSleepPanel();renderCapLive();renderCulinaLive();renderStyliaLive();renderExpressLive();renderGenealogyOffice();renderArianeLive();syncGenealogyTab();renderBusStatus();renderOtarieStatus();renderMeditation();renderBizarre();initMiniOtarie();
  loadNexusConfig();loadWeather();loadNameday();
  setInterval(()=>{renderContext();renderCapLive();renderCulinaLive();renderStyliaLive();renderExpressLive();renderBusStatus();renderEphemeris();renderMeditation();renderOtarieStatus();},60000);
  setInterval(renderCulinaLive,3000);
})();
