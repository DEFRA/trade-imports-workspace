# Design Release 2.1: Behaviour Spec audit of the combined branch

## 1. Summary

The audit compared the Behaviour Spec in `openspec/` with what the combined branch (`feat/NO_JIRA-design-release-2-1-combined`) now does. It found 51 gaps. 45 were confirmed and fixed. 4 were refuted. 2 are one business question about where a trader lands after "Add another commodity", which is held for the business and not written into the spec. A follow-up fixed 3 more things the verifiers had not called false.

Method: `origin/main...feat/NO_JIRA-design-release-2-1-combined` diffed in all 8 repos. 69 capabilities (live animals, plants, INS; admin untouched) were checked in 22 batches, plus 3 orphan sweeps (animals frontend; plants frontend; INS frontend, INS backend, stub and reference data). Each batch had one Opus judge, one Opus adversarial verifier (default is refute when it cannot verify) and one Opus fixer. 60 agents ran, with no errors.

| Measure | Live animals | Plants | INS | Total |
|---|---|---|---|---|
| Capabilities checked | 36 | 28 | 5 | 69 |
| Touched by the diff | 30 | 26 | 4 | 60 |
| Gaps raised | 28 | 23 | 0 | 51 |
| Confirmed and fixed | 23 | 22 | 0 | 45 |
| Refuted | 3 | 1 | 0 | 4 |
| Held as business questions | 2 gaps, 1 question | 0 | 0 | 2 gaps, 1 question |
| Extra fixes after the workflow | 3 | 0 | 0 | 3 |

The 3 orphan sweeps (6 code areas, all touched by the diff) raised no gaps.

Templates (EUDPA-690) was not in the combined branch for this pass. Section 7 covers it and the type question after the merge.

## 2. Questions for the business

One question, raised by two gaps (commodity details and identification details). The verifier agreed the code looks wrong on plain reading, so the spec was not changed.

**Where should a trader land after "Add another commodity"?**

A trader is on Commodity details and selects "Add another commodity". They choose a further species and select "Save and continue". Should they come back to Commodity details to enter the new species' number of animals, as they did before? The same question applies to "Add another commodity" on Identification details.

What is built now:

- Outside the opening run, they land on Overview and must reopen the Commodity details task to count the new species.
- In the opening run, the save goes on to the next step, Main import reason.
- Before the branch, this save always went back to Commodity details. The branch changed `commit-selection.js` (journey-foundation commits `1ba2e218` and `368f460d`) so it uses `kit.nextTarget` unless a change context is present.
- The "Add another commodity" link carries a change context only when one already exists.
- The spec says nothing about where the save lands (REQ-COMMODITY-DETAILS-007, SCN-COMMODITY-DETAILS-007-A; SCN-IDENT-003-B only says selection opens).
- It sits awkwardly against REQ-FLOW-012 (a detour lets the user leave only the way they came in), and against inc-002, which kept the add-another round trip on the page for Upload documents. inc-015's plan (`plans/inc-015.md:58`) relied on the save handing back to Commodity details.

Evidence:

| Point | File and line |
|---|---|
| Redirect logic | `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/commodities/search/actions/commit-selection.js:32-36` |
| Add-another link on Commodity details | `.../commodities/consignment-details/consignment-details.controller.js:54-57` |
| Add-another link on Identification details | `.../commodities/animal-identification/animal-identification.controller.js:70-73` |
| Fit test asserting Overview, then reopening Commodity details | `.../commodities/fit/consignment-details.fit.spec.js:345-353` |
| Identification fit test (follows the Overview task link, not the add-another link, so it does not prove this path) | `.../commodities/fit/identification.fit.spec.js:883-892` |

Corrections the verifier made to the judge's claim: the "Change" link on an Identification details card opens Commodity details (as SCN-IDENT-003-A says), so only "Add another commodity" is affected there.

## 3. Gaps fixed

Every fix edited `openspec/` only. "Coverage" is the strength of the resulting `coverage.json` link or rolled-up scenario.

### Live animals

| Capability | What the spec now says | IDs | Coverage |
|---|---|---|---|
| journey-flow | The Check and submit row is not a flow rule (Overview owns it). The declaration and confirmation gate stays. A scenario asserting the opposite was deleted. | REQ-FLOW-006, SCN-FLOW-006-C (deleted) | full |
| journey-flow | The caption reads "main import reason", not "main reason for import". | SCN-FLOW-003-C, 003-I, 007-A, 007-D, 007-H | unchanged |
| notification-dashboard | A reference-number search opens the view headed by that reference. | SCN-DASH-007-C | full |
| notification-dashboard | A submitted card, with or without action required, offers view, amend, copy and delete. | REQ-DASH-004, SCN-DASH-004-B, 004-D | fit full, E2E partial (no Delete assert) |
| notification-lifecycle | Cancelling or finishing an amendment returns the status to what it was: Submitted, or Submitted action required. | SCN-LIFECYCLE-008-D | full |
| notification-lifecycle | Cancelling an amendment (no JavaScript) restores status and submitted answers. | SCN-LIFECYCLE-008-F | full (no-JS fit test partial) |
| notification-lifecycle | A submitted-action-required view is read-only with an orange tag and a health certificate warning. Dead test link replaced. | REQ-LIFECYCLE-005, SCN-LIFECYCLE-005-A | partial (no single test proves the whole Then) |
| notification-status-and-reference | State shows as a tag beside the reference heading on the review and the view. The declaration page is excluded. | REQ-STATUS-REF-001, 002 | unchanged |
| contact-address | Saving with no address is never refused. Outside the opening sequence it returns to Overview; inside, to check your answers. | REQ-CONTACT-003, SCN-CONTACT-003-A | full |
| origin-of-import (obligations) | A region of origin code is asked for, and mandatory, only when the answer is Yes. Under No it is neither asked for nor saved. | REQ-OB-ORIGIN-001, SCN-OB-ORIGIN-001-A, 001-B | partial (no test submits a notification answered No) |
| scope-and-status | Removed the rule that a region code "keeps its answer" when out of scope. No page shows it now. | REQ-OB-SCOPE-003, SCN-OB-SCOPE-003-A (deleted) | none |
| transporter (obligations) | A transporter added through the add route joins the list as "New transporter" and is the chosen transporter. | REQ-OB-TRANSPORTER-002, SCN-OB-TRANSPORTER-002-C | full |
| transporter (obligations) | Dead test link replaced by a fit test that proves the added transporter is checked and kept on re-save. | SCN-OB-TRANSPORTER-002-C | full |
| arrival-details (obligations) | Air and Sea leave the Transit countries row absent; a stale transit submit saves nothing. Fit links added. | SCN-OB-ARRIVAL-001-B, 002-A | full (new fit links partial) |
| commodity-selection (obligations) | A blank number of packages holds the page and names the field. CPH test note corrected. | SCN-OB-COMMODITY-003-A, 001-A, 001-B | full |
| check-your-answers | Transit countries subsection: overland with none reads "Not applicable"; sea or air has no subsection (new scenario). | SCN-CYA-001-T, REQ-CYA-001 | partial (sea and air half is unit-only) |
| check-your-answers | A reason that asks no exit questions (such as Re-entry) shows no exit rows. | SCN-CYA-001-F | full |
| check-your-answers | Amending lands on Overview with the status "Amend". | SCN-CYA-008-B | full |
| overview | Test link for the Animal identification row corrected. | SCN-OVERVIEW-005-B | full |
| import-reason | A reason with no reveal (Re-entry) saves without error. Internal market without a purpose is refused, with the reveal open and focus on the first purpose (new scenario). | REQ-IMPORT-REASON-002, 003, SCN-IMPORT-REASON-002-A, 003-B | partial |
| arrival-details | Save and continue without a means of transport is refused; Save and return to overview is not. | REQ-ARRIVAL-006 | unchanged |
| arrival-details | The ordinary port list begins with a blank "Select a port" entry, also without JavaScript (new scenario). | REQ-ARRIVAL-012, SCN-ARRIVAL-012-B | full |
| origin-of-import | The origin task stays outstanding while no country is chosen; Overview owns when it reads Complete. | REQ-ORIGIN-008 | unchanged |

Also fixed after the workflow (see section 4 for why the workflow had refuted them):

| Capability | What changed | IDs |
|---|---|---|
| addresses | Four E2E links named a test title that does not exist. They now name "the picker searches and pages the address book, and the row selected on a later page is the one that saves". | SCN-ADDR-006-A, 006-B, 009-A, 010-A |
| addresses | The fit link named a test that does not exist. It now names "picker carries a later-page selection and keeps it selected off-page". | SCN-ADDR-010-A |
| check-your-answers | A certificate counts as outstanding until its virus scan has passed (the backend's `OutstandingItem.java` counts only scan status COMPLETE). | REQ-CYA-018 |

### Plants

| Capability | What the spec now says | IDs | Coverage |
|---|---|---|---|
| journey-flow | Revisiting origin after the run returns to Overview. A revisited page with a later page in its own task goes on only to that page. | SCN-PLANTS-FLOW-007-C | full (new E2E link partial) |
| journey-flow | A page in no Overview task (check your answers, declaration) goes to the next page of its section, not Overview. | REQ-PLANTS-FLOW-003 | unchanged |
| journey-flow | The exemption list now covers a notification that does not exist, for which the page asked for answers (the view). | REQ-PLANTS-FLOW-008 | unchanged |
| notification-lifecycle | An amendment can start from the dashboard or the read-only view (new scenario). | REQ-PLANTS-LIFECYCLE-005, SCN-PLANTS-LIFECYCLE-005-B | full |
| notification-lifecycle | A draft can be deleted from its check answers; an amendment's check answers offers no delete (two new scenarios). | REQ-PLANTS-LIFECYCLE-008, SCN-PLANTS-LIFECYCLE-008-C, 008-D | partial (008-C only reaches the delete page; 008-D full) |
| review (obligations) | Outstanding tasks are named on a draft whenever check your answers is shown, and in an amendment only once the user has continued. | REQ-PLANTS-OB-REVIEW-002, 003, 004 | unchanged |
| check-your-answers | Each unfinished task is named with its "Complete <task>" string. Origin and removed-address errors come first, then Overview order, with no repeats (new requirement, two scenarios). | REQ-PLANTS-CYA-017, SCN-PLANTS-CYA-017-A, 017-B | full (one E2E link partial) |
| confirmation | A notification not currently submitted, draft or amendment awaiting re-submission, is sent to the declaration (new scenario). | REQ-PLANTS-CONFIRMATION-002, SCN-PLANTS-CONFIRMATION-002-A, 002-B | partial (amend arm is unit-only) |
| origin, arrival-details, arrival-status | While amending, how the page ends is decided by REQ-PLANTS-FLOW-014. | REQ-PLANTS-ORIGIN-009, REQ-PLANTS-ARRIVAL-DETAILS-010, REQ-PLANTS-ARRIVAL-STATUS-006 | unchanged |
| commodity-type, identification-numbers | Same amend deferral. No cancel control is offered while amending. | REQ-PLANTS-COMMODITY-TYPE-005, REQ-PLANTS-IDENT-NUMBERS-001, 004 | unchanged |
| commodities | Continuing to origin applies only during the opening sequence; afterwards it returns to Overview. | REQ-PLANTS-COMMODITIES-006, SCN-PLANTS-COMMODITIES-006-B | full |
| consignment-contact-select | After the opening sequence, save and continue goes to Overview with the task Completed; within it, to check your answers (new scenario). | REQ-PLANTS-CONTACT-SELECT-002, SCN-PLANTS-CONTACT-SELECT-002-A, 002-D | full |
| consignment-contact-select | A blank save is allowed and leaves the task not started. Hub-exit controls are not offered while amending. | REQ-PLANTS-CONTACT-SELECT-003, 005, SCN-PLANTS-CONTACT-SELECT-003-A, 002-B, 005-A | unchanged |
| consignor-select | The three save controls are offered only outside an amendment. | REQ-PLANTS-CONSIGNOR-001, SCN-PLANTS-CONSIGNOR-001-A | unchanged |
| place-of-destination | The three save controls are offered only outside an amendment. | REQ-PLANTS-PLACE-OF-DESTINATION-007, SCN-PLANTS-PLACE-OF-DESTINATION-007-B, 007-C | unchanged |

### INS

No gaps raised.

### Second pass: the fixers' side notes

The fixers noted four possible gaps beyond their brief. Each was then checked against source and fit/E2E tests.

| Capability | Verdict | What the spec now says |
|---|---|---|
| Plants consignor-select (REQ-PLANTS-CONSIGNOR-003, SCN-003-C, 003-D) | Fixed | Save and return to overview, and cancel and return to overview, are offered only outside an amendment. While amending, the page ends with Save and return and Save and continue only (`save-actions.njk:24-42`; E2E `review.spec.ts:585-601`). |
| Plants place-of-destination | Not a gap | REQ-PLANTS-PLACE-OF-DESTINATION-007 and its scenarios were already scoped to "not being amended" by the first pass. |
| Plants journey-flow (REQ-PLANTS-FLOW-006) | Fixed | Check your answers opens whatever the notification owes. A declaration opened directly is not withheld; confirming it on an unfinished notification returns to check your answers without submitting (`declaration/controller.js` post; `engine/write/submit.js:9-15`; E2E `review.spec.ts:466-477`). The return-without-submitting rule has only a unit witness; a spec-cover candidate. |
| Live animals check-your-answers (SCN-CYA-001-E vs SCN-CYA-018-C) | Fixed | SCN-CYA-001-E now applies to a draft or a notification being amended. A submitted view with no documents follows SCN-CYA-018-C (`sections/documents.js:24-48`). |

The plants journey-flow finding raised the same question for live animals' REQ-FLOW-006. It held there too, and is fixed the same way: the declaration opens for an unfinished draft (`declaration/controller.js:52-58`; fit `declaration.fit.spec.js:15-28`, E2E `pages/confirmation.spec.ts:5-12`), and what waits for every task row is submitting (`declaration/controller.js:73-93`, `engine/write/submit.js:9-15`). The return-without-submitting clause has no scenario of its own yet, in either service.

## 4. Refuted

| Gap | Reason |
|---|---|
| Live animals addresses (SCN-ADDR-006-A, 006-B, 009-A, 010-A): E2E link names a test that does not exist | The link was broken, but the branch does not change it, so it was outside the changed surface. Fixed in the follow-up. |
| Live animals addresses (SCN-ADDR-010-A): fit link names a test that does not exist | Same: broken but untouched by the branch. Fixed in the follow-up. |
| Live animals check-your-answers: unfinished documents are named once, against the first document card (proposed SCN-CYA-007-F) | The code matches, but the verifier could not show a user can reach the state: documents are validated at add time, and only unit tests cover it. REQ-CYA-007 already says each entry links to its card. |
| Plants identification-numbers SCN-PLANTS-IDENT-NUMBERS-002-A: "leaving contact" implies Overview, but the run now ends on check your answers | The sentence is still true once Overview is opened, and the landing page belongs to REQ-PLANTS-FLOW-007. The reword would be a small clarity gain, not a gap. |

## 5. Capabilities checked with no gap

Capabilities marked "not touched" had no change in the diff. Orphan sweeps (code areas outside any capability) found nothing, and all were touched.

**Live animals (36 checked, 30 touched)**

- Not touched by the diff: page-titles, service-navigation, authentication, transporter-type, private-transporter-details, commercial-transporter-details.
- Touched, no gap: journey-section-captions, notification-events, consignment-addresses, confirmation, declaration, upload-documents, additional-details, cph-number, commodity-selection, transited-countries, import-reason (obligations), transporter (page).
- Touched, no gap in the commodity pages beyond the held question: commodity-selection, commodity-details, identification-details.

**Plants (28 checked, 26 touched)**

- Not touched by the diff: journey-section-captions, commodity-details.
- Touched, no gap: page-titles, notification-dashboard, addresses, authentication, contact, commodity-selection, destination, parties, origin (obligations), arrival (obligations), overview, declaration.

**INS (5 checked, 4 touched)**

- Not touched by the diff: authentication.
- Touched, no gap: address-book, notification-dashboard, notification-tracking, page-titles.

**Orphan sweeps (all touched, no gap):** animals frontend, plants frontend, INS frontend, animals backend, stub, reference data.

## 6. Proof

| Check | Result |
|---|---|
| `openspec validate --specs --strict` | 74 passed, 0 failed |
| `tim spec lint` | Clean: 74 capabilities, no findings |
| `tim spec gaps` | 0 scenarios with no coverage, before and after |
| Scenarios | 966 to 974 |
| Partial scenarios | 31 to 35 (new scenarios whose only witnesses are partial, such as SCN-CYA-001-T) |
| Commit | `36007aa5` on `feat/NO_JIRA-design-release-2-1`, `openspec/` only, 46 files, pushed. Its message says "46 confirmed and fixed, 5 refuted"; the true counts are 45 and 4, as this report gives |

## 7. Type question and templates (after the merge)

The type question (INS) and templates (EUDPA-690) merged into the combined branch on 12 October. The audit was re-run on that diff: 12 capabilities (7 live animals, 2 plants, 3 INS) and 4 orphan sweeps (animals backend, animals frontend, INS frontend, plants frontend) in 7 batches, each with a judge, an adversarial verifier and a fixer. The sweeps found no gap that sits outside a capability.

### Summary

| Measure | Live animals | Plants | INS | Total |
|---|---|---|---|---|
| Capabilities checked | 7 | 2 | 3 | 12 |
| Gaps raised (reports) | 37 | 3 | 8 | 48 |
| Confirmed (reports) | 26 | 1 | 7 | 34 |
| Confirmed and fixed (distinct) | 20 | 1 | 6 | 27 |
| Refuted | 2 | 2 | 1 | 5 |
| Held as business questions (reports) | 9 | 0 | 0 | 9 |
| Business questions (de-duplicated) | 6 | 0 | 0 | 6 |

How the counts reconcile: 34 confirmed reports, less 5 raised twice (four by both notification-templates batches, one on the INS Dashboard item), less 2 whose own batch could not edit the capability and were fixed by the notification-templates run (card names on the review, and the template's Origin step). That leaves 27 distinct gaps fixed.

### Questions for the business

Nine reports came to six questions. Each one is held, not written into the spec; the verifiers agreed the code looks wrong against the backlog or against how a notification behaves.

| # | Question | Built now | Reports merged |
|---|---|---|---|
| 1 | Should a template's review and a saved template's page head the parties section "4. Consignment addresses", like the notification review (the backlog, inc-156, says so), or keep "4. Consignment parties", like the template's task list? | "4. Consignment parties", hard-coded in the template copy, so the review's rename never reached template mode | 3 |
| 2 | What should Germinal products do before the germinal set exists? A germinal template can be named but is silently lost on Save and continue; its Use template button returns to Manage templates and starts nothing; the type question sends Germinal products to a start address that shows no page. Hide it, explain it, or build it? | Silent return to Manage templates, no message | 2 (plus the open point noted on the type question) |
| 3 | Should Origin of the import, opened from a template's task list, offer "Save and return to overview" and "Cancel and return to overview", as every other task does? | Only "Save and continue"; Back goes to the template name page | 1 |
| 4 | Where should Back go on "What are you importing?" when opened from the template's task list or review: where the trader came from, or always Origin as now? | Always Origin | 1 |
| 5 | After changing "What are you importing?" from the template review, should Save and continue return to the template review, as every other Change link does? | The template's task list | 1 |
| 6 | Until template delete is built, should the Delete button on a saved template's page be hidden? | The button leads to "page not found" | 1 |

### Gaps fixed

| Capability | What the spec now says | IDs | Coverage |
|---|---|---|---|
| live-animals/notification-templates | Review and page use the merged names: "Additional details", "Addresses", "Main import reason" (card and single row), "Contact address", "Origin of import"; no "Identification details" card while nothing is identified | REQ-TEMPLATES-014, 015, 017, 026, 028, 033, 036 and their scenarios | full; fit link for SCN-015-A dropped to partial |
| live-animals/notification-templates | The E2E link for the review's no-identification scenario renamed to the test that exists | SCN-TEMPLATES-015-A | full |
| live-animals/notification-templates | "Arrival date at destination", not "at port of entry" | REQ-TEMPLATES-014, SCN-TEMPLATES-014-A | full |
| live-animals/notification-templates | Every card, the transit countries and each species' count and identification have a Change link; unanswered rows read "Not applicable" with no error (new scenarios) | REQ-TEMPLATES-026, SCN-TEMPLATES-026-C, 026-D | partial |
| live-animals/notification-templates | Origin in template mode ends with Save and continue alone, and saving moves on to "What are you importing?" (two new scenarios) | SCN-TEMPLATES-006-E, 006-F | full |
| live-animals/notification-templates | Arrival details reads Complete once port, transport, identification and document reference are given (new scenario) | SCN-TEMPLATES-010-B | partial (unit only) |
| live-animals/notification-templates | A saved template's page shows no Template tag or status strip | SCN-TEMPLATES-022-A | full |
| live-animals/notification-templates | Commodity answer lists each common name once, in the order added | REQ-TEMPLATES-035 | full |
| live-animals/journey-flow | Opening run applies to notifications from the dashboard or the type question; a notification started from a template opens on its Overview (new requirement) | REQ-FLOW-007, REQ-FLOW-015, SCN-FLOW-015-A | full |
| live-animals/journey-pages/origin-of-import | Back rule scoped to notifications; Save and continue in template mode stays in the template; dead unit link replaced | REQ-ORIGIN-013, 019, SCN-ORIGIN-019-A, 019-B | full; REQ-ORIGIN-019 now partial |
| live-animals/journey-pages/commodity-selection | The three-control ending also applies while a template is created; a changed saved template follows REQ-TEMPLATES-028 | REQ-COMMODITY-SELECT-012 | unchanged |
| live-animals/journey-pages/check-your-answers | Requirements scoped to a notification's review; the template review is named in the Purpose | REQ-CYA-001, 002 | unchanged |
| live-animals/journey-pages/overview | Requirements scoped to a notification; the template's task list is named in the Purpose | REQ-OVERVIEW-001, 002, 003, 010 | unchanged |
| live-animals/service-navigation | The Address book item opens the INS address book, signing in if asked (new requirement) | REQ-NAV-006, SCN-NAV-006-A | full |
| plants/service-navigation | The Dashboard and Address book items lead to the plants dashboard and the INS address book (new requirement) | REQ-PLANTS-NAV-004, SCN-PLANTS-NAV-004-A, 004-B | partial (unit only) |
| ins/notification-type | Germinal products goes to the germinal start address; the template question shows no Template tag, name, Draft tag or reference; continuing for a template in progress returns to it with its name (two new scenarios) | REQ-INS-NTYPE-002, 004, SCN-INS-NTYPE-002-B, 004-A, 004-F, 004-G | 002-B and 004-A full; 004-F and 004-G unit only |
| ins/notification-dashboard | Create new and Use template are still offered when the list cannot be loaded (two new scenarios) | REQ-INS-DASH-004, 005, SCN-INS-DASH-004-D, 005-C | 004-D unit only; 005-C partial |
| ins/service-navigation | Dashboard is marked current on the type question when starting a notification (new scenario) | REQ-INS-NAV-003, SCN-INS-NAV-003-D | partial |

### Refuted

| Gap | Reason |
|---|---|
| Manage account links to `#` and goes nowhere (live animals, plants and INS navigation: three reports) | It is the agreed placeholder copied from the design release prototype, which names no owner for the destination. Each REQ-...-NAV-001 already says the item is offered. Writing "leads nowhere" into the spec would record a placeholder as intended behaviour. Its destination stays an open product question |
| Plants: the type chosen on the INS question is not carried into plants' own "What are you importing?" | REQ-PLANTS-FLOW-015 already says the draft opens exactly as it does from plants' own dashboard, with nothing pre-chosen. The 9 October ruling accepts plants' first page as its own type question, and the options differ in label, so carrying the choice would be a new feature. A fair product question, but no ruling is contradicted |
| Live animals check-your-answers: Back from the template review goes to the template's task list | REQ-CYA-003 lists its cases and a template is none of them, so nothing false is said. REQ-TEMPLATES-016 already specifies it, and the fit and E2E tests match. Only a cross-reference was missing, which the Purpose edit supplies |

### Proof

| Check | Result |
|---|---|
| `openspec validate --specs --strict` | 78 passed, 0 failed |
| `tim spec lint` | Clean: 78 capabilities, no findings |
| Commit | `eb98960c` on `feat/NO_JIRA-design-release-2-1` |
| Witnesses | Three new scenarios have unit witnesses only: SCN-INS-DASH-004-D, SCN-INS-NTYPE-004-F and SCN-INS-NTYPE-004-G. They are being covered on the templates branch. Other new scenarios are partial (listed above) and are spec-cover candidates |
