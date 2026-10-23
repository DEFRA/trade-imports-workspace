# Repository Review: trade-imports-workspace

**PR:** #135
**Commit reviewed:** f7d977cd529d089ca4abd13cd88d9d1cdcf14ed4
**Files Changed:** 15

## Summary
Updates the live-animals Behaviour Spec for MDM commodity search: commodity selection, the commodity obligations, check your answers, commodity details and identification details, with their coverage links. It also documents the new reference-data and stub behaviour, including the MDM gaps the AC asks to record, and amends the GBN-AG lineage audit.

<!-- FILE_SUMMARY -->

## Positive Observations
- Every coverage link touched names a test that exists at the reviewed commits and asserts its scenario.
- The reference-data doc records the unsupported search behaviour the AC asks for, such as partial matches and the 25-result cap.

## Test Coverage
- Not applicable (docs and spec). Two `full` coverage links on SCN-COMMODITY-SELECT-003-A prove only the common-name half of the scenario.

## Risk Assessment
**Overall Risk:** High
**Rationale:** Three spec requirements settle as MUSTs things the ticket decided differently or left open: the permanent address by species alone, the ten-result cap, and what happens to a draft whose species MDM removed. The code follows the spec, not the ticket.

<!-- ITEMS -->

## Repository Verdict
**Status:** RISKY
