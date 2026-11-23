# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #274 | **Commit:** ef8ad11

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Contact page removed from the live animals spec | animals-frontend ✅, ins-tests ✅ | ✅ `journey-pages/contact-address` spec + coverage deleted, `CONTACT` dropped from `AREAS.md`, journey-flow / CYA / overview / captions rewritten | CONSISTENT |
| Consignment-contact add mode removed from the address book spec | ins-frontend ✅ | ✅ SCN-INS-ADDR-036-E, 046-E removed; 005-B, 018-A/C, 027, 036, 045, 046 reworded | CONSISTENT |
| **EUDPA-805 (Design Release 2.1, consignment parties) content reverted** | ins-frontend ❌ deletes germinal tests from `75aac72`; ins-tests ❌ deletes permanent-address tests and rewords `cph-scope` title from `a9978e79` (#114) | ❌ deletes REQ-ADDR-017/018, REQ-INS-ADDR-048, rewrites REQ-ADDR-006/009/011, re-adds REQ-ADDR-010, rewrites REQ-FLOW-003/018 — all added by `5f23d166` (EUDPA-805, #273) | INCONSISTENT with `main` in three repos |
| Coverage links resolve at the PR heads | ins-tests, ins-frontend, animals-frontend heads | ❌ several links point at deleted, renamed or never-existing tests (below) | INCONSISTENT |

### Lead verified: the PR reverts unrelated `main` content

`git log origin/main -S "REQ-ADDR-018"` and `-S "A page's own required answer MUST be given"` both return `5f23d166 EUDPA-805: Design Release 2.1 — consignment parties (#273)`. At this PR's head:

- `openspec/specs/live-animals/addresses/spec.md`: REQ-ADDR-018 (each role's list offers only that role's addresses) and REQ-ADDR-017 (the whole list on one page) are deleted; REQ-ADDR-010 ("Choosing a role's address is paged") is re-added; REQ-ADDR-006, 009-B, 011 and SCN-ADDR-007-C go back to the paged, whole-book wording. The animals-frontend picker at its PR head has no pagination (`grep -ril pagination features/addresses` finds nothing), so the spec now describes a picker that does not exist.
- The coverage written for that wording links tests that exist at neither head: `addresses-picker.spec.ts` "the picker searches and pages the address book, and the row selected on a later page is the one that saves" (SCN-ADDR-006-A/B/C/D, 010-A, 011-A), `hub-picker.fit.spec.js` "picker carries a later-page selection and keeps it selected off-page" (010-A, 011-A) and "clearing the search and searching with nothing entered lists the whole book again, paged as before" (006-B), `address-book-navigation.spec.ts` "a later picker page's View link…" (009-B).
- `openspec/specs/ins/address-book/spec.md`: REQ-INS-ADDR-048 (the add page serves every registered journey; four germinal products scenarios) is deleted, matching ins-frontend #88's deleted germinal tests. `journey-registry.js` still registers `gbn-ag-germinal-products`.
- `openspec/specs/live-animals/journey-flow/spec.md`: REQ-FLOW-003 drops "A page's own required answer MUST be given before Save and continue goes on from it" (generic, not contact-only); REQ-FLOW-018 drops the CPH number page exception and goes back to older wording. REQ-CPH-006 (`journey-pages/cph-number/spec.md:181`) still says Back from the CPH page always returns to consignment addresses, so REQ-FLOW-018 now contradicts it.
- `coverage/live-animals/journey-flow/coverage.json`: the links to ins-tests "while amending, the permanent address page ends with Save and continue alone" and its Cancel amend twin, present on `origin/main`, are gone — the same tests ins-tests #115 deletes.

**Must:** rebase onto `main` keeping EUDPA-805's spec and coverage, then reapply only the contact-address edits. Same for ins-frontend #88 and ins-tests #115.

## Missing Changes

- `docs/repos/trade-imports-ins-frontend.md:20` still says Cancel adds `landing=cancel` "except for the consignment contact, whose cancel adds no landing". Not in the diff.

## Unique Changes

- `docs/best-practices/playwright/BEST_PRACTICES.md`: adds a 40-line "Animals domain: answers as data, journeys as translators" section and three anti-pattern rows. Nothing in EUDPA-776 needs it, and it is not on `main`. It also:
  - names `domain/animals/fixtures/seed-form-steps.ts`; the file is `flows/animals/seed-form-steps.ts` (there is no `domain/animals/fixtures/`);
  - is inserted between the Faker bullets and the "```typescript // Bad: an address that no picker on the page can produce" example that belongs to them, so the example now sits under "Legacy document fields".
  Move it to its own PR, or drop it.

## Naming and Reuse

*None identified* within this repo (the seed-tail naming drift is recorded in the three seeder repos).

## Statements Made Untrue

Coverage links and notes that no longer hold at the other repos' PR heads:

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `openspec/coverage/live-animals/journey-pages/check-your-answers/coverage.json` SCN-CYA-007-A | Links ins-tests `notification-view-states.spec.ts` "an unanswered contact address keeps the trader on the review after Continue, naming it among what is outstanding" | ins-tests #115 deletes that test (`Review refused with no contact address`). | Link a live test, or drop the link and re-rate the scenario | Link a test that refuses Continue with another required answer missing |
| `openspec/coverage/ins/address-book/coverage.json:5734` SCN-INS-ADDR-045-A | Links ins-frontend `add.controller.test.js` "POST from the consignment contact handshake saves the address as a Branch address" | ins-frontend #88 deletes it. | Link gone | Remove that entry |
| `openspec/coverage/ins/address-book/coverage.json:298, 1444, 2669` | Notes: "place of origin, consignor and consignment contact handshakes…", "consignor and consignment contact handshakes…" | No consignment contact handshake. | Notes say what the tests cover | Drop "and consignment contact" |
| `openspec/coverage/live-animals/journey-flow/coverage.json` SCN-FLOW-003-D | ins-tests `cph-scope.spec.ts` "a saved CPH number shows as 123456789 on the addresses page…" | ins-tests head reads "shows as 12/345/6789…"; main reads "shows in its slashed county/parish/holding form…". Matches neither. | Title matches the test | Use the title the ins-tests PR settles on (main's "slashed … form" wording, with the new ending) in SCN-FLOW-003-D, SCN-CONSIGN-ADDR-005-C and SCN-CPH-007-A alike |
| `openspec/coverage/live-animals/journey-flow/coverage.json` SCN-FLOW-001-A | animals-frontend `hub/controller.test.js` "Should list the six group captions…" | Five groups. | Title true | Rename the test to "five" and the link with it |
| `openspec/coverage/live-animals/journey-pages/overview/coverage.json` SCN-OVERVIEW-011-A; `journey-section-captions/coverage.json` SCN-CAPTIONS-003-A | ins-tests "the hub groups its tasks under the six numbered group headings…" | Five headings. | Title true | Rename to "five" in ins-tests and here |
| `docs/repos/trade-imports-ins-frontend.md:20` | "Cancel adds `landing=cancel`, except for the consignment contact, whose cancel adds no landing" | No exception. | States the new behaviour | Drop the exception |

*Searched: `contact address`, `consignment contact`, `contactAddress`, `consignment/contact`, `exchangedDocument.issuer`, `branch address`, `six`, `germinal`, `REQ-ADDR-01[078]`, `REQ-INS-ADDR-048`, `REQ-CPH-006` in `openspec/specs/`, `openspec/coverage/`, `docs/repos/`, `docs/analysis/` (the lineage doc is point-in-time and its new EUDPA-776 section is correct); every coverage link in the nine changed coverage files was checked against the PR-head clones.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 14 inconsistencies found
**Summary:** The contact-address spec edits match the code, but the PR also reverts EUDPA-805's merged spec and coverage (REQ-ADDR-017/018, REQ-INS-ADDR-048, REQ-FLOW-003/018, permanent-address coverage), several coverage links point at tests the sibling PRs delete or never had, and an unrelated Playwright best-practices section with a wrong path rides along.
