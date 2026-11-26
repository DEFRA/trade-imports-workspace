# Read: turn one fetched ticket into an investigation, an intake record and a combined backlog

You read one ticket in full, and the code it touches. You write three files beside each other in the workarea:
`investigation.md`, `intake.json` and `backlog.json`. You write nothing else. Your prompt names the files, the
ticket file, the fetch record and the check commands.

## Read first

- The ticket file in full, and every saved attachment beside it.
- `workareas/ticket-refinement/<KEY>/.refinement-meta.json` when it exists: an earlier readiness verdict.
- Every `ruling` source in `sources.json`.
- The repos' docs, rulings ledgers and the `openspec/` behaviour spec for the area, then the code by targeted read.
- `.claude/skills/requirements-pipeline/references/backlog.schema.json`, `intake.schema.json` and `SHAPE.md`
  ("Ticket backlogs" especially).
- `.claude/skills/ticket-refiner/SKILL.md` "Verdict Guidelines" and `docs/best-practices/jira/ticket-conventions.md`.

## The readiness verdict

Judge the ticket by the refinement check's own rules: `READY`, `NEEDS WORK` or `SPIKE REQUIRED`, with one plain
sentence for each reason. Record it in `intake.json` under `readiness`.

## The statements

Number everything the ticket says that the backlog must account for. Each is one statement with an id, a kind and
the ticket's own words:

- each acceptance criterion, keeping the ticket's own numbering (`AC1`);
- each line of scope (`SCOPE1`), each line of what is out of scope (`OUT1`), each background fact (`BG1`).

Mark each statement covered by the ids of the rows that build it, or, for an acceptance criterion no row builds,
give `notBuilt` with the reason.

## The investigation

Write `investigation.md` with these sections, in this order: summary, what exists and where (file and line), the
delta, evidence, proposed change, acceptance criteria, tests to add, related but not the cause.

## The repos

Work out the repos as DISTIL intake does (the CLAUDE.md repo map and `docs/repos/`). The tests repo is always in.
Put them in the backlog's `repos`, with the reason each is in under `repos` in `intake.json`. Copy `ticket` and
`branch` into the backlog envelope from the fetch record.

## The rows

Write rows to SHAPE.md: a requirement, never a recipe; a full-stack slice; criteria in the user's words. Each
criterion ends with a bracket: `(ticket:<KEY> AC1)`, or a `repo:` or `ruling:` source.

**Combine before handing on.** One row is the default. A further row stands only with a note giving one reason from
`workflow/distil/briefs/combine-review.md`: an open question the other row does not carry, a different code area, or
too much for one plan. A layer split is never a reason. Run `tim backlog combine-candidates` and merge what it lists
unless one of those reasons holds.

## The questions

Ask as few as you can. A question the ticket, a rulings ledger or a ruling source settles is not asked. Each question
has its readings, a default that gets built if nobody answers, and whether it holds the launch. Only these hold it:
security, access, data integrity, a contradiction with a signed-off scenario, or a contradiction with a
rulings-ledger entry. Name the cause. Write in plain words, with headlines and no ids.

## Escalate

Record an escalation in `intake.json` and write no row to build when any of these holds:

- the verdict is `SPIKE REQUIRED`;
- the verdict is `NEEDS WORK` and the gaps need people outside the session;
- the ticket has more than 3 questions;
- more than 4 rows are still to build after combining;
- the ticket points at another requirement source with its own criteria;
- an open blocking link stops anything shipping without it.

## On a rerun

A backlog and a record already exist. Rewrite only rows still to build (`todo` or `blocked`). Keep every row id, and
never add a row that reuses one. A ruling's answer replaces its question.

## Fixing

When your prompt gives you verdicts from the refuting agent and problems from the checks, apply each verdict that is
not `holds` or `stands` and fix each problem, or answer it with why you did not. Give one answer for each verdict. Fix once.

## Checks

Run `tim backlog check` until it passes. Write only the three files.
