---
name: journey-builder
description: Run the serial build loop over a canonical backlog against whichever codebase the run's target profile names (tools/journey-builder/targets.json — currently the live-animals set in trade-imports-animals-frontend). Digest mode distils the requirement sources — Confluence "Live Animals Data Fields V4", the src/server skeleton journey, the interaction-design canvas — into a canonical machine-readable spec (journey-spec.json + conflicts.json) reviewed at a spec gate. Backlog mode derives ordered increments from the spec; build mode pops one increment at a time, invokes the target's implementor skill (frontend-change for the frontend target), re-verifies in the parent, and commits or rolls back, halting at model-extension gates and milestone walk-throughs. Use when the user asks to digest journey requirements, regenerate the backlog, run/resume the build loop, or verify a target (triggers: "digest journey requirements", "journey spec", "journey-builder", "run the loop", "build the backlog"). NOT for a single already-agreed change to the frontend — that is frontend-change on its own. NOT for the car-insurance spike or generic ticket work.
---

# journey-builder

Runs the serial build loop in whichever repo the target names. The loop scripts
know nothing about any particular codebase — adding a commodity line is a data
edit rather than a script change. Treat the target below as the current one, not
as this skill's scope.

**The target is data.** `tools/journey-builder/targets.json` declares each
target — repo, scope, spec dir, implementor skill, paths to stage, and the npm
script for each rung of the verification ladder. A run picks one from
`--target`, the backlog's `target` field, `.digest-meta.json`, or the default.
Never hardcode a path in a script or a persona: the last time the target moved,
four scripts broke at once.

Run-id: the EUDPA ticket (**EUDPA-328** is the live run; EUDPA-249 was the
original prototype programme). State lives in
`workareas/journey-builder/<run-id>/`.

The canonical spec lives in the frontend **worktree** at
`<workarea>/frontend-worktree/<target scope>/spec/` (branch
`spike/<run-id>-live-animals-spec`) — never write into
`repos/trade-imports-animals-frontend` directly: other agents work in that
checkout.

Programme plan: `~/.claude/plans/so-in-the-frontend-reflective-yeti.md`.

## Mode: digest (Phase 1 — available now)

1. `tools/journey-builder/prepare-digest.sh EUDPA-X` — seeds workarea +
   worktree + cached sources + extract placeholders + spec skeleton.
   Idempotent; `--refetch` refreshes cached sources.
2. Fan out THREE `general-purpose` Task subagents in parallel, one per
   source (confluence-v4, skeleton, ixd-canvas), each told:
   "Follow ~/git/defra/trade-imports-workspace/.claude/skills/journey-builder/references/SOURCE_EXTRACTOR.md
   for source <s>, run-id EUDPA-X."
3. Verify every extract has `status: "complete"` and non-trivial counts
   (`jq .status,.fields,.pages,.behaviours` per file). Re-spawn gaps —
   do not extract in the parent.
4. Spawn ONE `general-purpose` Task subagent:
   "Follow .../references/SPEC_RECONCILER.md, run-id EUDPA-X."
5. Parent re-runs `tools/journey-builder/spec-lint.sh EUDPA-X` — never
   trust the worker's green.
6. **Spec gate:** present to Sam — the uncommitted diff in the worktree,
   lint counts, conflicts, modelGap markers, and the open design questions
   (wipe-vs-retain, partial page completion, address copy-vs-reference,
   inline comments, provisional copy). Commit on the spec branch only
   after Sam approves.

## Mode: backlog

`tools/journey-builder/backlog-generate.sh EUDPA-X` derives
`workareas/journey-builder/EUDPA-X/backlog.json` from the spec:
one increment per page in section order (add-page / add-collection),
model-extension increments (`gate: "sam"`, born blocked) before the first
page needing each modelGap, then the car-domain removal tail
(remove-car-section per baseline section + repoint-test-fixtures) — that tail
belongs to the original prototype programme, whose vendored baseline shipped
the car domain to keep the engine-test net green; it does not apply to a
promoted target. Idempotent —
re-running preserves statuses. Inspect with `backlog-counts.sh` /
`jq` over the file.

## Mode: build (the loop)

Serial by design — increments edit shared files (registry, flow, hub, CYA).

1. `tools/journey-builder/next-increment.sh EUDPA-X --claim` — pops the
   first runnable todo (deps done) and marks it inprogress; exit 3 = dry.
2. If the increment has `gate: "sam"` or closes a milestone → STOP, present
   to Sam (model-extension design panel / milestone walk-through).
3. Invoke the target's `implementorSkill` with the increment's `type` as its
   mode — for `live-animals-frontend` that is `frontend-change`, which already
   owns the repo's own recipe docs, the obligation and flow guard rails, and
   its own verification ladder. One increment per invocation.
4. Parent re-verifies: `tools/journey-builder/verify-increment.sh EUDPA-X`
   — never trust the worker's green. Mismatch → rollback + failed.
5. Loop to 1. Halt early on 3 consecutive failures (systemic signal).
6. Per completed section run `verify-increment.sh EUDPA-X --e2e`; per
   milestone: full E2E + Sam walk-through.

## Mode: verify

`tools/journey-builder/verify-increment.sh EUDPA-X [--e2e]` — runs the rungs
the target profile declares (unit, format, lint, and with `--e2e` the target's
end-to-end suite). A target that omits a rung skips it. Log at
`<workarea>/.verify.log`.

## Tools

`tools/journey-builder/`: `prepare-digest.sh`, `extract-add-item.sh`,
`extract-finalize.sh`, `spec-add-field.sh`, `spec-add-page.sh`,
`spec-add-conflict.sh`, `spec-add-behaviour.sh`, `spec-add-fieldgroup.sh`,
`spec-lint.sh [--format]`.
