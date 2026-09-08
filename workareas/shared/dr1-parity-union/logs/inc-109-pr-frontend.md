## What this changes

The button inside the animal identification record loop read **"Save and add another"** whatever was left to enter — on a line holding a single animal, and on the last outstanding animal of a longer line — so the words never told the person what pressing them would do next.

The card view model now derives the in-card button wording from the line's cap and the records already saved:

- **no in-card button** where the line holds a single animal — the page's own "Save and continue" already captures that record;
- **"Save and finish"** on the last outstanding animal of the line;
- **"Save and add another"** otherwise.

An unanswered count keeps the open wording. The template renders the button only when the view model supplies text for it. The page-level buttons are untouched.

## Files

- `src/server/app/.../animal-identification/card/view-model.js` — derives the button text
- `src/server/app/.../animal-identification/_identification-card.njk` — renders the button only when text is supplied
- `src/server/app/.../animal-identification/animal-identification.controller.test.js` — new controller tests over the three states
- `src/server/app/.../commodities/fit/identification.fit.spec.js` — fit specs extended
- `fit/journey-smoke.fit.spec.js` — smoke spec follows the new wording on its last animal

## Testing

Covered by new controller tests over the three states and by the identification fit specs; the journey smoke spec follows the new wording on its last animal.

## Increment

- Increment: `inc-109`
- Ticket: EUDPA-504

Frontend-only increment: the tests repo was branched but has no commits, so no sibling PR is needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
