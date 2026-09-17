# s23 — withdraw the drift manifest and the `tim workspace drift` proposal

Question 19. Ruling (Sam, 16 September 2026): *"no to the proposed tim workspace
drift command and the surfaces manifest; that was scope creep by the initial
agent. This is a one-shot get-the-frontends-in-sync piece of work; keeping things
in line in future is not what we are working on now."*

Branch: `feat/NO_JIRA-frontend-alignment` (already checked out).

This stage touches the **workspace repo only**. No frontend, no tests repo, no
source file in any language. Four documents change, one file is deleted.

## Repos and their two path spellings

| Key | Bash path (tilde — use in every Bash call) | Tool path (absolute — use in Read/Write/Edit) |
|---|---|---|
| workspace | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

Every other repo in the programme header (ins, animals, plants, tests) is **out of
scope**. Do not open a checkout under `repos/`.

## Baseline (captured before planning — a later red is unambiguous)

| Repo | Script | Result | Log |
|---|---|---|---|
| workspace | none — there is no `package.json` at the workspace root, so there is no ladder | n/a | `workareas/shared/frontend-alignment/logs/s23-drop-drift-tooling-baseline-workspace-noladder.log` |

The log records the branch head at plan time, `58249998 docs(alignment): record
s22-address-book-links`, and a silent `jq empty` over `stages.json` (valid JSON).
The stage's `ladder` array is empty by the brief; **run no test suite and no lint,
there is none to run.** The only "green" this stage can produce is the proofs in
section 6 and the workspace PR 47 checks, which the CI rung watches.

---

## 0. Decisions

Every fork the brief left open, settled here. **Do not re-open any of these.**

**D1 — `surfaces.json` is deleted, not moved and not archived.**
The ruling names the manifest itself as scope creep, not its location. Question 19
asked *where* it should live; the answer is nowhere. Use `git rm` so the deletion is
staged as a deletion — the file is tracked (`git ls-files --error-unmatch` confirms
it). Do not copy it to `docs/reference/`, `tim/`, `logs/` or anywhere else first.
Its content is preserved in git history and in the plans and journal that describe
it, which is all a future reader needs.

**D2 — Question 19's whole subsection goes, not just its row.**
`### Tooling and dependencies` in report.md holds exactly one row, question 19.
Removing the row alone would leave a heading over an empty table. The heading, its
blank line and the table header rows go with it. The sibling heading
`### Shape choices the direction rule made, now backport candidates` **stays**, even
though it is now the only subsection under `## Open questions`: it still names the
class the two surviving questions (29, 30) belong to, and removing it would edit a
part of the report this stage was not asked to touch.

**D3 — The drift measurement stays; only the proposal goes.**
The `## Residual drift` section, both its tables, its class vocabulary
(`identical`, `identical-except`, `only-in`, `deliberate`, `unexplained`) and the
paragraph that says two chassis files differ for no recorded reason are the
measurement the report is for. They are untouched. Only the final sentence, which
describes what the manifest holds and proposes the command, is removed.

**D4 — The implementor does not write question 19's "Rulings applied" entry.**
Every entry in that section cites the commit SHAs the ruling landed as, which do
not exist until the land rung runs. The report-refresh rung that follows this stage
writes the entry, as it did for questions 1, 2, 5, 13, 14, 17, 27 and 28. The
implementor's job is to remove the question and the proposal, nothing more. Do not
fabricate a SHA and do not add a placeholder entry.

**D5 — The stage counts in "Where everything is" are not the implementor's.**
`twenty-four stages … twenty-two done, two ruling stages waiting` and
`the twenty-one plans under plans/` are re-counted by the report-refresh rung after
this stage lands. Leave both numbers exactly as they are.

**D6 — HANDOVER.md loses two more half-sentences than the brief names, because they
restate the withdrawn proposal as fact.**
The brief names only the `surfaces.json` bullet. But HANDOVER.md is the briefing an
agent reads before being interviewed by Sam, and two other sentences would have that
agent tell him the programme's goal includes a drift check and that the s12 CI-fix
drift is "why the drift check is needed". After this ruling both are false. They are
corrected in place (section 2, E5 and E6) — a correction of fact inside the file the
brief already opens, not a widening into a neighbouring question. Nothing else in
HANDOVER.md changes.

**D7 — The workflow-run bullet keeps the lesson and drops the remedy.**
`docs/analysis/frontend-alignment-workflow-run.md` is a point-in-time record of how
the machine ran, so the observation (a CI fix in two repos left the third behind)
is worth keeping and is the honest record. The clause that names a drift check as a
ladder rung and points at "the report's section 8" goes, and is replaced by what
actually happened in the run and what a stage should do about it. Exact replacement
text in section 2, E7.

**D8 — Nothing else in the workspace that mentions the manifest is touched.**
`plans/s15`, `plans/s17`, `plans/s18`, `plans/s20`, the run journal, the historical
notes inside `stages.json` (lines around 675, 679, 684, 782, 967, 971) and everything
under `workareas/clones/` all name `surfaces.json`. They are the historical record of
stages that have already landed; rewriting history is not what the ruling asked for
and the brief ends "Out of scope: everything else". Leave every one of them.
`workareas/shared/frontend-alignment/logs/` is untracked working output — do not stage
it, do not delete it.

---

## 1. Moves

| From | To | Why |
|---|---|---|
| `workareas/shared/frontend-alignment/surfaces.json` | *deleted* | D1. Run `git rm ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/surfaces.json` from the workspace repo — one Bash call, no `cd`, tilde path. |

No file moves. No test file moves; the workspace repo has no tests.

---

## 2. Edits

Four edits in `report.md`, three in `HANDOVER.md`, one in the analysis doc. Re-read
each file with the Read tool before editing it; the line numbers below are from
16 September and are a guide, the quoted text is the contract.

### E1 — report.md: remove question 19 and its subsection

File: `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/report.md`
(around lines 20–25, immediately after question 30's row and immediately before
`## Rulings applied`).

Edit `old_string` — note it **starts with a newline**, which is the blank line that
separated the two subsections:

```

### Tooling and dependencies

| # | Question | Count | If nobody answers |
| --- | --- | --- | --- |
| 19 | Where does [`surfaces.json`](surfaces.json) live (`docs/reference/` or `tim/`), and is the proposed `tim workspace drift` command built to report every chassis file differing without a recorded reason? | workspace-only | the next cross-repo edit drifts by two lines, as the backport commit did before question 2 closed it, with nothing to say so |
```

`new_string`: the empty string.

After the edit, question 30's row must be followed by exactly one blank line and then
`## Rulings applied`.

### E2 — report.md: drop the manifest-and-command sentence from Residual drift

Around lines 629–636, the end of the paragraph that closes `## Residual drift`.

`old_string`:

```
page-title composition arrived from `main` and has no question yet.
[`surfaces.json`](surfaces.json) names every shared chassis file
with the rule it must satisfy (`identical`, `identical-except`, `only-in`,
`deliberate` with a reason); a `tim workspace drift` command that applies it
per branch and reports unlisted differences is proposed in question 19 and
not built.
```

`new_string`:

```
page-title composition arrived from `main` and has no question yet.
```

The three sentences above it — "Two chassis files differ for no recorded reason",
the `content-security-policy.js` sentence and the `errors.test.js` sentence — stay
exactly as they are (D3). The paragraph now ends on the `errors.test.js` sentence and
is the last prose of the section.

### E3 — report.md: drop the manifest from "Where everything is"

Around line 654, the last line of the `- Stage state:` bullet.

`old_string`:

```
  `run-wf_a52aa0bf-91f.journal.jsonl`; the manifest in `surfaces.json`.
```

`new_string`:

```
  `run-wf_a52aa0bf-91f.journal.jsonl`.
```

Two leading spaces in both, they continue the bullet. The `twenty-four stages` and
`twenty-one plans` counts in the same bullet stay (D5).

### E4 — report.md: nothing else

After E1–E3, `grep -n "surfaces\|workspace drift" report.md` must return nothing.
If it returns a line, read it and remove only the manifest or command reference in
it; do not go further.

### E5 — HANDOVER.md: remove the surfaces.json bullet

File: `/Users/samfarrington/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/HANDOVER.md`,
line 30, inside the `## Where everything is` list.

Delete the whole line, including its trailing newline:

```
  - `workareas/shared/frontend-alignment/surfaces.json` — the draft manifest of files the three repos are meant to share, with the rule for each.
```

The bullets either side (`run-wf_a52aa0bf-91f.journal.jsonl` above,
`docs/analysis/frontend-alignment-workflow-run.md` below) keep their indentation and
order.

### E6 — HANDOVER.md: two sentences that state the withdrawn proposal as fact (D6)

**Line 17**, in `## What the proposal is`. `old_string`:

```
Duplication is deliberate; the goal is alignment plus a drift check.
```

`new_string`:

```
Duplication is deliberate; the goal is alignment.
```

That sentence sits mid-line inside a long unwrapped paragraph — match it as the
fragment above, not as a whole line, and change nothing else in the paragraph.

**Line 53**, in `## Facts you should hold without looking them up`, the Caveats
bullet. `old_string`:

```
A Sonar-driven CI fix on animals and plants left ins two lines behind (`https://placeholder` and `TypeError` in the journeys; ins kept the older lines); it is the worked example of why the drift check is needed.
```

`new_string`:

```
A Sonar-driven CI fix on animals and plants once left ins two lines behind (`https://placeholder` and `TypeError` in the journeys; ins kept the older lines); the authentication convergence closed it.
```

Again a fragment inside a long line. The rest of that bullet — the Lighthouse,
`sass` and SonarCloud caveats — is unchanged.

### E7 — docs/analysis/frontend-alignment-workflow-run.md: reword the drift bullet

File: `/Users/samfarrington/git/defra/trade-imports-workspace/docs/analysis/frontend-alignment-workflow-run.md`,
lines 117–119, in `## What to change next time`.

`old_string`:

```
- **A CI fix in two repos is a drift in the third.** The s12 Sonar fix moved
  animals and plants together and left ins behind on two lines. A drift check
  as a ladder rung is the fix; the report's section 8 specifies it.
```

`new_string`:

```
- **A CI fix in two repos is a drift in the third.** The s12 Sonar fix moved
  animals and plants together and left ins behind on two lines, in files the
  same stage had just proved byte-equal. Nothing in the run caught it until the
  report stage diffed the three trees at the end, and a later stage closed it.
  A cross-repo stage has to re-prove equality after any CI fix it makes.
```

The bullet grows from three lines to five. Keep the wrap under 80 characters, as the
rest of the file does. Do not touch the `report's section 7` reference at line 68 or
any other bullet.

---

## 3. New files

None. This stage creates no file. The plan you are reading is the only new file, and
it already exists.

---

## 4. Imports

Not applicable. No JavaScript changes, so no import path is disturbed. The
equivalent here is **markdown links**: `report.md` linked to `surfaces.json` twice,
as `[`surfaces.json`](surfaces.json)`, and both links are inside text E1 and E2
delete. After this stage no markdown link anywhere in the four touched files may
point at `surfaces.json` — section 6's grep proves it.

---

## 5. Tests

None move, none change, none are new. The workspace repo has no test suite and no
`package.json` at its root, so there is nothing that could pin these documents. The
proofs in section 6 replace tests for this stage.

---

## 6. Invariants to prove

Run each of these after the edits, one Bash call each, no pipes. All are cheap.

| # | Proof | Expected |
|---|---|---|
| P1 | `git -C ~/git/defra/trade-imports-workspace status --porcelain` | `D  workareas/shared/frontend-alignment/surfaces.json` (staged delete), plus modifications to `report.md`, `HANDOVER.md`, `docs/analysis/frontend-alignment-workflow-run.md` and `stages.json`, plus the new `plans/s23-drop-drift-tooling.md`. **No other tracked path.** The untracked `workareas/shared/...` directories listed there are pre-existing and stay untracked. |
| P2 | `grep -rn "surfaces" ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/report.md` | no output |
| P3 | `grep -rn "workspace drift" ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/report.md` | no output |
| P4 | `grep -n "surfaces" ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/HANDOVER.md` | no output |
| P5 | `grep -n "drift check" ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/HANDOVER.md` | no output |
| P6 | `grep -n "section 8" ~/git/defra/trade-imports-workspace/docs/analysis/frontend-alignment-workflow-run.md` | no output |
| P7 | `wc -l` over the three documents | `report.md` 651 (was 662: six lines for E1, five for E2), `HANDOVER.md` 76 (was 77), `frontend-alignment-workflow-run.md` 142 (was 140). A different number means an edit took more or less than it should — read the diff before going on. |
| P8 | `grep -c "^## " ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/report.md` | 7, the same as before the edit — Open questions, Rulings applied, Decisions you may want to reverse, What was built, Known caveats, Residual drift, Where everything is. This stage removes no `## ` heading; a 6 means an over-eager delete took one. |
| P9 | `git -C ~/git/defra/trade-imports-workspace diff -- workareas/shared/frontend-alignment/report.md` | the Residual drift tables appear nowhere in the diff; the only removals are the question-19 block, the five-line closing sentence and the half-line in "Where everything is" |
| P10 | `jq empty ~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/stages.json` | silent, and `jq '.stages[] \| select(.id=="s23-drop-drift-tooling") \| [.status, .commit, (.prs\|length), (.notes\|length)]'` shows the same `commit` and PR count as before your note, with the notes count one higher |

Programme invariants: invariant 1 (ins's public URL surface) and invariants 2, 4, 5,
6, 7 and 8 cannot be reached by this stage — no repo source changes. Invariant 3
(suites green) holds vacuously for the ladder and is re-proved by workspace PR 47's
cross-repo E2E on the push, which is CI's rung, not yours. Do not start the stack and
do not run a frontend test suite to "check".

Also check `grep -c "^### " report.md` gives one fewer than before (E1 removes
`### Tooling and dependencies` and nothing else at that level).

---

## 7. Out of scope

Leave every one of these alone, however tempting:

- **Questions 29 and 30.** They stay in the report exactly as written, under the
  heading that stays (D2). The ruling is about question 19 only.
- **The "Rulings applied" entry for question 19.** The report-refresh rung writes
  it, with the real commit SHA (D4).
- **The stage and plan counts** in `- Stage state:` (D5).
- **`plans/s15-q01-signout-session-drop.md`, `plans/s17-auth-convergence.md`,
  `plans/s18-chassis-convergence.md`, `plans/s20-tooling-convergence.md`,
  `run-wf_a52aa0bf-91f.journal.jsonl`** and the historical `notes` strings inside
  `stages.json` — all name `surfaces.json` and all are the record of landed stages
  (D8).
- **`workareas/clones/trade-imports-workspace/`** — the retired clone holds its own
  copy of every file this stage edits. It is retired. Do not touch it.
- **`workareas/shared/frontend-alignment/logs/`** — untracked working output,
  including the baseline this plan cites. Never `git add` it.
- **`tim/`, `docs/reference/`, `Makefile`, `tools/`** — nothing was ever built for
  the drift command, so there is no code to remove. If you find yourself searching
  `tim/` for a `drift` command, stop: it does not exist.
- **The `report's section 7` reference** at line 68 of the analysis doc, and every
  other bullet in that file (D7).
- **Every repo under `repos/`** and every repo in the programme header other than
  `workspace`. No frontend, no tests repo, no `docker/stack/`.
- **The ladder.** There is none. Do not invent one, do not run `npm` anywhere.

---

## 8. Land

Stage exactly these paths, in the workspace repo, with `git add` per path (and the
`git rm` from section 1, which stages itself):

- `workareas/shared/frontend-alignment/surfaces.json` (deletion)
- `workareas/shared/frontend-alignment/report.md`
- `workareas/shared/frontend-alignment/HANDOVER.md`
- `docs/analysis/frontend-alignment-workflow-run.md`
- `workareas/shared/frontend-alignment/plans/s23-drop-drift-tooling.md`
- `workareas/shared/frontend-alignment/stages.json`

Conventional subject: `docs(alignment): withdraw the drift manifest and the tim drift proposal`.
Workspace PR 47 is the programme's workspace PR and is **not a draft**; the push
re-runs the cross-repo E2E against the branch-tagged images. No repo image changes in
this stage, so a red there is not this stage's doing — read it before touching
anything.
