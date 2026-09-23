# Requirements pipeline: quick start

Two steps: **distil** requirements into a backlog, then **build** it. First run `/config` and raise **Dynamic workflow size**.

## 1. Distil

Name the goal and the sources. The skill works out which repos to build in and which source wins.

> Distil requirements for high-risk plants origin and commodity. Goal: an importer gives where the goods come from and what they are. Sources: Confluence page 6518997274, and the CHED-PP trace set limited to the country-of-origin and commodity pages.

Read `workareas/shared/<programme>/report.md`. It starts with the repos and precedence the skill chose, then the questions for you, each with a default. To answer them:

> Re-distil hrp-origin-and-commodity. Q1: use the nine statutory categories.

## 2. Build

Every run goes ticket → branch → build → PR → CI → merge → ticket done — the
loop merges each increment itself once it is green, reviewed, adversarially
verified and judged:

> Build every increment from shared/hrp-origin-and-commodity, epic EUDPA-12345.

Every ticket the loop raises hangs off that epic, so a run needs one. If the
programme has no epic yet, raise it first — the `ticket-creator` skill, or
`tools/jira`.

Add "with Codex" to have Codex build it. To see the plan without building, say "dry-run the plan for inc-001".
To put a human approval gate back in front of every merge, say "... and require an approving review on every PR" (`requireApproval: true`).

## When it stops

It prints a handover prompt. Paste that into a new session to carry on. It only stops for a genuine failure — CI that stayed red, a red base branch, a half-merged increment — or for an increment carrying a designed review gate. `awaiting-approval` and `changes-requested` only happen if you asked for the human approval gate; otherwise the loop never waits on a person.
