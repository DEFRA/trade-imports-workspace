# commodities-and-reason — what it took

Written 6 November, once the theme had drained. `backlog.json`, `plans/` and the
git history already hold **why** each row exists and **how** it was built. This
file holds the two things nothing else records: **when** it happened and **what
it cost** — figures that otherwise live only in a session transcript and die
with it.

Every timestamp here comes from a git commit, so it can be checked. Every cost
figure comes from a workflow run's own usage report and is marked where it
covers only part of the exercise.

## Where each kind of detail lives

The honest map, so nobody hunts for something in the wrong place.

| What you want | Where it is |
|---|---|
| Why a row exists, what it cites as evidence, what was ruled | `backlog.json` — all 19 rows carry `detail`, `notes`, `sources`, `acceptanceCriteria` and `openQuestions` |
| How a row was built, decision by decision | `plans/<id>.md` — 21 plans, one per row the loop planned |
| What the service does now | `openspec/specs/live-animals/` — 36 scenarios across 8 files, with `openspec/coverage/` linking each to the test that proves it |
| What the business reviews | [EUDPA-693](https://eaflood.atlassian.net/browse/EUDPA-693), derived from openspec by the `theme-ticket` skill |
| The diagnoses that cost hours | [`HANDOVER.md`](HANDOVER.md) and [`WATCHER.md`](WATCHER.md) |
| What changed, line by line | the four pull requests, and the branch's own history |
| **When it happened and what it cost** | this file |
| Gate logs, CI failure logs, preserve patches | `logs/` — **gitignored, local to the machine that ran it.** Not in any commit |

## Timeline

Wall clock, from the branch's own commits.

| When (UTC) | What |
|---|---|
| 3 Nov 13:17 | Branch opened in the frontend, cut fresh from `main` after the pre-flight walk |
| 3 Nov 18:45 | First row lands: commodity search sorted and bolded, with a removable selection panel |
| 3 Nov 20:51 | A merge row takes in what `main` had landed since the cut |
| 4 Nov 01:47 | Hard stops: means of transport, and number of packages |
| 4 Nov 07:55 | Save and return to overview makes the same checks as Save and continue |
| 4 Nov 10:10 | The unweaned question, for equines, cattle, pigs, sheep and goats |
| 4 Nov 15:04 | Number of packages pinned to the V4 data fields list |
| 4 Nov ~22:50 | **Session stopped deliberately**, mid `inc-025`, rather than risked overnight on a nearly-full context window |
| 5 Nov 03:40 | Species read as their scientific name with the common name in brackets — the 43-commit sibling-theme merge banked with it |
| 5 Nov 07:49 | Stub commodity fixture matched to what the MDM stub serves |
| 5 Nov 11:21 | Remove keeps the numbers typed but not yet saved |
| 5 Nov 14:35 | A number of animals beyond what the service stores is refused |
| 5 Nov 15:21 | CI fix: the cap corrected to what the backend field actually stores |
| 5 Nov 17:42 | Whole-theme engineering review, first pass, across all three repos |
| 5 Nov 18:47 | Merge row clears the tests-repo conflict the review itself created |
| 5 Nov 20:44 | Whole-theme engineering review, second pass — **theme complete** |
| 6 Nov 00:1x | Spec catch-up corrects the count cap, a stale refusal and a species spelling |
| 6 Nov 11:08 | Three repos take in `main` for the address-book `roles` change |

**Branch open to theme complete: 3 Nov 13:17 → 5 Nov 20:44, about 55 hours
wall clock.** The build loop was running for roughly 38 of those; the rest is
the deliberate overnight stop and the gaps between sessions.

**13 rows landed in 55 hours**, but the spread is the interesting part, not the
average:

- **inc-026 took 25 minutes** start to `done` — a frontend-only row with no
  merge to resolve and no CI fix needed.
- **inc-025 took 5 hours** — it carried the 43-commit arrival-and-transit merge,
  was refused once by the plan lint, and needed two CI fix attempts.
- **The whole-theme review took 6 hours across two passes**, because the first
  pass's own commit conflicted with `main` and had to go through a merge row
  before its CI could run.

## What the runs cost

Four build-loop launches, all on 4–6 November. **These figures cover that
window only** — the rows that landed on 3 and 4 November were built by an
earlier session whose usage was never recorded, so the theme's true total is
higher than the sum below.

| Run | Stopped at | Agents | Subagent tokens | Tool calls | Duration |
|---|---|---|---|---|---|
| 1 | `branch-failed` | 4 | 0.13M | 28 | 1m 44s |
| 2 | `plan-refused` | 10 | 1.03M | 484 | 1h 02m |
| 3 | `pr-conflict` | 171 | 20.19M | 7,887 | 17h 33m |
| 4 | `no-buildable` | 47 | 4.69M | 1,888 | 3h 14m |
| **Build total** | | **232** | **26.05M** | **10,287** | |

Two further workflows ran around the build:

| Workflow | Agents | Subagent tokens | Tool calls | Duration |
|---|---|---|---|---|
| Spec catch-up (targeted, 8 capabilities) | — | 0.35M | 312 | 3h 39m |
| Engineering pattern review | 43 | 3.72M | 1,656 | 23m |

**Reading the first two runs.** Run 1 lasted 104 seconds and built nothing: the
branch stage refuses a dirty tree, and the previous session had left an
uncommitted merge in two repos. Run 2 spent an hour and a million tokens and
also built nothing: the plan lint refused `inc-025` over a single sentence. Both
are recorded in `WATCHER.md` with their causes, because both were avoidable.

**Run 3's 17½ hours is not 17½ hours of work on one thing.** It built four rows,
spent three CI fix attempts, ran a whole-theme review and then stopped when that
review's own commit conflicted with `main`.

## Why it took as long as it did

Four causes, in rough order of cost. All four are written up with evidence in
[`WATCHER.md`](WATCHER.md); this is the summary.

1. **A cross-repo image race, twice.** A tests-repo end-to-end job runs against
   the frontend's branch-tagged image and pulls it seconds after the job starts.
   When a row commits to both repos at once, the tests pull the *previous*
   frontend image and assert behaviour the running service does not yet have. It
   cost fix attempts on two rows, and was first misdiagnosed as a flaky test.
2. **`main` moving under the branch.** Absorbed three times by a row's own
   `merge` field and three times by a hand-written merge row. A `merge` field
   only protects a row that has not yet reached its branch stage, so a row
   stalled in CI needs a row, not a field.
3. **Guard rails firing on things that were not wrong.** The plan lint's
   comment-text rule matched a sentence saying some comments needed *no* change;
   that cost an hour and a run. The rule is now fixed at source.
4. **Diagnosis errors, mine.** A stale `origin/main` read as level, a three-dot
   diff answering a different question than the one asked, and a `workflow_run`
   check attributing a `main` failure to this branch. Each produced a confident
   wrong answer, and two reached the user before being checked.

## What this theme changed outside itself

Worth recording, because none of it was in the backlog:

- **The plan lint's comment rule was fixed** in the shared build loop, proved
  over an eleven-line corpus. Every programme using that loop benefits.
- **Eight loop defects were identified**, one fixed and seven recorded with
  evidence in `WATCHER.md` for whoever fixes them at source.
- **The behaviour specification was corrected** where it had drifted from the
  code: a count cap two orders of magnitude out, a refusal that no longer
  happens, and a species spelling no service holds.
- **Eleven dead coverage links** were found pointing at a test file that never
  existed, and ten were repaired.

## What is still not recorded anywhere

Said plainly so nobody assumes otherwise.

- **Per-row agent and token costs.** The usage figures above are per *run*, and
  a run builds several rows. Nothing attributes cost to a row.
- **The 3 and 4 November runs' usage.** Never captured; the earlier session
  recorded no figures.
- **The gate and CI logs.** `logs/` is gitignored, so the evidence behind every
  verdict quoted here exists only on the machine that produced it.
- **The engineering review report** is published as an artifact rather than
  committed, so it is outside the repo and outside this history.
