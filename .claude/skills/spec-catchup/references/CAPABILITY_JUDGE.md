# Capability judge (spec-catchup worker)

You judge one capability (or a small batch that shares a file) against
the suite report and source. **You judge only — you never edit
`openspec/`.** Write your verdict to the run directory the parent gave
you; the parent applies it.

You will be told:

- The capability path(s), e.g. `live-animals/addresses`
- Where the suite report lives — the fit/vitest run's output and, for
  the E2E leg, the Playwright report/spec files under
  `repos/trade-imports-animals-tests/tests/e2e/`
- The run directory to write into

Read `openspec/specs/<capability>/spec.md` and
`openspec/coverage/<capability>/coverage.json`, then the linked tests
and the source they exercise.

## Verdicts

Use the whole set report (fit + e2e; admin: vitest + e2e) as the
behaviour oracle. Unit tests do not portray behaviour — never use one to
justify rewriting `spec.md`; the one exception is fixing a unit link's
own path/title (see "Unit links" below).

| What you see | Verdict | What the parent should do |
|---|---|---|
| Linked test still in the report; `spec.md`'s words are wrong | `edit-spec` | Edit `spec.md` (and `coverage.json` if the name or ID changes) |
| Report shows behaviour with no requirement/scenario for it | `add-spec` | Add the requirement/scenario to `spec.md` and its `coverage.json` row |
| Linked fit/e2e test moved or was renamed, same behaviour | `update-link` | Update the coverage link's `file`/`test` |
| Linked fit/e2e test is gone; source still shows the behaviour | `remove-dead-link` | Remove the dead link from `coverage.json` (recompute that scenario's coverage from what's left) and leave `spec.md` untouched — this becomes a `spec-cover` gap, not a catch-up rewrite |
| Linked fit/e2e test is gone; source shows the behaviour is gone too | `delete-spec` | Delete `spec.md` and `coverage.json` for this capability together |
| The words already match the report and source | `no-action` | Nothing |
| You cannot tell either way, even after checking the trace (see below) | `uncertain` | Leave the spec; the parent reports this in the completion output rather than guessing |

### Traces — a fallback, not a default

Step 1 now runs both legs with `--trace=on` (see
[`SUITES.md`](SUITES.md#traces)), so a trace exists for every test in the
report, pass or fail — not just the `journeys` fit project, which already
always records one.

Reach for it when source + test body genuinely don't resolve the
judgement — most often because the test routes through a page object or
shared journey helper (`page-objects/` in `trade-imports-animals-tests`)
that hides what actually happened, or the verdict would otherwise land on
`uncertain`. Don't open a trace when `spec.md`, the test, and the source
already agree — that's cost with no signal, and it doesn't apply to
`update-link`/`remove-dead-link`/`delete-spec` judgements at all (those
turn on whether a test still exists, not on behaviour).

Trace file: `test-results/<project-and-test-dir>/trace.zip` (Playwright
names the directory from the project + test title). Inspect it with the
`playwright-trace` skill. If it resolves the judgement, cite what you saw
in `evidence` the same way you'd cite a test/source line — e.g.
`"trace": "test-results/features-declares-species/trace.zip — network tab
shows the species POST firing before the redirect"`.

### Unit links

A `type: "unit"` coverage link is judged for path/title drift only —
open the linked file (vitest in the Node frontends and admin repo; the
three JUnit methods on `ins/notification-tracking`) and fix the link if
the test moved or was renamed (`update-link`). Never run the unit suite
as a second report, never treat "not in the fit/e2e report" as missing,
and never `delete-spec` because a unit test vanished if source or
fit/e2e still show the behaviour.

### `remove-dead-link` in detail

Lint has no `--links` group, so a coverage link naming a test that no
longer exists is invisible to `tim spec lint`. You are the check for it:
compare each fit/e2e coverage link against the suite report, and any
link the report doesn't exercise against the source it claims to prove.
If source still shows the behaviour, strip that test entry from the
scenario's `tests[]`, let its `coverage` re-derive from what's left
(`none` if that was the only link), and leave the requirement/scenario
wording in `spec.md` alone — `spec-cover` picks it up from
`tim spec gaps` next.

## Output

Write `judge-<capability-or-batch-label>.json` to the run directory:

```json
{
  "capability": "live-animals/addresses",
  "verdict": "edit-spec",
  "judgement": "One sentence: what changed and why this verdict.",
  "evidence": {
    "test": "repos/trade-imports-animals-frontend/src/.../foo.test.js:42",
    "source": "repos/trade-imports-animals-frontend/src/.../bar.js:10",
    "trace": "optional — only when the trace fallback actually resolved the judgement"
  },
  "proposal": {
    "specDiff": "unified diff or the replacement spec.md section",
    "coverageDiff": "unified diff or the replacement coverage.json entry, if it also changes"
  }
}
```

For `uncertain` or `no-action`, `proposal` can be omitted — `judgement`
alone is enough for the parent's completion output. For a batch of
capabilities that share one file, one `judge-*.json` covering all of
them is fine; give it a label naming the shared file, not a single
capability path.
