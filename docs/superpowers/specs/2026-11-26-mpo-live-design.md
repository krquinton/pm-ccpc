# MPO LIVE — design (approved 2026-11-26)

## Intent
One browser screen (`pm-ccpc/MPO LIVE/mpolive.html`) that is screen-shared on the livestream of the MPO Cup 2026 pool draw (one draw per category), plus a backend (`mpolive-setup.html`) to run it. Must be easy to operate live.

## Goals
- 5 views on `mpolive.html`: Countdown, Sponsors, Live Pool Draw, Schedule, Game Format.
- View switching from BOTH small on-screen icons (and keys 1–5) and the setup page; last one pressed wins.
- Icons auto-hide when the mouse is still (screen-share shows everything).
- Countdown: "Draw Assignment will commence in" + minutes set in setup. At zero shows "Draw is starting now" and stays (no auto switch).
- Sponsors: embed existing `../mpo-sponsors.html` (ccpc-1943f Firestore), loops.
- Draw: category **buckets** in setup (title, teams, 2/4 pools). "Draw this category" loads the bucket into the randomizer, switches the screen to Draw and starts. Result auto-saved into that bucket, CSV export per bucket.
- Schedule and Game Format: editable rows in setup (add/edit/delete/reorder), shown clean on screen; schedule grouped by date.

## Non-goals / anti-goals
- Do not modify the original `mpocup/apps/randomizer` or `mpo-sponsors.html`.
- No rewrite of the slot machine. No login (same no-auth style as the randomizer).

## Approaches
1. **Buckets in setup driving a copy of the randomizer (picked).** Reuses tested `draw.html`, one backend, per-category results kept.
2. Single team list + category dropdown — re-pasting teams live is error-prone.
3. New draw built into `mpolive.html` — re-implements tested code days before Nov 28; too risky.

## Decisions (Claude's calls, user approved)
- Data: Realtime DB of **mindoropickleballorg** under `mpolive/` (separate from the original randomizer's `mpo/`):
  - `mpolive/state {view, at}`
  - `mpolive/countdown {eyebrow, text, minutes, endAt, doneText}`
  - `mpolive/schedule [ {date, time, title, note} ]`
  - `mpolive/format [ {stage, game, win, time, advance} ]`
  - `mpolive/buckets/{id} {title, teams[], pools, order, result{at,seed,hash,pools}}`
  - `mpolive/rnd/{teams,config,cmd,status,screen,draw}` — used by the randomizer copy.
- Randomizer copy at `MPO LIVE/randomizer/draw.html`: paths `mpo/` → `mpolive/rnd/`, writes result to `mpolive/buckets/{config.bucket}/result`, forwards keys 1–5/F to the parent, footer logo `../../mpo-mark.png`.
- Iframes use `allow="autoplay; fullscreen"`; parent click unlocks the draw sound.
- Look: forest green / ball yellow / Archivo + Inter (same as sponsors & randomizer), fixed 1920×1080 stage scaled to fit.

## Left to the builder
Exact layout of Schedule/Format screens, setup page layout, small animations.
