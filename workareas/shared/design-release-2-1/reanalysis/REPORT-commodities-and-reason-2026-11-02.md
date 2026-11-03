# Commodities and import reason (EUDPA-693): re-analysis against main

> **Correction, 2 November, after review.** This report's first pass kept **inc-012 blocked** on a
> commodity-naming question, and called camel and ornamental fish a "data gap" to chase with the MDM team. Both were
> wrong. **inc-012 is dropped**, and there is no data gap.
>
> Two things were missed. **Provenance:** every criterion behind the named catalogue traces to claims of
> `kind: "data"` extracted from the prototype's own hard-coded demo files at commit `04a073b` —
> `app/data/commodities.js:10-25` for the names, `app/data/commodities-0102-species.js:3-15` for the 11 cattle
> species. Designer's stand-in data for a catalogue that did not exist yet, not a statement of requirement. The
> prototype's declared role covers "every page, field, option, hint, error message, branch and journey step"; a
> reference list's *contents* are not in that set.
>
> **The governing ruling,** claim 25 of `ruling:sam-2026-10-09`:
>
> > Every list is built now against reference-data as it is, and its content is what MDM serves. Where a list's
> > content differs from Design Release 2.1, that is **MDM's content to change, never a reason to block a row or
> > edit a list in code.**
>
> Claim 28 of `ruling:sam-2026-10-09-pm` carved commodities out of that only "until commodities come from MDM", and
> said that once they did, "the area is re-distilled". They came on 27 October, so the carve-out has expired and
> claim 25 governs commodities exactly as it governs countries and ports. Claim 2 of the same ruling says it again
> for search boxes — "List entries: they are whatever MDM serves through reference-data", with only "how the list
> reads" following the prototype, and then only "wherever the component can show them".
>
> **Net effect:** 8 rows `todo`, 1 `dropped` (inc-012), 1 `blocked` (inc-024, on a product question). No row is
> blocked on MDM. The sections below are the original pass; read them against this correction.
>
> **Lesson for the method:** a prototype claim of `kind: "data"` is a fixture, not a requirement. Where a row's
> criteria rest on such claims and a ruling assigns that data to another system, the row is a candidate to drop
> rather than rewrite. Worth a check in distil: list-content criteria sourced only from `kind: "data"` prototype
> claims should be challenged against claim 25 before they reach a row.

Checked on 2 November against `origin/main` of the animals frontend (`e1237ac7`), the tests repo (`196f2f5`), the
performance tests (`8f6c10a`), reference-data (`d090d31`) and the stub (`5cf8a70`), after the MDM commodity
integration completed: EUDPA-617 merged to the frontend on 27 October (`c3183a8e`) with review follow-ups on
30 October (#449), reference-data's follow-ups the same day (`d090d31`), and the stub's MDM responses recaptured from
TST on 30 October (`5cf8a70`).

The 27 October re-analysis covered the parent backlog's nine remaining themes. This theme had already been split off,
so it was not in that set; this is its first re-analysis. The full verdict per row, with file and line evidence, is in
[`themes/commodities-and-reason.json`](themes/commodities-and-reason.json).

## Summary

- **The MDM block is lifted for three of the four blocked rows.** inc-013 (sorted and bolded results, removable
  species chips), inc-019 (poultry by rail) and inc-023 (unweaned for pigs) lose their only reason to wait. All three
  become `todo`.
- **inc-012, the catalogue row, stays blocked — but for a new reason.** The data arrived; the names did not. MDM
  serves no trader-facing commodity name, so four of its eleven criteria are undeliverable as written. It now waits on
  a product decision, not on the MDM team.
- **Two criteria are already met on main** and leave inc-012: the k6 search term has moved off "Cow" to
  `Bos taurus`, and Fish (0301) is no longer offered.
- **The three `todo` rows all stand**, and inc-015 is more urgent than it reads: the k6 walk is now out of step with
  main, not merely behind the design.
- **Three new rows.** A ruling needed on the package-question list, a species-label regression, and a stale fixture.
- **The theme is playable.** Both `landsAfter` conditions are met.

## What the MDM integration actually delivered

reference-data serves `GET /commodities` from MDM's product search, dropping anything MDM flags `isGerminal`
(`CommoditySearchService.java:43`, `:103`). The frontend reads it (`services/commodities/client.js:7-16`). The
catalogue went from five stub commodities to 26 selectable chapter-01 codes.

| What DR2.1 asked for | What MDM serves |
|---|---|
| Pig 0103, Sheep 010410, Goat 010420 | The same codes |
| Chicken 010511, Turkey 010512, Duck 010513, Goose 010514, Guinea fowl 010515 | Each at eight digits, and each **twice**: 01051111 and 01059400 for chicken, 01051200 and 01059930 for turkey, 01051300 and 01059910 for duck, 01051400 and 01059920 for goose, 01051500 and 01059950 for guinea fowl |
| Rabbit 010614 | 01061410 and 01061490 |
| Parrot 010632, Ostrich 010633, Reptile 010620, Bees 01064100 | 01063200, 01063300, 01062000, 01064100 |
| Camel 010613 | **Nothing.** No 010613 or 01061300 in MDM's chapter-01 tree, and no `Camelus` species anywhere in the capture |
| Ornamental fish 030111 | **Nothing.** A search for "fish" returns `totalElements: 0`, and the GBN-AG dataset holds no chapter-03 code |
| — | Four codes DR2.1 does not list: Birds of prey 01063100, Pigeons 01063910, other birds 01063980, other insects 01064900 |

## The one thing MDM cannot give: a commodity name

This is the finding that keeps inc-012 blocked, so it is worth stating plainly.

reference-data's `CommodityGroup` carries a code and a list of species, nothing else
(`CommodityGroup.java:13-16`), and `CommoditySpecies` carries a Latin name and an optional common name
(`CommoditySpecies.java:15-20`). There is no commodity name in the contract, so the frontend shows the bare code
everywhere. `legendFor` is the identity function on the code (`search/view-model/labels.js:1`), and it feeds the
result groups, the selected panel and — through `buildCommodityGroups`, where `heading: code`
(`commodities/view-model/commodity-groups.js:6`) — Commodity details and the Selected commodities tables.

MDM's commodity rows *do* carry a `description` that reference-data drops. It is CN tariff text, not a name:

| Code | MDM's description |
|---|---|
| 0102 | Live bovine animals |
| 0101 | Live horses, asses, mules and hinnies |
| 0103 | Live swine |
| 01061900 | Other |
| 01061490 | other than. 0106 14 10 |
| 01063980 | other than  0105; 010631; 010632 and 01063910 |
| 01051111 | Weighing not more than 185 g:Fowls of the species Gallus domesticus, Grandparent and parent female chicks: Laying stocks |

So passing the description through would not produce "Cattle". And it could never produce DR2.1's split of
**01061900** into Cat, Dog, Ferret and Other live mammals, because that is one CN code whose description is "Other".
Main takes a different route for it: `PER_SPECIES_CODE` renders 01061900 as one row per species (`rules.js:112`),
which arguably delivers DR2.1's intent without naming the commodity at all.

Three questions go to Sam on the row rather than being guessed:

1. Where does a trader-facing commodity name come from — a service-owned name table over the CN codes, MDM's
   description cleaned up, or the code alone as main ships today?
2. Does DR2.1's four-way split of 01061900 survive, given MDM cannot express it and main already renders that code
   per species?
3. Are camel and ornamental fish dropped from the catalogue, or chased with the MDM team?

## Criteria that leave inc-012 because main already does them

| Criterion | Where on main |
|---|---|
| The k6 suite searches a term the new catalogue matches, not "Cow" | `perftests src/config/test-data.js:5` already searches `Bos taurus`, and MDM returns nothing for "cow" |
| Fish (0301) with Atlantic salmon is no longer offered | MDM serves no chapter-03 code. Kept as a regression check; the Ornamental fish half of the same criterion is undeliverable |

One more criterion is dropped rather than met: "every species name reads exactly as DR2.1 gives it" is contradicted
by the theme's own invariant that a search box's entries are what MDM serves.

## Rows rewritten

| Row | What changed |
|---|---|
| inc-012 | Criteria 8 and 11 dropped. Criterion 1 restated against MDM's real eight-digit codes. Criteria 3 to 6 restated as "the species MDM lists, by its own names", keeping only the behaviour DR2.1 settles (cat, dog and ferret need a permanent address; Other live mammals does not). Criterion 7 cut to its regression half. Criterion 9 moved to its own row. Criterion 2 left as the one thing still blocking, with three open questions. Two stale notes corrected |
| inc-013 | Unblocked. Criterion 3's "Cattle (0102):" example becomes the code, with a note that it picks the name up when inc-012 lands. Notes added on which existing test criterion 1 rewrites, and on reusing `bold-matches.js` and `escape-html.js`. The stale `commodities.commodityLabel` note replaced with `legendFor` |
| inc-015 | Criteria unchanged. Note added that main has carried DR2.1's order since 13 October while the k6 walk has not, so this closes a real break |
| inc-018 | Criteria unchanged. Salvage path corrected to `features/transport/port-of-entry`. Note added that `requiredIntegerInRange` is already imported, so the packages half is a one-word change |
| inc-019 | Unblocked. Criterion 1's commodity restated to Chicken 01051111 (or 01059400), species `Gallus gallus`. `dependsOn: inc-012` dropped |
| inc-022 | Criteria unchanged. The note claiming the page "already passes `allowMissing: kit.isHubExit(request)`" removed — neither exists on main. `recoverableSave` returns `{ value, failure }`. Recorded that criterion 3's "no error, goes to the overview" half already holds |
| inc-023 | Unblocked. `dependsOn: inc-012` dropped. The note saying main keys the unweaned list on the name "Cow" replaced — `UNWEANED_CODES` is keyed on the code `0102`, so the change is adding `'0103'` |

## New rows

| Row | Why |
|---|---|
| inc-024 — Which commodities ask for a number of packages follows one agreed list | DR2.1 and main are near-inverses on the bird and insect codes. DR2.1 asks on nine mammal commodities only; main's `PACKAGE_COUNT_CODES` asks on 23 codes including every poultry code, reptile, parrot, bees and other insects, and omits 01061490, 01063300 and 01063910. Someone chose the opposite rule, so this needs a ruling, not a quiet overwrite. MDM's own `packageType` field, which reference-data does not read, is a third candidate |
| inc-025 — Species read as their common name with the Latin name in brackets again | A regression came in with the MDM search. `speciesLabel` returns the Latin name alone (`species-label.js:1`), so every page shows "Bos taurus" where it showed "Domestic cattle (Bos taurus)". DR1 parity had delivered this (`949bb9d6`); the data is still there. The tests followed the regression rather than catching it (`consignment-details.spec.ts:91-92`). inc-013's label format rests on this |
| inc-026 — The frontend's stub commodity fixture matches what the MDM stub serves | Two captures of the same data disagree. The frontend fixture (27 Oct, `c3183a8e`) gives `Bos taurus` the common name "Cattle or Cow"; the stub was corrected to "Domestic Cattle" on 28 Oct (`afb74c3`) and recaptured on 30 Oct (`5cf8a70`). Nothing fails today because no page shows a common name — but inc-025 makes it visible |

## Status changes

| Row | From | To | Why |
|---|---|---|---|
| inc-013 | blocked | todo | MDM was its only block. Every criterion is presentation work |
| inc-019 | blocked | todo | Poultry is in the catalogue. Code and species need restating to MDM's |
| inc-023 | blocked | todo | Pig is in the catalogue and the unweaned list is keyed on codes |
| inc-012 | blocked | **blocked** | The MDM half is gone; criterion 2 and the 01061900 split now wait on a product decision. Changing the status would hide that |

## Can the theme be played?

Yes. Both `landsAfter` conditions are met: journey foundation (EUDPA-691) merged on 13 October and design snagging
part A (EUDPA-720) on 23 October. Design snagging part B is not landed (#423 closed unmerged) but holds no
commodity-search or consignment-details row, so it does not hold this theme up — though its inc-214 (identification
details) does edit the commodity-grouped identification page, so whichever of inc-214 and a renamed-commodity row
lands second reuses the other's heading seam.

Two external dependencies that the rows still declare are now satisfied, and can be relied on rather than waited for:
journey-foundation inc-001 (the opening run's step order, which inc-012, inc-015 and inc-019 name) and inc-003 (the
shared soft save, which inc-022 names).

The stale branch `feat/EUDPA-693-design-release-2-1-commodities-and-reason` should be rebuilt from `main` per the
salvage notes rather than rebased: EUDPA-617 rewrote the whole commodity search feature, so the search-related
salvage commits will not apply.

## The two tickets in flight: EUDPA-669 and EUDPA-616

Checked 2 November, after the re-analysis above. **Neither unblocks inc-012**, and one of them makes it harder.

### EUDPA-669 — save commodity name, code and type for each commodity

Five open PRs, all updated today, on `fix/EUDPA-669-commodity-name-code-type`: animals frontend #432, animals
backend #115, ins-tests #55, performance tests #28, ins-backend #27. Rebased on `main`, so it is live against MDM.

**What it genuinely fixes** — the downstream half this theme never owned. A notification now persists
`commodities[]` with a per-entry name, CN code, description, totals and type, each species carrying MDM's
`commonName`, and the backend sends those to PIMS as the trade line description and common name instead of reusing
the first line's name on every line. That was a real bug (a cat shown as a cow) and it is fixed.

**Why it does not unblock inc-012.** It needs commodity names too, and it does not have them either. The branch adds
two hard-coded tables to `services/commodities/index.js`:

```js
/** MDM commodity descriptions (reference-data /commodities?codes=); stubbed until live lookup. */
const COMMODITY_DESCRIPTIONS = { '0101': …, '0102': 'Live bovine animals', '01061900': …, '0301': … }  // 4 of 26 codes

/** Persistence display names keyed by CN code. */
const COMMODITY_NAMES_BY_CODE = { '0101': 'Horse', '0102': 'Cow', '0301': 'Fish' }                      // 3 of 26 codes
```

The mapper reads `name: commodityNameFor(code) ?? code`, so for **23 of the 26 codes the commodity name sent
downstream and shown on both dashboards is the bare CN code**. The branch's own doc confirms it: "A notification
sends its first line's CN code (for example `0102`) as `commodity.name`, until reference-data supplies commodity
names."

So the naming gap is no longer cosmetic — it now reaches PIMS. And for this theme it gets worse: the branch pins
`'0102': 'Cow'` in the frontend *and* in the tests repo, where `domain/animals/constants/commodity-names.ts` is
exactly `{ '0102': 'Cow', '01061900': '01061900' }`. That is precisely the behaviour inc-012 criterion 2 exists to
change, now with a test holding it in place. It also lists `'0301'` Fish, which MDM does not serve at all.

**inc-024 (packages):** `PACKAGE_COUNT_CODES` is unchanged. The branch's doc offers a rationale — "where the design
named an entry by animal, the whole code is on the list" — which explains including 01061900 but not the poultry,
reptile, parrot, bee or insect codes DR2.1 names individually as *not* to be asked. The ruling is still needed.

**inc-025 (species labels):** `speciesLabel` and `legendFor` are both unchanged. So the common name is now stored on
every line and sent downstream while the trader still sees the bare Latin name. inc-025 stands.

### A defect on EUDPA-669's open PR: the dog has been replaced by the raccoon dog

`PERMANENT_ADDRESS_SPECIES` for 01061900 changes from
`['Felis catus', 'Canis familiaris', 'Canis lupus familiaris', 'Mustela putorius furo']` to
`['Felis catus', 'Nyctereutes procyonoides', 'Mustela putorius furo']`
(`services/commodities/rules.js:62-69`).

MDM holds both species under that code: `Canis familiaris` with the common name **"Dog"**, and
`Nyctereutes procyonoides` with the common name **"Raccoon Dog"**. As the branch stands, a trader importing a dog is
no longer asked for the animal's permanent address, and one importing a raccoon dog is.

Dropping `Canis lupus familiaris` is fine — MDM does not hold it. Dropping `Canis familiaris` is not. The branch's
own doc contradicts its code inside one paragraph: 01061900 "holds the domestic cats, dogs and ferrets that need
one", then "`Nyctereutes procyonoides` (MDM's raccoon dog) is listed for the permanent-address gate."

The likely cause is visible in the tests repo, named for what it is and found by the wrong search term:

```ts
raccoonDog: { searchTerm: 'dog', commodityCode: '01061900', latinName: 'Nyctereutes procyonoides' },
```

**No test catches it.** The permanent-address journey is exercised only with `domesticCat` (`Felis catus`), and the
`raccoonDog` fixture carries no `permanentAddress` answer, so the suite stays green with the dog gone. This breaks
inc-012's restated criterion 4, and it is a live defect on an open pull request rather than a backlog matter.

### EUDPA-616 — commodity search type-ahead

**Nothing is in flight.** All three PRs were closed unmerged on 23 October (frontend #425, ins-tests #51, workspace
#147) and the branch no longer exists on the remote — four days before EUDPA-617 landed the MDM search and rewrote
the feature. Jira still says In Dev, so the work is expected to resume, but it would be a fresh build.

The closed diff is worth quarrying: it was green on E2E, Lighthouse and the Sonar gate, and it built a reusable
`live-search` macro and client module outside the commodities feature, a `GET …/commodities/results` route rendering
the same `_results.njk` partial the page uses, and emphasis done properly — `matching.js` reporting the ranges it
matched and the template rendering them as `<strong>`, with no HTML built in JavaScript.

**It is a complement to inc-013, not a substitute.** EUDPA-616 delivers criterion 2 (bold matched text) and part of
criterion 3 (a selected panel) as a JavaScript enhancement, and its own acceptance criteria keep the server-rendered
flow unchanged as the no-JS fallback. inc-013 needs more: criterion 1 (alphabetical sorting) and criterion 4 (a
remove button per species chip) are not in EUDPA-616 at all, and criterion 5 requires those remove buttons to work
by posting the page, which a JS-only enhancement cannot satisfy. inc-013 owns the server-rendered behaviour;
EUDPA-616 owns the enhancement over it. Whichever lands second should reuse the other's matching and emphasis —
noting `main` already carries `src/client/common/helpers/bold-matches.js`.

**The ticket is stale** and should be re-read against `main` before it is picked up. Its tech notes still say "This
ticket builds the search against the existing (stub) commodity catalogue. A follow-up ticket is needed to pull
commodity codes from MDM as the real data source" — that follow-up was EUDPA-617, which has landed. It also
describes the page as printing "the whole commodity catalogue as fixed checkbox fieldsets on load", untrue since
design snagging.

## Calls I made

- **inc-012 stays blocked.** The brief was that MDM would unblock it, and for three rows it did. For this one the
  data arrived and revealed a question the ruling had hidden: DR2.1's catalogue is a curated presentation over CN
  codes, and MDM is the CN codes plus species. Marking it `todo` would hand a builder four criteria they cannot
  satisfy.
- **Criterion 9 became its own row rather than being rewritten in place.** Main does the opposite of what DR2.1 says.
  Rewriting the criterion to match main would erase the disagreement; rewriting main to match DR2.1 without a ruling
  would overwrite a deliberate choice.
- **I kept DR2.1's hand-written species lists out of the restated criteria.** They are a snapshot of a worse source
  than the live one, and the theme's invariant already says MDM's entries win.
- **The species-label regression became a row rather than a note on inc-013.** It affects four pages and the tests
  repo, not just the search results, and inc-013's label format depends on it.
- **I did not treat MDM's data quality as this theme's work.** "Equus cabalus" misspells *caballus*, `Poephagus spp.`
  has the common name "Animals", two unnamed mule rows sit under 0101, and elephants are listed under 0102. c-014
  ruled that DR2.1's misspellings be corrected because the species text reaches the receiving service as the GBN-AG
  scientific name — that reasoning now points at MDM's data, which the service cannot correct locally without
  breaking the invariant. Recorded in `deferred` for the MDM team.
