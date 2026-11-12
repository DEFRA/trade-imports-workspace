# Signed-off pages: canary on the animals frontend

Run on 11 November 2026, on `feat/NO_JIRA-signed-off-pages` in the workspace and in `trade-imports-animals-frontend`.

## Summary

- **The flow works end to end.** A linked test edit and a signed-off step change both trip, each with a ticket draft. A test-only change on another page and a devDependency bump both pass.
- **Lint passes with the stand-in in place:** 0 findings across 77 capabilities.
- **The build loop would park the row.** Its own command and `jq` read give `ok: true`, exit 3 and 10 changes. That takes it down the ticket, park and draft route its tests prove.
- **Two tools were wrong, and both are fixed with tests.** See [Tool fixes](#tool-fixes).
- **Nothing was committed.** Every stand-in is reverted. Only the tool fixes and this file are left.

## The stand-in

Applied as uncommitted edits, then reverted:

| File | Change |
|---|---|
| `features/declaration/page.js` (frontend) | `maturity: 'detailing'` to `'agreed'` |
| `openspec/specs/live-animals/journey-pages/declaration/spec.md` | `**Maturity**: detailing` to `agreed` |
| The same spec | `**Signed off**: 2026-11-11` after the ID line of all 15 declaration scenarios |

Shared specs were left unmarked. The brief named the declaration scenarios only.

## Results

Each case ran four checks, with the stand-in in place:

- **Lint:** `tim spec lint`
- **Workspace:** `tim spec diff --signed-off --uncommitted --range origin/main...HEAD`
- **Repo:** `tim spec diff --signed-off --repo trade-imports-animals-frontend --base origin/main`
- **Script:** `npm run check:signed-off-tests -- origin/main` in the frontend

| Case | Lint | Workspace | Repo | Script | Expected |
|---|---|---|---|---|---|
| Stand-in only | 0 findings | exit 0 | exit 0 (after fix 1) | exit 0 | Pass |
| (a) Edit a linked declaration test | 0 findings | exit 0 | **exit 3**, 10 scenarios | **exit 1**, 1 file (after fix 2) | Trip |
| (b) Change a declaration scenario's steps | 0 findings | exit 0 uncommitted; **exit 3** as a commit | exit 0 | exit 0 | Trip |
| (c) Test-only change, origin page | 0 findings | exit 0 | exit 0 | exit 0 | Pass |
| (d) devDependency bump | 0 findings | exit 0 | exit 0 | exit 0 | Pass |

Every result now matches what the brief expected.

### Stand-in only

Before fix 1, the repo check tripped on `SCN-DECLARATION-005-B` with no edit at all. It blamed `check-answers/check-answers.test.js`. That file was changed on `main` by the commodity-type change after this branch left it, not by this branch.

### (a) Edit a linked declaration test

The edit: the back link test in `declaration.fit.spec.js` asserts `/notification-view/` instead of `REVIEW_URL`.

- **Repo:** 10 `test-edited` entries, one for each scenario that file proves: 001-A, 001-B, 002-A, 003-A, 004-A, 005-A, 005-B, 006-A, 006-B and 007-A.
- **Ticket draft summary:** "Approve or refuse changes to 10 signed-off scenarios".
- **Each section** names the scenario and capability, "A linked test is edited", the test file and the linked test titles. It also gives the steps, unchanged in the spec, and "Found in: repos/trade-imports-animals-frontend since it left origin/main, committed and uncommitted".
- **Script:** names the declaration page folder and `declaration.fit.spec.js` as changed. Before fix 2, it said nothing had changed.
- **Workspace:** exit 0, which is right. `openspec/` is not touched.

The check works by file, not by test title. One edited spec file trips every scenario it proves, not just the scenario for the test that changed. That is safe, but the ticket is wider than the change.

### (b) Change a declaration scenario's steps

The edit: `SCN-DECLARATION-003-A`'s THEN changed from "check your answers is shown" to "the hub is shown".

With `--uncommitted` the workspace check says exit 0. HEAD's copy of the scenario is not signed off, because the stand-in is uncommitted too. So the change reads as a promotion, and the rule says a promotion is not reported. That only happens because the stand-in itself is uncommitted. On a real signed-off page, HEAD already carries the mark.

To prove it without committing to any branch, I wrote two commit objects that no ref points to:

- **S:** HEAD plus the stand-in spec (`064941e2e915`)
- **B:** S plus the step change (`b315a6a95a27`)

| Command | Result |
|---|---|
| `tim spec diff --signed-off --commit <S>` | exit 0: a promotion alone is not reported |
| `tim spec diff --signed-off --commit <B>` | **exit 3**: `changed SCN-DECLARATION-003-A`, "It was signed off, and the change rewrites its name or steps." |
| `tim spec diff --signed-off --range <S>..<B>` | **exit 3**: the same single entry |

The ticket draft gives "Approve or refuse a change to a signed-off scenario" with Before and After steps:

```
Before:
  The back link opens check your answers
  - **GIVEN** the user is on the declaration page
  - **WHEN** they follow the back link
  - **THEN** check your answers is shown
After:
  The back link opens check your answers
  - **GIVEN** the user is on the declaration page
  - **WHEN** they follow the back link
  - **THEN** the hub is shown
```

The repo and script checks pass (b), which is right: no test changed.

### (c) Test-only change, origin page

The edit: one input value in a linked test in `features/origin/controller.test.js`. The origin page is `detailing`, and its scenarios are not signed off. All four checks pass.

A first try renamed that test's title instead. Lint then gave 1 finding: `test-titles`, because `SCN-ORIGIN-008-A` links the old title. That is right, since renaming a linked test breaks its coverage link. The signed-off checks still passed.

### (d) devDependency bump

The edit: `nodemon` from `3.1.14` to `3.1.15` in the frontend `package.json`. All four checks pass.

## The build loop would park (a)

The loop's signed-off stage runs this command for an increment touching the frontend:

```
tim spec diff --signed-off --uncommitted --repo trade-imports-animals-frontend --base origin/main --workspace ~/git/defra/trade-imports-workspace --json
```

On the (a) state it exits 3. The stage's own read, `jq -c '{ok, signedOff: [.result.signedOff[]? | {change, id, capability}], errors}'`, gives `ok: true`, 10 `test-edited` entries and no errors.

By the stage's rules, exit 3 with `ok: true` gives `{ok: true, exitCode: 3, changes: 10}`. `checkSignedOff` then raises the ticket, parks the row and raises the pull requests as drafts.

The loop's 16 signed-off tests in `tim/src/backlog/workflow-contract.test.js` pass. They prove each step of that route:

- the check runs after the branch guard, before land
- the ticket is raised under the epic and related to the row's ticket, reusing an earlier receipt
- the row is parked as blocked before it lands, then lands and raises draft pull requests, merging nothing
- a pull request already open is made a draft and names the ticket
- a failed park, check or pull request stage stops safely
- the loop carries on and merges the next row
- under the branch lifecycle, the ticket is drafted in the workarea with no Jira call

## Tool fixes

| Tool | What was wrong | Fix | Test |
|---|---|---|---|
| `tim spec diff --signed-off --repo --base` | Compared the working tree with the tip of `--base`. A linked test that `main` changed after the branch point showed as the branch's own edit. | Compares with the merge base of `--base` and HEAD. Help text, doc comment, ticket wording and the loop prompt now say "since it left". | "Should compare from where the branch left the base, leaving out a linked test only the base has edited since" in `tim/src/spec/signed-off/diff.test.js`. Red before, green after. |
| Frontend `scripts/signed-off-tests.js` | Diffed the merge base with HEAD, and read `page.js` only from commits. Uncommitted edits, and an agreed level only in the working tree, were missed. | Diffs the merge base with the working tree, and reads `page.js` from the working tree as well. In CI the working tree is HEAD, so the pull request check behaves as before. | Two tests in `scripts/signed-off-tests.test.js`: an uncommitted change or deletion on an agreed page, and a page agreed only in the working tree. Red before, green after. |

## Known limits, not changed

- **The check is file-level.** An edit to one test in a file trips every signed-off scenario the file proves, so the ticket can list more scenarios than the change touched.
- **Promoting and changing a scenario in one change goes unreported.** If a scenario gains its Signed off mark and new steps together, it reads as a promotion. The rule keeps promotion in its own reviewed pull request, which is what covers this.

## Verification

| Command | Result |
|---|---|
| `npm --prefix tim test` | 231 files, 3,859 tests pass |
| `npm --prefix tim run lint`, `format`, `format:check` | Clean |
| Frontend `npm run lint`, `npm run format:check` | Clean |
| Frontend `npm test` | 266 files pass (2 skipped), 3,914 tests pass (9 skipped). Collects the script's 9 tests. |
| `tim spec lint` after restoring | 0 findings |
| `tim spec diff --signed-off --uncommitted --repo trade-imports-animals-frontend --base origin/main` after restoring | exit 0 |

FIT and E2E specs were not run. The canary changes no app behaviour, and the edited FIT spec was reverted.
