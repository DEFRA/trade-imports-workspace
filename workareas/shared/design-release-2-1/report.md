# Design Release 2.1: backlog report

## Summary

- The re-distil against the 26 November prototype and Sam's 27 November ruling turned 34 rows into 29 rows ready to build. 13 more are blocked, 4 deferred, 10 dropped and 9 merged into others.
- The 29 rows to build cover 3 themes on this branch: the live animals list reframe (animals-dashboard), the germinal products set (germinal-products) and the plants rulings records (recorded-decisions-plants).
- The INS overall dashboard (ins-dashboard, 8 rows) still waits on its requirements. Nothing action-required is built until the outstanding-actions banner is designed.
- 46 questions are open for Sam. The 27 November ruling settled 16 earlier questions, and 65 new conflicts were settled by precedence.
- The split branches have work to pick up: type-question-and-templates, journey-foundation, commodities-and-reason, arrival-and-transit, origin-page, overview-and-review, documents, address-book, transporters, identification-and-permanent-address, consignment-parties and manage-notifications. reference-lists and design-snagging have changed and dropped items only; test-hygiene has nothing.

## Before you build: step 0

1. **Correct the goal in sources.json.** Its wording predates the November rulings. The goal as the rulings leave it:
   - Templates are parked and not built (4 November, interaction designer 9 November, Sam 9 November). The INS home builds "Create new" and the type question only, with no "Use template" button and no Templates navigation item (c-416, c-437). Template-mode requirements stay adopted but blocked until Sam picks templates up again; that area is re-distilled then.
   - Transporter management is decided (Ian, 6 November). The address book manages each organisation's transporters: add, list, search, the type question, the add pages, the private country list and the Transporter tab all go ahead. Only approved transporters and the commercial address search still wait.
   - The germinal list, its cards and its delete message copy today's live animals list on main now (27 November). They take the reframed list only if Sam says so (c-496). Germinal amend, cancel amendment, copy and delete build on the manage-notifications theme.
   - The germinal total gross weight is asked and stored per species line. This is an owner exception to V4's notification-level placement (27 November, with Sam 9 October).
   - Plants gains Copy as new on its view header (Ian, 25 November b).
   - There is no "Submitted action required" status, and nothing action-required is shown until the banner is designed (Sam, 16 and 19 November). The INS dashboard bullet must not imply action-required cards.
   - Still in force: address search parked, reference-list content owned by MDM, the commodity search handed to its own ticket, no as-you-type filtering, roles rather than address type, pagination of 8 everywhere, and the 17 November wording.
2. **Merge the split branches first.** 15 of the 29 rows to build depend on work in a split theme: inc-017, inc-024, inc-052, inc-053, inc-105, inc-126, inc-136, inc-176, inc-177, inc-179, inc-181, inc-182, inc-283, inc-185 and inc-264.
3. **Pick up the split-branch changes** listed in "For the split branches" before those themes merge.

## Decisions the pipeline made

### Repos

| Key | Repo |
|---|---|
| frontend | trade-imports-animals-frontend |
| backend | trade-imports-animals-backend |
| insfrontend | trade-imports-ins-frontend |
| insbackend | trade-imports-ins-backend |
| addressbook | trade-imports-address-book |
| referencedata | trade-imports-reference-data |
| stub | trade-imports-stub |
| tests | trade-imports-ins-tests |
| perftests | trade-imports-performance-tests |
| plantsfrontend | trade-imports-plants-frontend |

### Precedence, highest first

1. Sam, 27 November: the owner's decisions, outranking every other source
2. Ian, 25 November b
3. Ian, 25 November
4. Ian, 23 November
5. Sam, 19 November
6. Sam, 17 November
7. Sam, 16 November
8. Ian, 16 November
9. Design, 13 November
10. Ian, 11 November
11. Sam, 10 November b
12. Sam, 10 November
13. Sam, 9 November
14. Interaction designer, 9 November
15. Ian, 6 November
16. Paul, 5 November
17. Sam, 4 November
18. Sam, 26 October
19. Paul, 14 October
20. Sam, 9 October afternoon
21. Sam, 9 October templates
22. Sam, 9 October
23. Sam, 7 October
24. Live Animals and Germinals Data Fields (V4), Confluence 6497338582, version 210
25. DR1 parity notes
26. DR1 parity backlog
27. Design Release 2.1 prototype source, commit c2078fb (26 November)
28. Design Release 2.1 prototype traces
29. Design Release 2.1 prototype specs
30. to 39. The repos: backend, insbackend, addressbook, referencedata, stub, frontend, insfrontend, plantsfrontend, tests, perftests
40. Animals fit traces
41. INS fit traces
42. End-to-end traces

## Questions for Sam

Each question has a default the build uses until Sam answers.

### Plants list heading (c-303)
- **Default:** the h1 reads "Plants".
- **Affects:** req-2029, inc-129.
- **Why it is open:** the frame names the category in the h1, but nothing names plants' category.

### Does a template hold every answer? (c-318)
- **Default:** the template mode differences stay as the templates rows have them.
- **Affects:** req-2112. Templates are parked, so nothing is built now.
- **Why it is open:** the templates ruling hedges, and the prototype contradicts itself on transit countries.

### Region code: a list or typed? (c-322)
- **Default:** typed, as today.
- **Affects:** req-2127.
- **Why it is open:** V4's source cell reads two ways.

### Number of packages: maximum 10 digits or value 10? (c-325)
- **Default:** a digit count, which the service already meets.
- **Affects:** req-2133.
- **Why it is open:** V4's table reads both ways.

### Maximum number of species (c-326)
- **Default:** no cap.
- **Affects:** req-2134.
- **Why it is open:** V4 says a maximum exists but not what it is.

### Exit date format (c-330)
- **Default:** accept the form the MOJ date picker writes, without leading zeros.
- **Affects:** req-2139.
- **Why it is open:** "DD/MM/YYYY" reads as a digit count or a field order, and a strict rule refuses the picker's own text.

### Microchip field (c-335)
- **Default:** keep it on cat, dog, ferret, horse and donkey panels, after the passport.
- **Affects:** req-2153, req-222.
- **Why it is open:** V4 never lists it, but never de-scopes it either.

### When is a line identified? (c-336)
- **Default:** every animal on a line needs a record with one identifier, as the frontend now does.
- **Affects:** req-248, req-249.
- **Why it is open:** the 9 October ruling accepted an older gate.

### Panel save buttons and typed values (c-337)
- **Default:** each save button saves only its own panel.
- **Affects:** req-203, req-204.
- **Why it is open:** the 26 October same-checks rule could reach the whole page.

### Enter key on identification (c-338)
- **Default:** Enter outside a multi-animal panel submits the page as "Save and continue".
- **Affects:** req-2159.
- **Why it is open:** the ruling settles only the multi-animal panel.

### Journey Log document type (c-350)
- **Default:** keep the option.
- **Affects:** req-499.
- **Why it is open:** V4 de-scopes it in its change log but still lists it.

### Plants check answers: same checks? (c-365)
- **Default:** plants' check answers keeps "Save and return to overview".
- **Affects:** req-2010.
- **Why it is open:** the review page collects no answers, so the 26 October rule reads two ways.

### Address delete banner casing (c-367)
- **Default:** the name as the trader typed it.
- **Affects:** req-2194.
- **Why it is open:** lower-casing mangles names such as "Alpine Dairy GmbH".

### Address book filter: open or closed? (c-368)
- **Default:** open when a filter is applied, closed otherwise.
- **Affects:** req-2195.
- **Why it is open:** "collapsed when the list loads" reads two ways.

### Postcode for countries without postcodes (c-369)
- **Default:** mandatory for every country, at most 12 characters.
- **Affects:** req-2200.
- **Why it is open:** every source marks it mandatory and the germinal data fields flag the gap.

### How far the commodity-search ticket reaches (c-379)
- **Default:** the narrow reading: wording, order and labels stay in this programme.
- **Affects:** req-075, req-080, req-081, req-2225, req-2585.
- **Why it is open:** the 10 November ruling names no ticket and no boundary.

### Destination and exit country controls (c-381)
- **Default:** keep the accessible autocomplete the follow-on ticket built.
- **Affects:** req-2237.
- **Why it is open:** the 9 October plain-select clause reads two ways.

### Commercial transporter country: XI or GB-NIR? (c-388)
- **Default:** as the 6 November ruling is read as a value: XI.
- **Affects:** req-2275.
- **Why it is open:** the ruling may decide a value, or only that the code is forced rather than looked up.

### What the commercial transporter page shows in journey mode (c-390)
- **Default:** the status strip and set-specific banner follow the notification across the hand-off.
- **Affects:** req-2278, req-2640.
- **Why it is open:** nothing shows what crosses services with the hand-off.

### Plants Overview wording (c-403)
- **Default:** wording only; plants keeps its three party pages.
- **Affects:** req-2322.
- **Why it is open:** plants has no consignment addresses page to title.

### Plants check answers addresses (c-414)
- **Default:** plants keeps its section heading and its own party cards.
- **Affects:** req-2337.
- **Why it is open:** plants' review has no single addresses card.

### Atypical items in the engineering review (c-415)
- **Default:** only the named items are the work.
- **Affects:** req-2338.
- **Why it is open:** the review the ruling answers is not one of this programme's sources.

### "Action required" status filter (c-419)
- **Default:** the filter keeps no "Action required" option.
- **Affects:** req-2346.
- **Why it is open:** the 16 November ruling does not name the filter.

### Roles for addresses in other environments (c-433)
- **Default:** as the conflict's default: dev, test and local get roles; other environments follow.
- **Affects:** req-2359.
- **Why it is open:** the ruling names only dev, test and the local stack.

### Plants' recorded exceptions (c-446)
- **Default:** the narrow reading: each recorded exception keeps its reason.
- **Affects:** req-2480.
- **Why it is open:** the ruling's sweep lists nothing.

### Which plants pages are signed off? (c-450)
- **Default:** none treated as signed off.
- **Affects:** req-2490.
- **Why it is open:** plants records no maturity level a reader can find.

### Review context: trail or ?change=1? (c-451)
- **Default:** keep the trail both frontends have merged.
- **Affects:** req-2521.
- **Why it is open:** the 9 October ruling kept ?change=1; the merged work uses a trail.

### Proof of other cross-service links (c-453)
- **Default:** the INS hand-over follows the 27 November ruling (configuration per service, proved in the two Docker stacks). Other links take the same proof.
- **Affects:** the Address book item and the hand-off back to a journey.
- **Why it is open:** the ruling reaches only the INS hand-over.

### Plants proof (c-454)
- **Default:** carry the change, not new plants accessibility or security suites.
- **Affects:** req-2557.
- **Why it is open:** "same increment" reads as carrying the change or carrying the proof.

### Plants strip names the type (c-455)
- **Default:** plants' strip unchanged.
- **Affects:** req-2568.
- **Why it is open:** plants learns its type on its own page, not from the type question.

### Germinal gross weight placement (c-461)
- **Default:** per species on Commodity details, with no separate page.
- **Affects:** req-2601.
- **Why it is open:** the 27 November ruling sets the granularity, not the page.

### Reveal styling (c-464)
- **Default:** the GOV.UK standard component.
- **Affects:** req-2610.
- **Why it is open:** the toolbox ruling does not say whether custom CSS stays inside it.

### Saved-animals columns (c-467)
- **Default:** show every column.
- **Affects:** req-2620.
- **Why it is open:** hiding columns changes how entered data is shown, for no visible reason.

### Transporter banner casing (c-471)
- **Default:** the name as entered.
- **Affects:** req-2639.
- **Why it is open:** re-casing mangles "Ltd" and proper nouns.

### Postcode lookup layout (c-483)
- **Default:** as the add-address page's layout. The area is blocked, so this costs nothing now.
- **Affects:** req-2737.
- **Why it is open:** the design draws it two ways.

### Is a contact address asked? (c-484)
- **Default:** the contact rows wait as questions; the plants contact page is unaffected.
- **Affects:** req-752 to req-775, req-2187, req-2312, req-2313.
- **Why it is open:** V4 still lists it; the 26 November design and main have removed it.

### Save and continue from an overview-opened page (c-487)
- **Default:** keep the repos' rule: go on to the next page.
- **Affects:** req-808, req-1934.
- **Why it is open:** the 9 October ruling and the design return to the overview; the merged save and continue work goes on.

### Additional details card (c-491)
- **Default:** the card stays.
- **Affects:** req-849, req-850, req-851.
- **Why it is open:** the prototype builds the card but does not render it.

### Does the germinal list take the reframe? (c-496)
- **Default:** yes, through inc-172.
- **Affects:** req-1092, req-1737, req-1738, inc-172.
- **Why it is open:** the 27 November ruling ships the copy "for now" without saying for how long.

### Tab words (c-497)
- **Default:** the 26 November prototype: "Submitted", "Draft and Amend", "Past".
- **Affects:** req-1057 to req-1062, req-1099, req-2769 to req-2771, inc-135, inc-137.
- **Why it is open:** the 9 October ruling named the tabs as they were then.

### Past tab: by status or by date? (c-498)
- **Default:** by status.
- **Affects:** req-2771.
- **Why it is open:** by status, the tab stays empty until a real source of completion exists.

### Branch tab (c-499)
- **Default:** as the conflict's default.
- **Affects:** req-2779.
- **Why it is open:** the design draws one, but the consignment contact was removed on main.

### Edit banner casing (c-503)
- **Default:** the name as saved.
- **Affects:** req-2798.
- **Why it is open:** the prototype's add and edit banners disagree.

### Journey-mode add heading (c-505)
- **Default:** journey mode keeps today's heading.
- **Affects:** req-2801.
- **Why it is open:** the prototype never shows the INS add page in journey mode.

### Latin name casing on confirmation pages (c-510)
- **Default:** not built; names show as held.
- **Affects:** req-2859.
- **Why it is open:** the design's own review shows them as held.

### Germinal delete message (c-511)
- **Default:** as the conflict's default.
- **Affects:** req-2860.
- **Why it is open:** the germinal list copies today's message, while manage-notifications changes the live animals one.

## Waiting on others

| Requirement | Waiting for | Increment |
|---|---|---|
| req-951, 954, 955, 971, 972, 980, 981, 1023, 1025, 1848, 1850, 1905, 2027 | The INS dashboard's requirements (Sam, 9 October) | inc-128 |
| req-967, 983 to 989, 993 to 996, 1014, 1015, 1019, 1022, 2766 | The INS dashboard's requirements, the banner design, and the backend re-adding the outstanding-items rule | inc-132 |
| req-990, 991, 992 | The INS dashboard's requirements | inc-133 |
| req-973, 975, 976, 978 | The INS dashboard's requirements and the banner design | inc-134 |
| req-974, 977, 997 to 1002 | The INS dashboard's requirements and the authorities' outcome feed | inc-143 |
| req-1004 to 1013 | The INS dashboard's requirements and the inspection selection feed | inc-144 |
| req-979, 2193 | The INS dashboard's requirements and the banner design | inc-145 |
| req-982 | The INS dashboard's requirements and plants publishing to the INS read model | inc-146 |
| req-1039, 1040 | The INS dashboard's requirements and the banner design | inc-139 |
| req-1081, 1082, 1085, 1735, 1739 | The authorities' outcome feed (PIMS Dynamics) and a real source of completion | inc-142 |
| req-910, 2114 | The authorities' outcome feed | overview-and-review branch |
| req-2334 | The banner design | overview-and-review branch |
| req-2034, 2035, 2036 | The plants backend | inc-200 |
| req-051, 2124 | The save and continue work (EUDPA-774) | origin-page branch |
| req-837, 867 | The save and continue work (EUDPA-774) | overview-and-review branch |
| req-456, 457, 1819, 2641 to 2647 | The INS address lookup becoming real | transporters branch |
| req-647, 648, 650, 651, 1217, 1218 | The INS address lookup becoming real | address-book branch |
| req-458, 652, 653, 654, 1214 | The INS address lookup; address search parked as concept work | inc-194 (deferred) |
| req-2725 to 2730, req-2802 to 2829 | The INS address lookup becoming real | inc-282 |
| req-2172 | Approved transporters | transporters branch |
| req-1656, 2131, 2137 | Commodities and types from MDM | commodities-and-reason branch |
| req-290, 291, 814 to 818, 1291 to 1382 (the adopted ones), 2048, 2049, 2052, 2107, 2202, 2632, 2633, 2842 to 2856 | Sam picking templates up again | type-question-and-templates branch |
| req-1875, 1876 | Sam picking templates up again | inc-186 (deferred) |
| req-1740 | Sam picking templates up again | inc-280 |

247 adopted requirements wait in all.

## Settled without a question

Settled-by key: dates are rulings (Sam unless named). DR2.1 is the 26 November prototype. DR1 is the DR1 parity judgements. V4 is the data fields page. "Repo" is the named repo's own code. "tpl" is the 9 October templates ruling; "pm" the 9 October afternoon ruling; "9 Nov ID" the interaction designer.

### Settled since the last report

| Decision | Settled by | Conflict |
|---|---|---|
| Template mode checks an entered answer and accepts a blank | 26 Oct, 27 Nov, tpl | c-308 |
| Germinal counts are per species | 27 Nov | c-327 |
| No germinal exit date | 27 Nov | c-331 |
| The germinal confirmation names the ITAHC; plants names none | 27 Nov | c-364 |
| Same checks reach hard stops plus mandatory-to-proceed answers | 27 Nov | c-372 |
| The INS hand-over is configured per service and proved in the Docker stacks | 27 Nov | c-373 |
| Other ports sit in their own group after rail | 9 Oct | c-384 |
| Both guards refuse a commercial transporter outside Northern Ireland | 6 Nov, repo | c-389 |
| The picker cuts its page of eight in the frontend | 27 Nov | c-394 |
| The add-address hand-off is proved as the INS hand-over is | 27 Nov | c-398 |
| No contact route; the button reads "Save and select" | DR2.1 | c-399 |
| The card reads "Arrival date" | 27 Nov | c-421 |
| Journey add asks "What else should this address be used for?" | INS front door | c-434 |
| Amend is a link once its confirmation page exists | 25 Nov b | c-438 |
| The answersDifferFromSubmitted flag sits on the record, unpublished | 19 Nov, repo | c-443 |
| Plants gains Copy as new | 25 Nov b | c-447 |
| Health certificate wording sits in the inset | DR2.1 | c-456 |
| "Opens in new tab" text sits inside the link | Accessibility | c-457 |
| Commodity names come from MDM | 11 Nov | c-458 |
| Packages are asked per V4's list | 11 Nov | c-459 |
| "Error: " title prefix | Rulings | c-460 |
| Germinal temperature is optional | V4 | c-462 |
| Reveals are open without JavaScript | pm | c-463 |
| V4's identifiers only | 11 Nov | c-465 |
| "Equine name" and "Microchip/transponder" labels | 11 Nov | c-466 |
| "Error: " title prefix | Rulings | c-468 |
| Germinal transit countries are asked | 10 Nov | c-469 |
| "Save and return to template" goes to the template review | tpl | c-470 |
| The commercial transporter is stored as XI, over the tests repo | 6 Nov | c-472 |
| A document's Remove opens a confirmation page | DR2.1 | c-473 |
| Remove names the document by its reference | DR2.1 | c-474 |
| The health certificate sentence | DR2.1 | c-475 |
| "Error: " title prefix | c-006 | c-476 |
| The document delete page sits in the service's own path | 9 Oct | c-477 |
| Remove on consignment address rows | DR2.1 | c-478 |
| The permanent address list is per animal | DR2.1 | c-479 |
| Fraud warning on the place of destination picker | DR2.1 | c-480 |
| Separate find-an-address pages | DR2.1 | c-481 |
| "Consignor" caption | Repo | c-482 |
| The plants strip uses plants' own labels | pm | c-485 |
| No germinal gross weight row on the overview | 27 Nov | c-486 |
| Five review sections | DR2.1, repo | c-488 |
| An "Actions" menu built with the MoJ button menu | DR2.1 | c-489 |
| "Draft" tag grey, "Submitted" blue | DR2.1 | c-490 |
| The review shows gross weight per species | 27 Nov | c-492 |
| Focus moves to the error summary | Accessibility | c-493 |
| Drill-downs show no "Action required" | 16 Nov | c-494 |
| The germinal list ships now as a copy of today's live animals list | 27 Nov | c-495 |
| Pagination with ellipses | 23 Nov | c-500 |
| The INS address book follows DR2.1 | DR2.1 | c-501 |
| Branch type and role added back | 5 Nov, DR2.1 | c-502 |
| The edit page asks the roles | DR2.1 | c-504 |
| UK postcode search for consignee, importer and place of destination | Rulings | c-506 |
| Find-an-address waits on the lookup | Rulings | c-507 |
| Addresses come from the INS backend lookup | Ruling | c-508 |
| Search by postcode only | DR2.1 | c-509 |
| The amend confirmation takes the design's wording | 27 Nov | c-512 |
| "Notification has been deleted." | 9 Oct | c-513 |
| The record holds a list of commodities | Repo | c-514 |
| No consignment contact party | Repo | c-515 |
| Unweaned is asked per V4's list | 11 Nov | c-516 |
| Completing Consignment addresses saves to the overview | DR2.1 | c-517 |
| Cancel amendment is its own page | 9 Nov ID | c-518 |
| INS page titles use a hyphen; already met | Repo | c-519 |
| Germinal "Change number of commodities" | 11 Nov | c-520 |

### Settled before, still standing

| Decision | Settled by | Conflict |
|---|---|---|
| Country of origin list keeps what MDM serves; the prototype's content goes to MDM as a content report | DR1, 9 Oct | c-001 |
| Country of origin is stored as its ISO code and shown by name | 7 Oct | c-002 |
| Origin page keeps all three return controls | DR1 | c-003 |
| Saving origin with no country lands on the overview | 7 Oct | c-004 |
| Origin page keeps its server checks; a refused save stores nothing | 7 Oct | c-005 |
| Accessibility and no-JavaScript duties override DR2.1 only as far as they need to | 7 Oct, pm | c-006 |
| A start from the all-types dashboard asks "What are you importing?" first, in the INS front door | DR2.1, 9 Oct | c-007 |
| Region code prefix is drawn on the server | pm | c-008 |
| Country control stays the accessible autocomplete: no hint, "Search for a country" placeholder | pm | c-009 |
| Region code hint changes, box caps at 5 characters, server check stays | 7 Oct | c-010 |
| Internal reference hint drops the 58-character sentence; the limit stays | 7 Oct | c-011 |
| Commodity search is the separate ticket's work: nothing here builds or changes the control | 10 Nov | c-012 |
| Commodity search hint takes DR2.1's wording | DR2.1 | c-013 |
| Correct the prototype's species typos rather than copy them | 7 Oct | c-014 |
| Commodity pages chain as journey steps; opened from the overview, a page returns there | DR2.1, 9 Oct | c-015 |
| Commodity details keeps the three return controls | DR1 | c-016 |
| "Error: " title prefix stays | 7 Oct | c-017 |
| Commodity details still redirects when no commodity is chosen | 7 Oct | c-018 |
| Live-animal number of packages stays optional but validated | 7 Oct | c-019 |
| Cat and dog species take DR2.1's names, as MDM serves them | DR2.1 | c-020 |
| After a change from check answers, both commodity pages return there | 7 Oct | c-021 |
| Germinal "Total gross weight" is each line's gross weight in kg: stored and shown, not published | 9 Oct, V4, 27 Nov | c-022 |
| Answers stay stored as service codes | Rulings | c-023 |
| Off-list values are refused; a refused submit saves nothing | 7 Oct | c-024 |
| One shared destination country and port of exit, prefilled in each reveal | DR1, 9 Oct | c-025 |
| Destination select built from reference-data's GBNAG_SPS_EX countries, labelled "<territory> (<parent>)" | 9 Oct | c-026 |
| Both port of exit selects offer the whole ports-of-entry list | 9 Oct | c-027 |
| "Error: " title prefix stays | 7 Oct | c-028 |
| Reason page heading becomes "Main import reason" | DR2.1 | c-029 |
| Reason page Back goes to the previous page, or the overview | DR2.1 | c-030 |
| Reason page continues to Commodity details | DR2.1 | c-031 |
| Destination country placeholder "Select one", no divider | DR2.1 | c-032 |
| Port of exit placeholder "Select one", no divider | DR2.1 | c-033 |
| Certification hint becomes "You can find this information on the ITAHC." | DR2.1 | c-034 |
| Cattle and pigs are asked the unweaned question | DR2.1 | c-035 |
| Additional details Back goes to the previous journey page | DR2.1 | c-036 |
| Additional details sits after identification or commodity details, then Arrival details | DR2.1 | c-037 |
| Main reason task completes on its own answers | DR2.1 | c-038 |
| Identification page keeps the real address, guards, tokens and field names | Rulings | c-039 |
| Identifier limit and stale-action safeguards stay | 7 Oct | c-040 |
| One identifier is enough; Complete uses the submit bar; DR1 inc-103 is closed | 9 Oct | c-041 |
| A partly filled animal saves with no error; an animal with no identifier is refused | 9 Oct | c-042 |
| Commodity details refuses a count below the saved records | DR1 | c-043 |
| Permanent address leaves the identification page for its own page | 7 Oct | c-044 |
| Arrival and transit keep every server-side field check | 7 Oct | c-045 |
| Pages keep submitting and storing codes | Rulings | c-047 |
| Port of entry and transit lists built from MDM content; ports ordered airports, seaports, rail | 9 Oct | c-048 |
| Arrival date reads "Arrival date at port of entry" everywhere, review included | 17 Nov, 27 Nov | c-049 |
| Arrival date hint keeps its wording with an example inside the window | 7 Oct | c-050 |
| Each transporter row gets "View details", pointing at the address book | DR2.1, 6 Nov | c-052 |
| Status strip follows DR2.1 page by page on the transporter pages; journey mode is c-390 | DR2.1 | c-053 |
| Private transporter country list is the UK plus GBNAG_SPS_EX countries as MDM serves them | 9 Oct, 6 Nov, 11 Nov | c-054 |
| A commercial transporter with a non-Northern Ireland country is refused | 7 Oct | c-055 |
| Add transporter forms keep DR1's return controls and add "Cancel and return to dashboard" | DR1, 6 Nov | c-056 |
| Approved transporters are parked: the eight shipped records stay as they are | 6 Nov, 11 Nov | c-057 |
| Added transporters stay scoped to the organisation, in both sets | Rulings | c-058 |
| Documents page stays at accompanying-documents | 9 Oct | c-059 |
| Documents Back returns to the review when come from it, else the overview | DR2.1 | c-060 |
| Row drops the leading "An" | DR2.1 | c-061 |
| Row drops the leading "An" | DR2.1 | c-062 |
| Document reference hint removed | DR2.1 | c-063 |
| Document reference keeps its 58-character limit | 7 Oct | c-064 |
| Document references accept punctuation; frontend and backend agree | DR2.1 | c-065 |
| Document type travels as the service code | 7 Oct | c-066 |
| Date of issue hint "For example, 27/3/2026" | DR2.1 | c-067 |
| Size bullet opens "files that are smaller than" | DR2.1 | c-068 |
| File limit is 50MB everywhere; already built | DR1, DR2.1 | c-069 |
| File-type bullet drops the leading "a" | DR2.1 | c-070 |
| Stated file rules stay enforced | 7 Oct | c-071 |
| GOV.UK file upload component stays | DR1 | c-072 |
| Chosen file is not kept after a server error | 7 Oct | c-073 |
| Typed values are not restored after an over-cap body | 7 Oct | c-074 |
| Maximum-documents error points at the Attachment field | DR2.1 | c-075 |
| Hidden column heading becomes "Action" | DR2.1 | c-076 |
| Empty-state line goes | DR2.1 | c-077 |
| Virus scanning stays real, with failure states | 7 Oct | c-078 |
| View file stays for clean documents | 7 Oct | c-079 |
| Save and continue stops waiting for scans; a rejected document still holds | DR2.1 | c-080 |
| Upload documents continues to consignment addresses, or back to where the trader came from | DR2.1 | c-081 |
| Save and return checks and saves a part-filled document, in live animals and germinal | DR2.1, 27 Nov | c-082 |
| Upload documents link opens once the origin is answered; already built | DR2.1 | c-083 |
| Documents are stored durably by the backend | 7 Oct | c-084 |
| Document types drop "Health certificate" | 7 Oct | c-085 |
| Roles and addresses keeps its summary list, with full addresses | DR1 | c-087 |
| Fraud warning has no full stop | DR2.1 | c-088 |
| Each empty row's add link names what it adds | DR2.1 | c-089 |
| Answered party rows show the whole address | DR2.1 | c-090 |
| Germinal products are their own set with no CPH page; live animals still exempts only 0101 and 01061900 | 9 Oct | c-091 |
| Consignment addresses continues to the review, or the overview when opened from it | DR2.1, 9 Oct | c-092 |
| Picker's "Add a new address" looks and sits as drawn | DR2.1 | c-093 |
| Every picker pages at eight with a "Selected address" inset, searched on the server, with no live filtering | 25 Nov, 23 Nov, pm | c-094 |
| Picker count wording follows DR2.1 | DR2.1 | c-095 |
| Picker address column shows one line per address line | DR2.1 | c-096 |
| Animals picker rows get a "View" link to the INS address book; plants' pickers keep their own | DR2.1, pm | c-097 |
| A blank picker save returns to consignment addresses, party unchanged; an address not in the book is refused | DR2.1 | c-098 |
| Party pickers end with the primary button alone | DR1 | c-099 |
| DR1's address-page blocks do not stop these differences | 7 Oct | c-100 |
| Records with no role yet appear on every picker; plants' pickers filter by role too | DR1, pm | c-101 |
| The place of origin picker takes the same search box, hint and server search as the other four | pm, DR2.1 | c-102 |
| The party is named "Consignor", in animals and plants | DR2.1, pm | c-103 |
| Consignment addresses completes when every shown section is complete | DR2.1 | c-104 |
| Picker search has a medium label and an icon button "Search", in animals and plants | DR2.1, pm | c-105 |
| Journey add-address stays on the INS address book through today's handshake | Rulings | c-106 |
| Manual-entry Country list built with what MDM serves; "Select one" placeholder | 9 Oct | c-107 |
| Add-address keeps the address book's length and email checks | 7 Oct | c-108 |
| Add-address keeps GOV.UK accessibility patterns | 7 Oct | c-109 |
| CPH page keeps "Save and continue" alone | DR1 | c-110 |
| Permanent address page ends with "Save and continue" alone | DR1 | c-111 |
| CPH is stored as 9 digits and shown as 12/345/6789 | 7 Oct | c-112 |
| CPH page can be saved blank | DR2.1 | c-113 |
| Part-filled CPH numbers are still checked | 7 Oct | c-114 |
| CPH Back and Save go to consignment addresses | DR2.1 | c-115 |
| Consignment addresses never goes on to the CPH or permanent address page; from the overview it returns there | DR2.1, 9 Oct | c-116 |
| CPH help's second paragraph takes DR2.1's wording and link | 7 Oct | c-117 |
| Permanent address page and same-as-destination are built | 7 Oct | c-119 |
| Contact page's sentence, structure and add-a-branch | 7 Oct | c-120 |
| Contact page offers only the organisation's branch addresses | DR2.1, DR1 | c-121 |
| A blank contact save shows "Select a contact address" | DR2.1 | c-122 |
| Contact page continues to review on the first pass; from the overview it returns there | DR2.1, 9 Oct | c-123 |
| Contact stays complete when the address-book record goes | 7 Oct | c-124 |
| Contact page drops the "Current contact address" card; the edit route stays | DR2.1, 9 Oct | c-125 |
| A new permanent address keeps its county and fields | 7 Oct | c-126 |
| Overview "Cancel amend" goes to the cancel-amendment confirmation page | pm | c-127 |
| Each notification keeps its own overview, in each set's own path | Rulings | c-128 |
| Overview keeps the GOV.UK Task list component | 7 Oct | c-129 |
| Transport card shows the transporter's stored country | 7 Oct | c-130 |
| Submitted view shows the notification's own answers | 7 Oct | c-131 |
| Declaration submit keeps its completeness re-check | 7 Oct | c-132 |
| Identifier-driven outstanding items built, with no blocker; the action-required warnings come out (c-410) | 9 Oct, DR2.1 | c-133 |
| Review names unfinished commodity and species answers as drawn | DR2.1 | c-134 |
| Review error summary has one entry per unfinished card | 7 Oct | c-135 |
| Amend review opens without errors; an incomplete amendment is refused with errors | 7 Oct | c-136 |
| Review drops row-level "Edit details" links | 7 Oct | c-138 |
| Review keeps errors from real validation | 7 Oct | c-139 |
| Review keeps virus-scan errors | 7 Oct | c-140 |
| Transit countries move into Arrival details on the review | DR2.1 | c-141 |
| Subsection headings above review cards go | DR2.1 | c-142 |
| "Return to your dashboard" and the view's Back go to the set's own notification list | pm, tpl | c-143 |
| A trader with something left to do amends from the view; the action-required view is withdrawn (c-410) | 7 Oct, 16 Nov | c-144 |
| INS root becomes the DR2.1 overall dashboard, blocked with the summary information; today's table stays meanwhile | DR2.1, 9 Oct | c-145 |
| Home title "Dashboard - Import notification service - GOV.UK" built now; caption and h1 wait with the overall home | DR2.1, pm | c-146 |
| "Create new" always shows and goes to the type choice, on today's home | 7 Oct, tpl | c-147 |
| Glance counts come from the organisation's real notifications, and wait on the INS dashboard requirements | 7 Oct | c-148 |
| "Action needed" means a submitted notification missing a required document or identifier; its status stays Submitted | DR2.1, 9 Oct, 16 Nov | c-149 |
| No "Messages" link or unread count | 7 Oct | c-150 |
| Plants "View dashboard" links to the real plants dashboard | 7 Oct | c-151 |
| Plants glance cards link like the others; the cards and counts wait | 7 Oct, pm | c-152 |
| "Log out" stays | 7 Oct | c-153 |
| Drill-down cards keep status-driven links | DR1 | c-154 |
| Drill-downs apply the chosen search and sort | 7 Oct | c-155 |
| Home and drill-downs take DR2.1's styling | DR2.1 | c-156 |
| Drill-downs are always sorted, "Newest first" by default | DR1 | c-157 |
| Per-category glance cards replace DR1's band | 7 Oct | c-158 |
| Each list stays in its own frontend at its set root, reframed in place; the animals backend's list gains the category filter | pm, tpl | c-159 |
| Drafts keep Resume, Copy as new and Delete; submitted cards keep status actions; plants mirrors with its own | 7 Oct, DR1 | c-160 |
| List is always sorted: "Newest first", "Oldest first", "Arrival date" | DR1 | c-161 |
| Search, sort and filters really change the list, through one GET form | 7 Oct | c-162 |
| Page links keep tab, sort, search and filters | 7 Oct | c-163 |
| Card writes the arrival date as "2 December 2026" | DR2.1 | c-164 |
| Amending notifications sit with the drafts, tagged yellow "Amend" | DR2.1 | c-165 |
| Unreadable or reversed filter dates show GOV.UK errors | 7 Oct | c-166 |
| DR1's deferred dashboard rows do not hold back DR2.1 | Rulings | c-167 |
| Address book shows 8 a page, asked for through the list API's page size (1 to 100, default 25) | DR2.1, 5 Nov, 25 Nov | c-168 |
| Address book search runs on the server; it does not filter as the trader types | pm, 13 Nov | c-169 |
| Address book honours same-site and approved cross-origin returns | 7 Oct | c-170 |
| INS list drops controls DR2.1 lacks; the banner stays and stops hiding itself | 7 Oct, pm | c-171 |
| Address book stays persisted and organisation-wide | 7 Oct | c-172 |
| Address view reads the book only | 7 Oct | c-173 |
| View link keeps the visually hidden name | 7 Oct | c-174 |
| Log out stays in the INS navigation | 7 Oct | c-175 |
| The address record carries roles alone: "use" renamed "role", at least one required, no stored address type | 5 Nov | c-176 |
| Country select offers reference data's unfiltered list, as MDM serves it | 9 Oct | c-177 |
| Address search keeps DR2.1's look with results from the INS lookup, blocked until the lookup is real and parked as concept work | 9 Oct, 9 Nov | c-178 |
| Length limits and email check stay | 7 Oct, V4 | c-179 |
| Error-state accessibility stays | 7 Oct | c-180 |
| Addresses persist; an edit keeps every role the address has | 7 Oct | c-181 |
| Templates are stored by the backend, with no seeded examples | Rulings | c-183 |
| A template is private to the user who saved it | DR2.1 | c-184 |
| Manage templates has no sort control; the sort is dropped with templates | pm, 9 Nov ID | c-185 |
| A template saves each party's address separately | 7 Oct | c-186 |
| Using a template seeds the transporter's country | 7 Oct | c-187 |
| No saving a template by GET | 7 Oct | c-188 |
| Amend, cancel amendment, copy and delete change state by form posts | Rulings | c-189 |
| Amend and cancel-amendment confirmations are pages; the dialogs are dropped outright | 9 Nov ID | c-190 |
| Confirming an amendment lands on the amend review; already built | DR2.1 | c-191 |
| Amendment edits are saved to the record | 7 Oct | c-192 |
| Delete stays a soft delete | 7 Oct | c-193 |
| Dashboard cards keep status-driven actions | DR1 | c-194 |
| DR2.1 copy adopted on the delete and cancel-amend pages | DR1 | c-195 |
| A copy carries exactly DR2.1's list | DR2.1 | c-196 |
| Copying mid-amendment copies the submitted version | DR2.1 | c-197 |
| Guards, delete and view Back go to the set's own notification list | pm | c-198 |
| Continue on the amend review is held while anything is invalid, with an error summary | 7 Oct | c-201 |
| Reason for import is asked before commodity details | DR2.1, 9 Oct | c-202 |
| CPH number is reached only from its consignment addresses row | DR2.1 | c-203 |
| Pages opened from the overview return to it on save | DR2.1, 9 Oct | c-204 |
| Opening run always ends on the review page; plants takes the same | DR2.1, pm | c-205 |
| Back follows the page's context, read from the service's own state | DR2.1 | c-206 |
| Origin page offers the overview return controls | 7 Oct, DR1 | c-207 |
| Pickers, CPH and permanent address pages end with the primary button alone | 7 Oct, DR1 | c-208 |
| No contact page is left to carry hub-worded controls | 7 Oct, DR2.1 | c-209 |
| While amending, overview pages get the amend ending; pickers, CPH and permanent address show "Save and return" | 7 Oct | c-210 |
| **Replaced:** the soft save is withdrawn. On every page with both buttons, "Save and return to overview" makes the same checks as "Save and continue". How far they reach is settled by c-372 | 26 Oct, 27 Nov | c-211 |
| Log out stays last in the navigation on every frontend | 7 Oct | c-212 |
| Address book item goes to the INS address book from both frontends and both sets | 9 Oct | c-213 |
| Logo links to gov.uk; service name to each set's or frontend's own dashboard home | 9 Oct | c-214 |
| Feedback link stays the APHA service desk email, plants included | DR1 | c-215 |
| No page shows the signed-in identity | Animals frontend | c-216 |
| Address search is built in no environment until the lookup is real, and is parked as concept work; manual entry is built now | 9 Oct, 9 Nov | c-217 |
| The commercial transporter's Northern Ireland search uses the INS lookup filtered to BT postcodes; blocked on the lookup alone | 9 Oct, 6 Nov | c-218 |
| Choosing a different type starts a new notification; the old one is untouched | 9 Oct | c-219 |
| No template mode is built on the type question while templates are parked | 4 Nov, 9 Nov ID | c-220 |
| Country of origin labels subdivisions "<territory> (<parent>)", sorted by label, in both sets | DR2.1, 9 Oct | c-221 |
| Taking germinal lines out of the live-animals catalogue is the commodity-search ticket's work, now landed | 10 Nov | c-222 |
| The real commodity lines and fields stay; the prototype's hidden fields are not copied | 9 Oct | c-223 |
| Commodity pages keep their real paths | 9 Oct | c-224 |
| Performance tests change in each increment whose change breaks a k6 script | 7 Oct, 9 Oct | c-225 |
| Port of exit options read "<name> - <code>" | DR2.1 | c-226 |
| Germinal products is a sibling set at /germinal-products, started from its own route | 9 Oct | c-227 |
| The germinal set holds only germinal products; there is no mixed case | 9 Oct | c-228 |
| Embryos and ova are separate catalogue items (EMBRYO, OVA); a combined line carries EMBRYO meanwhile | 9 Oct | c-229 |
| The germinal catalogue's content is MDM's; V4 still decides which germinal fields apply | V4, 9 Oct, 11 Nov | c-230 |
| Germinal gross weight is asked and stored per species line, in each species block on Commodity details | 27 Nov, 9 Oct | c-231 |
| Germinal gross weight and temperature are optional | V4 | c-232 |
| Temperature is asked once and stored on every line | V4, DR2.1 | c-233 |
| A germinal line's mandatory count is Quantity (unit/pieces), 1 to 1,000; Number of packages is optional where V4's list names it | V4, 9 Oct | c-234 |
| A germinal species counts as identified once its entry holds one identifier | 9 Oct, V4 | c-235 |
| Arrival details page stays at port-of-entry | 9 Oct | c-236 |
| Documents page returns without ?from= markers | 9 Oct | c-237 |
| No template-mode guard on documents; templates never offer it | 9 Oct | c-238 |
| Permanent address storage shape is the real model's | 9 Oct | c-239 |
| CPH, permanent address and contact pages use real paths and field names | 9 Oct | c-240 |
| No new link to the kept contact edit route | DR2.1 | c-241 |
| CPH, permanent address and contact error states keep "Error: " and HTTP 400 | Rulings | c-242 |
| Pages return to the overview by the flow's fallback, with no from=hub marker | 9 Oct | c-243 |
| The germinal overview shows "Units/pieces" and "Packages/boxes" cards and no weight card | DR2.1, 9 Oct | c-244 |
| Review, declaration and confirmation keep their real paths | 9 Oct | c-245 |
| A draft's review shows the view header with its Draft status and stays editable | 9 Oct | c-246 |
| Confirmation's "Create a new notification" keeps today's mechanism, styled as a link | 9 Oct | c-247 |
| No template guard on the declaration | 9 Oct | c-248 |
| No /dashboard redirect | 9 Oct | c-249 |
| Home and drill-down links use each service's own paths; category lists sit in their own frontends | 9 Oct | c-250 |
| Lists keep the prototype's content; each list's own frontend names addresses and parameters | 9 Oct | c-251 |
| The list banner stays triggered by the redirect flag, in animals and plants | 9 Oct | c-252 |
| The INS service names the tab and search parameters | 9 Oct | c-253 |
| Only transporters carry a transporter authorisation number | 9 Oct | c-255 |
| Phone stays free text up to 20 characters | Address book, V4 silent | c-256 |
| Templates pages use real paths and field names | 9 Oct | c-258 |
| Template ids are the backend's design | 9 Oct | c-259 |
| A notification does not record its template | 9 Oct | c-260 |
| No whole-template edit mode | 9 Oct | c-261 |
| No POST handler on a template page | 9 Oct | c-262 |
| No section allow-list redirect | 9 Oct | c-263 |
| No template-mode URL guards | 9 Oct | c-264 |
| Template creation offers Live animals and Germinal products only | 9 Oct | c-265 |
| A template's category is the set it was made in | 9 Oct | c-266 |
| Amendment buttons post the service's own fields | 9 Oct | c-267 |
| ?cancelled=1 stays; no success banner after cancelling | 9 Oct, DR2.1 | c-268 |
| The deletion message shows on the set's own list through ?deleted=1 | pm | c-269 |
| The deletion banner does not dismiss itself, in every set | pm, accessibility | c-271 |
| The category is stored on the record only; no event or schema change | pm | c-272 |
| Live-animal lines carry LIVE_ANIMAL; germinal lines SEMEN or EMBRYO until MDM separates ova | 9 Oct | c-273 |
| Journey pages keep real paths; germinal uses /germinal-products | 9 Oct | c-274 |
| Buttons keep the service's own fields | 9 Oct | c-275 |
| No from=hub, from=review or from=template-review markers | 9 Oct | c-276 |
| Every germinal species, a lone one included, needs one identifier before submit and Complete | V4, 9 Oct | c-277 |
| The catalogue's content is MDM's and out of scope; only the reference-data integration stays blocked on MDM | 11 Nov | c-278 |
| Germinal set asks "Total gross weight", stored per line in kilograms; no conditional temperature | 9 Oct | c-279 |
| No mixed live-and-germinal consignment behaviour is built | 9 Oct | c-280 |
| A germinal notification starts from the type question or the germinal set's own list | pm | c-281 |
| The germinal catalogue's content leaves the backlog as an MDM concern; the set goes ahead on the lines it holds | 11 Nov | c-282 |
| The germinal dates keep the MOJ date picker over a text input, built with the germinal identification dates | 9 Nov ID, 10 Nov | c-283 |
| Port search matches are not bolded, in animals or plants | pm | c-284 |
| **Overruled 6 November:** the address book manages transporters; only the commercial address search still waits, on the lookup (c-218) | pm, 6 Nov | c-285 |
| The template-review controls go on the transporter list as it stands | pm | c-286 |
| The no-JavaScript address search is built when the lookup lands; no live filtering | pm, 13 Nov, 9 Nov | c-287 |
| The CPH boxes follow the GOV.UK date input with no JavaScript; the server keeps its checks | 9 Nov ID | c-288 |
| No cancel-amend dialog on the CPH page; the Amend bar's "Cancel amend" goes to the confirmation page | pm | c-289 |
| Plants' contact page takes only the new intro and "Select an address" heading | pm | c-290 |
| Plants' contact page keeps the whole address book and no add link | pm | c-291 |
| The plants contact picker keeps its pagination and "Selected address" inset, and pages at eight | 25 Nov | c-292 |
| Plants' party cards drop telephone and email rows and read the address line by line | pm | c-293 |
| Import reference numbers stay selectable text; no Copy button is built | 13 Nov | c-294 |
| Each category list stays in its own frontend; "View dashboard" and drill-down Back links point there | tpl, pm | c-295 |
| The category is not published on the notification event | pm | c-296 |
| The INS home's germinal section waits with the summary information | pm | c-297 |
| No list carries a Back link to the overall home | pm | c-298 |
| The list uses GOV.UK and MoJ components, with no custom JavaScript | pm | c-299 |
| Plants' list drops its empty-list sentence | pm, DR2.1 | c-300 |
| Plants' card mirrors the component: "Submitted" blue tag, "Draft" tag, "Amend" yellow | pm, DR2.1 | c-301 |
| Plants' tabs, 8 a page, search, sort and filters wait on the plants backend (inc-200); the rest of plants' frame changes now | pm | c-302 |
| Address book category tabs are MoJ sub navigation | pm | c-304 |
| The address search is server-side find-an-address pages; the add-details step shows its fields straight away | pm, 13 Nov | c-305 |
| **Overruled 6 November:** "Transporter" is an option on "Choose an address type", third before "Branch" | pm, 6 Nov | c-306 |
| Plants' navigation gains no Templates item while templates are parked | tpl, 4 Nov | c-307 |
| "Use template" is a form post | pm | c-309 |
| Card Amend goes through the amend confirmation page, in every set | pm | c-310 |
| The strip reads "Amend" in every set, plants included | pm | c-311 |
| Plants' opening run ends on check your answers even when incomplete | pm | c-312 |
| **Replaced:** plants' lenient save is withdrawn; both buttons make the same checks | 26 Oct | c-313 |
| Each set's root renders its own notification list | pm, tpl | c-314 |
| The performance suite does not join the list reframe for a route move | pm | c-315 |
| Arrival and transit keep the "Error: " title prefix and named Remove buttons that work without JavaScript | pm | c-316 |
| Plants' Overview changes only where an animals overview row changes the same page | pm | c-317 |
| Country of origin is mandatory to proceed on both buttons | V4, 26 Oct | c-319 |
| The animals origin page shows "Select a country of origin"; plants keeps its own wording | V4 silent | c-320 |
| On the origin page both buttons make the same checks; a blank region code still saves | 26 Oct | c-321 |
| On the commodity page, Commodity details and the plants commodity type page, both buttons make the same checks | 26 Oct, 27 Nov | c-323 |
| Number of packages is asked where V4's list names the species' commodity, and withheld elsewhere | V4 | c-324 |
| The live-animals catalogue's names are whatever MDM serves | 9 Oct, V4 | c-328 |
| Remove on Commodity details keeps unsaved typed numbers | 26 Oct | c-329 |
| On the main import reason and additional details pages both buttons make the same checks | 26 Oct | c-332 |
| A species whose commodity needs no specific identifier is asked free-text Identification details and a Description | V4 | c-333 |
| A tattoo is asked on cattle and pigs as well as cats, dogs and ferrets | 11 Nov | c-334 |
| On every germinal page with both buttons the two make the same checks | 27 Nov, 26 Oct, 9 Oct | c-339 |
| A germinal commodity's code is the catalogue's eight-digit code | pm | c-340 |
| On arrival details and transit countries both buttons make the same checks | 26 Oct | c-341 |
| The port of entry offers every port MDM returns for GBNAG, in both sets | 9 Oct | c-342 |
| Four means of transport, stored AIRPLANE, RAILWAY, ROAD_VEHICLE, VESSEL, read Air, Rail, Road, Sea | V4, DR2.1 | c-343 |
| The germinal set asks transit countries on the same terms as live animals | 9 Oct, V4 | c-344 |
| Transit countries stay optional | V4 | c-345 |
| A transporter is mandatory to proceed on both buttons | V4, 26 Oct | c-346 |
| Both transporter forms take the Standard Address Block's fields and limits and DR2.1's labels | 11 Nov | c-347 |
| The Document type select offers the business's thirteen types in order; three wait on codelist codes | V4 | c-348 |
| Each document type keeps DR2.1's wording where both name it | V4 | c-349 |
| Any detail entered makes the add-a-document form a document, refused with an error for each missing one | 26 Oct, 10 Nov | c-351 |
| The date of issue accepts a one- or two-digit day and month with a four-digit year | DR2.1, V4 | c-352 |
| On upload documents both buttons make the same checks | 26 Oct, 27 Nov | c-353 |
| The four document fields keep their labels | V4 | c-354 |
| The attachment's format is taken from the file and checked against eight formats | V4, DR2.1 | c-355 |
| The CPH question applies to V4's seventeen commodity codes only | V4 | c-357 |
| A CPH number is 2, 3 and 4 digits, hinted "For example 12/345/6789", stored as nine digits | 11 Nov | c-358 |
| The contact address comes from the organisation's branch-address records, with no manual entry | 11 Nov, 9 Oct | c-359 |
| A new permanent address asks DR2.1's eight fields with County and no country | 11 Nov, 14 Oct | c-360 |
| Both buttons make the same checks; which answers a page needs comes from V4's markings | 26 Oct, V4 | c-361 |
| The germinal contact address page carries the live-animals save-button behaviour | 26 Oct, 9 Oct | c-362 |
| Only cats, dogs and ferrets need a permanent address | V4, DR2.1 | c-363 |
| A germinal notification needs action on the documents its set requires, with no identifier test | 10 Nov | c-366 |
| While amending, "Save and return to overview" makes the same checks, upload documents included | 26 Oct, 27 Nov | c-370 |
| The amend review's heading switches once a saved answer differs from the submitted one | 19 Nov, DR2.1 | c-371 |
| Commodity-area deltas are read from the frontend and tests repo, not the stale traces | Repo | c-374 |
| The commodity pages build no template behaviour while templates are parked | 4 Nov, 9 Nov ID, 9 Nov | c-375 |
| The number of animals accepts whole numbers up to 9,223,372,036,854,775,807, and the store widens | V4, 11 Nov | c-376 |
| Reference-data now serves a commodity search and species check backed by MDM | Repo | c-377 |
| A stale unweaned answer is cleared on the service's own applicability rule | 11 Nov | c-378 |
| No template-mode behaviour on main import reason or additional details | 4 Nov, 9 Nov ID | c-380 |
| The germinal commodity search goes to the commodity-search ticket; the page keeps the server-side search | 10 Nov | c-382 |
| Port and transit country searches keep the autocomplete's own announcements | 9 Nov, pm | c-383 |
| The INS front door's add pages are the one route to adding a transporter; the animals frontend's add pages go | 6 Nov | c-385 |
| The transporter list pages at eight, with an inset naming the chosen transporter | 25 Nov | c-386 |
| The transporter list searches on the server behind its button and Enter; no filtering as you type, no bolding | 13 Nov, pm | c-387 |
| The animals frontend's own source says what the transporter pages do today | Repo | c-391 |
| The address book is the system of record for transporters; the frontend's in-memory store is replaced | 6 Nov | c-392 |
| The section reads "Addresses" and its page and overview row "Consignment addresses", plants included | 17 Nov | c-393 |
| "County (optional)" stays on the add-address page the journey reaches | 14 Oct | c-395 |
| The add page is already DR2.1's "Add address and contact details" page | Repo | c-396 |
| A journey-added address record holds roles only, at least one, with no stored type | 5 Nov | c-397 |
| The animals frontend's own extract says what it does now | Repo | c-400 |
| The CPH and permanent address pages show the caption "Addresses" | 17 Nov | c-401 |
| The animals contact address page pages at eight with the "Selected address" restatement | 25 Nov | c-402 |
| The overview heading is "Notification task list"; a template's reads "Template task list" | 19 Nov | c-404 |
| The overview's fifth section reads "Addresses" with its number kept, its row "Consignment addresses" | 17 Nov | c-405 |
| The repository says what the live-animals overview now shows | Repo | c-406 |
| The review row reads "Port of exit" | 17 Nov | c-407 |
| The review row reads "Arrival date at port of entry" | 17 Nov, 27 Nov | c-408 |
| The review's section reads "Addresses", its card "Consignment addresses", its message "Complete consignment addresses" | 17 Nov | c-409 |
| No "Submitted action required" status, view warning, Continue, review error or list marking | 16 Nov | c-410 |
| Submitting records the submitted date and no outstanding items list; both come back with the banner | 19 Nov | c-411 |
| An unknown notification reference answers 404 "Page not found", in animals and plants | 19 Nov | c-412 |
| No template review, template sections or "Save template" button in this programme | 4 Nov | c-413 |
| The INS home has no "Use template" button or Templates item; it offers "Create new" alone | 4 Nov, 9 Nov, 9 Nov ID | c-416 |
| The Action needed card and drill-down wait on the banner and the INS requirements | 16 Nov, 19 Nov | c-417 |
| The list shows no "Action required" tag, error card or outstanding-items message | 16 Nov, 19 Nov | c-418 |
| No list offers a "Use template" button | 4 Nov, 9 Nov, 9 Nov ID | c-420 |
| Every list of an organisation's addresses is served a page at a time, role filter first | 25 Nov, 5 Nov | c-422 |
| The list takes repeatable roles plus search roles, so one request serves a whole tab | 5 Nov, 25 Nov | c-423 |
| An address's roles all come from one group, so it is listed on exactly one tab | 5 Nov | c-424 |
| A listed name breaks after its first word | DR2.1 | c-425 |
| The Transporter tab lists transporter records with a Commercial or Private type; no seventh role | 6 Nov, 5 Nov | c-426 |
| "Transporter" sits third on the address type question, before "Branch" | 5 Nov, 6 Nov | c-427 |
| The address-book theme's end-to-end claims and the November rulings say what add and edit do today | 25 Nov | c-428 |
| A create or update carrying an address type is refused with a 400 and a per-field message | 6 Nov | c-429 |
| One save reports every missing or invalid answer, roles included | 26 Oct, 7 Oct | c-430 |
| The edit page's Country select has no blank option unless the stored code is no longer served | 7 Oct | c-431 |
| "County (optional)" stays on the address book's add-details step | 14 Oct | c-432 |
| The templates pages read "Addresses" and "Consignment addresses" | 17 Nov | c-435 |
| A task list heading is spelled "task list", two words | 19 Nov | c-436 |
| Templates are built when the parking lifts; every adopted templates requirement carries that blocker | 4 Nov, 9 Nov, 9 Nov ID | c-437 |
| Amend, copy and delete accept a submitted notification with outstanding items as any other | 16 Nov | c-439 |
| A copy carries certified-for over as stored | 11 Nov | c-440 |
| The record holds no outstanding items list; the submitted date is still recorded | 19 Nov | c-441 |
| No "Submitted action required" status: the enum stays DRAFT, SUBMITTED, AMEND, DELETED | 16 Nov | c-442 |
| The submission event's data is the GBN-AG exchanged document and specified consignment | Repo | c-444 |
| A decision in the animals frontend's own design record is not one of the named overrides | 7 Oct, 9 Oct | c-445 |
| The deleted plants journey spec ruling is not restored | 19 Nov | c-448 |
| Every plants picker pages at eight and keeps the restatement of the chosen address | 25 Nov | c-449 |
| A page opened from a review Change link returns to the review when saved | 7 Oct | c-452 |

462 conflicts were settled this way.

## Already in place

1,599 adopted requirements already exist in the services. They need no build, only care not to break them.

| Where the evidence is | Requirements |
|---|---|
| Animals frontend and the shared test suites | 911 |
| Plants frontend, alone or with animals | 211 |
| INS front door and the address book | 246 |
| Shared across the animals, INS and plants frontends | 34 |
| Animals backend | 127 |
| Reference data and the stub | 33 |
| Performance suite | 10 |
| Rulings or design only: confirm before passing on | 27 |

The 27 resting on rulings or design only: req-060, 061, 062, 063, 064, 374, 1719, 1720, 1721, 1722, 1725, 1748, 1749, 1858, 1902, 1903, 1906, 1950, 1963, 1966, 1967, 1968, 1969, 1970, 2050, 2257, 2293.

The full list is every requirement with delta "exists" in `distil/requirements.json`.

## The increments

### Ready to go

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|
| inc-129 **Review point** | The live animals list reframed in place, scoped to the organisation; plants takes the same frame | 9 | plantsfrontend, frontend, tests | — | animals-dashboard |
| inc-239 | A success banner only when an action sends the trader back | 4 | frontend | — | animals-dashboard |
| inc-277 **Review point** | Plants rulings records carry the decisions in force | 8 | plantsfrontend | — | recorded-decisions-plants |
| inc-278 | The plants journey specification says what the set now has | 17 | plantsfrontend | inc-277 | recorded-decisions-plants |
| inc-181 | Germinal Consignment addresses: five pickers, overview task, no CPH and no permanent address | 14 | frontend, tests | identification-and-permanent-address (inc-054), consignment-parties (inc-091) | germinal-products |
| inc-126 | "Notification has been deleted." on the live animals and plants lists | 16 | backend, plantsfrontend, frontend, tests | inc-129; overview-and-review (inc-110); manage-notifications (inc-120, 121, 125) | animals-dashboard |
| inc-135 | Tabs "Submitted", "Draft and Amend", "Past" | 6 | backend, frontend, tests | inc-126 | animals-dashboard |
| inc-136 | Search and sort as one real form | 9 | backend, plantsfrontend, frontend, tests | inc-135; design-snagging (inc-210) | animals-dashboard |
| inc-137 | "Additional filters" for arrival date, date range and status | 11 | backend, frontend, tests | inc-136 | animals-dashboard |
| inc-138 | 8 a page, with no results count or empty message | 7 | backend, plantsfrontend, frontend, tests | inc-136, inc-137 | animals-dashboard |
| inc-176 **Review point** | Germinal starts in its own set: draft reference, stored category, chrome, cross-set guard and origin page | 27 | backend, frontend, tests | inc-129, inc-126, inc-135; type-question-and-templates (inc-148, 150); overview-and-review (inc-098, 100) | germinal-products |
| inc-016 | Germinal "What are you importing?" offers germinal commodities only | 6 | frontend, tests | inc-176 | germinal-products |
| inc-141 | The germinal root shows its own list, a copy of today's live animals list | 4 | backend, frontend, tests | inc-176 | germinal-products |
| inc-178 | Germinal transporter list | 12 | frontend, tests | inc-176 | germinal-products |
| inc-179 | Germinal Upload documents | 10 | frontend, tests | inc-176; documents (inc-031, 033, 034, 035) | germinal-products |
| inc-264 | The INS type question takes germinal to its own journey | 6 | insfrontend, tests | inc-176; type-question-and-templates (inc-263) | germinal-products |
| inc-024 | Germinal main import reason: two reasons, four purposes, Transit answers, no exit date | 12 | frontend, tests | inc-016, inc-141; commodities-and-reason (inc-015, 022); design-snagging (inc-218) | germinal-products |
| inc-017 | Germinal Commodity details: quantity, packages where they apply, gross weight and temperature per species; the record holds them; every trade line says what it is | 16 | backend, frontend, tests | inc-016, inc-024; commodities-and-reason (inc-018, 012) | germinal-products |
| inc-177 | Germinal Commodity details checks quantity and weight, with errors by question | 10 | frontend, tests | inc-017; commodities-and-reason (inc-018) | germinal-products |
| inc-052 | Germinal identification once per species: donor, dates, id number | 10 | backend, frontend, tests | inc-016, inc-017; identification-and-permanent-address (inc-045) | germinal-products |
| inc-099 | Germinal overview: section 2 tasks, two total cards, completeness rule | 15 | frontend, tests | inc-017, inc-177 | germinal-products |
| inc-172 | The germinal list takes the reframed frame with its own card facts | 3 | frontend, tests | inc-126, inc-141, inc-017 | germinal-products |
| inc-105 | Germinal review and confirmation | 16 | frontend, tests | inc-017, inc-052, inc-176, inc-099, inc-141; overview-and-review (inc-104, 106) | germinal-products |
| inc-182 | The germinal journey follows live animals without additional details, CPH or permanent address; certified "Germinal products" | 12 | frontend, tests | inc-099, inc-105, inc-178, inc-179, inc-181; commodities-and-reason (inc-018); arrival-and-transit (inc-028, 029); overview-and-review (inc-110 to 113, 115); consignment-parties (inc-094, 095, 097) | germinal-products |
| inc-053 | Germinal dates and names: text inputs with a "Choose date" calendar, and their checks | 14 | frontend, tests | inc-052, inc-177, inc-182; design-snagging (inc-206) | germinal-products |
| inc-283 | Germinal transit countries for rail and road | 10 | frontend, tests | inc-182; arrival-and-transit (inc-028, 029) | germinal-products |
| inc-185 | Amend, cancel amendment, copy and delete for germinal | 8 | backend, frontend, tests | inc-182, inc-126; manage-notifications (inc-120, 121, 123, 124, 125) | germinal-products |
| inc-183 | No Additional details step; each germinal species identified with one identifier | 5 | frontend, tests | inc-052, inc-099, inc-105, inc-182, inc-280 (blocked) | germinal-products |
| inc-184 | End to end: bovine semen from create to submitted | 10 | tests | inc-182, inc-183, inc-141, inc-172, inc-283 | germinal-products |

inc-183 cannot start until inc-280 is unblocked, so in practice it waits on templates.

### Blocked

#### Waiting on the INS dashboard's requirements

Sam's 9 October ruling holds the overall home until its requirements are written. Several rows also wait on a second thing, named in the table.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-128 **Review point** | The INS home becomes the overall dashboard | insfrontend, tests, perftests | ins-dashboard |
| inc-132 **Review point** | Action needed page; also waits on the banner design and the outstanding-items rule | insbackend, insfrontend, tests | ins-dashboard |
| inc-133 | Search and sort on Action needed | insbackend, insfrontend, tests | ins-dashboard |
| inc-134 | Action needed glance card; also waits on the banner | insfrontend, tests | ins-dashboard |
| inc-139 | Live animals Summary glance cards; also waits on the banner | backend, frontend, tests | animals-dashboard |
| inc-143 | Status updates cards and page; also waits on the outcome feed | insbackend, insfrontend, tests | ins-dashboard |
| inc-144 | Inspection required page; also waits on the inspection selection feed | insbackend, insfrontend, tests | ins-dashboard |
| inc-145 | Germinal section on the INS home; also waits on the banner | insfrontend, tests | ins-dashboard |
| inc-146 | Plants glance cards; also waits on plants publishing to the INS read model | insfrontend, tests | ins-dashboard |

#### Waiting on the authorities' outcome feed

PIMS Dynamics outcomes, and a real source of completion.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-142 | Cards show the authorities' outcomes | backend, frontend, tests | animals-dashboard |

#### Waiting on the plants backend

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-200 | Plants list tabs, 8 a page, search, sort and filters | plantsfrontend, tests | animals-dashboard |

#### Waiting on the INS address lookup

Address search stays parked until the lookup is real.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-282 | Find an address by postcode | stub, insbackend, insfrontend, frontend, tests | waiting-on-design |

#### Waiting on templates

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-280 | Germinal origin Back link (blocked through req-1740) | frontend, tests | germinal-products |

### Not being built

| Id | What it was | Why |
|---|---|---|
| inc-186 | Germinal template | Deferred with templates |
| inc-194 | Address search layout | Deferred with address search |
| inc-196 | "Use template" on the list | Deferred with templates |
| inc-271 | Needs-action identifier view | Deferred until the banner |
| inc-014 | Commodity search as the trader types | Dropped: the commodity-search ticket's work |
| inc-030 | Transit add and remove with JavaScript | Dropped: design answered 13 November |
| inc-093 | CPH boxes with JavaScript | Dropped: interaction designer, 9 November |
| inc-147 | "Information is missing" card | Dropped: 16 November ruling |
| inc-162 | Templates sort | Dropped with templates |
| inc-189 | Country search announcements | Dropped: 9 November ruling |
| inc-193 | Pickers filtering as you type | Dropped: design, 13 November |
| inc-195 | Dialogs | Dropped: amend and cancel are pages |
| inc-198 | Copy buttons | Dropped: design, 13 November |
| inc-245 | Obligation model | Dropped: 10 November b ruling |
| inc-130, inc-131, inc-140 | List deletion message and frame pieces | Merged into inc-126 |
| inc-191 | Germinal commodity detail | Merged into inc-017 |
| inc-192, inc-244 | Germinal date pieces | Merged into inc-053 (10 November) |
| inc-279 | Plants specification piece | Merged into inc-278 |
| inc-281 | Germinal gross weight page | Merged into inc-099, inc-017 and inc-052 (27 November) |
| inc-270 | Review piece | Merged into overview-and-review's inc-266 (25 November) |

### Check these ordering decisions

- inc-129 lands first: the reframed list is the frame inc-126, inc-176 and the germinal list build on.
- inc-176 is the germinal gate: every germinal row but inc-181 waits on it.
- inc-181 can land early, since it needs only the identification and consignment-parties branches.
- inc-185 lands after the manage-notifications branch, so germinal amend, copy and delete follow the live animals ones.
- inc-183 depends on the blocked inc-280, which holds back inc-184, the end-to-end proof.
- inc-172 depends on Sam's answer to c-496; the default is that it builds.

## Themes

| Theme | To build | Blocked | Depends on |
|---|---|---|---|
| animals-dashboard | 7 | 3 | manage-notifications, overview-and-review |
| ins-dashboard | 0 | 8 | animals-dashboard, germinal-products |
| germinal-products | 20 | 1 | animals-dashboard, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, documents, identification-and-permanent-address, journey-foundation, manage-notifications, overview-and-review, type-question-and-templates |
| waiting-on-design | 0 | 1 | address-book, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, germinal-products, journey-foundation, manage-notifications, overview-and-review, transporters |
| recorded-decisions-plants | 2 | 0 | consignment-parties, journey-foundation, overview-and-review |
| obligation-model | 0 | 0 | none; holds only the dropped inc-245 |

Cross-theme dependencies among the split themes: type-question-and-templates depends on design-snagging, and manage-notifications on overview-and-review.

## For the split branches

Each split theme builds on its own branch. Pick up these changes there before it merges. Every requirement's full statement is in `distil/requirements.json`.

| Theme | Branch |
|---|---|
| type-question-and-templates | feat/NO_JIRA-design-release-2-1-type-question-and-templates |
| journey-foundation | feat/EUDPA-691-design-release-2-1-journey-foundation |
| reference-lists | feat/EUDPA-692-design-release-2-1-reference-lists |
| commodities-and-reason | feat/EUDPA-693-design-release-2-1-commodities-and-reason |
| arrival-and-transit | feat/EUDPA-694-design-release-2-1-arrival-and-transit |
| origin-page | feat/EUDPA-695-design-release-2-1-origin-page |
| overview-and-review | feat/EUDPA-696-design-release-2-1-overview-and-review |
| design-snagging | feat/EUDPA-720-design-release-2-1-design-snagging |
| documents | feat/EUDPA-724-design-release-2-1-documents |
| address-book | feat/EUDPA-707-design-release-2-1-address-book |
| transporters | feat/EUDPA-781-design-release-2-1-transporters |
| identification-and-permanent-address | feat/EUDPA-796-design-release-2-1-identification-and-permanent-address |
| test-hygiene | feat/NO_JIRA-design-release-2-1-test-hygiene: nothing to pick up |
| consignment-parties | feat/EUDPA-805-design-release-2-1-consignment-parties |
| manage-notifications | feat/EUDPA-845-design-release-2-1-manage-notifications |

### type-question-and-templates

| What happened | Requirements | What it says |
|---|---|---|
| New | req-2595 | While a template is created, Commodity details lets a blank field pass and flags only an invalid entered value |
| New, blocked on templates | req-2632, 2633 | Template-mode arrival details: no means of transport needed; template return controls |
| New, blocked on templates | req-2049 | Template question pages: both buttons check an entered answer as the notification page does |
| New, blocked on templates | req-2842 to 2846 | Manage templates: "Help with templates" details, its wording and warning; one list for both categories |
| New, blocked on templates | req-2847 to 2851 | "Make template" from a submitted notification: name page, review, cancel and discard |
| New, blocked on templates | req-2852 to 2856 | Return button goes to the template review; review title, "Save template" and "Delete"; no task list back link; named Change links |
| Changed | req-003 | Type question options in order, no hint, none pre-selected |
| Changed | req-119 | Commodity pages return to check answers, or to the overview when opened from it |
| Changed | req-543 | Template mode skips Upload documents, in the shared journey flow |
| Changed | req-407 | Amending: transporter list shows "Save and return", "Save and continue", "Save and return to overview" |
| Changed | req-408 | From a template review: one "Save and return" and a "Cancel" link, animals only |
| Changed: now blocked until Sam picks templates up again | req-290, 291, 814 to 818, 1291 to 1382 (the adopted ones), 2048, 2052, 2107, 2202 | Rulings of 4 and 9 November |
| Gone: out of scope | req-010, 091, 167, 941, 942, 943, 964, 965, 1299 | Templates parked |

### journey-foundation

| What happened | Requirements | What it says |
|---|---|---|
| New | req-405 | From arrival details, the transporter list's "Save and continue" goes on to Upload documents; from the overview it returns there |
| New | req-1639 | A page opened from the review returns to the review on save, through its own in-page actions |
| New | req-2567, 2589, 2744, 2899 | The status strip shows "Draft", then "<type> - <reference>", such as "Live animals - GBN-AG-26-…" |
| New | req-2909 | With every task complete, Consignment addresses' "Save and continue" opens the overview; "Review and submit" opens the review |
| Changed | req-1612 | With every section complete, Consignment addresses returns to the overview |
| Changed | req-1988 | Plants' opening run ends on check your answers even when incomplete |
| Changed | req-1615 | An overview-opened page returns to the overview on save |
| Changed | req-1403, 2068 | Amending: three amend controls on every page, in live animals and plants |
| Changed | req-782 | Amending: the status line shows "Cancel amend", to the cancel-amendment confirmation page |
| Gone: now a question | req-808, 1934 | c-243, c-487 |
| Gone: out of scope | req-1658 | Weighed with the whole journeys |

### reference-lists

| What happened | Requirements | What it says |
|---|---|---|
| Changed | req-1932, 1769 | Port lists read airports, seaports, then rail, each A to Z; plants' place of landing too |
| Changed | req-1747, 1750, 1752, 1814, 1933 | Stub tests and every captured countries and ports fixture follow the tidied stub |

### commodities-and-reason

| What happened | Requirements | What it says |
|---|---|---|
| New | req-110 | Commodity details: an h2 per commodity "<name> (<code>)" and an h3 per species |
| New | req-2916 | Poultry by rail in transit walked from create to submitted |
| New | req-2573, 2586 | Commodity names come from MDM through reference-data; species read "<common name> (<Latin name>)" |
| New | req-2587, 2588, 2611, 2612 | Numeric inputs ten characters wide; full-width Commodity details; reveal spacing; two-thirds additional details |
| Changed | req-112, 1643 | Number of packages asked only where V4's list names the commodity, and required there |
| Changed | req-1919, 1761 | The k6 walk searches a matching term and walks the main import reason page |
| Changed | req-1642 | Arrival details refuses a save only when the means of transport is missing |
| Changed | req-168 | Main import reason completes on a valid reason and follow-ups |
| Changed | req-2132 | Number of animals above 9,223,372,036,854,775,807 is refused, and the store holds that size |
| Changed, blocked on MDM | req-1656, 2131, 2137 | Poultry-by-rail walk; commodity types from MDM; unweaned for pigs, sheep and goats |
| Gone: out of scope | req-094 to 101 | Reference-list content, MDM's |
| Gone: now a question | req-075, 080, 081 | c-278, c-379 |

### arrival-and-transit

| What happened | Requirements | What it says |
|---|---|---|
| New | req-280 | The arrival date hint's example is today's date |
| Changed | req-327 | Opened from the overview, Save and continue returns there |

### origin-page

| What happened | Requirements | What it says |
|---|---|---|
| New, blocked on EUDPA-774 | req-051 | The origin page's three return controls |
| Changed, blocked on EUDPA-774 | req-2124 | "Save and return to overview" makes the same checks as "Save and continue", plants included |

### overview-and-review

| What happened | Requirements | What it says |
|---|---|---|
| New | req-585 | Section 5 holds "Consignment addresses" with its hint |
| New | req-920 | The declaration shows ticked when already confirmed |
| New | req-2205, 2333 | The amend review heading switches on a never-absent "answers differ" flag on the record |
| New | req-2311, 2331, 2332 | Tests find review cards by GOV.UK structure, not heading words; more review and overview proof |
| New | req-2327 | Uploaded documents is never marked unfinished |
| New | req-2364, 2325, 2365, 2748 | View header: an "Actions" MoJ button menu; Amend a link to its confirmation page; Copy as new its own form |
| New | req-1441 | The amend review ends with "Continue", "Cancel amend" and a warning "Delete" |
| New | req-2524 | Plants shows the "Notification task list" heading |
| New | req-2749 | Status tag grey for Draft, blue for Submitted |
| New | req-2752 | The review uses the full-width column |
| New, blocked on the banner | req-2334 | Outstanding actions through a banner |
| New, blocked on EUDPA-774 | req-837 | Review Change links return to the review |
| Changed | req-791, 800, 854, 332, 372 | Overview regions, transit row, transport labels, stale arrival date, transit completeness |
| Changed | req-830, 831, 832 | "What are you importing?" card, its code and species wording |
| Changed | req-864, 680 | CPH with slashes; parties read back line by line |
| Changed | req-895, 896, 897, 1999, 2000, 2004 | Actions menu order, in animals and plants |
| Changed | req-909 | Submitting records the date, with no outstanding items list |
| Changed | req-950 | Tests for the unproven review, declaration and confirmation paths |
| Changed | req-2138 | Submit needs the main import reason, its follow-ups and certified-for |
| Changed, blocked | req-867 (EUDPA-774); req-910, 2114 (outcome feed) | CPH change returns to the review; "Past" status |
| Gone: now a question | req-849, 850 | c-491 |
| Gone: out of scope | req-375, 1991, 902, 903, 907 | Weighed elsewhere, plants' own, or action-required |

### design-snagging

| What happened | Requirements | What it says |
|---|---|---|
| Changed | req-590, 1964, 558 | Picker "Search" label, plants contact layout, fraud warning with no full stop |
| Changed | req-207, 208, 105, 213 | Selected commodities table columns and naming; identification sections per commodity |
| Changed | req-229, 505 | Identifier length errors use the field's label; "For example, 27/3/2026" |
| Changed | req-267, 057, 128 | Welsh counterparts kept as machine drafts |
| Changed | req-034, 058 | Origin completeness; the origin visual baseline |
| Changed | req-067, 102, 183 | Commodity inset text; unweaned cleared; "Port of exit" |
| Changed | req-108, 163, 178 | Back links on Commodity details, main import reason and additional details |
| Gone: now a question | req-203, 204 (c-337); req-222 (c-335, c-466) | |
| Gone: out of scope | req-184 | Weighed in overview-and-review |

### documents

| What happened | Requirements | What it says |
|---|---|---|
| New | req-483 | The page's opening paragraph |
| New | req-535, 536 | Each row has a named "Remove" link to a confirmation page; no change action |
| New | req-2700 to 2711 | The new "Delete this document?" page: title, inset, summary, warning, buttons, Back, layout, behaviour, return context, no JavaScript needed |
| Changed | req-542, 539 | The page keeps where the trader came from; Save and continue goes to Consignment addresses |

### address-book

| What happened | Requirements | What it says |
|---|---|---|
| New | req-631, 2309 | Address-return handshake tokens; the hand-off works in CDP and both Docker stacks |
| New | req-2356 | Six roles in three groups |
| New | req-1160, 1163, 2780, 2781 | View page rows and roles; "You can only edit this address in the address book" inset; delete page inset |
| New | req-1224, 2787 to 2795 | Edit page: name label, inset, roles question, hints and error |
| New | req-1235, 1246 | Countries from reference-data; "Error: " titles |
| New | req-2796, 2797, 2723, 2724 | "Postcode" labels and field widths |
| Changed | req-1256, 1199, 1209, 1210, 1212, 1859 | Roles on the record; "Branch" option; add page heading and titles; role hints |
| Changed | req-1233, 1117, 1133, 1110 | "Select one"; search placeholder; filter contents; page titles |
| Changed | req-1177, 1178, 1167, 1260, 1277 | Delete page wording; return query; success banners |
| Changed | req-1248, 1249, 1250, 1253, 1275, 1220 | Roles legends and hint; Branch role; edit asks roles; UK fixed for receiving and branch |
| Changed | req-1870 | The k6 address-book scenarios follow the type step and roles |
| Changed | req-1230 | The edit page lays out like the add form |
| Changed | req-634, 635, 670, 646, 643, 660, 664, 655, 656, 678, 1958, 2186 | Journey add-address page: headings, no caption, autocomplete, countries, errors, "Add to your address book", round trip, skipping the type step, same checks |
| Changed | req-1186, 1279 | Welsh counterparts as machine drafts |
| Changed, blocked on the lookup | req-1217, 1218, 647, 648, 650, 651 | Find an address by postcode |
| Gone: out of scope | req-2045, 1225, 1863, 2043, 642 | |

### transporters

| What happened | Requirements | What it says |
|---|---|---|
| New | req-455 | A commercial transporter outside Northern Ireland is refused with a message |
| New | req-2171, 2265, 2266, 2267 | Both forms' fields, labels and section heading |
| New | req-2263, 2272 | Approval status in its own field; a saved transporter comes back ticked |
| New | req-2264, 2283, 466, 2170 | Add in journey mode; works without JavaScript; recoverable save error; one transporter per notification |
| New | req-2268, 2634 to 2637 | 8 a page; "Selected transporter" inset with Change and Remove; ticked choice survives a search |
| New | req-2670, 2676, 2678, 2680, 2681, 2682, 2691 | Address book transporter pages: errors, country select, landing after edit or delete |
| New, blocked on the lookup | req-2641 to 2647 | Private transporter postcode lookup |
| Changed | req-432, 470, 420, 472, 1204, 2042, 2198 | Country list, accessibility, type error, no register page, captions, "Transporter" option, search by approval number |
| Changed, blocked | req-456, 457, 1819 (lookup); req-2172 (approved transporters) | |
| Gone: out of scope | req-397, 398 | Approved transporters parked |

### identification-and-permanent-address

| What happened | Requirements | What it says |
|---|---|---|
| New | req-731, 2742 | Permanent address page wording and layout |
| New | req-2241, 2315 | Refused saves keep typed values; email checked |
| New | req-196, 216, 217, 218 | Inset text; cattle, horses and other mammals' identifiers |
| New | req-2615 to 2619 | "Enter at least one identifier." hint; species labels; "Equine name"; free-text order; single-identifier error |
| Changed | req-199, 234 | Back link; blank animal saves nothing |
| Changed | req-728, 732, 729, 749 | Permanent address section, cards, listing and review rows |
| Gone: out of scope | req-1657 | Weighed with the whole journeys |

### consignment-parties

| What happened | Requirements | What it says |
|---|---|---|
| New | req-617 | A deleted address-book record is never offered or saved |
| New | req-1965, 2486, 2738, 2739 | Plants contact page: 8 a page, wording, heading and buttons |
| New | req-2305, 2306, 2307 | Party edit page: UK only for receiving parties, country error, county autocomplete |
| New | req-1956 | Animals pickers use the full-width column |
| New | req-2300, 2715, 2716, 2717, 2740, 2741 | "Remove" buttons for parties, CPH and permanent address |
| New | req-2719 | The Permanent address section lists every animal |
| Changed | req-612, 613 | Role-less records on every picker; stub records carry roles |
| Changed | req-699, 700, 701, 584 | CPH applicability, section, display; task completeness |
| Changed | req-770, 1624, 2188 | Amend controls and same checks |
| Changed | req-1831 | Germinal add-address uses the same handshake |
| Gone: now a question (c-484) | req-753, 754, 755, 756, 757, 760, 761, 764, 766, 767, 772, 774, 2187 | Contact address |
| Gone: out of scope | req-1622 | No contact page |

### manage-notifications

| What happened | Requirements | What it says |
|---|---|---|
| New | req-1852 | The k6 script reads the list at the set root |
| New | req-1431 | A copy carries roles, addresses, CPH and permanent address |
| New | req-1479, 2054 | Tests assert the new pages and banners, animals and plants |
| New | req-2003, 2055, 2487 | Plants' header offers Copy as new, Amend and Delete |
| New | req-2368 | Amend, cancel amendment and delete work without JavaScript |
| New | req-2861, 2862 | Amend confirmation page summary and sentence |
| Changed | req-1391, 1392, 1487, 1877 | Amend opens a confirmation page; "Yes, amend"; refusals; k6 amend journey |
| Changed | req-1410, 1413, 1414, 1416 | Cancel-amendment page title, "Go back", route, no banner |
| Changed | req-1424 to 1429, 1432, 1435, 1437, 1439 | What a copy carries and does not |
| Changed | req-1443, 1444, 1445, 1451, 2053 | Delete and amend confirmation summary rows |

## Where the requirements came from

| Source | Claims | Held | Refuted | Missed, added | Cited | Requirements backed (in scope) |
|---|---|---|---|---|---|---|
| Sam, 27 November | 28 | 28 | 0 | 0 | 28 of 28 | 82 (78) |
| Ian, 25 November b | 40 | 40 | 0 | 0 | 37 of 40 | 19 (18) |
| Ian, 25 November | 41 | 40 | 1 | 1 | 41 of 41 | 32 (30) |
| Ian, 23 November | 15 | 15 | 0 | 0 | 15 of 15 | 11 (11) |
| Sam, 19 November | 41 | 41 | 0 | 2 | 42 of 43 | 40 (35) |
| Sam, 17 November | 20 | 20 | 0 | 1 | 21 of 21 | 39 (38) |
| Sam, 16 November | 21 | 21 | 0 | 1 | 22 of 22 | 35 (23) |
| Ian, 16 November | 46 | 46 | 0 | 1 | 23 of 47 | 9 (7) |
| Design, 13 November | 31 | 31 | 0 | 0 | 28 of 31 | 23 (11) |
| Ian, 11 November | 40 | 40 | 0 | 1 | 22 of 41 | 57 (36) |
| Sam, 10 November b | 49 | 49 | 0 | 1 | 28 of 50 | 18 (15) |
| Sam, 10 November | 24 | 24 | 0 | 1 | 14 of 25 | 23 (17) |
| Sam, 9 November | 23 | 22 | 1 | 1 | 16 of 23 | 37 (24) |
| Interaction designer, 9 November | 48 | 48 | 0 | 2 | 32 of 50 | 34 (22) |
| Ian, 6 November | 74 | 74 | 0 | 2 | 73 of 76 | 63 (55) |
| Paul, 5 November | 53 | 52 | 1 | 3 | 51 of 55 | 34 (33) |
| Sam, 4 November | 25 | 25 | 0 | 3 | 10 of 28 | 31 (16) |
| Sam, 26 October | 26 | 26 | 0 | 2 | 28 of 28 | 56 (54) |
| Paul, 14 October | 19 | 19 | 0 | 1 | 14 of 20 | 6 (5) |
| Sam, 9 October afternoon | 302 | 301 | 1 | 5 | 271 of 306 | 525 (438) |
| Sam, 9 October templates | 52 | 52 | 0 | 0 | 50 of 52 | 76 (61) |
| Sam, 9 October | 200 | 199 | 1 | 2 | 199 of 201 | 419 (362) |
| Sam, 7 October | 23 | 23 | 0 | 0 | 14 of 23 | 94 (88) |
| V4 data fields | 648 | 646 | 2 | 17 | 651 of 663 | 221 (201) |
| DR1 parity notes | 88 | 88 | 0 | 1 | 89 of 89 | 62 (48) |
| DR1 parity backlog | 481 | 481 | 0 | 64 | 545 of 545 | 173 (140) |
| Prototype source | 2,081 | 2,062 | 19 | 69 | 2,075 of 2,131 | 1,356 (1,191) |
| Prototype traces | 1,592 | 1,581 | 11 | 48 | 1,501 of 1,629 | 1,060 (967) |
| Prototype specs | 1,166 | 1,160 | 6 | 26 | 956 of 1,186 | 718 (650) |
| backend | 494 | 485 | 9 | 23 | 476 of 508 | 169 (147) |
| insbackend | 224 | 224 | 0 | 3 | 227 of 227 | 5 (1) |
| addressbook | 411 | 407 | 4 | 13 | 420 of 420 | 82 (80) |
| referencedata | 199 | 197 | 2 | 17 | 214 of 214 | 40 (30) |
| stub | 580 | 580 | 0 | 6 | 586 of 586 | 20 (17) |
| frontend | 2,826 | 2,779 | 47 | 89 | 2,734 of 2,868 | 1,245 (1,167) |
| insfrontend | 957 | 948 | 9 | 38 | 943 of 986 | 320 (304) |
| plantsfrontend | 2,701 | 2,663 | 38 | 105 | 2,764 of 2,768 | 378 (325) |
| tests | 2,434 | 2,386 | 48 | 69 | 2,352 of 2,455 | 936 (856) |
| perftests | 215 | 214 | 1 | 15 | 224 of 229 | 36 (29) |
| Animals fit traces | 1,948 | 1,921 | 27 | 81 | 1,997 of 2,002 | 781 (741) |
| INS fit traces | 250 | 248 | 2 | 27 | 264 of 275 | 103 (97) |
| End-to-end traces | 1,463 | 1,448 | 15 | 70 | 1,511 of 1,518 | 781 (727) |
| **Total, 42 sources** | **21,999** | **21,754** | **245** | **811** | **21,608 of 22,565** | |

- No source has under a tenth of its working set cited. The lowest is Sam's 4 November ruling, 10 of 28.
- insbackend backs 5 requirements, only one in scope.
- Strongest: req-594, req-608, req-1079, req-1256 and req-1391 rest on 11 sources each. 20 more rest on 10: req-025, 040, 068, 134, 144, 150, 234, 509, 564, 603, 611, 727, 892, 1032, 1046, 1052, 1108, 1259, 1410, 2130.
- 416 in-scope requirements rest on one source: frontend 103, backend 63, plantsfrontend 61, tests 36, prototype source 33, insfrontend 33, Sam 9 October 17, addressbook 16, referencedata 11, prototype specs 7, prototype traces 6, Sam 9 October afternoon 6, end-to-end traces 5, V4 3, stub 3, animals fit traces 3, and 1 or 2 each for the rest.
- Inferred only, in scope: req-060, 061, 062, 063, 064, 267, 373, 957, 1351, 1372, 1747, 1748, 1752, 1851, 1856, 1880, 1902, 1903, 1905, 1927, 1928, 2213, 2257, 2576, 2803, 2805, 2855.
- Resting on a gap only: req-2695. On an inference and a gap only: req-950, 1184, 1300, 1699, 1894, 2036, 2863.

### Totals

| Count | Number |
|---|---|
| Requirements | 2,830 |
| Adopted | 2,330: 1,599 exist, 436 new, 295 change |
| Questions | 89 |
| Out of scope | 411 |
| Conflicts | 508: 462 settled by precedence, 46 questions |
| Areas | 32 |
| Requirements in this backlog's rows | 313 |
| Requirements in the split themes | 442 |

## Out of scope

411 requirements are not built.

| Why | Count | Requirements |
|---|---|---|
| Templates, parked | 18 | req-010, 091, 167, 819, 941, 942, 943, 964, 965, 1038, 1299, 1846, 2623, 2650, 2651, 2718, 2732, 2743 |
| Nothing action-required until the banner is designed | 12 | req-902, 903, 904, 905, 906, 907, 908, 939, 940, 2111, 2113, 2776 |
| Design has answered by dropping it | 12 | req-348, 349, 353, 354, 592, 711, 712, 713, 1393, 1951, 1986, 2039 |
| The 26 November design no longer shows it | 14 | req-649, 789, 803, 1083, 1216, 1285, 1622, 1863, 1864, 1957, 2043, 2044, 2310, 2864 |
| The separate commodity-search ticket's work | 6 | req-1782, 2229, 2230, 2231, 2583, 2584 |
| Approved transporters, parked | 5 | req-396, 397, 398, 2173, 2284 |
| Reference-list content, handed to MDM | 22 | req-026, 027, 028, 029, 065, 093, 094, 095, 096, 097, 098, 099, 100, 101, 302, 303, 1766, 1767, 1818, 2384, 2594, 2928 |
| Search mechanics the real component replaces | 7 | req-017, 020, 621, 622, 623, 624, 1908 |
| Other notification types | 7 | req-059, 1668, 1764, 1921, 1922, 1923, 1924 |
| URL paths, field names, data shapes and owners the prototype does not decide | 23 | req-271, 477, 626, 821, 1016, 1128, 1341, 1342, 1355, 1357, 1362, 1366, 1430, 1829, 1855, 1879, 1887, 2593, 2613, 2622, 2736, 2783, 2836 |
| Prototype mechanics, seed data and defects | 54 | req-189, 190, 378, 383, 410, 419, 438, 469, 471, 625, 750, 751, 776, 946, 947, 1017, 1018, 1106, 1189, 1286, 1287, 1289, 1384 to 1389, 1486, 1665, 1666, 1667, 1681, 1682, 1742, 2196, 2197, 2204, 2649, 2652, 2731, 2733, 2751, 2764, 2767, 2782, 2837 to 2841, 2857, 2858, 2927 |
| Set aside by a conflict, a ruling or an accessibility duty | 26 | req-033, 627, 629, 642, 952, 959, 1003, 1035, 1087, 1097, 1104, 1107, 1150, 1170, 1225, 1290, 1847, 1920, 2045, 2206, 2207, 2308, 2369, 2624, 2747, 2750 |
| Duplicates | 3 | req-2103, 2366, 2386 |
| No longer supported by the evidence | 6 | req-1508, 1532, 1534, 1574, 1583, 2214 |
| The DR1 parity backlog is not a source of requirements | 8 | req-192, 369, 555, 1031, 1190, 1288, 1734, 2082 |
| Germinal data the V4 change log de-scopes | 5 | req-1802, 1803, 1804, 1805, 2190 |
| Plants keeps its own, or has parked it | 31 | req-1925, 1926, 1955, 1962, 1972, 1981 to 1985, 1991, 1994, 2025, 2047, 2056, 2059, 2062, 2063, 2064, 2075, 2095, 2096, 2104, 2108, 2110, 2116, 2129, 2168, 2192, 2323, 2518 |
| Weighed in another area | 56 | req-184, 198, 266, 270, 301, 375, 482, 552, 949, 1028, 1029, 1030, 1564, 1657, 1658, 1765, 1778, 1779, 1816, 1817, 1961, 2038, 2058, 2060, 2081, 2106, 2115, 2117, 2118, 2119, 2121, 2160, 2182, 2191, 2221, 2235, 2258, 2297, 2301, 2340, 2343, 2350, 2378, 2517, 2519, 2549, 2553, 2555, 2556, 2560, 2714, 2777, 2778, 2871, 2890, 2929 |
| Suite mechanics and gaps in the evidence | 14 | req-1609, 1669, 1670, 1671, 2238, 2302, 2345, 2351, 2371, 2543, 2699, 2765, 2930, 2931 |
| The specification document, not the service | 5 | req-2161, 2167, 2181, 2185, 2211 |
| Welsh sign-off | 7 | req-376, 475, 554, 948, 2418, 2592, 2698 |
| Page sign-off is its own reviewed change | 4 | req-2324, 2339, 2370, 2754 |
| Nothing designed, or nothing to build | 8 | req-191, 1883, 2341, 2344, 2462, 2889, 2948, 2949 |
| Problems for the owning teams | 58 | req-193, 377, 553, 1105, 1154, 1191, 1283, 1481 to 1485, 1538, 1555, 1556, 1563, 1573, 1575, 1578, 1582, 1584, 1587, 1591, 1594, 1602, 1603, 1717, 1718, 1724, 1726, 1730, 1733, 1873, 2109, 2292, 2295, 2296, 2349, 2377, 2381, 2382, 2383, 2387, 2477, 2478, 2479, 2515, 2516, 2541, 2551, 2667, 2735, 2835, 2888, 2891, 2898, 2937, 2941 |

Among the problems for owning teams:
- req-1482, req-1556, req-1730, req-1154 and req-2292 are security or platform findings for the owning teams. The detail is in the programme's local files.
- req-2941 is a gap in security scan coverage, for the tests repo's owners. The detail is in the programme's local files.
- req-2937 is a gap in accessibility scan coverage.

## Terms used

| Term | Meaning |
|---|---|
| DR2.1 | Design Release 2.1, the prototype pinned at its 26 November commit |
| DR1 | Design Release 1 and its parity judgements |
| V4 | The Live Animals and Germinals Data Fields page in Confluence |
| MDM | Master data management, which owns reference-list content |
| Set | One journey in a frontend: live animals, germinal products, or plants |
| Overview | A notification's task list page, once called the hub |
| Review | The check your answers page before the declaration |
| Split theme | A theme built on its own branch and backlog, merged before the themes here |
| Review point | A row a person checks before the build goes on |
| Blocked | Adopted, but waiting on something outside this programme |
| Exists | Already in the services; nothing to build |
| Same checks | Every save button on a page makes the checks "Save and continue" makes |
| The banner | The outstanding-actions banner, still to be designed |

