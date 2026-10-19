# Design Release 2.1 snags: what we found and what we will do

The interaction designer and content designer compared the CDP test environment (built from `main`) with the Design Release 2.1 prototype on 19 October 2026 and listed 38 differences. We checked every one against the code and against Playwright screenshots of both the prototype (commit `56371e2`) and `main`, with JavaScript on and off, and at phone width where layout matters.

The prototype decides look, feel and content. We push back only where it needs JavaScript with no fallback, breaks accessibility or a GOV.UK pattern, or goes against a ruling Sam has recorded.

To see the comparisons side by side, open [screens.html](screens.html). The points we want to talk through are in [discussion.md](discussion.md).

## Summary

| Verdict | Count | Snags |
|---|---|---|
| Adopt: we copy the prototype | 12 | S01, S03, S05, S06, S09, S12, S15, S17, S18, S19, S29, S36 |
| Adopt, adapted: same rendered result, built from GOV.UK parts | 18 | S02, S04, S07, S10, S11, S14, S16, S21, S23, S24, S26, S27, S28, S31, S32, S33, S34, S38 |
| Discuss: we propose something different | 3 | S08, S25, S37 |
| Already built: the fix exists but is not on `main` yet | 3 | S13, S20, S22 |
| No difference found: we need the steps taken | 1 | S35 |
| No action: the designers agree `main` is right | 1 | S30 |

- **Why the test environment looked behind:** 15 snags (S01–S03, S05–S07, S09, S10, S13, S20–S24, S38) are already fixed on theme branches that have not merged (origin page, commodities and reason, arrival and transit, overview and review). The new **design-snagging** theme brings those fixes to `main` now, rather than waiting for each whole theme to merge.
- **New work:** 16 backlog rows, `inc-202` to `inc-217`, in [theme-rows.json](theme-rows.json). Every row changes both frontends where they share the page or component, and has English and Welsh copy. Row moves are in [moves.json](moves.json).
- **Waiting on design:** the joined blue search button (design question 1), results as you type (question 3), adding transit countries on pick (question 4) and the CPH boxes (question 7).
- **Calls we made that Sam should check:** listed at the end of [discussion.md](discussion.md#for-sam-calls-we-made-and-flagged).

Paths in the Refs column are relative to the prototype (`app/…`), the animals frontend features folder (`features/…` = `src/server/app/sets/live-animals/journeys/linear/features/…`), or the named repo.

## Origin

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S01 | Hint text should be removed | The hint 'Start typing to search for a country.' is still on `main`. The origin-page branch removes it. | Adopt | The prototype is right. Without JavaScript the hint tells people to type into a dropdown. | inc-203 | [prototype](screens/prototype/S01--default.png) · [main](screens/main/S01--empty.png) · [main, no JS](screens/main/S04--region-code-revealed--nojs.png) | `app/views/design-release-2.1/origin-of-the-import.html:49-103`; `features/origin/copy/copy.en.js:5`; branch `f69647ac` |
| S02 | Search bar styling does not follow prototype | `main` has a hint and no placeholder, and matches are not bold. Plants shows a dropdown arrow where animals shows a magnifier. | Adopt, adapted | The placeholder, no hint and the '(France)' rows are built, and come now. The joined blue button waits on design question 1. A real Search button would submit the whole page. Bold matches are for Sam (S21). We give plants the same magnifier. | inc-202, inc-203 | [prototype](screens/prototype/S02--default.png) · [prototype, open](screens/prototype/S02--suggestions-open.png) · [prototype, no JS](screens/prototype/S02--typed--nojs.png) · [main](screens/main/S02--empty.png) · [main, open](screens/main/S02--suggestions-open.png) · [plants](screens/main/P-search--empty.png) | `origin/template.njk:18-27`; `src/client/javascripts/components/accessible-autocomplete.js:28-31`; branch `f69647ac`, `7b24d265` |
| S03 | Hint text for origin code is wrong | `main` has the old radios hint. The new one is built on the branch. | Adopt | A content change. We also make the revealed label bold, as the prototype draws it. | inc-203 | [prototype](screens/prototype/S03--region-code-revealed.png) · [main](screens/main/S03--region-code-revealed.png) | `origin-of-the-import.html:133-135`; `features/origin/copy/copy.en.js:11`; branch `b03938b9` |
| S04 | Origin prefix box is missing | `main` shows the prefix only after a save. There is no empty slot, and nothing reacts to the pick. | Adopt, adapted | With JavaScript we copy the prototype fully: an empty slot, then 'FR' as soon as France is picked. Without JavaScript the prefix shows once the page is re-shown. | inc-204 | [prototype, no country](screens/prototype/S04--no-country-yet.png) · [prototype, FR](screens/prototype/S04--france-prefix.png) · [main](screens/main/S04--region-code-revealed.png) | `app/views/partials/region-of-origin-code-input.html:14-30`; `app/assets/javascripts/country-search.js:106-114`; `accessible-autocomplete.js:56-69` |
| S05 | Internal reference content is incorrect | The hint ends 'It can be up to 58 characters.' and the box is three-quarters wide. | Adopt | A content change, built on the branch. The limit still shows in the error. We also make the box full width, as drawn. | inc-203 | [prototype](screens/prototype/S05--default.png) · [main](screens/main/S05--empty.png) | `origin-of-the-import.html:155-169`; `features/origin/copy/copy.en.js:21`; `origin/template.njk:52-60` |

## What are you importing?

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S06 | Inset content is different under H1 | `main` has the health-certificate wording. The ITAHC wording is built on the commodities branch. | Adopt | A content change in the standard inset. ITAHC is not spelled out on this page: worth a look by the content designer. | inc-205 | [prototype](screens/prototype/S06--default.png) · [main](screens/main/S06--empty.png) | `what-are-you-importing.html:42-45`; `features/commodities/copy/copy.en.js:7`; branch `cadd4794` |
| S07 | Search box hint text is different | The old wording plus 'Enter at least 3 characters.' | Adopt, adapted | We take the prototype's hint. Without the last sentence, a 1 or 2 character search shows nothing at all, so we add a line that appears only after a search that short. | inc-205 | [prototype](screens/prototype/S07--default.png) · [main](screens/main/S07--empty.png) | `commodities/search/search.njk:35,61-63`; `search/matching.js:4`; `search.controller.js:45` |
| S08 | Search does not behave as expected | `main` searches when Search is pressed. The prototype lists results as you type, and cannot be finished without JavaScript. | Discuss | Results as you type are design question 3, and commodity search waits on MDM. We take the look now: a full-width box with an icon search button. | inc-210 (look only) | [prototype](screens/prototype/S08--cattle-results-open.png) · [prototype, no JS](screens/prototype/S08--typed--nojs.png) · [main](screens/main/S08--results.png) | `what-are-you-importing.html:87`; `commodities/search/search.njk:30-46`; ruling sam-2026-10-09-pm claim 13 |

## Main import reason

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S09 | H1 should be 'Main import reason' | The H1 is 'Main reason for import'. The fix is built on the commodities and overview branches. | Adopt | A plain wording change. The H1, title, overview task and review card stay the same as each other. | inc-207 | [prototype](screens/prototype/S09--default.png) · [main](screens/main/S09--empty.png) | `reason-for-import.html:42`; `features/import-reason/copy/copy.en.js:2`; branch `77762214`, `56a0aeb8` |
| S10 | Styling of search boxes under child radios is different | Full-width type-ahead boxes with bold labels. The prototype draws plain selects. | Adopt, adapted | The type-ahead stays: about 250 countries is too many for a select, and Sam's ruling (claim 4) keeps it. Labels, 'Select one' and width match. | inc-207 | [prototype](screens/prototype/S10--transit-revealed.png) · [main](screens/main/S10--transit-revealed.png) · [main, no JS](screens/main/S10--transit-revealed--nojs.png) | `partials/transit-options-select.html:4-22`; `import-reason/template.njk:33-77` |
| S11 | Date picker does not follow pattern | The toggle is near-black, and the calendar covers Port of exit and the buttons. The label is bold. | Adopt, adapted | Our blue toggle and in-page calendar already exist, but only arrival details uses them. They become the default for every date picker in both frontends. The label becomes regular weight. | inc-206, inc-207 | [prototype](screens/prototype/S11--calendar-open.png) · [main](screens/main/S11--calendar-open.png) · [plants](screens/main/P-date-input--calendar-open.png) | `app/assets/sass/application.scss:6-68`; `shared/kit.js:311-327`; `src/client/stylesheets/components/_date-picker.scss:19-63` |
| S12 | Spacing below date picker too tight | No gap between Exit date and Port of exit, with or without JavaScript. | Adopt | The prototype's 30px is the standard GOV.UK gap between questions. | inc-207 | [prototype](screens/prototype/S12--exit-date-filled.png) · [main](screens/main/S12--temporary-admission-revealed.png) | `application.scss:1660-1664`; `import-reason/template.njk:66-77` |

## Commodity details

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S13 | 'Species' is missing from table | Missing on `main`. Built on the commodities branch. | Already built | Nothing new to build. We bring it to `main` now. | inc-205 | [prototype](screens/prototype/S13--cattle.png) · [main](screens/main/S13--answered.png) | `consignment-details.html:58-90`; `_selected-commodities-table.njk`; branch `cadd4794` |
| S14 | Spacing above commodity title too tight | 20px above the first heading and 30px after each rule. A rule also sits above the buttons. | Adopt, adapted | We match the prototype's 40px with GOV.UK spacing classes, and draw rules only between commodities. | inc-205 | [prototype](screens/prototype/S14--two-commodities.png) · [main](screens/main/S14--answered.png) | `application.scss:1236-1250`; `consignment-details.njk:23-33`; `_species-quantities.njk:41` |

## Identification details

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S15 | 'Species' is missing from table | No Species column in the summary. | Adopt | Content and layout only. Species are grouped under each commodity, as the prototype does (except 01061900, one row per species). | inc-214 | [prototype](screens/prototype/S15--one-animal-saved.png) · [main](screens/main/S15--one-animal-added.png) | `animal-identification-details.html:61-85`; `app/routes.js:860-927`; `summary/selected-commodities.js:16-24` |
| S16 | Visually very different, no grey boxes | Plain sections, bold labels with hints, two-thirds width. | Adopt, adapted | We copy the look using GOV.UK summary card styling: a border and a grey header. The prototype's custom grid breaks on a phone. | inc-214 | [prototype](screens/prototype/S16--one-animal-saved.png) · [prototype, phone](screens/prototype/S16--one-animal-saved--mobile.png) · [main](screens/main/S16--one-animal-added.png) | `animal-identification-details.html:94-165`; `application.scss:2254-2271`; `_identification-card.njk:9-81` |
| S17 | Saved details should appear below the fields | The saved-animals table sits above the fields. | Adopt | A simple reorder. | inc-214 | [prototype](screens/prototype/S17--one-animal-saved.png) · [main](screens/main/S17--one-animal-added.png) | `animal-identification-details.html:113-163`; `_identification-card.njk:19-21` |
| S18 | 'You have entered details for all…' not in prototype | `main` shows it once a species is full. | Adopt | The full table already shows the species is done. The over-count error stays. | inc-214 | [prototype](screens/prototype/S18--all-animals-saved.png) · [main](screens/main/S18--one-animal-added.png) | `animal-identification-details.html:108-111`; `features/commodities/copy/copy.en.js:106-107`; `card/view-model.js:35-43` |

## Arrival details

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S19 | Date hint is today's date; use a set date | The example is today's date (it was 19/10/2026 on the day). | Adopt | A fixed example, as every other date hint in the service already uses. | inc-208 | [prototype](screens/prototype/S19--default.png) · [main](screens/main/S19--empty.png) | `partials/arrival-date-picker.html:12-14`; `port-of-entry.controller.js:74`; `arrival-window.js:16-33` |
| S20 | Port of entry hint slightly different | 'Choose where…' on `main`. 'Select where…' is built on the arrival branch. | Already built | Nothing new to build. We bring it to `main` now. | inc-208 | [prototype](screens/prototype/S20--default.png) · [main](screens/main/S20--empty.png) | `arrival-details.html:52-58`; `transport/copy/copy.en.js:11`; branch `bb6fb2e0` |
| S21 | Port of entry search box slightly different | Small labels, no placeholder, matches in plain text. | Adopt, adapted | The labels, hint and 'Select a port' are built and come now. The button waits on design. Bold matches are for Sam. | inc-208 | [prototype](screens/prototype/S21--suggestions-open.png) · [main](screens/main/S21--suggestions-open.png) | `arrival-details.html:76-86`; `port-of-entry.njk:21-28`; branch `bb6fb2e0` |
| S22 | Means of transport: Air, Rail, Road, Sea | Airplane, Railway, Road Vehicle and Vessel on `main`. Built on the arrival branch. | Already built | Only the labels change. The stored codes do not. | inc-208 | [prototype](screens/prototype/S22--options-listed.png) · [main](screens/main/S22--empty.png) | `arrival-details.html:113-122`; `transport/copy/copy.en.js:15-24` |
| S23 | Transport identification hint is different | Old lead-in, and the lead-in and bullets are black, not hint grey. | Adopt, adapted | The wording is built. Nothing planned the grey, so we add it with GOV.UK hint styling. | inc-208 | [prototype](screens/prototype/S23--default.png) · [main](screens/main/S23--empty.png) | `arrival-details.html:124-136`; `port-of-entry.njk:40-47` |

## Which countries will the consignment travel through?

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S24 | Search box is visually different | Small label, no placeholder, a 'You have not added any countries yet.' line, Remove in the middle of the table. | Adopt, adapted | We match the label, placeholder, empty state and the position of Remove. 'Add country' stays (S25). Without JavaScript, the select's first option becomes 'Select a country'. | inc-209 | [prototype](screens/prototype/S24--default.png) · [main](screens/main/S24--empty.png) · [main, no JS](screens/main/S24--one-country-added--nojs.png) | `transit-countries.html:97-102`; `transit-countries.njk:28-57`; branch `49e22db9` |
| S25 | Search behaviour does not match | `main` adds a country when 'Add country' is pressed. The prototype adds on pick, and cannot add anything without JavaScript. | Discuss | Adding on pick needs custom JavaScript with no fallback and no arrow keys. Design question 4. | none | [prototype](screens/prototype/S25--two-countries-added.png) · [prototype, no JS](screens/prototype/S25--default--nojs.png) · [main](screens/main/S25--one-country-added.png) | `app/assets/javascripts/transit-country-search.js:204-335`; ruling claim 14 |

## Transporter details

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S26 | Search box is visually different | A separate grey 'Search' button below the box. | Adopt, adapted | A box with an icon search button is look and feel, and it still works without JavaScript. Filtering as you type stays blocked with transporter management. | inc-210 | [prototype](screens/prototype/S26--default.png) · [main](screens/main/S26--list.png) | `transporter.html:87-102`; `transporters/transporters.njk:51-65` |
| S27 | 'Add a transporter' in wrong location | Below the table. | Adopt, adapted | Moving an existing button is not transporter management, so it need not wait. Built with GOV.UK grid classes. | inc-211 | [prototype](screens/prototype/S27--default.png) · [main](screens/main/S27--list.png) | `transporter.html:73-106`; `transporters.njk:60-65,129-134` |

## Upload documents

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S28 | Date picker does not follow pattern | Black toggle and the example '12/12/2025'. | Adopt, adapted | We adopt the blue toggle and '27/3/2026'. Our calendar opens in the page, where the prototype's covers the drop zone, which looks like an accident in its styles. | inc-206, inc-215 | [prototype](screens/prototype/S28--calendar-open.png) · [main](screens/main/S28--calendar-open.png) | `upload-documents.html:137-157`; `application.scss:4788-4840`; `documents/copy/copy.en.js:46` |
| S29 | 'You have not added any documents yet.' not in prototype | Shown under 'Save and add another'. | Adopt | The empty fields already show nothing is added. | inc-215 | [prototype](screens/prototype/S29--no-documents.png) · [main](screens/main/S29--empty.png) | `upload-documents.html:195-243`; `documents/template.njk:155-156` |
| S30 | Green button is grey in prototype; ours is correct | Confirmed. | No action | One primary button per page: 'Save and continue'. | none | [prototype](screens/prototype/S31--two-documents-added.png) · [main](screens/main/S29--empty.png) | `documents/template.njk:127-132` |
| S31 | Table formatted differently after add another | The card is held to two-thirds width, headings wrap, and the table spills past the card's right edge. | Adopt, adapted | The card goes full width and the fields stay two-thirds inside it. 'View file' stays, because it is real. | inc-215 | [prototype](screens/prototype/S31--two-documents-added.png) · [main](screens/main/S31--one-uploaded-then-add-another.png) | `upload-documents.html:27-28,195-243`; `documents/view-model/render.js:38-44`; `documents/template.njk:73-159` |

## Consignment addresses and address pickers

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S32 | Page is a table; it should not be | A summary list showing the name only, with 'Not added yet'. | Adopt, adapted | The note that kept the summary list (c-087) misread Sam's precedence rule, because DR1 never judged the component. We take headed sections with full addresses, built from GOV.UK parts, keeping 'Edit details'. | inc-213 | [prototype, empty](screens/prototype/S32--empty.png) · [prototype, complete](screens/prototype/S32--complete.png) · [main](screens/main/S32--parties-added.png) | `roles-and-addresses.html:39-120`; `features/addresses/template.njk:13`; `distil/conflicts.json` c-087 |
| S33 | Search bar styling does not follow prototype | Small label, a separate Search button, a link to add, comma-joined addresses. | Adopt, adapted | Already planned (inc-086). The icon button uses tested MoJ Search styling, already installed. The newer prototype dropped the place of origin's country search, so inc-089 is dropped. | inc-210, inc-212 | [prototype](screens/prototype/S33--default.png) · [main](screens/main/S33--list.png) · [plants](screens/main/P-address-selection--list.png) | `consignment-address-select.html`; `party-picker/_address-picker.njk:76-127`; prototype commit `c3ca339` |
| S36 | Address styling wrong; accordion not in prototype | A 'View details' expander on each row, comma-joined addresses, two-thirds width. | Adopt | Line-by-line addresses and full width come now. The 'View' link replaces the expander once the address book can send the trader back (inc-066), in inc-090. | inc-212; inc-090 | [prototype](screens/prototype/S36--consignee.png) · [main](screens/main/S36--list.png) · [plants](screens/main/P-address-selection--list.png) | `consignment-address-select.html:27,119-166`; `_address-picker.njk:29-46`; `shared/layout.njk:78` |

## Review your notification

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S34 | Extra red lines where information is missing | A red bar in every blank value cell of an unfinished card. | Adopt, adapted | This is our own extra styling, and no ruling backs it. The card's red border and message stay, and so does the hidden 'Missing' for screen readers. | inc-216 | [prototype](screens/prototype/S34--missing-answers.png) · [main](screens/main/S34--missing-answers.png) | `check-answers/view-model/rows/value-text.js:42-47`; `src/client/stylesheets/components/_summary-list-missing.scss:8` |
| S35 | Error handling is broken | The error summary, card marking, links and refused Continue all behave as in the prototype. | No difference found | `main` changed on 13 and 19 October, so the test environment may have run an older build. We need the steps the designers took. | none | [prototype](screens/prototype/S35--after-refused-continue.png) · [main](screens/main/S35--refused-submit.png) · [main, link followed](screens/main/S35--after-first-error-link.png) | `check-answers/controller.js:54-178`; `view-model/incomplete-cards.js:14-85` |

## CPH number

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S37 | Cursor should move to the next box when full | `main` does not move the cursor. Typing all 9 digits straight through keeps only '12'. | Discuss | Moving focus while someone types is a change of context (WCAG 3.2.2), and Sam ruled it out (req-713). The problem is real. We propose one box (design question 7). | none | [prototype](screens/prototype/S37--all-typed-continuously.png) · [main](screens/main/S37--whole-number-typed.png) | `app/assets/javascripts/cph-number-input.js:50-100`; `features/cph-number/template.njk:50-99` |

## Submit screen

| ID | What they said | What we found | Verdict | Why | Row | Screens | Refs |
|---|---|---|---|---|---|---|---|
| S38 | Content is different | The confirmation page says 'view or amend' and has the health-certificate bullet. The declaration page has a Draft strip, a big checkbox and a plain date. | Adopt, adapted | Built on the overview branch and brought now. New-tab links get '(opens in a new tab)', which the prototype leaves out. We make the date bold. The extra 'Before the consignment' section on `main` is down to test data. | inc-217 | [prototype](screens/prototype/S38--submitted.png) · [main](screens/main/S38--submitted.png) · [prototype, declaration](screens/prototype/S38--declaration.png) · [main, declaration](screens/main/S38--declaration.png) | `notification-submitted.html:22-82`; `declaration.html:87`; branch `9fef3175`, `dc9c1e4f` |

## How each fix lands

| Row | What it changes | Snags | Brings from a branch |
|---|---|---|---|
| inc-202 | Type-ahead search boxes: same look and placeholder on every page in both frontends | S02, S04, S21 | `f69647ac`, `bb6fb2e0` (animals), `831e13a`, `b2f3bdc` (plants): component part only |
| inc-203 | Origin page, animals and plants | S01, S02, S03, S05 | origin-page inc-009, inc-010, inc-175 |
| inc-204 | Region code prefix follows the picked country | S04 | none (moves in inc-190) |
| inc-205 | 'What are you importing?' and Commodity details | S06, S07, S13, S14 | commodities-and-reason inc-011 |
| inc-206 | Date pickers in both frontends | S11, S28 | `bb6fb2e0` / `b2f3bdc`: label option only |
| inc-207 | Main import reason | S09, S10, S11, S12 | commodities-and-reason inc-020; hub task name from overview-and-review inc-098 |
| inc-208 | Arrival details, animals and plants | S19, S20, S21, S22, S23 | arrival-and-transit inc-026 |
| inc-209 | Transit countries | S24 | arrival-and-transit inc-029: empty state only |
| inc-210 | Server search box with icon button: pickers, transporters, commodity search, both frontends | S08 (look), S26, S33 | none (takes inc-086's search criteria) |
| inc-211 | Transporter details: 'Add a transporter' position | S27 | none (carves criterion 6 out of inc-037) |
| inc-212 | Party pickers layout, animals and plants | S33, S36 | none (moves in inc-086) |
| inc-213 | Consignment addresses as headed sections | S32 | none (moves in inc-085) |
| inc-214 | Identification details | S15, S16, S17, S18 | none (moves in inc-046, inc-047, inc-050) |
| inc-215 | Upload documents | S28, S29, S31 | none (moves in inc-032) |
| inc-216 | Review: no red bars in blank cells | S34 | none |
| inc-217 | Declaration and Notification submitted, animals and plants | S38 | overview-and-review inc-114, inc-115: wording and links only |

Each row is proved in the browser as well as in tests: once it lands, its snags' `main` screenshots are taken again and compared with the prototype ones in `screens/prototype/`. The prototype side comes from `prototype-specs/e2e/snagging.fit.spec.js`, which already photographs every snag.
