# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #188 | **Commit:** 18d2c42

trade-imports-animals-backend#114 is an EUDPA-296 PR and is left out. Findings already in `file-reviews/trade-imports-workspace/*.review.json` are not repeated. That includes the ticket's 29 Oct answers on when species are checked and on amendments, and the ID clash on REQ-CYA-014.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Branch `fix/EUDPA-617-review-followups` | animals-frontend ✅, ins-tests ✅, reference-data ✅, stub ✅ | ✅ Present | CONSISTENT |
| FIT titles renamed by animals-frontend#449 | animals-frontend ✅ `saves a Canis familiaris identified only by its microchip and reads the number back` | ❌ `identification-details/coverage.json:138` keeps `saves a dog ...` | INCONSISTENT |
| Other titles #449 renamed (`and marks the row Completed`, `a horse for its microchip first`, `a cat card`, `has not just been refused`) | animals-frontend ✅ | ✅ No coverage link names them | CONSISTENT |
| Test links added by this PR for REQ-CYA-014 | animals-frontend ✅ all three titles found | ✅ | CONSISTENT |
| Two kinds of MDM row, and capture keys | reference-data README ✅, stub ✅ | ✅ | CONSISTENT |

## Missing Changes

The link at `identification-details/coverage.json:138`, set out below. The other PR renames the test, and this is the PR that owns the link, so the fix belongs here on the same branch.

## Unique Changes

*None identified.* Every change is a doc, spec or coverage catch-up with the service PRs.

## Naming and Reuse

*None identified.*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `openspec/coverage/live-animals/journey-pages/identification-details/coverage.json:138` | SCN-IDENT-005-A links the FIT `saves a dog identified only by its microchip and reads the number back` at `full` strength. | animals-frontend#449 renames it to `saves a Canis familiaris identified only by its microchip and reads the number back` (`identification.fit.spec.js:761`). Once #449 merges the link names a test that does not exist, and `tim spec lint` does not check linked titles, so nothing will catch it. This is a new break from this PR set, not the older summary-row link ami-nav closed as Won't Fix. | The link names the test as it is called at the frontend commit. | Change the `test` value to the new title, as this PR already did for `sums two 0102 species ...` on lines 17 and 28. |
| `openspec/coverage/live-animals/journey-pages/identification-details/coverage.json:28` | Minor. On a line this PR changed, the note still says "Cow row lists both Latin names with 5 animals". | The new title says 0102 because rows are keyed by code. The FIT has no "Cow": it checks a row by `code: BOS_TAURUS.commodityCode` (`identification.fit.spec.js:543-547`). | The note describes the row the test checks. | "the 0102 row lists both Latin names with 5 animals; not probed". |

*Also searched, with nothing further found: `MdmUnusableResponse`, `no usable answer`, `MdmStubMvc`, `animalsQuantityInputUnder`, `addCommodityToCurrentNotification`, `Bos spp` across `docs/` and `openspec/`; `Game`, `Domestic`, `logRefusal` across `openspec/specs/`, `docs/best-practices/` and `.claude/rules/`; `503`, `500` across `openspec/specs/` and `docs/repos/trade-imports-reference-data.md`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found, 1 of them minor
**Summary:** The coverage file needs one link updated for a FIT that #449 renames, and one note brought up to date on a line this PR already changed.
