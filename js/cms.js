(()=>{
'use strict';
const $=id=>document.getElementById(id);
const DB_NAME='lenaic-nexus-v1',STORE='snapshots',DB_VERSION=1;
const LAST_SWEEP_KEY='lenaic-nexus-last-sweep-v1';
const LAST_MANUAL_KEY='lenaic-nexus-last-manual-v1';
const PUBLISHED_KEY='lenaic-nexus-published-v2';
const DRAFT_KEY='lenaic-nexus-draft-v2';
const CONFIG_HISTORY_KEY='lenaic-nexus-config-history-v2';
let registry=null,defaultConfig=null,publishedConfig=null,draft=null,db=null,currentEditor=null;
let debounceTimers=new Map(),draftTimer=0,mirrorManifest={items:[],generatedAt:null};

const clone=x=>JSON.parse(JSON.stringify(x));
const fmtBytes=n=>{n=Number(n)||0;if(n<1024)return `${n} o`;if(n<1048576)return `${(n/1024).toFixed(1)} Ko`;return `${(n/1048576).toFixed(2)} Mo`};
const fmtDate=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const bool=v=>v!==false;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function download(name,text,type='application/json'){const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function readJson(key,fallback=null){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
function migrateConfig(base,old){
 if(!old)return clone(base);if(Number(old.version||0)>=Number(base.version||0))return old;
 const next=clone(base);if(old.site?.title)next.site.title=old.site.title;
 next.content={...clone(base.content),...(old.content||{}),greetings:{...clone(base.content?.greetings||{}),...(old.content?.greetings||{})}};
 next.automations={...clone(base.automations||{}),...(old.automations||{})};
 const oldApps=new Map((old.applications||[]).map(a=>[a.id,a]));next.applications=(base.applications||[]).map(a=>{const x=oldApps.get(a.id);if(!x)return clone(a);const keep={};for(const k of ['name','description','url','command','visible','version'])if(x[k]!==undefined)keep[k]=x[k];return {...clone(a),...keep,category:a.category,order:a.order}});
 const oldBlocks=new Map((old.homeBlocks||[]).map(b=>[b.id,b]));next.homeBlocks=(base.homeBlocks||[]).map(b=>oldBlocks.has(b.id)?{...clone(b),visible:oldBlocks.get(b.id).visible!==false}:clone(b));next.publishedAt=old.publishedAt||null;next.migratedAt=new Date().toISOString();return next;
}
async function hash(raw){if(globalThis.crypto?.subtle){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function dataDefs(){return registry.apps.flatMap(app=>app.storage.map(s=>({...s,appId:app.id,appName:app.name,appUrl:app.url})))}
function byKey(key){return dataDefs().find(d=>d.key===key)||null}
function registryApp(id){return registry.apps.find(a=>a.id===id)||null}
function readRaw(key){try{return localStorage.getItem(key)}catch{return null}}
function prettyRaw(raw){if(raw==null)return'';try{return JSON.stringify(JSON.parse(raw),null,2)}catch{return raw}}
function parseForSave(text){return JSON.stringify(JSON.parse(text))}
function canonicalConfig(c){const x=clone(c||{});delete x.publishedAt;delete x.draftSavedAt;return JSON.stringify(x)}
function isDirty(){return canonicalConfig(draft)!==canonicalConfig(publishedConfig)}
function automation(){return publishedConfig?.automations||defaultConfig?.automations||{autoSnapshotHours:3,retentionPerDataset:20,autoSnapshotOnChange:true,changeDelaySeconds:30,publicMirrorsEnabled:true}}
function renumber(items){items.forEach((x,i)=>x.order=(i+1)*10);return items}
function moveIn(items,index,delta){const ni=index+delta;if(index<0||ni<0||ni>=items.length)return;[items[index],items[ni]]=[items[ni],items[index]];renumber(items);scheduleDraftSave()}

function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('key','key',{unique:false});s.createIndex('createdAt','createdAt',{unique:false})}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function allSnapshots(){return new Promise((resolve,reject)=>{const r=tx().getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
async function snapshotsForKey(key){return (await allSnapshots()).filter(x=>x.key===key).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
async function latestForKey(key){return (await snapshotsForKey(key))[0]||null}
function putSnapshot(row){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(row);r.onsuccess=()=>resolve(row);r.onerror=()=>reject(r.error)})}
function deleteSnapshot(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
async function snapshotKey(key,reason='auto'){
 const def=byKey(key);if(!def)return false;const raw=readRaw(key);if(raw==null)return false;
 const h=await hash(raw),latest=await latestForKey(key);if(latest?.hash===h)return false;
 const now=new Date().toISOString();await putSnapshot({id:`${key}::${Date.now()}::${Math.random().toString(36).slice(2,6)}`,key,appId:def.appId,label:def.label,createdAt:now,hash:h,bytes:new Blob([raw]).size,reason,raw});await enforceRetention(key);return true;
}
async function enforceRetention(key){const max=Math.max(3,Number(automation().retentionPerDataset)||20),rows=await snapshotsForKey(key);for(const x of rows.slice(max))await deleteSnapshot(x.id)}
async function sweep(reason='auto'){
 let changed=0;for(const d of dataDefs())if(await snapshotKey(d.key,reason))changed++;
 localStorage.setItem(LAST_SWEEP_KEY,String(Date.now()));if(reason==='manual')localStorage.setItem(LAST_MANUAL_KEY,String(Date.now()));await refreshRuntime();toast(changed?`${changed} jeu${changed>1?'x':''} de données sauvegardé${changed>1?'s':''}`:'Aucun changement depuis la dernière sauvegarde');
}
function dueForSweep(){const last=Number(localStorage.getItem(LAST_SWEEP_KEY)||0),hours=Math.max(1,Number(automation().autoSnapshotHours)||3);return !last||Date.now()-last>=hours*3600000}
async function maybeSweep(){if(dueForSweep())await sweep('3h')}
function scheduleChangedKey(key){if(!automation().autoSnapshotOnChange||!byKey(key))return;clearTimeout(debounceTimers.get(key));const delay=Math.max(5,Number(automation().changeDelaySeconds)||30)*1000;debounceTimers.set(key,setTimeout(async()=>{await snapshotKey(key,'change');await refreshRuntime()},delay))}

function scheduleDraftSave(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{draft.draftSavedAt=new Date().toISOString();writeJson(DRAFT_KEY,draft);renderCmsState();},350)}
function saveDraft(manual=false){draft.draftSavedAt=new Date().toISOString();writeJson(DRAFT_KEY,draft);renderCmsState();if(manual)toast('Brouillon enregistré')}
function pushConfigHistory(config){const h=readJson(CONFIG_HISTORY_KEY,[]);h.unshift({createdAt:new Date().toISOString(),config:clone(config)});writeJson(CONFIG_HISTORY_KEY,h.slice(0,20))}
function publish(){
 pushConfigHistory(publishedConfig);draft.publishedAt=new Date().toISOString();delete draft.draftSavedAt;publishedConfig=clone(draft);writeJson(PUBLISHED_KEY,publishedConfig);draft=clone(publishedConfig);writeJson(DRAFT_KEY,draft);
 try{new BroadcastChannel('lenaic-nexus-config-v2').postMessage({type:'published',at:publishedConfig.publishedAt})}catch{}
 renderAllCms();toast('Configuration publiée dans 3615');
}
function renderCmsState(){
 const dirty=isDirty();$('cmsState').textContent=dirty?'BROUILLON MODIFIÉ':'PUBLIÉ';$('cmsState').className=dirty?'warn':'';$('lastPublish').textContent=fmtDate(publishedConfig?.publishedAt);
 $('dashPublishState').textContent=dirty?'MODIFICATIONS EN ATTENTE':'À JOUR';$('dashPublishText').textContent=dirty?'Le brouillon contient des changements qui ne sont pas encore appliqués à 3615.':'3615 utilise la dernière configuration publiée.';
}

async function renderDashboard(){
 const snaps=await allSnapshots(),apps=(draft.applications||[]).filter(a=>a.visible!==false),bus=readBus(),present=dataDefs().filter(d=>readRaw(d.key)!=null).length;
 $('dashAppsCount').textContent=String(apps.length);$('dashAppsText').textContent=`${(draft.applications||[]).length} applications enregistrées · ${apps.length} visibles dans 3615`;
 $('dashDataCount').textContent=`${present}/${dataDefs().length}`;$('dashDataText').textContent=`${snaps.length} snapshots conservés dans le coffre local`;
 const pending=bus.filter(e=>e.status==='pending').length;$('dashBusCount').textContent=String(pending);$('dashBusText').textContent=pending?`${pending} événement${pending>1?'s':''} en attente`:`${bus.length} événement${bus.length>1?'s':''} dans l’historique`;
 const recent=[...snaps].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8);$('recentChanges').innerHTML=recent.length?recent.map(r=>`<div class="recent-item"><div><strong>${safe(r.label||r.key)}</strong><small>${safe(registryApp(r.appId)?.name||r.appId)} · ${safe(r.reason)}</small></div><time>${fmtDate(r.createdAt)}</time></div>`).join(''):'<div class="notice">Aucun snapshot pour l’instant.</div>';
}

function storageStatusForApp(id){const ra=registryApp(id);if(!ra||!ra.storage?.length)return{present:0,total:0,last:null};const present=ra.storage.filter(x=>readRaw(x.key)!=null).length;return{present,total:ra.storage.length}}
function renderAppsCms(){
 const apps=[...(draft.applications||[])].sort((a,b)=>String(a.category).localeCompare(String(b.category))||(a.order||0)-(b.order||0));
 $('cmsApps').innerHTML=apps.map(a=>{const st=storageStatusForApp(a.id);const cat=(draft.categories||[]).find(c=>c.id===a.category);return `<article class="cms-app-card"><div class="app-top"><div><h3>${safe(a.name)}</h3><small>${safe(a.description||'')}</small></div><div class="app-badges"><span class="chip ${a.visible!==false?'on':''}">${a.visible!==false?'VISIBLE':'MASQUÉE'}</span><span class="chip">${safe(cat?.label||a.category||'SANS CAT.')}</span></div></div><div class="app-meta"><span>Commande : ${safe(a.command||'—')} · URL : ${safe(a.url||'—')}</span><span>${st.total?`${st.present}/${st.total} donnée${st.total>1?'s':''} détectée${st.present>1?'s':''}`:'Aucune donnée locale déclarée'}${a.version?` · version ${safe(a.version)}`:''}</span></div><div class="app-actions"><button class="mini" data-app-edit="${safe(a.id)}">MODIFIER</button><button class="mini" data-app-toggle="${safe(a.id)}">${a.visible!==false?'MASQUER':'AFFICHER'}</button><a class="mini" href="${safe(a.url)}">OUVRIR</a></div></article>`}).join('');
 document.querySelectorAll('[data-app-edit]').forEach(b=>b.onclick=()=>openAppDialog(b.dataset.appEdit));
 document.querySelectorAll('[data-app-toggle]').forEach(b=>b.onclick=()=>{const a=draft.applications.find(x=>x.id===b.dataset.appToggle);a.visible=!bool(a.visible);scheduleDraftSave();renderAppsCms();renderNavigation();renderCmsState()});
}
function openAppDialog(id=null){
 const existing=id?(draft.applications||[]).find(a=>a.id===id):null;$('appDialogTitle').textContent=existing?'Modifier l’application':'Ajouter une application';$('editAppId').value=existing?.id||'';$('editAppName').value=existing?.name||'';$('editAppSlug').value=existing?.id||'';$('editAppSlug').disabled=!!existing;$('editAppDesc').value=existing?.description||'';$('editAppUrl').value=existing?.url||'';$('editAppCommand').value=existing?.command||'';$('editAppVersion').value=existing?.version||'';$('editAppVisible').checked=existing?bool(existing.visible):true;fillCategorySelect(existing?.category);$('appDialog').showModal();
}
function fillCategorySelect(selected){$('editAppCategory').innerHTML=(draft.categories||[]).filter(c=>c.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0)).map(c=>`<option value="${safe(c.id)}" ${c.id===selected?'selected':''}>${safe(c.label)}</option>`).join('')}

function updateContentFromInputs(){draft.site.title=$('siteTitle').value;draft.site.subtitle=$('siteSubtitle').value;draft.content.officialMessage=$('officialMessage').value;draft.content.greetings.morning=$('greetMorning').value;draft.content.greetings.noon=$('greetNoon').value;draft.content.greetings.afternoon=$('greetAfternoon').value;draft.content.greetings.evening=$('greetEvening').value;scheduleDraftSave();renderCmsState()}
function renderContent(){
 $('siteTitle').value=draft.site?.title||'';$('siteSubtitle').value=draft.site?.subtitle||'';$('officialMessage').value=draft.content?.officialMessage||'';$('greetMorning').value=draft.content?.greetings?.morning||'';$('greetNoon').value=draft.content?.greetings?.noon||'';$('greetAfternoon').value=draft.content?.greetings?.afternoon||'';$('greetEvening').value=draft.content?.greetings?.evening||'';
 const blocks=[...(draft.homeBlocks||[])].sort((a,b)=>(a.order||0)-(b.order||0));$('homeBlocks').innerHTML=blocks.map((b,i)=>`<div class="sort-row"><span class="handle">${String(i+1).padStart(2,'0')}</span><div class="sort-main"><strong>${safe(b.label)}</strong><small>${safe(b.id)}</small></div><div class="sort-controls"><button class="mini" data-block-up="${safe(b.id)}">↑</button><button class="mini" data-block-down="${safe(b.id)}">↓</button></div><button class="mini ${b.visible===false?'':'on'}" data-block-toggle="${safe(b.id)}">${b.visible===false?'MASQUÉ':'VISIBLE'}</button></div>`).join('');
 document.querySelectorAll('[data-block-up]').forEach(x=>x.onclick=()=>{const arr=draft.homeBlocks.sort((a,b)=>(a.order||0)-(b.order||0)),i=arr.findIndex(b=>b.id===x.dataset.blockUp);moveIn(arr,i,-1);renderContent();renderCmsState()});
 document.querySelectorAll('[data-block-down]').forEach(x=>x.onclick=()=>{const arr=draft.homeBlocks.sort((a,b)=>(a.order||0)-(b.order||0)),i=arr.findIndex(b=>b.id===x.dataset.blockDown);moveIn(arr,i,1);renderContent();renderCmsState()});
 document.querySelectorAll('[data-block-toggle]').forEach(x=>x.onclick=()=>{const b=draft.homeBlocks.find(b=>b.id===x.dataset.blockToggle);b.visible=!bool(b.visible);scheduleDraftSave();renderContent();renderCmsState()});
}

function renderNavigation(){
 const cats=[...(draft.categories||[])].sort((a,b)=>(a.order||0)-(b.order||0));$('categoryList').innerHTML=cats.map((c,i)=>`<div class="sort-row"><span class="handle">${String(i+1).padStart(2,'0')}</span><div class="sort-main"><strong>${safe(c.label)}</strong><small>${safe(c.id)} · ${(draft.applications||[]).filter(a=>a.category===c.id).length} app(s)</small></div><div class="sort-controls"><button class="mini" data-cat-up="${safe(c.id)}">↑</button><button class="mini" data-cat-down="${safe(c.id)}">↓</button></div><div class="sort-controls"><button class="mini" data-cat-rename="${safe(c.id)}">RENOMMER</button><button class="mini" data-cat-toggle="${safe(c.id)}">${c.visible===false?'MASQUÉE':'VISIBLE'}</button></div></div>`).join('');
 document.querySelectorAll('[data-cat-up]').forEach(x=>x.onclick=()=>{const arr=draft.categories.sort((a,b)=>(a.order||0)-(b.order||0)),i=arr.findIndex(c=>c.id===x.dataset.catUp);moveIn(arr,i,-1);renderNavigation();renderCmsState()});
 document.querySelectorAll('[data-cat-down]').forEach(x=>x.onclick=()=>{const arr=draft.categories.sort((a,b)=>(a.order||0)-(b.order||0)),i=arr.findIndex(c=>c.id===x.dataset.catDown);moveIn(arr,i,1);renderNavigation();renderCmsState()});
 document.querySelectorAll('[data-cat-rename]').forEach(x=>x.onclick=()=>{const c=draft.categories.find(c=>c.id===x.dataset.catRename),n=prompt('Nouveau nom de catégorie',c.label);if(n?.trim()){c.label=n.trim();scheduleDraftSave();renderNavigation();renderAppsCms();renderCmsState()}});
 document.querySelectorAll('[data-cat-toggle]').forEach(x=>x.onclick=()=>{const c=draft.categories.find(c=>c.id===x.dataset.catToggle);c.visible=!bool(c.visible);scheduleDraftSave();renderNavigation();renderCmsState()});
 const visibleCats=cats.filter(c=>c.visible!==false);$('navPreview').innerHTML=visibleCats.map(c=>{const apps=(draft.applications||[]).filter(a=>a.category===c.id&&a.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));if(!apps.length)return'';return `<div class="preview-cat"><strong>${safe(c.label)}</strong>${apps.map(a=>`<div class="preview-link"><b>${safe(a.name)}</b><small>${safe(a.description||'')} · ${safe(a.command||'')}</small></div>`).join('')}</div>`}).join('')||'<div class="notice">Aucun service visible.</div>';
}

function updateAutomationFromInputs(){draft.automations.autoSnapshotHours=Math.max(1,Number($('autoHours').value)||3);draft.automations.retentionPerDataset=Math.max(3,Number($('retentionCount').value)||20);draft.automations.autoSnapshotOnChange=$('autoOnChange').checked;draft.automations.changeDelaySeconds=Math.max(5,Number($('changeDelay').value)||30);draft.automations.publicMirrorsEnabled=$('publicMirrors').checked;draft.site.showBusStatus=$('showBusStatus').checked;scheduleDraftSave();renderCmsState()}
function renderAutomation(){const a=draft.automations;$('autoHours').value=a.autoSnapshotHours;$('retentionCount').value=a.retentionPerDataset;$('autoOnChange').checked=bool(a.autoSnapshotOnChange);$('changeDelay').value=a.changeDelaySeconds;$('publicMirrors').checked=bool(a.publicMirrorsEnabled);$('showBusStatus').checked=bool(draft.site.showBusStatus);renderMirrors()}

async function renderDatasets(){
 const rows=await Promise.all(dataDefs().map(async d=>{const raw=readRaw(d.key),latest=await latestForKey(d.key);return{d,raw,latest}}));$('datasetList').innerHTML=rows.map(({d,raw,latest})=>`<div class="dataset-row ${raw==null?'empty':''}"><div class="dataset-main"><strong class="${d.critical?'critical':''}">${safe(d.appName)} · ${safe(d.label)}</strong><span>${safe(d.key)}</span></div><div class="dataset-meta">Snapshot : ${fmtDate(latest?.createdAt)}</div><div class="size">${raw==null?'ABSENT':fmtBytes(new Blob([raw]).size)}</div><div class="dataset-meta">${latest?`${safe(latest.reason)} · ${fmtBytes(latest.bytes)}`:'Aucun historique'}</div><div class="row-actions"><button class="mini" data-edit="${safe(d.key)}" ${raw==null?'disabled':''}>ÉDITER</button><button class="mini" data-snap="${safe(d.key)}" ${raw==null?'disabled':''}>SAUVER</button><button class="mini" data-history="${safe(d.key)}">HISTORIQUE</button></div></div>`).join('');
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));document.querySelectorAll('[data-snap]').forEach(b=>b.onclick=async()=>{await snapshotKey(b.dataset.snap,'manual');await refreshRuntime();toast('Snapshot enregistré')});document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.history));
}
async function renderMirrors(){
 try{mirrorManifest=await fetch(`data/mirror/manifest.json?ts=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())}catch{mirrorManifest={items:[],generatedAt:null}}
 const enabled=bool(draft?.automations?.publicMirrorsEnabled),map=new Map((mirrorManifest.items||[]).map(x=>[x.id,x]));$('mirrorStatus').textContent=enabled?(mirrorManifest.generatedAt?fmtDate(mirrorManifest.generatedAt):'EN ATTENTE'):'DÉSACTIVÉS';$('mirrorList').innerHTML=registry.publicJson.map(item=>{const m=map.get(item.id);return `<div class="mirror-row"><div><strong>${safe(item.label)}</strong><div class="dataset-meta">${safe(item.url)}</div></div><div class="mirror-size">${m?.ok?fmtBytes(m.bytes):'—'}</div><div class="mirror-time ${m?.ok?'ok':'ko'}">${enabled?(m?.ok?fmtDate(m.fetchedAt):(m?.error?'ERREUR':'PAS ENCORE SYNCHRONISÉ')):'DÉSACTIVÉ DANS LE CMS'}</div><div class="row-actions"><a class="mini" href="${safe(item.url)}" target="_blank">SOURCE</a><a class="mini" href="${safe(item.mirror)}" target="_blank">MIROIR</a></div></div>`}).join('')
}
function readBus(){try{const a=JSON.parse(localStorage.getItem('lenaic-bus-v1')||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function renderBus(){const items=readBus().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('busList').innerHTML=items.length?items.slice(0,100).map(e=>`<div class="bus-row"><div><strong>${safe(e.type||'event')}</strong><small>${fmtDate(e.createdAt)}</small></div><code>${safe(JSON.stringify(e.payload||{}))}</code><div><strong>${safe(e.status||'pending')}</strong><small>${safe(e.source||'?')} → ${safe(e.target||'*')}</small></div></div>`).join(''):'<div class="notice">Aucun événement dans le bus.</div>'}
async function refreshStatus(){const all=await allSnapshots();$('vaultCount').textContent=`${all.length} SNAPSHOT${all.length>1?'S':''}`;renderCmsState()}
async function refreshRuntime(){await Promise.all([renderDashboard(),renderDatasets(),renderMirrors(),refreshStatus()]);renderBus()}

function renderMaintenance(){$('versionList').innerHTML=(draft.applications||[]).map(a=>`<label class="version-row"><span>${safe(a.name)}</span><input data-version-app="${safe(a.id)}" value="${safe(a.version||'')}" placeholder="—"></label>`).join('');document.querySelectorAll('[data-version-app]').forEach(i=>i.oninput=()=>{const a=draft.applications.find(a=>a.id===i.dataset.versionApp);a.version=i.value;scheduleDraftSave();renderCmsState()})}
function renderAllCms(){renderCmsState();renderAppsCms();renderContent();renderNavigation();renderAutomation();renderMaintenance();renderDashboard();refreshStatus()}

function openEditor(key){const def=byKey(key),raw=readRaw(key);if(!def||raw==null)return;currentEditor={key,def};$('dialogKey').textContent=key;$('dialogTitle').textContent=`${def.appName} · ${def.label}`;$('jsonEditor').value=prettyRaw(raw);$('dialogNote').textContent='Validation stricte JSON. Un snapshot de sécurité est créé avant toute écriture.';$('dialogNote').style.color='';$('jsonDialog').showModal()}
async function openHistory(key){const def=byKey(key),rows=await snapshotsForKey(key);$('historyTitle').textContent=`${def?.appName||''} · ${def?.label||key}`;$('historyList').innerHTML=rows.length?rows.map(r=>`<div class="history-item"><div><strong>${fmtDate(r.createdAt)}</strong><span>${safe(r.reason)} · ${fmtBytes(r.bytes)}</span></div><span>${safe(r.hash.slice(0,12))}</span><div class="row-actions"><button class="mini" type="button" data-restore="${safe(r.id)}">RESTAURER</button><button class="mini" type="button" data-downsnap="${safe(r.id)}">JSON</button></div></div>`).join(''):'<div class="notice">Aucun snapshot.</div>';$('historyDialog').showModal();document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.restore);if(!r)return;if(!confirm(`Restaurer ${def.label} au ${fmtDate(r.createdAt)} ?`))return;await snapshotKey(key,'before-restore');localStorage.setItem(key,r.raw);await snapshotKey(key,'restore');$('historyDialog').close();await refreshRuntime();toast('Snapshot restauré')});document.querySelectorAll('[data-downsnap]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.downsnap);download(`${key}-snapshot-${r.createdAt.slice(0,19).replaceAll(':','-')}.json`,prettyRaw(r.raw))})}
function exportAll(){const payload={app:'3615 NEXUS',version:2,exportedAt:new Date().toISOString(),datasets:dataDefs().map(d=>({appId:d.appId,appName:d.appName,key:d.key,label:d.label,raw:readRaw(d.key)})).filter(x=>x.raw!=null),cmsConfig:publishedConfig};download(`3615-nexus-sauvegarde-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2));localStorage.setItem(LAST_MANUAL_KEY,String(Date.now()));toast('Sauvegarde globale téléchargée')}

function bind(){
 document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>showTab(b.dataset.jump));
 $('saveDraftBtn').onclick=()=>saveDraft(true);$('publishBtn').onclick=publish;$('dashPublishBtn').onclick=publish;
 $('snapshotAllBtn').onclick=()=>sweep('manual');$('snapshotAllBtn2').onclick=()=>sweep('manual');$('exportAllBtn').onclick=exportAll;$('exportAllBtn2').onclick=exportAll;$('refreshRecentBtn').onclick=renderDashboard;
 ['siteTitle','siteSubtitle','officialMessage','greetMorning','greetNoon','greetAfternoon','greetEvening'].forEach(id=>$(id).addEventListener('input',updateContentFromInputs));
 ['autoHours','retentionCount','autoOnChange','changeDelay','publicMirrors','showBusStatus'].forEach(id=>$(id).addEventListener('change',updateAutomationFromInputs));
 $('addAppBtn').onclick=()=>openAppDialog();$('addCategoryBtn').onclick=()=>{const label=prompt('Nom de la nouvelle catégorie');if(!label?.trim())return;let id=label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`cat-${Date.now()}`;if(draft.categories.some(c=>c.id===id))id+=`-${Date.now().toString().slice(-4)}`;draft.categories.push({id,label:label.trim(),order:(draft.categories.length+1)*10,visible:true});scheduleDraftSave();renderNavigation();renderAppsCms();renderCmsState()};
 $('appForm').onsubmit=e=>{e.preventDefault();const existingId=$('editAppId').value,id=(existingId||$('editAppSlug').value.trim().toLowerCase());if(!id)return;const data={id,name:$('editAppName').value.trim(),description:$('editAppDesc').value.trim(),url:$('editAppUrl').value.trim(),command:$('editAppCommand').value.trim().toUpperCase(),category:$('editAppCategory').value,version:$('editAppVersion').value.trim(),visible:$('editAppVisible').checked};if(existingId){const i=draft.applications.findIndex(a=>a.id===existingId);data.order=draft.applications[i]?.order||10;draft.applications[i]={...draft.applications[i],...data}}else{if(draft.applications.some(a=>a.id===id)){toast('Cet identifiant existe déjà');return}data.order=(draft.applications.filter(a=>a.category===data.category).length+1)*10;draft.applications.push(data)}scheduleDraftSave();$('appDialog').close();renderAppsCms();renderNavigation();renderMaintenance();renderCmsState()};
 $('saveDatasetBtn').onclick=async()=>{if(!currentEditor)return;try{const compact=parseForSave($('jsonEditor').value);await snapshotKey(currentEditor.key,'before-edit');localStorage.setItem(currentEditor.key,compact);await snapshotKey(currentEditor.key,'cms-edit');$('jsonDialog').close();await refreshRuntime();toast('JSON validé et enregistré localement')}catch(e){$('dialogNote').textContent=`Erreur JSON : ${e.message}`;$('dialogNote').style.color='var(--bad)'}};
 $('downloadDatasetBtn').onclick=()=>{if(!currentEditor)return;download(`${currentEditor.key}-${new Date().toISOString().slice(0,10)}.json`,prettyRaw(readRaw(currentEditor.key)))};
 $('cleanupBtn').onclick=async()=>{for(const d of dataDefs())await enforceRetention(d.key);await refreshRuntime();toast('Historique nettoyé')};
 $('importAllInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(!Array.isArray(p.datasets))throw new Error('Format NEXUS invalide');if(!confirm(`Restaurer ${p.datasets.length} jeux de données depuis ce fichier ?`))return;await sweep('before-global-import');let n=0;for(const x of p.datasets){if(byKey(x.key)&&typeof x.raw==='string'){localStorage.setItem(x.key,x.raw);n++}}await sweep('global-import');toast(`${n} jeux de données restaurés`)}catch(err){toast(`Import impossible : ${err.message}`)}finally{e.target.value=''}};
 $('refreshBusBtn').onclick=renderBus;$('purgeBusBtn').onclick=()=>{const a=readBus(),keep=a.filter(e=>e.status==='pending');localStorage.setItem('lenaic-bus-v1',JSON.stringify(keep));renderBus();renderDashboard();toast(`${a.length-keep.length} événement(s) traité(s) supprimé(s)`)};
 $('exportConfigBtn').onclick=()=>download(`nexus-config-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(draft,null,2));
 $('importConfigInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const c=JSON.parse(await f.text());if(Number(c.version)<2||!Array.isArray(c.applications)||!Array.isArray(c.homeBlocks))throw new Error('Ce fichier n’est pas une configuration NEXUS compatible');draft=c;saveDraft();renderAllCms();toast('Configuration importée dans le brouillon')}catch(err){toast(err.message)}finally{e.target.value=''}};
 $('revertPublishedBtn').onclick=()=>{if(isDirty()&&!confirm('Abandonner les modifications du brouillon ?'))return;draft=clone(publishedConfig);writeJson(DRAFT_KEY,draft);renderAllCms();toast('Brouillon rechargé depuis la version publiée')};
 $('resetConfigBtn').onclick=()=>{if(!confirm('Réinitialiser le CMS à sa configuration par défaut ? Les données des applications ne seront pas supprimées.'))return;localStorage.removeItem(PUBLISHED_KEY);localStorage.removeItem(DRAFT_KEY);publishedConfig=clone(defaultConfig);draft=clone(defaultConfig);renderAllCms();toast('Configuration CMS réinitialisée')};
 window.addEventListener('storage',e=>{if(e.key)scheduleChangedKey(e.key);if(e.key==='lenaic-bus-v1'){renderBus();renderDashboard()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden)maybeSweep()});setInterval(()=>maybeSweep(),15*60*1000);
}
function showTab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${id}`));window.scrollTo({top:0,behavior:'smooth'})}

(async function init(){
 try{
  [registry,defaultConfig]=await Promise.all([fetch('data/registry.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/nexus-config.json',{cache:'no-store'}).then(r=>r.json())]);
  db=await openDb();publishedConfig=migrateConfig(defaultConfig,readJson(PUBLISHED_KEY,null));draft=migrateConfig(defaultConfig,readJson(DRAFT_KEY,null)||publishedConfig);
  if(Number(readJson(PUBLISHED_KEY,{}).version||0)<Number(defaultConfig.version||0)){writeJson(PUBLISHED_KEY,publishedConfig);writeJson(DRAFT_KEY,draft)}
  // Migration douce si une future config par défaut introduit des champs.
  draft.site={...clone(defaultConfig.site),...(draft.site||{})};draft.content={...clone(defaultConfig.content),...(draft.content||{}),greetings:{...clone(defaultConfig.content.greetings),...(draft.content?.greetings||{})}};draft.automations={...clone(defaultConfig.automations),...(draft.automations||{})};
  bind();renderAllCms();await refreshRuntime();await maybeSweep();
 }catch(e){console.error(e);toast('NEXUS n’a pas pu démarrer : '+e.message)}
})();
})();
