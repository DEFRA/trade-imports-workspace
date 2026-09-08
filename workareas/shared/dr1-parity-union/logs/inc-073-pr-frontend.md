## What this changes

Frontend let a user leave the exit date blank on a temporary-admission-horses import and carry on. Design release 1 keeps them on the page with **"Enter an exit date"** — a message that existed nowhere in the service.

The exit date reveal validated with `dateText`, which allows an empty string through before it ever tries to read a date. A blank answer advanced the journey and the user only found out later, when the check-answers step would not open.

## How

- Adds a `requiredDateText` validator — a separate primitive rather than a compose of `requiredText` and `dateText`, because `dateText`'s allowance of the empty string would merge onto the required rule and let blank pass.
- Points the temporary-admission exit date rule at it, so blank now returns the page with "Enter an exit date", and unreadable text still says "Enter a real exit date".
- The date parse and bounds check are shared between the optional and the save-blocking rules.
- The reason radio itself stays optional: Design release 1 lets a user leave it blank, and Frontend already matched that.

## Files

- `src/server/app/lib/validate/validators.js`, `index.js` — the new `requiredDateText` primitive
- `src/server/app/pages/linear/features/import-reason/controller.js` — the rule now blocks on blank
- `copy/copy.en.js`, `copy/copy.cy.js` — the "Enter an exit date" message
- Unit tests, controller tests and a `.fit.spec.js` covering blank, unreadable and valid input
- `src/server/app/docs/validation.md` — documents the new validator

## Scope

Increment **inc-073**, ticket **EUDPA-487**. Frontend only — the tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
