# Repository Review: trade-imports-reference-data

**PR:** #36
**Commit reviewed:** c8a8ee28147e1082d4b98fb0969b49496f46b9ec
**Files Changed:** 29

## Summary
Adds `GET /commodities` (an MDM `/search` proxy that groups species by CN code and drops germinal codes) and `POST /commodities/species-check` (a check that each line's Latin name is still listed under its code). It adds three MDM Feign calls with timing metrics and two lookup metrics, plus unit tests and WireMock integration tests.

<!-- FILE_SUMMARY -->

## Positive Observations
- The integration path is frontend → reference-data → MDM, as the ticket requires. The new Feign calls follow the existing countries and ports pattern, and every call is measured: `everyFeignMethod_shouldBeMeasured` guards this.
- Tests mock only `MdmClient` (the network edge) and use the real `MdmService`. The ITs prove the germinal filter, the page clamping, the short-term guard and the species check.
- The search behaviour matches the 14 and 15 Oct decisions: germinal codes are excluded by `isGerminal` only, results come back as one page of up to 100, and species are grouped by code.

## Test Coverage
- Unit tests: good, with gaps. Nothing covers an MDM body with null content, an empty or unknown-type row, or the species-check paging stop.
- Integration tests: present. The grouping IT uses a single code, so it cannot prove grouping across several codes.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** An empty or missing MDM body is treated as a real empty answer, so a species check can refuse valid drafts and a search can return nothing instead of 503. Neither endpoint validates its input.

<!-- ITEMS -->

## Repository Verdict
**Status:** NEEDS ATTENTION
