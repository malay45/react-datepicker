/*
 * Pure game logic for the Sustainable Futures Lab practice POC.
 * No DOM access, so it runs both in the browser and under `node --test`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SFLEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Small seeded PRNG (mulberry32) so a session's option order is reproducible.
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

  // Shuffles option order (the scenario file lists the strongest option first)
  // and the initial ranking order. `originalIndex` keeps answers traceable.
  function buildSession(scenario, seed) {
    var rng = createRng(seed);
    return {
      seed: seed,
      rankingItems: shuffle(scenario.RANKING.items, rng),
      questions: scenario.QUESTIONS.map(function (q) {
        var opts = q.options.map(function (o, i) {
          return Object.assign({ originalIndex: i }, o);
        });
        return Object.assign({}, q, { options: shuffle(opts, rng) });
      })
    };
  }

  // Returns the extra context lines triggered by earlier choices.
  function resolveVariants(question, flags) {
    return (question.variants || [])
      .filter(function (v) {
        return flags[v.when];
      })
      .map(function (v) {
        return v.text;
      });
  }

  function applyFlags(flags, option) {
    var next = Object.assign({}, flags);
    (option.set || []).forEach(function (f) {
      next[f] = true;
    });
    return next;
  }

  function dimIds(dimensions) {
    return dimensions.map(function (d) {
      return d.id;
    });
  }

  function zeroProfile(ids) {
    var p = {};
    ids.forEach(function (id) {
      p[id] = 0;
    });
    return p;
  }

  // Rank 1 of N earns N points, rank N earns 1.
  function rankingWeights(order, items, ids) {
    var byId = {};
    items.forEach(function (it) {
      byId[it.id] = it;
    });
    var w = zeroProfile(ids);
    order.forEach(function (itemId, idx) {
      w[byId[itemId].dim] += order.length - idx;
    });
    return w;
  }

  function choiceProfile(chosenOptions, ids) {
    var p = zeroProfile(ids);
    chosenOptions.forEach(function (o) {
      if (!o) return;
      Object.keys(o.dims || {}).forEach(function (k) {
        if (k in p) p[k] += o.dims[k];
      });
    });
    return p;
  }

  // Average ranks (ties share the mean rank), then Pearson on the ranks.
  function toRanks(values) {
    var idx = values.map(function (v, i) {
      return [v, i];
    });
    idx.sort(function (x, y) {
      return x[0] - y[0];
    });
    var ranks = new Array(values.length);
    var i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) ranks[idx[k][1]] = avg;
      i = j + 1;
    }
    return ranks;
  }

  function pearson(a, b) {
    var n = a.length;
    var ma = 0, mb = 0;
    for (var i = 0; i < n; i++) {
      ma += a[i] / n;
      mb += b[i] / n;
    }
    var num = 0, da = 0, db = 0;
    for (var j = 0; j < n; j++) {
      num += (a[j] - ma) * (b[j] - mb);
      da += (a[j] - ma) * (a[j] - ma);
      db += (b[j] - mb) * (b[j] - mb);
    }
    if (da === 0 || db === 0) return 0;
    return num / Math.sqrt(da * db);
  }

  function spearman(a, b) {
    return pearson(toRanks(a), toRanks(b));
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / Math.sqrt(na * nb);
  }

  function vec(profile, ids) {
    return ids.map(function (id) {
      return profile[id];
    });
  }

  /*
   * answers: array aligned with session.questions; each entry is
   *   { optionIndex: <index into the shuffled options>, seconds } or null.
   * rankingOrder: array of ranking item ids, highest priority first.
   */
  function score(scenario, session, rankingOrder, answers) {
    var ids = dimIds(scenario.DIMENSIONS);
    var chosen = session.questions.map(function (q, i) {
      var a = answers[i];
      return a ? q.options[a.optionIndex] : null;
    });

    var answered = chosen.filter(Boolean);
    var strengthPct = answered.length
      ? Math.round(
          (answered.reduce(function (s, o) {
            return s + o.strength;
          }, 0) /
            (session.questions.length * 3)) *
            100
        )
      : 0;

    var weights = rankingWeights(rankingOrder, scenario.RANKING.items, ids);
    var profile = choiceProfile(chosen, ids);

    // Do the decisions emphasise the same things the ranking said mattered?
    var alignment = Math.round(((spearman(vec(weights, ids), vec(profile, ids)) + 1) / 2) * 100);

    // Is the trade-off profile stable from the first half to the second?
    var half = Math.ceil(chosen.length / 2);
    var early = choiceProfile(chosen.slice(0, half), ids);
    var late = choiceProfile(chosen.slice(half), ids);
    var stability = Math.round(cosine(vec(early, ids), vec(late, ids)) * 100);

    var review = session.questions.map(function (q, i) {
      var pick = chosen[i];
      var best = q.options.reduce(function (b, o) {
        return o.strength > b.strength ? o : b;
      }, q.options[0]);
      return {
        id: q.id,
        theme: q.theme,
        question: q.context,
        chosen: pick,
        best: best,
        seconds: answers[i] ? answers[i].seconds : null
      };
    });

    return {
      answeredCount: answered.length,
      total: session.questions.length,
      strength: strengthPct,
      alignment: alignment,
      stability: stability,
      rankingWeights: weights,
      profile: profile,
      review: review
    };
  }

  return {
    createRng: createRng,
    shuffle: shuffle,
    buildSession: buildSession,
    resolveVariants: resolveVariants,
    applyFlags: applyFlags,
    rankingWeights: rankingWeights,
    choiceProfile: choiceProfile,
    spearman: spearman,
    cosine: cosine,
    score: score
  };
});
