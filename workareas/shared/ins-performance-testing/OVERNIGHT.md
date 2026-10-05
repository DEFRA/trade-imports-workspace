# Overnight build, 1 to 2 October 2026

Sam said to push on overnight and not stop for reviews. This file lists every review point and decision for him in the morning.

## Rules for the night

- When a review point (`gate`) stops the run, relaunch it straight away and list the gate here.
- When a stop needs Sam (access or tokens, `ci-red`, `main-red`, a refused plan), set that increment to `deferred` with a note, make its dependents depend on it, relaunch, and list it here.
- When a stop is environmental (sleep, a flaky stack, `agent-budget`), confirm the cause, relaunch, and note it here.
- Keeping the Mac awake: at 22:38 my `caffeinate` hit the 2-hour limit for background jobs, which cannot be raised, so it was not restarted. Sam's Amphetamine session and Claude Code's own `caffeinate` (renewed every 300s while it works) keep the Mac awake on mains power. The earlier sleep was a forced low-power sleep at 1% battery. Sam confirmed Amphetamine is on for the night.

## Runs

| Run | Started | Stopped | Why |
|---|---|---|---|
| wf_d0483941-1e9 | 15:46 | 18:11 | Killed by hand: inc-005 assumed distinct identities |
| wf_05999026-263 | 18:14 | 20:37 | `baseline-red`: the laptop slept on a flat battery (19:23 to 20:31) |
| wf_3535c982-c45 | 20:38 | about 22:00 | `done-failed`: inc-005 merged (perf-tests PR #5) but its agent was denied `bash …/transition-ticket.sh`. I moved EUDPA-653 to Done and marked the row done by hand |
| wf_4ecac251-972 | 22:19 | 00:34 BST | Branch lifecycle. inc-006 landed (perf-tests 8933d7d, CI green). inc-007 stopped at `ladder-red` on a plants E2E date-boundary bug its changes do not touch (Decision 5). Its work is stashed, not committed. Waited until 00:00 UTC to relaunch, because the bug only shows between 23:00 and 00:00 UTC |
| wf_851ced57-13d | 01:00 BST | about 04:15 | inc-007 landed (perf-tests 07bb6b1, stub 42e8cd6, idstub f9b8fcd; CI green; 10 of 10 confirmed findings fixed). inc-008 landed (perf-tests 28b03bd, stub ac5b1de, idstub 5af7b49; CI green; 11 of 13 fixed, 1 rejected, 1 a duplicate). Stopped at `branch-failed` before inc-009: the auto-mode classifier denied the branch check's `git merge --ff-only` in reference-data, dynamics-gateway and ins-tests. I checked all 9 repos: each was on the branch, clean and level with origin. Environmental, so relaunched |
| wf_b47d1324-43c | 04:21 | about 06:10 | inc-009 landed (perf-tests 3678bef, CI green; 17 findings confirmed and ruled fix-now, grouped into 13 fixes, all applied). Stopped at its `gate`. Relaunched at once, as agreed |
| wf_eed7b3ed-1bc | 06:12 | about 08:30 | inc-019 landed (perf-tests 0492f10, CI green; 7 confirmed findings, 5 fixed). inc-010 stopped at `stack-held` in its consistency review: Docker Desktop had stopped, so the daemon was unreachable and the run could not give back its lease. Cause unknown. inc-010's attempt is preserved, not committed. At 08:36 I restarted Docker Desktop, cleared the dead run's lease (no containers were left) and relaunched |
| wf_0fffa64e-db0 | 08:37 | stopped by hand after inc-010 | inc-010 landed (perf-tests 8d9a4b3: spike and recovery, and the 8-hour endurance run). Sam asked to pause after this increment to go over everything, so the run was stopped as it began choosing the next increment. Lease released, stack down |

## How the night builds (Sam, about 22:10: "dont merge but stack up the changes on a branch")

From inc-006 on, every increment commits to `feat/EUDPA-641-ins-performance-testing` in each repo it touches. Each repo has one open draft PR, and nothing merges. Under this lifecycle the loop raises **no Jira tickets**, so increments built tonight have none.

| Repo | Draft PR |
|---|---|
| trade-imports-performance-tests | https://github.com/DEFRA/trade-imports-performance-tests/pull/6 |
| trade-imports-stub | https://github.com/DEFRA/trade-imports-stub/pull/16 |
| trade-imports-defra-id-stub | https://github.com/DEFRA/trade-imports-defra-id-stub/pull/10 |
| trade-imports-ins-frontend | https://github.com/DEFRA/trade-imports-ins-frontend/pull/40 |
| trade-imports-animals-frontend | https://github.com/DEFRA/trade-imports-animals-frontend/pull/384 |
| trade-imports-plants-frontend | https://github.com/DEFRA/trade-imports-plants-frontend/pull/84 |
| trade-imports-reference-data | https://github.com/DEFRA/trade-imports-reference-data/pull/23 |
| trade-imports-dynamics-gateway | https://github.com/DEFRA/trade-imports-dynamics-gateway/pull/26 |

trade-imports-ins-tests has the branch but no PR, because no row builds it. Each PR opens with one empty commit, because GitHub will not open a PR with no changes.

## Review points for Sam

1. **inc-009, the first design-target run (perf-tests 3678bef on the overnight branch).** The gate text: "Look at the first design-target run before anything builds on it: the achieved rates and request mix against the volumetrics figures, which thresholds passed or failed and by how much, generator and stub headroom, the stub profiles each run named, and whether gating on the two-journey figures with the with-IUU profile reported is the right split." The runs from the ladder are in `logs/inc-009-ladder-sustained-peak.log`, `logs/inc-009-ladder-sustained-peak-with-iuu.log` and `logs/inc-009-ladder-p99-burst.log`. inc-010, inc-012 and inc-017 build on it overnight, so a "no" here means reworking them as well. All 17 fix-now findings were fixed (13 grouped fixes). Every threshold passed, but these are local runs: zero-delay stubs, shortened sessions, and every run marked "untrusted" because the Defra ID stub does not report its load. The workspace dev stack runs the Defra ID stub from its published image, not local source, so the overnight idstub changes are not exercised locally.

## Rulings since the morning

- **IUU is out of scope (Sam, 2 October 2026):** "we're not covering that in any way with this test suite". New row inc-020, next in line, removes the with-IUU profile from everything built. IUU wording is stripped from inc-012 and inc-013. The backlog now has 20 rows: 10 done, 8 to do, 2 blocked.

## Decisions for Sam

1. **DECIDED (Sam, 2 October): yes.** **inc-005 and inc-006 were rewritten for one stubbed user.** After you said there is no real auth, the criterion for distinct identities was removed and idstub was dropped from inc-005. Its Jira ticket, EUDPA-653, was retitled. Confirm the rewrite reads right.
2. **Merging the overnight branch.** The draft PRs above hold everything built tonight. inc-014 changes production code in five services (metrics for calls outside the boundary).
3. **Jira for tonight's increments.** The branch lifecycle raises none. Raise them after the fact, or let the branch's PRs stand for them?
4. **The loop's done stage.** inc-005's agent ran the ticket script as `bash <script>`, which the allowlist does not match, so the call was denied. Fix: give the done prompt the exact command form, or allowlist the `bash` form.
5. **A plants date bug on the BST midnight hour.** The test `trade-imports-ins-tests` plants `review.spec.ts:159` expects "Date of notification" to be the Europe/London day. At 00:29 BST on 2 October the plants confirmation page showed "1 October 2026", the UTC day. So between 23:00 and 00:00 UTC (all of British Summer Time) the app shows yesterday's date. It looks like a real bug in plants date handling, not a test fault. It is outside this programme's repos, so nothing was changed. It needs a ticket. The loop's agent was right not to loosen the assertion.
6. **Permission denials stop unattended runs.** Three tonight: the done stage's `bash <script>` form, inc-007's ladder `curl`, and the branch check's `git merge --ff-only` (refused by the auto-mode classifier in three repos). Each needed a relaunch or a hand fix. Should these commands be allowlisted for unattended build runs?
   - **The ladder's live-stack curl was denied.** inc-007's plan check `curl http://localhost:8087/latency-profiles` hit a permission prompt with nobody there. The agent did not work round it, and unit tests cover the values. Allowlist `curl http://localhost:*` for unattended runs?
7. **Docker Desktop stopped at about 08:30, during inc-010.** Cause unknown: nothing obvious in the logs at a glance. Worth checking whether it ran out of memory (its VM has 32 GB) or updated itself.
8. **Layer 1 of the gate:** start each repo's FIT without waiting for its unit rungs (saves about 45s), or give FIT more browsers?

## Uncommitted

The backlog edits, the report.md fix and the loop's done statuses are not committed yet. They go into a workspace PR at the end of the night.
