# Plan Walker — Phase 2 → Phase 3 batch triage

Present every pending version plan in one well-formatted block, take a
**single batch keystroke string** from the user, dispose them all in
order, then drop into per-item slow-track for anything marked `D`iscuss.

**Trigger:** `"walk govuk EUDPA-XXXXX"`, or auto-invoked at the SKILL.md
Phase 2 → 3 gate.

Loaded by the parent session (not Task-spawned). Schema for the
underlying JSON: `assets/version-state-schema.md`.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Step 1: Load the work list

```bash
~/git/defra/trade-imports-workspace/tools/govuk/list-plan-summaries.sh --run-id EUDPA-XXXXX --json
```

Apply `--repo {repo}` from the trigger if the user filtered.

The list excludes `noop` (already handled) and `done`/`failed`
(already terminal). It includes:

- `todo` versions awaiting application.
- `unplanned` versions where Phase 2 didn't classify them — surface
  these explicitly so the user can re-classify or skip.

If empty:

```
Nothing to walk — all versions are noop, done, or already failed.
```

Stop.

---

## Step 2: Present every plan, then take one batch input

```markdown
**Walking govuk-upgrade EUDPA-XXXXX** — N pending versions

| # | Repo | Version | Class | Changes | Summary |
|---|---|---|---|---|---|
| 1 | trade-imports-animals-frontend | 5.5.0 | todo | 2 | New header pattern — serviceName → service.name |
| 2 | trade-imports-animals-frontend | 5.6.0 | todo | 0 | _empty plan — re-classify or skip_ |
| 3 | trade-imports-animals-admin    | 5.5.0 | unplanned | 0 | _Phase 2 incomplete_ |
...

**Triage:** type one character per row, in order.

  `A` = Apply · `S` = Skip (leave pending) · `D` = Discuss · `Q` = Quarantine

Expected length: N. Shorter strings are tolerated — remaining versions
treated as `S` (skipped). Whitespace and case are ignored.

Defaults for unclassified rows: treat as `D` if the user types `A`/`S`
for them, since you can't apply or cleanly skip something that was
never classified.

Your input:
```

Don't paste the changelog or render the full plan in this view — that's
slow-track territory (Step 4). Keep the table on one screen.

---

## Step 3: Apply the batch

When the user responds, normalise the input:

- Strip whitespace, uppercase.
- Reject any character that isn't `A`, `S`, `D`, or `Q` with a clear
  error and re-prompt.

Map each character to the row at the same index:

| Char | Action | What happens |
|---|---|---|
| `A` | Apply | Leaves the row in `todo` (Phase 3 picks it up). For `unplanned` rows: auto-promote to `D`. |
| `S` | Skip | Leaves the row in `todo` but flag as "skip-by-walker" via a `--summary` annotation; Phase 3 won't auto-apply skipped versions. |
| `D` | Discuss | Adds to the Step 4 slow-track queue. |
| `Q` | Quarantine | Mark version as failed with reason "walker-quarantined"; needs manual handling outside the auto-flow. |

Implementation:

- `A` for a `todo` row → no helper call (already classified).
- `A` for an `unplanned` row → push into the `D` queue (cannot apply
  without a plan).
- `S` for any row → call
  ```bash
  ~/git/defra/trade-imports-workspace/tools/govuk/version-classify.sh \
    --run-id EUDPA-XXXXX --repo {repo} --version {version} \
    --classification noop --summary "walker-skipped"
  ```
  (Promote to noop so Phase 3 short-circuits it.)
- `D` → defer to Step 4 (don't mutate yet).
- `Q` → call
  ```bash
  ~/git/defra/trade-imports-workspace/tools/govuk/version-mark-failed.sh \
    --run-id EUDPA-XXXXX --repo {repo} --version {version} \
    --reason "walker-quarantined"
  ```

Each helper call is a separate Bash call (no chaining). Run them as
the user expects feedback — you can fan them out in parallel, but each
is its own Bash tool call.

After the batch resolves:

```
Batch applied:
  Apply:        N  (ready for Phase 3)
  Skip:         N  (promoted to noop)
  Discuss:      N  (slow-track next)
  Quarantine:   N  (marked failed)
```

If `Discuss` count is zero, jump to Step 5.

---

## Step 4: Slow-track each Discuss row

For each row marked `D`, in input order:

1. **Render the plan:**
   ```bash
   ~/git/defra/trade-imports-workspace/tools/govuk/render-version-plan.sh \
     --run-id EUDPA-XXXXX --repo {repo} --version {version}
   ```
   This prints the JSON plan as markdown including the pre-baked
   changelog section.

2. **Engage with the user.** Answer questions about the changelog,
   reference the best-practices bundle at
   `workareas/govuk-upgrades/{run-id}/{repo}/best-practices.md`, walk
   through individual `changes[]` entries.

3. **Conclude with one of:**
   - "apply it" → leave as `todo`, no helper call needed.
   - "skip it" → `version-classify.sh --classification noop --summary "discuss-skipped: <reason>"`.
   - "re-plan" (for `unplanned` or wrong plans) → spawn a single
     VERSION_PLANNER worker for this `{repo, version}` per
     `PHASE_2_MANAGER.md` Step 2.
   - "quarantine" → `version-mark-failed.sh --reason "<reason>"`.

Move to the next Discuss row.

---

## Step 5: Final report

Re-print the work list so the user can see what changed:

```bash
~/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh --run-id EUDPA-XXXXX
```

Then the summary:

```
Walk complete for EUDPA-XXXXX [{filters}].

  Apply (todo):  N
  Skip (noop):   N
  Quarantine:    N
  Discuss done:  N

To apply the todo versions: `Follow references/PHASE_3_MANAGER.md`
```

Omit the last line if `Apply` count is zero.

---

## Speed notes

- Read each pre-baked changelog file lazily — only when a row enters
  the slow-track (Step 4). The Step 2 batch is summary-only.
- Don't re-Grep the repo. Phase 2 already did that; the changes[]
  list is authoritative.
- Don't open package.json — `apply-version.sh` is the only thing that
  should ever mutate it.
