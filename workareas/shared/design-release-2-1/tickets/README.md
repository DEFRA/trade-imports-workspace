# Theme tickets

One ticket per **domain**, not per theme. A theme is built on one branch across
every repo it touches, but its stakeholders are different per service, so the
ticket a business reader opens contains only their domain's changes.

Each folder holds `description.txt` — the Jira description field, verbatim — and
`ticket.json`, a `tim-ticket/1` manifest.

## The tickets

Six themes have their filled-in tickets. Design snagging's are `Deskcheck` (merged to main on 23 October), as are the type question's (merged 6 November); the rest are `In Dev`. All hang
off epic **EUDPA-328**.

### Journey foundation — 74 scenarios, 19 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `animals-journey/` | [EUDPA-691](https://eaflood.atlassian.net/browse/EUDPA-691) | Live animals journey | 5 | 35 | 7 |
| `plants-journey/` | [EUDPA-699](https://eaflood.atlassian.net/browse/EUDPA-699) | High-risk plants journey | 6 | 34 | 11 |
| `ins-front-door/` | [EUDPA-700](https://eaflood.atlassian.net/browse/EUDPA-700) | Front door | 1 | 5 | 1 |

### Reference lists — 14 scenarios, 6 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `reference-lists-animals/` | [EUDPA-692](https://eaflood.atlassian.net/browse/EUDPA-692) | Live animals journey | 3 | 10 | 3 |
| `reference-lists-plants/` | [EUDPA-701](https://eaflood.atlassian.net/browse/EUDPA-701) | High-risk plants journey | 2 | 3 | 2 |
| `reference-lists-ins/` | [EUDPA-702](https://eaflood.atlassian.net/browse/EUDPA-702) | Front door | 1 | 1 | 1 |

### Arrival and transit — 14 scenarios, 5 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `arrival-and-transit-animals/` | [EUDPA-694](https://eaflood.atlassian.net/browse/EUDPA-694) | Live animals journey | 4 built (inc-240, inc-241, inc-029, inc-174) | 14 | 5 |
| `arrival-and-transit-plants/` | [EUDPA-703](https://eaflood.atlassian.net/browse/EUDPA-703) | High-risk plants journey | 1 (inc-240, the main merge) | 0 | 0 |

14 + 0 = 14, the theme's total. The two overview scenarios are counted through `footprint-overrides.json`. The Welsh means of transport scenario SCN-ARRIVAL-006-C was added and then removed, so it is not counted. Rewritten 3 November after the reused branch was rebuilt on `main`: the 13 October wording and port label rows reached `main` through design snagging and reference lists, so neither ticket claims them. Plants gains no behaviour change; the plants pull request carries only the joi 18.3.1 and @hapi/content 6.0.3 security fix.

### Accompanying documents — 11 scenarios, 1 file

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `documents-stub/` | [EUDPA-724](https://eaflood.atlassian.net/browse/EUDPA-724) | Live animals journey | 8 | 11 | 1 |

One domain only: plants has no documents page and the front door is untouched,
so the theme's totals and the domain's are the same 11 scenarios in the one
file, `live-animals/journey-pages/upload-documents/spec.md`. The folder keeps
its `documents-stub/` name from the split, but the ticket is no longer a stub:
the WRITE flow filled it in on 27 October and `tickets.json` records it under
`animals` rather than `stub`.

Eight rows of the theme's nine appear in the table. The ninth, inc-036 (files up
to 50MB), is left out because it was dropped rather than built: EUDPA-296 had
already delivered it, and the CDP request-size limit it was thought to wait on
(EUDPA-518) never applied to the upload route. inc-040 is in the table and was
not in the theme at the split: it is the row that took `main` into the branch
after the pull request stopped running checks.


### Commodities and reason — 36 scenarios, 8 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `commodities-and-reason-animals/` | [EUDPA-693](https://eaflood.atlassian.net/browse/EUDPA-693) | Live animals journey | 12 | 36 | 8 |

One domain only: the theme changes nothing in plants or the front door, so the
theme's totals and the domain's are the same 36 scenarios across the same 8
files. The folder is new; the ticket is not — EUDPA-693 was the stub raised at
split time to name the branch, filled in by the WRITE flow on 6 November, and
`tickets.json` now records it under `animals` rather than `stub`.

Twelve of the theme's nineteen rows appear in the table. Two are dropped and
named in the description rather than left silent: inc-012, a commodity catalogue
matching Design Release 2.1, and inc-022, keeping earlier answers on a blank
main import reason. The other five — inc-019, inc-248, inc-249, inc-250 and
inc-251 — changed only test suites or took `main` into the branch, so they carry
no behaviour a reader can check. inc-029 is in the table with its blocked state
shown, because it is work being held rather than work refused.

### Type question — 55 scenarios, 21 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `type-question-ins/` | [EUDPA-690](https://eaflood.atlassian.net/browse/EUDPA-690) | Front door | 8 | 25 | 3 |
| `type-question-animals/` | [EUDPA-779](https://eaflood.atlassian.net/browse/EUDPA-779) | Live animals journey | 8 | 14 | 8 |
| `type-question-plants/` | [EUDPA-780](https://eaflood.atlassian.net/browse/EUDPA-780) | High-risk plants journey | 6 | 16 | 10 |

25 + 14 + 16 = 55, the theme's total, across 3 + 8 + 10 = 21 files. All three are `Deskcheck`: the theme merged to `main` on 6 November and the MERGE flow wrote all three that day, with spec links to `main`. EUDPA-690 was the stub for the old `type-question-and-templates` theme; templates is parked, so the stub became the front door's ticket and `tickets.json` records it under `type-question`, not `stub`.

The workspace pull request was squash-merged, so `main` holds no theme-scoped commits to derive from. The derivation ran against the local `feat/EUDPA-690-type-question` branch, whose `openspec/` is identical to `main`'s; its output is `derived-type-question.json`. One scenario, the plants commodity type Save and return check (inc-247), was written under the ticket key and is counted through `footprint-overrides.json`.

The front door's question offers four types: Live animals; Plants for planting; Potatoes (seed and ware); Wood products. Germinal products is held back until the germinal products set has a start page (inc-263); three scenarios that described it were added and later removed, so they are not counted. Of the 19 rows, inc-250, inc-261 and inc-262 changed only animals admin and inc-258 only the test suites, so they appear in no table. inc-260 changed only docs and the spec and is listed on the front door's ticket, whose navigation scenarios it wrote.

`derived.json` reports 39 scenarios where this table says 36. The deriver tracks
a scenario by its heading, so each of the three the 5 November spec catch-up
renamed is counted twice — once textless under its old name, once under its new.
36 is the number of distinct scenario ids, and the number the ticket carries.

### Origin page — 16 scenarios, 4 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `origin-page-animals/` | [EUDPA-695](https://eaflood.atlassian.net/browse/EUDPA-695) | Live animals journey | 3 | 14 | 3 |
| `origin-page-plants/` | [EUDPA-704](https://eaflood.atlassian.net/browse/EUDPA-704) | High-risk plants journey | 1 | 2 | 1 |

### Design snagging — 102 scenarios, 26 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `design-snagging-animals/` | [EUDPA-720](https://eaflood.atlassian.net/browse/EUDPA-720) | Live animals journey | 21 | 73 | 14 |
| `design-snagging-plants/` | [EUDPA-730](https://eaflood.atlassian.net/browse/EUDPA-730) | High-risk plants journey | 12 | 29 | 12 |
| `design-snagging-common/` | [EUDPA-729](https://eaflood.atlassian.net/browse/EUDPA-729) | Common to both frontends | 7 | (summary) | (summary) |

73 + 29 = 102 scenarios and 14 + 12 = 26 files. The common ticket is not a
domain: it summarises the search boxes, date pickers and Back links both
frontends share, with representative scenarios from both, all already counted
in the two domain tickets. It goes beyond this skill's one-ticket-per-domain
split, at Sam's request. Both domain tickets *relate to* it and point to it.

EUDPA-720 was the stub raised at split time; it is now the live animals ticket,
updated in place, and its folder was renamed from `design-snagging-stub/`.

The row counts include the second build's five rows from
`themes/design-snagging-b/backlog.json` (inc-214, inc-216, inc-217, inc-219,
and the final tidy inc-221), which `derived.json` does not
read. Merged-into rows are listed with that state; the dropped row inc-222 is
left out. The work merged to main on 23 October (animals #421, plants #113, tests #42); the engineering review's follow-ups are in `themes/design-snagging-followups/backlog.json`.

### Address book — 171 scenarios, 3 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `address-book/` | [EUDPA-789](https://eaflood.atlassian.net/browse/EUDPA-789) | INS front door | 24 | 155 | 2 |
| `address-book/` | [EUDPA-789](https://eaflood.atlassian.net/browse/EUDPA-789) | Live animals journey | 2 + EUDPA-721 | 16 | 1 |

155 + 16 = 171 scenarios and 2 + 1 = 3 files. One ticket covers both domains,
in two sections, at the user's request (epic EUDPA-646), so `tickets.json`
records EUDPA-789 under both `ins` and `animals`. The theme was delivered as six
tickets (EUDPA-706 to 711) and then EUDPA-721's picker work, all scoped by Jira
key rather than by theme slug, so `tickets.json` lists those keys under
`rowScopes` for `derive-scenarios` to find the footprint. All merged to `main`;
the ticket is `Deskcheck`. 7 scenarios (2 INS, 5 live animals) are partly
proved, each one only an end-to-end test can prove in full.

A later change is made under EUDPA-789 itself: every address type, and every
role picker's add page, offers every country, and the address book accepts any
role in any country. Its commits are scoped by the ticket key, which
`tickets.json` records for the theme, so they count inside the footprint. It
changed existing scenarios, not the count. While it is on
`feat/EUDPA-789-any-country`, the ticket's spec links point at that branch;
regenerate them to `main` once it merges.

Every theme's per-domain scenarios and files sum to its own totals, which is how
a dropped or double-counted file gets caught. Each new ticket *relates to* the
ticket the theme was split with.

A folder whose ticket already existed has a `ticket.created.json` but no plan id:
those were raised at theme-split time to supply the branch name, before this
skill existed, so their descriptions are updated in place rather than created.

### Not yet ticketed

Two themes are not fully drained, so their tickets would describe unfinished
work: overview and review (2 todo, 2 blocked) and type question and templates
(9 rows held). Each still has only the stub raised at split time. Two themes have
left this list: documents (EUDPA-724) drained on 27 October, and commodities and
reason (EUDPA-693) on 5 November — both filled in. The ten unsplit themes in the
main backlog have no tickets at all.

Commodities and reason drained with two rows still blocked, inc-029 and inc-249,
both waiting on MDM. A theme is ticketed once no row is buildable, not once every
row is done, so a blocked row is shown with its state rather than holding the
whole ticket back.

All three hang off epic **EUDPA-328**, "Catch up frontend with prototype".

The same row appears in more than one ticket, because one increment changes
several services. That is the programme's design, not duplication: *"Where a row
changes a page or behaviour plants also has, the same increment changes plants.
Plants keeps its own questions and data."*

## Rules and method

These tickets are owned by the **`theme-ticket`** skill, which holds the rules
and the derivation steps as its single source of truth — see
[`.claude/skills/theme-ticket/SKILL.md`](../../../../.claude/skills/theme-ticket/SKILL.md).
The two that most often catch someone out:

- acceptance criteria come from `openspec/specs/`, never from the backlog — on
  this theme the two disagreed about whether an incomplete amend review shows an
  error;
- the per-domain scenario counts must sum to the theme's total, which is what
  caught 19 spec files here rather than 20.

## Working on these

```bash
# derive a theme, split by domain
tools/theme-ticket/derive-scenarios.sh --workarea shared/design-release-2-1 --theme journey-foundation

# push one folder's description and summary together
tools/theme-ticket/push-description.sh workareas/shared/design-release-2-1/tickets/animals-journey

# which tickets has openspec moved on from?
tools/theme-ticket/check-stale.sh --workarea shared/design-release-2-1
```

Creation goes through `tim jira create --from <folder>/ticket.json`, a dry run
until you pass `--confirm <planId>`.

### Identification and permanent address — 69 scenarios, 7 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `identification-and-permanent-address-animals/` | [EUDPA-796](https://eaflood.atlassian.net/browse/EUDPA-796) | Live animals journey | 11 | 69 | 7 |

69 scenarios in one domain and 7 files, so the per-domain totals are the
theme's. Every row changed live animals alone, so there is no sibling ticket.
The folder was `identification-and-permanent-address-stub/` until the WRITE
flow filled it in, and `tickets.json` now records `animals` in place of
`stub`.

The theme holds 13 rows; 11 are in the ticket's table. inc-049 was dropped and
inc-058 changed only the end-to-end test suite, so neither is attributed to
the domain, and `derived.json` reports the first as an `excludedRow`. inc-045
is in the table as **Not built**: it is blocked behind the templates theme,
which is parked, and nothing else in the theme depends on it.

Of the 69 scenarios, 54 are written out in the ticket. The other 15 are each a
mirror, pair or boundary twin of one that is, named in a line beneath it — a
full write-out came to 33,715 characters against Jira's 32,767 limit.

Not yet merged. Three pull requests are open on
`feat/EUDPA-796-design-release-2-1-identification-and-permanent-address`
(frontend #476, backend #126, tests #100), all green. The ticket is `In Dev`
and the MERGE flow moves it to `Deskcheck`.
