# Design snagging: coherence pass

Checked on 19 October 2026, after the design-snagging theme (16 rows, inc-202 to inc-217) was added.

The question: once design-snagging lands, will any later row, or any unmerged theme branch, write a different version of the same copy or look?

## Summary

- **No later row now overwrites a snagging version.** Every row that builds on a snagging page waits for it and says which version to keep.
- **No more rows needed moving in.** The 7 rows the apply step moved, and its 3 amendments, are complete: every row that depended on them now waits on design-snagging.
- **3 later rows said something different, and now say the snagging version.** 2 snagging rows had their own slips, now fixed.
- **1 conflict for Sam:** the designers' 'Cattle' against his ruling that keeps 'Cow' until MDM. The ruling wins for now.
- **The unmerged theme branches had gaps in their merge notes.** 14 built rows now say what to keep at their merge. One plants change was about to be built twice; now it is ported once.
- **Plants:** no later plants row undoes a snagging change.
- **Checks:** `tim backlog check` is clean on the parent backlog and on all 6 theme backlogs edited.

| What | Rows |
|---|---|
| Same intent, moved into design-snagging (this pass) | 0 |
| Builds on snagging: dependency and 'keep the snagging version' note added | 34 |
| Builds on snagging: note only (dependency already there, or not wanted) | 3 |
| Said something different: amended to the snagging version | 3 later rows, 2 snagging rows |
| Waits on a 'discuss' snag: checked, still blocked or consistent (2 also counted above) | 4 |
| Built theme rows given a merge note | 14, plus 2 snagging-row notes |
| No real overlap | 77 |

## Conflicts for Sam

| Row | Theme | What clashes | What I did |
|---|---|---|---|
| Identification details: Species column, sections, cards (inc-214) | design-snagging | Its criterion asked for 'Cattle' in the summary and the heading 'Cattle (0102)', as the prototype draws it. The catalogue says 'Cow', and your 9 October afternoon ruling holds the rename until commodities come from MDM (the live catalogue row, inc-012). discussion.md says 'Ours still shows Cow' too. | Your ruling wins. The criterion now reads the catalogue's name: 'Cow (0102)' today, 'Cattle (0102)' once the catalogue row lands, with no further change. If you want 'Cattle' now, it is a one-line rename that the catalogue row's other changes do not need. |

## Moved into design-snagging

None in this pass. I looked for any row whose whole job a snagging row already does. Two rows overlap in one criterion each, so I kept them and made those criteria guards (see the next table):

- The CPH number display on consignment addresses (inc-092): its 'Add a CPH number' link criterion is already built by the consignment addresses row (inc-213).
- The contact address page (inc-094): its plants 'Select an address' heading is already built by the party picker row (inc-212).

The apply step's moves all check out:

| Moved row | Into | Rows that waited on it | Now wait on |
|---|---|---|---|
| Upload documents wording (inc-032) | inc-215 | 50MB files (inc-036), germinal documents (inc-179) | inc-215 |
| Identification grouping (inc-046) | inc-214 | ear tags for pigs, sheep, goats (inc-051), germinal identification (inc-052) | inc-214 |
| Per-species save (inc-047) | inc-214 | empty panel refused (inc-048), permanent address page (inc-054), inc-052 | inc-214 |
| Identifier labels and hints (inc-050) | inc-214 | inc-052, germinal dates (inc-053) | inc-214 |
| Consignment addresses copy (inc-085) | inc-213 | Same as shortcuts (inc-088) | inc-213 |
| Party picker layout (inc-086) | inc-212, inc-210 | picker 'View' link (inc-090) | inc-212 |
| Region code prefix (inc-190) | inc-204 | none | |

## Builds on a snagging row

Each row below now has an `externalDependsOn` on the snagging row named, and a note saying which snagging version to keep. The germinal commodity page (inc-016) is also in the amended table.

| Row | Theme | Headline | What overlaps | Waits on |
|---|---|---|---|---|
| inc-030 | waiting-on-design | Transit countries added in place | Transit countries label, placeholder, no empty line, Remove at the right | inc-209 |
| inc-189 | waiting-on-design | Country results screen-reader wording | The shared type-ahead component (was waiting on the origin-page branch) | inc-202 |
| inc-192 | waiting-on-design | Germinal dates calendar | House date picker look, if design keeps the calendar | inc-206 |
| inc-193 | waiting-on-design | Party pickers filter as you type | Picker layout and results count it updates (lost its link when inc-086 moved) | inc-210, inc-212 |
| inc-037 | transporters | Transporter list matches DR2.1 | Icon search button; 'Add a transporter' above the table | inc-210, inc-211 |
| inc-042 | transporters | Northern Ireland address search | Use the same search control | inc-210 |
| inc-033 | documents | Document references and type list | Upload documents page rewritten | inc-215 |
| inc-034 | documents | Upload documents returns the trader | Same page | inc-215 |
| inc-035 | documents | Save no longer waits for scans | Same page | inc-215 |
| inc-045 | identification | Identification details in the journey | Builds on the new page | inc-214 |
| inc-054 | identification | Permanent address page | New 'Permanent address' section follows the headed-section pattern | inc-213 |
| inc-056 | identification | Permanent addresses summarised | Summary sits in the section's inset | inc-213 |
| inc-057 | identification | Address leaves the identification page | Edits the new species cards | inc-214 |
| inc-087 | consignment-parties | Role-filtered pickers on one page | Picker layout and search control; gate no longer names the dropped country search | inc-210, inc-212 |
| inc-092 | consignment-parties | CPH number shown as 12/345/6789 | CPH section heading and link already built; number goes in the inset | inc-213 |
| inc-094 | consignment-parties | Contact address page | Plants contact layout and heading now come from inc-212; stale 'inc-086' note fixed | inc-212 |
| inc-096 | consignment-parties | Which sections the page shows | 'Permanent address' section pattern | inc-213 |
| inc-097 | consignment-parties | Amend endings | Picker layout and blank save | inc-212 |
| inc-136 | animals-dashboard | List search and sort | Icon search button: same control and colour | inc-210 |
| inc-137 | animals-dashboard | Additional filters | Date pickers take the house style | inc-206 |
| inc-147 | animals-dashboard | Identifier outstanding items | Adds a bullet to the Notification submitted wording | inc-217 |
| inc-200 | animals-dashboard | Plants list tabs, search, filters | Plants search button and date pickers | inc-206, inc-210 |
| inc-063 | address-book | Address book list | Icon search button: same control and colour, INS frontend | inc-210 |
| inc-072 | address-book | Real UK address search | Same | inc-210 |
| inc-016 | germinal-products | Germinal commodity page | Copies 'What are you importing?' | inc-205, inc-210 |
| inc-017 | germinal-products | Germinal Commodity details | Species column and spacing | inc-205 |
| inc-024 | germinal-products | Germinal main import reason | Heading and child field look | inc-207 |
| inc-105 | germinal-products | Germinal review | No red bar in blank rows | inc-216 |
| inc-176 | germinal-products | Germinal set and origin page | Type-ahead and live region code prefix (prefix was in a note only) | inc-202, inc-204 |
| inc-178 | germinal-products | Germinal transporter list | Icon search button, 'Add a transporter' position | inc-210, inc-211 |
| inc-182 | germinal-products | Rest of the germinal journey | Arrival, transit, declaration pages it copies | inc-206, inc-208, inc-209, inc-217 |
| inc-012 | commodities-and-reason | Live catalogue from MDM | Identification summary reads the catalogue name | inc-214 |
| inc-013 | commodities-and-reason | Results sorted and chips | Icon search button, short-search message | inc-205, inc-210 |
| inc-117 | overview-and-review | Tests for review, declaration, confirmation | Assert the snagging versions | inc-216, inc-217 |

Note only:

| Row | Theme | Headline | Note added |
|---|---|---|---|
| inc-088 | consignment-parties | Same as shortcuts | Build into the headed sections; 'row' means the party's section |
| inc-188 | waiting-on-design | Search button beside type-aheads | If built, it replaces inc-202's in-box icon, so one icon per box |
| inc-053 | germinal-products | Germinal dates and donor | Use plain text inputs, not kit.dateField, which inc-206 gives a calendar |

## Said something different: amended

The 3 later rows also now wait on the snagging rows they copy (inc-014 on inc-205 and inc-210; inc-016 on inc-205 and inc-210; inc-181 on inc-210, inc-212 and inc-213).

| Row | Theme | Headline | What it said | Now says |
|---|---|---|---|---|
| inc-014 | waiting-on-design | Commodity results as you type | No JavaScript: 'lists nothing' for a short search | Lists no results and shows inc-205's 'Enter at least 3 characters to search' |
| inc-016 | germinal-products | Germinal commodity page | 'today's Search button' | The Search button, which inc-210 makes an icon button (still a submit, so the ruling it cites holds) |
| inc-181 | germinal-products | Germinal addresses and pickers | Pickers have a 'place of origin country search' | Same search, icon button and layout as the live pickers: that search was dropped with inc-089 |
| inc-213 | design-snagging | Consignment addresses as headed sections | CPH section heading 'CPH number' | 'County parish holding (CPH) number', as the prototype, main and inc-092 have it |
| inc-214 | design-snagging | Identification details | 'Cattle' | The catalogue's name (see Conflicts for Sam) |

## Rows that wait on a 'discuss' snag

| Row | Snag | State | Consistent with what builds now? |
|---|---|---|---|
| Commodity results as you type (inc-014) | S08, design question 3 | Blocked | Yes: sits behind inc-210's button, keeps inc-205's message |
| Transit countries added in place (inc-030) | S25, design question 4 | Blocked | Yes: keeps inc-209's label, placeholder and Remove; 'Add country' stays until design answers |
| CPH boxes keep out non-digits (inc-093) | S37, design question 7 | Blocked | Yes: no snagging row touches the CPH page |
| CPH number page (inc-091) | S37 | To do, by your ruling | Yes: note added that a 'one box' answer moves its box criteria |

## Unmerged theme branches: merge notes

The apply step noted each ported row. These built rows touch the same files in other ways, so a merge could have put the old version back. Each now says what to keep.

| Row | Theme | What its commit also touches | Keep at merge |
|---|---|---|---|
| inc-010 | origin-page | Origin template and copy | Main's bold region code label and full-width internal reference box (inc-203) |
| inc-015 | commodities-and-reason | Commodity search controller, kit.js | Main's short-search message, kit.dateField, icon button |
| inc-018 | commodities-and-reason | Commodities and transport copy | Main's strings; add only its two errors |
| inc-021 | commodities-and-reason | Import reason controller, kit.js | Main's child field look and kit.dateField |
| inc-022 | commodities-and-reason | Import reason controller, kit.js | Same |
| inc-027 | arrival-and-transit | accessible-autocomplete.js, both frontends (a comment) | Main's component (inc-202) |
| inc-028 | arrival-and-transit | Transport copy | Main's Air, Rail, Road, Sea and hints |
| inc-029 | arrival-and-transit | Transit countries template and copy | Main's label, placeholder split and Remove position, not only the empty state |
| inc-174 | arrival-and-transit | Transit countries controller | Main's 'Select a country' first option |
| inc-098 | overview-and-review | Whole branch: carries the other three themes' ported commits | Apply their notes too |
| inc-114 | overview-and-review | Plants declaration (plants 4072036) | Now ported by inc-217; drop at merge |
| inc-154 | type-question-and-templates | Origin template, kit.js | Main's origin page and kit.dateField |
| inc-155 | type-question-and-templates | Commodity search controller, hub copy | Main's strings, including 'Main import reason' |
| inc-159 | type-question-and-templates | One-line saveActions edits in 9 pages snagging rewrites | Main's pages; re-apply the saveActions argument only |

Snagging rows:

- **Declaration and Notification submitted (inc-217):** its port missed plants 4072036, the plants small checkbox already built on the overview-and-review branch. It now cherry-picks it. Without this, plants would have got two versions.
- **Party picker layout (inc-212):** now says it adds the plants contact page's 'Select an address' heading, which the contact page row then keeps.

## Plants

| Snagging change | Later plants rows checked | Result |
|---|---|---|
| Magnifier on type-aheads (inc-202) | Search button (inc-188), results wording (inc-189) | Both wait on inc-202 |
| Date pickers (inc-206) | Plants list filters (inc-200) | Waits on inc-206 |
| Arrival wording (inc-208) | None changes plants arrival details | No clash |
| Server search and picker layout (inc-210, inc-212) | One-page pickers (inc-087), contact page (inc-094), amend endings (inc-097), live filter (inc-193), 'View details' kept (inc-090) | All keep the snagging layout |
| 'Consignor' (inc-213) | Plants card facts (inc-130) say 'Consignor' | No clash |
| Declaration (inc-217) | overview-and-review's plants commit | Ported once, see above |

## No real overlap

77 rows. They change pages or services no snagging row touches.

| Theme | What they cover | Rows |
|---|---|---|
| address-book | INS address book pages and API (apart from the two search rows above) | inc-059 to inc-062, inc-064 to inc-071, inc-073, inc-077 to inc-084 |
| transporters | Country list, type page, add forms, save, register page, address book hand-over, transporter tab | inc-008, inc-038 to inc-041, inc-043, inc-044, inc-074 to inc-076 |
| documents | Entry guard | inc-031 |
| identification | Address checks, end-to-end proof | inc-055, inc-058 |
| consignment-parties | Branch-only contact list, germinal address book return | inc-095, inc-180 |
| manage-notifications | Amend, cancel, copy, delete pages | inc-120, inc-121, inc-123 to inc-125, inc-201 |
| animals-dashboard | Lists, cards, tabs, paging, banners, template button | inc-126, inc-129 to inc-131, inc-135, inc-138 to inc-140, inc-142, inc-196 |
| ins-dashboard | INS home and drill-downs | inc-128, inc-132 to inc-134, inc-143 to inc-146 |
| germinal-products | Overview, list, cards, validation, flow, proof, amend, templates, MDM catalogue | inc-099, inc-141, inc-172, inc-177, inc-183 to inc-186, inc-191 |
| waiting-on-design | Address search layout, pop-ups, copy buttons | inc-194, inc-195, inc-198 |
| commodities-and-reason | Poultry proof, unweaned question | inc-019, inc-023 |
| overview-and-review | Addresses card, completed status, plants customs code | inc-108, inc-116, inc-199 |

Already coherent from the apply step, no change: inc-036, inc-048, inc-051, inc-052, inc-090, inc-179.

## Calls I made

- **'Cattle' follows the catalogue** (inc-214), because your ruling holds the rename. Listed above for you.
- **Partial overlaps stayed put.** The CPH display row (inc-092) and the contact page row (inc-094) each repeat one snagging criterion. I made those criteria guards rather than splitting requirements across themes.
- **INS address book search follows inc-210's colour** (inc-063, inc-072). It is another service, but the same prototype draws it. I added the dependency so it picks up whatever colour the designers settle on.
- **The germinal date hint stays '27/03/2026'** (inc-053). The prototype at 56371e2 draws that for germinal dates, unlike '27/3/2026' elsewhere. Worth a word with the content designer.
- **Merge notes went on the built rows, not themes.json**, which has no notes field.
- **snagging/theme-rows.json was not updated.** The theme backlog is the source of truth. theme-rows.json still has the earlier wording of inc-213 and inc-214.
- **No re-split needed.** No requirement moved between rows, so the parent's split-off pointers are unchanged.
