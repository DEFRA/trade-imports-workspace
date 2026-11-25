# EUDPA-776 — trade-imports-ins-frontend PR #88 verification

Head checked: `dd902ca2` (reviewed at `f2c6e6a9`). Main at check time: `8e1e624`.
No inline review threads and no author replies on the PR; every fix is in code.
Fix commits by the author: `df05719` (items 1, 4, 9, 10), `344c0a3` (items 2, 7: features.md refresh, made with the Branch address removal), `dd902ca` (tab test follow-ups).

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | Major | FIXED | `add.controller.js:64-65` `addModeFor` is `handshakeContext ? ADD_MODES.ROLE_HANDSHAKE : ADD_MODES.ADDRESS_BOOK`; `:101-104` `cancelUrlFor` is one ternary on `addMode === ADD_MODES.ADDRESS_BOOK`; `ADD_MODES` (`:59-62`) holds only the two modes. Commit `df05719`. |
| 2 | Major | FIXED | `src/server/app/docs/features.md:250-252` lists only `ADDRESS_BOOK` and `ROLE_HANDSHAKE`; `:286-287` names two Cancel destinations; `:288-290` names two labels (`cancelAndReturnToAddressBook`, `cancelAndReturnToHub`); no "contact"/`CONSIGNMENT_CONTACT` mode text remains (only "contact fields" for the form's Contact details section). Commit `344c0a3`. |
| 4 | Major | FIXED | `cancelAndReturnToAddressPage` is gone from `copy.en.js` and `copy.cy.js` (no match anywhere in `src`); `add.njk:14` and `:46` both test `addMode == addModes.ROLE_HANDSHAKE`. Commit `df05719`. |
| 7 | Major | FIXED | `features.md:67-92` now says `isReceivingParty` is false only for a handshake that does not resolve to a role, drops `isConsignmentContact` and `CONSIGNMENT_CONTACT_FULFILMENT_ID`, and the shared map is described without the contact. Matches `journey-registry.js` exports (no `isConsignmentContact`/`CONSIGNMENT_CONTACT*` anywhere in `src`). Commit `344c0a3`. |
| 9 | Major | FIXED | `testing.md:100-105` lists `JOURNEY_HANDSHAKES_BY_PARTY` and `GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY` only; both contact handshakes are gone from `journey-handshake.js`. `GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY` (`journey-handshake.js:36`) has readers again in `journey-registry.test.js`, `add.controller.test.js` and `fit/add.fit.spec.js`; every other export also has a reader. Commit `df05719`. |
| 10 | Critical | FIXED | Diff of the three files against main (`8e1e624`) removes only consignment contact tests plus Branch address cases. Germinal blocks restored: `add.controller.test.js:1314` ("germinal products journey handshake"), `fit/add.fit.spec.js:538` ("reached from a germinal products notification journey"), `journey-registry.test.js:190` ("germinal products journey", with the return-URL test). Fit refactor restored: `addressReturnAfterSaveAndSelect` called at `add.fit.spec.js:519` and `:568`. Commit `df05719`. Note: the Branch address removals (Branch type rows, `BRANCH_ADDRESS` roles swapped for real roles) come from the PR's own new commit `344c0a3` ("Remove branch addresses…, so the book matches EUDPA-776"), not from a reversion of main. That widens the PR's scope past the reviewed SHA, so a reviewer should look at it, but it does not reopen item 10. |

## Still open

- None of items 1, 2, 4, 7, 9 and 10.
- New since review, not checked by these items: commit `344c0a3` removes the Branch tab, the `BRANCH_ADDRESS` role, its copy, seed data and tests (21 files). That needs its own review pass, including whether openspec coverage links to any removed Branch test still exist (workspace PR).
