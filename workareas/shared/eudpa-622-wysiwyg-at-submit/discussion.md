# EUDPA-622 — Spike: how might we ensure WYSIWYG when submitting a notification?

Discussion document for the spike. Not a plan; not a fix — a starting point for the team conversation that closes the spike out with a chosen direction and any follow-on tickets.

The ticket calls the mitigation out as open, listing three candidates and inviting more. This document lays out six, notes what each does and does not cover, and pulls out the one dependency that changes the shape of the conversation: whether the address-book coupling stays or moves to literals.

---

## The problem

The happy path is *Review your answers* → *Continue* → *Declaration* → *Submit*. The Declaration is a legal document. The intent is that the user sees the complete notification on Review before making the legal declaration. Followed strictly, that works. Four subversion scenarios break it:

1. **Address-book edit.** One or more addresses shown on Review are edited in the address book. The declaration still submits, but against text the user never saw.
2. **Other-tab edit.** The user has the notification open in another tab (accidentally or otherwise) and makes a valid amendment after Review has rendered.
3. **URL / back-button / bookmark.** The user subverts the flow between Review and Declaration by any means other than the *Continue* button.
4. **Two users, same notification.** Edits from a second user overlap with submission by the first.

Expected: the user cannot submit a notification whose contents differ from what was shown on Review.
Actual: they can.

---

## Current state (animals frontend)

Findings verified against the repo on 2026-09-30. Plants covered separately at the foot of the document; the material divergences are called out inline.

**Review page controller.** `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` (lines 60–197).

- GET: builds the view-model. For DRAFT/AMEND notifications, addresses go through `partiesForRender()` → `resolveParties()`, which live-queries the address-book service per addressId on every render.
- POST (*Continue*): calls `reviewRefusal()` (line 187) — re-validates scope readiness, outstanding parties, card-level stored errors and document scan status. Refuses and re-renders Review with HTTP 400 if any fail. This is EUDPA-130's AC6 in code.

**Declaration page controller.** `.../features/declaration/controller.js` (lines 55–112).

- POST (*Submit*): calls `isReviewRefused()` (line 76) — same refusal checks as *Continue*. On refusal, redirects back to Review. On pass, commits the declaration, calls `reinflatePartyAnswers()` to resolve party details, `records.replaceFulfilment()`, then `state.submitJourney()` → `records.finalise()`.

**Backend on Submit.** `trade-imports-animals-backend`. `NotificationService.submitNotification()` calls `writeWithOutbox()` → `resolvedForOutbox()` → `consignmentPartyResolver.validatePartiesAtSubmit()` — re-fetches every address from the address book at that moment, inlines the result onto the outbox event. The stored notification keeps only the reference; the event carries the current-at-submit-time copy.

**Concurrency token.** Backend mints one per save. Threaded through hidden fields on Review and Declaration templates. **Only read defensively on *copy* operations** — not checked on Submit.

**Content anchoring.** Nothing today. No hash, no snapshot, no etag, no "as-of" pin threaded through Review → Declaration.

The re-validation added by EUDPA-130 protects against reference values that have gone stale (a commodity code no longer resolving, for instance) but it is not a WYSIWYG check — the *values* the user saw can change and still pass validation.

---

## The address-book coupling question — why it changes this conversation

The team is considering reworking address selection so that the notification takes **literals** at pick time and holds those directly, with no addressId retained. Once literals are captured there is no further relationship between the notification and the address-book record. See EUDPA-294's discussion for the current (reference-only) rationale that this would reverse.

**If the literals rework lands, subversion scenario 1 dissolves at the model level.** Review renders from the notification's own text; the address book cannot mutate what the user saw. EUDPA-622 then only has to protect scenarios 2, 3 and 4.

**If it does not, EUDPA-622 has to defend scenario 1 in-flow** — either by copy-on-attach (in the frontend or backend), by refreshing addresses on Submit and detecting drift, or by a broader content hash that catches address changes as a side-effect.

The rest of this document tags each option with which world it fits.

---

## Mitigation options

Ordered roughly from cheapest to most invasive. None is exclusive; several combine well.

### Option A — Collapse Review and Declaration into one page

Replace the two-step flow with a single page that renders the Review content, the declaration wording, the tick-box and the *Submit* button together.

- Covers scenario 3 (URL/back-button subversion between Review and Declaration — there is no *between* any more).
- Does **not** cover 1, 2 or 4 on its own: the address book can still mutate under the page, another tab can still amend, another user can still edit.
- The Review content is already long. Collapsing adds a scroll to legal-declaration confirmation, which is a content-design call as much as a code one.

**Pointer.** Change entry point: remove the `/declaration` route from `.../features/declaration/index.js` and inline the declaration checkbox + submit into `.../features/check-answers/view.njk`. POST handler on `/check-answers` becomes the combined re-validation + submit.

### Option B — Notification holds its own copy of the addresses

Two flavours, same effect on the WYSIWYG problem:

- **B1: Take literals at attach.** The address rework described above. Notification stores address text directly; no addressId retained.
- **B2: Snapshot on attach.** Notification keeps the addressId **and** stores an inline copy captured at the moment the user picked or edited the address. Review renders from the inline copy. Submit uses the inline copy as the source of truth.

Both cover scenario 1 fully. Neither covers 2, 3, 4 on its own — they need something else (typically E, plus A or C for the URL case).

Trade-offs vs. EUDPA-294's reference-only rationale:
- Storage: an inline copy per party per notification. Small.
- Freshness: intentional loss — the notification will not reflect an address-book edit after attach. That's the point.
- Deletion signalling: no longer needed for display.
- Complexity: B1 removes the resolver path entirely; B2 doubles it (both stored, precedence rules on read).

**Recommendation if this branch is taken:** B1 is the cleaner shape. B2 preserves optionality but hedges on the design question.

**Pointer.** Backend: `ConsignmentParty.java` collapse the reference/inline forms into one shape with only inline fields, drop `addressId`. Frontend: `resolve-parties.js` becomes a no-op; `parties-for-render.js` reads from stored answers uniformly.

### Option C — Content-hash the review, verify at Submit

At Review-render, compute a canonical hash of the resolved answers (everything actually shown to the user, addresses included). Thread the hash through as a hidden field on the Declaration form. On Submit, recompute the hash from the current state; if it differs, refuse the submit and re-show Review with a "the notification has changed since you reviewed it" banner listing what changed.

- Covers all four scenarios uniformly. It is the only single-option answer that does.
- Cheap in code but demands care in *canonical serialisation* — anything the user saw has to be in the hash input in a stable order, or the check produces false negatives (misses drift) or false positives (spurious refusals). Whitespace normalisation of addresses is the most obvious footgun.
- UX design: what to show when the hash mismatches. The ticket poses the same question ("Behaviour when drift is detected — block submit and re-show Review, or something else?"). A diff banner ("The address for consignee has changed. Review the updated notification before submitting.") is stronger than a generic "please review again".

**Pointer.**
- Compute in `.../features/check-answers/controller.js` GET, after the view-model is built. Feed the same view-model shape into a small `canonicalise-and-hash.js`.
- Thread as a hidden field alongside `concurrencyToken` in `.../features/check-answers/view.njk` and forwarded on the Declaration form in `.../features/declaration/view.njk`.
- Verify in `.../features/declaration/controller.js` POST, before `submitJourney()`. On mismatch, redirect to `/check-answers` with a flash key naming the fields that changed.

### Option D — Persisted review snapshot, verified at Submit

At Review-render, persist a snapshot of the resolved view-model to Mongo alongside a fresh UUID (a *review snapshot id*). Thread the UUID through as a hidden field on the Declaration form, the same way Option C threads its hash. On Submit, do two checks:

1. **Snapshot-id identity.** Compare the threaded UUID against the notification's current `latestReviewSnapshotId`. A mismatch means someone else has reviewed this notification since the user did (scenario 4), or the user reached Declaration through a stale form outside the linear flow (scenario 3).
2. **Snapshot content vs current.** Compare the persisted snapshot against the current view-model. Any diff means the content the user reviewed has changed since (scenarios 1, 2).

If both checks pass, the user has demonstrably seen the current notification. If either fails, refuse the submit and re-show Review with per-field guidance drawn from the actual diff ("The consignee's address changed from X to Y", or "Another user has reviewed this notification since you did") — richer than C's banner because the full prior view-model is on the server, not just its hash.

- Covers all four scenarios.
- Unlike E (below), the outbox event is still built from the current-at-submit resolution; the snapshot is used to *gate* submit, not to *replace* the finalisation. Preserves today's "latest at submit" property whenever the checks pass.
- Requires backend schema + API changes: a new `reviewSnapshot` field or sibling collection, a write endpoint on *Continue*, a read on *Submit*.
- Storage: one snapshot document per notification (overwritten on each Review). The QA-only state — no real users, no data to migrate — is what makes this cheap now; the cost calculus would shift once real notifications exist, so worth landing before that transition if this is the chosen path.

**Pointer.**
- Backend (animals): new `POST /notifications/{id}/review-snapshot` endpoint; `NotificationAggregate` gains a `reviewSnapshot: { id, content, at }` field (or sibling collection keyed by notification id).
- Frontend Review POST: after `reviewRefusal()` passes in `.../features/check-answers/controller.js`, call the endpoint, thread the returned UUID onto the Declaration form alongside `concurrencyToken` in `.../features/check-answers/view.njk` and forward it on `.../features/declaration/view.njk`.
- Frontend Declaration POST: after `isReviewRefused()` passes in `.../features/declaration/controller.js`, read `payload.reviewSnapshotId`, fetch the notification's stored snapshot, run both checks. On mismatch, redirect to `/check-answers` with a flash payload listing the field-level diffs.

### Option E — Server-side "reviewed snapshot" as source of truth

On *Continue* from Review, the backend persists a snapshot of the resolved answers to a per-notification `reviewedContent` document (Mongo). The Declaration page renders from that snapshot. On Submit, the snapshot is what gets finalised (the outbox event is built from it) — the backend does not re-resolve at Submit.

- Covers all four scenarios.
- Server-authoritative WYSIWYG: the finalised notification *is* what was reviewed, not a re-resolution of it.
- Larger change than D: new backend endpoint, new schema, new failure mode ("your Review has expired, please review again"), and the frontend has to make a call on *Continue* that today is client-side only.
- Loses the current property that the outbox event always carries the latest resolved address at the moment of submit. That is either a bug (this ticket) or a feature (fresh legal record); the team should decide which.

**Pointer.** New `POST /notifications/{id}/reviewed-snapshot` on the animals backend. Called from `.../features/check-answers/controller.js` POST after `reviewRefusal()` passes and before redirecting to Declaration. Read back in Declaration GET. Consumed by `submitNotification()` instead of `resolvedForOutbox()`.

### Option F — Use the existing concurrency token defensively on Submit

The concurrency token is already threaded through Review and Declaration hidden fields. Change the Submit POST handler to compare the token in the payload against the current notification's token and refuse if they differ.

- Covers scenarios 2 and 4 (any edit through the app increments the token).
- Does **not** cover 1 (address-book edits don't touch the notification, so the token doesn't change) or 3 (URL subversion doesn't imply a mismatched token — the user's original Review page's token may still match).
- Almost no code change. Backend already exposes the token per save. Frontend already reads it into the form.

**Pointer.** `.../features/declaration/controller.js` POST — after `isReviewRefused()` passes, read `payload.concurrencyToken`, fetch the current record's token, refuse with a redirect + flash on mismatch.

---

## Scenario-coverage matrix

Y = covers directly. P = partial (edge cases remain). — = does not cover.
For the *Explains what changed* column: Y = field-level detail (which field, old vs. new value); P = generic notification only ("content changed" or "another user edited this"); — = no guidance path.

| Option                                              | 1. Address-book edit | 2. Other-tab edit | 3. URL subversion | 4. Two users | Explains what changed | Cost |
|-----------------------------------------------------|----------------------| ----------------- | ----------------- | ------------ |-----------------------| ---- |
| A. Collapse Review + Declaration                    | —                    | —                 | Y                 | —            | —                     | S    |
| B1. Take literals (address rework)                  | Y                    | —                 | —                 | —            | —                     | L    |
| B2. Snapshot address on attach                      | Y                    | —                 | —                 | —            | —                     | M    |
| C. Content hash Review → Submit                     | Y                    | Y                 | Y                 | Y            | Partial               | M    |
| D. Persisted snapshot + id, verified at Submit      | Y                    | Y                 | Y                 | Y            | Full                  | M–L  |
| E. Server-side reviewed snapshot as source of truth | Y                    | Y                 | Y                 | Y            | —                     | L    |
| F. Concurrency token check on Submit                | —                    | Y                 | —                 | Y            | Partial               | XS   |

Useful combinations:

- **A + F**: cheap; catches 2/3/4; misses 1. Fine if B1 is landing separately.
- **B1 + F**: covers 1 via the model change; 2/4 via the token; still misses 3 (but 3 is the least likely accidental subversion).
- **C alone**: single lever, all four scenarios. Requires care in canonical hashing and drift-UX.
- **D alone**: same coverage as C, but the drift-detection UX can be field-level (naming what changed) rather than a generic banner, because the prior view-model is persisted and diffable. Costs a small backend schema + API change.

---

## Recommendation to take into refinement

Not a decision, a starting position.

- If **B1 (literals)** is on the near roadmap: pair it with **F** (concurrency token) here. Two small pieces of defensive code plus the model change; leaves only scenario 3 uncovered, and the team can decide whether a scenario-3 mitigation (A, or a smaller lightweight guard) is worth it.
- If B1 is **not** on the near roadmap: **C** (content hash) is the cheapest single-option answer that covers all four. It stands alone, doesn't depend on the address-model conversation, and lands within the two existing pages. The UX for drift-detected is the design question worth spending refinement time on, not the code.
- If the team wants **field-level** drift guidance rather than a generic "something changed" banner — because the legal-declaration framing makes it important that the user is told *what* diverged — **D** buys that at the cost of a small backend schema + endpoint. Cheap now (QA-only, no data migration); would need landing before real notifications exist to stay cheap.

E remains the biggest change and is only strictly necessary if the team both rejects B1/C/D and wants the finalised outbox event to be built from the snapshot rather than the current-at-submit resolution.

---

## Plants — follow-up note

Not scoped in the outline diffs above; needs a matching pass. Two divergences to note now:

- **Plants does not re-validate on Submit.** `.../trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/declaration/controller.js` (POST, lines 66–109) calls `submitJourney()` directly without an `isReviewRefused()`-equivalent. Any option chosen for animals should be landed for plants too, or plants remains exposed even to the EUDPA-130-style stale-reference case.
- **Plants POST on Continue skips document scan-status checks** (`.../check-answers/controller.js` lines 104–110) because plants doesn't have the documents feature in the same shape. Not directly a WYSIWYG concern, but worth flagging as part of a plants pass on the ticket.

If C (content hash) is chosen, the hashing helper should live in a shared spot (or be duplicated with the same canonicalisation) so plants and animals agree on what a canonical view-model looks like.

---

## Open questions for refinement

Restating the ticket's own list, plus what's surfaced above:

1. Is the address-book literals rework in or out of the near-term picture? This directly changes which mitigation is cheapest.
2. Which subversion scenarios are in scope for EUDPA-622? All four, or explicitly accept some (URL subversion, most obviously).
3. Which mitigation, or which combination? A+E, B1+E, or C are the three clean starting points.
4. On drift detection: block Submit and re-show Review with a diff, or something else (auto-refresh, silent re-resolve, prompt with per-field acknowledgement)?
5. Does the answer apply identically to plants and animals, or diverge?
6. Do we want the finalised notification (outbox event) to reflect **what was reviewed** or **the latest resolution at the moment of submit**? Today it's the latter. Options C and D make it the former. The team should call this out explicitly — it's a legal-record question as much as a technical one.
