# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-644
**All repos in scope:** cdp-app-config, trade-imports-address-book, trade-imports-ins-tests
**PR:** #10 | **Commit:** 9e8a179

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESS_TTL_DAYS` / `ADDRESS_TTL_EXPIRY_ENABLED` named correctly | trade-imports-address-book ✅ (`application.yml:31,34`), cdp-app-config ✅ (four env files) | ✅ README names both, spelled the same | CONSISTENT |
| Environments where expiry is on | cdp-app-config ✅ dev, test, perf-test, ext-test | ✅ README: "CDP dev, test, perf-test and ext-test" | CONSISTENT |
| "About 7 days after it was created" | cdp-app-config ✅ `ADDRESS_TTL_DAYS=7`; trade-imports-address-book stamps `now + days` on create only | ✅ README wording matches | CONSISTENT |
| Local stack has no expiry | trade-imports-address-book: defaults are days unset / expiry `false`; no `ADDRESS_TTL_*` in its `compose.yml` or the workspace `docker/stack/*.compose.yml` | ✅ README says the local docker-compose stack sets neither | CONSISTENT |
| Seeded `globalSetup` addresses expire and are re-created | trade-imports-address-book: no exemption on create (ticket open question resolved this way) | ✅ README says so; `ensureE2eAddressBook` (`domain/shared/fixtures/e2e-address-book.ts:145`) creates when missing | CONSISTENT |
| Client model matches the wire contract | trade-imports-address-book: `expireAt` is not on the response | ✅ `AddressBookRecord` unchanged, nothing reads `expireAt` | CONSISTENT |
| Cleanup-only teardown removed, behaviour deletes kept | Ticket AC 6 | ✅ `deleteCreatedAddresses`, `trackByName`, `createdIds`, the fixture teardown, `bin/address-book-purge.ts` and its npm script are gone with no remaining callers; the five remaining spec `deleteAddress` calls each precede an assertion on the deleted state | CONSISTENT |
| Branch name `feat/EUDPA-644-address-ttl` | cdp-app-config ✅, trade-imports-address-book ✅ | ✅ Same name | CONSISTENT |

## Missing Changes

*None identified* in this repo.

Checked and judged fine:

- No dangling references: a search of `*.ts`, `*.md`, `*.json` and `*.yml` finds no remaining use
  of `trackByName`, `deleteCreatedAddresses`, `createdIds`, `address-book:purge` or
  `address-book-purge`.
- Remaining `deleteAddress` callers are all product behaviour, not cleanup:
  `tests/plants/e2e/features/review.spec.ts:260`, `tests/plants/e2e/features/destination.spec.ts:257`,
  `tests/animals/e2e/features/address-book/addresses-live-link.spec.ts:171` and `:230`,
  `tests/animals/e2e/features/address-book/addresses-submit-freeze.spec.ts:116`.
- `domain/shared/fixtures/e2e-address-book.ts:153` still soft-deletes duplicate seed records. That
  keeps "exactly one live record per fixture name" true for `findByName`; it is not post-test
  cleanup, so leaving it is in line with the ticket.
- `README.md:146` still mentions "a per-test address-book teardown and a one-off purge" — that is
  history of how the leak was fixed, reworded in this PR to drop the "see below" pointer. Accurate.

Follow-up outside the three PRs (workspace repo, not this one):

- `.claude/skills/requirements-pipeline/references/gates.json:113` in trade-imports-workspace still
  lists `address-book:purge` under this repo's `remoteScripts`. That list is a deny list (the build
  gate refuses a rung naming one of them), so a name that no longer exists is harmless, but it is
  now stale and should be dropped when this merges.

## Unique Changes

- **Tooling and fixture removal** (`bin/address-book-purge.ts`, the `address-book:purge` script,
  the `addressBookApi` fixture teardown, `trackByName` and its one caller in
  `address-book-cross-user-visibility.spec.ts`) — only this repo, and exactly the ticket's scope
  for it. Intentional.
- **This README is the only prose description of the service's expiry.** trade-imports-address-book
  did not update its own README, which still says "Automatic purge / TTL is deferred"
  (`README.md:244` there). Raised against that repo; nothing to change here, but the two READMEs
  currently disagree.
- **Consequence worth knowing, not a defect:** with teardown gone, a local docker-compose run and
  any CDP environment without both settings accumulates test addresses with no cleanup path at all
  now that the purge script is deleted. The README states this for local. On CDP it depends on the
  cdp-app-config PR being merged and deployed, so the three PRs should land together, with this one
  not ahead of the other two.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The README's setting names, environments and 7-day figure match trade-imports-address-book and cdp-app-config, the cleanup removal leaves no dangling references, and every remaining delete is one a test asserts on.
