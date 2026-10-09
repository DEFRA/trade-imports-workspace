# Design Release 2.1: backlog report

## Summary

- The backlog has 187 increments: 36 are ready now, 137 wait on earlier rows, 9 are blocked and 5 are dropped. 27 are review points.
- It brings the GBN-AG animals notification, the INS dashboard and lists, the address book and templates up to Design Release 2.1, across 10 repos in 15 themes.
- Germinal products becomes a sibling set of live animals (inc-176 onwards, theme germinal-products, built last). The V4 germinal data fields page decides its fields and which are mandatory.
- No question is open. 11 were challenged, and precedence and the rulings settled all 11. None waits on a blocker.
- Step 0: correct the goal in `sources.json` and add `trade-imports-schemas` to its repos.
- 31 requirements in 9 blocked increments wait on others: the INS address lookup (19), PIMS Dynamics outcomes (7), import-checking outcomes (3), CDP (1) and the plants services (1).

## Before you build: step 0

1. **Correct the goal in `sources.json`.** The 9 October ruling changes it in 6 ways. As the rulings leave it, the goal reads:
   - Bring the real GB notification services up to Design Release 2.1 in look and feel. The services are the GBN-AG animals notification, as two sibling sets in the animals frontend (live animals and germinal products), its dashboard, templates and address book.
   - Look and feel means content, wording, layout, components and question order.
   - Where a real service differs in look and feel, it changes to match Design Release 2.1.
   - Three things override that: an owner ruling on the same difference, a DR1 judgement on it, or a real constraint the prototype cannot express.
   - Real constraints are persistence, validation, authentication and cross-service behaviour.
   - Reference-list content (countries, territories, ports) is whatever MDM serves through reference-data. It is never edited in code to match Design Release 2.1, and no list waits on MDM.
   - Only how a list is shown (labels, order, placeholder) follows the prototype.
   - For the germinal products set, the V4 germinal data fields page decides which fields are asked, their format, limits and whether they are mandatory. Design Release 2.1 decides how the pages look and read.
   - Design Release 2.1's address search is adopted but blocked until the INS address lookup is a real feature. Until then every add-address page offers manual entry only.
   - Architecture (sets, journeys, services, URL paths, field names, data shapes, code structure) stays the real services'.
   - Architecture changes only where a DR1 judgement, a real constraint or a kept look-and-feel requirement needs it. Any such change is designed in the real service's conventions.
   - The owner's rulings may add to data shapes. The 9 October ruling adds a notification category, the germinal products details and trade-line typeCodes to the animals backend.
2. **Add `schemas` to the repos in `sources.json`.** inc-130 adds an optional `category` property to `event-envelope-v1` in `trade-imports-schemas` (c-272). The backlog already lists the repo.

## Decisions the pipeline made

**Repos (10).** The pipeline chose these from the goal and the rulings:

| Key | Repo | Why |
|---|---|---|
| frontend | trade-imports-animals-frontend | Both animals sets' journey pages, flow and copy, the templates pages and the new germinal products set |
| backend | trade-imports-animals-backend | The notification record and lifecycle, templates store, category, germinal details and published events |
| insfrontend | trade-imports-ins-frontend | The overall dashboard, notification lists, type question and address book pages |
| insbackend | trade-imports-ins-backend | The read model behind the dashboard and lists, and the address lookup |
| addressbook | trade-imports-address-book | The address record, its type and uses, and its API |
| referencedata | trade-imports-reference-data | The country and port lists, and the port traffic type that orders the port list |
| stub | trade-imports-stub | The MDM countries and ports tidy-up (inc-173) and Northern Ireland lookup addresses (inc-042) |
| tests | trade-imports-ins-tests | Every service's end-to-end suite |
| perftests | trade-imports-performance-tests | The k6 scripts each change breaks (c-225), including the list move (inc-129) |
| schemas | trade-imports-schemas | The optional category on the event envelope (inc-130, c-272). Not yet in `sources.json` |

Read but not changed: the Design Release 2.1 prototype (`defra-design/GB-notification-service` at 04a073b), its traces and specs, the DR1 parity notes and backlog, and the V4 germinal data fields page. `trade-imports-dynamics-gateway` is untouched and ignores the new event field (c-272).

**Which source wins a disagreement**, highest first:

1. Sam's ruling of 9 October 2026 (`ruling:sam-2026-10-09`)
2. Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`)
3. Live Animals Germinals Data Fields V4, the germinal data elements (`confluence:6497338582`)
4. DR1 parity programme notes (`document:dr1-parity-notes`)
5. DR1 parity backlog judgements (`document:dr1-parity-backlog`)
6. Design Release 2.1 prototype source (`prototype:dr2-1-source`)
7. Design Release 2.1 traces (`trace:prototype-dr2-1`)
8. Design Release 2.1 specs (`prototype:dr2-1-specs`)
9. Animals backend (`repo:backend`)
10. INS backend (`repo:insbackend`)
11. Address book (`repo:addressbook`)
12. Reference data (`repo:referencedata`)
13. Stub (`repo:stub`)
14. Animals frontend (`repo:frontend`)
15. INS frontend (`repo:insfrontend`)
16. Tests repo (`repo:tests`)
17. Performance tests (`repo:perftests`)
18. Animals frontend fit traces (`trace:animals-fit`)
19. INS frontend fit traces (`trace:ins-fit`)
20. End-to-end traces (`trace:e2e`)

The prototype wins on look and feel by default. It never decides architecture. V4 outranks it on germinal data, format and mandatory status.

## Questions for Sam

11 questions were challenged against precedence and every ruling. All 11 were settled, and none waits on a blocker. No question is open, so nothing below needs a default.

## Waiting on others

| Requirement | Waiting for | Increment |
|---|---|---|
| req-456 | INS team: make the address lookup a real feature (only the EUDPA-390 spike exists, dev and local only). The Northern Ireland search is then re-distilled | inc-042 |
| req-457 | INS team: the address lookup, as req-456 | inc-042 |
| req-458 | INS team: the address lookup, as req-456. Manual entry with every field shown stays until then | inc-042 |
| req-1819 | INS team: the address lookup, as req-456. The stub's Northern Ireland addresses wait with the search | inc-042 |
| req-509 | CDP: raise the nginx ingress body cap for the animals frontend to at least 50,001,024 bytes, recorded against EUDPA-518 | inc-036 |
| req-1214 | INS team: the address lookup made real (9 October ruling, claim 34). The address search area is then re-distilled | inc-072 |
| req-1216 | INS team: the address lookup, as req-1214 | inc-072 |
| req-1217 | INS team: the address lookup, as req-1214 | inc-072 |
| req-1218 | INS team: the address lookup, as req-1214 | inc-072 |
| req-1285 | INS team: the address lookup, as req-1214 | inc-072 |
| req-1863 | INS team: the address lookup, as req-1214 | inc-072 |
| req-1864 | INS team: the address lookup, as req-1214 | inc-072 |
| req-647 | INS team: the INS backend's address lookup made real. The area is then re-distilled | inc-081 |
| req-648 | INS team: the address lookup, as req-647 | inc-081 |
| req-649 | INS team: the address lookup, as req-647 | inc-081 |
| req-650 | INS team: the address lookup, as req-647 | inc-081 |
| req-651 | INS team: the address lookup, as req-647 | inc-081 |
| req-652 | INS team: the address lookup, as req-647 | inc-081 |
| req-653 | INS team: the address lookup, as req-647 | inc-081 |
| req-654 | INS team: the address lookup, as req-647 | inc-081 |
| req-910 | A real source of completion. The ruling names none; the likely one is PIMS Dynamics outcomes (as req-1082) | inc-116 |
| req-1081 | PIMS Dynamics: send post-submission outcomes back. No delay status or reason reaches the service today | inc-142 |
| req-1082 | PIMS Dynamics: send outcomes back. No completed status reaches the service today | inc-142 |
| req-1083 | PIMS Dynamics: send outcomes back. No inspection decision reaches the service today | inc-142 |
| req-1085 | PIMS Dynamics: send outcomes back. Until then no card is in these statuses | inc-142 |
| req-1735 | PIMS Dynamics: send outcomes back, so notifications can count as needing action or status-updated | inc-142 |
| req-1739 | PIMS Dynamics: send the completed outcome back (as req-1082) | inc-142 |
| req-977 | Import-checking systems: send inspection and delay outcomes for each notification (DR1 inc-014) | inc-143 |
| req-1001 | Import-checking systems: send inspection and delay outcomes, as req-977 | inc-143 |
| req-1011 | Import-checking systems: send which notifications are chosen for inspection | inc-144 |
| req-982 | Plants teams: `trade-imports-plants-frontend` and `-backend` publish notifications to the INS read model | inc-146 |

## Settled without a question

"(challenge)" marks the 11 conflicts this run's challenge settled. Missing ids (c-046, c-051, c-086, c-118, c-137, c-182, c-199, c-200, c-254, c-257, c-270) were merged or withdrawn during reconcile.

| Decision | Settled by | Conflict |
|---|---|---|
| Country of origin list keeps what MDM serves; the prototype's content goes to MDM as a content report; nothing waits on MDM | DR1 notes, 9 October ruling | c-001 |
| Country of origin is stored as its ISO code and shown by name | 7 October ruling | c-002 |
| Origin page keeps all three return controls | DR1 notes | c-003 |
| Saving origin with no country lands on the overview | 7 October ruling | c-004 |
| Origin page keeps its server checks; a refused save stores nothing | 7 October ruling | c-005 |
| Accessibility and no-JavaScript duties override Design Release 2.1 only as far as they need to | 7 October ruling | c-006 |
| A start from the all-types dashboard asks "What are you importing?" first in the INS front door; each type goes to its own set or service | DR2.1 source, 9 October ruling | c-007 |
| Region code prefix follows the country live, as a progressive enhancement | DR1 backlog | c-008 |
| Country control takes Design Release 2.1's copy and behaviour | 7 October ruling | c-009 |
| Region code hint changes, box caps at 5 characters, server check stays | 7 October ruling | c-010 |
| Internal reference hint drops the 58-character sentence; the limit stays | 7 October ruling | c-011 |
| With JavaScript, commodity search lists results as you type | 7 October ruling | c-012 |
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
| Each transporter row gets "View details", built once a real transporter details page exists | 9 October ruling | c-052 |
| Status strip follows Design Release 2.1 page by page on transporter pages | 7 October ruling | c-053 |
| Private transporter country list built now: the UK plus GBNAG_SPS_EX countries, as MDM serves them | 9 October ruling | c-054 |
| A commercial transporter with a non-Northern Ireland country is refused | 7 October ruling | c-055 |
| Add transporter forms follow DR1's return-control judgement | DR1 notes | c-056 |
| Design Release 2.1's shipped commercial transporters and statuses are adopted | 7 October ruling | c-057 |
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
| Pickers show one page per role, a live filter and a no-JavaScript search | DR1 backlog | c-094 |
| Picker count wording follows Design Release 2.1 | DR2.1 source | c-095 |
| Picker address column shows one line per address line | DR2.1 source | c-096 |
| Picker rows get a "View" link to the INS address book | DR2.1 source | c-097 |
| A blank picker save returns to roles and addresses, party unchanged | DR2.1 source | c-098 |
| Party pickers end with the primary button alone | DR1 notes | c-099 |
| DR1's address-page blocks do not stop these differences | 7 October ruling | c-100 |
| Records with no role yet appear on every picker | 7 October ruling | c-101 |
| Place of origin picker searches by country as drawn | DR2.1 source | c-102 |
| The party is named "Consignor" | DR2.1 source | c-103 |
| Roles and addresses completes when every shown section is complete | DR2.1 source | c-104 |
| Picker search has a medium label and an icon button "Search" | DR2.1 traces | c-105 |
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
| Hub "Cancel amend" opens the cancel-amendment confirmation | 7 October ruling | c-127 |
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
| "Return to your dashboard" and the view's Back go to the INS overall dashboard | 7 October ruling | c-143 |
| Continue on an action-required view starts an amendment | 7 October ruling | c-144 |
| INS root becomes the Design Release 2.1 overall dashboard | DR2.1 source (DR1 agrees) | c-145 |
| Home caption "Dashboard", heading "Import notification service" | DR2.1 source (DR1 agrees) | c-146 |
| "Create new" always shows and goes to the type choice | 7 October ruling | c-147 |
| Glance counts come from the organisation's real notifications | 7 October ruling | c-148 |
| "Action needed" means a submitted notification missing a required document or identifier | DR2.1 source, 9 October ruling | c-149 |
| No "Messages" link or unread count | 7 October ruling | c-150 |
| Plants "View dashboard" links to the real plants dashboard | 7 October ruling | c-151 |
| Plants glance cards link like the others; the cards and counts wait on plants data (req-982) | 7 October ruling | c-152 |
| "Log out" stays | 7 October ruling | c-153 |
| Drill-down cards keep status-driven links | DR1 notes | c-154 |
| Drill-downs apply the chosen search and sort | 7 October ruling | c-155 |
| Home and drill-downs take Design Release 2.1's styling | DR2.1 traces | c-156 |
| Drill-downs are always sorted, "Newest first" by default | DR1 notes | c-157 |
| Per-category glance cards replace DR1's band | 7 October ruling | c-158 |
| INS frontend hosts both category lists; the read model gains the category | DR1 notes (Rhys's judgement), 9 October ruling | c-159 |
| Drafts keep Resume, Copy as new and Delete; submitted cards keep status actions | 7 October ruling (DR1 inc-030) | c-160 |
| List is always sorted: "Newest first", "Oldest first", "Arrival date" | DR1 notes | c-161 |
| Search, sort and filters really change the list | 7 October ruling | c-162 |
| Page links keep tab, sort, search and filters | 7 October ruling | c-163 |
| Card writes the arrival date as "21 June 2026" | 7 October ruling | c-164 |
| Amending notifications sit in "In progress" with an "Amending" tag | 7 October ruling | c-165 |
| Unreadable or reversed filter dates show GOV.UK errors | 7 October ruling | c-166 |
| DR1's deferred dashboard rows do not hold back Design Release 2.1 | 7 October ruling | c-167 |
| Address book shows 8 a page | DR2.1 source | c-168 |
| Address book search runs on the server, with live filtering on top | 7 October ruling | c-169 |
| Address book honours same-site and approved cross-origin returns | 7 October ruling | c-170 |
| INS list drops controls Design Release 2.1 lacks | 7 October ruling | c-171 |
| Address book stays persisted and organisation-wide | 7 October ruling | c-172 |
| Address view reads the book only | 7 October ruling | c-173 |
| View link keeps the visually hidden name | 7 October ruling | c-174 |
| Log out stays in the INS navigation | 7 October ruling | c-175 |
| Address records gain their type and uses, in the address book's own field shape | 9 October ruling | c-176 |
| Country select offers reference data's unfiltered list, as MDM serves it | 9 October ruling | c-177 |
| Address search uses the real lookup and is blocked until the lookup is real | Rulings | c-178 |
| Length limits and email check stay | 7 October ruling, V4 Standard Address Block | c-179 |
| Error-state accessibility stays | 7 October ruling | c-180 |
| Addresses persist; an edit keeps every use | 7 October ruling | c-181 |
| Templates are stored by the backend, with no seeded examples | Rulings | c-183 |
| A template is private to the user who saved it | DR2.1 source | c-184 |
| Templates "Sort by:" is built as drawn and does not reorder | DR2.1 source | c-185 |
| A template saves each party's address separately | 7 October ruling | c-186 |
| Using a template seeds the transporter's country | 7 October ruling | c-187 |
| No saving a template by GET | 7 October ruling | c-188 |
| Amend, cancel amendment and copy start by form posts | 7 October ruling | c-189 |
| Amend and cancel-amendment confirmations are dialogs as drawn | 7 October ruling | c-190 |
| Confirming an amendment lands on the amend review | DR2.1 source | c-191 |
| Amendment edits are saved to the record | 7 October ruling | c-192 |
| Delete stays a soft delete | 7 October ruling | c-193 |
| Dashboard cards keep status-driven actions | DR1 notes | c-194 |
| Design Release 2.1 copy adopted on the delete and cancel-amend pages | DR1 backlog | c-195 |
| A copy carries exactly Design Release 2.1's list | DR2.1 source | c-196 |
| Copying mid-amendment copies the submitted version | DR2.1 source | c-197 |
| Guards, delete and view Back return to the INS overall dashboard | DR2.1 source, 9 October ruling | c-198 |
| Continue on the amend review is held while anything is invalid, with an error summary | 7 October ruling | c-201 |
| Reason for import is asked before commodity details | DR2.1 source, 9 October ruling | c-202 |
| CPH number is reached only from its roles and addresses row | DR2.1 source | c-203 |
| Pages opened from the overview return to it on save | DR2.1 source, 9 October ruling | c-204 |
| Opening run always ends on the review page | DR2.1 source | c-205 |
| Back follows the page's context, read from the service's own state | DR2.1 source | c-206 |
| Origin page offers the overview return controls | 7 October ruling (DR1 inc-161) | c-207 |
| Pickers, CPH and permanent address pages end with the primary button alone | 7 October ruling (DR1 rule (b)) | c-208 |
| Contact page return controls say "hub", as drawn | 7 October ruling | c-209 |
| While amending, overview pages get the amend ending; pickers, CPH and permanent address show "Save and return" | 7 October ruling | c-210 |
| "Save and return to overview" skips required-answer checks but not format checks | 7 October ruling | c-211 |
| Log out stays last in the navigation | 7 October ruling | c-212 |
| Address book item goes to the INS address book from both frontends and both sets | 9 October ruling | c-213 |
| Logo links to gov.uk; service name to the dashboard of each set or frontend | 9 October ruling | c-214 |
| Feedback link stays the APHA service desk email | DR1 backlog | c-215 |
| No page shows the signed-in identity | Animals frontend | c-216 |
| Address search is built in no environment until the lookup is real; manual entry is built now | 9 October ruling | c-217 |
| Northern Ireland transporter search uses the INS lookup filtered to BT postcodes; blocked with search | 9 October ruling | c-218 |
| Choosing a different type starts a new notification; the old one is untouched | 9 October ruling | c-219 |
| Template creation's type question offers only Live animals and Germinal products | 9 October ruling | c-220 |
| Country of origin labels subdivisions "<territory> (<parent>)", sorted by label, in both sets | DR2.1 source, 9 October ruling (challenge) | c-221 |
| Each set has its own commodity catalogue; germinal lines leave the live-animals one | 9 October ruling | c-222 |
| The real commodity lines and fields stay; the prototype's hidden fields are not copied | 9 October ruling | c-223 |
| Commodity pages keep their real paths | 9 October ruling | c-224 |
| Performance tests change in each increment whose change breaks a k6 script | 9 October ruling (challenge) | c-225 |
| Port of exit options read "<name> - <code>" | DR2.1 source | c-226 |
| Germinal products is a sibling set at /germinal-products, started from its own route | 9 October ruling | c-227 |
| The germinal set holds only germinal products; there is no mixed case | 9 October ruling | c-228 |
| Embryos and ova are separate items (typeCodes EMBRYO and OVA) | 9 October ruling | c-229 |
| Germinal catalogue holds V4's commodities as 18 items; no Cat or Dog embryos or ova | V4 (challenge) | c-230 |
| Germinal gross weight is asked and stored per species line | 9 October ruling | c-231 |
| Germinal gross weight and temperature are optional; number of packages stays required | V4 | c-232 |
| Temperature is asked once and stored on every line | V4 and DR2.1 traces | c-233 |
| A germinal line's quantity is its number of packages, a whole number from 1 to 1,000 | V4, 9 October ruling (challenge) | c-234 |
| A germinal species counts as identified once its entry holds one identifier | 9 October ruling, V4 | c-235 |
| Arrival details page stays at port-of-entry | 9 October ruling | c-236 |
| Documents page returns without ?from= markers | 9 October ruling | c-237 |
| No template-mode guard on documents; templates never offer it | 9 October ruling | c-238 |
| Permanent address storage shape is the real model's | 9 October ruling | c-239 |
| CPH, permanent address and contact pages use real paths and field names | 9 October ruling | c-240 |
| No new link to the kept contact edit route | DR2.1 source (challenge) | c-241 |
| CPH, permanent address and contact error states keep "Error: " and HTTP 400 | Rulings | c-242 |
| Pages return to the hub by the flow's fallback, with no from=hub marker | 9 October ruling | c-243 |
| Germinal hub weight card region is named "Gross weight summary" | 9 October ruling | c-244 |
| Review, declaration and confirmation keep their real paths | 9 October ruling | c-245 |
| A draft's review shows the view header with its Draft status and stays editable | 9 October ruling (challenge) | c-246 |
| Confirmation's "Create a new notification" keeps today's mechanism, styled as a link | 9 October ruling | c-247 |
| No template guard on the declaration | 9 October ruling | c-248 |
| No /dashboard redirect | 9 October ruling | c-249 |
| Home and drill-down links use the INS service's own paths | 9 October ruling | c-250 |
| Lists keep the prototype's content; the INS frontend names addresses and parameters | 9 October ruling | c-251 |
| The list banner stays triggered by the redirect flag | 9 October ruling | c-252 |
| The INS service names the tab and search parameters | 9 October ruling | c-253 |
| Only transporters carry a transporter authorisation number | 9 October ruling (challenge) | c-255 |
| Phone stays free text up to 20 characters | Address book, V4 sets no rule (challenge) | c-256 |
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
| The deletion message shows on the overall dashboard through ?deleted=1 | 9 October ruling (challenge) | c-269 |
| The deletion banner does not dismiss itself | 7 October ruling, accessibility duty (challenge) | c-271 |
| The category travels as an optional top-level field on the outbox event | 9 October ruling (challenge) | c-272 |
| GBN-AG trade lines gain typeCodes: LIVE_ANIMAL, SEMEN, EMBRYO, OVA | 9 October ruling | c-273 |
| Journey pages keep real paths; germinal uses /germinal-products | 9 October ruling | c-274 |
| Buttons keep the service's own fields | 9 October ruling | c-275 |
| No from=hub or from=review markers | 9 October ruling | c-276 |
| Every germinal species, a lone one included, needs one identifier before submit and Complete | V4, 9 October ruling | c-277 |

## Already in place

780 adopted requirements are met today. The second column names where today's evidence shows it. Statements are cut short; the full text is in `distil/requirements.json`.

Key: E2E is the end-to-end traces, animals fit and INS fit the fit traces, FE a frontend repo, BE a backend repo.

| Requirement | What already exists |
|---|---|
| req-009 Starting a notification from the live-animals (category) dashb... | animals FE |
| req-011 A new notification gets a reference GBN-AG-<two-digit year>- f... | E2E, animals fit, tests repo |
| req-012 The origin page has the browser title 'Origin of the import -... | E2E, animals FE, animals fit, tests repo |
| req-014 The country of origin question reads 'Country of origin', as t... | E2E, animals fit, tests repo |
| req-021 Choosing a country from the results closes the list and leaves... | E2E, animals fit, tests repo |
| req-022 When nothing matches what was typed, the country results show... | E2E, animals FE, animals fit |
| req-023 The country of origin is submitted and stored as its code (an... | E2E, animals FE, animals fit, tests repo |
| req-024 A saved country of origin, including a subdivision, is shown a... | E2E, animals FE, animals fit |
| req-025 The places offered as country of origin are whatever MDM serve... | E2E, animals FE, animals fit, reference data |
| req-031 A submitted country not in the list is refused with 'Select a... | animals FE, animals fit |
| req-032 The country of origin does not block saving the origin page: t... | E2E, animals FE, animals fit, tests repo |
| req-033 Saving the origin page with no country sets the user down on t... | E2E, animals FE, animals fit, tests repo |
| req-035 The origin page asks 'Does the consignment have a region of or... | E2E, animals fit, tests repo |
| req-037 Answering Yes reveals, under the Yes option, a 5-character-wid... | E2E, animals FE, animals fit, tests repo |
| req-039 The server still refuses a region code longer than 5 character... | E2E, animals FE, animals fit |
| req-042 Without JavaScript, the region code prefix is drawn by the ser... | E2E, animals FE |
| req-043 The region code prefix is the chosen country's two-letter code... | E2E, animals FE |
| req-044 The region code is trimmed, upper-cased and stored as prefix,... | E2E, animals FE, animals fit, tests repo |
| req-045 Answering Yes and leaving the region code empty (or holding on... | E2E, animals FE, animals fit, tests repo |
| req-047 The region of origin code question may be left unanswered on s... | E2E, animals FE, animals fit |
| req-048 The origin page has an optional free-text field labelled 'Your... | E2E, animals FE, animals fit, tests repo |
| req-050 An internal reference over 58 characters is refused with 'Inte... | E2E, animals FE, animals fit |
| req-051 The origin page ends with 'Save and continue', a secondary 'Sa... | E2E, animals FE, animals fit, tests repo |
| req-052 A valid origin page with a country continues to the commodity... | E2E, animals FE, animals fit, tests repo |
| req-053 A refused origin save is not stored: the server answers 400 an... | E2E, animals FE, animals fit, tests repo |
| req-054 The type and origin pages have an accessible build where the p... | E2E, animals FE, animals fit, tests repo |
| req-055 The origin form is a server-validated POST (novalidate) carryi... | E2E, animals FE, animals fit |
| req-056 The three origin questions (country label, region code legend,... | animals FE, animals fit |
| req-060 The reference data service serves GET /countries: a JSON array... | reference data |
| req-061 The reference data service reads countries from MDM's geograph... | reference data |
| req-062 The reference data service caches MDM countries per blocks val... | reference data |
| req-063 The reference data service answers an empty MDM countries resu... | reference data |
| req-064 The reference data service stays the shared home for MDM-sourc... | reference data |
| req-066 The commodity page has the browser title 'What are you importi... | E2E, animals FE, animals fit, tests repo |
| req-070 A closed 'Help with commodity codes' details component below t... | E2E, animals FE, animals fit |
| req-077 Search results are grouped under a header naming the commodity... | E2E, animals FE, animals fit, tests repo |
| req-078 The commodity search matches a species' common name and Latin... | E2E, animals FE, animals fit, tests repo |
| req-079 A search that matches nothing says 'No results found' and list... | E2E, animals FE, animals fit, tests repo |
| req-082 Once something is chosen, the selected panel is headed '<N> se... | E2E, animals FE, animals fit, tests repo |
| req-083 Species from several commodities can be chosen on one notifica... | E2E, animals FE, animals fit, tests repo |
| req-084 Reopening the commodity page shows the species already saved o... | E2E, animals FE, animals fit |
| req-086 When the commodity page or the Commodity details page shows an... | E2E, animals fit |
| req-090 The commodity page and the Commodity details page each end wit... | E2E, animals FE, animals fit |
| req-104 The Commodity details page has the title 'Commodity details -... | E2E, animals FE, animals fit, tests repo |
| req-106 The Selected commodities table has one row per commodity, exce... | E2E, animals FE, animals fit |
| req-107 Below the Selected commodities table an 'Add another commodity... | E2E, animals FE, animals fit |
| req-109 Opening Commodity details with no commodity on the notificatio... | animals FE, animals fit |
| req-110 Commodity details groups the questions under an h2 per commodi... | E2E, animals FE, animals fit |
| req-111 Each live-animal species asks 'Number of animals' with no hint... | E2E, animals FE, animals fit, tests repo |
| req-113 For live animals the number of packages is optional, but when... | animals FE, animals fit |
| req-115 A species line that holds animal identifier records cannot be... | animals FE |
| req-116 Commodity details fills each field with the quantity already s... | animals FE, animals fit |
| req-120 'Save and return to overview' on Commodity details validates t... | E2E, animals FE, animals fit |
| req-126 On the live-animals set the overview's Commodity details task... | animals FE, animals fit |
| req-129 The commodity page and Commodity details have no serious or cr... | animals FE, animals fit |
| req-130 Where Design Release 2.1 uses custom markup that looks the sam... | E2E, animals fit |
| req-132 The main import reason page shows the caption 'About the consi... | E2E, animals FE, animals fit, tests repo |
| req-133 Both pages sit in the journey layout: a Back link, a strip wit... | animals fit |
| req-134 In the live-animals set the main import reason is one radio ch... | E2E, animals FE, animals fit, tests repo |
| req-135 Each reason carries its hint: Internal market 'For imports of... | E2E, animals FE, animals fit |
| req-136 A main import reason is optional to proceed: Save and continue... | E2E, animals FE, animals fit, tests repo |
| req-137 Each reason that needs follow-up questions opens them in a sta... | E2E, animals FE, animals fit, tests repo |
| req-138 Choosing Internal market reveals the radio question 'Purpose i... | E2E, animals FE, animals fit, tests repo |
| req-139 Each internal market purpose carries its hint beneath its labe... | E2E, animals FE, animals fit |
| req-140 With Internal market chosen and no purpose, Save and continue... | E2E, animals FE, animals fit, tests repo |
| req-141 Internal market with a purpose (for example Breeding) saves in... | E2E, animals FE, animals fit |
| req-142 Choosing Transhipment or onward travel reveals one question on... | E2E, animals FE, animals fit, tests repo |
| req-143 Choosing Transit reveals two selects in this order: 'Port of e... | E2E, animals FE, animals fit |
| req-144 Choosing Temporary admission horses reveals two questions in t... | E2E, animals FE, animals fit |
| req-146 The destination country selects for transhipment and transit b... | animals FE, animals fit |
| req-149 The transit and temporary admission 'Port of exit' selects bot... | E2E, animals FE, animals fit |
| req-150 The exit date is one text field using the MOJ date picker, lab... | E2E, animals FE, animals fit |
| req-151 With Transhipment or onward travel chosen and no listed destin... | E2E, animals FE, animals fit |
| req-152 With Transit chosen, a missing port of exit shows 'Select a po... | E2E, animals FE, animals fit |
| req-153 With Temporary admission horses chosen, a blank exit date show... | animals FE, animals fit |
| req-154 An exit date that is not a real calendar date (for example 31/... | animals FE, animals fit |
| req-155 When the reason page is shown again after a refused submit, th... | animals FE |
| req-156 Only the chosen reason's follow-ups are validated and saved; c... | E2E, animals FE, animals fit |
| req-157 The notification holds one destination country and one port of... | E2E, animals FE, animals fit, tests repo |
| req-158 The reason, internal market purpose, certification purpose and... | animals FE, animals fit |
| req-159 A submitted reason, certification purpose or unweaned value th... | E2E, animals FE, animals fit |
| req-160 When either page is refused on submit, the browser title is pr... | E2E, animals FE, animals fit |
| req-161 When a saved destination country, port of exit or certificatio... | animals FE |
| req-162 If saving either page fails, the page is shown again with the... | animals FE |
| req-165 Both pages end with a 'Save and continue' button, a secondary... | animals FE, animals fit |
| req-171 The additional details page is headed 'Additional details' (ti... | E2E, animals FE, animals fit, tests repo |
| req-172 The additional details page asks 'What are the animals certifi... | E2E, animals FE, animals fit, reference data, tests repo |
| req-174 When it applies, the additional details page asks 'Does the co... | E2E, animals FE, animals fit |
| req-176 Both additional details questions are optional to proceed: Sav... | E2E, animals FE, animals fit, tests repo |
| req-177 The additional details task counts as complete when the page d... | animals fit |
| req-185 Both pages have no serious or critical WCAG 2 A or AA axe viol... | animals FE, animals fit |
| req-186 Both forms post to their own URL with browser validation off a... | animals FE, animals fit |
| req-187 Both pages keep their Welsh copy, and every English string thi... | animals FE |
| req-188 Both pages are built from govuk-frontend components (radios wi... | E2E, animals fit |
| req-194 The page heading (h1) is 'Identification details' and the brow... | E2E, animals FE, animals fit, tests repo |
| req-195 The heading carries the caption 'About the consignment'. | E2E, animals FE, animals fit |
| req-196 Inset text under the heading reads 'You must add all animal id... | E2E, animals FE, animals fit |
| req-197 Above the heading, the page shows the notification status stri... | E2E, animals fit |
| req-202 The page ends with the shared journey actions: 'Save and conti... | E2E, animals FE, animals fit |
| req-205 Pressing Enter in a field submits the page as 'Save and contin... | E2E, animals FE, animals fit |
| req-206 The page keeps the real service's mechanics: its address under... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-209 In the live-animals set, the summary's quantity column is head... | E2E, animals FE, animals fit |
| req-210 The summary lists every selected commodity, including one with... | E2E, animals FE, animals fit |
| req-211 Each summary row has a 'Change' link (visually hidden suffix n... | E2E, animals FE, animals fit |
| req-212 Below the summary, an 'Add another commodity' link goes to the... | E2E, animals FE, animals fit |
| req-214 Each species panel has a 'Change number of animals' link (visu... | E2E, animals FE, animals fit |
| req-216 Cattle (0102) are identified per animal by 'Ear tag' then 'Pas... | E2E, animals FE, animals fit, tests repo |
| req-217 Horses (0101) are identified per animal by 'Microchip', 'Passp... | E2E, animals fit |
| req-218 Other live mammals on 01061900 (cats, dogs, ferrets) are ident... | E2E, animals FE, animals fit |
| req-221 A species whose commodity has no identifier (such as poultry o... | E2E, animals FE, animals fit |
| req-227 Text identifier fields are 20-character-wide text inputs; 'Hor... | animals FE, animals fit |
| req-228 Each live-animal identifier (microchip, passport, tattoo, ear... | E2E, animals FE, animals fit |
| req-231 Each identifier error appears in an error summary titled 'Ther... | animals FE, animals fit |
| req-232 When a save fails validation, the page is shown again with the... | E2E, animals FE |
| req-233 In the live-animals set, an animal counts as entered once at l... | E2E, animals FE, animals fit |
| req-235 The saved-animals table lists every saved animal, including on... | E2E, animals FE, animals fit |
| req-237 The saved-animals table has an 'Animal' column, one column per... | E2E, animals FE, animals fit, tests repo |
| req-238 Each saved row has a 'Remove' button (visually hidden suffix '... | E2E, animals FE, animals fit |
| req-239 A saved animal cannot be changed in place: correcting one mean... | animals fit |
| req-241 For live animals each panel takes one animal at a time under t... | E2E, animals FE, animals fit |
| req-242 A species with more than one animal has a panel button 'Save a... | E2E, animals FE, animals fit, tests repo |
| req-244 A panel save is a full page post that redirects back to the pa... | E2E, animals FE, animals fit, tests repo |
| req-245 A stale panel save for a species with every animal already ent... | animals FE, animals fit |
| req-246 If a species ever holds more saved animals than its number of... | animals FE |
| req-247 Lowering a species' number of animals on Commodity details bel... | E2E, animals FE, animals fit |
| req-248 In the live-animals set, the hub's Identification details row... | E2E, animals fit |
| req-249 In the live-animals set, to submit: identification details are... | animals fit |
| req-268 The page has no serious or critical axe violations against WCA... | animals FE, animals fit |
| req-269 The summary and saved-animals lists render as GOV.UK tables, a... | E2E, animals FE, animals fit |
| req-272 The arrival details page has the heading and page title 'Arriv... | E2E, animals FE, animals fit, tests repo |
| req-273 The arrival details page shows the caption 'Transport and arri... | E2E, animals FE, animals fit |
| req-274 Arrival details and transit countries both show the notificati... | E2E, animals fit |
| req-275 The arrival details page's Back link goes to the notification... | E2E, animals FE, animals fit, tests repo |
| req-276 When a page in this area has errors, an error summary titled '... | E2E, animals FE, animals fit |
| req-277 The arrival details page asks five questions in this order: ar... | E2E, animals FE, tests repo |
| req-279 The arrival date question is labelled 'Arrival date at port of... | E2E, animals FE, animals fit |
| req-280 The arrival date hint reads 'The expected date of arrival at t... | E2E, animals FE, animals fit |
| req-281 The arrival date is one text input enhanced by the MoJ date pi... | E2E, animals FE, animals fit, tests repo |
| req-282 The arrival date must fall between 7 days before today and 6 m... | E2E, animals FE, animals fit, tests repo |
| req-283 The arrival date is typed as day/month/four-digit year, leadin... | E2E, animals FE, animals fit, tests repo |
| req-284 An arrival date that is not a real date (such as 31/2/2026) is... | animals FE, animals fit |
| req-285 A typed arrival date outside the window is refused with 'Arriv... | E2E, animals FE, animals fit, tests repo |
| req-286 A saved arrival date that has since fallen outside the window... | animals FE |
| req-287 When arrival details has any error, nothing on the page is sav... | E2E, animals FE, animals fit, tests repo |
| req-288 The open calendar sits in the flow of the page and pushes the... | animals FE, animals fit |
| req-289 Without JavaScript the arrival date stays an editable text inp... | animals FE, animals fit |
| req-292 The port of entry question is labelled 'Port of entry'. | E2E, animals FE, animals fit |
| req-297 The port of entry type-ahead lists every port when clicked, fi... | E2E, animals FE, animals fit |
| req-298 When nothing matches what is typed in the port search, it says... | E2E, animals FE, animals fit |
| req-300 The port options come from the reference-data service's GET /p... | E2E, animals FE, animals fit, reference data |
| req-301 When MDM answers the ports call with no body or no result list... | reference data |
| req-305 A submitted port not in the list is refused with 'Select a val... | E2E, animals FE, animals fit |
| req-306 A saved port that is no longer offered is flagged when the pag... | animals FE |
| req-307 Without JavaScript the port of entry is a native select linked... | E2E, animals FE, animals fit |
| req-308 Means of transport is a select labelled 'Means of transport to... | E2E, animals FE, animals fit, tests repo |
| req-313 Means of transport is stored as its reference code (AIRPLANE,... | animals FE, animals fit, tests repo |
| req-314 A submitted means of transport that is not a reference code is... | animals FE, animals fit |
| req-316 Arrival date, port of entry, transport identification and tran... | animals FE, animals fit, tests repo |
| req-317 The transport identification question is labelled 'Transport i... | E2E, animals FE, animals fit, tests repo |
| req-319 Below the lead-in, the transport identification hint is a bull... | E2E, animals FE, animals fit |
| req-320 The transport document reference question is labelled 'Transpo... | E2E, animals FE, animals fit, tests repo |
| req-321 The transport document reference hint reads 'Enter the referen... | E2E, animals FE, animals fit |
| req-322 Transport identification longer than 58 characters is refused... | animals FE, animals fit |
| req-323 A transport document reference longer than 58 characters is re... | animals FE, animals fit |
| req-324 Transport identification and transport document reference are... | animals FE |
| req-325 Arrival details and transit countries each end with 'Save and... | E2E, animals FE, animals fit |
| req-326 Reached in the journey's page order, Save and continue on arri... | E2E, animals FE, animals fit, tests repo |
| req-330 Saved arrival answers are shown again when the user returns: t... | E2E, animals FE, animals fit, tests repo |
| req-331 The overview's 'Arrival details' task shows Complete only when... | E2E, animals FE, animals fit, tests repo |
| req-333 When a save fails, arrival details and transit countries re-re... | animals FE |
| req-334 Each form on both pages posts back without browser validation... | E2E, animals fit |
| req-335 Arrival details (with the calendar open) and transit countries... | animals FE, animals fit |
| req-336 The type-aheads on both pages are built from accessible-autoco... | E2E, animals fit |
| req-337 The transit countries page is served at the journey slug 'tran... | E2E, animals FE, animals fit, tests repo |
| req-339 The transit countries page heading is 'Which countries will th... | E2E, animals FE, animals fit, tests repo |
| req-340 The transit countries page shows the caption 'Movement' above... | E2E, animals FE, animals fit |
| req-341 Below the heading the page says 'Countries the consignment wil... | E2E, animals FE, animals fit |
| req-342 A second paragraph says 'This does not include the United King... | E2E, animals FE, animals fit |
| req-345 The transit countries page opens straight on a country search,... | E2E, animals FE, animals fit |
| req-346 The transit country search shows the placeholder 'Search for a... | animals FE, animals fit |
| req-347 The transit country type-ahead filters on what is typed from a... | E2E, animals FE, animals fit |
| req-350 Without JavaScript, the transit country search is a native sel... | E2E, animals FE, animals fit |
| req-351 Each transit country's Remove control reads 'Remove' with the... | E2E, animals FE, animals fit |
| req-352 When arrival details or transit countries shows a validation e... | E2E, animals fit |
| req-355 Both searches report to screen readers through a visually hidd... | animals FE, animals fit |
| req-357 Added transit countries are listed under a 'Country' column he... | E2E, animals FE, animals fit, tests repo |
| req-358 Transit countries are optional: Save and continue with none ad... | E2E, animals FE, animals fit, tests repo |
| req-359 Saved transit countries are listed again when the user returns... | E2E, animals FE, animals fit, tests repo |
| req-360 Transit countries are stored as a list of country codes. | animals FE, animals fit |
| req-361 Saving arrival details with a means of transport other than Ra... | E2E |
| req-362 Pressing 'Add country' with nothing chosen is refused with 'En... | E2E, animals FE, animals fit, tests repo |
| req-363 Adding a country already in the list is refused with 'You have... | E2E, animals FE, animals fit |
| req-364 A country not on the offered list, added or saved, is refused... | animals FE, animals fit |
| req-365 A saved transit list holding a country no longer offered is fl... | animals FE |
| req-366 At most 12 transit countries can be added: when the twelfth is... | animals FE, animals fit |
| req-367 Saving more than 12 transit countries is refused with 'Select... | animals FE, animals fit |
| req-368 The 12-country cap is not stated before the user reaches it. | animals FE, animals fit |
| req-371 The overview shows a 'Transit countries' task between 'Arrival... | E2E |
| req-373 No rule stops the country of origin being added as a transit c... | animals fit |
| req-374 The notification review shows the arrival date under the label... | DR1 backlog row B-053 records today's label |
| req-379 The transporter list page has the caption 'Transport and arriv... | E2E, animals FE, animals fit, tests repo |
| req-380 Under the heading, the transporter list says 'This is the pers... | E2E, animals FE, animals fit |
| req-381 The transporter list states 'Your transporter must hold a vali... | E2E, animals FE, animals fit |
| req-382 The transporter list links to the economic-activity section of... | E2E, animals FE, animals fit |
| req-384 The transporter list states 'Documents issued by DAERA are val... | E2E, animals FE, animals fit |
| req-385 The transporter list and the 'Add a commercial transporter' pa... | animals fit |
| req-388 The transporter search box is labelled 'Search' with the hint... | E2E, animals FE, animals fit |
| req-391 Transporter search ignores letter case and accents and trims t... | E2E, animals FE, animals fit |
| req-393 Transporters are listed in a table inside the 'Select a transp... | E2E, animals FE, animals fit, tests repo |
| req-395 Each row's Status is a tag: 'Approved' in green and 'New' in m... | E2E, animals FE, animals fit |
| req-400 A row's Address cell is the address parts joined with commas,... | E2E, animals FE, animals fit |
| req-401 Transporters the organisation has added are listed first, newe... | animals FE, animals fit |
| req-402 Saving the transporter list with no transporter chosen shows n... | E2E, animals FE, animals fit, tests repo |
| req-403 A submitted transporter that is not on the organisation's list... | animals FE, animals fit |
| req-404 Choosing a transporter saves it on the notification with its t... | E2E, animals FE, animals fit, tests repo |
| req-406 The transporter list ends with 'Save and continue', a secondar... | E2E, animals FE, animals fit, tests repo |
| req-409 The transporter list's Back link goes to the notification over... | E2E, animals FE, animals fit |
| req-411 The overview's 'Transport details' task links to the transport... | E2E, animals FE, animals fit |
| req-412 The transporter list is the journey's one transporter step, re... | E2E, animals FE, animals fit |
| req-415 The 'Choose a transporter type' page has the caption 'Add a ne... | E2E, animals FE, animals fit, tests repo |
| req-418 The type page offers 'Private transporter' (no hint) then 'Com... | E2E, animals FE, animals fit, tests repo |
| req-423 The type page's Back link returns to the transporter list; eve... | E2E, animals FE, animals fit |
| req-424 The type page remembers the type chosen and checks it on retur... | E2E, animals FE, animals fit, tests repo |
| req-426 Changing the transporter type removes the saved transporter of... | E2E, animals FE |
| req-430 The private transporter form asks, in order, 'Name or organisa... | E2E, animals FE, animals fit, tests repo |
| req-433 On the private transporter form, a missing country shows 'Sele... | E2E, animals FE, animals fit |
| req-435 On the private transporter form, a blank required field shows... | E2E, animals FE, animals fit |
| req-436 On the private transporter form, over-long values are refused:... | animals FE, animals fit |
| req-437 On both add forms, an invalid save re-renders the page with ev... | E2E, animals FE, animals fit |
| req-439 Both add forms trim surrounding spaces from every value before... | E2E, animals FE, animals fit |
| req-445 The commercial banner repeats the list's authorisation guidanc... | animals fit |
| req-446 The commercial transporter form asks, in order, 'Transporter a... | E2E, animals FE, animals fit |
| req-452 On the commercial transporter form, a blank name, address line... | animals FE, animals fit |
| req-453 On the commercial transporter form, over-long values are refus... | animals FE, animals fit |
| req-454 A commercial transporter's country is fixed to Northern Irelan... | E2E, animals FE, animals fit, tests repo |
| req-455 A commercial transporter posted with a country other than Nort... | animals FE |
| req-459 A saved transporter is recorded as type Private or Commercial... | animals FE, animals fit |
| req-460 Both add forms' Back links go to 'Choose a transporter type',... | E2E, animals FE, animals fit |
| req-464 Transporters a trader adds belong to the organisation, not the... | E2E, animals FE, animals fit |
| req-466 If saving on a transporter page fails in a recoverable way, th... | animals FE |
| req-467 Every transporter form posts a CSRF crumb and a concurrency to... | E2E, animals fit |
| req-468 The transporter pages are built from GOV.UK Frontend component... | E2E, animals fit |
| req-473 The notification review shows the chosen transporter as Name,... | E2E |
| req-474 A trader can submit a notification whose transporter was added... | E2E |
| req-476 The transporter pages show the Alpha phase banner and the serv... | animals fit |
| req-478 The page title is 'Upload documents - Import notification serv... | E2E, animals FE, animals fit, tests repo |
| req-479 Above the caption the page shows the notification's status as... | E2E, animals fit |
| req-480 Opened from the overview or the journey, the page's 'Back' lin... | E2E, animals FE, animals fit |
| req-483 The page opens with: 'You must attach an ITAHC if this consign... | E2E, animals FE, animals fit |
| req-484 The guidance continues 'Other documents you may need to attach... | E2E, animals FE, animals fit |
| req-485 The guidance sits above the 'File upload' card, so the trader... | animals FE, animals fit |
| req-486 A details component titled 'Check which additional documents y... | E2E, animals FE, animals fit |
| req-487 The additional-documents row 'Livestock transiting bluetongue... | animals FE, animals fit |
| req-490 Inside the details component a link 'Check the documents you n... | E2E, animals FE, animals fit |
| req-491 The GOV.UK guidance link's text is the whole phrase 'Check the... | animals FE, animals fit |
| req-492 The add-a-document fields, the 'Save and add another' button a... | E2E, animals FE, animals fit |
| req-493 The first field is a text input labelled 'Document reference'. | animals fit, tests repo |
| req-495 A blank document reference, after surrounding spaces are trimm... | animals BE, animals FE, animals fit |
| req-496 A document reference longer than 58 characters shows 'Document... | animals BE, animals FE, animals fit |
| req-498 The second field is a select labelled 'Document type' with no... | E2E, animals FE, animals fit, tests repo |
| req-500 The document type is submitted, stored and published by its co... | E2E, animals BE, tests repo |
| req-501 Choosing 'Other' as the document type asks for no further desc... | animals BE |
| req-502 No document type, or a type the page did not offer, shows 'Sel... | animals FE, animals fit |
| req-503 The fields come in the order Document reference, Document type... | animals FE, animals fit |
| req-504 The third field is a single text input labelled 'Date of issue... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-506 A blank date of issue shows 'Enter a date of issue'; a date th... | animals BE, animals FE, animals fit |
| req-507 The fourth field is labelled 'Attachment', and its hint opens... | animals FE, animals fit |
| req-511 The hint's third bullet reads 'up to a maximum of 15 files', a... | animals FE, animals fit |
| req-512 The hint's fourth bullet reads 'ZIP files are not allowed for... | animals FE, animals fit |
| req-513 The service enforces the file rules it states: the file picker... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-514 No chosen file shows 'Upload a document' in the summary and on... | animals FE, animals fit |
| req-515 The attachment is a drop zone that says 'No file chosen' in a... | E2E, animals FE, animals fit, tests repo |
| req-516 Without JavaScript the Attachment field is a plain visible fil... | E2E, animals FE, animals fit, tests repo |
| req-517 A file error is drawn on the drop zone itself (error border an... | E2E, animals FE, animals fit |
| req-518 On the Attachment field the error message sits after the 'Your... | animals FE, animals fit |
| req-519 A secondary 'Save and add another' button inside the File uplo... | E2E, animals FE, animals fit, tests repo |
| req-520 Save and add another with nothing entered shows an error summa... | E2E, animals FE, animals fit, tests repo |
| req-521 The error summary appears at the top of the main content, abov... | animals fit |
| req-522 When the upload documents page shows an error the browser titl... | E2E, animals fit |
| req-523 After a validation error the document reference, type and date... | animals fit |
| req-524 After a server-side validation error the chosen file is not ke... | animals fit |
| req-525 When a request body over the size cap reaches the server (no b... | E2E, animals FE, animals fit |
| req-526 A notification holds at most 15 documents. Adding a sixteenth... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-529 Once a document is added, a table inside the File upload card,... | E2E, animals FE, animals fit, tests repo |
| req-531 A document's Status shows a blue 'Scanning for virus' tag whil... | E2E, animals FE, animals fit, tests repo |
| req-532 Every file is really virus scanned. A file the scan rejects sh... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-533 While a document is scanning, the page updates its status with... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-534 A document that scanned clean has a 'View file' link (hidden t... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-535 Each row has a 'Remove' button styled as a link, usable while... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-536 Each Remove button (and View file link) carries visually hidde... | E2E, animals FE |
| req-537 Uploading documents is optional: with no document type chosen,... | animals FE, animals fit, perf tests, tests repo |
| req-541 The page ends with a primary 'Save and continue' button, a sec... | E2E, animals fit |
| req-545 The overview has a section '4. Documents' with one task, 'Uplo... | E2E, animals fit |
| req-546 Each document is saved to the notification as soon as it is ad... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-547 The file goes from the browser to the frontend, which sends it... | E2E, animals BE, animals FE, animals fit, perf tests, tests repo |
| req-548 Documents can be added and removed whatever the notification's... | animals BE |
| req-549 The documents page stays safe and recoverable: text the trader... | animals FE |
| req-550 Nothing on the documents page checks that an ITAHC has been at... | animals FE |
| req-551 The documents page has no serious or critical axe violations (... | animals FE, animals fit, tests repo |
| req-556 The roles and addresses page has the page title 'Consignment a... | animals FE, animals fit, tests repo |
| req-559 The roles and addresses page and every party picker show the s... | E2E, animals fit |
| req-560 The roles and addresses page's Back link goes to the notificat... | animals FE, animals fit |
| req-561 The roles and addresses page keeps showing each section as a G... | E2E, animals FE, animals fit, tests repo |
| req-562 The roles and addresses page lists its sections in this order:... | animals FE, animals fit |
| req-563 Each party section's hint reads: Place of origin 'The address... | animals FE, animals fit |
| req-572 Once a party has an address, its add link is replaced by a 'Ch... | E2E, animals FE, animals fit, tests repo |
| req-573 Where the CPH section shows, it is headed 'County parish holdi... | E2E, animals FE, animals fit |
| req-574 On the live-animals set's roles and addresses page, the CPH nu... | animals FE, animals fit |
| req-581 Pressing 'Save and continue' on the roles and addresses page n... | animals FE |
| req-583 The roles and addresses page ends with a 'Save and continue' b... | E2E, animals FE, animals fit |
| req-585 The overview's '5. Consignment parties' section holds the task... | E2E, animals FE, animals fit |
| req-586 Each party picker has the page title '<party> - Import notific... | E2E, animals FE, animals fit, tests repo |
| req-587 Each party picker's Back link goes to the roles and addresses... | E2E, animals FE, animals fit, tests repo |
| req-589 The consignor, consignee, importer and place of destination pi... | E2E, animals FE, animals fit |
| req-593 Submitting the picker's search, or opening it with a search in... | E2E, animals FE, animals fit, tests repo |
| req-599 The picker lists addresses in a table with a radio column (hea... | E2E, animals FE, animals fit, tests repo |
| req-602 Reopening a picker for a party that already has an address pic... | E2E, animals FE, animals fit |
| req-604 Saving a picker with an address that is not in the organisatio... | animals FE, animals fit |
| req-605 Each of the five party pickers (place of origin, consignor, co... | E2E, animals FE, animals fit |
| req-606 Choosing an address on a picker and pressing 'Save and continu... | E2E, animals FE, animals fit, tests repo |
| req-607 If saving a picked address fails with a recoverable backend er... | animals FE |
| req-614 Each party picker lists its addresses newest first, so an addr... | E2E, tests repo |
| req-615 When a search matches no address, the picker shows 'No address... | E2E, animals FE, animals fit |
| req-616 Every address-book read from the animals frontend is made on t... | E2E, animals FE, animals fit |
| req-617 A deleted address-book record is never offered on a picker; fe... | animals FE |
| req-618 The animals frontend reads the address book and never writes t... | E2E, animals FE, tests repo |
| req-620 The roles and addresses page and every party picker have no se... | E2E, animals FE, animals fit |
| req-630 The 'Add a new address' link to the INS address book carries j... | E2E, animals FE |
| req-631 The journey's address-return route accepts a return only when... | E2E, animals FE |
| req-632 When a return cannot be completed, the trader goes back to the... | animals FE |
| req-633 A trader with no INS session who follows 'Add a new address' s... | E2E |
| req-641 The add-address page keeps the labels 'Address line 1', 'Addre... | E2E |
| req-645 Under 'Contact details' the add-address page asks for 'Email a... | E2E |
| req-661 On the add-address page a blank address line 1 shows 'Enter ad... | animals FE |
| req-662 On the add-address page a blank town or city shows 'Enter a to... | animals FE |
| req-665 On the add-address page email address is required, and a blank... | animals FE |
| req-667 A failed submit of the add-address page shows an error summary... | E2E, tests repo |
| req-668 The add-address page keeps the address book's length and forma... | E2E, animals FE, tests repo |
| req-669 A refused add-address submit answers HTTP 400 and prefixes the... | E2E, animals FE, animals fit |
| req-676 An address added from the journey is saved into the signed-in... | E2E |
| req-677 The add-address page is built from GOV.UK Frontend components... | E2E |
| req-679 A picked or added address is copied onto the notification, not... | E2E, tests repo |
| req-681 Each role and the consignment contact has its own page for edi... | E2E, animals FE, animals fit, tests repo |
| req-682 The edit page is headed 'Edit address details', captioned with... | E2E, animals FE, animals fit, tests repo |
| req-683 The edit page explains 'Changes apply to this notification onl... | E2E, animals FE, animals fit, tests repo |
| req-684 The edit page asks for 'Name or organisation name', 'Address l... | E2E, animals FE, animals fit, tests repo |
| req-685 The edit page's buttons are 'Save changes' and a secondary 'Ca... | E2E, animals FE, tests repo |
| req-686 The edit page opens pre-filled with every field of the notific... | E2E, animals FE, animals fit, tests repo |
| req-687 The edit page applies the address book's rules and messages: '... | E2E, animals FE, animals fit, tests repo |
| req-688 A refused edit answers 400, re-renders 'Edit address details'... | E2E, animals FE, animals fit, tests repo |
| req-689 A valid edit replaces only this notification's copy of the rol... | E2E, animals FE, animals fit, tests repo |
| req-690 Save, Cancel and Back on the edit page return to where the edi... | E2E, animals FE, animals fit, tests repo |
| req-691 If saving an edit fails with a recoverable backend error, the... | animals FE |
| req-692 The edit page has Welsh copy ('Golygu manylion cyfeiriad', 'Ca... | animals FE |
| req-693 The edit page is built only from GOV.UK Frontend components an... | animals FE, animals fit |
| req-694 A copy is checked against the notification's address rules: th... | E2E, animals FE, tests repo |
| req-695 The review keeps today's validation errors that Design Release... | E2E, tests repo |
| req-696 While a copy breaks the rules, Continue on the review page is... | E2E, tests repo |
| req-697 Correcting the copy on its edit page and saving returns to the... | E2E, tests repo |
| req-698 Once a notification is submitted its copied addresses are froz... | E2E, tests repo |
| req-702 A valid CPH number is stored as nine bare digits, the three pa... | animals FE, animals fit |
| req-703 The CPH page has the caption 'Consignment parties', the single... | E2E, animals FE, animals fit, tests repo |
| req-704 The CPH, permanent address and contact address pages show the... | E2E, animals fit |
| req-705 A collapsed 'What is a CPH number?' details component sits abo... | E2E, animals FE, animals fit |
| req-707 The CPH number is asked as one fieldset with the small legend... | E2E, animals FE, animals fit |
| req-709 The CPH number is entered in three boxes in one row, laid out... | E2E, animals FE, animals fit, tests repo |
| req-715 A partly filled or wrongly formed CPH number is refused with o... | E2E, animals FE, animals fit, tests repo |
| req-716 CPH errors re-render the page with status 400 and every typed... | animals FE, animals fit |
| req-717 A stored CPH number that is not nine digits is flagged on the... | animals FE |
| req-718 The CPH page opens with three empty boxes when nothing is save... | E2E, animals FE, animals fit, tests repo |
| req-721 The CPH page ends with the primary 'Save and continue' button... | E2E, animals FE, animals fit |
| req-723 The CPH and contact address forms post back to their own URL w... | E2E, animals FE, animals fit |
| req-724 The CPH, permanent address and contact address pages have no s... | E2E, animals FE, animals fit |
| req-730 The permanent address shows the GOV.UK warning 'Providing a fa... | E2E |
| req-731 The permanent address explains 'A permanent address is where a... | E2E |
| req-738 A new permanent address asks for 'Name or organisation name',... | E2E |
| req-752 The contact address page has the h1 'Contact address for consi... | E2E, animals FE, animals fit, tests repo |
| req-758 Coming back from the address book add with a not-found error,... | animals FE |
| req-759 When the animals frontend runs in stub mode, the contact page... | E2E, animals FE, animals fit, tests repo |
| req-762 The contact addresses are one list of radios whose value is th... | E2E, animals fit, tests repo |
| req-763 No contact address is chosen when the page first opens; on ret... | E2E, animals FE, animals fit, tests repo |
| req-765 Submitting a contact id that is not in the list shows 'Select... | animals FE, animals fit |
| req-768 Opened from its overview task ('Contact address for this consi... | E2E, animals FE, animals fit, tests repo |
| req-769 Outside amend, the contact page ends with all three controls:... | E2E, animals FE, animals fit |
| req-771 The contact address task is reached from the hub row 'Contact... | E2E, animals FE, animals fit |
| req-773 Choosing a contact saves a copy of that address's name and add... | E2E, animals FE, animals fit |
| req-775 The contact edit route (/consignment/contact/edit) and its edi... | E2E, animals FE, animals fit, tests repo |
| req-777 The notification hub's browser title is 'Overview - Import not... | E2E, animals FE, animals fit |
| req-778 Each live-animals notification has its own hub page in the liv... | E2E, animals FE, animals fit |
| req-779 Above the 'Overview' heading the hub shows the notification's... | animals FE, animals fit |
| req-781 Opening the hub leaves the notification saved as a draft: noth... | E2E |
| req-783 The hub has no back link; the ways off it are the 'Return to d... | E2E, animals FE, animals fit |
| req-784 The hub shows a 'Your commodities' heading (h2) above the comm... | E2E, animals FE, animals fit |
| req-785 For a live-animals notification the first card shows the total... | E2E, animals FE, animals fit |
| req-786 The hub shows a card for the total number of packages, labelle... | animals FE, animals fit |
| req-787 The animals and packages totals add up only counts that are po... | E2E, animals FE, animals fit |
| req-790 Each commodity total card is a static panel (no link or button... | E2E, animals FE, animals fit |
| req-792 For a notification, the task list is headed 'Notification task... | E2E, animals FE, animals fit |
| req-793 For a notification, the task list has exactly six numbered sec... | E2E, animals FE, animals fit |
| req-795 Section 1 holds, in order, 'Where is this consignment coming f... | E2E, animals FE, animals fit |
| req-796 'Commodity details' is its own row, first in section 2, shown... | E2E, animals FE, animals fit |
| req-797 'Identification details' shows in section 2, between 'Commodit... | E2E, animals FE, animals fit |
| req-798 In the live-animals set, section 2 always shows 'Additional de... | E2E, animals FE, animals fit |
| req-799 Section 3 always shows 'Arrival details', which opens even bef... | E2E, animals FE, animals fit |
| req-801 For a notification, section '4. Documents' holds the single ro... | E2E, animals FE, animals fit |
| req-802 In the live-animals set, section 'Consignment parties' holds t... | E2E, animals FE, animals fit |
| req-803 Section 'Contact address' holds the single row 'Contact addres... | E2E, animals FE, animals fit |
| req-804 Each hub row shows one of two status tags only: a green 'Compl... | E2E, animals FE, animals fit |
| req-805 Every row the hub shows is a link the trader can open at any t... | animals FE, animals fit |
| req-806 The hub's task list is built from the GOV.UK Task list compone... | E2E, animals fit |
| req-807 A new notification goes from choosing the notification type to... | animals FE, animals fit |
| req-809 A task page opened from the hub has a 'Back' link to the hub a... | E2E, animals FE, animals fit |
| req-810 For a notification, the hub ends with a primary 'Review and su... | E2E, animals FE, animals fit |
| req-811 For a notification, the hub's secondary button is 'Return to d... | E2E, animals FE, animals fit |
| req-812 The hub shows only its main and secondary buttons: there is no... | animals FE |
| req-813 The hub has no serious or critical WCAG 2 A/AA accessibility v... | animals FE, animals fit |
| req-820 The review page reached from the notification hub has the head... | E2E, animals FE, animals fit |
| req-824 The review's other numbered sections stay as they are, in orde... | E2E, animals FE, animals fit, tests repo |
| req-829 The Origin of import card reads back the country of origin by... | E2E, animals FE, animals fit |
| req-834 For an Internal market import, the Main import reason card add... | E2E, animals FE, animals fit |
| req-836 The Main import reason card shows 'Destination country' for tr... | animals FE, animals fit |
| req-837 On an editable review each card's Change link opens the page t... | E2E, animals FE, animals fit |
| req-838 Each Change link names its card for screen readers in visually... | E2E, animals FE, animals fit, tests repo |
| req-847 A species with no saved identifiers shows no identification de... | animals FE |
| req-851 In the live-animals set, the Additional details card shows 'Ce... | E2E, animals FE, animals fit |
| req-853 The Arrival details card shows 'Port of entry', the arrival da... | E2E, animals FE, animals fit |
| req-857 The Transport details card shows the transporter's address one... | animals FE, animals fit |
| req-861 A document's type reads back by its full name, for example 'In... | animals FE |
| req-863 The Addresses card has one row per consignment role (Place of... | E2E, animals FE, animals fit |
| req-869 On a finished card or a read-only review, an empty answer read... | animals FE, animals fit |
| req-870 Inside a card that still has answers outstanding, every empty... | E2E, animals FE, animals fit |
| req-871 An unfinished card is styled as an error card and shows its me... | E2E, animals FE, animals fit |
| req-872 An editable review of an unfinished notification shows a 'Ther... | E2E, animals FE, animals fit, tests repo |
| req-876 The unfinished-card messages 'Complete arrival details', 'Comp... | E2E, animals FE, animals fit, tests repo |
| req-881 Uploaded documents are optional to proceed and to submit: the... | E2E, animals FE, animals fit |
| req-882 In the live-animals set, a notification is complete enough to... | animals FE |
| req-883 The trader reaches the review from the hub's 'Review and submi... | E2E, animals FE, animals fit, tests repo |
| req-885 The review keeps today's document scan errors: a rejected docu... | animals FE |
| req-887 The review's error summary takes focus only after a refused Co... | E2E, animals FE, animals fit |
| req-901 A submitted notification's view is read-only and shows that no... | E2E, animals FE, animals fit, tests repo |
| req-912 The declaration page is titled and headed 'Declaration' and se... | E2E, animals FE, animals fit, tests repo |
| req-915 The declaration checkbox label reads 'I confirm that I have re... | E2E, animals FE, animals fit, tests repo |
| req-916 The declaration page shows 'Date of declaration:' with today's... | E2E, animals FE, animals fit, tests repo |
| req-918 The declaration page's Back link goes to the review. | E2E, animals FE, animals fit |
| req-919 Continuing without ticking the declaration re-shows the page w... | E2E, animals FE, animals fit, tests repo |
| req-920 The declaration checkbox is shown ticked when the notification... | E2E, animals FE |
| req-921 Ticking the declaration and pressing Continue submits the noti... | E2E, animals FE, animals fit, tests repo |
| req-922 The declaration page can be opened without a completeness chec... | E2E, animals FE, animals fit |
| req-923 Opening or submitting the declaration for a notification alrea... | animals FE, animals fit |
| req-924 The review and declaration forms post a CSRF crumb and the not... | E2E, animals FE, animals fit |
| req-925 The review (new, refused and submitted), declaration and confi... | animals FE, animals fit |
| req-926 The confirmation page is titled 'Import notification submitted... | E2E, animals FE, animals fit |
| req-930 The confirmation page shows a 'Before the consignment is impor... | animals FE, animals fit |
| req-932 The confirmation page's 'Transporting the consignment' section... | E2E, animals FE, animals fit |
| req-935 The confirmation page's 'Create a new notification' looks and... | E2E, animals FE, animals fit |
| req-936 The confirmation page's 'Getting help' section gives importsri... | E2E, animals FE, animals fit |
| req-938 The confirmation page does not repeat the date of declaration,... | E2E, animals FE, animals fit |
| req-945 The review, declaration and confirmation stay built from GOV.U... | E2E, animals fit |
| req-956 Every page of both frontends, the home, drill-downs and notifi... | INS fit |
| req-957 The home has no back link. | INS fit |
| req-958 The home carries no service-description paragraph: the heading... | INS fit |
| req-961 'Create new' is a standard primary GOV.UK button link, not a s... | E2E |
| req-966 The service navigation's first item is 'Dashboard', linking to... | INS FE, INS fit |
| req-968 The service navigation has an 'Address book' item linking to t... | INS fit |
| req-969 The service navigation keeps 'Log out' as its last item, after... | E2E, INS fit |
| req-970 The service navigation has a 'Manage account' item. | INS fit |
| req-1020 Signing in to the INS front door lands the trader on the home,... | INS FE, INS fit |
| req-1021 The home's counts and the drill-downs read from the INS aggreg... | E2E, INS FE, tests repo |
| req-1026 The home and drill-downs keep the standard GOV.UK header (logo... | INS fit |
| req-1027 Following a link from the home into the animals or plants fron... | E2E, tests repo |
| req-1047 After a search the field keeps the searched text, and searchin... | E2E, animals FE, animals fit, tests repo |
| req-1084 A card keeps its status-driven actions, each named for screen... | E2E, animals FE, animals fit, tests repo |
| req-1088 The notification list's success banner, the deletion message i... | animals FE |
| req-1089 The list keeps its stale-action banner ('The notification has... | E2E, animals FE |
| req-1091 The list has no serious or critical WCAG 2 A or AA axe violati... | animals FE, animals fit |
| req-1094 Deleted notifications never appear on any list or in a search. | INS BE, animals BE, animals FE |
| req-1095 A newly started notification appears on the list within second... | E2E, INS BE, tests repo |
| req-1097 The read model behind the list is filled from the notification... | INS BE |
| req-1104 The list API answers a bad request, such as a page below 1, wi... | INS BE |
| req-1108 The address book lives in the INS frontend at /address-book, r... | E2E, INS FE, INS fit, tests repo |
| req-1109 A signed-out user opening any address book page is sent to sig... | E2E, INS FE, tests repo |
| req-1111 The list page's heading is 'Address book'. | E2E, INS FE, INS fit, tests repo |
| req-1113 The list page has an 'Add a new address' button (a link styled... | E2E, INS FE, INS fit |
| req-1120 The address book API keeps its countryCode filter as it is: an... | address book |
| req-1131 Above the table a results line reads 'Showing <start>-<end> of... | E2E, INS FE, INS fit |
| req-1138 The Country column shows the country's name, not its code. | E2E, INS FE, INS fit |
| req-1140 Each row ends with a 'View' link to /address-book/{id}; its ac... | E2E, INS FE, INS fit, perf tests |
| req-1142 When there is more than one page, GOV.UK pagination shows a nu... | E2E, INS FE, INS fit |
| req-1145 The list shows the newest address first, with a stable order f... | E2E, INS fit, address book |
| req-1146 After an add, edit or delete the list shows a GOV.UK success n... | E2E, INS FE |
| req-1149 The address book is stored by the address book service and bel... | E2E, INS fit, address book, tests repo |
| req-1151 No caller can list, read or delete another organisation's addr... | E2E, address book, tests repo |
| req-1152 Every address book API call must carry a well-formed Trade-Imp... | address book |
| req-1153 The INS frontend calls the address book server-side under /org... | E2E, INS FE, INS fit, tests repo |
| req-1155 The address book service logs each request with the caller's o... | address book |
| req-1156 The list API (GET /organisation/{orgId}/addresses) returns a c... | INS FE, address book, tests repo |
| req-1157 Reading one address by id returns it with every stored field,... | E2E, INS FE, address book, tests repo |
| req-1158 Deleting an address removes it from the list and search for ev... | E2E, INS FE, address book, tests repo |
| req-1159 The address view page is at /address-book/{id}, headed with th... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1160 The view page's summary list always shows, in this order, 'Nam... | INS FE, INS fit |
| req-1163 The view page does not show the address's types or uses, and i... | INS FE, INS fit |
| req-1165 The view page has a red warning 'Delete' button to /address-bo... | INS FE, INS fit |
| req-1166 With no return path, the view page's Back link goes to the add... | INS FE, INS fit |
| req-1171 When the address book service fails unexpectedly, the list ren... | INS FE, INS fit |
| req-1172 The list renders in the wide display column; the view and dele... | INS FE, INS fit |
| req-1173 The list, view and delete pages have no serious or critical ax... | INS FE, INS fit |
| req-1174 The delete confirmation is served by GET and POST at /address-... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1181 With no return path, the delete page's Back link goes to the a... | E2E, INS FE, INS fit |
| req-1182 Confirming the delete deletes the address through the address... | E2E, INS FE, INS fit, perf tests, tests repo |
| req-1183 The delete form is protected by a CSRF token and posts nothing... | INS FE, INS fit |
| req-1184 Deleting an address makes no check on whether a notification u... | INS FE, INS fit |
| req-1192 Adding and editing an address happen in the INS front door (tr... | INS FE, INS fit, address book |
| req-1224 On the edit page the name field is labelled 'Name or organisat... | INS fit |
| req-1226 The edit page keeps the 'County (optional)' field between 'Tow... | E2E, INS FE, INS fit, tests repo |
| req-1227 The add and edit forms ask 'Address line 1', 'Address line 2 (... | E2E, INS FE, INS fit, tests repo |
| req-1235 The countries offered come from the reference data service's u... | E2E, INS FE, INS fit, address book |
| req-1237 Saving without address line 1 shows 'Enter address line 1'. | INS FE, INS fit, address book |
| req-1238 Saving without a town or city shows 'Enter a town or city'. | INS FE, INS fit, address book |
| req-1241 Saving without an email address shows 'Enter an email address'... | INS FE, INS fit, address book |
| req-1243 Address line 2 and county are optional: blank values are accep... | E2E, INS FE, address book, perf tests |
| req-1244 Add and edit keep today's length limits and email format check... | INS FE, INS fit, address book |
| req-1245 On a validation error the add or edit page is shown again (HTT... | E2E, INS FE, INS fit, tests repo |
| req-1246 When the add or edit page shows errors, its browser title keep... | INS fit |
| req-1247 Every add and edit field is trimmed of surrounding spaces befo... | INS FE |
| req-1257 The add-details step's primary button is 'Save and continue'. | E2E, INS FE, INS fit, tests repo |
| req-1263 Creating an address persists its full record in the address-bo... | E2E, INS fit, address book, tests repo |
| req-1264 Saving an edit fully replaces the address's editable fields th... | E2E, INS fit, address book, tests repo |
| req-1265 An update is refused without change when the body is invalid (... | address book |
| req-1266 The address-book API answers errors as RFC 9457 problems (appl... | address book |
| req-1267 When the address-book service rejects a save the form is shown... | INS FE, INS fit |
| req-1268 Outside prod, a new address can be given an expiry (ADDRESS_TT... | address book |
| req-1269 The address-book service keeps its API surface and storage as... | address book |
| req-1271 The edit page at /address-book/{id}/edit opens with the addres... | E2E, INS FE, INS fit, tests repo |
| req-1273 The edit page's buttons are 'Save changes' and a secondary 'Ca... | E2E, INS FE, INS fit |
| req-1276 A valid edit returns the user to the address book list (its de... | E2E, INS FE, INS fit, tests repo |
| req-1280 Every add and edit page highlights 'Address book' in the servi... | INS fit |
| req-1281 The add and edit pages, and their error states, use only GOV.U... | INS FE, INS fit |
| req-1282 The add and edit forms post to themselves with browser validat... | E2E, INS FE, INS fit |
| req-1395 Amending moves a SUBMITTED notification to AMEND, keeps its re... | E2E, animals BE, tests repo |
| req-1396 Answers changed during an amendment are saved to the notificat... | animals BE, animals fit, tests repo |
| req-1401 The amend review has no page-header actions (no Amend this not... | E2E |
| req-1402 The amend review is editable, with a Change link on every card... | E2E, animals fit, tests repo |
| req-1405 During an amendment, question pages are prefilled with the not... | E2E, tests repo |
| req-1407 Continue on a valid amend review goes to the Declaration page;... | E2E, tests repo |
| req-1409 Resubmitting an amendment shows the ordinary 'Import notificat... | E2E, animals BE, tests repo |
| req-1412 The cancel-amendment confirm button reads 'Yes, cancel amendme... | E2E, animals FE, animals fit, tests repo |
| req-1415 Confirming the cancellation discards every edit made during th... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-1418 When copy as new, cancel amendment or delete fails to save, th... | animals FE, animals fit |
| req-1421 Copy as new goes straight, with no confirmation, to the new dr... | E2E, animals FE, animals fit |
| req-1422 A copy is a new notification saved at once as a Draft, with it... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-1423 A copy carries over the origin of the import: country of origi... | E2E, animals BE, animals FE, animals fit |
| req-1431 A copy carries over the roles and addresses (place of origin,... | E2E, animals BE |
| req-1436 A copy does not carry over uploaded documents: the copy's Uplo... | E2E |
| req-1438 Copy as new for a notification the trader cannot reach (unknow... | animals BE, animals FE |
| req-1452 The delete confirmation page is titled 'Delete this notificati... | E2E, animals FE, animals fit, tests repo |
| req-1453 Confirming the delete (a POST with the CSRF crumb) soft-delete... | E2E, animals BE, animals FE, animals fit, tests repo |
| req-1459 A deleted notification no longer appears in the notification l... | E2E, animals fit, tests repo |
| req-1460 Opening or posting delete for a notification the trader cannot... | animals FE |
| req-1468 The view page shows the notification's answers in the same six... | animals fit |
| req-1476 The backend notification API supports the lifecycle: create gi... | E2E, animals BE, animals fit, tests repo |
| req-1477 A notification is saved as a draft as the trader goes: one rec... | E2E, tests repo |
| req-1478 The delete and cancel-amendment confirmations, the restored su... | animals FE, animals fit |
| req-1488 Apart from what other requirements add to it (the declaration... | animals BE, through the requirements it lists |
| req-1489 A notification is stored as one document in the MongoDB collec... | E2E, animals BE, tests repo |
| req-1490 A notification's reference number is unique across all notific... | animals BE |
| req-1491 The service, never the caller, gives a new notification its re... | animals BE |
| req-1492 When a generated reference number collides with an existing on... | animals BE |
| req-1493 Every endpoint that takes a reference number in its path refus... | animals BE |
| req-1494 Every notification carries a concurrency token, returned in ea... | animals BE |
| req-1495 A save sent with a stale concurrency token changes nothing and... | animals BE |
| req-1496 Submit, amend and cancel-amend take no concurrency token from... | animals BE |
| req-1497 A notification has exactly one of four lifecycle statuses, DRA... | animals BE, tests repo |
| req-1498 The server stamps created on creation and updated on every wri... | animals BE |
| req-1499 submittedAt records the most recent submission: set to now on... | animals BE |
| req-1500 In a non-prod environment with NOTIFICATION_TTL_DAYS set, each... | animals BE |
| req-1501 The expiry sweep runs only where NOTIFICATION_TTL_SWEEP_ENABLE... | animals BE |
| req-1502 Each sweep permanently deletes, at most 10 at a time by defaul... | animals BE |
| req-1503 The expiry sweep writes no audit record and no outbox event, a... | animals BE |
| req-1504 A sweep that deletes notifications logs 'Expiring <n> notifica... | animals BE |
| req-1505 expireAt and the pre-amend notification and fulfilment snapsho... | animals BE |
| req-1506 The fulfilments payload (each obligation id holding a single v... | animals BE, tests repo |
| req-1507 Starting an amendment snapshots the notification content (inli... | E2E, animals BE, tests repo |
| req-1508 Wherever the backend needs a notification's content, a record... | animals BE |
| req-1509 A save body (POST /notifications and PUT /notifications/{refer... | animals BE |
| req-1510 The backend enforces no rule on the notification's content: no... | animals BE |
| req-1511 The record's origin section holds the country of origin code,... | E2E, animals BE, tests repo |
| req-1512 The record's commodity section holds a commodity name and a li... | E2E, animals BE, tests repo |
| req-1513 Each species line holds a list of animal identifier units, one... | E2E, animals BE, tests repo |
| req-1514 The record holds the reason for import (for example internalMa... | animals BE, tests repo |
| req-1515 The record's additional details hold what the animals are cert... | E2E, animals BE, tests repo |
| req-1516 The record holds six parties, each with an optional name, emai... | E2E, animals BE, tests repo |
| req-1517 Each party is stored as a literal copy of the address-book rec... | E2E, animals BE, tests repo |
| req-1518 An address is a Standard Address Block named as the address bo... | E2E, animals BE, tests repo |
| req-1519 The CPH number is stored as one free-text string, the county,... | E2E, animals BE, tests repo |
| req-1520 The record's transport section holds the port of entry, the ar... | E2E, animals BE, tests repo |
| req-1521 The means of transport is one of AIRPLANE, RAILWAY, ROAD_VEHIC... | animals BE |
| req-1522 The transport section holds one transporter with a name, an ad... | animals BE, tests repo |
| req-1523 The record holds a destination country, a port of exit and an... | animals BE, tests repo |
| req-1524 Every date-only field (arrival date, exit date and any added l... | animals BE |
| req-1525 Calendar dates are stored as ISO-8601 strings ('2026-07-21'),... | E2E, animals BE, tests repo |
| req-1526 The API returns dates and timestamps as ISO-8601 strings, neve... | animals BE |
| req-1527 Every error the backend's exception handler answers is an RFC... | animals BE |
| req-1528 A body or parameter that fails validation gets 400 with title... | animals BE |
| req-1529 A body that cannot be read gets 400 with title 'Malformed Requ... | animals BE |
| req-1530 A payload that binds but the application rejects gets 400 with... | animals BE |
| req-1531 A missing resource gets 404 with title 'Resource Not Found', t... | animals BE |
| req-1532 An upstream failure (unreachable, timed out or non-2xx) gets 5... | animals BE |
| req-1533 A resource conflict such as a duplicate key gets 409 with titl... | animals BE |
| req-1534 An oversized upload gets 413 with title 'Payload Too Large', t... | animals BE |
| req-1535 A failure to write the outbox event or to get a notification's... | animals BE |
| req-1536 Any other unexpected error gets 500 with title 'Internal Serve... | animals BE |
| req-1537 The backend stores its data in MongoDB (credentials from CDP e... | animals BE |
| req-1539 POST /notifications with no reference number creates a notific... | animals BE, tests repo |
| req-1540 Every one of the six write endpoints answers 200 with the whol... | animals BE |
| req-1541 POST /notifications with a reference number updates that notif... | animals BE, tests repo |
| req-1542 Updating through POST /notifications answers 404 'Cannot find... | animals BE |
| req-1543 PUT /notifications/{referenceNumber} replaces the content and... | animals BE, perf tests |
| req-1544 Each write endpoint takes an optional x-cdp-request-id header... | animals BE |
| req-1545 POST /notifications/{referenceNumber}/submit, with only an opt... | E2E, animals BE, tests repo |
| req-1546 Submitting from the declaration lands on /notifications/{id}/c... | tests repo |
| req-1547 A first submission (from DRAFT) writes a NotificationSubmitted... | animals BE |
| req-1548 Submit stores the notification as it stands and its event carr... | animals BE |
| req-1549 Every event's payload lists only the accompanying documents wh... | animals BE |
| req-1550 An actor sent with a write (inside the save body for POST and... | animals BE, tests repo |
| req-1551 A submission event's versionId is the count of earlier submiss... | animals BE |
| req-1552 Each event for a notification takes the next aggregateVersion,... | animals BE |
| req-1553 Every write to one notification (create, save, copy's new draf... | animals BE |
| req-1554 For PUT, copy, submit, amend, cancel-amend and soft delete, sa... | animals BE |
| req-1557 GET /notifications/{referenceNumber}/fulfilments returns refer... | animals BE, perf tests, tests repo |
| req-1558 The backend offers no read of one notification's full content... | animals BE, perf tests, tests repo |
| req-1559 GET /notifications/reference-numbers returns reference strings... | animals BE |
| req-1560 DELETE /notifications permanently removes the notifications na... | animals BE |
| req-1561 Every DELETE /notifications request writes a DELETE_NOTIFICATI... | animals BE |
| req-1562 Any DELETE whose path begins /notifications, and POST /notific... | animals BE |
| req-1565 The backend defines eight notification lifecycle event types,... | animals BE |
| req-1566 Each lifecycle action writes its event: amend NotificationAmen... | animals BE |
| req-1567 Outbox events are stored in the MongoDB collection outbox, eac... | animals BE, tests repo |
| req-1568 Each event carries the notification's full status history so f... | animals BE |
| req-1569 An event's publish time is stored with it but left out of the... | animals BE |
| req-1570 A poller (on unless outbox.poller.enabled is false) publishes... | animals BE |
| req-1571 Events are published to the one SNS FIFO topic set by OUTBOX_S... | animals BE |
| req-1572 An event with no payload is skipped and logged as an error; an... | animals BE |
| req-1574 Integration tests prove publication: create then submit publis... | animals BE |
| req-1576 GET /notifications/{referenceNumber}/outbox-events returns all... | animals BE |
| req-1577 POST /notifications/{referenceNumber}/replay, with the admin s... | animals BE |
| req-1579 A submitted notification reaches PIMS Dynamics by way of the b... | animals BE, tests repo |
| req-1580 A submitted notification appears in PIMS Dynamics as exactly o... | tests repo |
| req-1581 The PIMS Dynamics tests read through the Dataverse Web API (OD... | tests repo |
| req-1583 A submitted-notification outbox event can be placed straight o... | tests repo |
| req-1585 The GBN-AG event data always carries $model 'defra/certificate... | animals BE, tests repo |
| req-1586 exchangedDocument carries identifier (the reference number), t... | animals BE, tests repo |
| req-1588 Each accompanying document is sent as one referenceDocument en... | animals BE |
| req-1589 Each accompanying-document type is sent with its typeCode: vet... | animals BE |
| req-1590 exchangedDocument.firstSignatoryAuthentication lists declarati... | animals BE |
| req-1592 specifiedConsignment maps the consignor to consignorParty, the... | animals BE, tests repo |
| req-1593 The carrier is sent with the approval number as identifier (ur... | animals BE |
| req-1595 A postalAddress is sent as lineOne (address line 1), lineTwo (... | animals BE |
| req-1596 originCountry is sent as code.value, the ISO country of origin... | animals BE, tests repo |
| req-1597 unloadingBaseportLocation is the port of entry code alone (abs... | animals BE |
| req-1598 The transport movement is sent as one mainCarriageLogisticsTra... | animals BE |
| req-1599 isOrHasUnweanedAnimals is sent as true or false from the store... | animals BE |
| req-1600 includedConsignmentItem holds one consignment item carrying a... | animals BE, tests repo |
| req-1601 A species trade line has one individualTradeProductInstance pe... | animals BE |
| req-1604 A notification seeded through the animals frontend's save-and-... | E2E, tests repo |
| req-1605 The journey's page routes, in order, are origin, commodities,... | tests repo |
| req-1606 The page form fields saved into the record today are: origin c... | tests repo |
| req-1607 A page that rejects its submission re-renders with 200 and an... | tests repo |
| req-1608 A notification with only origin and commodity answered reports... | tests repo |
| req-1613 A new notification's opening run takes 'Save and continue' fro... | E2E, animals FE, animals fit |
| req-1617 'Save and return to overview' saves the page and takes the use... | animals FE, animals fit, tests repo |
| req-1618 'Cancel and return to overview' is a link to the overview that... | animals FE, tests repo |
| req-1619 Every page the overview links to ends with a primary 'Save and... | E2E, animals FE, animals fit |
| req-1630 Pages inside a notification (the overview, the question pages... | E2E, animals fit, tests repo |
| req-1635 Starting a new notification creates a fresh, empty notificatio... | E2E, animals fit, perf tests, tests repo |
| req-1637 Opening any page of a notification directly sends the user to... | animals FE, animals fit, perf tests, tests repo |
| req-1638 Every page needs a signed-in session: a signed-out user who op... | animals FE, animals fit, tests repo |
| req-1639 A page opened from the review page (with ?change=1) returns to... | animals FE, animals fit, tests repo |
| req-1640 Every journey page is a server-rendered form: a successful sav... | E2E, animals fit, perf tests, tests repo |
| req-1641 A page refuses 'Save and continue' only for its own hard stops... | E2E, animals FE, animals fit, tests repo |
| req-1644 The transit countries step, and its row on the overview, apply... | animals FE, tests repo |
| req-1645 The animal identification step follows commodity details only... | E2E, animals FE, tests repo |
| req-1646 The additional details step applies to every live-animals cons... | animals FE, tests repo |
| req-1647 The CPH number applies unless every commodity in the consignme... | animals FE, tests repo |
| req-1648 Each reason for import brings in only its own follow-up questi... | animals FE, tests repo |
| req-1649 Only the transporter details that match the chosen transporter... | animals FE, tests repo |
| req-1650 An answer to a question that no longer applies is not shown, c... | animals FE |
| req-1651 A notification's arrival date counts as complete only when it... | E2E, tests repo |
| req-1653 Each journey page carries the caption of the part of the notif... | E2E, animals FE, animals fit |
| req-1659 Every new or changed piece of user-facing text has a Welsh ver... | animals FE |
| req-1660 Journey changes keep the frontend's standing structure: the ob... | animals FE |
| req-1661 The service refuses to start when the journey is not fully con... | animals FE |
| req-1662 Every changed page passes axe with no serious or critical WCAG... | animals FE |
| req-1663 A page with validation errors shows a GOV.UK error summary tit... | animals FE, tests repo |
| req-1664 Date fields take a date as d/m/yyyy with single-digit days and... | E2E, animals FE, tests repo |
| req-1674 Log out ends the user's session with the service and sends the... | E2E, INS FE, animals fit, tests repo |
| req-1675 The Manage account navigation item is a placeholder on both fr... | E2E, INS FE, animals FE, animals fit |
| req-1676 The first navigation item, Dashboard, links to the dashboard h... | E2E, INS FE, animals FE, animals fit |
| req-1677 The Address book navigation item takes the user to the INS fro... | E2E, INS FE, animals FE, animals fit |
| req-1678 The service navigation items appear only to a signed-in user;... | INS FE, animals FE |
| req-1679 Every page uses the GOV.UK service navigation component, which... | E2E, INS FE, animals FE, animals fit |
| req-1680 The GOV.UK header logo links to https://www.gov.uk/ on both fr... | INS FE, animals FE, animals fit |
| req-1684 The phase banner's feedback link is an email link to APHAServi... | INS FE, animals FE |
| req-1685 On the animals frontend, every page's browser title reads the... | animals FE, animals fit |
| req-1687 When a page shows an error summary, its browser title starts w... | INS FE, animals FE, animals fit |
| req-1689 Page content sits in a two-thirds-width column by default, and... | INS FE, animals FE |
| req-1690 A page shows a GOV.UK back link labelled 'Back' ('Yn ôl' in We... | INS FE, animals FE, tests repo |
| req-1691 A journey page on the animals frontend names its section in a... | animals FE, animals fit |
| req-1693 Where a field's own copy gives no message, the shared default... | INS FE, animals FE |
| req-1694 On the animals frontend, a save that hits a recoverable backen... | animals FE |
| req-1695 On the INS frontend, a page whose service call fails is re-ren... | INS FE |
| req-1696 On the animals frontend, a form post refused because the notif... | animals FE |
| req-1697 A page inside a notification can show a strip above its conten... | INS FE, animals FE |
| req-1698 Every page's footer offers 'Privacy', 'Cookies' and 'Accessibi... | INS FE, animals FE, animals fit |
| req-1699 No page shows a cookie banner. | animals fit |
| req-1700 Pages are in English, with no language toggle. Copy falls back... | INS FE, animals FE |
| req-1701 Every page offers the standard GOV.UK 'Skip to main content' l... | INS FE, animals FE, animals fit |
| req-1702 No page shows who is signed in: no email, name or 'signed in a... | E2E, INS FE, animals FE, animals fit, tests repo |
| req-1703 On the animals frontend, when sign-in fails the user sees a pa... | animals FE, tests repo |
| req-1704 On the INS frontend, a failed sign-in shows the unauthorised p... | INS FE |
| req-1705 An error response is shown as the shared error page with the e... | INS FE, animals FE |
| req-1706 On the animals frontend, the service root / sends a signed-in... | E2E, animals FE, tests repo |
| req-1707 The shared notification actions read 'Copy as new' and 'Delete... | animals FE |
| req-1708 Address pickers offer a shared 'Add a new address' link. When... | animals FE |
| req-1710 Sign-in hands off to Defra ID with an OpenID Connect authorisa... | E2E, INS FE |
| req-1711 After signing in, a user who belongs to more than one organisa... | E2E, INS FE, tests repo |
| req-1712 Signing in to one frontend signs the user in to the others wit... | E2E, tests repo |
| req-1713 A session is valid only while it is in the server-side cache (... | E2E, INS FE |
| req-1714 In stub mode the INS frontend signs a user in at once with no... | INS FE |
| req-1715 Every form post must carry a valid CSRF token (except under /h... | E2E, INS FE, animals FE |
| req-1716 The animals frontend sends a Content-Security-Policy on its pa... | E2E, INS FE |
| req-1719 The tests repo's accessibility suite holds every scanned page... | tests repo |
| req-1720 The accessibility suite walks the live-animals journey from th... | tests repo |
| req-1721 The accessibility suite scans the error summary state on the o... | tests repo |
| req-1722 The accessibility suite also scans the import reason reveals,... | tests repo |
| req-1723 The animals frontend's own browser tests check that a captione... | INS FE, animals FE, animals fit |
| req-1725 The tests repo's security suite runs a traffic-driven OWASP ZA... | tests repo |
| req-1727 The tests repo signs each worker in once and reuses the sessio... | tests repo |
| req-1728 The INS frontend serves a fixed list of routes, all behind sig... | INS FE |
| req-1729 Each INS dashboard row links out to the animals frontend, whic... | INS FE |
| req-1731 The INS address book always sends the signed-in organisation t... | INS FE |
| req-1732 Every change to the INS frontend follows its build rules. It s... | INS FE |
| req-1748 Locally and in CDP dev, trade-imports-stub answers reference-d... | stub |
| req-1749 trade-imports-stub's MDM integration (countries and border con... | stub |
| req-1753 The origin page keeps its path and the names of its form field... | animals FE, perf tests |
| req-1755 The commodity choice is saved as the notification's commodity... | E2E, animals FE, animals fit |
| req-1756 Every form on the commodity page and Commodity details (the qu... | E2E, animals FE, animals fit |
| req-1757 The commodity page and Commodity details stay the set's real j... | E2E, animals FE, animals fit, perf tests |
| req-1758 The commodity page opens with an empty search field, and a sea... | animals FE |
| req-1760 Commodity details shows no total of animals or packages; the n... | animals fit |
| req-1770 In the live-animals set the Additional details page applies to... | animals FE, animals fit |
| req-1771 The main import reason page stays at the slug import-reason an... | animals FE, animals fit, perf tests |
| req-1807 The arrival details page stays at the journey slug 'port-of-en... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1808 The k6 performance script's arrival details and transit countr... | perf tests |
| req-1809 The port of entry list is the whole MDM ports-of-entry list, n... | reference data, stub |
| req-1810 Locally and in CDP dev, the stub stands in for MDM's ports cal... | reference data, stub |
| req-1815 No test pins a misspelt or duplicated port name, and the tests... | tests repo |
| req-1821 The transporter list keeps its real journey path and its real... | animals FE, perf tests |
| req-1822 The documents page keeps its address at the accompanying-docum... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1823 The documents form keeps the service's own field names and act... | animals FE, perf tests |
| req-1824 Under the k6 load model every uploaded document's virus scan s... | perf tests |
| req-1828 The roles and addresses page and the party pickers keep the re... | animals FE, animals fit, perf tests |
| req-1830 Until address search is built, the consignee, importer and pla... | E2E |
| req-1835 The CPH number and contact address pages keep the real service... | animals FE, animals fit, perf tests, tests repo |
| req-1844 The review, declaration and confirmation pages keep their real... | animals FE, animals fit, perf tests |
| req-1845 Each party row in the Addresses card and the contact address r... | E2E, animals FE, animals fit |
| req-1849 The k6 suite's visits to the INS home keep working against the... | perf tests |
| req-1853 The k6 background-volume script keeps counting notifications f... | perf tests |
| req-1858 The address book list page shows the service's Alpha phase ban... | INS FE shared layout, read at reconcile (no claim records it) |
| req-1860 The INS address book keeps what the k6 performance suite reads... | perf tests |
| req-1867 The address-book record is the Standard Address Block every li... | address book |
| req-1868 Only transporters carry a transporter authorisation number: ad... | address book |
| req-1869 Phone stays free text of up to 20 characters in the INS fronte... | address book |
| req-1871 trade-imports-stub's address lookup simulator stays as built:... | stub |
| req-1874 The add and edit pages show the shared Alpha phase banner with... | INS fit |
| req-1882 The deletion success banner does not dismiss itself after 5 se... | animals fit |
| req-1897 Journey pages keep the real service's URL paths whatever path... | E2E, animals FE, animals fit, perf tests, tests repo |
| req-1902 The k6 performance suite keeps driving a live-animals draft th... | perf tests |
| req-1903 The performance suite signs in as a browser does: it follows a... | perf tests |
| req-1904 Every frontend page keeps what the performance suite reads off... | perf tests |
| req-1906 The performance suite's run rules stand: every route it reques... | perf tests |

## The increments

Status is **ready** (no unbuilt dependency), **waiting** (waits on earlier rows), **blocked** or **dropped**. A **Review point** is where the loop stops so the owner can look before later rows build on the change. Repos use the keys in the repos table.

| Id | What it delivers | Criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | Opening run follows the Design Release 2.1 step order and ends on the review page | 8 | frontend, tests | | ready, Review point |
| inc-002 | A page opened from an overview task returns to the overview when saved | 9 | frontend, tests | inc-001 | waiting |
| inc-003 | 'Save and return to overview' saves without the page's required-answer checks | 4 | frontend, tests | | ready, Review point |
| inc-004 | During an amendment, pages end with Save and return, Save and continue and Save and return to overview, and Continue on the amend review is held while anything is incomplete | 7 | frontend, tests | | ready, Review point |
| inc-005 | End-to-end proof: horse by sea under temporary admission | 3 | tests | inc-001 | waiting |
| inc-006 | Destination country selects offer reference-data's countries and their subdivisions | 6 | frontend, tests | inc-173 | waiting |
| inc-007 | Port of entry list ordered airports, then seaports, then rail, from MDM's port type | 7 | referencedata, frontend, tests | inc-173 | waiting |
| inc-008 | The private transporter's country list is reference-data's GBNAG_SPS_EX countries plus the United Kingdom, as MDM serves them | 3 | frontend, tests | inc-040, inc-173 | waiting |
| inc-009 | Country of origin becomes a search box | 8 | frontend, tests | | ready |
| inc-010 | Region of origin code, internal reference hint and the finished origin page | 11 | frontend, tests | inc-009 | waiting |
| inc-011 | Commodity page and Commodity details wording, selected commodities table and error order match Design Release 2.1 | 8 | frontend, tests | | ready |
| inc-012 | Live-animal commodity catalogue matches Design Release 2.1 and holds no germinal products | 12 | frontend, tests, perftests | inc-001 | waiting |
| inc-013 | Commodity search results, selected panel and saving the choice follow Design Release 2.1 | 9 | frontend, tests | | ready |
| inc-014 | Commodity search lists results as the trader types, with JavaScript | 9 | frontend, tests | inc-013 | waiting, Review point |
| inc-015 | Commodity pages chain as journey steps around the main import reason | 8 | frontend, tests, perftests | inc-001 | waiting, Review point |
| inc-016 | The germinal commodity search offers V4's germinal products, and only them | 7 | frontend, tests | inc-012, inc-011, inc-013, inc-014, inc-176 | waiting |
| inc-017 | Germinal Commodity details asks total gross weight, number of packages and temperature, and the backend stores them | 8 | backend, frontend, tests | inc-016, inc-011, inc-018, inc-024 | waiting |
| inc-018 | Hard stops: means of transport on arrival details and number of packages on commodity details | 4 | frontend, tests | | ready |
| inc-019 | End-to-end proof: poultry by rail in transit | 3 | tests | inc-012, inc-001 | waiting |
| inc-020 | Main import reason and additional details copy matches Design Release 2.1 | 7 | frontend, tests | | ready |
| inc-021 | Reason and additional details sit in Design Release 2.1's journey order | 7 | frontend, tests | inc-001, inc-015 | waiting, Review point |
| inc-022 | Main import reason completes on its own answers, and both pages soft-save as Design Release 2.1 does | 8 | frontend, tests | inc-003 | waiting |
| inc-023 | Unweaned question is asked for cattle and pigs | 4 | frontend, tests | inc-012 | waiting |
| inc-024 | The germinal opening run and main import reason: two reasons and four purposes | 6 | frontend, tests | inc-016, inc-015, inc-020, inc-021, inc-022 | waiting |
| inc-025 | Arrival details page moves to the 'arrival-details' address | 3 | frontend, tests | | dropped |
| inc-026 | Arrival details wording: labels, hints, placeholder and means of transport options | 6 | frontend, tests | | ready |
| inc-027 | Port and transit country searches: 'name - code' options, a search button and the matched text in bold | 6 | frontend, tests | | ready, Review point |
| inc-028 | Arrival details requires a means of transport, and arrival and transit return to where the trader came from | 9 | frontend, tests | inc-002 | waiting |
| inc-029 | Transit countries page: title, Back link, empty state and redirect when it does not apply | 6 | frontend, tests | inc-002 | waiting |
| inc-030 | Transit countries are added and removed in place with JavaScript, with 'Added' and 'Removed' announcements | 9 | frontend, tests | inc-029 | waiting |
| inc-031 | Upload documents can be opened as soon as the origin is answered | 2 | frontend, tests | | ready |
| inc-032 | Upload documents guidance, hints, table and maximum-documents error match Design Release 2.1 | 9 | frontend, tests | inc-031 | waiting |
| inc-033 | Document references accept punctuation, and the document type list drops Health certificate | 4 | backend, frontend, tests | inc-031 | waiting |
| inc-034 | Upload documents remembers where the trader came from and returns them there | 5 | frontend, tests | inc-031, inc-001, inc-002 | waiting |
| inc-035 | Save and continue no longer waits for virus scans, and Save and return to overview keeps a typed-in document | 7 | frontend, tests | inc-031 | waiting |
| inc-036 | Attach files up to 50MB | 4 | frontend, tests | inc-032 | blocked |
| inc-037 | The transporter list matches DR2.1: its layout, search, columns and shipped transporters | 11 | frontend, tests | | ready, Review point |
| inc-038 | 'Choose a transporter type' matches DR2.1 and refuses a blank choice | 7 | frontend, tests | | ready |
| inc-039 | Saving an added transporter returns to the list with it chosen and a success banner; cancelling goes to the dashboard | 7 | frontend, tests | inc-037, inc-038 | waiting, Review point |
| inc-040 | 'Add a private transporter' matches DR2.1: heading, country select and required fields | 4 | frontend, tests | inc-038 | waiting |
| inc-041 | 'Add a commercial transporter' matches DR2.1: heading, guidance banner, postcode copy and required fields | 7 | frontend, tests | inc-038 | waiting |
| inc-042 | Find a commercial transporter's Northern Ireland address with an address search | 5 | stub, insbackend, frontend, tests | inc-041 | blocked |
| inc-043 | Save and continue on the transporter list goes on to 'Upload documents' in the journey run | 3 | frontend, tests | inc-037, inc-031, inc-001 | waiting |
| inc-044 | Remove the unlinked commercial transporter register page | 2 | frontend, tests | | ready |
| inc-045 | Identification details takes its place in the linear journey after Commodity details | 6 | frontend, tests | inc-001, inc-015 | waiting |
| inc-046 | Selected commodities summary with a Species column, and identification grouped by commodity then species | 7 | frontend, tests | inc-045, inc-012 | waiting, Review point |
| inc-047 | Each species panel saves only its own animal, with the saved-animals table below the form | 7 | frontend, tests | inc-046 | waiting |
| inc-048 | An empty species panel is refused on its own save, even beside a filled one | 4 | frontend, tests | inc-047 | waiting |
| inc-049 | Identification counts as complete only when every animal is entered, and submit needs one entry per species when several are selected | 6 | frontend, tests | inc-048 | dropped |
| inc-050 | Identifier labels and hints follow DR2.1, length errors say 'or less', and values are trimmed before the length check | 5 | frontend, tests | | ready |
| inc-051 | Pigs, sheep and goats are identified by ear tag only | 3 | frontend, tests | inc-012, inc-046 | waiting |
| inc-052 | Germinal identification asks once per species for donor, dates and identification number, and the backend stores them | 7 | backend, frontend, tests | inc-047, inc-016, inc-045, inc-046, inc-050, inc-017 | waiting |
| inc-053 | Germinal identification dates: single text inputs with the date picker, and the V4 date and length checks | 12 | frontend, tests | inc-052, inc-050 | waiting |
| inc-054 | A permanent address page for cats, dogs and ferrets, with one card per animal and a same-as-destination choice | 13 | backend, frontend, tests | inc-012, inc-047, inc-001 | waiting, Review point |
| inc-055 | The permanent address page checks each new address and names the animal in every error | 6 | frontend, tests | inc-054 | waiting |
| inc-056 | Permanent addresses are summarised on the consignment addresses page and listed per animal on the review page | 5 | frontend, tests | inc-054 | waiting |
| inc-057 | The permanent address leaves the identification page | 5 | frontend, tests | inc-054 | waiting |
| inc-058 | End-to-end proof: pet cats by air with permanent addresses | 3 | tests | inc-054, inc-057, inc-001 | waiting |
| inc-059 | The address book record carries the address's type and what it can be used for | 5 | addressbook, tests | | ready, Review point |
| inc-060 | Address validation messages match Design Release 2.1, on the form and in the API | 4 | addressbook, insfrontend, tests | | ready |
| inc-061 | Adding an address starts by choosing its type | 8 | insfrontend, tests | | ready, Review point |
| inc-062 | The add-details form for an address entered by hand | 7 | insfrontend, tests | inc-061 | waiting |
| inc-063 | Address book list: Design Release 2.1 intro, filter disclosure, search control, table cells, empty state and a banner that stays | 11 | insfrontend, tests | | ready |
| inc-064 | View an address: GOV.UK page titles, optional rows only when filled, a secondary Edit button and no 404 for a dead link | 5 | insfrontend, tests | | ready |
| inc-065 | Delete an address: Design Release 2.1 confirmation page, 'No, cancel' link, a stale delete as a no-op and the new banner | 8 | insfrontend, tests | | ready |
| inc-066 | View and delete pages return the user to where they opened the address from, including an animals journey page | 8 | insfrontend, tests | inc-064, inc-065 | waiting |
| inc-067 | Address book list split into four category tabs with a Type column | 10 | addressbook, insfrontend, tests, perftests | inc-059 | waiting, Review point |
| inc-068 | Type filter within a category tab, with tab and pagination links that keep the user's filters | 5 | addressbook, insfrontend, tests | inc-067 | waiting |
| inc-069 | Search the whole row, 8 addresses a page and live filtering as the user types | 8 | addressbook, insfrontend, tests | inc-068, inc-065 | waiting |
| inc-070 | Saving a new address with its uses | 8 | insfrontend, tests, perftests | inc-059, inc-061, inc-062, inc-067, inc-069 | waiting |
| inc-071 | Destination, Consignee or Importer and Branch addresses entered by hand, with a fixed UK country | 7 | insfrontend, tests | inc-070, inc-062 | waiting |
| inc-072 | The address search finds UK addresses as you type, once the address lookup is real | 7 | insfrontend, tests | inc-071 | blocked |
| inc-073 | Editing an address matches Design Release 2.1 | 8 | insfrontend, tests | inc-059, inc-062 | waiting |
| inc-074 | Choosing Transporter when adding to the address book hands over to adding a transporter | 9 | addressbook, insfrontend, frontend, tests | inc-061, inc-067, inc-038, inc-039 | waiting |
| inc-075 | Transporter tab: transporters listed with approval number and type, filtered and searched | 4 | addressbook, insfrontend, tests | inc-069, inc-074 | waiting |
| inc-076 | Each transporter on the list links to its details page | 2 | insfrontend, frontend, tests | inc-074, inc-075, inc-066, inc-037 | waiting |
| inc-077 | The INS add page reached from a journey shows Design Release 2.1's 'Add address and contact details' page | 8 | insfrontend, tests | inc-061, inc-062 | waiting |
| inc-078 | The journey add page splits origin-side and destination-side roles, with Design Release 2.1's country placeholder and messages | 9 | insfrontend, tests | inc-077, inc-060 | waiting |
| inc-079 | A new address added from the journey can also be saved for the other roles on its side | 6 | insfrontend, tests | inc-077, inc-059 | waiting |
| inc-080 | A notification journey's add opens Design Release 2.1's add page in journey mode, and saving or cancelling lands where Design Release 2.1 says | 11 | insfrontend, frontend, tests | inc-077 | waiting, Review point |
| inc-081 | Destination-side journey add pages find UK addresses by search | 8 | insfrontend, tests | inc-072, inc-077, inc-078 | blocked |
| inc-082 | The journey add page's Country select offers the countries reference-data serves from MDM | 3 | insfrontend, tests | inc-078, inc-173 | waiting |
| inc-083 | Welsh for the redesigned address book list, view and delete pages | 3 | insfrontend | inc-066, inc-075 | waiting |
| inc-084 | Welsh drafts for the new add and edit copy | 2 | insfrontend | inc-060, inc-073, inc-061, inc-062, inc-070, inc-071 | waiting |
| inc-085 | Roles and addresses page: intro, warning, Consignor name, named add links and full addresses | 9 | frontend, tests | | ready |
| inc-086 | Party picker layout: add button, search control, results heading and count, address lines and blank save | 10 | frontend, tests | | ready |
| inc-087 | Role-filtered party pickers on one page with a live filter | 9 | addressbook, frontend, tests | inc-059 | waiting, Review point |
| inc-088 | Same-as shortcuts on the roles and addresses page | 8 | frontend, tests | inc-085, inc-087 | waiting |
| inc-089 | Place of origin picker searches by country | 6 | frontend, tests | inc-086, inc-087 | waiting |
| inc-090 | Picker 'View' link to the INS address book and back | 3 | insfrontend, frontend, tests | inc-086, inc-066 | waiting |
| inc-091 | The CPH number page follows Design Release 2.1: who is asked, its help and hint, a blank save, and where it goes | 9 | frontend, tests | inc-012 | waiting |
| inc-092 | The consignment addresses page shows the CPH number as 12/345/6789 and continues to the contact address | 6 | frontend, tests | inc-091 | waiting |
| inc-093 | With JavaScript, the CPH boxes keep out non-digits and one paste fills all three | 5 | frontend, tests | | ready |
| inc-094 | The contact address page follows Design Release 2.1, and the CPH, permanent address and contact pages answer errors as error pages | 10 | frontend, tests | inc-054, inc-091 | waiting |
| inc-095 | The contact address page offers only the trader's own branch addresses and adds a new branch through the address book | 5 | insfrontend, frontend, tests | inc-094, inc-061, inc-070, inc-080 | waiting |
| inc-096 | Which sections the roles and addresses page shows, when its task is complete, and where it continues | 8 | frontend, tests | inc-054, inc-091, inc-094, inc-001, inc-002 | waiting |
| inc-097 | Page endings on the contact address page, and 'Save and return' to review on pages reached from roles and addresses while amending | 7 | frontend, tests | inc-054, inc-091, inc-094, inc-004 | waiting |
| inc-098 | Hub regions for assistive technology and the 'Main import reason' row | 7 | frontend, tests | | ready |
| inc-099 | The Overview for a germinal products notification | 11 | frontend, tests | inc-017, inc-176, inc-098, inc-100 | waiting |
| inc-100 | The live-animals Transit countries task shows only when transit countries are required | 4 | frontend, tests | inc-028 | waiting |
| inc-101 | Review sections and cards take Design Release 2.1's headings, titles and unfinished-card messages | 9 | frontend, tests | | ready, Review point |
| inc-102 | Review rows for origin, import reason, additional details and transport and arrival follow Design Release 2.1 | 9 | frontend, tests | inc-101 | waiting |
| inc-103 | Arrival and transit task statuses on the overview, and transit countries on the review | 4 | frontend, tests | inc-028, inc-101 | waiting |
| inc-104 | Review reads the commodity selection back in a 'What are you importing?' card and groups species under their commodity | 9 | frontend, tests | inc-101 | waiting, Review point |
| inc-105 | The germinal set's own review: germinal answers in their species blocks, its unfinished-species messages, and no CPH or permanent address | 6 | frontend, tests | inc-104, inc-017, inc-052, inc-176, inc-099, inc-106 | waiting |
| inc-106 | Identification details on the review: heading, animal labels, its own Change link and per-species unfinished messages | 5 | frontend, tests | inc-104 | waiting |
| inc-107 | Each uploaded document has its own card on the review, showing its file name | 3 | frontend, tests | inc-101 | waiting |
| inc-108 | Addresses card: permanent addresses, CPH format, one header link and a single unfinished entry | 6 | frontend, tests | inc-101, inc-054 | waiting |
| inc-109 | The review page reads each party's copied address back as name, address lines and country | 4 | frontend, tests | inc-101 | waiting |
| inc-110 | Review ends with Continue and Delete, and an amendment's review offers Cancel amend and tells the trader they are re-submitting | 6 | backend, frontend, tests | | ready |
| inc-111 | A submitted notification's view has a header: reference, status, date submitted and a Back link to the overall dashboard | 5 | backend, frontend, tests | | ready, Review point |
| inc-112 | View header offers Amend, Copy as new and Delete, and shows the import reference numbers to copy | 5 | frontend, tests | inc-111 | waiting |
| inc-113 | Submitting records its date and outstanding items, and a notification still missing its health certificate shows as 'Submitted action required' | 6 | backend, frontend, tests | inc-111, inc-112 | waiting |
| inc-114 | Declaration page: small checkbox in a hidden-legend fieldset, and no status strip | 3 | frontend, tests | | ready |
| inc-115 | Notification submitted page follows Design Release 2.1's guard, wording and links | 6 | frontend, tests | | ready |
| inc-116 | A completed notification shows as complete with no Amend button | 2 | backend, frontend, tests | inc-111, inc-112 | blocked |
| inc-117 | Tests prove the review, declaration and confirmation paths no test covers today | 8 | frontend, tests | inc-104, inc-107, inc-108, inc-110, inc-112, inc-115 | waiting |
| inc-118 | Overview totals count only positive numbers | 1 | frontend, tests | inc-098 | dropped |
| inc-119 | Fallback warning for an action-required notification's other outstanding items | 1 | frontend, tests | inc-113 | dropped |
| inc-120 | Amend this notification asks for confirmation in a dialog, then opens the amend review | 9 | frontend, tests, perftests | inc-111, inc-112 | waiting, Review point |
| inc-121 | Cancel amendment is a dialog over the current page and returns to the submitted view with no banner | 8 | frontend, tests | inc-120, inc-110 | waiting |
| inc-122 | An amendment shows an 'Amend' status bar with Cancel amend on the overview, the review and every question page | 9 | frontend, tests | inc-121 | waiting |
| inc-123 | Copy as new carries over exactly Design Release 2.1's list, from the submitted version | 9 | backend, frontend, tests | | ready |
| inc-124 | A stale Copy as new from the view page returns to the view page with the updated banner | 3 | frontend, tests | inc-112 | waiting |
| inc-125 | The delete confirmation page identifies the notification in a summary and takes Design Release 2.1's wording and buttons | 11 | frontend, tests | | ready |
| inc-126 | After a delete the trader lands on the overall dashboard, which says 'Notification has been deleted'; an amending notification can be deleted | 6 | backend, insfrontend, frontend, tests | inc-120, inc-121, inc-125, inc-111 | waiting |
| inc-127 | INS page titles follow the GOV.UK title pattern | 3 | insfrontend, tests | | ready |
| inc-128 | The INS front door's home becomes the Design Release 2.1 overall dashboard | 12 | insfrontend, tests, perftests | inc-070 | waiting, Review point |
| inc-129 | The live animals list moves to the INS frontend, scoped to the trader's organisation | 13 | insbackend, insfrontend, frontend, tests, perftests | | ready, Review point |
| inc-130 | Notification cards show Design Release 2.1's facts and status styles | 13 | schemas, backend, insbackend, insfrontend, tests | inc-129, inc-132 | waiting |
| inc-131 | Action required on the dashboard for a submitted notification missing its ITAHC | 4 | backend, insbackend, insfrontend, frontend, tests | inc-113, inc-129 | waiting |
| inc-132 | Action needed drill-down lists the organisation's notifications needing action | 13 | insbackend, insfrontend, tests | inc-128, inc-131, inc-129, inc-147 | waiting, Review point |
| inc-133 | Search and sort the Action needed list | 6 | insbackend, insfrontend, tests | inc-132 | waiting |
| inc-134 | Action needed glance card on the home's Live animals section | 6 | insfrontend, tests | inc-128, inc-132 | waiting |
| inc-135 | The list has 'In progress', 'Draft' and 'Completed' tabs | 7 | insbackend, insfrontend, tests | inc-130 | waiting |
| inc-136 | Search and sort become one form that really searches and sorts | 10 | insbackend, insfrontend, tests | inc-135 | waiting |
| inc-137 | The list has 'Additional filters' for arrival date, date range and status | 7 | insbackend, insfrontend, tests | inc-136 | waiting |
| inc-138 | The list pages 8 at a time with numbered pages and no results line or empty messages | 8 | insbackend, insfrontend, tests | inc-136, inc-137 | waiting |
| inc-139 | The list's Summary shows 'Action needed' and 'Status updated' glance cards | 3 | insbackend, insfrontend, tests | inc-129, inc-132, inc-134 | waiting |
| inc-140 | The list's success banner is titled 'Success' | 3 | frontend, insfrontend, tests | inc-129, inc-126 | waiting |
| inc-141 | A germinal products notification list on the INS frontend | 5 | insbackend, insfrontend, tests | inc-135, inc-138, inc-139 | waiting |
| inc-142 | Cards show the authorities' outcomes: delayed, completed, inspection and their actions | 5 | insbackend, insfrontend, tests | inc-130, inc-135, inc-139 | blocked |
| inc-143 | Status updates cards and the Status updated drill-down | 5 | insbackend, insfrontend, tests | inc-134, inc-145 | blocked |
| inc-144 | Inspection required drill-down | 6 | insbackend, insfrontend, tests | inc-133 | blocked |
| inc-145 | Germinal products section on the home | 5 | insfrontend, tests | inc-134, inc-141 | waiting |
| inc-146 | The plants section's glance cards | 3 | insfrontend, tests | inc-134, inc-143, inc-144 | blocked |
| inc-147 | Identifier-driven outstanding items: warnings, inline error, confirmation bullet and dashboard message | 7 | backend, insbackend, insfrontend, frontend, tests | inc-131, inc-106, inc-113 | waiting |
| inc-148 | Ask 'What are you importing?' before a notification is created | 11 | frontend, insfrontend, tests | inc-128 | waiting, Review point |
| inc-149 | Create new starts every notification at the type question | 3 | insfrontend, tests | inc-128, inc-148 | waiting |
| inc-150 | Origin's Back link follows where the notification started, and the type question picks the notification back up | 8 | frontend, insfrontend, tests | inc-148, inc-171 | waiting |
| inc-151 | Manage templates page, empty, read from the user's stored templates | 8 | backend, frontend, tests | | ready, Review point |
| inc-152 | Templates item in the service navigation on both frontends, current on every templates page | 6 | insfrontend, frontend, tests | inc-151 | waiting |
| inc-153 | Use template button on the home | 3 | insfrontend, tests | inc-128, inc-151 | waiting |
| inc-154 | Start a template: the type question offers live animals and germinal products, then the template name and origin in template mode | 13 | backend, insfrontend, frontend, tests | inc-151, inc-148, inc-010 | waiting, Review point |
| inc-155 | The template's task list, the overview while a template is being created, and 'What are you importing?' in template mode | 10 | frontend, tests | inc-154, inc-098 | waiting |
| inc-156 | Review your template before saving it | 6 | backend, frontend, tests | inc-155, inc-101 | waiting |
| inc-157 | Save a template and see it on Manage templates | 9 | backend, frontend, tests | inc-156 | waiting |
| inc-158 | View a saved template | 9 | backend, frontend, tests | inc-157 | waiting |
| inc-159 | Change one section of a saved template | 11 | backend, frontend, tests | inc-158 | waiting |
| inc-160 | Use a template to start a notification | 11 | backend, frontend, tests | inc-157, inc-158 | waiting |
| inc-161 | Template card answers, category and each party's address | 5 | backend, frontend, tests | inc-157, inc-158, inc-160 | waiting |
| inc-162 | Sort by select on Manage templates | 3 | frontend, tests | inc-157, inc-136 | waiting |
| inc-163 | Edit a whole saved template on its own task list | 3 | backend, frontend, tests | inc-157 | dropped |
| inc-164 | Discard a template being created | 6 | frontend, tests | inc-156 | waiting |
| inc-165 | Template review ends with Save template and Delete, and a saved template can be deleted | 8 | backend, frontend, tests | inc-158, inc-164 | waiting |
| inc-166 | Commodity pages return to where the trader came from: check answers, the overview or a template | 4 | frontend, tests | inc-015, inc-156, inc-159 | waiting |
| inc-167 | Main import reason page edits a template from its review | 3 | frontend, tests | inc-156, inc-159 | waiting |
| inc-168 | Arrival details while creating or editing a template | 4 | frontend, tests | inc-028, inc-156, inc-159 | waiting |
| inc-169 | Template creation leaves out Upload documents | 2 | frontend, tests | inc-031, inc-155, inc-001 | waiting |
| inc-170 | The transporter list's buttons when amending a notification or editing a template | 2 | frontend, tests | inc-037, inc-004, inc-159 | waiting |
| inc-171 | Back links follow the context a page was opened in | 5 | frontend, tests | inc-001, inc-159 | waiting |
| inc-172 | Germinal products notifications on their own list and cards | 4 | backend, insbackend, insfrontend, tests | inc-130, inc-141 | waiting |
| inc-173 | The stub's countries and ports match real MDM, and every captured country and port fixture is recaptured from it | 13 | stub, frontend, insfrontend, tests | | ready |
| inc-174 | Transit country search offers the GBNAG_SPS_EX countries and their subdivisions | 4 | frontend, tests | inc-173 | waiting |
| inc-175 | Country of origin list labels subdivisions with their parent country | 4 | frontend, tests | inc-173 | waiting |
| inc-176 | A germinal products notification starts in its own set, with its own draft, category and origin page | 12 | backend, frontend, tests | inc-001, inc-010, inc-129, inc-141, inc-148, inc-150, inc-002, inc-098, inc-100, inc-130 | waiting, Review point |
| inc-177 | Germinal Commodity details checks weight and packages, listing errors by question | 8 | frontend, tests | inc-018, inc-017 | waiting |
| inc-178 | A germinal products notification chooses its transporter from its own copy of the transporter step | 6 | frontend, tests | inc-037, inc-038, inc-039, inc-040, inc-041, inc-176, inc-043, inc-044 | waiting |
| inc-179 | Germinal products notifications have their own Upload documents page | 7 | frontend, tests | inc-031, inc-032, inc-033, inc-034, inc-035, inc-176 | waiting |
| inc-181 | Germinal products roles and addresses page and party pickers | 11 | frontend, tests | inc-085, inc-086, inc-087, inc-088, inc-089, inc-090, inc-096, inc-176, inc-099, inc-180, inc-095 | waiting |
| inc-183 | The germinal set has no Additional details step, and a germinal species counts as identified once it has one identifier | 5 | frontend, tests | inc-099, inc-105, inc-182, inc-052, inc-186 | waiting |
| inc-180 | The INS address book takes adds from germinal products notifications and returns to them | 4 | insfrontend, tests | inc-080, inc-090 | waiting |
| inc-182 | The rest of the germinal journey: arrival details, transit countries, contact address, declaration and submission, in Design Release 2.1's step order | 9 | frontend, tests | inc-099, inc-105, inc-178, inc-179, inc-181, inc-026, inc-027, inc-028, inc-029, inc-030, inc-094, inc-095, inc-097, inc-110, inc-111, inc-112, inc-113, inc-114, inc-115 | waiting |
| inc-184 | End-to-end proof: a germinal products notification for bovine semen, from create to submitted | 2 | tests | inc-182, inc-183, inc-141, inc-172 | waiting |
| inc-185 | Amend, cancel amend, copy as new and delete for germinal products notifications | 4 | backend, frontend, tests | inc-182, inc-120, inc-121, inc-122, inc-123, inc-124, inc-125, inc-126 | waiting |
| inc-186 | Germinal products templates are answered on the germinal set's pages, and using one starts a germinal notification | 6 | backend, frontend, tests | inc-182, inc-151, inc-154, inc-155, inc-156, inc-157, inc-158, inc-159, inc-160, inc-161, inc-164, inc-165, inc-150 | waiting |
| inc-187 | A draft's review shows the view header with its Draft status and stays editable | 9 | frontend, tests | inc-101, inc-110, inc-111, inc-112 | waiting |

**Check these ordering decisions:**

- **Germinal products builds last.** inc-176 starts the set only after the live-animals pages, the INS lists (inc-129, inc-130, inc-141) and the type question (inc-148, inc-150) land. Each germinal page is copied from its finished live-animals page.
- **Germinal rows sit early in the file but wait on inc-176.** These are inc-016, inc-017, inc-024, inc-052, inc-053, inc-099 and inc-105. The loop follows dependencies, not file order.
- **V4 sets the germinal data.** inc-016 offers 18 catalogue items with no Cat or Dog embryos or ova (c-230). inc-017 and inc-177 make packages the quantity, 1 to 1,000 (c-234).
- **V4 makes some germinal fields optional.** Gross weight and temperature are optional (c-232). Every germinal species, a lone one included, needs one identifier (c-235, c-277; inc-183).
- **inc-130 changes `trade-imports-schemas`** with one optional `category` property on `event-envelope-v1` (c-272). The ruling says schemas do not change for the germinal set. c-272 reads that as "no PIMS profile change". Confirm that reading.
- **Rows still word settled conflicts as open questions.** inc-016 (c-230), inc-017 and inc-177 (c-234), inc-094 (c-241), inc-126 (c-271) and inc-175 (c-221) do. Each row already builds the settled outcome.
- **inc-140's default sends a delete to the INS live animals list.** c-269 and inc-126 land it on the overall dashboard. Align inc-140's criteria before it builds.
- **inc-129 carries two defaults with no conflict behind them.** Before inc-148, "Create new" goes to the live-animals create entry. Card actions post to the animals frontend's existing routes and return to the INS list.
- **inc-173 gates every list row.** The stub tidy-up is ready now. inc-006, inc-007, inc-008, inc-082, inc-174 and inc-175 wait on it.
- **inc-147 is no longer blocked.** c-133 closes DR1 inc-103, so identifier-driven outstanding items build after inc-106, inc-113 and inc-131.
- **Blocked rows and what unblocks them.** inc-042, inc-072 and inc-081: the INS address lookup. inc-036: CDP's body cap. inc-116 and inc-142: PIMS Dynamics outcomes. inc-143 and inc-144: import-checking outcomes. inc-146: plants publishing and both feeds.
- **Dropped rows.** inc-025 (req-271 out of scope), inc-049 (one identifier is enough, c-041), inc-118 (req-787 already met), inc-119 (req-904 out of scope) and inc-163 (c-261). inc-049 still lists req-248 and req-249, both met today.
- **Rows that may be too big to review.** inc-054, inc-129, inc-130, inc-132, inc-154 and inc-173 have 13 criteria each. inc-012, inc-053, inc-128 and inc-176 have 12.
- **How the biggest would split.** inc-054 could split into the page and the same-as-destination choice. inc-173 could split into countries and ports.
- **Wide dependency lists.** inc-182 depends on 19 rows and inc-186 on 13. Each waits for every live-animals page it copies.
- **File order.** inc-181, inc-183, inc-180 and inc-182 sit out of numeric order. inc-180 belongs to consignment-parties.

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code. In Touches, `LA/` stands for `src/server/app/sets/live-animals/journeys/linear/features/`, `BE/` for `src/main/java/uk/gov/defra/trade/imports/animals/` and `IF/` for `src/server/app/features/`.

| Wave | Theme | Rows | Touches | Depends on |
|---|---|---|---|---|
| 1 | journey-foundation | inc-001 to inc-005 | frontend: src/server/app/sets/live-animals/journeys/linear/flow, src/server/app/sets/live-animals/docs, fit, src/server/app/shared, accessible-autocomplete.js, status-announcer.js; tests: flows/animals, tests/animals/e2e/journeys/persistence, promoted-notification.spec.ts, horse-temporary-admission.spec.ts | None |
| 1 | reference-lists | inc-006, inc-007, inc-173 | referencedata: src; stub: stubs/mdm, src/main/resources/responses, src/test/java/.../utils; frontend: src/server/app/services/countries, services/ports, services/_capture; insfrontend: src/server/app/services/countries; tests: tests/animals/e2e/features/reference-lists, domain/animals/constants/country-codes.ts | None |
| 2 | origin-page | inc-009, inc-010, inc-175 | frontend: LA/origin, obligations/sections/origin.js; tests: country-of-origin-type-ahead.spec.ts, pages/origin.spec.ts, origin-of-import visual snapshots | reference-lists |
| 2 | commodities-and-reason | inc-011 to inc-015, inc-018 to inc-023 | frontend: LA/commodities/search, LA/commodities/consignment-details, LA/commodities/copy, LA/import-reason, LA/additional-details, live-animals services/commodities, obligations/sections/commodities, arrival.js, import-reason.js, commodity-search.js; tests: commodities, consignment-details, import-reason and additional-details specs and page objects, reason-purpose-scope, additional-details-scope, poultry-rail-transit; perftests: src/config/test-data.js, src/config/journey-endpoints.js, src/k6/live-animals.js | journey-foundation |
| 2 | arrival-and-transit | inc-025 to inc-030, inc-174 | frontend: LA/transport/port-of-entry, LA/transport/transit-countries; tests: arrival-details-page.ts, transited-countries-page.ts, arrival-details.spec.ts, transited-countries.spec.ts, port-of-entry-select.spec.ts, transit-means-scope.spec.ts | journey-foundation, reference-lists |
| 2 | documents | inc-031 to inc-036 | frontend: LA/documents, src/server/app/services/document-types; backend: BE/accompanyingdocument; tests: accompanying-documents-page.ts, resources/file-upload, documents-limits, documents-refresh-no-js, documents-reject, documents-scan-lifecycle and promoted-documents specs | journey-foundation |
| 3 | transporters | inc-008, inc-037 to inc-044 | frontend: LA/transport/transporters, transporters-select, transporter-add, private-transporter-details, commercial-transporter-details, transporter-details-save.js, LA/transport/fit, services/transporters, services/address-lookup; insbackend: ins/backend/addresslookup; stub: stubs/federated (main and test); tests: 5 transporter page objects, transporter, transporter-add and transporter-selection specs | documents, journey-foundation, reference-lists |
| 3 | identification-and-permanent-address | inc-045 to inc-051, inc-054 to inc-058 | frontend: LA/commodities/animal-identification, LA/commodities/evaluation.js, LA/permanent-address; backend: BE/notification/AnimalIdentifier.java; tests: animal-identification-page.ts, permanent-address-page.ts, animal-identification.spec.ts, permanent-address.spec.ts, pet-cats-air-permanent-address.spec.ts | journey-foundation, commodities-and-reason |
| 4 | address-book | inc-059 to inc-084 | addressbook: .../addressbook/address, docs, src/main/resources; insfrontend: IF/address-book add, edit, list, view, delete, view-model, fit, address-countries.js, address-id-params.js, handshake-context.js, success-banner.js, services/address-book, services/address-lookup, address-book-filter.js, address-book-success-banner.js, address-search.js; frontend: LA/addresses/address-return, LA/addresses/ins-handshake.js, LA/transport/address-book-entry; tests: page-objects/ins/address-book, tests/ins/e2e/features/address-book, e2e-address-book.ts, address-document.ts, address-book-api-client.ts, addresses-add-handshake.spec.ts; perftests: src/k6/front-door.js, src/k6/background-volume.js, src/lib/address-book.js and test, src/lib/background-volume.js and test, src/config/background-volume.js and test, src/config/smoke.js and test | transporters, reference-lists |
| 4 | overview-and-review | inc-098, inc-100 to inc-104, inc-106 to inc-119, inc-187 | frontend: LA/hub, LA/check-answers controller.js, refusal.js, check-answers.fit.spec.js, view-model cards, header, sections, rows, incomplete-cards.js, invalid-parties.js, LA/declaration, LA/confirmation; backend: BE/notification Notification.java, NotificationDto.java, NotificationService.java, NotificationStatus.java, NotificationView.java, NotificationViewData.java, NotificationAggregate.java; tests: hub-groups-and-cya-rows, amend-resubmit, cancel-amend-ui, declaration-page.ts, declaration.spec.ts | commodities-and-reason, arrival-and-transit, identification-and-permanent-address |
| 5 | consignment-parties | inc-085 to inc-097, inc-180 | frontend: LA/addresses template.njk, controller.js, parties.js, party-inline.js, evaluation.js, fit, party-picker, LA/cph-number, LA/contact, services/address-book, cph-number-input.js; addressbook: .../addressbook/service; insfrontend: IF/address-book/journey-registry.js; tests: addresses, party-picker, cph-number and contact-address page objects, addresses-picker.spec.ts, cph-number.spec.ts, contact-address.spec.ts | address-book, commodities-and-reason, identification-and-permanent-address, journey-foundation |
| 5 | manage-notifications | inc-120 to inc-125 | frontend: LA/amend, LA/cancel-amend, LA/delete-notification, LA/notification-actions, confirmation-dialog.js, _confirmation-dialog.scss, persistence/records/stub/lifecycle/create.js; backend: BE/notification/NotificationController.java, NotificationCopyMapper.java; tests: notification-cancel-amend-page.ts, notification-actions-guards.spec.ts; perftests: src/k6/journeys.js | overview-and-review |
| 6 | ins-dashboard | inc-126 to inc-147, inc-172 | insfrontend: IF/dashboard, IF/action-needed, IF/status-updated, IF/inspection-required, IF/notification-list, src/server/app/shared; insbackend: ins/backend/notification, src/main/resources; frontend: LA/dashboard; backend: BE/outbox/OutboxEvent.java, OutboxService.java; schemas: schemas/profiles/imports/messaging; tests: dashboard-page.ts, notification-list-page.ts, tests/ins/e2e/features overall-dashboard, action-needed, inspection-required, status-updated, notification-list, notification-dashboard-navigation.spec.ts; perftests: src/k6/pages.js, src/k6/readiness.js, src/config/endpoints.js | overview-and-review, manage-notifications, address-book |
| 7 | type-question-and-templates | inc-148 to inc-171 | insfrontend: IF/notification-type; frontend: LA/templates, LA/check-answers/view-model/template-review, LA/service-navigation.fit.spec.js; backend: BE/template; tests: tests/ins/e2e/features/notification-type, tests/animals/e2e/features/templates, auth.spec.ts | ins-dashboard, origin-page, overview-and-review, commodities-and-reason, arrival-and-transit, documents, transporters, journey-foundation |
| 8 | germinal-products | inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-105, inc-176 to inc-179, inc-181 to inc-186 | frontend: src/server/app/sets/germinal-products, routes-germinal-products.js, routes.js, src/server/router.js, persistence/records/notification-mapper, persistence/records/real/lifecycle/mutate.js, playwright.config.js, vitest.config.js, webpack.config.js, package.json; backend: BE/notification/Species.java, Commodity.java, CommodityComplement.java, BE/outbox/gbnag; tests: page-objects/shared/sets.ts, page-objects/germinal-products, tests/animals/e2e/germinal-products, tests/animals/a11y/germinal-products, tests/animals/security/germinal-products | commodities-and-reason, identification-and-permanent-address, overview-and-review, journey-foundation, origin-page, ins-dashboard, type-question-and-templates, transporters, documents, consignment-parties, arrival-and-transit, manage-notifications |

Every row sits in exactly one theme.

**Cross-theme dependencies:**

- inc-008 (transporters) needs inc-173 (reference-lists): the tidied stub countries.
- inc-012, inc-015, inc-019 and inc-021 (commodities-and-reason) need inc-001 (journey-foundation): they walk or change the new step order.
- inc-022 (commodities-and-reason) needs inc-003 (journey-foundation): the save-without-checks pattern.
- inc-028 and inc-029 (arrival-and-transit) need inc-002 (journey-foundation): the return-to-overview rule.
- inc-034 (documents) needs inc-001 and inc-002 (journey-foundation): its return depends on the step order.
- inc-043 (transporters) needs inc-031 (documents) and inc-001 (journey-foundation): it continues to Upload documents.
- inc-045 (identification-and-permanent-address) needs inc-001 (journey-foundation) and inc-015 (commodities-and-reason): identification follows Commodity details.
- inc-046 and inc-051 (identification-and-permanent-address) need inc-012 (commodities-and-reason): species come from the new catalogue.
- inc-054 (identification-and-permanent-address) needs inc-012 (commodities-and-reason) and inc-001 (journey-foundation): cats, dogs and ferrets, and the step order.
- inc-058 (identification-and-permanent-address) needs inc-001 (journey-foundation): the proof walks the new order.
- inc-074 (address-book) needs inc-038 and inc-039 (transporters): it reuses the type page and save behaviour.
- inc-076 (address-book) needs inc-037 (transporters): it links rows of the new list.
- inc-082 (address-book) needs inc-173 (reference-lists): the tidied stub countries.
- inc-087 (consignment-parties) needs inc-059 (address-book): role filtering needs address uses.
- inc-090 (consignment-parties) needs inc-066 (address-book): the return from the view page.
- inc-091 (consignment-parties) needs inc-012 (commodities-and-reason): who is asked depends on commodities.
- inc-094 and inc-096 (consignment-parties) need inc-054 (identification-and-permanent-address): the permanent address page and section.
- inc-095 (consignment-parties) needs inc-061, inc-070 and inc-080 (address-book): a branch is added through the address book.
- inc-096 (consignment-parties) also needs inc-001 and inc-002 (journey-foundation): where the page continues.
- inc-097 (consignment-parties) needs inc-054 (identification-and-permanent-address) and inc-004 (journey-foundation): endings and amend endings.
- inc-100 and inc-103 (overview-and-review) need inc-028 (arrival-and-transit): transit applies by means of transport.
- inc-108 (overview-and-review) needs inc-054 (identification-and-permanent-address): permanent addresses on the card.
- inc-120 (manage-notifications) needs inc-111 and inc-112 (overview-and-review): Amend starts from the view header.
- inc-121 (manage-notifications) needs inc-110 (overview-and-review): Cancel amend starts from the review.
- inc-124 (manage-notifications) needs inc-112 (overview-and-review): Copy as new from the view page.
- inc-126 (ins-dashboard) needs inc-120, inc-121 and inc-125 (manage-notifications) and inc-111 (overview-and-review): delete from the view and during an amendment.
- inc-128 (ins-dashboard) needs inc-070 (address-book): the home links to the redesigned address book.
- inc-131 (ins-dashboard) needs inc-113 (overview-and-review): the action-required status is set at submit.
- inc-147 (ins-dashboard) needs inc-106 and inc-113 (overview-and-review): identifier messages on the review and at submit.
- inc-148, inc-149 and inc-153 (type-question-and-templates) need inc-128 (ins-dashboard): they start from the new home.
- inc-154 (type-question-and-templates) needs inc-010 (origin-page): the origin page in template mode.
- inc-155 (type-question-and-templates) needs inc-098 (overview-and-review): the hub regions.
- inc-156 (type-question-and-templates) needs inc-101 (overview-and-review): the review structure.
- inc-162 (type-question-and-templates) needs inc-136 (ins-dashboard): it reuses the list sort.
- inc-166 (type-question-and-templates) needs inc-015 (commodities-and-reason): commodity chaining.
- inc-168 (type-question-and-templates) needs inc-028 (arrival-and-transit): arrival returns.
- inc-169 (type-question-and-templates) needs inc-031 (documents) and inc-001 (journey-foundation): the documents step and the order.
- inc-170 (type-question-and-templates) needs inc-037 (transporters) and inc-004 (journey-foundation): the new list and amend endings.
- inc-171 (type-question-and-templates) needs inc-001 (journey-foundation): Back follows the step order.
- inc-174 (arrival-and-transit) and inc-175 (origin-page) need inc-173 (reference-lists): the tidied stub countries.
- inc-180 (consignment-parties) needs inc-080 (address-book): journey-mode adds.
- inc-016 (germinal-products) needs inc-011, inc-012, inc-013 and inc-014 (commodities-and-reason): it copies the finished commodity search.
- inc-017 (germinal-products) needs inc-011 and inc-018 (commodities-and-reason): it copies Commodity details and its hard stop.
- inc-024 (germinal-products) needs inc-015, inc-020, inc-021 and inc-022 (commodities-and-reason): it copies the reason page and its order.
- inc-052 (germinal-products) needs inc-045, inc-046, inc-047 and inc-050 (identification-and-permanent-address): it copies the identification page.
- inc-053 (germinal-products) needs inc-050 (identification-and-permanent-address): the shared length checks.
- inc-099 (germinal-products) needs inc-098 and inc-100 (overview-and-review): it copies the hub.
- inc-105 (germinal-products) needs inc-104 and inc-106 (overview-and-review): it copies the review.
- inc-176 (germinal-products) needs inc-001 and inc-002 (journey-foundation), inc-010 (origin-page), inc-098 and inc-100 (overview-and-review), inc-129, inc-130 and inc-141 (ins-dashboard), and inc-148 and inc-150 (type-question-and-templates): the set starts from the type question and the germinal list.
- inc-177 (germinal-products) needs inc-018 (commodities-and-reason): the packages hard stop.
- inc-178 (germinal-products) needs inc-037 to inc-041, inc-043 and inc-044 (transporters): it copies the transporter step.
- inc-179 (germinal-products) needs inc-031 to inc-035 (documents): it copies Upload documents.
- inc-181 (germinal-products) needs inc-085 to inc-090, inc-095, inc-096 and inc-180 (consignment-parties): it copies roles and addresses and the pickers.
- inc-182 (germinal-products) needs inc-026 to inc-030 (arrival-and-transit), inc-094, inc-095 and inc-097 (consignment-parties) and inc-110 to inc-115 (overview-and-review): it copies the rest of the journey.
- inc-184 (germinal-products) needs inc-141 and inc-172 (ins-dashboard): the proof ends on the germinal list.
- inc-185 (germinal-products) needs inc-120 to inc-125 (manage-notifications) and inc-126 (ins-dashboard): it copies the manage actions.
- inc-186 (germinal-products) needs inc-150, inc-151, inc-154 to inc-161, inc-164 and inc-165 (type-question-and-templates): germinal templates use the template pages.

## Where the requirements came from

- **Claims.** 13,990 claims came from 20 sources. 13,880 held, 110 were refuted and dropped, and 667 were added as missed. That gives a working set of 14,547: 12,648 verbatim, 1,125 inferred and 774 recording gaps.
- **Areas.** Reconcile weighed 22 areas apart: start and origin, commodities, reason and additional details, animal identification, germinal products, arrival and transit, transporters, documents, consignment parties, party address add and edit, CPH, permanent and contact addresses, notification hub, review and submit, dashboard home, notification lists, address book list, address book add and edit, templates, manage notifications, notification record, journey flow, and layout and sign-in.
- **Requirements.** 1,823 in all. 1,675 are adopted: 895 to build (452 changes, 443 new) and 780 already in place. No requirement waits on a question. 148 are out of scope. The backlog covers all 895 to build.
- **Cited.** 13,580 of the 14,547 working-set claims (93%) are cited by a requirement or conflict.

| Source | Rank | Claims | Held | Refuted | Added | Cited | Requirements backed (in scope) |
|---|---|---|---|---|---|---|---|
| Ruling, 9 October 2026 | 1 | 200 | 199 | 1 | 2 | 196 of 201 | 332 (298) |
| Ruling, 7 October 2026 | 2 | 23 | 23 | 0 | 0 | 14 of 23 | 56 (52) |
| V4 germinal data fields | 3 | 109 | 109 | 0 | 5 | 114 of 114 | 34 (32) |
| DR1 parity notes | 4 | 88 | 88 | 0 | 1 | 54 of 89 | 54 (44) |
| DR1 parity backlog | 5 | 481 | 481 | 0 | 64 | 444 of 545 | 164 (144) |
| DR2.1 prototype source | 6 | 1,705 | 1,683 | 22 | 81 | 1,710 of 1,764 | 1,114 (1,050) |
| DR2.1 traces | 7 | 1,791 | 1,784 | 7 | 85 | 1,721 of 1,869 | 1,010 (959) |
| DR2.1 specs | 8 | 1,003 | 998 | 5 | 8 | 857 of 1,006 | 622 (595) |
| Animals backend | 9 | 688 | 683 | 5 | 26 | 709 of 709 | 177 (160) |
| INS backend | 10 | 132 | 132 | 0 | 8 | 138 of 140 | 21 (20) |
| Address book | 11 | 339 | 336 | 3 | 12 | 348 of 348 | 43 (41) |
| Reference data | 12 | 98 | 96 | 2 | 5 | 101 of 101 | 17 (15) |
| Stub | 13 | 130 | 130 | 0 | 6 | 136 of 136 | 16 (13) |
| Animals frontend | 14 | 1,852 | 1,843 | 9 | 97 | 1,753 of 1,940 | 822 (805) |
| INS frontend | 15 | 638 | 638 | 0 | 31 | 646 of 669 | 179 (172) |
| Tests repo | 16 | 907 | 897 | 10 | 39 | 828 of 936 | 412 (396) |
| Performance tests | 17 | 145 | 143 | 2 | 19 | 162 of 162 | 52 (49) |
| Animals fit traces | 18 | 1,948 | 1,921 | 27 | 81 | 1,938 of 2,002 | 756 (740) |
| INS fit traces | 19 | 250 | 248 | 2 | 27 | 275 of 275 | 113 (110) |
| End-to-end traces | 20 | 1,463 | 1,448 | 15 | 70 | 1,436 of 1,518 | 776 (753) |

- **Unused sources.** Every source backs at least one requirement. No source's cited share is under a tenth. The lowest are the 7 October ruling (14 of 23) and the DR1 notes (54 of 89). Their uncited claims are judgements that met no Design Release 2.1 difference (req-1734 records this).
- **The germinal page.** V4 is fully cited (114 of 114). It backs 34 requirements, and settles 8 conflicts on germinal data (c-022, c-179, c-230, c-232 to c-235, c-277).
- **Strongest.** req-1032 (the INS frontend serves the live animals list) rests on 10 sources. 6 rest on 9: req-072 (commodity search as you type), req-234 (species panel save), req-499 (document type options), req-509 (50MB files), req-1051 (list sorting) and req-1256 (address type and uses). 48 more rest on 8.
- **Weakest.** 211 in-scope requirements rest on one source: animals backend 64, DR2.1 source 39, animals frontend 28, DR2.1 traces 16, tests repo 15 and INS frontend 13.
- **Weakest, continued.** Address book 7, performance tests 7, reference data 6, the 9 October ruling 3, animals fit traces 3 and end-to-end traces 3. V4 2, INS backend 2, stub 2 and INS fit traces one.
- **No DR1-only requirement.** No in-scope requirement rests on a DR1 source alone.
- **Inferred only.** 18 in-scope requirements rest only on inferred claims: req-220, req-442, req-610, req-957, req-975, req-1014, req-1296, req-1343, req-1351, req-1365, req-1372, req-1496, req-1508, req-1554, req-1608, req-1699, req-1752 and req-1856.
- **Inferred or gap only.** 11 more rest only on inferred claims and recorded gaps: req-373, req-501, req-581, req-950, req-1002, req-1099, req-1184, req-1188, req-1300, req-1510 and req-1876.
- **Confirm before passing this on:**
  - The goal correction and the `schemas` repo in step 0.
  - c-272's reading that the ruling's "schemas do not change" means no PIMS profile change.
  - inc-140's delete landing against c-269.
  - req-1858 counts as in place on a reading made at reconcile, with no claim recording it. req-374's evidence is a DR1 backlog row.

## Out of scope

### Reference-list content, handed to MDM

- req-026: adding Guernsey, Jersey and Isle of Man to the country of origin list.
- req-027: adding Ceuta and Melilla with prefixes XC and XL.
- req-028: limiting the list to the EU, its territories and the crown dependencies.
- req-029: renaming entries to the prototype's spellings.
- req-302: Design Release 2.1's own port of entry list. The duplicate ports in MDM go to the MDM team.
- req-303: correcting 3 misspelt port names. The misspellings are in MDM's data.
- req-1766: editing the destination list in code to Design Release 2.1's 41 entries.
- req-1767: an exit-only list of animal-approved posts. MDM carries no such flag (see `deferred.md`).
- req-1818: adding Design Release 2.1's outermost regions and territories to the private transporter list.

### Other notification types

- req-059: a non-live-animals type running through the live-animals pages.
- req-1668: the plants for planting, potatoes and wood products journeys. Germinal products is no longer excluded.
- req-1764: choosing a commodity for the plants types.

### URL paths, field names and data shapes the prototype does not decide

| Requirement | What is not built | Settled by |
|---|---|---|
| req-271 | The arrival details page at 'arrival-details' | c-236 |
| req-465 | A durable transporter register service | 9 October ruling |
| req-477 | The documents page at 'upload-documents' | c-059 |
| req-626 | The prototype's roles and addresses paths | 9 October ruling |
| req-821 | A separate header-less journey review | c-246 |
| req-1016 | A /dashboard redirect | c-249 |
| req-1087 | A held, show-once success message | c-252 |
| req-1341 | Saving over a template in whole-template edit | c-261 |
| req-1342 | Template ids built from titles | c-259 |
| req-1355 | A POST handler on a template's page | c-262 |
| req-1357 | The template section allow-list redirect | c-263 |
| req-1362 | The whole-template edit mode | c-261 |
| req-1366 | Recording the template on a notification | c-260 |
| req-1829 | The prototype's picker form field names | 9 October ruling |
| req-1846 | Template guards on the declaration | c-248 |

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
| req-1742 | How the prototype starts a notification internally |

### Set aside by a conflict or an accessibility duty

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
| req-1847 | A submitted view title with no page name | c-006 |

### Germinal data left out

- req-1802: publishing the germinal details PIMS has no field for. That waits on EUDPA-686, outside this backlog.
- req-1803: an approved establishment. V4 records it as de-scoped on 7 September 2026.
- req-1804: a package type. V4 records it as de-scoped on 7 September 2026.
- req-1805: a k6 performance journey for the germinal products set.

### DR1 rows that are not requirements

The rulings make the DR1 backlog a source of judgements only: req-192, req-369, req-555, req-1031, req-1190, req-1288, req-1734 and req-1883.

### Weighed in another area

req-198 (phase banner), req-266 (DR1 permanent-address rows), req-270 (CPH and line removal), req-482 (phase banner), req-552 (documents on the review), req-949 (other areas' claims), req-1028 (category dashboards), req-1029 (confirmation and view pages), req-1030 (address book pages), req-1564 (list API tests), req-1778 (germinal rows on the review), req-1779 (the germinal identification copy), req-1816 (exit border control post) and req-1817 (transporter blank save).

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
| req-1759 | Unsaved Commodity details numbers lost on Remove | Animals frontend |
| req-1873 | Address lookup simulator test gaps | Stub |

### Nothing designed, or nothing to build

| Requirement | Why |
|---|---|
| req-065 | No new lists move into reference data |
| req-191 | No check between reason and certification purpose is asked for |
| req-396 | No transporter approval step is shown anywhere |
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
| req-1765 | Prototype data the commodity pages never show |

## Terms used

| Term | Meaning |
|---|---|
| 7 October ruling | Sam's ruling of 7 October 2026 (`ruling:sam-2026-10-07`) |
| 9 October ruling | Sam's ruling of 9 October 2026 (`ruling:sam-2026-10-09`), the highest source |
| axe | The automated accessibility checker the suites run |
| BE | Backend repo |
| BT | The postcode area for Northern Ireland |
| CDP | Core Delivery Platform, where the services are deployed |
| CPH | County parish holding number |
| CSRF | Cross-site request forgery; a CSRF token protects form posts |
| DR1 | Design Release 1 and its parity programme, whose judgements outrank the prototype |
| DR2.1 | Design Release 2.1 of the GB notification service prototype |
| E2E | End to end: the tests repo's suite against the whole stack |
| EUDPA | The programme's Jira project key |
| FE | Frontend repo |
| fit | The frontends' own Playwright suites, run against stubs |
| GBN-AG | The GB notification for animals and germinal products, and its event format |
| GBNAG_SPS_EX | The MDM block of countries the GBN-AG notification may use |
| INS | Import Notification Service: the front door, dashboard and address book |
| ITAHC | Intra Trade Animal Health Certificate |
| k6 | The load-testing tool the performance suite uses |
| MDM | Master data management, the source of reference lists |
| outbox event | The event the animals backend writes and publishes for each lifecycle change |
| PIMS Dynamics | The authorities' case system that receives notifications |
| read model | The INS backend's copy of notifications that the dashboard and lists read |
| Review point | A row where the build loop stops for the owner to look |
| Standard Address Block | The shared shape of an address record |
| stub | `trade-imports-stub`, standing in for MDM and the address lookup locally and in CDP dev |
| typeCode | The GBN-AG code naming a trade line's kind, such as LIVE_ANIMAL or SEMEN |
| V4 | Live Animals Germinals Data Fields, version 4 (`confluence:6497338582`) |
| WCAG | Web Content Accessibility Guidelines |

