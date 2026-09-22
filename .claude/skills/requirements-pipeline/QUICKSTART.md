# Requirements pipeline: quick start

Two steps: **distil** requirements into a backlog, then **build** it. First run `/config` and raise **Dynamic workflow size**.

## 1. Distil

Name the goal and the sources. The skill works out which repos to build in and which source wins.

> Distil requirements for high-risk plants origin and commodity. Goal: an importer gives where the goods come from and what they are. Sources: Confluence page 6518997274, and the CHED-PP trace set limited to the country-of-origin and commodity pages.

Read `workareas/shared/<programme>/report.md`. It starts with the repos and precedence the skill chose, then the questions for you, each with a default. To answer them:

> Re-distil hrp-origin-and-commodity. Q1: use the nine statutory categories.

## 2. Build

To try it on a scratch branch, with no tickets or PRs:

> Build inc-001 from shared/hrp-origin-and-commodity, lifecycle local.

To build it for real, with a ticket, PRs, CI and merge:

> Build the next 3 increments from shared/hrp-origin-and-commodity, lifecycle full, epic EUDPA-12345.

Add "with Codex" to have Codex build it. To see the plan without building, say "dry-run the plan for inc-001".

## When it stops

It prints a handover prompt. Paste that into a new session to carry on. `awaiting-approval` means the PRs are green and need someone else's review.
