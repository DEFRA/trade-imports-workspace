# Consistency Check: trade-imports-address-book

**Ticket:** EUDPA-776
**All repos in scope:** trade-imports-address-book, trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-dynamics-gateway, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-schemas, trade-imports-workspace
**PR:** #29 | **Commit:** b0a8ef9

This is the refresh check for the newly added PR. The other repos' checks from the first review stand. Note that the ins-frontend check from the first review ("every repo keeps the Branch address type ... CONSISTENT") describes an earlier state: the PR heads now remove Branch everywhere in the PR set, as the table shows. Workspace item #32 owns the cross-repo Branch decision.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `BRANCH_ADDRESS` role removed (ticket AC "The address book has no branch address") | ins-frontend #88 ✅ (role, `ADDRESS_TYPES.BRANCH`, tab, add-page controls and tests gone); ins-tests #115 ✅ (seed fixtures and constants gone); performance-tests #47 ✅ (`src/lib/address-book.js:154` `[ADDRESS_TYPES.BRANCH]` and its test gone); animals-frontend #487 ✅ (references removed); no PR head adds `BRANCH_ADDRESS` back (checked every `.diffs/*.diff` for `+` lines) | ✅ `AddressRole.BRANCH_ADDRESS` and `RoleGroup.BRANCH` removed; README, `addresses.yml`, `api-contract.locked.yaml` and the `AddressRequest` schema text updated | CONSISTENT |
| Grep of every PR-head clone for `BRANCH_ADDRESS`, `ADDRESS_TYPES.BRANCH`, `branchAddress`, `branch address` (excluding `workareas/` and review history) | Only `trade-imports-workspace/docs/repos/trade-imports-address-book.md:13` (see Statements Made Untrue). `.claude/skills/prototype/references/hand-off.md:257` "design branch address" is a git branch URL, not this concept | None outside `docs/review/EUDPA-58-review.md` (point-in-time history, not a statement of current behaviour) | INCONSISTENT (workspace doc) |
| Repos outside the PR set (`git grep BRANCH_ADDRESS origin/main`: stub, plants-frontend, plants-backend, plants-prototype, ins-backend, animals-admin, reference-data, routing-proxy, defra-id-stub) | plants-frontend: `src/server/app/services/address-book/stub/index.js:19` seeds `national-inspection-authority|...|GB|BRANCH_ADDRESS` into its in-process address-book stub, and `consignment-contact-select/controller.test.js:72` titles a test "a record carrying only the branch-address role". All others: none | n/a | SUSPICIOUS (see Missing Changes) |
| Stored data with the removed role | ins-frontend main (`address-types.js`, `typed-seed.js`) and ins-tests main (`flows/shared/address-book-seed.ts`) wrote `BRANCH_ADDRESS` records into dev/test Mongo; their PRs stop writing them but nothing removes the ones already stored | No migration, tolerant converter or recorded clean-up step (no Mongock or other migration tooling in `pom.xml` or `src/`) | INCONSISTENT — already raised as Critical in the per-file reviews of `AddressRole.java` and `AddressListIT.java`; not repeated as a new item here |

## Missing Changes

- **trade-imports-plants-frontend (not in the PR set), `src/server/app/services/address-book/stub/index.js:19`.** Its in-process address-book stub holds a record with role `BRANCH_ADDRESS`, a value the real address book now refuses with a 400 on create and cannot read back. The stub is meant to stand in for this API, so it now answers with a role the API cannot hold. The plants contact picker asks for no role (`consignment-contact-select/controller.test.js:72`), so no request breaks, and the plants contact page is out of the ticket's scope. Flag to workspace item #32: either the stub record carries a role the address book still has (or none), with its test title changed to match, or #32 records why plants keeps it.

## Unique Changes

- Removing an enum value and a `RoleGroup` is unique to this repo, as expected: it owns the role vocabulary. The other repos only consumed it, and each consumer in the PR set drops it.
- The test substitutions replace `BRANCH_ADDRESS` with existing roles (`CONSIGNOR`, `PLACE_OF_ORIGIN`, `PLACE_OF_DESTINATION`, `IMPORTER`). Three of them weaken what their tests prove (`AddressListIT.java:254`, `:278`, `:287`); the per-file review of `AddressListIT.java` already carries these as Major items.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `trade-imports-plants-frontend` `src/server/app/services/address-book/stub/index.js:19`, `.../consignment-contact-select/controller.test.js:72` (origin/main) | One concept, two vocabularies: the address book's roles are now `PLACE_OF_ORIGIN`, `CONSIGNOR`, `PLACE_OF_DESTINATION`, `CONSIGNEE`, `IMPORTER` (`AddressRole.java:11-19`), but the plants stub of the same API still uses `BRANCH_ADDRESS` and a test title names "the branch-address role" | The plants stub uses only roles the address book has, or workspace item #32 records why it keeps Branch | Change the stub row's role to one the book has (or leave it empty) and retitle the test, on the same `feat/EUDPA-776-*` branch name if it joins this change |

No Branch or branch-address wording is left in this repo's code, tests, README, `docs/openapi/`, `src/main/resources/` or seed data (`compose/mongo/10-init.js` is the empty template). `RoleGroup` now has `SENDING` and `RECEIVING` only, and every `AddressRole` names one of them.

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `trade-imports-workspace` `docs/repos/trade-imports-address-book.md:13` (PR head 9950666) | "`roles` ... holds at least one of the six roles. The service refuses roles from more than one group (place of origin and consignor; consignee, importer and place of destination; branch address)." | There are five roles in two groups: place of origin and consignor; consignee, importer and place of destination. | The page states five roles and two groups | Edit the sentence in workspace PR #274: "holds at least one of the five roles ... (place of origin and consignor; consignee, importer and place of destination)" |
| `trade-imports-plants-frontend` `src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select/controller.test.js:72` (origin/main, not in PR set) | Test title "Should list a record carrying only the branch-address role" | The address book has no branch-address role | The title names a role the address book has, or #32 records that plants keeps it | Retitle with the stub row's new role (see Naming and Reuse) |

*Searched in the PR-head clone of this repo (`README.md`, `AGENTS.md`, `docs/**/*.md`, `docs/openapi/*.yml|yaml`, `src/main/**` including Javadoc and `@Schema` text, `src/main/resources/`, `src/test/**` test titles and fixtures, `compose/`): `BRANCH_ADDRESS`, `BRANCH`, `Branch`, `branch address`, `contact address`, `trader's own`, `RoleGroup`, `one group`, `three groups`, `six roles`, `contact`. Across the other PR-head clones: `BRANCH_ADDRESS`, `ADDRESS_TYPES.BRANCH`, `branchAddress`, `branch address`, and the word `branch` in workspace `openspec/`, ins-frontend `src/` and ins-tests `tests/`. Across repos outside the PR set on `origin/main`: `BRANCH_ADDRESS`, `branch address`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found (workspace `docs/repos/trade-imports-address-book.md:13` still lists six roles and a branch group; plants-frontend's address-book stub and one test title still use `BRANCH_ADDRESS`, for workspace item #32)
**Summary:** The address book drops `BRANCH_ADDRESS` cleanly and every consumer in the PR set drops it too, with no branch wording left in this repo, but the workspace's address-book page still describes six roles and three groups, and the plants frontend's stub (outside the PR set) still holds the removed role.
