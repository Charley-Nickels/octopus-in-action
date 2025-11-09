# Testing Checklist (v1.152b)

## Smoke
- [ ] Page loads without console errors
- [ ] HUD renders and updates time
- [ ] Player moves with arrow keys
- [ ] Menu opens, toggles sandbox, closes
- [ ] Mailbox opens, generates letters, accept/dismiss works
- [ ] LogRocket records a session (with your project ID configured)

## Asset fallbacks
- [ ] Mayor sprite loads from `latest/` (then delete file to verify fallback)
- [ ] Tiles load from `/assets/tiles/`
- [ ] No broken image icons on page

## Regression
- [ ] Curfew/Work hours logic present in code (expand next patch)
- [ ] Build runs on Vercel deploy
