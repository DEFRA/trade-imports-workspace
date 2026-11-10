# Ruling: Sam, 9 November 2026

Design questions 13 and 10, decided by Sam after the waiting-on-design evidence review of the same day.

> Yea I agree drop it.

> The shout on address search is it's not a "get done for our deadline job" some of the stuff in dr 2.1 (like
> templates) is concept work, which is mixed in with the "get this done work" making things confusing. but yea
> the address earch aint something we need to build yet

This agreed with the review's recommendation. The row's three criteria change only what a screen reader hears:
a 'Country search results' list label, a 'Selected <country>' announcement and their Welsh versions. The
prototype's country search is hand-built. It has no label, the arrow keys do not work, and the typed country is
lost without JavaScript. Its two announcements come with that hand-built search; nothing shows they were a
design decision. Main uses the GOV.UK accessible autocomplete, which already announces the result count, the
highlighted option and the chosen value.

## Decided

1. **The country search keeps the accessible autocomplete's own announcements.** Design question 13. No
   'Country search results' label and no 'Selected <country>' announcement, on the live animals, germinal
   products or high-risk plants origin pages. inc-189 is dropped and req-020 is out of scope. The question no
   longer goes to the designer.
2. **Address search is concept work, parked.** Design question 10. Not built for the deadline. The add-address
   pages keep every field shown from the start, as main has them. inc-194 is deferred and its requirements stay
   adopted but parked, so the question does not go to the designer now.
3. **Design Release 2.1 mixes concept work with work for the deadline.** Templates and address search are
   concept work. Before a Design Release 2.1 row goes to the designer or the build loop, ask whether it is
   needed for the deadline; a feature main does not have at all, shown only in the prototype, is the usual sign
   of concept work. Flag it to Sam rather than build it.
