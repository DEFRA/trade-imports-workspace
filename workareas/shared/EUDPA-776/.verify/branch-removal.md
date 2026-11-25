# EUDPA-776: is the branch address removed everywhere?

Read-only check, 2026-11-25. Review clones at PR heads: address-book #29 `b0a8ef9`, ins-frontend #88 `ace0aa7`, ins-tests #115 `5cdbcb0`, performance-tests #47 `fadea7a`, animals-frontend #487 `be02547`, workspace #274 `9950666c`. Repos outside the PR set read at `origin/main` in `repos/`.

## Verdict

**The code is consistent. The data and two docs are not.** The address-book PR removes `BRANCH_ADDRESS` and `RoleGroup.BRANCH` (`AddressRole.java:9-19`, `RoleGroup.java:3-6`, README:153-192, `addresses.yml:862`). That matches the INS frontend's roles, types and tabs (`services/address-book/address-types.js:1-46`), the ins-tests constants, seed and specs, the perf-tests code (`src/lib/address-book.js`), the animals frontend's parties (`addresses/parties.js:10-38`), and the openspec `ins/address-book` spec and coverage. No code in any clone still sends, filters by or seeds `BRANCH_ADDRESS`.

What is missing is a plan for addresses already stored with `BRANCH_ADDRESS`. After the PR, the service cannot read them. `main`'s ins-tests seed and specs, and `main`'s perf-tests, wrote them into the shared e2e and perf organisations in every long-lived environment. Two consumers, the animals and plants frontends, list an organisation's book with no role filter. Their party pickers will therefore return a 500 for any organisation that holds one such address. The PR body says only "No data migration. Addresses already stored with `BRANCH_ADDRESS` are not converted." It does not say they break reads, and it does not say they must be deleted. The ticket's "no migration because not live" reasoning (ticket.md:39) covers drafts with a `consignment` party, not addresses.

## References left in the clones

| Repo | file:line | Reference | Must go? | In PR? |
|---|---|---|---|---|
| trade-imports-workspace | `docs/repos/trade-imports-address-book.md:13` | "at least one of the six roles … groups (…; branch address)" | **Must go**: five roles, two groups | Yes (#274), not changed |
| trade-imports-performance-tests | `README.md:89` | "…; and the Branch tabs narrowed to each of its roles…" | **Must go**: the code seeds two tabs now | Yes (#47), not changed |
| trade-imports-workspace | `.claude/skills/prototype/references/hand-off.md:257` | `--link <design branch address>` | Fine (a git branch URL) | n/a |
| trade-imports-address-book | `ApiContractComplianceIT.java:408-440`, `Problem.java:8` | "anyOf branch refs" | Fine (schema `anyOf` branches) | n/a |
| trade-imports-ins-tests | `tests/plants/e2e/features/arrival.spec.ts:52` | "offers both branches" | Fine (question branches) | n/a |
| trade-imports-workspace | `openspec/coverage/ins/address-book/coverage.json:805`, `ins/notification-type/coverage.json:107,109,133`, `ins/authentication/coverage.json:205` | "wording branch", "return branch", "on this branch" | Fine (code branch or git branch) | n/a |
| trade-imports-workspace | `tim/src/stack/*`, `docker/stack/AGENTS.md` | `--branch`, branch tags | Fine (git branch) | n/a |
| trade-imports-plants-frontend (not in set) | `origin/main:src/server/app/services/address-book/stub/index.js:19` | `national-inspection-authority…|BRANCH_ADDRESS` stub record | **Should go**: a role the service no longer has, `STUB_MODE` only | No |
| trade-imports-plants-backend, -stub, -animals-backend, -ins-backend, -animals-admin (not in set) | none at `origin/main` | none | n/a | n/a |
| trade-imports-plants-prototype | not cloned under `repos/`, not checked | inherits the plants-frontend stub on its next `sync:upstream` | Follows the plants-frontend fix | No |
| workspace stack (`tim/src/stack/`, `docker/stack/`) | none | Mongo staging is `10-database-setup.js` only. No tests-repo address seed is staged (`stage-init-scripts.js:15-46`) | n/a | n/a |

None of the PR clones has any other `BRANCH_ADDRESS`, `Branch address`, `BRANCH` type or Branch tab.

## Runtime data: where `BRANCH_ADDRESS` addresses come from, and what happens to them

### Where they come from

`main` wrote them through the address-book API. Nothing seeds them through Mongo.

- **ins-tests `main`, the shared e2e organisation.** `flows/shared/address-book-seed.ts:20-40,107-108` creates "Animal and Plant Health Agency" and "Riverside Distribution Centre" with `heldAsBranchAddress` on every global setup. `tests/ins/e2e/features/address-book/run-addresses.ts:34-36`, `addresses-add-handshake.spec.ts:183-218` and `tests/animals/e2e/pages/contact-address.spec.ts:117-180` create more per run. These records sit in the CDP dev and test address-book Mongo, and the reset tool runs against them (`bin/reset-e2e-address-book.ts:13-16`).
- **perf-tests `main`, the perf trader organisation.** `src/lib/address-book.js:23` (`[ADDRESS_TYPES.BRANCH]: ['BRANCH_ADDRESS']`) made readiness add a "Perf Test Holding" Branch record (README:89). It is in the CDP perf-test environment and any local stack the perf suite ran against.
- **INS frontend `main`'s Branch tab and add form, the contact-address handshake (`journey-registry.js:37`).** Any address a person added as Branch in dev or test.
- **Local stack.** Mongo keeps its data across `tim docker up` and restarts. Only `tim docker down` passes `--volumes` (`tim/src/stack/down.js:55-56`). CI starts clean.
- **Not sources:** `compose/mongo/10-init.js` (empty template), the address-book's own resources and tests (no Branch left), the ins-frontend stub and typed seed in the PR, the animals-frontend stub in the PR, trade-imports-stub. The plants-frontend stub is in-memory `STUB_MODE` only.
- **TTL does not clear them.** `application.yml:27-31` sets `ADDRESS_TTL_DAYS` empty and expiry disabled by default.

### What the service does at `b0a8ef9`

- `Address.roles` is `List<AddressRole>` (`Address.java:52`). No custom converter or reading converter is registered for it (the only `@Document`s are `Address` and `Transporter`, and `MongoConfig` declares no converters). Spring Data MongoDB's `MappingMongoConverter` reads an enum element with `Enum.valueOf`. For `"BRANCH_ADDRESS"` that throws `IllegalArgumentException: No enum constant …AddressRole.BRANCH_ADDRESS`. This is standard Spring Data behaviour, read from the code; no test here shows it.
- `GlobalExceptionHandler.java:137-149` turns any `RuntimeException` into **500 `internal-error`**.
- **List and search:** `AddressListQueryImpl.listLiveAddresses` (`:27-36`) maps every ACTIVE document the query matches (`OrganisationScopedListQuery.java:43`). With no `roles` filter, every list or search for that organisation whose page includes the record is a 500. A role filter for a real role never matches a Branch-only document, so a filtered list is safe. The one-group rule means a Branch address held no other role.
- **GET, PUT and DELETE by id:** all three load the document first (`AddressService.java:140-141, 158-162, 182-185`), so all return 500. **The record cannot be deleted through the API.** Neither the INS frontend's delete page nor `npm run reset:e2e-address-book` can remove it. The reset tool's own unfiltered list (`bin/reset-e2e-address-book.ts:145`, `listAddressesOnEveryPage('')`) fails first.
- There is no migration, no tolerant reader (such as dropping unknown roles on read) and no test that proves either behaviour.

### Who hits the 500

- **trade-imports-animals-frontend (PR #487):** `services/address-book/client.js:38-43` sends only `page`, `pageSize` and `q`. `index.js:51-55` filters by role in memory. Every live-animals party picker for the e2e organisation fails in CDP dev and test until the Branch records are gone.
- **trade-imports-plants-frontend (`main`):** `client.js` `listAddresses` sends only `page`, `pageSize` and `q`, and `index.js:19` filters in memory. The consignor, destination and contact pickers fail the same way. So does the perf-tests plants journey (`src/k6/high-risk-plants.js:40,166`) in an organisation holding a Branch record.
- **INS frontend (PR #88):** the list always sends roles (`list.controller.js:200-206`), so it is safe. Viewing, editing or deleting an old Branch address by id (a bookmark, a cross-user link) still returns 500.
- **ins-tests:** `ensureE2eAddressBook` searches unfiltered by each fixture's name (`address-book-seed.ts:154`). No current fixture name is a substring of the Branch records' fields, so it gets through. Any animals or plants e2e that opens a picker for the e2e organisation goes red on CDP.

## Consumers that would now get a 400

None. Asking for `roles=BRANCH_ADDRESS` or `searchRoles=BRANCH_ADDRESS` now gets a 400 (`MethodArgumentTypeMismatchException`, `GlobalExceptionHandler.java:66`), and so does a body with that role (`AddressRoleNamesValidator`). Only the INS frontend's `main` sent it (Branch tab, contact handshake), and PR #88 removes that. The animals and plants frontends never send a role to the service. ins-backend, animals-backend, plants-backend, trade-imports-stub and animals-admin have no reference at `origin/main`. ins-tests and perf-tests at PR head send none.

Deploy-order caveat: if the address-book deploys before ins-frontend #88, the old INS Branch tab and contact handshake get 400s, or 500s for stored records. Deploy together, INS frontend first or at the same time.

## Gaps

1. **Critical.** Stored `BRANCH_ADDRESS` addresses in CDP dev, test and perf-test (e2e and perf organisations) make every unfiltered list, and every get, update or delete of that record, return 500. That breaks the animals and plants party pickers and the e2e reset tool. The records cannot be deleted through the API. **Must:** before or with the address-book deploy, either delete every address with `roles: "BRANCH_ADDRESS"` from the `addresses` collection in each CDP environment and in local stacks (`tim docker down`), stated as a deploy step in the PR, or make the reader tolerate an unknown stored role, with a test.
2. **Major.** The address-book PR body says "No data migration … not converted" but not that such records break reads and must be removed, and the ticket's not-live reasoning (ticket.md:39) covers drafts only. **Must:** the PR description, and item #32's resolution, say stored Branch addresses must be deleted and where (environments, organisations), or name the tolerant-reader change that makes deletion unnecessary.
3. **Major.** No test pins what the service does with a stored unknown role. **Must:** an `AddressListIT` or `AddressGetIT` case that inserts a raw document holding a removed role name and asserts the chosen behaviour (tolerated, or the documented 500).
4. **Minor.** `docs/repos/trade-imports-address-book.md:13` (workspace #274) still says "six roles" and lists a branch-address group. **Must:** say five roles in two groups (sending; receiving).
5. **Minor.** `trade-imports-performance-tests/README.md:89` (#47) still describes "the Branch tabs". **Must:** describe the two tabs the readiness seed now covers.
6. **Minor.** The plants-frontend stub (`origin/main:src/server/app/services/address-book/stub/index.js:19`), outside the PR set, holds a `BRANCH_ADDRESS` record. Its contact picker takes any role, so it still works, but the stub models a role the service refuses. **Must:** give the record a real role or none, on the same branch name, or record in item #32 why plants is left out.
7. **Minor.** Item #32 asked for "a test that BRANCH_ADDRESS is refused as an unknown role". The PR relies on the generic unknown-role cases (`AddressRequestValidationTest.java:127-146`). **Must:** either add the case, or record in #32 that the generic unknown-role test is the proof (the house rule prefers positive assertions over naming removed values).
8. **Minor.** Deploy order. **Must:** ins-frontend #88 deploys no later than address-book #29, said in both PRs.
