## What broke

The E2E boundary spec `tests/e2e/features/documents-limits.spec.ts` hardcoded the
accompanying-documents cap at ten. Increment inc-135 (EUDPA-516) raises that cap on
the frontend to fifteen, to match Design release 1, so the spec's eleventh document
is now accepted and the run fails at

```
await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
```

with `element(s) not found` — the error summary the spec waited for never renders,
because the cap it was probing no longer exists at that number.

Seen on frontend PR
[DEFRA/trade-imports-animals-frontend#283](https://github.com/DEFRA/trade-imports-animals-frontend/pull/283),
E2E workflow run 34275395585, shard `e2e (1,3)`, failed on the first attempt and on
retry #1. Every other test in the shard passed.

## What changed

One spec, one number. `maximumDocuments` moves from 10 to 15; the eleventh document
becomes a sixteenth, and the expected error summary becomes
"You can add a maximum of 15 documents" — which the spec already derives from the
constant, so that string moves with it.

The shape of the assertion is untouched: the Nth document is accepted and shows as
Safe, the N+1th is refused with the capacity error in the summary, no row is added
for it, and no field-level error appears alongside. Nothing is skipped, relaxed or
removed.

## Why it belongs here rather than in the frontend

The cap is a single frontend obligation constant
(`src/server/app/sets/live-animals/obligations/sections/documents.js`, `maxEntries`),
read by the page, the submit guard and the error message. The frontend's own FIT
coverage reads that constant rather than a literal, so it passed on PR 283
unchanged. Only this E2E spec spelled the old number out.

## Increment and ticket

- Increment: `inc-135`
- Ticket: EUDPA-516
- Travels with frontend PR
  [DEFRA/trade-imports-animals-frontend#283](https://github.com/DEFRA/trade-imports-animals-frontend/pull/283)
  and shares its branch name, so the frontend E2E run picks up the branch-tagged
  tests image.

## Verification

- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run format:check` — clean
- The behaviour itself is proved by the frontend E2E run on PR 283 once this branch
  publishes its image.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
