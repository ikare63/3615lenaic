(function(){
  'use strict';

  const canvas=document.getElementById('miniGameCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  const $=id=>document.getElementById(id);
  const tabs=[...document.querySelectorAll('[data-mini-game]')];
  const controls=[...document.querySelectorAll('[data-control]')];
  const names={snake:'SNAKE',pong:'PONG',breakout:'CASSE-BRIQUES',run:'MINITEL RUN'};
  const helps={
    snake:'Flèches ou pavé tactile · mange les carrés sans toucher les murs.',
    pong:'↑ / ↓ ou pavé tactile · premier à 5 contre le terminal.',
    breakout:'← / → ou pavé tactile · détruis toutes les briques, 3 vies.',
    run:'Choisis un niveau · ◀ ▶ pour avancer · SAUT pour bondir sur les BUGS.'
  };
  const BEST_KEY='3615-mini-games-best-v1';
  const RUN_KEY='3615-minitel-run-progress-v1';
  let best={snake:0,pong:0,breakout:0};
  try{best={...best,...JSON.parse(localStorage.getItem(BEST_KEY)||'{}')}}catch(e){}
  let runProgress={unlocked:1,stars:{},bestScore:{}};
  try{runProgress={...runProgress,...JSON.parse(localStorage.getItem(RUN_KEY)||'{}')}}catch(e){}
  runProgress.unlocked=Math.max(1,Math.min(8,Number(runProgress.unlocked)||1));

  let game='snake',running=false,last=0,raf=0,score=0;
  let snake,pong,breakout,runner=null,currentRunLevel=null;
  const keys={up:false,down:false,left:false,right:false,jump:false};
  let jumpQueued=false;

  function css(name,fallback){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback}
  function colors(){return {bg:'#010608',grid:'#0d292c',ink:css('--ink','#7fffd4'),soft:css('--ink-soft','#6da3a5'),green:css('--green','#98ff98'),cyan:css('--cyan','#66e4ff'),amber:css('--amber','#ffd166'),magenta:css('--magenta','#ff86e5'),red:css('--red','#ff7a7a')}}
  function saveBest(){localStorage.setItem(BEST_KEY,JSON.stringify(best))}
  function saveRun(){localStorage.setItem(RUN_KEY,JSON.stringify(runProgress))}
  function setScore(v){score=Math.max(0,Math.round(v));$('miniGameScore').textContent=String(score)}
  function setHudLabel(text){const el=$('miniGameMetaLabel');if(el)el.textContent=text}
  function setBest(){
    if(game==='run'){
      setHudLabel(currentRunLevel?'NIVEAU':'OUVERTS');
      $('miniGameBest').textContent=currentRunLevel?RUN_LEVELS[currentRunLevel-1].id:`${runProgress.unlocked}/8`;
    }else{
      setHudLabel('RECORD');
      $('miniGameBest').textContent=String(best[game]||0);
    }
  }
  function overlay(title,text,show=true){$('miniGameOverlayTitle').textContent=title;$('miniGameOverlayText').textContent=text;$('miniGameOverlay').hidden=!show}
  function updateRecord(value=score){if(game==='run')return;if(value>(best[game]||0)){best[game]=value;saveBest()}setBest()}
  function clear(){const c=colors();ctx.fillStyle=c.bg;ctx.fillRect(0,0,W,H)}
  function grid(step=20){const c=colors();ctx.strokeStyle=c.grid;ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=W;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=0;y<=H;y+=step){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke()}

  // ---------------- SNAKE ----------------
  function initSnake(){
    snake={cols:30,rows:18,body:[{x:8,y:9},{x:7,y:9},{x:6,y:9}],dir:{x:1,y:0},next:{x:1,y:0},food:{x:19,y:9},acc:0,step:115};
    placeFood();setScore(0);drawSnake();
  }
  function placeFood(){let p;do{p={x:Math.floor(Math.random()*snake.cols),y:Math.floor(Math.random()*snake.rows)}}while(snake.body.some(b=>b.x===p.x&&b.y===p.y));snake.food=p}
  function snakeInput(dir){const d={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[dir];if(!d)return;if(d.x===-snake.dir.x&&d.y===-snake.dir.y)return;snake.next=d}
  function updateSnake(dt){snake.acc+=dt;if(snake.acc<snake.step)return;snake.acc=0;snake.dir=snake.next;const h=snake.body[0],n={x:h.x+snake.dir.x,y:h.y+snake.dir.y};if(n.x<0||n.y<0||n.x>=snake.cols||n.y>=snake.rows||snake.body.some(b=>b.x===n.x&&b.y===n.y)){endGame('PERDU','Le serpent a rencontré un obstacle.');return}snake.body.unshift(n);if(n.x===snake.food.x&&n.y===snake.food.y){setScore(score+10);updateRecord();snake.step=Math.max(62,snake.step-2);placeFood()}else snake.body.pop()}
  function drawSnake(){clear();grid(20);const c=colors(),cw=W/snake.cols,ch=H/snake.rows;ctx.fillStyle=c.amber;ctx.fillRect(snake.food.x*cw+5,snake.food.y*ch+5,cw-10,ch-10);snake.body.forEach((b,i)=>{ctx.fillStyle=i?c.green:c.cyan;ctx.fillRect(b.x*cw+2,b.y*ch+2,cw-4,ch-4)})}

  // ---------------- PONG ----------------
  function initPong(){pong={py:H/2-38,cpu:H/2-38,pw:11,ph:76,bx:W/2,by:H/2,bvx:245*(Math.random()<.5?-1:1),bvy:(Math.random()*150-75)||80,r:7,me:0,cpuScore:0};setScore(0);drawPong()}
  function updatePong(dt){const s=dt/1000,speed=265;if(keys.up)pong.py-=speed*s;if(keys.down)pong.py+=speed*s;pong.py=Math.max(0,Math.min(H-pong.ph,pong.py));const target=pong.by-pong.ph/2,delta=target-pong.cpu,max=190*s;pong.cpu+=Math.max(-max,Math.min(max,delta));pong.cpu=Math.max(0,Math.min(H-pong.ph,pong.cpu));pong.bx+=pong.bvx*s;pong.by+=pong.bvy*s;if(pong.by<pong.r){pong.by=pong.r;pong.bvy=Math.abs(pong.bvy)}if(pong.by>H-pong.r){pong.by=H-pong.r;pong.bvy=-Math.abs(pong.bvy)}const lp=22,rp=W-22-pong.pw;if(pong.bvx<0&&pong.bx-pong.r<=lp+pong.pw&&pong.bx>lp&&pong.by>=pong.py&&pong.by<=pong.py+pong.ph){pong.bx=lp+pong.pw+pong.r;pong.bvx=Math.abs(pong.bvx)*1.035;pong.bvy+=(pong.by-(pong.py+pong.ph/2))*4}if(pong.bvx>0&&pong.bx+pong.r>=rp&&pong.bx<rp+pong.pw&&pong.by>=pong.cpu&&pong.by<=pong.cpu+pong.ph){pong.bx=rp-pong.r;pong.bvx=-Math.abs(pong.bvx)*1.025;pong.bvy+=(pong.by-(pong.cpu+pong.ph/2))*3.4}if(pong.bx<-20){pong.cpuScore++;pongServe(1)}else if(pong.bx>W+20){pong.me++;setScore(pong.me);updateRecord(pong.me);pongServe(-1)}if(pong.me>=5){endGame('VICTOIRE','5 points. Le terminal est humilié.')}else if(pong.cpuScore>=5){endGame('PERDU','Le terminal gagne cette manche.')}}
  function pongServe(dir){pong.bx=W/2;pong.by=H/2;pong.bvx=235*dir;pong.bvy=(Math.random()*160-80)||70}
  function drawPong(){clear();const c=colors();ctx.strokeStyle=c.grid;ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c.green;ctx.fillRect(22,pong.py,pong.pw,pong.ph);ctx.fillStyle=c.magenta;ctx.fillRect(W-22-pong.pw,pong.cpu,pong.pw,pong.ph);ctx.fillStyle=c.cyan;ctx.beginPath();ctx.arc(pong.bx,pong.by,pong.r,0,Math.PI*2);ctx.fill();ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.fillStyle=c.ink;ctx.fillText(`${pong.me}   ${pong.cpuScore}`,W/2,38);ctx.textAlign='start'}

  // ---------------- CASSE-BRIQUES ----------------
  function initBreakout(){const rows=5,cols=9,pad=7,top=48,left=28,bw=(W-left*2-pad*(cols-1))/cols,bh=20;const bricks=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)bricks.push({x:left+c*(bw+pad),y:top+r*(bh+pad),w:bw,h:bh,alive:true,row:r});breakout={px:W/2-52,pw:104,ph:12,bx:W/2,by:H-62,bvx:185,bvy:-205,r:6,lives:3,bricks};setScore(0);drawBreakout()}
  function updateBreakout(dt){const s=dt/1000,speed=330;if(keys.left)breakout.px-=speed*s;if(keys.right)breakout.px+=speed*s;breakout.px=Math.max(0,Math.min(W-breakout.pw,breakout.px));breakout.bx+=breakout.bvx*s;breakout.by+=breakout.bvy*s;if(breakout.bx<breakout.r){breakout.bx=breakout.r;breakout.bvx=Math.abs(breakout.bvx)}if(breakout.bx>W-breakout.r){breakout.bx=W-breakout.r;breakout.bvx=-Math.abs(breakout.bvx)}if(breakout.by<breakout.r){breakout.by=breakout.r;breakout.bvy=Math.abs(breakout.bvy)}const py=H-26;if(breakout.bvy>0&&breakout.by+breakout.r>=py&&breakout.by-breakout.r<=py+breakout.ph&&breakout.bx>=breakout.px&&breakout.bx<=breakout.px+breakout.pw){breakout.by=py-breakout.r;breakout.bvy=-Math.abs(breakout.bvy);breakout.bvx+=(breakout.bx-(breakout.px+breakout.pw/2))*3.2}for(const b of breakout.bricks){if(!b.alive)continue;if(breakout.bx+breakout.r>b.x&&breakout.bx-breakout.r<b.x+b.w&&breakout.by+breakout.r>b.y&&breakout.by-breakout.r<b.y+b.h){b.alive=false;breakout.bvy*=-1;setScore(score+10);updateRecord();break}}if(breakout.bricks.every(b=>!b.alive)){endGame('VICTOIRE','Toutes les briques sont tombées.');return}if(breakout.by>H+15){breakout.lives--;if(breakout.lives<=0){endGame('PERDU','Plus de vies.')}else{breakout.bx=W/2;breakout.by=H-62;breakout.bvx=185*(Math.random()<.5?-1:1);breakout.bvy=-205}}}
  function drawBreakout(){clear();const c=colors(),palette=[c.magenta,c.amber,c.cyan,c.green,c.ink];breakout.bricks.forEach(b=>{if(b.alive){ctx.fillStyle=palette[b.row%palette.length];ctx.fillRect(b.x,b.y,b.w,b.h)}});ctx.fillStyle=c.green;ctx.fillRect(breakout.px,H-26,breakout.pw,breakout.ph);ctx.fillStyle=c.cyan;ctx.beginPath();ctx.arc(breakout.bx,breakout.by,breakout.r,0,Math.PI*2);ctx.fill();ctx.font='bold 14px monospace';ctx.fillStyle=c.ink;ctx.fillText(`VIES ${'●'.repeat(breakout.lives)}${'○'.repeat(3-breakout.lives)}`,14,23)}

  // ---------------- MINITEL RUN ----------------
  const GY=315;
  const g=(x,w)=>({x,y:GY,w,h:45});
  const p=(x,y,w=120,h=16)=>({x,y,w,h});
  const b=(x,y,bonus=false)=>({x,y,w:30,h:30,bonus,hit:false});
  const c=(x,y)=>({x,y,r:6,taken:false});
  const e=(x,y,min,max,type='bug')=>({x,y,w:type==='boss'?46:24,h:type==='boss'?38:22,min,max,dir:-1,speed:type==='boss'?72:58,type,alive:true,hp:type==='boss'?3:1});
  const mover=(x,y,w,axis,range,speed)=>({x,y,w,h:14,baseX:x,baseY:y,axis,range,speed,phase:Math.random()*Math.PI*2});
  function lineCoins(x,y,count,step=30){return Array.from({length:count},(_,i)=>c(x+i*step,y))}
  const RUN_LEVELS=[
    {id:'1-1',name:'PREMIÈRE CONNEXION',w:1850,start:{x:70,y:250},ground:[g(0,620),g(710,500),g(1300,550)],plats:[p(260,240,120),p(470,205,100),p(860,245,120),p(1080,205,100),p(1410,245,120)],blocks:[b(360,185,true),b(1010,175),b(1510,195,true)],coins:[...lineCoins(280,210,3),...lineCoins(760,270,5),...lineCoins(880,215,3),...lineCoins(1330,270,5),...lineCoins(1440,215,3)],enemies:[e(520,293,430,590),e(930,293,820,1120),e(1480,293,1370,1650)],movers:[],goal:1760},
    {id:'1-2',name:'PAQUETS PERDUS',w:2050,start:{x:60,y:250},ground:[g(0,430),g(540,360),g(1010,390),g(1530,520)],plats:[p(360,240,90),p(470,205,75),p(830,235,100),p(930,195,80),p(1320,240,100),p(1430,200,80),p(1670,235,120)],blocks:[b(650,210),b(1160,210,true),b(1780,185)],coins:[...lineCoins(370,210,3),...lineCoins(570,270,4),...lineCoins(840,205,3),...lineCoins(1050,270,4),...lineCoins(1335,210,3),...lineCoins(1570,270,4),...lineCoins(1690,205,3)],enemies:[e(250,293,160,390),e(720,293,590,860),e(1180,293,1080,1360),e(1750,293,1600,1930)],movers:[],goal:1970},
    {id:'1-3',name:'LIGNES MOBILES',w:2150,start:{x:60,y:250},ground:[g(0,360),g(760,390),g(1550,600)],plats:[p(250,225,90),p(870,220,100),p(1050,175,90),p(1660,225,110),p(1880,190,90)],blocks:[b(960,185,true),b(1730,175)],coins:[...lineCoins(270,195,3),...lineCoins(790,270,4),...lineCoins(885,190,3),...lineCoins(1580,270,5),...lineCoins(1680,195,3),...lineCoins(1900,160,3)],enemies:[e(180,293,110,330),e(900,293,810,1100),e(1730,293,1610,1900)],movers:[mover(420,250,90,'x',150,1.5),mover(610,205,90,'y',70,1.8),mover(1240,235,95,'x',150,1.7),mover(1420,195,90,'y',65,2.0)],goal:2070},
    {id:'1-4',name:'TOUR DU RÉSEAU',w:2000,start:{x:60,y:250},ground:[g(0,520),g(1480,520)],plats:[p(420,250,100),p(570,215,100),p(720,180,100),p(870,145,100),p(1020,180,100),p(1170,215,100),p(1320,250,100),p(1580,235,100),p(1760,195,100)],blocks:[b(745,140,true),b(1200,175),b(1795,155,true)],coins:[...lineCoins(440,220,3),...lineCoins(590,185,3),...lineCoins(740,150,3),...lineCoins(890,115,3),...lineCoins(1040,150,3),...lineCoins(1190,185,3),...lineCoins(1340,220,3),...lineCoins(1510,270,4)],enemies:[e(250,293,120,460),e(1620,293,1530,1900)],movers:[mover(1000,260,80,'y',90,1.5)],goal:1910},
    {id:'2-1',name:'SURCHARGE',w:2250,start:{x:60,y:250},ground:[g(0,520),g(600,430),g(1110,340),g(1530,720)],plats:[p(320,235,110),p(690,210,100),p(940,245,90),p(1220,205,100),p(1450,245,90),p(1700,210,110),p(1940,175,100)],blocks:[b(370,195,true),b(760,170),b(1260,165,true),b(1990,135)],coins:[...lineCoins(120,270,5),...lineCoins(335,205,3),...lineCoins(630,270,5),...lineCoins(700,180,3),...lineCoins(1140,270,4),...lineCoins(1230,175,3),...lineCoins(1570,270,5),...lineCoins(1710,180,3),...lineCoins(1950,145,3)],enemies:[e(220,293,120,470),e(710,293,640,980),e(1230,293,1140,1400),e(1660,293,1570,1850),e(2050,293,1900,2170)],movers:[],goal:2160},
    {id:'2-2',name:'ROUTE SECRÈTE',w:2350,start:{x:60,y:250},ground:[g(0,480),g(580,500),g(1210,440),g(1770,580)],plats:[p(270,245,100),p(460,200,90),p(650,235,100),p(820,190,100),p(990,145,100),p(1280,235,100),p(1450,190,100),p(1620,145,100),p(1890,225,100),p(2070,180,100)],blocks:[b(500,160,true),b(1030,105,true),b(1490,150),b(2110,140,true)],coins:[...lineCoins(290,215,3),...lineCoins(480,170,3),...lineCoins(670,205,3),...lineCoins(840,160,3),...lineCoins(1010,115,3),...lineCoins(1300,205,3),...lineCoins(1470,160,3),...lineCoins(1640,115,3),...lineCoins(1820,270,4),...lineCoins(1910,195,3),...lineCoins(2090,150,3)],enemies:[e(200,293,110,430),e(760,293,640,1010),e(1370,293,1260,1600),e(2000,293,1830,2250)],movers:[mover(1120,225,80,'y',80,1.6)],goal:2270},
    {id:'2-3',name:'MODE TURBO',w:2500,start:{x:60,y:250},ground:[g(0,390),g(480,330),g(900,360),g(1350,320),g(1760,310),g(2160,340)],plats:[p(300,220,80),p(760,210,80),p(1160,200,80),p(1580,190,80),p(1990,205,80),p(2330,175,80)],blocks:[b(320,180,true),b(780,170,true),b(1180,160,true),b(1600,150,true),b(2010,165,true)],coins:[...lineCoins(120,270,5),...lineCoins(500,270,5),...lineCoins(920,270,5),...lineCoins(1370,270,5),...lineCoins(1780,270,5),...lineCoins(2180,270,5)],enemies:[e(220,293,120,350),e(620,293,520,760),e(1030,293,940,1200),e(1460,293,1390,1620),e(1870,293,1800,2030),e(2250,293,2190,2440)],movers:[mover(400,235,65,'x',70,2.4),mover(820,220,65,'x',70,2.6),mover(1270,210,65,'x',70,2.8),mover(1680,205,65,'x',70,3.0),mover(2080,220,65,'x',70,3.1)],goal:2420,turbo:true},
    {id:'2-4',name:'LE GRAND BUG',w:2350,start:{x:60,y:250},ground:[g(0,650),g(730,420),g(1230,1120)],plats:[p(350,225,100),p(820,210,110),p(1040,170,90),p(1380,220,100),p(1600,185,100),p(1810,225,100)],blocks:[b(390,185,true),b(1080,130,true),b(1640,145,true)],coins:[...lineCoins(120,270,5),...lineCoins(365,195,3),...lineCoins(760,270,5),...lineCoins(835,180,3),...lineCoins(1260,270,5),...lineCoins(1395,190,3),...lineCoins(1870,270,5)],enemies:[e(250,293,120,580),e(900,293,780,1110),e(1450,293,1300,1700),e(1980,277,1900,2220,'boss')],movers:[mover(650,230,70,'x',70,1.8),mover(1150,220,70,'y',70,1.9)],goal:2270,boss:true}
  ];

  function cloneLevel(src){
    return {
      ...src,
      ground:src.ground.map(o=>({...o})),plats:src.plats.map(o=>({...o})),blocks:src.blocks.map(o=>({...o})),
      coins:src.coins.map(o=>({...o,taken:false})),enemies:src.enemies.map(o=>({...o,alive:true,hp:o.type==='boss'?3:1})),
      movers:src.movers.map(o=>({...o,phase:o.phase||0}))
    };
  }
  function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function circleHitsRect(o,r){const nx=Math.max(r.x,Math.min(o.x,r.x+r.w)),ny=Math.max(r.y,Math.min(o.y,r.y+r.h));const dx=o.x-nx,dy=o.y-ny;return dx*dx+dy*dy<o.r*o.r}
  function runLevelSelector(){
    running=false;cancelAnimationFrame(raf);currentRunLevel=null;runner=null;setScore(0);setBest();
    $('miniGameName').textContent='MINITEL RUN';$('miniGameHelp').textContent='Les niveaux se débloquent dans l’ordre. ★ finir · ★ tous les jetons · ★ sans dégât.';
    $('miniGameStartBtn').textContent='NIVEAUX';overlay('', '',false);drawRunTitle();
    const panel=$('runLevelSelect');if(!panel)return;panel.hidden=false;renderRunLevels();
  }
  function renderRunLevels(){
    const panel=$('runLevelSelect');if(!panel)return;
    panel.innerHTML='<div class="run-level-head"><strong>CARTE DU RÉSEAU</strong><span>PROGRESSION ENREGISTRÉE SUR CET APPAREIL</span></div><div class="run-level-grid"></div>';
    const grid=panel.querySelector('.run-level-grid');
    RUN_LEVELS.forEach((lv,i)=>{
      const n=i+1,locked=n>runProgress.unlocked,stars=Math.max(0,Math.min(3,Number(runProgress.stars?.[lv.id])||0));
      const btn=document.createElement('button');btn.type='button';btn.className='run-level-btn'+(locked?' locked':'');btn.disabled=locked;btn.dataset.runLevel=String(n);
      btn.innerHTML=`<span>${locked?'🔒':lv.id}</span><strong>${locked?'VERROUILLÉ':lv.name}</strong><small>${locked?'TERMINE LE NIVEAU PRÉCÉDENT':`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · RECORD ${runProgress.bestScore?.[lv.id]||0}`}</small>`;
      btn.addEventListener('click',()=>startRunLevel(n));grid.appendChild(btn);
    });
  }
  function drawRunTitle(){
    clear();const col=colors();grid(30);ctx.save();ctx.textAlign='center';ctx.fillStyle=col.green;ctx.font='bold 34px monospace';ctx.fillText('3615.MINITEL RUN',W/2,105);ctx.fillStyle=col.ink;ctx.font='bold 15px monospace';ctx.fillText('CONNEXION AU RÉSEAU…',W/2,145);ctx.fillStyle=col.soft;ctx.font='12px monospace';ctx.fillText('AIDE LE PETIT ABONNÉ À ATTEINDRE LA BORNE 3615',W/2,175);ctx.fillStyle=col.cyan;ctx.fillRect(W/2-12,210,24,30);ctx.fillStyle=col.bg;ctx.fillRect(W/2-6,217,4,4);ctx.fillRect(W/2+3,217,4,4);ctx.restore();
  }
  function startRunLevel(n){
    if(n<1||n>runProgress.unlocked||n>RUN_LEVELS.length)return;
    const lv=cloneLevel(RUN_LEVELS[n-1]);currentRunLevel=n;const start=lv.start;
    runner={lv,p:{x:start.x,y:start.y,w:24,h:30,vx:0,vy:0,onGround:false,facing:1,inv:0},camera:0,time:0,lives:3,damage:0,coins:0,totalCoins:lv.coins.length,turboUntil:lv.turbo?5:0,checkpoint:{x:start.x,y:start.y},won:false};
    $('runLevelSelect').hidden=true;$('miniGameName').textContent='MINITEL RUN';setScore(0);setBest();$('miniGameHelp').textContent=`${lv.id} · ${lv.name} · collecte les jetons et atteins la borne 3615.`;$('miniGameStartBtn').textContent='RECOMMENCER';
    overlay('', '',false);Object.keys(keys).forEach(k=>keys[k]=false);jumpQueued=false;running=true;last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  }
  function runColliders(){return [...runner.lv.ground,...runner.lv.plats,...runner.lv.blocks,...runner.lv.movers]}
  function updateMovers(){
    for(const m of runner.lv.movers){const s=Math.sin(runner.time*m.speed+m.phase)*m.range;if(m.axis==='x'){m.x=m.baseX+s;m.y=m.baseY}else{m.x=m.baseX;m.y=m.baseY+s}}
  }
  function hitBlock(block){
    if(block.hit)return;block.hit=true;setScore(score+50);
    if(block.bonus){runner.turboUntil=Math.max(runner.turboUntil,runner.time+8);setScore(score+150)}
  }
  function hurtRunner(){
    const r=runner,p1=r.p;if(p1.inv>0||r.won)return;r.damage++;r.lives--;p1.inv=1.25;
    if(r.lives<=0){running=false;cancelAnimationFrame(raf);overlay('CONNEXION PERDUE',`${r.lv.id} · plus de vies.`,true);$('miniGameStartBtn').textContent='REJOUER';return}
    p1.x=r.checkpoint.x;p1.y=r.checkpoint.y;p1.vx=0;p1.vy=0;
  }
  function updateRun(dt){
    if(!runner)return;const r=runner,lv=r.lv,p1=r.p,s=dt/1000;r.time+=s;if(p1.inv>0)p1.inv=Math.max(0,p1.inv-s);updateMovers();
    const turbo=r.time<r.turboUntil,moveSpeed=(lv.turbo?220:190)*(turbo?1.28:1);p1.vx=(keys.left?-moveSpeed:0)+(keys.right?moveSpeed:0);if(p1.vx)p1.facing=Math.sign(p1.vx);
    if((jumpQueued||keys.jump)&&p1.onGround){p1.vy=-475;p1.onGround=false;jumpQueued=false} else jumpQueued=false;
    p1.vy=Math.min(720,p1.vy+1280*s);
    let prevX=p1.x;p1.x+=p1.vx*s;p1.x=Math.max(0,Math.min(lv.w-p1.w,p1.x));
    for(const q of runColliders()){if(!rectsOverlap(p1,q))continue;if(p1.vx>0&&prevX+p1.w<=q.x+5)p1.x=q.x-p1.w;else if(p1.vx<0&&prevX>=q.x+q.w-5)p1.x=q.x+q.w}
    const prevY=p1.y,prevBottom=prevY+p1.h;p1.y+=p1.vy*s;p1.onGround=false;
    for(const q of runColliders()){
      if(!rectsOverlap(p1,q))continue;
      if(p1.vy>=0&&prevBottom<=q.y+8){p1.y=q.y-p1.h;p1.vy=0;p1.onGround=true}
      else if(p1.vy<0&&prevY>=q.y+q.h-8){p1.y=q.y+q.h;p1.vy=20;if(q.bonus!==undefined)hitBlock(q)}
    }
    if(p1.y>H+170){hurtRunner();return}
    for(const coin of lv.coins){if(!coin.taken&&circleHitsRect(coin,p1)){coin.taken=true;r.coins++;setScore(score+25)}}
    for(const enemy of lv.enemies){
      if(!enemy.alive)continue;enemy.x+=enemy.dir*enemy.speed*s;if(enemy.x<enemy.min){enemy.x=enemy.min;enemy.dir=1}else if(enemy.x>enemy.max){enemy.x=enemy.max;enemy.dir=-1}
      if(!rectsOverlap(p1,enemy))continue;
      if(p1.vy>70&&prevBottom<=enemy.y+11){enemy.hp--;p1.vy=-310;setScore(score+(enemy.type==='boss'?250:100));if(enemy.hp<=0)enemy.alive=false}
      else hurtRunner();
    }
    const bossAlive=lv.boss&&lv.enemies.some(x=>x.type==='boss'&&x.alive);
    if(p1.x>lv.goal-30&&!bossAlive){completeRunLevel();return}
    r.camera=Math.max(0,Math.min(lv.w-W,p1.x-170));
  }
  function completeRunLevel(){
    const r=runner;if(!r||r.won)return;r.won=true;running=false;cancelAnimationFrame(raf);
    let stars=1;if(r.coins===r.totalCoins)stars++;if(r.damage===0)stars++;
    const id=r.lv.id;runProgress.stars[id]=Math.max(Number(runProgress.stars[id])||0,stars);runProgress.bestScore[id]=Math.max(Number(runProgress.bestScore[id])||0,score);
    const next=Math.min(8,currentRunLevel+1),newUnlock=currentRunLevel<8&&runProgress.unlocked<next;if(newUnlock)runProgress.unlocked=next;saveRun();setBest();
    const starText='★'.repeat(stars)+'☆'.repeat(3-stars);overlay('NIVEAU TERMINÉ',`${id} · ${starText}${newUnlock?` · ${RUN_LEVELS[next-1].id} DÉBLOQUÉ`:currentRunLevel===8?' · RÉSEAU SAUVÉ':''}`,true);$('miniGameStartBtn').textContent='NIVEAUX';
  }
  function drawRun(){
    if(!runner){drawRunTitle();return}const r=runner,lv=r.lv,col=colors(),cam=r.camera;
    clear();ctx.save();ctx.translate(-cam,0);
    // background network
    ctx.strokeStyle=col.grid;ctx.lineWidth=1;for(let x=Math.floor(cam/120)*120;x<cam+W+120;x+=120){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    ctx.globalAlpha=.35;ctx.fillStyle=col.cyan;for(let x=100;x<lv.w;x+=260){ctx.fillRect(x,75+(x%3)*22,2,2);ctx.fillRect(x+40,95+(x%5)*13,3,3)}ctx.globalAlpha=1;
    // terrain
    ctx.fillStyle='#07282a';ctx.strokeStyle=col.green;ctx.lineWidth=2;
    [...lv.ground,...lv.plats].forEach(q=>{ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeRect(q.x+.5,q.y+.5,q.w-1,q.h-1)});
    lv.movers.forEach(q=>{ctx.fillStyle='#0a3135';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle=col.cyan;ctx.strokeRect(q.x+.5,q.y+.5,q.w-1,q.h-1)});
    // blocks
    lv.blocks.forEach(q=>{ctx.fillStyle=q.hit?'#0b2021':q.bonus?col.amber:'#164044';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle=q.bonus?col.amber:col.green;ctx.strokeRect(q.x+.5,q.y+.5,q.w-1,q.h-1);if(!q.hit){ctx.fillStyle=col.bg;ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(q.bonus?'?':'▦',q.x+q.w/2,q.y+21);ctx.textAlign='start'}});
    // coins / jetons
    lv.coins.forEach(o=>{if(o.taken)return;ctx.strokeStyle=col.amber;ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.stroke();ctx.fillStyle=col.amber;ctx.fillRect(o.x-1,o.y-4,2,8)});
    // enemies
    lv.enemies.forEach(o=>{if(!o.alive)return;ctx.fillStyle=o.type==='boss'?col.magenta:col.red;ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle=col.bg;ctx.fillRect(o.x+5,o.y+6,4,4);ctx.fillRect(o.x+o.w-9,o.y+6,4,4);ctx.strokeStyle=col.red;ctx.beginPath();ctx.moveTo(o.x+4,o.y+o.h);ctx.lineTo(o.x-4,o.y+o.h+6);ctx.moveTo(o.x+o.w-4,o.y+o.h);ctx.lineTo(o.x+o.w+4,o.y+o.h+6);ctx.stroke();if(o.type==='boss'){ctx.fillStyle=col.ink;ctx.font='bold 10px monospace';ctx.fillText(`BUG x${o.hp}`,o.x-1,o.y-7)}});
    // goal terminal
    const locked=lv.boss&&lv.enemies.some(x=>x.type==='boss'&&x.alive);ctx.fillStyle=locked?'#402020':'#0c4141';ctx.fillRect(lv.goal,215,42,100);ctx.strokeStyle=locked?col.red:col.green;ctx.strokeRect(lv.goal+.5,215.5,41,99);ctx.fillStyle=locked?col.red:col.green;ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('3615',lv.goal+21,242);ctx.fillRect(lv.goal+10,255,22,20);ctx.fillStyle=col.bg;ctx.fillText(locked?'X':'OK',lv.goal+21,270);ctx.textAlign='start';
    // player
    if(!(r.p.inv>0&&Math.floor(r.time*12)%2)){const q=r.p;ctx.fillStyle=col.cyan;ctx.fillRect(q.x,q.y,q.w,q.h);ctx.fillStyle=col.bg;ctx.fillRect(q.x+(q.facing>0?14:6),q.y+7,4,4);ctx.fillStyle=col.green;ctx.fillRect(q.x+4,q.y+19,16,4);if(r.time<r.turboUntil){ctx.strokeStyle=col.amber;ctx.strokeRect(q.x-3,q.y-3,q.w+6,q.h+6)}}
    ctx.restore();
    // fixed HUD inside canvas
    ctx.fillStyle='rgba(1,6,8,.82)';ctx.fillRect(8,8,250,30);ctx.fillStyle=col.ink;ctx.font='bold 12px monospace';ctx.fillText(`${lv.id}  VIES ${'♥'.repeat(r.lives)}  JETONS ${r.coins}/${r.totalCoins}`,16,27);if(r.time<r.turboUntil){ctx.fillStyle=col.amber;ctx.fillText('TURBO',W-58,27)}
  }

  function draw(){if(game==='snake')drawSnake();else if(game==='pong')drawPong();else if(game==='breakout')drawBreakout();else drawRun()}
  function update(dt){if(game==='snake')updateSnake(dt);else if(game==='pong')updatePong(dt);else if(game==='breakout')updateBreakout(dt);else updateRun(dt)}
  function frame(t){if(!running)return;const dt=Math.min(35,t-last||0);last=t;update(dt);draw();if(running)raf=requestAnimationFrame(frame)}
  function start(){
    if(game==='run'){
      if(currentRunLevel&&runner){startRunLevel(currentRunLevel)}else runLevelSelector();return;
    }
    cancelAnimationFrame(raf);running=false;last=0;Object.keys(keys).forEach(k=>keys[k]=false);
    if(game==='snake')initSnake();else if(game==='pong')initPong();else initBreakout();overlay('', '',false);$('miniGameStartBtn').textContent='RECOMMENCER';running=true;raf=requestAnimationFrame(frame);
  }
  function endGame(title,text){running=false;cancelAnimationFrame(raf);updateRecord();overlay(title,text,true);$('miniGameStartBtn').textContent='REJOUER'}
  function configureControls(){
    controls.forEach(btn=>{const d=btn.dataset.control;let show=true;if(game==='pong')show=d==='up'||d==='down';else if(game==='breakout')show=d==='left'||d==='right';else if(game==='run')show=d==='left'||d==='right'||d==='jump';else show=d!=='jump';btn.hidden=!show});
    const box=$('miniGameControls');if(box)box.classList.toggle('run-mode',game==='run');
  }
  function select(which){
    if(!names[which])return;game=which;running=false;cancelAnimationFrame(raf);Object.keys(keys).forEach(k=>keys[k]=false);jumpQueued=false;
    tabs.forEach(btn=>btn.classList.toggle('active',btn.dataset.miniGame===game));$('miniGameName').textContent=names[game];$('miniGameHelp').textContent=helps[game];$('miniGameStartBtn').textContent='JOUER';configureControls();
    const panel=$('runLevelSelect');if(panel)panel.hidden=true;
    if(game==='snake'){currentRunLevel=null;runner=null;initSnake();setBest();overlay(names[game],'Appuie sur JOUER',true)}
    else if(game==='pong'){currentRunLevel=null;runner=null;initPong();setBest();overlay(names[game],'Appuie sur JOUER',true)}
    else if(game==='breakout'){currentRunLevel=null;runner=null;initBreakout();setBest();overlay(names[game],'Appuie sur JOUER',true)}
    else runLevelSelector();
  }
  function handleControl(dir,pressed){
    if(game==='snake'&&pressed){snakeInput(dir);return}
    if(game==='pong'){if(dir==='up'||dir==='down')keys[dir]=pressed;return}
    if(game==='breakout'){if(dir==='left'||dir==='right')keys[dir]=pressed;return}
    if(game==='run'){
      if(dir==='left'||dir==='right')keys[dir]=pressed;
      if(dir==='jump'){keys.jump=pressed;if(pressed)jumpQueued=true}
    }
  }
  function keyDir(k){return ({ArrowUp:'up',w:'up',W:'up',z:'up',Z:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',q:'left',Q:'left',ArrowRight:'right',d:'right',D:'right'})[k]}

  tabs.forEach(btn=>btn.addEventListener('click',()=>select(btn.dataset.miniGame)));
  $('miniGameStartBtn').addEventListener('click',()=>{if(game==='run'&&currentRunLevel&&runner&&!running&&runner.won){runLevelSelector()}else start()});
  controls.forEach(btn=>{
    const dir=btn.dataset.control;
    ['pointerdown','touchstart'].forEach(ev=>btn.addEventListener(ev,event=>{event.preventDefault();handleControl(dir,true)},{passive:false}));
    ['pointerup','pointercancel','pointerleave','touchend','touchcancel'].forEach(ev=>btn.addEventListener(ev,event=>{event.preventDefault();handleControl(dir,false)},{passive:false}));
  });
  document.addEventListener('keydown',event=>{
    const section=document.getElementById('detente');if(!section||!section.classList.contains('active'))return;
    if(game==='run'){
      if(event.key===' '||event.key==='ArrowUp'||event.key==='w'||event.key==='W'||event.key==='z'||event.key==='Z'){event.preventDefault();if(running){jumpQueued=true;keys.jump=true}else if(currentRunLevel&&runner)startRunLevel(currentRunLevel);return}
      const dir=keyDir(event.key);if(dir==='left'||dir==='right'){event.preventDefault();handleControl(dir,true)}return;
    }
    if(event.key===' '){event.preventDefault();if(!running)start();return}
    const dir=keyDir(event.key);if(!dir)return;event.preventDefault();handleControl(dir,true);
  });
  document.addEventListener('keyup',event=>{if(game==='run'&&(event.key===' '||event.key==='ArrowUp'||event.key==='w'||event.key==='W'||event.key==='z'||event.key==='Z')){keys.jump=false;return}const dir=keyDir(event.key);if(dir)handleControl(dir,false)});
  let sx=0,sy=0;canvas.addEventListener('pointerdown',event=>{sx=event.clientX;sy=event.clientY});canvas.addEventListener('pointerup',event=>{if(game!=='snake')return;const dx=event.clientX-sx,dy=event.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;snakeInput(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;cancelAnimationFrame(raf);overlay('PAUSE',game==='run'?'Appuie sur REJOUER ou retourne aux niveaux.':'Appuie sur REJOUER',true);$('miniGameStartBtn').textContent='REJOUER'}});
  const detenteSection=document.getElementById('detente');if(detenteSection)new MutationObserver(()=>{if(!detenteSection.classList.contains('active')&&running){running=false;cancelAnimationFrame(raf);overlay('PAUSE','Partie interrompue · appuie sur REJOUER',true);$('miniGameStartBtn').textContent='REJOUER'}}).observe(detenteSection,{attributes:true,attributeFilter:['class']});
  select('snake');
})();
