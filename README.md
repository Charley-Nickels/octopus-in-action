# Octopus In Action — Alpha v1.150

A humorous small-town **government sim + light narrative** built for the web.  
**Engine:** custom HTML/CSS/JS (no Unity). **Target:** Web (Vercel) + desktop browsers.

## Core Features
- **Clock:** 1 real min = 1 in-game hour; days roll over automatically.
- **Workday:** Tasks only progress **9–5**; nightly slowdown and day/night fade.
- **Mailbox & Tasks:** Letters deliver tasks/reports; Accept/Reject; progress visible.
- **NPC Routines:** Citizens (6) follow schedules (work/lunch/wander/home) and obey walkable tiles.
- **Dialogue:** Choice buttons (Accept / Dismiss / Contact Card).
- **HUD/UI:** Clock, day, budget, sat, mode, mailbox badge; pause menu; credits roll.
- **Factions:** Dolphin, Beaver, Lobster tints + contact-card variants.
- **Fallbacks:** Missing art/audio auto-fallbacks (no crashes).

## File Structure
```
/index.html
/style.css
/script.js
/assets/
  /sprites/
  /tiles/
  /ui/
  /audio/
CORE_MEMORY_ARCHIVE.md
README.md
CHANGELOG.md
testing_checklist.md
/CREDITS/
```
## Credits
- **Studio:** Atlas Forge Interactive (“Our Studio”)
- **Art:** Mayor Octavius (in-project). NPC placeholders and tiles are **CC0** created for this build.
- **Audio:** UI click (silent placeholder) — **CC0**.
- See `/CREDITS` for detailed attributions.

## Local Run
Open `index.html` in a modern browser. Or serve locally:
```bash
python3 -m http.server 5173
# visit http://localhost:5173/
```

## Deploy to GitHub + Vercel
1. Create a new branch in your repo named **Alpha-v.1.150**.
2. Upload the contents of this folder to that branch (keep structure).
3. In Vercel, set the project to deploy from **Alpha-v.1.150** (or merge to `main` when ready).
4. No build step needed (static site). Ensure `index.html` is at repo root.

## Notes
- This build includes robust fallbacks and is safe to ship even if some art is pending.
- See `testing_checklist.md` for full QA steps.
