# EUDPA-776 — trade-imports-ins-frontend PR #88 verification (refresh 2026-11-25)

Head checked: `ace0aa7`. Commits in the window (`dd902ca..ace0aa7`), PR's own: `5da5c56` fix: stop the address book tests naming the removed branch role; `2e71b6a` fix: remove the expired picomatch advisory from the audit allowlist; `1e35a05` fix: call the Destination tab once in the default-tab-only test; `a1d3a99` fix: name the importer search organisation for the role search; `9561311` fix: drop the branch rows from the role label search test; `976ddcc` fix: match the role search on the Type column label alone; `186fca1` fix: make the role-scoped search tests fail when roles are ignored; `07085df` style: format the role search test; merges `a74065c`, `eeed05a`, `590d321`, `ace0aa7`. Brought in from main: `2fdc89b`, `9c1d16b` (govuk-frontend 6.6.0), `d3484d4`, `c28f5bc`, `8f2616a` (dependency bumps).
Author replies: none on GitHub; no commit message answers an item without changing it (every fix commit has a subject line only).

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | Major | FIXED | `add/add.controller.js:64-65` `addModeFor` is one ternary; `:101-102` `cancelUrlFor` is one ternary on `addMode === ADD_MODES.ADDRESS_BOOK`; `ADD_MODES` (`:59-62`) holds two modes. Unchanged since last check. |
| 2 | Major | FIXED | `docs/features.md:251` lists only `ADDRESS_BOOK` and `ROLE_HANDSHAKE`; `:286-290` gives two Cancel destinations and two labels (`cancelAndReturnToAddressBook`, `cancelAndReturnToHub`). No "consignment contact" or `CONSIGNMENT_CONTACT` anywhere in `src`. |
| 4 | Major | FIXED | `cancelAndReturnToAddressPage` has no match in `src`; `add.njk:14` and `:46` both test `addMode == addModes.ROLE_HANDSHAKE`. |
| 7 | Major | FIXED | `docs/features.md:63-89`: `isReceivingParty` is "false for a handshake that does not resolve to a role", no `isConsignmentContact` or `CONSIGNMENT_CONTACT_FULFILMENT_ID`, shared map described without the contact. |
| 9 | Major | FIXED | `docs/testing.md:102-104` lists only `JOURNEY_HANDSHAKES_BY_PARTY` and `GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY`; `GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY` (`common/test-helpers/journey-handshake.js:36`) is read by `journey-registry.test.js`, `fit/add.fit.spec.js` and `add/add.controller.test.js`. |
| 10 | Critical | FIXED | Diff of the three files against current `origin/main`: 6 insertions, 224 deletions, all consignment contact cases or Branch rows (with Branch roles swapped for real roles, e.g. `journey-registry.test.js` consignee row now posts `PLACE_OF_ORIGIN`). Germinal products tests and the fit refactor are main's content. |
| 11 | Major | FIXED | `address-book-tabs.test.js:30-35`: the wrong-case row now passes `'origin_or_consignor'` (a real type in the wrong case), and the `'BRANCH'` and `'BRANCH_ADDRESS'` rows are gone; no row duplicates another. Commit `5da5c56`. |
| 12 | Critical | FIXED | Workspace clone (`9950666`) `openspec/coverage/ins/address-book/coverage.json:5253` names "after a refused save of Destination, Consignee or Importer, choosing it again shows the address, the contact details and the ticked role entered", which exists verbatim at `fit/address-type.fit.spec.js:226` and refuses a save, reopens, and checks every field and the ticked role (no-JS). Note no longer says Branch. The templated title at `:5245` matches `:208` verbatim. |
| 13 | Major | FIXED | `fit/list.fit.spec.js:389-403`: one `openAddressBookList` call for `DESTINATION_CONSIGNEE_OR_IMPORTER`, then the `NO_RESULTS_LINE` assertion; no loop. Commit `1e35a05`. |
| 14 | Major | FIXED | `fit/list.fit.spec.js:790-806`: prefix is now `stub-org-list-importer-role-search` (`:794`); the test searches the Destination tab for a fresh Importer address and asserts its Type cell, which `:768` (Origin tab, typed seed) does not. Commit `a1d3a99`. |
| 15 | Major | PARTLY FIXED | `list/list.tabs.controller.test.js:51-55` no longer names `BRANCH`, but the row now passes `?addressType=UNSUPPORTED_ADDRESS_TYPE`, the same value as the "an unknown address type" row at `:42-46` (`UNSUPPORTED_ADDRESS_TYPE = 'UNSUPPORTED_ADDRESS_TYPE'`, `fit/address-book-list.js:15`). The table now has two identical rows for an address type no tab offers. Commit `5da5c56`. |
| 16 | Major | FIXED | `view-model/list.test.js:189-194`: the `'branch'` and `'branch address'` rows are gone; `['farm', []]` is the one no-match row. Commit `9561311`. |
| 17 | Major | FIXED | `view-model/list.js:53-61` `rolesWhoseLabelContains` filters on `columnLabel` only; title at `view-model/list.test.js:195` reads "...whose Type column label contains %j, ignoring case". No "option label" claim left in `src`. Commit `976ddcc`. |
| 18 | Major | FIXED | `services/address-book/address-book.roles.test.js:76-91`: origin roles plus `'importer'` gives `[]` (Stub Importer Farm is outside them) and plus `'pasture'` gives `[placeOfOrigin.name]`; `:135-160` adds destination roles plus `'consignor'`/`['CONSIGNOR']` gives `[]`. Each fails if the role filter is dropped. Commit `186fca1`. |
| 19 | Major | FIXED | `services/address-book/address-types.test.js:39-44`: the `BRANCH_ADDRESS` assertion is gone; the remaining assertions drop `IMPORTER`, a real role outside the type. Commit `5da5c56`. |

## Still open
- **#15:** `list/list.tabs.controller.test.js:51-55` duplicates the `:42-46` row exactly (both `UNSUPPORTED_ADDRESS_TYPE`); delete the "an address type no tab offers" row.

## New problems
- None.
