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
```

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
