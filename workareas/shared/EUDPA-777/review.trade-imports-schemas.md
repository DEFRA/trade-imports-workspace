# Repository Review: trade-imports-schemas

**PR:** #71  
**Commit reviewed:** `4331b68d64ba8deee7e5157ea785b4deaabedf9d`  
**Files Changed:** 3

## Summary

Documentation-only: `typeCode` on trade line items described as CN/reference-data resolved for live animals; V4 type-question mapping removed. Schema field kept for germinals; samples unchanged per AC.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md` | SAFE | 0 | 0 | 0 |
| `schemas/profiles/imports/gb/gbn-ag-v1.schema.json` | SAFE | 0 | 0 | 0 |
| `schemas/profiles/imports/gb/pims-data-mapping.md` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Meets ticket constraint: no version bump, no sample edits.

## Risk Assessment

**Overall Risk:** Low  
**Rationale:** Optional heading/urlId polish only.

## Items

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | schemas/profiles/imports/gb/pims-data-mapping.md | 1 | Minor | comments | Section heading Type selection still uses V4 journey step name though body says live animals do not journey-source typeCode. | heading does not imply a journey type question for live animals. | retitle section to reflect CN-resolved typeCode or PIMS row semantics. |  |  |  |
| 2 | schemas/profiles/imports/gb/gbn-ag-data-dictionary.md | 118 | Minor | comments | urlId row still reads as if every line with typeCode uses the sibling codelist URL; live animals no longer send typeCode. | urlId description matches conditional typeCode wording (germinals only). | qualify row like the typeCode entry. |  |  |  |

## Repository Verdict

**Status:** SAFE (Minor doc polish optional)
