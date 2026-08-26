## What broke

The E2E suite on frontend PR [#212](https://github.com/DEFRA/trade-imports-animals-frontend/pull/212)
(EUDPA-342, increment inc-007 of the DR1 parity backlog) went red on four tests.

That PR gives the notification frontend the Design release 1 service navigation —
Dashboard, Address book, Manage account and Log out on every page — and removes the
bespoke strip that carried the signed-in user's email address and a "Sign out" link.
The suite still targeted the strip:

- `tests/e2e/features/auth.spec.ts:31` and `:43` clicked `linkSignOut`, defined on the shared
  `BasePage` as `getByRole('link', { name: 'Sign out' })`. The link no longer exists on the
  notification frontend, so both timed out after 30s.
- `tests/e2e/features/auth.spec.ts:38` asserted the signed-in email address is visible.
  Design release 1 shows no signed-in identity, so there is nothing to see.
- `tests/e2e/visual/origin-of-import.visual.spec.ts:12` compared against a baseline that
  still showed the deleted strip: 1280x1352 expected, 1280x1332 received, 78157 pixels different.

## What changed

- **`page-objects/notification/notification-dashboard-page.ts`** — override `linkSignOut` as
  `getByRole('link', { name: 'Log out', exact: true })`. The admin portal still renders its own
  "Sign out", and `tests/e2e/features/admin/admin-auth.spec.ts` uses the same getter against it,
  so the shared `BasePage` getter and the admin specs are deliberately left alone.
- **`tests/e2e/features/auth.spec.ts`** — `displays signed in user after signing in` becomes
  `does not display the signed in user after signing in`, asserting `toHaveCount(0)`. The identity
  is gone by product decision, so the suite states that rather than dropping the coverage.
- **`tests/e2e/visual/origin-of-import.visual.spec.ts`** — drop `mask: [pages.originOfImport.user()]`.
  That locator now resolves to zero elements and Playwright treats an empty mask as a no-op,
  so it was protecting nothing while reading as though it were.
- **Both `origin-of-import` baselines** (`-e2e-darwin.png`, `-e2e-linux.png`) re-captured against the
  new navigation, on a local stack running the branch-tagged frontend image
  (`feat-eudpa-342-frontend-s-service-navigation-carries-no`) via
  `npm run test:visual:update:linux` and `npm run test:visual:update:macos`.

## Verified

- `npx playwright test tests/e2e/features/auth.spec.ts` against that stack — 9 passed.
- `npm run test:visual:update:*` — visual test passes against each re-captured baseline.
- `npm run typecheck`, `npm run lint`, `npm run format:check` — all clean.

## Belongs to

Ticket EUDPA-342, increment `inc-007` of `workareas/shared/dr1-parity-union`. Same branch name as the
frontend PR (workspace CLAUDE.md rule 2, cross-repo branch parity) — the frontend E2E workflow probes
Dockerhub for a branch-tagged tests image, so this must land alongside
[frontend #212](https://github.com/DEFRA/trade-imports-animals-frontend/pull/212).
