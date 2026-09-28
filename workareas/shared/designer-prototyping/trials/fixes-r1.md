# Designer suite fixes, round 1

Branch: `feat/NO_JIRA-designer-prototyping` in `repos/trade-imports-plants-prototype`.
Nothing committed (the verify step commits). Every hook command is green on the
working tree: `npm run format:check`, `npm run lint`, `npm test` (254 files,
3101 tests passed, 8 skipped). A real `designer:show` run and a real
`designer:check --quick` were used to prove the show and check changes.

All new files sit under `ours` globs already in `overrides.json`
(`scripts/designer/**`, `src/server/prototype-checks/**`,
`.claude/skills/port-a-kit-page/**`). `package.json` (patched) gains one line in
its designer block (`designer:format`), which its `why` already covers.

## Blockers

| Trial | Finding | Fix | Proof |
| --- | --- | --- | --- |
| t1, t6, t7, t8 (and t3, t4 minor) | No working release, and no route back to the change | Chose inline creation, not a standing release: CLAUDE.md rule 9, and change-the-words, change-the-journey, fake-a-service, port-a-kit-page, match-the-design and example-data step 1 all say "no working release: design-release section B for `plants-working`, saved as its own commit, then come back". design-release B gains step 10 "Go back". design-session starts the release itself (`releaseMissing` from classify, new `start release` step). | design-session tests: `starts a release that does not exist yet`, `stops when the new release cannot be started` |
| t3 | `designer:show` ran with `PROTOTYPE_SEED=false`, so every dashboard was empty | The show server now seeds (`showServerEnv(..., { examples })`, default on; persistence still off). New `--no-examples` for an empty dashboard. | Real run on high-risk-plants: dashboard shows 12 notifications incl. the red Late tag; server.test.js |
| t4 | Code rules failure printed no file, line or rule | `translate.js` parses ESLint output into `file:line rule: message` lines (`finding.where`, printed as "Where:"); a new quick-check step "Code rules in the files you changed" runs ESLint on changed `.js` files, so it shows before the hook. check-my-change and checks-and-errors.md explain complexity rules (split into a helper). | translate.test.js `Should name the file, line and rule of every lint error`; real quick check ran the step on 70 files |
| t4 | check-answers `partiesFor` at complexity limit, no extension point for fake-backed cards | Honest route in `fake-a-service/references/fake-a-service.md` worked example 1: a new `check-answers/fake-parties.js` (ready code, a table of fake-backed parties), a one-line change to `render`, a `partyCard` in `partiesSection`. Never grows `partiesFor`. No shared extension point was added: releases are copies of the real journey, so it would have to land in plants-frontend first. | Code read against the real controller and view model |
| t5, t8 | Pathspec commits (`git commit --only` / `-- <paths>`) make the hook's git tests inherit `GIT_INDEX_FILE` and fail | New `scripts/designer/lib/git-env.js` (`gitEnv()` drops every `GIT_*` variable). Used by every designer git call (lib/git, release/git, research/git, show/base-tree, new-set/release-record) and every test helper that spawns git. Research `on` now stages, refuses other staged files, and commits with no pathspec (`commitStaged`). design-session's save step stages per group and commits with no pathspec. share-my-change, hand-off and CLAUDE.md say never to commit with paths. | switch.test.js: `Should still save when run inside a git hook that set GIT_INDEX_FILE`, `Should refuse ... when another file is already staged`; design-session test `saves each commit from the staged files, never with a path list` |
| t6 | `designer:show` pictures a page once, from the first example | New `--each-example`: each page once per example that reaches it (`<page>@<example>`, titled "(example: …)"); every example finishes when the hub or check your answers is wanted. | targets.test.js (3 new cases); real run pictured arrival-details for all 5 fixtures |

## Majors

| Trial | Finding | Fix |
| --- | --- | --- |
| all | `designer:where` read relative paths from `INIT_CWD` ("Outside this prototype") | `toRepoPath` falls back to the repo root when the path lands outside the repo, or names nothing from cwd but exists from the root. Proven with `npm --prefix` from the workspace root; 3 new where tests. |
| t1 | Mixed words + layout request | CLAUDE.md "Requests that fit two skills"; change-the-words "Requests with a layout part"; match-the-design step 3 "already done: no such element", never delete look-alikes (numbered headings). |
| t1 | Explicit "open a pull request" still asked again | CLAUDE.md rule 8 and share-my-change guard rail + step 6: an explicit request in the designer's message is the yes. |
| t2 | Frozen release editable; check said "everything passed" | New `src/server/prototype-checks/frozen-releases.js` + test (runs in `npm test`, so the pre-commit hook refuses): no file in a frozen set may differ from the commit that froze it. The ownership step now FAILS on it, and reports the freeze itself as "You froze X" (freeze not yet saved = HEAD not frozen = not a violation). New translate signature `frozen-release`. |
| t2 | `carry` refused a release on another branch | `carry --commit` reads the source release (`set.js`, `release.json`) from the commit when it is not on disk; without `--commit` the refusal says how. Test `Should carry a saved change from a release that is only on another branch`. |
| t2 | Two branches that each start a release always clash in 3 shared files | New `npm run designer:release -- remount`: takes this branch's side of each clashing file (stage 2, else HEAD), then mounts, describes and marks as ours every release folder on disk, and removes releases whose folder is gone. Test merges two real branches with a real conflict. design-release section G. |
| t2 | Freeze then carry | design-release C step 2: carry in before freezing. The frozen-target refusal now names the working copy made from it ("carry --to plants-dr2-1"). |
| t3 | govukTabs docs were wrong (panels 2+ hidden, cannot open) | Both references rewritten: never use the macro; server-side tab links with `govuk-tabs` classes, only the open panel rendered, no `data-module`/`role`, filters kept in the tab links. Plus one merged GET form (search, sort, filters, hidden `tab`). |
| t3, t4, t5 | Gallery cannot picture filtered/tab/empty/error states, side pages, the chooser or example links | New show options: `--url <address>` (repeatable; `?query` = dashboard, `{notification}` = the filled-in notification, `/…` = whole prototype), `--pages chooser`, `--examples <slugs>`, `--pages changed,<names>`. `--errors` works on `--url` pages (never on the chooser or example links, whose forms reset data). fake-a-service step 6 and the dashboard reference use them instead of asking the designer to click. Real run pictured chooser, example link and a `{notification}` address. |
| t3, t5, t8 | `designer:examples init` wrote the long fixture form (lint failure at the 5th example) | `init` writes the short `fixture: 'name'` form (when unambiguous) as Prettier-clean JS. Test proves Prettier leaves it unchanged and the seed grammar accepts it. The quick check now lints changed files, so example-data's quick check catches it too. |
| t3 | No way to turn a pasted Figma image into a file | show-my-change and match-the-design say honestly: a pasted image cannot be saved by the agent; ask for the exported path (drag into terminal), `ls -t ~/Downloads`, copy to `.cache/designer/refs/`. SVG accepted (PNG/JPEG/GIF/WebP/SVG); PDF not. Never draw a stand-in. |
| t4 | No input route for a named GB prototype page | New `port-a-kit-page/references/find-the-old-page.md`: find the clone, `design-release-2.1/` is current (checked against the old repo's git log), partials/data, `git show HEAD:` for saved versions. |
| t4 | Slug / one-page / commit conflicts between port, fake-a-service and change-the-journey | List pages defer to fake-a-service worked example 1, whose names win (`transporter-select`, `transporter-select/add`); one port = page + add page + CYA card; only design-release saves unasked. |
| t4 | Welsh parity forced `[Welsh needed] https://…` | copy-shape allows a link address to be identical (value is only an address, or key ends `Href`/`Url`). Two new tests; rules/copy.md and checks-and-errors.md. |
| t4 | fake-a-service example 1 never covered check your answers | Added "Show the transporter on check your answers" with ready code and the fixture step. |
| t4 | Side-trip pages cannot be photographed | `--url "notifications/{notification}/transporter-select/add"`. |
| t5 | research on could never commit | Blocker fix above. |
| t5 | No list of fixtures and what they cover | New `designer:examples -- fixtures <set>`: each fixture's use case, pages in order, and "Where they differ" (pages only some visit; questions that differ, grouped). research-session and example-data propose tasks from it. |
| t5 | Chooser tag and task links not checkable | research-session Verify uses `--pages <start pages>,chooser --examples <task ids> --errors`; the CLI now prints per-page notes ("Note on X: Sending this page empty moved on…"). |
| t6 | change-the-journey had no route without a release | Rule 9 / step 1.3. |
| t6 | No check of the Yes→No purge | Honest: no automatic probe was added. add-a-branch "What no check proves" says what to verify in code (`applyTo` gate, `scopedRows`) and asks the designer for one browser try via `?page=` links; `--each-example` shows CYA per branch. |
| t6 | No Yes-branch example link | add-a-branch step 7 adds the Yes example in the same run (any scenario can be an example; `init` if needed). |
| t6 | Move was a no-op with no way to show the order | New `npm run designer:release -- orders <release> <pages>`: first pass, Continue sections and task list, with the named pages marked and their positions; check your answers named (it is code). move-a-page step 0 and change-the-journey step 2b use it. |
| t7 | Undo of unsaved changes leaves no history | share-my-change Undo states saved vs unsaved and the difference; change skills suggest "save my work" before sharing; `--before-commit HEAD~1` for pictures after an undo. |
| t7 | Hand-off of a change that does not exist wrote an empty brief and exited 0 | `buildHandoff` throws a plain HandoffError when nothing is in scope (exit 1); hand-off skill step 4 checks the change exists and offers to make it first. e2e test added. |
| t7 | Already-true parts of a request | change-the-journey step 2b and CLAUDE.md: picture/orders first, do only what does not hold. routes.md notes the confirmation panel already exists. |
| t8 | design-session: quick check had no lint | Quick check now includes the code-rules step (so `CHECK_LEVEL` stays quick for example-data). |
| t8 | design-session refused non-main/non-design branches; README missed staging, put-away and grouping | Prepare stays on any non-`handoff/*` branch; README manual steps now include keep-aside staging, put-away (stash new files, restore the rest), grouping by shared files, and the no-pathspec commit. |

## Minors fixed

- `--pages changed` pictured all pages after a copy change: `designer:words -- find` now prints, per release, the exact `designer:show --pages <pages> --before` command for the pages the words are on (`showPages`); change-the-words step 8 uses it with `--before`; design-release D and check-my-change say the same.
- Page name aliases: ids (`consignor-select`), file names and `check-answers` already resolved; documented. find now prints the `--pages` names.
- "6 pages" example corrected to 4 (consignor, identification numbers, task list, check your answers) in commit-message.md, share-my-change and change-the-words; length cap relaxed to "aim for" with how to shorten.
- Output floods: new `npm run designer:format` (Prettier `--write --list-different`, prints only changed files); every skill, workflow and next-step message uses it. Commits go to `.cache/designer/commit.log`. `--walk` documented as including `--full` (never both).
- `designer:examples links` explains `?page=<page>`; the example route now honours `?page=task-list|<address>` (validated, stays inside the notification). 4 new route tests.
- "AWAITING THE COPY PASS" comment: change-the-words and rules/copy.md now update comments that quote changed words; step 5 adds a content-sense note when a renamed group no longer fits its rows.
- Frozen `release.json` now gets `purpose: 'frozen'`; `--describe` on freeze documented; dates on the chooser use Europe/London (test for 23:28 UTC → next UK day).
- Freeze's own `release.json` shows as "You froze X" not as a problem.
- Carry refusal names the existing working copy.
- `designer:where`/`--reference` paths: fixed by the root fallback (reference already tried root).
- `--errors` on the dashboard: documented that it has no POST form; its error state is a `--url` with an invalid date.
- CLI prints each page's notes.
- Hand-off: pinned-test hits de-duplicated by file and line (longest text kept); "Old Welsh" table per page; "needs a real service" wording, with the fake's own `needsARealService` sentence; screenshots for flow/caption changes (any page not claimed by a feature); `--since <commit>` scope; Welsh file lines labelled "(once the patch is applied)"; `--why` only in the designer's words.
- port-a-kit-page fidelity table written into the release (`docs/fidelity-<slug>.md`), not `.cache/`.
- Phone width: fake-a-service and port-a-kit-page show commands add `--mobile` for tables.
- run-the-prototype: re-run preflight right before asking to kill (nodemon changes the pid); advice when a watcher respawns; pictures never need 3103.
- "1 piece of text still need Welsh" → "needs".
- Routing: group renames belong to change-the-words (task-list recipe and routes.md agree); confirmation panel belongs to change-the-journey (CLAUDE.md, both skill descriptions).
- research-session: post-round changes go to a working release, not the research release; relax-a-save-rule defines "get past page X" as every required rule on it.
- UUIDs: `uuidgen`, one per call, written lower case.
- "What you will see" in add-a-branch: "at the end of the page".
- design-release vs change skills on saving: stated once, consistently (starting/freezing/retiring a release is the one save made unasked).

## Not fixed, and why

- **Standing `plants-working` release** was not shipped: it would add ~150 files and a fourth mount line to every branch and still clash. Inline creation (rule 9) gives the same result on first use.
- **Coverage table in the pre-commit hook** is left alone: `test` and `git:pre-commit-hook` are upstream's scripts in a patched file, and changing them would clash every week. Skills send commit output to a log instead.
- **`--walk` reusing a green `--full`** by tree hash was not built; skills now run `--walk` alone.
- **Gallery file names** stay the page address (`notification-view`); every alias resolves in `--pages`.
- **Automatic Yes→No purge probe** and **pressing Reset** are not automated; both are stated honestly with the best manual route.
- **PDF references** are not supported; skills ask for a PNG export.
- **t1 success criterion** (caption on place of destination) was a trial-script error, not a suite defect.
