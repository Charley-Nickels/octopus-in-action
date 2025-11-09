// ------- Manifest & helpers -------
let manifest = null;
async function loadJSON(url){ const r = await fetch(url); return r.json(); }
function clamp(v,min,max){ return v<min?min:(v>max?max:v); }
function isWorkHour(mins){ const h=Math.floor(mins/60); return h>=9 && h<17; }

// ------- Boot -------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, T=48;
const cols = Math.floor(W/T), rows = Math.floor(H/T);

const buttons = {
  start: document.getElementById('btnStart'),
  pause: document.getElementById('btnPause'),
  mailbox: document.getElementById('btnMailbox'),
  options: document.getElementById('btnOptions')
};
const overlay = document.getElementById('overlay');
const overlayBody = document.getElementById('overlayBody');
const btnAccept = document.getElementById('btnAccept');
const btnComplete = document.getElementById('btnComplete');
const btnClose = document.getElementById('btnClose');
const clockEl = document.getElementById('clock');
const cashEl = document.getElementById('cash');

const keys = {};
onkeydown = e => keys[e.key.toLowerCase()] = true;
onkeyup   = e => keys[e.key.toLowerCase()] = false;

// SFX (safe if missing)
function loadAudio(src){ const a=new Audio(); a.src=src; a.preload='auto'; return a; }
const sfx = { click:null, mail:null, done:null };

// ------- Tiles & sprites -------
const tiles = { grass:new Image(), path:new Image(), water:new Image() };
const buildings = []; // {img:Image,x,y}

const mayorImg = new Image();
const npcSheets = []; // future: push other V1 sheets here

// ------- Game state -------
let running=false;
let gameMinutes = 9*60;      // 09:00
let cash = 0;
let letters = [];            // from manifest
let last = performance.now();

const mayor = { x: W/2, y: H/2, speed:2.2, frame:0, ft:0 };
const npcs = []; for(let i=0;i<8;i++){ npcs.push({x:220+i*90, y:260+(i%2)*70, t:0}); }

// ------- UI wiring -------
buttons.start.onclick = ()=>{ running=true; };
buttons.pause.onclick = ()=>{ running=false; };
buttons.mailbox.onclick = ()=>{ if(sfx.mail){ sfx.mail.currentTime=0; sfx.mail.play(); } openMailbox(); };
buttons.options.onclick = ()=>{ openOverlay("<p>Options coming next patch.</p>"); };
btnClose.onclick = ()=> overlay.classList.add('hidden');
btnAccept.onclick = ()=>{ letters.forEach(l=>l.accepted=true); renderMailbox(); };
btnComplete.onclick = ()=>{
  const m = letters.find(l=>l.id==='t001');
  if(m && m.accepted && m._count>=m.goal && isWorkHour(gameMinutes)){
    m.completed = true; cash += (m.reward||0); cashEl.textContent=cash;
    if(sfx.done){ sfx.done.currentTime=0; sfx.done.play(); }
  }
  renderMailbox();
};

function openOverlay(html){ overlayBody.innerHTML=html; overlay.classList.remove('hidden'); }
function renderMailbox(){
  const m = letters.find(l=>l.id==='t001');
  openOverlay(`<h4>${m.title}</h4><p>${m.body}</p>
  <p>Status: ${m.completed?'✅ Completed':(m.accepted?'In progress':'Not accepted')}</p>
  <p>Progress: ${m._count||0} / ${m.goal||3}</p>`);
}
function openMailbox(){ renderMailbox(); }

// ------- Load manifest + assets -------
(async function init(){
  manifest = await loadJSON('patch_manifest.json');

  // Tiles (fallbacks if missing)
  tiles.grass.src = manifest.tiles?.grass || 'assets/tiles/tile_grass.png';
  tiles.path.src  = manifest.tiles?.path  || 'assets/tiles/tile_path.png';
  tiles.water.src = manifest.tiles?.water || 'assets/tiles/tile_water.png';

  // SFX (safe)
  const [c,m,d] = manifest.sfx || [];
  sfx.click = c ? loadAudio(c) : null;
  sfx.mail  = m ? loadAudio(m) : null;
  sfx.done  = d ? loadAudio(d) : null;

  // Mayor + any other sheets you add to manifest.sprites
  const mayorRec = (manifest.sprites||[]).find(s=>/mayor.*octavius/i.test(s.key)) || (manifest.sprites||[])[0];
  mayorImg.src = mayorRec ? mayorRec.file : 'assets/sprites/characters/mayor_octavius_adult_sheet.png';

  // Buildings (discover from folder)
  await discoverBuildings(manifest.buildings_glob || 'assets/tiles/buildings/');

  // Mailbox tasks
  letters = (manifest.mailbox_tasks||[]).map(x=>({ ...x, accepted:false, completed:false }));

  requestAnimationFrame(loop);
})();

// Try to list building images (naive scan of a known dir)
async function discoverBuildings(prefix){
  // We can't list directories from the browser, so enumerate known candidates:
  const candidates = [
    'city_hall.png','shop.png','house.png','office.png','bank.png','market.png','store.png'
  ];
  let x=160, y=360;
  for(const file of candidates){
    const url = `${prefix}${file}`;
    const ok = await urlExists(url);
    if(ok){
      const img = new Image(); img.src = url;
      buildings.push({img,x,y});
      x+= 140; if(x>W-120){ x=160; y+=130; }
    }
  }
}
async function urlExists(url){
  try { const r = await fetch(url, {method:'HEAD'}); return r.ok; }
  catch(e){ return false; }
}

// ------- Input & interactions -------
let greetDebounce=0;
document.addEventListener('keydown', e=>{
  if(e.code==='Space' && performance.now()-greetDebounce>250){
    greetDebounce = performance.now();
    tryGreet();
  }
});
function tryGreet(){
  const near = npcs.find(n => Math.hypot(n.x-mayor.x, n.y-mayor.y) < 60);
  if(near){
    if(sfx.click){ sfx.click.currentTime=0; sfx.click.play(); }
    const m = letters.find(l=>l.id==='t001');
    if(m && m.accepted && !m.completed && isWorkHour(gameMinutes)){
      m._count = (m._count||0)+1;
      renderMailbox();
    }
  }
}

// ------- Game loop -------
function loop(now){
  const dt = now - last; last = now;
  if(running){ const step = (manifest.time_scale?.REAL_MS_PER_INGAME_MINUTE ?? 1000); gameMinutes += dt/ (step/60); if(gameMinutes>=24*60) gameMinutes=0; }

  // HUD clock
  const hr=String(Math.floor(gameMinutes/60)).padStart(2,'0');
  const mn=String(Math.floor(gameMinutes%60)).padStart(2,'0');
  clockEl.textContent = `${hr}:${mn}`;

  // Sim NPC drift
  for(const n of npcs){ n.t+=dt; n.x+=Math.sin(n.t/900)*0.3; n.y+=Math.cos(n.t/800)*0.3; }

  // Movement
  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(dx||dy){
    const m=Math.hypot(dx,dy)||1; dx/=m; dy/=m;
    mayor.x = clamp(mayor.x + dx*2.2, 0, W-1);
    mayor.y = clamp(mayor.y + dy*2.2, 0, H-1);
    mayor.ft += dt; if(mayor.ft>140){ mayor.frame=(mayor.frame+1)%3; mayor.ft=0; }
  } else {
    mayor.frame = 1;
  }

  // Draw
  ctx.clearRect(0,0,W,H);
  drawMap();
  drawBuildings();
  drawNPCs();
  drawMayor();
  requestAnimationFrame(loop);
}

function drawMap(){
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      let img = tiles.grass;
      if(r<3) img = tiles.water;
      if(r===Math.floor(rows/2)) img = tiles.path;
      ctx.drawImage(img, c*T, r*T, T, T);
      ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.strokeRect(c*T,r*T,T,T);
    }
  }
}
function drawBuildings(){
  for(const b of buildings){
    if(b.img.complete) ctx.drawImage(b.img, b.x, b.y);
  }
}
function drawNPCs(){
  ctx.fillStyle='#ffd166';
  for(const n of npcs){ ctx.beginPath(); ctx.arc(n.x,n.y,8,0,Math.PI*2); ctx.fill(); }
}
function drawMayor(){
  if(!mayorImg.complete){ return; }
  const sx = mayor.frame*48;
  ctx.drawImage(mayorImg, sx, 0, 48,48, Math.floor(mayor.x-24), Math.floor(mayor.y-24), 48,48);
}
