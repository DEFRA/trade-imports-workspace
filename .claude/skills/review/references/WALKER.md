# Walker — batch triage

Present every pending review item in one well-formatted block, take a
**single batch keystroke string** from the user, dispose them all in
order, then loop into per-item slow-track for anything marked Discuss.

**Trigger:** `"walk review EUDPA-XXXXX"`, `"walk review EUDPA-XXXXX
{repo}"` (repo filter), or `"walk review EUDPA-XXXXX --major"`
(severity filter).

Items schema: `assets/items-table.md`.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Step 1: Load the work list

```bash
~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --filter pending --json
```

Apply trigger filters:
- `{repo}` → add `--repo {repo}`
- `--critical` / `--major` → filter the JSON output for matching severities

Hand-marked rows (where the disposition was set directly via
`review-mark.sh`) are already excluded by `--filter pending`.

If empty:
```
Nothing to walk — all items have a disposition.
```
Stop.

---

## Step 2: Present every item, then take one batch input

Output a single markdown block listing every item. Use this format —
the user reads the whole list at once and types one batch string at
the bottom:

```markdown
**Walking review EUDPA-XXXXX** — N pending items

| # | Severity | File:Line | Category | Issue | Fix | Cite |
|---|---|---|---|---|---|---|
| 1 | 🔴 Critical | `backend/Service.java:42` | security | Logger emits raw error object | Use structured `logger.error({err}, '...')` | node/pino-logging.md |
| 2 | 🟡 Major | `backend/Mapper.java:15` | correctness | Null check missing on `notification.consignor` | Add `Objects.requireNonNull` | — |
| 3 | 🔵 Minor | `frontend/helper.js:8` | style | Variable name `x` too short | Rename to `notification` | — |
...

**Triage:** type one character per item, in order.

  `F` = Fix · `W` = Won't Fix · `D` = Discuss · `S` = Skip

Expected length: N. Shorter strings are tolerated — remaining items
treated as `S` (skipped). Whitespace and case are ignored.

Your input:
```

Severity badges:
- 🔴 **Critical**
- 🟡 **Major**
- 🔵 **Minor**

Cite column: show the `best_practice` field if present; `—` otherwise.

Don't add extra commentary, code snippets, or "Loading..." prose
between Step 2 and the input prompt — the goal is one screen the
user can scan and respond to.

---

## Step 3: Apply the batch

When the user responds, normalise the input:
- Strip whitespace.
- Uppercase.
- Reject any character that isn't `F`, `W`, `D`, or `S` with a clear
  error and re-prompt.

Map each character to the item at the same index. Apply:

| Char | Action | Helper call |
|---|---|---|
| `F` | Mark Fix | `review-mark.sh ... --disposition "Fix"` |
| `W` | Mark Won't Fix | `review-mark.sh ... --disposition "Won't Fix"` |
| `D` | Defer to Step 4 slow-track (don't mutate yet) | — |
| `S` | Skip — leave pending | — |

Each `review-mark.sh` invocation is a separate Bash call (no
chaining). Run them as the user expects feedback — you can fan them
out in parallel, but each is its own Bash tool call.

After the batch resolves:

```
Batch applied:
  Fix:       N
  Won't Fix: N
  Skip:      N  (still pending)
  Discuss:   N  (slow-track next)
```

If `Discuss` count is zero, jump to Step 5.

---

## Step 4: Slow-track each Discuss item

For each item marked `D`, in input order:

1. **Read the file** from the workspace copy:
   ```
   ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo}/{file-path}
   ```
   Use the Read tool with `offset` / `limit` to grab ~10 lines around
   the reported line.

2. **Present the item with code context.** Repeat the row fields
   from Step 2, then show the code snippet (highlight the reported
   line).

3. **Engage with the user.** Answer their question, follow related
   items, read whatever neighbouring files help.

4. **Conclude with a disposition** — call the matching helper:
   - "fix it" → `review-mark.sh ... --disposition "Fix" --note "{agreed approach}"`
   - "leave it" → `review-mark.sh ... --disposition "Won't Fix" --note "{reason}"`
   - "defer to PR thread / standup / wider conversation":
     ```bash
     ~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --repo {repo} --item {N} --disposition "Discuss" --note "{open question / who to ask}"
     ```

Move to the next Discuss item.

---

## Step 5: Final report

Re-render the markdown items view so the user can see the dispositions
they just set:

```bash
~/git/defra/trade-imports-workspace/tools/review/render-items.sh EUDPA-XXXXX --repo {repo}
```

Print the summary:

```
Walk complete for EUDPA-XXXXX [{filters}].

  Fix:        N
  Won't Fix:  N
  Discuss:    N
  Skipped:    N  (still pending)

To apply the Fix items: `implement review EUDPA-XXXXX`
```

Omit the last line if no Fix dispositions were recorded.

---

## Multi-repo note

If the work list spans multiple repos, present them in one combined
table — the `#` column refers to a single ordering across the whole
list. Each `review-mark.sh` call still gets `--repo` with the right
value (it's a column of the item record), so the helpers stay
unambiguous.

---

## Speed notes

The point of the walker is **rate of decision-making**. The batch
mode is the hot path. Don't:

- Read the source file before Step 4. The Step 2 list is JSON-only.
- Print code snippets before Step 4.
- Check whether the violation is "still present" — if the user spots
  a stale item, they hit `W` or `S`.
- Verbose-log between items. The Step 3 summary line is enough.
