/*
 * Pure game logic for the Sustainable Futures Lab practice simulation.
 * No DOM access, so it runs in the browser and under `node --test`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SFLEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  function createRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function dayData(data, day) {
    return data.DAYS[day - 1];
  }

  function researcher(data, id) {
    for (var i = 0; i < data.RESEARCHERS.length; i++) {
      if (data.RESEARCHERS[i].id === id) return data.RESEARCHERS[i];
    }
    return null;
  }

  function createState(data, seed) {
    var rng = createRng(seed);
    var assignment = {};
    data.RESEARCHERS.forEach(function (r) {
      assignment[r.id] = r.start;
    });
    var optionOrder = {};
    data.DAYS.forEach(function (d) {
      d.support.forEach(function (req) {
        optionOrder[req.id] = shuffle(
          req.options.map(function (_, i) {
            return i;
          }),
          rng
        );
      });
    });
    return {
      seed: seed,
      day: 1,
      briefingOrder: null,
      notes: [],
      knowledge: {},
      asked: { 1: [], 2: [], 3: [] },
      assignment: assignment,
      moves: [],
      staffing: {},
      optionOrder: optionOrder,
      support: { 1: {}, 2: {}, 3: {} },
      supportFirst: {},
      reflect: {},
      completedDays: 0
    };
  }

  // ---- Onboarding ----------------------------------------------------------

  function submitBriefing(data, state, order) {
    state.briefingOrder = order.slice();
    var byId = {};
    data.BRIEFING.questions.forEach(function (q) {
      byId[q.id] = q;
    });
    order.slice(0, data.BRIEFING.answeredBeforeDay1).forEach(function (id) {
      state.notes.push({ day: 0, source: "Briefing", q: byId[id].q, a: byId[id].a });
    });
  }

  // ---- Explore -------------------------------------------------------------

  function questionsFor(data, state) {
    var d = dayData(data, state.day);
    var asked = state.asked[state.day];
    var left = data.EXPLORE_REQUESTS_PER_DAY - asked.length;
    var list = [];

    data.RESEARCHERS.forEach(function (r) {
      var answeredToday = asked.some(function (id) {
        return id.indexOf("r:" + r.id + ":") === 0;
      });
      Object.keys(data.RESEARCHER_QUESTIONS).forEach(function (kind) {
        var id = "r:" + r.id + ":" + kind;
        var blocked = null;
        if (d.unavailable === r.id) blocked = "Unavailable today";
        else if (asked.indexOf(id) >= 0) blocked = "Asked";
        else if (answeredToday) blocked = "Already answered a question today";
        else if (left <= 0) blocked = "No requests left";
        list.push({ id: id, targetType: "researcher", target: r.id, kind: kind,
          label: data.RESEARCHER_QUESTIONS[kind], blocked: blocked });
      });
    });

    data.STATIONS.forEach(function (s) {
      Object.keys(data.STATION_QUESTIONS).forEach(function (kind) {
        var id = "s:" + s.id + ":" + kind;
        var blocked = null;
        if (asked.indexOf(id) >= 0) blocked = "Asked";
        else if (left <= 0) blocked = "No requests left";
        list.push({ id: id, targetType: "station", target: s.id, kind: kind,
          label: data.STATION_QUESTIONS[kind], blocked: blocked });
      });
    });
    return list;
  }

  function requestsLeft(data, state) {
    return data.EXPLORE_REQUESTS_PER_DAY - state.asked[state.day].length;
  }

  function ask(data, state, qid) {
    var q = questionsFor(data, state).filter(function (x) {
      return x.id === qid;
    })[0];
    if (!q) throw new Error("Unknown question " + qid);
    if (q.blocked) throw new Error("Question not available: " + q.blocked);

    var day = state.day;
    var d = dayData(data, day);
    var answer;
    var source;
    if (q.targetType === "researcher") {
      var r = researcher(data, q.target);
      var ra = d.answers[q.target];
      source = r.name;
      if (q.kind === "mood") {
        answer = ra.mood;
        state.knowledge["mood:" + q.target + ":" + day] = true;
      } else if (q.kind === "need") {
        answer = ra.need;
        state.knowledge["want:" + q.target + ":" + day] = true;
      } else {
        answer = ra.station.a;
        state.knowledge["need:" + ra.station.about + ":" + day] = true;
      }
    } else {
      var st = data.STATIONS.filter(function (s) {
        return s.id === q.target;
      })[0];
      source = st.label + " station";
      if (q.kind === "urgent") {
        answer = d.answers.stations[q.target];
        state.knowledge["need:" + q.target + ":" + day] = true;
      } else {
        answer = data.STATION_SKILLS[q.target];
      }
    }
    state.asked[day].push(qid);
    var note = { day: day, source: source, q: q.label, a: answer, qid: qid };
    state.notes.push(note);
    return note;
  }

  function isRelevant(data, day, qid) {
    var kind = qid.split(":")[2];
    return dayData(data, day).relevant.indexOf(kind) >= 0;
  }

  // ---- Assign --------------------------------------------------------------

  function countAt(assignment, station) {
    return Object.keys(assignment).filter(function (id) {
      return assignment[id] === station;
    }).length;
  }

  function canMove(data, state, rid, to) {
    if (state.assignment[rid] === to) return false;
    return countAt(state.assignment, to) < data.MAX_PER_STATION;
  }

  // Is the stated reason backed by what the player knew and the actual situation?
  function reasonSupported(data, state, rid, to, reasonId, before) {
    var day = state.day;
    var d = dayData(data, day);
    var r = researcher(data, rid);
    var k = state.knowledge;
    switch (reasonId) {
      case "expertise":
        return r.skills[to] >= 2;
      case "capacity":
        return !!k["need:" + to + ":" + day] && countAt(before, to) < d.needs[to];
      case "request":
        return !!k["want:" + rid + ":" + day] && d.wants[rid] === to;
      case "wellbeing":
        return !!k["mood:" + rid + ":" + day] && d.mood[rid] <= 1;
      case "pairing": {
        var mates = Object.keys(before).filter(function (id) {
          return id !== rid && before[id] === to;
        });
        if (mates.length !== 1) return false;
        var other = researcher(data, mates[0]).skills[to];
        var mine = r.skills[to];
        return Math.max(other, mine) === 2 && Math.abs(other - mine) >= 1;
      }
      default:
        return false;
    }
  }

  function move(data, state, rid, to, reasonId) {
    if (!canMove(data, state, rid, to)) throw new Error("Move not allowed");
    var before = Object.assign({}, state.assignment);
    var supported = reasonSupported(data, state, rid, to, reasonId, before);
    var from = state.assignment[rid];
    state.assignment[rid] = to;
    var entry = { day: state.day, researcher: rid, from: from, to: to, reason: reasonId, supported: supported };
    state.moves.push(entry);
    return entry;
  }

  // Coverage of today's needs (60%) plus how well skills fit the staffed work (40%).
  function evaluateStaffing(data, day, assignment) {
    var d = dayData(data, day);
    var needTotal = 0;
    var covered = 0;
    var skillSum = 0;
    var skillCount = 0;
    var gaps = [];
    var idle = [];
    data.STATIONS.forEach(function (s) {
      var people = Object.keys(assignment).filter(function (id) {
        return assignment[id] === s.id;
      });
      var need = d.needs[s.id];
      needTotal += need;
      covered += Math.min(people.length, need);
      if (people.length < need) gaps.push(s.label);
      if (need === 0 && people.length) idle.push(s.label);
      people.slice(0, need).forEach(function (id) {
        skillSum += researcher(data, id).skills[s.id];
        skillCount++;
      });
    });
    var coverage = needTotal ? covered / needTotal : 1;
    var skill = skillCount ? skillSum / (skillCount * 2) : 0;
    return { coverage: coverage, skill: skill, fit: 0.6 * coverage + 0.4 * skill, gaps: gaps, idle: idle };
  }

  function confirmAssignments(data, state) {
    var snap = Object.assign({}, state.assignment);
    state.staffing[state.day] = { assignment: snap, eval: evaluateStaffing(data, state.day, snap) };
  }

  // ---- Support -------------------------------------------------------------

  function chooseFirst(data, state, reqId) {
    state.supportFirst[state.day] = reqId;
  }

  function orderedOptions(data, state, req) {
    return state.optionOrder[req.id].map(function (i) {
      return Object.assign({ originalIndex: i }, req.options[i]);
    });
  }

  function answerSupport(data, state, reqId, originalIndex) {
    state.support[state.day][reqId] = originalIndex;
  }

  // ---- Reflect -------------------------------------------------------------

  function supportTouching(data, state, rid, day) {
    var out = [];
    dayData(data, day).support.forEach(function (req) {
      var idx = state.support[day][req.id];
      if (idx != null && req.involves.indexOf(rid) >= 0) out.push(req.options[idx]);
    });
    return out;
  }

  // End-of-day mood: start-of-day mood adjusted by today's assignment and support.
  function endMood(data, state, rid, day) {
    var d = dayData(data, day);
    var m = d.mood[rid];
    var staffed = state.staffing[day] ? state.staffing[day].assignment : state.assignment;
    if (d.wants[rid] && staffed[rid] === d.wants[rid]) m += 1;
    var st = staffed[rid];
    if (d.mood[rid] <= 1 && d.needs[st] >= 2 && countAt(staffed, st) === 1) m -= 1;
    supportTouching(data, state, rid, day).forEach(function (o) {
      if (o.strength === 3) m += 1;
      else if (o.strength <= 1) m -= 1;
    });
    return Math.max(0, Math.min(3, m));
  }

  function hasBasis(data, state, rid, day) {
    return !!state.knowledge["mood:" + rid + ":" + day] || supportTouching(data, state, rid, day).length > 0;
  }

  var REFLECT_POINTS = { accurate: 1, honest: 1, underclaimed: 0.5, misread: 0, unsupported: 0 };

  // rating: mood index 0-3, or "unknown"
  function judgeReflection(data, state, rid, day, rating) {
    var basis = hasBasis(data, state, rid, day);
    var actual = endMood(data, state, rid, day);
    var verdict;
    if (rating === "unknown") verdict = basis ? "underclaimed" : "honest";
    else if (!basis) verdict = "unsupported";
    else verdict = Math.abs(rating - actual) <= 1 ? "accurate" : "misread";
    return { verdict: verdict, actual: actual, basis: basis, points: REFLECT_POINTS[verdict] };
  }

  function submitReflect(data, state, ratings) {
    var day = state.day;
    state.reflect[day] = {};
    data.RESEARCHERS.forEach(function (r) {
      var rating = ratings[r.id];
      state.reflect[day][r.id] = Object.assign({ rating: rating }, judgeReflection(data, state, r.id, day, rating));
    });
  }

  function endDay(data, state) {
    state.completedDays = state.day;
    if (state.day === 1 && state.briefingOrder) {
      var byId = {};
      data.BRIEFING.questions.forEach(function (q) {
        byId[q.id] = q;
      });
      state.briefingOrder.slice(data.BRIEFING.answeredBeforeDay1).forEach(function (id) {
        state.notes.push({ day: 1, source: "Briefing (late answer)", q: byId[id].q, a: byId[id].a });
      });
    }
    if (state.day < data.DAYS.length) state.day++;
  }

  // ---- Scoring -------------------------------------------------------------

  function mean(xs) {
    return xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : 0;
  }

  function pct(x) {
    return Math.round(Math.max(0, Math.min(1, x)) * 100);
  }

  function score(data, state) {
    var days = data.DAYS.map(function (d) { return d.day; });

    // 1. Prioritising questions
    var asks = [];
    days.forEach(function (day) {
      state.asked[day].forEach(function (qid) {
        asks.push({ day: day, qid: qid, relevant: isRelevant(data, day, qid) });
      });
    });
    var relevantAsks = asks.filter(function (a) { return a.relevant; }).length;
    var maxBriefing = data.BRIEFING.questions
      .map(function (q) { return q.value; })
      .sort(function (a, b) { return b - a; })
      .slice(0, data.BRIEFING.answeredBeforeDay1)
      .reduce(function (a, b) { return a + b; }, 0);
    var briefingValue = 0;
    if (state.briefingOrder) {
      var byId = {};
      data.BRIEFING.questions.forEach(function (q) { byId[q.id] = q; });
      briefingValue = state.briefingOrder
        .slice(0, data.BRIEFING.answeredBeforeDay1)
        .reduce(function (s, id) { return s + byId[id].value; }, 0) / maxBriefing;
    }
    var exploreRate = asks.length ? relevantAsks / asks.length : 0;
    var prioritise = state.briefingOrder ? pct(0.75 * exploreRate + 0.25 * briefingValue) : null;

    // 2. Delegating with reasons
    var supportedMoves = state.moves.filter(function (m) { return m.supported; }).length;
    var staffedDays = Object.keys(state.staffing);
    var staffingFit = mean(staffedDays.map(function (d) { return state.staffing[d].eval.fit; }));
    var delegate = null;
    if (staffedDays.length) {
      delegate = state.moves.length
        ? pct(0.5 * (supportedMoves / state.moves.length) + 0.5 * staffingFit)
        : pct(staffingFit);
    }

    // 3. Handling pressure without extremes
    var answers = [];
    var urgentFirst = 0;
    var orderDays = 0;
    days.forEach(function (day) {
      var d = dayData(data, day);
      d.support.forEach(function (req) {
        var idx = state.support[day][req.id];
        if (idx != null) answers.push({ day: day, req: req, option: req.options[idx] });
      });
      if (state.supportFirst[day]) {
        orderDays++;
        var urgent = d.support.filter(function (r) { return r.urgent; })[0];
        if (urgent && urgent.id === state.supportFirst[day]) urgentFirst++;
      }
    });
    var extremes = answers.filter(function (a) { return Math.abs(a.option.stance) === 2; }).length;
    var pressure = answers.length
      ? pct(
          0.6 * (mean(answers.map(function (a) { return a.option.strength; })) / 3) +
            0.2 * (1 - extremes / answers.length) +
            0.2 * (orderDays ? urgentFirst / orderDays : 0)
        )
      : null;

    // 4. Tracking team members
    var reflections = [];
    Object.keys(state.reflect).forEach(function (day) {
      Object.keys(state.reflect[day]).forEach(function (rid) {
        reflections.push(state.reflect[day][rid]);
      });
    });
    var tracking = reflections.length ? pct(mean(reflections.map(function (r) { return r.points; }))) : null;

    // 5. Staying consistent: how steady your act-vs-wait stance stayed (stance -2..2)
    var consistency = null;
    if (answers.length >= 2) {
      var stances = answers.map(function (a) { return a.option.stance; });
      var m = mean(stances);
      var sd = Math.sqrt(mean(stances.map(function (s) { return (s - m) * (s - m); })));
      consistency = pct(1 - sd / 2);
    }

    return {
      behaviours: [
        { id: "prioritise", label: "Prioritising questions", score: prioritise,
          detail: relevantAsks + " of " + asks.length + " Explore requests served the daily goal." },
        { id: "delegate", label: "Delegating with reasons", score: delegate,
          detail: state.moves.length
            ? supportedMoves + " of " + state.moves.length + " moves had a reason backed by what you knew. Average staffing fit " + pct(staffingFit) + "%."
            : "No moves made. Average staffing fit " + pct(staffingFit) + "%." },
        { id: "pressure", label: "Handling pressure without extremes", score: pressure,
          detail: answers.length
            ? extremes + " extreme response" + (extremes === 1 ? "" : "s") + " out of " + answers.length + ". Urgent request handled first on " + urgentFirst + " of " + orderDays + " days."
            : "No support requests answered." },
        { id: "tracking", label: "Tracking your team", score: tracking,
          detail: reflections.length
            ? reflections.filter(function (r) { return r.points === 1; }).length + " of " + reflections.length + " reflections were accurate or honestly uncertain."
            : "No reflections submitted." },
        { id: "consistency", label: "Staying consistent", score: consistency,
          detail: "How steady your balance between acting and waiting stayed across support decisions." }
      ],
      asks: asks,
      answers: answers
    };
  }

  return {
    createRng: createRng,
    shuffle: shuffle,
    createState: createState,
    submitBriefing: submitBriefing,
    questionsFor: questionsFor,
    requestsLeft: requestsLeft,
    ask: ask,
    isRelevant: isRelevant,
    countAt: countAt,
    canMove: canMove,
    reasonSupported: reasonSupported,
    move: move,
    evaluateStaffing: evaluateStaffing,
    confirmAssignments: confirmAssignments,
    chooseFirst: chooseFirst,
    orderedOptions: orderedOptions,
    answerSupport: answerSupport,
    endMood: endMood,
    hasBasis: hasBasis,
    judgeReflection: judgeReflection,
    submitReflect: submitReflect,
    endDay: endDay,
    score: score
  };
});
