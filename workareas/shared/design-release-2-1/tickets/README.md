# Theme tickets

One ticket per **domain**, not per theme. A theme is built on one branch across
every repo it touches, but its stakeholders are different per service, so the
ticket a business reader opens contains only their domain's changes.

Each folder holds `description.txt` — the Jira description field, verbatim — and
`ticket.json`, a `tim-ticket/1` manifest.

## The tickets

Five themes have their filled-in tickets. Design snagging's are `Deskcheck` (merged to main on 23 October); the rest are `In Dev`. All hang
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

### Arrival and transit — 24 scenarios, 5 files

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `arrival-and-transit-animals/` | [EUDPA-694](https://eaflood.atlassian.net/browse/EUDPA-694) | Live animals journey | 5 | 20 | 4 |
| `arrival-and-transit-plants/` | [EUDPA-703](https://eaflood.atlassian.net/browse/EUDPA-703) | High-risk plants journey | 2 | 4 | 1 |

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

Every theme's per-domain scenarios and files sum to its own totals, which is how
a dropped or double-counted file gets caught. Each new ticket *relates to* the
ticket the theme was split with.

A folder whose ticket already existed has a `ticket.created.json` but no plan id:
those were raised at theme-split time to supply the branch name, before this
skill existed, so their descriptions are updated in place rather than created.

### Not yet ticketed

Three themes are not fully drained, so their tickets would describe unfinished
work: commodities and import reason (4 rows blocked on MDM commodities), overview
and review (2 todo, 2 blocked) and type question and templates (9 rows held).
Each still has only the stub raised at split time, as does documents (EUDPA-724). The ten unsplit themes in the
main backlog have no tickets at all.

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
