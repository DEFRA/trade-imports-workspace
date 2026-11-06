# Runs 1, 2 and 3: EUDPA-674

Run 1: `workareas/reviews/EUDPA-674/`, session `9fcc4267-ce11-463f-842e-f9f202ba8531`.
Run 2: `workareas/reviews/EUDPA-674-simple/`, session `7698737b-d017-46e5-be20-a617ec124858`.
Run 3: `workareas/reviews/EUDPA-674-run3/`, session `a93197fe-e00e-42b5-b9b4-97b6c3931cb6`
(the review ran as a forked skill inside that session).
Same four PRs at the same commits. All three runs gave the verdict CONCERNS.

## Tokens

| | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Total | 91.8M | 18.9M | 12.5M |
| Largest single call | 316k | 195k | 211k (consistency) |
| Consistency reviewer (Opus) | (counted with the reviewers) | 7.3M, 54 calls | 2.8M, 19 calls |
| Review skill's own context | 26.4M (Opus) | 6.6M, 68 calls (Opus) | 4.5M, 52 calls (**Sonnet**) |
| 13 group reviewers | about 62M | 4.9M | 4.8M |
| Open findings | 80 | 47 | 51 |
| Tokens per open finding | 1.15M | 0.40M | 0.24M |

Run 3's total includes 0.3M for the main session (Opus), which only started
the skill and wrote this comparison.

- The skill's context now runs on Sonnet (`c5518b94` worked).
- The consistency reviewer kept to its budget of about 25 calls: 19 calls,
  down from 54.
- The group reviewers cost the same as in run 2, even though test reviewers
  now get the source under test and source reviewers may open 5 files. The
  most expensive was the address-book Java tests 1 group: 1.0M over 19 calls.

## Findings

Matched means the same file and the same problem. Partly matched means the
same file and a related problem, or one run's merged item covering the other
run's single finding. I did this matching by hand from the items files, and
it is stricter than run 2's matching, so the run 1 columns are not exactly
comparable with `run2-comparison.md`.

### Run 3 against run 1

| Repo | Run 1 open | Run 3 open | Matched | Partly matched | Run 1 only | Run 3 only |
|---|---|---|---|---|---|---|
| address-book | 37 | 17 | 4 | 5 | 28 | 8 |
| animals-frontend | 14 | 10 | 5 | 4 | 5 | 1 |
| ins-frontend | 14 | 7 | 5 | 0 | 9 | 2 |
| workspace | 15 | 17 | 2 | 2 | 11 | 13 |
| **Total** | **80** | **51** | **16** | **11** | **53** | **24** |

### Run 3 against run 2

| Repo | Run 2 open | Run 3 open | Matched | Partly matched | Run 2 only | Run 3 only |
|---|---|---|---|---|---|---|
| address-book | 16 | 17 | 10 | 0 | 6 | 7 |
| animals-frontend | 10 | 10 | 4 | 1 | 5 | 5 |
| ins-frontend | 11 | 7 | 6 | 0 | 5 | 1 |
| workspace | 10 | 17 | 4 | 2 | 4 | 11 |
| **Total** | **47** | **51** | **24** | **3** | **20** | **24** |

Severity: 27 Major and 24 Minor, against run 1's almost all Major. As in run
2, run 3 often grades the same finding lower than run 1 did.

### Run 1's checked findings

| Run 1 finding | Run 3 | Still in the code? |
|---|---|---|
| address-book #19 `MongoAvailability.java:56`: AVAILABLE when any server `isOk()` | **Missed.** #9 and #14 cover only the UNKNOWN branch's tests | Yes, lines 56-58 |
| address-book #11 `EmfMeterRegistry.java:106,122`: gauges and summaries always `Unit.COUNT` | **Missed.** #11 only notes that the counter's Count unit is never asserted | Yes, lines 106 and 122 |
| address-book #41 `MongoCommandMetricsTest.java:35`: 5 of 13 commands tested | **Missed** | Not rechecked |
| animals-frontend #3 `to-wire-address.js:18`: unresolved country gives `countryCode: undefined` with no log | **Missed.** #1 and #2 on this file are about a comment and scope | Yes, line 9 returns `undefined` |
| workspace #16 `spring-boot.md:39,469,1010` | **Found** (#15 and #16, merged into #20, all three places) | — |
| workspace #17 `unit.md:250` | **Found** (#17, merged into #20) | — |
| workspace #18 `CLAUDE.md:50` still says "Written from the EUDPA-632 spike" | **Missed** | Yes, line 50 |
| workspace #13 `METRICS.md:84` copy/write split | **Missed** | Not rechecked |

### Run 2's checked findings

| Run 2 finding | Run 3 |
|---|---|
| workspace #9 `DASHBOARD.md:65` "Average, times 100" against `percentunit` | **Kept** (#8, now Minor) |
| workspace #5 `alerts.template.md` `<database>` never filled | **Kept** (#4) |
| address-book #2 `recordCall` takes a 0 or 1 `int` as the failure flag | **Lost.** #8 says only that no test pins the 1 and 0 values |
| ins-frontend #4 `package.json` drops the uuid, brace-expansion and ws overrides | **Lost.** The Haiku infra reviewer marked `package.json` SAFE |
| animals-frontend #3 and #6, the two scope Criticals (judged not valid) | **Not repeated.** The parent reported the scope mismatch as an observation instead. This is better than run 2. The handover expected the Criticals again, but run 2's comparison had already judged them wrong |

### Coverage gaps and line numbers

- **4 `coverage-gap` findings**, all in address-book (#8, #9, #11 and #14).
  Run 2 had none and run 1 had three. #14 matches run 1 #39. #11 is related
  to run 1 #37, but about other meter types. Run 1 #41 is still missed.
- No coverage gaps in the three frontend test files. Their diffs in
  ins-frontend#43 are only formatting and a sequential-run option, so
  "SAFE" is reasonable there.
- **Line numbers are file lines now.** The ones I checked match the
  clones (`ExternalCallMetrics.java:34`, `to-wire-address.js:3`,
  `trade-imports-ins-frontend.md:51`). Run 2's diff offsets (1604, 2218,
  3350) are gone.

### New in run 3, checked

- Real: workspace #19 `docs/repos/trade-imports-ins-frontend.md:51` still
  lists `@defra/cdp-auditing`, which ins-frontend#43 removes from
  `package.json`. This is a cross-repo stale statement, which is exactly
  what `stale-search.sh` was added to find.
- Questionable: workspace #11 applies the Bash hygiene rule for agents
  ("no grep -n to inspect files") to a step the skill tells the agent to
  run. Not checked further.

## What changed and why

1. **Stale statements are mostly back.** `stale-search.sh` found all of
   `spring-boot.md` and `unit.md`, and one new stale line in another repo's
   doc page. It still missed `CLAUDE.md:50`. That line is a statement about
   provenance rather than a deleted name, so a search for terms would not
   find it.
2. **Coverage gaps are partly back:** 4, against 3 in run 1 and 0 in run 2.
   That came from giving test reviewers the source under test.
3. **Cross-file correctness is still missing.** The replica-set check, the
   gauge units and the unlogged `countryCode: undefined` are all in files
   the source reviewers were given, yet none was reported. The 5-file read
   budget did not make these findings appear. The source reviewers produced
   comment, naming and structure findings, not behaviour.
4. **Logging is still thin in address-book.** Run 1's #2, #4, #12 and #18,
   and run 2's #3 (failure logged at INFO), are all missed.
5. **Haiku infra lost a real finding** (the removed `package.json`
   overrides) that Sonnet found in run 2.
6. **The consistency reviewer missed a shared root.** Six workspace history
   findings (#2, #3, #5, #7, #12, #13) are one rule, "no provenance
   narration", which run 2 merged into a single item (#19). Run 3 left them
   as six.

## Verdict

Run 3 is cheaper than run 2 (12.5M against 18.9M) and better in two
places: stale statements and coverage gaps. It also writes file line
numbers, and it no longer raises the false scope Criticals. It still misses
the findings that matter most: the source-correctness bugs in
`MongoAvailability`, `EmfMeterRegistry` and `to-wire-address.js`. Tokens are
not the problem now, so changing the consistency reviewer's model (the
handover's next lever) would not help.

## Next

- Make the source reviewers look for correctness. Their instructions in
  `references/types/` should ask "what input makes this line wrong?" for
  each changed branch, and name the categories correctness, logging and
  error handling first. Then check the address-book Java source groups
  against run 1 #19, #11 and animals-frontend #3.
- Move the infra reviewer for `package.json` and lockfiles to Sonnet, or
  give it a step that lists overrides the diff removes.
- Give the consistency reviewer a step that merges findings sharing one
  rule across files (the provenance findings).
- Then do run 4 on the same four PRs.

Caveat: run 1 is not ground truth, and the matching is by hand. I checked
the run 1 and run 2 findings listed above against the run 3 clones. The
rest are matched only on file, line and wording.
