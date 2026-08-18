# Session 9: the `ticket-creator` skill

**Objective:** Create a well-formed EUDPA Jira ticket from a plain-English conversation — drafted for you to approve before anything lands in Jira.

Companion deck: `09-ticket-creator.pptx`.

## What it's for

A ticket that's ready to pick up needs a clear summary, the reason it's needed, testable acceptance criteria, the right type and priority, a parent epic, and the team's labels and house style. Getting all of that right from a blank Jira form is fiddly and easy to do unevenly — especially if Jira isn't where you spend your day.

ticket-creator turns a short back-and-forth in plain English into a drafted ticket that already follows the team's conventions. It asks one question at a time, writes the draft to a file you can read and refine, and only creates the ticket in Jira once you say so. You stay the author; it removes the formatting and the remembering.

What you get:

- **Plain-English interview** — it asks one question at a time — no Jira form to wrestle
- **Conventions baked in** — type, priority, epic, labels and AC style applied for you
- **Nothing lands until you approve** — it drafts to a file first; creating in Jira is the last step

## How you trigger it

You launch it in natural language: "create a ticket" · "raise a ticket" · "file a bug" · "log a story"

## Watch it run

1. **Start** — say "create a ticket" — it pulls the current EUDPA epics and capability codes so it can slot your work into the right place.
2. **Answer a few questions** — one at a time: is this a bug, story or task? a one-line summary, why it's needed, the acceptance criteria, and which epic it belongs to.
3. **Read the draft** — it writes the full ticket to a draft file and shows you — summary, a description in the team's house style, AC, type, priority and labels.
4. **Refine in plain English** — tell it what to change — "make the AC testable", "drop the priority" — and it edits the draft in place. Nothing is in Jira yet.
5. **Create it** — say "create it" and it raises the ticket in Jira, then hands you back the key and the link.

## Reading the output

A draft you can iterate on, then a real Jira ticket.

- `draft.md` — the full ticket as text — you review and refine this before it's created
- `the conventions` — type, priority, epic, labels and AC style, applied to the draft for you
- `EUDPA-XXXXX` — the created Jira ticket and its link, once you say "create it"

## How you use it

- **Reach for it when** — you need to raise a new ticket and want it refinement-ready from the start
- **Where you decide** — you answer the questions and approve the draft — it never creates without your go-ahead
- **How it fits** — hand the new ticket to ticket-refiner (Session 10) to check it's ready for the team

## Live view

Don't memorise the surface — read the current version:

- `create a ticket` — how you start — just say it in plain English
- `.claude/skills/ticket-creator/SKILL.md` — what it does — straight from source
- `workareas/ticket-creation/<slug>/draft.md` — where your draft lives while you refine it

Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — it reads and writes Jira. An engineer sets this up with you once (see [Getting started](00-getting-started.md)).

## Try it

Think of a small piece of work you'd raise anyway. Say "create a ticket", answer the questions, and read the draft it writes — then stop there. Nothing reaches Jira until you say "create it", so it's a safe first run.

Next: [Session 10 — the `ticket-refiner` skill](10-ticket-refiner.md).
