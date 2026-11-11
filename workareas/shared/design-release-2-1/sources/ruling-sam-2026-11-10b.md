# Ruling: Sam, 10 November 2026 (second)

Decided by Sam on the review of the obligation model and test tidy-up rows
(stale-theme-review/findings.json, each verdict checked by a second agent).

> no, move them to the theme that does the work. yes drop obligation model row. the return links consider as
> blocked waiting on the save and continue theme which is currently being built on another machine.

## Decided

1. **The obligation model row (inc-245) is dropped.** Main already tells a hard stop from a submission check:
   each page refuses a missing required answer itself, the review refuses submission, both save buttons make
   the same checks (inc-232), and the one all-or-nothing group in V4, accompanying documents, is refused when
   half-filled. The model has had allOrNothingOfIds and anyOfIds since September. What is lost: the manifest
   never names 'mandatory to proceed' as its own marking, and no single test proves the markings together.
   req-2206 and req-2207 are out of scope. The obligation-model theme is removed.
2. **The overview and review class-list checks move to the theme that does the work.** The hub's totals box,
   button and caption line-height checks go to overview-and-review inc-098; the review's visually-hidden and
   summary-card class checks, and the review's last-card screenshot, go to overview-and-review inc-101. The
   live animals class-name row (inc-234) keeps the rest and drops the overview and transit countries
   screenshots, which are already on the tests repo's main.
3. **The return links row (inc-235) is blocked** until the save and continue work (EUDPA-774,
   feat/EUDPA-774-save-and-continue-through-journey, workareas/shared/eudpa-774) has merged. Its commodities
   half is already on main and comes out of the row.
