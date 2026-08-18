Audit **one** workspace skill against the 8-pattern checklist and
write a plan document.

Your spawn prompt names a target skill, its `SKILL.md` path, and
the output plan path. Walk the checklist; produce the plan. Do not
make in-place edits to the target skill.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Inputs

Your spawn prompt gives you:

- `Target skill: <name>`
- `SKILL.md path: ~/git/defra/trade-imports-workspace/.claude/skills/<name>/SKILL.md`
- `Output path: ~/git/defra/trade-imports-workspace/workareas/skills-audit/<name>.md`

## Read first

Read these into context before walking the checklist (these are
the canonical references the audit cites):

- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/patterns.md`
  — the 8-pattern checklist.
- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/anti-patterns.md`
  — known mis-applications. Cite the matching entry (`A1`–`AN`)
  whenever you flag one.
- `~/git/defra/trade-imports-workspace/docs/agent-skills.md`
  — workspace-wide hygiene rules.

Then Read the target skill exhaustively:

- The `SKILL.md` (offset 0, full length).
- Every file under
  `~/git/defra/trade-imports-workspace/.claude/skills/<name>/references/`.
- Every file under
  `~/git/defra/trade-imports-workspace/.claude/skills/<name>/assets/`
  (if present).
- The owning `tools/<name>/` directory (use Glob to list, Read
  each helper).

Inspect `~/git/defra/trade-imports-workspace/.claude/settings.json`
for matching allowlist entries.

## The 8-pattern walkthrough

For each pattern below, produce a "Findings" subsection in the
plan with concrete file:line citations. If the pattern doesn't
apply (e.g. no fan-out → pattern 5 is N/A), say so explicitly
with a one-sentence reason.

### 1. State as canonical JSON

Is state JSON or prose? Does the choice match the workflow?
Specifically check:

- Does `<workareas>/<skill>/...` contain a JSON file the helpers
  mutate atomically?
- Or does the LLM write markdown directly?
- If JSON: is there a `render-X.sh` for the markdown view?
- If prose: is the artifact a narrative the user reads end-to-end
  (acceptable) or a list of N queryable items (mismatch — flag
  `A2`)?

### 2. Scripts call other scripts (single dispatcher)

- Does the skill have a `start-<name>.sh` dispatcher?
- If yes: does it print `MODE: <BRANCH>` as the first stdout line?
- If yes and only 1-2 setup steps: flag as overkill.
- If no but the skill has 3+ deterministic setup steps in
  SKILL.md prose: flag as missing.

### 3. Pre-baked context at prepare time

- Does the skill pre-bake context (per-repo bundles, PR diff
  caches)?
- If yes: count how many places read each bundle. If only 1,
  flag `A7`.
- If no but fan-out workers refetch the same data N times: flag
  as missing.

### 4. Bash call hygiene (LLM-typed)

Walk the SKILL.md and each `references/*.md` for hygiene
violations:

- `&&` / `;` / `|` chains in Bash blocks.
- `cd <dir> && cmd` shapes.
- `find ... -exec`.
- `$VAR` (any) in LLM-typed paths.
- `/Users/<you>/git/...` resolved-tilde paths.
- `python3 -c` for JSON.

Each violation: cite `file:line` and the corrected form.

### 5. Hygiene pointer inside worker personas

For each `references/<NAME>.md`:

- Determine if it's spawned via Task `general-purpose` (fan-out)
  or parent-loaded.
- Fan-out workers MUST carry the one-line pointer to
  `docs/agent-skills.md` → "Bash call hygiene" — not a full inline
  block. The rules live once, canonically; copies drift. Flag any
  worker that re-inlines the block instead of pointing to it.
- Parent-loaded references MAY omit even the pointer (inherit
  SKILL.md). Don't flag absence — it's optional.

### 6. Idempotent + atomic helpers

For each helper in `tools/<name>/`:

- Does it mutate state? If yes, does it use the
  `jq ... > tmp; mv tmp file` pattern (or equivalent atomic
  shape)? Or does it partial-write?
- Do coverage gates check JSON fields (`jq -e`) or file
  presence/non-emptiness (`[[ -s file ]]`)? Latter is brittle —
  flag.
- Where re-running might re-process done work, is there a
  `processed_at` / `reconciled_at` marker?

### 7. Walker UX (N-item triage)

- Does the skill produce a list of N items the user triages?
- If yes: is there a `WALKER.md` reference + batch-keystroke UX?
- If no list (single artifact): no walker needed. If a walker
  exists anyway, flag `A1`.

### 8. Allowlist coverage

- Does `.claude/settings.json` contain
  `Bash(~/git/defra/trade-imports-workspace/tools/<name>/*)`
  + `:*` entries?
- If missing, flag as a hard gap (skill is unusable without it).

### 9. Prose hygiene (companion)

Scan the SKILL.md and `references/*.md` for trim candidates per
the categories in `patterns.md` "Pattern 9 (companion)". This
deliverable is a **proposed trim diff** — per-file list of
deletions / collapses with line refs and short rationale — NOT
in-place edits.

If the prose is already tight, say so and skip the trim diff.

## Output: write the plan

Write to the output path your spawn prompt named (path under
`workareas/skills-audit/<name>.md`). Shape:

```markdown
# <name> skill — audit and improvement plan

## TL;DR

Two-to-four sentences. What's the biggest gap, what's smaller,
what's already fine.

## Findings by pattern

### 1. State as canonical JSON

<one paragraph; bullet list of concrete citations.>

### 2. Scripts call other scripts

...

### 3. Pre-baked context

...

### 4. Bash call hygiene

<table or list of violations, each with file:line and corrected
form.>

### 5. Hygiene block placement

...

### 6. Idempotent + atomic helpers

...

### 7. Walker UX

...

### 8. Allowlist coverage

<allowlist entry present? if missing, exact text to add.>

### 9. Prose hygiene (trim diff)

<per-file deletions / collapses with line refs and short
rationale. NOT in-place edits.>

## Open questions

Numbered list. Anything that needs the user's judgment before an
implementer prompt can be written. Examples:

1. Should pattern X land before pattern Y, or together?
2. Is helper Z used anywhere outside this skill? (grep ran clean
   in this skill but may have external callers.)

## Anti-pattern citations

Map each finding to its `A1`-`AN` entry in
`docs/best-practices/skills/anti-patterns.md`. If you discover an
anti-pattern not yet in the catalogue, propose a new entry in a
final subsection.
```

## Return value

When done, return one short line:

```
Plan: ~/git/defra/trade-imports-workspace/workareas/skills-audit/<name>.md
Pattern gaps: <N>
Open questions: <K>
Headline gap: <one-line summary>
```

The parent session aggregates this into the audit summary table.

## Return value on failure

If you cannot produce the plan — the target `SKILL.md` is unreadable, the
reference files are missing, or the output path can't be written — do
**not** return an empty or silent result. A silently-empty return (no plan
path, no pattern-gap count) is indistinguishable from a clean audit that
found nothing, and the parent's audit summary table will carry a silent
hole for this skill.

Every termination MUST use the success shape above **or** this explicit
failure shape — never a bare, empty return:

```
FAILED: {skill} — {what failed}; tried: {channels}; audit summary row will be missing.
```

Example:

```
FAILED: govuk-upgrade — SKILL.md unreadable at expected path; tried: Read on SKILL.md, Glob on references/; audit summary row will be missing.
```
