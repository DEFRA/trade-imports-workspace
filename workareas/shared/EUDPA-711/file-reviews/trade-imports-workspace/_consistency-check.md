# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #196 | **Commit:** ed9e3c4

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Address book stores `roles`, refuses mixed groups and receiving roles outside the UK, stores no type | address-book README + `AddressRequest` ✅ | ✅ `docs/repos/trade-imports-address-book.md:13-14`, spec REQ-INS-ADDR-037 | CONSISTENT |
| INS front door: type step, three tabs, Type filter, `roles` question, `fields.js` | ins-frontend routes and docs ✅ | ✅ `docs/repos/trade-imports-ins-frontend.md:17-18` | CONSISTENT |
| Behaviour spec and coverage name the tests as they are now called | ins-tests new animals handshake tests linked ✅ | ✅ `openspec/coverage/ins/address-book/coverage.json` | CONSISTENT |
| Prototype skill reference describes the real address book's types and roles | ins-frontend `address-type/`, `add/`, `address-book-tabs.js` ✅ | ✅ `.claude/skills/prototype/references/fake-a-service/address-book-pages.md:160-172` | CONSISTENT with ins-frontend; the prototype repo's own contract is not (see Statements Made Untrue) |
| `docker/stack/AGENTS.md` happy-eyeballs fix wording | animals/plants set it in `startServer`; ins-frontend in `index.js` via `connect-attempt.js` | ✅ wording made shape-neutral ("Fix it once for the whole process: call …") | EXPECTED (the shape divergence itself is flagged on ins-frontend's check) |

## Missing Changes

*None identified* within this PR's files. One out-of-scope repo carries the old model: `trade-imports-plants-prototype` (not in this review; exempt from branch parity per CLAUDE.md rule 2) — see Statements Made Untrue.

## Unique Changes

- `workareas/shared/design-release-2-1/*` (backlog, deferred, snagging, plan inc-067): programme state for the theme, intentionally committed under `workareas/shared/`.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `openspec/coverage/ins/address-book/coverage.json` (21 `notes` say "uses", 3 say "roles"; e.g. "red-probed: fails when the search uses are not sent", "fails when the mapper drops the uses") | The spec this file covers (REQ-INS-ADDR-037 and the add-form requirements) and every repo say `roles`/`searchRole`; the coverage notes still say "uses"/"search uses". One concept, two names across spec and coverage. | Should — notes use the spec's word | Replace "uses" with "roles" and "search uses" with "search roles" in the notes |
| `workareas/shared/design-release-2-1/themes/address-book/backlog.json` (inc-067 `detail`, 2026-11-03 ruling note naming `USES_BY_ADDRESS_TYPE` and `addressTypeOfUse`) | Names the frontend's constants by their pre-rename names; built code is `ROLES_BY_ADDRESS_TYPE` and `addressTypeOfRole`. | Could — historical notes; fix only if the row is read again for building | Append "(since renamed `ROLES_BY_ADDRESS_TYPE`, `addressTypeOfRole`)" |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `workareas/shared/design-release-2-1/snagging.md:85` (S-09, added in this PR) | "`copy.en.js` `uses.legendByAddressType`" | The key is `roles.legendByAddressType` (ins-frontend `copy.en.js:108`) | States the current key | Rename to `roles.legendByAddressType` |
| `workareas/shared/design-release-2-1/snagging.md:101` (S-11, added in this PR) | "`copy.en.js` `list.uses` … and `uses.options`" | Keys are `list.roles` and `roles.options` | States the current keys | Rename both |
| `workareas/shared/design-release-2-1/deferred.md:30` (added) | Edit sends back "the stored (absent) type and uses … (`fields.js` `storedTypeAndUsesOf`)" | The API stores no type; the helper is `storedRolesOf` (`fields.js:53`) and sends only `roles` | States the current behaviour and name | "…sends back the stored (absent) roles … (`fields.js` `storedRolesOf`)" |
| `workareas/shared/design-release-2-1/deferred.md:31` (added, status Open) | "the address book accepts a create or update whose uses do not belong to its type"; "the API refuses `addressType` or `uses`" | The API now refuses roles from more than one group (`RolesHeldTogether`) and ignores `addressType`; there is no `uses` field | The first item is marked done, the field names corrected | Strike the first item as done by `RolesHeldTogether`; say `roles` for `uses` |
| `workareas/shared/design-release-2-1/deferred.md:28` (added) | address-book `AddressType`'s `@Schema` description; "the list's filter form sends an empty `use=`" | No `AddressType` class exists in address-book; the list's filter parameter is `role` (`list.controller.js:142`) | States the current names, or marks the item gone | Drop the `AddressType` item; `use=` → `role=` |
| `workareas/shared/design-release-2-1/deferred.md:33` (added, status Open) | "give the INS stub's seed addresses (`buildSeedAddress`, `TYPED_SEED`) a type and uses, as the API now requires" | Done: `stub.js:31` and `typed-seed.js` give every seed `roles` | The item is marked done | Strike that item |
| `workareas/shared/design-release-2-1/deferred.md:27` (added) | Security patch "Done in ins-frontend (`7d7ac76`) and plants-frontend (`17611f2`) … pinned by overrides" | ins-frontend has the overrides (`package.json:127-132`); plants-frontend's `package.json` has no `@hapi/content` or bell/catbox-redis joi override (it holds the same locked versions without them) | States what plants actually has | Say plants reached the versions by lock resolution, or add the overrides there |
| `workareas/shared/design-release-2-1/deferred.md:34` (added) | "ins-frontend was fixed in the theme review" (no `vi.mock` of own `get-oidc-config`) | ins-frontend still mocks it in `src/auth/refresh-tokens.test.js:13`, `src/auth/verify-token.test.js:17`, `src/plugins/auth.test.js:13` | States the remaining files | List the three files as still to do |
| `workareas/shared/design-release-2-1/themes/address-book/plans/inc-067.md:46,93` | INS `startServer` "gains the same setting, the same way" in `start-server.js` | Built as `common/helpers/connect-attempt.js` called from `src/index.js` | Plan matches the build, or the build matches the plan | Resolve with the ins-frontend finding, then align the plan line |
| `repos/trade-imports-plants-prototype/src/server/app/services/ins-address-book/contract.json:55-100` (outside this review) | `fields` and the create `example` carry no `roles`; `openQuestions` asks "Does the address book need anything a design adds, such as categories or usages?" | The real address book requires `roles` on create and update, and this PR's `address-book-pages.md:160-172` now tells designers to copy its types and roles | The prototype contract states the API as it now is | NO_JIRA chore in the prototype repo: add `roles` to `fields` and the example, drop the answered open question |

*Searched: `uses`, `usages`, `use=`, `USES_BY_ADDRESS_TYPE`, `addressTypeOfUse`, `storedTypeAndUsesOf`, `tickUses`, `AddressType`, `addressType`, `categories`, `has no types`, `address-schema`, `startServer`, `TYPED_SEED`, `overrides` — in `docs/repos/*.md`, `docs/best-practices/`, `docker/stack/AGENTS.md`, `.claude/skills/prototype/**`, `openspec/specs/**` and `openspec/coverage/**`, the design-release-2-1 workarea docs, and the plants prototype's `ins-address-book` service.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 12 inconsistencies found
**Summary:** The repo pages and spec match the shipped roles model, but the programme's snagging and deferred notes (and the coverage notes) still name pre-rename `uses` keys and helpers, list several items as open that the PR has done, and the plants prototype's address-book contract still describes an API without roles.
