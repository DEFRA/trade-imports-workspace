# Stub tidy-up: real MDM against the stub

Read-only comparison, 9 October 2026. Real = `captures/raw/` (copied from CDP test's MdmClient debug log, 09:08 UTC).
Stub = `trade-imports-stub` on `main`. CDP log masking replaced fragments with `******` (anything around a key containing
"name", and one field in each port's `status`), so the raw files are not valid JSON and masked values are never guessed.

## Summary

- **Ports:** the right 78 ports with the right names, duplicates and misspellings included. But each stub record is
  cut down to `id`, `code` and `name`. Real records also carry `traffic` (Airport 18, Port 59, Rail 1), the address,
  `countryCode` and `status`. The only name difference is GB MID's non-breaking spaces.
- **Countries:** the stub returns 31 cut-down records whatever is asked. Real MDM returns 250 unfiltered, and filters
  itself when `blocks` is set (32, GB included). `independent` is `false` in all 250 real records, so the stub's
  all-false values are correct, not a fault. The earlier finding said otherwise.
- **reference-data** needs `traffic` mapped through for req-304. No reference-data test counts change.

## Ports (`getPorts.json`, 78; stub 78)

| Key | Real | Stub |
|---|---|---|
| `id` | UUID | "1"–"78" |
| `activeFrom`, `activeTo` | always null | missing |
| `code`, `name` | yes (name masked; recovered by code from `cdp-test--ports-of-entry.json`) | yes |
| address: `building…` (key masked), `townCity`, `county`, `postCode` | yes (35 records blank) | missing |
| `countryCode` | always GB | missing |
| `traffic` | 78 of 78 | missing |
| `status{code, description, <masked>}` | always active / Approved-Live | missing |

- **Airport (18):** DYC BHM EMA EDI LGW GLW LHR LUT MAN STN MME CBG CVT FBO HUY LPL NHP PIK. **Rail (1):** GB FOL
  Folkestone. **Port:** 59.
- Same code sets both ways. All names match, including PED/PEM Pembroke, GBSHS/GB SHS Sheerness, "Portsmouth  Port",
  "Teestort" and "TILBURY". Only GB MID differs: real uses non-breaking spaces.
- Real order: airports with addresses, ports with addresses, FOL, then the 26 address-less records by code. The stub
  orders A to Z by name.

## Countries (`getCountries-GBNAG.json`, 250; `getCountries-SPS.json`, 32; stub 31)

- **Real shape:** `id{content,schemeId,schemeAgencyId}`, `countryUUID{…}`, `ISONumeric`/`alpha2`/`alpha3{value, list…}`,
  `longName`*, `name`*, `independent`, `statusName`*, `system`, `systemAlias`, `systemAlpha2`, `systemAlpha3`,
  `systemLongName`, `effectiveAlpha2`, `effectiveAlpha3`, `effectiveLongName`*, `subDivisions`,
  `blocks[{name*, includeCountry, tags}]`. `effectiveAlias` sits inside a masked span. reference-data maps names from
  it, so it exists. (* = masked.)
- **Real subdivisions:** `id{…}`, `code{value, list…}`, `name`*, `countryCategory{categoryID, categoryName*}`, `blocs[]`.
  FR 6, PT 2 and ES 1 carry `["OMR","GBNAG_SPS_EX"]`. GB-NIR carries `["EU_SPS_ALIGNED","GBNAG_SPS_EX"]`.
- **Stub shape:** the 15 flat `MdmCountry` keys only. Subdivisions are `{code{value}, name}`.
- **Blocks:** 32 countries carry 64 block entries: "… Union" 27, ".../EFTA" 4, `GBNAG_SPS_EX` with `includeCountry`
  true 31, and GB with two entries, both `includeCountry` false.
- **The SPS call** returns exactly the 32 records that carry blocks, GB included, identical to the unfiltered ones. So
  MDM filters on the block being present, not on `includeCountry`, or GB comes in through its GB-NIR bloc.
  reference-data then drops GB, which gives 31.
- **For the 31 shared countries:**
  - **What differs:** `system` (stub "iso", real "gbnag"), `systemLongName` (stub null), the stub lacks the EU or EFTA
    block, and its subdivisions have no `blocs`.
  - **What matches:** names, `independent` and the subdivisions.
- **The stub lacks 219 codes,** GB included.

## reference-data changes for req-304

- `client/MdmPortOfEntry.java:16`: add `traffic`.
- `portsofentry/PortOfEntry.java:16,20`: add `traffic` and map it.
- `portsofentry/PortsOfEntryController.java:28`: replace the case-sensitive `Comparator.comparing(PortOfEntry::getName)`.
  Sort airports first, then the rest A to Z, ignoring case. Normalise non-breaking and doubled spaces before comparing.
- Tests: add `traffic` to `src/test/resources/integration/mdm-poe-response.json`. Rewrite `PortsOfEntryControllerIT:33-44`
  for airports first.
- **Rail (Sam, 9 Oct):** its own group after the seaports. The order is airports, then seaports, then rail, each A to Z
  ignoring case.

## Stub changes

- **Ports fixture.** Regenerate `responses/portsOfEntryResponse.json` from `raw/getPorts.json`:
  - keep the real order, UUIDs, `traffic`, address fields and `status{code, description}`
  - take each name by code from `cdp-test--ports-of-entry.json`, keeping GB MID's non-breaking spaces
  - leave out the masked `status` field and the masked `building…` key
  - restore `townCity` for AYR, FRB and GRK
- **Countries fixture.** Regenerate `responses/countriesResponse.json` from `raw/getCountries-GBNAG.json`, with all 250
  records in real order:
  - take `effectiveAlias` by code from `cdp-test--countries.json` (249; GB's is masked)
  - leave out the masked name fields, unless a value is clearly marked as derived
  - use `GBNAG_SPS_EX` for the 31 proven block entries and GB's matching one, and leave out the masked block names
- **Pass-through.** Serve both fixtures as `JsonNode` passed through unchanged, or extend the stub's models. Today the
  stub drops any field its models don't know.
- **`CountriesController`.** When `blocks` is set, return only the records carrying that block, whatever
  `includeCountry` says, in order: 32 for the SPS call, 250 otherwise.
- **`FileUtilsTest`.** Port count and first port still hold. Switch the countries name check to `getEffectiveAlias`,
  because record 0 becomes Aruba. Add a test for the `blocks` filter: 32 with it, 250 without.
- **Downstream:**
  - **INS tests:** the animals type-ahead count (41) in `trade-imports-ins-tests` is unchanged.
  - **Local stack:** unfiltered country lists go from 31 to 249, so any E2E spec that counts them needs checking.
