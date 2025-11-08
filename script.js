// script.js — hotfix: guaranteed first-frame render + init guard + color tweaks
(() => {
  const $ = s => document.querySelector(s);

  // Ensure DOM is ready before wiring anything
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start();
  }

  function start(){
    const TILE = 32;
    const canvas = $("#game");
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const COLS = Math.floor(W/TILE), ROWS = Math.floor(H/TILE);

    // ---- sprite manager (safe) ----
    const Sprites = {
      images:{},
      async loadAuto(){
        const candidates = {
          mayor:["mayor.png","mayor.jpg","Mayor.png","Mayor.jpg"],
          Beaver:["beaver.png","beaver.jpg","Beaver.png","Beaver.jpg"],
          Dolphin:["dolphin.png","dolphin.jpg","Dolphin.png","Dolphin.jpg"],
          Lobster:["lobster.png","lobster.jpg","Lobster.png","Lobster.jpg"],
        };
        for (const [key, list] of Object.entries(candidates)){
          for (const name of list){
            try{
              const img = new Image();
              img.src = name;
              await img.decode();       // will throw if missing; we catch & continue
              this.images[key] = img;
              break;
            }catch(e){}
          }
        }
      },
      setFromFile(key, file){
        const img = new Image();
        img.onload = ()=>{ this.images[key]=img; };
        img.src = URL.createObjectURL(file);
      },
      draw(key, x, y, size=TILE){
        const img = this.images[key];
        if(!img) return false;
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s)/2, sy = (img.height - s)/2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, sx, sy, s, s, x - size/2, y - size/2, size, size);
        return true;
      }
    };

    // drag & drop sprites
    canvas.addEventListener("dragover", e=>e.preventDefault());
    canvas.addEventListener("drop", e=>{
      e.preventDefault();
      for (const f of e.dataTransfer.files){
        const n = (f.name||"").toLowerCase();
        if(n.includes("mayor")) Sprites.setFromFile("mayor",f);
        else if(n.includes("beaver")) Sprites.setFromFile("Beaver",f);
        else if(n.includes("dolphin")) Sprites.setFromFile("Dolphin",f);
        else if(n.includes("lobster")) Sprites.setFromFile("Lobster",f);
      }
    });

    // ---- state ----
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let paused = false;
    let speedIdx = 0; const speeds = [1,1.5,2];
    let msPerGameMinute = 1000;
    let minuteBucket = 0;    // (fixed) single accumulator
    let dayIndex = 0, hour = 9, minute = 0;

    const hud = { budget:500, level:1, xp:0, sat:50 };
    const SPECIES = ["Beaver","Dolphin","Lobster","Octopus"];
    const SPEC_LETTER = {Beaver:"B",Dolphin:"D",Lobster:"L",Octopus:"O"};
    const AGES = ["Child","Teen","Adult","Elder"];

    const world = { tiles:[], buildings:[], empties:[] };
    const solid = new Set();
    const doors = [];
    const citizens = [];
    const activeTasks = [];
    const mayor = { x:10, y:10, speed:4, effects:{speedMul:1,payoutMul:1} };

    // ---- UI wiring ----
    $("#pauseBtn").addEventListener("click", ()=>{ paused=!paused; $("#pauseBtn").textContent = paused? "Resume":"Pause"; });
    $("#speedBtn").addEventListener("click", ()=>{ speedIdx=(speedIdx+1)%speeds.length; $("#speedBtn").textContent=`Speed:${speeds[speedIdx]}x`; });
    $("#buildBtn").addEventListener("click", ()=> openBuildMenu());
    $("#mailBtn").addEventListener("click", ()=> alert("Mailbox: tasks now arrive dynamically. Click “!” bubbles."));
    $("#helpBtn").addEventListener("click", ()=> openModal("#helpUI"));
    $("#closeHelp").addEventListener("click", closeModals);
    $("#spriteBtn").addEventListener("click", ()=> openModal("#spriteUI"));
    $("#closeSprites").addEventListener("click", closeModals);
    $("#closeCC").addEventListener("click", closeModals);
    $("#closeShop").addEventListener("click", closeModals);

    function openModal(sel){
      $("#modalOverlay").classList.remove("hidden");
      document.querySelectorAll(".modal").forEach(m=>m.classList.add("hidden"));
      $(sel).classList.remove("hidden");
    }
    function closeModals(){
      $("#modalOverlay").classList.add("hidden");
      document.querySelectorAll(".modal").forEach(m=>m.classList.add("hidden"));
    }

    const bindFile = (id,key)=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener("change", ()=>{
        const f = el.files && el.files[0];
        if(f) Sprites.setFromFile(key,f);
      });
    };
    bindFile("#fileMayor","mayor");
    bindFile("#fileBeaver","Beaver");
    bindFile("#fileDolphin","Dolphin");
    bindFile("#fileLobster","Lobster");

    // ---- helpers ----
    const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
    const choice = arr => arr[Math.floor(Math.random()*arr.length)];
    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

    function addBuilding(type,x,y,w,h,doorX,doorY,props={}){
      const id = world.buildings.length+1;
      const b = { id,type,name:props.name||type,x,y,w,h,door:{x:doorX,y:doorY},capacity:props.capacity||0,occupants:props.occupants||[],staff:props.staff||[] };
      world.buildings.push(b);
      for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) solid.add(`${i},${j}`);
      solid.delete(`${doorX},${doorY}`); doors.push({bldId:id,x:doorX,y:doorY});
      return b;
    }

    const punNames = {
      residential:["Beaver Dam Apts","Porpoise Place","Clawterhouse Flats","Inkling Inn","Barnacle Bend"]
    };

    function setupMap(){
      for(let r=0;r<ROWS;r++){ world.tiles[r]=[]; for(let c=0;c<COLS;c++) world.tiles[r][c]="grass"; }
      for(let c=0;c<COLS;c++){ world.tiles[12][c]="road"; world.tiles[13][c]="road"; }
      addBuilding("cityhall",3,4,5,4,5,8,{name:"City Hall"});
      addBuilding("shop",12,4,5,4,14,8,{name:"OctoMart"});
      const resCoords=[[3,16],[10,16],[17,16],[24,16],[31,16]];
      for(let k=0;k<5;k++){
        const [bx,by]=resCoords[k];
        addBuilding("residential",bx,by,5,4,bx+2,by+4,{name:punNames.residential[k]||`Resid ${k+1}`,capacity:5});
      }
      for(let i=0;i<6;i++) world.empties.push({x:5+i*6,y:2,w:3,h:2});
    }

    // citizens
    const firstNames = ["Bubba","Shelly","Clawdette","Finn","Waverly","Damien","Pebble","Coral","Riptide","Barnaby","Ingrid","Otto","Pearl","Kelp","Delta"];
    const lastNames  = ["McBeaverson","von Porpoise","Clawsby","Inkster","Brine","Silt","Rivera","Slick","Shelldon","Damgood","Salt","Tentakle","Fjord","Bubbles","Corral"];
    function makeCitizen(species,age){ return { id:citizens.length+1, name:`${choice(firstNames)} ${choice(lastNames)}`, species, age, home:null, job:null, x:rand(2,COLS-3), y:rand(14,ROWS-3), target:null, speed:2.2, hasTaskBubble:false, taskId:null }; }

    function assignHomesAndJobs(){
      const res = world.buildings.filter(b=>b.type==="residential");
      for(const b of res) b.occupants.length=0;
      // fill 3 per residential
      let idx=0;
      for(const b of res){
        for(let i=0;i<3;i++){
          const c = citizens[idx++ % citizens.length]; if(!c) break;
          b.occupants.push(c.id); c.home=b.id;
        }
      }
      const shop = world.buildings.find(b=>b.type==="shop");
      const hall = world.buildings.find(b=>b.type==="cityhall");
      const adults = citizens.filter(c=>c.age==="Adult");
      const teens  = citizens.filter(c=>c.age==="Teen");
      if(adults[0]){ adults[0].job=shop.id; shop.staff.push(adults[0].id); }
      if(teens[0]) { teens[0].job=shop.id;  shop.staff.push(teens[0].id);  }
      if(teens[1]) teens[1].job = res[0].id; // pool boy
      if(teens[2]) teens[2].job = hall.id;   // intern
      for(const a of adults.slice(1)) a.job = choice([shop.id,hall.id]);
    }

    function seedCitizens(){
      const total=15;
      const agePool=["Teen","Teen","Adult","Adult","Adult","Adult","Adult","Adult","Adult","Adult","Child","Child","Elder","Elder","Adult"];
      for(let i=0;i<total;i++){
        const age = agePool[i]||choice(AGES);
        const species = i<5? "Beaver" : choice(SPECIES);
        citizens.push(makeCitizen(species,age));
      }
      assignHomesAndJobs();
    }

    // build / shop / tasks (unchanged logic; omitted here for brevity in this comment)
    // … but still included below:

    const buildCatalog=[{type:"park",title:"Pocket Park",cost:200,level:2},{type:"kiosk",title:"Vendor Kiosk",cost:150,level:1}];
    let selectedBuild=null;
    function openBuildMenu(){
      const list=$("#buildList"); list.innerHTML="";
      buildCatalog.forEach(item=>{
        const row=document.createElement("div"); row.className="buildOption";
        row.innerHTML=`<div><b>${item.title}</b> <span class="cost">($${item.cost})</span> | Req LV ${item.level}</div><button class="btn">Select</button>`;
        row.querySelector("button").addEventListener("click",()=>selectedBuild=item);
        list.appendChild(row);
      });
      openModal("#buildUI");
    }
    canvas.addEventListener("click",(e)=>{
      const r=canvas.getBoundingClientRect(), mx=Math.floor((e.clientX-r.left)/TILE), my=Math.floor((e.clientY-r.top)/TILE);
      if(!paused && selectedBuild){
        if(hud.level>=selectedBuild.level && hud.budget>=selectedBuild.cost){
          let ok=true; for(let j=0;j<2;j++)for(let i=0;i<2;i++){ if(solid.has(`${mx+i},${my+j}`) || (world.tiles[my+j]||[])[mx+i]!=="grass") ok=false; }
          if(ok){ addBuilding(selectedBuild.type,mx,my,2,2,mx+1,my+2,{name:selectedBuild.title}); hud.budget-=selectedBuild.cost; selectedBuild=null; closeModals(); }
        }
      }else{
        // citizen click
        const c = citizens.find(cz=> Math.abs(cz.x-mx)<=0.5 && Math.abs(cz.y-my)<=0.5);
        if(c){ c.hasTaskBubble && c.taskId? openTaskModalForCitizen(c) : openContactCard(c); }
      }
    });

    const citizensPerRateBlock=10;
    let dailyTaskSpawnRange=[2,6], tasksSpawnedToday=0;
    const taskTexts=["Noise complaint mediation request.","Approve simple fence permit.","Park bench repair order.","Utility billing discrepancy inquiry.","Schedule town hall Q&A prep."];

    function spawnTask(){
      const free=citizens.filter(c=>!c.hasTaskBubble); if(!free.length) return;
      const c=choice(free);
      const t={id:activeTasks.length+1,citizenId:c.id,text:choice(taskTexts),reqHours:rand(1,3),doneHours:0,reward:rand(35,85),xp:rand(15,30),accepted:false,done:false};
      activeTasks.push(t); c.hasTaskBubble=true; c.taskId=t.id; tasksSpawnedToday++;
    }
    function openTaskModalForCitizen(c){
      const t=activeTasks.find(tt=>tt.id===c.taskId); if(!t) return;
      $("#taskText").textContent = `${t.text} (Needs ${t.reqHours}h)`;
      $("#acceptTask").onclick=()=>{ t.accepted=true; closeModals();
