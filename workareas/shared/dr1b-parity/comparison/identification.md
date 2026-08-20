# `identification` — dr1 against dr1b

Counts: **dr1 15** findings in `domain == "identification"` (inc-065…inc-079),
**dr1b 14** (inc-060…inc-073). Every finding on both sides is band
`frontend-work`. **No band disagreement anywhere in this domain.**

Subjects were matched across the whole of both backlogs, not just this domain,
because the two runs file the same subject under different domains in five
places.

Frontend read at `repos/trade-imports-animals-frontend`, prototype at
`~/git/defra/defra-design/GB-notification-service`, the two heads named in
`run-heads.json` (`76a864ba` / `491b3926`).

---

## Headline

**dr1 is wrong about the permanent address, and it is wrong in its pairing
file, not in its findings.** `dr1-parity/pairs.cjs:256` asserts

> "The frontend has no permanent-address question anywhere in the journey."

That sentence is false, and dr1's own finding `inc-012` says so in its first
line. dr1b's pairing is right. Details in question 4.

---

## 1. Is anything in `dr1b` wrong?

**Nothing in dr1b's fourteen is wrong.** Grades: 13 **sound**, 1 **sound with
an understated scope** (`inc-065`). Nothing graded wrong or overstated.

Two findings already carry a self-declared `finding.correction`, and both
corrections are right:

- **`inc-065`** (microchip) — confidence lowered `high` → `medium` because
  DR1's microchip box is in no capture in this corpus (the only DR1
  identification capture is a cattle line, and `0102` has no microchip). Correct
  call against the contract's bar.
- **`inc-071`** (Save and add another) — the draft claimed that pressing the
  button on a one-animal line is refused by the cardinality rule. The verifier
  falsified that from `form/forms.js:66-120` and rewrote the finding to say the
  button saves and then strands the user. dr1's `inc-075` never made the false
  claim, so after correction the two runs agree.

### The one scope defect

`inc-065` says DR1 asks for a microchip "when identifying horses, cats and
dogs". DR1's identifier sets are keyed by CN code, not by commodity:

```js
// app/data/commodity-identifiers.js:4-8
'01061900': [
  { id: 'microchip', label: 'Microchip' },
  { id: 'passport',  label: 'Passport' },
  { id: 'tattoo',    label: 'Tattoo' }
],
```

and **four** prototype commodities carry `code: '01061900'` — `cat`, `dog`,
`ferret` and `other-live-mammals` (`app/data/commodities.js:149, 169, 189,
206`), each with `identifiers: getIdentifiersForCommodityCode('01061900')`. So
DR1 asks for a microchip on ferrets and on other live mammals too. dr1's
`inc-070` says "horses, cats, dogs and ferrets" — closer, still short of
`other-live-mammals`. **Both runs understate it; dr1b by one commodity more.**
It changes nothing about the remedy: the frontend's catalogue is
`COMMODITY_OPTIONS = ['Cow', 'Horse', 'Cat', 'Dog', 'Fish']`
(`services/commodities/stub.js:1`), so neither ferret nor other live mammals
exists to gate.

### Spot-checks that held

| dr1b | Checked against | Result |
|---|---|---|
| `inc-060` any-one-identifier | `obligations/sections/commodities/identifiers.js:88-103` `requires.anyOfIds` (six ids) vs prototype `routes.js:1526-1532` `isAnimalIdentifierEntryComplete` = `fields.every` | sound |
| `inc-061` tattoo on cattle | `stub.js:109` `TATTOO_COMMODITIES = ['Cat', 'Dog', 'Cow']`; prototype `commodity-identifiers.js:9-12` `'0102': [ear-tag, passport]` | sound |
| `inc-062` no change-count link | `_identification-card.njk:10` is a bare `<h2 class="govuk-heading-m">{{ card.title }}</h2>` | sound |
| `inc-063` fish free-text | controller test matrix pins `Fish` to `animalIdentifierIdentificationDetails-0`, `animalIdentifierDescription-0` | sound |
| `inc-064` labels + hints | `copy.en.js:58-72` — `'Passport number'` hint `'For example, UK123456789'`, `'Ear tag number'` hint `'For example, UK123456789012'` | sound |
| `inc-066` page heading | `copy.en.js:43` `title: 'Animal identification details'` | sound |
| `inc-072` saved row | `copy.en.js:87` `animalRow: (number) => \`Animal ${number}\`` inside a `govuk-summary-list` with one `__value` cell | sound |
| `inc-073` no commodities table | `animal-identification.njk` goes inset → `{% for card in cards %}` with nothing between | sound |

---

## 2. What did `dr1b` find that `dr1` missed?

**Four dr1b findings sit on the permanent-address subject** (`inc-067`–`inc-070`),
which dr1 files under other domains. Measured by subject rather than by domain,
the genuinely new signal is narrower than four:

| dr1b | dr1 counterpart | New? |
|---|---|---|
| `inc-069` placement (own page vs inline in the card) | `inc-012` (`addresses`) — same claim, same remedy | **not new** |
| `inc-070` "Same as the place of destination" shortcut | `inc-012` — "Nothing offers the place of destination the trader has already given" | **not new** |
| `inc-068` guidance | `inc-012` covers the two-bullet definition and the 48-hour sentence; it does **not** mention the fraud warning | **partly new** |
| `inc-067` form labels + dialling hint | `inc-001` (`service-wide`) covers both label strings, and explicitly names "The permanent-address block inside the animal identification card"; it does **not** mention the missing dialling hint or the phone/email ordering | **partly new** |

**Genuinely new and verified real:**

1. **The fraud warning.** `app/views/permanent-address-animals.html:37-40`:
   ```njk
   {{ govukWarningText({
     text: "Providing a false address is an act of fraud",
   ```
   The frontend's block has no warning component — `copy.en.js:90-93` holds
   exactly two strings (`heading`, `required`) and `_identification-card.njk:43-45`
   emits the `h3`, the one sentence, then straight into the fields. dr1 raises
   the definition bullets but never this. **Real.**
2. **No international-dialling hint on the permanent-address phone box, and
   phone before email.** dr1 raises the hint only for the private-transporter
   form (`inc-127`); dr1b raises it for both (`inc-115` transport, `inc-067`
   here). **Real.**

Everything else dr1b filed in this domain has a dr1 counterpart.

---

## 3. What did `dr1` find that `dr1b` missed?

Three subjects, **all three verified true from source**. These are dr1b's real
coverage gaps in this domain.

### Gap 1 — identifier box order (dr1 `inc-068`)

The frontend's order is a property of the copy block, identical for every
commodity:

```js
// features/commodities/copy/copy.en.js:58-72
typeFields: {
  animalIdentifierPassport: { label: 'Passport number', … },
  animalIdentifierTattoo:   { label: 'Tattoo', … },
  animalIdentifierEarTag:   { label: 'Ear tag number', … },
  horseName: { label: 'Horse name' }
},
```

```js
// animal-identification/identifier/fields.js:21-30
const scopedTypeFields = (commodity) =>
  TYPE_FIELDS.filter((field) => appliesForCommodity(field.id, commodity))
export const scopedFields = (commodity) => [
  ...scopedTypeFields(commodity), ...scopedFallbackFields(commodity)
]
```

`filter` preserves declaration order and nothing re-sorts, so a cow is always
asked Passport → Tattoo → Ear tag. The repo's own render matrix pins it:
`animal-identification.controller.test.js:365-370` gives Cow
`[PASSPORT_FIELD_0, TATTOO_FIELD_0, 'animalIdentifierEarTag-0']`.

DR1's order is per-commodity data — `'0102': [ear-tag, passport]`,
`'0101': [microchip, passport, horse-name]` — so cattle is asked for the ear tag
first. **dr1b saw both halves and did not write the finding**: its `inc-061`
verification line records "the frontend cow card renders Passport number,
Tattoo, Ear tag number in that order" and "0102 is ear-tag then passport", and
its `inc-064` verification explicitly rules ordering out of scope
("which boxes a cattle line gets and in what order"). The observation was made
and never became a finding. **Real gap.**

### Gap 2 — identification is a submission gate on the frontend and not on DR1 (dr1 `inc-069`)

Frontend, `obligations/sections/commodities/identifiers.js:88-103`:

```js
requires: {
  anyOfIds: [ … six identifier ids … ],
  errorCode: 'obligation.unitRecord.identifiersRequired',
  recordCountEquals: {
    fieldId: numberOfAnimals.id,
    errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
  }
}
```

So a line is unfinished until it holds one record per animal, each with at least
one identifier — and the review section is gated on every applicable row being
complete, which is why the captured hub reads "Cannot start yet".

DR1, `app/routes.js:1511-1519`:

```js
function requiresAnimalIdentifiersForSubmit (sessionData) {
  return hasMultipleSpeciesSelected(sessionData) && hasAnimalIdentifiersRequired(sessionData)
}

function hasMinimumAnimalIdentifiersForSubmit (sessionData) {
  if (!requiresAnimalIdentifiersForSubmit(sessionData)) {
    return true
  }
```

A single-species consignment returns `true` outright — it can be submitted with
nothing identified at all. dr1's account is exact. dr1b has adjacent findings
(`inc-053` hub "Check and submit" stays shut, `inc-087` review page has no
incomplete state) but nothing that names the identification requirement itself,
so the substance is missed. **Real gap.**

### Gap 3 — the page's primary green button reads "Save and finish" (dr1 `inc-072`)

```njk
{# animal-identification.njk:25 #}
{{ saveActions(hubHref, { text: copy.saveAndFinish, name: "action", value: "finish" }, sharedCopy.saveActions) }}
```

with `saveAndFinish: 'Save and finish'` at `copy.en.js:95` — the only journey
page in the service that overrides the shared `Save and continue` default. DR1's
equivalent page ends in `Save and continue` and reserves "Save and finish" for
the in-panel last-animal button.

Again, **dr1b saw the fact and did not raise it.** Its `inc-071` correction
says, in terms:

> "saveAndFinish is already this page's page-level primary button
> (animal-identification.njk:19 and :25), so reusing it inside the card would
> put two buttons with the same label on one page."

It used the fact to constrain another finding's remedy and never made it one.
dr1 raises it as `inc-072` and orders it ahead of `inc-075` for exactly the
collision dr1b's correction describes. **Real gap, and the one dr1 handles
better.**

### Not gaps — dr1 subjects dr1b filed elsewhere

- dr1 `inc-065` (ITAHC vs "the health certificate") → dr1b `inc-013`, `commodities`.
- dr1 `inc-079` (unweaned question asked of horses) → dr1b `inc-022`, `commodities`.
- dr1 `inc-073` heads two pages in one finding; dr1b splits it — `inc-066`
  (identification heading) here, `inc-012` (`Additional animal details`) under
  `commodities`.

---

## 4. Where they contradict each other, which is right?

### 4a. The permanent-address pairing — **dr1 is wrong**

`workareas/shared/dr1-parity/pairs.cjs:253-257` files
`dr1-permanent-address-animals` as `onlyPrototype` with the note:

> "DR1 asks, per animal, whether its permanent address is the place of
> destination or a new address. **The frontend has no permanent-address question
> anywhere in the journey.** The sibling view permanent-address.html is orphaned
> in the prototype…"

dr1b's `pairs.cjs:260-261` pairs it to `fe-animal-identification` instead:

> "…the frontend asks it as a "Permanent address" block inside the
> identification card (_identification-card.njk), gated by the permanentAddress
> obligation on the Cat and Dog commodities."

**dr1b is right.** Settled from source, and it has to be: no capture on either
side shows the frontend's permanent-address block, because the corpus
photographed cow, horse and fish and none of them triggers it. The chain, each
link read directly:

1. The view emits it —
   `journeys/linear/features/commodities/animal-identification/_identification-card.njk:42-45`:
   ```njk
   {% if card.showAddress %}
     <h3 class="govuk-heading-s">{{ copy.permanentAddress.heading }}</h3>
     <p class="govuk-body">{{ copy.permanentAddress.required }}</p>
     {% for field in card.addressFields %}
   ```
2. The strings exist — `features/commodities/copy/copy.en.js:90-93`:
   ```js
   permanentAddress: {
     heading: 'Permanent address',
     required: 'A permanent address is required for this animal.'
   },
   ```
   followed at `:96-106` by nine address labels (`Name or organisation name` …
   `Email address`).
3. The gate is an obligation —
   `obligations/sections/commodities/identifiers.js:200-207`:
   ```js
   export const permanentAddress = {
     id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
     name: 'permanentAddress',
     within: unitRecord,
     status: 'mandatory',
     applyTo: allowListed(commodityCode, permanentAddressCommodities, unitRecord, [
       permanentAddressReason
     ])
   }
   ```
4. The allow-list is two commodities —
   `services/commodities/stub.js:115`:
   ```js
   export const PERMANENT_ADDRESS_COMMODITIES = ['Cat', 'Dog']
   ```
   and `Cat`/`Dog` are real picker options (`stub.js:1`).

**The repo's own tests pin the render**, which is what makes this
unanswerable rather than merely well-argued:

```js
// animal-identification.controller.test.js — MATRIX
{ commodity: 'Cow',   …, showAddress: false },
{ commodity: 'Horse', …, showAddress: false },
{ commodity: 'Cat',   …, showAddress: true  },
{ commodity: 'Dog',   …, showAddress: true  },
{ commodity: 'Fish',  …, showAddress: false }
…
expect(rendered.showAddress).toBe(showAddress)
```

and the browser spec drives all nine controls on a live Cat line —
`fit/identification.fit.spec.js:88-97` defines `validCatAddress` with
`nameOrOrganisationName … emailAddress`, `:168-175` asserts a required-field
error for each of seven of them, and `:365-379` saves a Cat record and reads
`` `${copy.identification.permanentAddressSummaryLabel}: Pet Owner` `` back off
the saved row. `:243` is the negative control: on a cow/horse/fish page,
`await expect(page.locator('#nameOrOrganisationName-0')).toHaveCount(0)`.

**What this costs each run.** Less than the brief anticipated, because dr1's
error is confined to the pairing file. dr1's `inc-012` (`addresses`) opens:

> "There is no permanent-address row on the addresses hub … The question is
> asked instead inside the animal identification card, as a heading 'Permanent
> address', the sentence 'A permanent address is required for this animal.' and
> a block of blank inputs … It appears for cats and dogs only
> (…/services/commodities/stub.js:115)."

and dr1's `inc-001` names the same block again. So **dr1's findings are right
and dr1's pair row contradicts them.** The consequence is a corpus-shape error
(one screen mis-filed as `onlyPrototype`, one frontend screen under-paired), not
a false finding. dr1b's four permanent-address findings all stand, and none of
dr1's collapse.

### 4b. Who DR1 asks the permanent address of — **dr1 is wrong, dr1b is right**

dr1 `inc-012`: "It is asked for the whole 01061900 group — cat, dog, ferret and
other live mammals (app/data/consignment-address-sections.js:124-131)."
dr1b `inc-069`: "DR1 asks the question for cat, dog and ferret."

The section table dr1 cites is keyed by CN code and does list
`permanent-address` under `'01061900'` — but it is not the only gate.
`app/routes.js:2020-2027, 2029-2045`:

```js
function isPermanentAddressSpecies (speciesId) {
  const match = getSpeciesMatch(speciesId)
  return Boolean(match && match.commodity.requiresPermanentAddress)
}
…
function getSessionConsignmentAddressSections (sessionData) {
  …
  if (!hasPermanentAddressRequiredSpecies(sessionData)) {
    sections = sections.filter((section) => section.id !== 'permanent-address')
  }
  return sections
}
```

`requiresPermanentAddress: true` appears exactly three times in the prototype —
`app/data/commodities.js:150` (cat), `:170` (dog), `:190` (ferret). The
`other-live-mammals` entry at `:205-212` shares the `01061900` code but has no
such flag, so the row is filtered out for it. **dr1b's set is exact; dr1
over-reads its own citation by one commodity.**

This is the claim `PROVENANCE.md` §4 records as a bad orchestrator routing that
the receiving dr1b agent traced and disproved. It disproved it correctly.

### 4c. Microchip applicability — **both understated, dr1 closer**

Covered in question 1. dr1 `inc-070` "horses, cats, dogs and ferrets"; dr1b
`inc-065` "horses, cats and dogs". Source says all of `0101` plus all four
`01061900` commodities. Immaterial to either remedy.

### 4d. Save and add another on a one-animal line — **resolved, no live contradiction**

dr1b's draft claimed the cardinality rule refuses the press; its verifier
falsified that from `form/forms.js:66-120` and rewrote the finding. dr1
`inc-075` never claimed it. Post-correction the two agree, and dr1b's account of
DR1's panel builder (`routes.js:1710-1722`) matches dr1's.

### No contamination caveat applies here

`PROVENANCE.md` §3 flags one subject where agreement is not two independent
confirmations — the frontend's blocked exit-details hub row. That subject is in
the `hub` domain and does not appear in `identification`. **Every agreement
recorded above counts normally.**

---

## Summary table

| | dr1 | dr1b |
|---|---|---|
| findings in domain | 15 | 14 |
| graded wrong | 0 | 0 |
| graded overstated / understated | 1 (`inc-070` microchip scope), 1 (`inc-012` permanent-address applicability) | 1 (`inc-065` microchip scope) |
| subjects missed that the other has, verified true | 2 (fraud warning; permanent-address dialling hint + field order) | 3 (identifier order; identification-as-submission-gate; page-level "Save and finish") |
| pairing errors | **1 — `pairs.cjs:256`, "The frontend has no permanent-address question anywhere in the journey", flatly false** | 0 |
| band disagreements | none | none |
