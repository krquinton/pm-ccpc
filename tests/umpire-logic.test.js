/* Run: node tests/umpire-logic.test.js */
const assert = require('assert');
const U = require('../umpire-logic.js');
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FAIL ' + name + '\n', e.message); process.exitCode = 1; } }
const pick = s => ({ s1: s.s1, s2: s.s2, serving: s.serving, num: s.num });

t('side-out start is 0-0-2', () => {
  const s = U.initState('sideout', 1);
  assert.deepStrictEqual(pick(s), { s1:0, s2:0, serving:1, num:2 });
  assert.strictEqual(U.call(s), '0-0-2');
});
t('first serve team 2', () => assert.strictEqual(U.initState('sideout', 2).serving, 2));
t('side-out: serving team wins = point', () => {
  const s = U.rally(U.initState('sideout', 1), 1);
  assert.deepStrictEqual(pick(s), { s1:1, s2:0, serving:1, num:2 });
  assert.strictEqual(U.call(s), '1-0-2');
});
t('side-out: receiving wins on server 2 = side out to server 1', () => {
  const s = U.rally(U.initState('sideout', 1), 2);
  assert.deepStrictEqual(pick(s), { s1:0, s2:0, serving:2, num:1 });
});
t('side-out: receiving wins on server 1 = server 2', () => {
  let s = U.rally(U.initState('sideout', 1), 2);  // side out → team 2, server 1
  s = U.rally(s, 1);                              // team 1 wins rally → team 2 server 2
  assert.deepStrictEqual(pick(s), { s1:0, s2:0, serving:2, num:2 });
  assert.strictEqual(U.call(s), '0-0-2');
});
t('side-out call puts serving score first', () => {
  let s = U.adjust(U.initState('sideout', 1), { s1:2, s2:4, serving:2, num:1 });
  assert.strictEqual(U.call(s), '4-2-1');
});
t('rally: every rally scores, winner serves', () => {
  let s = U.initState('rally', 1);
  s = U.rally(s, 2);
  assert.deepStrictEqual(pick(s).s2, 1); assert.strictEqual(s.serving, 2);
  s = U.rally(s, 2); s = U.rally(s, 1);
  assert.deepStrictEqual([s.s1, s.s2, s.serving], [1, 2, 1]);
  assert.strictEqual(U.call(s), '1-2');
});
t('undo restores previous state', () => {
  let s = U.initState('sideout', 1); s = U.rally(s, 1); s = U.rally(s, 1);
  s = U.undo(s);
  assert.deepStrictEqual(pick(s), { s1:1, s2:0, serving:1, num:2 });
  s = U.undo(s); s = U.undo(s);   // extra undo is a no-op
  assert.deepStrictEqual(pick(s), { s1:0, s2:0, serving:1, num:2 });
});
t('adjust clamps scores at 0 and can be undone', () => {
  let s = U.adjust(U.initState('sideout', 1), { s1:-3, s2:5, serving:2, num:1 });
  assert.deepStrictEqual(pick(s), { s1:0, s2:5, serving:2, num:1 });
  s = U.undo(s);
  assert.deepStrictEqual(pick(s), { s1:0, s2:0, serving:1, num:2 });
});
t('history keeps last 50', () => {
  let s = U.initState('rally', 1);
  for (let i = 0; i < 80; i++) s = U.rally(s, 1);
  assert.strictEqual(s.hist.length, 50);
});
t('functions do not mutate input', () => {
  const a = U.initState('sideout', 1), b = U.rally(a, 1);
  assert.strictEqual(a.s1, 0); assert.notStrictEqual(a, b);
});
t('canEnd only when not tied', () => {
  assert.strictEqual(U.canEnd(U.initState('rally', 1)), false);
  assert.strictEqual(U.canEnd(U.rally(U.initState('rally', 1), 1)), true);
});

/* timeouts, pause, reset */
const T0 = 1000000;
t('timeout counts per team and stops at the limit', () => {
  let s = U.initState('sideout', 1);
  s = U.startTimeout(s, 1, T0, 60);
  assert.deepStrictEqual(s.pause, { kind:'timeout', team:1, at:T0, until:T0 + 60000 });
  assert.strictEqual(U.timeoutsLeft(s, 1, 2), 1);
  s = U.resume(s, T0 + 20000);
  assert.strictEqual(s.pausedMs, 20000); assert.strictEqual(s.pause, null);
  s = U.startTimeout(s, 1, T0 + 30000, 60); s = U.resume(s, T0 + 40000);
  assert.strictEqual(U.timeoutsLeft(s, 1, 2), 0);
  const same = U.startTimeout(s, 1, T0 + 50000, 60, 2);   // limit reached → no change
  assert.strictEqual(same.pause, null);
});
t('resume after a timeout ran out only counts the timeout length', () => {
  let s = U.startTimeout(U.initState('rally', 1), 2, T0, 60);
  s = U.resume(s, T0 + 500000);
  assert.strictEqual(s.pausedMs, 60000);
});
t('pause (no countdown) and resume', () => {
  let s = U.startPause(U.initState('rally', 1), T0);
  assert.strictEqual(s.pause.kind, 'pause');
  assert.strictEqual(U.startTimeout(s, 1, T0 + 1, 60).pause.kind, 'pause');   // already paused → no timeout on top
  s = U.resume(s, T0 + 45000);
  assert.strictEqual(s.pausedMs, 45000);
});
t('reset clock makes elapsed zero and clears a pause', () => {
  let s = U.startPause(U.initState('rally', 1), T0);
  s = U.resetClock(s, T0 - 300000, T0 + 1000);
  assert.strictEqual(s.pause, null); assert.strictEqual(s.pausedMs, 301000);
});
t('undo does not touch pause state', () => {
  let s = U.rally(U.initState('rally', 1), 1);
  s = U.startPause(s, T0);
  s = U.undo(s);
  assert.strictEqual(s.s1, 0); assert.strictEqual(s.pause.kind, 'pause');
});
if (!process.exitCode) console.log(`all umpire-logic tests passed (${n})`);
