# Repository Review: cdp-app-config

**PR:** #4747
**Commit:** 1bd5fbb821cf3198b9e878be4817e2efa80a4b2a
**Files Changed:** 4

## Summary
Adds `ADDRESS_TTL_DAYS=7` and `ADDRESS_TTL_EXPIRY_ENABLED=true` to the dev, test, perf-test and ext-test env files for `trade-imports-address-book`. Prod, `defaults.env`, infra-dev and management are untouched, so prod keeps the service's safe defaults.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `services/trade-imports-address-book/dev/trade-imports-address-book.env` | SAFE | 0 | 0 | 0 |
| `services/trade-imports-address-book/ext-test/trade-imports-address-book.env` | SAFE | 0 | 0 | 0 |
| `services/trade-imports-address-book/perf-test/trade-imports-address-book.env` | SAFE | 0 | 0 | 0 |
| `services/trade-imports-address-book/test/trade-imports-address-book.env` | SAFE | 0 | 0 | 0 |

## Positive Observations
- Key names match the placeholders in the address-book PR's `application.yml`; values satisfy `@Positive` and `havingValue = "true"`.
- Identical change across exactly the four non-prod environments the AC names.
- No secrets.

## Test Coverage
- Unit tests: not applicable (config only).
- Integration tests: not applicable.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Two config lines per non-prod environment; prod is not opted in.

## Repository Verdict
**Status:** SAFE

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
