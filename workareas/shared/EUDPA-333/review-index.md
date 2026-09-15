# Code Review: EUDPA-333

**Ticket:** Delegate address creation to the INS address book service
**Reviewer:** Claude Code Agent
**Date:** 2026-09-15
**Verdict:** ADDRESSED

## Summary

The handshake shape is right and closely matches the ticket's tech notes: INS holds the return-URL registry in code, never accepts a URL from the caller, refuses unregistered journey types, and the animals side derives its reverse binding from `evaluation.js` rather than hand-listing UUIDs. Two AC-adjacent issues on the same file. Correctness: the recoverable-save failure branch in `address-return/controller.js:79` chains `.code(500)` onto an `h.redirect(...)`, and browsers do not follow `Location` on 5xx, so the trader hits a blank 500 instead of the picker with the error banner — breaks "the Trader sees an error and their existing journey answers are preserved". Security: the `address-return` GET calls `state.commit(...)` with no session-bound token, so a third-party page can get a signed-in trader to click a crafted link and commit an address to their notification — bounded blast radius but the mitigation (per-request nonce in yar, opaque round-trip through INS) is cheap. Also flagged: a reusable-workflow bug on the CI hardening in the workspace PR, and a `buildReturnUrl` maintainability trap on the INS side.

## Repositories Analyzed

| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #312 | 2567f8dd | 22 | ADDRESSED | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-animals-tests | #204 | 3d9231e | 7 | ADDRESSED | [review.trade-imports-animals-tests.md](review.trade-imports-animals-tests.md) |
| trade-imports-ins-frontend | #26 | 6a8a0eb | 16 | ADDRESSED | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-workspace | #42 | 293db28 | 2 | ADDRESSED | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Trader can add an address without leaving the notification (delegated to INS form) | Yes | Add-link present on all six entry points; happy-path spec proves round-trip |
| 2 | INS supplies field labels, validation and country list; one address form exists | Yes | No duplication — animals never renders the form |
| 3 | Journey and party carried across; return selects the new record | Yes | `journey-type=gbn-ag`, `notification-id`, `fulfilment-id` on outbound; `?addressId=` on return; `answerFor` used to commit |
| 4 | Return carries the identifier only, not the address fields | Yes | INS returns `?addressId=`; animals reads the record from the address book |
| 5 | Cancel returns without changes | Yes | `Cancel and return to address page` button when handshake present; verified end-to-end |
| 6 | INS never redirects to a caller-supplied URL | Yes | Registry-driven; opaque ids only |
| 7 | Unrecognised journey type refused | Yes | `Boom.notFound()` in `handshake-context.js`, wire-tested by the guard spec |
| 8 | Service locations set per environment and validated at boot | Yes | Three `TRADE_IMPORTS_*_URL` convict entries (INS→animals, animals→INS, animals→address-book); config.validate covers all |
| 9 | Local stack works without hand-configuration | Yes | Both env vars added to `frontend.compose.yml` with browser-visible localhost values |
| 10 | Trader stays signed in across services | N/A | Explicitly out of scope; handled by proper auth ticket |
| 11 | Address-book or INS unavailable → error + journey answers preserved | Yes | Plain redirect on recoverable-save failure (no `.code(500)` on redirect); `handshakeError=unavailable` banner on picker |
| 12 | Wrong-org return shows an error, never silently empty | Yes | Address-book client filters by org header; unresolved id → `handshakeError=not-found` |
| 13 | Unresolvable-id return shows a distinct error | Yes | `not-found` vs `unavailable` codes distinguish 404 from transport failure |
| 14 | Back-link / browser-back returns to the originating page | Yes | Return route redirects to the picker with `?selected=<id>` |
| 15 | Handshake reusable — no journey-specific logic in INS | Yes | Registry pattern; onboarding a second journey is a single entry |
| 16 | Six entry points offer the "Add" link | Yes | Five parties (party-picker) + contact-address; both templates gain the same link |

## Test Coverage Assessment

- **Unit Tests:** Present — every new module in both frontends has a companion test file. Notable gaps flagged: no wrong-organisation coverage on `address-return/controller.test.js`; weak assertions on the `ins-handshake.test.js` per-party mapping; three test-behaviour gaps on INS `handshake-context.test.js` (payload precedence, sync-clear observable effect, error propagation).
- **Integration Tests:** Present — the animals-tests repo covers the happy-path handshake, cancel-and-return, unrecognised-journey-type guard, and add-link presence in both stub and compose environments. Two portability findings on the specs (hardcoded `localhost:3002`).

## Configuration & Environment

- **New Environment Variables:**
  - `TRADE_IMPORTS_ADDRESS_BOOK_URL` (animals-frontend — hoisted from raw `process.env` read to convict)
  - `TRADE_IMPORTS_INS_FRONTEND_URL` (animals-frontend, new)
  - `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` (ins-frontend, new)
  - `AUTH_SESSION_COOKIE_NAME` (ins-frontend, new — dev default `ins-sid`)
  - `SESSION_CACHE_NAME` (ins-frontend override in compose — dev default `ins-session`)
- **Database Changes:** None.

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Addressed (recoverable-save redirect; workspace ref probe) |
| Code Quality | Low (mostly minor duplication / clarity nits) |
| Security | Addressed (handshake token round-trip via INS; verified before `state.commit`) |
| Test Coverage | Addressed (org-mismatch, concrete fulfilment-id assertions, portable INS URL) |

## Conclusion

All review items are implemented on `feature/EUDPA-333-address-add-handshake` and marked **Done** on the `chore/EUDPA-333` handoff branch. Criticals (recoverable-save redirect, workspace E2E ref probe, handshake CSRF token) and Majors (`buildReturnUrl` URL API, test portability, fulfilment-id module rename) are landed. See per-repo `items.*.json` for commit SHAs in the Notes column.
