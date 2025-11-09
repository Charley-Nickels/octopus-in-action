const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');
const T=48; const W=canvas.width, H=canvas.height;
const cols=Math.floor(W/T), rows=Math.floor(H/T);
const tiles={grass: new Image(), path: new Image(), water: new Image()};
tiles.grass.src='assets/tiles/tile_grass.png';
tiles.path.src='assets/tiles/tile_path.png';
tiles.water.src='assets/tiles/tile_water.png';

const mayorImg=new Image(); mayorImg.src='assets/sprites/characters/mayor_octavius_adult_sheet.png';

let gameMinutes=9*60; // 09:00
let running=false;
let cash=0;
const keys={};
onkeydown=e=>keys[e.key.toLowerCase()]=true; onkeyup=e=>keys[e.key.toLowerCase()]=false;

const btnStart=document.getElementById('btnStart');
const btnPause=document.getElementById('btnPause');
const btnMailbox=document.getElementById('btnMailbox');
const btnOptions=document.getElementById('btnOptions');
const clockEl=document.getElementById('clock');
const cashEl=document.getElementById('cash');
const overlay=document.getElementById('overlay');
const overlayBody=document.getElementById('overlayBody');
const btnAccept=document.getElementById('btnAccept');
const btnComplete=document.getElementById('btnComplete');
const btnClose=document.getElementById('btnClose');

btnStart.onclick=()=>running=true;
btnPause.onclick=()=>running=false;
btnMailbox.onclick=()=>{ overlay.classList.remove('hidden'); overlayBody.innerHTML = renderMailbox(); };
btnOptions.onclick=()=>{ overlay.classList.remove('hidden'); overlayBody.innerHTML='<p>Options coming next patch.</p>'; };
btnClose.onclick=()=>overlay.classList.add('hidden');

const letters=[{id:'t001', title:'Welcome to Day 1', body:'Greet 3 citizens between 09:00–17:00.', reward:5, type:'greet', goal:3, accepted:false, completed:false}];
function renderMailbox(){
  const m=letters[0];
  return `<h4>${m.title}</h4><p>${m.body}</p><p>Status: ${m.completed?'✅ Completed':(m.accepted?'In progress':'Not accepted')}</p>`;
}
btnAccept.onclick=()=>{ letters.forEach(l=>l.accepted=true); };
btnComplete.onclick=()=>{
  const m=letters[0];
  if(m.accepted && m._count>=m.goal && isWorkHour()) { m.completed=true; cash+=m.reward; cashEl.textContent=cash; }
  overlayBody.innerHTML=renderMailbox();
};

function isWorkHour(){
  const hr=Math.floor(gameMinutes/60);
  return hr>=9 && hr<17;
}

// simple map: water on top row, path across middle
function drawMap(){
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      let img=tiles.grass;
      if(r<3) img=tiles.water;
      if(r===Math.floor(rows/2)) img=tiles.path;
      ctx.drawImage(img,c*T,r*T,T,T);
      ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.strokeRect(c*T,r*T,T,T);
    }
  }
}

const mayor={x:W/2, y:H/2, speed:2.2, frame:0, frameTime:0};
function move(dt){
  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(dx||dy){
    const m=Math.hypot(dx,dy); dx/=m; dy/=m;
    mayor.x=Math.max(0,Math.min(W-1,mayor.x+dx*mayor.speed));
    mayor.y=Math.max(0,Math.min(H-1,mayor.y+dy*mayor.speed));
    mayor.frameTime+=dt; if(mayor.frameTime>140){ mayor.frame=(mayor.frame+1)%3; mayor.frameTime=0; }
  } else mayor.frame=1;
}

function drawMayor(){
  const sx=mayor.frame*48, sy=0;
  ctx.drawImage(mayorImg,sx,0,48,48, Math.floor(mayor.x-24), Math.floor(mayor.y-24), 48,48);
}

// NPCs: small wandering dots (placeholder logic; sprites can be wired same way)
const npcs=[]; for(let i=0;i<6;i++){ npcs.push({x:200+i*80, y:300+(i%2)*60, t:0}); }
function drawNPCs(dt){
  ctx.fillStyle='#ffd166';
  for(const n of npcs){
    n.t+=dt; n.x+=Math.sin(n.t/900)*0.3; n.y+=Math.cos(n.t/800)*0.3;
    ctx.beginPath(); ctx.arc(n.x,n.y,8,0,Math.PI*2); ctx.fill();
  }
}

// Greet logic (Space near NPC)
let greetDebounce=0;
function tryGreet(){
  const near = npcs.find(n => Math.hypot(n.x-mayor.x, n.y-mayor.y)<60);
  if(near){
    const m=letters[0];
    if(m.accepted && !m.completed && isWorkHour()){
      m._count=(m._count||0)+1;
    }
  }
}
document.addEventListener('keydown',e=>{ if(e.code==='Space' && performance.now()-greetDebounce>250){greetDebounce=performance.now(); tryGreet();}});

let last=performance.now();
function loop(now){
  const dt=now-last; last=now;
  if(running){ gameMinutes+=dt/1000; if(gameMinutes>=24*60) gameMinutes=0; }
  const hr=String(Math.floor(gameMinutes/60)).padStart(2,'0');
  const mn=String(Math.floor(gameMinutes%60)).padStart(2,'0');
  clockEl.textContent=`${hr}:${mn}`;

  ctx.clearRect(0,0,W,H);
  drawMap();
  move(dt);
  drawNPCs(dt);
  drawMayor();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
