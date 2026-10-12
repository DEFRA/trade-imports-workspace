# Type question and templates merge: INS frontend and tests repo

Merging `origin/feat/NO_JIRA-design-release-2-1-type-question-and-templates` into `feat/NO_JIRA-design-release-2-1-combined`. Both merges are resolved and staged, not committed.

## Summary

| Repo | Conflicts | State | Checks |
|---|---|---|---|
| trade-imports-ins-frontend | 4 text files | Resolved, staged | Unit 757/757, lint clean, fit 72/72 |
| trade-imports-ins-tests | 4 page objects, 2 PNG baselines | Resolved, staged, plus merge-caused fixes in 7 more files | Lint clean, typecheck clean |

**Open item:** the origin page visual baselines (darwin and linux) keep the combined side's images. Re-baseline them after an E2E run against the merged stack.

## trade-imports-ins-frontend

| File | Combined side (HEAD) | Templates side (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `src/server/app/shared/copy.en.js` | Added `layout.govukSuffix` with no comment | Added the same key, same value, with a comment | Kept the key once, with no comment | Both sides add the same value. No explanatory comments. |
| `src/server/app/shared/copy.cy.js` | Same as English | Same as English | Same as English | Welsh mirrors English keys |
| `src/server/app/copy-parity.test.js` | Allowlist comment says the suffix closes every page title | Comment says it closes the notification type title | Kept HEAD's comment | Combined applies the title pattern to every page, so its wording is the accurate one |
| `src/server/app/shared/copy.test.js` | Test: the GOV.UK suffix appears in both locales | Test: the Welsh Templates label is 'Templedi' | Kept both tests | Each side's behaviour survives |
| `src/server/app/features/notification-type/template.njk` (auto-merged, merge-caused) | Layout `pageTitle` block gives every page the GOV.UK title pattern | The page had its own `pageTitle` override, identical to the layout block | Removed the override | Exact duplicate of the layout's block. Same output, and fit still passes. |

Results: `npm test` 75 files and 757 tests pass. `npm run lint` (js, scss, arch) is clean. `npm run test:fit` (stub mode) 72 tests pass. Logs are in the session scratchpad: `insfe-test.log`, `insfe-lint.log`, `insfe-fit.log`.

## trade-imports-ins-tests

The combined side's journey foundation theme moved `journeyStrip` and `statusTag` (plus `cancelAmend` and the save and cancel getters) onto `NotificationPage`. Each subclass's own `journeyStrip` was removed. The templates side added `journeyStrip` and `statusTag` again to each page object it touched.

| File | Combined side (HEAD) | Templates side (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `page-objects/animals/overview-page.ts` | `region()`, `taskStatuses`, `taskStatus()` (`.govuk-task-list__item`); removed `journeyStrip` | `statusTag`, `taskListHeading`, `sectionHeadings`, `taskLists`, `actionButtons`, the template buttons, `errorSummary`, `commodityTotalValues`, `taskStatus()` (listitem), `linksTo()` | Kept every getter. Kept HEAD's `taskStatus`. Dropped templates' `statusTag`. | The two `taskStatus` versions find the same element, and HEAD's is used across the combined specs. `statusTag` is now inherited unchanged from `NotificationPage`. |
| `page-objects/animals/commodity-selection-page.ts` | `errorSummary` plus content getters | `journeyStrip`, `statusTag`, `btnSaveAndReturn`, `linkCancel` | Kept `errorSummary`, `btnSaveAndReturn`, `linkCancel`. Dropped the duplicate `journeyStrip` and `statusTag`. | The base class has identical locators |
| `page-objects/animals/contact-address-page.ts` | `errorSummary` | `journeyStrip`, `statusTag`, `btnSaveAndReturn`, `linkCancel`, `btnSaveAndReturnBare`, `linkCancelBare` | Kept all but the duplicate `journeyStrip` and `statusTag` | Same as above |
| `page-objects/animals/origin-of-import-page.ts` | Removed `journeyStrip`; added `countryHint`, `countryOptions`, `regionRequirementGroup`, `regionCodePrefix`, `removeRegionCodeMaxLength`, `errorLinkNamed`, `regionCodeMaxLengthErrorLink` | `templateIdFromUrl`, `journeyStrip`, `statusTag`, `draftTag`, `notificationReference`, `caption`, the save, return and cancel getters, `submitButtons`, `alert`, `errorSummaryLinks` | Kept both sides' getters. Dropped the templates `journeyStrip` and `statusTag`. | `draftTag` and the others still resolve through the inherited `journeyStrip` |
| `origin-of-import-animals-{darwin,linux}.png` | Origin page theme baselines | Templates baselines | `git checkout --ours` (HEAD) | As instructed. **Re-baseline the merged origin page after an E2E run.** |
| `page-objects/animals/notification-view-page.ts` (auto-merged; typecheck failed TS2300) | `override get statusTag` = `main .govuk-tag`; 14 combined specs rely on it (view, amend, submitted states) | `get statusTag` = strip tag, used by one template review assertion | Kept HEAD's override. Renamed the templates getter to `journeyStripTag`. | Duplicate identifier. The same locator survives under a new name. |
| `tests/animals/e2e/features/templates/template-review.spec.ts` (merge-caused) | Review cards renamed: 'Origin of import', 'Main import reason' (card and row), 'Additional details', 'Addresses', 'Contact address'. The animals table heading is now 'Identification details'. The arrival row is now 'Arrival date at destination'. The documents section now shows 'Document N' cards. Hidden Change text follows the card names. | Asserted the old names | Followed the combined names. The strip tag assertion now uses `journeyStripTag`. The "no documents" check became `summaryCard('Document 1')` count 0. The "no animal table" check became heading 'Identification details' count 0. The "no arrival date" check became 'Arrival date at destination' count 0. | Combined renames win. Kept each absence check non-vacuous: `summaryCard` now matches the exact title, so the old names would always pass. |
| `.../templates/template-task-list.spec.ts` | Task renamed to 'Main import reason' (combined asserts 'Main reason for import' is gone) | Used 'Main reason for import' | 'Main import reason' | Renamed tasks follow the combined side |
| `.../templates/template-parties.spec.ts` | Cards 'Addresses' and 'Contact address'; the task names are unchanged | One constant served as both task name and card name | Split into `ROLES_AND_ADDRESSES` and `CONTACT_TASK` (task names) and `ADDRESSES_CARD` and `CONTACT_CARD` (card names) | Task rows kept their names and the cards were renamed |
| `.../templates/change-template.spec.ts`, `view-template.spec.ts` | The template page reuses check-answers `buildSections`, so it takes the combined card names and Change link names | 'Import details', 'import details', 'commodity 1', 'roles and addresses', 'contact address for this consignment' | 'Origin of import' / 'origin of import', 'Cow (0102)', 'addresses', 'contact address' | Combined copy (`check-answers/copy/copy.en.js`, `hidden.cards`). The commodity card's Change link reads 'Change Cow (0102)' (see `hub-groups-and-cya-rows.spec.ts`). |
| `page-objects/animals/template-page.ts` | n/a | Doc example 'Change import details (Import details)' | Now 'Change origin of import' | Matches the renamed link |

Results: `npm run lint` is clean, `npm run typecheck` is clean, and prettier passes on the touched directories. Logs are `tests-lint.log` and `tests-typecheck.log` in the session scratchpad. No E2E was run (no stack work).

## Questions and risks for the E2E run

1. **Origin page visual baselines.** These are HEAD's images. The merged origin page (template mode added) needs `test:visual:update:*` after a green run.
2. **Template review and template page content.** These depend on how the animals-frontend merge is resolved. That merge was still in progress at the time: `check-answers/controller.js`, `template.njk` and `sections/documents.js` were in conflict. The renamed card names assume the template review and template page show the combined review's cards. Section headings stay the templates' own 5-section set (`copy.template.sections`).
3. **'Identification details' absence on a cattle template review.** Combined renders this as an h5 inside the commodity card whenever the species carries identifiers. If the merged template review shows it for cattle, decide whether a template should show it. Do not delete the assertion.
4. **`overview.sectionHeadings` (`h3.govuk-heading-m`)** is the templates-side locator. The combined overview now wraps each section in a named region. Check that the captions are still h3s with that class in the merged hub.
5. **`commoditySelection.btnSaveAndReturn`** and the origin page's `btnSaveAndReturn` match 'Save and return to overview' without `exact`. The base `saveAndReturnToOverview` uses `exact`. Both are kept, and they could be unified later.
