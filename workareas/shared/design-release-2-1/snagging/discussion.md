# Design Release 2.1 snags: points to talk through

For the review session on 20 October, the 38 snags and the tester's questions are in two groups: **to discuss** (14) or **ready to build** (28). Sam settled five on 20 October (see [Settled](#settled)). S30 needs no change. The record is [review.json](review.json), and the snags page is built from it. It replaces the earlier groups: done on a branch, as the prototype, and like the prototype with small differences.

An item is to discuss when one of these applies:

- the real service would use a different component from the prototype
- the prototype relies on JavaScript with no fallback
- it goes against a ruling, the spec or accessibility
- the behaviour differs
- only the designers can answer it

Everything else is ready to build. Differences that are only how we build it, such as spacing classes, are left out.

| Item | Page | Decision |
|---|---|---|
| [S08](#s08-commodity-search-results-as-you-type) | What are you importing? | Keep a search box you submit, with the prototype's look, until commodities come from MDM? (design question 3) |
| Q1 | What are you importing? | Show 'Cow' with 4 species until MDM, rather than the prototype's 'Cattle' list? |
| [S25](#s25-transit-countries-added-as-soon-as-they-are-picked) | Transit countries | Keep 'Add country' as the confirm step? (design question 4) |
| [S37](#s37-cph-number-cursor-moving-to-the-next-box) | CPH number | One box, or three boxes with no cursor jump? (design question 7) |
| S02, S21 | Origin, Arrival details | Country and port type-aheads: leave out the joined blue search button? Bold matching letters? |
| S10 | Main import reason | Keep country questions as type-ahead boxes, not dropdowns? |
| S04 | Origin | Origin code prefix fills in on pick with JavaScript, and only after the page is shown again without it? |
| S26 | Transporter details | A box you submit for now, with filtering as you type left until transporter management? |
| S36 | Address selection pages | Keep the 'View details' expander until the address book can send the trader back? |
| Q2 | Back while creating | Back goes to the previous page and the run carries on, as the prototype does. Did the tester press Back first? |
| Q4 | A task saved with nothing in it | 'Complete', 'Not needed', or stay 'To do'? |
| Q5 | Back from a submitted notification | Go to the dashboard, as the spec and prototype say? On main it goes to Overview, and nothing plans the change |
| S35 | Review your notification | What steps did you take? On current main it behaves as the prototype does |

The three designer questions in detail are below. Q2 and Q4 are from the tester's comments on the journey foundation ticket: see [eudpa-691/save-and-status.md](eudpa-691/save-and-status.md). To see each comparison, open the snags page or [screens.html](screens.html).

There is also one small question with a default, S33's button colour, and six calls we have made that Sam should check.

## S08: Commodity search results as you type

**What the prototype does:** results appear as you type 3 or more characters, grouped by commodity with a checkbox for each species, under a blue icon button ([prototype](screens/prototype/S08--cattle-results-open.png)). The list comes from JavaScript only. With JavaScript off you can type 'cattle', but nothing is listed and there is no way to tick a species, so you cannot finish the page ([prototype, no JavaScript](screens/prototype/S08--typed--nojs.png)).

**Why we think it should differ:**

- GOV.UK services must work without JavaScript. The [GOV.UK Service Manual on progressive enhancement](https://www.gov.uk/service-manual/technology/using-progressive-enhancement) says to build the page so it works first, then add JavaScript on top. The prototype's search has nothing underneath it.
- The result rows are a custom control, not a GOV.UK or MoJ component, so they would need their own assistive technology testing.
- Sam ruled on 9 October that results as you type are design question 3. He also ruled that the commodity catalogue and its search wait until commodities come from MDM. The 'Cattle' list you see in the prototype, with many species, is the MDM catalogue. Ours still shows 'Cow' with 4 species for now.

**What we propose:** keep the server search, which works for everyone, and give it the prototype's look now (row inc-210). A full-width box with a square icon button beside it replaces the separate grey 'Search' button. The icon button is a real submit button that screen readers announce as 'Search'. We would build it from the Ministry of Justice design system's tested Search component, which both frontends already include, not from a hand-made control. Results still appear as GOV.UK checkboxes grouped by commodity, as they do today ([main](screens/main/S08--results.png)). The same control goes on the address pickers and the transporter list, so the service has one search look.

**The question for you:** until commodities come from MDM, are you happy for commodity search to stay a box you submit, with the prototype's look? Once MDM is in, we can look again at showing results as you type, built on top of a search that already works without JavaScript.

## S25: Transit countries added as soon as they are picked

**What the prototype does:** picking a country from the suggestions adds it to the list straight away, and Remove takes it out without reloading the page. Screen readers hear 'Added Belgium' ([prototype](screens/prototype/S25--two-countries-added.png)). With JavaScript off, the box submits nothing and there is no way to add a country ([prototype, no JavaScript](screens/prototype/S25--default--nojs.png)). The suggestions also cannot be reached with the arrow keys.

**Why we think it should differ:**

- No tested government component adds an item the moment it is picked. The type-ahead we use (GOV.UK's accessible-autocomplete) picks one value. It does not manage a list. Building this means custom JavaScript with no fallback.
- The GOV.UK way to build a list one item at a time is a submit button for each item: the 'add another' approach. That is what the real page does now ([main](screens/main/S25--one-country-added.png)), and it works with JavaScript off ([main, no JavaScript](screens/main/S25--one-country-added--nojs.png)).
- Sam ruled on 9 October (claim 14) that adding on pick is design question 4, and kept 'Add country' until you answer.

**What we change now (S24, row inc-209):** a medium 'Enter a country' label, the 'Search for a country' placeholder, no 'You have not added any countries yet.' line, and Remove at the right-hand end of each row. Apart from the 'Add country' button, the page will then match your drawing.

**The question for you:** can 'Add country' stay as the confirm step? It is one press, it announces the change to screen readers, and the page keeps working without JavaScript.

## S37: CPH number cursor moving to the next box

**What the prototype does:** once County (2 digits) is full, the cursor jumps to Parish (3 digits), then to Holding (4 digits). Backspace in an empty box jumps back and deletes the last digit in the box before it ([prototype](screens/prototype/S37--all-typed-continuously.png)). The boxes have no visible County, Parish and Holding labels.

**Why we think it should differ:**

- Moving the cursor while someone is typing is a 'change of context' under [WCAG 2.2 success criterion 3.2.2 On Input](https://www.w3.org/WAI/WCAG22/Understanding/on-input). Screen reader and screen magnifier users lose their place. Someone who goes back to fix County gets thrown into Parish. Someone typing while looking at the keyboard ends up in the wrong box. The Backspace jump deletes a digit they did not mean to delete.
- GOV.UK's own split boxes, the [date input](https://design-system.service.gov.uk/components/date-input/), do not move the cursor, and they label every box visibly.
- Sam recorded on 9 October that automatic focus moves are not built (req-713), because the accessibility duty comes first.

**We agree there is a problem.** On the test environment, typing the 9 digits straight through keeps only '12' and silently drops the rest ([main](screens/main/S37--whole-number-typed.png)). Three boxes invite people to type the number in one go.

**What we propose (design question 7):** one GOV.UK text input labelled 'CPH number', with the hint 'For example 12/345/6789'. It would accept 12/345/6789, 12 345 6789 or 123456789. The server strips the slashes and spaces and checks for 9 digits. Errors would read 'Enter the CPH number' and 'CPH number must be 9 digits, like 12/345/6789', with Welsh. It works the same with or without JavaScript, and a number pasted from an APHA document just works. This follows the GOV.UK pattern for [bank details](https://design-system.service.gov.uk/patterns/bank-details/), which asks for a sort code in one box rather than three.

**If you would rather keep three boxes:** we keep them as they are, with no cursor jump and with visible County, Parish and Holding labels. With JavaScript, inc-093 can still keep non-digits out and spread a pasted number across the three boxes.

**The question for you:** one box, or three boxes with no cursor jump? Answering design question 7 unblocks inc-093 either way.

## Smaller questions with a default

We will build with these defaults unless you tell us otherwise.

1. **Colour of the icon search button (S08, S26, S33).** The Ministry of Justice Search button we use is GOV.UK green by default. The prototype draws it blue (#1d70b8), the same blue as the date picker's calendar button. Matching the blue takes one style rule. **Default: blue, to match your drawing and our date picker.** Tell us if green is better.

## Settled

Sam's rulings on 20 October. Each item is now ready to build.

- **Date picker on Main import reason (S11):** prototype styling, opening in the page rather than over the fields. That means the blue calendar button, the prototype's calendar styling and the example '27/3/2026', with the calendar pushing the fields below it down. "The idea is consistency of display, not consistency of bad layout."
- **Date picker on Upload documents (S28):** the same. Prototype styling, opening in the page rather than over the drop zone.
- **Commodity search hint (S07):** match the prototype. Use its hint only, with no extra line after a 1 or 2 character search.
- **ITAHC on What are you importing? (S06):** match the prototype. Keep 'ITAHC' as drawn, not spelled out.
- **Save and continue from an Overview task (Q3):** it goes back to Overview, as main and the prototype do today.

## For Sam: calls we made and flagged

Sam asked us to make sensible calls and flag them afterwards rather than wait. These six change or read an earlier ruling, so he may want to overturn them.

| Snag | Call | Why | Reversal cost |
|---|---|---|---|
| S21, S02 | Bold matching in type-ahead suggestions stays out (req-019, req-299, claim 3). We suggest reopening it. | The accessible-autocomplete component draws bold matches through its own documented suggestion template. That is look and feel the accepted component already supports, a few lines of config across every type-ahead in both frontends. | Add one small row if Sam reopens it. Not in theme-rows.json. |
| S26 | The transporter search box takes the icon-button look now (inc-210), although transporter management is blocked (point 5, claim 35). | A search box's look is not transporter management. Filtering as you type and the list's content stay blocked in inc-037. | Take the transporters page out of inc-210. |
| S27 | 'Add a transporter' moves above the table now (inc-211), carved out of blocked inc-037 criterion 6. | Section 5 of the ruling is about who manages transporters, not where a button sits on a page we are keeping. | Drop inc-211 and put criterion 6 back in inc-037. |
| S32 | Conflict c-087 ('the summary list stays') set aside. Consignment addresses become headed sections (inc-213). | Ruling sam-2026-10-07 lets DR1 override the prototype only where DR1 judged the same difference. DR1 explicitly declined to judge the component (dr1-parity-union backlog lines 17483 and 18095). | Keep inc-085's copy changes and leave the summary list. |
| S04 | inc-190 unblocked and moved into inc-204. The snag is design's answer to design question 2. | The designers asked for the visible prefix box, and the live update is small, safe progressive enhancement. | Leave inc-190 blocked in waiting-on-design. |
| S33 | inc-089 ('Place of origin picker searches by country') dropped, and inc-197 merged into inc-193. Claim 16 is taken as superseded. | Prototype commit c3ca339 (9 October) removed the place of origin's country search, so all five pickers share one free-text search. This is the prototype changing, not a reversal. | Restore inc-089 and inc-197. |

Also for Sam:

- **S35, 'error handling is broken':** the review page behaves as the prototype does on current `main`. We need the designers' steps, ideally on a test environment redeployed from `main` after 19 October (#416). No row until then.
- **S36, the 'View' link:** it stays in consignment-parties inc-090, because it needs the address book to send the trader back to the picker (address-book inc-066). Until then, the 'View details' expander stays. Line-by-line addresses and full width land now in inc-212.
- **Theme boundaries:** design-snagging builds in folders other themes own: origin, commodities, import-reason, transport, documents, addresses, identification, check-answers, confirmation and declaration. It depends only on `main`, so it should land in a wave before those themes, and they should rebase on it. `tim backlog check` will report overlapping theme paths until the parent backlog's theme entries are re-split. moves.json lists every row that needs to change.
