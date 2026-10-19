# How to build the split-off themes

Seven Design Release 2.1 themes are split off the main backlog. Each one builds on its own branch, with one draft pull
request per repo. Nothing merges to `main` until Sam checks the finished theme.

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

## Type question and templates: EUDPA-690

- **Ticket:** [EUDPA-690](https://eaflood.atlassian.net/browse/EUDPA-690)
- **Branch:** `feat/NO_JIRA-design-release-2-1-type-question-and-templates`. This theme was split before its ticket
  existed, and a split pointer's branch can't be changed, so the branch keeps the NO_JIRA name.
- **Rows:** 22, with 18 ready now.
- **Pull requests:**
  - [animals frontend #398](https://github.com/DEFRA/trade-imports-animals-frontend/pull/398)
  - [animals backend #106](https://github.com/DEFRA/trade-imports-animals-backend/pull/106)
  - [INS frontend #45](https://github.com/DEFRA/trade-imports-ins-frontend/pull/45)
  - [plants frontend #92](https://github.com/DEFRA/trade-imports-plants-frontend/pull/92)
  - [tests #20](https://github.com/DEFRA/trade-imports-ins-tests/pull/20)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/type-question-and-templates, branch
  lifecycle on feat/NO_JIRA-design-release-2-1-type-question-and-templates"

## Commodities and import reason: EUDPA-693

- **Ticket:** [EUDPA-693](https://eaflood.atlassian.net/browse/EUDPA-693)
- **Branch:** `feat/EUDPA-693-design-release-2-1-commodities-and-reason`, stacked on journey foundation with reference
  lists merged in.
- **Rows:** 10, with 6 ready. 4 wait until commodities come from MDM.
- **Pull requests:**
  - [animals frontend #401](https://github.com/DEFRA/trade-imports-animals-frontend/pull/401)
  - [tests #23](https://github.com/DEFRA/trade-imports-ins-tests/pull/23)
  - [performance tests #17](https://github.com/DEFRA/trade-imports-performance-tests/pull/17)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/commodities-and-reason, branch lifecycle
  on feat/EUDPA-693-design-release-2-1-commodities-and-reason"

## Arrival and transit: EUDPA-694

- **Ticket:** [EUDPA-694](https://eaflood.atlassian.net/browse/EUDPA-694)
- **Branch:** `feat/EUDPA-694-design-release-2-1-arrival-and-transit`, stacked on journey foundation with reference
  lists merged in.
- **Rows:** 5, all ready.
- **Pull requests:**
  - [animals frontend #402](https://github.com/DEFRA/trade-imports-animals-frontend/pull/402)
  - [plants frontend #95](https://github.com/DEFRA/trade-imports-plants-frontend/pull/95)
  - [tests #24](https://github.com/DEFRA/trade-imports-ins-tests/pull/24)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/arrival-and-transit, branch lifecycle on
  feat/EUDPA-694-design-release-2-1-arrival-and-transit"

## Origin page: EUDPA-695

- **Ticket:** [EUDPA-695](https://eaflood.atlassian.net/browse/EUDPA-695)
- **Branch:** `feat/EUDPA-695-design-release-2-1-origin-page`, stacked on journey foundation with reference lists
  merged in.
- **Rows:** 3, all buildable in order.
- **Pull requests:**
  - [animals frontend #403](https://github.com/DEFRA/trade-imports-animals-frontend/pull/403)
  - [plants frontend #96](https://github.com/DEFRA/trade-imports-plants-frontend/pull/96)
  - [tests #25](https://github.com/DEFRA/trade-imports-ins-tests/pull/25)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/origin-page, branch lifecycle on
  feat/EUDPA-695-design-release-2-1-origin-page"

## Overview and review: EUDPA-696

- **Ticket:** [EUDPA-696](https://eaflood.atlassian.net/browse/EUDPA-696)
- **Branch:** `feat/EUDPA-696-design-release-2-1-overview-and-review`, stacked on journey foundation with reference
  lists, commodities and import reason, arrival and transit, and origin page merged in.
- **Rows:** 22: 16 ready, 2 waiting on permanent addresses (identification and permanent address theme), 2 blocked
  and 2 dropped.
- **Pull requests:**
  - [animals frontend #404](https://github.com/DEFRA/trade-imports-animals-frontend/pull/404)
  - [animals backend #107](https://github.com/DEFRA/trade-imports-animals-backend/pull/107)
  - [INS frontend #51](https://github.com/DEFRA/trade-imports-ins-frontend/pull/51)
  - [plants frontend #98](https://github.com/DEFRA/trade-imports-plants-frontend/pull/98)
  - [tests #26](https://github.com/DEFRA/trade-imports-ins-tests/pull/26)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/overview-and-review, branch lifecycle on
  feat/EUDPA-696-design-release-2-1-overview-and-review"

## Design snagging: no ticket yet

- **Ticket:** none yet.
- **Branch:** `feat/NO_JIRA-design-release-2-1-design-snagging`, cut from `main`. It stacks on no other theme branch.
- **Rows:** 16, all ready (inc-202 to inc-217).
- **What it is:** the designers' review of the test environment against the prototype at 56371e2, 19 October
  ([`../snagging/assessment.md`](../snagging/assessment.md), rendered proof in
  [`../snagging/screens.html`](../snagging/screens.html)). It lands next, on its own in wave 2.
- **What it changes elsewhere:**
  - It ports finished work from the origin page, commodities and import reason, arrival and transit, and overview and
    review branches to `main`. Each source row has a note saying what to drop when its theme merges `main`.
  - It takes in documents inc-032, identification inc-046, inc-047 and inc-050, consignment parties inc-085 and inc-086,
    and waiting-on-design inc-190. It also carves two criteria out of transporters inc-037.
  - The rows that waited on those rows now wait on this theme.
- **Rendered proof:** each row says which screenshots to take again after it lands. Compare them with
  `../snagging/screens/prototype/`. The prototype walk is `../prototype-specs/e2e/snagging.fit.spec.js`.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/design-snagging, branch lifecycle on
  feat/NO_JIRA-design-release-2-1-design-snagging"

The stacked themes also carry their branch in repos they don't change, such as the INS frontend, stub, reference-data
and performance tests, each with a carry-only draft pull request. CI publishes a branch image only from a pull request,
and the loop refuses a repo on its branch with none. Close a carry-only pull request once the themes it carries have
merged, if its theme never changed that repo.

## What lands first

- **Templates waits on 4 rows elsewhere.** Its last 4 rows wait for rows in other workareas to be `done`:

  | Templates row | Waits for | Where that row is |
  |---|---|---|
  | inc-171 | inc-001 | journey foundation (done) |
  | inc-170 | inc-004 | journey foundation (done) |
  | inc-166 | inc-015 | commodities and import reason |
  | inc-168 | inc-028 | arrival and transit |

  Until they're done, `tim backlog next` skips those rows and the loop builds the rest.
- **Merge order:** journey foundation and reference lists first, then commodities and import reason, arrival and
  transit, and origin page, then overview and review and templates.
- **The loop never commits its own backlog writes.** When a theme lands rows another theme waits on, commit and push
  that theme's `backlog.json` on the workspace branch, then pull it on the other machine before its next launch.
- **Templates stacks on the themes its last 4 rows wait for.** Each of those rows has a `merge` field. inc-166 merges
  the commodities and import reason branch, inc-168 merges the arrival and transit branch, and inc-170 and inc-171
  merge the journey foundation branch, each before the row builds. Once they land, the templates pull requests also
  show those themes' code until those themes merge to `main`.
