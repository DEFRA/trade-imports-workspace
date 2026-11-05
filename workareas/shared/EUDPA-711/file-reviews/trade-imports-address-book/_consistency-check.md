# Consistency Check: trade-imports-address-book

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #20 | **Commit:** b18192a

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `roles` required on create/update (`@NotEmpty`, six `AddressRole` names) | ins-frontend form + client + stub ✅, ins-tests API client/seeds ✅, performance-tests `addAddressAnswers` ✅, animals-frontend + plants-frontend lighthouse seed ✅ (`roles: ['PLACE_OF_ORIGIN']`) | ✅ `AddressRequest.roles` | CONSISTENT |
| Role names `PLACE_OF_ORIGIN`, `CONSIGNOR`, `PLACE_OF_DESTINATION`, `CONSIGNEE`, `IMPORTER`, `BRANCH_ADDRESS` | ins-frontend `ROLES` ✅, ins-tests `addressRoles` ✅ | ✅ `AddressRole` | CONSISTENT |
| List params `role` / `searchRole` (repeatable) | ins-frontend `client.js` `listAddresses` ✅, ins-tests `address-book-api-client.ts` ✅ | ✅ controller + `operators.yml` | CONSISTENT |
| One-group rule and receiving-roles-in-UK rule | ins-frontend `stub.js` `refusalsOf` mirrors both, same messages ✅ | ✅ `RolesHeldTogether`, `ReceivingRolesInTheUnitedKingdom` | CONSISTENT |
| Branch addresses UK-only | ins-frontend `addressTypeRequiresUnitedKingdom` includes BRANCH (address-book add only) | `RoleGroup.BRANCH(false)`: any country | EXPECTED — README "Role rules" and the workspace deferred row state the consignment contact is a branch address that may be abroad |
| Required-roles error message 'Select what this address can be used for' | ins-frontend `copy.en.js` `errors.roles.required` ✅, stub ✅, ins-tests `rolesQuestion.error` ✅ | ✅ | CONSISTENT |
| Workspace repo page describes `roles`, list params, no stored type | workspace `docs/repos/trade-imports-address-book.md` ✅ | README ✅ | CONSISTENT |

## Missing Changes

*None identified.* Every caller that creates addresses through the API was checked: ins-frontend (form, stub, lighthouse seed), ins-tests (API client, `flows/shared/address-book-seed.ts`), performance-tests (`src/lib/address-book.js`), the animals and plants lighthouse seeds. The animals and plants frontends' `services/address-book/client.js` only read (GET), so they need no change. No Mongo seed fixture in ins-tests holds address documents.

## Unique Changes

- `Operator*` classes renamed to `Address*` (`OperatorController`/`Mapper`/`Repository` deleted, `OperatorService` → `AddressService`, `OperatorResponse` → `AddressResponse` and so on). Intentional tidy, confined to this repo; no other repo referenced the Java names. See Naming and Reuse for where the rename stopped.
- `JacksonConfig.camelCaseNamingStrategy()` made `public` (used by tests). Intentional.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/main/java/.../address/AddressController.java:110,233,284,350,397`; `AddressService.java:80` | The `Operator` → `Address` rename stops at the metric names: `@Timed("controller.listOperators.time")`, `createOperator`, `getOperator`, `updateOperator`, `deleteOperator`, and `meterRegistry.timer("controller.listOperators.query.time")`, beside an `AddressController`/`AddressService` whose operationIds are `list-addresses`, `create-address` etc. One concept, two names across layers. | The metric names say Address, or a comment-free reason (a dashboard or alert reading them) is recorded in the repo's docs | Rename to `controller.listAddresses.time` etc. in the same change, after checking no CDP Grafana dashboard/alert reads the old names; otherwise note in `README.md` that the metric names keep the old `Operator` prefix for dashboard continuity |
| `docs/openapi/operators.yml` (`README.md:257,259`; `src/test/.../testsupport/ApiDocs.java:16`) | Same stopped rename: the generated spec of an API with no "operator" left in it is still `operators.yml`. | Should — file name matches what it holds, or is left with reason | `git mv docs/openapi/operators.yml docs/openapi/addresses.yml` and update `ApiDocs.COMMITTED_ARTIFACT`, README:257/259 and `docs/repos/trade-imports-address-book.md` in the workspace |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/openapi/api-contract.locked.yaml:275` (added in this PR) | list `400`: "an unknown address type, use or search use, or a missing org header" | The list takes `role` and `searchRole`, and no address type: `AddressController.java:90` and `operators.yml:252` both say "an unknown role or search role" | The locked contract states the new behaviour | Replace with "An out-of-range or non-numeric page or page size, an unknown role or search role, or a missing org header" so it matches the controller and generated spec |

*Searched: `uses`, `usages`, `searchUse`, `use=`, `address type`, `addressType`, `no roles`, `without roles`, `Operator`, `operators`, `type and uses`, `category` — in README.md, docs/openapi/*, Javadoc and line comments under src/main, and test names under src/test. README:161 ("a body that still sends `addressType` has it ignored") was checked against `AddressCrudIT.java:97` and spec REQ-INS-ADDR-037 and is still true; the `@Null` refusal of `type`/`role` is a separate rule documented in the `AddressRequest` Javadoc.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 3 inconsistencies found
**Summary:** The roles contract is carried consistently by every caller, but the locked contract's list-400 description still speaks of "address type, use or search use", and the Operator→Address rename stops at the metric names and the `operators.yml` file name.
