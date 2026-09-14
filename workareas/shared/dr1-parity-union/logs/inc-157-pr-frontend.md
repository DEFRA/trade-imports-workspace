## EUDPA-593 — confirmation page "contact HMRC" link destination

Increment `inc-157` of the DR1 parity backlog (corpus `dr1`, slice `review`).

### What changed

Under **Getting help** on the confirmation page, the sentence "If you need help with your customs declaration, contact HMRC." linked to HMRC's general contact index:

```
https://www.gov.uk/government/organisations/hm-revenue-customs/contact
```

That page lists every tax and every helpline, so a trader who has just submitted an import notification has to find the right desk themselves.

Design release 1 links the same sentence to the customs, international trade and excise enquiries page — the desk for the enquiry this user actually has:

```
https://www.gov.uk/government/organisations/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries
```

This PR changes that one `href` to match DR1, and adds a template test asserting the destination.

- `src/server/app/sets/live-animals/journeys/linear/features/confirmation/template.njk` — href updated
- `src/server/app/sets/live-animals/journeys/linear/features/confirmation/template.test.js` — new assertion on the link target

Link text ("contact HMRC"), the surrounding copy, and the `target`/`rel` attributes are unchanged. DR1 opens the link in a new tab and the frontend does not; that difference is deliberately out of scope for this increment.

### Scope

Frontend only. The increment branched the tests repo too, but nothing there needed changing, so no sibling PR exists and no cross-repo merge ordering applies.

### Evidence

- Frontend: `src/server/app/sets/live-animals/journeys/linear/features/confirmation/template.njk:37`
- DR1 prototype: `app/views/notification-submitted.html:73-76`

Ticket: EUDPA-593
