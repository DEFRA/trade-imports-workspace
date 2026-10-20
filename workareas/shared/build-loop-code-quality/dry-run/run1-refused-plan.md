# inc-001 plan: refusals and redirects in check answers, cancel amend and delete notification are logged

| Repo | Path | Branch | HEAD |
|---|---|---|---|
| plantsfrontend | `repos/trade-imports-plants-frontend` | `chore/NO_JIRA-code-quality-factory` | `739063d` |

Set: `sets/high-risk-plants` (spec namespace `plants/`). The change is logging, comment and test-support work in three existing features, `shared/kit.js`, `engine/test-support.js` and the other `kit.recoverableSave` callers. It adds no field, page, section or collection and changes no obligation or journey flow, so `frontend-change` does not route it and no recipe is followed as a script. Three recipes are edited (section 12).

## 0. Decisions

1. **"Notification reference and journey id" are one value, logged once as `journeyId`.** The claim that they are two ids does not hold in this repo. The records adapter maps the backend's `referenceNumber` straight onto `journeyId` (`services/persistence/records/real/marshal/document.js:8`), and the status strip shows `journeyId` as the reference (`shared/kit.js:84`). The repo's logging rule names `journeyId` as the key support searches by (`src/server/app/docs/architecture.md:174-175`), and the pino guide asks for "at least one of these, whichever the code has" (`docs/best-practices/node/pino-logging.md` §4a). Rejected: a second `referenceNumber` key carrying the same value, which breaks "one concept, one name".
2. **Each log line carries `journeyId`, the journey's current status and a named reason**, mirroring the declaration refusal (`declaration/controller.js:51-66`), where the reason is a value from a frozen map the controller exports and the tests import. Check answers adds what is outstanding, as the error keys the refusal turned on (field and card keys, never their values). Rejected: the reason as free text in the message, because support could not search for one reason by name.
3. **Level is `info` for every refusal and redirect.** These are expected refusals, which pino guide §4a puts at `info` (`docs/best-practices/node/pino-logging.md:172`). The recoverable backend fallback in decision 6 is `warn`.
4. **Check answers' 400 Continue refusal logs, even though it re-renders at 400.** `architecture.md:176-177` says "A validation 400 that re-renders the page does not log". That sentence covers a field failing its payload validation. Check answers has no payload: it refuses the whole notification as not ready. That is a refusal under the same section's first sentence, and acceptance criterion 1 requires the log line. `architecture.md` gains the distinction (section 12). Rejected: turning the refusal into a redirect to fit the doc, which would change behaviour the spec records (`plants/journey-pages/check-your-answers`: "they stay on check-your-answers … focus moves to it").
5. **Every outcome-changing branch in the three controllers logs, not only the ones the criteria name.** The rule's owners are the house logging rule (`.claude/rules/code-quality.md`, "Logging and errors") and pino guide §4a (`docs/best-practices/node/pino-logging.md:154`): one log per refusal, redirect, retry, fallback or state switch. That brings in:
   - check answers' forged Continue on a submitted notification, redirected back to the read-only page (`check-answers/controller.js:146-148`);
   - the ownership refusal in cancel amend and delete, for GET and POST (`cancel-amend/controller.js:51-53, 61-63`; `delete-notification/controller.js:46-48, 54-56`);
   - the recoverable backend fallback both controllers reach through `kit.recoverableSave` (decision 6).

   Rejected: logging only the three state redirects and leaving the house rule breached in the files this change edits.
6. **The recoverable-save fallback logs at its owner, `kit.recoverableSave`** (`shared/kit.js:262-274`). The fallback is decided there, so its log line sits there and nowhere else. Pino guide §4a puts the log at the deciding branch and forbids logging the same decision again further up. It needs the request for `request.logger` and `journeyId`, so the request becomes a required argument, and all 14 callers pass it (section 2). It logs `{ err }` and `journeyId` at `warn`. Rejected: a log line in each of the two controllers' failure callbacks. That would give one rule two owners and leave the other 12 callers silent. Rejected too: an optional request argument, which would let a page built from the recipes leave it out and fail on `request.logger` only on the fallback branch.
7. **Ownership refusal gets one owner in `shared/kit.js`.** The ownership check, its dashboard redirect and its log line are the same in cancel amend and delete. Adding the log line to both copies would duplicate a rule, so the shared part is extracted into one kit helper that both controllers call before their first read. `architecture.md:132-133` admits it: "A helper belongs in `kit.js` only when every journey page could use it and it names no feature, set or page". It goes through `isKnownJourney` (`engine/journey.js:135-136`). Rejected:
   - leaving two copies, which breaks "one rule, one owner";
   - putting it in `engine/journey.js`, because the engine neither redirects nor renders, and dependency-cruiser forbids engine → kit.
8. **A successful soft delete or cancel amend does not log in the frontend.** That state switch is decided and logged by the plants backend (`NotificationController.java:134` and `:190`). Logging it here would log one decision twice (pino guide §4a). The successful Continue to the declaration is the normal next page and does not log either.
9. **The comments above `owns` are deleted, not moved into code.** Both copies (`cancel-amend/controller.js:31-33`, `delete-notification/controller.js:27-29`) describe other modules (`state.get`, `cancelAmendJourney`, `softDeleteJourney`). Their rationale is that loading a journey adopts its id into the session, so a lifecycle page checks ownership before its first read. That fact goes into `src/server/app/docs/persistence.md` under "Lifecycle and request memoisation".
10. **Doc comments on internal helpers in `check-answers/controller.js` are deleted** (`:46-49` on `PARTY_KEY_PREFIX`, `:70-72` on `summaryErrors`). The house rule says "Doc comments only state the contract of an exported public API". The behaviour they describe is already in the behaviour spec: `plants/journey-pages/check-your-answers` ("An unfinished draft names every unfinished card and links to it") and `plants/addresses`. Where a name then says less than the deleted comment did, the implementor renames it.
11. **The positional boolean `recoverableError` in cancel amend's and delete's `render`** (`cancel-amend/controller.js:36,71`; `delete-notification/controller.js:32,64`) becomes an options object, as check answers' `render` already takes one (`check-answers/controller.js:92-97`).
12. **Plants test support comes into line with the animals twin's shape, rather than gaining a third one.** The animals twin already has the mechanism the ownership tests need:
    - its `stubH` records every cookie the handler sets or unsets in an `h.cookies` map (`repos/trade-imports-animals-frontend/src/server/app/engine/test-support.js:51-79`, `state` at :70-72, `unstate` at :73-75);
    - its `driveHandler` takes a `state` option (:144-171, option at :151, forwarded at :166).

    Plants `stubH` (`engine/test-support.js:51-61`) gains the same cookie recording and `unstate`, with the same shape. The ownership tests then prove that the caller's session adopts nothing by asserting the toolkit's recorded cookies exactly: an empty map after a refused GET and a refused POST. Loading a journey adopts it through the session port's `h.state` (`services/persistence/session/stub.js:30-36`), so a guard placed after the first read writes the known-journeys cookie and turns those assertions red. The local `adoptingH` copies (`cancel-amend/controller.test.js:38-46`, `delete-notification/controller.test.js:33-41`) and their comments are deleted, with no new option on `stubH`. Rejected: a `stubH` option that writes cookies back onto the request, which would be a second mechanism beside the twin's cookie map.

    Plants `driveHandler` does not gain the animals `state` option in this change: no test here passes it (section 15). The guide row at `frontend.md:107` is corrected to state which options each repo's `driveHandler` takes (section 12).
13. **`driveHandler` returns the request's recorded log entries, in plants only.** Check answers' log assertions on the draft and amend refusals and on a normal render need the request's logger, which `driveHandler` builds internally and does not expose. Extending the helper follows the guide (`frontend.md` §3: "Extend the helper with an option rather than writing a local copy of its body"). This makes plants' return differ from the twin's: section 14 records the departure from `frontend.md:103`. Rejected: hand-building those requests from `store.create()` and `journeyRequest`, which copies `driveHandler`'s body into the test file.
14. **The submitted-journey refusal test keeps its hand-built request.** The test at `check-answers/controller.test.js:255` drives two handlers, GET then the forged POST, against one submitted journey through one request. `driveHandler` runs one handler per journey and has no submitted-only state: its `amend` option submits and then opens an amendment. The test already holds the request, so it reads `request.logger.entries` directly. Rejected: a new submitted option on `driveHandler`, which this one test alone would use and which would widen the twin difference further.
15. **No integration proof in the tests repo.** Logs are not observable through Playwright, and no page, redirect target or status code changes. The unit tests read the logger at the request boundary (`recordingLogger`, `engine/test-support.js:64-75`), which is the boundary the code does not own. The gate's E2E rung still runs as regression.
16. **The unreachable falsy branches stay as they are**: `restored ? … : dashboard` in cancel amend (`:77-79`) and `deleted ? … : dashboard` in delete (`:70-72`). `cancelAmendJourney` and `softDeleteJourney` return undefined only for a journey the session does not hold, and the ownership guard has already refused that. No log line goes on a branch that cannot run (section 15).
17. **House-rule breaches in `shared/kit.js` are fixed in this change**, as for the three controllers. Each comment below either describes callers, other modules, a library, the layout or a template, carries rationale or history, or uses a count. Deleted comments and clauses are not reworded. Where the fact still matters, it moves to the `src/server/app/docs/architecture.md` section "Shared controller support: `shared/kit.js`":
    - `:19-24`, the `sharedCopy` doc comment, which names a caller (`src/server/auth/controller.js`), names `base`, and uses a count ("The one resolved instance"). The whole comment is deleted. Fact moved: a controller that builds its own view model imports `sharedCopy` and does not re-resolve the copy.
    - `:78`, the `journeyStrip` sentence "False on the page Cancel amend leads to.", which names a caller. Deleted.
    - `:93`, the `errorSummary` first line, which uses a count ("The one error summary shape"). Deleted. `:101-102`, "Set it on a page that renders the summary without the user having just been refused", is caller guidance. Deleted.
    - `:153-155`, the `SERVER_WIDE_LAYOUT` sentence "Each set names the same template today, but a set may override it…", which is rationale and uses the time word "today". Deleted. Fact moved: a set may override the layout, and a server-wide page has no set to ask.
    - `:163-166`, the second paragraph of the `serverWideBase` doc comment, which is rationale and narrates a hidden bug. Deleted. Fact moved: `base` resolves through the active set, so a server-wide route uses the server-wide chrome.
    - `:174-179`, the inline comments in `serverWideBase`, which describe the layout. Deleted. Fact moved: a server-wide page's home link is the root, which redirects to the default set, and a server-wide page has no strip and no token.
    - `:191-195`, the second paragraph of the `chromeFor` doc comment, which is rationale. Deleted. Fact moved: the error page's chrome is settled by the request path, because an unrouted 404 runs no set's extension.
    - `:215-216`, the `options.page` clause "omit it on a page the journey deliberately leaves uncaptioned", and `:217-220`, the `options.request` clauses naming `saveActions` and "A template passes it on as `amend = amend`". Both describe callers and templates and are deleted. The contract that stays is what `base` returns given each option.
    - `:242-244`, the history narration ("Hardcoding `/` in the layout sent every set's service navigation…"). Deleted, with no move: git holds it.
    - `:249-250`, the inline rationale for per-request amend actions. Deleted. Fact moved: an amend page's save buttons carry the page's own query, so the POST re-render builds the same URLs as the GET.
    - `:336-337` and `:340-342` in the `dateField` doc comment: "the MoJ picker parses nothing else", "Pass `arrivalWindow().minText`, never its sibling `min`", and the client-script and stylesheet-hook sentence. They describe a library, another module and the UI, so they are deleted. The contract that stays is the `d/m/yyyy` text format and that the classes go on the field's form group. Fact moved: the date picker reads only `d/m/yyyy` text from `data-min-date`.

    No name in `kit.js` changes. No positional boolean flag is found in it.
18. **House-rule breaches in `engine/test-support.js` are fixed in this change.**
    - `:5-6` describes another module (`plugins/auth.js`). Deleted, with no move: the guide row for `authenticatedCredentials` (`frontend.md:114`) already says what it is.
    - `:110` is a doc comment on the internal helper `requestLocation`. Deleted. The name already says it.
    - `:49-50` (`stubH`) and `:123-125` (`driveHandler`) are exported contracts that this change makes incomplete. Each comes to name the new fact (section 12).
19. **House-rule breaches in the twelve other `recoverableSave` callers are fixed in this change**, by the same rules as decisions 9-11 and 17. All paths are under `sets/high-risk-plants/journeys/linear/features/`. "Spec" means the fact is observable behaviour the named `plants/` capability already states, so the comment is deleted with no move. "Features doc" means the rationale moves to a new "Page decisions" section in `sets/high-risk-plants/docs/features.md`, with one entry per page.
    - `arrival-status/controller.js`: `:25-32`, the `meta` doc comment, describes the page gate and opening run (other modules) and carries rationale. Deleted. Page order and the potato skip are in the spec (`plants/journey-flow`, `plants/journey-obligations`). The reason the question comes before the dates goes to the features doc. `:44-46` is rationale about the copy bundle and the timing constant. Deleted, and moved to the features doc.
    - `commodities/details/details.controller.js`:
      - `:30-39`, the `meta` doc comment, is rationale. Deleted, and moved to the features doc: the line is created on choosing its category, because the model scopes a line's fields only once the instance exists.
      - `:44-45` explains the name `bundle`. The name changes to say it is the group's shared copy bundle, and the comment is deleted.
      - `:126-137` is a doc comment on the internal `modelFor`. Deleted. Where a parameter name then says less (`source`, `fieldsCategory`), the implementor renames it.
      - `:153-155`, `:185-187`, `:196-199` and `:249-251` are rationale. Deleted. The trader-visible part (sent back when a type offers no category; a recategorised line asks the new fields) is checked against `plants/journey-pages` for commodities. Whatever is not stated there goes to the features doc.
    - `commodities/list/list.controller.js`: `:17-25`, the `meta` doc comment, describes the sub-page and carries rationale. Deleted. The empty list sending the trader to the entry page goes to the features doc. `:66-67` describes the UI. Deleted, with no move: `surfaceClass('display')` says it. `:122-124` is rationale and uses a count ("the last thing"). Deleted. The minimum-one-line refusal is behaviour in the spec.
    - `commodity-type/controller.js`:
      - `:38-39` explains the name `HINT_DAYS`. The name changes to say it maps each commodity type to the window its hint quotes, and the comment is deleted.
      - `:63-65` is rationale. Deleted. The back-link rule goes to the features doc.
      - `:74-76` and `:84-85` are rationale and describe callers ("only reaches here on 'Save and return to overview'"). Deleted.
      - `:86`, `linesDroppedBy`, returns `{ kept, removed }`. That is the house rule's own bad example. The implementor renames it so that the name says it keeps the lines the type allows and counts the rest, and renames that concept's vocabulary in the file and its tests.
      - `:94-95` explains the name `keyOf`. The name changes to say it is the identity of a line as the trader sees it, and the comment is deleted.
      - `:160-161` is rationale. Deleted. That a change which dropped lines says so on the list page is behaviour in the spec.
    - `consignment-contact-select/controller.js`: `:18-30`, the `meta` doc comment, describes the UI and other pages. Deleted. The blank-save behaviour is in the spec (`plants/journey-pages/consignment-contact-select`). The search-and-paging form design goes to the features doc. `:49-50` and `:78` are rationale or describe behaviour the spec states ("A new search starts at the first page"). Deleted.
    - `place-of-destination/controller.js`: `:23-32` (the `meta` doc comment), `:49-57` (a doc comment on the internal `destinationStateOf`), `:69-72` (which cites another doc) and `:77-78` and `:109` (rationale) are all deleted. The three destination states and the copied-record behaviour are in the spec (`plants/journey-pages/place-of-destination`, `plants/addresses`). The no-client-JavaScript picker design goes to the features doc.
    - `consignor-select/controller.js`: `:19-28`, `:47-50`, `:54-55` and `:90` are deleted on the same grounds as place of destination. The behaviour is in `plants/addresses`.
    - `identification-numbers/controller.js`: no comment, name or flag breach found. Only the request argument changes.
    - `origin/controller.js`:
      - `:23-31` (the `meta` doc comment) is rationale. Deleted. Why the narrowing is a controller rule and not an obligation gate goes to the features doc.
      - `:43-45` describes the UI. Deleted, and moved to the features doc.
      - `:56-57` explains an ordering that the name `constraintsOn` does not say. The name changes to say it returns the constraints narrowest first, and the comment is deleted.
      - `:79-80` is behaviour in the spec (`plants/journey-obligations/origin`). Deleted.
      - `:89-100` is a doc comment on the internal `errorsFor`. Deleted.
      - `:119-120` is stale: it describes a back link above `originErrors`. Deleted.
    - `arrival-details/controller.js`:
      - `:34-43` (the `meta` doc comment) and `:55-63` (a doc comment on the internal `dateStateOf`) are deleted. Their regulation rationale goes to the features doc. What a trader is asked is in the spec.
      - `:78-80` is deleted with no move: `add-a-field.md:125-127` already states it.
      - `:108-109` is a doc comment on an internal helper. Deleted.
      - `:177-178` describes the picker (the UI). Deleted. The text-to-date-parts fact is the `kit.readDate` contract.
    - `party-edit/party-edit.controller.js`: `:26` explains the name `RETURN_SLUGS`. The name changes to say these are the allowed return pages, and the comment is deleted. `:71` is a doc comment on the internal `editable`. Deleted. That a dropped consignor has nothing to edit is behaviour in `plants/addresses`.
    - `declaration/controller.js`: no comment, name or flag breach found. Only the request argument changes.

    Rejected: changing only the call argument in these files, which would leave house-rule breaches in files this change edits.

## 1. Moves

None.

## 2. Edits

All paths are relative to `repos/trade-imports-plants-frontend/src/server/app/`.

- **`shared/kit.js`**
  - Gains the ownership guard of decision 7. It checks through `isKnownJourney`. When the session does not hold the journey, it logs once at `info` with `journeyId` and an ownership reason, then gives back the dashboard redirect. The ownership reason value lives beside the guard and is exported for tests.
  - `recoverableSave` (`:262-274`) takes the request as a required argument. On the recoverable-backend branch only, it logs once at `warn` with `{ err }` and `journeyId` before it calls the failure callback. The stale-token and non-recoverable branches keep rethrowing unchanged and gain no log line here (stale is logged by `redirectOnStaleAction`, `:276-294`).
  - The comment deletions of decision 17.
- **`sets/high-risk-plants/journeys/linear/features/check-answers/controller.js`**
  - `post` (`:144-159`) logs once at `info` on the forged-Continue-on-submitted branch (`:146-148`) and once on the 400 refusal (`:150-157`). Each line carries `journeyId`, the status and the named reason. The 400 line also carries the outstanding error keys from the `errors` already computed at `:149`, and a flag for "not ready for check your answers" when that refused it with no keys.
  - A reason map is exported, following `declaration/controller.js:51-54`.
  - The doc comments at `:46-49` and `:70-72` are deleted (decision 10).
  - `get` and the successful Continue do not log.
- **`sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.js`**
  - The kit guard replaces the local `owns`, its comment (`:31-34`) and both handlers' ownership branches.
  - The non-amend redirect in `get` (`:55-57`) and `post` (`:65-67`) logs once at `info` with `journeyId`, the status and the not-amending reason. The reason map is exported.
  - `render`'s positional boolean becomes an options object (decision 11).
  - The `recoverableSave` call passes the request.
- **`sets/high-risk-plants/journeys/linear/features/delete-notification/controller.js`**, the same as cancel amend:
  - the guard replaces `owns` and its comment (`:27-30`);
  - the non-deletable redirect in `get` (`:50`) and `post` (`:58-60`) logs once at `info` with `journeyId`, the status and the cannot-delete reason, and the only reachable status there is deleted;
  - the reason map is exported, `render` takes an options object, and the request is passed to `recoverableSave`.
- **The twelve other `recoverableSave` callers** pass the request and take the comment deletions and renames of decision 19:
  - `arrival-status/controller.js`
  - `commodities/details/details.controller.js`
  - `commodities/list/list.controller.js`
  - `commodity-type/controller.js`
  - `consignment-contact-select/controller.js`
  - `place-of-destination/controller.js`
  - `consignor-select/controller.js`
  - `identification-numbers/controller.js`
  - `origin/controller.js`
  - `arrival-details/controller.js`
  - `party-edit/party-edit.controller.js`
  - `declaration/controller.js`
- **`engine/test-support.js`**
  - `stubH` (`:51-61`) records the cookies the handler sets and unsets, in the animals twin's shape (decision 12). Its doc comment names that fact.
  - `driveHandler` (`:126-159`) also returns the request's recorded log entries (decision 13). Its doc comment names that fact.
  - The deletions of decision 18.
- **`docs/architecture.md`**
  - The kit list (`:121-130`) names the ownership guard. It also states that `recoverableSave` takes the request.
  - The kit section gains the facts moved out of `kit.js` (decision 17).
  - "Logging" (`:170-178`) states that a 400 re-render refusing the whole notification logs, and that only a payload field's validation 400 stays silent. It also states that the recoverable-save fallback logs `{ err }` at its owner.
- **`docs/persistence.md`**: "Lifecycle and request memoisation" (`:43-47`) states the fact moved out of the deleted ownership comments. Loading a journey adopts its id into the caller's session, so a page that changes a journey's lifecycle checks that the session holds the journey before its first read.
- **`sets/high-risk-plants/docs/features.md`** gains a "Page decisions" section holding the rationale that decision 19 moves out of the callers, one entry per page.
- **`sets/high-risk-plants/docs/add-a-field.md:133`, `add-a-page.md:123`, `add-a-section.md:156`**: see section 12.
- **Workspace repo, `docs/best-practices/node/testing/frontend.md:107`**: see section 12.
- **Test files**: see section 4.

## 3. New files

None.

## 4. Tests

All files are under `sets/high-risk-plants/journeys/linear/features/` unless named otherwise. Assert `request.logger.entries` exactly (level, fields, message), as `declaration/controller.test.js:132-142` does. Each extended test's title states the log line it now proves.

**`check-answers/controller.test.js`**
- A draft's incomplete Continue gives exactly one `info` entry with `journeyId`, the draft status, the incomplete reason and the outstanding keys. Red if the log line on the 400 branch (section 2, `post` `:150-157`) is removed. It extends the refusal test at `:238` through `driveHandler`'s returned entries.
- The same for an amend's incomplete Continue, with the amend status. It extends `:481` through `driveHandler`.
- The submitted-notification test at `:255` keeps its hand-built request (decision 14). After the GET, the request's entries equal `[]`. After the forged POST, they hold exactly one `info` entry with `journeyId` and the submitted reason. Red without the log line at `:146-148`.
- A normal GET render of a complete notification and a complete Continue to the declaration each give an entry list equal to `[]`, through `driveHandler`. They prove acceptance criterion 4, and are red if a log line is placed on the render path or the success path.

**`cancel-amend/controller.test.js`**
- GET on a draft and POST on a submitted notification each give exactly one `info` entry with `journeyId`, their status and the not-amending reason. Red without the log lines on `:55-57` and `:65-67`. It extends `:121`.
- GET and POST from a session that does not hold the journey each give exactly one `info` entry with the ownership reason. Each toolkit's recorded cookies equal `{}`, which proves that the caller's session adopted nothing. The amendment stays untouched. Red without the kit guard's log line. The cookie assertion is red if the guard moves after the first read. It extends `:140`, uses `stubH(request)` in place of `adoptingH`, and drops the comments at `:156` and `:160`. The unknown-journey test (`:168`) asserts the same entry and the same empty cookie map.
- The recoverable backend failure gives exactly one `warn` entry with `journeyId` and an `err` that is the recoverable backend error. Red without the log line in `kit.recoverableSave`. It extends `:177`.
- The confirmation render for an amending journey and a successful cancel each give `[]`. It extends `:88` and `:105`.

**`delete-notification/controller.test.js`**
- GET and POST on an already-deleted journey each give exactly one `info` entry with the deleted status and the cannot-delete reason. Red without the log lines on `:50` and `:58-60`. It extends `:86`.
- The ownership refusal works as for cancel amend: one entry each, and recorded cookies equal to `{}`. It extends `:98` and uses `stubH(request)`.
- The recoverable failure logs one `warn` with `err` and `journeyId`. It extends `:118`.
- A normal render and a successful delete each give `[]`. It extends `:58` and `:72`.

**`commodity-type/controller.test.js`** (and any test naming the concept): the rename of decision 19 covers test titles and variables that use the dropped-lines vocabulary. No assertion changes.

The other `recoverableSave` callers keep their existing tests. Each already passes a request that carries `recordingLogger` through `journeyRequest`, and the 500 re-render tests stay green with the request now passed.

There is no integration proof in the tests repo (decision 15).

## 5. Invariants to prove

| # | Proves | Check | Expected |
|---|---|---|---|
| 1 | Criteria 1 and 4 | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/controller.test.js` | passes |
| 2 | Criteria 2 and 4 | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/controller.test.js` | passes |
| 3 | Criteria 3 and 4 | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test -- src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/controller.test.js` | passes |
| 4 | Local test-helper copies are gone | `grep -rn "adoptingH" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src` | no output |
| 5 | Comments describing other modules are gone from the lifecycle controllers | `grep -rn "state.get adopts" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets` | no output |
| 6 | Programme invariant (a Welsh draft beside every English string): this change touches no copy | `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend diff --name-only main -- src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/copy src/server/app/sets/high-risk-plants/journeys/linear/features/delete-notification/copy` | no output |

## 6. Increment-specific checks beyond the gate

| Check | Proves | Expected |
|---|---|---|
| `grep -rnE "^[[:space:]]*//" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/shared/kit.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/engine/test-support.js` | Decisions 17 and 18: no inline comments are left in kit or test support | no output |
| `grep -rnE "^[[:space:]]*//" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/details/details.controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/list/list.controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/place-of-destination/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignor-select/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/origin/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/controller.js` | Decision 19: no inline comments are left in the edited callers | no output |
| `grep -rn "/\*\*" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/details/details.controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/list/list.controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/place-of-destination/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/consignor-select/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/origin/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/party-edit/party-edit.controller.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/controller.js` | Decisions 10 and 19: no doc comments are left on internal helpers or `meta` | no output |
| `grep -rn "linesDroppedBy\|Hardcoding\|plugins/auth.js" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app` | Decisions 17-19: the bad-example name, the history narration and the other-module comment are gone | no output |

## 7. Out of scope

- `check-answers/refusal.js`, including its doc comment at `:21-22`, which names its callers. This change does not edit that file.
- The unreachable falsy redirects (decision 16).
- Any FIT or E2E spec.
- The plants backend.
- The animals frontend's `test-support.js` and `kit.js`. This row builds plants only. The animals `stubH` doc comment (`:49-50`) has the same gap the plants one is fixed for, and the animals `driveHandler` gains no returned log entries. Both are left for the animals twin's own change (section 14).
- Any copy or template.
- Logging for successful transitions (decision 8).
- Test files of the twelve other callers, beyond the rename vocabulary in commodity type.

## 8. Spec sync

None. The Behaviour Spec records what a user, operator or other system sees on a page or through an API. No `plants/` capability states log output, and none should (`openspec/config.yaml`). The comment deletions and renames change no behaviour. Where decision 19 deletes a comment because "the spec states it", the spec text is unchanged.

Every refusal and redirect this change logs keeps the target and status it already has, and those behaviours are already spec'd:
- `plants/journey-pages/check-your-answers`: the requirements "An unfinished draft names every unfinished card and links to it" and "An amendment that is not yet ready opens without an error and refuses Continue with one";
- `plants/notification-lifecycle`: cancel amend and delete.

No coverage link changes.

## 9. Homes

| New thing | Home | Goes through |
|---|---|---|
| Ownership guard and its reason value | `shared/kit.js`, beside `routeOptions` (`:17`) and `pageRoutes` (`:296`) | `isKnownJourney`, `engine/journey.js:135` |
| Reason maps (check answers, cancel amend, delete) | each feature's `controller.js`, exported | the shape of `DECLARATION_REFUSAL`, `declaration/controller.js:51-54` |
| Recoverable-fallback log line and required request argument | `kit.recoverableSave`, `shared/kit.js:262` | the existing catch branch at `:269-271` |
| Cookie recording on `stubH` | `engine/test-support.js:51` | the animals twin's `stubH` cookie map, `repos/trade-imports-animals-frontend/src/server/app/engine/test-support.js:53,70-76` |
| Log entries returned by `driveHandler` | `engine/test-support.js:152-158` | `recordingLogger`, `:64-75` |
| Ownership rationale | `docs/persistence.md`, `:43-47` | — |
| Rationale moved out of `kit.js` | `docs/architecture.md`, "Shared controller support" (`:119-135`) | — |
| Rationale moved out of the twelve callers | `sets/high-risk-plants/docs/features.md`, new "Page decisions" section | — |

Departure from stated design: `architecture.md:176-177`, "A validation 400 that re-renders the page does not log". It is narrowed, not broken (decision 4). `frontend.md:103`: see section 14.

## 10. Rule owners

| Rule | Owner |
|---|---|
| A journey the session does not hold is refused to the dashboard and logged | the new guard in `shared/kit.js`. Plants only; no twin is built. |
| A recoverable backend failure re-renders at 500 and is logged with its error | `kit.recoverableSave`, `shared/kit.js:262` |
| Check answers refuses Continue for an incomplete notification, and refuses a submitted one back to the read-only page, logging which | `check-answers/controller.js` `post` |
| Cancel amend is offered only while amending; otherwise it redirects and logs | `cancel-amend/controller.js` (`nonAmendTarget` plus the logging branch) |
| Delete is offered only for a draft, submitted or amending notification; otherwise it redirects and logs | `delete-notification/controller.js` `deletable` |

## 11. Test support

`engine/test-support.js` gains two things:
- `stubH` records cookies set and unset in the animals twin's shape (decision 12). The ownership tests assert that map exactly.
- `driveHandler` returns the request's recorded log entries (decision 13).

Promoting the cookie map deletes both local `adoptingH` copies and their comment blocks: `cancel-amend/controller.test.js:38-46` and `delete-notification/controller.test.js:33-41`.

Check answers' log assertions for the draft refusal, the amend refusal, the normal render and the complete Continue use `driveHandler`'s returned entries. One test keeps its hand-built request: the submitted-notification test at `check-answers/controller.test.js:255` (decision 14). It drives GET and then POST against one submitted journey through one request, which `driveHandler` neither runs nor seeds, and it reads that request's `logger.entries` directly. The cancel amend and delete tests already build their requests with the shared `journeyRequest` and keep doing so, because their set-up (`startAmend`, `records.create`) is not a `driveHandler` seed.

## 12. Docs this makes untrue

Grep: `grep -rn -i "does not log\|logs once\|isKnownJourney\|adoptingH\|recoverableSave\|driveHandler\|stubH\|records what the handler\|reports the answers" ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/engine/test-support.js ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/shared/kit.js ~/git/defra/trade-imports-workspace/docs/best-practices/node/testing/frontend.md`

- **`src/server/app/engine/test-support.js:49-50`, the `stubH` doc comment** ("A response toolkit that records what the handler rendered…"). It must also name that the toolkit records the cookies the handler sets and unsets.
- **`src/server/app/engine/test-support.js:123-125`, the `driveHandler` doc comment** ("…reports the answers before and after…"). It must also name that the result carries the request's recorded log entries.
- **`sets/high-risk-plants/docs/add-a-field.md:133`, `add-a-page.md:123` and `add-a-section.md:156`, the save steps** that tell an implementor to wrap the write in `kit.recoverableSave()`. Each must state that the call is given the request, so that a page built from the recipe logs its recoverable fallback against the journey and does not fail on `request.logger`. `add-a-collection.md` has no `recoverableSave` step (grep), so it stays true.
- **`src/server/app/docs/architecture.md:176-177`.** It must state that a 400 re-render refusing the whole notification logs, and that only a payload field's validation 400 stays silent.
- **`src/server/app/docs/architecture.md:121-130`.** The kit list must name the ownership guard and state that `recoverableSave` takes the request.
- **`src/server/app/docs/architecture.md:170-178`.** It must state that the recoverable-save fallback logs the error and `journeyId` at its owner.
- **`src/server/app/docs/architecture.md`, "Shared controller support"** must state the facts decision 17 moves out of `kit.js`.
- **`src/server/app/docs/persistence.md:43-47`.** It must state the adoption-then-ownership fact moved out of the deleted comments.
- **`sets/high-risk-plants/docs/features.md`** must hold the page rationale decision 19 moves out of the callers.
- **Workspace repo, `docs/best-practices/node/testing/frontend.md:107`.** Today it lists `state` among `driveHandler`'s options and a five-key result for both repos, but plants takes no `state`. It must state each repo's options and result: `state` in animals, and the returned log entries in plants. Line `:103` stays as it is, and the per-repo difference is stated on the row (section 14).
- **Workspace repo, `docs/best-practices/node/testing/frontend.md:110`** ("records the view, redirect and cookies") becomes true for plants once `stubH` records cookies (decision 12), so it needs no change.
- **The four recipes' logging paragraphs** (`add-a-field.md:269-270`, `add-a-page.md:360-361`, `add-a-section.md:381-382`, `add-a-collection.md:469-470`) stay true. A field or page the recipes add fails payload validation, which still does not log.
- **Stale or rule-breaking code comments, deleted:**
  - `cancel-amend/controller.js:31-33`
  - `delete-notification/controller.js:27-29`
  - `check-answers/controller.js:46-49` and `:70-72`
  - the comments over both `adoptingH` copies, and `cancel-amend/controller.test.js:156` and `:160`
  - `shared/kit.js`: `:19-24`, `:78`, `:93`, `:101-102`, `:153-155`, `:163-166`, `:174-179`, `:191-195`, `:215-216`, `:217-220`, `:242-244`, `:249-250`, `:336-337`, `:340-342` (decision 17)
  - `engine/test-support.js`: `:5-6` and `:110` (decision 18)
  - every comment decision 19 lists, in the ten callers that have them

## 13. Operability

| Branch | Level | What the line must let support find |
|---|---|---|
| Check answers, Continue refused at 400 | info | `journeyId`, the status (draft or amend), the incomplete reason, the outstanding error keys |
| Check answers, Continue on a submitted notification redirected back | info | `journeyId`, the submitted reason |
| Cancel amend, GET or POST on a journey not being amended | info | `journeyId`, its status and the not-amending reason. The status tells support which target it went to. |
| Delete, GET or POST on a journey that cannot be deleted | info | `journeyId`, its status, the cannot-delete reason |
| Kit guard, the session does not hold the journey | info | `journeyId`, the ownership reason |
| `kit.recoverableSave`, recoverable backend failure re-rendered at 500 | warn | `{ err }` and `journeyId` |

No line logs a request or response body.

## 14. Departures from written rules

- **`docs/best-practices/node/testing/frontend.md:103`: "Both frontends have this file with the same exports."** The exports stay the same by name in both repos, and `stubH` comes into line with the twin (decision 12). `driveHandler` departs in two ways: plants returns the request's log entries and animals does not, and animals takes `state` and plants does not. Reason: this row builds plants only, and check answers' log tests need the entries without copying `driveHandler`'s body. The difference is written on the guide row at `:107`, so the guide states each repo's shape truthfully. The animals twin gains the returned entries when one of its own changes asserts a log line.
- `architecture.md:176-177` is narrowed with a documented reason rather than broken (decision 4). It is not a departure.

## 15. Reachability

Every new log line sits on a branch reachable today:
- Draft and amend incomplete Continue, and the forged submitted Continue, are covered by existing tests.
- A non-amending cancel amend and a deleted journey's delete are reachable by URL and covered by existing tests.
- A foreign session is covered by existing tests.
- A backend 503 is covered by existing tests.

The `stubH` cookie map is read by the ownership tests, and `driveHandler`'s returned entries by check answers' tests. Plants `driveHandler` gains no `state` option, because nothing in this change passes one. The falsy restored and deleted redirects cannot be reached and get nothing (decision 16).

## 16. Standards

Read each in full:
- `.claude/rules/code-quality.md`
- `.claude/rules/node.md`
- `docs/best-practices/node/code-style.md`
- `docs/best-practices/node/hapi.md`
- `docs/best-practices/node/testing/frontend.md`
- `docs/best-practices/node/pino-logging.md` (the rules point to it for logging)
- `docs/best-practices/doc-comments/BEST_PRACTICES.md`
- `docs/best-practices/doc-comments/jsdoc.md`
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
