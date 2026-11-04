# Re-analysis: the type question theme, 4 November 2026

The "What are you importing?" type question work is being split out of the type question and templates theme (EUDPA-690) into its own theme, `type-question`.

All its rows build on one fresh branch from main, `feat/EUDPA-690-type-question`. The build loop does not merge it at the end.

Main SHAs read: INS frontend `9492bf8`, animals frontend `2038fc3a`, plants frontend `ed29ede`, tests `ed3b378`, workspace `4fcec603`, cdp-app-config `e06c1fdf`.

## Summary

- **Five rows move to the new theme.** Two are kept as they are, two are rewritten and one is new and test-only.
- **None of the type question itself is on main.** There is no type question page, no start entry in animals or plants, and no Create new button on the INS home.
- **Some of it is already on main.** The origin page's Back link to the list and to Overview landed with the origin page fix (3 November). The plants Save and return checks landed with the save-and-return fix (26 October).
- **Most of the code can be copied from the stale branch.** The two Back-link rows have nothing to copy and are built fresh.
- **Two settings are missing in CDP, and only Sam can add them** in cdp-app-config. One already breaks the plants Address book link in CDP today. See "Config Sam must add".
- **The workspace repo must join the branch.** CI reads the stack config, the PR test scope and openspec from a workspace branch of the same name, and otherwise from main.
- **All five verifiers corrected their analysis.** None of the corrections changes a verdict. Each corrected row is the one used below.

## What changes scope

### Lost from this theme

| What | Where it goes |
|---|---|
| The Use template half of the INS home's buttons (req-962, req-1024) | Parked with templates. Create new is built on its own. |
| Origin's Back link while a saved template is being changed (part of req-013) | Parked with the template edit row (inc-159) |
| Template mode on the type question (req-010) | Parked with the start-a-template row (inc-154) |

### Gained

- **The type question row gains two criteria for links between services.** Each hand-over uses the address its environment configures, and it still works when the trader is not yet signed in to the receiving service.
- **Create new must also show when notifications cannot be loaded.** Main hides the start button in that state today. This is a reading of "on every visit", and no source names the error state.
- **Back from a review Change link now covers plants as well as animals.** This follows the templates ruling that common behaviour changes in both frontends at the same time.
- **Animals Roles and addresses changes on main.** Opened from a draft's review Change link, its Back link goes to the review today. After this theme it goes to the previous step, and only upload documents keeps its Back link to the review.
- **The origin Back row is back to todo.** It had been deferred since 12 October. You asked for borderline rows to be included.
- **A new test-only row covers the plants Save and return checks (req-2136).** The behaviour is already on main, but nothing proves it in a browser.
- **The workspace repo joins the theme**, for openspec, `config/e2e-tests-pr-scope.json` and any `docker/stack` change.

### Narrowed by the verifiers

- **Back from a Change link applies to a draft's review only.** While a notification is being amended, every page keeps its usual Back link, as the existing amend specs say.
- **The animals origin page keeps the Back link it would have without a Change link.** It is the first page, like plants' commodity type page.

## Rows

| Row | Verdict | Already on main | Still to build |
|---|---|---|---|
| inc-148 Ask "What are you importing?" before a notification is created | Keep (13 criteria: the original 11, plus 2 for links) | Nothing. The parts it builds on are there: INS base-URL config, `buildSetBaseUrl`, the animals origin page, the plants commodity type page, the Alpha banner and a sign-in that keeps the target address | The INS page at `/notification-type`. A GET start entry in animals (`/live-animals/start`) and in plants (`/high-risk-plants/start`). Hand-overs built from config. CSP form-action for the Defra ID hop. A tests/ins e2e not tagged `@compose`. Openspec. |
| inc-149 Create new on today's INS home | Keep (6 criteria) | Only the Welsh machine-draft file header. Main still shows "Start a new notification" only when the list is empty, linking to the animals list | A Create new button above the search, shown in every state including the load error. Welsh copy. An ins-backend stub that can fail, for tests. An e2e. The REQ-INS-DASH-004 spec. |
| inc-150 Origin's Back link follows where the notification started | Rewrite (7 criteria) | Back to the set's list during the opening run, and Back to Overview after it (the origin page fix, 3 Nov) | Back to the INS type question for a notification started there. The type question showing that notification's type selected. Continue with the same type returning to the same notification. A cross-service e2e. A rewritten REQ-ORIGIN-013. |
| inc-171 Back from a review Change link goes to the previous page, in animals and plants | Rewrite (4 criteria) | Save and continue returning to the review (`exitTarget`, in both frontends). The opening-run step order from design snagging. The exceptions for upload documents, address edits and amend | Change-link Back to the previous step in both frontends, on a draft's review only. Animals Roles and addresses stops going Back to the review. E2e in tests/animals and tests/plants. Openspec in both journey-flow specs. Correcting plants' stale `journey-spec.json:326` note. |
| NEW-2136 Plants commodity type: Save and return makes the same checks as Save and continue | New, test-only (3 criteria) | All the behaviour (c832979, #120), proved by unit tests and stated in the spec (SCN-004-B) | Fit and e2e proof that Save and return refuses an empty choice and an unoffered type, with the error summary and inline error showing. A spec scenario for the unoffered type, and coverage. No production code unless a test goes red. |

### What each verifier corrected

| Row | Correction |
|---|---|
| inc-148 | Two criteria cited a scout's output ("links-scout") as provenance. They now cite only your 4 November request. A note dated the germinal 404 ruling to 8 October. It is 9 October. |
| inc-149 | Provenance cited ruling p3-063, which is about arrival details. It now cites p3-081, which lets the home's controls go ahead, and p3-010. The error-state criterion stays, with a note that it is an interpretation. A note now keeps the parked Use template row's (inc-153) dependency on this row as a pointer across themes. |
| inc-150 | The three-environment criterion named config keys, compose files and test tags, which is recipe. It is now an observable end state, and the mechanics moved to notes. The criterion saying the list and Overview cases are "already met on main" is now a plain end state. |
| inc-171 | Limited to a draft's review, so amend Back links do not change. The origin page is pinned to keep its usual Back link, a case no row owned. Release names, ids and file names moved out of the title and detail and into the notes. |
| NEW-2136 | The theme was still `type-question-and-templates`, and is now `type-question`. Criterion 3 lost a clause no source supports ("the type is still chosen when you return"). Wrong citations on all three criteria were fixed. How-to notes were trimmed. |

## Salvage

The source is the stale branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates` (ruled stale on 20 October). Cherry-pick from it onto the new branch. Never rebase it.

Merge order: animals frontend, then plants frontend, then INS frontend, then tests, then the workspace.

| Row | Repo | Take | Expect |
|---|---|---|---|
| inc-148 | animals frontend | `e6f5d7cf`, the GET `/live-animals/start` entry | Text conflicts in the dashboard controller, its tests and fit spec, `add-a-set.md`, `journey-flow-and-gates.md` and `audit-targets.js` |
| inc-148 | plants frontend | `4d08998`, the GET `/high-risk-plants/start` entry | Light conflicts in the dashboard controller and tests, docs and audit targets |
| inc-148 | INS frontend | `2d7619e`: the notification-type feature (9 new files), `destinations.js`, the germinal and plants set bases, paths, `inDashboardSection` and copy | Light conflicts in config, the dashboard controller, `list.js` and docs. Decide again how to handle its CSP `DEFRA_ID_FORM_ACTION_ORIGINS` (see the links section). Its dashboard edit is replaced by inc-149. |
| inc-148 | tests | `3205feb`: the page object, the spec and the germinal set base | Replace `@integration`, which is retired, with `@animals-frontend` and `@plants-frontend`. Merge `dashboard-page.ts` by hand. |
| inc-148 | tests | `f583ca8`: only the Alpha banner locator line and one spec line | Drop both origin PNG rebaselines, which main has since redone |
| inc-148 | workspace | `7479b4ea`, applied by hand: ins/notification-type requirements 1 to 3 (lines 1-79) and their coverage, REQ-FLOW-015 with the opening-sequence wording, REQ-PLANTS-FLOW-016, and a Dashboard-current scenario | Journey-flow and origin specs have moved on main, so apply those edits again by hand |
| inc-149 | INS frontend | `fd9b1c3` whole, after `2d7619e` | Text conflict in `controller.js`, because main moved the list helpers to `shared/list-page.js` |
| inc-149 | INS frontend | From `188f55be`, by hand: only the stub failure (`stub.js`, `UNAVAILABLE_REFERENCE`) and the Create new half of the fit test | Drop its Use template assertions and the hard-coded `http://localhost:3000/live-animals/templates` |
| inc-149 | tests | `7659d8d`, after `3205feb` | Merge `dashboard-page.ts` by hand |
| inc-149 | workspace | REQ-INS-DASH-004 scenarios A to D and their coverage, from `7479b4ea` | Leave out REQ-INS-DASH-005 (Use template) and the templates wording in Purpose |
| inc-150 | none | Nothing exists on any branch | Build on main's `entry-guard.js` (`entryBackLink`), the `run-state.js` session pattern and INS `buildNotificationLink` |
| inc-171 | none | Nothing exists on any branch | Build on main's `kit.runBackLink` and RUN_STEPS from design snagging (animals `032c9ed8`, plants `f6bf287`) |
| NEW-2136 | none | The behaviour is on main as `c832979`. `d375ab8` is the same patch, so do not pick it again | New fit cases, one tests/plants e2e, and spec and coverage |

### Leave behind

- Every `-combined` branch. It holds the same type question commits and nothing more.
- All templates commits, including `28d32ac`, `def47e5`, `23f0b03`, `f806b99a`, `11b00c19`, `b9532f9` and plants `07422549`.
- Workspace `10823b38` and `016663f5` on the old programme branch. They are provenance only and superseded by `7479b4ea`.
- Animals backend's stale and combined commits, which are all templates.
- Defra ID stub `8a0f3220` (32 isolated users). Take it only if the type question e2e ever needs one user per worker.
- In `7479b4ea`: notification-templates, the Templates parts of service-navigation, and the templates-only origin edit (REQ-ORIGIN-019).

## Links across CDP, the local stack and the CI stack

### How links work

- Every link between services is an absolute URL built on the server. It joins the target service's base URL from the source service's config to the set base and the path.
- The trader's browser follows it, so the URL must be browser-facing. A relative path never works, because each service is its own origin in CDP and its own port locally.
- Server-to-server URLs (`host.docker.internal`) must never be reused for a browser link.
- **The local stack and the CI stack are the same compose files.** CI runs `run-stack.sh --branch <branch>` from the workspace checked out at the PR's branch name, or main if there is none.

| Source | Config key | Env var | CDP (dev, test, perf-test) | Local and CI stack |
|---|---|---|---|---|
| INS frontend | `tradeImportsAnimalsFrontend.baseUrl` | `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | Set | `http://localhost:3000` |
| INS frontend | `tradeImportsPlantsFrontend.baseUrl` | `TRADE_IMPORTS_PLANTS_FRONTEND_URL` | Set | `http://localhost:3003` |
| Animals frontend | `tradeImportsInsFrontend.baseUrl` | `TRADE_IMPORTS_INS_FRONTEND_URL` | Set | `http://localhost:3002` |
| Plants frontend | `tradeImportsInsFrontend.baseUrl` | `TRADE_IMPORTS_INS_FRONTEND_URL` | **Missing**: falls back to `localhost:3002` | `http://localhost:3002` |

### Links per row

| Row | Link | Direction | All three environments? |
|---|---|---|---|
| inc-148 | Type question Continue to each start entry (POST then redirect) | INS to animals, INS to plants | Yes for the URL. It fails in CDP across sign-in until the Defra ID origin is allowed (see risks). |
| inc-149 | Create new to the type question | Inside INS | Yes. No config needed. |
| inc-150 | Origin Back to the type question (GET) | Animals to INS | Yes |
| inc-150 | Type question Continue back to the same notification (POST then redirect) | INS to animals | Yes, with the same sign-in caveat as inc-148 |
| inc-171 | Change-link Back links | Inside each frontend | Yes. No config needed. |
| NEW-2136 | Save and return to the plants overview | Inside plants | Yes. No config needed. |

### Risks

- **CSP form-action blocks the sign-in hop.** The type question POST redirects to a sibling frontend. A trader with no session there is then redirected on to the Defra ID stub. Chrome checks every hop against INS's form-action, which today lists only INS itself and the animals and plants origins.
- **The stale fix for this only works locally.** `DEFRA_ID_FORM_ACTION_ORIGINS` defaults to `localhost:3007` and is set in neither compose nor cdp-app-config. Copied as it is, it passes locally and in CI and fails in CDP. The two ways to fix it are in Calls made.
- **Do not take the stub origin from the OIDC URL as it stands.** In the stacks that URL is `host.docker.internal:3007` and only works server-side. It must go through the hostname rewrite first.
- **Plants to INS is already broken in CDP.** No row in this theme adds a plants-to-INS link. Any future one would break too.
- **A compose or scope change only reaches CI through a workspace branch of the same name.**
- **PR scope can miss cross-service specs.** Plants PRs run only `tests/plants/`, with no tags. Hand-over specs in `tests/ins/` need `@animals-frontend`, plus a new `@plants-frontend` tag on the plants entry in `config/e2e-tests-pr-scope.json`.
- **A spec tagged `@compose` never runs on CDP.** Hand-over specs stay untagged and check each destination by its origin, using `new URL(requireBaseUrl('TRADE_IMPORTS_*_FRONTEND_BASE_URL')).origin`.
- **Hard-coded hosts are creeping in.** The stale tests use `http://localhost:3000/...` literals, and so does the INS test helper `journey-handshake.js`. Production code reads only config, and tests build what they expect from config.
- **Locally only, animals and plants share the yar cookie name `session` on localhost.** A spec that moves between those two in one browser can wipe one service's session. CDP is unaffected.

### Config Sam must add

Agents may not write to CDP repos. These are yours.

| Repo | File | Key and value | Why |
|---|---|---|---|
| cdp-app-config | `services/trade-imports-plants-frontend/{dev,test,perf-test}/trade-imports-plants-frontend.env` | `TRADE_IMPORTS_INS_FRONTEND_URL=https://trade-imports-ins-frontend.<env>.cdp-int.defra.cloud` | Missing today. The plants Address book link and its CSP entry already point at `localhost:3002` in CDP. |
| cdp-app-config | `services/trade-imports-ins-frontend/{dev,test,perf-test}/trade-imports-ins-frontend.env` | `DEFRA_ID_FORM_ACTION_ORIGINS=https://trade-imports-defra-id-stub.<env>.cdp-int.defra.cloud` | Only if the plan keeps the explicit setting rather than deriving it. Needed by inc-148 and inc-150 across sign-in. |

These go on the workspace branch `feat/EUDPA-690-type-question`, and an agent can make them:

- `docker/stack/frontend.compose.yml`, on the INS service: `DEFRA_ID_FORM_ACTION_ORIGINS=http://localhost:3007`, but only with the explicit setting.
- `config/e2e-tests-pr-scope.json`: add a `"tags": ["@plants-frontend"]` entry to `trade-imports-plants-frontend`.

## The templates pick-up rows

Three parked templates requirements were placed, and one row was revised. All four stay in the parked templates theme.

| Requirement or row | Placed in | Status | Why |
|---|---|---|---|
| Start a template (inc-154) | Revised in place | todo, parked | It still said Save and return skips the required checks. The 26 October ruling withdrew that, so its checks criterion and open question are rewritten. |
| Both save buttons make the same checks on template pages (req-2202) | Added to the template task list row (inc-155) | todo, parked | Its pages are the first template pages with both buttons, and Save and return lands on its task list |
| A sort on Manage templates (req-1299) | New row NEW-1299, after saving a template (inc-157) | blocked on design question 11 | One blocked row per design question, as the ruling says |
| Add a new address and Edit details from a template (req-2107) | New row NEW-2107, after inc-155, inc-159 and inc-161 | todo, parked | Cross-service work in the INS frontend that no templates row lists. It has a three-environment criterion and gate. |

Things the orchestrator must act on:

- **Fix the stale envelope rule.** Invariant 10 of the old theme says Save and return skips required checks. Both new theme envelopes must say it makes the same checks as Save and continue, or a builder will undo NEW-2136 and build the soft save back into template mode.
- **Remove the duplicate sort row.** The parent backlog's inc-162 is the same sort. Set it to dropped, or merged into NEW-1299 once that row has an inc- id.
- **NEW-2107 edits code other themes own:** address book, consignment parties and test hygiene. Either the theme's `touches` take those paths, or the row lands after those themes.
- **NEW-2107 needs INS changes.** INS's return path is hard-wired to `/notifications/{id}/address-return`, and its add page shows the Draft strip.

## Calls made

- **inc-150 and inc-171 are included as todo.** You said "if in doubt include them".
- **Everything goes on one branch and is not merged at the end.** That covers all five rows, in the animals, plants and INS frontends, tests and the workspace.
- **The workspace is added to the theme's repos** under the same branch name, for openspec, compose and PR scope.
- **The CSP Defra ID origin is left for the inc-148 plan to choose,** from two options:
  - set it explicitly in compose and in cdp-app-config (you add the CDP part);
  - derive it from `DEFRA_ID_OIDC_CONFIGURATION_URL` through the existing `defraId.signOutHostnameRewrite`, which needs no new config.

  The analyst leant towards deriving it.
- **Your standing links requirement needs one source id.** Analysts cited it three ways: `brief:sam-2026-11-04`, `user:sam-2026-11-04` and `ruling:sam-2026-11-04`. Use `ruling:sam-2026-11-04` on every row and record it as `sources/ruling-sam-2026-11-04.md`, so the id resolves.
- **inc-149 shows Create new when the list cannot load.** This is a reading of "on every visit", and no source names that state.
- **The theme dependencies are repointed.** The overall INS home row (inc-128) depended on inc-149 at the old workarea, so it now points at the new one. The Use template row (inc-153) keeps its dependency on inc-149, now across themes.
- **inc-171 takes "previous page" to mean the opening run's own Back target.** Steps whose run Back link is Overview keep Overview.
- **inc-171's Back href keeps `?change=1`,** following main's precedent. No source says whether it should.
- **inc-171 covers plants,** under the templates ruling (p1-044, p1-049, p1-050).
- **inc-171 leaves amend alone:** it applies to a draft's review only.
- **inc-150 covers all three plants types with the Plants for planting criterion.** Potatoes and Wood products use inc-148's shared plants destination.
- **Raise with Sam, not built:** a plants trader answers "What are you importing?" twice, once on INS and once on plants' commodity type page, and the labels differ. "Potatoes (seed and ware)" on INS is "Potatoes (seed or ware)" on plants. "Wood products" on INS is "Wood and cut trees" on plants.
- **The germinal option links to `/germinal-products`, which returns 404 until the set exists.** The 9 October ruling allows this.
- **NEW-2136 needs an inc- id** before the loop runs.
- **The INS add page reached from a template (NEW-2107) shows the grey Template tag and the template's name.** This is an open question carried with that default.

## Settled

- The old theme branch is stale (ruled 20 October). It is used to copy code from, never rebased.
- Both save buttons make the same checks on every page that has both (26 October ruling).
- Germinal links may land before the germinal set is built (9 October ruling).
