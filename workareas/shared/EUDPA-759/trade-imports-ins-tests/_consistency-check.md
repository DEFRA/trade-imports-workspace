# Consistency check — trade-imports-ins-tests (EUDPA-759)

## Ticket alignment

- E2E/FIT evidence matches ticket AC and updated openspec scenarios.
- `origin.spec.ts` asserts exactly one form button ("Save and continue") and zero form links.
- Removed origin scenarios from `soft-save.spec.ts` and `task-page-exits.spec.ts` where controls no longer exist; hub exit/discipline coverage moved to **Arrival details** in `task-page-exits.spec.ts` (still exercises cancel/save return on a hub-linked page).

## Page objects

- `formButtons` / `formLinks` lifted to `NotificationPage` base; duplicate removed from `transited-countries-page.ts`.

## Amend flows

- `amend-endings.spec.ts` extended for origin two-button amend ending and non-amend CPH/origin primary-only endings — matches REQ-FLOW-013 updates in workspace PR.

**Consistency verdict:** Aligned.
