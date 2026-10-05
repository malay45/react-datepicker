const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../scenario");
const E = require("../engine");

const strongestIndex = q => q.options.findIndex(o => o.originalIndex === 0);

test("scenario has 1 ranking task and 12 decisions with 4 options each", () => {
  assert.equal(S.RANKING.items.length, 5);
  assert.equal(S.QUESTIONS.length, 12);
  for (const q of S.QUESTIONS) {
    assert.equal(q.options.length, 4, q.id);
    assert.ok(S.CHARACTERS[q.from], q.id + " has a known sender");
    assert.equal(Math.max(...q.options.map(o => o.strength)), 3, q.id + " has a strong option");
  }
});

test("every variant flag is set by some earlier option", () => {
  const seen = new Set();
  for (const q of S.QUESTIONS) {
    for (const v of q.variants || []) assert.ok(seen.has(v.when), `${q.id} uses ${v.when}`);
    for (const o of q.options) (o.set || []).forEach(f => seen.add(f));
  }
});

test("buildSession is deterministic per seed and keeps every option", () => {
  const a = E.buildSession(S, 42);
  const b = E.buildSession(S, 42);
  assert.deepEqual(a.questions.map(q => q.options.map(o => o.originalIndex)),
                   b.questions.map(q => q.options.map(o => o.originalIndex)));
  for (const q of a.questions) {
    assert.deepEqual(q.options.map(o => o.originalIndex).sort(), [0, 1, 2, 3]);
  }
});

test("shuffling actually varies the position of the strongest option", () => {
  const positions = new Set();
  const s = E.buildSession(S, 7);
  s.questions.forEach(q => positions.add(strongestIndex(q)));
  assert.ok(positions.size > 1);
});

test("choices set flags that surface variants later", () => {
  const ngo = S.QUESTIONS.find(q => q.id === "q-ngo");
  assert.deepEqual(E.resolveVariants(ngo, {}), []);
  const coop = S.QUESTIONS.find(q => q.id === "q-coop");
  const flags = E.applyFlags({}, coop.options[1]);
  assert.equal(flags.coopAlienated, true);
  assert.equal(E.resolveVariants(ngo, flags).length, 1);
});

test("rankingWeights gives 5 points to the top item and 1 to the last", () => {
  const ids = S.DIMENSIONS.map(d => d.id);
  const order = ["baseline", "plant", "community", "permits", "team"];
  const w = E.rankingWeights(order, S.RANKING.items, ids);
  assert.deepEqual(w, { E: 5, A: 4, S: 3, R: 2, C: 1 });
});

test("spearman and cosine behave at the extremes", () => {
  assert.equal(E.spearman([1, 2, 3], [10, 20, 30]), 1);
  assert.equal(E.spearman([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(E.spearman([1, 1, 1], [1, 2, 3]), 0);
  assert.ok(Math.abs(E.cosine([1, 0], [2, 0]) - 1) < 1e-12);
  assert.equal(E.cosine([0, 0], [1, 1]), 0);
});

test("all-strongest answers score 100% strength", () => {
  const s = E.buildSession(S, 123);
  const answers = s.questions.map(q => ({ optionIndex: strongestIndex(q), seconds: 30 }));
  const r = E.score(S, s, S.RANKING.items.map(i => i.id), answers);
  assert.equal(r.strength, 100);
  assert.equal(r.answeredCount, 12);
  for (const k of ["alignment", "stability"]) assert.ok(r[k] >= 0 && r[k] <= 100, k);
});

test("unanswered questions count as zero and are reported", () => {
  const s = E.buildSession(S, 5);
  const answers = s.questions.map((q, i) => (i < 6 ? { optionIndex: strongestIndex(q), seconds: 10 } : null));
  const r = E.score(S, s, S.RANKING.items.map(i => i.id), answers);
  assert.equal(r.answeredCount, 6);
  assert.equal(r.strength, 50);
  assert.equal(r.review[11].chosen, null);
});

test("an action-first ranking aligns better with action-heavy choices", () => {
  const s = E.buildSession(S, 9);
  const mostA = q => q.options.reduce((b, o, i) => ((o.dims.A || 0) > (q.options[b].dims.A || 0) ? i : b), 0);
  const answers = s.questions.map(q => ({ optionIndex: mostA(q), seconds: 5 }));
  const actionFirst = E.score(S, s, ["plant", "team", "community", "baseline", "permits"], answers);
  const actionLast = E.score(S, s, ["permits", "baseline", "community", "team", "plant"], answers);
  assert.ok(actionFirst.alignment > actionLast.alignment);
});
