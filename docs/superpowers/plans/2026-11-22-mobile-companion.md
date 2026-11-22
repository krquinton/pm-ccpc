# Mobile Companion Implementation Plan

> Execution: inline (superpowers:executing-plans), same as the game-timer plan.

**Goal:** umpire.html (court login, warm-up/timer, Start, Rally/Side-out scoring, hold-to-record End match), Tab 6 in index.html, live score/serve on both TVs, uniform name size on TVs.
**Architecture:** pure scoring in `umpire-logic.js` (Node-tested). Umpire writes only `pm-umpire/{court}` (open collection); index.html (licensed) acts on `startReq` / `endReq` through the existing `startGame` and a new shared `finishMatch`. TVs read `pm-umpire`.
**Spec:** `docs/superpowers/specs/2026-11-22-mobile-companion-design.md`

## Global constraints
- Do not write to `pkl-queue-*` from umpire.html. Do not change Firestore rules.
- `displaySettings.mobile` defaults `{enabled:false, scoring:'sideout', tvScores:'both'}`.
- Side-out starts at serving = firstServe, num 2 ("0-0-2"). Call = serving score first.
- Record result = press-and-hold 1.5 s; no end while tied.
- TV names: one size per layout, cut with "…" (no shrink-to-fit).

## Review focus
- Two admin tabs open when an endReq arrives → match finished once (transaction claim on `pm-umpire` doc).
- endReq for a match that is no longer on the court (admin ended it) → ignored and cleared.
- Login ver bumped (New PIN / Sign out) while umpire mid-game → phone signs out, state in pm-umpire kept.
- Mobile Companion turned off → umpire shows notice; TV hides scores.
- Umpire doc left from the previous match on that court → reset when a new match appears.

### Task 1: umpire-logic.js + tests
`initState(mode, firstServe)`, `rally(st, winner)`, `call(st)`, `undo(st)`, `adjust(st, v)`, `canEnd(st)`; tests in `tests/umpire-logic.test.js` (side-out sequences, rally, undo, adjust, hist cap 50, canEnd).

### Task 2: index.html Tab 6
Tab button + panel; settings save to `displaySettings.mobile`; `umpireLogins` (create random PINs on first load, edit username, New PIN, Sign out bump ver); table with presence and live score from `pm-umpire`.

### Task 3: index.html processing
Refactor End confirm into `finishMatch(m, s1, s2)`; listener on `pm-umpire` → `startReq` → `startGame`; `endReq` → claim (transaction sets `processing`) → `finishMatch` → delete doc; admin End modal pre-filled with live score; admin end / back-to-queue clears the court's doc.

### Task 4: umpire.html
Screens: login, off notice, no match, warm-up (+first serve, Start), playing (big timer, call card, two panels, Won rally, Undo, Flip, Adjust), end sheet with hold button, waiting-for-admin notice. Heartbeat 20 s.

### Task 5: TVs
Read `pm-umpire` for live; uniform name size with ellipsis; port to mpo-display.

### Task 6: verify
Node tests; syntax checks; stub-Firestore harness: umpire flows, index processing unit pieces, TV screenshots.
