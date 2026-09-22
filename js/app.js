(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const APP_VERSION='9.18';
  const PATHS={
    cap:'../cap/',culina:'../culina/',express:'../lenaic-express/',uchronies:'../uchronies/',
    arboris:'../bureau-genealogique/index.html',scriptoria:'../bureau-genealogique/index2.html',pistoria:'../bureau-genealogique/index3.html',
    ariane:'../aide_archive/Ariane.html',scribe:'../aide_archive/Scribe-v3.html',nexus:'cms.html'
  };

  const NEXUS_CONFIG_KEY='lenaic-nexus-published-v2';
  const NEXUS_CONFIG_URL='data/nexus-config.json';
  const SCRIBE_DATA_KEY='scribe-local-v3';
  const SCRIBE_SNAPSHOT_KEY='lenaic-scribe-snapshot-v1';
  let nexusConfig=null;
  let dynamicCommands={};

  function readJsonStorage(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function htmlSafe(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function currentCmsGreeting(slot,fallback){const v=nexusConfig?.content?.greetings?.[slot];return typeof v==='string'&&v.trim()?v.trim():fallback}

  function renderCmsDirectory(){
    const box=$('servicesDirectory')||document.querySelector('.directory-grid');
    if(!box||!nexusConfig)return;
    const cats=[...(nexusConfig.categories||[])].filter(c=>c.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
    const apps=(nexusConfig.applications||[]).filter(a=>String(a.id||'').toLowerCase()!=='stylia');
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
    const apps=(nexusConfig.applications||[]).filter(a=>String(a.id||'').toLowerCase()!=='stylia');
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

  function renderPortalTabs(){
    if(!nexusConfig)return;
    const tabs=[...(nexusConfig.portalTabs||[])].sort((a,b)=>(a.order||0)-(b.order||0));
    for(const [i,t] of tabs.entries()){
      const btn=document.querySelector(`.service-key[data-section="${t.id}"]`);
      if(!btn)continue;
      btn.textContent=`[${t.code??'·'}] ${String(t.label||t.id).toUpperCase()}`;
      btn.hidden=t.visible===false;
      btn.style.order=String(i+1);
    }
  }

  function applyNexusConfig(cfg){
    if(!cfg)return;
    nexusConfig=cfg;
    const site=cfg.site||{};
    const brand=document.querySelector('.brand-block h1');if(brand&&site.title)brand.textContent=site.title;
    const sub=document.querySelector('.brand-sub');if(sub&&site.subtitle)sub.textContent=site.subtitle;
    const foot=document.querySelectorAll('.footer-line span');if(foot[0])foot[0].textContent=`3615 LÉNAÏC // VERSION ${APP_VERSION}`;if(foot[1]&&site.footerRight)foot[1].textContent=site.footerRight;
    const bus=document.querySelector('.line-status');if(bus)bus.dataset.cmsHidden=site.showBusStatus===false?'1':'0';
    const official=cfg.content?.officialMessage;if(typeof official==='string'&&official.trim())setText('absurdWelcome',official.trim());else renderAbsurdities();
    renderContext();
    const flow=$('homeCmsFlow');
    if(flow){
      const defs=[...(cfg.homeBlocks||[])].sort((a,b)=>(a.order||0)-(b.order||0));
      defs.forEach((def,i)=>{const el=flow.querySelector(`[data-home-block="${def.id}"]`);if(el){el.style.order=String(i+1);el.dataset.cmsHidden=def.visible===false?'1':'0'}});
      const modulesIndex=defs.findIndex(def=>def.id==='modules'),remindersIndex=defs.findIndex(def=>def.id==='reminders'),specialOrder=(modulesIndex>=0?modulesIndex+1:remindersIndex>=0?remindersIndex+2:6);
      [$('homeTomorrowReminders'),$('transportMonthRecapHome')].filter(Boolean).forEach(el=>el.style.order=String(specialOrder));
    }
    dynamicCommands={};
    for(const a of (cfg.applications||[])){
      if(String(a.id||'').toLowerCase()==='stylia')continue;
      if(a.visible===false||!a.url)continue;
      const cmd=String(a.command||a.name||a.id).trim().toLowerCase();
      if(cmd)dynamicCommands[cmd]=a.url;
      dynamicCommands[String(a.id||'').toLowerCase()]=a.url;
      dynamicCommands[String(a.name||'').toLowerCase()]=a.url;
    }
    renderCmsDirectory();
    renderCmsSectionServices();
    renderPortalTabs();
    renderSavings52();
  }

  function migrateNexusConfig(base,local){
    if(!base)return local;if(!local)return base;
    const bt=Date.parse(base.publishedAt||'')||0,lt=Date.parse(local.publishedAt||'')||0;
    // Une publication GitHub plus récente devient la référence sur tous les appareils.
    if(bt>lt)return base;
    if(Number(local.version||0)>=Number(base.version||0))return local;
    const next=JSON.parse(JSON.stringify(base));
    if(local.site?.title)next.site.title=local.site.title;
    next.content={...next.content,...(local.content||{}),greetings:{...(next.content?.greetings||{}),...(local.content?.greetings||{})}};
    next.automations={...(next.automations||{}),...(local.automations||{})};
    const oldApps=new Map((local.applications||[]).map(a=>[a.id,a]));
    next.applications=(next.applications||[]).map(a=>{const old=oldApps.get(a.id);if(!old)return a;const keep={};for(const k of ['name','description','url','command','visible','version'])if(old[k]!==undefined)keep[k]=old[k];return {...a,...keep,category:a.category,order:a.order}});
    const oldBlocks=new Map((local.homeBlocks||[]).map(b=>[b.id,b]));
    next.homeBlocks=(next.homeBlocks||[]).map(b=>oldBlocks.has(b.id)?{...b,visible:oldBlocks.get(b.id).visible!==false}:b);
    const oldTabs=new Map((local.portalTabs||[]).map(t=>[t.id,t]));
    next.portalTabs=(next.portalTabs||[]).map(t=>{const old=oldTabs.get(t.id);return old?{...t,label:old.label||t.label,visible:old.visible!==false,order:Number.isFinite(Number(old.order))?Number(old.order):t.order}:t});
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
      'Tu peux avancer tranquillement, une chose après l’autre.','Les petites actions restent officiellement reconnues comme des actions.','Aucun comité ne t’oblige à tout faire parfaitement.','Le programme peut évoluer sans provoquer d’effondrement administratif.','Le niveau général de mystère demeure acceptable.','Garde un peu de place pour l’imprévu et une autre pour le goûter.','Les priorités ont été examinées par un sous-comité qui nie toute responsabilité.','La machine estime que la journée est statistiquement compatible avec une journée.','Toute tâche terminée avant d’être commencée sera signalée à la direction.','Un clic bien placé vaut parfois trois tableaux Excel.','Les archives ne se consulteront malheureusement pas toutes seules. Nous avons vérifié.','CAP recommande de bouger ; Culina souhaite savoir ce qu’on mange ; l’otarie supervise le reste.','Les Gémeaux disposent aujourd’hui d’un quota exceptionnel de changements d’avis.','Le bouton retour reste autorisé par décret.','Une pause de cinq minutes ne sera pas inscrite au casier administratif.','Si une liste devient trop longue, le terminal conseille techniquement de fermer les yeux quelques secondes.','L’algorithme du jour a été certifié « probablement raisonnable ».','Les dossiers sans urgence immédiate ont reçu l’autorisation de patienter.','Le progrès reste possible sans ouvrir dix-sept onglets.','La productivité maximale n’est pas une obligation contractuelle du 3615.'
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
    if(id==='aujourdhui'){loadWeather();renderEphemeris();renderV9Today()}
    if(id==='rdv')renderRdv();
    if(id==='quotidien')renderV9Daily();
    if(id==='sante'){renderMeditation();renderV9Health()}
    if(id==='informations')renderV9Info();
    if(id==='genealogie'){syncGenealogyTab();renderAnniversaries()}
    if(id==='archives')renderV9Archives();
    if(id==='systeme')renderV9System();
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
    return ({politique:'POLITIQUE',sondages:'SONDAGES',local:'LOCAL',medias:'MÉDIAS / TV',genealogie:'GÉNÉALOGIE',histoire:'HISTOIRE / PATRIMOINE',tech:'TECH / IA',sciences:'SCIENCES / SOCIÉTÉ',culture:'CULTURE',international:'INTERNATIONAL',general:'ACTUALITÉ'})[key]||String(key||'ACTUALITÉ').toUpperCase();
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
  function expressBriefHtml(brief,{compact=false}={}){
    const themes=Array.isArray(brief?.themes)?brief.themes.filter(t=>t&&t.text):[];
    if(!themes.length)return '';
    const generated=brief.generated_at?new Date(brief.generated_at):null;
    const stamp=generated&&Number.isFinite(generated.getTime())?generated.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    const articleCount=Number(brief.article_count)||themes.reduce((n,t)=>n+(Number(t.article_count)||0),0);
    return `<section class="express-brief ${compact?'compact':''}">
      <div class="express-brief-head"><span>BRIEF DU JOUR · SYNTHÈSE IA</span><small>${articleCount} ARTICLE${articleCount>1?'S':''} · ${escapeHtml3615(stamp)}</small></div>
      <div class="express-brief-themes">${themes.map(t=>`<article class="express-brief-theme"><strong>${escapeHtml3615(t.label||expressCategoryLabel(t.category))}</strong><p>${escapeHtml3615(t.text)}</p><small>${Number(t.article_count)||0} article${Number(t.article_count)>1?'s':''}${t.coverage_complete===false?' · couverture partielle':''}</small></article>`).join('')}</div>
    </section>`;
  }
  function renderExpressArticles(articles,meta={}){
    const all=Array.isArray(articles)?articles:[],homeRows=all.slice(0,3),infoRows=all.slice(0,8),brief=meta.brief||null;
    const dt=meta.editionGeneratedAt||meta.generatedAt,d=dt?new Date(dt):null,stamp=d&&Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    const home=$('expressHeadlines');if(home){
      const briefHtml=expressBriefHtml(brief,{compact:true});
      const stories=homeRows.length?`<div class="express-after-brief"><div class="express-after-title">3 ARTICLES À LIRE</div>${expressRowsHtml(homeRows)}</div>`:'<div class="express-empty">Aucun titre disponible pour le moment.</div>';
      home.innerHTML=briefHtml?briefHtml+stories:stories;
    }
    const info=$('expressInfoHeadlines');if(info){
      const briefHtml=expressBriefHtml(brief);
      const stories=infoRows.length?`<div class="express-after-brief"><div class="express-after-title">ARTICLES DU JOUR</div>${expressRowsHtml(infoRows)}</div>`:'<div class="express-empty">Aucun titre disponible pour le moment.</div>';
      info.innerHTML=briefHtml?briefHtml+stories:stories;
    }
    const hasBrief=Boolean(brief&&Array.isArray(brief.themes)&&brief.themes.some(t=>t&&t.text));
    document.querySelector('.express-live-card')?.classList.toggle('ready',hasBrief||homeRows.length>0);
    setText('expressLiveState',hasBrief?'BRIEF DU JOUR':(homeRows.length?`${homeRows.length} TITRES`:'AUCUN TITRE'));
    setText('expressLiveFoot',hasBrief?`ÉDITION ${stamp} · BRIEF COMPLET + 3 ARTICLES`:(homeRows.length?`ÉDITION ${stamp} · APERÇU`:'OUVRE LÉNAÏC EXPRESS POUR ACTUALISER'));
    setText('expressInfoState',hasBrief?'BRIEF COMPLET':(infoRows.length?`${infoRows.length} TITRE${infoRows.length>1?'S':''}`:'AUCUN TITRE'));
    setText('expressInfoFoot',`ÉDITION ${stamp} · PERSONNALISÉE`);
    renderInfoBreakdown(all,meta);
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
      // On préfère l’édition publique de Lénaïc Express, mais on conserve le miroir
      // local de 3615 comme filet de sécurité. Surtout, si l’édition publique n’a
      // momentanément pas de brief, le dernier brief complet du miroir reste visible.
      let remote=null,mirror=null;
      try{remote=await fetchJsonWithTimeout('/lenaic-express/data/actualites.json?ts='+Date.now(),7000)}catch(e){}
      try{mirror=await fetchJsonWithTimeout('data/mirror/express-actualites.json?ts='+Date.now(),5000)}catch(e){}
      const data=remote||mirror;
      if(!data)throw new Error('Aucune édition disponible');
      const hasBrief=x=>Boolean(x&&x.brief&&Array.isArray(x.brief.themes)&&x.brief.themes.some(t=>t&&t.text));
      const brief=hasBrief(remote)?remote.brief:(hasBrief(mirror)?mirror.brief:null);
      const briefStatus=hasBrief(remote)?(remote.brief_status||''):(hasBrief(mirror)?'mirror_fallback':(data.brief_status||''));
      const {hidden,sources}=expressHiddenSets();
      const arr=(Array.isArray(data.articles)?data.articles:[])
        .filter(a=>!hidden.has(a.id)&&!sources.has(a.source))
        .sort((a,b)=>expressFallbackScore(b)-expressFallbackScore(a))
        .slice(0,8)
        .map(a=>({id:a.id,title:a.title,category:a.category,categoryLabel:expressCategoryLabel(a.category),source:a.source,url:a.url,publishedAt:a.published_at,score:expressFallbackScore(a)}));
      renderExpressArticles(arr,{editionGeneratedAt:data.generated_at,generatedAt:new Date().toISOString(),brief,briefStatus});
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
      // Le snapshot local donne un affichage immédiat ; le JSON public apporte le Brief du jour complet.
      loadExpressFallback();
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

  function fallbackScribeSnapshot(){
    const data=readJsonStorage(SCRIBE_DATA_KEY);if(!data||!Array.isArray(data.drafts))return null;
    const contacts=new Map((data.contacts||[]).map(c=>[c.id,c]));
    const counts={draft:0,sent:0,waiting:0,received:0,closed:0,awaiting:0};
    const ageDays=d=>{const t=new Date(d.sentAt||d.updatedAt||d.createdAt||0).getTime();return Number.isFinite(t)&&t>0?Math.max(0,Math.floor((Date.now()-t)/86400000)):0};
    const label=d=>contacts.get(d.contactId)?.name||'Service d’archives';
    for(const d of data.drafts){if(counts[d.status]!==undefined)counts[d.status]++;if(d.status==='sent'||d.status==='waiting')counts.awaiting++}
    const pending=data.drafts.filter(d=>d.status==='sent'||d.status==='waiting').sort((x,y)=>String(x.sentAt||x.updatedAt||'').localeCompare(String(y.sentAt||y.updatedAt||''))).map(d=>({id:d.id,title:d.title||'Demande aux archives',contact:label(d),status:d.status,sentAt:d.sentAt||null,updatedAt:d.updatedAt||null,ageDays:ageDays(d)}));
    const received=data.drafts.filter(d=>d.status==='received').sort((x,y)=>String(y.receivedAt||y.updatedAt||'').localeCompare(String(x.receivedAt||x.updatedAt||''))).map(d=>({id:d.id,title:d.title||'Réponse d’archives',contact:label(d),receivedAt:d.receivedAt||d.updatedAt||null}));
    return {version:1,source:'scribe',generatedAt:new Date().toISOString(),counts,pending,received};
  }
  function readScribeSnapshot(){return readJsonStorage(SCRIBE_SNAPSHOT_KEY)||fallbackScribeSnapshot()}
  function scribeReminderDays(){return Math.max(7,Number(nexusConfig?.automations?.scribeReminderDays)||30)}
  function scribeAgeLabel(days){const n=Math.max(0,Number(days)||0);return n===0?'AUJOURD’HUI':`${n} JOUR${n>1?'S':''}`}
  function renderScribeLive(){
    const snap=readScribeSnapshot(),home=$('homeBlock-scribe'),list=$('scribeAttentionList'),today=$('todayScribeAlert');
    const counts=snap?.counts||{draft:0,sent:0,waiting:0,received:0,closed:0,awaiting:0};
    const pending=Array.isArray(snap?.pending)?snap.pending:[],received=Array.isArray(snap?.received)?snap.received:[];
    const threshold=scribeReminderDays(),overdue=pending.filter(x=>Number(x.ageDays)>=threshold);
    const awaiting=Number(counts.awaiting)||pending.length,receivedCount=Number(counts.received)||received.length;
    setText('scribeCountDraft',String(Number(counts.draft)||0));setText('scribeCountAwaiting',String(awaiting));setText('scribeCountFollowup',String(Number(counts.waiting)||0));setText('scribeCountReceived',String(receivedCount));
    const meta=[];if(overdue.length)meta.push(`${overdue.length} relance${overdue.length>1?'s':''} à envisager`);if(awaiting)meta.push(`${awaiting} en attente`);if(receivedCount)meta.push(`${receivedCount} réponse${receivedCount>1?'s':''} reçue${receivedCount>1?'s':''}`);setText('genealogyTabScribeMeta',meta.join(' · ')||'Aucune requête suivie.');
    if(today){
      today.hidden=!received.length;
      if(received.length){const r=received[0];setText('todayScribeAlertText',`Réponse reçue : ${r.contact||r.title||'archives'} · ${r.title||'demande à traiter'}`)}
    }
    const attention=awaiting>0||received.length>0;
    if(home){
      const cmsHidden=home.dataset.cmsHidden==='1';home.hidden=!attention||cmsHidden;
      setText('scribeLiveState',received.length?`${received.length} RÉPONSE${received.length>1?'S':''}`:overdue.length?`${overdue.length} RELANCE${overdue.length>1?'S':''}`:`${awaiting} EN ATTENTE`);
      setText('scribeLiveFoot',overdue.length?`RELANCE APRÈS ${threshold} JOURS · ${overdue.length} À VOIR`:'REQUÊTES AUX ARCHIVES');
    }
    if(list){
      const rows=[];
      received.slice(0,2).forEach(r=>rows.push(`<div class="scribe-request-row received"><div><strong>${escapeHtml3615(r.title||'Réponse d’archives')}</strong><small>${escapeHtml3615(r.contact||'Service d’archives')}</small></div><b>RÉPONSE REÇUE</b></div>`));
      pending.slice(0,Math.max(0,3-rows.length)).forEach(p=>{const late=Number(p.ageDays)>=threshold;rows.push(`<div class="scribe-request-row${late?' overdue':''}"><div><strong>${escapeHtml3615(p.title||'Demande aux archives')}</strong><small>${escapeHtml3615(p.contact||'Service d’archives')}</small></div><b>${late?'RELANCE À ENVISAGER':scribeAgeLabel(p.ageDays)}</b></div>`)});
      list.innerHTML=rows.join('')||'<div class="express-empty">Aucune requête ne demande ton attention.</div>';
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

  // Défi des 52 semaines — lundi 14/09/2026 → semaine 52 à 52 €.
  const SAVINGS52_KEY='3615-savings52-v1';
  const SAVINGS52_START_UTC=Date.UTC(2026,8,14);
  const SAVINGS52_WEEKS=52;
  const SAVINGS52_TARGET=1378;
  function savings52Store(){
    const raw=readJsonStorage(SAVINGS52_KEY);
    return raw&&typeof raw==='object'?raw:{version:1,startDate:'2026-09-14',completed:{}};
  }
  function saveSavings52(state){
    state.version=1;state.startDate='2026-09-14';state.completed=state.completed&&typeof state.completed==='object'?state.completed:{};
    localStorage.setItem(SAVINGS52_KEY,JSON.stringify(state));
  }
  function savings52Info(date=new Date()){
    const todayUtc=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
    const diffDays=Math.floor((todayUtc-SAVINGS52_START_UTC)/86400000);
    const week=diffDays<0?0:Math.floor(diffDays/7)+1;
    const state=savings52Store(),completed=state.completed||{};
    let saved=0;for(let i=1;i<=SAVINGS52_WEEKS;i++)if(completed[String(i)])saved+=i;
    const active=week>=1&&week<=SAVINGS52_WEEKS;
    const done=active&&Boolean(completed[String(week)]);
    const missed=[];if(active)for(let i=1;i<week;i++)if(!completed[String(i)])missed.push(i);
    const missedAmount=missed.reduce((a,b)=>a+b,0);
    const snoozeUntil=Number(state.snoozeUntil||0),isSnoozed=!done&&snoozeUntil>Date.now();
    const doneAt=done?new Date(completed[String(week)]):null,doneToday=Boolean(doneAt&&Number.isFinite(doneAt.getTime())&&localDateKey(doneAt)===localDateKey(date));
    return {state,active,week,amount:active?week:0,done,doneToday,saved,percent:SAVINGS52_TARGET?saved/SAVINGS52_TARGET*100:0,isMonday:date.getDay()===1,missed,missedAmount,snoozeUntil,isSnoozed};
  }
  function renderSavings52(){
    const card=$('savings52Card');if(!card)return;
    const info=savings52Info(),cmsHidden=card.dataset.cmsHidden==='1';
    // Le lundi, le module reste visible même une fois coché. Sinon il reste affiché tant que la semaine n'est pas validée.
    const shouldShow=info.active&&(info.isMonday||!info.done||info.doneToday)&&!info.isSnoozed;
    card.hidden=cmsHidden||!shouldShow;
    if(!info.active)return;
    card.classList.toggle('is-done',info.done);
    setText('savings52State',`SEMAINE ${String(info.week).padStart(2,'0')} · ${info.done?'VALIDÉE':'À FAIRE'}`);
    setText('savings52Amount',`${info.amount} €`);
    setText('savings52Week',`SEMAINE ${String(info.week).padStart(2,'0')} / 52`);
    setText('savings52Saved',`${info.saved.toLocaleString('fr-FR')} € / ${SAVINGS52_TARGET.toLocaleString('fr-FR')} €`);
    setText('savings52After',info.done?`Objectif final · ${SAVINGS52_TARGET.toLocaleString('fr-FR')} €`:`Après validation · ${(info.saved+info.amount).toLocaleString('fr-FR')} €`);
    if($('savings52Bar'))$('savings52Bar').style.width=`${Math.max(0,Math.min(100,info.percent))}%`;
    setText('savings52ProgressText',`${info.saved.toLocaleString('fr-FR')} € réellement validés`);
    setText('savings52Percent',`${info.percent.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})} %`);
    const cb=$('savings52Done');if(cb)cb.checked=info.done;
    if(info.done){
      const at=info.state.completed?.[String(info.week)],d=at?new Date(at):null,label=d&&Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'aujourd’hui';
      setText('savings52Hint',`Épargne de ${info.amount} € validée le ${label}. ${SAVINGS52_WEEKS-info.week} semaine${SAVINGS52_WEEKS-info.week>1?'s':''} restante${SAVINGS52_WEEKS-info.week>1?'s':''}.`);
    }else if(info.missed.length){
      setText('savings52Hint',`À faire cette semaine. ${info.missed.length} semaine${info.missed.length>1?'s':''} précédente${info.missed.length>1?'s':''} non cochée${info.missed.length>1?'s':''} · ${info.missedAmount} € non comptabilisés.`);
    }else{
      setText('savings52Hint',`Coche « ÉPARGNÉ » une fois les ${info.amount} € mis de côté.`);
    }
  }
  $('savings52Done')?.addEventListener('change',e=>{
    const info=savings52Info();if(!info.active)return;
    const state=info.state;state.completed=state.completed||{};
    if(e.target.checked){state.completed[String(info.week)]=new Date().toISOString();delete state.snoozeUntil}else delete state.completed[String(info.week)];
    saveSavings52(state);renderSavings52();renderV9Today();renderV9System();
  });
  $('savings52Later')?.addEventListener('click',()=>{
    const info=savings52Info();if(!info.active||info.done)return;
    const state=info.state,tomorrow=new Date();tomorrow.setHours(0,0,0,0);tomorrow.setDate(tomorrow.getDate()+1);
    state.snoozeUntil=tomorrow.getTime();saveSavings52(state);logProcrastination('savings','Épargne',localDateKey(),localDateKey(tomorrow));renderSavings52();renderContextualReminders();renderV9Today();renderV9System();
  });

  // Rappels contextuels : rappels locaux, tâches épinglées et intégration Culina.
  const CONTEXT_REMINDERS_KEY='3615-context-reminders-v1';
  const PINNED_REMINDERS_KEY='3615-pinned-reminders-v1';
  const REMINDER_HISTORY_KEY='3615-reminder-history-v1';
  const PINNED_TEMPLATES={
    trash:{icon:'🗑️',title:'Poubelles / tri'},
    laundry:{icon:'🧺',title:'Lessive'},
    admin:{icon:'📄',title:'Administratif'},
    compost:{icon:'🪱',title:'Vider le compost'}
  };
  function contextReminderStore(){const raw=readJsonStorage(CONTEXT_REMINDERS_KEY);return raw&&typeof raw==='object'?raw:{fruit:{},cleaning:{},cleaningSnooze:{},compost:{},compostSnooze:{},shopping:{},shoppingSnooze:{}}}
  function saveContextReminderStore(s){localStorage.setItem(CONTEXT_REMINDERS_KEY,JSON.stringify(s))}
  function pinnedReminderStore(){const raw=readJsonStorage(PINNED_REMINDERS_KEY);return Array.isArray(raw)?raw:[]}
  function savePinnedReminderStore(rows){localStorage.setItem(PINNED_REMINDERS_KEY,JSON.stringify(rows));renderContextualReminders();renderHomeTomorrowReminders();renderPinnedReminderSystem();renderV9Today()}
  function reminderHistoryStore(){const raw=readJsonStorage(REMINDER_HISTORY_KEY);return Array.isArray(raw)?raw:[]}
  function logProcrastination(type,label,fromDate,toDate){const rows=reminderHistoryStore();rows.push({id:`hist-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type,label,fromDate,toDate,at:new Date().toISOString()});localStorage.setItem(REMINDER_HISTORY_KEY,JSON.stringify(rows.slice(-200)));renderProcrastinationHistory()}
  function plusDaysKey(baseKey,days=1){const d=new Date(`${baseKey}T12:00:00`);d.setDate(d.getDate()+days);return localDateKey(d)}
  function dateLabelLong(key){const d=new Date(`${key}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}):key}
  function fruitReminderSlot(date=new Date()){
    const h=date.getHours();
    if(h>=11&&h<14)return 'lunch';
    if(h>=19&&h<22)return 'dinner';
    return null;
  }
  function openCulinaShopping(){const raw=readJsonStorage('culina-shopping-v1');return Array.isArray(raw)?raw.filter(x=>x&&!x.checked&&String(x.name||'').trim()):[]}
  function reminderDoneMarkup(done){return done?'<span class="context-reminder-status">✓ TERMINÉ · RESTE AFFICHÉ JUSQU’À MINUIT</span>':''}
  function renderPinnedReminderCards(key){
    const rows=pinnedReminderStore().filter(r=>r&&r.date===key);
    return rows.map(r=>{const done=Boolean(r.doneAt),icon=r.icon||'📌';return `<article class="context-reminder local-pinned-reminder${done?' is-done':''}" data-pinned-id="${escapeAttr3615(r.id)}"><div class="context-reminder-icon">${escapeHtml3615(icon)}</div><div class="context-reminder-copy"><strong>${escapeHtml3615(r.title||'Rappel')}</strong><small>Rappel ponctuel · ${escapeHtml3615(dateLabelLong(r.date))}</small>${reminderDoneMarkup(done)}</div><div class="context-reminder-actions"><label class="context-reminder-check"><input data-pinned-done type="checkbox" ${done?'checked':''}/><span>${done?'FAIT ✓':'C’EST FAIT'}</span></label><button class="text-key procrastinate-btn" data-pinned-later type="button" ${done?'disabled':''}>LE PROCRASTINER →</button></div></article>`}).join('');
  }
  function renderShoppingReminder(key,store){
    store.shopping=store.shopping&&typeof store.shopping==='object'?store.shopping:{};store.shoppingSnooze=store.shoppingSnooze&&typeof store.shoppingSnooze==='object'?store.shoppingSnooze:{};
    let origin='';
    const now=new Date(`${key}T12:00:00`);
    const monday=now.getDay()===1;
    if(monday&&!(store.shoppingSnooze[key]&&store.shoppingSnooze[key]!==key))origin=key;
    if(!origin){for(const [o,due] of Object.entries(store.shoppingSnooze)){if(due===key){origin=o;break}}}
    const items=openCulinaShopping(),done=Boolean(origin&&store.shopping[origin]);
    if(!origin||(!items.length&&!done))return '';
    const deferred=origin!==key,list=items.map(x=>`<span>${escapeHtml3615(x.name)}</span>`).join('');
    return `<article class="context-reminder shopping-reminder${done?' is-done':''}" data-shopping-origin="${escapeAttr3615(origin)}"><div class="context-reminder-icon">🛒</div><div class="context-reminder-copy"><strong>COURSES</strong><small>${deferred?`Prévues le ${escapeHtml3615(dateLabelLong(origin))} · reportées à aujourd’hui.`:`${items.length} article${items.length>1?'s':''} à acheter depuis Culina.`}</small>${items.length?`<div class="shopping-reminder-list">${list}</div>`:''}${reminderDoneMarkup(done)}</div><div class="context-reminder-actions"><label class="context-reminder-check"><input data-shopping-done type="checkbox" ${done?'checked':''}/><span>${done?'FAIT ✓':'C’EST FAIT'}</span></label><button class="text-key procrastinate-btn" data-shopping-later type="button" ${done?'disabled':''}>LE PROCRASTINER →</button><a class="text-key" href="../culina/">CULINA →</a></div></article>`;
  }
  function renderCompostReminder(key,store){
    store.compost=store.compost&&typeof store.compost==='object'?store.compost:{};
    store.compostSnooze=store.compostSnooze&&typeof store.compostSnooze==='object'?store.compostSnooze:{};
    let origin='';
    const now=new Date(`${key}T12:00:00`),friday=now.getDay()===5;
    if(friday&&!(store.compostSnooze[key]&&store.compostSnooze[key]!==key))origin=key;
    if(!origin){for(const [o,due] of Object.entries(store.compostSnooze)){if(due===key){origin=o;break}}}
    if(!origin)return '';
    const done=Boolean(store.compost[origin]),deferred=origin!==key;
    return `<article class="context-reminder compost-reminder${done?' is-done':''}" data-compost-origin="${escapeAttr3615(origin)}"><div class="context-reminder-icon">🪱</div><div class="context-reminder-copy"><strong>VIDER LE COMPOST</strong><small>${done?'Fait aujourd’hui.':deferred?`Prévu le ${escapeHtml3615(dateLabelLong(origin))} · reporté à aujourd’hui.`:'Rappel hebdomadaire · chaque vendredi.'}</small>${reminderDoneMarkup(done)}</div><div class="context-reminder-actions"><label class="context-reminder-check"><input data-compost-done type="checkbox" ${done?'checked':''}/><span>${done?'FAIT ✓':'C’EST FAIT'}</span></label><button class="text-key procrastinate-btn" data-compost-later type="button" ${done?'disabled':''}>LE PROCRASTINER →</button></div></article>`;
  }
  function renderContextualReminders(){
    const now=new Date(),key=localDateKey(now),store=contextReminderStore(),slot=fruitReminderSlot(now);
    store.fruit=store.fruit&&typeof store.fruit==='object'?store.fruit:{};store.cleaning=store.cleaning&&typeof store.cleaning==='object'?store.cleaning:{};store.cleaningSnooze=store.cleaningSnooze&&typeof store.cleaningSnooze==='object'?store.cleaningSnooze:{};
    const fruit=$('fruitReminder3615'),clean=$('cleaningReminder3615'),zone=$('contextRemindersZone'),rdvBox=$('todayRdvReminders'),localBox=$('localReminderRows');
    const todayRdv=rdvEventsForDate(key);
    if(rdvBox){
      rdvBox.hidden=!todayRdv.length;
      rdvBox.innerHTML=todayRdv.map(ev=>{const icon=ev.type==='alerte'?'🚨':ev.type==='rappel'?'🔔':'📅',note=ev.note?` · ${escapeHtml3615(ev.note)}`:'',done=Boolean(ev.done);return `<article class="context-reminder today-rdv-reminder${done?' is-done':''}"><div class="context-reminder-icon">${icon}</div><div class="context-reminder-copy"><strong>${escapeHtml3615(ev.time||'—')} · ${escapeHtml3615(ev.title||'Rendez-vous')}</strong><small>${rdvTypeLabel(ev.type)}${note}</small>${reminderDoneMarkup(done)}</div><div class="context-reminder-actions"><button class="text-key" data-rdv-open type="button">VOIR RDV →</button></div></article>`}).join('');
    }
    let fruitDisplayKey=slot?`${key}:${slot}`:'',fruitEntry=fruitDisplayKey?store.fruit[fruitDisplayKey]:null;
    if(!fruitDisplayKey){const completed=Object.entries(store.fruit).filter(([k,v])=>k.startsWith(`${key}:`)&&(typeof v==='string'||v?.done));if(completed.length){[fruitDisplayKey,fruitEntry]=completed[completed.length-1]}}
    const fruitDone=Boolean(fruitEntry&&(typeof fruitEntry==='string'||fruitEntry?.done)),fruitSnoozed=Number(fruitEntry?.snoozeUntil||0)>Date.now();
    const fruitVisible=Boolean((slot&&!fruitSnoozed)||fruitDone);
    if(fruit){fruit.hidden=!fruitVisible;fruit.classList.toggle('is-done',fruitDone);const doneBtn=$('fruitReminder3615Done'),laterBtn=$('fruitReminder3615Later');if(doneBtn){doneBtn.disabled=fruitDone;doneBtn.textContent=fruitDone?'FAIT ✓':'J’Y PENSE ✓'}if(laterBtn)laterBtn.disabled=fruitDone;if(fruitVisible)setText('fruitReminder3615Text',fruitDone?'Rappel terminé · conservé jusqu’à la fin de la journée.':slot==='lunch'?'Déjeuner : pense à ajouter un fruit si tu n’en as pas encore pris.':'Dîner : un fruit pour terminer le repas ?')}
    let cleaningOrigin='';
    const tuesday=now.getDay()===2;
    if(tuesday&&!(store.cleaningSnooze[key]&&store.cleaningSnooze[key]!==key))cleaningOrigin=key;
    if(!cleaningOrigin){for(const [origin,due] of Object.entries(store.cleaningSnooze)){if(due===key){cleaningOrigin=origin;break}}}
    const cleaningDone=Boolean(cleaningOrigin&&store.cleaning[cleaningOrigin]),cleaningVisible=Boolean(cleaningOrigin);
    if(clean){clean.hidden=!cleaningVisible;clean.dataset.originKey=cleaningOrigin||'';clean.classList.toggle('is-done',cleaningDone);const cb=$('cleaningReminder3615Done'),later=$('cleaningReminder3615Later');if(cb)cb.checked=cleaningDone;if(later)later.disabled=cleaningDone;if(cleaningVisible){const deferred=cleaningOrigin!==key;setText('cleaningReminder3615Title',cleaningDone?'MÉNAGE TERMINÉ':deferred?'MÉNAGE PROCRASTINÉ':'MÉNAGE AUJOURD’HUI');setText('cleaningReminder3615Text',cleaningDone?'✓ Fait aujourd’hui · ce rappel restera visible jusqu’à minuit.':deferred?`Prévu le ${dateLabelLong(cleaningOrigin)} · reporté à aujourd’hui.`:'Mardi · créneau conseillé : 13 h–18 h.')}}
    const pinnedHtml=renderPinnedReminderCards(key),compostHtml=renderCompostReminder(key,store),shoppingHtml=renderShoppingReminder(key,store);
    if(localBox){localBox.innerHTML=pinnedHtml+compostHtml+shoppingHtml;localBox.hidden=!(pinnedHtml||compostHtml||shoppingHtml)}
    if(zone)zone.hidden=!(todayRdv.length||fruitVisible||cleaningVisible||pinnedHtml||compostHtml||shoppingHtml);
    renderHomeTomorrowReminders();
  }
  $('fruitReminder3615Done')?.addEventListener('click',()=>{const slot=fruitReminderSlot();if(!slot)return;const s=contextReminderStore();s.fruit=s.fruit||{};s.fruit[`${localDateKey()}:${slot}`]={done:new Date().toISOString()};saveContextReminderStore(s);renderContextualReminders()});
  $('fruitReminder3615Later')?.addEventListener('click',()=>{const slot=fruitReminderSlot();if(!slot)return;const s=contextReminderStore();s.fruit=s.fruit||{};s.fruit[`${localDateKey()}:${slot}`]={snoozeUntil:Date.now()+30*60*1000};saveContextReminderStore(s);logProcrastination('fruit','Fruit',localDateKey(),localDateKey());renderContextualReminders()});
  $('cleaningReminder3615Done')?.addEventListener('change',e=>{const s=contextReminderStore(),origin=$('cleaningReminder3615')?.dataset.originKey||localDateKey();s.cleaning=s.cleaning||{};if(e.target.checked)s.cleaning[origin]=new Date().toISOString();else delete s.cleaning[origin];saveContextReminderStore(s);renderContextualReminders()});
  $('cleaningReminder3615Later')?.addEventListener('click',()=>{const s=contextReminderStore(),origin=$('cleaningReminder3615')?.dataset.originKey||localDateKey(),tomorrowKey=plusDaysKey(localDateKey(),1);s.cleaningSnooze=s.cleaningSnooze||{};s.cleaningSnooze[origin]=tomorrowKey;saveContextReminderStore(s);logProcrastination('cleaning','Ménage',localDateKey(),tomorrowKey);renderContextualReminders()});
  $('todayRdvReminders')?.addEventListener('click',e=>{if(e.target.closest('[data-rdv-open]'))showSection('rdv')});
  $('localReminderRows')?.addEventListener('change',e=>{
    const pin=e.target.closest('[data-pinned-done]');if(pin){const row=e.target.closest('[data-pinned-id]'),rows=pinnedReminderStore(),i=rows.findIndex(x=>x.id===row?.dataset.pinnedId);if(i>=0){rows[i].doneAt=e.target.checked?new Date().toISOString():null;savePinnedReminderStore(rows)}return}
    const compost=e.target.closest('[data-compost-done]');if(compost){
      const card=e.target.closest('[data-compost-origin]'),origin=card?.dataset.compostOrigin||localDateKey(),s=contextReminderStore();s.compost=s.compost||{};
      if(e.target.checked)s.compost[origin]=new Date().toISOString();else delete s.compost[origin];
      saveContextReminderStore(s);renderContextualReminders();renderV9Today();return
    }
    const shop=e.target.closest('[data-shopping-done]');if(shop){
      const card=e.target.closest('[data-shopping-origin]'),origin=card?.dataset.shoppingOrigin||localDateKey(),s=contextReminderStore();
      s.shopping=s.shopping||{};s.shoppingArchive=s.shoppingArchive&&typeof s.shoppingArchive==='object'?s.shoppingArchive:{};
      if(e.target.checked){
        const current=readJsonStorage('culina-shopping-v1');
        s.shoppingArchive[origin]=Array.isArray(current)?current:[];
        localStorage.setItem('culina-shopping-v1','[]');
        s.shopping[origin]=new Date().toISOString();
        try{window.LenaicBus?.publish('culina.shopping.cleared',{origin,count:s.shoppingArchive[origin].length},{source:'3615',target:'culina',status:'done',notification:false})}catch(_e){}
      }else{
        delete s.shopping[origin];
        const archived=Array.isArray(s.shoppingArchive[origin])?s.shoppingArchive[origin]:[],current=readJsonStorage('culina-shopping-v1'),live=Array.isArray(current)?current:[];
        if(archived.length){
          const seen=new Set(live.map(x=>String(x?.id||'')+'|'+String(x?.name||'').toLowerCase()));
          const restored=[...live,...archived.filter(x=>{const k=String(x?.id||'')+'|'+String(x?.name||'').toLowerCase();if(seen.has(k))return false;seen.add(k);return true})];
          localStorage.setItem('culina-shopping-v1',JSON.stringify(restored));
        }
        delete s.shoppingArchive[origin];
      }
      saveContextReminderStore(s);renderContextualReminders();renderHomeTomorrowReminders();renderCulinaLive();renderV9Daily();renderV9Today();
    }
  });
  $('localReminderRows')?.addEventListener('click',e=>{
    const later=e.target.closest('[data-pinned-later]');if(later){const card=e.target.closest('[data-pinned-id]'),rows=pinnedReminderStore(),i=rows.findIndex(x=>x.id===card?.dataset.pinnedId);if(i>=0&&!rows[i].doneAt){const from=rows[i].date,to=plusDaysKey(localDateKey(),1);rows[i].date=to;rows[i].snoozeCount=(Number(rows[i].snoozeCount)||0)+1;rows[i].lastSnoozedAt=new Date().toISOString();logProcrastination('pinned',rows[i].title,from,to);savePinnedReminderStore(rows)}return}
    const compostLater=e.target.closest('[data-compost-later]');if(compostLater){const card=e.target.closest('[data-compost-origin]'),origin=card?.dataset.compostOrigin||localDateKey(),s=contextReminderStore(),to=plusDaysKey(localDateKey(),1);s.compostSnooze=s.compostSnooze||{};s.compostSnooze[origin]=to;saveContextReminderStore(s);logProcrastination('compost','Vider le compost',localDateKey(),to);renderContextualReminders();return}
    const shoppingLater=e.target.closest('[data-shopping-later]');if(shoppingLater){const card=e.target.closest('[data-shopping-origin]'),origin=card?.dataset.shoppingOrigin||localDateKey(),s=contextReminderStore(),to=plusDaysKey(localDateKey(),1);s.shoppingSnooze=s.shoppingSnooze||{};s.shoppingSnooze[origin]=to;saveContextReminderStore(s);logProcrastination('shopping','Courses',localDateKey(),to);renderContextualReminders()}
  });
  function addPinnedReminder(template,title=''){
    const date=$('pinnedReminderDate')?.value||localDateKey(),t=PINNED_TEMPLATES[template]||{icon:'📌',title:title||'Rappel'};const finalTitle=String(title||t.title||'Rappel').trim();if(!finalTitle)return;
    const rows=pinnedReminderStore();rows.push({id:`pin-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type:template||'custom',title:finalTitle,icon:t.icon||'📌',date,createdAt:new Date().toISOString(),doneAt:null,snoozeCount:0});savePinnedReminderStore(rows);showRdvToast(`Rappel « ${finalTitle} » épinglé au ${new Date(date+'T12:00:00').toLocaleDateString('fr-FR')}.`)
  }
  $('reminderManagerCard')?.addEventListener('click',e=>{const b=e.target.closest('[data-pinned-template]');if(b)addPinnedReminder(b.dataset.pinnedTemplate);const del=e.target.closest('[data-delete-pinned]');if(del){const rows=pinnedReminderStore().filter(x=>x.id!==del.dataset.deletePinned);savePinnedReminderStore(rows)}});
  $('pinnedReminderCustomAdd')?.addEventListener('click',()=>{const input=$('pinnedReminderCustom'),v=input?.value.trim();if(v){addPinnedReminder('custom',v);input.value=''}});
  function renderPinnedReminderSystem(){
    const date=$('pinnedReminderDate');if(date){date.min=localDateKey();if(!date.value)date.value=localDateKey()}
    const rows=pinnedReminderStore().filter(r=>r&&r.date>=localDateKey()).sort((a,b)=>a.date.localeCompare(b.date)||String(a.title).localeCompare(String(b.title),'fr')).slice(0,12),box=$('pinnedUpcoming');
    setText('pinnedReminderState',rows.length?`${rows.length} PROGRAMMÉ${rows.length>1?'S':''}`:'ÉPINGLER UN JOUR');
    if(box)box.innerHTML=rows.length?rows.map(r=>`<div class="pinned-upcoming-row"><div><strong>${escapeHtml3615(r.icon||'📌')} ${escapeHtml3615(r.title)}</strong><small>${escapeHtml3615(dateLabelLong(r.date))}${r.snoozeCount?` · reporté ${r.snoozeCount}×`:''}</small></div><button data-delete-pinned="${escapeAttr3615(r.id)}" type="button">SUPPR.</button></div>`).join(''):'<div class="express-empty">Aucun rappel local programmé.</div>';
  }
  function renderProcrastinationHistory(){
    const rows=reminderHistoryStore().slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))),box=$('procrastinationHistory');setText('procrastinationState',rows.length?`${rows.length} REPORT${rows.length>1?'S':''}`:'AUCUN REPORT');
    if(box)box.innerHTML=rows.length?rows.slice(0,10).map(r=>`<div class="procrastination-row"><div><strong>${escapeHtml3615(r.label||'Rappel')}</strong><small>${escapeHtml3615(r.fromDate||'')} → ${escapeHtml3615(r.toDate||'')} · ${new Date(r.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</small></div><b>+1 REPORT</b></div>`).join(''):'<div class="express-empty">Aucun report enregistré.</div>';
  }
  function tomorrowReminderRows(){
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const key=localDateKey(tomorrow),rows=[];
    rdvEventsForDate(key).filter(x=>!x.done).forEach(ev=>rows.push({k:rdvTypeLabel(ev.type),t:ev.title||'Rendez-vous',s:ev.time||'—',b:'RDV'}));
    pinnedReminderStore().filter(r=>r.date===key&&!r.doneAt).forEach(r=>rows.push({k:'RAPPEL',t:`${r.icon||'📌'} ${r.title}`,s:'Rappel ponctuel épinglé',b:'DEMAIN'}));
    const s=contextReminderStore();s.cleaningSnooze=s.cleaningSnooze||{};s.compostSnooze=s.compostSnooze||{};s.shoppingSnooze=s.shoppingSnooze||{};
    const cleaningDue=Object.entries(s.cleaningSnooze).some(([o,due])=>due===key&&!s.cleaning?.[o]);if(tomorrow.getDay()===2||cleaningDue)rows.push({k:'MÉNAGE',t:'Ménage',s:'Créneau conseillé : 13 h–18 h',b:'DEMAIN'});
    const compostDue=Object.entries(s.compostSnooze).some(([o,due])=>due===key&&!s.compost?.[o]);if(tomorrow.getDay()===5||compostDue)rows.push({k:'COMPOST',t:'🪱 Vider le compost',s:'Rappel hebdomadaire du vendredi',b:'DEMAIN'});
    const shoppingDue=Object.entries(s.shoppingSnooze).some(([o,due])=>due===key&&!s.shopping?.[o]);if((tomorrow.getDay()===1||shoppingDue)&&openCulinaShopping().length)rows.push({k:'COURSES',t:`${openCulinaShopping().length} article${openCulinaShopping().length>1?'s':''} dans Culina`,s:'Liste de courses synchronisée',b:'DEMAIN'});
    const saving=savings52Info();if(!saving.done&&saving.snoozeUntil){const d=new Date(saving.snoozeUntil);if(localDateKey(d)===key)rows.push({k:'ÉPARGNE',t:`${saving.amount} € à mettre de côté`,s:'Rappel reporté',b:'DEMAIN'})}
    return rows;
  }
  function renderHomeTomorrowReminders(){const rows=tomorrowReminderRows(),card=$('homeTomorrowReminders'),box=$('homeTomorrowRows');if(!card||!box)return;card.hidden=!rows.length;setText('homeTomorrowState',rows.length?`${rows.length} À PRÉVOIR`:'RIEN DE PRÉVU');box.innerHTML=rows.map(r=>`<div class="home-tomorrow-row"><div><span>${escapeHtml3615(r.k)}</span><strong>${escapeHtml3615(r.t)}</strong><small>${escapeHtml3615(r.s||'')}</small></div><b>${escapeHtml3615(r.b||'')}</b></div>`).join('')}
  function migrateV918RecurringCompost(){
    const flag='3615-migrate-v918-recurring-compost';if(localStorage.getItem(flag))return;
    const rows=pinnedReminderStore().filter(r=>r?.id!=='pin-compost-20260925');
    localStorage.setItem(PINNED_REMINDERS_KEY,JSON.stringify(rows));
    localStorage.removeItem('3615-seed-v917-compost-2026-09-25');
    localStorage.setItem(flag,'1');
  }

  // Compteur transport — journal local + récap de fin de mois.
  const TRANSPORT_LEDGER_KEY='3615-transport-ledger-v1';
  const TRANSPORT_SAVED_AMOUNT=1.60,TRANSPORT_FINE_AMOUNT=-65;
  function transportLedger(){const raw=readJsonStorage(TRANSPORT_LEDGER_KEY);return Array.isArray(raw)?raw.filter(x=>x&&Number.isFinite(Number(x.amount))&&x.at):[]}
  function saveTransportLedger(rows){localStorage.setItem(TRANSPORT_LEDGER_KEY,JSON.stringify(rows));renderTransportCounter();renderTransportMonthRecap()}
  function transportMoney(value){return `${Number(value||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €`}
  function transportStatsFor(year,month=null){
    const rows=transportLedger().filter(x=>{const d=new Date(x.at);return Number.isFinite(d.getTime())&&d.getFullYear()===year&&(month===null||d.getMonth()===month)});
    return {rows,total:rows.reduce((n,x)=>n+Number(x.amount||0),0),saved:rows.filter(x=>Number(x.amount)>0).length,fines:rows.filter(x=>Number(x.amount)<0).length};
  }
  function renderTransportCounter(){
    const now=new Date(),month=transportStatsFor(now.getFullYear(),now.getMonth()),year=transportStatsFor(now.getFullYear());
    setText('transportCounterState',now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase());
    setText('transportMonthBalance',transportMoney(month.total));
    setText('transportCounterMeta',`${month.saved} trajet${month.saved>1?'s':''} enregistré${month.saved>1?'s':''} · ${month.fines} amende${month.fines>1?'s':''}`);
    setText('transportYearBalance',`Depuis janvier : ${transportMoney(year.total)}`);
    const all=transportLedger(),last=all[all.length-1];
    setText('transportLastAction',last?`${Number(last.amount)>0?'Trajet +1,60 €':'Amende −65 €'} · ${new Date(last.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:'Aucune opération enregistrée.');
    const undo=$('transportUndoBtn');if(undo)undo.disabled=!all.length;
  }
  function transportRecapTarget(now=new Date()){
    const d=now.getDate();if(d>=28)return {year:now.getFullYear(),month:now.getMonth()};if(d<=2){const p=new Date(now.getFullYear(),now.getMonth()-1,1,12);return {year:p.getFullYear(),month:p.getMonth()}}return null;
  }
  function renderTransportMonthRecap(){
    const target=transportRecapTarget(),boxes=[$('transportMonthRecapHome'),$('transportMonthRecapToday')].filter(Boolean);
    if(!target){boxes.forEach(b=>b.hidden=true);return}
    const month=transportStatsFor(target.year,target.month),yearRows=transportLedger().filter(x=>{const d=new Date(x.at);return Number.isFinite(d.getTime())&&d.getFullYear()===target.year&&(d.getMonth()<target.month||d.getMonth()===target.month)}),yearTotal=yearRows.reduce((n,x)=>n+Number(x.amount||0),0),label=new Date(target.year,target.month,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const headline=month.total>=0?`Bravo, tu as économisé ${transportMoney(month.total)} ce mois-ci !`:`Ce mois-ci, le bilan transport est de ${transportMoney(month.total)}.`;
    const html=`<div class="retro-head"><span>BILAN.TRAM</span><strong>${escapeHtml3615(label.toUpperCase())}</strong></div><div class="transport-recap-copy"><span>🚋</span><div><strong>${escapeHtml3615(headline)}</strong><p>Et <b>${escapeHtml3615(transportMoney(yearTotal))}</b> depuis le début de l’année.</p><small>${month.saved} trajet${month.saved>1?'s':''} comptabilisé${month.saved>1?'s':''} · ${month.fines} amende${month.fines>1?'s':''}</small></div></div>`;
    boxes.forEach(b=>{b.innerHTML=html;b.hidden=false});
  }
  $('transportSaveBtn')?.addEventListener('click',()=>{const rows=transportLedger();rows.push({type:'unpaid',amount:TRANSPORT_SAVED_AMOUNT,at:new Date().toISOString()});saveTransportLedger(rows)});
  $('transportFineBtn')?.addEventListener('click',()=>{const rows=transportLedger();rows.push({type:'fine',amount:TRANSPORT_FINE_AMOUNT,at:new Date().toISOString()});saveTransportLedger(rows)});
  $('transportUndoBtn')?.addEventListener('click',()=>{const rows=transportLedger();if(!rows.length)return;rows.pop();saveTransportLedger(rows)});

  // RDV — agenda local + notifications système + export calendrier téléphone.
  const RDV_KEY='3615-rdv-v1';
  let rdvSwRegistrationPromise=null;
  function rdvStore(){const raw=readJsonStorage(RDV_KEY);return Array.isArray(raw)?raw:[]}
  function saveRdvStore(rows){localStorage.setItem(RDV_KEY,JSON.stringify(rows));renderRdv();renderContextualReminders();renderV9Today();checkRdvNotifications()}
  function rdvDateTime(ev){const d=new Date(`${ev.date||''}T${ev.time||'00:00'}:00`);return Number.isFinite(d.getTime())?d:null}
  function rdvTypeLabel(type){return type==='alerte'?'ALERTE':type==='rappel'?'RAPPEL':'RENDEZ-VOUS'}
  function rdvNotifyLabel(mins){const n=Number(mins)||0;if(n===0)return 'À L’HEURE H';if(n===1440)return '1 JOUR AVANT';if(n===60)return '1 H AVANT';return `${n} MIN AVANT`}
  function rdvEventsForDate(key){const isToday=key===localDateKey();return rdvStore().filter(ev=>ev.date===key&&(!ev.done||isToday)).sort((a,b)=>(a.time||'').localeCompare(b.time||''))}
  function rdvNextEvent(){const now=Date.now();return rdvStore().filter(ev=>!ev.done&&rdvDateTime(ev)?.getTime()>=now).sort((a,b)=>rdvDateTime(a)-rdvDateTime(b))[0]||null}
  function showRdvToast(message){document.querySelector('.rdv-toast')?.remove();const n=document.createElement('div');n.className='rdv-toast';n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),4200)}
  function rdvDefaultForm(){
    const now=new Date(),next=new Date(now.getTime()+30*60000);next.setMinutes(Math.ceil(next.getMinutes()/30)*30,0,0);
    if($('rdvDate')&&!$('rdvDate').value)$('rdvDate').value=localDateKey(next);
    if($('rdvTime')&&!$('rdvTime').value)$('rdvTime').value=`${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`;
  }
  function resetRdvForm(){if(!$('rdvForm'))return;$('rdvForm').reset();$('rdvEditId').value='';$('rdvNotify').value='0';$('rdvType').value='rdv';$('rdvCancelEdit').hidden=true;setText('rdvFormState','NOUVEAU RENDEZ-VOUS');setText('rdvSaveBtn','AJOUTER AU RDV');rdvDefaultForm()}
  function editRdv(id){const ev=rdvStore().find(x=>x.id===id);if(!ev)return;$('rdvEditId').value=ev.id;$('rdvTitle').value=ev.title||'';$('rdvDate').value=ev.date||'';$('rdvTime').value=ev.time||'';$('rdvType').value=ev.type||'rdv';$('rdvNotify').value=String(Number(ev.notifyMinutes)||0);$('rdvNote').value=ev.note||'';$('rdvCancelEdit').hidden=false;setText('rdvFormState','MODIFICATION');setText('rdvSaveBtn','ENREGISTRER');$('rdvTitle').focus();$('rdvEditorCard')?.scrollIntoView?.({behavior:'smooth',block:'start'})}
  function ensureRdvServiceWorker(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return Promise.resolve(null);
    if(!rdvSwRegistrationPromise)rdvSwRegistrationPromise=navigator.serviceWorker.register('./service-worker.js').catch(()=>null);
    return rdvSwRegistrationPromise;
  }
  function renderRdvNotificationState(){
    const btn=$('rdvEnableNotifications');if(!btn)return;
    if(!('Notification' in window)||!('serviceWorker' in navigator)||!window.isSecureContext){setText('rdvNotificationState','NON DISPONIBLE');setText('rdvNotificationMeta','Ce navigateur ne permet pas les notifications système de 3615. Utilise 📅 Téléphone pour les alarmes fiables.');btn.disabled=true;btn.textContent='INDISPONIBLE';return}
    const p=Notification.permission;
    setText('rdvNotificationState',p==='granted'?'AUTORISÉES':p==='denied'?'BLOQUÉES':'À ACTIVER');
    setText('rdvNotificationMeta',p==='granted'?'3615 peut afficher une notification système tant que le navigateur maintient le site actif.':p==='denied'?'Notifications bloquées dans les réglages du navigateur. Le calendrier téléphone reste disponible.':'Autorise une fois les notifications système pour les rappels RDV.');
    btn.disabled=p==='denied';btn.textContent=p==='granted'?'ACTIVÉ ✓':p==='denied'?'BLOQUÉ':'ACTIVER';
  }
  async function requestRdvNotifications(){
    if(!('Notification' in window))return;
    await ensureRdvServiceWorker();
    try{const p=await Notification.requestPermission();renderRdvNotificationState();if(p==='granted'){showRdvToast('Notifications 3615 activées.');checkRdvNotifications()}}catch(e){showRdvToast('Impossible d’activer les notifications sur ce navigateur.')}
  }
  async function sendRdvNotification(ev){
    const reg=await ensureRdvServiceWorker();if(!reg||Notification.permission!=='granted')return false;
    const when=rdvDateTime(ev),body=[rdvTypeLabel(ev.type),when?when.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'',ev.note||''].filter(Boolean).join(' · ');
    try{await reg.showNotification(`3615 RDV · ${ev.title}`,{body,tag:`3615-rdv-${ev.id}`,renotify:false,requireInteraction:true,vibrate:[180,100,180],data:{url:'./#rdv'}});return true}catch(e){return false}
  }
  async function checkRdvNotifications(){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    const rows=rdvStore(),now=Date.now();let changed=false;
    for(const ev of rows){
      if(ev.done||ev.notifiedAt)continue;const dt=rdvDateTime(ev);if(!dt)continue;
      const alertAt=dt.getTime()-(Number(ev.notifyMinutes)||0)*60000,late=now-alertAt;
      if(late>=0&&late<=60*60000){if(await sendRdvNotification(ev)){ev.notifiedAt=new Date().toISOString();changed=true}}
    }
    if(changed){localStorage.setItem(RDV_KEY,JSON.stringify(rows));renderRdv()}
  }
  function rdvItemHtml(ev){
    const dt=rdvDateTime(ev),today=ev.date===localDateKey(),past=dt&&dt.getTime()<Date.now(),d=dt||new Date();
    const day=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}).replace('.','').toUpperCase();
    const wd=d.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','').toUpperCase();
    const cls=['rdv-item',today?'is-today':'',ev.done?'is-done':''].filter(Boolean).join(' '),note=ev.note?` · ${escapeHtml3615(ev.note)}`:'';
    return `<article class="${cls}" data-rdv-id="${escapeAttr3615(ev.id)}"><div class="rdv-datebox"><span>${wd}</span><strong>${day}</strong></div><div class="rdv-copy"><span>${rdvTypeLabel(ev.type)} · ${rdvNotifyLabel(ev.notifyMinutes)}</span><strong>${escapeHtml3615(ev.title||'Sans titre')}</strong><small>${escapeHtml3615(ev.time||'—')}${note}${past&&!ev.done?' · PASSÉ':''}</small></div><div class="rdv-actions"><button class="rdv-calendar" data-rdv-action="calendar" type="button">📅 TÉLÉPHONE</button><button class="rdv-done" data-rdv-action="done" type="button">${ev.done?'RÉOUVRIR':'FAIT ✓'}</button><button data-rdv-action="edit" type="button">MODIFIER</button><button class="rdv-delete" data-rdv-action="delete" type="button">SUPPR.</button></div></article>`;
  }
  function renderRdv(){
    if(!$('rdv'))return;rdvDefaultForm();renderRdvNotificationState();
    const rows=rdvStore().slice().sort((a,b)=>(rdvDateTime(a)?.getTime()||0)-(rdvDateTime(b)?.getTime()||0)),now=Date.now();
    const upcoming=rows.filter(ev=>!ev.done&&(rdvDateTime(ev)?.getTime()||0)>=now-5*60000),past=rows.filter(ev=>ev.done||(rdvDateTime(ev)?.getTime()||0)<now-5*60000).sort((a,b)=>(rdvDateTime(b)?.getTime()||0)-(rdvDateTime(a)?.getTime()||0));
    setText('rdvUpcomingState',upcoming.length?`${upcoming.length} À VENIR`:'AGENDA LIBRE');setText('rdvPastCount',String(past.length));
    const up=$('rdvUpcomingList'),pa=$('rdvPastList');if(up)up.innerHTML=upcoming.length?upcoming.map(rdvItemHtml).join(''):'<div class="express-empty">Aucun rendez-vous à venir. Utilise le formulaire pour en ajouter un.</div>';if(pa)pa.innerHTML=past.length?past.map(rdvItemHtml).join(''):'<div class="express-empty">Aucun ancien rendez-vous.</div>';
  }
  function icsEscape(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
  function icsStamp(date){return `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}00`}
  function makeRdvIcs(events){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//3615 LENAIC//RDV//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    for(const ev of events){const start=rdvDateTime(ev);if(!start)continue;const end=new Date(start.getTime()+60*60000),trigger=Number(ev.notifyMinutes)||0;lines.push('BEGIN:VEVENT',`UID:${icsEscape(ev.id)}@3615-lenaic`,`DTSTAMP:${icsStamp(new Date())}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEscape(ev.title)}`,`DESCRIPTION:${icsEscape(ev.note||rdvTypeLabel(ev.type))}`,'BEGIN:VALARM',`TRIGGER:${trigger>0?`-PT${trigger}M`:'PT0M'}`,'ACTION:DISPLAY',`DESCRIPTION:${icsEscape(ev.title)}`,'END:VALARM','END:VEVENT')}
    lines.push('END:VCALENDAR');return lines.join('\r\n')
  }
  function safeFileName(v){return String(v||'rdv').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'rdv'}
  function downloadRdvIcs(events,name='3615-rdv'){if(!events.length){showRdvToast('Aucun rendez-vous à exporter.');return}const blob=new Blob([makeRdvIcs(events)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${safeFileName(name)}.ics`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showRdvToast('Fichier calendrier créé : ouvre-le sur le téléphone pour enregistrer l’alarme.')}
  $('rdvEnableNotifications')?.addEventListener('click',requestRdvNotifications);
  $('rdvCancelEdit')?.addEventListener('click',resetRdvForm);
  $('rdvForm')?.addEventListener('submit',e=>{
    e.preventDefault();const title=$('rdvTitle').value.trim(),date=$('rdvDate').value,time=$('rdvTime').value;if(!title||!date||!time)return;
    const rows=rdvStore(),id=$('rdvEditId').value||(`rdv-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),i=rows.findIndex(x=>x.id===id),old=i>=0?rows[i]:{};
    const ev={...old,id,title,date,time,type:$('rdvType').value,note:$('rdvNote').value.trim(),notifyMinutes:Number($('rdvNotify').value)||0,done:false,notifiedAt:null,updatedAt:new Date().toISOString(),createdAt:old.createdAt||new Date().toISOString()};if(i>=0)rows[i]=ev;else rows.push(ev);saveRdvStore(rows);resetRdvForm();showRdvToast(i>=0?'Rendez-vous mis à jour.':'Rendez-vous ajouté.');
  });
  $('rdv')?.addEventListener('click',e=>{const b=e.target.closest('[data-rdv-action]');if(!b)return;const row=b.closest('[data-rdv-id]'),id=row?.dataset.rdvId,rows=rdvStore(),i=rows.findIndex(x=>x.id===id);if(i<0)return;const ev=rows[i],action=b.dataset.rdvAction;if(action==='edit')editRdv(id);if(action==='delete'&&confirm(`Supprimer « ${ev.title} » ?`)){rows.splice(i,1);saveRdvStore(rows)}if(action==='done'){rows[i]={...ev,done:!ev.done,updatedAt:new Date().toISOString()};saveRdvStore(rows)}if(action==='calendar')downloadRdvIcs([ev],`${ev.date}-${ev.title}`)});
  $('rdvExportAll')?.addEventListener('click',()=>{const now=Date.now(),events=rdvStore().filter(ev=>!ev.done&&(rdvDateTime(ev)?.getTime()||0)>=now).sort((a,b)=>rdvDateTime(a)-rdvDateTime(b));downloadRdvIcs(events,'3615-rdv-a-venir')});
  window.addEventListener('storage',e=>{if(e.key===RDV_KEY){renderRdv();renderContextualReminders();renderV9Today()}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkRdvNotifications()});window.addEventListener('focus',checkRdvNotifications);

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
  if(window.LenaicBus)LenaicBus.subscribe(()=>{renderSleepPanel();renderBusStatus();renderCapLive();renderCulinaLive();renderExpressLive();renderGenealogyOffice();renderArianeLive();renderScribeLive();renderV9All()});
  window.addEventListener('storage',e=>{
    if(e.key===NEXUS_CONFIG_KEY)loadNexusConfig().then(()=>renderScribeLive());
    if(e.key==='cap-data'){renderSleepPanel();renderBusStatus();renderV9Health();renderV9Today();renderV9System()}
    if(e.key===CAP_SNAPSHOT_KEY){renderCapLive();renderV9Health();renderV9Today();renderV9System()}
    if(e.key===CULINA_SNAPSHOT_KEY){renderCulinaLive();renderBusStatus();renderV9Daily();renderV9Today()}
    if(e.key===EXPRESS_SNAPSHOT_KEY){renderExpressLive();renderBusStatus();renderV9Info()}
    if([ARBORIS_DATA_KEY,SCRIPTORIA_DATA_KEY,PISTORIA_DATA_KEY].includes(e.key)){renderGenealogyOffice();syncGenealogyTab();renderAnniversaries()}
    if(e.key===ARIANE_DATA_KEY){renderArianeLive();syncGenealogyTab();renderV9Archives()}
    if(e.key===SCRIBE_DATA_KEY||e.key===SCRIBE_SNAPSHOT_KEY){renderScribeLive();renderV9Archives();renderV9Today();renderV9System()}
    if(e.key===MEDITATION_KEY)renderMeditation();
    if(e.key===SAVINGS52_KEY){renderSavings52();renderV9Today();renderV9System()}
    if(e.key===CONTEXT_REMINDERS_KEY){renderContextualReminders();renderV9Today();renderV9System()}
    if(e.key===PINNED_REMINDERS_KEY){renderContextualReminders();renderHomeTomorrowReminders();renderPinnedReminderSystem();renderV9Today()}
    if(e.key===REMINDER_HISTORY_KEY)renderProcrastinationHistory();
    if(e.key==='culina-shopping-v1'){renderContextualReminders();renderHomeTomorrowReminders();renderV9Daily();renderV9Today()}
    if(e.key===TRANSPORT_LEDGER_KEY){renderTransportCounter();renderTransportMonthRecap()}
  });


  // === V9 · pages spécialisées =================================================
  function jsonOr(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
  function capNutritionDayKey(date=new Date()){const d=new Date(date);if(d.getHours()<1)d.setDate(d.getDate()-1);return localDateKey(d)}
  function capNutritionSummary(){
    const st=readCapState()||{}, day=st.daily?.[capNutritionDayKey()]||{}, meals=Array.isArray(day.meals)?day.meals:[];
    let totals={calories:0,protein:0,carbs:0,fat:0};
    if(meals.length)for(const m of meals){totals.calories+=Number(m.calories)||0;totals.protein+=Number(m.protein)||0;totals.carbs+=Number(m.carbs)||0;totals.fat+=Number(m.fat)||0}
    else {const n=day.nutrition||{};for(const k of Object.keys(totals))totals[k]=Number(n[k])||0}
    const set=st.settings||{},weight=Number(set.weight)||61.8;
    const goals={calories:Number(set.calories)||2200,protein:weight*(Number(set.proteinRate)||1.8),carbs:weight*(Number(set.carbRate)||5),fat:weight*(Number(set.fatRate)||1)};
    return {totals,goals,meals,day};
  }
  function pct(v,g){return g?Math.max(0,Math.min(100,Math.round((Number(v)||0)/g*100))):0}
  function renderV9Health(){
    const {totals,goals,meals}=capNutritionSummary();
    const defs=[['CALORIES','calories','kcal',0],['PROTÉINES','protein','g',1],['GLUCIDES','carbs','g',1],['LIPIDES','fat','g',1]];
    const grid=$('healthMacroGrid');if(grid)grid.innerHTML=defs.map(([label,key,unit,dec])=>{const val=Number(totals[key])||0,goal=Number(goals[key])||0,p=pct(val,goal);return `<div class="macro-box"><span>${label}</span><strong>${dec?val.toFixed(1):Math.round(val)} ${unit}</strong><small>/ ${Math.round(goal)} ${unit} · ${p}%</small><div class="macro-bar"><i style="width:${p}%"></i></div></div>`}).join('');
    setText('healthNutritionState',meals.length?`${meals.length} REPAS`:'EN COURS');
    setText('healthNutritionFoot',`${Math.round(totals.calories)} / ${Math.round(goals.calories)} KCAL · P ${totals.protein.toFixed(1)} G · G ${totals.carbs.toFixed(1)} G · L ${totals.fat.toFixed(1)} G`);
    const mealBox=$('healthMeals');if(mealBox){mealBox.innerHTML=meals.length?meals.map(m=>{const t=m.time||m.createdAt||'';let time='—';try{const d=new Date(t);if(Number.isFinite(d.getTime()))time=d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}catch{}return `<div class="meal-line"><time>${escapeHtml3615(time)}</time><div><strong>${escapeHtml3615(m.name||'Repas')}</strong><small>P ${Number(m.protein||0).toFixed(1)} · G ${Number(m.carbs||0).toFixed(1)} · L ${Number(m.fat||0).toFixed(1)} g</small></div><b>${Math.round(Number(m.calories)||0)} kcal</b></div>`}).join(''):'<div class="express-empty">Aucun repas enregistré aujourd’hui dans CAP.</div>'}
    const snap=readCapSnapshot()||{}, sl=snap.sleep||capSleepForToday()||{}, a=snap.activity||{}, m=snap.measurements||{};
    setText('healthSleepState',sl.complete?`${Math.round(Number(sl.score)||0)} %`:'À RENSEIGNER');
    const sd=$('healthSleepDetail');if(sd)sd.innerHTML=`<div><span>DURÉE</span><b>${Number(sl.hours)||0} h</b></div><div><span>QUALITÉ</span><b>${Number(sl.quality)||0} %</b></div><div><span>RÉCUP. PHYSIQUE</span><b>${Number(sl.physical)||0} %</b></div><div><span>RÉCUP. MENTALE</span><b>${Number(sl.mental)||0} %</b></div>`;
    setText('healthActivityState',a.completed?'TERMINÉE':(a.title?'PRÉVUE':'À SYNCHRONISER'));
    const ad=$('healthActivityDetail');if(ad)ad.innerHTML=`<div><span>SÉANCE</span><b>${escapeHtml3615(a.title||'Ouvre CAP')}</b></div><div><span>PROGRESSION</span><b>${Math.round(Number(a.progress)||0)} %</b></div><div><span>DURÉE</span><b>${escapeHtml3615(a.duration||'—')}</b></div><div><span>FOCUS</span><b>${escapeHtml3615(a.focus||'—')}</b></div>`;
    const days=Number(m.daysUntil);setText('healthMeasureState',m.latestDate?(days<0?'EN RETARD':days===0?'AUJOURD’HUI':`J-${days}`):'À INITIALISER');
    const md=$('healthMeasureDetail');if(md)md.innerHTML=`<div><span>DERNIÈRE</span><b>${escapeHtml3615(m.latestDate?formatShortDate(m.latestDate):'—')}</b></div><div><span>PROCHAINE</span><b>${escapeHtml3615(m.nextDueDate?formatShortDate(m.nextDueDate):'—')}</b></div><div><span>RYTHME</span><b>${Number(m.intervalDays)||14} JOURS</b></div>`;
  }
  function plansOnDate(key){const snap=readCulinaSnapshot();return Array.isArray(snap?.planned)?snap.planned.filter(p=>localDateKey(new Date(Number(p.at)))===key).sort((a,b)=>a.at-b.at):[]}
  function renderV9Today(){
    const snap=readCapSnapshot()||{},a=snap.activity||{},m=snap.measurements||{},plans=plansOnDate(localDateKey()),scribe=readScribeSnapshot()||{},received=Array.isArray(scribe.received)?scribe.received:[],pending=Array.isArray(scribe.pending)?scribe.pending:[],threshold=scribeReminderDays(),overdue=pending.filter(x=>Number(x.ageDays)>=threshold);
    const rows=[],saving=savings52Info();
    rdvEventsForDate(localDateKey()).forEach(ev=>rows.push({k:rdvTypeLabel(ev.type),t:ev.title||'Rendez-vous',s:`${ev.time||'—'}${ev.note?' · '+ev.note:''}`,b:ev.done?'TERMINÉ':'RDV'}));
    pinnedReminderStore().filter(r=>r.date===localDateKey()).forEach(r=>rows.push({k:'RAPPEL',t:`${r.icon||'📌'} ${r.title}`,s:'Rappel local épinglé',b:r.doneAt?'TERMINÉ':'À FAIRE'}));
    const compostStore=contextReminderStore(),compostTodayKey=localDateKey();let compostOriginToday='';if(new Date().getDay()===5&&!(compostStore.compostSnooze?.[compostTodayKey]&&compostStore.compostSnooze[compostTodayKey]!==compostTodayKey))compostOriginToday=compostTodayKey;if(!compostOriginToday)for(const [o,due] of Object.entries(compostStore.compostSnooze||{}))if(due===compostTodayKey){compostOriginToday=o;break}if(compostOriginToday)rows.push({k:'COMPOST',t:'🪱 Vider le compost',s:compostOriginToday===compostTodayKey?'Rappel hebdomadaire du vendredi':'Rappel reporté',b:compostStore.compost?.[compostOriginToday]?'TERMINÉ':'À FAIRE'});
    if(saving.active&&(saving.isMonday||!saving.done||saving.doneToday)&&!saving.isSnoozed)rows.push({k:'ÉPARGNE',t:`${saving.amount} € à mettre de côté`,s:`Cumul validé : ${saving.saved.toLocaleString('fr-FR')} / ${SAVINGS52_TARGET.toLocaleString('fr-FR')} €`,b:saving.done?'ÉPARGNÉ':'À FAIRE'});
    const shoppingNow=openCulinaShopping(),crs=contextReminderStore(),todayKey=localDateKey();let shoppingOrigin='';if(new Date().getDay()===1&&!(crs.shoppingSnooze?.[todayKey]&&crs.shoppingSnooze[todayKey]!==todayKey))shoppingOrigin=todayKey;if(!shoppingOrigin)for(const [o,due] of Object.entries(crs.shoppingSnooze||{}))if(due===todayKey){shoppingOrigin=o;break}if(shoppingOrigin&&(shoppingNow.length||crs.shopping?.[shoppingOrigin]))rows.push({k:'COURSES',t:`${shoppingNow.length} article${shoppingNow.length>1?'s':''} dans Culina`,s:shoppingNow.map(x=>x.name).join(' · ')||'Liste terminée',b:crs.shopping?.[shoppingOrigin]?'TERMINÉ':'À FAIRE'});
    rows.push({k:'CAP',t:a.title||'Activité du jour à synchroniser',s:a.title?`${Math.round(Number(a.progress)||0)} % · ${a.label||''}`:'Ouvre CAP pour actualiser',b:a.completed?'TERMINÉE':'AUJOURD’HUI'});
    plans.forEach(p=>rows.push({k:p.mealType==='lunch'?'CE MIDI':p.mealType==='dinner'?'CE SOIR':'REPAS',t:p.name||'Repas Culina',s:`${formatClock(p.at)} · ${Math.round(Number(p.calories)||0)} kcal`,b:Number(p.missingCount)?`${p.missingCount} MANQUANT${p.missingCount>1?'S':''}`:'PRÊT'}));
    if(m.latestDate&&Number(m.daysUntil)<=1)rows.push({k:'MESURES',t:Number(m.daysUntil)<=0?'Mensurations à faire':'Mensurations demain',s:`Dernière : ${formatShortDate(m.latestDate)}`,b:Number(m.daysUntil)<=0?'ÉCHÉANCE':'J-1'});
    if(received.length)rows.push({k:'SCRIBE',t:`Réponse reçue · ${received[0].contact||'Archives'}`,s:received[0].title||'Demande à traiter',b:'À TRAITER'});else if(overdue.length)rows.push({k:'SCRIBE',t:`${overdue.length} relance${overdue.length>1?'s':''} à envisager`,s:`Seuil NEXUS : ${threshold} jours`,b:'ARCHIVES'});
    const box=$('programGrid');if(box)box.innerHTML=rows.map(r=>`<div class="program-item"><div><span>${escapeHtml3615(r.k)}</span><strong>${escapeHtml3615(r.t)}</strong><small>${escapeHtml3615(r.s)}</small></div><b>${escapeHtml3615(r.b)}</b></div>`).join('');
    setText('programState',`${rows.length} REPÈRE${rows.length>1?'S':''}`);
    setText('homeProgramState',rows.length?`${rows.length} REPÈRE${rows.length>1?'S':''}`:'RAS');setText('homeProgramMeta',rows[0]?`${rows[0].k} · ${rows[0].t}`:'Aucun rappel particulier.');
    const d=new Date();d.setDate(d.getDate()+1);const tkey=localDateKey(d),tPlans=plansOnDate(tkey),daily=weatherData?.daily||{},tm=tomorrowReminderRows().map(x=>({...x}));
    if(daily.time?.[1]){const [ic,lab]=weatherLabel(daily.weather_code?.[1]);tm.push({k:'MÉTÉO',t:`${ic} ${lab}`,s:`${Math.round(daily.temperature_2m_min?.[1])}° / ${Math.round(daily.temperature_2m_max?.[1])}° · pluie ${Math.round(daily.precipitation_probability_max?.[1]||0)} %`,b:'DEMAIN'})}
    if(tPlans.length)tPlans.forEach(p=>tm.push({k:'CULINA',t:p.name||'Repas programmé',s:`${formatClock(p.at)} · ${Math.round(Number(p.calories)||0)} kcal`,b:p.mealType==='lunch'?'MIDI':p.mealType==='dinner'?'SOIR':'REPAS'}));else tm.push({k:'CULINA',t:'Aucun repas programmé',s:'Tu peux préparer demain depuis Culina.',b:'LIBRE'});
    tm.push({k:'CAP',t:'Programme de demain',s:'Le détail reste piloté par CAP.',b:'OUVRIR CAP'});
    const tb=$('tomorrowGrid');if(tb)tb.innerHTML=tm.map(r=>`<div class="tomorrow-item"><div><span>${escapeHtml3615(r.k)}</span><strong>${escapeHtml3615(r.t)}</strong><small>${escapeHtml3615(r.s)}</small></div><b>${escapeHtml3615(r.b)}</b></div>`).join('');
  }
  function renderV9Daily(){
    const plans=culinaPlansToday(),shopping=jsonOr('culina-shopping-v1',[]),leftovers=jsonOr('culina-leftovers-v1',[]),stock=jsonOr('culina-stock-v1',{});
    setText('dailyCulinaState',plans.length?`${plans.length} REPAS PRÉVU${plans.length>1?'S':''}`:'RIEN DE PROGRAMMÉ');
    const r=$('dailyCulinaRows');if(r)r.innerHTML=plans.length?plans.map(p=>`<div class="daily-row"><div><span>${p.mealType==='lunch'?'CE MIDI':p.mealType==='dinner'?'CE SOIR':'REPAS'}</span><strong>${escapeHtml3615(p.name||'Repas Culina')}</strong><small>${formatClock(p.at)} · ${Math.round(Number(p.calories)||0)} kcal · ${Number(p.missingCount)||0} ingrédient(s) manquant(s)</small></div><b>${Number(p.missingCount)?'À COMPLÉTER':'PRÊT'}</b></div>`).join(''):'<div class="express-empty">Aucun repas programmé aujourd’hui.</div>';
    const k=$('dailyCulinaKpis');if(k)k.innerHTML=`<span>${Array.isArray(shopping)?shopping.length:0} COURSE(S)</span><span>${Array.isArray(leftovers)?leftovers.length:0} RESTE(S)</span><span>${stock&&typeof stock==='object'?Object.keys(stock).length:0} ZONE(S) DE STOCK</span>`;
  }
  function renderInfoBreakdown(articles,meta={}){
    const all=Array.isArray(articles)?articles:[];
    const local=all.filter(a=>['local','clermont','auvergne'].includes(String(a.category||'').toLowerCase())||/clermont|puy-de-dôme|auvergne|loire/i.test(`${a.title||''} ${a.source||''}`)).slice(0,4);
    const gen=all.filter(a=>String(a.category||'').toLowerCase()==='genealogie'||/généalog|genealog|archives?/i.test(a.title||'')).slice(0,4);
    const rows=(arr,empty)=>arr.length?arr.map(a=>`<a href="${escapeAttr3615(a.url||'../lenaic-express/')}" target="_blank" rel="noopener"><strong>${escapeHtml3615(a.title||'Sans titre')}</strong><small>${escapeHtml3615(a.source||'Source')} · ${escapeHtml3615(expressPublishedLabel(a.publishedAt||a.published_at)||'')}</small></a>`).join(''):`<div class="express-empty">${empty}</div>`;
    if($('localNewsList'))$('localNewsList').innerHTML=rows(local,'Aucun titre local dans cette édition.');
    if($('genealogyNewsList'))$('genealogyNewsList').innerHTML=rows(gen,'Aucun titre généalogique dans cette édition.');
    const dt=meta.editionGeneratedAt||meta.generatedAt,d=dt?new Date(dt):null;setText('infoLastUpdate',d&&Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—');setText('infoUpdateMeta',all.length?`${all.length} titre${all.length>1?'s':''} disponibles dans l’édition locale.`:'Lénaïc Express n’a pas encore publié d’édition.');
  }
  function renderV9Info(){const snap=readExpressSnapshot();if(snap?.top)renderInfoBreakdown(snap.top,snap)}
  function arborisEventDate(obj,path){return path.split('.').reduce((a,k)=>a?.[k],obj)||''}
  function anniversaryEvents(){
    const a=readLocalJson(ARBORIS_DATA_KEY);if(!a||!Array.isArray(a.people))return [];
    const byId=new Map(a.people.map(p=>[p.id,p])),events=[];
    const add=(date,type,label,meta='')=>{const m=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)events.push({date:String(date),year:Number(m[1]),month:Number(m[2]),day:Number(m[3]),type,label,meta})};
    a.people.forEach(p=>{const name=personDisplayName(p);add(arborisEventDate(p,'birth.date'),'NAISSANCE',name,p.sosa?`Sosa ${p.sosa}`:'');add(arborisEventDate(p,'death.date'),'DÉCÈS',name,p.sosa?`Sosa ${p.sosa}`:'')});
    (a.families||[]).forEach(f=>{const p1=byId.get(f.partner1Id),p2=byId.get(f.partner2Id),label=[personDisplayName(p1),personDisplayName(p2)].filter(x=>x&&x!=='Individu sans nom').join(' × ');add(arborisEventDate(f,'marriage.date'),'MARIAGE',label||'Couple','')});
    return events;
  }
  function nextOccurrence(ev,base=new Date()) {const d=new Date(base.getFullYear(),ev.month-1,ev.day,12);if(d<new Date(base.getFullYear(),base.getMonth(),base.getDate(),12))d.setFullYear(d.getFullYear()+1);return d}
  function renderAnniversaries(){
    const all=anniversaryEvents(),box=$('anniversaryList');if(!box)return;
    if(!all.length){setText('anniversaryState','ARBORIS À OUVRIR');box.innerHTML='<div class="express-empty">Aucun événement daté trouvé dans Arboris.</div>';return}
    const today=new Date(),start=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12),limit=new Date(start);limit.setDate(limit.getDate()+7);
    const upcoming=all.map(e=>({...e,next:nextOccurrence(e,start)})).filter(e=>e.next<=limit).sort((a,b)=>a.next-b.next||a.year-b.year);
    setText('anniversaryState',upcoming.length?`${upcoming.length} ÉVÉNEMENT${upcoming.length>1?'S':''}`:'AUCUN CETTE SEMAINE');
    if(!upcoming.length){box.innerHTML='<div class="express-empty">Aucun anniversaire familial dans les 7 prochains jours.</div>';return}
    const groups=new Map();for(const e of upcoming){const k=localDateKey(e.next);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
    box.innerHTML=[...groups].map(([k,arr])=>{const d=new Date(k+'T12:00:00'),label=k===localDateKey()?'AUJOURD’HUI':(()=>{const t=new Date(start);t.setDate(t.getDate()+1);return k===localDateKey(t)?'DEMAIN':d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()})();return `<div class="anniversary-day"><strong>${label}</strong>${arr.map(e=>`<div class="anniversary-row"><div><span class="anniversary-type">${e.type}</span><strong>${escapeHtml3615(e.label)}</strong><small>${e.year}${e.meta?' · '+escapeHtml3615(e.meta):''}</small></div><b>${d.getFullYear()-e.year} AN${d.getFullYear()-e.year>1?'S':''}</b></div>`).join('')}</div>`}).join('');
  }
  function searchAny(obj,q){try{return JSON.stringify(obj).toLocaleLowerCase('fr').includes(q)}catch{return false}}
  function renderGenealogySearch(query){
    const q=String(query||'').trim().toLocaleLowerCase('fr'),box=$('genealogySearchResults');if(!box)return;if(q.length<2){box.innerHTML='<div class="express-empty">Saisis au moins deux caractères.</div>';return}
    const out=[],arb=readLocalJson(ARBORIS_DATA_KEY),scr=readLocalJson(SCRIPTORIA_DATA_KEY),pis=readLocalJson(PISTORIA_DATA_KEY);
    (arb?.people||[]).filter(x=>searchAny(x,q)).slice(0,8).forEach(x=>out.push({s:'ARBORIS',t:personDisplayName(x),m:[x.sosa?`Sosa ${x.sosa}`:'',x.birth?.date||'',x.birth?.commune||''].filter(Boolean).join(' · ')}));
    (scr?.people||[]).filter(x=>searchAny(x,q)).slice(0,6).forEach(x=>out.push({s:'SCRIPTORIA',t:personDisplayName(x),m:[x.birthDate||x.baptismDate||'',x.birthPlace||''].filter(Boolean).join(' · ')}));
    (scr?.records||[]).filter(x=>searchAny(x,q)).slice(0,6).forEach(x=>out.push({s:'SCRIPTORIA · ACTE',t:x.title||x.type||'Acte',m:[x.date,x.registerId].filter(Boolean).join(' · ')}));
    (pis?.investigations||[]).filter(x=>searchAny(x,q)).slice(0,6).forEach(x=>out.push({s:'PISTORIA',t:[x.sosa?`Sosa ${x.sosa}`:'',x.person||x.title||'Piste'].filter(Boolean).join(' · '),m:x.status||''}));
    box.innerHTML=out.length?out.slice(0,18).map(x=>`<div class="search-result"><div class="search-source">${escapeHtml3615(x.s)}</div><strong>${escapeHtml3615(x.t)}</strong><small>${escapeHtml3615(x.m||'')}</small></div>`).join(''):'<div class="express-empty">Aucun résultat dans les bases locales.</div>';
  }
  $('genealogySearchForm')?.addEventListener('submit',e=>{e.preventDefault();renderGenealogySearch($('genealogySearchInput')?.value)});
  function renderV9Archives(){
    const snap=readScribeSnapshot()||{},counts=snap.counts||{},pending=Array.isArray(snap.pending)?snap.pending:[],received=Array.isArray(snap.received)?snap.received:[],threshold=scribeReminderDays(),rows=[];
    setText('archiveScribeState',received.length?`${received.length} RÉPONSE${received.length>1?'S':''}`:pending.length?`${pending.length} EN ATTENTE`:'À JOUR');
    const sb=$('archiveScribeList');if(sb)sb.innerHTML=[...received.slice(0,3).map(r=>`<div class="scribe-request-row received"><div><strong>${escapeHtml3615(r.title||'Réponse')}</strong><small>${escapeHtml3615(r.contact||'Archives')}</small></div><b>RÉPONSE</b></div>`),...pending.slice(0,4).map(r=>`<div class="scribe-request-row${Number(r.ageDays)>=threshold?' overdue':''}"><div><strong>${escapeHtml3615(r.title||'Demande')}</strong><small>${escapeHtml3615(r.contact||'Archives')}</small></div><b>${Number(r.ageDays)>=threshold?'RELANCE':scribeAgeLabel(r.ageDays)}</b></div>`)].join('')||'<div class="express-empty">Aucune requête à signaler.</div>';
    const ar=readLocalJson(ARIANE_DATA_KEY);(ar?.cases||[]).slice().sort((a,b)=>timeValue(b,['updatedAt','createdAt'])-timeValue(a,['updatedAt','createdAt'])).slice(0,4).forEach(c=>rows.push({k:'ARIANE',t:c.title||'Enquête',m:c.status||'En cours'}));received.slice(0,3).forEach(r=>rows.push({k:'SCRIBE',t:r.title||'Réponse reçue',m:r.contact||'Archives'}));pending.slice(0,3).forEach(r=>rows.push({k:'SCRIBE',t:r.title||'Demande en attente',m:`${r.contact||'Archives'} · ${scribeAgeLabel(r.ageDays)}`}));
    const af=$('archiveActivityFeed');if(af)af.innerHTML=rows.length?rows.slice(0,7).map(x=>`<div class="activity-item"><div><span>${x.k}</span><strong>${escapeHtml3615(x.t)}</strong><small>${escapeHtml3615(x.m)}</small></div></div>`).join(''):'<div class="express-empty">Aucune activité récente détectée.</div>';
  }
  function renderV9System(){
    const pending=window.LenaicBus?LenaicBus.pending():[],scribe=readScribeSnapshot()||{},overdue=(scribe.pending||[]).filter(x=>Number(x.ageDays)>=scribeReminderDays()),m=readCapSnapshot()?.measurements||{},notifs=[];
    const saving=savings52Info();if(saving.active&&!saving.done)notifs.push(`Défi 52 semaines : ${saving.amount} € à épargner cette semaine`);
    if(overdue.length)notifs.push(`${overdue.length} relance${overdue.length>1?'s':''} Scribe à envisager`);if((scribe.received||[]).length)notifs.push(`${scribe.received.length} réponse${scribe.received.length>1?'s':''} Scribe reçue${scribe.received.length>1?'s':''}`);if(m.latestDate&&Number(m.daysUntil)<=1)notifs.push(Number(m.daysUntil)<=0?'Mensurations CAP à faire':'Mensurations CAP demain');if(pending.length)notifs.push(`${pending.length} message${pending.length>1?'s':''} sur le bus`);
    setText('systemNotifState',notifs.length?`${notifs.length} À VOIR`:'RAS');const nb=$('systemNotifications');if(nb)nb.innerHTML=notifs.length?notifs.map(x=>`<div class="activity-item"><div><span>ATTENTION</span><strong>${escapeHtml3615(x)}</strong></div></div>`).join(''):'<div class="express-empty">Aucune action urgente.</div>';
    setText('systemBusState',window.LenaicBus?'ACTIF':'HORS LIGNE');const bd=$('systemBusDetail');if(bd)bd.innerHTML=`<div><span>MESSAGES EN ATTENTE</span><b>${pending.length}</b></div><div><span>CANAL</span><b>lenaic-bus-v1</b></div><div><span>MODE</span><b>LOCAL + BROADCAST</b></div>`;
    const keys=['cap-data','memoire-famille-data','scriptoria-data','pistoria_private_v3','ariane-local-v2','scribe-local-v3'];const present=keys.filter(k=>localStorage.getItem(k)!=null).length;const bk=$('systemBackupDetail');if(bk)bk.innerHTML=`<div><span>JEUX LOCAUX MAJEURS</span><b>${present}/${keys.length} DÉTECTÉS</b></div><div><span>SNAPSHOT AUTO</span><b>${Number(nexusConfig?.automations?.autoSnapshotHours)||3} H</b></div><div><span>RÉTENTION</span><b>${Number(nexusConfig?.automations?.retentionPerDataset)||20} VERSIONS</b></div>`;
    renderPinnedReminderSystem();renderProcrastinationHistory();
  }
  function renderV9All(){renderV9Today();renderV9Daily();renderV9Health();renderV9Info();renderAnniversaries();renderV9Archives();renderV9System()}

  const commandMap={
    '0':()=>showSection('home'),'accueil':()=>showSection('home'),'home':()=>showSection('home'),
    '1':()=>showSection('aujourdhui'),'aujourdhui':()=>showSection('aujourdhui'),'aujourd’hui':()=>showSection('aujourdhui'),'today':()=>showSection('aujourdhui'),'meteo':()=>showSection('aujourdhui'),'météo':()=>showSection('aujourdhui'),'epargne':()=>{showSection('home');setTimeout(()=>$('savings52Card')?.scrollIntoView({behavior:'smooth',block:'center'}),50)},'épargne':()=>{showSection('home');setTimeout(()=>$('savings52Card')?.scrollIntoView({behavior:'smooth',block:'center'}),50)},
    '2':()=>showSection('rdv'),'rdv':()=>showSection('rdv'),'agenda':()=>showSection('rdv'),'rappel':()=>showSection('rdv'),'rappels':()=>showSection('rdv'),
    '3':()=>showSection('quotidien'),'quotidien':()=>showSection('quotidien'),'daily':()=>showSection('quotidien'),
    '4':()=>showSection('sante'),'sante':()=>showSection('sante'),'santé':()=>showSection('sante'),'meditation':()=>showSection('sante'),'méditation':()=>showSection('sante'),'nutrition':()=>showSection('sante'),
    '5':()=>showSection('informations'),'info':()=>showSection('informations'),'infos':()=>showSection('informations'),'informations':()=>showSection('informations'),
    '6':()=>showSection('genealogie'),'genealogie':()=>showSection('genealogie'),'généalogie':()=>showSection('genealogie'),'anniversaires':()=>showSection('genealogie'),
    '7':()=>showSection('archives'),'archives':()=>showSection('archives'),'ariane':()=>showSection('archives'),'scribe':()=>showSection('archives'),
    '8':()=>showSection('detente'),'detente':()=>showSection('detente'),'détente':()=>showSection('detente'),'otarie':()=>showSection('detente'),
    '9':()=>showSection('systeme'),'systeme':()=>showSection('systeme'),'système':()=>showSection('systeme'),'aide':()=>showSection('systeme'),'services':()=>showSection('systeme')
  };
  $('commandForm').addEventListener('submit',e=>{
    e.preventDefault();const raw=$('commandInput').value.trim().toLowerCase();const dest=dynamicCommands[raw]??commandMap[raw];
    if(typeof dest==='function')dest();else if(typeof dest==='string')location.href=dest;else{setText('greetingText',`Commande « ${raw||'vide'} » inconnue. Essaie 0–7, 9, METEO, CAP, CULINA, SCRIBE, ARIANE, OTARIE ou NEXUS.`)}
    $('commandInput').value='';
  });
  document.addEventListener('keydown',e=>{
    if(/input|textarea|select/i.test(document.activeElement?.tagName||''))return;
    const keySections={'0':'home','1':'aujourdhui','2':'rdv','3':'quotidien','4':'sante','5':'informations','6':'genealogie','7':'archives','8':'detente','9':'systeme'};if(keySections[e.key])showSection(keySections[e.key]);
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

  migrateV918RecurringCompost();renderContext();renderAbsurdities();renderEphemeris();renderSleepPanel();renderSavings52();renderContextualReminders();renderHomeTomorrowReminders();renderPinnedReminderSystem();renderProcrastinationHistory();renderTransportCounter();renderTransportMonthRecap();renderRdv();ensureRdvServiceWorker();checkRdvNotifications();renderCapLive();renderCulinaLive();renderExpressLive();renderGenealogyOffice();renderArianeLive();renderScribeLive();syncGenealogyTab();renderBusStatus();renderOtarieStatus();renderMeditation();renderBizarre();renderV9All();initMiniOtarie();
  loadNexusConfig();loadWeather();loadNameday();
  setInterval(()=>{renderContext();renderSavings52();renderContextualReminders();renderTransportCounter();renderTransportMonthRecap();renderRdv();checkRdvNotifications();renderCapLive();renderCulinaLive();renderExpressLive();renderScribeLive();renderBusStatus();renderEphemeris();renderMeditation();renderOtarieStatus();renderV9All();},60000);
  setInterval(renderCulinaLive,3000);
  setInterval(checkRdvNotifications,15000);
  if(location.hash==='#rdv')showSection('rdv');
  window.addEventListener('hashchange',()=>{if(location.hash==='#rdv')showSection('rdv')});
})();
