# Schema: `transcript.json`

Per-question answer + score record. Mutated by:

- `tim understanding-check answer` — persist
  developer's answer (parent session, during the interview loop).
- `tim understanding-check score` — append SCORER's
  verdict (worker, during Step 6).

## Shape

```json
{
  "ticket": "EUDPA-XXXXX",
  "entries": [
    {
      "question_id": "Q1",
      "answered_at": "2026-06-08T13:20:00Z",
      "answer": "It's because 4xx errors are non-transient...",
      "skipped": false,
      "score": {
        "verdict": "PASS",
        "rubric_match": "Names BOTH that 4xx is non-transient AND that retrying would exhaust the budget for legitimate 5xx",
        "missed_concepts": [],
        "evidence_cited": [
          { "file": "trade-imports-animals-backend/src/main/java/.../RetryHandler.java", "lines": "42-58" }
        ],
        "follow_up": null,
        "scored_at": "2026-06-08T13:35:00Z"
      }
    }
  ]
}
```

## Field reference

| Field | Type | Notes |
|---|---|---|
| `entries[].question_id` | string | Matches `questions[].id`. |
| `entries[].answered_at` | ISO8601 | Set when `tim understanding-check answer` ran. |
| `entries[].answer` | string | Verbatim developer answer. May be multi-line. |
| `entries[].skipped` | boolean | True if user typed `skip`. Score auto-FAILs with `missed_concepts: ["skipped"]`. |
| `entries[].score` | object \| `null` | Filled by SCORER after the interview. |
| `entries[].score.verdict` | `PASS` \| `PARTIAL` \| `FAIL` | The categorical outcome. |
| `entries[].score.rubric_match` | string | **Required.** A verbatim or near-verbatim quote from the question's rubric clause that fired. If the SCORER cannot quote a clause, the helper records `verdict: FAIL, missed_concepts: ["unscorable"]` and refuses the supplied rubric_match. |
| `entries[].score.missed_concepts` | array of strings | Concept tags from `questions[].expectedConcepts` the answer did NOT touch. Aggregated into the "gaps" report section. |
| `entries[].score.evidence_cited` | array of `{ file, lines }` | The diff hunks the scorer referenced when deciding. Helps the developer go re-read the relevant code. |
| `entries[].score.follow_up` | `null` \| string | Optional one-liner the SCORER may add when verdict is `PARTIAL`. Not asked in this run (no adaptive regen); shown in the report's "Suggested follow-up learning" section. |
| `entries[].score.scored_at` | ISO8601 | Set by `tim understanding-check score`. |

## Why rubric_match is mandatory

Per
[`docs/claude-architect/domain-4-prompt-engineering/4.1-explicit-criteria.md`](../../../../docs/claude-architect/domain-5-context-reliability/../domain-4-prompt-engineering/4.1-explicit-criteria.md):
self-reported "I'm confident this passes" is gameable and uncalibrated.
Requiring the scorer to **quote the rubric clause** anchors the verdict
in a categorical condition. If the scorer can't quote one, the answer
is unscorable — and we say so (FAIL/unscorable) rather than guessing.

## Worked examples

### A PASS that quotes correctly

Question's rubric.PASS: *"Names BOTH that 4xx is non-transient AND that
retrying would exhaust the budget for legitimate 5xx"*

Answer: *"4xx are client errors — they won't succeed on retry, they're
permanent for that request. And retrying them anyway would burn through
our retry budget that 5xx (which actually are transient) need."*

Recorded score:
```json
{
  "verdict": "PASS",
  "rubric_match": "Names BOTH that 4xx is non-transient AND that retrying would exhaust the budget for legitimate 5xx",
  "missed_concepts": [],
  "evidence_cited": [{ "file": "...RetryHandler.java", "lines": "42-58" }]
}
```

### A PARTIAL that quotes the PARTIAL clause

Question's rubric.PARTIAL: *"Names the 4xx-non-transient distinction but
not the budget reasoning (or vice versa)"*

Answer: *"Because 4xx errors won't succeed on retry."*

Recorded score:
```json
{
  "verdict": "PARTIAL",
  "rubric_match": "Names the 4xx-non-transient distinction but not the budget reasoning",
  "missed_concepts": ["retry-budget"],
  "follow_up": "What would happen to legitimate 5xx retries if we did retry the 4xx ones?"
}
```

### A FAIL that quotes the FAIL clause

Question's rubric.FAIL: *"Conflates 4xx with 5xx behaviour, or claims
the dead-letter is invoked for both"*

Answer: *"We send everything to the DLQ if it errors twice."*

Recorded score:
```json
{
  "verdict": "FAIL",
  "rubric_match": "Conflates 4xx with 5xx behaviour, or claims the dead-letter is invoked for both",
  "missed_concepts": ["4xx-no-retry", "dead-letter-target", "retry-budget"]
}
```

### An unscorable FAIL

Answer doesn't engage with the question at all (developer talks about a
different file).

Recorded score:
```json
{
  "verdict": "FAIL",
  "rubric_match": "<unscorable — answer does not address the question's anchored diff>",
  "missed_concepts": ["unscorable"]
}
```
