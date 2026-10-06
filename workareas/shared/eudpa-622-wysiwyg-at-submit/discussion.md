# EUDPA-622 — Spike: how might we ensure WYSIWYG when submitting a notification?

Discussion document for the spike. Not a plan; not a fix — a starting point for the team conversation that closes the spike out with a chosen direction and any follow-on tickets.

The ticket calls the mitigation out as open, listing three candidates and inviting more. This document lays out six and notes what each does and does not cover.

---

## The problem

The happy path is *Review your answers* → *Continue* → *Declaration* → *Submit*. The Declaration is a legal document. The intent is that the user sees the complete notification on Review before making the legal declaration. Followed strictly, that works. Three subversion scenarios break it:

1. **Other-tab edit.** The user has the notification open in another tab (accidentally or otherwise) and makes a valid amendment after Review has rendered.
2. **URL / back-button / bookmark.** The user subverts the flow between Review and Declaration by any means other than the *Continue* button.
3. **Two users, same notification.** Edits from a second user overlap with submission by the first.

Expected: the user cannot submit a notification whose contents differ from what was shown on Review.
Actual: they can.

Notifications copy address literals from the address book at pick time (decided 2026-10-02), so an address-book edit cannot change what Review showed, and an address edit within the notification is an ordinary notification save like any other answer.

---

## Current state (animals frontend)

Findings verified against the repo on 2026-09-30. Plants covered separately at the foot of the document; the material divergences are called out inline.

**Review page controller.** `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` (lines 60–197).

- GET: builds the view-model from the notification's answers.
- POST (*Continue*): calls `reviewRefusal()` (line 187) — re-validates scope readiness, outstanding parties, card-level stored errors and document scan status. Refuses and re-renders Review with HTTP 400 if any fail. This is EUDPA-130's AC6 in code.

**Declaration page controller.** `.../features/declaration/controller.js` (lines 55–112).

- POST (*Submit*): calls `isReviewRefused()` (line 76) — same refusal checks as *Continue*. On refusal, redirects back to Review. On pass, commits the declaration, `records.replaceFulfilment()`, then `state.submitJourney()` → `records.finalise()`.

**Concurrency token.** Backend mints one per save. Rendered as a hidden field on the Review and Declaration forms — but each page reads the *current* token when it renders (`kit.base()` → `journey.concurrencyToken`); Declaration does not carry forward the token Review was rendered with. **Only read defensively on *copy* operations** — not checked on Continue or Submit.

Verified 2026-10-06, relevant to Option E:

- The token is a Spring Data `@Version` field on `NotificationAggregate` (animals and plants backends). A notification PUT carrying a stale token is refused atomically with a 409 (`OptimisticLockingFailureException`).
- The frontend's save (`replaceJourneyFulfilment`, `engine/journey.js`) sends the token loaded earlier in the *same request* in preference to `payload.concurrencyToken`, so the backend's check only guards the milliseconds between load and save, not the time since the page rendered.
- Submit is two backend calls: the declaration save (a version-checked PUT that moves the token on) then `POST /notifications/{id}/submit`, which takes no token. An edit landing between the two is finalised unchecked.
- Accompanying-document details shown on Review come from `answers.documents`, stored on the notification, so a document add/remove moves the token. Scan status lives elsewhere but is re-checked by `reviewRefusal()` on Continue and Submit.

**Content anchoring.** Nothing today. No hash, no snapshot, no etag, no "as-of" pin threaded through Review → Declaration.

The re-validation added by EUDPA-130 protects against reference values that have gone stale (a commodity code no longer resolving, for instance) but it is not a WYSIWYG check — the *values* the user saw can change and still pass validation.

---

## Mitigation options

Ordered roughly from cheapest to most invasive. None is exclusive; several combine well.

### Option A — Collapse Review and Declaration into one page

Replace the two-step flow with a single page that renders the Review content, the declaration wording, the tick-box and the *Submit* button together.

- Covers scenario 2 (URL/back-button subversion between Review and Declaration — there is no *between* any more).
- Does **not** cover 1 or 3 on its own: another tab can still amend, another user can still edit.
- The Review content is already long. Collapsing adds a scroll to legal-declaration confirmation, which is a content-design call as much as a code one.

**Pointer.** Change entry point: remove the `/declaration` route from `.../features/declaration/index.js` and inline the declaration checkbox + submit into `.../features/check-answers/view.njk`. POST handler on `/check-answers` becomes the combined re-validation + submit.

### Option B — Content-hash the review, verify at Submit

At Review-render, compute a canonical hash of the answers (everything actually shown to the user). Thread the hash through as a hidden field on the Declaration form. On Submit, recompute the hash from the current state; if it differs, refuse the submit and re-show Review with a "the notification has changed since you reviewed it" banner.

- Covers all three scenarios uniformly.
- Cheap in code but demands care in *canonical serialisation* — anything the user saw has to be in the hash input in a stable order, or the check produces false negatives (misses drift) or false positives (spurious refusals).
- UX design: what to show when the hash mismatches. The ticket poses the same question ("Behaviour when drift is detected — block submit and re-show Review, or something else?"). A hash says *that* something changed, not *what*, so the message is generic unless paired with something that keeps the prior content (Option C).

**Pointer.**
- Compute in `.../features/check-answers/controller.js` GET, after the view-model is built. Feed the same view-model shape into a small `canonicalise-and-hash.js`.
- Thread as a hidden field alongside `concurrencyToken` in `.../features/check-answers/view.njk` and forwarded on the Declaration form in `.../features/declaration/view.njk`.
- Verify in `.../features/declaration/controller.js` POST, before `submitJourney()`. On mismatch, redirect to `/check-answers` with a flash message.

### Option C — Persisted review snapshot, verified at Submit

At Review-render, persist a snapshot of the view-model to Mongo alongside a fresh UUID (a *review snapshot id*). Thread the UUID through as a hidden field on the Declaration form, the same way Option B threads its hash. On Submit, do two checks:

1. **Snapshot-id identity.** Compare the threaded UUID against the notification's current `latestReviewSnapshotId`. A mismatch means someone else has reviewed this notification since the user did (scenario 3), or the user reached Declaration through a stale form outside the linear flow (scenario 2).
2. **Snapshot content vs current.** Compare the persisted snapshot against the current view-model. Any diff means the content the user reviewed has changed since (scenario 1, or 3 where the second user has not reviewed).

If both checks pass, the user has demonstrably seen the current notification. If either fails, refuse the submit and re-show Review with per-field guidance drawn from the actual diff ("The consignee's address changed from X to Y", or "Another user has reviewed this notification since you did") — richer than B's banner because the full prior view-model is on the server, not just its hash.

- Covers all three scenarios.
- Unlike D (below), the outbox event is still built from the notification as stored; the snapshot is used to *gate* submit, not to *replace* the finalisation. When the checks pass, the two are the same content anyway.
- Requires backend schema + API changes: a new `reviewSnapshot` field or sibling collection, a write endpoint on *Continue*, a read on *Submit*.
- Storage: one snapshot document per notification (overwritten on each Review). The QA-only state — no real users, no data to migrate — is what makes this cheap now; the cost calculus would shift once real notifications exist, so worth landing before that transition if this is the chosen path.

**Pointer.**
- Backend (animals): new `POST /notifications/{id}/review-snapshot` endpoint; `NotificationAggregate` gains a `reviewSnapshot: { id, content, at }` field (or sibling collection keyed by notification id).
- Frontend Review POST: after `reviewRefusal()` passes in `.../features/check-answers/controller.js`, call the endpoint, thread the returned UUID onto the Declaration form alongside `concurrencyToken` in `.../features/check-answers/view.njk` and forward it on `.../features/declaration/view.njk`.
- Frontend Declaration POST: after `isReviewRefused()` passes in `.../features/declaration/controller.js`, read `payload.reviewSnapshotId`, fetch the notification's stored snapshot, run both checks. On mismatch, redirect to `/check-answers` with a flash payload listing the field-level diffs.

### Option D — Server-side "reviewed snapshot" as source of truth

On *Continue* from Review, the backend persists a snapshot of the answers to a per-notification `reviewedContent` document (Mongo). The Declaration page renders from that snapshot. On Submit, the snapshot is what gets finalised (the outbox event is built from it).

- Covers 1 and 3 by construction — later edits are simply not what gets finalised. Covers 2 only if Submit refuses when no snapshot was taken by this session.
- Server-authoritative WYSIWYG: the finalised notification *is* what was reviewed.
- Larger change than C: new backend endpoint, new schema, new failure mode ("your Review has expired, please review again"), and the frontend has to make a call on *Continue* that today is client-side only.
- C gets the same guarantee by gating submit, without replacing the finalisation path. Worse, D silently submits the reviewed content over a later edit from another tab or user, discarding that edit without telling anyone.

**Pointer.** New `POST /notifications/{id}/reviewed-snapshot` on the animals backend. Called from `.../features/check-answers/controller.js` POST after `reviewRefusal()` passes and before redirecting to Declaration. Read back in Declaration GET. Consumed by `submitNotification()` in place of the stored notification.

### Option E — One concurrency token from Review to Submit, with Declaration reachable only from Review

The concurrency token is already a hidden field on both the Review and Declaration forms. Option E chains a single token — the one Review was rendered with, call it *T* — from Review through to the final save, and makes Declaration impossible to reach any other way.

**Token-only variant (the weak form).** Compare the posted token against the current one on *Continue* and on *Submit*, leaving the pages as they are. Covers 1 and 3, but **not** 2: a user who reaches Declaration by back button, bookmark or typed URL gets a Declaration rendered with the *current* token, so Submit matches. The token proves *nothing changed since this page rendered*, not *the user saw Review for this content*. The rest of this section is the strong form, which closes that gap.

**Declaration only reachable from Review.**

- **Review's form posts to `/declaration`** (change its `action`), not to `/check-answers`.
- **`GET /declaration` redirects to `/check-answers`.** A bookmark or typed URL cannot show Declaration.
- **`POST /declaration` handles two submissions**, told apart by a hidden `step` field. A marker is needed because an unticked checkbox posts nothing, so a Submit without the tick would otherwise look like a Continue from Review.

| From | Posted | Handler |
|---|---|---|
| Review's *Continue* | `step=review`, token T | 1. T must equal the current token — else redirect to `/check-answers` with "this notification has changed since you viewed it". 2. `reviewRefusal()` must pass — else redirect to `/check-answers`. 3. Render Declaration with **T** in its hidden field. |
| Declaration's *Submit* | `step=declare`, token T, tick box | 1. Tick box missing: re-render Declaration with **T** and the error. 2. `reviewRefusal()`, as today. 3. Save the declaration **conditionally at T**, then submit, with no gap between the two (see the backend pointer). A 409 means the notification changed since Review — back to Review with the "changed" message. |

- **Declaration is the exception to "render the current token".** Every other page renders the current token via `kit.base()`. Declaration always renders the *posted* T — on first render, on the tick-box error and on the save-failure page — or the chain breaks.
- **The address bar stays honest.** Declaration shows at `/declaration` (title, analytics, back link consistent), rather than being rendered from `POST /check-answers` with `/check-answers` in the address bar.
- **Refresh and back button are harmless.** Refresh asks to resubmit and re-posts `step=review` with T, which goes through the same checks. A cached Declaration still holds T, so its Submit is refused if anything has changed.
- **The final save closes the last-millisecond race.** The declaration save is version-checked against T by the backend, so the notification and its fulfilments are finalised exactly as Review showed them, or not at all.

**Coverage.**

- Covers scenarios 1 and 3: any edit through the app moves the token — address edits and document adds/removes included.
- Covers scenario 2 for back button, bookmark, typed URL and stale tabs.
- Generic guidance only ("this notification has changed since you viewed it") — the token says *that* something changed, not *what*.

**Remaining gap — a hand-crafted POST.** Every journey page carries the current token, so someone could copy it from another page and post `step=review` to `/declaration` with browser developer tools, reaching Declaration without opening Review. This needs deliberate effort by the user, against their own declaration. Option B has the same weakness (its hash is deterministic). If the team wants it closed, an **optional session guard**:

1. `GET /check-answers`, when rendering an editable Review, records `reviewedAt[journeyId] = T` in the server-side `@hapi/yar` session (same pattern as the existing per-notification `openingRun` map). No other page writes it.
2. Both `POST /declaration` steps additionally require the posted T to equal `reviewedAt[journeyId]`.
3. A successful submit clears the entry.

A match then proves *this browser rendered Review for exactly this content*. The posted token is still needed alongside it: Review in tab A (session = T), edit in tab B (T+1), Review in tab B (session = T+1), Submit in tab A — the session matches current, but tab A's form says T, so it is rightly refused.

**Pointer.**

- Frontend (animals, then plants):
  - `.../features/check-answers/view.njk` — form `action` to the declaration path, add `step=review`.
  - `.../features/declaration/index.js` / `controller.js` — GET redirects to Review; POST branches on `step`; every render uses `payload.concurrencyToken`, not `kit.base()`'s.
  - The declaration save passes the posted token as `known` instead of the in-request one (`replaceJourneyFulfilment`, `engine/journey.js`).
  - Review GET must surface the "still scanning" document error (today it computes only "rejected", `check-answers/controller.js` line 168), since a refused Continue now redirects to Review instead of re-rendering it.
  - `POST /check-answers` removed, or kept as a redirect for a stale open tab.
- Backend (animals and plants): close the gap between the declaration save and `/submit` — either `POST /{id}/submit?concurrencyToken=` with the same check `/copy` already does, or (better) one call that writes the declaration and submits at T.

### Option F — Lock the notification on *Continue* from Review

On *Continue* from Review, the backend transitions the notification into a locked state (the same mechanism Submit uses today, pulled earlier in the flow). Edits refuse while locked. Submission from Declaration proceeds against the locked state. On successful Submit the state remains terminal as today; on abandonment the notification needs to return to an editable state.

Prevention rather than detection — the drift the other options catch simply can't happen within the locked window.

- Covers scenario 1 (other tab's amend refuses) and scenario 3 (second user's edits refuse) by prevention.
- Covers scenario 2 only if Submit *also* refuses when the notification isn't locked by the submitting session; otherwise URL subversion into Declaration can still proceed against an unlocked notification.
- The hard part is unlock:
  - Successful Submit → terminal, as today.
  - Explicit back/cancel → unlock cleanly.
  - Session timeout, tab close, browser crash → no reliable client-side signal. The lock has to self-expire after some window, which just relocates the drift problem to the moment of expiry — if the user's Declaration page is still open past timeout, nothing stops the notification being edited before they Submit, and we are back to needing B/C-style detection to catch it.
  - Second user arrives mid-lock → wait, forced takeover, admin-only unlock, or an informational "locked by X" message? Each has a UX cost the design has to carry.
- Lock ownership (session, user, or both) has to be tracked so a different session cannot inadvertently release a lock it didn't acquire.

Why this likely ends up a partial answer: by itself it makes scenario 2 contingent on Submit-side enforcement; the lock-expiry edge pushes it back toward one of the detection options. As a *supplement* it closes the window during which detection has to work, which can simplify the UX of the chosen detection option.

**Pointer.** Backend: extend `NotificationService` with `lockForReview(notificationId, sessionId)` / `unlockFromReview(notificationId, sessionId)`; `NotificationAggregate` gains `reviewLock: { ownerSessionId, acquiredAt, expiresAt }`. Guard every write path against an active lock not held by the caller. Frontend: call `lockForReview()` in `.../features/check-answers/controller.js` POST after `reviewRefusal()` passes; call `unlockFromReview()` on explicit navigation off Declaration that isn't Submit (Back especially).

---

## Scenario-coverage matrix

| Option                                              | 1. Other-tab edit | 2. URL subversion | 3. Two users | Explains what changed | Cost |
|-----------------------------------------------------|-------------------|-------------------|--------------|-----------------------|------|
| A. Collapse Review + Declaration                    | —                 | Y                 | —            | —                     | S    |
| B. Content hash Review → Submit                     | Y                 | Y                 | Y            | Partial               | M    |
| C. Persisted snapshot + id, verified at Submit      | Y                 | Y                 | Y            | Full                  | M–L  |
| D. Server-side reviewed snapshot as source of truth | Y                 | Partial           | Y            | —                     | L    |
| E. Token check only (weak form, pages unchanged)    | Y                 | —                 | Y            | Partial               | XS   |
| E. One token, Declaration only via Review (strong)  | Y                 | Y                 | Y            | Partial               | S    |
| F. Lock notification on *Continue*                  | Y                 | Partial           | Y            | —                     | M    |

For the *Explains what changed* column: Partial means we can display just generic guidance ("content changed" or "another user edited this"); — = no guidance path (either drift is not detected, or the option's design means no drift is possible in the first place).

Useful combinations:

- **E (strong form) alone**: small frontend change plus a small backend one; covers all three with generic guidance; keeps the two pages. Optional session guard if a deliberately hand-crafted POST must be stopped too.
- **A + E (weak form)**: also covers all three with generic guidance, but carries the content-design cost of a long page ending in a legal declaration. E's strong form gets the same coverage without it.
- **B alone**: single lever, covers all three. Requires care in canonical hashing and drift-UX. Adds nothing over E's strong form — same coverage, same generic guidance, same hand-crafted-POST weakness — at more cost.
- **C alone**: same coverage as B, but the drift-detection UX can be field-level (naming what changed) rather than a generic banner, because the prior view-model is persisted and diffable. Costs a small backend schema + API change.
- **F + B** or **F + C**: lock during the Review → Submit window to shrink the detection surface, with hash or snapshot as a safety net around lock expiry. Buys prevention *and* detection at the cost of carrying both mechanisms and their failure modes — hard to justify when E already covers 1 and 3 by detection.

---

## Recommendation to take into refinement

Not a decision, a starting position.

- **E in its strong form**, in both animals and plants: one token from Review to Submit, Declaration reachable only by posting from Review, and the final save conditional on that token. Covers all three scenarios with generic guidance, keeps the two pages, and builds on the `@Version` check the backend already has. A and B are not needed.
- **Decide on the session guard.** It closes only a deliberately hand-crafted POST by the user against their own declaration. A small change, but optional — accept the gap or add the guard.
- **Choose C instead only if** the team wants **field-level** drift guidance ("the consignee's address changed from X to Y") rather than a generic "something changed" banner, because the legal-declaration framing makes it important that the user is told *what* diverged. Cheap now (QA-only, no data migration); would need landing before real notifications exist to stay cheap.

Not recommended: **D** (silently discards later edits, for a guarantee C gets by gating) and **F** (lock lifecycle cost for coverage E already gives).

---

## Plants — follow-up note

Not scoped in the outline diffs above; needs a matching pass. Two divergences to note now:

- **Plants does not re-validate on Submit.** `.../trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/declaration/controller.js` (POST, lines 66–109) calls `submitJourney()` directly without an `isReviewRefused()`-equivalent. Any option chosen for animals should be landed for plants too, or plants remains exposed even to the EUDPA-130-style stale-reference case. E slots in the same way: the plants backend has the same `@Version` token and the same token-less `/submit` endpoint.
- **Plants POST on Continue skips document scan-status checks** (`.../check-answers/controller.js` lines 104–110) because plants doesn't have the documents feature in the same shape. Not directly a WYSIWYG concern, but worth flagging as part of a plants pass on the ticket.

If B (content hash) is chosen, the hashing helper should live in a shared spot (or be duplicated with the same canonicalisation) so plants and animals agree on what a canonical view-model looks like.

---

## Open questions for refinement

Restating the ticket's own list, plus what's surfaced above:

1. Is E's strong form (one token, Declaration only via Review) the chosen mitigation, or does the team want C's field-level guidance?
2. Session guard: add it, or accept that a user could deliberately hand-craft a POST to skip Review?
3. On drift detection: block Submit and re-show Review with a generic message, with a field-level diff (C), or something else (prompt with per-field acknowledgement)? What exactly should the "changed since you viewed it" message say?
4. Backend: token on `/submit`, or a single declare-and-submit call?
5. Does the answer apply identically to plants and animals? (Recommendation: yes — including closing plants' missing re-validation on Submit.)
