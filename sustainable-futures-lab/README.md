# Sustainable Futures Lab: practice POC

A working proof of concept that simulates the **Sustainable Futures Lab** (SFL) game. McKinsey added this game to its Solve assessment in 2026. The scenario content and scoring are original and only for practice. They are not McKinsey material.

## What the real game looks like (from public prep guides)

- About **20 minutes**, inside the longer Solve session.
- You join a fictional **environmental research team** as a connected scenario unfolds.
- **13 tasks**: one drag-and-drop **priority ranking**, then **12 scenario decisions**, each with four plausible options.
- No calculations. It tests prioritisation, decisions under uncertainty, messy or incomplete data, trade-offs and working with teammates and stakeholders.
- Answers aren't simply right or wrong. Guides say scoring looks at **how consistently you weigh trade-offs** as the situation changes, and earlier choices affect what you see later.

## What this POC implements

| Real-game feature | POC implementation |
| --- | --- |
| Research-team storyline | Project Tidewater: a mangrove restoration in Kelari Bay with 8 recurring characters |
| Task 1: priority ranking | Drag-and-drop list of 5 objectives, plus up/down arrow buttons for keyboard and touch |
| 12 scenario decisions | Stakeholders, evidence, team process, logistics, approvals, adaptation, uncertainty, integrity |
| Connected scenario | Some choices set flags that add **Update** notes to later questions (for example, dismissing the cooperative changes the NGO question) |
| 20-minute limit | Countdown timer. Turns red under 2 minutes and auto-submits at 0:00 (unanswered questions are recorded) |
| No going back | Each answer is final once submitted |
| Option order | Shuffled per session with a seeded PRNG, so the strongest answer isn't always in the same position |

### Scoring (illustrative heuristics)

Each option is tagged with how much it leans on five trade-off dimensions: Evidence, Action, Stakeholders, Risk and Collaboration. Each option also has a 0–3 *strength* score based on the response pattern prep guides commonly describe: act, flag uncertainty, propose a next step and involve the right people.

- **Response strength**: the total strength of your choices as a share of the maximum.
- **Priority alignment**: Spearman correlation between your Task 1 ranking and the dimensions your decisions actually emphasised.
- **Trade-off stability**: cosine similarity of your dimension profile between the first and second halves of the scenario.

The results page shows your stated priorities next to your decision emphasis, and reviews each decision with feedback and the stronger alternative.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
cd sustainable-futures-lab
python3 -m http.server 8000   # then open http://localhost:8000
```

## Test

```sh
cd sustainable-futures-lab
node --test test/*.test.js
```

## Files

- `scenario.js`: all content (briefing, characters, ranking items, 12 questions, option tags and feedback). Edit this file to write new scenarios.
- `engine.js`: pure logic (shuffling, scenario flags, scoring). Works in the browser and in Node.
- `app.js`: the browser UI (screens, timer, drag-and-drop).
- `styles.css`: styling, with light and dark themes and a responsive layout.
