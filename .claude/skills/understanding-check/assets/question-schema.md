# Schema: `questions.json`

Combined question set across all repos in scope. Mutated only by:

- `tim understanding-check question add` — append.
- `tim understanding-check question replace` — replace by id.
- `tim understanding-check question remove` — drop by id.

The plan-gate artifact. The user reviews this file (via
`tim understanding-check report --preview`) and edits it before the interview starts.

## Shape

```json
{
  "ticket": "EUDPA-XXXXX",
  "generated_at": "2026-06-08T13:14:15Z",
  "questions": [
    {
      "id": "Q1",
      "category": "implementation",
      "prompt": "Why does the retry path skip the dead-letter queue when the exception is a 4xx?",
      "anchorEvidence": { "file": "trade-imports-animals-backend/src/main/java/.../RetryHandler.java", "lines": "42-58" },
      "expectedConcepts": ["4xx-no-retry", "dead-letter-target", "retry-budget"],
      "rubric": {
        "PASS": "Names BOTH that 4xx is non-transient AND that retrying would exhaust the budget for legitimate 5xx",
        "PARTIAL": "Names the 4xx-non-transient distinction but not the budget reasoning (or vice versa)",
        "FAIL": "Conflates 4xx with 5xx behaviour, or claims the dead-letter is invoked for both"
      }
    }
  ]
}
```

## Field reference

| Field | Type | Notes |
|---|---|---|
| `ticket` | string | `EUDPA-XXXXX`. |
| `generated_at` | ISO8601 | When `tim understanding-check question add` first ran. |
| `questions[].id` | string | `Q1`-`Q12`, assigned by the helper in order. Stable across replaces; `tim understanding-check question remove` renumbers downstream ids. |
| `questions[].category` | enum | See below. |
| `questions[].prompt` | string | The question, phrased plainly. No multi-part stems. |
| `questions[].anchorEvidence` | `{ file, lines }` | The diff hunk the question is grounded in. Required — surfaced in the interview UI without leaking the diff content. |
| `questions[].expectedConcepts` | array of strings | Concept tags the answer should touch. Drives the "gaps in understanding" report section via dedup. |
| `questions[].rubric.PASS` | string | **Categorical clause**, naming the concept. The helper validates: must contain "names", "identifies", "explains", "describes", or "cites" + a noun. Hedging phrases ("demonstrates", "understands", "shows good") cause the helper to reject. |
| `questions[].rubric.PARTIAL` | string | Half-credit condition. Same categorical-clause requirement. |
| `questions[].rubric.FAIL` | string | Default if neither PASS nor PARTIAL fires. Often the inverse / common misconception. |

## Allowed `category` values

| Category | Use it for |
|---|---|
| `architecture` | Cross-component decisions, layering, boundary calls |
| `implementation` | Inside-the-method choices, control flow, algorithm |
| `scenario` | "What happens if X" — runtime behaviour under a specific input |
| `debugging` | "If you saw symptom Y in prod, where would you look" |
| `test-coverage` | What the new tests cover and don't cover |
| `operability` | Logging, metrics, error visibility, alerting, rollback |
| `security` | Inputs trusted, secrets handled, authz boundaries |

## Hard constraints (enforced by `tim understanding-check question add`)

- 8 ≤ total questions ≤ 12. `tim understanding-check question add` exits non-zero on the 13th.
- ≥1 question per category that has analysis findings. The
  QUESTION_GENERATOR persona is told to skip empty categories — **do not
  fabricate** to fill a slot. The cross-run audit asserts this.
- ≥2 questions across the run targeting an `aiSuspectedRegions` entry.
  These are the ones most likely to find a gap.
- `rubric.PASS` and `rubric.PARTIAL` must contain at least one of:
  `names | identifies | explains | describes | cites | distinguishes |
  contrasts | enumerates`, followed by a noun phrase. The helper greps
  for this and rejects on miss.

## Categorical rubric vs hedged rubric — worked examples

### PASS

```text
# Wrong — hedged
Demonstrates a good understanding of why the retry logic skips the DLQ.

# Correct — categorical
Names BOTH that 4xx is non-transient AND that retrying would exhaust the
budget for legitimate 5xx.
```

### PARTIAL

```text
# Wrong — vague
Partial understanding of the retry behaviour.

# Correct — categorical
Names the 4xx-non-transient distinction but not the budget reasoning
(or vice versa).
```

### FAIL

```text
# Wrong — circular
Doesn't pass.

# Correct — categorical
Conflates 4xx with 5xx behaviour, or claims the dead-letter is invoked
for both.
```
