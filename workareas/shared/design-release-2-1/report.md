## Design Release 2.1: backlog report

## Summary

- The backlog holds 68 increments: 40 ready to go and 12 blocked. The blocked rows wait on the INS front door dashboard's requirements (6), the authorities' outcome feed (3), the plants services publishing to the INS read model (1), the plants backend (1) and the owner picking templates up again (1). A further 14 rows are dropped, one is deferred and one is merged into another.
- It builds the germinal products set end to end, reframes each animals notification list in place with plants' list beside it, builds amend, cancel amendment, copy as new and delete in both journeys, and brings the plants set's own records up to date.
- 45 questions are open, all 45 challenged against precedence and every ruling. Precedence settled none of them this run. Each question lists the default that is built if nobody answers.
- Before building: correct the goal in `sources.json` (see step 0). 19 of the 40 ready rows land after rows on split branches, so those branches merge first.
- 10 adopted requirements wait on somebody outside the loop: the INS address lookup becoming a real feature, and the EUDPA-774 save and continue work merging.
- Eleven split branches have work to pick up: `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, `feat/EUDPA-691-design-release-2-1-journey-foundation`, `feat/EUDPA-693-design-release-2-1-commodities-and-reason`, `feat/EUDPA-694-design-release-2-1-arrival-and-transit`, `feat/EUDPA-695-design-release-2-1-origin-page`, `feat/EUDPA-696-design-release-2-1-overview-and-review`, `feat/EUDPA-724-design-release-2-1-documents`, `feat/EUDPA-707-design-release-2-1-address-book`, `feat/EUDPA-781-design-release-2-1-transporters`, `feat/EUDPA-796-design-release-2-1-identification-and-permanent-address` and `feat/EUDPA-805-design-release-2-1-consignment-parties`.

## Before you build: step 0

**Correct the goal in `sources.json`.** The rulings have moved past it on eight points. As the rulings leave it, the goal reads:

- Bring the real GB notification services up to Design Release 2.1 in look and feel: content, wording, layout, components and question order.
- In scope: the GBN-AG animals notification as two sibling sets in the animals frontend, live animals and germinal products, each with its own notification list, and the INS address book. **Changed: templates are out.**
- Where a real service differs in look and feel, it changes to match. An owner ruling, a DR1 judgement, the V4 data fields page on data, or a real constraint overrides that.
- Real constraints are persistence, validation, authentication, cross-service behaviour, accessibility and **new: the size of a real organisation's address book**. Organisations in test environments hold thousands of addresses, which the prototype cannot express, so every address book list and every address picker pages. No requirement serves or shows an organisation's addresses unpaginated.
- **New: templates are parked.** The 4 November ruling de-prioritises them and leaves their rows unbuilt with no condition named for their return; the interaction designer dropped them for now on 9 November; the 9 November owner ruling calls Design Release 2.1's templates concept work. Templates are create, read, update and delete work that is built when the parking lifts, not work that goes ahead now. The templates sort is dropped outright rather than waiting on design. No list offers a "Use template" button, the INS home offers "Create new" alone, no frontend gains a Templates navigation item, and no template review, template section or "Save template" button is built. Templates are a fifth adopted-but-blocked area, waiting on the owner's decision and re-distilled once he makes it. Its one exception is the notification type question page, which the 4 November ruling splits into its own theme and sends ahead.
- **Changed: design has answered most of the waiting-on-design questions, and an answered question is not a parked increment.** Where design has answered, the JavaScript-only addition is dropped rather than held. The search buttons and the live region code prefix were already picked up with design snagging. Amend and cancel amendment are pages, not dialogs. The county parish holding boxes follow the GOV.UK date input with no JavaScript on top. The germinal date calendars keep the Ministry of Justice date picker and are built with the germinal identification dates, germinal products following live animals rather than being a design question. Transit countries keep the "Add country" button and a page-reload Remove, with no "Added" or "Removed" announcement. The import reference numbers get no Copy buttons. The country search keeps the accessible autocomplete's own announcements. Only questions design has not answered stay in the waiting-on-design theme.
- **Changed: no list filters as the trader types, in any journey.** A search runs when the trader presses Search or Enter and the server re-renders. That covers the party pickers, the place of origin picker, the address book list and the transporter list. A return to the idea re-enters as a new question, not as a waiting-on-design row.
- **Changed: reference-list content leaves the backlog rather than waiting on MDM.** A reference list is MDM's content, reaching the service through `trade-imports-reference-data`, never edited in code and never a reason to block a row. The commodity catalogue's content, germinal included, is out of scope as an MDM concern in `deferred.md`, as the live-animals catalogue's content already was. Only the integration that brings MDM's lists through reference-data is blocked, on MDM itself.
- **Changed: the commodity search is another ticket's work.** The 10 November ruling hands commodity search, live and germinal, to a separate ticket, whose design call waits on that ticket being implemented and does not come back here. A "cattle" search listing germinal codes belongs to that ticket too, so moving today's germinal lines out of the live-animals catalogue is no longer part of this programme. Only the germinal set's own pages go ahead, on the lines the catalogue holds.
- **Changed: transporter management is decided and goes ahead in the address book.** The address book is the system of record: a transporter is its own record in its own `transporters` collection, holding no roles and a private-or-commercial type instead, reusing the service's organisation scoping, soft-delete, locking and Standard Address Block validation. Adding one mid journey uses the address book hand-off already built for addresses. A commercial transporter's country is forced to Northern Ireland with no reference-data lookup; a private transporter keeps its choice. The Transporter tab, the address type question, the add pages, the list, its search and its paging all go ahead, and the unused register page is already removed. **Parked:** approved transporters, including the eight records the service ships, which stay exactly as they are; which approved-transporter list the commercial ones come from stays open. The commercial transporter's Northern Ireland address search still waits on the INS address lookup.
- **Changed: address search is parked as concept work**, by the 9 November ruling, rather than merely waiting on the lookup. The 13 November design ruling leaves the search-only layout deferred with it. Address search does not filter as the trader types in either frontend: the trader presses Search or Enter. Until it is planned, every add-address page offers manual entry only, with all its fields shown.
- **New: no new notification status is added in this programme.** The statuses stay DRAFT, SUBMITTED, AMEND and DELETED. "Submitted action required" is withdrawn and "Completed" stays out until a real source of completion exists. Nothing action-required is shown on a notification or on a list until the outstanding-actions banner the dashboard designs introduce is agreed, and the animals backend stops storing the outstanding items.
- **New: the address book stores roles, not an address type.** An address holds the roles it can play on a notification, at least one, from place of origin, consignor, place of destination, consignee, importer and branch address. The address type is the INS front door's grouping of those roles, worked out from them rather than stored.
- **New: the prototype's own routing glue is no better a basis for data than its `app/data` files.** Neither `app/routes.js` nor `app/data` decides what data a notification captures, which values a field offers, a role vocabulary, or which commodities a rule covers. Every piece of data is either MDM content reaching the service through reference-data, or V4-specified.
- **New: the 17 November wording decisions apply wherever the answer appears.** The exit port is "Port of exit" everywhere; the arrival date is "Arrival date at port of entry" everywhere. The notification card's own arrival-date label is still open (c-421).
- Adopted but blocked, each re-distilled once unblocked: address search (parked as concept work, and waiting on the INS address lookup); the MDM commodity integration through reference-data; the INS dashboard's summary information; templates; and the return to the overview on save in live animals and plants, blocked until the EUDPA-774 save and continue work merges to the animals frontend's main.
- The rest of the goal stands as written: plants takes the same change in the same increment wherever it has the same page or behaviour and keeps its own questions and data; every page works fully without JavaScript; a behaviour is built with GOV.UK Frontend first, then another tested government library; confirmations stay pages; V4 decides the data for both sets and outranks every DR1 judgement with no exception; each notification list stays in its own frontend and is reframed in place; architecture stays the real services'.

**Split branches merge first.** 36 of the 68 rows carry an `externalDependsOn` on a split branch's workarea, 19 of them ready to go. The build loop cannot land those until the branch they name has merged.

## Decisions the pipeline made

**Repos (10).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|
| `frontend` | trade-imports-animals-frontend | The GBN-AG journey, live animals and germinal products as sibling sets, and each set's own notification list |
| `backend` | trade-imports-animals-backend | The notification record, its validation, lifecycle, list query and GBN-AG publishing |
| `insfrontend` | trade-imports-ins-frontend | The INS front door: the home, the type question, the address book and the journey hand-off |
| `insbackend` | trade-imports-ins-backend | The read model behind the INS dashboard's counts and drill-downs |
| `addressbook` | trade-imports-address-book | The system of record for addresses and, since 6 November, for transporters |
| `referencedata` | trade-imports-reference-data | The reference lists the journey reads, the port traffic type that orders the port list included |
| `stub` | trade-imports-stub | The address lookup stub and the MDM country and port fixtures |
| `tests` | trade-imports-ins-tests | Every service's end-to-end, accessibility and security suite |
| `perftests` | trade-imports-performance-tests | The k6 scripts that request the live-animals set root and the INS home |
| `plantsfrontend` | trade-imports-plants-frontend | Shares the journey engine, overview, review, declaration, confirmation, amend, delete, party pickers and notification list, and takes the same change in the same increment |

Read but not changed: the Design Release 2.1 prototype (`~/git/defra/defra-design/GB-notification-service` at commit 04a073b), its traces and driving specs, the DR1 parity notes and backlog, and the V4 Live Animals & Germinals Data Fields Confluence page.

**Which source wins a disagreement**, highest first:

1. Ian's ruling of 25 November 2026 (pagination is kept everywhere)
2. Ian's ruling of 23 November 2026 (the pickers page at eight)
3. Sam's ruling of 19 November 2026 (the overview and review engineering review)
4. Sam's ruling of 17 November 2026 (the review page's wording)
5. Sam's ruling of 16 November 2026 (plants' customs code; no new status)
6. Ian's ruling of 16 November 2026 (no EXPORTER role)
7. Design's ruling of 13 November 2026 (transit countries, address search, copy buttons)
8. Ian's ruling of 11 November 2026 (what settles data: V4 over every DR1 judgement)
9. Sam's second ruling of 10 November 2026 (obligation model, return links)
10. Sam's ruling of 10 November 2026 (germinal products, commodity search)
11. Sam's ruling of 9 November 2026 (country search announcements; address search parked)
12. The interaction designer's ruling of 9 November 2026 (the waiting-on-design answers)
13. Ian's ruling of 6 November 2026 (transporter management)
14. Paul's ruling of 5 November 2026 (what the address book stores)
15. Sam's ruling of 4 November 2026 (the type question split; templates parked)
16. Sam's ruling of 26 October 2026 (Save and return makes the same checks)
17. Paul's ruling of 14 October 2026 (County on the add-details step)
18. Sam's afternoon ruling of 9 October 2026
19. Sam's templates ruling of 9 October 2026
20. Sam's ruling of 9 October 2026
21. Sam's ruling of 7 October 2026
22. The V4 Live Animals & Germinals Data Fields page (`confluence:6497338582`, version 210)
23. The DR1 parity notes
24. The DR1 parity backlog
25. The Design Release 2.1 prototype source
26. The Design Release 2.1 prototype traces
27. The Design Release 2.1 prototype specs
28. trade-imports-animals-backend
29. trade-imports-ins-backend
30. trade-imports-address-book
31. trade-imports-reference-data
32. trade-imports-stub
33. trade-imports-animals-frontend
34. trade-imports-ins-frontend
35. trade-imports-plants-frontend
36. trade-imports-ins-tests
37. trade-imports-performance-tests
38. The animals frontend's fit traces
39. The INS frontend's fit traces
40. The end-to-end traces

## Questions for Sam

45 questions were challenged against precedence and every ruling. None was settled and none was found to wait on a blocker, so all 45 remain. Each lists the default that will be built if nobody answers.

### 1. What does the high-risk plants notification list's h1 say?

- **Default:** "Plants", the prototype's own label for plants notifications, with a Welsh machine draft that ships only after translator sign-off.
- **Affects:** req-2029; inc-129, which reframes the live animals list and gives plants' list the same frame.
- **Why it is open:** The frame names the category in the h1, but no source names plants' category for a list heading. Design Release 2.1 has no plants list.

### 2. In template mode, must a journey page keep the notification's required-answer checks?

- **Default:** Live animals and germinal products template pages keep the notification's checks. A malformed answer is refused, and an answer the page requires is refused with an error naming each one, whichever save button the trader uses, with what they entered kept. What Design Release 2.1 already does differently stands: no arrival date is asked, the template name is optional, and sections may be left unanswered. Plants has no template mode.
- **Affects:** req-2049; inc-186, and the parked templates rows on `feat/NO_JIRA-design-release-2-1-type-question-and-templates`.
- **Why it is open:** The 26 October ruling settles half of it: both save buttons make exactly the same checks. How high the bar is in template mode is still open, because the templates ruling hedges and the design never shows a page's checks in template mode. The checks are chosen by the mode in one place, so an answer changes them without touching the pages.

### 3. Does a template hold every answer a notification holds?

- **Default:** In both animals sets a template stores its answers in the notification's own shape on the same pages, with no separate template data model. It never asks for or holds the arrival date or time (req-1345) or documents (req-1334). A live animals template holds the transit countries as answered and seeds them, because the design's template page offers their Change link. A germinal template holds whatever the germinal pages ask, less the arrival date. Plants has no templates.
- **Affects:** req-1344, req-1345, req-2048, req-2112; inc-186 and the parked templates rows.
- **Why it is open:** The templates ruling hedges, its own claims leave the differences between template mode and a notification open, and Design Release 2.1 contradicts itself on transit countries by offering a Change link for answers it never saves.

### 4. Does the region of origin code come from a list of regions, or stay a code the trader types?

- **Default:** It stays a code the trader types into the five-character box after the country prefix, in both sets. No region list is built and no reference-data work is raised.
- **Affects:** req-2127; the origin page rows on `feat/EUDPA-695-design-release-2-1-origin-page`.
- **Why it is open:** The V4 page's source cell reads two ways and nothing ranks them: either the field's MDM source is only the country prefix, or the regions themselves come from a list.

### 5. Does the live-animal Number of packages allow up to 10 digits, or at most 10 packages?

- **Default:** The digit reading. The field is capped at the largest whole number the notification stores, 2,147,483,647, which is ten digits, with an error naming that figure on that species' field. No cap of 10 packages is built, because it would refuse an example the specification itself gives.
- **Affects:** req-2133; the Commodity details rows on `feat/EUDPA-693-design-release-2-1-commodities-and-reason`.
- **Why it is open:** The same table writes "max 9,223,372,036,854,775,807" as a value for the number of animals, and the germinal quantity row's "max 1,000" was read as a value too, while this row's own examples of 25 and 5000 can only be digit counts.

### 6. What is the agreed maximum number of species a trader may choose under one commodity?

- **Default:** No maximum is enforced, as today, so a trader may choose every species a commodity offers. A cap and its error are built only once the number is given.
- **Affects:** req-2134; the commodity selection rows on `feat/EUDPA-693-design-release-2-1-commodities-and-reason`.
- **Why it is open:** The specification states that a maximum exists but not what it is, and no ruling gives a number.

### 7. Does one number of animals and one number of packages cover every species under a commodity?

- **Default:** Each chosen species keeps its own number of animals and number of packages, as today and as Design Release 2.1 shows. The real service's commodity line is one commodity plus one species, and each line's species travels downstream on its own. The germinal set's per-species packages and total gross weight stay per species for the same reason.
- **Affects:** req-2135; the Commodity details rows on `feat/EUDPA-693`, and inc-017 and inc-177 in germinal products.
- **Why it is open:** The specification gives the level, "Commodity Level", but never says what a commodity line holds. The two readings build different pages.

### 8. Must the exit date be typed with a two-digit day and month?

- **Default:** The field keeps the hint "For example, 27/3/2026" and accepts a day or month with or without a leading zero, because the accepted date picker fills it that way. V4's DD/MM/YYYY is read as naming the day, month and year order rather than a stricter digit count.
- **Affects:** req-2139; the main import reason rows on `feat/EUDPA-693-design-release-2-1-commodities-and-reason`.
- **Why it is open:** The 11 November ruling puts the format with V4 and how the field reads with the prototype. That splits the hint from the accepted form and leaves the field refusing the text its own picker writes. Neither reading of "DD/MM/YYYY" is ranked above the other. If the strict reading is chosen, the hint becomes 27/03/2026 and the picker is configured to write leading zeros.

### 9. Does the germinal products set ask for an exit date?

- **Default:** The germinal set offers only Internal market and Transit, asks for no exit date and builds nothing for one. The live-animals set keeps its own exit date question.
- **Affects:** req-2141; inc-024.
- **Why it is open:** The copy rule carries every live-animals page into the germinal set, and the data page's germinal section says nothing about which live-animal fields the set drops, while Design Release 2.1's germinal journey never reaches the reason that asks for one.

### 10. Does a notification still capture a microchip identifier?

- **Default:** The microchip field stays exactly as it is today and as Design Release 2.1 shows it, first on a cat, dog, ferret or horse panel.
- **Affects:** req-2153; the identification rows on `feat/EUDPA-796-design-release-2-1-identification-and-permanent-address`.
- **Why it is open:** V4 outranks the prototype on which data a notification captures, and its identifier table specifies six fields without the microchip. But it never says the microchip is out of scope, and it de-scopes a field explicitly when it means to, as it did for the wing ring. Silence will not carry a user-visible field away.

### 11. Must every animal of every selected species carry at least one identifier before submission?

- **Default:** The per-animal bar the frontend now applies stands. Every animal of every commodity line that is identified needs a saved record holding at least one identifier, and the hub's Identification details row shows Complete on that same bar.
- **Affects:** req-248, req-249; the identification rows on `feat/EUDPA-796` and the hub rows on `feat/EUDPA-696-design-release-2-1-overview-and-review`.
- **Why it is open:** The 9 October ruling outranks the policy page and accepted the looser gate on the footing that it was no change. That footing has gone: the service has since moved to the per-animal bar, and the ruling expressly does not say how many records a notification needs. The germinal twin went the policy page's way (c-277). Only the owner can say whether the ruling was meant to fix the looser gate.

### 12. Does "what a trader typed is never dropped" reach the identification page's own save buttons?

- **Default:** Every save reads only the panel it owns, as the frontend now does and the prototype shows. A panel save checks and saves that panel alone, and the page's own buttons save the panels that take a single animal.
- **Affects:** req-203, req-204; the identification rows on `feat/EUDPA-796`.
- **Why it is open:** The 26 October ruling ranks above the prototype and states the principle in general terms, while its words reach only the Enter key. Answering it the other way would have each save sweep up every panel holding a value.

### 13. What does pressing Enter do in a single-animal panel, or outside any panel?

- **Default:** Enter in a single-animal panel, and in any field outside a panel, submits the page as "Save and continue". Only a panel for several animals saves through its own panel save.
- **Affects:** req-2159; the identification rows on `feat/EUDPA-796`.
- **Why it is open:** The ruling settles the panel for several animals, which is adopted (req-2158), and says nothing about the rest of the page.

### 14. Is "Journey log" still a document type a trader may choose?

- **Default:** Journey log stays among the document types. The business's October list names it, Design Release 2.1 offers it and the service offers it today.
- **Affects:** req-499; the document type rows on `feat/EUDPA-724-design-release-2-1-documents`.
- **Why it is open:** The V4 page contradicts itself. Its change log de-scopes Journey Log in May 2026, and its document type list, replaced in October 2026, still names it. Precedence settles a disagreement between sources, never within one.

### 15. Does the notification submitted page's ITAHC rule reach germinal products and plants?

- **Default:** The germinal copy of the confirmation page names a missing ITAHC on the same condition as the live-animals page, because the set copies that page and carries the same certificate. Plants' confirmation gains no outstanding-items list and no certificate item, because plants has no ITAHC.
- **Affects:** req-929; inc-105 and inc-182 in germinal products, and plants' confirmation rows on `feat/EUDPA-696`.
- **Why it is open:** The 26 October ruling gives the rule for the live-animals page and leaves the other sets unstated.

### 16. Does the same-checks rule reach plants' check answers, which collects no answers?

- **Default:** Plants' check answers keeps its Save and return to the overview whatever is outstanding. The rule is applied to the pages that collect answers, where an error can be shown against each one, and the review page keeps naming what is outstanding and refusing Continue.
- **Affects:** req-2010; the plants review rows on `feat/EUDPA-696-design-release-2-1-overview-and-review`.
- **Why it is open:** The 26 October rule is written for pages that collect answers and show an error against each one, and the review page collects none.

### 17. Should the address book's delete banner lower-case the rest of the address's name?

- **Default:** The banner shows the name as the user entered it.
- **Affects:** req-2194; the address book rows on `feat/EUDPA-707-design-release-2-1-address-book`.
- **Why it is open:** The prototype wins on copy, so the wording is adopted either way. But lower-casing a name the user typed changes how their own data is shown, and the prototype's reason is not visible: its demonstration names are all Title Case, while the real book holds names such as "Alpine Dairy GmbH" that it would mangle.

### 18. Is the "Filter addresses" disclosure open when the list loads with a search or Type applied?

- **Default:** It is open when the request carries a search or a Type, and collapsed otherwise.
- **Affects:** req-2195; the address book list rows on `feat/EUDPA-707`.
- **Why it is open:** "Collapsed when the list loads" reads two ways once the filter is submitted to the server, and they build different pages. The prototype never reloads a filtered list, so nothing ranks them.

### 19. Must an address in a country with no postal system still give a postcode, and is 12 characters enough?

- **Default:** Every address needs a postcode or Zip code, whatever country is chosen, free text of at most 12 characters. No country is exempted and no limit is raised.
- **Affects:** req-2200; the address book rows on `feat/EUDPA-707` and the party add rows on `feat/EUDPA-805-design-release-2-1-consignment-parties`.
- **Why it is open:** Every source marks the postcode mandatory, and the germinal data fields, which outrank the prototype on data, flag their own gap rather than answering it.

### 20. How far do the checks on both save buttons reach?

- **Default:** Both buttons make the same checks, and those checks are the page's own hard stops together with any answer the data specification marks mandatory to proceed. An answer that is only mandatory to submit can still be left blank on either button, and the overview's statuses and the review page's submit hold it back. On the pages the business analyst named, upload documents refuses a part-filled document, and origin and main import reason refuse on either button whatever they refuse on "Save and continue". On the consignment addresses page and the party pickers nothing new is refused: the page saves and moves on with sections still empty, in live animals, in the germinal copy and on plants' pages, and a party picker saves with nothing chosen and no error. Completeness is still enforced by the overview task status and the review page's "Complete consignment addresses" error, and a picker still refuses an address the organisation's book does not hold.
- **Affects:** req-581, req-603, req-1625, req-1641; inc-244, and every page with both buttons on the `commodities-and-reason`, `consignment-parties`, `documents`, `origin-page` and `overview-and-review` branches.
- **Why it is open:** "Exactly the same checks as Save and continue" keeps each page's existing hard stops and adds nothing. "An error message for each answer that is missing or not valid" would refuse a page whenever any mandatory answer is blank, which would stop a trader leaving a part-filled page at all. Both readings are the top-ranked source's own words, so precedence ranks neither.

### 21. Which environments must the INS-to-journey hand-over be proved in?

- **Default:** Each service takes the other's address from its own configuration with no hard-coded host or port, so the hand-over works unchanged in the local Docker stack and the CI Docker stack, signing in through the Defra ID stub, and in CDP dev and test, signing in through Defra ID as each environment configures it. The end-to-end suite proves it in the two Docker stacks, and no new check is built for CDP.
- **Affects:** req-2217; the type question rows on `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, and inc-264.
- **Why it is open:** The ruling names CDP as a whole and names neither the environment nor any evidence, while the Docker stacks sign the trader in through the stub and CDP signs them in through Defra ID.

### 22. How far does the separate commodity-search ticket reach?

- **Default:** The narrow reading. Only the as-you-type design call, the joined search button and the germinal-codes search leave this programme, and the search's wording, its result order and its chips' Remove names follow Design Release 2.1 here.
- **Affects:** req-075, req-081, req-2225; the commodity search rows on `feat/EUDPA-693-design-release-2-1-commodities-and-reason`.
- **Why it is open:** The 10 November ruling names three things but says "commodities search" generally and names no ticket. A narrow reading leaves the search's wording, order and labels in this programme; a wide one hands the whole control over. The 9 October afternoon ruling that how a search list reads follows the prototype pulls the other way. Should the owner read it widely, those three rows go out of scope and nothing here changes the commodity search.

### 23. Do the destination country and port of exit questions keep the accessible autocomplete?

- **Default:** Both keep the accessible autocomplete exactly as the animals frontend configures it today, with its "No countries found" and "No ports found" messages and its plain-select fallback without JavaScript. Only the placeholder, the option labels and the order follow the prototype.
- **Affects:** req-2237; the main import reason rows on `feat/EUDPA-693` and the arrival rows on `feat/EUDPA-694-design-release-2-1-arrival-and-transit`.
- **Why it is open:** The 9 October afternoon ruling's plain-select clause reads two ways: that this programme makes no component change, which leaves the autocomplete a follow-on ticket has since added; or that both questions are plain selects, which would take out a built, accessible, tested component with a no-JavaScript fallback.

### 24. Where should a port with a missing or unexpected MDM traffic value sit in the port of entry list?

- **Default:** Such a port is listed in its own group after the rail ports, A to Z by name, so no port MDM returns is left out. Airports, seaports and rail keep their order ahead of it.
- **Affects:** req-2259; the reference list rows on `feat/EUDPA-692-design-release-2-1-reference-lists` and the arrival rows on `feat/EUDPA-694`.
- **Why it is open:** The ruling names three groups and says MDM's traffic field gives each port's type, but never says what becomes of a port whose traffic is blank or holds some other value, and Sam has not confirmed the field is the flag he asked about.

### 25. Is a commercial transporter's country stored as XI, or as the code the address book already uses?

- **Default:** Keep what is built. The address book stores the fixed country as GB-NIR, its private counterpart as GB, and both the address book and the journey show it as "Northern Ireland". Nothing is rewritten.
- **Affects:** req-2275; the transporter rows on `feat/EUDPA-781-design-release-2-1-transporters`.
- **Why it is open:** The 6 November ruling reads two ways and nothing ranks them. Read as a value, it names XI and the records already stored as GB-NIR are rewritten. Read as a decision between an MDM lookup and a forced code, it settles only that the code is forced, and which code the service holds is the real service's own call. No trader sees either code.

### 26. Which service refuses a commercial transporter whose country is not Northern Ireland?

- **Default:** Both. The add form fixes the country, posts it in a hidden field and refuses a tampered, empty or absent value (req-455), and the address book refuses such a transporter on write, because it is the system of record and its API can be called directly (req-2277).
- **Affects:** req-2277; the transporter rows on `feat/EUDPA-781`.
- **Why it is open:** The ruling names the add form's hidden field and holds the code and its display name as constants, without saying which service validates on write. The two readings build different things in different repos.

### 27. In journey mode, does "Add a commercial transporter" show the notification's status strip?

- **Default:** Follow Design Release 2.1 where the hand-off can carry it. "Add a commercial transporter" shows the "Draft" tag and the notification reference above its heading, and neither "Choose a transporter type" nor "Add a private transporter" shows one. Where journey mode cannot carry the notification's status, none of the three pages shows one, the pages are otherwise unchanged, and the difference is recorded for design rather than worked around.
- **Affects:** req-2278; the transporter rows on `feat/EUDPA-781`.
- **Why it is open:** Once the add pages are the ones the INS front door serves, the notification's status has to cross services with the hand-off, and nothing in the working set shows the add-address hand-off carrying it.

### 28. Where is a party picker's page of eight cut?

- **Default:** Each picker keeps reading the role-filtered list the address book returns and cuts its page of eight in the frontend, as both frontends do today. The address book's page and pageSize parameters stay for its other callers, and its own list and the INS address book list page through the API.
- **Affects:** req-594, req-611, req-2303; the picker rows on `feat/EUDPA-805-design-release-2-1-consignment-parties`, the list rows on `feat/EUDPA-707`, and inc-181.
- **Why it is open:** Neither ruling settles it. Both readings give the trader the same eight rows, but they differ in what the frontend sends and in how a book of thousands behaves.

### 29. Which CDP environments must the add-address hand-off be proved in?

- **Default:** Each environment gets what it can carry. The local Docker stack and the CI Docker stack are proved by the tests repo's existing hand-off specs, which run only where both frontends are up. CDP dev and test are proved by the same specs in the scheduled CDP run. CDP environments without both frontends, and the animals frontend's stub mode, are out, and the pickers there show no add control.
- **Affects:** req-2309; the address book rows on `feat/EUDPA-707`.
- **Why it is open:** The ruling plainly covers the hand-off, but records both the CDP environment and what counts as proof as unstated. One plain reading over-builds a CDP-only check nobody asked for; the other lets CDP go unproven.

### 30. Does the add-address page reached from the consignment contact page read "Save and select"?

- **Default:** "Save and select" on every add-address page reached from the journey, the contact route included, because that save also leaves the new branch address chosen on the page it returns to. One button on one page reads one way.
- **Affects:** req-2310; the party add rows on `feat/EUDPA-805`.
- **Why it is open:** The design names the add page's buttons once and never distinguishes the contact route, while the real service reads one way from a party picker and another from the contact page. Precedence cannot settle it: both labels come from the same today source describing two routes into one page.

### 31. What does the 17 November address wording ask of the plants Overview?

- **Default:** The plants Overview is left as it is. The group heading "3. Addresses" satisfies the decision, the consignor, identification numbers and contact rows keep their own titles, and the "Consignment addresses" title and the "Complete consignment addresses" message are built only where plants already has an equivalent page or card.
- **Affects:** req-2322; the plants Overview rows on `feat/EUDPA-696-design-release-2-1-overview-and-review`.
- **Why it is open:** The ruling's ground, that plants matches animals on these pages, holds for the section heading but not for the task row: plants asks its party questions on three separate pages and has no consignment addresses page to title. Reading it as the animals structure would give plants a new page and a new row, which the 9 October afternoon ruling refuses.

### 32. How does the addresses wording land on plants' check answers, which has no single addresses card?

- **Default:** Plants takes the section heading "Addresses" only. Its party cards keep their own titles and their own outstanding-card messages, because plants asks for its own parties and keeps its own questions and data while mirroring animals' wording patterns.
- **Affects:** req-2337; the plants review rows on `feat/EUDPA-696`.
- **Why it is open:** The ruling gives plants the same wording on the ground that plants matches animals, but plants' review has no single addresses card to carry the title or its message.

### 33. Which atypical items did the overview and review engineering review find?

- **Default:** Only the items the ruling names are fixed: the standard page not found for a missing notification, the "Identification details" heading and its hierarchy, the review cards' accessible names, each header button's own form with Delete left a link, the live animals review tests reading cards by structure and role, the single heading on the review page object, the two shared test helpers losing their overloads, and the plants notification lifecycle specification's missing blank line. The four exceptions stay as they are.
- **Affects:** req-2338; the rows on `feat/EUDPA-696-design-release-2-1-overview-and-review`.
- **Why it is open:** The ruling sweeps up "every other atypical item the review found" without listing them, and the engineering review it answers is published outside this programme's sources.

### 34. Does the notification list's status filter still offer "Action required"?

- **Default:** The select offers "Select one", "Submitted" and "Completed" only. "Action required" is added back in the same increment as the outstanding-actions banner the dashboard designs introduce.
- **Affects:** req-2346; inc-137.
- **Why it is open:** The 16 November ruling names the list's "Action required" tag, the view's warning and the review's error as what comes out, and does not name the status filter. Its general clause that nothing action-required is shown would take the option out, while the prototype's option list is look and feel and names three statuses.

### 35. Does the notification card's date label read "Arrival date" or "Arrival date at port of entry"?

- **Default:** The question page, check your answers and the overview task list read "Arrival date at port of entry" as the ruling says, while the notification card on the live animals, germinal products and plants lists reads "Arrival date", the words Design Release 2.1 gives the card.
- **Affects:** req-1072; inc-130 and inc-172.
- **Why it is open:** The ruling settles the two names the prototype uses on the question and review pages and says the chosen name holds everywhere, but names no page or component, and "Arrival date" on the card is neither of the two names it chose between.

### 36. Which environments have their addresses collection dropped when the address book starts storing roles?

- **Default:** After release, dev and test have the whole addresses collection dropped with CDP tooling and the address book restarted, and a local stack is restarted. perf-test and ext-test are dropped the same way when the change reaches them, because their addresses are test data too. Pre-production and production are not touched and no address is deleted there, the service not being live for traders yet. An address without a role found in either is left in place and no picker offers it.
- **Affects:** req-2359; the address book rows on `feat/EUDPA-707`.
- **Why it is open:** The ruling names dev, test and a local stack and is silent on every other environment, and a record saved before the change can still be held with no role at all.

### 37. On an add reached from a notification journey, is the roles question shown with the hand-off's role ticked?

- **Default:** The question is shown with the hand-off's party role ticked, so the page reads the same as the add reached from the address book, and a trader adding a consignor address that is also the place of origin can tick both before saving. The ticked role is kept whatever else the trader ticks, so the journey always gets an address it can select.
- **Affects:** req-2360; the address book rows on `feat/EUDPA-707` and the party add rows on `feat/EUDPA-805`.
- **Why it is open:** The tests repo says both things and proves neither, and the prototype's journey add suggests a type without reaching the roles question at all.

### 38. Once the amend confirmation page exists, is "Amend this notification" a button or a link?

- **Default:** It is a link to the notification's amend confirmation page, because nothing changes until the trader confirms there, exactly as Delete opens the delete confirmation page. Copy as new keeps a form of its own, Delete stays a link, and no action shares another action's form, in live animals, germinal products and plants alike.
- **Affects:** req-1391, req-2364, req-2365; inc-120, inc-121, and the view header rows on `feat/EUDPA-696`.
- **Why it is open:** The 19 November ruling describes a header in which Amend posts and starts the amendment at once, because the confirmation page is not built yet. Precedence cannot settle it: the ruling answers an engineering review of the header as built, and c-189's own rule points the other way.

### 39. Where should the "answers differ from submitted" flag live, and is it published?

- **Default:** The animals backend holds the flag on the notification record, in a name of its own choosing in its own conventions, and returns it on the fulfilments view beside the status the frontend already rehydrates from. It reads no for a notification that has never been submitted. It is not published on any notification event, so the event envelope and `trade-imports-schemas` stay as they are, as c-272 and c-296 settled for the notification's category.
- **Affects:** req-2386; the amend review rows on `feat/EUDPA-696` and the animals backend.
- **Why it is open:** The ruling settles that the flag is non-null and that the backend's shape owns it, but leaves the field, the never-submitted value and whether it is published open. The three choices build different things in the backend, the frontend's stub and the event schema.

### 40. Does "every other atypical item" reach the exceptions the animals frontend's own record names?

- **Default:** Only the items the engineering review listed. Each exception the set's record names keeps its recorded reason and stays as it is, and the record goes on naming it, because each one rests on a real constraint or an accessibility need rather than on a preference.
- **Affects:** req-2480; the animals frontend's recorded decisions. No row builds it while it is a question.
- **Why it is open:** The ruling's sweep is defined by a list it does not carry, held in an engineering review that is not one of this programme's sources, while the frontend's own record names several departures from house rules as deliberate exceptions.

### 41. Does the one-form-each header rule give the plants frontend a Copy as new action?

- **Default:** The park stands and each part gets what it has. In the live animals frontend Amend and Copy as new each post their own form and Delete is a link to the delete confirmation page outside both. In the plants frontend Amend posts its own form, Delete is the same link outside it, and no Copy as new is built.
- **Affects:** req-2487; inc-120 and inc-125, and the plants view header rows on `feat/EUDPA-696`.
- **Why it is open:** The 19 November ruling names three header actions in both frontends, but plants has only two. Reading it as introducing the action would build a capability the plants set parks under its own standing ruling; reading it as covering only what plants has leaves the later ruling partly unapplied.

### 42. Which high-risk plants pages are signed off?

- **Default:** Each page's level is read from its own page identity module and nowhere else. A page whose module names no level is treated as below agreed, so no plants change is held as a change to a signed-off page unless that page's own module says `agreed` or `readyForLive`.
- **Affects:** req-2490; inc-277, inc-278 and inc-279, and every row that changes a plants page.
- **Why it is open:** An increment that changes a plants page has to know whether it is changing agreed behaviour, and the set's own records answer that for no page. The one source says both that the level decides it and that the level is not written down anywhere a reader can find it.

### 43. Does the journey keep the trail it writes into each page's address?

- **Default:** The trail stays, in both frontends. A page's address carries the places already saved, newest last, in the service's own names. The review context is the review page's own place on that trail instead of `?change=1`, and no page of the merged save and continue work is reverted. New work specifies the return and Back rules by where the trader came from rather than by the query that records it.
- **Affects:** req-2521; the journey rows on `feat/EUDPA-691-design-release-2-1-journey-foundation`.
- **Why it is open:** The 9 October ruling kept `?change=1` and added no marker, and on its plain reading the trail that the save and continue work has since merged comes out. The other reading is that how a service remembers where a trader came from is its own architecture, which the ruling described rather than decided, and that the 10 November ruling deferred the return links to exactly that merged work. Nothing about where a saved page or a Back link goes turns on the answer.

### 44. Which CDP environments must every link, redirect and form hand-over be proved in?

- **Default:** Each hand-over resolves from the calling service's own configuration with no hard-coded host or port. It is proved in the local Docker stack and the CI Docker stack by the end-to-end suite walking the hand-over, and in CDP dev and test by one walk of the journey on the deployed services. CDP perf, pre-production and production take the same configuration and get no proof in this programme.
- **Affects:** req-2533; the type question rows on `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, and every cross-service hand-over.
- **Why it is open:** The ruling names CDP as a whole, and the programme deploys to some CDP environments and not others, while the two Docker stacks have an end-to-end suite that can prove a link and CDP has none.

### 45. Does a changed plants page get accessibility and security specs?

- **Default:** Animals and INS pages keep their existing accessibility and security suites. A plants page this programme changes is proved by the plants domain's end-to-end and visual specs and by the plants frontend's own in-repo checks. No plants accessibility specs or attacking security specs are written. The full attacking run keeps failing its no-traffic gate on the plants backend context, so only per-domain attacking runs are used, and that gap goes to this report.
- **Affects:** req-2557; every row that changes a plants page as well as an animals one.
- **Why it is open:** The owner's rule that plants takes the same change in the same increment can be read as carrying the animals proof across, which would mean writing plants an accessibility suite and a security corpus, or as carrying only the change. Neither the rulings nor the tests repo's own documentation settles it.

## Waiting on others

Ten adopted requirements wait on somebody outside the programme. A blocker is never a question: the design is settled, and the row builds once somebody acts.

| Requirement | Waiting for | Increment |
|---|---|---|
| req-051 | The EUDPA-774 save and continue work merging to the animals frontend's main. Who: that work's owners. Until then the origin page's exits stay as they are | The origin page's return-links row on `feat/EUDPA-695-design-release-2-1-origin-page` |
| req-456 | The INS address lookup becoming a real feature. Today only the EUDPA-390 spike exists, gated to dev and local on a standalone page and not wired in. Who: the INS backend's owners. Transporter management no longer blocks it | The commercial transporter's Northern Ireland address search on `feat/EUDPA-781-design-release-2-1-transporters` |
| req-457 | The same INS address lookup. Built with the commercial transporter's address search and re-distilled with it | The same row on `feat/EUDPA-781` |
| req-458 | Parked as concept work by the 9 November ruling; the 13 November design ruling leaves the search-only layout deferred with it. When it is planned it needs design's answer to question 10 and the lookup as a real feature | inc-194 (deferred) |
| req-647 | Parked as concept work (9 November), and waiting on the INS address lookup | inc-194 (deferred), with the address search rows on `feat/EUDPA-707-design-release-2-1-address-book` |
| req-648 | The same | inc-194, with `feat/EUDPA-707` |
| req-649 | Parked as concept work; when planned, design answers question 10 on the search-only layout, and the lookup must be real | inc-194 |
| req-650 | Parked as concept work, and waiting on the INS address lookup | inc-194, with `feat/EUDPA-707` |
| req-651 | The same | inc-194, with `feat/EUDPA-707` |
| req-652 | Parked as concept work; when planned, design answers question 10, and the lookup must be real | inc-194 |

## Settled without a question

397 conflicts were settled by precedence. This run's challenge settled none of the 45 questions, so no question a ruling answered is written as a question here. 67 conflicts are new since the last report: c-292, c-320, c-334, c-347, c-351, c-358 to c-360, c-366, c-371, c-374 to c-378, c-380, c-382, c-383, c-385 to c-387, c-391 to c-393, c-395 to c-397, c-400 to c-413, c-416 to c-418, c-420, c-422 to c-432, c-435 to c-437, c-439 to c-442, c-444, c-445, c-448, c-449 and c-452. c-372 moved the other way: it was settled before and is now question 20.

Settled-by key: dates are rulings (7 Oct and 9 Oct are Sam's; 9 Oct pm is Sam's afternoon ruling; 9 Oct tpl is Sam's templates ruling; 14 Oct is Paul's; 5 Nov is Paul's; 6 Nov, 11 Nov, 16 Nov (Ian), 23 Nov and 25 Nov are Ian's; 9 Nov ID is the interaction designer's; 13 Nov is design's; the rest are Sam's). DR2.1 is the prototype and its traces and specs; DR1 is the parity notes and backlog; V4 is the data fields page; repo is a service's own code over a stale trace.

| Decision | Settled by | Conflict |
|---|---|---|
| Country of origin list keeps what MDM serves; the prototype's content goes to MDM as a content report | DR1, 9 Oct | c-001 |
| Country of origin is stored as its ISO code and shown by name | 7 Oct | c-002 |
| Origin page keeps all three return controls | DR1 | c-003 |
| Saving origin with no country lands on the overview | 7 Oct | c-004 |
| Origin page keeps its server checks; a refused save stores nothing | 7 Oct | c-005 |
| Accessibility and no-JavaScript duties override DR2.1 only as far as they need to | 7 Oct, 9 Oct pm | c-006 |
| A start from the all-types dashboard asks "What are you importing?" first, in the INS front door | DR2.1, 9 Oct | c-007 |
| Region code prefix is drawn on the server; design snagging has since built the live prefix | 9 Oct pm | c-008 |
| Country control stays the accessible autocomplete: no hint, "Search for a country" placeholder | 9 Oct pm | c-009 |
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
| Cat and dog species take DR2.1's names | DR2.1 | c-020 |
| After a change from check answers, both commodity pages return there | 7 Oct | c-021 |
| Germinal "Total gross weight" is each line's gross weight in kg: stored and shown, not published | 9 Oct, V4 | c-022 |
| Answers stay stored as service codes | Rulings | c-023 |
| Off-list values are refused; a refused submit saves nothing | 7 Oct | c-024 |
| One shared destination country and port of exit, prefilled in each reveal | DR1, 9 Oct | c-025 |
| Destination select built now from reference-data's GBNAG_SPS_EX countries, labelled "<territory> (<parent>)" | 9 Oct | c-026 |
| Both port of exit selects offer the whole ports-of-entry list; no exit-only list | 9 Oct | c-027 |
| "Error: " title prefix stays | 7 Oct | c-028 |
| Reason page heading becomes "Main import reason" | DR2.1 | c-029 |
| Reason page Back goes to the previous page, or the hub | DR2.1 | c-030 |
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
| The country of origin question stays one question with its own page | 7 Oct | c-046 |
| Pages keep submitting and storing codes | Rulings | c-047 |
| Port of entry and transit lists built from MDM content; ports ordered airports, seaports, rail | 9 Oct | c-048 |
| Arrival date is the expected arrival at the port of entry | 7 Oct | c-049 |
| Arrival date hint keeps its wording with an example inside the window | 7 Oct | c-050 |
| Arrival details keeps its own page and its real path | 9 Oct | c-051 |
| Each transporter row gets "View details", pointing at the address book; built now | DR2.1, 6 Nov | c-052 |
| Status strip follows DR2.1 page by page on the transporter pages; what journey mode carries is c-390 | DR2.1 | c-053 |
| Private transporter country list is the UK plus reference-data's GBNAG_SPS_EX countries as MDM serves them; built now | 9 Oct, 6 Nov, 11 Nov | c-054 |
| A commercial transporter with a non-Northern Ireland country is refused | 7 Oct | c-055 |
| Add transporter forms keep DR1's return controls and add "Cancel and return to dashboard"; built now | DR1, 6 Nov | c-056 |
| Approved transporters are parked: the eight shipped records stay exactly as they are | 6 Nov, 11 Nov | c-057 |
| Added transporters stay scoped to the organisation, in both sets | Rulings | c-058 |
| Documents page stays at accompanying-documents | 9 Oct | c-059 |
| Documents Back returns to the review when come from it, else the overview | DR2.1 | c-060 |
| Row drops the leading "An" | DR2.1 | c-061 |
| Row drops the leading "An" | DR2.1 | c-062 |
| Document reference hint removed | DR2.1 | c-063 |
| Document reference keeps its 58-character limit | 7 Oct | c-064 |
| Document references accept punctuation; the backend drops its pattern | DR2.1 | c-065 |
| Document type travels as the service code | 7 Oct | c-066 |
| Date of issue hint "For example, 27/3/2026" | DR2.1 | c-067 |
| Size bullet opens "files that are smaller than" | DR2.1 | c-068 |
| File limit becomes 50MB everywhere | DR1, DR2.1 | c-069 |
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
| Save and return checks and saves a part-filled document | DR2.1 | c-082 |
| Upload documents link opens once the origin is answered | DR2.1 | c-083 |
| Documents are stored durably by the backend | 7 Oct | c-084 |
| Document types drop "Health certificate" | 7 Oct | c-085 |
| The addresses page keeps one page for every party | DR2.1 | c-086 |
| Roles and addresses keeps its summary list, with full addresses | DR1 | c-087 |
| Fraud warning ends with a full stop | DR2.1 | c-088 |
| Each empty row's add link names what it adds | DR2.1 | c-089 |
| Answered party rows show the whole address | DR2.1 | c-090 |
| Germinal products are their own set with no CPH page; live animals still exempts only 0101 and 01061900 | 9 Oct | c-091 |
| Roles and addresses continues to contact address, or the overview once complete | DR2.1, 9 Oct | c-092 |
| Picker's "Add a new address" looks and sits as drawn | DR2.1 | c-093 |
| Every picker pages at eight with a "Selected address" inset, searched on the server, with no live filtering | 25 Nov, 23 Nov, 9 Oct pm | c-094 |
| Picker count wording follows DR2.1 | DR2.1 | c-095 |
| Picker address column shows one line per address line | DR2.1 | c-096 |
| Animals picker rows get a "View" link to the INS address book; plants' pickers keep their own | DR2.1, 9 Oct pm | c-097 |
| A blank picker save returns to roles and addresses, party unchanged; an address not in the book is refused | DR2.1 | c-098 |
| Party pickers end with the primary button alone | DR1 | c-099 |
| DR1's address-page blocks do not stop these differences | 7 Oct | c-100 |
| Records with no role yet appear on every picker; plants' pickers filter by role too | DR1, 9 Oct pm | c-101 |
| The place of origin picker takes the same search box, hint and server search as the other four | 9 Oct pm, DR2.1's own withdrawal | c-102 |
| The party is named "Consignor", in animals and plants | DR2.1, 9 Oct pm | c-103 |
| Roles and addresses completes when every shown section is complete | DR2.1 | c-104 |
| Picker search has a medium label and an icon button "Search", in animals and plants | DR2.1, 9 Oct pm | c-105 |
| Journey add-address stays on the INS address book through today's handshake | Rulings | c-106 |
| Manual-entry Country list built with what MDM serves; "Select one" placeholder built | 9 Oct | c-107 |
| Add-address keeps the address book's length and email checks | 7 Oct | c-108 |
| Add-address keeps GOV.UK accessibility patterns | 7 Oct | c-109 |
| CPH page keeps "Save and continue" alone | DR1 | c-110 |
| Permanent address page ends with "Save and continue" alone | DR1 | c-111 |
| CPH is stored as 9 digits and shown as 12/345/6789 | 7 Oct | c-112 |
| CPH page can be saved blank | DR2.1 | c-113 |
| Part-filled CPH numbers are still checked | 7 Oct | c-114 |
| CPH Back and Save go to consignment addresses | DR2.1 | c-115 |
| Addresses page continues to contact address; from the overview it returns there | DR2.1, 9 Oct | c-116 |
| CPH help's second paragraph takes DR2.1's wording and link | 7 Oct | c-117 |
| The permanent address keeps its own page rather than returning to identification | 7 Oct | c-118 |
| Permanent address page and same-as-destination are built now | 7 Oct | c-119 |
| Contact page's sentence, structure and add-a-branch are built now | 7 Oct | c-120 |
| Contact page offers only the organisation's branch addresses | DR2.1, DR1 | c-121 |
| A blank contact save shows "Select a contact address" | DR2.1 | c-122 |
| Contact page continues to review on the first pass; from the overview it returns there | DR2.1, 9 Oct | c-123 |
| Contact stays complete when the address-book record goes | 7 Oct | c-124 |
| Contact page drops the "Current contact address" card; the edit route stays | DR2.1, 9 Oct | c-125 |
| A new permanent address keeps its county and fields | 7 Oct | c-126 |
| Hub "Cancel amend" goes to the cancel-amendment confirmation page | 9 Oct pm | c-127 |
| Each notification keeps its own hub, in each set's own path | Rulings | c-128 |
| Hub keeps the GOV.UK Task list component | 7 Oct | c-129 |
| Transport card shows the transporter's stored country | 7 Oct | c-130 |
| Submitted view shows the notification's own answers | 7 Oct | c-131 |
| Declaration submit keeps its completeness re-check | 7 Oct | c-132 |
| Identifier-driven outstanding items built, with no blocker; the action-required warnings come out (c-410) | 9 Oct, DR2.1 | c-133 |
| Review names unfinished commodity and species answers as drawn | DR2.1 | c-134 |
| Review error summary has one entry per unfinished card | 7 Oct | c-135 |
| Amend review opens without errors; an incomplete amendment is refused with errors | 7 Oct | c-136 |
| The review keeps one card per section rather than the prototype's split | DR2.1 | c-137 |
| Review drops row-level "Edit details" links | 7 Oct | c-138 |
| Review keeps errors from real validation | 7 Oct | c-139 |
| Review keeps virus-scan errors | 7 Oct | c-140 |
| Transit countries move into Arrival details on the review | DR2.1 | c-141 |
| Subsection headings above review cards go | DR2.1 | c-142 |
| "Return to your dashboard" and the view's Back go to the set's own notification list | 9 Oct pm, 9 Oct tpl | c-143 |
| A trader with something left to do amends from the view; the action-required view is withdrawn (c-410) | 7 Oct, 16 Nov | c-144 |
| INS root becomes the DR2.1 overall dashboard, blocked with the summary information; today's table stays meanwhile | DR2.1, 9 Oct | c-145 |
| Home title "Dashboard - Import notification service - GOV.UK" built now; caption and h1 wait with the overall home | DR2.1, 9 Oct pm | c-146 |
| "Create new" always shows and goes to the type choice, built now on today's home | 7 Oct, 9 Oct tpl | c-147 |
| Glance counts come from the organisation's real notifications, and wait on the INS dashboard requirements | 7 Oct | c-148 |
| "Action needed" means a submitted notification missing a required document or identifier; its status stays Submitted | DR2.1, 9 Oct, 16 Nov | c-149 |
| No "Messages" link or unread count | 7 Oct | c-150 |
| Plants "View dashboard" links to the real plants dashboard | 7 Oct | c-151 |
| Plants glance cards link like the others; the cards and counts wait | 7 Oct, 9 Oct pm | c-152 |
| "Log out" stays | 7 Oct | c-153 |
| Drill-down cards keep status-driven links | DR1 | c-154 |
| Drill-downs apply the chosen search and sort | 7 Oct | c-155 |
| Home and drill-downs take DR2.1's styling | DR2.1 | c-156 |
| Drill-downs are always sorted, "Newest first" by default | DR1 | c-157 |
| Per-category glance cards replace DR1's band | 7 Oct | c-158 |
| Each list stays in its own frontend at its set root, reframed in place; the animals backend's list gains the category filter | 9 Oct pm, 9 Oct tpl | c-159 |
| Drafts keep Resume, Copy as new and Delete; submitted cards keep status actions; plants mirrors with its own | 7 Oct, DR1 | c-160 |
| List is always sorted: "Newest first", "Oldest first", "Arrival date" | DR1 | c-161 |
| Search, sort and filters really change the list, through one GET form | 7 Oct | c-162 |
| Page links keep tab, sort, search and filters | 7 Oct | c-163 |
| Card writes the arrival date as "21 June 2026" | DR2.1 | c-164 |
| Amending notifications sit in "In progress" with an "Amending" tag | 7 Oct | c-165 |
| Unreadable or reversed filter dates show GOV.UK errors | 7 Oct | c-166 |
| DR1's deferred dashboard rows do not hold back DR2.1 | Rulings | c-167 |
| Address book shows 8 a page, asked for through the list API's page size (1 to 100, default 25) | DR2.1, 5 Nov, 25 Nov | c-168 |
| Address book search runs on the server; design ruled it does not filter as the trader types | 9 Oct pm, 13 Nov | c-169 |
| Address book honours same-site and approved cross-origin returns | 7 Oct | c-170 |
| INS list drops controls DR2.1 lacks; the banner stays and stops hiding itself | 7 Oct, 9 Oct pm | c-171 |
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
| A template keeps the notification's own answer shape | 9 Oct | c-182 |
| Templates are stored by the backend, with no seeded examples | Rulings | c-183 |
| A template is private to the user who saved it | DR2.1 | c-184 |
| Manage templates has no sort control; the sort is dropped with templates (9 Nov ID) | 9 Oct pm, 9 Nov ID | c-185 |
| A template saves each party's address separately | 7 Oct | c-186 |
| Using a template seeds the transporter's country | 7 Oct | c-187 |
| No saving a template by GET | 7 Oct | c-188 |
| Amend, cancel amendment, copy and delete change state by form posts | Rulings | c-189 |
| Amend and cancel-amendment confirmations are pages; the dialogs are dropped outright | 9 Nov ID | c-190 |
| Confirming an amendment lands on the amend review | DR2.1 | c-191 |
| Amendment edits are saved to the record | 7 Oct | c-192 |
| Delete stays a soft delete | 7 Oct | c-193 |
| Dashboard cards keep status-driven actions | DR1 | c-194 |
| DR2.1 copy adopted on the delete and cancel-amend pages | DR1 | c-195 |
| A copy carries exactly DR2.1's list | DR2.1 | c-196 |
| Copying mid-amendment copies the submitted version | DR2.1 | c-197 |
| Guards, delete and view Back go to the set's own notification list | 9 Oct pm | c-198 |
| The amend review keeps the notification's own route | 9 Oct | c-199 |
| Continue on the amend review is held while anything is invalid, with an error summary | 7 Oct | c-201 |
| Reason for import is asked before commodity details | DR2.1, 9 Oct | c-202 |
| CPH number is reached only from its roles and addresses row | DR2.1 | c-203 |
| Pages opened from the overview return to it on save | DR2.1, 9 Oct | c-204 |
| Opening run always ends on the review page; plants takes the same | DR2.1, 9 Oct pm | c-205 |
| Back follows the page's context, read from the service's own state | DR2.1 | c-206 |
| Origin page offers the overview return controls | 7 Oct, DR1 | c-207 |
| Pickers, CPH and permanent address pages end with the primary button alone | 7 Oct, DR1 | c-208 |
| Contact page return controls say "hub", as drawn | 7 Oct | c-209 |
| While amending, overview pages get the amend ending; pickers, CPH and permanent address show "Save and return" | 7 Oct | c-210 |
| **Replaced:** the soft save is withdrawn. On every page with both buttons, "Save and return to overview" makes exactly the same checks as "Save and continue", with no page an exception. How far those checks reach is question 20 | 26 Oct | c-211 |
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
| Taking today's germinal lines out of the live-animals catalogue is the commodity-search ticket's work; the germinal set's own search offers no live-animal commodity | 10 Nov | c-222 |
| The real commodity lines and fields stay; the prototype's hidden fields are not copied | 9 Oct | c-223 |
| Commodity pages keep their real paths | 9 Oct | c-224 |
| Performance tests change in each increment whose change breaks a k6 script | 7 Oct, 9 Oct | c-225 |
| Port of exit options read "<name> - <code>" | DR2.1 | c-226 |
| Germinal products is a sibling set at /germinal-products, started from its own route | 9 Oct | c-227 |
| The germinal set holds only germinal products; there is no mixed case | 9 Oct | c-228 |
| Embryos and ova are separate catalogue items (EMBRYO, OVA); a combined line carries EMBRYO meanwhile | 9 Oct | c-229 |
| The germinal catalogue's 18-item content is MDM's (c-282); V4 still decides which germinal fields apply | V4, 9 Oct, 11 Nov | c-230 |
| Germinal gross weight is asked and stored per species line | 9 Oct | c-231 |
| Germinal gross weight and temperature are optional; number of packages stays required | V4 | c-232 |
| Temperature is asked once and stored on every line | V4, DR2.1 | c-233 |
| A germinal line's quantity is its number of packages, a whole number from 1 to 1,000 | V4, 9 Oct | c-234 |
| A germinal species counts as identified once its entry holds one identifier | 9 Oct, V4 | c-235 |
| Arrival details page stays at port-of-entry | 9 Oct | c-236 |
| Documents page returns without ?from= markers | 9 Oct | c-237 |
| No template-mode guard on documents; templates never offer it | 9 Oct | c-238 |
| Permanent address storage shape is the real model's | 9 Oct | c-239 |
| CPH, permanent address and contact pages use real paths and field names | 9 Oct | c-240 |
| No new link to the kept contact edit route | DR2.1 | c-241 |
| CPH, permanent address and contact error states keep "Error: " and HTTP 400 | Rulings | c-242 |
| Pages return to the hub by the flow's fallback, with no from=hub marker | 9 Oct | c-243 |
| Germinal hub weight card region is named "Gross weight summary" | 9 Oct | c-244 |
| Review, declaration and confirmation keep their real paths | 9 Oct | c-245 |
| A draft's review shows the view header with its Draft status and stays editable | 9 Oct | c-246 |
| Confirmation's "Create a new notification" keeps today's mechanism, styled as a link | 9 Oct | c-247 |
| No template guard on the declaration | 9 Oct | c-248 |
| No /dashboard redirect | 9 Oct | c-249 |
| Home and drill-down links use each service's own paths; category lists sit in their own frontends | 9 Oct | c-250 |
| Lists keep the prototype's content; each list's own frontend names addresses and parameters | 9 Oct | c-251 |
| The list banner stays triggered by the redirect flag, in animals and plants | 9 Oct | c-252 |
| The INS service names the tab and search parameters | 9 Oct | c-253 |
| A template's name is its own field rather than a derived title | 9 Oct | c-254 |
| Only transporters carry a transporter authorisation number | 9 Oct | c-255 |
| Phone stays free text up to 20 characters | Address book, V4 silent | c-256 |
| The template list reads the backend's own records | 9 Oct | c-257 |
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
| The deletion message shows on the set's own list through ?deleted=1 | 9 Oct pm | c-269 |
| The delete confirmation page keeps the notification's own route | 9 Oct | c-270 |
| The deletion banner does not dismiss itself, in every set | 9 Oct pm, accessibility | c-271 |
| The category is stored on the record only; no event or schema change | 9 Oct pm | c-272 |
| Live-animal lines carry LIVE_ANIMAL; germinal lines SEMEN or EMBRYO until MDM separates ova | 9 Oct | c-273 |
| Journey pages keep real paths; germinal uses /germinal-products | 9 Oct | c-274 |
| Buttons keep the service's own fields | 9 Oct | c-275 |
| No from=hub, from=review or from=template-review markers | 9 Oct | c-276 |
| Every germinal species, a lone one included, needs one identifier before submit and Complete | V4, 9 Oct | c-277 |
| The catalogue's content is MDM's and out of scope; only the reference-data integration stays blocked on MDM | 11 Nov | c-278 |
| Germinal set asks "Total gross weight", stored per line in kilograms; no conditional temperature | 9 Oct | c-279 |
| No mixed live-and-germinal consignment behaviour is built | 9 Oct | c-280 |
| A germinal notification starts from the type question or the germinal set's own list | 9 Oct pm | c-281 |
| The germinal catalogue's content leaves the backlog as an MDM concern; the set goes ahead on the lines the catalogue holds | 11 Nov | c-282 |
| The germinal dates keep the MOJ date picker over a text input, built with the germinal identification dates | 9 Nov ID, 10 Nov | c-283 |
| Port search matches are not bolded, in animals or plants | 9 Oct pm | c-284 |
| **Overruled 6 November:** the address book manages transporters, so every add, list and search change goes ahead; only the commercial address search still waits, on the lookup (c-218) | 9 Oct pm, overruled by 6 Nov | c-285 |
| The template-review controls go on the transporter list as it stands; no longer blocked | 9 Oct pm | c-286 |
| The no-JavaScript address search is built when the lookup lands; its JavaScript parts are deferred with the concept work, and there is no live filtering | 9 Oct pm, 13 Nov, 9 Nov | c-287 |
| The CPH boxes follow the GOV.UK date input with no JavaScript; the server keeps its checks | 9 Nov ID | c-288 |
| No cancel-amend dialog on the CPH page; the Amend bar's "Cancel amend" goes to the confirmation page | 9 Oct pm | c-289 |
| Plants' contact page takes only the new intro and "Select an address" heading | 9 Oct pm | c-290 |
| Plants' contact page keeps the whole address book and no add link | 9 Oct pm | c-291 |
| The plants contact picker keeps its pagination and its "Selected address" inset, and pages at eight | 25 Nov | c-292 |
| Plants' party cards, contact included, drop telephone and email rows and read the address line by line | 9 Oct pm | c-293 |
| Import reference numbers stay selectable text; no Copy button is built at all | 13 Nov | c-294 |
| Each category list stays in its own frontend; "View dashboard" and drill-down Back links point there | 9 Oct tpl, 9 Oct pm | c-295 |
| The category is not published on the notification event | 9 Oct pm | c-296 |
| The INS home's germinal section waits with the summary information | 9 Oct pm | c-297 |
| No list carries a Back link to the overall home | 9 Oct pm | c-298 |
| The list uses GOV.UK and MoJ components, with no custom JavaScript | 9 Oct pm | c-299 |
| Plants' list drops its empty-list sentence | 9 Oct pm, DR2.1 | c-300 |
| Plants' "Submitted" becomes plain text; "Draft" stays a tag | 9 Oct pm, DR2.1 | c-301 |
| Plants' tabs, 8 a page, search, sort and filters wait on the plants backend (inc-200); the rest of plants' frame changes now | 9 Oct pm | c-302 |
| Address book category tabs are MoJ sub navigation | 9 Oct pm | c-304 |
| The no-JavaScript address search has its fields visible; the search-only layout waits on design question 10 and is deferred | 9 Oct pm | c-305 |
| **Overruled 6 November:** "Transporter" is a fourth option on "Choose an address type", third before "Branch", and its hand-over goes ahead | 9 Oct pm, overruled by 6 Nov | c-306 |
| Plants' navigation gains a Templates item in the same increment as animals and has no templates of its own; with templates parked, nothing is built now | 9 Oct tpl, 4 Nov | c-307 |
| "Use template" is a form post | 9 Oct pm | c-309 |
| Card Amend goes through the amend confirmation page, in every set | 9 Oct pm | c-310 |
| Plants' status strip reads "Amend" | 9 Oct pm | c-311 |
| Plants' opening run ends on check your answers even when incomplete | 9 Oct pm | c-312 |
| **Replaced:** plants' lenient save is withdrawn. On every plants page with both buttons the two make exactly the same checks | 26 Oct | c-313 |
| Each set's root renders its own notification list | 9 Oct pm, 9 Oct tpl | c-314 |
| The performance suite does not join the list reframe for a route move | 9 Oct pm | c-315 |
| Arrival and transit keep the "Error: " title prefix and named Remove buttons that work without JavaScript | 9 Oct pm | c-316 |
| Plants' Overview changes only where an animals hub row changes the same page; it keeps its own tags, rows and sections | 9 Oct pm | c-317 |
| Country of origin is mandatory to proceed: the origin page saves only with a country, on both buttons | V4, 26 Oct | c-319 |
| The animals origin page shows "Select a country of origin" for a missing country; plants keeps its own wording | V4 silent, each frontend | c-320 |
| On the origin page both buttons make the same checks; a blank region code still saves, being mandatory to submit | 26 Oct | c-321 |
| On the commodity page, Commodity details and the plants commodity type page, both buttons make the same checks | 26 Oct | c-323 |
| Number of packages is asked wherever V4's 54-commodity list names the species' commodity, and withheld elsewhere | V4 | c-324 |
| Remove on Commodity details keeps the numbers the trader has typed but not yet saved | 26 Oct | c-329 |
| On the main import reason and additional details pages both buttons run the same checks | 26 Oct | c-332 |
| A species whose commodity requires no specific identifier is asked free-text Identification details and a Description | V4 | c-333 |
| A tattoo is asked on cattle (0102) and pigs (0103) as well as cats, dogs and ferrets; V4's entries beat its list title's count | 11 Nov | c-334 |
| The live-animals catalogue's commodity and species names are whatever MDM serves | 9 Oct, V4 | c-328 |
| Both transporter forms take the Standard Address Block's fields and limits and DR2.1's labels, hints, heading and order | 11 Nov | c-347 |
| Any detail entered makes the add-a-document form a document, refused with an error for each missing one | 26 Oct, 10 Nov | c-351 |
| A CPH number is three parts of 2, 3 and 4 digits, hinted "For example 12/345/6789", stored as nine digits | 11 Nov | c-358 |
| The contact address comes from the organisation's address book, narrowed to branch-address records, with no manual entry | 11 Nov, 9 Oct | c-359 |
| A new permanent address asks DR2.1's eight fields with County and no country; a trader-created contact keeps the add page's fields | 11 Nov, 14 Oct | c-360 |
| A germinal notification needs action on the documents the germinal set requires, with no animal-identifier test | 10 Nov | c-366 |
| The amend review's heading switches once a saved answer differs from the submitted one | 19 Nov, DR2.1 | c-371 |
| On every germinal page with both buttons the two make exactly the same checks | 26 Oct, 9 Oct | c-339 |
| A germinal commodity's code is the catalogue's eight-digit code, not V4's seven-digit form | 9 Oct pm | c-340 |
| On arrival details and transit countries both buttons make the same checks | 26 Oct | c-341 |
| The port of entry offers every port MDM returns for the GBNAG system, in both sets | 9 Oct | c-342 |
| There are exactly four means of transport, stored AIRPLANE, RAILWAY, ROAD_VEHICLE and VESSEL, read Air, Rail, Road and Sea | V4, DR2.1 | c-343 |
| The germinal set asks for transit countries on the same terms as live animals | 9 Oct, V4 | c-344 |
| Transit countries stay optional: the page saves with no country added | V4 | c-345 |
| A transporter is mandatory to proceed: a save with none chosen is refused on both buttons | V4, 26 Oct | c-346 |
| The Document type select offers the business's thirteen types in order; three wait on codelist codes | V4 | c-348 |
| Each document type keeps DR2.1's wording where both name the same type; a type the design lacks takes the business's name | V4's role | c-349 |
| The date of issue accepts a one- or two-digit day and month with a four-digit year | DR2.1, V4 | c-352 |
| On the upload documents page both buttons make exactly the same checks | 26 Oct | c-353 |
| The four document fields keep the labels "Document reference", "Document type", "Date of issue" and "Attachment" | V4's role | c-354 |
| The attachment's format is taken from the file and checked against the eight permitted formats | V4, DR2.1 | c-355 |
| The review's wording names each party by its own title | DR2.1 | c-356 |
| The CPH question applies to V4's seventeen commodity codes and to nothing else | V4 | c-357 |
| Both buttons make the same checks, and which answers a page needs comes from V4's markings | 26 Oct, V4 | c-361 |
| The germinal contact address page carries the live-animals page's save-button behaviour | 26 Oct, 9 Oct | c-362 |
| Only cats, dogs and ferrets need a permanent address; "mandatory to submit" says when the answer is checked | V4, DR2.1 | c-363 |
| While amending, "Save and return to overview" makes exactly the same checks, upload documents included | 26 Oct | c-370 |
| Deltas in the commodity area are read from the animals frontend and the tests repo, not the stale traces | repo | c-374 |
| The commodity pages build no template behaviour while templates are parked | 4 Nov, 9 Nov ID, 9 Nov | c-375 |
| The number of animals accepts every whole number up to 9,223,372,036,854,775,807, and the store widens | V4, 11 Nov | c-376 |
| Reference-data serves no commodity or species list yet: the commodity search still reads the frontend's own service | repo | c-377 |
| A stale unweaned answer is cleared, on the service's own applicability rule rather than the prototype's code list | 11 Nov | c-378 |
| No template-mode behaviour is built on the main import reason or additional details pages | 4 Nov, 9 Nov ID | c-380 |
| The germinal commodity search leaves this backlog for the commodity-search ticket; the page keeps the server-side search | 10 Nov | c-382 |
| The port and transit country searches keep the autocomplete's own announcements; no custom results labels | 9 Nov, 9 Oct pm | c-383 |
| The INS front door's add pages are the one route to adding a transporter; the animals frontend's three add-page folders go | 6 Nov | c-385 |
| The transporter list pages at eight, with an inset naming the chosen transporter | 25 Nov | c-386 |
| The transporter list searches on the server behind its button and Enter; no filtering as the trader types, and no bolding | 13 Nov, 9 Oct pm | c-387 |
| The animals frontend's own source, not the stale traces, says what the transporter pages do today | repo | c-391 |
| The address book is the system of record for transporters; the frontend's in-memory store is replaced, with nothing to carry over | 6 Nov | c-392 |
| The addresses section reads "Addresses" and its page and overview row read "Consignment addresses", plants included | 17 Nov | c-393 |
| "County (optional)" stays on the add-address page the journey reaches | 14 Oct | c-395 |
| The add page is already DR2.1's "Add address and contact details" page; the traces record the earlier build | repo | c-396 |
| A journey-added address record holds roles only, at least one, with no stored address type | 5 Nov | c-397 |
| The animals frontend's own extract, not the stale traces, says what it does now | repo | c-400 |
| The CPH and permanent address pages show the caption "Addresses" | 17 Nov | c-401 |
| The animals contact address page pages at eight with the "Selected address" restatement | 25 Nov | c-402 |
| The hub's heading is "Notification task list", two words; a template's reads "Template task list" | 19 Nov | c-404 |
| The hub's fifth section reads "Addresses" with its number kept, and its row "Consignment addresses" | 17 Nov | c-405 |
| The repository, not the traces, says what the live-animals hub now shows | repo | c-406 |
| The review row reads "Port of exit"; "Exit border control post" is not used | 17 Nov | c-407 |
| The review row reads "Arrival date at port of entry" | 17 Nov | c-408 |
| The review's section reads "Addresses", its card "Consignment addresses" and its message "Complete consignment addresses" | 17 Nov | c-409 |
| No "Submitted action required" status, view warning, Continue, review error or list marking is built | 16 Nov | c-410 |
| Submitting records the submitted date and no outstanding items list; both come back with the banner | 19 Nov | c-411 |
| A notification reference that does not exist answers 404 with the standard "Page not found" page, in animals and plants | 19 Nov | c-412 |
| No template review, template sections or "Save template" button are built in this programme | 4 Nov | c-413 |
| The INS home's "Use template" button and the Templates navigation item are not built; the home offers "Create new" alone | 4 Nov, 9 Nov, 9 Nov ID | c-416 |
| The Action needed card and drill-down keep DR2.1's content and links, and wait on the banner and the INS requirements | 16 Nov, 19 Nov | c-417 |
| The list shows no "Action required" tag, no error card and no outstanding-items message | 16 Nov, 19 Nov | c-418 |
| No list offers a "Use template" button; the heading is followed by "Create new" alone | 4 Nov, 9 Nov, 9 Nov ID | c-420 |
| Every list of an organisation's addresses is served and shown a page at a time, the role filter running before the page is cut | 25 Nov, 5 Nov | c-422 |
| The list takes repeatable roles matching any of them, plus search roles, so one request serves a whole tab | 5 Nov, 25 Nov | c-423 |
| An address's roles all come from one group, so an address is listed on exactly one tab | 5 Nov | c-424 |
| A listed name breaks after its first word, as the design renders it and the real list already does | DR2.1 | c-425 |
| The Transporter tab lists transporter records with a Commercial or Private type; no seventh role and no fourth role group | 6 Nov, 5 Nov | c-426 |
| "Transporter" sits third on the address type question, before "Branch" | 5 Nov, 6 Nov | c-427 |
| The merged address-book theme's end-to-end claims and the November rulings say what the add and edit do today | 25 Nov | c-428 |
| A create or update carrying an address type is refused with a 400 and a per-field message, not saved with the type dropped | 6 Nov | c-429 |
| One save reports every missing or invalid answer, the roles among them | 26 Oct, 7 Oct | c-430 |
| The edit page's Country select offers no blank option unless the stored code is no longer served, when it opens blank | 7 Oct | c-431 |
| "County (optional)" stays on the address book's add-details step, between "Town or city" and "Postcode or Zip code" | 14 Oct | c-432 |
| The templates pages read "Addresses" for the section and "Consignment addresses" for the card and task row | 17 Nov | c-435 |
| A task list heading is spelled "task list", two words, on a notification and on a template | 19 Nov | c-436 |
| Templates are built when the parking lifts, not now; every adopted templates requirement carries that decision as its blocker | 4 Nov, 9 Nov, 9 Nov ID | c-437 |
| Amend, copy as new and delete accept a submitted notification with outstanding items as any other | 16 Nov | c-439 |
| A copy carries certified-for over as stored; no mapping of retired prototype values is built | 11 Nov | c-440 |
| The record holds no outstanding items list and nothing derives one; the submitted date is still recorded | 19 Nov | c-441 |
| No "Submitted action required" status is added: the enum stays DRAFT, SUBMITTED, AMEND and DELETED | 16 Nov | c-442 |
| The submission event's data is the GBN-AG exchanged document and specified consignment | repo | c-444 |
| A decision in the animals frontend's own design record is not one of the named overrides | 7 Oct, 9 Oct | c-445 |
| The deleted plants journey spec ruling is not restored and nothing records its removal | 19 Nov | c-448 |
| Every plants picker pages at eight and keeps the restatement of the chosen address | 25 Nov | c-449 |
| A page opened from a Change link on the review returns to the review when it is saved | 7 Oct | c-452 |

## Already in place

1,506 adopted requirements are met today. Statements are in `distil/requirements.json`. The first column names where today's evidence shows it; the second lists every requirement that evidence set backs.

Key: E2E the end-to-end traces, AF the animals fit traces, IF the INS fit traces, FE the animals frontend, INS-FE the INS frontend, PF the plants frontend, BE the animals backend, INS-BE the INS backend, AB the address book, RD reference data, stub the stub, tests the tests repo, perf the performance suite.

| What already exists | Requirements |
|---|---|
| AB | req-1120, req-1155, req-1268, req-1868, req-1869, req-2357 |
| AB E2E IF INS-FE tests | req-1141, req-1235 |
| AB E2E IF tests | req-1145, req-1149, req-1263, req-1264 |
| AB E2E INS-FE perf tests | req-1243 |
| AB E2E INS-FE tests | req-1125, req-1157, req-1158, req-1256 |
| AB E2E tests | req-1123, req-1151 |
| AB IF INS-FE tests | req-1192, req-1236, req-1237, req-1238, req-1239, req-1240, req-1241, req-1242, req-1244 |
| AB INS-FE perf tests | req-1119, req-1121 |
| AB INS-FE tests | req-1122, req-1130, req-1156 |
| AB tests | req-1152, req-1203, req-1265, req-1266, req-1269, req-1867, req-2352, req-2353, req-2362 |
| AF | req-133, req-186, req-239, req-373, req-476, req-524, req-1468, req-1760, req-1973 |
| AF BE E2E FE | req-1423 |
| AF BE E2E FE PF tests | req-1415, req-1453 |
| AF BE E2E FE perf tests | req-547 |
| AF BE E2E FE tests | req-500, req-509, req-513, req-526, req-532, req-534, req-535, req-546, req-1032, req-1422 |
| AF BE E2E tests | req-1476 |
| AF BE FE | req-495, req-496, req-506 |
| AF BE tests | req-1396 |
| AF E2E | req-086, req-130, req-188, req-196, req-197, req-247, req-274, req-336, req-479, req-522, req-525, req-559, req-605, req-704, req-775, req-1882 |
| AF E2E FE | req-021, req-047, req-050, req-055, req-087, req-089, req-090, req-117, req-118, req-135, req-137, req-139, req-141, req-149, req-151, req-152, req-156, req-159, req-160, req-179, req-195, req-202, req-205, req-209, req-210, req-212, req-214, req-217, req-218, req-221, req-223, req-224, req-225, req-226, req-233, req-235, req-238, req-240, req-243, req-244, req-264, req-265, req-269, req-273, req-275, req-276, req-278, req-279, req-281, req-283, req-292, req-297, req-298, req-305, req-307, req-317, req-320, req-321, req-326, req-330, req-334, req-340, req-343, req-347, req-363, req-380, req-381, req-382, req-384, req-400, req-409, req-411, req-412, req-423, req-437, req-467, req-468, req-480, req-483, req-484, req-486, req-490, req-494, req-510, req-517, req-573, req-583, req-669, req-707, req-721, req-723, req-724, req-771, req-774, req-777, req-783, req-784, req-785, req-787, req-790, req-793, req-794, req-795, req-796, req-797, req-798, req-799, req-801, req-802, req-803, req-804, req-806, req-809, req-810, req-811, req-825, req-827, req-829, req-834, req-840, req-843, req-844, req-845, req-849, req-852, req-853, req-855, req-856, req-863, req-868, req-871, req-899, req-918, req-924, req-932, req-936, req-938, req-945, req-1047, req-1685, req-1756, req-1768, req-1845, req-2142, req-2144, req-2145, req-2154, req-2273, req-2285, req-2290 |
| AF E2E FE INS-FE | req-1677 |
| AF E2E FE INS-FE PF | req-1675, req-1676, req-1679, req-1680, req-1684 |
| AF E2E FE INS-FE PF tests | req-1674 |
| AF E2E FE PF | req-015, req-022, req-616, req-1881, req-2078, req-2298 |
| AF E2E FE PF tests | req-016, req-608, req-681, req-683, req-684, req-686, req-687, req-688, req-689, req-690, req-1398, req-1412, req-1452, req-1454 |
| AF E2E FE RD | req-025, req-300 |
| AF E2E FE RD tests | req-172, req-465, req-499 |
| AF E2E FE perf | req-1823 |
| AF E2E FE perf tests | req-206, req-504, req-533, req-1635, req-1640, req-1757, req-1807, req-1822, req-1897, req-1918 |
| AF E2E FE tests | req-011, req-012, req-013, req-014, req-023, req-024, req-030, req-032, req-035, req-036, req-037, req-039, req-040, req-044, req-045, req-046, req-048, req-049, req-052, req-053, req-054, req-066, req-067, req-068, req-070, req-077, req-078, req-079, req-080, req-082, req-083, req-084, req-085, req-103, req-104, req-106, req-107, req-111, req-120, req-131, req-132, req-134, req-136, req-138, req-140, req-142, req-143, req-144, req-145, req-147, req-148, req-150, req-157, req-171, req-173, req-174, req-175, req-176, req-200, req-211, req-216, req-222, req-228, req-234, req-237, req-241, req-242, req-263, req-272, req-282, req-285, req-287, req-293, req-294, req-295, req-308, req-309, req-310, req-311, req-312, req-315, req-318, req-319, req-325, req-329, req-331, req-337, req-338, req-339, req-341, req-342, req-345, req-350, req-351, req-352, req-356, req-357, req-358, req-359, req-362, req-370, req-379, req-388, req-391, req-392, req-393, req-395, req-402, req-404, req-406, req-415, req-416, req-418, req-424, req-430, req-435, req-439, req-444, req-446, req-454, req-460, req-464, req-478, req-492, req-498, req-515, req-516, req-519, req-520, req-527, req-528, req-529, req-530, req-531, req-540, req-541, req-545, req-606, req-703, req-705, req-709, req-715, req-718, req-720, req-752, req-759, req-761, req-762, req-763, req-769, req-773, req-778, req-820, req-822, req-823, req-824, req-826, req-833, req-838, req-839, req-851, req-860, req-870, req-872, req-874, req-875, req-876, req-883, req-887, req-888, req-892, req-896, req-897, req-901, req-912, req-915, req-916, req-917, req-919, req-921, req-922, req-926, req-928, req-933, req-935, req-1084, req-1421, req-1610, req-1611, req-1613, req-1619, req-1622, req-1630, req-1641, req-1653, req-1755, req-2079, req-2147, req-2148, req-2149, req-2158 |
| AF E2E INS-FE PF tests | req-1702 |
| AF E2E PF | req-587, req-620 |
| AF E2E PF tests | req-586, req-589, req-591, req-593, req-594, req-595, req-597, req-599, req-600, req-602, req-603, req-615, req-1397, req-1459 |
| AF E2E tests | req-001, req-194, req-201, req-601, req-768, req-881, req-1394, req-1402 |
| AF FE | req-031, req-056, req-072, req-074, req-109, req-126, req-129, req-146, req-153, req-154, req-164, req-177, req-185, req-227, req-229, req-231, req-236, req-245, req-268, req-284, req-288, req-289, req-314, req-322, req-323, req-335, req-346, req-360, req-364, req-366, req-367, req-368, req-390, req-403, req-417, req-445, req-452, req-453, req-485, req-487, req-488, req-489, req-491, req-502, req-503, req-507, req-508, req-511, req-512, req-514, req-518, req-521, req-551, req-560, req-562, req-563, req-570, req-574, req-575, req-581, req-584, req-702, req-710, req-716, req-765, req-779, req-786, req-805, req-807, req-813, req-835, req-836, req-857, req-859, req-869, req-877, req-878, req-923, req-925, req-934, req-1770, req-1975, req-2026, req-2105, req-2215, req-2245, req-2249, req-2280 |
| AF FE INS-FE PF | req-1687, req-1698, req-1701 |
| AF FE INS-FE PF tests | req-2086 |
| AF FE PF | req-693, req-1091, req-1418, req-1478, req-1691, req-2088 |
| AF FE PF perf tests | req-1828, req-1844 |
| AF FE PF tests | req-604 |
| AF FE perf tests | req-537, req-1637, req-1771, req-1835 |
| AF FE tests | req-038, req-071, req-076, req-088, req-113, req-114, req-116, req-165, req-166, req-180, req-313, req-316, req-355, req-401, req-414, req-433, req-436, req-440, req-459, req-493, req-523, req-544, req-556, req-566, req-708, req-764, req-828, req-830, req-858, req-893, req-894, req-895, req-898, req-913, req-914, req-927, req-929, req-930, req-937, req-1616, req-1617, req-1638, req-1759, req-1834, req-2157, req-2224, req-2281 |
| AF INS-FE PF | req-1723 |
| AF PF | req-1699, req-1909 |
| AF PF tests | req-596 |
| AF tests | req-009, req-158, req-385, req-1655, req-1910 |
| BE | req-501, req-1490, req-1491, req-1492, req-1493, req-1494, req-1495, req-1496, req-1498, req-1499, req-1500, req-1501, req-1502, req-1503, req-1504, req-1505, req-1508, req-1509, req-1510, req-1521, req-1524, req-1526, req-1527, req-1528, req-1529, req-1530, req-1531, req-1532, req-1533, req-1534, req-1535, req-1536, req-1537, req-1540, req-1542, req-1544, req-1547, req-1548, req-1549, req-1551, req-1552, req-1553, req-1554, req-1559, req-1560, req-1561, req-1562, req-1565, req-1566, req-1568, req-1569, req-1570, req-1571, req-1572, req-1574, req-1576, req-1577, req-1588, req-1589, req-1590, req-1593, req-1595, req-1597, req-1598, req-1599, req-1601, req-2385 |
| BE E2E | req-1431 |
| BE E2E FE PF tests | req-1065 |
| BE E2E tests | req-1395, req-1409, req-1489, req-1507, req-1511, req-1512, req-1513, req-1515, req-1516, req-1517, req-1518, req-1519, req-1520, req-1525, req-1545 |
| BE FE | req-1438, req-2174, req-2175, req-2180 |
| BE FE PF | req-1094 |
| BE perf | req-1543 |
| BE perf tests | req-1557, req-1558 |
| BE tests | req-548, req-1497, req-1506, req-1514, req-1522, req-1523, req-1539, req-1541, req-1550, req-1567, req-1579, req-1585, req-1586, req-1592, req-1596, req-1600, req-1987, req-2201, req-2209 |
| E2E | req-614, req-633, req-677, req-696, req-697, req-698, req-781, req-961, req-1401, req-1436, req-1477 |
| E2E FE | req-073, req-232, req-361, req-371, req-426, req-473, req-719, req-730, req-733, req-739, req-747, req-792, req-812, req-846, req-1089, req-1743, req-2184, req-2214, req-2242 |
| E2E FE INS-FE PF | req-1715 |
| E2E FE INS-FE tests | req-2087 |
| E2E FE PF tests | req-572, req-618, req-685, req-694, req-1664, req-2342, req-2529 |
| E2E FE tests | req-041, req-042, req-043, req-277, req-425, req-451, req-536, req-630, req-668, req-672, req-674, req-679, req-706, req-726, req-727, req-732, req-738, req-740, req-741, req-744, req-755, req-760, req-862, req-1405, req-1625, req-1645, req-1706, req-2143, req-2150, req-2163, req-2531 |
| E2E IF | req-969 |
| E2E IF INS-FE | req-1282 |
| E2E IF INS-FE perf tests | req-1140, req-1159, req-1174, req-1182 |
| E2E IF INS-FE tests | req-1108, req-1111, req-1112, req-1113, req-1115, req-1116, req-1131, req-1134, req-1137, req-1138, req-1142, req-1148, req-1153, req-1175, req-1177, req-1179, req-1180, req-1181, req-1188, req-1193, req-1210, req-1221, req-1222, req-1223, req-1226, req-1227, req-1228, req-1245, req-1257, req-1258, req-1259, req-1270, req-1271, req-1272, req-1273, req-1276, req-2363 |
| E2E INS-FE | req-1710, req-1716 |
| E2E INS-FE PF | req-1713 |
| E2E INS-FE tests | req-1021, req-1109, req-1146, req-1284, req-1711 |
| E2E PF | req-695 |
| E2E PF tests | req-598 |
| E2E tests | req-474, req-634, req-635, req-636, req-637, req-638, req-639, req-640, req-641, req-644, req-645, req-659, req-667, req-671, req-673, req-675, req-676, req-1027, req-1095, req-1407, req-1604, req-1651, req-1712, req-1830, req-2304 |
| FE | req-115, req-155, req-161, req-162, req-187, req-215, req-219, req-220, req-230, req-246, req-286, req-306, req-324, req-333, req-344, req-365, req-429, req-442, req-448, req-449, req-450, req-466, req-481, req-549, req-558, req-632, req-717, req-725, req-735, req-736, req-737, req-742, req-745, req-746, req-758, req-831, req-841, req-847, req-848, req-873, req-879, req-880, req-882, req-885, req-891, req-1660, req-1661, req-1708, req-1959, req-1960, req-1974, req-2080, req-2125, req-2146, req-2151, req-2155, req-2164, req-2165, req-2170, req-2176, req-2177, req-2183, req-2189, req-2213, req-2222, req-2226, req-2228, req-2232, req-2233, req-2234, req-2239, req-2240, req-2243, req-2246, req-2247, req-2248, req-2269, req-2271, req-2282, req-2287, req-2288, req-2291, req-2314, req-2317, req-2318, req-2319, req-2320, req-2328, req-2388 to req-2417, req-2419 to req-2461, req-2463 to req-2476, req-2536, req-2539, req-2559, req-2561, req-2562 |
| FE INS-FE PF | req-1678, req-1689, req-1693, req-1697, req-1700 |
| FE INS-FE PF tests | req-1690, req-1705 |
| FE PF | req-619, req-691, req-692, req-1088, req-1460, req-1659, req-1662, req-1694, req-1696, req-1707, req-2250, req-2251, req-2325, req-2335, req-2372, req-2522, req-2525, req-2532, req-2535, req-2537, req-2538, req-2540, req-2558 |
| FE PF tests | req-564, req-588, req-611, req-911, req-1406, req-1650, req-1663, req-1703, req-2061, req-2348, req-2523, req-2528 |
| FE RD stub | req-2256 |
| FE perf | req-1821 |
| FE perf tests | req-1753 |
| FE tests | req-386, req-387, req-394, req-399, req-413, req-422, req-427, req-428, req-431, req-434, req-441, req-443, req-447, req-550, req-557, req-561, req-565, req-567, req-568, req-569, req-571, req-576, req-577, req-578, req-579, req-580, req-582, req-661, req-662, req-663, req-665, req-666, req-714, req-729, req-734, req-743, req-748, req-861, req-886, req-889, req-890, req-900, req-931, req-1614, req-1618, req-1644, req-1646, req-1647, req-1648, req-1649, req-1758, req-2122, req-2123, req-2152, req-2169, req-2178, req-2187, req-2208, req-2223, req-2227, req-2270, req-2274, req-2276, req-2286, req-2289, req-2299, req-2300, req-2316, req-2326, req-2329, req-2330 |
| IF | req-956, req-957, req-958, req-968, req-970, req-1026, req-1246, req-1280, req-1874 |
| IF INS-FE | req-966, req-1020, req-1171, req-1172, req-1184, req-1267 |
| IF INS-FE perf | req-1183 |
| IF INS-FE tests | req-953, req-1136, req-1143, req-1160, req-1161, req-1162, req-1163, req-1165, req-1166, req-1168, req-1169, req-1173, req-1209, req-1211, req-1274, req-1281, req-2046 |
| IF tests | req-1224 |
| INS-FE | req-1247, req-1695, req-1704, req-1714, req-1728, req-1729, req-1731, req-1732 |
| INS-FE PF | req-2212 |
| INS-FE tests | req-1114, req-1147, req-1176, req-1202, req-1207, req-1278, req-1862, req-2199 |
| PF | req-607, req-1911 to req-1917, req-1929, req-1930, req-1931, req-1936 to req-1949, req-1952, req-1953, req-1954, req-1976, req-1977, req-1978, req-1979, req-1992, req-1993, req-1995 to req-2002, req-2004 to req-2024, req-2033, req-2037, req-2070 to req-2074, req-2084, req-2091 to req-2094, req-2128, req-2136, req-2252, req-2253, req-2254, req-2255, req-2321, req-2336, req-2484, req-2488, req-2489, req-2491 to req-2514, req-2520 |
| PF tests | req-2120, req-2534 |
| RD | req-060, req-061, req-062, req-063, req-064, req-301 |
| RD stub | req-1809, req-1810 |
| perf | req-1849, req-1853, req-1902, req-1903, req-1904, req-1906 |
| perf tests | req-1808, req-1824, req-1860 |
| stub | req-1748, req-1749, req-1871 |
| tests | req-002, req-004, req-005, req-006, req-007, req-008, req-461, req-462, req-463, req-609, req-610, req-655, req-656, req-657, req-658, req-1124, req-1126, req-1127, req-1129, req-1135, req-1139, req-1187, req-1194 to req-1201, req-1208, req-1213, req-1248 to req-1255, req-1275, req-1546, req-1580, req-1581, req-1583, req-1605, req-1606, req-1607, req-1608, req-1657, req-1658, req-1719 to req-1722, req-1725, req-1727, req-1815, req-2041, req-2216 to req-2220, req-2260, req-2261, req-2262, req-2279, req-2294, req-2355, req-2361, req-2367, req-2373, req-2374, req-2375, req-2379, req-2380, req-2542, req-2544 to req-2548, req-2550, req-2552, req-2554, req-2563 |
| No claim from today's code: confirm before passing this on | req-374, req-1488, req-1858, req-1935, req-1950, req-1963, req-1966, req-1967, req-1968, req-1969, req-1970, req-2050, req-2257, req-2293 |

## The increments

A **review point** is a check the owner makes once the theme is built. The build never waits for it mid-run. Six rows carry one: inc-120, inc-128, inc-129, inc-132, inc-176 and inc-277.

"Lands after" lists the rows in `dependsOn`, and, marked †, the rows in `externalDependsOn` that live on a split branch. Rows are in id order; Lands after is the only order there is.

### Ready to go

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|
| inc-016 | The germinal set's "What are you importing?" offers germinal commodities only, with its own search hint | 4 | frontend, tests | inc-176 | germinal-products |
| inc-017 | Germinal Commodity details asks total gross weight, number of packages and temperature, and every trade line says what it is | 10 | backend, frontend, tests | inc-016, inc-024, inc-018† | germinal-products |
| inc-024 | The germinal start and its main import reason: two reasons, four purposes, the Transit answers and no exit date | 8 | frontend, tests | inc-016, inc-141, inc-015†, inc-218†, inc-022† | germinal-products |
| inc-052 | Germinal identification asks once per species for the donor, the dates and the identification number | 9 | backend, frontend, tests | inc-016, inc-017, inc-045† | germinal-products |
| inc-053 | Germinal identification dates and names: text inputs with a "Choose date" calendar, and the format, real-date and length checks | 10 | frontend, tests | inc-052, inc-206† | germinal-products |
| inc-099 | The germinal overview page, with packages and kilograms commodity totals and its Commodity details completeness rule | 12 | frontend, tests | inc-017, inc-177 | germinal-products |
| inc-105 | The germinal set's own review: answers in their species blocks, its unfinished-species messages, its shorter Addresses card and its confirmation page | 9 | frontend, tests | inc-017, inc-052, inc-176, inc-099, inc-104†, inc-106† | germinal-products |
| inc-120 | **Review point.** Amend goes through a confirmation page, then opens the amend review, in animals and plants | 9 | frontend, plantsfrontend, tests, perftests | inc-112† | manage-notifications |
| inc-121 | The cancel-amendment page is one question and two controls, and returns to the submitted notification with no banner | 8 | frontend, plantsfrontend, tests | inc-110† | manage-notifications |
| inc-123 | Copy as new carries over the trade answers and clears the shipment answers, from the submitted version | 8 | backend, frontend, tests | — | manage-notifications |
| inc-124 | A stale Copy as new from the view page returns there and says the notification has been updated | 3 | frontend, tests | inc-112† | manage-notifications |
| inc-125 | The delete confirmation page identifies the notification in a summary, with shorter wording and a plain link back | 13 | frontend, plantsfrontend, tests | — | manage-notifications |
| inc-126 | The deletion message reads "Notification has been deleted" on each set's own list, the endings work without JavaScript, and the amend, cancel and delete walks are proven end to end | 11 | backend, frontend, plantsfrontend, tests | inc-120, inc-121, inc-125, inc-110† | animals-dashboard |
| inc-129 | **Review point.** The live animals list is reframed in place, scoped to the trader's organisation, and plants' list takes the same frame | 11 | backend, frontend, plantsfrontend, tests, perftests | — | animals-dashboard |
| inc-130 | Notification cards show the design's facts, on the live animals list and on plants' list | 10 | backend, frontend, plantsfrontend, tests | inc-129 | animals-dashboard |
| inc-131 | Card status styles on both lists | 3 | frontend, plantsfrontend, tests | inc-129, inc-130, inc-113† | animals-dashboard |
| inc-135 | The live animals list has "In progress", "Draft" and "Completed" tabs | 7 | backend, frontend, tests | inc-130 | animals-dashboard |
| inc-136 | The live animals list's search and sort become one form that really searches and sorts | 10 | backend, frontend, plantsfrontend, tests, perftests | inc-135, inc-210† | animals-dashboard |
| inc-137 | The live animals list has "Additional filters" for arrival date, date range and status | 8 | backend, frontend, tests | inc-136 | animals-dashboard |
| inc-138 | The lists page 8 at a time with numbered pages, and show neither a results count nor an empty-state message | 8 | backend, frontend, plantsfrontend, tests | inc-136, inc-137 | animals-dashboard |
| inc-140 | The lists' success banner is titled "Success" | 3 | frontend, plantsfrontend, tests | inc-129, inc-126 | animals-dashboard |
| inc-141 | The germinal set's root renders its own copy of the reframed list | 5 | frontend, tests | inc-176, inc-129, inc-130, inc-135, inc-136, inc-137, inc-138, inc-140, inc-196 | germinal-products |
| inc-172 | Germinal notifications on their own list, with their own card facts | 6 | backend, frontend, tests | inc-130, inc-141, inc-017 | germinal-products |
| inc-176 | **Review point.** A germinal notification starts in its own set, with its own draft reference, stored category, service chrome, cross-set guard and origin page | 26 | backend, frontend, tests | inc-129, inc-130, inc-135, inc-148†, inc-150†, inc-098†, inc-100† | germinal-products |
| inc-177 | Germinal Commodity details checks the weight and the number of packages, and lists its errors by question | 9 | frontend, tests | inc-017, inc-018† | germinal-products |
| inc-178 | A germinal notification picks its transporter from the germinal set's own transporter list | 11 | frontend, tests | inc-176 | germinal-products |
| inc-179 | Germinal notifications have their own Upload documents page | 9 | frontend, tests | inc-176, inc-031†, inc-033†, inc-034†, inc-035† | germinal-products |
| inc-181 | The germinal set's own consignment addresses page, its five party pickers and its overview task, with no CPH number and no permanent address | 11 | frontend, tests | inc-054†, inc-091† | germinal-products |
| inc-182 | The rest of the germinal journey: arrival, transit countries, contact address, declaration and submission, certified for "Germinal products" | 12 | frontend, tests | inc-099, inc-105, inc-178, inc-179, inc-181, inc-018†, inc-028†, inc-029†, inc-110†, inc-111†, inc-112†, inc-113†, inc-115†, inc-094†, inc-095†, inc-097† | germinal-products |
| inc-183 | The germinal set has no Additional details step, and a germinal species counts as identified once it has one identifier | 5 | frontend, tests | inc-052, inc-099, inc-105, inc-182, inc-280 | germinal-products |
| inc-184 | End-to-end proof: a germinal notification for bovine semen, from create to submitted | 3 | tests | inc-182, inc-183, inc-141, inc-172 | germinal-products |
| inc-185 | Amend, cancel amendment, copy as new and delete for germinal notifications | 3 | backend, frontend, tests | inc-182, inc-120, inc-121, inc-123, inc-124, inc-125, inc-126 | germinal-products |
| inc-191 | Germinal selections read as live-animal ones do, and each germinal trade line carries the code for its own product type | 3 | backend, frontend, tests | inc-016, inc-017, inc-012† | germinal-products |
| inc-239 | The live animals list shows a success banner only when an action sends the trader back to it | 4 | frontend | — | animals-dashboard |
| inc-244 | Both save buttons make the same checks on every germinal page that shows them | 4 | frontend, tests | inc-053, inc-177, inc-182 | germinal-products |
| inc-264 | The INS type question offers Germinal products and hands it to the germinal set's start | 3 | insfrontend, tests | inc-176, inc-263†, inc-154†, inc-155† | germinal-products |
| inc-277 | **Review point.** The plants set's rulings records carry the decisions now in force | 5 | plantsfrontend | — | recorded-decisions-plants |
| inc-278 | The plants journey specification says what the set now has | 7 | plantsfrontend | inc-277 | recorded-decisions-plants |
| inc-279 | The plants set's guides describe the journey the service serves | 5 | plantsfrontend | inc-278 | recorded-decisions-plants |
| inc-280 | The germinal origin page's Back link returns to wherever the notification was started from | 4 | frontend, tests | inc-141, inc-176, inc-150† | germinal-products |

### Blocked

#### Waiting on the INS front door dashboard's requirements

Whoever owns those requirements must firm them up and agree them with Sam. The rulings do not name them. Each area is re-distilled once they exist.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-128 | **Review point.** The INS home becomes the overall notifications dashboard, with the performance suite's readiness probe following its heading | insfrontend, tests, perftests | ins-dashboard |
| inc-132 | **Review point.** The Action needed page lists the organisation's notifications needing action. Also waits on the outstanding-actions banner being designed and the animals backend re-adding the outstanding-items rule | insbackend, insfrontend, tests | ins-dashboard |
| inc-133 | Search and sort the Action needed list | insbackend, insfrontend, tests | ins-dashboard |
| inc-134 | Action needed glance card on the home's Live animals section. Also waits on the outstanding-actions banner | insfrontend, tests | ins-dashboard |
| inc-139 | The live animals list's Summary shows "Action needed" and "Status updated" glance cards. Also waits on the outstanding-actions banner for the "Action needed" count | backend, frontend, tests | animals-dashboard |
| inc-145 | Germinal products section on the home, and what makes a germinal notification need action. Also waits on the outstanding-actions banner | insfrontend, tests | ins-dashboard |

#### Waiting on the authorities' outcome feed

The authorities' import-checking systems must send post-submission outcomes (inspection required, delayed, completed, passed inspection) back to the services. No service in the workspace receives them today. The programme owner must agree that feed with the authorities' systems team.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-142 | Cards show the authorities' outcomes: delayed, completed, inspection, their actions and the status-updated count. Also waits on a real source of completion, and on the INS dashboard's requirements for the status-updated count | backend, frontend, tests | animals-dashboard |
| inc-143 | Status updates cards and the Status updated page. Also waits on the INS dashboard's requirements | insbackend, insfrontend, tests | ins-dashboard |
| inc-144 | Inspection required page. Also waits on the INS dashboard's requirements | insbackend, insfrontend, tests | ins-dashboard |

#### Waiting on the plants services publishing to the INS read model

Whoever owns `trade-imports-plants-frontend` and `trade-imports-plants-backend` must publish plants notifications to `trade-imports-ins-backend` before the plants glance cards can count or list anything.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-146 | The plants section's glance cards. Also waits on the INS dashboard's requirements | insfrontend, tests | ins-dashboard |

#### Waiting on the plants backend

The plants backend's owners must let plants' list query plants notifications by status for the tabs and their counts, ask for a page size of 8, and search by keyword, status and arrival date with the new sorts. Until then plants' list keeps today's search, sort and paging.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-200 | Plants' list tabs, eight a page, search, sort and filters | plantsfrontend, tests | animals-dashboard |

#### Waiting on the owner to pick templates up again

Sam de-prioritised templates on 4 November and the interaction designer dropped them for now on 9 November, with no condition named for their return. Sam must decide to pick them up, after which the templates area is re-distilled.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-186 | A germinal template is answered on the germinal set's own pages, saved, listed, changed and used to start a germinal notification. Question 2 (c-308) also bears on it, with a default the builder follows | frontend, tests | germinal-products |

### Rows that are not being built

| Id | Status | Why |
|---|---|---|
| inc-014 | dropped | Every requirement it covered is out of scope or already met. The commodity search already lists results as the trader types, and the germinal search results are the separate ticket's and MDM's |
| inc-030 | dropped | Design answered on 13 November: transit countries keep the "Add country" button, Remove reloads the page, and no announcement is needed |
| inc-093 | dropped | The interaction designer answered on 9 November: the county parish holding boxes follow the GOV.UK date input with no JavaScript on top |
| inc-147 | dropped | The 16 November ruling withdraws the "Action required" tag and everything action-required from the card |
| inc-162 | dropped | The interaction designer dropped templates for now, which settles the templates sort with them |
| inc-189 | dropped | The 9 November ruling keeps the accessible autocomplete's own announcements |
| inc-192 | merged-into | Merged into inc-053 on 10 November: germinal products follow live animals, so the calendar lands with the dates it enhances |
| inc-193 | dropped | Design answered on 13 November: no list filters as the trader types. A return to the idea comes back as a new question |
| inc-194 | deferred | The 9 November ruling parks address search as concept work, not needed for the deadline. Pick it up only when address search is planned, starting from design question 10 and a real lookup |
| inc-195 | dropped | The interaction designer answered on 9 November: amend and cancel amendment are pages, not dialogs |
| inc-196 | dropped | The "Use template" button is out of scope now that templates are parked |
| inc-198 | dropped | Design answered on 13 November: no Copy buttons on the import reference numbers |
| inc-201 | dropped | No "Submitted action required" status exists, so there is no such notification whose amend, copy and delete need proving apart |
| inc-245 | dropped | The 10 November ruling drops the obligation model row: main already tells a hard stop from a submission check |
| inc-270 | dropped | req-931 is already met and the 16 November ruling withdraws the status it would have flagged |
| inc-271 | dropped | The 16 November ruling withdraws the action-required header warnings and inline identifier errors |

**Check these ordering decisions:**

- inc-132 lands after inc-147, and inc-141 after inc-196, but both of those rows are now dropped. Treat the dependency as met rather than waiting for a row that will never build.
- inc-176 carries 26 acceptance criteria and four external dependencies. It is the largest row in the backlog. It would split along its own criteria: the set's start and draft reference, its stored category and cross-set guard, its service chrome, and its origin page.
- inc-186 is the only germinal row that is blocked, and it blocks nothing else, so the germinal theme can be built to completion without it.
- inc-141 lands after eight animals-dashboard rows and inc-176, while inc-176 itself lands after three animals-dashboard rows and inc-024 lands after inc-141. That makes a long single file through the germinal theme. Check whether the germinal list really needs every list row before it, or only the frame (inc-129) and the cards (inc-130).
- inc-280 is written after inc-182 in the file but builds earlier: inc-183 lands after it. The id order is not the build order here.
- inc-200 covers req-2034 to req-2037 while the plants list's rest of the frame changes in inc-129 and inc-136. If the plants backend lands mid-run, fold inc-200 into those rows rather than keeping a separate pass over the same page.
- inc-239 touches only the animals frontend and has no dependencies. It can be built first in its theme to shake out the harness.
- inc-139 and inc-142 are animals-dashboard rows blocked on an INS-side decision. If the summary information is dropped rather than firmed up, they go out of scope instead of building.

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Theme | Ready | Blocked | Touches | Lands after |
|---|---|---|---|---|
| manage-notifications | inc-120, inc-121, inc-123, inc-124, inc-125 | — | The amend, cancel-amend, delete and notification-actions folders in the animals and plants frontends, the backend's notification controller and copy mapper, and the k6 amend walk | overview-and-review |
| recorded-decisions-plants | inc-277, inc-278, inc-279 | — | The plants set's decisions ledger, conflicts register, journey specification, fixtures and four guides | consignment-parties, journey-foundation, overview-and-review |
| animals-dashboard | inc-126, inc-129, inc-130, inc-131, inc-135, inc-136, inc-137, inc-138, inc-140, inc-239 | inc-139, inc-142, inc-200 | The live-animals dashboard folder, the list reads in the frontend's persistence, the backend's list query and sort, plants' dashboard folder and the k6 list endpoints | manage-notifications, overview-and-review, type-question-and-templates |
| germinal-products | inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-141, inc-172, inc-176, inc-177, inc-178, inc-179, inc-181, inc-182, inc-183, inc-184, inc-185, inc-191, inc-244, inc-264, inc-280 | inc-186 | The germinal-products set folder and its routes, the set's build config, the persistence mapper, and the backend's germinal commodity, species and GBN-AG publishing | animals-dashboard, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, documents, identification-and-permanent-address, journey-foundation, manage-notifications, overview-and-review, type-question-and-templates |
| ins-dashboard | — | inc-128, inc-132, inc-133, inc-134, inc-143, inc-144, inc-145, inc-146 | The INS read model and its drill-down feature folders, and the k6 INS page and readiness checks | animals-dashboard, germinal-products, type-question-and-templates |
| waiting-on-design | — | — | The enhancement scripts layered on other themes' pages, in all three frontends | address-book, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, germinal-products, journey-foundation, manage-notifications, overview-and-review, transporters, type-question-and-templates |
| identifiers-action-required | — | — | The live-animals review header and consignment cards, the confirmation feature, and the backend's notification service | identification-and-permanent-address, overview-and-review |
| obligation-model | — | — | The journey platform's obligation model in both frontends, and the obligation-marking specs | nothing: can start now |
| type-question-and-templates | split off to `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | — | The INS type question and home controls, the templates folder and template review, the backend's template store, and plants' first page | design-snagging |
| journey-foundation | split off to `feat/EUDPA-691-design-release-2-1-journey-foundation` | — | The journey engine, flow and shared save actions | nothing: can start now |
| reference-lists | split off to `feat/EUDPA-692-design-release-2-1-reference-lists` | — | The reference services and the lists the journey reads | nothing: can start now |
| commodities-and-reason | split off to `feat/EUDPA-693-design-release-2-1-commodities-and-reason` | — | The commodity, Commodity details, main import reason and additional details pages | design-snagging, journey-foundation |
| arrival-and-transit | split off to `feat/EUDPA-694-design-release-2-1-arrival-and-transit` | — | Arrival details, the port of entry and the transit countries pages | design-snagging, journey-foundation, reference-lists |
| origin-page | split off to `feat/EUDPA-695-design-release-2-1-origin-page` | — | The origin page and its region code | nothing: can start now |
| overview-and-review | split off to `feat/EUDPA-696-design-release-2-1-overview-and-review` | — | The hub, the review, the declaration, the confirmation and the notification view header, in both journeys | arrival-and-transit, design-snagging, identification-and-permanent-address |
| design-snagging | split off to `feat/EUDPA-720-design-release-2-1-design-snagging` | — | The shared search macro, the layout and the snagging fixes | journey-foundation, reference-lists |
| documents | split off to `feat/EUDPA-724-design-release-2-1-documents` | — | The upload documents page and the document types | design-snagging, journey-foundation |
| address-book | split off to `feat/EUDPA-707-design-release-2-1-address-book` | — | The INS address book's list, view, add, edit and delete, and the address book service's record and API | reference-lists |
| transporters | split off to `feat/EUDPA-781-design-release-2-1-transporters` | — | The transporter list and the address book's transporter records and add pages | address-book, documents, journey-foundation, reference-lists |
| identification-and-permanent-address | split off to `feat/EUDPA-796-design-release-2-1-identification-and-permanent-address` | — | The identification details and permanent address pages | commodities-and-reason, design-snagging, journey-foundation, type-question-and-templates |
| test-hygiene | split off to `feat/NO_JIRA-design-release-2-1-test-hygiene` | — | The suites' own hygiene and the plants `docs/testing.md` | arrival-and-transit, commodities-and-reason, design-snagging, documents, journey-foundation, origin-page |
| consignment-parties | split off to `feat/EUDPA-805-design-release-2-1-consignment-parties` | — | The consignment addresses page, the five party pickers, the party add and edit pages and the contact address page | address-book, design-snagging, identification-and-permanent-address, journey-foundation |

Every row sits in exactly one theme. No row is in none.

**Cross-theme dependencies:**

- inc-126 (animals-dashboard) lands after inc-120, inc-121 and inc-125 (manage-notifications): the deletion message and the proven walks need the amend, cancel and delete pages to exist first.
- inc-132 (ins-dashboard) lands after inc-131 (animals-dashboard): the drill-down's cards take the card status styles the list defines.
- inc-141, inc-172 and inc-176 (germinal-products) land after animals-dashboard rows: the germinal list is a copy of the reframed live animals list, so the frame, the cards and the tabs come first.
- inc-145 (ins-dashboard) lands after inc-141 (germinal-products): the home's germinal section needs a germinal list to link to.
- inc-185 (germinal-products) lands after five manage-notifications rows and inc-126 (animals-dashboard): germinal amend, cancel, copy and delete are copies of the live-animals pages.
- 36 rows depend on a row in a split-off theme's own workarea, 19 of them ready to go. Those branches merge before the rows that name them build. Two external references name workareas the split-off list does not carry: `themes/type-question` (inc-148, inc-149, inc-150, inc-263) and `themes/design-snagging-b` (inc-219). Read them as the `type-question-and-templates` and `design-snagging` branches respectively, and check that mapping before launching inc-176, inc-128, inc-280 or inc-264.

## For the split branches

Each branch below adds or changes rows in its own backlog for these requirements, citing the requirement ids.

### type-question-and-templates

Branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, backlog `shared/design-release-2-1/themes/type-question-and-templates/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-003 | Changed since the split | The type question offers Live animals; Germinal products (semen, ova, embryos); Plants for planting; Potatoes (seed and ware); Wood products, in that order, with no hint text and none pre-selected. Live animals continues to the live-animals start, which creates the GBN-AG draft with the live-animals category and lands on its origin page. Germinal products continues to the germinal set's own start, which creates its own draft with the germinal category and lands on that set's origin page; this option may land before the germinal set is built. The three plants options continue to the start of the high-risk plants journey, which creates a plants draft in that service's own reference format and lands on plants' own first page |

### journey-foundation

Branch `feat/EUDPA-691-design-release-2-1-journey-foundation`, backlog `shared/design-release-2-1/themes/journey-foundation/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-405 | New since the split | In the journey run, "Save and continue" on the transporter list goes on to the documents page ("Upload documents"), which keeps its real path. Opened from its overview task, the list returns to the overview |
| req-1639 | New since the split | A page opened from the review returns to the review when it is saved, and keeps that context through its own in-page actions (add, remove, upload) until it does. "Save and return to overview" still goes to the overview first |

### commodities-and-reason

Branch `feat/EUDPA-693-design-release-2-1-commodities-and-reason`, backlog `shared/design-release-2-1/themes/commodities-and-reason/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-110 | New since the split | Commodity details groups the questions under an h2 per commodity, "<commodity name> (<commodity code>)", and an h3 per chosen species naming its Latin name, with a section break between commodity groups and none above the save buttons |

### arrival-and-transit

Branch `feat/EUDPA-694-design-release-2-1-arrival-and-transit`, backlog `shared/design-release-2-1/themes/arrival-and-transit/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-280 | New since the split | The arrival date hint reads "The expected date of arrival at the port of entry. For example, <today>", where the example is today's date in d/m/yyyy, so copying the example is always accepted |

### origin-page

Branch `feat/EUDPA-695-design-release-2-1-origin-page`, backlog `shared/design-release-2-1/themes/origin-page/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-051 | New since the split | The origin page in both animals sets ends with "Save and continue", a secondary "Save and return to overview" that saves before going to the overview, and a "Cancel and return to overview" link that reaches the overview even on a notification with no answers. It is blocked until the EUDPA-774 save and continue work merges |

### overview-and-review

Branch `feat/EUDPA-696-design-release-2-1-overview-and-review`, backlog `shared/design-release-2-1/themes/overview-and-review/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-585 | New since the split | The overview's "5. Addresses" section holds the task "Consignment addresses", hinted "Consignor or Exporter, Consignee, Importer and Place of Destination", linking to the consignment addresses page and covering the CPH number page behind it |
| req-837 | New since the split | On an editable review each card's Change link opens the page that collected that card's answers, pre-filled, and saving there returns the trader to the review |
| req-920 | New since the split | The declaration checkbox is shown ticked when the notification already holds a confirmed declaration, as on resubmitting an amendment |
| req-2205 | New since the split | Once a saved answer differs from the submitted one during an amendment, the amend review's title and h1 read "Review before re-submitting"; until then they read "Review your notification", in live animals, germinal products and plants |
| req-2311 | New since the split | The tests that prove the review's broken-copy error summary and its inline party errors find the cards by GOV.UK structure and role rather than by the words of a numbered heading |
| req-2327 | New since the split | The Uploaded documents section is never marked unfinished and never appears in the review's error summary |
| req-2331 | New since the split | The live animals review tests find its cards by their GOV.UK structure and role, as the plants tests do, with no test depending on a numbered section heading's words, the review page object offering a single heading, and the shared resume-in-the-UI and save-and-continue walk helpers carrying no overloads |
| req-2332 | New since the split | Tests prove the review's visually hidden text, its GOV.UK summary-card structure and the rendering of its last card, alongside the overview's totals box, buttons and caption line height |
| req-2333 | New since the split | Whether an amendment's answers differ from the submitted version is a yes-or-no flag that is never absent, held on the notification record and read by the review to choose its heading. The animals frontend's local stub takes it from the record's own shape rather than working it out itself |
| req-2334 | New since the split | Outstanding actions on a submitted notification are shown through a banner-style alert, and the notification record carries the outstanding items left at submission and the rule that works them out for the banner to read |
| req-2364 | New since the split | On a notification's view header no action shares another action's form: each posting action has a form of its own, and Delete is a link to the delete confirmation page placed outside those forms, in the live animals, germinal products and plants frontends |
| req-2366 | New since the split | The animals backend records whether an amended notification's answers differ from the submitted ones as a yes-or-no value that is never empty, and the animals frontend reads that value from the backend's shape, in its local stub as against the real service |
| req-2524 | New since the split | The plants frontend shows the notification task list heading visibly, reading "Notification task list", as the live animals frontend does, with "task list" spelled as two words |

### documents

Branch `feat/EUDPA-724-design-release-2-1-documents`, backlog `shared/design-release-2-1/themes/documents/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-2179 | New since the split | A document saved as Self-declaration, CITES permit/certificate or Packing list / species list is accepted, stored and published by its own code |

### address-book

Branch `feat/EUDPA-707-design-release-2-1-address-book`, backlog `shared/design-release-2-1/themes/address-book/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-631 | New since the split | The journey's address-return route accepts a return only when its fulfilment id names a role and its handshake token matches the single-use token the picker issued for that role, a missing, reused or mismatched token included, and looks the returned address id up in the signed-in organisation's own address book |
| req-2309 | New since the split | The add-address hand-off between the animals frontend and the INS address book works in CDP, in the local Docker stack and in the CI Docker stack the pull request runs use, each service taking the other's address from its own configuration and never from a hard-coded host or port. Which CDP environment and what counts as proof there is question 29 |
| req-2356 | New since the split | The address book groups its six roles into sending (place of origin, consignor), receiving (place of destination, consignee, importer) and branch (branch address), the same three groups the add's "Choose an address type" step offers. It refuses an address whose roles come from more than one group, and refuses a consignee, importer or place of destination outside the United Kingdom, while a place of origin, a consignor or a branch address may be anywhere |
| req-2358 | New since the split | A role a new notification type needs is added by changing the address book's code, each role in exactly one group |

### transporters

Branch `feat/EUDPA-781-design-release-2-1-transporters`, backlog `shared/design-release-2-1/themes/transporters/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-455 | New since the split | A commercial transporter posted with a country other than Northern Ireland, or with none at all, is refused with "A commercial transporter you add must be in Northern Ireland", not quietly corrected |
| req-2171 | New since the split | Both transporter forms ask the Standard Address Block's address and contact fields, with its formats and limits, and read with Design Release 2.1's labels, hints, section heading and question order. The commercial form asks a transporter authorisation number as well; the private form asks none |
| req-2263 | New since the split | A transporter's approval status reads "Approved" or "New" on the transporter list and is held in a field of its own, separate from the record's soft-delete status, under a name the address book chooses |
| req-2264 | New since the split | "Add a transporter" on the transporter list opens the address book's add-a-transporter pages in journey mode and lands the trader back on the list on save or on cancel, through the same hand-off the journey already uses to add an address. The animals frontend serves no transporter add pages of its own |
| req-2265 | New since the split | The name field on both transporter forms is labelled "Name or organisation name" |
| req-2266 | New since the split | The commercial transporter form's first field is labelled "Transporter authorisation number" |
| req-2267 | New since the split | Both transporter forms carry one section heading, "Enter contact details", after the country and before the email address, and no heading above the address fields |
| req-2268 | New since the split | The transporter list shows eight transporters a page, with GOV.UK pagination below the table carrying the search term and the chosen transporter in its links, no pagination where eight or fewer are found, and an inset between the search box and the table naming the transporter the trader has chosen |
| req-2272 | New since the split | A transporter saved on a notification comes back ticked on the transporter list, matched to the address book record it came from |
| req-2283 | New since the split | With JavaScript switched off a trader can search the transporter list, pick a transporter the search found and save it, and can save or cancel either add form, each ending where it does with JavaScript on |

### identification-and-permanent-address

Branch `feat/EUDPA-796-design-release-2-1-identification-and-permanent-address`, backlog `shared/design-release-2-1/themes/identification-and-permanent-address/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-731 | New since the split | The permanent address page explains "A permanent address is where an animal:" followed by the bullets "will permanently reside" and "can be checked by the Animal and Plant Health Agency (APHA)", then asks "Where will their permanent address be?" |
| req-2241 | New since the split | A refused save on the identification details page shows the page again with every identifier the trader typed still in its field, the cap-reached refusal of a line that filled up while the page was open included |
| req-2315 | New since the split | A new permanent address refuses an email address that is not correctly formed, with the same message the journey's edit-address page uses |

### consignment-parties

Branch `feat/EUDPA-805-design-release-2-1-consignment-parties`, backlog `shared/design-release-2-1/themes/consignment-parties/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-617 | New since the split | A deleted address-book record is never offered on a picker and can never be saved, and a stored answer picked from one shows no ticked row. An address book that cannot be reached is an error, never read as a deletion |
| req-682 | New since the split | The party edit page is headed "Edit address details", captioned with the party's own title ("Place of origin", "Consignor", "Consignee", "Importer", "Place of destination" or "Contact address for consignment"), titled "Edit address details - Import notification service - GOV.UK", below the notification's journey strip |
| req-1965 | New since the split | The plants consignment contact page shows eight address-book records a page with GOV.UK pagination ("Previous", "Next" and numbered page links, in Welsh "Blaenorol" and "Nesaf", none where eight or fewer were found), carries the search term, page number and ticked address in its paging links, opens on page one on re-entry, lets a contact ticked on a later page be saved, and shows an inset "Selected address: <name>" for a ticked or saved contact even on a page where that record is not listed. A soft-deleted or missing record is never shown there or carried in paging links |
| req-2305 | New since the split | On the consignee, importer and place of destination party edit pages the Country select holds "United Kingdom" alone and the saved country is United Kingdom. The place of origin, consignor and consignment contact edit pages offer the whole country list. The plants place of destination edit page does the same |
| req-2306 | New since the split | On the party edit page a country the address book does not list is refused with "Enter a country", in both the live animals and the high-risk plants frontends |
| req-2307 | New since the split | The party edit page's county field carries the browser autocomplete hint `address-level1`, as its other address fields carry theirs |
| req-2312 | New since the split | The contact address page in both animals sets shows eight branch-address records a page, with GOV.UK pagination ("Previous", "Next" and numbered page links, and none where eight or fewer were found), carries the page number in its paging links, opens on page one when the trader comes back, and lets a contact ticked on a later page be saved |
| req-2313 | New since the split | The contact address page in both animals sets shows an inset "Selected address: <name>" for a ticked or saved contact, above the list of addresses, even on a page where that record is not listed |
| req-2486 | New since the split | In the plants frontend the consignment contact page's two return controls read "Save and return to overview" and "Cancel and return to overview" |

`reference-lists`, `design-snagging` and `test-hygiene` have nothing to pick up.

## Where the requirements came from

21,218 claims were weighed, from 40 sources: 20,284 taken by the extractors and 934 added during reconcile as claims the extractors had missed. 20,110 held and 174 were dropped as refuted, leaving a working set of 21,044.

Reconcile cut the service into 24 areas, so every part of it was weighed apart: start-and-origin, commodities, reason-and-additional-details, animal-identification, germinal-products, arrival-and-transit, transporters, documents, consignment-parties, party-address-add-and-edit, cph-permanent-and-contact, notification-hub, review-and-submit, dashboard-home, notification-list, address-book-list, address-book-add-and-edit, templates, manage-notifications, notification-record, recorded-decisions-animals, recorded-decisions-plants, journey-flow and layout-and-sign-in.

Those claims became 2,459 requirements: 2,087 adopted (1,506 already in place, 323 new, 258 a change to what exists), 43 questions, and 329 out of scope. The backlog's rows cover 276 of them, and the split-off themes' own backlogs cover a further 307.

| Source | Claims | Held | Added | Cited | Requirements (in scope) |
|---|---|---|---|---|---|
| ruling:ian-2026-11-25 | 41 | 40 | 1 | 41 | 32 (30) |
| ruling:ian-2026-11-23 | 15 | 15 | 0 | 15 | 11 (11) |
| ruling:sam-2026-11-19 | 41 | 41 | 2 | 42 | 40 (37) |
| ruling:sam-2026-11-17 | 20 | 20 | 1 | 21 | 39 (38) |
| ruling:sam-2026-11-16 | 21 | 21 | 1 | 22 | 29 (19) |
| ruling:ian-2026-11-16 | 46 | 46 | 1 | 23 | 8 (6) |
| ruling:design-2026-11-13 | 31 | 31 | 0 | 28 | 23 (15) |
| ruling:ian-2026-11-11 | 40 | 40 | 1 | 22 | 33 (19) |
| ruling:sam-2026-11-10b | 49 | 49 | 1 | 28 | 18 (15) |
| ruling:sam-2026-11-10 | 24 | 24 | 1 | 14 | 18 (14) |
| ruling:sam-2026-11-09 | 23 | 22 | 1 | 16 | 28 (22) |
| ruling:interaction-designer-2026-11-09 | 48 | 48 | 2 | 32 | 31 (20) |
| ruling:ian-2026-11-06 | 74 | 74 | 2 | 74 | 53 (45) |
| ruling:paul-2026-11-05 | 53 | 52 | 3 | 51 | 30 (29) |
| ruling:sam-2026-11-04 | 25 | 25 | 3 | 10 | 20 (10) |
| ruling:sam-2026-10-26 | 26 | 26 | 2 | 28 | 54 (52) |
| ruling:paul-2026-10-14 | 19 | 19 | 1 | 14 | 6 (5) |
| ruling:sam-2026-10-09-pm | 302 | 301 | 5 | 271 | 517 (432) |
| ruling:sam-2026-10-09-templates | 52 | 52 | 0 | 50 | 71 (56) |
| ruling:sam-2026-10-09 | 200 | 199 | 2 | 199 | 370 (321) |
| ruling:sam-2026-10-07 | 23 | 23 | 0 | 14 | 87 (80) |
| confluence:6497338582 (V4) | 648 | 646 | 17 | 642 | 215 (198) |
| document:dr1-parity-notes | 88 | 88 | 1 | 89 | 58 (45) |
| document:dr1-parity-backlog | 481 | 481 | 64 | 545 | 176 (144) |
| prototype:dr2-1-source | 1,705 | 1,683 | 81 | 1,762 | 1,181 (1,060) |
| trace:prototype-dr2-1 | 1,791 | 1,784 | 85 | 1,784 | 1,059 (967) |
| prototype:dr2-1-specs | 1,003 | 998 | 8 | 1,006 | 639 (586) |
| repo:backend | 688 | 683 | 26 | 709 | 189 (167) |
| repo:insbackend | 132 | 132 | 8 | 140 | 4 (0) |
| repo:addressbook | 339 | 336 | 12 | 348 | 48 (46) |
| repo:referencedata | 98 | 96 | 5 | 101 | 21 (19) |
| repo:stub | 130 | 130 | 6 | 136 | 18 (15) |
| repo:frontend | 2,666 | 2,644 | 136 | 2,681 | 1,183 (1,120) |
| repo:insfrontend | 638 | 638 | 31 | 669 | 193 (181) |
| repo:plantsfrontend | 2,598 | 2,575 | 116 | 2,642 | 360 (308) |
| repo:tests | 2,300 | 2,268 | 111 | 2,328 | 943 (869) |
| repo:perftests | 145 | 143 | 19 | 162 | 56 (53) |
| trace:animals-fit | 1,948 | 1,921 | 81 | 1,962 | 779 (743) |
| trace:ins-fit | 250 | 248 | 27 | 275 | 116 (110) |
| trace:e2e | 1,463 | 1,448 | 70 | 1,492 | 806 (759) |

**Unused sources.** There are none: `tim distil coverage` refuses a source that backs nothing, and every one of the 40 sources backs at least one requirement. No source's cited share falls under a tenth. The lowest is `ruling:sam-2026-11-04` at 10 of 25 claims; its uncited claims restate the type-question split's branch and theme mechanics, which are the backlog's shape rather than service behaviour. `repo:insbackend` is the one to watch for a different reason: every one of its 140 claims is cited, but it backs only 4 requirements and all 4 are out of scope, because this programme's notification lists moved to the animals frontend and the INS read model's own rows are all blocked.

**The strongest requirements.** req-1256 rests on 14 sources: what the address book stores for an address's roles. Four more rest on 11: req-106, req-499, req-608 and req-1141. Twenty-two rest on 10, among them req-025, req-112, req-594, req-611, req-727, req-760, req-1123, req-1235 and req-2130.

**The weakest.** 321 in-scope requirements rest on a single source: 98 on the animals frontend alone, 63 on the animals backend, 60 on the plants frontend, 37 on the tests repo, 12 on the prototype source and 10 each on the INS frontend and the prototype traces. A single-source requirement from a repo is a statement about what exists today rather than a difference to build, so most of these are `exists` rows.

Nineteen in-scope requirements rest only on inferred claims, with no verbatim evidence anywhere: req-267, req-957, req-975, req-1014, req-1099, req-1343, req-1351, req-1365, req-1372, req-1496, req-1508, req-1554, req-1851, req-1856, req-1927, req-1928, req-1969, req-2213 and req-2257. Two rest only on gap claims, where the evidence is the absence of something: req-501 and req-1184.

**Confirm before passing this on.** Fourteen requirements are recorded as already in place with no claim from today's code behind them: req-374, req-1488, req-1858, req-1935, req-1950, req-1963, req-1966, req-1967, req-1968, req-1969, req-1970, req-2050, req-2257 and req-2293. Check each against the running service before anyone treats it as built.

## Out of scope

329 requirements are out of scope. Each is listed once, under the reason it is out.

### Templates, parked

The 4 November ruling de-prioritises templates and leaves their rows unbuilt, the interaction designer dropped them for now on 9 November, and the 9 November owner ruling calls Design Release 2.1's templates concept work: req-010, req-091, req-167, req-819, req-941, req-942, req-943, req-964, req-965, req-1038, req-1299, req-1846.

### Nothing action-required until the banner is designed

The 16 November ruling withdraws the "Submitted action required" status, the "Action required" tag, the view's warnings and the review's certificate error, and the 19 November ruling takes the stored outstanding items off the animals backend record. Nothing action-required is shown until the outstanding-actions banner the dashboard designs introduce is agreed: req-902, req-903, req-904, req-905, req-906, req-907, req-908, req-939, req-940, req-2111, req-2113.

### Design has answered the question by dropping it

The 13 November design ruling and the interaction designer's 9 November answers drop these outright rather than parking them: req-348, req-349, req-353, req-354, req-592, req-711, req-712, req-713, req-1393, req-1951, req-1986, req-2039.

### The separate commodity-search ticket's work

The 10 November ruling hands commodity search to another ticket, whose design call does not come back here: req-1754, req-1782, req-2229, req-2230, req-2231.

### Approved transporters, parked

The 6 November ruling parks approved transporters, including the eight records the service ships, and the 11 November ruling bars a row from resting on the prototype's `app/data` files: req-396, req-397, req-398, req-2173, req-2284.

### Reference-list content, handed to MDM

List content is master data MDM owns, so a difference from Design Release 2.1 goes to MDM as a content report rather than into code: req-026, req-027, req-028, req-029, req-065, req-093, req-094, req-095, req-096, req-097, req-098, req-099, req-100, req-101, req-302, req-303, req-1766, req-1767, req-1818, req-2384.

### Search mechanics the real component replaces

A search box is the real frontends' accessible component, behaving as they configure it, so the prototype's own search mechanics and announcements are not copied, and the prototype itself withdrew the place of origin picker's separate country search: req-017, req-020, req-621, req-622, req-623, req-624, req-1908.

### Other notification types

Plants for planting, potatoes and wood products belong to the high-risk plants journey in its own frontend, and the prototype's fall-through to the live-animals pages is not a design: req-059, req-1668, req-1764, req-1921, req-1922, req-1923, req-1924.

### URL paths, field names, data shapes and data owners the prototype does not decide

The 9 October ruling keeps architecture with the real services, and the 11 November ruling makes V4 and MDM the only owners of data: req-271, req-477, req-626, req-821, req-1016, req-1128, req-1341, req-1342, req-1355, req-1357, req-1362, req-1366, req-1430, req-1829, req-1855, req-1879, req-1887.

### Prototype mechanics, seed data and defects

The prototype's version mount, session storage, seeded demonstration data, custom classes and markup defects are how it is built, not what it designs: req-189, req-190, req-378, req-383, req-410, req-419, req-438, req-469, req-471, req-625, req-750, req-751, req-776, req-946, req-947, req-1017, req-1018, req-1106, req-1189, req-1286, req-1287, req-1289, req-1384, req-1385, req-1386, req-1387, req-1388, req-1389, req-1486, req-1665, req-1666, req-1667, req-1681, req-1682, req-1742, req-2196, req-2197, req-2204.

### Set aside by a conflict, a ruling or an accessibility duty

A ruling, a settled conflict or an accessibility duty closes these: req-033, req-627, req-629, req-642, req-952, req-959, req-1003, req-1035, req-1087, req-1097, req-1104, req-1107, req-1150, req-1170, req-1225, req-1290, req-1847, req-1920, req-2045, req-2206, req-2207, req-2308, req-2369.

### The DR1 parity backlog is not a source of requirements

The ruling makes the DR1 parity backlog and notes a source of judgements only: req-192, req-369, req-555, req-1031, req-1190, req-1288, req-1734, req-2082.

### Germinal data the V4 change log de-scopes

The change log de-scopes these fields, and the PIMS schema update is EUDPA-686, outside the backlog: req-1802, req-1803, req-1804, req-1805, req-2190.

### Plants keeps its own, or plants has parked it

Plants keeps its own questions, data, step order and parked decisions, and a plants change that needs `trade-imports-plants-backend` is outside the programme: req-1925, req-1926, req-1955, req-1962, req-1972, req-1981, req-1982, req-1983, req-1984, req-1985, req-1991, req-1994, req-2003, req-2025, req-2047, req-2055, req-2056, req-2059, req-2062, req-2063, req-2064, req-2075, req-2095, req-2096, req-2104, req-2108, req-2110, req-2116, req-2129, req-2168, req-2192, req-2323, req-2518.

### Weighed in another area

Each claim describes a page, a service or a record another area owns, and is recorded here only so every claim is weighed: req-198, req-266, req-270, req-482, req-552, req-949, req-1028, req-1029, req-1030, req-1564, req-1765, req-1778, req-1779, req-1816, req-1817, req-1961, req-2038, req-2058, req-2060, req-2081, req-2106, req-2115, req-2117, req-2118, req-2119, req-2121, req-2160, req-2182, req-2191, req-2221, req-2235, req-2258, req-2297, req-2301, req-2340, req-2343, req-2350, req-2378, req-2517, req-2519, req-2549, req-2553, req-2555, req-2556, req-2560.

### Suite mechanics and gaps in the evidence

These describe how a suite drives the service, or a hole in what the evidence shows, rather than anything a trader sees: req-1609, req-1669, req-1670, req-1671, req-2238, req-2302, req-2345, req-2351, req-2371, req-2543.

### The specification document, not the service

These describe how a source is written rather than anything a user, operator or other system can observe: req-2161, req-2167, req-2181, req-2185, req-2211.

### Welsh sign-off

Design Release 2.1 is English only, and the Welsh copy is a machine draft that may not ship without Welsh Language Standards sign-off: req-376, req-475, req-554, req-948, req-2418.

### Page sign-off is its own reviewed change

Promoting a page is its own reviewed pull request and never part of other work, so no row of this programme raises a page's maturity: req-2324, req-2339, req-2370.

### Nothing designed, or nothing to build

No source asks for these, or no source settles them: req-191, req-1883, req-2341, req-2344, req-2462.

### Problems for the owning teams

Real problems, test gaps, mapping gaps and housekeeping in today's services that bringing them up to Design Release 2.1 does not touch. Each needs its own ticket with the owning team. Four are access-control or platform findings (req-1482, req-1556, req-1730, req-1154) and one is a platform limit (req-2292): the detail is in the programme's local files, not here. The rest: req-193, req-377, req-553, req-1105, req-1191, req-1283, req-1481, req-1483, req-1484, req-1485, req-1538, req-1555, req-1563, req-1573, req-1575, req-1578, req-1582, req-1584, req-1587, req-1591, req-1594, req-1602, req-1603, req-1717, req-1718, req-1724, req-1726, req-1733, req-1873, req-2109, req-2295, req-2296, req-2349, req-2354, req-2376, req-2377, req-2381, req-2382, req-2383, req-2387, req-2477, req-2478, req-2479, req-2515, req-2516, req-2541, req-2551.

## Terms used

| Term | Meaning |
|---|---|
| AB | The address book service repo, trade-imports-address-book |
| AF | The animals frontend's fit traces |
| APHA | Animal and Plant Health Agency |
| BE | The animals backend repo, trade-imports-animals-backend |
| CDP | The Core Delivery Platform, where the services are deployed |
| CDS | The Customs Declaration Service, whose codes name document types |
| CPH | County Parish Holding number |
| DR1 | Design Release 1, and the parity programme's notes and backlog that judged it |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| E2E | The end-to-end traces from the tests repo's animals and INS projects |
| FE | The animals frontend repo, trade-imports-animals-frontend |
| GBN-AG | The animals notification document published downstream |
| GBN-GP | The germinal products notification reference format |
| GBNAG_SPS_EX | The reference-data list of export countries for the animals notification |
| IF | The INS frontend's fit traces |
| INS | Import Notification Service |
| INS-BE | The INS read model repo, trade-imports-ins-backend |
| INS-FE | The INS front door repo, trade-imports-ins-frontend |
| ITAHC | Intra Trade Animal Health Certificate |
| MDM | Master Data Management, the service that owns reference-list content |
| MoJ | Ministry of Justice, whose frontend components are an accepted library |
| PF | The plants frontend repo, trade-imports-plants-frontend |
| PIMS | The downstream system the notification events reach |
| RD | The reference data repo, trade-imports-reference-data |
| V4 | Version 210 of the Live Animals & Germinals Data Fields Confluence page |
| WCAG | Web Content Accessibility Guidelines |
| claim | One statement an extractor took from one source, with its own id |
| conflict | Two or more sources disagreeing on one point, settled by precedence or raised as a question |
| cited | A working-set claim that a requirement or a conflict names as its evidence |
| delta | Whether a requirement is new, a change to what exists, or already in place |
| gap claim | A claim whose evidence is the absence of something in a source |
| held | A claim a second agent verified against its source |
| increment | One row of the backlog: a full-stack slice with its own acceptance criteria |
| inferred claim | A claim an extractor drew from a source rather than quoting it |
| perf | The performance test suite repo, trade-imports-performance-tests |
| precedence | The ranked order of sources that settles a disagreement |
| refuted | A claim a second agent could not find in its source, so it was dropped |
| review point | A check the owner makes once a theme is built; the build never waits for it |
| stub | The upstream stub repo, trade-imports-stub |
| tests | The test suite repo, trade-imports-ins-tests |
| theme | A group of increments whose code areas do not overlap, built on its own branch |
| working set | Every claim that survived verification, plus the claims reconcile added
