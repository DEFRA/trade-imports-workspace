# Consistency Check: trade-imports-ins-backend

**Ticket:** EUDPA-307
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-tests, trade-imports-ins-backend, trade-imports-workspace
**PR:** #5 | **Commit:** 5d50e20d3de546ed6d4ee5b062f753d64341d89e

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `OutboxEventType` gains the same 5 new constants, same wire-value strings | trade-imports-animals-backend ✅ (source of the enum, also carries `schemaUrl`) | ✅ Present — `NOTIFICATION_CREATED`, `NOTIFICATION_AMENDMENT_REQUESTED`, `NOTIFICATION_AMENDMENT_CANCELLED`, `NOTIFICATION_DELETED`, `NOTIFICATION_SUBMISSION_DELETED`, matching wire-value strings | CONSISTENT |
| `OutboxEventTypeTest.fromWireValue_*` — one round-trip test per new constant | trade-imports-animals-backend ✅ (schemaUrl-assertion equivalent per constant) | ✅ 5 new tests, one per constant | CONSISTENT |
| Catch-all invariant test over every enum constant | trade-imports-animals-backend ✅ `allEventTypes_haveCorrectNamespacePrefix` asserts every `OutboxEventType.values()` wire value starts with the shared prefix | ❌ Not present — only the 5 individual `fromWireValue_*` tests were added, no equivalent sweep over `OutboxEventType.values()` | INCONSISTENT (minor) |
| Listener dispatch test — one test per new event type | trade-imports-animals-backend: has emission-side IT coverage per event type | ✅ `NotificationSqsListenerTest.receive_delegatesToUpsertService_for*` — one per new event type | CONSISTENT |

## Missing Changes

- **`OutboxEventTypeTest` — namespace-prefix invariant test.** `trade-imports-animals-backend`'s `OutboxEventTypeTest` added `allEventTypes_haveCorrectNamespacePrefix`, a single test that iterates `OutboxEventType.values()` and asserts every wire value starts with `uk.gov.defra.imports.notification.` — a regression guard against a future enum addition forgetting the prefix. This repo's `OutboxEventTypeTest` added only the 5 individual `fromWireValue_*` round-trip tests and has no equivalent catch-all. Low severity (the individual tests already pin the exact strings), but worth adding for parity and to guard the next addition.

## Unique Changes

- `NotificationSqsListenerTest.receive_delegatesToUpsertService_for*` — five new tests confirming the listener resolves each new `OutboxEventType` and delegates to `upsertService.upsert(...)`. This is specific to this repo's role as the SQS consumer and has no analogue expected elsewhere.
- The listener (`NotificationSqsListener.receive`, unchanged by this diff) dispatches every recognised event type generically to `upsertService.upsert(parsedBody)` — there is no per-event-type branching (e.g. no distinct handling for the two new delete events vs. the create/amend events). Whether the aggregation store's upsert logic needs to special-case `NotificationDeleted`/`NotificationSubmissionDeleted` (e.g. to mark/remove the aggregated record rather than upsert it) is a correctness question for the aggregation logic itself, not a cross-repo consistency gap — flagging for the correctness reviewers rather than adjudicating here.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found (minor — missing test)
**Summary:** The enum and dispatch-test coverage mirror the source repo correctly; the only gap is a missing catch-all namespace-prefix invariant test that the backend repo added but this repo did not.
