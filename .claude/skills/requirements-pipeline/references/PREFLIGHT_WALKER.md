# Pre-flight walker — batch triage before a theme's first increment

Present everything the BUILD pre-flight found wrong with a split theme in one
block, take a **single batch keystroke string**, dispose them all in order, then
loop into per-item slow-track for anything marked Discuss.

**Trigger:** `"walk the pre-flight for <theme>"`, `"triage the pre-flight"`, or
reached from [`BUILD.md`](BUILD.md#before-the-first-increment) steps 6 and 7 when
either finds something. Also the right thing to offer unprompted when
`tim backlog check` refuses a theme the user has just asked to build.

**Never run it on the parent backlog.** A parent has no pick-up and no `parent`
pointer, so there is nothing to walk.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## What it walks, and the default for each kind

Three kinds, each with a default so a clean theme is one keypress.

- **Repo staleness** (`repo`): one item per repo source whose extract is behind
  its checkout, plus one for every repo source whose extract records no commit
  at all, where the dates have to be read by hand
  ([DISTIL.md](DISTIL.md#a-repo-source-goes-stale-when-its-checkout-moves)).
  **Default: Discuss.** Resetting sources costs a full DISTIL run and verifying
  by hand costs the user's time, so neither is taken without them.
- **Never placed** (`pickUp`): a requirement a re-distil handed the theme that
  it has never put in a row. **Default: Apply.** It is unambiguously missing
  work, and `tim backlog check` refuses the theme until it is placed.
- **Changed** (`changed`): a requirement already in a row whose text has moved
  since the split. **Default: Apply**, because the later text is the later
  ruling — but `L` (leave) is a first-class answer: a change the user declines
  keeps its old fingerprint, so the report re-raises it next re-distil rather
  than the disagreement being buried.

A `noLongerToBuild` requirement is not walked. It needs the row dropped or
rewritten, which is a row edit rather than a yes/no, so it is listed under the
final report for the user to act on.

---

## Step 1: Load the work list

The theme's own backlog names its parent:

```bash
jq -r '.theme, .parent.workarea' workareas/<theme workarea>/backlog.json
```

The parent's pointer holds the ids and the current fingerprints:

```bash
tim distil coverage <parent workarea> --json
```

Read `result.backlog.splitOff[]`, the entry whose `theme` matches, for `pickUp`,
`changed`, `noLongerToBuild` and `fingerprintsNow`.

The repo sources' state:

```bash
tim distil status <parent workarea> --json
```

A repo source reading `stale` is an item. So is one reading `verified` whose
extract records no commit — `repoHead` absent means the check cannot see a moved
repo, so compare the dates:

```bash
jq -r '.repoHead // "none"' workareas/<parent workarea>/distil/extract/<slug>.json
git -C repos/<repo> log origin/main -1 --format=%ad --date=short
```

**Each requirement's text comes from the report, not from `requirements.json`.**
The report's "For the split branches" section is the documented hand-off to a
split branch, and already gives, per requirement, whether it is new or changed
and what it now says:

```bash
awk '/^### <theme>$/,/^### /' workareas/<parent workarea>/report.md
```

If every list is empty and no repo has moved:

```
Nothing to walk — <theme> has no pick-up and every repo source is current.
```

Stop, and tell the user the theme is ready to build.

---

## Step 2: Present every item, then take one batch input

One markdown block. The user reads the whole list and types one string at the
bottom.

```markdown
**Pre-flight for type-question-and-templates** — 21 items

Repo sources (1)

| # | Kind | Source | State | What it means |
|---|---|---|---|---|
| 1 | repo | all 5 repo sources | extracts 26 Oct, no commit recorded | The frontend, backend, INS frontend, plants frontend and tests repo have all moved since. Every row's "already on main" judgement is from 26 Oct |

Never placed — `tim backlog check` refuses the theme until these are in a row (4)

| # | Kind | Requirement | What it now says | Where it lands |
|---|---|---|---|---|
| 2 | pickUp | req-2202 | On every live animals and germinal products template page that offers both "Save and continue" and "Save and return to overview", the two buttons make the same checks | New row, or inc-155's criteria |
| 3 | pickUp | req-2136 | On the high-risk plants commodity type page "Save and return to overview" makes the same checks as "Save and continue" | New row (plants) |
...

Changed since the split (16)

| # | Kind | Requirement | What it now says | In row |
|---|---|---|---|---|
| 6 | changed | req-962 | "Create new" and "Use template" show under the home's heading on every visit, whether or not the trader has any notifications, above the home's search | inc-151 |
...

**Triage:** type one character per item, in order.

  `A` = Apply · `L` = Leave (keep the old fingerprint, re-raise next re-distil)
  `R` = Reset and re-distil · `H` = Verify by hand · `D` = Discuss · `S` = Skip

  Defaults if you type a shorter string: repo items `D`, pickUp `A`, changed `A`.

Expected length: 21. Whitespace and case are ignored.

Your input:
```

`R` and `H` are only valid on a `repo` item; `A` and `L` only on a `pickUp` or
`changed` item. A character on the wrong kind is an input error: say which
position is wrong and re-prompt, rather than guessing.

Do not add commentary, snippets or "Loading…" prose between the table and the
input prompt. One screen the user can scan and answer.

---

## Step 3: Apply the batch

Normalise: strip whitespace, uppercase, reject any character that is not `A`,
`L`, `R`, `H`, `D` or `S` with a clear error and re-prompt. Map each character to
the item at the same index.

| Char | Kind | Action |
|---|---|---|
| `A` | pickUp | Add or rewrite the theme's rows for it, then move the id from the parent pointer's `pickUp` to its `requirements` and copy its `fingerprintsNow` fingerprint into `fingerprints` |
| `A` | changed | Rewrite the row's criteria and notes to the requirement's current text, then copy its `fingerprintsNow` fingerprint into the pointer's `fingerprints` |
| `L` | changed | Leave the row and the fingerprint alone. Record why on the row, so the next person sees the decision rather than re-deciding it |
| `R` | repo | `tim distil reset <parent> --source repo:<id> …`, then relaunch `distil.js`. **Stop the walk** and say so: the pick-up list is redrawn by that run, so triaging it first would be wasted |
| `H` | repo | Verify the theme's rows against current `main` by hand, and record what changed on each row |
| `D` | any | Defer to Step 4 slow-track. Do not write anything yet |
| `S` | any | Skip. Leave it as it is, and name it in the final report as still outstanding |

Two keystrokes go to the slow-track instead of being applied, because the Step 2
table does not show the evidence their answer needs:

- **`A` on a `changed` item whose row is `done`.** A built row is never rewritten
  by a re-distil. In Step 4, decide whether the change needs a new row instead.
- **`L` on a `pickUp` item** — there is no old fingerprint to keep, so Leave has
  no meaning. In Step 4, either place it or `S` it with a reason.

A row edit is a row edit: write it with `tim backlog add <workarea> --from
<file> --before <id> --write` or `tim backlog set`, never by hand-editing
`backlog.json`. The pointer edit is a hand edit of the parent's `backlog.json`,
because no `tim` command writes a pointer — change nothing in it but
`pickUp`, `requirements` and `fingerprints`
([DISTIL.md](DISTIL.md#8-splitting-a-theme-off-early)).

After the batch:

```
Batch applied:
  Applied:  N
  Left:     N  (fingerprint kept, will re-raise)
  By hand:  N  (repo verification)
  Skipped:  N  (still outstanding)
  Discuss:  N  (slow-track next)
```

If Discuss is zero, jump to Step 5.

---

## Step 4: Slow-track each Discuss item

For each `D`, in input order:

1. **Show what the batch table could not.** For a requirement, its claims and
   the sources behind them, from the report's own entry and the row it belongs
   to. For a repo item, the commits the repo has taken since the extract date
   (`git -C repos/<repo> log --oneline --since=<extract date> origin/main`) and
   which of the theme's rows read that code.
2. **Engage.** Answer the user's question, read the rows and the code around it.
3. **Conclude with one of the Step 3 actions**, and say which you took.

Move to the next.

---

## Step 5: Final report

Re-run both checks, so the user sees the theme's state rather than taking the
walk's word for it:

```bash
tim backlog check <theme workarea> --json
tim distil coverage <parent workarea> --json
```

Then:

```
Pre-flight walked for <theme>.

  Applied:   N
  Left:      N
  Skipped:   N
  By hand:   N

  tim backlog check: <ok, or the problem it still names>
  Pick-up remaining: pickUp N, changed N

No longer to build (not walked — each needs its row dropped or rewritten):
  <ids, or "none">

<Ready to build, or what still stands in the way.>
```

**Never say the theme is ready while `tim backlog check` still refuses it.**
Quote the refusal instead.
