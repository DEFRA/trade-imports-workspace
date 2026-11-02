# Walker — batch triage

Present every pending review item in one well-formatted block, take a
**single batch keystroke string** from the user, dispose them all in
order, then loop into per-item slow-track for anything marked Discuss.

**Trigger:** `"walk review EUDPA-XXXXX"`, `"walk review EUDPA-XXXXX
{repo}"` (repo filter), or `"walk review EUDPA-XXXXX --major"`
(severity filter).

Items schema: `assets/items-table.md`.

## Defaults by kind

An item's `category` sets its kind (`assets/file-review-schema.md` →
"Category values"), and the kind sets the default. The build loop's
verifier and judge apply the same defaults.

- **Functional** (`correctness`, `security`, `error-handling`,
  `coverage-gap`): kept only with evidence, a failure scenario, the
  acceptance criterion it breaks, or the line it fails on. With none,
  it is Won't Fix with the note `no evidence`.
- **Code quality** (`naming`, `comments`, `structure`, `duplication`,
  `logging`, `test-readability`, `history`): fixed unless the code
  proves it wrong. Won't Fix only with a note that quotes the code,
  with its file:line, showing the finding is factually wrong. These
  never justify Won't Fix: taste, "pre-existing", "out of scope", "a
  nearby file does it", "feature folders are independent", the plan,
  or an earlier decision.
- **Design** (`design`): never fixed in code. Mark it Discuss with the
  note `For the designer: <the question and its options>`, carrying
  the item's evidence (the design source and the code at file:line,
  and the guide rule's link), and list it under "For the designer" in
  the batch summary.

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

| # | Severity | File:Line | Category | Issue | Must | One way | Cite |
|---|---|---|---|---|---|---|---|
| 1 | 🔴 Critical | `frontend/notification-client.js:42` | logging | Save failure logs `err.message` only | The failure log carries the error and the reference | `logger.error({ err, referenceNumber }, '...')` | node/pino-logging.md |
| 2 | 🟡 Major | `backend/Mapper.java:15` | correctness | Null check missing on `notification.consignor` | A missing consignor fails at the boundary | `Objects.requireNonNull` in the record | — |
| 3 | 🟡 Major | `frontend/check-answers/controller.js:148` | naming | `holdsSilently` needs its comment to be read | The name says what the flag does in every state | Rename to `hidesAnswerErrors`; delete the comment | — |
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

Must and One way columns: split the item's `fix` text on its `Must:`
and `One way:` labels. A `fix` with no labels goes in Must, with `—`
under One way. `F` agrees the Must; the One way stays a suggestion.

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

Two keystrokes go to the Step 4 slow-track instead of being applied,
because the defaults above need evidence the Step 2 list does not show:

- `W` on a code-quality item. In Step 4, Won't Fix needs the quoted
  code that shows the finding is factually wrong. Without it, mark Fix.
- `F` on a functional item whose issue names no failure scenario,
  acceptance criterion or failing line. In Step 4, find the evidence
  and mark Fix, or mark Won't Fix with the note `no evidence`.

Count them under Discuss in the batch summary.

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
   - "leave it" → `review-mark.sh ... --disposition "Won't Fix" --note "{reason}"`.
     For a code-quality item the reason is the quoted code, with its
     file:line, that shows the finding is factually wrong; any other
     reason leaves it Fix (see "Defaults by kind").
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
~/git/defra/trade-imports-workspace/tools/review/render-items.sh EUDPA-XXXXX --repo {repo} --write
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
  a stale item, they hit `D`, and Step 4 marks it Auto-Resolved.
- Verbose-log between items. The Step 3 summary line is enough.
