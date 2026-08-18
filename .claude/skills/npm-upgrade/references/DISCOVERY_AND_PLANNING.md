# Discovery and Planning — npm-upgrade Phase 1

**Job:** Discover outdated packages across all requested repos and
delegate per-package research to `general-purpose` Task subagents
following `references/PACKAGE_PLANNER.md`. Verify every package row
in every `packages.{repo}.json` has been classified before handing
off to Phase 2.

## Boundaries

Discover, fan out, gate. Do not read the migration content the
PACKAGE_PLANNER produced (it's in JSON via `packages-set-classification.sh`),
do not override classifications, do not touch source files.

## Inputs

- `{run-id}` — Jira ticket, e.g. EUDPA-20578.

Repos default to all 4 EUDP Live Animals Node repos under
`~/git/defra/trade-imports-workspace/repos/`. Strategy defaults to
`latest`.

---

## Step 1: Dispatcher — discover and pre-bake

One call sets up everything: discovery, per-repo best-practices
bundle, per-package context pre-bake, and emits a JSON spawn manifest.

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 1
```

Optionally narrow to a subset:

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 1 --repo trade-imports-animals-frontend --repo trade-imports-animals-admin --strategy minor
```

Stdout shape (between sentinel lines):

```
MANIFEST_BEGIN
{"ticket":"EUDPA-X","repo":"...","package":"...","current":"...","target":"...","upgrade_type":"...","dependency_type":"...","context_baked":...,"context_missing":[...]}
{"ticket":"EUDPA-X","repo":"...","package":"...",...}
...
MANIFEST_END
```

Each manifest line is a complete spawn task for one PACKAGE_PLANNER
subagent.

---

## Step 2: Spawn PACKAGE_PLANNER workers (parallel)

For each manifest entry, spawn one `general-purpose` Task subagent
concurrently. The spawn prompt is the same shape regardless of
context-bake state — the worker reads its pre-baked files and
hydrates anything marked partial/false.

### Spawn prompt template

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/PACKAGE_PLANNER.md.

Run ID: {ticket}
Repository: {repo}
Package: {package}
Current: {current}
Target: {target}
Upgrade type: {upgrade_type}
Dependency: {dependency_type}

Context bundle: ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{ticket}/{repo}/.context/{normalized-package}/
  - package-meta.json (always present)
  - usages.txt (Grep over repos/{repo}/src — may be empty if no usages found)
  - changelog.md (present iff context_baked != false and "changelog" not in context_missing)
  - migration.md (rarely present — worker normally hydrates)

context_baked: {context_baked}
context_missing: {context_missing}

Per-repo best practices: ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{ticket}/{repo}/best-practices.md
```

Where `{normalized-package}` substitutes `/` with `__` (so
`@hapi/hapi` → `@hapi__hapi`).

---

## Step 3: Verify coverage gate

After all subagents return, run the gate:

```bash
~/git/defra/trade-imports-workspace/tools/npm/verify-classification-coverage.sh --run-id {run-id}
```

Exit 0 → every package has `classification != null`. Move to Step 4.

Exit 1 → pending packages listed on stderr. Re-spawn PACKAGE_PLANNER
workers for the offending packages once more. If still pending after
retry, list them in the Phase 1 report as INCOMPLETE and stop.

---

## Step 4: Report

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-counts.sh --run-id {run-id}
```

Format the operator-facing summary verbatim from that output, then
present:

```
=== PHASE 1 COMPLETE ===

Counts (from packages-counts.sh):
  Total: {N}
  Auto:    {count}  → Phase 2
  Manual:  {count}  → Phase 3
  Pending: {count}  → INCOMPLETE (re-run discovery or escalate)

By risk (manual side):
  HIGH:   {count}
  MEDIUM: {count}
  LOW:    {count}
```

---

## Notes for the worker

- PACKAGE_PLANNER writes its classification via
  `packages-set-classification.sh`. There is no markdown plan file on
  disk to inspect.
- `packages-list.sh --filter pending --json` answers "what's still
  unclassified" if you need it between worker waves; the dispatcher
  uses it inside `verify-classification-coverage.sh`.
