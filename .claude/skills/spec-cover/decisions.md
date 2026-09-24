# spec-cover skill — decisions

Recorded 2026-09-24 when the skill was created beside spec-catchup.
Updated same day: walk removed; auto-apply.

## 1. State shape

**Choice:** JSON-canonical under
`workareas/spec-cover/<date>/`), same findings machinery as catch-up via
`tim spec findings --skill cover`.

## 2. Dispatcher

**Choice:** No.

## 3. Pre-baked context

**Choice:** No; `tim spec gaps` is the bake. Persist as `gaps.json` in
the run dir.

## 4. Worker fan-out

**Choice:** Yes — Task `general-purpose` per gap (or small same-file
batch) for propose + apply when ≥ ~4 none/partial rows.
**Why:** Writing tests is independent per gap until coverage.json /
test-file collisions; those serialize in the parent.

## 5. Walker

**Choice:** No — removed. Agent auto-accepts and applies every seeded
finding (writes tests + coverage), auto-fixes red tests and lint, defers
only when the fix would guess behaviour.
**Why:** Same as catch-up — mid-run keystroke gates were the wrong
safety rail; the PR/diff is the review surface.

## 6. Helpers introduced

None under `tools/spec-cover/`. Uses `tim spec gaps` +
`tim spec findings --skill cover`.

## 7. Triggers (disambiguation)

"cover the gaps", "prove the spec", "spec-cover", "fill coverage holes"
— distinct from `spec-catchup` (code ahead of words) and from
`tim spec lint`. No `walk cover` trigger.

## 8. Allowlist

None beyond existing `Bash(tim:*)`.

## 9. What the skill may write

Tests under `repos/<service>/`, coverage.json in the workspace. Never
`openspec/baseline.json`.

## 10. Workarea layout

Everything for a date under `workareas/spec-cover/<YYYY-MM-DD>/`
(including `gaps.json`, `payload.json`, `judge-*.json`). Nothing loose
under `workareas/spec-cover/`.
