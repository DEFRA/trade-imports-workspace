# How to build the split-off themes

Eight Design Release 2.1 themes are split off the main backlog. Each one builds on its own branch, with one draft pull
request per repo. Nothing merges to `main` until Sam checks the finished theme.

## Stale branches (ruled 20 October)

Five themes were built on branches that will **not** be merged. Each is now a stale branch: a quarry to take code from,
not something to finish.

| Theme | Stale branch | Rows left | Open PRs to close when the theme is played |
|---|---|---|---|
| Type question and templates (EUDPA-690) | `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | 19 | animals frontend #398, animals backend #106, INS frontend #45, plants frontend #92, tests #20 |
| Commodities and import reason (EUDPA-693) | `feat/EUDPA-693-design-release-2-1-commodities-and-reason` | 8 | animals frontend #401, tests #23, performance tests #17 |
| Arrival and transit (EUDPA-694) | `feat/EUDPA-694-design-release-2-1-arrival-and-transit` | 4 | animals frontend #402, plants frontend #95, tests #24 |
| Origin page (EUDPA-695) | `feat/EUDPA-695-design-release-2-1-origin-page` | 0: retired | animals frontend #403, plants frontend #96, tests #25 (close once design snagging lands) |
| Overview and review (EUDPA-696) | `feat/EUDPA-696-design-release-2-1-overview-and-review` | 21 | animals frontend #404, animals backend #107, INS frontend #51, plants frontend #98, tests #26 |

- **When a theme is played,** cut a fresh branch from `main` after design snagging has landed, with the same name in
  every repo it touches. Use a new name so the stale branch stays as the quarry, for example
  `feat/EUDPA-696-overview-and-review`, and point the theme's `branch` at it then.
- **Salvage, don't merge.** Every row that was `done` on a stale branch and is not fully ported by design snagging is
  back to `todo`, trimmed to what `main` still lacks. Its note starts "Salvage:" and names the commits to take.
- **Port notes are gone.** "Drop at merge", "trim at merge" and "keep main's version at merge" notes no longer apply.
  The `merge` fields on templates rows are cleared.
- **Close the old PRs** in the table above when the fresh branch opens its own. Do not close them before. Delete the
  stale branches only after salvage is done.
- `themes.json` marks each of these themes with `staleBranch`. What changed row by row is in
  [`../snagging/trim.md`](../snagging/trim.md).

Before the performance tests PR #17 is closed, check whether bbc6e24 (EUDPA-676, #21) reached `main` under another
sha: the stale branch carries it.

On the build machine, pull the workspace branch `feat/NO_JIRA-design-release-2-1` first. Then run
`tim workspace branch <theme branch>`, open Claude Code at the workspace root and say the phrase for the theme.

## The business tickets, around every theme

A theme's Jira tickets are filled in automatically from the development work by the `theme-ticket` skill — one Story
per service domain, with acceptance criteria copied from `openspec/`. Run it at three points around the loop. It needs
no approval: the ticket is the thing the business reviews, so it is kept true rather than gated.

| When | Say | What it does |
|---|---|---|
| Before starting the loop on a theme | "the build loop is starting on `<theme>`" | Moves the theme's tickets to **In Dev**. Descriptions are left alone — openspec is written row by row, so a ticket regenerated mid-build describes a half-finished theme. |
| Once the loop has drained the theme | "write the business tickets for `<theme>`" | Derives the theme's scenarios from the commits it produced, splits them by domain, updates the theme's existing ticket as one domain and creates the others. |
| After the theme merges to `main` | "`<theme>` has merged" | Regenerates against `main` so the spec links do not point at a deleted branch, then moves each ticket to **Deskcheck**. |

The loop itself makes no Jira call — `lifecycle: branch` guarantees that — so these run in the orchestrating session
around it, not inside it.

To check nothing has drifted: "which theme tickets are stale". Tickets and their sources live in
[`../tickets/`](../tickets/).

## Journey foundation: EUDPA-691

- **Ticket:** [EUDPA-691](https://eaflood.atlassian.net/browse/EUDPA-691)
- **Branch:** `feat/EUDPA-691-design-release-2-1-journey-foundation`
- **Rows:** 7, all ready.
- **Pull requests:**
  - [animals frontend #399](https://github.com/DEFRA/trade-imports-animals-frontend/pull/399)
  - [INS frontend #46](https://github.com/DEFRA/trade-imports-ins-frontend/pull/46)
  - [plants frontend #93](https://github.com/DEFRA/trade-imports-plants-frontend/pull/93)
  - [tests #21](https://github.com/DEFRA/trade-imports-ins-tests/pull/21)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/journey-foundation, branch lifecycle on
  feat/EUDPA-691-design-release-2-1-journey-foundation"

## Reference lists: EUDPA-692

- **Ticket:** [EUDPA-692](https://eaflood.atlassian.net/browse/EUDPA-692)
- **Branch:** `feat/EUDPA-692-design-release-2-1-reference-lists`
- **Rows:** 3, all ready.
- **Pull requests:**
  - [animals frontend #400](https://github.com/DEFRA/trade-imports-animals-frontend/pull/400)
  - [INS frontend #47](https://github.com/DEFRA/trade-imports-ins-frontend/pull/47)
  - [plants frontend #94](https://github.com/DEFRA/trade-imports-plants-frontend/pull/94)
  - [reference-data #25](https://github.com/DEFRA/trade-imports-reference-data/pull/25)
  - [stub #18](https://github.com/DEFRA/trade-imports-stub/pull/18)
  - [tests #22](https://github.com/DEFRA/trade-imports-ins-tests/pull/22)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/reference-lists, branch lifecycle on
  feat/EUDPA-692-design-release-2-1-reference-lists"

## Type question and templates: EUDPA-690 (stale branch)

- **Ticket:** [EUDPA-690](https://eaflood.atlassian.net/browse/EUDPA-690)
- **Stale branch:** `feat/NO_JIRA-design-release-2-1-type-question-and-templates`. Salvage from it.
- **When played:** a fresh branch from `main` after design snagging, for example
  `feat/EUDPA-690-design-release-2-1-type-question-and-templates`.
- **Rows:** 19: 13 to rebuild with salvage notes, 5 deferred, 1 dropped. Design snagging inc-218 takes deferred inc-171's
  plants opening-run Back links; inc-171 keeps the Change-link Back link.
  4 deferred rows were removed (inc-166, inc-167, inc-169, inc-170): `main` or inc-155 and inc-159 now hold them.
- **Old PRs to close when played:** animals frontend #398, animals backend #106, INS frontend #45, plants frontend #92,
  tests #20.

## Commodities and import reason: EUDPA-693 (stale branch)

- **Ticket:** [EUDPA-693](https://eaflood.atlassian.net/browse/EUDPA-693)
- **Stale branch:** `feat/EUDPA-693-design-release-2-1-commodities-and-reason`. Salvage from it.
- **When played:** a fresh branch from `main` after design snagging.
- **Rows:** 7: 3 to rebuild with salvage notes (the k6 walk, hard stops, blank saves), 4 waiting until commodities come
  from MDM. inc-011 and inc-020 were removed: design snagging inc-205 and inc-207 port them to `main`. inc-021 was
  removed and inc-015's Back links moved out: design snagging inc-218 builds them.
- **Old PRs to close when played:** animals frontend #401, tests #23, performance tests #17.

## Arrival and transit: EUDPA-694 (stale branch)

- **Ticket:** [EUDPA-694](https://eaflood.atlassian.net/browse/EUDPA-694)
- **Stale branch:** `feat/EUDPA-694-design-release-2-1-arrival-and-transit`. Salvage from it.
- **When played:** a fresh branch from `main` after design snagging.
- **Rows:** 4: 3 to rebuild with salvage notes (required means of transport, transit page title and redirect, transit
  country list), 1 dropped. inc-026 went to design snagging inc-208; inc-027 is already on `main` through reference lists.
  The transit page's Back link moved from inc-029 to design snagging inc-218.
- **Old PRs to close when played:** animals frontend #402, plants frontend #95, tests #24.

## Origin page: EUDPA-695 (retired)

- **Ticket:** [EUDPA-695](https://eaflood.atlassian.net/browse/EUDPA-695)
- **Stale branch:** `feat/EUDPA-695-design-release-2-1-origin-page`. Design snagging inc-202 and inc-203 salvage all of
  it, including tests 4f9cec8.
- **Rows:** 0. All 3 rows were removed; inc-203 now holds their criteria and requirement ids. Nothing is left to play.
- **Old PRs to close once design snagging lands:** animals frontend #403, plants frontend #96, tests #25.

## Overview and review: EUDPA-696 (stale branch)

- **Ticket:** [EUDPA-696](https://eaflood.atlassian.net/browse/EUDPA-696)
- **Stale branch:** `feat/EUDPA-696-design-release-2-1-overview-and-review`, in five repos. It also carries merges of the
  other stale branches, so take only the commits each salvage note names.
- **When played:** a fresh branch from `main` after design snagging, for example
  `feat/EUDPA-696-overview-and-review`.
- **Rows:** 21: 15 to rebuild with salvage notes, 2 never built (inc-108, which waits on permanent addresses, and the
  inc-117 tests), 2 blocked and 2 dropped. inc-114 was removed: design snagging inc-217 ports it.
- **Old PRs to close when played:** animals frontend #404, animals backend #107, INS frontend #51, plants frontend #98,
  tests #26.

## Design snagging: no ticket yet

- **Ticket:** none yet.
- **Branch:** `feat/NO_JIRA-design-release-2-1-design-snagging`, cut from `main`. It stacks on no other theme branch.
- **Rows:** 19, all ready (inc-202 to inc-220).
- **What it is:** the designers' review of the test environment against the prototype at 56371e2, 19 October
  ([`../snagging/assessment.md`](../snagging/assessment.md), rendered proof in
  [`../snagging/screens.html`](../snagging/screens.html)). It lands next, on its own in wave 2.
- **Also from a tester (20 October):** inc-218, Back during the opening run, comes from a tester's comment on the
  journey foundation ticket, EUDPA-691 ([`../snagging/eudpa-691/save-and-status.md`](../snagging/eudpa-691/save-and-status.md)).
  The amend fault from the same review ([`../snagging/eudpa-691/amend.md`](../snagging/eudpa-691/amend.md)) is a separate
  ticket, not a row here.
- **What it changes elsewhere:**
  - It salvages finished work from the stale origin page, commodities and import reason, arrival and transit, and
    overview and review branches to `main`. The source rows it ports in full were removed on 20 October, and their
    criteria and requirement ids now sit on the design snagging row that ports them.
  - It takes in documents inc-032, identification inc-046, inc-047 and inc-050, consignment parties inc-085 and inc-086,
    and waiting-on-design inc-190. It also carves two criteria out of transporters inc-037.
  - inc-218 takes in commodities and import reason inc-021 whole, and the Back links from commodities and import reason
    inc-015, arrival and transit inc-029 and type question and templates inc-171 (plants).
  - Later rows now hold only their deltas. A later row waits on a design snagging row only where it builds on code
    that row creates; the rest simply build from `main` after this theme lands.
- **Rendered proof:** each row says which screenshots to take again after it lands. Compare them with
  `../snagging/screens/prototype/`. The prototype walk is `../prototype-specs/e2e/snagging.fit.spec.js`.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/design-snagging, branch lifecycle on
  feat/NO_JIRA-design-release-2-1-design-snagging"

The stacked themes also carry their branch in repos they don't change, such as the INS frontend, stub, reference-data
and performance tests, each with a carry-only draft pull request. CI publishes a branch image only from a pull request,
and the loop refuses a repo on its branch with none. Close a carry-only pull request once the themes it carries have
merged, if its theme never changed that repo.

## What lands first

- **Order:** journey foundation and reference lists are on `main`. Design snagging lands next. Every other theme
  starts from `main` after that, on a fresh branch: commodities and import reason and arrival and transit, then
  templates and overview and review.
- **No stacking.** No theme merges another theme's branch any more. Templates' old `merge` fields (inc-166, inc-168,
  inc-170, inc-171) are gone: inc-166 and inc-170 were removed, and inc-168 and inc-171 are deferred with no
  dependency on another stale theme.
- **The loop never commits its own backlog writes.** When a theme lands rows another theme waits on, commit and push
  that theme's `backlog.json` on the workspace branch, then pull it on the other machine before its next launch.
