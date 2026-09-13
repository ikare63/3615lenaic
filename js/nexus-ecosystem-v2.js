/* 3615 NEXUS V5 — centre de notifications + modules/rappels génériques. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slug=s=>String(s||'module').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`module-${Date.now()}`;
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
let ready=false,editingId='';
function cms(){return window.NexusCMS}
function draft(){return cms()?.getDraft?.()||null}
function toast(s){cms()?.toast?.(s)}
function renderNotifications(){
 if(!window.LenaicNotifications)return;
 const all=LenaicNotifications.read(),active=LenaicNotifications.list({active:true});
 const fresh=active.filter(n=>n.status==='new').length;
 if($('notifSummary'))$('notifSummary').innerHTML=`<strong>${active.length}</strong><span>active${active.length>1?'s':''}</span><strong>${fresh}</strong><span>nouvelle${fresh>1?'s':''}</span><strong>${all.filter(n=>n.status==='snoozed').length}</strong><span>reportée${all.filter(n=>n.status==='snoozed').length>1?'s':''}</span>`;
 if($('dashNotifCount'))$('dashNotifCount').textContent=String(active.length);
 if($('dashNotifText'))$('dashNotifText').textContent=active.length?`${fresh} nouvelle${fresh>1?'s':''} · actions centralisées de tout l’écosystème`:'Aucune action importante en attente';
 const box=$('nexusNotifications');if(!box)return;
 if(!active.length){box.innerHTML='<div class="notice">Aucune notification active. Les applications peuvent publier ici leurs actions importantes.</div>';return}
 box.innerHTML=active.slice(0,80).map(n=>`<article class="nx-notif priority-${esc(n.priority||'normal')}" data-notif="${esc(n.id)}"><div class="nx-notif-source">${esc((n.source||'NEXUS').toUpperCase())}</div><div class="nx-notif-copy"><strong>${esc(n.title||'Notification')}</strong><p>${esc(n.message||'')}</p><small>${esc(fmt(n.createdAt))}${n.snoozeUntil?` · reportée jusqu’au ${esc(fmt(n.snoozeUntil))}`:''}</small></div><div class="nx-notif-actions">${n.action?.url?`<a class="mini" href="${esc(n.action.url)}">${esc(n.action.label||'OUVRIR')}</a>`:''}<button class="mini" data-nx-read="${esc(n.id)}">LU</button><button class="mini" data-nx-snooze="${esc(n.id)}">+24H</button><button class="mini good" data-nx-done="${esc(n.id)}">TRAITÉ</button></div></article>`).join('');
}
function moduleStatus(def){try{return window.LenaicModules?.resolve(def)||null}catch{return null}}
function moduleKindLabel(k){return({reminder:'RAPPEL',checkbox:'CASE À COCHER',progressive:'PROGRESSIF',counter:'COMPTEUR'})[k]||String(k||'RAPPEL').toUpperCase()}
function recurrenceLabel(r){return({once:'UNE FOIS',daily:'CHAQUE JOUR',weekly:'CHAQUE SEMAINE',monthly:'CHAQUE MOIS'})[r]||String(r||'UNE FOIS').toUpperCase()}
function renderModules(){
 const c=draft();if(!c)return;const mods=Array.isArray(c.modules)?c.modules:[];
 if($('dashModuleCount'))$('dashModuleCount').textContent=String(mods.filter(m=>m.visible!==false).length);
 if($('dashModuleText'))$('dashModuleText').textContent=mods.length?`${mods.length} module${mods.length>1?'s':''} administrable${mods.length>1?'s':''} depuis NEXUS`:'Aucun module générique créé';
 const box=$('nexusModules');if(!box)return;
 if(!mods.length){box.innerHTML='<div class="notice"><strong>Aucun module.</strong> Crée ici un rappel, une case à cocher, un compteur ou un objectif progressif. 3615 l’affichera sans modification de son code.</div>';return}
 box.innerHTML=mods.map((m,i)=>{const r=moduleStatus(m);const active=r?.active;const state=!m.visible?'MASQUÉ':active?(r.done?'VALIDÉ':'ACTIF'):'HORS PÉRIODE';const dest=[m.display?.home?'ACCUEIL':'',m.display?.today?'AUJOURD’HUI':'',m.display?.notifications?'NOTIFICATIONS':''].filter(Boolean).join(' · ')||'AUCUN';return `<article class="nx-module ${m.visible===false?'is-off':''}"><div class="nx-module-top"><div><span>${esc(m.code||'NEXUS.MODULE')}</span><h3>${esc(m.label||'Module')}</h3></div><strong class="nx-state ${r?.done?'done':''}">${esc(state)}</strong></div><p>${esc(m.description||'')}</p><div class="nx-module-meta"><span>${moduleKindLabel(m.kind)}</span><span>${recurrenceLabel(m.recurrence)}</span><span>DÈS ${esc(m.startDate||'AUJOURD’HUI')}</span>${m.occurrences?`<span>${esc(m.occurrences)} OCC.</span>`:''}</div>${m.kind==='progressive'?`<div class="nx-module-progress"><b>${Number(r?.completedValue||0).toLocaleString('fr-FR')} ${esc(m.unit||'')}</b><span>/ ${Number(m.target||0).toLocaleString('fr-FR')} ${esc(m.unit||'')}</span></div>`:''}<small>AFFICHAGE · ${esc(dest)}</small><div class="nx-module-actions"><button class="mini" data-module-edit="${esc(m.id)}">MODIFIER</button><button class="mini" data-module-toggle="${esc(m.id)}">${m.visible===false?'ACTIVER':'MASQUER'}</button><button class="mini" data-module-up="${esc(m.id)}" ${i===0?'disabled':''}>↑</button><button class="mini" data-module-down="${esc(m.id)}" ${i===mods.length-1?'disabled':''}>↓</button><button class="mini danger" data-module-delete="${esc(m.id)}">SUPPRIMER</button></div></article>`}).join('');
}
function setField(id,v){if($(id))$(id).value=v??''}
function setCheck(id,v){if($(id))$(id).checked=!!v}
function openModule(id=''){
 const c=draft();if(!c)return;editingId=id;const m=id?(c.modules||[]).find(x=>x.id===id):null;
 $('moduleDialogTitle').textContent=m?'Modifier le module':'Nouveau module';
 setField('moduleId',m?.id||'');setField('moduleLabel',m?.label||'');setField('moduleCode',m?.code||'');setField('moduleDescription',m?.description||'');setField('moduleKind',m?.kind||'reminder');setField('moduleStartDate',m?.startDate||new Date().toISOString().slice(0,10));setField('moduleRecurrence',m?.recurrence||'once');setField('moduleOccurrences',m?.occurrences||'');setField('moduleStartValue',m?.startValue??'');setField('moduleStepValue',m?.stepValue??'');setField('moduleTarget',m?.target??'');setField('moduleUnit',m?.unit||'');setField('moduleCheckLabel',m?.checkLabel||'FAIT');
 setCheck('moduleImportant',m?.important);setCheck('moduleShowDone',m?.showWhenDone);setCheck('moduleVisible',m?m.visible!==false:true);setCheck('moduleHome',m?.display?.home??true);setCheck('moduleToday',m?.display?.today??true);setCheck('moduleNotifications',m?.display?.notifications??true);
 toggleProgressiveFields();$('moduleDialog').showModal();
}
function toggleProgressiveFields(){const k=$('moduleKind')?.value;document.querySelectorAll('[data-progressive-field],[data-counter-field]').forEach(el=>{const show=(el.hasAttribute('data-progressive-field')&&k==='progressive')||(el.hasAttribute('data-counter-field')&&k==='counter');el.hidden=!show})}
function saveModule(e){
 e?.preventDefault();const label=$('moduleLabel').value.trim();if(!label){toast('Donne un nom au module');return}let id=editingId||slug($('moduleId').value||label);const c=draft();if(!editingId&&(c.modules||[]).some(x=>x.id===id))id+=`-${Date.now().toString().slice(-4)}`;
 const n={id,label,code:$('moduleCode').value.trim().toUpperCase()||'NEXUS.MODULE',description:$('moduleDescription').value.trim(),kind:$('moduleKind').value,startDate:$('moduleStartDate').value,recurrence:$('moduleRecurrence').value,occurrences:Math.max(0,Number($('moduleOccurrences').value)||0),startValue:Number($('moduleStartValue').value)||0,stepValue:Number($('moduleStepValue').value)||0,target:Number($('moduleTarget').value)||0,unit:$('moduleUnit').value.trim(),checkLabel:$('moduleCheckLabel').value.trim()||'FAIT',important:$('moduleImportant').checked,showWhenDone:$('moduleShowDone').checked,visible:$('moduleVisible').checked,display:{home:$('moduleHome').checked,today:$('moduleToday').checked,notifications:$('moduleNotifications').checked}};
 cms().mutate(conf=>{conf.modules=Array.isArray(conf.modules)?conf.modules:[];if(editingId){const i=conf.modules.findIndex(x=>x.id===editingId);if(i>=0)conf.modules[i]={...conf.modules[i],...n};else conf.modules.push(n)}else conf.modules.push(n)});$('moduleDialog').close();renderModules();toast('Module enregistré dans le brouillon');
}
function moveModule(id,delta){cms().mutate(c=>{const a=c.modules||[],i=a.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]});renderModules()}
function bind(){
 $('addModuleBtn')?.addEventListener('click',()=>openModule());$('moduleForm')?.addEventListener('submit',saveModule);$('moduleKind')?.addEventListener('change',toggleProgressiveFields);$('refreshNotificationsBtn')?.addEventListener('click',renderNotifications);$('clearDoneNotificationsBtn')?.addEventListener('click',()=>{const before=LenaicNotifications.read();LenaicNotifications.write(before.filter(n=>n.status!=='done'));renderNotifications();toast(`${before.filter(n=>n.status==='done').length} notification(s) traitée(s) supprimée(s)`)});
 document.addEventListener('click',e=>{
  const r=e.target.closest('[data-nx-read]');if(r){LenaicNotifications.markRead(r.dataset.nxRead);renderNotifications();return}
  const s=e.target.closest('[data-nx-snooze]');if(s){LenaicNotifications.snooze(s.dataset.nxSnooze,24);renderNotifications();return}
  const d=e.target.closest('[data-nx-done]');if(d){LenaicNotifications.done(d.dataset.nxDone);renderNotifications();return}
  const ed=e.target.closest('[data-module-edit]');if(ed){openModule(ed.dataset.moduleEdit);return}
  const tg=e.target.closest('[data-module-toggle]');if(tg){cms().mutate(c=>{const m=(c.modules||[]).find(x=>x.id===tg.dataset.moduleToggle);if(m)m.visible=m.visible===false});renderModules();return}
  const up=e.target.closest('[data-module-up]');if(up){moveModule(up.dataset.moduleUp,-1);return}
  const dn=e.target.closest('[data-module-down]');if(dn){moveModule(dn.dataset.moduleDown,1);return}
  const del=e.target.closest('[data-module-delete]');if(del){const m=(draft()?.modules||[]).find(x=>x.id===del.dataset.moduleDelete);if(m&&confirm(`Supprimer le module « ${m.label} » ? Son historique local restera dans le coffre tant que tu ne le supprimes pas.`)){cms().mutate(c=>c.modules=(c.modules||[]).filter(x=>x.id!==m.id));renderModules();toast('Module retiré du brouillon')}return}
 });
 window.addEventListener('nexuscmschange',()=>{renderModules();renderNotifications()});
 window.addEventListener('storage',e=>{if(['lenaic-notifications-v1','lenaic-modules-v1','lenaic-nexus-draft-v2','lenaic-nexus-published-v2'].includes(e.key)){renderNotifications();renderModules()}});
 LenaicNotifications?.subscribe?.(renderNotifications);LenaicModules?.subscribe?.(renderModules);
}
function init(){if(ready)return;const c=draft();if(!c||!window.LenaicNotifications||!window.LenaicModules)return;ready=true;bind();renderNotifications();renderModules()}
let tries=0;const timer=setInterval(()=>{init();if(ready||++tries>100)clearInterval(timer)},80);window.addEventListener('load',init);
})();
