# `origin` — comparing the two readings

- **`dr1`**: 15 findings, `inc-080`–`inc-094`, all slice `origin-and-reason`, all `confidence: high`.
- **`dr1b`**: 9 findings, `inc-074`–`inc-082`, all slice `origin-and-reason`, eight `high` and one `medium`.

Subject pairing (mine, derived by reading all 24, not by id or slice):

| subject | `dr1` | `dr1b` | agree? |
|---|---|---|---|
| Country list omits territories | inc-080 | inc-074 | yes, band disagrees |
| Country of origin is a select, not a search | inc-082 | inc-075 | yes |
| Internal-market purpose hints diverge | inc-084 | inc-076 | yes, count disagrees |
| Reason page heading is the question | inc-090 | inc-077 | yes |
| Origin page's three questions are at three weights | inc-086 | inc-078 | yes |
| Port of exit offers all 78 GB ports | inc-087 | inc-079 | yes |
| Reason follow-ups are four pages, not reveals | inc-089 | inc-080 | yes, page order disagrees |
| Region code has no country prefix | inc-091 | inc-081 | yes |
| Region code not required when Yes | inc-092 | inc-082 | yes |
| **Country of origin blocks Save and continue** | inc-081 | — | **`dr1b` declined it** |
| **Internal reference rejects punctuation** | inc-085 | — | **absent from `dr1b`** |
| **Exit date has no "missing" validation** | inc-083 | — | **absent from `dr1b`** |
| **Internal-market purpose has no "missing" validation** | inc-088 | — | **absent from `dr1b`** |
| **Three reveal questions carry hints DR1 does not** | inc-093 | — | **absent from `dr1b`** |
| **"Select the …" where DR1 says "Select a …"** | inc-094 | — | **absent from `dr1b`** |

15 − 9 = 6, and the six are exactly the six unmatched rows. **Every finding in the gap
is a distinct subject, and I confirmed all six against the source myself.** None of them
is a duplicate of another, and none of them is the flow change.

---

## Verdict on the 15-to-9 gap: **lost work, not economy**

The economy story does not survive contact with `dr1`'s backlog, for one reason that
settles it on its own:

**`dr1` did not write six near-duplicates. `dr1` wrote the same single merged
flow-change finding.** `dr1`'s `inc-089` covers the identical five frontend pages and
five prototype reveal states in one increment — same ten screens, same instruction
("Move the four follow-up questions onto the reason page as govukRadios conditional
reveals and retire the four separate pages"). `dr1b`'s `inc-080` merged nothing that
`dr1` had split. The merge saved zero findings relative to `dr1`, so it cannot account
for any part of a six-finding gap.

The six that are missing are not page-shape findings at all:

- **Two of them are on the origin page**, which the merge does not touch in any way
  (`inc-081` country required, `inc-085` internal-reference pattern).
- **Four are on the reveal pages**, but each is about a *rule* or a *string*, not about
  where the question is rendered.

The verifier's check is the tell. `dr1b`'s `inc-080` verification line reads:

> Rubric 5 checked by enumerating every field on both sides of the merge: the frontend's
> four fields cover DR1's six reveal fields with nothing missing in either direction.

That is a **field-level** enumeration, and it is true. `purposeInInternalMarket`,
`destinationCountry`, `portOfExit` and `exitDate` do map onto DR1's six branch-scoped
fields with nothing dropped. But every one of the four missing findings lives a level
below the field: what validates it, and what words it carries. The enumeration was run at
the wrong granularity to catch them, and passed.

Worse, `inc-080` states positively that there is nothing there to find:

> The four gates already encode exactly the right conditions and do not change — this is
> a change of where the questions are rendered and validated, not of when they apply.

That sentence is wrong in a way that matters to whoever builds it. For two of the four
fields there is no validation to relocate, because the frontend has none
(`src/.../import-purpose/controller.js:25-30` composes a bare `oneOf`, and
`src/.../exit-date/controller.js:21` composes only `dateText`; both validators in
`src/server/app/lib/validate/validators.js:114-121` and `:209-234` carry `.allow('')`).
An implementer folding the reveals in by following `inc-080` verbatim would reproduce
DR1's page shape and DR1's two missing inline errors would still be missing.

**So the gap is six real, separately-schedulable differences that `dr1b` did not
record.** Naming every one:

### 1. `dr1-inc-081` — the frontend blocks Save and continue on country of origin; DR1 does not

Real, and `dr1b` **considered it and declined it in writing**, in `inc-082`'s correction:

> The author also declined a mirror-image finding here — that DR1 validates only the
> region code and never requires a country of origin, where the frontend does — reading
> DR1's silence as a prototype limitation rather than an instruction to stop requiring
> the country. The verifier agrees … DR1 therefore treats the country of origin as
> mandatory and simply omits the inline error … Declining it was right and it should not
> be raised on a later pass.

**The decline is wrong, and DR1's own source says so in a comment.** DR1's
`validateImportReasonProceed` at `app/routes.js:1381-1385` opens:

```js
// Soft validation: a main reason is optional to proceed, but once selected
// any further information required for that reason must be completed.
if (!importReasonValues.includes(importReason)) {
  return { errors, errorList }
}
```

That is a *deliberate, documented* design: the top-level question does not block the
page, its dependants do. And DR1 applies it identically on origin —
`validateOriginOfImport` (`app/routes.js:246-262`) checks only
`regionOfOriginRequired === 'Yes' && !regionOfOriginCodeSuffix` and never looks at
`countryOfOrigin`, while `hasOriginDetails` (`app/routes.js:231-244`) returns false
without it. That is the *same* pair of behaviours as `hasImportReasonComplete`
(`app/routes.js:1343-1367`), which returns false without `importReason`, alongside the
soft-validation comment above it. `dr1b`'s reasoning — "mandatory in the completeness
function, therefore the missing page error is a prototype defect" — proves too much: run
it on `importReason` and it would make DR1's explicitly-commented soft save a defect too.

The frontend is not consistent with itself here either, which is the clincher:
`src/.../origin/controller.js:63-67` uses `requiredOneOf` on `countryOfOrigin`, while
`src/.../import-reason/controller.js:25-30` uses plain `oneOf` on `reasonForImport`. The
frontend already implements DR1's soft-save pattern on one of the two pages. Origin is
the outlier. `dr1` has this right.

### 2. `dr1-inc-085` — the frontend rejects an internal reference containing a space, hyphen or slash; DR1 imposes no rule at all

Real, confirmed from both sources. Frontend: `src/.../origin/controller.js:75-82` composes
`pattern('internalReferenceNumber', /^\w*$/, …)` plus `maxText(…, 58, …)`; `\w` excludes
space, hyphen, slash and full stop. DR1: `app/routes.js:9240-9244` trims the value and
stores it, `validateOriginOfImport` never looks at it, `hasOriginDetails` never tests it.

`dr1b` **had this fact on screen and did not write it up.** Its `inc-082` verification
line reads the whole composed rule list out loud:

> Read the composed rule list at origin/controller.js:63-86: requiredOneOf on
> countryOfOrigin, oneOf on regionOfOriginCodeRequirement, maxText on regionOfOriginCode
> and internalReferenceNumber, **and a pattern rule on internalReferenceNumber**.

and then compares it to DR1's `validateOriginOfImport`, whose "single branch" it also
quotes. Both halves of the difference are in one paragraph of `dr1b`'s own prose, side by
side, and neither became a finding. This is the cleanest provable miss in the domain.

### 3. `dr1-inc-083` — no "Enter an exit date" anywhere in the frontend

Real. `src/.../exit-date/controller.js:21` composes only
`dateText('exitDate', copy.errors.dateInvalid)`, and `dateText` → `dateTextInRange`
(`validators.js:209-234`) is `Joi.string().trim().allow('')`, so a blank passes. The
page's only message is `'Enter a real exit date'` (`exit-date/copy/copy.en.js:8`). DR1
splits the two failures at `app/routes.js:1423-1432`:

```js
errors.temporaryAdmissionExitDate = {
  text: temporaryAdmissionExitDate ? 'Enter a real date' : 'Enter an exit date'
}
```

The string `Enter an exit date` appears **zero times** in `dr1b`'s entire backlog and six
times in `dr1`'s.

### 4. `dr1-inc-088` — no "Select a purpose in the internal market" in the frontend

Real. `src/.../import-purpose/controller.js:25-30` composes a bare `oneOf`, which
`validators.js:114-121` builds as `.allow('').valid('', …)`, so an empty submit saves and
moves on. DR1 raises the error at `app/routes.js:1387-1394`.

`dr1b` quotes that exact DR1 string three times — but only as *evidence for the flow
change*, in `inc-080`'s prototype slot and verification line ("Confirmed the error quote
verbatim in dr1-reason-for-import-error.html:264"). It uses DR1's error to prove DR1
validates inline, and never checks whether the frontend validates at all. The finding is
one inference away from prose `dr1b` already wrote.

### 5. `dr1-inc-093` — the frontend adds three hints DR1 does not carry

Real, and I re-derived it from the captures rather than either backlog. Frontend hints:
`destination-country/copy/copy.en.js:5` "The country the consignment travels on to after
Great Britain."; `port-of-exit/copy/copy.en.js:5` "Choose where the consignment will leave
Great Britain. Exit and entry share the same port list."; `exit-date/copy/copy.en.js:5`
"The date the animals are expected to leave Great Britain. For example, 27/3/2026".

DR1's side, read out of `dr1-reason-for-import-temporary-admission-horses-revealed.html`:
`transhipment-destination-country`, `transit-exit-border-control-post`,
`transit-destination-country` and `temporary-admission-port-of-exit` each render as a bare
`<label class="govuk-label">` with the `<select>` immediately after and **no hint element**.
The one field hint on the page is `temporary-admission-exit-date-hint`, reading exactly
`For example, 27/3/2026` — DR1's exit-date hint is the frontend's *minus* its leading
sentence. `dr1`'s prototype slot states this precisely; only its **title** overstates it
as "DR1 asks all three with a bare label", which is true of two of the three.

`dr1b` picks up **one third of this**, and only incidentally: `inc-079` asks for the
"Exit and entry share the same port list" sentence to go, because the sentence becomes
untrue once the exit list is narrowed. The destination-country hint and the exit-date
hint's extra sentence appear nowhere in `dr1b` (grep for either string across the backlog
returns nothing).

### 6. `dr1-inc-094` — "Select the …" against DR1's "Select a …"

Real, both sides verbatim. Frontend: `'Select the destination country'`
(`destination-country/copy/copy.en.js:9`) and `'Select the port of exit'`
(`port-of-exit/copy/copy.en.js:9`). DR1: `'Select a destination country'` and
`'Select a port of exit'`, used identically on the transit, transhipment and
temporary-admission branches (`app/routes.js:1396-1440`). Both sides genuinely require
both fields — the frontend uses `requiredOneOf` on each — so this one is pure wording and
lands as a two-string copy change. `dr1b` contains none of the four strings.

---

## Q1. Is anything in `dr1b` wrong?

Three graded items. Everything else in the nine is **sound**.

### WRONG — `dr1b-inc-080` states the frontend's page order backwards on both branches

Its frontend slot:

> Transit leads to a **Port of exit page and then a Destination country page**; Temporary
> admission horses leads to an **Exit date page and then a Port of exit page**.

The frontend's `consignment` section declares its pages in this order
(`src/server/app/sets/live-animals/journeys/linear/flow/flow.js:48-58`):

```js
importReasonPage, importPurposePage, destinationCountryPage, portOfExitPage, exitDatePage
```

and `nextInSection` (`src/server/app/flow/navigation.js:27-37`) walks that array forward,
taking the first later page whose gate passes. So a Transit user meets **Destination
country, then Port of exit**, and a Temporary-admission-horses user meets **Port of exit,
then Exit date**. Both are the reverse of what `inc-080` says.

DR1's reveal order is the one `inc-080` gives: in
`dr1-reason-for-import-temporary-admission-horses-revealed.html`,
`transit-exit-border-control-post` renders before `transit-destination-country`, and
`temporary-admission-exit-date` before `temporary-admission-port-of-exit`.

The consequence is not cosmetic. `inc-080`'s instruction reads "render … in the order DR1
shows them (transit: port of exit above destination country; temporary admission: exit
date above port of exit)" — which, against the frontend order the same finding just
described, is a no-op. An implementer would conclude the ordering already matches and
carry the frontend's order across unchanged. `dr1`'s `inc-089` gets it right and says so
explicitly: "Both the transit pair and the temporary-admission pair come out in the
reverse of the frontend's page order today."

`dr1b`'s verifier read `flow.js` and quoted the array in the correct order in its
verification line, and still did not compare it against the prose slot above it.

### OVERSTATED — `dr1b-inc-074` prescribes removing four countries from shared reference data

Its difference slot: "the territories and Crown Dependencies must be added there first …
**and the four EFTA entries removed**."

Two problems. First, DR1's silence about Iceland, Liechtenstein, Norway and Switzerland is
an absence, not a stated rule; `dr1`'s `inc-080` handles the same fact correctly by
leaving it open ("Settle whether dropping Iceland, Liechtenstein, Norway and Switzerland
is intended before removing them — DR1 not offering them may be an omission rather than a
rule"). Second, and concretely: `GBNAG_SPS_EX` is not the origin question's private list.
`src/server/app/services/countries/index.js:11-27` fills one `labels` map from it and
exposes it through both `originCountries()` **and** `addressCountries()`, and
`addressCountries()` is read by the private transporter address form
(`.../transport/private-transporter-details/private-transporter-details.controller.js:62,82`)
and the permanent-address block in the identification card
(`.../commodities/animal-identification/address/fields.js:68,110`). Removing Norway or
Switzerland from that block would remove them from every address country dropdown in the
service. The instruction is unsafe as written; the finding's substance (41 vs 31, the
territories, the three naming differences) is sound.

### OVERSTATED, self-declared and correctly handled — `dr1b-inc-082`

Its correction already records it: "'The frontend lets them continue with nothing
entered' is true of the page and false of the notification", with the obligation gate and
completeness path cited. `dr1`'s `inc-092` makes the same narrowing in its own body. Both
runs land in the same place; noting it only because the shipped slot still reads as the
stronger claim and the qualification lives in the correction.

**Everything else in the nine is sound**, and I re-derived the load-bearing claim in each:
the option counts (fe-origin 33 = placeholder + divider + 31; DR1 42 = placeholder + 41);
the `govuk-select` vs `app-country-search` control swap; the four diverging purpose hints;
the `<h1 class="govuk-fieldset__heading">` question vs DR1's
`<h1 class="app-origin-page__heading">Main reason for import</h1>` with a
`govuk-visually-hidden` legend; the three origin label weights (`--s`, `--s`, none against
`--m`, `--m`, `--m`); the 78-entry exit list against DR1's ten; the
`govuk-input__prefix` / `regionOfOriginCodeSuffix` split; and the absent required rule on
`regionOfOriginCode`.

---

## Q2. What did `dr1b` find that `dr1` missed?

**No new subjects.** All nine `dr1b` findings pair to a `dr1` finding. Within shared
subjects, `dr1b` adds four things that are real and that `dr1` does not have:

1. **The quote-conservation catch on DR1's port data** — see the section below. Genuinely
   new, and the best single piece of work in either run's origin domain.
2. **The frontend already owns a type-ahead** (`inc-075`):
   `src/server/common/components/accessible-autocomplete/macro.njk`, already applied to
   `portOfEntry` at
   `.../transport/port-of-entry/port-of-entry.njk:18-27`. Verified — both the component
   directory and the `appAccessibleAutocomplete({ id: "portOfEntry", … })` call exist.
   That turns `dr1`'s "replace the select with DR1's search control" into a costed choice
   between two options. `dr1` instead contributes the no-JavaScript fallback constraint,
   which `dr1b` lacks; the two are complementary.
3. **The Ceuta/Melilla prefix subtlety** (`inc-081` verification): DR1's own prefix table,
   embedded in the captured page as `app-country-search__prefixes`, gives Ceuta `XC` and
   Melilla `XL` against Spain's `ES`, while Azores and Madeira take `PT` and French Guiana
   takes `FR` — so a territory does not simply inherit its parent's prefix. Material to
   whoever builds the prefix split.
4. **A better band on the country list** — see Q4.

`dr1b` also **splits** where `dr1` merged, in the opposite direction to the story under
test: `dr1`'s `inc-080` folds `fe-transit-countries` into its origin-domain country-list
finding, whereas `dr1b` files the transit country list separately as `inc-120` in the
`transport` domain (41 vs 31, same numbers). Nothing is lost either way; it is a domain
boundary, not a coverage difference.

---

## Q3. What did `dr1` find that `dr1b` missed?

The six enumerated above. **All six are real**, each checked against the frontend source at
`76a864ba` and the prototype at `491b3926` rather than taken from either backlog. Two of
the six (`inc-081`, `inc-085`) concern rules that `dr1b`'s own `inc-082` verification line
recites without acting on. One (`inc-088`) turns on a DR1 error string `dr1b` quotes three
times for a different purpose.

`dr1b` did not simply overlook `dr1-inc-081`: it declined it deliberately and instructed
future passes not to raise it. That instruction should be reversed.

---

## Q4. Where they contradict, which is right?

**a) Frontend page order for Transit and Temporary admission horses.** `dr1` right,
`dr1b` wrong. Settled by `flow.js:48-58` read against `navigation.js:27-37` — see Q1.

**b) Band on the country list.** `dr1`-`inc-080` bands it `frontend-work`;
`dr1b`-`inc-074` bands it `needs-backend`. **`dr1b` is right**, and `dr1` contradicts
itself: its own verifier writes "the frontend list is fetched from the reference data
service under GBNAG_SPS_EX" and its difference slot says "the change may be a query rather
than an edit", yet the band stayed `frontend-work`. `src/server/app/services/countries/index.js:11`
is `await fetchCountries(['GBNAG_SPS_EX'])` against
`src/server/app/services/countries/client.js`; no territory exists in the frontend to
select. Adding fourteen entries cannot be done in the frontend. Both runs band the
port-of-exit twin `needs-backend`, so `dr1`'s country-list band is also inconsistent with
its own neighbouring finding.

**c) How many purpose hints lose a full stop.** `dr1`'s title says three; `dr1b`'s says
four. **`dr1b`'s title is right.** Extracting all eleven `govuk-radios__hint` blocks from
both captures, four frontend hints end without a full stop — the Sale/gift hint
("…(e.g. a gift)"), Breeding ("…or produce offspring"), Racing ("…competitive or training
events") and Production ("…or by-product") — and all four end with one in DR1. `dr1`'s
*body* has this right ("closes with '(e.g. a gift)' and no full stop"); only its title
undercounts by treating the Sale/gift hint's other two defects as its whole story. Not a
substantive disagreement, but `dr1b` summarises it more accurately.

**d) `dr1-permanent-address-animals`.** Not in this domain; no view offered.

**e) Whether the frontend's page-level country requirement is a finding.** `dr1` says yes,
`dr1b` says no and says future passes should not revisit it. `dr1` is right — settled in
the gap section above from DR1's soft-validation comment at `app/routes.js:1381-1382` and
the frontend's own `oneOf`/`requiredOneOf` inconsistency between `import-reason` and
`origin`.

---

## The quote-conservation catch

**`dr1b`'s verifier is right, and the catch is real.** The ground truth, from
`capture/html/prototype/dr1-reason-for-import-transit-revealed.html`:

```
Heathrow Airport – Airpets Limited (animals) – GBLHR022 - GBLHR022
```

— the BCP code appears twice, and the entry uses en dashes where seven of the ten use
hyphens. `dr1b`'s author had written it as
`"Heathrow Airport – Airpets Limited (animals) – GBLHR022"`, tidied. The verifier caught
it, restored all ten verbatim, and named both DR1 data defects in the shipped prototype
slot. That is the finding doing exactly what quote conservation is for.

**What `dr1` says about the same data: `dr1` never quotes it at all.** `inc-087`'s
prototype slot paraphrases the entire list as "Edinburgh, Gatwick, Glasgow, three Heathrow
posts, Holyhead, Manchester, Prestwick and Stansted", and no BCP code appears anywhere in
`dr1`'s backlog — `grep` for `GBLHR` returns 0, and the only `GB`-prefixed codes in the
whole file are `GBSHS`, `GBABD`, `GBHC172`, `GBSOU`, `GBNAG` and `GBMNC`, none of them
exit posts. `inc-087`'s verifier does quote a fragment —
`'Heathrow Airport – Airpets Limited (animals)'` — with the codes cut off entirely, and
only to argue that the ten are not a subset of the frontend's 78.

**So this is not a defect both runs share in the same form, and it is worth naming as a
defect all the same.** `dr1` did not silently correct the string; it never surfaced it.
The practical result is identical and slightly worse: `inc-087` asks for the exit list to
be built "labelled with its BCP code" while showing none of the ten codes and flagging
neither data defect, so whoever builds the reference-data list from `dr1` alone would go
back to `app/data/exit-border-control-posts.js` and either copy the doubled code straight
through or quietly clean it — the same decision, taken by the wrong person, unrecorded.
`dr1b`'s `inc-079` is the only place in either corpus where that decision is put in front
of the reader.

Two runs, one subject, two failure modes: `dr1b`'s author tidied and was caught by its own
verifier; `dr1` paraphrased and nobody was there to catch it, because paraphrase leaves
nothing to check against.

---

## Notes

- No PROVENANCE contamination path touches this domain. The one contaminated subject
  (item 3, the blocked exit-details hub row) belongs to `hub`. `dr1b`-`inc-080` mentions
  the "Exit details" row and its "Cannot start yet" state, but only as context for the
  page-shape change, and I verified that claim independently against
  `fe-hub-exit-details-blocked.html`, which does render `Exit details` with
  `Cannot start yet`. Worth one caveat for the `hub` reviewer: the default `fe-hub.html`
  capture has **no** Exit details row at all, so the row is conditional on the reason, not
  merely disabled — a nuance `inc-080`'s sentence flattens.
- Both runs mark every origin finding `todo` with no `gate` and no `dependsOn`.
- A difference neither run records, offered as an observation rather than a finding: DR1's
  reveal selects use the placeholder `Select one` throughout, where the frontend uses
  `Select a country` and `Select port of exit`.
