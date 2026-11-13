# Nightly maintenance: plan

Scheduled Claude jobs that keep npm packages, Node and documentation current
across the trade-imports repos, the workspace and tim. First a hands-on
catch-up, then small nightly runs.

Written 13 Nov 2026.

## Shape

- **Where it runs:** one Claude Code session left open in the canonical
  workspace (`~/git/defra/trade-imports-workspace`). This machine does nothing
  else, so the jobs own the checkout and its `repos/`. `CronCreate` registers
  the jobs. Recurring jobs expire
  after 7 days, so `/nightly-start` re-registers them all in one command. The
  Mac must not sleep.
- **What triggers work:** Dependabot raises the PRs. The nightly job fixes
  them, decides whether to merge, and owns anything Dependabot cannot do:
  changelog-driven upgrades, sets that span several repos, and Node.
- **Proof:** unit tests, lint, Testcontainers-backed tests and the local
  Sonar push gate run as normal. The one thing never started locally is the
  app's Docker Compose stack (`run-stack.sh` / `tim docker`), so end-to-end
  tests are left to CI's "E2E Tests" check. The job pushes, then watches
  `gh pr checks`. For changelog-driven packages, CI going green is not
  enough on its own. Each changelog item also needs evidence that it was
  applied.
- **Merge rule:** merge on green when every change was mechanical and every
  evidence row is clean. Otherwise leave a draft PR and report it in the
  morning digest.

## Phase 0: foundations (attended, workspace PRs)

| # | Work | Done when |
|---|---|---|
| 0.1 | `.claude/rules/nightly.md` covers what counts as mechanical (renames, import paths, config format, types), the stop conditions (behaviour change, test assertion edit, more than a few files, three push-and-watch cycles), and the digest format. CLAUDE.md rule 3 gets a named exception for the nightly jobs. Rule 6's "ask" becomes "draft the PR and put it in the digest". | Rules merged |
| 0.2 | `config/dependency-sets.json` records each coupled set's members, its scope (one repo or across repos), its policy (`ci-is-enough` or `changelog-driven`) and why it exists. A `tim deps` command generates each repo's Dependabot groups, ignores and cooldown from it. | animals-frontend's Dependabot config is generated, not hand-edited |
| 0.3 | An unattended mode for `govuk-upgrade` and `npm-upgrade`. Policy replaces the gates and walkers. The run ID accepts the job's ticket key or `NO_JIRA`. The local `test:docker-compose` E2E step is skipped in favour of CI's "E2E Tests" check. The job pushes and watches CI. Each PR description gets a changelog evidence table. Interactive mode stays as it is. | The govuk-frontend 6.6.0 run below completes in unattended mode |
| 0.4 | `/nightly-start`: checks the session's environment (`SONAR_TOKEN` set, no stray `ANTHROPIC_API_KEY`), fetches every repo, then registers the crons. | The session starts and registers the crons with one command |

## Phase 1: catch-up (hands-on, canary first)

Run in this order. Each step canaries on one repo, then does the rest, and
ends with everything merged.

| # | Work | Notes |
|---|---|---|
| 1.1 | Fix config drift | tim: `engines >=22` against Node 24 in CI, and no `.nvmrc`. schemas: no `.nvmrc`, and a literal `24.22.1` in two CI jobs. animals-backend: Dependabot set to `nuget`. Dependabot is missing in 10 repos. npm needs to be at least 11.10 for `min-release-age` (engines floor is 11.6.2). |
| 1.2 | Drain the open Dependabot PRs | One each in animals-admin and ins-frontend. This is the first live test of fix-on-red. |
| 1.3 | Node | Latest `defradigital/node` tag. Move `.nvmrc`, `engines`, Dockerfile `PARENT_VERSION`, schemas CI and workspace CI together, on one branch name. |
| 1.4 | Coupled sets | eslint (animals-frontend is pinned to `neostandard 0.14.0-next.1`), vitest, and Playwright, which is out of step across repos (1.63.0 in animals-frontend, 1.64.1 in ins-tests and tim). |
| 1.5 | govuk-frontend to 6.6.0 | Most frontends are on 6.5.1. plants-frontend is on `^6.3.0`, so check its lockfile. routing-proxy is already on 6.6.0. The prototype syncs from plants-frontend. Run this in unattended mode while you watch, and compare its evidence table with what you would have done. This step decides whether 2.3 goes ahead. |
| 1.6 | Full npm-upgrade | Every `npmUpgradeDefault` repo, plus tim. You walk the manual packages. Majors found here are entered into `dependency-sets.json`. |
| 1.7 | Docs | Deterministic checks first: links, `tools-index.md` against `tools/`, `make-targets.md` against the Makefile. Then one repo's pages per pass (`docs/repos/<repo>.md`, README, AGENTS.md), across 17 repos, with you reviewing each one. |

## Phase 2: nightly (one job at a time)

| # | Job | Merges? |
|---|---|---|
| 2.1 | Digest only: open bot PRs, red `main` builds, sets waiting on readiness, `npm outdated` drift. Run it for a few nights to prove the session and cron mechanics. | No |
| 2.2 | `ci-is-enough` Dependabot PRs: fix if red, merge if green. | Yes |
| 2.3 | `changelog-driven`: govuk-frontend and every major, one version per night in semver order, with deprecations applied as minors arrive. Merges only when every evidence row is clean. | Sometimes |
| 2.4 | Sets across repos: readiness check on peer ranges, one branch name, merge only when every repo is green. | Sometimes |
| 2.5 | Docs: what merged since the last run. Raises one PR, or none if nothing material changed. | No, until the share merged unchanged earns it |

At each 7-day restart, review merged-unchanged against corrected PRs, the
drafts raised, and cost. Then decide on the next job.

## Later

Triage of red `main` builds, cross-repo branch-name drift, audit allowlist
entries close to expiry, a refresh of the Sonar branch gate status doc,
Maven, before-and-after screenshots for visual changelog items, and durable
scheduling if the 7-day restart becomes a chore.

## Open decisions

- Ticket key for job branches: a standing ticket per job, or `NO_JIRA`.
- Whether the workspace root needs Dependabot for its GitHub Actions; it has
  no `package.json`.
