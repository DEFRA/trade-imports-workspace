# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-827
**All repos in scope:** trade-imports-animals-frontend, trade-imports-plants-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #332 | **Commit:** d74e5b6

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Eight a page, pagination over eight, links carry q/page/selected, past-last serves last | animals ✅, plants ✅ | ✅ live-animals REQ-ADDR-017, plants REQ-PLANTS-ADDR-002, plants journey-pages specs | CONSISTENT |
| "Selected address: <name>" inset | animals ✅, plants ✅ | ✅ REQ-ADDR-011, REQ-PLANTS-ADDR-012 | CONSISTENT |
| Paging links carry the trail | animals ✅, plants ❌ | Specs say "search term, the page and the address already chosen" — trail not stated | Spec silent; plants code fault recorded in plants check |
| Scenario: page past the last page serves the last | animals code + test ✅, plants code + test ✅ | live-animals ✅ SCN-ADDR-017-E; plants ❌ stated in REQ-PLANTS-ADDR-002 text but no scenario | INCONSISTENT |
| Scenario: every page holds only the role's addresses (ticket AC 4) | animals ✅, plants ✅ (`describePaging` walks every page) | live-animals ✅ SCN-ADDR-017-D; plants ❌ no paging scenario (SCN-PLANTS-CONSIGNOR-001-B covers consignor only) | Suspicious |
| Scenario: a submitted search starts at page 1 | animals ✅ test, plants ❌ test | plants REQ text ✅, no scenario; live-animals REQ text ❌ silent | Suspicious |
| Coverage test titles match the service repos | — | ❌ 4 links to an ins-tests title that does not exist (below) | INCONSISTENT |
| DR 2.1 backlog/sources corrected | — | ✅ req-594, req-595, c-094 (both copies), inc-087 criteria, ruling source + precedence | CONSISTENT, with one stale title (below) |

## Missing Changes

1. **Coverage cites an ins-tests title that does not exist.** `openspec/coverage/live-animals/addresses/coverage.json` (3 rows: the search-narrows, clear-search and SCN-ADDR-011-A rows) and `openspec/coverage/live-animals/journey-pages/consignment-addresses/coverage.json` (1 row) now cite "the picker searches within the role, and the row ticked is the one that saves, named above the results on reopening and checked once its page is shown". ins-tests at 9c67c82 still names it "the picker searches within the role, lists every match on one page, and the row ticked is the one that saves, shown checked on reopening with nothing between the search box and the results heading" (`tests/animals/e2e/features/address-book/addresses-picker.spec.ts:52`). Must: each coverage link names a test that exists. One way: rename the test in ins-tests (preferred — its old title is untrue), then run `tim spec lint`.
2. **Plants spec lacks the scenarios animals has.** REQ-PLANTS-ADDR-002's text states "a page past the last page MUST serve the last page" and "A submitted search MUST start again at the first page", with no scenario for either; the plants code has a test for the first (`paging-test-support.js` "Should serve the last page, logged once…") and none for the second. Animals has SCN-ADDR-017-E. Must: every MUST in the requirement has a scenario linked to a test. One way: add SCN-PLANTS-ADDR-002-I (past the last page) linked to the `describePaging` test, and -J (search starts at page 1) once plants has that test.

## Unique Changes

- `themes/consignment-parties/backlog.json` adds `"theme": "consignment-parties"` to the row before inc-087 (line ~129). Unrelated to paging; harmless but outside the ticket's scope — confirm it is intended.
- `workareas/shared/design-release-2-1/` changes (ruling, sources, requirements, conflicts, reconciled, backlog) are this repo's alone, as the ticket asks.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `openspec/specs/live-animals/addresses/spec.md` REQ-ADDR-017 vs `openspec/specs/plants/addresses/spec.md` REQ-PLANTS-ADDR-002 | One rule worded two ways: animals "shows eight of the role's addresses a page", plants "shows eight matches a page"; animals omits the search-starts-at-page-1 sentence plants has, though both frontends implement it. | One rule, mirrored in each twin. | Add "A submitted search MUST start again at the first page" to REQ-ADDR-017 (animals has the test "Should start a search again at the first page" to link). |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `workareas/shared/design-release-2-1/themes/consignment-parties/backlog.json` inc-087 `title` | "Role-filtered party pickers on one page" | The detail and criteria now say eight a page. | The row states current behaviour. | "Role-filtered party pickers, eight a page". |
| same file, inc-087 `detail` | "…and the high-risk plants frontend's consignor and place of destination pickers…" | req-594/req-595 now name the consignment contact picker too, and it pages. | Row and requirements agree. | Add "and consignment contact" where the detail describes paging, or say paging applies to all three. |
| `openspec/coverage/live-animals/addresses/coverage.json` (clear-search row) | cites fit test "clearing the search and searching with nothing entered lists every consignor address again, on one page" | That animals test now asserts the first page of eight. | Title true and link kept in step. | Update after the animals retitle (see animals check). |
| `openspec/coverage/plants/journey-pages/consignment-contact-select/coverage.json` (2 rows) | cite ins-tests "searches the address book, lists every match on one page, …" | Contact picker pages at eight. | As above. | Update after the ins-tests retitle (see ins-tests check). |
| `openspec/specs/live-animals/addresses/spec.md:282-286`, `openspec/specs/plants/addresses/spec.md:114-118`, `openspec/specs/plants/journey-pages/place-of-destination/spec.md:68` | "Clearing the search restores the (role's) whole list … the whole list is shown again" | The first page of the whole list is shown, counted against the whole list. | Then-clause states what is shown. | "…the role's whole list is restored, from its first page" (place-of-destination's requirement line already says "from its first page"). Low. |

Searched (`openspec/specs/`, `openspec/coverage/`, `docs/`, `workareas/shared/design-release-2-1/`): `on one page`, `one page`, `no pagination`, `nothing restating`, `nothing between the search`, `whole list`, `every one of them`, `every address … one page`, and every new coverage `test` string against the service repos. The INS address book's "no pagination" lines are a different list and correct.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 9 inconsistencies found
**Summary:** The specs and DR 2.1 sources now say the pickers page, but four coverage links cite an ins-tests title that was never renamed, plants lacks the past-last-page and search-reset scenarios animals has, and a few titles and "whole list" Then-clauses still read as one page.
