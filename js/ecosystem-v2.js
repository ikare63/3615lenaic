/* 3615 Lénaïc — couche Écosystème V2 : notifications, contexte, recherche, modules NEXUS. */
(function(){
'use strict';
if(!window.LenaicEcosystem)return;
const $=id=>document.getElementById(id);
const read=(key,fallback=null)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const attr=s=>esc(s).replace(/`/g,'&#96;');
const fmtDate=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
const localDateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let config={modules:[],automations:{scribeReminderDays:30}};

async function loadConfig(){
 const local=read('lenaic-nexus-published-v2',null);
 try{
  const remote=await fetch('data/nexus-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);
  const lt=Date.parse(local?.publishedAt||0)||0,rt=Date.parse(remote?.publishedAt||0)||0;
  config=(rt>lt?remote:local)||remote||local||config;
 }catch(_e){config=local||config}
 renderAll();
}

/* -------------------- CONTEXTE GÉNÉALOGIQUE PARTAGÉ -------------------- */
function renderGenealogyContext(){
 const c=LenaicContext.get(),box=$('genealogyContextCard'),mini=$('homeGenealogyContext');
 if(box){
  if(!c)box.innerHTML=`<div class="retro-head"><span>CONTEXTE.ACTIF</span><strong>AUCUNE PERSONNE</strong></div><p>Dans Arboris ou Pistoria, choisis « ◎ Contexte » sur la personne que tu es en train de travailler.</p>`;
  else box.innerHTML=`<div class="retro-head"><span>CONTEXTE.ACTIF</span><strong>${esc(c.name||'PERSONNE')}</strong></div><div class="context-active-grid"><div><span>IDENTITÉ</span><strong>${esc(c.name||'—')}</strong><small>${c.sosa!=null?`Sosa ${esc(c.sosa)}`:'Sosa non renseigné'}${c.birth?` · ${esc(c.birth)}`:''}${c.death?` – ${esc(c.death)}`:''}</small></div><div class="context-links"><a href="/bureau-genealogique/index.html?person=${encodeURIComponent(c.personId||'')}">ARBORIS →</a><a href="/bureau-genealogique/index3.html">PISTORIA →</a><a href="/aide_archive/Ariane.html">ARIANE →</a><button type="button" data-clear-gene-context>EFFACER</button></div></div>`;
 }
 if(mini){
  mini.hidden=!c;
  if(c)mini.innerHTML=`<span>CONTEXTE ACTIF</span><strong>${esc(c.name||'—')}</strong><small>${c.sosa!=null?`Sosa ${esc(c.sosa)} · `:''}${esc(c.source||'généalogie')}</small>`;
 }
}
document.addEventListener('click',e=>{if(e.target.closest('[data-clear-gene-context]'))LenaicContext.clear()});
LenaicContext.subscribe(renderGenealogyContext);

/* ---------------------- RECHERCHE UNIVERSELLE ----------------------- */
function nameOf(p){return [p?.firstNames||p?.givenNames||p?.firstName||'',p?.lastName||p?.surname||p?.name||''].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||p?.person||p?.title||'Personne'}
function getPath(o,path){return String(path).split('.').reduce((a,k)=>a?.[k],o)}
function dateText(v){return typeof v==='string'?v:(v?.date||v?.yearOnly||v?.approximateDate||'')}
function rebuildUniversalIndexes(){
 try{
  const a=read('memoire-famille-data',{});LenaicSearch.publish('arboris',(a.people||[]).map(p=>({id:p.id,type:'person',label:nameOf(p),subtitle:[p.sosa?`Sosa ${p.sosa}`:'',dateText(p.birth),getPath(p,'birth.commune')||'',p.branch||''].filter(Boolean).join(' · '),url:`/bureau-genealogique/index.html?person=${encodeURIComponent(p.id)}`,keywords:[p.branch,p.profession,p.occupation,getPath(p,'birth.commune'),getPath(p,'death.commune')].filter(Boolean),meta:{sosa:p.sosa||null}})));
  const s=read('scriptoria-data',{});LenaicSearch.publish('scriptoria',[...(s.people||[]).map(p=>({id:`p:${p.id}`,type:'person',label:nameOf(p),subtitle:[p.birthDate||p.baptismDate||'',p.birthPlace||p.residence||'',p.mainOccupation||''].filter(Boolean).join(' · '),url:`/bureau-genealogique/index2.html?search=${encodeURIComponent(nameOf(p))}`,keywords:[p.mainOccupation,p.otherOccupations,p.residence,p.birthPlace,p.deathPlace].filter(Boolean)})),...(s.records||[]).slice(-2200).map(r=>({id:`r:${r.id}`,type:'record',label:r.title||r.fields?.name||r.fields?.names||r.type||'Acte',subtitle:[r.date||r.year||'',r.commune||r.parish||'',r.pageNumber?`p. ${r.pageNumber}`:''].filter(Boolean).join(' · '),url:`/bureau-genealogique/index2.html?search=${encodeURIComponent(r.title||r.fields?.name||r.fields?.names||r.date||'acte')}`,keywords:[r.transcription,r.registerId,r.recordNumber,r.locality,...Object.values(r.fields||{}).filter(x=>typeof x==='string')].filter(Boolean)}))]);
  const p=read('pistoria_private_v3',{});LenaicSearch.publish('pistoria',(p.investigations||[]).map(inv=>({id:inv.id,type:'investigation',label:inv.person||inv.title||'Enquête Pistoria',subtitle:[inv.sosa!=null?`Sosa ${inv.sosa}`:'',inv.status||'',(inv.steps||[]).find(x=>x.status==='todo')?.title||''].filter(Boolean).join(' · '),url:`/bureau-genealogique/index3.html?investigation=${encodeURIComponent(inv.id)}`,keywords:[inv.title,inv.objective,inv.known,inv.place,...(inv.steps||[]).map(x=>`${x.title||''} ${x.place||''} ${x.period||''}`)].filter(Boolean)})));
  const ar=read('ariane-local-v2',{});LenaicSearch.publish('ariane',(ar.cases||[]).map(c=>({id:c.id,type:'case',label:c.title||'Enquête Ariane',subtitle:[c.status,c.place,c.date].filter(Boolean).join(' · '),url:`/aide_archive/Ariane.html?case=${encodeURIComponent(c.id)}`,keywords:[c.goal,c.notes,c.type,...(c.items||[]).map(i=>`${i.label||''} ${i.cote||''} ${i.dossier||''}`)].filter(Boolean)})));
  const sc=read('scribe-local-v3',{});LenaicSearch.publish('scribe',(sc.drafts||[]).map(d=>({id:d.id,type:'request',label:d.title||'Requête Scribe',subtitle:[d.status,d.fields?.names||d.fields?.people||d.fields?.person1||'',d.fields?.place||d.fields?.commune||''].filter(Boolean).join(' · '),url:`/aide_archive/Scribe-v3.html?draft=${encodeURIComponent(d.id)}`,keywords:[...Object.values(d.fields||{}).filter(v=>typeof v==='string'),d.extra,d.customSubject].filter(Boolean)})));
 }catch(e){console.warn('Recherche universelle',e)}
}
const SOURCE_LABELS={arboris:'ARBORIS',scriptoria:'SCRIPTORIA',pistoria:'PISTORIA',ariane:'ARIANE',scribe:'SCRIBE'};
function renderUniversalSearch(q){
 rebuildUniversalIndexes();const box=$('genealogySearchResults');if(!box)return;const query=String(q||'').trim();if(query.length<2){box.innerHTML='<div class="express-empty">Saisis au moins deux caractères.</div>';return}
 const rows=LenaicSearch.query(query,{apps:['arboris','scriptoria','pistoria','ariane','scribe'],limit:40});
 if(!rows.length){box.innerHTML='<div class="express-empty">Aucun résultat dans Arboris, Scriptoria, Pistoria, Ariane ou Scribe.</div>';return}
 const groups=new Map();rows.forEach(r=>{if(!groups.has(r.appId))groups.set(r.appId,[]);groups.get(r.appId).push(r)});
 box.innerHTML=[...groups.entries()].map(([app,list])=>`<section class="search-group"><div class="search-group-head"><strong>${SOURCE_LABELS[app]||app.toUpperCase()}</strong><span>${list.length} résultat${list.length>1?'s':''}</span></div>${list.slice(0,10).map(r=>`<a class="search-result search-result-link" href="${attr(r.url||'#')}"><div class="search-source">${esc((r.type||'').toUpperCase())}</div><strong>${esc(r.label)}</strong><small>${esc(r.subtitle||'')}</small><b>→</b></a>`).join('')}</section>`).join('');
}
document.addEventListener('submit',e=>{if(e.target?.id!=='genealogySearchForm')return;e.preventDefault();e.stopImmediatePropagation();renderUniversalSearch($('genealogySearchInput')?.value)},true);

/* ------------------------- MODULES NEXUS -------------------------- */
function moduleDefs(){return Array.isArray(config?.modules)?config.modules.filter(m=>m&&m.visible!==false):[]}
function unitLabel(def,value){const u=def.unit||'';return `${Number(value).toLocaleString('fr-FR',{maximumFractionDigits:2})}${u?` ${u}`:''}`}
function moduleCard(def,scope){
 const r=LenaicModules.resolve(def),done=r.done,kind=def.kind||'checkbox';if(!r.active)return'';if(done&&!def.showWhenDone&&scope==='home')return'';
 const state=done?'VALIDÉ':'À FAIRE',progress=kind==='progressive'&&r.target?r.progress:null;
 return `<article class="minitel-card nexus-module-card ${done?'is-done':''}" data-module-id="${attr(def.id)}"><div class="retro-head"><span>${esc(def.code||'NEXUS.MODULE')}</span><strong>${esc(state)}</strong></div><div class="module-body"><div><h3>${esc(def.label||'Rappel')}</h3>${def.description?`<p>${esc(def.description)}</p>`:''}${kind==='progressive'?`<div class="module-current"><span>CETTE PÉRIODE</span><strong>${esc(unitLabel(def,r.currentValue))}</strong></div>`:''}</div>${kind==='progressive'?`<div class="module-total"><span>CUMUL VALIDÉ</span><strong>${esc(unitLabel(def,r.completedValue))}${r.target?` / ${esc(unitLabel(def,r.target))}`:''}</strong></div>`:''}</div>${progress!=null?`<div class="module-progress"><i style="width:${Math.max(0,Math.min(100,progress))}%"></i></div><div class="module-progress-meta"><span>${progress.toLocaleString('fr-FR',{maximumFractionDigits:1})} %</span><small>${r.index+1}${def.occurrences?` / ${def.occurrences}`:''}</small></div>`:''}${kind==='counter'?`<div class="module-counter"><input type="number" step="any" value="${Number(r.state?.values?.[r.periodKey]?.value)||0}" data-module-value="${attr(def.id)}"><button type="button" data-module-save="${attr(def.id)}">ENREGISTRER</button></div>`:`<label class="module-check"><input type="checkbox" data-module-check="${attr(def.id)}" ${done?'checked':''}><span>${esc(def.checkLabel||'FAIT')}</span></label>`}</article>`;
}
function renderModules(){
 const defs=moduleDefs(),home=$('homeBlock-modules'),today=$('todayNexusModules');
 if(home){const list=defs.filter(d=>d.display?.home!==false&&d.display?.home);home.innerHTML=list.map(d=>moduleCard(d,'home')).filter(Boolean).join('');home.hidden=!home.innerHTML.trim()}
 if(today){const list=defs.filter(d=>d.display?.today);today.innerHTML=list.map(d=>moduleCard(d,'today')).filter(Boolean).join('');today.hidden=!today.innerHTML.trim()}
 syncModuleNotifications();
}
function moduleById(id){return moduleDefs().find(m=>String(m.id)===String(id))}
document.addEventListener('change',e=>{const el=e.target.closest('[data-module-check]');if(!el)return;const d=moduleById(el.dataset.moduleCheck);if(!d)return;if(el.checked)LenaicModules.complete(d);else LenaicModules.undo(d);renderModules();renderNotifications()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-module-save]');if(!b)return;const d=moduleById(b.dataset.moduleSave),i=document.querySelector(`[data-module-value="${CSS.escape(b.dataset.moduleSave)}"]`);if(d&&i)LenaicModules.setValue(d,i.value);renderModules()});
LenaicModules.subscribe(renderModules);

/* ---------------------- CENTRE DE NOTIFICATIONS ---------------------- */
function savingsInfo(){
 const start=Date.UTC(2026,8,14),today=new Date(),t=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()),week=Math.floor((t-start)/604800000)+1,s=read('3615-savings52-v1',{completed:{}}),done=!!s.completed?.[String(week)];return{active:week>=1&&week<=52,week,amount:week,done};
}
function resolveDedupe(prefix,keep=new Set()){
 for(const n of LenaicNotifications.read())if(n.dedupeKey?.startsWith(prefix)&&!keep.has(n.dedupeKey)&&n.status!=='done')LenaicNotifications.done(n.id);
}
function syncDerivedNotifications(){
 const keepSavings=new Set(),sv=savingsInfo();if(sv.active&&!sv.done){const key=`savings52:${sv.week}`;keepSavings.add(key);LenaicNotifications.create({source:'3615',priority:'high',title:`Épargne · semaine ${sv.week}`,message:`${sv.amount} € à mettre de côté cette semaine.`,action:{label:'VOIR',command:'EPARGNE'},dedupeKey:key,reopen:true})}resolveDedupe('savings52:',keepSavings);
 const cap=read('lenaic-cap-snapshot-v1',{}),m=cap.measurements||{},keepCap=new Set();if(m.nextDueDate&&Number(m.daysUntil)<=1){const key=`cap-measure:${m.nextDueDate}`;keepCap.add(key);LenaicNotifications.create({source:'cap',priority:Number(m.daysUntil)<=0?'high':'normal',title:'Mensurations CAP',message:Number(m.daysUntil)<=0?'Mensurations à faire aujourd’hui.':'Mensurations prévues demain.',action:{label:'OUVRIR CAP',url:'/cap/'},dedupeKey:key,reopen:true})}resolveDedupe('cap-measure:',keepCap);
 const ss=read('lenaic-scribe-snapshot-v1',{}),threshold=Math.max(7,Number(config?.automations?.scribeReminderDays)||30),keepScribe=new Set();for(const r of ss.received||[]){const key=`scribe-response:${r.id}`;keepScribe.add(key);LenaicNotifications.create({source:'scribe',priority:'high',title:'Réponse d’archives reçue',message:`${r.contact||'Archives'} · ${r.title||'Réponse à traiter'}`,action:{label:'OUVRIR SCRIBE',url:`/aide_archive/Scribe-v3.html?draft=${encodeURIComponent(r.id)}`},dedupeKey:key})}for(const r of ss.pending||[]){if(Number(r.ageDays)<threshold)continue;const key=`scribe-overdue:${r.id}`;keepScribe.add(key);LenaicNotifications.create({source:'scribe',priority:'normal',title:'Relance Scribe à envisager',message:`${r.title||'Demande'} · ${r.ageDays} jours sans réponse.`,action:{label:'OUVRIR SCRIBE',url:`/aide_archive/Scribe-v3.html?draft=${encodeURIComponent(r.id)}`},dedupeKey:key,reopen:true})}resolveDedupe('scribe-response:',keepScribe);resolveDedupe('scribe-overdue:',keepScribe);
 syncModuleNotifications();
}
function syncModuleNotifications(){
 const keep=new Set();for(const d of moduleDefs().filter(x=>x.display?.notifications)){const r=LenaicModules.resolve(d);if(!r.active||r.done)continue;const key=`module:${d.id}:${r.periodKey}`;keep.add(key);LenaicNotifications.create({source:'nexus',priority:d.important?'high':'normal',title:d.label||'Rappel NEXUS',message:d.kind==='progressive'?`${unitLabel(d,r.currentValue)} à valider pour cette période.`:(d.description||'Action à effectuer.'),action:{label:'VOIR DANS 3615',command:'0'},dedupeKey:key,reopen:true})}resolveDedupe('module:',keep)
}
function notifAction(n){if(n.action?.url)return`<a href="${attr(n.action.url)}">${esc(n.action.label||'OUVRIR')}</a>`;if(n.action?.command)return`<button type="button" data-notif-command="${attr(n.action.command)}">${esc(n.action.label||'VOIR')}</button>`;return''}
function renderNotifications(){
 syncDerivedNotifications();const list=LenaicNotifications.list({active:true}),box=$('systemNotifications'),bell=$('notificationBell'),count=list.filter(n=>n.status==='new').length||list.length;
 if(bell){bell.innerHTML=`✉ <b>${count}</b>`;bell.classList.toggle('has-notifs',count>0);bell.title=`${count} notification${count>1?'s':''}`}
 if($('systemNotifState'))$('systemNotifState').textContent=list.length?`${list.length} ACTIVE${list.length>1?'S':''}`:'À JOUR';
 if(!box)return;if(!list.length){box.innerHTML='<div class="express-empty">Aucune action importante en attente.</div>';return}
 box.innerHTML=list.slice(0,30).map(n=>`<article class="notification-row priority-${esc(n.priority||'normal')}" data-notif-id="${attr(n.id)}"><div class="notification-dot"></div><div class="notification-copy"><span>${esc((n.source||'NEXUS').toUpperCase())}</span><strong>${esc(n.title)}</strong><small>${esc(n.message||'')} · ${esc(fmtDate(n.createdAt))}</small></div><div class="notification-actions">${notifAction(n)}<button type="button" data-notif-snooze="${attr(n.id)}">+24H</button><button type="button" data-notif-done="${attr(n.id)}">TRAITÉ</button></div></article>`).join('');
}
document.addEventListener('click',e=>{
 const bell=e.target.closest('#notificationBell');if(bell){e.preventDefault();document.querySelector('[data-section="systeme"]')?.click();setTimeout(()=>$('systemNotifications')?.scrollIntoView({behavior:'smooth',block:'center'}),120);return}
 const d=e.target.closest('[data-notif-done]');if(d){LenaicNotifications.done(d.dataset.notifDone);renderNotifications();return}
 const s=e.target.closest('[data-notif-snooze]');if(s){LenaicNotifications.snooze(s.dataset.notifSnooze,24);renderNotifications();return}
 const c=e.target.closest('[data-notif-command]');if(c){const input=$('commandInput'),form=$('commandForm');if(input&&form){input.value=c.dataset.notifCommand;form.requestSubmit()}LenaicNotifications.markRead(c.closest('[data-notif-id]')?.dataset.notifId);renderNotifications()}
});
LenaicNotifications.subscribe(renderNotifications);

function renderAll(){renderGenealogyContext();renderModules();renderNotifications()}
window.addEventListener('storage',e=>{if(['lenaic-nexus-published-v2','memoire-famille-data','scriptoria-data','pistoria_private_v3','ariane-local-v2','scribe-local-v3','lenaic-scribe-snapshot-v1','lenaic-cap-snapshot-v1','3615-savings52-v1'].includes(e.key))renderAll()});

renderAll();loadConfig();setInterval(()=>{renderGenealogyContext();renderNotifications()},15000);
})();
