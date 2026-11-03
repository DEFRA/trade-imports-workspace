# V4 Data Fields: the authoritative commodity rule lists, and what main does

Checked 2 November against `origin/main` of the animals frontend (`e1237ac7`).

Source: [Live Animals & Germinals Data Fields - V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582/Live+Animals+Germinals+Data+Fields+-+V4),
already a distilled source of this programme as `confluence:6497338582`, captured locally at
[`../sources/6497338582.json`](../sources/6497338582.json) on 26 October.

## Why this page changes the picture

It carries **six collapsed `expand` macros**, each holding the explicit commodity-code list for one rule:

| Expand macro title | Rule it defines |
|---|---|
| Number of packages commodities (54) | which commodities ask for a number of packages |
| CPH required commodities (19) | which commodities require a CPH number |
| Passport identifier commodities (6) | which commodities offer a passport identifier |
| Ear tag identifier commodities (4) | which commodities offer an ear tag |
| Tattoo identifier commodities (2) | which commodities offer a tattoo |
| Permanent address required commodities (3) | which commodities need an animal's permanent address |

Plus un-counted expands for **Contains Unweaned Animals** and **Horse Name**.

Those are exactly the rules held in
[`services/commodities/rules.js`](../../../../repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/services/commodities/rules.js).
So this page, not the prototype, is the authority for every one of them — and it is a requirements
document rather than demo data, which the prototype's `app/data/commodities.js` was.

**The counts in the macro titles are unreliable.** "Tattoo identifier commodities (2)" lists five entries;
"Passport identifier commodities (6)" lists nine. Read the lists, not the titles.

**The distil missed all of them.** The extract for this source
([`../distil/extract/confluence-6497338582.json`](../distil/extract/confluence-6497338582.json)) carries no
claim for any of the six lists — its only package claims are that *germinal* package type was de-scoped on
7 September (`confluence-6497338582-p1-106`, `-p1-107`). The extractor did not open the `expand` macros'
`ac:rich-text-body`, so every one of these lists was invisible to the backlog. The raw captured page holds
them, so this is an extraction gap, not a source gap. See "For the distil method" at the foot.

## Rule by rule: V4 against main

Distinct chapter-01 codes only. The page also lists germinal codes (`05111000`, `05119985`) and egg codes
(`0407`, `04071100`, `04071911`, `04071919`) against some rules; those are outside the live-animals set,
which reads only what reference-data serves after MDM's germinal codes are dropped.

### Number of packages — main is right

V4's 23 chapter-01 codes: `0101`, `0102`, `0103`, `010410`, `010420`, `01051111`, `01051200`, `01051300`,
`01051400`, `01051500`, `01059400`, `01059910`, `01059920`, `01059930`, `01059950`, `01061410`, `01061900`,
`01062000`, `01063100`, `01063200`, `01063980`, `01064100`, `01064900`.

`PACKAGE_COUNT_CODES` on main holds **exactly those 23 codes**. An exact match.

This settles inc-024 and vindicates main over the prototype:

- The apparent "inconsistencies" I raised on 2 November were wrong. **Domestic rabbits**: V4 lists both
  "Domestic European Rabbits" and "Domestic Rabbits- Other" under `01061410`, so main correctly excludes
  `01061490`. **Birds**: V4 lists birds of prey (`01063100`), psittaciformes (`01063200`) and game birds
  (`01063980`) and does not list ratites or pigeons, so main correctly excludes `01063300` and `01063910`.
- The prototype's list (nine mammal commodities, no poultry, bees, reptiles or parrots) is simply wrong, as
  the physical logic already suggested: V4 asks for packages on day-old chicks, adult poultry, bees, insects,
  reptiles and parrots, which are the commodities that genuinely arrive in crates, boxes and hives.

Out of this set's scope but on V4's list: germinal semen and embryos/ova (`05111000`, `05119985`) and
poultry hatching eggs and SPF eggs (`0407*`).

### Permanent address — main is right, and the EUDPA-669 branch breaks it

V4: three commodities, all `01061900` — **Cats, Dogs, Ferrets**.

`PERMANENT_ADDRESS_SPECIES` on main holds `Felis catus`, `Canis familiaris`, `Canis lupus familiaris` and
`Mustela putorius furo` — cat, dog (two spellings) and ferret. Correct.

This **confirms by specification** the defect raised on animals frontend PR #432, where the branch replaces
`Canis familiaris` with `Nyctereutes procyonoides` (MDM's raccoon dog). V4 says dogs. The raccoon dog is not
on the list.

### Contains Unweaned Animals — main asks too few

V4: `0101` (equines: horses, asses, mules, hinnies), `0102` (cattle), `0103` (pigs), `010410` (sheep),
`010420` (goats) — **five codes**.

`UNWEANED_CODES` on main: `['0102']` — cattle only.

So main is missing equines, pigs, sheep and goats. Note the history: frontend `598c6045`
("fix(parity-dr1): the frontend asks whether the consignment holds unweaned animals when it holds horses;
DR1 asks that question only of cattle and pigs") deliberately **removed** horses under DR1 parity. V4
includes them. DR1 parity and V4 disagree, and V4 is the later data-fields specification.

**This widens inc-023**, which asks only for cattle and pigs — itself taken from the prototype.

### Ear tag — main asks too few

V4: `0102` Cattle, `0103` Pig (Domestic), `010410` Sheep (Domestic), `010420` Goats. Marked **Optional**.

Main: `EAR_TAG_CODES` is `['0102']` — cattle only, via `COMMODITY_IDENTIFIERS`.

Missing pig, sheep and goats. This is the parent backlog's "Ear tags for pigs, sheep and goats" row, which
the 27 October re-analysis found was waiting for those commodities "to reach the catalogue from MDM". They
have, and here is the list it needs.

### Tattoo — main asks too few

V4: `01061900` (Cats, Dogs, Ferrets), `0103` (Pigs), `0102` (Bovine).

Main: `TATTOO_CODES` is `['01061900']`.

Missing pigs and cattle. History again: frontend `b1ff013c` ("fix(parity-dr1): the frontend asks for a
tattoo on every cow; DR1 asks a cow only for an ear tag and a passport") removed tattoo from cattle under
DR1 parity. V4 lists Bovine for tattoo. Another DR1-versus-V4 conflict.

### Passport — main is right

V4: `0101` (Donkey and asses, Horse, Ponies, Zebras, Mules/hinnies/hybrids), `0102` (Cattle),
`01061900` (Cats, Dogs, Ferrets).

Main: `PASSPORT_CODES` is `['0102', '0101', '01061900']`. Match.

### CPH number — main asks too many

V4's 19 rows give 14 chapter-01 codes: `0102`, `0103`, `010410`, `010420`, and all ten poultry codes
(`01051111`, `01051200`, `01051300`, `01051400`, `01051500`, `01059400`, `01059910`, `01059920`, `01059930`,
`01059950`). Plus egg codes `04071100`, `04071911`, `04071919`, outside this set.

Main inverts it. `CPH_EXEMPT_CODES` is `['0101', '01061900']`, and the obligation is
`anyNotInUnionOf(commodityCode, cphExemptCommodityCodes, …)` — CPH is **mandatory for every code except**
horses and `01061900`.

So main requires a CPH number for about ten commodities V4 does not list: `01061410`, `01061490`,
`01062000`, `01063100`, `01063200`, `01063300`, `01063910`, `01063980`, `01064100`, `01064900` — rabbits,
reptiles, birds of prey, parrots, ratites, pigeons, other birds, bees and insects.

The deny-list shape is the deeper problem: **every new code MDM adds defaults to "CPH required"**, which the
specification does not support. V4's allow-list would default the other way. Main's shape came from DR1
parity (`fb0255c1`, "DR1 asks for a CPH number on every consignment except horses and the 01061900 group").

## Summary

| Rule | V4 codes | Main | Verdict |
|---|---|---|---|
| Number of packages | 23 | same 23 | ✅ match — settles inc-024 |
| Permanent address | cat, dog, ferret | same | ✅ match; EUDPA-669's branch breaks it |
| Passport | 0101, 0102, 01061900 | same | ✅ match |
| Contains unweaned | 0101, 0102, 0103, 010410, 010420 | 0102 only | ❌ 4 missing |
| Ear tag | 0102, 0103, 010410, 010420 | 0102 only | ❌ 3 missing |
| Tattoo | 0102, 0103, 01061900 | 01061900 only | ❌ 2 missing |
| CPH required | 14 (allow-list) | all but 0101 and 01061900 (deny-list) | ❌ ~10 over-asked, wrong shape |

## What this changes in the backlog

- **inc-024 is unblocked.** Main's package list is correct per V4. The row's work shrinks to pinning the list
  against V4 with tests and citing the page, plus deciding where the germinal and egg entries live (the
  germinal codes belong to the germinal-products theme; the egg codes may be out of programme scope).
- **inc-023 widens** from "cattle and pigs" to V4's five codes, and its criteria should cite V4 rather than
  the prototype.
- **Three findings belong to other themes,** because this theme does not own the identification or CPH code
  areas: ear tag, tattoo and CPH. Recorded in `deferred.md` for whoever owns
  `identification-and-permanent-address` and the CPH work, with the lists above.
- **The dog defect on PR #432 now has a specification behind it,** not just inference from MDM's common
  names.

## The bigger finding: the page's live-animals half was never extracted at all

Checking the other Confluence sources for the same problem turned up something larger. There is only one captured
Confluence page in the whole workspace (`6497338582`; the copies under `workareas/reviews/` are review clones of
this repo and `tim`'s test fixtures). So the blast radius is one page — but on that page it is far wider than six
collapsed macros.

**The collapsed macros are not the root cause.** The source was scoped at intake to germinals only:

```json
"scope": "the Germinal Data Elements section, from its heading up to the Out of Scope Data Elements heading,
          every table row in it; plus any row of the Out of Scope Data Elements table that names germinal products",
"role":  "policy for the germinal products set: which data a germinal products notification captures …"
```

The partition was faithful to that scope. Its single part reads the germinal section, the Address Block and two
out-of-scope rows, and says of the rest, in terms: *"For context only, not to claim: the note at the top of h2 'Live
Animal Data Elements' … and that section's table header row for the column names."* Its helper file is even named
`germinal-to-end.txt`.

So the extract's 109 claims cover only three sections:

| Section | Claims |
|---|---|
| §Germinal Data Elements | 66 |
| §Address Block | 38 |
| §Out of Scope Data Elements | 5 |

**Four sections were never read**, holding **41 live-animal field specifications** — the authoritative data
dictionary for essentially the whole live-animals journey:

| Section | Fields never claimed |
|---|---|
| Live Animal Data Elements | `reference_number`, `responsible_person_for_load`, `country_of_origin`, `region_of_origin_code`, `region_of_origin_code_requirement`, `internal_reference_number`, `commodity_selection`, `type_selection`, `species_selection`, `number_of_packages`, `number_of_animals_quantity`, `animals_certified_for`, `contains_unweaned_animals`, `place_of_origin`, `consignor`, `consignee`, `importer`, `place_of_destination`, `permanent_address`, `transporter_type`, `commercial_transporter`, `private_transporter`, `county_parish_holding_cph`, `port_of_entry`, `arrival_date_at_port`, `means_of_transport`, `transport_identification`, `transport_document_reference`, `transited_countries`, `contact_address` |
| Reason of Import | `reason_for_import`, `purpose_in_internal_market` |
| Animal Identifiers | `animal_identifier_passport`, `animal_identifier_tattoo`, `animal_identifier_ear_tag`, `animal_identifier_identification_details`, `animal_identifier_description` |
| Documents | `accompanying_document_type`, `accompanying_document_attachment_type`, `accompanying_document_reference`, `accompanying_document_date_of_issue` |

That is why live-animal rows across this programme were written from the prototype's `app/data/*.js` demo data: for
live animals, the specification was in the corpus but outside the source's scope, so no claim ever carried it.

**Which themes this reaches** — seven, not one:

| Theme | Unread fields |
|---|---|
| commodities-and-reason | 9: commodity and species selection, type selection, packages, animal count, certified-for, unweaned, reason for import, purpose |
| identification-and-permanent-address | 7: permanent address, CPH, and all five identifier fields |
| arrival-and-transit | 7: port of entry, arrival date, means of transport, transport identification and document reference, transited countries, place of destination |
| origin-page | 4: country of origin, region code and its requirement, place of origin |
| consignment-parties | 4: consignor, consignee, importer, contact address |
| transporters | 4: transporter type, commercial and private transporter, responsible person for load |
| documents | 4: the four accompanying-document fields |

One check worth recording as a **non**-finding: `animal_identifier_wing_ring` is in the Out of Scope section
(de-scoped), so main is right not to have a wing ring identifier. `arrival_time_at_port`, `journey_log` and
`transport_after_bcp` are de-scoped too, and those five out-of-scope claims the extract did capture.

### What to do about it

This is a re-distil of one source with a widened scope, not a re-run of the programme. The source's `scope` and
`role` change to cover the whole page, `tim distil reset --source confluence:6497338582` moves its extract and verify
files aside, and the next launch extracts all seven sections. The reconcile and consolidate stages then weigh those
claims against the prototype's — and because the prototype's live-animal claims are mostly `kind: "data"`, the
specification should win wherever the two disagree, as it did for every rule compared above.

Expect it to change rows in all seven themes, so it is worth doing before more of them are played. The four
discrepancies already found by hand (unweaned, ear tag, tattoo, CPH) are a sample of what a full extract would
surface, not the complete list.

## For the distil method

The extractor did not open Confluence `expand` macros, so six authoritative rule lists on an already-distilled
source never reached a claim — and rows were then written from the prototype's demo data instead, which is how
inc-012 came to be blocked on a false premise and inc-024 framed as a contradiction rather than a match.

Three changes worth making, in order of value:

1. **Intake should scope a source to the page, not to the theme in hand.** This is the root cause. The page was
   brought in for germinals and scoped to germinals, so its live-animals half — four sections, 41 field
   specifications, seven themes' worth — never reached a claim, and the prototype's demo data stood in for it. A
   narrow `scope` is a reasonable economy for a page that genuinely covers one area, but a title like "Live Animals
   **&** Germinals Data Fields" is a warning that it does not. Worth a rule in `DISTIL.md`: when a source's own
   title or section list names an area the programme covers, the scope includes it or the intake records why not.
2. **The Confluence extract brief should read `ac:structured-macro name="expand"` bodies.** The brief points the
   agent at headings and table rows (`grep -n '<h[1-4]'`, "one claim per row"), and an expand's `ac:rich-text-body`
   sits nested *inside* a table cell — so even in scope, a collapsed 54-item list reads as a one-line cell. The
   brief should also treat an expand's title count as unreliable: here "Tattoo identifier commodities (2)" lists
   five entries and "(6)" for passport lists nine.
3. **Where a requirement exists in both a prototype (`kind: "data"`) and a specification, the specification wins.**
   A reconcile or consolidate check for "criterion sourced only from a prototype `kind: data` claim where another
   source covers the same field" would have caught inc-012, inc-023 and inc-024 — and, had the scope been right,
   would have caught them at distil time rather than two re-analyses later.
