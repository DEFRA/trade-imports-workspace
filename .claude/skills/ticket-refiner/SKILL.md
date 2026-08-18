---
name: ticket-refiner
description: 'Assess whether a Jira ticket is READY for team refinement and estimation, producing a READY / NEEDS WORK / SPIKE REQUIRED verdict in ~/git/defra/trade-imports-workspace/workareas/ticket-refinement/EUDPA-X/review.md. Use when the user asks to validate a ticket''s description, AC, repos, dependencies and sizing BEFORE refinement (triggers: "is ticket EUDPA-X ready", "pre-refinement", "refine EUDPA-X", "refinement check"). NOT for authoring brand-new tickets (use the ticket-creator skill: "assess existing ticket readiness" vs "create new"). NOT for planning or implementing an already-refined ticket (use the ticket skill: "assess readiness" vs "plan/implement").'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write]
argument-hint: 'EUDPA-XXXXX'
---

Role: Review tickets before refinement to assess readiness for team
estimation. Verdict is one of `READY`, `NEEDS WORK`, or `SPIKE REQUIRED`.

Works in complement with the `ticket-creator` skill — tickets created
there flow into refinement here. Both skills share a single source of
truth for "what makes a good EUDPA ticket":

- `~/git/defra/trade-imports-workspace/docs/best-practices/jira/ticket-conventions.md` — EUDPA ticket conventions (description structure, AC quality, parent/epic, labels).
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/writing.md` — GDS plain-English writing standard.

Read both at session start; assess against the same standards
`ticket-creator` authors to.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~` to
your home directory automatically. Scripts under `tools/` hardcode the workspace path as
`$HOME/git/defra/trade-imports-workspace/...` — no env var needed.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

Triggers: "is ticket EUDPA-X ready", "pre-refinement", "refine EUDPA-X",
"refinement check". NOT for authoring brand-new tickets — use the
`ticket-creator` skill. NOT for planning/implementing an already-refined
ticket — use the `ticket` skill.

## Subagents

This skill spawns no subagents and has no `references/`. The full flow is
in this file.

## Prerequisites

Authenticate to Jira before fetching tickets:

```bash
~/git/defra/trade-imports-workspace/tools/jira/auth.sh
```

(Or the umbrella `~/git/defra/trade-imports-workspace/tools/auth.sh` covering Jira +
Confluence + GitHub.)

## Ready When Team Can

- Understand what needs to be done
- Identify repos and components
- Estimate effort
- Identify risks and dependencies

## Workflow

1. Prepare workspace (one helper call — fetches Jira ticket + comments + Confluence links, seeds meta JSON, stubs `review.md`)
2. Explore codebase (read directly from `~/git/defra/trade-imports-workspace/repos/<repo>/`)
3. Assess readiness
4. Write review
5. Finalise verdict

## Step 1: Prepare Workspace

Read the shared conventions docs once at session start — they are the
standards you assess against:

- Read `~/git/defra/trade-imports-workspace/docs/best-practices/jira/ticket-conventions.md` — these are the standards you assess against.
- Read `~/git/defra/trade-imports-workspace/docs/best-practices/gds/writing.md` — GDS plain-English writing rules.

Then prepare the workarea:

```bash
~/git/defra/trade-imports-workspace/tools/refine/prepare-refinement.sh EUDPA-XXXXX
```

This produces, under `~/git/defra/trade-imports-workspace/workareas/ticket-refinement/EUDPA-XXXXX/`:

- `ticket.md` — summary, description, AC, comments, Confluence references (from Jira JSON)
- `.refinement-meta.json` — ticket fields + `verdict: null` (finalised in Step 5)
- `review.md` — pre-populated stub from `assets/refinement-template.md`

Read `ticket.md` to internalise the summary, AC and comments. The helper has already substituted `[Date]`, `[Ticket summary]`, type and priority into the review stub.

## Step 2: Explore Codebase

The workspace already has the canonical clones at
`~/git/defra/trade-imports-workspace/repos/<repo>/`. Read directly from those
working trees when you need to peek at code — do **not** clone anywhere.
See the workspace `CLAUDE.md` repo map for the authoritative repo list.

### Investigate
**Features:** Where does it fit? Patterns to follow? Similar features?
**Bugs:** Locate code? Current behaviour? Cause?
**Technical:** Current state? What changes? Dependencies?

## Step 3: Assess Readiness

Judge each check below against the conventions read in Step 1:
description structure, AC quality, parent/epic, label conformance
(`ticket-conventions.md`) and GDS writing style (`gds/writing.md`).

### Description Clarity
| Check | Question |
|-------|----------|
| Context | Is the "why" explained? |
| Scope | In/out of scope clear? |
| Specificity | Concrete details? |

### Acceptance Criteria
| Check | Question |
|-------|----------|
| Present | Are there AC? |
| Testable | Can each be verified? |
| Complete | Cover full scope? |
| Unambiguous | One interpretation? |

### Technical Clarity
| Check | Question |
|-------|----------|
| Repos | Affected repos identified? |
| Approach | Implementation understood? |
| Dependencies | Blockers identified? |
| Risks | Technical risks called out? |

### Estimability
| Check | Question |
|-------|----------|
| Sized | Fits in a sprint? |
| Unknowns | Too many to estimate? |
| Spike | Investigation first? |

## Step 4: Write Review

`prepare-refinement.sh` already stubbed
`~/git/defra/trade-imports-workspace/workareas/ticket-refinement/EUDPA-XXXXX/review.md`
from `assets/refinement-template.md`. Fill each section in place from
Steps 1-3 — `## Description Summary`, `## Acceptance Criteria`,
`## Codebase Investigation`, `## Readiness Assessment`,
`## Questions for Refinement`, `## Suggested Improvements`, and the
trailing `## Verdict` block.

## Step 5: Finalise Verdict

After filling `review.md`, record the verdict on the meta JSON:

```bash
~/git/defra/trade-imports-workspace/tools/refine/refine-finalize.sh EUDPA-XXXXX --verdict READY --reason "Clear AC, repos identified"
```

Verdict must be one of `READY`, `NEEDS WORK`, `SPIKE REQUIRED` (the
helper rejects anything else). The `--reason` is optional but
recommended.

## Verdict Guidelines

| Verdict | Criteria |
|---------|----------|
| **READY** | Clear description, testable AC, team can estimate |
| **NEEDS WORK** | Missing info needed before refinement |
| **SPIKE REQUIRED** | Too many unknowns - needs investigation first |

**Next-step prose by verdict:**

- `READY` — completion output should explicitly state
  "next: `plan EUDPA-XXXXX` via the `ticket` skill" so the user
  knows where to take the now-refined ticket.
- `NEEDS WORK` — if the ticket was freshly created via
  `ticket-creator`, point the user back at the relevant section of
  `docs/best-practices/jira/ticket-conventions.md` (or `gds/writing.md`)
  that explains what's missing. Treat the conventions doc as the
  single source of truth — don't invent ad-hoc rules.
- `SPIKE REQUIRED` — name the specific unknowns the spike should
  investigate; do not just say "unknowns".

## Completion Output

```
Refinement review complete for EUDPA-XXXXX.

Verdict: [VERDICT]

Key findings:
- [Finding]

Questions for refinement:
- [Question]

Review available at: ~/git/defra/trade-imports-workspace/workareas/ticket-refinement/EUDPA-XXXXX/review.md
```
