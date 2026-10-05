const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../lab-data");
const E = require("../lab-engine");

const fresh = () => {
  const s = E.createState(D, 1);
  E.submitBriefing(D, s, D.BRIEFING.questions.map(q => q.id));
  return s;
};

test("content: 4 researchers, 4 stations, 3 days with 2 support requests and one urgent", () => {
  assert.equal(D.RESEARCHERS.length, 4);
  assert.equal(D.STATIONS.length, 4);
  assert.equal(D.DAYS.length, 3);
  const needsTotal = d => Object.values(d.needs).reduce((a, b) => a + b, 0);
  for (const d of D.DAYS) {
    assert.equal(d.support.length, 2);
    assert.equal(d.support.filter(r => r.urgent).length, 1);
    assert.equal(needsTotal(d), 4, `day ${d.day} needs fit the team`);
    assert.equal(d.answers[d.unavailable], null, "unavailable researcher has no answers");
    for (const req of d.support) assert.equal(req.options.filter(o => o.strength === 3).length, 1);
  }
});

test("briefing: top three arrive before Day 1, the rest after Day 1", () => {
  const s = fresh();
  assert.equal(s.notes.length, 3);
  E.endDay(D, s);
  assert.equal(s.notes.length, 5);
  assert.equal(s.day, 2);
});

test("explore: request limit, one answer per researcher per day, unavailable researcher blocked", () => {
  const s = fresh();
  const blocked = id => E.questionsFor(D, s).find(q => q.id === id).blocked;
  assert.equal(blocked("r:ken:mood"), "Unavailable today");
  E.ask(D, s, "r:maya:mood");
  assert.equal(blocked("r:maya:need"), "Already answered a question today");
  assert.throws(() => E.ask(D, s, "r:maya:need"));
  E.ask(D, s, "s:plants:urgent");
  E.ask(D, s, "r:aisha:need");
  assert.equal(E.requestsLeft(D, s), 0);
  assert.equal(blocked("s:water:urgent"), "No requests left");
  assert.ok(s.knowledge["mood:maya:1"] && s.knowledge["need:plants:1"] && s.knowledge["want:aisha:1"]);
});

test("assign: capacity of two and reasons judged against what you knew", () => {
  const s = fresh();
  // Request reason without having asked → not backed
  let m = E.move(D, s, "aisha", "plants", "request");
  assert.equal(m.supported, false);
  // Move back, ask, then move again with the same reason → backed
  E.move(D, s, "aisha", "comms", "hunch");
  E.ask(D, s, "r:aisha:need");
  m = E.move(D, s, "aisha", "plants", "request");
  assert.equal(m.supported, true);
  assert.equal(E.reasonSupported(D, s, "tomas", "plants", "hunch", s.assignment), false);
  assert.equal(E.canMove(D, s, "tomas", "plants"), false, "plants already has two");
});

test("staffing: covering every need with skilled people scores 100%", () => {
  const ideal = { maya: "plants", aisha: "plants", ken: "water", tomas: "animals" };
  const ev = E.evaluateStaffing(D, 1, ideal);
  assert.equal(ev.coverage, 1);
  assert.equal(ev.fit, 1);
  const start = E.evaluateStaffing(D, 1, { maya: "plants", aisha: "comms", ken: "water", tomas: "animals" });
  assert.deepEqual(start.gaps, ["Plants"]);
  assert.deepEqual(start.idle, ["Communications"]);
});

test("reflect: honesty and evidence decide the verdict", () => {
  const s = fresh();
  E.ask(D, s, "r:maya:mood");
  E.confirmAssignments(D, s);
  assert.equal(E.judgeReflection(D, s, "ken", 1, "unknown").verdict, "honest");
  assert.equal(E.judgeReflection(D, s, "ken", 1, 3).verdict, "unsupported");
  assert.equal(E.judgeReflection(D, s, "maya", 1, "unknown").verdict, "underclaimed");
  const actual = E.endMood(D, s, "maya", 1);
  assert.equal(E.judgeReflection(D, s, "maya", 1, actual).verdict, "accurate");
  // A support exchange also gives you a basis
  E.chooseFirst(D, s, "d1-training");
  E.answerSupport(D, s, "d1-training", 0);
  assert.equal(E.hasBasis(D, s, "tomas", 1), true);
});

test("mood: wanted station and a strong reply lift mood; a poor reply lowers it", () => {
  const s = fresh();
  E.move(D, s, "aisha", "plants", "expertise");
  E.confirmAssignments(D, s);
  assert.equal(E.endMood(D, s, "aisha", 1), 1);
  E.answerSupport(D, s, "d1-data", 1); // strength 0 to Maya
  assert.equal(E.endMood(D, s, "maya", 1), 0);
});

test("options are shuffled per seed but always complete", () => {
  const a = E.createState(D, 11), b = E.createState(D, 11);
  assert.deepEqual(a.optionOrder, b.optionOrder);
  for (const k of Object.keys(a.optionOrder)) assert.deepEqual([...a.optionOrder[k]].sort(), [0, 1, 2, 3]);
});

function playStrong() {
  const s = fresh();
  const plan = {
    1: { asks: ["r:maya:mood", "r:aisha:need", "r:tomas:mood"], moves: [["aisha", "plants", "request"]] },
    2: { asks: ["s:water:urgent", "r:aisha:station", "s:animals:urgent"],
         moves: [["aisha", "comms", "capacity"], ["maya", "water", "capacity"]] },
    3: { asks: ["r:aisha:mood", "r:ken:need", "s:comms:urgent"],
         moves: [["maya", "plants", "request"], ["ken", "animals", "hunch"], ["tomas", "comms", "capacity"]] }
  };
  for (const day of [1, 2, 3]) {
    plan[day].asks.forEach(q => E.ask(D, s, q));
    plan[day].moves.forEach(([r, to, why]) => E.move(D, s, r, to, why));
    E.confirmAssignments(D, s);
    const d = D.DAYS[day - 1];
    E.chooseFirst(D, s, d.support.find(r => r.urgent).id);
    d.support.forEach(r => E.answerSupport(D, s, r.id, 0));
    const ratings = {};
    D.RESEARCHERS.forEach(r => {
      ratings[r.id] = E.hasBasis(D, s, r.id, day) ? E.endMood(D, s, r.id, day) : "unknown";
    });
    E.submitReflect(D, s, ratings);
    E.endDay(D, s);
  }
  return s;
}

test("a careful playthrough scores well on every behaviour", () => {
  const r = E.score(D, playStrong());
  const by = Object.fromEntries(r.behaviours.map(b => [b.id, b.score]));
  assert.equal(by.tracking, 100);
  assert.equal(by.consistency, 100);
  assert.equal(by.pressure, 100);
  assert.ok(by.prioritise >= 90, "prioritise " + by.prioritise);
  assert.ok(by.delegate >= 80, "delegate " + by.delegate);
});

test("an unfinished game scores what was done and leaves the rest empty", () => {
  const s = E.createState(D, 3);
  const r = E.score(D, s);
  assert.ok(r.behaviours.every(b => b.score === null));
});
