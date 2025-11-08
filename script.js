/* Octopus In Action v1.1.1 — Hotfix */
(() => {
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
  const BTN_HELP = document.getElementById('btn-help');

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

  const DLG_TALK = document.getElementById('talk');
  const TALK_BODY = document.getElementById('talk-body');
  const TALK_CLOSE = document.getElementById('talk-close');

  const DLG_HELP = document.getElementById('controls');
  const HELP_CLOSE = document.getElementById('controls-close');

  const TOAST = document.getElementById('toast');
  const HINT = document.getElementById('interact-hint');

  const SPECIES_LEGEND = { O:'Octopus', OT:'Otter', B:'Beaver', D:'Dolphin', L:'Lobster' };
  const SPECIES_TINT = { O:'#9a6b98', OT:'#4b8ed0', B:'#7a5b43', D:'#7ea5af', L:'#c74a4f' };

  function toast(msg){
    TOAST.textContent = msg;
    TOAST.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> TOAST.style.display='none', 1600);
  }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function rint(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
  function fmtTime(min){
    const h = Math.floor(min/60)%24, m = Math.floor(min%60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function rectsOverlap(ax,ay,aw,ah, bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  const FALLBACK_BASE = '/assets/fallback';
  async function tryLoadPng(path){
    return new Promise((res,rej)=>{
      const img = new Image();
      img.onload = ()=>res(img);
      img.onerror = ()=>rej();
      img.src = path;
    });
  }

  const Game = {
    day: 1,
    timeMinutes: 9*60,
    paused: false,
    timeSpeed: 1,
    _timeCarry: 0,
    money: 250,
    mayorXP: 0,
    mayorLevel: 1,
    tech: { shop_permits: true },
    citizens: [],
    buildings: [],
    tasks: [],
    rngSeed: Date.now(),
    currentScene: { kind:'overworld', id:null },
    lastEnteredBuildingId: null,
    player: { x: 12*TILE, y: 8*TILE, speed: 80, dir:'down', inside:false, w:20, h:22 },
    inputs: { up:false, down:false, left:false, right:false, interact:false },
    taskAccumulator: 0
  };

  function createBuildings(){
    const lot = (name, type, x, y) => ({
        id: name.toLowerCase().replace(/\s+/g,'_'),
        type, name,
        capacity: type==='res'?5:0,
        occupants: [],
        doorRect: { x: x+2*TILE, y: y+3*TILE, w: TILE, h: 10 },
        bounds: { x, y, w: 5*TILE, h: 4*TILE },
        interior: { id: `${type}_${name}`, spawn: {x: 4*TILE, y: 7*TILE } },
    });
    const B = [];
    B.push(lot('City Hall','civic', 6*TILE, 2*TILE));
    B.push(lot('OctoMart','shop',  1*TILE, 2*TILE));
    const names = ['Beaver Dam Commons','Otterly Homes','Claw & Order Lofts','Fin & Feather Flats','Cephalopod Suites'];
    let rx = 1, ry = 8;
    names.forEach((nm,i)=>{
      B.push(lot(nm,'res', rx*TILE, ry*TILE));
      rx += 7;
      if(rx > 20){ rx = 1; ry += 6; }
    });
    Game.buildings = B;
  }

  const FIRST = ['Sandy','Marlin','Rita','Dale','Tina','Larry','Poppy','Cleo','Otto','Bea','Finn','Luna','Coral','Jet'];
  const LAST  = ['Current','Deepnote','Damson','Beaverly','Clawson','Clawsworth','Rivera','Foam','Kelp','Tide','Hollow','Ink','Brine'];
  const SPECIES = ['OT','B','D','L'];
  const AGES = ['Child','Teen','Adult','Elder'];
  function makeCitizen(id, overrides={}){
    const c = {
      id,
      name: `${rand(FIRST)} ${rand(LAST)}`,
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
    c.scheduleProfile = (c.age==='Teen')?'teen': (c.age==='Child'?'child': (c.age==='Elder'?'elder':'worker'));
    return c;
  }
  function initCitizens(){
    const list = [];
    const count = 15;
    for(let i=0;i<count;i++) list.push(makeCitizen(`c${i+1}`));
    for(let i=0;i<list.length;i++){
      if(i<8) list[i].age='Adult';
      else if(i<12) list[i].age='Teen';
    }
    Game.citizens = list;
  }
  function assignHomes(){
    const res = Game.buildings.filter(b=>b.type==='res');
    let ridx = 0;
    Game.citizens.forEach(c=>{
      const b = res[ridx % res.length];
      if(b.occupants.length < 3){
        c.homeBuildingId = b.id; b.occupants.push(c.id);
      }else{
        ridx++;
        const b2 = res[ridx % res.length];
        c.homeBuildingId = b2.id; b2.occupants.push(c.id);
      }
    });
  }
  const JOBS = ['Mail Clerk','Analyst','Custodian','Greeter','Filer','Clerk','Runner','Cashier','Stocker','Reception'];
  function findByName(nm){ return Game.buildings.find(b=>b.name===nm); }
  function assignJobs(){
    const adults = Game.citizens.filter(c=>c.age==='Adult');
    const teens = Game.citizens.filter(c=>c.age==='Teen');
    adults.forEach((npc,i)=>{
      npc.jobRole = JOBS[i % JOBS.length];
      const b = (i%2===0)? findByName('City Hall') : findByName('OctoMart');
      npc.jobBuildingId = b.id;
    });
    if(teens[0]){ teens[0].jobRole='Intern'; teens[0].jobBuildingId=findByName('City Hall').id; }
    if(teens[1]){ teens[1].jobRole='Pool Assistant'; teens[1].jobBuildingId=Game.buildings.find(b=>b.type==='res').id; }
  }

  function spawnTaskIfNeeded(dtMinutes){
    Game.taskAccumulator += dtMinutes;
    if(Game.taskAccumulator < 10) return;
    Game.taskAccumulator = 0;

    const adults = Game.citizens.filter(c=>c.age==='Adult');
    const baseRate = Math.max(1, adults.length / 10);
    const chance = Math.min(0.35, 0.25 * baseRate);
    if(Math.random() < chance){
      const pool = Math.random()<0.15 ? Game.citizens.filter(c=>c.age==='Teen') : adults;
      if(pool.length===0) return;
      const who = rand(pool);
      const targetB = who.jobBuildingId ? Game.buildings.find(b=>b.id===who.jobBuildingId) : findByName('City Hall');
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
      who.state.taskBubble = true;
      redrawMailbox();
    }
  }

  function acceptTask(tid){
    const t = Game.tasks.find(x=>x.id===tid);
    if(!t) return;
    t.status='accepted';
    const who = Game.citizens.find(c=>c.id===t.fromCitizenId);
    if(who) who.state.taskBubble=false;
    toast('Task accepted.');
    redrawMailbox();
  }
  function completeTask(tid){
    const t = Game.tasks.find(x=>x.id===tid);
    if(!t || t.status!=='accepted') return;
    t.status='complete';
    const bonus = Game.tech.nextTaskBonus||0;
    const payout = t.payout + Math.round(t.payout*bonus);
    Game.money += payout;
    Game.tech.nextTaskBonus = 0;
    addXP(t.xp);
    toast(`Task complete +$${payout}, +${t.xp}xp`);
    redrawMailbox();
  }

  function levelThreshold(L){ return 100 * L; }
  function addXP(xp){
    Game.mayorXP += xp;
    while(Game.mayorXP >= levelThreshold(Game.mayorLevel)){
      Game.mayorXP -= levelThreshold(Game.mayorLevel);
      Game.mayorLevel++;
      toast(`Level Up! Now Level ${Game.mayorLevel}`);
    }
  }

  const SHOP_ITEMS = [
    { id:'coffee', name:'Coffee Voucher', price:10, desc:'A warm perk. (Flavor item)', effect: (g)=>{} },
    { id:'permit', name:'Permit Stamp', price:50, desc:'Allows one residential upgrade.', effect: (g)=>{ g.tech.permitTokens = (g.tech.permitTokens||0)+1; } },
    { id:'stationery', name:'Stationery Pack', price:30, desc:'+10% payout on next task.', effect: (g)=>{ g.tech.nextTaskBonus = 0.10; } },
    { id:'watch', name:'Pocket Watch', price:80, desc:'(Future) Faster task processing.', effect: (g)=>{ g.tech.taskSpeed = 1.2; } },
  ];
  function openShop(){
    SHOP_LIST.innerHTML='';
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
        Game.money -= it.price; it.effect(Game);
        toast(`Purchased ${it.name}`);
      };
      SHOP_LIST.appendChild(el);
    });
    DLG_SHOP.showModal();
  }

  function openBuild(){
    BUILD_LIST.innerHTML='';
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
      if(Game.mayorLevel<2 && !(Game.tech.permitTokens>0)){ toast('Need Lv2 or Permit token.'); return; }
      if(Game.money<100){ toast('Not enough money'); return; }
      const res = Game.buildings.find(b=>b.type==='res');
      if(!res){ toast('No residential found'); return; }
      Game.money -= 100;
      res.capacity += 2;
      if(Game.tech.permitTokens) Game.tech.permitTokens--;
      toast(`Upgraded ${res.name} → capacity ${res.capacity}`);
    };
    BUILD_LIST.appendChild(upg);
    DLG_BUILD.showModal();
  }

  function redrawMailbox(){
    MAIL_LIST.innerHTML='';
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
          else if(t.status==='accepted') completeTask(t.id);
        };
      }
      MAIL_LIST.appendChild(el);
    });
  }

  const SPEEDS = [1, 1.5, 2];
  BTN_PAUSE.onclick = ()=> togglePause();
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
  BTN_HELP.onclick = ()=> DLG_HELP.showModal();
  HELP_CLOSE.onclick = ()=> DLG_HELP.close();

  TALK_CLOSE.onclick = ()=> DLG_TALK.close();

  function togglePause(){
    Game.paused = !Game.paused;
    BTN_PAUSE.textContent = Game.paused?'Resume':'Pause';
  }

  const KEYS = {};
  window.addEventListener('keydown', (e)=>{
    if(e.repeat) return;
    KEYS[e.key]=true;
    if(e.key==='ArrowUp'||e.key==='w') Game.inputs.up = true;
    if(e.key==='ArrowDown'||e.key==='s') Game.inputs.down = true;
    if(e.key==='ArrowLeft'||e.key==='a') Game.inputs.left = true;
    if(e.key==='ArrowRight'||e.key==='d') Game.inputs.right = true;
    if(e.key==='e' || e.key==='E') Game.inputs.interact = true;
    if(e.key==='p' || e.key==='P') togglePause();
  });
  window.addEventListener('keyup', (e)=>{
    KEYS[e.key]=false;
    if(e.key==='ArrowUp'||e.key==='w') Game.inputs.up = false;
    if(e.key==='ArrowDown'||e.key==='s') Game.inputs.down = false;
    if(e.key==='ArrowLeft'||e.key==='a') Game.inputs.left = false;
    if(e.key==='ArrowRight'||e.key==='d') Game.inputs.right = false;
    if(e.key==='e' || e.key==='E') Game.inputs.interact = false;
  });

  function drawWorld(){
    CTX.fillStyle = '#203052'; CTX.fillRect(0,0,W,H);
    CTX.strokeStyle = '#2a3043'; CTX.lineWidth=1;
    for(let x=0;x<W;x+=TILE){ CTX.beginPath(); CTX.moveTo(x,0); CTX.lineTo(x,H); CTX.stroke(); }
    for(let y=0;y<H;y+=TILE){ CTX.beginPath(); CTX.moveTo(0,y); CTX.lineTo(W,y); CTX.stroke(); }

    for(const b of Game.buildings){
      CTX.fillStyle = (b.type==='shop')?'#2d5a43' : (b.type==='civic'?'#3a3a4e':'#4a334a');
      CTX.fillRect(b.bounds.x, b.bounds.y, b.bounds.w, b.bounds.h);
      CTX.fillStyle = '#c8b27a';
      CTX.fillRect(b.doorRect.x, b.doorRect.y, b.doorRect.w, b.doorRect.h);
      CTX.fillStyle = '#111'; CTX.fillRect(b.bounds.x+TILE, b.bounds.y+6, 3*TILE, 10);
      CTX.fillStyle = '#eae5c5'; CTX.font = '10px Verdana';
      const label = b.name.length>14? b.name.slice(0,14)+'…' : b.name;
      CTX.fillText(label, b.bounds.x+TILE+3, b.bounds.y+15);
    }

    Game.citizens.forEach(c=>{
      if(c.state.inside) return;
      drawCitizen(c.state.pos.x, c.state.pos.y, c.species, c.id.startsWith('c'));
      if(c.state.taskBubble){
        CTX.fillStyle = '#ffd966'; CTX.fillRect(c.state.pos.x+20, c.state.pos.y, 10, 10);
        CTX.fillStyle = '#000'; CTX.fillText('!', c.state.pos.x+22, c.state.pos.y+9);
      }
    });

    drawMayor(Game.player.x, Game.player.y);
  }

  function drawInterior(){
    CTX.fillStyle = '#1f2433'; CTX.fillRect(0,0,W,H);
    CTX.fillStyle = '#303a58';
    for(let x=0;x<W;x+=TILE){ for(let y=0;y<H;y+=TILE){ CTX.fillRect(x,y,TILE-1,TILE-1); } }
    const b = Game.buildings.find(bb=>bb.id===Game.lastEnteredBuildingId);
    if(!b) return;
    CTX.fillStyle = '#ddd'; CTX.font = '12px Verdana';
    CTX.fillText(`${b.name} Interior`, 12, 20);
    if(b.type==='shop'){
      CTX.fillStyle = '#2d5a43';
      CTX.fillRect(6*TILE, 3*TILE, 6*TILE, 2*TILE);
      CTX.fillStyle = '#fff'; CTX.fillText('Counter', 6*TILE+8, 3*TILE+20);
      CTX.fillStyle = '#a8cef1'; CTX.fillText('E: Open Shop', 12, 42);
    }
    CTX.fillStyle = '#c8b27a'; CTX.fillRect(4*TILE, 7*TILE, TILE, TILE/2);
  }

  function drawMayor(px,py){
    CTX.fillStyle='rgba(0,0,0,.45)'; CTX.beginPath(); CTX.ellipse(px+16, py+26, 10, 4, 0, 0, Math.PI*2); CTX.fill();
    CTX.fillStyle = SPECIES_TINT.O; CTX.fillRect(px+10, py+6, 12, 18);
    CTX.fillStyle = '#111'; CTX.fillRect(px+10, py+2, 12, 4);
    CTX.fillStyle = '#222'; CTX.fillRect(px+12, py, 8, 2);
    CTX.fillStyle = '#e6c15b'; CTX.fillRect(px+18, py+12, 2, 2);
    CTX.fillStyle = '#2b2b2b'; CTX.fillRect(px+8, py+10, 2, 14);
    CTX.fillStyle = '#c8a347'; CTX.fillRect(px+8, py+24, 2, 2);
  }
  function drawCitizen(px,py,species){
    CTX.fillStyle='rgba(0,0,0,.45)'; CTX.beginPath(); CTX.ellipse(px+16, py+26, 8, 3, 0, 0, Math.PI*2); CTX.fill();
    const tint = SPECIES_TINT[species] || '#789';
    CTX.fillStyle = tint; CTX.fillRect(px+10, py+6, 12, 12);
    if(species==='OT'){ CTX.fillStyle='#2D6AAA'; } else { CTX.fillStyle='#58656E'; }
    CTX.fillRect(px+10, py+14, 12, 7);
    CTX.fillStyle = '#fff'; CTX.fillRect(px+18, py+11, 2, 2);
  }

  function nearestCitizen(radius=TILE*1.2){
    let best=null, bestD=radius;
    Game.citizens.forEach(c=>{
      if(c.state.inside) return;
      const cx=c.state.pos.x+16, cy=c.state.pos.y+16;
      const px=Game.player.x+16, py=Game.player.y+16;
      const d=Math.hypot(px-cx, py-cy);
      if(d<bestD){ best=c; bestD=d; }
    });
    return best;
  }

  function showContactCard(c){
    CC_NAME.textContent = c.name;
    CC_RACE.textContent = c.species;
    CC_RACE_LEG.textContent = `(${SPECIES_LEGEND[c.species]||'Unknown'})`;
    CC_AGE.textContent = c.age;
    const home = Game.buildings.find(b=>b.id===c.homeBuildingId);
    const apt = 101 + (home?home.occupants.indexOf(c.id):0);
    CC_ADDR.textContent = `${home?home.name:'Unknown'}, Apt ${apt}`;
    CC_JOB.textContent = c.jobRole||'Unemployed';
    CARD_CTX.fillStyle = '#0e1324'; CARD_CTX.fillRect(0,0,48,48);
    CARD_CTX.fillStyle = SPECIES_TINT[c.species] || '#789';
    CARD_CTX.fillRect(10,8,28,32);
    CARD_CTX.fillStyle = '#fff'; CARD_CTX.fillRect(22,18,2,2);
    DLG_CARD.showModal();
  }

  function talkTo(c){
    TALK_BODY.innerHTML = `
      <p><b>${c.name}</b>: "Good day, Mayor."</p>
      <p><b>Age:</b> ${c.age} &nbsp; <b>Species:</b> ${SPECIES_LEGEND[c.species]||c.species}</p>
      <p><b>Role:</b> ${c.jobRole}</p>
    `;
    DLG_TALK.showModal();
  }

  function enterIfOnDoor(){
    const p = Game.player;
    const prect = { x:p.x, y:p.y, w:p.w, h:p.h };
    for(const b of Game.buildings){
      const d = b.doorRect;
      if(rectsOverlap(prect.x,prect.y,prect.w,prect.h, d.x,d.y,d.w,d.h)){
        Game.currentScene = { kind:'interior', id:b.id };
        Game.lastEnteredBuildingId = b.id;
        Game.player.x = 4*TILE; Game.player.y = 7*TILE;
        toast(`Entered ${b.name}`);
        return true;
      }
    }
    return false;
  }

  function exitIfAtInteriorDoor(){
    const b = Game.buildings.find(bb=>bb.id===Game.lastEnteredBuildingId);
    if(!b) return false;
    const nearExit = Math.abs(Game.player.x - 4*TILE) < 10 && Math.abs(Game.player.y - 7*TILE) < 10;
    if(nearExit){
      Game.currentScene = { kind:'overworld', id:null };
      Game.player.x = b.doorRect.x; Game.player.y = b.doorRect.y - (Game.player.h-8);
      toast('Back outside');
      return true;
    }
    return false;
  }

  function updateTime(dtMs){
    const minutesToAdd = (dtMs/1000) * Game.timeSpeed;
    Game.timeMinutes += minutesToAdd;
    if(Game.timeMinutes >= 24*60){
      Game.timeMinutes = 9*60;
      Game.day++;
    }
    HUD_TIME.textContent = fmtTime(Game.timeMinutes);
    HUD_DAY.textContent = Game.day;
    HUD_MONEY.textContent = Game.money;
    HUD_LEVEL.textContent = Game.mayorLevel;
  }

  function update(dt){
    if(Game.paused) return;
    const sp = Game.player.speed;
    const dx = (Game.inputs.right?1:0) - (Game.inputs.left?1:0);
    const dy = (Game.inputs.down?1:0) - (Game.inputs.up?1:0);
    Game.player.x = clamp(Game.player.x + dx*sp*dt/1000, 0, W - Game.player.w);
    Game.player.y = clamp(Game.player.y + dy*sp*dt/1000, 0, H - Game.player.h);
    updateTime(dt);
    spawnTaskIfNeeded( dt/1000 );
    Game.citizens.forEach(c=>{
      if(c.state.inside) return;
      const h = Math.floor(Game.timeMinutes/60)%24;
      const prob = (h>=9&&h<17) ? 0.08 : (h>=17&&h<22 ? 0.05 : 0.02);
      if(Math.random() < prob){
        const sx = clamp(c.state.pos.x + rint(-1,1)*TILE, 0, W-TILE);
        const sy = clamp(c.state.pos.y + rint(-1,1)*TILE, 0, H-TILE);
        c.state.pos.x = sx; c.state.pos.y = sy;
      }
    });
  }

  let lastTs = 0;
  function frame(ts){
    if(!lastTs) lastTs = ts;
    const dt = ts - lastTs; lastTs = ts;
    if(!Game.paused){
      let showHint = false;
      if(Game.currentScene.kind==='overworld'){
        const prect = { x:Game.player.x, y:Game.player.y, w:Game.player.w, h:Game.player.h };
        for(const b of Game.buildings){
          const d = b.doorRect;
          if(rectsOverlap(prect.x,prect.y,prect.w,prect.h, d.x,d.y,d.w,d.h)){ showHint = true; break; }
        }
        const nc = nearestCitizen();
        if(nc) showHint = true;
      } else {
        const b = Game.buildings.find(bb=>bb.id===Game.lastEnteredBuildingId);
        if(b && b.type==='shop'){
          const nearCounter = (Math.abs(Game.player.x - 7*TILE)< 20) && (Math.abs(Game.player.y - 4*TILE)< 20);
          if(nearCounter) showHint = true;
        }
        const nearExit = Math.abs(Game.player.x - 4*TILE) < 10 && Math.abs(Game.player.y - 7*TILE) < 10;
        if(nearExit) showHint = true;
      }
      HINT.style.display = showHint ? 'block' : 'none';
    } else {
      HINT.style.display = 'none';
    }
    update(dt);
    if(Game.currentScene.kind==='overworld') drawWorld(); else drawInterior();
    requestAnimationFrame(frame);
  }

  function doInteract(){
    if(Game.currentScene.kind==='overworld'){
      if(enterIfOnDoor()) return;
      const nc = nearestCitizen();
      if(nc){ talkTo(nc); return; }
    } else {
      const b = Game.buildings.find(bb=>bb.id===Game.lastEnteredBuildingId);
      if(b && b.type==='shop'){
        const nearCounter = (Math.abs(Game.player.x - 7*TILE)< 20) && (Math.abs(Game.player.y - 4*TILE) < 20);
        if(nearCounter){ openShop(); return; }
      }
      if(exitIfAtInteriorDoor()) return;
    }
  }

  CANVAS.addEventListener('click', (e)=>{
    const rect = CANVAS.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = Game.citizens.find(c=>{
      if(c.state.inside) return false;
      const x = c.state.pos.x+10, y = c.state.pos.y+6;
      return (mx>=x && mx<=x+12 && my>=y && my<=y+19);
    });
    if(hit) showContactCard(hit);
  });

  window.addEventListener('keydown', (e)=>{
    if((e.key==='e' || e.key==='E') && !e.repeat){ doInteract(); }
  });

  CC_CLOSE.onclick = ()=> DLG_CARD.close();

  function init(){
    createBuildings();
    initCitizens();
    assignHomes();
    assignJobs();
    requestAnimationFrame(frame);
  }

  BTN_REPORT.onclick = ()=>{
    const dump = {
      v:'1.1.1',
      day:Game.day, time:Game.timeMinutes, money:Game.money, level:Game.mayorLevel,
      citizens:Game.citizens, buildings:Game.buildings, tasks:Game.tasks
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump,null,2)], {type:'application/json'}));
    a.download = `oia_report_v111_d${Game.day}.json`;
    a.click();
  };

  init();
})();