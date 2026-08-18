# Implementor — apply the plan

Role: Implement ticket following a plan. Produce clean, well-tested code.

**Critical:** Plan is a **starting point**. Verify assumptions, adapt as needed, document deviations.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Before You Start

One dispatch — asserts the plan exists, re-validates detect-tech per
repo, caches the PR diff if a prior PR for the ticket exists, and emits
`.implement-meta.json`:

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-implement.sh EUDPA-XXXXX
```

Then read in this order:

1. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md`
2. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/ticket.md`
3. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/.implement-meta.json` (tech list per repo)
4. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/best-practices/<repo>.md` (pre-baked at plan time)
5. Verify `[ASSUMPTION]` and `[NEEDS VERIFICATION]` items in the plan
6. **Run all tests** — do NOT proceed if failing

Redirect output to a tmp file and read the file once — don't grep streaming output:

```bash
# Java (backend / stub / reference-data)
mvn -f ~/git/defra/trade-imports-workspace/repos/<repo>/pom.xml verify > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# Node unit (frontend / admin)
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# E2E (only when changing tests repo or cross-cutting code)
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/e2e-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```

## Implementation

### Branch Setup

One allowlisted dispatch — fetch / checkout base / pull / checkout -b. The
helper always produces `feature/EUDPA-XXXXX-<slug>` and preserves the
EUDPA-* prefix (don't strip it on split branches).

```bash
~/git/defra/trade-imports-workspace/tools/ticket/setup-branch.sh EUDPA-XXXXX --repo <repo-name> --slug <description>
```

Optional `--base <branch>` if branching from anything other than `main`.

### For Each Step

1. Run tests (baseline)
2. Read existing code, find similar patterns
3. Make minimal change
4. Run tests again
5. Add tests for new functionality

### Code Standards

- Match codebase conventions
- Small, focused functions
- Meaningful error messages (don't swallow exceptions)
- Only comment the "why"
- Follow tech-specific best practices at `~/git/defra/trade-imports-workspace/docs/best-practices/`: `gds/`, `java/`, `node/`, `playwright/`, `k6/`, `rest-api/`, `doc-comments/`, `docker-compose.md`

## When Plan is Wrong

**Minor:** Fix and note in plan under "## Implementation Notes"
**Significant:** Stop, update plan with reasoning
**Blocker:** Ask user for guidance

```markdown
## Implementation Notes
### Deviations
**Step X - Planned:** [X] **Actual:** [Y] **Reason:** [Z]
### Discoveries
- [Something learned]
```

## GitHub Actions Verification

```bash
~/git/defra/trade-imports-workspace/tools/github-actions/trigger-workflow.sh <repo-name> ci.yml <branch-name>
~/git/defra/trade-imports-workspace/tools/github-actions/wait-for-run.sh <repo-name> <run-id> 1800
```

## Completion Checklist

- [ ] All AC met
- [ ] Tests pass (before and after)
- [ ] Build succeeds / GitHub Actions green
- [ ] Plan updated with deviations

## Output

```
Complete: EUDPA-XXXXX
Repos: [list] | Files: [count] | Tests added: [count]
Deviations: [list or none]
Next: Create PR, request review
```

## Don'ts

- Don't blindly follow plan - verify as you go
- Don't skip tests or ignore failures
- Don't make unrelated changes
- Don't leave plan outdated
