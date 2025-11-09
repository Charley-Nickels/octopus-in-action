
async function loadJSON(p){const r=await fetch(p);return r.json();}
function loadImage(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;});}
const rng=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;

(async()=>{
  const manifest = await loadJSON('patch_manifest.json');
  const cv = document.getElementById('game'); const ctx = cv.getContext('2d');
  const timeEl = document.getElementById('time');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnOptions = document.getElementById('btnOptions');
  const sfxClick = document.getElementById('sfxClick');
  if(manifest.sfx && manifest.sfx.length){ sfxClick.src = manifest.sfx[0]; }

  // Time system (slower): 1 in-game minute = 6000ms (10 min per real minute)
  const REAL_MS_PER_INGAME_MINUTE = manifest.time_scale?.REAL_MS_PER_INGAME_MINUTE ?? 6000;
  let gameMinutes = 9*60; // 09:00 start
  let paused = true;
  let lastTick = performance.now();

  function fmtTime(mins){const h=Math.floor(mins/60)%24, m=mins%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
  function tick(ts){
    const dt = ts - lastTick; lastTick = ts;
    if(!paused){ gameMinutes += Math.floor(dt / REAL_MS_PER_INGAME_MINUTE); }
    timeEl.textContent = fmtTime(gameMinutes);
    render();
    requestAnimationFrame(tick);
  }

  // Load tiles
  const tiles = {};
  tiles.grass = await loadImage(manifest.tiles.grass);
  tiles.path  = await loadImage(manifest.tiles.path);
  tiles.water = await loadImage(manifest.tiles.water);

  // Simple map: water band at top, path band center, grass elsewhere
  const ts=32;
  function renderMap(){
    for(let y=0;y<cv.height;y+=ts){
      for(let x=0;x<cv.width;x+=ts){
        let img = tiles.grass;
        if(y<ts*3) img = tiles.water;
        else if(y>=ts*5 && y<ts*7) img = tiles.path;
        ctx.drawImage(img,0,0,ts,ts,x,y,ts,ts);
      }
    }
  }

  // Load sprites
  const sprites = [];
  for(const s of manifest.sprites){
    const img = await loadImage(s.file);
    sprites.push({key:s.key, img});
  }
  // Mayor if present
  const mayor = sprites.find(s=>s.key==='mayor_octavius');

  // NPCs: pick a subset of available species_age keys
  const npcSprites = sprites.filter(s=>/_(child|teen|adult|elder)$/.test(s.key));
  const npcs = [];
  const count = Math.min(12, npcSprites.length);
  const used = new Set();
  for(let i=0;i<count;i++){
    let pick; let tries=0;
    do{ pick = npcSprites[rng(0, npcSprites.length-1)]; tries++; }while(used.has(pick.key) && tries<50);
    used.add(pick.key);
    npcs.push({ key: pick.key, img: pick.img, x: rng(2, (cv.width/ts)-3)*ts, y: rng(4, (cv.height/ts)-2)*ts });
  }

  function drawSheet(img, angleIndex){
    // Our standardized sheet is 2 rows x 3 cols; use male/front by default
    const cell=48;
    const sx = angleIndex*cell, sy = 0; // top row = male
    ctx.drawImage(img, sx, sy, cell, cell, 0, 0, cell, cell);
  }

  function render(){
    renderMap();
    // Draw NPCs
    for(const n of npcs){
      const cell=48;
      // angleIndex: 0=front,1=back,2=side-right. Pick based on time of day for variety
      const angle = Math.floor((gameMinutes/10)%3);
      ctx.drawImage(n.img, angle*cell, 0, cell, cell, n.x, n.y, cell, cell);
    }
    // Draw Mayor (center-ish)
    if(mayor){
      const cell=48; const angle=0;
      ctx.drawImage(mayor.img, angle*cell, 0, cell, cell, cv.width/2-24, cv.height/2-24, cell, cell);
    }
  }

  // UI
  function click(){ try{ sfxClick.currentTime=0; sfxClick.play(); }catch(e){} }
  btnStart.onclick = ()=>{ paused=false; click(); };
  btnPause.onclick = ()=>{ paused=true; click(); };
  btnOptions.onclick = ()=>{ alert('Options placeholder — SFX/UI wired.'); click(); };

  requestAnimationFrame(ts=>{ lastTick=ts; tick(ts); });
})();
