# Phase 3 Manager — Implementation

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

**Job:** Apply every `todo`-classified version per repo in strict semver
ascending order. Stop a repo on first failure.

## Boundaries

Edit source files per the plan in `versions.{repo}.json`. Hand off the
package.json / install / test / commit / state-transition cycle to
`apply-version.sh`. Do not skip versions, reorder them, or modify
`noop`-classified entries.

## Inputs

- `{run-id}` — Jira ticket e.g. EUDPA-20578

## Step 1: Snapshot work

```bash
~/git/defra/trade-imports-workspace/tools/govuk/upgrade-status.sh --run-id {run-id}
```

If `Todo: 0 Failed: 0`: report "Nothing to implement. Phase 3 complete."

## Step 2: Per-repo, per-version loop

Read the in-scope repo list from `.run-meta.json`:

```bash
jq -r '.repos[]' ~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/.run-meta.json
```

For each repo, list pending versions in semver order:

```bash
~/git/defra/trade-imports-workspace/tools/govuk/upgrade-status.sh \
  --run-id {run-id} --repo {repo-name} --filter pending --sort-semver --json
```

For each pending entry in that order:

### 2a. Make source-file changes

Read the plan (renders the JSON entry as markdown):

```bash
~/git/defra/trade-imports-workspace/tools/govuk/render-version-plan.sh \
  --run-id {run-id} --repo {repo-name} --version {version}
```

Apply every change listed under `## Changes Required` to the files
named. Don't touch files not in the list. (No source edits are needed
for `noop`-classified versions — `apply-version.sh` short-circuits
them in Step 2b.)

### 2b. Apply

```bash
~/git/defra/trade-imports-workspace/tools/govuk/apply-version.sh \
  --run-id {run-id} --repo {repo-name} --version {version}
```

`apply-version.sh` handles everything from here:

- Mutates `package.json` (exact version for intermediates, recorded
  `original_constraint_prefix + version` for the final target — it
  auto-detects "final" by comparing to `target_version` in the JSON).
- Runs `npm install` (output to `/tmp/govuk-install-...txt`).
- Runs `npm test` (output to `/tmp/govuk-test-...txt`).
- On success: `git add -A`, commits with
  `chore({run-id}): upgrade govuk-frontend to {version}`, then calls
  `version-mark-implemented.sh` with the new SHA as its LAST action.
- On failure: calls `version-mark-failed.sh` with the log path as
  the reason, exits non-zero.

If `apply-version.sh` exits non-zero, Read the referenced `/tmp/...txt`
log file, surface the failing test/error to the user, and **stop this
repo**. Do not proceed to its next pending version.

## Step 3: Report

```bash
~/git/defra/trade-imports-workspace/tools/govuk/upgrade-status.sh --run-id {run-id}
```

```
=== PHASE 3 COMPLETE ===

{repo}:
  Done:   {versions}
  Noop:   {versions}
  Failed: {version — reason}

Summary:
  Applied: {N} versions committed locally (not pushed)
  Noop:    {N}
  Failed:  {N}

{If failures: name the version and repo; the test log path is in the
versions.{repo}.json failure_reason field.}
```

## Step 4: E2E (only after the last commit lands)

Per Decision 3: run E2E once after the final version commit.

### 4a. Rebuild the stack from local source

E2E runs against the running workspace stack. A stack started before
this run (or from Dockerhub `:latest`) does **not** contain the upgrade
— its frontend/admin/stub containers are stale. You must rebuild the
six repo-backed services from local source so the changes are actually
under test. Dev mode wipes the mongo/floci volumes; that's fine —
`test:docker-compose` reseeds the DB itself (4b).

This is destructive to the user's running stack (tears it down, wipes
volumes). Confirm before doing it if the user has a live stack they
care about.

Two `tim` commands (one per Bash call — no chaining):

```bash
tim docker down
```

```bash
tim docker dev
```

`tim docker dev` is a multi-minute build — run it in the background and
wait for completion before 4b. (`tim docker dev` == `make
docker-compose-dev` == `scripts/stack/run-stack.sh -d`.)

### 4b. Run E2E

From the tests repo, run the docker-compose suite (reseeds the DB,
cleans, then runs Playwright against the dockerised stack):

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose
```

(`test:docker-compose` is the local E2E entry point — the same script CI
runs as `test:docker-compose:ci`.)

On E2E failure, halt and prompt the user — don't auto-revert across N
commits.
