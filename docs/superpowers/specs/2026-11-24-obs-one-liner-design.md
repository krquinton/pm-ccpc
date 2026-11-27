# OBS Overlay one-liner — design (small change)

Date: 2026-11-24 · Repo: pm-ccpc · Files: `obs.html`, `index.html` (Tab 7)

## Intent
For finals / multi-set games, show a typed one-line note under the scores on the OBS score bug, e.g. "TEAM 1 leads the set (2-0)". The admin types it per court in Tab 7 and toggles it on/off.

## Goals
- Strip under the two team rows in `obs.html`: same dark background, gold text (like the score call), uppercase Oswald.
- Hidden when off or empty; then Team B row keeps its rounded bottom corners.
- Tab 7, for the selected court: On/Off toggle + text box (max 60 chars). Saves on blur / Enter; live in the preview.

## Non-goals
- Automatic set tracking / best-of-N counting (possible later; overlay look stays the same).
- Placeholders that fill team names.

## Approaches
- A (chosen by user): admin types the text per court in Tab 7.
- B: system counts sets automatically — needs linking games of the same series; deferred.

## Data
`pkl-queue-events/displaySettings.obs.lines = { "<court>": { on: bool, text: string } }`

## Builder's calls
- Text persists across matches (each game is a new match; auto-clear would force retyping).
- Not shown on the WINNER banner (text is likely stale at that moment).
- Shown only while the score bug is shown (match on court).
