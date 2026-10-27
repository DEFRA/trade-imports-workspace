# Design Release 2.1 backlog: re-analysis against main

Checked on 27 October against `origin/main` of every repo, after the MDM commodity search (EUDPA-617) merged to the animals frontend.

The proposal is applied to the live `backlog.json`, which passes `tim backlog check` and `tim distil coverage`. Applying it also fixed six coverage problems that were already there: four address book error-message requirements recorded on the split-off address book pointer, one duplicate requirement removed (type question and templates builds it), and one transporter list requirement added to the blocked transporter list row. The "Save and return to hub" requirement stays on its row, with a note that the "overview" wording supersedes it.

## Summary

- **Nothing is dropped as already met.** The re-analysis said the empty species card is already refused on its own save. The verifier refuted that, so the row stays to build, starting with tests.
- **13 rows are rewritten.** Most are narrower because part of them is now on main.
- **6 rows are new:**
  - 5 test and code tidy-ups left over from design snagging
  - the orphaned "Notification copied" banner (EUDPA-742)
- **The transporter register removal now carries EUDPA-739.** Its block still holds.
- **MDM landing has partly or wholly removed the reason for 3 blocks.** They are listed below for your call. No status was changed.
- **No theme is ready to split.** Every theme waits on another theme that is built only on its branch.

## What changes scope

| Change | What is lost or gained |
|---|---|
| The germinal commodity page reads MDM's germinal list through reference-data | Lost: the 12 hard-coded germinal lines. They were deleted with the hard-coded catalogue. |
| The germinal search needs new reference-data code | No remaining theme can own that code: the split-off reference-lists theme owns all of reference-data. Recorded as an open question on the row. |
| The contact page's "Save and return to hub" wording is dropped | Lost: that wording requirement. Main already says "overview", as journey foundation decided. |
| The permanent address page now covers ferrets | Gained: ferrets are in the MDM catalogue. Fish is no longer a live animal, so the criteria name another 01061900 species. |
| New test-hygiene theme | Gained: 3 rows that no remaining theme owned. It lands after the split-off themes whose specs it edits. |

## Counts by theme

| Theme | To do before | To do after | Blocked |
|---|---|---|---|
| Animals dashboard | 11 | 12 | 3 |
| Consignment parties | 10 | 11 | 0 |
| Germinal products | 19 | 19 | 1 |
| Identification and permanent address | 7 | 8 | 1 |
| INS dashboard | 0 | 0 | 8 |
| Manage notifications | 6 | 6 | 0 |
| Test hygiene (new) | – | 3 | 0 |
| Transporters | 0 | 0 | 11 |
| Waiting on design | 0 | 0 | 10 |

Progress in this parent backlog is 0 of 59 (0%). Built work sits in the split-off themes, and blocked rows are left out of the percentage.

## Parts of rows cut because main already does them

No whole row was dropped. These parts are already on main:

| Row | Part cut | Where on main |
|---|---|---|
| Deletion message and deleting during amend | The API description listing AMEND | Animals backend's delete endpoint |
| Germinal commodity page | Live search offering no germinal codes (kept as one regression check) | Reference-data drops MDM's germinal codes |
| Permanent address amend ending | Contact page "hub" wording | Shared save controls already say "overview" |
| Picker "View" link | INS address book honouring a return to the picker | INS frontend's address book view, edit and delete pages |
| Roles and addresses task | The CPH half of the task's completion | Overview task rows count the CPH page |
| Identification details' Back link | Overview and review entry points (now a regression guard) | Journey foundation's Back link and save return |

## Rows rewritten

| Row | What changed |
|---|---|
| Identification details' Back link | Only the opening-run Back link and the template-review return are left to build |
| Permanent address page | Covers cats, dogs and ferrets from MDM, and fish is replaced |
| Permanent address leaves the identification page | "Cat and dog panels" become cards for cats, dogs and ferrets |
| Role-filtered party pickers | Criteria kept. Notes put the role list in the address book's address package, and say the typed record never reached main, so this row can't build yet |
| Picker "View" link | INS half removed, plants joins for address lines, and the dependency on the address book's view row is dropped |
| Contact address page | The plants change is its description only, and it no longer waits on the permanent address page |
| Permanent address section on roles and addresses | Task completion narrowed to that section |
| Permanent address amend ending | Contact page wording dropped. It waits only on the permanent address page |
| Germinal commodity page | Reads MDM's germinal list. The live animals criteria are cut to a regression check |
| Germinal Commodity details | Each line stores its product type, the typeCode comes from it, and the layout follows the live page as it is now |
| Deletion message and deleting during amend | API description criterion dropped |
| Live animals list reframe | The k6 run's direct read of the backend list must send the organisation |
| CPH boxes with JavaScript (blocked) | The first criterion can no longer be read as bringing back a character limit |

The commodity search as you type is blocked. One of its criteria now says the results come from the MDM search through reference-data.

The other rows the re-analysis found still needed have new notes only.

## New rows

| Row | Theme | From |
|---|---|---|
| Live animals browser tests prove how pages look by screenshot, accessible name and GOV.UK values | Test hygiene | Design snagging follow-ups |
| Links that return the trader to their page follow one rule in live animals | Test hygiene | Design snagging follow-ups |
| Plants tests and guides say what is true | Test hygiene | Design snagging follow-ups |
| Party and CPH browser tests share the journey's save step | Consignment parties | Design snagging follow-ups |
| Identification browser tests, and "Change number of animals" comes back to Identification details | Identification and permanent address | Design snagging follow-ups, including the one the verifier refuted as already done |
| The list shows a success banner only after a delete | Animals dashboard | EUDPA-742 |

## Blocked rows whose reason looks gone (for your call)

| Row | Block | What has moved |
|---|---|---|
| Ear tags for pigs, sheep and goats | Waits for them to reach the catalogue from MDM | MDM search is on main and serves all three. The ear tag work itself is unbuilt, and the row it depends on in commodities-and-reason is still blocked for the same reason. |
| Germinal catalogue from MDM | Waits on MDM, then a re-distil of the germinal list | The MDM half is gone: reference-data already tells germinal codes apart. The re-distil half still applies. |
| Commodity search as you type | Waits on design question 3, MDM and the type-ahead (EUDPA-616) | The live animals MDM half is gone. Design question 3 is still open, and the EUDPA-616 branch was built before the MDM search merged, so it needs rebasing. |

The transporter register removal now carries EUDPA-739. That is new evidence, but transporter requirements are still undecided, so the block holds.

Every other block still holds:

| Theme | Blocked rows | Why |
|---|---|---|
| Transporters | 11 | No ruling since 9 October settles whether the service manages transporters |
| INS dashboard | 8 | Requirements still not firm. There is no outcome or inspection feed, and plants doesn't publish to INS |
| Waiting on design | 10 | Design questions 3, 4, 5 and 7 to 13 are open |
| Animals dashboard | 3 | INS dashboard requirements, outcomes from the authorities, and the plants backend's list query |

## Themes ready to split

None.

| Theme | Why not |
|---|---|
| Identification and permanent address | Waits on commodities-and-reason and type-question-and-templates. Both are unmerged and both edit its run flow and addresses |
| Consignment parties | The address book's list branch is open, the typed record never reached main, and overview-and-review edits its review card |
| Manage notifications | All three of its dependencies are built only on the overview-and-review branch |
| Animals dashboard | Waits on manage notifications, overview-and-review and type-question-and-templates |
| Germinal products | 20 dependencies are to do in themes not yet split off or merged |
| Test hygiene | Lands after 7 split-off themes, most of them unmerged |
| Transporters, INS dashboard, waiting on design | Every row is blocked |

## Calls I made

- **The test-hygiene theme claims only files no other theme owns.** Most of the specs it edits sit in split-off themes' folders, and the backlog check refuses overlap with those. So the theme waits for those themes instead.
- **Transporter specs stay in the browser-test tidy row,** so they don't wait on the blocked transporters theme. I left the transporters theme's code area as it is.
- **The germinal search builds in the frontend and tests repos only.** The check refused reference-data because reference-lists owns it, so I recorded an open question on the row.
- **I left one wrong code area on the role-filtered pickers.** It names an address-book folder with no list code in it. The right folder belongs to the split-off address-book theme, so the next re-distil should fix it. The row's note says where the code goes.
- **"Change number of animals" gets a return marker,** like the other links that return the trader, and the page design guide changes to match. The alternative was to correct the guide only.
- **The germinal catalogue reads MDM.** You may prefer a germinal-set stub of the old 12 lines instead.
- **The Copy buttons row (blocked) now also waits on overview-and-review's view header row,** so the waiting-on-design theme depends on overview-and-review.
- **The brief pointed three themes' analysis at the parent backlog** (animals dashboard, INS dashboard and manage notifications). I read their real files from `reanalysis/themes/` and applied those verdicts. I left alone the two manage-notifications rows the verifier refuted or that had no change.
