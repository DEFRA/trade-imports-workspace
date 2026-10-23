# Repository Review: trade-imports-stub

**PR:** #26
**Commit reviewed:** 60be5df2892b87d7c2bdc5628eec2802d0373670
**Files Changed:** 10

## Summary
Adds a stubbed MDM product API (`/mdm/trade/product/search`, `/commodities` and `/commodities/{code}/species`) backed by saved TST responses. It also moves the MDM trace header into a shared `MdmStubResponses` and adds the product paths to the latency and fault profiles.

<!-- FILE_SUMMARY -->

## Positive Observations
- The saved search responses cover every AC term and every E2E search term. The commodities fixture flags exactly the two germinal codes.
- The trace-header refactor keeps behaviour the same and is tested on all three controllers.

## Test Coverage
- Unit tests: cover search, commodities and species, but no test reads a saved species page other than page 0.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** Species pages are saved for only four codes. Any other code the saved searches offer, such as a pig or a donkey, is reported as no longer listed, so the docker-compose stack refuses valid drafts at check your answers. The species path also escapes the latency and fault profiles.

<!-- ITEMS -->

## Repository Verdict
**Status:** NEEDS ATTENTION
