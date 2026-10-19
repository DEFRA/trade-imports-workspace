# Code-quality branch: what changes in each repo

Branch `chore/NO_JIRA-code-quality-factory`, 12 repos, all PRs open against `main`. Most of the diff is tidy-up. The table below lists every change a reviewer has to think about. Everything else is in the next two sections.

## Changes that alter behaviour

| Repo | What changes | Risk / what to check |
|---|---|---|
| All 7 Java services | 4xx handlers in `GlobalExceptionHandler` pass the exception to `log.warn`, so every 4xx now logs a stack trace | Log volume on noisy 4xx paths. Validation messages can carry rejected values. Only address-book strips them (see below) |
| All 7 Java services | `ProxyConfig` redacts `user:pass@` from a malformed `HTTP_PROXY` before logging, and logs the exception class, not its message | Safer. Check the regex in `redactCredentials` against the new `ProxyConfigTest` cases |
| All 7 Java services | `Dockerfile` copies `config/` into the build and dev-run stages, because Checkstyle now runs in Maven | Without it the image build fails. animals-backend and ins-backend run Checkstyle at `validate`, so a violation also stops a local compile and the dev-run hot reload. The other five run it at `verify` |
| All 7 Java services | Exceptions are chained (`new X(msg, ex)`) and `log.error(..., e)` replaces `e.getMessage()`. A duplicate error log before a rethrow is gone from TLS start-up | Stack traces now reach the logs. One log line per failure, not two |
| animals-backend | INFO logs on every state-changing notification route now include `userId`. `DELETE /notifications` logs the full reference-number list, not a count. New WARN line when the outbox lock is busy and the write retries | `userId` is an identifier in logs: confirm that is acceptable. The bulk-delete line can get long |
| ins-backend | Address lookup no longer logs the response body (addresses) at INFO. A non-2xx body is still logged. The Authorization scheme and token length are still logged at INFO | Removes personal data from INFO. Check the refusal log is still wanted |
| ins-backend | SQS error handler logs `aggregateId`, `messageId` and the throwable. The retryable path now logs a stack trace at WARN. The TLS success line reports the real certificate count (0 or 1) | More WARN volume during retries |
| address-book | Validation WARN logs field names only, never rejected values. Other 4xx log the throwable | Personal data out of logs. `GlobalExceptionHandlerTest` proves it through a new `CapturedLogs` helper |
| dynamics-gateway | ASB send failures log `messageId`, `sessionId` and the throwable. The retry/delete handler logs the aggregate id. `ExternalCallMetrics` takes an injected clock (second constructor, `@Autowired` on the original) | Check the bean still wires. PIMS `schemaUrl` was renamed `schemaUri` and `@JsonProperty` dropped. The JSON name is unchanged, and `NotificationSqsListenerIT` asserts it |
| reference-data | The "unknown MDM traffic" WARN moved from `PortType` to `PortOfEntry`. It now fires once per port and traffic pair (was once per traffic value) and names the port. A failed external call's INFO line now carries the throwable | More WARN lines on start-up if MDM has many odd ports |
| animals-frontend, plants-frontend | `catchAll` logs a 5xx once as `{ err, statusCode, … }` with "Request failed", not a stack string plus a "Caused by" line. Animals logs the cause as `err` and adds `dataset`. Plants logs the Boom as `err` and adds `journeyId` | Animals loses the outer Boom stack when a cause exists. In plants, check the pino serialiser prints the nested `cause` |
| animals-frontend, plants-frontend | New INFO lines: each declaration refusal (journey id, reason, both concurrency tokens) and each stale-token save refusal | New log lines with no personal data. Reason names are in the exported `DECLARATION_REFUSAL` |
| animals-frontend, plants-frontend | Test env var renamed to `PERSISTENCE_IT_MODE` (was `LIVE_ANIMALS_IT` / `HIGH_RISK_PLANTS_IT`) | Anyone still setting the old name runs against stubs without warning. Nothing in CI or the workspace sets it |
| animals-frontend | `allowMissing: kit.isHubExit(request)` removed from additional details, transit countries and transporters. The commit says those pages have no required rule, so it did nothing | Check that claim, or "Save and return to overview" with a blank answer starts refusing |
| plants-frontend | Reference-data 503s are now built by one `referenceDataUnavailable(dataset, cause)` helper. The browser-test accessibility check adds WCAG 2.1 and 2.2 AA tags | The stricter axe tags may fail a page that passed before |
| ins-frontend, animals-admin | A failed webpack-manifest read logs `{ err }` with "Could not read Webpack …" (was "… not found", no error). ins-frontend logs a failed metrics flush instead of dropping it | Log text changed: check any alert keyed on the old message |
| ins-tests | Plants specs reach pages through `PlantsJourney` `to*` methods. `completeNotification` now walks via `toDestinationOfNewNotification`. `PLANTS` constant renamed `PLANTS_FOR_PLANTING`. Several test titles reworded | Same assertions (expect lines +3/−3), different route to the page. Renamed titles break any `--grep` or report filter on the old wording |
| All 12 | New lint rules fail `npm run lint` (Node) or `mvn verify` (Java) | A future comment or test title with a ticket key fails CI |

## The same change in every repo

| Change | What it does | Repos |
|---|---|---|
| Comment sweep | Removes ticket keys, backlog/ruling ids, release names, session words and before/after history from comments, test titles and API descriptions. Rationale comments are deleted, and where a commit says so the reasoning moves to docs (listed per repo below) | All 12 |
| `AGENTS.md` | Short "Code quality" section: the house rules, with `.claude/rules/code-quality.md` in the workspace as canonical text | All 12 |
| Node lint plugin | `eslint-rules/code-quality.js` (317 lines, same file everywhere) with tests: `no-tracking-references`, `no-silent-catch`, `no-message-only-error-log`. animals-frontend and plants-frontend also get `no-set-vocabulary` on the platform layer. All but ins-tests get a `lint:templates` script that checks Nunjucks comments | ins-tests, animals-frontend, plants-frontend, ins-frontend, animals-admin (ins-tests has no template check) |
| Checkstyle | `config/checkstyle/code-quality.xml` with an empty `suppressions.xml`: no ticket ids in comments, test titles or method names, no `getMessage()`-only warn/error logs, and no `Thread.sleep` in tests | All 7 Java services |
| Log the throwable | `log.warn/error(..., e)` instead of `e.getMessage()` | All 7 Java services |
| Proxy redaction + `ProxyConfigTest` | See table above | All 7 Java services |
| `COPY config` in Dockerfile | See table above | All 7 Java services |
| `h` for the hapi toolkit | `toolkit` renamed `h` throughout | animals-frontend, plants-frontend |
| Metrics `.catch` | Background metrics calls log `{ err }` where they start, not swallowed with `.catch(() => undefined)` | animals-frontend, plants-frontend, ins-frontend |

## Per repo

### trade-imports-ins-tests (27 files, +610 −751)
- Plants spec-local walks (origin, arrival, destination) move into `flows/plants/journey.ts` as `to*` methods. Commodity types, lines and the address-book record are defined once.
- Animals specs: narrating comments removed, two titles reworded. `domain/animals/models` lose comments only.
- README: running against CDP from a laptop needs `CDP_LOCAL=true` and `DEVELOPER_API_KEY`.
- Review focus: `flows/plants/journey.ts`, `tests/plants/e2e/features/destination.spec.ts`.

### trade-imports-animals-frontend (166 files, +1574 −1407)
- 5xx logging, declaration and stale-save refusal logs, env var rename, `allowMissing` removal (see table).
- `eslint-suppressions.json` baselines 5 existing `no-set-vocabulary` hits in `services/`.
- Rationale moved to `src/server/app/docs/architecture.md`, `services.md` and the live-animals set docs (`page-design.md` +119 lines, the `add-a-*` recipes).
- Shared test helpers: `recordingLogger`, `chooseAutocompleteByLabel`. Transporter copy test asserts exact keys.
- Review focus: `common/helpers/errors.js`, `features/declaration/controller.js`, `shared/kit.js`.

### trade-imports-plants-frontend (97 files, +1920 −2102)
- Same logging changes as animals, plus `journeyId` on 5xx logs.
- `fit/high-risk-plants-journey.js` (+243) becomes the one owner of browser-test steps and the axe check. Most `.fit.spec.js` files shrink to use it.
- Late-rule text and notification date each get one owner (`review/late-rule.js`, `review/notification-date.js`), shared by check answers and confirmation.
- Rationale moved to `src/server/app/docs/architecture.md` (+112) and the high-risk-plants set docs.
- Review focus: `common/helpers/errors.js`, `fit/high-risk-plants-journey.js`, `check-answers/controller.js`.

### trade-imports-ins-frontend (19 files, +710 −121)
- Most lines are the lint plugin and its tests.
- Metrics flush failure now logged. Manifest read error logged with `err`. `recordExternalCall` and `UNMAPPABLE` no longer exported (no importers).
- Address-lookup spike rationale moved to the README and `src/server/app/docs/features.md`.
- Review focus: `src/server/common/helpers/external-call-metrics.js`.

### trade-imports-animals-admin (10 files, +627 −11)
- Lint plugin and tests, plus manifest-read error logging (with a test that throws a real read error).
- Lint config rationale moved to the README.
- Review focus: `src/config/nunjucks/context/context.js`.

### trade-imports-animals-backend (28 files, +382 −513)
- `userId` on state-changing route logs, full reference list on bulk delete, outbox-lock retry WARN.
- Checkstyle runs at `validate`.
- Rationale moved to `docs/design-notes.md` (+62). Tests drop rationale comments, and their titles now match their assertions.
- Review focus: `NotificationController.java`, `GlobalExceptionHandler.java`, `NotificationService.java`.

### trade-imports-plants-backend (13 files, +249 −157)
- Common Java changes only. `PersistedTimestampZoneIT` loses its narrative comments.
- Rationale moved to `docs/architecture.md` (+27).
- Review focus: `GlobalExceptionHandler.java`, `Dockerfile`.

### trade-imports-ins-backend (27 files, +400 −345)
- Address lookup body no longer logged. Spike wording removed from the API docs and log text. Interceptor lambdas become named methods.
- `NotificationErrorHandler` logs ids and the throwable, with a new test. TLS start-up logs once.
- Checkstyle runs at `validate`. Rationale moved to `docs/architecture.md` (+62).
- Review focus: `AddressLookupClient.java`, `NotificationErrorHandler.java`, `TrustStoreConfiguration.java`.

### trade-imports-address-book (32 files, +322 −215)
- Validation logs field names, not values. New `testsupport/CapturedLogs.java`.
- Ruling ids removed from the OpenAPI (`docs/openapi/operators.yml`) and `@Schema` descriptions: text only, no contract change.
- Rationale moved to the README (+11).
- Review focus: `GlobalExceptionHandler.java`, `GlobalExceptionHandlerTest.java`.

### trade-imports-dynamics-gateway (56 files, +318 −319)
- ASB and SQS error logs carry message ids and the throwable. Injected clock in `ExternalCallMetrics`.
- `schemaUrl` renamed `schemaUri` throughout. DLQ constants renamed to say what they hold.
- Most of the 56 files are one-line comment removals in the PIMS mappers and records. Rationale moved to `docs/notification-pipeline.md` (+39) and the README.
- Review focus: `QueueMessageSender.java`, `PimsEventMetadata.java`, `ExternalCallMetrics.java`.

### trade-imports-reference-data (19 files, +309 −154)
- Unknown-traffic WARN moved and made per-port, with a new `PortOfEntryTest`. Failed external call logs the throwable.
- Rationale moved to the README (+17).
- Review focus: `PortOfEntry.java`, `ExternalCallMetrics.java`.

### trade-imports-stub (16 files, +233 −122)
- Common Java changes only. The `application*.yml` changes are comment removals: no config values change.
- Rationale moved to the README (+15).
- Review focus: `ProxyConfig.java`, `application.yml`.
