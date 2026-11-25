# Repository Review: trade-imports-performance-tests

**PR:** #47
**Commit reviewed:** 5c909366df0f781816a980e3e7801f2cc909f77e
**Files Changed:** 6

## Summary
Removes the live animals contact endpoints and step, and keeps the plants contact endpoints, which still exist. The confirmation check now compares URL paths with `pathOf`. The one open item is the new `openingRunFromTransporter` step (#4), which saves nothing, re-posts addresses and carries an untrue JSDoc.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/config/endpoints.js` | SAFE | 0 | 0 | 0 |
| `src/config/journey-endpoints.js` | SAFE | 0 | 0 | 0 |
| `src/config/journey-endpoints.test.js` | SAFE | 0 | 0 | 0 |
| `src/config/smoke.test.js` | SAFE | 0 | 0 | 0 |
| `src/k6/journeys.js` | SAFE | 0 | 0 | 0 |
| `src/k6/live-animals.js` | NEEDS ATTENTION | 0 | 3 | 0 |

## Positive Observations
- The contact removal is clean, and the plants contact endpoints are rightly kept.
- The endpoint config tests are updated in step.

## Test Coverage
- Unit tests: the config tests are adequate.
- Integration tests: n/a (k6 smoke path).

## Risk Assessment
**Overall Risk:** Low
**Rationale:** A test-only repo; the extra step costs requests but does not break the run.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/k6/live-animals.js | 171 | Major | comments | The JSDoc on openingRunFromTransporter (line 171) breaks two house rules and is untrue: it sits on a non-exported internal step, and it describes the frontend's flow, not the lines below. The frontend's nextStepLanding (animals-frontend flow/navigation.js:51-71, flow/flow.js:57-66) lands a documents save on cph-number, not the addresses hub, so 'visits accompanying documents then the addresses hub before check your answers' is not what the frontend does; the step opens the addresses hub itself with walker.reach. | no comment on this internal step; what the step does is carried by its name and body, and any rationale for ending the draft this way lives in the repo's docs. | delete line 171. | Merged | — | merged into #4 |
| 2 | src/k6/live-animals.js | 169 | Major | duplication | The new step re-implements pages two existing steps already own. OPENING_RUN_DOCUMENTS_SLUG (line 169) is a second name for documents.js's DOCUMENTS_SLUG ('accompanying-documents', documents.js:21); lines 177-183 repeat documentsStep's reach-then-continue (documents.js:134-146) with no uploads; lines 185-193 repeat the addresses step's closing reach-and-save (live-animals.js:104-108), and the two now post different bodies to the same ENDPOINTS.addresses.save ({} at line 106, { action: 'continue' } at line 193; the addresses controller reads action only for same-as actions, controller.js:277-279). Both pages were already saved earlier in the same draft (documentsStep and addresses in LIVE_ANIMALS_STEPS.draft), and nothing downstream needs a second pass: submitFromReview opens notification-view directly (journeys.js:252) and the frontend's readiness gate is answer-based (section-status.js:16-19). | each page's reach-and-continue has one owner in the k6 steps, the documents slug has one name, and the draft adds a step only when the run needs it to reach check your answers. | drop openingRunFromTransporter so the draft ends at transporters, as it would have without the contact step; or, if a smoke run shows the extra pass is needed, build it from documentsStep and the addresses step (or a shared helper they both call) and import DOCUMENTS_SLUG from documents.js. | Merged | — | merged into #4 |
| 3 | src/k6/live-animals.js | 172 | Major | naming | openingRunFromTransporter (lines 172-174, and the check name 'opening-run-from-transporter saved' at line 192) predicts a step that walks the frontend's opening run onward from the transporters page. The body does something else: it opens accompanying documents and continues, skips cph-number, then opens the addresses hub and saves it, and its check proves only that the addresses save returned 200, not that it reached check your answers. 'Opening run' also appears nowhere in the frontend flow code, so the name needs its comment to be understood. | if the step stays, its name and check name say what it does (re-continue the documents page and the addresses hub), with no comment needed to decode it. | name it continueDocumentsAndAddresses with check name 'documents and addresses continued'; moot if the step is removed under the duplication finding. | Merged | — | merged into #4 |
| 4 | src/k6/live-animals.js | 169 | Major | duplication | One rule, 3 findings: #1, #2, #3 — the openingRunFromTransporter step that replaced the contact step saves nothing, re-posts addresses and is named differently from the same step in animals-frontend and ins-tests (cross-repo owner: trade-imports-animals-frontend #38) | the perf seed follows the one rule set in animals-frontend #38: no step that saves nothing or posts a page twice. | delete openingRunFromTransporter and OPENING_RUN_DOCUMENTS_SLUG so the draft ends at transporters. | Auto-Resolved | — | Fixed at fadea7a (refresh 2026-11-25, see .verify/trade-imports-performance-tests.md) |
| 5 | README.md | 89 | Minor | comments | The pre-flight paragraph says the readiness run searches 'the Branch tabs narrowed to each of its roles'. src/lib/address-book.js:3-22 now has only two address types (Origin and Consignor; Destination, Consignee and Importer), so the README describes a tab the code no longer seeds. | the README names only the two tabs the readiness run searches. | replace the Branch clause with the two tabs and their roles. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
