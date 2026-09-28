# T2: ticket from the prototype

The designer asked: "On my working release, change the hint on the reason for import question to 'Tell us why you are bringing these plants in' and add a yes/no question asking whether the plants were grown under glass. Then write it up as a story the developers can pick up and build properly in the real service."

Branch: `feat/NO_JIRA-designer-prototyping-refine-trial-T2-ticket-from-prototype` in trade-imports-plants-prototype (local only, not pushed, no PR). Three commits:

- `96c4fd9` Start design release plants-working from high-risk-plants (149 files)
- `f7e2e4f` plants-working: add 'Were the plants grown under glass?' yes/no question to origin and check your answers (11 files, `Recipe: add-a-field`)
- `7ae18be` Hand-off story: Ask whether the plants were grown under glass (10 files)

After the last commit I switched back to `feat/NO_JIRA-designer-prototyping`, and `git status --short` printed nothing.

## Outcome

Partial. Part 2 (the grown under glass question) and part 3 (the story) are done and checked. Part 1 (the reason for import hint) could not be done, because there is no reason for import question in the plants journey. I made nothing up to fill that gap.

## Steps and how I found the guidance

1. **Routing.** CLAUDE.md loads AGENTS.md. "Working out what they want" told me to split the request into parts:
   - hint change: `change-the-words`, from the phrase table ("change the hint")
   - yes/no question: `change-the-journey` ("add a question")
   - story: `hand-off`, from the outcomes table ("write this up as a story"), plus "Requests that fit two skills": "a change that was never made is made first, then saved, then hand-off"

   I found every route without being told a skill name.
2. **No working release.** `designer:release -- list` showed only `high-risk-plants` and `sample-journey`. I followed AGENTS rule 9 and design-release section B: `new:set plants-working --from high-risk-plants --purpose working`, then `designer:format`, then `designer:check --full` (all passed), then saved it as its own commit.
3. **Part 1, the hint.**
   - `designer:words find "reason for import"`, `find "reason"` and `find "purpose"` against plants-working each returned 0 matches.
   - `change-the-journey/references/page-id-places.md` lists every page, and none is a reason for import page.
   - `grep` shows why: `sets/high-risk-plants/spec/journey-spec.json` says "No plants source asks a reason-for-import or purpose question… the plants journey does not use this service" (the import-reason-purpose service is deliberately empty).
   - I did not invent a question, its options or a hint home for it. The designer is told this part is not done.
4. **Part 2, the question.** routes.md sent "Add a question" to the real-service add-a-field recipe.
   - The question has no page of its own to live on (its obvious home, reason for import, does not exist), so I put it on the notification-level origin page, "About the consignment", below country of origin.
   - Pre-edit checks: `designer:where` on all 11 files (all "Yours"), a new `uuidgen` UUID, and a grep for the UUID and the field name (both unused).
   - Edits:
     - the `grownUnderGlass` obligation (mandatory), in `obligations/sections/origin.js` and `index.js`
     - the binding in `origin/evaluation.js`
     - `origin/controller.js`: collects the field, adds a `requiredOneOf` yes/no rule, prefills and commits the answer. `originErrors` (used by check your answers) is unchanged.
     - `govukRadios` inline in `template.njk`
     - English and Welsh copy, with `[Welsh needed]` markers
     - a check your answers row and its labels
     - `grownUnderGlass` in all 5 scenarios in `happy-path.json`
   - Checks: `designer:examples check` (4 of 4 reached) and `designer:check --walk` (everything passed, 3380 unit tests, every journey walked).
   - Show: `designer:show --pages origin,notification-view --errors --before`. I opened the after page, the after error state and check your answers myself: inline Yes/No radios under the country, both errors in the error summary, and "Grown under glass: No" with a Change link.
5. **Part 3, the story.** I followed hand-off route 1.
   - The `upstream` remote already had push `DISABLED`. `git fetch upstream main` worked.
   - I ran the dry run, then `designer:show --compare high-risk-plants --errors`.
   - I drafted 3 Given/When/Then criteria from what the prototype really does, in `.cache/designer/handoff/grown-under-glass.criteria.txt`.
   - Then `designer:handoff --title … --criteria … --recipe add-a-field`. I left out `--as`, `--want`, `--so-that` and `--why` because the designer gave none of them, so they stay placeholders.
   - I checked the patch myself too: `git -C repos/trade-imports-plants-frontend apply --check` on its clean `main` passed all 11 files. The screenshots come to 1.3 MB (6 PNGs, desktop, compare plus now, including errors).
   - Then `designer:format` and `designer:save`.

## Evidence

- Hand-off folder: `repos/trade-imports-plants-prototype/handoffs/2026-09-28-grown-under-glass/` on the trial branch. It holds `brief.jira.txt`, `brief.md`, `upstream.patch`, `report.json` and `screenshots/`.
- `brief.jira.txt` has:
  - `*Summary:*`, then *As*, *I want* and *So that* as `\[…\]` placeholders
  - `+*Acceptance Criteria*+` with 3 Given/When/Then scenarios
  - `{panel:title=Tech Notes}`
  - `h2. See the prototype`, with "Run it on your own computer" steps
  - `h2. Journey flow` (before and after)
  - `h2. Validation`, with English and Welsh errors (the new row's Welsh error is `[Welsh needed]`)
  - `h2. Tests to add`
- Gallery pictures looked at: `.cache/designer/show/plants-working/2026-09-28T10-52-45/origin--now--page--desktop.png`, `origin--now--errors--desktop.png` and `notification-view--now--page--desktop.png`.

## What the designer is told (summary)

- **Not done: the reason for import hint.** The plants journey has no reason for import question. The real team left it out on purpose, because no plants source asks for it. Tell me whether you meant another question's hint, or whether you want a new reason for import question, with its options, and I will add it.
- **Done: "Were the plants grown under glass?"** It is on the Origin of the import page, below Country of origin, with Yes and No side by side. It is required, with the error "Select yes if the plants were grown under glass". Check your answers shows it under Import details. It is asked for every type of import, including potatoes and wood: say if it should only show for plants for planting.
- Welsh needed: 7 strings.
- **The story still needs your words.** *As*, *I want*, *So that* and the description are still placeholders. I drafted the 3 acceptance criteria from what the prototype does, so check them or change them. Then I will run the hand-off again.
- The patch applies cleanly to plants-frontend main. Nothing is pushed. The trial branch is local, so step 2 of the brief's "Run it on your own computer" only works once the branch is on GitHub.

## Friction

1. **Nothing handles a request that names an element the journey does not have** (major).
   - change-the-words step 2 says only: "If nothing matched, say so and suggest fewer words, or ask the designer to paste the text exactly as the page shows it."
   - "When no single row fits" in AGENTS.md covers parts no steps file covers, not parts whose target does not exist.
   - The hand-off SKILL's own example even uses "Given I am on the reason for import page", which suggests such a page exists.
   - I had to grep `journey-spec.json` to learn why the page is missing.
2. **Placing a new question with no named page** (minor). routes.md sends "add a question" to add-a-field ("a scalar field on an existing page") but gives no rule for choosing the page when the designer's intended home does not exist. It also gives no rule for choosing between add-a-field and add-a-page (GOV.UK one thing per page). I chose origin and said so.
3. **Criteria confirmation clashes with the script's labelling** (major).
   - hand-off step 7: "The acceptance criteria are drafted by you but only used once the designer has confirmed them".
   - Passing `--criteria` makes the script print "3 criterions, from the designer", and the brief does not mark them as drafts awaiting confirmation.
   - Headless runs have no way to mark them "draft, to confirm". The plural "criterions" is also wrong.
4. **"Recipe used" contradicts itself** (minor). The dry run's brief.md said "Recipe used: No recipe named. The change is to layout only…", even though the commit body carried `Recipe: add-a-field` (as change-the-journey step 8 says to write it). Meanwhile the Tech Notes named add-a-field as "worked out from the change". The final run with `--recipe add-a-field` was consistent.
5. **The Validation table lists every rule on the changed pages, not just the changed ones** (minor). It includes unchanged rows such as `answers.arrivalDate | (set in code) | (the same words, set in code: not translated)`, which look broken to a developer reading the ticket. The new rule is not highlighted.
6. **The Journey flow section appears even when nothing changed** (minor). It shows identical Before and After rows, and "Tests to add" still says "The page order or a gate changes: run test:fit:journeys" when "No gate or condition changes" was just stated.
7. **"Run it on your own computer" uses a branch that may not exist** (minor). Step 2 names the current local branch. On an unpushed branch the steps fail for a developer, and the brief does not say the branch must be pushed first.

## Model use

One agent, no workflow launched (a three-part request stays in one run, per rule 6). No dev server was started, because `designer:show` runs its own private copy on port 3203.
