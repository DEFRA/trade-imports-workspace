# Design Release 2.1: backlog report

## Summary

- The backlog has 40 increments: 37 to build, 2 blocked and one dropped. Of the 37, 11 are ready now and 26 wait on earlier rows.
- It brings the live-animals journey, the address book and transporters to Design Release 2.1. It also adds templates and builds the new dashboard in the INS frontend.
- 14 questions are open. Each has a default, so building can start without an answer.
- Before building, correct the goal in `sources.json` (see step 0).
- Three things wait on people outside the loop. The CDP ingress cap (EUDPA-518) blocks inc-009. Master data for live-animal commodities blocks inc-010. The CDP address-lookup credentials in cdp-app-config, which only Sam changes, gate inc-025 in CDP.

## Before you build: step 0

**Correct the goal in `sources.json`.** It says every real service "changes to match" Design Release 2.1 (DR2.1) wherever it differs. Sam's ruling of 7 October 2026 narrows that. The goal should read:

> Bring the real GB notification services (the live-animals journey, its dashboard, templates and address book) up to Design Release 2.1. The real services change to match it, except where a DR1 judgement on that same difference, or a real constraint the prototype cannot express, overrides it.

A real constraint means persistence, validation, authentication or cross-service behaviour. The backlog already follows the ruling. Only the stated goal is out of date.

## Decisions the pipeline made

**Repos (7).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|
| `frontend` | trade-imports-animals-frontend | The live-animals journey pages, template pages and template mode |
| `backend` | trade-imports-animals-backend | The copy rule, action required on submission, template storage, the submitted date |
| `insfrontend` | trade-imports-ins-frontend | The DR2.1 dashboard, the address book and the journey add-address page |
| `insbackend` | trade-imports-ins-backend | The dashboard read model, organisation scoping, list queries and the address lookup |
| `addressbook` | trade-imports-address-book | Address uses, transporter entries, search and field messages |
| `referencedata` | trade-imports-reference-data | The live-animal commodity list from master data (inc-010, blocked) |
| `tests` | trade-imports-ins-tests | The end-to-end proof for every row |

Read but not changed: the DR2.1 prototype (`defra-design/GB-notification-service` at commit 04a073b) and trade-imports-stub. cdp-app-config holds the CDP lookup credentials, and only Sam changes it.

**Which source wins a disagreement**, highest first:

1. Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`)
2. The DR1 parity programme notes (`document:dr1-parity-notes`)
3. The DR1 parity backlog's judgements (`document:dr1-parity-backlog`)
4. The DR2.1 prototype source (`prototype:dr2-1-source`)
5. Traces of the DR2.1 prototype journeys (`trace:prototype-dr2-1`)
6. The specs that drove those traces (`prototype:dr2-1-specs`)
7. The animals backend (`repo:backend`)
8. The INS backend (`repo:insbackend`)
9. The address-book service (`repo:addressbook`)
10. Reference-data (`repo:referencedata`)
11. The animals frontend (`repo:frontend`)
12. The INS frontend (`repo:insfrontend`)
13. The tests repo (`repo:tests`)
14. Traces of the animals frontend's fit specs (`trace:animals-fit`)
15. Traces of the INS frontend's fit specs (`trace:ins-fit`)
16. Traces of the end-to-end suite (`trace:e2e`)

The two DR1 documents are judgements only. They win only where DR1 already judged the same difference.

## Questions for Sam

Each question lists the default that will be built if nobody answers. Ids such as "DR1 row inc-030" refer to the DR1 parity backlog, not to this backlog.

### 1. Do DR1's dashboard rulings (DR1 rows inc-030 and inc-031) apply to the new INS dashboard?

| Card status | Actions |
|---|---|
| Draft | Resume, Copy as new, Delete |
| Submitted | View, Amend, Copy as new, Delete |
| Being amended | Resume, Copy as new, Cancel amendment, Delete |

- **Default:** Yes. Cards keep status-driven actions, as in the table. Every list is always sorted, Newest first by default, with no 'Select one'. All else on the card and the sort labels follows DR2.1.
- **Affects:** inc-036, inc-038 (req-024, req-029)
- **Why it is open:** DR1 rejected flattening the card links and adding an unsorted state. It judged them on the animals-frontend dashboard, which is moving to the INS frontend. The ruling limits DR1 to "the real frontend" and does not name the INS frontend. (c-002)

### 2. Where do the journey's dashboard links go, and does the animals dashboard at /live-animals stay?

- **Default:** The journey's links go to the INS dashboard. These are the Dashboard navigation item, 'Return to dashboard', 'Return to your dashboard' and the landing after a delete. The INS 'Create new' opens a live-animals notification on its origin page. The /live-animals dashboard stays unchanged until a ruling retires it.
- **Affects:** inc-016, inc-040 (req-015, req-020)
- **Why it is open:** DR2.1 has one dashboard. The real service has two. No source says whether the animals dashboard retires. (c-004)

### 3. Does any notification type other than live animals come into this programme?

- **Default:** No. Only live animals is built. There is no notification type page, and the dashboard home shows only the Live animals section. Templates are Live animals only. Germinal products and the plants section are out of scope (req-016, req-017).
- **Affects:** inc-017, inc-040 (req-015)
- **Why it is open:** DR2.1 designs five types and a germinal-products journey. The goal names only live animals, the only type with a real journey. Other types would be new journeys. (c-005)

### 4. What is built for the dashboard states no real service records?

| State | Default |
|---|---|
| Action required | Built. The animals backend records it on submission when no ITAHC is attached or required identifiers are incomplete. The INS read model carries it. |
| Completed tab, Status updates card and its page | Built, but empty (count 0) until a service records completion or status changes |
| Delayed, the inspection card and page, the Messages link | Not built |

- **Default:** As the table shows.
- **Affects:** inc-014, inc-035, inc-036, inc-037, inc-039, inc-040 (req-032, req-036)
- **Why it is open:** DR2.1 fakes these states from a notification's place in the list. The backend has four statuses, and the read model sees only draft, submitted and deleted. Inspections, delays and messages come from border processes. (c-006)

### 5. Is organisation scoping of the dashboard lists, counts and searches built in this programme?

- **Default:** Yes. Every list, tab, count and search shows only the signed-in organisation's notifications. The read model records each notification's organisation from its events. The INS frontend sends the session's organisation.
- **Affects:** inc-035, and every later dashboard row (req-034)
- **Why it is open:** The INS backend deferred organisation scoping to a later ticket. No source says whether that ticket lands here. This is a security finding, req-034, owned by Sam. The detail is in the programme's local files. (c-007)

### 6. Where are the transporters an organisation adds kept?

- **Default:** In the address-book service, as transporter entries owned by the organisation. Each has a type (Commercial or Private), an approval number and the status New. The journey's list and the address book's Transporter tab both read them. The animals frontend's in-memory store is retired.
- **Affects:** inc-023, inc-033, inc-034 (req-074)
- **Why it is open:** The prototype keeps transporters in its session. The real frontend keeps them in memory and loses them on restart. The address record has no transporter fields. Persistence is a real constraint the prototype cannot express. (c-009)

### 7. What real address source answers 'Search for an address', and should trade-imports-stub gain Northern Ireland addresses?

| Where | UK address search | Commercial transporter search |
|---|---|---|
| Workspace stack | trade-imports-stub's England addresses | No address. Tests prove only that none outside Northern Ireland is offered, and that manual entry works. |
| CDP environments | The real address gateway's UK addresses | Northern Ireland addresses only |

- **Default:** The INS backend's address lookup answers every search. This is the EUDPA-390 spike, made production-ready. A chosen result fills the address fields. 'Enter address manually' is always offered and is the no-JavaScript route. trade-imports-stub does not change.
- **Affects:** inc-024, inc-025, inc-030, inc-033 (req-052)
- **Why it is open:** The prototype searches a made-up list. The real lookup exists only as a dev-only spike. Locally it answers from trade-imports-stub, which holds no Northern Ireland address and sits outside this programme's repos. (c-010)

### 8. Does the journey's add-address page live in the animals frontend or the INS frontend?

- **Default:** In the INS frontend. The existing journey handshake opens the INS add page in journey mode with DR2.1's journey content. It returns to the journey with the address selected or not, as the trader chose. The animals frontend stays read-only.
- **Affects:** inc-030 (req-059)
- **Why it is open:** DR2.1 puts the page inside the journey. The INS frontend is the only address-book writer, a cross-service constraint. DR1 row inc-053 left the same choice open. (c-011)

### 9. Does every address form ask for 'County (optional)'?

- **Default:** Yes. The add, edit, journey add-address, permanent address and transporter forms all keep it. The address's page shows it only when it has a value.
- **Affects:** inc-024, inc-026, inc-030, inc-032, inc-033
- **Why it is open:** DR2.1 contradicts itself. Its edit and permanent-address forms ask for County, but its add forms do not. (c-012)

### 10. Is the arrival date the arrival at the port of entry or at the place of destination?

- **Default:** The port of entry. The question page, review card and messages say 'Arrival date at port of entry'. The dashboard card says 'Arrival date'.
- **Affects:** inc-007, inc-011, inc-035
- **Why it is open:** The DR2.1 question page says port of entry, but its review card says destination. DR1 left the same contradiction undecided (DR1 row inc-145). (c-013)

### 11. Has the CDP ingress cap been raised to at least 50MB (EUDPA-518)?

- **Default:** The limit stays 10MB, with its hint and error, until the cap is confirmed. It then becomes 50MB, with DR2.1's wording, in every environment at once.
- **Affects:** inc-009, blocked (req-077)
- **Why it is open:** The platform's ingress cap is a real constraint, and nothing confirms it allows 50MB. A 50MB hint before then would show traders a platform error page instead of a validation message. (c-019)

### 12. Where a real service has a feature DR2.1 does not show at all, is it removed?

- **Default:** No, it is kept. If DR2.1 shows another way to do the same job, DR2.1's way replaces it. The real feature then stays only as the no-JavaScript route, where one is needed. Copy DR2.1 leaves off a page is removed.
- **Affects:** every row, through the backlog's invariant (req-114). Directly: inc-002, inc-013, inc-027, inc-029, inc-033, inc-034
- **Why it is open:** The ruling does not cover this gap. Many real features have no DR2.1 counterpart. Examples are editing a party's copy, 'View file', the virus states, error banners and no-JavaScript routes. (c-020)

### 13. Does the commodity and species list take DR2.1's contents, or wait for master data?

- **Default:** It waits for master data. Every environment keeps today's five commodities: cattle, horses, cats, dogs and fish. DR2.1's per-commodity rules and common names apply now to those five. Rules for pigs, sheep, goats and ferrets wait until master data supplies them.
- **Affects:** inc-010, blocked (req-080, req-116); inc-005 and inc-032. inc-004 was dropped under this default.
- **Why it is open:** DR2.1 lists 19 commodities. DR1's master-data ruling names only countries, regions, territories and ports. DR1 also warns against sweeping other lists into that ruling. (c-023)

### 14. Where are templates stored, who can see them, and which frontend serves the template pages?

- **Default:** The animals backend stores templates as records separate from notifications. The signed-in organisation owns them. The animals frontend serves the template pages and template mode. The Templates navigation item and 'Use template' in both frontends open Manage templates.
- **Affects:** inc-017, inc-018, inc-019, inc-020, inc-021, inc-040 (req-037 to req-042)
- **Why it is open:** Templates are new everywhere. The prototype keeps them in a session with no owner. A real service must store and scope them, and no source names it. (c-025)

## Settled without a question

| Decision | Settled by | Conflict |
|---|---|---|
| Log out stays the last navigation item in both frontends. All else in the navigation follows DR2.1, including Templates. | Sam's ruling: authentication is a real constraint | c-001 |
| The DR2.1 dashboard and address book are built in the INS frontend. | DR1 notes: Rhys's ruling of 28 August 2026 | c-003 |
| A saved address carries one or more uses. The address-book ruling cv-044 against types is withdrawn. | DR2.1 and DR1 rows inc-048 and inc-062 outrank the address-book service | c-008 |
| Country and port contents come from master data through reference-data. The port of exit keeps the port of entry list. Presentation follows DR2.1. | DR1's master-data ruling | c-014 |
| Pages the overview links to end with three controls. Others end with 'Save and continue' alone. No control says 'hub' or 'Cancel and return to dashboard'. | DR1 rule (b) (Sam, 21 August 2026) and the 'overview' rename | c-015 |
| The real services keep their validation, using DR2.1's wording where it has a message for the same rule. | Sam's ruling: validation is a real constraint | c-016 |
| 'Copy as new' keeps the internal reference, the species (numbers cleared), unweaned animals and the exit date. | The prototype outranks the backend: this is a product rule | c-017 |
| The document type select offers DR2.1's 13 types, without Health certificate. Saved documents keep their type. | The prototype outranks the frontend's EUDPA-310 ruling | c-018 |
| An animal counts as identified only when every identifier for its commodity is filled. | DR1 deferred it without a judgement, so the prototype wins | c-021 |
| DR1's blocked and deferred rows do not stop DR2.1 differences. DR1's actual judgements still stand. | Sam's ruling is the fresh ruling those blocks waited for | c-022 |
| The phase banner's feedback link stays the APHA service desk email. | DR1 ruling on the same placeholder link | c-024 |

## Already in place

| Requirement | What already exists |
|---|---|
| req-002: the Alpha phase banner with the APHA service desk feedback email | Both frontends show it |
| req-003: Manage account stays a placeholder, never active | Both frontends link it to '#' |
| req-008: the three save controls on overview pages, 'Save and continue' alone elsewhere, never 'hub' | The animals frontend ends pages this way |
| req-053: the address book only shows, changes or deletes the organisation's addresses | Every call is scoped by the session's organisation |
| req-067: the arrival date window, 7 days back to 6 months ahead | The picker and save both hold the window |
| req-068: transit countries, asked only for rail or road | The transit countries page asks this way |
| req-078: the upload guidance, File upload card, scan tags, Remove and 15-document cap | The accompanying documents page shows them |
| req-081: per-commodity rules by code for today's five commodities | The frontend asks identifiers, packages, unweaned, CPH and permanent address this way |
| req-083: numbers of animals required and validated, Remove and 'Add another commodity' | Commodity details validates and removes this way |
| req-086: the identification inset, table, counter, buttons and Remove | The identification page shows them |
| req-087: identifiers optional for one species, one identified animal each for several | The model already works this way |
| req-089: the five import reasons, their reveals and messages | The import reason page offers them |
| req-092: the certified-for question and the unweaned question | The additional details page asks them in order |
| req-097: the region of origin question, code format and messages | The origin page asks and saves it this way |
| req-098: the overview's tag, summary, six-section tasklist and buttons | The overview shows them |
| req-104: the declaration statements, checkbox, date and error | The declaration page has them |
| req-107: the submitted panel, transport guidance and help | The confirmation page shows them |
| req-109: delete for a draft, a submitted notification and one being amended | All three can be soft-deleted |
| req-111: a copy gets a new reference, Draft status and opens on its overview | Copy works this way |
| req-112: country and port contents come from master data | Reference-data serves them from MDM |
| req-115: real validation kept where DR2.1 has less | The checks run in both frontends and the address book |

## The increments

A **review point** is a row where the loop stops so Sam can check the pattern later rows build on. Ready means no row dependency. Waiting means it waits on an earlier row.

| Id | What it delivers | Criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | The journey runs in DR2.1's order, step names and captions | 5 | frontend, tests | — | Ready. **Review point** |
| inc-002 | Origin page country, region hint, live region prefix and reference hint | 5 | frontend, tests | — | Ready |
| inc-003 | Commodity search hint and Commodity details table | 3 | frontend, tests | — | Ready |
| inc-004 | What each commodity is asked, by commodity code | 4 | frontend, tests | — | Dropped |
| inc-005 | Identified only when every identifier is filled; DR2.1 identification layout | 4 | frontend, tests | — | Ready |
| inc-006 | Reason selects open on 'Select one'; certified-for hint | 2 | frontend, tests | — | Ready |
| inc-007 | Arrival details copy; means of transport required to continue | 6 | frontend, tests | — | Ready |
| inc-008 | Upload documents field copy and document types | 3 | frontend, tests | — | Ready |
| inc-009 | Document size limit becomes 50MB once the platform allows it | 2 | frontend, tests | — | Blocked |
| inc-010 | Live-animal commodity and species list from master data | 4 | referencedata, frontend, tests | — | Blocked |
| inc-011 | Review page sections, cards and errors; draft delete from review | 7 | frontend, tests | inc-001 | Waiting. **Review point** |
| inc-012 | Submitted page shows import reference numbers; amend with confirmation | 5 | backend, frontend, tests | inc-011 | Waiting |
| inc-013 | Amending: 'Amend' strip, cancel dialog, 'Save and return' endings | 6 | backend, frontend, tests | inc-012 | Waiting |
| inc-014 | Submission records what is owed; notification and confirmation pages say so | 6 | backend, frontend, tests | inc-012 | Waiting. **Review point** |
| inc-015 | 'Copy as new' carries what DR2.1 carries | 2 | backend, tests | — | Ready |
| inc-016 | Delete page shows what is deleted; dashboard links go to INS with a banner | 6 | insfrontend, frontend, tests | — | Ready |
| inc-017 | Templates: navigation, Manage templates, creating a template | 9 | backend, frontend, insfrontend, tests | inc-001, inc-011 | Waiting. **Review point** |
| inc-018 | A template's page shows its answers; sections change in place | 3 | backend, frontend, tests | inc-017 | Waiting |
| inc-019 | 'Use template' starts a new draft | 3 | backend, frontend, tests | inc-017 | Waiting |
| inc-020 | Delete a template, or discard one being created | 3 | backend, frontend, tests | inc-017 | Waiting |
| inc-021 | Journey Back links follow DR2.1's rule | 3 | frontend, tests | inc-001, inc-018 | Waiting |
| inc-022 | Addresses carry uses; address book lists by category with full search | 6 | addressbook, insfrontend, tests | — | Ready. **Review point** |
| inc-023 | Adding an address starts with its type; transporters kept in the address book | 7 | addressbook, insfrontend, frontend, tests | inc-022 | Waiting |
| inc-024 | The add-details step follows DR2.1 for each address type | 7 | addressbook, insfrontend, tests | inc-023 | Waiting |
| inc-025 | 'Search for an address' finds real UK addresses | 4 | insbackend, insfrontend, tests | inc-024 | Waiting |
| inc-026 | An address's page, editing, deleting and form messages | 5 | addressbook, insfrontend, tests | inc-022 | Waiting |
| inc-027 | Consignment addresses show each party in full, with 'Same as' copies | 6 | frontend, tests | inc-001 | Waiting |
| inc-028 | CPH as a section of consignment addresses, with DR2.1's CPH page | 5 | frontend, tests | inc-027 | Waiting |
| inc-029 | Party pickers show every address for their role on one page | 5 | frontend, tests | inc-022, inc-027 | Waiting |
| inc-030 | Adding from a picker uses DR2.1's journey add-address page | 5 | insfrontend, frontend, tests | inc-029, inc-025 | Waiting |
| inc-031 | Contact address chosen from branch addresses | 5 | insfrontend, frontend, tests | inc-022, inc-024 | Waiting |
| inc-032 | Permanent address becomes a consignment party, answered per animal | 6 | frontend, tests | inc-027 | Waiting |
| inc-033 | Transporter type and add pages follow DR2.1 and check required fields | 7 | insbackend, frontend, tests | inc-023, inc-025 | Waiting |
| inc-034 | Transporter list searches as you type, links each row, confirms additions | 4 | frontend, tests | inc-023 | Waiting |
| inc-035 | Dashboard shows the organisation's own notifications as DR2.1 cards | 5 | insbackend, insfrontend, tests | — | Ready (wave 2). **Review point** |
| inc-036 | List tabs, search, sort and pages of eight | 5 | insbackend, insfrontend, tests | inc-035 | Waiting |
| inc-037 | List narrowed by arrival and status | 4 | insbackend, insfrontend, tests | inc-036 | Waiting |
| inc-038 | Dashboard cards offer actions by status | 4 | insbackend, insfrontend, tests | inc-035, inc-012 | Waiting |
| inc-039 | Action required on cards and an Action needed page | 3 | insbackend, insfrontend, tests | inc-036, inc-014 | Waiting |
| inc-040 | Dashboard home and Live animals page follow DR2.1 | 7 | insbackend, insfrontend, tests | inc-039, inc-017, inc-016 | Waiting |

**Check these ordering decisions:**

- inc-001 goes first and is a review point. Every later journey row, template mode included, builds on its page order.
- inc-004 is dropped. Its requirement, req-081, is already met for today's five commodities. Rules for pigs, sheep, goats and ferrets (req-116) moved to inc-010.
- inc-009 is blocked until the CDP platform confirms an ingress cap of at least 50,001,024 bytes (EUDPA-518).
- inc-010 is blocked until master data carries live-animal commodities and species. Nothing in this programme supplies them.
- inc-017 is the largest row: 9 criteria across 4 repos. It could split into the navigation item with Manage templates, then creating a template. The consolidator kept them together because a list cannot be observed until a template exists.
- inc-012 and inc-013 list the backend "in case" the view lacks the submitted date or version. The backend change may turn out to be nothing.
- inc-025 is proven on the workspace stack against trade-imports-stub. Its CDP lookup credentials live in cdp-app-config, which only Sam changes.
- inc-033 proves the Northern Ireland search only as "no other address is offered" locally. A Northern Ireland result can be observed only in CDP.
- inc-035 builds on today's INS dashboard page. inc-040 then moves the list into DR2.1's home and Live animals pages.
- inc-037 builds the date range as plain date fields, not DR2.1's date pickers. The INS frontend's client scripts belong to the other theme. Sam may want the pickers.
- inc-016 must show the deleted banner on the INS dashboard without changing the dashboard theme's pages.

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Wave | Theme | Rows | Touches | Depends on |
|---|---|---|---|---|
| 1 | live-animals-journey: the journey, templates, address book and transporters | inc-001 to inc-034 (34 rows) | `frontend:.`, `backend:.`, `referencedata:.`, `addressbook:.`; insfrontend `src/server/app/features/address-book`, `src/server/app/features/address-lookup-spike`, `src/server/app/features/index.js`, `src/server/app/routes.js`, `src/server/app/services/address-book`, `src/server/app/services/address-lookup`, `src/server/app/services/countries`, `src/server/app/shared`, `src/server/common`, `src/client`, `src/config`, `webpack.config.js`; insbackend `.../ins/backend/addresslookup` (main and test); tests `tests/animals`, `page-objects/animals`, `flows/animals`, `tests/ins/e2e/features/address-book`, `tests/ins/security/address-book`, `page-objects/ins/address-book`, `tests/ins/e2e/features/cross-service-sessions.spec.ts` | — |
| 2 | dashboard: the DR2.1 dashboard in the INS frontend | inc-035 to inc-040 (6 rows) | insbackend `.../ins/backend/notification`, `.../ins/backend/service`, `.../ins/backend/configuration`, `src/main/resources`, and the `notification`, `service` and `integration` test packages; insfrontend `src/server/app/features/dashboard`, `src/server/app/services/ins-backend`; tests `tests/ins/e2e/features/dashboard`, `tests/ins/e2e/features/notification-dashboard-navigation.spec.ts`, `tests/ins/e2e/features/aggregated-notification.spec.ts`, `page-objects/ins/dashboard-page.ts`, `tests/ins/a11y` | live-animals-journey |

Every row sits in a theme.

**Cross-theme dependencies:**

- inc-038 (dashboard) depends on inc-012 (live-animals-journey). A card's Amend leads to the amend confirmation inc-012 builds.
- inc-039 (dashboard) depends on inc-014 (live-animals-journey). The card flag and Action needed page read the action required that inc-014 records.
- inc-040 (dashboard) depends on inc-017 (live-animals-journey). 'Use template' opens Manage templates, which inc-017 builds.
- inc-040 (dashboard) depends on inc-016 (live-animals-journey). The animals frontend's Dashboard item must already point at the INS dashboard.

The dashboard theme waits for the whole journey theme. Only inc-038, inc-039 and inc-040 need journey rows. inc-035 to inc-037 could start in wave 1 if Sam wants the themes to overlap.

## Where the requirements came from

- 13,406 claims were taken from 16 sources. 13,299 held and 107 were dropped as refuted. Verifiers added 635 claims the extractors missed.
- 116 requirements were made. 92 are adopted: 71 to build (60 changes, 11 new) and 21 already in place. 20 are questions, one of them already met today (req-114). 4 are out of scope.
- The backlog covers 90 requirements, every in-scope one that is not already in place.

| Source | Claims | Held | Dropped | Added | Requirements backed (in scope) |
|---|---|---|---|---|---|
| Sam's ruling, 7 October 2026 | 23 | 23 | 0 | 0 | 3 (3) |
| DR1 parity notes | 88 | 88 | 0 | 1 | 11 (10) |
| DR1 parity backlog | 481 | 481 | 0 | 64 | 19 (19) |
| DR2.1 prototype source | 1,705 | 1,683 | 22 | 81 | 112 (108) |
| DR2.1 prototype traces | 1,791 | 1,784 | 7 | 85 | 29 (27) |
| DR2.1 prototype specs | 1,003 | 998 | 5 | 8 | 22 (21) |
| Animals backend | 688 | 683 | 5 | 26 | 11 (11) |
| INS backend | 132 | 132 | 0 | 8 | 7 (7) |
| Address book | 339 | 336 | 3 | 12 | 5 (5) |
| Reference-data | 98 | 96 | 2 | 5 | 2 (2) |
| Animals frontend | 1,852 | 1,843 | 9 | 97 | 77 (77) |
| INS frontend | 638 | 638 | 0 | 31 | 27 (27) |
| Tests repo | 907 | 897 | 10 | 39 | 0 (0) |
| Animals fit traces | 1,948 | 1,921 | 27 | 81 | 0 (0) |
| INS fit traces | 250 | 248 | 2 | 27 | 0 (0) |
| End-to-end traces | 1,463 | 1,448 | 15 | 70 | 0 (0) |

**Strongest.** req-001 (the navigation, with Templates and Log out) rests on 6 sources. req-024 (sort), req-029 (card actions) and req-059 (journey add-address page) rest on 5 each.

**Weakest.** 3 requirements rest on the prototype source alone: req-039 (what a template keeps), req-041 ('Use template') and req-103 (the action-required warning on a notification). req-039 and req-041 are also questions under c-025. No requirement rests only on inferred claims.

**Confirm before passing this on:**

- The tests repo and the three trace sets back no requirement. Their 4,514 held claims describe today's behaviour, which the repo sources already cite. Confirm that is acceptable evidence of today's state.
- The goal in `sources.json` still reads as before the ruling (step 0).

## Out of scope

### Excluded by a question's default

These come back into scope if Sam answers question 3 or question 4 the other way.

| Requirement | What is not built |
|---|---|
| req-016 | The germinal-products journey: its commodity list, weights, packages, storage temperature, reduced reason and purpose lists, and dashboard section |
| req-017 | The dashboard home's plants section and the inspection pages |

### Prototype scaffolding, not part of a real service

| Requirement | What is not built |
|---|---|
| req-018 | The service index with release cards, the version mount and session nests, the /prototype/reason-for-import shortcut, demo states by list position, and seeded demo data |

### Waits on master data

| Requirement | What is not built |
|---|---|
| req-113 | A separate port of exit list of border control posts approved for animals. It waits until master data carries an approved-for-animals attribute (c-014). |

## Terms used

| Term | Meaning |
|---|---|
| Action required | A submitted notification still missing an ITAHC or required animal identifiers |
| APHA | Animal and Plant Health Agency |
| CDP | Core Delivery Platform, where the services run outside a laptop |
| Claim | One statement taken from a source. Held means a second agent confirmed it. Dropped means it was refuted. Added means the verifier found it missing. |
| CPH | County parish holding number |
| DR1 | Design Release 1, the earlier parity programme whose judgements still stand |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| EUDPA | The team's Jira project key |
| INS | Import Notification Service, the front door that holds the dashboard and address book |
| ITAHC | Intra Trade Animal Health Certificate |
| MDM | Master data management, the source of reference lists |
| No-JavaScript route | The way a page works when the browser runs no scripts |
| Read model | The INS backend's copy of notification data that the dashboard lists |
| Review point | A row where the build loop stops for Sam to check the pattern later rows build on |
| Template mode | The journey run to build a template, not a notification |
| Theme | A group of rows that builds on its own branch and machine |
| Wave | A theme's place in the landing order. Themes in one wave build in parallel. |

