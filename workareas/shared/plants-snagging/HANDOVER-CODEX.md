/goal Take over the high-risk plants snagging run and drive it to completion: finish snag-003, build snag-001, port the snag-001 stylesheet fix to the animals frontend, raise every PR, and open the workspace PR that carries the tooling fix and this workarea. Continue until every completion criterion below holds. Pause and ask only if something here turns out to be false.

## What this is

A no-Jira snagging pass over the first cut of the high-risk plants frontend. It was being driven by a Claude Code session using the workspace's increment-build-loop workflow; that session has paused for usage budget and you are taking over as **orchestrator**. There is no Jira ticket and no human review gate by design: your review pass is the review. Raise PRs; do not merge them.

Everything lives under `/Users/samfarrington/git/defra/trade-imports-workspace`. Read, in this order, before touching code:

1. `workareas/shared/plants-snagging/README.md` — the state table and the per-snag routine.
2. `workareas/shared/plants-snagging/backlog.json` — the plan of record. Each increment carries `detail`, `filesToTouch`, `acceptanceCriteria`, `verification` (the ladder, in order), `notes` and `openQuestions`. Its `status` is the state; you update it.
3. `CLAUDE.md` at the workspace root (load-bearing rules: branch parity across repos, never edit `docker/stack/.staged/`, never commit `workareas/` except `workareas/shared/`).
4. `.claude/workflows/codex/implement.md`, `review.md`, `fix.md` — the briefs the loop hands Codex for those three stages. Their `<placeholder>` constants are bound below. They tell you to ignore the Claude-only GUARD RAILS; that applies to you throughout: you have a normal shell.
5. The review personas the briefs cite: `.claude/skills/review/references/{FILE_REVIEWER,CONSISTENCY_REVIEWER,REVIEW_ITEM_FIXER}.md` and `.claude/skills/code-style/references/{STYLE_FILE_REVIEWER,STYLE_IMPLEMENTOR}.md`.
6. `.claude/skills/frontend-change/SKILL.md` and the plants set's own recipe docs under `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/docs/` (the skill's path examples name the animals repo; substitute the plants repo and set).

## Bindings for the codex briefs

| Placeholder | Value |
|---|---|
| `<workspace>` | `/Users/samfarrington/git/defra/trade-imports-workspace` |
| `<workarea>` | `<workspace>/workareas/shared/plants-snagging` |
| `<backlog>` | `<workarea>/backlog.json` |
| `<logs>` | `<workarea>/logs` |
| `<skills>` | `<workspace>/.claude/skills` |
| `<frontendRepo>` | `<workspace>/repos/trade-imports-plants-frontend` |
| `<backendRepo>` | `<workspace>/repos/trade-imports-plants-backend` (no increment touches it) |
| `<testsRepo>` | `<workspace>/repos/trade-imports-animals-tests` (the plants E2E suite lives here, project `plants`) |
| `<branch>` | the increment's `branch` field |

## State when you start

- **snag-002** (destination heading) is done and raised: plants-frontend PR #65 and tests PR #202, same branch `fix/NO_JIRA-plants-place-of-destination-heading`. Leave them; they are not merged.
- **snag-003** (contact address picker) is `paused` mid-implement. Both repos are checked out on `fix/NO_JIRA-plants-contact-address-picker` and hold **uncommitted, unstaged, unreviewed** edits touching every file in the increment's `filesToTouch`. No test has been run over them. Read the increment's `notes` first paragraph for the two resume options.
- **snag-001** (autocomplete styles) is `todo`, fully briefed, branch not yet cut. The evidence screenshots and the diagnosis are under `<workarea>/evidence/autocomplete/`.
- The workspace repo itself is on `main` with two uncommitted things that belong in one PR: `.claude/workflows/increment-build-loop.js` (a `local`-lifecycle fix and a `commitTrailer` config) and this workarea.

## Standing constraints

- **Another session owns two files in plants-frontend:** ` M package.json` (one added `analysis:obligation-graph` script line) and `?? scripts/obligation-graph.js`. They are NOT yours. Never stage, stash, revert, reformat or delete them. A tree that shows only those two entries is clean. When you stash, name the paths you are stashing.
- Never commit on `main` in any repo. Never `git push --force`. Never `--no-verify` (the pre-commit hooks run format, lint and the unit suite; a red hook means the code is wrong, not the hook). Rollback is `git stash push -u -- <paths>`, never `reset --hard` or `clean -fd`.
- Cross-repo branch parity: the frontend branch and the tests branch have the **same name** for an increment, cut off fresh `origin/main` with `--no-track`.
- No display copy in the model or obligations; every user-facing string in `copy.en.js` AND `copy.cy.js`, structure-identical (convention tests enforce it). Stay inside the govuk-frontend toolbox — mixins and tokens, no hand-rolled CSS values.
- Do not weaken, skip or delete a test to get green. The one allowed correction is an assertion that could never have passed against correct output (a GDS macro adding visually-hidden text, say), and you say so when you do it.
- The dev stack must be up **in dev mode** for the E2E rung. `tim docker dev` starts it from local source (`tim docker down` first if it is in an unknown state). Prove dev mode before trusting an E2E run: `docker inspect trade-imports-trade-imports-plants-frontend-1 --format '{{.Config.Image}} | {{range .Mounts}}{{.Source}} -> {{.Destination}}; {{end}}'` must show a locally built image name (no `defradigital/` prefix) and a `repos/trade-imports-plants-frontend/src` bind-mount. The container hot-reloads the working tree (nodemon for the server, webpack --watch for client assets), so E2E sees whatever branch is checked out.
- Commits: conventional subject `fix(high-risk-plants): <increment title>`, a body saying what changed and naming the increment id, and your own attribution trailer (you are Codex; do not copy the Claude session trailer out of earlier commits). One commit per repo per increment, same subject in both.
- Log every suite run to a file under `<logs>/` and read the file; for Playwright failures read `test-results/*/error-context.md` in the repo that ran.

## The per-increment routine

For each of snag-003 then snag-001, with subagents in parallel where a stage fans out:

1. **Branch.** Both plants-frontend and the tests repo on the increment's `branch`. For snag-001 cut it: `git checkout -b <branch> --no-track origin/main` in each (fetch first). For snag-003 it already exists with work on it.
2. **Baseline** (skip for snag-003 if you keep the partial work): frontend `npm test`, tests repo `npm run typecheck && npm run lint`; both green before you edit.
3. **Implement** per `implement.md`, following the increment's `filesToTouch` and `acceptanceCriteria`. Stage, do not commit. For snag-003 the partial work is probably most of it: diff it against the brief, finish what is missing, fix what is wrong.
4. **Review** per `review.md`: one style reviewer and one code reviewer per changed file plus one consistency reviewer over the whole change, using the personas listed above, against the increment's `acceptanceCriteria`. Collect findings with file:line and a confidence.
5. **Verify findings adversarially**: for each finding, try to refute it from the code. Only findings that survive count.
6. **Judge**: rule each surviving finding fix-now / defer / reject without asking a human. Anything that breaks an acceptance criterion or a house rule is fix-now. A deferral is appended to the increment's `openQuestions` in `backlog.json` so it is not lost.
7. **Fix** the fix-now list per `fix.md`.
8. **Ladder**: run the increment's `verification` array in order, each to its own log, each green before the next. The last rung is the plants E2E project against the dev stack. Three repair attempts across the whole ladder, then stop and report.
9. **Land**: commit the frontend, commit the tests repo with the same subject, update `backlog.json` (`status: "done"`, `commit`, `testsCommit`).
10. **Full E2E**: `npm --prefix <testsRepo> run test:docker-compose` to a log. It must be green (last run was 257 passed, 1 skipped).
11. **Push and raise**: push both branches (`git push -u origin <branch>`), then `gh pr create --repo DEFRA/trade-imports-plants-frontend --base main --head <branch>` and the same for `DEFRA/trade-imports-animals-tests`. PR bodies: what changed and why, the sibling PR to merge with, the verification you ran, "Snagging increment <id> (workareas/shared/plants-snagging). No Jira ticket by design." Use `<logs>/snag-002-pr-frontend.md` and `snag-002-pr-tests.md` as the shape. Record the PR URLs in the increment's `prs`.
12. Put both repos back on `main` before the next increment.

## After snag-001: the animals port

The accessible-autocomplete component is byte-identical in `repos/trade-imports-animals-frontend` and has the identical defect. Once snag-001 has landed, cut `fix/NO_JIRA-animals-autocomplete-styles` off `origin/main` in animals-frontend, copy the finished `src/server/common/components/accessible-autocomplete/accessible-autocomplete.scss` across verbatim, add the equivalent tripwire cases to `src/server/app/sets/live-animals/journeys/linear/features/origin/origin.fit.spec.js` (the animals origin page has extra fields below the country box; the country control itself is the same), run that repo's ladder (`npm run test:live-animals`, `npm test`, `npm run lint`, `npm run test:fit:ci`) and the animals E2E project (`npm --prefix <testsRepo> run test:docker-compose -- --project=e2e`), commit, push, raise the PR. No tests-repo change is expected for this one.

## The workspace PR

Last: in the workspace repo cut `chore/NO_JIRA-plants-snagging-workarea` off `origin/main`, commit `.claude/workflows/increment-build-loop.js` and `workareas/shared/plants-snagging/` (everything in it except `logs/*.log`, which are gitignored; the `evidence/` PNGs are meant to be committed), push, raise the PR against `main`. Do not touch the other untracked entries under `workareas/shared/` — they belong to other work.

## Completion criteria

- `backlog.json`: snag-002, snag-003 and snag-001 all `status: "done"` with `commit`, `testsCommit` where applicable, and `prs` populated with open PR URLs.
- Six PRs open and green on CI: plants-frontend + tests for each of the three snags. Plus the animals-frontend autocomplete PR and the workspace PR. None merged.
- The full `test:docker-compose` suite green against the dev stack on each snag branch before its push.
- Both plants-frontend and the tests repo left on `main`, clean apart from the two parallel-session files in plants-frontend.
- A closing note appended to `<workarea>/README.md`: what landed, PR links, anything deferred into `openQuestions`, and anything you could not do and why.

If a repo's CI goes red after a push, fix it on the same branch (three attempts), never by loosening the check.
