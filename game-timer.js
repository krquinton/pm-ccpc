/* Game timer maths shared by index.html (admin) and display.html (TV).
   Pure functions: no DOM, no Firebase. Tested by tests/game-timer.test.js. */
(function (root) {
  const DEFAULTS = { enabled:false, gameMin:15, warmupSec:120, autoStart:true, warn1Min:12, warn2Min:14, finalSec:20 };

  function normalize(cfg) {
    const c = Object.assign({}, DEFAULTS, cfg || {});
    ['gameMin','warmupSec','warn1Min','warn2Min','finalSec'].forEach(k => { const v = Number(c[k]); c[k] = isFinite(v) ? v : DEFAULTS[k]; });
    c.enabled = !!c.enabled; c.autoStart = c.autoStart !== false;
    return c;
  }

  function validate(c) {
    if (!(c.gameMin >= 1 && c.gameMin <= 90)) return 'Game length must be 1 to 90 minutes.';
    if (!(c.warmupSec >= 0 && c.warmupSec <= 900)) return 'Warm-up must be 0 to 15 minutes.';
    if (!(c.warn1Min > 0 && c.warn1Min < c.warn2Min && c.warn2Min < c.gameMin)) return '1st warning must come before the 2nd, and both before the game length.';
    if (!(c.finalSec > 0 && c.finalSec < (c.gameMin - c.warn2Min) * 60)) return 'Final warning must start after the 2nd warning.';
    return '';
  }

  function levelFor(e, c) {
    const G = c.gameMin * 60;
    if (e >= G) return 'over';
    if (e >= G - c.finalSec) return 'final';
    if (e >= c.warn2Min * 60) return 'warn2';
    if (e >= c.warn1Min * 60) return 'warn1';
    return 'normal';
  }

  /* live = the umpire's pm-umpire doc for this match: pausedMs (time taken off) and pause {kind:'pause'|'timeout', team, at, until} */
  function pauseInfo(live, now) {
    if (!live) return { off: 0, at: null, kind: null, team: null, until: null };
    let off = Number(live.pausedMs) || 0, p = live.pause || null;
    if (p && p.kind === 'timeout' && p.until && now >= p.until) { off += p.until - p.at; p = null; }   // timeout ran out = resumed at its end
    return { off, at: p ? p.at : null, kind: p ? p.kind : null, team: p ? p.team : null, until: p ? p.until : null };
  }

  function clockFor(m, c, now, live) {
    const none = { phase:'none', secs:0, level:'normal' };
    if (!m) return none;
    const playing = start => {
      const pi = pauseInfo(live, now), end = pi.at != null ? pi.at : now;
      const secs = Math.max(0, Math.floor((end - start - pi.off) / 1000));
      const r = { phase:'playing', secs, level: c.enabled ? levelFor(secs, c) : 'normal' };
      if (live) { r.paused = pi.kind; r.pauseTeam = pi.team; r.pauseLeft = pi.kind === 'timeout' ? Math.max(0, Math.ceil((pi.until - now) / 1000)) : null; }
      return r;
    };
    if (m.status === 'playing') return Number(m.startedAt) ? playing(Number(m.startedAt)) : none;
    if (m.status !== 'assigned' || !c.enabled) return none;
    const w = Number(m.warmupEndsAt);
    if (!w) return none;
    if (now < w) return { phase:'warmup', secs: Math.ceil((w - now) / 1000), level:'normal' };
    return c.autoStart ? playing(w) : { phase:'ready', secs:0, level:'normal' };
  }

  const pad = n => String(n).padStart(2, '0');
  function formatClock(s) { s = Math.max(0, Math.floor(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function formatOver(s) { s = Math.max(0, Math.floor(s)); return '+' + Math.floor(s / 60) + ':' + pad(s % 60); }

  function estimateStarts(o) {
    const c = o.cfg, out = {};
    if (!c || !c.enabled) return out;
    const now = o.now, G = c.gameMin * 60000, W = c.warmupSec * 1000, free = {};
    o.courts.forEach(k => { free[k] = now; });
    (o.active || []).forEach(m => {
      if (!(m.court in free)) return;
      const base = m.status === 'playing' ? Number(m.startedAt) || now : (Number(m.warmupEndsAt) || now + W);
      free[m.court] = Math.max(now, base + G);
    });
    (o.queue || []).forEach(m => {
      if (m.status === 'onhold') return;
      let best = null;
      o.courts.slice().sort((a, b) => a - b).forEach(k => {
        if (!o.allowsCourt(m.bucket, k)) return;
        if (best === null || free[k] < free[best]) best = k;
      });
      if (best === null) return;
      const startAt = free[best] + W;
      out[m.id] = { startAt, court: best };
      free[best] = startAt + G;
    });
    return out;
  }

  const api = { DEFAULTS, normalize, validate, levelFor, clockFor, pauseInfo, formatClock, formatOver, estimateStarts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GameTimer = api;
})(this);
