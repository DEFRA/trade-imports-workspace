---
name: understanding-check
description: 'Verify that the developer who authored a PR actually understands it, before merge. Analyses the diff against the ticket, generates 8-12 evidence-anchored questions with categorical PASS/PARTIAL/FAIL rubrics, presents the question set for approval (the in-skill plan gate), conducts a terminal Q&A, scores answers by quoting back the rubric clause that fired, and emits a deterministic verdict (pass / needs-review / high-risk) with a paste-ready PR comment. Coaching aid, not a merge gate. Use when the user says "interview EUDPA-X", "check understanding EUDPA-X", "understanding-check EUDPA-X", "verify I understand EUDPA-X". NOT a code review (use the `review` skill) and NOT a style review (use `code-style`) — those judge the code; this judges the author''s grasp of it.'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX'
---

Pre-merge understanding check for an EUDP trade-imports ticket: surface
the parts of the diff the developer might not have internalised, ask
about them, score answers against categorical rubrics, and produce a
coaching report. Designed for PRs completed with AI assistance, where
local code-edit fluency outpaces understanding.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~` to
your home directory automatically. `tim understanding-check` finds the
workspace it runs in, and `start` prints the check folder's path.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## What this skill is for

- Pre-merge sanity check on **your own** AI-assisted PR — you want a
  structured way to be sure you understand it.
- Coaching signal, not a gate. The verdict is advisory; a human reviewer
  still owns merge.
- Per-repo diff analysis fans out across the PR set; the Q&A itself is
  one combined session in the parent terminal.

State for a ticket lives under
`~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXX/`.
JSON canonical:

| File | Mutated by | Purpose |
|---|---|---|
| `.interview-meta.json` | `tim understanding-check prepare`, `tim understanding-check finalize` | run metadata + verdict + coverage gaps |
| `analysis.{repo}.json` | `tim understanding-check analysis add-finding`, `tim understanding-check analysis complete` | per-repo findings (evidence-anchored) |
| `questions.json` | `tim understanding-check question add`, `question replace`, `question remove` | combined question set (the plan-gate artifact) |
| `transcript.json` | `tim understanding-check answer`, `tim understanding-check score` | per-question answer + score |
| `report.md` | `tim understanding-check report` | rendered final report (regenerable from JSON) |

Schemas live under `assets/`:
[`analysis-schema.md`](assets/analysis-schema.md),
[`question-schema.md`](assets/question-schema.md),
[`transcript-schema.md`](assets/transcript-schema.md),
[`verdict-rule.md`](assets/verdict-rule.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "interview EUDPA-X" / "check understanding EUDPA-X" / "understanding-check EUDPA-X" / "verify I understand EUDPA-X" | this SKILL.md — full workflow |
| "resume understanding-check EUDPA-X" | this SKILL.md — `tim understanding-check start` emits `MODE: RESUME`, pick up where left off |

NOT a code review (use `review`). NOT a style review (use `code-style`).
NOT a refinement check (use `ticket-refiner`). Those judge **the code or
the ticket**; this judges **the author's grasp of the code that just
landed**.

## Worker references

The parent SKILL.md delegates per-repo analysis and per-question scoring
to subagents defined as `references/*.md` prose. Each is spawned as a
`general-purpose` Task subagent (carries `Tools: *`, can call helper
scripts). The interview loop itself stays in the parent — it needs to
talk to the developer.

| Persona | Used in | Artifact |
|---|---|---|
| `references/ANALYST.md` | Step 2 — one per repo in scope, parallel | `analysis.{repo}.json` (evidence required per finding) |
| `references/QUESTION_GENERATOR.md` | Step 3 — one spawn, combines all repos | `questions.json` (8-12 entries, categorical rubric required) |
| `references/SCORER.md` | Step 6 — one per question, parallel | per-question `score` entry in `transcript.json` (rubricMatch quoted from rubric) |

Spawn idiom: Task tool with `subagent_type: general-purpose` and a prompt
beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/understanding-check/references/<NAME>.md.`

## Step 0: Start the check

```bash
tim understanding-check start EUDPA-XXXXX
```

First line of output is `MODE: FRESH` or `MODE: RESUME`. Branch on it:

- `MODE: FRESH` → the output names the check folder and its raw folder;
  go to Step 1.
- `MODE: RESUME` → state already exists; read `.interview-meta.json` to
  see how far the prior run got. Jump to the next pending step:
  - no `analysis.{repo}.json` for any repo → Step 2.
  - all analysis done, `questions.json` missing → Step 3.
  - questions exist, `transcript.json` missing or incomplete → Step 4
    (plan gate) then Step 5.
  - transcript complete but scores missing → Step 6.
  - scores complete but verdict null → Step 7.

## Step 1: Prepare the check

GitHub stays on `gh`; tim reads what `gh` saves. Use the raw folder
`start` printed, written `<raw>` below. Run each command in its own
Bash call.

1. Save the ticket's pull requests:

   ```bash
   gh search prs EUDPA-XXXXX --owner DEFRA --json number,title,repository,url,state,createdAt > <raw>/prs.json
   ```

2. List the pull request to fetch for each repo (an open one over any
   other, then the newest). Each line is `<repo> <number>`:

   ```bash
   tim understanding-check prepare EUDPA-XXXXX --select
   ```

   It stops with `No PRs found` when `gh` found none.

3. For each line, save the head commit and the diff. Do not skip a line:
   a repo with no saved diff is left out of the check.

   ```bash
   gh pr view <number> --repo DEFRA/<repo> --json headRefOid --jq .headRefOid > <raw>/<repo>.sha
   ```

   ```bash
   gh pr diff <number> --repo DEFRA/<repo> > <raw>/<repo>.diff
   ```

   If `gh pr diff` fails, delete `<raw>/<repo>.diff`, so `prepare`
   reports the repo as not fetched rather than reading an empty diff.

4. Prepare the check:

   ```bash
   tim understanding-check prepare EUDPA-XXXXX
   ```

   It reads `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`, and:

   - writes `ticket.md` from the Jira ticket
   - caches each diff at `.diffs/{repo}.diff`, cut to `--max-diff-bytes`
     (default 200000, a cut adds a coverage gap) and **redacted** (key
     assignments, API keys, tokens and private-key blocks; the count goes
     to stderr, never the matched text)
   - writes `best-practices/{repo}.md` from the review routing data
   - seeds `analysis.{repo}.json` and `.interview-meta.json` with
     `verdict: null`, the head SHA per repo and any coverage gaps
   - removes the raw folder

Read `ticket.md` to internalise the ticket summary before spawning
analysts.

## Step 2: Analyse the diff (per-repo fan-out)

Spawn one Task subagent **per repo in scope, in a single response**.
Reading `.interview-meta.json` gives you the repo list under `.prs[]`.

Spawn prompt template (one per repo):

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/understanding-check/references/ANALYST.md.

**Ticket:** EUDPA-XXXXX
**Target repo:** [repo-name]
**Diff:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/.diffs/[repo-name].diff
**Best-practices bundle:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/best-practices/[repo-name].md
**Output JSON path:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/analysis.[repo-name].json
**Ticket summary file:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/ticket.md
```

Wait for all analysts to finish. Confirm one `analysis.{repo}.json`
exists per repo with `verdict: "complete"`.

## Step 3: Generate questions

One spawn (combines all per-repo analyses into a unified question set):

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/understanding-check/references/QUESTION_GENERATOR.md.

**Ticket:** EUDPA-XXXXX
**Workspace:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/
```

The generator reads every `analysis.{repo}.json`, emits 8-12 questions
via `tim understanding-check question add`. Constraints (enforced by the helper, not by the
persona's good intentions):

- ≥1 question per category that has analysis findings; **categories
  with zero findings are skipped, never fabricated**.
- ≥2 questions targeting an `aiSuspectedRegions` entry across the run.
- 8-12 questions total (the helper rejects beyond 12; the persona is
  told to stop at the natural break, not pad).
- Each `rubric.PASS` is a categorical clause naming the concept (e.g.
  *"names the retry budget AND the dead-letter target"*), not a
  hedging phrase like *"demonstrates good understanding"*.

## Step 4: Plan gate — surface the question set for approval

This is the in-skill plan mode the brief asked for. Before the
interview starts, render the question set + analysis summary as a
preview and present it to the user:

```bash
tim understanding-check report EUDPA-XXXXX --preview
```

Show the preview and prompt:

```markdown
Question set is ready. Approve to start the interview, or list edits.

Available edits:
- `replace N` — replace question N with a new one (`tim understanding-check question replace`)
- `remove N`  — drop question N (`tim understanding-check question remove`)
- `add`       — add a new question (`tim understanding-check question add`)

Type `go` to start the interview.
```

Iterate until the user says `go`. Each edit re-renders the preview.

**Do not start the interview until the user signals approval.** The
brief's Phase-A-plan / Phase-B-implement separation is non-negotiable.

## Step 5: Interview loop (parent session, terminal)

The interview runs in the parent — you (Claude Code) are the
interviewer. Subagents would lose the conversational thread.

For each question in `questions.json`, in order:

1. Render `Q[id]: [prompt]` and the **anchor file:lines** (not the
   diff content — that would leak the answer). Example:
   ```
   Q3 [implementation] — Why does the retry path skip the dead-letter
   queue when the exception is a 4xx?
   Anchor: trade-imports-animals-backend/src/.../RetryHandler.java:42-58
   ```
2. Accept multi-line input. Convention: the user types `.` on its own
   line to submit.
3. Special inputs:
   - `skip` → record an answer of `"<skipped>"`. Score step will
     record `FAIL` with `missedConcepts: ["skipped"]`.
   - `quit` → finalise with a `coverage_gap` entry; verdict will be
     downgraded.
4. Persist via `tim understanding-check answer EUDPA-XXXXX --question-id Q3 --answer-file /tmp/ans.txt`.

Do NOT volunteer the answer between questions, even if the developer
asks. The point is to find gaps, not to fill them.

## Step 6: Score answers (per-question fan-out)

Once all answers are recorded, spawn one Task subagent per question
**in a single response**. **Pin Opus on these spawns** (pass
`model: opus` to the Task call) — rubric-clause matching is the
sharpest reasoning step and is worth the latency/cost. Analysis and
question generation can inherit the default model.

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/understanding-check/references/SCORER.md.

**Ticket:** EUDPA-XXXXX
**Question id:** Q3
**Workspace:** ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/
```

Each scorer reads the question + rubric + answer + anchored diff hunk,
then calls `tim understanding-check score`. The command **requires** a
`--rubric-match "<quoted clause>"` argument; if the scorer can't quote
the rubric clause that fired, the helper records `verdict: FAIL,
missedConcepts: [unscorable]` (the categorical anchor that replaces
hedged "I'm not sure" judgements — see
[`docs/claude-architect/domain-4-prompt-engineering/4.1-explicit-criteria.md`](../../../docs/claude-architect/domain-4-prompt-engineering/4.1-explicit-criteria.md)).

## Step 7: Verify coverage and finalise

```bash
tim understanding-check verify EUDPA-XXXXX
```

Gates the verdict step. Lists the gaps on stderr and exits 1 if:

- Any question is missing an answer or a score.
- Any analysis finding lacks evidence (shouldn't happen — helpers
  reject this — but the gate double-checks).

Then apply the deterministic counting rule:

```bash
tim understanding-check finalize EUDPA-XXXXX
```

The command reads `transcript.json`, applies
[`assets/verdict-rule.md`](assets/verdict-rule.md), stamps the
verdict + exit code onto `.interview-meta.json` and exits with that
code. A finalize that could not run also exits 1, so read the verdict
from its `Verdict for` line (or `--json` `result.verdict`), not from the
exit code alone. Coverage gaps
recorded during the run automatically downgrade `pass` → `needs-review`.

Then render the report:

```bash
tim understanding-check report EUDPA-XXXXX
```

`report.md` has 10 sections (header, ticket summary, change summary,
merge recommendation, per-question table, full transcript, gaps,
suggested follow-up learning, coverage gaps, paste-ready PR comment
block) — see [`assets/verdict-rule.md`](assets/verdict-rule.md) for
the layout.

## Verdict guidelines

| Verdict | Counting rule | Exit | Meaning |
|---|---|---|---|
| **pass** | FAIL = 0, PARTIAL < 3, no coverage gaps | 0 | Developer demonstrably understands the change. PR can proceed at the reviewer's discretion. |
| **needs-review** | FAIL 1-2, OR PARTIAL ≥ 3, OR any coverage gap | 1 | Some gaps; flag to the reviewer in the PR comment so they pay extra attention. |
| **high-risk** | FAIL ≥ 3, OR any security-category FAIL | 2 | Significant gaps in the author's grasp of the change. Reviewer should request a walk-through before approval. |

The PR-comment block in `report.md` ends with the canonical
disclaimer: *"This score is a coaching signal, not a gate. Reviewer
judgement overrides."*

## Completion output

```
Understanding check complete for EUDPA-XXXXX.

Verdict: [VERDICT] (exit [N])
Counting: FAIL=[X], PARTIAL=[Y], PASS=[Z], coverage gaps=[K]

Per-question outcomes:
- Q1 [category]: VERDICT — rubric clause "..."
- ...

Report: ~/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-XXXXX/report.md
Section 10 of the report is a paste-ready PR comment.
```

## Scripts cheat-sheet

The `tim` commands the steps run, and the `gh` calls Step 1 makes:

| Command | Purpose |
|---|---|
| `tim understanding-check start` | Step 0 dispatcher — emits `MODE: FRESH` or `MODE: RESUME` |
| `gh search prs`, `gh pr view`, `gh pr diff` | Step 1 — save the pull requests, head commits and diffs into the raw folder |
| `tim understanding-check prepare --select` | Step 1 — list the pull request to fetch for each repo |
| `tim understanding-check prepare` | Step 1 — fetch the ticket, cache redacted diffs, bake best-practices, seed meta |
| `tim understanding-check analysis add-finding` | ANALYST helper — append a finding to `analysis.{repo}.json` (evidence required; rejected without `--evidence-file` and `--evidence-lines`) |
| `tim understanding-check analysis complete` | ANALYST helper — mark per-repo analysis as `complete` |
| `tim understanding-check question add` | QUESTION_GENERATOR helper — append a question (categorical rubric required; clamps total to 12) |
| `tim understanding-check question replace` | Plan-gate edit — replace question by id |
| `tim understanding-check question remove` | Plan-gate edit — drop a question by id (renumbers downstream ids) |
| `tim understanding-check answer` | Interview helper — persist developer's answer for a question |
| `tim understanding-check score` | SCORER helper — append a score (rubric-match required) |
| `tim understanding-check counts` | Diagnostic — PASS/PARTIAL/FAIL by category |
| `tim understanding-check verify` | Step 7 gate — every question scored, every finding has evidence |
| `tim understanding-check finalize` | Step 7 — apply deterministic counting rule, stamp verdict + exit code |
| `tim understanding-check report` | Step 4 (`--preview`) and Step 7 — render markdown from JSON state |
