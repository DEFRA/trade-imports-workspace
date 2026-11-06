# Runs 1 to 4: EUDPA-674

Run 1: `workareas/reviews/EUDPA-674/`, session `9fcc4267-ce11-463f-842e-f9f202ba8531`.
Run 2: `workareas/reviews/EUDPA-674-simple/`, session `7698737b-d017-46e5-be20-a617ec124858`.
Run 3: `workareas/reviews/EUDPA-674-run3/`, session `a93197fe-e00e-42b5-b9b4-97b6c3931cb6`.
Run 4: `workareas/reviews/EUDPA-674-run4/`, session `35c792b7-40d8-40bf-81d6-fa4fce5f0af2`
(the review ran as a forked skill inside that session).
Same four PRs at the same commits (address-book `360100e`, animals-frontend
`7c86c83`, ins-frontend `81f04bb`, workspace `eb2936f`). All four runs gave
the verdict CONCERNS.

## Tokens

| | Run 1 | Run 2 | Run 3 | Run 4 |
|---|---|---|---|---|
| Total | 91.8M | 18.9M | 12.5M | **10.3M** |
| Largest single call | 316k | 195k | 211k (consistency) | 156k (workspace skills group, Haiku) |
| Consistency reviewer (Opus) | (counted with the reviewers) | 7.3M, 54 calls | 2.8M, 19 calls | 2.0M, 19 calls |
| Review skill's own context | 26.4M (Opus) | 6.6M, 68 calls (Opus) | 4.5M, 52 calls (Sonnet) | 3.8M, 45 calls (Sonnet) |
| 13 group reviewers | about 62M | 4.9M | 4.8M | 4.0M |
| Open findings | 80 | 47 | 51 | 50 |
| Tokens per open finding | 1.15M | 0.40M | 0.24M | 0.21M |

From `tools/review/token-usage.sh 35c792b7-40d8-40bf-81d6-fa4fce5f0af2
--by-agent`, taken before this comparison was written. The total includes
0.46M for the main session (Opus), which started the skill and measured it.

- The handover expected the source groups and infra to cost more. They did
  not: the 13 groups fell from 4.8M to 4.0M.
  - Source groups: address-book 1 0.35M, address-book 2 0.38M,
    animals-frontend 0.28M, ins-frontend 0.17M.
  - Infra groups, now on Sonnet: address-book 0.12M, animals-frontend 0.18M,
    ins-frontend 0.18M.
- The most expensive group was address-book Java tests 2: 0.63M over 9 calls.
- The workspace skills group (Haiku) made the largest call of the run, 156k,
  in only 5 calls (0.53M).

## Findings

Matched means the same file and the same problem. Partly matched means the
same file and a related problem, or one run's merged item covering the other
run's single finding. I matched by hand from the items files, using the same
rules as `run3-comparison.md`.

### Run 4 against run 1

| Repo | Run 1 open | Run 4 open | Matched | Partly matched | Run 1 only | Run 4 only |
|---|---|---|---|---|---|---|
| address-book | 37 | 16 | 7 | 4 | 26 | 5 |
| animals-frontend | 14 | 13 | 7 | 3 | 5 | 3 |
| ins-frontend | 14 | 10 | 5 | 0 | 9 | 5 |
| workspace | 15 | 11 | 4 | 2 | 8 | 5 |
| **Total** | **80** | **50** | **23** | **9** | **48** | **18** |

Run 3 against run 1 was 16 matched and 11 partly matched.

### Run 4 against run 3

| Repo | Run 3 open | Run 4 open | Matched | Partly matched | Run 3 only | Run 4 only |
|---|---|---|---|---|---|---|
| address-book | 17 | 16 | 7 | 2 | 8 | 7 |
| animals-frontend | 10 | 13 | 8 | 1 | 1 | 5 |
| ins-frontend | 7 | 10 | 5 | 0 | 2 | 5 |
| workspace | 17 | 11 | 6 | 1 | 8 | 4 |
| **Total** | **51** | **50** | **26** | **4** | **19** | **21** |

Workspace #18 (provenance) matches three run 3 items (#2, #3, #13), so the
run 3 side has 8 matched there. Animals-frontend #7 matches run 3 #5 and
partly covers #6.

Severity: 31 Major and 19 Minor (run 3: 27 and 24).

### The handover's questions

| Finding | Run 3 | Run 4 | Still in the code? |
|---|---|---|---|
| address-book run 1 #19 `MongoAvailability.java:56`: AVAILABLE when any server `isOk()` | Missed | **Found** (#6, Major correctness, with the replica-set scenario) | Yes, line 56 |
| address-book run 1 #11 `EmfMeterRegistry.java:106,122`: gauges and summaries always `Unit.COUNT` | Missed | **Missed.** The only item on this file is #1, a Javadoc comment | Yes, lines 106 and 122 |
| address-book run 2 #2: `recordCall` takes a 0 or 1 `int` as the failure flag | Lost | **Found** (#4, "a flag in disguise") | — |
| animals-frontend run 1 #3 `to-wire-address.js:9`: unresolved country gives `countryCode: undefined` with no log | Missed | **Missed.** #2 is a coverage gap on the `??` order on lines 17-18; #3 is a test title | Yes, line 9 |
| ins-frontend run 2 #4: `package.json` drops the uuid, brace-expansion and ws overrides | Lost (Haiku infra) | **Found** (#4, Major security, all four overrides named) | — |
| Workspace provenance findings merged into one item | 6 separate items | **One item** (#18, from #2 and #10) | — |
| workspace run 1 #18 `CLAUDE.md:50` "Written from the EUDPA-632 spike" | Missed | **Missed**, as expected | Yes, line 50 |

On the provenance merge: run 4 raised only two provenance findings, and both
went into #18. Run 3's other four (`ALERTS.md:5`, `DASHBOARD.md:4`,
`LOGGING.md:34` and parts of `SKILL.md:50`) were on lines the diff does not
add. I checked the workspace diff: every added provenance line (`SKILL.md`
lines 11 and 25, `METRICS.md` lines 65, 135 and 183) is covered by #18. So
run 4 is right to leave the older lines alone.

### Run 1 and run 2 findings that came back

- address-book run 1 #16 / run 2 #3: `ExternalCallMetrics.java:54` logs a
  failed call at INFO (#2). This is the new "failure at the success level"
  check.
- address-book run 1 #41: `MongoCommandMetricsTest.java:35` tests 5 of 13
  known operations (#16, coverage gap). Run 3 missed it.
- address-book run 1 #29: `EmfMeterRegistryIT.java:66` claims every metric
  but creates only three of them (#10).
- workspace run 1 #13: `METRICS.md:84` copy/write split (#11). Run 3 missed
  it.
- workspace run 2 #5 / run 3 #4: `<database>` never filled (#6).

### Run 3 findings that were lost

- workspace run 3 #8 / run 2 #9: `DASHBOARD.md:65` "Average, times 100"
  against `percentunit`. This was kept from run 2 to run 3, and is gone now.
- address-book run 3 #8, #9 and #11: three coverage gaps (the
  `recordFailure` IT, the `MongoAvailabilityIT` branches, the meter types
  `EmfMeterRegistry` drops). Run 4 found three different ones instead (#9,
  #15, #16).
- ins-frontend run 3 #1 and #3: the jq allowlist program inside the workflow
  YAML, and jq failing on a `.jsonc` comment.
- address-book run 3 #5: the stale `logback-spring.xml:17` comment.

### New in run 4

- Real, checked: animals-frontend #14. `notification-mapper.test.js:309`
  expects `transitedCountries: ['France', 'Belgium']` because its input
  (line 85) uses names, while the contract test and the oracles use codes
  (`['FR', 'BE']`). The mapper passes the value straight through, so the
  test cannot tell names from codes.
- Plausible, not checked: workspace #17 (the skill cites address-book as the
  reference with no branch, and EUDPA-674 is not on `main`). The skill flagged
  this itself as depending on whether the change has merged.
- Plausible, not checked: address-book #9 (the update not-found tests do not
  assert that no change counter is recorded, while delete has such a test).
- New in ins-frontend: `engines.npm` disagrees with `packageManager` (#6),
  `add-a-page.md` paths (#7), and the Redis tests pinning a constructor call
  (#10). Run 1 had the `neostandard` pre-release (#5); run 3 did not.

### Coverage gaps and line numbers

- **5 `coverage-gap` findings**: address-book #9, #15 and #16, and
  animals-frontend #2. Run 3 had 4, all in address-book. Run 4 is the first
  run with a gap in a frontend test file.
- Line numbers are still file lines. The ones I checked match the clones
  (`MongoAvailability.java:56`, `to-wire-address.js:3`,
  `notification-mapper.test.js:309`).

## What changed and why

1. **The correctness step works for single-file bugs.** The `_source.md`
   step that walks an input through each changed branch found the replica-set
   bug and the `int` flag. Both are visible in one method.
2. **Bugs that need knowledge from outside the file are still missed.**
   - `Unit.COUNT` needs to know that Micrometer meters carry a base unit.
   - `countryCode: undefined` needs to know that the backend wants a code
     and that a silent fallback hides a failed lookup. "Silent fallback" is
     in the bug-shape list, but the reviewer reported the same line as a
     comment and a coverage gap instead.
3. **Sonnet infra got the overrides back.** Moving `review-infra` to Sonnet
   plus the removed-entries check found it, and the infra groups cost
   0.12-0.18M each.
4. **The merge step works.** Every "one rule, several findings" item is
   correct, and the provenance lines are one item.
5. **Logging is partly back.** Failure at INFO is found. Run 1's other
   address-book logging findings (#2, #4, #12, #18) are still missed.
6. **The parent wrote short per-repo files.** `review.{repo}.md` holds a
   summary and the items table, with no positive observations or test
   coverage section. That costs nothing in a trial run, but a posted review
   would need them.

## Verdict

Run 4 is the cheapest run (10.3M against run 3's 12.5M) and the best match
with run 1 so far (23 matched and 9 partly matched, against run 3's 16 and
11). It found 3 of the 5 named findings it was meant to recover: the
replica-set bug, the `int` flag and the removed overrides. It also merged
the provenance findings. It still misses `Unit.COUNT` and
`countryCode: undefined`, and it lost run 3's `DASHBOARD.md:65` unit finding.

## Next

- Bug shapes: add "a unit or type the library already carries is replaced by
  a constant" next to "units dropped". Then check whether the address-book
  source 1 group finds `EmfMeterRegistry.java:106`.
- Make "silent fallback" more specific: a lookup that can fail returns
  `undefined` or a default with no log, and the caller sends that value on.
- Have the parent write the full per-repo review files, or say in `SKILL.md`
  that a trial run writes the short form.
- Side issue seen again: `ac-table.sh` repeats criteria. It needs the shared
  AC id from the handover's side issues.

Caveat: run 1 is not ground truth, and the matching is by hand. I checked
the findings in the handover's questions table against the run 4 clones, and
animals-frontend #14 against the code. The rest are matched only on file,
line and wording.
