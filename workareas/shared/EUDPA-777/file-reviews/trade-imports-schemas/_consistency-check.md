# Consistency Check: trade-imports-schemas

**Ticket:** EUDPA-777
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-backend, trade-imports-ins-tests, trade-imports-schemas, trade-imports-address-book, trade-imports-workspace
**PR:** #71 | **Commit:** 4331b68d

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Document `typeCode` as CN-resolved, not journey-sourced for live animals | backend ✅ (omits on wire), frontend ✅ | ✅ Three doc edits in mapping, dictionary, schema JSON | CONSISTENT |
| Keep `typeCode` on `gbnAgTradeLineItem` for germinals | — (samples unchanged per ticket) | ✅ Field retained, samples untouched | CONSISTENT |
| Remove claim that V4 type question populates `typeCode` | — | ✅ `pims-data-mapping.md` row updated | CONSISTENT |

## Missing Changes

*None identified.* Ticket explicitly excludes new schema versions and sample changes; no peer repo expects a schemas bump.

## Unique Changes

Documentation-only PR — intentional per ticket.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md:118` | `urlId` row still reads as if every line with `typeCode` uses the sibling codelist URL; `typeCode` row now qualifies live animals | `urlId` description should match the conditional `typeCode` wording | Optional doc polish: note `urlId` applies when a germinal sender sends `typeCode` |

*Low severity; contract behaviour unchanged.*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `pims-data-mapping.md` § "Type selection" heading | Section title still "Type selection" (V4 journey step name) | Body says live animals journey does not send `typeCode` | Heading could be retitled (e.g. species form / `typeCode`) or left as PIMS row label | Optional — body satisfies AC; heading is legacy V4 vocabulary |

*Searched pinned clone: `V4 row 8`, `typeOfCommodity`, `commodityType`, `Type selection populates` — no stale journey-sourcing claims remain outside the heading note above.*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 cross-repo inconsistencies; 1 optional internal doc polish (urlId row)
**Summary:** Schema documentation matches backend and frontend behaviour; field kept for germinals as required.
