# Ruling: Ian, 11 November 2026

On what settles a difference between the V4 data dictionary (`confluence:6497338582`, the page now titled
"Live Animals & Germinals Data Dictionary") and the DR1 parity judgements
(`document:dr1-parity-notes`, `document:dr1-parity-backlog`), raised while starting the
`identification-and-permanent-address` theme by conflict c-334 (whether a tattoo is asked for on cattle and pigs):

> v4 always wins over DR1, v4 is the source of truth

On what a row may rest on at all, raised by the same check:

> Double check none of these rows that are there, or are being created are purely data based rows from the
> prototype, all data is either an MDM concern, or if our pages differ based on it, from the v4, not just the
> prototype

## Decided

1. **V4 outranks every DR1 judgement, on every point, with no exception.** Where the V4 data dictionary and a
   DR1 parity note or backlog row describe the same thing differently, V4 is built and the DR1 judgement is
   set aside. This is wider than the earlier position: `ruling:sam-2026-10-07` let "a DR1 judgement on that same
   difference" override the prototype, and `confluence:6497338582`'s role already outranked the prototype on
   data. Neither said what happens when V4 and DR1 disagree. They do disagree, and V4 wins. A deliberate DR1
   parity commit is not a reason to keep DR1's answer: it is the change V4 reverses. New.

2. **V4 is the source of truth for data.** No row may rest on the prototype's `app/data/*.js` files for what
   data a notification captures, which values a field offers, or which commodities a rule covers. Those files
   are demo fixtures written to make the prototype's pages demonstrable. A claim of kind `data` taken from them
   is evidence of nothing except what the prototype happened to hard-code. New, as a general rule; it was
   already applied to the commodity catalogue when `inc-012` was dropped on 3 November.

3. **Every piece of data belongs to one of two owners, and neither is the prototype.** Either it is a reference
   list, and then it is MDM's content, reaching the service through `trade-imports-reference-data` under claim
   25 of `ruling:sam-2026-10-09` — never a reason to block a row and never edited in code. Or it is a field,
   format, limit, level or conditional rule the notification captures, and then V4 specifies it. A row that
   cannot point to one of those two owners for the data it asserts is not a row. New.

4. **The prototype still decides how a page looks and reads**, exactly as before: which fields a page shows and
   in what order, their labels, hints, error messages, captions, headings and the journey's question order.
   That is not data, and nothing here narrows it. Where V4 specifies the same field's format, limit, level or
   whether it is mandatory, V4 decides those and the prototype decides how it reads. Unchanged, restated
   because point 2 could otherwise be read too widely.

5. **Conflict c-334 is settled: follow V4's list.** A cattle panel (`0102`) asks for a tattoo after the ear tag
   and the passport, and a pig panel (`0103`) asks for a tattoo as well as an ear tag. req-2154 and req-2155 are
   adopted. Two things made c-334 a question rather than a precedence call, and neither survives:

   - **V4 against DR1.** The real frontend's commit `b1ff013c` deliberately removed the tattoo from cattle under
     DR1 parity, and `document:dr1-parity-notes` calls asking a cow for a tattoo a defect. Point 1 settles this:
     V4 lists Bovine in its tattoo commodity list, so the tattoo is asked for and `b1ff013c`'s removal is
     reversed. It is not a silent revert — it is this ruling.
   - **V4 against itself.** The "Tattoo identifier commodities" expand holds five entries while its title counts
     two. The entries win. This is not a new judgement: `sources.json` already instructs the intake to "claim the
     entries listed, never the count", because the same page titles the passport list six and lists nine. A
     title's count is a stale hand-written number, and the list beside it is the specification. The same page
     naming `0102` "Bovine" in this list and "Cattle" in the others is a label difference, not a difference of
     scope.

6. **Where V4 and a DR1 judgement disagree on a shape, not just a value, V4 still wins, but the shape is
   designed in the real service's conventions.** The CPH allow-list is the live example: V4 gives fourteen
   chapter-01 codes that require a CPH number, while `main` inverts it as `CPH_EXEMPT_CODES` under DR1 parity
   (`fb0255c1`), so every code MDM adds defaults to "CPH required" — including rabbits, reptiles, parrots, bees
   and insects, which V4 does not list. V4's allow-list wins and the deny-list goes. How the allow-list is held
   in code is the animals frontend's call, not V4's. New.

## What this changes in the backlog

- `req-2154` and `req-2155` move from `question` to adopted, and c-334 stops being an open question.
- The tattoo coverage for cattle and pigs becomes a row in `identification-and-permanent-address`, the theme
  that owns `services/commodities/rules.js` and the identification page.
- The CPH allow-list item in `deferred.md` no longer waits on a V4-versus-DR1 decision. It still needs a home:
  it is not this theme's code.
- Nothing else. This ruling adds no requirement that was not already extracted; it answers questions that were.
