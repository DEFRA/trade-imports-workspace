# Later rows trimmed to their deltas, and built themes treated as stale branches

20 October 2026. Applies Sam's two rulings to every Design Release 2.1 backlog after design snagging.

## Summary

- **Every later row now holds only its delta:** what is still to build once `main` and design snagging have landed.
- **"Keep the snagging version" notes are gone.** A later theme is built from `main` after snagging lands, so there is nothing to overwrite.
- **A later row waits on a design snagging row only where it builds on code that row creates.** 45 such waits were dropped.
- **Five built themes are stale branches.** They will not be merged. Each is played later on a fresh branch from `main`, taking code from the stale branch as its rows' "Salvage:" notes say.
- **Rows ported in full by design snagging are removed.** Their criteria (copied in verbatim) and requirement ids now sit on the snagging row that ports them, so nothing is lost.
- **Nothing was closed or renamed.** No git branch was renamed or deleted, and no pull request was touched. The PRs to close later are listed in `themes/HOW-TO-BUILD.md` and `LAYERS-PLAN.md`.

| | Rows |
|---|---|
| Removed | 16 |
| Trimmed | 61 |
| Reset from done to todo, with salvage notes | 35 |
| Kept as they were | 72 |
| **Total rows reviewed** | **184** |

Design snagging itself is unchanged in scope. 11 of its 16 rows were edited to take in what the removed rows held.

### Per theme

| Theme | Removed | Trimmed | Reset | Kept | Rows now |
|---|---|---|---|---|---|
| Documents | 0 | 4 | 0 | 1 | 5 |
| Identification and permanent address | 0 | 6 | 0 | 3 | 9 |
| Consignment parties | 1 | 8 | 0 | 2 | 10 |
| Germinal products | 0 | 12 | 0 | 8 | 20 |
| Waiting on design | 1 | 7 | 0 | 4 | 11 |
| Transporters | 1 | 2 | 0 | 9 | 11 |
| Address book | 1 | 11 | 0 | 11 | 22 |
| INS dashboard | 0 | 0 | 0 | 8 | 8 |
| Animals dashboard | 0 | 4 | 0 | 10 | 14 |
| Manage notifications | 0 | 0 | 0 | 6 | 6 |
| Origin page (stale, now retired) | 3 | 0 | 0 | 0 | 0 |
| Commodities and import reason (stale) | 2 | 3 | 4 | 1 | 8 |
| Arrival and transit (stale) | 2 | 0 | 3 | 1 | 4 |
| Overview and review (stale) | 1 | 1 | 15 | 5 | 21 |
| Type question and templates (stale) | 4 | 3 | 13 | 3 | 19 |

### Stale branches

| Theme | Stale branch | What happens |
|---|---|---|
| Origin page | `feat/EUDPA-695-design-release-2-1-origin-page` | Retired. Design snagging inc-202 and inc-203 salvage all of it, now including tests 4f9cec8 |
| Commodities and import reason | `feat/EUDPA-693-design-release-2-1-commodities-and-reason` | 4 rows rebuilt from salvage; 2 ported by snagging |
| Arrival and transit | `feat/EUDPA-694-design-release-2-1-arrival-and-transit` | 3 rows rebuilt from salvage; 1 ported by snagging, 1 already on `main` |
| Overview and review | `feat/EUDPA-696-design-release-2-1-overview-and-review` | 15 rows rebuilt from salvage; 1 ported by snagging |
| Type question and templates | `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | 13 rows rebuilt from salvage; snagging ports nothing from it |

- `themes/themes.json` marks each with `staleBranch`, and each now lands after design snagging.
- Row `merge` fields (templates inc-166, inc-168, inc-170, inc-171) are obsolete and cleared.
- Every "drop at merge", "trim at merge" and "keep main's version at merge" note is removed or replaced by a salvage note.

## Theme by theme

"Snagging" means the design snagging theme. "Main" means `main` today, with journey foundation and reference lists merged.

### Documents

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Health certificate leaves the type list; references take punctuation | inc-033 | Trimmed | "Keep inc-215's version" note and the wait on snagging inc-215. All 4 criteria stay |
| The page returns the trader where they came from | inc-034 | Trimmed | 2 criteria: going on in the opening run, and returning to the overview. Main has both (journey foundation). Still to build: Back to review and the amend case |
| Save and continue stops waiting for virus scans | inc-035 | Trimmed | 2 criteria main already meets ('Virus found' holds; blank Save and return adds nothing), kept as a note so they stay true |
| Files up to 50MB | inc-036 | Trimmed | The wait on snagging inc-215 and its note. Still blocked on the CDP cap |

Kept unchanged: entry guard after the origin (inc-031).

### Identification and permanent address

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Identification details' Back link follows each entry point | inc-045 | Trimmed | 3 criteria on the journey chain and skip: on main (flow/run.js). Now waits on templates inc-156 for the template-review return |
| An empty species panel is refused on its own save | inc-048 | Trimmed | 2 criteria main already meets (one identifier is enough; blank continue passes) |
| Pigs, sheep and goats by ear tag only | inc-051 | Trimmed | The wait on snagging inc-214: nothing built on its code |
| A permanent address page for cats and dogs | inc-054 | Trimmed | The wait on journey foundation inc-001 (on main); ordering note rewritten |
| The permanent address leaves the identification page | inc-057 | Trimmed | "Keep inc-214's look" note |
| End-to-end proof: pet cats with permanent addresses | inc-058 | Trimmed | The wait on journey foundation inc-001 (on main) |

Kept unchanged: completion dropped row (inc-049), permanent address checks (inc-055), permanent address summaries (inc-056).

### Consignment parties

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Place of origin picker searches by country | inc-089 | Removed | Already dropped. Snagging inc-212 gives that picker the same search as the other four |
| Role-filtered pickers on one page | inc-087 | Trimmed | The wait on snagging inc-210 (look only). Still waits on inc-212, whose results count it changes |
| Same-as shortcuts | inc-088 | Trimmed | History note that repeated the inc-213 wait |
| Picker 'View' link | inc-090 | Trimmed | Plants-keeps-its-disclosure criterion: on main |
| CPH number page | inc-091 | Trimmed | Who is asked, and where Save and continue goes: on main |
| CPH number shown as 12/345/6789 | inc-092 | Trimmed | 5 criteria: the 'Add a CPH number' link (snagging inc-213), the onward steps and three-box round trip (main). Only the slashed display is left |
| Contact address page | inc-094 | Trimmed | Required choice, ending on review, plants run end, no submit without contact: on main. Plants heading: snagging inc-212 |
| Roles and addresses: Permanent address section and completion | inc-096 | Trimmed | 4 continue-destination criteria: on main |
| Amend endings on the permanent address page | inc-097 | Trimmed | 8 criteria: pickers, CPH, contact and plants amend endings are on main (save-actions.njk, journey foundation inc-004 and inc-122). Plants leaves its repos. Flag: the 'hub' wording may be superseded |

Kept unchanged: branch-only contact list (inc-095), INS address book for germinal adds (inc-180).

### Germinal products

Every germinal criterion is still to build. Only copy-from-main notes and waits went: the theme already waits on design snagging as a whole.

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Germinal commodity page | inc-016 | Trimmed | "Copy as snagging leaves it" note; waits on commodities inc-011 (now snagging inc-205), snagging inc-205 and inc-210 |
| Germinal Commodity details | inc-017 | Trimmed | Same, for inc-011 and inc-205 |
| Germinal opening run and import reason | inc-024 | Trimmed | Waits on commodities inc-020 (now snagging inc-207) and inc-207 |
| Germinal identification | inc-052 | Trimmed | Wait on snagging inc-214; note rewritten to the real delta |
| Germinal dates and donor checks | inc-053 | Trimmed | Wait on snagging inc-214 and the stale inc-050 mention |
| Germinal review | inc-105 | Trimmed | Wait on snagging inc-216 |
| Germinal start, draft and origin page | inc-176 | Trimmed | Waits on journey foundation inc-001 and inc-002 (on main) and snagging inc-202 to inc-204 |
| Germinal transporter step | inc-178 | Trimmed | Waits on snagging inc-210 and inc-211 |
| Germinal Upload documents | inc-179 | Trimmed | Wait on snagging inc-215 |
| Germinal roles and addresses | inc-181 | Trimmed | Waits on snagging inc-210, inc-212 and inc-213 |
| Rest of the germinal journey | inc-182 | Trimmed | Waits on arrival inc-026 and overview inc-114 (now snagging), arrival inc-027 (on main) and snagging inc-206, 208, 209, 217 |
| Germinal amend, copy and delete | inc-185 | Trimmed | Wait on journey foundation inc-122 (on main) |

Kept unchanged: inc-099, inc-141, inc-172, inc-177, inc-183, inc-184, inc-186, inc-191.

### Waiting on design

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Place of origin rows filter as you type | inc-197 | Removed | Empty tombstone: req-1951 is already in inc-193 |
| Commodity search lists results as you type | inc-014 | Trimmed | Icon button (snagging inc-210) and the no-JavaScript search (main) |
| Transit countries added in place | inc-030 | Trimmed | No-JavaScript criterion: on main. 'Remove Germany' now names only rows added with JavaScript |
| CPH boxes keep out non-digits | inc-093 | Trimmed | No-JavaScript criterion restating main's errors |
| A sort on Manage templates | inc-162 | Trimmed | Back from dropped to blocked: the stale templates branch holds no row for req-1299 |
| Search button beside the type-aheads | inc-188 | Trimmed | 2 no-JavaScript criteria (main) and stale notes on origin inc-009 and arrival inc-027 |
| Country of origin screen-reader wording | inc-189 | Trimmed | Wait on snagging inc-202: the messages need none of its code |
| Party pickers filter as you type | inc-193 | Trimmed | 2 no-JavaScript criteria (main) and the wait on snagging inc-210 |

Kept unchanged: inc-192, inc-194, inc-195, inc-198.

### Transporters

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Continue goes on to Upload documents | inc-043 | Removed | On main: flow/run.js and its run tests (req-405) |
| The transporter list | inc-037 | Trimmed | Icon search, server search and default accessibility: snagging inc-210 and inc-211. Wait on inc-211 dropped |
| Saving an added transporter | inc-039 | Trimmed | Reuse on the next notification: on main |

Kept unchanged: inc-008, inc-038, inc-040, inc-041, inc-042, inc-044, inc-074, inc-075, inc-076.

### Address book

Not stale: played one ticket at a time from `main`. EUDPA-707 has merged; EUDPA-708 is live on open PRs.

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Address validation messages | inc-060 | Removed | On main via EUDPA-707 (req-1236, req-1239, req-1240, req-1242) |
| Adding starts by choosing a type | inc-061 | Trimmed | Page-title criterion: on main. Salvage note for 7e70ca7, rebuilt under EUDPA-711 |
| Add form drops County and defaults to UK | inc-062 | Trimmed | 6 layout and copy criteria: on main via EUDPA-707 |
| Address book list | inc-063 | Trimmed | Wait on snagging inc-210 (different repo) |
| View an address | inc-064 | Trimmed | List and view titles: on main. In flight on EUDPA-708 |
| Delete an address | inc-065 | Kept | Note added: in flight on EUDPA-708 |
| Return to where the address was opened | inc-066 | Kept | Note added: in flight on EUDPA-708 |
| Address search for real UK addresses | inc-072 | Trimmed | Wait on snagging inc-210 |
| Editing an address | inc-073 | Trimmed | Section headings: on main. Wait on inc-062 dropped |
| Journey add page in DR2.1's form | inc-077 | Trimmed | 3 heading and label criteria: on main |
| Destination side fixes country to UK | inc-078 | Trimmed | 8 criteria describing main. Wait on inc-060 dropped |
| Journey add lands where DR2.1 says | inc-080 | Trimmed | 4 duplicate or on-main criteria |
| Country list from MDM | inc-082 | Trimmed | 'Still a plain select' criterion describing main |
| Welsh for add and edit | inc-084 | Trimmed | Wait on inc-060 (removed) |

Kept unchanged: inc-059, inc-067 to inc-071, inc-079, inc-081, inc-083.

### INS dashboard and manage notifications

No changes. Nothing in either is on main or in snagging, and neither carried snagging notes. INS dashboard: inc-128, inc-132 to inc-134, inc-143 to inc-146. Manage notifications: inc-120, inc-121, inc-123 to inc-125, inc-201.

### Animals dashboard

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| One search and sort form | inc-136 | Trimmed | "Look like inc-210" note. Still waits on inc-210 for its MoJ Search code |
| Additional filters | inc-137 | Trimmed | Wait on snagging inc-206: kit.dateField is on main |
| Identifier outstanding items | inc-147 | Trimmed | Don't-overwrite wait on snagging inc-217 |
| Plants' list tabs, search and filters | inc-200 | Trimmed | Wait on snagging inc-206 |

Kept unchanged: inc-126, inc-129 to inc-131, inc-135, inc-138 to inc-140, inc-142, inc-196.

### Origin page (stale, retired)

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| No hint and a search placeholder | inc-009 | Removed | Snagging inc-202 and inc-203 (req-015, req-016) |
| Region code, reference hint, the finished page | inc-010 | Removed | Snagging inc-203 (8 requirements) |
| Subdivisions labelled with their country | inc-175 | Removed | Snagging inc-203 (req-030), now also porting tests 4f9cec8 |

Snagging inc-203's catch-all criterion is replaced by these rows' criteria, copied in verbatim. Its open question on plants subdivisions is answered: none, as 4f9cec8 shows.

### Commodities and import reason (stale)

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Commodity pages' wording and error order | inc-011 | Removed | Snagging inc-205 (10 requirements) |
| Main import reason copy | inc-020 | Removed | Snagging inc-207 (6 requirements) |
| Commodity page Back links and the k6 walk | inc-015 | Reset | 4 criteria on forward order and returns: on main. Salvage 3d192e94, 327f280, 85acbe9 |
| Hard stops: means of transport and packages | inc-018 | Reset | 3 criteria describing main. Salvage f94b0823, 120e234 |
| Reason and additional details Back links | inc-021 | Reset | 5 forward-order criteria: on main. Salvage 982f2930, eea07b3 |
| Blank saves keep earlier answers | inc-022 | Reset | 5 criteria on main. Salvage fa115bd6, 50c4042 |
| Live-animal catalogue from MDM | inc-012 | Trimmed | Wait on snagging inc-214. Note added: the 'Cow' unweaned list must move with the rename |
| Search results and chips | inc-013 | Trimmed | Waits on snagging inc-205 and inc-210 |
| Unweaned question for cattle and pigs | inc-023 | Trimmed | Horses-and-others criterion: adding pigs cannot add them |

Kept unchanged: poultry by rail proof (inc-019).

### Arrival and transit (stale)

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Arrival details wording | inc-026 | Removed | Snagging inc-208 (10 requirements), with inc-202 and inc-206 |
| Port labels '<name> - <code>' | inc-027 | Removed | On main through reference lists (req-295, req-1929) |
| Means of transport required | inc-028 | Reset | 6 routing criteria: on main (journey foundation). Salvage 843821b8, 5246f57 |
| Transit countries title, Back link, redirect | inc-029 | Reset | Empty state: snagging inc-209 (req-356). Salvage 49e22db9, 29c74b5, bf126b6 |
| Transit country list with subdivisions | inc-174 | Reset | Wait on reference lists inc-173 (on main). Salvage 7d42a714, 22a54fa, bf126b6 |

Kept unchanged: the dropped arrival-details address row (inc-025).

### Overview and review (stale)

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Declaration checkbox and no status strip | inc-114 | Removed | Snagging inc-217 (6 requirements) |
| Hub regions | inc-098 | Reset | Task rename: snagging inc-207. Salvage 56a0aeb8, 12a9c2e, 36c7865 |
| Transit task only when required | inc-100 | Reset | Nothing removed. Salvage 93d8eec2, 9a10909 |
| Review sections and cards | inc-101 | Reset | Criterion reworded to 'Main import reason'. Salvage 450eb8dc, 0196f0c |
| Review rows for origin to arrival | inc-102 | Reset | Transport labels: snagging inc-208. Salvage 59040f14, 4e14ce5 |
| Arrival and transit statuses | inc-103 | Reset | Failed-attempt history. Salvage 2d5a96b5, 5924420 |
| Commodity read-back | inc-104 | Reset | Salvage be35bf0c, d1884244, 533fe1f |
| Identification on the review | inc-106 | Reset | Salvage 6d70bb05, 23ce905 |
| One card per document | inc-107 | Reset | Failed-attempt history. Salvage e545aea0, 02dd6bc |
| Party addresses on the review | inc-109 | Reset | Failed-attempt history. Salvage 64549060, 2e00495, aed99ca |
| Continue, Delete and Cancel amend | inc-110 | Reset | Salvage eea604f, 24cbcbcb, d2f668a, f4a1d68 |
| View header | inc-111 | Reset | Salvage a414542, 40c3b6cc, 639330f, c2fe427 |
| View header actions and reference numbers | inc-112 | Reset | Salvage 16e63a68, be5eff3, cdb4cee |
| 'Submitted action required' | inc-113 | Reset | Duplicate criteria merged, keeping every citation. Salvage 6dbcfcf, df59fbde, b64c5ae, ce36c8f |
| Notification submitted guard and ITAHC | inc-115 | Reset | 3 wording criteria: snagging inc-217. Now waits on inc-113. Salvage 9fef3175, 63b62cc, d4d2ccc |
| Draft review header | inc-187 | Reset | Salvage 25b65c18, 3b06ece, cb0b5e8 |
| Tests for untested review paths | inc-117 | Trimmed | "Assert the snagging version" note and waits on snagging inc-216 and inc-217 |

Kept unchanged: inc-108, inc-116, inc-118, inc-119, inc-199.

### Type question and templates (stale)

| Row | Id | Action | What went, and where it is delivered |
|---|---|---|---|
| Commodity pages return to where the trader came from | inc-166 | Removed | Main (req-119) and inc-155 and inc-159 (req-091) |
| Import reason edits a template | inc-167 | Removed | inc-159 (req-167) |
| Template creation leaves out Upload documents | inc-169 | Removed | inc-155 (req-543), with a new run-skip criterion |
| Transporter list buttons in amend and template | inc-170 | Removed | Main (req-407) and a new inc-159 criterion (req-408) |
| 'What are you importing?' before creating | inc-148 | Reset | Alpha banner: on main. Salvage e6f5d7cf and others |
| Create new on the INS home | inc-149 | Reset | Salvage fd9b1c3, 7659d8d, 016663f5 |
| Manage templates, empty | inc-151 | Reset | Alpha banner: on main. Salvage 9eab88ea, 7b01ce5, 997a91b |
| Templates in the navigation | inc-152 | Reset | Duplicate criterion and build history. Salvage 37c1ce63 and others |
| Use template on the INS home | inc-153 | Reset | Salvage 28d32ac, 188f55b, b9adef9 |
| Start a template | inc-154 | Reset | Merge note. Salvage f806b99a and others |
| Template task list | inc-155 | Reset | 6 duplicate criteria. Gains the Upload documents run skip from inc-169 |
| Review your template | inc-156 | Reset | 1 duplicate criterion. Salvage cab954f8 and others |
| Save a template | inc-157 | Reset | Salvage af1e5051, d7ccc0eb and others |
| View a saved template | inc-158 | Reset | Salvage 162b2d52, bd38400, 69e0da7 |
| Change one section of a template | inc-159 | Reset | Merge note. Gains the transporter-list criterion and req-167, req-408, req-091, req-291 |
| Use a template | inc-160 | Reset | Salvage 6373d446, b2c54aa, 76702db5 |
| Template card answers | inc-161 | Reset | Build history. Salvage c7a6e67f, 3690dfa, e4384be |
| Origin's Back link follows the start | inc-150 | Trimmed | Template-review Back link: inc-159. Wait on inc-171 dropped |
| Arrival details in a template | inc-168 | Trimmed | 2 return criteria: inc-159. Merge field and wait on arrival inc-028 dropped |
| Back links follow context | inc-171 | Trimmed | 4 criteria on main or in inc-159. Merge field and wait on journey foundation dropped |

Kept unchanged: inc-163 (dropped), inc-164, inc-165 (deferred).

## Design snagging rows that took work in

| Row | Id | What it gained |
|---|---|---|
| Origin page | inc-203 | Criteria of origin inc-009, inc-010 and inc-175 in place of its catch-all; their 11 requirement ids; tests 4f9cec8; open question answered |
| Commodity pages | inc-205 | Criteria and 10 requirement ids of commodities inc-011 |
| Main import reason | inc-207 | Criteria and 6 requirement ids of commodities inc-020 |
| Arrival details | inc-208 | Criteria and 10 requirement ids of arrival inc-026 |
| Transit countries | inc-209 | req-356, the empty state, from arrival inc-029 |
| Declaration and submitted page | inc-217 | Criteria and 6 requirement ids of overview inc-114, and inc-115's 3 wording criteria |
| Type-ahead, date picker, region prefix, transporter list, addresses | inc-202, 204, 206, 211, 213 | "Drops at merge" and rebase notes rewritten as salvage or removed |

## Not applied

- Requirement statuses in `distil/requirements.json` are unchanged. Requirements now met on main stay on their rows as pointers, or are left with the removed row's record here.
- The `branch` field of each stale theme still names the stale branch. Point it at the fresh branch when the theme is played.
- Arrival and transit's `touches` were not narrowed.
