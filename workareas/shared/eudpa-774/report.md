# EUDPA-774 Save and continue through the journey: backlog report

## Summary

- The backlog has 3 increments to build: all 3 are ready to go and none is blocked. They build in a chain: `inc-001`, then `inc-002`, then `inc-019`.
- It gives each journey one page order and makes Back follow the trader's trail on every page, the review page included. It then removes the opening run.
- No questions are open. The challenge received 0 questions, so precedence, a ruling or a blocker had nothing to settle. All 52 disagreements were settled by precedence.
- Before building, correct the goal in `sources.json`. The goal does not yet say how the review page's Back works (see step 0).
- Nothing waits on anyone outside the build loop. Sam merges the draft pull requests, and the loop merges nothing (`req-030`).

## Before you build: step 0

**Correct the goal in `sources.json`.** The goal says Back goes "wherever the trader came from" on the review page, with the address-book return as the one exception. Sam's third ruling of 6 November 2026 (`ruling:sam-2026-11-06c`) narrows that. The goal as the rulings leave it:

- In the live animals and high-risk plants journeys, Save and continue goes on to the next page of the journey that applies, ending at the review page. This holds however the page was reached.
- Back on every journey page goes to wherever the trader came from. The one journey-page exception is live animals Consignment addresses and Contact address for consignment. After an Import Notification Service address-book return, Back on these pages goes to Overview.
- Back on the review page follows the trail where one exists. The routes with a trail are Save and continue from the last journey page, Overview, a dashboard card, and Back from a page that a Change link or error link opened. In high-risk plants, a refused Continue also keeps the trail.
- Coming back by Back from a page that a Change link or error link opened keeps the review page's earlier Back.
- After a cancelled amendment, Back on the review page goes to the dashboard.
- Every other way into the review page keeps today's Back. These routes are the declaration, the confirmation page, a typed address and a new session. Back goes to Overview on a draft or amendment, and to the dashboard once submitted.
- Pages being amended show the same buttons and links as on a draft, with no button straight back to the review page.
- The review page's buttons and Continue, the declaration and the confirmation page stay as they are.
- The opening run and its return-to-Overview routing are removed as if they had never existed.

## Decisions the pipeline made

**Repos (3).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|
| `frontend` | DEFRA/trade-imports-animals-frontend | Holds the live animals journey's routing (shared kit, flow code) and its journey pages |
| `plantsfrontend` | DEFRA/trade-imports-plants-frontend | Holds the high-risk plants journey's routing, its journey pages and its rulings ledger |
| `tests` | DEFRA/trade-imports-ins-tests | Holds both journeys' end-to-end (E2E) suites and journey helpers |

Every row also edits this workspace's `openspec/` behaviour spec, which is not a backlog repo key. No repo is read without being changed.

**Which source wins a disagreement**, highest first:

1. Sam's third ruling of 6 November 2026 (`ruling:sam-2026-11-06c`): the answer to the second distil run's question
2. Sam's second ruling of 6 November 2026 (`ruling:sam-2026-11-06b`): decisions after the first distil run
3. Sam's first ruling of 6 November 2026 (`ruling:sam-2026-11-06`)
4. The EUDPA-774 brief (`document:brief-eudpa-774`)
5. The EUDPA-774 Jira ticket (`document:ticket-eudpa-774`)
6. The live animals frontend (`repo:frontend`)
7. The high-risk plants frontend (`repo:plantsfrontend`)
8. The tests repo (`repo:tests`)
9. The behaviour spec in this workspace (`repo:workspace-openspec`)
10. The Save and continue investigation (`document:save-and-continue-investigation`): background only, never a decision

## Questions for Sam

0 questions were challenged against precedence and every ruling. 0 were settled and 0 wait on others. No question is open, so every increment builds as specified.

## Settled without a question

Every disagreement was settled by precedence. The challenge settled none, because it received no questions.

| Decision | Settled by | Conflict |
|---|---|---|
| Live animals has one page order, the order Overview lists its tasks in. The flow-section and opening-sequence orders go. | Ticket | `c-001` |
| Save and continue goes to the next page that applies, however the page was reached. This replaces the EUDPA-691 and 9 October return-to-Overview rulings. | Ticket and brief | `c-002` |
| There is no opening sequence. The one rule decides every Save and continue. | Ticket | `c-003` |
| Back goes to the page the trader came from, on a draft and while amending. | Ticket | `c-004` |
| Overview and Change links carry where the trader came from on the link. | Brief and ticket | `c-005` |
| A new notification's first page goes Back to where it was started (dashboard or the Import Notification Service type question). From Overview, it goes Back to Overview. | Ticket | `c-006` |
| An amend page shows exactly the draft controls, with no Save and return to the review page. | Sam's first ruling | `c-007` |
| Save and continue while amending goes on through the journey to the review page. | Sam's first ruling and ticket | `c-008` |
| The Change-link shortcut back to the review page goes on drafts as well as amendments. | Ticket | `c-009` |
| The increment build loop builds the programme. | Sam's first ruling | `c-010` |
| A notification with nothing saved opens at its first page, Overview included. Test helpers save the first page first. | Sam's first ruling and brief | `c-011` |
| The address-book return is the one journey-page exception to the Back rule. | Sam's first ruling | `c-012` |
| Live animals early pages go on to the next page that applies from every start. The commodity question detour stands. | Sam's rulings and ticket | `c-013` |
| Live animals early pages take Back from the trail. The page before commodity details is main import reason. | Sam's second ruling and ticket | `c-014` |
| Plants commodity type, commodities list and origin end with the draft controls while amending. | Sam's first and second rulings | `c-015` |
| Plants commodity type goes to the commodities list, then origin, then the arrival page that applies, from every start. | Ticket and Sam's rulings | `c-016` |
| Plants early pages take Back from the trail. Commodity type's Back follows the entry point, not whether an answer is saved. | Sam's second ruling and ticket | `c-017` |
| Plants first-page Cancel goes to the dashboard while nothing is saved, and keeps its words. | Sam's first ruling | `c-018` |
| Plants commodity type Save and return to overview with an incompatible type drops the lines and opens Overview. | Brief and ticket | `c-019` |
| Live animals arrival, transport, documents, addresses and contact pages go on to the next page that applies. The last goes to the review page. | Ticket and Sam's rulings | `c-020` |
| Plants arrival details goes to place of destination, then the consignor or identification numbers, however reached. | Ticket | `c-021` |
| Plants arrival and destination pages take Back from the trail. From a Change link they go Back to the review page. | Ticket and brief | `c-022` |
| Plants arrival and destination pages show the draft controls while amending. | Sam's first ruling | `c-023` |
| From a Change link, switching to Rail or Road goes on to transit countries. Roles and addresses goes on to contact. | Ticket and brief | `c-024` |
| Upload documents follows the transporter list in the one order. | Ticket | `c-025` |
| Live animals transport, documents and address pages show the draft controls while amending. | Sam's first ruling | `c-026` |
| Upload documents lets Save and continue leave while a scan is pending. Only a rejected document holds the trader. | Live animals frontend, with the tests repo | `c-027` |
| Plants later pages go on to the next page, and the last goes to the review page. | Ticket | `c-028` |
| Live animals later pages take Back from the trail, whatever the notification's status. | Sam's second ruling and ticket | `c-029` |
| The CPH (county parish holding) page from a Change link goes on to Roles and addresses, then contact. Its Back goes to the review page. | Sam's first ruling | `c-030` |
| The address-book exception covers Roles and addresses and the contact page. Plants has no exception. | Sam's first ruling | `c-031` |
| Amend opens the review page in both frontends. | Brief and ticket | `c-032` |
| Every amend page shows the draft controls, with no Save and return to the review page. | Sam's first ruling | `c-033` |
| A page opened from the review page goes on through the journey to the review page, on a draft and while amending. | Ticket | `c-034` |
| Save and continue while amending goes on through the journey. The animals E2E claim otherwise is overruled. | Sam's first ruling | `c-035` |
| A page opened from the review page goes Back to the review page. | Ticket | `c-036` |
| A page opened from Overview goes Back to Overview. A page reached by Save and continue goes Back to the page before. | Ticket | `c-037` |
| Plants first-page Cancel goes to the dashboard until something is saved, then Overview. Copy is unchanged. | Sam's first ruling | `c-038` |
| The review page's Back follows the trail: the last journey page, Overview or the dashboard. | Sam's second ruling | `c-041` |
| Save and continue on the last page opens the review page, which names anything outstanding. | Ticket | `c-042` |
| The investigation's alternatives are set aside. The next-unfinished-task idea is not built. | Ticket and brief | `c-043` |
| A bounced notification's entry page goes on like any other. Both sets' docs drop the old accepted rule. | Ticket and brief | `c-044` |
| The plants ledger ruling `d-069`'s opening run is superseded. Its declaration and grouped hub, and `d-085`'s incomplete ending, stand. | Ticket | `c-045` |
| An amend page shows the draft controls, and Save and continue walks forward. | Sam's first ruling | `c-046` |
| The loop builds on the EUDPA-774 branch, with no Jira calls and no merges. | Sam's first ruling | `c-047` |
| The plants rulings ledger is rewritten so no ruling mentions an opening run. `d-085` states the one rule. | Ticket and brief | `c-048` |
| The one order is the order Overview shows, with upload documents before Roles and addresses. | Ticket | `c-049` |
| From a Change link on a draft, Save and continue goes on. Switching to Rail or Road asks for transit countries. | Ticket | `c-050` |
| The address-book exception applies on Roles and addresses and extends to the contact page. | Sam's first ruling | `c-051` |
| The backlog has exactly three rows. Live animals is built and checked before plants inside each row. | Sam's second ruling | `c-052` |
| The review page's Back on its other ways in keeps today's Back. After a cancelled amendment it goes to the dashboard. | Sam's third ruling | `c-053` |
| Both sets' docs describe the review page's Back by the trail, with the ruled fallbacks. | Sam's second and third rulings | `c-054` |

## Already in place

41 adopted requirements are already met. No row builds them, and the rows keep them working.

| Requirement | What already exists |
|---|---|
| `req-002` CPH number page is not a step, and saves back to Roles and addresses | The opening run already skips it, and it saves back today |
| `req-014` Draft pages end with Save and continue, Save and return to overview, and Cancel | The shared save controls render these on a draft in both frontends |
| `req-017` Save and return to overview always goes to Overview | The shared kit sends it to Overview first, while amending too |
| `req-025` Whether a page applies is decided by its gate or earlier answers | Page gates and derived gates decide it in both frontends |
| `req-036` Live animals commodity selection returns to the page that opened it | The commodity question detour honours its return marker |
| `req-045` Commodity details with no lines shows commodity selection | The no-commodities and last-commodity-removed redirects |
| `req-048` Identification details' card saves and removes stay on the page | The stay-on-identification redirect and the remove sub-flow |
| `req-054` Plants type change that drops lines goes to the commodities list and reports it | The removal redirect to the list with a removed count |
| `req-062` Plants list row Change, Add another and remove | The list controller's row links, remove and empty-list redirect |
| `req-063` Plants commodity details always returns to the list | The details page returns to the list and never asks for a next page |
| `req-064` Plants commodity details' Back to type or list | Today's Back on the details page |
| `req-065` Plants commodity details' own controls, the same while amending | The page does not use the shared save controls |
| `req-069` Save and return to overview on this area's pages, with its refusals | Met on a draft in both frontends |
| `req-070` Plants Cancel and return to overview opens Overview without saving | Met on a draft on every plants journey page |
| `req-071` Plants refused or failed saves keep the trader on the page | Every page's refusal and recoverable-error re-render |
| `req-086` Plants arrival status does not apply to potatoes | Potatoes go from origin straight to arrival details |
| `req-093` Plants arrival and destination draft controls | Met today on all three pages |
| `req-094` Plants arrival and destination refusals | Met today on all three pages |
| `req-095` Live animals transit countries applies only for Rail or Road | The transit countries gate |
| `req-096` In-page actions (Add country, Remove, Search) stay on the page | Met today on transit countries and the transporter list |
| `req-097` Add-a-transporter sub-pages return to their opener | Met today |
| `req-098` Plants arrival and destination task rows open the right page | Overview's task-row links |
| `req-104` Upload documents leaves while a scan is pending, and holds only on a rejection | The documents controller and scan-lifecycle E2E spec |
| `req-113` Live animals party picker saves land on Roles and addresses | Picker saves and Back today |
| `req-114` Address-book returns land on the right live animals page | The address-return controller and handshake E2E specs |
| `req-115` Plants party edit returns to the page that opened it | The party edit controller's return parameter |
| `req-120` Plants consignor, identification numbers and contact Overview exits | Met today on all three pages |
| `req-128` Plants Consignor page is not served for potatoes | The picker routes redirect to Overview and log a refusal |
| `req-136` A refused amendment shows the dashboard banner | The amend refusal redirect and banner |
| `req-145` Overview keeps its exits | Today's Overview Back link and Return to dashboard button |
| `req-148` Starting a new notification opens its first page | The create and start redirects |
| `req-154` Resume on a draft or amending card opens Overview | The dashboard card's Resume link |
| `req-155` Submitted cards offer View and Amend | The dashboard's row actions |
| `req-156` Live animals Copy as new opens a new draft's Overview | The notification actions controller |
| `req-157` Cancel amend keeps its endings | Each frontend's cancel amend controller |
| `req-158` Delete keeps its endings | Each frontend's delete notification controller |
| `req-162` Plants review page Edit details returns to the review page | The edit link's return parameter |
| `req-184` Sub-pages return to their opener and end with their primary button | The CPH, transporter add and commodity question pages today |
| `req-186` Overview offers Review and submit whatever is owed, and the review page names what is outstanding | Today's Overview and review page, with plants rulings `d-085` and `d-066` |
| `req-198` Upload documents Save and return to overview goes to Overview | The shared kit's straight exit to Overview |
| `req-219` Plants review page Change links open the right page | The review page's change-link builder |

## The increments

### Ready to go

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|
| `inc-001` | One page order per journey. Save and continue goes on from every start. Change links and amendments carry on to the review page. Amend pages show the draft controls. A notification with nothing saved opens at its first page. **Review point** | 23 | frontend, plantsfrontend, tests | nothing | none |
| `inc-002` | Back follows the trail on every journey page and the review page. Sub-page round trips keep it. The address-book exception applies. Each page's own Save and continue, Back and amend endings follow the one rule. **Review point** | 80 | frontend, plantsfrontend, tests | `inc-001` | none |
| `inc-019` | The run record and opening run are removed. Both frontends' routing docs, add-a-page recipes and the plants rulings ledger describe the one rule. **Review point** | 26 | frontend, plantsfrontend, tests | `inc-002` | none |

A review point is a check the owner makes once the theme is built. The build never waits for it mid-run.

### Blocked

No row is blocked.

These 19 rows were merged into the three rows above. They stay in the backlog as a record:

| Id | Status | Merged into |
|---|---|---|
| `inc-003`, `inc-004`, `inc-005` | merged-into | `inc-001` |
| `inc-006` to `inc-018` | merged-into | `inc-002` |
| `inc-020`, `inc-021`, `inc-022` | merged-into | `inc-019` |

**Check these ordering decisions:**

- Sam fixed the backlog at three rows (`ruling:sam-2026-11-06b` claim 3). Each row therefore holds far more than the usual 3 to 10 criteria: 23, 80 and 26.
- `inc-002` may be too big to review in one go. Its notes say to build it group by group, checking each group before the next. The groups are the Back mechanism, live animals early pages, live animals arrival to contact, plants pages, then the review page. A split would follow these groups.
- Inside each row, live animals is built and checked before high-risk plants (canary first, `c-052`).
- `inc-019` lands last because it deletes the session record. `inc-002` moves the first page's Back onto the create and start redirect links before that.
- Run state may still exist after `inc-001` lands, but nothing reads it. `inc-019` deletes it.
- The address-book criteria in `inc-002` show only on the full workspace stack and in CDP (Core Delivery Platform) environments. Stub mode shows no add-address link, so their E2E tests run in the full-stack suite.
- `req-083` (a live animals "Select a transporter" page) is out of scope. The frontend has no such page. `req-078` covers Transporter details' Save and continue.

## Where the requirements came from

- The pipeline took 3,548 claims from 10 sources. 3,520 held, 28 were dropped as refuted, and 124 were added as missed. That gives a working set of 3,644 claims.
- Reconcile weighed 8 areas apart: live animals routing; live animals origin and commodities; live animals documents, addresses and transport; live animals dashboard and review; plants routing; plants journey pages; plants dashboard and review; and cross-cutting.
- Reconcile made 167 requirements. 141 are adopted: 100 to build and 41 already in place. 0 are questions and 26 are out of scope.

| Source | Rank | Claims | Held | Dropped | Added | Cited | Requirements it backs (in scope) |
|---|---|---|---|---|---|---|---|
| `ruling:sam-2026-11-06c` | 1 | 17 | 17 | 0 | 0 | 17 of 17 | 19 (16) |
| `ruling:sam-2026-11-06b` | 2 | 34 | 34 | 0 | 0 | 34 of 34 | 94 (89) |
| `ruling:sam-2026-11-06` | 3 | 29 | 28 | 1 | 0 | 28 of 28 | 53 (52) |
| `document:brief-eudpa-774` | 4 | 81 | 81 | 0 | 0 | 81 of 81 | 85 (77) |
| `document:ticket-eudpa-774` | 5 | 110 | 110 | 0 | 0 | 110 of 110 | 111 (103) |
| `repo:frontend` | 6 | 693 | 686 | 7 | 32 | 604 of 718 | 95 (84) |
| `repo:plantsfrontend` | 7 | 825 | 816 | 9 | 50 | 624 of 866 | 67 (57) |
| `repo:tests` | 8 | 831 | 825 | 6 | 18 | 736 of 843 | 101 (83) |
| `repo:workspace-openspec` | 9 | 747 | 742 | 5 | 21 | 641 of 763 | 122 (105) |
| `document:save-and-continue-investigation` | 10 | 181 | 181 | 0 | 3 | 181 of 184 | 43 (37) |

- Every source backs at least one requirement. No source's cited share falls below a tenth. The lowest is the plants frontend, at 624 of 866 (72%).
- **Strongest:** `req-010` (Back goes to the page the trader came from) rests on 9 of the 10 sources. Next come `req-004`, `req-011`, `req-017`, `req-019`, `req-032` and `req-101`, each on 8.
- **Weakest:** 3 adopted requirements rest on 2 sources each. `req-008` (collection pages keep the trader on the page) rests on the tests repo and the behaviour spec. `req-128` (no plants Consignor page for potatoes) rests on the plants frontend and the spec. `req-145` (Overview keeps its exits) rests on the live animals frontend and the spec. No adopted requirement rests on one source.
- **Confirm before passing this on:** the goal in `sources.json` still needs the step 0 correction.

## Out of scope

### Page content and plumbing that routing does not touch

- `req-031`: page chrome, the status strip, banners, logging, navigation, titles, Welsh copy and route paths
- `req-074`: live animals origin, commodity, import reason and additional details page content and field rules
- `req-075`: plants commodity type, commodities list, commodity details and origin page content
- `req-099`: live animals arrival, transit, transporter page questions, validation and saved data
- `req-129`: live animals Upload documents upload, scan and file behaviour
- `req-130`: live animals CPH number page content and the Roles and addresses CPH section
- `req-131`: live animals party sections, pickers, party edit and the address book's add page
- `req-132`: live animals Consignment contact page content
- `req-133`: plants parties, address-book pickers, Identification numbers fields and Edit address details form
- `req-165`: dashboard list and cards, and Overview's groups, task rows and statuses
- `req-189`: doc and ledger content about matters other than journey routing
- `req-201`: live animals obligations that decide which questions a page asks
- `req-217`: plants arrival status, arrival details and place of destination page content

### The review page's buttons, the declaration and the confirmation page

- `req-027`: the review page's own buttons and Continue, the declaration and the confirmation page
- `req-163`: the review page's content, errors and its own controls, and Overview's links into it
- `req-164`: the declaration and the confirmation page, their Back links included

### Sub-page returns left alone

- `req-028`: sub-pages that return to the page that opened them keep doing so

### Nothing to build, or a duplicate

- `req-029`: neither frontend has a template mode or a germinal set
- `req-083`: no "Select a transporter" page exists. `req-078` covers Transporter details.
- `req-121`: duplicates `req-088` (plants place of destination's Save and continue)

### How the programme runs

- `req-030`: exactly three rows, built by the build loop on the EUDPA-774 branch, with no Jira calls and no merges. Sam merges the draft pull requests.

### Overruled behaviour, recorded so it stays visible

- `req-167`: amend Save and return to the review page, and Save and continue to Overview
- `req-168`: a Change-link save that returns to the review page, and an amendment that starts at Overview
- `req-190`: the investigation's alternatives to the one rule

### Problems for the owning teams

These are reported here for their own tickets and are not fixed by this backlog:

- `req-166`, owned by the live animals and plants frontend teams. It lists faults in the dashboard and review handlers. They include a stale live animals Copy redirect to a path with no route, and a plants declaration refusal check that runs in the wrong order. Some refusal redirects also log nothing. It also names an access-check finding in the plants Amend action. The detail is in the programme's local files.
- `req-189`, owned by the plants team: stale plants doc statements outside routing
- `req-228`, owned by the plants team: a plants Overview test with a misleading title

## Terms used

| Term | Meaning |
|---|---|
| Amend, amendment | Changing a notification that has already been submitted |
| Canary first | Build and check live animals before high-risk plants inside the same row |
| CDP | Core Delivery Platform, where the services run in test and live environments |
| Claim | One statement taken from a source, with its provenance |
| CPH | County parish holding number |
| Dashboard | The trader's list of notifications |
| E2E | End to end: browser tests across the running stack |
| Ledger | The high-risk plants rulings record, `sets/high-risk-plants/spec/decisions.json` |
| Opening run | Today's walk through the pages on a new notification's first pass, which this backlog removes |
| `openspec/` | The behaviour spec in this workspace |
| Overview | The notification's task list page |
| Precedence | The source ranking that settles a disagreement |
| Review page | The check your answers page |
| Review point | A check the owner makes once the theme is built. The build never waits for it. |
| Run record, run state | The session record of the opening run, which this backlog deletes |
| Trail | Where the trader came from, carried on links and form posts rather than in the session |
| Working set | The claims that held, plus the claims added as missed |

