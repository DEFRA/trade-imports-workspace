# Plan: refusals and redirects in check answers, cancel amend and delete notification are logged

| Repo | Path | Branch | HEAD |
|---|---|---|---|
| plantsfrontend | `repos/trade-imports-plants-frontend` | `chore/NO_JIRA-code-quality-factory` | `b4927d2` |

Set: `sets/high-risk-plants`. Spec namespace: `plants/` (no spec writes; see section 8).
This row is not routed through frontend-change: it adds no field, page, section or collection and changes no obligation or journey flow. It adds logging only.

## 0. Decisions

1. **The notification reference and the journey id are one value, carried under the existing `journeyId` key.** The criteria ask for both ids. In this repo they are the same id: the records adapter maps the backend's `referenceNumber` straight onto `journeyId` (`services/persistence/records/real/marshal/document.js:8`), and the stub uses the reference as the journey id too. `docs/best-practices/node/pino-logging.md:156` asks a line to "Carry the ids support searches by. At least one of these, whichever the code has", and its table lists `referenceNumber` and `journeyId` as options, not as a pair every line must carry. The code has `journeyId`, so each new line carries `journeyId`, as the declaration refusal (`declaration/controller.js:56-66`) and the stale-action redirect in `shared/kit.js:244-262` already do, and as the Logging section of `docs/architecture.md:195-205` requires of every line. This follows the guide; it is not a departure. Rejected: a second `referenceNumber` key holding the same value, which gives one concept two names (`.claude/rules/code-quality.md`, Names). The fact that `journeyId` is the notification reference is added to `docs/architecture.md` so support knows to search a reference there (section 12).
2. **Level is `info` for every new line.** Each one is an expected refusal, redirect or state switch, not a failure anyone must act on (`docs/best-practices/node/pino-logging.md` §4a "Pick the level by who must act"). The first criterion asks for info explicitly; the others follow the same reasoning.
3. **Check answers' refused Continue logs even though it re-renders at 400.** `docs/architecture.md:201-202` exempts a validation 400 that re-renders the page from logging. That exemption is about a form's own field validation. Check answers' refusal is a refusal to let the trader proceed past review, the same rule the declaration's review refusal already logs; the criterion asks for it, and the house rule says every refusal logs. The architecture doc is updated to draw that line (section 12). Rejected: converting the refusal to a redirect so it fits the existing doc, which changes what the trader sees.
4. **Each controller gets one owner for its refusal or redirect, following `refuseDeclaration`** (`declaration/controller.js:56-66`): one function that logs once and returns the response, with a frozen set of named reasons beside it in the style of `DECLARATION_REFUSAL` (`declaration/controller.js:51-54`), so support can search each reason by name. GET and POST in cancel amend and in delete call the same owner, so one rule has one log line.
5. **Check answers distinguishes its refusal causes.** The POST refuses Continue for two conditions (`check-answers/controller.js:136-139`): the review found errors, or the journey's scope is not yet ready for check your answers. The line carries a reason naming which held, and the field keys that are outstanding (question and party ids, never answer values), so support can see what blocked the trader without logging a body. Rejected: one undifferentiated "incomplete" reason, which hides which of the two rules refused.
6. **The other outcome-changing branches in these three handlers log too.** The house rule on logging (`.claude/rules/code-quality.md`, Logging and errors) requires each such branch to log once, and bounded tidy-up covers the files this row edits:
   - check answers: the POST on a submitted notification that redirects back to the read-only page (`check-answers/controller.js:132-134`);
   - cancel amend and delete: the redirect to the dashboard when the session does not hold the journey (`cancel-amend/controller.js:51-53, 61-63`; `delete-notification/controller.js:46-48, 54-56`), through the one guard in `kit.js` (decision 7);
   - cancel amend and delete: the successful state switch (amendment cancelled and submitted version restored; notification soft-deleted). These are state switches, which the house rule names. The fourth criterion keeps a normal render silent; it says nothing of a state switch, so a successful POST that switches state still logs once.
7. **The session-holds-this-journey guard gets one owner in `shared/kit.js`.** It is today mirrored line for line in two controllers (`owns` at `cancel-amend/controller.js:34` and `delete-notification/controller.js:30`, each with the same comment). Adding its log line in both would make two owners for one rule. The guard and its logged dashboard redirect move into `kit.js`, beside `redirectOnStaleAction` (`kit.js:244-262`), which is already the shared home for a logged redirect; both controllers call it. `kit.js` already imports from `engine/` and from `./paths.js` (`dashboardPath`), and `.dependency-cruiser.cjs` allows `shared/kit.js` to depend on `engine/`. **It meets `docs/architecture.md:154`** ("A helper belongs in `kit.js` only when every journey page could use it and it names no feature, set or page"): every journey page route carries the `journeyId` path parameter the guard reads, the dashboard it redirects to is the shared `dashboardPath()` every set has, and the guard names no feature, set or page; it reads only the session's known journeys and the request's `journeyId`. That two pages use it today does not limit who could. Rejected: a new module (widens the footprint), or logging in each controller (two owners). The controllers' rationale comments are deleted and the rationale moves to `docs/architecture.md` (section 12), whose list of what `kit.js` holds gains the guard.
8. **Positional boolean flags in the edited controllers become named options** (house rule "No positional boolean flags"), since each file is edited for the row's own behaviour and each flag is internal to its file, so no other file changes:
   - `render(h, journey, true)` in cancel amend (`:36`, called `:71`) and delete (`:32`, called `:64`): the recoverable-error flag becomes a named option, as `declaration/controller.js:30-36` already does;
   - `hidesAnswerErrors(status, continueRefused)` (`check-answers/controller.js:73`) and `shownReviewErrors(current, continueRefused)` (`:76`, called `:89`): `continueRefused` becomes a named option in each, matching the options object `render` at `:81-86` already takes.
9. **The session-adopting test toolkit is promoted to `engine/test-support.js`.** Both test files define the identical toolkit with the identical comment (`cancel-amend/controller.test.js:38-46`, `delete-notification/controller.test.js:33-41`), and this row adds log assertions to the tests that use it. Promoting deletes both copies and their comments.
10. **`driveHandler` reports the request's log entries.** Check answers' tests drive the POST through `driveHandler` (`engine/test-support.js:122-155`), which builds a `recordingLogger` request but returns no handle on it. It gains the recorded entries in its result, so tests assert logging through the shared helper rather than re-building the request locally.
11. **No integration proof in the tests repo.** No user or other system sees a log line, and the pages, statuses and redirects are unchanged. The gate's `trade-imports-ins-tests` `e2e` rung (whose `forRepos` includes `trade-imports-plants-frontend`) proves the journeys still behave as before. The new behaviour is proved at the handler, where the log is observable.
12. **The two "transition returned nothing" fallbacks are removed as unreachable, not logged.** `cancel-amend/controller.js:77-79` and `delete-notification/controller.js:70-72` redirect to the dashboard when the transition's result is empty. Neither records adapter ever returns an empty result: the real `cancelAmend` and `softDelete` (`services/persistence/records/real/lifecycle/transition.js:37-53`) return a marshalled record or throw through `postTransition`, and the stub ones (`services/persistence/records/stub/lifecycle/transition.js:36-70`) return a cloned marshalled record or throw. The engine transitions return nothing only from their own `isKnownJourney` guard (`engine/journey.js:166-168`, `187-189`), and the `kit.js` guard (decision 7) runs the same check before the handler reads anything; the handler's `state.get` only ever adds the journey to the session, so the engine's guard cannot then fail. A throw already becomes the recoverable 500 through `kit.recoverableSave`. Each POST therefore ends with the success redirect alone, built so that it no longer depends on the transition's result being present. Rejected: keeping the branches with a log and a test (the test would configure the records port to return a value no adapter produces, an invented state, and the house rule says build only what the change makes reachable); keeping them unlogged (an outcome-changing branch with no log).
13. **The already-deleted test is retitled, not given a no-transition assertion.** `delete-notification/controller.test.js:86` is titled as proving that no second transition ran, but asserts only the two redirects. Whether a transition ran is not observable through outputs: the stub's `softDelete` on an already-deleted record leaves it exactly as it was, and a spy on the records port would be a spy assertion on a module the code owns. The title states what its assertions prove: GET and POST on an already-deleted notification redirect to the dashboard and, after this change, record the not-deletable entry (test 10).
14. **Provenance:** the row's single source is the code-quality report's open issues for this repo. No ids are carried into code.

## 1. Moves

None. No file moves or is deleted.

## 2. Edits

All paths are under `repos/trade-imports-plants-frontend/src/server/app/` unless written otherwise.

### `sets/high-risk-plants/journeys/linear/features/check-answers/controller.js`

- POST refusal (`:135-143`): route both refusal conditions through one owner in this file that logs once at info and returns the existing 400 re-render unchanged. The line carries `journeyId`, the named reason for which condition held (decision 5), and the outstanding field keys from the errors already computed at `:135`. Exemplar: `refuseDeclaration` and `DECLARATION_REFUSAL` in `declaration/controller.js:51-66`.
- POST on a submitted notification (`:132-134`): the redirect back to the read-only page logs once with `journeyId` and a reason naming that the notification is already submitted. It goes through the same owner as the refusal, as its own reason in the same reason set; one owner for this controller's refusals.
- `hidesAnswerErrors` (`:73-74`) and `shownReviewErrors` (`:76-79`): the positional `continueRefused` boolean in each becomes a named option, and the call at `:89` passes it by name (decision 8). Their behaviour is unchanged.
- GET (`:125-128`) and the successful Continue (`:144`) stay silent.
- The positional `readOnly` passed to `buildSections` (`:111`) is a breach too, but its fix changes `view-model/index.js`'s exported signature, a file this row does not otherwise edit; it is a follow-up (section 7).

### `sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.js`

- Delete the comment at `:31-33` and the local `owns` at `:34`; both handlers call the shared guard in `kit.js` (decision 7), which logs its own refusal. The `isKnownJourney` import goes with it.
- Non-amend redirect (`:55-57`, `:65-67`): one owner in this file logs once with `journeyId`, the journey's current status, a named reason (not being amended) and where it redirects (read-only page for submitted, dashboard otherwise), and returns the redirect `nonAmendTarget` gives today. GET and POST both call it.
- Successful cancel (`:77-79`): the fallback to the dashboard is removed (decision 12); the POST always ends with the redirect to the read-only page with the cancelled banner, and logs once with `journeyId` that the amendment was cancelled and the submitted version restored.
- `render` (`:36`): the recoverable-error flag becomes a named option (decision 8); `:71` passes it by name.
- The GET render of the confirmation page (`:55-56`) stays silent.

### `sets/high-risk-plants/journeys/linear/features/delete-notification/controller.js`

- Delete the comment at `:27-29` and the local `owns` at `:30`; both handlers call the shared guard in `kit.js`. The `isKnownJourney` import goes with it.
- Not-deletable redirect (`:50`, `:58-60`): one owner in this file logs once with `journeyId`, the journey's current status and a named reason (status does not allow deletion), and returns the dashboard redirect. GET and POST both call it.
- Successful soft delete (`:70-72`): the fallback to the plain dashboard is removed (decision 12); the POST always ends with the redirect to the dashboard with the deleted banner, and logs once with `journeyId` that the notification was deleted.
- `render` (`:32`): recoverable-error flag becomes a named option; `:64` passes it by name.
- The GET render (`:50`) stays silent.

### `shared/kit.js`

- Becomes the one owner of the rule that a journey-scoped action proceeds only for a journey the session holds (decision 7), beside `redirectOnStaleAction` (`:244-262`). It checks the session through `isKnownJourney` (`engine/journey.js:135-136`) and, when the session does not hold the journey, logs once at info with `journeyId` and a named reason and returns the dashboard redirect; otherwise the handler continues. Its shape (a check the handler calls, or a wrapper round the handler as `redirectOnStaleAction` is) is the implementor's call; either way GET and POST in both controllers go through it, before the handler's first read. It names no feature, set or page. It is exported, so the doc-comment rules for an exported API in section 16's standards apply to it, as they do to the other exports in this file.

### `engine/test-support.js`

- Becomes the home of the session-adopting test toolkit both test files define today (`cancel-amend/controller.test.js:38-46`, `delete-notification/controller.test.js:33-41`), promoted by decision 9. Its behaviour is unchanged by the move. As an export it falls under the same doc-comment rules as `stubH` and `recordingH` beside it.
- `driveHandler` (`:119-155`) returns the request's recorded log entries alongside what it returns today (decision 10). Its doc comment at `:119-121` states the new part of the contract.

### `sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.test.js`

- Delete the local session-adopting toolkit and its comment (`:38-46`); import the promoted one.
- In the not-held test (`:140-166`), delete the comments at `:156` and `:160`. What they say is carried by the assertions themselves, or by names the implementor gives the values asserted on; no comment replaces them.
- Add the log assertions and new tests in section 4.

### `sets/high-risk-plants/journeys/linear/features/delete-notification/controller.test.js`

- Delete the local session-adopting toolkit and its comment (`:33-41`); import the promoted one.
- The already-deleted test (`:86-96`): its title states only what its assertions prove, the dashboard redirects and the not-deletable log entry it gains in test 10, and no longer claims that no transition ran (decision 13).
- Add the log assertions in section 4.

### `sets/high-risk-plants/journeys/linear/features/check-answers/controller.test.js`

- Add the log assertions in section 4, reading entries from `driveHandler`'s result.

### `docs/architecture.md` and the four recipes

- See section 12.

## 3. New files

None.

## 4. Tests

Every log assertion compares the request's whole recorded entries array exactly, in the way `declaration/controller.test.js:132-142` does, which proves both that the branch logs once and that it logs nothing else. Silence is proved as an exact empty array alongside the positive assertion of what the page did. No test configures the records port to return a value neither adapter produces.

Check answers (`check-answers/controller.test.js`):

1. Refused Continue on an incomplete notification records exactly one info entry carrying `journeyId`, the reason for outstanding review errors and the outstanding keys, and still responds 400. Extend the existing test at `:238-253`. Red when the log call in the new refusal owner (section 2) is removed.
2. Refused Continue for an invalid destination copy (`:148`) or bad origin (`:209`) records the same reason with the party or origin key named. Extend one of these; red as in 1.
3. A Continue refused only because the scope is not ready for check your answers records the not-ready reason. Red when that reason is removed from the owner. If the implementor finds no reachable seed where errors are empty but scope is not ready, this condition stays logged but untested, and section 15 applies: the implementor records that in the PR rather than inventing a state.
4. A forged Continue on a submitted notification records exactly one info entry with `journeyId` and the already-submitted reason, and still redirects to the read-only page. Extend `:255-272`. Red when the log in the submitted branch is removed.
5. Opening check answers (GET) and a successful Continue each record an empty entries array, alongside their existing positive assertions (render context; redirect to the declaration). Extend `:84` (render) and `:225-236` (continue). Red if any log is added to those paths, and confirms the fourth criterion.

The named-option change to `hidesAnswerErrors` and `shownReviewErrors` changes no behaviour; the existing tests on submitted, amend and refused-amend rendering keep passing unchanged and are the proof.

Cancel amend (`cancel-amend/controller.test.js`):

6. GET and POST on a draft and on a submitted notification each record exactly one info entry with `journeyId`, the status and the not-being-amended reason, and redirect as today. Extend `:121-138`. Red when the log in the non-amend owner is removed.
7. Both handlers, for a journey the session does not hold, record exactly one info entry with `journeyId` and the not-held reason, and redirect to the dashboard; the session still holds no journey and the amendment is unchanged, as today. Extend `:140-166` (with its comments removed, section 2) and `:168-175`. Red when the log in the `kit.js` guard is removed.
8. A successful cancel records exactly one info entry with `journeyId` for the restored submission, alongside the existing redirect and restored-record assertions. Extend `:105-119`. Red when the success log is removed.
9. Rendering the confirmation page records an empty entries array. Extend `:88-103`.

Delete notification (`delete-notification/controller.test.js`):

10. GET and POST on an already-deleted notification each record exactly one info entry with `journeyId`, the deleted status and the not-deletable reason, and redirect to the dashboard. Extend `:86-96`, whose title is restated by decision 13. Red when the log in the not-deletable owner is removed.
11. Both handlers for a journey the session does not hold record the not-held entry. Extend `:98-116`. Red when the `kit.js` guard's log is removed.
12. A successful delete records exactly one info entry with `journeyId`. Extend `:72-84`. Red when the success log is removed.
13. Rendering the confirmation records an empty entries array. Extend `:58-70`.

The removed fallbacks (decision 12) get no test: no adapter reaches them. The existing success tests (`cancel-amend :105-119`, `delete-notification :72-84`) keep asserting the exact success redirects that the POSTs now always end with.

The 500 recoverable-save tests (`cancel-amend :177-200`, `delete-notification :118-138`) keep passing unchanged with the named-option `render`. That 500 re-render goes through `kit.recoverableSave`, not `catchAll`, and logs nothing today; it is outside this row's criteria and is a follow-up (section 7).

Integration proof: none in the tests repo, by decision 11. The gate's `trade-imports-ins-tests` `e2e` rung exercises the unchanged pages and redirects through the real stack.

## 5. Invariants to prove

| Criterion | Check | Expected |
|---|---|---|
| 1 and 4 (check answers) | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/controller.test.js` | passes, including tests 1-5 |
| 2 and 4 (cancel amend) | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.test.js` | passes, including tests 6-9 |
| 3 and 4 (delete) | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/controller.test.js` | passes, including tests 10-13 |
| One owner for the session guard | `grep -rn "isKnownJourney(request, request.params.journeyId)" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets` | no output (exit 1): neither controller holds its own copy |
| Local test-toolkit copies gone | `grep -rln "stubH's no-op state" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app` | no output (exit 1) |
| Controller rationale comments gone | `grep -rln "state.get adopts any journey id" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app` | no output (exit 1) |
| Programme invariant (Welsh beside English) | `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend diff --name-only b4927d2 -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/copy src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/copy` | no output: the change adds no copy, so no Welsh draft is owed |

No check needs the workspace stack.

## 6. Increment-specific checks

None. The gate's lint rung includes `lint:arch` (dependency-cruiser), which proves the `kit.js` import of `engine/journey.js` stays within the layer rules.

## 7. Out of scope

- Logging in other features' handlers (declaration, amend, copy, party edit and the rest). Only the three features this row names, plus the shared guard they now call.
- `check-answers/refusal.js` and its callers' behaviour. The declaration's own refusal logging stays as it is.
- Any change to what the trader sees: titles, copy, status codes, redirect targets and query strings stay exactly as they are.
- `engine/journey.js`: its `cancelAmendJourney` and `softDeleteJourney` keep their own `isKnownJourney` checks.
- `check-answers/view-model/index.js`: `buildSections`' positional `readOnly` is a follow-up.

Follow-ups:

- `check-answers/view-model/index.js` `buildSections` takes a positional `readOnly` boolean and its doc comment at `:285-286` describes its callers; make `readOnly` a named option and reduce the doc comment to the contract.
- `check-answers/refusal.js:21-22` doc comment describes its callers; delete it or reduce it to the contract, moving the rationale to `docs/`.
- Audit every other plants POST handler for outcome-changing branches that do not log (declaration submit success, amend start, copy, party edit, collection add and remove) and log each once at its owner.
- The recoverable-save 500 re-render in `kit.recoverableSave` (`shared/kit.js:230-242`) swallows the caught error with no log; log it once with `{ err }` and `journeyId` at the one owner.
- `engine/journey.js` repeats the `isKnownJourney` guard in `amendJourney`, `cancelAmendJourney`, `copyJourney` and `softDeleteJourney`; consider one owner there, and whether those transitions' empty-result returns are still reachable.
- Workspace `docs/best-practices/node/testing/frontend.md:100-114`: the handler test-support table must name the promoted session-adopting toolkit and that `driveHandler` also returns the request's log entries, and its claim at `:102` that both frontends' `engine/test-support.js` have the same exports must hold, by mirroring the two additions in `trade-imports-animals-frontend` or by stating the difference.
- `shared/kit.js` `redirectOnStaleAction` is missing from `docs/architecture.md`'s list of what `kit.js` holds (`:145-152`); add it beside `pageRoutes()`.

## 8. Spec sync

None — log lines are diagnostic output read by support, not behaviour the Behaviour Spec records. `openspec/config.yaml` records what a user, an operator or another system sees through the service: page titles, questions, controls, wording, page order, dashboard, lifecycle, event and API behaviour. No plants capability states a log line (`grep -rlni -e log.line -e logged -e logs.once ~/git/defra/trade-imports-workspace/openspec/specs/plants` finds none), and this row changes no page, status code, redirect or wording: the removed fallbacks were unreachable, so no state a user can reach is redirected differently. No prefix is written.

## 9. Homes

- Named reason sets for each controller: in that controller file, in the style of `DECLARATION_REFUSAL` at `declaration/controller.js:51-54`.
- Each controller's refusal/redirect owner: in that controller file, following `refuseDeclaration` at `declaration/controller.js:56-66`.
- Session-holds-journey guard with its log: `shared/kit.js`, beside `redirectOnStaleAction` at `:244-262`, reading the session through `isKnownJourney` at `engine/journey.js:135-136`. It meets `docs/architecture.md:154` as decision 7 states. The comments at `cancel-amend/controller.js:31-33` and `delete-notification/controller.js:27-29` are rationale for the guard, which the house rules place in docs; they are deleted and the fact moves to `docs/architecture.md` (section 12).
- `render`'s recoverable-error option: the existing options-object pattern at `declaration/controller.js:30-36`.
- `hidesAnswerErrors`' and `shownReviewErrors`' `continueRefused` option: the options object `render` already takes at `check-answers/controller.js:81-86`.
- The promoted session-adopting toolkit: `engine/test-support.js`, beside `stubH` at `:47-58` and `recordingH` at `:91-105`.
- Log entries in the driven-handler result: `driveHandler` at `engine/test-support.js:122-155`, read from the `recordingLogger` that `journeyRequest` already attaches at `:78`.
- Logging goes through `request.logger`, the one mechanism `docs/architecture.md:195-205` names. No second logger.

## 10. Rule owners

| Rule | Owner |
|---|---|
| Check answers refuses Continue and logs why | one function in `check-answers/controller.js`, called from the POST at `:135-143` |
| Check answers sends a submitted notification's Continue back to the read-only page, logged | the same owner, as its own reason in the same reason set, in `check-answers/controller.js` |
| Which states hide answer errors on check answers | unchanged: `hidesAnswerErrors` at `check-answers/controller.js:73-74`, now taking a named option |
| Cancel amend redirects a journey that is not being amended, logged | one function in `cancel-amend/controller.js`, wrapping `nonAmendTarget` (`:26-29`), called by GET and POST |
| Cancel amend switches the amendment back to the submitted version, logged | the POST in `cancel-amend/controller.js`, at its success redirect |
| Delete redirects a journey whose status does not allow deletion, logged | one function in `delete-notification/controller.js`, using `deletable` (`:22-25`), called by GET and POST |
| Delete soft-deletes the notification, logged | the POST in `delete-notification/controller.js`, at its success redirect |
| A journey-scoped action refuses a journey the session does not hold, logged | the new guard in `shared/kit.js` |
| Which statuses allow deletion | unchanged: `deletable` at `delete-notification/controller.js:22-25` |

There is no twin repo for this row: the animals frontend is a separate codebase and the row builds plants only.

## 11. Test support

- `engine/test-support.js` gains the promoted session-adopting toolkit. Promoting it deletes the local copies at `cancel-amend/controller.test.js:38-46` and `delete-notification/controller.test.js:33-41`, with their comments.
- `driveHandler` in `engine/test-support.js` gains the request's recorded log entries in its result, used by the check answers tests.
- `recordingLogger` and `journeyRequest` (`engine/test-support.js:60-89`) already give every request a logger whose `entries` the tests read; no further change.
- No test needs records-port set-up beyond what exists: the fallback tests the earlier draft planned are dropped with the fallbacks (decision 12).

## 12. Docs this makes untrue

Greps run:

- `grep -rn -i -e does.not.log -e logs.once -e request.logger -e refus -e adopt -e knownJourney ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs`
- `grep -rn -e driveHandler -e kit.js -e redirectOnStaleAction ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs ~/git/defra/trade-imports-workspace/docs/best-practices/node/testing/frontend.md`
- plus a read of the JSDoc in `engine/test-support.js` and `shared/kit.js`.

Hits the change makes untrue:

- `src/server/app/docs/architecture.md:143-152` (what `shared/kit.js` holds): the list must name the session guard, as the check a journey-scoped action makes that the session holds the journey before its first read, logging and redirecting to the dashboard when it does not.
- `src/server/app/docs/architecture.md:201-202` (the validation-400 exemption from logging): must state that a form's field-validation 400 does not log, but a refusal to proceed past review (check answers' Continue) logs once even though it re-renders at 400.
- `src/server/app/docs/architecture.md`, "Logging" section (`:195-222`): must state that `journeyId` is the notification's reference number, so support searches a reference under `journeyId`.
- `src/server/app/docs/architecture.md` (new fact, no current line, beside the `kit.js` section): must state why a journey-scoped action checks that the session holds the journey before its first read (reading the state adopts any journey id the records port can load), and that `kit.js` owns that check. This is the rationale deleted from the two controllers.
- `sets/high-risk-plants/docs/add-a-field.md:245-249`, `add-a-page.md:336-340`, `add-a-section.md:354-358`, `add-a-collection.md:445-449` (each recipe's "Test support" list for controller tests): each must state that `driveHandler` also returns the request's log entries, and must name the promoted session-adopting toolkit among the helpers that build the toolkit, saying what it is for (a toolkit whose cookie writes reach the request, for a handler that reads the session again after writing it).
- `cancel-amend/controller.js:31-33` and `delete-notification/controller.js:27-29`: delete (stale once the guard moves, and rationale in code).
- `cancel-amend/controller.test.js:38-40` and `delete-notification/controller.test.js:33-35`: delete with the local copies.
- `cancel-amend/controller.test.js:156` and `:160`: delete (explanatory comments in a test).
- `delete-notification/controller.test.js:86` (test title): must state what its assertions prove, the dashboard redirects and the not-deletable log entry, not that no transition ran (decision 13).
- `engine/test-support.js:119-121` (`driveHandler` doc comment): must state that the result also carries the request's log entries.
- Workspace `docs/best-practices/node/testing/frontend.md:100-114` (handler test-support table, and `:102` "Both frontends have this file with the same exports"): made untrue by the two additions to plants' `engine/test-support.js`. That file is in the workspace repo, outside this row's repos, and fixing `:102` truly means mirroring the additions in the animals frontend; it is a follow-up (section 7).
- Reviewed and still true: `sets/high-risk-plants/docs/add-a-field.md:265-268`, `add-a-page.md:356-359`, `add-a-section.md:377-380`, `add-a-collection.md:467-470`. Each speaks of a form's validation 400 on the page being added, which still does not log.

## 13. Operability

| Branch | Log must let support find |
|---|---|
| Check answers Continue refused, review errors | `journeyId`; which rule refused; which question or party keys were outstanding (keys only, no values) |
| Check answers Continue refused, scope not ready | `journeyId`; that the not-ready rule refused |
| Check answers Continue on a submitted notification | `journeyId`; that it was already submitted and the trader was returned to the read-only page |
| Cancel amend on a journey not being amended (GET or POST) | `journeyId`; its current status; the reason; where the trader was sent |
| Cancel amend succeeded (state switch) | `journeyId`; that the amendment was cancelled and the submission restored |
| Delete on a journey whose status forbids it (GET or POST) | `journeyId`; its current status; the reason |
| Delete succeeded (state switch) | `journeyId`; that it was deleted |
| Session does not hold the journey (cancel amend or delete) | `journeyId` as requested; the reason |

All at info; the trace id comes from `request.logger`. No request or response body. Each reason is a named value so support can search for it. The two "transition returned nothing" fallbacks are removed as unreachable (decision 12), so they need no line.

## 14. Departures from written rules

- `src/server/app/docs/architecture.md:201-202` exempts a validation 400 that re-renders the page from logging. The check answers refusal re-renders at 400 and logs. The criterion and the house rule on logging every refusal (`.claude/rules/code-quality.md`, Logging and errors) require it; the doc is corrected in the same change to draw the line between field validation and a refusal to proceed past review (section 12).

## 15. Reachability

- The not-ready-for-check-your-answers refusal reason is reachable only if the scope can be not ready while the review finds no errors. The implementor checks with a seed; if it is unreachable, the condition still logs (it is existing code that this row's refusal owner handles) but no test invents the state, and the PR says so.
- The two "transition returned nothing" fallbacks (`cancel-amend/controller.js:77-79`, `delete-notification/controller.js:70-72`) are not reachable once the `kit.js` guard is in place: both records adapters return a record or throw, and the engine's own empty return comes only from an `isKnownJourney` check that the guard has already passed in the same request. They are removed (decision 12), with no log and no test.
- Everything else is reachable now through the existing routes.

## 16. Standards

- `.claude/rules/code-quality.md`
- `.claude/rules/node.md`
- `docs/best-practices/doc-comments/BEST_PRACTICES.md`
- `docs/best-practices/doc-comments/jsdoc.md`
- `docs/best-practices/node/code-style.md`
- `docs/best-practices/node/hapi.md`
- `docs/best-practices/node/testing/frontend.md`
- `docs/best-practices/node/pino-logging.md` (named by `code-quality.md` "Where the detail lives")
- `repos/trade-imports-plants-frontend/src/server/app/docs/add-a-set.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/architecture.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/flow-and-gates.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/validation.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/README.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-collection.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-field.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-page.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-section.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/features.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/journey-flow-and-gates.md`
