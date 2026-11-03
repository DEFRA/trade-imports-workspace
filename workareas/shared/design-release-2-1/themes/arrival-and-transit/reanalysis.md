# Arrival and transit: re-analysis, 2 November

Sam ruled on 2 November that this theme reuses `feat/EUDPA-694-design-release-2-1-arrival-and-transit` rather than a
fresh branch, with `main` brought in through the loop. This is what the branch holds, what `main` has done since,
and what the backlog now asks for.

Read against: `origin/main` in every repo on 2 November (animals frontend `e1237ac7`, workspace `5c9419e7`); the
branch tips as pushed on 13 October; the prototype at `ca5cf96` (28 October), the newest commit, compared with
`04a073b`, the commit the rows cite; and the owner rulings in `../../sources/`, the 26 October one included.

## In short

- **The branch's own work is five rows' worth, built on 13 October:** arrival wording (inc-026), port labels
  (inc-027), required means of transport (inc-028), the transit page's title, Back link, empty state and redirect
  (inc-029) and the transit country list (inc-174). Everything else on it is the journey foundation and reference
  lists themes it was stacked on, which `main` now holds in their reviewed form.
- **`main` already has inc-026, inc-027, the transit Back link and the empty-state removal.** Design snagging
  (EUDPA-720) took them, and the return-to-origin routing came with journey foundation.
- **Still owed:** the required means of transport, the transit page's browser title and redirect, and the transit
  country list with territories.
- **One ruling changed a row.** Sam's 26 October ruling makes Save and return to overview make the same checks as
  Save and continue. inc-028 said Save and return should save without a means of transport, so it is replaced by
  inc-241, which refuses on both buttons.
- **The prototype has not moved for this theme.** `arrival-details.html`, `transit-countries.html` and their routes
  in `app/routes.js` are unchanged from `04a073b` to `ca5cf96`.
- **Every pull request conflicts with `main`**, so GitHub runs no checks on them. Merge row inc-240 brings `main` in.
- **Stub, reference data and INS frontend are not needed.** Their branches carry nothing `main` lacks.

## Repo by repo

### Animals frontend (#402): 18 ahead, 26 behind, cut from `7bca59b7` (13 October)

| Branch commit | Row | On `main`? |
|---|---|---|
| `bb6fb2e0` arrival wording, animals and plants | inc-026 | Yes. Design snagging inc-208 reworded the page: labels, hints, the 'Select one' option and the Air, Rail, Road and Sea labels (`transport/means-of-transport-label.js`) |
| `b2d30a1d` port options read '<name> - <code>' | inc-027 | Yes. `services/ports/index.js` labels every port '<name> - <code>' |
| `843821b8` required means of transport, return to where the trader came from | inc-028 | Return routing: yes, through journey foundation (`kit.nextTarget`). Required means: **no**. `port-of-entry/validate.js` still checks `oneOf('meansOfTransport', …)`, so an empty means passes |
| `49e22db9` transit title, Back link, empty state, redirect | inc-029 | Back link: yes (`kit.runBackLink`, snagging inc-218). Empty state: removed on `main` (snagging inc-209). Title and redirect: **no**. The page passes the heading to `kit.base`, and nothing redirects |
| `7d42a714` transit country search offers countries and territories | inc-174 | **No.** The transit page still offers `countries.originCountries()`, the 31-country list without territories, and labels with `countries.originLabel` |
| `743b6a73` to `519763aa` (7 commits) | journey foundation | Yes, in reviewed form |
| `ba4d6de5` to `adca9177` (4 commits), and the merges `2a5966ec` and `25a5d2bc` | reference lists, stacking | Yes, in reviewed form |

**What `main` changed in the same files.** Design snagging (#421, 23 October) rewrote the port-of-entry controller
(`kit.recoverableSave` now returns `{ value }`), the transit countries controller (`render`, `postAdd`, `postRemove`,
`postContinue`, `rows.js`, `remove-action.js`, refusals through `kit.logRefusal`), and the transit validator
(`offeredCodes`, `partitionByOffered`, `TRANSIT_REFUSAL`). It also renamed `countries.destinationCountryOptions()` to
`countryAndSubdivisionOptionsNamedWithCountry()`, and rewrote `arrival-transit.fit.spec.js`,
`port-of-entry.controller.test.js` and `transporters.fit.spec.js`. Since then: #436 (26 October) makes Save and
return run the same checks as Save and continue, #440 moves the arrival pages' appearance checks to screenshots, and
#430 keeps the arrival date window right across a clock change.

**Conflicts on merging `main`:** 16 files: `accessible-autocomplete.js`, `services/countries/index.js`,
`shared/kit.js`, the check-answers copy (en, cy) and its test, the transport copy (en, cy),
`arrival-transit.fit.spec.js`, and the port-of-entry and transit-countries controllers, their tests and templates,
plus `transit-countries/validate.js`. Each sets `main`'s rewrite against the branch's older copy.

### Tests (#24): 24 ahead, 167 behind, cut from `5ba19abf` (13 October)

| Branch commit | Row | On `main`? |
|---|---|---|
| `7f87ba3` arrival wording | inc-026 | Yes, with snagging's page object and `domain/animals/constants/means-of-transport.ts` |
| `d2e2f23` port labels | inc-027 | Yes |
| `5246f57` required means | inc-028 | **No** |
| `29c74b5` transit title, Back link, empty state, redirect | inc-029 | Back link yes; title and redirect **no** |
| `22a54fa` transit country list | inc-174 | **No**, but `main` now has `countryAndSubdivisionNamesWithCountry()` in `resources/reference-data/reference-data.ts`, used by the origin and destination list specs |
| `bf126b6` drops the retired `@integration` tag | inc-029, inc-174 | Only matters for the specs those rows add |
| `3271295`, `e69bb75`, and 16 journey foundation and reference lists commits | stacking | Yes, in reviewed form |

**Conflicts on merging `main`:** 17 files: `flows/animals/journey.ts`, the animals and plants arrival-details page
objects, the transited-countries page object, `resources/reference-data/reference-data.ts`, and the arrival details,
transited countries, transit means scope, port of entry select, soft save, hub groups, destination and port of exit
list, horse temporary admission and overview task return specs, plus plants `arrival.spec.ts` and
`destination.spec.ts`.

### Plants frontend (#95): 14 ahead, 30 behind, cut from `deec2c79` (13 October)

| Branch commit | Row | On `main`? |
|---|---|---|
| `b2f3bdc` arrival wording | inc-026 | Yes. `main`'s arrival details copy, template and controller are newer than the branch's in every hunk |
| `3919fe0` place of landing options read '<name> - <code>' | inc-027 | Yes. `services/ports/index.js` |
| 11 journey foundation and reference lists commits | stacking | Yes |

**Conflicts on merging `main`:** 6 files: the arrival-details copy (en, cy), its copy test, its template, its FIT
spec and `shared/kit.js`. Nothing on this branch is still owed: transit is animals only, and plants asks no means of
transport. After the merge the plants PR shows no change of its own.

### Workspace spec (#154): 1 ahead, 134 behind

`5a995a66` (26 October) carries this theme's spec: REQ-ARRIVAL-006 rewritten to the means refusal, and
REQ-TRANSIT-COUNTRIES-006 (title), -008 (redirect), -009 and -010 (territories) added, with coverage linking tests
that exist only on the old branches. Two coverage files conflicted with `main`. Its REQ-ARRIVAL-006 also says "Save
and return to overview with no means of transport is not refused", which the 26 October ruling makes wrong.

The workspace took `main` on 2 November, outside the loop with Sam's go (a branch run cannot build the workspace
repo), keeping `main`'s version of all seven spec files. The rows write each requirement with its code and can start
from `5a995a66`'s wording.

### Stub (#20), reference data (#27), INS frontend (#49): not needed

Each carries only the reference lists and journey foundation commits it was stacked on. A trial merge of `main` is
clean and leaves each tree identical to `main`, so none of the three adds anything. No row builds there, so they are
not in `build-args.json`'s `repos` and take no merge row. They are carry-only pull requests whose themes have merged:
HOW-TO-BUILD says to close such a pull request, and Sam decides when.

**Corrected 3 November.** This said none of the three had a branch image. All three did, from 13 October, and the
stack took them for the theme's end-to-end runs: the old reference data had no commodity search, which turned inc-240's
pull requests red. With Sam's go, `main` was merged into all three theme branches (reference data `5976c37`, stub
`12a4c2a`, INS frontend `625ca19`), each tree identical to `main`, and their branch images rebuilt. Those images stay
pinned to that point: anything these repos land on `main` later reaches the theme's stack only if their branches take
`main` again.

## What the branch built that `main` does not yet have

1. Means of transport required to leave arrival details (animals frontend `843821b8`, tests `5246f57`).
2. The transit countries page's browser title, 'Transit countries' (`49e22db9`, `29c74b5`).
3. The redirect to the overview when transit does not apply, on the page and on every post (`49e22db9`, `29c74b5`).
4. The transit country search offering territories named with their country, and saving and listing them
   (`7d42a714`, `22a54fa`).
5. The spec for all four (`5a995a66`).

## What `main` now does differently, so the old code must change

- **Save and return makes the same checks as Save and continue** (#436, 26 October ruling). `843821b8` deliberately
  let Save and return skip the means rule through `allowMissing` on a hub exit. That is now wrong: the means rule
  applies to both buttons.
- **The port-of-entry and transit controllers, validators and tests were rewritten** by design snagging, so none of
  the branch's hunks apply. Each row rebuilds its change on `main`'s code and takes only the strings, shapes and test
  ideas from the old commits.
- **The countries helper was renamed** to `countryAndSubdivisionOptionsNamedWithCountry()`, and `originCountryOptions`
  is gone.
- **`main`'s spec still says the opposite of inc-241 in two places:** REQ-ARRIVAL-006 ("Saving the page empty keeps a
  draft and moves on") and the journey-flow scenario for arrival details saved and returned without a means of
  transport, which `soft-save.spec.ts` and a port-of-entry controller test prove. inc-241 rewrites both.

## What is already on `main`, so the branch's version is dropped

- Arrival wording, labels, hints and the means of transport options (inc-026, by snagging inc-208), in both frontends.
- Port options reading '<name> - <code>' (inc-027), in both frontends.
- Return to the overview or the review, and continuing to transit countries or Transporter details (journey
  foundation inc-002 and inc-003).
- The transit page's Back link (snagging inc-218) and the removal of its empty-state line (snagging inc-209).
- Everything the stub, reference data and INS frontend branches carry.

Merge row inc-240 therefore leaves each branch's tree identical to `main`: nothing from the old commits survives the
merge itself.

## What the todo rows still owe

| Row | Owes | Changed today |
|---|---|---|
| inc-240 (new) | `main` merged into the animals frontend, plants frontend and tests branches, each tree identical to `main`, every PR checked and green | Added. Before every other row, which now waits on it |
| inc-241 (new) | Means of transport required on Save and continue **and** Save and return to overview, with the error in the summary and on the field, 'Error: ' title, nothing saved, answers shown back, Welsh error; the arrival and journey-flow spec rewritten to match | Replaces inc-028 under the 26 October ruling |
| inc-028 | Nothing | `merged-into` inc-241 |
| inc-029 | Browser title 'Transit countries - Import notification service - GOV.UK' (and 'Error: ' when an error shows); redirect to the overview on the page and on every post when the means is not Rail or Road; REQ-TRANSIT-COUNTRIES-006 and -008 | Scope unchanged. Waits on inc-240; notes say what `main` holds now |
| inc-174 | Transit search offers `countryAndSubdivisionOptionsNamedWithCountry()`, territories named '<territory> (<country>)', saved and listed again; REQ-TRANSIT-COUNTRIES-009 and -010 | Scope unchanged. Waits on inc-240; the 23 October coverage note corrected (`main` has no 009 or 010 at all) |
| inc-025 | Nothing | Stays dropped |

No new behaviour needed a new row: the prototype has not changed for these pages, and the plants frontend owes
nothing.
