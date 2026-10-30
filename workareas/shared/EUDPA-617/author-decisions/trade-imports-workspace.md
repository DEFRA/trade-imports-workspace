### amieljemei 2026-10-29T09:25:14Z

## EUDPA-617 re-review of the follow-ups (head `16e1b7b`)

**Verdict: needs changes before merge.** Fixed: #18, #21, #22, #24 to #28. REQ-CYA-014 now matches the frontend's refusal. The three items below block merge.

### Blocking

1. **`commodity-selection/spec.md:50`: SCN-COMMODITY-SELECT-003-C claims more than the code does.** It says a code search offers "every species the reference data lists under that code". SCN-COMMODITY-SELECT-014-A in the same file says a search under a code with more than a hundred species lists only a hundred. `CommoditySearchService.search` also leaves out species with no Latin name, and real MDM holds 1,234 species under 01061900.
   *Suggested:* "THEN the species the reference data lists under that code are offered under it, up to a hundred, each by its Latin name alone". Or limit the GIVEN to a code with no more than a hundred species.
2. **`commodity-selection/spec.md:55`: SCN-COMMODITY-SELECT-003-D promises a match on "part of a species' Latin name".** Neither side of the system does that. The frontend stub matches only from the start of a word, and the ticket records that MDM's partial matching is unreliable ("cat" doesn't find cattle). The AC says unsupported partial matching should be documented as a gap, not promised.
   *Suggested:* "WHEN they search by a species' Latin name, or one word of it". Keep the partial-match limits in the documented MDM gaps.
3. **Three coverage links name a test that doesn't exist.** The links are at `identification-details/coverage.json:18` and `:46`, and `commodity-selection/coverage.json:318`. They all name "changes the commodity list from a summary row and returns to identification details listing the added commodity". The real test is "changes the commodity list from a summary row" (`identification.fit.spec.js:562`). It checks only that Change opens commodity selection, not the return. Use the real title. Then drop the FIT link from SCN-IDENT-001-D, or add a test that checks the return, and recompute that scenario's coverage. `tim spec lint` stays green because it doesn't check that linked test titles exist, so that's worth adding to the lint.

### Also needs fixing

4. **`check-your-answers/spec.md:275`: ID collision with open PR #155.** #155 already uses REQ-CYA-014 / SCN-CYA-014-A..C for the amendment review. Whichever PR merges second will give one ID to two requirements. Renumber one of them.
5. **`check-your-answers/spec.md:276`: the amendment half of REQ-CYA-014 isn't a product decision yet.** It rests on the question raised on the ticket on 15 Oct, which has no reply. Also, "whose submitted species keep the value they were sent with" overstates. `refusal.js:29-33` skips every journey that isn't a draft, so a line added during an amendment isn't checked either. Get the answer on the ticket, then say plainly that no species on an amendment is checked.
6. **`check-your-answers/spec.md:294`: SCN-CYA-014-C only states an absence.** It would still pass if an amendment were refused on Continue with no message. State the positive outcome: "the user moves on to the declaration".
7. **`commodity-selection/spec.md:46`: scenario names drop part of their THEN** (the same problem as #27, now on the new scenarios). 003-C's name says "by Latin name" but its THEN says "alone". 003-D's name leaves out "by its Latin name alone". Align the names, and the copies in coverage.json.
8. **`commodity-selection/coverage.json:48` (minor):** the "finds cattle by their common name" FIT link is `full`, but it checks only the 0102 group, not Bos taurus under 01061900. Mark it `partial`, as was done for buffalo.
9. **`commodity-selection/coverage.json:66` (minor):** the coverage strengths on 003-C read backwards. The reference-data IT, which never looks at the page, is `full` with no red probe recorded. The e2e grouping test checks every group and species for 0102, but is `partial`. Probe the e2e test red, mark it `full`, and mark the IT `partial`. The IT is also typed `unit` when it's an integration test.

Note: these PRs cite `workareas/reviews/EUDPA-617/walk-second-pass/decisions.md`, but I couldn't find it. If any of the above was put off on purpose, please point me to the decision.


### ami-nav 2026-10-29T12:32:09Z

**Walk note on (3) — coverage title for the summary-row FIT: Won't Fix on 617.**

617 did not change that test. Its title has always been `changes the commodity list from a summary row` (Change opens search only). The longer coverage title was added in design-snagging follow-ups #164.

### ami-nav 2026-10-29T12:42:49Z

**Walk note on (4) — REQ-CYA-014 ID clash with #155: Won't Fix on 617.**

617 created `REQ-CYA-014` (species check) and merged it on 27 Oct. #155 is still open and reused that ID for the amendment heading. 617 keeps 014. #155 takes a new ID when it merges.

### ami-nav 2026-10-29T12:57:56Z

**Walk note on (5) — amendment half of REQ-CYA-014: Fix.**

The spec now matches the code: drafts are checked, amendments are not. Dropped “whose submitted species keep the value they were sent with”.

Final confirmation is still waiting on Monica (ticket 15 Oct: whether a line added or changed on an amendment should use today’s MDM).

### ami-nav 2026-10-29T13:16:15Z

**Walk note on (6) — SCN-CYA-014-C THEN: Fix.**

THEN is now the positive outcome: on an amendment, Continue moves on to the declaration (and the species is not named).

This scenario will change if Monica confirms that a line added or changed on an amendment should be checked against today’s MDM.

### ami-nav 2026-10-29T13:25:13Z

**Walk note on (7) — 003-C/D scenario names: Fix.**

Headings now include the THEN’s “by Latin name alone”, same pattern as 003-A. Coverage.json copies match. No further edit.

### ami-nav 2026-10-29T13:29:10Z

**Walk note on (8) — cattle common-name FIT strength: Fix.**

That FIT is now `partial`. It searches cattle and checks the 0102 group only, not Bos taurus under 01061900. SCN-COMMODITY-SELECT-003-A stays `full` via the e2e.

### ami-nav 2026-10-29T13:38:32Z

**Walk note on (9) — 003-C coverage strengths: Fix (partial).**

The reference-data IT is now `partial` (recorded as `unit`, the nearest type). It flattens the MDM 0102 commodity row; it never looks at the page.

The e2e grouping test is the page witness (every 0102 species), but it is still `partial`: animals-frontend, reference-data and stub were down, so it was not red-probed. SCN-COMMODITY-SELECT-003-C is `partial` until that probe.

### ami-nav 2026-10-29T13:47:59Z

**Walk note on (9) — 003-C coverage strengths: Fix (complete).**

E2e grouping test red-probed: `speciesLabel` inverted to `PROBE-INVERT` went red (0102 first checkbox expected Bos, got PROBE-INVERT), restored went green. That link is now `full`. SCN-COMMODITY-SELECT-003-C is `full` again. The IT stays `partial`.

