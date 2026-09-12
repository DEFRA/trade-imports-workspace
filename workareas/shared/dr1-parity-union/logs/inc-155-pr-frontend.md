## EUDPA-582 — the read-only review still offers to submit

Increment: `inc-155` (corpus `dr1c`, slice `review`)
Ticket: EUDPA-582

### The problem

When a notification has been submitted and the trader opens it through the **View** link on the dashboard, the review page is already redrawn read-only: the status tag turns green and reads "Submitted", every Change link is dropped, and "Copy as new" and "Delete" appear at the top.

The block at the foot of the page was left outside that condition. The page still carried the heading "Now submit your notification", the sentence "Continue to the declaration to submit your notification." and a live green Continue button — offering the one action the read-only page had otherwise taken away. Pressing it reached the declaration, which redirects a submitted journey to the confirmation page, so the trader landed on a confirmation for a notification they did not just submit.

Design release 1 guards the whole form with the same read-only test and renders nothing at the foot of the page once a notification is submitted (`app/views/review-notification.html:180-186`).

### The change

Wrap the heading, the sentence and the submitting form in `{% if not readOnly %}` in `src/server/app/sets/live-animals/journeys/linear/features/check-answers/template.njk`. The template already receives the `readOnly` flag and uses it for the Change links and for the Copy and Delete buttons, so this is one condition around a block that was never put inside it.

The read-only review now ends with the last card and presents a submitted notification as a record with no action on it.

### Tests

Adds a fit spec for the submitted review in `check-answers.fit.spec.js`. It asserts the page is the read-only one, that the submit heading, the body sentence and the Continue button are all absent, and that the submitted review has no serious or critical axe violations.

### Scope

Frontend only. The tests repo was branched for this increment but needed no change, so no PR was raised there.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
