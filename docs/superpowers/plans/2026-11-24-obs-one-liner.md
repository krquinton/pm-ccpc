# OBS one-liner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Typed, per-court, toggleable one-line note under the scores on `obs.html`.
**Architecture:** Admin Tab 7 writes `displaySettings.obs.lines[court] = {on, text}`; `obs.html` already listens to `displaySettings` and paints a strip under `#rowB`. Preview iframe gets unsaved typing via `postMessage`.
**Tech Stack:** Plain HTML/JS, Firestore compat SDK.
**Spec:** `docs/superpowers/specs/2026-11-24-obs-one-liner-design.md`

## Global Constraints
- Max 60 characters. Text persists across matches. Not on WINNER banner. Shown only with the score bug.

## Review Focus
- Empty/whitespace text with toggle On → no strip (and Team B row keeps rounded corners).
- Long text → single line, cut with "…".
- Switching court chip → toggle/text show that court's values, not the previous court's.
- Saving one court's line must not wipe other courts' lines or other OBS look fields.
- HTML in text (`<b>`) shows as plain text (use textContent).

### Task 1: Strip in obs.html
**Files:** Modify `obs.html` (CSS, markup after `#rowB`, `paint()`, message listener)
- [ ] Add `<div class="line" id="line"></div>` inside `#bug` after `#rowB`; gold Oswald 24px uppercase, dark bg, rounded bottom; when `.box.hasline`, `#rowB` loses bottom radius.
- [ ] `lineFor(court)` → trimmed text when `ds.obs.lines[court].on`, else ''. In `paint()`, set textContent + toggle `hasline`.
- [ ] When `preview=1`, `message` event `{type:'pm-obs-line', court, on, text}` overrides the line for this court until next Firestore paint.
- [ ] Verify: jsdom check (script below in Task 3).

### Task 2: Tab 7 controls in index.html
**Files:** Modify `index.html` Tab 7 markup + `renderObs` / handlers
- [ ] New card "One-liner · Court N" between Court card and Look: On/Off chips `#obsLineOn`, text input `#obsLineText` (maxlength 60), helper text.
- [ ] `renderObs()` fills them for `obsCourt` (don't overwrite input while focused).
- [ ] Save `{ lines: {...current, [obsCourt]: {on, text}} }` via `obsSave` on chip click, input blur, Enter.
- [ ] On `input`, postMessage to `#obsFrame`.

### Task 3: Verify
- [ ] Node + jsdom: load obs.html logic with a fake `ds`, assert strip text/visibility for on/off/empty/whitespace/long.
- [ ] Open both pages in a browser, check no console errors.
