# Manual Handoff — npm-upgrade Phase 3

**Job:** Present every remaining manual-classification package (plus
any failed-auto demotions from Phase 2) so the operator can decide
what to implement, defer, or skip. Hand control off to the WALKER
for batched triage.

## Boundaries

Read JSON state and write a report. Do not run commands inside
target repos, do not attempt any implementation in this persona —
the WALKER (and, on `I`-keystroke, the `MANUAL_UPGRADE_IMPLEMENTOR`
worker) own implementation.

## Inputs

- `{run-id}` — Jira ticket, e.g. EUDPA-20578.

---

## Step 1: Dispatch — emit handoff manifest

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 3
```

Stdout shape:

```json
{
  "ticket": "EUDPA-XXXXX",
  "manual_count": N,
  "failed_auto_count": M,
  "packages": [
    {
      "repo": "...",
      "package": "...",
      "current": "...",
      "target": "...",
      "classification": "manual",
      "risk": "LOW | MEDIUM | HIGH",
      "rationale": "...",
      "changes_required_summary": "...",
      "files_affected": [...],
      "implementation_status": null | "todo" | "failed" | ...,
      "failure_reason": "..." | null,
      "demoted_from_auto": true | false
    },
    ...
  ]
}
```

If `manual_count == 0` and `failed_auto_count == 0`: report
"No manual upgrades required — all packages were handled
automatically." Stop.

---

## Step 2: Produce the operator report

Format the manifest as a per-repo grouped report. Pull the per-row
data straight from JSON — do NOT open any files to "extract" risk or
rationale; they're already in the manifest.

```
=== PHASE 3 HANDOFF REPORT ===

Automated upgrades are complete. The following packages require
manual code changes before this branch can be merged.

---

{repo-name}:
  {package} {current} → {target}  [risk: HIGH/MEDIUM/LOW]  [demoted: yes/no]
  Required: {changes_required_summary}
  {if failure_reason: "Last failure: {failure_reason}"}

---

Summary:
  Total manual upgrades: {manual_count} across {N} repos
  ({failed_auto_count} demoted from auto in Phase 2)

  By risk:
    HIGH:   {count} — {package names}
    MEDIUM: {count} — {package names}
    LOW:    {count} — {package names}

Recommended order: tackle LOW/MEDIUM first, HIGH last.
```

---

## Step 3: Hand off to the WALKER

```
Manual handoff manifest ready ({N} packages).
To triage: run `walk upgrade EUDPA-XXXXX` (follows references/WALKER.md).
```

The WALKER reads the same JSON state, presents a single batch table,
takes I/D/S keystrokes per package, and (for `I`) spawns one
`general-purpose` Task subagent following
`references/MANUAL_UPGRADE_IMPLEMENTOR.md`.

---

## Notes

- The JSON manifest contains everything operators need to read; no
  hand-parsing of markdown files.
- `packages-list.sh --classification manual --json` is the same query
  the dispatcher uses; you can call it ad-hoc if the user wants a
  filtered subset (`--risk HIGH`, `--repo {repo}`, etc).
