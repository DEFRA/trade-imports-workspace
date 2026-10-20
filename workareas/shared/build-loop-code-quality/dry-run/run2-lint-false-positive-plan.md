# Plan: refusals and redirects in check answers, cancel amend and delete notification are logged

| Repo | Path | Branch | HEAD |
|---|---|---|---|
| plantsfrontend | `repos/trade-imports-plants-frontend` | `chore/NO_JIRA-code-quality-factory` | `159c4d0` |

Set: `sets/high-risk-plants` (spec namespace `plants/`). The change adds no field, page, section or collection and changes no obligation or journey flow, so `frontend-change` does not route it; section 8 still applies.

Twin repo: `repos/trade-imports-animals-frontend` (set `sets/live-animals`). It has the same `engine/test-support.js` exports, the same `architecture.md` "Logging" rule (`src/server/app/docs/architecture.md:160-168`, including the validation-400 exemption), and the same check-answers, cancel-amend and delete-notification features, none of which logs these branches today. The row builds plantsfrontend only, so the twin is not changed here. Each divergence this creates is a departure in section 14 and a follow-up in section 7.

The workspace edit in section 12 (`docs/best-practices/node/testing/frontend.md`) lands in this workspace on the run's branch, beside the section 8 spec sync. It is a doc correction, not a repo the slice builds.

## 0. Decisions

1. **The notification reference is the journey id, so each new line carries it once, under the journey id key.** The row names the notification reference and the journey id as two things. In this frontend they are one value: the records port stores the journey id as the reference number when it writes (`services/persistence/records/real/lifecycle/mutate.js:22`) and maps the reference number back to the journey id when it reads (`real/marshal/document.js:8`, `real/marshal/list-item.js:11`). The owner of the key is the repo's Logging section (`src/server/app/docs/architecture.md:174-175`), and the declaration refusal already follows it (`declaration/controller.js:59`). Rejected: a second key holding the same value under the reference-number name. That gives one concept two names, which the house rules forbid. `docs/best-practices/node/pino-logging.md` §4a is met by any one of its listed ids the code has, and this code has the journey id.
2. **Follow the declaration refusal's shape in each feature.** Each of the three controllers gets one named function that logs the outcome and returns the redirect or refused render. Each also gets a frozen, exported set of reason values, as `DECLARATION_REFUSAL` and `refuseDeclaration` work in `declaration/controller.js:51-66`. The reason goes under the same key the declaration uses (`refusal`), so support searches every refusal by one field. Rejected: a shared logging helper in `shared/kit.js`. Feature folders stay independent by design, and the one shared thing (`request.logger` with `journeyId` plus a reason) is already the mechanism `architecture.md` "Logging" sets out.
3. **Level is `info` for every new line.** The row requires it for check answers. Cancel amend and delete get the same level: `pino-logging.md` §4a puts an expected refusal at `info`, and the declaration and stale-action lines (`kit.js:281`) are at `info` too.
4. **Check answers logs which summary errors stopped Continue.** It logs the keys of the summary errors (field ids, `party:<id>` keys and card anchors). It does not log their text, because that text is copy in the trader's language. It never logs answer values. When the refusal comes from `readyForCheckYourAnswers` alone, the key list is empty. Rejected: no detail (support could not tell why), and error text (language-dependent, and closer to a body).
5. **Cancel amend and delete log the journey status the decision turned on.** `architecture.md:175` asks for "any token or code the decision turned on". For a status refusal that is the journey's status. The concurrency token is left out because these decisions do not depend on it.
6. **The ownership redirect also logs, as its own reason.** Both cancel amend and delete redirect to the dashboard when the session does not hold the journey (`cancel-amend/controller.js:51-53, 61-63`, `delete-notification/controller.js:46-48, 54-56`). The house rules require every outcome-changing branch in the files this change edits to log once. The ownership branch has no loaded journey, so it logs the `journeyId` from the route params.
7. **A POST of Continue on a submitted notification logs as a refusal.** In the check answers POST (`check-answers/controller.js:146-148`), a submitted notification is redirected back to its read-only view. That branch is in the function this change edits and it changes the outcome, so it logs with its own reason value beside the incomplete-answers one.
8. **A successful cancel or delete and a successful Continue log nothing.** The row's last criterion says a page that renders normally logs nothing new. The declaration's successful submit does not log either. Rejected: an info line on every successful transition, which would be noise the row does not ask for.
9. **Remove the unreachable "nothing restored" and "nothing deleted" fallbacks.** In `cancel-amend/controller.js:77-79` and `delete-notification/controller.js:70-72`, the POST redirects to the dashboard without the success flag when `cancelAmendJourney` or `softDeleteJourney` returns nothing. Both return nothing only when `isKnownJourney` fails (`engine/journey.js:165-173, 186-192`), and the handler has already refused that case. Both records adapters return a record or throw (`records/real/lifecycle/transition.js:37-53`, `records/stub/lifecycle/transition.js:36-70`). The POST redirects to its success target unconditionally. Rejected: logging an unreachable branch.
10. **No tests-repo E2E.** Nothing a trader or another system sees changes: status codes, redirects and pages stay the same. The tests repo's E2E suite cannot read the frontend container's log stream. The proof is controller tests that read the request's recorded log lines through `recordingLogger` (`engine/test-support.js:64`), as the declaration test does (`declaration/controller.test.js:132-142`). The gate's existing E2E and FIT rungs keep the rendered behaviour proved.
11. **Check answers' 400 refusal logs, and `architecture.md` changes to say so.** `architecture.md:176-177` exempts a validation 400 that re-renders the page from logging. Check answers' Continue posts no form fields; it refuses because of the stored notification, so it is a refusal of the action, not validation of a form. The doc's rule is restated to separate the two cases. The twin's identical rule (`trade-imports-animals-frontend/src/server/app/docs/architecture.md:166-168`) is not restated here: departure in section 14, follow-up in section 7.
12. **Bounded tidy-up in the edited files.** Each controller and controller test this change edits has its house-rule breaches fixed (sections 2 and 4). `engine/test-support.js` is touched only to follow decisions 10 and 13, so only its touched lines and functions are fixed.
13. **The cookie-writing toolkit is `stubH` with a named option, not a second export.** Identical local `adoptingH` copies (`cancel-amend/controller.test.js:38-46`, `delete-notification/controller.test.js:33-41`) spread `stubH()` and replace its `state` with one that writes onto the request's state. `check-answers/controller.test.js:377-382` is a third local variant: it spreads `stubH()` and replaces `state` with one that records cookies into a local object. All three are local copies of `stubH` differing only in what `state` does. Per `docs/best-practices/node/testing/frontend.md:95` ("Extend the helper with an option rather than writing a local copy of its body") and the house rule "Extend the mechanism that exists", the home is `stubH` (`engine/test-support.js:51-61`):
    - `stubH` records each cookie its `state` is given and exposes them on the toolkit it returns, as the twin's `stubH` already does (`trade-imports-animals-frontend/src/server/app/engine/test-support.js:53-76`). This moves plants toward twin parity rather than away from it, and replaces the check-answers local body.
    - `stubH` takes a named option that also writes each cookie onto the request it was given. This replaces both `adoptingH` copies.
    - All three local bodies and their comments are deleted. Rejected: a new exported toolkit beside `stubH` (a second mechanism), and `recordingH` for check answers (it has no `view`, so the handler under test could not render).
14. **`driveHandler`'s result also carries the request's recorded log lines.** The check-answers tests that prove the refusal log use `driveHandler` (seeded, and with `amend`), and it builds its request internally, so the log is not reachable otherwise. Rejected: rebuilding that set-up by hand in the test file, which copies `driveHandler`'s body. The twin's `driveHandler` does not change here: departure in section 14, follow-up in section 7.
15. **The delete test's title drops the transition claim.** The test at `delete-notification/controller.test.js:86-96` asserts only redirects. Its extended title states what it proves: both redirects and the logged not-deletable refusal. Rejected: adding a status assertion after the GET and POST, because a soft-deleted journey's status is read through a records call whose result on a deleted journey this change does not otherwise touch, and the title is then the only untrue thing.

## 1. Moves

None.

## 2. Edits

All plants paths are under `repos/trade-imports-plants-frontend/src/server/app/`.

### `sets/high-risk-plants/journeys/linear/features/check-answers/controller.js`

- **POST refusal of incomplete answers (lines 149-157).** When Continue is refused, log once at `info` through `request.logger` before returning the 400 render. The line carries `journeyId`, the refusal reason, and the keys of the summary errors that caused it (decision 4). One named function owns "log the refusal, then return the response", in the shape of `refuseDeclaration` (`declaration/controller.js:56-66`).
- **POST on a submitted notification (lines 146-148).** Log the refusal once, with its own reason value and `journeyId`, then redirect as now (decision 7). It goes through the same function as the incomplete-answers refusal.
- **Reason values.** A frozen, exported set of refusal reasons beside the handler, in the shape of `DECLARATION_REFUSAL`.
- **GET render and successful Continue are unchanged** and log nothing.
- **Tidy-up in this file.**
  - Delete the doc comments on the internal `PARTY_KEY_PREFIX` (lines 46-49) and `summaryErrors` (lines 70-72). Doc comments are for exported APIs only. Where the names do not already say what the comments said, rename them (the summary-errors builder's name should say it builds every reason Continue is refused, in page order).
  - `hidesAnswerErrors(status, continueRefused)` (line 84) and `shownReviewErrors(current, continueRefused)` (line 87) take `continueRefused` as a bare positional boolean. Both take it as a named option instead, as `render` (line 96) already does. Their callers are internal to this file (lines 88 and 100), so this stays inside the footprint.

### `sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.js`

- **GET and POST ownership refusal (lines 51-53, 61-63).** Log once at `info` with `journeyId` from the route params and a not-held reason, then redirect to the dashboard.
- **GET and POST status redirect (lines 55-57, 65-67).** When the journey is not being amended, log once at `info` with `journeyId`, a not-amending reason and the journey's status, then redirect to the target `nonAmendTarget` chooses.
- **One owner.** One named function in this controller owns "log the reason, then redirect", and both handlers use it. The reason values are a frozen, exported set.
- **Unreachable fallback (lines 77-79).** Remove it (decision 9).
- **Tidy-up in this file.**
  - Delete the comment at lines 31-33 (it describes other modules). Rename `owns` so the name says it checks that the caller's session holds the journey.
  - Replace the positional `recoverableError` boolean on `render` (line 36, called at line 71) with a named option, as `declaration/controller.js:35` takes `{ recoverableError }`.

### `sets/high-risk-plants/journeys/linear/features/delete-notification/controller.js`

- **GET and POST ownership refusal (lines 46-48, 54-56).** As cancel amend: log once at `info` with `journeyId` and a not-held reason.
- **GET and POST status redirect (lines 50, 58-60).** When `deletable` refuses, log once at `info` with `journeyId`, a not-deletable reason and the journey's status, then redirect to the dashboard.
- **One owner.** One named function in this controller owns "log the reason, then redirect". The reason values are a frozen, exported set.
- **Unreachable fallback (lines 70-72).** Remove it (decision 9).
- **Tidy-up in this file.**
  - Delete the comment at lines 27-29 and rename `owns`, as in cancel amend.
  - Replace `render`'s positional `recoverableError` boolean (line 32, called at line 64) with a named option.
  - Rename `deletable` so its name says it is a predicate on the journey's status.

### `engine/test-support.js` (only the lines decisions 13 and 14 touch)

- **`stubH` (lines 49-61).** Records each cookie its `state` is given and exposes the record on the returned toolkit, as the twin's `stubH` does. Takes a named option that also writes each cookie onto the request passed in. Its doc comment (lines 49-50) states the contract: what it records, and what the option adds. Callers that pass nothing keep today's behaviour apart from the added record.
- **`driveHandler` (lines 123-159).** Its result also exposes the log lines its request recorded. Its doc comment (lines 123-125) states that the result includes them.

### `src/server/app/docs/architecture.md` ("Logging", lines 170-195)

- Must state that a refusal of an action because of the stored notification logs even when it re-renders at 400, with check answers' Continue as the case. A 400 from validating a posted form still does not log.
- Must state that the journey id is the notification reference, so `journeyId` is the one key for both.
- The declaration example stays.

### Recipes and the workspace testing guide

See section 12: the four recipes' Test support paragraphs and `docs/best-practices/node/testing/frontend.md` §3 change to state the new `stubH` option and `driveHandler` result.

## 3. New files

None.

## 4. Tests

All controller tests read log lines through the request's `recordingLogger` (`engine/test-support.js:64-75`). Each asserts the exact list of lines (level, fields, message), as `declaration/controller.test.js:132-142` does.

### `check-answers/controller.test.js`

1. **Incomplete Continue logs one refusal.** Extend the incomplete-Continue tests (lines 238-253 for a draft, 481-499 for an amendment). Exactly one `info` line, carrying `journeyId`, the incomplete-answers reason and the outstanding summary-error keys. Red without the log call in the POST refusal branch (section 2, the 400 return at lines 154-156).
2. **Forged Continue on a submitted notification logs one refusal.** Extend the test at lines 255-272. Exactly one `info` line with `journeyId` and the submitted reason. Red without the log in the submitted branch (lines 146-148).
3. **A normal render and a successful Continue log nothing.** Extend the complete-notification GET test (lines 367-371) and the successful-Continue test (lines 225-236): the recorded log is exactly empty. Red if a log is added to the render or success path.
4. **Copied-address test (lines 533-549).** Delete the spy on the address-book module and its `not.toHaveBeenCalled` assertion: it spies on an internal module. The remaining positive assertion (line 546) proves the destination card shows the name held on the notification, which differs from the address book's. The title changes to state exactly that: the card shows the notification's own copy of the name, not the address book's. Drop the `partySpy` set-up and, if nothing else uses them, the `vi` and `addressBook` imports.
5. **Opening-run test (lines 373-392).** Delete the local toolkit at lines 377-382. Build the toolkit with `stubH` and assert the opening-run cookie from the record `stubH` now keeps (decision 13). The assertion stays exact: the cookie holds the journey id mapped to the complete run state. Red if `stubH`'s cookie recording or the handler's `completeOpeningRun` write is removed.
6. **Titles.** Every extended test's title states that it also proves the logged refusal, or proves that nothing is logged.

### `cancel-amend/controller.test.js`

1. **Not amending.** Extend the test at lines 121-138. A GET on a draft and a POST on a submitted journey each record exactly one `info` line, carrying `journeyId`, the not-amending reason and that journey's status. Red without the log in the status branches.
2. **Not held by the session.** Extend the tests at lines 140-166 and 168-175. GET and POST each record exactly one `info` line with `journeyId` and the not-held reason. Red without the log in the ownership branches.
3. **Nothing logged.** Extend the GET render test (lines 88-103) and the successful-cancel test (lines 105-119): the recorded log is exactly empty.
4. **Toolkit.** Use `stubH` with its request-writing option, and delete the local `adoptingH` and its comment (lines 38-46).

### `delete-notification/controller.test.js`

1. **Not deletable.** Extend the already-deleted test (lines 86-96). GET and POST each record exactly one `info` line with `journeyId`, the not-deletable reason and the journey's status. The title drops "without another transition" and states what the assertions prove: both requests redirect to the dashboard and each logs the not-deletable refusal (decision 15). Red without the log in the status branches.
2. **Not held by the session.** Extend the test at lines 98-116. GET and POST each record exactly one `info` line with `journeyId` and the not-held reason.
3. **Nothing logged.** Extend the GET render test (lines 58-70) and the successful-delete test (lines 72-84): the recorded log is exactly empty.
4. **Toolkit.** Use `stubH` with its request-writing option, and delete the local `adoptingH` and its comment (lines 33-41).

### Integration proof

None in the tests repo (decision 10). The gate's existing tests-repo E2E rung and the plants FIT rung keep proving the rendered refusals and redirects, whose status codes and targets this change leaves alone.

## 5. Invariants to prove

| # | Criterion | Check | Expected |
|---|---|---|---|
| 1 | Check answers' refused Continue logs one `info` line with `journeyId` (the notification reference) | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/controller.test.js` | passes, including the refusal log assertions |
| 2 | Cancel amend's redirect away from a journey that is not being amended logs one line with its reason and `journeyId` | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.test.js` | passes |
| 3 | Delete notification's redirect away from a journey that cannot be deleted logs one line with its reason and `journeyId` | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/controller.test.js` | passes |
| 4 | A page that renders normally logs nothing new | carried by the three runs above (the exact-empty log assertions) | passes |
| T | No local copy of the response toolkit remains | `grep -rn "adoptingH" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src` | empty output |
| P | Programme invariant: every new or changed English string has a Welsh draft. This change adds no user-facing copy. | `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend diff --name-only 159c4d0 -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/copy src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/copy` | empty output |

None of these needs the workspace stack.

## 6. Increment-specific checks beyond the gate

None. The gate's unit, lint, format, duplication and E2E rungs plus section 5 cover the change.

## 7. Out of scope

- `check-answers/refusal.js`: its doc comment on `isReviewRefused` names its callers, and its predicate and the POST's own refusal condition are two statements of "may this notification go on". This change does not edit that file.
- `declaration/controller.js`: its submitted-notification redirects (lines 70-72, 79-81) do not log.
- The `.fit.spec.js` files, the copy files and the templates of the three features.
- The backend's lifecycle logs.
- The twin, `trade-imports-animals-frontend`: no file in it changes in this increment.

Follow-ups:
- `trade-imports-animals-frontend` check answers (`sets/live-animals/journeys/linear/features/check-answers/controller.js`): log the refused Continue and the Continue on a submitted notification once at `info` with `journeyId`, a reason and the outstanding summary-error keys, as plants now does.
- `trade-imports-animals-frontend` cancel amend and delete notification: log the ownership and status redirects once at `info` with `journeyId`, a reason and the status, as plants now does.
- `trade-imports-animals-frontend/src/server/app/docs/architecture.md` "Logging": restate the validation-400 exemption so a refusal because of the stored notification logs, and state that `journeyId` is the notification reference, matching plants.
- `trade-imports-animals-frontend/src/server/app/engine/test-support.js`: give `stubH` the option that writes cookies onto the request, and add the recorded log lines to `driveHandler`'s result, so both frontends' test support matches again; then make `docs/best-practices/node/testing/frontend.md` §3 describe one shared shape.
- `trade-imports-plants-frontend/src/server/app/engine/test-support.js`: bring the rest of `stubH` (`unstate`, a redirect that takes `.code()`) and `driveHandler`'s `state` option to parity with the twin.
- `check-answers/refusal.js`: delete the doc comment that names `isReviewRefused`'s callers, and give "may the notification go on" one owner shared by check answers' Continue and the declaration submit.
- `declaration/controller.js`: log the redirect of a GET or POST on a submitted notification to its confirmation page, with `journeyId` and a reason.
- Plants set docs: record why cancel amend and delete check that the session holds the journey before the first `state.get` read. This change deletes that rationale from the controller comments.
- `engine/test-support.js` lines 5-6: delete the comment that describes `plugins/auth.js`, another module.
- `services/address-book/index.js`: doc comments on internal helpers carry ruling and design ids, which breach the house rules.

## 8. Spec sync

Prefix `plants/`: none. The behaviour spec records only what a user, an operator interface or another system sees (`openspec/config.yaml`). This change adds support diagnostics to the frontend's log stream and leaves every page, status code, redirect target and lifecycle outcome alone. The plants spec records no logging: `grep -rn -i -w -e logs -e logged -e logging ~/git/defra/trade-imports-workspace/openspec/specs/plants` finds nothing, and the existing declaration refusal log is not spec'd either. The nearest capabilities (`plants/journey-pages/check-your-answers`, `plants/notification-lifecycle`, `plants/notification-dashboard`) keep their requirements and scenarios. Removing the unreachable fallbacks changes no reachable outcome. No coverage links change.

## 9. Homes

| New thing | Home (existing mechanism) |
|---|---|
| Check answers refusal reasons, and the function that logs then refuses | `check-answers/controller.js`, beside `post` (lines 144-159). Through `request.logger`, as `architecture.md:172-178` requires. Shape follows `declaration/controller.js:51-66` |
| Cancel amend redirect reasons, and the function that logs then redirects | `cancel-amend/controller.js`, beside `nonAmendTarget` (lines 26-29). `request.logger` |
| Delete notification redirect reasons, and the function that logs then redirects | `delete-notification/controller.js`, beside `deletable` (lines 22-25). `request.logger` |
| Named option on `hidesAnswerErrors` and `shownReviewErrors` | the existing functions at `check-answers/controller.js:84-90`, taking it the way `render` (line 96) does |
| Cookie recording, and the option that writes cookies onto the request | `stubH`, `engine/test-support.js:51-61`. Its stated design (lines 49-50: "records what the handler rendered", takes the request "as hapi's toolkit does") is extended, not departed from. The recording mirrors the twin's `stubH` |
| The request's recorded entries on the handler-driving helper's result | `driveHandler`'s existing return value, `engine/test-support.js:152-158`, from the recording logger `journeyRequest` already attaches (line 81). No second recorder |

## 10. Rule owners

| Rule | Owner (plants) |
|---|---|
| Check answers refuses Continue, and logs it, when summary errors exist or the notification is not ready | the new log-then-refuse function in `check-answers/controller.js`, called from `post` |
| Check answers refuses Continue on a submitted notification, and logs it | the same function |
| Cancel amend redirects, and logs it, when the session does not hold the journey or it is not being amended | the new log-then-redirect function in `cancel-amend/controller.js`. The target stays owned by `nonAmendTarget` (lines 26-29) |
| Delete redirects, and logs it, when the session does not hold the journey or its status cannot be deleted | the new log-then-redirect function in `delete-notification/controller.js`. Deletable statuses stay owned by the renamed `deletable` predicate (lines 22-25) |

The twin repo is `trade-imports-animals-frontend`. Its owners would be the same functions in `sets/live-animals/journeys/linear/features/{check-answers,cancel-amend,delete-notification}/controller.js`. The row builds plantsfrontend only, so the twin is not changed: the house rule "each display or business rule lives in one function, mirrored in each twin repo" is departed from in section 14, and the mirror is a follow-up in section 7.

## 11. Test support

- **`stubH`** (`engine/test-support.js:51`) gains cookie recording and a named option that writes cookies onto the request (decision 13). It replaces three local copies, which are deleted:
  - `cancel-amend/controller.test.js:38-46` (`adoptingH` and its comment);
  - `delete-notification/controller.test.js:33-41` (`adoptingH` and its comment);
  - `check-answers/controller.test.js:377-382` (the local toolkit that spreads `stubH()` and records cookies into a local object).
- **`driveHandler`** gains the recorded log lines in its result (decision 14). The check-answers refusal and nothing-logged tests use it.
- Cancel amend and delete tests build their requests with `journeyRequest` (line 77), which already attaches a `recordingLogger`, so they read `request.logger.entries` directly.

## 12. Docs this makes untrue

Greps run:

- `grep -rn -i -w -e log -e logs -e logged -e logger -e journeyId ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs`
- `grep -rn -e driveHandler -e stubH -e recordingH -e recordingLogger -e adoptingH ~/git/defra/trade-imports-workspace/docs/best-practices` (hits: `node/testing/frontend.md:36, 99, 103, 107, 110, 111, 180`; `node/hapi.md:645`)
- `grep -rn -e driveHandler -e stubH -e recordingH -e recordingLogger ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs` (hits: the four recipes' Test support paragraphs)
- `grep -rln "adoptingH" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src`

What the change makes untrue:

- **`repos/trade-imports-plants-frontend/src/server/app/docs/architecture.md:176-177`** (the exemption for a validation 400 that re-renders). Must state that a refusal because of the stored notification, which check answers' Continue makes at 400, logs once; a 400 from validating a posted form still does not.
- **`architecture.md:174-175`** (the ids every line carries). Stays true, but must also state that `journeyId` is the notification reference.
- **`engine/test-support.js:49-50`** (`stubH`'s doc comment). Must state that it records the cookies it is given, and that the option also writes them onto the request.
- **`engine/test-support.js:123-125`** (`driveHandler`'s doc comment). Must state that its result includes the request's recorded log lines.
- **`docs/best-practices/node/testing/frontend.md:107`** (workspace). Documents `driveHandler` as returning exactly `{ journeyId, before, after, response, view }`. Must state that the plants result also carries the recorded log lines. The same row lists a `state` option that only the twin's `driveHandler` takes, so it must state which frontend takes it.
- **`docs/best-practices/node/testing/frontend.md:103` and the export table at `:105-114`.** Line 103 says both frontends have the same exports. The names stay the same, but `stubH` and `driveHandler` now differ between the two. Line 103 must state that the exports share names and where they differ. The `stubH` row (`:110`) must state that it records cookies and takes an option that writes them onto the request (plants).
- **`sets/high-risk-plants/docs/add-a-field.md:246-250`, `add-a-page.md:337-341`, `add-a-section.md:356-360`, `add-a-collection.md:446-450`** (Test support). Each says `driveHandler` "returns the answers before and after". Each must state that it also returns the request's recorded log lines, and that `stubH` records cookies and can write them onto the request.
- **`cancel-amend/controller.js:31-33`** and **`delete-notification/controller.js:27-29`**. These comments describe other modules: delete them.
- **`check-answers/controller.js:46-49`** and **`:70-72`**. Doc comments on internal helpers: delete them.
- **`cancel-amend/controller.test.js:38-40`** and **`delete-notification/controller.test.js:33-35`**. These comments go with the local copies, which are deleted.

Still true:

- `sets/high-risk-plants/docs/add-a-field.md:268-270`, `add-a-page.md:359-361`, `add-a-section.md:380-382` and `add-a-collection.md:468-470` (the Logging paragraphs): about validating a posted form.
- `docs/best-practices/node/hapi.md:645`: names `driveHandler` but not its result shape.
- `docs/best-practices/node/testing/frontend.md:36, 99, 111, 180`: examples and rows this change leaves true.

## 13. Operability

| Branch | Log it needs | What support must find |
|---|---|---|
| Check answers POST refuses Continue (incomplete) | one `info` line | `journeyId` (the notification reference), the reason, and which summary-error keys were outstanding |
| Check answers POST on a submitted notification | one `info` line | `journeyId` and the reason |
| Cancel amend GET/POST, journey not held by the session | one `info` line | `journeyId` from the route and the reason |
| Cancel amend GET/POST, journey not being amended | one `info` line | `journeyId`, the reason and the status that decided where the trader was sent |
| Delete GET/POST, journey not held by the session | one `info` line | `journeyId` and the reason |
| Delete GET/POST, journey status cannot be deleted | one `info` line | `journeyId`, the reason and the status |
| Cancel amend / delete POST recoverable save failure | already owned by `kit.recoverableSave`, unchanged | (unchanged) |

Each line goes through `request.logger`, so it carries the request's trace id. No line logs a request or response body.

## 14. Departures from written rules

1. **Twin mirroring of the logged rules.** Rule: "One rule, one owner: each display or business rule lives in one function, mirrored in each twin repo." (`.claude/rules/code-quality.md`, Structure). The three refusal and redirect rules gain a logged owner in plants only; `trade-imports-animals-frontend`'s check-answers, cancel-amend and delete-notification controllers stay unlogged. Reason: the row builds plantsfrontend only. Follow-up in section 7.
2. **Test-support divergence between the twins.** Rule: "Both frontends have this file with the same exports." (`docs/best-practices/node/testing/frontend.md:103`), and "One concept, one name ... across twin repos" (`.claude/rules/code-quality.md`, Names). Plants' `stubH` gains the request-writing option and `driveHandler`'s result gains the recorded log lines; the twin's do not. The export names stay the same, and `stubH`'s new cookie recording narrows an existing divergence. Reason: the row builds plantsfrontend only. Section 12 makes the guide state the difference; section 7 restores parity.
3. **The restated `architecture.md` Logging rule in one twin.** Rule: the same "One rule, one owner ... mirrored in each twin repo" (`.claude/rules/code-quality.md`), applied to the shared Logging rule at `trade-imports-animals-frontend/src/server/app/docs/architecture.md:166-168` and plants' `architecture.md:176-177`. Plants restates the validation-400 exemption; animals keeps the old wording. Reason: the row builds plantsfrontend only. Follow-up in section 7.

## 15. Reachability

- Every logged branch is reachable today, and each is driven by an existing test that section 4 extends.
- `stubH`'s request-writing option is passed by the cancel-amend and delete tests; its cookie record is read by the check-answers opening-run test.
- The unreachable "nothing restored" and "nothing deleted" fallbacks are removed rather than logged (decision 9).

## 16. Standards

The implementor reads each in full:

- `.claude/rules/code-quality.md`
- `.claude/rules/node.md`
- `docs/best-practices/node/code-style.md`
- `docs/best-practices/node/hapi.md`
- `docs/best-practices/node/testing/frontend.md`
- `docs/best-practices/doc-comments/BEST_PRACTICES.md`
- `docs/best-practices/doc-comments/jsdoc.md`
- `docs/best-practices/node/pino-logging.md` (named by `code-quality.md` and `node.md` for logging)
- `repos/trade-imports-plants-frontend/src/server/app/docs/architecture.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/validation.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/flow-and-gates.md`
- `repos/trade-imports-plants-frontend/src/server/app/docs/add-a-set.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/README.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/features.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/journey-flow-and-gates.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-field.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-page.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-section.md`
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/add-a-collection.md`
