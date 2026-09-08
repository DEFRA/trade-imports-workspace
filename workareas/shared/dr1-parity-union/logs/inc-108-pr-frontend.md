## What changed

The identification page was the only journey page whose primary button did not read "Save and continue". It passed an override into the shared `saveActions` macro, giving the button the text "Save and finish" plus a `name`/`value` pair of `action=finish`.

Design release 1 ends this page on the same "Save and continue" as the rest of its journey, doing the same thing: capture the open record and move on. DR1 keeps "Save and finish" for a different job — the in-panel button on the last outstanding animal of a species — so leaving the page-level override in place would put two identically labelled buttons doing different things on the page once inc-109 lands.

- `animal-identification.njk` — the override is gone, so the page takes the shared macro's default in English and Welsh.
- `animal-identification.controller.test.js` — drops the now-absent `action=finish` payload; the post falls through to the save-and-move-on default with no action of its own.
- `identification.fit.spec.js` — targets the shared wording, with a new fit test asserting the page ends on "Save and continue" and shows no "Save and finish".
- `fit/journey-smoke.fit.spec.js`, `fit/live-animals-journey.js` — journey glue follows the shared wording.

## Scope

- Increment: `inc-108`
- Ticket: [EUDPA-502](https://eafleet.atlassian.net/browse/EUDPA-502)
- Repos touched: frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
