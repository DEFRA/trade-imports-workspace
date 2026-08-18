---
name: journey-builder
description: Build a journey prototype in whichever frontend repo the run's target names (today prototypes/standalone/live-animals in trade-imports-animals-frontend) on the obligations-v2 page-owned-spine model. Digest mode distils the requirement sources — Confluence "Live Animals Data Fields V4", the src/server skeleton journey, the interaction-design canvas — into a canonical machine-readable spec (journey-spec.json + conflicts.json) reviewed at a spec gate. Backlog mode derives ordered increments from the spec; build mode runs the serial implementor loop (one INCREMENT_IMPLEMENTOR subagent per increment, parent re-verifies, commit-or-rollback), halting at model-extension gates and milestone walk-throughs. Use when the user asks to digest journey requirements, regenerate the backlog, run/resume the build loop, or verify the prototype (triggers: "digest journey requirements", "journey spec", "journey-builder", "build the live-animals prototype", "run the loop"). NOT for the car-insurance spike itself or for generic ticket work.
---

# journey-builder

Builds a journey prototype in a frontend repo. The loop scripts know nothing
about any particular codebase — a target names the repo to work in, what to
stage and how to verify, so adding a commodity line is a data edit rather than a
script change. The target today is `trade-imports-animals-frontend`
(`prototypes/standalone/live-animals`), and the paths below name it directly;
treat that as the current target, not as this skill's scope.

Run-id: the EUDPA ticket (currently **EUDPA-249** — no separate ticket for
this programme). State lives in
`workareas/journey-builder/<run-id>/`; the canonical spec lives in the
frontend **worktree** at
`<workarea>/frontend-worktree/prototypes/standalone/live-animals/spec/`
(branch `spike/<run-id>-live-animals-spec`) — never write into
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
(remove-car-section per baseline section + repoint-test-fixtures) — the
vendored baseline ships the car domain to keep the engine-test net green;
see `prototypes/standalone/live-animals/PROVENANCE.md`. Idempotent —
re-running preserves statuses. Inspect with `backlog-counts.sh` /
`jq` over the file.

## Mode: build (the loop)

Serial by design — increments edit shared files (registry, flow, hub, CYA).

1. `tools/journey-builder/next-increment.sh EUDPA-X --claim` — pops the
   first runnable todo (deps done) and marks it inprogress; exit 3 = dry.
2. If the increment has `gate: "sam"` or closes a milestone → STOP, present
   to Sam (model-extension design panel / milestone walk-through).
3. Spawn ONE `general-purpose` Task subagent:
   "Follow ~/git/defra/trade-imports-workspace/.claude/skills/journey-builder/references/INCREMENT_IMPLEMENTOR.md
   for run-id EUDPA-X, increment <id>." The persona owns the touch-lists
   (vendored `docs/add-a-{page,field,collection}.md`), the enforcedAt
   semantics, the never-author-gates rule (T11), and commit/rollback.
4. Parent re-verifies: `tools/journey-builder/verify-increment.sh EUDPA-X`
   — never trust the worker's green. Mismatch → rollback + failed.
5. Loop to 1. Halt early on 3 consecutive failures (systemic signal).
6. Per completed section run `verify-increment.sh EUDPA-X --e2e`; per
   milestone: full E2E + Sam walk-through.

## Mode: verify

`tools/journey-builder/verify-increment.sh EUDPA-X [--e2e]` — unit suite +
prettier + eslint over the prototype (log at `<workarea>/.verify.log`).

## Tools

`tools/journey-builder/`: `prepare-digest.sh`, `extract-add-item.sh`,
`extract-finalize.sh`, `spec-add-field.sh`, `spec-add-page.sh`,
`spec-add-conflict.sh`, `spec-add-behaviour.sh`, `spec-add-fieldgroup.sh`,
`spec-lint.sh [--format]`.
