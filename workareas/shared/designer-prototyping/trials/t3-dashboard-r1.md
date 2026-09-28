# Trial t3-dashboard, round 1

**Request (as a designer):** "Make the dashboard in my working release look like this Figma frame (attached PNG): tabs for Drafts, Submitted and Amended with a count on each, a status filter on the left, and the reference number as the first column. Fill it with enough examples to look real, including one that's late."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t3-dashboard-r1` (2 commits: `d7125a1` start release, `4b442d8` dashboard + examples). Base branch left clean.

**Outcome:** partial. The dashboard is built, all checks pass and the journey browser tests pass (13 of 13). But I could not see the dashboard **filled with examples** anywhere. The gallery tool always starts with no examples, and without a browser or curl there was no way to look at the running prototype. The Figma frame was also never attached, so I drew a stand-in.

## Success criteria

| Criterion | Result |
| --- | --- |
| Built with govukTabs, MoJ filter layout, govukTable and tags only; no .scss or src/client change; unmatched asks in design-gaps.md | **Partly.** No .scss or src/client change. Uses govukTable and govukTag, and 4 rows in design-gaps.md. **I did not use the `govukTabs` macro in the end**: it does not work in this service (see F1). I used GOV.UK tabs markup (`govuk-tabs` classes) with a server link per tab. The "MoJ filter layout" is the one-third / two-thirds pattern built from GOV.UK pieces, because MoJ filter styles are not loaded. The skill says to do that, but it conflicts with how the criterion is worded. |
| Counts come from the records wrapper; late and amended examples are made by replaying pages and appear on first visit and after Reset | **Partly proved.** Counts come from `countKnown` in the wrapper. 9 examples (including `submitted-late`, `amended` and `amended-ware-potatoes`) replay the real pages: `designer:examples check` gave "9 of 9 reached". **Not proved:** that they appear on the dashboard on first visit and after Reset. No tool I was allowed to use could see it (F3, F4). |
| The gallery shows the Figma frame beside the dashboard, plus filtered and empty states | **Partly.** The frame sits beside the dashboard (stand-in wireframe, F2). The gallery **cannot** capture filtered states (`designer:show` has no query-string support, F5). The only "empty" state it shows is the one you always get, because examples are never made (F3). |
| `npm run test:fit:journeys` stays green | **Yes.** 13 passed, including the high-risk-plants smoke tests and the plants-working walk from the new dashboard's start button. |

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. Routed to `fake-a-service` (the routing table covers "add filters to the dashboard" and "add tabs with counts"), with `example-data`, `match-the-design` references and `show-my-change` as helpers.
2. `fake-a-service` step 1: `designer:release -- list` showed only high-risk-plants and sample-journey. The request says "my working release", but none exists. Followed "If the designer has no release yet, stop and offer `design-release` first".
3. `design-release` section B: `new:set -- plants-working --from high-risk-plants --purpose working`, then `format`, `designer:check --full` (green) and commit. Skipped step 7 (`--pages all` starting gallery) to save time; nobody asked for it.
4. Checked the gateway: it already wraps records with `designerRecords(SET_ID, records)`.
5. Read the old prototype commit `7da4f70` (DR2.1 dashboard). It used hand-written `govuk-tabs` markup with server-side tab links, plus a filter panel.
6. `example-data`: `designer:examples list`, then `init`, then added 5 examples (late, 2 more submitted, one more draft, one more amended). `check`: 9 of 9 reached.
7. `fake-a-service` step 3 `designer:where`: first run said "Outside this prototype" for every file (F6). Ran it again with full paths: all "Yours".
8. Followed `references/dashboard-filters-and-tabs.md`: controller changes, filter panel, copy (en plus `[Welsh needed]` cy), release `tabs.js` (drafts, submitted, amended, no "all"), design-gaps.md. First version used the `govukTabs` macro with a table in each panel.
9. `designer:check --full` failed on "Code rules" and gave no rule name (F7). Found in the log: `sonarjs/no-duplicate-string` in the scenario file that `designer:examples init` generated (F8). Fixed by using the short `fixture: 'name'` form.
10. `designer:show --pages dashboard --errors --reference dashboard=<png>`. There was no Figma PNG, so I drew an SVG wireframe and rendered it with `qlmanage` (F2). The gallery showed all counts at 0 and "You have not started any notifications" (F3). `--errors` made no picture and gave no note (F9).
11. Looked at the picture: `govukTabs` showed real-looking tabs with only the Drafts panel. Checked the code: nothing starts the Tabs script, and the govukTabs template hides every panel after the first. So Submitted and Amended can never be opened (F1). Rebuilt as server-side tabs (`?tab=`) with GOV.UK tabs classes. Only the open panel is rendered, and paging keeps the tab and filters (reference step 4).
12. Started `npm run dev` (background) and `designer:preflight -- --wait`, which answered. Tried to view the dashboard: the Chrome extension is not set up, `WebFetch` refuses localhost, and curl is banned by the trial's rules. The fake-a-service Reset check and the filtered, empty and error link checks were **not done** (F4).
13. Full check green again. `designer:show` with `--mobile` and the frame. Opened the desktop and mobile pictures. `test:fit:journeys`: 13 of 13 passed. Stopped the dev server, then committed (the pre-commit hook passed).

## Friction

- **F1 (major): wrong advice about `govukTabs`.** `layout-patterns.md` says: "`govukTabs` renders, but its script is not started in this service, so it shows a list of links and then every panel one after another". `dashboard-filters-and-tabs.md` says the same ("This is what `govukTabs` shows without its script"). That is false. The macro adds `govuk-tabs__panel--hidden` to panels 2 and up, and GOV.UK CSS hides them once the body has `govuk-frontend-supported`. The page looks like tabs, but clicking Submitted or Amended only changes the address, and those rows can never be seen. A designer trusting the doc would ship a broken dashboard, and the gallery only shows the first tab, so it would never catch it. **Fix:** rewrite both references. Recommend server-side tabs using `govuk-tabs` classes and `?tab=` links (the old DR2.1 pattern). Make the "Tab links" code sample produce this markup, and ban the `govukTabs` macro in releases.
- **F2 (major): no way to give a Figma frame.** The request says "attached PNG", but there was none. `show-my-change` assumes the designer can give a path or paste into `.cache/designer/refs/`. Pasting an image in Claude Code does not save a file there, and no step says how to turn a pasted image into a file. I drew a stand-in SVG and rendered it with `qlmanage`. `qlmanage` crops it to a square, so the frame lost its right-hand side. **Fix:** document how a pasted image becomes a file (or add a `designer:ref save` helper). Also accept SVG and PDF in `--reference`.
- **F3 (blocker for this request): gallery dashboards are always empty.** `scripts/designer/show/server.js` sets `PROTOTYPE_SEED: 'false'`, so the private copy never makes examples. `example-data` Verify says "The gallery from `designer:show` shows the new example on the dashboard (with a red 'Late' tag for a late one)". That can never be true. Every dashboard picture shows zero counts and "You have not started any notifications". A designer cannot see their filled dashboard in the gallery at all. **Fix:** seed the private copy (at least the set being shown), or sign in and trigger seeding before taking the dashboard picture.
- **F4 (major): checks are left to the human.** `fake-a-service` step 6.3 says "Ask the designer to open `http://localhost:3103/`, press Reset…". Step 6.4 says to give them links to click because "the gallery shows the dashboard without a filter". Nothing automated proves Reset, filters, the empty state or the error state. In an unattended run, or for a designer who trusts "Checks: full check passed · Reset clears the fake", this is simply unverified. **Fix:** let `designer:show` capture query-string states (for example `--pages dashboard --states "?tab=submitted,?status=amend,?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026"`) and add a `--reset` that presses Reset before capturing.
- **F5 (major): the gallery can't take a filtered page.** `--pages "dashboard?status=submitted"` gives: `There is no page called "dashboard?status=submitted"`. That blocks the "filtered and empty states" in the gallery. Same fix as F4.
- **F6 (minor): relative paths misreported.** `designer:where` with relative paths, run via `npm --prefix` from outside the repo, said "Outside this prototype: the weekly update does not cover it" for files that are the designer's own. It fails silently instead of saying "I can't find this path". `designer:show --reference` resolves against `INIT_CWD` in the same way. **Fix:** resolve against the repo root, or say that the path does not exist.
- **F7 (minor): "Code rules" failure hides the rule.** `designer:check` printed "A code rule was broken, for example an unused name…" with no file, line or rule name. I had to grep `.cache/designer/check/<date>.log`. **Fix:** print the first ESLint line (file, line, rule) in the summary.
- **F8 (major): generated file fails lint.** `designer:examples -- init <set>` writes JSON-style objects (`fixture: { file: 'happy-path', name: … }` four times). With one more example added, `sonarjs/no-duplicate-string` fails the pre-commit hook. The first thing a designer does after `init` breaks the commit. **Fix:** have `init` write the short `fixture: 'warePotatoes'` form, as `scenarios/high-risk-plants.js` does, and write it already formatted.
- **F9 (minor): `--errors` does nothing on the dashboard, silently.** fake-a-service step 6.2 says to run `designer:show … --pages dashboard,… --errors`, but no errors picture and no note came out. **Fix:** add a note ("the dashboard has no empty-form error state"), or use the `dateFrom` error query as its error state.
- **F10 (minor): the success criteria conflict with the skill.** The criteria ask for "govukTabs, the MoJ filter layout". The skill says the MoJ filter is unstyled ("Build it with GOV.UK pieces instead") and, as F1 shows, govukTabs is broken. A designer's words ("use tabs like the Figma") would push toward the broken macro.
- **F11 (minor): "one change per run" doesn't fit.** `fake-a-service` says "One change per run. If the designer asks for several, do the first". This request was one designer ask that needs 3 skills (design-release, example-data, fake-a-service) plus show-my-change. The skills never say how to chain them for "make my dashboard look like this". I did them in order and committed the release start separately, as design-release says.
- **F12 (minor): noisy output.** `npm run format` prints about 78 KB of "(unchanged)" lines, and the pre-commit hook prints the full coverage table, about 40 KB. An agent's context fills up, and a designer watching sees a wall of text. **Fix:** `prettier --log-level warn` for the format script, and a quieter coverage reporter in the hook.
- **F13 (minor): the reference's copy has loose ends.** The copy sample in `dashboard-filters-and-tabs.md` has no key for the reference-number search inside the filter form. It also leaves `search.button`, `sort.update` and the pagination words unused once search and sort move into one form. It never says whether to merge the three forms (search, sort, filter). I merged them into one GET form with a hidden `tab`.
- **F14 (minor): prettier makes design-gaps.md hard to read.** design-gaps.md says "Keep each cell on one line". Prettier then pads the table to about 230 characters a line, which is hard for a designer to edit in plain text. Cosmetic.

## Time-wasters

- Working out why every count was 0 (F3): I read the show server log and then `server.js`.
- Building a Figma stand-in (F2).
- The govukTabs detour (F1): built, looked at, diagnosed, rebuilt.
- Looking for any allowed way to view the running dashboard (Chrome extension, WebFetch, curl): none worked.

## Does the change work?

The code works as far as automated checks go. Full check green (3050 unit tests, lint, templates, pages open). Journey browser tests: 13 of 13. Examples: 9 of 9 reached. Axe found no problems on the dashboard. The pictures show the new layout: GOV.UK tabs with counts (Drafts selected), the filter panel on the left, and a reference-first table (empty only because of F3). The phone width falls back to GOV.UK's list of tab links. **Not seen by anyone:** the dashboard with examples in it, the Late tag in the table, the Submitted and Amended tabs, filtered, empty and error states, and Reset.

## Pictures

- Gallery (final): `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T00-45-16/index.html`
  - `dashboard--now--page--desktop.png`, `dashboard--now--page--mobile.png`, `dashboard--reference--page--desktop.png`
- First gallery (the broken govukTabs version): `.cache/designer/show/plants-working/2026-09-28T00-41-22/`
- Stand-in Figma frame: `.cache/designer/refs/figma-dashboard.svg` and `.svg.png` (git-ignored)
- Logs: `workareas/shared/designer-prototyping/logs/t3r1-*.log`

## Links a designer would be given (not opened: F4)

- http://localhost:3103/plants-working
- http://localhost:3103/plants-working?tab=submitted
- http://localhost:3103/plants-working?tab=amended
- http://localhost:3103/plants-working?late=yes&tab=submitted
- http://localhost:3103/plants-working?commodity=nothing-like-this (empty)
- http://localhost:3103/plants-working?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026 (error)
- http://localhost:3103/examples/plants-working/submitted-late
