# Runs 1 to 5: EUDPA-674

Run 1: `workareas/reviews/EUDPA-674/`, session `9fcc4267-ce11-463f-842e-f9f202ba8531`.
Run 2: `workareas/reviews/EUDPA-674-simple/`, session `7698737b-d017-46e5-be20-a617ec124858`.
Run 3: `workareas/reviews/EUDPA-674-run3/`, session `a93197fe-e00e-42b5-b9b4-97b6c3931cb6`.
Run 4: `workareas/reviews/EUDPA-674-run4/`, session `35c792b7-40d8-40bf-81d6-fa4fce5f0af2`.
Run 5: `workareas/reviews/EUDPA-674-run5/`, session `dc4299e7-f973-4c8e-b431-42f4cccf7046`
(the review ran as a forked skill inside that session, as a trial run with nothing posted).
Same four PRs at the same commits (address-book `360100e`, animals-frontend
`7c86c83`, ins-frontend `81f04bb`, workspace `eb2936f`), the same 13 groups,
and the same verdict, CONCERNS, in all five runs.

What changed for run 5: `review-java-source` and `review-node-source` run on
Opus, and `_source.md` makes reading what the changed lines depend on a step
(`7e12fada`, `5b3ae88c`).

## Tokens

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|---|---|---|---|---|---|
| Total | 91.8M | 18.9M | 12.5M | 10.3M | **14.1M** |
| Largest single call | 316k | 195k | 211k (consistency) | 156k (workspace skills, Haiku) | 173k (consistency) |
| Consistency reviewer (Opus) | (with the reviewers) | 7.3M, 54 calls | 2.8M, 19 calls | 2.0M, 19 calls | 2.6M, 24 calls |
| Review skill's own context (Sonnet from run 3) | 26.4M | 6.6M, 68 calls | 4.5M, 52 calls | 3.8M, 45 calls | **6.1M, 64 calls** |
| 13 group reviewers | about 62M | 4.9M | 4.8M | 4.0M | 4.8M |
| Main session (Opus) | — | — | — | 0.46M | 0.68M |
| Open findings | 80 | 47 | 51 | 50 | 61 |
| Tokens per open finding | 1.15M | 0.40M | 0.24M | 0.21M | 0.23M |

From `tools/review/token-usage.sh dc4299e7-f973-4c8e-b431-42f4cccf7046
--by-agent`, taken before this comparison was written. The total includes
the main session, which started the skill, measured it and did the matching
below.

- **The four source groups cost what the handover expected.** On Opus they
  took 1.78M against run 4's 1.18M on Sonnet (+0.60M):
  - address-book 1: 0.70M over 12 calls (run 4: 0.35M)
  - address-book 2: 0.43M (0.38M)
  - animals-frontend: 0.39M (0.28M)
  - ins-frontend: 0.26M (0.17M)
- **Most of the rise is the skill's own context: +2.3M.** About 15 of its 64
  calls (calls 27 to 41 in its transcript) went on cleaning up duplicate
  findings that one reviewer wrote (see "Duplicate findings" below): finding
  them, a dedupe script it was not allowed to run, three `review-mark.sh`
  attempts, and a `sed` to fix the merge notes. Each of those calls re-sends
  a context of about 100k tokens. It also wrote the full per-repo review
  files this time (summary, positive observations, test coverage, risk),
  which run 4 had left short.
- The consistency reviewer took 5 more calls than in run 4 (2.6M against
  2.0M).
- The other group reviewers were about the same as in run 4. The workspace
  skills group (Haiku) is still the most expensive non-source group: 0.84M
  over 7 calls.

Without the clean-up the run would have cost about 12.5M: run 4 plus the
Opus source groups, plus a little for the consistency reviewer.

## Findings

Matched means the same file and the same problem. Partly matched means the
same file and a related problem, or one run's merged item covering the other
run's single finding. I matched by hand from the items files, using the same
rules as `run4-comparison.md`. Merged items, including the 11 duplicates,
are left out on both sides.

### Run 5 against run 1

| Repo | Run 1 open | Run 5 open | Matched | Partly matched | Run 1 only | Run 5 only |
|---|---|---|---|---|---|---|
| address-book | 37 | 20 | 12 | 2 | 23 | 6 |
| animals-frontend | 14 | 19 | 9 | 2 | 4 | 8 |
| ins-frontend | 14 | 9 | 5 | 1 | 8 | 3 |
| workspace | 15 | 13 | 4 | 2 | 8 | 7 |
| **Total** | **80** | **61** | **30** | **7** | **43** | **24** |

Run 4 against run 1 was 23 matched and 9 partly matched, and run 3's was 16
and 11. In address-book, run 5 found 12 of run 1's findings against run 4's 7.
The new ones are run 1 #2, #4, #10, #11, #21 and #24 (two logging, two meter
correctness, two comments).

### Run 5 against run 4

| Repo | Run 4 open | Run 5 open | Matched | Partly matched | Run 4 only | Run 5 only |
|---|---|---|---|---|---|---|
| address-book | 16 | 20 | 6 | 2 | 9 | 12 |
| animals-frontend | 13 | 19 | 10 | 1 | 3 | 8 |
| ins-frontend | 10 | 9 | 7 | 0 | 3 | 2 |
| workspace | 11 | 13 | 7 | 1 | 3 | 5 |
| **Total** | **50** | **61** | **30** | **4** | **18** | **27** |

Partly matched counts run 5's items. On the run 4 side, address-book #18 and
workspace #7 are partly matched, and animals-frontend #8 is covered by both
run 5 #13 (matched) and #17 (partly).

Severity: 2 Critical, 40 Major and 19 Minor (run 4: 0, 31 and 19). One of
the two Criticals is not valid (animals-frontend #18, below).

### The handover's questions

| Finding | Run 4 | Run 5 | Still in the code? |
|---|---|---|---|
| address-book run 1 #11 `EmfMeterRegistry.java:106,122`: gauges and summaries always `Unit.COUNT` | Missed | **Found** (#9, Major correctness, "units dropped", citing `application.yml`) | Yes |
| animals-frontend run 1 #3 `to-wire-address.js:9`: unresolved country gives `countryCode: undefined` with no log | Missed | **Found** (#1, Major logging, "silent fallback", citing `countries/index.js:37`) | Yes |
| address-book run 1 #19 `MongoAvailability.java:56`: replica-set availability | Found | **Kept** (#14, now Critical) | Yes |
| address-book run 2 #2: `recordCall` takes a 0 or 1 `int` as the failure flag | Found (#4) | **Lost.** `ExternalCallMetrics.java` has a logging, a naming and a comment item, none on line 44. The reviewer read no other file for it | Yes, line 44 `int failures`, called with 0 and 1 at lines 36 and 41 |
| ins-frontend run 2 #4: `package.json` drops four overrides | Found (#4) | **Kept** (#5, Major security) | — |
| Workspace provenance findings merged into one item | One item (#18, from 2) | **One item** (#23, from 5: `SKILL.md:14`, `ALERTS.md:5`, `DASHBOARD.md:4`, `LOGGING.md:81`, `METRICS.md:65`) | — |
| Source test: `OperatorService.java:80` counts a search before the query runs | — | **Missed.** The reviewer read `OperatorController.java` and `application.yml` and wrote "no correctness bug in the new search-type switch" | **Yes.** `addressMetrics.recordSearch(searchType)` is line 81, `queryPage(...)` is line 83, so a query that throws has already been counted |
| Source test: `AddressSearchType.java:8` `QUERY_AND_COUNTRY` names an OR query | — | **Missed.** The only item on the file is #1, the tag values having two homes | **Yes.** `QUERY_AND_COUNTRY` calls `repository.searchByQueryOrAnyCountryCode` (`OperatorService.java:124-126`) |
| Source test: run 1 #10, long task timers dropped | — | **Found** (#8, citing `application.yml:105`) | Yes |
| Source test: run 1 #3, an operator against address names | — | **Found** (#3, naming) | Yes |

So the two bugs the handover named both came back. The two extra finds from
the source test did not: Opus in a full run did not repeat what Opus in the
two-group test found. The run 4 `int` flag was also lost. Each source group
is now non-deterministic around the line where it stops looking.

The provenance merge now takes in `ALERTS.md:5`, `DASHBOARD.md:4` and
`LOGGING.md:81`. Run 4 checked the diff and found those lines were not added
by it, so run 5 is reporting lines from before the change. I could not check
this again: the review clone is shallow and has no parent of `eb2936f`.

### Not valid: animals-frontend #18 (Critical)

`species-entry.js:48` "Absorbed behaviour change": the reviewer says
EUDPA-674 asks for metrics, but PR #300 changes what the frontend persists,
and the fix is to move those commits to their own ticket. PR #300 is
EUDPA-368. It is in the review only because the replay keeps run 1's PR set,
which the consistency reviewer also said. This is the same false scope
Critical that run 2 raised and run 3 dropped. It also makes the
animals-frontend verdict RISKY.

The source brief tells the reviewer the ticket is EUDPA-674. It does not say
that a PR in the set belongs to another ticket. A real review would leave
#300 out (`prs.sh --own`), so this only happens in a replay. The replay's
brief should still name each PR's own ticket.

### Duplicate findings (a tool bug, not a reviewer one)

The animals-frontend node-source reviewer ran `file-review-write.sh` once
and it succeeded. Then it reworded one fix with `sed` and ran the script
again on the same list. `file-review-write.sh` adds each finding through
`file-review-add-item.sh` and never clears the file's earlier findings, so
the second run wrote all 11 findings again. The parent marked the 11 copies
Merged, but the per-file JSONs still hold both copies, so the animals-frontend
File Analysis Summary counts those files twice.

The script says it is all or nothing for one call, and does not say it
cannot be run twice. Running it again on the same list should replace each
file's findings, not add to them.

### Other run 4 findings that were lost

- **All address-book test findings bar three.** The two java-tests groups
  wrote 3 open items (#18, #19 and #22, all duplication). Run 4 had 9,
  including three `coverage-gap` items (#9, #15, #16), the
  `EmfMeterRegistryIT` over-claim (#10) and the two-behaviour test (#14).
  These reviewers did not change between runs 4 and 5 (Sonnet). The cause
  is that **they do not read their whole brief** (see "Why the test
  reviewers miss findings" below).
- ins-frontend #6 (`engines.npm` and `packageManager`), #7 (`add-a-page.md`
  paths) and #10 (Redis tests pinning a constructor call). The ins node
  tests and ins skills docs groups wrote no findings.
- animals-frontend #2 (coverage gap on the `??` order) and #14 (the
  `transitedCountries` names against codes, which run 4 checked and found
  real).
- address-book #5 (`DEPENDENCY_TAG` constant beside a literal) and #7
  (`Optional<Boolean>`).

### Why the test reviewers miss findings

The briefs are too big to read in one call, so each reviewer reads only the
parts it picks. Checked from the reviewers' transcripts:

| Brief | Lines | Size | How it was read |
|---|---|---|---|
| address-book java-tests 1 | 7,423 | 294 KB | `Read` refused it (over 256 KB). The reviewer then ran `sed` on lines 134-216, 2876-3200, 3587-4196, 4292-4380, 5099-5282 and 5928-6139 |
| address-book java-tests 2 | 4,611 | 178 KB | `Read` with no range (the first 2,000 lines, all guides), then 1333-2333 and 2855-4615 |
| animals-frontend node-tests | 2,591 | 110 KB | `Read`, then four ranges between 1429 and 2602 |
| ins-frontend node-tests | 2,995 | 120 KB | `Read`, then four short ranges between 1442 and 2996 |

- In address-book java-tests 1, the group's files run from line 2855 and
  the "Source under test" section from line 5928 to the end, line 7423. The
  reviewer read about 1,500 of those 4,570 lines, and only the first 211
  lines of the source. It still marked 7 of its 9 files SAFE, for example
  `EmfMeterRegistryTest.java`: "covers units, dimensions …" (run 1 #36 and #37
  are coverage gaps in that file).
- The first 2,850 lines of every test brief are the instructions, the house
  rules, the ticket and the guides (`unit.md`, `integration.md`,
  `modern-java.md`, `spring-data-mongodb.md` and so on). When a reviewer
  saves effort, it skips the code under review.
- The run 4 briefs are the same size, to within one line. Run 4's reviewers
  read more of them, by chance. So the change in coverage gaps between runs
  3, 4 and 5 shows how much each reviewer chose to read, not a model or
  instruction difference.
- The source briefs have the same problem (4,197 to 4,756 lines). The
  address-book source 1 reviewer read 560 lines, then 3297-4757. Source 2,
  which holds `OperatorService` and `AddressSearchType`, read its brief
  through a saved tool-result file. That may explain why the two
  source-test finds did not come back.

### New in run 5

- Run 1 finds back in address-book: the already-deleted early return with no
  log (#4, run 1 #2), metrics enabled or disabled with no log (#6, run 1 #4),
  `MongoCommandMetrics` Javadoc (#15, run 1 #21) and the `logback-spring.xml`
  comment (#17, run 1 #24 and run 3 #5).
- ins-frontend #2, the jq allowlist program inside the workflow YAML. Run 3
  had this and run 4 lost it.
- animals-frontend #31, `unlessBlank` repeating the blank-to-undefined rule
  in `commodity.js:16`. This is run 1 #18.
- Plausible, not checked: address-book #2 (service `@Timed` timers repeat the
  controller's), animals-frontend #20 (the first unit's scalars mapped
  twice; the comment on lines 32-36 says that is on purpose for a later
  mapper, so this may not be valid), workspace #5 (the database alert is
  proved only with a lowered threshold, which is run 1 #7), workspace #10
  (`LOGGING.md` drops the metrics-disabled test row).

### Coverage gaps and line numbers

- **2 `coverage-gap` findings**, both in workspace docs (#5 and #10). None is
  on a test file. Run 4 had 5 (four address-book, one animals-frontend) and
  run 3 had 4. Coverage gaps are thin again, so the handover's next step
  applies: run the two test groups on each model.
- `ac-table.sh` printed 35 rows (run 4: 28) for about 9 criteria. The
  repeated-criteria side issue is getting worse.
- Line numbers are file lines. The ones I checked match the clones
  (`EmfMeterRegistry.java:106`, `to-wire-address.js:9`,
  `MongoAvailability.java:56`, `OperatorService.java:81`,
  `species-entry.js:48`).

## What changed and why

1. **Opus source reviewers find bugs that need another file.** `Unit.COUNT`
   and `countryCode: undefined` both came back, each citing the file it
   needed, as they did in the source test. The long-task-timer drop came
   back too.
2. **They do not find every bug every time.** The search counted before the
   query, the OR named AND, and the `int` flag were all missed. The source
   test found the first two with the same instructions and model, and run 4
   found the third on Sonnet. One run per group gives a sample, not a full
   list.
3. **Test reviewers produced fewer findings because they read less of
   their briefs.** Their instructions and model did not change.
   Address-book test findings fell from 9 to 3 and coverage gaps from 5 to
   0 in test files. The briefs are 110-294 KB, and the reviewers read only
   parts of them.
4. **A tool that adds again on a second run cost 2M+ tokens.** The reviewer
   did nothing wrong by correcting its findings file. The writer should
   replace a file's findings on a re-run.
5. **A replay still gives false scope findings on other tickets' PRs.** Run
   3 avoided it, but not because anything was fixed.

## Verdict

Run 5 is the best match with run 1 so far: 30 matched and 7 partly matched,
against run 4's 23 and 9. It found both bugs that run 4 missed. It cost
14.1M, against 10.3M. About 0.6M of that is the Opus source groups (inside
the handover's 0.5-1M estimate) and about 2.3M is the parent cleaning up
duplicates that a tool bug wrote. It lost the `int` flag and most address-book
test findings, and raised a Critical on #300 that is not valid.

## Next

- **First, make every brief readable in full.** Keep each brief under
  Read's 256 KB and 2,000-line limits, and put the group's files and the
  source under test first, with the guides after them. Better still, cut
  the guides down to the sections that apply to the file type, or move them
  to separate files the reviewer opens only when needed. Have
  `write-briefs.sh` refuse (or split the group) when a brief would go over
  the limit, and add that to `review-groups.test.sh`. Then rerun the test
  and source groups before drawing any more model conclusions from them.
- `file-review-write.sh`: replace each listed file's findings instead of
  adding to them, so running it again on the same list gives the same file.
  Add a test that runs it twice.
- `write-briefs.sh`: name each PR's own ticket in the brief when a PR in the
  set belongs to another ticket (a replay). Tell the reviewer that scope
  against this ticket is not a finding for that PR.
- Test reviewers, once the briefs fit: run the two address-book java-tests
  groups and the animals-frontend node-tests group on Sonnet and on Opus,
  the same way as the source test, and compare coverage gaps against run 4's #9, #15, #16
  and animals-frontend #2.
- Source reviewers: before changing anything, run the address-book source 2
  group (which holds `OperatorService` and `AddressSearchType`) twice more on
  Opus and see how often the two source-test finds come back. If they rarely
  come back, add "a metric recorded before the operation it counts has
  succeeded" and "a name that says AND for an OR query" as general shapes
  ("counted before it happened", "name says the opposite of the call it
  makes").
- Side issue, worse now: `ac-table.sh` printed 35 rows for about 9 criteria.

Caveat: run 1 is not ground truth, and the matching is by hand. I checked
the findings in the handover's questions table and animals-frontend #18
against the run 5 clones. The rest are matched only on file, line and
wording.
