# Signed-off pages: how to stop blind changes without blocking sensible ones

Investigation of options for the two frontends (animals and plants).

Not committed. Nothing has been built.

## Summary

**The recommendation is a layered blend, not one of the five options as written.**

1. A cheap check, with no AI involved, sorts every changed file into a lane. Upgrades and test work pass on file kind alone.
2. A change to a signed-off page passes when a person has already allowed it. That means a ruling recorded on the backlog row before the build, or on the pull request.
3. Anything else that reaches a signed-off page turns a pull request check red and asks the named owner "why is it touching this page?". The check is not required, so it never hard-blocks.
4. The ruling is recorded in the pull request and copied into the merge commit. `git log` on the page's folder then shows who agreed each change.
5. Later, a behaviour snapshot of each signed-off page (its copy and what each action does) catches changes made through shared code.

**Nothing is signed off today.** No page in either frontend is at Agreed or Ready for live. So the guard can be built and proved now, but it protects nothing until the first page is promoted.

**What is lost, even with the blend:**
- Changes to shared platform code (the shared kit, the layout, the engine) are reported but not stopped, until the behaviour snapshots land.
- Backend changes are not seen at all until a later increment.
- A navigation change made from another page (such as the hub dropping its "Review and submit" button) is missed unless that other page is signed off too.

## What exists today

### The levels

The banner's four levels are the same in both frontends:

| Level | Who promotes to it | Counts as signed off? |
|---|---|---|
| Exploring | Starting level | No |
| Detailing | Not set out in the ideation paper | No |
| Agreed | Business analyst and product owner, with design and content. The banner says "Users and the business have agreed this page. Changes need a reason." | **Yes** |
| Ready for live | Tech lead and architect, with the product owner | **Yes, and stricter** |

**Call made: both Agreed and Ready for live count as signed off.**
- Agreed is the point where subject matter experts, design and user research have said the page meets requirements. That is exactly the line in the brief.
- Ready for live adds one step: an allowance on the backlog row is not enough on its own. The pull request also needs a ruling, from the tech lead or architect with the product owner.

### Where pages sit now

| Frontend | Level |
|---|---|
| Animals | The start page is Exploring. The whole notification journey is Detailing. |
| Plants | Every page is Exploring. |
| INS | Every page is Exploring. |
| Plants prototype | Has no maturity module. It has not synced the banner from the real plants frontend. |

Sam set these levels once, on 13 October, in the page maturity banner work.

The only Agreed and Ready for live values ever written were example data in that work's proof of concept. It put the animals declaration at Agreed and the confirmation at Ready for live.

This investigation uses those two pages as stand-in signed-off pages. Plants origin, arrival details and declaration are a lighter second set.

### What the level does today

Only the banner reads it.

- The level is looked up by route pattern, in `src/server/app/page-maturity/page-levels.js`. Files and feature folders play no part.
- The rule "change a level through a reviewed pull request" is a code comment only.
- No skill, `tim` command, build-loop stage, backlog field, CODEOWNERS file or CI check reads the level.
- Neither frontend requires reviews or status checks. Authors merge their own pull requests.
- The build loop is the only route that merges by itself.

### What can be reused

| Already there | Use |
|---|---|
| `page-levels.test.js` checks every level key against the live route table | Extend it to check a sign-off record both ways |
| Each feature's `page.js` holds `{id, slug}`, which gives its route | Route → feature folder can be computed, not hand-kept |
| dependency-cruiser is already installed for the architecture lint | Find which files a signed-off page imports |
| Plants `journey-spec.json` lists every page's slug | A cross-check for the plants map |
| The build loop's approval list and its "awaiting approval" pause | Hold a pull request open for a person, with no new machinery |
| The build loop's "plan outside branched repos" stop | Precedent for a scope check at the plan stage |
| The plan's `behaviourChanges` field, empty for pure structure | A no-behaviour-change signal |
| frontend-change's "Spec sync: none" | The same signal on that route |
| The upgrade skills' own state files | Recognise an upgrade |

### The history used to test each option

23 real changes from 11 September to 6 November, plus 5 made-up cases. Three groups:

| Group | What should happen | Examples |
|---|---|---|
| (a) Should flow | Nothing | npm and govuk-frontend upgrades, Node patch, test tidies, the multi-set refactor's test edits, a plants logging addition |
| (b) Targeted at the page | Allowed, with a reason | The design release 1 parity fixes to the declaration and confirmation, "declare only what the review showed", the ITAHC rule fix |
| (c) Should come back to a person | Ask "why is it touching this page?" | The design snagging theme pull request, the code-quality sweep, the commodity search change to the declaration's submit gate and its follow-up, the documents change, "one validation per page", the hub button, the shared kit save-choice rewrites, the plants save-and-return sweep, the plants reference lists, the address literals change |

**The key finding:** a guard that only looks at the page's own folder misses the most important case.

The commodity search work changed when the declaration refuses to submit. It did that through the check-your-answers refusal file, without touching the declaration's folder.

## The options compared

Scores are out of 5. For build cost and upkeep, 5 means cheapest.

| Option | Catches drift | Lets sensible work through | Human owns the decision | Shared code and backends | Build cost | Upkeep | False alarms | Misses |
|---|---|---|---|---|---|---|---|---|
| 1. Signed-off pages PR check | 4 | 3 | 2 | 2 | 2 | 3 | 2 | 4 |
| 2. Impact map plus AI intent judge | 4 | 4 | 3 | 3 | 2 | 2 | 3 | 3 |
| 3. Sign-off-aware pipeline (agents only) | 2 | 3 | 4 | 2 | 1 | 2 | 1 | 6 |
| 4. Behaviour contracts | 3 | 3 | 3 | 4 | 2 | 2 | 2 | 5 |
| 5. CODEOWNERS plus a label (minimal) | 3 | 4 | 2 | 1 | 4 | 3 | 1 | 5 |
| **Recommended blend** (estimate) | 4 | 4 | 4 | 2 now, 3 later | 2 | 3 | 1 | 4 now, 3 later |

False alarms and misses are counted over the 23 real changes and the 5 made-up cases.

The blend's figures are an estimate made by applying its rules to the same cases. It has not been run.

## Each option in brief

### 1. Signed-off pages PR check

A check in each frontend's CI sorts the diff into lanes and goes red when a signed-off page is touched without a declared, ticketed intent. A ruling comment from a named approver turns it green.

**Strengths**
- The lanes (dependency, test, page-owned, near reach, platform, other) let upgrades and test work through on file kind.
- Route → folder is computed from `page.js` slugs, so nothing is hand-kept.
- Near reach, through the import graph, catches the commodity and documents changes to the declaration's submit gate.
- A structured ruling, tied to the commit it was given on, copied into a commit trailer.
- The build loop treats the red check as a healthy pause, not a failure to fix.

**Fatal flaws**
- **The allow path is hollow.** "Ticket key plus a `Pages:` line" passes anything. The build loop creates a Jira ticket for every row automatically, and an agent writes the row's pages. So the loop's own changes to a signed-off page pass with no person involved, including the ITAHC rule change.
- **Near reach is far too wide.** The declaration's full import graph reaches most of the journey through check-your-answers. The multi-set refactor and the plants logging change both go red.

### 2. Impact map plus an AI intent judge

A `tim` command maps what a diff reaches. When a signed-off page is reached, an AI judge compares the effect with the row's or ticket's stated intent and returns allow, explain or needs-human.

**Strengths**
- The plumbing has no AI. Only the judgement call does.
- The judge has to quote the line that licenses the change, word for word, or say nothing names the page. That makes a person's ruling fast and auditable.
- A replay of the history as a test set, aiming for no false allows.
- Reuses the loop's approval list and plan-stage stop.

**Fatal flaws**
- **Its rules contradict each other.** "No visible effect, so allow" runs first. So the code-quality sweep, which rewrote the declaration's controller and deleted a business-rationale comment, passes with no person.
- **"Add this field to this page" always comes back.** Any rule or data change goes to a person even when the ticket names the page. That is the exact case the brief says to allow.
- **The hub button change is missed.** The hub is not in the declaration's import graph.
- **Approval cannot work as written.** Build-loop pull requests are raised from Sam's GitHub account, and GitHub forbids approving your own pull request.
- **On human pull requests it does nearly nothing.** CI has no AI key, so the status stays neutral until someone runs the review skill.

### 3. Sign-off-aware pipeline (agent routes only)

Every agent route asks one `tim` command which signed-off pages a plan or diff reaches. Rulings live in `backlog.json` on each row.

**Strengths**
- The best record of a person's decision: a `pages` list on each row, each with `{decision, by, at, why}`, set with one keystroke in the pre-flight walker.
- Judges each row in a theme on its own, so a 20-row theme pull request gets precise answers, not one blanket alarm.
- Briefing the planner with the signed-off list prevents most drift before any check fires.

**Fatal flaws**
- **It guards the wrong door.** 6 of the 11 group (c) changes were built by hand, not by the loop. That includes the commodity search change its own design was meant to catch.
- **A hold ends the loop run.** In today's code, "awaiting approval" stops the run, so every tidy-up on a signed-off page would stall the loop.
- **Editing a test is treated as a sign of a behaviour change.** That falsely parks a test tidy.

### 4. Behaviour contracts

Each signed-off page gets a frozen record of what it shows and does: accessibility-tree snapshots, the result of each action, a copy snapshot. Any change to those, whatever caused it, goes red until a person rules.

**Strengths**
- The only option that sees shared-code and backend effects, whichever file caused them.
- A logging or refactor change stays green, which no file-based guard can manage.
- The copy snapshot (English and Welsh) is cheap and reads plainly in the diff.
- Pinning each action's result (redirect, status, record written) catches changes to what submit does.
- Rides the existing FIT shards and the tests repo's visual specs, so it needs little new CI.

**Fatal flaws**
- **It lets broad sweeps through by design.** The code-quality sweep changed nothing visible, so it needs no person. That breaks "broad-brush work touching the page comes back to a person".
- **It only sees the situations it tests.** The commodity search refusal, the hub button and the save-choice rewrite would all have stayed green.
- **Merging red turns everyone else's pull requests red,** which is a hard block in practice.
- **An agent could weaken the test states** or approve its own row. Nothing guards those files.

### 5. CODEOWNERS plus a label (minimal)

Signing off a page adds its feature folder to CODEOWNERS, with test files left unowned. A neutral check and the loop's existing pause send any change to that folder to a named person.

**Strengths**
- Cheapest to build.
- Upgrades and test work never trigger it, because those files are unowned.
- A short, hand-picked `alsoOwns` list per page (for the declaration, the check-your-answers refusal file) catches most indirect drift with little noise.
- Promoting a page is one reviewed pull request, kept in step by a test.

**Fatal flaws**
- **The loop does not check who approved.** It reads only "approved". With code owner review not required, any developer's routine approval clears the pause.
- **The label route does nothing in the loop.** The loop never reads labels.
- **The check cannot work as described.** A plain Actions job cannot end "neutral", and adding the needed triggers to the main pull request workflow would cancel and re-run the full test suite on every label click.
- Shared code and backends are uncovered.

## Recommendation: a layered blend

Take the skeleton from option 1, the row rulings from option 3, the short owned list from option 5, and the behaviour snapshots from option 4 as a later backstop.

### Layer 1: sort the files (no AI)

One script in each frontend, `scripts/signed-off/check.js`, with a `tim page reach` wrapper so agents get one JSON shape.

Every changed file goes into exactly one lane:

| Lane | Files | Effect on a signed-off page |
|---|---|---|
| Dependency | `package.json` (versions only), lock file, `.nvmrc`, Dockerfile, audit config, Dependabot config | None |
| Test | `*.test.js`, `*.fit.spec.js`, `test-support.js`, fit helpers, snapshots, docs | None. The summary notes removed assertion lines, for information only. |
| Page-owned | Any other file in the page's feature folder, plus its `alsoOwns` files | Touched |
| Near reach | A non-test file in the set (journey and obligations, not the shared platform) that the page's own files import **directly** | Touched |
| Route reach | A changed hunk that links to, gates or redirects to the page's route or slug | Touched |
| Platform | Shared kit, layout, engine, model, bridge, services, styles | Reported only: "may affect signed-off pages" |
| Other | Anything else | Ignored |

**Calls made in this layer:**
- **Direct imports only for near reach,** not the full import graph. The full graph from the declaration is 165 modules and reaches most of the journey. Direct imports still catch the check-your-answers refusal file.
- **`alsoOwns` is seeded from the page's actual imports at sign-off,** not from memory, and capped at a handful of files. It is how a page owner pulls in a shared file the page relies on heavily.
- **Route reach is new.** It is a text search of changed hunks for the page's route or slug. It is the cheap answer to navigation changes made from another page. It catches flow and task-row edits that name the page. It still misses the hub button case, because that change named check-your-answers, not the declaration.
- **The rules live in each frontend,** copied into both, as `page-maturity/` already is. Frontend CI then has no dependency on the workspace repo.

### Layer 2: was it already allowed?

A touch on a signed-off page passes with no new ruling when **all** of these hold:
- the backlog row (or, for a hand-raised pull request, the pull request) names the page in a `pages` list;
- that entry carries a **person's** ruling, recorded before the build;
- the diff touches no other signed-off page.

**A ticket key on its own never counts.** The loop makes tickets automatically, so a ticket proves nothing about a person.

**A `Behaviour: none` claim on its own never counts.** It only changes the wording of the question asked, so a pure tidy-up reads "claimed no behaviour change; please confirm".

**An AI judge is advisory, in a later increment.** In the build loop it drafts the "why is it touching this page?" sentence and quotes the line that licenses the change, if any. It never allows or blocks.

### Layer 3: the person's decision

Anything that reaches a signed-off page and was not already allowed:
- turns the **Signed-off pages** check red, with one comment in plain English naming the page, the files, the lane and why;
- asks for a ruling from the page's named approvers;
- in the build loop, pauses as a healthy "awaiting signed-off ruling" with every pull request left open. The CI fixer is told never to "fix" this check.

The check is **not required**. A person can still merge past red. That merge is itself a visible human act, and it shows up later in an audit listing.

### Layer 4 (later): behaviour snapshots

For each signed-off page only:
- a copy snapshot of its English and Welsh copy;
- a snapshot of what each main action does (status, redirect, the record written to the stub store).

These run in the existing FIT shards. They catch changes made through shared code and the shared kit, whichever file caused them.

A change to a snapshot counts as page-owned in Layer 1, so it goes through the same ruling. No second approval route is needed.

## How the sorting plays out on the history

| Change | Should | Blend gives | Why |
|---|---|---|---|
| npm security sweep with govuk-frontend bump | Flow | Flow | Dependency and platform lanes only |
| Node patch and Playwright bump | Flow | Flow | Dependency lane |
| Declaration appearance checks moved to screenshots | Flow | Flow | Test lane, fit helpers and docs included |
| Plants and animals test tidy | Flow | Flow | Test lane on the page. The other controller it edits is not a direct import. |
| Multi-set refactor | Flow | Flow | Its config file is two imports away, so platform only |
| Plants coverage tests | Flow | Flow | Test lane |
| Plants logging added to declaration refusals | Flow | **Asks** | Page-owned controller changed. Accepted false alarm: one click. |
| Parity fixes to declaration and confirmation copy | Allowed | Allowed | Row names the page, ruling recorded at pre-flight |
| "Declare only what the review showed" (hand-built) | Allowed | Asks once | No row. A pull request ruling is what "needs a reason" means. |
| ITAHC rule fix on confirmation | Allowed | Allowed, plus pull request ruling | Ready for live steps up |
| Design snagging theme pull request | Asks | Asks | Confirmation copy and template, rows that never named them |
| Code-quality sweep | Asks | Asks | Page-owned controller and comment deletion |
| Commodity search change to the submit gate | Asks | Asks | Near reach through the refusal file |
| Its follow-up | Asks | Asks | Same file |
| Accompanying documents | Asks | Asks | Same file |
| One validation per page | Asks | Asks | Page-owned controller |
| Hub drops "Review and submit" | Asks | **Missed** | Names check-your-answers, not the declaration |
| Shared kit save-choice rewrites | Asks | **Missed** | Platform lane. The declaration has no save-and-return path, so Layer 4 does not see it either. |
| Plants save-and-return sweep | Asks | Asks | Page-owned controllers |
| Plants reference lists change to origin | Asks | Asks | Page-owned controller |
| Address literals change to submit | Asks | Asks | Page-owned controller. Layer 4 would also catch it. |
| A govuk-frontend upgrade changes markup | Flow | Flow | Dependency lane. Template edits under an upgrade line are reported only. |
| A test-only pull request | Flow | Flow | Test lane |
| "Add field X to page P" | Allowed | Allowed | Row names P with a ruling. A second signed-off page in its reach asks separately. |
| Another page's work edits shared layout | Asks | **Missed** | Platform lane, reported only |
| A backend change alters the page | Asks | **Missed** | Out of scope until the last increment |

## Shared code and backends

| Reach | Now (first increments) | Later |
|---|---|---|
| The page's own folder | Asks | Same |
| Files the page imports directly in its journey | Asks | Same |
| Flow and task-row edits that name the page | Asks | Same |
| `alsoOwns` shared files | Asks | Same |
| Shared kit, layout, engine, services | Reported only | Behaviour snapshots catch a change in what the page shows or does |
| Navigation from another page | Missed unless it names the page | Same. Signing off check-your-answers would cover the hub case. |
| Backends and reference data | Not seen | A mirror spec per signed-off page in the tests repo, run on backend pull requests (the animals backend already runs the animals tests) |
| Behaviour spec changes in `openspec/` | Not seen | A `tim spec maturity` lint: a change to a signed-off page's spec needs a ruling |

## The record of the person's decision

### Where sign-off itself lives

`page-levels.js` keeps the level, so the banner is unchanged. An Agreed or Ready for live entry also gets a sign-off record beside it:

```js
{ route, level, owner, approvers: ['github-login'], since, evidence, alsoOwns: [] }
```

`page-levels.test.js` checks it both ways: every signed-off route has a record, and every record has a signed-off route.

**Call made:** keep it in `page-levels.js` now, not in a new `openspec/maturity.json`. The banner already reads that file. The `openspec` record can follow when the spec lint is built.

### How a ruling is given

| Route | How | Where it is kept |
|---|---|---|
| Build loop, before the build | One keystroke per row in the pre-flight walker: allow, refuse, or split the page change off | The row's `pages[].ruling` (`decision`, `by`, `at`, `why`) in `backlog.json`, plus the ops log |
| Any pull request | A comment with a fixed block: `Signed-off page change`, `Page:`, `Ruling: accept / accept-and-update-spec / reject`, `Reason:` | The comment, and the check run's summary for that commit |
| After merge | Rulings copied into the squash commit as `Signed-off-page-change:` trailers | `git log --grep Signed-off-page-change -- <feature folder>` |

**A ruling lasts** until the page's owned or near-reach files change again. Later commits that only touch tests or other pages keep it.

**`reject`** keeps the check red, so the loop never merges.

**`accept-and-update-spec`** passes, and asks for the page's behaviour spec to be updated in the same pull request.

### Identity

Sam and his agents share one GitHub account, so the check cannot tell them apart.

- A comment ruling, not a GitHub approval, because GitHub forbids approving your own pull request.
- A new rule in the workspace Bash guard refuses any agent `gh` comment, review or API call that carries the ruling block. It also refuses body files.
- Briefs forbid agents editing a pull request's `Pages:` and `Upgrade:` lines after it is raised.
- This is owned in practice, not proven. Codex and Sam's own scripts outside Claude are not covered.

**Call made:** product owners and business analysts may not have DEFRA GitHub accounts. Until they do, Sam (or the tech lead) gives the ruling on their behalf, and the `Reason:` line names who agreed it and where.

## Increments to build it

10 increments. Canary on the animals frontend first, then plants and INS. Nothing changes for users, because no page is signed off.

| # | Increment | Repos | Risk |
|---|---|---|---|
| 1 | Sign-off record in `page-levels.js` and the both-ways test. Empty today. | Animals frontend | Low |
| 2 | The lane script with tests, using the history as fixtures and the declaration and confirmation as stand-in signed-off pages. Groups (a), (b) and (c) must come out as in the table above. | Animals frontend | Medium: the import map and slug match are the hard part |
| 3 | Its own workflow file (not the main pull request workflow, so a comment never re-runs the full suite). Posts a **Signed-off pages** check through the Checks API, one sticky comment, a label, and reads ruling comments. A pull request template with the `Pages:`, `Behaviour:` and `Upgrade:` lines. | Animals frontend | Medium: the comment-triggered run must not run pull request code with a write token |
| 4 | Workspace guard rule refusing agent-posted rulings, with tests | Workspace | Low |
| 5 | Dry run on a throwaway branch with a temporary record for the declaration. Test pull requests that edit its copy, the refusal file, the shared kit and only a fit spec. Check each verdict and that a ruling turns the check green. | Animals frontend | Low |
| 6 | `tim page reach` wrapper with `--help` and tests | Workspace | Low |
| 7 | Backlog: optional `pages` with `ruling` on rows, `tim backlog check` warning, and the pre-flight walker keystroke | Workspace | Medium |
| 8 | Build loop: signed-off list in the planner and plan-reviewer briefs, tighter "bounded tidy-up" rule, pull request body block, CI fixer exemption, "awaiting signed-off ruling" pause with resume, and commit trailers. Then frontend-change, journey-builder, the prototype hand-off, the upgrade skills (`Upgrade:` line) and a review finding. | Workspace | Medium: the loop is large |
| 9 | Copy to plants and INS on the same branch name, with the plants page-list cross-check. Check every target. | Plants and INS frontends | Low |
| 10 | Behaviour snapshots (copy, action results) for signed-off pages, and the advisory AI "why" sentence in the loop | Animals, then plants | Medium |

**Deferred, kept out of the count:**
- the tests-repo mirror for backend changes;
- the `openspec` maturity record and `tim spec maturity` lint;
- letting the loop park a row and carry on instead of ending the run at a pause;
- a required status check or required review in a ruleset.

## What is lost or left uncovered

- **Shared platform changes are reported, not stopped,** until increment 10. Even then, only effects a snapshot exercises are seen. The shared kit save-choice rewrite would still pass for the declaration.
- **Backend and reference-data changes** are not seen until the deferred tests-repo mirror.
- **Navigation from another page** is missed unless it names the signed-off page.
- **A logging or tidy-up change in a signed-off controller** asks for a ruling. That is deliberate, but it is a click each time.
- **It is not a hard block.** A person can merge past red. The audit listing shows it afterwards; nothing stops it.
- **Identity is not proven.** Rulings rest on the Claude hook and briefs. Codex and work outside Claude are not covered.
- **The script lives in each frontend,** so changes are made twice, as the banner already is.
- **The plants prototype** is not covered until it syncs the maturity module from the real plants frontend.
- **It protects nothing until a page is promoted.** Its value depends on promotion through a reviewed pull request actually happening.

## Calls I made

- Both Agreed and Ready for live count as signed off. Ready for live needs a pull request ruling even when the row allows the change.
- Recommended a blend rather than one option, because each option failed on at least one of: the hollow ticket allow, too-wide reach, agent-only coverage, or letting broad sweeps through.
- A Jira ticket key alone never allows a change, because the build loop creates tickets automatically.
- Near reach uses direct imports only, plus a short `alsoOwns` list, not the full import graph.
- The check is red but not required. No ruleset change.
- Rulings are a structured comment, not a GitHub approval, because Sam cannot approve his own pull requests.
- No CODEOWNERS file for now. Owners may lack GitHub accounts, and the comment names them anyway.
- The sign-off record stays in `page-levels.js` for now.
- The AI intent judge is advisory only and comes late.
- Behaviour snapshots are a later backstop for shared code, not the main gate.
- The rules live in each frontend, not in `tim`, so frontend CI does not depend on the workspace repo.
