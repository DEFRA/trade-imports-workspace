# C: build-orchestrator, and every other thing that drives a backlog

Analyst C. Scope: `.claude/skills/build-orchestrator/SKILL.md` and everything it drives
(`.claude/workflows/increment-build-loop.js`, `codex/*.md` briefs, the run copy), the
journey-builder BUILD mode and its `tools/journey-builder/*` scripts, the EUDPA-409 plants
run's recorded state, and a side-by-side against the frontend-alignment drain loop on
`feat/NO_JIRA-frontend-alignment`.

Read-only. All citations are `file:line` on `main` at d07af6b9 unless a branch is named.

---

## 1. The short answer

- **Three live drivers, plus two dormant ones.** A backlog can be driven today by
  (a) build-orchestrator (main session) → `increment-build-loop.js` (one increment per
  Workflow call); (b) journey-builder BUILD mode (main session) → `next-increment.sh
  --claim` → `frontend-change` subagent → `verify-increment.sh` → `commit-increment.sh` /
  `rollback-increment.sh`; (c) `frontend-alignment.js`, which drains its own `stages.json`
  *inside* one Workflow run and needs no outer driver. Dormant: the removed two-tier
  "batch-orchestrator" (still in `.gitignore:115-119` as `orchestrator-ledger.json` and
  `logs/batches/`), and a Codex-as-orchestrator handover prompt (plants snagging
  `HANDOVER-CODEX.md`, on branch `chore/NO_JIRA-plants-snagging-workarea`), which reproduces
  the loop's stages by hand in Codex.
- **Only (a) has actually been used for real multi-increment programmes recently**
  (EUDPA-409 plants: 57 done; plants snagging: 3 done). (b) is effectively superseded
  — PROGRAMME-NOTES.md for EUDPA-409 says so explicitly (`PROGRAMME-NOTES.md:102-110`) —
  but its SKILL.md still describes it as *the* build loop and its scripts are still the
  ones Sam's memory names as "the consumer of the backlog shape".
- **Buildability is derived three different ways**, with three different status
  vocabularies and three different `gate` semantics (section 5).
- **The best idea in the whole family is already written down** in build-orchestrator:
  "Buildability is status and dependencies. Nothing else." / "The backlog says what is
  wrong … working out what to change is the implementor skill's job" / "Thin is fine; wrong
  is not" (`build-orchestrator/SKILL.md:131-153`; mirrored in the loop's `readIncrement`,
  `increment-build-loop.js:666-680`, and `codex/implement.md:47-62`). **The rest of the
  estate contradicts it**: the loop's ladder, reviewers and ticket stage read planning
  fields (`verification`, `acceptanceCriteria`, `filesToTouch`, `kind`) as if they were
  mandatory; journey-builder's planner writes a file-level plan *into the backlog*; and two
  stale comments still claim a missing `sizeGuess` withholds an increment.
- **frontend-alignment gets the requirement/recipe split right structurally**: the backlog
  entry is a `brief` + `reference[]` + `ladder` (script names) + optional `ruling`; the
  *workflow* runs a Plan stage (Opus) that writes `plans/<id>.md` — outside the backlog —
  and the implementor executes that. That is exactly the "backlog is a requirement, the
  workflow owns the implementation" shape Sam wants. The increment-build-loop has no plan
  stage; it expects the plan to already be in the backlog, or the implementor to derive it
  silently.

---

## 2. How "drive a backlog" works end-to-end today (build-orchestrator path)

### 2.1 Tiers

```
main session (build-orchestrator skill)
  ├─ derive next id            jq over backlog.json            SKILL.md:125-127
  ├─ cp loop → run copy        workareas/<wa>/build-loop.run.js SKILL.md:166-168
  ├─ Edit FALLBACK in copy     one id, full repos table         SKILL.md:174-205
  ├─ Workflow({scriptPath})    one increment                    SKILL.md:213-218
  │     └─ increment-build-loop.js: workspace → preflight → Ticket → Branch → Baseline →
  │        Implement → Review(2n+1) → Verify findings → Judge → Fix → Ladder → Land →
  │        PR → CI(+fix×3) → Merge(approval gate) → Done → gate check
  ├─ check it landed           jq status/commit/prs            SKILL.md:222-237
  ├─ sweep DEFERRED: lines     jq + grep, append increments     SKILL.md:239-261
  └─ one-line report, loop     then handover prompt at a stop   SKILL.md:263-363
```

Why only one tier: "a subagent cannot invoke the `Workflow` tool" (`SKILL.md:12-25`;
`.claude/workflows/README.md:7-11`). The loop's `agent()` calls are the context death
boundary; the orchestrating session only absorbs return values. **Keep this reasoning** —
it is correct and hard-won, and any new "implementor skill" must respect it (the skill runs
in the main session; the Workflow is the fan-out).

### 2.2 The run-copy patching mechanism

- `args` plumbing is "unreliable", so the decisive config is the `FALLBACK` const
  (`increment-build-loop.js:25-27, 90-111`; `SKILL.md:163-164`). `CFG = args if
  args.increments else FALLBACK` (`increment-build-loop.js:111`).
- The orchestrator copies the tracked loop to `workareas/<wa>/build-loop.run.js` **before
  every increment** and replaces the whole `FALLBACK` with Edit (`SKILL.md:166-201`), and
  must "never edit the tracked loop" (`SKILL.md:160-161, 404`). Run copies are gitignored
  (`.gitignore:97`).
- **Evidence the mechanism drifts anyway**: the EUDPA-409 run copy on disk is *older* than
  the tracked loop — `git diff --no-index` shows it lacks the resumable Codex slicing
  (tracked `:744-772`), the "page added breaks the preceding spec" and "DEFERRED:" rules
  (`:1131-1142`), the `<baseBranch>/<frontendRepo>/...` bindings (`:736-740`), and the
  ladder's framework-assertion exception (`:1405-1415`); it still has the old
  `run_in_background` Codex step. Fine for a finished run, but it proves the copy is a
  snapshot of whatever the loop was when the last increment ran, and a handover that resumes
  "from the run copy" would silently use old behaviour.
- **Two programmes have needed loop behaviour the tracked loop didn't have, and patched the
  loop in a branch instead**: plants snagging put a `lifecycle: local` fix + `commitTrailer`
  config into `increment-build-loop.js` on `chore/NO_JIRA-plants-snagging-workarea`
  (workspace PR #44, unmerged). On `main` the baseline guard still refuses any repo on
  `BASE_BRANCH` unconditionally (`increment-build-loop.js:1076-1079`) and land step 2 still
  asserts the repo is on `workBranch` (`:1463-1467`) — with `lifecycle: local`,
  `workBranch === BASE_BRANCH` (`:853`), so on `main` those two assertions contradict each
  other and **local lifecycle is broken on main** (memory
  `reference_build_loop_local_lifecycle_snagging.md` records the fix; it never merged).
  The commit trailer is hard-coded as "Claude Opus 5 (1M context)" (`:1472`).

### 2.3 The config surface (what a run needs)

`workarea, branch, scope, executor, lifecycle, jiraProject, epic, jiraInProgressStatus,
jiraDoneStatus, jiraBoard, ciFixAttempts, ciWatchMinutes, requireApproval,
approvalWaitMinutes, repos{frontend,backend,tests}{path,github}, models{heavy,light},
increments[]` (`increment-build-loop.js:28-78, 90-111`; `SKILL.md:31-59`). Validated with
loud throws (`:137-204`). **Note**: every one of these is programme-level, not
increment-level — they belong in a backlog *header*, which is exactly what
frontend-alignment's `stages.json` has (`branch, repos, ladder, reviewCap, ciWatchSeconds,
ciFixAttempts, direction, invariants, rulings, workspacePr, ...`). build-orchestrator
instead keeps them in the handover prompt and in `PROGRAMME-NOTES.md` prose
(`EUDPA-409/PROGRAMME-NOTES.md:112-123`: "Write `requireApproval: false` into every run
copy's FALLBACK"). That is a human-memory channel for machine config.

### 2.4 Landing and resumption

- The loop persists `ticket`, `branch`, `prs[]`, `commit` on the increment as soon as each
  exists (`:901-902, 929-931, 1475, 1545-1548, 1666-1668, 1794-1795`), and the Ticket stage
  derives `resumeAt ∈ {build, pr, ci, done}` from those fields only — "never derive it from
  the ticket's status" (`:938-946`). **Keep**: idempotent resume from persisted lifecycle
  facts is the single most robust part of the loop.
- Under `full`, `status: "done"` is written only by the Done stage after merge + base green
  + ticket transition (`:1862-1878`); under `local`, by Land (`:1475`).
- A failed attempt never sets a status. It pushes a `wip(...)` commit to the increment
  branch (full) or stashes (local) and appends an "ATTEMPT FAILED" note
  (`:370-406`). The run stops (`break`) on ladder-red, ci-red, merge stops — **but
  `baseline-red` and `implement-failed` use `continue`** (`:1092, 1170`), so a multi-id
  list would carry on past a failed implement. Masked today only because the orchestrator
  passes one id.
- The orchestrator's landed check reads `status + commit + prs` (`SKILL.md:227`) and stops
  on anything not `done`. Good: "Do not trust the workflow's report on its own."

### 2.5 Stop conditions and the handover prompt

Nine named stop reasons (`SKILL.md:279-289`) that map onto the loop's `outcome` /
`stopReason` enum (`increment-build-loop.js:655-660, 1826-1832`). `awaiting-approval` and
`changes-requested` are explicitly "not a failure" (`SKILL.md:302-326`). The handover prompt
(`SKILL.md:340-363`) is the whole resumption mechanism — "there is no ledger and no session
state, because `backlog.json` and git already hold everything". **Keep** the handover
prompt idea and the stop taxonomy, but note the prompt re-types 13 config fields that should
be in the backlog header, and the "Owed to a human" line is free text.

### 2.6 DEFERRED sweep (step 3b)

Stages mark omitted work as `DEFERRED: <what>` on its own line (`:1141-1142`; codex
`fix.md:28-29`); the orchestrator greps the result, checks `backlog.json` for an existing
todo covering it, and otherwise appends a new increment with a fresh id, `dependsOn` the
surfacing increment, and a `notes` line (`SKILL.md:239-261`). **Keep the principle**
("work that exists only in a stage's prose is work that will be lost"). **Problem**: it is
the only place the implementor phase writes *requirements* back into the backlog, it does
it by hand-Edit with no tool, and the appended increment's shape is unspecified (what goes
in `title`/`detail`? is it a requirement or a note?). Meanwhile the judge writes deferred
findings into `openQuestions` (`:1337-1340`) — a second channel for the same thing — and
the codex implementor is told the opposite: "**Never edit `backlog.json`** … describe it
fully in `notes` … The orchestrator writes it in" (`codex/implement.md:107-111`), while the
Claude implementor prompt has no such rule. Three channels, three rules.

---

## 3. How Claude vs Codex is chosen

- One switch: `executor: 'claude' | 'codex'` in the patched FALLBACK
  (`increment-build-loop.js:32-33, 115, 147-149`). Per run, changeable *between*
  increments only (`SKILL.md:386-389`).
- Codex takes **implement, review, fix** only (`:1100-1101, 1247-1249, 1359-1371`).
  Ticket/branch/baseline/verify-findings/judge/ladder/land/PR/CI/merge/done stay Claude
  (`README.md:77-80`). Codex review is **one** reviewer applying all three personas, not
  the 2n+1 fan-out (`README.md:94-96`) — so codex mode is a materially *different review*,
  not the same review on a cheaper engine. The CI fixer (`:1610-1675`, heavy) is always
  Claude even in codex mode, although it is token-heavy.
- Mechanism: a shell agent writes a resolved prompt file, runs `codex exec --output-schema
  … -o lastmsg` in ≤5 foreground slices with `resume <session>` (`:715-788`), reports only
  *transport*; a relay agent re-emits the last message as structured output (`:790-804`).
  A null from either throws for review/fix (`:820-825`) so "a crashed reviewer must never
  read as approval". **Keep** the shell/relay split and the throw-on-null rule; they are the
  right answer to "Codex looked and found nothing" vs "Codex died".
- The briefs (`codex/*.md`) are placeholder-bound (`:729-740`) and each opens by telling
  Codex to ignore the Claude-only GUARD RAILS. **Keep**.
- There is a *fourth* executor arrangement in the wild that the skill doesn't know about:
  Codex as the **orchestrator** (plants snagging `HANDOVER-CODEX.md`), which re-describes
  the loop's 12 stages in prose for Codex to run with its own subagents. It worked
  (snagging completed), but it is a hand-written fork of the loop.
- frontend-alignment has **no executor switch**: model per phase is fixed
  (`fa.js:95-97`: think=opus, doer=sonnet, watcher=haiku). It has a better *model* policy
  (explicit think/do/watch tiers, the planner on Opus) but no Codex path at all.

So "claude-only vs claude-driving-codex" exists only in increment-build-loop, only at stage
granularity, and only for three stages. The new implementor skill should make the executor
a property of the **stage role** (planner / implementer / reviewer / fixer / CI-fixer) with a
single binding table, not a single `executor` flag.

---

## 4. journey-builder BUILD mode and its scripts

`journey-builder/SKILL.md:160-176`:

1. `next-increment.sh EUDPA-X --claim` pops "first runnable todo (deps done)" and sets it
   `inprogress`; exit 3 = dry.
2. `gate: "sam"` or closes a milestone → STOP **before** building.
3. Invoke the target's `implementorSkill` (`frontend-change`) with `type` as mode.
4. Parent re-verifies with `verify-increment.sh`; mismatch → rollback + failed.
5. Halt on 3 consecutive failures.
6. `--e2e` per completed section; full E2E + Sam walk-through per milestone.

Script facts:

| Script | What it does | Problems |
|---|---|---|
| `next-increment.sh` | selects `status == "todo"` whose `dependsOn` all `done` (`:26-32`); `--claim` sets `inprogress` (`:46`) | Run-id must match `EUDPA-*` (`:16`) and path is hard-coded `workareas/journey-builder/$RUN_ID/backlog.json` (`:23`) — cannot drive `shared/*`, `trace-requirements/*`, or `plants-snagging`. `.dependsOn[]` (`:30`) errors on a null/absent `dependsOn`. Allow-list (`todo` only) is the *opposite* philosophy to build-orchestrator's deny-list (see 5.1). |
| `backlog-set-status.sh` | enum `todo\|inprogress\|done\|failed\|blocked\|dropped` (`:2, 28-31`); `failed` needs `--reason` and auto-blocks *direct* todo dependants with `failure_reason` (`:45-54`) | Rejects `merged-into`, `deferred`, `rejected`, `paused`, `disputed` — every status other programmes actually use. Same EUDPA-*/path lock (`:17, 34`). Transitive dependants are not blocked. |
| `backlog-counts.sh` | counts by milestone × status (`:24-35`) | Needs `milestone`; same path lock. build-orchestrator uses its own inline jq instead (`SKILL.md:368`). |
| `commit-increment.sh` | stages `TARGET_COMMIT_PATHS` in the **spec worktree** and commits, then marks done (`:31-45`) | Commits onto the `spike/<run>-spec` worktree, not a work branch; no ticket, no PR. Hard-coded trailer "Claude Fable 5" (`:42`). `commitPaths` is irrelevant under the loop (PROGRAMME-NOTES `:102-110`). |
| `rollback-increment.sh` | `git checkout --` + `git clean -fd` over commit paths, mark failed (`:32-35`) | **Violates the workspace's non-destructive rollback rule** — the loop's GUARDRAILS say "Rollback is ALWAYS `git stash push -u` — NEVER `reset --hard` or `clean -fd`" (`increment-build-loop.js:324`) and memory `feedback_build_loop_rollback_non_destructive.md`. |
| `verify-increment.sh` | runs the target profile's `unit/format/lint[/e2e]` npm scripts in the worktree (`:49-57`) | **The best ladder design in the estate**: the ladder is *target data* (`targets.json`), not per-increment text. The loop instead reads a per-increment `verification` array of full Bash commands. |

**Verdict on BUILD mode**: it is the original, prototype-era driver. The build-orchestrator
path replaced it for real programmes but journey-builder's SKILL.md was never updated to say
so — the description (`SKILL.md:3`) still advertises "build mode pops one increment at a
time … commits or rolls back", and CLAUDE.md's skill routing table lists **neither**
`journey-builder` nor `build-orchestrator` (only `frontend-change`, `parity`, etc.), so an
agent routed by trigger phrase has no pointer to the live driver. What BUILD mode has that
build-orchestrator lacks and is worth salvaging: (i) the **gate-before-build** check,
(ii) the **3-consecutive-failures** systemic halt, (iii) **section-/milestone-level E2E and
walk-through checkpoints**, (iv) the **target-profile ladder**.

---

## 5. Where the drivers disagree about backlog shape and status

### 5.1 Buildability

| Driver | Rule | Direction |
|---|---|---|
| build-orchestrator | not in `["done","deferred","dropped","blocked","rejected","merged-into"]` AND every `dependsOn` is `done`; first in array order (`SKILL.md:126`) | **deny-list** — unknown status is *buildable* "so it fails loudly" (`:131-136`) |
| journey-builder `next-increment.sh` | `status == "todo"` AND deps done (`:29-30`) | **allow-list** — unknown status is silently never built |
| frontend-alignment | baseline agent classifies: `todo`, `ci-retry`, `e2e-retry` are to-build; `done` done; `ci-red / ladder-red / implement-failed / e2e-red / sync-blocked` are "problems" that fail the baseline (`fa.js:537-544`); **no dependsOn at all**, file order only | allow-list, LLM-evaluated (not jq) |

Consequences of build-orchestrator's deny-list against real vocabularies:

- `inprogress` (journey-builder `--claim`) → buildable. Harmless-ish.
- `failed` (journey-builder rollback) → **buildable**. The deny list omits it; an
  increment rolled back by `rollback-increment.sh` would be re-picked immediately.
- `paused` (plants snagging, README "first increment whose status is `todo` or `paused`")
  → buildable. Intended there.
- `disputed` (parity, `parity/SKILL.md:107`) → buildable. Almost certainly wrong.
- `merged-into` was **added by hand** after combining increments (commit fe5ed046; memory
  "`merged-into` is now in the skill's withheld-status list"); the combination proposal
  itself flags that without it "the absorbed increments will be picked up and built on
  their own" (`combination-proposal.md:84`). So every new status must be hand-added to a
  jq string inside a SKILL.md. That is the "fails loudly" philosophy biting.

**Dependency semantics disagree too.** A dependency counts as satisfied only when `done`
(both jq queries). So `dropped` and `merged-into` dependencies never satisfy: parity's
`rule-decision.sh falsified` has to *strip* the dep and leave a note (`rule-decision.sh:73,
95`), and the combination recipe has to *rewrite* dependants onto the survivor
(`combination-proposal.md:83`). There is live residue: `inc-034` (`merged-into`) still
`dependsOn: ["inc-033"]` (also `merged-into`) — harmless only because both are withheld.
`inc-049` has `status: "merged-into"` with `mergedInto: null` (checked with jq): a dangling
merge whose survivor is not recorded.

### 5.2 Status vocabulary actually in use (all backlogs under `workareas/`)

jq over all 14 `backlog.json` files plus `stages.json`:

| Source | Statuses |
|---|---|
| journey-builder scripts (enum) | `todo inprogress done failed blocked dropped` |
| build-orchestrator (withheld list) | `done deferred dropped blocked rejected merged-into` (+ anything else = buildable) |
| parity `rule-decision.sh` | `todo` (accept), `dropped` (reject/falsified), `blocked` (defer); `disputed` in SKILL prose |
| EUDPA-409 (live) | `done blocked dropped merged-into` |
| EUDPA-288 | `done deferred` |
| trace-requirements/* | `todo blocked` (+ top-level `bornBlocked`) |
| plants snagging | `todo paused done` |
| frontend-alignment stages.json | `todo landed ci-red ladder-red implement-failed e2e-red sync-blocked ci-retry e2e-retry done` |

There is no single enum, no schema, no validator. `done` is also overloaded: EUDPA-409
`inc-060` (`country-block-decision`) is `done` with `ticket: null, commit: null` — a
decision resolved without code, indistinguishable by status from a merged build.

### 5.3 `gate` means two different things

- **Gate-before (needs a human ruling before it may be built).** journey-builder:
  "`gate: "sam"`, born blocked" (`backlog-generate.sh:17, 283`); BUILD mode stops *before*
  building (`journey-builder/SKILL.md:166-167`); parity: `accept` clears the gate and
  flips `blocked → todo` (`rule-decision.sh:4-5, 70, 91`). EUDPA-409 PROGRAMME-NOTES:
  "Three extras are born `blocked` with `gate: sam` … They halt the loop when reached"
  (`:69-73`).
- **Halt-after (land it, then stop so a human reviews before dependants).** The loop checks
  `.gate` only *after* landing (`increment-build-loop.js:1907-1922`); build-orchestrator
  documents `gate` as "designed HALT-FOR-REVIEW … The loop lands it, then stops"
  (`SKILL.md:283`; `README.md:106-109`).

Under build-orchestrator the gate-before items are `blocked`, so the derive query never
reaches them — PROGRAMME-NOTES' "they halt the loop when reached" is false: they simply make
the run end `no-buildable`. And the loop's gate check `jq -r .gate` returns ok only on the
literal `null` (`:1912`), so any non-null value (including `""` or `false`) halts. Two
concepts, one field, opposite timing.

### 5.4 Top-level envelope

Five envelopes in use: `{run_id, schema_version, target, increments}` (journey-builder
generated), `{run_id, corpus, target, increments}` (parity), `{run_id, note, increments}`
(EUDPA-288), `{schemaVersion, epic, branches, branchNotes, increments}` (address-book —
camelCase version key), `{brief, source, generated, milestones, bornBlocked, deviations,
scopeExclusions, sequencingNotes, regenerationOf, increments}` (trace-requirements), plus
`{programme, purpose, branch, base, repos, direction, invariants, targetTree, ladder-ish
caps, rulings, workspacePr, stages}` (frontend-alignment). Only frontend-alignment carries
the run's *config* in the header; the rest leave it to prose and handover prompts.

### 5.5 Per-increment fields the loop reads (and whether it should)

| Field | Read by | Treated as |
|---|---|---|
| `id`, `status`, `dependsOn` | orchestrator derive | state/graph — correct |
| `repo` (`frontend\|backend\|tests\|both`) | ticket (`:948-959`), baseline, implement routing (`:1109-1126`), land, preserve | **routing requirement** — fine, but if absent the ticket stage falls back to `band` heuristics (`:950-958`), a parity-era field |
| `title` | ticket summary, branch slug, commit subject, PR title | metadata — fine |
| `kind` | branch prefix fix/chore/feat (`:932-933`) | metadata; only set by the *planner* (`backlog-plan-increment.sh:19-21`), else defaults to `feat` |
| `detail` | implementor via whole-object `jq` | requirement — fine |
| `acceptanceCriteria` | ticket description (`:882-885`), code reviewer (`:1212-1215`), verifier (`:1288`), codex review contract (`review.md:27-32`) | **requirement** — should be mandatory and requirement-level; today optional and, when present, recipe-level (see 6) |
| `filesToTouch` | implementor "IS the script" where no recipe covers (`:1117-1119`), consistency reviewer flags diffs vs list (`:1241-1242`), codex review "scope fence" (`review.md:27-28, 84-87`) | **recipe** — and the reviewers turn it into a contract, so a better implementation that touches a different file gets a finding |
| `verification` | Ladder "run the increment's verification array IN ORDER" (`:1393-1402`); codex fix (`fix.md:45-46`) | **recipe** — exact Bash commands with absolute tilde paths (EUDPA-409 inc-028). If absent the ladder has *nothing to run*; the prompt doesn't define a fallback |
| `recipe` | implementor "read ONLY what the increment's recipe field cites" (`:678-679`) | recipe pointer |
| `notes`, `openQuestions` | whole-object read; judge appends to `openQuestions` (`:1338-1340`) | mixed: notes are 1–6 KB implementation plans in EUDPA-409 |
| `gate` | loop post-land check | see 5.3 |
| `ticket`, `branch`, `commit`, `prs[]` | ticket stage resume (`:866-867, 938-946`) | lifecycle state — keep |
| `absorbs`, `mergedInto` | nobody (human bookkeeping) | combination state |
| `band`, `milestone`, `section`, `page`, `slug`, `obligations`, `type` | implementor/ticket heuristics | descriptors |

`commit` is a string, space-separated for `both` ("919d510 dabfcfd", inc-059;
`increment-build-loop.js:1477`). frontend-alignment uses `commits: [{repo, sha}]`
(`fa.js:341-349`). Snagging adds `testsCommit`. Three encodings of the same fact.

---

## 6. Recipe smells: where the backlog prescribes HOW

The build-orchestrator/loop *philosophy* is requirement-first, but the estate actively
produces recipe backlogs and the loop rewards them:

1. **journey-builder's plan mode writes the plan into the backlog.**
   `backlog-plan-increment.sh:2-31` defines the "plan" keys the loop reads — `filesToTouch
   [{path, action, what}]` ("at least one"), `verification` ("the exact Bash commands the
   loop's verifier runs"), `sizeGuess`, `kind`, `implementorSkill`, `recipe` — and it is
   "the only way the planned fields get in". `INCREMENT_PLANNER.md:73` "The recipe's file
   list is your `filesToTouch`". A planned increment is a recipe by construction.
2. **EUDPA-409 inc-028 is the archetype**: 6 `filesToTouch` entries with line ranges
   ("rewrite … (lines 73-100)", "correct lines 39-42"); 11 acceptance criteria that name
   function signatures, import paths and exact test cases; 5 absolute-path `verification`
   commands; a `notes` field of ~6 KB titled "WHAT IS ALREADY THERE / THE SHAPE TO COPY /
   THE BACK-LINK OVERLAP / … / DEPCRUISE / NOT THIS INCREMENT". It even pre-decides a
   conditional code path ("one of two states greets you … Check first; do not assume (a)").
   That is a plan, written before the preceding increment existed, frozen into state.
3. **Stale "sizeGuess withholds" claims** directly contradict "never narrow the derive query
   to a planning field" (`SKILL.md:407-408`): `backlog-plan-increment.sh:9-11` ("the
   orchestrator withholds any increment whose sizeGuess is null, so this is what makes an
   increment buildable") and `INCREMENT_PLANNER.md:8` ("An increment with no `sizeGuess` is
   withheld from every batch"). An agent that reads the planner first will plan everything
   up front "to make it buildable".
4. **The loop's own prompts read recipe fields as contracts**: implementor "the increment's
   own filesToTouch IS the script" (`:1117-1119`); consistency reviewer flags "anything the
   increment's filesToTouch listed that is NOT in the diff, or in the diff but NOT listed"
   (`:1241-1242`); codex reviewer's #1 concern is "Scope-fence breaches. Anything changed
   that the increment's filesToTouch did not list" (`review.md:84-87`). A planned increment
   therefore *constrains* the implementor and turns every deviation into a finding.
5. **The Ladder has no requirement-level definition**: "run the increment's
   `verification` array IN ORDER" (`:1401`). A thin increment has no array; the verifier
   would have to invent one, and nothing tells it the target's standard ladder. Compare
   `verify-increment.sh` (target-profile rungs) and `stages.json` `ladder: ["format:check",
   "lint","test","test:fit"]` (script names, not commands).
6. **Ticket description** copies `acceptanceCriteria` verbatim into Jira (`:882-896`) — so
   recipe-level criteria (function names, line numbers) become the ticket's AC, which
   contradicts memory "tickets list open questions … ACs stay forward-looking".
7. **Combination copies recipe fields**: "Its `title`, `detail`, `filesToTouch`,
   `acceptanceCriteria`, `verification` and `notes` become the union of the members'
   fields" (`combination-proposal.md:81`) — combining recipes, not requirements, and it
   noted the page increments had no plan so the survivor's notes had to instruct "The
   planner must plan both" (inc-039 `notes`).
8. **Snagging backlog**: `filesToTouch` entries each carry a `repo`, and HANDOVER-CODEX
   step 3 says "Implement per implement.md, following the increment's `filesToTouch` and
   `acceptanceCriteria`".

What *is* requirement-shaped and good: EUDPA-409 extras' `detail` (e.g. inc-028's detail:
the defect, the documented shape to restore, the evidence citation — "Evidence: skeleton
entry-guard-inert (entry-guard.js:1-5; routes.js:62-65 …); behaviour entry-guard"), and
frontend-alignment's `brief` + `reference[]` + `ruling` + "Out of scope" + "Behaviour to
declare" + "End state". Those state WHAT and WHY and point at evidence; the HOW is left to a
planner inside the workflow.

---

## 7. The second-distillation precedent already exists (and is mid-build)

`EUDPA-409/combination-proposal.{md,json}` (2026-09-07) is a concrete, well-argued
**combine related increments** pass — exactly Sam's "second distillation phase" — but run
*during* the build rather than after first distillation:

- Rules (`combination-proposal.md:15`): same repo only; adjacent/near-adjacent in the chain;
  same slice (feature folder, recipe doc, platform seam, or a closer for a placeholder the
  page before opens); still one reviewable PR, ≤16 files as the aim; never two `add-page`;
  nothing touching the copy tripwires; nothing gated/blocked/ruled-to-stand-alone; no
  crossing a milestone; named exclusions. Every rejection is argued
  (`:57-75`, e.g. "a sanitiser red must stay attributable").
- Measured motivation: "the class that has cost 36 to 52 minutes a run so far … the saving
  is five runs of that class" (`:11`).
- Application (`:77-88`): survivor = earliest id, gains `absorbs[]`; absorbed get
  `status: "merged-into"`, `mergedInto`; dependants re-pointed via `dependsOnRewrites`;
  ids never renumbered.
- Honest about fragility: "If the backlog is ever regenerated from the spec, the
  combinations are lost with it" (`:88`) — confirmed: `backlog-generate.sh` preserves only
  `$planned` + status/commit/failure_reason by content key (`:152, 280-282`), not
  `absorbs`/`mergedInto`, re-derives `dependsOn` as a linear chain (`:277`), and
  **renumbers ids positionally** (`:273-277`) — which PROGRAMME-NOTES had to warn about
  ("ids shifted … trust the key or page name, not the number", `:92-100`) and which
  contradicts build-orchestrator's "Do not renumber increment ids. They are bound to
  rulings and citations" (`SKILL.md:409`).

**Keep**: the rules list, the per-candidate argued accept/reject, the "measured cost of a
run" justification, survivor/`absorbs`/`merged-into` bookkeeping, dependency rewrites.
**Fix**: do it once, at distillation time, over *requirements* (union the ACs, not
filesToTouch), and make combination survive regeneration (or stop regenerating a backlog
that has been combined).

---

## 8. frontend-alignment vs build-orchestrator, side by side

| Concern | build-orchestrator + increment-build-loop | frontend-alignment.js |
|---|---|---|
| Who drains | Main session, one Workflow call per increment (`SKILL.md:115-273`) | The workflow itself: `while (!halted)` re-reads `stages.json` each round, so stages appended mid-run are picked up (`fa.js:507-567`) |
| Buildability | jq deny-list + `dependsOn` | LLM baseline agent over status, file order, no deps |
| Planning | none in the workflow; plan pre-written in backlog or silently derived by the implementor | **Plan stage on Opus** writes `plans/<id>.md` (decisions, moves, edits, new files, imports, tests, invariants to prove, out of scope) + returns `reviewFocus` and `behaviourChanges` (`fa.js:683-731, 217-239`) |
| Review scope | every changed file ×2 + consistency (2n+1) | only the planner's `reviewFocus`, capped (`fa.js:782-785`, `reviewCap` in header) — pure moves skip review |
| Ladder | per-increment `verification` commands | per-stage `ladder` npm script names, run per repo (`fa.js:975-1000`) |
| Branching | branch per increment, PR per increment, merge per increment | one shared programme branch, draft PRs, **never merges** |
| Sync with main | none (branch cut off fresh base each increment) | **Sync stage** merges `main` into the branch before every stage, because GitHub runs no checks on a conflicting PR (`fa.js:608-661`) |
| Status | `done` only (+ notes) | rich per-stage lifecycle incl. `*-retry` resume points (`fa.js:537-544`) |
| After CI | merge + ticket done | local E2E against the dev stack, report refresh, record-state commit, workspace-PR E2E |
| Report | none — one line per increment | **report.md** refreshed after every stage; rulings move questions from "open" to "ruled" (`fa.js:1245-1273`) |
| Executor | claude | codex | fixed model tiers, no Codex |
| State writes | Edit of backlog.json | targeted jq on one field with a post-write invariant check: "NEVER assign a whole stage object … a previous run lost a stage's commit SHAs" (`fa.js:150-158`) |
| Config | patched FALLBACK in a run copy | FALLBACK tiny (`fa.js:46-57`); everything else in the `stages.json` header |
| Paths | resolves workspace via an agent (`increment-build-loop.js:219-261`) | hard-codes `/Users/samfarrington/...` ABS (`fa.js:71`) |

What frontend-alignment gets right that the loop should adopt: the **plan-in-the-workflow**,
**reviewFocus**, **header-held config**, **Sync stage**, **self-draining with re-read**,
**targeted state writes with invariant check**, **report refresh as a stage**,
**`*-retry` statuses as explicit resume points**. What the loop gets right that
frontend-alignment lacks: **dependsOn graph**, **Codex executor**, **ticket/PR/merge
lifecycle with approval gate**, **resumeAt from persisted facts**, **portable workspace
resolution**, **DEFERRED sweep**.

---

## 9. Integration gaps (summary list)

1. No shared backlog schema or validator; 6 envelopes, ~15 statuses, 2 gate meanings.
2. build-orchestrator and journey-builder both claim to be "the build loop"; CLAUDE.md's
   routing table lists neither.
3. journey-builder scripts are locked to `workareas/journey-builder/EUDPA-*`, so the
   state-transition tooling (validated enum, auto-block dependants) is unusable by the live
   driver, which hand-Edits `backlog.json` from inside agents.
4. The loop never writes a non-`done` status: a failed increment stays `todo` with a prose
   note. journey-builder writes `failed` + auto-blocks dependants. frontend-alignment writes
   a specific `*-red` status. No agreement on how failure is recorded.
5. Planning lives in three places: journey-builder plan mode (into backlog.json),
   frontend-alignment Plan stage (into plans/*.md, in-workflow), and implicitly in the
   loop's implementor. EUDPA-409 `plans/` (30 JSON files) is gitignored while their content
   is copied into the tracked backlog.
6. Combination is a one-off workarea artefact, not a tool; lost on regeneration.
7. `lifecycle: local` is broken on `main` (fix on unmerged workspace PR #44).
8. Programme config (repos table, requireApproval, models, epic, board) lives in
   PROGRAMME-NOTES prose and the handover prompt, not the backlog header.
9. `.gitignore:115-119` still whitelists `orchestrator-ledger.json` / `logs/batches/` for
   the removed batch-orchestrator; CLAUDE.md rule 3 says only `workareas/shared/` is
   committed, but `.gitignore:39-55` also tracks `workareas/journey-builder/*/backlog.json`
   and `PROGRAMME-NOTES.md`.
10. Merge order: PROGRAMME-NOTES says "backend, then frontend, then tests"
    (`EUDPA-409/PROGRAMME-NOTES.md:15-16`); the loop's `MERGE_RANK` is backend, tests,
    frontend (`increment-build-loop.js:299`). The script wins; the notes mislead.
11. The loop's ticket stage needs `kind` for branch type, which only the planner sets.
12. Codex vs Claude review are different reviews (1 vs 2n+1), so the executor changes the
    quality bar, not just the cost.
13. No systemic-failure halt (journey-builder's "3 consecutive failures") — irrelevant with
    one id per call, but the orchestrator has no equivalent across calls.
14. No report. Sam wants "the report it creates"; build-orchestrator produces one line per
    increment and a handover; frontend-alignment produces report.md.

---

## 10. Best bits to carry forward

1. **"Buildability is status and dependencies. Nothing else"** and **"Thin is fine; wrong
   is not"** (`build-orchestrator/SKILL.md:131-153`; `increment-build-loop.js:666-680`;
   `codex/implement.md:47-62`). This *is* Sam's requirement-not-recipe principle, already
   articulated.
2. **One-tier orchestration** with the Workflow's agents as the death boundary
   (`SKILL.md:12-25`).
3. **Derive one increment at a time, never a pre-committed list** — "A list committed five
   deep throws away everything the first increment teaches" (`SKILL.md:121-123`).
4. **Verify landing from state, not the workflow's report** (`SKILL.md:222-233`).
5. **resumeAt from persisted lifecycle fields only** (`increment-build-loop.js:938-946`)
   and immediate persistence of ticket/branch/prs (`:901-902, 1545-1548`).
6. **Stop-reason taxonomy** with `awaiting-approval` as a healthy pause
   (`SKILL.md:279-326`; `:655-660, 1814-1851`).
7. **Handover prompt** as the whole resumption mechanism (`SKILL.md:331-374`).
8. **DEFERRED: sweep** so prose-only work becomes tracked (`SKILL.md:239-261`).
9. **Codex shell/relay split, sliced foreground runs, throw-on-null**
   (`increment-build-loop.js:682-825`).
10. **Adversarial verify → judge → fix** quality pass (`:1253-1390`), shared with
    frontend-alignment.
11. **Push/branch safety locks** (`--no-track`, fully-qualified refspecs, whole-increment
    approval gate, final open-PR sweep, script-owned merge order) (`:285-364, 1716-1812`).
12. **Target-profile ladder** (`verify-increment.sh` + `targets.json`).
13. **Combination rules and bookkeeping** (`combination-proposal.md:15, 77-88`).
14. From frontend-alignment: **in-workflow Plan stage writing plans/<id>.md**,
    **reviewFocus**, **header-held programme config**, **Sync stage**, **self-draining
    re-read loop**, **targeted jq writes with invariant check**, **report refresh stage**.

---

## 11. Open questions for the design

1. Should the new implementor be build-orchestrator (main-session driver, one Workflow per
   increment) or a self-draining workflow like frontend-alignment? The former keeps
   per-increment executor switching and a fresh loop snapshot each time; the latter avoids
   the run-copy patching and main-session context growth, and picks up appended increments.
   A hybrid (orchestrator derives + invokes; workflow owns plan→merge for one increment)
   matches both Sam's "skill uses Workflow" and the Workflow-cannot-nest constraint.
2. Where does the plan live once it is out of the backlog: `plans/<id>.md` in the workarea
   (frontend-alignment), tracked or not? For resume after `ladder-red`, the plan must
   persist.
3. Per-branch or shared-branch lifecycle? The loop is PR-per-increment + merge; the
   alignment run is one branch, never merges. Sam's memory ruling "stack a programme on one
   branch" conflicts with the loop's default. Probably a header-level `lifecycle` with three
   values: `full` (PR+merge per increment), `programme-branch` (alignment style), `local`.
4. One status enum: propose `todo | blocked | inprogress | done | dropped | merged-into`
   plus lifecycle sub-state (`attempt.outcome`) rather than a status per failure kind? Or
   adopt frontend-alignment's `*-red`/`*-retry` statuses?
5. `gate`: split into `needsRuling` (before) and `haltAfter` (after), or keep one field with
   a typed value?
6. Does combination (second distillation) run once before any build, or also mid-build as
   the EUDPA-409 proposal did when real run costs were known?
7. Should acceptance criteria be mandatory on every increment (the reviewers, verifier and
   ticket already treat them as the contract), and written at behaviour level?
8. Ladder: per-increment override allowed, or header/target-only?
9. Keep Codex review as a single reviewer, or make it the same 2n+1 fan-out so the executor
   only changes cost?
</content>
</invoke>
