# Getting started: the ticketing track

**Objective:** No code required. Open a terminal, run claude, and describe what you need in plain English.

Companion deck: `00-getting-started.pptx`.

This is the entry point for BAs and engineers who want to create and refine
tickets with Claude. It assumes no terminal or git experience — an engineer
pairs with you once for setup, and after that it's three steps and a
conversation. You don't write code.

## Talk to an assistant that knows this team

You will not write code. You talk to an assistant that already knows this team's repositories, our Jira project and our conventions — and does the legwork for you.

This short track covers two everyday jobs: creating a well-formed ticket (Session 9) and checking a ticket is ready for refinement (Session 10). Everything you tell it, you say in plain English, the way you'd brief a colleague.

What you get:

- **Plain English** — describe the work; no Jira forms, no commands to memorise
- **It does the legwork** — reads Jira, the repos and the team's conventions for you
- **You stay in charge** — it drafts and advises; nothing changes until you approve

## The one-time setup — pair with an engineer

You do this once, on a screenshare. An engineer sits with you and sorts the plumbing — after that you just open a terminal and go.

- **Access & keys** — the engineer sets up your Jira and GitHub credentials and the environment variables the tools read
- **The workspace** — they confirm where the workspace lives on your machine — the folder you'll open the assistant in
- **The tool** — they install the claude command and check it runs, so step one below just works

## Three steps to a prompt

Once setup is done, this is the whole routine, every time:

1. **Open a terminal** — the Terminal app — your engineer will show you which one
2. **Go to the workspace** — `cd ~/git/defra/trade-imports-workspace`
3. **Start the assistant** — `claude`

Then press Enter and wait for the prompt. The cd line never changes — your engineer can save it as a shortcut.

## Talk to it like a colleague — with much more power

At the prompt, just say what you want. It can read Jira, the repositories and the conventions, so a one-line ask does a lot of work.

- `"create a ticket"` — starts Session 9 — it interviews you, drafts the ticket, and waits for your OK
- `"is EUDPA-1234 ready?"` — starts Session 10 — it reviews the ticket and gives you a verdict
- `"what can you do?"` — unsure where to start? ask — it'll tell you, in plain English

## A few ground rules

- **It drafts, you approve** — for a new ticket it writes a draft first; nothing reaches Jira until you say "create it"
- **Plain English is fine** — no special syntax — "make the acceptance criteria testable" is a perfectly good instruction
- **You can stop any time** — ask it to wait, change tack, or explain itself; you're never locked in
- **When in doubt, ask it** — "is this right?", "what would you change?" — treat it as a knowledgeable colleague

## Try it

Get an engineer to pair with you for the one-time setup, then open a terminal, cd to the workspace, and run claude. At the prompt, type "what can you do?" and read what comes back. That's it — you're driving the assistant.

Next: [Session 9 — the `ticket-creator` skill](09-ticket-creator.md).
