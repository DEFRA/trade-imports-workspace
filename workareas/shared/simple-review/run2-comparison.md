# Run 1 against run 2: EUDPA-674

Run 1: `workareas/reviews/EUDPA-674/`, session `9fcc4267-ce11-463f-842e-f9f202ba8531`.
Run 2: `workareas/reviews/EUDPA-674-simple/`, session `7698737b-d017-46e5-be20-a617ec124858`.
Same four PRs at the same commits. Both runs gave the verdict CONCERNS.

## Tokens

| | Run 1 | Run 2 |
|---|---|---|
| Total | 91.8M | 18.9M |
| Largest single call | 316k | 195k |
| Consistency reviewer (Opus) | (counted with the reviewers) | 7.3M, 54 calls |
| Review skill's own context (Opus, not Sonnet) | 26.4M | 6.6M, 68 calls |
| 13 group reviewers | about 62M | 4.9M |
| Tokens per open finding | 1.15M | 0.40M |

## Findings

Open items are those not merged into an owner item. Matched means the same
file and the same problem.

| Repo | Run 1 open | Run 2 open | Matched | Partly matched | Run 1 only | Run 2 only |
|---|---|---|---|---|---|---|
| address-book | 37 | 16 | 9 | 2 | 26 | 6 |
| animals-frontend | 14 | 10 | 7 | 3 | 4 | 4 |
| ins-frontend | 14 | 11 | 6 | 0 | 8 | 5 |
| workspace | 15 | 10 | 4 | 0 | 11 | 7 |
| **Total** | **80** | **47** | **26** | **5** | **49** | **22** |

Run 2 found about a third of run 1's open findings (26 of 80, or 31 of 80
counting the partial matches).

### Checked against the code: run 1 only, all real

- address-book `MongoAvailability.java:56`: AVAILABLE when any server
  `isOk()`. A secondary that is up while the primary is down reads as
  available, so the dependency alert the AC asks for never fires (run 1 #19).
- address-book `EmfMeterRegistry.java:106,122`: gauges and summaries are
  always `Unit.COUNT`, so the jvm.memory gauges (bytes) are recorded as Count
  (#11).
- address-book `MongoCommandMetricsTest.java:35`: lists 5 of the 13 known
  commands, so dropping `delete` or `findAndModify` breaks no test (#41).
- animals-frontend `to-wire-address.js`: an unresolved country name becomes
  `countryCode: undefined` with no log (#3).
- workspace `docs/best-practices/java/spring-boot.md:39,469,1010` and
  `testing/unit.md:250,512` still teach the `EmfMetricsPublisher` the skill
  now deletes (#16, #17).
- workspace `METRICS.md:84`: `ExternalCallMetrics` sits under "Write for the
  service" yet says "Copy it as it is". `ExternalCall` is in neither list
  (#13). The rest of #13 is wrong: line 237 does name
  `CapturingEmfEnvironment`.

### Checked against the code: run 2 only

- Real: workspace `DASHBOARD.md:65` says Failure rate is "`Average`, times
  100", but the template panel uses `percentunit` with a 0 to 1 range, so it
  shows 100 times too large (run 2 #9).
- Real: workspace `alerts.template.md` uses `<database>`, which the ALERTS.md
  Build step never fills (#5).
- Real: address-book `ExternalCallMetrics.java:36,41`: `recordCall` takes a
  0 or 1 `int` as the failure flag (#2).
- Real, and overlaps run 1 #7: ins-frontend `package.json` drops the uuid,
  brace-expansion and ws overrides, which threatens the new audit gate (#4).
- Not valid: both Criticals on animals-frontend (#3, #6) come from reviewing
  EUDPA-368's PR against EUDPA-674. Both also carry diff-offset line
  numbers.

## What run 2 lost, and why

1. **No coverage gaps at all.** Run 1 had three (`EmfMeterRegistryTest` #37,
   `MongoAvailabilityTest` #39, `MongoCommandMetricsTest` #41). Each needs
   the source under test. Run 2's test reviewers read no source, so none of
   them could see one.
2. **Cross-file correctness.** The replica-set check, the units against
   `application.yml`, the characterisation oracle that skips the purge step
   (animals-frontend #16) and the missing ExternalCall class each need a
   second file. Source reviewers read only their brief.
3. **Statements made untrue outside the diff.** Run 1's consistency pass
   found stale text in `spring-boot.md`, `unit.md` and `CLAUDE.md`. Run 2's
   consistency reviewer, on Opus with 7.3M tokens, found none of it.
4. **Logging.** 4 of address-book's 5 logging findings were missed (#2, #4,
   #12, #18).
5. **Severity and depth.** Run 2 often grades the same finding lower (the
   LongTaskTimer finding is Major in run 1 and Minor in run 2) and writes
   thinner fixes ("logged once or deliberately absent").

Run 2 also found 22 findings run 1 did not. All four checked were real
except the two scope Criticals.

## Verdict

The token cut cost report quality. Run 2 keeps the shallow, single-file
findings: comments, naming and duplication inside one file. It loses most
coverage gaps and cross-file correctness findings, which matter most. The
handover's own rule ("loosen this only if run 2 misses real structure,
duplication or correctness findings") applies.

## Next

- Give test reviewers the source files under test (the same group's
  `src/main` twins), so they can report coverage gaps.
- Let source reviewers open files the brief names, in the same repo, with a
  read budget.
- Have the consistency reviewer search the rest of the repo for text the
  diff makes untrue, and find out why it took 54 calls.
- Make the skill set the parent's model: it ran on Opus.
- Then do run 3, and compare it with both runs.

Caveat: run 1 is not ground truth. About 10 of the 71 unmatched findings
were checked against the code. The rest are matched only on file, line and
wording.
