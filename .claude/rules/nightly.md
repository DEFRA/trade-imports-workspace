# Nightly jobs: what they may do unattended

The nightly jobs are scheduled Claude runs in one Claude Code session left open
on an always-on Mac, inside tmux or screen so it outlives the SSH connection
that started it. `/nightly-start` registers them
from [`config/nightly-jobs.json`](../../config/nightly-jobs.json). Each fires a
prompt that starts `[nightly:<job>]`. These rules apply only to a run that
started from such a prompt. They change nothing for an attended session, and
every skill keeps its interactive behaviour when a person is driving it.

The plan they come from is
[`workareas/shared/nightly-maintenance/plan.md`](../../workareas/shared/nightly-maintenance/plan.md),
under ticket EUDPA-802.

## First, every run

1. Run `tim nightly stopped --json`. If `result.stopped` is true, write one
   digest line saying the job did not run and why, then end the run. Do
   nothing else.
2. Read this file and the job's own skill.
3. Do one piece of work per run, as the job's skill says. Leave the rest for
   the next night.

## The kill switch

`workareas/nightly/STOP` turns every job off. Anyone can create it, with an
optional reason inside:

```bash
echo "Holding while main is red" > workareas/nightly/STOP
```

Delete the file to turn the jobs back on. A job never creates or deletes it.

## What a job may do

The jobs own this machine, so a job may, without asking:

- switch branches in the workspace and in `repos/`, create branches, commit and
  push them
- run `npm ci`, `npm install`, unit tests, lint, format, Testcontainers-backed
  tests and the local Sonar push gate
- open, update and comment on pull requests with `gh`, and watch their checks
- merge a pull request when the merge policy below allows it
- write to `workareas/nightly/`

Before switching a repo's branch, a job checks it has no uncommitted changes.
If it has, the job leaves that repo alone and reports it in the digest. It
never stashes, resets or deletes someone else's work.

## What a job never does

- Start the app's Docker Compose stack: no `tim docker`, no
  `npm run test:docker-compose`. End-to-end proof is CI's "E2E Tests" check,
  watched with `gh pr checks`.
- Use `--force`, `--legacy-peer-deps`, npm `overrides` or `--no-verify` to make
  an install, a commit or a push pass.
- Edit a test assertion.
- Merge a pull request a person raised. A job merges only pull requests that
  Dependabot or a nightly job raised.
- Write to a CDP platform repo (CLAUDE.md rule 3).
- Edit `.claude/settings.json`, `.claude/hooks/`, this file or CLAUDE.md.
- Create, delete or edit the stop file.

## Branches

Every nightly branch uses the standing ticket key EUDPA-802, with a slug that
names the change:

- `chore/EUDPA-802-govuk-frontend-6.6.0`
- `chore/EUDPA-802-vitest-4.2`
- `chore/EUDPA-802-node-24.12`

A change across repos uses the same branch name in every repo it touches
(CLAUDE.md rule 2). A job that fixes a Dependabot pull request pushes to
Dependabot's own branch rather than making a new one.

## A mechanical change

A job may only make mechanical changes. A mechanical change is one of:

- a rename the changelog or a deprecation names
- an import path
- a config file moving to a new format with the same settings
- a type fix
- keeping one package of a Dependabot group at its current version, in
  `package.json` and the lockfile, with a hold recorded by `tim deps hold`
- a test's set-up (a mock, a fixture or a test-support helper) changed so the
  test sets up the case its title names under the new version, with every
  assertion left as it was

It does not change what the code does at runtime.

Example: nock 15's `delay()` holds back only the body, so a timeout test
that asserted a 504 from late headers got a 408. The fix replies through a
helper that holds back the headers too, and the 504 assertion stays.

## When to stop

Stop work on the change, leave a draft pull request and report it in the
digest when any of these is true:

- a fix would change runtime behaviour
- a fix would edit a test assertion
- the change has grown past about 10 files
- the job has used 3 push-and-watch cycles on this pull request
- an install only passes with a flag this file bans
- a member of a coupled set is not ready: its peer dependencies do not accept
  the other members' new versions
- a Dependabot group pull request is red and no single package explains it

## Hold back one package

When a Dependabot group pull request is red and one package explains it, the
job does not wait for a person. Holding the package back is a mechanical
change (see "A mechanical change"). The job works in this order:

1. It records the hold with `tim deps hold`: the version range held, the
   repos, the reason, the failing test and any package it clashes with.
2. It regenerates each affected repo's Dependabot config with
   `tim deps dependabot <repo> --write`.
3. It raises the hold as one change on one branch name, such as
   `chore/EUDPA-802-hold-axe-core-playwright-4.14`: a pull request in this
   workspace for `config/dependency-sets.json`, and one in each affected repo
   for `.github/dependabot.yml`. It merges the workspace one first, then each
   repo's one, each on green.
4. It comments `@dependabot recreate` on the group pull request, so
   Dependabot rebuilds it without the held versions, and merges it on green
   under the merge policy.
5. Only if the recreated pull request still moves the held package does it
   keep that package at its current version in `package.json` and the
   lockfile on Dependabot's branch, in a commit that says it is the fallback
   for the hold.
6. It lists the hold under "Waiting" in the digest.

`tim npm upgrade --unattended` leaves a held package out of its run, and
`tim deps policy <package> --repo <repo>` reports a held version as `held`.

The hold's `versions` range stops Dependabot proposing any release in it,
patches included, so the job checks for a fix itself, at most once a night
for each hold:

1. When `npm view <package> versions` lists a release the hold has not been
   tried against, or the package it clashes with has a new release, the job
   opens a draft nightly pull request on `chore/EUDPA-802-<package>-<version>`
   that moves only that package, and watches CI with `gh pr checks`.
2. When the check the hold's `failingTest` names is green, it lifts the hold
   with `tim deps lift`, regenerates each repo's Dependabot config and raises
   the lift the way the hold was raised: one branch name, the workspace pull
   request merged first, then each repo's.
3. Otherwise it closes the draft pull request and leaves the hold.

## Merge policy

Each package has a policy in `config/dependency-sets.json`. A package with
none is `ci-is-enough` for a minor or patch, and `changelog-driven` for a
major.

| Policy | Covers | A job merges when |
|---|---|---|
| `ci-is-enough` | minors and patches of most packages | every change was mechanical and every CI check is green, "E2E Tests" included |
| `changelog-driven` | govuk-frontend at every version, and every major of any package | every change was mechanical, every CI check is green, and every row of the evidence table is clean |

For `changelog-driven`, a green CI is needed but not enough. The pull request
description carries an evidence table with a row for every changelog item
between the old version and the new one:

| Changelog item | Outcome | Evidence |
|---|---|---|
| Rename `govukFoo` to `govukBar` | applied | `grep -rn govukFoo src/` finds nothing |
| New `govuk-baz` modifier | not applicable | we use no `govuk-baz` |
| Header layout changes | needs a person | visual change to every page |

A row is clean when its outcome is "applied", with a search that now finds
nothing, or "not applicable", with the reason. "Needs a person" is never clean.
A package with no changelog to read is "needs a person".

A job applies a deprecation as soon as the minor that announces it arrives,
so the next major has less to do.

Merges are squash merges: `gh pr merge <number> --squash`. A job deletes the
branch only after the merge.
A job that cannot merge leaves the pull request as a draft, with the reason in
its description, and reports it in the digest.

## Red tests

CLAUDE.md rule 6 still holds: a red test on a nightly branch is the job's to
fix, with mechanical changes only. Where rule 6 says to ask a person, a
nightly job does not wait for an answer. It leaves the pull request as a draft,
says in its description what is red and why the job stopped, and reports it in
the digest.

## The digest

Each night's runs write to one file:
`workareas/nightly/<yyyy-mm-dd>/digest.md`,
dated for the morning it is read. `workareas/` is not committed.

Each job appends its own section. The `digest` job runs last and writes the
summary at the top.

```markdown
# Nightly digest, 14 November 2026

## Needs you

- trade-imports-animals-frontend #412: govuk-frontend 6.6.0, draft. Header layout changes need a person. <link>

## Merged

- trade-imports-ins-frontend #88: vitest 4.2.1, ci-is-enough. <link>

## Waiting

- Playwright 1.65: @playwright/test is ready, playwright-core is not.

## deps-fix

What the job did, one line per pull request, with its link and outcome.
```

"Needs you" lists every draft pull request, ticket and stop the night left,
each with its link and the one thing a person must decide. A night with
nothing to report still gets a digest that says so.

## The push notification

The `digest` job sends one push notification with the `PushNotification` tool
when it has written the digest. One line, under 200 characters, leading with
what needs a person:

```text
Nightly: 2 need you (govuk-frontend 6.6.0 draft, ins-tests red main), 3 merged. workareas/nightly/2026-11-14/digest.md
```

No other job sends one.
