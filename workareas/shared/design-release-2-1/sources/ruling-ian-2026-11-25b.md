# Ruling: Ian, 25 November 2026 (second)

On the two questions the 25 November re-distil raised about the notification view header, both thrown up by
`ruling:sam-2026-11-19` point 2 (each header button gets its own form), asked while picking up the
`manage-notifications` theme.

## c-438: Amend becomes a link

> **A link, like Delete**

Once the amend confirmation page exists (`inc-120`), **"Amend this notification" on the notification view header is a
link to that page, not a posting button.** Copy as new keeps a form of its own, Delete stays a link, and no action
shares another action's form, in live animals, germinal products and plants alike.

Why, beyond the answer:

- Today's header posts. `frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/view-header.js`
  gives `amendAction` and `copyAction` a `postAction`, and `deleteButtonFor` an `href` to the delete confirmation
  page. That is the header `ruling:sam-2026-11-19` was written against.
- Today's POST starts the amendment: it takes the record to AMEND and writes the snapshots. With a confirmation page
  in front of it, the first click changes nothing — the state change moves to the confirm button on that page. A POST
  whose only effect is to render a page is the wrong verb, and on a page that must work without JavaScript it leaves
  the trader a re-POST on the back button.
- Delete already sets the pattern in the same header, for the same reason: it opens a confirmation page by `href`.
- This does not weaken `ruling:sam-2026-11-19` point 2, whose subject is that no action shares another action's form.
  A link shares no form at all. Point 2 still governs Copy as new, which keeps its own form because it still changes
  something when clicked.

## c-447: plants gets Copy as new

> **Yes — build Copy as new for plants too**

**The high-risk plants notification view header gains a Copy as new action**, so the two journeys offer the same three
actions. Asked as a question because `ruling:sam-2026-11-19` point 2 is a wiring rule and the plants header has no
copy action to wire; answered the other way deliberately, to level the journeys.

This is a wiring change, not a feature build. Every layer beneath the button is already on `main`:

- `plantsbackend:src/main/java/uk/gov/defra/trade/imports/plants/notification/NotificationController.java:80` serves
  `POST /{referenceNumber}/copy`, calling `notificationService.copyNotification(referenceNumber, concurrencyToken,
  organisationId)`, with a `NotificationCopyMapper` beside it and a 400 for a source notification that is not in a
  copyable status.
- `plantsfrontend:src/server/app/services/persistence/records/real/lifecycle/create.js:23` implements `copy`, posting
  to `${notificationsUrl}/${journeyId}/copy?concurrencyToken=…`.
- `plantsfrontend:src/server/app/services/persistence/records/stub/lifecycle/create.js` implements it for the stub.
- `plantsfrontend:src/server/app/engine/journey.js:186` holds `copyJourney`, which calls `records.copy` and registers
  the copy as a known journey.

What is missing is only the header action and its route:
`plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/view-model/view-header.js`
builds `actions: { amend, delete }` and has no `copyAction`.

So the plants backend needs nothing, and `trade-imports-plants-backend` does **not** join this programme's repos.
`inc-123` takes `plantsfrontend` alongside its existing `backend`, `frontend` and `tests`, and `inc-124`'s stale-copy
return takes plants too, since a plants trader can now reach the same stale view.

Orchestrator's note: the plants copy carries plants' own answers, so the live-animals split of carried-over trade
answers against cleared shipment answers (`req-1425` and the rest of `inc-123`'s criteria) is read against plants'
own fields rather than copied field for field. Where plants has no equivalent of a live-animals field, there is
nothing to carry and nothing to clear.
