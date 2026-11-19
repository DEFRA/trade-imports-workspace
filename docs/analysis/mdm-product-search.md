# MDM product search: what TST returned

A point-in-time record, not a reference. It describes the responses saved in
`trade-imports-stub` (`src/main/resources/responses/mdmProductSearchResponses.json`
and `mdmProductSpeciesResponses.json`) as captured from MDM TST on 2026-11-10
(stub commit `d0f331d`), after the GBNAG release. The investigation began under
EUDPA-617 in October 2026, against TST before that release, and was re-checked
under EUDPA-786.

Every count and species name below is from one of those two captures. A later
capture will differ: read the saved responses for the current answers, and
re-run the capture before relying on anything here. The lasting rules are in
[`docs/repos/trade-imports-reference-data.md`](../repos/trade-imports-reference-data.md#mdm-commodity-search-behaviour).

## Two kinds of row

- The keys `cattle`, `Bos taurus`, `0102`, `01061900`, `010` and `ostrich` show
  species and commodity rows side by side.
- October: the `01061900` commodity search row nested 100 names, while
  `GET /mdm/trade/product/commodities/01061900/species` held 1,234, so the
  nested list was not the full catalogue.
- November: the `01061900` search row nests 99 names, and the saved species
  list for `01061900` holds the same 99.

## What a search matched (November)

- `cattle` (common name): 4 species rows. Bos taurus and Bos sp. under 0102,
  then Bos taurus under the germinal codes 05111000 and 05119985.
- `Bos taurus` (Latin name): 3 species rows, under 0102, 05111000 and 05119985.
- `0102` (code): 1 commodity row with 7 species nested. `010` returns 45
  commodity rows.
- `ostrich` (description): species rows for Struthio spp. under 01063300 and
  04071919, plus the 01063300 commodity row nesting Struthio spp., Dromaius
  novaehollandiae, Rhea spp., Dromaius and Casuarius spp.

## Partial terms (November)

- `cat` returns 8 rows: Felis catus, Catagonus spp. and Panthera sp., and the
  cattle rows.
- `ca` returns 6 rows (Dasyuromorphia, Equus cabalus, Equus cabalus\*asinus,
  Otra Carnivora, Equus caballus, Rangifer spp.), and not cattle, goats (Capra)
  or dogs (Canis).
- `Bos spp.` returns 1 row, 01061900 Boselaphus spp., and not Bos sp.

## What came back

- November: MDM flags 05111000 and 05119985 `isGerminal: true`. October: TST
  left the flag unset, and the stub set it by hand.
- November: Bison bison is under 0102 and the germinal 05111000. Felis catus
  and Canis familiaris are under 01061900 and the germinal 05119985.
- November: every species row and nested name has a common name. October: TST
  had species with none (Catagonus, Equus cabalus\*asinus) and placeholder
  names ("Animals" for Poephagus spp., "Pig-deer?" for Babyrousa, now
  "Babirusas").
- November: `01061900` holds all three spellings the permanent-address rule
  lists: Felis catus, Canis familiaris and Mustela putorius furo.

## Follow-ups with MDM

The gaps found are recorded as the MDM follow-ups on the EUDPA-617 ticket.
