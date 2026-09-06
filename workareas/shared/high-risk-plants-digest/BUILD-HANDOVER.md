# Handover — build the high-risk plants backlog in batches

Copy the block below into a fresh session.

---

You are starting the **build phase** of the high-risk plants journey: run **EUDPA-409**
under epic **EUDPA-407**, target `high-risk-plants-frontend`. The requirements digest, the
spec gate and the judges panel are done and pushed; nothing is built. Your job is to get
the 63-increment backlog building in batches through the workspace's batch orchestrator,
then run it.

Read first, in this order:

1. `.claude/workflows/batch-orchestrator/README.md` — the three tiers (L0 / L1 / L2), the
   ledger, the run copy, the honest limits.
2. `.claude/workflows/README.md` — the increment build loop's config and stages.
3. `workareas/journey-builder/EUDPA-409/PROGRAMME-NOTES.md` — the programme facts L1 reads.
4. `workareas/journey-builder/EUDPA-409/backlog.json` — do not read it whole; use the jq
   queries in the L0 prompt.

## What is where

- Spec: `src/server/app/sets/high-risk-plants/spec/` on the plants frontend branch
  `spike/EUDPA-409-high-risk-plants-spec` (pushed). journey-spec.json, conflicts.json,
  decisions.json (83 rulings), backlog-extras.json, panel/.
- Backlog: `workareas/journey-builder/EUDPA-409/backlog.json`, tracked on the workspace
  branch `chore/EUDPA-409-high-risk-plants-digest` (PR #34 against main). 17 M0 hygiene
  increments, then pages in journey order interleaved with restores, exemplar closures and
  a tests-repo `e2e` increment per section; three gated extras at the very end.
- Tooling: `tools/journey-builder/` (the ledger, setters, removals, extras) and the
  journey-builder skill's "Mode: rule" section.

## Four things stand between the backlog and the loop. Do them first, as PRs.

The build loop and its orchestrator were written for the plant-products programme in the
animals repos. They will not run this backlog as-is. Each item below is small, verified by
reading the code today, and worth its own PR.

**1. Merge the spec onto main.** Every increment cuts its branch off `main`, and the spec is
only on the spike branch. Raise a PR from `spike/EUDPA-409-high-risk-plants-spec` to `main`
in the plants frontend (data files only — nothing executable changes) and merge it. The
worktree under `workareas/journey-builder/EUDPA-409/frontend-worktree/` keeps tracking the
spike branch for the journey-builder scripts; after the merge, re-point its
`.digest-meta.json` `spec_dir` only if you move the worktree to main. Merge PR #34 too, so
`backlog.json` and the tooling are on the workspace's main.

**2. Make the loop's repo table configuration.** `increment-build-loop.js` hardcodes
`REPO_PATH` and `REPO_SLUG` to the three animals repos (lines ~171-179) and
`WORKSPACE_CANDIDATES` to the old `trade-imports-animals-workspace` symlink (line ~121). Add
a `repos` map to `FALLBACK`/`args` — for this programme `frontend →
repos/trade-imports-plants-frontend` / `DEFRA/trade-imports-plants-frontend`, `backend →
repos/trade-imports-plants-backend`, `tests → repos/trade-imports-animals-tests` — defaulting
to the animals table so existing programmes are unchanged, and put
`~/git/defra/trade-imports-workspace` first in the candidates. L0's and L1's "Repo paths"
lines say the animals paths too; make them read the map from the ledger's `programme`
block. Dry-run it on one throwaway increment against a throwaway ticket before any real
batch — nothing in the lifecycle (ticket, branch, PR, CI, merge, Done) has ever been
executed end to end.

**3. Plan every increment into the loop's shape, and keep the plan across regeneration.**
L1's buildable query withholds any increment whose `sizeGuess` is null, and its plan checks
need `title`, `repo`, `filesToTouch`, `acceptanceCriteria`, `verification[]` and
`openQuestions`. The journey-builder generator emits none of those (it carries `type`,
`page`/`key`, `obligations`, `detail`, `milestone`, `gate`). Two parts:

   - Extend `tools/journey-builder/backlog-generate.sh` so the fields above survive
     regeneration by content key, exactly as `status`, `commit` and `failure_reason` do
     today (the preservation is one jq expression; add the keys to it). Otherwise the first
     `backlog-generate.sh` after planning throws the plan away.
   - Run a planning pass: one `general-purpose` subagent per increment, in dependency
     order, reading the increment, the spec objects it names (obligations, pages, extras),
     the plants recipes under `src/server/app/sets/high-risk-plants/docs/` and, for
     `same-as-animals` / `variant-of-animals` items, the animals feature it mirrors. Each
     writes `title`, `repo` (`frontend` | `backend` | `tests` | `both`), `sizeGuess`,
     `filesToTouch` (path + create|edit), `acceptanceCriteria` (verbatim from the spec's
     mandate, activatedBy, input and copy, plus the tests it must add), `verification[]`
     (the npm/mvn commands in ladder order) and `openQuestions` into `backlog.json` through
     a script — add `tools/journey-builder/backlog-plan-increment.sh` mirroring
     `backlog-set-status.sh`, never hand-edit. The `frontend-change` skill is the
     implementor for `add-page` / `add-collection`; say so in each such increment's
     `implementorSkill`. Batch the planners ten at a time and verify every write with jq
     before the next batch. Plan the 17 M0 increments first so the run can start while the
     journey pages are still being planned; L1 withholds unplanned ones by design.

**4. Ledger and notes must be tracked.** Done on the workspace branch today: `.gitignore`
negations for `workareas/journey-builder/*/orchestrator-ledger.json`, `PROGRAMME-NOTES.md`
and `logs/batches/`. Confirm with `git check-ignore -v` on each path before the first
batch; L1 reports it on its `owed-to-human` line otherwise.

## Then run it

1. Raise **Dynamic workflow size** in `/config` — one increment is 22 to 46 agents.
2. Confirm the board statuses: `tools/jira/transition-ticket.sh EUDPA-409 --list`. Expect
   `In Progress` and `Done`.
3. Stack up for the fit and e2e legs: `tim docker dev`.
4. Open a fresh session and paste `.claude/workflows/batch-orchestrator/L0-TOP-ORCHESTRATOR.md`
   with this PARAMETERS block:

```
<workspace-tilde>  ~/git/defra/trade-imports-workspace
<workspace-abs>    resolve it (L0 step 0)
<workarea-rel>     journey-builder/EUDPA-409
<workarea>         <workspace-tilde>/workareas/journey-builder/EUDPA-409
<backlog>          <workarea>/backlog.json
<ledger>           <workarea>/orchestrator-ledger.json
<branch>           main
<scope>            high-risk-plants
<executor>         claude
<lifecycle>        full
<jira-project>     EUDPA
<epic>             EUDPA-407
<in-progress>      In Progress
<done-status>      Done
<batch-size>       3
```

Start with a batch size of 3: the M0 hygiene increments are cheap but each one is a CI wait,
and the first journey increments (dashboard, hub, commodity-type) are wide. Raise to 5 once
L1 finishes batches with headroom.

## What will stop the run, by design

- The first feature increment trips `copy-convention.test.js` and `copy-parity.test.js`;
  the restore increments right after it fix that. Expect one red ladder there if the
  planner did not fold the restore into the same increment — L1's `premise-invalidated`
  path handles it, and the notes tell it why.
- Three gated extras at the end: `backend-reference-prefix` (needs the plants type code),
  `country-block-decision`, `chrome-placeholders-and-service-name`. Rule them when the loop
  halts; `backlog-set-status.sh` lifts the block.
- A tests-repo `e2e` increment needs the plants frontend deployed or the stack running the
  branch image; the docker-compose config needs a `plants` base URL (port 3003) added by
  `e2e-plants-project-scaffold`, which comes before the first section spec.

## Rulings are changed through the ledger, never by editing

`tools/journey-builder/spec-add-decision.sh EUDPA-409 --subject <conflict:c-NNN |
behaviour:id> --ruling ... --resolution ... --rationale ... --decided-by sam --decided-at
YYYY-MM-DD --supersedes d-NNN`. Then `spec-set-field.sh` / `spec-set-page.sh` for the spec
change it implies, `spec-lint.sh EUDPA-409 --format`, format through
`npx --yes npm@11.6.2 --prefix <worktree> run format`, commit on the spike branch (the
pre-commit hook runs format, lint and the unit suite), regenerate the backlog.

## Rails

- Parent orchestrates, never implements. Subagents get a GUARD RAILS block: one Bash
  command per call, `~/` paths, no chains, no `cd`, no `sonar`, no bare `node`, no
  `python`.
- A modified `tools/` executable is blocked by a hook until committed — commit before
  running, and never edit a script that running subagents are calling.
- Verify every subagent claim yourself. Read test output from a file once.
- Report progress as N of TOTAL (P%) with the todo/deferred split.
