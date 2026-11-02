# Type question and templates merge: animals frontend

Merging `origin/feat/NO_JIRA-design-release-2-1-type-question-and-templates` into `feat/NO_JIRA-design-release-2-1-combined` in `trade-imports-animals-frontend`. All 34 conflicted files are resolved and staged, not committed. Further fixes caused by the merge are staged too, in 9 auto-merged files.

## Summary

| Check | Result |
|---|---|
| Conflicted files | 34 resolved, 0 markers left |
| Unit (`npm test`) | 227 files, 3,322 tests pass (8 skipped, as before) |
| Lint (`npm run lint`: js, scss, arch) | Clean. `format:check` is clean too |
| Fit (`npm run test:fit`, stub mode) | 625 pass. The first run had 27 failures, all in the templates specs, all caused by the merge (see below) |

Questions: 2, both minor (see [Questions](#questions)).

## Principle applied

The combined side's notification behaviour is unchanged: the opening run, soft save, amend endings, review structure and the view header. The templates behaviour applies only in template mode, through `inTemplateMode()` and `changingSavedTemplate()`, on the same pages. That follows ruling claim 5: template mode is another way through the same pages.

## Shared plumbing

| File | Combined (HEAD) | Templates (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `shared/save-actions.njk` | `amend` and `hubExitWhileAmending` params; amend ending (Save and return, Save and continue, link-styled hub exit) | `templateChange` param (Save and return plus Cancel); no return controls without `hubHref` | One macro with all three params. Precedence: `templateChange`, then `amend`, then the default. `hubHref` guard on both return-control branches | Both endings survive. Templates' doc says its ending "takes precedence over the others" |
| `shared/kit.js` | `CYA_SLUG`, `CANCEL_AMEND_SLUG`, `journeyStrip(journey, { offerCancelAmend })` with `cancelAmend`, `amending` in `base` | `journeyStrip` draws the template name and grey Template tag in template mode; `templateChange` in `base` | One `journeyStrip`: template branch first, otherwise the notification strip with `cancelAmend`. `base` carries `templateChange`, `journeyStrip` with options, and `amending` | Each side adds to a different branch |
| `shared/kit.test.js` | `isHubExit`, `amendReviewTarget`, `skipsRequiredChecks`, `base` amending tests | `exitTarget` and `base` templateChange tests | Kept all tests, merged imports | Both sides' behaviour |
| `shared/copy.en.js`, `copy.cy.js` | `journeyStrip`: `submittedActionRequired`, `amend: 'Amend'`, `cancelAmend` | `journeyStrip.template` | Union, with HEAD's `amend` wording | Additive |
| `config/nunjucks/context/context.js` | Import `amendFormActions` | Import `LIVE_ANIMALS_SET_BASE` for the Templates nav item | Both imports | Additive |
| `engine/journey.js` | `isSubmittedStatus` replaced `SUBMITTED` | Imported `inTemplateMode` | Both | Additive |
| `lib/validate/calendar.js` | Added `formatMomentAsLongDay` | Added the same function | Kept one copy, HEAD's doc comment | Same code from both sides |
| `lib/validate/calendar.test.js` | 3 tests for `formatMomentAsLongDay` | 1 test for it | One `describe` with all 4 tests | No coverage lost |

## Journey flow

| File | Combined (HEAD) | Templates (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `flow/run.js` | `endsRunWhenComplete` on addresses; `RUN_BACK_STEPS` Back links (needs `identifiesAnAnimal`) | Template mode skips documents and the review in the run | Both: the early end of the run, then the template-mode filter on later steps | They act at different points |
| `flow/run.test.js` | `#runBackTarget` tests | `#nextRunTarget` template-mode tests | Both kept | Both pass unchanged |
| `commodities/search/actions/commit-selection.js` | Run-aware: change context goes to Commodity details, otherwise `nextTarget` (main import reason in the run) | In template mode, Save returns to the template's task list | Hub exit, then template mode goes to the task list, then HEAD's behaviour | Templates' AC: "Saving 'What are you importing?' in template mode returns to the template's task list instead of going on to the main import reason" |
| `commodities/search/search.controller.js` | Back is `runBackLink` (origin during the run, else the overview) | Back is Origin while creating a template; otherwise the overview, or the template page when changing a saved template | Creating a template goes to Origin. Otherwise `runBackLink`, which resolves to the template page when a saved template is being changed | Both contexts kept |
| `addresses/controller.js` | Back from a Change link goes to the review, except while amending (overview) | Back from a Change link goes to the review or the template page (`changeReturnPath`) | `changeReturnPath` when in change context and not amending | Both rules hold |
| 11 page templates (additional-details, addresses, animal-identification, consignment-details, search, contact, import-reason, origin, port-of-entry, transit-countries, transporters) | `saveActions(..., amend = ...)`; contact also `hubExitWhileAmending = false` | `saveActions(..., templateChange = templateChange)`; origin also `showReturnControls` | Each call passes both sides' named arguments | Named arguments, so they combine cleanly |

## Overview (hub)

| File | Combined (HEAD) | Templates (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `hub/template.njk` | Task list wrapped in a named `<section>` region | Heading from `taskListHeading` (Notification tasklist or Template tasklist) | HEAD's region with templates' heading variable | Both |
| `hub/copy/copy.test.js` | `TRANSPORT_ROW_TITLE` constant | `UPLOAD_DOCUMENTS_ROW_TITLE` constant | Both constants | Same values |
| `hub/hub.fit.spec.js` | `referenceHeading` import; region tests | `openTemplateTaskList` import; template task list tests | Both | Additive |

## Review (check answers)

| File | Combined (HEAD) | Templates (MERGE_HEAD) | Resolution | Why |
|---|---|---|---|---|
| `check-answers/controller.js` | Draft and submitted reviews headed by reference with the view header; amend title, Cancel amend and Delete; Back link; `holdsSilently` (amend not refused); health certificate section; species errors | Template review: titled 'Review your template', Save template, no errors (`checked`), Save template POST | Split the view into `notificationReviewView` (HEAD, unchanged) and `templateReviewView`. Template mode: template strip, Back to the task list, no Delete or Cancel amend. `holdsSilently` also covers template mode | HEAD unchanged for notifications. Template review matches templates' AC and unit tests, including Back to the task list |
| `check-answers/template.njk` and `_review-sections.njk` (new on templates) | New card markup: `section.cards`, `subsections`, `speciesBlocks`, section error, fixed heading levels 3, 4 and 5 | Moved the main-era card markup (`section.groups`) into the `_review-sections.njk` partial, shared with the saved template's page; button text from `submitText` | Kept the partial, but rewrote its body to HEAD's markup. The review calls `reviewSections`. Restored the `govukSummaryList` import the view header needs. HEAD's button group uses `submitText` | The review and the template page both render the combined review's cards. The old partial would have dropped every card |
| `view-model/cards/movement/arrival-details.js` | Transit countries as a subsection | No arrival date row in template mode | Both | Additive |
| `view-model/sections/documents.js` | Private `DOCUMENTS_SECTION_ANCHOR` | Exported it for `template-review.js` | Exported | Templates needs it |
| `check-answers.test.js` | View header, species and amend tests | Template review tests | Both, merged imports | See the fixes below |
| `check-answers.fit.spec.js` | Level-3 card headings; new constants | `SUMMARY_CARD_SELECTOR`, `MISSING_VALUE_SELECTOR`; template review specs | Level 3 with the selector constant; both sets of constants and specs | HEAD's heading levels are the current markup |

## Merge-caused fixes (outside the conflict hunks)

| File | What failed | Fix |
|---|---|---|
| `shared/copy.en.js`, `copy.cy.js`, `copy.test.js` | Lint: duplicate `saveActions.saveAndReturn` key (both sides added it) | Kept one |
| `shared/copy.test.js` | `journeyStrip` keys pin was missing `template` | Added `template: 'Template'` |
| `shared/save-actions.test.js` | A templates test passed `true` as the 5th positional argument, which is now `amend`. It passed by accident | Passed `templateChange = true` by name. Added a test that `templateChange` takes precedence over `amend`. Named a repeated literal |
| `check-answers.test.js` | `ARRIVAL_DATE_KEY` declared twice (templates' 'Arrival date at port of entry' against HEAD's 'Arrival date at destination'). `UPLOADED_DOCUMENTS_CARD` no longer exists. A templates test expected a draft's review to be titled 'Review your notification' | Kept HEAD's key; the "no documents section" check now uses the section anchor. The draft title test now expects the reference, as HEAD does, and still checks the template wording does not leak (Continue) |
| `search.controller.test.js` | A templates test expected a notification's commodity save to go on to Commodity details. HEAD sends it to the overview outside the run | Asserts the notification's own overview path. Intent kept: template behaviour does not leak |
| `fit/live-animals-journey.js` `answerEveryTemplateSection` | Walked templates' task rows ('Main reason for import', and arrival and addresses as chains) | Walks the combined rows (Main import reason, Additional details, Transit countries, Transport details; CPH inside Roles and addresses), as `completeAnswerSections` does |
| `template-page.fit.spec.js`, `change-template.fit.spec.js`, `use-template.fit.spec.js`, `origin.fit.spec.js` | Main-era review names: 'import details', 'Roles and addresses' card, 'Reason for import', 'Animal details', 'Arrival date at port of entry' row, 'Number of packages', 'Bos taurus'. The draft review title. The 'no documents' sentence. Duplicate change links per commodity. The removed country hint | Followed the combined names: 'origin of import', 'Addresses', 'Main import reason', 'Identification details', 'Arrival date at destination', 'Number of packages (when required)', 'Bos Taurus'. The draft review checks the reference heading. 'No documents' checks only 'Document 1', reading Not applicable. Change links are de-duplicated. The country hint check became the country label. `change-template` reuses `answerEveryTemplateSection` instead of its own copy. Absence checks still use the live names, so they cannot pass vacuously |

## Questions

1. **Section 4 heading on the template review.** The combined review renamed section 5 to '5. Consignment addresses'. The template review and the template task list still say '4. Consignment parties', which matches the hub's group caption, as templates intended. Should the template review follow the review ('4. Consignment addresses') or the task list? Kept as templates built it.
2. **Back link on the template review.** The combined review's Back goes to the dashboard (draft) or the overview (amend). In template mode it now goes to the template's task list, which is what templates' unit test asserts. Confirm this matches 'Back links follow the context a page was opened in'.

## Logs

Session scratchpad: `unit-4.txt`, `lint-4.txt`, `fit-6.txt` (final). `fit-1.txt` is the first run, with the 27 failures.
