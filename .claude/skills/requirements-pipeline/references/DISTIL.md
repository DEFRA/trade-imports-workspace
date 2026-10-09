# DISTIL phase

The first phase of the `requirements-pipeline` skill. Sources in, one `backlog.json` out. Every row is a
**requirement** (what, why, acceptance), never a recipe, and a **full-stack slice**, never one layer of one. The
fields are defined in `~/git/defra/trade-imports-workspace/.claude/skills/requirements-pipeline/references/backlog.schema.json`,
and the judgement rules a schema cannot check in `SHAPE.md` beside it: read both before you start. The BUILD phase ([`BUILD.md`](BUILD.md)) builds what this phase writes.

## Who does what

| Step | Who | Where the method lives |
|---|---|---|
| 0. Intake: write `sources.json`, fetch Confluence pages, write up rulings | The main session | This file |
| 1. Status: which sources need work | The workflow | `tim distil status` |
| 2. Characterise: cut each source into parts one agent can read in full | The workflow | [`../workflow/distil/briefs/characterise.md`](../workflow/distil/briefs/characterise.md) and [`partition.schema.json`](partition.schema.json) |
| 3. Extract, one agent per part, merged by tim | The workflow | [`../workflow/distil/briefs/extract.md`](../workflow/distil/briefs/extract.md) and the brief for the source's kind |
| 4. Verify, one agent per range of claims | The workflow | [`../workflow/distil/briefs/verify.md`](../workflow/distil/briefs/verify.md) |
| 5. Plan the reconcile areas from every source's partition | The workflow | [`../workflow/distil/briefs/area-plan.md`](../workflow/distil/briefs/area-plan.md) and [`areas.schema.json`](areas.schema.json) |
| 6. Reconcile each area, one agent an area, merged by tim, then one cross-area pass | The workflow | [`../workflow/distil/briefs/reconcile.md`](../workflow/distil/briefs/reconcile.md) and [`reconcile-part.schema.json`](reconcile-part.schema.json) |
| 7. Challenge every question against precedence and the rulings, and apply the verdicts | The workflow | [`../workflow/distil/briefs/question-challenge.md`](../workflow/distil/briefs/question-challenge.md) and [`challenge.schema.json`](challenge.schema.json) |
| 8. Draft rows per area, then combine them into `backlog.json` | The workflow | [`../workflow/distil/briefs/consolidate.md`](../workflow/distil/briefs/consolidate.md) |
| 9. Draft the report | The workflow | [`REPORT.md`](REPORT.md) |
| 10. Save the report | The main session | [Section 5](#5-save-the-report) |
| 11. Answer the report's questions with the user | The main session | [Section 6](#6-answer-the-questions) |
| 12. Split a themed backlog, one backlog per theme, once the questions are answered and the re-distil has landed | The main session | [Section 7](#7-split-into-themes) |
| Any time: split one ready theme off early, so a second machine builds it while the rest is still ruled on | The main session | [Section 8](#8-splitting-a-theme-off-early) |

Steps 1 to 9 are one workflow, [`../workflow/distil.js`](../workflow/distil.js). Never spawn a DISTIL agent yourself.
Never check a DISTIL file with hand-written `jq`. Never write an extract, a requirement or an increment. `tim distil`
does every count, check and merge.

## The workarea

The **workarea** is the programme's folder, named as a path under `workareas/`: `shared/<programme>`, unless the user
names another. That short form is what `tim distil` and the workflow's `workarea` arg take. On disk the folder is
`workareas/shared/<programme>/`, so a path in this file reads `workareas/<workarea>/sources.json`.

## 0. Intake

The user gives the goal and the sources. That is all they need to give. Ask for either only if it is missing,
and derive the programme name from the goal if they do not name one. **Never ask which repos to build in or
which source wins.** Work both out, as below, and the report states them near the top so a wrong guess is caught.
Then write `workareas/<workarea>/sources.json` yourself. It is the one DISTIL file you author, and its fields are
defined in [`sources.schema.json`](sources.schema.json):

```json
{
  "programme": "hrp-origin-and-commodity",
  "goal": "One sentence: what is being built, for whom.",
  "repos": { "frontend": "repos/trade-imports-plants-frontend", "backend": "repos/trade-imports-plants-backend", "tests": "repos/trade-imports-ins-tests" },
  "reposWhy": "High-risk plants origin and commodity is the plants journey: the plants frontend and backend own it; the tests repo holds every service's E2E suite.",
  "precedence": ["repo:frontend", "repo:backend", "repo:tests", "confluence:6518997274", "trace:ched-pp", "trace:recorded-run"],
  "sources": [
    { "id": "repo:frontend", "kind": "repo", "locator": "repos/trade-imports-plants-frontend", "scope": "the origin and commodity pages, spec/decisions.json", "role": "what exists today and what has already been ruled" },
    { "id": "repo:backend", "kind": "repo", "locator": "repos/trade-imports-plants-backend", "scope": "the notification's origin and commodity fields", "role": "what exists today and what has already been ruled" },
    { "id": "repo:tests", "kind": "repo", "locator": "repos/trade-imports-ins-tests", "scope": "the plants origin and commodity specs", "role": "what is already proven end to end" },
    { "id": "confluence:6518997274", "kind": "confluence", "locator": "workareas/shared/hrp-origin-and-commodity/sources/6518997274.json", "scope": "whole page", "role": "policy: what data must be captured" },
    { "id": "trace:ched-pp", "kind": "trace", "locator": "workareas/trace-requirements/ched-pp", "scope": "pages/country-of-origin.json, pages/variety-of-genus-and-species.json", "role": "how the current service does it" },
    { "id": "trace:recorded-run", "kind": "trace", "locator": "workareas/shared/hrp-origin-and-commodity/sources/traces", "scope": "the traces whose titles name the origin or commodity steps", "role": "how the current service does it" }
  ]
}
```

- **Work out `repos` from the goal.** The workspace already knows what every repo does: read the "Repo map"
  table in `CLAUDE.md`, `docs/repos/*.md` where a repo has one, then the README and CLAUDE.md of each
  candidate repo. Pick the repos that own the behaviour the goal describes, each a workspace-relative
  `repos/<folder>` path under a lower-case key. The tests repo (`repos/trade-imports-ins-tests`, which holds
  every service's E2E suite) is always included: it is where an increment proves itself end to end. Leave a repo
  out when the goal needs no change there. Write one line in `reposWhy` saying why these repos. Ask the user only
  when two repo families fit the goal equally well (animals or plants, say) and the goal and sources do not
  settle it. Otherwise decide.
- **Work out `precedence`.** It lists every source from most to least authoritative and decides conflicts. The
  default order is:
  1. rulings from the owner of the work (the `ruling:` sources)
  2. the target repos' existing rulings (the `repo:<key>` sources)
  3. policy and design documents (Confluence pages, documents)
  4. signed-off designs (images, design canvases)
  5. traces, the behaviour of an old system, and general guidance from the web
  Within a tier, keep the order the user listed the sources in. The user states precedence only to override
  this; follow them when they do, and never ask.
- **The target is always a source.** Add one source per repo in `repos` (kind `repo`, id `repo:<key>`), its
  `scope` the area the goal touches, with the role "what exists today and what has already been ruled". If the
  target keeps a decisions or rulings ledger (such as `spec/decisions.json`), add it to that repo's scope. An
  existing ruling outranks a default the distiller would otherwise invent. The tests repo's role is "what is
  already proven end to end", and its scope the specs for the area the goal touches.
- **A trace source brings its driving test suite with it, where one exists.** A trace shows only what
  somebody walked, so it is a lower bound on the service. The suite that drove it names the pages and
  fields no recorded run happened to reach. Add it as a `repo` source scoped to those specs, and the
  reconcile step raises the floor. Where the suite is gone, tell the user: the lower bound stands.
- **Write `themes` only when the user asks for themes**, such as building on several machines at once. It is the
  rule for drawing theme boundaries, in the user's words or as "Group increments by the code each touches, so themes
  build in parallel without conflicting pull requests." The consolidator then gives every row a theme. Leave it out
  otherwise: a backlog without themes builds as one.
- `scope` narrows a large source. Distil a slice of a big source well rather than all of it thinly.
- **Fetch each Confluence page** with
  `tim confluence page <id> --json > workareas/<workarea>/sources/<page-id>.json`, and make that file the
  source's `locator`. The extractor and verifier read the file, so they read the same words.
- **Copy a document** into `workareas/<workarea>/sources/` and make the copy the `locator`.
- **Copy an image**, or a folder of them, into `workareas/<workarea>/sources/`, and make the file or folder the
  `locator`. Its `scope` names the screens that matter.
- **A `web` source's `locator` is its URL.** Its `scope` names the pages that matter.
- **A ruling** is written up as in [section 6](#6-answer-the-questions).

Check the file before you launch: `tim distil status <workarea> --json` exits 1 and names every problem when
`sources.json` is out of shape.

### Adopting a programme distilled by hand

A workarea extracted and verified before this workflow existed has no scope hashes in its extracts and no extract
hashes in its verify files. `tim distil status` counts every such source stale, so the first launch would extract
and verify all of them again. Adopt the ones that are still good first:

1. Run `tim distil status <workarea> --json` and read each source's state and reason.
2. For each source whose extract you know was made for its current `kind`, `locator` and `scope`, run
   `tim distil adopt <workarea> --source <id> --json`. It records both hashes, and writes nothing unless the
   extract and any verification are in shape and current.
3. Leave the rest. An `invalid` source (such as an extract with `gap` as a kind) is extracted again by the launch.
   So is a source whose `adopt` refused.
4. Run `tim distil status <workarea> --json` again: the adopted sources now read `verified`.

Never adopt a source an agent has just extracted again. Its old verification judged the earlier extract, so it
must be verified again.

### Extracting a source again with an unchanged scope

A launch skips every source already verified with an unchanged scope hash. When the extract method has changed, so
an old extract is no longer good enough although its source is the same, reset the sources first:

```bash
tim distil reset <workarea> --source repo:frontend --source trace:recorded-run --json   # the named sources
tim distil reset <workarea> --all --json                                                # every source
```

It moves each source's extract, partition, extract parts, verification and verify parts to
`workareas/<workarea>/distil/superseded/<time>/extract/` and `.../verify/`, so nothing is lost, and the source reads
`pending`. Its working folder (`distil/extract/<slug>.work/`) stays. Then launch as usual. The fresh extract has new
claim ids, so the next reconcile re-cites any requirement that cited an old claim, keeping every requirement,
conflict and row id.

### Reconciling again from nothing

A normal re-distil keeps every requirement, conflict and row id, and needs no reset. When the **reconcile or
consolidate method** has changed, such as the move to reconciling by area, a re-distil would carry the old method's
requirements forward. Start the later stages again instead, keeping every verified extract:

```bash
tim distil reset <workarea> --stage reconcile --json
```

It moves `requirements.json`, `conflicts.json`, the working sets, `areas.json` and every area's files, the challenge
verdicts, the backlog snapshots, `backlog.json` and `report.md` to `distil/superseded/<time>/reconcile/`. Every
source stays `verified`, so the next launch goes straight to the area plan, and every id starts again from `001`. It
refuses while any backlog row has build work on it (`done`, `deferred`, a commit, a branch or a pull request): a
fresh backlog would lose those ids, so re-distil without a reset instead. It also refuses while the backlog has a
theme split off ([section 8](#8-splitting-a-theme-off-early)): a fresh backlog would lose the pointer, and the next
run would draft that theme's rows again on the main branch.

## 1. Launch the workflow

Launch it from the main session, by `scriptPath`, never by `name` (a name runs a stale snapshot). A subagent
cannot launch a workflow.

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/distil.js", args })
```

Every key of `args` is required, and a missing one stops the run before any agent starts:

```js
{
  workspace: '~/git/defra/trade-imports-workspace', // the workspace root, tilde form; a clone passes its own
  workarea: 'shared/hrp-origin-and-commodity',      // the workarea: under workareas/, never starting with it
  only: null,                                       // or a list of source ids to work this launch
  tim: 'tim',                                       // how agents run tim; a clone passes its own
  models: {},                                       // defaults: think opus, code opus, light haiku
  verifyChunk: 60                                   // the most claims one verify agent takes
}
```

`models: {}` is the deep run, and the one to use: characterise, every extract part, every verifier, the area plan,
every area reconciler, the cross-area pass, every challenger, every row drafter and the combiner run on Opus.
`verifyChunk: 60` keeps each verifier's range small enough to re-check every claim against the source.

What each key does, and every stage, are in [`../workflow/README.md`](../workflow/README.md#distiljs).

## 2. What the workflow does

1. **Status.** `tim distil status` gives the work list: each source's state (pending, extracted, verified, stale
   or invalid) and what it needs next. A source already verified, with an unchanged scope hash and an unchanged
   extract, is skipped.
2. **Characterise, extract and verify, as a pipeline.** Each source moves on as soon as its own step checks out.
   - **Characterise.** One Opus agent surveys the whole source and writes `distil/extract/<slug>.partition.json`:
     its structure, and its parts, each small enough for one agent to read in full and claim exhaustively (a group
     of pages or a feature folder of a repo, the traces of one spec file, a run of sections of a document). Each
     part names what to read in full, what it must cover, and its claim id prefix, `<slug>-p<N>`. A small source is
     one part. `tim distil check --stage partition --clear-parts` checks it and clears old extract part files: one
     retry with the problems, then the source fails at `characterise`.
   - **Extract.** One Opus agent per part, side by side, reads its slice word for word and writes
     `distil/extract/<slug>.part<N>.json`, checking it with `check --stage extract --part <N>`. `tim distil
     merge-extract` joins the parts in order into `distil/extract/<slug>.json` and stamps the scope hash. Then
     `check --stage extract --clear-parts` checks the extract, every part and that the extract is its parts merged,
     and clears old verify part files. The workflow cuts the claims into ranges of at most `verifyChunk` itself, from
     the claim count, and checks the count of ranges the relay copied against it. A failed merge re-runs the parts
     it names, once, then the source fails.
   - **Verify.** One Opus verifier per range writes `distil/verify/<slug>.part<N>.json`, told which extract parts
     its range came from so it re-reads that slice in full. `tim distil merge-verify` joins the parts and records
     the extract's hash, and `check --stage verify` checks them: one retry of the failed parts, then the source
     fails. The relayed verdict count must equal the claim count.
3. **A failed source stops the run before reconcile.** It is reported with its problems, never dropped. So is a
   source `only` left for later.
4. **Areas.** `tim distil working-set --write` gives every claim that held plus every missed claim. One Opus agent
   plans the areas from every source's partition (each part's title, scope and covers), writing
   `distil/areas.json`: areas such as a journey page or page group, the dashboard, the address book, templates,
   transporters, amend, copy and delete, and a cross-cutting area. Each area takes every source's claims about it,
   by extract part or claim range, today's sources included. `tim distil areas` refuses a claim in no area, and on
   a re-distil an existing id in no area or two. `tim distil areas --write` writes each area's working set to
   `distil/areas/<area id>/working-set.json`, and clears what an earlier reconcile left: one retry of the plan, then
   the run stops.
5. **Reconcile.** One Opus reconciler per area, six at a time, weighs every claim in its working set and writes
   `distil/areas/<area id>/reconciled.json`, checking it with `tim distil merge-reconcile --area <id>`.
   `tim distil merge-reconcile` joins the areas into `requirements.json` and `conflicts.json`, numbering new ids on
   from the highest and writing `distil/areas/id-map.json`: the areas a failed merge names are reconciled again,
   once. One Opus cross-area pass then merges duplicates and settles conflicts that span areas, and
   `tim distil coverage` checks the files, refusing any source that backs no requirement or conflict: up to 2
   send-backs.
6. **Challenge.** One Opus challenger per question conflict, six at a time, tries to settle it from precedence and
   every ruling, and writes `distil/challenge/<conflict id>.json`, checked by `tim distil challenge --conflict`.
   Its verdict is `precedence`, `blocked` (it waits on somebody outside the programme, so its requirements are
   adopted with `blockedBy`) or `question`. One apply step rewrites every settled conflict and its requirements,
   and `tim distil coverage` checks each verdict was applied: up to 2 send-backs. Only the survivors stay questions.
7. **Consolidate.** One Opus drafter per area, six at a time, drafts its area's rows and the code each touches in
   `distil/areas/<area id>/rows.json`. One Opus combiner joins them into `backlog.json`, merging rows that repeat
   the same set-up, ordering them and drawing the themes, keeping every existing row id. It rewrites `todo` and
   `blocked` rows to the requirements as they stand, and never changes a row built or set aside (`done`,
   `deferred`, `dropped`, `rejected`, `merged-into`). `tim backlog check` and `tim distil coverage` must both pass.
   `tim distil backlog-snapshot` saves the rows before and names every row removed or changed after: up to 2
   send-backs. A requirement whose criterion one environment cannot observe goes in the combiner's
   `reconcileProblems`. The workflow then runs the cross-area pass, the challenge and the combiner once more, with
   those requirements sent back. Any still open go to the report as a step before building.
8. **Report.** The report agent drafts the report to [`REPORT.md`](REPORT.md) and returns it as text. One retry.
   Anything wrong with its inputs comes back in `reportIssues`, never in the report.

The run returns the state of every source, the failed sources, the areas, the requirement and conflict counts, every
open question with its default, the blocked requirements, the challenge's counts, each source's cited claims, the
backlog counts, `goalConflicts` (rulings that contradict the goal), `reconcileProblems` (requirements still sent back
after the second round), the report text and `reportIssues`.

**A resumed run replays every agent that finished.** The fan-outs run in fixed batches of six in plan order, and no
prompt carries a time, so a run stopped at a session limit resumes with `resumeFromRunId` and the same args: every
agent that finished returns its cached answer, and the run carries on from the first that did not.

## 3. The rules the workflow keeps

These hold whoever runs a step. The briefs carry each one to the agent that applies it.

- **Every source is extracted in depth.** Characterise, cut into parts, one agent per part reading its slice in
  full, merge: that is the only extract path, for every source on every run, and its agents run on Opus by default.
  A small source is simply one part. There is no lighter path because a thin extract caps everything downstream: a
  page, field or rule nobody claimed never reaches a requirement, and no later step can put it back.
- **Exhaustive within a part.** A page or field seen in a part's slice and not claimed is a defect.
- **Characterise first, extract second.** The partition writes the source's `structure` before any part is
  extracted, and every part writes its own before its first claim.
- **One claim per observable fact**, with provenance (`ref`) and the source's own words (`quote`). `gap` is a
  confidence, never a kind.
- **Verify by trying to refute.** A different agent from the extractor, defaulting to refuted. A refuted claim
  leaves the working set; a missed claim joins it, its id `<claim id>-m<N>`.
- **A verification belongs to one extract.** Change a claim, even under the same id, and the source is verified
  again.
- **Depth at every stage.** No agent weighs more than it can read in full. Reconcile is cut into areas, one Opus
  reconciler an area; questions are challenged one agent a question; rows are drafted one agent an area. One agent
  over a whole programme skims, and its gaps never come back.
- **Every claim from a today source is weighed.** The target repos, traces of the real services and the tests repo
  say what exists now, and each delta cites the claims that show it. Copy, option, hint and error differences stay
  at their real granularity, never summarised. `tim distil coverage` refuses a verified source that backs no
  requirement or conflict: its held claims are facts nobody weighed, which is a defect, never a judgement. The
  report names any source whose cited share is low.
- **Questions are minimal by default.** Precedence and the rulings settle every difference they can. A difference
  that waits on somebody outside the programme (a platform change, access, a ticket) is never a design question: its
  requirement is adopted with `blockedBy` and built in a `blocked` row whose open question names the blocker. The
  challenge step enforces this: every question the reconcilers raise is challenged by its own agent, and only the
  ones neither precedence nor a ruling settles reach the owner.
- **Precedence settles a disagreement; it never blocks.** Every disagreement is a conflict. Only one precedence
  cannot settle, or a gap that matters, becomes a question, and every question carries a default so building can
  start. One question per decision.
- **No relayed list is trusted.** A light agent that relays tim's output is checked against another count: the
  partition's parts against characterise, the verify ranges against the claim count, the verdicts against the
  claims, the working set against the status, the areas against the plan, the questions against coverage's own
  count. A relay that disagrees is asked again once, and twice wrong fails the step. The verify ranges themselves
  are worked out by the workflow from the claim count, never retyped.
- **A doubt is a question, never a plain reading.** Where a source or ruling cannot be met as written in some part
  of the target (an environment, a repo, a journey or a stage), or two readings of it would build different things,
  the reconciler makes it a question whose default says what each part gets.
- **Every acceptance criterion can be observed in every environment its row names.** Where one cannot, the
  consolidator sends the requirement back to the reconciler, once. What is still open after that goes in the
  report's step 0, to settle before building.
- **Precedence settles between sources, never within one.** A conflict settled by precedence has positions from at
  least two sources.
- **What precedence sets aside is named.** A conflict's `overruled` lists the claims the outcome withdraws, such as
  an earlier ruling a later one replaces. No adopted or question requirement rests on one, and no `todo` or
  `blocked` row names one. `tim distil coverage` checks both.
- **A ruling outranks the goal.** Where a ruling contradicts `sources.json`'s `goal`, the reconciler follows the
  ruling and returns the contradiction in `goalConflicts`. The main session corrects the goal.
- **Every adopted requirement carries a delta**: `new`, `change` (with how today differs) or `exists` (with what
  meets it). An `exists` requirement goes in the report, never in a `todo` increment.
- **Every adopted `new` or `change` requirement sits in exactly one increment** that is built or still to build:
  `todo`, `blocked`, `done` or `deferred`. A `dropped`, `rejected` or `merged-into` row covers nothing.
  `tim distil coverage` checks this once `backlog.json` exists.
- **Rows are thin full-stack slices, combined** where building them apart would repeat the same set-up (see
  [`SHAPE.md`](SHAPE.md)).
- **Themes build in parallel.** Boundaries are drawn at feature-folder granularity from what each row touches.
  Shared files (a journey's flow, the layout, shared copy) go in a foundation theme in an early wave. A theme holding
  most of the rows is a smell.
- **Re-distilling keeps every id**: requirements, conflicts and rows. A `todo` or `blocked` row is rewritten to the
  latest rulings, and a blocked row whose blocker a ruling removed becomes `todo`. A row built or set aside never
  changes. Nobody resets a status by hand.

## 4. When the run stops early

`stopped.reason` says why, and `stopped.detail` names every problem. Files already written stay on disk, and the next
launch reads them as a re-distil.

| Reason | What happened | What to do |
|---|---|---|
| `status-failed` | `tim distil status` refused `sources.json` | Fix every problem it names in `sources.json`, then launch again |
| `unknown-source` | `only` names a source `sources.json` does not have | Correct `only`, then launch again |
| `sources-unverified` | A source failed its characterise, extract or verify checks twice (`failedAt` says which), or `only` left one for later | Read the failed source's `problems`. Fix the source or its `scope`. For a large source that failed at verify, lower `verifyChunk` or narrow `scope`. Then launch again: verified sources are skipped |
| `working-set-failed` | `tim distil working-set` failed, or its output was relayed wrong twice | Run `tim distil status <workarea> --json` and fix what it names, then launch again |
| `areas-failed` | `distil/areas.json` still had problems after one retry of the plan | Read `detail` and run `tim distil areas <workarea> --json`. Launch again: the planner starts from the file on disk |
| `reconcile-failed` | An area's file would not merge after one retry of the areas it names, or `requirements.json` or `conflicts.json` still had problems after 2 send-backs of the cross-area pass | Read `detail`. Launch again: the area reconcilers start from the merged files on disk. If the same problem returns, fix the named file or the source behind it |
| `challenge-failed` | The challenge verdicts were still not applied after 2 send-backs | Read `detail` and run `tim distil coverage <workarea> --json`. Launch again: every question is challenged afresh |
| `snapshot-failed` | `tim distil backlog-snapshot` could not save the backlog's rows | Run `tim backlog check <workarea> --json` and make `backlog.json` parse, then launch again |
| `consolidate-failed` | `backlog.json` still had problems after 2 send-backs | Read `detail`. Launch again: the consolidator starts from the file on disk. If a changed row is named, restore it from `distil/backlog-snapshot.before.json` first |
| `report-failed` | The report agent returned nothing, twice | Launch again. It runs reconcile and consolidate again over the files on disk, keeping every id and every row built or set aside, then drafts the report |

Resume a run with `resumeFromRunId` only when it stopped at a session limit.

## 5. Save the report

The workflow returns the report as text, because a subagent cannot write a report file. Save it unchanged to
`workareas/<workarea>/report.md`, the result's `reportPath`.

Then read two fields the report leaves out:

- `goalConflicts`: rulings that contradict `sources.json`'s `goal`. Rewrite the goal to match them, so the next
  launch starts from it.
- `reportIssues`: anything the report step found wrong with its inputs. Fix each one, or tell the user.

## 6. Answer the questions

Take each question in the report to the user, with its default. Record every answer as a ruling, including "keep
the default". A question with no ruling stays open on the next launch.

1. Write the ruling up as `workareas/<workarea>/sources/ruling-<who>-<date>.md`, where `<date>` is like
   `2026-09-29`. Add a letter (`2026-09-29b`) for a second ruling that day:

   ```markdown
   # Ruling: <who>, <date in words>

   > <the user's words, verbatim>

   1. <One claim: one decision, in plain English.> Answers question 3, "<the question's heading>" (c-004).
   2. <The next claim.> Answers question 5 (c-009).
   3. <A decision no question asked.> New.
   ```

   Number the claims. Each names the report question and conflict it answers, or says it is new. The extractor
   checks every claim against the quote.
   A ruling that takes back an earlier one says so in its claim, such as "Replaces claim 3 of
   ruling:sam-2026-09-29". The reconciler records it as a conflict that overrules the earlier claim.
2. Add it to `sources.json`, and put its id first in `precedence`. Where the ruling changes what the programme is
   for, rewrite `goal` in the same edit:

   ```json
   { "id": "ruling:sam-2026-09-29", "kind": "ruling", "locator": "workareas/shared/<programme>/sources/ruling-sam-2026-09-29.md", "scope": "whole file", "role": "the owner's decisions: outranks every other source" }
   ```

3. Launch again with the same args.

A new source goes in the same way: fetch or copy it as in intake, add it to `sources` and `precedence`, and launch.
A narrower or wider `scope` changes the source's scope hash, so the next launch extracts it again. Nothing needs to
interrupt a run.

On the next launch only the new or changed sources are extracted and verified. Reconcile and consolidate run over
everything, keeping every existing id, so the backlog grows rather than starting again.

## 7. Split into themes

Only when `sources.json` has `themes`. Split last, never straight after the first launch. The answers to the report's
questions move rows between themes, unblock rows and add new ones, so a split made before them is thrown away. Wait
until every question has a ruling (even "keep the default"), the re-distil with those rulings has landed, and
`tim backlog check` and `tim distil coverage` pass. Then split the backlog:

```bash
tim backlog split <workarea> --json            # a dry run: what each theme's backlog would hold
tim backlog split <workarea> --write --json    # write them
```

It writes one backlog per theme at `workareas/<workarea>/themes/<theme id>/backlog.json`, and
`workareas/<workarea>/themes/themes.json` with each theme's workarea, branch, rows and landing wave. It checks every
split backlog first and writes none if one fails. Each theme's branch is `feat/NO_JIRA-<programme>-<theme id>`;
`--branch-prefix feat/EUDPA-123-plants` gives `feat/EUDPA-123-plants-<theme id>` instead.

Split again after every re-distil. It is safe to run any number of times:

- a theme's file is written only when it changes;
- a row the build loop has built or set aside (any status but `todo` or `blocked`) is kept exactly as its split copy
  has it;
- a `todo` or `blocked` row is refreshed from the parent, keeping the ticket, branch, commit, pull requests, notes
  and open questions the loop wrote on it;
- it refuses, writing nothing, when the parent puts a built row in another theme, or in none.

Never edit a split backlog's rows by hand: re-distil the parent and split again.

A theme already split off early (section 8) is left out: its backlog lives on its own branch. The full split keeps
its entry in `themes.json` and its place in the landing order, and never touches its backlog.

## 8. Splitting a theme off early

**When.** One theme is ready while the rest of the backlog is still being ruled on and re-distilled, and a second
machine is free to build it. Ready means its rows are settled: no open question touches them, and `tim backlog
check` and `tim distil coverage` pass. Repeat for each theme as it becomes ready.

**The command.** A dry run first, then the same with `--write`:

```bash
tim backlog split <workarea> --theme <theme id> --json           # what moves, what waits on what
tim backlog split <workarea> --theme <theme id> --write --json   # move it
```

`--theme` can be given more than once. `--branch-prefix` works as for the full split. Without `--theme` the command
does the full split, as in section 7.

**What moves.** The theme's backlog is written to `workareas/<workarea>/themes/<theme id>/backlog.json`, exactly as
the full split would write it, and its entry is merged into `themes/themes.json`, keeping every other entry. Then
the theme and every one of its rows leave the main `backlog.json` altogether. There is no lock: the split backlog is
the only copy.

**What stays.** One pointer per theme in the main backlog's `splitOff`: its id, title, touches and theme
dependencies, its branch, workarea and backlog path, the ids of the rows that moved, the requirements they covered
with each one's fingerprint, and when it was split off. `tim backlog check` holds the main backlog to it: no theme
left may touch its code, no row may be in it or reuse a moved row's id. The command lists the dependencies it
rewired, in plain words:

- a row left in the main backlog that depended on a moved row now has an `externalDependsOn` on the split backlog;
- a moved row that depended on a row still in the main backlog has an `externalDependsOn` on the main backlog.
  `tim backlog next` follows it to that row's own theme split once that theme is split too;
- a theme split off before that waits on a row this split moves is pointed at the row's new workarea (`relinked`),
  because the main backlog no longer has the row.

A theme split off by a version of tim without that last step can still wait on the main backlog for a row a later
split moved. `tim backlog check` on the main backlog names each such wait. Point them at the right workarea with:

```bash
tim backlog split <workarea> --relink --json           # which waits would move
tim backlog split <workarea> --relink --write --json   # move them
```

It refuses, writing nothing, a theme already split off, a theme the backlog does not have, or a result that fails
`tim backlog check`.

**Building it.** The second machine pulls the workspace repo and runs the build loop on the split backlog, exactly as
for any split theme ([`BUILD.md`](BUILD.md#building-one-theme)): `workarea` is `<workarea>/themes/<theme id>`,
`repos` is that backlog's `repos`, and the branch is its `branch`.

**Later rulings.** Re-distil the main workarea as usual. `tim distil coverage` counts every requirement a pointer
holds as covered by the split backlog. `tim distil areas` leaves them out of every drafter's work, and the combiner
carries `splitOff` over unchanged: the workflow compares every pointer before and after it. A new requirement whose
code falls in the theme's touches gets no row in the main backlog; the combiner adds it to the pointer's `pickUp`.
`tim distil coverage` names every requirement the theme holds that is still to build and has changed since the split,
by fingerprint, and every one no longer to build. It names one now already in place, usually because the branch built
and merged it, as `nowInPlace`; the report lists that with every other `exists` requirement, not as work for the
branch. The report lists the other three under "For the split branches", naming the branch. Whoever
builds that branch adds or rewrites rows in its own backlog for them. Never split the theme off again.

The report lists a change at every re-distil until the pointer takes it in. Once the branch has its rows, edit the
main backlog's pointer between runs: move each picked-up id from `pickUp` to `requirements`, and copy each id's
fingerprint from `fingerprintsNow` in `tim distil coverage <workarea> --json` (under `result.backlog.splitOff`) into
the pointer's `fingerprints`. Once the branch has dropped or rewritten the row for a requirement no longer to build,
take that id out of the pointer's `requirements` and `fingerprints`; do the same for an id now in place, whenever you
like. Change nothing else in it. Never reset reconcile while the backlog has a pointer
([Reconciling again from nothing](#reconciling-again-from-nothing)): `tim distil reset` refuses, because a fresh backlog
would lose the pointer and draft the theme's rows again.

## Done means

- `tim backlog check` and `tim distil coverage` both pass.
- `report.md` follows the structure in [`REPORT.md`](REPORT.md): the summary first, then any step before building,
  then the repos and precedence, then the questions.
- The backlog envelope carries `repos`.
- When `sources.json` has `themes`: the backlog carries `themes`. After the questions are answered and the
  re-distil has landed, `tim backlog split <workarea> --write` has written every theme's backlog and
  `themes/themes.json`. A theme split off early keeps its pointer in `splitOff`, and the report's "For the split
  branches" section names what its branch must pick up.
- Tell the user: the counts, the questions and their defaults, and how to build it:
  `tim backlog next <workarea>`, then the BUILD phase ([`BUILD.md`](BUILD.md)). For a themed backlog, give the
  landing order and each theme's workarea and branch: each theme builds from its own workarea. For a dry run of one
  increment's plan, run the build loop with `planOnly: true`.
