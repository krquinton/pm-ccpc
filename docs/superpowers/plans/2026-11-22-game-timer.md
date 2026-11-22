# Game Timer, Warm-up, Sponsors & Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable game timer (warm-up countdown, auto/manual start, threshold colours, estimated start on queue hover) to the admin and TV, move Show Sponsors to Tab 5, and lock the Leaderboard to the current session.

**Architecture:** All timing maths lives in one new pure-JS file `game-timer.js` (global `GameTimer`, no DOM, no Firebase) loaded by both `index.html` and `display.html`, and unit-tested with plain Node. The HTML files only read Firestore, call `GameTimer`, and paint. Settings live in `pkl-queue-events/displaySettings.gameTimer`; matches get one new field `warmupEndsAt`.

**Tech Stack:** Vanilla HTML/JS, Firebase Firestore (compat SDK already used), Node `assert` for tests (no npm deps).

**Spec:** `docs/superpowers/specs/2026-11-22-game-timer-design.md`

## Global Constraints

- One timer setting for all categories. Defaults: `gameMin: 15, warmupSec: 120, autoStart: true, warn1Min: 12, warn2Min: 14, finalSec: 20, enabled: false`.
- Game clock counts UP, shown as `MM:SS / 15:00`; after the cap shows `+M:SS OVER`.
- Levels by elapsed seconds `e`, cap `G = gameMin*60`: `normal` < warn1Min*60 ≤ `warn1` < warn2Min*60 ≤ `warn2` < G−finalSec ≤ `final` < G ≤ `over`.
- Colours: warm-up blue, warn1 yellow, warn2 orange, final red pulsing, over red solid. Same on admin and TV.
- `enabled: false` ⇒ behaviour identical to today.
- End match stays manual. No per-category settings.
- UI copy in the app's existing English style; follow existing button classes (`btn btn-ghost btn-sm`, overlays `.overlay`/`.show`).

## Review Focus

- Two admin tabs open when warm-up hits 0 → game must start exactly once with `startedAt === warmupEndsAt` (Task 3 guard via Firestore transaction).
- Settings changed while games are running → running clocks re-colour using the new values; no stored per-match copy (Task 1 test `levels follow cfg passed in`).
- Old matches with no `warmupEndsAt` (assigned before this release) → shown as manual "Not started", never auto-started (Task 1 test `assigned without warmupEndsAt`).
- Timer disabled → no warm-up written on assign, no colours, no tooltip estimate (Task 1 test + Task 3/5 checks).
- Over-time court in the estimate → treated as free "now", not in the past (Task 1 test `overdue court frees now`).

---

### Task 1: `game-timer.js` pure logic + tests

**Files:**
- Create: `game-timer.js`
- Create: `tests/game-timer.test.js`

**Interfaces:**
- Produces (global `GameTimer` in browser, `module.exports` in Node):
  - `DEFAULTS` — object with the Global Constraints defaults.
  - `normalize(cfg?: object) -> cfg` — merges DEFAULTS, coerces numbers.
  - `validate(cfg) -> string` — `''` if ok, else message. Rules: `gameMin` 1–90, `warmupSec` 0–900, `0 < warn1Min < warn2Min < gameMin`, `0 < finalSec < (gameMin − warn2Min)*60`.
  - `levelFor(elapsedSec, cfg) -> 'normal'|'warn1'|'warn2'|'final'|'over'`
  - `clockFor(match, cfg, now) -> { phase, secs, level }` where phase is
    `'none'` (not on court / disabled-and-assigned), `'warmup'` (secs = remaining, ceil), `'ready'` (warm-up done, manual mode, secs 0), `'playing'` (secs = elapsed; `level` set). For `status:'assigned'` with `autoStart` and `now ≥ warmupEndsAt`, return `playing` with elapsed from `warmupEndsAt` (TV keeps correct time before admin flips status). When `cfg.enabled` is false: playing → `level:'normal'`, assigned → `'none'`.
  - `formatClock(secs) -> 'MM:SS'`, `formatOver(secs) -> '+M:SS'`.
  - `estimateStarts({ courts, active, queue, cfg, now, allowsCourt }) -> { [matchId]: { startAt, court } }` — `courts`: array of court numbers; `active`: matches with status assigned/playing; `queue`: waiting+onhold in order; `allowsCourt(bucket, court) -> bool`. Returns `{}` when disabled.

- [ ] **Step 1: Write the failing tests** in `tests/game-timer.test.js` (plain `assert`, `const GT = require('../game-timer.js')`, cfg = `GT.normalize({enabled:true})`, `now = 1_000_000_000`):
  - `levelFor`: 0→normal, 719→normal, 720→warn1, 839→warn1, 840→warn2, 879→warn2, 880→final, 899→final, 900→over.
  - `levels follow cfg passed in`: `levelFor(600, normalize({enabled:true, warn1Min:10}))` → `warn1`.
  - `clockFor` warm-up: `{status:'assigned', warmupEndsAt: now+90_500}` → `{phase:'warmup', secs:91}`.
  - auto past warm-up: `{status:'assigned', warmupEndsAt: now-5000}` → `{phase:'playing', secs:5, level:'normal'}`.
  - manual past warm-up: same with `autoStart:false` → `{phase:'ready', secs:0}`.
  - `assigned without warmupEndsAt` → `{phase:'none'}`.
  - playing: `{status:'playing', startedAt: now-890_000}` → `{phase:'playing', secs:890, level:'final'}`.
  - disabled playing → level `normal`; disabled assigned with warmupEndsAt → phase `none`.
  - `validate(normalize({enabled:true}))` → `''`; `warn2Min: 11` → non-empty; `finalSec: 70` → non-empty.
  - `formatClock(905)`→`'15:05'`; `formatOver(12)`→`'+0:12'`.
  - `estimateStarts` basic: courts [1,2]; active: court1 playing startedAt now−600_000 (frees now+300s); court2 free; queue A, B, C (all allowed) → A: court 2 at now+120s; B: court 1 at now+300s+120s; C: court 2 at now+120s+900s+120s.
  - skips onhold: queue `[{id:'H', status:'onhold'}, A]` → no entry for H, A gets court 2.
  - court restriction: `allowsCourt` false for court 2 for bucket 'x' → A (bucket x) goes to court 1.
  - `overdue court frees now`: court1 playing startedAt now−1_200_000, only court → A startAt now+120s.
  - assigned in warm-up: court1 assigned warmupEndsAt now+60_000 → frees now+60s+900s.
  - disabled → `{}`.

- [ ] **Step 2: Run** `node tests/game-timer.test.js` — Expected: FAIL (`Cannot find module '../game-timer.js'`).

- [ ] **Step 3: Implement `game-timer.js`.** Wrap in an IIFE that assigns `window.GameTimer` when `window` exists and `module.exports` when `module` exists. Estimate algorithm:
```
freeAt[c] = now for each court
for m in active: base = playing ? startedAt : (warmupEndsAt || now + warmupSec*1000)
                 freeAt[m.court] = max(now, base + gameMin*60000)
for m in queue (skip status 'onhold'):
  c = allowed court with min freeAt (tie → lower court number); none → skip
  startAt = freeAt[c] + warmupSec*1000; out[m.id] = {startAt, court:c}
  freeAt[c] = startAt + gameMin*60000
```

- [ ] **Step 4: Run** `node tests/game-timer.test.js` — Expected: prints `all game-timer tests passed`, exit 0.

- [ ] **Step 5: Commit** `git add game-timer.js tests/game-timer.test.js && git commit -m "feat: game timer logic module"`

---

### Task 2: Timer settings modal (admin)

**Files:**
- Modify: `index.html` — Tab 3 toolbar (~line 451–458), overlays area (~line 682+), display-settings JS (~line 3300–3335); add `<script src="game-timer.js"></script>` before the main script.

**Interfaces:**
- Consumes: `GameTimer.normalize`, `GameTimer.validate`.
- Produces: global `function timerCfg() -> cfg` returning `GameTimer.normalize(displaySettings.gameTimer)`; used by Tasks 3 and 5.

- [ ] **Step 1:** Add `⏱ Game timer` button (`id="btnGameTimer"`, `btn btn-ghost btn-sm`) next to "⇅ Flip courts". Its label shows `⏱ Game timer · 15 min` when enabled, `⏱ Game timer · off` when not.
- [ ] **Step 2:** Add overlay `#gameTimerOverlay` with fields: Enabled switch, Game length (min), Warm-up (sec, shown as min:sec helper), "After warm-up" segmented Auto / Manual, 1st warning (min), 2nd warning (min), Final warning (sec before end). Buttons: `Save timer` / `Cancel`. Inline error from `GameTimer.validate` under the fields; Save disabled while invalid.
- [ ] **Step 3:** Save writes `displayRef.set({ gameTimer: cfg }, { merge:true })`, toast `Game timer saved.`. Add `timerCfg()`.
- [ ] **Step 4: Verify in browser:** open modal, set warn2 below warn1 → error shown, Save disabled; save valid values → reload page → values persist; button label updates.
- [ ] **Step 5: Commit** `git commit -am "feat: game timer settings modal"`

---

### Task 3: Warm-up, auto-start and colours on court cards (admin)

**Files:**
- Modify: `index.html` — `assignToCourt` (~3523), `backToQueue` (~3554), `startGame` (~3539), court-card render (~2730–2758), timer interval (~2845), CSS block (add `.court-timer.lv-warn1|warn2|final|over`, `.warmup-badge`, `@keyframes tpulse`).

**Interfaces:**
- Consumes: `timerCfg()`, `GameTimer.clockFor`, `formatClock`, `formatOver`.
- Produces: match field `warmupEndsAt: number|null`; function `autoStartDue()`.

- [ ] **Step 1:** `assignToCourt`: when `timerCfg().enabled`, write `warmupEndsAt: Date.now() + warmupSec*1000`; else `warmupEndsAt: null`. `backToQueue` and the reset/restore paths that set `startedAt:null` also set `warmupEndsAt: null`.
- [ ] **Step 2:** `startGame(matchDocId, opts?)`: accept `opts.startedAt`; run the status flip inside `db.runTransaction` that re-reads the match and aborts silently if `status !== 'assigned'` (prevents double start from two tabs). Participant `statusSince` uses the same `startedAt`.
- [ ] **Step 3:** Assigned card: replace static "Not started" area with `<div class="court-timer timer" data-mid="${m.id}">` and render by `clockFor`: `warmup` → blue badge `WARM-UP 1:42`; `ready` → `Ready` and Start button gets class `pulse`; `none` → current UI. Playing card shows `12:05 / 15:00` (or plain `12:05` when disabled) with `lv-*` class; over shows `15:00 / 15:00 +0:12 OVER`.
- [ ] **Step 4:** Change the 1s interval to look up each `.timer[data-mid]` match in `queueMatches` and repaint via `clockFor` (text + `lv-*` class + card border colour). Add `autoStartDue()` to the same tick: for each assigned match where `cfg.enabled && cfg.autoStart && warmupEndsAt && now ≥ warmupEndsAt && courtsActive()`, call `startGame(id, { startedAt: warmupEndsAt })` once (track ids in the existing `startingGames` set).
- [ ] **Step 5: Verify in browser** with temp settings (gameMin 2, warmup 10 s, warn1 1, warn2 1.5 → use whole min: gameMin 3, warn1 1, warn2 2, final 20): assign match → blue countdown → auto starts at 0 with clock 00:00 → yellow at 1:00 → orange 2:00 → red pulse 2:40 → `+0:05 OVER` after 3:00. Open a second admin tab during warm-up → only one start (check the match doc has one `startedAt` equal to `warmupEndsAt`). Switch to Manual → card shows Ready + pulsing Start and waits. Disable timer → assign shows old "Not started" UI and plain count-up.
- [ ] **Step 6: Commit** `git commit -am "feat: warm-up countdown, auto start and timer warnings on courts"`

---

### Task 4: TV display (`display.html`)

**Files:**
- Modify: `display.html` — add `<script src="game-timer.js"></script>`; displaySettings listener (~182) keeps `gameTimer`; court render (~225–232); timer tick; CSS.

**Interfaces:**
- Consumes: `GameTimer.normalize`, `clockFor`, `formatClock`, `formatOver`; match fields `warmupEndsAt`, `startedAt`.

- [ ] **Step 1:** Store `tvTimer = GameTimer.normalize(ds.gameTimer)` in the existing listener and re-render courts on change.
- [ ] **Step 2:** For assigned and playing matches render `<div class="tmr" data-mid>`; tick repaints by `clockFor`: warm-up = blue pill with label `WARM-UP` above a smaller countdown (clearly different from the big game clock); ready = `GET READY`; playing = big clock `12:05` with small `/ 15:00`, `lv-*` colours, final pulses; over = red `+0:12 OVER`. Disabled → today's look.
- [ ] **Step 3: Verify:** open `display.html` next to admin; run the Task 3 scenario; colours and phases change within 1 s of the admin; with auto-start, close the admin tab before warm-up ends → TV still switches to game clock at 0.
- [ ] **Step 4: Commit** `git commit -am "feat: TV shows warm-up and timer warnings"`

---

### Task 5: Estimated start tooltip on waiting queue

**Files:**
- Modify: `index.html` — `renderQueueList` (~2853), `updateWaitTimes` tick (~3117), CSS for `.est-tip`.

**Interfaces:**
- Consumes: `GameTimer.estimateStarts`, `timerCfg()`, `courtOrder()`/`COURTS`, `bucketAllowsCourt(bucket, court)`, `courtsActive()`.

- [ ] **Step 1:** Each queue row gets `title`-free custom tooltip `<div class="est-tip" data-mid>` shown on `:hover` and toggled on tap (`click` on the row body, not on buttons/drag handle).
- [ ] **Step 2:** Every tick (existing 1 s interval, throttle to every 5 s) compute `estimateStarts` and fill tips: `Est. start ~2:35 PM · Court 3 · in ~18 min`; when `startAt - now < 60 s` → `Est. start: anytime now · Court 3`; ON HOLD rows → `On hold — not estimated`; timer disabled → `Turn on the Game timer to see estimates`; courts not active → `Activate courts to see estimates`.
- [ ] **Step 3: Verify:** with 2 courts busy and 4 queued matches, hover each row → times increase in queue order and match the hand calculation from Task 1's basic test pattern; put row 1 on hold → row 2 takes its slot.
- [ ] **Step 4: Commit** `git commit -am "feat: estimated start time on queue hover"`

---

### Task 6: Move Show Sponsors to Tab 5; current-session-only Leaderboard

**Files:**
- Modify: `index.html` — Tab 3 toolbar line ~470 (remove `#btnShowSponsors`), sponsor list header ~529–530 (add button + update helper), leaderboard panel ~477–480, `renderSessionFilterOptions` ~3737, `renderLeaderboard` ~4345, listener ~4381.

- [ ] **Step 1:** Move the `#btnShowSponsors` element (same id, same handler at ~3461, same label toggle at ~3309) into the Sponsors list card header. Change helper text to `This is the order on the TV. Use ↑ ↓ to change it. Play it with 🎉 Show Sponsors.` Change the empty-sponsor toast to `Add a sponsor first.`
- [ ] **Step 2:** Remove the `Session` field from the Leaderboard toolbar; delete `lbSessionSel`, its listener, and the `lbSessionFilter` lines in `renderSessionFilterOptions`; `renderLeaderboard` uses `sessionState.currentSessionId` only. Add a small label `Current session: <name>` in the toolbar.
- [ ] **Step 3: Verify:** Tab 3 has no Show Sponsors; Tab 5 button shows/hides the TV showcase; Leaderboard shows only current session and no console errors (`renderSessionFilterOptions` still runs for Logs).
- [ ] **Step 4: Commit** `git commit -am "feat: Show Sponsors in Tab 5; leaderboard current session only"`

---

### Task 7: Final check

- [ ] **Step 1:** `node tests/game-timer.test.js` passes.
- [ ] **Step 2:** Full walk-through on admin + TV with timer on (auto and manual) and off; no console errors in either page.
- [ ] **Step 3:** Restore real settings (15 / 2:00 / 12 / 14 / 20 s) and push: `git push`.
