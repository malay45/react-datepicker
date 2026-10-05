/* UI layer for the Sustainable Futures Lab practice simulation. */
(function () {
  var D = window.SFLData;
  var E = window.SFLEngine;

  var stageEl = document.getElementById("stage");
  var layoutEl = document.getElementById("layout");
  var notesEl = document.getElementById("notes");
  var notesToggle = document.getElementById("notes-toggle");
  var trackerEl = document.getElementById("tracker");
  var timerEl = document.getElementById("timer");
  var dialogRoot = document.getElementById("dialog-root");

  var STAGES = ["explore", "assign", "support", "reflect"];
  var STAGE_LABELS = { explore: "Explore", assign: "Assign", support: "Support", reflect: "Reflect" };

  var game; // engine state
  var ui; // screen state

  function newGame() {
    game = E.createState(D, (Math.random() * 4294967296) >>> 0);
    ui = {
      phase: "tutorial",
      tutorialPage: 0,
      briefing: D.BRIEFING.questions.map(function (q) { return q.id; }),
      lastAnswer: null,
      supportStep: 0,
      reflectDraft: {},
      deadline: 0,
      timerId: null,
      finished: false,
      timedOut: false
    };
    dialogRoot.replaceChildren();
    timerEl.textContent = fmt(D.TIME_LIMIT_SECONDS);
    timerEl.className = "timer paused";
    render();
  }

  // ---- Helpers -------------------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") node.className = v;
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, "");
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    (function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    })(children);
    return node;
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function person(id) {
    return D.RESEARCHERS.filter(function (r) { return r.id === id; })[0];
  }

  function station(id) {
    return D.STATIONS.filter(function (s) { return s.id === id; })[0];
  }

  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function who(r, sub) {
    return el("div", { class: "who" }, [
      el("span", { class: "avatar", "aria-hidden": "true" }, initials(r.name)),
      el("div", null, [el("b", null, r.name), el("span", null, sub || r.role)])
    ]);
  }

  function stTag(sid) {
    return el("span", { class: "st-tag st-" + sid }, station(sid).label);
  }

  function dayData() {
    return D.DAYS[game.day - 1];
  }

  function flat(nodes) {
    var out = [];
    (function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      out.push(c);
    })(nodes);
    return out;
  }

  function mount(nodes) {
    stageEl.replaceChildren.apply(stageEl, flat(nodes));
    renderChrome();
    stageEl.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---- Timer ---------------------------------------------------------------

  function startClock() {
    ui.deadline = Date.now() + D.TIME_LIMIT_SECONDS * 1000;
    timerEl.classList.remove("paused");
    tick();
    ui.timerId = setInterval(tick, 250);
  }

  function tick() {
    var left = Math.max(0, Math.ceil((ui.deadline - Date.now()) / 1000));
    timerEl.textContent = fmt(left);
    timerEl.classList.toggle("low", left <= 180);
    if (left === 0) {
      ui.timedOut = true;
      finish();
    }
  }

  function finish() {
    if (ui.finished) return;
    ui.finished = true;
    clearInterval(ui.timerId);
    dialogRoot.replaceChildren();
    ui.phase = "results";
    render();
  }

  // ---- Chrome: tracker + notes --------------------------------------------

  function renderChrome() {
    var items = [{ key: "onboarding", label: "Onboarding" }].concat(
      D.DAYS.map(function (d) { return { key: "day" + d.day, label: "Day " + d.day }; })
    );
    var currentIdx;
    if (ui.phase === "tutorial") currentIdx = -1;
    else if (ui.phase === "onboarding") currentIdx = 0;
    else if (ui.phase === "results") currentIdx = items.length;
    else currentIdx = game.day;
    trackerEl.replaceChildren.apply(
      trackerEl,
      items.map(function (it, i) {
        var cls = i < currentIdx ? "done" : i === currentIdx ? "now" : "";
        return el("li", { class: cls, "aria-current": i === currentIdx ? "step" : null }, it.label);
      })
    );

    var showNotes = ui.phase !== "tutorial" && ui.phase !== "results";
    notesEl.hidden = !showNotes;
    notesToggle.hidden = !showNotes;
    layoutEl.classList.toggle("solo", !showNotes);
    if (showNotes) renderNotes();
  }

  function renderNotes() {
    var groups = {};
    game.notes.forEach(function (n) {
      (groups[n.day] = groups[n.day] || []).push(n);
    });
    var days = Object.keys(groups).sort();
    notesToggle.textContent = "Notes (" + game.notes.length + ")";
    notesEl.replaceChildren.apply(notesEl, flat([
      el("h3", null, "Notes"),
      game.notes.length
        ? days.map(function (day) {
            return el("div", null, [
              el("div", { class: "note-day" }, day === "0" ? "Briefing" : "Day " + day),
              el("ol", null, groups[day].map(function (n) {
                return el("li", { class: "note" }, [
                  el("span", { class: "src" }, n.source),
                  el("span", { class: "q" }, n.q),
                  el("span", null, n.a)
                ]);
              }))
            ]);
          })
        : el("p", { class: "muted small" }, "Answers from the briefing and your Explore requests will collect here.")
    ]));
  }

  notesToggle.addEventListener("click", function () {
    var open = notesEl.classList.toggle("collapsed") === false;
    notesToggle.setAttribute("aria-expanded", String(open));
  });

  // ---- Router --------------------------------------------------------------

  function render() {
    switch (ui.phase) {
      case "tutorial": return renderTutorial();
      case "onboarding": return renderOnboarding();
      case "goal": return renderGoal();
      case "explore": return renderExplore();
      case "assign": return renderAssign();
      case "support": return renderSupport();
      case "reflect": return renderReflect();
      case "results": return renderResults();
    }
  }

  function stepper(current) {
    var idx = STAGES.indexOf(current);
    return el("ol", { class: "steps", "aria-label": "Stages today" }, STAGES.map(function (s, i) {
      return el("li", { class: i < idx ? "done" : i === idx ? "now" : "" }, STAGE_LABELS[s]);
    }));
  }

  function stageHeader(stage, title, intro) {
    return el("div", { class: "panel" }, [
      el("div", { class: "eyebrow" }, "Day " + game.day + " of " + D.DAYS.length),
      stepper(stage),
      el("h2", null, title),
      el("p", { class: "goal" }, "Today's goal: " + dayData().goal),
      intro ? el("p", { class: "muted" }, intro) : null
    ]);
  }

  // ---- Tutorial ------------------------------------------------------------

  function renderTutorial() {
    var page = D.TUTORIAL[ui.tutorialPage];
    var last = ui.tutorialPage === D.TUTORIAL.length - 1;
    mount(el("section", { class: "panel" }, [
      el("div", { class: "eyebrow" }, "Tutorial · clock paused · " + (ui.tutorialPage + 1) + " of " + D.TUTORIAL.length),
      el("h1", null, page.title),
      (page.body || []).map(function (p) { return el("p", null, p); }),
      page.list ? el("ul", { class: "dl" }, page.list.map(function (row) {
        return el("li", null, [el("b", null, row[0]), el("span", null, row[1])]);
      })) : null,
      ui.tutorialPage === 0 ? el("div", { class: "grid-2" }, D.RESEARCHERS.map(function (r) {
        return el("div", { class: "target" }, [who(r), el("span", { class: "small muted" }, ["Starts on ", stTag(r.start)])]);
      })) : null,
      el("div", { class: "actions" }, [
        ui.tutorialPage > 0 ? el("button", { class: "btn ghost", type: "button", onclick: function () { ui.tutorialPage--; render(); } }, "Back") : null,
        el("button", {
          class: "btn",
          type: "button",
          onclick: function () {
            if (last) {
              ui.phase = "onboarding";
              startClock();
            } else ui.tutorialPage++;
            render();
          }
        }, last ? "Start the clock" : "Next")
      ])
    ]));
  }

  // ---- Onboarding ----------------------------------------------------------

  function renderOnboarding() {
    var byId = {};
    D.BRIEFING.questions.forEach(function (q) { byId[q.id] = q; });
    var cut = D.BRIEFING.answeredBeforeDay1;
    var list = el("ol", { class: "rank-list", "aria-label": "Briefing questions in order" });
    var dragId = null;

    function moveItem(from, to) {
      if (to < 0 || to >= ui.briefing.length) return;
      var moved = ui.briefing.splice(from, 1)[0];
      ui.briefing.splice(to, 0, moved);
      draw();
    }

    function draw(focus) {
      list.replaceChildren();
      ui.briefing.forEach(function (id, idx) {
        if (idx === cut) list.appendChild(el("li", { class: "cutline", "aria-hidden": "true" }, "Answered after Day 1"));
        var up = el("button", { type: "button", "aria-label": "Move up", disabled: idx === 0,
          onclick: function () { moveItem(idx, idx - 1); draw({ id: id, dir: 0 }); } }, "▲");
        var down = el("button", { type: "button", "aria-label": "Move down", disabled: idx === ui.briefing.length - 1,
          onclick: function () { moveItem(idx, idx + 1); draw({ id: id, dir: 1 }); } }, "▼");
        var li = el("li", { class: "rank-item" + (idx >= cut ? " cut" : ""), draggable: "true", "data-id": id }, [
          el("span", { class: "rank-num" }, String(idx + 1)),
          el("span", { class: "rank-text" }, byId[id].q),
          el("span", { class: "rank-move" }, [up, down])
        ]);
        li.addEventListener("dragstart", function (e) {
          dragId = id;
          li.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", id);
        });
        li.addEventListener("dragend", function () { li.classList.remove("dragging"); });
        li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("over"); });
        li.addEventListener("dragleave", function () { li.classList.remove("over"); });
        li.addEventListener("drop", function (e) {
          e.preventDefault();
          if (dragId && dragId !== id) moveItem(ui.briefing.indexOf(dragId), ui.briefing.indexOf(id));
          dragId = null;
        });
        list.appendChild(li);
      });
      if (focus) {
        var btns = list.querySelectorAll('[data-id="' + focus.id + '"] button');
        if (btns.length) (btns[focus.dir].disabled ? btns[1 - focus.dir] : btns[focus.dir]).focus();
      }
    }
    draw();

    mount(el("section", { class: "panel" }, [
      el("div", { class: "eyebrow" }, "Onboarding"),
      el("h1", null, D.PROJECT.name),
      el("p", null, "Your project sponsor has time to answer three of these before Day 1 starts. The rest will be answered at the end of Day 1. Put the questions you need first at the top."),
      el("p", { class: "muted small" }, "Drag the questions, or use the arrows."),
      list,
      el("div", { class: "actions" }, [
        el("button", {
          class: "btn",
          type: "button",
          onclick: function () {
            E.submitBriefing(D, game, ui.briefing);
            ui.phase = "goal";
            render();
          }
        }, "Send questions")
      ])
    ]));
  }

  // ---- Day goal ------------------------------------------------------------

  function renderGoal() {
    var d = dayData();
    mount(el("section", { class: "panel" }, [
      el("div", { class: "eyebrow" }, "Day " + d.day + " of " + D.DAYS.length),
      el("h1", null, "Day " + d.day),
      el("p", { class: "goal" }, "Today's goal: " + d.goal),
      el("p", null, [
        el("b", null, person(d.unavailable).name),
        " can't be reached for questions today. " + d.unavailableNote
      ]),
      el("ul", { class: "dl" }, STAGES.map(function (s) {
        var text = {
          explore: D.EXPLORE_REQUESTS_PER_DAY + " requests. Each researcher answers one question.",
          assign: "Move people between stations. Each move needs a reason.",
          support: "Two requests arrive at once. Decide which comes first.",
          reflect: "Rate how each researcher is feeling."
        }[s];
        return el("li", null, [el("b", null, STAGE_LABELS[s]), el("span", null, text)]);
      })),
      el("div", { class: "actions" }, [
        el("button", { class: "btn", type: "button", onclick: function () { ui.phase = "explore"; ui.lastAnswer = null; render(); } }, "Start Explore")
      ])
    ]));
  }

  // ---- Explore -------------------------------------------------------------

  function renderExplore() {
    var d = dayData();
    var qs = E.questionsFor(D, game);
    var left = E.requestsLeft(D, game);

    function qButton(q) {
      var asked = game.asked[game.day].indexOf(q.id) >= 0;
      return el("button", {
        type: "button",
        class: "qbtn" + (asked ? " asked" : ""),
        disabled: !!q.blocked,
        onclick: function () {
          ui.lastAnswer = E.ask(D, game, q.id);
          render();
        }
      }, [q.label, q.blocked && !asked && q.blocked !== "No requests left" ? el("small", null, q.blocked) : null]);
    }

    var tokens = el("div", { class: "tokens", "aria-label": left + " of " + D.EXPLORE_REQUESTS_PER_DAY + " requests left" }, [
      Array.apply(null, Array(D.EXPLORE_REQUESTS_PER_DAY)).map(function (_, i) {
        return el("span", { class: "token" + (i < left ? " full" : ""), "aria-hidden": "true" });
      }),
      el("span", null, left + " request" + (left === 1 ? "" : "s") + " left")
    ]);

    var people = D.RESEARCHERS.map(function (r) {
      var away = d.unavailable === r.id;
      return el("div", { class: "target" + (away ? " away" : "") }, [
        el("div", { class: "target-head" }, [who(r), stTag(game.assignment[r.id])]),
        away ? el("p", { class: "small muted" }, "Unavailable today. " + d.unavailableNote) : null,
        away ? null : qs.filter(function (q) { return q.target === r.id; }).map(qButton)
      ]);
    });

    var stations = D.STATIONS.map(function (s) {
      return el("div", { class: "target st-" + s.id }, [
        el("div", { class: "target-head" }, [el("h3", { style: "color:var(--st)" }, s.label)]),
        el("p", { class: "small muted" }, s.desc),
        qs.filter(function (q) { return q.target === s.id; }).map(qButton)
      ]);
    });

    mount([
      stageHeader("explore", "Explore", "Spend your requests on the questions today's goal needs. Unused requests don't carry over."),
      ui.lastAnswer ? el("div", { class: "answer", role: "status" }, [
        el("b", null, ui.lastAnswer.source),
        el("span", { class: "small muted" }, ui.lastAnswer.q),
        el("span", null, ui.lastAnswer.a)
      ]) : null,
      el("div", { class: "panel" }, [
        el("div", { class: "target-head" }, [el("h3", null, "Researchers"), tokens]),
        el("div", { class: "grid-2" }, people)
      ]),
      el("div", { class: "panel" }, [el("h3", null, "Workstations"), el("div", { class: "grid-2" }, stations)]),
      el("div", { class: "actions" }, [
        left > 0 ? el("span", { class: "small muted" }, "You can move on with requests unused.") : null,
        el("button", { class: "btn", type: "button", onclick: function () { ui.phase = "assign"; render(); } }, "Go to Assign")
      ])
    ]);
  }

  // ---- Assign --------------------------------------------------------------

  function askReason(rid, to) {
    var r = person(rid);
    var choice = null;
    var confirm = el("button", { class: "btn", type: "button", disabled: true }, "Confirm move");
    var previouslyFocused = document.activeElement;

    function close() {
      dialogRoot.replaceChildren();
      document.removeEventListener("keydown", onKey);
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }

    confirm.addEventListener("click", function () {
      E.move(D, game, rid, to, choice);
      close();
      render();
    });

    var dialog = el("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "reason-title" }, [
      el("h2", { id: "reason-title" }, "Why move " + r.name.split(" ")[0] + "?"),
      el("p", { class: "small muted" }, [station(game.assignment[rid]).label + " → " + station(to).label]),
      el("div", { class: "options", role: "radiogroup", "aria-labelledby": "reason-title" }, D.REASONS.map(function (rs) {
        return el("label", { class: "option" }, [
          el("input", { type: "radio", name: "reason", id: "reason-" + rs.id, value: rs.id,
            onchange: function () { choice = rs.id; confirm.disabled = false; } }),
          el("span", null, rs.text)
        ]);
      })),
      el("div", { class: "actions" }, [
        el("button", { class: "btn ghost", type: "button", onclick: close }, "Cancel"),
        confirm
      ])
    ]);
    var scrim = el("div", { class: "scrim", onclick: function (e) { if (e.target === scrim) close(); } }, dialog);
    dialogRoot.replaceChildren(scrim);
    document.addEventListener("keydown", onKey);
    dialog.querySelector("input").focus();
  }

  function tryMove(rid, to) {
    if (!to || to === game.assignment[rid]) return;
    if (!E.canMove(D, game, rid, to)) {
      render();
      return;
    }
    askReason(rid, to);
  }

  function renderAssign() {
    var dragId = null;
    var columns = D.STATIONS.map(function (s) {
      var here = D.RESEARCHERS.filter(function (r) { return game.assignment[r.id] === s.id; });
      var col = el("div", { class: "station st-" + s.id, "data-station": s.id }, [
        el("div", { class: "target-head" }, [el("h3", null, s.label), el("span", { class: "cap" }, here.length + "/" + D.MAX_PER_STATION)]),
        here.map(function (r) {
          var select = el("select", { "aria-label": "Move " + r.name + " to", id: "move-" + r.id,
            onchange: function (e) { tryMove(r.id, e.target.value); } }, [
            el("option", { value: "" }, "Move to…"),
            D.STATIONS.filter(function (o) { return o.id !== s.id; }).map(function (o) {
              var full = E.countAt(game.assignment, o.id) >= D.MAX_PER_STATION;
              return el("option", { value: o.id, disabled: full }, o.label + (full ? " (full)" : ""));
            })
          ]);
          var chip = el("div", { class: "chip", draggable: "true" }, [who(r), select]);
          chip.addEventListener("dragstart", function (e) {
            dragId = r.id;
            chip.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", r.id);
          });
          chip.addEventListener("dragend", function () { chip.classList.remove("dragging"); });
          return chip;
        }),
        here.length < D.MAX_PER_STATION ? el("div", { class: "empty-slot" }, here.length ? "Room for one more" : "Empty") : null
      ]);
      col.addEventListener("dragover", function (e) {
        if (dragId && E.canMove(D, game, dragId, s.id)) {
          e.preventDefault();
          col.classList.add("over");
        }
      });
      col.addEventListener("dragleave", function () { col.classList.remove("over"); });
      col.addEventListener("drop", function (e) {
        e.preventDefault();
        col.classList.remove("over");
        var id = dragId;
        dragId = null;
        if (id) tryMove(id, s.id);
      });
      return col;
    });

    var today = game.moves.filter(function (m) { return m.day === game.day; });
    var reasonText = {};
    D.REASONS.forEach(function (r) { reasonText[r.id] = r.text; });

    mount([
      stageHeader("assign", "Assign", "Each station holds up to two people, or can stay empty. Drag a researcher, or use their Move menu. You'll be asked why."),
      el("div", { class: "board" }, columns),
      el("div", { class: "panel" }, [
        el("h3", null, "Moves today"),
        today.length
          ? el("ol", { class: "log" }, today.map(function (m) {
              return el("li", null, [el("b", null, person(m.researcher).name), ": ", station(m.from).label, " → ", station(m.to).label, ". ", el("span", { class: "muted" }, reasonText[m.reason])]);
            }))
          : el("p", { class: "small muted" }, "No moves yet. Keeping someone where they are is also a decision.")
      ]),
      el("div", { class: "actions" }, [
        el("button", { class: "btn", type: "button", onclick: function () {
          E.confirmAssignments(D, game);
          ui.phase = "support";
          ui.supportStep = 0;
          render();
        } }, "Confirm assignments")
      ])
    ]);
  }

  // ---- Support -------------------------------------------------------------

  function renderSupport() {
    var d = dayData();
    var first = game.supportFirst[game.day];

    if (!first) {
      mount([
        stageHeader("support", "Support", "Two requests have arrived at the same time. Which one do you handle first?"),
        d.support.map(function (req) {
          return el("div", { class: "request" }, [
            el("div", { class: "target-head" }, [who(person(req.from)), el("span", { class: "flag" }, req.title)]),
            el("p", null, req.text),
            el("div", { class: "actions" }, [
              el("button", { class: "btn ghost small", type: "button", onclick: function () {
                E.chooseFirst(D, game, req.id);
                render();
              } }, "Handle this first")
            ])
          ]);
        })
      ]);
      return;
    }

    var order = [first].concat(d.support.filter(function (r) { return r.id !== first; }).map(function (r) { return r.id; }));
    var reqId = order[ui.supportStep];
    var req = d.support.filter(function (r) { return r.id === reqId; })[0];
    var choice = null;
    var send = el("button", { class: "btn", type: "button", disabled: true }, "Send reply");
    send.addEventListener("click", function () {
      E.answerSupport(D, game, req.id, choice);
      if (ui.supportStep < order.length - 1) ui.supportStep++;
      else {
        ui.phase = "reflect";
        ui.reflectDraft = {};
      }
      render();
    });

    mount([
      stageHeader("support", "Support", "Request " + (ui.supportStep + 1) + " of " + order.length + ". Read each response closely; the differences are in the details."),
      el("div", { class: "request" }, [
        el("div", { class: "target-head" }, [who(person(req.from)), el("span", { class: "flag" }, req.title)]),
        el("p", null, req.text)
      ]),
      el("div", { class: "options", role: "radiogroup", "aria-label": "Your reply" }, E.orderedOptions(D, game, req).map(function (o) {
        return el("label", { class: "option" }, [
          el("input", { type: "radio", name: "reply-" + req.id, id: "reply-" + req.id + "-" + o.originalIndex,
            onchange: function () { choice = o.originalIndex; send.disabled = false; } }),
          el("span", null, o.text)
        ]);
      })),
      el("div", { class: "actions" }, [send])
    ]);
  }

  // ---- Reflect -------------------------------------------------------------

  function renderReflect() {
    var done = el("button", { class: "btn", type: "button" }, game.day < D.DAYS.length ? "End Day " + game.day : "Finish project");
    function update() {
      done.disabled = D.RESEARCHERS.some(function (r) { return ui.reflectDraft[r.id] == null; });
    }
    done.addEventListener("click", function () {
      E.submitReflect(D, game, ui.reflectDraft);
      var last = game.day === D.DAYS.length;
      E.endDay(D, game);
      if (last) finish();
      else {
        ui.phase = "goal";
        render();
      }
    });

    var choices = D.MOODS.slice().reverse().map(function (m) {
      return { value: D.MOODS.indexOf(m), label: m.label };
    }).concat([{ value: "unknown", label: "I don't know" }]);

    var rows = D.RESEARCHERS.map(function (r) {
      return el("div", { class: "reflect-row", role: "radiogroup", "aria-label": "How is " + r.name + " feeling?" }, [
        who(r),
        el("div", { class: "seg" }, choices.map(function (c) {
          var id = "mood-" + r.id + "-" + c.value;
          return el("label", { class: c.value === "unknown" ? "idk" : "", for: id }, [
            el("input", { type: "radio", id: id, name: "mood-" + r.id, checked: ui.reflectDraft[r.id] === c.value,
              onchange: function () { ui.reflectDraft[r.id] = c.value; update(); } }),
            c.label
          ]);
        }))
      ]);
    });
    update();

    mount([
      stageHeader("reflect", "Reflect", "How is each researcher feeling at the end of the day? Only claim what you actually know."),
      el("div", { class: "panel" }, rows),
      el("div", { class: "actions" }, [done])
    ]);
  }

  // ---- Results -------------------------------------------------------------

  var VERDICT = {
    accurate: ["Accurate read", "good"],
    honest: ["Honest \"I don't know\"", "good"],
    underclaimed: ["You had information but said \"I don't know\"", "mid"],
    misread: ["Misread", "bad"],
    unsupported: ["Claimed without information", "bad"]
  };

  function strengthPill(s) {
    if (s === 3) return el("span", { class: "pill good" }, "Strong");
    if (s === 2) return el("span", { class: "pill mid" }, "Reasonable");
    return el("span", { class: "pill bad" }, s === 1 ? "Weak" : "Poor");
  }

  function renderResults() {
    renderChrome();
    timerEl.classList.add("paused");
    var r = E.score(D, game);
    var reasonText = {};
    D.REASONS.forEach(function (x) { reasonText[x.id] = x.text; });

    var dayBlocks = D.DAYS.filter(function (d) { return d.day <= Math.max(game.completedDays, game.day); }).map(function (d) {
      var day = d.day;
      var asks = r.asks.filter(function (a) { return a.day === day; });
      var moves = game.moves.filter(function (m) { return m.day === day; });
      var staffing = game.staffing[day];
      var first = game.supportFirst[day];
      var urgent = d.support.filter(function (x) { return x.urgent; })[0];
      var answered = r.answers.filter(function (a) { return a.day === day; });
      var refl = game.reflect[day];
      if (!asks.length && !staffing && !first && !refl) return null;

      return el("section", { class: "panel" }, [
        el("h2", null, "Day " + day),
        el("p", { class: "muted small" }, "Goal: " + d.goal),
        el("h3", null, "Explore"),
        asks.length
          ? el("ul", { class: "review" }, asks.map(function (a) {
              var parts = a.qid.split(":");
              var target = parts[0] === "r" ? person(parts[1]).name : station(parts[1]).label + " station";
              var label = parts[0] === "r" ? D.RESEARCHER_QUESTIONS[parts[2]] : D.STATION_QUESTIONS[parts[2]];
              return el("li", null, [el("span", null, target + ": " + label),
                el("span", { class: "pill " + (a.relevant ? "good" : "mid") }, a.relevant ? "On goal" : "Off goal")]);
            }))
          : el("p", { class: "small muted" }, "No requests used."),
        el("h3", null, "Assign"),
        moves.length
          ? el("ul", { class: "review" }, moves.map(function (m) {
              return el("li", null, [
                el("span", null, person(m.researcher).name + " → " + station(m.to).label + ": " + reasonText[m.reason]),
                el("span", { class: "pill " + (m.supported ? "good" : "bad") }, m.supported ? "Reason backed" : "Reason not backed")
              ]);
            }))
          : el("p", { class: "small muted" }, "No moves."),
        staffing ? el("p", { class: "small" }, "Staffing fit " + Math.round(staffing.eval.fit * 100) + "%." +
          (staffing.eval.gaps.length ? " Under-staffed: " + staffing.eval.gaps.join(", ") + "." : " Every need was covered.") +
          (staffing.eval.idle.length ? " People on stations with no work today: " + staffing.eval.idle.join(", ") + "." : "")) : null,
        el("h3", null, "Support"),
        first ? el("p", { class: "small" }, [
          "Handled first: " + d.support.filter(function (x) { return x.id === first; })[0].title + " ",
          el("span", { class: "pill " + (first === urgent.id ? "good" : "mid") }, first === urgent.id ? "Urgent first" : "Urgent one waited")
        ]) : null,
        answered.length
          ? el("ul", { class: "review" }, answered.map(function (a) {
              var best = a.req.options.filter(function (o) { return o.strength === 3; })[0];
              return el("li", null, [
                el("span", null, [el("b", null, a.req.title + (/[?.!]$/.test(a.req.title) ? " " : ". ")), a.option.text,
                  a.option.strength < 3 ? el("span", { class: "muted" }, [el("br"), "Stronger: " + best.text]) : null]),
                strengthPill(a.option.strength)
              ]);
            }))
          : el("p", { class: "small muted" }, "Not reached."),
        el("h3", null, "Reflect"),
        refl
          ? el("ul", { class: "review" }, D.RESEARCHERS.map(function (p) {
              var x = refl[p.id];
              var said = x.rating === "unknown" ? "I don't know" : D.MOODS[x.rating].label;
              return el("li", null, [
                el("span", null, p.name + ": you said " + said + ". End of day: " + D.MOODS[x.actual].label + "."),
                el("span", { class: "pill " + VERDICT[x.verdict][1] }, VERDICT[x.verdict][0])
              ]);
            }))
          : el("p", { class: "small muted" }, "Not reached.")
      ]);
    });

    mount([
      el("section", { class: "panel" }, [
        el("div", { class: "eyebrow" }, ui.timedOut ? "Time ran out" : "Project complete"),
        el("h1", null, "How you led the team"),
        el("p", { class: "muted" }, "Scores reflect the five behaviours the game is understood to reward. They are practice heuristics; McKinsey has not published how the real module is scored."),
        el("div", { class: "behaviours" }, r.behaviours.map(function (b) {
          return el("div", { class: "behaviour" }, [
            el("div", null, [el("b", null, b.label), el("div", { class: "small muted" }, b.detail)]),
            el("span", { class: "num" }, b.score == null ? "–" : b.score + "%"),
            el("div", { class: "meter", "aria-hidden": "true" }, el("div", { style: "width:" + (b.score || 0) + "%" }))
          ]);
        }))
      ]),
      dayBlocks,
      el("div", { class: "actions" }, [
        el("button", { class: "btn", type: "button", onclick: newGame }, "Play again")
      ]),
      el("p", { class: "disclaimer" }, "Unofficial practice simulation based on public descriptions of the 2026 format. The scenario and scoring are original and illustrative, not McKinsey content.")
    ]);
  }

  newGame();
})();
