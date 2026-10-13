# Theme tickets

One ticket per **domain**, not per theme. A theme is built on one branch across
every repo it touches, but its stakeholders are different per service, so the
ticket a business reader opens contains only their domain's changes.

Each folder holds `description.txt` — the Jira description field, verbatim — and
`ticket.json`, a `tim-ticket/1` manifest.

## The tickets

| Folder | Jira | Domain | Rows | Scenarios | Spec files |
|---|---|---|---|---|---|
| `animals-journey/` | [EUDPA-691](https://eaflood.atlassian.net/browse/EUDPA-691) | Live animals journey | 6 | 35 | 7 |
| `plants-journey/` | [EUDPA-699](https://eaflood.atlassian.net/browse/EUDPA-699) | High-risk plants journey | 6 | 34 | 11 |
| `ins-front-door/` | [EUDPA-700](https://eaflood.atlassian.net/browse/EUDPA-700) | Import notification service front door | 1 | 5 | 1 |

35 + 34 + 5 = 74 scenarios, and 7 + 11 + 1 = 19 files: the theme's totals, so
nothing was dropped or double-counted in the split. EUDPA-699 and EUDPA-700 both
*relate to* EUDPA-691 in Jira.

`animals-journey/` has no `ticket.json` because EUDPA-691 already existed — it
was created at theme-split time to supply the branch name. Its description is
updated in place.

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
