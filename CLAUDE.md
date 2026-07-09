# Banner Command: The Banners of Coronal

Browser RPG/strategy game. Vanilla HTML/CSS/JS, ZERO external dependencies, ZERO build tooling beyond `node build.js`. Deployed as a single HTML file to Hostinger shared hosting; must run 100% client-side.

## Design pillars (do not violate)
- FF6 party-split feeling + Ogre Battle squad maneuver + FFT intimate battlefields.
- The PARTY is the piece. Six interlocking layers: muster → deploy/reserve → fog/vision → maneuver/facing → ATB engagement → dual objectives (rout all vs. take start point). See docs/strategic-analysis.md before changing mechanics.
- SNES aesthetic: FF6 blue-gradient windows, pixel sprites, gold accents. No modern-flat UI.

## Architecture
- `index.html` — shell + screen containers (dev version links src files).
- `src/styles.css` — all styling. FF6 window = `.ffwin`.
- `src/a_data.js` — Store wrapper (window.storage → localStorage → memory; NEVER use bare localStorage), JOBS (26 jobs, tier1→tier2 branch at LV8→★ mastery LV16), sprites (canvas-generated 14px, palette per job), game state G, save/load, NODES (world map, 9 chapters), recruits.
- `src/b_screens.js` — title, world map, story/reward modals, party menu + promotions.
- `src/c_field.js` — muster screen, tactical field: MAPS templates (13x10, chars: . c # w b F C s), fog, guided orders (move/attack/defend/rest, facing ends turn), deployment (tower first, then deploy-or-reserve).
- `src/d_atb.js` — ATB popup battles (per-unit actions: attack/defend/special/retreat; defend front = taunt + half dmg; CHANGE ROWS waits for all bars then flips; commander ability menu with cooldowns), enemy field AI (flank-seeking), rewards/XP, boot.
- `dist/banners-of-coronal.html` — build output. THE deployable artifact.

## Commands
- Build: `node build.js`
- Test locally: `python3 -m http.server` then open index.html (dev) or dist file.
- There are no automated tests yet (backlog item #1).

## Conventions
- Single quotes, no semicolon dogma (match existing), tiny helpers `$`, `rnd`, `pick`, `clamp`.
- All new UI uses `.ffwin` window language + `.shead` section headers.
- Balance numbers live inline; when tuning, comment the old value.
- Any new persistent data goes through `Store`, keyed `boc-*`.

## Backlog (priority order)
1. Playtest pass ch.1–3: difficulty curve, XP rate, ATB pacing (tick 90ms, fill = (spd*2+8)*0.9).
2. Test harness: headless sim of ATB battles for balance (win% by comp/level).
3. Battle variety: per-node unique maps; weather/night modifiers.
4. Commander ability targeting UI (currently auto-target).
5. Sound (WebAudio chiptunes) behind a mute toggle — must not break sandboxed preview.
6. Real art pipeline: swap canvas sprites for user-provided base64 PNGs (keep single-file build).
7. Server-optional features (Hostinger has PHP/MySQL): cloud saves, shared leaderboard of open-ended hunt scores.
