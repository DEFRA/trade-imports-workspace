# Consistency Check: cdp-app-config

**Ticket:** EUDPA-644
**All repos in scope:** cdp-app-config, trade-imports-address-book, trade-imports-ins-tests
**PR:** #4747 | **Commit:** 1bd5fbb

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESS_TTL_DAYS` env var | trade-imports-address-book ✅ (`application.yml:31` `address-book.ttl.days: ${ADDRESS_TTL_DAYS:}`), trade-imports-ins-tests ✅ (README names it) | ✅ Set to `7` in dev, test, perf-test, ext-test | CONSISTENT |
| `ADDRESS_TTL_EXPIRY_ENABLED` env var | trade-imports-address-book ✅ (`application.yml:34` `address-book.ttl.expiry.enabled: ${ADDRESS_TTL_EXPIRY_ENABLED:false}`), trade-imports-ins-tests ✅ (README names it) | ✅ Set to `true` in dev, test, perf-test, ext-test | CONSISTENT |
| Value accepted by the service | trade-imports-address-book: `days` is `@Positive Integer`; `enabled` matched with `havingValue = "true"` | ✅ `7` and lowercase `true` both bind | CONSISTENT |
| Prod left at prod-safe defaults | trade-imports-address-book: defaults are days unset, expiry `false` | ✅ `prod/trade-imports-address-book.env` untouched (comment line only) | CONSISTENT |
| Environment list matches the ticket and README | Ticket AC: dev/test/perf-test/ext-test; trade-imports-ins-tests README: "CDP dev, test, perf-test and ext-test" | ✅ Exactly those four | CONSISTENT |
| `ENVIRONMENT` (second prod safeguard) | trade-imports-address-book reads `${ENVIRONMENT:local}` for `address-book.ttl.environment` and already for `cdp.environment` (`application.yml:112`) | Not set here — supplied by the CDP platform, same as every other service | CONSISTENT (expected absence) |
| Branch name `feat/EUDPA-644-address-ttl` | trade-imports-address-book ✅, trade-imports-ins-tests ✅ | ✅ Same name | CONSISTENT |

## Missing Changes

*None identified.*

Checked and judged expected:

- `infra-dev/` and `management/` env files for trade-imports-address-book are not given the two
  settings. The ticket names only dev, test, perf-test and ext-test, so addresses in those two
  environments keep the no-expiry default. Expected, but worth a conscious yes from the author if
  the service is ever deployed there.
- `defaults.env` is not used for the settings. Correct: a default would reach prod and remove the
  config half of the prod safeguard.

## Unique Changes

*None identified.* The four files carry the same two lines and nothing else.

Observation, not a finding on this PR: the EUDPA-273 precedent the ticket points at
(`NOTIFICATION_TTL_DAYS` / `NOTIFICATION_TTL_SWEEP_ENABLED` in trade-imports-animals-backend's
`application.yml`) has no matching entries under `services/trade-imports-animals-backend/` in this
checkout, so this PR is the first TTL opt-in in cdp-app-config for these services rather than a
copy of an existing one.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The two env var names, their values and the four environments match what trade-imports-address-book binds and what the trade-imports-ins-tests README describes, and prod is left on the service's prod-safe defaults.
