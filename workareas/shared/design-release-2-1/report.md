# Design Release 2.1: backlog report

## Summary

- The backlog has 102 increments: 75 ready to go, 25 blocked, 1 done and 1 dropped. The blocked ones wait on design (10), the INS dashboard's requirements (9), MDM commodities (2), and approved transporters, the address lookup, PIMS Dynamics outcomes and the plants backend (1 each). 12 rows are review points.
- **Changed 6 November (`ruling:ian-2026-11-06`):** the transporter decision is made and c-285 is lifted. The address book manages transporters as per-organisation records, like every other address, and adding one mid journey uses the address book hand-off already built for addresses (inc-077, inc-078, inc-080). 10 of the 11 blocked transporter rows are released, inc-044 was found already done on main (EUDPA-739), and inc-042 stays blocked on the address lookup alone. Approved transporters are parked, and the eight records the service ships today are them in an initial hardcoded form, so they moved off inc-037 onto a new blocked row, inc-265. The released rows were written when the journey owned transporters; the 6 November per-theme re-analysis (`reanalysis/REPORT-transporters-2026-11-06.md`) read them against current `main` and recorded what each still needs.
- It brings live animals, germinal products, their notification lists, the party and address pages, the notification lifecycle and the INS drill-downs up to Design Release 2.1 in look and feel. Plants changes in the same increments. It spans 9 repos in 10 themes here, beside 10 themes split off early.
- 30 questions are open. All 30 were challenged against precedence and every ruling; precedence settled none and none waits on a blocker. Each question lists the default built if nobody answers.
- Step 0: correct the goal in `sources.json`. The 26 October ruling and the 2 November widening of the V4 data fields page have moved past it.
- 144 requirements wait on someone outside the loop: the INS dashboard's requirements (59), design answers (30), MDM commodities (24), the address lookup (15), PIMS Dynamics outcomes (7), the plants backend (3), approved transporters (3), and CDP, the plants customs owner and the GBN-AG codelist owners (1 each). Of the 48 that waited on a transporter decision, `ruling:ian-2026-11-06` releases 42: inc-042's 3 move to the address lookup, which they already also waited on, and 3 stay parked with approved transporters on inc-265.
- Every one of the 10 split branches has work to pick up: 22 requirements adopted since the split and 142 changed, with 3 no longer to build. The branches are `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, `feat/EUDPA-691-…-journey-foundation`, `feat/EUDPA-692-…-reference-lists`, `feat/EUDPA-693-…-commodities-and-reason`, `feat/EUDPA-694-…-arrival-and-transit`, `feat/EUDPA-695-…-origin-page`, `feat/EUDPA-696-…-overview-and-review`, `feat/EUDPA-720-…-design-snagging`, `feat/EUDPA-724-…-documents` and `feat/EUDPA-707-…-address-book`.

## Before you build: step 0

**Correct the goal in `sources.json`.** Two things have moved past it: Sam's ruling of 26 October 2026, and the 2 November 2026 widening of the V4 Live Animals & Germinals Data Fields page (`confluence:6497338582`) to the whole page. As the rulings leave it, the goal reads:

- Bring the real GB notification services up to Design Release 2.1 in look and feel: content, wording, layout, components and question order.
- In scope: the GBN-AG animals notification as two sibling sets in the animals frontend (live animals and germinal products), each set's own list, its templates and the INS address book.
- Where a real service differs in look and feel, it changes to match. An owner ruling, a DR1 judgement, a real constraint, or the V4 data fields page on data, overrides that.
- Real constraints are persistence, validation, authentication, cross-service behaviour and accessibility.
- **Changed:** the V4 Live Animals & Germinals Data Fields page decides, for **both** the live-animals and the germinal-products sets, which fields a notification asks, each field's format, example and limits, whether it is mandatory to proceed or mandatory to submit, the level it applies at (notification, commodity line or unit), and which commodity codes each conditional rule covers. It outranks the prototype on data and on commodity-code conditions, including where a prototype data claim says otherwise: the prototype's `app/data` files are demo fixtures. Design Release 2.1 still decides how the pages look and read. A row of the page's Out of Scope Data Elements table de-scopes its field and outranks any source that still describes it.
- **Changed:** the V4 page may also add to data shapes, in both sets. It adds the free-text 'Identification details' and 'Description' identifiers (req-animal-identification-008, req-animal-identification-009), a tattoo on cattle and pigs, the 54-commodity package-count list that replaces Design Release 2.1's packaging list (req-112), the 17-commodity CPH list (req-699), the 12-country transit cap, the 58-character limits, the live-animal arrival window, the five parties' type, level and one-record rule, the transporter type and both transporter records, and unweaned animals on equines, cattle, pigs, sheep and goats (req-175, req-2137).
- **New:** 'Save and return to overview' makes exactly the same checks as 'Save and continue' on every page that has both buttons, in live animals, germinal products and high-risk plants, with no page an exception. This replaces the earlier soft-save decision (c-211, c-313). On either button a missing or not valid answer keeps the trader on the page with an error for each one, and what the trader typed is never dropped. Which answers a page needs before the trader moves on is each field's mandatory marking on the V4 data page — mandatory to proceed, as against mandatory to submit — not the button pressed.
- Where a row changes a page or behaviour plants also has, the same increment changes plants. Plants keeps its own questions and data.
- Every page works fully without JavaScript. JavaScript only enhances a page that already works.
- A behaviour uses GOV.UK Frontend first, then another tested government library (Ministry of Justice, HMRC, Scottish Government). Otherwise it goes back to design.
- No custom JavaScript copies the prototype, and no pop-ups are built: confirmations stay pages.
- JavaScript-only prototype behaviour is its own blocked increment, one per design question, in the waiting-on-design theme. Live filtering waits there too.
- A search box is the real accessible autocomplete over a native select. MDM supplies its entries. Only labels, order, hint and placeholder follow the prototype. Rolling the component out to more screens is EUDPA-635's work. Fields the prototype shows as plain selects stay plain.
- Reference-list content (countries, territories, ports) is whatever MDM serves through reference-data. It is never edited in code.
- Each notification list stays in its own frontend and is reframed in place, in the animals-dashboard theme, with plants' list in the same increments. Plants' list search, sort, additional filters, tabs and page size of 8 wait on `trade-imports-plants-backend` (deferred.md, inc-200).
- Every page the prototype sends to "the overall dashboard" goes to the set's own list.
- Adopted but blocked, each re-distilled once unblocked:
  - **Address search** waits until the INS address lookup is a real feature. Until then every add-address page offers manual entry only.
  - **The commodity catalogue and commodity search, live and germinal,** wait until commodities come from MDM. The pages' wording, journey place and questions go ahead on today's data, and so does moving today's germinal lines into the germinal set.
  - **Transporter management is decided and no longer blocked (`ruling:ian-2026-11-06`, 6 November, superseding the 9 October afternoon ruling and lifting c-285).** The address book manages transporters: a transporter is a record in `trade-imports-address-book` held per organisation, exactly as every other address is. Adding one mid journey uses the address book hand-off already built for addresses — the journey opens the INS front door's add pages in journey mode and lands back in the journey on save or cancel (inc-077, inc-078, inc-080, EUDPA-706) — not a second pattern of its own. The animals frontend's in-memory transporter register (`services/transporters/register.js`) is not the system of record. Adding, listing and searching, the type question, the add pages, the private transporter's country list and the address book's transporter tab all go ahead, and the unused register page was already removed (EUDPA-739, inc-044 done). **The data model is settled too.** A transporter is its own record in its own `transporters` collection inside the address book service, not the `Address` model: `AddressRequest` requires at least one role (`@NotEmpty`) and refuses a `type` outright (`@Null`), and a transporter carries an approval number, a private-or-commercial type and an approval status no address has. It reuses the service's organisation scoping, soft-delete, locking and the Standard Address Block field validation where the fields match. Transporters have **no roles** — no seventh `AddressRole`, no fourth `RoleGroup` — and store the private-or-commercial type instead, which decides the form, the field list and the country rule and so cannot be derived the way an address's type could. The INS front door's Transporter tab is a fourth tab backed by the transporters route, not a fourth role group over `addresses`. A **commercial** transporter's country is forced to the code `XI`, displayed as "Northern Ireland", held as constants with no reference-data lookup: MDM's country list is the origin and export list with no United Kingdom entry at all, and `XI` is already this estate's code for Northern Ireland (`trade-imports-schemas`' DOCOM samples). A **private** transporter keeps its real choice of country from the United Kingdom plus reference-data's export countries. **Parked:** approved transporters — an MDM-managed list offered to every organisation on top of its own — are out of scope for now, and that includes **the eight records the service ships today**, which Ian confirmed on 6 November are the approved transporters in an initial hardcoded form. They stay exactly as they are: main's two commercial placeholders are not replaced with Design Release 2.1's four, and the private records' addresses and approval numbers do not change. The whole of it sits on one blocked row, inc-265 (req-2172, req-397, req-398), so inc-037 builds the transporter list over whatever the organisation has itself added.
  - **The INS dashboard's summary information** waits until its requirements firm up: counts, glance cards, status-change cards and drill-downs. The INS home's controls and templates go ahead.
- The report groups work as ready or blocked, and names what each blocked row waits on.
- Architecture (sets, journeys, services, URL paths, field names, data shapes, code structure) stays the real services'. It changes only where a DR1 judgement, a real constraint, a kept look-and-feel requirement or the V4 data page needs it.
- The owner's rulings may add to data shapes. The 9 October ruling adds a notification category, germinal products details and trade-line typeCodes to the animals backend. The category is stored on the record only and is not published on the notification event.

Rows here also land after rows on the split branches, so those branches must merge first: 48 of the 100 rows carry an `externalDependsOn`.

## Decisions the pipeline made

**Repos (9 changed, 10 named).** The pipeline chose these from the goal and the rulings:

| Key | Repo | Why |
|---|---|---|
| frontend | trade-imports-animals-frontend | Both animals sets' pages, flow and copy, their lists and the germinal products set (86 rows) |
| backend | trade-imports-animals-backend | Notification record and lifecycle, list queries, germinal details and typeCodes (21 rows) |
| plantsfrontend | trade-imports-plants-frontend | Pages and behaviour plants shares with the animals sets, changed in the same increment (21 rows) |
| insfrontend | trade-imports-ins-frontend | The journey's add-address page and the blocked overall home and drill-downs (15 rows) |
| insbackend | trade-imports-ins-backend | The address lookup and the read model behind the drill-downs: every row blocked (inc-042, inc-132, inc-133, inc-143, inc-144) |
| addressbook | trade-imports-address-book | Role-scoped queries and the blocked transporter hand-over (inc-074, inc-075) |
| stub | trade-imports-stub | Northern Ireland lookup addresses (inc-042, blocked) |
| tests | trade-imports-ins-tests | Every service's end-to-end suite (97 rows) |
| perftests | trade-imports-performance-tests | k6 scripts a change breaks: inc-120, inc-129, inc-136, inc-128 |
| referencedata | trade-imports-reference-data | Port type that orders the port lists. Its only rows are on the split reference-lists branch, so nothing changes here |

Read but not changed: the Design Release 2.1 prototype (`defra-design/GB-notification-service` at 04a073b), its traces and specs, the DR1 parity notes and backlog, and the V4 Live Animals & Germinals Data Fields page. `trade-imports-schemas` and `trade-imports-dynamics-gateway` do not change (c-272, c-296). `trade-imports-plants-backend` is outside the programme, so inc-200 waits on it.

**Which source wins a disagreement**, highest first:

1. Sam's ruling of 26 October 2026 (`ruling:sam-2026-10-26`)
2. Sam's ruling of 9 October 2026, afternoon (`ruling:sam-2026-10-09-pm`)
3. Sam's ruling of 9 October 2026 on templates and the dashboard (`ruling:sam-2026-10-09-templates`)
4. Sam's ruling of 9 October 2026, morning (`ruling:sam-2026-10-09`)
5. Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`)
6. Live Animals & Germinals Data Fields V4, the whole page (`confluence:6497338582`)
7. DR1 parity programme notes (`document:dr1-parity-notes`)
8. DR1 parity backlog judgements (`document:dr1-parity-backlog`)
9. Design Release 2.1 prototype source (`prototype:dr2-1-source`)
10. Design Release 2.1 traces (`trace:prototype-dr2-1`)
11. Design Release 2.1 specs (`prototype:dr2-1-specs`)
12. Animals backend (`repo:backend`)
13. INS backend (`repo:insbackend`)
14. Address book (`repo:addressbook`)
15. Reference data (`repo:referencedata`)
16. Stub (`repo:stub`)
17. Animals frontend (`repo:frontend`)
18. INS frontend (`repo:insfrontend`)
19. Plants frontend (`repo:plantsfrontend`)
20. Tests repo (`repo:tests`)
21. Performance tests (`repo:perftests`)
22. Animals frontend fit traces (`trace:animals-fit`)
23. INS frontend fit traces (`trace:ins-fit`)
24. End-to-end traces (`trace:e2e`)

The prototype wins on look and feel by default. It never decides architecture. V4 outranks it on data, on format, on mandatory status and on which commodity codes a rule covers.

## Questions for Sam

All 30 questions were challenged against precedence and every ruling. Precedence settled none, and none waits on a blocker. Each question lists the default that will be built if nobody answers.

### 1. Does the plants contact picker also drop its five-a-page pagination and "Selected address" inset?

- **Default:** No. The contact picker keeps its paging and its inset, and takes only the shared layout change (req-1965).
- **Affects:** inc-087, inc-090.
- **Why it is open:** The afternoon ruling says plants' pickers lose pagination and the inset, under the role-filtered pickers. The plants contact picker asks for no role and lists the whole address book (c-291), so it reads either way (c-292).

### 2. What does the high-risk plants notification list's h1 say?

- **Default:** "Plants", the prototype's own label for plants notifications (req-2029).
- **Affects:** inc-129.
- **Why it is open:** The reframed list names its category in the h1. The prototype has no plants list, and nothing names plants' category for a heading. Today plants' h1 is "Import notification service" (c-303).

### 3. In template mode, how high is the bar a journey page's checks set?

- **Default:** The same bar as a notification. A malformed answer is refused, and an answer the page requires is refused with an error naming each one. What a template asks differently stands: no arrival date, an optional name, unanswered sections allowed (req-2049).
- **Affects:** the template-mode rows on the type-question-and-templates branch, and inc-186.
- **Why it is open:** The 26 October ruling settles that both save buttons make the same checks. The templates ruling hedges on how high the bar is ("perhaps with different validation", "I don't know"), and no trace fills most template-mode pages (c-308). The mode chooses the checks in one place, so an answer changes no page.

### 4. Does a template hold every answer a notification holds, or only those Design Release 2.1 saves?

| Answer | Default |
|---|---|
| Arrival date and time | Never asked or held (req-1345) |
| Documents | Never asked or held (req-543) |
| Transit countries, live animals | Held as answered and seeded, because the design offers their Change link (req-2112) |
| Germinal products | Whatever the germinal pages ask, less the arrival date |
| Storage | The notification's own shape on the same pages, with no separate template data model |

- **Default:** as the table shows. Plants has no templates.
- **Affects:** the template rows on the type-question-and-templates branch, and inc-186.
- **Why it is open:** The templates ruling hedges with "maybe the same data". The 9 October ruling gives the prototype which questions are asked. Design Release 2.1 contradicts itself on transit countries: a Change link for answers it never saves (c-318).

### 5. What does the animals origin page say when no country of origin is given?

- **Default:** The same message a country that is not in the list gets, "Select a country from the list", in the error summary and inline, with the field cleared and focused from the summary link (req-2123).
- **Affects:** the origin-page branch, which picks up req-032 and req-2124.
- **Why it is open:** V4 makes the country mandatory to proceed but gives no message. Design Release 2.1 defines none, and the two real frontends word their country errors differently on purpose (c-320).

### 6. Is the region of origin code chosen from a reference list, or typed?

- **Default:** Typed. The trader types the part after the fixed country prefix, and no region list is read (req-2127 is not built as a list).
- **Affects:** the origin-page branch, and req-040 and req-041 on the design-snagging branch.
- **Why it is open:** V4's source cell reads two ways: either the field's MDM source is only the country prefix it is built from, or the regions themselves come from a list. Nothing ranks them, and they build different things (c-322).

### 7. Does "numeric - max 10" on the live-animal number of packages limit the digits or the number of packages?

- **Default:** The digits. A number of packages longer than 10 digits is refused on that species' field (req-2133).
- **Affects:** the commodities-and-reason branch, and inc-017 and inc-177 for the germinal copies.
- **Why it is open:** The same table writes "max 9,223,372,036,854,775,807" as a value for the number of animals, while this row's own examples of 25 and 5000 can only be digit counts (c-325).

### 8. What is the agreed maximum number of species a trader may choose under one commodity?

- **Default:** No cap. The commodity page accepts every species a commodity offers (req-2134).
- **Affects:** the commodities-and-reason branch.
- **Why it is open:** V4 states that a maximum exists but never gives the number, and no ruling gives one (c-326).

### 9. Does "Applies at: Commodity Level" put the number of animals and the number of packages once per commodity, or once per species?

- **Default:** Once per species, in that species' own block on Commodity details (req-2135).
- **Affects:** the commodities-and-reason branch, and inc-017 and inc-177.
- **Why it is open:** V4 gives the level but never says what a commodity line holds. The real service's line is one commodity plus one species. The two readings build different pages (c-327).

### 10. What typed form does the exit date accept, and what does its hint show?

- **Default:** A day/month/year date with a four-digit year and one or two digits for day and month, hinted "For example, 27/3/2026" (req-2139).
- **Affects:** the commodities-and-reason branch's main import reason rows.
- **Why it is open:** V4 outranks the prototype on a field's format and example and gives DD/MM/YYYY with 27/03/2026. The MOJ date picker the field is built from fills it with no leading zeros, so the strict reading refuses what the component itself writes (c-330).

### 11. Does the germinal-products set capture an exit date?

- **Default:** No. The set offers only Internal market and Transit, and neither calls for one (req-2141).
- **Affects:** inc-024, inc-182.
- **Why it is open:** V4 contradicts itself: it marks the exit date as applying to germinals, yet the only reason that asks for one is marked animals-only and left out of the germinals journey's two reasons. Precedence cannot settle a disagreement inside one source (c-331).

### 12. Is a tattoo identifier asked for on cattle (0102) and pigs (0103)?

- **Default:** Yes. A cattle panel asks for a tattoo after ear tag and passport, and a pig panel asks for one as well as an ear tag (req-2154, req-2155).
- **Affects:** inc-241; the pig half waits with inc-051 and the MDM catalogue.
- **Why it is open:** V4's tattoo list names 0102 and 0103, and V4 outranks the prototype on which commodities a rule covers. V4 contradicts itself here: the list holds five entries while its title counts two, and it names 0102 "Bovine" in this list and "Cattle" in the others (c-334).

### 13. Does the notification still capture a microchip identifier?

- **Default:** Yes. "Microchip" is the first identifier a cat, dog or ferret panel (01061900) and a horse panel (0101) asks for (req-2153, req-222, req-223).
- **Affects:** inc-241.
- **Why it is open:** V4's six animal identifier fields leave the microchip out, but V4 never says it is out of scope, and it de-scopes a field explicitly when it means to, as it did for the wing ring (c-335).

### 14. How much identification must a live-animals notification hold before it can be submitted?

- **Default:** The 9 October ruling's bar. Identification is optional with one species; with several, each species with identifier fields needs at least one saved animal with at least one identifier (req-248, req-249).
- **Affects:** inc-049 (dropped on this default) and the overview-and-review branch's submit gate.
- **Why it is open:** V4 asks instead for an identifier for every animal. The ruling expressly does not say how many records a notification needs, and the germinal twin of this question went V4's way (c-277), so the two sets sit on different bars until this is settled (c-336).

### 15. Do the identification page's save buttons keep what the trader typed in every species panel?

- **Default:** Yes. Every save on the page, whichever button, checks every open species panel and saves one animal for each panel holding a value, which is what the service does today (req-203, req-204).
- **Affects:** inc-238, inc-241, inc-242.
- **Why it is open:** The 26 October ruling states the principle that what a trader typed is never dropped, in general terms, but its words reach only the Enter key, and the recommendation behind the principle is not quoted. Design Release 2.1's own source records its rule as a silent loss of a filled-in form (c-337).

### 16. What does pressing Enter do in a single-animal species panel, or outside any panel?

- **Default:** It submits the page as "Save and continue", which is what the service does today (req-2159).
- **Affects:** inc-242.
- **Why it is open:** The 26 October ruling rules on Enter only in a panel for several animals (req-2158, adopted). It says nothing about the rest of the page (c-338).

### 17. Do the transporter forms take the Standard Address Block's field list, labels and limits?

- **Default:** No. Both forms keep the labels and limits the transporter pages already use, following the block's field rules wherever the two describe the same field the same way (req-2171).
- **Affects:** inc-040, inc-041, both blocked with transporter management.
- **Why it is open:** V4 types both records as the Standard Address Block and points their validation at it, but the block's own field list sits in the page's Address Block sub-section rather than on the transporter rows, so the transporter evidence cannot be read against it (c-347).

### 18. Is "Journey log" still a document type a trader may choose?

- **Default:** Yes. The select keeps the option (req-499).
- **Affects:** the documents branch, and inc-179 for the germinal copy.
- **Why it is open:** V4 contradicts itself: its change log de-scopes Journey Log in May 2026, and its document type list, replaced in October 2026, still names it. Precedence cannot settle a disagreement inside one source (c-350).

### 19. What makes the add-a-document form a document to add: any detail entered, or the document type alone?

- **Default:** Any one of the four details. Both save buttons check all four, hold the trader on the page with an error for each missing or invalid one, and keep everything already entered (req-2178).
- **Affects:** the documents branch (req-540), and inc-179.
- **Why it is open:** The 26 October ruling and V4's all-or-nothing marking point one way; Design Release 2.1, the real page and V4's own intro, which makes the other three mandatory only once a type is chosen, point the other. V4 marks the same fields both ways (c-351).

### 20. How are the three parts of a CPH number sized: 2, 3 and 4 digits, or 3, 3 and 3?

- **Default:** 2, 3 and 4. The hint reads "For example, 12/345/6789." and the number shows as 12/345/6789 (req-709, req-2122).
- **Affects:** inc-091, inc-092, inc-093.
- **Why it is open:** V4's slashed example groups the nine digits 3, 3 and 3, while Design Release 2.1, the service and the decision on req-709 group them 2, 3 and 4. V4 outranks the prototype on a field's format and example but leaves how a page reads to the prototype, and three labelled, sized boxes are both at once (c-358).

### 21. Where do the addresses the contact address page offers come from?

- **Default:** The organisation's address book, newest added first, as today (req-760, req-762).
- **Affects:** inc-095.
- **Why it is open:** V4 gives the contact address two rows, one consumed from gov.identity and one the user creates, both labelled Contact Address and sharing one anchor, and never says whether they are one field with two sources or two fields. Nothing in the journey reads an address from Defra ID today, and the literal reading rebuilds the page against a different service (c-359).

### 22. Do the permanent address, and a contact address the trader creates, ask for a country?

- **Default:** No. Both ask the eight fields Design Release 2.1 draws, with the country fixed to United Kingdom (req-738, req-740, req-756).
- **Affects:** inc-055, inc-095, and the address-book branch's add form.
- **Why it is open:** V4 types both as the Standard Address Block and sends field-level validation there, and the permanent address example carries a country line. The block's own fields are specified in a part of the page this area does not hold (c-360).

### 23. Does the notification submitted page's ITAHC rule reach germinal products and plants?

- **Default:** The germinal copy of the page takes the same rule; plants' confirmation gains nothing (req-929).
- **Affects:** inc-105, inc-182, and the overview-and-review branch.
- **Why it is open:** The 26 October ruling gives the rule for the live-animals page and leaves the other sets unstated. Plants' confirmation has no outstanding-items list at all (c-364).

### 24. Does the same-checks rule reach plants' check answers, which collects no answers?

- **Default:** No. Plants' check answers keeps its Save and return to the hub (req-2010).
- **Affects:** the overview-and-review branch's plants check answers rows.
- **Why it is open:** The ruling's rule is written for pages that collect answers and show an error against each one, and the review page collects none, so nothing ranks the two readings (c-365).

### 25. What makes a germinal products notification need action?

- **Default:** It is submitted and a document the germinal set requires is still missing, with no identifier test (req-2193).
- **Affects:** inc-132, inc-134, both blocked on the INS dashboard's requirements.
- **Why it is open:** The live animals rule names an ITAHC or health certificate and an animal identifier, and the germinal set asks for neither. The prototype seeds germinal demonstration data rather than a rule, and no ruling says what counts as outstanding (c-366).

### 26. Does the delete success banner re-case the address's name to sentence case?

- **Default:** Yes. The banner reads, for example, "Green valley farm address deleted" (req-2194).
- **Affects:** the address-book branch's delete banner row (req-1148).
- **Why it is open:** The prototype wins on copy, and its driving spec pins the sentence case, but lower-casing the rest of a name the user typed changes how their own data is shown, and the real book holds names such as "Alpine Dairy GmbH" that it would mangle (c-367).

### 27. What does "Filter addresses" do when the list loads with a search or Type already applied?

- **Default:** It is open as the page loads, showing the search term and the type the results are filtered by (req-2195).
- **Affects:** the address-book branch's filter rows (req-1115, req-1133).
- **Why it is open:** The prototype filters in the browser, so its list never loads with a filter applied, and its design says nothing about that case. Filtered on the server, a disclosure that is always collapsed hides what the shown results rest on (c-368).

### 28. Does a postcode stay mandatory, and capped at 12 characters, for a country with no postal code system?

- **Default:** Yes. An address needs a postcode or Zip code whatever country is chosen, as free text of at most 12 characters (req-2200).
- **Affects:** the address-book branch's add and edit rows.
- **Why it is open:** Every source marks the field mandatory, and V4, which outranks the prototype on data, flags its own gap rather than answering it (c-369).

### 29. What switches the amend review's heading from "Review your notification" to "Review before re-submitting"?

- **Default:** Saving an answer that differs from the submitted one. Until then the page reads "Review your notification", in live animals, germinal products and plants (req-2205).
- **Affects:** inc-120, and the overview-and-review branch's amend review rows.
- **Why it is open:** Design Release 2.1 wins on both headings but never shows which event switches them. The other reading is a flag set the moment the trader opens a question page from the review, which builds something different (c-371).

### 30. How far do the checks on both save buttons reach: every mandatory answer on the page, or only the answers the page already refuses?

- **Default:** Only the answers the page already refuses. Each page keeps its existing hard stops and adds nothing; an answer that is mandatory to submit may be left blank while the trader is filling in the notification (req-1625, req-1641, req-2206). A blank party pick and an empty section on the roles and addresses page stay as Design Release 2.1 designs them and as the 9 October afternoon ruling gave plants' pickers (req-581, req-603).
- **Affects:** inc-243, inc-244, inc-245, and every save-button row across the split branches.
- **Why it is open:** "Exactly the same checks as Save and continue" and "an error message for each answer that is missing or not valid" are both the top-ranked source's own words, so precedence ranks neither. The second reading would stop a trader leaving a part-filled page at all and undo the leave-and-come-back model the overview's statuses and the review page's submit enforce (c-372).

## Waiting on others

186 adopted requirements wait on someone outside the build loop. A blocker is never a question: the design is settled, and the row builds once somebody acts. Where a requirement's row lives on a split branch, the Increment column names the branch; "pick-up" means the branch has no row for it yet and must add one.

| Requirement | Waiting for | Increment |
|---|---|---|
| req-951, req-954, req-955, req-971, req-972, req-980, req-981, req-1023, req-1025, req-1848, req-1850, req-1905, req-2027 | INS dashboard requirements firm up and are agreed. The 9 October rulings name nobody to do it | inc-128 |
| req-967, req-983, req-984, req-985, req-986, req-987, req-988, req-989, req-993, req-994, req-995, req-996, req-1014, req-1015, req-1019, req-1022 | INS dashboard requirements | inc-132 |
| req-990, req-991, req-992 | INS dashboard requirements | inc-133 |
| req-973, req-975, req-976, req-978 | INS dashboard requirements | inc-134 |
| req-974, req-977, req-997, req-998, req-999, req-1000, req-1001, req-1002 | INS dashboard requirements | inc-143 |
| req-1004, req-1005, req-1006, req-1007, req-1008, req-1009, req-1010, req-1011, req-1012, req-1013 | INS dashboard requirements | inc-144 |
| req-979 | INS dashboard requirements | inc-145 |
| req-982 | INS dashboard requirements, plus the plants services publishing to the INS read model | inc-146 |
| req-1039, req-1040 | INS dashboard requirements | inc-139 |
| req-1735 | INS dashboard requirements | inc-142 |
| req-397, req-398, req-2172 | Approved transporters are unparked. `ruling:ian-2026-11-06` decision 3 puts them out of scope for now, and that includes the eight records the service ships today, which are the approved transporters in an initial hardcoded form. Which approved-transporter list the commercial records come from is settled with them; the data specification leaves it as its one open point and names nobody | inc-265 |
| req-075, req-076, req-080, req-081, req-094, req-095, req-096, req-097, req-098, req-099, req-100, req-101, req-112, req-1656, req-1919 | MDM serves the commodity, type and species lists through trade-imports-reference-data | split branch commodities-and-reason |
| req-2130, req-2131, req-2137 | MDM commodities | pick-up on commodities-and-reason |
| req-093, req-1783, req-1800 | MDM commodities | inc-191 |
| req-219, req-220, req-2146 | MDM commodities | inc-051 |
| req-458, req-649, req-652, req-653, req-654, req-1214, req-1216, req-1285, req-1864, req-2044 | Design answers question 10 (address search's layout), and the INS address lookup becomes a real feature | inc-194 |
| req-072, req-073, req-074, req-1782 | Design answers question 3 (commodity search as you type), and MDM commodities | inc-014 |
| req-348, req-349, req-353, req-354 | Design answers question 4 (transit countries in place) | inc-030 |
| req-040, req-041 | Design answers question 2 (the region code prefix following the picked country) | split branch design-snagging |
| req-592, req-2039 | Design, with the product owner, answers question 5 (live filtering as the trader types) | inc-193 |
| req-1951 | Design answers question 6 (the place of origin picker's filtering) | inc-193 |
| req-711, req-712 | Design answers whether the county parish holding boxes want this JavaScript on top of the boxes Sam ruled on 20 October | inc-093 |
| req-1986 | Design answers question 8 (Copy buttons, with an accepted component) | inc-198 |
| req-1393 | Design answers question 9 (the amend and cancel-amendment pop-ups); the expected answer drops the row | inc-195 |
| req-1299 | Design answers question 11 (the templates sort) | pick-up on type-question-and-templates |
| req-253 | Design answers question 12 (the germinal dates' calendar) | inc-192 |
| req-020 | Design answers question 13 (whether the autocomplete's own announcements can stand) | inc-189 |
| req-456, req-457, req-1819 | The INS address lookup becomes a real feature: today only the EUDPA-390 spike exists, gated to dev and local and not wired in | inc-042 |
| req-1957 | The address lookup becomes a real feature | inc-194 |
| req-647, req-648, req-650, req-651, req-1217, req-1218, req-1863, req-2043 | The address lookup becomes a real feature | split branch address-book |
| req-1081, req-1082, req-1083, req-1085, req-1739 | The authorities' case system (PIMS Dynamics) sends post-submission outcomes back to the notification record | inc-142 |
| req-910, req-2114 | PIMS Dynamics outcomes | split branch overview-and-review |
| req-2034, req-2035, req-2036 | trade-imports-plants-backend, outside the programme, lets plants' list query by status, keyword and arrival date and ask for a page size of 8 | inc-200 |
| req-509 | CDP raises the nginx ingress request-body cap in front of trade-imports-animals-frontend to at least 50,001,024 bytes, confirmed against EUDPA-518 | split branch documents |
| req-2002 | The plants policy or customs owner confirms plants' own customs document code; the programme owner names who confirms it | split branch overview-and-review |
| req-2179 | The owners of the GBN-AG document-type codelist add codes for Self-declaration, CITES permit/certificate and Packing list / species list | pick-up on documents |

## Settled without a question

330 conflicts were settled by precedence. This run's challenge settled none, so no question a ruling answered is written as a question here. The 26 October ruling and the widened V4 page settled 27 new conflicts (c-319 to c-370) and withdrew the soft save recorded in c-211 and c-313. Missing ids (c-046, c-051, c-086, c-118, c-137, c-182, c-199, c-200, c-254, c-257, c-270, c-356) were merged or withdrawn during reconcile.

| Decision | Settled by | Conflict |
|---|---|---|
| Country of origin list keeps what MDM serves; the prototype's content goes to MDM as a content report; nothing waits on MDM | DR1 notes, 9 October rulings | c-001 |
| Country of origin is stored as its ISO code and shown by name | 7 October ruling | c-002 |
| Origin page keeps all three return controls | DR1 notes | c-003 |
| Saving origin with no country lands on the overview | 7 October ruling | c-004 |
| Origin page keeps its server checks; a refused save stores nothing | 7 October ruling | c-005 |
| Accessibility and no-JavaScript duties override Design Release 2.1 only as far as they need to; every page works without JavaScript | 7 October ruling, 9 October afternoon ruling | c-006 |
| A start from the all-types dashboard asks "What are you importing?" first, in the INS front door, on today's INS home | DR2.1 source, 9 October rulings | c-007 |
| Region code prefix is drawn on the server now; the live prefix waits on design question 2 | 9 October afternoon ruling | c-008 |
| Country control stays the accessible autocomplete: no hint, "Search for a country" placeholder, in animals and plants | 9 October afternoon ruling | c-009 |
| Region code hint changes, box caps at 5 characters, server check stays | 7 October ruling | c-010 |
| Internal reference hint drops the 58-character sentence; the limit stays | 7 October ruling | c-011 |
| Commodity search stays on the server behind Search; search as you type waits on design question 3 and MDM | 9 October afternoon ruling | c-012 |
| Commodity search hint takes Design Release 2.1's wording | DR2.1 source | c-013 |
| Correct the prototype's species typos rather than copy them | 7 October ruling | c-014 |
| Commodity pages chain as journey steps; opened from the overview, a page returns there | DR2.1 source, 9 October ruling | c-015 |
| Commodity details keeps the three return controls (DR1 rule (b)) | DR1 notes | c-016 |
| "Error: " title prefix stays | 7 October ruling | c-017 |
| Commodity details still redirects when no commodity is chosen | 7 October ruling | c-018 |
| Live-animal number of packages stays optional but validated | 7 October ruling | c-019 |
| Cat and dog species take Design Release 2.1's names | DR2.1 source | c-020 |
| After a change from check answers, both commodity pages return there | 7 October ruling | c-021 |
| Germinal "Total gross weight" is each line's gross weight in kg: stored and shown, not published | 9 October ruling, V4 | c-022 |
| Answers stay stored as service codes | Rulings | c-023 |
| Off-list values are refused; a refused submit saves nothing | 7 October ruling | c-024 |
| One shared destination country and port of exit, prefilled in each reveal | DR1 backlog, 9 October ruling | c-025 |
| Destination select built now: reference-data's GBNAG_SPS_EX countries and subdivisions, labelled "<territory> (<parent>)" | 9 October ruling | c-026 |
| Both port of exit selects offer the whole ports-of-entry list now; no exit-only list | 9 October ruling | c-027 |
| "Error: " title prefix stays | 7 October ruling | c-028 |
| Reason page heading becomes "Main import reason" | DR2.1 source | c-029 |
| Reason page Back goes to the previous page, or the hub | DR2.1 source | c-030 |
| Reason page continues to Commodity details | DR2.1 source | c-031 |
| Destination country placeholder "Select one", no divider | DR2.1 source | c-032 |
| Port of exit placeholder "Select one", no divider | DR2.1 source | c-033 |
| Certification hint becomes "You can find this information on the ITAHC." | DR2.1 source | c-034 |
| Cattle and pigs are asked the unweaned question | DR2.1 source | c-035 |
| Additional details Back goes to the previous journey page | DR2.1 source | c-036 |
| Additional details sits after identification or commodity details, then Arrival details | DR2.1 traces | c-037 |
| Main reason task completes on its own answers | DR2.1 source | c-038 |
| Identification page keeps the real address, guards, tokens and field names | Rulings | c-039 |
| Identifier limit and stale-action safeguards stay | 7 October ruling | c-040 |
| One identifier is enough; Complete uses the submit bar; DR1 inc-103 is closed | 9 October ruling | c-041 |
| A partly filled animal saves with no error; an animal with no identifier is refused | 9 October ruling | c-042 |
| Commodity details refuses a count below the saved records | DR1 backlog | c-043 |
| Permanent address leaves the identification page for its own page | 7 October ruling | c-044 |
| Arrival and transit keep every server-side field check | 7 October ruling | c-045 |
| Pages keep submitting and storing codes | Rulings | c-047 |
| Port of entry and transit lists built now from MDM content; ports ordered airports, seaports, rail | 9 October ruling | c-048 |
| Arrival date is the expected arrival at the port of entry | 7 October ruling | c-049 |
| Arrival date hint keeps its wording with an example inside the window | 7 October ruling | c-050 |
| Each transporter row gets "View details"; it waits with transporter management | DR2.1 source, 9 October rulings | c-052 |
| Status strip follows Design Release 2.1 page by page on transporter pages; waits with transporter management | DR2.1 source | c-053 |
| Private transporter country list is the UK plus GBNAG_SPS_EX countries as MDM serves them; waits with transporter management | 9 October rulings | c-054 |
| A commercial transporter with a non-Northern Ireland country is refused | 7 October ruling | c-055 |
| Add transporter forms keep DR1's return controls and add "Cancel and return to dashboard"; waits with transporter management | DR1 notes | c-056 |
| Design Release 2.1's shipped commercial transporters and statuses are adopted; wait with transporter management | 7 October ruling | c-057 |
| Added transporters stay scoped to the organisation, in both sets | Rulings | c-058 |
| Documents page stays at accompanying-documents | 9 October ruling | c-059 |
| Documents Back returns to the review when come from it, else the overview | DR2.1 source | c-060 |
| Row drops the leading "An" | DR2.1 source | c-061 |
| Row drops the leading "An" | DR2.1 source | c-062 |
| Document reference hint removed | DR2.1 source | c-063 |
| Document reference keeps its 58-character limit | 7 October ruling | c-064 |
| Document references accept punctuation; the backend drops its pattern | DR2.1 source | c-065 |
| Document type travels as the service code | 7 October ruling | c-066 |
| Date of issue hint "For example, 27/3/2026" | DR2.1 source | c-067 |
| Size bullet opens "files that are smaller than" | DR2.1 source | c-068 |
| File limit becomes 50MB everywhere | DR1 backlog and DR2.1 source | c-069 |
| File-type bullet drops the leading "a" | DR2.1 source | c-070 |
| Stated file rules stay enforced | 7 October ruling | c-071 |
| GOV.UK file upload component stays | DR1 backlog | c-072 |
| Chosen file is not kept after a server error | 7 October ruling | c-073 |
| Typed values are not restored after an over-cap body | 7 October ruling | c-074 |
| Maximum-documents error points at the Attachment field | DR2.1 source | c-075 |
| Hidden column heading becomes "Action" | DR2.1 source | c-076 |
| Empty-state line goes | DR2.1 source | c-077 |
| Virus scanning stays real, with failure states | 7 October ruling | c-078 |
| View file stays for clean documents | 7 October ruling | c-079 |
| Save and continue stops waiting for scans; a rejected document still holds | DR2.1 specs | c-080 |
| Upload documents continues to consignment addresses, or back to where the trader came from | DR2.1 source | c-081 |
| Save and return checks and saves a part-filled document | DR2.1 source | c-082 |
| Upload documents link opens once the origin is answered | DR2.1 specs | c-083 |
| Documents are stored durably by the backend | 7 October ruling | c-084 |
| Document types drop "Health certificate" | 7 October ruling | c-085 |
| Roles and addresses keeps its summary list, with full addresses | DR1 backlog | c-087 |
| Fraud warning ends with a full stop | DR2.1 source | c-088 |
| Each empty row's add link names what it adds | DR2.1 source | c-089 |
| Answered party rows show the whole address | DR2.1 source | c-090 |
| Germinal products are their own set with no CPH page; live animals still exempts only 0101 and 01061900 | 9 October ruling | c-091 |
| Roles and addresses continues to contact address on the opening run, or the overview once complete; from the overview it returns there | DR2.1 source, 9 October ruling | c-092 |
| Picker's "Add a new address" looks and sits as drawn | DR2.1 source | c-093 |
| Pickers show one page per role, searched on the server; filtering as you type waits on design question 5; plants' consignor and destination pickers too | 9 October afternoon ruling | c-094 |
| Picker count wording follows Design Release 2.1 | DR2.1 source | c-095 |
| Picker address column shows one line per address line | DR2.1 source | c-096 |
| Animals picker rows get a "View" link to the INS address book; plants' pickers keep their own | DR2.1 source, 9 October afternoon ruling | c-097 |
| A blank picker save returns to roles and addresses, party unchanged; an address not in the book is refused | DR2.1 source | c-098 |
| Party pickers end with the primary button alone | DR1 notes | c-099 |
| DR1's address-page blocks do not stop these differences | 7 October ruling | c-100 |
| Records with no role yet appear on every picker; plants' consignor and destination pickers filter by role too | DR1 backlog (inc-048), 9 October afternoon ruling | c-101 |
| Place of origin picker searches by country with a submit button; its live row filter waits on design question 6 | 9 October afternoon ruling | c-102 |
| The party is named "Consignor", in animals and plants | DR2.1 source, 9 October afternoon ruling | c-103 |
| Roles and addresses completes when every shown section is complete | DR2.1 source | c-104 |
| Picker search has a medium label and an icon button "Search", in animals and plants | DR2.1 traces, 9 October afternoon ruling | c-105 |
| Journey add-address stays on the INS address book through today's handshake | Rulings | c-106 |
| Manual-entry Country list built now with what MDM serves; "Select one" placeholder built | 9 October ruling | c-107 |
| Add-address keeps the address book's length and email checks | 7 October ruling | c-108 |
| Add-address keeps GOV.UK accessibility patterns | 7 October ruling | c-109 |
| CPH page keeps "Save and continue" alone | DR1 notes | c-110 |
| Permanent address page ends with "Save and continue" alone | DR1 notes | c-111 |
| CPH is stored as 9 digits and shown as 12/345/6789 | 7 October ruling | c-112 |
| CPH page can be saved blank | DR2.1 source | c-113 |
| Part-filled CPH numbers are still checked | 7 October ruling | c-114 |
| CPH Back and Save go to consignment addresses | DR2.1 source | c-115 |
| Addresses page continues to contact address; from the overview it returns there | DR2.1 source, 9 October ruling | c-116 |
| CPH help's second paragraph takes Design Release 2.1's wording and link | 7 October ruling | c-117 |
| Permanent address page and same-as-destination are built now | 7 October ruling | c-119 |
| Contact page's sentence, structure and add-a-branch are built now | 7 October ruling | c-120 |
| Contact page offers only the organisation's branch addresses | DR2.1 source (DR1 agrees) | c-121 |
| A blank contact save shows "Select a contact address" | DR2.1 source | c-122 |
| Contact page continues to review on the first pass; from the overview it returns there | DR2.1 source, 9 October ruling | c-123 |
| Contact stays complete when the address-book record goes | 7 October ruling | c-124 |
| Contact page drops the "Current contact address" card; the edit route stays | DR2.1 source, 9 October ruling | c-125 |
| A new permanent address keeps its county and fields | 7 October ruling | c-126 |
| Hub "Cancel amend" goes to the cancel-amendment confirmation page | 9 October afternoon ruling | c-127 |
| Each notification keeps its own hub, in each set's own path | Rulings | c-128 |
| Hub keeps the GOV.UK Task list component | 7 October ruling | c-129 |
| Transport card shows the transporter's stored country | 7 October ruling | c-130 |
| Submitted view shows the notification's own answers | 7 October ruling | c-131 |
| Declaration submit keeps its completeness re-check | 7 October ruling | c-132 |
| Identifier-driven outstanding items built now, with no blocker | 9 October ruling | c-133 |
| Review names unfinished commodity and species answers as drawn | DR2.1 source | c-134 |
| Review error summary has one entry per unfinished card | 7 October ruling | c-135 |
| Amend review opens without errors; an incomplete amendment is refused with errors | 7 October ruling | c-136 |
| Review drops row-level "Edit details" links | 7 October ruling | c-138 |
| Review keeps errors from real validation | 7 October ruling | c-139 |
| Review keeps virus-scan errors | 7 October ruling | c-140 |
| Transit countries move into Arrival details on the review | DR2.1 source | c-141 |
| Subsection headings above review cards go | DR2.1 source | c-142 |
| "Return to your dashboard" and the view's Back go to the set's own notification list | 9 October afternoon and templates rulings | c-143 |
| Continue on an action-required view starts an amendment | 7 October ruling | c-144 |
| INS root becomes the Design Release 2.1 overall dashboard, blocked with the summary information; today's table stays meanwhile | DR2.1 source, 9 October rulings | c-145 |
| Home title "Dashboard - Import notification service - GOV.UK" built now; caption and h1 wait with the overall home | DR2.1 source, 9 October afternoon ruling | c-146 |
| "Create new" always shows and goes to the type choice, built now on today's home | 7 October ruling, templates ruling | c-147 |
| Glance counts come from the organisation's real notifications, and wait on the INS dashboard requirements | 7 October ruling | c-148 |
| "Action needed" means a submitted notification missing a required document or identifier ("Submitted action required") | DR2.1 source, 9 October rulings | c-149 |
| No "Messages" link or unread count | 7 October ruling | c-150 |
| Plants "View dashboard" links to the real plants dashboard | 7 October ruling | c-151 |
| Plants glance cards link like the others; the cards and counts wait (req-982) | 7 October ruling, 9 October afternoon ruling | c-152 |
| "Log out" stays | 7 October ruling | c-153 |
| Drill-down cards keep status-driven links | DR1 notes | c-154 |
| Drill-downs apply the chosen search and sort | 7 October ruling | c-155 |
| Home and drill-downs take Design Release 2.1's styling | DR2.1 traces | c-156 |
| Drill-downs are always sorted, "Newest first" by default | DR1 notes | c-157 |
| Per-category glance cards replace DR1's band | 7 October ruling | c-158 |
| Each list stays in its own frontend at its set root, reframed in place; the animals backend's list gains the category filter | 9 October afternoon and templates rulings | c-159 |
| Drafts keep Resume, Copy as new and Delete; submitted cards keep status actions; plants mirrors with its own actions | 7 October ruling (DR1 inc-030) | c-160 |
| List is always sorted: "Newest first", "Oldest first", "Arrival date" | DR1 notes | c-161 |
| Search, sort and filters really change the list, through one GET form | 7 October ruling | c-162 |
| Page links keep tab, sort, search and filters | 7 October ruling | c-163 |
| Card writes the arrival date as "21 June 2026" | DR2.1 source | c-164 |
| Amending notifications sit in "In progress" with an "Amending" tag | 7 October ruling | c-165 |
| Unreadable or reversed filter dates show GOV.UK errors | 7 October ruling | c-166 |
| DR1's deferred dashboard rows do not hold back Design Release 2.1 | Rulings | c-167 |
| Address book shows 8 a page | DR2.1 source | c-168 |
| Address book search runs on the server; filtering as you type waits on design | 9 October afternoon ruling | c-169 |
| Address book honours same-site and approved cross-origin returns | 7 October ruling | c-170 |
| INS list drops controls Design Release 2.1 lacks; the banner stays and stops hiding itself | 7 October ruling, 9 October afternoon ruling | c-171 |
| Address book stays persisted and organisation-wide | 7 October ruling | c-172 |
| Address view reads the book only | 7 October ruling | c-173 |
| View link keeps the visually hidden name | 7 October ruling | c-174 |
| Log out stays in the INS navigation | 7 October ruling | c-175 |
| Address records gain their type and uses, in the address book's own field shape | 9 October ruling | c-176 |
| Country select offers reference data's unfiltered list, as MDM serves it | 9 October ruling | c-177 |
| Address search uses the real lookup and is blocked until it is real; its JavaScript also waits on design | Rulings | c-178 |
| Length limits and email check stay | 7 October ruling, V4 Standard Address Block | c-179 |
| Error-state accessibility stays | 7 October ruling | c-180 |
| Addresses persist; an edit keeps every use | 7 October ruling | c-181 |
| Templates are stored by the backend, with no seeded examples | Rulings | c-183 |
| A template is private to the user who saved it | DR2.1 source | c-184 |
| Manage templates has no sort control now; a real sort waits on design question 11 | 9 October afternoon ruling | c-185 |
| A template saves each party's address separately | 7 October ruling | c-186 |
| Using a template seeds the transporter's country | 7 October ruling | c-187 |
| No saving a template by GET | 7 October ruling | c-188 |
| Amend, cancel amendment, copy and delete change state by form posts | Rulings | c-189 |
| Amend and cancel-amendment confirmations are pages; the pop-ups wait on design question 9 | 9 October afternoon ruling | c-190 |
| Confirming an amendment lands on the amend review | DR2.1 source | c-191 |
| Amendment edits are saved to the record | 7 October ruling | c-192 |
| Delete stays a soft delete | 7 October ruling | c-193 |
| Dashboard cards keep status-driven actions | DR1 notes | c-194 |
| Design Release 2.1 copy adopted on the delete and cancel-amend pages | DR1 backlog | c-195 |
| A copy carries exactly Design Release 2.1's list | DR2.1 source | c-196 |
| Copying mid-amendment copies the submitted version | DR2.1 source | c-197 |
| Guards, delete and view Back go to the set's own notification list | 9 October afternoon ruling | c-198 |
| Continue on the amend review is held while anything is invalid, with an error summary | 7 October ruling | c-201 |
| Reason for import is asked before commodity details | DR2.1 source, 9 October ruling | c-202 |
| CPH number is reached only from its roles and addresses row | DR2.1 source | c-203 |
| Pages opened from the overview return to it on save | DR2.1 source, 9 October ruling | c-204 |
| Opening run always ends on the review page; plants takes the same | DR2.1 source, 9 October afternoon ruling | c-205 |
| Back follows the page's context, read from the service's own state | DR2.1 source | c-206 |
| Origin page offers the overview return controls | 7 October ruling (DR1 inc-161) | c-207 |
| Pickers, CPH and permanent address pages end with the primary button alone | 7 October ruling (DR1 rule (b)) | c-208 |
| Contact page return controls say "hub", as drawn | 7 October ruling | c-209 |
| While amending, overview pages get the amend ending; pickers, CPH and permanent address show "Save and return" | 7 October ruling | c-210 |
| **Replaced:** the soft save is withdrawn. On every page with both buttons, "Save and return to overview" makes exactly the same checks as "Save and continue", with no page an exception, in live animals, germinal products and plants; how far those checks reach is c-372 | 26 October ruling | c-211 |
| Log out stays last in the navigation on every frontend | 7 October ruling | c-212 |
| Address book item goes to the INS address book from both frontends and both sets | 9 October ruling | c-213 |
| Logo links to gov.uk; service name to each set's or frontend's own dashboard home | 9 October ruling | c-214 |
| Feedback link stays the APHA service desk email, plants included | DR1 backlog | c-215 |
| No page shows the signed-in identity | Animals frontend | c-216 |
| Address search is built in no environment until the lookup is real; manual entry is built now | 9 October ruling | c-217 |
| Northern Ireland transporter search uses the INS lookup filtered to BT postcodes; blocked on the lookup alone since `ruling:ian-2026-11-06` lifted the transporter-requirements half | 9 October rulings, as narrowed by `ruling:ian-2026-11-06` | c-218 |
| Choosing a different type starts a new notification; the old one is untouched | 9 October ruling | c-219 |
| Template creation's type question offers only Live animals and Germinal products | 9 October ruling | c-220 |
| Country of origin labels subdivisions "<territory> (<parent>)", sorted by label, in both sets | DR2.1 source, 9 October ruling | c-221 |
| Each set has its own catalogue; today's germinal lines leave the live-animals one now | 9 October rulings | c-222 |
| The real commodity lines and fields stay; the prototype's hidden fields are not copied | 9 October ruling | c-223 |
| Commodity pages keep their real paths | 9 October ruling | c-224 |
| Performance tests change in each increment whose change breaks a k6 script | 7 and 9 October rulings | c-225 |
| Port of exit options read "<name> - <code>" | DR2.1 source | c-226 |
| Germinal products is a sibling set at /germinal-products, started from its own route | 9 October ruling | c-227 |
| The germinal set holds only germinal products; there is no mixed case | 9 October ruling | c-228 |
| Embryos and ova become separate items (EMBRYO, OVA) once the catalogue is re-distilled from MDM | 9 October rulings | c-229 |
| Once commodities come from MDM, the germinal catalogue holds V4's 18 items; no Cat or Dog embryos or ova | V4 | c-230 |
| Germinal gross weight is asked and stored per species line | 9 October ruling | c-231 |
| Germinal gross weight and temperature are optional; number of packages stays required | V4 | c-232 |
| Temperature is asked once and stored on every line | V4 and DR2.1 traces | c-233 |
| A germinal line's quantity is its number of packages, a whole number from 1 to 1,000 | V4, 9 October ruling | c-234 |
| A germinal species counts as identified once its entry holds one identifier | 9 October ruling, V4 | c-235 |
| Arrival details page stays at port-of-entry | 9 October ruling | c-236 |
| Documents page returns without ?from= markers | 9 October ruling | c-237 |
| No template-mode guard on documents; templates never offer it | 9 October ruling | c-238 |
| Permanent address storage shape is the real model's | 9 October ruling | c-239 |
| CPH, permanent address and contact pages use real paths and field names | 9 October ruling | c-240 |
| No new link to the kept contact edit route | DR2.1 source | c-241 |
| CPH, permanent address and contact error states keep "Error: " and HTTP 400 | Rulings | c-242 |
| Pages return to the hub by the flow's fallback, with no from=hub marker | 9 October ruling | c-243 |
| Germinal hub weight card region is named "Gross weight summary" | 9 October ruling | c-244 |
| Review, declaration and confirmation keep their real paths | 9 October ruling | c-245 |
| A draft's review shows the view header with its Draft status and stays editable | 9 October ruling | c-246 |
| Confirmation's "Create a new notification" keeps today's mechanism, styled as a link | 9 October ruling | c-247 |
| No template guard on the declaration | 9 October ruling | c-248 |
| No /dashboard redirect | 9 October ruling | c-249 |
| Home and drill-down links use each service's own paths; category lists sit in their own frontends | 9 October ruling | c-250 |
| Lists keep the prototype's content; each list's own frontend names addresses and parameters | 9 October ruling | c-251 |
| The list banner stays triggered by the redirect flag, in animals and plants | 9 October ruling | c-252 |
| The INS service names the tab and search parameters | 9 October ruling | c-253 |
| Only transporters carry a transporter authorisation number | 9 October ruling | c-255 |
| Phone stays free text up to 20 characters | Address book, V4 sets no rule | c-256 |
| Templates pages use real paths and field names | 9 October ruling | c-258 |
| Template ids are the backend's design | 9 October ruling | c-259 |
| A notification does not record its template | 9 October ruling | c-260 |
| No whole-template edit mode | 9 October ruling | c-261 |
| No POST handler on a template page | 9 October ruling | c-262 |
| No section allow-list redirect | 9 October ruling | c-263 |
| No template-mode URL guards | 9 October ruling | c-264 |
| Template creation offers Live animals and Germinal products only | 9 October ruling | c-265 |
| A template's category is the set it was made in | 9 October ruling | c-266 |
| Amendment buttons post the service's own fields | 9 October ruling | c-267 |
| ?cancelled=1 stays; no success banner after cancelling | 9 October ruling, DR2.1 source | c-268 |
| The deletion message shows on the set's own list through ?deleted=1 | 9 October afternoon ruling | c-269 |
| The deletion banner does not dismiss itself, in every set | 9 October afternoon ruling, accessibility duty | c-271 |
| The category is stored on the record only; no event or schema change | 9 October afternoon ruling | c-272 |
| Live-animal lines carry LIVE_ANIMAL; germinal lines SEMEN or EMBRYO until MDM separates ova | 9 October rulings | c-273 |
| Journey pages keep real paths; germinal uses /germinal-products | 9 October ruling | c-274 |
| Buttons keep the service's own fields | 9 October ruling | c-275 |
| No from=hub, from=review or from=template-review markers | 9 October ruling | c-276 |
| Every germinal species, a lone one included, needs one identifier before submit and Complete | V4, 9 October ruling | c-277 |
| Commodity catalogue and search wait on MDM; the commodity pages' wording and journey place go ahead | 9 October afternoon ruling | c-278 |
| Germinal set asks "Total gross weight", stored per line in kilograms; no conditional temperature | 9 October ruling | c-279 |
| No mixed live-and-germinal consignment behaviour is built | 9 October ruling | c-280 |
| A germinal notification starts from the type question or the germinal set's own list | 9 October afternoon ruling | c-281 |
| Germinal set goes ahead on today's 12 lines; V4's 18 items wait on MDM | 9 October afternoon ruling | c-282 |
| Germinal dates are single text inputs now; the calendar waits on design question 12 | 9 October afternoon ruling | c-283 |
| Port search matches are not bolded, in animals or plants | 9 October afternoon ruling | c-284 |
| ~~Every transporter add, list or search change waits on transporter requirements, inc-008, inc-044 and the commercial address search included; the step's journey place and its own mandatory-to-proceed check go ahead~~ **Overruled 6 November:** the address book manages transporters, so every add, list and search change goes ahead; only the commercial address search still waits, on the address lookup (c-218) | 9 October afternoon ruling, overruled by `ruling:ian-2026-11-06` | c-285 |
| The template-review controls go on today's transporter list now | 9 October afternoon ruling | c-286 |
| Address search builds its no-JavaScript version when the lookup lands; its JavaScript waits on design | 9 October afternoon ruling | c-287 |
| CPH page gets no new JavaScript; digit filtering and paste wait on design question 7 | 9 October afternoon ruling | c-288 |
| No cancel-amend dialog on the CPH page; the Amend bar's "Cancel amend" goes to the confirmation page | 9 October afternoon ruling | c-289 |
| Plants' contact page takes only the new intro and "Select an address" heading | 9 October afternoon ruling | c-290 |
| Plants' contact page keeps the whole address book and no add link | 9 October afternoon ruling | c-291 |
| Plants' party cards, contact included, drop telephone and email rows and read the address line by line | 9 October afternoon ruling | c-293 |
| Import reference numbers built now as selectable text; Copy buttons wait on design question 8 | 9 October afternoon ruling | c-294 |
| Each category list stays in its own frontend; "View dashboard" and drill-down Back links point there | Templates and afternoon rulings | c-295 |
| The category is not published on the notification event | 9 October afternoon ruling | c-296 |
| The INS home's germinal section waits with the summary information | 9 October afternoon ruling | c-297 |
| No list carries a Back link to the overall home | 9 October afternoon ruling | c-298 |
| The list uses GOV.UK and MoJ components, with no custom JavaScript | 9 October afternoon ruling | c-299 |
| Plants' list drops its empty-list sentence | 9 October afternoon ruling, DR2.1 source | c-300 |
| Plants' "Submitted" becomes plain text; "Draft" stays a tag | 9 October afternoon ruling, DR2.1 source | c-301 |
| Plants' tabs, 8 a page, search, sort and filters wait on the plants backend (inc-200, deferred.md); the rest of plants' frame changes now | 9 October afternoon ruling | c-302 |
| Address book category tabs are MoJ sub navigation | 9 October afternoon ruling | c-304 |
| Address search is built in its no-JavaScript version, with the fields visible | 9 October afternoon ruling | c-305 |
| ~~"Choose an address type" is built now with 3 options; "Transporter" waits~~ **Overruled 6 November:** "Transporter" is a fourth option, since the address book manages transporters and the option now leads somewhere (inc-074). Which of the two placements still in play it takes — req-1198's third, before "Branch", or req-2042's after "Place of Destination" — is for the re-distil, against the three-option page inc-061 built | 9 October afternoon ruling, overruled by `ruling:ian-2026-11-06` | c-306 |
| Plants' navigation gains a Templates item to the animals frontend; plants has no templates | Templates ruling | c-307 |
| "Use template" is a form post | 9 October afternoon ruling | c-309 |
| Card Amend goes through the amend confirmation page, in every set | 9 October afternoon ruling | c-310 |
| Plants' status strip reads "Amend" | 9 October afternoon ruling | c-311 |
| Plants' opening run ends on check your answers even when incomplete | 9 October afternoon ruling | c-312 |
| **Replaced:** plants' lenient save is withdrawn. On every plants page with both buttons, "Save and return to overview" makes exactly the same checks as "Save and continue" (req-1935) | 26 October ruling | c-313 |
| Each set's root renders its own notification list | 9 October afternoon and templates rulings | c-314 |
| The performance suite does not join the list reframe for a route move | 9 October afternoon ruling | c-315 |
| Arrival and transit keep the "Error: " title prefix and named Remove buttons that work without JavaScript | 9 October afternoon ruling | c-316 |
| Plants' Overview changes only where an animals hub row changes the same page; it keeps its own tags, rows and sections | 9 October afternoon ruling | c-317 |
| Country of origin is mandatory to proceed: the origin page saves only with a country, on both save buttons; Cancel still leaves without saving, and a countryless save no longer arises (req-032, req-033 set aside) | V4 (widened 2 November), 26 October ruling | c-319 |
| On the origin page, in both animals sets and in plants, Save and return to overview makes exactly the checks Save and continue makes; a blank region of origin code is still accepted, because V4 marks it mandatory to submit (req-2124, req-047) | 26 October ruling | c-321 |
| On the commodity page, Commodity details and the plants commodity type page, both save buttons make the same checks (req-088, req-120, req-2136); the germinal copies take them too | 26 October ruling | c-323 |
| Number of packages is asked wherever V4's 54-commodity package-count list names the chosen species' commodity, and withheld elsewhere; Design Release 2.1's packaging list is set aside (req-112) | V4 (widened 2 November) | c-324 |
| The live-animals catalogue's commodity and species names are whatever MDM serves; no name is edited in code to match Design Release 2.1 or V4's examples (req-2130, req-095) | 9 October rulings, V4 | c-328 |
| Remove on Commodity details keeps the numbers the trader has typed but not yet saved (req-1759) | 26 October ruling | c-329 |
| On the main import reason and additional details pages both save buttons run the same checks and show the overview only when every answer passes (req-166, req-180) | 26 October ruling | c-332 |
| A species whose commodity requires no specific identifier is asked for free-text Identification details and a Description, so every selected species has a panel (req-2149 to req-2151, req-210, req-221) | V4 (widened 2 November) | c-333 |
| On every germinal page with both save buttons the two make exactly the same checks, so the germinal weight, package, length and date rules are made on each (req-2162) | 26 October ruling, 9 October ruling | c-339 |
| A germinal commodity's code is the catalogue's eight-digit code (05111000, 05119985), not V4's seven-digit form | 9 October afternoon ruling | c-340 |
| On arrival details and transit countries both save buttons make the same checks, so a missing means of transport is refused on either (req-329) | 26 October ruling | c-341 |
| The port of entry offers every port MDM returns for the GBNAG system, in both animals sets; V4's "live animal ports" list does not exist in MDM (req-300, req-1809) | 9 October ruling | c-342 |
| There are exactly four means of transport, stored AIRPLANE, RAILWAY, ROAD_VEHICLE and VESSEL (req-313) and read "Air", "Rail", "Road" and "Sea" (req-309 to req-312) | V4 on data, DR2.1 on wording | c-343 |
| The germinal-products set asks for transit countries on the same terms as live animals, whenever the means of transport is rail or road (req-2166) | 9 October ruling, V4's impacts cell | c-344 |
| Transit countries stay optional: the page saves with no country added (req-358). V4's condition bullet brings the question into the journey, it does not require an answer (req-326, req-344, req-371) | V4's mandatory column | c-345 |
| A transporter is mandatory to proceed: a save with no transporter chosen is refused on both buttons, with the service's own transporterRequired message, on today's transporter list (req-402) | V4 (widened 2 November), 26 October ruling | c-346 |
| The Document type select offers the business's thirteen types in order; ten change now (req-499) and three wait on codelist codes (req-2179) | V4 (widened 2 November) | c-348 |
| Each document type option keeps Design Release 2.1's wording where both name the same type; a type the design lacks takes the business's own name | V4's role (DR2.1 decides how pages read) | c-349 |
| The date of issue accepts a one- or two-digit day and month with a four-digit year, as today (req-506) | DR2.1 on wording, V4 on order | c-352 |
| On the upload documents page both save buttons make exactly the same checks (req-540) | 26 October ruling | c-353 |
| The four document fields keep the labels "Document reference", "Document type", "Date of issue" and "Attachment" (req-493, req-498, req-504, req-507) | V4's role (DR2.1 decides how pages read) | c-354 |
| The attachment's file format is taken from the attached file and checked against the eight permitted formats; the trader is not asked (req-2177) | V4 on data, DR2.1 on what is asked | c-355 |
| The CPH question applies to the seventeen commodity codes V4's list names and to nothing else; rabbits, camels, ostriches, parrots, reptiles, bees and fish no longer bring it in (req-699) | V4 (widened 2 November) | c-357 |
| Both save buttons make the same checks, and which answers a page needs comes from V4's markings: the contact address is mandatory to proceed in animals (req-764, req-2187) and mandatory to submit in plants (req-1967); a blank CPH still saves (c-113) and a part-filled one is refused on either button (req-715, req-716) | 26 October ruling, V4 | c-361 |
| The germinal set's contact address page carries the live-animals page's save-button behaviour, as a copy of it | 26 October ruling, 9 October ruling | c-362 |
| Only cats, dogs and ferrets need a permanent address (req-726); "mandatory to submit" says when the answer is checked, and the answer sits on the animal (req-732, req-743) | V4's own commodity list, DR2.1, the service | c-363 |
| While a notification is being amended, "Save and return to overview" makes exactly the same checks as "Save and continue" and "Save and return", in live animals, germinal products and plants, upload documents included (req-2188); the button set is unchanged (req-1403, req-2068) | 26 October ruling | c-370 |

## Already in place

884 adopted requirements are met today. Statements are in `distil/requirements.json`; the first column names where today's evidence shows it, the second lists every requirement that evidence set backs.

Key: E2E the end-to-end traces, AF the animals fit traces, IF the INS fit traces, FE the animals frontend, INS-FE the INS frontend, PF the plants frontend, BE the animals backend, INS-BE the INS backend, AB the address book, RD reference data, stub the stub, tests the tests repo, perf the performance suite.

| What already exists | Requirements |
|---|---|
| AB | req-1120, req-1152, req-1155, req-1265, req-1266, req-1268, req-1269, req-1867, req-1868, req-1869 |
| AB E2E IF | req-1145 |
| AB E2E IF INS-FE | req-1235 |
| AB E2E IF tests | req-1149, req-1263, req-1264 |
| AB E2E INS-FE perf | req-1243 |
| AB E2E INS-FE tests | req-1157, req-1158 |
| AB E2E tests | req-1151 |
| AB IF INS-FE | req-1192, req-1237, req-1238, req-1241, req-1244 |
| AB INS-FE | req-2201 |
| AB INS-FE tests | req-1156 |
| AF | req-133, req-177, req-239, req-373, req-385, req-445, req-476, req-521, req-523, req-524, req-1468, req-1760, req-1973, req-1975 |
| AF BE E2E FE | req-1423 |
| AF BE E2E FE PF tests | req-1415, req-1453 |
| AF BE E2E FE perf tests | req-547 |
| AF BE E2E FE tests | req-513, req-526, req-532, req-534, req-535, req-546, req-1032, req-1422 |
| AF BE E2E tests | req-1476 |
| AF BE FE | req-495, req-496, req-506 |
| AF BE tests | req-1396 |
| AF E2E | req-086, req-130, req-188, req-197, req-217, req-274, req-334, req-336, req-352, req-467, req-468, req-479, req-522, req-541, req-545, req-559, req-704, req-806, req-945, req-1882, req-2078 |
| AF E2E FE | req-024, req-039, req-047, req-050, req-055, req-070, req-084, req-090, req-106, req-107, req-110, req-120, req-135, req-139, req-141, req-143, req-144, req-149, req-150, req-151, req-152, req-156, req-159, req-160, req-174, req-195, req-196, req-202, req-209, req-211, req-212, req-214, req-218, req-228, req-233, req-235, req-238, req-241, req-247, req-269, req-273, req-276, req-279, req-280, req-292, req-297, req-298, req-305, req-307, req-319, req-321, req-325, req-340, req-341, req-342, req-345, req-347, req-350, req-351, req-363, req-380, req-381, req-382, req-384, req-388, req-391, req-395, req-400, req-409, req-411, req-412, req-423, req-433, req-435, req-437, req-439, req-446, req-460, req-464, req-480, req-483, req-484, req-486, req-490, req-492, req-517, req-525, req-573, req-583, req-585, req-605, req-669, req-705, req-707, req-721, req-771, req-777, req-778, req-783, req-784, req-785, req-787, req-790, req-792, req-793, req-795, req-796, req-797, req-798, req-799, req-801, req-802, req-803, req-804, req-809, req-810, req-811, req-820, req-829, req-834, req-837, req-851, req-853, req-863, req-870, req-871, req-881, req-887, req-918, req-922, req-924, req-926, req-932, req-935, req-936, req-938, req-1421, req-1613, req-1619, req-1653, req-1685, req-1755, req-1756, req-1845, req-2142, req-2144, req-2145, req-2147, req-2148 |
| AF E2E FE INS-FE | req-1677 |
| AF E2E FE INS-FE PF | req-1675, req-1676, req-1679, req-1680, req-1684 |
| AF E2E FE INS-FE PF tests | req-1674 |
| AF E2E FE INS-FE tests | req-1702 |
| AF E2E FE PF | req-022, req-589, req-602, req-615, req-616, req-620, req-723, req-724, req-769, req-773, req-1881 |
| AF E2E FE PF tests | req-593, req-599, req-752, req-763, req-768, req-1412, req-1452, req-1454 |
| AF E2E FE RD | req-025, req-300 |
| AF E2E FE RD tests | req-172 |
| AF E2E FE perf | req-1757 |
| AF E2E FE perf tests | req-206, req-504, req-533, req-1635, req-1807, req-1822, req-1897, req-1918 |
| AF E2E FE tests | req-012, req-023, req-037, req-044, req-045, req-048, req-051, req-052, req-053, req-054, req-066, req-077, req-078, req-079, req-082, req-083, req-104, req-111, req-132, req-134, req-136, req-137, req-138, req-140, req-142, req-157, req-171, req-176, req-194, req-216, req-237, req-242, req-244, req-272, req-275, req-281, req-282, req-283, req-285, req-287, req-308, req-317, req-320, req-326, req-330, req-331, req-337, req-339, req-357, req-358, req-359, req-362, req-379, req-393, req-404, req-406, req-415, req-418, req-424, req-430, req-454, req-478, req-498, req-515, req-516, req-519, req-520, req-529, req-531, req-561, req-572, req-586, req-587, req-606, req-681, req-682, req-683, req-684, req-686, req-687, req-688, req-689, req-690, req-703, req-709, req-715, req-718, req-759, req-775, req-824, req-838, req-872, req-876, req-883, req-901, req-912, req-915, req-916, req-919, req-921, req-1047, req-1084, req-1630, req-1641 |
| AF E2E PF tests | req-1459 |
| AF E2E perf tests | req-1640 |
| AF E2E tests | req-011, req-014, req-021, req-035, req-762, req-1402 |
| AF FE | req-031, req-056, req-088, req-109, req-113, req-116, req-126, req-129, req-146, req-153, req-154, req-158, req-165, req-185, req-186, req-227, req-231, req-245, req-268, req-284, req-288, req-289, req-314, req-322, req-323, req-335, req-346, req-355, req-360, req-364, req-366, req-367, req-368, req-401, req-403, req-436, req-452, req-453, req-459, req-485, req-487, req-491, req-502, req-503, req-507, req-511, req-512, req-514, req-518, req-560, req-562, req-563, req-574, req-581, req-693, req-702, req-716, req-765, req-779, req-786, req-805, req-807, req-813, req-836, req-857, req-869, req-923, req-925, req-930, req-934, req-1770, req-2026, req-2105, req-2157 |
| AF FE INS-FE PF | req-1687, req-1698, req-1701, req-1723 |
| AF FE INS-FE PF tests | req-2086 |
| AF FE PF | req-604, req-1091, req-1418, req-1478, req-1691 |
| AF FE PF perf tests | req-1835 |
| AF FE perf | req-1771, req-1828, req-1844 |
| AF FE perf tests | req-537, req-1637 |
| AF FE tests | req-313, req-316, req-551, req-556, req-1617, req-1638, req-1639, req-2079 |
| AF PF | req-1699, req-1909 |
| AF tests | req-493 |
| BE | req-501, req-548, req-1490, req-1491, req-1492, req-1493, req-1494, req-1495, req-1496, req-1498, req-1499, req-1500, req-1501, req-1502, req-1503, req-1504, req-1505, req-1508, req-1509, req-1510, req-1521, req-1524, req-1526, req-1527, req-1528, req-1529, req-1530, req-1531, req-1532, req-1533, req-1534, req-1535, req-1536, req-1537, req-1540, req-1542, req-1544, req-1547, req-1548, req-1549, req-1551, req-1552, req-1553, req-1554, req-1559, req-1560, req-1561, req-1562, req-1565, req-1566, req-1568, req-1569, req-1570, req-1571, req-1572, req-1574, req-1576, req-1577, req-1588, req-1589, req-1590, req-1593, req-1595, req-1597, req-1598, req-1599, req-1601, req-2174 |
| BE E2E | req-1431 |
| BE E2E tests | req-500, req-1395, req-1409, req-1489, req-1507, req-1511, req-1512, req-1513, req-1515, req-1516, req-1517, req-1518, req-1519, req-1520, req-1525, req-1545 |
| BE FE | req-1438, req-2175, req-2180 |
| BE FE PF | req-1094 |
| BE perf | req-1543 |
| BE perf tests | req-1557, req-1558 |
| BE tests | req-1497, req-1506, req-1514, req-1522, req-1523, req-1539, req-1541, req-1550, req-1567, req-1579, req-1585, req-1586, req-1592, req-1596, req-1600 |
| E2E | req-361, req-371, req-473, req-474, req-633, req-641, req-645, req-676, req-677, req-730, req-731, req-738, req-781, req-961, req-1401, req-1436, req-1830 |
| E2E FE | req-042, req-043, req-232, req-426, req-536, req-630, req-631, req-920, req-1089, req-2184 |
| E2E FE INS-FE PF | req-1715 |
| E2E FE PF tests | req-618 |
| E2E FE tests | req-277, req-668, req-685, req-694, req-1645, req-1664, req-1706, req-2143, req-2163 |
| E2E IF | req-969 |
| E2E IF INS-FE | req-1113, req-1131, req-1138, req-1142, req-1181, req-1273, req-1282 |
| E2E IF INS-FE perf | req-1140 |
| E2E IF INS-FE perf tests | req-1159, req-1174, req-1182 |
| E2E IF INS-FE tests | req-1108, req-1111, req-1153, req-1226, req-1227, req-1245, req-1257, req-1271, req-1276 |
| E2E INS-FE | req-1146, req-1710, req-1716 |
| E2E INS-FE PF | req-1713 |
| E2E INS-FE tests | req-1021, req-1109, req-1711, req-2087 |
| E2E tests | req-614, req-667, req-679, req-695, req-696, req-697, req-698, req-1027, req-1095, req-1405, req-1407, req-1477, req-1604, req-1651, req-1712 |
| FE | req-009, req-115, req-155, req-161, req-162, req-187, req-246, req-286, req-306, req-324, req-333, req-365, req-455, req-466, req-549, req-550, req-632, req-661, req-662, req-665, req-691, req-692, req-717, req-758, req-812, req-847, req-861, req-882, req-885, req-1650, req-1659, req-1660, req-1661, req-1662, req-1708, req-1758, req-1959, req-1974, req-2125, req-2152, req-2164, req-2165, req-2169, req-2170, req-2176, req-2177, req-2183, req-2189, req-2208, req-2209 |
| FE INS-FE PF | req-1678, req-1689, req-1693, req-1697, req-1700, req-1705 |
| FE INS-FE PF tests | req-1690 |
| FE PF | req-607, req-617, req-1088, req-1460, req-1694, req-1696, req-1707 |
| FE PF tests | req-1703 |
| FE perf | req-1753, req-1821, req-1823 |
| FE tests | req-1618, req-1644, req-1646, req-1647, req-1648, req-1649, req-1663, req-2080 |
| IF | req-956, req-957, req-958, req-968, req-970, req-1026, req-1224, req-1246, req-1280, req-1874 |
| IF INS-FE | req-966, req-1020, req-1160, req-1163, req-1165, req-1166, req-1171, req-1172, req-1173, req-1183, req-1184, req-1267, req-1281, req-2046 |
| INS-FE | req-1247, req-1695, req-1704, req-1714, req-1728, req-1729, req-1731, req-1732 |
| INS-FE PF | req-2212 |
| PF | req-1911, req-1912, req-1913, req-1914, req-1915, req-1916, req-1935, req-1936, req-1937, req-1938, req-1939, req-1940, req-1941, req-1942, req-1943, req-1944, req-1945, req-1946, req-1947, req-1948, req-1949, req-1950, req-1952, req-1953, req-1954, req-1963, req-1966, req-1967, req-1968, req-1969, req-1970, req-1976, req-1977, req-1978, req-2009, req-2010, req-2011, req-2012, req-2013, req-2014, req-2015, req-2016, req-2017, req-2018, req-2019, req-2020, req-2021, req-2022, req-2023, req-2024, req-2033, req-2037, req-2058, req-2070, req-2071, req-2072, req-2073, req-2074, req-2084, req-2091, req-2092, req-2093, req-2094, req-2115, req-2117, req-2120, req-2128 |
| PF tests | req-2060 |
| RD | req-060, req-061, req-062, req-063, req-064, req-301 |
| RD stub | req-1809, req-1810 |
| perf | req-1808, req-1824, req-1849, req-1853, req-1860, req-1902, req-1903, req-1904, req-1906 |
| stub | req-1748, req-1749, req-1871 |
| tests | req-1546, req-1580, req-1581, req-1583, req-1605, req-1606, req-1607, req-1608, req-1719, req-1720, req-1721, req-1722, req-1725, req-1727, req-1815 |
| No claim from today's code: confirm before passing this on | req-374, req-1488, req-1858, req-2050 |

## The increments

A **review point** is a check the owner makes once the theme is built. The build never waits for it mid-run. 12 rows carry one: inc-014, inc-037, inc-039, inc-054, inc-087, inc-120, inc-128, inc-129, inc-132, inc-176, inc-241, inc-245.

"Lands after" lists the rows in `dependsOn`, and, marked †, the rows in `externalDependsOn` that live on a split branch. Rows are in id order; Lands after is the only order there is.

### Ready to go

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|
| inc-016 | The germinal commodity page searches MDM's germinal commodities, and the live animals search still offers none | 8 | frontend, tests | inc-176 | germinal-products |
| inc-017 | Germinal Commodity details asks total gross weight, number of packages and temperature, and the backend stores and publishes them with interim typeCodes | 12 | backend, frontend, tests | inc-016, inc-024, inc-018† | germinal-products |
| inc-024 | The germinal opening run and its main import reason: two reasons and four purposes | 8 | frontend, tests | inc-016, inc-141, inc-015†, inc-218†, inc-022† | germinal-products |
| inc-045 | Identification details' Back link goes to Commodity details in the opening run, and template review returns to template review | 5 | frontend, tests | inc-015†, inc-156† | identification-and-permanent-address |
| inc-048 | An empty species panel is refused on its own save, even beside a filled one | 4 | frontend, tests | inc-214† | identification-and-permanent-address |
| inc-052 | Germinal identification asks once per species for donor, dates and identification number, and the backend stores them unpublished | 12 | backend, frontend, tests | inc-016, inc-045, inc-017 | germinal-products |
| inc-053 | Germinal identification dates and donor: single text inputs with V4's date and length checks | 19 | frontend, tests | inc-052 | germinal-products |
| inc-054 | A permanent address page for cats, dogs and ferrets, with one card per animal and a same-as-destination choice. **Review point** | 13 | backend, frontend, tests | inc-214†, inc-213† | identification-and-permanent-address |
| inc-055 | The permanent address page checks each new address, names the animal in every error, and answers errors as an error page | 7 | frontend, tests | inc-054 | identification-and-permanent-address |
| inc-056 | Permanent addresses are summarised on the consignment addresses page and listed per animal on the review page | 5 | frontend, tests | inc-054, inc-213† | identification-and-permanent-address |
| inc-057 | The permanent address leaves the identification page | 5 | frontend, tests | inc-054, inc-214† | identification-and-permanent-address |
| inc-058 | End-to-end proof: pet cats by air with permanent addresses | 3 | tests | inc-054, inc-057 | identification-and-permanent-address |
| inc-087 | Role-filtered party pickers on one page. **Review point** | 9 | frontend, plantsfrontend, tests | inc-212†, inc-059† | consignment-parties |
| inc-088 | Same-as shortcuts on the roles and addresses page | 8 | frontend, tests | inc-087, inc-213† | consignment-parties |
| inc-090 | Picker "View" link to the INS address book and back, and the picker's address lines and width | 8 | frontend, plantsfrontend, tests | inc-212† | consignment-parties |
| inc-091 | The county parish holding number page: who is asked, its help and hint, a blank save, and where it goes | 8 | frontend, tests | — | consignment-parties |
| inc-092 | The consignment addresses and review pages show the county parish holding number as 12/345/6789 | 5 | frontend, tests | inc-091, inc-213† | consignment-parties |
| inc-094 | The contact address page says whose address it is, requires a choice, and goes on to review | 12 | frontend, plantsfrontend, tests | inc-091 | consignment-parties |
| inc-095 | The contact address page offers only the trader's own branch addresses and adds a new branch through the address book | 5 | insfrontend, frontend, tests | inc-094, inc-061†, inc-070†, inc-080† | consignment-parties |
| inc-096 | The roles and addresses page shows a permanent address where one is needed, and its task completes only when every section shown does | 5 | frontend, tests | inc-054, inc-091, inc-213† | consignment-parties |
| inc-097 | While amending, the permanent address page ends with "Save and return" and "Save and continue" | 6 | frontend, plantsfrontend, tests | inc-054 | consignment-parties |
| inc-099 | The Overview for a germinal products notification, with Commodity details Complete on valid packages | 12 | frontend, tests | inc-017, inc-177 | germinal-products |
| inc-105 | The germinal products set's own review: germinal answers in their species blocks, its unfinished-species messages, and its shorter Addresses card | 8 | frontend, tests | inc-017, inc-052, inc-176, inc-099, inc-104†, inc-106† | germinal-products |
| inc-120 | Amend goes through a confirmation page, then opens the amend review, in animals and plants. **Review point** | 8 | frontend, plantsfrontend, tests, perftests | inc-112† | manage-notifications |
| inc-121 | The cancel-amendment page is one question and two controls, and returns to the submitted notification with no banner, in animals and plants | 8 | frontend, plantsfrontend, tests | inc-110† | manage-notifications |
| inc-123 | Copy as new carries over the trade answers and clears the shipment answers, from the submitted version | 9 | backend, frontend, tests | — | manage-notifications |
| inc-124 | A stale Copy as new from the view page returns to the view page and says the notification has been updated | 3 | frontend, tests | inc-112† | manage-notifications |
| inc-125 | The delete confirmation page identifies the notification in a summary, with shorter wording and a plain link back, in animals and plants | 13 | frontend, plantsfrontend, tests | — | manage-notifications |
| inc-126 | The deletion message reads "Notification has been deleted" on each set's own list, and deleting an amending notification is proven | 9 | backend, frontend, plantsfrontend, tests | inc-120, inc-121, inc-125, inc-110† | animals-dashboard |
| inc-129 | The live animals list is reframed in place, scoped to the trader's organisation, and plants' list takes the same frame. **Review point** | 11 | backend, frontend, plantsfrontend, tests, perftests | — | animals-dashboard |
| inc-130 | Notification cards show the design's facts, on the live animals list and on plants' list | 8 | backend, frontend, plantsfrontend, tests | inc-129 | animals-dashboard |
| inc-131 | Card status styles on both lists, and "Action required" on the set's own list for a submitted notification missing its ITAHC | 7 | backend, frontend, plantsfrontend, tests | inc-129, inc-130, inc-113† | animals-dashboard |
| inc-135 | The live animals list has "In progress", "Draft" and "Completed" tabs | 7 | backend, frontend, tests | inc-130 | animals-dashboard |
| inc-136 | The live animals list's search and sort become one form that really searches and sorts | 9 | backend, frontend, tests, perftests | inc-135, inc-210† | animals-dashboard |
| inc-137 | The live animals list has "Additional filters" for arrival date, date range and status | 8 | backend, frontend, tests | inc-136 | animals-dashboard |
| inc-138 | The lists page 8 at a time with numbered pages, and show neither a results count nor an empty-state message | 8 | backend, frontend, plantsfrontend, tests | inc-136, inc-137 | animals-dashboard |
| inc-140 | The lists' success banner is titled "Success" | 3 | frontend, plantsfrontend, tests | inc-129, inc-126 | animals-dashboard |
| inc-141 | The germinal products set's root renders its own copy of the reframed list | 5 | frontend, tests | inc-176, inc-129, inc-130, inc-135, inc-136, inc-137, inc-138, inc-140, inc-196 | germinal-products |
| inc-147 | "Information is missing" on the live animals notification list card when animal identifiers are incomplete | 5 | backend, frontend, tests | inc-131, inc-106†, inc-113† | animals-dashboard |
| inc-172 | Germinal products notifications on their own list, with their own card facts | 6 | backend, frontend, tests | inc-130, inc-141, inc-017 | germinal-products |
| inc-176 | A germinal products notification starts in its own set, with its own draft, stored category, service chrome and origin page, and each set opens only its own notifications. **Review point** | 27 | backend, frontend, tests | inc-129, inc-130, inc-135, inc-148†, inc-150†, inc-098†, inc-100† | germinal-products |
| inc-177 | Germinal Commodity details checks weight and packages, listing errors by question | 8 | frontend, tests | inc-017, inc-018† | germinal-products |
| inc-178 | A germinal products notification chooses its transporter from its own copy of the transporter step | 8 | frontend, tests | inc-176 | germinal-products |
| inc-179 | Germinal products notifications have their own Upload documents page | 8 | frontend, tests | inc-176, inc-031†, inc-033†, inc-034†, inc-035† | germinal-products |
| inc-180 | The address book takes adds from germinal products notifications and returns to them | 4 | insfrontend, tests | inc-090, inc-080† | consignment-parties |
| inc-181 | Germinal products roles and addresses page and party pickers, with no CPH number or permanent address page | 12 | frontend, tests | inc-091, inc-054 | germinal-products |
| inc-182 | The rest of the germinal journey in the live-animals step order: arrival, transit countries, contact address, declaration and submission, certified for "Germinal products" | 13 | frontend, tests | inc-099, inc-105, inc-178, inc-179, inc-181, inc-094, inc-095, inc-097, inc-018†, inc-028†, inc-029†, inc-110†, inc-111†, inc-112†, inc-113†, inc-115† | germinal-products |
| inc-183 | The germinal set has no Additional details step, and a germinal species counts as identified once it has one identifier | 5 | frontend, tests | inc-099, inc-105, inc-182, inc-052, inc-186 | germinal-products |
| inc-184 | End-to-end proof: a germinal products notification for bovine semen, from create to submitted | 2 | tests | inc-182, inc-183, inc-141, inc-172 | germinal-products |
| inc-185 | Amend, cancel amendment, copy as new and delete for germinal products notifications | 4 | backend, frontend, tests | inc-182, inc-120, inc-121, inc-123, inc-124, inc-125, inc-126 | germinal-products |
| inc-186 | Germinal products templates are answered on the germinal set's pages, and the germinal origin page's Back link follows where the notification started | 13 | frontend, tests | inc-182, inc-150†, inc-151†, inc-154†, inc-155†, inc-156†, inc-157†, inc-158†, inc-159†, inc-160†, inc-161†, inc-164†, inc-165† | germinal-products |
| inc-196 | "Use template" on the live animals list | 3 | frontend, tests | inc-129, inc-151† | animals-dashboard |
| inc-201 | A notification needing action can be amended, copied and deleted as a submitted one can | 5 | backend, frontend, tests | inc-120, inc-121, inc-123, inc-125, inc-113† | manage-notifications |
| inc-234 | Live animals browser tests prove how pages look by screenshot, accessible name and GOV.UK values read at run time | 6 | frontend, tests | — | test-hygiene |
| inc-235 | Links that bring the trader back to the page they came from follow one rule in live animals | 4 | frontend | — | test-hygiene |
| inc-236 | Plants tests and their guides say what is true and prove looks without class lists | 5 | plantsfrontend, tests | — | test-hygiene |
| inc-237 | Party and CPH number browser tests share the journey's save step and prove looks without class lists | 2 | frontend, tests | inc-091 | consignment-parties |
| inc-238 | Identification details' browser tests read GOV.UK's green at run time and find the save buttons by role, and "Change number of animals" comes back to Identification details | 3 | frontend | — | identification-and-permanent-address |
| inc-239 | The live animals list shows a success banner only when an action sends the trader back to it | 4 | frontend | — | animals-dashboard |
| inc-240 | The transporter list refuses a save with no transporter chosen | 3 | frontend, tests | — | transporters |
| inc-241 | Every selected species has an identification panel, and a species with no specific identifier is asked for identification details and a description. **Review point** | 9 | backend, frontend, tests | inc-045 | identification-and-permanent-address |
| inc-242 | Pressing Enter in a species panel saves that panel's own animal and reaches no other panel's buttons | 4 | frontend, tests | inc-048 | identification-and-permanent-address |
| inc-243 | Every save control on the county parish holding, permanent address and contact address pages makes the same checks | 6 | frontend, plantsfrontend, tests | inc-091, inc-094, inc-097, inc-055 | consignment-parties |
| inc-244 | Both save buttons make the same checks on every germinal page that shows them | 4 | frontend, tests | inc-053, inc-177, inc-182 | germinal-products |
| inc-245 | The journey tells a hard stop from a submission check, and keeps a group of answers all-or-nothing. **Review point** | 7 | frontend, plantsfrontend, tests | — | obligation-model |

### Blocked

#### ~~Waiting on a transporter decision~~ — decided 6 November

`ruling:ian-2026-11-06` settles it, superseding Sam's ruling of 9 October (afternoon) and lifting c-285: **the address book manages transporters**, as per-organisation records like every other address, and adding one mid journey uses the address book hand-off already built for addresses (inc-077, inc-078, inc-080). Approved transporters are parked.

Ten rows are released to `todo` — inc-008, inc-037, inc-038, inc-039, inc-040, inc-041, inc-074, inc-075 and inc-076, with inc-240 already buildable — and **inc-044 is `done`**: EUDPA-739 removed the register page from the animals frontend (`e781e87a`, PR #462) and the tests repo (`b3a7a46`, PR #85) on 5 November, while the row was still marked blocked.

**These rows are released, not ready.** They were written when the journey owned transporters, so their criteria still describe the animals frontend's own add pages and its in-memory register. The transporter area needs re-distilling against the address-book-owned design before it is built — which is what the 9 October ruling asked for on a decision, and what this decision triggers. inc-039 changes most (its persistence becomes real), inc-074 to inc-076 become the primary route rather than an extra one, and inc-037's approved-record criteria should be cut out to the parked pile rather than holding the row.

Only one transporter row is still blocked, and not on this:

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-042 | Find a commercial transporter's Northern Ireland address with an address search. Waits on the INS address lookup becoming a real feature — its transporter-management half is lifted, so it now waits with the address book's own inc-072 and inc-081 on the same lookup, and should be re-distilled with them | insbackend, stub, frontend, tests | transporters |

#### Waiting on design

Design answers one question per row, in the waiting-on-design theme. Each row is built as design says, or dropped if design drops it.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-014 | Commodity search lists results as the trader types, in both animals sets (question 3). Also waits on MDM commodities. **Review point** | frontend, tests | waiting-on-design |
| inc-030 | With JavaScript, transit countries are added as they are picked and removed in place, announced as "Added" and "Removed" (question 4) | frontend, tests | waiting-on-design |
| inc-093 | With JavaScript, the county parish holding boxes keep out non-digits and one paste fills all three (the enhancement on top of Sam's 20 October boxes) | frontend, tests | waiting-on-design |
| inc-162 | A sort on Manage templates that really reorders (question 11) | frontend, tests | waiting-on-design |
| inc-189 | Country search results take the design's own screen-reader wording, if design says the component's own cannot stand (question 13) | frontend, plantsfrontend, tests | waiting-on-design |
| inc-192 | The germinal dates' "Choose date" calendar (question 12) | frontend, tests | waiting-on-design |
| inc-193 | Party pickers filter as the trader types (questions 5 and 6) | insfrontend, frontend, plantsfrontend, tests | waiting-on-design |
| inc-194 | Address search's search-only layout, results as the trader types, reveal on a pick and its announcements (question 10). Also waits on the address lookup becoming a real feature | insfrontend, frontend, tests | waiting-on-design |
| inc-195 | The amend and cancel-amendment confirmations as dialogs over the page (question 9); the expected answer drops the row | frontend, plantsfrontend, tests | waiting-on-design |
| inc-198 | A Copy button on each import reference number (question 8) | frontend, plantsfrontend, tests | waiting-on-design |

#### Waiting on the INS dashboard's requirements

Sam's 9 October rulings hold the INS dashboard's summary information until its requirements firm up and are agreed. The rulings name nobody to do it, and no date. The area is re-distilled once they are agreed.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-128 | The INS front door's home becomes the overall notifications dashboard, with the performance suite's readiness probe following its heading. **Review point** | insfrontend, tests, perftests | ins-dashboard |
| inc-132 | The Action needed page lists the organisation's notifications needing action. **Review point** | insbackend, insfrontend, tests | ins-dashboard |
| inc-133 | Search and sort the Action needed list | insbackend, insfrontend, tests | ins-dashboard |
| inc-134 | Action needed glance card on the home's Live animals section | insfrontend, tests | ins-dashboard |
| inc-143 | Status updates cards and the Status updated page | insbackend, insfrontend, tests | ins-dashboard |
| inc-144 | Inspection required page | insbackend, insfrontend, tests | ins-dashboard |
| inc-145 | Germinal products section on the home | insfrontend, tests | ins-dashboard |
| inc-146 | The plants section's glance cards. Also waits on the plants services publishing to the INS read model | insfrontend, tests | ins-dashboard |
| inc-139 | The live animals list's Summary shows "Action needed" and "Status updated" glance cards | backend, frontend, tests | animals-dashboard |

#### Waiting on MDM commodities

MDM must serve the commodity, type and species lists, and trade-imports-reference-data must pass them to the animals frontend. The commodity catalogue and search area is then re-distilled.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-051 | Pigs, sheep and goats are identified by ear tag only | frontend, tests | identification-and-permanent-address |
| inc-191 | Once commodities come from the central reference data, the germinal catalogue holds eighteen items, with embryos and ova apart and each with its own type code | backend, frontend, tests | germinal-products |

#### Waiting on PIMS Dynamics outcomes

The authorities' case system must send post-submission outcomes (delayed, completed, inspection) back to the notification record. No service in the workspace receives them today.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-142 | Cards show the authorities' outcomes: delayed, completed, inspection, their actions and the status-updated count | backend, frontend, tests | animals-dashboard |

#### Waiting on the plants backend

trade-imports-plants-backend, outside the programme, must let plants' list query notifications by status, keyword and arrival date, and ask for a page size of 8 (deferred.md).

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-200 | Plants' list tabs, eight a page, search, sort and filters | plantsfrontend, tests | animals-dashboard |

### Not to build

| Id | What it delivered | Status |
|---|---|---|
| inc-049 | Identification counts as complete only when every animal is entered, and submit needs one entry per species when several are selected | dropped |

**Check these ordering decisions:**

- 48 of the 100 rows land after rows on a split branch (marked † above). The loop builds them only once those branches merge. Two split workareas are not in `backlog.json`'s `splitOff` list but are depended on: `design-snagging-b` (branch `feat/EUDPA-720-design-release-2-1-design-snagging-b`, 5 rows), named by inc-048, inc-054, inc-057 and inc-093.
- inc-016 moves today's 12 germinal lines out of the live-animals catalogue now, ahead of MDM, and waits on inc-176, the germinal set's start.
- inc-024, the germinal opening run, waits on inc-141, the germinal list; inc-017 waits on inc-024. Germinal Commodity details therefore waits on the whole list reframe.
- inc-182 waits on 16 rows across 5 themes and 2 branches. inc-176 waits on 7 rows across 4 themes. inc-186 waits on 13. Each is a candidate to split if it proves too big to review.
- The transporter rows are all ready to go since `ruling:ian-2026-11-06` lifted c-285, bar inc-042 (address lookup) and inc-044 (done on main). inc-240 was already ahead of the decision on c-346. Order them so the address book side lands first: under the ruling the address book is the system of record and the hand-off is the add route, so inc-074's record and route decide what inc-038 to inc-041 are even building. The re-distil should set that order rather than keeping the old journey-first dependsOn.
- inc-128, the INS overall home, is blocked, so inc-132 to inc-134 and inc-143 to inc-146 are blocked behind it.
- inc-139 and inc-142 are blocked on the glance-card counts and PIMS Dynamics outcomes. The rest of the reframed list builds without them.
- inc-200 holds plants' tabs, paging, search, sort and filters. inc-129, inc-130, inc-131, inc-138 and inc-140 change plants' frame now.
- inc-049 is dropped on the default of question 14. If Sam takes V4's per-animal bar instead, inc-049 comes back and inc-183's germinal rule changes with it.
- inc-245 (obligation-model) depends on nothing and can start at once, but every feature theme's mandatory markings rest on it, so build it early rather than last.
- inc-162 and inc-195 are expected to be dropped when design answers questions 11 and 9. They are kept as blocked rows rather than dropped now, so the answer is recorded against something.

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Theme | Ready | Blocked | Touches | Lands after |
|---|---|---|---|---|
| obligation-model | inc-245 | none | the journey platform's obligation model in the animals and plants frontends, and the obligation-marking E2E specs | nothing: can start now |
| journey-foundation | split off to `feat/EUDPA-691-design-release-2-1-journey-foundation` | split off | the live-animals and plants journey flow and docs, both frontends' shared layout, the autocomplete and status-announcer components, the INS shared layout, the tests repo's flows and base page | nothing: can start now |
| reference-lists | split off to `feat/EUDPA-692-design-release-2-1-reference-lists` | split off | the country, port and capture services in all three frontends, reference-data's `src`, the stub's MDM responses, the reference-list E2E specs | nothing: can start now |
| origin-page | split off to `feat/EUDPA-695-design-release-2-1-origin-page` | split off | the origin feature and origin obligations in the animals and plants frontends, the origin specs and visual snapshots | reference-lists |
| design-snagging | split off to `feat/EUDPA-720-design-release-2-1-design-snagging` | split off | the shared accessible-autocomplete component and date-picker styles in both frontends, the transport copy, the origin feature, several page objects and the reference-data fixtures | journey-foundation, reference-lists |
| commodities-and-reason | split off to `feat/EUDPA-693-design-release-2-1-commodities-and-reason` | split off | the commodity search, consignment details, import reason and additional details features, the live-animals commodity service and obligation sections, k6 test data, the matching page objects and specs | design-snagging, journey-foundation |
| arrival-and-transit | split off to `feat/EUDPA-694-design-release-2-1-arrival-and-transit` | split off | the port-of-entry and transit-countries features, plants' arrival-details and arrival-status features, the arrival and transit page objects and specs | design-snagging, journey-foundation, reference-lists |
| documents | split off to `feat/EUDPA-724-design-release-2-1-documents` | split off | the documents feature and document-types service, the documents obligation section, the backend's accompanying-document code, the documents fixtures and specs | design-snagging, journey-foundation |
| address-book | split off to `feat/EUDPA-707-design-release-2-1-address-book` | split off | the address book's own folders in the address-book service and the INS frontend, the journey's address-return and handshake code, the k6 front-door and background-volume scripts, the address-book page objects and specs | reference-lists |
| overview-and-review | split off to `feat/EUDPA-696-design-release-2-1-overview-and-review` | split off | the hub, check-answers, declaration and confirmation features in both frontends, the backend's notification, view and aggregate classes, the INS dashboard view model, the review and declaration specs | arrival-and-transit, design-snagging, identification-and-permanent-address |
| type-question-and-templates | split off to `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | split off | the backend's template store, the templates feature and template review, the INS notification-type and dashboard-controls folders, plants' commodity-type page, the template and type-question specs | design-snagging |
| identification-and-permanent-address | inc-045, inc-048, inc-054, inc-055, inc-056, inc-057, inc-058, inc-238, inc-241, inc-242 | inc-051 | the animal-identification folder and its evaluation, the permanent-address folder, the backend's AnimalIdentifier, the identification and permanent-address page objects and specs | commodities-and-reason, design-snagging, journey-foundation, type-question-and-templates |
| consignment-parties | inc-087, inc-088, inc-090, inc-091, inc-092, inc-094, inc-095, inc-096, inc-097, inc-180, inc-237, inc-243 | none | the live-animals addresses page and party picker, the CPH and contact folders, each frontend's read-only address-book service, the address book's role-scoped query, the INS journey registry, plants' consignor, destination, contact and picker folders | address-book, design-snagging, identification-and-permanent-address, journey-foundation |
| manage-notifications | inc-120, inc-121, inc-123, inc-124, inc-125, inc-201 | none | the amend, cancel-amend, delete and notification-actions folders in both frontends, the backend's notification controller and copy mapper, the k6 amend walk | overview-and-review |
| animals-dashboard | inc-126, inc-129, inc-130, inc-131, inc-135, inc-136, inc-137, inc-138, inc-140, inc-147, inc-196, inc-239 | inc-139, inc-142, inc-200 | the live-animals dashboard folder and the list reads in persistence, the backend's list query and sort, plants' dashboard folder, the k6 list endpoints | manage-notifications, overview-and-review, type-question-and-templates |
| germinal-products | inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-141, inc-172, inc-176, inc-177, inc-178, inc-179, inc-181, inc-182, inc-183, inc-184, inc-185, inc-186, inc-244 | inc-191 | the germinal-products set folder and its routes, the set's build config, the persistence mapper, the backend's germinal commodity, species and GBN-AG publishing | animals-dashboard, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, documents, identification-and-permanent-address, journey-foundation, manage-notifications, overview-and-review, type-question-and-templates |
| test-hygiene | inc-234, inc-235, inc-236 | none | the files no feature theme owns: two live-animals fit specs, the party-edit folder, the commodity-question detour, the client helpers, plants' fit harness and testing guide, the tests repo's README and package.json | arrival-and-transit, commodities-and-reason, design-snagging, documents, journey-foundation, origin-page, overview-and-review |
| transporters | inc-240 | inc-008, inc-037, inc-038, inc-039, inc-040, inc-041, inc-042, inc-044, inc-074, inc-075, inc-076 | the transporter list, type, add and details folders, the transporters and address-lookup services, the INS backend's address lookup, the stub's federated lookup, the address book's transporter type, tab and hand-over | address-book, documents, journey-foundation, reference-lists |
| ins-dashboard | none | inc-128, inc-132, inc-133, inc-134, inc-143, inc-144, inc-145, inc-146 | the INS read model and its drill-down feature folders, the k6 INS page and readiness checks | animals-dashboard, germinal-products, type-question-and-templates |
| waiting-on-design | none | inc-014, inc-030, inc-093, inc-162, inc-189, inc-192, inc-193, inc-194, inc-195, inc-198 | the enhancement scripts in all three frontends and the enhancement E2E folders | address-book, arrival-and-transit, commodities-and-reason, consignment-parties, design-snagging, germinal-products, journey-foundation, manage-notifications, overview-and-review, transporters, type-question-and-templates |

Every row sits in a theme. The dropped row inc-049 sits in identification-and-permanent-address.

**Cross-theme dependencies:**

- inc-052 (germinal-products) on inc-045 (identification-and-permanent-address): germinal identification copies the live-animals page.
- inc-096, inc-097 (consignment-parties) on inc-054 (identification-and-permanent-address): the Addresses card and the amend ending follow the permanent address page.
- inc-243 (consignment-parties) on inc-055 (identification-and-permanent-address): the same-checks rule reaches the permanent address page's own validation.
- inc-126 (animals-dashboard) on inc-120, inc-121, inc-125 (manage-notifications): it proves deleting an amending notification.
- inc-132 (ins-dashboard) on inc-131, inc-147 (animals-dashboard): the drill-down lists what the backend marks as action needed.
- inc-141, inc-172, inc-176 (germinal-products) on inc-129, inc-130, inc-135, inc-136, inc-137, inc-138, inc-140, inc-196 (animals-dashboard): the germinal list copies the finished reframe.
- inc-145 (ins-dashboard) on inc-141 (germinal-products): the home's germinal section links to the germinal list.
- inc-181 (germinal-products) on inc-091 (consignment-parties) and inc-054 (identification-and-permanent-address): it leaves out the pages those rows make.
- inc-182 (germinal-products) on inc-094, inc-095, inc-097 (consignment-parties): the germinal journey copies each finished page.
- inc-185 (germinal-products) on inc-120, inc-121, inc-123, inc-124, inc-125 (manage-notifications) and inc-126 (animals-dashboard): germinal lifecycle actions copy the finished ones.
- inc-014 (waiting-on-design) on inc-016 (germinal-products): as-you-type search enhances both sets' server search.
- inc-093 (waiting-on-design) on inc-091 (consignment-parties); inc-192 on inc-053 (germinal-products); inc-193 on inc-087 (consignment-parties) and inc-181 (germinal-products); inc-194 on inc-042 (transporters); inc-195 on inc-120, inc-121 (manage-notifications) and inc-185 (germinal-products): each enhances a page another theme builds without JavaScript.
- 48 rows depend on a row in a split-off theme's own workarea (marked † in the increment tables). Those are real: each copies or enhances a page the branch finishes.

## For the split branches

A split-off theme's rows live only in its own backlog, on its own branch, so this re-distil never rewrote them. The people building each branch add or change rows in that branch's own backlog, citing the requirement ids below.

### type-question-and-templates

Branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, backlog `shared/design-release-2-1/themes/type-question-and-templates/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-1299 | New since the split | Manage templates has a "Sort by" control inside a form whose button reorders the list, with the options design names. Blocked on design question 11. |
| req-2107 | New since the split | While a trader is creating or changing a live animals or germinal products template, each party picker's "Add a new address" round trip and each role's "Edit details" page work as they do in a notification, on the same pages. |
| req-2202 | New since the split | On every live animals and germinal products template page that offers both "Save and continue" and "Save and return to overview", the two buttons make the same checks. |
| req-2136 | New since the split | On the high-risk plants commodity type page "Save and return to overview" makes the same checks as "Save and continue": with nothing chosen, or a type that is not offered, the page is refused. |
| req-962 | Changed since the split | "Create new" and "Use template" show under the home's heading on every visit, whether or not the trader has any notifications, above the home's search. |
| req-963 | Changed since the split | "Create new" goes to the start of the create journey: the notification type choice, with no category preselected, asked before origin of the import. |
| req-964 | Changed since the split | The home has a secondary "Use template" button, a link styled as a button, that opens Manage templates. |
| req-965 | Changed since the split | On every frontend (both animals sets, the INS frontend and the plants frontend), a signed-in user's service navigation reads, in order, Dashboard, Templates, Address book, Manage account, Log out. |
| req-1294 | Changed since the split | Every templates page (Manage templates, Enter template name, the template page, and the delete and discard confirmations) shows the Alpha phase banner. |
| req-2048 | Changed since the split | Template mode is another way of walking each set's own journey pages, in the live-animals and germinal products sets only: the same pages, the same questions and the same stored answers as a notification, with no copied template pages and no forked journey. |
| req-1327 | Changed since the split | In template mode, saving "What are you importing?" returns to the template's task list. |
| req-1328 | Changed since the split | While a template is being created, the status strip on its task list and question pages shows a grey "Template" tag followed by the template's name. |
| req-1329 | Changed since the split | A template's task list is headed "Template tasklist", and keeps the "Overview" h1 and the "Your commodities" figures. |
| req-1333 | Changed since the split | A template's task list ends with a primary "Review template" button to the template review and a secondary "Return to manage templates". |
| req-814 | Changed since the split | When the hub is showing a template being created, the status strip above the heading reads "Template" as its tag and shows the template's name beside it in place of a notification reference. |
| req-941 | Changed since the split | "Review template" opens the review page titled "Review your template - Import notification service - GOV.UK" with the h1 "Review your template". |
| req-1344 | Changed since the split | A template saves the notification's country and region of origin, internal reference, commodity codes, common names and species, reason for import, purpose, certified for, unweaned animals, temperature, totals, selections, weights, identification details, port of entry, transport answers, the transporter's details and the CPH number. |
| req-1345 | Changed since the split | A template never holds an arrival date or time, including after a section of an existing template is changed and saved. |
| req-543 | Changed since the split | While a trader is creating a template, Upload documents is not offered: the one journey's template mode skips the page and its overview has no Documents task. |
| req-1616 | Changed since the split | A journey page's Back link goes to the overview when the page was opened from the overview, to the template's review page when the template is being reviewed, and otherwise to the previous page in the opening run. |

Questions 3 and 4 (c-308, c-318) also shape this branch's template-mode rows, and question 30 (c-372) shapes req-2202. Their defaults are under Questions for Sam.

### journey-foundation

Branch `feat/EUDPA-691-design-release-2-1-journey-foundation`, backlog `shared/design-release-2-1/themes/journey-foundation/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-405 | New since the split | In the journey run (the transporter list reached from arrival details), "Save and continue" on the transporter list goes on to the next page of the Design Release 2.1 order. |
| req-582 | New since the split | On a new notification's opening run, "Save and continue" on the roles and addresses page goes on to the contact address for this consignment. |
| req-1611 | Changed since the split | In the opening run, "Save and continue" on Roles and addresses goes to "Contact address for this consignment". |
| req-1612 | Changed since the split | When every section on the overview is already complete, "Save and continue" on Roles and addresses returns to the overview. |
| req-1615 | Changed since the split | A page opened from a task on the overview returns to the overview on "Save and continue". |
| req-1616 | Changed since the split | A journey page's Back link follows the context it was opened in. |
| req-1625 | Changed since the split | On every page that offers both, "Save and continue" and "Save and return to overview" make exactly the same checks, with no page an exception. |
| req-1655 | Changed since the split | The tests repo walks a cattle-by-air notification (identification, the unweaned question and a CPH number) from create to submitted in the journey's step order. |
| req-1988 | Changed since the split | In the high-risk plants frontend, "Continue" on the last step of the opening run (the consignment contact page) goes to plants' check your answers page. |
| req-808 | Changed since the split | A page opened from a hub row goes to the hub on "Save and continue". |
| req-1934 | Changed since the split | In the high-risk plants frontend, a page opened from a task row on the Overview goes to the Overview on "Save and continue" once the row's own pages are done. |
| req-1403 | Changed since the split | While a submitted notification is being amended, each page the overview links to, including a question page opened from the amend review, ends with the amend button set. |
| req-1406 | Changed since the split | Continue on the amend review is held while any answer is invalid or incomplete. |
| req-1398 | Changed since the split | During an amendment, the review page and every question page show an Amend status bar above the caption and heading. |
| req-782 | Changed since the split | While a submitted notification is being amended, the hub's status line also shows a "Cancel amend" link-style control. |

Question 30 (c-372) shapes req-1625 and req-1641. Its default is under Questions for Sam.

### reference-lists

Branch `feat/EUDPA-692-design-release-2-1-reference-lists`, backlog `shared/design-release-2-1/themes/reference-lists/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-1768 | Changed since the split | Each "Port of exit" option, on both the transit and the temporary admission selects, reads "<port name> - <port code>" (for example "Port of Dover - GBDVR"). |

### commodities-and-reason

Branch `feat/EUDPA-693-design-release-2-1-commodities-and-reason`, backlog `shared/design-release-2-1/themes/commodities-and-reason/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-1759 | New since the split | Pressing Remove on Commodity details keeps the numbers the trader has typed but not yet saved, so they are still in their fields when the page comes back. |
| req-2130 | New since the split | The commodity page's commodity, type and species lists come from MDM through trade-imports-reference-data. Blocked on MDM commodities. |
| req-2131 | New since the split | Where a type applies to the chosen commodity, the commodity page offers that commodity's types from MDM's type list and narrows the species on offer to them. Blocked on MDM commodities. |
| req-2132 | New since the split | A number of animals above 9,223,372,036,854,775,807 is refused with an error on that species' number of animals field. |
| req-2137 | New since the split | The unweaned question is also asked when at least one selected commodity is a pig, sheep or goat. Blocked on MDM commodities. |
| req-094 | Changed since the split | The live-animal catalogue adds Design Release 2.1's commodities the real one lacks, each with its code and species: Pig (0103), Sheep (010410), Goat (010420) and the rest. Blocked on MDM commodities. |
| req-095 | Changed since the split | Commodity code 0102 is named "Cattle", not "Cow", wherever it shows. Blocked on MDM commodities. |
| req-096 | Changed since the split | Cattle (0102) offers Design Release 2.1's 11 species. Blocked on MDM commodities. |
| req-097 | Changed since the split | Horse (0101) offers three species: Donkey, Horse and Mule. Blocked on MDM commodities. |
| req-098 | Changed since the split | Cat (01061900) offers "Domestic cat (Felis catus)" and Dog (01061900) offers "Domestic dog (Canis familiaris)". Blocked on MDM commodities. |
| req-099 | Changed since the split | The catalogue adds Ferret (01061900) and Other live mammals (01061900) with their species. Blocked on MDM commodities. |
| req-100 | Changed since the split | Ornamental fish (030111), with Cyprinidae, Poeciliidae and Cichlidae, replaces the real catalogue's Fish (0301) with Atlantic salmon. Blocked on MDM commodities. |
| req-101 | Changed since the split | Data errors in the design's species list are corrected rather than copied: the horse species reads "Equus caballus" and the mule "Eq caballus*asinus". Blocked on MDM commodities. |
| req-112 | Changed since the split | "Number of packages (when required)", hinted "Such as crates, bags or boxes", is asked for a chosen species only where the V4 data fields page's 54-commodity package-count list names its commodity. Blocked on MDM commodities. |
| req-1642 | Changed since the split | On Arrival details, in both animals sets, a save is refused only when the means of transport is missing. |
| req-1643 | Changed since the split | On commodity details, a save is refused when a line that asks for a number of packages has none. |
| req-166 | Changed since the split | "Save and return to overview" on the main import reason page makes exactly the same checks as "Save and continue", and differs only in where it goes when the page passes. |
| req-180 | Changed since the split | "Save and return to overview" on the additional details page makes exactly the same checks as "Save and continue". |
| req-175 | Changed since the split | The unweaned question is asked when at least one selected commodity is an equine (horses, asses, mules and hinnies) or cattle, and left off the page otherwise. |

Questions 7, 8, 9 and 10 (c-325, c-326, c-327, c-330) shape this branch's commodity and reason rows. Their defaults are under Questions for Sam.

### arrival-and-transit

Branch `feat/EUDPA-694-design-release-2-1-arrival-and-transit`, backlog `shared/design-release-2-1/themes/arrival-and-transit/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-329 | Changed since the split | Save and return to overview on arrival details and on transit countries makes the same checks as Save and continue: a missing means of transport and every other invalid answer is refused with its own error, the trader stays on the page with everything they entered kept, and a valid page saves and shows the overview. |

### origin-page

Branch `feat/EUDPA-695-design-release-2-1-origin-page`, backlog `shared/design-release-2-1/themes/origin-page/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-032 | New since the split | The origin page in the live-animals and germinal products sets is saved only with a country of origin: with no country chosen, Save and continue and Save and return to overview both refuse the page. |
| req-2124 | New since the split | On the origin page, in both animals sets and in the high-risk plants frontend, Save and return to overview makes exactly the checks Save and continue makes. |

Questions 5 and 6 (c-320, c-322) shape this branch's origin rows, and req-033 (the countryless save) is now out of scope. Their defaults are under Questions for Sam.

### overview-and-review

Branch `feat/EUDPA-696-design-release-2-1-overview-and-review`, backlog `shared/design-release-2-1/themes/overview-and-review/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-905 | New since the split | An action-required notification missing both animal identifiers and its ITAHC shows the header warning "You need to complete animal identifiers and upload documents". |
| req-906 | New since the split | An action-required notification missing only animal identifiers shows the header warning "You need to complete animal identifiers". |
| req-908 | New since the split | On an action-required notification, a species that needs identifiers but has none shows "Identification details" with an inline error asking for a minimum number of entries. |
| req-931 | New since the split | A notification that meets the submission minimum but whose identifiers are incomplete is shown as needing action. |
| req-2138 | New since the split | A notification cannot be submitted without a main import reason, the follow-up answers that reason calls for, and what the animals are certified for. |
| req-794 | Changed since the split | The third row of section 1 reads "Main import reason", in English and in the Welsh copy. |
| req-1979 | Changed since the split | On the plants Overview, assistive technology can move by region: each numbered group, its heading and its task list, is a region named by that group's heading. |
| req-854 | Changed since the split | The review reads the means of transport back with the option labels the transport page offers, for example "Air". |
| req-680 | Changed since the split | On the review page each consignment party and the contact address read back as the name followed by the address lines and country. |
| req-1992 | Changed since the split | While a plants notification is being amended, check answers offers "Cancel amend" as a secondary button beside Continue. |
| req-898 | Changed since the split | A submitted notification's view, for Submitted, Submitted action required and Completed alike, shows an "Import reference numbers" section with its warning. |
| req-2001 | Changed since the split | A submitted plants notification's view shows an "Import reference numbers" section with the warning about using the correct reference and code. |
| req-909 | Changed since the split | Submitting records the date the notification was declared and submitted, and which outstanding items remained at that moment. |
| req-1987 | Changed since the split | Notification statuses are only ever added, never renamed or removed: DRAFT, SUBMITTED, AMEND and DELETED keep their names and meanings. |
| req-929 | Changed since the split | The outstanding documents item applies when no uploaded document is an ITAHC or health certificate, even if other documents were uploaded. |
| req-937 | Changed since the split | The confirmation page's "contact HMRC" and "Find out about call charges" links open in a new tab, and their link text does not say so. |
| req-900 | Changed since the split | A draft's review, at the one review route reached from the hub's "Review and submit", shows the view header with its Draft status and stays editable. |

Questions 14, 23, 24 and 29 (c-336, c-364, c-365, c-371) shape this branch's review and submit rows. Their defaults are under Questions for Sam.

### design-snagging

Branch `feat/EUDPA-720-design-release-2-1-design-snagging`, backlog `shared/design-release-2-1/themes/design-snagging/backlog.json`. The related branch `feat/EUDPA-720-design-release-2-1-design-snagging-b` holds 5 more rows that this backlog's rows depend on.

| Requirement | What happened | What it now says |
|---|---|---|
| req-040 | Changed since the split | With JavaScript only, the region code prefix follows the country the moment the user picks it (France gives FR, Netherlands NL), with no form submission. Blocked on design question 2. |
| req-041 | Changed since the split | With JavaScript, before any country is chosen, the revealed region code box shows an empty prefix element in front of it, which fills in once a country is picked. Blocked on design question 2. |
| req-603 | Changed since the split | Pressing "Save and continue" on a party picker with no address chosen shows no error and leaves the party as it was. |
| req-015 | Changed since the split | The country of origin question has no hint text, on the origin page of both animals sets and on the plants origin page. |
| req-034 | Changed since the split | The origin task counts as complete only when a country is chosen and the region of origin code question is answered, with a code where the answer is Yes. |
| req-131 | Changed since the split | The main import reason page's h1 reads "Main import reason" and its browser title "Main import reason - Import notification service - GOV.UK". |
| req-145 | Changed since the split | Every "Destination country" select on the reason page starts with an empty option reading "Select one". |
| req-148 | Changed since the split | Every "Port of exit" select on the reason page starts with an empty option reading "Select one". |
| req-309 | Changed since the split | The first means of transport option reads "Air". |
| req-310 | Changed since the split | The second means of transport option reads "Rail". |
| req-311 | Changed since the split | The third means of transport option reads "Road". |
| req-312 | Changed since the split | The fourth means of transport option reads "Sea". |
| req-1917 | Changed since the split | In the high-risk plants frontend, a journey page's Back link, the origin page's included, follows the context it was opened in, as in live animals. |
| req-203 | No longer to build | Now a question (c-337, question 15): "Save and continue" and "Save and return to overview" save the typed identifiers of every species panel whose form holds a value. The default keeps today's behaviour, so nothing is built. |
| req-204 | No longer to build | Now a question (c-337, question 15): a species panel's own save button checks every open species panel and saves one animal for each panel whose form holds a value. The default keeps today's behaviour, so nothing is built. |

### documents

Branch `feat/EUDPA-724-design-release-2-1-documents`, backlog `shared/design-release-2-1/themes/documents/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-2179 | New since the split | The Document type select also offers Self-declaration after Veterinary health certificate, CITES permit/certificate after Import permit, and Packing list / species list. Blocked until the GBN-AG codelist owners add codes for them. |
| req-499 | Changed since the split | The Document type select offers, in order: Intra Trade Animal Health Certificate (ITAHC), Veterinary health certificate, Journey log, Import permit and the rest of the business's thirteen types. |
| req-540 | Changed since the split | Save and return to overview makes exactly the same checks as Save and continue: a document detail that is missing or not valid holds the trader on the page with an error for each one. |

Questions 18 and 19 (c-350, c-351) shape this branch's document rows. Their defaults are under Questions for Sam.

### address-book

Branch `feat/EUDPA-707-design-release-2-1-address-book`, backlog `shared/design-release-2-1/themes/address-book/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-611 | New since the split | The address book holds one or more roles on each address record and lets a frontend list an organisation's addresses for one role. |
| req-2186 | New since the split | On the add-address page reached from a party picker, "Save and return to address page" makes exactly the same checks as "Save and select". |
| req-2199 | New since the split | Going back from "Add address and contact details" to "Choose an address type" and continuing again shows the address, the contact details and the ticked type as they were. |
| req-1859 | Changed since the split | The address types offered when adding an address read, in order, with their hints: "Place of Origin", and the rest. |
| req-1115 | Changed since the split | Search and the Type filter sit inside a collapsible "Filter addresses" disclosure with a chevron, collapsed when the list loads with no search or Type. |
| req-1118 | Changed since the split | The search field has an icon-only search button whose accessible name is "Search", a real submit button of the filter form. |
| req-1133 | Changed since the split | The list's filter holds the search field, the Type select and the search button and nothing else. |
| req-1147 | Changed since the split | The success banner stays on the page until the user leaves or reloads it, and no script hides it on a timer. |
| req-1148 | Changed since the split | After a delete the list's success banner reads "<name> address deleted", or "Address deleted" when the name is missing. |
| req-1176 | Changed since the split | The delete page shows a summary list with one row, "Address", holding the name, each address line and the country on separate lines. |
| req-1177 | Changed since the split | Below the summary the delete page says "Confirm that you want to delete this address." |
| req-1167 | Changed since the split | The view and delete pages honour a return query: Back, Edit and Delete carry it on. |
| req-1123 | Changed since the split | The list is split into category tabs, in this order: "Origin and Consignor", "Destination, Consignee and Importer" and "Branch", as MoJ sub navigation. |
| req-1124 | Changed since the split | Each tab panel has its own heading: "Origin and Consignor addresses", "Destination, Consignee and Importer addresses" or "Branch addresses". |
| req-1125 | Changed since the split | An address appears on every tab whose category holds any of its types. |
| req-1139 | Changed since the split | The Type column shows the address's type labels joined by ", ", using the list's labels. |
| req-1187 | Changed since the split | The tests repo's shared address book fixtures each carry one of the address types the add flow offers, so they land on the right category tab. |
| req-1861 | Changed since the split | The k6 performance suite's address book scenarios work against a list split into category tabs. |
| req-1129 | Changed since the split | The filter has a select labelled "Type" whose first option is "Select one", then options for the current tab only. |
| req-1130 | Changed since the split | The Type filter keeps an address when one of its types equals the choice; the list API takes the type and category. |
| req-1119 | Changed since the split | Search matches the trimmed text, case-insensitively and anywhere inside a word, against the name, the type labels and every address line. |
| req-1121 | Changed since the split | The address book filter is a GET form carrying the selected tab, the search and the Type filter. |
| req-1188 | Changed since the split | End-to-end specs reach the address book's view and delete pages through its own links. |
| req-1870 | Changed since the split | The k6 performance suite's address-book scenarios work with the add's "Choose an address type" step and its uses question. |
| req-1862 | Changed since the split | While the add-details step offers no address search, "Destination, Consignee or Importer" and "Branch" open it with the address fields and contact fields visible. |
| req-1217 | Changed since the split | Once address search is built, picking a search result fills address line 1, address line 2, town or city and postcode from the result, with country United Kingdom. Blocked on the address lookup. |
| req-1218 | Changed since the split | Once the address lookup is a real feature, the address searches find real UK addresses from the lookup the INS backend serves. Blocked on the address lookup. |
| req-2043 | Changed since the split | Once address search is built, it works without JavaScript: the search is a form whose submit button sends the typed term to the server. Blocked on the address lookup. |
| req-672 | Changed since the split | "Save and select" saves the new address to the address book, puts a copy of it on the notification for the role it was added for, and returns the trader. |
| req-1284 | Changed since the split | A notification journey's "Add a new address" keeps handing over to the INS address book add through today's handshake. |
| req-644 | Changed since the split | The manual-entry Country select on the add-address page is a plain select rather than the accessible autocomplete. |
| req-1186 | Changed since the split | Every new or changed English string on the list, view and delete pages has a Welsh counterpart, kept marked as an unreviewed machine draft. |
| req-1136 | No longer to build | Out of scope: showing a multi-word name on two lines in the Name column is the shape of the prototype's seeded rows, not a design rule. |

Questions 22, 26, 27 and 28 (c-360, c-367, c-368, c-369) shape this branch's address rows. Their defaults are under Questions for Sam.

## Where the requirements came from

- 15,988 claims were taken from 24 sources. 15,869 held, 119 were dropped as refuted and 753 were added as missed.
- Reconcile weighed 22 areas apart: notification type and origin; commodities; main reason and additional details; animal identification; the germinal products set; arrival, port of entry and transit; transporters; documents; roles and addresses and the party pickers; adding and editing a party address; CPH, permanent address and contact address; the notification hub; review, declaration and submitted; the dashboard home and its drill-downs; notification lists; the address book list, view and delete; the address book's add and edit; templates; amend, cancel amendment, copy as new and delete; the notification record, persistence and publishing; journey flow and what applies when; and layout, navigation and sign-in.
- 2,111 requirements were made. 1,867 are adopted: 983 to build (493 new, 490 changes) and 884 already in place. 26 are questions and 218 are out of scope.
- The backlog covers 961 of the 983 to build: 433 in this backlog's ready or blocked rows and 528 on the split branches. 186 of the 961 are in blocked rows or on a blocker. The remaining 22 are the pick-ups each split branch must add, listed above. inc-129 also carries req-2029, the default of question 2.
- 16,496 of the 16,622 working-set claims are cited by a requirement or a conflict.

| Source | Rank | Claims | Held | Dropped | Added | Cited | Requirements backed (in scope) |
|---|---|---|---|---|---|---|---|
| ruling:sam-2026-10-26 | 1 | 26 | 26 | 0 | 2 | 28 of 28 | 48 (41) |
| ruling:sam-2026-10-09-pm | 2 | 302 | 301 | 1 | 5 | 278 of 306 | 524 (479) |
| ruling:sam-2026-10-09-templates | 3 | 52 | 52 | 0 | 0 | 49 of 52 | 72 (65) |
| ruling:sam-2026-10-09 | 4 | 200 | 199 | 1 | 2 | 199 of 201 | 357 (315) |
| ruling:sam-2026-10-07 | 5 | 23 | 23 | 0 | 0 | 14 of 23 | 70 (64) |
| confluence:6497338582 | 6 | 648 | 646 | 2 | 17 | 663 of 663 | 208 (181) |
| document:dr1-parity-notes | 7 | 88 | 88 | 0 | 1 | 89 of 89 | 58 (45) |
| document:dr1-parity-backlog | 8 | 481 | 481 | 0 | 64 | 545 of 545 | 173 (146) |
| prototype:dr2-1-source | 9 | 1,705 | 1,683 | 22 | 81 | 1,763 of 1,764 | 1,166 (1,071) |
| trace:prototype-dr2-1 | 10 | 1,791 | 1,784 | 7 | 85 | 1,788 of 1,869 | 1,044 (973) |
| prototype:dr2-1-specs | 11 | 1,003 | 998 | 5 | 8 | 1,005 of 1,006 | 637 (599) |
| repo:backend | 12 | 688 | 683 | 5 | 26 | 709 of 709 | 185 (165) |
| repo:insbackend | 13 | 132 | 132 | 0 | 8 | 140 of 140 | 4 (0) |
| repo:addressbook | 14 | 339 | 336 | 3 | 12 | 348 of 348 | 48 (45) |
| repo:referencedata | 15 | 98 | 96 | 2 | 5 | 101 of 101 | 18 (16) |
| repo:stub | 16 | 130 | 130 | 0 | 6 | 136 of 136 | 15 (12) |
| repo:frontend | 17 | 1,852 | 1,843 | 9 | 97 | 1,940 of 1,940 | 899 (857) |
| repo:insfrontend | 18 | 638 | 638 | 0 | 31 | 669 of 669 | 193 (179) |
| repo:plantsfrontend | 19 | 1,079 | 1,073 | 6 | 67 | 1,139 of 1,140 | 269 (228) |
| repo:tests | 20 | 907 | 897 | 10 | 39 | 936 of 936 | 426 (406) |
| repo:perftests | 21 | 145 | 143 | 2 | 19 | 162 of 162 | 55 (52) |
| trace:animals-fit | 22 | 1,948 | 1,921 | 27 | 81 | 2,002 of 2,002 | 798 (763) |
| trace:ins-fit | 23 | 250 | 248 | 2 | 27 | 275 of 275 | 114 (110) |
| trace:e2e | 24 | 1,463 | 1,448 | 15 | 70 | 1,518 of 1,518 | 808 (773) |

- Every source backs at least one requirement. No source's cited share is under a tenth. The lowest is Sam's 7 October ruling, 14 of 23; later rulings restate its uncited claims.
- The V4 data fields page's claims rose from 109 to 648 when its scope was widened on 2 November 2026 to the whole page. All 663 of its working-set claims are cited, and it now backs 208 requirements, 181 of them in scope. That widening is what changed req-112, req-175, req-699 and the live-animal party, transporter, arrival and address rows.
- The INS backend backs 4 requirements, none in scope. Its read model stays off the lists' path (req-1097, req-1104, req-1105, req-1855). Conflicts cite most of its claims.
- Strongest: req-509 rests on 11 sources. 12 requirements rest on 10 each: req-106, req-137, req-499, req-504, req-564, req-588, req-597, req-608, req-1032, req-1410, req-1415 and req-1676.
- Weakest: 202 adopted requirements rest on one source. Most are today's code staying as it is: the animals backend (63), plants frontend (27), the prototype source (21) and the animals frontend (19) lead.
- 51 of those single-source requirements are to build: req-058, req-183, req-184, req-267, req-328, req-375, req-610, req-745, req-757, req-791, req-815, req-817, req-818, req-1013, req-1014, req-1022, req-1023, req-1081, req-1103, req-1127, req-1185, req-1187, req-1208, req-1262, req-1279, req-1294, req-1301, req-1326, req-1332, req-1336, req-1344, req-1359, req-1365, req-1367, req-1372, req-1378, req-1404, req-1430, req-1751, req-1752, req-1785, req-1789, req-1799, req-1806, req-1856, req-1870, req-2002, req-2052, req-2103, req-2107 and req-2138.
- Confirm before passing this on: four requirements count as already in place with no claim from today's code. req-374 rests on the DR1 backlog and the prototype source, req-1858 on the prototype source alone, and req-1488 and req-2050 on rulings alone.

## Out of scope

218 requirements are out of scope. Each is listed once, under the reason it is out.

### Reference-list content, handed to MDM

List content is master data MDM owns, so a difference from Design Release 2.1 goes to MDM as a content report rather than into code: req-026, req-027, req-028, req-029, req-065, req-302, req-303, req-1766, req-1767, req-1818.

### Search mechanics the real component replaces

The afternoon ruling makes a search box the real frontends' accessible component, behaving as they configure it, so the prototype's own search mechanics are not copied: req-017, req-621, req-622, req-623, req-624, req-1908.

### Other notification types

Plants for planting, potatoes and wood products belong to the high-risk plants journey in its own frontend, and the prototype's fall-through to the live-animals pages is not a design: req-059, req-1668, req-1764, req-1921, req-1922, req-1923, req-1924.

### URL paths, field names and data shapes the prototype does not decide

The 9 October ruling keeps architecture with the real services: req-271, req-477, req-626, req-1016, req-1128, req-1341, req-1342, req-1355, req-1357, req-1362, req-1366, req-1829, req-1855, req-1887, req-2059.

### Prototype mechanics, seed data and defects

The prototype's version mount, session storage, seeded demonstration data, custom classes and markup defects are how it is built, not what it designs: req-189, req-190, req-378, req-383, req-396, req-410, req-419, req-438, req-469, req-471, req-625, req-750, req-751, req-776, req-819, req-821, req-946, req-947, req-1017, req-1018, req-1106, req-1107, req-1136, req-1150, req-1170, req-1189, req-1286, req-1287, req-1289, req-1290, req-1384, req-1385, req-1386, req-1387, req-1388, req-1389, req-1486, req-1665, req-1666, req-1667, req-1681, req-1682, req-1742, req-1765, req-1846, req-1847, req-2173, req-2196, req-2197, req-2204.

### Set aside by a conflict, a ruling or an accessibility duty

A ruling, a settled conflict or an accessibility duty closes these: req-033, req-369, req-627, req-713, req-904, req-952, req-959, req-1003, req-1031, req-1035, req-1087, req-1097, req-1104, req-1190, req-1288, req-1920, req-1956, req-2118, req-2119.

### Germinal data left out

The V4 change log de-scopes these germinal fields, and the PIMS schema update is EUDPA-686, outside the backlog: req-1802, req-1803, req-1804, req-1805, req-2190.

### DR1 rows that are not requirements

The ruling makes the DR1 parity backlog and notes a source of judgements only, never of requirements: req-192, req-555, req-1734, req-2082.

### Weighed in another area

Each claim describes a page another area owns, and is recorded here only so every claim is weighed: req-198, req-266, req-270, req-482, req-552, req-949, req-1028, req-1029, req-1030, req-1564, req-1778, req-1779, req-1816, req-1817, req-1961, req-2038, req-2081, req-2106, req-2160, req-2182, req-2191.

### Welsh sign-off

Design Release 2.1 is English only, and the Welsh copy is a machine draft that may not ship without Welsh Language Standards sign-off: req-376, req-475, req-554, req-948.

### Plants keeps its own, or plants has parked it

Plants keeps its own questions, data, step order and parked decisions, and a plants change that needs trade-imports-plants-backend is outside the programme: req-1925, req-1926, req-1955, req-1962, req-1972, req-1981, req-1982, req-1983, req-1984, req-1985, req-1994, req-2003, req-2025, req-2047, req-2055, req-2056, req-2062, req-2063, req-2064, req-2075, req-2095, req-2096, req-2104, req-2108, req-2109, req-2110, req-2116, req-2121, req-2129, req-2168, req-2192.

### Problems for the owning teams

Real problems, test gaps and housekeeping in today's services that bringing them up to Design Release 2.1 does not touch. Each needs its own ticket with the owning team. Three of them (req-1482, req-1556, req-1730) are access-control findings and one (req-1154) a platform risk: the detail is in the programme's local files, not here. The rest: req-193, req-377, req-553, req-1105, req-1191, req-1283, req-1481, req-1483, req-1484, req-1485, req-1538, req-1555, req-1563, req-1573, req-1575, req-1578, req-1582, req-1584, req-1587, req-1591, req-1594, req-1602, req-1603, req-1609, req-1669, req-1670, req-1671, req-1717, req-1718, req-1724, req-1726, req-1733, req-1873, req-2181.

### Nothing designed, or nothing to build

No source asks for these, or what they describe is the specification document rather than anything a user or another system can observe: req-191, req-465, req-629, req-1883, req-2161, req-2167, req-2185, req-2211.

## Terms used

| Term | Meaning |
|---|---|
| AB | The address book service repo |
| AF | The animals frontend's own browser-test traces |
| Amend bar | The status bar shown during an amendment, with "Cancel amend" |
| axe | The automated accessibility checker the suites run |
| BE | The animals backend repo |
| CDP | Core Delivery Platform, where the services run |
| CPH | County parish holding number |
| CSRF | Cross-site request forgery protection on form posts |
| deferred.md | The programme's list of work left out because it needs a repo outside the programme |
| DR1 | Design Release 1 parity programme and its judgements |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| E2E | End-to-end tests and traces from the tests repo |
| FE | The animals frontend repo |
| fit | A frontend's own browser tests and their traces |
| GBN-AG | The animals notification type and its published payload |
| GBNAG_SPS_EX | The MDM country block the animals journey uses |
| IF | The INS frontend's own browser-test traces |
| INS | Import Notification Service front door and backend |
| INS-BE | The INS backend repo |
| INS-FE | The INS frontend repo |
| ITAHC | Intra-trade animal health certificate |
| k6 | The load-testing tool the performance suite uses |
| Lands after | The rows that must land before a row builds |
| Mandatory to proceed | An answer the page refuses to be left without |
| Mandatory to submit | An answer a notification cannot be submitted without, which may be left blank meanwhile |
| MDM | Master Data Management, the source of reference lists |
| MoJ | Ministry of Justice design system |
| perf | The k6 performance-test repo |
| PF | The plants frontend repo |
| PIMS Dynamics | The authorities' case system that receives notifications |
| RD | The reference data service repo |
| Read model | The INS backend's copy of notifications for the dashboard |
| Review point | Where the build loop stops for the owner before building on |
| Set root | A set's landing page, such as /live-animals |
| Split branch | A theme split off early, with its own backlog on its own branch |
| Standard Address Block | The shared address shape the V4 data fields page specifies |
| Theme | A group of increments touching its own code, built on its own branch |
| typeCode | The GBN-AG code naming what a trade line is |
| V4 | Live Animals & Germinals Data Fields, version 4 (Confluence page 6497338582), widened to the whole page on 2 November 2026 |
| WCAG | Web Content Accessibility Guidelines |
