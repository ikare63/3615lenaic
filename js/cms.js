(()=>{
'use strict';
const $=id=>document.getElementById(id);
const DB_NAME='lenaic-nexus-v1',STORE='snapshots',DB_VERSION=1;
const LAST_SWEEP_KEY='lenaic-nexus-last-sweep-v1';
const LAST_MANUAL_KEY='lenaic-nexus-last-manual-v1';
let registry=null,db=null,currentEditor=null,debounceTimers=new Map();

const fmtBytes=n=>{n=Number(n)||0;if(n<1024)return `${n} o`;if(n<1048576)return `${(n/1024).toFixed(1)} Ko`;return `${(n/1048576).toFixed(2)} Mo`};
const fmtDate=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function download(name,text,type='application/json'){const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function hash(raw){if(globalThis.crypto?.subtle){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function datasets(){return registry.apps.flatMap(app=>app.storage.map(s=>({...s,appId:app.id,appName:app.name,appUrl:app.url})))}
function byKey(key){return datasets().find(d=>d.key===key)||null}
function readRaw(key){try{return localStorage.getItem(key)}catch{return null}}
function prettyRaw(raw){if(raw==null)return'';try{return JSON.stringify(JSON.parse(raw),null,2)}catch{return raw}}
function parseForSave(text){const value=JSON.parse(text);return JSON.stringify(value)}

function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('key','key',{unique:false});s.createIndex('createdAt','createdAt',{unique:false})}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function allSnapshots(){return new Promise((resolve,reject)=>{const r=tx().getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
async function snapshotsForKey(key){return (await allSnapshots()).filter(x=>x.key===key).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
async function latestForKey(key){return (await snapshotsForKey(key))[0]||null}
function putSnapshot(row){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(row);r.onsuccess=()=>resolve(row);r.onerror=()=>reject(r.error)})}
function deleteSnapshot(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}

async function snapshotKey(key,reason='auto'){
 const def=byKey(key);if(!def)return false;
 const raw=readRaw(key);if(raw==null)return false;
 const h=await hash(raw);const latest=await latestForKey(key);if(latest?.hash===h)return false;
 const now=new Date().toISOString();await putSnapshot({id:`${key}::${Date.now()}::${Math.random().toString(36).slice(2,6)}`,key,appId:def.appId,label:def.label,createdAt:now,hash:h,bytes:new Blob([raw]).size,reason,raw});
 await enforceRetention(key);return true;
}
async function enforceRetention(key){const max=Number(registry.retentionPerDataset)||20;const rows=await snapshotsForKey(key);for(const x of rows.slice(max))await deleteSnapshot(x.id)}
async function sweep(reason='auto'){
 const now=Date.now();let changed=0;for(const d of datasets()){if(await snapshotKey(d.key,reason))changed++}
 localStorage.setItem(LAST_SWEEP_KEY,String(now));await refreshAll();if(reason==='manual')localStorage.setItem(LAST_MANUAL_KEY,String(now));toast(changed?`${changed} jeu${changed>1?'x':''} de données sauvegardé${changed>1?'s':''}`:'Aucun changement depuis la dernière sauvegarde');
}
function dueForSweep(){const last=Number(localStorage.getItem(LAST_SWEEP_KEY)||0),interval=(Number(registry.autoSnapshotHours)||3)*3600000;return !last||Date.now()-last>=interval}
async function maybeSweep(){if(dueForSweep())await sweep('3h')}
function scheduleChangedKey(key){if(!byKey(key))return;clearTimeout(debounceTimers.get(key));debounceTimers.set(key,setTimeout(async()=>{await snapshotKey(key,'change');await refreshAll()},30000))}

async function renderApps(){const snaps=await allSnapshots();$('appsGrid').innerHTML=registry.apps.filter(a=>a.id!=='system').map(app=>{const defs=app.storage;const present=defs.filter(d=>readRaw(d.key)!=null).length;const last=snaps.filter(s=>s.appId===app.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];const criticalMissing=defs.filter(d=>d.critical&&readRaw(d.key)==null).length;return `<article class="app-card"><div class="top"><h3>${safe(app.name)}</h3><span class="badge ${criticalMissing?'critical':''}">${criticalMissing?'À INITIALISER':present+'/'+defs.length+' DATA'}</span></div><div class="meta"><span>Dernier snapshot : ${fmtDate(last?.createdAt)}</span><span>${defs.map(d=>readRaw(d.key)!=null?'●':'○').join(' ')} ${present?'stockage détecté':'aucune donnée locale'}</span></div><div class="actions"><a href="${safe(app.url)}">OUVRIR →</a><button class="mini" data-appsnap="${safe(app.id)}">SNAPSHOT</button></div></article>`}).join('');document.querySelectorAll('[data-appsnap]').forEach(b=>b.onclick=async()=>{const app=registry.apps.find(a=>a.id===b.dataset.appsnap);let n=0;for(const d of app.storage)if(await snapshotKey(d.key,'manual-app'))n++;await refreshAll();toast(n?`${app.name} sauvegardé`:`${app.name} : aucun changement`)})}

async function renderDatasets(){const rows=await Promise.all(datasets().map(async d=>{const raw=readRaw(d.key),latest=await latestForKey(d.key);return{d,raw,latest}}));$('datasetList').innerHTML=rows.map(({d,raw,latest})=>`<div class="dataset-row ${raw==null?'empty':''}"><div class="dataset-main"><strong class="${d.critical?'critical':''}">${safe(d.appName)} · ${safe(d.label)}</strong><span>${safe(d.key)}</span></div><div class="dataset-meta">Snapshot : ${fmtDate(latest?.createdAt)}</div><div class="size">${raw==null?'ABSENT':fmtBytes(new Blob([raw]).size)}</div><div class="dataset-meta">${latest?`${latest.reason} · ${fmtBytes(latest.bytes)}`:'Aucun historique'}</div><div class="row-actions"><button class="mini" data-edit="${safe(d.key)}" ${raw==null?'disabled':''}>ÉDITER</button><button class="mini" data-snap="${safe(d.key)}" ${raw==null?'disabled':''}>SAUVER</button><button class="mini" data-history="${safe(d.key)}">HISTORIQUE</button></div></div>`).join('');
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));document.querySelectorAll('[data-snap]').forEach(b=>b.onclick=async()=>{const ok=await snapshotKey(b.dataset.snap,'manual');await refreshAll();toast(ok?'Snapshot enregistré':'Aucun changement')});document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.history));
}

async function renderMirrors(){let manifest={items:[],generatedAt:null};try{manifest=await fetch(`data/mirror/manifest.json?ts=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())}catch{}const map=new Map((manifest.items||[]).map(x=>[x.id,x]));$('mirrorStatus').textContent=manifest.generatedAt?fmtDate(manifest.generatedAt):'EN ATTENTE';$('mirrorList').innerHTML=registry.publicJson.map(item=>{const m=map.get(item.id);return `<div class="mirror-row"><div><strong>${safe(item.label)}</strong><div class="dataset-meta">${safe(item.url)}</div></div><div class="mirror-size">${m?.ok?fmtBytes(m.bytes):'—'}</div><div class="mirror-time ${m?.ok?'ok':'ko'}">${m?.ok?fmtDate(m.fetchedAt):(m?.error?'ERREUR':'PAS ENCORE SYNCHRONISÉ')}</div><div class="row-actions"><a class="mini" href="${safe(item.url)}" target="_blank">SOURCE</a><a class="mini" href="${safe(item.mirror)}" target="_blank">MIROIR</a></div></div>`}).join('')}

function readBus(){try{const a=JSON.parse(localStorage.getItem('lenaic-bus-v1')||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function renderBus(){const items=readBus().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('busList').innerHTML=items.length?items.slice(0,100).map(e=>`<div class="bus-row"><div><strong>${safe(e.type||'event')}</strong><small>${fmtDate(e.createdAt)}</small></div><code>${safe(JSON.stringify(e.payload||{}))}</code><div><strong>${safe(e.status||'pending')}</strong><small>${safe(e.source||'?')} → ${safe(e.target||'*')}</small></div></div>`).join(''):'<div class="notice">Aucun événement dans le bus.</div>';$('busStatusCount')?.remove()}

async function refreshStatus(){const all=await allSnapshots();$('vaultCount').textContent=`${all.length} SNAPSHOT${all.length>1?'S':''}`;const last=Number(localStorage.getItem(LAST_SWEEP_KEY)||0);$('lastSweep').textContent=last?fmtDate(last):'JAMAIS';$('autoStatus').textContent=`${registry.autoSnapshotHours} H`;}
async function refreshAll(){await Promise.all([renderApps(),renderDatasets(),renderMirrors(),refreshStatus()]);renderBus()}

function openEditor(key){const def=byKey(key),raw=readRaw(key);if(!def||raw==null)return;currentEditor={key,def};$('dialogKey').textContent=key;$('dialogTitle').textContent=`${def.appName} · ${def.label}`;$('jsonEditor').value=prettyRaw(raw);$('dialogNote').textContent='Validation stricte JSON. Un snapshot de sécurité est créé avant toute écriture.';$('jsonDialog').showModal()}
$('saveDatasetBtn').onclick=async()=>{if(!currentEditor)return;try{const compact=parseForSave($('jsonEditor').value);await snapshotKey(currentEditor.key,'before-edit');localStorage.setItem(currentEditor.key,compact);await snapshotKey(currentEditor.key,'cms-edit');$('jsonDialog').close();await refreshAll();toast('JSON validé et enregistré localement')}catch(e){$('dialogNote').textContent=`Erreur JSON : ${e.message}`;$('dialogNote').style.color='var(--bad)'}};
$('downloadDatasetBtn').onclick=()=>{if(!currentEditor)return;const raw=readRaw(currentEditor.key);download(`${currentEditor.key}-${new Date().toISOString().slice(0,10)}.json`,prettyRaw(raw))};

async function openHistory(key){const def=byKey(key),rows=await snapshotsForKey(key);$('historyTitle').textContent=`${def?.appName||''} · ${def?.label||key}`;$('historyList').innerHTML=rows.length?rows.map(r=>`<div class="history-item"><div><strong>${fmtDate(r.createdAt)}</strong><span>${safe(r.reason)} · ${fmtBytes(r.bytes)}</span></div><span>${safe(r.hash.slice(0,12))}</span><div class="row-actions"><button class="mini" type="button" data-restore="${safe(r.id)}">RESTAURER</button><button class="mini" type="button" data-downsnap="${safe(r.id)}">JSON</button></div></div>`).join(''):'<div class="notice">Aucun snapshot.</div>';$('historyDialog').showModal();document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.restore);if(!r)return;if(!confirm(`Restaurer ${def.label} au ${fmtDate(r.createdAt)} ?`))return;await snapshotKey(key,'before-restore');localStorage.setItem(key,r.raw);await snapshotKey(key,'restore');$('historyDialog').close();await refreshAll();toast('Snapshot restauré')});document.querySelectorAll('[data-downsnap]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.downsnap);download(`${key}-snapshot-${r.createdAt.slice(0,19).replaceAll(':','-')}.json`,prettyRaw(r.raw))})}

$('snapshotAllBtn').onclick=()=>sweep('manual');
$('cleanupBtn').onclick=async()=>{for(const d of datasets())await enforceRetention(d.key);await refreshAll();toast('Historique nettoyé')};
$('exportAllBtn').onclick=()=>{const payload={app:'3615 NEXUS',version:1,exportedAt:new Date().toISOString(),datasets:datasets().map(d=>({appId:d.appId,appName:d.appName,key:d.key,label:d.label,raw:readRaw(d.key)})).filter(x=>x.raw!=null)};download(`3615-nexus-sauvegarde-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2));localStorage.setItem(LAST_MANUAL_KEY,String(Date.now()));toast('Sauvegarde globale téléchargée')};
$('importAllInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(!Array.isArray(p.datasets))throw new Error('Format NEXUS invalide');if(!confirm(`Restaurer ${p.datasets.length} jeux de données depuis ce fichier ?`))return;await sweep('before-global-import');let n=0;for(const x of p.datasets){if(byKey(x.key)&&typeof x.raw==='string'){localStorage.setItem(x.key,x.raw);n++}}await sweep('global-import');toast(`${n} jeux de données restaurés`)}catch(err){toast(`Import impossible : ${err.message}`)}finally{e.target.value=''}};
$('refreshBusBtn').onclick=renderBus;$('purgeBusBtn').onclick=()=>{const a=readBus();const keep=a.filter(e=>e.status==='pending');localStorage.setItem('lenaic-bus-v1',JSON.stringify(keep));renderBus();toast(`${a.length-keep.length} événement(s) traité(s) supprimé(s)`)};

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${b.dataset.tab}`))});
window.addEventListener('storage',e=>{if(e.key)scheduleChangedKey(e.key);renderBus()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)maybeSweep()});
setInterval(()=>maybeSweep(),15*60*1000);

(async function init(){
 try{registry=await fetch('data/registry.json',{cache:'no-store'}).then(r=>r.json());db=await openDb();await refreshAll();await maybeSweep();}catch(e){console.error(e);toast('NEXUS n’a pas pu démarrer : '+e.message)}
})();
})();
