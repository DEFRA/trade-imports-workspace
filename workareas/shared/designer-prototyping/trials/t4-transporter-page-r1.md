# Trial t4-transporter-page, round 1

**Request (as a plants designer):** "After arrival details, add a 'Transporter' page like the one in the GB prototype: search saved transporters, pick one from the list, or add a new one. Here's the old page's HTML."

**Branch:** `feat/NO_JIRA-designer-prototyping-trial-t4-transporter-page-r1` (commit `af38f48`, from `feat/NO_JIRA-designer-prototyping`). The checkout is back on `feat/NO_JIRA-designer-prototyping` and clean.

**Outcome:** it worked. The page renders, the full check and the browser walk pass, the gallery shows it, and the hand-off dry run flags the fake. The friction is real, though. Several steps only worked because I read JavaScript and ESLint output that a designer could not act on.

## Success criteria

| Criterion | Result |
| --- | --- |
| port-a-kit-page produces an inventory and a fidelity table (matched, nearest, gap); the bespoke search becomes a search form plus radios | Met, by hand (no Workflow tool). `.cache/designer/port/plants-working/transporter-select/inventory.json` and `fidelity.md` (18 rows). The live-filter JS search became a `govukInput` search box, a Search submit button and a `govukTable` with `govukRadios` per row. |
| A transporters fake with the address-book search contract backs the page; the page is registered with add-a-page in the release only | Met. It uses the existing `prototype-services/transporters`, with `search(orgId,{query,page})`. There is a new `transporter` obligation, a feature binding, dispatch, `allRoutes`, flow (arrival section), task row, caption, `RUN_STEPS`, check-answers card and `happy-path.json`. Every file is under `sets/plants-working/`. |
| The release boots with `designer:check --full` green; the walk and the gallery reach the new page | Met. The full check passed on the 3rd run (3050 tests). `--walk` took all 5 release journeys to confirmation, through the now-mandatory transporter step. The gallery has the page, its error state and check your answers. |
| `designer:handoff` lists the transporters service as "needs a real service" | Met in substance. The brief lists 3 files that use the prototype's *pretend* "transporters" and says "The real service needs a real one", plus the design-gap row that starts "Needs a real service:". The exact phrase appears only through the design-gaps row. |

## Steps I took

1. I read `CLAUDE.md` and `PROTOTYPE.md`. Routing sent me to `port-a-kit-page` ("bring over the transporter page"). That skill then sends a *list* page to `fake-a-service` and `change-the-journey`, so I read all three skills, plus `fake-a-service/references/fake-a-service.md`, `kit-to-prototype.md`, `change-the-journey/references/routes.md` and the real-service `add-a-page.md`.
2. The request said "here's the old page's HTML" but gave none. I pulled `app/views/design-release-2/transporter.html`, `transporter-add.html`, `app/data/transporters.js` and `transporter-search.js` from dc8dcc6 with `git show`. I saved the page to `.cache/designer/port/plants-working/transporter-select/source.html`.
3. There was no design release. I followed `design-release` section B and ran `new:set plants-working --from high-risk-plants --purpose working`, then `npm run format`. I skipped its separate commit (the trial asks for one commit at the end).
4. `designer:where` (port step 1) said "Outside this prototype". That was a false alarm (see F2). It said "Yours" once I gave a path relative to my cwd.
5. I confirmed the gateway wraps records with `designerRecords`. The quick `designer:check` was green before any edit.
6. I wrote `inventory.json`. The page kind is *list* (with one saved answer).
7. I built it by following fake-a-service worked example 1 almost line for line:
   - I copied `address-book-picker/` to `transporter-picker/` and swapped in the transporters fake. I added approval number, type and status to the row.
   - I copied `consignor-select/` to `transporter-select/` (id and slug `transporter-select`, field `transporter` stored as `{ transporterId }`).
   - I added a `transporter-add/` side-trip page. It validates with `validateTransporter`, saves with `addTransporter`, and redirects back with `?selected=<id>&added=1` so a success banner shows.
   - I added a new obligation `obligations/sections/transport.js` (mandatory, with a new UUID from `uuidgen`).
   - I registered it in `features/index.js`, `features/evaluation.js`, `flow.js`, `task-rows.js`, `section-captions`, `run.js` and `happy-path.json` (every scenario, after arrival-details).
   - I added a Transporter card to check your answers (controller, view-model and copy).
   - I added `design-gaps.md` with 7 rows.
8. `npm run format`, then `designer:check --full`, which failed twice (F5, F6). I fixed both, and the third run was green.
9. `designer:examples -- check plants-working`: 4 of 4 reached. `designer:check --walk`: all passed.
10. `designer:show --pages dashboard,transporter-select,notification-view --errors`. I looked at the pictures myself. `transporter-select/add` was refused (F8).
11. `designer:handoff --set plants-working --slug transporter-page --all --dry-run`: 27 files, the patch applies cleanly, and it flags "3 pretend services and 7 design gaps".
12. I wrote `fidelity.md`, committed (the pre-commit hook passed), switched back and confirmed the tree is clean.

## Screenshots (gitignored, under the prototype repo)

- `.cache/designer/show/plants-working/2026-09-28T00-57-16/transporter-select--now--page--desktop.png`: heading, guidance, search, a 7-column table with radios and tags, pagination 1/2, "Add a transporter", save actions. It looks right. The Address column wraps badly: 5–6 lines per row because Approval number takes the width.
- `.../transporter-select--now--errors--desktop.png`: the error summary "Select a transporter" and the inline error above the table.
- `.../notification-view--now--page--desktop.png`: check your answers now has a "Transporter" card (Harbourline Haulage Ltd). It says "Telephone number: Not provided" and "Email address: Not provided", because I reused the party card.
- Gallery: `.cache/designer/show/plants-working/2026-09-28T00-57-16/index.html`. Axe found no problems.
- Hand-off dry run: `.cache/designer/handoff/2026-09-28-transporter-page/brief.md`

## Friction (harsh)

**F1, major: the request's "here's the HTML" was missing, and no skill says what to do without it.** port-a-kit-page lists the page's HTML, a web address or a screenshot as inputs, but gives no step for "the designer referenced it but did not attach it". I had to know where the old repo was and which of three copies (`transporter.html`, `design-release-2/`, `testing/`) was current. A designer would paste the wrong one or stall. *Fix:* add an input option: "a GB prototype page name → `git show <ref>:app/views/<release>/<page>.html` from a known clone". Also list which old-prototype folder is current.

**F2, major: `designer:where` gives the wrong answer when run from outside the repo.** It said `src/server/app/sets/plants-working/set.js - Outside this prototype`, and port step 1 says "Carry on only if the answer starts 'Yours'", so literal adherence stops here. The cause is that it resolves paths against `INIT_CWD`. *Fix:* if the path is not found relative to cwd, try it relative to the repo root before saying "Outside".

**F3, major: three skills, each partly right, for one request.** port-a-kit-page → (list) → fake-a-service → change-the-journey → the real-service add-a-page.md (which then says to skip its tests, mapper and client JS). They also disagree:
- port-a-kit-page: "Pick the new page's slug yourself from its heading" (→ `transporter-details`) versus fake-a-service's worked example, which uses `transporter-select`.
- "One page per run" (port-a-kit-page) versus the request plus fake-a-service example 1, which needs the add page too.
- port-a-kit-page step 7 says "Do not commit"; design-release B step 8 says commit.

I followed the worked example because it matched this exact request (it even quotes it). *Fix:* make port-a-kit-page defer to fake-a-service example 1 for "list" pages, and name the slug it uses.

**F4, minor: no design release existed, and port-a-kit-page never says so.** Its default is "the working release they changed most recently". Only fake-a-service says "If the designer has no release yet, stop and offer design-release". *Fix:* the same line in port-a-kit-page.

**F5, major: the Welsh parity check forces a broken URL.** I put the guidance link's `href` in copy (the rules say "every visible string goes in copy"). The check then demanded `'[Welsh needed] https://www.gov.uk/...'`, which would break the link. I moved the URL into the controller as a constant. A designer cannot do that without touching JavaScript. *Fix:* have the parity check skip values that look like URLs, or document an `hrefs` key the check ignores.

**F6, blocker for a real designer: the lint failure hides which file and which rule.** The check printed only "A code rule was broken … Say 'fix the lint errors'". The log showed `sonarjs/cyclomatic-complexity` in `check-answers/controller.js` (my transporter lookup pushed `partiesFor` to 11) and `sonarjs/no-nested-template-literals` in my controller. Fixing these means refactoring JavaScript. *Fix:* print the file:line and rule name in the summary. Better, give the release's check-answers a ready-made "extra party" extension point, or have fake-a-service ship the check-answers card code.

**F7, major: check your answers is not covered by any skill for a new page.** add-a-page step 7 ("Add the page's fields to the matching check-answers card") is not in routes.md's skip list, so it applies. But fake-a-service example 1 never mentions it, and resolving a *fake* record in check-answers needs a controller change (the release resolves only address-book parties). I wrote about 20 lines of JS. *Fix:* add a "show the transporter on check your answers" step to example 1, with the code.

**F8, major: `designer:show` cannot photograph the add page.** It said `There is no page called "transporter-select/add"`. Side-trip pages are not journey pages, so the add form and its error state are unphotographed and unverified in a browser. I could not start the dev server and click through, because the guard rails allow no curl or browser. *Fix:* let `--pages` accept any route under the release, or add a `--url` option.

**F9, minor: the port notes are gitignored.** `inventory.json` and `fidelity.md` live in `.cache/`, which `.gitignore` excludes, so the fidelity table (a stated deliverable) is lost to reviewers unless it is pasted elsewhere. *Fix:* write `fidelity.md` beside `design-gaps.md` in the release, or have the hand-off copy it in.

**F10, minor: the Workflow tool was absent.** The skill handles this ("do the same steps yourself"), which is fine. But steps 2–6 then rely on the agent's own judgement, with no deterministic inventory helper.

**F11, minor: content is about live animals.** The ported guidance ("live vertebrate animals", "65 km", DAERA) is wrong for plants. The skill says to keep the words exactly, so I did. It is flagged here, not in copy.

**F12, minor: the hand-off wording drifts.** The brief says "pretend 'transporters'" while the skills and PROTOTYPE.md promise "needs a real service". The `--all` diff also includes the whole release creation (27 files), not just this change. The Welsh-needed list prints the Welsh file path mapped to `high-risk-plants/.../transporter-select/copy/copy.cy.js`, which does not exist there yet (it is the patch target, but reads as an error).

**F13, minor: a design-quality issue the skills do not catch.** A 7-column table with long addresses wraps badly on desktop, and phone width was not photographed (I did not pass a phone option, and the fake-a-service step 6 command has none). *Suggest:* show phone width by default for tables.

## Time-wasters

- Hunting for the "attached" HTML across three old copies (F1).
- The false "Outside this prototype" from `designer:where` (F2).
- Reading four skill and reference documents to settle the slug and the one-page rule (F3).
- Two failed full checks, about 90 seconds each, whose root causes were only in the log file (F5, F6).
- `--output=~/…` in git does not expand the tilde. Redirect instead (a tooling note, not the prototype's fault).

## What still does not work or is unverified

- The add-a-transporter page and its round trip (add → back to the picker with the new transporter ticked and the success banner) are not browser-verified (F8). Its template compiles and its routes register (the full check boots them), but nobody has clicked through it.
- The "Reset clears the fake" step (fake-a-service step 6.3) needs a person with the dev server running, so I did not do it.
