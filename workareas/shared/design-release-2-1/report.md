# Design Release 2.1: backlog report

## Summary

- The backlog has 172 increments: 36 are ready now, 121 wait on earlier rows, 13 are blocked and 2 are dropped. 28 are review points.
- It brings the GBN-AG animals notification (live animals and germinal products), the INS dashboard and lists, the address book and templates up to Design Release 2.1, across 8 repos in 14 themes.
- 2 questions are open (c-217, c-218), both about the address search. 35 questions were challenged: 34 were settled by precedence and the 7 October ruling, and one (c-152) waits on a blocker. Each open question has a default, so building can start.
- Step 0: correct the goal in `sources.json` so it covers germinal products, then re-check req-1668 and the germinal blockers against it.
- 29 requirements in 13 blocked increments wait on others: MDM (8), PIMS Dynamics outcomes (7), a design authority ruling on DR1 row inc-103 (5), a germinal products journey (4), import-checking outcomes (3), CDP (1) and the plants services (1).

## Before you build: step 0

1. **Correct the goal in `sources.json`.** The goal names only the live-animals journey. Claim 1 of the 7 October ruling says the services match Design Release 2.1 wherever they differ. That brings in Design Release 2.1's germinal products type. The goal should say it covers the GBN-AG animals notification in both its live-animals and germinal-products types. As the rulings leave it, the goal reads:
   > Bring the real GB notification services (the GBN-AG animals notification in both its live-animals and germinal-products types, its dashboard, templates and address book) up to Design Release 2.1, except where a DR1 judgement on the same difference, or a real constraint the prototype cannot express, overrides it.
2. **Then re-check three things against the corrected goal.**
   - req-1668 puts the germinal products journey out of scope. inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-141 and inc-161 build germinal products as a category of the animals notification.
   - The blocker on req-979, req-1736, req-1737 and req-1738 says "this programme covers the live-animals journey". inc-016 may give germinal notifications a path to the INS read model, which could lift that blocker.
   - inc-016 and inc-017 ask "Are germinal products built in this programme?" The corrected goal answers yes, which matches their default.
3. **Add `stub` to the repos in `sources.json`.** inc-042 changes `trade-imports-stub` so the lookup stub returns Northern Ireland addresses. The backlog already lists the repo.

## Decisions the pipeline made

**Repos (8).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|
| frontend | trade-imports-animals-frontend | The live-animals journey pages, flow, copy and templates UI |
| backend | trade-imports-animals-backend | The notification record, lifecycle, templates store and published events |
| insfrontend | trade-imports-ins-frontend | The overall dashboard, notification lists, type question and address book UI |
| insbackend | trade-imports-ins-backend | The read model behind the dashboard and lists, and the address lookup |
| addressbook | trade-imports-address-book | The address record, its uses and its API |
| referencedata | trade-imports-reference-data | The country and port lists the journey reads |
| tests | trade-imports-ins-tests | Every service's end-to-end suite |
| stub | trade-imports-stub | The lookup stub gains Northern Ireland addresses for inc-042 |

Read but not changed: the Design Release 2.1 prototype (`defra-design/GB-notification-service` at 04a073b), its traces and specs, and the DR1 parity notes and backlog.

**Which source wins a disagreement**, highest first:

1. Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`)
2. DR1 parity programme notes (`document:dr1-parity-notes`)
3. DR1 parity backlog judgements (`document:dr1-parity-backlog`)
4. Design Release 2.1 prototype source (`prototype:dr2-1-source`)
5. Design Release 2.1 traces (`trace:prototype-dr2-1`)
6. Design Release 2.1 specs (`prototype:dr2-1-specs`)
7. Animals backend (`repo:backend`)
8. INS backend (`repo:insbackend`)
9. Address book (`repo:addressbook`)
10. Reference data (`repo:referencedata`)
11. Animals frontend (`repo:frontend`)
12. INS frontend (`repo:insfrontend`)
13. Tests repo (`repo:tests`)
14. Animals frontend fit traces (`trace:animals-fit`)
15. INS frontend fit traces (`trace:ins-fit`)
16. End-to-end traces (`trace:e2e`)

The ruling sets the rule: Design Release 2.1 wins by default. A DR1 judgement on the same difference, or a real constraint the prototype cannot express, overrides it.

## Questions for Sam

35 questions were challenged against precedence and every ruling. 34 were settled and one (c-152) waits on a blocker. 2 questions stay open. Each lists the default built if nobody answers.

### 1. Should the INS backend's address lookup be set up in CDP test, ext-test, perf-test and prod, or should those environments offer manual entry only?

| Environment | What the default builds |
|---|---|
| Fit suites (stub mode) and the local stack | Searches run against the lookup stub's fixed results |
| CDP dev | Searches run against the INS backend's real lookup |
| CDP test, ext-test, perf-test and prod | Search sits behind a per-environment setting left off. Pages open with address and contact fields shown and no search box |

- **Default:** as the table shows. Every field, message and save is the same in every environment.
- **Affects:** inc-042, inc-071, inc-072 and inc-081 (req-456, req-457, req-1218).
- **Why it is open:** Design Release 2.1 searches everywhere. c-178 says the search must use the real lookup. That lookup exists only on the local stack (a stub) and in CDP dev. Precedence cannot create it elsewhere.

### 2. Should the commercial transporter's search use the same INS backend lookup limited to Northern Ireland (BT) postcodes, with the stubs given Northern Ireland addresses?

- **Default:** the search calls the INS backend lookup (`find=<term>`) and lists only results whose postcode starts "BT". The lookup stubs gain a few BT addresses, so the filter and the fill (req-457) can be seen. CDP dev gets the real lookup's results. Other environments follow question 1.
- **Affects:** inc-042 (req-456, req-457).
- **Why it is open:** Design Release 2.1's Northern Ireland search uses a made-up list, which c-178 overrules. The real stubs return only 3 London addresses. No source says how to show a Northern Ireland search outside CDP dev.

## Waiting on others

| Requirement | Waiting for | Increment |
|---|---|---|
| req-147 | MDM team: the master reference-data integration for countries, regions and territories (Rhys's ruling, 7 September 2026) | inc-006 |
| req-149 | MDM team: port reference data with an approved-for-animals attribute, and the service's integration with it | inc-006 |
| req-302 | MDM team: the integration supplies the port list, or a fresh ruling releases the list for editing | inc-007 |
| req-303 | MDM team: correct 3 port names (reported as data quality), or the integration lands. Codes do not change | inc-007 |
| req-304 | MDM team: the integration supplies each port's type (airport or seaport) | inc-007 |
| req-370 | MDM team: the integration supplies the country list, or a fresh ruling releases it | inc-007 |
| req-432 | MDM team: the integration supplies the countries list. The hard-coded list is not edited meanwhile | inc-008 |
| req-644 | MDM team: the integration supplies the country list. The hard-coded list is not edited meanwhile | inc-082 |
| req-509 | CDP: raise the nginx ingress body cap for the animals frontend to at least 50,001,024 bytes, recorded against EUDPA-518 | inc-036 |
| req-905 | Design authority: rule on DR1 row inc-103 (one identifier or all) | inc-147 |
| req-906 | Design authority: rule on DR1 row inc-103 | inc-147 |
| req-908 | Design authority: rule on DR1 row inc-103 | inc-147 |
| req-931 | Design authority: rule on DR1 row inc-103 | inc-147 |
| req-940 | Design authority: rule on DR1 row inc-103 | inc-147 |
| req-910 | PIMS Dynamics: send post-submission outcomes, completed among them, back to the record | inc-116 |
| req-1081 | PIMS Dynamics: send outcomes back. No delay status or reason reaches the service today | inc-142 |
| req-1082 | PIMS Dynamics: send outcomes back. No completed status reaches the service today | inc-142 |
| req-1083 | PIMS Dynamics: send outcomes back. No inspection decision reaches the service today | inc-142 |
| req-1085 | PIMS Dynamics: send outcomes back. Until then no card is in these statuses | inc-142 |
| req-1735 | PIMS Dynamics: send outcomes back, so notifications can count as needing action or status-updated | inc-142 |
| req-1739 | PIMS Dynamics: send the completed outcome back | inc-142 |
| req-977 | Import-checking systems: send inspection and delay outcomes for each notification | inc-143 |
| req-1001 | Import-checking systems: send inspection and delay outcomes for each notification | inc-143 |
| req-1011 | Import-checking systems: send which notifications are chosen for inspection | inc-144 |
| req-979 | A germinal products journey and dashboard whose notifications reach the INS read model (re-check in step 0) | inc-145 |
| req-1736 | As req-979 (re-check in step 0) | inc-172 |
| req-1737 | As req-979 (re-check in step 0) | inc-172 |
| req-1738 | As req-979 (re-check in step 0) | inc-172 |
| req-982 | Plants teams: trade-imports-plants-frontend and -backend publish notifications to the INS read model | inc-146 |

## Settled without a question

"(challenge)" marks the 35 conflicts the challenge settled against the ruling. Missing ids (c-046, c-051, c-086, c-118, c-137, c-182, c-199, c-200) were merged or withdrawn during reconcile.

| Decision | Settled by | Conflict |
|---|---|---|
| Country of origin list keeps MDM's content; the prototype's names, labels and prefixes go to MDM as a content report | DR1 notes | c-001 |
| Country of origin is stored as its ISO code and shown by name | Ruling | c-002 |
| Origin page keeps all three return controls | DR1 notes | c-003 |
| Saving origin with no country lands on the overview | Ruling | c-004 |
| Origin page keeps its server checks; a refused save stores nothing | Ruling | c-005 |
| Accessibility and no-JavaScript duties override Design Release 2.1 only as far as they need to | Ruling (challenge) | c-006 |
| A start from the all-types dashboard asks "What are you importing?" first | Ruling (challenge) | c-007 |
| Region code prefix follows the country live, as a progressive enhancement | DR1 backlog | c-008 |
| Country control takes Design Release 2.1's copy and behaviour | Ruling | c-009 |
| Region code hint changes, box caps at 5 characters, server check stays | Ruling | c-010 |
| Internal reference hint drops the 58-character sentence; the limit stays | Ruling | c-011 |
| With JavaScript, commodity search lists results as you type | Ruling (challenge) | c-012 |
| Commodity search hint takes Design Release 2.1's wording | DR2.1 source | c-013 |
| Correct the prototype's species typos rather than copy them | Ruling (challenge) | c-014 |
| Commodity pages chain as journey steps | DR2.1 source | c-015 |
| Commodity details keeps the three return controls (DR1 rule (b)) | DR1 notes | c-016 |
| "Error: " title prefix stays | Ruling | c-017 |
| Commodity details still redirects when no commodity is chosen | Ruling | c-018 |
| Live-animal number of packages stays optional but validated | Ruling | c-019 |
| Cat and dog species take Design Release 2.1's names | DR2.1 source | c-020 |
| After a change from check answers, both commodity pages return there | Ruling (challenge) | c-021 |
| Germinal "Total gross weight" is stored and sent as gross weight | Ruling (challenge) | c-022 |
| Answers stay stored as service codes | Ruling | c-023 |
| Off-list values are refused; a refused submit saves nothing | Ruling | c-024 |
| One shared destination country and port of exit, prefilled in each reveal | DR1 backlog | c-025 |
| Destination country list adopted, blocked until MDM supplies it | DR1 notes | c-026 |
| Port of exit list adopted, blocked until MDM supplies animal-approved ports | DR1 backlog | c-027 |
| "Error: " title prefix stays | Ruling | c-028 |
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
| Identification page keeps the real address, guards and tokens | Ruling | c-039 |
| Identifier limit and stale-action safeguards stay | Ruling | c-040 |
| An animal counts as entered only when every identifier has a value | Ruling | c-041 |
| Each blank identifier gets its own error | Ruling (challenge) | c-042 |
| Commodity details refuses a count below the saved records | DR1 backlog | c-043 |
| Permanent address leaves the identification page for its own page | Ruling | c-044 |
| Arrival and transit keep every server-side field check | Ruling | c-045 |
| Pages keep submitting and storing codes | Ruling | c-047 |
| Port of entry and transit country lists wait for MDM | DR1 notes | c-048 |
| Arrival date is the expected arrival at the port of entry | Ruling (challenge) | c-049 |
| Arrival date hint keeps its wording with an example inside the window | Ruling | c-050 |
| Each transporter row gets "View details" to its address book entry | Ruling (challenge) | c-052 |
| Status strip follows Design Release 2.1 page by page on transporter pages | Ruling (challenge) | c-053 |
| Private transporter country list adopted, blocked on MDM | DR1 notes | c-054 |
| A commercial transporter with a non-Northern Ireland country is refused | Ruling | c-055 |
| Add transporter forms follow DR1's return-control judgement | DR1 notes | c-056 |
| Design Release 2.1's shipped commercial transporters and statuses are adopted | Ruling | c-057 |
| Added transporters stay scoped to the organisation | Ruling | c-058 |
| Documents page moves to "upload-documents" | DR2.1 source | c-059 |
| Documents Back returns to the review when come from it, else the overview | DR2.1 source | c-060 |
| Row drops the leading "An" | DR2.1 source | c-061 |
| Row drops the leading "An" | DR2.1 source | c-062 |
| Document reference hint removed | DR2.1 source | c-063 |
| Document reference keeps its 58-character limit | Ruling | c-064 |
| Document references accept punctuation; the backend drops its pattern | DR2.1 traces | c-065 |
| Document type travels as the service code | Ruling | c-066 |
| Date of issue hint "For example, 27/3/2026" | DR2.1 source | c-067 |
| Size bullet opens "files that are smaller than" | DR2.1 source | c-068 |
| File limit becomes 50MB everywhere | DR1 backlog and DR2.1 source | c-069 |
| File-type bullet drops the leading "a" | DR2.1 source | c-070 |
| Stated file rules stay enforced | Ruling | c-071 |
| GOV.UK file upload component stays | DR1 backlog | c-072 |
| Chosen file is not kept after a server error | Ruling | c-073 |
| Typed values are not restored after an over-cap body | Ruling | c-074 |
| Maximum-documents error points at the Attachment field | DR2.1 source | c-075 |
| Hidden column heading becomes "Action" | DR2.1 source | c-076 |
| Empty-state line goes | DR2.1 source | c-077 |
| Virus scanning stays real, with failure states | Ruling | c-078 |
| View file stays for clean documents | Ruling | c-079 |
| Save and continue stops waiting for scans; a rejected document still holds | DR2.1 specs | c-080 |
| Upload documents continues to consignment addresses, or back to where the trader came from | DR2.1 source | c-081 |
| Save and return checks and saves a part-filled document | DR2.1 source | c-082 |
| Upload documents link opens once the origin is answered | DR2.1 specs | c-083 |
| Documents are stored durably by the backend | Ruling | c-084 |
| Document types drop "Health certificate" | Ruling (challenge) | c-085 |
| Roles and addresses keeps its summary list, with full addresses | DR1 backlog | c-087 |
| Fraud warning ends with a full stop | DR2.1 source | c-088 |
| Each empty row's add link names what it adds | DR2.1 source | c-089 |
| Answered party rows show the whole address | DR2.1 source | c-090 |
| 05111000 and 05119985 also skip the CPH number | DR2.1 source | c-091 |
| Roles and addresses continues to contact address, or the overview once complete | DR2.1 source | c-092 |
| Picker's "Add a new address" looks and sits as drawn | DR2.1 source | c-093 |
| Pickers show one page per role, a live filter and a no-JavaScript search | DR1 backlog | c-094 |
| Picker count wording follows Design Release 2.1 | DR2.1 source | c-095 |
| Picker address column shows one line per address line | DR2.1 source | c-096 |
| Picker rows get a "View" link to the INS address book | DR2.1 source | c-097 |
| A blank picker save returns to roles and addresses, party unchanged | DR2.1 source | c-098 |
| Party pickers end with the primary button alone | DR1 notes | c-099 |
| DR1's address-page blocks do not stop these differences | Ruling | c-100 |
| Records with no role yet appear on every picker | Ruling (challenge) | c-101 |
| Place of origin picker searches by country as drawn | DR2.1 source | c-102 |
| The party is named "Consignor" | DR2.1 source | c-103 |
| Roles and addresses completes when every shown section is complete | DR2.1 source | c-104 |
| Picker search has a medium label and an icon button "Search" | DR2.1 traces | c-105 |
| Journey add-address stays on the INS address book through today's handshake | Ruling (challenge) | c-106 |
| Manual-entry Country list waits for MDM | Ruling | c-107 |
| Add-address keeps the address book's length and email checks | Ruling | c-108 |
| Add-address keeps GOV.UK accessibility patterns | Ruling | c-109 |
| CPH page keeps "Save and continue" alone | DR1 notes | c-110 |
| Permanent address page ends with "Save and continue" alone | DR1 notes | c-111 |
| CPH is stored as 9 digits and shown as 12/345/6789 | Ruling | c-112 |
| CPH page can be saved blank | DR2.1 source | c-113 |
| Part-filled CPH numbers are still checked | Ruling | c-114 |
| CPH Back and Save go to consignment addresses | DR2.1 source | c-115 |
| Addresses page continues to contact address; CPH is reached from its link | DR2.1 traces | c-116 |
| CPH help's second paragraph takes Design Release 2.1's wording and link | Ruling (challenge) | c-117 |
| Permanent address page and same-as-destination are built now | Ruling | c-119 |
| Contact page's sentence, structure and add-a-branch are built now | Ruling | c-120 |
| Contact page offers only the organisation's branch addresses | DR2.1 source (DR1 agrees) | c-121 |
| A blank contact save shows "Select a contact address" | DR2.1 source | c-122 |
| Contact page continues to review; Back goes to consignment addresses | DR2.1 source | c-123 |
| Contact stays complete when the address-book record goes | Ruling | c-124 |
| Contact page drops the "Current contact address" card and edit route | Ruling (challenge) | c-125 |
| A new permanent address keeps its county and fields | Ruling | c-126 |
| Hub "Cancel amend" opens the cancel-amendment confirmation | Ruling (challenge) | c-127 |
| Each notification keeps its own hub address | Ruling | c-128 |
| Hub keeps the GOV.UK Task list component | Ruling | c-129 |
| Transport card shows the transporter's stored country | Ruling | c-130 |
| Submitted view shows the notification's own answers | Ruling | c-131 |
| Declaration submit keeps its completeness re-check | Ruling | c-132 |
| Identifier-driven outstanding items adopted, blocked on DR1 inc-103 | DR1 notes | c-133 |
| Review names unfinished commodity and species answers as drawn | DR2.1 source | c-134 |
| Review error summary has one entry per unfinished card | Ruling (challenge) | c-135 |
| Amend review opens without errors; an incomplete amendment is refused with errors | Ruling | c-136 |
| Review drops row-level "Edit details" links | Ruling | c-138 |
| Review keeps errors from real validation | Ruling | c-139 |
| Review keeps virus-scan errors | Ruling | c-140 |
| Transit countries move into Arrival details on the review | DR2.1 source | c-141 |
| Subsection headings above review cards go | DR2.1 source | c-142 |
| "Return to your dashboard" and the view's Back go to the INS overall dashboard | Ruling (challenge) | c-143 |
| Continue on an action-required view starts an amendment | Ruling | c-144 |
| INS root becomes the Design Release 2.1 overall dashboard | DR2.1 source (DR1 agrees) | c-145 |
| Home caption "Dashboard", heading "Import notification service" | DR2.1 source (DR1 agrees) | c-146 |
| "Create new" always shows and goes to the type choice | Ruling | c-147 |
| Glance counts come from the organisation's real notifications | Ruling | c-148 |
| "Action needed" means a submitted notification missing a required document | Ruling (challenge) | c-149 |
| No "Messages" link or unread count | Ruling (challenge) | c-150 |
| Plants "View dashboard" links to the real plants dashboard | Ruling | c-151 |
| Plants glance cards link like the others; counts wait on plants data | Ruling (challenge: waits on a blocker) | c-152 |
| "Log out" stays | Ruling | c-153 |
| Drill-down cards keep status-driven links | DR1 notes | c-154 |
| Drill-downs apply the chosen search and sort | Ruling | c-155 |
| Home and drill-downs take Design Release 2.1's styling | DR2.1 traces | c-156 |
| Drill-downs are always sorted, "Newest first" by default | DR1 notes | c-157 |
| Per-category glance cards replace DR1's band | Ruling | c-158 |
| INS frontend hosts the /live-animals and /germinal-products lists | Ruling (challenge) | c-159 |
| Drafts keep Resume, Copy as new and Delete; submitted cards keep status actions | Ruling (DR1 inc-030) | c-160 |
| List is always sorted: "Newest first", "Oldest first", "Arrival date" | DR1 notes | c-161 |
| Search, sort and filters really change the list | Ruling | c-162 |
| Page links keep tab, sort, search and filters | Ruling | c-163 |
| Card writes the arrival date as "21 June 2026" | Ruling (challenge) | c-164 |
| Amending notifications sit in "In progress" with an "Amending" tag | Ruling (challenge) | c-165 |
| Unreadable or reversed filter dates show GOV.UK errors | Ruling (challenge) | c-166 |
| DR1's deferred dashboard rows do not hold back Design Release 2.1 | Ruling | c-167 |
| Address book shows 8 a page | DR2.1 source | c-168 |
| Address book search runs on the server, with live filtering on top | Ruling (challenge) | c-169 |
| Address book honours same-site and approved cross-origin returns | Ruling (challenge) | c-170 |
| INS list drops controls Design Release 2.1 lacks | Ruling | c-171 |
| Address book stays persisted and organisation-wide | Ruling | c-172 |
| Address view reads the book only | Ruling | c-173 |
| View link keeps the visually hidden name | Ruling | c-174 |
| Log out stays in the INS navigation | Ruling | c-175 |
| Address records gain their uses | Ruling | c-176 |
| Country select content stays with reference data and MDM | DR1 notes | c-177 |
| Address search uses the real address lookup | Ruling | c-178 |
| Length limits and email check stay | Ruling | c-179 |
| Error-state accessibility stays | Ruling | c-180 |
| Addresses persist; an edit keeps every use | Ruling | c-181 |
| Templates are stored by the backend | Ruling | c-183 |
| A template is private to the user who saved it | Ruling (challenge) | c-184 |
| Templates "Sort by:" is built as drawn | Ruling (challenge) | c-185 |
| A template saves each party's address separately | Ruling (challenge) | c-186 |
| Using a template seeds the transporter's country | Ruling (challenge) | c-187 |
| No saving a template by GET | Ruling | c-188 |
| Amend, cancel amendment and copy start by form posts | Ruling | c-189 |
| Amend and cancel-amendment confirmations are dialogs as drawn | Ruling | c-190 |
| Confirming an amendment lands on the amend review | DR2.1 source | c-191 |
| Amendment edits are saved to the record | Ruling | c-192 |
| Delete stays a soft delete | Ruling | c-193 |
| Dashboard cards keep status-driven actions | DR1 notes | c-194 |
| Design Release 2.1 copy adopted on the delete and cancel-amend pages | DR1 backlog | c-195 |
| A copy carries exactly Design Release 2.1's list | DR2.1 source | c-196 |
| Copying mid-amendment copies the submitted version | DR2.1 source | c-197 |
| Guards, delete and view Back return to the INS overall dashboard | DR2.1 source | c-198 |
| Continue on the amend review is held while anything is invalid, with an error summary | Ruling (challenge) | c-201 |
| Reason for import is asked before commodity details | DR2.1 source | c-202 |
| CPH number is reached only from its roles and addresses row | DR2.1 source | c-203 |
| Pages opened from the overview return to it on save | DR2.1 source | c-204 |
| Opening run always ends on the review page | DR2.1 source | c-205 |
| Back follows the page's context, else the previous page | DR2.1 source | c-206 |
| Origin page offers the overview return controls | Ruling (DR1 inc-161) | c-207 |
| Pickers, CPH and permanent address pages end with the primary button alone | Ruling (DR1 rule (b)) | c-208 |
| Contact page return controls say "hub", as drawn | Ruling | c-209 |
| While amending, overview pages get the amend ending; pickers, CPH and permanent address show "Save and return" | Ruling (challenge) | c-210 |
| "Save and return to overview" skips required-answer checks but not format checks | Ruling (challenge) | c-211 |
| Log out stays last in the navigation | Ruling | c-212 |
| Address book item goes to the INS /address-book | Ruling | c-213 |
| Logo links to gov.uk; service name to each frontend's dashboard | Ruling (challenge) | c-214 |
| Feedback link stays the APHA service desk email | DR1 backlog | c-215 |
| No page shows the signed-in identity | Animals frontend | c-216 |

## Already in place

731 adopted requirements are met today. The second column names where today's evidence shows it. Statements are cut short; the full text is in `distil/requirements.json`.

| Requirement | What already exists |
|---|---|
| req-009 Starting a notification from the live-animals (category) dashbo... | E2E, animals FE |
| req-011 A new notification gets a reference GBN-AG-<two-digit year>- fo... | E2E, animals FE |
| req-012 The origin page has the browser title 'Origin of the import - I... | E2E |
| req-014 The country of origin question reads 'Country of origin', as th... | E2E, animals FE |
| req-021 Choosing a country from the results closes the list and leaves ... | E2E, animals FE |
| req-022 When nothing matches what was typed, the country results show a... | animals FE |
| req-023 The country of origin is submitted and stored as its code (an I... | E2E, animals FE |
| req-024 A saved country of origin, including a subdivision, is shown ag... | E2E |
| req-025 The places offered as country of origin are the MDM country lis... | animals FE |
| req-031 A submitted country not in the list is refused with 'Select a c... | animals FE |
| req-032 The country of origin does not block saving the origin page: th... | E2E |
| req-033 Saving the origin page with no country sets the user down on th... | E2E, animals FE |
| req-035 The origin page asks 'Does the consignment have a region of ori... | E2E |
| req-037 Answering Yes reveals, under the Yes option, a 5-character-wide... | E2E |
| req-039 The server still refuses a region code longer than 5 characters... | animals FE |
| req-042 Without JavaScript, the region code prefix is drawn by the serv... | E2E |
| req-043 The region code prefix is the chosen country's two-letter code,... | E2E |
| req-044 The region code is trimmed, upper-cased and stored as prefix, h... | E2E, animals FE |
| req-045 Answering Yes and leaving the region code empty (or holding onl... | E2E |
| req-047 The region of origin code question may be left unanswered on sa... | animals FE |
| req-048 The origin page has an optional free-text field labelled 'Your ... | E2E, animals FE |
| req-050 An internal reference over 58 characters is refused with 'Inter... | animals FE |
| req-051 The origin page ends with 'Save and continue', a secondary 'Sav... | E2E, animals FE |
| req-052 A valid origin page with a country continues to the commodity p... | E2E |
| req-053 A refused origin save is not stored: the server answers 400 and... | animals FE |
| req-054 The type and origin pages have an accessible build where the pr... | E2E, animals FE |
| req-055 The origin form is a server-validated POST (novalidate) carryin... | E2E, animals FE |
| req-056 The three origin questions (country label, region code legend, ... | animals FE |
| req-060 The reference data service serves GET /countries: a JSON array ... | reference data |
| req-061 The reference data service reads countries from MDM's geography... | reference data |
| req-062 The reference data service caches MDM countries per blocks valu... | reference data |
| req-063 The reference data service answers an empty MDM countries resul... | reference data |
| req-064 The reference data service stays the shared home for MDM-source... | reference data |
| req-066 The commodity page has the browser title 'What are you importin... | animals FE |
| req-070 A closed 'Help with commodity codes' details component below th... | animals FE |
| req-077 Search results are grouped under a header naming the commodity ... | E2E, animals FE |
| req-078 The commodity search matches a species' common name and Latin n... | animals FE |
| req-079 A search that matches nothing says 'No results found' and lists... | animals FE |
| req-082 Once something is chosen, the selected panel is headed '<N> sel... | animals FE |
| req-083 Species from several commodities can be chosen on one notificat... | E2E, animals FE |
| req-084 Reopening the commodity page shows the species already saved on... | animals FE |
| req-086 When the commodity page or the Commodity details page shows an ... | animals FE |
| req-090 The commodity page and the Commodity details page each end with... | E2E, animals FE |
| req-104 The Commodity details page has the title 'Commodity details - I... | animals FE |
| req-106 The Selected commodities table has one row per commodity, excep... | animals FE |
| req-107 Below the Selected commodities table an 'Add another commodity'... | animals FE |
| req-109 Opening Commodity details with no commodity on the notification... | animals FE |
| req-110 Commodity details groups the questions under an h2 per commodit... | animals FE |
| req-111 Each live-animal species asks 'Number of animals' with no hint;... | animals FE |
| req-113 For live animals the number of packages is optional, but when g... | animals FE |
| req-115 A species line that holds animal identifier records cannot be s... | animals FE |
| req-116 Commodity details fills each field with the quantity already sa... | animals FE |
| req-120 'Save and return to overview' on Commodity details validates th... | animals FE |
| req-129 The commodity page and Commodity details have no serious or cri... | animals FE |
| req-130 Where Design Release 2.1 uses custom markup that looks the same... | E2E, animals FE |
| req-132 The main import reason page shows the caption 'About the consig... | animals FE |
| req-133 Both pages sit in the journey layout: a Back link, a strip with... | animals FE |
| req-134 The main import reason is one radio choice of five reasons, in ... | animals FE |
| req-135 Each reason carries its hint: Internal market 'For imports of a... | animals FE |
| req-136 A main import reason is optional to proceed: Save and continue ... | E2E, animals FE |
| req-137 Each reason that needs follow-up questions opens them in a stan... | E2E, animals FE |
| req-138 Choosing Internal market reveals the radio question 'Purpose in... | animals FE |
| req-139 Each internal market purpose carries its hint beneath its label... | animals FE |
| req-140 With Internal market chosen and no purpose, Save and continue i... | animals FE |
| req-141 Internal market with a purpose (for example Breeding) saves in ... | E2E, animals FE |
| req-142 Choosing Transhipment or onward travel reveals one question onl... | animals FE |
| req-143 Choosing Transit reveals two selects in this order: 'Port of ex... | animals FE |
| req-144 Choosing Temporary admission horses reveals two questions in th... | animals FE |
| req-146 The destination country selects for transhipment and transit bo... | animals FE |
| req-150 The exit date is one text field using the MOJ date picker, labe... | animals FE |
| req-151 With Transhipment or onward travel chosen and no listed destina... | animals FE |
| req-152 With Transit chosen, a missing port of exit shows 'Select a por... | animals FE |
| req-153 With Temporary admission horses chosen, a blank exit date shows... | animals FE |
| req-154 An exit date that is not a real calendar date (for example 31/2... | animals FE |
| req-155 When the reason page is shown again after a refused submit, the... | animals FE |
| req-156 Only the chosen reason's follow-ups are validated and saved; ch... | E2E, animals FE |
| req-157 The notification holds one destination country and one port of ... | E2E, animals FE |
| req-158 The reason, internal market purpose, certification purpose and ... | animals FE |
| req-159 A submitted reason, certification purpose or unweaned value tha... | E2E, animals FE |
| req-160 When either page is refused on submit, the browser title is pre... | animals FE |
| req-161 When a saved destination country, port of exit or certification... | animals FE |
| req-162 If saving either page fails, the page is shown again with the u... | animals FE |
| req-165 Both pages end with a 'Save and continue' button, a secondary '... | animals FE |
| req-171 The additional details page is headed 'Additional details' (tit... | animals FE |
| req-172 The additional details page asks 'What are the animals certifie... | animals FE |
| req-174 When it applies, the additional details page asks 'Does the con... | animals FE |
| req-176 Both additional details questions are optional to proceed: Save... | E2E, animals FE |
| req-177 The additional details task counts as complete when the page do... | animals FE |
| req-185 Both pages have no serious or critical WCAG 2 A or AA axe viola... | animals FE |
| req-186 Both forms post to their own URL with browser validation off an... | animals FE |
| req-187 Both pages keep their Welsh copy, and every English string this... | animals FE |
| req-188 Both pages are built from govuk-frontend components (radios wit... | animals FE |
| req-194 The page heading (h1) is 'Identification details' and the brows... | animals FE |
| req-195 The heading carries the caption 'About the consignment'. | animals FE |
| req-196 Inset text under the heading reads 'You must add all animal ide... | animals FE |
| req-197 Above the heading, the page shows the notification status strip... | animals FE |
| req-202 The page ends with the shared journey actions: 'Save and contin... | animals FE |
| req-205 Pressing Enter in a field submits the page as 'Save and continu... | E2E, animals FE |
| req-206 The page keeps the real service's mechanics: its address under ... | animals FE |
| req-210 The summary lists every selected commodity, including one with ... | E2E |
| req-211 Each summary row has a 'Change' link (visually hidden suffix na... | animals FE |
| req-212 Below the summary, an 'Add another commodity' link goes to the ... | animals FE |
| req-214 Each species panel has a 'Change number of animals' link (visua... | animals FE |
| req-216 Cattle (0102) are identified per animal by 'Ear tag' then 'Pass... | animals FE |
| req-217 Horses (0101) are identified per animal by 'Microchip', 'Passpo... | animals FE |
| req-218 Other live mammals on 01061900 (cats, dogs, ferrets) are identi... | animals FE |
| req-221 A species whose commodity has no identifier (such as poultry or... | animals FE |
| req-227 Text identifier fields are 20-character-wide text inputs; 'Hors... | animals FE |
| req-228 Each live-animal identifier (microchip, passport, tattoo, ear t... | animals FE |
| req-231 Each identifier error appears in an error summary titled 'There... | animals FE |
| req-232 When a save fails validation, the page is shown again with the ... | E2E |
| req-237 The saved-animals table has an 'Animal' column, one column per ... | animals FE |
| req-238 Each saved row has a 'Remove' button (visually hidden suffix 'a... | animals FE |
| req-239 A saved animal cannot be changed in place: correcting one means... | animals FE |
| req-241 For live animals each panel takes one animal at a time under th... | E2E, animals FE |
| req-242 A species with more than one animal has a panel button 'Save an... | animals FE |
| req-244 A panel save is a full page post that redirects back to the pag... | E2E, animals FE |
| req-245 A stale panel save for a species with every animal already ente... | animals FE |
| req-246 If a species ever holds more saved animals than its number of a... | animals FE |
| req-247 Lowering a species' number of animals on Commodity details belo... | E2E, animals FE |
| req-268 The page has no serious or critical axe violations against WCAG... | animals FE |
| req-269 The summary and saved-animals lists render as GOV.UK tables, an... | E2E |
| req-272 The arrival details page has the heading and page title 'Arriva... | E2E, animals FE |
| req-273 The arrival details page shows the caption 'Transport and arriv... | E2E, animals FE |
| req-274 Arrival details and transit countries both show the notificatio... | E2E, animals FE |
| req-275 The arrival details page's Back link goes to the notification o... | E2E, animals FE |
| req-276 When a page in this area has errors, an error summary titled 'T... | E2E, animals FE |
| req-277 The arrival details page asks five questions in this order: arr... | E2E, animals FE |
| req-279 The arrival date question is labelled 'Arrival date at port of ... | E2E, animals FE |
| req-280 The arrival date hint reads 'The expected date of arrival at th... | E2E, animals FE |
| req-281 The arrival date is one text input enhanced by the MoJ date pic... | E2E, animals FE |
| req-282 The arrival date must fall between 7 days before today and 6 mo... | E2E, animals FE |
| req-283 The arrival date is typed as day/month/four-digit year, leading... | E2E, animals FE |
| req-284 An arrival date that is not a real date (such as 31/2/2026) is ... | animals FE |
| req-285 A typed arrival date outside the window is refused with 'Arriva... | E2E, animals FE |
| req-286 A saved arrival date that has since fallen outside the window i... | animals FE |
| req-287 When arrival details has any error, nothing on the page is save... | E2E, animals FE |
| req-288 The open calendar sits in the flow of the page and pushes the p... | animals FE |
| req-289 Without JavaScript the arrival date stays an editable text inpu... | animals FE |
| req-292 The port of entry question is labelled 'Port of entry'. | E2E, animals FE |
| req-297 The port of entry type-ahead lists every port when clicked, fil... | E2E, animals FE |
| req-298 When nothing matches what is typed in the port search, it says ... | E2E, animals FE |
| req-300 The port options come from the reference-data service's GET /po... | E2E, animals FE, reference data |
| req-301 When MDM answers the ports call with no body or no result list,... | reference data |
| req-305 A submitted port not in the list is refused with 'Select a vali... | E2E, animals FE |
| req-306 A saved port that is no longer offered is flagged when the page... | animals FE |
| req-307 Without JavaScript the port of entry is a native select linked ... | E2E, animals FE |
| req-308 Means of transport is a select labelled 'Means of transport to ... | E2E, animals FE |
| req-313 Means of transport is stored as its reference code (AIRPLANE, R... | E2E, animals FE |
| req-314 A submitted means of transport that is not a reference code is ... | animals FE |
| req-316 Arrival date, port of entry, transport identification and trans... | E2E, animals FE |
| req-317 The transport identification question is labelled 'Transport id... | E2E, animals FE |
| req-319 Below the lead-in, the transport identification hint is a bulle... | E2E, animals FE |
| req-320 The transport document reference question is labelled 'Transpor... | E2E, animals FE |
| req-321 The transport document reference hint reads 'Enter the referenc... | E2E, animals FE |
| req-322 Transport identification longer than 58 characters is refused w... | animals FE |
| req-323 A transport document reference longer than 58 characters is ref... | animals FE |
| req-324 Transport identification and transport document reference are t... | animals FE |
| req-325 Arrival details and transit countries each end with 'Save and c... | E2E, animals FE |
| req-326 Reached in the journey's page order, Save and continue on arriv... | E2E, animals FE |
| req-330 Saved arrival answers are shown again when the user returns: th... | E2E, animals FE |
| req-331 The overview's 'Arrival details' task shows Complete only when ... | E2E, animals FE |
| req-333 When a save fails, arrival details and transit countries re-ren... | animals FE |
| req-334 Each form on both pages posts back without browser validation a... | E2E, animals FE |
| req-335 Arrival details (with the calendar open) and transit countries ... | animals FE |
| req-336 The type-aheads on both pages are built from accessible-autocom... | E2E, animals FE |
| req-337 The transit countries page is served at the journey slug 'trans... | E2E, animals FE |
| req-339 The transit countries page heading is 'Which countries will the... | E2E, animals FE |
| req-340 The transit countries page shows the caption 'Movement' above i... | E2E, animals FE |
| req-341 Below the heading the page says 'Countries the consignment will... | E2E, animals FE |
| req-342 A second paragraph says 'This does not include the United Kingd... | E2E, animals FE |
| req-345 The transit countries page opens straight on a country search, ... | E2E, animals FE |
| req-346 The transit country search shows the placeholder 'Search for a ... | animals FE |
| req-347 The transit country type-ahead filters on what is typed from a ... | E2E, animals FE |
| req-350 Without JavaScript, the transit country search is a native sele... | E2E, animals FE |
| req-351 Each transit country's Remove control reads 'Remove' with the c... | E2E, animals FE |
| req-352 When arrival details or transit countries shows a validation er... | E2E, animals FE |
| req-355 Both searches report to screen readers through a visually hidde... | animals FE |
| req-357 Added transit countries are listed under a 'Country' column hea... | E2E, animals FE |
| req-358 Transit countries are optional: Save and continue with none add... | E2E, animals FE |
| req-359 Saved transit countries are listed again when the user returns ... | E2E, animals FE |
| req-360 Transit countries are stored as a list of country codes. | animals FE |
| req-361 Saving arrival details with a means of transport other than Rai... | E2E |
| req-362 Pressing 'Add country' with nothing chosen is refused with 'Ent... | E2E, animals FE |
| req-363 Adding a country already in the list is refused with 'You have ... | E2E, animals FE |
| req-364 A country not on the offered list, added or saved, is refused w... | animals FE |
| req-365 A saved transit list holding a country no longer offered is fla... | animals FE |
| req-366 At most 12 transit countries can be added: when the twelfth is ... | animals FE |
| req-367 Saving more than 12 transit countries is refused with 'Select u... | animals FE |
| req-368 The 12-country cap is not stated before the user reaches it. | animals FE |
| req-371 The overview shows a 'Transit countries' task between 'Arrival ... | E2E |
| req-373 No rule stops the country of origin being added as a transit co... | animals FE |
| req-374 The notification review shows the arrival date under the label ... | animals FE (DR1 build, row B-053) |
| req-379 The transporter list page has the caption 'Transport and arriva... | animals FE |
| req-380 Under the heading, the transporter list says 'This is the perso... | animals FE |
| req-381 The transporter list states 'Your transporter must hold a valid... | animals FE |
| req-382 The transporter list links to the economic-activity section of ... | animals FE |
| req-384 The transporter list states 'Documents issued by DAERA are vali... | animals FE |
| req-385 The transporter list and the 'Add a commercial transporter' pag... | animals FE |
| req-388 The transporter search box is labelled 'Search' with the hint '... | animals FE |
| req-391 Transporter search ignores letter case and accents and trims th... | animals FE |
| req-393 Transporters are listed in a table inside the 'Select a transpo... | animals FE |
| req-395 Each row's Status is a tag: 'Approved' in green and 'New' in ma... | animals FE |
| req-400 A row's Address cell is the address parts joined with commas, b... | animals FE |
| req-401 Transporters the organisation has added are listed first, newes... | animals FE |
| req-402 Saving the transporter list with no transporter chosen shows no... | E2E, animals FE |
| req-403 A submitted transporter that is not on the organisation's list ... | animals FE |
| req-404 Choosing a transporter saves it on the notification with its ty... | animals FE |
| req-406 The transporter list ends with 'Save and continue', a secondary... | animals FE |
| req-409 The transporter list's Back link goes to the notification overv... | animals FE |
| req-411 The overview's 'Transport details' task links to the transporte... | E2E, animals FE |
| req-412 The transporter list is the journey's one transporter step, rea... | animals FE |
| req-415 The 'Choose a transporter type' page has the caption 'Add a new... | animals FE |
| req-418 The type page offers 'Private transporter' (no hint) then 'Comm... | animals FE |
| req-423 The type page's Back link returns to the transporter list; ever... | animals FE |
| req-424 The type page remembers the type chosen and checks it on return... | animals FE |
| req-426 Changing the transporter type removes the saved transporter of ... | E2E, animals FE |
| req-430 The private transporter form asks, in order, 'Name or organisat... | animals FE |
| req-433 On the private transporter form, a missing country shows 'Selec... | animals FE |
| req-435 On the private transporter form, a blank required field shows i... | animals FE |
| req-436 On the private transporter form, over-long values are refused: ... | animals FE |
| req-437 On both add forms, an invalid save re-renders the page with eve... | animals FE |
| req-439 Both add forms trim surrounding spaces from every value before ... | animals FE |
| req-445 The commercial banner repeats the list's authorisation guidance... | animals FE |
| req-446 The commercial transporter form asks, in order, 'Transporter au... | animals FE |
| req-452 On the commercial transporter form, a blank name, address line ... | animals FE |
| req-453 On the commercial transporter form, over-long values are refuse... | animals FE |
| req-454 A commercial transporter's country is fixed to Northern Ireland... | animals FE |
| req-455 A commercial transporter posted with a country other than North... | animals FE |
| req-459 A saved transporter is recorded as type Private or Commercial w... | animals FE |
| req-460 Both add forms' Back links go to 'Choose a transporter type', a... | animals FE |
| req-464 Transporters a trader adds belong to the organisation, not the ... | animals FE |
| req-466 If saving on a transporter page fails in a recoverable way, the... | animals FE |
| req-467 Every transporter form posts a CSRF crumb and a concurrency tok... | E2E, animals FE |
| req-468 The transporter pages are built from GOV.UK Frontend components... | E2E, animals FE |
| req-473 The notification review shows the chosen transporter as Name, A... | E2E |
| req-474 A trader can submit a notification whose transporter was added ... | E2E |
| req-476 The transporter pages show the Alpha phase banner and the servi... | animals FE |
| req-478 The page title is 'Upload documents - Import notification servi... | animals FE |
| req-479 Above the caption the page shows the notification's status as a... | animals FE |
| req-480 Opened from the overview or the journey, the page's 'Back' link... | animals FE |
| req-483 The page opens with: 'You must attach an ITAHC if this consignm... | animals FE |
| req-484 The guidance continues 'Other documents you may need to attach ... | animals FE |
| req-485 The guidance sits above the 'File upload' card, so the trader r... | animals FE |
| req-486 A details component titled 'Check which additional documents yo... | animals FE |
| req-487 The additional-documents row 'Livestock transiting bluetongue r... | animals FE |
| req-490 Inside the details component a link 'Check the documents you ne... | animals FE |
| req-491 The GOV.UK guidance link's text is the whole phrase 'Check the ... | animals FE |
| req-492 The add-a-document fields, the 'Save and add another' button an... | animals FE |
| req-493 The first field is a text input labelled 'Document reference'. | animals FE |
| req-495 A blank document reference, after surrounding spaces are trimme... | animals FE |
| req-496 A document reference longer than 58 characters shows 'Document ... | animals BE, animals FE |
| req-498 The second field is a select labelled 'Document type' with no h... | animals FE |
| req-500 The document type is submitted, stored and published by its cod... | E2E, animals BE |
| req-501 Choosing 'Other' as the document type asks for no further descr... | animals BE |
| req-502 No document type, or a type the page did not offer, shows 'Sele... | animals FE |
| req-503 The fields come in the order Document reference, Document type,... | animals FE |
| req-504 The third field is a single text input labelled 'Date of issue'... | animals FE |
| req-506 A blank date of issue shows 'Enter a date of issue'; a date tha... | animals FE |
| req-507 The fourth field is labelled 'Attachment', and its hint opens '... | animals FE |
| req-511 The hint's third bullet reads 'up to a maximum of 15 files', an... | animals FE |
| req-512 The hint's fourth bullet reads 'ZIP files are not allowed for s... | animals FE |
| req-513 The service enforces the file rules it states: the file picker ... | E2E, animals FE |
| req-514 No chosen file shows 'Upload a document' in the summary and on ... | animals FE |
| req-515 The attachment is a drop zone that says 'No file chosen' in a p... | animals FE |
| req-516 Without JavaScript the Attachment field is a plain visible file... | E2E |
| req-517 A file error is drawn on the drop zone itself (error border and... | animals FE |
| req-518 On the Attachment field the error message sits after the 'Your ... | animals FE |
| req-519 A secondary 'Save and add another' button inside the File uploa... | animals FE |
| req-520 Save and add another with nothing entered shows an error summar... | animals FE |
| req-521 The error summary appears at the top of the main content, above... | animals FE |
| req-522 When the upload documents page shows an error the browser title... | animals FE |
| req-523 After a validation error the document reference, type and date ... | animals FE |
| req-524 After a server-side validation error the chosen file is not kep... | animals FE |
| req-525 When a request body over the size cap reaches the server (no br... | E2E, animals FE |
| req-526 A notification holds at most 15 documents. Adding a sixteenth s... | E2E, animals FE |
| req-529 Once a document is added, a table inside the File upload card, ... | animals FE |
| req-531 A document's Status shows a blue 'Scanning for virus' tag while... | animals FE |
| req-532 Every file is really virus scanned. A file the scan rejects sho... | E2E, animals FE |
| req-533 While a document is scanning, the page updates its status witho... | E2E, animals FE |
| req-534 A document that scanned clean has a 'View file' link (hidden te... | E2E, animals FE |
| req-535 Each row has a 'Remove' button styled as a link, usable while t... | animals FE |
| req-536 Each Remove button (and View file link) carries visually hidden... | animals FE |
| req-537 Uploading documents is optional: with no document type chosen, ... | animals FE |
| req-541 The page ends with a primary 'Save and continue' button, a seco... | animals FE |
| req-545 The overview has a section '4. Documents' with one task, 'Uploa... | E2E, animals FE |
| req-546 Each document is saved to the notification as soon as it is add... | E2E, animals BE |
| req-547 The file goes from the browser to the frontend, which sends it ... | animals BE |
| req-548 Documents can be added and removed whatever the notification's ... | animals BE |
| req-549 The documents page stays safe and recoverable: text the trader ... | animals FE |
| req-550 Nothing on the documents page checks that an ITAHC has been att... | animals FE |
| req-551 The documents page has no serious or critical axe violations (W... | animals FE |
| req-556 The roles and addresses page has the page title 'Consignment ad... | animals FE |
| req-559 The roles and addresses page and every party picker show the st... | animals FE |
| req-560 The roles and addresses page's Back link goes to the notificati... | animals FE |
| req-561 The roles and addresses page keeps showing each section as a GO... | animals FE |
| req-562 The roles and addresses page lists its sections in this order: ... | animals FE |
| req-563 Each party section's hint reads: Place of origin 'The address w... | animals FE |
| req-572 Once a party has an address, its add link is replaced by a 'Cha... | E2E, animals FE |
| req-573 Where the CPH section shows, it is headed 'County parish holdin... | E2E, animals FE |
| req-581 Pressing 'Save and continue' on the roles and addresses page ne... | animals FE |
| req-583 The roles and addresses page ends with a 'Save and continue' bu... | animals FE |
| req-585 The overview's '5. Consignment parties' section holds the task ... | animals FE |
| req-586 Each party picker has the page title '<party> - Import notifica... | animals FE |
| req-587 Each party picker's Back link goes to the roles and addresses p... | E2E, animals FE |
| req-589 The consignor, consignee, importer and place of destination pic... | animals FE |
| req-593 Submitting the picker's search, or opening it with a search in ... | E2E, animals FE |
| req-599 The picker lists addresses in a table with a radio column (head... | E2E, animals FE |
| req-602 Reopening a picker for a party that already has an address pick... | animals FE |
| req-604 Saving a picker with an address that is not in the organisation... | animals FE |
| req-605 Each of the five party pickers (place of origin, consignor, con... | E2E, animals FE |
| req-606 Choosing an address on a picker and pressing 'Save and continue... | E2E, animals FE |
| req-607 If saving a picked address fails with a recoverable backend err... | animals FE |
| req-614 Each party picker lists its addresses newest first, so an addre... | E2E |
| req-615 When a search matches no address, the picker shows 'No addresse... | animals FE |
| req-616 Every address-book read from the animals frontend is made on th... | animals FE |
| req-617 A deleted address-book record is never offered on a picker; fet... | animals FE |
| req-618 The animals frontend reads the address book and never writes to... | E2E, animals FE |
| req-620 The roles and addresses page and every party picker have no ser... | animals FE |
| req-630 The 'Add a new address' link to the INS address book carries jo... | E2E, animals FE |
| req-631 The journey's address-return route accepts a return only when i... | animals FE |
| req-632 When a return cannot be completed, the trader goes back to the ... | animals FE |
| req-633 A trader with no INS session who follows 'Add a new address' si... | E2E |
| req-641 The add-address page keeps the labels 'Address line 1', 'Addres... | E2E |
| req-645 Under 'Contact details' the add-address page asks for 'Email ad... | E2E |
| req-661 On the add-address page a blank address line 1 shows 'Enter add... | animals FE |
| req-662 On the add-address page a blank town or city shows 'Enter a tow... | animals FE |
| req-665 On the add-address page email address is required, and a blank ... | animals FE |
| req-667 A failed submit of the add-address page shows an error summary ... | E2E |
| req-668 The add-address page keeps the address book's length and format... | E2E, animals FE |
| req-669 A refused add-address submit answers HTTP 400 and prefixes the ... | E2E, animals FE |
| req-676 An address added from the journey is saved into the signed-in o... | E2E |
| req-677 The add-address page is built from GOV.UK Frontend components (... | E2E |
| req-679 A picked or added address is copied onto the notification, not ... | E2E |
| req-681 Each role and the consignment contact has its own page for edit... | E2E, animals FE |
| req-682 The edit page is headed 'Edit address details', captioned with ... | E2E, animals FE |
| req-683 The edit page explains 'Changes apply to this notification only... | E2E, animals FE |
| req-684 The edit page asks for 'Name or organisation name', 'Address li... | E2E, animals FE |
| req-685 The edit page's buttons are 'Save changes' and a secondary 'Can... | E2E, animals FE |
| req-686 The edit page opens pre-filled with every field of the notifica... | E2E, animals FE |
| req-687 The edit page applies the address book's rules and messages: 'E... | E2E, animals FE |
| req-688 A refused edit answers 400, re-renders 'Edit address details' w... | E2E, animals FE |
| req-689 A valid edit replaces only this notification's copy of the role... | E2E, animals FE |
| req-690 Save, Cancel and Back on the edit page return to where the edit... | E2E, animals FE |
| req-691 If saving an edit fails with a recoverable backend error, the e... | animals FE |
| req-692 The edit page has Welsh copy ('Golygu manylion cyfeiriad', 'Cad... | animals FE |
| req-693 The edit page is built only from GOV.UK Frontend components and... | animals FE |
| req-694 A copy is checked against the notification's address rules: the... | E2E, animals FE |
| req-695 The review keeps today's validation errors that Design Release ... | E2E |
| req-696 While a copy breaks the rules, Continue on the review page is r... | E2E |
| req-697 Correcting the copy on its edit page and saving returns to the ... | E2E |
| req-698 Once a notification is submitted its copied addresses are froze... | E2E |
| req-702 A valid CPH number is stored as nine bare digits, the three par... | animals FE |
| req-703 The CPH page has the caption 'Consignment parties', the single ... | animals FE |
| req-704 The CPH, permanent address and contact address pages show the n... | E2E, animals FE |
| req-705 A collapsed 'What is a CPH number?' details component sits abov... | animals FE |
| req-707 The CPH number is asked as one fieldset with the small legend '... | animals FE |
| req-709 The CPH number is entered in three boxes in one row, laid out w... | animals FE |
| req-715 A partly filled or wrongly formed CPH number is refused with on... | animals FE |
| req-716 CPH errors re-render the page with status 400 and every typed v... | animals FE |
| req-717 A stored CPH number that is not nine digits is flagged on the p... | animals FE |
| req-718 The CPH page opens with three empty boxes when nothing is saved... | E2E, animals FE |
| req-721 The CPH page ends with the primary 'Save and continue' button a... | E2E, animals FE |
| req-723 The CPH and contact address forms post back to their own URL wi... | animals FE |
| req-724 The CPH, permanent address and contact address pages have no se... | animals FE |
| req-730 The permanent address shows the GOV.UK warning 'Providing a fal... | E2E |
| req-731 The permanent address explains 'A permanent address is where an... | E2E |
| req-738 A new permanent address asks for 'Name or organisation name', '... | E2E |
| req-752 The contact address page has the h1 'Contact address for consig... | animals FE |
| req-758 Coming back from the address book add with a not-found error, t... | animals FE |
| req-759 When the animals frontend runs in stub mode, the contact page o... | animals FE |
| req-762 The contact addresses are one list of radios whose value is the... | E2E |
| req-763 No contact address is chosen when the page first opens; on retu... | E2E |
| req-765 Submitting a contact id that is not in the list shows 'Select a... | animals FE |
| req-768 Opened from the hub or the review page, the contact page return... | animals FE |
| req-769 Outside amend, the contact page ends with all three controls: '... | E2E, animals FE |
| req-771 The contact address task is reached from the hub row 'Contact a... | E2E, animals FE |
| req-773 Choosing a contact saves a copy of that address's name and addr... | animals FE |
| req-777 The notification hub's browser title is 'Overview - Import noti... | animals FE |
| req-778 Each notification has its own hub address (under /live-animals/... | animals FE |
| req-779 Above the 'Overview' heading the hub shows the notification's s... | animals FE |
| req-781 Opening the hub leaves the notification saved as a draft: nothi... | E2E |
| req-783 The hub has no back link; the ways off it are the 'Return to da... | animals FE |
| req-784 The hub shows a 'Your commodities' heading (h2) above the commo... | animals FE |
| req-785 For a live-animals notification the first card shows the total ... | animals FE |
| req-786 The hub shows a card for the total number of packages, labelled... | animals FE |
| req-787 The animals and packages totals add up only counts that are pos... | animals FE |
| req-790 Each commodity total card is a static panel (no link or button)... | animals FE |
| req-792 For a notification, the task list is headed 'Notification taskl... | animals FE |
| req-793 For a notification, the task list has exactly six numbered sect... | animals FE |
| req-795 Section 1 holds, in order, 'Where is this consignment coming fr... | animals FE |
| req-796 'Commodity details' is its own row, first in section 2, shown f... | animals FE |
| req-797 'Identification details' shows in section 2, between 'Commodity... | E2E, animals FE |
| req-799 Section 3 always shows 'Arrival details', which opens even befo... | E2E, animals FE |
| req-801 For a notification, section '4. Documents' holds the single row... | E2E, animals FE |
| req-802 Section 'Consignment parties' holds the single row 'Roles and a... | animals FE |
| req-803 Section 'Contact address' holds the single row 'Contact address... | animals FE |
| req-804 Each hub row shows one of two status tags only: a green 'Comple... | animals FE |
| req-805 Every row the hub shows is a link the trader can open at any ti... | animals FE |
| req-806 The hub's task list is built from the GOV.UK Task list componen... | E2E, animals FE |
| req-807 A new notification goes from choosing the notification type to ... | animals FE |
| req-809 A task page opened from the hub has a 'Back' link to the hub an... | E2E |
| req-810 For a notification, the hub ends with a primary 'Review and sub... | animals FE |
| req-811 For a notification, the hub's secondary button is 'Return to da... | animals FE |
| req-812 The hub shows only its main and secondary buttons: there is no ... | animals FE |
| req-813 The hub has no serious or critical WCAG 2 A/AA accessibility vi... | animals FE |
| req-820 The review page reached from the notification hub has the headi... | animals FE |
| req-821 The journey review shows the notification status strip (Draft t... | animals FE |
| req-824 The review's other numbered sections stay as they are, in order... | animals FE |
| req-829 The Origin of import card reads back the country of origin by n... | E2E, animals FE |
| req-834 For an Internal market import, the Main import reason card adds... | animals FE |
| req-836 The Main import reason card shows 'Destination country' for tra... | animals FE |
| req-837 On an editable review each card's Change link opens the page th... | E2E, animals FE |
| req-838 Each Change link names its card for screen readers in visually ... | animals FE |
| req-847 A species with no saved identifiers shows no identification det... | animals FE |
| req-851 The Additional details card shows 'Certified for' (reading 'Ger... | animals FE |
| req-853 The Arrival details card shows 'Port of entry', the arrival dat... | animals FE |
| req-857 The Transport details card shows the transporter's address one ... | animals FE |
| req-861 A document's type reads back by its full name, for example 'Int... | animals FE |
| req-863 The Addresses card has one row per consignment role (Place of o... | E2E, animals FE |
| req-869 On a finished card or a read-only review, an empty answer reads... | animals FE |
| req-870 Inside a card that still has answers outstanding, every empty r... | animals FE |
| req-871 An unfinished card is styled as an error card and shows its mes... | animals FE |
| req-872 An editable review of an unfinished notification shows a 'There... | animals FE |
| req-876 The unfinished-card messages 'Complete arrival details', 'Compl... | animals FE |
| req-881 Uploaded documents are optional to proceed and to submit: the t... | animals FE |
| req-882 A notification is complete enough to submit when origin, commod... | animals FE |
| req-883 The trader reaches the review from the hub's 'Review and submit... | animals FE |
| req-885 The review keeps today's document scan errors: a rejected docum... | animals FE |
| req-887 The review's error summary takes focus only after a refused Con... | animals FE |
| req-901 A submitted notification's view is read-only and shows that not... | E2E, animals FE |
| req-912 The declaration page is titled and headed 'Declaration' and set... | animals FE |
| req-915 The declaration checkbox label reads 'I confirm that I have rev... | animals FE |
| req-916 The declaration page shows 'Date of declaration:' with today's ... | animals FE |
| req-918 The declaration page's Back link goes to the review. | animals FE |
| req-919 Continuing without ticking the declaration re-shows the page wi... | animals FE |
| req-920 The declaration checkbox is shown ticked when the notification ... | E2E, animals FE |
| req-921 Ticking the declaration and pressing Continue submits the notif... | animals FE |
| req-922 The declaration page can be opened without a completeness check... | animals FE |
| req-923 Opening or submitting the declaration for a notification alread... | animals FE |
| req-924 The review and declaration forms post a CSRF crumb and the noti... | animals FE |
| req-925 The review (new, refused and submitted), declaration and confir... | animals FE |
| req-926 The confirmation page is titled 'Import notification submitted'... | animals FE |
| req-930 The confirmation page shows a 'Before the consignment is import... | animals FE |
| req-932 The confirmation page's 'Transporting the consignment' section ... | animals FE |
| req-936 The confirmation page's 'Getting help' section gives importsris... | animals FE |
| req-938 The confirmation page does not repeat the date of declaration, ... | E2E, animals FE |
| req-945 The review, declaration and confirmation stay built from GOV.UK... | animals FE |
| req-956 Every page of both frontends, the home, drill-downs and notific... | INS FE |
| req-957 The home has no back link. | INS FE |
| req-958 The home carries no service-description paragraph: the heading ... | INS FE |
| req-961 'Create new' is a standard primary GOV.UK button link, not a st... | E2E |
| req-966 The service navigation's first item is 'Dashboard', linking to ... | INS FE |
| req-968 The service navigation has an 'Address book' item linking to th... | INS FE |
| req-969 The service navigation keeps 'Log out' as its last item, after ... | INS FE |
| req-970 The service navigation has a 'Manage account' item. | INS FE |
| req-1020 Signing in to the INS front door lands the trader on the home, ... | INS FE |
| req-1021 The home's counts and the drill-downs read from the INS aggrega... | E2E |
| req-1026 The home and drill-downs keep the standard GOV.UK header (logo ... | INS FE |
| req-1027 Following a link from the home into the animals or plants front... | E2E |
| req-1047 After a search the field keeps the searched text, and searching... | animals FE |
| req-1084 A card keeps its status-driven actions, each named for screen r... | animals FE |
| req-1088 The notification list's success banner, the deletion message in... | animals FE |
| req-1089 The list keeps its stale-action banner ('The notification has b... | animals FE |
| req-1091 The list has no serious or critical WCAG 2 A or AA axe violatio... | animals FE |
| req-1094 Deleted notifications never appear on any list or in a search. | INS BE, animals BE |
| req-1095 A newly started notification appears on the list within seconds. | E2E |
| req-1097 The read model behind the list is filled from the notification ... | INS BE |
| req-1104 The list API answers a bad request, such as a page below 1, wit... | INS BE |
| req-1108 The address book lives in the INS frontend at /address-book, re... | E2E, INS FE |
| req-1109 A signed-out user opening any address book page is sent to sign... | E2E, INS FE |
| req-1111 The list page's heading is 'Address book'. | INS FE |
| req-1113 The list page has an 'Add a new address' button (a link styled ... | INS FE |
| req-1120 The address book API keeps its countryCode filter as it is: an ... | address book |
| req-1131 Above the table a results line reads 'Showing <start>-<end> of ... | INS FE |
| req-1138 The Country column shows the country's name, not its code. | E2E, INS FE |
| req-1140 Each row ends with a 'View' link to /address-book/{id}; its acc... | INS FE |
| req-1142 When there is more than one page, GOV.UK pagination shows a num... | INS FE |
| req-1145 The list shows the newest address first, with a stable order fr... | E2E, address book |
| req-1146 After an add, edit or delete the list shows a GOV.UK success no... | INS FE |
| req-1149 The address book is stored by the address book service and belo... | E2E, address book |
| req-1151 No caller can list, read or delete another organisation's addre... | E2E, address book |
| req-1152 Every address book API call must carry a well-formed Trade-Impo... | address book |
| req-1153 The INS frontend calls the address book server-side under /orga... | INS FE |
| req-1155 The address book service logs each request with the caller's or... | address book |
| req-1156 The list API (GET /organisation/{orgId}/addresses) returns a ca... | address book |
| req-1157 Reading one address by id returns it with every stored field, i... | address book |
| req-1158 Deleting an address removes it from the list and search for eve... | E2E, address book |
| req-1159 The address view page is at /address-book/{id}, headed with the... | INS FE |
| req-1160 The view page's summary list always shows, in this order, 'Name... | INS FE |
| req-1163 The view page does not show the address's types or uses, and it... | INS FE |
| req-1165 The view page has a red warning 'Delete' button to /address-boo... | INS FE |
| req-1166 With no return path, the view page's Back link goes to the addr... | INS FE |
| req-1171 When the address book service fails unexpectedly, the list rend... | INS FE |
| req-1172 The list renders in the wide display column; the view and delet... | INS FE |
| req-1173 The list, view and delete pages have no serious or critical axe... | INS FE |
| req-1174 The delete confirmation is served by GET and POST at /address-b... | INS FE |
| req-1181 With no return path, the delete page's Back link goes to the ad... | INS FE |
| req-1182 Confirming the delete deletes the address through the address b... | E2E, INS FE |
| req-1183 The delete form is protected by a CSRF token and posts nothing ... | INS FE |
| req-1184 Deleting an address makes no check on whether a notification us... | INS FE |
| req-1192 Adding and editing an address happen in the INS front door (tra... | INS FE, address book |
| req-1224 On the edit page the name field is labelled 'Name or organisati... | INS FE |
| req-1226 The edit page keeps the 'County (optional)' field between 'Town... | E2E, INS FE |
| req-1227 The add and edit forms ask 'Address line 1', 'Address line 2 (o... | INS FE |
| req-1235 The countries offered come from the reference data service's co... | E2E, INS FE |
| req-1237 Saving without address line 1 shows 'Enter address line 1'. | INS FE |
| req-1238 Saving without a town or city shows 'Enter a town or city'. | INS FE |
| req-1241 Saving without an email address shows 'Enter an email address'. | INS FE |
| req-1243 Address line 2 and county are optional: blank values are accept... | E2E, address book |
| req-1244 Add and edit keep today's length limits and email format check,... | INS FE, address book |
| req-1245 On a validation error the add or edit page is shown again (HTTP... | INS FE |
| req-1246 When the add or edit page shows errors, its browser title keeps... | INS FE |
| req-1247 Every add and edit field is trimmed of surrounding spaces befor... | INS FE |
| req-1257 The add-details step's primary button is 'Save and continue'. | INS FE |
| req-1263 Creating an address persists its full record in the address-boo... | E2E, address book |
| req-1264 Saving an edit fully replaces the address's editable fields thr... | E2E, address book |
| req-1265 An update is refused without change when the body is invalid (4... | address book |
| req-1266 The address-book API answers errors as RFC 9457 problems (appli... | address book |
| req-1267 When the address-book service rejects a save the form is shown ... | INS FE |
| req-1268 Outside prod, a new address can be given an expiry (ADDRESS_TTL... | address book |
| req-1269 The address-book service keeps its API surface and storage as b... | address book |
| req-1271 The edit page at /address-book/{id}/edit opens with the address... | INS FE |
| req-1273 The edit page's buttons are 'Save changes' and a secondary 'Can... | INS FE |
| req-1276 A valid edit returns the user to the address book list (its def... | INS FE |
| req-1280 Every add and edit page highlights 'Address book' in the servic... | INS FE |
| req-1281 The add and edit pages, and their error states, use only GOV.UK... | INS FE |
| req-1282 The add and edit forms post to themselves with browser validati... | INS FE |
| req-1395 Amending moves a SUBMITTED notification to AMEND, keeps its ref... | E2E, animals BE |
| req-1396 Answers changed during an amendment are saved to the notificati... | animals BE, animals FE |
| req-1401 The amend review has no page-header actions (no Amend this noti... | E2E |
| req-1402 The amend review is editable, with a Change link on every card ... | E2E, animals FE |
| req-1405 During an amendment, question pages are prefilled with the noti... | E2E |
| req-1407 Continue on a valid amend review goes to the Declaration page; ... | E2E |
| req-1409 Resubmitting an amendment shows the ordinary 'Import notificati... | E2E |
| req-1412 The cancel-amendment confirm button reads 'Yes, cancel amendmen... | animals FE |
| req-1415 Confirming the cancellation discards every edit made during the... | E2E, animals BE, animals FE |
| req-1418 When copy as new, cancel amendment or delete fails to save, the... | animals FE |
| req-1421 Copy as new goes straight, with no confirmation, to the new dra... | E2E, animals FE |
| req-1422 A copy is a new notification saved at once as a Draft, with its... | E2E, animals BE |
| req-1423 A copy carries over the origin of the import: country of origin... | animals BE, animals FE |
| req-1431 A copy carries over the roles and addresses (place of origin, c... | animals BE |
| req-1436 A copy does not carry over uploaded documents: the copy's Uploa... | E2E |
| req-1438 Copy as new for a notification the trader cannot reach (unknown... | animals BE, animals FE |
| req-1452 The delete confirmation page is titled 'Delete this notificatio... | animals FE |
| req-1453 Confirming the delete (a POST with the CSRF crumb) soft-deletes... | E2E, animals BE |
| req-1459 A deleted notification no longer appears in the notification li... | E2E, animals FE |
| req-1460 Opening or posting delete for a notification the trader cannot ... | animals FE |
| req-1468 The view page shows the notification's answers in the same six ... | animals FE |
| req-1476 The backend notification API supports the lifecycle: create giv... | E2E, animals BE |
| req-1477 A notification is saved as a draft as the trader goes: one reco... | E2E |
| req-1478 The delete and cancel-amendment confirmations, the restored sub... | animals FE |
| req-1488 Apart from what other requirements add to it (the declaration d... | animals BE (as req-1489 to req-1603 record) |
| req-1489 A notification is stored as one document in the MongoDB collect... | E2E, animals BE |
| req-1490 A notification's reference number is unique across all notifica... | animals BE |
| req-1491 The service, never the caller, gives a new notification its ref... | animals BE |
| req-1492 When a generated reference number collides with an existing one... | animals BE |
| req-1493 Every endpoint that takes a reference number in its path refuse... | animals BE |
| req-1494 Every notification carries a concurrency token, returned in eac... | animals BE |
| req-1495 A save sent with a stale concurrency token changes nothing and ... | animals BE |
| req-1496 Submit, amend and cancel-amend take no concurrency token from t... | animals BE |
| req-1497 A notification has exactly one of four lifecycle statuses, DRAF... | E2E, animals BE |
| req-1498 The server stamps created on creation and updated on every writ... | animals BE |
| req-1499 submittedAt records the most recent submission: set to now on t... | animals BE |
| req-1500 In a non-prod environment with NOTIFICATION_TTL_DAYS set, each ... | animals BE |
| req-1501 The expiry sweep runs only where NOTIFICATION_TTL_SWEEP_ENABLED... | animals BE |
| req-1502 Each sweep permanently deletes, at most 10 at a time by default... | animals BE |
| req-1503 The expiry sweep writes no audit record and no outbox event, an... | animals BE |
| req-1504 A sweep that deletes notifications logs 'Expiring <n> notificat... | animals BE |
| req-1505 expireAt and the pre-amend notification and fulfilment snapshot... | animals BE |
| req-1506 The fulfilments payload (each obligation id holding a single va... | E2E, animals BE |
| req-1507 Starting an amendment snapshots the notification content (inlin... | E2E, animals BE |
| req-1508 Wherever the backend needs a notification's content, a record w... | animals BE |
| req-1509 A save body (POST /notifications and PUT /notifications/{refere... | animals BE |
| req-1510 The backend enforces no rule on the notification's content: no ... | animals BE |
| req-1511 The record's origin section holds the country of origin code, w... | E2E, animals BE |
| req-1512 The record's commodity section holds a commodity name and a lis... | E2E, animals BE |
| req-1513 Each species line holds a list of animal identifier units, one ... | E2E, animals BE |
| req-1514 The record holds the reason for import (for example internalMar... | E2E, animals BE |
| req-1515 The record's additional details hold what the animals are certi... | E2E, animals BE |
| req-1516 The record holds six parties, each with an optional name, email... | E2E, animals BE |
| req-1517 Each party is stored as a literal copy of the address-book reco... | E2E, animals BE |
| req-1518 An address is a Standard Address Block named as the address boo... | E2E, animals BE |
| req-1519 The CPH number is stored as one free-text string, the county, p... | E2E, animals BE |
| req-1520 The record's transport section holds the port of entry, the arr... | E2E, animals BE |
| req-1521 The means of transport is one of AIRPLANE, RAILWAY, ROAD_VEHICL... | animals BE |
| req-1522 The transport section holds one transporter with a name, an add... | E2E, animals BE |
| req-1523 The record holds a destination country, a port of exit and an e... | E2E, animals BE |
| req-1524 Every date-only field (arrival date, exit date and any added la... | animals BE |
| req-1525 Calendar dates are stored as ISO-8601 strings ('2026-07-21'), s... | E2E, animals BE |
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
| req-1539 POST /notifications with no reference number creates a notifica... | E2E, animals BE |
| req-1540 Every one of the six write endpoints answers 200 with the whole... | animals BE |
| req-1541 POST /notifications with a reference number updates that notifi... | E2E, animals BE |
| req-1542 Updating through POST /notifications answers 404 'Cannot find n... | animals BE |
| req-1543 PUT /notifications/{referenceNumber} replaces the content and f... | animals BE |
| req-1544 Each write endpoint takes an optional x-cdp-request-id header (... | animals BE |
| req-1545 POST /notifications/{referenceNumber}/submit, with only an opti... | E2E, animals BE |
| req-1546 Submitting from the declaration lands on /notifications/{id}/co... | E2E |
| req-1547 A first submission (from DRAFT) writes a NotificationSubmitted ... | animals BE |
| req-1548 Submit stores the notification as it stands and its event carri... | animals BE |
| req-1549 Every event's payload lists only the accompanying documents who... | animals BE |
| req-1550 An actor sent with a write (inside the save body for POST and P... | E2E, animals BE |
| req-1551 A submission event's versionId is the count of earlier submissi... | animals BE |
| req-1552 Each event for a notification takes the next aggregateVersion, ... | animals BE |
| req-1553 Every write to one notification (create, save, copy's new draft... | animals BE |
| req-1554 For PUT, copy, submit, amend, cancel-amend and soft delete, sav... | animals BE |
| req-1557 GET /notifications/{referenceNumber}/fulfilments returns refere... | E2E, animals BE |
| req-1558 The backend offers no read of one notification's full content b... | E2E, animals BE |
| req-1559 GET /notifications/reference-numbers returns reference strings ... | animals BE |
| req-1560 DELETE /notifications permanently removes the notifications nam... | animals BE |
| req-1561 Every DELETE /notifications request writes a DELETE_NOTIFICATIO... | animals BE |
| req-1562 Any DELETE whose path begins /notifications, and POST /notifica... | animals BE |
| req-1565 The backend defines eight notification lifecycle event types, e... | animals BE |
| req-1566 Each lifecycle action writes its event: amend NotificationAmend... | animals BE |
| req-1567 Outbox events are stored in the MongoDB collection outbox, each... | E2E, animals BE |
| req-1568 Each event carries the notification's full status history so fa... | animals BE |
| req-1569 An event's publish time is stored with it but left out of the p... | animals BE |
| req-1570 A poller (on unless outbox.poller.enabled is false) publishes w... | animals BE |
| req-1571 Events are published to the one SNS FIFO topic set by OUTBOX_SN... | animals BE |
| req-1572 An event with no payload is skipped and logged as an error; an ... | animals BE |
| req-1574 Integration tests prove publication: create then submit publish... | animals BE |
| req-1576 GET /notifications/{referenceNumber}/outbox-events returns all ... | animals BE |
| req-1577 POST /notifications/{referenceNumber}/replay, with the admin se... | animals BE |
| req-1579 A submitted notification reaches PIMS Dynamics by way of the ba... | E2E, animals BE |
| req-1580 A submitted notification appears in PIMS Dynamics as exactly on... | E2E |
| req-1581 The PIMS Dynamics tests read through the Dataverse Web API (ODa... | E2E |
| req-1583 A submitted-notification outbox event can be placed straight on... | E2E |
| req-1585 The GBN-AG event data always carries $model 'defra/certificate-... | animals BE |
| req-1586 exchangedDocument carries identifier (the reference number), tr... | E2E, animals BE |
| req-1588 Each accompanying document is sent as one referenceDocument ent... | animals BE |
| req-1589 Each accompanying-document type is sent with its typeCode: vete... | animals BE |
| req-1590 exchangedDocument.firstSignatoryAuthentication lists declaratio... | animals BE |
| req-1592 specifiedConsignment maps the consignor to consignorParty, the ... | animals BE |
| req-1593 The carrier is sent with the approval number as identifier (url... | animals BE |
| req-1595 A postalAddress is sent as lineOne (address line 1), lineTwo (a... | animals BE |
| req-1596 originCountry is sent as code.value, the ISO country of origin ... | animals BE |
| req-1597 unloadingBaseportLocation is the port of entry code alone (abse... | animals BE |
| req-1598 The transport movement is sent as one mainCarriageLogisticsTran... | animals BE |
| req-1599 isOrHasUnweanedAnimals is sent as true or false from the stored... | animals BE |
| req-1600 includedConsignmentItem holds one consignment item carrying a t... | animals BE |
| req-1601 A species trade line has one individualTradeProductInstance per... | animals BE |
| req-1604 A notification seeded through the animals frontend's save-and-c... | E2E |
| req-1605 The journey's page routes, in order, are origin, commodities, c... | E2E |
| req-1606 The page form fields saved into the record today are: origin co... | E2E |
| req-1607 A page that rejects its submission re-renders with 200 and an e... | E2E |
| req-1608 A notification with only origin and commodity answered reports ... | E2E |
| req-1613 A new notification's opening run takes 'Save and continue' from... | animals FE |
| req-1617 'Save and return to overview' saves the page and takes the user... | E2E |
| req-1618 'Cancel and return to overview' is a link to the overview that ... | E2E |
| req-1619 Every page the overview links to ends with a primary 'Save and ... | E2E, animals FE |
| req-1630 Pages inside a notification (the overview, the question pages a... | E2E, animals FE |
| req-1635 Starting a new notification creates a fresh, empty notification... | E2E, animals FE |
| req-1637 Opening any page of a notification directly sends the user to i... | animals FE |
| req-1638 Every page needs a signed-in session: a signed-out user who ope... | animals FE |
| req-1639 A page opened from the review page returns to the review page o... | E2E, animals FE |
| req-1640 Every journey page is a server-rendered form: a successful save... | E2E, animals FE |
| req-1641 A page refuses 'Save and continue' only for its own hard stops;... | E2E, animals FE |
| req-1644 The transit countries step, and its row on the overview, apply ... | E2E |
| req-1645 The animal identification step follows commodity details only w... | E2E |
| req-1646 The additional details step applies to every live-animals consi... | E2E |
| req-1647 The CPH number applies unless every commodity in the consignmen... | E2E, animals FE |
| req-1648 Each reason for import brings in only its own follow-up questio... | E2E, animals FE |
| req-1649 Only the transporter details that match the chosen transporter ... | E2E |
| req-1650 An answer to a question that no longer applies is not shown, ch... | animals FE |
| req-1651 A notification's arrival date counts as complete only when it f... | E2E |
| req-1653 Each journey page carries the caption of the part of the notifi... | animals FE |
| req-1659 Every new or changed piece of user-facing text has a Welsh vers... | animals FE |
| req-1660 Journey changes keep the frontend's standing structure: the obl... | animals FE |
| req-1661 The service refuses to start when the journey is not fully conf... | animals FE |
| req-1662 Every changed page passes axe with no serious or critical WCAG ... | animals FE |
| req-1663 A page with validation errors shows a GOV.UK error summary titl... | E2E, animals FE |
| req-1664 Date fields take a date as d/m/yyyy with single-digit days and ... | E2E, animals FE |
| req-1674 Log out ends the user's session with the service and sends them... | E2E, INS FE |
| req-1675 The Manage account navigation item is a placeholder on both fro... | E2E, INS FE, animals FE |
| req-1676 The first navigation item, Dashboard, links to the dashboard, w... | E2E, INS FE, animals FE |
| req-1677 The Address book navigation item takes the user to the INS fron... | E2E, INS FE |
| req-1678 The service navigation items appear only to a signed-in user; a... | INS FE, animals FE |
| req-1679 Every page uses the GOV.UK service navigation component, which ... | E2E, animals FE |
| req-1680 The GOV.UK header logo links to https://www.gov.uk/ on both fro... | INS FE, animals FE |
| req-1684 The phase banner's feedback link is an email link to APHAServic... | INS FE, animals FE |
| req-1685 On the animals frontend, every page's browser title reads the p... | animals FE |
| req-1687 When a page shows an error summary, its browser title starts wi... | INS FE, animals FE |
| req-1689 Page content sits in a two-thirds-width column by default, and ... | INS FE, animals FE |
| req-1690 A page shows a GOV.UK back link labelled 'Back' ('Yn ôl' in Wel... | INS FE, animals FE |
| req-1691 A journey page on the animals frontend names its section in a c... | animals FE |
| req-1693 Where a field's own copy gives no message, the shared default v... | INS FE, animals FE |
| req-1694 On the animals frontend, a save that hits a recoverable backend... | animals FE |
| req-1695 On the INS frontend, a page whose service call fails is re-rend... | INS FE |
| req-1696 On the animals frontend, a form post refused because the notifi... | animals FE |
| req-1697 A page inside a notification can show a strip above its content... | animals FE |
| req-1698 Every page's footer offers 'Privacy', 'Cookies' and 'Accessibil... | INS FE, animals FE |
| req-1699 No page shows a cookie banner. | animals FE |
| req-1700 Pages are in English, with no language toggle. Copy falls back ... | INS FE, animals FE |
| req-1701 Every page offers the standard GOV.UK 'Skip to main content' li... | animals FE |
| req-1702 No page shows who is signed in: no email, name or 'signed in as... | E2E, INS FE, animals FE |
| req-1703 On the animals frontend, when sign-in fails the user sees a pag... | animals FE |
| req-1704 On the INS frontend, a failed sign-in shows the unauthorised pa... | INS FE |
| req-1705 An error response is shown as the shared error page with the er... | INS FE, animals FE |
| req-1706 On the animals frontend, the service root / sends a signed-in u... | E2E |
| req-1707 The shared notification actions read 'Copy as new' and 'Delete'... | animals FE |
| req-1708 Address pickers offer a shared 'Add a new address' link. When a... | animals FE |
| req-1710 Sign-in hands off to Defra ID with an OpenID Connect authorisat... | E2E |
| req-1711 After signing in, a user who belongs to more than one organisat... | E2E |
| req-1712 Signing in to one frontend signs the user in to the others with... | E2E |
| req-1713 A session is valid only while it is in the server-side cache (R... | E2E, INS FE |
| req-1714 In stub mode the INS frontend signs a user in at once with no s... | INS FE |
| req-1715 Every form post must carry a valid CSRF token (except under /he... | E2E, INS FE |
| req-1716 The animals frontend sends a Content-Security-Policy on its pag... | E2E |
| req-1719 The tests repo's accessibility suite holds every scanned page t... | E2E |
| req-1720 The accessibility suite walks the live-animals journey from the... | E2E |
| req-1721 The accessibility suite scans the error summary state on the or... | E2E |
| req-1722 The accessibility suite also scans the import reason reveals, t... | E2E |
| req-1723 The animals frontend's own browser tests check that a captioned... | animals FE |
| req-1725 The tests repo's security suite runs a traffic-driven OWASP ZAP... | E2E |
| req-1727 The tests repo signs each worker in once and reuses the session... | E2E |
| req-1728 The INS frontend serves a fixed list of routes, all behind sign... | INS FE |
| req-1729 Each INS dashboard row links out to the animals frontend, which... | INS FE |
| req-1731 The INS address book always sends the signed-in organisation to... | INS FE |
| req-1732 Every change to the INS frontend follows its build rules. It st... | INS FE |

## The increments

Status is **ready** (no unbuilt dependency), **waiting** (waits on earlier rows), **blocked** or **dropped**. A **Review point** is where the loop stops so the owner can look before later rows build on the change. Repos use the keys in the repos table.

| Id | What it delivers | Criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | Opening run follows the Design Release 2.1 step order and ends on the review page | 8 | frontend, tests | | ready, Review point |
| inc-002 | A page opened from an overview task returns to the overview on save | 12 | frontend, tests | inc-001 | waiting |
| inc-003 | 'Save and return to overview' saves without the page's required-answer checks | 4 | frontend, tests | | ready, Review point |
| inc-004 | Amendment page endings, and Continue on the amend review held while anything is incomplete | 6 | frontend, tests | | ready, Review point |
| inc-005 | End-to-end proof: horse by sea under temporary admission | 3 | tests | inc-001 | waiting |
| inc-006 | Destination country and port of exit lists come from master reference data | 2 | referencedata, frontend, tests | | blocked |
| inc-007 | Design Release 2.1's port of entry and transit country lists, from MDM | 4 | referencedata, frontend, tests | | blocked |
| inc-008 | The private transporter's country list holds DR2.1's countries, from MDM | 2 | referencedata, frontend, tests | | blocked |
| inc-009 | Country of origin becomes a search box | 8 | frontend, tests | | ready |
| inc-010 | Region of origin code, internal reference hint and the finished origin page | 10 | frontend, tests | inc-009 | waiting |
| inc-011 | Commodity page and Commodity details wording and selected commodities table match Design Release 2.1 | 7 | frontend, tests | | ready |
| inc-012 | Live-animal commodity catalogue matches Design Release 2.1 | 10 | frontend, tests | inc-001 | waiting |
| inc-013 | Commodity search results, selected panel and saving the choice follow Design Release 2.1 | 9 | frontend, tests | | ready |
| inc-014 | Commodity search lists results as the trader types, with JavaScript | 9 | frontend, tests | inc-013 | waiting, Review point |
| inc-015 | Commodity pages chain as journey steps around the main import reason | 7 | frontend, tests | inc-001 | waiting, Review point |
| inc-016 | A germinal-products notification starts from its category and offers only germinal-product commodities | 7 | backend, frontend, tests | inc-012 | waiting, Review point |
| inc-017 | Commodity details asks germinal products for gross weight, packages and storage temperature | 9 | backend, frontend, tests | inc-016 | waiting |
| inc-018 | Hard stops: means of transport on arrival details and number of packages on commodity details | 4 | frontend, tests | | ready |
| inc-019 | End-to-end proof: poultry by rail in transit | 3 | tests | inc-012, inc-001 | waiting |
| inc-020 | Main import reason and additional details copy matches Design Release 2.1 | 7 | frontend, tests | | ready |
| inc-021 | Reason and additional details sit in Design Release 2.1's journey order | 7 | frontend, tests | inc-001, inc-015 | waiting, Review point |
| inc-022 | Main import reason completes on its own answers, and both pages soft-save as Design Release 2.1 does | 8 | frontend, tests | inc-003 | waiting |
| inc-023 | Unweaned question is asked for cattle and pigs | 4 | frontend, tests | inc-012 | waiting |
| inc-024 | Germinal-products-only notifications get narrowed reasons and no additional details page | 6 | frontend, tests | inc-016 | waiting |
| inc-025 | Arrival details page moves to the 'arrival-details' address | 3 | frontend, tests | | ready |
| inc-026 | Arrival details wording: labels, hints, placeholder and means of transport options | 6 | frontend, tests | inc-025 | waiting |
| inc-027 | Port and transit country searches: 'name - code' options, a search button and bold matches | 6 | frontend, tests | inc-025 | waiting, Review point |
| inc-028 | Arrival details requires a means of transport, and arrival and transit return to where the trader came from | 9 | frontend, tests | inc-025, inc-002 | waiting |
| inc-029 | Transit countries page: title, Back link, empty state and redirect when it does not apply | 6 | frontend, tests | inc-025 | waiting |
| inc-030 | Transit countries are added and removed in place with JavaScript, with announcements | 9 | frontend, tests | inc-029 | waiting |
| inc-031 | Upload documents page moves to the upload-documents address and opens once the origin is answered | 5 | frontend, tests | | ready |
| inc-032 | Upload documents guidance, hints, table and maximum-documents error match Design Release 2.1 | 9 | frontend, tests | inc-031 | waiting |
| inc-033 | Document references accept punctuation, and the document type list drops Health certificate | 4 | backend, frontend, tests | inc-031 | waiting |
| inc-034 | Upload documents remembers where the trader came from and returns them there | 5 | frontend, tests | inc-031, inc-001 | waiting |
| inc-035 | Save and continue no longer waits for virus scans; Save and return to overview keeps a typed-in document | 7 | frontend, tests | inc-031 | waiting |
| inc-036 | Attach files up to 50MB | 4 | frontend, tests | inc-032 | blocked |
| inc-037 | The transporter list matches DR2.1: layout, search, columns and shipped transporters | 11 | frontend, tests | | ready, Review point |
| inc-038 | 'Choose a transporter type' matches DR2.1 and refuses a blank choice | 7 | frontend, tests | | ready |
| inc-039 | Saving an added transporter returns to the list with it chosen and a banner; cancelling goes to the dashboard | 7 | frontend, tests | inc-037, inc-038 | waiting, Review point |
| inc-040 | 'Add a private transporter' matches DR2.1: heading, country select and required fields | 4 | frontend, tests | inc-038 | waiting |
| inc-041 | 'Add a commercial transporter' matches DR2.1: heading, banner, postcode copy and required fields | 7 | frontend, tests | inc-038 | waiting |
| inc-042 | Find a commercial transporter's Northern Ireland address with an address search | 5 | stub, insbackend, frontend, tests | inc-041 | waiting |
| inc-043 | Save and continue on the transporter list goes on to 'Upload documents' | 2 | frontend, tests | inc-037, inc-031, inc-001 | waiting |
| inc-044 | Remove the unlinked commercial transporter register page | 2 | frontend, tests | | ready |
| inc-045 | Identification details takes its place in the linear journey after Commodity details | 6 | frontend, tests | inc-001, inc-015 | waiting |
| inc-046 | Selected commodities summary with a Species column, identification grouped by commodity then species | 6 | frontend, tests | inc-045, inc-012 | waiting |
| inc-047 | Each species panel saves only its own animal, with the saved-animals table below the form | 7 | frontend, tests | inc-046 | waiting |
| inc-048 | A live animal is entered only when every identifier its species asks for has a value | 6 | frontend, tests | inc-047 | waiting, Review point |
| inc-049 | Identification completes only when every animal is entered; submit needs one entry per species | 6 | frontend, tests | inc-048 | waiting |
| inc-050 | Identifier labels and hints follow DR2.1, length errors say 'or less', values trimmed first | 5 | frontend, tests | | ready |
| inc-051 | Pigs, sheep and goats are identified by ear tag only | 3 | frontend, tests | inc-049, inc-012 | waiting |
| inc-052 | Germinal products are identified once per species with donor, dates and identification number | 9 | backend, frontend, tests | inc-047, inc-049, inc-016 | waiting |
| inc-053 | Germinal dates get the date picker and DR2.1's date and length validation | 10 | frontend, tests | inc-052 | waiting |
| inc-054 | A permanent address page for cats, dogs and ferrets, one card per animal and a same-as-destination choice | 13 | backend, frontend, tests | inc-012, inc-047, inc-001 | waiting, Review point |
| inc-055 | The permanent address page checks each new address and names the animal in every error | 6 | frontend, tests | inc-054 | waiting |
| inc-056 | Permanent addresses are summarised on the addresses page and listed per animal on the review | 5 | frontend, tests | inc-054 | waiting |
| inc-057 | The permanent address leaves the identification page | 5 | frontend, tests | inc-054 | waiting |
| inc-058 | End-to-end proof: pet cats by air with permanent addresses | 3 | tests | inc-054, inc-057, inc-001 | waiting |
| inc-059 | The address book record carries what an address can be used for | 6 | addressbook, tests | | ready, Review point |
| inc-060 | Address validation messages match Design Release 2.1, on the form and in the API | 4 | addressbook, insfrontend, tests | | ready |
| inc-061 | Adding an address starts by choosing its type | 7 | insfrontend, tests | | ready, Review point |
| inc-062 | The add-details form for an address entered by hand | 7 | insfrontend, tests | inc-061 | waiting |
| inc-063 | Address book list: intro, filter disclosure, search control, table cells, empty state and a banner that stays | 11 | insfrontend, tests | | ready |
| inc-064 | View an address: GOV.UK titles, optional rows only when filled, a secondary Edit button, no 404 for a dead link | 5 | insfrontend, tests | | ready |
| inc-065 | Delete an address: DR2.1 confirmation page, 'No, cancel' link, stale delete as a no-op and the new banner | 8 | insfrontend, tests | | ready |
| inc-066 | View and delete pages return the user to where they opened the address from | 7 | insfrontend, tests | inc-064, inc-065 | waiting |
| inc-067 | Address book list split into four category tabs with a Type column | 8 | addressbook, insfrontend, tests | inc-059 | waiting, Review point |
| inc-068 | Type filter within a category tab; tab and pagination links keep the filters | 5 | addressbook, insfrontend, tests | inc-067 | waiting |
| inc-069 | Search the whole row, 8 addresses a page and live filtering as the user types | 8 | addressbook, insfrontend, tests | inc-068, inc-065 | waiting |
| inc-070 | Saving a new address with its uses | 7 | insfrontend, tests | inc-059, inc-061, inc-062, inc-067, inc-069 | waiting |
| inc-071 | Destination, Consignee or Importer and Branch addresses: search first, manual entry and a fixed UK country | 9 | insfrontend, tests | inc-070, inc-062 | waiting, Review point |
| inc-072 | The address search finds UK addresses as you type | 7 | insfrontend, tests | inc-071 | waiting |
| inc-073 | Editing an address matches Design Release 2.1 | 8 | insfrontend, tests | inc-059, inc-062 | waiting |
| inc-074 | Adding a transporter from the address book | 9 | addressbook, frontend, insfrontend, tests | inc-061, inc-067, inc-038, inc-039 | waiting |
| inc-075 | Transporter tab: transporters listed with approval number and type, filtered and searched | 4 | addressbook, insfrontend, tests | inc-069, inc-074 | waiting |
| inc-076 | Each transporter on the list links to its address book entry | 2 | insfrontend, frontend, tests | inc-074, inc-075, inc-066, inc-037 | waiting |
| inc-077 | The INS add page reached from a journey shows DR2.1's 'Add address and contact details' page | 8 | insfrontend, tests | inc-061, inc-062 | waiting |
| inc-078 | The journey add page splits origin-side and destination-side roles, with DR2.1's placeholder and messages | 8 | insfrontend, tests | inc-077, inc-060 | waiting |
| inc-079 | A new address added from the journey can also be saved for other roles on its side | 6 | insfrontend, tests | inc-077, inc-059 | waiting |
| inc-080 | Saving or cancelling the journey add page lands where DR2.1 says, with a success banner | 8 | frontend, insfrontend, tests | inc-077 | waiting, Review point |
| inc-081 | Destination-side journey add pages find UK addresses by search | 9 | insfrontend, tests | inc-072, inc-077 | waiting |
| inc-082 | The journey add page's Country select offers DR2.1's countries, regions and territories | 1 | insfrontend, tests | inc-078 | blocked |
| inc-083 | Welsh for the redesigned address book list, view and delete pages | 3 | insfrontend | inc-066, inc-075 | waiting |
| inc-084 | Welsh drafts for the new add and edit copy | 2 | insfrontend | inc-060, inc-072, inc-073 | waiting |
| inc-085 | Roles and addresses page: intro, warning, Consignor name, named add links and full addresses | 9 | frontend, tests | | ready |
| inc-086 | Party picker layout: add button, search control, results heading and count, address lines and blank save | 10 | frontend, tests | | ready |
| inc-087 | Role-filtered party pickers on one page with a live filter | 9 | addressbook, frontend, tests | inc-059 | waiting, Review point |
| inc-088 | Same-as shortcuts on the roles and addresses page | 8 | frontend, tests | inc-085, inc-087 | waiting |
| inc-089 | Place of origin picker searches by country | 6 | frontend, tests | inc-086, inc-087 | waiting |
| inc-090 | Picker 'View' link to the INS address book and back | 3 | insfrontend, frontend, tests | inc-086, inc-066 | waiting |
| inc-091 | The CPH number page follows DR2.1: who is asked, help and hint, a blank save, and where it goes | 9 | frontend, tests | inc-012, inc-016 | waiting |
| inc-092 | The consignment addresses page shows the CPH as 12/345/6789 and continues to the contact address | 5 | frontend, tests | inc-091 | waiting |
| inc-093 | With JavaScript, the CPH boxes keep out non-digits and one paste fills all three | 5 | frontend, tests | | ready |
| inc-094 | The contact address page follows DR2.1: intro, 'Select an address', required choice, no edit card, on to review | 9 | frontend, tests | | ready |
| inc-095 | The contact page offers only the trader's branch addresses and adds a branch through the address book | 5 | insfrontend, frontend, tests | inc-094, inc-061, inc-070, inc-080 | waiting |
| inc-096 | Which sections roles and addresses shows, when its task is complete, and where it continues | 8 | frontend, tests | inc-054, inc-091, inc-094 | waiting |
| inc-097 | Page endings: 'hub' wording on the contact page, and the amend ending on pages reached from roles and addresses | 9 | frontend, tests | inc-054, inc-091, inc-094, inc-004 | waiting |
| inc-098 | Hub regions for assistive technology and the 'Main import reason' row | 7 | frontend, tests | | ready |
| inc-099 | The hub for a germinal products notification | 6 | frontend, tests | inc-017 | waiting |
| inc-100 | The Transit countries task shows only when transit countries are required | 5 | frontend, tests | inc-028 | waiting |
| inc-101 | Review sections and cards take DR2.1's headings, titles and unfinished-card messages | 9 | frontend, tests | | ready, Review point |
| inc-102 | Review rows for origin, import reason, additional details and transport follow DR2.1 | 9 | frontend, tests | inc-101 | waiting |
| inc-103 | Arrival and transit task statuses on the overview, and transit countries on the review | 4 | frontend, tests | inc-028, inc-101 | waiting |
| inc-104 | Review reads the commodity selection back in a 'What are you importing?' card, species under commodity | 9 | frontend, tests | inc-101 | waiting, Review point |
| inc-105 | Review reads germinal product answers back in their species blocks | 3 | frontend, tests | inc-104, inc-017, inc-052 | waiting |
| inc-106 | Identification details on the review: heading, labels, own Change link, per-species messages | 5 | frontend, tests | inc-104 | waiting |
| inc-107 | Each uploaded document has its own card on the review, showing its file name | 3 | frontend, tests | inc-101 | waiting |
| inc-108 | Addresses card: permanent addresses, CPH format, one header link and a single unfinished entry | 6 | frontend, tests | inc-101, inc-054 | waiting |
| inc-109 | The review reads each party's copied address back as name, address lines and country | 4 | frontend, tests | inc-101 | waiting |
| inc-110 | Review ends with Continue and Delete; an amendment's review offers Cancel amend | 6 | backend, frontend, tests | | ready |
| inc-111 | A notification opened from the dashboard has a view header: reference, status, dates and a Back link | 6 | backend, frontend, tests | | ready, Review point |
| inc-112 | View header offers Amend, Copy as new and Delete, and shows import reference numbers | 5 | frontend, tests | inc-111 | waiting |
| inc-113 | Submitting records its date and outstanding items; a missing health certificate shows 'Submitted action required' | 6 | backend, frontend, tests | inc-111, inc-112 | waiting |
| inc-114 | Declaration page: small checkbox in a hidden-legend fieldset, no status strip | 3 | frontend, tests | | ready |
| inc-115 | Notification submitted page follows DR2.1's guard, wording and links | 7 | frontend, tests | | ready |
| inc-116 | A completed notification shows as complete with no Amend button | 2 | backend, frontend, tests | inc-111, inc-112 | blocked |
| inc-117 | Tests prove the review, declaration and confirmation paths no test covers today | 8 | frontend, tests | inc-104, inc-107, inc-108, inc-110, inc-112, inc-115 | waiting |
| inc-118 | Overview totals count only positive numbers | 1 | frontend, tests | inc-098 | dropped |
| inc-119 | Fallback warning for an action-required notification's other outstanding items | 1 | frontend, tests | inc-113 | dropped |
| inc-120 | Amend this notification asks for confirmation in a dialog, then opens the amend review | 8 | frontend, tests | inc-111, inc-112 | waiting, Review point |
| inc-121 | Cancel amendment is a dialog and returns to the submitted view with no banner | 8 | frontend, tests | inc-120, inc-110 | waiting |
| inc-122 | An amendment shows an 'Amend' status bar with Cancel amend on the review and every question page | 7 | frontend, tests | inc-121 | waiting |
| inc-123 | Copy as new carries over exactly DR2.1's list, from the submitted version | 9 | backend, frontend, tests | | ready |
| inc-124 | A stale Copy as new from the view page returns to the view page with the updated banner | 3 | frontend, tests | inc-112 | waiting |
| inc-125 | The delete confirmation page identifies the notification and takes DR2.1's wording and buttons | 11 | frontend, tests | | ready |
| inc-126 | After a delete the trader lands on the overall dashboard with a deleted message; an amending notification can be deleted | 6 | backend, frontend, tests | inc-120, inc-121, inc-125, inc-111 | waiting |
| inc-127 | INS page titles follow the GOV.UK title pattern | 2 | insfrontend, tests | | ready |
| inc-128 | The INS front door's home becomes the DR2.1 overall dashboard | 10 | insfrontend, tests | | ready, Review point |
| inc-129 | The live animals list moves to the INS frontend, scoped to the trader's organisation | 10 | insbackend, insfrontend, frontend, tests | | ready, Review point |
| inc-130 | Notification cards show DR2.1's facts and status styles | 10 | backend, insbackend, insfrontend, tests | inc-129 | waiting |
| inc-131 | Action required on the dashboard for a submitted notification missing its ITAHC | 4 | backend, insbackend, insfrontend, frontend, tests | inc-113, inc-129 | waiting |
| inc-132 | Action needed drill-down lists notifications still missing a required document | 11 | backend, insbackend, insfrontend, tests | inc-128, inc-131 | waiting, Review point |
| inc-133 | Search and sort the Action needed list | 5 | insbackend, insfrontend, tests | inc-132 | waiting |
| inc-134 | Glance cards on the home's category sections | 5 | insfrontend, tests | inc-128, inc-132 | waiting |
| inc-135 | The list has 'In progress', 'Draft' and 'Completed' tabs | 7 | insbackend, insfrontend, tests | inc-130 | waiting |
| inc-136 | Search and sort become one form that really searches and sorts | 9 | insbackend, insfrontend, tests | inc-135 | waiting |
| inc-137 | The list has 'Additional filters' for arrival date, date range and status | 7 | insbackend, insfrontend, tests | inc-136 | waiting |
| inc-138 | The list pages 8 at a time with numbered pages and no results line or empty messages | 8 | insbackend, insfrontend, tests | inc-136, inc-137 | waiting |
| inc-139 | The list's Summary shows 'Action needed' and 'Status updated' glance cards | 3 | insbackend, insfrontend, tests | inc-129, inc-132, inc-134 | waiting |
| inc-140 | The list's success banner is titled 'Success' and shown once | 3 | frontend, insfrontend, tests | inc-129, inc-126 | waiting |
| inc-141 | A germinal products list at /germinal-products | 5 | insbackend, insfrontend, tests | inc-135, inc-138 | waiting |
| inc-142 | Cards show the authorities' outcomes: delayed, completed, inspection and their actions | 5 | insbackend, insfrontend, tests | inc-130, inc-135, inc-139 | blocked |
| inc-143 | Status updates card and the Status updated drill-down | 5 | insbackend, insfrontend, tests | inc-134 | blocked |
| inc-144 | Inspection required drill-down | 6 | insbackend, insfrontend, tests | inc-133 | blocked |
| inc-145 | Germinal products section on the home | 2 | insfrontend, tests | inc-134 | blocked |
| inc-146 | The plants section's glance cards | 3 | insfrontend, tests | inc-134 | blocked |
| inc-147 | Identifier-driven outstanding items: warnings, inline error, confirmation bullet and dashboard message | 5 | backend, insbackend, insfrontend, frontend, tests | inc-131 | blocked |
| inc-148 | Ask 'What are you importing?' before a notification is created | 11 | frontend, insfrontend, tests | inc-128 | waiting, Review point |
| inc-149 | Create new starts every notification at the type question | 2 | insfrontend, tests | inc-128, inc-148 | waiting |
| inc-150 | Return to the type question from an existing live-animals notification | 4 | frontend, insfrontend, tests | inc-148 | waiting |
| inc-151 | Manage templates page, empty, read from the user's stored templates | 7 | backend, frontend, tests | | ready, Review point |
| inc-152 | Templates item in the service navigation on both frontends | 8 | frontend, insfrontend, tests | inc-151 | waiting |
| inc-153 | Use template button and Templates navigation item | 2 | insfrontend, tests | inc-128, inc-151 | waiting |
| inc-154 | Start a template: notification type, template name and origin in template mode | 8 | backend, frontend, insfrontend, tests | inc-151, inc-148, inc-010 | waiting, Review point |
| inc-155 | The template's task list and 'What are you importing?' in template mode | 9 | frontend, tests | inc-154, inc-098 | waiting |
| inc-156 | Review your template | 6 | frontend, backend, tests | inc-155, inc-101 | waiting |
| inc-157 | Save a template and see it on Manage templates | 9 | backend, frontend, tests | inc-156 | waiting |
| inc-158 | View a saved template | 9 | backend, frontend, tests | inc-157 | waiting |
| inc-159 | Change one section of a saved template | 7 | backend, frontend, tests | inc-158 | waiting |
| inc-160 | Use a template to start a notification | 11 | backend, frontend, tests | inc-157, inc-158 | waiting |
| inc-161 | Template card answers, category and each party's address | 5 | backend, frontend, tests | inc-157, inc-158, inc-160, inc-016 | waiting |
| inc-162 | Sort the templates list | 3 | backend, frontend, tests | inc-157, inc-136 | waiting |
| inc-163 | Edit a whole saved template on its own task list | 3 | backend, frontend, tests | inc-157 | waiting |
| inc-164 | Discard a template being created | 4 | frontend, tests | inc-156 | waiting |
| inc-165 | Delete a saved template | 6 | backend, frontend, tests | inc-158, inc-163, inc-164 | waiting |
| inc-166 | Commodity pages return to where the trader came from: check answers, the overview or a template | 4 | frontend, tests | inc-015, inc-156, inc-159 | waiting |
| inc-167 | Main import reason page edits a template from its review | 3 | frontend, tests | inc-156, inc-159 | waiting |
| inc-168 | Arrival details while creating or editing a template | 4 | frontend, tests | inc-028, inc-156, inc-159 | waiting |
| inc-169 | Template creation leaves out Upload documents | 3 | frontend, tests | inc-031, inc-155 | waiting |
| inc-170 | The transporter list's buttons when amending a notification or editing a template | 2 | frontend, tests | inc-037, inc-004, inc-159 | waiting |
| inc-171 | Back links follow the context a page was opened in | 4 | frontend, tests | inc-001, inc-159 | waiting |
| inc-172 | Germinal products notifications on their own list and cards | 3 | insbackend, insfrontend, tests | inc-130, inc-141 | blocked |

**Check these ordering decisions:**

- **inc-001 goes first.** Every later end-to-end walk follows its step order: reason before commodity details, no CPH step, contact address then review.
- **Blocked rows stand apart** so buildable rows are not held up. inc-006, inc-007, inc-008 and inc-082 wait on MDM. inc-036 waits on CDP. inc-116 and inc-142 wait on PIMS Dynamics. inc-143 and inc-144 wait on import-checking outcomes. inc-145 and inc-172 wait on a germinal journey. inc-146 waits on the plants services. inc-147 waits on DR1 row inc-103.
- **inc-143 and inc-144 carry requirements that are not blocked themselves** (req-974, req-997 to req-1000, req-1002, req-1004 to req-1010, req-1012, req-1013). They sit with their blocked list so the pages are never shown empty.
- **Two dropped rows still list requirements.** inc-118 lists req-787, now already met. inc-119 lists req-904, now out of scope.
- **Germinal products are built inside the animals notification** (inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-141, inc-161). This matches the corrected goal, but not req-1668. See step 0.
- **inc-042 changes `trade-imports-stub`**, a repo outside `sources.json`, so the stubs return Northern Ireland addresses (c-218's default).
- **inc-071 introduces the per-environment search setting** (c-217's default). inc-072 and inc-081 copy it.
- **inc-129 moves the live animals list from the animals frontend to the INS frontend.** It touches 4 repos and is a review point. Every list row from inc-130 to inc-141 rests on it.
- **Rows that may be too big to review:** inc-054 (13 criteria) could split into the page and the same-as-destination choice. inc-002 (12) could split by page group. inc-148 (11) could split into the INS type page and the animals hand-over. inc-037, inc-063, inc-125, inc-132 and inc-160 have 11 each.
- **inc-172 sits last in the file** but belongs to the ins-dashboard theme, after inc-141.
- **inc-078 calls the search row "blocked".** inc-081 is waiting, not blocked; the default it describes holds only until inc-081 lands.

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code. In Touches, `LA/` stands for `src/server/app/sets/live-animals/journeys/linear/features/` and `BE/` for `src/main/java/uk/gov/defra/trade/imports/animals/`.

| Wave | Theme | Rows | Touches | Depends on |
|---|---|---|---|---|
| 1 | journey-foundation | inc-001 to inc-005 | frontend: src/server/app/sets/live-animals/journeys/linear/flow, src/server/app/sets/live-animals/docs, fit, src/server/app/shared, src/client/javascripts/components/accessible-autocomplete.js, src/client/javascripts/components/status-announcer.js; tests: flows/animals, tests/animals/e2e/journeys/persistence, tests/animals/e2e/journeys/promoted-notification.spec.ts, tests/animals/e2e/journeys/horse-temporary-admission.spec.ts | None |
| 1 | reference-lists | inc-006 to inc-008 | frontend: src/server/app/services/countries; referencedata: src; tests: tests/animals/e2e/features/reference-lists | None |
| 1 | origin-page | inc-009, inc-010 | frontend: LA/origin, src/server/app/sets/live-animals/obligations/sections/origin.js; tests: tests/animals/e2e/features/country-of-origin-type-ahead.spec.ts, tests/animals/e2e/pages/origin.spec.ts, tests/animals/e2e/visual/origin-of-import.visual.spec.ts-snapshots | None |
| 2 | commodities-and-reason | inc-011 to inc-024 | backend: BE/notification/Species.java, BE/notification/Commodity.java, BE/notification/CommodityComplement.java, BE/outbox/gbnag; frontend: LA/commodities/search, LA/commodities/consignment-details, LA/commodities/copy, LA/import-reason, LA/additional-details, src/server/app/sets/live-animals/services/commodities, src/server/app/sets/live-animals/obligations/sections/commodities, .../obligations/sections/arrival.js, .../obligations/sections/import-reason.js, src/client/javascripts/components/commodity-search.js; tests: commodities, consignment-details, import-reason and additional-details page specs and page objects, reason-purpose-scope.spec.ts, additional-details-scope.spec.ts, poultry-rail-transit.spec.ts | journey-foundation |
| 2 | arrival-and-transit | inc-025 to inc-030 | frontend: LA/transport/port-of-entry, LA/transport/transit-countries, src/server/app/services/ports; tests: arrival-details-page.ts, transited-countries-page.ts, arrival-details.spec.ts, transited-countries.spec.ts, port-of-entry-select.spec.ts, transit-means-scope.spec.ts | journey-foundation |
| 2 | documents | inc-031 to inc-036 | backend: BE/accompanyingdocument; frontend: LA/documents, src/server/app/services/document-types; tests: accompanying-documents-page.ts, resources/file-upload, documents-limits, documents-refresh-no-js, documents-reject, documents-scan-lifecycle and promoted-documents specs | journey-foundation |
| 3 | transporters | inc-037 to inc-044 | frontend: LA/transport/transporters, transporters-select, transporter-add, private-transporter-details, commercial-transporter-details, transporter-details-save.js, LA/transport/fit, src/server/app/services/transporters, src/server/app/services/address-lookup; insbackend: src/main/java/uk/gov/defra/trade/imports/ins/backend/addresslookup; stub: src/main/java/.../stubs/federated, src/test/java/.../stubs/federated; tests: 5 transporter page objects, transporter.spec.ts, transporter-add.spec.ts, transporter-selection.spec.ts | documents, journey-foundation |
| 3 | identification-and-permanent-address | inc-045 to inc-058 | backend: BE/notification/AnimalIdentifier.java; frontend: LA/commodities/animal-identification, LA/commodities/evaluation.js, LA/permanent-address; tests: animal-identification-page.ts, permanent-address-page.ts, animal-identification.spec.ts, permanent-address.spec.ts, pet-cats-air-permanent-address.spec.ts | journey-foundation, commodities-and-reason |
| 4 | address-book | inc-059 to inc-084 | addressbook: src/main/java/.../addressbook/address, docs, src/main/resources; frontend: LA/addresses/address-return, LA/addresses/ins-handshake.js, LA/transport/address-book-entry; insfrontend: src/server/app/features/address-book/ add, edit, list, view, delete, view-model, fit, address-countries.js, address-id-params.js, handshake-context.js, success-banner.js, src/server/app/services/address-book, src/server/app/services/address-lookup, src/client/javascripts/address-book-filter.js, address-book-success-banner.js, address-search.js; tests: page-objects/ins/address-book, tests/ins/e2e/features/address-book, e2e-address-book.ts, address-document.ts, address-book-api-client.ts, addresses-add-handshake.spec.ts | transporters |
| 4 | overview-and-review | inc-098 to inc-119 | backend: BE/notification/ Notification.java, NotificationDto.java, NotificationService.java, NotificationStatus.java, NotificationView.java, NotificationViewData.java, NotificationAggregate.java; frontend: LA/hub, LA/check-answers/ controller.js, refusal.js, check-answers.fit.spec.js, view-model/cards, header, sections, rows, incomplete-cards.js, invalid-parties.js, LA/declaration, LA/confirmation; tests: hub-groups-and-cya-rows, amend-resubmit, cancel-amend-ui and declaration specs, declaration-page.ts | commodities-and-reason, arrival-and-transit, identification-and-permanent-address |
| 5 | consignment-parties | inc-085 to inc-097 | addressbook: src/main/java/.../addressbook/service; frontend: LA/addresses/ template.njk, controller.js, parties.js, party-inline.js, evaluation.js, fit, party-picker, LA/cph-number, LA/contact, src/server/app/services/address-book, src/client/javascripts/components/cph-number-input.js; insfrontend: src/server/app/features/address-book/journey-registry.js; tests: addresses, party-picker, cph-number and contact-address page objects, addresses-picker.spec.ts, cph-number.spec.ts, contact-address.spec.ts | address-book, commodities-and-reason, identification-and-permanent-address, journey-foundation |
| 5 | manage-notifications | inc-120 to inc-126 | backend: BE/notification/NotificationController.java, BE/notification/NotificationCopyMapper.java; frontend: LA/amend, LA/cancel-amend, LA/delete-notification, LA/notification-actions, src/client/javascripts/components/confirmation-dialog.js, src/client/stylesheets/components/_confirmation-dialog.scss, src/server/app/services/persistence/records/stub/lifecycle/create.js; tests: notification-cancel-amend-page.ts, notification-actions-guards.spec.ts | overview-and-review |
| 6 | ins-dashboard | inc-127 to inc-147, inc-172 | backend: BE/outbox/OutboxEvent.java, BE/outbox/OutboxService.java; frontend: LA/dashboard; insbackend: src/main/java/.../ins/backend/notification, src/main/resources; insfrontend: src/server/app/features/ dashboard, action-needed, status-updated, inspection-required, notification-list, src/server/app/shared; tests: dashboard-page.ts, notification-list-page.ts, tests/ins/e2e/features/ overall-dashboard, action-needed, inspection-required, status-updated, notification-list, notification-dashboard-navigation.spec.ts | overview-and-review, manage-notifications |
| 7 | type-question-and-templates | inc-148 to inc-171 | backend: BE/template; frontend: LA/templates, LA/check-answers/view-model/template-review, LA/service-navigation.fit.spec.js; insfrontend: src/server/app/features/notification-type; tests: tests/ins/e2e/features/notification-type, tests/animals/e2e/features/templates, tests/animals/e2e/features/auth.spec.ts | ins-dashboard, origin-page, overview-and-review, commodities-and-reason, arrival-and-transit, documents, transporters, journey-foundation |

Every row sits in exactly one theme.

**Cross-theme dependencies:**

- inc-012, inc-015, inc-019, inc-021 (commodities-and-reason) need inc-001 (journey-foundation): they walk or change the new step order.
- inc-022 (commodities-and-reason) needs inc-003 (journey-foundation): it copies the soft-save pattern.
- inc-028 (arrival-and-transit) needs inc-002 (journey-foundation): the return-to-overview rule.
- inc-034 (documents) needs inc-001 (journey-foundation): its return depends on the step order.
- inc-043 (transporters) needs inc-031 (documents) and inc-001 (journey-foundation): it continues to the moved documents page.
- inc-045 (identification-and-permanent-address) needs inc-001 (journey-foundation) and inc-015 (commodities-and-reason): identification follows Commodity details.
- inc-046 and inc-051 (identification-and-permanent-address) need inc-012 (commodities-and-reason): species come from the new catalogue.
- inc-052 (identification-and-permanent-address) needs inc-016 (commodities-and-reason): the germinal category.
- inc-054 (identification-and-permanent-address) needs inc-012 (commodities-and-reason) and inc-001 (journey-foundation): cats, dogs and ferrets, and the step order.
- inc-058 (identification-and-permanent-address) needs inc-001 (journey-foundation): the proof walks the new order.
- inc-074 (address-book) needs inc-038 and inc-039 (transporters): it reuses the type page and save behaviour.
- inc-076 (address-book) needs inc-037 (transporters): it links rows of the new list.
- inc-087 (consignment-parties) needs inc-059 (address-book): role filtering needs address uses.
- inc-090 (consignment-parties) needs inc-066 (address-book): the return from the view page.
- inc-091 (consignment-parties) needs inc-012 and inc-016 (commodities-and-reason): who is asked depends on commodities.
- inc-095 (consignment-parties) needs inc-061, inc-070 and inc-080 (address-book): a branch is added through the address book.
- inc-096 (consignment-parties) needs inc-054 (identification-and-permanent-address): the permanent address section.
- inc-097 (consignment-parties) needs inc-054 (identification-and-permanent-address) and inc-004 (journey-foundation): endings on that page and amend endings.
- inc-099 (overview-and-review) needs inc-017 (commodities-and-reason): germinal totals.
- inc-100 and inc-103 (overview-and-review) need inc-028 (arrival-and-transit): transit applies by means of transport.
- inc-105 (overview-and-review) needs inc-017 (commodities-and-reason) and inc-052 (identification-and-permanent-address): germinal answers to read back.
- inc-108 (overview-and-review) needs inc-054 (identification-and-permanent-address): permanent addresses on the card.
- inc-120 (manage-notifications) needs inc-111 and inc-112 (overview-and-review): Amend starts from the view header.
- inc-121 (manage-notifications) needs inc-110 (overview-and-review): Cancel amend starts from the review.
- inc-124 (manage-notifications) needs inc-112 (overview-and-review): Copy as new from the view page.
- inc-126 (manage-notifications) needs inc-111 (overview-and-review): delete from the view.
- inc-131 (ins-dashboard) needs inc-113 (overview-and-review): the action-required status is set at submit.
- inc-140 (ins-dashboard) needs inc-126 (manage-notifications): the deleted message shows on the list.
- inc-148, inc-149, inc-153 (type-question-and-templates) need inc-128 (ins-dashboard): they start from the new home.
- inc-154 (type-question-and-templates) needs inc-010 (origin-page): the origin page in template mode.
- inc-155 (type-question-and-templates) needs inc-098 (overview-and-review): the hub regions.
- inc-156 (type-question-and-templates) needs inc-101 (overview-and-review): the review structure.
- inc-161 (type-question-and-templates) needs inc-016 (commodities-and-reason): the germinal category.
- inc-162 (type-question-and-templates) needs inc-136 (ins-dashboard): it reuses the list sort.
- inc-166 (type-question-and-templates) needs inc-015 (commodities-and-reason): commodity chaining.
- inc-168 (type-question-and-templates) needs inc-028 (arrival-and-transit): arrival returns.
- inc-169 (type-question-and-templates) needs inc-031 (documents): the moved documents page.
- inc-170 (type-question-and-templates) needs inc-037 (transporters) and inc-004 (journey-foundation): the new list and amend endings.
- inc-171 (type-question-and-templates) needs inc-001 (journey-foundation): Back follows the step order.

## Where the requirements came from

- **Claims.** 13,406 claims came from 16 sources. 13,299 held, 107 were refuted and dropped, and 635 were added as missed. That gives a working set of 13,934. Of these, 12,268 are verbatim, 929 inferred and 737 record gaps.
- **Areas.** Reconcile weighed 21 areas apart: start and origin, commodities, reason and additional details, animal identification, arrival and transit, transporters, documents, consignment parties, party address add and edit, CPH, permanent and contact addresses, notification hub, review and submit, dashboard home, notification lists, address book list, address book add and edit, templates, manage notifications, notification record, journey flow, and layout and sign-in.
- **Requirements.** 1,681 in all. 1,562 are adopted: 831 to build (440 changes, 391 new) and 731 already in place. 3 depend on the open questions (req-456, req-457, req-1218) and are built to the defaults. 116 are out of scope. The backlog covers 834.
- **Cited.** 12,989 of the 13,934 working-set claims (93%) are cited by a requirement or conflict.

| Source | Rank | Claims | Held | Refuted | Added | Cited | Requirements backed (in scope) |
|---|---|---|---|---|---|---|---|
| Ruling, 7 October 2026 | 1 | 23 | 23 | 0 | 0 | 14 of 23 | 53 (49) |
| DR1 parity notes | 2 | 88 | 88 | 0 | 1 | 52 of 89 | 45 (40) |
| DR1 parity backlog | 3 | 481 | 481 | 0 | 64 | 441 of 545 | 164 (147) |
| DR2.1 prototype source | 4 | 1,705 | 1,683 | 22 | 81 | 1,696 of 1,764 | 1,084 (1,038) |
| DR2.1 traces | 5 | 1,791 | 1,784 | 7 | 85 | 1,758 of 1,869 | 994 (958) |
| DR2.1 specs | 6 | 1,003 | 998 | 5 | 8 | 866 of 1,006 | 621 (603) |
| Animals backend | 7 | 688 | 683 | 5 | 26 | 709 of 709 | 167 (150) |
| INS backend | 8 | 132 | 132 | 0 | 8 | 140 of 140 | 20 (19) |
| Address book | 9 | 339 | 336 | 3 | 12 | 343 of 348 | 40 (38) |
| Reference data | 10 | 98 | 96 | 2 | 5 | 101 of 101 | 15 (13) |
| Animals frontend | 11 | 1,852 | 1,843 | 9 | 97 | 1,756 of 1,940 | 789 (777) |
| INS frontend | 12 | 638 | 638 | 0 | 31 | 664 of 669 | 179 (172) |
| Tests repo | 13 | 907 | 897 | 10 | 39 | 824 of 936 | 401 (388) |
| Animals fit traces | 14 | 1,948 | 1,921 | 27 | 81 | 1,920 of 2,002 | 737 (726) |
| INS fit traces | 15 | 250 | 248 | 2 | 27 | 272 of 275 | 112 (109) |
| End-to-end traces | 16 | 1,463 | 1,448 | 15 | 70 | 1,433 of 1,518 | 766 (749) |

- **Unused sources.** Every source backs at least one requirement. No source's cited share is under a tenth. The lowest are the DR1 notes (52 of 89) and the ruling (14 of 23). Their uncited claims are judgements that met no Design Release 2.1 difference (req-1734 records this).
- **Strongest.** req-965 (the Templates navigation item) rests on 10 sources. req-499 (document type options), req-509 (50MB files), req-1032 (category lists in the INS frontend) and req-1051 (list sorting) rest on 9. 37 more rest on 8.
- **Weakest.** 224 in-scope requirements rest on one source: animals backend 66, DR2.1 source 54, animals frontend 28, DR2.1 traces 24, tests repo 15, INS frontend 13, address book 7, reference data 6, animals fit traces 3, end-to-end traces 3, INS backend 2, the ruling 2 and INS fit traces one. No in-scope requirement rests on a DR1 source alone.
- **Inferred only.** 17 in-scope requirements rest only on inferred claims: req-220, req-442, req-610, req-651, req-957, req-975, req-1014, req-1296, req-1343, req-1351, req-1365, req-1372, req-1496, req-1508, req-1554, req-1608 and req-1699.
- **Confirm before passing this on:**
  - The goal correction and the germinal checks in step 0.
  - inc-061, inc-062 and inc-070 follow a default for c-address-book-add-and-edit-007. inc-042 follows one for c-transporters-001. Neither is in `conflicts.json`.
  - inc-128, inc-129, inc-132, inc-134, inc-140, inc-146 and inc-157 to inc-162 record defaults that later conflicts settled (c-150, c-149, c-152, c-184 to c-187). Check their wording matches the settled outcome.

## Out of scope

### Master reference-data content, handed to MDM

- req-026: adding Guernsey, Jersey and Isle of Man to the country of origin list.
- req-027: adding Ceuta and Melilla with prefixes XC and XL.
- req-028: limiting the list to the EU, its territories and the crown dependencies.
- req-029: renaming entries to the prototype's spellings.
- req-030: labelling territories "Name (Parent)".

### Other notification types (re-check against the corrected goal)

- req-059: a non-live-animals type running through the live-animals origin page.
- req-1668: the germinal products, plants for planting, potatoes and wood products journeys. Its germinal half conflicts with the corrected goal (see step 0).

### Prototype mechanics, seed data and defects

| Requirement | What is not built |
|---|---|
| req-189 | The seed route /prototype/reason-for-import |
| req-190 | Disabled guards, fixed fallback references and session errors |
| req-378 | Transit page dropping the review markers |
| req-383 | The Google Analytics "_gl" parameter on the guidance link |
| req-410 | The old /transport-details redirect |
| req-469 | Custom caption, heading and input classes on transporter pages |
| req-471 | Type-page errors left in the session |
| req-625 | Fixed demonstration addresses on the pickers |
| req-626 | The prototype's page paths for roles and addresses |
| req-750 | The prototype's permanent-address routing |
| req-751 | Custom heading, card and layout classes on the contact and permanent address pages |
| req-776 | 3 seeded branch addresses |
| req-946 | Bespoke review markup (app-dr2-review-card and -row) |
| req-947 | The /design-release-2.1 mount and the dashboard's stat machinery |
| req-1017 | The index page listing design releases |
| req-1018 | Fixed glance counts and seeded notifications |
| req-1106 | Demo notifications and fixed references |
| req-1107 | The list with no category |
| req-1128 | Legacy category values origin-and-sender and destination-and-receiver |
| req-1189 | Seeded demonstration addresses |
| req-1384 | The version mount and design-release session rule |
| req-1385 | The template change page's broken Cancel link |
| req-1386 | The unguarded discard post |
| req-1387 | The seeded Arena Aintree region code change |
| req-1486 | Session keys, journey resets and page mounts |
| req-1665 | Version mount and session mechanics |
| req-1666 | Seed shortcuts and fixtures |
| req-1667 | Mount leaks such as the template Cancel link |
| req-1681 | The service index at /index |
| req-1682 | Prototype kit tooling in the footer |

### Set aside by a ruling, a conflict or an accessibility duty

| Requirement | What is not built | Why |
|---|---|---|
| req-419 | The Commercial hint left unannounced | Accessibility duty |
| req-438 | No "Error: " title prefix on add pages | Accessibility duty |
| req-627 | Change links without the hidden party name | Accessibility duty |
| req-629 | An add-address page inside the animals journey | c-106 |
| req-713 | Automatic focus moves between CPH boxes | Accessibility duty (c-006) |
| req-959 | A "Messages" link and unread count | c-150 |
| req-1150 | Address book changes held only in the session | c-172 |
| req-1170 | The view page showing addresses outside the book | c-173 |
| req-1388 | Session-only templates and 5 seeded templates | c-183 |
| req-1389 | Saving a template by GET | c-188 |

### DR1 rows that are not requirements

The ruling makes the DR1 backlog a source of judgements only: req-192, req-369, req-555, req-1031, req-1190, req-1288 and req-1734.

### Weighed in another area

req-198 (phase banner), req-266 (DR1 permanent-address rows), req-270 (CPH and line removal), req-482 (phase banner), req-552 (documents on the review), req-949 (other areas' claims), req-1028 (category dashboards), req-1029 (confirmation and view pages), req-1030 (address book pages) and req-1564 (list API tests).

### Welsh sign-off

Design Release 2.1 is English only, and this programme does not give Welsh Language Standards sign-off: req-376, req-475, req-554 and req-948.

### Problems for the owning teams

| Requirement | Finding | Owner |
|---|---|---|
| req-193 | Test data holds certification purposes the page does not offer | Tests repo |
| req-377 | E2E set-up flake when the commodity search fails | Tests repo |
| req-553 | Backend document-endpoint defects | Animals backend |
| req-1105 | Read-model defects and operational details | INS backend |
| req-1154 | Security finding at the address book's trust boundary; detail in the programme's local files | Address book and platform |
| req-1191 | Address book test gaps | Address book |
| req-1283 | Edit page cache header | INS frontend |
| req-1481 | Concurrency tokens on delete, cancel-amend and amend | Animals frontend and backend |
| req-1482 | Security finding on soft delete; detail in the programme's local files | Animals backend |
| req-1483 | Audit records for writes | Animals backend |
| req-1484 | Backend edge cases answering server errors | Animals backend |
| req-1485 | Place of destination picker search error | Animals frontend |
| req-1538 | Backend README describes tests wrongly | Animals backend |
| req-1555 | Save reliability defect | Animals backend |
| req-1556 | Security finding on notification endpoints; detail in the programme's local files | Animals backend |
| req-1563 | Misleading soft-delete test | Animals backend |
| req-1573 | Publisher blocked by a poison event | Animals backend |
| req-1575 | No tests prove lifecycle events reach SNS | Animals backend |
| req-1578 | Replay misreports failures | Animals backend |
| req-1582 | PIMS data test covers few columns | Tests repo |
| req-1584 | No spec proves outbox event contents | Tests repo |
| req-1587 | GBN-AG issuer mapping gap | Animals backend (PIMS mapping work) |
| req-1591 | GBN-AG internal market purpose gap | Animals backend (PIMS mapping work) |
| req-1594 | Unconfirmed GBN-AG code mappings | PIMS mapping work |
| req-1602 | GBN-AG payload gaps | PIMS mapping work |
| req-1603 | GBN-AG mapping edge cases | Animals backend |
| req-1717 | Security-header and cookie findings; detail in the programme's local files | Service teams |
| req-1718 | Defra ID stub page defects | Defra ID stub |
| req-1724 | Accessibility proof gaps | Tests repo |
| req-1726 | Security scan coverage gaps | Tests repo |
| req-1730 | Security finding on the INS dashboard; detail in the programme's local files (inc-129 changes this area) | INS frontend and backend |
| req-1733 | INS frontend documentation and dependency drift | INS frontend |

### Nothing designed, or nothing to build

| Requirement | Why |
|---|---|
| req-065 | No new lists move into reference data |
| req-191 | No check between reason and certification purpose is asked for |
| req-396 | No transporter approval step is shown anywhere |
| req-465 | No transporter register service exists |
| req-819 | "Save template" on the hub is outside Design Release 2.1 |
| req-904 | No real case can show the fallback warning |
| req-952 | Today's cross-journey table on the INS root goes |
| req-1003 | Other Status updated sections are never rendered |
| req-1286 | The separate usage page is never reached |
| req-1287 | The root "Add address details" page is reached only outside Design Release 2.1 |
| req-1289 | The address lookup spike page stays as it is |
| req-1290 | No format rules on postcode or phone |
| req-1609 | Persistence traces do not record Mongo reads |
| req-1669 | Gaps in the target evidence |
| req-1670 | Gaps in today's evidence |
| req-1671 | Test fixture and seeding mechanics |

## Terms used

| Term | Meaning |
|---|---|
| axe | The automated accessibility checker the suites run |
| BE | Backend, as in "animals BE" and "INS BE" |
| Blocker | Action by someone outside the programme that a settled requirement waits on |
| CDP | Core Delivery Platform, where the services run |
| CPH | County parish holding number |
| CSRF | Cross-site request forgery; the token every form post carries |
| DR1 | Design Release 1 and its parity programme |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| E2E | End to end: the tests repo's suites and traces |
| FE | Frontend, as in "animals FE" and "INS FE" |
| Fit spec | A frontend's own browser test, run in stub mode |
| GBN-AG | The GB animals notification, and the event format sent on to PIMS |
| INS | Import Notification Service: the front door, dashboard and address book |
| ITAHC | Intra Trade Animal Health Certificate |
| MDM | Master data management, the source of master reference data |
| MoJ | Ministry of Justice; its date picker component |
| PIMS Dynamics | The authorities' case system that receives submitted notifications |
| Precedence | The source order that settles a disagreement |
| Read model | The INS backend's copy of notifications behind the dashboard and lists |
| Review point | An increment where the build loop stops for the owner to look |
| RFC | A published internet standard, such as the problem-details format |
| SNS | Amazon Simple Notification Service, where the backend publishes events |
| Theme | A group of increments that builds on its own branch and machine |
| Wave | A theme's place in the landing order |
| WCAG | Web Content Accessibility Guidelines |

