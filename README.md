# Octopus In Action — Patch v1.152b

This is a stable HTML/CSS/JS build with a minimal loop, HUD, menus, mailbox stub, and a fallback-aware asset loader.

- **Version:** v1.152b
- **Build Time:** 2025-11-09 00:24:50

## Folder layout
- `/index.html`, `/style.css`, `/script.js`
- `/assets/sprites/` (with `manifest.json` and fallbacks)
- `/assets/tiles/`
- `/assets/ui/`
- `/docs/` (design archives)

## Asset fallback order
1. `assets/sprites/latest/` (newest art)
2. `assets/sprites/public_domain/` (safe placeholders)
3. `assets/sprites/legacy/` (v1.1 basic)

Missing art is replaced by temporary placeholders and logged as **Art-blocked** in issues.

## Local preview
Open `index.html` in a browser or run a tiny server:

```
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Set up LogRocket
Edit `index.html` and replace `YOUR_PROJECT_ID_HERE` with your LogRocket app ID.

## GitHub & Vercel quick start
1. Create a new branch: `git checkout -b hotfix/v1.152b`
2. Add files: `git add .`
3. Commit: `git commit -m "Patch v1.152b: menus+HUD, fallback loader, sprites manifest"`
4. Push: `git push -u origin hotfix/v1.152b`
5. Open a Pull Request to `main` and merge when ready.
6. Vercel auto-deploys from `main`. Confirm deployment completes.
7. Tag the release (optional): `git tag v1.152b && git push --tags`

## Credits
- Mayor Octavius sprite: provided by project (see `assets/sprites/latest/`).
- Placeholders: programmatically generated (temporary).

