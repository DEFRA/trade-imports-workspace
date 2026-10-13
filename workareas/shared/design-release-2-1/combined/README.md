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

## Review pages (all read this branch)

| Page | Link | Source here |
|---|---|---|
| Business review (BAs, POs, SMEs): every change a user would notice, before and after, with Right / Wrong / Not sure | https://claude.ai/artifact/WWWq8qXCzAHaciTzU8YBGa | `business-review/` |
| Engineering review: risk-ranked findings, with each engineer's verdict | https://claude.ai/artifact/7bH3vbECyuEax7i6xiwfDA | `engineering-review/` |
| Progress report: Design Release 2.1 work by theme | https://claude.ai/artifact/FHJCGEJ8jm7zs9mLXT4YBw | `progress-page/` |
| Build order: the themes as a dependency schematic, with what could start today | https://claude.ai/code/artifact/f7f85b51-6974-4096-acd1-66bec1171457 | `build-order-page/` |
| OpenSpec audit | — | `openspec-audit.md` |

Answers on both review pages live in each page's shared database (`verdicts/<reviewer id>`); read them back with the
ArtifactData tool.

The build-order page is the exception to this section's heading: it reads the backlogs, not this branch, so it is
true of the whole programme rather than of the combined review. Everything on it is derived — levels, positions,
every line, the counts, the register, and four of its six readings — so it stays true as themes are built. Only
`build/themes.meta.json` is hand-kept, holding each theme's display name and Jira ticket; add a row there when a
theme is added and the schematic places it and routes its lines, with no layout to edit.

Refresh it with `npm run build` then `npm run check` in `build-order-page/build/`. The `check` step runs the page's
own script against a stub DOM and the new data, failing if a region is left empty, if the drawing has the wrong
number of boxes or lines, or if a value renders as `undefined` — run it before republishing, because a half-drawn
page otherwise only shows up once it is live. The generator fails rather than guessing: an unknown row status, a
theme with no `themes.meta.json` entry, a duplicated row id or a dependency cycle all stop the build.

Then republish `index.html` with `data.js` as a supporting file, **passing the artifact URL above** — publishing
without it creates a second page instead of updating this one. Two of the six readings under "What the shape tells
you" are authored judgement rather than derived, and are labelled *Commentary* on the page: the transporters
decision and the waiting-on-design holding pen. Both are skipped automatically once their theme is complete.

Screenshots: `business-review/capture/` is a Playwright harness that walks the same data through both sides
(`SIDE=before|after CLEAN=1 npm run capture --prefix business-review/capture`). Before = published `:latest` images
(`main`, which has not moved), after = a dev-mode stack of this branch; its first test seeds the address book so both
sides start equal. PNGs are not committed (`.gitignore`); rebuild the page with `npm run build` then `npm run copy`
in `business-review/page/build/`.

## Templates

Laptop 2 stopped and pushed on 12 October at 09:52 with 13 of templates' 22 live rows done (inc-161 last), 9 to
build and 1 dropped. Its workspace commits (templates backlog, its OpenSpec capabilities, and build-loop gate fixes)
were merged into `feat/NO_JIRA-design-release-2-1` with no conflicts.

`feat/NO_JIRA-design-release-2-1-type-question-and-templates` then merged into this branch:

| Repo | Merge | Conflicts | Log |
|---|---|---|---|
| animals backend | `19b7af2` | none | — |
| plants frontend | `10d7ce6` | none | — |
| INS frontend | `340e956` | 4 (shared copy and its tests) | `templates-merge-ins-and-tests.md` |
| tests | `17fa81c` | 6 (4 page objects, 2 origin visual baselines) | `templates-merge-ins-and-tests.md` |
| animals frontend | `74d79f1f` | 34 (opening run, save actions, review, template-mode pages) | `templates-merge-animals-frontend.md` |

Normal notifications keep the combined branch's behaviour; template behaviour switches on only in template mode.

Re-proof:

| Check | Result |
|---|---|
| Unit and lint: animals 3,322, plants 2,213, INS 757 (fit 72), tests lint and typecheck | Green |
| Animals fit (stub mode) | 625 passed |
| Backend `mvn verify` | 178 ITs passed (a first run failed only because Docker was restarting) |
| Full E2E, dev-mode stack | 500 passed, 2 failed, 1 flaky. Fixed in `9740498`: the template origin test predated the origin page's 5-character limit; the origin visual baselines now show the Templates navigation item. |
| Flaky "Save template ... lists it first" | Cause: every template spec saves as the one stub user, so another worker's template can legitimately be newest. Fix: a dedicated stub user for those tests, made on the templates branch (tests and defra-id-stub) before its remaining rows build, then re-merged here. |
