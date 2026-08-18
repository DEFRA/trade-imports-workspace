# Session 2: the `ticket` skill

**Objective:** Take one existing EUDPA ticket through plan, implement and refactor — in the workspace.

Companion deck: `02-ticket.pptx`.

## What it's for

A ticket rarely lives in one repo. Before you write a line you're piecing together its Jira description and comments, any Confluence design notes, which of the eight repos and which stacks it touches, and the conventions each repo expects. That context-gathering is slow, easy to get wrong, and different every time.

The ticket skill does that legwork and turns it into a written plan you can challenge before any code exists — then implements against the plan, repo by repo, keeping the tests green the whole way. You stay the decision-maker; it removes the grind around the decisions.

What you get:

- **Context, gathered** — Jira, comments, Confluence and the right best-practices, pulled in for you
- **A plan you can argue with** — decisions surfaced as text before code, not buried in a diff
- **Green all the way** — baseline checked, tests re-run each step, CI driven to green

## How you trigger it

You launch it in natural language: "plan EUDPA-1234" · "implement EUDPA-1234" · "refactor" / "tidy up"

## Watch it run

1. **Plan** — "plan EUDPA-1234" — it reads the ticket, comments and Confluence refs, works out the affected repos and their stacks, and bakes in the matching best-practice guides.
2. **Read & challenge** — plan.md lays out a summary, a repos/stack table, numbered steps, the testing strategy and risks — with [ASSUMPTION] and [NEEDS VERIFICATION] flags for you to settle.
3. **Implement** — "implement EUDPA-1234" — it confirms the baseline tests pass, cuts a feature branch per repo, then works the plan step by step: smallest change, re-run tests, add tests.
4. **Stay in control** — it follows the plan you approved rather than a free hand, so the change matches what you agreed and nothing wanders off-scope.
5. **Verify & hand off** — it triggers CI, waits for green, and reports the repos, files and tests it touched — ready for you to open the PR.

## Reading the output

Everything lands under workareas/ticket-planning/EUDPA-X/ (gitignored).

- `plan.md` — the artifact you actually review and amend — steps, risks, assumptions
- `ticket.md` — a readable dump of the Jira metadata, description and comments
- `best-practices/<repo>.md` — the per-repo guidance it cites while coding
- `feature/EUDPA-X-<slug>` — a branch per repo, with a green CI run

## How you use it

- **Reach for it when** — you're picking up a refined EUDPA ticket and about to start the work
- **Where you decide** — you resolve the plan's open questions, and review the diff and PR — it never merges for you
- **How it fits** — it hands off to review and code-style once the PR is up

## Live view

Don't memorise the surface — read the current version:

- `plan / implement / refactor EUDPA-X` — how you launch each phase
- `.claude/skills/ticket/SKILL.md` — what it does — straight from source
- `workareas/ticket-planning/EUDPA-X/` — where the plan and context land

Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — the skill fetches Jira and GitHub.

## Try it

Pick a real ticket you know and run just the plan phase: "plan EUDPA-XXXX". No code is written, so it is a safe first run. Open plan.md and read the steps, the risks table and the [NEEDS VERIFICATION] markers.

Next: [Session 3 — the `review` skill](03-review.md).
