# EUDPA-776 verification: trade-imports-performance-tests PR #47

Head `60c0dcdf`, reviewed at `5c909366`. Items 1-3 were merged into #4. No author replies on the PR, inline or top-level.

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 4 | Major | FIXED | Commit `3123a86` ("end the live animals draft at transporters") deletes `openingRunFromTransporter` and `OPENING_RUN_DOCUMENTS_SLUG`. At head, `src/k6/live-animals.js` `LIVE_ANIMALS_STEPS.draft` ends at `transporters` (line ~220), and the diff against main (`2175965`) only removes the `contact` step. A grep for `openingRun`, `OPENING_RUN` and `opening-run` across `src/` finds nothing. The only `contact` hits left are for the plants journey (`high-risk-plants.js:166`, `journey-endpoints.js:59`), which is right. Items 1, 2 and 3 are closed with it, because the step they were about no longer exists. |

## Still open

- None.

Note: `60c0dcd` ("stop declaring the removed Branch address type") is extra work on the PR (address-book roles) and is not tied to any review item.
