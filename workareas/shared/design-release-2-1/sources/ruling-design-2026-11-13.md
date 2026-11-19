# Ruling: design, 13 November 2026

Design's answers to the three calls on the "Three Design Calls" page
(https://claude.ai/artifact/Ai4JjvLxchDPrPqp39Tj7C), passed on by Sam.

> Ok so I'm going to propose the following
>
> Include the Add country button
> Implement address searching without live filtering
> People can get a feel for it and if necessary we can return to the area and think of a way to do it
>
> Don't build the copy buttons

## Decided

1. **Transit countries keep the 'Add country' button.** A country is added when the trader presses 'Add country',
   not as soon as it is picked, and Remove reloads the page. This is what main already does. Adding on pick,
   removing in place and the 'Added' and 'Removed' announcements are not built (inc-030 dropped: req-348, req-349,
   req-353, req-354 out of scope).
2. **Address search does not filter as the trader types.** The trader types, then presses Search or Enter, on every
   party picker, the place of origin picker and the address book list. This is the server search main already
   has. The rows that filter as the trader types are not built (inc-193 dropped: req-592, req-1951, req-2039 out
   of scope). Design may come back to this area once people have used it; if so, it returns as a new question.
3. **No Copy buttons on the import reference numbers.** The reference and customs code stay as text the trader
   can select, as the overview-and-review header row already builds them (inc-198 dropped: req-1986 out of
   scope).

Not covered here: address search's search-only layout and lookup results as you type (inc-194) stay deferred as
concept work under ruling:sam-2026-11-09 point 2. Commodity search as you type (inc-014) still waits on its own
ticket under ruling:sam-2026-11-10 point 2.
