# Workspace skill anti-patterns

Known mis-applications of the [8-pattern checklist](patterns.md).
This list grows: when a new audit pass surfaces a fresh trap, add it
here. Skills (especially `skill-creator`) read this doc at session
start so the checklist stays current without code changes.

Each entry: the anti-pattern, the symptom that catches it, and the
correction.

## A1. WALKER applied to single-artifact flows

**Symptom:** the skill produces ONE artifact (a plan, a verdict, a
draft) but ships a `WALKER.md` reference + walker keystroke prose
("F / W / D").

**Why it's wrong:** a walker is N-item triage. A single artifact
gets natural-language approval, not a keystroke loop.

**Correction:** delete the walker reference; replace with a
"Step N: iterate with user" prose section.

## A2. JSON canonical state where prose is the natural fit

**Symptom:** a single narrative document (refinement verdict, plan,
draft) has a JSON sidecar and a `render-X.sh` helper.

**Why it's wrong:** nothing queries the JSON. The render layer
exists to prevent hand-edits that wouldn't have happened anyway.

**Correction:** make the markdown canonical. Delete the JSON shape
and render helper.

## A3. Multi-helper toolchain for single-mutation state

**Symptom:** state with one mutation point ships with
`add-X.sh` + `mark-X.sh` + `set-status-X.sh` + `set-Y.sh`.

**Why it's wrong:** the surface area exceeds the workflow. The
helper count signals state complexity; mismatched count signals
over-engineering.

**Correction:** collapse to one mutation helper (or none — let the
LLM edit the artifact directly if there is no contract to enforce).

## A4. FRESH / REFRESH dispatcher where re-running fresh is the same thing

**Symptom:** `start-<skill>.sh` branches FRESH vs REFRESH based on
workspace state, but the REFRESH branch does the same work as
FRESH minus a couple of guards.

**Why it's wrong:** the dual-state adds branches, schemas, and
docs without earning idempotency the user actually feels. Often
"FRESH" already merges into prior state idempotently — REFRESH is
the same code path.

**Correction:** drop the mode branching. Make every invocation
fresh; have consumers idempotently merge into prior state.

## A5. Parallel general-purpose fan-out for judgment-heavy work

**Symptom:** the skill spawns N `general-purpose` Task subagents
for work where each worker needs the full ticket context to make a
good call (architectural reviews, ambiguous prioritisation calls).

**Why it's wrong:** fan-out is best when each worker has a tight
deliverable from a local context (one file, one package). Spreading
judgment across N subagents loses the cross-cutting view.

**Correction:** keep the work in the parent session, one item at a
time, or use a walker if the user is making the calls.

## A6. Render helper for artifacts the LLM writes directly

**Symptom:** `render-X.sh` exists but nothing else writes the
JSON — the LLM writes the markdown, the render helper rewrites it
from a JSON the LLM also writes.

**Why it's wrong:** the render layer should compile JSON the
helpers mutate (atomic, contract-checked) into a read-only markdown
view. If the LLM is the only writer, there is no JSON contract to
protect.

**Correction:** delete the render helper; the markdown is
canonical.

## A7. Pre-bake helpers for context the workflow reads once

**Symptom:** `prebake-context.sh` populates a workarea file the
workflow opens exactly once, in the same session as the prebake.

**Why it's wrong:** the pre-bake adds a script + a workarea path +
a step; the saving is one re-fetch the parent could just do inline.

**Correction:** inline the fetch in the step that consumes it.
Keep pre-bake only when fan-out workers each re-read it, or when
the data is expensive (network, computed) AND read >1 times.

## A8. Hardcoded sub-command chains in script prose

**Symptom:** SKILL.md or a helper script tells the LLM to run
`mvn clean test && mvn clean verify` (or any chain where one
command subsumes the other).

**Why it's wrong:** breaks Bash call hygiene (`&&` chain) AND the
two-command sequence is wrong — `mvn verify` runs `test` already.

**Correction:** one command per Bash call AND check the build tool
semantics — usually one phase subsumes another.

## A9. Custom subagent_type for fan-out

**Symptom:** a `references/<NAME>.md` worker is spawned with
`subagent_type: <custom-name>`.

**Why it's wrong:** custom subagent types receive the no-write
guardrail; workers can't `Write`/`Edit` the per-file artifacts
downstream scripts consume.

**Correction:** always `subagent_type: general-purpose` for
workspace workers. Use the persona path in the prompt.

## A10. Env vars in LLM-typed Bash

**Symptom:** SKILL.md or persona prose typed
`$TRADE_IMPORTS_WORKSPACE/tools/...` or
`$HOME/git/defra/...`.

**Why it's wrong:** Claude Code's "Contains simple_expansion" check
trips on `$VAR` in LLM-typed commands even when the var is
allowlisted ([GH#51001](https://github.com/anthropics/claude-code/issues/51001)).

**Correction:** literal `~/git/defra/trade-imports-workspace/...`
paths. `~` expands transparently and doesn't trip the check.
