# EUDPA-295 redirect — extend the inline pattern to all six party roles

Working plan for a change to the `feature/EUDPA-295-freeze-address-on-submit`
branch across all three repos.

## Goal

Deliver the same user-visible behaviour EUDPA-295 already delivers — a
SUBMITTED notification renders the addresses as they were at submit,
regardless of any address-book edit since, while DRAFT and AMEND
reflect live edits — without adding a typed `FrozenParties` field to the
opaque `NotificationFulfilmentsView`. Restore the view's pattern: typed
scalars + opaque `Document` payload. Do it by extending the workspace's
existing inline pattern from main (`placeOfOrigin`, `consignment`) to
all six party roles, and layering a **status-gated read** the branch
did not have.

## Why

Currently on the branch, `NotificationFulfilmentsView` mixes the opaque 
`List<Document> fulfilments` payload with a structured six-field 
`FrozenParties` nested projection. The JavaDoc concedes the tension. 
The frozen details are better expressed as an extension of an idiom 
already in the codebase.

Main resolved "some addresses must not live-update after they've been
picked" with the inline pattern — the answer for an `inline: true`
party carries the address details alongside the `addressId`, and every
reader treats those details as authoritative. What main lacked was a way
for the *same* party to live-update during DRAFT and freeze after
SUBMIT. This proposal adds it: **stored inline details are consumed by
the read only when the notification is SUBMITTED**; DRAFT and AMEND
ignore the stored details and live-resolve as they do on the branch
today.

## Current state (on the branch)

**Backend ingest.** Commit `1ae64da` flipped `placeOfOrigin` and
`consignment` from `ConsignmentParty.inlineOnly(...)` to
`ConsignmentParty.forStorage(...)`, unifying all six party roles under
one storage pattern: reference-only + freeze-at-submit via a sidecar.

**Backend freeze.** `NotificationAggregate.submittedNotificationBaseline`
(a full `Notification`, `@JsonIgnore`) is populated at every submit
from `resolvedForOutbox`'s fully-resolved copy, retained through amend,
restored on cancel-amend (with the restored party fields re-normalised
to `forStorage`), and kept past the cancel because it is the read
source for SUBMITTED.

**Backend fulfilments view.** `NotificationFulfilmentsView.FrozenParties`
exposes the baseline's six party fields as typed getters. Removed by
this work.

**Backend dashboard view.** `NotificationView.forDashboard()` also
reads the baseline. Attic — retires with the dashboard endpoint,
untouched here.

**Backend outbox.** Every non-cancel event emits a fully-resolved
notification copy via `ConsignmentPartyResolver.resolveForSubmission`
(strict resolve — throws on missing address-book records). Cancel-amend
event body comes from `submittedNotificationBaseline` directly.

**Frontend.** `marshal/document.js` lifts
`document.submittedNotificationBaseline` into `journey.frozenParties`
for SUBMITTED. Two controllers gate on it. Party pickers write
`{ addressId }` for every role (no inline).

## Proposed state

**Ingest.** Backend accepts inflated party payloads on every PUT — drop
the `forStorage(...)` normalisation at ingest. Persisted top-level
`notification.<role>` fields carry whatever the frontend sent: usually
`{ addressId, name, address, phone?, email? }`.

**Freeze source.** Top-level `notification.<role>` fields ARE the freeze.
No sidecar exposure on any view. The frontend inflates on every PUT
that carries party answers, then does a **pre-submit re-inflate PUT**
right before POST `/submit` so the persisted values reflect a resolve
close to the submit moment.

**Read gate keyed on status.** Frontend renders SUBMITTED from the
stored inline details on the answer. DRAFT and AMEND live-resolve via
address book from the `addressId` and ignore any stored inline details
that might be present. Live-update semantics for draft and amend are
identical to today.

**View surface.** `NotificationFulfilmentsView` returns to opaque-only —
opaque `List<Document> fulfilments` payload plus the same typed
scalars. `getSubmittedNotificationBaseline()` and the nested
`FrozenParties` interface are deleted. No new view or endpoint.

**Amend snapshot.** The existing `NotificationAggregate.submittedNotificationBaseline`
field is **rescoped** and **renamed** to amend-scope — same lifecycle
as `submittedFulfilmentsBaseline`. Set on amend start (deep-clone of
the SUBMITTED notification content, inline details and all); cleared
on submit-from-amend and on cancel-amend after the restore. Cancel-
amend event body reads the field before it clears (unchanged
behaviour, different lifecycle).

**Outbox events.** Unchanged in content. Sourced from the top-level
notification fields, which now carry the inline details the frontend
supplied. `resolveForSubmission` becomes optional — see Gap 2 below.

## Gap 2 — strict-resolve at submit: what to do

`ConsignmentPartyResolver.resolveForSubmission` does two things today:

1. **Resolves** references to full details so `forOutbox.getNotification()`
   can carry them on the outbox event body.
2. **Validates** — throws on a nameless party or a missing / soft-
   deleted address-book record. A belt-and-braces guard that the
   submitted notification is coherent regardless of what the frontend
   sent.

Under this proposal, (1) is unnecessary: the frontend has already
inflated the details, and the outbox reads them directly from the top-
level fields. (2) is a **choice**.

**Option A — keep (2) as validation-only.** Backend still calls the
address book for each party at submit, still throws on 404, but
discards the resolved payload. Same HTTP-call profile as today, same
atomicity story (inside the outbox lock), same safety net. Costs one
extra round-trip at submit that the frontend already just made.

**Option B — drop (2), trust the frontend.** Backend does structural
validation only ("name and address non-null"). One fewer HTTP call at
submit. Loses the belt-and-braces catch for a frontend bug that
somehow submits a party whose `addressId` no longer resolves.

**Recommendation: A.**

The safety-net cost is low. `resolveForSubmission` is already there,
already inside the outbox lock, already tested. It just needs its
result discarded rather than copied onto anything. The alternative
concentrates the "no broken parties" invariant on the frontend alone,
where the picker's outstanding-party check already catches this class
of bug — but that check runs pre-submit; it can miss an
address-book edit that lands *between* the check and the submit
transition. Two guards are cheap here; one is fine but not clearly
better. Prefer the belt-and-braces.

Concretely: rename the method to something honest (`validatePartiesAtSubmit`
or similar), keep its throwing behaviour, drop its return value and
the callers that consume the resolved copy.

## Backend changes

1. **Ingest.** In `NotificationService` (the setter path for
   `dto.getPlaceOfOrigin()` etc. around line 550), remove the six
   `ConsignmentParty.forStorage(...)` and `inlineOnly(...)` calls —
   persist `dto.getXxx()` directly. Backend now stores whatever the
   frontend sends, inline or reference, byte-faithfully.
2. **`ConsignmentParty.forStorage` and `inlineOnly`.** Retain as
   helpers if other code paths still call them; otherwise delete.
   Expected: `forStorage` becomes orphaned and deletes;
   `inlineOnly` may survive if `NotificationView.forDashboard()`
   still uses it (it does today — leave it and let the dashboard
   retire tick this off later).
3. **Rescope `NotificationAggregate.submittedNotificationBaseline`.**
   Rename to `preAmendNotification`. Change lifecycle: populated on
   amend start (deep-clone of `notification`); cleared on submit-from-
   amend and on cancel-amend after the restore. Same amend-scoped
   pattern as `submittedFulfilmentsBaseline`. JavaDoc updates to
   match.
4. **`NotificationService.transitionStatus`.** Delete the
   `notificationContentMapper.deepClone(forOutbox.getNotification())`
   freeze write — the top-level fields already carry what the freeze
   used to. Retain the amend-flow clear of the (renamed) field.
5. **`NotificationService.amendNotification`.** Populate
   `preAmendNotification` here (deep-clone `notification`) alongside
   the existing `submittedFulfilmentsBaseline` capture.
6. **`NotificationService.cancelAmendNotification`.** Restore
   `notification` from `preAmendNotification` instead of
   `submittedNotificationBaseline`. Drop the six
   `ConsignmentParty.forStorage(...)` normalisations of the restored
   fields — the snapshot already carries inline details and we no
   longer strip them. Clear `preAmendNotification` after the restore.
7. **`NotificationService.resolvedForOutbox`.**
   - Non-cancel branches: instead of `resolveForSubmission`
     mutating a resolved copy, either delete the resolve step and
     use the notification as-is (fields already carry inline), or
     keep the resolve for validation-only per Gap 2 Option A. Under
     the recommendation, keep it as validation-only — call, throw on
     failure, use the notification as-is for the event body.
   - Cancel-amend branch: read from `preAmendNotification` (rename)
     in place of `submittedNotificationBaseline`. Same source, new
     field name.
8. **`ConsignmentPartyResolver.resolveForSubmission`.** Rename to
   reflect its validation-only role — `validatePartiesAtSubmit(...)`.
   Keep the "throw on missing / soft-deleted" behaviour. Drop the
   mutation of the notification copy (or leave the mutation and let
   the caller ignore it — cleaner to strip).
9. **`ConsignmentPartyResolver.resolveForDraft`.** Draft events also
   used to fill in inline details for the outbox event body via
   best-effort resolution. Under the proposal, drafts already have
   inline details on the top-level fields (from every draft PUT), so
   the resolver becomes redundant here too. Delete or convert to a
   no-op.
10. **`NotificationFulfilmentsView`.** Delete
    `getSubmittedNotificationBaseline()` and the nested `FrozenParties`
    interface. JavaDoc reverts to naming
    `submittedFulfilmentsBaseline`, `submittedNotificationBaseline`
    (or its renamed successor), and `expireAt` as server-only fields
    intentionally omitted.
11. **`NotificationView.forDashboard()`.** No change here. Retires
    with the dashboard endpoint on a separate ticket. `inlineOnly`
    stays live until then.
12. **Tests.**
    - `NotificationServiceTest.java:700` and
      `NotificationControllerTest.java:901` — delete
      (they stub `FrozenParties`).
    - `NotificationServiceTest` freeze cases — flip from asserting on
      `submittedNotificationBaseline` presence at submit to asserting
      on `preAmendNotification` presence at amend start / clear at
      submit-from-amend and cancel.
    - `ConsignmentPartyResolverTest` — retain the throw-on-missing
      cases; drop assertions that inline details were copied onto
      the notification.
    - `NotificationIT` — the twelve `submittedNotificationBaseline`
      assertions rename to `preAmendNotification` and reshape
      per the new lifecycle (populated at amend, not at submit).

## Frontend changes

13. **Party pickers write inline shape for all six.** In
    `party-picker/selection.js`, generalise `answerFor` so every
    party role captures `{ addressId, name, address, phone?, email? }`
    at pick time — the shape the branch currently reserves for
    `inline: true` roles on main. The `inline` flag can be dropped or
    left as a truthy-always constant; simplest is to delete the
    branch and always return the inline shape.
14. **Save pipeline carries inline shape through.** Wherever the
    write pipeline builds the top-level `notification.<role>` fields
    from `answers[party.id]`, pass the full inline shape through
    rather than paring back to `{ addressId }`. Concretely: the
    place the `saveNotification` PUT body is built (in
    `services/persistence/records/real/` or the marshalling layer
    equivalent) already handles main's inline case for
    `placeOfOrigin`; extend to all six.
15. **Pre-submit re-inflate PUT.** Add a step to
    `services/persistence/records/real/lifecycle/transition.js`'s
    `finalise` (or the CYA controller before it calls `finalise`) —
    resolve each party via `resolveParties`, build a new PUT with
    the freshly-resolved inline shape, PUT, then POST `/submit`.
    Documented as "freeze at submit — persists a fresh resolve so
    the submit moment matches the address book".
16. **Read gate flips polarity.** Marshal (`document.js`) stops
    building `journey.frozenParties` from any wire field. The two
    controllers change their gate from
    `journey.frozenParties ? frozenPartiesOf(...) : await
    resolveParties(...)` to a status-based expression. Cleanest: a
    new helper `partiesForRender(request, journey, answers)`:
    - SUBMITTED → build display shape from the stored inline
      details in `answers` (essentially the current
      `frozenPartiesOf` logic, but sourced from `answers` not
      `journey.frozenParties`).
    - DRAFT / AMEND → `await resolveParties(request, source)`.
17. **`frozen-parties.js`.** Its `toDisplayParty` reshape moves into
    (or is called by) `partiesForRender`. The `frozenPartiesOf`
    entry point that reads a `frozen` argument is retired. Keep the
    role-to-journey-id map (`PARTY_ID_BY_ROLE`) since it now applies
    to the read side of every SUBMITTED render.
18. **`resolveOne` and `withoutUnresolvedPartyRefs`.** No change.
    The stored inline shape is compatible with `resolveOne`'s
    inline-skip branch; `withoutUnresolvedPartyRefs` still only
    matters for parties whose `addressId` fails live-resolution
    (DRAFT / AMEND) and inline stored details don't interfere.
19. **Frontend tests.**
    - `frozen-parties.test.js` — either delete or repurpose to
      cover `partiesForRender`'s SUBMITTED branch.
    - `addresses/controller.test.js` and
      `check-answers/controller.test.js` — update gate assertions to
      status-based branching.
    - `real/marshal/document.test.js` — drop `frozenParties` field
      assertions.
    - `real.requests.test.js` — no wire-field assertions for
      `submittedNotificationBaseline`. Add coverage for the pre-
      submit re-inflate PUT.
    - New test for `partiesForRender` covering all three status paths.

## Tests repo changes

20. **`domain/models/db/notification-document.ts:96`.** Rename the
    field to `preAmendNotification?: NotificationContent`. The type
    is unchanged; only the field name and its expected lifecycle.
21. **`persistence-notification.spec.ts:83-93`.** Rewrite. Each of
    the six party fields on `notification` now asserts as an inline
    shape after a SUBMITTED submit:
    `expect(notification.consignor).toEqual({ addressId: consignor.id,
    name: consignor.name, address: consignor.address, ... })`. Drop
    the two `doc.submittedNotificationBaseline?.<role>?.name`
    assertions — the baseline is now amend-scoped and empty here.
22. **`addresses-submit-freeze.spec.ts`.** User-visible behaviour is
    unchanged; the spec passes as-is. Add an internal-shape check
    if the current test peeks at `submittedNotificationBaseline` on
    the raw Mongo doc, redirecting that peek to the top-level
    notification content.
23. **`addresses-live-link.spec.ts`.** Unchanged; DRAFT/AMEND still
    live-resolve.
24. **Test-repo API journey (`flows/api-journey.ts`).** No change to
    the current UNLOCKED_FULFILMENTS fixture — those obligations are
    not party ones. If a future fixture inlines party answers, use
    the new full-shape.

## Migration on disk

Not necessary, existing test data is ephemeral.

## Risks and open questions

- **Resolve → commit window widens slightly.** Not a new class of
  risk — address-book edits can always land between "resolve" and
  "commit", both today and under the proposal. The freeze
  semantics are unchanged: whatever the last resolve saw is frozen.
  The moment of resolve just shifts from backend-side (inside the
  outbox lock, ~ms window) to frontend-side (before the PUT +
  submit round-trips, ~hundreds of ms window). One genuinely new
  edge case if we take Gap 2 Option A: the backend's validation
  call can reject a submit that the frontend just resolved
  successfully, if the address is deleted between the two calls.
  Trader gets a 400, retries or re-picks. UX friction, not a data-
  integrity issue.
  amend start rather than at submit. Same cost, different moment.
- **Draft outbox events for inline shape.** The draft-grade event
  path (`resolveForDraft`) currently fills in party details
  best-effort for the event body. Under the proposal the details
  are already there; the resolver becomes redundant. Confirm no
  downstream consumer of a draft event assumed the resolver was
  the only source (unlikely — draft events are best-effort by
  design).
- **`gh` code-search for `submittedNotificationBaseline` and
  `getSubmittedNotificationBaseline`** across DEFRA-org before
  landing commit 4, to make sure nothing external reads the field.

