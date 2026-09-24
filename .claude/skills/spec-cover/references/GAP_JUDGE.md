# Gap judge (spec-cover worker)

You judge one gap row (or a small batch that shares a test file) from
`tim spec gaps --none` (or `--partial`). **You judge only — you never
write a test file or edit `coverage.json`.** Write your proposal to the
run directory the parent gave you; the parent writes the test, runs the
red/green probe, and updates `coverage.json`.

You will be told:

- The gap row(s) — `id`, `name`, `capability`, `requirementId`,
  `requirementName`, `coverage` (`none` or `partial`), `notes`
- The run directory to write into

Read the scenario in `openspec/specs/<capability>/spec.md` and any
existing (weak) links in `openspec/coverage/<capability>/coverage.json`.

## Map every Then to an assert

List each `- **THEN**` clause in the scenario. For each, name the
concrete assertion a test would make to prove it. A Then with no
matching assert means this cannot be claimed `full` — say so rather than
proposing a thin test.

## Pick a tier

Prefer **fit** for page behaviour in stub mode, **e2e** for an
integrated/system path, **unit** only when the hole is mechanism-only —
that should stay rare, and a unit link can never be the sole full
witness for a page-level Then. See
`docs/reference/openspec.md` → "Reading a coverage row" for the
confidence table. Which repo/suite this maps to:
[`../spec-catchup/references/SUITES.md`](../../spec-catchup/references/SUITES.md).

## Propose the test and the probe

Write the actual test to add — not a description of one. Then name the
mutation the parent will run as the red/green probe:

- Default: invert the strongest Then's assertion in the test itself
  (expect the wrong value) — must fail; restore — must pass.
- Unit/fit alternative: invert the production line the Then depends on
  instead of the test's assertion — must fail; restore — must pass.

Never propose a probe that would still pass inverted — if you can't find
one, the test isn't proving anything yet; keep working the proposal
before writing it up.

## Verdicts

| Verdict | When |
|---|---|
| `write-test` | `coverage: none` — a new witness is needed |
| `strengthen` | `coverage: partial` — add or upgrade a witness toward `full` |
| `accept-gap` | Honest call: not covering this now (you may still improve `notes`) |

## Output

Write `judge-<id-or-batch-label>.json` to the run directory:

```json
{
  "ids": ["SCN-ADDR-004-A"],
  "verdict": "write-test",
  "judgement": "One sentence: what's unproven and why this tier.",
  "thenToAssert": [
    { "then": "the page shows an error", "assert": "expect($('.govuk-error-summary').length).toBeGreaterThan(0)" }
  ],
  "proposal": {
    "repo": "trade-imports-animals-frontend",
    "type": "fit",
    "file": "src/server/.../addresses.test.js",
    "diff": "+ test('...', async () => { ... })",
    "coverageFile": "openspec/coverage/live-animals/addresses/coverage.json",
    "coverageDiff": "+ { \"type\": \"fit\", \"repo\": \"trade-imports-animals-frontend\", \"file\": \"...\", \"test\": \"...\", \"strength\": \"full\" }",
    "probe": {
      "invert": "the strongest Then's assertion — expect(...).toBe(false) instead of true",
      "expectRed": "the new test fails",
      "expectGreen": "restored, the new test passes"
    }
  }
}
```

For `accept-gap`, `proposal` can be omitted — `judgement` (and an
improved `notes` line, if you have one) is enough.
