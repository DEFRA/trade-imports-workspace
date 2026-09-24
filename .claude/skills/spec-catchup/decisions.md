# spec-catchup skill — decisions

Recorded when the skill was scaffolded (2026-09-23). Updated 2026-09-24
for findings-as-state + walker + baseline advance.

## 1. State shape

**Choice:** JSON-canonical (`findings.json`); `report.md` is a render.
**Why:** The walk mutates dispositions one item at a time; baseline
`--require-ruled` queries the same file. Prose alone cannot gate advance.

## 2. Dispatcher

**Choice:** No.
**Why:** Setup is still two safety checks + `tim spec candidates` —
inline in SKILL.md.

## 3. Pre-baked context

**Choice:** No separate pre-bake; `tim spec candidates` is the bake.

## 4. Worker fan-out

**Choice:** No.
**Why:** Candidate sets still fit one context. Revisit if they don't.

## 5. Walker

**Choice:** Yes — interactive, one finding at a time (batch optional).
**Why:** Approve-then-write is the safety rail that replaced
propose-only for `spec.md`. Same shape as `review` / `code-style`
walkers, driven by `tim spec findings rule` / `applied`.

## 6. Helpers introduced

None under `tools/spec-catchup/`. All mutations go through
`tim spec findings` and `tim spec baseline --advance --require-ruled`.

## 7. Triggers (disambiguation)

"catch the spec up", "the spec is behind", "walk catchup",
"spec-catchup", "is the behaviour spec stale" — distinct from
`spec-cover` (gaps → tests) and `tim spec lint` (structure only).

## 8. Allowlist entries added

None. `Bash(tim:*)` already covers the commands.

## 9. What the skill may write

On accept: `openspec/coverage/**/coverage.json` and
`openspec/specs/**/spec.md`, then `openspec/baseline.json` via
`--require-ruled`. Edits stay uncommitted until the user asks.
