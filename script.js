
/* Octopus In Action — Alpha v1.150 PATCH1 */
const GAME = {
  version: 'Alpha v1.150',
  mayorAnim: {frame:0, t:0, fw:32, fh:32, cols:4, rows:4},
  day: 1,
  hour: 9,
  minute: 0,
  budget: 1000,
  sat: 50,
  paused: true,
  sandbox: false,
  factionTint: 'dolphin',
  mail: [],
  tasks: [],
  citizens: [],
  tileSize: 32,
  timer: null,
  assets: {
    tiles: {
      grass: 'assets/tiles/grass_cc0.png',
      path: 'assets/tiles/path_slab_cc0.png',
      building: 'assets/tiles/building_cc0.png',
      cityhall: 'assets/tiles/cityhall_cc0.png',
      door: 'assets/tiles/door_colored_cc0.png'
    },
    ui: {
      mail: 'assets/ui/mail_icon_cc0.png',
      hudBg: 'assets/ui/hud_bg_cc0.png',
      cardDolphin: 'assets/ui/contact_card_bg_dolphin_cc0.png',
      cardBeaver: 'assets/ui/contact_card_bg_beaver_cc0.png',
      cardLobster: 'assets/ui/contact_card_bg_lobster_cc0.png'
    },
    sprites: {
      mayor: 'assets/sprites/mayor_octavius_sprite_sheet.png',
      npcOcto: 'assets/sprites/npc_octopus_cc0.png',
      npcBeaver: 'assets/sprites/npc_beaver_cc0.png',
      npcDolphin: 'assets/sprites/npc_dolphin_cc0.png',
      npcLobster: 'assets/sprites/npc_lobster_cc0.png',
      blocked: 'assets/sprites/art_blocked_placeholder.png'
    },
    audio: {
      click: 'assets/audio/ui_click_silent_cc0.wav'
    }
  }
};

// DOM
const hudDay = document.getElementById('hud-day');
const hudTime = document.getElementById('hud-time');
const hudBudget = document.getElementById('hud-budget');
const hudSat = document.getElementById('hud-sat');
const hudMode = document.getElementById('hud-mode');
const btnSandbox = document.getElementById('btn-sandbox');
const btnPause = document.getElementById('btn-pause');
const btnMail = document.getElementById('btn-mail');
const mailBadge = document.getElementById('mail-badge');
const mailPanel = document.getElementById('mailbox');
const mailList = document.getElementById('mail-list');
const mailClose = document.getElementById('mail-close');
const dialog = document.getElementById('dialog');
const dialogText = document.getElementById('dialog-text');
const scene = document.getElementById('scene');
const ctx = scene.getContext('2d');
const menu = document.getElementById('menu');
const credits = document.getElementById('credits');
const creditsClose = document.getElementById('credits-close');
const startScreen = document.getElementById('start-screen');
const startPlay = document.getElementById('start-play');
const loadingOverlay = document.getElementById('loading');

function playClick(){ new Audio(GAME.assets.audio.click).play().catch(()=>{}); }

// Map
const MAP_W = 20, MAP_H = 12;
const map = [];
for(let y=0;y<MAP_H;y++){
  const row = [];
  for(let x=0;x<MAP_W;x++){
    if (y===6 || x===10) row.push('path');
    else row.push('grass');
  }
  map.push(row);
}
for(let i=2;i<MAP_W-2;i+=4){ map[1][i] = 'building'; }
map[1][10] = 'cityhall';

function loadImageSafe(src, fallback){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>{
      if (fallback && src !== fallback){
        const f = new Image();
        f.onload=()=>resolve(f);
        f.onerror=()=>resolve(null);
        f.src = fallback;
      } else resolve(null);
    };
    img.src = src;
  });
}

const IMGS = {};
async function preload(){
  loadingOverlay.classList.remove('hidden');
  IMGS.grass = await loadImageSafe(GAME.assets.tiles.grass, GAME.assets.sprites.blocked);
  IMGS.path = await loadImageSafe(GAME.assets.tiles.path, GAME.assets.sprites.blocked);
  IMGS.building = await loadImageSafe(GAME.assets.tiles.building, GAME.assets.sprites.blocked);
  IMGS.cityhall = await loadImageSafe(GAME.assets.tiles.cityhall, GAME.assets.sprites.blocked);
  IMGS.door = await loadImageSafe(GAME.assets.tiles.door, GAME.assets.sprites.blocked);
  IMGS.mayor = await loadImageSafe(GAME.assets.sprites.mayor, GAME.assets.sprites.blocked);
  if (IMGS.mayor){
    GAME.mayorAnim.cols = 4; GAME.mayorAnim.rows = 4;
    GAME.mayorAnim.fw = Math.floor(IMGS.mayor.width / GAME.mayorAnim.cols) || 32;
    GAME.mayorAnim.fh = Math.floor(IMGS.mayor.height / GAME.mayorAnim.rows) || 32;
  }
  IMGS.npcOcto = await loadImageSafe(GAME.assets.sprites.npcOcto, GAME.assets.sprites.blocked);
  IMGS.npcBeaver = await loadImageSafe(GAME.assets.sprites.npcBeaver, GAME.assets.sprites.blocked);
  IMGS.npcDolphin = await loadImageSafe(GAME.assets.sprites.npcDolphin, GAME.assets.sprites.blocked);
  IMGS.npcLobster = await loadImageSafe(GAME.assets.sprites.npcLobster, GAME.assets.sprites.blocked);
  loadingOverlay.classList.add('hidden');
}

function spawnCitizens(){
  const list = [
    {name:'Aqua', faction:'dolphin', sprite:IMGS.npcDolphin},
    {name:'Timber', faction:'beaver', sprite:IMGS.npcBeaver},
    {name:'Pinch', faction:'lobster', sprite:IMGS.npcLobster},
    {name:'Inky', faction:'octopus', sprite:IMGS.npcOcto},
    {name:'Marina', faction:'dolphin', sprite:IMGS.npcDolphin},
    {name:'Cedar', faction:'beaver', sprite:IMGS.npcBeaver},
  ];
  GAME.citizens = list.map((c,i)=>({ ...c, x: 3+i*2, y: 8, dir:'S', state:'wander'}));
}

function isWalkable(x,y){
  if (x<0||y<0||x>=MAP_W||y>=MAP_H) return false;
  const t = map[y][x];
  return t!=='building' && t!=='cityhall';
}

function updateCitizens(){
  const h = GAME.hour;
  for(const c of GAME.citizens){
    if (h < 9 || h >= 22){ c.state='home'; continue; }
    if ((h>=9&&h<12)||(h>=13&&h<17)){ c.state='work'; }
    else if (h>=12 && h<13){ c.state='lunch'; }
    else if (h>=17 && h<20){ c.state='wander'; }
    else { c.state='home'; }
    if (c.state==='wander' || c.state==='lunch'){
      const dx = Math.sign(Math.random()-.5);
      const dy = Math.sign(Math.random()-.5);
      const nx = c.x+dx, ny=c.y+dy;
      if (isWalkable(nx,ny)){ c.x=nx; c.y=ny; }
    } else if (c.state==='work'){
      const tx=10, ty=6;
      const dx=Math.sign(tx - c.x), dy=Math.sign(ty - c.y);
      const nx=c.x+dx, ny=c.y+dy;
      if (isWalkable(nx,ny)){ c.x=nx; c.y=ny; }
    }
  }
}

function pushMail(letter){
  GAME.mail.push(letter);
  mailBadge.textContent = GAME.mail.length;
}
function generateDailyMail(){
  const letters = [
    {type:'task', title:'Fix Plaza Lights', hours:2, dept:'Public Works'},
    {type:'task', title:'Permit Review: Kiosk', hours:3, dept:'Planning'},
    {type:'task', title:'Beach Cleanup', hours:1, dept:'Parks'},
    {type:'report', title:'Quarterly Budget Report', body:'Balanced with surplus.'}
  ];
  for(const L of letters){ pushMail(L); }
}
function acceptTask(i){
  const L = GAME.mail.splice(i,1)[0];
  if (!L || L.type!=='task') return;
  GAME.tasks.push({title:L.title, dept:L.dept, remaining:L.hours, inProgress:false, done:false});
  mailBadge.textContent = GAME.mail.length;
  renderMail();
}
function rejectMail(i){
  GAME.mail.splice(i,1);
  mailBadge.textContent = GAME.mail.length;
  renderMail();
}
function renderMail(){
  mailList.innerHTML = '';
  GAME.mail.forEach((m, i)=>{
    const div = document.createElement('div');
    div.className = 'mail-item';
    div.innerHTML = `<strong>${m.type.toUpperCase()}</strong> — ${m.title || ''}
      ${m.hours?`<div>Hours Required: ${m.hours}</div>`:''}
      ${m.dept?`<div>Dept: ${m.dept}</div>`:''}
      ${m.body?`<div>${m.body}</div>`:''}
      <div class="mail-actions"></div>`;
    const actions = div.querySelector('.mail-actions');
    const btnAccept = document.createElement('button');
    btnAccept.className='btn'; btnAccept.textContent='Accept';
    btnAccept.onclick=()=>{ playClick(); acceptTask(i); };
    const btnReject = document.createElement('button');
    btnReject.className='btn'; btnReject.textContent='Reject';
    btnReject.onclick=()=>{ playClick(); rejectMail(i); };
    if (m.type==='task'){ actions.append(btnAccept); }
    actions.append(btnReject);
    mailList.append(div);
  });
}

function openDialogForCitizen(c){
  dialogText.textContent = `${c.name} (${c.faction}) says:\n\"Mayor, could you help the town today?\"`;
  dialog.classList.remove('hidden');
}

// Time
function tickMinute(){
  if (GAME.paused) return;
  GAME.minute += 1;
  if (GAME.minute >= 60){ GAME.minute = 0; GAME.hour += 1; }
  if (GAME.hour >= 24){ GAME.hour = 0; GAME.day += 1; generateDailyMail(); }
  if (GAME.hour>=9 && GAME.hour<17){
    for(const t of GAME.tasks){
      if (!t.done){ t.inProgress = true; t.remaining = Math.max(0, t.remaining - 1/60); if (t.remaining===0){ t.done=true; pushMail({type:'report', title:`Task Complete: ${t.title}`, body:`Dept ${t.dept} finished.`}); }}
    }
  }
  updateHUD();
  updateCitizens();
  draw();
}

function updateHUD(){
  hudDay.textContent = GAME.day;
  const hh = String(GAME.hour).padStart(2,'0');
  const mm = String(GAME.minute).padStart(2,'0');
  hudTime.textContent = `${hh}:${mm}`;
  hudBudget.textContent = Math.round(GAME.budget);
  hudSat.textContent = GAME.sat;
  hudMode.textContent = GAME.sandbox ? 'Sandbox' : 'Story';
  document.body.classList.remove('faction-dolphin','faction-beaver','faction-lobster');
  document.body.classList.add('faction-' + GAME.factionTint);
}

function drawMayor(){
  const ts = GAME.tileSize;
  const mx = 10*ts, my = 6*ts;
  const img = IMGS.mayor || IMGS.blocked;
  if (img === IMGS.blocked){ ctx.drawImage(img, 0,0, img.width, img.height, mx, my, ts, ts); return; }
  const A = GAME.mayorAnim;
  A.t += 1; if (A.t % 12 === 0){ A.frame = (A.frame+1)%(A.cols*A.rows); }
  const cx = (A.frame % A.cols) * A.fw;
  const cy = Math.floor(A.frame / A.cols) * A.fh;
  ctx.drawImage(img, cx, cy, A.fw, A.fh, mx, my, ts, ts);
}

// Draw
function draw(){
  ctx.imageSmoothingEnabled = false;
  const ts = GAME.tileSize;
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      const t = map[y][x];
      const img = IMGS[t] || IMGS.grass;
      ctx.drawImage(img, 0,0, img.width, img.height, x*ts, y*ts, ts, ts);
    }
  }
  drawMayor();
  for(const c of GAME.citizens){
    const img = c.sprite || IMGS.blocked;
    ctx.drawImage(img, 0,0, img.width, img.height, c.x*ts, c.y*ts, ts, ts);
  }
}

// UI
btnSandbox.onclick = ()=>{ playClick(); GAME.sandbox = !GAME.sandbox; updateHUD(); };
btnPause.onclick = ()=>{ playClick(); GAME.paused = true; document.getElementById('menu').classList.remove('hidden'); };
document.getElementById('menu-continue').onclick = ()=>{ playClick(); GAME.paused = false; document.getElementById('menu').classList.add('hidden'); };
document.getElementById('menu-credits').onclick = ()=>{ playClick(); credits.classList.remove('hidden'); };
document.getElementById('menu-restart').onclick = ()=>{ playClick(); GAME.hour=9; GAME.minute=0; GAME.tasks=[]; updateHUD(); draw(); };
creditsClose.onclick = ()=>{ playClick(); credits.classList.add('hidden'); };

btnMail.onclick = ()=>{ playClick(); renderMail(); mailPanel.classList.remove('hidden'); };
mailClose.onclick = ()=>{ playClick(); mailPanel.classList.add('hidden'); };

startPlay.onclick = ()=>{ startScreen.classList.add('hidden'); GAME.paused=false; playClick(); };

// Init
(async function(){
  await preload();
  spawnCitizens();
  updateHUD();
  draw();
  generateDailyMail();
  GAME.timer = setInterval(tickMinute, 1000);
  setTimeout(()=>openDialogForCitizen(GAME.citizens[0]), 6000);
})();
