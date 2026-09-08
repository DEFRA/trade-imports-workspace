## What changed

The additional details page asks two questions — "What are the animals certified for?" and "Does the consignment contain any unweaned animals?" — and set both fieldset legends at the small size, `govuk-fieldset__legend--s`. At 19px they were barely larger than the hints and option labels beneath them, so the sixteen certification radios and the two unweaned radios ran together as one long list rather than reading as two separate questions.

Both legends are now `govuk-fieldset__legend--m`, matching Design release 1, which sets the same two legends at the medium size. The page now reads as a heading followed by two questions.

- `src/server/app/sets/live-animals/journeys/linear/features/additional-details/template.njk` — two legend classes raised from `--s` to `--m`.
- `.../additional-details/additional-details.fit.spec.js` — a rendering test asserting the medium size class on both legends. The class is the whole of the behaviour, so it is asserted directly.

## Scope

Increment `inc-112`, ticket EUDPA-494. Frontend only — no backend or tests-repo change, so no merge ordering applies. The tests repo was branched for this increment but ended with nothing to commit.

Travels with `inc-078`, which makes the same change on the origin page; the two are independent and either can land first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
