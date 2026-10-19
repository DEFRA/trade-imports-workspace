# EUDPA Jira ticket conventions

Project-policy guidance for tickets in the **EUDPA** Jira project.
Shared by the `ticket-creator`, `ticket-refiner`, and `ticket` skills.

For GDS writing style applied to summaries, descriptions, and AC, see
[`../gds/writing.md`](../gds/writing.md).

## Type guidance

| Type | Use when |
|------|----------|
| **Bug** | An existing feature is broken — wrong output, error, regression, deviates from documented behaviour. |
| **Story** | A user-facing capability or behaviour change. Phrased around what the user can do once shipped. |
| **Task** | Technical or operational work with no direct user-visible change — refactor, tech debt, infrastructure, investigation. |

If it could land as either Story or Task, prefer **Story** when there
is observable behaviour for an end user, **Task** otherwise.

## Priority guidance

| Priority | Use when |
|----------|----------|
| **Highest** | Production-blocking or live-incident workstream. |
| **High** | Blocks other work in flight or another team. |
| **Medium** | Default. Normal planned work. |
| **Low** | Nice-to-have; can drift without harm. |
| **Lowest** | Backlog hygiene, opportunistic clean-up, tech debt (see [Field-default modifiers](#field-default-modifiers-opt-in)). |

## Labels

Labels are camelCase by convention in this project — `technicalImprovement`,
not `tech-improvement` or `technical_improvement`. The authoritative
list of accepted EUDPA labels lives in
[`~/git/defra/trade-imports-workspace/.claude/skills/ticket-creator/assets/known-labels.md`](../../../.claude/skills/ticket-creator/assets/known-labels.md).
Prefer reusing an existing label over coining a new one.

## What a ticket says

A ticket says what needs sorting and what we recommend. It does not
tell the story of how we found out.

The body holds, in this order:

1. **The need** — one or two lines.
2. **Background** — two or three lines of context.
3. **Recommendation** — what we think should happen.
4. **What needs fixing** — a short table when there is more than one item.
5. **Scope** — what is in and what is out.
6. **Acceptance criteria** — see below.

Leave out timelines, commit hashes, how the problem arose, who decided
what, "checked, not a mismatch" lists and long technical dumps. Keep
the evidence in `workareas/` and link to it from the ticket.

Bad (a history lesson):

> On 2 Oct we noticed blank saves behaved differently in plants. After
> checking commits `a1b2c3d` and `e4f5a6b` we traced it to the journey
> engine. We then checked 14 other pages, which were fine ...

Good:

> *We need to* decide what a blank save does on a mandatory page.
> *Recommendation:* treat it as submit, as plants does today.
> Full audit: [link]

Do not repeat Jira fields in the description. Type, summary, priority,
parent, labels and assignee already have their own fields.

## Acceptance criteria style

Acceptance criteria are **free-form bullets** — there is no project-wide
Gherkin mandate. Each bullet should be observable and verifiable:

- Good: `Page returns 400 with body "code-too-short" when commodity code <6 digits`
- Bad: `Validation works correctly`

Type-specific templates (`assets/templates/{bug,story,task}.md`) may
suggest a shape (e.g. *Given / When / Then* for some Stories) but do
not enforce one. Bullets are fine across all Types.

### Acceptance criteria hold open items only

Acceptance criteria list what is still to do or find out. Never list
an answered item marked DONE. Findings we already have go in the
description or tech notes as context.

Bad:

```
* Confirm the backend accepts the new field — DONE
* Decide the error message wording
```

Good:

```
(Tech notes) The backend already accepts the new field.
(AC) * The error message wording is agreed with design
```

A spike may carry long tech notes when we know more than the original
author did. That is context, not acceptance criteria.

### State the end state, not the change

Write each criterion as what is true once the work lands. Do not
quote text that is being removed or describe the old behaviour. A
criterion such as "no 'It can be up to 58 characters.' sentence" turns
into a test that asserts an absence, a constant named `REMOVED_*` and a
comment about history. Write instead what the page shows.

## Architecture and investigation tickets

An architecture or re-architecture ticket says what needs exploring.
It never prescribes the moves.

- **Background** holds the evidence about the current state: drift
  counts, missing docs, missing checks.
- **Scope** is a list of questions to answer.
- **Acceptance criteria** are an ADR or decision note, plus the
  follow-up tickets that carry out the decision.

Bad scope: "Move the plugin to `src/plugins` and switch Vite to webpack."

Good scope: "Where should shared plugins live, and which bundler should
the frontends share? Record the answer as an ADR."

Concrete steps go only in implementation tickets raised after the
investigation. A clean-up ticket for tooling may still name a component
we have already confirmed is obsolete.

## Editing someone else's ticket

Draft the change locally first, under
`workareas/ticket-planning/EUDPA-X/`, and iterate there before touching
Jira. Keep the author's user story, intent and recommendation. Correct
any premise we now know is wrong rather than preserving it.

## Jira wiki markup

Every workspace path that writes a description or comment
(`tim jira create`, `tools/jira/create-ticket.sh`,
`tools/jira/update-ticket.sh`, `tools/jira/add-comment.sh`) sends the
text raw to Jira's wiki renderer. Markdown does not work: `# Heading`
renders as a numbered list, `**bold**` keeps its asterisks, and
backticks print as backticks. Write wiki markup from the start.

| Want | Wiki markup |
|------|-------------|
| Heading | `h2. Title` (`h1.` to `h6.`) |
| Bold, italic | `*bold*`, `_italic_` |
| Monospace | `{{code}}` |
| Code block | `{code}…{code}` or `{noformat}…{noformat}` |
| Bullets | `* item`, nested `** item` |
| Numbered list | `# item` |
| Table | `\|\| header \|\| header \|\|` then `\| cell \| cell \|` |
| Link | `[label\|https://…]` |

Escape these, or Jira renders an error span or a broken table:

- A literal `[` or `]` in text or inside `{{…}}`: write `\[` and `\]`.
  `{{[Bash, Read]}}` breaks; `{{\[Bash, Read\]}}` does not.
- A literal `|` inside a table cell: write `\|`.
- Never start `{{…}}` with a hyphen: Jira can read `{{-x}}` as the
  start of strikethrough markup. Rephrase, or put the text in a
  `{noformat}` block.

Check every write. Run
`~/git/defra/trade-imports-workspace/tools/jira/ticket.sh EUDPA-X full > <file>`,
then search the file for `class="error"`. Any match is an unescaped
bracket.

## Workflow facts

### There are no sprints

The EUDPA board (13780) does not use Jira sprints; the sprint field is
empty on every ticket. Scope a window of work by date range, never by
sprint. Work done in a window:

```
project = EUDPA AND status changed TO Done DURING ("<from>", "<to + 1 day>")
```

The upper bound is exclusive, so add a day. Run it with
`~/git/defra/trade-imports-workspace/tools/jira/search.sh "<jql>"`.

### Statuses and transitions

See what a ticket offers before moving it:

```bash
tim jira transition EUDPA-X --list
```

There is no "In Dev" transition; "In Progress" is the nearest.

There is no "Won't Do" transition. `CLOSED` is not a substitute: every
`CLOSED` ticket on EUDPA carries resolution `Done`, so it reads as
delivered. `tools/jira/transition-ticket.sh` sends no fields, so it
cannot set a resolution. `tim jira transition EUDPA-X "<status>"
--resolution "<name>"` can, where the transition's screen accepts one.

To drop a ticket:

1. Post the reasoning as a comment with
   `~/git/defra/trade-imports-workspace/tools/jira/add-comment.sh EUDPA-X -f <file>`.
2. Set resolution "Won't Do" in the Jira UI, or through the Atlassian
   MCP's `transitionJiraIssue` with a `fields` payload where the
   organisation has authorised it.
3. If neither is available, leave the ticket in `To Do` with the
   comment. Never move it to `Done` or `CLOSED` to tidy the board.

### Assigning a ticket

`tools/jira/create-ticket.sh -a` assigns a new ticket to you.
`tim jira assign EUDPA-X <accountId|me>` assigns an existing ticket. It is
a dry run until you add `--confirm`.

### Links

For "Blocks", use `tim jira link EUDPA-X --blocks <key>` or
`tim jira link EUDPA-X --blocked-by <key>`. It reads the link back and
reports the direction Jira stored. `tools/jira/link-tickets.sh` also
works, and reads left to right:

```bash
~/git/defra/trade-imports-workspace/tools/jira/link-tickets.sh EUDPA-181 Blocks EUDPA-183
```

That makes EUDPA-181 block EUDPA-183.

If you call the REST API directly, the field names mislead. To record
"EUDPA-183 is blocked by EUDPA-181", send the **blocked** ticket as
`outwardIssue` and the **blocker** as `inwardIssue`:

```json
{
  "type": { "name": "Blocks" },
  "outwardIssue": { "key": "EUDPA-183" },
  "inwardIssue": { "key": "EUDPA-181" }
}
```

Check the direction after every link with
`~/git/defra/trade-imports-workspace/tools/jira/delete-link.sh EUDPA-183 --list`.
Remove a wrong link with `delete-link.sh --id <id>` and create it again.
Check other directional types (Duplicates, Causes) the same way.

## EUDPA project shape

EUDPA is a feature/capability project. Every ticket — Bug, Story, or
Task — sits under one of ~20 active feature epics on the EUDPA board
(board 13780). There is no dedicated tech-debt board or tech-debt
epic; tech-debt work is parented under whichever feature epic owns
the area, with a `technicalImprovement` label as the discriminator.

The set of active epics drifts as the project progresses. Do not
hard-code epic keys in skill prose — discover them at interview time
via the recipe in [Listing active epics](#listing-active-epics).

### Listing active epics

When the user needs help picking a parent epic, list the open epics
on the EUDPA board via `tools/jira/list-board-epics.sh`:

```bash
~/git/defra/trade-imports-workspace/tools/jira/list-board-epics.sh 13780
```

That prints `KEY — summary` lines for each open epic. Pass `json`
as a second arg for `[{key, summary, done}]`, or `--include-done`
to include closed epics.

Pair with `tools/jira/ticket.sh EUDPA-X summary` for verification
(Step 1.5 of the skill does this automatically).

## Field-default modifiers (opt-in)

When the user describes their Task as tech-debt, the skill defaults
two fields without re-asking:

| Field | Default | Why |
|-------|---------|-----|
| Label | `technicalImprovement` | Canonical EUDPA tech-debt label (8 backlog issues on 2026-05-26 used it). |
| Priority | `Lowest` | EUDPA convention for tech-debt — tracked but not urgent. |

Parent epic is still asked for normally — the modifier does not
suggest a specific key. The user picks the feature epic that owns
the area. Step 1.5 then verifies it.

The modifier is **opt-in only** — never auto-apply it. Confirm with
the user before applying.
