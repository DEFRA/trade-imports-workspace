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

## Sync the behaviour spec

Once the tests are green and before you raise the PR. A red suite means
there is no verified behaviour to describe — fix that first.

The Behaviour Spec under `~/git/defra/trade-imports-workspace/openspec/`
records intended behaviour (`specs/`) and which tests witness it
(`coverage/`). `frontend-change` does this per increment; a ticket landed
through this phase has to do it too, or the spec drifts until someone
rebuilds it by hand.

**Read `~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/references/SPEC_SYNC.md`**
before the first write. It is the shared technique — merge rather than
overwrite, the file shapes, the `coverage.json` contract, how to mint a
new capability. `openspec/config.yaml` owns the conventions. Do not
invent a second convention here.

### 1. Does this ticket touch spec-covered behaviour?

The spec covers four namespaces, and only these repos map to them:

| Namespace | Repos |
|---|---|
| `live-animals/` | `trade-imports-animals-frontend`, `trade-imports-animals-backend` |
| `admin/` | `trade-imports-animals-admin` |
| `ins/` | `trade-imports-ins-frontend`, `trade-imports-ins-backend` |
| `plants/` | `trade-imports-plants-frontend`, `trade-imports-plants-backend` |

That is which repos can **change** behaviour in a namespace, not which
appear in its `coverage.json` — no coverage link names
`trade-imports-animals-backend` today, yet `live-animals/notification-lifecycle`
describes statuses, durability and idempotent delete that the backend
owns. `trade-imports-animals-tests` is the reverse: it appears in every
namespace as a **witness**, never an owner, so a tests-repo change needs
no `specs/` update (it may still need `coverage/` links re-pointed).

No repo maps → nothing to write; say so in the Output and move on. Nor
does every change to a mapped repo qualify: the spec records what a user
or operator can **observe**. A refactor, a rename, a dependency bump, a
CI change, logging, test-only work — none of that is observable, and
inventing a scenario for it is worse than silence, because it validates
green and misleads. Same judgement as `frontend-change` Step 5.1a.

### 2. Find the capability

`SPEC_SYNC.md`'s kind → capability table is **journey-shaped** — pages,
obligations, flow, captions, addresses. It answers a frontend change
directly, including the warning that a capability leaf is named for the
page a user sees, not for the directory the code sits in.

It does not cover a backend or cross-cutting change. There is no table
for those: read `openspec/coverage/AREAS.md` and the candidate `spec.md`
files and decide, the same way you would name the leaf for a page. The
cross-cutting capabilities are where this usually lands —
`notification-lifecycle`, `notification-events`,
`notification-status-and-reference`, `admin/outbox-events`. If nothing
fits and the behaviour is genuinely new, mint a capability per
`SPEC_SYNC.md` — including **both** collision greps, path and code.

### 3. Write, validate, self-check

Write `openspec/specs/<path>/spec.md` and
`openspec/coverage/<path>/coverage.json` per `SPEC_SYNC.md`, then:

```bash
~/git/defra/trade-imports-workspace/tools/frontend-change/openspec-validate.sh <capability-path>
```

No `--root` — this phase always writes the workspace checkout; there is
no worktree here, unlike a `journey-builder` run.

Then self-check both writes against the diff you just verified, exactly
as `frontend-change` Steps 5.5 and 5.6 do: name the diff hunk behind
every scenario you added or changed, and confirm every `tests[]` link on
a touched scenario names a file in the diff whose body holds that test.
A scenario with nothing behind it is a guess. **Stop and report rather
than raising the PR** — a wrong spec is worse than an absent one,
because the next person trusts it.

### 4. Where the spec write lands

The spec is in `trade-imports-workspace`; the code usually is not. Two
cases:

- **The ticket already touches `trade-imports-workspace`** — the spec
  write goes in that same PR. Nothing else to do.
- **It does not** — create a branch of the **same name** on the workspace
  repo, commit the spec write, and raise a second PR. Cross-repo branch
  parity is CLAUDE.md rule 2, and the same name is what lets `review`
  find both: `tools/github/prs.sh` searches the whole `DEFRA` owner by
  ticket, so both PRs land in the ticket's PR set and the behaviour-spec
  checks there can cross-reference them.

`setup-branch.sh` cannot make this branch — it resolves `--repo` under
`repos/` and the workspace root is not there. Use plain
`git -C ~/git/defra/trade-imports-workspace` calls.

Name both PRs in the Output. A caller cannot review what it was not told
about.

## GitHub Actions Verification

```bash
~/git/defra/trade-imports-workspace/tools/github-actions/trigger-workflow.sh <repo-name> ci.yml <branch-name>
~/git/defra/trade-imports-workspace/tools/github-actions/wait-for-run.sh <repo-name> <run-id> 1800
```

## Completion Checklist

- [ ] All AC met
- [ ] Tests pass (before and after)
- [ ] Build succeeds / GitHub Actions green
- [ ] Behaviour spec synced, or recorded as not applicable and why
- [ ] Plan updated with deviations

## Output

```
Complete: EUDPA-XXXXX
Repos: [list] | Files: [count] | Tests added: [count]
Spec sync: <capability-path> (<n> scenarios)<, AREA <CODE> minted> ·
           validate green
           — or — none: <no repo maps to a spec namespace |
                         no observable behaviour change>
Spec files: openspec/specs/<path>/spec.md,
            openspec/coverage/<path>/coverage.json
            <, openspec/coverage/AREAS.md>
Deviations: [list or none]
Next: Create PR, request review
```

Where the spec write went to its own branch, name **both** PRs — the
code one and the workspace one — so the reviewer knows to look at the
pair.

## Don'ts

- Don't blindly follow plan - verify as you go
- Don't skip tests or ignore failures
- Don't make unrelated changes
- Don't leave plan outdated
- Don't invent a scenario for a change nothing observable came out of —
  silence is correct there, and a spec that describes a refactor
  validates green while misleading everyone who reads it
