## What broke

EUDPA-483 (increment inc-070) re-heads the live-animals import-reason page.
The page is now headed with its name, "Main reason for import", and the
question "What is the main reason for importing the animals?" stays as the
radio group's visually hidden legend rather than being promoted to the `h1`.

`ImportReasonPage.heading` still matched an `h1` carrying the question, so
every route through `Journey.toImportReason` timed out on that locator. Nine
E2E tests failed on the frontend PR
(https://github.com/DEFRA/trade-imports-animals-frontend/pull/262) across
shards 1 and 2:

- `tests/e2e/pages/import-reason.spec.ts` — all four cases, in `beforeEach`
- `tests/e2e/pages/additional-details.spec.ts` — all three cases, via
  `toAdditionalDetails` → `toImportReason`
- `tests/e2e/features/change-from-cya.spec.ts` — `expect(pages.importReason.heading).toBeVisible()`
- `tests/e2e/features/additional-details-scope.spec.ts` — `openAdditionalDetails`

## What changed

- `page-objects/notification/import-reason-page.ts` — `heading` now matches the
  `h1` by the page name, exact. A new `questionGroup` locator addresses the
  radio group by its accessible name, which is the visually hidden legend.
- `tests/e2e/pages/import-reason.spec.ts` — "renders the page controls" now
  asserts the group is still named by the question, and that no heading carries
  the question, so a future promotion back to an `h1` fails here as well as in
  the frontend fit spec.

No test was weakened, skipped or removed.

## Verification

`npm run typecheck`, `npm run lint` and `npm run format:check` clean. The four
affected specs run green against the local docker-compose stack serving this
branch's frontend: 9 passed.

Increment inc-070, ticket EUDPA-483. Pairs with frontend PR #262 on the same
branch name (cross-repo branch parity).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
