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
| 2. Extract, one agent per source | The workflow | [`../workflow/distil/briefs/extract.md`](../workflow/distil/briefs/extract.md) and the brief for the source's kind |
| 3. Verify, one or more agents per extract | The workflow | [`../workflow/distil/briefs/verify.md`](../workflow/distil/briefs/verify.md) |
| 4. Reconcile into requirements and conflicts | The workflow | [`../workflow/distil/briefs/reconcile.md`](../workflow/distil/briefs/reconcile.md) |
| 5. Consolidate into `backlog.json` | The workflow | [`../workflow/distil/briefs/consolidate.md`](../workflow/distil/briefs/consolidate.md) |
| 6. Draft the report | The workflow | [`REPORT.md`](REPORT.md) |
| 7. Save the report | The main session | [Section 5](#5-save-the-report) |
| 8. Answer the report's questions with the user | The main session | [Section 6](#6-answer-the-questions) |

Steps 1 to 6 are one workflow, [`../workflow/distil.js`](../workflow/distil.js). Never spawn a DISTIL agent yourself.
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
  models: {},                                       // defaults: think opus, code sonnet, light haiku
  verifyChunk: 150                                  // the most claims one verify agent takes
}
```

What each key does, and every stage, are in [`../workflow/README.md`](../workflow/README.md#distiljs).

## 2. What the workflow does

1. **Status.** `tim distil status` gives the work list: each source's state (pending, extracted, verified, stale
   or invalid) and what it needs next. A source already verified, with an unchanged scope hash and an unchanged
   extract, is skipped.
2. **Extract and verify, as a pipeline.** Each source moves on as soon as its own step checks out. Its extractor
   writes `distil/extract/<slug>.json` and stamps it with the scope hash. `tim distil check --stage extract
   --clear-parts` checks it and clears old verify part files: one retry with the problems, then the source fails.
   `check` also splits the claims into ranges of at most `verifyChunk`. One verifier per range writes
   `distil/verify/<slug>.part<N>.json`. `tim distil merge-verify` joins the parts and records the extract's hash,
   and `check --stage verify` checks them: one retry of the failed parts, then the source fails.
3. **A failed source stops the run before reconcile.** It is reported with its problems, never dropped. So is a
   source `only` left for later.
4. **Reconcile.** `tim distil working-set --write` gives the reconciler every claim that held plus every missed
   claim. It writes `distil/requirements.json` and `distil/conflicts.json`, keeping every existing id.
   `tim distil coverage` checks them: up to 2 send-backs with the problems.
5. **Consolidate.** The consolidator writes `backlog.json`, keeping every existing row id. It rewrites `todo` and
   `blocked` rows to the requirements as they stand, and never changes a row built or set aside (`done`,
   `deferred`, `dropped`, `rejected`, `merged-into`). `tim backlog check` and `tim distil coverage` must both pass.
   `tim distil backlog-snapshot` saves the rows before and names every row removed or changed after: up to 2
   send-backs. A requirement whose criterion one environment cannot observe goes in the consolidator's
   `reconcileProblems`. The workflow then runs reconcile and consolidate once more, with those requirements sent
   back. Any still open go to the report as a step before building.
6. **Report.** The report agent drafts the report to [`REPORT.md`](REPORT.md) and returns it as text. One retry.
   Anything wrong with its inputs comes back in `reportIssues`, never in the report.

The run returns the state of every source, the failed sources, the requirement and conflict counts, every open
question with its default, the backlog counts, `goalConflicts` (rulings that contradict the goal),
`reconcileProblems` (requirements still sent back after the second round), the report text and `reportIssues`.

## 3. The rules the workflow keeps

These hold whoever runs a step. The briefs carry each one to the agent that applies it.

- **Characterise first, extract second.** Every extract writes `structure` before its first claim.
- **One claim per observable fact**, with provenance (`ref`) and the source's own words (`quote`). `gap` is a
  confidence, never a kind.
- **Verify by trying to refute.** A different agent from the extractor, defaulting to refuted. A refuted claim
  leaves the working set; a missed claim joins it, its id `<claim id>-m<N>`.
- **A verification belongs to one extract.** Change a claim, even under the same id, and the source is verified
  again.
- **Precedence settles a disagreement; it never blocks.** Every disagreement is a conflict. Only one precedence
  cannot settle, or a gap that matters, becomes a question, and every question carries a default so building can
  start. One question per decision.
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
| `sources-unverified` | A source failed its extract or verify checks twice, or `only` left one for later | Read the failed source's `problems`. Fix the source or its `scope`. For a large source that failed at verify, lower `verifyChunk` or narrow `scope`. Then launch again: verified sources are skipped |
| `working-set-failed` | `tim distil working-set` failed | Run `tim distil status <workarea> --json` and fix what it names, then launch again |
| `reconcile-failed` | `requirements.json` or `conflicts.json` still had problems after 2 send-backs | Read `detail`. Launch again: the reconciler starts from the files on disk. If the same problem returns, fix the named file or the source behind it |
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

## Done means

- `tim backlog check` and `tim distil coverage` both pass.
- `report.md` follows the structure in [`REPORT.md`](REPORT.md): the summary first, then any step before building,
  then the repos and precedence, then the questions.
- The backlog envelope carries `repos`.
- Tell the user: the counts, the questions and their defaults, and how to build it:
  `tim backlog next <workarea>`, then the BUILD phase ([`BUILD.md`](BUILD.md)). For a dry run of one increment's
  plan, run the build loop with `planOnly: true`.
