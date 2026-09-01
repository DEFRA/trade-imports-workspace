## What broke

The frontend PR for this increment
([animals-frontend#221](https://github.com/DEFRA/trade-imports-animals-frontend/pull/221))
swaps the country of origin `govukSelect` for the shared accessible-autocomplete
type-ahead. The enhancement moves the select's id onto the enhanced input and
renames the select `countryOfOrigin-select`, so `select#countryOfOrigin` — the
locator this suite used — no longer matches anything on an enhanced page.

That took out far more than the origin specs. `flows/journey.ts` answers origin
on the way to almost everywhere, so `locator.selectOption` timed out in
`beforeEach` for the transporter, transited-countries, admin and INS specs too.
The origin visual baseline also drifted: the page is 35px taller for the new
"Start typing to search for a country." hint and the search box.

Evidence: E2E shard 3 of run
[33523020032](https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/33523020032),
`test-results/*/error-context.md`.

## What changed

- **`page-objects/notification/origin-of-import-page.ts`** — `countryOfOrigin`
  resolves `#countryOfOrigin`, which is the enhanced input with JavaScript and
  the native select without it. `selectCountry` asks the element what it is and
  either picks an option or types the name and clicks the match, mirroring
  `chooseCountryOfOrigin` in the frontend's own FIT journey helper. Adds
  `countrySelect` (the native select that still carries and submits the country
  code) and `countryOption` (a match in the results list).
- **`tests/e2e/features/country-of-origin-type-ahead.spec.ts`** (renamed from
  `country-of-origin-select.spec.ts`) — now exercises the type-ahead: filtering
  as you type, the chosen country left visible in the box, the code submitted
  and read back on return. The full option list is still asserted, on the
  fallback select, at 32 entries — the placeholder plus 31 countries, the
  scroll-only divider rule having gone with the select.
- **`tests/a11y/notification-journey-error-state.spec.ts`** — asserts the empty
  starting value instead of picking a blank option a type-ahead does not offer.
  The invalid submit and the scan are unchanged.
- **Linux origin-of-import visual baseline** refreshed from the CI actual.

Checked locally with `npm run typecheck`, `npm run lint` and
`npm run format:check`; the E2E proof is this PR's own run plus the frontend's.

## Follow-up

The macOS baseline (`origin-of-import-e2e-darwin.png`) still needs refreshing on
a Mac with `npm run test:visual:update:macos`, as EUDPA-353 did in #131. It does
not gate CI, which runs Linux.

Increment inc-077 of the DR1 parity backlog. EUDPA-362.
