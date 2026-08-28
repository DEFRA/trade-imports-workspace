# Planner — produce an implementation plan

Role: Analyse ticket and create implementation plan. **No implementation work.**

**Critical:** Plan is a **first impression**. Mark uncertainty with `[ASSUMPTION]` and `[NEEDS VERIFICATION]`.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Workflow

### 1. Gather Context

One dispatch — fetches the ticket, comments, Confluence references, and
(if `--repos` is passed) per-repo detect-tech + best-practices bundles.
Reads `workareas/ticket-planning/EUDPA-XXXXX/{ticket.md,.plan-meta.json,best-practices/<repo>.md}`
when done.

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-plan.sh EUDPA-XXXXX
```

Or, if the affected repos are already known up front:

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-plan.sh EUDPA-XXXXX --repos trade-imports-animals-frontend,trade-imports-animals-backend
```

### 2. Explore Codebase

Find: similar functionality, services involved, integration points, configuration.

Tech + best-practices are already baked in `.plan-meta.json` and
`best-practices/<repo>.md` for the repos you passed. If you discover
further repos in scope, re-run `prepare-plan.sh --repos` to refresh.

### 3. Create Plan

Create: `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md`

```markdown
# Implementation Plan: EUDPA-XXXXX

**Ticket:** [Summary]
**Date:** [Date]
**Confidence:** High (clear examples) / Medium (some extrapolation) / Low (significant assumptions)

## Summary
[2-3 sentences]

## Repositories & Tech Stack

| Repository | Changes | Technologies | Best Practices |
|------------|---------|--------------|----------------|

## Implementation Steps

### 1. [Step Name]
**Goal:** [What this achieves]
**Files:** `path/to/File.java` - [What changes]
**Pattern:** See `path/to/Example.java:45-80`
**Landed with:** [For every new export / function / module / regex character
this step introduces, name the in-tree caller in this PR that consumes it —
specific file:line. If none exist, this step is scope creep: move it to
`## Deferred to caller ticket` (see the Scope-in-caller gate below).]
**Notes:** [NEEDS VERIFICATION] Check if [thing] applies

## Testing Strategy
| Test File | What to Test |
|-----------|--------------|

## Configuration
| Variable/Flag | Purpose | Where Defined |
|---------------|---------|---------------|

## Risks & Open Questions
| Risk/Question | Mitigation/Notes | Severity |
|---------------|------------------|----------|

## Alternative Approaches (if applicable)
**Option A:** [Pros/Cons]
**Option B (Recommended):** [Pros/Cons/Why]

## References
- `path/to/Similar.java` - [What it does]

## Deferred to caller ticket
- [Symbol / export / regex tweak — what it would be, and which ticket
  is the natural place to add it because that ticket has the real caller.]
```

### 4. Scope-in-caller gate

Before finalising the plan, walk every step and every new export /
function / module / regex tweak in the `Files` section against this
question:

> *Does an in-tree caller land in the same PR that consumes this?*

If the answer is "no", "a future ticket", "so `EUDPA-XXX` can consume it",
or "as groundwork for X" — the item **does not ship in this PR**. Move
it to `## Deferred to caller ticket` and let the ticket with the real
caller add it. This applies to functions **and** to smaller pieces of
speculative defence (regex characters that guard shapes no in-tree
code produces, config keys nothing reads, comments naming future
tickets).

Rationale: CLAUDE.md's *"don't design for hypothetical future
requirements"*. "Blocks EUDPA-YYY" in a Jira ticket is a dependency
relationship, not an implementation directive — YYY needs the
delimiter / schema decision, not helper functions.

**Worked example (EUDPA-349):**
Step 1 originally proposed exposing `formatCompositeFulfilmentId` and
`parseCompositeFulfilmentId` in `bridge/fulfilment-id.js` "as groundwork
for EUDPA-333". No in-tree caller existed. The composite public shape
was legitimately in scope (the ticket AC says the format), but the
helpers were not — EUDPA-333 will add them when it wires the shape into
a URL boundary. This gate would have kept the helpers off EUDPA-349.
Step 3 then added `:` to a `FIELD_UNSAFE` regex purely to defend that
same speculative shape, and the same gate would have caught that too.

If the plan writes a step and the `**Landed with:**` line reads "for
EUDPA-XXX to consume" or "future ticket", the plan fails this gate.

## Output

```
Plan created: ~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md
Repos: [list] | Steps: [X] | Confidence: [level]
Items needing verification: [X]
```

## Don'ts

- Don't implement - plan only
- Don't decide for implementer - provide options
- Don't skip uncertainty markers
- Don't propose new exports, functions, modules, or regex tweaks
  without naming the in-tree caller they land with in this PR
  (see the Scope-in-caller gate above). "Groundwork for EUDPA-XXX"
  is not a caller.
