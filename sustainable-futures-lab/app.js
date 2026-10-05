/* UI layer for the Sustainable Futures Lab practice POC. */
(function () {
  var S = window.SFLScenario;
  var E = window.SFLEngine;
  var TOTAL_TASKS = S.QUESTIONS.length + 1;

  var app = document.getElementById("app");
  var statusEl = document.getElementById("status");
  var progressEl = document.getElementById("progress");
  var timerEl = document.getElementById("timer");
  var fillEl = document.getElementById("progressfill");

  var state;

  function reset() {
    var session = E.buildSession(S, (Math.random() * 2 ** 32) >>> 0);
    state = {
      session: session,
      rankingOrder: session.rankingItems.map(function (i) {
        return i.id;
      }),
      answers: [],
      flags: {},
      qIndex: 0,
      deadline: 0,
      shownAt: 0,
      timerId: null,
      finished: false
    };
  }

  // Tiny element builder: el("div", {class: "x"}, ["text", childNode])
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) node.setAttribute(k, "");
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (function add(c) {
      if (c == null) return;
      if (Array.isArray(c)) return c.forEach(add);
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    })(children);
    return node;
  }

  function mount(node) {
    app.replaceChildren(node);
    app.focus();
    window.scrollTo(0, 0);
  }

  function initials(name) {
    return name
      .replace(/^Dr\.\s*/, "")
      .split(/\s+/)
      .map(function (w) {
        return w[0];
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function messageHead(charId, theme) {
    var c = S.CHARACTERS[charId];
    return el("div", { class: "message-head" }, [
      el("div", { class: "avatar", "aria-hidden": "true" }, initials(c.name)),
      el("div", { class: "who" }, [el("b", null, c.name), el("span", null, c.role)]),
      theme ? el("span", { class: "theme-chip" }, theme) : null
    ]);
  }

  function setProgress(taskNumber) {
    statusEl.hidden = false;
    progressEl.textContent = "Task " + taskNumber + " of " + TOTAL_TASKS;
    fillEl.style.width = ((taskNumber - 1) / TOTAL_TASKS) * 100 + "%";
  }

  // ---- Timer ---------------------------------------------------------------

  function startTimer() {
    state.deadline = Date.now() + S.TIME_LIMIT_SECONDS * 1000;
    tick();
    state.timerId = setInterval(tick, 250);
  }

  function tick() {
    var left = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    var m = Math.floor(left / 60);
    var s = left % 60;
    timerEl.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    timerEl.classList.toggle("low", left <= 120);
    if (left === 0) finish();
  }

  // ---- Screens -------------------------------------------------------------

  function renderIntro() {
    statusEl.hidden = true;
    fillEl.style.width = "0";
    mount(
      el("section", { class: "card" }, [
        el("h1", null, S.BRIEFING.title),
        S.BRIEFING.body.map(function (p) {
          return el("p", null, p);
        }),
        el("div", { class: "facts" }, [
          fact("20 min", "Total time"),
          fact("13 tasks", "1 ranking + 12 decisions"),
          fact("No math", "Judgement and trade-offs only")
        ]),
        el("p", { class: "muted" }, "Once you submit an answer you can't go back. The timer starts when you begin."),
        el("div", { class: "actions" }, [
          el("button", { class: "btn", onclick: begin }, "Begin assessment")
        ])
      ])
    );
  }

  function fact(big, small) {
    return el("div", { class: "fact" }, [el("b", null, big), el("span", null, small)]);
  }

  function begin() {
    startTimer();
    renderRanking();
  }

  function renderRanking() {
    setProgress(1);
    var items = {};
    S.RANKING.items.forEach(function (it) {
      items[it.id] = it;
    });

    var list = el("ol", { class: "rank-list", "aria-label": "Objectives in priority order" });
    var dragId = null;

    function move(from, to) {
      if (to < 0 || to >= state.rankingOrder.length) return;
      var order = state.rankingOrder;
      var moved = order.splice(from, 1)[0];
      order.splice(to, 0, moved);
      draw();
    }

    function draw() {
      list.replaceChildren();
      state.rankingOrder.forEach(function (id, idx) {
        var up = el("button", {
          type: "button",
          "aria-label": "Move up",
          disabled: idx === 0,
          onclick: function () {
            move(idx, idx - 1);
            refocus(id, "up");
          }
        }, "▲");
        var down = el("button", {
          type: "button",
          "aria-label": "Move down",
          disabled: idx === state.rankingOrder.length - 1,
          onclick: function () {
            move(idx, idx + 1);
            refocus(id, "down");
          }
        }, "▼");
        var li = el("li", { class: "rank-item", draggable: "true", "data-id": id }, [
          el("span", { class: "rank-num" }, String(idx + 1)),
          el("span", { class: "rank-text" }, items[id].text),
          el("span", { class: "rank-move" }, [up, down])
        ]);
        li.addEventListener("dragstart", function (e) {
          dragId = id;
          li.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", id);
        });
        li.addEventListener("dragend", function () {
          li.classList.remove("dragging");
        });
        li.addEventListener("dragover", function (e) {
          e.preventDefault();
          li.classList.add("over");
        });
        li.addEventListener("dragleave", function () {
          li.classList.remove("over");
        });
        li.addEventListener("drop", function (e) {
          e.preventDefault();
          li.classList.remove("over");
          if (dragId && dragId !== id) {
            move(state.rankingOrder.indexOf(dragId), state.rankingOrder.indexOf(id));
          }
          dragId = null;
        });
        list.appendChild(li);
      });
    }

    // Keep keyboard focus on the moved item's arrow so repeated presses work.
    function refocus(id, dir) {
      var li = list.querySelector('[data-id="' + id + '"]');
      if (!li) return;
      var btns = li.querySelectorAll("button");
      var target = dir === "up" ? btns[0] : btns[1];
      (target.disabled ? btns[dir === "up" ? 1 : 0] : target).focus();
    }

    draw();

    mount(
      el("section", { class: "card" }, [
        messageHead(S.RANKING.from, "Prioritisation"),
        el("p", null, S.RANKING.prompt),
        el("p", { class: "muted" }, "Drag the items, or use the arrows, to put the highest priority at the top."),
        list,
        el("div", { class: "actions" }, [
          el("button", {
            class: "btn",
            onclick: function () {
              state.qIndex = 0;
              renderQuestion();
            }
          }, "Submit ranking")
        ])
      ])
    );
  }

  function renderQuestion() {
    var i = state.qIndex;
    var q = state.session.questions[i];
    setProgress(i + 2);
    state.shownAt = Date.now();

    var notes = E.resolveVariants(q, state.flags);
    var selected = null;
    var submit = el("button", { class: "btn", disabled: true, onclick: onSubmit }, "Submit decision");
    var name = "opt-" + q.id;

    var options = el(
      "div",
      { class: "options", role: "radiogroup", "aria-label": q.question },
      q.options.map(function (o, idx) {
        return el("label", { class: "option" }, [
          el("input", {
            type: "radio",
            name: name,
            value: String(idx),
            onchange: function () {
              selected = idx;
              submit.disabled = false;
            }
          }),
          el("span", null, o.text)
        ]);
      })
    );

    function onSubmit() {
      if (selected == null) return;
      var opt = q.options[selected];
      state.answers[i] = { optionIndex: selected, seconds: Math.round((Date.now() - state.shownAt) / 1000) };
      state.flags = E.applyFlags(state.flags, opt);
      state.qIndex++;
      if (state.qIndex >= state.session.questions.length) finish();
      else renderQuestion();
    }

    mount(
      el("section", { class: "card" }, [
        messageHead(q.from, q.theme),
        el("p", null, q.context),
        notes.map(function (n) {
          return el("p", { class: "update" }, [el("b", null, "Update: "), n]);
        }),
        el("p", { class: "question" }, q.question),
        options,
        el("div", { class: "actions" }, [submit])
      ])
    );
  }

  function finish() {
    if (state.finished) return;
    state.finished = true;
    clearInterval(state.timerId);
    var timedOut = Date.now() >= state.deadline;
    // Unanswered questions (timer ran out) are recorded as null.
    for (var i = 0; i < state.session.questions.length; i++) {
      if (!state.answers[i]) state.answers[i] = null;
    }
    renderResults(E.score(S, state.session, state.rankingOrder, state.answers), timedOut);
  }

  function renderResults(r, timedOut) {
    progressEl.textContent = "Complete";
    fillEl.style.width = "100%";

    var maxW = Math.max.apply(null, S.DIMENSIONS.map(function (d) { return r.rankingWeights[d.id]; }));
    var maxP = Math.max(1, Math.max.apply(null, S.DIMENSIONS.map(function (d) { return r.profile[d.id]; })));

    var dimRows = S.DIMENSIONS.map(function (d) {
      var a = (r.rankingWeights[d.id] / maxW) * 100;
      var b = (r.profile[d.id] / maxP) * 100;
      return el("div", { class: "dimrow" }, [
        el("span", null, d.label),
        el("div", { class: "bars", role: "img", "aria-label": d.label + ": stated priority " + Math.round(a) + "%, decision emphasis " + Math.round(b) + "%" }, [
          el("div", { class: "bar a", style: "width:" + a + "%" }),
          el("div", { class: "bar b", style: "width:" + b + "%" })
        ])
      ]);
    });

    var strengthLabels = ["Weak", "Partial", "Reasonable", "Strong"];
    var reviewItems = r.review.map(function (row, idx) {
      var pill = row.chosen
        ? el("span", { class: "pill s" + row.chosen.strength }, strengthLabels[row.chosen.strength])
        : el("span", { class: "pill none" }, "Not answered");
      return el("li", null, [
        el("div", { class: "row-head" }, [el("span", null, idx + 2 + ". " + row.theme), pill]),
        el("div", null, row.chosen ? "You chose: " + row.chosen.text : "Time ran out before this decision."),
        row.chosen ? el("div", { class: "muted" }, row.chosen.why) : null,
        !row.chosen || row.chosen.strength < 3
          ? el("div", { class: "alt" }, "Stronger pattern: " + row.best.text + " " + row.best.why)
          : null
      ]);
    });

    mount(
      el("section", { class: "card" }, [
        el("h1", null, "Your decision profile"),
        el("p", { class: "muted" },
          (timedOut ? "Time ran out. " : "") + "You answered " + r.answeredCount + " of " + r.total + " scenario decisions."),
        el("div", { class: "scores" }, [
          scoreTile("Response strength", r.strength, "How often your choices matched the commonly cited strong pattern: act, flag uncertainty, propose a next step and involve the right people."),
          scoreTile("Priority alignment", r.alignment, "How closely your decisions emphasised what you ranked as most important in Task 1."),
          scoreTile("Trade-off stability", r.stability, "How consistent your trade-off profile stayed between the first and second half of the scenario.")
        ]),
        el("h3", null, "Stated priorities vs. decision emphasis"),
        el("div", { class: "legend" }, [
          el("span", null, [el("i", { style: "background:var(--bar-a)" }), "Your ranking (Task 1)"]),
          el("span", null, [el("i", { style: "background:var(--bar-b)" }), "Your decisions (Tasks 2–13)"])
        ]),
        dimRows,
        el("h3", null, "Decision review"),
        el("ol", { class: "review" }, reviewItems),
        el("div", { class: "actions" }, [
          el("button", { class: "btn", onclick: function () { reset(); renderIntro(); } }, "Try again with reshuffled options")
        ]),
        el("p", { class: "disclaimer" },
          "This is an unofficial practice prototype. The scenario and scoring heuristics are original and illustrative, not McKinsey's actual content or scoring model.")
      ])
    );
  }

  function scoreTile(label, value, help) {
    return el("div", { class: "score" }, [
      el("div", { class: "label" }, label),
      el("b", null, value + "%"),
      el("p", null, help)
    ]);
  }

  reset();
  renderIntro();
})();
