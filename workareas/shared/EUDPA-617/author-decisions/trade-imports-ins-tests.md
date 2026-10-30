### amieljemei 2026-10-29T09:25:17Z

## EUDPA-617 re-review of the follow-ups (head `1be4760`)

**Verdict: needs attention.** The group-order check in `commodities.spec.ts` is sound and closes #37.

1. **`animal-identifiers-conditional.spec.ts:51`: the #16 fix pins the wrong thing.** It checks the set of "Enter details for …" headings, which are the h4 counters inside a card, not the cards. The frontend leaves the counter out once a card reaches its cap (`card/view-model.js:107`). So an ostrich card with no counter would still pass, and the title "gets no card" isn't proven. `enterDetailsHeadings` also matches the text at any heading level.
   *Suggested:* add a page-object getter for the card titles (the h3s of the summary-card regions in the form) and assert `toHaveText([commodityLines.cattle.latinName])`. Keep the counter as a separate positive check on the cattle card.
2. **`animal-identifiers-conditional.spec.ts:52` / `animal-identification-page.ts:32`: the heading text is written inline again (#41).** The spec writes `` `Enter details for ${latinName} 1 of 1` `` inline, while `enterDetailsCounterHeading` already owns that format. Line 49 then checks the same heading a second way. `identification-card.visual.spec.ts:11` still has its literal too.
   *Suggested:* add `enterDetailsHeadingText(latinName, current, total)` to the page object, use it inside `enterDetailsCounterHeading`, and use it in both specs.
3. **`commodity-selection-page.ts:61`: `resultGroups` filters out groups with no checkbox.** An unexpected empty group is therefore dropped before the count and order checks, so the #37 fix is half done. It also gives the per-code fieldset a second name beside `commodityGroup(code)`.
   *Suggested:* `commodityGroups = this.page.getByRole('group')` with no filter, and update `commodities.spec.ts`.

**Still open from the second pass:**
- **#40 / naming half of #36:** `speciesCard(species)`, `savedAnimalsRows(species)` and `savedAnimalRow(species, number)` (`animal-identification-page.ts:71,75,79`) take a Latin name but call it `species`, beside `enterDetailsCounterHeading(latinName, …)`. Rename the parameters to `latinName`.
- **#5:** `addCommodityToCurrentNotification` (`flows/animals/journey.ts:415`) still hides `fillEveryAnimalCount('1')` behind its name.

Note: these PRs cite `workareas/reviews/EUDPA-617/walk-second-pass/decisions.md`, but I couldn't find it. If any of the above was put off on purpose, please point me to the decision.


### ami-nav 2026-10-29T17:42:11Z

**Walk note on (1) — #16 pins counters not cards: Fix.**

Added `speciesCardTitles` (h3s of the summary-card regions in the form). The “gets no card” test now asserts `toHaveText([commodityLines.cattle.latinName])`. The cattle counter stays as its own check. Dropped `enterDetailsHeadings`.

### ami-nav 2026-10-29T17:48:28Z

**Walk note on (2) — heading text written inline again (#41): Fix.**

`enterDetailsHeadingText` owns `Enter details for {latinName} {current} of {total}`. `enterDetailsCounterHeading` uses it. The visual spec waits on that locator with Felis catus 2 of 2 instead of a literal. The conditional spec already used the locator after item 1.

### ami-nav 2026-10-29T17:51:38Z

**Walk note on (3) — resultGroups drops empty groups: Fix.**

Renamed to `commodityGroups`: every `group` on the page, with no checkbox filter. The grouping spec uses that for count and order. `commodityGroup(code)` still finds one code.

### ami-nav 2026-10-29T17:53:00Z

**Walk note on still-open #40 / naming half of #36 — species vs latinName: Fix.**

`speciesCard`, `savedAnimalsRows` and `savedAnimalRow` now take `latinName`, matching `enterDetailsCounterHeading`. Call sites already passed `.latinName`.

