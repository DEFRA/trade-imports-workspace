# The frontend-alignment workflow run

A point-in-time record of the first run of
[`.claude/workflows/frontend-alignment.js`](../../.claude/workflows/frontend-alignment.js)
on 2026-09-14, kept as the reference for consolidating the workspace's skills
and workflows. It is the most complete unattended multi-stage build the
workspace has run: thirteen stages, every one landed green in CI, no human
input between launch and the final report.

The run built the proposal in
[`workareas/shared/frontend-alignment/report.md`](../../workareas/shared/frontend-alignment/report.md).
This document is about the machine that built it, not the proposal.

## What it was asked to do

Bring `trade-imports-ins-frontend` into the shape of the two journey frontends
without extracting a shared package, backport the chassis hardening ins already
had, and write the report the team decides on. All of it on one branch,
`feat/NO_JIRA-frontend-alignment`, across every repo touched, behind draft
pull requests that are never merged.

The programme was data: the stage backlog in
[`stages.json`](../../workareas/shared/frontend-alignment/stages.json), with a
header (branch, repos, direction rule, invariants, target tree) and one entry
per stage carrying a prose brief, the reference files in the journey frontends,
the ladder of npm scripts, and slots the run filled in: plan, commit, PRs, CI
state, notes, open questions.

## The numbers

| | |
|---|---|
| Stages | 13, all done |
| Agents | 348 |
| Fable agents | 35 |
| Sonnet agents | 256 |
| Haiku agents | 57 |
| Subagent tokens | 36.4M |
| Wall clock | 8h 56m |
| Commits landed | 17 on ins, 2 each on animals and plants, 3 on the workspace |
| CI fix commits | 8 |
| Agents that returned a failure | 0 |

## The shape of one stage

| Step | Model | Agents | What it does |
|---|---|---|---|
| Plan | Fable, high effort | 1 | Reads the brief, the reference files and the current ins files in full. Writes a file-level plan under `plans/<stage>.md`: moves, edits, new files, import rule, tests, invariants to prove, out of scope. Names the files worth a reviewer's time (`reviewFocus`, capped at eight) and every behaviour change. Makes every open choice itself and records it |
| Implement | Sonnet | 1 | Executes the plan verbatim, `git mv` for moves, narrow tests as it goes, stages but never commits |
| Review | Sonnet per focus file, Fable across the change | 2n+1 | Style reviewer and code reviewer per focus file following the `code-style` and `review` skill personas; one consistency reviewer that also runs the plan's invariant proofs |
| Verify findings | Sonnet | 1 per file with findings | Adversarial refutation, default refuted, one verifier per file so the file is read once |
| Judge | Fable, high effort | 0 or 1 | Rules each surviving finding fix-now, defer to an open question, or reject. Deferrals are written into the stage's `openQuestions` so they reach the report |
| Fix | Sonnet | 0 or 1 | Applies only what the judge ruled |
| Ladder | Sonnet | 1 | Runs the stage's npm scripts in order to log files read once, three repairs at most, never weakens a test |
| Land | Haiku | 1 | Proves the branch, commits with a conventional subject, pushes with the fully qualified refspec, records the SHA |
| Pull request | Haiku | 1 | Reuses the programme's one draft PR per repo or creates it through `tools/github/pr-ensure-draft.sh` |
| CI | Haiku watching, Sonnet fixing | 1 to 5 | Blocks on `tools/github-actions/wait-for-pr-checks.sh`, fixes red at most twice, records the outcome |

A red ladder or red CI stops the run, preserves the attempt as a pushed `wip`
commit, and marks the stage, so nothing is built on a broken stage. Resume is a
relaunch: the baseline stage skips everything already done.

## What the run did with its own findings

Across thirteen stages the reviewers raised findings, the verifiers refuted the
weak ones, and the judge ruled the rest without a human. Every deferral landed
in `stages.json` as an open question and every open question is in the
report's section 7. Read them with:

```bash
jq -r '.stages[] | select((.openQuestions|length)>0) | .id + ": " + (.openQuestions|join(" | "))' \
  workareas/shared/frontend-alignment/stages.json
```

The full return value of every agent, plan summaries and judgements included,
is preserved beside the report in
[`run-wf_a52aa0bf-91f.journal.jsonl`](../../workareas/shared/frontend-alignment/run-wf_a52aa0bf-91f.journal.jsonl),
one `{"type":"result"}` line per agent.

## What worked, and is worth carrying into the consolidated skills

- **A thinker writes the plan as a file; a doer executes it.** The plan is the
  contract between models. Fable read both reference frontends and the live
  ins files before writing; Sonnet never had to decide anything. Every stage's
  plan opened with a decision table so the implementor never chose.
- **The planner names what deserves review.** Pure moves got no reviewer;
  adapted logic and rewritten tests did. That kept the review fan-out to
  at most seventeen agents per stage on a change that moved a hundred files.
- **Refute before acting, by file.** Grouping findings by file made each
  verifier read the diff once, and the default-refuted bias kept churn out of
  working code.
- **The judge writes deferrals into state, not prose.** Nothing was lost
  between the judge and the report because the report stage read the same
  JSON the judge wrote.
- **Cheap watchers behind allowlisted scripts.** The two helper scripts meant
  Haiku never needed raw `gh`, and the poll loop lived in bash rather than in
  an agent sleeping.
- **One draft PR per repo for the whole programme.** Every stage's push
  re-ran the pipeline on the same PR, which gave the branch a staging
  mechanism the repos' `pull_request`-only workflows would otherwise deny it.
- **The two-spellings path rule.** Tilde for Bash, absolute for Read/Write,
  stated once in the guard rails and never mixed in an example. No agent
  tripped the path guard.
- **Cross-repo branch parity.** The same branch name in every repo meant the
  workspace stack, the PRs and the report all agreed without a lookup table.

## What to change next time

- **SonarCloud is a check the ladder cannot see.** It runs on pull requests
  in all three repos and most of the eight CI fix commits were Sonar findings
  fixed after a push. A Sonar rung before the push, or an accepted CI
  round-trip per stage, needs deciding up front.
- **`workflow_run` workflows cannot be proven on a branch.** They read the
  default branch's workflow files, so a stage that adds one (Lighthouse for
  ins, say) cannot see it go green until it is on main. The stage has to prove
  it another way.
- **A CI fix in two repos is a drift in the third.** The s12 Sonar fix moved
  animals and plants together and left ins behind on two lines. A drift check
  as a ladder rung is the fix; the report's section 8 specifies it.
- **The baseline checked every repo in the header.** On a later run with
  other work in flight in animals, that would have refused to start. The
  baseline now checks only the repos the pending stages touch.
- **The Welsh copy is machine-drafted.** A stage that creates Welsh needs a
  translator gate before any real release, and the report says so.
- **165 agents returned an empty result.** These are the record-keeping
  agents whose schema has no required payload beyond `ok`; harmless, but a
  reader of the journal should know an empty result is not a dead agent.

## How to run it again

```js
Workflow({ scriptPath: ".claude/workflows/frontend-alignment.js" })
```

Launch by path, never by name: a name runs a snapshot taken at session start.
The baseline stage reads `stages.json`, skips every stage already `done`, and
refuses to start if a repo a pending stage touches is off the branch or dirty.
To rerun a subset, edit `FALLBACK.stages` in the script or pass the same shape
as `args`. To resume a dead run, relaunch with `resumeFromRunId`; completed
agents replay from the journal.
