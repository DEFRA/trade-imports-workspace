# Trial t3-dashboard, round 2

**Request (as a plants designer):** "Make the dashboard in my working release look like this Figma frame (attached PNG): tabs for Drafts, Submitted and Amended with a count on each, a status filter on the left, and the reference number as the first column. Fill it with enough examples to look real, including one that's late."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t3-dashboard-r2` (3 commits on top of `feat/NO_JIRA-designer-prototyping`; the checkout is back on that branch and clean)

**Outcome:** partial. The tabs, counts, filters, table, examples, gallery and journey tests all work. Two problems stop it being a full success:

- The Commodity and Arrival columns are **empty on every row**, which also means the commodity and date filters match nothing. The cause is in the real service's code, so a designer cannot fix it.
- The **pre-commit hook fails on every branch that has a design release**. I had to fix a maintainer test before anything could be saved.

## Steps taken

1. I read `CLAUDE.md` and `PROTOTYPE.md`. The routing for "a dashboard like a Figma frame, filled with examples" is clear: `example-data`, then `fake-a-service`, then `show-my-change` with `--reference`. `fake-a-service` "Requests that need more than this skill" gives the same order. **Good.**
2. `designer:release -- list` showed no working release, so I followed `design-release` section B as rule 9 says: `new:set -- plants-working --from high-risk-plants ... --purpose working`, then `designer:format`, then `designer:check --full`.
3. **BLOCKER:** the full check failed at `scripts/designer/release/remount.test.js` ("Should change nothing when every release is mounted"). The test helper `scripts/designer/release/test-repo.js` copies the real `overrides.json` and the two `prototype-sets` mount files, but not the folder of any design release they name. `remount` then removes `plants-working` as "its folder is gone". Every designer's first release commit hits this. The pre-commit hook runs the same tests, so nothing can be saved without `--no-verify`, which is banned. The checker's advice was "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved." That is honest, but it is a dead end for a designer working alone.
   - My fix: `makeTestRepo` now runs `remountReleases({ repoRoot })` before its first commit. My first attempt copied every set folder instead, and that broke `list.test.js`. With the second fix, all 592 designer-script tests pass. I committed it on its own ("release tests unmount the branch's own releases").
4. I saved the release as its own commit, as section B step 8 says (150 files).
5. `example-data`: I ran `designer:examples list`, `fixtures` and `init` for `plants-working`. I added 7 examples: 2 more drafts, a late submitted one (`warePotatoesLate`), 2 more submitted, a second amended one and an amendment-cancelled one. `designer:examples check` then gave "11 of 11 examples reached their page". **Smooth.**
6. `fake-a-service`: step 3 ownership was all "Yours" and the gateway already wraps its records. Step 4's quick check passed. I then followed `references/dashboard-filters-and-tabs.md`:
   - Controller: `filtersFromQuery`, `listKnownWithFilters`, `countKnown`, `statusItems`, `tabLinks` and the error summary. The release's own `tabs.js` has drafts, submitted and amended only, because the frame has no "All" tab.
   - `notification-helper.js`: the filters are kept in the paging links.
   - Template: one GET form with status checkboxes (with counts), a late-only checkbox (with its count), commodity, arriving from and by, reference search and sort, then Apply and Clear. Server-side tab links use the GOV.UK tabs classes. A `govukTable` has Reference (a link) first, then Commodity, Arrival, Status (tags, plus a red Late tag) and Actions.
   - Copy: English and Welsh have the same keys. The Welsh says `[Welsh needed]` (19 strings). I removed the now-unused `search.button` and `sort.update`.
   - `design-gaps.md`: 6 rows.
7. `designer:check --full`: passed (3105 tests).
8. `designer:show` with `--before --mobile --reference dashboard=.cache/designer/refs/figma-dashboard.svg.png` and `--url` for each tab, filter, empty and error state. I read the pictures myself.
9. **UX bug found in the pictures:** `?status=submitted&late=yes` opened the default Drafts tab and showed "No notifications match your filters", while the tab beside it said "Submitted (1)". The reference's pattern treats the status filter and the tab as AND, and its form keeps the hidden `tab` field. So ticking "Submitted" while on Drafts leads to a dead end. My fix: with no tab in the address, open the first tab that has a matching row, and drop the hidden `tab` input from the filter form. Re-checked and re-pictured: `?late=yes` now opens Submitted (1) with the late row.
10. `designer:show --no-examples` for the empty state: "You have not started any notifications in this session", with every count at 0.
11. `npm run test:fit:journeys`: **13 passed**. That covers the high-risk-plants smoke tests, the chooser, and every `plants-working` fixture reaching confirmation. Log: `workareas/shared/designer-prototyping/logs/t3r2-fit-journeys.log`
12. Reset: the skill says no tool can press it, so I did not verify it. The examples appear on a first visit, because `designer:show` boots a fresh copy and every picture has them.
13. I committed (the pre-commit hook passed, log in `logs/t3r2-commit-dashboard.log`), switched back to the base branch and confirmed the checkout is clean.

## Evidence (gallery paths, under the prototype repo)

- Main gallery: `.cache/designer/show/plants-working/2026-09-28T02-51-00/index.html`
  - `dashboard--reference--page--desktop.png` (the frame) beside `dashboard--now--page--desktop.png`, plus `--before`
  - `_tab_submitted--now--page--desktop.png`, `_tab_amended--now--...`, `_late_yes--now--...` (filtered), `_status_submitted_late_yes--now--...`, `_commodity_nothing-like-this--now--...` (no matches), `_dateFrom-day_31_...--now--...` (error summary, "Date must be a real date")
  - `--mobile` copies of all of the above
- Empty state gallery: `.cache/designer/show/plants-working/2026-09-28T02-51-27/index.html`
- Axe: no problems found in either run.

## Success criteria

| Criterion | Result |
| --- | --- |
| Built with govukTabs, the MoJ filter layout, govukTable and tags only; no .scss or src/client change; unmatched asks are rows in design-gaps.md | **Partly, and on purpose.** No `.scss` or `src/client` change. `govukTable` and tags are used. The criterion **contradicts the skill**: `dashboard-filters-and-tabs.md` and `layout-patterns.md` both say "Never use the `govukTabs` macro in a release" (only the first panel would ever show), and say the MoJ filter styles are not loaded. I followed the skill (server-side tabs with the GOV.UK tabs classes, a filter panel built from GOV.UK parts) and logged both as design gaps. |
| Counts come from the records wrapper; late and amended examples are made by replaying pages and appear on first visit and after Reset | Counts come from `countKnown`. Late, amended and amendment-cancelled examples are made by replay (11 of 11 reached). They appear on first visit. Reset was not verified (it needs a person to press it). |
| The gallery shows the Figma frame beside the dashboard, plus filtered and empty states | Yes, but across **two** galleries. `--no-examples` cannot be combined with the examples run, and `latest/` then points at the empty-only run. |
| npm run test:fit:journeys stays green for high-risk-plants | Yes, 13 passed. |

## Friction

1. **BLOCKER: the pre-commit hook fails once any design release exists** (`remount.test.js`, via `test-repo.js`). `design-release` B.8 says "Never add `--no-verify`", and the checker says "tell the maintainer", so a designer cannot save anything. I fixed it in `scripts/designer/release/test-repo.js` on the trial branch. That fix must go onto `feat/NO_JIRA-designer-prototyping`. **Suggested fix:** land the `remountReleases` call in `makeTestRepo`, and add a canary test that creates a release and then runs the whole unit suite.
2. **MAJOR: Commodity and Arrival are empty on every dashboard row**, in the real journey too (see the `before` picture). `services/persistence/records/stub/marshal/list-item.js` (real service) reads `commodityLines[0].commoditySelection` and `arrivalDateAtPort`, but the plants pages save neither. So the Figma's two main columns are blank, and the recipe's commodity and date filters can never match. Nothing in `fake-a-service` or `example-data` warns about this. The recipe's own check ("?commodity=nothing-like-this") only proves the empty case. **Suggested fix:** fix the list marshaller in plants-frontend (a hand-off), or have the records wrapper derive commodity and arrival from the plants answers. Until then, add a "known gap" line to `dashboard-filters-and-tabs.md`.
3. **MAJOR: the filter and tab AND leads to a dead end.** Following "One form for search, sort, filters and the open tab" literally (the hidden `tab` input), ticking "Submitted" while on the Drafts tab shows "No notifications match your filters", while the Submitted tab says (1). **Suggested fix:** have the reference open the first tab with a matching row when a status is ticked (as I did), or drop status checkboxes whenever tabs are used.
4. **MAJOR: the success criterion (and a designer's natural words) ask for `govukTabs` and "the MoJ filter layout", which the skill forbids.** The skill is right, but nothing tells the designer up front. **Suggested fix:** when the request names `govukTabs` or MoJ filter, `fake-a-service` step 2 should tell the designer in one line that "real tabs need the real service's script, so these are link tabs that look the same".
5. **MAJOR: no PNG was actually attached.** The only frame was `.cache/designer/refs/figma-dashboard.svg.png`, a stand-in wireframe left by round 1 and labelled as one. `show-my-change` says "Never draw a stand-in wireframe and present it as their design". I used it and labelled every gap row "(stand-in)". The rendered PNG is also 1280x1280 from a 1280x900 SVG, and cropped on the right (the Amended tab and the Status column are cut off). **Suggested fix:** the trial harness should supply a real PNG. `designer:show` should warn when a reference's aspect ratio differs from the page's.
6. **MINOR: the design keeps the Actions column,** because Amend is a POST button that exists only on the dashboard. Dropping it, as the frame does, would strand submitted notifications. Logged as a gap. **Suggested fix:** the reference should say this, so every designer does not rediscover it.
7. **MINOR: the tag words do not match.** The filter says "Being amended" (the recipe's copy), but the row tag says "Amending" (shared copy). **Suggested fix:** the reference copy should reuse the shared status words.
8. **MINOR: `designer:format` printed "Every file was already tidy." while it did reformat `design-gaps.md`,** twice (the table columns were re-aligned). **Suggested fix:** list Markdown files it changed.
9. **MINOR: the skills disagree about committing.** `fake-a-service` step 8 says "Do not commit", but CLAUDE.md rule 9 and the harness want a commit, and `design-release` commits unasked. **Suggested fix:** the cross-skill order in `fake-a-service` should say where the save happens.
10. **MINOR: the mobile layout puts about 1,000px of filter form before the tabs and results.** This is inherent to a one-third/two-thirds grid on a phone, but the skill only warns about table width. **Suggested fix:** suggest a `govukDetails` "Filter" wrapper at phone width, or log it as a design gap.
11. **MINOR: the first commit printed hundreds of lines of coverage** because I had not redirected its output. CLAUDE.md does say to redirect, and the `design-release` B.8 example does too. That is fine: it was my slip.
12. **MINOR: the gallery is split** (see the criteria table): `--no-examples` needs its own run, and `latest/` points at the last one only.

## Time-wasters

- Diagnosing and fixing `remount.test.js`, including one wrong first fix: the largest single cost.
- Reading `query.js`, `filters.js` and `dashboard.js` to find out how tabs and status combine, and why Commodity was blank (tracked down to the real service's `list-item.js`).
- Taking a second gallery after the tab fix.
