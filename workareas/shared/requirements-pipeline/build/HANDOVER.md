# Requirements pipeline: handover (paused 19 September 2026, Claude usage limit)

## Where things are

- **Branch:** `chore/NO_JIRA-requirements-pipeline` in the workspace repo. Nothing is pushed and
  there is no PR.
- **Committed:** the analysis (`7b192dd5`), the corrected design (`e3d95b57`) and the stage
  consolidation (`3c4bb2b9`).
- **The design is final.**
  - `design/DESIGN.md` is the design.
  - `design/backlog.json` is this programme's own two-pass backlog: 135 atoms and 42 increments,
    39 of them live.
  - `design/decisions-for-sam.md` holds the six questions. One must be answered; five have
    defaults in force.
- **Sam's hard requirements** R1 to R8 are in `analysis/sam-requirements.md`.
- **The build has started, through the bootstrap workflow** `build/bootstrap-build.js`. The new
  pipeline cannot build itself yet.
- **tim baseline before any increment:** 109 test files, 1,215 tests, lint clean.

## In flight: inc-003 (the canary)

The run `wf_756a8d26-4c7` was stopped part-way, by hand, before the usage limit. Its work is
**uncommitted in the tree**. Leave it there:

- **Edited:**
  - `.claude/skills/build-orchestrator/SKILL.md`
  - `.claude/workflows/README.md`
  - `.claude/workflows/increment-build-loop.js`
  - `.github/workflows/tim-ci.yml`
  - `tim/package.json`
  - `tim/package-lock.json`
- **New:**
  - `.claude/workflows/args-canary.js`
  - `tim/src/backlog/`
  - `tim/src/test-support/workflow-runtime.js`
  - `tim/src/test-support/workflow-runtime.test.js`

Everything else untracked under `workareas/shared/` belongs to other work. Never stage it.

**Resume** it exactly (the script is unchanged since that launch, so finished stages replay from
cache):

```
Workflow({ scriptPath: "/Users/samfarrington/git/defra/trade-imports-workspace/workareas/shared/requirements-pipeline/build/bootstrap-build.js",
           resumeFromRunId: "wf_756a8d26-4c7",
           args: {"increments": ["inc-003"], "trailer": "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"} })
```

If the resume cannot find the run, relaunch with the same args and no `resumeFromRunId`. The
planner will re-plan against the partly built tree.

## Next, once inc-003 lands

1. **Mark inc-003 done in `design/backlog.json`.** The main session does this with jq, because the
   tim writer does not exist yet. Record its sha.
2. **Apply lesson L1** (`build/lessons.md`) to later runs. Add this line to the planner prompt in
   `bootstrap-build.js`, just before "Read the live code you will change": "Read
   ${P_ABS}/build/lessons.md and apply every lesson that names this increment."
   - It was reverted only so the resume above would replay from cache.
3. **Run the writer-core batch in dependency order:** inc-001, inc-002, inc-004, inc-005, then
   inc-006, inc-007, inc-009, inc-011, then inc-008, inc-012. Keep each launch to at most about
   eight increments, because of the 1,000-agent cap.
4. **After every batch:** mark statuses, append deferred findings to `build/deferred.md`, and check
   the landing (`git log`, a green tim suite).

## Calibrations already made to the bootstrap

- **The plan audit** allows up to four rounds and splits blocking objections from notes. Notes go
  to the implementer (lesson L1).
- **The manifest** ignores `build/`, so plans and logs are never reviewed as code.
- **A dead reviewer or a dead judge stops the increment.** A dead verifier keeps its findings as
  unrefuted.

## Owed to Sam (not blocking yet)

These are in `design/decisions-for-sam.md`, "Owed to you":
- the `/config` Dynamic workflow size setting
- the Read hook before inc-019
- guard-edits protecting the receipts before inc-014
- accepting commits made without `sonar analyze --staged`
