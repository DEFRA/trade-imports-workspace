# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #133 | **Commit:** b73a5d0

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `consignment` party removed from the notification | animals-frontend ✅ (`direct-fields.js` no longer writes it), ins-tests ✅ (seed no longer posts it) | ✅ `NotificationBase.consignment` removed, `NotificationService` no longer copies it | CONSISTENT |
| `exchangedDocument.issuer` removed from the GBN-AG event | gateway ✅ (`ExchangedDocument.issuer` removed), schemas ✅ (`gbn-ag-v1` property removed), ins-tests ✅ (`outbox-event-notification.spec.ts:94` asserts undefined) | ✅ `ExchangedDocument.issuer` removed | CONSISTENT |
| Deploy order backend vs gateway | gateway drops `issuer` from a record annotated `@JsonIgnoreProperties(ignoreUnknown = false)` | backend still emits `issuer` until #133 ships | SEE NOTE (gateway file) |
| Docs updated for the removed field | schemas ✅ (`pims-data-mapping.md`, data dictionary), workspace ✅ (`gbn-ag-field-lineage.md`) | ❌ `docs/design-notes.md:123` still describes `issuer` | INCONSISTENT |

Deploy order: the backend dropping `issuer` first is safe for the current gateway (`issuer` is a nullable record component there). The reverse order (gateway first, old backend still sending `issuer`) is analysed in the gateway check; in production the gateway uses Spring Boot's auto-configured `ObjectMapper`, which does not fail on unknown properties, so it is most likely safe too.

## Missing Changes

- `docs/design-notes.md:123` keeps "`exchangedDocument.issuer` is the consignment contact: the person responsible for the consignment." The schemas repo and the workspace lineage doc both say issuer is no longer sent; this repo's own design notes do not.

## Unique Changes

- `.github/dependabot.yml`: removes `versioning-strategy: increase`. Not part of EUDPA-776's scope (no other repo in the PR set changes Dependabot config). Suspicious as scope creep; move to its own PR or justify in the PR description.
- Ticket Tech Notes say remove `TradeParty.from(ConsignmentParty)`. Kept, and correctly: it is still used for consignor, consignee, place of origin, destination, importer (`SpecifiedConsignment.java:29-33`) and permanent address (`TradeProductInstance.java:38`). Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/test/java/.../utils/NotificationTestData.java:37` | `consignments()` is now referenced nowhere (every caller was removed in this PR). Dead helper named after the removed party. | Gone | Delete `consignments()` |
| `src/test/java/.../outbox/gbnag/GbnAgMapperTest.java:329` | `shouldOmitIssuerKey_whenNoConsignmentContact` names a condition that can no longer vary: there is never a consignment contact. | Name says what is now true | `shouldNeverWriteAnIssuerKey` |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/design-notes.md:123` | "`exchangedDocument.issuer` is the consignment contact: the person responsible for the consignment." | The event carries no `issuer`; no consignment contact is collected. | States the new behaviour | "The event carries no `exchangedDocument.issuer`: the contact address page is out of the journey (EUDPA-776)." |
| `src/main/java/.../notification/ConsignmentParty.java:9-10` | Javadoc: "A party on a notification — consignor, consignee, importer, place of origin, destination or the consignment contact." | No consignment contact party exists. | Comment gone or corrected | Drop "or the consignment contact"; add "or an animal's permanent address" (`AnimalIdentifier.permanentAddress` uses it) |

*Searched: `consignment contact`, `ConsignmentParty`, `getConsignment()`, `issuer`, `contactAddress`, `contact address` in `src/`, `docs/`, `README.md`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 5 inconsistencies found
**Summary:** The code change matches the gateway, schemas and frontend, but `docs/design-notes.md` and the `ConsignmentParty` Javadoc still describe the consignment contact as the issuer, a test helper and a test name are left over from it, and an unrelated Dependabot change rides along.
