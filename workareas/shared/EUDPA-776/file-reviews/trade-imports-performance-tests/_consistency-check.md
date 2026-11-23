# Consistency Check: trade-imports-performance-tests

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #47 | **Commit:** 5c90936

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Live animals contact step removed | animals-frontend ✅, ins-tests ✅ | ✅ `animals-contact`, `animals-contact-save` endpoints and the `contact` step gone | CONSISTENT |
| Opening run after transporters ends at check your answers via documents then addresses | animals-frontend `OPENING_RUN_TAIL` (`scripts/lighthouse/seed-notification.js:161`), ins-tests `openingRunTailSteps()` (`flows/animals/seed-form-steps.ts:164`) | `openingRunFromTransporter`, step name `'opening-run-from-transporter'`, `OPENING_RUN_DOCUMENTS_SLUG` (`src/k6/live-animals.js:169-196`) | NAMING DRIFT |
| PIMS schema versions the gateway publishes | gateway publishes `0.1.0`, `0.2.0`, `0.3.0`, now `0.4.0` (`NotificationSqsListener`) | ❌ `src/config/eventing.js:16` `SCHEMA_VERSIONS = Object.freeze(['0.1.0', '0.2.0'])` | INCONSISTENT (pre-existing for 0.3.0, widened by 0.4.0) |
| Plants contact step | plants still has a contact page (out of scope) | `plants-contact*` endpoints and `picker('contact', …)` kept | EXPECTED |

## Missing Changes

- `src/config/eventing.js:16`: the gateway now tags `service_bus_forwarded`/`notification.message` with four schema versions. `SCHEMA_VERSIONS` reads two, so a run reports forwarded counts for v0.1.0 and v0.2.0 only. Add `0.3.0` and `0.4.0`, or note in the README why only the first two are read. Pre-existing for `0.3.0` (EUDPA-615), widened by this ticket's v0.4.0.

## Unique Changes

- `src/k6/journeys.js`: `page.url.endsWith('/confirmation')` → `pathOf(page.url).endsWith('/confirmation')` (two places). Not about the contact page; plausibly needed because the confirmation URL now carries a query or trail. Say why in the PR description, or move it to its own commit.
- `src/config/smoke.test.js`: the expected animals endpoint swaps `animals-contact-save` for `animals-addresses-save`, matching the new opening-run step. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/k6/live-animals.js:169-196` | `openingRunFromTransporter` / `'opening-run-from-transporter'` names the same "documents then addresses after transport" tail that animals-frontend calls `OPENING_RUN_TAIL` and ins-tests calls `openingRunTailSteps()`. | One name across the three seeders | `openingRunTail`, step name `'opening-run-tail'` |
| `src/k6/live-animals.js:169` | `OPENING_RUN_DOCUMENTS_SLUG = 'accompanying-documents'` is a constant for one slug while `'addresses'` four lines below is inline in the same function. | One treatment for both slugs | Inline both, as every other step in the file does with `pagePath(context, '<slug>')` |

## Statements Made Untrue

*None identified* (`README.md:1020` names only the `0.1.0` gate, which stays true).

*Searched: `contact`, `consignment/contact`, `contactAddress`, `BRANCH`, `schema_version`, `0.3.0`, `0.4.0`, `SCHEMA_VERSIONS` in `src/`, `README.md` (plants and address-book Branch hits are out of scope and correct).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 3 inconsistencies found
**Summary:** The contact step removal matches the frontend and ins-tests, but the opening-run tail has a third name here, and the eventing config still reads only two of the four PIMS schema versions the gateway now publishes.
