/* Octopus In Action v1.1
   - Species-agnostic jobs
   - Economy, Level, Task spawner, Shop, Doors/Interiors, Pause + Speed
   - Retro UI, License-style contact card
   - Fallback asset loader (never blank)
*/

(() => {
  // ---------- Constants & Helpers ----------
  const TILE = 32;
  const CANVAS = document.getElementById('game');
  const CTX = CANVAS.getContext('2d');
  const W = CANVAS.width, H = CANVAS.height;

  const HUD_TIME = document.getElementById('hud-time');
  const HUD_DAY = document.getElementById('hud-day');
  const HUD_MONEY = document.getElementById('hud-money');
  const HUD_LEVEL = document.getElementById('hud-level');
  const BTN_SPEED = document.getElementById('btn-speed');
  const BTN_PAUSE = document.getElementById('btn-pause');
  const BTN_MAIL = document.getElementById('btn-mailbox');
  const BTN_BUILD = document.getElementById('btn-build');
  const BTN_REPORT = document.getElementById('btn-report');

  const DLG_CARD = document.getElementById('contact-card');
  const CC_CLOSE = document.getElementById('cc-close');
  const CC_NAME = document.getElementById('cc-name');
  const CC_RACE = document.getElementById('cc-race');
  const CC_RACE_LEG = document.getElementById('cc-race-legend');
  const CC_AGE = document.getElementById('cc-age');
  const CC_ADDR = document.getElementById('cc-address');
  const CC_JOB = document.getElementById('cc-job');
  const CARD_CAN = document.getElementById('license-portrait');
  const CARD_CTX = CARD_CAN.getContext('2d');

  const DLG_SHOP = document.getElementById('shop');
  const SHOP_LIST = document.getElementById('shop-list');
  const SHOP_CLOSE = document.getElementById('shop-close');

  const DLG_MAIL = document.getElementById('mailbox');
  const MAIL_LIST = document.getElementById('mailbox-list');
  const MAIL_CLOSE = document.getElementById('mailbox-close');

  const DLG_BUILD = document.getElementById('build');
  const BUILD_LIST = document.getElementById('build-list');
  const BUILD_CLOSE = document.getElementById('build-close');

  const TOAST = document.getElementById('toast');

  const SPECIES_LEGEND = { O:'Octopus', OT:'Otter', B:'Beaver', D:'Dolphin', L:'Lobster' };
  const SPECIES_TINT = { O:'#9a6b98', OT:'#4b8ed0', B:'#7a5b43', D:'#7ea5af', L:'#c74a4f' };

  function toast(msg){
    TOAST.textContent = msg;
    TOAST.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> TOAST.style.display='none', 1500);
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function rint(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }

  function fmtTime(min){
    const h = Math.floor(min/60)%24, m = min%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  // Image loading with fallback chain and final procedural silhouette
  async function loadSpriteWithFallback(primaryBase, fallbackBase){
    const tryLoad = (base) => new Promise((res,rej)=>{
      const img = new Image();
      img.onload = ()=>res(img);
      img.onerror = ()=>rej(new Error(base));
      img.src = `${base}.png`;
    });
    try{ return await tryLoad(primaryBase); }
    catch{
      try{ return await tryLoad(fallbackBase); }
      catch{
        // Procedural placeholder
        const c = document.createElement('canvas'); c.width=32; c.height=32;
        const x = c.getContext('2d');
        x.fillStyle = '#0e1324'; x.fillRect(0,0,32,32);
        x.fillStyle = '#506'; x.fillRect(8,6,16,20);
        x.fillStyle = '#fff'; x.fillRect(12,10,2,2);
        return c;
      }
    }
  }

  // ---------- Game State ----------
  const Game = {
    day: 1,
    timeMinutes: 9*60,
    paused: false,
    timeSpeed: 1,
    money: 250,
    mayorXP: 0,
    mayorLevel: 1,
    tech: { shop_permits: true },
    citizens: [],
    buildings: [],
    tasks: [],
    rngSeed: Date.now(),
    currentScene: { kind:'overworld', id:null },
    player: { x: 12*TILE, y: 8*TILE, speed: 80, dir:'down', inside:false },
    inputs: { up:false, down:false, left:false, right:false },
    taskAccumulator: 0, // in-game minutes since last spawn roll
  };

  // ---------- World Layout (very light-weight) ----------
  // Place: City Hall, Shop, 5 Residentials. Door is center bottom tile of footprint.
  function createBuildings(){
    const lot = (name, type, x, y) => ({
      id: name.toLowerCase().replace(/\s+/g,'_'),
      type,
      name,
      capacity: type==='res'?5:0,
      occupants: [],
      door: { x: x+2*TILE, y: y+3*TILE }, // center bottom of 5x4
      bounds: { x, y, w: 5*TILE, h: 4*TILE },
      interior: { id: `${type}_${name}`, spawn: {x: 4*TILE, y: 6*TILE } },
      enterOnTile: true
    });
    const B = [];
    B.push(lot('City Hall','civic', 6*TILE, 2*TILE));
    B.push(lot('OctoMart','shop',  1*TILE, 2*TILE));
    const names = [
      'Beaver Dam Commons','Otterly Homes','Claw & Order Lofts','Fin & Feather Flats','Cephalopod Suites'
    ];
    let rx = 1, ry = 8;
    names.forEach((nm,i)=>{
      B.push(lot(nm,'res', rx*TILE, ry*TILE));
      rx += 7;
      if(rx > 20){ rx = 1; ry += 6; }
    });
    Game.buildings = B;
  }

  // ---------- Citizens ----------
  const FIRST_NAMES = ['Sandy','Marlin','Rita','Dale','Tina','Larry','Poppy','Cleo','Otto','Bea','Finn','Luna','Coral','Jet'];
  const LAST_NAMES  = ['Current','Deepnote','Damson','Beaverly','Clawson','Clawsworth','Rivera','Foam','Kelp','Tide','Hollow','Ink','Brine'];
  const SPECIES = ['OT','B','D','L']; // mayor is O
  const AGES = ['Child','Teen','Adult','Elder'];

  function makeCitizen(id, overrides={}){
    const c = {
      id,
      name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      species: rand(SPECIES),
      age: rand(AGES),
      homeBuildingId: null,
      jobBuildingId: null,
      jobRole: 'Unemployed',
      scheduleProfile: 'worker',
      state: { pos:{x: rint(2,26)*TILE, y: rint(10,17)*TILE}, dir:'down', inside:false, target:null, taskBubble:false },
      portraitKey: '',
      ...overrides
    };
    // Age profile → schedule profile
    c.scheduleProfile = (c.age==='Teen')?'teen': (c.age==='Child'?'child': (c.age==='Elder'?'elder':'worker'));
    return c;
  }

  // Seed population: 1 Mayor (player avatar is separate), ~14 townsfolk (fills residentials 3 each)
  function initCitizens(){
    const list = [];
    const count = 15; // adjust as needed
    for(let i=0;i<count;i++){
      list.push(makeCitizen(`c${i+1}`));
    }
    // Ensure enough Adults/Teens for roles
    // Nudge some to Adult/Teen
    for(let i=0;i<list.length;i++){
      if(i<8) list[i].age='Adult';
      else if(i<10) list[i].age='Teen';
    }
    Game.citizens = list;
  }

  function assignHomes(){
    const res = Game.buildings.filter(b=>b.type==='res');
    let ridx = 0;
    Game.citizens.forEach(c=>{
      const b = res[ridx % res.length];
      if(b.occupants.length < 3){ // init 3 occupants per res
        c.homeBuildingId = b.id;
        b.occupants.push(c.id);
      }else{
        ridx++;
        const b2 = res[ridx % res.length];
        c.homeBuildingId = b2.id;
        b2.occupants.push(c.id);
      }
    });
  }

  const JOBS = [
    'Mail Clerk','Analyst','Custodian','Greeter','Filer','Clerk','Runner','Cashier','Stocker','Reception'
  ];

  function findBuildingByType(type){ return Game.buildings.find(b=>b.type===type); }
  function findBuildingByName(name){ return Game.buildings.find(b=>b.name===name); }

  function assignJobs(){
    const adults = Game.citizens.filter(c=>c.age==='Adult');
    const teens = Game.citizens.filter(c=>c.age==='Teen');

    adults.forEach((npc,i)=>{
      npc.jobRole = JOBS[i % JOBS.length];
      // Randomly send to city hall or shop for variety
      const b = (i%2===0)? findBuildingByName('City Hall') : findBuildingByName('OctoMart');
      npc.jobBuildingId = b.id;
    });

    if(teens.length){
      teens[0].jobRole = 'Intern';
      teens[0].jobBuildingId = findBuildingByName('City Hall').id;
      if(teens[1]){
        teens[1].jobRole = 'Pool Assistant';
        // any residential is fine; use first
        teens[1].jobBuildingId = Game.buildings.find(b=>b.type==='res').id;
      }
    }
  }

  // ---------- Tasks ----------
  function spawnTaskIfNeeded(dtMinutes){
    Game.taskAccumulator += dtMinutes;
    if(Game.taskAccumulator < 10) return; // check roughly every 10 minutes
    Game.taskAccumulator = 0;

    // target ~2–6 tasks/day per 10 adults
    const adults = Game.citizens.filter(c=>c.age==='Adult');
    const baseRate = adults.length / 10; // 1.0 ~ 10 adults
    const chance = clamp(0.25 * baseRate, 0.1, 0.35); // per roll
    if(Math.random() < chance){
      const pool = Math.random()<0.15 ? Game.citizens.filter(c=>c.age==='Teen') : adults;
      if(pool.length===0) return;
      const who = rand(pool);
      const targetB = who.jobBuildingId ? Game.buildings.find(b=>b.id===who.jobBuildingId) : findBuildingByType('civic');
      const t = {
        id: `t${Date.now()}`,
        kind: 'ticket',
        fromCitizenId: who.id,
        targetBuildingId: targetB.id,
        hoursRequired: 1,
        payout: rint(15,40),
        xp: rint(8,16),
        createdAt: Game.timeMinutes,
        expiresAt: Game.timeMinutes + rint(60,180),
        status: 'new'
      };
      Game.tasks.push(t);
      // bubble
      who.state.taskBubble = true;
      redrawMailbox();
    }
  }

  function acceptTask(tid){
    const t = Game.tasks.find(x=>x.id===tid);
    if(!t) return;
    t.status = 'accepted';
    const who = Game.citizens.find(c=>c.id===t.fromCitizenId);
    if(who) who.state.taskBubble = false;
    toast('Task accepted.');
    redrawMailbox();
  }

  function completeTask(tid){
    const t = Game.tasks.find(x=>x.id===tid);
    if(!t || t.status!=='accepted') return;
    t.status = 'complete';
    Game.money += t.payout;
    addXP(t.xp);
    toast(`Task complete +$${t.payout}, +${t.xp}xp`);
    redrawMailbox();
  }

  // ---------- Level / XP ----------
  function levelThreshold(L){ return 100 * L; }
  function addXP(xp){
    Game.mayorXP += xp;
    while(Game.mayorXP >= levelThreshold(Game.mayorLevel)){
      Game.mayorXP -= levelThreshold(Game.mayorLevel);
      Game.mayorLevel++;
      toast(`Level Up! Now Level ${Game.mayorLevel}`);
    }
  }

  // ---------- Shop ----------
  const SHOP_ITEMS = [
    { id:'coffee', name:'Coffee Voucher', price:10, desc:'A warm perk. (Flavor item)', effect: (g)=>{} },
    { id:'permit', name:'Permit Stamp', price:50, desc:'Allows one residential upgrade.', effect: (g)=>{ g.tech.permitTokens = (g.tech.permitTokens||0)+1; } },
    { id:'stationery', name:'Stationery Pack', price:30, desc:'+10% payout on next task.', effect: (g)=>{ g.tech.nextTaskBonus = 0.1; } },
    { id:'watch', name:'Pocket Watch', price:80, desc:'Task speed ×1.2 for the day.', effect: (g)=>{ g.tech.taskSpeed = 1.2; } },
  ];

  function openShop(){
    SHOP_LIST.innerHTML = '';
    SHOP_ITEMS.forEach(it=>{
      const el = document.createElement('div');
      el.className='item';
      el.innerHTML = `
        <div class="meta">
          <div><b>${it.name}</b> <span class="price">$${it.price}</span></div>
          <div class="small">${it.desc}</div>
        </div>
        <button class="btn" data-id="${it.id}">Buy</button>
      `;
      el.querySelector('button').onclick = ()=>{
        if(Game.money < it.price){ toast('Not enough money'); return; }
        Game.money -= it.price;
        it.effect(Game);
        toast(`Purchased ${it.name}`);
      };
      SHOP_LIST.appendChild(el);
    });
    DLG_SHOP.showModal();
  }

  // ---------- Build / Upgrades (minimal) ----------
  function openBuild(){
    BUILD_LIST.innerHTML = '';
    const upg = document.createElement('div');
    upg.className='build-item';
    upg.innerHTML = `
      <div class="meta">
        <div><b>Upgrade Residential (+2 capacity)</b> <span class="price">$100</span></div>
        <div class="small">Requires Level 2 or a Permit Stamp token.</div>
      </div>
      <button class="btn" id="btn-upgrade-res">Upgrade</button>
    `;
    upg.querySelector('#btn-upgrade-res').onclick = ()=>{
      if(Game.mayorLevel<2 && !(Game.tech.permitTokens>0)){ toast('Need Lv2 or a Permit token.'); return; }
      if(Game.money<100){ toast('Not enough money'); return; }
      const res = Game.buildings.find(b=>b.type==='res');
      if(!res){ toast('No residential found'); return; }
      Game.money -= 100;
      res.capacity += 2;
      if(Game.tech.permitTokens) Game.tech.permitTokens--;
      toast(`Upgraded ${res.name} capacity → ${res.capacity}`);
    };
    BUILD_LIST.appendChild(upg);
    DLG_BUILD.showModal();
  }

  // ---------- Mailbox UI ----------
  function redrawMailbox(){
    MAIL_LIST.innerHTML = '';
    Game.tasks.forEach(t=>{
      const who = Game.citizens.find(c=>c.id===t.fromCitizenId);
      const b = Game.buildings.find(x=>x.id===t.targetBuildingId);
      const el = document.createElement('div');
      el.className='mail';
      el.innerHTML = `
        <div class="meta">
          <div><b>Request from ${who?who.name:'Citizen'}</b> <span class="small">${b?b.name:'Somewhere'}</span></div>
          <div class="small">Hours: ${t.hoursRequired}, Payout: $${t.payout}, XP: ${t.xp} — <i>${t.status}</i></div>
        </div>
        <div>
          ${t.status==='new' ? '<button class="btn">Accept</button>' :
            t.status==='accepted' ? '<button class="btn">Complete</button>' :
            '<span class="small">Done</span>'}
        </div>
      `;
      const btn = el.querySelector('button');
      if(btn){
        btn.onclick = ()=>{
          if(t.status==='new') acceptTask(t.id);
          else if(t.status==='accepted'){
            const bonus = Game.tech.nextTaskBonus||0;
            if(bonus>0){ Game.money += Math.round(t.payout*bonus); Game.tech.nextTaskBonus=0; }
            const speed = Game.tech.taskSpeed||1;
            // simulate time requirement (instant for v1.1; speed reserved for future timing)
            completeTask(t.id);
          }
        };
      }
      MAIL_LIST.appendChild(el);
    });
  }

  // ---------- Input ----------
  window.addEventListener('keydown', (e)=>{
    if(e.repeat) return;
    if(e.key==='ArrowUp' || e.key==='w') Game.inputs.up = true;
    if(e.key==='ArrowDown' || e.key==='s') Game.inputs.down = true;
    if(e.key==='ArrowLeft' || e.key==='a') Game.inputs.left = true;
    if(e.key==='ArrowRight' || e.key==='d') Game.inputs.right = true;
    if(e.key==='p'){ togglePause(); }
  });
  window.addEventListener('keyup', (e)=>{
    if(e.key==='ArrowUp' || e.key==='w') Game.inputs.up = false;
    if(e.key==='ArrowDown' || e.key==='s') Game.inputs.down = false;
    if(e.key==='ArrowLeft' || e.key==='a') Game.inputs.left = false;
    if(e.key==='ArrowRight' || e.key==='d') Game.inputs.right = false;
  });

  BTN_PAUSE.onclick = ()=> togglePause();
  function togglePause(){
    Game.paused = !Game.paused;
    BTN_PAUSE.textContent = Game.paused?'Resume':'Pause';
  }

  const SPEEDS = [1, 1.5, 2];
  BTN_SPEED.onclick = ()=>{
    const idx = SPEEDS.indexOf(Game.timeSpeed);
    const next = SPEEDS[(idx+1)%SPEEDS.length];
    Game.timeSpeed = next;
    BTN_SPEED.textContent = `Speed ×${next}`;
  };

  BTN_MAIL.onclick = ()=> { redrawMailbox(); DLG_MAIL.showModal(); };
  MAIL_CLOSE.onclick = ()=> DLG_MAIL.close();

  BTN_BUILD.onclick = ()=> openBuild();
  BUILD_CLOSE.onclick = ()=> DLG_BUILD.close();

  SHOP_CLOSE.onclick = ()=> DLG_SHOP.close();

  BTN_REPORT.onclick = ()=>{
    const dump = {
      v:'1.1', day:Game.day, time:Game.timeMinutes, money:Game.money, level:Game.mayorLevel,
      citizens:Game.citizens, buildings:Game.buildings, tasks:Game.tasks
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump,null,2)], {type:'application/json'}));
    a.download = `oia_report_v11_d${Game.day}.json`;
    a.click();
  };

  // ---------- Drawing ----------
  function drawWorld(){
    // ground
    CTX.fillStyle = '#203052';
    CTX.fillRect(0,0,W,H);

    // simple grid for readability
    CTX.strokeStyle = '#2a3043';
    CTX.lineWidth = 1;
    for(let x=0;x<W;x+=TILE){ CTX.beginPath(); CTX.moveTo(x,0); CTX.lineTo(x,H); CTX.stroke(); }
    for(let y=0;y<H;y+=TILE){ CTX.beginPath(); CTX.moveTo(0,y); CTX.lineTo(W,y); CTX.stroke(); }

    // draw buildings (fallback façades)
    for(const b of Game.buildings){
      // façade rectangle
      CTX.fillStyle = (b.type==='shop')?'#2d5a43' : (b.type==='civic'?'#3a3a4e':'#4a334a');
      CTX.fillRect(b.bounds.x, b.bounds.y, b.bounds.w, b.bounds.h);
      // door
      CTX.fillStyle = '#c8b27a';
      CTX.fillRect(b.door.x, b.door.y-8, TILE, 8);
      // sign
      CTX.fillStyle = '#111'; CTX.fillRect(b.bounds.x+TILE, b.bounds.y+6, 3*TILE, 10);
      CTX.fillStyle = '#eae5c5'; CTX.font = '10px Verdana';
      CTX.fillText(b.name.length>14? b.name.slice(0,14)+'…' : b.name, b.bounds.x+TILE+3, b.bounds.y+15);
    }

    // draw citizens (dots w/ tint) + task bubbles
    Game.citizens.forEach(c=>{
      if(c.state.inside) return; // not visible outside
      const tint = SPECIES_TINT[c.species] || '#789';
      // shadow
      CTX.fillStyle = 'rgba(0,0,0,.45)';
      CTX.beginPath(); CTX.ellipse(c.state.pos.x+16, c.state.pos.y+26, 8, 3, 0, 0, Math.PI*2); CTX.fill();
      // body
      CTX.fillStyle = tint;
      CTX.fillRect(c.state.pos.x+12, c.state.pos.y+8, 8, 16);
      CTX.fillStyle = '#fff';
      CTX.fillRect(c.state.pos.x+14, c.state.pos.y+12, 2, 2); // simple eye
      // task bubble
      if(c.state.taskBubble){
        CTX.fillStyle = '#ffd966';
        CTX.fillRect(c.state.pos.x+20, c.state.pos.y, 10, 10);
        CTX.fillStyle = '#000';
        CTX.fillText('!', c.state.pos.x+22, c.state.pos.y+9);
      }
    });

    // player (Mayor)
    // shadow
    CTX.fillStyle = 'rgba(0,0,0,.45)';
    CTX.beginPath(); CTX.ellipse(Game.player.x+16, Game.player.y+26, 10, 4, 0, 0, Math.PI*2); CTX.fill();
    // body
    CTX.fillStyle = SPECIES_TINT.O;
    CTX.fillRect(Game.player.x+10, Game.player.y+6, 12, 18);
    // hat
    CTX.fillStyle = '#111'; CTX.fillRect(Game.player.x+10, Game.player.y+2, 12, 4);
    CTX.fillStyle = '#222'; CTX.fillRect(Game.player.x+12, Game.player.y, 8, 2);
    // monocle
    CTX.fillStyle = '#e6c15b'; CTX.fillRect(Game.player.x+18, Game.player.y+12, 2, 2);
  }

  function drawInterior(){
    // simple interior grid
    CTX.fillStyle = '#1f2433';
    CTX.fillRect(0,0,W,H);
    CTX.fillStyle = '#303a58';
    for(let x=0;x<W;x+=TILE) for(let y=0;y<H;y+=TILE){ CTX.fillRect(x,y,TILE-1,TILE-1); }

    const b = Game.buildings.find(bb=>bb.id===Game.currentScene.id);
    if(!b) return;
    CTX.fillStyle = '#c8b27a';
    CTX.fillRect(4*TILE, 7*TILE, TILE, 6); // door area
    CTX.fillStyle = '#ddd';
    CTX.font = '12px Verdana';
    CTX.fillText(`${b.name} Interior`, 12, 20);

    if(b.type==='shop'){
      CTX.fillStyle = '#2d5a43';
      CTX.fillRect(6*TILE, 3*TILE, 6*TILE, 2*TILE); // counter
      CTX.fillStyle = '#fff';
      CTX.fillText('Counter', 6*TILE+8, 3*TILE+20);
      // hint
      CTX.fillStyle = '#a8cef1';
      CTX.fillText('Walk to counter to open Shop', 12, 40);
    }
  }

  // ---------- Simulation ----------
  function update(dt){
    if(Game.paused) return;

    // time flow
    Game.timeMinutes += Math.floor(dt * Game.timeSpeed);
    if(Game.timeMinutes >= 24*60){
      Game.timeMinutes = 9*60; // new work day starts at 9:00 for simplicity
      Game.day++;
    }

    // NPC movement (very light wander & schedule)
    Game.citizens.forEach(c=>{
      if(c.state.inside) return;
      const h = Math.floor(Game.timeMinutes/60)%24;
      const prob = (h>=9&&h<17) ? 0.2 : (h>=17&&h<22 ? 0.15 : 0.05);
      if(Math.random()<prob*dt/1000){
        const dx = rint(-1,1)*TILE, dy = rint(-1,1)*TILE;
        const nx = clamp(c.state.pos.x + dx, 0, W-TILE);
        const ny = clamp(c.state.pos.y + dy, 0, H-TILE);
        c.state.pos.x = nx; c.state.pos.y = ny;
      }
    });

    // task generator
    spawnTaskIfNeeded( Math.max(1, Math.floor(dt * Game.timeSpeed / 1000)) ); // approx 1 min per sec at ×1
  }

  function gui(){
    HUD_TIME.textContent = fmtTime(Game.timeMinutes);
    HUD_DAY.textContent = Game.day;
    HUD_MONEY.textContent = Game.money;
    HUD_LEVEL.textContent = Game.mayorLevel;
  }

  function step(ts){
    if(!step._t) step._t = ts;
    const dt = ts - step._t; step._t = ts;

    // move player
    if(!Game.paused){
      const sp = Game.player.speed * (Game.timeSpeed);
      const dx = (Game.inputs.right?1:0) - (Game.inputs.left?1:0);
      const dy = (Game.inputs.down?1:0) - (Game.inputs.up?1:0);
      Game.player.x = clamp(Game.player.x + dx*sp*dt/1000, 0, W-TILE);
      Game.player.y = clamp(Game.player.y + dy*sp*dt/1000, 0, H-TILE);
    }

    update(dt);
    gui();

    // scene
    if(Game.currentScene.kind==='overworld') drawWorld();
    else drawInterior();

    // door auto-enter/exit
    handleDoors();

    requestAnimationFrame(step);
  }

  function rectContains(b, x,y){
    return x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h;
  }

  function handleDoors(){
    const px = Game.player.x, py = Game.player.y;
    if(Game.currentScene.kind==='overworld'){
      for(const b of Game.buildings){
        if(Math.abs(px - b.door.x) < 8 && Math.abs(py - b.door.y) < 8){
          // enter
          Game.currentScene = { kind:'interior', id:b.id };
          // move player to interior spawn
          Game.player.x = 4*TILE; Game.player.y = 7*TILE;
          toast(`Entered ${b.name}`);
          if(b.type==='shop') openShopOnApproach = false; // reset
          break;
        }
      }
    }else{
      // exit when near interior exit tile
      if(Math.abs(px - 4*TILE) < 8 && Math.abs(py - 7*TILE) < 8){
        Game.currentScene = { kind:'overworld', id:null };
        // place player outside building door (center bottom)
        const b = Game.buildings.find(bb=>bb.id===Game.currentScene.id); // null
        // fallback to City Hall area
        Game.player.x = 6*TILE + 2*TILE; Game.player.y = 2*TILE + 3*TILE;
        toast('Back outside');
      }
      // shop counter open
      const b = Game.buildings.find(bb=>bb.id===Game.currentScene.id);
      if(b && b.type==='shop'){
        const nearCounter = (Math.abs(Game.player.x - 7*TILE)< 20) && (Math.abs(Game.player.y - 4*TILE)< 20);
        if(nearCounter) openShop();
      }
    }
  }
  let openShopOnApproach = false;

  // ---------- Contact Card (click on citizen) ----------
  CANVAS.addEventListener('click', (e)=>{
    const rect = CANVAS.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // find clicked citizen (simple hitbox)
    const hit = Game.citizens.find(c=>{
      if(c.state.inside) return false;
      const x = c.state.pos.x+12, y = c.state.pos.y+8;
      return (mx>=x && mx<=x+8 && my>=y && my<=y+16);
    });
    if(hit){ showContactCard(hit); }
  });

  function showContactCard(c){
    CC_NAME.textContent = c.name;
    CC_RACE.textContent = c.species;
    CC_RACE_LEG.textContent = `(${SPECIES_LEGEND[c.species]||'Unknown'})`;
    CC_AGE.textContent = c.age;
    const home = Game.buildings.find(b=>b.id===c.homeBuildingId);
    const apt = 101 + (home?home.occupants.indexOf(c.id):0);
    CC_ADDR.textContent = `${home?home.name:'Unknown'}, Apt ${apt}`;
    CC_JOB.textContent = c.jobRole||'Unemployed';

    // portrait silhouette
    CARD_CTX.fillStyle = '#0e1324';
    CARD_CTX.fillRect(0,0,48,48);
    CARD_CTX.fillStyle = SPECIES_TINT[c.species] || '#789';
    CARD_CTX.fillRect(10,8,28,32);
    CARD_CTX.fillStyle = '#fff';
    CARD_CTX.fillRect(22,18,2,2);

    DLG_CARD.showModal();
  }
  CC_CLOSE.onclick = ()=> DLG_CARD.close();

  // ---------- Init ----------
  function init(){
    createBuildings();
    initCitizens();
    assignHomes();
    assignJobs();
    requestAnimationFrame(step);
  }

  init();
})();
