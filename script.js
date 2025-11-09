
async function loadJSON(p){const r=await fetch(p);return r.json();}
function loadImage(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;});}

(async()=>{
  const manifest = await loadJSON('patch_manifest.json');
  const cv = document.getElementById('game'); const ctx = cv.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const clock = document.getElementById('clock');

  const REAL_MS_PER_INGAME_MINUTE = manifest.time_scale?.REAL_MS_PER_INGAME_MINUTE ?? 6000;
  let gameMinutes = 9*60, paused = true;

  const ts=32;
  const tiles = {};
  tiles.grass = await loadImage(manifest.tiles.grass);
  tiles.path  = await loadImage(manifest.tiles.path);
  tiles.water = await loadImage(manifest.tiles.water);

  function renderMap(){
    for(let y=0;y<cv.height;y+=ts){
      for(let x=0;x<cv.width;x+=ts){
        let img = tiles.grass;
        if(y<ts*4) img = tiles.water;
        else if(y>=ts*6 && y<ts*8) img = tiles.path;
        ctx.drawImage(img,0,0,ts,ts,x,y,ts,ts);
      }
    }
  }

  const sheets = [];
  for(const s of manifest.sprites){
    sheets.push({key:s.key, img: await loadImage(s.file)});
  }

  const CELL=48;
  function drawSheet(img, col=0, row=0, x=0, y=0, scale=1){
    const sx=col*CELL, sy=row*CELL, sw=CELL, sh=CELL;
    const dw=CELL*scale, dh=CELL*scale;
    ctx.drawImage(img,sx,sy,sw,sh, x - dw/2, y - dh/2, dw, dh);
  }

  const mayorSheet = sheets.find(s=>/mayor_octavius/i.test(s.key)) || sheets[0];
  const mayor = {x: cv.width/2, y: cv.height/2, dir:0, img: mayorSheet?.img };
  const keys = {};
  onkeydown = e=>{ keys[e.key.toLowerCase()]=true; };
  onkeyup   = e=>{ keys[e.key.toLowerCase()]=false; };

  const npcSrc = sheets.filter(s=>!/mayor_octavius/i.test(s.key));
  const npcs = [];
  const count = Math.min(14, npcSrc.length);
  for(let i=0;i<count;i++){
    const s = npcSrc[i];
    npcs.push({x: 200+Math.random()*(cv.width-400), y: 160+Math.random()*(cv.height-220), dir:Math.floor(Math.random()*3), t:0, img:s.img});
  }

  function moveMayor(dt){
    const sp = 80;
    let vx=0, vy=0;
    if(keys['arrowleft']||keys['a']) vx-=1;
    if(keys['arrowright']||keys['d']) vx+=1;
    if(keys['arrowup']||keys['w']) vy-=1;
    if(keys['arrowdown']||keys['s']) vy+=1;
    const len = Math.hypot(vx,vy) || 1;
    mayor.x += (vx/len)*sp*dt;
    mayor.y += (vy/len)*sp*dt;
    if(Math.abs(vx)>Math.abs(vy)) mayor.dir = 2; else mayor.dir = vy>0?0:1; // 0=front,1=back,2=side-right
    mayor.x = Math.max(48, Math.min(cv.width-48, mayor.x));
    mayor.y = Math.max(96, Math.min(cv.height-48, mayor.y));
  }
  function wander(n, dt){
    n.t -= dt;
    if(n.t<=0){ n.t = 1+Math.random()*2; n.dir = Math.floor(Math.random()*3); n.vx=(Math.random()*2-1)*20; n.vy=(Math.random()*2-1)*20; }
    n.x += n.vx*dt; n.y += n.vy*dt;
    n.x = Math.max(48, Math.min(cv.width-48, n.x));
    n.y = Math.max(96, Math.min(cv.height-48, n.y));
  }

  let last = performance.now();
  function fmt(mins){const h=Math.floor(mins/60)%24,m=mins%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
  function tick(t){
    const dt = (t-last)/1000; last = t;
    if(!paused){ clock.textContent = fmt(gameMinutes += Math.floor((t%1000)/REAL_MS_PER_INGAME_MINUTE)); }
    renderMap();
    for(const n of npcs){ wander(n, dt); drawSheet(n.img, n.dir, 0, n.x, n.y, 1); }
    if(mayor.img) drawSheet(mayor.img, mayor.dir, 0, mayor.x, mayor.y, 1.05);
    requestAnimationFrame(tick);
  }

  btnStart.onclick=()=>{ paused=false; };
  btnPause.onclick=()=>{ paused=true; };
  document.getElementById('btnOptions').onclick=()=>alert('Options coming soon — this is the playable baseline build.');

  requestAnimationFrame(t=>{ last=t; tick(t); });
})();
