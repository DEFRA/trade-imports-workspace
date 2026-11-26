# Ticket to backlog: design plan

A design for making "one Jira ticket, into a backlog, built by the loop on one branch" a first-class mode of the `requirements-pipeline` skill.

Plan only. No skill, tim or workflow code has changed. Nothing is committed.

The draft backlog that builds this change is [`backlog.json`](backlog.json) beside this file. It passes `tim backlog check`.

## Summary

- A third way into `requirements-pipeline`, beside DISTIL and BUILD: **TICKET**.
- Sam says "build EUDPA-832" (or "backlog EUDPA-832"). That is the whole input.
- tim fetches the ticket into a new workarea and names the branch from it.
- A small workflow reads the ticket and the code it touches, and writes the backlog in the one backlog shape. A second agent tries to refute it.
- No extract, no per-claim verify, no areas, no themes. About 4 to 6 agents, not DISTIL's dozens.
- tim cuts the branch in every repo the backlog touches, plus the workspace. The session pushes and opens the draft pull requests with `gh`.
- The build loop then drains the backlog under the branch lifecycle, exactly as today.
- At the end the session writes the pull request descriptions, takes them out of draft, watches CI and stops for Sam's go to merge.
- Too big, not ready, or more than one real source: it stops and hands over to full DISTIL on the same workarea, losing nothing.
- This deliberately carves an exception to "there is no lighter path" (see [section 7](#7-the-rule-this-changes)).
- **Every stage that creates rows combines them before handing on** (Sam, 25 November). DISTIL gains a combine review; ticket intake defaults to one row. Each row carries a fixed cost, so a row stands alone only with a written reason (see [section 2a](#2a-combine-rows-that-suit-combining)).

## Settled

- **Ticket mode raises its pull requests and stops at green** (Sam, 25 November). It posts the links and evidence and waits for his go. Rule 3 stands as written, with no new exemption.

## How it feels to Sam

| Step | Who | What Sam sees |
|---|---|---|
| 1. "build EUDPA-832" | Sam | Nothing else to give |
| 2. Fetch the ticket, name the workarea and branch | tim | One line: workarea `shared/eudpa-832-address-search-by-country`, branch `fix/EUDPA-832-address-search-by-country` |
| 3. Read the ticket and the code, write the rows, refute them | Intake workflow | A short intake summary: rows, repos, any calls made |
| 4. Questions | Session | Only if something truly needs Sam: one batch, plain words, each with a default |
| 5. Cut the branch, push, open draft pull requests | tim, then the session with `gh` | The draft pull request links |
| 6. Build every row | Build loop, branch lifecycle | Progress as N of TOTAL (P%) per landed row |
| 7. Pull request text, out of draft, watch CI | Session | Links and evidence when green |
| 8. Merge | Sam's go (see [Settled](#settled)) | Merged links, ticket moved to Deskcheck |

Steps 2 to 7 run without stopping unless step 4 has a question that blocks.

## 1. Entry

**Trigger phrases** (added to the skill description and the CLAUDE.md routing table):

- "build EUDPA-X", "implement EUDPA-X"
- "backlog EUDPA-X", "get EUDPA-X into a backlog", "turn EUDPA-X into a backlog"
- "build EUDPA-X on a branch", "work EUDPA-X through the loop"

**One command starts the deterministic part:**

```bash
tim backlog from-ticket EUDPA-832 --json
```

It:

- reads the ticket with the Jira client tim already has
- renders the description, comments and the Confluence pages the description links to, reusing the renderer `tim refine prepare` uses (`tim/src/commands/refine/ticket-markdown.js`)
- adds the parent's summary and description, each linked ticket's summary, status and link type, and the subtasks
- downloads image and PDF attachments to `sources/attachments/`
- writes `sources/ticket-eudpa-832.md` and `sources/ticket-eudpa-832.json` (raw, with Jira's `updated` time)
- writes `sources.json` with one `jira` source, ready for the intake to add repo sources
- names the workarea `shared/eudpa-<n>-<slug>` and the branch `<prefix>/EUDPA-<n>-<slug>`: prefix `fix` for a Bug, `feat` for a Story, `chore` for a Task; slug from the summary, at most 5 words
- reports readiness blockers it can see without judgement: an open "is blocked by" link, no acceptance criteria heading, status Done or Closed
- with `--check`, says whether the ticket has changed in Jira since the workarea was written, and writes nothing

It refuses a workarea whose backlog already has a built row, unless `--check`.

Everything after this command is the skill's own steps, in [`references/TICKET.md`](#8-what-changes-file-by-file).

## 2. Ticket to backlog

### Light DISTIL or a new intake step

| | Light DISTIL (a switch on `distil.js`) | New intake step (chosen) |
|---|---|---|
| Agents | Still characterise, extract, verify, area plan, reconcile, challenge, draft, combine, report: 12 or more | Read, refute, at most one fix: 4 to 6 |
| What it reads | Every source claim by claim | The ticket in full, the code the ticket touches, by targeted read |
| Fits a single source | Badly: reconcile and challenge exist to weigh sources against each other | Yes |
| Changes DISTIL | Adds a switch DISTIL says must not exist | Leaves DISTIL exactly as it is |
| Evidence | EUDPA-774: a ticket plus brief, 3 rulings, 10 sources, 32 rows drafted, 20 merged away, 12 built | EUDPA-718: an investigation and one hand-written row, built and merged first time |

The intake keeps DISTIL's shape rules, its provenance and its "verify by trying to refute". It drops the depth machinery a single source does not need.

### The intake workflow

`workflow/ticket-intake.js`, launched from the main session by `scriptPath`, like the other two.

| Stage | Who | Model | Output |
|---|---|---|---|
| Check | tim | none | `tim distil status` on `sources.json` |
| Read | 1 agent | Opus | `investigation.md` (what exists, where, the delta, file:line), `intake.json`, `backlog.json` |
| Shape | tim | none | `tim backlog check` (now also checks `intake.json`, below) |
| Refute | 1 different agent | Opus | A verdict per row and per ticket statement: holds, wrong, or missed. Challenges every question |
| Fix | the Read agent, once | Opus | Rows and questions rewritten from the refute verdicts |
| Shape again | tim | none | `tim backlog check`. Twice wrong stops the run |

It returns the rows, the readiness verdict, the questions with defaults, any escalation reason and the calls the read agent made.

The briefs live at `workflow/intake/briefs/read.md` and `refute.md`.

### What the read agent does

1. Reads the ticket file in full, attachments included.
2. Gives the ticket a readiness verdict with the ticket-refiner's three verdicts and their criteria (READY, NEEDS WORK, SPIKE REQUIRED), from `.claude/skills/ticket-refiner/SKILL.md` "Verdict Guidelines" and `docs/best-practices/jira/ticket-conventions.md`. An existing `workareas/ticket-refinement/EUDPA-X/.refinement-meta.json` verdict is read as input.
3. Numbers every ticket statement in `intake.json`: each acceptance criterion (keeping the ticket's own AC1, AC2 where it has them), each scope or out-of-scope line, each background fact.
4. Reads the code: the repos' docs, rulings ledgers (`spec/decisions.json`) and `openspec/` for the area, then the code itself. Writes `investigation.md` in the shape of EUDPA-718's.
5. Works out the repos the same way DISTIL intake does (CLAUDE.md repo map, `docs/repos/`), the tests repo always included.
6. Writes the rows to [`SHAPE.md`](../../../.claude/skills/requirements-pipeline/references/SHAPE.md): requirement not recipe, full-stack slice, criteria in the user's words.
7. Marks each statement in `intake.json` as covered by row ids, or not built, with the reason.

### Provenance

- Every criterion ends with its bracket: `(jira:EUDPA-832 AC1)`, or `(jira:EUDPA-832 AC2; repo:addressbook SearchTerms.java)`.
- Every row's `sources` names `jira:EUDPA-832` and the repo refs the read agent used.
- `requirements` is `[]`. There is no `requirements.json`. The ticket statements in `intake.json` take its place.
- The envelope's `generatedFrom` is `["jira:EUDPA-832", …]`, as EUDPA-718's already is.

### One row or several

| Situation | Rows |
|---|---|
| Default | One row per ticket |
| Acceptance criteria fall into groups that change different code and share no set-up | One row per group, each with its reason in `notes` |
| One row would need more than one plan can hold (more than 3 service repos, or more than about 15 criteria) | Split at the seam the code shows |
| A precondition with its own observable outcome (a data fix the feature reads) | Its own row, and the feature row depends on it |
| More than 4 rows after the combine review | Escalate: it is a programme, not a ticket |

Every row stays a full-stack slice. A "backend half" row is still wrong.

The read agent runs the combine review in [section 2a](#2a-combine-rows-that-suit-combining) before the refute. The refute agent challenges every split, not just every row.

### Ticket backlogs in the one shape

Two envelope additions to `backlog.schema.json`, and nothing on the row:

- `ticket`: the Jira key the backlog builds, such as `"EUDPA-832"`. Present only on a ticket backlog.
- `branch`: today "split backlogs only". Widened to "split or ticket backlogs". BUILD then reads the branch from the envelope instead of asking.

A new `references/intake.schema.json` defines `intake.json`: ticket key and `updated` time, readiness verdict and reasons, statements (id, kind, text, `coveredBy` or `notBuilt`), repos and why, questions (text, the readings, default, `blocksLaunch`), escalation reason.

`tim backlog check` on a backlog with `ticket`:

- refuses an acceptance criterion statement that no `todo`, `blocked` or `done` row covers and that carries no `notBuilt` reason
- refuses a `coveredBy` naming a row that does not exist, or a withheld one (`dropped`, `rejected`, `merged-into`)
- refuses a row criterion whose `jira:` bracket names a statement id `intake.json` does not have
- refuses `themes`, `splitOff` and `movedOut` on a ticket backlog

That is the ticket mode's cheap twin of `tim distil coverage`.

### When it escalates to full DISTIL

| Signal | What happens |
|---|---|
| Readiness SPIKE REQUIRED | Stop. No backlog. Tell Sam why, in a line |
| NEEDS WORK, and the gaps are decisions Sam can make | They become the question batch (section 4) |
| NEEDS WORK, and the gaps need the product owner or another team | Stop. Offer to write it up with `ticket-refiner` |
| More than 3 questions | Treated as NEEDS WORK: the ticket is not ready |
| More than 4 rows | Escalate to DISTIL |
| The ticket points at another requirement source with its own criteria (a Confluence spec, a design release, another ticket's AC) that has to be weighed against it | Escalate to DISTIL |
| An open "is blocked by" link | Stop, or a `blocked` row naming the blocker when the rest can ship |
| A criterion contradicts a signed-off scenario or a rulings-ledger entry | A question that blocks the launch |

**Escalation loses nothing.** The workarea already has `sources.json` with the `jira` source and the repo sources the intake read. The session moves the intake backlog aside with `tim distil reset --stage reconcile` and launches `distil.js` on the same workarea. Row 1 (inc-008) makes `jira` a source kind DISTIL can extract.

Escalation happens only before the first row lands. After that, new work is a new ticket.

## 2a. Combine rows that suit combining

Sam's ruling, 25 November ([`sources/ruling-sam-2026-11-25.md`](sources/ruling-sam-2026-11-25.md)): wherever rows are created, look at them afterwards and combine the ones that suit combining. Backlogs have been split too finely, and every row has a cost.

**Why it matters.** Each row pays for a ticket, a branch, a plan, a plan review, three reviews, verifiers, a judge, a ladder, pull requests and CI. EUDPA-774 drafted 32 rows; 20 were merged away by hand.

**What exists today.** `consolidate.md` pass 2 already says "combine", but only while each drafter drafts its own area, and the combiner only across areas. Nothing looks at the finished set and asks "could these 7 be 3?".

### The combine review

| | |
|---|---|
| When | After rows are drafted and before they are handed on: after DISTIL's combiner, before the report; in ticket intake, before the refute. On a re-distil, over rows still `todo` only |
| Default | Combine. A row stands alone only with a reason in its `notes` |
| Reasons to stand alone | An open question the other row does not carry. A different code area (feature folder or service) with no shared set-up. Too much for one plan: more than 3 service repos or about 15 criteria |
| Not a reason | "Smaller is safer". A layer split. Different headings in the source |
| Candidates | A new read-only command, `tim backlog combine-candidates <workarea>`, lists the `todo` rows that share repos and feature folders, or wait only on each other. Deterministic, so both stages use it |
| Who judges | DISTIL: one Opus agent with the candidates and every row. Ticket intake: the read agent, then the refute agent challenges each split |
| Recording | A merged-away row keeps its id with status `merged-into` and a note naming the row it went into. No id is reused. The report or intake summary says "N rows became M" |
| Criteria target | Up to about 15 a row, up from DISTIL's "three to ten" |

The rule applies to this programme's own backlog: its 7 drafted rows are now 3.

## 3. Branch and pull requests

The branch lifecycle needs the branch to exist in every repo, with an open pull request, before it starts. It refuses to start otherwise (`no-open-pr`). Today the session hand-makes them: EUDPA-774's first commit in every repo is `chore(EUDPA-774): open the branch for …`, an empty commit so GitHub will open a pull request.

| Part | Where | Why there |
|---|---|---|
| Cut the branch in every backlog repo and the workspace, add one empty opening commit where the branch has none of its own | `tim build branch <workarea> --open` (extends the existing command) | Deterministic git work, already half there: `tim build branch` cuts branches across the envelope's repos today |
| Push each repo | Session: `git -C <repo> push -u origin <branch>` | A plain `git push` runs the workspace's pre-push Sonar gate. tim pushing would quietly skip it |
| Open each draft pull request | Session: `gh pr create --draft` per repo | Rule 8: never wrap `gh` in tim |
| Confirm one open pull request per repo | Session: `gh pr list --head <branch>` | The loop's preflight checks again anyway |

`tim build branch --open`:

- takes the branch from the envelope when none is given
- includes the workspace repo. Under the branch lifecycle the workspace is not a backlog repo key, but the loop syncs main into it and commits `openspec/` there, so it needs the branch and a pull request too (EUDPA-774 had workspace #226)
- refuses, before changing anything, a repo with uncommitted work, naming it (as today)
- is safe to run again: a branch with commits gets no second opening commit
- reports per repo whether it still needs a push and a pull request, by `git ls-remote`, without calling GitHub

The draft pull request body says what the ticket is for, links the sibling pull requests and says the build loop fills it in. That is the EUDPA-774 body, made a template in `TICKET.md`.

## 4. Questions back to Sam

- **Minimal by default.** The refute agent challenges every question the read agent raises, against the ticket and the code's rulings. Only what neither settles reaches Sam.
- **Every question has a default.**
- **One batch**, after the intake and before the branch is cut. Never one at a time.
- **Most questions do not hold the launch.** The loop builds on the default. The row's `openQuestions` says it followed the default, and the session lists it under "Calls I made".
- **These do hold the launch:** security, access control or data integrity (DISTIL's existing rule), and a contradiction with a signed-off scenario or a rulings-ledger entry.
- **Plain words, headlines not ids.** Each question names the page or behaviour, gives the two readings and the default. No `AC3`, no `inc-001`, no `t-4`.

What Sam sees:

```text
EUDPA-832 (address search by country): 1 row, 4 repos, building on the defaults below.

1. Country search: whole name only, or any part?
   The ticket says "France" finds French addresses. It does not say whether "Fran" should.
   Default: any part, as name and address search already work.
```

**An answer is a ruling.** It goes in `sources/ruling-sam-<date>.md` exactly as DISTIL section 6 says, and the intake runs again. A rerun rewrites only `todo` and `blocked` rows and keeps every id, checked with `tim distil backlog-snapshot`.

## 5. The end: merge

The branch lifecycle never merges, never edits a pull request and raises no ticket. So:

1. **The loop drains the backlog** with `stopAfter: "all"`. At theme end it runs the engineering review and the signed-off check, as today.
2. **The session writes each pull request's description** to `docs/best-practices/pull-requests.md` (what, why, checks), and takes it out of draft.
   - Not if the signed-off check made them drafts. Then it reports the hold and stops.
3. **The session watches the checks** with a background `gh pr checks --watch`, never by polling.
4. **When every check is green**, it posts the links and the evidence and stops for Sam's go (rule 3). See [Settled](#settled).
5. **On the go**, it merges in the full lifecycle's order: services before the frontends that call them, the tests repo after the services it exercises, the workspace last. Squash merges. Branches deleted only after the merge.
6. **The ticket**: see the next section.

### The ticket itself

The ticket is a person's, already written. `theme-ticket` must not overwrite it.

| Point | Today, for a theme | Ticket mode |
|---|---|---|
| Loop starts | START: status to In Dev | The same. The loop also claims it: assigns it and moves it onto the board (already built, commit a4ca71a2) |
| Loop drains | WRITE: rewrites the description, splits by domain | No rewrite, no split. One comment listing what shipped, from `openspec/`, by domain |
| Merged | MERGE: rewrite links, status to Deskcheck | Status to Deskcheck. The comment's links rewritten to `main` |

## 6. The routing boundary

| Skill | Owns | Triggers after this change |
|---|---|---|
| `requirements-pipeline` TICKET | A Jira ticket built to merge: backlog, branch, loop | "build EUDPA-X", "implement EUDPA-X", "backlog EUDPA-X", "build EUDPA-X on a branch" |
| `requirements-pipeline` DISTIL | Many sources, or a ticket that escalated | Unchanged |
| `ticket` PLAN | A plan document for a ticket, nothing built | "plan EUDPA-X", "how should I implement EUDPA-X" |
| `ticket` IMPLEMENT | Following an existing `plan.md` by hand, in this session | "follow the plan", "implement EUDPA-X by hand" |
| `ticket` REFACTOR | Tidy-ups | Unchanged |
| `ticket-refiner` | Is the ticket ready | Unchanged. Ticket mode reuses its verdict rules, not its run |
| `frontend-change` | One recipe change with no ticket, in this session; and every frontend row inside the loop | Unchanged |

The skill description's "NOT for one already-agreed change to a repo — that is frontend-change or ticket" becomes: "NOT for planning a ticket without building it (`ticket`), and NOT for a recipe change with no ticket (`frontend-change`)".

## 7. The rule this changes

SKILL.md, DISTIL.md and `workflow/README.md` say: "There is no lighter path and no switch for one." It came in with the area-based distil (commit cdcfcb15, 13 October). There is no ADR or decisions log behind it. Its reason is in the text: "a thin extract caps everything downstream: a page, field or rule nobody claimed never reaches a requirement."

**The rule stays true for DISTIL.** Ticket mode adds no switch to DISTIL.

**But ticket mode is a lighter path into the backlog, on purpose.** The wording changes to say so: DISTIL has no lighter path; a single ready ticket goes through TICKET instead, which trades depth for speed within the limits in section 2, and escalates to DISTIL when it hits them.

Why the trade is right for a ready ticket:

- The ticket is already the distilled requirement. A person wrote its criteria; extracting them claim by claim restates them.
- The loop's planner reads the live tree for every row anyway, and its plan review, reviewers, verifier and judge are unchanged.
- EUDPA-718 is the evidence: one hand-written row from a code read, built and merged first time.
- EUDPA-774 shows the cost of the deep path: 32 rows drafted for 12 built.

### What is lost against full DISTIL

| DISTIL gives | Ticket mode | What that risks |
|---|---|---|
| Every source extracted claim by claim, one agent per part | The ticket read in full by one agent; the code by targeted read | A field or rule the ticket does not name, and the read misses, never becomes a criterion. The planner may still find it |
| Each claim verified by a different agent | One refute agent over the whole backlog | A wrong row that looks plausible survives |
| Sources reconciled by precedence | One source. A second real source escalates | Nothing, provided escalation fires |
| Every question challenged by its own agent | One refute agent challenges them all | More questions reach Sam than strictly need to |
| A report | A short intake summary | Less written record of why the rows are what they are. `investigation.md` covers most of it |
| Themes and parallel machines | One branch | Nothing for a ticket-sized change |
| `tim distil coverage` | `tim backlog check` against `intake.json` | Coverage of the ticket's own statements only |

## 8. What changes, file by file

Row numbers are the combined backlog's: 1 is inc-008, 2 is inc-009, 3 is inc-010.

| File | Change | Row |
|---|---|---|
| `references/sources.schema.json` | `jira` source kind | 1 |
| `workflow/distil/briefs/extract-jira.md` (new) | How DISTIL extracts a ticket source: description, AC, comments as context, attachments one at a time | 1 |
| `tim/src/distil/` | Accept the `jira` kind; its locator is the ticket file | 1 |
| `tim/src/clients/jira-client.js` | Download an attachment's content | 1 |
| `tim/src/backlog/from-ticket.js` and `tim/src/commands/backlog/` (new command) | `tim backlog from-ticket`, with `--help`, `--check` and tests (nock at the network boundary) | 1 |
| `tim/src/backlog/` (new command) | `tim backlog combine-candidates`, read-only, with `--help` and tests | 1 |
| `workflow/distil.js`, `workflow/distil/briefs/combine-review.md` (new) | The combine review stage after the combiner | 1 |
| `references/backlog.schema.json` | Envelope `ticket`; `branch` widened | 2 |
| `references/intake.schema.json` (new) | The intake record | 2 |
| `tim/src/backlog/shape.js` | The ticket-backlog checks in section 2 | 2 |
| `workflow/ticket-intake.js` (new) | The intake workflow, with its combine step | 2 |
| `workflow/intake/briefs/read.md`, `refute.md` (new) | The two agents' method; refute challenges every split | 2 |
| `tim/src/backlog/workflow-contract.test.js` | Holds both workflows' args and relays to tim's output | 1, 2 |
| `tim/src/build/` (`tim build branch`) | `--open`, the workspace repo, the branch from the envelope | 3 |
| `references/TICKET.md` (new) | The mode end to end: entry, intake, questions, branch and pull requests, launch args, the end | 3 |
| `SKILL.md` | Phase table gains TICKET; description and triggers; "no lighter path" reworded; combine is the default; the coupling table gains the intake | 3 |
| `references/DISTIL.md`, `references/SHAPE.md`, `workflow/distil/briefs/consolidate.md` | "No lighter path" reworded; escalation from TICKET; the combine review and the 15-criteria target | 3 |
| `references/BUILD.md` | Branch lifecycle "When to use it" names ticket backlogs; branch read from the envelope | 3 |
| `workflow/README.md` | The intake workflow's stages and args; the combine review stage; "no lighter path" reworded | 3 |
| `CLAUDE.md` | Routing table rows for `requirements-pipeline` and `ticket` | 3 |
| `.claude/skills/ticket/SKILL.md` | Description and "When to use": build triggers leave, "follow the plan" stays | 3 |
| `docs/reference/worker-references.md` | The intake briefs and the combine-review brief | 3 |
| `.claude/skills/theme-ticket/SKILL.md` and `tim/src/theme-ticket/` | A ticket-owned path: comment, never rewrite | 3 |
| `.claude/rules/` or CLAUDE.md rule 3 | Not needed: Sam ruled ticket mode stops at green | Not drafted |

## 9. Canary

**EUDPA-832, "Address list search says it searches by country, but a country search returns no addresses".**

- Ready for Dev, unassigned, nobody's branch or pull request yet.
- Given/When/Then acceptance criteria and evidence tables: a READY ticket.
- Crosses repos: the search lives in `trade-imports-address-book` (`SearchTerms.java`, `ListMatchCriteria.java`), and the hint copy is in both frontends. With the tests repo, likely 3 to 4 repos. That exercises the multi-repo branch opener.
- Likely one row. It should not escalate.

**Fallback:** EUDPA-826 ("Identification details: update Save and add another to keep entered details"), one frontend plus tests.

The canary runs as row 3's gate (inc-010), before that row merges.

## 10. Risks

| Risk | Mitigation |
|---|---|
| A thin read misses a criterion the code needed | The refute agent's "missed" verdicts; the loop's planner reads the live tree; escalation at more than 4 rows |
| The ticket changes in Jira after intake | `tim backlog from-ticket --check` before every launch. A change reruns the intake |
| A ticket run holds the workspace checkout and every repo on its branch for the whole run | One ticket run per clone at a time. A second runs in another clone (CLAUDE.md rule 1 allows several) |
| `tim build branch` refuses a repo with someone's uncommitted work | It names the repo and changes nothing. The session reports it; it never stashes |
| The pre-push Sonar gate runs on every opening push | Accepted: it costs a few minutes and keeps rule 3's push check whole |
| Routing "implement EUDPA-X" away from the `ticket` skill surprises someone | "implement EUDPA-X by hand" still reaches it. The routing table says so |
| `theme-ticket` rewrites a person's ticket | Row 3 (inc-010) builds the comment path, and the canary is its gate, so no ticket-mode run reaches the drain point first |

## 11. Increments in build order

3 rows in `backlog.json`, combined from the 7 first drafted (section 2a). All build in the workspace repo only, under the full lifecycle (the branch lifecycle refuses the workspace as a backlog repo). The first drafts stay in the backlog as `merged-into`, so their ids are never reused.

| # | Row | Headline | Combines | Scope | Risk |
|---|---|---|---|---|---|
| 1 | inc-008 | A ticket can be fetched and distilled, and distil combines its rows | Ticket as a distil source; the fetch command; plus the combine review | Schema enum, extract brief, `from-ticket` with attachment download, `combine-candidates`, the combine review stage. 11 criteria | Medium: adds a stage to every DISTIL run |
| 2 | inc-009 | One launch turns a fetched ticket into a checked, combined backlog | The ticket-backlog check; the intake workflow | Backlog and intake schemas, `tim backlog check` rules, new workflow, two briefs, contract test. 10 criteria | Medium: touches the shape check every backlog runs, and a new agent method |
| 3 | inc-010 | The branch opens, the run ends at green pull requests, the ticket gets a what-shipped comment | Branch opener; docs and routing; the theme-ticket comment | `tim build branch --open`, TICKET.md, routing, combine docs, theme-ticket comment. Gate: the canary. 11 criteria | Medium: switches branches in real checkouts and redraws a routing boundary |
| — | — | Rule 3 exemption | — | Only on Sam's yes. Not drafted | — |

Each row waits on the one before it.

Progress: 0 of 3 (0%).

## Evidence read

- `.claude/skills/requirements-pipeline/` SKILL.md, DISTIL.md, BUILD.md ("Branch lifecycle", "The workspace repo"), SHAPE.md, `backlog.schema.json`, `sources.schema.json`, `workflow/README.md` ("The branch lifecycle").
- `workareas/shared/eudpa-774/` sources.json, build-args.json, report.md, backlog.json; animals frontend pull request #468 (the opening commit and draft body).
- `workareas/shared/eudpa-718-amend-from-dashboard/` backlog.json and investigation.md. Built under the full lifecycle with `ticket` set to EUDPA-718, so the loop merged it itself.
- `tim build branch`, `tim refine prepare`, `tim ticket`, `tim backlog`, `tim jira` help; `tim/src/clients/jira-client.js` (lists attachments, cannot download them).
- `ticket`, `ticket-refiner` and `theme-ticket` skills.
- Commits cdcfcb15 (the "no lighter path" rule) and a4ca71a2 (the loop claims the branch's ticket).
- Jira: EUDPA-832 and EUDPA-826, both Ready for Dev.

## Calls I made

- **A new intake step, not a light DISTIL.** DISTIL stays as it is; the exception is a separate path with its own limits.
- **Ticket mode always uses the branch lifecycle**, one row or many, so there is one path. EUDPA-718's alternative (full lifecycle, row `ticket` preset, the loop merges itself) is left as it is, not documented as a mode.
- **"build EUDPA-X" and "implement EUDPA-X" move to ticket mode.** Your "delegate, don't hand-build" rule points there. "implement EUDPA-X by hand" and "follow the plan" stay with `ticket`.
- **No separate `ticket-refiner` run.** The read agent applies its verdict rules; an existing verdict is read.
- **Questions build on their defaults** unless they touch security, access, data integrity or signed-off behaviour.
- **Thresholds:** escalate at more than 4 rows after combining, or more than 3 questions; split a row past 3 service repos or about 15 criteria.
- **Combining is the default at every stage that creates rows** (Sam, 25 November): a combine review after DISTIL's combiner, and a combine step before ticket intake's refute. A row stands alone only with a written reason. The criteria target rises from "three to ten" to about 15.
- **The combine review runs where rows are created, not in BUILD.** By the time the loop runs, rows are fixed; a re-distil reviews only `todo` rows.
- **This backlog follows its own rule:** 7 rows became 3, and the 7 stay as `merged-into`.
- **The session pushes and opens pull requests; tim only cuts branches**, so the pre-push gate runs and `gh` is never wrapped.
- **`tim backlog from-ticket`**, not a new top-level tim group: the output is a backlog workarea. `tim ticket` stays the `ticket` skill's helpers.
- **The workspace gets the branch and a pull request** whenever the ticket changes behaviour, because `openspec/` is committed there.
- **`theme-ticket` comments, never rewrites**, a ticket a person wrote.
- **Escalation only before the first row lands.**
- **Canary EUDPA-832**, fallback EUDPA-826.
- **The factory backlog builds under the full lifecycle**; the epic is BUILD's one launch input, as always.
