# Consistency Check: trade-imports-address-book

**Ticket:** EUDPA-644
**All repos in scope:** cdp-app-config, trade-imports-address-book, trade-imports-ins-tests
**PR:** #10 | **Commit:** 23ad6aa

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESS_TTL_DAYS` env var | cdp-app-config ✅ (`7` in dev/test/perf-test/ext-test), trade-imports-ins-tests ✅ (README) | ✅ `application.yml:31`, bound as `@Positive Integer days` | CONSISTENT |
| `ADDRESS_TTL_EXPIRY_ENABLED` env var | cdp-app-config ✅ (`true` in the same four), trade-imports-ins-tests ✅ (README) | ✅ `application.yml:34`, gates `AddressExpiryIndex` via `@ConditionalOnProperty(havingValue = "true")` | CONSISTENT |
| Prod-safe defaults | cdp-app-config: prod env file untouched | ✅ days unset, expiry `false`, plus the `isProd()` code check in both `stampExpiry` and `createIndex` | CONSISTENT |
| Local stack leaves expiry off | trade-imports-ins-tests README: "the local docker-compose stack sets neither" | ✅ No `ADDRESS_TTL_*` in this repo's `compose.yml`; none in the workspace `docker/stack/*.compose.yml` either | CONSISTENT |
| Wire contract unchanged (`expireAt` not exposed) | trade-imports-ins-tests: `AddressBookRecord` has no `expireAt`, no client change needed | ✅ `OperatorMapper` ignores `expireAt` on the response; `AddressExpiryIT` asserts `$.expireAt` does not exist; `docs/openapi/*` untouched | CONSISTENT |
| Seed addresses are not exempt | trade-imports-ins-tests: `ensureE2eAddressBook` re-creates missing seeds; README says so | ✅ `create` stamps every new address, no exemption path | CONSISTENT |
| Tests alongside the behaviour change | trade-imports-ins-tests removes teardown rather than adding E2E cover (expiry cannot be observed in a suite run) | ✅ Unit, context-runner and Testcontainers IT cover stamping, the index, and the prod refusal | CONSISTENT |
| README updated for the new behaviour | trade-imports-ins-tests ✅ README rewritten, names both settings and the four environments | ❌ `README.md` not touched; line 244 still says expiry is deferred | INCONSISTENT |
| Branch name `feat/EUDPA-644-address-ttl` | cdp-app-config ✅, trade-imports-ins-tests ✅ | ✅ Same name | CONSISTENT |

## Missing Changes

1. **`README.md` contradicts the change and the tests repo's README.**
   `README.md:244` (section "Soft delete (tombstones)") still reads: "Tombstones are retained
   indefinitely (~1 KB each). Automatic purge / TTL is deferred." After this PR that is untrue in
   dev, test, perf-test and ext-test, where the Mongo TTL index removes ACTIVE and DELETED documents
   once `expireAt` passes. The same section's 404 rule (`README.md:239-240`, "A 404 means unknown id
   or an id outside the caller's organisation — it is not a deletion signal") also needs a
   qualifier: outside prod a 404 can now mean the address expired.
   trade-imports-ins-tests documents `ADDRESS_TTL_DAYS`, `ADDRESS_TTL_EXPIRY_ENABLED`, the four
   environments and the local-stack exception in its README; the owning service documents none of
   it, so the only prose description of the service's expiry lives in another repo. The "CDP
   environments" section (`README.md:180-182`) is the natural place for the two settings.

## Unique Changes

- **`awaitility` test dependency (`pom.xml`)** — only this repo; used by `AddressExpiryIT` to wait
  for Mongo's TTL monitor. Version is managed by the Spring Boot BOM. Intentional.
- **Mongo TTL index instead of a scheduled sweeper.** The ticket's strawman mirrors EUDPA-273
  (`NotificationExpirySweeper`, `notification.ttl.sweep.enabled` / `NOTIFICATION_TTL_SWEEP_ENABLED`
  in trade-imports-animals-backend). This repo uses a TTL index and names the switch
  `address-book.ttl.expiry.enabled` / `ADDRESS_TTL_EXPIRY_ENABLED`. The strawman is explicitly
  non-prescriptive and both safeguards are kept, so this is intentional — but the two services now
  use different mechanisms and different suffixes (`SWEEP_ENABLED` vs `EXPIRY_ENABLED`) for the
  same idea. `days` and `environment: ${ENVIRONMENT:local}` do match the precedent key for key.
- **Hard removal is new behaviour for consumers, in non-prod only.** Until now a fetched address
  either existed or came back as a tombstone with `deleted: true`. Expired addresses now return
  404. Checked the consumers outside this PR and all already treat 404 as "no address":
  `trade-imports-animals-frontend` and `trade-imports-plants-frontend`
  (`src/server/app/services/address-book/client.js`, `getAddress` returns `undefined` on 404) and
  `trade-imports-animals-backend` (`AddressBookClient.findById` returns `Optional.empty()` on
  `NotFound`). No consumer change is needed; a draft older than 7 days in non-prod will show its
  linked address as not provided, which the ticket leaves out of scope.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistencies found
**Summary:** Config keys, defaults, wire contract and branch name line up with cdp-app-config and trade-imports-ins-tests, but this repo's README still says TTL is deferred while the tests repo's README documents the expiry this service now performs.
