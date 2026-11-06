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
- Models: Sonnet for source, tests, UI, E2E and spec. Haiku for infra, perf
  and skills. Opus for consistency. Sonnet for the parent, if the skill can
  set it.
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
  and integer line numbers. `stale-search.test.sh` is written but **not run
  yet** (see Next 1).
- `c5518b94`: the review skill sets `model: sonnet`. That applies to every
  mode, the walker and the batch implementor included.

## Next

1. **Make the scripts executable, then run the new test.** Policy blocks
   `chmod` in a session and denies `bash <script>`, and a hook runs a
   changed script only once it is committed. `stale-search.sh` and its test
   are committed as executable, but the files on disk are not. Run this
   yourself:
   `! chmod +x tools/review/stale-search.sh tools/review/stale-search.test.sh tools/review/replay-prs.sh tools/review/prepare-review-local.sh tools/review/batch-lib.sh tools/review/finding-categories.sh`.
   Then run `tools/review/stale-search.test.sh`. Commit the mode change for
   the last four. Once `replay-prs.sh` is executable, revert the
   uncommitted `bash "$SCRIPT_DIR/replay-prs.sh"` workaround on line 259
   of `prepare-review.sh`.
2. **Run 3.** Start a new window. Say "trial run". Set up with
   `start-review.sh EUDPA-674 --id EUDPA-674-run3 --same-as EUDPA-674`,
   then use `EUDPA-674-run3` as the review id for every later step. Use
   the same four PRs as runs 1 and 2, #300 and #43 included, so the runs
   compare like for like. Expect the two scope Criticals on #300 again.
   Do not post to any PR.
3. **Compare run 3 with runs 1 and 2,** in the same shape as
   `run2-comparison.md`.
   - Tokens: `tools/review/token-usage.sh <session> --by-agent`. Check that
     the skill's own context now runs on Sonnet, and how many calls the
     consistency reviewer took.
   - Findings: were run 1's checked findings found this time? Address-book
     #19, #11 and #41, animals-frontend #3, workspace #16 and #17 (in
     `run2-comparison.md`). Were run 2's four checked findings kept? How
     many `coverage-gap` findings are there, and are line numbers file
     lines?
   - If quality is back but tokens are well above run 2, the next lever is
     the consistency reviewer's model (Opus).

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
