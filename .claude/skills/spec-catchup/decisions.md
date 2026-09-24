# spec-catchup skill — decisions

Recorded when the skill was scaffolded (2026-09-23). Update if a shape
choice changes; do not delete entries.

## 1. State shape

**Choice:** Prose (a dated `report.md`).
**Why:** The artifact is a narrative a person reads end-to-end and decides
whether to accept — it is not a list of N items queried or mutated by a
helper script. `tim spec gaps`/`candidates`/`lint` are already the JSON-
queryable layer this skill sits on top of; the report is where their output
gets a judgement, not a re-encoding of it.

## 2. Dispatcher

**Choice:** No.
**Why:** Setup is two checks (dirty `openspec/`, active build run) plus one
`tim spec candidates --json` call — inline in SKILL.md Step 0/1 is not
overkill at this size.

## 3. Pre-baked context

**Choice:** No separate pre-bake step, but `tim spec candidates` itself
already is one: the candidate scoping, the unresolved-link list and the
known-gaps context are all computed once, mechanically, before any
judgement starts.

## 4. Worker fan-out

**Choice:** No.
**Why:** A typical candidate set fits one context (~150–250k tokens/run).
Fan out only if that stops being true.

## 5. Walker

**Choice:** No.
**Why:** The report is one artifact a person reviews and accepts or
corrects as a whole, the same way a `ticket-refiner` verdict or a plan is
approved in natural language — not an N-item triage list needing
per-item batch keystrokes.

## 6. Helpers introduced

None. Every command this skill calls (`tim spec candidates`, `tim spec
lint`, `tim spec gaps`, `tim spec baseline`) already exists — this skill is
purely the judgement layer on top (the only AI piece).

## 7. Triggers (disambiguation)

"run the spec sweep", "sweep the behaviour spec", "reconcile the spec",
"spec-catchup", "is the behaviour spec stale" — distinct from `frontend-change`
(which maintains the spec per-increment, for capabilities it itself touched)
and `tim spec lint` (validates structure and links; never judges whether a
behaviour actually changed).

## 8. Allowlist entries added

None. No new `tools/spec-catchup/` scripts — every command runs through the
already-allowlisted `Bash(tim:*)` entry in `.claude/settings.json`.
