# Build loop: streamlining the increment build loop

**Design, 29 October 2026.** Agreed with Ian in conversation; not yet planned or built.

The Design Release 2.1 accompanying documents theme (EUDPA-724) landed six rows in six loop
launches over about 29 hours, for roughly 696M tokens. Not one launch ended because the work
was finished. This design says what to change so the next theme costs less of all four things
Ian named: his attention, wall clock, tokens, and the effort of trusting the result.

The guiding constraint, his: **make it configurable rather than removing steps.** Nothing here
deletes a stage. Every change either moves work to where it is cheaper, or puts a dial on how
much of it a given run or row asks for.

## The evidence

Six archived runs, from `tim build runs report --all`:

| run | stopped | agents | tokens | time |
|---|---|---|---|---|
| `wf_c6281a16-45c` | stack-failed | 4 | 334k | 3m 21s |
| `wf_15d0afe9-61e` | stack-failed | 4 | 396k | 3m 16s |
| `wf_2b9e8a60-3dd` | ci-red | 66 | 197.60M | 5h 37m |
| `wf_7cd4ab96-1c5` | ladder-red | 94 | 326.24M | 6h 52m |
| `wf_3b837c73-8b1` | ci-red | 30 | 59.78M | 1h 29m |
| `wf_c8b90206-0f8` | spec-check-red | 55 | 112.51M | 3h 59m |

Where the tokens went, across all six:

| group | tokens | share |
|---|---|---|
| Planning (`plan` 88.67M, `plan review` 92.25M, `revise plan` 28.01M, lints and records) | ~211M | 30% |
| Implement | 179.73M | 26% |
| Review (`consistency` 52.79M, `review` 47.42M, `style` 21.13M, `verify` 20.83M, `judge` 10.88M) | ~153M | 22% |
| Fix, ladder, theme review | ~127M | 18% |
| Everything mechanical — branch, PR, CI watch, land, baseline, derive | ~25M | 4% |

Plan review cost more than planning, and more than half of implementation. The run passed
`models: {}`, so `plan`, `plan review`, `judge` and `consistency` all took opus by default.

Where the hours went, and none of it was building:

1. Four launches on 26 October landed nothing. Two died because `workspace` is a forbidden
   repo key under `lifecycle: branch`; two died on Maven Central 502s through this machine's
   Docker egress.
2. A gate died without writing `gate-result-all.json` and the poller ran for 2h 40m.
3. The run held a 20-container stack up throughout, and then took the **unit** rung red twice
   on 5000ms timeouts in files that pass in 2.85s alone. Local gates were switched off by hand
   mid-theme (`4f0e0d5c`) and the e2e proof moved to the pull requests.
4. The run ended at `spec-check-red` on twelve scenarios that were other prefixes' pre-existing
   holes, nothing the theme left.
5. The branch took `main` in twice in one day, both times noticed only because the pull request
   stopped running checks.

## Already fixed, 27 October — not in scope here

Two items this design would otherwise have carried landed during the run itself. The 26 October
handover in `themes/documents/HANDOVER.md` predates them and should not be read as current.

- **`f5565720`** (27 Oct 10:40) — the gate runs detached and `tim build gate-wait` reports a dead
  gate at once. It has a bounded `--seconds` and a `GATE_DIED` outcome, so the 2h 40m hang
  cannot recur.
- **`54e335d5`** (27 Oct 19:43) — the theme spec check fails only on scenarios the theme's own
  commits touched, via the new `tim spec diff --commit`. The final run launched at 18:12 and so
  ran the pre-fix script; that `spec-check-red` would not happen now. The same commit also made
  a conflicting PR stop the row at once as `pr-conflict` rather than spending CI fix attempts,
  moved the branch guard onto `tim workspace repo-state`, and made a resumed workspace branch
  merge its base before any stage runs tim.

## A1 — Where e2e is proven, and the lease that follows

**New required arg `e2e: "local" | "ci"`**, resolved and printed in the first log line with the
rest of the config, and required like every other key so a missing one stops the run before any
agent starts.

- **`"ci"`** — no local e2e rung at baseline or ladder, no stack lease, no images built. The
  baseline's e2e evidence is the branch's last green pull request check run, per repo. A branch
  with no completed e2e run yet — a freshly cut one carrying only its seed commit — waits for one
  once, at the first increment's baseline; on documents both pull requests were green in about
  nine minutes on the seed commits alone. CI watch and `ciFixAttempts` are unchanged, and the run
  still stops at `ci-red`.
- **`"local"`** — as today, except the tests repo's e2e rung takes its `scope` from
  `config/e2e-tests-pr-scope.json` for the repos being built.

**The lease becomes derived, not configured.** `increment-build-loop.js:4569` is today
`PLAN_ONLY ? null : await acquireRunLease()`. It becomes: take the lease only when
`e2e === "local"` and some row in the run owes an e2e phase.

**Scope the local e2e rung.** The tests repo's `e2e` rung in `references/gates.json` runs
`test:docker-compose` with no `scope`, and no Playwright args means no filter — so an
animals-frontend change runs the plants, ins and animals-admin specs too. That is more than its
own pull request runs and it duplicates what CDP does after deployment. Scoping it from the same
file makes the local and CI paths prove the same thing by construction, and is part of why
"nearly every spec timed out at 90s" on this machine.

**No soundness check on `"ci"`.** `config/e2e-tests-pr-scope.json` is the project's deliberate
statement of what a service's pull request needs to run — its own domain plus the cross-domain
specs tagged for that service, which the `service-tag` skill exists to keep current. It is
trusted. Beyond it, CDP runs each service's whole **family** after deployment to dev:
animals-frontend runs `ins:e2e`, `animals:e2e` and `animals-admin:e2e`, plus a11y and dynamics
on test (`docs/testing/e2e-tests-cdp.md`). Anything the pull request scope misses is caught
there, before prod, and becomes a bug. An earlier draft of this design proposed refusing a
`"ci"` run whose theme touched an untagged cross-domain spec. That is dropped: it was guarding a
gate that already has an owner.

**Preflight validates every todo row's `repos`.** Today the args-versus-envelope check runs at
preflight but a row's own `repos` are checked per row in the Branch stage, which fails as
`row-invalid` at `increment-build-loop.js:4696` — after launch, after the lease, one row at a
time. On documents all five rows would have failed that way. Moving the check to preflight turns
a dead run into a message in seconds.

**Recovers:** both `stack-failed` launches, the four 26 October launches that landed nothing,
both false unit timeouts, and the Maven-502 problem entirely — a `"ci"` run builds no images.

## A2 — Resume from the stage reached

Sam's ask of 23 October, recorded in `deferred.md`: *"need to get better at being able to resume
from a partially failed/complete state."* On inc-221 an attempt was built, reviewed and fixed,
went red on one environment problem, and was rebuilt from scratch — about five hours, where a
ladder re-run would have been twenty minutes. On documents, four stops each meant a full rebuild.

Three parts, in his order:

1. **Record the stage reached** on the row, with the reviewed plan and the preserved attempt.
   There is no `stageReached` or `resumeFrom` anywhere in the loop today.
2. **On relaunch, reuse them** — keep or re-apply the work, re-run unit and FIT, then go to the
   ladder, rather than re-planning and re-implementing.
3. **A launch argument to re-run from a named stage**, because `Workflow`'s own resume replays a
   changed stage's cached result and so cannot serve this.

His fourth part — push a parked attempt somewhere another machine can resume it — is largely
there already: `preserveWork` (`increment-build-loop.js:1334`) commits a wip on the branch with
a `wip(<scope>):` subject, records the branch and SHA in the row's note, and the next attempt
branches from it. What is missing is the stage record that would let the next attempt start
anywhere but the beginning.

**Recovers:** on documents, four stops times a full rebuild.

## A3 — The rigour dial

**New `rigour` arg with a per-row override**, following the precedent `gatePhases` already sets
for a row declaring how much verification it owes. The resolved set is printed per increment in
the run log, so the report can say what each row actually got.

Three presets to start with. The run default is `standard`.

| preset | what runs |
|---|---|
| `full` | Today's pipeline, unchanged. |
| `standard` | One plan reviewer rather than two, and it keeps its single send-back. No style reviewers — the format and lint rungs and the `code-style` skill already own that ground. Consistency, verify, judge, fix and ladder all kept. |
| `fast` | Sonnet plan, no plan review, one code reviewer across the whole change, judge, fix, ladder. |

`fast` exists for rows like inc-031 and inc-039, where the behaviour was already on `main` and
the work was a test and a spec sentence. Both took the same opus plan, opus double plan review,
revise, implement, four reviewers, verify, judge, fix and ladder pass as inc-034, which genuinely
extended `shared/kit.js`.

Three things hold at every preset, so that lowering rigour never lowers correctness:

- **The plan lint always runs.** It greps the plan for code text and costs 69.9k tokens on
  average. `fast` drops the plan *review*, not the check that the plan obeys its contract.
- **The gate always runs** at whatever phases the row owes. `rigour` governs how much the change
  is planned and read, never whether its tests pass.
- **The theme engineering review is not governed by `rigour`.** It runs once per theme, after the
  last row lands, and reads `git diff origin/main...HEAD` across every repo. It is the backstop
  for whatever a `fast` row's single reviewer missed, so making it configurable would remove the
  thing that makes `fast` safe to choose.

**Per-row rigour is proposed, not interrogated.** Documents took six launches; eight rows times
six launches is forty-eight answers. So the BUILD intake derives a proposal from each row's shape
and shows it as a table before launching:

```
e2e: ci   (Docker 8.2/19.3GB, no machine.json — local e2e not viable)
rigour: standard

inc-031  fast      spec + test only, behaviour already on main
inc-034  full      extends shared/kit.js
inc-038  standard
inc-039  fast      workspace only, no repos
```

Change any row, or press on. The derivation only proposes; the operator decides. A row may also
carry an explicit `rigour` in `backlog.json`, which wins over the proposal — optional, so theme
planning gains no work it must do.

**Where the asking happens.** The loop runs as a background `Workflow` and cannot prompt. So
`e2e`, `rigour` and the existing launch knobs (`stopAfter`, `ciFixAttempts`, `ciWatchMinutes`,
`models`) are asked in the requirements-pipeline BUILD intake, in the session, immediately before
the launch — not during distil or theme planning, which are unchanged. The answers persist into
`build-args.json`, so a relaunch defaults to last time's and needs a confirm rather than an
interrogation. A relaunch is also the natural moment to change one: a row that has stopped twice
gets bumped to `full`, or `local` gets switched to `ci` after a stack failure.

**Recovers:** most of the ~211M planning spend and the 52.79M consistency spend.

## A4 — Machine and process

- **`tim build tune --write`** has never been run here: `config/machine.json` does not exist, so
  the gate runs every FIT and e2e rung at the worker count its own script says. Write it.
- **Docker Desktop's allocation** — 8.2GB of this machine's 19.3GB, and 12 CPUs shared with the
  host. Now optional rather than blocking, because a `"ci"` run never starts the stack.
- **A stated `main`-merge cadence** in `themes/HOW-TO-BUILD.md`. The documents branch took `main`
  in twice in one day, once by hand and once as inc-040, neither planned. `54e335d5` made the
  loop stop at once on a conflicting pull request, so this is now a cadence to write down and a
  scheduled merge row, not a detection problem.
- **`tim sonar gate`**, so the CI fixer can see why a SonarCloud quality gate failed. On inc-212
  it spent all three CI fix attempts blind before a hand fix found three S2187 blockers. This
  matters more once CI carries the e2e proof.

## What is deliberately not changing

- No stage is deleted. `full` is today's pipeline and stays available.
- Distil and theme planning are untouched. No new required field in `backlog.json`.
- `increment-build-loop.js` is not edited in place. Each piece is a factory change on its own
  branch with tests and docs, as the BUILD guard rails require.
- `e2e` stays a separate key from `rigour`. One is where the tests run, the other is how much
  review the code gets; conflating them would make `fast` silently mean "do not test locally".

## Order, and why

**A1, then A2, then A3, with A4 in parallel throughout.**

A1 first because it is mechanical, changes no quality bar, and removes the two things that
actually killed launches. A2 second because resuming into a run that still contends for CPUs
with a stack it does not need would resume into the same failure. A3 last because it is the only
piece that moves the quality bar, and it should run on a loop whose stops are already rare enough
to judge it by. A4 is a day's work with no dependency on the other three.

A1 and A4 together recover most of the 29 hours. A2 and A3 are the expensive pieces.
