# Walker — manual-side batch triage

Present every manual (and failed-auto) package in one well-formatted
block, take a **single batch keystroke string** from the user, and
either spawn an implementor worker, file a defer ticket, or leave
the package pending.

**Trigger:** `"walk upgrade EUDPA-XXXXX"`, `"triage upgrade
EUDPA-XXXXX"`, `"implement upgrade EUDPA-XXXXX"`. Optional repo
filter: `"walk upgrade EUDPA-XXXXX {repo}"`.

State schema: `assets/packages-table.md`.

Per Decision 6 this walker is for the **manual side only**. There
is no pre-veto walker on the auto side — Phase 2 just runs.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Step 1: Load the work list

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-list.sh --run-id EUDPA-XXXXX --classification manual --json
```

For an optional repo filter add `--repo {repo}`. Also pull the
failed-auto demotion side (these are already classified manual via
demoted_from_auto, but a separate query helps render them first):

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-list.sh --run-id EUDPA-XXXXX --classification auto --status failed --json
```

If both queries are empty:
```
Nothing to walk — no manual packages and no auto failures.
```
Stop.

Skip packages where `implementation_status == "done"` — they were
already implemented (e.g. by a previous walker session).

---

## Step 2: Present every item, take one batch input

Output one markdown block. Sort manual packages by risk descending
(HIGH first), and put any auto-demoted rows at the top of each risk
bucket to highlight them.

```markdown
**Walking upgrade EUDPA-XXXXX** — N manual packages (M auto-demoted)

| # | Repo | Package | Current → Target | Risk | Type | Demoted | Required |
|---|---|---|---|---|---|---|---|
| 1 | frontend | `@hapi/hapi` | 21.4.8 → 22.0.0 | 🔴 HIGH | major | — | New route shape across server.js + 3 plugins |
| 2 | backend | `pino` | 9.5.0 → 10.0.0 | 🟡 MEDIUM | major | demoted | Logger config API renamed; 12 callsites |
| 3 | admin | `prettier` | 3.8.1 → 3.9.0 | 🔵 LOW | minor | — | None — backwards compatible |
...

**Triage:** type one character per item, in order.

  `I` = Implement now (spawn MANUAL_UPGRADE_IMPLEMENTOR worker)
  `D` = Defer (file follow-up ticket / leave for human)
  `S` = Skip (leave pending)

Expected length: N. Shorter strings tolerated — remaining items
treated as `S`. Whitespace and case ignored.

Your input:
```

Risk badges:
- 🔴 **HIGH**
- 🟡 **MEDIUM**
- 🔵 **LOW**
- ⚪ **UNKNOWN** (rare — only when PACKAGE_PLANNER couldn't conclude)

Use the row's `changes_required_summary` for the "Required" column.
If empty, fall back to `rationale`.

Don't include code snippets or per-package narrative in this view —
the goal is one screen the user can scan.

---

## Step 3: Apply the batch

Normalise input (strip whitespace, uppercase). Reject anything that
isn't `I`, `D`, or `S` with a clear error and re-prompt.

| Char | Action |
|---|---|
| `I` | Spawn `MANUAL_UPGRADE_IMPLEMENTOR` subagent (Step 4) |
| `D` | Defer — mark status=todo with a "deferred" note in failure_reason and remind operator to file a follow-up ticket |
| `S` | Skip — leave pending |

For `D`:
```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-set-status.sh \
  --run-id EUDPA-XXXXX --repo {repo} --package {pkg} \
  --status failed --failure-reason "Deferred by walker — file follow-up ticket"
```
(We use `failed` rather than introducing a new status — failed +
"Deferred" reason carries the same "needs human attention later"
signal.)

For `S`: do nothing — the package row stays as it is.

For `I`: see Step 4.

After the batch resolves:

```
Batch applied:
  Implement: N  (spawning workers)
  Defer:     N
  Skip:      N
```

If `Implement` count is zero, jump to Step 5.

---

## Step 4: Spawn implementors

For each `I`-marked package, spawn one `general-purpose` Task
subagent (run them sequentially — the implementor edits source and
commits, and we don't want two implementors racing on the same repo).

Spawn prompt:

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/MANUAL_UPGRADE_IMPLEMENTOR.md.

Run ID: EUDPA-XXXXX
Repository: {repo}
Package: {package}
Current: {current}
Target: {target}

Context bundle: ~/git/defra/trade-imports-workspace/workareas/npm-upgrades/EUDPA-XXXXX/{repo}/.context/{normalized-package}/
Files affected (from planner): {files_affected}
Required changes (from planner): {changes_required_summary}
```

The implementor returns one of `DONE`, `FAILED`, `SKIPPED`. It updates
JSON state itself via `packages-set-status.sh`; you don't need to.

You can also call `run-manual-upgrade.sh` directly if you'd prefer the
script-driven flow without an extra subagent:

```bash
~/git/defra/trade-imports-workspace/tools/npm/run-manual-upgrade.sh \
  --run-id EUDPA-XXXXX --repo {repo} --package {package}
```

The script lays down the install + test + commit + rollback frame,
but it does NOT make code edits — use the IMPLEMENTOR subagent when
the package needs source changes (which is the normal case for
manual classification).

---

## Step 4.5: End-of-batch E2E gate (tests repo only)

If any `I`-keystroke implementor returned `DONE` for a package in
`trade-imports-animals-tests`, run `npm run test:docker-compose` ONCE now as
the integration gate. Per-package `npm test` was skipped for this
repo (it has no unit suite — it IS the E2E suite), so this is the
first chance to confirm the upgrades didn't break the test runner.

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/test-docker-compose-$(date +%Y%m%d-%H%M%S).log 2>&1
```

Read the log file you just created — summary line only. On failure,
**do NOT grep the streaming output**. Find the structured artifacts:

```bash
find ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests/test-results -name "error-context.md"
```

Read each `error-context.md` to diagnose what broke. Surface the
failure clearly in the Step 5 report — the upgrades are committed,
so the operator must decide whether to revert or fix forward.

If no `DONE` package was in the tests repo, skip this step.

---

## Step 5: Final report

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-counts.sh --run-id EUDPA-XXXXX
```

Print the summary:

```
Walk complete for EUDPA-XXXXX [{filters}].

  Implemented: N  (committed)
  Failed:      N  (rolled back / requires investigation)
  Deferred:    N  (file follow-up tickets)
  Skipped:     N  (still pending)

  E2E gate (tests repo): PASS | FAIL | n/a
  {if FAIL: include short summary from error-context.md}

To implement deferred items later, re-run `walk upgrade EUDPA-XXXXX`.
```

---

## Multi-repo note

The walker presents one combined table across repos — the `#` column
is a single ordering across the whole list. Each helper call still
gets `--repo` with the right value (it's a column of the row), so
the helpers stay unambiguous.

---

## Speed notes

The point of the walker is **rate of decision-making**. The batch
mode is the hot path:

- The Step 2 list is JSON-only — don't open changelogs or source files
  before the user types.
- Print one screen of context, take one batch string, fan out.
- Don't verbose-log between items. The Step 3 summary line is enough.
