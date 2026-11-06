# Review skill redesign (simple review): handover

Branch: `chore/NO_JIRA-simple-review` in the workspace repo. Not pushed.

## Why

Run 1 (current review skill on EUDPA-674, all Opus, 4 repos, 67 files) used
**91.8M tokens**: session `9fcc4267-ce11-463f-842e-f9f202ba8531`.

- Parent 26.4M (155 calls, context peaked at 316k).
- Reviewers about 62M: searching 36%, fetching 21%, writing 19%.
- About half of everything was start-up material re-sent on every call.

The baseline workarea is `workareas/reviews/EUDPA-674/`. The user's own
earlier review is in `workareas/reviews/EUDPA-674-original/`.

## Decisions

- One reviewer per file type, with source and tests separate. Up to 10 files
  per reviewer, sorted by path and shared out evenly.
- Source reviewers read only their brief. Loosen this only if run 2 misses
  real structure, duplication or correctness findings.
- Test reviewers read the ticket, the acceptance criteria and the tests, and
  no source. They take over `ac-check`.
- The consistency reviewer owns the checks that need two files. There is no
  cross-repo check: E2E owns that.
- Models: Opus for source (since run 5) and consistency. Sonnet for
  tests, UI, E2E, spec, infra (since run 4) and the parent. Haiku for perf
  and skills. Source moved to Opus because, given the same briefs and the
  same reads, Sonnet missed both source bugs and Opus found them (see
  "Source reviewer test" below). Writing the inference into the
  instructions instead would teach the reviewer these two bug shapes, not
  the next one.
- Reviewers report back in one line. All writes are batched.

## Done (commits)

- `7dc67e56`: `token-usage.sh` and a start-up test agent. A custom agent
  starts at 17.3k tokens against 44.6k, has no skill list, and can write
  files.
- `a5f0a771`: batched writes: `--from` on `review-add-item.sh` and
  `review-mark.sh`, and `file-review-write.sh`. Tests passed.
- `b32183f5`: `routing.json` `reviewTypes` and `fileRoutes`,
  `plan-groups.sh` and `write-briefs.sh`. Tests passed.
- `50f0debc`: 11 agents in `.claude/agents/review-*.md`, instructions in
  `references/types/`, consistency reviewer steps 3c and 3d. Tests passed
  (`review-agents.test.sh`: 79 checks, `review-groups.test.sh`: 30).

- `4dc275d7`: `ac-table.sh` (Step 6 table from `ac/*.json`);
  `verify-consistency.sh` also needs `consistency/{repo}.items.json` when
  that folder exists. `review-gates.test.sh`: 16 checks, passed.
- `7db13024`: `SKILL.md` Fresh flow (Step 4), with the user's 100→2
  parallel change. Trial run ("trial run" / "don't post") skips Step 7.
  Refresh stays on `FILE_REVIEWER.md`.

- `afd8cb6e`, `22ecc749`: `prs.sh --own` (review only the ticket's own
  PRs) and `start-review.sh --id … --same-as …` (replay an earlier
  review's PRs at its commits).

### Run 2 (done)

Workarea `workareas/reviews/EUDPA-674-simple/`, session
`7698737b-d017-46e5-be20-a617ec124858`. **18.9M tokens** against run 1's
91.8M, the same verdict (CONCERNS), but **26 of run 1's 80 open findings**
(31 with partial matches) and **no coverage gaps at all**. The full
comparison, with the findings checked against the code, is in
[`run2-comparison.md`](run2-comparison.md). Where the tokens went:
consistency reviewer 7.3M (Opus, 54 calls), the skill's own context 6.6M
(Opus, not Sonnet), 13 group reviewers 4.9M.

Why it lost findings:

- Test reviewers read no source, so they could not see an untested branch.
- Source reviewers read only their brief, so they missed every finding that
  needs a second file (Mongo replica-set availability, gauge units against
  `application.yml`, the characterisation oracle that skips the purge).
- The consistency reviewer searched only `.claude/skills/service-observability`
  for the deleted `EmfMetricsPublisher`, reported `docs/` as searched, and
  missed five stale lines in `docs/best-practices/java/`.

### Run 3 changes (done)

- `fcfaf782`: test briefs carry the **source under test** (`FooTest`,
  `FooTests` and `FooIT` cover `Foo.java`; `foo.test.js` covers `foo.js`),
  set by `sourceUnderTest` in `routing.json`. Test reviewers judge the
  criteria and titles first, then report `coverage-gap` findings on the
  branches of that source. Source reviewers may **read up to 5 files** a
  changed line depends on, with Read, and no searching. Every file in a
  brief is printed **with line numbers**, and `line` must be that number
  (run 2 gave diff positions such as 2933). `review-groups.test.sh`: 39
  checks, passed.
- `4a0de6b0`: `stale-search.sh ID TERM…` searches every pinned clone, plus
  the workspace guides, `openspec/specs` and `CLAUDE.md` when the workspace
  repo is not in the review, for every term in one call, and lists the
  places it searched. `CONSISTENCY_REVIEWER.md` step 3b now uses it and
  copies that list. The reviewer also gets a call budget of about 25, the
  allowed categories (run 2 wrote `docs`, so the whole batch was refused)
  and integer line numbers. `stale-search.test.sh`: 15 checks, passed.
- The mode commit after it: `replay-prs.sh`, `prepare-review-local.sh`,
  `batch-lib.sh` and `finding-categories.sh` are executable. The
  `bash replay-prs.sh` workaround in `prepare-review.sh` is reverted.
- `c5518b94`: the review skill sets `model: sonnet`. That applies to every
  mode, the walker and the batch implementor included.

### Run 3 (done)

Workarea `workareas/reviews/EUDPA-674-run3/`, session
`a93197fe-e00e-42b5-b9b4-97b6c3931cb6` (the review ran as a forked skill
inside it). **12.5M tokens** against run 2's 18.9M, and the verdict was
again CONCERNS. It found 51 open findings. The full comparison is in
[`run3-comparison.md`](run3-comparison.md).

- Better: stale statements (all of `spring-boot.md` and `unit.md`, plus a
  stale doc page in another repo), 4 `coverage-gap` findings, file line
  numbers, and no false scope Criticals on #300. Run 2's comparison had
  already judged those Criticals not valid.
- The skill ran on Sonnet (4.5M, 52 calls). The consistency reviewer took
  19 calls (2.8M), down from 54.
- Still missed: the source-correctness bugs (address-book #19 and #11,
  animals-frontend #3), `CLAUDE.md:50`, and address-book's logging
  findings. Lost from run 2: the `recordCall` int flag and the removed
  `package.json` overrides (the Haiku infra reviewer marked it SAFE). Six
  workspace provenance findings were not merged into one.

### Run 4 changes (done, in the commit after run 3)

- `references/types/_source.md`: a correctness step that names an input
  and walks it through each changed branch, a list of bug shapes (any or
  all, silent fallback, units dropped, flag in disguise, library
  meaning), and behaviour before comments. Logging adds "failure at the
  success level".
- `references/types/infra.md`: a removed-entries check for overrides,
  resolutions, allowlists and security settings. `review-infra` moves
  from Haiku to Sonnet.
- `SKILL.md` merge step: items in several files that break the same house
  rule the same way (provenance narration) are one root.

### Run 4 (done)

Workarea `workareas/reviews/EUDPA-674-run4/`, session
`35c792b7-40d8-40bf-81d6-fa4fce5f0af2`. **10.3M tokens**, CONCERNS, 50
open findings. Full comparison in [`run4-comparison.md`](run4-comparison.md).
Found the replica-set bug, the `recordCall` int flag and the removed
overrides, and merged the provenance findings into one. Missed
`Unit.COUNT` and `countryCode: undefined`.

Why: run 1 found both by reading another file (`application.yml:94-98`,
`countries/index.js`). Run 4's source reviewers read nothing beyond the
brief: `_core.md` told every reviewer the brief held "everything you
need" and to "leave it" otherwise, and `_source.md` allowed 5 reads per
group only "when you cannot judge the line without it".

### Source reviewer test (done)

`7e12fada`: `_source.md` makes reading what the changed lines depend on a
step (the callee, the config that drives it, the types, the callers; up to
3 files per source file, no search), and every file's `reason` names what
was read. `_core.md` no longer says "leave it".

Then only the two groups that held the bugs were run, in workarea
`workareas/reviews/EUDPA-674-src-test/` (results kept in
`sonnet-findings/` and `opus-findings/`):

| | Sonnet | Opus |
|---|---|---|
| `Unit.COUNT` | Missed: read the sibling timer classes, not `application.yml` | Found, citing `application.yml:94-98` |
| `countryCode: undefined` | Missed, though it read `countries/index.js` | Found, citing `countries/index.js:37` |
| Also | — | Run 1 #10 (long task timers dropped), #3 (Operator against address names), the replica-set bug again |
| Tokens | 0.50M + 0.27M | 0.70M + 0.28M |

So `review-java-source` and `review-node-source` now run on Opus.

### Run 5 (done)

Workarea `workareas/reviews/EUDPA-674-run5/`, session
`dc4299e7-f973-4c8e-b431-42f4cccf7046` (a forked skill, trial run).
**14.1M tokens**, CONCERNS, 61 open findings. Full comparison in
[`run5-comparison.md`](run5-comparison.md).

- Best match with run 1 so far: 30 matched and 7 partly matched (run 4:
  23 and 9). Found `Unit.COUNT`, `countryCode: undefined` and the
  long-task-timer drop. Kept the replica-set bug, the overrides and the
  provenance merge.
- Lost the `int` flag. Missed both of the source test's extra finds
  (`OperatorService.java:81` counts the search before the query;
  `QUERY_AND_COUNTRY` calls an OR query). Both are still in the code.
- Opus source groups: +0.6M (1.78M against 1.18M). The skill's own context
  rose by 2.3M (6.1M, 64 calls), mostly cleaning up duplicate findings.
- **Duplicates:** `file-review-write.sh` adds each finding again on a
  second run over the same list. The animals-frontend source reviewer
  reworded a fix and re-ran it, so 11 findings were written twice.
- **False Critical:** animals-frontend #18 says #300 changes things outside
  EUDPA-674. #300 is EUDPA-368: the replay keeps run 1's PR set and the
  brief does not say so.
- **Why the test findings (and coverage gaps) are thin:** the briefs are
  too big to read. Test briefs are 110-294 KB and 2,600-7,400 lines.
  `Read` refuses anything over 256 KB, and with no range it returns only
  2,000 lines. The first 2,850 lines are instructions and guides, and the
  files and the source under test come after them. The address-book
  java-tests 1 reviewer read about 1,500 of its 4,570 lines of code. Run
  4's briefs were the same size, so earlier differences in coverage gaps
  came from how much each reviewer chose to read. Source briefs have the
  same problem (4,200-4,800 lines).

## Next

A new script needs its executable bit before an agent can run it. Policy
blocks `chmod` in a session and denies `bash <script>`, and a hook runs a
changed script only once it is committed. So stage a new script with
`git add --chmod=+x` and have the user run `! chmod +x` on it.

Done after run 5 (the next run is the first to use them):

- `78ea037c` then `63cc9103`: **briefs read in order, code first.**
  `write-briefs.sh` orders a brief as instructions, group, ticket, house
  rules, files, source under test, then guides last. Its header gives its
  length in lines and says to read from line 1 to that line, in order.
  Every reviewer agent, `_core.md` and the SKILL.md spawn prompt say the
  same. The reply is now `done: … , read <last line> of <lines> lines`, and
  SKILL.md Step 2 reruns a group that read fewer. `review-groups.test.sh`:
  45 checks, passed.
  - `78ea037c` split briefs into parts, then into one large part with
    `allow_large: true`. A test run showed `allow_large` lifts Read's
    256 KB refusal, but one call still returns only 40-55 KB (the first
    call gave lines 1-745 of 7,431). So `63cc9103` dropped the parts.
  - **One-group test** (`workareas/reviews/EUDPA-674-briefcheck/`, the
    address-book java-tests 1 group alone, Sonnet): the reviewer read
    lines 1-5949 in six ordered calls, which covers every file and the
    source under test (they end at line 5076), and skipped only the
    tail of the guides. 8 findings against run 5's 2, and 4 coverage
    gaps against 0 (among them run 1 #37 and the `ExternalCallMetrics`
    failure path). The `EmfMeterRegistryIT` over-claim came back. 0.71M
    tokens over 8 calls, against 0.48M over 12. Expect the test and
    source groups to cost more in run 6.
- `78ea037c`: **a PR's own ticket.** `prepare-review.sh` records `ticket`
  for each PR (from its title, else its head branch; `pr-details.sh` now
  returns `headRefName`). A brief for a PR of another ticket says so, and
  says that scope against the reviewed ticket is not a finding. A replay of
  an older review gets this only when `prepare-review.sh` runs again, which
  `start-review.sh --same-as` does.
- `ebefe503`: **`file-review-write.sh` replaces** each listed
  file's findings on a rerun, and a refused rerun puts them back.
  `batch-writes.test.sh`: 29 checks, passed.

Not yet done: cutting the guides down to the sections a file type needs.
With the guides last, a reviewer that stops early loses guides, not code,
and the reply shows it.

1. **Run 6** with the same setup (`--id EUDPA-674-run6 --same-as
   EUDPA-674`, trial run, all four PRs). Then compare it as
   `run6-comparison.md`. Check the coverage gaps (run 4: address-book #9,
   #15 and #16, animals-frontend #2), the `int` flag, and the two
   source-test finds. Only then test the test reviewers on each model.

## Side issues (not this branch)

- The `docs/.claude -> ../.claude` symlink (added in `4ee3724f`) gives a
  root session a second copy of every skill once it touches `docs/`. That
  costs about 9k tokens per call. Test whether a session launched from
  `docs/` still needs it.
- Reading a file under `tim/` loads `tim/CLAUDE.md` and its six included
  guides, about 70 KB.
- `review-counts.sh --help` exits 1.
- `share-review.summary.test.sh` has no executable bit, so it cannot run.
- `workareas/reviews/EUDPA-674-briefcheck/` is a throwaway copy of run 5
  used to try the new brief writer. Delete it (`rm -rf` was denied in
  the session).
- Reviewers that read the whole brief cost more (the one-group test: 0.71M
  against 0.48M). Check run 6's group tokens against run 5's 4.8M. Cutting
  the guides down would bring this back down.
- `ac-check` and `prepare-ac-check.sh` are untracked or gitignored. Delete
  them once the test reviewer has replaced them.
- `ac-table.sh` lists one criterion up to three times (28 rows for about
  9 criteria in run 4, 35 in run 5), because each test reviewer words the criteria its own way.
  Some rows say Yes and No for the same criterion. It needs a shared AC id
  to match rows on.
- In run 2 the ins-frontend infra reviewer replied "4 findings" but wrote
  3. Nothing checks the one-line reply against the file.
- A hook blocks a literal `/Users/` path in a reviewer's save. The
  reviewer's retry with `~/` worked, but it cost a call.
