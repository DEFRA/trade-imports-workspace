## What changed

The origin page validated `countryOfOrigin` with `requiredOneOf`, so **Save and continue** with no country chosen returned the page with an error and kept nothing. A user who knows the internal reference but is still waiting on the health certificate to confirm the country could not record what they do know.

Design release 1 does not check the country on submit at all — it saves what is there and catches the gap later, at the hub task row and again at the review page before the declaration.

This change swaps `requiredOneOf` for `oneOf` on `countryOfOrigin`, so a partly answered origin page saves, while keeping the membership check so a submitted value that is not a country is still refused.

- `src/server/app/journeys/linear/features/origin/controller.js` — validation swap.
- `copy.en.js` / `copy.cy.js` — error copy becomes "Select a country from the list", now that it only fires for an off-list value.
- `controller.test.js` and `origin.fit.spec.js` — cover the new save-what-you-have behaviour and the retained off-list rejection.

The obligation model still marks the field mandatory, so the hub shows the origin task as unfinished and the check page still stops a submission without it. This brings origin into line with the reason-for-import page, which already saves what the user has.

## Scope

Increment **inc-082** of the parity DR1 union backlog, ticket **EUDPA-476**.

Frontend-only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no cross-repo merge ordering to observe here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
