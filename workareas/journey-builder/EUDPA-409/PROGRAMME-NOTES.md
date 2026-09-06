# High-risk plants — programme notes for the batch orchestrator (L1 reads this; L0 never does)

Run **EUDPA-409** under epic **EUDPA-407**. Target `high-risk-plants-frontend` in
`tools/journey-builder/targets.json`. Backlog: `backlog.json` beside this file, 63
increments derived from the ruled spec, none built.

## The repos

| `repo` | Path | Notes |
|---|---|---|
| `frontend` | `repos/trade-imports-plants-frontend` | Node. The engine is complete, the `high-risk-plants` set is empty. `npm run test:high-risk-plants`, `format:check`, `lint` (includes `lint:arch`), `PORT=3053 npm run test:fit:features`. npm pinned `11.6.2` — run installs through `npx --yes npm@11.6.2`. |
| `backend` | `repos/trade-imports-plants-backend` | Java / Spring Boot. Integration tests need `mvn verify`. |
| `tests` | `repos/trade-imports-animals-tests` | Playwright. Plants gets a fourth project `plants` beside `e2e`, `admin`, `ins`; page objects under `page-objects/plants/`; specs under `tests/e2e/features/plants/`. |

Cross-repo branches share the same name (CLAUDE.md rule 2). Merge order backend, then
frontend, then tests.

## The spec is the requirement

`src/server/app/sets/high-risk-plants/spec/` in the plants frontend:

- `journey-spec.json` — 29 obligations, 15 pages in 8 sections in journey order, 98
  behaviours. Every obligation and page carries an `animals` tag: `same-as-animals`
  (copy the animals shape and copy verbatim), `variant-of-animals` (copy the shape;
  `divergence` says what differs and why), `plants-only`.
- `conflicts.json` — 40 conflicts, every one resolved; the `decision` field points at the
  ruling.
- `decisions.json` — the ledger of 83 rulings with rationale and dissent. **A ruling is
  changed only by `tools/journey-builder/spec-add-decision.sh --supersedes d-NNN`**, never
  by editing. `panel/README.md` explains.
- `backlog-extras.json` — the non-page increments (`fix`, `chore`, `restore`, `e2e`) with
  their anchors.

Where the spec and an increment's own text disagree, the spec wins; write the discrepancy
into the increment's `notes`.

## Standing rulings (product owner, 2026-09-06) — do not build

- Users, sign-in models, agents acting on behalf of an importer, delegation of authority,
  plant-operator registration, "who is the notifier". Parked.
- Bulk upload. Parked.
- Per the epic: document uploads, outbox and GBN-AG event publishing, a combined
  animals+plants list in INS.
- Anything a behaviour records as `parked` or `rejected` in the spec.

## Increment types and who implements them

- `add-page` / `add-collection` — the `frontend-change` skill in the plants frontend, in the
  mode the type names. It reads the set's recipe docs under
  `src/server/app/sets/high-risk-plants/docs/`. Each carries its unit tests, its in-repo
  `*.fit.spec.js`, and `copy.en.js` + `copy.cy.js` (structure-identical;
  `copy-parity.test.js` enforces it — Welsh is part of the increment, never a follow-up).
- `fix` / `chore` / `restore` — described by the extra's `title` and `detail`; `repo` names
  where. Java best-practices for the backend, the Node style guide for the frontend.
- `e2e` — in the tests repo, Playwright best-practices; the journey-level spec for the
  section named, page objects included. The stack must be up (`tim docker dev`).

The first feature increment disarms two tripwires (`copy-convention.test.js`,
`copy-parity.test.js` under `src/server/app/`); the `restore-*` increments that follow it
restore the per-feature checks. Expect the tripwires to fail on that first increment and
handle them in the increment that follows, not by weakening them.

Consistency with animals, without sharing: where a page or obligation is `same-as-animals`
or `variant-of-animals`, read the animals feature under
`repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/` and copy its
shape. Never import from it, never centralise. Declare the duplication in the feature's
docs and move on.

## Gated increments

Three extras are born `blocked` with `gate: sam` and sit at the end of the chain:
`backend-reference-prefix` (needs the agreed plants type code), `country-block-decision`,
`chrome-placeholders-and-service-name`. They halt the loop when reached; that is by design.

## Verification ladder

Frontend increments: `test:high-risk-plants`, `test`, `format:check`, `lint`, then
`test:fit:ci` with the stack up — that script pins `PORT=3053` itself, so no rung ever carries
an environment-variable prefix (the permission matcher does not allowlist one). Backend:
`mvn -f <repo>/pom.xml clean verify`. Tests repo: `lint`, `typecheck`, `format:check`, then
`test:docker-compose -- --project=plants`. Every rung is written as the full
`npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run <script>` or
`mvn -f ~/git/defra/trade-imports-workspace/repos/<repo>/pom.xml …` command. Read test
output from a file once; never grep a streaming run.

## Known first-pass gaps the backlog already carries

The 17 M0 hygiene increments (lighthouse scripts, eight CI workflow gaps, Dependabot in both
plants repos, backend CI parity, depcruise baseline, unused services, doc drift) come first
and touch no journey code. They are cheap and unblock the rest.

## The tripwires fold into the dashboard (d-084), and ids shifted

The two `restore-*` extras for the copy tripwires were withdrawn on 2026-09-06 under
decision d-084: the dashboard increment rewrites `copy-convention.test.js` and
`copy-parity.test.js` in the same commit as the first feature folder, because a PR that
left them red could never merge. Every increment after `dashboard-date-submitted-real-list`
moved up by two ids in that regeneration. Plan `notes` written before it may still say
`inc-NNN` for a later increment — trust the key or page name they give, not the number.
From then on plans name other increments by key, never by id.

## What the loop commits, and what commitPaths is for

The batch orchestrator drives `increment-build-loop.js`, whose land stage stages whatever
the increment produced (everything but logs, coverage and Playwright artefacts) and commits
it. It does not read `commitPaths` from the target profile. That list belongs to the
journey-builder skill's own build mode (`commit-increment.sh`, `rollback-increment.sh`) and
is widened for this target to cover `.github`, `scripts`, `docs` and the README, so the M0
hygiene increments land under either path. A plan whose `openQuestions` raise commitPaths is
asking about the old path; rule it not applicable under the orchestrator and move on.

## Repos and models this programme runs with

`repos`: frontend = `repos/trade-imports-plants-frontend` (`DEFRA/trade-imports-plants-frontend`),
backend = `repos/trade-imports-plants-backend` (`DEFRA/trade-imports-plants-backend`),
tests = `repos/trade-imports-animals-tests` (`DEFRA/trade-imports-animals-tests`).
`models`: heavy = opus, light = sonnet. Both are recorded in the ledger's programme block;
L1 copies them into every run copy's FALLBACK.

The M0 CI-workflow increments (inc-002 to inc-011) change only YAML under `.github/`, which
neither prettier's globs nor eslint read. Their ladders run the unit, format and lint rungs;
the proof is the PR's own checks, which the loop watches. Several plans carry open questions
about things the checkout cannot see — a CDP build role, the `SONAR_TOKEN` secret, whether
GitHub Pages is enabled, whether branch protection requires a job. Those resolve when the
PR's checks run: a red check there is evidence about the platform, not the change, and a
`ci-red` stop on one of them is a platform question for Sam rather than a code fix.
