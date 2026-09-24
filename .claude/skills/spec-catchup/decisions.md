# spec-catchup skill — decisions

Recorded when the skill was scaffolded (2026-09-23). Updated 2026-09-24
for findings-as-state + auto-apply (walk removed).

## 1. State shape

**Choice:** JSON-canonical (`findings.json`); `report.md` is a render.
**Why:** Disposition + applied tracking still gates baseline
`--require-ruled`. Prose alone cannot.

## 2. Dispatcher

**Choice:** No.
**Why:** Setup is still two safety checks + `tim spec candidates` —
inline in SKILL.md.

## 3. Pre-baked context

**Choice:** No separate pre-bake; `tim spec candidates` is the bake.

## 4. Worker fan-out

**Choice:** Yes — Task `general-purpose` for judge batches (≥ ~8
packets) and for apply across disjoint capabilities.
**Why:** Today's candidate set already needed parallel judges; apply
across different capabilities does not share files. Same-capability
findings stay serial in the parent.

## 5. Walker

**Choice:** No — removed. Agent auto-accepts and applies every seeded
finding, auto-fixes lint fallout, defers only when behaviour would be a
guess.
**Why:** Approve-then-write was too slow for catch-up; the agent already
judged the candidates. Human review is the eventual PR/diff, not a
keystroke gate mid-run. Artifacts stay under the dated run dir.

## 6. Helpers introduced

None under `tools/spec-catchup/`. All mutations go through
`tim spec findings` and `tim spec baseline --advance --require-ruled`.

## 7. Triggers (disambiguation)

"catch the spec up", "the spec is behind", "spec-catchup",
"is the behaviour spec stale" — distinct from `spec-cover` (gaps → tests)
and `tim spec lint` (structure only). No `walk catchup` trigger.

## 8. Allowlist entries added

None. `Bash(tim:*)` already covers the commands.

## 9. What the skill may write

On apply: `openspec/coverage/**/coverage.json` and
`openspec/specs/**/spec.md`, then `openspec/baseline.json` via
`--require-ruled`. Edits stay uncommitted until the user asks.

## 10. Workarea layout

Everything for a date under `workareas/spec-catchup/<YYYY-MM-DD>/`
(including `candidates.json`, `payload.json`, `judge-*.json`). Nothing
loose under `workareas/spec-catchup/`.
