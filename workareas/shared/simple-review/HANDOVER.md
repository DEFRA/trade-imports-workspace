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

The `prs.sh --own` paragraph in `SKILL.md` Step 0 is still uncommitted, on
purpose: it goes with the uncommitted `prs.sh` and `prs.own.test.sh`.

## Next

1. **Run 2.** Start a new window. Say "trial run".
   - Use the same PRs and commits as run 1. Read them from run 1's
     `.review-meta.json`.
   - Put the workarea in `workareas/reviews/EUDPA-674-simple/`.
   - Do not post to any PR.
2. **Compare.**
   - Tokens: `tools/review/token-usage.sh <session> --by-agent`.
   - Findings: match run 1 against run 2 by file, line and category. Check
     each unmatched finding against the code.

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
- The user's uncommitted `SKILL.md` change (2 parallel reviewers instead of
  100) is still in the working tree.
