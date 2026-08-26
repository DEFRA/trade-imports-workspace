Increment `inc-007` of the DR1 parity backlog. Ticket **EUDPA-342**. Frontend repo only — no sibling PR.

## Why

The service navigation bar rendered the service name and nothing else: `layout.njk` called `govukServiceNavigation` with a `serviceName` and `serviceUrl` and no `navigation` array. A separate bespoke strip below it carried the signed-in user's email address and a "Sign out" link. Design release 1 puts four items in the bar on every page — Dashboard, Address book, Manage account, Log out — marks the current one active, and shows no signed-in identity at all.

## What changed

- **`src/server/app/shared/layout.njk`** — passes a `navigation` array to `govukServiceNavigation` for authenticated requests: Dashboard (`/`), Address book, Manage account, Log out (`/auth/sign-out`). Address book and Manage account point at a placeholder, as Design release 1 does for the account page, because neither has a home in this service yet. The `appServiceHeader` call is gone.
- **`src/server/app/shared/copy.en.js` / `copy.cy.js`** — item labels under `layout.serviceNavigation`, plus the menu-button text for the mobile toggle.
- **`src/server/app/shared/paths.js`** and **`src/config/nunjucks/context/context.js`** — the active item is resolved server-side via a new `inDashboardSection` helper and an `activeNavigationItem` context field, so every notification page marks Dashboard as the current section (`aria-current`).
- **`src/client/javascripts/application.js`** — instantiates govuk-frontend's `ServiceNavigation` so the mobile menu button works.
- **Deleted** `src/server/common/components/service-header/{template.njk,macro.njk,_service-header.scss}` and its `_index.scss` entry. Sign-out now lives only in the navigation, as "Log out".

## Tests

`layout.test.js`, `copy.test.js`, `context.test.js` extended, plus a new `service-navigation.fit.spec.js`. Full unit and fit suites green, lint and format clean.

## Follow-ups recorded on the increment

Three open questions are recorded in the backlog rather than fixed here — all of them land outside this repo or outside this increment:

1. **`trade-imports-animals-tests` needs a matching branch.** Three specs in `tests/e2e/features/auth.spec.ts` target the removed "Sign out" link and the removed signed-in email. The fix is not mechanical: `linkSignOut` lives on the shared `BasePage` and the admin specs still use it against the admin app, which keeps its own service-header, so the new "Log out" locator must be overridden on the notification page object, and the "displays signed in user after signing in" test deleted rather than repointed.
2. **The `origin-of-import` visual baselines need regenerating** on both darwin and linux, and the now-empty `mask: [pages.originOfImport.user()]` argument dropped.
3. **Orphaned view-context fields.** `authEnabled` and `userSession.displayName` no longer have any template consumer. Whether they stay is a team decision, not this increment's.
