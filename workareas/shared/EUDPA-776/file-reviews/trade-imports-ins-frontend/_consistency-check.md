# Consistency Check: trade-imports-ins-frontend

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #88 | **Commit:** f2c6e6a

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Consignment-contact add mode removed | animals-frontend ✅ (no contact page sends the handshake), ins-tests ✅ (`addresses-add-handshake.spec.ts` contact tests removed), workspace ✅ (SCN-INS-ADDR-036-E, 046-E removed; 045-A rewritten) | ✅ `CONSIGNMENT_CONTACT` mode, `isConsignmentContact`, `CONSIGNMENT_CONTACT_FULFILMENT_ID` gone | CONSISTENT |
| Germinal products handshake tests | workspace PR deletes REQ-INS-ADDR-048 (germinal) from `openspec/specs/ins/address-book/spec.md` — present on workspace `origin/main` | ❌ deletes every germinal products test in `add.controller.test.js` and `fit/add.fit.spec.js`, while `JOURNEY_TYPES.GBN_AG_GERMINAL_PRODUCTS` and its registry entry stay in `journey-registry.js:16,43-48` | INCONSISTENT — unrelated revert |
| "No branch address" (ticket AC) | workspace spec keeps the Branch type (REQ-INS-ADDR spec lines 761-1287); perf-tests `ADDRESS_TYPES.BRANCH`; ins-tests `branchAddress`; plants contact page still offers branch addresses | Branch type, tab, copy and `ROLES.BRANCH_ADDRESS` stay (`address-types.js:20,33`) | CONSISTENT across repos; AC wording overstates it |
| Coverage links to removed tests | workspace `coverage/ins/address-book/coverage.json:5734` links "POST from the consignment contact handshake saves the address as a Branch address" | test deleted here | INCONSISTENT (fix in workspace) |

Branch address: every repo keeps the Branch address type, and the plants journey's contact page still needs it, so this is the right call. The AC "The address book has no branch address" is met only as "no journey hands off to add a branch address". Say so in the PR description so the AC is not read literally.

## Missing Changes

- `src/server/app/docs/features.md` and `src/server/app/docs/testing.md` still document the consignment-contact mode and helpers (see Statements Made Untrue). Neither is in the diff.

## Unique Changes

- **Germinal products tests deleted (Must: restore).** The diff removes the whole `'#addressBookAddController — germinal products journey handshake'` describe (GET, Save and select, Save and return, Cancel, and the own-return-ignored cases) and `test.describe('add address reached from a germinal products notification journey')` in `fit/add.fit.spec.js`. Production still registers `gbn-ag-germinal-products` (`journey-registry.js:16,43`), so this leaves a registered journey with no test. On `origin/main` these files hold 17 and 11 matches for the germinal/helper terms; the tests came in with `75aac72 feat(design-release-2-1-consignment-parties): The address book takes adds from germinal products notifications…` (EUDPA-805). This is a rebase reverting main, not part of EUDPA-776. The workspace PR #274 deletes the matching REQ-INS-ADDR-048 in the same way.
- **Main's test refactors reverted (Must: restore).** `fit/add.fit.spec.js` swaps `copy.add.title` and `copy.add.cancelAndReturnToHub` for literals (`'Add address and contact details'`, `'Cancel and return to hub'`) and inlines a `page.route(...)`/`waitForRequest` block in place of `addressReturnAfterSaveAndSelect`. That helper is now defined in `fit/address-form.js:294` and used nowhere; `GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY` (`journey-handshake.js:36`) is exported and used nowhere.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/features/address-book/fit/add.fit.spec.js` (consignee "ticked" test) | Re-implements `addressReturnAfterSaveAndSelect` (`fit/address-form.js:294`) inline: route abort, fill, tick, wait for `/address-return`, click Save and select. | One implementation | Call `addressReturnAfterSaveAndSelect(page, { handshake, organisationId, beforeSave })` as on main |
| `src/server/app/features/address-book/fit/add.fit.spec.js` | Literal `'Add address and contact details'` and `'Cancel and return to hub'` beside `copy.add.title` / `copy.add.cancelAndReturnToHub` used elsewhere in the same file. | One source for each string | Use `copy.add.*` |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/docs/features.md:71` | `isReceivingParty` "false for the consignment contact" | No consignment contact handshake. | States the new behaviour | Drop the consignment-contact case |
| `src/server/app/docs/features.md:78-79` | "`isConsignmentContact` (whether a handshake is the consignment contact's, so the add page offers the contact's…" | `isConsignmentContact` removed. | Gone | Delete the entry |
| `src/server/app/docs/features.md:83` | "`CONSIGNMENT_CONTACT_FULFILMENT_ID` (the consignment contact's fulfilment id)" | Removed. | Gone | Delete |
| `src/server/app/docs/features.md:85` | Tests cover "each party's fulfilment id, the five roles and the consignment contact" | Five roles only. | States five | Drop "and the consignment contact" |
| `src/server/app/docs/features.md:91-93` | `roleOfParty`, `isConsignmentContact` and `buildReturnUrl` … "consignment contact" case | `isConsignmentContact` gone. | States what exists | Rewrite without it |
| `src/server/app/docs/features.md:256` | Add mode "`CONSIGNMENT_CONTACT` (the consignment contact's journey)" | Only `ROLE_HANDSHAKE` (and the address book's own modes). | Gone | Delete |
| `src/server/app/docs/features.md:290-303` | The contact's form has no roles question; its Back, Cancel and Save hand back with no landing / select landing | No contact form. | Gone | Delete those bullets |
| `src/server/app/docs/testing.md:101-103` | Helpers `CONSIGNMENT_CONTACT_HANDSHAKE` and `GERMINAL_PRODUCTS_CONSIGNMENT_CONTACT_HANDSHAKE` | Both removed from `journey-handshake.js`. | Gone | Delete both names |
| workspace `docs/repos/trade-imports-ins-frontend.md:20` | "Cancel adds `landing=cancel`, except for the consignment contact, whose cancel adds no landing" | No exception. | States the new behaviour | Drop the exception (fix in workspace PR) |

*Searched: `consignment contact`, `consignment-contact`, `isConsignmentContact`, `CONSIGNMENT_CONTACT`, `BRANCH_ADDRESS`, `branch address`, `contactAddress`, `germinal`, `addressReturnAfterSaveAndSelect` in `src/`, `src/server/app/docs/*.md`, `README.md`, and workspace `docs/repos/`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 15 inconsistencies found
**Summary:** The consignment-contact removal matches the other repos, but the PR also deletes every germinal products handshake test and undoes main's test-helper refactor (a rebase revert), and `docs/features.md` and `docs/testing.md` still document the removed mode in ten places.
