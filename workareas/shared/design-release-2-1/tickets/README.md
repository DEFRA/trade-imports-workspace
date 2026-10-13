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

## Rules

- **Acceptance criteria come from `openspec/specs/`, never from the backlog.**
  The backlog records intent; openspec records what shipped. Where they disagree,
  openspec wins. On this theme they did disagree — the backlog said Continue on an
  incomplete amend review is held with no error, and the shipped behaviour shows
  an error summary naming what is missing.
- **A ticket carries only its own domain's scenarios and spec files.** The
  per-domain counts must sum to the theme's total, which is how a missed file gets
  caught.
- **Status tracks the situation:** `Ready for Dev` when the ticket is created,
  `In Dev` while the theme is being built, `Deskcheck` once it is merged to
  `main`. On this board the status `In Dev` is reached by a transition named
  `In Progress` — do not assume transition name equals status name.
- **Spec links point at the branch while the work is unmerged**, and are
  regenerated to `main` on merge. Leaving them on a deleted branch 404s every
  link.
- **Formatting is Jira wiki markup, not Markdown.** A single newline is a line
  break in Jira, so every paragraph must be one unwrapped line — hard wrapping at
  80 columns renders as ragged mid-sentence breaks. Scenario names are `h5.`
  headings rather than bold lines, because a line starting with `*` is one space
  away from being parsed as a list bullet. `[label|url]` links work inside table
  cells.
- **No collapsible sections.** `tools/jira/update-ticket.sh` posts wiki markup to
  `rest/api/2`, which Jira Cloud converts to its own document format. Headings,
  tables, lists, bold and links convert; macros do not. `{expand}` was tried and
  rendered as the literal string. A real collapsible section needs an Atlassian
  Document Format body posted to `rest/api/3`, which neither `update-ticket.sh`
  nor `tim` can do today.

## How these were built

1. Find the theme's row commits: `git log --grep='<theme>' -- openspec/` in the
   workspace repo gives one commit per row.
2. From each commit's diff, collect the added `SCN-*` ids and the files holding
   them. The diff selects which scenarios changed; it does not supply their text,
   because an unchanged `GIVEN` line does not appear in it.
3. Read each scenario's complete block from the **current** `spec.md`.
4. Split both the scenarios and the spec files by domain on their path prefix —
   `live-animals/`, `plants/`, `ins/`.
5. Count added scenarios per file per domain. The domain totals must sum to the
   theme total.
6. Take the row list per domain from each row's `repos` field in the theme
   backlog: `frontend` is animals, `plantsfrontend` plants, `insfrontend` the
   front door.

## Updating one

```bash
tools/jira/update-ticket.sh EUDPA-691 -d - < animals-journey/description.txt
```

Add `-s "<summary>"` to change the summary too. Creation goes through
`tim jira create --from <folder>/ticket.json`, which is a dry run until you pass
`--confirm <planId>`.
