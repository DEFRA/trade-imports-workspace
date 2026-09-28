# Trial T2: new service ("save the transporters they use a lot")

Designer request: "Importers keep typing in the same transporters every time. Let them save the transporters they use a lot and pick one when they fill in a notification."

Outcome: **partial**. The feature is built, checked, pictured and committed on the trial branch. Two things kept it from being a clean pass: the conventions pass's layer 2 (the code-style and review local modes) could not run as documented, and a fresh design release failed `designer:check` before any change until I fixed two tools.

## What the agent did

1. **Routing.** `prototype` SKILL.md, then ROUTING.md: the Outcomes row "A new feature the real service lacks" ("save a vehicle they use a lot") led to `fake-a-service.md`, then `fake-a-service/fake-a-service.md` worked example 1, plus `change-the-journey.md` (add-a-page) and `example-data.md`. Routed correctly.
2. **House-conventions reading list, read first.** I read plants `docs/services.md` (app-level and set-level), the INS address-book `index.js` and `client.js`, the animals `transporters/index.js` and `records.js`, `rest-api.md`, plants `validation.md`, `hapi.md` §3, the INS `add.controller.js` and `address-id-params.js`, and `add-a-page.md`, `code-style.md`, `jsdoc.md` and the GDS copy rules.
   - **Prior art named:** the contract is the existing `transporters` stand-in. It follows the INS address-book API shape: org-scoped path `/organisation/{organisationId}/transporters`, the `Trade-Imports-Organisation-Id` header, a 400 problem body read by `isValidationFailure` and `mapApiErrorsToFormErrors`, and camelCase fields. It takes its record fields (`approvalNumber`, commercial/private type, approval status) from the animals-frontend transporters register.
   - `rest-api.md` (snake_case, UPPER_SNAKE enums) conflicts with rung 2 (the real address-book API uses camelCase). Rung 2 wins, so I kept camelCase.
3. **Standing ruling, recorded as a conflict:** plants-frontend removed its transport and transporter services on purpose (behaviour `customs-no-sps-hold-or-matching`, "do not restore them without a behaviour that needs them"). I still built it in the design release, and recorded the conflict in the `design-gaps.md` row and in `contract.json` `openQuestions`.
4. **Service: reused, not scaffolded.** `designer:service -- list` showed `transporters` already exists as a prototype-owned service with `index.js`, `client.js`, `stub.js`, `contract.json`, a test and its own `ours` line. The guidance says "Use one that fits; never make a second", so I did not run `designer:service -- new`. I brought it up to house style: I removed its floating module doc block (folded into the `store` const's doc), changed "Enter the country" to "Select the country" (GDS select verb) in the stub and its test, and added two `openQuestions` (copy vs reference, and the standing ruling).
5. **Release.** There was no working release, so I made `plants-working` from high-risk-plants (design-release.md section B) and saved it as its own commit.
6. **Pages (per-page feature folders in `plants-working`):**
   - `features/transporter-select/`: `page.js`, `fields.js`, `evaluation.js`, `controller.js`, `render.js`, `view-model.js`, `template.njk` and a `copy/` pair.
     - It is an optional obligation `transporter` (new UUID).
     - The POST calls `validate(selectionRules(copy.errors.transporter), …)` from `lib/validate`, then asks the service whether the choice is still saved. That lookup is the backstop and refuses with the same copy message.
     - It commits a **copy** of the transporter (`transporterId`, name, type, approval number, address), the reference's stated default and the same shape the contact page uses.
     - A lean picker reuses the release's `address-book-picker/pagination.js` and `address-lines.js`. Approval number and type are folded into the name cell, and the country into the address, for phone width.
   - `features/transporter-add/`: `controller.js`, `fields.js`, `template.njk` and a `copy/` pair.
     - `validate(transporterRules(countryCodes, copy.errors))` runs first; the stub's 400 is the backstop, mapped through `formErrorsFor`.
     - The country is a `govukSelect` of ISO codes, from `addressCountries`/`countryCodeOf`.
     - After saving, it redirects to the picker with `?selected=<id>` ticked.
   - Registered in `features/index.js` (dispatchPages and allRoutes), `features/evaluation.js`, `flow.js` (parties section), `run.js` (`RUN_STEPS`), `task-rows.js`, `section-captions`, hub `GROUPS` and hub copy.
   - Check your answers: a `transporterCard` built from the notification's own copy, with its country label from `countries.originLabel`.
   - `{id}` routes: none were added. The picker uses the `selected` query parameter, and the add page sits under the existing `{journeyId}` page route, so no `IdParams` object was needed. (The sample-journey delete page has `transporterIdParams` with `failAction` → `notFound`, which would be the pattern if a manage/delete page is added.)
7. **Templates** extend `shared/layout.njk` and use GOV.UK macros only (`govukInput`, `govukButton`, `govukRadios`, `govukTable`, `govukPagination`, `govukInsetText`, `govukSelect`), with the error summary, crumb, section caption and save actions. Every word comes from copy.
8. **Copy:** `copy.en.js`/`copy.cy.js` are in parity, and every Welsh string carries `[Welsh needed]` (52 strings across the new features plus the new check-answers and hub keys). The copy is sentence case, errors use "Enter …"/"Select …" and "must be N characters or less", and optional fields say "(optional)".
9. **Examples by replaying pages:**
   - I added a `transporter-select` step to the release's `happy-path.json`: a starter transporter for `plantsForPlanting`, and an empty Continue for the other four scenarios. The optional page is in the opening run, so every walk visits it.
   - I ran `designer:examples -- init plants-working` and added the examples `transporter-choice` (stops on the picker) and `transporter-chosen` (ready to check). Six of six examples reached their page.
10. **Checks:**
    - Service test: 15 passed.
    - `lint`: clean, including the custom ESLint rules and depcruise.
    - `designer:check --walk`: every journey walked to the end, 3330 unit tests passed, copy checks passed, and "4 services match the house shape".
    - I ran `designer:check --full` again after each later edit; it passed each time.
11. **Conventions pass:** layer 1 is green. For layer 2, I applied the code-style and review criteria by hand (see friction). Result: **tidied to house style (1 change)**, an inaccurate `@param` block on `renderPicker`. After the pictures I also folded the country column into the address for phone width, and logged the remaining overflow as a design gap.
12. **Pictures:**
    - `designer:show --pages dashboard,task-list,transporter-select,notification-view --url "notifications/{notification}/transporter-select/add" --errors --before --mobile` (17 pictures; axe found no problems).
    - A second run with `--examples transporter-choice,transporter-chosen --mobile`.
    - I read the picker (desktop and phone), the add page's error state (5 linked errors, GDS wording), check your answers (the transporter card) and the chosen example's task list (Transporter: Completed).
    - Gallery: `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/latest/index.html`.
13. **Commits on `feat/NO_JIRA-designer-prototyping-ws-trial-T2-new-service`** (prototype):
    - `59791c8` tooling fix
    - `600318e` start the `plants-working` release
    - `917801e` the transporter change

    Nothing was pushed and no PR or Jira work was done. The prototype was switched back to `feat/NO_JIRA-designer-prototyping` with a clean status. plants-frontend was not touched (still `main`, clean). No dev server or stack was started: `designer:show` uses its own private copy on port 3203.

## Friction

| Severity | Where | Problem | Suggested fix |
| --- | --- | --- | --- |
| blocker | prototype `designer:check` | A brand-new release made by `new:set --from high-risk-plants` fails `designer:check` before any change, so the release can never be saved. (1) `copy-usage` reads `copy.<key>` in `commodities/list` and `commodities/details` against the root of the shared `commodities/copy/`; the controllers pass `bundle.list` and `bundle.details`, giving 18 false "not in its copy.en.js" errors. (2) `designer-rules/post-handler-validates` flags the real journey's action POSTs (dashboard amend and create, cancel-amend, delete-notification), which read no payload. The report then says "Not caused by your change: tell the maintainer", which leaves a designer stuck. | Fixed on the trial branch (commit 59791c8): copy-usage also resolves through the branch named after the page's folder when the copy folder is shared, and the rule only checks handlers that read `payload`; both have tests. Lift this onto a maintain/chore branch. Add a CI check that `new:set` followed by `designer:check --full` passes. |
| blocker | code-style/review local mode (conventions-pass.md layer 2) | `tools/style/prepare-style-local.sh` and `tools/review/prepare-review-local.sh` are committed as mode 100644, so `start-style.sh --local` fails with "Permission denied". Running them through `bash` was denied by the permission rules. The personas also need Task subagents, which a designer session may not have. Layer 2 cannot run as written. | `git update-index --chmod=+x` both scripts, and allow the `start-style.sh`/`start-review.sh --local` calls. Give conventions-pass.md a no-subagent path: an inline checklist the parent applies. |
| major | fake-a-service.md, ROUTING.md vs trial expectations | The request is exactly the existing `transporters` stand-in. The guidance correctly says reuse ("never make a second"), so the service scaffold (`designer:service -- new`) never runs for this wording. AGENTS.md and ownership.md say a prototype-owned folder "may be made or changed only through the service scaffold", but the scaffold has no "change" verb, which makes editing an existing service's stub or contract ambiguous. | Say explicitly that an existing prototype-owned service is edited in place through fake-a-service.md, and that the scaffold is for new services only. |
| major | fake-a-service worked example 1 vs "Store a reference or a copy?" | Worked example 1 stores `{ transporterId }` and adds `owned-parties.js` lookups. The same file then says a copy is the default for saved lists and that an id alone leaves dangling answers counted as Completed. The two contradict each other. | Make worked example 1 store the copy (as built here) and drop `owned-parties.js`, or say why the example differs. |
| major | fake-a-service worked example 1 / change-the-journey | The worked example never mentions `run.js` `RUN_STEPS`, or that every happy-path scenario then needs a step for the new page (an empty Continue when the page is optional). Without these, the `--walk` check fails for the scenario that visits the page. The failure was wrongly labelled "Not caused by your change". | Add both steps to worked example 1, and teach `check-my-change` to recognise a walk URL mismatch as a missing RUN_STEPS or happy-path step. |
| major | fake-a-service worked example 1 vs "Required or optional?" | The worked example says keep the picker's refusal of an empty Continue; "Required or optional?" says an optional page has no error state. For an optional transporter these conflict. | Pick one rule for an optional picker: blank moves on, and a bad choice is refused (as built here). |
| minor | example-data.md vs fake-a-service.md | example-data says "never edit a set's happy-path.json for an example" and "never edit the stub services' rows (`services/*/stub*`)". fake-a-service tells you to do both for stand-in services and releases. | Scope both example-data guards to high-risk-plants and real-service stubs, and point to fake-a-service for stand-in rows. |
| minor | conventions-pass.md | `tim backlog standards --files a,b` is documented with commas; tim takes a repeated `--files` flag, and the comma form is read as one path. | Fix the example in conventions-pass.md. |
| minor | sample-journey saved-transporters copy | The working example that designers are told to copy has `country: 'Enter the country'` for a select (GDS says "Select …") and no messages for its max-length rules (defaults are not copy). sample-journey is off-limits on design branches. | Fix on a maintain branch. |
| minor | designer:check GOV.UK wording notes | "Has the consignment arrived in Great Britain?" is flagged as Title Case because of the proper noun. | Allow-list proper nouns (Great Britain, EPPO …). |
| minor | house-conventions.md | It lists no `{id}` pattern for a page that only reads a query parameter (`?selected=`), and fake-a-service never says whether to validate `query` with Joi. | Say whether query params like `selected` get a Joi `query` schema too. |

## Choices made (told to the designer)

- The transporter is **optional** (no plants rule asks for it) and appears after identification numbers, in the opening run and as its own row in "Consignment parties".
- The notification keeps its **own copy** of the chosen transporter, so deleting a saved one never changes a notification.
- A single add page with a type question, not the old two-page type-first flow (offered as a follow-up), and no "manage/delete saved transporters" page (offered as a follow-up).
- Welsh is needed for every new string.
