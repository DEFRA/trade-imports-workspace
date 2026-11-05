# Consistency Check: trade-imports-ins-frontend

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #71 | **Commit:** 77fa290

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Role names and the three address types (`ORIGIN_OR_CONSIGNOR`, `DESTINATION_CONSIGNEE_OR_IMPORTER`, `BRANCH`) | address-book `AddressRole` ✅, ins-tests `addressTypes`/`addressRoles` ✅, performance-tests `ADDRESS_TYPES` ✅ | ✅ `services/address-book/address-types.js` | CONSISTENT |
| List query `?addressType=<TYPE>` and `role` | ins-tests `list-page.ts:24` ✅, performance-tests `addressBookListPath` ✅ | ✅ `list.controller.js:140-142`, `list.njk:67` | CONSISTENT |
| API list params `role`/`searchRole` | address-book controller ✅ | ✅ `client.js` `listAddresses` | CONSISTENT |
| Stub refusals match the API's rules and messages | address-book `RolesHeldTogether`, `ReceivingRolesInTheUnitedKingdom`, `@NotEmpty` messages ✅ | ✅ `stub.js:128-143` | CONSISTENT |
| Role labels (column / filter / question) | ins-tests `address-book-types.ts` `roleTexts` ✅ (same three label sets, incl. 'Place of Origin' in the filter) | ✅ `copy.en.js` | CONSISTENT (the three capitalisations are the design source's, logged as snag S-11) |
| `@ministryofjustice/frontend` version | animals 11.1.0 ✅, plants 11.1.0 ✅ | 11.1.0 | CONSISTENT |
| Happy-eyeballs connect timeout (1000ms) set once per process | animals + plants: inline in `startServer` (`src/server/common/helpers/start-server.js:7-8`) | New `common/helpers/connect-attempt.js` called from `src/index.js:3` | INCONSISTENT (same rule, two shapes — see Naming and Reuse) |
| joi / @hapi/content security pins | animals + plants: same locked versions (joi 18.3.1, bell + catbox-redis joi 17.13.9, @hapi/content 6.0.3) reached with no `overrides` entry | `package.json:127-132` adds `overrides` for `@hapi/bell` joi, `@hapi/catbox-redis` joi and `@hapi/content` | SUSPICIOUS — twins hold the same versions without the pins; the workspace deferred row claims plants was patched the same way, but plants' `package.json` has no such overrides |
| Network-boundary OIDC discovery in tests (`answer-oidc-discovery.js`) instead of `vi.mock` of own `get-oidc-config` | animals + plants: not yet (deferred row "Twin fix … ins-frontend was fixed") | Converted in 9 test files in this PR; still `vi.mock` in `src/auth/refresh-tokens.test.js:13`, `src/auth/verify-token.test.js:17`, `src/plugins/auth.test.js:13` | INCONSISTENT within repo (see Naming and Reuse) |

## Missing Changes

*None identified* for the ticket's scope: every add/list/edit path sends or reads `roles`; the stub seeds (`stub.js:31`, `typed-seed.js`) carry roles; the lighthouse seed posts `roles` (`scripts/lighthouse/seed-address.js:73`).

## Unique Changes

- `connect-attempt.js` + `src/index.js` wiring: not in the ticket, but a stack fix recorded in the inc-067 plan; intentional, shape differs from the twins (below).
- `answer-oidc-discovery.js` and removal of `vi.mock('…/get-oidc-config.js')` across 9 tests: house-rule fix from the theme review; twins tracked as a deferred row.
- `package.json` security overrides: team decision of 2 Nov (deferred row), not ticket scope.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/index.js:3`, `src/server/common/helpers/connect-attempt.js:3-6` vs animals/plants `src/server/common/helpers/start-server.js:7-8` | One rule, two shapes across twin frontends: the twins set `setDefaultAutoSelectFamilyAttemptTimeout(1000)` inline in `startServer` and pin it in `start-server.test.js`; this repo adds a named helper called from `index.js` and its own test. The inc-067 plan (`workareas/.../plans/inc-067.md:46,93`) said "the same setting, the same way" in `startServer`. | One shape across the three frontends | Call it from this repo's `startServer` as the twins do (and drop `connect-attempt.js`), or move the twins to the helper in a NO_JIRA chore — not both shapes |
| `package.json:127-132` vs animals/plants `package.json` `overrides` | Same security pin done two ways: overrides here, plain lock resolution in the twins. | Should — one mechanism, or a recorded reason for this repo's pins | Drop the three overrides if `npm ci` resolves the same versions without them, else add the same overrides to the twins |
| `src/auth/refresh-tokens.test.js:13`, `src/auth/verify-token.test.js:17`, `src/plugins/auth.test.js:13` | The move from `vi.mock` of own `get-oidc-config*.js` to `answer-oidc-discovery.js` stops at 9 of 12 files; the workspace deferred row says "ins-frontend was fixed". | Should — the three remaining mocks go, or the deferred row says they remain | Answer the discovery URL with `answerOidcDiscovery` in those three tests |
| `src/server/app/docs/testing.md:213` | Prose calls them "the uses the caller passes" for `addValidAddressToFreshOrganisation`; the code, field and helper names are all `roles` (`tickRoles`, `roleCheckbox`). | Should | "with the roles the caller passes" |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/docs/features.md:345` | `map-to-address-fields.js` maps onto "the address book's fields in `address-book/address-schema.js`" | No `address-schema.js` exists; the fields are `features/address-book/fields.js` (the workspace repo page was corrected to say so in this PR) | Doc states the current file | Point it at `features/address-book/fields.js` |

*Searched: `address-schema`, `uses`, `usages`, `use=`, `tickUses`, `storedTypeAndUsesOf`, `USES_BY_ADDRESS_TYPE`, `addressTypeOfUse`, `category`, `Back link`, `/address-book/add`, `startServer`, `get-oidc-config` — in `README.md`, `src/server/app/docs/*.md`, JSDoc and line comments, and test titles. The add-flow docs (`docs/README.md:15-16`, `features.md:35-214`) already describe the type step and roles.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 5 inconsistencies found
**Summary:** The type/roles model lines up with the API, tests and perf suite, but the connect-timeout fix and the security pins take a different shape from the twin frontends, the OIDC-mock clean-up stops at three files, and two docs lines name a missing file or the old "uses" word.
