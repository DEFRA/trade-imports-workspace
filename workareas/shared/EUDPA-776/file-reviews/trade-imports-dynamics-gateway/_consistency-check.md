# Consistency Check: trade-imports-dynamics-gateway

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #35 | **Commit:** 9e3e3ac

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ExchangedDocument.issuer` removed from the inbound GBN-AG record | backend ✅ (`outbox/gbnag/ExchangedDocument`) | ✅ `notification/outbox/gbnag/ExchangedDocument` | CONSISTENT |
| PIMS v0.4.0 without `issuer` | schemas ✅ (`gbn-ag-pims-v0.4.0.schema.json`, `-changes.md`) | ✅ `PimsEventV4`, `pims/gbnagv4/*`, `Pims*MapperV4`, listener stream `"0.4.0"`/`"-v4"` | CONSISTENT |
| v0.3.0 sends no `issuer` | schemas ✅ (`pims-data-mapping.md` "From PIMS v0.4.0") | ✅ `PimsGbnAgDataMapperV3` passes `null`; `PimsEventMapperV3Test`, `PimsPayloadMapperTest` assert absent | CONSISTENT |
| Per-version copies excluded from Sonar CPD | — | ✅ `pom.xml:27` globs (`gbnag*`, `PimsEventV*`, `Pims*MapperV*`) already cover v4 | CONSISTENT |
| Schema version list `0.1.0…0.4.0` known to consumers of `service_bus_forwarded` / `notification.message` | perf-tests ❌ `src/config/eventing.js:16` `SCHEMA_VERSIONS = ['0.1.0', '0.2.0']` (missing 0.3.0 already, now 0.4.0 too) | ✅ publishes 4 versions | INCONSISTENT (pre-existing, widened) |
| Repo docs updated for the new version | schemas ✅ README | ❌ `README.md`, `docs/notification-pipeline.md`, `docs/observability.md` still say three versions | INCONSISTENT |

### Lead verified: deploy order with `@JsonIgnoreProperties(ignoreUnknown = false)`

`outbox/gbnag/ExchangedDocument.java:6` is `@JsonIgnoreProperties(ignoreUnknown = false)`. If this PR ships before backend #133, the old backend still sends `exchangedDocument.issuer`.

- `NotificationSqsListenerTest.java:248` (`receive_shouldThrowNonRetryable_whenBodyContainsUnknownField`) shows an unknown field is a non-retryable failure, but that test builds its own mapper: `objectMapper = new ObjectMapper().registerModule(new JavaTimeModule())` (`:59`). A plain `ObjectMapper` fails on unknown properties.
- In production the listener and `PimsPayloadMapper` inject Spring Boot's auto-configured `ObjectMapper` (Spring Boot 3.5.15; no `ObjectMapper` bean, no `Jackson2ObjectMapperBuilder` customiser, no `spring.jackson.*` in `src/main/resources`). Spring Boot turns `FAIL_ON_UNKNOWN_PROPERTIES` off, and `ignoreUnknown = false` does not turn it back on: it only declines to force ignoring.

So the reported risk is most likely not real in production: an old-backend `issuer` would be dropped silently. What is inconsistent is that the unit test models a stricter parser than production runs, so the test suite cannot tell you either way. **Must:** prove the deploy order rather than infer it — an integration test through the Spring context (`NotificationSqsListenerIT`) that posts an event still carrying `exchangedDocument.issuer` and asserts it is forwarded, or ship backend #133 first and say so in both PR descriptions.

## Missing Changes

- `README.md:68`, `docs/notification-pipeline.md:14-18,24`, `docs/observability.md:32,48` are not in the diff but describe the version set and `issuer` (see below).
- perf-tests `src/config/eventing.js:16` `SCHEMA_VERSIONS` should list every version this gateway counts on `service_bus_forwarded`/`notification.message` (`0.3.0` and now `0.4.0`), or say why it reads only the first two. Pre-existing for 0.3.0, widened by this PR.

## Unique Changes

- Whole v4 package of 24 records, 5 mappers and `PimsEventV4` — deliberate per-version copies, as `notification-pipeline.md:17` prescribes. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| — | v4 names follow the v2/v3 pattern exactly (`PimsCommonMapperV4`, `PimsGbnAgDataMapperV4`, `pims/gbnagv4`, `-v4` message-id suffix, `"0.4.0"` tag). | — | No change |

*None identified.*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:68` | "forwards each external event to Azure Service Bus as PIMS v0.1.0, v0.2.0 and v0.3.0" | Also v0.4.0. | States four versions | "…as PIMS v0.1.0, v0.2.0, v0.3.0 and v0.4.0" |
| `docs/notification-pipeline.md:14` | "Each external event is published three times, as PIMS v0.1.0, v0.2.0 and v0.3.0 … `-v2` or `-v3` appended. All three go to the same session" | Four times; `-v4` too. | States four | Add v0.4.0 and `-v4`, "All four" |
| `docs/notification-pipeline.md:15` | "A v0.2.0 or v0.3.0 mapping or publish failure is logged…" | v0.4.0 behaves the same. | Includes v0.4.0 | "A v0.2.0, v0.3.0 or v0.4.0 …" |
| `docs/notification-pipeline.md:17-18` | Lists `pims/gbnag…gbnagv3`, `PimsEventV1…V3`, `Pims*MapperV3`, "`PimsCommonMapperV2` and `PimsCommonMapperV3`" | v4 package, event and mappers exist. | Lists v4 | Add `pims/gbnagv4`, `PimsEventV4`, `Pims*MapperV4`, `PimsCommonMapperV4` |
| `docs/notification-pipeline.md:24` | "v0.3.0 adds all three: the issuer is the consignment contact…" | v0.3.0 now sends no issuer; v0.4.0 has no `issuer` at all. | States the new behaviour | "v0.3.0 defines an optional issuer, which the gateway now leaves empty; v0.4.0 drops it (see `gbn-ag-pims-v0.4.0-changes.md`)." |
| `docs/observability.md:32` | `schema.version` (`0.1.0`, `0.2.0`, `0.3.0`); "a failed 0.2.0 or 0.3.0 send is logged and not retried" | `0.4.0` is a fourth value with the same failure rule. | Lists 0.4.0 | Add `0.4.0` to both |
| `docs/observability.md:48` | "event id with `-v2` or `-v3` appended for 0.2.0 and 0.3.0" | `-v4` for 0.4.0 too. | Includes `-v4` | Add it |

*Searched: `issuer`, `v0.3.0`, `0.3.0`, `three`, `V3`, `consignment contact`, `contact address` in `README.md`, `docs/`, `src/` (Javadoc and test names).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 9 inconsistencies found
**Summary:** The v0.4.0 publisher and the `issuer` removal match backend and schemas, but three docs still describe three versions and the issuer as the consignment contact, perf-tests reads only two of the four schema versions, and the deploy-order safety rests on a unit test whose strict `ObjectMapper` does not match the Spring one production uses.
