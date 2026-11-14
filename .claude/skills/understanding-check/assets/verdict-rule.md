# Deterministic verdict rule + report layout

`tim understanding-check finalize` reads `transcript.json` and applies the table
below. The rule is deterministic — no LLM judging the final verdict.
That's intentional: LLM-scored individual answers (advisory) + a
counting rule on top (deterministic) is the gate.

## Counting rule

Let:

- `F` = number of entries with `score.verdict == "FAIL"`
- `P` = number of entries with `score.verdict == "PARTIAL"`
- `S_F` = number of entries where the underlying question's `category`
  is `security` AND `score.verdict == "FAIL"`
- `G` = length of `.interview-meta.json` → `coverage_gaps[]`

Then, in evaluation order (first match wins):

| Condition | Verdict | Exit code |
|---|---|---|
| `F >= 3` OR `S_F >= 1` | `high-risk` | 2 |
| `F >= 1` OR `P >= 3` | `needs-review` | 1 |
| `G >= 1` | `needs-review` | 1 |
| otherwise | `pass` | 0 |

`coverage_gaps[]` is appended to by:

- `prepare-check.sh` if the diff exceeds `--max-diff-bytes` and gets
  truncated.
- The parent session if the developer types `quit` mid-interview.
- The SCORER persona if the helper records `FAIL/unscorable`.

## Why this shape

Per
[`docs/claude-architect/domain-4-prompt-engineering/4.1-explicit-criteria.md`](../../../../docs/claude-architect/domain-4-prompt-engineering/4.1-explicit-criteria.md)
§5, severity needs concrete anchors. The mapping above is the anchor:

- `high-risk` fires only on three independent FAILs or a single
  security-category FAIL. Either pattern means the author probably
  shouldn't merge without a sit-down with a reviewer.
- `needs-review` is the "flag to the reviewer" middle. Some gaps; not
  enough to block the PR but enough that the reviewer should pay
  attention.
- `pass` is the clean run. Even here, the disclaimer in the PR-comment
  block tells the reviewer not to treat this as a green light.

## Report layout — `report.md`

Produced by `tim understanding-check report EUDPA-XXXXX` (no `--preview` flag). Ten
sections, in this order:

1. **Header** — ticket id, base ref, head SHA per repo, model + skill
   version, run timestamp.
2. **Ticket summary** — 2-4 sentences extracted from `ticket.md`.
3. **Change summary** — concatenated `changeSummary` + `whyItChanged`
   from each `analysis.{repo}.json`.
4. **Merge recommendation** — verdict, the deciding rule
   (which row of the table above fired), exit code.
5. **Per-question table** — id, category, verdict, rubric clause that
   fired, one-line gap from `missed_concepts`.
6. **Full transcript** — for each question: prompt, anchor file:lines,
   developer answer (verbatim), score JSON.
7. **Gaps in understanding** — deduped union of all `missed_concepts`
   across the run.
8. **Suggested follow-up learning** — bullets. Each names a concept
   tag and points to one file:lines in the diff.
9. **Coverage gaps** — `.interview-meta.json.coverage_gaps[]`, one per
   line, plus the redaction-count summary `prepare-check.sh` logged
   (not the matched secrets, ever).
10. **PR comment block** — fenced markdown, ≤1500 chars, paste-ready.
    Ends with the canonical disclaimer:

    > This score is a coaching signal, not a gate. Reviewer judgement overrides.

## Preview layout — `report.md` with `--preview`

Used at the Step 4 plan gate. Contains only:

- **Header** (run id, ticket).
- **Per-repo analysis summary** — counts per section
  (`keyDesignDecisions: 3`, `securityRisks: 1`, etc).
- **Question set** — for each question: id, category, prompt, anchor
  file:lines, the three rubric clauses.

No transcript, no verdict, no PR comment. The user is gatekeeping the
**question set**, not the **outcome**.
