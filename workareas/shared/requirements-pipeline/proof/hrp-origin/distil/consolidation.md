# Consolidation

Adopted requirements: req-001 to req-011. req-012 (the list is current) is a question, not a behaviour; its default sits on the envelope as an invariant. Every slice spans frontend, backend and tests.

## Pass 1: thin slices

- S1: the importer chooses and saves one country of origin (req-001)
- S2: the country page's caption, heading, tab title and single button, reached after the import type (req-002, req-005)
- S3: the error when no country is chosen (req-003)
- S4: the country shown back by name, not code (req-004)
- S5: the importer gives a commodity code for a commodity line (req-006)
- S6: the importer chooses a category for a commodity line (req-007)
- S7: the importer filters reference data and adds a genus and species, with its EPPO code recorded (req-008)
- S8: several genus and species added; any but the last removed (req-009)
- S9: the error when none is added (req-010)
- S10: the importer gives the quantity of a commodity line (req-011)

## Pass 2: combined

- inc-001 = S1 + S2 + S3 + S4. The same page and the same saved answer. Building them apart would repeat the set-up and ladder. Open question c-006 (error wording) has a default.
- inc-002 = S5 + S6. Both are single answers on the same new record, the commodity line. Open question c-002 (category list) has a default.
- inc-003 = S7 + S8 + S9. One picker on one page acting on one list. Open questions c-001 (genus and species for every line) and c-006 have defaults.
- inc-004 = S10 on its own. It shares the commodity line with inc-002 but carries its own open question (c-003, what is counted and in what unit) that could reshape the field.

req-005 (country before the commodity questions) sits in inc-001 and is also an envelope invariant, so each later commodity increment keeps the order.
