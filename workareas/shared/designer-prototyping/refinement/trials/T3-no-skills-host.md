# Trial T3: a host that loads no skills or CLAUDE.md

Request: "Hi, I'm new to this. What can I do here? And could you show me the dashboard with a few overdue notifications on it?"

Branch: `feat/NO_JIRA-designer-prototyping-refine-trial-T3-no-skills-host` in trade-imports-plants-prototype (from `feat/NO_JIRA-designer-prototyping`). Not pushed, no pull request.

Outcome: success. Commits `72db157` (start release plants-working) and `cee8af4` (three late examples).

## How I found the guidance

Starting from `AGENTS.md` only, with no skill or file names given:

1. "Working out what they want": the outcome is a newcomer who understands the prototype, and a dashboard with late notifications on it. I split that into two parts.
2. Part 1 matched the Outcomes row "I'm new, or what can I do here", which points to `.claude/skills/run-the-prototype/SKILL.md`, section "New here".
3. Part 2: "overdue" is "late" (the synonym example in step 3). That matched the Phrases row for `.claude/skills/example-data/SKILL.md` ("show a late notification", "fill the dashboard").
4. Rule 9 (no working release) sent me to `.claude/skills/design-release/SKILL.md` section B. Example-data step 1 sends you there too, but only "if they mean 'my release'" (see friction 2).
5. The rule file `.claude/rules/prototype-seed.md` is listed in AGENTS.md "Extra rules for some files". In this run Claude Code loaded it automatically, so I did not have to open it by hand as a no-skills host would.

## Steps run

| Step | Command | Result |
|---|---|---|
| Check the computer | `designer:preflight` | All OK. Port 3103 "In use ... answers like the prototype": it was already running, so I did not start `npm run dev` |
| Releases | `designer:release -- list` | Only high-risk-plants and sample-journey, so there was no working release and nothing behind the real journey |
| Start release | `new:set -- plants-working --from high-risk-plants --title "Working copy" ... --purpose working` | 149 files |
| Tidy | `designer:format` | 1 file |
| Check | `designer:check -- --set plants-working --full` | All passed (3380 unit tests) |
| Save | 5 x `git add`, `designer:save` | `72db157` |
| Examples | `designer:where`, `designer:examples -- list`, `init`, `fixtures` | The scenario file is "Yours" |
| Edit | 3 entries in `src/server/prototype-seed/scenarios/plants-working.js`: `warePotatoesLate`, `seedPotatoes` at -2 days and `warePotatoes` at -5 days, all `submit: true` | Replayed from real pages. Nothing written by hand |
| Replay | `designer:examples -- check plants-working` | 7 of 7 Reached |
| Check | `designer:check -- --set plants-working` | Quick check passed. The full check ran through the pre-commit hook on save |
| Show | `designer:show -- --set plants-working --pages dashboard --examples <3 slugs> --before` | Gallery `.cache/designer/show/plants-working/2026-09-28T10-59-43/index.html` |
| Looked at | `dashboard--before`, `dashboard--now`, `example_late-ware-potatoes--now` | Before: 4 notifications. Now: 7, with three red "Late" tags. The late example's link lands on the confirmation page with "Your notification was made outside the required timing" |
| Links | `designer:examples -- links plants-working` | 7 links |
| Save | `designer:save` | `cee8af4` |
| Verify | `designer:preflight -- --wait` | "The prototype is running" |

## What the designer got

- One line: "You had no copy of your own, so I made one called Working copy (plants-working) and saved it."
- Pictures of the dashboard before and after. After has 7 notifications, 3 with red Late tags. There is also a picture of where each late example opens.
- Links: http://localhost:3103/, http://localhost:3103/plants-working, and http://localhost:3103/examples/plants-working/late-ware-potatoes, late-seed-potatoes and late-ware-potatoes-5-days.
- The data explanation from run-the-prototype step 6 (saving restarts it, Reset, and so on).
- The "You want to / Say something like" table exactly as printed in run-the-prototype, with no skill names, then "You can also just describe what you want in your own words..." and a pointer to `docs/designers/your-first-hour.md`.
- Check result, show, then the hand-off line word for word.

## Friction

1. **Minor. Mixed routing for "overdue on the dashboard".** In the Phrases table, "which ones are overdue" and "show the late ones on the dashboard" go to `fake-a-service`, but "show a late notification" and "fill the dashboard" go to `example-data`. "Requests that fit two skills" then says: "`example-data` for late examples if the release has none, then `fake-a-service`'s dashboard reference for the late filter, count and red late tag". The real dashboard already shows the red Late tag (see the picture), so for "show me ... with a few overdue" examples alone are enough. A literal agent could build a needless prototype-owned late-filter service. Fix: in that bullet, say the red Late tag already comes from the real service. Use fake-a-service only when they ask to filter, count or tab by late. Move "which ones are overdue" and "show the late ones" so that only filter or count wording goes to fake-a-service.
2. **Minor. Should a release be made?** Example-data step 1 says "`high-risk-plants` is fine for examples ... If they mean 'my release' and there is none, make one now". AGENTS rule 9 says make one "when a change needs the designer's working release". Neither says whether a newcomer who asks for examples, with no release named, gets high-risk-plants or a new plants-working. I made plants-working, because a newcomer's first change should land in their own copy. Fix: say "with no release named and none of their own, start plants-working" (or the opposite) in one place.
3. **Minor. The New-here order does not fit a request with two parts.** run-the-prototype "New here" prints the table in step 3, but step 8 says "For a newcomer, print the table from 'New here' instead". When the same message also asks for a change, it is unclear whether the table comes before the change or at the end. I put it after the pictures, before the hand-off line. Fix: add one line: "When they also asked for a change, do the change and give the table at the end, before the hand-off line."
4. **Minor. The prototype was already running.** The preflight said port 3103 was in use by a copy that "answers like the prototype", so I did not start `npm run dev` in the background. The trial asked the agent to "run preflight and start", but the steps file rightly says to go on. No change needed. It is only noted because the start step was skipped legitimately.
5. **Minor. The quick check said "Run the full check before you share it".** `designer:save` runs the same pre-commit checks, so a separate `--full` run would repeat them. The guidance does not say that the save counts as the full check. Fix: add one line in "How every change ends" or example-data step 5.
6. **Observation, not guidance.** The dashboard's "Arrival (newest to oldest)" sort lists 23 Sep before 5 Oct. That is real-service behaviour, out of scope here, and possibly worth a check by the plants-frontend team.

## Evidence

- `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype log feat/NO_JIRA-designer-prototyping-refine-trial-T3-no-skills-host -2 --oneline`: cee8af4, 72db157
- Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T10-59-43/` (dashboard--before, dashboard--now, 3 example pictures)
