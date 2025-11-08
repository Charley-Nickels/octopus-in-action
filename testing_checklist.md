# Testing Checklist (Alpha v1.150)

## Simulation & Time
- [ ] Clock advances: 1 real second = 1 in-game minute.
- [ ] Day rolls after 24 hours; Day counter increments.
- [ ] Tasks progress only 9:00–16:59; no progress after 17:00.

## Mailbox & Tasks
- [ ] New mail batch spawns at start of day (max ~4).
- [ ] Accept task adds to active list; Reject removes letter.
- [ ] Completing tasks pushes a report letter to Mailbox.

## NPCs
- [ ] 6 citizens spawn and wander within walkable areas.
- [ ] Work schedule: 9–12 and 13–17, gather near plaza.
- [ ] Lunch: 12–13, random wandering.
- [ ] Home/Inactive after 22:00.

## Dialogue
- [ ] Opening citizen dialog shows Accept / Dismiss / Contact Card.
- [ ] Accept inserts a 1-hour Clerk task into Mailbox.

## HUD/UI
- [ ] Mail badge updates when letters arrive/are removed.
- [ ] Pause menu toggles game loop; Credits roll opens/closes.
- [ ] Faction tint switch reflects on HUD shadow.

## Fallbacks
- [ ] Missing sprite/tile displays “Art Blocked” placeholder.
- [ ] Missing audio fails silently without errors.

## Cross-Browser
- [ ] Chrome / Edge / Firefox latest: verify rendering and input.
- [ ] Mobile Safari/Chrome: canvas scales, menus usable (optional).

