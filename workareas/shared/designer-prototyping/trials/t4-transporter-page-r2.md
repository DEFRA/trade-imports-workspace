# Trial t4-transporter-page, round 2

**Request (as a high-risk plants designer):** "After arrival details, add a 'Transporter' page like the one in the GB prototype: search saved transporters, pick one from the list, or add a new one. Here's the old page's HTML." (No HTML was actually attached.)

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t4-transporter-page-r2` (off `feat/NO_JIRA-designer-prototyping`), 3 commits:

- `7a9c3e1` Start design release plants-working from high-risk-plants
- `d99aca6` maintainer fix: release tests failed once any design release exists (see blocker F1)
- `879c6c1` the transporter page, add page, check-your-answers card, fidelity table, design gaps

**Outcome:** the change works. `designer:check --walk` passed (every journey walked to the end through `transporter-select`), `designer:check --full` passed, the gallery shows the page, its add form, its error states and the check your answers card, and the `designer:handoff` dry run lists the transporters service as "needs a real service" 3 times. A real designer would have been **fully blocked** at the first save, though, until I patched a maintainer test (F1).

## Success criteria

| Criterion | Result |
| --- | --- |
| port-a-kit-page gives an inventory and a fidelity table (matched / nearest / gap); the bespoke autocomplete becomes a search form plus radios | Met. Inventory: `.cache/designer/port/plants-working/transporter-select/inventory.json`. Fidelity table: `src/server/app/sets/plants-working/docs/fidelity-transporter-select.md` (22 rows). The live-filter `app-transporter-search` became a `govukInput` with a Search submit and `govukRadios` in a `govukTable`. |
| A transporters fake with the address-book search contract backs the page; page registered with add-a-page, in the release only | Met. Reuses the existing `prototype-services/transporters` fake (no new fake needed). The new obligation, page, flow, run step, task row and caption are all under `sets/plants-working/`. |
| The release boots with designer:check --full green, and the walk and gallery reach the new page | Met **only after the maintainer fix**. Before it, `--full` failed and `--walk` would not run. |
| designer:handoff lists the transporters service as "needs a real service" | Met (dry run, `.cache/designer/handoff/2026-09-28-transporter-select/brief.md`, "What cannot ship as it is"). |

## Steps taken

1. Read `CLAUDE.md` and `PROTOTYPE.md`. The routing table ("An old Prototype Kit list page … `port-a-kit-page`, which follows `fake-a-service`'s worked example 1") pointed clearly at the right skill. Good.
2. `port-a-kit-page` SKILL.md: there was no working release, so I followed `design-release` section B: `new:set plants-working`, `designer:format`, `designer:check --full`. **The check failed** on `scripts/designer/release/remount.test.js` (F1).
3. Tried to save the release as section B step 8 says. The pre-commit hook failed with the same test. Carried on with the change uncommitted.
4. "Here's the old page's HTML" came with nothing attached, so I followed `references/find-the-old-page.md`. `ls ../GB-notification-service/app/views` does not work from where the agent runs; `find ~ -maxdepth 5 …` found `~/git/defra/defra-design/GB-notification-service` after about 50 KB of macOS "Operation not permitted" noise (F4). `git log` showed `design-release-2.1` is current. I read `transporter.html`, `transporter-add.html`, `app/data/transporter-types.js` and the `routes.js` handlers.
5. Saved the source to `.cache/designer/port/plants-working/transporter-select/source.html` with the Write tool, because the reference says so. That meant retyping a 180-line page by hand (F5).
6. There is no Workflow tool in this session, so I ran steps 1 to 6 by hand. Step 1: `designer:where` said "Yours" for the release, the fake and the gateway.
7. Step 2: wrote `inventory.json` (kind: **list**).
8. Step 3, a list page, so I followed `fake-a-service` worked example 1, which sends you to `change-the-journey` add-a-page first. I read `change-the-journey/SKILL.md`, `routes.md`, the real-service `add-a-page.md`, `page-id-places.md`, then built:
   - obligation `transporter` (new UUID from `uuidgen`) in `obligations/sections/arrival.js`, plus the barrel
   - copied `address-book-picker/` to `transporter-picker/` and swapped the address book for the fake (3 lines, as the example says)
   - copied `consignor-select/` to `transporter-select/`, renamed everything, added Approval number, Type and Status columns and an "Add a transporter" button
   - new `transporter-add/` (GET form, POST validate, redirect back with `?selected=`)
   - registered in `features/index.js`, `features/evaluation.js`, `flow.js` (arrival section), `run.js` (after arrival-details), `task-rows.js` (arrival row), `section-captions`
   - `check-answers/fake-parties.js`, the controller's `parties` line, the Transporter card and its copy, exactly as the example gives them
   - a `transporter-select` step in all 5 scenarios of `happy-path.json`
9. `designer:format`, `designer:examples -- check plants-working` (4 of 4 reached).
10. `designer:check --walk`: failed again on the same maintainer test; the walk was "Not run". I diagnosed it (F1), fixed `scripts/designer/release/test-repo.js` (my first attempt broke `list.test.js`; the second passed all 37 release tests), and re-ran: **everything passed, walk included**.
11. Committed the release on its own (as section B requires), then the maintainer fix on its own.
12. Step 5: `designer:show --pages transporter-select,notification-view --url "notifications/{notification}/transporter-select/add" --errors --mobile --before`. I looked at the desktop, the add-form errors, the phone-width picker and check your answers.
13. Step 6: wrote the fidelity table, created `design-gaps.md` with 6 rows (fake service, live search, view details, phone-width table, missing success banner, one-step add form).
14. `designer:handoff --dry-run --since 7a9c3e1`, then `designer:format`, `designer:check --full` (green), and committed the change.

## Screenshots

Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T03-10-02/index.html`

- `transporter-select--now--page--desktop.png`: the page, with its guidance, search, Add button, 5 of 7 transporters, pagination and save actions. Looks right.
- `transporter-select--now--page--mobile.png`: **the 7-column table runs off the right-hand edge** at phone width, so the page scrolls sideways. Logged as a gap, not fixed.
- `notifications-_notification_-transporter-select-add--now--errors--desktop.png`: the add form with every error. It works, but the summary order (name, type, …) does not match the page order (type, name, …).
- `notification-view--now--page--desktop.png`: a Transporter card under "3. Consignment parties", with a Change link.
- Accessibility (axe): no problems found.

## Friction

### Blockers

**F1. Every new design release fails the pre-commit hook and the walk.** `design-release` section B step 8 says: "The pre-commit checks run; read the end of the log. Never add `--no-verify`." But `scripts/designer/release/remount.test.js > Should change nothing when every release is mounted` fails as soon as any release exists. Cause: `test-repo.js` copies the checkout's `prototype-sets/index.js`, `descriptions.js` and `overrides.json`, which mount `plants-working`, but copies only the high-risk-plants and sample-journey folders. `remount` then reports plants-working "unmounted: its folder is gone". `designer:check` correctly says "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved." A designer can do nothing more: they cannot save the release, cannot save their change, and `--walk` does not run. Round 1's "act on designer trial" commit clearly never started a release with the hooks on. **Fix (applied on the trial branch, `d99aca6`):** `makeTestRepo` calls `remountReleases({ repoRoot })` before its first commit. Port it to `feat/NO_JIRA-designer-prototyping`, and add a test that makes a release in the real checkout's shape before the suite runs.

### Major

**F2. The hand-off patch applies cleanly but would not start in plants-frontend.** It leaves out `transporter-picker/render.js`, `transporter-add/controller.js` and `check-answers/fake-parties.js` ("uses a service that only exists in the prototype"), yet it keeps the files that import them (`transporter-select/controller.js`, `check-answers/controller.js`, `features/index.js`). "The patch applies cleanly" is true, but the server would crash on start with missing modules. **Fix:** when a file is left out, also leave out (or flag) every file that imports it, and say "this patch will not start without a real transporter service" in the summary line.

**F3. The hand-off's Welsh list keeps bits of code.** Lines such as `"Private transporter' },"` and `"Enter a name or organisation name' },"` come from strings nested in objects. **Fix:** parse the copy module rather than splitting its lines.

**F4. `find-the-old-page.md` route 1 is noisy and fragile.** `ls ../GB-notification-service/app/views` is relative to wherever the agent's shell is, which here is not the prototype folder. `find ~ -maxdepth 5 …` printed 52 KB of `bfs: error: … Operation not permitted` on macOS and nearly hid the one hit. A clone at 6 levels deep (the harness's `workareas/designer-prototyping/GB-notification-service`) would not be found at all. **Fix:** add `2>/dev/null`, or better, give `designer:port` (or a new `designer:find-kit-page`) that knows the usual places and a `KIT_PROTOTYPE_DIR` setting.

**F5. "Copy the page's HTML … with the Write tool."** For a 180-line page that means an agent retyping it token by token (I shortened it, so the saved `source.html` is not exact). **Fix:** a one-command copy (`git -C <clone> show HEAD:<path>` into the cache through a designer script), since `git show --output=` needs the folder to exist first.

**F6. The worked example does not mention the template's hard-coded names.** Step 3 says "change `CONSIGNOR` to the new field name", but the copied `template.njk` hard-codes `name: "consignor"` on the radios and `id="consignor-error"`. Miss them and the picker posts the wrong field and never saves. **Fix:** list them in step 3, or make the template use `fieldName`.

**F7. The phone-width table is not handled.** Step 5 says "Open the new screenshots and look at them, including the phone width one: a wide table wraps badly." It does worse: it overflows. The worked example's own step 4 ("To show the approval number or the type, add them to the copied view-model.js row and template") makes that more likely. The skills say to log it, but give no GOV.UK-only fix. **Fix:** say "at most 4 columns; fold address, approval number and type into one cell with `govuk-body-s` lines", or point at a ready pattern in `nearest-equivalent.md`.

### Minor

**F8. `designer:format` says "Every file was already tidy." while it changes files.** It rewrote `transporter-select/copy/copy.en.js` on the first run, and `design-gaps.md` and `fidelity-transporter-select.md` on the second.

**F9. Skills give bare `npm run …` and `git …` commands** where the agent's shell is not in the repo. Every one had to become `npm --prefix … run` or `git -C …`. CLAUDE.md's commit-log advice (`> .cache/designer/commit.log`) is also cwd-relative.

**F10. The worked example leaves design choices open:**
- it puts the Transporter card in "Consignment parties" while the page sits in "Arrival and destination"
- the card shows "Telephone number: Not provided" and "Email address: Not provided" (partyCard rows), but not the approval number or type the page collects
- `validateTransporter` makes the fake's add form one step, while the GB prototype asks the type first
- the old page let you continue without choosing; the picker makes it required

None of this is wrong, but the skill should tell the designer about these differences, not leave them to be found.

**F11. `come-back-to-where-i-was.md` says walk the side trip "in the running prototype"**, but `designer:show` "walks the example journey forwards only", and no tool drives the add, then back with the new one ticked, round trip. I did not verify it end to end. Reset of the fake likewise needs a person (the skill admits this).

**F12. port-a-kit-page step 5 has no `--before`,** unlike every other skill. The before picture of the add form is a 404 page, which the gallery shows without comment.

**F13. The words were ported as they are,** including live-animal guidance ("transporting any live vertebrate animals…", an animal-welfare link) on a plants page. The skill rightly says to keep the designer's words, but should prompt a one-line "this guidance is about animals; do you want plants wording?" in the report.

**F14. `.claude/rules` in the workspace (not the prototype) say every feature needs `copy.test.js`,** which conflicts with the release's "no tests" rule. The prototype's own checks did not complain, so this only confuses an agent that loads both.

## Time-wasters

- Diagnosing F1 and a first wrong fix (copying every set folder broke `list.test.js`): about 3 full test runs.
- The 52 KB `find` output (F4).
- Retyping the source HTML (F5).
- One blocked `git commit --output` attempt: I misremembered the flag, since the skill's redirect is cwd-relative (F9).
