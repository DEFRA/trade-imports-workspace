## EUDPA-604 — inc-036

**Finding:** the hub offers no "Review and submit" button; the frontend makes reviewing a notification a task row that stays locked until every other task is done.

Design release 1 reaches the review from a primary button under the task list. The live-animals hub instead had a sixth section holding a locked "Check and submit" task row, so a user could not open the review until every other task was complete.

### What changed

- `hub/controller.js` — drops `buildReviewItem` and the `readyForCheckYourAnswers` section gate from the task-list build.
- `hub/template.njk` — adds a primary "Review and submit" button in the button group, ahead of the existing secondary "Return to dashboard".
- `hub/copy/copy.en.js`, `hub/copy/copy.cy.js` — removes the "6. Check and submit" section heading, row label and hint; `copy.test.js` updated to match.
- `hub/hub.fit.spec.js` and the other fit specs, plus `fit/live-animals-journey.js` — reach the review by the button rather than the row.
- `docs/add-a-section.md`, `docs/journey-flow-and-gates.md` — recipe docs updated for the removed section.

The button is always available, so a part-answered notification can be reviewed at any point. The check-your-answers screen already rendered an incomplete notification; only the route to it from the hub was missing.

### Cross-repo

This increment also changes **DEFRA/trade-imports-animals-tests** on the same branch name, `feat/EUDPA-604-the-hub-offers-no-review-and-submit-butt`.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs that still click the removed task row, and CDP would go red.
