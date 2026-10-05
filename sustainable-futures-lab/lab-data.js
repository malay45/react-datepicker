/*
 * Content for the Sustainable Futures Lab practice simulation (2026 format):
 * a tutorial, a briefing-order onboarding task, then three project days that
 * each run Explore -> Assign -> Support -> Reflect.
 *
 * Original practice content, not McKinsey material. McKinsey has not
 * published how the real module is scored.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SFLData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var STATIONS = [
    { id: "water", label: "Water", desc: "Flow control, gates and water sampling" },
    { id: "plants", label: "Plants", desc: "Vegetation surveys and planting" },
    { id: "comms", label: "Communications", desc: "Community updates, partner liaison and reports" },
    { id: "animals", label: "Animals", desc: "Bird and fish monitoring" }
  ];

  // skills: 0 none, 1 some, 2 strong. start: the station that matches prior experience.
  var RESEARCHERS = [
    { id: "maya", name: "Maya Chen", role: "Ecologist", start: "plants",
      skills: { water: 1, plants: 2, comms: 0, animals: 1 } },
    { id: "tomas", name: "Tomás Reyes", role: "Biologist", start: "animals",
      skills: { water: 1, plants: 1, comms: 1, animals: 2 } },
    { id: "aisha", name: "Aisha Bello", role: "Habitat planner", start: "comms",
      skills: { water: 0, plants: 2, comms: 2, animals: 0 } },
    { id: "ken", name: "Ken Sato", role: "Engineer", start: "water",
      skills: { water: 2, plants: 0, comms: 1, animals: 1 } }
  ];

  var MOODS = [
    { id: "frustrated", label: "Frustrated" },
    { id: "stretched", label: "Stretched" },
    { id: "steady", label: "Steady" },
    { id: "energised", label: "Energised" }
  ];

  var MAX_PER_STATION = 2;
  var EXPLORE_REQUESTS_PER_DAY = 3;
  var TIME_LIMIT_SECONDS = 30 * 60;

  var PROJECT = {
    name: "Rivermouth Wetland Restoration",
    summary:
      "You have just taken over as team lead on a three-day push to restore the Rivermouth wetland before the regional council reviews the project. Your four researchers each bring a different specialism, and there are four workstations to staff."
  };

  var TUTORIAL = [
    {
      title: "You lead the team",
      body: [
        PROJECT.summary,
        "There are no calculations here. Every decision is about people, priorities and incomplete information."
      ]
    },
    {
      title: "Each day has four stages",
      list: [
        ["Explore", "Spend a few requests on questions to researchers or workstations. Each researcher answers one question per day, and some are unavailable on some days."],
        ["Assign", "Move researchers between workstations, up to two per station. Every move asks you why."],
        ["Support", "Researchers bring you dilemmas. Decide which to handle first, then pick a response."],
        ["Reflect", "Rate how each researcher is feeling. \"I don't know\" is a valid answer."]
      ]
    },
    {
      title: "Before you start",
      body: [
        "Everything you learn is saved to your Notes panel.",
        "The clock is paused during this tutorial. You will have 30 minutes for the onboarding task and all three days."
      ]
    }
  ];

  // Onboarding: order the briefing questions. The first three are answered
  // before Day 1; the rest arrive after Day 1. `value` is how useful the
  // answer is early on (used for the prioritisation score).
  var BRIEFING = {
    answeredBeforeDay1: 3,
    questions: [
      { id: "team", value: 1, q: "Who is on my team, and what have they worked on?",
        a: "Maya (ecologist) has led the plant surveys. Tomás (biologist) runs bird and fish monitoring. Aisha (habitat planner) wrote the habitat plans and now handles communications. Ken (engineer) built the water control structures." },
      { id: "morale", value: 1, q: "How is the team feeling coming into the project?",
        a: "Mixed. The previous lead left suddenly, and some people feel their roles have drifted away from what they were hired to do." },
      { id: "stations", value: 0.75, q: "What does each workstation do?",
        a: "Water covers flow control and sampling. Plants covers surveys and planting. Communications covers community updates, partner liaison and reports. Animals covers bird and fish monitoring. Each station holds up to two people." },
      { id: "deliverable", value: 0.5, q: "What does the team deliver at the end?",
        a: "On Day 3 the team delivers a final report and presentation to the regional council and the community." },
      { id: "budget", value: 0, q: "What is the budget?",
        a: "The budget is fixed and already allocated. You won't make spending decisions." }
    ]
  };

  var STATION_SKILLS = {
    water: "Engineering for gate work; ecology or biology background for sampling.",
    plants: "Plant identification and knowledge of the habitat plans.",
    comms: "Clear writing and experience working with the community.",
    animals: "Bird and fish identification."
  };

  var RESEARCHER_QUESTIONS = {
    mood: "How are you feeling about your work today?",
    need: "What would help you most right now?",
    station: "What are you seeing at your station?"
  };

  var STATION_QUESTIONS = {
    urgent: "What is the most urgent need here today?",
    skills: "What skills does this work call for?"
  };

  /*
   * Per-day hidden state:
   *   goal          – the daily goal shown to the player
   *   relevant      – which question kinds serve the goal
   *   unavailable   – researcher who can't be asked today
   *   needs         – people each station needs today
   *   mood          – start-of-day mood index (0 frustrated .. 3 energised)
   *   wants         – station a researcher would like today (or null)
   *   answers       – researcher answers (mood/need/station) and station answers (urgent)
   */
  var DAYS = [
    {
      day: 1,
      goal: "Understand what each researcher needs to do their best work.",
      relevant: ["mood", "need"],
      unavailable: "ken",
      unavailableNote: "On a site visit with the council today.",
      needs: { water: 1, plants: 2, comms: 0, animals: 1 },
      mood: { maya: 1, tomas: 2, aisha: 0, ken: 3 },
      wants: { maya: null, tomas: null, aisha: "plants", ken: null },
      answers: {
        maya: {
          mood: "Honestly, I'm stretched. I'm running all the north-plot surveys alone and my field certification renewal is due on Friday.",
          need: "A second pair of hands on the plant surveys would make the biggest difference. Aisha knows the planting plans better than anyone.",
          station: { about: "plants", a: "Plants is the busiest station. The backlog of plots to survey keeps growing." }
        },
        tomas: {
          mood: "I'm in a good place. The bird counts are on track.",
          need: "I'd like to mentor someone this week. Teaching keeps me sharp.",
          station: { about: "animals", a: "Animals is steady. One person can cover the counts this week." }
        },
        aisha: {
          mood: "To be honest, I'm frustrated. Communications has been quiet and I feel cut off from the field work.",
          need: "I trained as a habitat planner. I'd love to get onto the plant plots and see the plans I wrote take shape.",
          station: { about: "comms", a: "Nothing urgent in Communications until the community meeting on Day 2." }
        },
        ken: null,
        stations: {
          water: "Flows are stable. Routine sampling needs one person.",
          plants: "Forty plots still need surveying before planting starts. This needs two people.",
          comms: "Nothing is due today. The next deliverable is the community meeting on Day 2.",
          animals: "Daily bird counts need one person."
        }
      },
      support: [
        {
          id: "d1-data", from: "maya", involves: ["maya"], urgent: true,
          title: "Recommend on patchy data?",
          text: "The regional council wants our planting recommendation by Friday, but the north-plot survey data is patchy. I could just recommend last year's species mix and get it off our plate. Should I?",
          options: [
            { strength: 3, stance: 0, text: "Let's not guess, and let's not miss the deadline either. Send the council a recommendation based on the plots we have surveyed, flag clearly which areas are provisional, and give them a date for the full version. I'll help you choose which remaining plots matter most." },
            { strength: 0, stance: 2, text: "Yes, send last year's mix. The council needs an answer and nobody is going to check the details." },
            { strength: 1, stance: -2, text: "Tell the council we can't give any recommendation until every plot is surveyed, however long that takes." },
            { strength: 2, stance: 1, text: "Send last year's mix for now, and mention in a footnote that this year's data is incomplete." }
          ]
        },
        {
          id: "d1-training", from: "tomas", involves: ["tomas"], urgent: false,
          title: "Team training session",
          text: "I'd like to run a two-hour bird identification session for the team next week. It could help whoever ends up on Animals. Can I?",
          options: [
            { strength: 3, stance: 0, text: "Good idea. Let's schedule it after the community meeting so it doesn't clash with this week's priorities, at a time everyone can attend. Could you draft a short outline?" },
            { strength: 1, stance: -2, text: "Not now. We're too busy for anything extra on this project." },
            { strength: 1, stance: 2, text: "Absolutely. Run it tomorrow morning and everyone can drop what they're doing to attend." },
            { strength: 2, stance: -1, text: "Maybe. Let's come back to it at the end of the project." }
          ]
        }
      ]
    },
    {
      day: 2,
      goal: "Make sure each workstation has what it needs.",
      relevant: ["urgent", "station"],
      unavailable: "maya",
      unavailableNote: "At her certification exam today.",
      needs: { water: 2, plants: 0, comms: 1, animals: 1 },
      mood: { maya: 1, tomas: 2, aisha: 1, ken: 1 },
      wants: { maya: null, tomas: null, aisha: "comms", ken: "water" },
      answers: {
        maya: null,
        tomas: {
          mood: "Steady. I'm curious how the water situation plays out, though.",
          need: "If Water needs help with the fish-passage checks, I can lend a hand there.",
          station: { about: "animals", a: "Nesting season has started. The counts still need one person." }
        },
        aisha: {
          mood: "A bit nervous. The community meeting is tomorrow and the fishing association is upset.",
          need: "I need focused time on Communications today to prepare for the meeting.",
          station: { about: "comms", a: "Communications needs one person full-time today to prepare the meeting." }
        },
        ken: {
          mood: "Worried. The upstream sluice gate is leaking and flooding the lower plots.",
          need: "I need to be on Water fixing the gate, with a second person monitoring levels.",
          station: { about: "water", a: "Water is the emergency today. It needs two people." }
        },
        stations: {
          water: "The sluice gate is leaking and the lower plots are flooding. This needs two people today, including someone who can work on the gate.",
          plants: "Planting is paused while the lower plots are flooded. No one is needed here today.",
          comms: "The community meeting is tomorrow. One person needs to prepare the materials.",
          animals: "Nesting season has started. One person for the counts."
        }
      },
      support: [
        {
          id: "d2-findings", from: "ken", involves: ["ken"], urgent: true,
          title: "Unwelcome findings for another team",
          text: "Our flow data shows the upstream team's sluice design is causing the flooding. I need to tell them, but they'll be defensive. How should I handle it?",
          options: [
            { strength: 3, stance: 0, text: "Share it today, because the flooding is ongoing. Lead with the data and the goal you both share of protecting the plots, present it as a problem to solve together, and invite them to check our numbers. I can join the call if that helps." },
            { strength: 0, stance: 2, text: "Email their manager directly with the data and make it clear the flooding is their fault." },
            { strength: 1, stance: -2, text: "Hold off. It's not worth the conflict. We can work around the flooding." },
            { strength: 2, stance: -1, text: "Wait until we have another week of data so the case is airtight, then raise it." }
          ]
        },
        {
          id: "d2-promise", from: "aisha", involves: ["aisha"], urgent: false,
          title: "A promise for the community meeting",
          text: "The fishing association wants us to promise at tomorrow's meeting that the wetland won't affect their access. I don't know if we can promise that.",
          options: [
            { strength: 3, stance: 0, text: "Let's not promise what we can't guarantee. Explain what we know today and what we're still assessing, and commit to a date when we'll share the access impact. Let's prepare that message together this afternoon." },
            { strength: 0, stance: 2, text: "Promise it. Keeping them on side matters more right now, and we can sort out the details later." },
            { strength: 1, stance: -2, text: "Avoid the topic at the meeting. If they raise it, say it's out of scope." },
            { strength: 2, stance: 1, text: "Tell them access probably won't be affected, since that's likely true." }
          ]
        }
      ]
    },
    {
      day: 3,
      goal: "Balance what your researchers need with what the workstations need.",
      relevant: ["mood", "need", "urgent"],
      unavailable: "tomas",
      unavailableNote: "Leading a school group on the reserve today.",
      needs: { water: 0, plants: 1, comms: 2, animals: 1 },
      mood: { maya: 2, tomas: 2, aisha: 1, ken: 1 },
      wants: { maya: "plants", tomas: null, aisha: "comms", ken: "animals" },
      answers: {
        maya: {
          mood: "Better than earlier in the week. I just want the final report to be honest about the bird data.",
          need: "I'd like to stay on Plants and close out the surveys.",
          station: { about: "plants", a: "Plants needs one person to finish the last plots." }
        },
        tomas: null,
        aisha: {
          mood: "Stretched. The final report is a lot to write alone.",
          need: "I need someone with me on Communications for the final report.",
          station: { about: "comms", a: "Communications is the bottleneck today. The report needs two people." }
        },
        ken: {
          mood: "Tired. I've been working late on the gate repair data all week.",
          need: "A change of pace would help. I've wanted to try the fish-passage sensors on Animals.",
          station: { about: "water", a: "Water is stable after the repair. No one needs to be there today." }
        },
        stations: {
          water: "Stable since the repair. No one is needed today.",
          plants: "The last plots need finishing. One person.",
          comms: "The final report and presentation are due today. This needs two people.",
          animals: "Final counts. One person."
        }
      },
      support: [
        {
          id: "d3-conflict", from: "aisha", involves: ["maya", "aisha"], urgent: true,
          title: "Disagreement over the final report",
          text: "Maya wants the final report to include the early signs of bird decline. I'm worried it will alarm the community before the data is solid. The report is due today and we're stuck.",
          options: [
            { strength: 3, stance: 0, text: "Let's get the three of us together for fifteen minutes. We include the bird finding with its uncertainty stated plainly, add what we'll monitor next, and you shape the wording of the community summary. That meets both concerns." },
            { strength: 0, stance: -2, text: "Leave the bird finding out. It isn't solid and it will only cause trouble." },
            { strength: 1, stance: 2, text: "Put the bird decline in the headline. The community needs to know, however uncertain it is." },
            { strength: 1, stance: -1, text: "You two work it out between yourselves. It's your report." }
          ]
        },
        {
          id: "d3-workload", from: "ken", involves: ["ken"], urgent: false,
          title: "Workload creeping up",
          text: "I've been staying late every night this week on the gate data. I'm fine, but the report formatting keeps landing on me too.",
          options: [
            { strength: 3, stance: 0, text: "Thanks for telling me. Let's take the formatting off your plate today and share it with the Communications pair, and make sure you finish on time tonight. If anything else is piling up, let me know." },
            { strength: 0, stance: 2, text: "We're all stretched. Push through today and you can rest after the deadline." },
            { strength: 1, stance: -2, text: "Take the rest of the day off and leave everything. We'll manage somehow." },
            { strength: 2, stance: 1, text: "Could you just finish the formatting? You're fastest at it. I'll make sure next week is lighter." }
          ]
        }
      ]
    }
  ];

  var REASONS = [
    { id: "expertise", text: "Their expertise fits this station's work" },
    { id: "capacity", text: "This station needs more people today" },
    { id: "request", text: "They asked for this kind of work" },
    { id: "wellbeing", text: "To ease pressure on them" },
    { id: "pairing", text: "To pair them with someone and share knowledge" },
    { id: "hunch", text: "Just a hunch" }
  ];

  return {
    PROJECT: PROJECT,
    STATIONS: STATIONS,
    RESEARCHERS: RESEARCHERS,
    MOODS: MOODS,
    MAX_PER_STATION: MAX_PER_STATION,
    EXPLORE_REQUESTS_PER_DAY: EXPLORE_REQUESTS_PER_DAY,
    TIME_LIMIT_SECONDS: TIME_LIMIT_SECONDS,
    TUTORIAL: TUTORIAL,
    BRIEFING: BRIEFING,
    STATION_SKILLS: STATION_SKILLS,
    RESEARCHER_QUESTIONS: RESEARCHER_QUESTIONS,
    STATION_QUESTIONS: STATION_QUESTIONS,
    DAYS: DAYS,
    REASONS: REASONS
  };
});
