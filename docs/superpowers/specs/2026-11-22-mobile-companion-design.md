# Mobile Companion (umpire.html) — design

Date: 2026-11-22 · Repo: pm-ccpc · Files: new `umpire.html`, new `umpire-logic.js`, `index.html` (Tab 6 + processing), `display.html`, `mpo-display.html`
Mockups: umpire-mockup-v3 (phone), tab6-mockup, scores-display-*/scores-mpo-display-* (approved 2026-11-22)

## Intent
One umpire per court runs the game from a phone: sees who is on the court, the warm-up and game timer, starts the game, keeps score, and ends the match so the result is recorded and the court frees up. The TV can show the live score and who is serving.

## Goals
- `umpire.html`: court username + PIN sign-in; match details; warm-up countdown; Start game; live scoring; End match.
- Scoring mode for everyone, set by the admin: **Rally** or **Side-out**.
- Side-out: umpire taps the team that **won the rally**; the app works out points, server 1 → 2 and side-out. Undo, and **Adjust** as a manual override (each score, serving team, server 1/2).
- Score call card (`4-2-1` side-out, `7-5` rally; serving team's score first). Team-level serve arrow ("▶ Serving · 1").
- Big game timer above the score call while playing (warm-up countdown equally big during warm-up), same warning colours as the TV.
- Manual **Flip sides** (swaps the two panels; Left/Right labels).
- Scores the same size; long names cut with "…" (full names on the End match confirmation).
- `index.html` Tab 6 · Mobile Companion: on/off, umpire link, scoring mode, "Scores on the TV" (Off / Score / Serve / Score + Serve), court logins (username, PIN, New PIN, Sign out, signed-in status, what's on court now with live score).
- TV (`display.html`, `mpo-display.html`): live score and/or serve ball per Tab 6, fixed score size on every court.
- Admin can still Start game and End match from Tab 3 as today.

## Non-goals
- Real per-umpire accounts / Firebase logins for umpires.
- Per-category scoring mode; automatic side switch prompts; player-level serve tracking (team level only).
- Changing Firestore rules.

## Constraint that shapes the build (Firestore rules)
- `pkl-queue-*`: read by anyone, **write only by licensed PickleManage logins**. `umpire.html` has no Firebase login, so it cannot write matches, logs or participants.
- Any other collection (not `pkl-queue-*`, `pm-users`, `users`, `members`, `membershipApplications`) is open read/write.
- So: the umpire writes only to a new open collection **`pm-umpire`**; the open admin page (`index.html`, licensed) carries out Start game and End match with its existing code.

## Approaches considered
1. **Umpire writes to `pm-umpire`, admin page acts on it (chosen).** No rule change, one copy of the End match logic. Cost: Start/End requests wait until an admin page is open (same as auto-start today).
2. Umpire signs in with Firebase anonymous auth + rule changes so it can write matches/logs itself. Works without admin open, but needs Console + rules changes and a second copy of End match logic (participants, stats, logs).
3. Realtime Database for live score. Its rules are closed by default and would need a new open path; no benefit over (1).

## Data
- `pkl-queue-events/displaySettings.mobile` (admin writes):
  `{ enabled:false, scoring:'sideout'|'rally', tvScores:'off'|'score'|'serve'|'both' }` — defaults `enabled:false, scoring:'sideout', tvScores:'both'`.
- `pkl-queue-events/umpireLogins` (admin writes, anyone reads):
  `{ courts: { "1": { username:"court1", pin:"4821", ver: 1 }, … } }` — PIN 4 digits, random on first open of Tab 6. **New PIN** and **Sign out** bump `ver`.
- `pm-umpire/{court}` (umpire writes; admin and TV read; open collection):
  ```
  { court, matchDocId, ver,               // which match and which login version this belongs to
    mode:'sideout'|'rally',              // fixed for the match when scoring starts
    firstServe: 1|2,                     // picked during warm-up, default 1
    s1, s2, serving: 1|2, num: 1|2,      // num ignored in rally
    started: bool,                       // scoring unlocked (game is playing)
    hist: [ {s1,s2,serving,num}, … ],    // undo stack, last 50
    startReq: number|null,               // umpire tapped Start game
    endReq: { s1, s2, at } | null,       // umpire tapped Record result
    lastSeen: number, updatedAt: number }
  ```
- Side-out start state: serving = firstServe, num = 2 ("0-0-2"). Rally start: serving = firstServe.

## Scoring rules (pure, in `umpire-logic.js`, unit-tested with Node like `game-timer.js`)
- `rally(state, winner)`: side-out — if winner == serving: that team +1; else if num == 1: num = 2; else serving = other, num = 1. Rally — winner +1, serving = winner.
- `call(state)`: side-out `"{serving score}-{receiving score}-{num}"`; rally `"{serving score}-{receiving score}"`.
- `undo(state)` pops `hist`; `adjust(state, {s1,s2,serving,num})` pushes current to `hist` then sets values (scores ≥ 0).
- End allowed only when s1 ≠ s2.

## Flows
- **Sign in:** umpire enters username + PIN → matched against `umpireLogins` → phone stores `{court, ver}` in localStorage. Signed out when the court's `ver` changes or Mobile Companion is turned off ("Mobile Companion is off. Ask the admin to turn it on."). Bad PIN: "Username or PIN is wrong."
- **Presence:** umpire writes `lastSeen` every 20 s; Tab 6 shows "Signed in" when `lastSeen` < 60 s ago.
- **Match on court:** umpire reads `pkl-queue-matches` where court == mine and status assigned/playing. If `pm-umpire.matchDocId` differs, the umpire resets its doc for the new match.
- **Warm-up:** big blue countdown (from `warmupEndsAt`, `GameTimer.clockFor`); "Who serves first?"; **▶ Start game now** writes `startReq`. Admin page on seeing `startReq` for an `assigned` match calls `startGame(id)` (existing transaction, so no double start). Auto-start stays as today.
- **Playing:** scoring unlocks when the match status is `playing`. Each tap writes the new state.
- **End match:** confirmation sheet (score, both teams, winner; "Keep playing" to go back) → **Record result** is a **press-and-hold button (1.5 s, a bar fills while held; letting go early cancels)** → writes `endReq`. Not allowed while tied. Admin page calls a new shared `finishMatch(m, score1, score2)` (the current End confirm body, unchanged behaviour: log, stats, release players, delete match, TV winner popup) then clears `pm-umpire/{court}`. If not processed within 10 s, umpire shows "Result sent — waiting for the admin page." Admin's own End match clears the court's `pm-umpire` doc too, and its score fields are pre-filled with the umpire's live score.
- **TV:** reads `pm-umpire` (open) and `displaySettings.mobile`; shows score/serve only when enabled, `tvScores` ≠ off, the doc's `matchDocId` is the match on that court, and `started`.

## Decided by the user
Court-level login (username + PIN) in Tab 6; End match records immediately, guarded by a confirmation sheet and a press-and-hold Record result; scoring mode in Tab 6, one for all; TV shows Off/Score/Serve/Both by setting; umpire sees only a notice when Mobile Companion is off; side-out by "Won rally" + manual override; serve arrow per team; manual Flip sides; big timer above score call.

## Builder's calls (marked)
- Collection name `pm-umpire`; heartbeat 20 s / online window 60 s; undo depth 50; 10 s "waiting for admin" notice.
- Flip sides is per phone (localStorage), not shared.
- Mode is locked per match once scoring starts, so changing the setting mid-game doesn't scramble a match.

## Risks
- `pm-umpire` is open like the other apps' collections: someone who knows the project could write a fake score. The PIN only stops honest mistakes. Hardening later: rule limiting `pm-umpire` fields/types.
- Start/End from the umpire need an open admin page.

## Addendum (approved 2026-11-22, mockup umpire-mockup-v4)
- **Before the game:** Flip sides works during warm-up. "Who serves first?" has 🪙 **Toss coin** (spinning coin, random winner) → winner chooses **Serve** or **Receive** → sets `firstServe`. Manual pick stays.
- **Feedback on every tap:** banner over the score call for ~1.5 s ("+1 · team", "Server 2", "Side out → team", "Undone"), flash on the affected team, score pop, vibration (Android), short tones (point / server 2 / side out), mute toggle (🔔/🔕) per phone.
- **Pause & timeouts** (Tab 6: `mobile.pauseEnabled`, `timeoutSec` default 60, `timeoutsPerTeam` default 2):
  - Team timeout (count per team per game, disabled when used up), plain Pause (no countdown), Reset game timer to 00:00 (press-and-hold).
  - Stored only in `pm-umpire/{court}`: `pause {kind:'pause'|'timeout', team, at, until}`, `pausedMs`, `timeouts {1,2}`. No admin page needed.
  - Every clock (umpire, admin Tab 3, TVs) uses `GameTimer.clockFor(m, cfg, now, live)`: game time = now − startedAt − pausedMs, frozen while paused; a timeout past `until` counts as resumed at `until` (the umpire phone also writes the resume).
  - TV shows "Timeout · team" with a purple countdown or "Paused"; logs' duration leaves pauses out.

## Addendum 2 — Tab 7 · OBS Overlay (approved 2026-11-22, obs-mockup)
- `obs.html?court=N` (no login; reads only): score bug for one court, 1920×1080 for an OBS Browser Source.
  Top: event logo + title (📺 TV display), "Court N · category", game timer (warning colours, WARM-UP / TIMEOUT / PAUSED), score call.
  Rows: team colour bar, both players' full names (cut with …), serve dot, score. No umpire scoring → names only.
  Winner banner ~12 s on a new `winner` event for the court (events older than 60 s ignored). No match → nothing shown.
- Tab 7 settings in `displaySettings.obs`: `bg` transparent|green (#00ff00), `colorA`, `colorB`, `pos` bl|br|tl|tr. Court picker, Copy link / Open, live preview (`&preview=1`, scaled, over a checkerboard).
