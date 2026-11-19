# Phase 2 Manager — Changelog Analysis and Planning

**Bash call hygiene** — one command per Bash call. Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

**Job:** Spawn `general-purpose` Task subagents following
`references/VERSION_PLANNER.md`, one per unplanned version across every
in-scope repo. Verify all versions are classified as `todo` or `noop`.

## Boundaries

Delegate and verify coverage only. Do not read changelog content,
evaluate changes, or touch source files.

## Inputs

- `{run-id}` — Jira ticket e.g. EUDPA-20578

## Step 1: List unplanned versions

```bash
tim govuk plans --run-id {run-id} --filter unplanned --json
```

If the envelope's `result.summary.unplanned == 0`: report "All versions
already classified. Phase 2 complete (nothing to do)."

## Step 2: Spawn VERSION_PLANNER workers

The Step 1 envelope's `result.repos[].versions` has one entry per
unplanned `{repo, version}` pair.
Spawn one `general-purpose` Task subagent per pair concurrently
(no cap — Decision 7). Spawn prompt:

```
Follow the instructions in .claude/skills/govuk-upgrade/references/VERSION_PLANNER.md.

Run ID: {run-id}
Repository: {repo-name}
Repo path: repos/{repo-name}
Version: {version}
Pre-baked changelog: workareas/govuk-upgrades/{run-id}/{repo-name}/version__{version}.changelog.md
Best-practices bundle: workareas/govuk-upgrades/{run-id}/{repo-name}/best-practices.md
```

In an unattended run (SKILL.md "Unattended mode"), add a last line
`Mode: unattended` to every spawn prompt. The planner then records an
evidence row for every changelog item. In Step 3, an INCOMPLETE version
is not sent to the walker: the evidence table shows it as needing a
person.

In an unattended run, spawn one repo's planners one after another, and
different repos' planners at the same time. Every write rewrites the
repo's whole `versions.{repo}.json`, so two planners writing it at once
can lose a row. A lost `needs-a-person` row would let the pull request
merge.

## Step 3: Verify coverage

Wait for all subagents to complete, then re-run the unplanned query:

```bash
tim govuk plans --run-id {run-id} --filter unplanned --json
```

If any remain, re-spawn `VERSION_PLANNER` workers for them once. Still
remaining after retry → list as INCOMPLETE in report. The walker
handles INCOMPLETE entries by surfacing them as `Discuss` by default
(see `references/PLAN_WALKER.md`) — do NOT block Phase 3 here.

## Step 4: Report

```bash
tim govuk plans --run-id {run-id}
```

```
=== PHASE 2 COMPLETE ===

{repo}:
  Todo:        {count} — {list}
  Noop:        {count} — {list}
  Incomplete:  {count} — surfaced in walker

Total across in-scope repos:
  Todo (code changes needed): {count}  → walker, then Phase 3
  Noop (no changes needed):   {count}  → skipped in Phase 3
  Incomplete:                 {count}  → walker (Discuss)
```
