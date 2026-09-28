# Trial T1: a new stand-in service (saved vehicles)

Designer request: "In my working release I'd like importers to be able to save a vehicle they use a lot, with the registration, haulier and trailer type, and then just pick it on the transport page next time. The real service can't do that yet."

Host: Claude Code, in `repos/trade-imports-plants-prototype`, on branch `feat/NO_JIRA-designer-prototyping-refine-trial-T1-new-service` (made from `feat/NO_JIRA-designer-prototyping`). Nothing was pushed and no pull request was opened.

## Result against the success criteria

| Criterion | Met? | Evidence |
| --- | --- | --- |
| New service at `src/server/app/services/<name>/` with index.js, client.js, stub.js and a test; index.js picks with `isStubDataMode` | Yes | `src/server/app/services/saved-vehicles/` (from `npm run designer:service -- new saved-vehicles --owner new-api`). `const impl = () => (isStubDataMode() ? stub : client)`. 9 tests pass. |
| index.js exports `NEEDS_A_REAL_SERVICE` and `CONTRACT`; index.js and client.js import nothing prototype-only | Yes | index.js imports only `common/services/mode.js`, `lib/http-status.js`, `./client.js`, `./stub.js`. client.js imports `@defra/hapi-tracing`, `lib/http-status.js` and `persistence/records/errors.js`. Only stub.js imports `prototype-support/`. The handoff contract reader (`scripts/designer/handoff/contract.test.js`) reads the CONTRACT as data. |
| `overrides.json` gains one `ours` line; no real upstream service folder edited | Yes | Diff: `+ "src/server/app/services/saved-vehicles/**"`. No other file under `src/server/app/services/` changed. |
| Pick, add (with validation errors) and delete pages, in the working release only, English and Welsh together, GOV.UK only | Yes | `sets/plants-working/journeys/linear/features/vehicle-select/` (picker, `add/`, `delete/`). Every string is in `copy.en.js` and `copy.cy.js` with `[Welsh needed]`. Only govuk macros and `govuk-*` classes are used. Axe found no problems. |
| Designer never sees a skill name; reply ends with the check result, a before/after gallery and the hand-off line | Yes (in the reply below) | See "Reply to the designer". |

## Steps taken

1. Read `CLAUDE.md` (which includes `AGENTS.md`). In the outcomes table, "A new feature the real service lacks" lists **"save a vehicle they use a lot"** word for word, and routes to `.claude/skills/fake-a-service/SKILL.md`. I found it straight away, with no skill name given.
2. Ran `designer:release -- list`. There was no working release, only `high-risk-plants` and `sample-journey`. Following rule 9, I followed `design-release` section B: `new:set plants-working --from high-risk-plants`, then `designer:format`, `designer:check --full` (passed), and saved it as commit `a781fd8`.
3. Ran `designer:service -- list`. No existing service fits. Then `designer:service -- new saved-vehicles --owner new-api --describe "…"`.
4. Shaped the service. Records are `registration`, `haulier` and `trailerType` (5 types). The stub checks: registration missing, longer than 15 characters, or already saved by the organisation; haulier missing; unknown trailer type. It also upper-cases the registration and keeps single spaces. There are 3 made-up starter rows. I added `TRAILER_TYPES` and `REGISTRATION_MAX_LENGTH` to client.js and exported them from index.js, and filled in `CONTRACT` (fields, an example, 5 open questions). I then extended the test.
5. Found that no "transport page" exists in the real journey. I built one with change-the-journey's add-a-page recipe, read from `high-risk-plants/docs/add-a-page.md`:
   - an optional `vehicle` obligation
   - page `vehicle-select`, with its own flow section `transport` between arrival and destination
   - a hub task row "Transport" in group 2
   - a `RUN_STEPS` entry after arrival-details
   - the caption "Arrival"
   - a Transport card on check your answers, in a new `view-model/vehicle-card.js`

   I also added the add page `vehicle-select/add`, the delete page `vehicle-select/{vehicleId}/delete`, a vehicle step in the `warePotatoes` scenario of `happy-path.json`, and a `design-gaps.md` row.
6. Checks: the service test (9 passed) and `npm run lint` (clean). The first `designer:check --full` failed (see friction F1). After the fix it passed: 3390 tests. `designer:examples -- check` reached all 4 examples.
7. Show: `designer:show --pages vehicle-select,task-list,notification-view --url …/add --url …/ab12-cde/delete --errors --before --mobile`. The phone picture showed the table running off the right edge. I folded haulier and trailer type into the registration cell, re-checked and took the pictures again.
8. Saved commit `9286100` with `designer:save`, switched back to `feat/NO_JIRA-designer-prototyping`, and confirmed `status --short` is clean.

## Guidance found, and how

- `AGENTS.md` outcomes table, then `fake-a-service/SKILL.md`, then `references/fake-a-service.md` "Making a new service" (named in the skill's step 2 table: "Something no service here does yet (a saved vehicle…)"). The routing is excellent: the exact example phrase appears in three places.
- `AGENTS.md` rule 9, then `design-release/SKILL.md` section B, for the missing working release.
- `fake-a-service` step 5 says a page that collects an answer is registered with the `change-the-journey` add-a-page recipe. I got there through `change-the-journey/references/routes.md` and then `high-risk-plants/docs/add-a-page.md`.
- `.claude/rules/*.md` loaded on their own when I touched copy, templates, set and service files.

## Friction

**F1 (major): `designer:check` misdiagnosed the one real failure.**
- It reported: "A real journey page saves the wrong answers … This test only covers the real journey (high-risk-plants) … Not caused by your change: tell the maintainer."
- The actual failure was `scripts/designer/handoff/contract.test.js > Should read the CONTRACT of saved-vehicles as data`. My `CONTRACT` used `client.REGISTRATION_MAX_LENGTH` and `[...client.TRAILER_TYPES]`, and `contract.js` evaluates index.js in a VM with imports blanked out.
- A designer-facing agent that trusts the message would stop and "tell the maintainer" when the fix is theirs. I only found the cause by grepping the check log.
- The rule is stated only in the header of `scripts/designer/handoff/contract.js`: "`CONTRACT` must therefore be a plain object literal (it may name other constants declared in the same file)". `references/fake-a-service.md` "Making a new service" step 2 ("fill in `CONTRACT`") does not mention it.

**F2 (minor): "the transport page" does not exist, and no guidance covers that case.**
- The outcomes row and `fake-a-service` assume the page the designer names is already there. The real journey has no transport or vehicle page.
- Worked example 1 (transporter-select after arrival details) was the nearest pattern. I took the likelier reading (add a Transport page) and said so in one line, as "Working out what they want" step 6 allows.

**F3 (minor): The worked example stores an id reference, and says nothing about a deleted record.**
- Worked example 1 stores `{ transporterId }` and resolves it through a new `owned-parties.js`. A deleted transporter then leaves a dangling answer, which the hub still counts as Completed, because `withoutUnresolvedPartyRefs` only knows address-book references.
- The journey's own contact page stores a copy instead (`parties/index.js` explains why). I stored a copy (`{ vehicleId, registration, haulier, trailerType }`) so deleting a saved vehicle never changes a notification, and put the choice in `CONTRACT.openQuestions`.
- The reference should name this trade-off.

**F4 (minor): Commit guidance conflicts.**
- `fake-a-service` step 8 says "Do not commit"; saving happens only when the designer asks.
- The trial asked for a commit, which was fine here. But `design-release` section B commits the release by itself, so one designer request leaves the branch with one saved commit and one pile of unsaved changes. Say this plainly in the reply template ("your working release is saved; this change is not yet").

**F5 (minor): The picker guidance is heavy for a small list.**
- Worked example 1 says to copy the whole `address-book-picker` folder plus `consignor-select` and rename in 7 places.
- For saved vehicles I wrote a lean picker that reuses the release's own `address-book-picker/pagination.js` (`paginationFor(slug)`, which is generic) instead of copying the address-book-specific `render.js` and `view-model.js`.
- The reference could say that `pagination.js` is slug-generic and reusable within the release.

**F6 (minor): The optional-question error state is not explained.**
- `designer:show --errors` notes "Sending this page empty moved on to the next page, so it has no error state to show" for the picker. That is correct for an optional question, but no guidance says whether a saved-list picker should be optional or required.
- Worked example 1 says "keep the refusal". I made it optional because no regulation asks plants notifications for a vehicle, and flagged it.

**F7 (minor): Step 3's order does not fit a new service.**
- `fake-a-service` step 3 says to run `designer:where` on every path before editing, but a new service's folder cannot answer "Yours" until `designer:service new` has made it.
- The step says this in passing. In practice I ran `designer:where` after creating the service (all 5 sampled paths "Yours"), and `designer:check` reported "35 files changed: 35 yours".

**F8 (note): Reset was not pressed.**
- No tool can press the chooser's Reset button (step 6.4). This is covered by the service test ("Should delete a record until its release is reset").

## Evidence

- Commits on the trial branch: `a781fd8` (start the plants-working release), `9286100` (saved vehicles, 35 files).
- Check log: `repos/trade-imports-plants-prototype/.cache/designer/check/2026-09-28T10-43-05.log` (all passed). The misdiagnosed failure is in `2026-09-28T10-40-06.log`, lines 120–141.
- Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/2026-09-28T10-43-53/index.html` (15 pictures; hub and check your answers before and after, picker desktop and phone, add form with errors, delete check).
- Pictures I opened: picker desktop and phone (after the fold fix), add page with errors, delete page, hub before and after, check your answers after.

## Reply to the designer (as given)

Done: importers can now save a vehicle they use a lot (registration, haulier and trailer type) and pick it on a new Transport page next time.

There was no transport page in the journey yet, so I added one after arrival details. I also made your working release first ("Working release"). It is saved on its own.

Reference: a stand-in service, plus a new journey page
Pages changed: task list (new "Transport" row in group 2), new "Which vehicle is carrying the consignment?" page, new "Add a new vehicle" page, new "Are you sure you want to delete …?" page, check your answers (new Transport card)
Stand-in service: saved-vehicles. It needs a real service: a register of an organisation's saved vehicles (search, read, add and delete). Plants-frontend has none. It is logged in your release's design gaps.
Choices I made: the question is optional (no regulation asks for the vehicle). A notification keeps its own copy of the vehicle, so deleting a saved vehicle never changes a notification.
See it: http://localhost:3103/examples/plants-working/draft-midway?page=vehicle-select · check your answers: http://localhost:3103/examples/plants-working/draft-midway?page=notification-view
Gallery (before and after, with errors and phone width): .cache/designer/show/plants-working/2026-09-28T10-43-53/index.html
Checks: service test and lint passed · full check passed (3390 tests) · all 4 examples still reach their page · accessibility check found no problems · I could not press Reset myself, so try it once at http://localhost:3103/
Welsh needed: every new string on the transport, add and delete pages, plus the Transport card and task list row

If this should become part of the real service, say 'hand this to the real team' and I will prepare a brief and a patch for the plants-frontend team.
