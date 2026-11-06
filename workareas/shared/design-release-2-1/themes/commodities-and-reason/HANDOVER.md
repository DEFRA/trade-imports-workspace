# commodities-and-reason — handover

Written 4 November, mid-run. `backlog.json` and git hold the build's own state,
as [`BUILD.md`](../../../../../.claude/skills/requirements-pipeline/references/BUILD.md#the-handover-prompt)
says. This file holds the three things that do **not** survive a session: the
watcher, the running tally, and the diagnoses that cost hours to establish.

## Resume prompt

````
Resume the design-release-2-1 commodities-and-reason build with the
requirements-pipeline skill's BUILD phase.

workarea     shared/design-release-2-1/themes/commodities-and-reason
branch       feat/EUDPA-693-commodities-and-reason
lifecycle    branch
scope        design-release-2-1-commodities-and-reason
executor     claude
jiraProject  null
epic         null
inDev        null
doneStatus   null
board        null
repos        the envelope's repos map: frontend, tests, perftests
models       {}
stopAfter    all
e2e          ci
resumeFrom   null
rigour       standard

Stopped: <reason>. Last landed inc-024 (frontend #456, tests #79).
4 todo remain, 2 blocked, 3 dropped, 9 done.
Parked: inc-029 needs reference-data to serve an MDM commodity type list.
        inc-249 needs the MDM stub to serve a chicken species page — two files
        in repos/trade-imports-stub, named on the row and in deferred.md.
Owed to a human: the c-372 open question on inc-246 (how far the same-checks
        rule reaches), and the blank-reason data loss recorded as inc-246's
        open question.

Read deferred.md and ../HOW-TO-BUILD.md before the first increment.
Raise Dynamic workflow size in /config first — one increment is up to 60 agents.
````

Build args live in `build-args.json` beside this file; launch by `scriptPath`,
never by `name`.

## Re-arm the progress watcher

A cron watcher is session-only and dies with the session. To re-arm, use the
`loop` skill — `/loop 30m <the check>` — with a prompt that:

- reports **two** elapsed figures: the current run, and the whole build from
  19:15 on 3 November. Only the second reflects the exercise; each relaunch
  resets the first, and quoting only the run figure understated it by hours.
- anchors both on fixed times from the task output file
  (`stat -f %Sm .../tasks/<task id>.output`), **never** on a journal or
  transcript mtime — those are last-write times, and one gave a figure 66
  minutes wrong.
- gathers five signals: row statuses, commits **ahead and behind** `origin/main`
  per repo, agents started vs result in the run's `journal.jsonl`, newest mtime
  under the transcript dir, newest mtime under `logs/`.
- calls it stalled only when **all five** are unchanged. None alone is enough:
  a planner moves the transcript and writes no gate logs; an implementor
  detaches its gate and goes quiet while `logs/` moves; a tests-only row with
  `gatePhases: []` writes no gate logs at all for a while. A working tree going
  dirty is a sixth signal worth using.
- treats `started == result` (no agent in flight) as a stall **only if it
  persists across two checks with nothing else moving**.
- notifies on: the run ending or failing, with the stop reason; any stack lease
  appearing (this run is `e2e: ci`, so a lease means the guards below have
  regressed); or no **new** row done in over four hours.

## What cost hours, so it does not again

**A failing CI check can be a stale rollup.** `inc-024` burned five fix attempts
across two runs on an E2E failure from a workflow run created at 15:17:54Z,
before `inc-250` merged at ~18:35. GitHub does **not** re-run a pull request's
checks when its base moves, so the PR kept showing the old failure and the
loop's CI watcher read it as current. Nothing in the code was wrong: once the
job was re-run, every check went green and the row landed in 12 minutes.
**Before believing a `ci-red`, compare the check's `started_at`
(`gh api repos/<owner>/<repo>/check-runs/<id>`) with the branch head's commit
time, and re-run the job if it is older.**

**The loop's own documentation states this wrongly.**
`references/BUILD.md:1254` and `workflow/README.md:1085` both say "GitHub runs
no checks on a PR that conflicts with its base". `inc-250`'s review disproved it:
tests #79 was `CONFLICTING/DIRTY` while carrying six SUCCESS checks. The true,
narrower fact is that a conflicting PR keeps its last rollup and is not re-run.
That sentence underpins the `awaitCi: false` rationale and the `pr-conflict`
behaviour, so it is worth correcting at source.

**The loop misattributes a k6 smoke failure to Playwright.** Its stop message
said "E2E Tests failed (Playwright; evidence in `test-results/*/error-context.md`)"
when all three Playwright shards had passed and only `e2e / smoke / Smoke run`
failed. There is no Playwright error-context for a k6 failure, so a fixer that
believes the message has nowhere useful to look. Read
`logs/<row>-ci-fail-*.log` and the k6 threshold summary at the end of it.

**k6's per-scenario progress bars are not failures.** Lines like
`live-animals ✗ [ 92% ] 0/1 VUs` mean 92% of the run's duration elapsed with 0
VUs active at that instant. Reading four of them as four failing scenarios led
to a wrong call that CI infrastructure was down. The verdicts are the
`✓/✗ 'rate>0.99'` lines in the threshold summary at the end.

**A per-row `merge` field cannot rescue a row that has already pushed.** Every
unbuilt row carries `merge: origin/main` for its own repos, and that absorbed
drift three times, including a 43-commit sibling-theme merge with zero
conflicts. But a merge belongs to the **branch stage**; a row that has committed
and is being retried re-enters at the **CI watch stage**, past it. `inc-024`
needed a hand-written merge row (`inc-250`) despite carrying `merge`. Rows that
stall in CI need a merge row, not a merge field.

**Never hand-merge main into the theme branch**, whatever the loop's stop
message suggests — `../HOW-TO-BUILD.md` forbids it, and both merges here went
through rows (`inc-247`, `inc-250`) carrying the resolution in their criteria.
That mattered: `inc-250`'s merge had to keep main's `@cross-browser` tag *and*
`inc-023`'s unweaned assertions, and git could not reconcile them unaided
because main re-indented the lines the branch had edited.

**FIT worker count was mis-tuned and is now 8.** `config/machine.json` had 4,
chosen because 2 and 3 timed out — but those measurements were taken with the
stack up and swapping, and 4 was the ceiling of `tim build tune`'s default
range. Re-timed stack-down: 636s at 4, 428s at 6, 332s at 8, 256s at 12. Set to
8, not 12, because the curve had not flattened and only wall time was sampled.
Full reasoning in
[`machine-tuning.md`](../../../../../.claude/skills/requirements-pipeline/references/machine-tuning.md#animals-fit-re-measured-with-the-stack-down).
Plants FIT, ins-frontend FIT and the E2E count still carry both flaws.

## Still outstanding

- **A tests-repo E2E flake closed by re-run, not by a fix.** `inc-018`'s E2E
  failed, then passed on a re-run with no code change. Rule 6 says flaky never
  closes a failure. Worth chasing once the theme is built.
- **Three loop defects** worth fixing at source: the wrong sentence above; the
  CI stage trusting a rollup older than the branch head; and a retry not
  re-entering at the branch stage (or not re-evaluating `merge` at CI watch).
  `inc-250`'s own follow-ups record all three.
- **The theme's business tickets.** Once the backlog drains, run the
  `theme-ticket` skill's WRITE flow — "write the business tickets for
  commodities-and-reason" — which replaces EUDPA-693's `stub` entry in
  `tickets/tickets.json` with the real per-domain split.
- **The stale branch** `feat/EUDPA-693-design-release-2-1-commodities-and-reason`
  is still the salvage quarry; its PRs #401, #23 and #17 were closed on 3
  November. Do not delete the branch until salvage is finished.

## Cold start, if the session died

The build loop is a background task of the Claude Code session that launched it.
If that session ends — closed terminal, or a failed context compaction — the run
dies with it and nothing restarts it. Nothing is lost: every landed row is
committed and pushed, and `backlog.json` holds the rest.

To pick it up, in a session opened at the workspace root:

1. `tim backlog check shared/design-release-2-1/themes/commodities-and-reason`
   and `tim backlog next` on the same workarea — the next buildable row.
2. `git -C repos/<repo> rev-list --count HEAD..origin/main` for frontend, tests
   and perftests. Any count above zero and the next row's own `merge` field will
   take it in; a row that has already pushed needs a merge row instead (see
   above).
3. `tim docker lease status` — release any lease left by the dead run
   (`tim docker lease release --holder "<its id>"`) before relaunching.
4. Relaunch with the resume prompt at the top of this file, by `scriptPath`.
5. Re-arm the watcher: `/loop 1h` with a prompt that says to read this file and
   do the five-signal check. Keep that prompt SHORT — a long one is re-injected
   every tick and is what fills a context window overnight.

## Overnight autonomy, as agreed 4 November

The watcher may, without waking anyone: re-run a CI job whose failing check
predates the branch head and relaunch; relaunch once after a genuine `ci-red`
to give the fixer fresh attempts; and write a merge row on the `inc-247` /
`inc-250` pattern after a `pr-conflict`, but only when it can state the
resolution from the two diffs.

It must hold and notify on `plan-refused`, any stack stop, or any reason it does
not recognise. Limits: at most 6 relaunches, stop if one reason repeats three
times, never hand-merge `main`, never merge or close a pull request, never touch
`main`.

## Stopped deliberately, 4 November ~22:50, mid `inc-025`

The session was stopped on purpose rather than risked overnight, with `inc-025`
part-built. Nothing is lost and nothing needs rescuing before a relaunch.

Where `inc-025` got to: plan and review done, the 43-commit merge from the
arrival-and-transit theme applied with **zero unresolved conflicts**, implement
finished, and it was in the review/consistency fan-out. It had **not** committed,
so it is still `status: todo` with `attempt: none`.

Left in the working trees, uncommitted:

| Repo | State |
|---|---|
| animals frontend | `MERGE_HEAD` set, 49 files, 0 unresolved |
| ins tests | `MERGE_HEAD` set, 24 files, 0 unresolved |
| performance tests | clean |
| this repo | the openspec specs and coverage `inc-025` was writing |

All three saved as patches beside this file, in case the trees are ever reset:

- `logs/inc-025-preserve-frontend.patch` (+ `.status`)
- `logs/inc-025-preserve-tests.patch` (+ `.status`)
- `logs/inc-025-preserve-openspec.patch`

**The simplest relaunch is to leave the trees exactly as they are.** `inc-025`
has no attempt record, so the loop rebuilds it from the top; its baseline guard
will find the dirty trees and the in-progress merges and decide what to do with
them. The merge is already resolved, so that work is not wasted.

If a clean start is wanted instead: `git -C <repo> merge --abort` in the frontend
and tests repos and `git checkout -- openspec/` here, then relaunch — the merge
will simply be redone by `inc-025`'s own `merge` field, since both repos are
behind `main` again.

The stack lease was free and the stack down when the session ended, so there is
nothing to release.
