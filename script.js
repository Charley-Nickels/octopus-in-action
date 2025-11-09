
/* Octopus In Action - Patch v1.152b minimal engine */
const VERSION = "v1.152b";
const WORK_START = 9;
const WORK_END = 17;  // 5pm
const CURFEW_START = 20;
const CURFEW_END = 22;
const MS_PER_TICK = 1000; // 1 sec real = 1 game hour (accelerated for demo)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudClock = document.getElementById('clock');
const hudDay = document.getElementById('day');
const mailBadge = document.getElementById('mailBadge');
const pauseBtn = document.getElementById('pauseBtn');
const menuBtn = document.getElementById('menuBtn');
const mailBtn = document.getElementById('mailBtn');
const panelMenu = document.getElementById('menu');
const panelMail = document.getElementById('mail');
const sandboxState = document.getElementById('sandboxState');
const toggleSandbox = document.getElementById('toggleSandbox');
const closeMenu = document.getElementById('closeMenu');
const closeMail = document.getElementById('closeMail');
const lettersDiv = document.getElementById('letters');

let paused = false;
let sandbox = false;
let hour = 9, day = 1;
let letters = [];
let keys = {};
let mapW = 20, mapH = 12, tile = 32;

// simple tile map (0 grass, 1 path)
const map = new Array(mapH).fill(0).map((_,y)=> new Array(mapW).fill(0).map((_,x)=> (y===5||x===10)?1:0));

// Fallback-aware loader
async function chooseFirst(paths){
  for (const p of paths){
    try{
      const res = await fetch(p);
      if (res.ok){ return p; }
    }catch(e){/* ignore */}
  }
  return null;
}
const manifestPromise = fetch('assets/sprites/manifest.json').then(r=>r.json());

async function loadSprite(name){
  const manifest = await manifestPromise;
  const list = manifest.sprites[name] || [];
  const src = await chooseFirst(list);
  if (!src) return null;
  const img = new Image();
  img.src = src;
  await img.decode().catch(()=>{});
  return img;
}

// Player (Mayor)
const player = { x: 9, y: 6, spd: 3, img: null, w: 48, h: 48 };
loadSprite('mayor_octavius').then(img=>{ player.img = img; });

window.addEventListener('keydown',e=>{ keys[e.key] = true;});
window.addEventListener('keyup',e=>{ keys[e.key] = false;});

function canWalk(nx,ny){
  return nx>=0 && ny>=0 && nx<mapW && ny<mapH && map[ny][nx]!==-1;
}

function update(dt){
  if (paused) return;
  // Time
  updateClock(dt);
  // Input
  let nx = player.x, ny = player.y;
  if (keys['ArrowLeft']) nx--;
  if (keys['ArrowRight']) nx++;
  if (keys['ArrowUp']) ny--;
  if (keys['ArrowDown']) ny++;
  if (canWalk(nx,ny)){ player.x = nx; player.y = ny; }
}

let acc = 0;
function gameLoop(ts){
  if (!gameLoop.last) gameLoop.last = ts;
  let dt = ts - gameLoop.last;
  gameLoop.last = ts;
  acc += dt;
  while (acc >= MS_PER_TICK){
    update(MS_PER_TICK);
    acc -= MS_PER_TICK;
  }
  draw();
  requestAnimationFrame(gameLoop);
}

function draw(){
  // background
  ctx.fillStyle = '#0c1c24';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // tiles
  for (let y=0;y<mapH;y++){
    for (let x=0;x<mapW;x++){
      if (map[y][x]===1){
        drawTile('assets/tiles/path.png', x*tile, y*tile);
      } else {
        drawTile('assets/tiles/grass.png', x*tile, y*tile);
      }
    }
  }
  // player
  if (player.img){
    ctx.drawImage(player.img, 0,0,48,48, player.x*tile-8, player.y*tile-16, 48,48);
  }else{
    // simple placeholder
    ctx.fillStyle = '#bcd';
    ctx.fillRect(player.x*tile-8, player.y*tile-16, 32, 32);
  }
}

const tileCache = {};
function drawTile(src, x, y){
  if (!tileCache[src]){
    const img = new Image();
    img.src = src;
    tileCache[src] = img;
  }
  const img = tileCache[src];
  if (img.complete) ctx.drawImage(img, x, y, tile, tile);
}

function updateClock(dt){
  // 1s real -> 1hr game for demo
  hour++;
  if (hour>=24){ hour=0; day++; hudDay.textContent = String(day); }
  hudClock.textContent = `${String(hour).padStart(2,'0')}:00`;

  // generate a letter a couple times per day during work hours
  if (hour>=WORK_START && hour<WORK_END){
    if (Math.random()<0.2){
      letters.push({ from: "Citizen", body: "Please fix the park benches.", hours: 2, status: "New" });
    }
  }
  mailBadge.textContent = letters.length;
}

pauseBtn.onclick = ()=>{ paused = !paused; pauseBtn.textContent = paused? "Resume":"Pause"; };
menuBtn.onclick = ()=> panelMenu.classList.toggle('hidden');
closeMenu.onclick = ()=> panelMenu.classList.add('hidden');
toggleSandbox.onclick = ()=>{ sandbox = !sandbox; sandboxState.textContent = sandbox? "On":"Off"; };

mailBtn.onclick = ()=>{
  panelMail.classList.remove('hidden');
  lettersDiv.innerHTML = "";
  letters.forEach((l, i)=>{
    const el = document.createElement('div');
    el.className = "letter";
    el.innerHTML = `<strong>Letter #{i+1}</strong><p>${l.body}</p><button data-i="${i}" class="accept">Accept</button> <button data-i="${i}" class="dismiss">Dismiss</button>`;
    lettersDiv.appendChild(el);
  });
  lettersDiv.onclick = (e)=>{
    const i = e.target.getAttribute('data-i');
    if (i==null) return;
    if (e.target.classList.contains('accept')){
      letters.splice(i,1);
    }else if (e.target.classList.contains('dismiss')){
      letters.splice(i,1);
    }
    mailBadge.textContent = letters.length;
    mailBtn.click();
    mailBtn.click();
  }
};
closeMail.onclick = ()=> panelMail.classList.add('hidden');

requestAnimationFrame(gameLoop);
