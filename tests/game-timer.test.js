/* Run: node tests/game-timer.test.js */
const assert = require('assert');
const GT = require('../game-timer.js');

const now = 1000000000;
const cfg = GT.normalize({ enabled: true });
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FAIL ' + name + '\n', e.message); process.exitCode = 1; } }

t('defaults', () => assert.deepStrictEqual(GT.normalize({}), { enabled:false, gameMin:15, warmupSec:120, autoStart:true, warn1Min:12, warn2Min:14, finalSec:20 }));

t('levelFor thresholds', () => {
  [[0,'normal'],[719,'normal'],[720,'warn1'],[839,'warn1'],[840,'warn2'],[879,'warn2'],[880,'final'],[899,'final'],[900,'over']]
    .forEach(([s, l]) => assert.strictEqual(GT.levelFor(s, cfg), l, 'at ' + s));
});
t('levels follow cfg passed in', () => assert.strictEqual(GT.levelFor(600, GT.normalize({ enabled:true, warn1Min:10 })), 'warn1'));

t('clockFor warmup', () => assert.deepStrictEqual(GT.clockFor({ status:'assigned', warmupEndsAt: now + 90500 }, cfg, now), { phase:'warmup', secs:91, level:'normal' }));
t('clockFor auto past warmup', () => assert.deepStrictEqual(GT.clockFor({ status:'assigned', warmupEndsAt: now - 5000 }, cfg, now), { phase:'playing', secs:5, level:'normal' }));
t('clockFor manual past warmup', () => assert.deepStrictEqual(GT.clockFor({ status:'assigned', warmupEndsAt: now - 5000 }, GT.normalize({ enabled:true, autoStart:false }), now), { phase:'ready', secs:0, level:'normal' }));
t('assigned without warmupEndsAt', () => assert.strictEqual(GT.clockFor({ status:'assigned' }, cfg, now).phase, 'none'));
t('clockFor playing final', () => assert.deepStrictEqual(GT.clockFor({ status:'playing', startedAt: now - 890000 }, cfg, now), { phase:'playing', secs:890, level:'final' }));
t('disabled playing is normal', () => assert.deepStrictEqual(GT.clockFor({ status:'playing', startedAt: now - 890000 }, GT.normalize({}), now), { phase:'playing', secs:890, level:'normal' }));
t('disabled assigned is none', () => assert.strictEqual(GT.clockFor({ status:'assigned', warmupEndsAt: now + 1000 }, GT.normalize({}), now).phase, 'none'));
t('waiting is none', () => assert.strictEqual(GT.clockFor({ status:'waiting' }, cfg, now).phase, 'none'));

t('validate ok', () => assert.strictEqual(GT.validate(cfg), ''));
t('validate warn2 before warn1', () => assert.notStrictEqual(GT.validate(GT.normalize({ enabled:true, warn2Min:11 })), ''));
t('validate final too long', () => assert.notStrictEqual(GT.validate(GT.normalize({ enabled:true, finalSec:70 })), ''));

t('formatClock', () => assert.strictEqual(GT.formatClock(905), '15:05'));
t('formatOver', () => assert.strictEqual(GT.formatOver(12), '+0:12'));

/* pause / timeout / reset (live = the umpire's pm-umpire doc) */
const P = { status:'playing', startedAt: now - 600000 };
t('paused freezes the clock', () => {
  const ck = GT.clockFor(P, cfg, now, { pausedMs: 0, pause: { kind:'pause', at: now - 100000 } });
  assert.strictEqual(ck.secs, 500); assert.strictEqual(ck.paused, 'pause');
});
t('pausedMs is taken off the game time', () => assert.strictEqual(GT.clockFor(P, cfg, now, { pausedMs: 60000 }).secs, 540));
t('timeout shows seconds left', () => {
  const ck = GT.clockFor(P, cfg, now, { pause: { kind:'timeout', team: 2, at: now - 17000, until: now + 43000 } });
  assert.strictEqual(ck.paused, 'timeout'); assert.strictEqual(ck.pauseLeft, 43); assert.strictEqual(ck.pauseTeam, 2); assert.strictEqual(ck.secs, 583);
});
t('expired timeout counts as resumed at its end', () => {
  const ck = GT.clockFor(P, cfg, now, { pause: { kind:'timeout', team: 1, at: now - 90000, until: now - 30000 } });
  assert.strictEqual(ck.paused, null); assert.strictEqual(ck.secs, 540);
});
t('no live doc = unchanged', () => assert.strictEqual(GT.clockFor(P, cfg, now).secs, 600));

const all = () => true;
const W = 120000, G = 900000;
t('estimate basic', () => {
  const r = GT.estimateStarts({ courts:[1,2], active:[{ id:'P', status:'playing', court:1, startedAt: now - 600000 }],
    queue:[{ id:'A', status:'waiting' }, { id:'B', status:'waiting' }, { id:'C', status:'waiting' }], cfg, now, allowsCourt: all });
  assert.deepStrictEqual(r.A, { startAt: now + W, court: 2 });
  assert.deepStrictEqual(r.B, { startAt: now + 300000 + W, court: 1 });
  assert.deepStrictEqual(r.C, { startAt: now + W + G + W, court: 2 });
});
t('estimate skips onhold', () => {
  const r = GT.estimateStarts({ courts:[1,2], active:[{ id:'P', status:'playing', court:1, startedAt: now - 600000 }],
    queue:[{ id:'H', status:'onhold' }, { id:'A', status:'waiting' }], cfg, now, allowsCourt: all });
  assert.strictEqual(r.H, undefined); assert.strictEqual(r.A.court, 2);
});
t('estimate court restriction', () => {
  const r = GT.estimateStarts({ courts:[1,2], active:[{ id:'P', status:'playing', court:1, startedAt: now - 600000 }],
    queue:[{ id:'A', status:'waiting', bucket:'x' }], cfg, now, allowsCourt: (b, c) => !(b === 'x' && c === 2) });
  assert.deepStrictEqual(r.A, { startAt: now + 300000 + W, court: 1 });
});
t('overdue court frees now', () => {
  const r = GT.estimateStarts({ courts:[1], active:[{ id:'P', status:'playing', court:1, startedAt: now - 1200000 }],
    queue:[{ id:'A', status:'waiting' }], cfg, now, allowsCourt: all });
  assert.strictEqual(r.A.startAt, now + W);
});
t('estimate assigned in warmup', () => {
  const r = GT.estimateStarts({ courts:[1], active:[{ id:'P', status:'assigned', court:1, warmupEndsAt: now + 60000 }],
    queue:[{ id:'A', status:'waiting' }], cfg, now, allowsCourt: all });
  assert.strictEqual(r.A.startAt, now + 60000 + G + W);
});
t('estimate disabled', () => assert.deepStrictEqual(GT.estimateStarts({ courts:[1], active:[], queue:[{ id:'A' }], cfg: GT.normalize({}), now, allowsCourt: all }), {}));

if (!process.exitCode) console.log(`all game-timer tests passed (${n})`);
