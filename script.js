
async function loadJSON(p){const r=await fetch(p);return r.json();}
function loadImage(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;});}
(async()=>{
  const manifest = await loadJSON('patch_manifest.json');
  const cv = document.getElementById('game'); const ctx = cv.getContext('2d');
  const clock = document.getElementById('clock');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const REAL_MS_PER_INGAME_MINUTE = manifest.time_scale?.REAL_MS_PER_INGAME_MINUTE ?? 6000;
  let gameMinutes = 9*60, paused=true;

  const ts=32;
  const tiles = {
    grass: await loadImage(manifest.tiles.grass),
    path:  await loadImage(manifest.tiles.path),
    water: await loadImage(manifest.tiles.water)
  };
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
  for(const s of manifest.sprites){ sheets.push({ key:s.key, img: await loadImage(s.file) }); }
  const CELL=48;
  function draw(img, col, row, x, y, scale=1){
    const sx=col*CELL, sy=row*CELL, sw=CELL, sh=CELL;
    const dw=CELL*scale, dh=CELL*scale;
    ctx.drawImage(img, sx, sy, sw, sh, x-dw/2, y-dh/2, dw, dh);
  }

  const mayor = { img: sheets.find(s=>/mayor_octavius/i.test(s.key))?.img || sheets[0].img, x: cv.width/2, y: cv.height/2, dir:0 };
  const npcs = sheets.filter(s=>!/mayor_octavius/i.test(s.key)).slice(0,10).map((s,i)=>({img:s.img,x:240+i*60,y:320-Math.random()*120,dir:Math.floor(Math.random()*3),vx:0,vy:0,t:0}));
  const keys={}; onkeydown=e=>keys[e.key.toLowerCase()]=true; onkeyup=e=>keys[e.key.toLowerCase()]=false;

  function moveMayor(dt){
    const sp=90; let vx=0,vy=0;
    if(keys['a']||keys['arrowleft']) vx-=1;
    if(keys['d']||keys['arrowright']) vx+=1;
    if(keys['w']||keys['arrowup']) vy-=1;
    if(keys['s']||keys['arrowdown']) vy+=1;
    const len=Math.hypot(vx,vy)||1;
    mayor.x+= (vx/len)*sp*dt; mayor.y+= (vy/len)*sp*dt;
    if(Math.abs(vx)>Math.abs(vy)) mayor.dir = 2; else mayor.dir = vy>0?0:1;
    mayor.x=Math.max(48,Math.min(cv.width-48,mayor.x));
    mayor.y=Math.max(96,Math.min(cv.height-48,mayor.y));
  }
  function wander(n,dt){
    n.t-=dt; if(n.t<=0){n.t=0.8+Math.random()*1.8; n.vx=(Math.random()*2-1)*30; n.vy=(Math.random()*2-1)*30; n.dir=Math.floor(Math.random()*3);}
    n.x+=n.vx*dt; n.y+=n.vy*dt;
    n.x=Math.max(48,Math.min(cv.width-48,n.x));
    n.y=Math.max(96,Math.min(cv.height-48,n.y));
  }

  let last=performance.now();
  function fmt(mins){const h=Math.floor(mins/60)%24,m=mins%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
  function tick(t){
    const dt=(t-last)/1000; last=t;
    if(!paused){ gameMinutes += dt* (60*1000/REAL_MS_PER_INGAME_MINUTE); clock.textContent=fmt(Math.floor(gameMinutes)); }
    renderMap();
    for(const n of npcs){ wander(n,dt); draw(n.img, n.dir, 0, n.x, n.y, 1); }
    draw(mayor.img, mayor.dir, 0, mayor.x, mayor.y, 1.05);
    requestAnimationFrame(tick);
  }
  btnStart.onclick=()=>paused=false;
  btnPause.onclick=()=>paused=true;
  requestAnimationFrame(t=>{ last=t; tick(t); });
})();
