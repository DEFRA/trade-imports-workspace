# Code Review: EUDPA-349

**Ticket:** URL-safe fulfilment ids
**Reviewer:** Claude Code Agent
**Date:** 2026-08-27
**Verdict:** CONCERNS

## Summary

The delimiter half of this ticket (AC 1 and AC 2) is delivered cleanly — `/` becomes `.`
throughout, the token regex bans both delimiters, and every fixture moved in lock-step. The
naming half (AC 3) is applied to the exported surface and stops before the locals,
parameters, filenames and doc comments underneath, leaving the id-vs-index confusion the
ticket exists to remove alive in about 25 places. One issue blocks merge and is not a
naming issue: the separator change reinterprets already-persisted fulfilment indices and
fails as a hard `TypeError`, making any saved depth-2 notification unloadable.

## Repositories Analyzed

| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #213 | fa4a0b7 | 53 | NEEDS ATTENTION | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |

**Scope note:** PR discovery also swept in `trade-imports-animals-backend` #50
(`6ec2139`), which is `feat(EUDPA-171) Add notification amend feature`, merged in June and
containing zero `fulfil` matches. It was dropped from scope. No `EUDPA-349` branch exists
in the backend or tests repo — this ticket is genuinely single-repo.

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | `fulfilment index` strings use `.` as the segment separator throughout the frontend | Yes | Complete. No `/`-delimited index literal remains in `src/`; depth-2 tests genuinely exercise the split. Caveat: complete for *new* data only — see the Risk Matrix. |
| 2 | Nested path tokens must not contain the delimiters `:` or `.` | Yes | `FIELD_UNSAFE = /[.:[\]/*]/` in `fulfilment-registry.js`, tested in `fulfilment-registry.test.js`. This is what makes the `startsWith(parent + '.')` prefix matching sound. |
| 3 | Code consistently refers to `fulfilment index` vs `fulfilmentId` | Partial | Exported functions and record properties renamed; the locals, parameters, filenames and doc comments they feed largely were not. ~25 residual sites, listed as items in the repo review. |

## Test Coverage Assessment

- **Unit Tests:** Present and good for the delimiter swap — every touched behaviour has a
  test that would fail on a regression.
- **Integration Tests:** Partial. The tests repo seeds only depth-1 indexes, which contain
  no delimiter, so the E2E suite is structurally unable to catch a delimiter regression.
- **Back-compat:** Missing, and reduced. The codec suite's one historic-data fixture was
  migrated in place rather than joined by a legacy sibling.
- **Negative cases:** `parseCompositeFulfilmentId` is only exercised on well-formed input,
  despite being positioned as the value arriving from URL params and API path segments.

## Configuration & Environment

- **New Environment Variables:** None.
- **Database Changes:** None schema-wise, but the *encoding* of an already-persisted value
  changes. `fulfilments` and `submittedFulfilmentsBaseline` on stored notifications hold
  record maps keyed by fulfilment index; documents written before this PR use `/`. The
  backend treats the payload as opaque (`Notification.java:49`), so nothing migrates it.

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Medium |

Correctness is Medium rather than Low solely because of the persisted-data path; the
in-memory behaviour of the change is sound and well covered.

## Conclusion

Merge-blocking: one item (#44) — decide whether legacy `/`-delimited persisted indices
exist, and either normalise them on read or record explicitly that they do not. Everything
else is AC 3 debt: individually trivial, collectively the reason the ticket was raised, and
best judged as a group rather than line by line. Full item list and the three cross-cutting
themes are in `review.trade-imports-animals-frontend.md`.
