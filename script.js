
const VERSION = "v1.152d";
const WORK_START = 9;
const WORK_END = 17;
const CURFEW_START = 20;
const CURFEW_END = 22;

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

const map = new Array(mapH).fill(0).map((_,y)=> new Array(mapW).fill(0).map((_,x)=> (y===5||x===10)?1:0));

const manifestPromise = fetch('assets/manifests/master_manifest.json').then(r=>r.json());

async function loadByVersions(baseKey){
  const manifest = await manifestPromise;
  const entries = manifest.entries[baseKey];
  if (!entries) return null;
  for (const e of entries){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = e.file + `?v=${VERSION}`;
    try{
      await img.decode();
      return img;
    }catch{}
  }
  return null;
}

// Player (Mayor)
const player = { x: 9, y: 6, spd: 3, img: null, w: 48, h: 48 };
loadByVersions("assets/sprites/latest/characters/mayor_octavius_sprite_sheet").then(img=>{ player.img = img; });

window.addEventListener('keydown',e=>{ keys[e.key] = true;});
window.addEventListener('keyup',e=>{ keys[e.key] = false;});

function canWalk(nx,ny){
  return nx>=0 && ny>=0 && nx<mapW && ny<mapH;
}

function update(){
  if (paused) return;
  hour++; if (hour>=24){ hour=0; day++; hudDay.textContent = String(day); }
  hudClock.textContent = `${String(hour).padStart(2,'0')}:00`;
  if (hour>=WORK_START && hour<WORK_END){
    if (Math.random()<0.2){ letters.push({ from: "Citizen", body: "Fix park benches.", hours: 2, status: "New" }); }
  }
  mailBadge.textContent = letters.length;

  let nx = player.x, ny = player.y;
  if (keys['ArrowLeft']) nx--;
  if (keys['ArrowRight']) nx++;
  if (keys['ArrowUp']) ny--;
  if (keys['ArrowDown']) ny++;
  if (canWalk(nx,ny)){ player.x = nx; player.y = ny; }
}

function draw(){
  ctx.fillStyle = '#0c1c24'; ctx.fillRect(0,0,canvas.width,canvas.height);

  drawMap();
  if (player.img){
    ctx.drawImage(player.img,0,0,48,48, player.x*tile-8, player.y*tile-16, 48,48);
  } else {
    ctx.fillStyle = '#bcd'; ctx.fillRect(player.x*tile-8, player.y*tile-16, 32,32);
  }
}

const tileCache = {};
async function tileImg(name){
  const imgKey = `assets/sprites/latest/tiles/${name}`.replace('.png','');
  if (!tileCache[imgKey]){
    tileCache[imgKey] = await loadByVersions(imgKey);
  }
  return tileCache[imgKey];
}
async function drawMap(){
  const grass = await tileImg("grass.png");
  const path = await tileImg("path.png");
  for (let y=0;y<mapH;y++){
    for (let x=0;x<mapW;x++){
      const t = (map[y][x]===1)?path:grass;
      if (t) ctx.drawImage(t, x*tile, y*tile, tile, tile);
    }
  }
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
    if (e.target.classList.contains('accept')){ letters.splice(i,1); }
    if (e.target.classList.contains('dismiss')){ letters.splice(i,1); }
    mailBadge.textContent = letters.length; mailBtn.click(); mailBtn.click();
  };
};
closeMail.onclick = ()=> panelMail.classList.add('hidden');

function loop(){ update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
