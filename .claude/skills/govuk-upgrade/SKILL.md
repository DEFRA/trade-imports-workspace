---
name: govuk-upgrade
description: 'Upgrade the govuk-frontend package across every EUDP trade-imports Node.js repo that consumes it. A four-stage workflow driven by canonical per-repo JSON state (`versions.{repo}.json`): Phase 1 = `tim govuk start` (ticket → branch → discover repos → seed state + pre-bake CHANGELOG sections + best-practices bundle), Phase 2 = fan-out one `general-purpose` Task subagent per pending version following `references/VERSION_PLANNER.md` (uses `tim govuk classify` + `tim govuk add-change`), optional Walker = batch triage of pending plans following `references/PLAN_WALKER.md`, Phase 3 = strict-semver-order `tim govuk apply` per `todo` version (package.json + npm install + npm test + commit + state transition), then E2E once at the end. An unattended mode for the nightly jobs (`tim govuk start --unattended`) replaces every gate and the walker with the policy in `.claude/rules/nightly.md`, records evidence for every changelog item with `tim govuk add-evidence`, refuses to apply a version whose evidence is not clean, and leaves end-to-end proof to CI. Stays inside the govuk-frontend toolbox — Nunjucks macros, govuk-* utility classes, no custom CSS or hand-rolled components. Triggers: "upgrade govuk-frontend", "govuk upgrade", "govuk-frontend upgrade", "bump govuk-frontend", "walk govuk EUDPA-XXX", "tim govuk start". NOT for non-govuk-frontend npm bumps — use `npm-upgrade`. NOT for raising the tracking ticket itself — use `ticket-creator`.'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX [--target X.Y.Z] [--unattended]'
---

Upgrade `govuk-frontend` across the Node.js repos that consume it. The
workflow walks every intermediate semver between current and target,
plans per-repo code changes from each release's CHANGELOG, and applies
them in strict order with a commit per version.

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

## When to use

This is for `govuk-frontend` specifically (Nunjucks macros + GDS
components + the SCSS utility classes). For non-govuk-frontend npm bumps,
use the `npm-upgrade` skill.

| Trigger | Stage | Entry point |
|---|---|---|
| "upgrade govuk-frontend" / "govuk upgrade" / "bump govuk-frontend" | Start a fresh run | Step 1 below → `tim govuk start` |
| "continue govuk EUDPA-XXX" | Resume mid-run | Re-enter at the next gate (Phase 2 / walker / Phase 3) |
| "walk govuk EUDPA-XXX" | Batch-triage pending plans | `references/PLAN_WALKER.md` |
| "implement govuk EUDPA-XXX" / "apply govuk EUDPA-XXX" | Run Phase 3 | `references/PHASE_3_MANAGER.md` |
| "govuk status EUDPA-XXX" | Status snapshot | `tim govuk plans --run-id EUDPA-XXX` |
| A nightly job's `[nightly:<job>]` prompt, or "govuk upgrade unattended" | Unattended run | [Unattended mode](#unattended-mode) below. Nothing above it applies |

## Repos in scope

Auto-detected at Phase 1 by `tim govuk start` — any repo under
`repos/*` whose `package.json` lists `govuk-frontend` is in scope. The
list is written to
`workareas/govuk-upgrades/{run-id}/.run-meta.json` as `repos[]`.
Phase 2 and Phase 3 iterate that list; no skill prose hard-codes repo
membership.

## Worker references

| Persona | Used in | Mutation surface |
|---|---|---|
| `references/VERSION_PLANNER.md` | `references/PHASE_2_MANAGER.md` Step 2 — one per unplanned version, parallel fan-out | `tim govuk classify` + `tim govuk add-change` against `versions.{repo}.json` |

Spawn idiom inside Phase 2: Task tool with `subagent_type: general-purpose`
and a prompt beginning `Follow the instructions in .claude/skills/govuk-upgrade/references/VERSION_PLANNER.md.`
`general-purpose` carries `Tools: *` so the worker can Read the pre-baked
changelog, Grep the repo, and call `tim govuk classify` and `tim govuk add-change`.

## Step 1: Establish ticket + branch

Interactive mode, from here to "Failures". An unattended run skips to
[Unattended mode](#unattended-mode) and asks nothing.

Ask the user which ticket this upgrade tracks. Three paths:

1. **Existing ticket** — they give an `EUDPA-XXXXX`. Branch is
   `chore/EUDPA-XXXXX`. Proceed to Step 2.
2. **Create a new ticket** — write a `tim-ticket/1` manifest with
   DevOps conventions (`project` from `JIRA_PROJECT_KEY`, type `Task`,
   parent `EUDPA-144`, labels `DevOps` + `tech-improvement`, priority
   `Medium`) and raise it with
   `tim jira create --from ticket.json` (a dry run), then
   `--confirm <planId>` once the user approves. See the
   `ticket-creator` skill for the manifest and the GDS
   question-gathering flow. Capture the new ticket key from
   `ticket.created.json`, then Branch is `chore/EUDPA-XXXXX`.
3. **Custom branch name (no Jira ticket)** — accept the user-supplied
   branch verbatim. Use this only when there's a deliberate reason not
   to track work in Jira.

## Step 2: Run Phase 1 dispatcher

```bash
tim govuk start --ticket EUDPA-XXXXX [--target 6.1.0]
```

Or with a custom branch:

```bash
tim govuk start --branch <branch-name> [--target 6.1.0]
```

`tim govuk start` writes `.run-meta.json`, ensures every in-scope repo
is on the branch, and seeds `versions.{repo}.json` + pre-bakes the
per-version changelog and best-practices files. It prints `PHASE: 1`
on the first line so you can confirm the dispatch. `--force` downloads
the changelog again and reseeds every version, losing any plan already
made.

Present its report verbatim. **Gate:** "Phase 1 complete. Proceed to
Phase 2 (changelog analysis)?"

## Phase 2: Changelog Analysis and Planning

```
Follow references/PHASE_2_MANAGER.md. Run ID: {run-id}
```

Phase 2 delegates per-version analysis to `general-purpose` Task
subagents following `references/VERSION_PLANNER.md` — one instance per
version stub, parallel fan-out.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

Present its report verbatim. **Gate:** "Phase 2 complete. Walk the
plans before Phase 3?"

## Walker (Phase 2 → Phase 3 batch triage)

```
Follow references/PLAN_WALKER.md. Run ID: {run-id}
```

The walker presents every pending version's plan in one batch table
and takes a single keystroke string from the user
(`A`pply / `S`kip / `D`iscuss / `Q`uarantine). INCOMPLETE versions
from Phase 2 land here as `unplanned` rows — the user can re-plan,
skip, or quarantine them per Decision 5.

The walker is optional. If the user is happy with the Phase 2 report,
proceed straight to Phase 3.

## Phase 3: Implementation

```
Follow references/PHASE_3_MANAGER.md. Run ID: {run-id}
```

Present its report verbatim. End of automated work.

## Failures

Surface any error to the user with the raw output. Do not retry or
problem-solve. Wait for instruction.

## Unattended mode

For the nightly jobs only. A run is unattended when a `[nightly:<job>]`
prompt started it or the request says "unattended". Nobody answers
questions, so policy replaces every gate and the walker. Everything
above this section is interactive mode and does not change.

Read `.claude/rules/nightly.md` first. It defines a mechanical change,
the stop conditions, the merge policy and the digest. govuk-frontend is
`changelog-driven` at every version (`tim deps policy govuk-frontend
--from <current> --to <target>` says so): green CI is needed but not
enough, and every evidence row must be clean.

Call only `tim` and `gh`, plus `git` in the repos to push and count
files. One command per Bash call, run from the workspace root.
`<run-id>`, `<ticket>`, `<target>`, `<branch>`, `<repo>`, `<version>`,
`<n>`, `<model>` and `<session link>` below are placeholders you fill
in. The last two come from the session's commit attribution lines.

### U1. Start

```bash
tim govuk start --unattended --ticket EUDPA-802 --target <target>
```

- The ticket is the job's standing key, EUDPA-802, or `NO_JIRA`. Never
  ask for one and never raise one.
- Leave out `--target` to take the latest release. A nightly job moves
  one version per night, so it normally passes the next one.
- The run id is `<ticket>-govuk-frontend-<target>` and the branch is
  `chore/<run-id>`, the same in every in-scope repo (CLAUDE.md rule 2).
  `start` fetches origin and makes the branch from `origin/main`, or
  checks out the existing branch to resume. The header it prints says
  `Mode: unattended`.
- It stops before switching any branch when a repo has uncommitted
  changes. Every in-scope repo moves together, so leaving one out would
  split the upgrade. Report the repos in the digest and end the run.
- An npm advisory in its security pre-flight goes in the digest. Carry
  on: if a repo's commit hook then refuses the commit, U4 records the
  failure.

### U2. Plan

Follow `references/PHASE_2_MANAGER.md` with the run id, and its
"Unattended mode" changes: add the line `Mode: unattended` to every
spawn prompt, and plan one repo's versions one at a time. Each planner
follows the "Unattended mode" section of `references/VERSION_PLANNER.md`
and records an evidence row for every changelog item with
`tim govuk add-evidence`. No gate after Phase 2.

### U3. No walker

Do not run `references/PLAN_WALKER.md`. The planner's outcomes are the
policy:

| Outcome | What happens |
|---|---|
| `applied` | A mechanical change. U4 makes it. |
| `not-applicable` | Nothing to change. |
| `needs-a-person` | Nothing is changed. The repo stops at this version, and its pull request stays a draft. |

A version still unplanned after Phase 2's retry stays unplanned. The
evidence table shows it as needing a person.

### U4. Apply

Follow `references/PHASE_3_MANAGER.md` Steps 1 to 3, with its
"Unattended mode" changes. Version by version, in semver order and
`noop` included, each repo:

- stops at a version with a `needs-a-person` row, before any edit
- makes only the `changes[]` edits, each one for an `applied` row
- records the counts after the edits with `tim govuk check-evidence`
- applies with `tim govuk apply --unattended`, which refuses, changing
  nothing, a version whose evidence is not all clean. Pass the session's
  attribution lines with `--trailer`, one each, so the commit carries
  them:

  ```bash
  tim govuk apply --run-id <run-id> --repo <repo> --govuk-version <version> --unattended --trailer "Co-Authored-By: <model> <noreply@anthropic.com>" --trailer "Claude-Session: <session link>"
  ```

Skip Step 4 of `PHASE_3_MANAGER.md`. Never start the Docker Compose
stack, `tim docker` or `npm run test:docker-compose`. CI's "E2E Tests"
check is the end-to-end proof.

A stopped repo keeps the versions it applied before the stop. Its
pull request opens as a draft, and the evidence table names the version
that stopped it.

### U5. Push and open the pull requests

Only repos with commits ahead of `origin/main` get a pull request. A
repo already at the target has none. For each one:

1. Render its evidence table, then read the clean flag:

   ```bash
   tim govuk render-evidence --run-id <run-id> --repo <repo>
   ```

   ```bash
   tim govuk render-evidence --run-id <run-id> --repo <repo> --json
   ```

   The envelope's `result.allClean` says whether every row is clean.
2. Write the pull request body to
   `workareas/govuk-upgrades/<run-id>/<repo>/pr-body.md`: one sentence
   saying what moves (`govuk-frontend <current> to <target>`), the
   rendered table as it is, a "Why this is a draft" paragraph when it is
   not clean, and the attribution line.
3. Push. The Sonar push gate runs on the push.

   ```bash
   git -C repos/<repo> push -u origin <branch>
   ```

4. Look for the pull request:

   ```bash
   gh pr list --repo DEFRA/<repo> --head <branch> --state open --json number,url,isDraft
   ```

   None open: create it, with `--draft` when the table is not clean.

   ```bash
   gh pr create --repo DEFRA/<repo> --base main --head <branch> --title "chore(<ticket>): upgrade govuk-frontend to <target>" --body-file workareas/govuk-upgrades/<run-id>/<repo>/pr-body.md
   ```

   One already open: update its body.

   ```bash
   gh pr edit <n> --repo DEFRA/<repo> --body-file workareas/govuk-upgrades/<run-id>/<repo>/pr-body.md
   ```

### U6. Watch the checks

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

### U7. Fix on red

Read the failed run's log, using the run id from the check's `link`:

```bash
gh run view <actions-run-id> --repo DEFRA/<repo> --log-failed
```

Fix it only with a mechanical change, commit it as
`chore(<ticket>): <what the fix does>`, push and watch again (U5 step 3,
then U6). Stop when `nightly.md` says to stop: the fix changes runtime
behaviour, edits a test assertion, takes the branch past about 10 files,
or this is the third push-and-watch cycle (the first push counts as
one). Count the files with:

```bash
git -C repos/<repo> diff --stat origin/main...HEAD
```

After a fix, run `tim govuk check-evidence` again for every version the
repo applied, so a fix that brings an old pattern back shows, then U5
steps 1, 2 and 4 to refresh the body.

### U8. Merge or leave a draft

Every in-scope repo of the run moves together, on one branch name. Merge
only when every pull request in the run passes all of these:

- `tim govuk render-evidence --run-id <run-id> --repo <repo> --json`
  gives `allClean: true`
- every check is green, "E2E Tests" included
- every change was mechanical, and no stop condition was hit

Then, for each pull request:

```bash
gh pr merge <n> --repo DEFRA/<repo> --squash --delete-branch
```

If any pull request fails a condition, merge none of them. Mark each one
that is not already a draft as a draft, and put the reason in its body
(U5 step 2, then `gh pr edit`):

```bash
gh pr ready <n> --repo DEFRA/<repo> --undo
```

### U9. Digest

Append to this job's section of
`workareas/nightly/<yyyy-mm-dd>/digest.md`, in the format `nightly.md`
sets: one line per pull request, with its link and outcome. Each draft
also goes under "Needs you", naming the rows that need a person or the
stop condition that was hit.

## References

- `references/PHASE_1_MANAGER.md` — Phase 1 gate (`tim govuk start` wrapper).
- `references/PHASE_2_MANAGER.md` — fan-out to `VERSION_PLANNER.md` workers.
- `references/PLAN_WALKER.md` — batch triage of Phase 2 output before Phase 3.
- `references/PHASE_3_MANAGER.md` — implementation in strict semver order (delegates to `tim govuk apply`).
- `references/VERSION_PLANNER.md` — single-version CHANGELOG analysis + per-repo plan classification (spawned per version as `general-purpose`).

Best-practices (load when the changelog warrants):

- `docs/best-practices/node/govuk-frontend.md` — primary technical reference.
- `docs/best-practices/gds/components.md` — GDS component rules.
- `docs/best-practices/gds/patterns.md` — question-page / task-list patterns.
- `docs/best-practices/gds/accessibility.md` — WCAG / a11y.
- `docs/best-practices/gds/styles.md` — typography + colour utilities.

Phase 1, in tim:

- `tim govuk start` — Phase 1 dispatcher: `.run-meta.json` (every repo under `repos/` whose `package.json` lists govuk-frontend), branch setup per repo, version discovery from the npm registry (`npm_config_registry` when set), the cached CHANGELOG with its per-version sections, the best-practices bundle and the security pre-flight (`npm audit` per repo).

Read-only views of the canonical JSON, in tim:

- `tim govuk plans` — filterable status view: each repo's counts and versions (`--filter`, `--sort-semver`, `--json`).
- `tim govuk summaries` — the walker's work list: one row per version still to apply that is not a noop.
- `tim govuk render-plan` — markdown view of one version's plan.

Writes to the canonical JSON and the repos, in tim:

- `tim govuk classify` / `tim govuk add-change` — VERSION_PLANNER's mutation surface for `versions.{repo}.json`.
- `tim govuk apply` — Phase 3 per-version: update package.json, `npm install`, `npm test`, commit, mark done (last action).
- `tim govuk mark-done` / `tim govuk mark-failed` — state transitions, used by `tim govuk apply` and the walker.

Unattended mode, in tim:

- `tim govuk start --unattended` — takes `--ticket` only (a key or `NO_JIRA`), names the branch `chore/<ticket>-govuk-frontend-<target>`, makes it from `origin/main`, and stops before switching any branch when a repo has uncommitted changes.
- `tim govuk add-evidence` / `tim govuk check-evidence` — record a changelog item's evidence row, counting the pattern's hits before the change, then count every row again after the edits. `check-evidence` exits 1 when any row is not clean.
- `tim govuk apply --unattended` — refuses, changing nothing, a version whose evidence is not all clean.
- `tim govuk apply --trailer <line>` — adds the line to the end of the commit message; give it once for each attribution line.
- `tim govuk render-evidence` — read-only: the evidence table for a pull request body; `--json` gives `allClean`.
- `tim deps evidence count <repo> <pattern>` — the hits a pattern has in a repo now.

Each takes the version as `--govuk-version`, since `--version` prints tim's own version.