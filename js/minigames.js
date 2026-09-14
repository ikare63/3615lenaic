(function(){
  'use strict';

  const canvas=document.getElementById('miniGameCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  const $=id=>document.getElementById(id);
  const tabs=[...document.querySelectorAll('[data-mini-game]')];
  const controls=[...document.querySelectorAll('[data-control]')];
  const names={snake:'SNAKE',pong:'PONG',breakout:'CASSE-BRIQUES'};
  const helps={
    snake:'Flèches ou pavé tactile · mange les carrés sans toucher les murs.',
    pong:'↑ / ↓ ou pavé tactile · premier à 5 contre le terminal.',
    breakout:'← / → ou pavé tactile · détruis toutes les briques, 3 vies.'
  };
  const BEST_KEY='3615-mini-games-best-v1';
  let best={snake:0,pong:0,breakout:0};
  try{best={...best,...JSON.parse(localStorage.getItem(BEST_KEY)||'{}')}}catch(e){}

  let game='snake',running=false,last=0,raf=0,score=0;
  let snake,pong,breakout;
  const keys={up:false,down:false,left:false,right:false};

  function css(name,fallback){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback}
  function colors(){return {bg:'#010608',grid:'#0d292c',ink:css('--ink','#7fffd4'),green:css('--green','#98ff98'),cyan:css('--cyan','#66e4ff'),amber:css('--amber','#ffd166'),magenta:css('--magenta','#ff86e5'),red:css('--red','#ff7a7a')}}
  function saveBest(){localStorage.setItem(BEST_KEY,JSON.stringify(best))}
  function setScore(v){score=v;$('miniGameScore').textContent=String(v)}
  function setBest(){ $('miniGameBest').textContent=String(best[game]||0) }
  function overlay(title,text,show=true){$('miniGameOverlayTitle').textContent=title;$('miniGameOverlayText').textContent=text;$('miniGameOverlay').hidden=!show}
  function updateRecord(value=score){if(value>(best[game]||0)){best[game]=value;saveBest()}setBest()}
  function clear(){const c=colors();ctx.fillStyle=c.bg;ctx.fillRect(0,0,W,H)}
  function grid(step=20){const c=colors();ctx.strokeStyle=c.grid;ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=W;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=0;y<=H;y+=step){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke()}

  function initSnake(){
    snake={cols:30,rows:18,body:[{x:8,y:9},{x:7,y:9},{x:6,y:9}],dir:{x:1,y:0},next:{x:1,y:0},food:{x:19,y:9},acc:0,step:115};
    placeFood();setScore(0);drawSnake();
  }
  function placeFood(){
    let p;do{p={x:Math.floor(Math.random()*snake.cols),y:Math.floor(Math.random()*snake.rows)}}while(snake.body.some(b=>b.x===p.x&&b.y===p.y));snake.food=p;
  }
  function snakeInput(dir){
    const d={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[dir];if(!d)return;
    if(d.x===-snake.dir.x&&d.y===-snake.dir.y)return;snake.next=d;
  }
  function updateSnake(dt){
    snake.acc+=dt;if(snake.acc<snake.step)return;snake.acc=0;snake.dir=snake.next;
    const h=snake.body[0],n={x:h.x+snake.dir.x,y:h.y+snake.dir.y};
    if(n.x<0||n.y<0||n.x>=snake.cols||n.y>=snake.rows||snake.body.some(b=>b.x===n.x&&b.y===n.y)){endGame('PERDU','Le serpent a rencontré un obstacle.');return}
    snake.body.unshift(n);
    if(n.x===snake.food.x&&n.y===snake.food.y){setScore(score+10);updateRecord();snake.step=Math.max(62,snake.step-2);placeFood()}else snake.body.pop();
  }
  function drawSnake(){
    clear();grid(20);const c=colors(),cw=W/snake.cols,ch=H/snake.rows;
    ctx.fillStyle=c.amber;ctx.fillRect(snake.food.x*cw+5,snake.food.y*ch+5,cw-10,ch-10);
    snake.body.forEach((b,i)=>{ctx.fillStyle=i?c.green:c.cyan;ctx.fillRect(b.x*cw+2,b.y*ch+2,cw-4,ch-4)});
  }

  function initPong(){pong={py:H/2-38,cpu:H/2-38,pw:11,ph:76,bx:W/2,by:H/2,bvx:245*(Math.random()<.5?-1:1),bvy:(Math.random()*150-75)||80,r:7,me:0,cpuScore:0};setScore(0);drawPong()}
  function updatePong(dt){
    const s=dt/1000,speed=265;
    if(keys.up)pong.py-=speed*s;if(keys.down)pong.py+=speed*s;pong.py=Math.max(0,Math.min(H-pong.ph,pong.py));
    const target=pong.by-pong.ph/2,delta=target-pong.cpu,max=190*s;pong.cpu+=Math.max(-max,Math.min(max,delta));pong.cpu=Math.max(0,Math.min(H-pong.ph,pong.cpu));
    pong.bx+=pong.bvx*s;pong.by+=pong.bvy*s;
    if(pong.by<pong.r){pong.by=pong.r;pong.bvy=Math.abs(pong.bvy)}if(pong.by>H-pong.r){pong.by=H-pong.r;pong.bvy=-Math.abs(pong.bvy)}
    const lp=22,rp=W-22-pong.pw;
    if(pong.bvx<0&&pong.bx-pong.r<=lp+pong.pw&&pong.bx>lp&&pong.by>=pong.py&&pong.by<=pong.py+pong.ph){pong.bx=lp+pong.pw+pong.r;pong.bvx=Math.abs(pong.bvx)*1.035;pong.bvy+=(pong.by-(pong.py+pong.ph/2))*4}
    if(pong.bvx>0&&pong.bx+pong.r>=rp&&pong.bx<rp+pong.pw&&pong.by>=pong.cpu&&pong.by<=pong.cpu+pong.ph){pong.bx=rp-pong.r;pong.bvx=-Math.abs(pong.bvx)*1.025;pong.bvy+=(pong.by-(pong.cpu+pong.ph/2))*3.4}
    if(pong.bx<-20){pong.cpuScore++;pongServe(1)}else if(pong.bx>W+20){pong.me++;setScore(pong.me);updateRecord(pong.me);pongServe(-1)}
    if(pong.me>=5){endGame('VICTOIRE','5 points. Le terminal est humilié.')}else if(pong.cpuScore>=5){endGame('PERDU','Le terminal gagne cette manche.')}
  }
  function pongServe(dir){pong.bx=W/2;pong.by=H/2;pong.bvx=235*dir;pong.bvy=(Math.random()*160-80)||70}
  function drawPong(){
    clear();const c=colors();ctx.strokeStyle=c.grid;ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=c.green;ctx.fillRect(22,pong.py,pong.pw,pong.ph);ctx.fillStyle=c.magenta;ctx.fillRect(W-22-pong.pw,pong.cpu,pong.pw,pong.ph);ctx.fillStyle=c.cyan;ctx.beginPath();ctx.arc(pong.bx,pong.by,pong.r,0,Math.PI*2);ctx.fill();
    ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.fillStyle=c.ink;ctx.fillText(`${pong.me}   ${pong.cpuScore}`,W/2,38);ctx.textAlign='start';
  }

  function initBreakout(){
    const rows=5,cols=9,pad=7,top=48,left=28,bw=(W-left*2-pad*(cols-1))/cols,bh=20;
    const bricks=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)bricks.push({x:left+c*(bw+pad),y:top+r*(bh+pad),w:bw,h:bh,alive:true,row:r});
    breakout={px:W/2-52,pw:104,ph:12,bx:W/2,by:H-62,bvx:185,bvy:-205,r:6,lives:3,bricks};setScore(0);drawBreakout();
  }
  function updateBreakout(dt){
    const s=dt/1000,speed=330;if(keys.left)breakout.px-=speed*s;if(keys.right)breakout.px+=speed*s;breakout.px=Math.max(0,Math.min(W-breakout.pw,breakout.px));
    breakout.bx+=breakout.bvx*s;breakout.by+=breakout.bvy*s;
    if(breakout.bx<breakout.r){breakout.bx=breakout.r;breakout.bvx=Math.abs(breakout.bvx)}if(breakout.bx>W-breakout.r){breakout.bx=W-breakout.r;breakout.bvx=-Math.abs(breakout.bvx)}if(breakout.by<breakout.r){breakout.by=breakout.r;breakout.bvy=Math.abs(breakout.bvy)}
    const py=H-26;if(breakout.bvy>0&&breakout.by+breakout.r>=py&&breakout.by-breakout.r<=py+breakout.ph&&breakout.bx>=breakout.px&&breakout.bx<=breakout.px+breakout.pw){breakout.by=py-breakout.r;breakout.bvy=-Math.abs(breakout.bvy);breakout.bvx+=(breakout.bx-(breakout.px+breakout.pw/2))*3.2}
    for(const b of breakout.bricks){if(!b.alive)continue;if(breakout.bx+breakout.r>b.x&&breakout.bx-breakout.r<b.x+b.w&&breakout.by+breakout.r>b.y&&breakout.by-breakout.r<b.y+b.h){b.alive=false;breakout.bvy*=-1;setScore(score+10);updateRecord();break}}
    if(breakout.bricks.every(b=>!b.alive)){endGame('VICTOIRE','Toutes les briques sont tombées.');return}
    if(breakout.by>H+15){breakout.lives--;if(breakout.lives<=0){endGame('PERDU','Plus de vies.')}else{breakout.bx=W/2;breakout.by=H-62;breakout.bvx=185*(Math.random()<.5?-1:1);breakout.bvy=-205}}
  }
  function drawBreakout(){
    clear();const c=colors(),palette=[c.magenta,c.amber,c.cyan,c.green,c.ink];
    breakout.bricks.forEach(b=>{if(b.alive){ctx.fillStyle=palette[b.row%palette.length];ctx.fillRect(b.x,b.y,b.w,b.h)}});
    ctx.fillStyle=c.green;ctx.fillRect(breakout.px,H-26,breakout.pw,breakout.ph);ctx.fillStyle=c.cyan;ctx.beginPath();ctx.arc(breakout.bx,breakout.by,breakout.r,0,Math.PI*2);ctx.fill();
    ctx.font='bold 14px monospace';ctx.fillStyle=c.ink;ctx.fillText(`VIES ${'●'.repeat(breakout.lives)}${'○'.repeat(3-breakout.lives)}`,14,23);
  }

  function draw(){if(game==='snake')drawSnake();else if(game==='pong')drawPong();else drawBreakout()}
  function update(dt){if(game==='snake')updateSnake(dt);else if(game==='pong')updatePong(dt);else updateBreakout(dt)}
  function frame(t){if(!running)return;const dt=Math.min(35,t-last||0);last=t;update(dt);draw();if(running)raf=requestAnimationFrame(frame)}
  function start(){
    cancelAnimationFrame(raf);running=false;last=0;Object.keys(keys).forEach(k=>keys[k]=false);
    if(game==='snake')initSnake();else if(game==='pong')initPong();else initBreakout();
    overlay('', '',false);$('miniGameStartBtn').textContent='RECOMMENCER';running=true;raf=requestAnimationFrame(frame);
  }
  function endGame(title,text){running=false;cancelAnimationFrame(raf);updateRecord();overlay(title,text,true);$('miniGameStartBtn').textContent='REJOUER'}
  function select(which){
    if(!names[which])return;game=which;running=false;cancelAnimationFrame(raf);Object.keys(keys).forEach(k=>keys[k]=false);
    tabs.forEach(b=>b.classList.toggle('active',b.dataset.miniGame===game));$('miniGameName').textContent=names[game];$('miniGameHelp').textContent=helps[game];$('miniGameStartBtn').textContent='JOUER';setBest();
    if(game==='snake')initSnake();else if(game==='pong')initPong();else initBreakout();overlay(names[game],'Appuie sur JOUER',true);
  }
  function handleControl(dir,pressed){
    if(game==='snake'&&pressed){snakeInput(dir);return}
    if(game==='pong'){if(dir==='up'||dir==='down')keys[dir]=pressed}
    if(game==='breakout'){if(dir==='left'||dir==='right')keys[dir]=pressed}
  }
  function keyDir(k){return ({ArrowUp:'up',w:'up',W:'up',z:'up',Z:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',q:'left',Q:'left',ArrowRight:'right',d:'right',D:'right'})[k]}

  tabs.forEach(b=>b.addEventListener('click',()=>select(b.dataset.miniGame)));
  $('miniGameStartBtn').addEventListener('click',start);
  controls.forEach(b=>{
    const dir=b.dataset.control;
    ['pointerdown','touchstart'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();handleControl(dir,true)},{passive:false}));
    ['pointerup','pointercancel','pointerleave','touchend','touchcancel'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();handleControl(dir,false)},{passive:false}));
  });
  document.addEventListener('keydown',e=>{
    const section=document.getElementById('detente');if(!section||!section.classList.contains('active'))return;
    if(e.key===' '){e.preventDefault();if(!running)start();return}
    const dir=keyDir(e.key);if(!dir)return;e.preventDefault();handleControl(dir,true);
  });
  document.addEventListener('keyup',e=>{const dir=keyDir(e.key);if(dir)handleControl(dir,false)});
  let sx=0,sy=0;
  canvas.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});
  canvas.addEventListener('pointerup',e=>{if(game!=='snake')return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;snakeInput(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;cancelAnimationFrame(raf);overlay('PAUSE','Appuie sur REJOUER',true);$('miniGameStartBtn').textContent='REJOUER'}});
  const detenteSection=document.getElementById('detente');
  if(detenteSection)new MutationObserver(()=>{
    if(!detenteSection.classList.contains('active')&&running){running=false;cancelAnimationFrame(raf);overlay('PAUSE','Partie interrompue · appuie sur REJOUER',true);$('miniGameStartBtn').textContent='REJOUER'}
  }).observe(detenteSection,{attributes:true,attributeFilter:['class']});
  select('snake');
})();
