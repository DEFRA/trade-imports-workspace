# Repository Review: trade-imports-ins-tests

**PR:** #73
**Commit reviewed:** ada7a3ebfd3fc12b14e66b64f3bcf7e3efed8b9e
**Files Changed:** 8

## Summary
Page-object and spec fixes from the 29 Oct review. All of them are in, including the renamed journey helper that had no walk note.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `flows/animals/journey.ts` | SAFE | 0 | 0 | 0 |
| `page-objects/animals/animal-identification-page.ts` | NEEDS ATTENTION | 0 | 1 | 0 |
| `page-objects/animals/commodity-selection-page.ts` | SAFE | 0 | 0 | 0 |
| `tests/animals/e2e/features/additional-details-scope.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/animals/e2e/features/animal-identifiers-conditional.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/animals/e2e/features/cph-scope.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/animals/e2e/pages/commodities.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/animals/e2e/visual/identification-card.visual.spec.ts` | SAFE | 0 | 0 | 0 |

## Positive Observations
speciesCardTitles now proves that no card is drawn, and the group checks are exact and ordered.

## Test Coverage
- Unit tests: Not applicable.
- Integration tests: Not run in this review; CI is green.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Test code only, with one structural item.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | page-objects/animals/animal-identification-page.ts | 36 | Major | structure | enterDetailsHeadingText (line 36) was added so specs could share the heading format, but no spec calls it: both specs moved to the enterDetailsCounterHeading locator, and a grep of tests/, flows/ and page-objects/ finds its only caller at line 42. The PR therefore adds a public string method with one caller, inside the same class, around a template that enterDetailsCounterHeading already held inline. The house rule is that a literal used by one function lives in that function. | the 'Enter details for {latinName} {current} of {total}' format has one home, with no public member that nothing outside the class uses. | put the template back inline in enterDetailsCounterHeading and delete enterDetailsHeadingText; if a spec later needs the raw text, extract it then. |  |  | Reverses our 29 Oct advice: that review suggested adding enterDetailsHeadingText so specs could share the text. Nothing outside the class needs it now. |

## Repository Verdict
**Status:** NEEDS ATTENTION
