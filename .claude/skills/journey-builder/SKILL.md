---
name: journey-builder
description: Run the serial build loop over a canonical backlog against whichever codebase the run's target profile names (tools/journey-builder/targets.json — today live-animals-frontend and high-risk-plants-frontend). Digest mode distils the requirement sources the target declares in its sources[] — a Confluence page, the repo's own skeleton, an interaction-design canvas — into a canonical machine-readable spec (journey-spec.json + conflicts.json) reviewed at a spec gate. Backlog mode derives ordered increments from the spec; build mode pops one increment at a time, invokes the target's implementor skill (frontend-change for both frontend targets), re-verifies in the parent, and commits or rolls back, halting at model-extension gates and milestone walk-throughs. Use when the user asks to digest journey requirements, regenerate the backlog, run/resume the build loop, or verify a target (triggers: "digest journey requirements", "journey spec", "journey-builder", "run the loop", "build the backlog"). NOT for a single already-agreed change to the frontend — that is frontend-change on its own. NOT for the car-insurance spike or generic ticket work.
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
`<workarea>/frontend-worktree/<target specDir>/` (branch
`spike/<run-id>-<target specBranchSuffix>`) — never write into the target's own
checkout under `repos/` directly: other agents work in it.

Programme plan: `~/.claude/plans/so-in-the-frontend-reflective-yeti.md`.

## Mode: digest (Phase 1 — available now)

1. `tools/journey-builder/prepare-digest.sh EUDPA-X` — seeds workarea +
   worktree + cached sources + extract placeholders + spec skeleton.
   Idempotent; `--refetch` refreshes cached sources.
2. Fan out one `general-purpose` Task subagent per non-pending source the
   target declares — read them from `.digest-meta.json`'s `sources`, do not
   assume the live-animals three. Each is told:
   "Follow ~/git/defra/trade-imports-workspace/.claude/skills/journey-builder/references/SOURCE_EXTRACTOR.md
   for source <s>, run-id EUDPA-X."

   `SOURCE_EXTRACTOR.md` carries parsing rules per source **id**, and those
   rules are shape-specific: "five tables, three column schemas" describes one
   particular Confluence page, not Confluence in general. A target introducing
   a new source must add its extraction rules there first — the plumbing is
   target-driven, the reading is not.
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

## Mode: rule

A gate session produces rulings, and every ruling is recorded and applied in
one call so the ledger and the spec cannot drift.
`tools/journey-builder/spec-add-decision.sh EUDPA-X --subject conflict:c-012
--ruling resolve --resolution "..." --rationale "..." --decided-by panel|sam
--decided-at YYYY-MM-DD [--dissent "..."] [--escalate] [--supersedes d-003]`
appends a `d-NNN` entry to `<spec_dir>/decisions.json` (beside
journey-spec.json, on the spec branch) and stamps the subject in the same
write: a conflict gets `resolution`, `resolvedBy` and `decision`; a
behaviour (`--ruling adopt|park|reject|keep-open`) gets its status
(adopted / parked / rejected / open-question), a ` | Ruling: ...` note on
its detail, and `decision`. The caller passes `--decided-at` — the script
never reads the clock, so a replayed session gives a byte-identical ledger.

A subject carries one current decision. To change a ruling, add a new
decision with `--supersedes <d-id>`: the earlier entry flips to
`superseded` with `supersededBy`, the new one is current, and the subject
is re-stamped. A decision may only supersede a current one for its own
subject, so the chain stays linear and readable.

When a ruling changes a fact rather than a status — a mandate, a page
title, which page collects an obligation — apply it with the setters
rather than by hand-editing JSON: `spec-set-field.sh EUDPA-X --id
<obligationId> [--field K=V] [--json K='<json>'] [--unset K]` and
`spec-set-page.sh EUDPA-X --id <pageId> [--field K=V] [--json K='<json>']
[--unset K] [--collects a,b,c]`. Both refuse to change `id` (other entries
reference it) and validate `--json` values, so `false` and `null` are
accepted. Removals and extra edits go through their own scripts for the same
reason: `spec-remove-field.sh` (drops the obligation and every collects /
item / fields reference in one pass, refusing while another obligation is
gated on it), `spec-remove-page.sh` (refusing while the page still collects,
and dropping a section it empties), `backlog-set-extra.sh` and
`backlog-remove-extra.sh` (refusing while another extra anchors on the
key). Then re-run `spec-lint.sh`: it errors on a `decision` reference
the ledger does not hold, and warns on conflicts resolved without a
decision and on decisions whose subject has gone.

## Mode: backlog

`tools/journey-builder/backlog-generate.sh EUDPA-X` derives
`workareas/journey-builder/EUDPA-X/backlog.json` from the spec:
one increment per page in section order (add-page / add-collection),
then the car-domain removal tail (remove-car-section per baseline section +
repoint-test-fixtures) — that tail belongs to the original prototype
programme, whose vendored baseline shipped the car domain to keep the
engine-test net green; it does not apply to a promoted target — then the
model-extension increments (`gate: "sam"`, born blocked) and the pages
deferred behind them. Idempotent — re-running preserves statuses by content
key, and refuses to drop an increment it cannot re-derive. `--dry-run`
prints what it would write without touching the file. Inspect with
`backlog-counts.sh` / `jq` over the file.

Work a run needs that no spec page can yield — repo hygiene in the target
repo, a tripwire test to restore, E2E coverage that lives in the tests repo —
is declared, not hand-edited into backlog.json. `backlog-add-extra.sh
EUDPA-X --key K --type fix|e2e|chore|restore --title "..." --detail "..."
--anchor 'before=page:origin' [--repo repos/x] [--milestone M1] [--gate sam]`
appends to `<spec_dir>/backlog-extras.json`, which sits beside
journey-spec.json on the spec branch and is reviewed at the spec gate. The
generator splices each extra in at its anchor (`start`, `end`,
`before`/`after` a `page:<pageId>` or an earlier `key:<extraKey>`) before
numbering, so it joins the linear chain, keeps its status across
regenerations under the key `<type>:<key>`, inherits the milestone of what
it anchors to unless told otherwise, and is born blocked when gated. The
type vocabulary is deliberately small; widen it in both scripts together.

## Mode: plan

The generator gives an increment a type, a subject and a place in the chain;
the build loop and the batch orchestrator also need `title`, `kind`,
`sizeGuess`, `filesToTouch`, `acceptanceCriteria`, `verification`,
`openQuestions`, `implementorSkill`, `recipe` and `notes`. The orchestrator
withholds any increment whose `sizeGuess` is null, so nothing is buildable
until it is planned.

Plans are written **just in time**: the batch orchestrator's L1 spawns one
`general-purpose` planner for the increment it has just derived, when that
increment has no `sizeGuess`, and builds it once the write is checked. The
planner follows
`~/git/defra/trade-imports-workspace/.claude/skills/journey-builder/references/INCREMENT_PLANNER.md`
for run-id EUDPA-X and increment inc-NNN: it reads the increment, the spec
objects it names, the recipes, and (for a mirrored page) the animals feature,
writes `<workarea>/plans/inc-NNN.json`, and applies it with
`tools/journey-builder/backlog-plan-increment.sh EUDPA-X --increment inc-NNN
--plan <file>` — the only write path; the script validates the shape and
refuses a plan that changes what the spec owns (an extra's `title`, every
increment's `repo`). A plan that already exists is used as it stands.

An up-front pass is optional — a handful of planners in `dependsOn` order,
each write verified with `jq` (sizeGuess set, non-empty files, criteria and
rungs) — for when the first batches should start faster. Nobody reviews sixty
plans at once, so do not plan the whole backlog ahead of the build. Plans name
other increments by key or page, never by `inc-NNN`: ids shift when an extra
is added or withdrawn.

`backlog-generate.sh` preserves the planned fields by content key, so a
regeneration after planning keeps the plan. A done increment is not
re-planned; a failed or blocked one is re-planned by running the planner
again.

## Mode: build (the loop)

Serial by design — increments edit shared files (registry, flow, hub, CYA).

1. `tools/journey-builder/next-increment.sh EUDPA-X --claim` — pops the
   first runnable todo (deps done) and marks it inprogress; exit 3 = dry.
2. If the increment has `gate: "sam"` or closes a milestone → STOP, present
   to Sam (model-extension design panel / milestone walk-through).
3. Invoke the target's `implementorSkill` with the increment's `type` as its
   mode — both frontend targets name `frontend-change`, which reads the target
   repo's own recipe docs, the obligation and flow guard rails, and its own
   verification ladder. One increment per invocation.
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

## Handoff with `parity`

Some backlogs under `workareas/journey-builder/` are not built by digest mode —
they are findings backlogs, produced by the `parity` skill from a comparison
between a codebase and a requirements source. Both skills write the same
`backlog.json`, and the split is produce and consume:

- **parity** builds the findings, resolves their evidence, renders them as a
  decision surface and adjudicates them. It owns `finding.*`, `citations[]`,
  `visual[]`, `decision`, and — through `rule-decision.sh` — `status` and
  `gate`.
- **journey-builder** consumes `status`, `gate` and `dependsOn` to run the loop
  over whatever has been accepted. It never reads `finding.*`, and it never
  regenerates a findings backlog: `backlog-generate.sh` rewrites the whole file
  and would destroy the rulings and the revalidation notes recorded in it.

Never run both against one run at the same time. Both write the whole file.

## Tools

`tools/journey-builder/`: `prepare-digest.sh`, `extract-add-item.sh`,
`extract-finalize.sh`, `spec-add-field.sh`, `spec-add-page.sh`,
`spec-add-conflict.sh`, `spec-add-behaviour.sh`, `spec-add-fieldgroup.sh`,
`spec-set-field.sh`, `spec-set-page.sh`, `spec-remove-field.sh`,
`spec-remove-page.sh`, `spec-add-decision.sh`, `spec-resolve-conflict.sh`,
`spec-set-behaviour-status.sh`, `spec-lint.sh [--format]`,
`backlog-add-extra.sh`, `backlog-set-extra.sh`, `backlog-remove-extra.sh`,
`backlog-generate.sh`, `backlog-plan-increment.sh`, `backlog-set-status.sh`.
