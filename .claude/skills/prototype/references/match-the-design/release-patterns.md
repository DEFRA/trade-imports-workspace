# Release patterns and mandates: the format

A design gap is something asked for and not built. A release pattern is
something built on purpose, in the release's own `assets/`. The hand-off
carries both. `references/custom-pattern.md` says how to build one; this
file gives the shapes of the two records.

## `mandates.md`: the designer's words

`src/server/app/sets/<release>/mandates.md`. Written only by
`designer:mandate record`, never by hand, and only ever added to.

```markdown
## m-2026-10-27-1

- Date: 2026-10-27
- Words: build the commodity search as designed, we're testing it in round 3
- Scope: commodity-search
```

A scope the designer did not name reads `(agent's reading) <pages>`.

## `patterns.md`: one section per pattern

`src/server/app/sets/<release>/patterns.md`.

A custom pattern:

```markdown
## Commodity search

- Kind: Custom
- Pages: commodity-search
- Classes: app-plants-r3-commodity-search, app-plants-r3-commodity-search__results
- Files: assets/styles.scss, assets/_commodity-search.scss, assets/commodity-search.js, assets/commodity-search.test.js
- Why not GOV.UK or MoJ:
  - GOV.UK: Select with autocomplete. No results list, and no search by part of a name.
  - MoJ: Search. No results list.
- Need or hypothesis: traders find a commodity code faster by typing part of the plant name than by choosing from a list.
- Research round: Round 3 (12 Nov 2026)
- Findings: none yet
- Asked by: "build the commodity search as designed, we're testing it in round 3" (m-2026-10-27-1)
- Status: Open
```

A switch-on:

```markdown
## Tabs on the dashboard

- Kind: Switch on
- Components: govuk Tabs
- Pages: dashboard
- Files: assets/scripts.js
- Asked by: "can the dashboard tabs actually work?" (m-2026-10-27-2)
- Status: Open
```

| Field | Custom | Switch on | Rule |
| --- | --- | --- | --- |
| Kind | Required | Required | `Switch on` or `Custom` |
| Components | — | Required | Each installed component it starts, as `govuk <Name>` or `moj <Name>` |
| Pages | Required | Required | The page slugs that use it |
| Classes | Required | — | Every `app-<release>-` class and `data-module` hook it adds |
| Files | Required | Required | The `assets/` files it touches |
| Why not GOV.UK or MoJ | Required | — | A `GOV.UK:` line and an `MoJ:` line, each naming the component checked and why it did not fit |
| Need or hypothesis | Required | Optional | Ends `(proposed: confirm)` when an agent wrote it |
| Research round | Required | Optional | Its name and date, or `next round` |
| Findings | Required | Optional | A link, or `none yet` |
| Asked by | Required | Required | The designer's recorded words in quotes, then the mandate id |
| Copied from | When copied | When copied | Added by `new:set`: `<release> on <date>` |
| Status | Required | Required | `Option`, `Open` or `Closed: <how>` |

## Statuses

- **Option**: one of several designs a workflow built for the designer to
  choose. The hand-off refuses while any are left.
- **Open**: in use in the release.
- **Closed**: never deleted. `Closed: in the real service since <date>,
  <its name there>` once the weekly update brings the real one in and the
  release's copy is removed. `Closed: dropped after round 3, <one-line
  finding>` when the designer drops it.

## Copied entries

`new:set` copies `assets/`, `layout.njk`, `patterns.md` and `mandates.md`
and adds `Copied from` to each entry. A copied entry is fine for research.
Before a hand-off it needs a fresh mandate in the new release, cited in a
second `Asked by` line.

## The one-line rung report

Every pattern built, and every offer made, is reported in one line per
rung: `GOV.UK: …`, `MoJ: …`, `Custom: …`
(`references/custom-pattern.md`, "What to say back").
