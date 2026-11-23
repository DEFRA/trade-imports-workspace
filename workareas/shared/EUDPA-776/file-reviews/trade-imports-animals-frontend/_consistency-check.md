# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #487 | **Commit:** 08f4558

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Contact page, `contactAddress` obligation and `consignment` party removed | backend ✅, ins-tests ✅, perf-tests ✅ (`contact` step and endpoints), workspace openspec ✅ | ✅ `features/contact/` deleted, `misc.js` obligation and `direct-fields.js` mapping removed | CONSISTENT |
| Seed "opening run tail" after transporters (documents then addresses) | ins-tests `openingRunTailSteps()` (`flows/animals/seed-form-steps.ts`), perf-tests `openingRunFromTransporter` / `'opening-run-from-transporter'` (`src/k6/live-animals.js`) | `OPENING_RUN_TAIL` (`scripts/lighthouse/seed-notification.js:161`) | NAMING DRIFT (see below) |
| Hub has five groups, not six | ins-tests ✅ assertions (5 headings) but ❌ title still "six"; workspace coverage still links the "six" titles | ❌ `hub/controller.test.js:107` title "six group captions" over a five-group assertion | INCONSISTENT |
| `BRANCH_ADDRESS` no longer needed by the animals journey | ins-frontend ✅ (consignment-contact handshake gone), `scripts/lighthouse/seed-address-book.js` ✅ here | ❌ `services/address-book/stub/index.js:21-22` still seeds two `BRANCH_ADDRESS` rows | INCONSISTENT (low) |
| Set docs updated for the removed page | gateway ❌, ins-frontend ❌ (same gap there) | ❌ `sets/live-animals/docs/*.md` unchanged | INCONSISTENT |

## Missing Changes

- `src/server/app/sets/live-animals/docs/page-design.md`, `journey-flow-and-gates.md` and `add-a-section.md` were not touched, yet each describes the contact address page (see Statements Made Untrue). The workspace openspec (`journey-flow` REQ-FLOW-003, REQ-FLOW-014, REQ-FLOW-018) was rewritten for the same rules, so the set's own docs are the one place still stating the old journey.
- `src/server/app/services/address-book/stub/index.js:21-22`: the stub book still holds `animal-and-plant-health-agency` and `riverside-distribution-centre` as `BRANCH_ADDRESS`. Nothing in this repo reads that role any more (`grep BRANCH` finds only these two rows), and `seed-address-book.js` dropped `BRANCH_ADDRESS` in this PR. Either give those rows a consignment role or no role, or say why the stub keeps a role the journey no longer offers.

## Unique Changes

- The `consignment-parties` section is now the last before `review` (`flow/flow.js`), so Roles and addresses ends the opening run. Matches the openspec REQ-FLOW-003-B/D rewrite and the ins-tests `save-and-continue.spec.ts` new test. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `scripts/lighthouse/seed-notification.js:161` vs ins-tests `flows/animals/seed-form-steps.ts:164` vs perf-tests `src/k6/live-animals.js:169-196` | One concept, three names: `OPENING_RUN_TAIL` (array) here, `openingRunTailSteps()` (function) in ins-tests, `openingRunFromTransporter` / step name `'opening-run-from-transporter'` with `OPENING_RUN_DOCUMENTS_SLUG` in perf-tests. All three are "after transport, post accompanying documents then addresses to reach check your answers". `{ slug: 'accompanying-documents', fields: {} }, { slug: 'addresses', fields: {} }` here is the same pair as ins-tests' `{ slug: 'accompanying-documents', form: {} }, { slug: 'addresses', form: {} }`. | One name across the three seeders | Use "opening run tail" in all three (perf: `openingRunTail`, step name `'opening-run-tail'`) |
| `features/check-answers/view-model/invalid-parties.js:10` | `const ALL_PARTIES = PARTIES` — an alias kept only because `CONTACT_PARTY` used to be appended. Two names for one list. | Alias gone | Use `PARTIES` directly |
| `features/addresses/party-edit/party-edit.controller.js:27` | `const EDITABLE_PARTIES = PARTIES` — same leftover alias. | Alias gone | Use `PARTIES` directly |
| `features/addresses/party-edit/party-edit.controller.test.js:26` | `const ALL_PARTIES = PARTIES` — same leftover alias in the test. | Alias gone | Use `PARTIES` directly |
| `scripts/lighthouse/seed-address-book.js:8` | `SELECTABLE_ADDRESS_ROLES = PARTIES.map(...)` is now a derived list rather than an alias, so it earns its name. | — | No change |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.test.js:107` | "Should list the six group captions, …" | The assertion lists five groups; contact address is gone. | Title states five | "Should list the five group captions, …" (and update the workspace `journey-flow` SCN-FLOW-001-A link) |
| `sets/live-animals/docs/journey-flow-and-gates.md:24` | "…Roles and addresses goes on to the contact address." | Roles and addresses goes on to check your answers. | States the new flow | "…and Roles and addresses goes on to check your answers." |
| `sets/live-animals/docs/journey-flow-and-gates.md:177-180` | Roles and addresses "and Contact address for consignment … are the only pages whose Back goes to the Overview … after that return" | Only Consignment addresses does. | States the new behaviour | Drop the Contact address clause |
| `sets/live-animals/docs/journey-flow-and-gates.md:285` | "The overview, check your answers, contact address, declaration and confirmation pages open straight into their heading." | No contact address page. | Drop it | Remove "contact address," |
| `sets/live-animals/docs/page-design.md:55-56` | Every return control reads "…overview" "except the contact address page, which reads 'Save and return to hub'…" | No exception remains (matches the rewritten REQ-FLOW-014). | Exception gone | Delete the "except…" clause |
| `sets/live-animals/docs/page-design.md:61-62` | "'Hub' … reaches the screen only on the contact address page." | "Hub" no longer reaches the screen in this set. | States the new behaviour | "'Hub' is the internal name for it and never reaches the screen." |
| `sets/live-animals/docs/page-design.md:95-96` | "The contact address row is keyed 'Contact address', not 'Address'" | No contact address row. | Gone | Delete the bullet |
| `sets/live-animals/docs/page-design.md:374-376` | "The backend names … the contact address `consignment`; the journey says … `contactAddress`." | Neither name exists. | States the new mapping | "The backend names the place of destination `destination`; the journey says `placeOfDestination`." |
| `sets/live-animals/docs/page-design.md:401` | "Save and continue here goes on to the contact address." | Goes on to check your answers. | States the new flow | "…goes on to check your answers." |
| `sets/live-animals/docs/add-a-section.md:288-290` | Example suffix `contact-address-section` | That section id no longer exists. | Example still exists | Use a live example, or keep only `documents-section` |

*Searched: `contact address`, `contactAddress`, `consignment/contact`, `CONTACT_PARTY`, `consignmentContact`, `contact-address`, `BRANCH_ADDRESS`, `six group`, `eight sections`, `\bcontact\b` in `src/`, `scripts/`, `fit/`, `**/docs/*.md`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 16 inconsistencies found
**Summary:** The code removal lines up with backend, ins-tests and perf-tests, but the live-animals set docs still describe the contact page in nine places, a hub test title still says six groups, three `PARTIES` aliases and two stub `BRANCH_ADDRESS` rows are leftovers, and the seed tail has three different names across this repo, ins-tests and perf-tests.
