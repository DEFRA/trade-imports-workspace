## What this changes

Increment **inc-088** (EUDPA-378) — parity finding against Design release 1, `commodities` slice.

The "Number of animals" box on the consignment-details page was checked for *shape* but never for *presence*. Each commodity line got a single `integerInRange` rule, and that rule's Joi schema puts `.allow('')` ahead of the custom whole-number check — so a blank short-circuits and never reaches the digits test. Typing letters was refused; pressing **Save and continue** with every box empty was accepted and the user moved on to the next page.

The notification was not lost, only postponed. `numberOfAnimals` is a mandatory obligation, and the empty string the page stored reads as blank, so the commodities task row never reached fulfilled, the review section stayed gated and submit refused. The user was stopped — just not at the point of the mistake, and never with a reason.

Design release 1 holds the user on the page until every count is filled in.

## How

- **New validator primitive `requiredIntegerInRange`** (`src/server/app/lib/validate/validators.js`) — a save-blocking whole number within a range. Kept separate from `integerInRange` rather than composed with it, because composing would carry the empty-string allowance onto the required rule. The shared whole-number-in-range check is factored out so both primitives use it.
- **Applied to the animal count**, one rule per commodity line (`.../commodities/consignment-details/fields.js`).
- **Copy**: `Enter the number of animals` added to the commodities English and Welsh copy files, beside the existing whole-number message.
- **Tests updated**: the feature's controller test (which previously asserted that a blank count saved), the consignment-details and identification fit specs, and the shared `fit/live-animals-journey.js` helper, which now has to fill the count.

The page already renders an error summary and per-field errors, so this was a missing rule rather than a missing mechanism.

## Scope

Frontend only. The `trade-imports-animals-tests` repo was branched for this increment but needed no changes, so it has no PR.
