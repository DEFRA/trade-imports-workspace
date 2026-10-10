# How to build the split-off themes

Six Design Release 2.1 themes are split off the main backlog. Each one builds on its own branch, with one draft pull
request per repo. Nothing merges to `main` until Sam checks the finished theme.

On the build machine, pull the workspace branch `feat/NO_JIRA-design-release-2-1` first. Then run
`tim workspace branch <theme branch>`, open Claude Code at the workspace root and say the phrase for the theme.

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

The stacked themes also carry their branch in the INS frontend, stub and reference-data, with no pull request, so the
stack runs journey foundation's and reference lists' code there too.

## What lands first

- **Templates waits on 4 rows elsewhere.** Its last 4 rows wait for rows in other workareas to be `done`:

  | Templates row | Waits for | Where that row is |
  |---|---|---|
  | inc-171 | inc-001 | journey foundation (done) |
  | inc-170 | inc-004 | journey foundation (done) |
  | inc-166 | inc-015 | commodities and import reason |
  | inc-168 | inc-028 | arrival and transit |

  Until they're done, `tim backlog next` skips those rows and the loop builds the rest.
- **Merge order:** journey foundation and reference lists first, then the three stacked themes.
- **The loop never commits its own backlog writes.** When a theme lands rows another theme waits on, commit and push
  that theme's `backlog.json` on the workspace branch, then pull it on the other machine before its next launch.
- **The themes build on separate branches.** Templates won't see journey foundation's code until both are merged.
  The 4 waiting rows build on top of what their branch has.
