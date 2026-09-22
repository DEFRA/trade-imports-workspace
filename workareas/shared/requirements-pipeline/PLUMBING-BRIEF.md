# Summary of the overnight run (21–22 September 2026)

**All four jobs are done and proved. Raised as PR #56.** Decisions, each with how to reverse it, are in
`DECISIONS.md` beside this brief.

## What was done

| Commit | Job | What |
|---|---|---|
| `60d9316c` | 1 and 4 | The one backlog shape, `docs/reference/backlog-shape.md`. `tim backlog check` (shape, dependencies, cycles, refuses `filesToTouch`/`verification`/`recipe`/`implementorSkill`), `tim backlog next` (build-orchestrator's derive query as a tested command) and `tim backlog set` (status, commit, ticket, branch, notes, open questions, PRs) |
| `267cbf7e` | — | Formatting only: tim files an earlier commit left unformatted |
| `2dc0596d` | 3 | `increment-build-loop.js`: frontend-alignment's plan stage lifted in (`plans/<id>.md`: decisions, moves, edits, new files, tests with the integration proof, a check per acceptance criterion, the ladder, out of scope). Implement executes the plan; the ladder runs the plan's ladder; the recipe rules are gone. Reviewers still read the `review` and `code-style` skills live by path. The Codex briefs read the same plan. Every backlog write goes through `tim backlog set`. New required arg `planOnly`. build-orchestrator derives with `tim backlog next` |
| `17de85b4` | 2 | The `distil` skill, and its proof run |

tim is green at `2dc0596d`: 149 test files, 1,963 tests, lint clean.

**The proofs.**
- **Distiller:** a mix of three CHED-PP trace pages and the high-risk plants Confluence requirements page. The
  run went: 53 claims, then verification (2 refuted, 7 missed claims added), then 26 requirements and 7
  conflicts (5 questions, each with a default), then 4 full-stack increments. `tim backlog check` passes, and
  every adopted requirement is in exactly one increment. See `proof/hrp-origin/report.md`, which leads with the
  questions.
- **Builder:** the loop ran with `planOnly: true` over `inc-001` against the plants repos. It found the row's
  premise partly wrong (the origin page already exists), planned against reality, and planned one slice across
  backend, frontend and tests with the integration proof in the tests repo. See `proof/hrp-origin/plans/inc-001.md`.
  It took 3 agents and 13 minutes.

## How to use them now

Everything is one skill, `.claude/skills/requirements-pipeline/` (D17): `SKILL.md` says which phase to use and
what is coupled to what; `references/SHAPE.md` is the backlog shape; `references/DISTIL.md` and
`references/BUILD.md` are the two phases; `workflow/` holds the loop, its README and the Codex briefs.

- **Distil:** say "distil these sources into a backlog" and name them. The DISTIL phase
  (`references/DISTIL.md`) writes `workareas/shared/<programme>/sources.json`, then extracts, verifies,
  reconciles, consolidates, and writes `backlog.json` and `report.md`. Read the report's questions first.
- **Build:** say "orchestrate the build" with the workarea. The BUILD phase (`references/BUILD.md`) launches
  `Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })`. To
  see how one increment would be built without building it, run the loop with `planOnly: true`. Codex mode:
  `executor: 'codex'`, from the same backlog, unedited.

## Waiting for Sam

1. **Codex mode was not run live.** Codex is logged in; it needs a real increment. The plan stage runs on
   Claude in both modes (D5).
2. **`lifecycle: local` is fixed on this branch.** Baseline used to refuse a repo on the base branch, and land
   demanded HEAD be the work branch but stopped if it printed the base branch — the same string under local.
   Under local both stages now require every repo to be on the branch the run was given and refuse `main` or
   `master`, and a non-planOnly local run refuses `branch: main|master` before any agent starts. Full is
   unchanged. The closed PR #44 idea was ported, not its branch. Not yet run live past baseline.
3. **The harness refuses a subagent writing a report file** ("subagents should return findings as text").
   The DISTIL phase now has the report agent return its text for the main session to save. Other files write
   fine.

## The exact next step

Pick a real programme and run the DISTIL phase on its sources, then build its first increment with the
BUILD phase under `lifecycle: full` and `requireApproval: true`. That is the first end-to-end run of the
fixed loop past planning.

---

# Brief: plumb the existing distil and build pieces together

**What Sam wants:** loose requirements from anywhere go into **one `backlog.json` shape**, and the
existing builder workflow works through it. Sources can be Playwright traces, Confluence pages,
another repo, documents, or anything else, combined, cross-referenced and consolidated into a
coherent plan.

**This functionality already exists in pieces. The job is to take the best bits, plumb them
together, and move deterministic steps into tim.** Do not design a new system. Keep each change
small, and commit each one on its own.

## Ignore these

The earlier session over-built. Do **not** follow `design/DESIGN.md`, `design/RESCOPE.md`,
`design/backlog.json`, `build/bootstrap-build.js` or `build/HANDOVER.md`. They are a record of
what not to do.

`analysis/00-synthesis.md` is useful. It is a map of every existing piece, with file:line
citations, and of where the joins are broken. Read §1, §2 and §5.

## What exists

**Distil:**
- the trace-to-requirements workflow: `workareas/trace-requirements/*/trace-to-requirements.workflow.js`.
  It does extract, adversarial verify, reconcile, conflicts and a backlog, and it has run four times.
- the journey-builder DIGEST mode and personas: `.claude/skills/journey-builder/`, and
  `tools/journey-builder/`. These are the source extractor, the reconciler and a conflicts
  ledger. They take Confluence, documents, images and repos.
- parity's author-and-verify pipeline, with coverage, slices, yield and duplicates:
  `.claude/skills/parity/`, and `tim parity`.

**Build:**
- `.claude/workflows/increment-build-loop.js`, driven by the `build-orchestrator` skill. It has
  review, verify, judge, fix, ladder and land stages, plus a Codex executor (`codex/*.md`).
- The frontend-alignment workflow (branch `feat/NO_JIRA-frontend-alignment`) has the good
  just-in-time **plan stage**.

**tim backlog** (kept from the earlier session, tested, on this branch):
- `ingest`
- `set` and `note`
- `state`
- `registry list/show`
- `standards` (which rules and best-practice files apply to a file)
- `rule`, `question check-page`

It also includes a strict format with a dependency graph. Use what helps, and don't feel bound
by it.

## The job

1. **One backlog shape.** Use the shape the loop and build-orchestrator already read (`id`,
   `title`, `detail`, `dependsOn`, `status`, and so on). Drop the recipe fields: `filesToTouch`,
   `verification`, `recipe`, `implementorSkill`.
   - An increment says **what, why and acceptance**. The builder works out how.
   - Increments are **full-stack slices** across every repo they need. They are never split
     into backend, then frontend, then tests.
2. **The distiller is one skill over the existing pieces.** It accepts any mix of sources,
   extracts with provenance, cross-references and reconciles them, records conflicts and open
   questions, then does one **consolidate step**. That step turns small requirements into sensibly
   sized increments, so the build overhead stays low. The output is that one shape, plus a short
   decision-led report: the questions that need Sam come first.
3. **The builder is the existing loop, fixed so it treats a row as a requirement.**
   - Lift frontend-alignment's plan stage into `increment-build-loop.js`.
   - Remove "filesToTouch IS the script" and the literal `verification`-command ladder.
   - Review must keep reading the workspace `review` and `code-style` skills live, by path.
   - Claude and Codex modes must both keep working from the same backlog.
4. **Deterministic steps into tim,** where they help: the next buildable increment, setting
   status and commit, and validating the backlog shape. Any step a model is doing mechanically
   today is a candidate.

## Sam's rules (they are in memory as well)

- Scope with sense. Plumbing, not a platform. A mechanism earns its place only against a failure
  that has actually happened.
- Never backport, and never migrate other programmes' work.
- Codex is available, not preferred.
- No pushes, PRs or merges: Sam does those.
- **Bash rails:**
  - one command per call; no `&&`, `;`, `|` or `cd`;
  - tilde paths in Bash, absolute paths in the Read, Write and Edit tools;
  - no Grep or Glob tools;
  - never bare `node`, never `sonar`.
- tim's own rails are in `tim/CLAUDE.md`.
## Work autonomously (Sam is asleep)

**Never stop to ask Sam, and never wait for approval.**
- When a choice comes up, decide it, record it in `DECISIONS.md` beside this brief, and keep going.
  Each entry gets one line for the choice and one line for how to reverse it.

**Stay on the rails. They replace the check-ins:**
- **Only the four jobs above.** Before each change, ask yourself: "Is this joining existing pieces
  together, or building a new one?" If it's a new piece, don't build it; note it in `DECISIONS.md`
  as a suggestion instead.
- **Small commits, one per job or sub-step.**
  - Every commit keeps `npm --prefix ~/git/defra/trade-imports-workspace/tim test` and `run lint`
    green, if tim changed.
  - Read each log once.
  - Nothing is ever "pre-existing".
- **One review per job.** Review the diff against the workspace `review` and `code-style` skills,
  reading their SKILL.md and persona files by path. Fix what matters, then commit.
  - Do not stack up panels, critics or audits: that is how the last session went wrong.
- **Use Workflow only for genuine fan-out,** for example reviewing many files at once. Plain editing
  work is done directly.
- **Prove it works.**
  - Run the distiller on one small real mix of sources, for example one of the
    `workareas/trace-requirements/` source sets plus a Confluence page or a doc. It must produce a
    valid backlog in the one shape.
  - Run the fixed loop's plan stage over one of those increments, as a dry run up to planning.
  - Do not build product increments.
- **If you hit something only Sam can decide, or something you cannot unblock:** park it in
  `DECISIONS.md` under "Waiting for Sam", then carry on with everything else.

**When you finish, or when you are near a usage limit,** write a summary at the top of this brief:
- what was done, with commit shas;
- how to use the distiller and the builder now;
- what is waiting for Sam;
- the exact next step.

Then stop.

## State

- **Branch:** `chore/NO_JIRA-requirements-pipeline` in the workspace repo. Nothing is pushed.
- **tim is green:** 141 test files and 1,740 tests at `c8fa505f`, lint clean.
- **inc-003 is already done.** The loop takes its config from Workflow `args` only, with a
  contract test.
- **Two stashes hold unfinished work.** Read them only for reference, and never pop either whole:
  - "inc-001 partial": tim PR and CI commands, mixed with old-loop backports.
  - "inc-011 partial": a check that refuses backend-then-frontend-then-tests splits.
