/*
 * Scenario content for the Sustainable Futures Lab practice POC.
 *
 * Every option carries:
 *   dims     – which trade-off dimensions the choice leans on (0-2 each)
 *   strength – 0-3 heuristic of how closely it matches the commonly cited
 *              "strong response" pattern (act, disclose uncertainty, propose
 *              a concrete next step, involve the right people)
 *   set      – optional flags that change later parts of the scenario
 *   why      – feedback shown on the results screen
 *
 * This is original practice content; it is not McKinsey material.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SFLScenario = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var DIMENSIONS = [
    { id: "E", label: "Evidence & rigor" },
    { id: "A", label: "Momentum & action" },
    { id: "S", label: "Stakeholder alignment" },
    { id: "R", label: "Risk & compliance" },
    { id: "C", label: "Team collaboration" }
  ];

  var CHARACTERS = {
    amara: { name: "Dr. Amara Osei", role: "Project lead (your manager)" },
    leo: { name: "Leo Marquez", role: "Field ecologist" },
    priya: { name: "Priya Nair", role: "Data analyst" },
    rafael: { name: "Rafael Duarte", role: "Kelari Fishing Cooperative" },
    ministry: { name: "Coastal Ministry", role: "Regional regulator" },
    funder: { name: "GreenBridge Foundation", role: "Project funder" },
    joon: { name: "Joon Park", role: "Field technician" },
    ngo: { name: "Shoreline Voices", role: "Local NGO" }
  };

  var BRIEFING = {
    title: "Project Tidewater: Kelari Bay mangrove restoration",
    body: [
      "You have joined the Sustainable Futures Lab, a small research team restoring degraded mangrove forest along Kelari Bay.",
      "Healthy mangroves slow coastal erosion, store carbon and shelter the juvenile fish that the local fishing cooperative depends on.",
      "The team has a fixed grant from the GreenBridge Foundation, a planting window that closes when the monsoon arrives in about five weeks, and six candidate restoration sites.",
      "Over the next 20 minutes you will set your priorities and then handle 12 situations as the project unfolds. Earlier decisions shape what happens later. Most options are defensible, so pick the one you would actually choose."
    ]
  };

  var RANKING = {
    id: "rank",
    from: "amara",
    prompt:
      "Before we kick off, rank these five project objectives from highest to lowest priority for the first phase. Consider impact, feasibility, risk and stakeholder alignment.",
    items: [
      { id: "plant", dim: "A", text: "Start planting at the highest-erosion sites before the monsoon" },
      { id: "community", dim: "S", text: "Secure support from the fishing cooperative and local community" },
      { id: "baseline", dim: "E", text: "Establish rigorous baseline ecological data for every site" },
      { id: "permits", dim: "R", text: "Obtain all permits and manage regulatory and environmental risk" },
      { id: "team", dim: "C", text: "Align the multidisciplinary team on one shared work plan" }
    ]
  };

  var QUESTIONS = [
    {
      id: "q-survey",
      theme: "Incomplete information",
      from: "leo",
      context:
        "Field survey results for the six candidate sites are in. A salinity sensor failed, so Sites 2 and 6 are missing salinity readings. Amara needs a site shortlist for the funder by Friday.",
      question: "What do you do?",
      options: [
        {
          text: "Shortlist the four sites with complete data, mark Sites 2 and 6 as pending, schedule re-measurement next week and explain the logic to Amara.",
          dims: { E: 1, A: 1, S: 1, R: 1 }, strength: 3,
          why: "Keeps the deadline and is open about the gap, with a concrete plan to close it."
        },
        {
          text: "Hold the shortlist until all six sites have complete data, even if it misses Friday.",
          dims: { E: 2, R: 1 }, strength: 1,
          why: "Rigorous, but it gives up a commitment when a partial answer would have worked."
        },
        {
          text: "Estimate the missing salinity from neighbouring sites and present all six as complete.",
          dims: { A: 2 }, strength: 0, set: ["estimatedData"],
          why: "Hiding uncertainty is the clearest red flag. Estimates are fine only if they're labelled."
        },
        {
          text: "Ask Amara to decide which sites to include.",
          dims: { C: 1 }, strength: 1,
          why: "Passes up a decision you're well placed to make and adds no recommendation."
        }
      ]
    },
    {
      id: "q-coop",
      theme: "Stakeholders",
      from: "rafael",
      context:
        "Rafael from the fishing cooperative emails that planting at Site 3, one of your strongest sites, could block the channels their boats use at low tide.",
      question: "How do you respond?",
      options: [
        {
          text: "Meet Rafael at Site 3 with the planting map and design a layout together that keeps the boat channels open.",
          dims: { S: 2, C: 1 }, strength: 3, set: ["coopEngaged"],
          why: "Treats the concern as information and turns a stakeholder into a co-owner."
        },
        {
          text: "Explain that the science points to Site 3 and planting will go ahead as planned.",
          dims: { A: 2, E: 1 }, strength: 0, set: ["coopAlienated"],
          why: "Accurate on the science, but it dismisses a legitimate concern that could stall the project."
        },
        {
          text: "Drop Site 3 from the plan to avoid any conflict.",
          dims: { R: 1, S: 1 }, strength: 1,
          why: "Avoids the conflict but gives up impact without checking whether a compromise exists."
        },
        {
          text: "Forward the email to the ministry liaison to handle.",
          dims: { R: 1 }, strength: 1,
          why: "Sends a relationship issue to the wrong owner."
        }
      ]
    },
    {
      id: "q-models",
      theme: "Team process",
      from: "priya",
      context:
        "Priya and Leo disagree on which growth model to use for projecting seedling survival. Their projections differ by about 20%, and the planning meeting has stalled.",
      question: "What is the best next step?",
      options: [
        {
          text: "Run both models on last year's pilot data, agree on comparison criteria up front and pick whichever predicts observed survival better.",
          dims: { E: 2, C: 1 }, strength: 3,
          why: "Settles the disagreement with evidence both people accept, and quickly."
        },
        {
          text: "Go with Leo's model since he has more field experience.",
          dims: { A: 2 }, strength: 1,
          why: "Fast, but it defers to seniority instead of evidence and may lose Priya."
        },
        {
          text: "Escalate to Amara to make the call.",
          dims: { C: 1 }, strength: 1,
          why: "Escalates a question the team can answer itself."
        },
        {
          text: "Average the two projections and move on without discussing it further.",
          dims: { A: 1 }, strength: 1,
          why: "Looks like a compromise, but it hides the disagreement instead of resolving it."
        }
      ]
    },
    {
      id: "q-supply",
      theme: "Logistics",
      from: "leo",
      context:
        "The nursery says 40% of the seedling order will arrive three weeks late. The monsoon is expected in five weeks, so the planting window is tight.",
      question: "What do you do?",
      options: [
        {
          text: "Plant the 60% available now at the highest-priority sites, source the rest from a second nursery after checking species and provenance, and update the funder on the timeline.",
          dims: { A: 2, R: 1, S: 1 }, strength: 3,
          why: "Keeps momentum, protects quality and keeps the funder informed."
        },
        {
          text: "Wait for the full order and plant everything at once.",
          dims: { R: 1 }, strength: 1,
          why: "Risks missing the window for the sake of a simpler schedule."
        },
        {
          text: "Buy from whichever supplier can deliver the gap fastest and cheapest.",
          dims: { A: 2 }, strength: 0, set: ["unvettedSeedlings"],
          why: "Speed without quality checks can introduce the wrong species or poor stock."
        },
        {
          text: "Postpone all planting to next season.",
          dims: { R: 2 }, strength: 1,
          why: "Too cautious. It gives up a year of impact over a partial delay."
        }
      ]
    },
    {
      id: "q-permit",
      theme: "Approvals",
      from: "ministry",
      context:
        "The permit for Site 5 is still pending. A ministry contact tells you informally that it should be fine to go ahead.",
      question: "How do you proceed?",
      options: [
        {
          text: "Start prep work that doesn't need the permit, such as surveys and staging, and formally request written confirmation.",
          dims: { R: 2, A: 1 }, strength: 3,
          why: "Keeps the work moving without compliance risk."
        },
        {
          text: "Start planting on the strength of the informal OK.",
          dims: { A: 2 }, strength: 0, set: ["permitRisk"],
          why: "An informal OK is not a permit, and this puts the whole project's licence at risk."
        },
        {
          text: "Stop all Site 5 activity until the permit arrives.",
          dims: { R: 2 }, strength: 1,
          why: "Compliant, but it leaves useful permit-free work undone."
        },
        {
          text: "Ask the funder to push the ministry to speed things up.",
          dims: { A: 1 }, strength: 0,
          why: "Using funder pressure on a regulator can damage both relationships."
        }
      ]
    },
    {
      id: "q-survival",
      theme: "Adaptation",
      from: "leo",
      context:
        "Two-week monitoring shows 45% seedling survival at Site 2, against the 80% expected.",
      variants: [
        {
          when: "estimatedData",
          text: "Site 2 is one of the sites where salinity was estimated, not measured."
        }
      ],
      question: "What do you do first?",
      options: [
        {
          text: "Pause further planting at Site 2 only, investigate the cause with Leo (salinity, planting technique, tides) and share the early finding with Amara.",
          dims: { E: 2, R: 1, S: 1 }, strength: 3,
          why: "Contains the problem, looks for the root cause and keeps leadership informed."
        },
        {
          text: "Replant Site 2 right away at double density to make up the numbers.",
          dims: { A: 2 }, strength: 0,
          why: "Puts more resources into a problem that hasn't been diagnosed."
        },
        {
          text: "Abandon Site 2 and move its resources elsewhere.",
          dims: { R: 1, A: 1 }, strength: 1,
          why: "Decisive, but it's too early to know whether the site can be saved."
        },
        {
          text: "Wait for next month's monitoring round to see if things improve.",
          dims: {}, strength: 1,
          why: "Waiting during a short planting window costs a lot."
        }
      ]
    },
    {
      id: "q-press",
      theme: "Stakeholders",
      from: "funder",
      context:
        "GreenBridge wants a press release saying the project will sequester 10,000 tonnes of CO₂. Your models support 4,000 to 7,000 tonnes, with wide uncertainty.",
      question: "How do you respond?",
      options: [
        {
          text: "Propose a release that uses the supported range with a short methodology note, highlights concrete progress and offers updates as the data improves.",
          dims: { S: 2, E: 1 }, strength: 3,
          why: "Gives the funder a story they can use without overclaiming."
        },
        {
          text: "Agree to the 10,000-tonne figure to keep the funder happy.",
          dims: { S: 1 }, strength: 0,
          why: "Overclaiming creates reputational and integrity risk."
        },
        {
          text: "Decline any press release until the project is finished.",
          dims: { R: 1, E: 1 }, strength: 1,
          why: "Too rigid. There is real progress worth sharing honestly."
        },
        {
          text: "Let the funder's comms team write it however they like.",
          dims: {}, strength: 0,
          why: "Gives up responsibility for claims about your own work."
        }
      ]
    },
    {
      id: "q-team",
      theme: "Team process",
      from: "joon",
      context:
        "The field team has been working 12-hour days to beat the monsoon. Joon mentions he is exhausted and had a near-miss operating the boat yesterday.",
      question: "What do you do?",
      options: [
        {
          text: "Hold a short team check-in, re-sequence tasks to rebalance the load, set a boat safety protocol and tell Amara about any timeline impact.",
          dims: { C: 2, R: 1, S: 1 }, strength: 3,
          why: "Fixes the safety issue and the workload problem behind it, and is open about the trade-off."
        },
        {
          text: "Keep going. The monsoon deadline is fixed.",
          dims: { A: 2 }, strength: 0,
          why: "Ignoring a safety near-miss is not acceptable."
        },
        {
          text: "Give Joon a day off but leave the plan unchanged.",
          dims: { C: 1 }, strength: 1,
          why: "Helps one person but leaves the cause in place for everyone else."
        },
        {
          text: "Raise Joon's fatigue with Amara as a performance concern.",
          dims: {}, strength: 0,
          why: "Treats a safety and workload signal as an individual failing."
        }
      ]
    },
    {
      id: "q-ngo",
      theme: "Stakeholders",
      from: "ngo",
      context:
        "Shoreline Voices, a local NGO, posts publicly that the community was never consulted about the restoration.",
      variants: [
        {
          when: "coopAlienated",
          text: "Rafael has joined the criticism and quotes your earlier reply about Site 3."
        },
        {
          when: "coopEngaged",
          text: "Rafael has offered to speak in support and cites the Site 3 layout you designed together."
        }
      ],
      question: "How do you respond?",
      options: [
        {
          text: "Run an open community session with the NGO and the cooperative, share the plans and data, and publish how their input changes the plan.",
          dims: { S: 2, C: 1 }, strength: 3,
          why: "Answers the criticism with transparency and real involvement."
        },
        {
          text: "Publish a statement rebutting the claims point by point.",
          dims: { A: 1, E: 1 }, strength: 1,
          why: "Defensive. It may be accurate but it escalates the conflict."
        },
        {
          text: "Ignore it. The NGO isn't a formal project stakeholder.",
          dims: {}, strength: 0,
          why: "Community legitimacy matters even without a formal role."
        },
        {
          text: "Ask the ministry to respond on the project's behalf.",
          dims: { R: 1 }, strength: 1,
          why: "Hands over a conversation the team should own."
        }
      ]
    },
    {
      id: "q-satellite",
      theme: "Uncertainty",
      from: "priya",
      context:
        "New satellite data suggests sediment flow is shifting and could affect Sites 4 and 6 within two to three years. Confidence is moderate, ground-truthing takes two months, and the next-phase budget is due in two weeks.",
      question: "How do you handle the budget?",
      options: [
        {
          text: "Allocate the budget with a contingency reserve for Sites 4 and 6, commission targeted ground-truthing and set a decision checkpoint for when the results arrive.",
          dims: { R: 2, E: 1, A: 1 }, strength: 3,
          why: "Decides now while keeping room to adjust. A no-regret move under uncertainty."
        },
        {
          text: "Move all funding away from Sites 4 and 6 now.",
          dims: { A: 2, R: 1 }, strength: 1,
          why: "Overreacts to an unvalidated signal."
        },
        {
          text: "Ignore the satellite data until it has been validated.",
          dims: { A: 1 }, strength: 0,
          why: "Discards a material risk signal."
        },
        {
          text: "Ask for a two-month extension on the budget decision.",
          dims: { E: 2 }, strength: 1,
          why: "Perfect data is rarely available. Delay has costs too."
        }
      ]
    },
    {
      id: "q-error",
      theme: "Integrity",
      from: "priya",
      context:
        "Priya finds a spreadsheet formula error. The survival rates in last month's funder report were overstated by about 10 percentage points.",
      variants: [
        {
          when: "permitRisk",
          text: "Separately, a ministry inspector has noted that planting at Site 5 began before the written permit was issued."
        },
        {
          when: "unvettedSeedlings",
          text: "Separately, Leo found that some seedlings from the emergency supplier are a non-native species."
        }
      ],
      question: "What do you do?",
      options: [
        {
          text: "Fix the analysis, tell Amara right away and send the funder a corrected report that explains the error and the check added to prevent it.",
          dims: { S: 2, E: 1, R: 1 }, strength: 3,
          why: "Prompt, open correction protects trust far better than silence."
        },
        {
          text: "Fix it quietly in the next quarterly report.",
          dims: { A: 1 }, strength: 0,
          why: "Concealing a known error damages integrity."
        },
        {
          text: "Tell Amara and let her decide whether to inform the funder.",
          dims: { C: 1, R: 1 }, strength: 2,
          why: "Escalating is right, but you should come with a recommendation too."
        },
        {
          text: "Re-audit every past report before telling anyone. That will take about three weeks.",
          dims: { E: 2 }, strength: 1,
          why: "Thorough, but three weeks is too long to keep a known error to yourself."
        }
      ]
    },
    {
      id: "q-phase2",
      theme: "Recommendation",
      from: "amara",
      context:
        "Phase 1 is wrapping up. Survival across the sites averages 68%, community relations are stable and about 15% of the budget is left. Amara asks for your recommendation on the scope of Phase 2.",
      question: "What do you recommend?",
      options: [
        {
          text: "Scale to three new sites using the validated methods, pilot one new technique at a single site, and set clear success metrics and stakeholder review points.",
          dims: { A: 1, E: 1, S: 1, R: 1 }, strength: 3,
          why: "Grows impact, keeps learning and manages risk."
        },
        {
          text: "Expand to ten new sites to maximise impact.",
          dims: { A: 2 }, strength: 1,
          why: "Ambitious, but it outruns the evidence and the remaining budget."
        },
        {
          text: "Stay at the current sites and focus on deeper research.",
          dims: { E: 2, R: 1 }, strength: 1,
          why: "Safe, but it doesn't build on what has worked."
        },
        {
          text: "Let the funder set the Phase 2 scope.",
          dims: { S: 1 }, strength: 0,
          why: "Gives up the team's expertise and ownership."
        }
      ]
    }
  ];

  return {
    DIMENSIONS: DIMENSIONS,
    CHARACTERS: CHARACTERS,
    BRIEFING: BRIEFING,
    RANKING: RANKING,
    QUESTIONS: QUESTIONS,
    TIME_LIMIT_SECONDS: 20 * 60
  };
});
