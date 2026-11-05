# The commodities-and-reason progress watcher

The half-hourly tick prompt is deliberately short, because it is re-injected
every tick and a long one fills a context window overnight. Everything the
watcher needs only **when something stops** lives here instead, and is read
then rather than every half hour.

Companion files: [`HANDOVER.md`](HANDOVER.md) (the diagnoses that cost hours),
`watch-anchors.conf` (the fixed epochs), `watch-signals.sh` (gathers all six
signals in one block — needs its execute bit: `chmod +x`).

## The six signals

Five from HANDOVER.md, plus working-tree dirt.

| # | Signal | How |
|---|---|---|
| 1 | Row statuses | `tim backlog check shared/design-release-2-1/themes/commodities-and-reason` — one line of counts. `tim backlog next` for the row in flight |
| 2 | Commits **ahead and behind** `origin/main`, per repo | `git -C repos/<r> fetch origin main --quiet` then `rev-list --count origin/main..HEAD` and `HEAD..origin/main`. Behind matters as much as ahead: drift is what a `merge` field absorbs |
| 3 | Agents started vs result | `grep -c '"type":"started"'` and `grep -c '"type":"result"'` in the run's `journal.jsonl`. **Those are the keys** — `agent_start` / `agent_result` match nothing and read a silent 0/0, which looks exactly like a stalled run |
| 4 | Newest transcript mtime | newest file under the run's transcript dir |
| 5 | Newest mtime under `logs/` | newest file under this theme's `logs/`. **Format the mtime with the date** (`stat -f '%Sm' -t '%m-%d %H:%M:%S'`) and scope it with `-newermt '<this run started>'`. With `%H:%M:%S` alone, files from an earlier night sort above tonight's: `inc-018-review2-unit.log` at 23:51 on 3 November read as the newest activity at 23:10 on the 4th, and two of the four "newest" entries sat in the future |
| 6 | Working-tree dirt | `git status --porcelain | wc -l` per repo, plus `MERGE_HEAD` present or gone |

**Stalled means all five of 1–5 unchanged.** None alone is enough, and a flat
one is usually expected rather than worrying:

- a **planner** moves the transcript and writes no gate logs at all;
- an **implementor** detaches its gate and goes quiet while `logs/` moves;
- a **tests-only row** with `gatePhases: []` writes no gate logs for a long while;
- **`started == result`** (no agent in flight) is a stall only if it persists
  across two consecutive checks with nothing else moving;
- **signal 2 flat** is the normal case mid-row: it only moves when a row lands.

So each tick, name the stage, say which signals moved and which did not, and
say **why** a flat one is expected. Do not call it stalled on one flat signal.

## On a stop: recover rather than wait

### `ci-red`

**First, suspect a stale rollup.** This cost five fix attempts and two runs on
inc-024. GitHub does not re-run a pull request's checks when its base moves, so
a PR keeps showing a failure from before the last merge.

```bash
gh pr checks <pr url>                                   # find the failing check's id
gh api repos/DEFRA/<repo>/check-runs/<id> --jq '.started_at'
git -C repos/<repo> log -1 --format=%cI                 # the branch head's commit time
```

If `started_at` is **older** than the branch head, the failure is stale: re-run
that job (`gh run rerun <run id> --failed`) and let the loop watch it again. Do
not spend a fix attempt on it.

If it is newer, the failure is real: relaunch **once** to give the fixer fresh
attempts. Before diagnosing, read `logs/<row>-ci-fail-*.log`, because:

- **a smoke failure is k6, not Playwright**, whatever the loop's stop message
  says. The message names Playwright and `test-results/*/error-context.md`; for
  a k6 failure no such file exists. The verdicts are the `✓/✗ 'rate>0.99'`
  lines in the threshold summary at the end of the log.
- **k6's per-scenario progress bars are not failures.** `live-animals ✗ [ 92% ]
  0/1 VUs` means 92% of the run's duration elapsed with 0 VUs active at that
  instant. Four of those are not four failing scenarios.

### `pr-conflict`

Write a merge row on the `inc-247` / `inc-250` pattern, then relaunch. Only do
this when the resolution can be stated from the two diffs; otherwise hold.

A per-row `merge` field cannot rescue a row that has already pushed: a merge
belongs to the **branch** stage, and a row being retried re-enters at the **CI
watch** stage, past it. That is why this needs a row.

The template is in [`../HOW-TO-BUILD.md`](../HOW-TO-BUILD.md) (from the
documents theme's inc-040). The criteria must name **which side each
conflicting file keeps** — inc-250's merge had to keep main's `@cross-browser`
tag *and* inc-023's unweaned assertions, and git could not reconcile them
unaided because main had re-indented the lines the branch edited. Add it with:

```bash
tim backlog add shared/design-release-2-1/themes/commodities-and-reason \
  --from merge-row.json --before <next todo row> --write --json
tim backlog check shared/design-release-2-1/themes/commodities-and-reason
```

An `e2e: "ci"` theme's rows carry `gatePhases: []`, and so does its merge row.

### `branch-failed`, and dirty trees generally

Seen for real at 22:45 on 4 November. The branch stage refuses a dirty tree or
a merge in progress and says *"these require human resolution — never stash,
reset, abort or clean automatically"*. **Hold and notify.** Do not reset or
abort anything: the classifier blocks it, and rightly.

Two traps found that night, both worth checking before asking for a reset:

- **`git merge --abort` can fail** with `Entry '<path>' not uptodate. Cannot
  merge.` when files were edited after the merge was staged. `git update-index
  --refresh` lists them. `git reset --hard HEAD` is the way through, since a
  `--no-commit` merge leaves HEAD at the pre-merge tip.
- **A dirty `openspec/` is a `land-leaked` trap.** The land stage's guard is
  `carried.includes(path)`, where `carried` is `started.preexistingDirty` — the
  workspace files already uncommitted when the increment began. If the row then
  commits one of them, the run stops at `land-leaked` with nothing pushed. So
  the workspace repo must be **clean** before a launch.

### The cross-repo image-publish race — not a flake, 5 November

**This section replaces an earlier, wrong entry** that called inc-027's E2E red
a flake on the strength of its passing a re-run with no code change. It is not a
flake. It is a deterministic ordering race between two repos' CI, and it hit
twice in one day.

A tests-repo E2E job runs the Playwright suite against the **frontend's
branch-tagged image**, which the frontend's own pull request publishes. The
tests job pulls that image seconds after its own job starts. So when a row
commits to both repos at nearly the same moment, the tests E2E pulls the
**previous** frontend image and asserts behaviour the running frontend does not
yet have.

**inc-028**, proved end to end:

| Time | Event |
|---|---|
| 15:18:50 | tests fix `0026f7d` committed |
| 15:21:53 | frontend fix `4bb3a982` committed |
| 15:21:57 | tests E2E run 42054185244 starts |
| **15:22:54** | **`trade-imports-animals-frontend Pulling`** — the old image |
| **15:27:30** | **frontend `publish / Publish branch-tagged index` completes** |
| 15:27:50 | `consignment-details.spec.ts:45` fails: `getByRole('link', { name: 'Number of animals must be 2,147,483,647 or fewer' })` — element not found, because that message is in the image published 5 minutes later |

**inc-027**, the same shape:

| Time | Event |
|---|---|
| 11:21:47 | tests `b458ff2` committed |
| 11:24:54 | tests E2E starts, pulls the old frontend image, **fails** |
| **11:30:01** | frontend `1f954ca3` branch image publishes |
| 11:53:53 | re-run on the identical head **passes** — because the image now exists |

So the assertion was right both times and the environment was stale. Rule 6 is
not breached by re-running here: nothing about the code changed, but the thing
under test did.

**What to do about a tests-repo E2E red:** before touching any assertion, line
up three timestamps — the tests job's `… Pulling` line for the frontend, the
frontend PR's `publish / Publish branch-tagged index` completion, and the
failing spec's own time. If the pull precedes the publish, **re-run the job**;
do not let a fixer rewrite correct code to match a stale image.

**Worth fixing at source**, because it will keep costing attempts: a tests-repo
E2E that depends on a sibling frontend commit should wait for that commit's
image to publish, or the loop should order the pushes so the frontend's image is
ready before the tests job starts.

**inc-018's flake, listed in HANDOVER.md as still outstanding, deserves
re-examination against this** — it may be the same race rather than a flake, but
that has not been checked and should not be assumed.

### `plan-refused`, any stack stop, anything unrecognised

**Hold and notify.** Do not relaunch in hope. `stack-held` or `stack-failed` on
an `e2e: ci` run means a guard has regressed, which is a finding in itself.

**Seen for real at 00:05 on 5 November, and it is a lint defect, not a bad
plan.** inc-025 was refused after 62 minutes, 10 agents and 1.03M subagent
tokens, on one sentence — `plans/inc-025.md:577`:

> keep their contracts, and the doc comments at `:20`, `:28` and `:37` stay
> true as written.

The planner was saying the opposite of what the lint heard: that those doc
comments need **no change**. That is exactly what a plan should record. But the
first `CODE_TEXT_DIRECTIVES` pattern (`increment-build-loop.js:3316`) is

```
\b(add|...|keep|keeps|...)( [^ .;:]+){0,4} <NOT_IN_A_RELATIVE_CLAUSE><COMMENT_WORDS>\b
```

and `keep` + `their` `contracts,` `and` `the` (four tokens, commas allowed) +
`doc comments` matches it. The pattern cannot tell "keep this comment wording"
— a planner dictating text the implementor owns — from "these comments remain
accurate", a statement of no work.

Consequences worth knowing before reaching for a relaunch:

- The detail said the plan **still** writes code text. `still` means this
  survived one send-back, so the planner had already been asked once. A blind
  relaunch is likely to spend another hour and another million tokens arriving
  at the same sentence.
- A one-sentence rewording in the plan clears it, but **editing a refused plan
  is the author's call, not the watcher's** — hold and ask.
- Worth fixing at source, alongside the three loop defects HANDOVER.md already
  lists: the pattern needs to exempt a stays-true/needs-no-change clause.

## Limits, as agreed 4 November

- At most **6 relaunches** (watcher-initiated; the tally is in
  `watch-anchors.conf`).
- **Stop if one reason repeats three times.**
- **Never hand-merge `main`** into the theme branch, whatever a stop message
  suggests. Merges go through rows.
- **Never merge or close a pull request.** Never touch `main`.
- `PushNotification` on every relaunch, every hold, and when the backlog drains.

## When the backlog drains

Notify, then: run the `theme-ticket` skill's WRITE flow — "write the business
tickets for commodities-and-reason" — which replaces EUDPA-693's `stub` entry in
`tickets/tickets.json` with the real per-domain split. The loop makes no Jira
call itself under `lifecycle: branch`, so this is the orchestrating session's.

## Watching your own context

The build loop is a background task of the session that launched it: a failed
compaction kills the run. Past about two thirds of the window, switch the
watcher to **hourly** and to **one-line** replies. HANDOVER.md's "Cold start"
section is the recipe if the session dies anyway.
