---
name: ticket-creator
description: 'Create a new Jira ticket (Bug/Story/Task) end-to-end — gathers requirements via GDS plain-English questions, drafts the ticket to ~/git/defra/trade-imports-workspace/workareas/ticket-creation/<slug>/draft.md for user iteration, then creates it in Jira via the shared create-ticket script. Use when the user wants to raise, file, log, open or otherwise create a new Jira ticket from scratch (triggers: "create ticket", "raise ticket", "new ticket", "file a bug", "log a story", "open a ticket", "flesh out ticket"). NOT for working an existing ticket (use the ticket skill) and NOT for assessing whether an existing ticket is refinement-ready (use the ticket-refiner skill).'
context: inline
allowed-tools: [Bash, Read, Write, Edit]
argument-hint: '[optional one-line summary]'
---

Role: Help create well-structured, actionable Jira tickets.

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

## Step 0: Session start

Before the interview, refresh the present-info prereqs and Read the
rules.

```bash
~/git/defra/trade-imports-workspace/tools/ticket-creator/prepare-ticket-creation.sh
```

That writes the current set of active EUDPA-board epics and EUDP
capability codes under `workareas/ticket-creation/.prereqs/`. Surface
any `WARNING:` line from the output to the user (e.g. stale capability
map suggests running `tools/confluence/sync-docs.sh`).

If it exits non-zero with an `ERROR:` line, the capability map has
drifted from its canonical row shape and `capabilities.txt` was
deliberately left unchanged rather than written short. Tell the user
to run `tools/ticket-creator/check-capabilities.sh`, which names the
offending rows. Do not offer a capability picker from a stale file.

Then Read these references so they sit in context for the whole
session:

- `~/git/defra/trade-imports-workspace/workareas/ticket-creation/.prereqs/epics.txt`
  — fresh `KEY — summary` for each open epic on board 13780.
- `~/git/defra/trade-imports-workspace/workareas/ticket-creation/.prereqs/capabilities.txt`
  — `CAP-X.X — Name [STATUS]` for each capability defined in the EUDP
  capability map. The `[STATUS]` suffix is omitted where a capability
  has no status recorded.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/writing.md`
  — GDS plain-English rules for ticket prose.
- `~/git/defra/trade-imports-workspace/docs/best-practices/jira/ticket-conventions.md`
  — Type / priority / AC / named-conventions guidance for the EUDPA
  project.
- `~/git/defra/trade-imports-workspace/.claude/skills/ticket-creator/assets/known-labels.md`
  — accepted EUDPA-project Jira labels (camelCase canonical form).

## Workflow

0. Refresh prereqs and Read the rules (above)
1. Gather information
2. Either create a placeholder ticket, continue a placeholder ticket, or create with a new ticket. If creating a placeholder ticket, get a title that encapsulates the work and a parent epic, then create the ticket without gathering more information, and skip the remaining steps. If continuing a placeholder ticket, get the ticket key from the user, refresh the draft from JIRA, and continue with the remaining steps. 
3. Determine type and fields
4. Draft ticket to `~/git/defra/trade-imports-workspace/workareas/ticket-creation/<slug>/draft.md`
5. Iterate on draft with user
6. Create ticket from final draft

`<slug>` is a short kebab-case identifier derived from the summary (e.g.
`commodity-code-validation`). If the ticket is in response to an existing
parent epic, prefix with the epic key (e.g. `EUDPA-9888-rotate-jenkins-token`).

## Step 1: Gather Information

Ask each question on its own turn — the interview is intentionally
serial, not a single batched form. Each answer informs the next
question.

### Required Questions
| Question | Purpose |
|----------|---------|
| Type (Bug/Story/Task)? | Template |
| One-line summary? | Summary field |
| Context - why needed? | Description |
| Acceptance criteria? | AC section |

### Parent epic — always asked

EUDPA is a feature/capability project: every ticket sits under one
of the active feature epics on the EUDPA board. The current set is
already Read into context as `workareas/ticket-creation/.prereqs/epics.txt`
(see Step 0).

Ask the user which epic this work belongs to. If they don't know,
read back the candidates from `epics.txt` so they can pick. Step 1.5
verifies the chosen key.

### Capability code (Stories only — optional)

For a Story tied to an EUDP capability slice, ask which capability
applies. The current set is already Read into context as
`workareas/ticket-creation/.prereqs/capabilities.txt`. If the user
isn't sure, read back the candidates and let them pick. The chosen
code becomes a label on the ticket (e.g. `CAP-02.5`); coining new
codes is out of scope for this skill.

### Tech-debt modifier (opt-in)

If **Type == Task** and the user describes the work as tech debt,
ask once:

> Default this as tech debt — label `technicalImprovement`, priority `Lowest`? (Y/n)

If yes, apply both defaults without re-asking. Parent epic is still
the user's choice (no specific key is suggested — tech-debt work in
EUDPA lands under whichever feature epic owns the area).

If no, proceed through the rest of the interview asking each field
individually.

The modifier is **opt-in only** — never auto-apply it. Do not
introduce other named conventions in this skill.

### For Bugs
- Environment (Dev/Test/Performance/Pre-prod/Prod)?
- Steps to reproduce?
- Expected vs actual?
- Screenshots/logs?

### For Stories
- User and goal?
- Feature flag?
- Design mockups?

### For Tasks
- Tech debt or feature-related?
- Services affected?
- Related tickets?

## Step 1.5: Verify parent epic (if provided)

If the user supplied a parent epic key during Step 1, verify it before
drafting — typo'd keys are easier to catch now than after the user has
spent a turn answering the rest of the interview.

```bash
~/git/defra/trade-imports-workspace/tools/jira/ticket.sh "$PARENT" summary
```

- Exit 0: confirm the epic summary back to the user ("Parent: $PARENT
  — $SUMMARY"), then continue.
- Non-zero or `Issue does not exist...` in the output: surface the
  error verbatim and ask for a corrected key, or for the user to
  remove the parent. Do not proceed to drafting until the lookup
  succeeds or the user removes the parent.

Skip this step entirely when no parent epic was supplied.

## Step 2: Determine Fields

| Field | How to Determine |
|-------|------------------|
| Type | Bug=broken, Story=user-facing, Task=technical |
| Summary | <80 chars, specific, action-oriented |
| Priority | Highest/High=blocking; Medium=normal; Low/Lowest=nice-to-have |

### Labels

camelCase canonical form (e.g. `technicalImprovement`, not
`tech-improvement`). Pick from the catalogue at
`~/git/defra/trade-imports-workspace/.claude/skills/ticket-creator/assets/known-labels.md`
— prefer reusing an existing label over coining a new one.

## Step 3: Write Description

Jira wiki syntax: `*bold*`, `+*underlined bold*+`, `{{monospace}}`,
`* bullet`, `# numbered`.

Pick the template that matches the chosen Type and read its body from
`assets/templates/<type>.md`:

| Type | Template file |
|------|---------------|
| Bug | `assets/templates/bug.md` |
| Story | `assets/templates/story.md` |
| Task | `assets/templates/task.md` |

Substitute the bracketed placeholders with the answers from Step 1. Keep
the section ordering as the template defines it — convention across the
team. Wiki-colour blocks (`{color:...}`, `{panel:...}`) render natively in
Jira; preserve them verbatim.

## Step 4: Iterate on Draft

Write the draft to `~/git/defra/trade-imports-workspace/workareas/ticket-creation/<slug>/draft.md`:

```markdown
# Ticket Draft: <slug>

**Type:** [Bug/Story/Task]
**Summary:** [Summary]
**Priority:** [Priority]
**Parent:** [Epic or None]
**Labels:** [labels or None]
**Assignee:** [Self or None]

## Description
[Wiki markup body — see assets/templates/<type>.md]

## Open Questions
- [Anything still missing or ambiguous]

## Status
DRAFT — awaiting user approval
```

Show the draft path to the user, summarise what is in it, and ask:

> Draft at `~/git/defra/trade-imports-workspace/workareas/ticket-creation/<slug>/draft.md`.
> Review and tell me what to change, or say "create it" to proceed.

Edit the file in place as the user gives feedback. Only move to Step 5 once
the user explicitly approves. Update the **Status** line to `APPROVED`
before creating.

## Step 5: Create Ticket

```bash
~/git/defra/trade-imports-workspace/tools/jira/create-ticket.sh [options] "Summary" "Description"
```

| Flag | Description | Default |
|------|-------------|---------|
| -t, --type | Bug/Story/Task | Task |
| -p, --parent | Epic key | None |
| -P, --priority | Lowest-Highest | Medium |
| -l, --label | Add label (repeatable) | None |
| -a | Self-assign | No |

### After Creation

Append the new key and link to the bottom of `draft.md` and update
**Status** to `CREATED: EUDPA-XXXXX`.

```
Ticket created: EUDPA-XXXXX
Link: ${JIRA_BASE_URL}/browse/EUDPA-XXXXX
Draft retained at: ~/git/defra/trade-imports-workspace/workareas/ticket-creation/<slug>/draft.md
```

## References

- AC style and examples — see
  `~/git/defra/trade-imports-workspace/docs/best-practices/jira/ticket-conventions.md`
  (free-form bullets; no Gherkin mandate).
- Named conventions (Tech Debt Board bundle etc.) — same doc, "Named
  conventions" section.
