# Ruling: Ian, 16 November 2026

On whether the consignor party picker must also list addresses saved for an **exporter** role, raised by the
judge while ruling on `inc-087`'s review in the `consignment-parties` theme:

> Where did that acceptance criteria come from? The v4 or the prototype? If the role doesn't exist...

## What was asked

`inc-087`'s acceptance criterion 2 reads:

> The consignor picker lists the organisation's addresses saved for the consignor role together with those
> saved for the exporter role, and the roles and addresses page's party sections are Place of origin,
> Consignor, Consignee, Importer and Place of destination
> (`prototype:dr2-1-source` prototype-dr2-1-source-p8-064, prototype-dr2-1-source-p8-137;
> `ruling:sam-2026-10-09` ruling-sam-2026-10-09-p1-116)

No code in the row could satisfy the exporter clause. The address book's whole role vocabulary is
`PLACE_OF_ORIGIN`, `CONSIGNOR`, `PLACE_OF_DESTINATION`, `CONSIGNEE`, `IMPORTER` and `BRANCH_ADDRESS`
(`tests:domain/shared/constants/address-types.ts:20-27`), `grep -rn "EXPORTER"` over
`repos/trade-imports-address-book/src/main/java/` returns nothing, and neither frontend can ask for two roles:
`holdsRole` takes a single role (`frontend:src/server/app/services/address-book/index.js:22-23`) and each party
binds exactly one `addressBookRole`
(`frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js:13-50`).

## Decided

1. **The exporter clause of `inc-087`'s criterion 2 is dropped.** It is not deferred, not handed to another
   theme, and not a reason to add a role. There is no exporter role, there never was one, and none is to be
   created for this.

2. **It was a distillation error, and the error is identifiable.** Both prototype claims behind the clause are
   the prototype's own internal type vocabulary, not a domain role:

   - `prototype-dr2-1-source-p8-064` (verbatim, `app/routes.js:3851-3876`) quotes the literal line
     `'consignor-or-exporter': ['consignor-or-exporter', 'consignor', 'exporter']`.
   - `prototype-dr2-1-source-p8-137` (inferred, `app/data/consignment-address-sections.js:15-28`) quotes
     `id: 'consignor-or-exporter', heading: 'Consignor'` and reads it as "the consignor section covers the
     exporter too: there is no separate exporter section, and the page names only the consignor".

   The second of those is a claim taken from `app/data/*.js`, which `ruling:ian-2026-11-11` point 2 already bars
   a row from resting on: those files are demo fixtures, and a `data` claim from them "is evidence of nothing
   except what the prototype happened to hard-code". The first is `app/routes.js`, the prototype's own routing
   glue — the same thing one level further in.

3. **The third citation on the same line is the one that refuses the clause.**
   `ruling-sam-2026-10-09-p1-116` quotes Sam directly: *"Prototype is the authority for how things look and
   feel not how they are architected"*, and its statement is that "the address record's field shape for address
   uses and roles is the address book service's design". A role vocabulary is architecture. The criterion cited
   the rule that forbids it, beside the claims that broke it.

4. **What the prototype actually says is already built.** `consignor-or-exporter` is the prototype's way of
   expressing that **one section covers both parties** — there is no separate exporter section and the heading
   reads "Consignor". That is look and feel, it is within the prototype's authority, and the real service
   already models it as the single `CONSIGNOR` role. The second half of the same criterion states it plainly:
   five party sections, Place of origin, Consignor, Consignee, Importer and Place of destination, no exporter
   among them. `inc-087` satisfies that half, so the row is correct as built and needs no further work.

5. **Adding an `EXPORTER` role would be the wrong fix.** It would split a party the design deliberately merged,
   and it would put work on the `address-book` theme that no requirement asks for. No row in any theme is to
   add one.

## What this changes in the backlog

- `inc-087`'s open question is answered and cleared. The row stays `done`; nothing is rebuilt.
- No requirement changes state. This ruling adopts nothing new — it removes a clause that no source supported.
- The `address-book` theme is not handed anything. Should a future re-distil re-draft the exporter clause from
  the same two prototype claims, this ruling refuses it.
- A general point worth carrying: `ruling:ian-2026-11-11` point 2 bars `app/data/*.js` as a source of **data**.
  This case shows the same files being read for a **rule** (`kind: rule`, not `kind: data`) and reaching a
  criterion anyway. The bar is on what the file is, not on how the claim is labelled.
