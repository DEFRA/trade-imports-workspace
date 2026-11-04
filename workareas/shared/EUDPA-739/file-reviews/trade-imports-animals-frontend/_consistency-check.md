# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-739
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #462 | **Commit:** 84f0910

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Remove `transporters/select` page (controller, template, copy, route, caption, page id) | ins-tests deletes page object / flow / e2e ✅; workspace retargets coverage notes ✅ | ✅ Deleted | CONSISTENT |
| Cascade delete of select-page tests | ins-tests deletes `transporter-selection.spec.ts` ✅ | ✅ Deletes controller unit, fit, parity, caption, contract, copy tests | CONSISTENT |
| Openspec coverage notes no longer cite select-page tests | workspace updates fit/e2e notes ✅ | N/A (coverage owned by workspace) | CONSISTENT |
| Drop `commercialParties` / transporters `party()` helpers | Only this repo owned them | ✅ Removed with sole consumer | CONSISTENT |
| Lighthouse seed posts to `transporters` list instead of select | Frontend-only seed | ✅ Expected | CONSISTENT |

No shared config, dependency, feature-flag or twin-frontend patterns apply (plants has no matching page).

## Missing Changes

*None identified.* Cascades expected in ins-tests and workspace are present in those PRs.

## Unique Changes

- Deletes the orphaned page feature folder and its registrations — intentional; this is the owning service (ticket scope In).
- Removes `commercialParties` / `party` from `services/transporters` and rewrites lighthouse commercial seeding onto the list — intentional; helpers and select slug had no other consumers.
- Updates `page-design.md` bullet at the primary-alone list (line 55) but leaves a second mention stale (see Statements Made Untrue).

## Naming and Reuse

*None identified.* Select-page names (`transportersSelect`, `transporters-select`, `transporters/select`) are removed rather than renamed beside a twin.

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/docs/page-design.md:65-66` | "An add-another sub-page that returns to its own list page (the transporter add, select and details pages) keeps the primary alone" | There is no transporter select page; only add and details remain as those spokes | Doc states the new behaviour (drop "select") | Edit the parenthetical to "the transporter add and details pages", matching the updated bullet at line 55 |

*Searched:* `transporters/select`, `transporters-select`, `transportersSelect`, `transporterSelection`, `toTransporterSelection`, `transporter-selection`, `Search for an approved commercial transporter`, `Chwilio am gludwr masnachol cymeradwy`, `commercialParties`, `commercial transporter register`, `commercial register`, `add, select`, `select and details`. Also checked recipes/`docs/*.md`, AGENTS/CLAUDE/README, JSDoc/comments, test titles, workspace `docs/best-practices/` and `openspec/` (via the workspace PR clone). No other living hits in this repo.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found
**Summary:** Cross-repo removal cascades align, but `page-design.md` still names the removed transporter select page in one amend-buttons bullet.
