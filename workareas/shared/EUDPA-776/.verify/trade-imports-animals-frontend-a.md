# EUDPA-776 — trade-imports-animals-frontend PR #487, verification (set a)

Head checked: `ed23c57199fa4674b11ca06d70530ed04c38a043`. Most fixes landed in `ea20c08` ("address the animals-frontend review items"); `ed23c57` changed `LANDINGS.notificationView`. The PR has no inline threads and no replies from the author, so no item was answered in a reply.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | Major | FIXED | `fit/journey-smoke.fit.spec.js:149-150` now calls `answerConsignmentAddresses(page)` then `expectDraftReview(page)`. The duplicate `toHaveURL` plus `checkAnswersCopy.title` heading check is gone (ea20c08). The helper (`fit/live-animals-journey.js:1288`) checks the URL only, because `LANDINGS.notificationView` no longer has a title (ed23c57). The test checks the review content once, in `expectDraftReview`. |
| 2 | Major | FIXED | `scripts/lighthouse/seed-address-book.js:7-9` is now `PARTIES.map(({ addressBookRole }) => addressBookRole)` with no `.filter(Boolean)` (ea20c08). All five `PARTIES` entries set `addressBookRole`. |
| 3 | Major | FIXED | `HTTP_CREATED = 201` now sits inside `createAddressHoldingRole` (`seed-address-book.js:38`). `HTTP_OK` stays at module scope (ea20c08). |
| 4 | Major | FIXED | The test constant is renamed to `SELECTABLE_ADDRESS_ROLES` (`seed-address-book.test.js:7`, used at 50, 60, 81). No `JOURNEY_SELECTABLE_ROLES` is left anywhere in the clone (ea20c08). |
| 6 | Minor | FIXED | `src/server/app/co-residency.test.js` has no comment lines left: the file header, the `foreignRealm` and `cookieJar` JSDoc and the inline comments are all deleted. The rationale moved to `src/server/app/docs/testing.md:47-53` (ea20c08). |
| 7 | Major | FIXED | `src/server/app/contract.test.js` has no comments left. The ARRIVAL_DATE, REASON_REVEALS, "all five spokes" and transporter-union comments are all deleted (ea20c08). |
| 8 | Major | FIXED | `const drive = driveHandler` and `const committableKeys = obligationNames` are deleted. `driveHandler` is called directly and `committedIds` filters `obligationNames` (`contract.test.js:75-78`) (ea20c08). |
| 9 | Major | FIXED | `contract.test.js:461` is retitled "Should commit nothing from the transporter chooser and one transporter party from each details spoke", which the assertions at 465, 474 and 489 prove (ea20c08). |
| 10 | Major | FIXED | The block comment above the describe in `evaluator.test.js` (old 1328-1344), with its counts and its notes on the classifier and constructor, is deleted. The describe now starts at line 1328 (ea20c08). |
| 11 | Major | PARTLY FIXED | `allSeventeenObligations` is renamed `alwaysInScopeObligations` (`evaluator.test.js:1348`), and the two `it` titles drop "17" (1365, 1372). The describe is still titled `'trivial applyTo drop fidelity'` (`evaluator.test.js:1328`). The count is gone, but the title still names the past refactor (dropping applyTo closures) rather than what the tests prove, and the Must says it may not. |
| 12 | Major | FIXED | No `not.toHaveProperty('consignment')` is left in `mapper-a-contract.test.js`. The line at 133 went with the deleted test and the line at 147 was removed. A grep of `services/persistence/records/` finds no `consignment` absence check (ea20c08). |
| 13 | Major | FIXED | `mapper-a-contract.test.js:129-133` now feeds `placeOfOrigin: { ...placeOfOrigin, pickedFromId: 'origin-farm', unrelated: 'dropped' }`. The exact `toEqual(placeOfOrigin)` at 140 proves both keys are dropped (ea20c08). |
| 14 | Major | FIXED | The weaker test "emits each party answer as its details" is deleted (ea20c08). The first test's exact payload covers every party. |
| 15 | Major | FIXED | `expect(notification).not.toHaveProperty('consignment')` is removed from `notification-mapper.test.js` (old line 218). The exact `Object.keys(...)` list at line 272-289 still proves `consignment` is absent (ea20c08). |
| 16 | Major | FIXED | `PARTY_ID_BY_ROLE` is deleted from `frozen-parties.js`, and nothing in the clone references it (ea20c08). |
| 17 | Major | PARTLY FIXED | `parties.js:7` now takes `const returnSlug = addressesPage.slug`, and `party-edit.controller.js:29` reads `addressesPage.slug` instead of the `'addresses'` literal. `address-return/controller.js:143` and `party-edit.controller.js:34` read `party.returnSlug`, which comes from it (ea20c08). Two gaps remain. `returnSlug` is still a per-party field repeated on all five entries (`parties.js:15,23,31,39,47`). And the return after picking still hard-codes the literal: `party-picker.controller.js:119` (`savedTarget` → `pagePath(..., 'addresses')`) and `:68` (back link). The Must requires the return after picking **or** editing to be named in one place. |
| 20 | Major | FIXED | `party-edit.controller.test.js:206` is retitled "Should carry the trail on the way back to the addresses page", which matches the redirect asserted at 215 (ea20c08). |

## Still open

- **#11 (Major, partly fixed):** the describe at `src/server/app/model/obligations/evaluator.test.js:1328` is still titled `'trivial applyTo drop fidelity'`, which names refactor history. Retitle it, for example `'always-in-scope obligations'`.
- **#17 (Major, partly fixed):** the return after picking is still hard-coded as `'addresses'` in `party-picker.controller.js:68,119` rather than read from `addressesPage.slug` or `party.returnSlug`. `returnSlug` also stays a per-party field with the same value on all five `PARTIES` entries.

No author replies to check: the PR has no inline review threads, and the only top-level comments are CI, SonarCloud and the posted re-review.
