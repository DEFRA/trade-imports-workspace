# spec-cover skill — decisions

Recorded 2026-09-24 when the skill was created beside spec-catchup.

## 1. State shape

**Choice:** JSON-canonical (`findings.json` under
`workareas/spec-cover/<date>/`), same walker machinery as catch-up via
`tim spec findings --skill cover`.
**Why:** Per-gap approve/apply needs dispositions; report.md is a render.

## 2. Dispatcher

**Choice:** No.
**Why:** `tim spec gaps` + safety checks are enough inline.

## 3. Pre-baked context

**Choice:** No — gaps JSON is the bake.

## 4. Worker fan-out

**Choice:** No for v1.
**Why:** Gap sets are small enough (tens, not hundreds) for one session.
Revisit if `--none` alone exceeds context.

## 5. Walker

**Choice:** Yes — interactive approve-then-write.
**Why:** Writing tests in service repos without approval is high-risk;
same rail as catch-up for spec.md.

## 6. Helpers introduced

None under `tools/spec-cover/`. Uses `tim spec gaps` +
`tim spec findings --skill cover`.

## 7. Triggers (disambiguation)

"cover the gaps", "prove the spec", "spec-cover", "fill coverage holes"
— distinct from `spec-catchup` (code ahead of words) and from
`frontend-change` (per-increment sync).

## 8. Allowlist entries added

None. `Bash(tim:*)` covers the commands.

## 9. Baseline

**Choice:** Cover never advances `openspec/baseline.json`.
**Why:** Filling a matrix hole is not the same as verifying linked files
since the last catch-up. Catch-up owns `--require-ruled` advance.
