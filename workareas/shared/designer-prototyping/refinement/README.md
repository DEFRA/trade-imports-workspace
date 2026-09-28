# Designer prototyping: your four refinement comments

This covers the designer suite in `repos/trade-imports-plants-prototype`, on branch `feat/NO_JIRA-designer-prototyping`. You asked whether your four comments were already met, and to fix whatever was not.

**In short:** all four are now met. Two were only partly met before (intent-first routing, and making a ticket from the prototype). One was not met at all (the real service pattern). The work is in two commits, `c4a686a` and `667d723`. Four designer trials were run, in designer words with no skill names, and every one was routed correctly.

The final review made one more small fix, committed as `801f61a` (hook passed: 3,386 tests, lint and format clean). The branch is clean.

## Where the evidence is

Everything below is in `workareas/shared/designer-prototyping/refinement/`:

- `plan.md`: what was meant to change
- the four `assess-*.md` files: the verdicts before any change
- `trials/T1` to `trials/T4`: what each trial did and where it got stuck
- `trials/fixes.md`: how each problem from the trials was fixed

Each trial ran on its own local branch, `feat/NO_JIRA-designer-prototyping-refine-trial-T1-…` to `…-T4-…`. None was pushed.

Final review run, on the branch as it stands:

- 3,386 unit tests passed (8 skipped)
- `npm run lint:js` is clean
- nothing refers to `src/server/prototype-services` any more
- every new path is covered by `overrides.json`

## 1. Purpose: as close to the real frontend as possible

**Before:** mostly met.

- A design release is a full copy of the real journey. It uses the real engine, components and example data.
- But nothing told a designer when the real journey had changed since they made their copy. They only found out at hand-off.
- `PROTOTYPE.md` repeated three other docs, and had nowhere that listed how the prototype differs from the real service.

**What changed:**

- `scripts/designer/release/drift.js`. `designer:release list` now has a "Real journey changed since" column, and `designer:release drift <release>` names the pages that changed.
- The `design-release` skill mentions drift when there is any, and offers to pick up the real team's changes.
- `PROTOTYPE.md` is now about 100 lines and leads with "just say what you want". It has a new section, "How close is this to the real service?", which lists every known difference in one place.
- `AGENTS.md`, "What this repo is", states the aim: work on one page and the next page is already there.

**Evidence:**

- `drift.test.js` and `list.test.js` cover both cases: no drift, and some drift.
- In T4, `designer:release drift plants-working` said "The real team has not changed any page since".
- In T1 and T2, new pages went into a copy of the real journey (a Transport page, and a "grown under glass" question). Nothing was mocked, so the next page was real.

## 2. Intent-first: designers say what they want, not which skill to use

**Before:** partly met.

- Routing matched on phrases, not on what the designer wanted. In a paper test of 10 phrasings, 3 went to the wrong place and 1 stalled.
- "Nothing fits" was a dead end.
- `AGENTS.md` was only a pointer, so any host other than Claude Code got no routing.
- The designer docs put a skill name next to every phrase.

**What changed (the design):**

- **Routing is written into an always-loaded file, not a hooked-in skill.** `AGENTS.md` now holds every rule and all the routing. Cursor, Codex and Copilot read `AGENTS.md` without being told to. `CLAUDE.md` is now `@AGENTS.md` plus three notes that only apply in Claude Code. So there is one copy of the routing, and it works with or without skills.
- `AGENTS.md` has a section called "Working out what they want". It works in six steps:
  1. name the outcome
  2. split the request into parts
  3. map each part, first on an **Outcomes** table (demo, research round, crit notes, I'm new, a feature the real service lacks, a ticket for the developers, stay current, start from scratch), then on a wider **Phrases** table
  4. check what is already true
  5. do the parts in order
  6. ask at most one plain question
- "When no single row fits" now splits the request into parts instead of stopping.
- Every route names its steps file by path (`.claude/skills/<x>/SKILL.md`), so a host that never loads skills still finds the same steps.
- **One handle a designer can say: `.claude/skills/design/SKILL.md`.** "Use the design skill", "/design" or just "design" sends the agent to "Working out what they want". It holds no routing of its own, so the two cannot drift apart. `AGENTS.md` also tells hosts with no skills what "use the design skill" means.
- **Why not one big skill with the 13 as sub-skills:** it would only work when the skill loads, which is the dependency you said to avoid, and it would repeat the routing.
- `PROTOTYPE.md`, `docs/designers/README.md` and `your-first-hour.md` lead with "just say what you want". They have a "You want to / Say something like" table with no skill column. They also say: "If Claude seems lost, say 'use the design skill'".
- The `design-session` workflow now reads its routing from `AGENTS.md` and splits vague notes instead of refusing them.
- `scripts/designer/suite.test.js` checks four things:
  - every skill is in `ours`
  - `AGENTS.md` names every skill path
  - `CLAUDE.md` imports `AGENTS.md`
  - nothing mentions `prototype-services`

**Fixed in this review (not committed):**

- `designer:check` printed "Skill that fixes it: change-the-words", and `docs/designers/checks-and-errors.md` called it "the skill to ask for". That told designers to ask for skills by name.
- It now prints "Steps Claude follows to fix it: …". The doc says it is a note for Claude, and that the designer can just say "fix it".
- Files changed: `scripts/designer/check/report.js`, `report.test.js` and `docs/designers/checks-and-errors.md`.

**Evidence:** all four trials routed correctly without any skill name.

- **T1:** "save a vehicle they use a lot" matched the Outcomes row word for word.
- **T2:** a request with three parts was split into three routes.
- **T3:** "overdue" was matched as "late".
- **T4:** "demo on Thursday" matched an Outcomes row. The agent asked one question, and the question did not hold up the work.

**Partial:** T3 was meant to test a host that reads only `AGENTS.md`. It ran in Claude Code, which also loaded a rule file by itself. The routing it used lives entirely in `AGENTS.md`, so a Cursor or Codex run should reach the same places. But no real non-Claude host has been tried.

Some skill names are still in the designer docs:

- the recipe docs, for example "use `change-the-words`", which agents also follow as steps
- the "- Skill:" lines in `checks-and-errors.md`
- a note in `docs/designers/README.md` for maintainers

None of these asks the designer to type a skill name, so I left them.

## 3. New services follow the real index, client and stub pattern, in the right place

**Before:** not met.

- Fake services lived in `src/server/prototype-services/`, with their own registry and their own API names.
- Pages imported them through a path seven `../` levels deep, which the real frontend never uses.
- The weekly sync would throw an error if the real service later added a folder under a path the prototype owned (an `ours` glob).

**What changed:**

- **Every prototype-owned service now sits at `src/server/app/services/<name>/`**, in the same shape as the real `countries` and `ports` services:
  - `index.js` picks with `const impl = () => (isStubDataMode() ? stub : client)` and exports `NEEDS_A_REAL_SERVICE` and a `CONTRACT`
  - `client.js` is the proposed real HTTP client, with tracing headers and an env URL
  - `stub.js` holds the starter rows
  - a test file covers both
- `index.js` and `client.js` import nothing that belongs only to the prototype, so a developer can copy them across unchanged. Only `stub.js` imports the stub plumbing in `src/server/prototype-support/`.
- There are four services today: `transporters`, `templates`, `ins-address-book` (a copy of the INS address-book API) and `notification-search` (dashboard filters, tabs and counts).
- Each service has **its own line** in `overrides.json`, for example `src/server/app/services/transporters/**`. The real service folders stay owned by the real service.
- `src/server/prototype-services/` has been deleted.
- **`npm run designer:service -- new <name> --owner <plants-backend|new-api|ins> --describe "…"`** writes the four files from templates and adds the `ours` line. It refuses any name the real service already uses, such as `countries`, and names that were removed on purpose, such as `commercial-transporters`. `designer:service list` and `designer:service retire` are there too.
- `AGENTS.md` rule 10, `.claude/rules/ownership.md` and `designer-sets.md` allow prototype-owned service folders to be edited on `design/*` branches, only through `fake-a-service`. Every other folder under `src/server/app/services/` is still forbidden.
- The `fake-a-service` skill and its references are rewritten around `designer:service new`. `docs/designers/services-and-dashboards.md` matches.
- **The weekly sync is hardened.** When the real service adds a folder the prototype already owns (`src/server/app/services/<name>/`), the sync:
  - never overwrites the prototype's copy
  - records `service-arrived` and labels the PR `needs-person`
  - tells the maintainer to retire the prototype's version

**Evidence:**

- In T1, a designer asked in plain words for "saved vehicles". The agent ran `designer:service new saved-vehicles`, which made `index.js`, `client.js`, `stub.js` and a test with `isStubDataMode`, plus exactly one new `ours` line. No real service folder was touched. 9 service tests passed and the full check passed (3,390 tests).
- T1 found one major problem. A `CONTRACT` that used values imported from `client.js` failed, and `designer:check` blamed the real journey. That is now fixed:
  - `designer:check` has a new signature for this failure
  - `fake-a-service.md` and the `index.js` template explain the rule
  - `checks-and-errors.md` has a new section
- `cli.test.js` covers the refusal of `countries`. `sync.test.js` covers two cases under a service glob: added only in the real service, and added on both sides.

## 4. Make a ticket or story from the prototype

**Before:** partly met.

- The hand-off wrote a brief in Jira markup, a patch and screenshots.
- But it was not a story. It had:
  - no As / I want / So that
  - no Given / When / Then
  - no Tech Notes
  - no link to the prototype
  - no flow or validation tables
  - no API contract for a new service
- Pages that used a fake service were left out of the patch.
- An idea with no patch (a pure concept) could not be handed off at all.

**What changed (`scripts/designer/handoff/`, `.claude/skills/hand-off/`):**

- `brief.jira.txt` now starts with a **story in the EUDPA shape**:
  - a Summary
  - As / I want / So that, in the designer's own words or left as placeholders, never made up
  - acceptance criteria as Given / When / Then. For changes of words only, they are generated. Otherwise the agent drafts them and the designer confirms them, and `--criteria-draft` marks them as not confirmed yet.
  - a Tech Notes panel: whether the patch applies, drift, services, tests, recipe, and the branch name `feat/EUDPA-XXXX-<slug>`
- New sections follow:
  - **See the prototype**: links, example deep links, and how to run it locally, with a warning when the branch has not been pushed
  - **Journey flow**: before and after, and "does not change" when nothing moved
  - **Validation**: new and changed rules first, with English and Welsh errors
  - **Service to build**: the service's `CONTRACT` (operations, fields, examples, open questions)
  - **Tests to add**
  - **For the developer or agent**: points to the plants-frontend recipe docs, the workspace `frontend-change` and `ticket` skills, and `openspec/specs/plants`
- For a prototype-owned service, `index.js` and `client.js` now go into `upstream.patch`, marked "proposed", together with the pages that use them.
- `--brief-only` hands off a pure concept, or a release made from sample-journey.
- The hand-off skill triggers on "ticket", "story", "Jira" and "backlog". It asks for who, what and why in the designer's words, and checks the story before it finishes.

**Evidence:**

- In T2, "write it up as a story the developers can pick up" produced a `brief.jira.txt` with all of the sections above.
- `git apply --check` of its `upstream.patch` on a clean plants-frontend `main` passed for all 11 files.
- `handoff.e2e.test.js` proves that a release using `transporters` produces a patch with the service and its pages, and that it applies.
- T2's problems (draft criteria labelled as the designer's, noisy validation and flow sections, a link to an unpushed branch) are fixed in `667d723`.

**Partial:**

- Nothing creates the Jira ticket itself. The designer (or you) pastes `brief.jira.txt` into a new EUDPA story. The hand-off note says so, word for word. This is on purpose: designers may have no Jira credentials, and the workspace's `ticket-creator` could file it if you want that step automated.
- In T2, As / I want / So that stayed as placeholders because the trial gave none. That is correct behaviour, but it means no trial has produced a story with no placeholders at all.
- A planned `ticket-refiner` dry read of a pasted brief was not run.

## Left for you

1. ~~Commit the review fix.~~ Done: `801f61a`.
2. **Apply the hooks.** Apply `scripts/designer/hooks/settings-proposal.json` to `.claude/settings.json` on a `maintain/*` branch. Until you do, designers see a "missing hook script" message on start, which is harmless, and there is no automatic edit guard. Agents are not allowed to edit settings. The guard already treats prototype-owned service folders as the designer's own.
3. **Delete the four trial branches** when you have read the trial write-ups (`feat/NO_JIRA-designer-prototyping-refine-trial-T1…T4`). They are local only.
4. **Optional follow-up, from T4.** `designer:examples init` starts a new release with 4 generic examples, not the real journey's 9 richer ones. This needs a decision on which examples a demo release should start with. Some of the 9 carry other-organisation or cancelled-amendment state.
5. **Optional.** Try one request in Cursor or Codex to confirm that routing from `AGENTS.md` alone works on a real non-Claude host.
6. **Seen in the real service, not changed:**
   - the dashboard's "Arrival (newest to oldest)" sort looks wrong (T3)
   - "Check and submit" shows "Optional" even when every task is complete (T4)

   Both are candidates for a plants-frontend ticket.
