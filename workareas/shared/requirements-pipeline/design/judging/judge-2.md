# Judge 2: the engineer who has to build and run it

Judge 2 of 3, 18 September 2026. I judged each design as the person who must build it and keep it running under the workspace rails: permissions and hooks, Workflow runtime limits, how `codex exec` behaves, deterministic state, and resume. I read all three candidates in full, along with `sam-requirements.md`, `rules-probe.md`, `00-synthesis.md` and the relevant parts of `gap-4.md`. I then checked the claims that matter for feasibility against the actual files.

## What I checked against the files

| Claim | Where the candidates lean on it | What the files show |
|---|---|---|
| Agents can run `tim` without a permission prompt | All three: every watcher calls `tim …` | True. `.claude/settings.json:88` allows `Bash(tim:*)`, `:63-64` allow `tools/**`, and `:85` allows `npm --prefix ~/…/*`. |
| Reviewer persona files exist and can be read by path | All three | True: `review/references/{FILE_REVIEWER,CONSISTENCY_REVIEWER,REVIEW_ITEM_FIXER,WALKER,BATCH_IMPLEMENTOR}.md` and `code-style/references/{STYLE_FILE_REVIEWER,STYLE_IMPLEMENTOR,STYLE_WALKER}.md`. |
| `bake-rules-bundle.sh` can be reused unchanged | quality (passes `BUILD-<programme>-<inc>` as the ticket key) | True. The script only checks that its argument is not empty and writes to `workareas/code-style-reviews/<key>/`. Quality's route needs **no edit to the code-style skill**. Reuse needs one new `--list` flag. Codex needs the topic lists moved out of the script into `routing.json`. |
| tim may not shell out to `tools/*.sh` | codex (lifecycle moves into tim), quality (bash composer calls tim, not the other way round) | True (`tim/CLAUDE.md:17`). tim already has `src/exec`, `github-client`, `jira-client` and `confluence-client`, so codex's tim-owned lifecycle can be built. But it means rewriting the whole proven prompt-driven lifecycle as tested JavaScript. |
| `workflow({scriptPath})` nesting | quality and codex (a drain parent with a child per increment) | The reference documents it, one level deep, with a shared 1,000-agent cap. That the child is re-read on each call, and that resume works across children, is **inferred, not documented** (`gap-4.md:134-152`). Both candidates run a canary first and fall back to state-driven resume. Reuse avoids nesting altogether. |
| Workflow scripts cannot read files | the reuse schema extractor; quality's schema files | True (S §7.1.6). Reuse keeps one `STAGE_SCHEMAS` literal in the script and extracts it for Codex, with a contract test. Codex has Claude agents return only a receipt, so the output schema lives only in tim. Quality keeps schemas as asset files and **never says how the script gets them** for `agent({schema})`. That gap is fixable (pass them through args, as it already does for the rails). |

## Scores and reasoning, candidate by candidate

### reuse (winner)

**Strengths**
- It builds the least that is new. Most of the work is `git mv` of `tim/src/parity/` into `tim/src/backlog/`, with parity kept as a profile. The first build step is judged only on "every existing tim test passes, no fixture changed, the EUDPA-328 page renders the same".
- The drain runs inside one Workflow and avoids nesting. `run.json` bindings are re-read on every loop, so a switch of executor takes effect at the next increment with no relaunch.
- The lifecycle stays in its proven form (the loop's ticket, branch, PR and merge stages, plus FA's plan, sync and ladder).
- Its backlog for its own build is the only one that shows both passes: atoms, then combined increments with `declined[]` recorded.
- Acceptance is read through `members` and is never copied into the increment, so a ruling on one atom is seen at once.
- The only changes to the review and code-style skills are one short "embedded" section per persona and one `--list` flag. Both are owned by those skills (R2).

**Weaknesses**
- The Codex courier re-emits the assembled JSON array as its own output. That is LLM transport of large structured data, and the design admits the risk (risk 5).
- Distil and build share one workflow file, which will get large.
- Its distillation checks are thinner than quality's: there is no extract-verify pass per source, no trace matrix and no question critic.

**Feasibility under the rails:** the highest of the three. Every outward action goes through allowlisted `tim` or `tools/` commands, and git pushes stay in Claude watchers where the per-call hooks see them.

### quality

**Strengths**
- It has the richest requirements method:
  - an extract-verify pass per source, by a different agent;
  - a `trace --strict` closure over every source unit;
  - gap auditors for thin slices;
  - a question editor and a separate question critic with a lint, plus a blast radius per question;
  - claim and copy-editor passes over the report;
  - ten named completeness proofs (P1 to P10).
- On the build side it adds a **plan audit**: a different agent reads the row, not the plan's paraphrase of it. It also adds a separate **acceptance stage** that reads the acceptance criteria from `backlog.json`, and a fix-verify stage.
- The consistency reviewer runs once per repo, which matches the review skill's own granularity.
- It reuses `bake-rules-bundle.sh` with zero edits.

**Weaknesses**
- It is the most Opus-hungry design: 18 distil phases, most of them on Opus.
- It depends on nested workflows.
- The relay agent re-emits results.
- It does not say how schema files reach `agent({schema})` in the script.
- Its own build backlog has no combined rows, so pass 2 is never demonstrated. Several atoms bundle multiple MUSTs, against its own "and also" rule.
- `hints.exemplars` carry file paths. They are non-binding, but they come close to recipe content.

### codex

**Strengths**
- The architecture is the most robust to operate. It is a **file-first stage machine in tim**:
  - each task has its own folder with `input/`, `prompt.md`, `output.draft.json`, an `output.json` accepted by `tim stage accept`, and a `receipt.json`;
  - Claude agents return only receipts, so no LLM relays data;
  - `advance` decides the next stage from files on disk;
  - every write carries an operation id for idempotency;
  - a partial Codex task is resumed or archived when the executor switches mid-increment.
- Its R6 machinery is the strongest:
  - a byte-identical check on prompts, ignoring the profile section;
  - a **reading audit** mined from agent transcripts and Codex logs;
  - cross-examination of each executor's diff by the other;
  - read-only sandboxes for reviewers.
- It raises the house-rules asymmetry: the loop inlines Sam's memory rules into prompts, and Codex never sees them.
- A Codex-orchestrated third mode drives the same machine.

**Weaknesses**
- It is the largest new surface. `tim build`, `tim stage`, `tim standards`, `tim decisions` and `tim report` are all new, and the whole lifecycle is rewritten into tim with octokit and Jira clients. This drifts from "not a build from zero".
- **Rails regressions:**
  - `tim build` does pushes and merges inside tim, so `guard-bash`, the `PostToolUse` push hook and the auto-mode classifier (which has refused `gh pr merge`) no longer see them. The design admits the push hook stops firing.
  - Deterministic ladders, CI waits and local E2E run inside `tim build advance` calls under the 10-minute Bash ceiling. That needs processes that outlive the call, which the design lists as unproven (inc-001 ac-3, risk 3).
  - The sonar wrappers lean on `sonar analyze --staged`, which memory says agents cannot use.
- It refactors the review and code-style routing into `routing.json`, which touches the skills more than the other two designs do.
- `lifecycle.review.cap` and `ciFixAttempts` sit in the backlog header. These are run knobs, not delivery policy.

## Winner and grafts

The winner is **reuse**. It meets R1 to R6 with the smallest, most provable build path, and its ordering settles every factual doubt cheaply before anything depends on it. The best ideas from the other two are listed below as grafts into reuse's structure.

The biggest graft is codex's file-first contract: the task folder, `tim stage accept` and receipt-only returns. Applied to the Codex adapter, and ideally to Claude reviewers too, it removes reuse's one real operational weakness, the courier re-emitting JSON. The lifecycle stays in watcher agents so the hooks keep seeing pushes.
