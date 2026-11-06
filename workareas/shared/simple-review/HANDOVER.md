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

## Next

A new script needs its executable bit before an agent can run it. Policy
blocks `chmod` in a session and denies `bash <script>`, and a hook runs a
changed script only once it is committed. So stage a new script with
`git add --chmod=+x` and have the user run `! chmod +x` on it.

1. **Run 5.** Trial run, don't post. Set up with
   `start-review.sh EUDPA-674 --id EUDPA-674-run5 --same-as EUDPA-674`,
   then use `EUDPA-674-run5` as the review id for every later step. Use
   the same four PRs, #300 and #43 included.
2. **Compare run 5 with runs 1 to 4** as `run5-comparison.md`, in the same
   shape as `run4-comparison.md`.
   - Were `Unit.COUNT` (`EmfMeterRegistry.java:106,122`) and
     `countryCode: undefined` (`to-wire-address.js:9`) found, and are run
     4's finds (replica set, `int` flag, overrides, provenance merge) kept?
   - Check the two new source findings from the test against the code:
     `OperatorService.java:80` (search counted before a failed query) and
     `AddressSearchType.java:8` (`QUERY_AND_COUNTRY` names an OR query).
   - Tokens: source on Opus should add about 0.5-1M. Check the total and
     the four source groups against run 4.
   - Test reviewers stay on Sonnet. If run 5 still shows thin coverage
     gaps, test them the same way: run the two test groups on each model.

## Side issues (not this branch)

- The `docs/.claude -> ../.claude` symlink (added in `4ee3724f`) gives a
  root session a second copy of every skill once it touches `docs/`. That
  costs about 9k tokens per call. Test whether a session launched from
  `docs/` still needs it.
- Reading a file under `tim/` loads `tim/CLAUDE.md` and its six included
  guides, about 70 KB.
- `review-counts.sh --help` exits 1.
- `ac-check` and `prepare-ac-check.sh` are untracked or gitignored. Delete
  them once the test reviewer has replaced them.
- `ac-table.sh` lists one criterion up to three times (28 rows for about
  9 criteria), because each test reviewer words the criteria its own way.
  Some rows say Yes and No for the same criterion. It needs a shared AC id
  to match rows on.
- In run 2 the ins-frontend infra reviewer replied "4 findings" but wrote
  3. Nothing checks the one-line reply against the file.
- A hook blocks a literal `/Users/` path in a reviewer's save. The
  reviewer's retry with `~/` worked, but it cost a call.
