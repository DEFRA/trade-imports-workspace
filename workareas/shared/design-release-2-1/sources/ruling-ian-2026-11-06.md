# Ruling: Ian, 6 November 2026

On transporter management, which Sam's ruling of 9 October (afternoon) left blocked pending requirements —
whether the service manages transporters at all and, if so, whether the address book or something else does
(`ruling:sam-2026-10-09-pm` point 5, claim c-285):

> My decision is that the address book will manage the transporters, just like other addresses which are saved
> per organisation.

> It will use the same pattern with moving to the address book mid journey, like other addresses when adding
> transporters - it's essentially the same pattern.

> I think that previous ruling was based on the concept of 'approved transporters' which may be a list managed in
> MDM for all organisations that will be added to the organisations individual transporter options.

> Don't worry about the approved transporters for now.

On whether a transporter takes the address book's own data model, its roles, and how Northern Ireland is held:

> So for question 1, the transporters don't need to be in the same data model as the addresses, but can live
> within the address book service if that makes sense? Persisted in a different collection? Would these
> transporters need the same roles?

> for the Northern Ireland thing, we wouldn't use MDM for a country look up right? We would just force a created
> commercial transporter to have a country code of northern Ireland?

## Decided

1. **The address book manages transporters.** A transporter is a record held per organisation, exactly as every
   other address is, and `trade-imports-address-book` is the system of record. This supersedes
   `ruling:sam-2026-10-09-pm` point 5 and claim c-285, and settles for transporters the question
   `ruling:sam-2026-10-09` p1-093 left to "follow the real services". New.
2. **Adding a transporter mid journey uses the address book hand-off already built for addresses.** A notification
   journey that needs a new transporter opens the INS front door's add pages in journey mode and lands back in the
   journey on save or cancel — the same pattern as inc-077, inc-078 and inc-080 (EUDPA-706, merged `e1237ac7`),
   not a second pattern of its own. New.
3. **Approved transporters are parked.** A list of approved transporters managed in MDM for every organisation,
   added on top of an organisation's own transporters, is not in scope now and nothing is built for it. It is
   recorded as the likely subject of the 9 October block. New.
4. **A transporter is its own record in its own collection, inside the address book service.** It does not take
   the `Address` data model. It is persisted in a `transporters` collection beside `addresses`, with its own
   document, controller, repository and route, reusing the service's organisation scoping
   (`IdentityHeaderFilter`), soft-delete status, optimistic locking and the Standard Address Block field
   validation where the fields are genuinely the same. The address book's own API is unchanged: `AddressRequest`
   requires at least one role (`@NotEmpty`) and refuses a `type` outright (`@Null`, "type is not a supported
   field"), which a transporter can satisfy neither of, and a transporter carries an approval number, a
   private-or-commercial type and an approval status that no address has. New.
5. **Transporters have no roles. They have a type.** `AddressRole` exists to say which records a notification's
   picker may offer for a slot, and to drive the receiving-roles-in-the-United-Kingdom rule and the list's three
   category tabs. A transporter is never one of those six roles and has one use — the transporter step — so a
   role would carry no information, and no seventh role or fourth role group is added. What is stored instead is
   the private-or-commercial type, which is intrinsic: it decides the form, the field list and the country rule,
   so unlike an address's type (which `ruling:paul-2026-11-05` dropped as derivable from roles) it cannot be
   derived from anything. The INS front door's Transporter tab is therefore a fourth tab backed by the
   transporters route, not a fourth role group over `addresses`. New.
6. **A commercial transporter's country is forced to `XI`, with no reference-data lookup.** It is not a choice, so
   there is nothing to look up: the add form already fixes the country, posts it in a hidden field and refuses a
   tampered value rather than correcting it (c-055). MDM could not serve it in any case — its country list is the
   origin and export list, 249 entries with no United Kingdom at all, which is why `addressCountries()` prepends
   `GB`/`United Kingdom` in code. The code persisted is `XI`, displayed as "Northern Ireland", both held as
   constants in the service. `XI` is this estate's existing code for Northern Ireland: `trade-imports-schemas`'
   DOCOM samples carry `"countryId": "XI"` with `"countryName": "United Kingdom (Northern Ireland)"` against
   Belfast BT postcodes. Being distinct from `GB`, it keeps "must be Northern Ireland" enforceable from the stored
   value alone, with no postcode parsing and no extra flag, and it keeps a transporter's country the same type as
   the address book's `countryCode` rather than today's display string. A **private** transporter is unaffected
   and keeps its real choice of country from the United Kingdom plus reference-data's export countries (inc-008).
   New.

## Follows from the decision, for the re-distil to work through

These are not separate rulings. They are what the decisions above mean for code already on `main`, and the
re-distil of the transporter area should settle each against the real services.

7. The animals frontend's transporter store is not the system of record.
   `services/transporters/register.js` keeps added transporters in an in-memory `Map` per process, lost on
   restart and not shared between instances. Under decision 1 the address book replaces it. inc-039's
   requirement that added transporters "stay on its list for later notifications" becomes real persistence
   rather than the current demo-grade capture.
8. The add pages' home follows decision 2: the INS front door, beside the other address add pages, rather than
   `features/transport/transporter-add`, `.../private-transporter-details` and
   `.../commercial-transporter-details` in the animals frontend. What becomes of those three folders is the
   re-distil's to decide against the real services.
9. inc-074, inc-075 and inc-076 become the primary route rather than an extra one, and the Transporter option on
   "Choose an address type" now has somewhere to lead. Which of the two placements still in play it takes —
   req-1198's third, before "Branch", or req-2042's after "Place of Destination" and before the divider — is
   settled at the re-distil against the three-option page inc-061 built.
10. A transporter's approval status (Approved or New, shown on the list) is not the address book's `AddressStatus`,
    which is an ACTIVE or DELETED soft-delete tombstone. Decision 4 puts the two on one service, so the
    transporter document needs its own name for its own concept.
11. Decision 6 makes the commercial transporter's stored country a code rather than today's display string
    `'Northern Ireland'`, so the re-distil should say what happens to records captured before the change, if any
    outlive it.

## Still open

12. **Which approved-transporter list the list's commercial records come from** (req-2172, inc-265) stays open,
    parked with decision 3.

## Unchanged

13. The Northern Ireland address search (inc-042) stays blocked on its own, independent blocker: the INS address
    lookup is still only the EUDPA-390 spike, gated to dev and local and not wired in. It waits with the address
    book's own inc-072 and inc-081, which wait on the same thing. Under decision 6 its BT-postcode filter is a
    search convenience, not the source of truth for the country.
