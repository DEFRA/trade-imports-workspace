# Review index — EUDPA-759

**Ticket:** Origin of the import: remove the return to overview actions  
**Verdict:** **PASS WITH NOTES**  
**Reviewed:** 2026-11-03 (FRESH)

## Acceptance criteria

| AC | Status | Evidence |
|----|--------|----------|
| Save and continue shown | Met | `origin/template.njk`, `origin.spec.ts`, FIT `ends with Save and continue alone` |
| No Save and return to overview | Met | Same + removal of hub exit controls via `showReturnControls: false` |
| No Cancel and return to overview | Met | `formLinks` count 0 in E2E |

Openspec/workspace PR [#201](https://github.com/DEFRA/trade-imports-workspace/pull/201) updates behaviour spec and coverage in line with the code.

## PR set

| Repo | PR | CI (at review) | Repo verdict |
|------|-----|----------------|--------------|
| trade-imports-animals-frontend | [#454](https://github.com/DEFRA/trade-imports-animals-frontend/pull/454) | Green (incl. Security audit) | PASS WITH NOTES |
| trade-imports-ins-tests | [#78](https://github.com/DEFRA/trade-imports-ins-tests/pull/78) | Green | PASS |
| trade-imports-workspace | [#201](https://github.com/DEFRA/trade-imports-workspace/pull/201) | Not re-checked (GitHub 504) | PASS |

## Risk summary

| Area | Level | Notes |
|------|-------|-------|
| Functional / UX | Low | One-line template flag; established macro pattern |
| Test migration | Low | Hub-exit E2E moved to Arrival details; origin validation kept in unit/FIT |
| Scope | Low | joi / hapi-pulse security bumps in frontend PR — document or split (#1) |

## Findings

1 item (Minor) on `package.json` — dependency bumps unrelated to ticket title; acceptable if called out in PR text.

## Follow-ups (not blocking)

- Ticket text references **EUDPA-755** AC4/AC6/AC7 needing update once agreed — confirm BA/PO tracks separately.
- **main** security audit still fails until joi/content fixes land; this PR branch passes audit on CI.

## Repo reports

- [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md)
- [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md)
- [review.trade-imports-workspace.md](review.trade-imports-workspace.md)

## Next steps

- `walk review EUDPA-759` to triage item #1 (likely **Discuss** or **Auto-Resolved** if PR description updated).
- PR author: **amieljemei** — post review summary via `share-review.sh` if the author wants it on the PRs.
