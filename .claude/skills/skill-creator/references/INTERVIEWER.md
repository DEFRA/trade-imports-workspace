Walk the user through the 8 shape questions for a new workspace
skill, record each answer atomically into `decisions.json`, then
invoke `scaffold-skill.sh` to materialise the scaffold.

Parent-loaded — you inherit the SKILL.md's path conventions and
hygiene rules. No fan-out, no Task spawn.

## Inputs

The parent dispatcher (`start-skill-creator.sh`) has already:

- Parsed `<name>` from the trigger phrase.
- Created `workareas/skill-creator/<name>/decisions.json` with
  `name`, `started_at`, and an empty `answers` object.
- Printed the path on `MODE: CREATE` line 2.

Your job: fill in `answers.*` via
`interview-add-answer.sh`, one question at a time.

## Read first

If not already in context:

- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/patterns.md`
  — the 8-pattern checklist (used to phrase each question).
- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/anti-patterns.md`
  — to call out mismatches as the user answers.
- `~/git/defra/trade-imports-workspace/.claude/skills/skill-creator/assets/interview-schema.md`
  — the JSON shape `interview-add-answer.sh` writes into.

## Workflow

Ask each question on its own turn. Each answer informs the next.
After every answer, call:

```bash
~/git/defra/trade-imports-workspace/tools/skill-creator/interview-add-answer.sh \
    --run-id <name> --field <field> --value '<value-json>'
```

The helper writes atomically (`jq ... > tmp; mv tmp file`).

### Q1 — Purpose

> In one sentence: what does this skill do, and for whom?

Free-form. Save as `answers.purpose` (string).

### Q2 — State shape

Show the user pattern 1 from `patterns.md` (one paragraph). Ask:

> Does the skill produce a list of N items the user filters /
> mutates / triages (JSON), or a single narrative artifact the
> user reads end-to-end (prose)?

Save as `answers.state_shape` (`"json"` or `"prose"`).

If `json`: warn the user that JSON state implies helper scripts
(pattern 6) and probably a render helper.

If `prose`: warn the user that prose state means NO walker
(pattern 7) and NO render helper (anti-pattern A6).

### Q3 — Dispatcher

> At session start, does the LLM need to run multiple sequential
> deterministic commands (3+ steps: clone repos, fetch ticket,
> create workarea, write metadata)?

Save as `answers.dispatcher` (boolean).

If yes: the scaffold will create `start-<name>.sh`. If no, the
scaffold won't.

### Q4 — Pre-baked context

> Will fan-out workers (or the parent session) read the same
> context multiple times (per-repo best-practices bundles, PR
> diffs, CHANGELOG sections)?

Save as `answers.prebake` (boolean).

If yes but the user can't name a multi-read use case: flag
anti-pattern A7 and ask again.

### Q5 — Worker fan-out

> Does the skill fan out work across N independent units (files,
> packages, versions, items) that each need their own context?

Save as `answers.fanout.enabled` (boolean). If yes, also ask:

> What persona name(s) for the workers? (UPPER_CASE,
> descriptive — e.g. `FILE_REVIEWER`, `PACKAGE_PLANNER`).

Save as `answers.fanout.workers` (list of strings).

### Q6 — Walker

> Does the skill produce a list of N decisions the user makes one
> at a time (review findings, upgrade packages)?

Save as `answers.walker` (boolean).

Refuse `walker=true` if `state_shape=prose` (anti-pattern A1).
Show the user the entry from `anti-patterns.md` and ask Q2 again
if needed.

### Q7 — Helpers

> Which `tools/<name>/` helper scripts does the skill own? List
> the names (one per line, no `.sh` suffix). At minimum,
> `start-<name>` if Q3 was yes.

Save as `answers.helpers` (list of strings).

For each helper, optionally ask for a one-line purpose
(captured in `decisions.md` later; not validated).

### Q8 — Triggers

> What trigger phrases activate this skill? (One per line.)

Save as `answers.triggers.phrases` (list).

Then ask:

> How do these triggers disambiguate from Claude Code's built-in
> `/init` and from neighbouring workspace skills?

Save as `answers.triggers.disambiguation` (string). Required —
`scaffold-skill.sh` refuses to run if this is empty.

## After all 8 answered

Show the user a recap:

```bash
~/git/defra/trade-imports-workspace/tools/skill-creator/render-interview.sh \
    --run-id <name>
```

Ask:

> Recap above. Anything to change before scaffolding?

If yes, re-run `interview-add-answer.sh` for the changed field(s).

If no, scaffold:

```bash
~/git/defra/trade-imports-workspace/tools/skill-creator/scaffold-skill.sh \
    --run-id <name>
```

`scaffold-skill.sh` writes:

- `.claude/skills/<name>/SKILL.md` (from the template, with TODO
  markers).
- `.claude/skills/<name>/references/<WORKER>.md` per Q5 worker.
- `.claude/skills/<name>/assets/<name>-schema.md` if Q2 was
  `json`.
- `tools/<name>/<helper>.sh` per Q7 entry.
- `.claude/settings.json` allowlist entries (atomic jq mutation).
- `.claude/skills/<name>/decisions.md` sidecar (rendered from
  `decisions.json`).

## Completion output

Print to the user:

```
Skill scaffolded: <name>

Paths:
  .claude/skills/<name>/SKILL.md
  .claude/skills/<name>/references/<WORKER>.md   (if fan-out)
  .claude/skills/<name>/assets/<name>-schema.md   (if JSON state)
  tools/<name>/<helper>.sh                          (one per Q7 entry)

Allowlist entries appended.
Decisions sidecar: .claude/skills/<name>/decisions.md

Open the SKILL.md and replace the TODO markers with the actual
prose. The scaffold provides structure; you provide content.
```
