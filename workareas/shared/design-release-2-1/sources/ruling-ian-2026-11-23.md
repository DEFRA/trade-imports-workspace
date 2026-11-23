# Ruling: Ian, 23 November 2026

On whether the live animals and high-risk plants party pickers list every address for a role on one
page, raised by a bug report after `inc-087` shipped:

> The party pickers in the live animals and high-risk plants journeys no longer page their results. A
> trader with many saved addresses for a role gets every one of them in one long table.

## What was asked

`inc-087`'s acceptance criterion 7 reads:

> Each animals picker and each high-risk plants picker lists every address it offers on one page:
> between the search box and the save buttons the page shows the results heading, the results count
> and one table holding every address for the role, however many the role has
> (`prototype:dr2-1-source` prototype-dr2-1-source-p8-063; `document:dr1-parity-backlog`
> document-dr1-parity-backlog-p7-052, -p7-056, -p7-057; `ruling:sam-2026-10-09-pm`
> ruling-sam-2026-10-09-pm-p3-041; `repo:plantsfrontend` repo-plantsfrontend-p6-007, -p6-021)

The clause "however many the role has" was built as written. Before `inc-087` both frontends paged
the pickers at five a page; that paging was removed, and nothing in any spec or design recorded that
it had been there.

## Decided

1. **The pickers page at eight, and the one-page clause of `inc-087`'s criteria 7, 8 and 9 is
   dropped.** Eight is the figure the INS address book list already uses
   (`insfrontend:src/server/app/features/address-book/list/list.controller.js:49`, `REQ-INS-ADDR-013`).
   The animals transporter list is **not** a precedent: it renders no pagination today, and
   EUDPA-824, the ticket to split it into pages of eight, is still To Do. Paging comes back on top of
   the role filtering, which is correct and stays.

2. **It was a distillation error, and the error is identifiable.** The clause rests on
   `ruling-sam-2026-10-09-pm-p3-041`, which is the orchestrator's application of Sam's principle,
   not a ruling of Sam's on paging:

   - `sources/ruling-sam-2026-10-09-pm.md:271` heads the bullet the claim is read from "Design
     question 5, live filtering (claim 9). **Applied by the orchestrator from Sam's principle (point
     3b)**".
   - Sam's point 3b (`:233-242`) is about live filtering alone. It says filtering as the trader types
     waits on design and the server search is built now, and it carries forward DR1's own `c-094`
     wording, "the one page per role and the server search behind a submitting button still stand".
     It rules on when results refresh, not on how many a page holds.
   - "No pagination and no 'Selected address' inset" (`:276`) is the orchestrator's sentence.

3. **The same ruling settles the opposite answer three lines above.** The bullet directly before it
   (`:273-275`) builds the INS address book list with "8 a page (req-1141)" over the same
   address-book records. One ruling, one page of it, two incompatible answers to how many addresses a
   page holds. Eight is the one with a requirement behind it.

4. **The prototype's single page is a fixture, not a requirement.** `prototype-dr2-1-source-p8-063`
   reads one page off the prototype's own address book, which holds too few records to need paging,
   so the prototype could not show paging whether it wanted it or not.

   This does **not** rest on `ruling:ian-2026-11-11` point 2: that point is scoped to the prototype's
   `app/data/*.js` files and to `data` claims about "what data a notification captures, which values
   a field offers, or which commodities a rule covers" (`sources/ruling-ian-2026-11-11.md:25-28`),
   and p8-063 is a page-behaviour claim, not a data one. It rests instead on
   `ruling-sam-2026-10-09-p1-116`, "Prototype is the authority for how things look and feel not how
   they are architected": how many rows a page holds over a real dataset that grows is not look and
   feel, and `ruling:ian-2026-11-16` turned down a clause on the same ground.

5. **The restatement of the chosen address comes back with the paging.** `req-595` dropped the
   "Selected address: `<name>`" inset, and its stated reason is "The inset exists only because the
   chosen row could be on another page; with one page it goes". Once the chosen row can be on another
   page again, that reason is gone: a trader on page two would otherwise have nothing on screen
   telling them what they have chosen. The inset goes back where it was, between the search box and
   the results, with the words both frontends already had.

6. **`req-611` is unaffected.** The address book's own role-scoped list stays unpaginated: each
   frontend reads the whole book because the list endpoint takes no role, filters by role itself, and
   then pages what is left for display. Paging the API would make the role filter wrong.

7. **`inc-087` stays done.** It was built as its criteria then read. The code is corrected under
   EUDPA-827, which also corrects the criteria, the requirements behind them, `c-094`'s outcome and
   the behaviour spec, so a re-distillation does not drop paging or the restatement again.
