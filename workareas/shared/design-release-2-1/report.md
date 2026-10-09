# Design Release 2.1: backlog report

## Summary

- The backlog has 168 increments: 118 ready to go, 45 blocked and 5 dropped. The blocked ones wait on design (12), a transporter decision (10), the INS dashboard's requirements (9), MDM commodities (6), the address lookup (3), PIMS Dynamics outcomes (2), and CDP, the plants backend and the plants customs owner (1 each). 20 rows are review points.
- It brings live animals, germinal products, their notification lists, the INS address book and the INS home's controls up to Design Release 2.1 in look and feel. Plants changes in the same increments. It spans 10 repos in 14 themes here, plus 3 themes split off early.
- 4 questions are open (c-292, c-303, c-308, c-318), and each has a default, so building can start without an answer. This run challenged none, so precedence, rulings and blockers settled none.
- Step 0: correct the goal and the performance suite's reason in `sources.json`. Rows here also wait on rows in the split-off journey-foundation and reference-lists branches (inc-001 to inc-004, inc-122, inc-173).
- 183 requirements wait on someone outside the loop: INS dashboard requirements (58), a transporter decision (47), design answers (33), MDM commodities (21), the address lookup (11), PIMS Dynamics outcomes (8), the plants backend (3), the plants customs owner (1) and CDP (1).
- The split branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates` has 8 requirements to pick up: 2 new since the split and 6 changed.

## Before you build: step 0

1. **Correct the goal in `sources.json`.** The 9 October afternoon ruling changes it in one place, marked **New** below. As the rulings leave it, the goal reads:
   - Bring the real GB notification services up to Design Release 2.1 in look and feel: content, wording, layout, components and question order.
   - In scope: the GBN-AG animals notification as two sibling sets in the animals frontend (live animals and germinal products), each set's own list, its templates and the INS address book.
   - Where a real service differs in look and feel, it changes to match. An owner ruling, a DR1 judgement or a real constraint overrides that.
   - Real constraints are persistence, validation, authentication, cross-service behaviour and accessibility.
   - Where a row changes a page or behaviour plants also has, the same increment changes plants. Plants keeps its own questions and data.
   - Every page works fully without JavaScript. JavaScript only enhances a page that already works.
   - A behaviour uses GOV.UK Frontend first, then another tested government library (MoJ, HMRC, Scottish Government). Otherwise it goes back to design.
   - No custom JavaScript copies the prototype, and no pop-ups are built: confirmations stay pages.
   - JavaScript-only prototype behaviour is its own blocked increment, one per design question, in the waiting-on-design theme. Live filtering waits there too.
   - A search box is the real accessible autocomplete over a native select. MDM supplies its entries. Only labels, order, hint and placeholder follow the prototype.
   - Rolling the component out to more screens is EUDPA-635's work. Fields the prototype shows as plain selects stay plain.
   - Reference-list content (countries, territories, ports) is whatever MDM serves through reference-data. It is never edited in code.
   - For germinal products, the V4 germinal data fields page decides fields, format, limits and mandatory status. Design Release 2.1 decides how pages look and read.
   - Each notification list stays in its own frontend and is reframed in place, in the animals-dashboard theme.
   - **New:** plants' list takes the rest of the frame in the same increments. Its search, sort, additional filters, tabs and page size of 8 wait on `trade-imports-plants-backend` (deferred.md, inc-200).
   - Every page the prototype sends to "the overall dashboard" goes to the set's own list.
   - Adopted but blocked, each re-distilled once unblocked:
     - **Address search** waits until the INS address lookup is a real feature. Until then every add-address page offers manual entry only.
     - **The commodity catalogue and commodity search, live and germinal,** wait until commodities come from MDM. The pages' wording, journey place and questions go ahead on today's data. Moving today's germinal lines into the germinal set goes ahead too.
     - **Transporter management** waits until it is decided whether and where transporters are managed. That covers adding, listing and searching, the type question, the add pages, the private transporter's country list, removing the unused register page and the address book's transporter tab. The step's journey place and its germinal copy go ahead.
     - **The INS dashboard's summary information** waits until its requirements firm up: counts, glance cards, status-change cards and drill-downs. The INS home's controls and templates go ahead.
     - **New:** plants' list search, sort, additional filters, tabs and page size of 8 wait on `trade-imports-plants-backend` (deferred.md).
   - The report groups work as ready or blocked, and names what each blocked row waits on.
   - Architecture (sets, journeys, services, URL paths, field names, data shapes, code structure) stays the real services'. It changes only where a DR1 judgement, a real constraint or a kept look-and-feel requirement needs it.
   - The owner's rulings may add to data shapes. The 9 October ruling adds a notification category, germinal products details and trade-line typeCodes to the animals backend. The category is stored on the record only and is not published on the notification event.
2. **Correct the performance suite's reason in `sources.json` `reposWhy`.** It still says the live-animals set root "stops rendering the notification list when the list moves to the INS front door (inc-129)". Replace it with this:
   - The k6 suite (perftests) uses the live-animals set root, which keeps rendering the reframed list, so its list request does not move (c-315).
   - It also uses the INS home at `/`. That home's heading and read-model load change only when the blocked overall home is built (inc-128, req-1905).

## Decisions the pipeline made

**Repos (10).** The pipeline chose these from the goal and the rulings:

| Key | Repo | Why |
|---|---|---|
| frontend | trade-imports-animals-frontend | Both animals sets' pages, flow and copy, their lists and the new germinal products set (126 rows) |
| backend | trade-imports-animals-backend | Notification record and lifecycle, list queries, category, germinal details and typeCodes (25 rows) |
| insfrontend | trade-imports-ins-frontend | Address book pages, the journey's add page, and the blocked overall home and drill-downs (39 rows) |
| insbackend | trade-imports-ins-backend | The address lookup and the read model behind the drill-downs: every row blocked (inc-042, inc-132, inc-133, inc-143, inc-144) |
| addressbook | trade-imports-address-book | Address type and uses, category tabs, role filtering and validation messages (8 rows) |
| referencedata | trade-imports-reference-data | Port type that orders the port lists. Its only row, inc-007, is on the split reference-lists branch |
| stub | trade-imports-stub | Northern Ireland lookup addresses (inc-042, blocked). The MDM tidy-up, inc-173, is on the split reference-lists branch |
| tests | trade-imports-ins-tests | Every service's end-to-end suite (161 rows) |
| perftests | trade-imports-performance-tests | k6 scripts a change breaks: inc-012, inc-015, inc-067, inc-070, inc-120, inc-128, inc-129, inc-136 |
| plantsfrontend | trade-imports-plants-frontend | Pages and behaviour plants shares with the animals sets, changed in the same increment (32 rows) |

Read but not changed: the Design Release 2.1 prototype (`defra-design/GB-notification-service` at 04a073b), its traces and specs, the DR1 parity notes and backlog, and the V4 germinal data fields page. `trade-imports-schemas` and `trade-imports-dynamics-gateway` do not change (c-272, c-296). `trade-imports-plants-backend` is outside the programme, so inc-200 waits on it.

**Which source wins a disagreement**, highest first:

1. Sam's ruling of 9 October 2026, afternoon (`ruling:sam-2026-10-09-pm`)
2. Sam's ruling of 9 October 2026 on templates and the dashboard (`ruling:sam-2026-10-09-templates`)
3. Sam's ruling of 9 October 2026, morning (`ruling:sam-2026-10-09`)
4. Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`)
5. Live Animals and Germinals Data Fields V4, germinal data elements (`confluence:6497338582`)
6. DR1 parity programme notes (`document:dr1-parity-notes`)
7. DR1 parity backlog judgements (`document:dr1-parity-backlog`)
8. Design Release 2.1 prototype source (`prototype:dr2-1-source`)
9. Design Release 2.1 traces (`trace:prototype-dr2-1`)
10. Design Release 2.1 specs (`prototype:dr2-1-specs`)
11. Animals backend (`repo:backend`)
12. INS backend (`repo:insbackend`)
13. Address book (`repo:addressbook`)
14. Reference data (`repo:referencedata`)
15. Stub (`repo:stub`)
16. Animals frontend (`repo:frontend`)
17. INS frontend (`repo:insfrontend`)
18. Plants frontend (`repo:plantsfrontend`)
19. Tests repo (`repo:tests`)
20. Performance tests (`repo:perftests`)
21. Animals frontend fit traces (`trace:animals-fit`)
22. INS frontend fit traces (`trace:ins-fit`)
23. End-to-end traces (`trace:e2e`)

The prototype wins on look and feel by default. It never decides architecture. V4 outranks it on germinal data, format and mandatory status.

## Questions for Sam

This run challenged none of the 4 questions against precedence and the rulings. None was settled or found to wait on a blocker. Each question lists the default built if nobody answers.

### 1. Does the plants contact picker also drop its five-a-page pagination and "Selected address" inset?

- **Default:** No. inc-087 changes only the plants consignor and place of destination pickers. The contact picker keeps pagination and its inset, and takes only the shared layout change (req-1964, req-1965).
- **Affects:** inc-086, inc-087.
- **Why it is open:** The afternoon ruling says plants' pickers lose pagination and the inset, under inc-087's role-filtered pickers. The plants contact picker asks for no role and lists the whole address book (c-291). It reads either way (c-292).

### 2. What does the high-risk plants notification list's h1 say?

- **Default:** "Plants", the prototype's own label for plants notifications. Its Welsh machine draft ships only after translator sign-off (req-2029).
- **Affects:** inc-129.
- **Why it is open:** The reframed list names its category in the h1. The prototype has no plants list, and nothing names plants' category for a heading. Today plants' h1 is "Import notification service" (c-303).

### 3. In template mode, does a journey page keep the notification's required-answer checks?

- **Default:** Yes, for live animals and germinal products. Malformed answers are refused. "Save and continue" needs the page's required answers. "Save and return to overview" skips required checks (req-2049).
- **Affects:** the template-mode rows on the type-question-and-templates branch (from inc-154), and inc-186.
- **Why it is open:** The templates ruling allows different checks in template mode but does not say which. No trace fills most template-mode pages (c-308).

What Design Release 2.1 already does differently for a template stands: no arrival date, an optional name, unanswered sections allowed. Plants has no template mode. The mode chooses the checks in one place, so an answer changes no page.

### 4. Does a template hold every answer a notification holds, or only those Design Release 2.1 saves?

| Answer | Default |
|---|---|
| Arrival date and time | Never asked or held (req-1345) |
| Documents | Never asked or held (req-1334) |
| Transit countries, live animals | Held as answered and seeded, because the design offers their Change link (req-2112) |
| Germinal products | Whatever the germinal pages ask, less the arrival date |
| Storage | The notification's own shape on the same pages, with no separate template data model |

- **Default:** as the table shows. Plants has no templates.
- **Affects:** the template rows on the type-question-and-templates branch, and inc-186.
- **Why it is open:** The templates ruling hedges with "maybe the same data". The 9 October ruling gives the prototype which questions are asked. Design Release 2.1 contradicts itself on transit countries: a Change link for answers it never saves (c-318).

## Waiting on others

Each row lists every requirement one increment builds once that blocker clears. Design questions come from the 9 October afternoon ruling.

| Requirement | Waiting for | Increment |
|---|---|---|
| req-018, req-296 | Design: question 1, search buttons beside the origin, port, transit and landing searches | inc-188 |
| req-020 | Design: question 13, whether the autocomplete's own announcements can stand | inc-189 |
| req-040, req-041 | Design: question 2, region code prefix following the country live | inc-190 |
| req-072, req-073, req-074, req-1782 | Design: question 3, commodity search as you type. Also MDM commodities | inc-014 |
| req-348, req-349, req-353, req-354 | Design: question 4, transit countries added and removed in place | inc-030 |
| req-592, req-2039 | Design and the product owner: question 5, live filtering on the party pickers | inc-193 |
| req-1951 | Design: question 6, place of origin rows filtering as you type (with question 5) | inc-197 |
| req-711, req-712 | Design: question 7, CPH box JavaScript | inc-093 |
| req-1986 | Design: question 8, Copy buttons (MoJ's is not accepted) | inc-198 |
| req-1393 | Design: question 9, amend and cancel-amendment pop-ups (expected answer: not built) | inc-195 |
| req-649, req-652, req-653, req-654, req-1214, req-1216, req-1285, req-1864, req-1957, req-2044 | Design: question 10, address search layout (req-1957 also question 5). Also the address lookup made real | inc-194 |
| req-458 | Design: question 10. Also the address lookup made real and the transporter decision | inc-194 |
| req-1299 | Design: question 11, a templates sort that really reorders | split branch type-question-and-templates (inc-162 here is dropped) |
| req-253 | Design: question 12, the germinal dates' calendar | inc-192 |
| req-094, req-095, req-096, req-097, req-098, req-099, req-100, req-101, req-112, req-1919 | MDM commodities reaching the animals frontend through reference-data, then a re-distil | inc-012 |
| req-075, req-076, req-080, req-081 | MDM commodities, as inc-012 | inc-013 |
| req-093, req-1783, req-1800 | MDM commodities. Until then the germinal set offers today's 12 lines (req-1927) | inc-191 |
| req-175 | MDM commodities: pig joins the catalogue only through MDM | inc-023 |
| req-219, req-220 | MDM commodities: pigs, sheep and goats join only through MDM | inc-051 |
| req-1656 | MDM commodities: poultry is only in the MDM catalogue | inc-019 |
| req-386, req-387, req-389, req-390, req-392, req-397, req-398, req-399, req-470 | A decision on whether and where transporters are managed. The ruling names nobody | inc-037 |
| req-416, req-417, req-420, req-421, req-422, req-425, req-427 | The transporter decision, as inc-037 | inc-038 |
| req-413, req-414, req-440, req-441, req-442 | The transporter decision, as inc-037 | inc-039 |
| req-428, req-429, req-431, req-434 | The transporter decision, as inc-037 | inc-040 |
| req-443, req-444, req-447, req-448, req-449, req-450, req-451 | The transporter decision, as inc-037 | inc-041 |
| req-432 | The transporter decision, as inc-037 | inc-008 |
| req-472 | The transporter decision, as inc-037 | inc-044 |
| req-461, req-462, req-463, req-1198, req-1203, req-1204, req-1205, req-1206, req-2042 | The transporter decision (req-2042 names the product owner) | inc-074 |
| req-1135, req-2040, req-2041 | The product owner's transporter decision | inc-075 |
| req-394 | The transporter decision, as inc-037 | inc-076 |
| req-456, req-457, req-1819 | The address lookup made real (only the EUDPA-390 spike exists). Also the transporter decision | inc-042 |
| req-1217, req-1218, req-1863, req-2043 | The INS front door's and INS backend's address lookup made real | inc-072 |
| req-647, req-648, req-650, req-651 | The INS backend's address lookup made real | inc-081 |
| req-509 | CDP: raise the nginx body cap for the animals frontend to at least 50,001,024 bytes, recorded against EUDPA-518 | inc-036 |
| req-910, req-2114 | A real source of completion. The ruling names none; likely PIMS Dynamics (as req-1082) | inc-116 |
| req-1081, req-1082, req-1083, req-1085, req-1739 | PIMS Dynamics: send post-submission outcomes back to the record | inc-142 |
| req-1735 | PIMS Dynamics outcomes. Also INS dashboard requirements | inc-142 |
| req-951, req-954, req-955, req-971, req-972, req-980, req-981, req-1023, req-1025, req-1848, req-1850, req-2027 | INS dashboard requirements firming up. The rulings name nobody and no date | inc-128 |
| req-1905 | The overall INS home (inc-128) unblocked, because the perf probe follows its heading | inc-128 |
| req-967, req-983, req-984, req-985, req-986, req-987, req-988, req-989, req-993, req-994, req-995, req-996, req-1014, req-1015, req-1019, req-1022 | INS dashboard requirements, as inc-128 | inc-132 |
| req-990, req-991, req-992 | INS dashboard requirements, as inc-128 | inc-133 |
| req-973, req-975, req-976, req-978 | INS dashboard requirements, as inc-128 | inc-134 |
| req-974, req-997, req-998, req-999, req-1000, req-1002 | INS dashboard requirements, as inc-128 | inc-143 |
| req-977, req-1001 | Import-checking systems: send inspection and delay outcomes (DR1 inc-014). Also INS dashboard requirements | inc-143 |
| req-1004, req-1005, req-1006, req-1007, req-1008, req-1009, req-1010, req-1012, req-1013 | INS dashboard requirements, as inc-128 | inc-144 |
| req-1011 | Import-checking systems: send which notifications are chosen for inspection. Also INS dashboard requirements | inc-144 |
| req-979 | INS dashboard requirements, as inc-128 | inc-145 |
| req-982 | Plants teams: publish plants notifications to the INS read model. Also INS dashboard requirements | inc-146 |
| req-1039, req-1040 | INS dashboard requirements: the list's glance-card counts are summary information | inc-139 |
| req-2002 | Plants policy or customs owner: confirm plants' own customs document code (C640 is animals'). The programme owner names who | inc-199 |
| req-2034, req-2035, req-2036 | `trade-imports-plants-backend`: query plants notifications by status, keyword and arrival date, with a page size of 8 (deferred.md) | inc-200 |

## Settled without a question

303 conflicts were settled by precedence. This run's challenge settled none. Missing ids (c-046, c-051, c-086, c-118, c-137, c-182, c-199, c-200, c-254, c-257, c-270) were merged or withdrawn during reconcile.

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
| "Save and return to overview" skips required-answer checks but not format checks | 7 October ruling | c-211 |
| Log out stays last in the navigation on every frontend | 7 October ruling | c-212 |
| Address book item goes to the INS address book from both frontends and both sets | 9 October ruling | c-213 |
| Logo links to gov.uk; service name to each set's or frontend's own dashboard home | 9 October ruling | c-214 |
| Feedback link stays the APHA service desk email, plants included | DR1 backlog | c-215 |
| No page shows the signed-in identity | Animals frontend | c-216 |
| Address search is built in no environment until the lookup is real; manual entry is built now | 9 October ruling | c-217 |
| Northern Ireland transporter search uses the INS lookup filtered to BT postcodes; blocked on the lookup and on transporter requirements | 9 October rulings | c-218 |
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
| Every transporter add, list or search change waits on transporter requirements, inc-008, inc-044 and the commercial address search included; the step's journey place goes ahead | 9 October afternoon ruling | c-285 |
| inc-170's template-review controls go on today's transporter list now | 9 October afternoon ruling | c-286 |
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
| "Choose an address type" is built now with 3 options; "Transporter" waits | 9 October afternoon ruling | c-306 |
| Plants' navigation gains a Templates item to the animals frontend; plants has no templates | Templates ruling | c-307 |
| "Use template" is a form post | 9 October afternoon ruling | c-309 |
| Card Amend goes through the amend confirmation page, in every set | 9 October afternoon ruling | c-310 |
| Plants' status strip reads "Amend" | 9 October afternoon ruling | c-311 |
| Plants' opening run ends on check your answers even when incomplete | 9 October afternoon ruling | c-312 |
| Plants' "Save and return to overview" skips required checks but not format checks | 9 October afternoon ruling | c-313 |
| Each set's root renders its own notification list | 9 October afternoon and templates rulings | c-314 |
| The performance suite does not join the list reframe for a route move | 9 October afternoon ruling | c-315 |
| Arrival and transit keep the "Error: " title prefix and named Remove buttons that work without JavaScript | 9 October afternoon ruling | c-316 |
| Plants' Overview changes only where an animals hub row changes the same page; it keeps its own tags, rows and sections | 9 October afternoon ruling | c-317 |

## Already in place

863 adopted requirements are met today. The second column names where today's evidence shows it. Statements are cut short; the full text is in `distil/requirements.json`.

Key: E2E is the end-to-end traces, animals fit and INS fit the fit traces, FE a frontend repo, BE a backend repo.

| Requirement | What already exists |
|---|---|
| req-009 Starting a notification with 'Create new' on the live-animals s... | animals FE |
| req-011 A new notification gets a reference GBN-AG-<two-digit year>- fo... | E2E, animals fit, tests repo |
| req-012 The origin page has the browser title 'Origin of the import - I... | E2E, animals FE, animals fit, tests repo |
| req-014 The country of origin question reads 'Country of origin', as th... | E2E, animals fit, tests repo |
| req-021 Choosing a country from the results closes the list and leaves ... | E2E, animals fit, tests repo |
| req-022 When nothing matches what was typed, the country results show a... | E2E, animals FE, animals fit, plants FE |
| req-023 The country of origin is submitted and stored as its code (an I... | E2E, animals FE, animals fit, tests repo |
| req-024 A saved country of origin, including a subdivision, is shown ag... | E2E, animals FE, animals fit |
| req-025 The places offered as country of origin are whatever MDM serves... | E2E, animals FE, animals fit, reference data |
| req-031 A submitted country not in the list is refused with 'Select a c... | animals FE, animals fit |
| req-032 The country of origin does not block saving the origin page: th... | E2E, animals FE, animals fit, tests repo |
| req-033 Saving the origin page with no country sets the user down on th... | E2E, animals FE, animals fit, tests repo |
| req-035 The origin page asks 'Does the consignment have a region of ori... | E2E, animals fit, tests repo |
| req-037 Answering Yes reveals, under the Yes option, a 5-character-wide... | E2E, animals FE, animals fit, tests repo |
| req-039 The server still refuses a region code longer than 5 characters... | E2E, animals FE, animals fit |
| req-042 The region code prefix is drawn by the server from the saved co... | E2E, animals FE |
| req-043 The region code prefix is the chosen country's two-letter code,... | E2E, animals FE |
| req-044 The region code is trimmed, upper-cased and stored as prefix, h... | E2E, animals FE, animals fit, tests repo |
| req-045 Answering Yes and leaving the region code empty (or holding onl... | E2E, animals FE, animals fit, tests repo |
| req-047 The region of origin code question may be left unanswered on sa... | E2E, animals FE, animals fit |
| req-048 The origin page has an optional free-text field labelled 'Your ... | E2E, animals FE, animals fit, tests repo |
| req-050 An internal reference over 58 characters is refused with 'Inter... | E2E, animals FE, animals fit |
| req-051 The origin page ends with 'Save and continue', a secondary 'Sav... | E2E, animals FE, animals fit, tests repo |
| req-052 A valid origin page with a country continues to the commodity p... | E2E, animals FE, animals fit, tests repo |
| req-053 A refused origin save is not stored: the server answers 400 and... | E2E, animals FE, animals fit, tests repo |
| req-054 The type and origin pages have an accessible build where the pr... | E2E, animals FE, animals fit, tests repo |
| req-055 The origin form is a server-validated POST (novalidate) carryin... | E2E, animals FE, animals fit |
| req-056 The three origin questions (country label, region code legend, ... | animals FE, animals fit |
| req-060 The reference data service serves GET /countries: a JSON array ... | reference data |
| req-061 The reference data service reads countries from MDM's geography... | reference data |
| req-062 The reference data service caches MDM countries per blocks valu... | reference data |
| req-063 The reference data service answers an empty MDM countries resul... | reference data |
| req-064 The reference data service stays the shared home for MDM-source... | reference data |
| req-066 The commodity page has the browser title 'What are you importin... | E2E, animals FE, animals fit, tests repo |
| req-070 A closed 'Help with commodity codes' details component below th... | E2E, animals FE, animals fit |
| req-077 Search results are grouped under a header naming the commodity ... | E2E, animals FE, animals fit, tests repo |
| req-078 The commodity search matches a species' common name and Latin n... | E2E, animals FE, animals fit, tests repo |
| req-079 A search that matches nothing says 'No results found' and lists... | E2E, animals FE, animals fit, tests repo |
| req-082 Once something is chosen, the selected panel is headed '<N> sel... | E2E, animals FE, animals fit, tests repo |
| req-083 Species from several commodities can be chosen on one notificat... | E2E, animals FE, animals fit, tests repo |
| req-084 Reopening the commodity page shows the species already saved on... | E2E, animals FE, animals fit |
| req-086 When the commodity page or the Commodity details page shows an ... | E2E, animals fit |
| req-090 The commodity page and the Commodity details page each end with... | E2E, animals FE, animals fit |
| req-104 The Commodity details page has the title 'Commodity details - I... | E2E, animals FE, animals fit, tests repo |
| req-106 The Selected commodities table has one row per commodity, excep... | E2E, animals FE, animals fit |
| req-107 Below the Selected commodities table an 'Add another commodity'... | E2E, animals FE, animals fit |
| req-109 Opening Commodity details with no commodity on the notification... | animals FE, animals fit |
| req-110 Commodity details groups the questions under an h2 per commodit... | E2E, animals FE, animals fit |
| req-111 Each live-animal species asks 'Number of animals' with no hint;... | E2E, animals FE, animals fit, tests repo |
| req-113 For live animals the number of packages is optional, but when g... | animals FE, animals fit |
| req-115 A species line that holds animal identifier records cannot be s... | animals FE |
| req-116 Commodity details fills each field with the quantity already sa... | animals FE, animals fit |
| req-120 'Save and return to overview' on Commodity details validates th... | E2E, animals FE, animals fit |
| req-126 On the live-animals set the overview's Commodity details task s... | animals FE, animals fit |
| req-129 The commodity page and Commodity details have no serious or cri... | animals FE, animals fit |
| req-130 Where Design Release 2.1 uses custom markup that looks the same... | E2E, animals fit |
| req-132 The main import reason page shows the caption 'About the consig... | E2E, animals FE, animals fit, tests repo |
| req-133 Both pages sit in the journey layout: a Back link, a strip with... | animals fit |
| req-134 In the live-animals set the main import reason is one radio cho... | E2E, animals FE, animals fit, tests repo |
| req-135 Each reason carries its hint: Internal market 'For imports of a... | E2E, animals FE, animals fit |
| req-136 A main import reason is optional to proceed: Save and continue ... | E2E, animals FE, animals fit, tests repo |
| req-137 Each reason that needs follow-up questions opens them in a stan... | E2E, animals FE, animals fit, tests repo |
| req-138 Choosing Internal market reveals the radio question 'Purpose in... | E2E, animals FE, animals fit, tests repo |
| req-139 Each internal market purpose carries its hint beneath its label... | E2E, animals FE, animals fit |
| req-140 With Internal market chosen and no purpose, Save and continue i... | E2E, animals FE, animals fit, tests repo |
| req-141 Internal market with a purpose (for example Breeding) saves in ... | E2E, animals FE, animals fit |
| req-142 Choosing Transhipment or onward travel reveals one question onl... | E2E, animals FE, animals fit, tests repo |
| req-143 Choosing Transit reveals two selects in this order: 'Port of ex... | E2E, animals FE, animals fit |
| req-144 Choosing Temporary admission horses reveals two questions in th... | E2E, animals FE, animals fit |
| req-146 The destination country selects for transhipment and transit bo... | animals FE, animals fit |
| req-149 The transit and temporary admission 'Port of exit' selects both... | E2E, animals FE, animals fit |
| req-150 The exit date is one text field using the MOJ date picker, labe... | E2E, animals FE, animals fit |
| req-151 With Transhipment or onward travel chosen and no listed destina... | E2E, animals FE, animals fit |
| req-152 With Transit chosen, a missing port of exit shows 'Select a por... | E2E, animals FE, animals fit |
| req-153 With Temporary admission horses chosen, a blank exit date shows... | animals FE, animals fit |
| req-154 An exit date that is not a real calendar date (for example 31/2... | animals FE, animals fit |
| req-155 When the reason page is shown again after a refused submit, the... | animals FE |
| req-156 Only the chosen reason's follow-ups are validated and saved; ch... | E2E, animals FE, animals fit |
| req-157 The notification holds one destination country and one port of ... | E2E, animals FE, animals fit, tests repo |
| req-158 The reason, internal market purpose, certification purpose and ... | animals FE, animals fit |
| req-159 A submitted reason, certification purpose or unweaned value tha... | E2E, animals FE, animals fit |
| req-160 When either page is refused on submit, the browser title is pre... | E2E, animals FE, animals fit |
| req-161 When a saved destination country, port of exit or certification... | animals FE |
| req-162 If saving either page fails, the page is shown again with the u... | animals FE |
| req-165 Both pages end with a 'Save and continue' button, a secondary '... | animals FE, animals fit |
| req-171 The additional details page is headed 'Additional details' (tit... | E2E, animals FE, animals fit, tests repo |
| req-172 The additional details page asks 'What are the animals certifie... | E2E, animals FE, animals fit, reference data, tests repo |
| req-174 When it applies, the additional details page asks 'Does the con... | E2E, animals FE, animals fit |
| req-176 Both additional details questions are optional to proceed: Save... | E2E, animals FE, animals fit, tests repo |
| req-177 The additional details task counts as complete when the page do... | animals fit |
| req-185 Both pages have no serious or critical WCAG 2 A or AA axe viola... | animals FE, animals fit |
| req-186 Both forms post to their own URL with browser validation off an... | animals FE, animals fit |
| req-187 Both pages keep their Welsh copy, and every English string this... | animals FE |
| req-188 Both pages are built from govuk-frontend components (radios wit... | E2E, animals fit |
| req-194 The page heading (h1) is 'Identification details' and the brows... | E2E, animals FE, animals fit, tests repo |
| req-195 The heading carries the caption 'About the consignment'. | E2E, animals FE, animals fit |
| req-196 Inset text under the heading reads 'You must add all animal ide... | E2E, animals FE, animals fit |
| req-197 Above the heading, the page shows the notification status strip... | E2E, animals fit |
| req-202 The page ends with the shared journey actions: 'Save and contin... | E2E, animals FE, animals fit |
| req-205 Pressing Enter in a field submits the page as 'Save and continu... | E2E, animals FE, animals fit |
| req-206 The page keeps the real service's mechanics: its address under ... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-209 In the live-animals set, the summary's quantity column is heade... | E2E, animals FE, animals fit |
| req-210 The summary lists every selected commodity, including one with ... | E2E, animals FE, animals fit |
| req-211 Each summary row has a 'Change' link (visually hidden suffix na... | E2E, animals FE, animals fit |
| req-212 Below the summary, an 'Add another commodity' link goes to the ... | E2E, animals FE, animals fit |
| req-214 Each species panel has a 'Change number of animals' link (visua... | E2E, animals FE, animals fit |
| req-216 Cattle (0102) are identified per animal by 'Ear tag' then 'Pass... | E2E, animals FE, animals fit, tests repo |
| req-217 Horses (0101) are identified per animal by 'Microchip', 'Passpo... | E2E, animals fit |
| req-218 Other live mammals on 01061900 (cats, dogs, ferrets) are identi... | E2E, animals FE, animals fit |
| req-221 A species whose commodity has no identifier (such as poultry or... | E2E, animals FE, animals fit |
| req-227 Text identifier fields are 20-character-wide text inputs; 'Hors... | animals FE, animals fit |
| req-228 Each live-animal identifier (microchip, passport, tattoo, ear t... | E2E, animals FE, animals fit |
| req-231 Each identifier error appears in an error summary titled 'There... | animals FE, animals fit |
| req-232 When a save fails validation, the page is shown again with the ... | E2E, animals FE |
| req-233 In the live-animals set, an animal counts as entered once at le... | E2E, animals FE, animals fit |
| req-235 The saved-animals table lists every saved animal, including one... | E2E, animals FE, animals fit |
| req-237 The saved-animals table has an 'Animal' column, one column per ... | E2E, animals FE, animals fit, tests repo |
| req-238 Each saved row has a 'Remove' button (visually hidden suffix 'a... | E2E, animals FE, animals fit |
| req-239 A saved animal cannot be changed in place: correcting one means... | animals fit |
| req-241 For live animals each panel takes one animal at a time under th... | E2E, animals FE, animals fit |
| req-242 A species with more than one animal has a panel button 'Save an... | E2E, animals FE, animals fit, tests repo |
| req-244 A panel save is a full page post that redirects back to the pag... | E2E, animals FE, animals fit, tests repo |
| req-245 A stale panel save for a species with every animal already ente... | animals FE, animals fit |
| req-246 If a species ever holds more saved animals than its number of a... | animals FE |
| req-247 Lowering a species' number of animals on Commodity details belo... | E2E, animals FE, animals fit |
| req-248 In the live-animals set, the hub's Identification details row s... | E2E, animals fit |
| req-249 In the live-animals set, to submit: identification details are ... | animals fit |
| req-268 The page has no serious or critical axe violations against WCAG... | animals FE, animals fit |
| req-269 The summary and saved-animals lists render as GOV.UK tables, an... | E2E, animals FE, animals fit |
| req-272 The arrival details page has the heading and page title 'Arriva... | E2E, animals FE, animals fit, tests repo |
| req-273 The arrival details page shows the caption 'Transport and arriv... | E2E, animals FE, animals fit |
| req-274 Arrival details and transit countries both show the notificatio... | E2E, animals fit |
| req-275 The arrival details page's Back link goes to the notification o... | E2E, animals FE, animals fit, tests repo |
| req-276 When a page in this area has errors, an error summary titled 'T... | E2E, animals FE, animals fit |
| req-277 The arrival details page asks five questions in this order: arr... | E2E, animals FE, tests repo |
| req-279 The arrival date question is labelled 'Arrival date at port of ... | E2E, animals FE, animals fit |
| req-280 The arrival date hint reads 'The expected date of arrival at th... | E2E, animals FE, animals fit |
| req-281 The arrival date is one text input enhanced by the MoJ date pic... | E2E, animals FE, animals fit, tests repo |
| req-282 The arrival date must fall between 7 days before today and 6 mo... | E2E, animals FE, animals fit, tests repo |
| req-283 The arrival date is typed as day/month/four-digit year, leading... | E2E, animals FE, animals fit, tests repo |
| req-284 An arrival date that is not a real date (such as 31/2/2026) is ... | animals FE, animals fit |
| req-285 A typed arrival date outside the window is refused with 'Arriva... | E2E, animals FE, animals fit, tests repo |
| req-286 A saved arrival date that has since fallen outside the window i... | animals FE |
| req-287 When arrival details has any error, nothing on the page is save... | E2E, animals FE, animals fit, tests repo |
| req-288 The open calendar sits in the flow of the page and pushes the p... | animals FE, animals fit |
| req-289 Without JavaScript the arrival date stays an editable text inpu... | animals FE, animals fit |
| req-292 The port of entry question is labelled 'Port of entry'. | E2E, animals FE, animals fit |
| req-297 The port of entry type-ahead lists every port when clicked, fil... | E2E, animals FE, animals fit |
| req-298 When nothing matches what is typed in the port search, it says ... | E2E, animals FE, animals fit |
| req-300 The port options come from the reference-data service's GET /po... | E2E, animals FE, animals fit, reference data |
| req-301 When MDM answers the ports call with no body or no result list,... | reference data |
| req-305 A submitted port not in the list is refused with 'Select a vali... | E2E, animals FE, animals fit |
| req-306 A saved port that is no longer offered is flagged when the page... | animals FE |
| req-307 Without JavaScript the port of entry is a native select linked ... | E2E, animals FE, animals fit |
| req-308 Means of transport is a select labelled 'Means of transport to ... | E2E, animals FE, animals fit, tests repo |
| req-313 Means of transport is stored as its reference code (AIRPLANE, R... | animals FE, animals fit, tests repo |
| req-314 A submitted means of transport that is not a reference code is ... | animals FE, animals fit |
| req-316 Arrival date, port of entry, transport identification and trans... | animals FE, animals fit, tests repo |
| req-317 The transport identification question is labelled 'Transport id... | E2E, animals FE, animals fit, tests repo |
| req-319 Below the lead-in, the transport identification hint is a bulle... | E2E, animals FE, animals fit |
| req-320 The transport document reference question is labelled 'Transpor... | E2E, animals FE, animals fit, tests repo |
| req-321 The transport document reference hint reads 'Enter the referenc... | E2E, animals FE, animals fit |
| req-322 Transport identification longer than 58 characters is refused w... | animals FE, animals fit |
| req-323 A transport document reference longer than 58 characters is ref... | animals FE, animals fit |
| req-324 Transport identification and transport document reference are t... | animals FE |
| req-325 Arrival details and transit countries each end with 'Save and c... | E2E, animals FE, animals fit |
| req-326 Reached in the journey's page order, Save and continue on arriv... | E2E, animals FE, animals fit, tests repo |
| req-330 Saved arrival answers are shown again when the user returns: th... | E2E, animals FE, animals fit, tests repo |
| req-331 The overview's 'Arrival details' task shows Complete only when ... | E2E, animals FE, animals fit, tests repo |
| req-333 When a save fails, arrival details and transit countries re-ren... | animals FE |
| req-334 Each form on both pages posts back without browser validation a... | E2E, animals fit |
| req-335 Arrival details (with the calendar open) and transit countries ... | animals FE, animals fit |
| req-336 The type-aheads on both pages are built from accessible-autocom... | E2E, animals fit |
| req-337 The transit countries page is served at the journey slug 'trans... | E2E, animals FE, animals fit, tests repo |
| req-339 The transit countries page heading is 'Which countries will the... | E2E, animals FE, animals fit, tests repo |
| req-340 The transit countries page shows the caption 'Movement' above i... | E2E, animals FE, animals fit |
| req-341 Below the heading the page says 'Countries the consignment will... | E2E, animals FE, animals fit |
| req-342 A second paragraph says 'This does not include the United Kingd... | E2E, animals FE, animals fit |
| req-345 The transit countries page opens straight on a country search, ... | E2E, animals FE, animals fit |
| req-346 The transit country search shows the placeholder 'Search for a ... | animals FE, animals fit |
| req-347 The transit country type-ahead filters on what is typed from a ... | E2E, animals FE, animals fit |
| req-350 Without JavaScript, the transit country search is a native sele... | E2E, animals FE, animals fit |
| req-351 Each transit country's Remove control reads 'Remove' with the c... | E2E, animals FE, animals fit |
| req-352 When arrival details or transit countries shows a validation er... | E2E, animals fit |
| req-355 Both searches report to screen readers through a visually hidde... | animals FE, animals fit |
| req-357 Added transit countries are listed under a 'Country' column hea... | E2E, animals FE, animals fit, tests repo |
| req-358 Transit countries are optional: Save and continue with none add... | E2E, animals FE, animals fit, tests repo |
| req-359 Saved transit countries are listed again when the user returns ... | E2E, animals FE, animals fit, tests repo |
| req-360 Transit countries are stored as a list of country codes. | animals FE, animals fit |
| req-361 Saving arrival details with a means of transport other than Rai... | E2E |
| req-362 Pressing 'Add country' with nothing chosen is refused with 'Ent... | E2E, animals FE, animals fit, tests repo |
| req-363 Adding a country already in the list is refused with 'You have ... | E2E, animals FE, animals fit |
| req-364 A country not on the offered list, added or saved, is refused w... | animals FE, animals fit |
| req-365 A saved transit list holding a country no longer offered is fla... | animals FE |
| req-366 At most 12 transit countries can be added: when the twelfth is ... | animals FE, animals fit |
| req-367 Saving more than 12 transit countries is refused with 'Select u... | animals FE, animals fit |
| req-368 The 12-country cap is not stated before the user reaches it. | animals FE, animals fit |
| req-371 The overview shows a 'Transit countries' task between 'Arrival ... | E2E |
| req-373 No rule stops the country of origin being added as a transit co... | animals fit |
| req-374 The notification review shows the arrival date under the label ... | DR1 backlog and DR2.1 source only |
| req-379 The transporter list page has the caption 'Transport and arriva... | E2E, animals FE, animals fit, tests repo |
| req-380 Under the heading, the transporter list says 'This is the perso... | E2E, animals FE, animals fit |
| req-381 The transporter list states 'Your transporter must hold a valid... | E2E, animals FE, animals fit |
| req-382 The transporter list links to the economic-activity section of ... | E2E, animals FE, animals fit |
| req-384 The transporter list states 'Documents issued by DAERA are vali... | E2E, animals FE, animals fit |
| req-385 The transporter list and the 'Add a commercial transporter' pag... | animals fit |
| req-388 The transporter search box is labelled 'Search' with the hint '... | E2E, animals FE, animals fit |
| req-391 Transporter search ignores letter case and accents and trims th... | E2E, animals FE, animals fit |
| req-393 Transporters are listed in a table inside the 'Select a transpo... | E2E, animals FE, animals fit, tests repo |
| req-395 Each row's Status is a tag: 'Approved' in green and 'New' in ma... | E2E, animals FE, animals fit |
| req-400 A row's Address cell is the address parts joined with commas, b... | E2E, animals FE, animals fit |
| req-401 Transporters the organisation has added are listed first, newes... | animals FE, animals fit |
| req-402 Saving the transporter list with no transporter chosen shows no... | E2E, animals FE, animals fit, tests repo |
| req-403 A submitted transporter that is not on the organisation's list ... | animals FE, animals fit |
| req-404 Choosing a transporter saves it on the notification with its ty... | E2E, animals FE, animals fit, tests repo |
| req-406 The transporter list ends with 'Save and continue', a secondary... | E2E, animals FE, animals fit, tests repo |
| req-409 The transporter list's Back link goes to the notification overv... | E2E, animals FE, animals fit |
| req-411 The overview's 'Transport details' task links to the transporte... | E2E, animals FE, animals fit |
| req-412 The transporter list is the journey's one transporter step, rea... | E2E, animals FE, animals fit |
| req-415 The 'Choose a transporter type' page has the caption 'Add a new... | E2E, animals FE, animals fit, tests repo |
| req-418 The type page offers 'Private transporter' (no hint) then 'Comm... | E2E, animals FE, animals fit, tests repo |
| req-423 The type page's Back link returns to the transporter list; ever... | E2E, animals FE, animals fit |
| req-424 The type page remembers the type chosen and checks it on return... | E2E, animals FE, animals fit, tests repo |
| req-426 Changing the transporter type removes the saved transporter of ... | E2E, animals FE |
| req-430 The private transporter form asks, in order, 'Name or organisat... | E2E, animals FE, animals fit, tests repo |
| req-433 On the private transporter form, a missing country shows 'Selec... | E2E, animals FE, animals fit |
| req-435 On the private transporter form, a blank required field shows i... | E2E, animals FE, animals fit |
| req-436 On the private transporter form, over-long values are refused: ... | animals FE, animals fit |
| req-437 On both add forms, an invalid save re-renders the page with eve... | E2E, animals FE, animals fit |
| req-439 Both add forms trim surrounding spaces from every value before ... | E2E, animals FE, animals fit |
| req-445 The commercial banner repeats the list's authorisation guidance... | animals fit |
| req-446 The commercial transporter form asks, in order, 'Transporter au... | E2E, animals FE, animals fit |
| req-452 On the commercial transporter form, a blank name, address line ... | animals FE, animals fit |
| req-453 On the commercial transporter form, over-long values are refuse... | animals FE, animals fit |
| req-454 A commercial transporter's country is fixed to Northern Ireland... | E2E, animals FE, animals fit, tests repo |
| req-455 A commercial transporter posted with a country other than North... | animals FE |
| req-459 A saved transporter is recorded as type Private or Commercial w... | animals FE, animals fit |
| req-460 Both add forms' Back links go to 'Choose a transporter type', a... | E2E, animals FE, animals fit |
| req-464 Transporters a trader adds belong to the organisation, not the ... | E2E, animals FE, animals fit |
| req-466 If saving on a transporter page fails in a recoverable way, the... | animals FE |
| req-467 Every transporter form posts a CSRF crumb and a concurrency tok... | E2E, animals fit |
| req-468 The transporter pages are built from GOV.UK Frontend components... | E2E, animals fit |
| req-473 The notification review shows the chosen transporter as Name, A... | E2E |
| req-474 A trader can submit a notification whose transporter was added ... | E2E |
| req-476 The transporter pages show the Alpha phase banner and the servi... | animals fit |
| req-478 The page title is 'Upload documents - Import notification servi... | E2E, animals FE, animals fit, tests repo |
| req-479 Above the caption the page shows the notification's status as a... | E2E, animals fit |
| req-480 Opened from the overview or the journey, the page's 'Back' link... | E2E, animals FE, animals fit |
| req-483 The page opens with: 'You must attach an ITAHC if this consignm... | E2E, animals FE, animals fit |
| req-484 The guidance continues 'Other documents you may need to attach ... | E2E, animals FE, animals fit |
| req-485 The guidance sits above the 'File upload' card, so the trader r... | animals FE, animals fit |
| req-486 A details component titled 'Check which additional documents yo... | E2E, animals FE, animals fit |
| req-487 The additional-documents row 'Livestock transiting bluetongue r... | animals FE, animals fit |
| req-490 Inside the details component a link 'Check the documents you ne... | E2E, animals FE, animals fit |
| req-491 The GOV.UK guidance link's text is the whole phrase 'Check the ... | animals FE, animals fit |
| req-492 The add-a-document fields, the 'Save and add another' button an... | E2E, animals FE, animals fit |
| req-493 The first field is a text input labelled 'Document reference'. | animals fit, tests repo |
| req-495 A blank document reference, after surrounding spaces are trimme... | animals BE, animals FE, animals fit |
| req-496 A document reference longer than 58 characters shows 'Document ... | animals BE, animals FE, animals fit |
| req-498 The second field is a select labelled 'Document type' with no h... | E2E, animals FE, animals fit, tests repo |
| req-500 The document type is submitted, stored and published by its cod... | E2E, animals BE, tests repo |
| req-501 Choosing 'Other' as the document type asks for no further descr... | animals BE |
| req-502 No document type, or a type the page did not offer, shows 'Sele... | animals FE, animals fit |
| req-503 The fields come in the order Document reference, Document type,... | animals FE, animals fit |
| req-504 The third field is a single text input labelled 'Date of issue'... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-506 A blank date of issue shows 'Enter a date of issue'; a date tha... | animals BE, animals FE, animals fit |
| req-507 The fourth field is labelled 'Attachment', and its hint opens '... | animals FE, animals fit |
| req-511 The hint's third bullet reads 'up to a maximum of 15 files', an... | animals FE, animals fit |
| req-512 The hint's fourth bullet reads 'ZIP files are not allowed for s... | animals FE, animals fit |
| req-513 The service enforces the file rules it states: the file picker ... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-514 No chosen file shows 'Upload a document' in the summary and on ... | animals FE, animals fit |
| req-515 The attachment is a drop zone that says 'No file chosen' in a p... | E2E, animals FE, animals fit, tests repo |
| req-516 Without JavaScript the Attachment field is a plain visible file... | E2E, animals FE, animals fit, tests repo |
| req-517 A file error is drawn on the drop zone itself (error border and... | E2E, animals FE, animals fit |
| req-518 On the Attachment field the error message sits after the 'Your ... | animals FE, animals fit |
| req-519 A secondary 'Save and add another' button inside the File uploa... | E2E, animals FE, animals fit, tests repo |
| req-520 Save and add another with nothing entered shows an error summar... | E2E, animals FE, animals fit, tests repo |
| req-521 The error summary appears at the top of the main content, above... | animals fit |
| req-522 When the upload documents page shows an error the browser title... | E2E, animals fit |
| req-523 After a validation error the document reference, type and date ... | animals fit |
| req-524 After a server-side validation error the chosen file is not kep... | animals fit |
| req-525 When a request body over the size cap reaches the server (no br... | E2E, animals FE, animals fit |
| req-526 A notification holds at most 15 documents. Adding a sixteenth s... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-529 Once a document is added, a table inside the File upload card, ... | E2E, animals FE, animals fit, tests repo |
| req-531 A document's Status shows a blue 'Scanning for virus' tag while... | E2E, animals FE, animals fit, tests repo |
| req-532 Every file is really virus scanned. A file the scan rejects sho... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-533 While a document is scanning, the page updates its status witho... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-534 A document that scanned clean has a 'View file' link (hidden te... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-535 Each row has a 'Remove' button styled as a link, usable while t... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-536 Each Remove button (and View file link) carries visually hidden... | E2E, animals FE |
| req-537 Uploading documents is optional: with no document type chosen, ... | animals FE, animals fit, perf tests, tests repo |
| req-541 The page ends with a primary 'Save and continue' button, a seco... | E2E, animals fit |
| req-545 The overview has a section '4. Documents' with one task, 'Uploa... | E2E, animals fit |
| req-546 Each document is saved to the notification as soon as it is add... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-547 The file goes from the browser to the frontend, which sends it ... | E2E, animals BE, animals FE, animals fit, perf tests, tests repo |
| req-548 Documents can be added and removed whatever the notification's ... | animals BE |
| req-549 The documents page stays safe and recoverable: text the trader ... | animals FE |
| req-550 Nothing on the documents page checks that an ITAHC has been att... | animals FE |
| req-551 The documents page has no serious or critical axe violations (W... | animals FE, animals fit, tests repo |
| req-556 The roles and addresses page has the page title 'Consignment ad... | animals FE, animals fit, tests repo |
| req-559 The roles and addresses page and every party picker show the st... | E2E, animals fit |
| req-560 The roles and addresses page's Back link goes to the notificati... | animals FE, animals fit |
| req-561 The roles and addresses page keeps showing each section as a GO... | E2E, animals FE, animals fit, tests repo |
| req-562 The roles and addresses page lists its sections in this order: ... | animals FE, animals fit |
| req-563 Each party section's hint reads: Place of origin 'The address w... | animals FE, animals fit |
| req-572 Once a party has an address, its add link is replaced by a 'Cha... | E2E, animals FE, animals fit, tests repo |
| req-573 Where the CPH section shows, it is headed 'County parish holdin... | E2E, animals FE, animals fit |
| req-574 On the live-animals set's roles and addresses page, the CPH num... | animals FE, animals fit |
| req-581 Pressing 'Save and continue' on the roles and addresses page ne... | animals FE, animals fit |
| req-583 The roles and addresses page ends with a 'Save and continue' bu... | E2E, animals FE, animals fit |
| req-585 The overview's '5. Consignment parties' section holds the task ... | E2E, animals FE, animals fit |
| req-586 Each party picker has the page title '<party> - Import notifica... | E2E, animals FE, animals fit, tests repo |
| req-587 Each party picker's Back link goes to the roles and addresses p... | E2E, animals FE, animals fit, tests repo |
| req-589 The consignor, consignee, importer and place of destination pic... | E2E, animals FE, animals fit, plants FE |
| req-593 Submitting the picker's search, or opening it with a search in ... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-599 The picker lists addresses in a table with a radio column (head... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-602 Reopening a picker for a party that already has an address pick... | E2E, animals FE, animals fit, plants FE |
| req-604 Saving a picker with an address that is not in the organisation... | animals FE, animals fit, plants FE |
| req-605 Outside an amendment, each of the five party pickers (place of ... | E2E, animals FE, animals fit |
| req-606 Choosing an address on a picker and pressing 'Save and continue... | E2E, animals FE, animals fit, tests repo |
| req-607 If saving a picked address fails with a recoverable backend err... | animals FE, plants FE |
| req-614 Each party picker lists its addresses newest first, so an addre... | E2E, tests repo |
| req-615 When a search matches no address, the picker shows 'No addresse... | E2E, animals FE, animals fit, plants FE |
| req-616 Every address-book read from the animals frontend is made on th... | E2E, animals FE, animals fit, plants FE |
| req-617 A deleted address-book record is never offered on a picker; fet... | animals FE, plants FE |
| req-618 The animals frontend reads the address book and never writes to... | E2E, animals FE, plants FE, tests repo |
| req-620 The roles and addresses page, every animals party picker and th... | E2E, animals FE, animals fit, plants FE |
| req-630 Every party picker (place of origin, consignor, consignee, impo... | E2E, animals FE |
| req-631 The journey's address-return route accepts a return only when i... | E2E, animals FE |
| req-632 When a return cannot be completed, the trader goes back to the ... | animals FE |
| req-633 A trader with no INS session who follows 'Add a new address' si... | E2E |
| req-641 The add-address page keeps the labels 'Address line 1', 'Addres... | E2E |
| req-645 Under 'Contact details' the add-address page asks for 'Email ad... | E2E |
| req-661 On the add-address page a blank address line 1 shows 'Enter add... | animals FE |
| req-662 On the add-address page a blank town or city shows 'Enter a tow... | animals FE |
| req-665 On the add-address page email address is required, and a blank ... | animals FE |
| req-667 A failed submit of the add-address page shows an error summary ... | E2E, tests repo |
| req-668 The add-address page keeps the address book's length and format... | E2E, animals FE, tests repo |
| req-669 A refused add-address submit answers HTTP 400 and prefixes the ... | E2E, animals FE, animals fit |
| req-676 An address added from the journey is saved into the signed-in o... | E2E |
| req-677 The add-address page is built from GOV.UK Frontend components (... | E2E |
| req-679 A picked or added address is copied onto the notification, not ... | E2E, tests repo |
| req-681 Each role and the consignment contact has its own page for edit... | E2E, animals FE, animals fit, tests repo |
| req-682 The edit page is headed 'Edit address details', captioned with ... | E2E, animals FE, animals fit, tests repo |
| req-683 The edit page explains 'Changes apply to this notification only... | E2E, animals FE, animals fit, tests repo |
| req-684 The edit page asks for 'Name or organisation name', 'Address li... | E2E, animals FE, animals fit, tests repo |
| req-685 The edit page's buttons are 'Save changes' and a secondary 'Can... | E2E, animals FE, tests repo |
| req-686 The edit page opens pre-filled with every field of the notifica... | E2E, animals FE, animals fit, tests repo |
| req-687 The edit page applies the address book's rules and messages: 'E... | E2E, animals FE, animals fit, tests repo |
| req-688 A refused edit answers 400, re-renders 'Edit address details' w... | E2E, animals FE, animals fit, tests repo |
| req-689 A valid edit replaces only this notification's copy of the role... | E2E, animals FE, animals fit, tests repo |
| req-690 Save, Cancel and Back on the edit page return to where the edit... | E2E, animals FE, animals fit, tests repo |
| req-691 If saving an edit fails with a recoverable backend error, the e... | animals FE |
| req-692 The edit page has Welsh copy ('Golygu manylion cyfeiriad', 'Cad... | animals FE |
| req-693 The edit page is built only from GOV.UK Frontend components and... | animals FE, animals fit |
| req-694 A copy is checked against the notification's address rules: the... | E2E, animals FE, tests repo |
| req-695 The review keeps today's validation errors that Design Release ... | E2E, tests repo |
| req-696 While a copy breaks the rules, Continue on the review page is r... | E2E, tests repo |
| req-697 Correcting the copy on its edit page and saving returns to the ... | E2E, tests repo |
| req-698 Once a notification is submitted its copied addresses are froze... | E2E, tests repo |
| req-702 A valid CPH number is stored as nine bare digits, the three par... | animals FE, animals fit |
| req-703 The CPH page has the caption 'Consignment parties', the single ... | E2E, animals FE, animals fit, tests repo |
| req-704 The CPH, permanent address and contact address pages show the n... | E2E, animals fit |
| req-705 A collapsed 'What is a CPH number?' details component sits abov... | E2E, animals FE, animals fit |
| req-707 The CPH number is asked as one fieldset with the small legend '... | E2E, animals FE, animals fit |
| req-709 The CPH number is entered in three boxes in one row, laid out w... | E2E, animals FE, animals fit, tests repo |
| req-715 A partly filled or wrongly formed CPH number is refused with on... | E2E, animals FE, animals fit, tests repo |
| req-716 CPH errors re-render the page with status 400 and every typed v... | animals FE, animals fit |
| req-717 A stored CPH number that is not nine digits is flagged on the p... | animals FE |
| req-718 The CPH page opens with three empty boxes when nothing is saved... | E2E, animals FE, animals fit, tests repo |
| req-721 The CPH page ends with the primary 'Save and continue' button a... | E2E, animals FE, animals fit |
| req-723 The CPH and contact address forms, and the plants consignment c... | E2E, animals FE, animals fit, plants FE |
| req-724 The CPH, permanent address and contact address pages, and the p... | E2E, animals FE, animals fit, plants FE |
| req-730 The permanent address shows the GOV.UK warning 'Providing a fal... | E2E |
| req-731 The permanent address explains 'A permanent address is where an... | E2E |
| req-738 A new permanent address asks for 'Name or organisation name', '... | E2E |
| req-752 The contact address page, in the animals sets and in plants, ha... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-758 Coming back from the address book add with a not-found error, t... | animals FE |
| req-759 When the animals frontend runs in stub mode, the contact page o... | E2E, animals FE, animals fit, tests repo |
| req-762 The contact addresses are one list of radios whose value is the... | E2E, animals fit, tests repo |
| req-763 No contact address is chosen when the page first opens; on retu... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-765 Submitting a contact id that is not in the list shows 'Select a... | animals FE, animals fit |
| req-768 Opened from its overview task ('Contact address for this consig... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-769 Outside amend, the contact page, in the animals sets and in pla... | E2E, animals FE, animals fit, plants FE |
| req-771 The contact address task is reached from the hub row 'Contact a... | E2E, animals FE, animals fit |
| req-773 Choosing a contact, in the animals sets and in plants, saves a ... | E2E, animals FE, animals fit, plants FE |
| req-775 The contact edit route (/consignment/contact/edit) and its edit... | E2E, animals FE, animals fit, tests repo |
| req-777 The notification hub's browser title is 'Overview - Import noti... | E2E, animals FE, animals fit |
| req-778 Each live-animals notification has its own hub page in the live... | E2E, animals FE, animals fit |
| req-779 Above the 'Overview' heading the hub shows the notification's s... | animals FE, animals fit |
| req-781 Opening the hub leaves the notification saved as a draft: nothi... | E2E |
| req-783 The hub has no back link; the ways off it are the 'Return to da... | E2E, animals FE, animals fit |
| req-784 The hub shows a 'Your commodities' heading (h2) above the commo... | E2E, animals FE, animals fit |
| req-785 For a live-animals notification the first card shows the total ... | E2E, animals FE, animals fit |
| req-786 The hub shows a card for the total number of packages, labelled... | animals FE, animals fit |
| req-787 The animals and packages totals add up only counts that are pos... | E2E, animals FE, animals fit |
| req-790 Each commodity total card is a static panel (no link or button)... | E2E, animals FE, animals fit |
| req-792 For a notification, the task list is headed 'Notification taskl... | E2E, animals FE, animals fit |
| req-793 For a notification, the task list has exactly six numbered sect... | E2E, animals FE, animals fit |
| req-795 Section 1 holds, in order, 'Where is this consignment coming fr... | E2E, animals FE, animals fit |
| req-796 'Commodity details' is its own row, first in section 2, shown f... | E2E, animals FE, animals fit |
| req-797 'Identification details' shows in section 2, between 'Commodity... | E2E, animals FE, animals fit |
| req-798 In the live-animals set, section 2 always shows 'Additional det... | E2E, animals FE, animals fit |
| req-799 Section 3 always shows 'Arrival details', which opens even befo... | E2E, animals FE, animals fit |
| req-801 For a notification, section '4. Documents' holds the single row... | E2E, animals FE, animals fit |
| req-802 In the live-animals set, section 'Consignment parties' holds th... | E2E, animals FE, animals fit |
| req-803 Section 'Contact address' holds the single row 'Contact address... | E2E, animals FE, animals fit |
| req-804 Each hub row shows one of two status tags only: a green 'Comple... | E2E, animals FE, animals fit |
| req-805 Every row the hub shows is a link the trader can open at any ti... | animals FE, animals fit |
| req-806 The hub's task list is built from the GOV.UK Task list componen... | E2E, animals fit |
| req-807 A new notification goes from choosing the notification type to ... | animals FE, animals fit |
| req-809 A task page opened from the hub has a 'Back' link to the hub an... | E2E, animals FE, animals fit |
| req-810 For a notification, the hub ends with a primary 'Review and sub... | E2E, animals FE, animals fit |
| req-811 For a notification, the hub's secondary button is 'Return to da... | E2E, animals FE, animals fit |
| req-812 The hub shows only its main and secondary buttons: there is no ... | animals FE |
| req-813 The hub has no serious or critical WCAG 2 A/AA accessibility vi... | animals FE, animals fit |
| req-820 The review page reached from the notification hub has the headi... | E2E, animals FE, animals fit |
| req-824 The review's other numbered sections stay as they are, in order... | E2E, animals FE, animals fit, tests repo |
| req-829 The Origin of import card reads back the country of origin by n... | E2E, animals FE, animals fit |
| req-834 For an Internal market import, the Main import reason card adds... | E2E, animals FE, animals fit |
| req-836 The Main import reason card shows 'Destination country' for tra... | animals FE, animals fit |
| req-837 On an editable review each card's Change link opens the page th... | E2E, animals FE, animals fit |
| req-838 Each Change link names its card for screen readers in visually ... | E2E, animals FE, animals fit, tests repo |
| req-847 A species with no saved identifiers shows no identification det... | animals FE |
| req-851 In the live-animals set, the Additional details card shows 'Cer... | E2E, animals FE, animals fit |
| req-853 The Arrival details card shows 'Port of entry', the arrival dat... | E2E, animals FE, animals fit |
| req-857 The Transport details card shows the transporter's address one ... | animals FE, animals fit |
| req-861 A document's type reads back by its full name, for example 'Int... | animals FE |
| req-863 The Addresses card has one row per consignment role (Place of o... | E2E, animals FE, animals fit |
| req-869 On a finished card or a read-only review, an empty answer reads... | animals FE, animals fit |
| req-870 Inside a card that still has answers outstanding, every empty r... | E2E, animals FE, animals fit |
| req-871 An unfinished card is styled as an error card and shows its mes... | E2E, animals FE, animals fit |
| req-872 An editable review of an unfinished notification shows a 'There... | E2E, animals FE, animals fit, tests repo |
| req-876 The unfinished-card messages 'Complete arrival details', 'Compl... | E2E, animals FE, animals fit, tests repo |
| req-881 Uploaded documents are optional to proceed and to submit: the t... | E2E, animals FE, animals fit |
| req-882 In the live-animals set, a notification is complete enough to s... | animals FE |
| req-883 The trader reaches the review from the hub's 'Review and submit... | E2E, animals FE, animals fit, tests repo |
| req-885 The review keeps today's document scan errors: a rejected docum... | animals FE |
| req-887 The review's error summary takes focus only after a refused Con... | E2E, animals FE, animals fit |
| req-901 A submitted notification's view is read-only and shows that not... | E2E, animals FE, animals fit, tests repo |
| req-912 The declaration page is titled and headed 'Declaration' and set... | E2E, animals FE, animals fit, tests repo |
| req-915 The declaration checkbox label reads 'I confirm that I have rev... | E2E, animals FE, animals fit, tests repo |
| req-916 The declaration page shows 'Date of declaration:' with today's ... | E2E, animals FE, animals fit, tests repo |
| req-918 The declaration page's Back link goes to the review. | E2E, animals FE, animals fit |
| req-919 Continuing without ticking the declaration re-shows the page wi... | E2E, animals FE, animals fit, tests repo |
| req-920 The declaration checkbox is shown ticked when the notification ... | E2E, animals FE |
| req-921 Ticking the declaration and pressing Continue submits the notif... | E2E, animals FE, animals fit, tests repo |
| req-922 The declaration page can be opened without a completeness check... | E2E, animals FE, animals fit |
| req-923 Opening or submitting the declaration for a notification alread... | animals FE, animals fit |
| req-924 The review and declaration forms post a CSRF crumb and the noti... | E2E, animals FE, animals fit |
| req-925 The review (new, refused and submitted), declaration and confir... | animals FE, animals fit |
| req-926 The confirmation page is titled 'Import notification submitted'... | E2E, animals FE, animals fit |
| req-930 The confirmation page shows a 'Before the consignment is import... | animals FE, animals fit |
| req-932 The confirmation page's 'Transporting the consignment' section ... | E2E, animals FE, animals fit |
| req-934 The confirmation page's 'Return to your dashboard' link goes to... | animals FE, animals fit |
| req-935 The confirmation page's 'Create a new notification' looks and r... | E2E, animals FE, animals fit |
| req-936 The confirmation page's 'Getting help' section gives importsris... | E2E, animals FE, animals fit |
| req-938 The confirmation page does not repeat the date of declaration, ... | E2E, animals FE, animals fit |
| req-945 The review, declaration and confirmation stay built from GOV.UK... | E2E, animals fit |
| req-956 Every page of every frontend (animals, INS and plants), the hom... | INS fit |
| req-957 The home has no back link. | INS fit |
| req-958 The home carries no service-description paragraph under its hea... | INS fit |
| req-961 'Create new' is a standard primary GOV.UK button link, not a st... | E2E |
| req-966 The service navigation's first item is 'Dashboard', linking to ... | INS FE, INS fit |
| req-968 The service navigation has an 'Address book' item linking to th... | INS fit |
| req-969 The service navigation keeps 'Log out' as its last item, after ... | E2E, INS fit |
| req-970 The service navigation has a 'Manage account' item. | INS fit |
| req-1020 Signing in to the INS front door lands the trader on the home, ... | INS FE, INS fit |
| req-1021 The INS aggregated read model holds one document per notificati... | E2E, INS FE, tests repo |
| req-1026 The home and drill-downs keep the standard GOV.UK header (logo ... | INS fit |
| req-1027 Following a link from the home into the animals or plants front... | E2E, tests repo |
| req-1032 The live animals notification list stays where it is, at the li... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-1047 After a search the field keeps the searched text, and searching... | E2E, animals FE, animals fit, tests repo |
| req-1084 A live animals card keeps its status-driven actions, each named... | E2E, animals FE, animals fit, tests repo |
| req-1088 The notification list's success banner, the deletion message in... | animals FE, plants FE |
| req-1089 The live animals list keeps its stale-action banner ('The notif... | E2E, animals FE |
| req-1091 The live animals list has no serious or critical WCAG 2 A or AA... | animals FE, animals fit, plants FE |
| req-1094 Deleted notifications never appear on any list or in a search. | animals BE, animals FE, plants FE |
| req-1095 A newly started notification appears on the list straight away. | E2E, tests repo |
| req-1108 The address book lives in the INS frontend at /address-book, re... | E2E, INS FE, INS fit, tests repo |
| req-1109 A signed-out user opening any address book page is sent to sign... | E2E, INS FE, tests repo |
| req-1111 The list page's heading is 'Address book'. | E2E, INS FE, INS fit, tests repo |
| req-1113 The list page has an 'Add a new address' button (a link styled ... | E2E, INS FE, INS fit |
| req-1120 The address book API keeps its countryCode filter as it is: an ... | address book |
| req-1131 Above the table a results line reads 'Showing <start>-<end> of ... | E2E, INS FE, INS fit |
| req-1138 The Country column shows the country's name, not its code. | E2E, INS FE, INS fit |
| req-1140 Each row ends with a 'View' link to /address-book/{id}; its acc... | E2E, INS FE, INS fit, perf tests |
| req-1142 When there is more than one page, GOV.UK pagination shows a num... | E2E, INS FE, INS fit |
| req-1145 The list shows the newest address first, with a stable order fr... | E2E, INS fit, address book |
| req-1146 After an add, edit or delete the list shows a GOV.UK success no... | E2E, INS FE |
| req-1149 The address book is stored by the address book service and belo... | E2E, INS fit, address book, tests repo |
| req-1151 No caller can list, read or delete another organisation's addre... | E2E, address book, tests repo |
| req-1152 Every address book API call must carry a well-formed Trade-Impo... | address book |
| req-1153 The INS frontend calls the address book server-side under /orga... | E2E, INS FE, INS fit, tests repo |
| req-1155 The address book service logs each request with the caller's or... | address book |
| req-1156 The list API (GET /organisation/{orgId}/addresses) returns a ca... | INS FE, address book, tests repo |
| req-1157 Reading one address by id returns it with every stored field, i... | E2E, INS FE, address book, tests repo |
| req-1158 Deleting an address removes it from the list and search for eve... | E2E, INS FE, address book, tests repo |
| req-1159 The address view page is at /address-book/{id}, headed with the... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1160 The view page's summary list always shows, in this order, 'Name... | INS FE, INS fit |
| req-1163 The view page does not show the address's types or uses, and it... | INS FE, INS fit |
| req-1165 The view page has a red warning 'Delete' button to /address-boo... | INS FE, INS fit |
| req-1166 With no return path, the view page's Back link goes to the addr... | INS FE, INS fit |
| req-1171 When the address book service fails unexpectedly, the list rend... | INS FE, INS fit |
| req-1172 The list renders in the wide display column; the view and delet... | INS FE, INS fit |
| req-1173 The list, view and delete pages have no serious or critical axe... | INS FE, INS fit |
| req-1174 The delete confirmation is served by GET and POST at /address-b... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1181 With no return path, the delete page's Back link goes to the ad... | E2E, INS FE, INS fit |
| req-1182 Confirming the delete deletes the address through the address b... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1183 The delete form is protected by a CSRF token and posts nothing ... | INS FE, INS fit |
| req-1184 Deleting an address makes no check on whether a notification us... | INS FE, INS fit |
| req-1192 Adding and editing an address happen in the INS front door (tra... | INS FE, INS fit, address book |
| req-1224 On the edit page the name field is labelled 'Name or organisati... | INS fit |
| req-1226 The edit page keeps the 'County (optional)' field between 'Town... | E2E, INS FE, INS fit, tests repo |
| req-1227 The add and edit forms ask 'Address line 1', 'Address line 2 (o... | E2E, INS FE, INS fit, tests repo |
| req-1235 The countries offered come from the reference data service's un... | E2E, INS FE, INS fit, address book |
| req-1237 Saving without address line 1 shows 'Enter address line 1'. | INS FE, INS fit, address book |
| req-1238 Saving without a town or city shows 'Enter a town or city'. | INS FE, INS fit, address book |
| req-1241 Saving without an email address shows 'Enter an email address'. | INS FE, INS fit, address book |
| req-1243 Address line 2 and county are optional: blank values are accept... | E2E, INS FE, address book, perf tests |
| req-1244 Add and edit keep today's length limits and email format check,... | INS FE, INS fit, address book |
| req-1245 On a validation error the add or edit page is shown again (HTTP... | E2E, INS FE, INS fit, tests repo |
| req-1246 When the add or edit page shows errors, its browser title keeps... | INS fit |
| req-1247 Every add and edit field is trimmed of surrounding spaces befor... | INS FE |
| req-1257 The add-details step's primary button is 'Save and continue'. | E2E, INS FE, INS fit, tests repo |
| req-1263 Creating an address persists its full record in the address-boo... | E2E, INS fit, address book, tests repo |
| req-1264 Saving an edit fully replaces the address's editable fields thr... | E2E, INS fit, address book, tests repo |
| req-1265 An update is refused without change when the body is invalid (4... | address book |
| req-1266 The address-book API answers errors as RFC 9457 problems (appli... | address book |
| req-1267 When the address-book service rejects a save the form is shown ... | INS FE, INS fit |
| req-1268 Outside prod, a new address can be given an expiry (ADDRESS_TTL... | address book |
| req-1269 The address-book service keeps its API surface and storage as b... | address book |
| req-1271 The edit page at /address-book/{id}/edit opens with the address... | E2E, INS FE, INS fit, tests repo |
| req-1273 The edit page's buttons are 'Save changes' and a secondary 'Can... | E2E, INS FE, INS fit |
| req-1276 A valid edit returns the user to the address book list (its def... | E2E, INS FE, INS fit, tests repo |
| req-1280 Every add and edit page highlights 'Address book' in the servic... | INS fit |
| req-1281 The add and edit pages, and their error states, use only GOV.UK... | INS FE, INS fit |
| req-1282 The add and edit forms post to themselves with browser validati... | E2E, INS FE, INS fit |
| req-1395 Amending moves a SUBMITTED notification to AMEND, keeps its ref... | E2E, animals BE, tests repo |
| req-1396 Answers changed during an amendment are saved to the notificati... | animals BE, animals fit, tests repo |
| req-1401 The amend review has no page-header actions (no Amend this noti... | E2E |
| req-1402 The amend review is editable, with a Change link on every card ... | E2E, animals fit, tests repo |
| req-1405 During an amendment, question pages are prefilled with the noti... | E2E, tests repo |
| req-1407 Continue on a valid amend review goes to the Declaration page; ... | E2E, tests repo |
| req-1409 Resubmitting an amendment shows the ordinary 'Import notificati... | E2E, animals BE, tests repo |
| req-1412 The cancel-amendment confirm button reads 'Yes, cancel amendmen... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-1415 Confirming the cancellation discards every edit made during the... | E2E, animals BE, animals FE, animals fit, plants FE, tests repo |
| req-1418 When copy as new, cancel amendment or delete fails to save, the... | animals FE, animals fit, plants FE |
| req-1421 In the animals sets (live animals and germinal products), Copy ... | E2E, animals FE, animals fit |
| req-1422 A copy is a new notification saved at once as a Draft, with its... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-1423 A copy carries over the origin of the import: country of origin... | E2E, animals BE, animals FE, animals fit |
| req-1431 A copy carries over the roles and addresses (place of origin, c... | E2E, animals BE |
| req-1436 A copy does not carry over uploaded documents: the copy's Uploa... | E2E |
| req-1438 Copy as new for a notification the trader cannot reach (unknown... | animals BE, animals FE |
| req-1452 The delete confirmation page is titled 'Delete this notificatio... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-1453 Confirming the delete (a POST with the CSRF crumb) soft-deletes... | E2E, animals BE, animals FE, animals fit, plants FE, tests repo |
| req-1454 After 'Yes, delete' the trader lands on the set's own notificat... | E2E, animals FE, animals fit, plants FE, tests repo |
| req-1459 A deleted notification no longer appears in the notification li... | E2E, animals fit, plants FE, tests repo |
| req-1460 Opening or posting delete for a notification the trader cannot ... | animals FE, plants FE |
| req-1468 The view page shows the notification's answers in the same six ... | animals fit |
| req-1476 The backend notification API supports the lifecycle: create giv... | E2E, animals BE, animals fit, tests repo |
| req-1477 A notification is saved as a draft as the trader goes: one reco... | E2E, tests repo |
| req-1478 The delete and cancel-amendment confirmations, the restored sub... | animals FE, animals fit, plants FE |
| req-1488 Apart from what other requirements add to it (the declaration d... | rulings only |
| req-1489 A notification is stored as one document in the MongoDB collect... | E2E, animals BE, tests repo |
| req-1490 A notification's reference number is unique across all notifica... | animals BE |
| req-1491 The service, never the caller, gives a new notification its ref... | animals BE |
| req-1492 When a generated reference number collides with an existing one... | animals BE |
| req-1493 Every endpoint that takes a reference number in its path refuse... | animals BE |
| req-1494 Every notification carries a concurrency token, returned in eac... | animals BE |
| req-1495 A save sent with a stale concurrency token changes nothing and ... | animals BE |
| req-1496 Submit, amend and cancel-amend take no concurrency token from t... | animals BE |
| req-1497 Today a notification has exactly one of four lifecycle statuses... | animals BE, tests repo |
| req-1498 The server stamps created on creation and updated on every writ... | animals BE |
| req-1499 submittedAt records the most recent submission: set to now on t... | animals BE |
| req-1500 In a non-prod environment with NOTIFICATION_TTL_DAYS set, each ... | animals BE |
| req-1501 The expiry sweep runs only where NOTIFICATION_TTL_SWEEP_ENABLED... | animals BE |
| req-1502 Each sweep permanently deletes, at most 10 at a time by default... | animals BE |
| req-1503 The expiry sweep writes no audit record and no outbox event, an... | animals BE |
| req-1504 A sweep that deletes notifications logs 'Expiring <n> notificat... | animals BE |
| req-1505 expireAt and the pre-amend notification and fulfilment snapshot... | animals BE |
| req-1506 The fulfilments payload (each obligation id holding a single va... | animals BE, tests repo |
| req-1507 Starting an amendment snapshots the notification content (inlin... | E2E, animals BE, tests repo |
| req-1508 Wherever the backend needs a notification's content, a record w... | animals BE |
| req-1509 A save body (POST /notifications and PUT /notifications/{refere... | animals BE |
| req-1510 The backend enforces no rule on the notification's content: no ... | animals BE |
| req-1511 The record's origin section holds the country of origin code, w... | E2E, animals BE, tests repo |
| req-1512 The record's commodity section holds a commodity name and a lis... | E2E, animals BE, tests repo |
| req-1513 Each species line holds a list of animal identifier units, one ... | E2E, animals BE, tests repo |
| req-1514 The record holds the reason for import (for example internalMar... | animals BE, tests repo |
| req-1515 The record's additional details hold what the animals are certi... | E2E, animals BE, tests repo |
| req-1516 The record holds six parties, each with an optional name, email... | E2E, animals BE, tests repo |
| req-1517 Each party is stored as a literal copy of the address-book reco... | E2E, animals BE, tests repo |
| req-1518 An address is a Standard Address Block named as the address boo... | E2E, animals BE, tests repo |
| req-1519 The CPH number is stored as one free-text string, the county, p... | E2E, animals BE, tests repo |
| req-1520 The record's transport section holds the port of entry, the arr... | E2E, animals BE, tests repo |
| req-1521 The means of transport is one of AIRPLANE, RAILWAY, ROAD_VEHICL... | animals BE |
| req-1522 The transport section holds one transporter with a name, an add... | animals BE, tests repo |
| req-1523 The record holds a destination country, a port of exit and an e... | animals BE, tests repo |
| req-1524 Every date-only field (arrival date, exit date and any added la... | animals BE |
| req-1525 Calendar dates are stored as ISO-8601 strings ('2026-07-21'), s... | E2E, animals BE, tests repo |
| req-1526 The API returns dates and timestamps as ISO-8601 strings, never... | animals BE |
| req-1527 Every error the backend's exception handler answers is an RFC 7... | animals BE |
| req-1528 A body or parameter that fails validation gets 400 with title '... | animals BE |
| req-1529 A body that cannot be read gets 400 with title 'Malformed Reque... | animals BE |
| req-1530 A payload that binds but the application rejects gets 400 with ... | animals BE |
| req-1531 A missing resource gets 404 with title 'Resource Not Found', ty... | animals BE |
| req-1532 An upstream failure (unreachable, timed out or non-2xx) gets 50... | animals BE |
| req-1533 A resource conflict such as a duplicate key gets 409 with title... | animals BE |
| req-1534 An oversized upload gets 413 with title 'Payload Too Large', ty... | animals BE |
| req-1535 A failure to write the outbox event or to get a notification's ... | animals BE |
| req-1536 Any other unexpected error gets 500 with title 'Internal Server... | animals BE |
| req-1537 The backend stores its data in MongoDB (credentials from CDP en... | animals BE |
| req-1539 POST /notifications with no reference number creates a notifica... | animals BE, tests repo |
| req-1540 Every one of the six write endpoints answers 200 with the whole... | animals BE |
| req-1541 POST /notifications with a reference number updates that notifi... | animals BE, tests repo |
| req-1542 Updating through POST /notifications answers 404 'Cannot find n... | animals BE |
| req-1543 PUT /notifications/{referenceNumber} replaces the content and f... | animals BE, perf tests |
| req-1544 Each write endpoint takes an optional x-cdp-request-id header (... | animals BE |
| req-1545 POST /notifications/{referenceNumber}/submit, with only an opti... | E2E, animals BE, tests repo |
| req-1546 Submitting from the declaration lands on /notifications/{id}/co... | tests repo |
| req-1547 A first submission (from DRAFT) writes a NotificationSubmitted ... | animals BE |
| req-1548 Submit stores the notification as it stands and its event carri... | animals BE |
| req-1549 Every event's payload lists only the accompanying documents who... | animals BE |
| req-1550 An actor sent with a write (inside the save body for POST and P... | animals BE, tests repo |
| req-1551 A submission event's versionId is the count of earlier submissi... | animals BE |
| req-1552 Each event for a notification takes the next aggregateVersion, ... | animals BE |
| req-1553 Every write to one notification (create, save, copy's new draft... | animals BE |
| req-1554 For PUT, copy, submit, amend, cancel-amend and soft delete, sav... | animals BE |
| req-1557 GET /notifications/{referenceNumber}/fulfilments returns refere... | animals BE, perf tests, tests repo |
| req-1558 The backend offers no read of one notification's full content b... | animals BE, perf tests, tests repo |
| req-1559 GET /notifications/reference-numbers returns reference strings ... | animals BE |
| req-1560 DELETE /notifications permanently removes the notifications nam... | animals BE |
| req-1561 Every DELETE /notifications request writes a DELETE_NOTIFICATIO... | animals BE |
| req-1562 Any DELETE whose path begins /notifications, and POST /notifica... | animals BE |
| req-1565 The backend defines eight notification lifecycle event types, e... | animals BE |
| req-1566 Each lifecycle action writes its event: amend NotificationAmend... | animals BE |
| req-1567 Outbox events are stored in the MongoDB collection outbox, each... | animals BE, tests repo |
| req-1568 Each event carries the notification's full status history so fa... | animals BE |
| req-1569 An event's publish time is stored with it but left out of the p... | animals BE |
| req-1570 A poller (on unless outbox.poller.enabled is false) publishes w... | animals BE |
| req-1571 Events are published to the one SNS FIFO topic set by OUTBOX_SN... | animals BE |
| req-1572 An event with no payload is skipped and logged as an error; an ... | animals BE |
| req-1574 Integration tests prove publication: create then submit publish... | animals BE |
| req-1576 GET /notifications/{referenceNumber}/outbox-events returns all ... | animals BE |
| req-1577 POST /notifications/{referenceNumber}/replay, with the admin se... | animals BE |
| req-1579 A submitted notification reaches PIMS Dynamics by way of the ba... | animals BE, tests repo |
| req-1580 A submitted notification appears in PIMS Dynamics as exactly on... | tests repo |
| req-1581 The PIMS Dynamics tests read through the Dataverse Web API (ODa... | tests repo |
| req-1583 A submitted-notification outbox event can be placed straight on... | tests repo |
| req-1585 The GBN-AG event data always carries $model 'defra/certificate-... | animals BE, tests repo |
| req-1586 exchangedDocument carries identifier (the reference number), tr... | animals BE, tests repo |
| req-1588 Each accompanying document is sent as one referenceDocument ent... | animals BE |
| req-1589 Each accompanying-document type is sent with its typeCode: vete... | animals BE |
| req-1590 exchangedDocument.firstSignatoryAuthentication lists declaratio... | animals BE |
| req-1592 specifiedConsignment maps the consignor to consignorParty, the ... | animals BE, tests repo |
| req-1593 The carrier is sent with the approval number as identifier (url... | animals BE |
| req-1595 A postalAddress is sent as lineOne (address line 1), lineTwo (a... | animals BE |
| req-1596 originCountry is sent as code.value, the ISO country of origin ... | animals BE, tests repo |
| req-1597 unloadingBaseportLocation is the port of entry code alone (abse... | animals BE |
| req-1598 The transport movement is sent as one mainCarriageLogisticsTran... | animals BE |
| req-1599 isOrHasUnweanedAnimals is sent as true or false from the stored... | animals BE |
| req-1600 includedConsignmentItem holds one consignment item carrying a t... | animals BE, tests repo |
| req-1601 A species trade line has one individualTradeProductInstance per... | animals BE |
| req-1604 A notification seeded through the animals frontend's save-and-c... | E2E, tests repo |
| req-1605 The journey's page routes, in order, are origin, commodities, c... | tests repo |
| req-1606 The page form fields saved into the record today are: origin co... | tests repo |
| req-1607 A page that rejects its submission re-renders with 200 and an e... | tests repo |
| req-1608 A notification with only origin and commodity answered reports ... | tests repo |
| req-1613 A new notification's opening run takes 'Save and continue' from... | E2E, animals FE, animals fit |
| req-1617 'Save and return to overview' saves the page and takes the user... | animals FE, animals fit, tests repo |
| req-1618 'Cancel and return to overview' is a link to the overview that ... | animals FE, tests repo |
| req-1619 Every page the overview links to ends with a primary 'Save and ... | E2E, animals FE, animals fit |
| req-1630 Pages inside a notification (the overview, the question pages a... | E2E, animals FE, animals fit, tests repo |
| req-1635 Starting a new notification creates a fresh, empty notification... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1637 Opening any page of a notification directly sends the user to i... | animals FE, animals fit, perf tests, tests repo |
| req-1638 Every page needs a signed-in session: a signed-out user who ope... | animals FE, animals fit, tests repo |
| req-1639 A page opened from the review page (with ?change=1) returns to ... | animals FE, animals fit, tests repo |
| req-1640 Every journey page is a server-rendered form: a successful save... | E2E, animals fit, perf tests, tests repo |
| req-1641 A page refuses 'Save and continue' only for its own hard stops;... | E2E, animals FE, animals fit, tests repo |
| req-1644 The transit countries step, and its row on the overview, apply ... | animals FE, tests repo |
| req-1645 The animal identification step follows commodity details only w... | E2E, animals FE, tests repo |
| req-1646 The additional details step applies to every live-animals consi... | animals FE, tests repo |
| req-1647 The CPH number applies unless every commodity in the consignmen... | animals FE, tests repo |
| req-1648 Each reason for import brings in only its own follow-up questio... | animals FE, tests repo |
| req-1649 Only the transporter details that match the chosen transporter ... | animals FE, tests repo |
| req-1650 An answer to a question that no longer applies is not shown, ch... | animals FE |
| req-1651 A notification's arrival date counts as complete only when it f... | E2E, tests repo |
| req-1653 Each journey page carries the caption of the part of the notifi... | E2E, animals FE, animals fit |
| req-1659 Every new or changed piece of user-facing text has a Welsh vers... | animals FE |
| req-1660 Journey changes keep the frontend's standing structure: the obl... | animals FE |
| req-1661 The service refuses to start when the journey is not fully conf... | animals FE |
| req-1662 Every changed page passes axe with no serious or critical WCAG ... | animals FE |
| req-1663 A page with validation errors shows a GOV.UK error summary titl... | animals FE, tests repo |
| req-1664 Date fields take a date as d/m/yyyy with single-digit days and ... | E2E, animals FE, tests repo |
| req-1674 The last navigation item, 'Log out', links to /auth/sign-out on... | E2E, INS FE, animals FE, animals fit, plants FE, tests repo |
| req-1675 The Manage account navigation item is a placeholder on every fr... | E2E, INS FE, animals FE, animals fit, plants FE |
| req-1676 The first navigation item, Dashboard, links to the dashboard ho... | E2E, INS FE, animals FE, animals fit, plants FE |
| req-1677 On the animals frontend (both sets) and the INS frontend, the A... | E2E, INS FE, animals FE, animals fit |
| req-1678 On every frontend, the service navigation items appear only to ... | INS FE, animals FE, plants FE |
| req-1679 Every page on every frontend uses the GOV.UK service navigation... | E2E, INS FE, animals FE, animals fit, plants FE |
| req-1680 The GOV.UK header logo links to https://www.gov.uk/ on every fr... | E2E, INS FE, animals FE, animals fit, plants FE |
| req-1684 The phase banner's feedback link is an email link to APHAServic... | E2E, INS FE, animals FE, animals fit, plants FE |
| req-1685 On the animals frontend, every page's browser title reads the p... | E2E, animals FE, animals fit |
| req-1687 When a page shows an error summary, its browser title starts wi... | INS FE, animals FE, animals fit, plants FE |
| req-1689 On every frontend, page content sits in a two-thirds-width colu... | INS FE, animals FE, plants FE |
| req-1690 On every frontend, a page shows a GOV.UK back link labelled 'Ba... | INS FE, animals FE, plants FE, tests repo |
| req-1691 A journey page on the animals frontend names its section in a c... | animals FE, animals fit, plants FE |
| req-1693 On every frontend, where a field's own copy gives no message, t... | INS FE, animals FE, plants FE |
| req-1694 On the animals and plants frontends, a save that hits a recover... | animals FE, plants FE |
| req-1695 On the INS frontend, a page whose service call fails is re-rend... | INS FE |
| req-1696 On the animals and plants frontends, a form post refused becaus... | animals FE, plants FE |
| req-1697 A page inside a notification can show a shared strip above its ... | INS FE, animals FE, plants FE |
| req-1698 Every page's footer on every frontend offers 'Privacy', 'Cookie... | INS FE, animals FE, animals fit, plants FE |
| req-1699 No page shows a cookie banner. | animals fit, plants FE |
| req-1700 Pages on every frontend are in English, with no language toggle... | INS FE, animals FE, plants FE |
| req-1701 Every page offers the standard GOV.UK 'Skip to main content' li... | INS FE, animals FE, animals fit, plants FE |
| req-1702 No page shows who is signed in: no email, name or 'signed in as... | E2E, INS FE, animals FE, animals fit, tests repo |
| req-1703 On the animals and plants frontends, when sign-in fails the use... | animals FE, plants FE, tests repo |
| req-1704 On the INS frontend, a failed sign-in shows the unauthorised pa... | INS FE |
| req-1705 An error response on every frontend is shown as the shared erro... | INS FE, animals FE, plants FE |
| req-1706 On the animals frontend, the service root / sends a signed-in u... | E2E, animals FE, tests repo |
| req-1707 The shared notification actions read 'Copy as new' and 'Delete'... | animals FE, plants FE |
| req-1708 Address pickers offer a shared 'Add a new address' link. When a... | animals FE |
| req-1710 Sign-in hands off to Defra ID with an OpenID Connect authorisat... | E2E, INS FE |
| req-1711 After signing in, a user who belongs to more than one organisat... | E2E, INS FE, tests repo |
| req-1712 Signing in to one frontend signs the user in to the others with... | E2E, tests repo |
| req-1713 A session is valid only while it is in the server-side cache (R... | E2E, INS FE, plants FE |
| req-1714 In stub mode the INS frontend signs a user in at once with no s... | INS FE |
| req-1715 On every frontend, every form post must carry a valid CSRF toke... | E2E, INS FE, animals FE, plants FE |
| req-1716 The animals frontend sends a Content-Security-Policy on its pag... | E2E, INS FE |
| req-1719 The tests repo's accessibility suite holds every scanned page t... | tests repo |
| req-1720 The accessibility suite walks the live-animals journey from the... | tests repo |
| req-1721 The accessibility suite scans the error summary state on the or... | tests repo |
| req-1722 The accessibility suite also scans the import reason reveals, t... | tests repo |
| req-1723 The animals frontend's own browser tests check that a captioned... | INS FE, animals FE, animals fit, plants FE |
| req-1725 The tests repo's security suite runs a traffic-driven OWASP ZAP... | tests repo |
| req-1727 The tests repo signs each worker in once and reuses the session... | tests repo |
| req-1728 The INS frontend serves a fixed list of routes, all behind sign... | INS FE |
| req-1729 Each INS dashboard row links out to the animals frontend, which... | INS FE |
| req-1731 The INS address book always sends the signed-in organisation to... | INS FE |
| req-1732 Every change to the INS frontend follows its build rules. It st... | INS FE |
| req-1748 Locally and in CDP dev, trade-imports-stub answers reference-da... | stub |
| req-1749 trade-imports-stub's MDM integration (countries and border cont... | stub |
| req-1753 The origin page keeps its path and the names of its form fields... | animals FE, perf tests |
| req-1755 The commodity choice is saved as the notification's commodity l... | E2E, animals FE, animals fit |
| req-1756 Every form on the commodity page and Commodity details (the qua... | E2E, animals FE, animals fit |
| req-1757 The commodity page and Commodity details stay the set's real jo... | E2E, animals FE, animals fit, perf tests |
| req-1758 The commodity page opens with an empty search field, and a sear... | animals FE |
| req-1760 Commodity details shows no total of animals or packages; the nu... | animals fit |
| req-1770 In the live-animals set the Additional details page applies to ... | animals FE, animals fit |
| req-1771 The main import reason page stays at the slug import-reason and... | animals FE, animals fit, perf tests |
| req-1807 The arrival details page stays at the journey slug 'port-of-ent... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1808 The k6 performance script's arrival details and transit countri... | perf tests |
| req-1809 The port of entry list is the whole MDM ports-of-entry list, no... | reference data, stub |
| req-1810 Locally and in CDP dev, the stub stands in for MDM's ports call... | reference data, stub |
| req-1815 No test pins a misspelt or duplicated port name, and the tests ... | tests repo |
| req-1821 The transporter list keeps its real journey path and its real f... | animals FE, perf tests |
| req-1822 The documents page keeps its address at the accompanying-docume... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1823 The documents form keeps the service's own field names and acti... | animals FE, perf tests |
| req-1824 Under the k6 load model every uploaded document's virus scan se... | perf tests |
| req-1828 The roles and addresses page and the party pickers keep the rea... | animals FE, animals fit, perf tests |
| req-1830 Until address search is built, the consignee, importer and plac... | E2E |
| req-1835 The CPH number and contact address pages keep the real service'... | animals FE, animals fit, perf tests, plants FE, tests repo |
| req-1844 The review, declaration and confirmation pages keep their real ... | animals FE, animals fit, perf tests |
| req-1845 Each party row in the Addresses card and the contact address re... | E2E, animals FE, animals fit |
| req-1849 The k6 suite's visits to the INS home keep working against the ... | perf tests |
| req-1853 The k6 background-volume script keeps counting notifications fr... | perf tests |
| req-1858 The address book list page shows the service's Alpha phase bann... | DR2.1 source only |
| req-1860 The INS address book keeps what the k6 performance suite reads ... | perf tests |
| req-1867 The address-book record is the Standard Address Block every liv... | address book |
| req-1868 Only transporters carry a transporter authorisation number: add... | address book |
| req-1869 Phone stays free text of up to 20 characters in the INS fronten... | address book |
| req-1871 trade-imports-stub's address lookup simulator stays as built: G... | stub |
| req-1874 The add and edit pages show the shared Alpha phase banner with ... | INS fit |
| req-1881 After a delete, the set's own notification list it lands on at ... | E2E, animals FE, animals fit, plants FE |
| req-1882 The deletion success banner does not dismiss itself after 5 sec... | E2E, animals fit |
| req-1897 Journey pages keep the real service's URL paths whatever path D... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1902 The k6 performance suite keeps driving a live-animals draft thr... | perf tests |
| req-1903 The performance suite signs in as a browser does: it follows a ... | perf tests |
| req-1904 Every frontend page keeps what the performance suite reads off ... | perf tests |
| req-1906 The performance suite's run rules stand: every route it request... | perf tests |
| req-1909 The country of origin search announces its results and the chos... | animals fit, plants FE |
| req-1911 The high-risk plants frontend's origin page, at /notifications/... | plants FE |
| req-1912 The plants origin page saves the chosen country's code, trimmed... | plants FE |
| req-1913 The plants origin page keeps its own country errors: a blank or... | plants FE |
| req-1914 The plants origin page narrows the countries a consignment may ... | plants FE |
| req-1915 When a plants consignment holds a ware-potatoes line, its origi... | plants FE |
| req-1916 The plants origin page offers the GBNAG_SPS_EX country block fr... | plants FE |
| req-1918 Without JavaScript, and until design answers design question 3,... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1936 Plants keeps its own arrival date rules: the date must be a rea... | plants FE |
| req-1937 Plants' arrival details asks no means of transport, transport i... | plants FE |
| req-1938 Plants' arrival-status page, at /notifications/{id}/arrival-sta... | plants FE |
| req-1939 Plants' arrival-status page shows the arrival caption, the lege... | plants FE |
| req-1940 On plants' arrival-status page, Save and continue with no answe... | plants FE |
| req-1941 Plants' arrival-status page has no serious or critical axe viol... | plants FE |
| req-1942 Plants' arrival details page is served at /notifications/{id}/a... | plants FE |
| req-1943 Plants' arrival date is one text box with the MoJ date picker, ... | plants FE |
| req-1944 Plants asks the expected time of arrival only of potato notific... | plants FE |
| req-1945 Plants asks the proposed place of landing only of potato notifi... | plants FE |
| req-1946 Plants' arrival details saves arrivalDate for every notificatio... | plants FE |
| req-1947 Reached in plants' journey order, Save and continue on arrival ... | plants FE |
| req-1948 Plants keeps its timing windows: potatoes are notified at least... | plants FE |
| req-1949 Plants' arrival details has no serious or critical axe violatio... | plants FE |
| req-1950 The documents rows change the animals frontend (and the animals... | plants FE |
| req-1952 The high-risk plants frontend's consignor and place of destinat... | plants FE |
| req-1953 The high-risk plants frontend keeps saving its consignor and pl... | plants FE |
| req-1954 The high-risk plants frontend's consignor and place of destinat... | plants FE |
| req-1959 A picker search that matches nothing ('No addresses match your ... | animals FE |
| req-1963 The plants consignment contact page keeps its search over the o... | plants FE |
| req-1966 The plants consignment contact page lists every record in the o... | plants FE |
| req-1967 On the plants consignment contact page a blank save is allowed:... | plants FE |
| req-1968 Submitting an id the address book does not hold, or a soft-dele... | plants FE |
| req-1969 The plants consignment contact page is reached from the overvie... | plants FE |
| req-1970 In plants the contact section is the one address-book pick: the... | plants FE |
| req-1973 The hub carries the shared page chrome: the Alpha phase banner ... | animals fit |
| req-1974 The hub has no introductory or guidance paragraph: it shows the... | animals FE |
| req-1975 The hub works fully without JavaScript: the commodity totals, t... | animals fit |
| req-1976 The high-risk plants frontend has its own Overview page per not... | plants FE |
| req-1977 The plants Overview ends with a secondary 'Return to dashboard'... | plants FE |
| req-1978 The plants Overview has no serious or critical axe accessibilit... | plants FE |
| req-2009 Plants' confirmation keeps its 'Return to dashboard' link to pl... | plants FE |
| req-2010 Plants' check answers keeps its own page: notification-view, ti... | plants FE |
| req-2011 Plants' check answers keeps its own sections, cards and rows: '... | plants FE |
| req-2012 On plants' editable check answers, each answer row in the Impor... | plants FE |
| req-2013 Plants' check answers reads the place of destination, consignor... | plants FE |
| req-2014 Plants' check answers shows a draft's outstanding errors as soo... | plants FE |
| req-2015 Continue on a complete, error-free plants check answers goes to... | plants FE |
| req-2016 A submitted plants notification's check answers is read-only: n... | plants FE |
| req-2017 Plants' lateness rules stay: only potatoes, plants for planting... | plants FE |
| req-2018 On a plants draft that would be late if submitted today, check ... | plants FE |
| req-2019 Plants records a late notification indicator ('late' or 'on-tim... | plants FE |
| req-2020 A plants notification stored as late shows an 'Important' notif... | plants FE |
| req-2021 Plants' declaration keeps its own page and content: at declarat... | plants FE |
| req-2022 Plants' declaration carries no third-party, standing, authority... | plants FE |
| req-2023 Plants' submit stays synchronous: a confirmed declaration saves... | plants FE |
| req-2024 Plants' confirmation keeps its own content: a GET-only page at ... | plants FE |
| req-2026 The review keeps today's finer validation rules: an unanswered ... | animals FE, animals fit |
| req-2033 Plants' card keeps its own status-driven actions: a draft offer... | plants FE |
| req-2037 Until its search, sort and filters are built, plants' list keep... | plants FE |
| req-2046 The add and edit Country field stays a plain select in this pro... | INS FE, INS fit |
| req-2050 The high-risk plants frontend has no templates of its own and n... | rulings only |
| req-2058 The plants frontend shows a notification's reference exactly as... | plants FE |
| req-2060 A plants notification has the same four lifecycle statuses as a... | plants FE, tests repo |
| req-2070 The high-risk plants journey keeps its own sections, steps and ... | plants FE |
| req-2071 In the high-risk plants frontend, opening a notification's hub ... | plants FE |
| req-2072 Each plants journey page carries its section's caption above it... | plants FE |
| req-2073 Plants flow changes keep the plants set's standing structure: t... | plants FE |
| req-2074 Plants changes made in this programme keep the plants rulings l... | plants FE |
| req-2078 Every journey page works fully without JavaScript, and CSS and ... | E2E, animals fit |
| req-2079 Readiness keeps today's rules in every set: a trader can start ... | animals FE, animals fit, tests repo |
| req-2080 The live-animals obligation model keeps today's scope and manda... | animals FE, tests repo |
| req-2084 On the plants frontend, the Address book navigation item keeps ... | plants FE |
| req-2086 On every frontend, a page with errors shows a GOV.UK error summ... | INS FE, animals FE, animals fit, plants FE, tests repo |
| req-2087 A signed-out user who opens any page of a frontend is sent thro... | E2E, INS FE, tests repo |
| req-2091 The plants frontend's high-risk plants set mounts as its own Ha... | plants FE |
| req-2092 On the plants frontend, a question page the overview links to d... | plants FE |
| req-2093 On the plants frontend, a date is one text input about ten char... | plants FE |
| req-2094 On the plants frontend, Defra ID sign-in is the only preconditi... | plants FE |
| req-2105 Without JavaScript, and until the commercial transporter's addr... | animals FE, animals fit |
| req-2115 Submitting a plants notification stays a synchronous save of th... | plants FE |
| req-2117 The plants journey keeps supplying coded values and its created... | plants FE |
| req-2120 The plants set is mounted at /high-risk-plants, every plants li... | plants FE |

## The increments

A **review point** is where the loop stops for Sam to look before building on. "Lands after" lists the rows that must land first. A row in brackets lives on a split branch.

### Ready to go

118 rows, in build order.

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|
| inc-009 | Country of origin: no hint and a 'Search for a country' placeholder, in animals and plants | 6 | frontend, plantsfrontend, tests | nothing | origin-page |
| inc-011 | Commodity page and Commodity details wording, the Species column, the 'Select a commodity' error, the soft Save and return, and the error order match Design Release 2.1 | 11 | frontend, tests | nothing | commodities-and-reason |
| inc-015 | Commodity pages chain as journey steps around the main import reason **Review point** | 7 | frontend, tests, perftests | inc-001 (journey-foundation) | commodities-and-reason |
| inc-018 | Hard stops: means of transport on arrival details and number of packages on commodity details | 5 | frontend, tests | nothing | commodities-and-reason |
| inc-020 | Main import reason and additional details copy matches Design Release 2.1 | 8 | frontend, tests | nothing | commodities-and-reason |
| inc-022 | Main import reason completes on its own answers, and both pages soft-save as Design Release 2.1 does | 8 | frontend, tests | inc-003 (journey-foundation) | commodities-and-reason |
| inc-026 | Arrival details wording: labels, hints, placeholder and means of transport options, in animals and plants | 8 | frontend, plantsfrontend, tests | nothing | arrival-and-transit |
| inc-027 | Port options read '<port name> - <port code>', in animals and plants | 5 | frontend, plantsfrontend, tests | nothing | arrival-and-transit |
| inc-028 | Arrival details requires a means of transport, and arrival and transit return to where the trader came from | 9 | frontend, tests | inc-002 (journey-foundation), inc-003 (journey-foundation) | arrival-and-transit |
| inc-029 | Transit countries page: title, Back link, empty state and redirect when it does not apply | 6 | frontend, tests | inc-002 (journey-foundation) | arrival-and-transit |
| inc-031 | Upload documents can be opened as soon as the origin is answered | 2 | frontend, tests | nothing | documents |
| inc-050 | Identifier labels and hints follow DR2.1, length errors say 'or less', and values are trimmed before the length check | 5 | frontend, tests | nothing | identification-and-permanent-address |
| inc-059 | The address book record carries the address's type and what it can be used for **Review point** | 5 | addressbook, tests | nothing | address-book |
| inc-060 | Address validation messages match Design Release 2.1, on the form and in the API | 4 | addressbook, insfrontend, tests | nothing | address-book |
| inc-061 | Adding an address starts by choosing its type **Review point** | 11 | insfrontend, tests | nothing | address-book |
| inc-063 | Address book list: Design Release 2.1 intro, filter disclosure, search control, table cells, empty state and a banner that stays | 11 | insfrontend, tests | nothing | address-book |
| inc-064 | View an address: GOV.UK page titles, optional rows only when filled, a secondary Edit button and no 404 for a dead link | 5 | insfrontend, tests | nothing | address-book |
| inc-065 | Delete an address: Design Release 2.1 confirmation page, 'No, cancel' link, a stale delete as a no-op and the new banner | 8 | insfrontend, tests | nothing | address-book |
| inc-085 | Roles and addresses page: intro, warning, Consignor name, named add links and full addresses | 9 | frontend, plantsfrontend, tests | nothing | consignment-parties |
| inc-086 | Party picker layout: add button, search control, results heading and count, address lines and blank save | 15 | frontend, plantsfrontend, tests | nothing | consignment-parties |
| inc-091 | The CPH number page follows Design Release 2.1: who is asked, its help and hint, a blank save, and where it goes | 9 | frontend, tests | nothing | consignment-parties |
| inc-098 | Hub regions for assistive technology and the 'Main import reason' row | 8 | frontend, plantsfrontend, tests | nothing | overview-and-review |
| inc-101 | Review sections and cards take Design Release 2.1's headings, titles and unfinished-card messages **Review point** | 9 | frontend, tests | nothing | overview-and-review |
| inc-110 | Review ends with Continue and Delete, and an amendment's review offers Cancel amend and tells the trader they are re-submitting | 9 | backend, frontend, plantsfrontend, tests | nothing | overview-and-review |
| inc-111 | A submitted notification's view has a header: reference, status, date submitted and a Back link to the set's own notification list **Review point** | 9 | backend, frontend, plantsfrontend, tests | nothing | overview-and-review |
| inc-114 | Declaration page: small checkbox in a hidden-legend fieldset, and no status strip | 6 | frontend, plantsfrontend, tests | nothing | overview-and-review |
| inc-115 | Notification submitted page follows Design Release 2.1's guard, wording and links | 6 | frontend, plantsfrontend, tests | nothing | overview-and-review |
| inc-123 | Copy as new carries over exactly Design Release 2.1's list, from the submitted version | 9 | backend, frontend, tests | nothing | manage-notifications |
| inc-125 | The delete confirmation page identifies the notification in a summary and takes Design Release 2.1's wording and buttons, in animals and plants | 13 | frontend, plantsfrontend, tests | nothing | manage-notifications |
| inc-129 | The live animals list is reframed in place, scoped to the trader's organisation, and plants' list takes the same frame **Review point** | 11 | backend, frontend, plantsfrontend, tests, perftests | nothing | animals-dashboard |
| inc-174 | Transit country search offers the GBNAG_SPS_EX countries and their subdivisions | 4 | frontend, tests | inc-173 (reference-lists) | arrival-and-transit |
| inc-175 | Country of origin list labels subdivisions with their parent country | 4 | frontend, tests | inc-173 (reference-lists) | origin-page |
| inc-010 | Region of origin code, internal reference hint and the finished origin page | 8 | frontend, tests | inc-009 | origin-page |
| inc-021 | Reason and additional details sit in Design Release 2.1's journey order **Review point** | 7 | frontend, tests | inc-015, inc-001 (journey-foundation) | commodities-and-reason |
| inc-032 | Upload documents guidance, hints, table and maximum-documents error match Design Release 2.1 | 9 | frontend, tests | inc-031 | documents |
| inc-033 | Document references accept punctuation, and the document type list drops Health certificate | 4 | backend, frontend, tests | inc-031 | documents |
| inc-034 | Upload documents remembers where the trader came from and returns them there | 5 | frontend, tests | inc-031, inc-001 (journey-foundation), inc-002 (journey-foundation) | documents |
| inc-035 | Save and continue no longer waits for virus scans, and Save and return to overview keeps a typed-in document | 7 | frontend, tests | inc-031 | documents |
| inc-043 | Save and continue on the transporter list goes on to 'Upload documents' in the journey run | 4 | frontend, tests | inc-031, inc-001 (journey-foundation) | transporters |
| inc-045 | Identification details takes its place in the linear journey after Commodity details | 6 | frontend, tests | inc-015, inc-001 (journey-foundation) | identification-and-permanent-address |
| inc-062 | The add-details form for an address entered by hand | 7 | insfrontend, tests | inc-061 | address-book |
| inc-066 | View and delete pages return the user to where they opened the address from, including an animals journey page | 8 | insfrontend, tests | inc-064, inc-065 | address-book |
| inc-067 | Address book list split into three category tabs with a Type column **Review point** | 10 | addressbook, insfrontend, tests, perftests | inc-059 | address-book |
| inc-087 | Role-filtered party pickers on one page **Review point** | 10 | addressbook, frontend, plantsfrontend, tests | inc-059 | consignment-parties |
| inc-092 | The consignment addresses page shows the CPH number as 12/345/6789 and continues to the contact address | 7 | frontend, tests | inc-091, inc-001 (journey-foundation), inc-002 (journey-foundation) | consignment-parties |
| inc-100 | The live-animals Transit countries task shows only when transit countries are required | 4 | frontend, tests | inc-028 | overview-and-review |
| inc-102 | Review rows for origin, import reason, additional details and transport and arrival follow Design Release 2.1 | 9 | frontend, tests | inc-101 | overview-and-review |
| inc-103 | Arrival and transit task statuses on the overview, and transit countries on the review | 4 | frontend, tests | inc-028, inc-101 | overview-and-review |
| inc-104 | Review reads the commodity selection back in a 'What are you importing?' card and groups species under their commodity **Review point** | 9 | frontend, tests | inc-101 | overview-and-review |
| inc-107 | Each uploaded document has its own card on the review, showing its file name | 3 | frontend, tests | inc-101 | overview-and-review |
| inc-109 | The review page reads each party's copied address back as name, address lines and country, in live animals and plants | 6 | frontend, plantsfrontend, tests | inc-101 | overview-and-review |
| inc-112 | View header offers Amend, Copy as new and Delete, and shows the import reference numbers as text to copy | 8 | frontend, plantsfrontend, tests | inc-111 | overview-and-review |
| inc-121 | The cancel-amendment page takes Design Release 2.1's wording and returns to the submitted view with no banner, in animals and plants | 8 | frontend, plantsfrontend, tests | inc-110 | manage-notifications |
| inc-130 | Notification cards show Design Release 2.1's facts, on the live animals list and on plants' list | 8 | backend, frontend, plantsfrontend, tests | inc-129 | animals-dashboard |
| inc-196 | 'Use template' on the live animals list | 3 | frontend, tests | inc-129, inc-151 (type-question-and-templates) | animals-dashboard |
| inc-046 | Selected commodities summary with a Species column, and identification grouped by commodity then species **Review point** | 7 | frontend, tests | inc-045 | identification-and-permanent-address |
| inc-068 | Type filter within a category tab, with tab and pagination links that keep the user's filters | 6 | addressbook, insfrontend, tests | inc-067 | address-book |
| inc-073 | Editing an address matches Design Release 2.1 | 8 | insfrontend, tests | inc-059, inc-062 | address-book |
| inc-077 | The INS add page reached from a journey shows Design Release 2.1's 'Add address and contact details' page | 8 | insfrontend, tests | inc-061, inc-062 | address-book |
| inc-088 | Same-as shortcuts on the roles and addresses page | 8 | frontend, tests | inc-085, inc-087 | consignment-parties |
| inc-089 | Place of origin picker searches by country | 8 | frontend, tests | inc-086, inc-087 | consignment-parties |
| inc-090 | Picker 'View' link to the INS address book and back | 5 | insfrontend, frontend, tests | inc-086, inc-066 | consignment-parties |
| inc-106 | Identification details on the review: heading, animal labels, its own Change link and per-species unfinished messages | 5 | frontend, tests | inc-104 | overview-and-review |
| inc-113 | Submitting records its date and outstanding items, and a notification still missing its health certificate shows as 'Submitted action required' | 12 | backend, insfrontend, frontend, tests | inc-111, inc-112 | overview-and-review |
| inc-120 | Amend goes through a confirmation page, then opens the amend review, in animals and plants **Review point** | 8 | frontend, plantsfrontend, tests, perftests | inc-112 | manage-notifications |
| inc-124 | A stale Copy as new from the view page returns to the view page with the updated banner | 3 | frontend, tests | inc-112 | manage-notifications |
| inc-135 | The live animals list has 'In progress', 'Draft' and 'Completed' tabs | 7 | backend, frontend, tests | inc-130 | animals-dashboard |
| inc-187 | A draft's review shows the view header with its Draft status and stays editable | 10 | frontend, plantsfrontend, tests | inc-101, inc-110, inc-111, inc-112 | overview-and-review |
| inc-047 | Each species panel saves only its own animal, with the saved-animals table below the form | 7 | frontend, tests | inc-046 | identification-and-permanent-address |
| inc-069 | Search the whole row, 8 addresses a page, a list that clamps stale page numbers and a stub that behaves like the real book | 9 | addressbook, insfrontend, tests | inc-068, inc-065 | address-book |
| inc-078 | The journey add page splits origin-side and destination-side roles, with Design Release 2.1's country placeholder and messages | 9 | insfrontend, tests | inc-077, inc-060 | address-book |
| inc-079 | A new address added from the journey can also be saved for the other roles on its side | 6 | insfrontend, tests | inc-077, inc-059 | address-book |
| inc-080 | A notification journey's add opens Design Release 2.1's add page in journey mode, and saving or cancelling lands where Design Release 2.1 says **Review point** | 13 | insfrontend, frontend, tests | inc-077 | address-book |
| inc-126 | The deletion message reads 'Notification has been deleted' on each set's own list, and deleting an amending notification is proven | 8 | backend, frontend, plantsfrontend, tests | inc-110, inc-120, inc-121, inc-125 | animals-dashboard |
| inc-131 | Card status styles on both lists, and 'Action required' on the set's own list for a submitted notification missing its ITAHC | 7 | backend, frontend, plantsfrontend, tests | inc-113, inc-129, inc-130 | animals-dashboard |
| inc-136 | The live animals list's search and sort become one form that really searches and sorts | 9 | backend, frontend, tests, perftests | inc-135 | animals-dashboard |
| inc-176 | A germinal products notification starts in its own set, with its own draft, stored category, service chrome and origin page, and each set opens only its own notifications **Review point** | 25 | backend, frontend, tests | inc-010, inc-098, inc-100, inc-129, inc-130, inc-135, inc-148 (type-question-and-templates), inc-150 (type-question-and-templates), inc-001 (journey-foundation), inc-002 (journey-foundation) | germinal-products |
| inc-201 | A 'Submitted action required' notification can be amended, copied and deleted as a Submitted one can | 5 | backend, frontend, tests | inc-113, inc-120, inc-121, inc-123, inc-125 | manage-notifications |
| inc-016 | The germinal commodity page offers today's 12 germinal lines, and the live-animals page no longer does | 8 | frontend, tests | inc-176, inc-011 | germinal-products |
| inc-048 | An empty species panel is refused on its own save, even beside a filled one | 4 | frontend, tests | inc-047 | identification-and-permanent-address |
| inc-054 | A permanent address page for cats and dogs, with one card per animal and a same-as-destination choice **Review point** | 13 | backend, frontend, tests | inc-047, inc-001 (journey-foundation) | identification-and-permanent-address |
| inc-070 | Saving a new address with its uses | 8 | insfrontend, tests, perftests | inc-059, inc-061, inc-062, inc-067, inc-069 | address-book |
| inc-082 | The journey add page's Country select offers the countries reference-data serves from MDM | 4 | insfrontend, tests | inc-078, inc-173 (reference-lists) | address-book |
| inc-083 | Welsh for the redesigned address book list, view and delete pages | 3 | insfrontend | inc-063, inc-066, inc-069 | address-book |
| inc-137 | The live animals list has 'Additional filters' for arrival date, date range and status | 7 | backend, frontend, tests | inc-136 | animals-dashboard |
| inc-140 | The lists' success banner is titled 'Success', on the live animals list and on plants' list | 4 | frontend, plantsfrontend, tests | inc-129, inc-126 | animals-dashboard |
| inc-147 | Identifier-driven outstanding items: warnings, inline error, confirmation bullet and the list's 'Information is missing' | 8 | backend, frontend, tests | inc-131, inc-106, inc-113 | animals-dashboard |
| inc-178 | A germinal products notification chooses its transporter from its own copy of today's transporter step | 8 | frontend, tests | inc-176 | germinal-products |
| inc-179 | Germinal products notifications have their own Upload documents page | 7 | frontend, tests | inc-031, inc-032, inc-033, inc-034, inc-035, inc-176 | germinal-products |
| inc-180 | The INS address book takes adds from germinal products notifications and returns to them | 4 | insfrontend, tests | inc-080, inc-090 | consignment-parties |
| inc-055 | The permanent address page checks each new address, names the animal in every error, and answers errors as an error page | 7 | frontend, tests | inc-054 | identification-and-permanent-address |
| inc-056 | Permanent addresses are summarised on the consignment addresses page and listed per animal on the review page | 5 | frontend, tests | inc-054 | identification-and-permanent-address |
| inc-057 | The permanent address leaves the identification page | 5 | frontend, tests | inc-054 | identification-and-permanent-address |
| inc-071 | Destination, Consignee or Importer and Branch addresses entered by hand, with a fixed UK country | 7 | insfrontend, tests | inc-070, inc-062 | address-book |
| inc-094 | The contact address page follows Design Release 2.1 in live animals and plants | 11 | frontend, plantsfrontend, tests | inc-054, inc-091, inc-001 (journey-foundation) | consignment-parties |
| inc-108 | Addresses card: permanent addresses, CPH format, one header link and a single unfinished entry | 6 | frontend, tests | inc-101, inc-054 | overview-and-review |
| inc-138 | The lists page 8 at a time with numbered pages, and lose the results line and empty messages | 7 | backend, frontend, plantsfrontend, tests | inc-136, inc-137 | animals-dashboard |
| inc-181 | Germinal products roles and addresses page and party pickers, with no CPH number or permanent address page | 13 | frontend, tests | inc-091, inc-054 | germinal-products |
| inc-058 | End-to-end proof: pet cats by air with permanent addresses | 3 | tests | inc-054, inc-057, inc-001 (journey-foundation) | identification-and-permanent-address |
| inc-084 | Welsh drafts for the new add and edit copy | 2 | insfrontend | inc-060, inc-073, inc-061, inc-062, inc-070, inc-071 | address-book |
| inc-095 | The contact address page offers only the trader's own branch addresses and adds a new branch through the address book | 5 | insfrontend, frontend, tests | inc-094, inc-061, inc-070, inc-080 | consignment-parties |
| inc-096 | Which sections the roles and addresses page shows, when its task is complete, and where it continues | 8 | frontend, tests | inc-054, inc-091, inc-094, inc-001 (journey-foundation), inc-002 (journey-foundation) | consignment-parties |
| inc-097 | While amending, the contact, CPH and permanent address pages end with 'Save and return' and 'Save and continue', and the contact page's return wording follows Design Release 2.1 | 9 | frontend, plantsfrontend, tests | inc-054, inc-091, inc-094, inc-004 (journey-foundation), inc-122 (journey-foundation) | consignment-parties |
| inc-117 | Tests prove the review, declaration and confirmation paths no test covers today | 8 | frontend, tests | inc-104, inc-107, inc-108, inc-110, inc-112, inc-115 | overview-and-review |
| inc-141 | The germinal products set's root renders its own copy of the reframed list | 4 | frontend, tests | inc-176, inc-129, inc-130, inc-135, inc-136, inc-137, inc-138, inc-140, inc-196 | germinal-products |
| inc-024 | The germinal opening run and main import reason: two reasons and four purposes | 7 | frontend, tests | inc-016, inc-141, inc-015, inc-020, inc-021, inc-022 | germinal-products |
| inc-017 | Germinal Commodity details asks total gross weight, number of packages and temperature, and the backend stores and publishes them with interim typeCodes | 12 | backend, frontend, tests | inc-016, inc-011, inc-018, inc-024 | germinal-products |
| inc-052 | Germinal identification asks once per species for donor, dates and identification number, and the backend stores them unpublished | 9 | backend, frontend, tests | inc-047, inc-016, inc-045, inc-046, inc-050, inc-017 | germinal-products |
| inc-172 | Germinal products notifications on their own list, with their own card facts | 4 | backend, frontend, tests | inc-130, inc-141, inc-017 | germinal-products |
| inc-177 | Germinal Commodity details checks weight and packages, listing errors by question | 8 | frontend, tests | inc-018, inc-017 | germinal-products |
| inc-053 | Germinal identification dates and donor: single text inputs with V4's date and length checks | 13 | frontend, tests | inc-052, inc-050 | germinal-products |
| inc-099 | The Overview for a germinal products notification, with Commodity details Complete on valid packages | 10 | frontend, tests | inc-017, inc-177 | germinal-products |
| inc-105 | The germinal set's own review: germinal answers in their species blocks, its unfinished-species messages, and no CPH or permanent address | 6 | frontend, tests | inc-104, inc-017, inc-052, inc-176, inc-099, inc-106 | germinal-products |
| inc-182 | The rest of the germinal journey in the live-animals step order: arrival, transit countries, contact address, declaration and submission, certified for 'Germinal products' | 14 | frontend, tests | inc-099, inc-105, inc-178, inc-179, inc-181, inc-026, inc-027, inc-028, inc-029, inc-094, inc-095, inc-097, inc-110, inc-111, inc-112, inc-113, inc-114, inc-115, inc-018 | germinal-products |
| inc-185 | Amend, cancel amend, copy as new and delete for germinal products notifications | 4 | backend, frontend, tests | inc-182, inc-120, inc-121, inc-123, inc-124, inc-125, inc-126, inc-122 (journey-foundation) | germinal-products |
| inc-186 | Germinal products templates are answered on the germinal set's pages, and the germinal origin page's Back link follows where the notification started | 12 | frontend, tests | inc-182, inc-150, inc-151, inc-154, inc-155, inc-156, inc-157, inc-158, inc-159, inc-160, inc-161, inc-164, inc-165 (all type-question-and-templates) | germinal-products |
| inc-183 | The germinal set has no Additional details step, and a germinal species counts as identified once it has one identifier | 5 | frontend, tests | inc-099, inc-105, inc-182, inc-052, inc-186 | germinal-products |
| inc-184 | End-to-end proof: a germinal products notification for bovine semen, from create to submitted | 2 | tests | inc-182, inc-183, inc-141, inc-172 | germinal-products |

### Blocked

45 rows. Each builds once its blocker clears and the rows it lands after have landed.

#### Waiting on design

Design answers the numbered questions from the 9 October afternoon ruling. Each row is built as design says, or dropped. inc-014 also waits on MDM commodities. inc-194 also waits on the address lookup.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-014 | Waiting on design: commodity search lists results as the trader types, in both animals sets, once commodities come from MDM **Review point** | frontend, tests | waiting-on-design |
| inc-030 | Waiting on design: transit countries added and removed in place with JavaScript, with 'Added' and 'Removed' announcements | frontend, tests | waiting-on-design |
| inc-093 | With JavaScript, the CPH boxes keep out non-digits and one paste fills all three, if design keeps it | frontend, tests | waiting-on-design |
| inc-188 | Waiting on design: a Search button beside the country of origin, port of entry, transit country and place of landing searches | frontend, plantsfrontend, tests | waiting-on-design |
| inc-189 | Country of origin results take the prototype's screen-reader wording, if design says the component's own cannot stand | frontend, plantsfrontend, tests | waiting-on-design |
| inc-190 | Region code prefix follows the picked country in the browser, if design asks for it | frontend, tests | waiting-on-design |
| inc-192 | Waiting on design: the germinal dates' 'Choose date' calendar | frontend, tests | waiting-on-design |
| inc-193 | Party pickers filter as the trader types | insfrontend, frontend, plantsfrontend, tests | waiting-on-design |
| inc-194 | Waiting on design: address search's search-only layout, results as the trader types, reveal on a pick and its announcements, in the address book and the commercial transporter form | insfrontend, frontend, tests | waiting-on-design |
| inc-195 | Waiting on design: the amend and cancel-amendment pop-ups | frontend, plantsfrontend, tests | waiting-on-design |
| inc-197 | Waiting on design: the place of origin picker's rows filter as the trader types | frontend, tests | waiting-on-design |
| inc-198 | Waiting on design: a Copy button on each import reference number | frontend, plantsfrontend, tests | waiting-on-design |

#### Waiting on a transporter decision

Someone decides whether the service manages transporters, and whether the address book or something else does it. The ruling names nobody; some rows name the product owner. The transporter area is then re-distilled.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-008 | The private transporter's country list is reference-data's GBNAG_SPS_EX countries plus the United Kingdom, as MDM serves them | frontend, tests | transporters |
| inc-037 | The transporter list matches DR2.1: its layout, search, columns and shipped transporters **Review point** | frontend, tests | transporters |
| inc-038 | 'Choose a transporter type' matches DR2.1 and refuses a blank choice | frontend, tests | transporters |
| inc-039 | Saving an added transporter returns to the list with it chosen and a success banner; cancelling goes to the dashboard **Review point** | frontend, tests | transporters |
| inc-040 | 'Add a private transporter' matches DR2.1: heading, country select and required fields | frontend, tests | transporters |
| inc-041 | 'Add a commercial transporter' matches DR2.1: heading, guidance banner, postcode copy and required fields | frontend, tests | transporters |
| inc-044 | Remove the unlinked commercial transporter register page | frontend, tests | transporters |
| inc-074 | Choosing Transporter when adding to the address book hands over to adding a transporter | addressbook, insfrontend, frontend, tests | transporters |
| inc-075 | Transporter tab: transporters listed with approval number and type, filtered and searched | addressbook, insfrontend, tests | transporters |
| inc-076 | Each transporter on the list links to its details page | insfrontend, frontend, tests | transporters |

#### Waiting on the INS dashboard's requirements

The INS dashboard's summary information waits until its requirements firm up and are agreed. The rulings name nobody and no date. inc-143 and inc-144 also wait on the authorities' import-checking systems. inc-146 also waits on the plants services publishing to the INS read model.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-128 | The INS front door's home becomes the Design Release 2.1 overall dashboard, with the performance suite's readiness probe following its heading **Review point** | insfrontend, tests, perftests | ins-dashboard |
| inc-132 | Action needed drill-down lists the organisation's notifications needing action **Review point** | insbackend, insfrontend, tests | ins-dashboard |
| inc-133 | Search and sort the Action needed list | insbackend, insfrontend, tests | ins-dashboard |
| inc-134 | Action needed glance card on the home's Live animals section | insfrontend, tests | ins-dashboard |
| inc-139 | The live animals list's Summary shows 'Action needed' and 'Status updated' glance cards | backend, frontend, tests | animals-dashboard |
| inc-143 | Status updates cards and the Status updated drill-down | insbackend, insfrontend, tests | ins-dashboard |
| inc-144 | Inspection required drill-down | insbackend, insfrontend, tests | ins-dashboard |
| inc-145 | Germinal products section on the home | insfrontend, tests | ins-dashboard |
| inc-146 | The plants section's glance cards | insfrontend, tests | ins-dashboard |

#### Waiting on MDM commodities

The MDM commodity list reaches the animals frontend through reference-data. The commodity catalogue and search area is then re-distilled.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-012 | Live-animal commodity catalogue matches Design Release 2.1, once commodities come from MDM | frontend, tests, perftests | commodities-and-reason |
| inc-013 | Commodity search results sorted and bolded, and a selected panel of removable species chips, once commodities come from MDM | frontend, tests | commodities-and-reason |
| inc-019 | End-to-end proof: poultry by rail in transit | tests | commodities-and-reason |
| inc-023 | Unweaned question is asked for cattle and pigs | frontend, tests | commodities-and-reason |
| inc-051 | Pigs, sheep and goats are identified by ear tag only | frontend, tests | identification-and-permanent-address |
| inc-191 | Once commodities come from MDM, the germinal catalogue holds V4's 18 items, with embryos and ova separate and each its own GBN-AG type | backend, frontend, tests | germinal-products |

#### Waiting on the address lookup

The INS front door's and INS backend's address lookup becomes a real feature. Today only the EUDPA-390 spike exists, gated to dev and local. inc-042 also waits on the transporter decision.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-042 | Find a commercial transporter's Northern Ireland address with an address search | stub, insbackend, frontend, tests | transporters |
| inc-072 | The address search finds real UK addresses, without JavaScript, once the address lookup is real | insfrontend, tests | address-book |
| inc-081 | Destination-side journey add pages find UK addresses by a search that works without JavaScript | insfrontend, tests | address-book |

#### Waiting on PIMS Dynamics outcomes

The authorities' case system sends post-submission outcomes back to the notification record. No completed, delayed or inspection status reaches the service today. inc-142's req-1735 also waits on the INS dashboard's requirements.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-116 | A completed notification shows as complete with no Amend button | backend, frontend, tests | overview-and-review |
| inc-142 | Cards show the authorities' outcomes: delayed, completed, inspection, their actions and the status-updated count | backend, frontend, tests | animals-dashboard |

#### Waiting on CDP

CDP raises the nginx body cap for the animals frontend to at least 50,001,024 bytes. The team records it against EUDPA-518.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-036 | Attach files up to 50MB | frontend, tests | documents |

#### Waiting on the plants backend

`trade-imports-plants-backend` lets plants' list query by status, keyword and arrival date, with a page size of 8 (deferred.md).

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-200 | Plants' list tabs, eight a page, search, sort and filters, once the plants backend can query them | plantsfrontend, tests | animals-dashboard |

#### Waiting on the plants customs owner

The plants policy or customs owner confirms plants' own customs document code. The programme owner names who confirms it.

| Id | What it delivers | Repos | Theme |
|---|---|---|---|
| inc-199 | Plants' customs document code on its import reference numbers, once plants' own code is confirmed | plantsfrontend, tests | overview-and-review |

#### Dropped

| Id | What it delivered | Status |
|---|---|---|
| inc-025 | Arrival details page moves to the 'arrival-details' address | dropped |
| inc-049 | Identification counts as complete only when every animal is entered, and submit needs one entry per species when several are selected | dropped |
| inc-118 | Overview totals count only positive numbers | dropped |
| inc-119 | Fallback warning for an action-required notification's other outstanding items | dropped |
| inc-162 | A sort on Manage templates that really reorders, as design answers question 11 | dropped |

**Check these ordering decisions:**

- Many rows here land after rows on the split branches: inc-001 to inc-004 and inc-122 (journey-foundation), inc-173 (reference-lists), and inc-148 to inc-165 (type-question-and-templates). The loop builds them only once those branches merge.
- inc-016 moves today's 12 germinal lines out of the live-animals catalogue now, ahead of MDM. It waits on inc-176, the germinal set's start.
- inc-024, the germinal opening run, waits on inc-141, the germinal list. inc-017 waits on inc-024. So germinal Commodity details waits on the whole list reframe.
- inc-182 waits on 19 rows across 5 themes. inc-176 waits on 10 rows across 6 themes.
- inc-012 is blocked on MDM commodities, so inc-019, inc-023, inc-051 and inc-191 are blocked behind it too.
- inc-008 and inc-044 are blocked with transporter management (c-285). inc-043 is the only transporter row ready to go.
- inc-128, the INS overall home, is blocked. inc-132 to inc-134 and inc-143 to inc-146 are blocked behind it.
- inc-139 and inc-142 are blocked on the glance-card counts and PIMS Dynamics outcomes. The rest of the reframed list builds without them.
- inc-200 holds plants' tabs, paging, search, sort and filters until the plants backend can query them. inc-129, inc-130, inc-131, inc-138 and inc-140 change plants' frame now.
- inc-176 has 25 criteria and may be too big to review. It could split into the set's skeleton and draft, then its chrome and origin page.
- inc-086 (15 criteria) and inc-182 (14) are also large. inc-053, inc-054, inc-080, inc-125 and inc-181 have 13 each. Each could split along its page boundaries.
- 5 rows are dropped and still list requirements: inc-025 (req-271, out of scope), inc-049 (req-248, req-249, already met), inc-118 (req-787, already met), inc-119 (req-904, out of scope) and inc-162 (req-1299, now to pick up on the templates branch).

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Theme | Ready | Blocked | Touches | Lands after |
|---|---|---|---|---|
| journey-foundation | split off to `feat/EUDPA-691-design-release-2-1-journey-foundation` | split off | frontend:src/server/app/sets/live-animals/journeys/linear/flow; frontend:src/server/app/sets/live-animals/docs; frontend:fit; frontend:src/server/app/shared; frontend:src/client/javascripts/components/accessible-autocomplete.js; frontend:src/client/javascripts/components/status-announcer.js; insfrontend:src/server/app/shared; plantsfrontend:src/server/app/shared; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/flow; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/review; plantsfrontend:src/client/javascripts/components/accessible-autocomplete.js; tests:flows/animals; tests:flows/plants; tests:page-objects/shared/base-page.ts; tests:tests/animals/e2e/journeys/persistence; tests:tests/animals/e2e/journeys/promoted-notification.spec.ts; tests:tests/animals/e2e/journeys/horse-temporary-admission.spec.ts; tests:tests/animals/e2e/features/cph-scope.spec.ts; tests:tests/animals/e2e/features/soft-save.spec.ts | nothing: can start now |
| reference-lists | split off to `feat/EUDPA-692-design-release-2-1-reference-lists` | split off | frontend:src/server/app/services/_capture; frontend:src/server/app/services/countries; frontend:src/server/app/services/ports; insfrontend:src/server/app/services/countries; plantsfrontend:src/server/app/services/_capture; plantsfrontend:src/server/app/services/countries; plantsfrontend:src/server/app/services/ports; referencedata:src; stub:src/main/java/uk/gov/defra/trade/imports/stubs/mdm; stub:src/main/resources/responses; stub:src/test/java/uk/gov/defra/trade/imports/utils; tests:tests/animals/e2e/features/reference-lists; tests:domain/animals/constants/country-codes.ts | nothing: can start now |
| origin-page | inc-009, inc-010, inc-175 | none | frontend:src/server/app/sets/live-animals/journeys/linear/features/origin; frontend:src/server/app/sets/live-animals/obligations/sections/origin.js; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/origin; tests:tests/animals/e2e/features/country-of-origin-type-ahead.spec.ts; tests:tests/animals/e2e/pages/origin.spec.ts; tests:tests/animals/e2e/visual/origin-of-import.visual.spec.ts-snapshots; tests:page-objects/plants/origin-page.ts; tests:tests/plants/e2e/features/origin.spec.ts | reference-lists |
| commodities-and-reason | inc-011, inc-015, inc-018, inc-020, inc-021, inc-022 | inc-012, inc-013, inc-019, inc-023 | frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/search; frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details; frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/copy; frontend:src/server/app/sets/live-animals/journeys/linear/features/import-reason; frontend:src/server/app/sets/live-animals/journeys/linear/features/additional-details; frontend:src/server/app/sets/live-animals/services/commodities; frontend:src/server/app/sets/live-animals/obligations/sections/commodities; frontend:src/server/app/sets/live-animals/obligations/sections/arrival.js; frontend:src/server/app/sets/live-animals/obligations/sections/import-reason.js; perftests:src/config/test-data.js; perftests:src/k6/live-animals.js; tests:page-objects/animals/commodity-selection-page.ts; tests:page-objects/animals/consignment-details-page.ts; tests:page-objects/animals/import-reason-page.ts; tests:page-objects/animals/additional-details-page.ts; tests:tests/animals/e2e/pages/commodities.spec.ts; tests:tests/animals/e2e/pages/consignment-details.spec.ts; tests:tests/animals/e2e/pages/import-reason.spec.ts; tests:tests/animals/e2e/pages/additional-details.spec.ts; tests:tests/animals/e2e/features/reason-purpose-scope.spec.ts; tests:tests/animals/e2e/features/additional-details-scope.spec.ts; tests:tests/animals/e2e/journeys/poultry-rail-transit.spec.ts | journey-foundation |
| arrival-and-transit | inc-026, inc-027, inc-028, inc-029, inc-174 | none | frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/transit-countries; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status; tests:page-objects/animals/arrival-details-page.ts; tests:page-objects/animals/transited-countries-page.ts; tests:page-objects/plants/arrival-details-page.ts; tests:tests/animals/e2e/pages/arrival-details.spec.ts; tests:tests/animals/e2e/pages/transited-countries.spec.ts; tests:tests/animals/e2e/features/port-of-entry-select.spec.ts; tests:tests/animals/e2e/features/transit-means-scope.spec.ts | journey-foundation, reference-lists |
| documents | inc-031, inc-032, inc-033, inc-034, inc-035 | inc-036 | frontend:src/server/app/sets/live-animals/journeys/linear/features/documents; frontend:src/server/app/services/document-types; frontend:src/server/app/sets/live-animals/obligations/sections/documents.js; backend:src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument; tests:page-objects/animals/accompanying-documents-page.ts; tests:resources/file-upload; tests:tests/animals/e2e/features/documents-limits.spec.ts; tests:tests/animals/e2e/features/documents-refresh-no-js.spec.ts; tests:tests/animals/e2e/features/documents-reject.spec.ts; tests:tests/animals/e2e/features/documents-scan-lifecycle.spec.ts; tests:tests/animals/e2e/features/promoted-documents.spec.ts | journey-foundation |
| address-book | inc-059, inc-060, inc-061, inc-062, inc-063, inc-064, inc-065, inc-066, inc-067, inc-068, inc-069, inc-070, inc-071, inc-073, inc-077, inc-078, inc-079, inc-080, inc-082, inc-083, inc-084 | inc-072, inc-081 | addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/address; addressbook:docs; addressbook:src/main/resources; insfrontend:src/server/app/features/address-book/add; insfrontend:src/server/app/features/address-book/edit; insfrontend:src/server/app/features/address-book/list; insfrontend:src/server/app/features/address-book/view; insfrontend:src/server/app/features/address-book/delete; insfrontend:src/server/app/features/address-book/view-model; insfrontend:src/server/app/features/address-book/fit; insfrontend:src/server/app/features/address-book/copy; insfrontend:src/server/app/features/address-book/address-countries.js; insfrontend:src/server/app/features/address-book/address-id-params.js; insfrontend:src/server/app/features/address-book/fields.js; insfrontend:src/server/app/features/address-book/stored-address.js; insfrontend:src/server/app/features/address-book/handshake-context.js; insfrontend:src/server/app/features/address-book/success-banner.js; insfrontend:src/server/app/services/address-book; insfrontend:src/server/app/services/address-lookup; insfrontend:src/client/javascripts/address-book-filter.js; insfrontend:src/client/javascripts/address-book-success-banner.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/ins-handshake.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/address-book-entry; perftests:src/k6/front-door.js; perftests:src/k6/background-volume.js; perftests:src/lib/address-book.js; perftests:src/lib/address-book.test.js; perftests:src/lib/background-volume.js; perftests:src/lib/background-volume.test.js; perftests:src/config/background-volume.js; perftests:src/config/background-volume.test.js; perftests:src/config/smoke.js; perftests:src/config/smoke.test.js; tests:page-objects/ins/address-book; tests:tests/ins/e2e/features/address-book; tests:domain/shared/fixtures/e2e-address-book.ts; tests:domain/ins/models/db/address-document.ts; tests:adapters/http/address-book-api-client.ts; tests:tests/animals/e2e/features/address-book/addresses-add-handshake.spec.ts; tests:tests/animals/e2e/features/address-book/address-book-navigation.spec.ts | reference-lists |
| identification-and-permanent-address | inc-045, inc-046, inc-047, inc-048, inc-050, inc-054, inc-055, inc-056, inc-057, inc-058 | inc-051 | frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification; frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/evaluation.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/identification.fit.spec.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/AnimalIdentifier.java; tests:page-objects/animals/animal-identification-page.ts; tests:page-objects/animals/permanent-address-page.ts; tests:tests/animals/e2e/pages/animal-identification.spec.ts; tests:tests/animals/e2e/pages/permanent-address.spec.ts; tests:tests/animals/e2e/journeys/pet-cats-air-permanent-address.spec.ts | commodities-and-reason, journey-foundation |
| type-question-and-templates | split off to `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | split off | backend:src/main/java/uk/gov/defra/trade/imports/animals/template; frontend:src/server/app/sets/live-animals/journeys/linear/features/templates; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/template-review; frontend:src/server/app/sets/live-animals/journeys/linear/features/service-navigation.fit.spec.js; insfrontend:src/server/app/features/notification-type; insfrontend:src/server/app/features/dashboard/controller.js; insfrontend:src/server/app/features/dashboard/controller.test.js; insfrontend:src/server/app/features/dashboard/template.njk; insfrontend:src/server/app/features/dashboard/copy; insfrontend:src/server/app/features/dashboard/dashboard.fit.spec.js; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type; tests:page-objects/ins/dashboard-page.ts; tests:tests/animals/e2e/features/templates; tests:tests/ins/e2e/features/notification-type; tests:tests/animals/e2e/features/auth.spec.ts | arrival-and-transit, commodities-and-reason, journey-foundation |
| consignment-parties | inc-085, inc-086, inc-087, inc-088, inc-089, inc-090, inc-091, inc-092, inc-094, inc-095, inc-096, inc-097, inc-180 | none | frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/template.njk; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/party-inline.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/evaluation.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/frozen-parties.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/copy; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/fit; frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker; frontend:src/server/app/sets/live-animals/journeys/linear/features/cph-number; frontend:src/server/app/sets/live-animals/journeys/linear/features/contact; frontend:src/server/app/services/address-book; addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/service; insfrontend:src/server/app/features/address-book/journey-registry.js; plantsfrontend:src/server/app/services/address-book; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/address-book-picker; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/consignor-select; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/place-of-destination; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select; tests:page-objects/animals/addresses-page.ts; tests:page-objects/animals/party-picker-page.ts; tests:page-objects/animals/cph-number-page.ts; tests:page-objects/animals/contact-address-page.ts; tests:page-objects/plants/consignor-select-page.ts; tests:page-objects/plants/place-of-destination-page.ts; tests:page-objects/plants/consignment-contact-select-page.ts; tests:tests/animals/e2e/features/address-book/addresses-picker.spec.ts; tests:tests/animals/e2e/features/address-book/addresses-read-only.spec.ts; tests:tests/animals/e2e/pages/cph-number.spec.ts; tests:tests/animals/e2e/pages/contact-address.spec.ts; tests:tests/plants/e2e/features/contact.spec.ts; tests:tests/plants/e2e/features/destination.spec.ts; tests:tests/plants/e2e/features/parties.spec.ts | address-book, identification-and-permanent-address, journey-foundation |
| overview-and-review | inc-098, inc-100, inc-101, inc-102, inc-103, inc-104, inc-106, inc-107, inc-108, inc-109, inc-110, inc-111, inc-112, inc-113, inc-114, inc-115, inc-117, inc-187 | inc-116, inc-199 | frontend:src/server/app/sets/live-animals/journeys/linear/features/hub; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.fit.spec.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/template.njk; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/header; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/applicability.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/incomplete-cards.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/invalid-parties.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/declaration; frontend:src/server/app/sets/live-animals/journeys/linear/features/confirmation; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/Notification.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationDto.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationStatus.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationView.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationViewData.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java; insfrontend:src/server/app/features/dashboard/view-model; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/hub; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/declaration; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/confirmation; tests:page-objects/animals/declaration-page.ts; tests:page-objects/animals/notification-view-page.ts; tests:tests/animals/e2e/pages/declaration.spec.ts; tests:tests/animals/e2e/pages/notification-view-states.spec.ts; tests:tests/animals/e2e/features/hub-groups-and-cya-rows.spec.ts; tests:tests/animals/e2e/features/amend-resubmit.spec.ts; tests:tests/animals/e2e/features/address-book/addresses-copied.spec.ts; tests:tests/animals/e2e/features/address-book/addresses-edit.spec.ts; tests:tests/animals/e2e/features/address-book/addresses-submit-freeze.spec.ts | arrival-and-transit, identification-and-permanent-address |
| manage-notifications | inc-120, inc-121, inc-123, inc-124, inc-125, inc-201 | none | frontend:src/server/app/sets/live-animals/journeys/linear/features/amend; frontend:src/server/app/sets/live-animals/journeys/linear/features/cancel-amend; frontend:src/server/app/sets/live-animals/journeys/linear/features/delete-notification; frontend:src/server/app/sets/live-animals/journeys/linear/features/notification-actions; frontend:src/server/app/services/persistence/records/stub/lifecycle/create.js; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/amend; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification; perftests:src/k6/journeys.js; tests:page-objects/animals/notification-amend-page.ts; tests:page-objects/animals/notification-cancel-amend-page.ts; tests:page-objects/plants/delete-notification-page.ts; tests:tests/animals/e2e/features/cancel-amend-ui.spec.ts; tests:tests/animals/e2e/features/notification-actions-guards.spec.ts; tests:tests/animals/e2e/features/notification-delete.spec.ts | overview-and-review |
| animals-dashboard | inc-126, inc-129, inc-130, inc-131, inc-135, inc-136, inc-137, inc-138, inc-140, inc-147, inc-196 | inc-139, inc-142, inc-200 | frontend:src/server/app/sets/live-animals/journeys/linear/features/dashboard; frontend:src/server/app/services/persistence/records/real/lifecycle/read.js; frontend:src/server/app/services/persistence/records/stub/lifecycle/read.js; frontend:src/server/app/services/persistence/records/stub/list-query.js; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationRepository.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationSort.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationPageResponse.java; plantsfrontend:src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard; perftests:src/config/journey-endpoints.js; tests:page-objects/animals/dashboard-page.ts; tests:page-objects/plants/dashboard-page.ts; tests:domain/animals/constants/sort-by-values.ts; tests:tests/animals/a11y/notification-dashboard-viewports.spec.ts; tests:tests/animals/a11y/notification-dashboard-views.spec.ts; tests:tests/animals/e2e/features/notification-dashboard-search.spec.ts; tests:tests/animals/e2e/features/notification-dashboard-sort.spec.ts; tests:tests/animals/e2e/pages/notification-dashboard-pagination.spec.ts; tests:tests/animals/e2e/pages/notification-dashboard.spec.ts; tests:tests/animals/security/frontend-dashboard-params.spec.ts; tests:tests/plants/e2e/features/dashboard.spec.ts | manage-notifications, overview-and-review, type-question-and-templates |
| transporters | inc-043 | inc-008, inc-037, inc-038, inc-039, inc-040, inc-041, inc-042, inc-044, inc-074, inc-075, inc-076 | frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/transporters; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/transporters-select; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/transporter-add; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/private-transporter-details; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/commercial-transporter-details; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/transporter-details-save.js; frontend:src/server/app/sets/live-animals/journeys/linear/features/transport/fit; frontend:src/server/app/services/transporters; frontend:src/server/app/services/address-lookup; insbackend:src/main/java/uk/gov/defra/trade/imports/ins/backend/addresslookup; stub:src/main/java/uk/gov/defra/trade/imports/stubs/federated; stub:src/test/java/uk/gov/defra/trade/imports/stubs/federated; tests:page-objects/animals/transporter-page.ts; tests:page-objects/animals/transporter-add-page.ts; tests:page-objects/animals/private-transporter-page.ts; tests:page-objects/animals/commercial-transporter-page.ts; tests:page-objects/animals/transporter-selection-page.ts; tests:tests/animals/e2e/pages/transporter.spec.ts; tests:tests/animals/e2e/pages/transporter-add.spec.ts; tests:tests/animals/e2e/pages/transporter-selection.spec.ts; addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/transporter; insfrontend:src/server/app/features/address-book/transporter; tests:tests/ins/e2e/features/transporters | address-book, documents, journey-foundation, reference-lists |
| germinal-products | inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-141, inc-172, inc-176, inc-177, inc-178, inc-179, inc-181, inc-182, inc-183, inc-184, inc-185, inc-186 | inc-191 | frontend:src/server/app/sets/germinal-products; frontend:src/server/app/routes-germinal-products.js; frontend:src/server/app/routes.js; frontend:src/server/router.js; frontend:src/server/app/services/persistence/records/notification-mapper; frontend:src/server/app/services/persistence/records/real/lifecycle/mutate.js; frontend:playwright.config.js; frontend:vitest.config.js; frontend:webpack.config.js; frontend:package.json; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/Species.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/Commodity.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/CommodityComplement.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationFulfilmentsView.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/notification/SaveNotificationDto.java; backend:src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag; tests:page-objects/shared/sets.ts; tests:page-objects/germinal-products; tests:tests/animals/e2e/germinal-products; tests:tests/animals/a11y/germinal-products; tests:tests/animals/security/germinal-products | animals-dashboard, arrival-and-transit, commodities-and-reason, consignment-parties, documents, identification-and-permanent-address, journey-foundation, manage-notifications, origin-page, overview-and-review, type-question-and-templates |
| ins-dashboard | none | inc-128, inc-132, inc-133, inc-134, inc-143, inc-144, inc-145, inc-146 | insbackend:src/main/java/uk/gov/defra/trade/imports/ins/backend/notification; insbackend:src/main/resources; insfrontend:src/server/app/features/action-needed; insfrontend:src/server/app/features/status-updated; insfrontend:src/server/app/features/inspection-required; insfrontend:src/server/app/features/notification-list; insfrontend:src/server/app/services/ins-backend; perftests:src/k6/pages.js; perftests:src/k6/readiness.js; perftests:src/config/endpoints.js; tests:page-objects/ins/notification-list-page.ts; tests:tests/ins/e2e/features/overall-dashboard; tests:tests/ins/e2e/features/action-needed; tests:tests/ins/e2e/features/inspection-required; tests:tests/ins/e2e/features/status-updated; tests:tests/ins/e2e/features/notification-list; tests:tests/ins/e2e/features/notification-dashboard-navigation.spec.ts | animals-dashboard, germinal-products, type-question-and-templates |
| waiting-on-design | none | inc-014, inc-030, inc-093, inc-188, inc-189, inc-190, inc-192, inc-193, inc-194, inc-195, inc-197, inc-198 | frontend:src/client/javascripts/enhancements; frontend:src/client/javascripts/components/commodity-search.js; frontend:src/client/javascripts/components/cph-number-input.js; frontend:src/client/javascripts/components/confirmation-dialog.js; frontend:src/client/stylesheets/components/_confirmation-dialog.scss; insfrontend:src/client/javascripts/address-search.js; insfrontend:src/client/javascripts/enhancements; plantsfrontend:src/client/javascripts/enhancements; tests:tests/animals/e2e/enhancements; tests:tests/ins/e2e/enhancements; tests:tests/plants/e2e/enhancements | address-book, arrival-and-transit, commodities-and-reason, consignment-parties, germinal-products, journey-foundation, manage-notifications, origin-page, transporters, type-question-and-templates |

Every row sits in a theme. The 5 dropped rows sit in arrival-and-transit (inc-025), identification-and-permanent-address (inc-049), overview-and-review (inc-118, inc-119) and waiting-on-design (inc-162).

**Cross-theme dependencies:**

- inc-008 (transporters) on inc-173 (reference-lists): the private transporter's country list reads the tidied MDM stub.
- inc-012, inc-015, inc-019, inc-021 (commodities-and-reason) on inc-001 (journey-foundation): the reorder sets the step order they chain into and walk.
- inc-022 (commodities-and-reason) on inc-003 (journey-foundation): the soft save it uses lands there.
- inc-014 (waiting-on-design) on inc-013 (commodities-and-reason) and inc-016 (germinal-products): as-you-type search enhances both sets' server search.
- inc-016, inc-017 (germinal-products) on inc-011, inc-018 (commodities-and-reason): the germinal copies start from the reworded live-animals pages and hard stops.
- inc-024 (germinal-products) on inc-015, inc-020, inc-021, inc-022 (commodities-and-reason): the germinal opening run copies the live-animals reason page and order.
- inc-028, inc-029 (arrival-and-transit) on inc-002, inc-003 (journey-foundation): overview returns and soft save.
- inc-030 (waiting-on-design) on inc-029 (arrival-and-transit): the JavaScript enhances the finished transit page.
- inc-034 (documents) on inc-001, inc-002 (journey-foundation): where documents returns depends on the new order and overview returns.
- inc-043 (transporters) on inc-001 (journey-foundation) and inc-031 (documents): the run goes on to Upload documents, which must open early.
- inc-045, inc-054, inc-058 (identification-and-permanent-address) on inc-001 (journey-foundation); inc-045 also on inc-015 (commodities-and-reason): identification follows Commodity details in the new chain.
- inc-051 (identification-and-permanent-address) on inc-012 (commodities-and-reason): pigs, sheep and goats need the MDM catalogue.
- inc-052, inc-053 (germinal-products) on inc-045, inc-046, inc-047, inc-050 (identification-and-permanent-address): germinal identification copies the live-animals page.
- inc-074, inc-075, inc-076 (transporters) on inc-061, inc-066, inc-067, inc-069 (address-book): the transporter tab and hand-over sit in the redesigned address book.
- inc-082 (address-book) on inc-173 (reference-lists): the Country select reads the tidied stub.
- inc-087 (consignment-parties) on inc-059 (address-book): role filtering needs the record's type and uses.
- inc-090 (consignment-parties) on inc-066 (address-book): the View link needs the return path.
- inc-092, inc-094, inc-096 (consignment-parties) on inc-001, inc-002 (journey-foundation); inc-094, inc-096, inc-097 also on inc-054 (identification-and-permanent-address): continuation and section display follow the new order and the permanent address page.
- inc-095 (consignment-parties) on inc-061, inc-070, inc-080 (address-book): adding a branch goes through the new add pages.
- inc-097 (consignment-parties) on inc-004, inc-122 (journey-foundation): amend endings and the Amend bar.
- inc-093 (waiting-on-design) on inc-091 (consignment-parties): the CPH JavaScript enhances the finished CPH page.
- inc-100, inc-103 (overview-and-review) on inc-028 (arrival-and-transit): transit applies only once means of transport is required.
- inc-105 (germinal-products) on inc-104, inc-106 (overview-and-review): the germinal review copies the reworked review.
- inc-108 (overview-and-review) on inc-054 (identification-and-permanent-address): the Addresses card shows permanent addresses.
- inc-120, inc-124 (manage-notifications) on inc-112 (overview-and-review); inc-121 on inc-110: the view header and review endings carry the actions.
- inc-201 (manage-notifications) on inc-113 (overview-and-review): "Submitted action required" is recorded at submit.
- inc-126 (animals-dashboard) on inc-110 (overview-and-review) and inc-120, inc-121, inc-125 (manage-notifications): it proves deleting an amending notification.
- inc-128 (ins-dashboard) on inc-149, inc-153 (type-question-and-templates): the overall home keeps today's Create new and Use template.
- inc-131, inc-147 (animals-dashboard) on inc-113 (overview-and-review); inc-147 also on inc-106: action required is recorded at submit.
- inc-132 (ins-dashboard) on inc-131, inc-147 (animals-dashboard): the drill-down lists what the backend marks as action needed.
- inc-141, inc-172 (germinal-products) on inc-129, inc-130, inc-135, inc-136, inc-137, inc-138, inc-140, inc-196 (animals-dashboard): the germinal list copies the finished reframe.
- inc-145 (ins-dashboard) on inc-141 (germinal-products): the home's germinal section links to the germinal list.
- inc-162 (waiting-on-design, dropped) on inc-157 (type-question-and-templates): a sort needs saved templates.
- inc-174 (arrival-and-transit) and inc-175 (origin-page) on inc-173 (reference-lists): both lists read the tidied stub.
- inc-176 (germinal-products) on inc-001, inc-002 (journey-foundation), inc-010 (origin-page), inc-148, inc-150 (type-question-and-templates), inc-098, inc-100 (overview-and-review), inc-129, inc-130, inc-135 (animals-dashboard): the germinal set copies each finished live-animals page.
- inc-177 (germinal-products) on inc-018 (commodities-and-reason): it adds germinal checks beside the hard stops.
- inc-179 (germinal-products) on inc-031 to inc-035 (documents): its documents page copies the finished one.
- inc-180 (consignment-parties) on inc-080 (address-book): the germinal journey's add uses journey mode.
- inc-181 (germinal-products) on inc-091 (consignment-parties) and inc-054 (identification-and-permanent-address): it leaves out pages those rows make.
- inc-182 (germinal-products) on inc-026 to inc-029 (arrival-and-transit), inc-094, inc-095, inc-097 (consignment-parties), inc-110 to inc-115 (overview-and-review) and inc-018 (commodities-and-reason): the germinal journey copies each finished page.
- inc-185 (germinal-products) on inc-120, inc-121, inc-123, inc-124, inc-125 (manage-notifications), inc-122 (journey-foundation), inc-126 (animals-dashboard): germinal lifecycle actions copy the finished ones.
- inc-186 (germinal-products) on inc-150, inc-151, inc-154 to inc-161, inc-164, inc-165 (type-question-and-templates): germinal templates reuse the template mode.
- inc-188, inc-189, inc-190 (waiting-on-design) on inc-009, inc-010 (origin-page); inc-188 also on inc-027 (arrival-and-transit): each enhances a finished page.
- inc-191 (germinal-products) on inc-012 (commodities-and-reason): both wait on the MDM catalogue.
- inc-192 (waiting-on-design) on inc-053 (germinal-products): the calendar enhances the germinal date inputs.
- inc-193 (waiting-on-design) on inc-087 (consignment-parties), inc-069 (address-book), inc-181 (germinal-products): live filtering enhances each server search.
- inc-194 (waiting-on-design) on inc-072, inc-081 (address-book) and inc-042 (transporters): its JavaScript enhances the no-JavaScript address searches.
- inc-195 (waiting-on-design) on inc-120, inc-121 (manage-notifications), inc-122 (journey-foundation), inc-185 (germinal-products): pop-ups would replace the finished confirmation pages.
- inc-196 (animals-dashboard) on inc-151 (type-question-and-templates): "Use template" needs Manage templates.
- inc-197 (waiting-on-design) on inc-089 (consignment-parties) and inc-181 (germinal-products): the live row filter enhances both place of origin pickers.

## For the split branches

Each branch below adds or changes rows in its own backlog for these requirements. Only type-question-and-templates has work to pick up. journey-foundation and reference-lists have none.

### type-question-and-templates

Branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates`, backlog `shared/design-release-2-1/themes/type-question-and-templates/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|
| req-1299 | New since the split. Blocked on design question 11; inc-162 here is dropped | Manage templates gets a sort control only as design answers design question 11 (templates sort): either a GET form whose button really reorders the list, with the options design names, or nothing, in which case this requirement is dropped. Design Release 2.1's inert 'Sort by:' select (Select one, Newest first, Oldest first, Arrival date, outside any form and reordering nothing) is not built. |
| req-2107 | New since the split | While a trader is creating or changing a live animals or germinal products template, each party picker's 'Add a new address' round trip and each role's 'Edit details' page work as they do in a notification, on the same pages: the handshake identifies the template being worked on, saving or cancelling on the INS add page returns to that template's own picker or Consignment addresses page with the template's answer set as it would be for a notification, and an edit changes only the template's copy, never the address book record. Nothing returns the trader to a notification. |
| req-2048 | Changed since the split | Template mode is another way of walking each set's own journey pages, in the live-animals and germinal products sets only: a template is answered on the same pages, with the same questions and the same stored answers as a notification, with no copied template pages and no forked journey, so a later change to a journey page reaches template mode with no rework. Creating a template skips the upload documents and declaration steps. A page opened from a template's review, once saved, saves the template (never a draft notification) and returns to that template's review, and shows only a primary 'Save and return' and a 'Cancel' link to the template, an ending that takes precedence over the amend ending. Template mode is told apart by the service's own state, not by a from=template-review marker or /templates paths. It works on the pages as they stand when it is built, including today's transporter list buttons, and does not wait for other themes to change how those pages look or are ordered. |
| req-814 | Changed since the split | When the hub is showing a template being created, the status tag reads 'Template' and the template's name is shown beside it in place of a notification reference. The shared status strip is not changed for this: in template mode the hub switches the shared strip off and draws this header in the set's own hub template. |
| req-1344 | Changed since the split | A template saves the notification's country and region of origin, internal reference, commodity codes, common names and species, reason for import, purpose in the market, certified for, unweaned animals, storage temperature, animal and package totals and per-species numbers, commodity selections, net weight, package type, animal identification details, port of entry, means of transport, transport identification, transport document reference, the transporter's name, address, country, approval number and type, and the CPH number. |
| req-1345 | Changed since the split | A template never holds an arrival date or time, including after a section of an existing template is changed and saved. |
| req-543 | Changed since the split | While a trader is creating a template, Upload documents is not offered: the one journey's template mode skips the page and its overview has no Documents task to follow. The skip lives in the shared journey flow, not in a copied or forked template journey. No guard on the page's own address is required. |
| req-1917 | Changed since the split | In the high-risk plants frontend, a journey page's Back link, the origin page's included, follows the context it was opened in, as in live animals (req-1616): to the overview when opened from the overview, and otherwise in the opening run to the previous page in plants' own step order. Back from plants' first page stays as it is, because plants' first page is its own commodity type question; no plants page's Back link goes to the INS type question, which is animals only. Plants pages get no template mode. |

Questions c-308 and c-318 also shape this branch's template-mode rows. Their defaults are under Questions for Sam.

## Where the requirements came from

- 15,423 claims were taken from 23 sources. 15,306 held, 117 were dropped as refuted and 739 were added as missed.
- Reconcile weighed 22 areas apart: start and origin, commodities, reason and additional details, animal identification, germinal products, arrival and transit, transporters, documents, consignment parties, party address add and edit, CPH and contact, notification hub, review and submit, dashboard home, notification list, address book list, address book add and edit, templates, manage notifications, notification record, journey flow, layout and sign-in.
- 2,021 requirements were made. 1,818 are adopted: 955 to build (477 new, 478 changes) and 863 already in place. 4 are questions and 199 are out of scope.
- The backlog covers all 955 to build: 795 in this backlog's ready or blocked rows and 160 on the split branches. 182 of the 795 sit in blocked rows. inc-129 also carries req-2029, the default of question 2.
- 15,894 of the 16,045 working-set claims are cited by a requirement or a conflict.

| Source | Rank | Claims | Held | Dropped | Added | Cited | Requirements backed (in scope) |
|---|---|---|---|---|---|---|---|
| ruling:sam-2026-10-09-pm | 1 | 302 | 301 | 1 | 5 | 275 of 306 | 514 (474) |
| ruling:sam-2026-10-09-templates | 2 | 52 | 52 | 0 | 0 | 49 of 52 | 72 (65) |
| ruling:sam-2026-10-09 | 3 | 200 | 199 | 1 | 2 | 198 of 201 | 347 (309) |
| ruling:sam-2026-10-07 | 4 | 23 | 23 | 0 | 0 | 14 of 23 | 68 (62) |
| confluence:6497338582 | 5 | 109 | 109 | 0 | 5 | 114 of 114 | 30 (28) |
| document:dr1-parity-notes | 6 | 88 | 88 | 0 | 1 | 89 of 89 | 56 (44) |
| document:dr1-parity-backlog | 7 | 481 | 481 | 0 | 64 | 534 of 545 | 172 (148) |
| prototype:dr2-1-source | 8 | 1,705 | 1,683 | 22 | 81 | 1,760 of 1,764 | 1,144 (1,071) |
| trace:prototype-dr2-1 | 9 | 1,791 | 1,784 | 7 | 85 | 1,786 of 1,869 | 1,036 (976) |
| prototype:dr2-1-specs | 10 | 1,003 | 998 | 5 | 8 | 1,005 of 1,006 | 632 (601) |
| repo:backend | 11 | 688 | 683 | 5 | 26 | 709 of 709 | 181 (161) |
| repo:insbackend | 12 | 132 | 132 | 0 | 8 | 140 of 140 | 4 (0) |
| repo:addressbook | 13 | 339 | 336 | 3 | 12 | 348 of 348 | 45 (43) |
| repo:referencedata | 14 | 98 | 96 | 2 | 5 | 101 of 101 | 17 (15) |
| repo:stub | 15 | 130 | 130 | 0 | 6 | 136 of 136 | 15 (12) |
| repo:frontend | 16 | 1,852 | 1,843 | 9 | 97 | 1,940 of 1,940 | 848 (823) |
| repo:insfrontend | 17 | 638 | 638 | 0 | 31 | 669 of 669 | 185 (176) |
| repo:plantsfrontend | 18 | 1,079 | 1,073 | 6 | 67 | 1,136 of 1,140 | 260 (223) |
| repo:tests | 19 | 907 | 897 | 10 | 39 | 936 of 936 | 421 (404) |
| repo:perftests | 20 | 145 | 143 | 2 | 19 | 162 of 162 | 54 (51) |
| trace:animals-fit | 21 | 1,948 | 1,921 | 27 | 81 | 2,002 of 2,002 | 779 (755) |
| trace:ins-fit | 22 | 250 | 248 | 2 | 27 | 275 of 275 | 114 (111) |
| trace:e2e | 23 | 1,463 | 1,448 | 15 | 70 | 1,516 of 1,518 | 790 (760) |

- Every source backs at least one requirement. No source's cited share is under a tenth. The lowest is Sam's 7 October ruling, 14 of 23; later rulings narrow its uncited claims.
- The INS backend backs 4 requirements, none in scope. Its read model stays off the list's path (req-1097, req-1104, req-1105, req-1855). Conflicts cite most of its claims.
- Strongest: 10 requirements rest on 10 sources each. They are req-106 (Selected commodities rows), req-509 (50MB files), req-564 ("Consignor"), req-588 and req-597 (party pickers and their count), req-608 (role-filtered pickers), req-1032 (the list stays at the set root), req-1410 and req-1415 (cancel amendment), and req-1676 (the Dashboard navigation item).
- Weakest: 204 adopted requirements rest on one source. Most are today's code staying as it is: the animals backend (65), plants frontend (28) and the prototype source (22) lead.
- 50 of those single-source requirements are to build: req-058, req-183, req-184, req-267, req-328, req-375, req-610, req-714, req-745, req-757, req-791, req-815, req-817, req-818, req-1013, req-1014, req-1022, req-1023, req-1081, req-1103, req-1127, req-1185, req-1187, req-1208, req-1262, req-1279, req-1294, req-1301, req-1326, req-1332, req-1336, req-1344, req-1359, req-1365, req-1367, req-1372, req-1378, req-1404, req-1430, req-1751, req-1752, req-1785, req-1789, req-1799, req-1806, req-1856, req-1870, req-2002, req-2052, req-2103.
- Confirm before passing this on:
  - req-374 counts as in place on the DR1 backlog and the prototype source alone, with no claim from today's code.
  - req-1858 counts as in place on the prototype source alone.
  - req-1488 and req-2050 count as in place on rulings alone.

## Out of scope

### Reference-list content, handed to MDM

- req-026 Guernsey, Jersey and Isle of Man added to the country of origin list.
- req-027 Ceuta and Melilla added to the country of origin list.
- req-028 The country of origin list limited to the EU, its territories and the crown dependencies.
- req-029 List entries renamed to the prototype's spellings.
- req-302 The port of entry list made Design Release 2.1's own (duplicates are in MDM's data).
- req-303 Port names spelt correctly (misspellings are in MDM's data).
- req-1766 The destination country list edited to Design Release 2.1's 41 entries.
- req-1767 An exit-only list of animal-approved border control posts (MDM carries no such flag).
- req-1818 The private transporter's country list gaining the prototype's outermost regions and territories.

### Search mechanics the real component replaces

- req-017 The country results list opening only once the user types.
- req-019 Matching anywhere in a name, with bold matches.
- req-299 Bold matches in the port and place of landing results (c-284).
- req-1908 The country box's look and the autocomplete's rollout, which are EUDPA-635's.

### Other notification types

- req-059 Non-live-animals types running through the live-animals pages.
- req-1668 Plants for planting, potatoes and wood products journeys in the animals frontend.
- req-1764 Choosing a commodity for the plants types.

### URL paths, field names and data shapes the prototype does not decide

- req-271 Arrival details moving to "arrival-details".
- req-465 A durable transporter register service designed from the prototype.
- req-477 Documents moving to "upload-documents".
- req-626 The prototype's party page paths.
- req-629 An add-address page inside the live-animals journey.
- req-821 A separate header-less journey review route.
- req-1016 A /dashboard redirect.
- req-1128 Legacy category values as aliases.
- req-1341 Saving over a template being edited in whole-template mode.
- req-1342 Template ids built from titles.
- req-1355 A POST to a template's page.
- req-1357 The template section allow-list redirect.
- req-1362 The whole-template edit mode.
- req-1366 A notification recording its template's id.
- req-1742 How the prototype starts a notification internally.
- req-1829 The prototype's form field names on the pickers.
- req-1846 The prototype's template guards on the declaration.

### Prototype mechanics, seed data and defects

- req-189 The /prototype/reason-for-import seed route.
- req-190 Disabled guards, a fixed fallback reference and other prototype artefacts.
- req-383 The guidance link's analytics linker parameter.
- req-410 The old /transport-details redirect.
- req-419 The Commercial option's hint left unannounced.
- req-438 Add pages' titles unchanged in the error state.
- req-469 The prototype's custom transporter classes.
- req-471 Type-page errors that linger on the transporter list.
- req-625 The prototype's demonstration addresses on the pickers.
- req-627 Change links without the visually hidden party name.
- req-750 The prototype's own permanent-address routing.
- req-751 Custom classes on the contact and permanent address pages.
- req-776 The prototype's 3 seeded branch addresses.
- req-819 A hub "Save template" button from outside Design Release 2.1.
- req-946 The prototype's bespoke review markup.
- req-947 The version mount, static example notifications and references.
- req-1017 The prototype's design-release index page.
- req-1018 Fixed glance counts and seeded notifications.
- req-1106 Seeded list notifications and faked states.
- req-1107 A list with no category.
- req-1189 Seeded demonstration address book records.
- req-1286 The never-reached address usage page.
- req-1287 The root "Add address details" lookup page.
- req-1384 The /design-release-2.1 mount and session rule.
- req-1385 A template Cancel link without the release prefix.
- req-1386 The unguarded discard post.
- req-1387 A seeded template's region code changing on re-save.
- req-1486 Session keys, modifier classes and other prototype internals.
- req-1665 The version mount and session mechanics.
- req-1666 Seed shortcuts and fixtures.
- req-1667 Mount leaks in links.
- req-1681 The prototype's service index.
- req-1682 Prototype kit tooling in the footer.
- req-1847 The view title with no page name.

### Set aside by a conflict, a ruling or an accessibility duty

- req-713 Automatic focus moves between CPH boxes (accessibility duty).
- req-904 A fallback warning no real case can show.
- req-952 Changes to today's INS notifications table, which waits for the blocked overall home.
- req-959 A Messages link and unread count.
- req-1003 Status-updated sections Design Release 2.1 never renders.
- req-1035 A Back link from a list to the overall home (c-298).
- req-1087 A held, show-once success message (c-252).
- req-1097 The INS read model's part of the list rows.
- req-1104 The INS list API's bad-request answer.
- req-1150 Address book changes held only in the session (c-172).
- req-1170 The view page showing addresses from outside the book (c-173).
- req-1388 Session-only template storage and seeded templates (c-183).
- req-1389 Saving a template by GET (c-188).
- req-1855 The INS read model recording the category from events (c-296).
- req-1887 The category on every outbox event (c-272).
- req-1920 Commodity details for a mixed consignment (c-280).
- req-1961 Transporter rows linking to the saved-address page, re-distilled with transporters.

### Germinal data left out

- req-1802 Publishing germinal details PIMS has no field for, which is EUDPA-686.
- req-1803 An approved establishment, de-scoped in V4.
- req-1804 A package type, de-scoped in V4.
- req-1805 A k6 journey for the germinal set.

### DR1 rows that are not requirements

- req-192 DR1's open test-contract actions on the reveal move.
- req-369 Disabling, not removing, the search at the 12-country cap.
- req-555 DR1's open follow-ups on the documents page.
- req-1031 DR1's "At a glance" band.
- req-1190 DR1's own address book screens.
- req-1288 DR1's seven address types.
- req-1734 DR1 judgements meeting no Design Release 2.1 difference.
- req-1883 DR1 work for the delete and amend journeys.
- req-1956 Full-width party pickers (DR1 inc-064).
- req-2082 How the DR1 build run was organised.

### Weighed in another area

- req-198 The phase banner on the reason pages.
- req-266 DR1's permanent-address rows on the identification page.
- req-270 CPH behaviour and commodity removal seen from identification.
- req-482 The phase banner on the documents page.
- req-552 How documents show on the review page.
- req-949 Other areas' claims in the review area's working set.
- req-1028 The category lists' own content, seen from the home.
- req-1029 The confirmation, view and declaration pages, seen from the home.
- req-1030 The address book pages, seen from the home.
- req-1564 A backend list API test gap, which is the list area's.
- req-1778 Germinal identification rows on the review.
- req-1779 The germinal copy of the identification page.
- req-1816 The exit border control post, asked on the reason page.
- req-1817 A transporter blank save, seen from arrival details.
- req-2038 Origin, banner and navigation seen from list traces.
- req-2081 One page's own content, seen from the journey flow area.
- req-2106 Pages next to roles and addresses and the pickers, built in their own areas.
- req-2118 The navigation's items and order, carried by req-965.
- req-2119 The Alpha phase banner, carried by req-956.
- req-2121 The plants set's own engine and test wiring, weighed by the journey-flow and plants rows.

### Welsh sign-off

- req-376 Welsh for arrival details and transit countries.
- req-475 Reviewed Welsh on the transporter pages.
- req-554 Welsh on the documents page.
- req-948 Welsh on the review, declaration and confirmation pages.

### Plants keeps its own, or plants has parked it

- req-1921 Plants' commodity type page.
- req-1922 Plants' commodities list.
- req-1923 Plants' per-line Commodity details.
- req-1924 Plants' commodity vocabulary, origin constraints and obligations.
- req-1925 The reason and additional details rows in plants.
- req-1926 Identification changes in plants.
- req-1955 Plants' identification numbers page.
- req-1962 Plants in the add-address round trip.
- req-1972 Plants' optional Consignment Number and a parked reading.
- req-1981 Plants' Overview status tags.
- req-1982 Plants' Overview gating.
- req-1983 Plants' "Check and submit" group.
- req-1984 Plants' Overview Back link.
- req-1985 Plants' Overview groups, rows and headings.
- req-1994 Plants' re-submitting heading, which needs the plants backend (deferred.md).
- req-2003 Copy as new on plants' headers.
- req-2025 Inspector-side live access to a plants record.
- req-2047 Address book add and edit changes in plants.
- req-2055 Copy as new in plants.
- req-2056 Plants' parked post-submission policy.
- req-2059 A type-code prefix on plants references.
- req-2062 The plants backend's expiry and retention of plants notifications.
- req-2063 Plants' retention, lawful basis and privacy notice.
- req-2064 A richer plants status vocabulary.
- req-2075 Behaviours the plants rulings ledger parks.
- req-2095 Plants' parked chrome decisions.
- req-2096 A plants eligibility checker or before-you-start page (plants decision d-071).
- req-2104 Plant health authority routing and its "What happens next" sentence (plants decision d-011).
- req-2110 Inspector-side live access and the late indicator in the plants backend's record (plants decisions d-066, d-007).
- req-2116 Publishing plants notifications, and a plants backend mapper for every SI matter (plants decision d-047).

### Problems for the owning teams

Security findings, named only. The detail is in the programme's local files.

| Requirement | Finding | Owner |
|---|---|---|
| req-553 | Document endpoint checks | Animals backend team |
| req-1154 | Address book trust boundary | Address book team and platform |
| req-1283 | Edit page caching headers | INS frontend team |
| req-1482 | Soft delete authorisation | Animals backend team |
| req-1556 | Notification endpoint authorisation | Animals backend team |
| req-1717 | Security headers and cookies | Frontend teams |
| req-1730 | INS dashboard organisation scoping, with an existing security ticket | INS frontend team |

Other problems, reported to their owners:

- req-193 Tests repo data holds certification purposes the page does not offer.
- req-377 The E2E set-up can time out when the commodity search fails.
- req-396 No approval step or consequence for a "New" transporter.
- req-1105 Read-model defects and operational details.
- req-1191 Address book service test gaps.
- req-1481 Delete, cancel amendment and Amend do not check the version the trader opened.
- req-1483 Most writes are not audited.
- req-1484 Backend edge cases answer with server errors.
- req-1485 The place of destination picker's search failing with HTTP 500.
- req-1538 The backend README's test description.
- req-1555 Save and outbox not written together.
- req-1563 A misleading soft-delete controller test.
- req-1573 A poison event blocking later events.
- req-1575 No test that lifecycle events reach SNS.
- req-1578 Replay misreporting failures.
- req-1582 Unproven PIMS Dynamics columns.
- req-1584 No spec of the outbox event's contents.
- req-1587 exchangedDocument.issuer never filled.
- req-1591 The internal market purpose missing from GBN-AG.
- req-1594 Unconfirmed GBN-AG code mappings.
- req-1602 GBN-AG payload gaps.
- req-1603 GBN-AG mapping edge cases.
- req-1718 The Defra ID stub's own pages.
- req-1724 Gaps in today's accessibility proof.
- req-1726 Gaps in today's security scan.
- req-1733 INS frontend documentation and dependency drift.
- req-1759 Unsaved quantities lost on Remove.
- req-1873 Address lookup simulator test gaps.
- req-2108 Plants' review contact card re-reads the address book instead of the saved copy, unlike its own decision d-013.
- req-2109 Plants check answers, declaration and confirmation fit tests that today's suite lacks.

### Nothing designed, or nothing to build

- req-065 Moving other reference lists into the reference data service.
- req-191 A check between the main reason and certification purpose.
- req-378 Transit sending a review user to transporter details.
- req-1289 The EUDPA-390 lookup spike page, left as it is.
- req-1290 The INS frontend's unused shared validators.
- req-1609 Persistence traces that do not record Mongo reads.
- req-1669 What the Design Release 2.1 traces and specs do not exercise.
- req-1670 What today's traces and tests do not show.
- req-1671 Suite fixture data and driving mechanics.
- req-1765 Prototype data the commodity pages never show.

## Terms used

| Term | Meaning |
|---|---|
| Amend bar | The status bar shown during an amendment, with "Cancel amend" |
| axe | The automated accessibility checker the suites run |
| BE | Backend repo |
| CDP | Core Delivery Platform, where the services run |
| CPH | County parish holding number |
| CSRF | Cross-site request forgery protection on form posts |
| deferred.md | The programme's list of work left out because it needs a repo outside the programme |
| DR1 | Design Release 1 parity programme and its judgements |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| E2E | End-to-end tests and traces from the tests repo |
| FE | Frontend repo |
| fit | A frontend's own browser tests and their traces |
| GBN-AG | The animals notification type and its published payload |
| GBNAG_SPS_EX | The MDM country block the animals journey uses |
| INS | Import Notification Service front door and backend |
| ITAHC | Intra-trade animal health certificate |
| k6 | The load-testing tool the performance suite uses |
| Lands after | The rows that must land before a row builds |
| MDM | Master Data Management, the source of reference lists |
| MoJ | Ministry of Justice design system |
| PIMS Dynamics | The authorities' case system that receives notifications |
| Read model | The INS backend's copy of notifications for the dashboard |
| Review point | Where the build loop stops for Sam before building on |
| Set root | A set's landing page, such as /live-animals |
| Split branch | A theme split off early, with its own backlog on its own branch |
| Theme | A group of increments touching its own code, built on its own branch |
| typeCode | The GBN-AG code naming what a trade line is |
| V4 | Live Animals and Germinals Data Fields, version 4 (Confluence page 6497338582) |
| WCAG | Web Content Accessibility Guidelines |

