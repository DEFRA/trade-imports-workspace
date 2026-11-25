# Nightly maintenance: plan

Scheduled Claude jobs that keep npm packages, Node and documentation current
across the trade-imports repos, the workspace and tim. First a hands-on
catch-up, then small nightly runs.

Written 13 Nov 2026. Updated 18 Nov 2026, after the tooling under `tools/`
moved into tim, 19 Nov 2026, after Dependabot PRs got E2E and the
hold-back rule was agreed, 20 Nov 2026, after Node and Playwright moved,
and 25 Nov 2026, after the digest job was written.

## Shape

- **Where it runs:** one Claude Code session on the always-on Mac Studio,
  started inside tmux or screen so it outlives the SSH connection that opened
  it. This machine does nothing else, so the jobs own the workspace clone and
  its `repos/`. `CronCreate` registers the jobs. Recurring jobs expire after
  7 days, so `/nightly-start` re-registers them all in one command.
- **What triggers work:** Dependabot raises the PRs. The nightly job fixes
  them, decides whether to merge, and owns anything Dependabot cannot do:
  changelog-driven upgrades, sets that span several repos, and Node.
- **Proof:** unit tests, lint, Testcontainers-backed tests and the local
  Sonar push gate run as normal. The one thing never started locally is the
  app's Docker Compose stack (`tim docker`, `npm run test:docker-compose`),
  so end-to-end tests are left to CI's "E2E Tests" check. The job pushes,
  then watches `gh pr checks`. For changelog-driven packages, CI going green
  is not enough on its own. Each changelog item also needs evidence that it
  was applied.
- **Merge rule:** merge on green when every change was mechanical and every
  evidence row is clean. Otherwise leave a draft PR and report it in the
  morning digest.
- **Tooling:** tim and `gh` only. The upgrade skills already run on
  `tim govuk` and `tim npm`, so unattended mode is options and subcommands on
  those, sharing one evidence and policy core in `tim/src/deps/`. No GitHub
  calls go into tim (CLAUDE.md rule 8).

## Running the session

On the Mac Studio, over SSH:

```bash
tmux new -s nightly            # or: screen -S nightly
cd ~/git/defra/trade-imports-workspace
claude                         # auto mode
/nightly-start
# detach: Ctrl-b d (tmux) or Ctrl-a d (screen), then close the laptop
```

- Stop the Mac sleeping: `sudo pmset -a sleep 0`, or "Prevent automatic
  sleeping" in Energy settings. Turn off automatic macOS update installs.
- Stay signed in at the Studio's own screen (or auto-login), so the login
  keychain that holds the Claude and `gh` sign-ins is unlocked.
- Git remotes are HTTPS through `gh`, so pushes do not need the laptop's
  SSH agent.
- A reboot ends the session: start it again as above. Run `/nightly-start`
  at least every 7 days.

## Phase 0: foundations (attended, workspace PRs)

| # | Work | State |
|---|---|---|
| 0.1 | `.claude/rules/nightly.md`: what counts as mechanical, the stop conditions, the merge policy and the digest. CLAUDE.md rule 3 gets a named exception for the nightly jobs; rule 6's "ask" becomes "draft the PR and put it in the digest". | Done on the branch |
| 0.2 | `config/dependency-sets.json` and `tim deps dependabot <repo> [--write\|--check]`, which generates each repo's Dependabot groups, ignores and cooldown. | Done on the branch. animals-frontend's generated config is on its own branch |
| 0.3 | Unattended mode on `tim govuk` and `tim npm`. See 0.3 below. | Built and tested on the branch; proven live by step 1.5 |
| 0.4 | `/nightly-start` and `tim nightly check\|stopped`. | Done on the branch |
| 0.5 | `tim nightly check` refuses a session that is not inside tmux or screen, so a `/nightly-start` from a bare SSH shell does not die when the laptop closes. | Done on the branch |

### 0.3 Unattended mode in tim

| # | Work | Done when |
|---|---|---|
| 0.3a | Shared core in `tim/src/deps/`: the merge policy for a package and version jump, read from `dependency-sets.json` (no entry: minor or patch is `ci-is-enough`, a major is `changelog-driven`; a 0.x minor and a prerelease are `changelog-driven`); evidence rows (count a pattern's hits in a repo's tracked files, record hits before and after with an outcome and reason, check that every row is clean, render the PR table). Commands: `tim deps policy`, `tim deps evidence count\|check\|render`. | Unit and CLI tests cover every policy case and every row verdict |
| 0.3b | `tim govuk`: `start --unattended` takes the ticket key or `NO_JIRA` without asking and plans one version at a time; `add-evidence` records a row against a changelog item in `versions.<repo>.json`; `apply` refuses a `changelog-driven` version whose rows are not all clean under `--unattended`. | A test run seeds a workspace, plans, adds evidence, applies, and renders the table |
| 0.3c | `tim npm`: `upgrade 1` records each package's policy in `packages.<repo>.json`; `add-evidence` and `check-evidence` work on a package; `run-auto --unattended` skips `npm run test:docker-compose`; `upgrade 3` lists the manual packages as the job's work rather than the walker's. | As above, for an npm run |
| 0.3d | The govuk-upgrade and npm-upgrade skills each get an "Unattended mode" section that a nightly job follows, calling only tim and `gh`. Interactive mode stays as it is. | The skill text names only commands that exist |

The bash version of this, on the local branch
`chore/EUDPA-802-nightly-maintenance-bash`, is the reference for the
behaviour: the evidence row verdicts and their tests port as they are.

## Phase 1: catch-up (hands-on, canary first)

Run in this order. Each step canaries on one repo, then does the rest, and
ends with everything merged.

| # | Work | Notes |
|---|---|---|
| 1.1 | Fix config drift | **Done 19 Nov:** 12 repo PRs and workspace #286, all merged. tim: `engines >=22` against Node 24 in CI, and no `.nvmrc`. schemas: no `.nvmrc`, and a literal `24.22.1` in two CI jobs. animals-backend: Dependabot set to `nuget`. Dependabot is missing in 10 repos: generate each with `tim deps dependabot --write`. npm needs to be at least 11.10 for `min-release-age` (engines floor is 11.6.2). |
| 1.2 | Drain the open Dependabot PRs | **Done 19 Nov for the first two waves.** 15 superseded PRs closed. The generated configs raised 23 more: 20 merged (5 majors with clean evidence tables: admin #52 and #98, ins-tests #126, performance-tests #42 and #43), 2 closed and held (stylelint 18, typescript 7: a peer no release accepts yet). A third wave of 9: 7 merged, among them MoJ Frontend 12 in three frontends (a mechanical Sass fix pushed to Dependabot's branch: configure govuk-frontend directly, built CSS byte-identical to main) and jsdom 31. animals-frontend #500 (patch-and-minor) conflicts with `main`, and Dependabot no longer knows it (its group was renamed), so the replacement comes from Dependabot's next daily run at 10:30. ins-frontend #95 (nock 15): merged 19 Nov after a test set-up fix (the timeout tests now hold back the headers as well as the body, so the 504 assertions stay; the transporter tests mock the other organisation they name), which the nightly rules now count as mechanical (#300). It was refused with "the base branch policy prohibits the merge" while green until an empty commit re-ran its checks (#301). Holds in `dependency-sets.json`: `@axe-core/playwright` 4.14.x (animals-frontend), stylelint 18.x (four frontends), typescript 7.x (ins-tests). |
| 1.3 | Node | **Done 20 Nov for Node 24.** `chore/EUDPA-802-node-24.22.3`: `.nvmrc` to 24.22.3 and Dockerfile `PARENT_VERSION` to `3.2.8-node24.22.3` (the newest Node 24 image, 12 Nov) in all ten Node repos, canary animals-frontend #502, all merged with a clean evidence table (24.22.3 is a security release; none of its http2, TLS-server, permission-model or zlib fixes touch code of ours). `engines` floors stay at `>=24.22.1`, which 24.22.3 meets, so no lockfile moved. Workspace CI uses a floating `24`. **Done 20 Nov for Node 26**, on your go: `chore/EUDPA-802-node-26.13.1` moved `.nvmrc` to 26.13.1, Dockerfile `PARENT_VERSION` to `3.2.8-node26.13.1`, and `engines.node` to `>=26.13.1`, in animals-frontend (canary #509), animals-admin, ins-frontend, plants-frontend, plants-prototype, ins-tests, performance-tests, schemas and the workspace (#327: tim's engines and every workflow's `node-version`, plus the Node baseline in `.claude/rules/node.md` and the Node best-practice docs). All merged with a clean evidence table from the 25.0.0 and 26.0.0 semver-major notes; the one row that needed reading was undici 8, which Node 26 bundles and the frontends already use. ins-tests' Playwright base image already shipped Node 26 (unpinned NodeSource `node_26.x`). defra-id-stub and routing-proxy stay on 24.22.3 until their SonarCloud projects exist. |
| 1.4 | Coupled sets | eslint (animals-frontend is pinned to `neostandard 0.14.0-next.1`), vitest, and Playwright, which is out of step across repos. **19 Nov:** Dependabot's eslint groups moved animals-frontend, admin, ins-frontend (10.14), plants-frontend, ins-tests and performance-tests to eslint 10.15 (with `neostandard 0.14.1` where used), and its vitest groups moved animals-frontend, ins-frontend, plants-frontend, admin and performance-tests to vitest 5.1. **20 Nov:** Playwright 1.65.0 on `chore/EUDPA-802-playwright-1.65.0` in animals-frontend, ins-frontend, plants-frontend and plants-prototype (from 1.63.0), ins-tests (from 1.64.1, with its `v1.65.0-jammy` image) and tim (workspace #303), canary animals-frontend #504, all merged together once every repo was green. Not 1.65.1: ins-frontend's npm config refused a release under 7 days old (every repo does now; see open decisions), so 1.65.1 comes through Dependabot once it is a week old. On the way, ins-frontend's one-shard E2E run showed that #302's new unzip step missed a lone shard's artifact; #305 fixed it. |
| 1.5 | govuk-frontend to 6.6.0 | Run in unattended mode while you watch, and compare its evidence table with what you would have done. This step decides whether 2.3 goes ahead. Needs 0.3a and 0.3b. **20 Nov:** run unattended overnight (`EUDPA-802-govuk-frontend-6.6.0`) with every pull request left as a draft and nothing merged, so the comparison is still yours to make. Draft, every evidence row clean (four 6.6.0 items, all not applicable), all CI green: animals-admin #102, animals-frontend #505, ins-frontend #101. defra-id-stub: committed locally with a clean table, but the push gate refuses it (no SonarCloud project). plants-frontend and plants-prototype stopped at 6.4.0 on needs-a-person rows (`govuk-colour("white")` to `inverse-text`; in the prototype, the date input's automatic error state on the plants-working dashboard), so no PR. routing-proxy is already on 6.6.0. Tables: `workareas/govuk-upgrades/EUDPA-802-govuk-frontend-6.6.0/`. Two tool gaps found: `tim govuk apply` could not add commit trailers (fixed, #307, `--trailer`), and tim plans the plants repos from their `^6.3.0` range, though their lockfiles already hold 6.5.1, so 6.4.0's rows ask about code that is already installed. |
| 1.6 | Full npm-upgrade | Every `npmUpgradeDefault` repo, plus tim. You walk the manual packages. Majors found here are entered into `dependency-sets.json`. Needs 0.3c. **20 Nov, discovery only** (`tim npm discover --record-policy`, run `EUDPA-802-npm-catch-up`, nothing upgraded): 143 outdated across nine repos and tim. Most are already in hand: held (stylelint 18, typescript 7, axe 4.14), in the 1.5 drafts (govuk-frontend), Dependabot's next animals-frontend group, or Playwright 1.65.1 waiting on the age gate. What no bot covers: tim, 23 behind with 8 majors (eslint 10, vitest and coverage-v8 5, nock 15, ink 8, js-yaml 5, execa 10, `@types/node` 26), because the workspace root has no Dependabot; and defra-id-stub (24) and routing-proxy (19, with eslint 10 and vitest 5 still to take), which have no `.github/dependabot.yml` at all and four high advisories in routing-proxy (`@hapi/content`, `joi`, `undici`). Both stubs wait on the Sonar push-gate decision below, since no push reaches them. Discovery also lists `npm` 12.2.3 to 12.2.3 in four repos: a tim bug to fix. **20 Nov, the manual walk is dropped** (your call): with tim on Dependabot, the bots and the nightly jobs carry every package the discovery found. tim's Dependabot: `tim deps dependabot tim --write` now generates the workspace's `.github/dependabot.yml` (npm in `/tim`, GitHub Actions for the workspace's workflows and composite actions), with a test that keeps the committed file in step with the sets (#313). Its first run should raise about 8 tim PRs: eslint and vitest groups, one patch-and-minor group, and ink 8, js-yaml 5, execa 10, nock 15 and `@types/node` 26 on their own. |
| 1.7 | Docs | Deterministic checks first: links, `tools-index.md` against `tools/`, `tim/README.md` against `tim --help`. Then one repo's pages per pass (`docs/repos/<repo>.md`, README, AGENTS.md), across 17 repos, with you reviewing each one. **20 Nov, deterministic checks done:** five broken links and a stale line in `tim/README.md` fixed (#304); `tools-index.md` matches `tools/`; every command and option `tim/README.md` shows is in `tim --help`. `tim build gate-wait\|measure\|rigour` and `tim spec lint\|gaps` have no README entry yet. The per-repo passes are left for you to review one at a time. **20 Nov, your call:** the per-repo passes go through as PRs merged on green, and you skim their titles rather than reviewing each one. |

Steps 1.1 to 1.4 need none of 0.3 and can start now.

## Phase 2: nightly (one job at a time)

Each job is a skill named in `config/nightly-jobs.json`, written when its
step starts, and turned on there.

| # | Job | Merges? |
|---|---|---|
| 2.1 | Digest only: open bot PRs, red `main` builds, sets waiting on readiness, `npm outdated` drift. Run it for a few nights to prove the session and cron mechanics. **Written 25 Nov:** the `nightly-digest` skill, with `tim deps drift` for the drift and the cross-repo sets behind, turned on in `config/nightly-jobs.json` at 05:53. Waiting on `/nightly-start` on the always-on Mac. | No |
| 2.2 | `ci-is-enough` Dependabot PRs: fix if red, hold back the one package that breaks a group (see below), merge if green. | Yes |
| 2.3 | `changelog-driven`: govuk-frontend and every major, one version per night in semver order, with deprecations applied as minors arrive. Merges only when every evidence row is clean. | Sometimes |
| 2.4 | Sets across repos: readiness check on peer ranges, one branch name, merge only when every repo is green. | Sometimes |
| 2.5 | Docs: what merged since the last run. Raises one PR, or none if nothing material changed. | No, until the share merged unchanged earns it |

At each 7-day restart, review merged-unchanged against corrected PRs, the
drafts raised, and cost. Then decide on the next job.

### Hold back one package, merge the rest

A Dependabot group PR that one package breaks does not wait for a person.
Example: animals-frontend #492 bumps 34 packages; `@axe-core/playwright`
4.13 to 4.14 alone turns the FIT accessibility tests red, because axe 4.14
flags govuk-frontend's own enhanced file upload button
(`label-content-name-mismatch`). No govuk-frontend issue or release covers
it yet.

The job:

1. Finds the one package: the failure names it (here the axe rule and its
   help URL carry the axe version), or the job bisects the group by
   installing half the updates at a time, on its own branch, with unit and
   FIT tests only.
2. Keeps that package at its current version on Dependabot's branch, so the
   other updates go ahead. A held-back version is a mechanical change: no
   test assertion and no runtime code moves.
3. Adds a dated `hold` entry for the package to
   `config/dependency-sets.json`: the version range held, the reason, and
   the failing test. `tim deps dependabot --write` turns it into an
   `ignore` for that range, so Dependabot stops re-proposing it.
4. Merges the PR when every check is green, under the package's policy.
5. Lists the hold in the digest's "Waiting" section, and each night checks
   whether a newer release of the held package, or of the package it
   clashes with (here govuk-frontend), clears it. When one does, the job
   lifts the hold in a nightly PR.

It only goes to "Needs you" when no single package explains the failure,
or the fix would need a test assertion or runtime code changed.

Needs building: the `hold` entry in `dependency-sets.json`, its `ignore`
in `tim deps dependabot`, and a `tim deps hold|holds` pair to add, list and
lift holds. Then a rule in `.claude/rules/nightly.md`, replacing "needs a
person" for this case.

## Later

Triage of red `main` builds, cross-repo branch-name drift, audit allowlist
entries close to expiry, a refresh of the Sonar branch gate status doc,
Maven, before-and-after screenshots for visual changelog items, and durable
scheduling if the 7-day restart becomes a chore.

## Open decisions

- **E2E on Dependabot PRs: done, 19 Nov.** `publish-branch.yml` skipped
  every Dependabot run, so its PRs got no branch image and no E2E. The skip
  was never needed: the build uses only the OIDC build role, which trusts
  any run on the repo, and no Actions secret. Canary: workspace #287 and
  animals-admin #94, proved on animals-admin #88. Rollout: animals-admin
  #95 then workspace #289 removed the skip for every repo. Proved with
  `dependabot[bot]` as the actor, build and E2E green, on animals-admin
  #82, ins-frontend #78, plants-frontend #147 and animals-frontend #492.
  The other 10 repos have no Dependabot PR open (most get their config from
  the drafts under 1.1), so their first one is the check.
- **stylelint 18: held, 19 Nov.** `stylelint-config-gds` 3.0.0 needs
  stylelint `^17.4.0`, so stylelint 18 cannot install yet. A hold
  (`clashesWith: stylelint-config-gds`) stops Dependabot proposing it, and
  the nightly re-check lifts it when a release accepts 18. A `stylelint`
  set is still worth adding so the two move in one PR when that happens.
- **The Sonar push gate blocks repos with no SonarCloud project: waiting,
  20 Nov.** defra-id-stub and routing-proxy carry the CDP template's
  `sonar-project.properties`, but SonarCloud has no project for them, so
  every push fails. You have asked for the projects to be created. Until
  then both miss Node 26, the release-age setting (defra-id-stub) and
  Dependabot, and routing-proxy keeps its four high advisories. Once they
  exist: Node 26, `min-release-age=7` in defra-id-stub, `tim deps
  dependabot <repo> --write` in both, and defra-id-stub's local govuk 6.6.0
  commit. (On 20 Nov their Node 24 pushes went through: they ran in one
  shell loop, which the workspace's push hook does not check.)
- **Node 26: done, 20 Nov.** See 1.3.
- **npm's release age: done, 20 Nov.** Every npm project refuses a release
  under 7 days old (`min-release-age=7`, as ins-frontend had): animals-admin,
  animals-frontend, ins-tests, performance-tests, plants-frontend,
  plants-prototype, schemas and tim (workspace #311 and one PR per repo).
  Dependabot's `cooldownDays` moved from 3 to 7 to match, so it no longer
  proposes a release npm then refuses; tim's README says to keep the two
  equal. defra-id-stub waits on the Sonar decision above.
- **The workspace's `main` ruleset: decided, 25 Nov.** `gh api
  repos/DEFRA/trade-imports-workspace/rulesets` returned `[]`, and it is not
  in `config/main-branch-rules.json`, so nothing stopped a red or
  out-of-date pull request being merged there. Your call: add one that
  requires only checks that run on every pull request (the `e2e` jobs and
  `smoke / Smoke run`), not tim CI's `build`, which its path filter skips
  outside `tim/`.
- **Paired tests-repo and service merges: decided, 25 Nov.** On 20 Nov
  ins-tests #112 and animals-frontend #484 (EUDPA-696) merged at 16:19;
  ins-tests' `main` E2E started at 16:24 and pulled
  `animals-frontend:latest` before #484's Publish had pushed it, so 12
  specs ran the new tests against the old page. Rerunning after the Publish
  was green. Your call: both. Merge the service first and wait for its
  Publish, then the tests-repo PR; the rule is in
  `docs/testing/e2e-tests-gh-actions.md` ("Merging a tests-repo change with
  its service change"). And the digest reports a red tests-repo `main` that
  started before a paired service's Publish finished as "rerun", not
  "broken".
- **Nightly jobs search the workspace's own pull requests: done, 25 Nov.**
  Its Dependabot PRs (tim and GitHub Actions) are not in `repos.json`. The
  digest skill reads `DEFRA/trade-imports-workspace` beside every
  `repos.json` repo; the deps-fix skill must do the same when it is
  written.
- **Workspace root Dependabot: done, 20 Nov.** See 1.6 (#313).
- **Security updates for the cross-repo sets: settled, 25 Nov.** It did:
  GitHub's docs say an `ignore` entry applies to "version updates and
  security updates", and `update-types` only narrows version updates. So
  `tim deps dependabot` now writes each govuk-frontend and Playwright ignore
  entry with all three `version-update:semver-*` update types, which blocks
  every version update and lets security updates through. A hold keeps its
  `versions` range, which still blocks security fixes inside it; `tim deps
  hold --help` and tim's README say so. A security pull request for a set
  member lands in one repo only and must not be merged alone, because the
  set moves in every repo on one branch name. So the digest reads every
  repo's open Dependabot alerts and lists any on a set member or a held
  package under "Needs you", with the version that fixes it (nightly-digest
  step 6). Each repo's committed `.github/dependabot.yml` needs
  regenerating to pick up the new entries.
