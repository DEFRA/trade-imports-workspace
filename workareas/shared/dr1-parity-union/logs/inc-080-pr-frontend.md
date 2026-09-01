## What this changes

The origin page checked the revealed region of origin code for length and nothing else. A user could answer **Yes** to the region of origin question, leave the code box empty, press *Save and continue* and reach the next page with no code recorded and no message anywhere on the way.

The obligation behind the field already stops the notification later — `regionOfOriginCode` is mandatory whenever `regionCodeRequirement` is Yes, so the origin task row never reaches *Fulfilled*, the review section gate refuses and the submit refuses. The user was blocked eventually, just never told at the point of the mistake. Design release 1 enforces at all three points: the page, the hub task row and *Continue* on the review page. Frontend enforced only the last two.

This adds the missing page rule: a presence check on the region of origin code that fires **only** when the region question is answered Yes, showing "Enter the region of origin code" in the error summary and against the field. The No branch is untouched, and the obligation is unchanged — this is a page rule, not a model change.

## Changes

- `lib/validate/validators.js`, `lib/validate/index.js` — new `requiredMaxText` primitive. One rule rather than `compose(requiredText, maxText)`, because `maxText` allows the empty string and composing merges that allowance onto the required rule.
- `journeys/linear/features/origin/controller.js` — the suffix rule is chosen from the requirement answer, and validation now measures the code the answer would store (the typed country prefix stripped) rather than the raw box.
- `journeys/linear/features/origin/copy/copy.en.js`, `copy.cy.js` — the new required message.
- `lib/validate/validate.test.js`, `origin/controller.test.js`, `origin/origin.fit.spec.js` — cover the rule under Yes, under No, and against a box holding only the prefix.

## Increment

- Increment **inc-080** of the DR1 parity backlog.
- Ticket **EUDPA-365**.
- Frontend only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no cross-repo merge ordering to observe.
