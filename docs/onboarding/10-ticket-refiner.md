# Session 10: the `ticket-refiner` skill

**Objective:** Check a ticket is ready for refinement before the team sees it — and get a READY / NEEDS WORK / SPIKE REQUIRED verdict with the reasons.

Companion deck: `10-ticket-refiner.pptx`.

## What it's for

Refinement sessions stall on tickets that aren't ready — vague acceptance criteria, unclear scope, no sense of which repos are touched, or work too big to estimate. Catching that ahead of time saves the whole team a meeting, but it means holding each ticket up against a standard and checking the code, every time.

ticket-refiner reads the ticket against the same conventions ticket-creator writes to, peeks at the affected repos, and gives a clear verdict — READY, NEEDS WORK or SPIKE REQUIRED — with the specific gaps and the questions to take into refinement. It's a second pair of eyes before the team spends theirs.

What you get:

- **One clear verdict** — READY, NEEDS WORK or SPIKE REQUIRED — with the reasons
- **Same standard as creation** — judged against the conventions ticket-creator writes to
- **Questions, ready to take in** — the specific gaps to close before the refinement session

## How you trigger it

You launch it in natural language: "is EUDPA-1234 ready?" · "refinement check EUDPA-1234" · "pre-refinement EUDPA-1234"

## Watch it run

1. **Point it at a ticket** — say "is EUDPA-1234 ready?" — it fetches the ticket, its comments and any linked Confluence design notes.
2. **Check the code** — it reads the affected repos to confirm the work is understood and the scope is real, not just on paper.
3. **Assess** — it judges description clarity, acceptance criteria, technical clarity, and whether the team could actually estimate it.
4. **Write the review** — it fills in a review with the findings, suggested improvements and questions for refinement.
5. **Verdict** — it stamps READY, NEEDS WORK or SPIKE REQUIRED — and spells out the next step for each.

## Reading the output

A written review and a recorded verdict.

- `review.md` — the findings, suggested improvements and questions for refinement
- `the verdict` — READY / NEEDS WORK / SPIKE REQUIRED, with the reason
- `the next step` — READY: plan it · NEEDS WORK: what to fix · SPIKE: the unknowns to investigate

## How you use it

- **Reach for it when** — a ticket is about to go into refinement and you want to catch gaps first
- **Where you decide** — you act on the verdict — tidy the ticket, book a spike, or take it to the team
- **How it fits** — follows ticket-creator (Session 9); a READY ticket goes to the ticket skill to be planned

## Live view

Don't memorise the surface — read the current version:

- `is EUDPA-X ready?` — how you start it
- `.claude/skills/ticket-refiner/SKILL.md` — what it does — straight from source
- `workareas/ticket-refinement/EUDPA-X/review.md` — where the review and verdict land

Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — it reads Jira and Confluence. An engineer sets this up with you once (see [Getting started](00-getting-started.md)).

## Try it

Pick a ticket heading into your next refinement and say "is EUDPA-XXXX ready?". Read the verdict and the questions-for-refinement list — then take those questions into the session, or back to whoever wrote the ticket.

That's the ticketing track — back to the [index](README.md).
