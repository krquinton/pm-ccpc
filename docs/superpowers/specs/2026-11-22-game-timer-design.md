# Game timer, warm-up, sponsors & leaderboard tweaks — design

Date: 2026-11-22 · Repo: pm-ccpc · Files: `index.html` (admin), `display.html` (TV)

## Intent
Run open-play / tournament sessions on fixed-length games (e.g. 15 min) so courts turn over on time.
Admins and players need to see at a glance: warm-up vs game time, when a game is near its end,
and roughly when a queued match will start.

## Changes

### 1. Sponsors
- Move the 🎉 Show/Hide Sponsors button from Tab 3 (Queue & Courts) to Tab 5 (Sponsors), above the sponsor list.
- Remove it from Tab 3. Behaviour unchanged (`displaySettings.sponsorShow`).
- Update helper text in Tab 5 that says "Play it from Tab 3".

### 2. Leaderboard
- Remove the Session dropdown (`#lbSessionFilter`) from Tab 4. Always show `sessionState.currentSessionId`.
- Past sessions remain available via Logs and Snapshots.

### 3. Game timer settings (one for all categories)
New ⚙ "Game timer" button in Tab 3 opens a modal. Saved to `pkl-queue-events/displaySettings` as `gameTimer`:
```
gameTimer: { enabled, gameMin: 15, warmupSec: 120, autoStart: true,
             warn1Min: 12, warn2Min: 14, finalSec: 20 }
```
- Validation: warn1 < warn2 < gameMin; finalSec < (gameMin - warn2) in seconds or just applied at gameMin*60 - finalSec.
- If `enabled` is false, behaviour is exactly as today (count-up, no warm-up, no colours).

### 4. Warm-up flow
- On Add to court (`assignToCourt`), also write `warmupEndsAt = now + warmupSec*1000` (status stays `assigned`).
- Court card (assigned) shows blue "WARM-UP 1:42 ↓" countdown.
- At 0:
  - autoStart = true → admin client calls `startGame` with `startedAt = warmupEndsAt` (transaction/guard so multiple open admin tabs don't double-start; skip if status no longer `assigned`).
  - autoStart = false → show "Ready · Start game" with the Start button pulsing; time waits.
- Manual ▶ Start game still works during warm-up (skips the rest).
- Back to queue clears `warmupEndsAt`.

### 5. Game clock & warnings (count-up, with cap)
- Clock counts up as today, displayed `12:05 / 15:00`.
- States by elapsed time: normal → warn1 (yellow) at warn1Min → warn2 (orange) at warn2Min → final (red, pulsing) at gameMin*60 − finalSec → over (red, "+0:12 OVER") after gameMin.
- End match stays manual.
- Same states and colours on TV (`display.html`). Warm-up badge visually distinct from the game clock.
- TV computes from `warmupEndsAt` / `startedAt` locally, so if auto-start is a few seconds late on the admin, the TV still shows correct time (TV treats `assigned` + past `warmupEndsAt` + autoStart as playing from `warmupEndsAt`).

### 6. Estimated start on queue hover
- Hover (desktop) or tap (tablet) on a waiting-queue row shows a tooltip: "Est. start ~2:35 PM · Court 3 · in ~18 min".
- Algorithm (only when gameTimer.enabled):
  1. For each active court: freeAt = playing → startedAt + gameMin; assigned → warmupEndsAt (or now + warmup) + gameMin; free → now. If freeAt < now (over time) → now ("anytime now").
  2. Walk waiting queue in order, skip ON HOLD. For each match pick the earliest-free court allowed by `bucketAllowsCourt`. Est. game start = freeAt + warmupSec. Then that court's freeAt = est. start + gameMin.
- Not handled: a player in two queued matches at once; real game lengths varying from setting.

## Non-goals
- Auto-ending matches at time up.
- Per-category timer settings.

## Approaches considered
- Per-category vs single setting → user picked single.
- Countdown vs count-up clock → user picked count-up with cap.
- Auto vs manual start after warm-up → user picked a settings toggle.
