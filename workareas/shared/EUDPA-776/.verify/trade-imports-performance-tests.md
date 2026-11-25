# EUDPA-776 — trade-imports-performance-tests PR #47 verification (refresh 2026-11-25)

Head checked: `fadea7a`. Commits in the window (`60c0dcd..fadea7a`): `fadea7a` Merge remote-tracking branch 'origin/main' into feat/EUDPA-776-remove-contact-address, bringing in main's `5cba591` feat(EUDPA-674): read animals-frontend's metrics under the dot-case names (#49), `9385f21` chore(deps-dev): bump vitest from 5.1.0 to 5.1.1 (#52), `a0a6a91` chore(EUDPA-802): drop the withdrawn picomatch advisory from the audit allowlist (#53). None of them is PR work.
Author replies: none on GitHub; no commit-message answers in the window.

The PR diff against the newly fetched main (`git diff FETCH_HEAD...HEAD`) is the same as `.diffs/trade-imports-performance-tests.diff`: the same 9 files, 15 additions and 49 deletions. The merge brought no change into the PR.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 4 | Major | FIXED | `openingRunFromTransporter` and `OPENING_RUN_DOCUMENTS_SLUG` are gone. In `src/k6/live-animals.js:169-221`, `LIVE_ANIMALS_STEPS.draft` ends `portOfEntry, transitCountries, transporters`, and the PR's only change there is the removed `contact` step. A grep for `openingRun`, `OPENING_RUN` and `opening-run` across `src/` finds nothing. The only `contact` matches left belong to plants: `high-risk-plants.js:166,168`, `journey-endpoints.js:59`, `endpoints.js:98-100` and `smoke.test.js:107`. Items #1, #2 and #3 were merged into #4 and close with it. |

## Branch consistency with address-book #29 (b0a8ef9)

- Consistent. Address-book #29 removes `BRANCH_ADDRESS` from `AddressRole` and `BRANCH` from `RoleGroup`, which leaves two groups: sending (`PLACE_OF_ORIGIN`, `CONSIGNOR`) and receiving (`CONSIGNEE`, `IMPORTER`, `PLACE_OF_DESTINATION`).
- Perf-tests `src/lib/address-book.js:3-22` now has only `ORIGIN_OR_CONSIGNOR` → `[PLACE_OF_ORIGIN, CONSIGNOR]` and `DESTINATION_CONSIGNEE_OR_IMPORTER` → `[CONSIGNEE, IMPORTER, PLACE_OF_DESTINATION]`. Those match #29's groups exactly.
- The tests no longer expect a Branch type: `front-door.test.js` (`makeEveryDeclaredRoleFindable`) and `address-book.test.js` (the Branch `addAddressAnswers` case is deleted, and the `addressBookListPath` cases now use `ORIGIN_OR_CONSIGNOR`).
- There is no `BRANCH_ADDRESS` or `BRANCH` left in the test data. A case-sensitive grep for `BRANCH` finds nothing under `src/`. A case-insensitive grep for `branch` across the repo (excluding `.git`, `node_modules` and `.github`) matches only `README.md`, covered under New problems.

## Still open
- None.

## New problems
- `README.md:89` [Minor] The pre-flight description still says the run searches "the Origin and Consignor; the Destination, Consignee and Importer; and the Branch tabs narrowed to each of its roles". The PR removed the Branch type, so that is now untrue: `makeEveryDeclaredRoleFindable` only works through `DECLARED_ROLES_BY_ADDRESS_TYPE`, which has two types. The same text is on main, and the PR does not touch README.md. Must: the README names only the two address book tabs the run searches, Origin and Consignor and Destination, Consignee and Importer, with no Branch tab.
