# Sustainable Futures Lab: practice simulation

A working practice version of **Sustainable Futures Lab**, the third game in McKinsey Solve, in its **2026 redesigned format**: a 30-minute, three-day team leadership simulation. The scenario and scoring are original practice content, not McKinsey material.

## The 2026 format, and how this simulation implements it

| Real game (public descriptions) | This simulation |
| --- | --- |
| Lead a four-person research team on an environmental project | Rivermouth Wetland Restoration with an ecologist, a biologist, a habitat planner and an engineer |
| Four workstations: water, plants, communications, animals | The same four, each holding up to two people or left empty |
| Tutorial with the timer paused | A three-page tutorial. The 30-minute clock starts only when you leave it |
| Onboarding: drag-and-drop order of briefing questions | Order five briefing questions. The top three are answered before Day 1 and the rest at the end of Day 1, so the order changes what you know when |
| Three days with different goals (researcher needs, then workstation needs, then both) | The same three goals, with a day tracker in the header |
| **Explore:** a few requests per day, one answer per researcher per day, rotating availability, Notes panel | 3 requests per day. A researcher who has answered can't be asked again that day, and a different person is unavailable each day. Every answer is saved to Notes |
| **Assign:** researchers start on stations that match their experience. Every move asks why, from a fixed list | Drag a researcher, or use the Move menu. Each move opens a reason picker with 6 fixed reasons, and the reason is recorded |
| **Support:** dilemmas with paragraph-length answers, and choosing which request to handle first | Two requests arrive together each day. Pick which comes first, then choose between four full-paragraph replies |
| **Reflect:** rate how each researcher is feeling, with "I don't know" available | Rate all four researchers. "I don't know" is honest when you never gathered information; a confident rating without any is flagged |
| 30-minute timer | Countdown that turns red under 3 minutes and ends the game at 0:00 |

### Hidden state that makes decisions matter

- Each day has hidden **station needs**, such as a flooding emergency at Water on Day 2. Each researcher has a **start-of-day mood** and sometimes a **station they want**.
- **End-of-day mood** changes with your choices. Placing someone on the station they want, or giving them a strong reply, lifts it. A poor reply, or leaving a stressed person alone on a two-person job, lowers it.
- **Reasons are checked against what you knew.** "They asked for this kind of work" only counts if you asked them that day and they did ask for it. "This station needs more people" only counts if you learned the need and the station really was short. "Just a hunch" never counts.

### Results: the five behaviours

The results screen scores the five behaviours the game is understood to reward. McKinsey has not published its scoring, so these are illustrative practice heuristics.

1. **Prioritising questions:** the share of Explore requests that served the daily goal, plus how useful your briefing order was.
2. **Delegating with reasons:** the share of moves whose reason was backed by what you knew, plus how well each day's staffing covered the needs with the right skills.
3. **Handling pressure without extremes:** the quality of your support replies, how many were extreme (all push or all avoid), and whether you handled the urgent request first.
4. **Tracking your team:** your Reflect ratings, scored as accurate, honest "I don't know", under-claimed, misread, or claimed without information.
5. **Staying consistent:** how steady your balance between acting and waiting stayed across support decisions.

A day-by-day review then shows every question, move, reason, reply and reflection, with the stronger alternative wherever you chose a weaker option.

## Run it

No dependencies and no build step. Open `index.html` in a browser, or serve the folder:

```sh
cd sustainable-futures-lab
python3 -m http.server 8000   # then open http://localhost:8000
```

To produce a single self-contained HTML file (inline CSS and JS) for hosts that serve one page:

```sh
node build.js                 # writes dist/sustainable-futures-lab.html
```

## Deploy to Vercel

In the Vercel project settings, set **Root Directory** to `sustainable-futures-lab`. The `vercel.json` in this folder skips the install, copies the files that should be served into `dist/`, and serves that folder. The game is at `/` and the retired 13-question version at `/classic/`.

## Test

```sh
cd sustainable-futures-lab
node --test test/*.test.js classic/test/*.test.js
```

## Files

- `lab-data.js`: all content, including the team, stations, briefing, each day's hidden state, Explore answers, support dilemmas and assignment reasons.
- `lab-engine.js`: pure game logic (requests, reason checks, staffing fit, mood, reflection verdicts, scoring). Works in the browser and in Node.
- `lab-app.js`: the browser UI (tutorial, onboarding, the four stages, Notes, timer, results).
- `lab.css`: styling, with light and dark themes and a responsive layout.
- `build.js`: bundles everything into one HTML file.
- `classic/`: the earlier, now-retired 13-question format (one ranking task plus 12 scenario decisions in 20 minutes), kept for reference.
