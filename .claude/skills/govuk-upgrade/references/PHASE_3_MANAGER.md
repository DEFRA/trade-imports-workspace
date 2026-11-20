# Phase 3 Manager — Implementation

**Bash call hygiene** — one command per Bash call. Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

**Job:** Apply every `todo`-classified version per repo in strict semver
ascending order. Stop a repo on first failure.

## Boundaries

Edit source files per the plan in `versions.{repo}.json`. Hand off the
package.json / install / test / commit / state-transition cycle to
`tim govuk apply`. Do not skip versions, reorder them, or modify
`noop`-classified entries.

## Inputs

- `{run-id}` — Jira ticket e.g. EUDPA-20578

## Step 1: Snapshot work

```bash
tim govuk plans --run-id {run-id}
```

If `Todo: 0 Failed: 0`: report "Nothing to implement. Phase 3 complete."

## Step 2: Per-repo, per-version loop

Read the in-scope repo list from `.run-meta.json`:

```bash
jq -r '.repos[]' workareas/govuk-upgrades/{run-id}/.run-meta.json
```

For each repo, list pending versions in semver order:

```bash
tim govuk plans --run-id {run-id} --repo {repo-name} --filter pending --sort-semver --json
```

For each entry of the envelope's `result.repos[0].versions`, in that
order:

### 2a. Make source-file changes

Read the plan (renders the JSON entry as markdown):

```bash
tim govuk render-plan --run-id {run-id} --repo {repo-name} --govuk-version {version}
```

Apply every change listed under `## Changes Required` to the files
named. Don't touch files not in the list. (No source edits are needed
for `noop`-classified versions — `tim govuk apply` short-circuits
them in Step 2b.)

### 2b. Apply

```bash
tim govuk apply --run-id {run-id} --repo {repo-name} --govuk-version {version}
```

`tim govuk apply` handles everything from here:

- Mutates `package.json` (exact version for intermediates, recorded
  `original_constraint_prefix + version` for the final target — it
  auto-detects "final" by comparing to `target_version` in the JSON).
- Runs `npm install` (output to `/tmp/govuk-install-...txt`).
- Runs `npm test` (output to `/tmp/govuk-test-...txt`).
- On success: `git add -A`, commits with
  `chore({run-id}): upgrade govuk-frontend to {version}`, then calls
  `tim govuk mark-done` with the new SHA as its LAST action, and exits 0.
- On failure: marks the version failed with the log path as the
  reason, prints the reason to stderr and exits 1.

If `tim govuk apply` exits non-zero, Read the referenced `/tmp/...txt`
log file, surface the failing test/error to the user, and **stop this
repo**. Do not proceed to its next pending version.

## Step 3: Report

```bash
tim govuk plans --run-id {run-id}
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

## Unattended mode

In an unattended run (SKILL.md "Unattended mode") Steps 1 to 3 change
like this, and Step 4 is skipped:

- **Step 1.** Do not stop at `Todo: 0 Failed: 0`. Run Step 2 for every
  repo with a pending version, `noop` included: `tim govuk apply` bumps
  `package.json` for the target version even when it is `noop`, so a
  run of `noop` versions still lands the upgrade.
- **Before 2a.** Read the version's evidence rows:

  ```bash
  tim govuk render-evidence --run-id {run-id} --repo {repo-name}
  ```

  A `needs-a-person` row for this version stops the repo here, before
  any edit. `tim govuk apply --unattended` would refuse it anyway.
- **2a.** Make only the `changes[]` edits. Then count the version's
  evidence again and record it, `todo` or `noop`:

  ```bash
  tim govuk check-evidence --run-id {run-id} --repo {repo-name} --govuk-version {version}
  ```

  Exit 1 means a row is not clean: an `applied` pattern still has hits,
  or a `not-applicable` pattern now has some. Fix it with a mechanical
  change and count again, or put back the edits with
  `git -C repos/{repo-name} checkout HEAD -- .` and stop this repo.
- **2b.** Add `--unattended`, and a `--trailer` for each of the
  session's attribution lines:

  ```bash
  tim govuk apply --run-id {run-id} --repo {repo-name} --govuk-version {version} --unattended --trailer "Co-Authored-By: {model} <noreply@anthropic.com>" --trailer "Claude-Session: {session link}"
  ```

  It counts the evidence again and exits 1, changing nothing, when any
  row is not clean. When it fails on `npm install` or `npm test`, read
  the log. If a mechanical change fixes it within the stop conditions
  in `.claude/rules/nightly.md`, make it, run `tim govuk check-evidence`
  again and re-run `tim govuk apply`. Otherwise stop this repo and do
  not ask: the failed version shows in the evidence table.
- **Step 4.** Skip it. Never run `tim docker` or
  `npm run test:docker-compose`. CI's "E2E Tests" check is the
  end-to-end proof, watched from SKILL.md U6.

## Step 4: E2E (only after the last commit lands)

Interactive mode only. Per Decision 3: run E2E once after the final
version commit.

### 4a. Rebuild the stack from local source

E2E runs against the running workspace stack. A stack started before
this run (or from Dockerhub `:latest`) does **not** contain the upgrade
— its frontend/admin/stub containers are stale. You must rebuild the
six repo-backed services from local source so the changes are actually
under test. Dev mode wipes the mongo/floci volumes; that's fine — the
suite creates the state it asserts on (4b).

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
wait for completion before 4b.

### 4b. Run E2E

From the tests repo, run the docker-compose suite (cleans, then runs
Playwright against the dockerised stack):

```bash
npm --prefix repos/trade-imports-ins-tests run test:docker-compose
```

(`test:docker-compose` is the local E2E entry point — the same script CI
runs as `test:docker-compose:ci`.)

On E2E failure, halt and prompt the user — don't auto-revert across N
commits.
