# Design Release 2.1 combined review branch

`feat/NO_JIRA-design-release-2-1-combined` holds every Design Release 2.1 theme together, so the business and
engineering reviews read one branch. It is a review branch only. **Never merge it.** Each theme merges to `main`
through its own pull requests; close these once they have.

## Pull requests (all draft, all "do not merge")

| Repo | Pull request | Head on 12 October |
|---|---|---|
| animals frontend | [#405](https://github.com/DEFRA/trade-imports-animals-frontend/pull/405) | `25b65c18` |
| animals backend | [#108](https://github.com/DEFRA/trade-imports-animals-backend/pull/108) | `6dbcfcf` |
| INS frontend | [#52](https://github.com/DEFRA/trade-imports-ins-frontend/pull/52) | `b64c5ae` |
| plants frontend | [#99](https://github.com/DEFRA/trade-imports-plants-frontend/pull/99) | `3b06ece` |
| tests | [#27](https://github.com/DEFRA/trade-imports-ins-tests/pull/27) | `1d0c2b7` |
| stub | [#23](https://github.com/DEFRA/trade-imports-stub/pull/23) | `7b2b1d6` |
| reference-data | [#30](https://github.com/DEFRA/trade-imports-reference-data/pull/30) | `daff240` |
| performance tests | [#19](https://github.com/DEFRA/trade-imports-performance-tests/pull/19) | `4c3c649` |

## How it was built

Each repo's branch starts at `origin/main` and merges, in order: journey foundation (EUDPA-691), reference lists
(EUDPA-692), then commodities and import reason (EUDPA-693), arrival and transit (EUDPA-694) and origin page
(EUDPA-695), then overview and review (EUDPA-696).

Checked with `git branch -r --no-merged` against 696 in every repo, not assumed:

- `main` had not moved since the themes branched, in any repo.
- Overview and review (696) already contained the first five themes in every repo, so the merge of 696 was a
  fast-forward from `main`.
- One exception: in the tests repo, reference lists had one commit 696 lacked (`f510245`, which made three
  reference-list tests reopen Main reason for import through the overview). It was merged in with `--no-ff`.

Type question and templates (EUDPA-690) is not in yet. It is still building on Sam's second laptop. See
"Templates" below.

## Conflict log

| Repo | File | Resolution | Why |
|---|---|---|---|
| tests | `tests/animals/e2e/features/reference-lists/destination-country-list.spec.ts` (2 hunks) | Kept the combined side | 696 already carries the same fix, reopening the page through the overview. The only difference is the task's name: overview and review renamed "Main reason for import" to "Main import reason" (inc-098). The reference-lists side used the old name. |
| tests | `tests/animals/e2e/features/reference-lists/port-of-exit-list.spec.ts` (1 hunk) | Kept the combined side | Same as above. |

After resolution the merge adds no content over 696; it records reference lists as merged.

## Proof

| Check | Result |
|---|---|
| Unit tests: animals frontend | 3,074 passed, 8 skipped |
| Unit tests: plants frontend | 2,204 passed, 8 skipped |
| Unit tests: INS frontend | 696 passed |
| Unit tests: performance tests | 1,442 passed |
| `mvn verify` (unit and integration): animals backend, stub, reference-data | Passed |
| Lint: animals, plants and INS frontends, tests (and `tsc`), performance tests | Clean |
| Full E2E (`npm run test:docker-compose`) on a dev-mode stack of this branch, under the stack lease | 433 passed, 7 skipped, 0 failed, 0 flaky |

## Templates

<!-- updated when laptop 2 has pushed -->
Waiting on laptop 2. When it has stopped and pushed, templates merges into this branch in its 5 repos, the branch is
re-proved, and its remaining rows build on this laptop.
