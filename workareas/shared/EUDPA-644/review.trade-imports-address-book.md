# Repository Review: trade-imports-address-book

**PR:** #10
**Commit:** 23ad6aaa5b8292a148a161c34430cc6491d36e21
**Files Changed:** 12

## Summary
Adds a nullable `expireAt` to `Address`, stamped on create only when `address-book.ttl.days` is set and the environment is not prod (`OperatorService.stampExpiry`). A separate `AddressExpiryIndex` bean creates a Mongo TTL index on `expireAt` at startup, only when `address-book.ttl.expiry.enabled=true` and the environment is not prod. Defaults in `application.yml` are prod-safe (days unset, expiry disabled).

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `pom.xml` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/Application.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/Address.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressExpiryIndex.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorMapper.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfig.java` | SAFE | 0 | 0 | 1 |
| `src/main/resources/application.yml` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressExpiryIndexTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorServiceTest.java` | SAFE | 0 | 0 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfigTest.java` | NEEDS ATTENTION | 0 | 1 | 2 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressExpiryIT.java` | SAFE | 0 | 0 | 1 |

## Positive Observations
- Two independent prod safeguards, each with its own config flag plus a shared code-level `isProd()` check; a single misconfiguration does not delete in prod.
- The TTL index is created programmatically, not via `@Indexed(expireAfter)`, so `auto-index-creation` cannot build it in prod.
- `expireAt` is ignored in all three mapper directions: not on the wire, not client-settable, preserved on update.
- Pre-change documents have no `expireAt`, so Mongo's TTL monitor skips them; `AddressExpiryIT` proves this against a real Mongo.
- The IT restores shared container state (drops the index, resets `ttlMonitorSleepSecs`).

## Test Coverage
- Unit tests: good for the stamping guard, index gate and prod refusal. Gap: nothing binds `address-book.ttl.environment` through Spring, so `isProd()` is only tested on hand-built records (item 3).
- Integration tests: `AddressExpiryIT` covers stamping, response shape and real TTL removal; one millisecond-precision flake risk (item 6).

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Production code is sound and prod-safe by default; the open items are test gaps and a hardening of the fail-open `isProd()` check.

## Repository Verdict
**Status:** NEEDS ATTENTION

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfig.java | 33 | Minor | fail-open-guard | The code-level prod guard fails open: 'environment' has no constraint and isProd() is an exact match, so a null, empty (ENVIRONMENT= set to an empty string bypasses the ':local' default) or whitespace-padded value such as 'prod ' is treated as non-prod and both the stamping and the TTL-index guard pass. Low likelihood (days and expiry.enabled would also have to be set in prod), but it is the one safeguard meant to survive a config mistake. | Annotate the component '@NotBlank String environment' so a missing value fails at startup, and compare on a trimmed value in isProd() ('environment != null && "prod".equalsIgnoreCase(environment.strip())'); add the blank and padded cases to AddressTtlConfigTest. |  |  |  |
| 2 | src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorServiceTest.java | 110 | Minor | test-duplication | The same seven-line OperatorService construction with an inline AddressTtlConfig is repeated in four new tests (lines 110, 146, 275, 299), three of them identical (7, dev). | Extract a private helper such as serviceWithTtl(Integer days, String environment) beside the NO_TTL constant and call it from the four tests. |  |  |  |
| 3 | src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfigTest.java | 24 | Major | test-coverage | No test binds address-book.ttl.environment: isProd() is only exercised on hand-built records (here and in OperatorServiceTest/AddressExpiryIndexTest), so a renamed or mis-keyed environment property would silently disable the code-level prod guard with every test still green - the AC asks for a test of a prod-configured environment | Add a contextRunner test with address-book.ttl.environment=prod and address-book.ttl.days=7 asserting the bound bean's isProd() is true (and one with environment unset asserting false) |  |  |  |
| 4 | src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfigTest.java | 32 | Minor | test-coverage | binding_leavesDaysUnsetWhenNotConfigured omits the property entirely, but application.yml supplies days: ${ADDRESS_TTL_DAYS:} which resolves to an empty string in prod - the prod-safe default path (empty string binds to null and passes @Positive) is not the one under test | Add a case with withPropertyValues("address-book.ttl.days=") asserting the context has not failed and days() is null |  |  |  |
| 5 | src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/AddressTtlConfigTest.java | 49 | Minor | weak-assertion | binding_rejectsZeroDays and binding_rejectsNegativeDays (lines 49, 54) assert only hasFailed(), which passes for any startup failure, not specifically the @Positive constraint on days | Assert on the cause, e.g. assertThat(context).getFailure().rootCause().hasMessageContaining("days") or check for a BindValidationException |  |  |  |
| 6 | src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressExpiryIT.java | 102 | Minor | flaky-test | post_givesTheNewAddressAnExpireAtSevenDaysAhead compares the stored expireAt against un-truncated Instant.now() bounds: Mongo stores dates to the millisecond, so when the service stamps expireAt in the same millisecond as 'before' the read-back value is below before+7d and isBetween fails intermittently. | Truncate the lower bound to the stored precision: Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS). |  |  |  |
| 7 | README.md | 244 | Minor | stale-docs | README was not updated: line 244 still says 'Tombstones are retained indefinitely. Automatic purge / TTL is deferred', which is now untrue in dev, test, perf-test and ext-test; the 404 rule at lines 239-240 ('not a deletion signal') needs a qualifier because outside prod a 404 can now mean the address expired; ADDRESS_TTL_DAYS and ADDRESS_TTL_EXPIRY_ENABLED are documented in the ins-tests README but not in the owning service. | Update the README retention paragraph to describe the non-prod TTL, the two env vars and the prod safeguards, and qualify the 404 rule. |  |  |  |
