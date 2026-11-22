/* Umpire scoring rules (Rally / Side-out). Pure functions: every call returns a new state.
   Used by umpire.html; tested by tests/umpire-logic.test.js. */
(function () {
  const HIST_MAX = 50;
  const snap = s => ({ s1: s.s1, s2: s.s2, serving: s.serving, num: s.num });
  const push = (s, next) => Object.assign({}, s, next, { hist: (s.hist || []).concat([snap(s)]).slice(-HIST_MAX) });

  /* side-out starts "0-0-2": the first serving team only gets one server */
  function initState(mode, firstServe) {
    const m = mode === 'rally' ? 'rally' : 'sideout', f = firstServe === 2 ? 2 : 1;
    return { mode: m, firstServe: f, s1: 0, s2: 0, serving: f, num: m === 'sideout' ? 2 : 1, hist: [] };
  }

  /* winner: 1 or 2 — the team that won the rally */
  function rally(s, winner) {
    const w = winner === 2 ? 2 : 1, key = w === 1 ? 's1' : 's2';
    if (s.mode === 'rally') return push(s, { [key]: s[key] + 1, serving: w });
    if (w === s.serving) return push(s, { [key]: s[key] + 1 });
    if (s.num === 1) return push(s, { num: 2 });
    return push(s, { serving: s.serving === 1 ? 2 : 1, num: 1 });
  }

  function call(s) {
    const sv = s.serving === 1 ? s.s1 : s.s2, rc = s.serving === 1 ? s.s2 : s.s1;
    return s.mode === 'rally' ? `${sv}-${rc}` : `${sv}-${rc}-${s.num}`;
  }

  function undo(s) {
    const h = s.hist || [];
    if (!h.length) return s;
    return Object.assign({}, s, h[h.length - 1], { hist: h.slice(0, -1) });
  }

  /* manual override from the Adjust sheet */
  function adjust(s, v) {
    const n = x => Math.max(0, Math.floor(Number(x) || 0));
    return push(s, { s1: n(v.s1), s2: n(v.s2), serving: v.serving === 2 ? 2 : 1, num: v.num === 1 ? 1 : 2 });
  }

  const canEnd = s => s.s1 !== s.s2;

  /* ---- timeouts / pause / reset: change the game clock only, never the score or undo history ---- */
  const used = (s, team) => ((s.timeouts || {})[team]) || 0;
  const timeoutsLeft = (s, team, perTeam) => Math.max(0, perTeam - used(s, team));
  function startTimeout(s, team, now, lenSec, perTeam) {
    if (s.pause) return s;
    if (perTeam != null && timeoutsLeft(s, team, perTeam) <= 0) return s;
    return Object.assign({}, s, { pause: { kind: 'timeout', team, at: now, until: now + lenSec * 1000 },
      timeouts: Object.assign({}, s.timeouts || {}, { [team]: used(s, team) + 1 }) });
  }
  function startPause(s, now) { return s.pause ? s : Object.assign({}, s, { pause: { kind: 'pause', at: now } }); }
  function resume(s, now) {
    if (!s.pause) return s;
    const end = s.pause.kind === 'timeout' ? Math.min(now, s.pause.until) : now;
    return Object.assign({}, s, { pausedMs: (s.pausedMs || 0) + Math.max(0, end - s.pause.at), pause: null });
  }
  /* game clock back to 00:00: take everything so far off */
  function resetClock(s, startedAt, now) { return Object.assign({}, s, { pause: null, pausedMs: Math.max(0, now - startedAt) }); }

  const api = { HIST_MAX, initState, rally, call, undo, adjust, canEnd, timeoutsLeft, startTimeout, startPause, resume, resetClock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.UmpireLogic = api;
})();
