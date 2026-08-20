# `commodities` — dr1 against dr1b

Two independent readings of the same evidence, compared by subject.

- **dr1** — `workareas/journey-builder/EUDPA-328-DR1/backlog.json`, 9 findings with `domain == "commodities"` (inc-017 to inc-025).
- **dr1b** — `workareas/journey-builder/EUDPA-328-DR1B/backlog.json`, 11 findings with `domain == "commodities"` (inc-012 to inc-022).

Evidence read: `dr1b-parity/capture/model/` and `dr1b-parity/capture/html/` for both
sides; frontend source at `76a864ba` under
`repos/trade-imports-animals-frontend`; requirements source at `491b3926` under
`~/git/defra/defra-design/GB-notification-service`.

## Headline

Nothing in `dr1b`'s commodities set is wrong. Two claims are lightly overstated
and one carries an internal tension; the rest are sound and several are better
grounded than `dr1`'s.

**Both runs lost work, and each lost different work.** `dr1b` consolidated the
catalogue consequences into one finding and, in doing so, dropped `dr1`'s
standalone CPH-polarity finding and the per-species-row behaviour for *Other
live mammals*. `dr1` distributed the consequences and, in doing so, never wrote
down which allow-lists gain which commodity — and got the permanent-address
applicability **wrong**. `dr1b` also missed two `dr1` findings on the
number-of-animals field that have nothing to do with either structure.

## Subject map

Domains do not line up between the runs: three subjects `dr1b` files under
`commodities` are filed under `identification` in `dr1`. Compared by subject:

| Subject | dr1 | dr1b | Verdict |
|---|---|---|---|
| Catalogue: 5 commodities / 8 species vs 21 / 144 | inc-017 (`needs-backend`) | inc-014 (`frontend-work`) | Both sound. **Band disagreement.** |
| No commodity search control | inc-021 | inc-018 | Agree |
| Running "N selected" panel with Remove / Clear all | folded into inc-021 | split out as inc-021 | Agree |
| Species shown as bare Latin; 0102 called Cow not Cattle | inc-025 | inc-016 | Agree |
| Page named "Consignment details" not "Commodity details" | inc-018 | inc-017 | Agree |
| "Help with commodity codes" omits the Trade Tariff link | inc-019 | inc-015 | Agree |
| Inset drops the "no health certificate" sentence | inc-020 | inc-019 | Agree |
| Packages labelled "(optional)" not "(when required)" | inc-024 | inc-020 | Agree |
| Page named "Additional animal details" not "Additional details" | inc-073 `[identification]` | inc-012 | Agree, different domain |
| Certification hint says health certificate, DR1 says ITAHC | inc-065 `[identification]` | inc-013 | Agree, different domain |
| Unweaned question asked for horses | inc-079 `[identification]` | inc-022 | Agree, different domain |
| CPH asked for cattle only vs asked by default | **inc-005 `[addresses]`, standalone** | folded into inc-014 | dr1 richer — see Q3 |
| *Other live mammals* listed per species, removable per species | **inc-017** | **absent** | dr1-only, real |
| Number of animals carries an extra hint DR1 has not | **inc-022** | **absent** | dr1-only, real |
| Number of animals not mandatory in the frontend | **inc-023** | **absent** | dr1-only, real |
| Ear tag widens to Pig, Sheep, Goat | generic mention only | **enumerated in inc-014** | dr1b richer |
| Permanent address widens to Ferret | inc-012 `[addresses]` — **wrong** | inc-014 + inc-069 — right | dr1b right — see Q4 |
| DR1's per-commodity certification-purpose lists are dead data | **absent** | **inc-014** | dr1b-only, real |

---

## 1. Is anything in `dr1b` wrong?

Graded against the evidence, not against `dr1`.

### inc-014, the commodity catalogue — **sound**, with two small overstatements

Every load-bearing claim checks out.

**Twenty-one commodities.** `app/data/commodities.js` carries exactly 21 `name:`
entries — Cattle, Horse, Pig, Sheep, Goat, Chicken, Turkey, Duck, Goose, Guinea
fowl, Cat, Dog, Ferret, Other live mammals, Rabbit, Camel, Ostrich, Parrot,
Reptile, Bees, Ornamental fish — matching the list in the finding name for name.
Confirmed again from the search payload embedded in the captured DOM at
`dr1-what-are-you-importing-results.html`, which serialises the same 21.

**Five on the frontend.** `stub.js:1` is
`COMMODITY_OPTIONS = ['Cow', 'Horse', 'Cat', 'Dog', 'Fish']`, and the rendered
DOM `fe-commodity-search.html` holds exactly five `<fieldset>` elements with
legends `Cow (0102)`, `Horse (0101)`, `Cat (01061900)`, `Dog (01061900)`,
`Fish (0301)`. The falsifier — "a sixth commodity group in any state" — cannot
fire: `commodity-groups.js` maps the whole service list with no filter and no
paging.

**Eight allow-lists at `stub.js:50-119`.** Verified by reading the file:
`PACKAGE_COUNT_COMMODITIES` (:50), `PASSPORT_COMMODITIES` (:107),
`TATTOO_COMMODITIES` (:109), `EAR_TAG_COMMODITIES` (:111),
`HORSE_NAME_COMMODITIES` (:113), `PERMANENT_ADDRESS_COMMODITIES` (:115),
`UNWEANED_ANIMAL_COMMODITIES` (:117), `CPH_COMMODITIES` (:119). Eight, in that
range.

**Permanent address gains Ferret.** `requiresPermanentAddress: true` appears at
`app/data/commodities.js:150`, `:170` and `:190` — the Cat, Dog and Ferret
blocks, and nowhere else. The frontend's `PERMANENT_ADDRESS_COMMODITIES` is
`['Cat', 'Dog']`. Correct, and see Q4 — `dr1` gets this wrong.

**Ear tag gains Pig, Sheep and Goat.** Sheep (`:67`) and Goat (`:86`) declare
`{ id: 'ear-tag', label: 'Ear tag' }` inline; Pig takes
`getIdentifiersForCommodityCode('0103')`, which returns `[{ id: 'ear-tag' }]`
(`app/data/commodity-identifiers.js:18-20`). The frontend's
`EAR_TAG_COMMODITIES` is `['Cow']`. Correct.

**CPH is asked for every code except horses and the 01061900 group.** Exactly
right, and the mechanism is worth stating: `consignment-address-sections.js:146`
declares a `defaultConsignmentAddressSectionIds` list that **includes `cph`**,
and `getConsignmentAddressSectionIdsForCommodityCode` falls back to it for any
code not in the map. Only `0101` (`:101`) and `01061900` (`:123`) are mapped
without `cph`; `0102` and `0103` are mapped with it; every other live-animal
code — Sheep 010410, Goat 010420, the poultry codes, Rabbit, Camel, Ostrich,
Parrot, Reptile, Bees, Ornamental fish 030111 — falls to the default and is
asked. Correct.

**The per-commodity certification-purpose lists are dead data.** Verified.
`getAdditionalAnimalDetailsConfig` (`app/routes.js:1187-1198`) returns the
module-level `certificationPurposeOptions` required at `app/routes.js:15`, which
is the flat 16-option `app/data/certification-purposes.js`. The
`certificationPurposeOptions` arrays inside `commodities.js` (nine of them) are
never read for live animals. This is genuinely useful signal and `dr1` does not
have it.

**Overstatement 1 — "Each new commodity needs an entry in every list that
applies to it."** True in effect but not in appearance. `PACKAGE_COUNT_COMMODITIES`
is already 54 entries long and already names `'010420 - Goats'`,
`'0103 - Pig (Domestic)'`, `'010410 - Sheep (Domestic)'`, `'01061900 - Ferrets'`,
`'01062000 - Reptiles'` and the poultry set. It reads as though the work is done.
It is not — the list is matched against `entry.commoditySelection`
(`consignment-details/fields.js:12-13`), which is `'Cow' | 'Horse' | 'Cat' |
'Dog' | 'Fish'`, so those IPAFFS-format strings can never match. The finding's
conclusion holds; the reader will be surprised by what they find in that list.

**Overstatement 2 — an internal tension.** The finding says "DR1 has no
farmed-fish commodity at all, so the frontend's Fish (0301) … has no DR1
counterpart", then two sentences earlier counts "Ornamental fish three against
one". If the two are not counterparts, the comparison is not meaningful. Cosmetic,
but it makes the replacement point read less clearly than it should.

### inc-018, the search control — **sound**

The falsifier was run against the DOM: the only `<input>` elements in
`fe-commodity-search.html` are the hidden crumb and the eight species checkboxes.
The DR1 side carries the label "Search for a commodity", the hint quoted
verbatim, and the magnifying-glass button, at
`app/views/what-are-you-importing.html:48-116`.

### inc-021, the selection summary — **sound**, and honestly banded

Marked `medium`, and the finding says why in its own falsifier: neither captured
DR1 state has anything selected, so the populated panel is unphotographed and the
behaviour was read from `app/assets/javascripts/commodity-search.js`. That is the
right confidence for the evidence.

### inc-022, the unweaned question — **sound**

`unweanedOptions` appears at `commodities.js:20` (Cattle) and `:54` (Pig) only.
The frontend's `UNWEANED_ANIMAL_COMMODITIES` is `['Cow', 'Horse']`. The finding
also spots something `dr1` did not: the frontend obligation's own explanation
string names "equines, cattle, pigs, sheep, or goats"
(`obligations/sections/commodities/aggregates.js:40-44`) while the allow-list
behind it is two entries. Real extra signal.

### inc-012, inc-013, inc-015, inc-016, inc-017, inc-019, inc-020 — **sound**

All checked against source and DOM; all resolve. One citation slip, which `dr1b`
flagged itself: inc-016 cites `app/data/commodities.js:11-24` for the species
common names, but those live in `app/data/commodities-0102-species.js:3-15` —
which is the line range `dr1`'s inc-025 cites. The cited range supports the
"Cattle" half of the claim and not the "Domestic cattle (Bos taurus)" half.

---

## 2. What did `dr1b` find that `dr1` missed?

**Three things, all real.**

**a. The eight allow-lists, enumerated, with which one gains what.** `dr1`'s
inc-017 states the consequence generically — "Everything the frontend keys off a
commodity by name today — the packages gate, the identifier sets, the CPH and
unweaned rules — keys off names that will change, so those lookups move to codes
at the same time." That is a true sentence that tells an implementer nothing
about what to type. `dr1b` names the file, the line range, all eight lists, and
three specific widenings with their evidence. Verified above; every one holds.

**b. DR1's per-commodity certification-purpose lists are unused.** Traced to
`app/routes.js:15` and `:1187-1198`. `dr1` has nothing on this, and without it a
team porting the catalogue would faithfully port nine dead arrays.

**c. The frontend's unweaned obligation contradicts its own allow-list.**
inc-022's difference slot. `dr1`'s inc-079 states the same behavioural difference
but does not notice that the frontend's stated source and its code disagree.

---

## 3. What did `dr1` find that `dr1b` missed?

**Four things, all real. Two are structural losses; two are plain gaps.**

### a. The CPH rule's *polarity* — `dr1` inc-005, a standalone finding

This is the clearest case of consolidation costing something. `dr1b` folded CPH
into inc-014 as a widening consequence: "Pig (0103), Sheep, Goat and most of the
new commodities all need a CPH number where the frontend's CPH list is Cow
alone." True, but gated behind the catalogue work and therefore not actionable
today.

`dr1`'s inc-005 makes it a finding in its own right and says two things `dr1b`
does not:

- **The rule is inverted.** The frontend is an allow-list of one
  (`CPH_COMMODITIES = ['Cow']`); DR1 is a default-with-exemptions. Verified:
  `defaultConsignmentAddressSectionIds` at
  `app/data/consignment-address-sections.js:146-153` includes `cph`, and
  `getConsignmentAddressSectionIdsForCommodityCode` falls back to it. `dr1`'s
  phrasing — "the allow-list makes every future commodity silently exempt, which
  is the wrong default for a question DR1 treats as the norm" — is the real
  defect, and it is a defect regardless of whether the catalogue ever widens.
- **It is actionable today.** "Within today's five-entry catalogue this changes
  one commodity, fish, which DR1 asks and the frontend does not." Verified:
  `0301` is not in the code map, so it falls to the default and DR1 asks it;
  `CPH_COMMODITIES` is `['Cow']`, so the frontend does not.

`dr1b` has three CPH findings (inc-004 explanation, inc-005 heading, inc-006
three-box input) and none about scope or polarity. **This is work `dr1b` lost by
consolidating.**

### b. *Other live mammals* is listed and removed per species — `dr1` inc-017

Verified at `app/routes.js:625-644`: the `isOtherLiveMammalsCommodityCode` branch
pushes one row per species with `removeBy: 'species'`, where every other
commodity pushes one row per commodity. `dr1` calls this out as a behavioural
consequence of catalogue depth. `dr1b` mentions *Other live mammals* only as a
species count. **Lost.**

### c. Number of animals carries a hint DR1 does not have — `dr1` inc-022

Frontend: `consignmentDetails.animals.hint = 'For example, 1, 25 or 5000.'`
(`commodities/copy/copy.en.js`). DR1: the `govukInput` at
`app/views/consignment-details.html:105-113` passes `label` only, no `hint`.
`dr1b` has no equivalent — its only consignment-details findings are inc-016,
inc-017 and inc-020. **Missed outright; nothing to do with structure.**

### d. Number of animals is not mandatory in the frontend — `dr1` inc-023

The more substantive of the two. DR1 validates at
`app/routes.js:816-848`: `if (!value)` → `'Enter the number of animals'`, then a
whole-number-greater-than-zero check. The frontend uses
`integerInRange(animalsField(index), { min: 1, … })`
(`consignment-details/fields.js:21-24`), and `integerInRange`
(`lib/validate/validators.js:123-127`) is built on `Joi.string().trim().allow('')`
— `allow('')` short-circuits before the `.custom()` predicate, so a blank passes
and is saved. `dr1`'s claim is correct.

`dr1b` has validation-gap findings elsewhere (inc-003 contact, inc-082 origin
code), so this is a coverage gap on this field rather than a category it does not
look for. **Missed.**

---

## 4. Where they contradict each other, which is right?

### Permanent address applicability — **`dr1` is wrong, `dr1b` is right**

`dr1`'s inc-012 states: "It is asked for the whole 01061900 group — cat, dog,
ferret and other live mammals (`app/data/consignment-address-sections.js:124-131`)."

The cited line is real — `01061900` maps to a section list containing
`permanent-address`. But `dr1` stopped at the map. The runtime filter is
`getSessionConsignmentAddressSections` at `app/routes.js:2026-2040`:

```
if (!hasPermanentAddressRequiredSpecies(sessionData)) {
  sections = sections.filter((section) => section.id !== 'permanent-address')
}
```

and `hasPermanentAddressRequiredSpecies` resolves each selected species to its
commodity and tests `commodity.requiresPermanentAddress`
(`app/routes.js:2015-2024`). That flag is set on Cat (`commodities.js:150`), Dog
(`:170`) and Ferret (`:190`) and **not** on Other live mammals (`:208`). Both the
hub rows (`app/routes.js:4697`) and the route guards (`:10792` onward) read the
filtered set, so an *Other live mammals* consignment never sees the row or the
page.

`dr1b` states it correctly in two places: inc-014 ("DR1 requires a permanent
address for Ferret as well as for cat and dog") and inc-069 ("DR1 asks the
question for cat, dog and ferret, one commodity more than the frontend's two").

This is the routed claim `PROVENANCE.md` §4 records — an orchestrator told a
`dr1b` agent the rule "sweeps in Other live mammals", and that agent traced it
and disproved it. The source confirms the agent, and shows that `dr1` made
exactly the error the routed claim would have propagated.

### Band on the catalogue — **`dr1b` is better calibrated**

`dr1` bands inc-017 `needs-backend`: "The commodity and species catalogue has to
come from reference data rather than a constants file, so this lands behind a
reference-data API and a client for it in the frontend — that is the blocking
part."

`dr1b` bands inc-014 `frontend-work`: "The catalogue is a local data module on
both sides, so this is a data change rather than an integration … Confirm before
starting that the notification payload mapping accepts the new commodity codes;
if it does not, this becomes backend work first."

Nothing in the corpus supports `dr1`'s "has to". Checked:

- Both sides are local data modules — `stub.js` and `app/data/commodities.js`.
  `services/commodities/index.js:1-15` imports the constants directly; there is
  no client.
- The frontend has reference-data *clients* for countries and ports
  (`services/countries/client.js`, `services/ports/client.js`) but none for
  commodities, and `src/config/config.js` has no commodities reference-data
  entry.
- The repo's own doc calls commodities a **set-owned** service and says "This
  vocabulary is not a generic platform contract"
  (`sets/live-animals/docs/services.md:5-12`).
- No live-animals commodity-code validation exists on the backend — the only
  `commodityCode` Java files are under `plantproducts/`.

`dr1`'s band encodes an architectural preference — a defensible one — as a
blocker. `dr1b`'s band plus a named pre-flight check is the honest reading of the
evidence. **A band disagreement on the same subject, and `dr1b` has it right.**

### "Flat checkbox list" — neither run is wrong, and neither fell for the page model

The brief asks that any grouping claim be checked against the DOM. Both titles
are loose — `dr1`'s inc-021 says "a flat checkbox list", `dr1b`'s inc-018 says "a
static checkbox list" — but **both bodies are correct**:

- `dr1` inc-021: "shows five checkbox fieldsets — Cow (0102), Horse (0101), Cat
  (01061900), Dog (01061900), Fish (0301) — with all eight species tickable".
- `dr1b` inc-018: "five checkbox fieldsets, legended Cow (0102), Horse (0101),
  Cat (01061900), Dog (01061900) and Fish (0301), holding eight species between
  them".

The DOM agrees: five `<fieldset>` elements, five
`govuk-fieldset__legend--s` legends, those five texts.

### The page-model defect is real, and it caught neither run

`capture/model/frontend/fe-commodity-search.json` carries **one** field —
`{"kind": "checkboxes", "name": "species", "legend": "Cow (0102)"}` — whose
`options` array holds all eight species from all five commodities, with values
`Cow|716661` through `Fish|801204`. The rendered DOM has five fieldsets with five
distinct legends. The model collapses them and keeps only the first legend.

`dr1b` declares this in inc-018's verification line — "Read this from the DOM and
not the page model, which on this screen collapses all five fieldsets into a
single field carrying only the 'Cow (0102)' legend and would have supported a
wrong claim about grouping" — and again in inc-016. `dr1` never mentions the
defect but was not misled by it either: inc-021 names all five legends
correctly.

**No claim on either side about the grouping of that list is wrong.** The trap
was live and both runs walked past it, one knowingly.

### Not settled here

The `dr1-permanent-address-animals` pairing disagreement (`dr1`:
`onlyPrototype`; `dr1b`: paired to the identification screen) is an
`addresses`/`identification` matter. Worth recording for whoever settles it: the
two runs' **finding prose does not disagree**. Both say the frontend asks the
permanent-address question inline in the identification card, gated to Cat and
Dog (`stub.js:115`), and both say no capture exercises it. The disagreement is in
`pairs.cjs`, not in the readings.

---

## Counts

- **dr1 commodities findings:** 9. **dr1b commodities findings:** 11.
- **Shared subjects:** 11 (8 within `commodities` on both sides, 3 that `dr1b`
  files under `commodities` and `dr1` files under `identification`).
- **`dr1b`-only, real:** 3 (allow-list enumeration, dead certification-purpose
  lists, obligation-vs-allow-list contradiction). **`dr1b`-only, invented:** 0.
- **`dr1`-only, real:** 4 (CPH polarity, per-species *Other live mammals* rows,
  number-of-animals hint, number-of-animals not mandatory). **`dr1`-only,
  false:** 0 within `commodities`; 1 adjacent (`inc-012`'s permanent-address
  applicability, in `addresses`).
- **Contradictions settled:** 3 — permanent-address applicability (`dr1b`
  right), catalogue band (`dr1b` right), list grouping (both right; page model
  wrong).
- **`dr1b` findings graded:** 11 sound, 0 overstated as a whole, 0 wrong; 2
  overstatements *inside* inc-014 and 1 citation slip inside inc-016.

## Did either run lose work through how it structured the catalogue difference?

**Yes — both did, and in opposite directions.**

`dr1b` consolidated. Three slices declined findings and deferred to inc-014, and
the verifier widened it to carry what they had deferred. It now carries the
consequences precisely — better than `dr1` does. But consolidation buried the one
consequence that was **actionable today and defective on its own terms**: the CPH
rule's polarity. `dr1` raised that as inc-005 with a present-tense delta (fish)
and a structural argument (an allow-list makes every future commodity silently
exempt). In `dr1b` that argument does not exist anywhere, and the CPH work is
gated behind a 21-commodity catalogue that may never land. `dr1b` also lost the
per-species row and remove behaviour for *Other live mammals*.

`dr1` distributed. That kept CPH, permanent address and microchip visible as
standalone findings — but nowhere does `dr1` say which frontend allow-list gains
which commodity. Its catalogue finding says the lookups "move to codes"; an
implementer working from `dr1` has to rediscover that `EAR_TAG_COMMODITIES` needs
Pig, Sheep and Goat and `PERMANENT_ADDRESS_COMMODITIES` needs Ferret. And
distributing the applicability rules across domains is where `dr1` got the
permanent-address rule wrong: the `addresses` agent read the section map and
never saw the species-level filter that `dr1b`'s catalogue agent found.

The two losses are not symmetric in size. `dr1b`'s missing CPH-polarity finding
is one actionable item; `dr1`'s missing enumeration is the implementation detail
of the largest finding in the domain, and its permanent-address error would ship
a wrong rule.
