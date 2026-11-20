---
name: npm-upgrade
description: 'Upgrade (non-govuk-frontend) npm packages across the EUDP trade-imports repos via a three-phase workflow plus interactive walker — discover outdated packages, classify each as auto (no code changes) or manual (breaking changes), run automated upgrades with rollback safety, produce a handoff manifest for the remaining manual work, then walk the manual list keystroke-by-keystroke and spawn a per-package implementor worker on demand. Per-package classification and implementation state lives in canonical JSON (`packages.{repo}.json`) — no markdown plan files on disk. Fans out per-package research in Phase 1 to `general-purpose` Task subagents following `references/PACKAGE_PLANNER.md`, and per-package implementation from the walker to subagents following `references/MANUAL_UPGRADE_IMPLEMENTOR.md`. An unattended mode for the nightly jobs (`tim npm upgrade --unattended`) replaces every gate and the walker with the policy in `.claude/rules/nightly.md`, records evidence for every changelog item of a changelog-driven package with `tim npm packages add-evidence`, and leaves end-to-end proof to CI. Use when the user asks to bring npm packages up to date across repos (triggers: "upgrade npm deps", "upgrade npm dependencies", "upgrade dependencies", "run npm upgrades", "walk upgrade EUDPA-XXX", "triage upgrade EUDPA-XXX", "implement upgrade EUDPA-XXX"). NOT for one-off `npm install <pkg>` work, and NOT for govuk-frontend specifically — use the `govuk-upgrade` skill for that (single package, changelog-driven, per-version sequencing).'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX [--repo R] [--phase 0|1|2|3|4] [--unattended]'
---

Three-phase npm dependency upgrade workflow for the EUDP trade-imports
workspace. Phase 1 discovers + plans, Phase 2 applies the no-code-change
upgrades, Phase 3 reports what still needs human work. Phase 0 (the
audit baseline) gates Phase 1, and Phase 4 (the override reset) is run
on its own after the upgrades.

A nightly job's `[nightly:<job>]` prompt, or a request that says
"unattended", runs [Unattended mode](#unattended-mode) instead. Nothing
between here and that section applies to it.

## Path conventions

Cross-workspace paths are relative to the workspace root —
`tools/<domain>/`,
`docs/best-practices/`,
`workareas/`. Run Bash from the
workspace root, which a spawned agent's brief names. `tim` finds
the workspace it runs in — no env var needed.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## Worker references

| Persona | Used in | Artifact |
|---|---|---|
| `references/PACKAGE_PLANNER.md` | `references/DISCOVERY_AND_PLANNING.md` Step 2 — one per outdated package, parallel fan-out | classification row in `packages.{repo}.json` (via `tim npm packages set-classification`) |
| `references/MANUAL_UPGRADE_IMPLEMENTOR.md` | `references/WALKER.md` `I` keystroke — one per package the operator chooses to implement | source edits + commit + JSON status row update |

Spawn idiom: Task tool with `subagent_type: general-purpose` and a prompt
beginning `Follow the instructions in .claude/skills/npm-upgrade/references/<NAME>.md.`
`general-purpose` carries `Tools: *` so workers can WebFetch
changelogs, Grep the codebase, and (for the implementor) edit source
files and run tests.

## Overview

See `references/COMMON.md` for prerequisites, failure types, file
extension conventions, and global rules shared by all phases.

## Safety features

- Sequential processing — one package at a time per repo (no parallel upgrades within a repo).
- Test before commit — baseline test run before each upgrade attempt.
- Audit before and after — in a repo with `audit-ci.jsonc`, each upgrade is audited; a new advisory with no fix is allowlisted in the same commit, one with a fix rolls the upgrade back.
- Automatic rollback — failed upgrades are reverted (`package.json`, `package-lock.json`, `audit-ci.jsonc`) and marked failed, including a commit the repo's pre-commit hook refuses.
- Cascade detection — stops immediately if rollback itself fails.
- No auto-push in interactive mode — all commits stay local until human review. Unattended mode pushes and opens pull requests, as its section says.

## Repos

The workspace roster lives in one place —
`repos.json`. This skill covers the
entries flagged `npmUpgradeDefault`, all checked out under
`repos/`. `tim npm upgrade` reads
the same flag, so ask the roster rather than a copied list:

```bash
jq -r '.repos[] | select(.npmUpgradeDefault) | .name' repos.json
```

Pass `--repo <name>` to run against a different set. A repo with no
`package.json` is skipped with a warning.

`trade-imports-plants-prototype` is never upgraded directly: it takes
every dependency change from `trade-imports-plants-frontend` through
its `sync:upstream` script, after the plants-frontend PR merges.

## Step 1: Establish Run ID and branch

Interactive mode, from here to "Scope guidance". An unattended run skips
to [Unattended mode](#unattended-mode) and asks nothing.

The branch is the ticket's branch, the same name in every repo (CLAUDE.md
rule 2): `chore/EUDPA-N-<slug>`, or `feat/` or `fix/` for that kind of
work. Read it from the ticket, or from a repo already on it:

```bash
git -C repos/trade-imports-animals-frontend branch --show-current
```

Parse `EUDPA-XXXXX` from the branch name (e.g.
`chore/EUDPA-668-npm-security-sweep` → `EUDPA-668`). If not found, ask
the user for the ticket and the branch name.

Pass the branch to every dispatcher call as `--branch {branch}`.
`tim npm upgrade` then refuses to run if any repo is on another branch.

## Step 2: Branch Setup

For each repo, ensure it's on `{branch}`:

Check locally **and** on the remote. `branch --list` only lists local
branches, so a branch a colleague already pushed looks absent, and creating
it below would diverge from theirs.

```bash
# Check local (separate Bash calls — no pipes)
git -C repos/{repo-name} branch --list "{branch}"
```

```bash
# Check remote
git -C repos/{repo-name} branch --remotes --list "origin/{branch}"
```

```bash
# Switch if it exists locally
git -C repos/{repo-name} checkout "{branch}"
```

```bash
# Exists only on the remote — create it tracking origin, never bare
git -C repos/{repo-name} checkout -b "{branch}" --track "origin/{branch}"
```

```bash
# Missing in both — create it fresh
git -C repos/{repo-name} checkout -b "{branch}"
```

All repos must be on `{branch}` before continuing.

## Phase 0: Audit baseline

Every repo must have adopted audit-ci (an `audit-ci.jsonc` at its
root) and start green. A repo without one is red in phase 0, so phase
1 refuses it: adopt audit-ci in that repo first. One call audits
them all and records the run in `{run-id}/phase0.json`:

```bash
tim npm upgrade {run-id} --phase 0 --branch {branch}
```

It exits 1 if any repo's audit fails, or an allowlisted advisory now
has a fixed version (`fixable_allowlisted`: take the fix and drop the
entry). Phase 1 refuses to start unless the last phase 0 run covered
every repo at its current HEAD and was green. Write or renew an
allowlist entry only with `tim npm audit allow` (see
`references/COMMON.md`); the repo's CI checks the entry rules.

## Phase 1: Discovery and Planning

```
Follow references/DISCOVERY_AND_PLANNING.md. Run ID: {run-id}
```

Phase 1 calls the dispatcher (`tim npm upgrade --phase 1 --json`)
which runs discovery, pre-bakes per-package context, and gives the
spawn manifest as the envelope's `.result`. The persona fans out one PACKAGE_PLANNER subagent per
manifest entry, then runs `tim npm packages verify` as the
gate.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

Present its report verbatim. **Gate:** "Phase 1 complete. Proceed to
Phase 2?"

## Phase 2: Automated Execution

```
Follow references/AUTOMATED_EXECUTION.md. Run ID: {run-id}
```

Phase 2 calls the dispatcher (`tim npm upgrade --phase 2 --json`) which
fans out `tim npm run-auto` per repo in parallel and
aggregates JSON status. Per-package demotions to manual happen
automatically. Each package is audited after its tests; pass
`--allowlist-owner` and `--expiry-days` so a new advisory with no fix
is allowlisted rather than demoting the package. Each repo's batch
ends with `tim npm refresh-lockfile` (transitive dependencies within their
ranges).

Present its report verbatim. **Gate:** "Phase 2 complete. Proceed to
Phase 3 handoff?"

If the status is not `ok` (`cascade_failures`, `stopped` for an audit
that was red before an install or could not run, or `failed` for any
other runner exit), flag those repos and ask how to handle them before
proceeding. Each runner's log is at `{run-id}/{repo}/phase2.log`.

## Phase 3: Manual Handoff

```
Follow references/MANUAL_HANDOFF.md. Run ID: {run-id}
```

Phase 3 calls the dispatcher (`tim npm upgrade --phase 3 --json`)
which gives, as the envelope's `.result`, a manifest of every manual
(and failed-auto) package. The
persona renders the operator report and hands off to the WALKER.

## Walker (manual triage)

```
Follow references/WALKER.md. Run ID: {run-id}
```

The walker presents every manual package in one batch table and
takes I/D/S keystrokes — `I` spawns the
`MANUAL_UPGRADE_IMPLEMENTOR` worker for that package, `D` holds it
back with the reason the user gives (file a follow-up ticket), `S`
leaves pending.

## Phase 4: Override reset

Run on its own, once the upgrades are in, to take each repo back to
no `overrides` and keep only the ones it can prove it needs:

```bash
tim npm upgrade {run-id} --phase 4 --branch {branch}
```

Per repo (in parallel), `tim npm reset-overrides` does every trial in a
throwaway git worktree under the run's workarea, so the repo checkout
never sees a red state. With no overrides it runs install, update,
audit, test, lint and `build:frontend`. A failing advisory (high and
above) puts back the overrides on its package or on a package that depends on it; a failing test, lint
or build puts overrides back one at a time, then drops any that turn
out not to matter. It commits "Remove overrides" with a table of kept
overrides and their reasons, and records each override in
`overrides.{repo}.json`. A repo that stops (an advisory no override
covers, or a check that fails with every override back) is reported
for a decision, with its worktree kept.

## Failures

Surface any error to the user with the raw output. Do not retry or
problem-solve. Wait for instruction.

## Scope guidance

See `references/COMMON.md` for the recommended-scope rules — single
repo / single package / planning-only batches.

## Unattended mode

For the nightly jobs only. A run is unattended when a `[nightly:<job>]`
prompt started it or the request says "unattended". Nobody answers
questions, so policy replaces every gate and the walker. Everything
above this section is interactive mode and does not change.

Read `.claude/rules/nightly.md` first. It defines a mechanical change,
the stop conditions, the merge policy and the digest. Each package's
policy comes from `config/dependency-sets.json`:

| Policy | Covers | Evidence |
|---|---|---|
| `ci-is-enough` | a minor or patch, unless its set says otherwise | a row for each code change the package needs, none when it needs none |
| `changelog-driven` | every major, a 0.x minor, a prerelease, and every version of a package in a `changelog-driven` set | a row for every changelog item between the old version and the new one |

govuk-frontend is never upgraded here: the `govuk-upgrade` skill owns
it.

Call only `tim` and `gh`, plus `git` in the repos to push and count
files. One command per Bash call, run from the workspace root.
`<ticket>`, `<branch>`, `<run-id>`, `<repo>`, `<package>`, `<target>`,
`<n>`, `<model>` and `<session link>` below are placeholders you fill
in. The last two come from the session's commit attribution lines.

### U1. Choose the work and the branch

The job's prompt names the packages: one package, or a coupled set's
members from `config/dependency-sets.json` (wildcards such as
`@vitest/*` are fine). It also names the repos.

- The ticket is the job's standing key, EUDPA-802, or `NO_JIRA`. Never
  ask for one and never raise one.
- The branch is `chore/<ticket>-<slug>`, where the slug names the
  package or set and its target in lower case:
  `chore/EUDPA-802-vitest-4.2`. The run id is the branch without
  `chore/` (`EUDPA-802-vitest-4.2`), so each run keeps its own state.
- A set whose `scope` is `cross-repo` runs every repo in one run, on one
  branch name (CLAUDE.md rule 2). A `repo`-scoped set may run one repo
  at a time.
- To check a package's policy before you start:

  ```bash
  tim deps policy <package> --from <current> --to <target>
  ```

### U2. Phase 0: branches and audit

```bash
tim npm upgrade <ticket> --unattended --branch <branch> --phase 0 --repo <repo>
```

Pass one `--repo` per repo. It stops before switching any branch when a
repo has uncommitted changes. Otherwise it puts every repo on the
branch, made from `origin/main` when it is new, then audits them.

- Uncommitted changes: report the repos in the digest and end the run.
  Never stash, reset or clean them.
- Audit red: report it in the digest and end the run. Do not allowlist
  anything.

### U3. Phase 1: plan

```bash
tim npm upgrade <ticket> --unattended --branch <branch> --phase 1 --repo <repo> --package <package> --json
```

Pass one `--package` per package or set member. It records each
package's `policy`, `set`, `set_scope` and `policy_reason` in
`packages.<repo>.json`, and every task in the envelope's `result`
carries `mode`, `policy` and `set`.

Follow `references/DISCOVERY_AND_PLANNING.md` Steps 2 and 3, adding
these lines to every spawn prompt:

```
Mode: unattended
Policy: {policy}
Set: {set}
```

Each planner then follows the "Unattended mode" section of
`references/PACKAGE_PLANNER.md` and records evidence rows with
`tim npm packages add-evidence`. A package still unclassified after the
retry stays that way: the evidence table shows it as needing a person.
No gate after Phase 1.

### U4. Phase 2: automated upgrades

```bash
tim npm upgrade <ticket> --unattended --branch <branch> --phase 2 --repo <repo> --trailer "Co-Authored-By: <model> <noreply@anthropic.com>" --trailer "Claude-Session: <session link>"
```

Give one `--trailer` for each of the session's attribution lines, so
every commit carries them. `--allowlist-owner` and `--expiry-days` are refused, so a new advisory
demotes its package, which then needs a person. `run-auto` skips
`npm run test:docker-compose` in trade-imports-ins-tests and says so on
stderr. No gate after Phase 2.

A status other than `ok` stops the repos it names: report each with its
`phase2.log` in the digest. For a `cross-repo` set, stop the whole run.

### U5. The manual side, without the walker

Do not run `references/WALKER.md`. Read the handoff:

```bash
tim npm upgrade <ticket> --unattended --branch <branch> --phase 3 --repo <repo> --json
```

The envelope's `result.packages` is the job's own work. For each one,
one at a time:

1. A package demoted in Phase 2 with no evidence gets one more
   PACKAGE_PLANNER, spawned as in U3 with the extra line
   `Last failure: {failure_reason}`. Then fold its classification in:

   ```bash
   tim npm packages aggregate --run-id <run-id>
   ```

2. Read the package's rows in
   `workareas/npm-upgrades/<run-id>/<repo>/evidence/<package>.json`,
   where `/` in the name becomes `__`.
3. When no row is `needs-a-person` and at least one is `applied`, spawn
   one `MANUAL_UPGRADE_IMPLEMENTOR` as `references/WALKER.md` Step 4
   does, with the line `Mode: unattended` and no allowlist owner or
   expiry. Run them one at a time.
4. Otherwise hold it back, naming the rows that need a person, or "no
   row to apply" when no row is `applied`:

   ```bash
   tim npm packages set-status --run-id <run-id> --repo <repo> --package <package> --status failed --failure-reason "Needs a person: <the rows' items>"
   ```

Skip `references/WALKER.md` Step 4.5. Never start the Docker Compose
stack, `tim docker` or `npm run test:docker-compose`. CI's "E2E Tests"
check is the end-to-end proof.

### U6. Check the evidence

For every package with evidence rows, count its patterns again and
record the hits after. The implementor has already done this for its
own package; running it again is safe.

```bash
tim npm packages check-evidence --run-id <run-id> --repo <repo> --package <package>
```

Exit 1 means a row is not clean. The table shows it, and the pull
request stays a draft.

### U7. Push and open the pull requests

Only repos with commits ahead of `origin/main` get a pull request. For
each one:

1. Render its packages and evidence, then read the clean flag:

   ```bash
   tim npm packages render-evidence --run-id <run-id> --repo <repo>
   ```

   ```bash
   tim npm packages render-evidence --run-id <run-id> --repo <repo> --json
   ```

   The envelope's `result.clean` says whether every package in the repo
   is clean: classified, its policy recorded, upgraded, and every
   evidence row clean, with evidence for a `changelog-driven` package.
2. Write the pull request body to
   `workareas/npm-upgrades/<run-id>/<repo>/pr-body.md`: one sentence
   saying what moves, the rendered tables as they are, a "Why this is a
   draft" paragraph when it is not clean, and the attribution line.
3. Push. The Sonar push gate runs on the push.

   ```bash
   git -C repos/<repo> push -u origin <branch>
   ```

4. Look for the pull request:

   ```bash
   gh pr list --repo DEFRA/<repo> --head <branch> --state open --json number,url,isDraft
   ```

   None open: create it, with `--draft` when it is not clean.

   ```bash
   gh pr create --repo DEFRA/<repo> --base main --head <branch> --title "chore(<ticket>): upgrade <package or set> to <target>" --body-file workareas/npm-upgrades/<run-id>/<repo>/pr-body.md
   ```

   One already open: update its body.

   ```bash
   gh pr edit <n> --repo DEFRA/<repo> --body-file workareas/npm-upgrades/<run-id>/<repo>/pr-body.md
   ```

### U8. Watch the checks

Watch each pull request's checks until they finish. Run it in the
background and wait for it to end.

```bash
gh pr checks <n> --repo DEFRA/<repo> --watch --interval 60
```

Then read them:

```bash
gh pr checks <n> --repo DEFRA/<repo> --json name,bucket,link
```

"E2E Tests" reports only after "Check Pull Request" passes, so a watch
can end before it appears. When the repo has
`.github/workflows/e2e-tests.yml` and "E2E Tests" is missing or
pending, watch again. Green means every check's `bucket` is `pass` or
`skipping`, "E2E Tests" included.

### U9. Fix on red

Read the failed run's log, using the run id from the check's `link`:

```bash
gh run view <actions-run-id> --repo DEFRA/<repo> --log-failed
```

Fix it only with a mechanical change, commit it as
`chore(<ticket>): <what the fix does>`, push and watch again (U7 step 3,
then U8). Stop when `nightly.md` says to stop: the fix changes runtime
behaviour, edits a test assertion, takes the branch past about 10 files,
needs a flag `nightly.md` bans, or this is the third push-and-watch
cycle (the first push counts as one). Count the files with:

```bash
git -C repos/<repo> diff --stat origin/main...HEAD
```

After a fix, run U6 again, then U7 steps 1, 2 and 4 to refresh the
body.

### U10. Merge or leave a draft

A pull request can merge only when all of these hold:

- `tim npm packages render-evidence --run-id <run-id> --repo <repo> --json`
  gives `clean: true`
- every check is green, "E2E Tests" included
- every change was mechanical, and no stop condition was hit

When the run moves a `cross-repo` set, its pull requests move together:
merge them only when every one passes, and otherwise merge none. Each
repo of a `repo`-scoped run stands on its own.

To merge:

```bash
gh pr merge <n> --repo DEFRA/<repo> --squash --delete-branch
```

A pull request that cannot merge becomes a draft, with the reason in its
body (U7 step 2, then `gh pr edit`):

```bash
gh pr ready <n> --repo DEFRA/<repo> --undo
```

### U11. Digest

Append to this job's section of
`workareas/nightly/<yyyy-mm-dd>/digest.md`, in the format `nightly.md`
sets: one line per pull request, with its link and outcome. Each draft
also goes under "Needs you", naming the rows that need a person or the
stop condition that was hit.

## References

- `references/COMMON.md` — prerequisites, failure types, global rules.
- `references/DISCOVERY_AND_PLANNING.md` — Phase 1 manager (discovery + fan-out to `PACKAGE_PLANNER.md` workers).
- `references/AUTOMATED_EXECUTION.md` — Phase 2 manager (auto upgrades).
- `references/MANUAL_HANDOFF.md` — Phase 3 manager (manual handoff report).
- `references/WALKER.md` — interactive batch-triage walker over manual + failed-auto packages.
- `references/PACKAGE_PLANNER.md` — per-package research + auto/manual classification (spawned per package as `general-purpose`).
- `references/MANUAL_UPGRADE_IMPLEMENTOR.md` — per-package atomic edit-test-commit-rollback worker (spawned by the WALKER on `I`).
- `assets/packages-table.md` — canonical JSON schema for `packages.{repo}.json`.

Commands:

- `tim npm upgrade` — single dispatcher (phase 0 / 1 / 2 / 3 / 4); `--json` gives each phase's report as the envelope's `.result`.
- `tim npm audit baseline` — Phase 0 and per-upgrade audit check (audit-ci, plus whether each advisory has a fix).
- `tim npm audit allow` — write or renew one `audit-ci.jsonc` allowlist entry.
- `tim npm refresh-lockfile` — Phase 2 end-of-batch transitive refresh.
- `tim npm reset-overrides` — Phase 4 per-repo override reset.
- `tim npm discover` — discovery + seed `packages.{repo}.json`.
- `tim npm context prebake` — per-package context pre-bake (best-effort).
- `tim npm context best-practices` — per-repo best-practices bundle.
- `tim npm packages set-classification` / `tim npm packages set-status` — JSON state writers.
- `tim npm packages list` / `tim npm packages counts` — JSON state queries.
- `tim npm packages verify` — Phase 1 gate.
- `tim npm run-auto` — Phase 2 per-repo runner.
- `tim npm upgrade-one` — Phase 2 helper (install + test + commit + rollback; JSON-aware).
- `tim npm run-manual` — Phase 3 per-package runner (spawned by WALKER on `I`).

Unattended mode:

- `tim npm upgrade --unattended` — takes `NO_JIRA` as the ticket, needs `--branch chore|fix|feat/<ticket>-<slug>`, refuses `--allowlist-owner` and `--expiry-days`; `--package` (any run) narrows discovery.
- `tim deps policy` — a package's policy for one version jump.
- `tim npm packages set-policy` — record each package's policy in `packages.{repo}.json` (phase 1 does it; `tim npm discover --record-policy` too).
- `tim npm packages add-evidence` / `tim npm packages check-evidence` — record a changelog item's evidence row, then count every row again after the edits.
- `tim npm packages render-evidence` — read-only: the packages and evidence tables for a pull request body; `--json` gives the clean flag for the run, each repo and each package.
- `tim npm run-auto --unattended` — Phase 2 runner that skips `npm run test:docker-compose`.
- `--trailer <line>` on `tim npm upgrade`, `run-auto`, `upgrade-one`, `run-manual`, `refresh-lockfile` and `reset-overrides` — adds the line to the end of every commit message it makes; give it once for each attribution line.
- `tim deps evidence count <repo> <pattern>` — the hits a pattern has in a repo now.
