# Phase 2 Manager — Changelog Analysis and Planning

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

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
~/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh \
  --run-id {run-id} --filter unplanned --json
```

If the JSON `summary.unplanned == 0`: report "All versions already
classified. Phase 2 complete (nothing to do)."

## Step 2: Spawn VERSION_PLANNER workers

The Step 1 JSON has one entry per unplanned `{repo, version}` pair.
Spawn one `general-purpose` Task subagent per pair concurrently
(no cap — Decision 7). Spawn prompt:

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/govuk-upgrade/references/VERSION_PLANNER.md.

Run ID: {run-id}
Repository: {repo-name}
Repo path: ~/git/defra/trade-imports-workspace/repos/{repo-name}
Version: {version}
Pre-baked changelog: ~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/{repo-name}/version__{version}.changelog.md
Best-practices bundle: ~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/{repo-name}/best-practices.md
```

## Step 3: Verify coverage

Wait for all subagents to complete, then re-run the unplanned query:

```bash
~/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh \
  --run-id {run-id} --filter unplanned --json
```

If any remain, re-spawn `VERSION_PLANNER` workers for them once. Still
remaining after retry → list as INCOMPLETE in report. The walker
handles INCOMPLETE entries by surfacing them as `Discuss` by default
(see `references/PLAN_WALKER.md`) — do NOT block Phase 3 here.

## Step 4: Report

```bash
~/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh --run-id {run-id}
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
