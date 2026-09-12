## What this changes

A trader who reached **Check your answers** before finishing saw a page that looked finished — no error summary, nothing marked — and **Continue** carried them on to the declaration, where the readiness test finally refused them and bounced them back to this page saying nothing.

Check your answers now shows the incomplete state **on arrival**, and refuses on the spot. Design release 1 heads the page with "There is a problem", names each unfinished section, and does not let the trader go on.

## The change

- **`view-model/incomplete-cards.js`** — new. `REVIEW_CARDS` maps each review card to the task rows it shows and the id the summary links to. Every task row appears exactly once, so "no unfinished card" and `scope.readyForCheckYourAnswers` are the same verdict and cannot drift. `incompleteCardErrors` returns the outstanding cards in page order, `withCardErrors` decorates the built sections with an anchor and a message, `cardAnchorHref` tells a card entry from a party entry.
- **`flow/section-status.js`** — extracts `rowReady` out of `readyForCheckYourAnswers` so the card test applies the same predicate rather than restating it.
- **`controller.js`** — one error summary over both refusals: broken parties first, then unfinished cards in page order. The POST now refuses when the notification is not ready instead of redirecting to the declaration, and re-renders with the summary focused. A submitted notification is read-only and is not refused.
- **`template.njk`** — an inline `govuk-error-message` above an unfinished card's rows; an id and tabindex on each card and section heading so the summary links land; a card with an error routed to the bespoke branch so it can carry one.
- **`_summary-card-error.scss`, `_index.scss`** — the red left bar on a marked card.
- **view-model cards and sections** — an id per card and an anchor per section so the decoration and the summary links can find them. The documents section's anchor is suffixed `documents-section`, because the documents card already owns the `documents` id the summary link points at.
- **`copy.en.js`, `copy.cy.js`** — the summary prefix and one "Complete …" message per card.
- **`check-answers.test.js`, `check-answers.fit.spec.js`** — cover the summary entries and their order, the per-card marking, the POST refusal, and the read-only exemption.

## Scope notes

Blanking the unanswered values rather than printing "Not provided" stays with **inc-152**, which owns that row treatment.

Two exceptions are documented in `incomplete-cards.js` and pinned by tests rather than fixed here, both needing a design ruling first:

1. a dangling party reference names the same fix twice, once specifically and once as its card;
2. an unfinished species state is named in the summary but marks no card — species cards are built per commodity line with no id.

Both are recorded as open questions on the increment.

## Repos

Frontend only. The tests repo was branched for this increment but ended up with no changes, so it has no PR.

Increment: `inc-150`
Ticket: EUDPA-580

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
