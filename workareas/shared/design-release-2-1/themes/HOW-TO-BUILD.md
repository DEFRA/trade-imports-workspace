# How to build the split-off themes

Three Design Release 2.1 themes are split off the main backlog. Each one builds on its own branch, with one draft pull
request per repo. Nothing merges to `main` until Sam checks the finished theme.

On the build machine, pull the workspace branch `feat/NO_JIRA-design-release-2-1` first. Then open Claude Code at the
workspace root and say the phrase for the theme.

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

## What lands first

- **Templates waits on 4 rows elsewhere.** Its last 4 rows wait for rows in other workareas to be `done`:

  | Templates row | Waits for | Where that row is |
  |---|---|---|
  | inc-171 | inc-001 | journey foundation |
  | inc-170 | inc-004 | journey foundation |
  | inc-166 | inc-015 | main backlog (commodities) |
  | inc-168 | inc-028 | main backlog (arrival and transit) |

  Until they're done, `tim backlog next` skips those 4 rows and the loop builds the rest.
- **The loop never commits its own backlog writes.** When a theme lands rows another theme waits on, commit and push
  that theme's `backlog.json` on the workspace branch, then pull it on the other machine before its next launch.
- **The themes build on separate branches.** Templates won't see journey foundation's code until both are merged.
  The 4 waiting rows build on top of what their branch has.
