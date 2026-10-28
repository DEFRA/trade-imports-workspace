# CI pipeline tuning: trade-imports

Measured 27 Oct 2026 from GitHub Actions run history across 16 repos. A second agent then checked each proposal and tried to disprove it.

## Summary

- **No job matches the 30-minute unsplit suite you described.** The closest is the animals frontend FIT suite. It takes 14 minutes on one runner, about 2.4 minutes under its own 15-minute timeout.
- **Most of the waiting is in the shared workspace e2e and image build.** It is not in any one repo's unit tests, and no unit-test suite anywhere is worth sharding.
- **Top wins:**
  - cache the tests image build
  - shard the animals frontend FIT and Lighthouse jobs together
  - balance the e2e shards by test time
- **On offer:** about 850 minutes a week of PR waiting time (summed across PRs), now that skipping workspace e2e is dropped. Runner-minute figures were worked out with it in, so read them as lower now.
- **Most other proposals only free runners.** The Java repos run their tests twice and build their Docker image twice, which is real waste. But e2e finishes later, so PRs wait no less.

## Results

**5 of 5 changes landed (100%).** All are merged: both Java changes, the shared image build and e2e workflows, the animals and plants frontends, and the tests repo and INS frontend.

Times are in minutes, from real GitHub Actions runs.

| Change | Repo | Check | Before (min) | After (min) | Test counts match |
|---|---|---|---|---|---|
| Address book pull request check runs its tests and Docker build once | Address book | Pull request check | 3.75 | 1.72 | Yes: 140 unit, 92 integration |
| | Address book | Extra run when a PR title or description is edited | 3.75 | 0 | n/a |
| | Address book | Branch image build | 2.5 | 2.5 | n/a |
| Java repo pipelines run their tests and Docker build once | Animals backend | Pull request check | 6.75 | 2.77 | Yes: 545 / 167 |
| | Plants backend | Pull request check | 4.0 | 1.7 | Yes: 134 / 46 |
| | INS backend | Pull request check | 5.3 | 2.13 | Yes: 166 / 42 |
| | Reference data | Pull request check | 4.75 | 2.13 | Yes: 149 / 63 |
| | Dynamics gateway | Pull request check | 7.5 | 4.03 | Yes: 296 / 34 |
| | Stub | Pull request check | 2.0 | 1.37 | Yes: 156 / 35 |
| Shared image build and end-to-end workflows run faster for every repo (workspace PR 178) | Workspace | E2E, slowest shard (3-run average) | 8.4 | 6.57 | Yes: 555 |
| | Workspace | E2E, whole run (3-run average) | 8.9 | 7.2 | Yes: 555 |
| | Tests repo | E2E, slowest shard (3-run average) | 8.78 | 6.55 | Yes: 555 |
| | Workspace and tests repo | Wait for the tests image after the stack is up, per shard | 1.0 | 0 | n/a |
| | Tests repo | Image build step, cache off (the default) | 1.73 | 1.73 | n/a |
| | Tests repo | Image build step, cache on, nothing changed | 1.73 | 0.08 | n/a |
| | Tests repo | Image build step, first build on a new branch from the base branch's cache | 2.38 | 0.92 | n/a |
| Animals and plants frontend pull requests go green sooner, the same way (animals PR 445, plants PR 127) | Animals frontend | FIT, push to merged report (3 shards) | 10.5 | 7.6 | Yes: 639 |
| | Plants frontend | FIT, push to merged report (3 shards) | 6.05 | 3.8 | Yes: 334 |
| | Animals frontend | Pull request check | 4.4 | 4.1 | Yes: unit tests unchanged |
| | Plants frontend | Pull request check | 3.6 | 3.0 | Yes: unit tests unchanged |
| | Animals frontend | Lighthouse, trigger to status (2 runners) | 10.9 | 9.95 | Yes: 32 pages |
| | Plants frontend | Lighthouse, trigger to status (2 runners) | 8.5 | 6.5 | Yes: 18 pages |
| | Animals frontend | Push to every check green, still on main's Lighthouse | 14.5 | 13.2 | n/a |
| | Plants frontend | Push to every check green, still on main's Lighthouse | 9.8 | 10.7 | n/a |
| Tests repo and INS frontend use the faster shared workflows (tests repo PR 69, INS frontend PR 68) | Tests repo | Branch image build, whole workflow, warm cache | 3.4 | 1.35 | Yes: 555 e2e |
| | Tests repo | Branch image build, amd64 job, warm cache | 3.3 | 0.62 | n/a |
| | Tests repo | Branch image build, cold (one-off after a Dockerfile or lockfile change) | 3.4 | 6.67 | n/a |
| | INS frontend | E2E, whole run (3 shards to 1) | 4.9 | 4.68 | Yes: 66 |
| | INS frontend | E2E, runner time across shard jobs | 9.5 | 3.4 | Yes: 66 |
| | INS frontend | FIT, in the Playwright container with no apt | 1.6 | 1.45 | Yes: 85 |
| | INS frontend | Pull request check | 2.6 | 1.3 | n/a |

**Not landed:** none.

### Still to check after merge

- **Animals push to green:** expect 11.6 to 12.2 once the split Lighthouse drives the PR status (target about 11). Today's 13.2 still used main's single-runner Lighthouse.
- **Plants push to green:** expect about 8.6. Today's 10.7 is not caused by this change: main's single-runner Lighthouse ran slower on this push (8.4 against 7.3).
- **Tests repo main writes the layer cache:** proven by config only. The first new branch after main's next publish should start warm.

### Review gap on the tests repo and INS frontend change

Both heads moved past the reviewed commits, and the later commits merged too. I can't confirm the review covered them.

- **Tests repo:** one later commit rebuilds the branch image from the warm layer cache.
- **INS frontend:** later commits make a new push cancel older runs, skip the "Test Docker Image Build" step on same-repo, non-Dependabot PRs, and keep the frontend bundle build.
- **Worth a look against "every check still runs":** the skipped Docker build step. The publish amd64 and arm64 jobs still build the image, and every check-level job still ran.

### Notes

- Java test counts are unit / integration tests. Before, every Java repo but the stub ran them twice on each push; now once.
- Every e2e run, before and after, ran 555 tests: 543 passed and 12 skipped. The 3 shards split them 125 / 194 / 236.
- A caller asking for 2 shards ran the same 555, split 277 / 278.
- Earlier tests repo runs showing 551 tests are dropped. Their tests image came from an older tests repo main.
- A new branch's first cached build used to start cold and took 4.4 to 4.75, slower than uncached. It now starts from main's cache. The first-build row was proved with the base branch as the writer, not main.
- **Frontend FIT:** animals 213 + 213 + 213 = 639, the same as main. Plants 112 + 111 + 111 = 334. One merged HTML report; the job fails if any shard did not pass.
- **Frontend Lighthouse:** split 16 + 16 (animals) and 9 + 9 (plants), merged into one report and one PR status. No stack teardown step runs.
- **Frontend Lighthouse "before"** is main's single runner on the same day. The weekly medians further down are 11.2 and 7.8.
- **Frontend FIT** now runs in the Playwright container, with no apt installs.
- **Frontend pull request check:** a new push cancels the old run. The bundle builds once. The Docker build test runs only where Publish Branch Image does not (Dependabot, forks, non-PR), so a broken Dockerfile still fails a check.
- **The two frontends' workflows** differ only in the docker tag, repository names and image name. The merge and audit scripts are byte-identical.
- Frontend unit tests: animals 3530 to 3537 passed, plants 2479 to 2484 (9 and 8 skipped on both sides). Plants gained 7 and lost 2, for a removed helper whose job other tests still cover.
- The review fixes landed before merge. The Lighthouse status goes red when the merge or publish fails, and a runner with no pages succeeds.
- **Tests repo cold build** is slower than no cache, because it writes the whole cache. It happens once per Dockerfile or lockfile change.
- **INS frontend e2e on 1 shard:** 60 e2e + 6 smoke, all passed. Smoke is still the slowest part, at 4.4 to 5.5 across runs.
- **INS frontend FIT:** the 5 to 12 minute apt stall, seen in about 1 run in 8, can no longer happen.
- **INS frontend keeps its explicit bundle build:** INS sets `ignore-scripts=true`, so `pretest` never runs and that step is its only bundle build (run 40707681876 failed a static-files test without it).

## How long a PR waits today

Time from push until every check is green, and what sets it.

| Repo | Time to green | Slowest path |
|---|---|---|
| Animals frontend | about 14.5 min | FIT tests; Lighthouse finishes at 13.4 |
| Tests repo (ins-tests) | about 12-13 min, often 20+ | Tests image build, then e2e |
| Plants frontend | 9.9 min median, 15 at p90 | Lighthouse; FIT when apt stalls |
| Java backends, stubs | about 8-11 min | Branch image build, then e2e |
| Workspace | about 9.5 min | Shared e2e on every PR |
| INS frontend | about 7 min | Branch image build, then e2e smoke |

## Slowest pipelines

| Repo | Workflow / job | Median (min) | p90 (min) | Runs a week | Parallelism |
|---|---|---|---|---|---|
| Animals frontend | Check PR / FIT tests | 13.8 | 14.6 | 66 | 1 runner, 4 workers, 636 tests, no shards |
| Animals frontend | Lighthouse (whole run) | 11.2 | 11.8 | 66 | 1 runner, 32 pages one at a time |
| Dynamics gateway | Publish on main | 10.5 | 13.0 | 2 | build, then arm64 and Sonar |
| Animals frontend | Publish on main | 10.0 | 11.8 | 9 | build, then arm64 |
| Animals backend | Publish on main | 9.8 | 11.0 | 3 | build, then arm64 and Sonar |
| Tests repo | E2E (whole run) | 8.9 | 10.8 | 85 | 3 shards + smoke |
| Animals frontend | E2E (whole run) | 8.9 | 9.5 | 66 | 3 shards + smoke |
| Workspace | E2E (whole run) | 8.0 | 22.0 | 75 | 3 shards + smoke |
| Dynamics gateway | Check PR | 7.8 | 8.3 | 3 | 2 jobs, one after the other |
| Animals backend | Check PR | 7.3 | 7.7 | 19 | 2 jobs, one after the other |
| Plants frontend | Check PR / FIT tests | 5.8 | 15.5 | 32 | 1 runner, 4 workers, 331 tests |
| Tests repo | Publish branch image | 3.3 | 21.7 | 79 | amd64 and arm64 in parallel |

The high p90s for plants FIT and the tests-repo image come from a slow Ubuntu package mirror, not from the work itself.

The plants prototype's check run (15.5 min median) is left out because nothing waits on it.

## Verified wins that shorten PR waiting time

Ranked by minutes saved a week.

| Win | Repo | Saved per run | Saved a week | Size |
|---|---|---|---|---|
| Cache the tests image build | Tests repo (shared workflow) | 3 min | 237 min | medium |
| Split Lighthouse in two (needs the FIT split) | Animals frontend | 2.3 min | 152 min | medium |
| Balance e2e shards by test time | Workspace (shared workflow) | 2 min | 150 min | small |
| Balance e2e shards (same change, tests repo runs) | Tests repo | 1.3 min | 111 min | small |
| Shard the FIT tests | Animals frontend | 0.9 min | 59 min | small |
| Pull the tests image while the stack starts | Workspace (shared workflow) | 0.75 min | 56 min | small |
| Split Lighthouse in two | Plants frontend | 1.5 min | 48 min | medium |
| Stop the Playwright install going to apt | INS frontend | 0.6 min | 21 min | small |
| Stop the Playwright install going to apt | Plants frontend | 0.5 min | 16 min | small |

Some wins overlap. Once workspace PRs skip e2e, shard balancing and the image pre-pull save less on workspace runs. Treat the weekly total as an upper bound.

## Verified wins that only free runners or shorten one check

| Win | Repo | Saved | Size |
|---|---|---|---|
| Run e2e on 1 shard, not 3 | INS frontend | about 230 runner-min a week | medium |
| Cancel superseded workspace e2e runs | Workspace | about 150 runner-min a week | small |
| Cancel superseded PR runs | Animals frontend | about 60 runner-min a week | small |
| Drop the duplicate Docker build in PR checks | Animals frontend | about 53 runner-min a week | small |
| Run Maven tests once, not twice, in PR checks | Reference data, INS backend, address book, plants backend | Check PR result 1.6-2.2 min sooner (plants backend: runner minutes only) | small |
| Drop the duplicate Docker build in PR checks | INS backend, address book | Check PR result 1.1-1.4 min sooner | small |
| Drop the duplicate Docker build in PR checks | Stub | about 5 runner-min a week | small |
| Stop rerunning PR checks on title or description edits | Animals backend, address book, reference data, INS backend, dynamics gateway, stub | about 45 runner-min a week in all | small |
| Drop the test run after the image is published | Animals backend, dynamics gateway | Publish on main 2.2-2.9 min sooner | small |

Every Java repo has the same template shape, so these are worth doing together as one Java-repo tidy.

## Top wins

### Cache the tests image build

**Now:** the shared branch-image workflow builds with no cache. In about 1 run in 6, the apt step stalls for 18-33 minutes, and e2e can't start until the build finishes.

**Change:** turn on layer caching for branch builds, using a registry cache on ECR for each architecture. Keep the main-branch publish uncached so OS patches still land.

**Risk:** this workflow serves every repo, so add it as an opt-in and try it on the tests repo first. The build role may need extra ECR permissions.

### Shard FIT and split Lighthouse in both frontends

**Now:**

- Animals FIT runs 636 tests on one runner in about 14 minutes, about 2.4 minutes under its 15-minute timeout.
- Animals Lighthouse checks 32 pages one at a time and finishes about 13.4 minutes after the push.
- On most plants pushes, Lighthouse (18 pages) is the last check to finish, about 2 minutes after e2e.

**Change:** one approach for both frontends (animals PR 445, plants PR 127).

- Shard FIT and merge the shard reports into one HTML report.
- Split Lighthouse's pages across 2 runners and merge the two result lists before publishing.
- In plants, also drop the teardown step and merge the publish and status jobs.

**Risk:**

- In animals, either change on its own barely moves the PR, because the other job becomes the slowest.
- In plants, three steps read a single result list and now merge two. A third Lighthouse runner would add nothing, because e2e then becomes the limit.
- The new shards cost about 500 runner-minutes a week. The animals FIT split also heads off the coming timeout failure.

**Measured:** see Results at the top, including what is still to check after merge.

### Balance the e2e shards by test time

**Now:** Playwright splits shards by test count, so the slow animals tests all land on one shard. That shard runs about 5.8 minutes of tests, against 2.6-3.1 on the others, and so sets the run time.

**Change:** weight the existing 3 shards with Playwright's `PWTEST_SHARD_WEIGHTS` setting in the shared e2e workflow. This needs no extra runner. A plain 4th shard without weights would only save about 1.5 minutes.

**Risk:** the setting is undocumented and could change in a Playwright release. Fixed weights drift as tests are added, so re-check shard times a few weeks after the change.

### Pull the tests image while the stack starts

**Now:** each e2e shard pulls the tests image only after the stack is healthy. That adds about 50 seconds while the network sits idle.

**Change:** start the pull in the background before the stack starts, and wait for it before the stack check.

**Risk:** low. Unpacking the image may slow the stack's health checks by a few seconds.

### Stop the Playwright install going to apt

**Now:** in the plants and INS frontends, about 1 run in 8 hits a slow Ubuntu mirror. The browser install then takes 5-12 minutes.

**Change:** run the FIT job in the official Playwright container. INS could instead drop `--with-deps`. Caching the browser alone does not avoid apt.

**Risk:** low. The image tag must match the Playwright version. Pulling the container adds 30-60 seconds, but not on the slowest path.

## Built: shared image build and e2e workflows

One workspace pull request (#178), now merged, changes both shared workflows for every repo that calls them.

- **Image build:** a caller can ask for a layer cache, kept per architecture. A caller that does not ask builds with no cache, as before.
- **Main writes the cache, never reads it:** a second optional input, `layer-cache-write-only`, builds with no cache, writes the per-architecture cache and publishes no image. A main-branch caller turns it on so a new branch's first build starts warm.
- **E2E:** shards are weighted `9:14:17` by test time. Each shard pulls the tests image while the stack starts. A new push cancels the pull request's run still going. A caller can choose its shard count, from 1 to 6; the default stays 3.

### Timings, before and after

From real GitHub Actions runs. Shards are listed 1 / 2 / 3.

- **Workspace before:** run 40660708421, the branch's first commit, with main's e2e workflow.
- **Tests repo before:** run 40591306779, main's workflow on a tests repo pull request.
- **After:** the final workflow head `65b5d4f7`. Workspace run 40676426355, attempts 1, 2 and 3. Tests repo runs 40683360528, 40684700235 and 40685734346, on a probe tests image built from tests repo main `4b8ce0b2`.

| Check | Before | After, 3-run average |
|---|---|---|
| Workspace e2e shard jobs | 505 / 390 / 389 s | 381 / 394 / 383 s |
| Workspace e2e, Run E2E step | 307 / 214 / 216 s | 231 / 253 / 241 s |
| Workspace e2e, slowest shard job | 505 s | 394 s |
| Workspace e2e, gap between shard jobs | 116 s | 13 s |
| Workspace e2e, whole run | 533 s | 434 s |
| Tests repo e2e shard jobs | 527 / 352 / 386 s | 393 / 384 / 380 s |
| Tests repo e2e, Run E2E step | 353 / 173 / 202 s | 245 / 244 / 241 s |
| Tests repo e2e, slowest shard job | 527 s | 393 s |
| Tests repo e2e, gap between shard jobs | 175 s | 14 s |
| Wait for the tests image after the stack is up | 60 / 49 / 48 s | 0 to 1 s |
| Tests image branch build, cache off (the default) | 99 / 104 s (run 40660933023) | 104 / 88 s (run 40681188246) |
| Tests image branch build, cache on, nothing changed | 99 / 104 s | 7 / 5 s and 4 / 5 s (runs 40681725690, 40682040666) |
| Tests image branch build, cache on, first build on a new branch | 143 / 114 s (run 40492746852, uncached) | 55 / 53 s (run 40677133126) |

The build figures are amd64 / arm64.

Every run, one by one (shard job / Run E2E step, in seconds):

| Run | Shard 1 | Shard 2 | Shard 3 |
|---|---|---|---|
| Workspace 40676426355, attempt 1 | 359 / 214 | 412 / 272 | 396 / 258 |
| Workspace 40676426355, attempt 2 | 394 / 229 | 368 / 223 | 353 / 213 |
| Workspace 40676426355, attempt 3 | 389 / 251 | 402 / 263 | 400 / 253 |
| Tests repo 40683360528 | 393 / 241 | 409 / 268 | 351 / 210 |
| Tests repo 40684700235 | 394 / 250 | 387 / 253 | 392 / 255 |
| Tests repo 40685734346 | 393 / 245 | 357 / 210 | 396 / 257 |

- **No shard averages more than a minute longer than the others,** on either run. The largest average gaps are 14 s on the job and 21 s on the Run E2E step.
- **One run on its own can be over by runner noise:** the largest single-run gap was 58 s, on the Run E2E step of workspace attempt 1 and on tests repo run 40683360528. No weights were changed.
- **Earlier tests repo runs 40677141440, 40678151001 and 40679256438 are not used.** Their probe tests image was built from an older tests repo main, so they ran 551 tests, not 555.

### The same tests still run

Each run lists 125 / 194 / 236 tests on its 3 shards.

- **Tests repo runs:** 555 tests, 543 passed and 12 skipped. Before run 40591306779 ran the same 555.
- **Workspace runs:** 555 tests, 543 passed and 12 skipped. Main's workflow on another workspace pull request today (run 40675632516) ran the same 555.
- **A caller asking for 2 shards (tests repo run 40686938766):** 2 shard jobs, 277 / 278 tests, the same 555 in all. No shard weights were applied, as weights are only for 3 shards. Its shard jobs took 600 / 427 s.

### A new branch starts from main's cache

The `type=gha` cache is scoped by branch. A run reads its own branch's cache first, then the default branch's, and a pull request run also reads its base branch's.

- **Before:** main never wrote a cache, so a new branch's first cached build started cold. It took 266 / 285 s, about 3 minutes slower than uncached, because it wrote the whole cache.
- **After:** a main-branch caller with `layer-cache-write-only` writes the cache, with no read and no image. A new branch's first build reads it.

Proved on real runs in the tests repo, with two short-lived probe branches, never merged and since deleted:

1. **Writer, run 40676505540:** a `refs/heads` dispatch build with `layer-cache-write-only`. The build ran `--no-cache --output type=cacheonly --cache-to type=gha,…`, with no `--cache-from`, and skipped the branch-tag publish.
2. **Reader, run 40677133126:** a new branch with no cache of its own, on a pull request into the writer's branch. It imported the writer's cache and every layer was `CACHED`, apt and `npm ci` included. The build step took 55 / 53 s against 143 / 114 s uncached, and the whole workflow 132 s against 214 s.

**What it could not prove, and the trade-off:** the writer was the reader's base branch, not `main`.

- A run on `main` can only use a workflow file already merged to `main`, and the tests repo's main publish does not call the shared workflow yet.
- GitHub applies the same access rule to the default branch as to a pull request's base branch, so the result carries over. It is not yet seen on `main` itself.
- Turning the write on is the tests repo row: its push to `main` calls the shared branch-image workflow with `layer-cache-write-only: true`. That row checks the first build on a new pull request branch against main's cache.
- That row has landed (tests repo PR 69). The first new branch after main's next publish is the check on `main` itself. Callers leave `layer-cache` off by default, so nothing is slower without it.

### How the weights were chosen

| Weights | Tests per shard | Workspace shard jobs | Tests repo shard jobs |
|---|---|---|---|
| none (main) | equal by count | 505 / 390 / 389 s (run 40660708421) | 527 / 352 / 386 s (run 40591306779) |
| `6:7:9` | 150 / 176 / 225 | 448 / 373 / 380 s (run 40665836673) | 33 s gap (run 40667323235) |
| `5:7:9` | 131 / 184 / 236 | 402 / 365 / 372 s (run 40670704694) | 397 / 341 / 422 s (run 40670753743) |
| `3:5:6` | 118 / 197 / 236 | 335 / 405 / 397 s (run 40672060222) | 360 / 407 / 397 s (run 40672064921) |
| `9:14:17` | 124 / 193 / 234 | 398 / 415 / 396 s (run 40673169353) | 353 / 400 / 411 s (run 40673170663) |

- **Only `9:14:17` kept every shard within a minute of the others on both runs.** Its 3-run averages on the final head are in the timings above.
- A shard's time varies by up to about 40 seconds between runs with the same tests, so one run can be over by noise. In the first tests repo `9:14:17` run (40673170663) the Run E2E steps took 204 / 226 / 267 s.

### Cancelled runs

A superseded run now ends cancelled, not failed.

- **Before:** in runs 40664275676 and 40664436813, the report merge still started after the cancel and failed.
- **After:** in run 40670642553, the report merge and deploy never started, and the run shows cancelled.

### Re-check in a few weeks

- **Shard weights:** re-check the per-shard e2e times in a few weeks, and after any Playwright upgrade. Playwright's shard weighting (`PWTEST_SHARD_WEIGHTS`) is undocumented, and fixed weights drift as tests are added.
- **Shard count from a caller:** the input is a number. A caller that passes it as a string (for example from a string `workflow_dispatch` input) fails, so convert it first.

The tests repo probe branches used to prove this from a caller have been deleted, and the reader's draft pull request (tests repo PR 66) is closed.

## Settled

- **Skip e2e on workspace PRs that don't touch the stack: dropped.** Sam, 27 Oct: don't stop running tests; workspace PRs aren't a hot path.

## Rejected on checking

- **Animals backend: Maven tests run twice in PR checks.** The duplication is real, but e2e finishes later, so PRs wait no less. It is worth including in the Java tidy to save runner minutes.
- **Animals backend, reference data, dynamics gateway: duplicate Docker build in PR checks.** Rejected for the same reason. In dynamics gateway the step is also the only Dockerfile check for its weekly dependabot PRs.
- **Dynamics gateway: Maven tests run twice in PR checks.** E2E ends about 2 minutes after the check on every sampled run.
- **Plants prototype: shard the walkthroughs and FIT tests.** The workflow records a decision to shard only once the walkthroughs pass 25 minutes; they take 9. Nothing waits on the run.
- **Plants prototype: use 4 FIT workers instead of 2.** The walkthroughs finish later on every run, so the run would be no shorter.

## Also found while measuring

- Unit and integration suites take under 3 minutes everywhere, so sharding them gains nothing.
- The animals admin, defra-id stub, performance tests and schemas repos have no clear wins.
- Some e2e runs show hours from start to finish. That is time waiting for a runner or a later re-run, not test time.

The backlog is at `findings.json` beside this file: 29 verified items, ranked, and 7 rejected.
