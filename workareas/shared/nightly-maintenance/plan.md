# Nightly maintenance: plan

Scheduled Claude jobs that keep npm packages, Node and documentation current
across the trade-imports repos, the workspace and tim. First a hands-on
catch-up, then small nightly runs.

Written 13 Nov 2026. Updated 18 Nov 2026, after the tooling under `tools/`
moved into tim, and 19 Nov 2026, after Dependabot PRs got E2E and the
hold-back rule was agreed.

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
| 1.1 | Fix config drift | tim: `engines >=22` against Node 24 in CI, and no `.nvmrc`. schemas: no `.nvmrc`, and a literal `24.22.1` in two CI jobs. animals-backend: Dependabot set to `nuget`. Dependabot is missing in 10 repos: generate each with `tim deps dependabot --write`. npm needs to be at least 11.10 for `min-release-age` (engines floor is 11.6.2). |
| 1.2 | Drain the open Dependabot PRs | One each in animals-admin and ins-frontend. This is the first live test of fix-on-red. |
| 1.3 | Node | Latest `defradigital/node` tag. Move `.nvmrc`, `engines`, Dockerfile `PARENT_VERSION`, schemas CI and workspace CI together, on one branch name. |
| 1.4 | Coupled sets | eslint (animals-frontend is pinned to `neostandard 0.14.0-next.1`), vitest, and Playwright, which is out of step across repos. |
| 1.5 | govuk-frontend to 6.6.0 | Run in unattended mode while you watch, and compare its evidence table with what you would have done. This step decides whether 2.3 goes ahead. Needs 0.3a and 0.3b. |
| 1.6 | Full npm-upgrade | Every `npmUpgradeDefault` repo, plus tim. You walk the manual packages. Majors found here are entered into `dependency-sets.json`. Needs 0.3c. |
| 1.7 | Docs | Deterministic checks first: links, `tools-index.md` against `tools/`, `tim/README.md` against `tim --help`. Then one repo's pages per pass (`docs/repos/<repo>.md`, README, AGENTS.md), across 17 repos, with you reviewing each one. |

Steps 1.1 to 1.4 need none of 0.3 and can start now.

## Phase 2: nightly (one job at a time)

Each job is a skill named in `config/nightly-jobs.json`, written when its
step starts, and turned on there.

| # | Job | Merges? |
|---|---|---|
| 2.1 | Digest only: open bot PRs, red `main` builds, sets waiting on readiness, `npm outdated` drift. Run it for a few nights to prove the session and cron mechanics. | No |
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
- **stylelint is a coupled set.** `stylelint-config-gds` 3.0.0 needs
  stylelint `^17.4.0`, so stylelint 18 cannot install yet (animals-admin
  #91, ins-frontend #84). Add a `stylelint` set (`stylelint`,
  `stylelint-config-*`) to `dependency-sets.json`, then regenerate the
  Dependabot configs.
- **The Sonar push gate blocks repos with no SonarCloud project.**
  defra-id-stub and routing-proxy carry the CDP template's
  `sonar-project.properties`, but SonarCloud has no project for them, so
  every push fails. Create the projects, or have the gate skip a repo
  whose project does not exist.

- Whether the workspace root needs Dependabot for its GitHub Actions; it has
  no `package.json`.
- Whether a Dependabot `ignore` entry for govuk-frontend and Playwright also
  stops their security updates. If it does, the nightly job must watch
  advisories for them.
