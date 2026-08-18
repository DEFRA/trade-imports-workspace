# Automated Execution — npm-upgrade Phase 2

**Job:** Run automated upgrades (every package with
`classification == "auto"` and a non-`done`/`failed` status) across
all repos. Report what succeeded and what was demoted to manual.

## Boundaries

Trigger the dispatcher, surface its JSON output. Do not investigate
failures, do not retry demoted packages, do not touch any source
files. Demotion (auto → manual) is the correct and final outcome for
any per-package failure in Phase 2; cascade failures (the entire repo
left in an inconsistent state) are the only thing that warrants the
operator's attention.

## Inputs

- `{run-id}` — Jira ticket, e.g. EUDPA-20578.

---

## Step 1: Dispatch

One call runs all repos in parallel and aggregates exit codes:

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 2
```

Stdout is one JSON object:

```json
{
  "status": "ok | cascade_failure | nothing_to_do",
  "cascade_failures": ["{repo}", ...],
  "per_repo": [
    {"repo": "{repo}", "exit_code": 0}
  ]
}
```

- `status == "nothing_to_do"` — no auto packages awaiting upgrade.
  Report that and finish.
- `status == "ok"` — every per-repo runner returned 0. Per-package
  demotions are already recorded in `packages.{repo}.json`
  (classification flipped to `manual`, `demoted_from_auto: true`).
- `status == "cascade_failure"` — at least one repo's runner exited
  with code 1 (rollback itself failed). The listed repos are in an
  inconsistent state and must NOT proceed to Phase 3 until
  investigated.

---

## Step 2: Report

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-counts.sh --run-id {run-id}
```

```
=== PHASE 2 COMPLETE ===

{repo-name}:  {done} upgraded  |  {demoted} demoted to manual  |  cascade: YES/NO
...

Total auto attempted: {N}
  Succeeded: {count}  (committed locally, not pushed)
  Demoted:   {count}  (classification flipped to manual; will appear in Phase 3 handoff)
  Cascade failures: {list repos, or "none"}

{If cascade failures: "These repos are in an inconsistent state and must be investigated before Phase 3."}
```

Pull the per-repo `{done}` / `{demoted}` numbers from
`packages-list.sh`:

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-list.sh --run-id {run-id} --classification auto --status done --json
```

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-list.sh --run-id {run-id} --classification manual --json
```

(Filter the latter for `demoted_from_auto: true` if you want the
"demoted just now" subset specifically.)

---

## Notes

- Demotion is automatic inside `upgrade-one-package.sh` — when an
  install or test fails, the row's classification flips to `manual`
  with `demoted_from_auto: true` and a populated `failure_reason`.
  Phase 3 picks these up alongside the natively-manual packages.
- The runners run sequentially within a repo (no parallel upgrades
  in the same workspace), in parallel across repos.
- No commits are pushed. Operator pushes manually after review.
