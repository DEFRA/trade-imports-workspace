# Session 3: the `review` skill

**Objective:** Review a ticket's PRs across every repo and language, and triage the findings to merge-ready.

Companion deck: `03-review.pptx`.

## What it's for

A single ticket can land as several PRs — a Java backend change, a Node frontend tweak, an update to the tests repo — and a good review has to hold all of them at once: correctness, security, and whether the tests actually cover the change. Doing that by hand, across repos and two languages, is slow and uneven.

review reads every changed file in parallel, checks the repos stay consistent with each other, and records each finding so nothing slips between "looks fine" and merge. When more commits land it re-reviews only what changed and carries your earlier decisions forward.

What you get:

- **Nothing unread** — every changed file reviewed, behind a hard 100% coverage gate
- **One verdict, all repos** — correctness, security and test gaps in a single index
- **Decisions that stick** — findings tracked and carried across re-reviews

## How you trigger it

You launch it in natural language: "review EUDPA-1234" · "re-review" · "walk review EUDPA-1234" · "implement review"

## Watch it run

1. **Kick off** — "review EUDPA-1234" — it works out fresh vs refresh, clones the repos and sets up the review workspace.
2. **Fan out** — a per-file reviewer runs across every changed file in parallel; it won't proceed until 100% of files are covered.
3. **Consistency & write-up** — it runs a per-repo consistency check, then writes a review doc per repo plus a top-level index — verdict, acceptance-criteria check and a risk matrix.
4. **Triage** — "walk review EUDPA-1234" steps you through findings one at a time: Fix, Won't-fix or Discuss.
5. **Apply or hand off** — "implement review" applies the queued fixes; on someone else's PR it can push a branch and post the findings as inline comments.

## Reading the output

All under workareas/reviews/EUDPA-X/.

- `review-index.md` — start here — verdict (PASS / NOTES / CONCERNS / FAIL), AC check, risk matrix
- `review.<repo>.md` — per repo — file-analysis table, coverage, and the Items findings table
- `items.<repo>.json` — the canonical state behind the table — don't hand-edit; it's regenerated

## How you use it

- **Reach for it when** — a ticket's PRs are up and you want a thorough pass before approving
- **Where you decide** — you set each finding's disposition and own the merge — it advises, you approve
- **How it fits** — pairs with code-style (the JS guide) and understanding-check (author grasp)

## Live view

Don't memorise the surface — read the current version:

- `review · re-review · walk review` — fresh pass, refresh, or interactive triage
- `.claude/skills/review/SKILL.md` — the trigger table and scripts cheat-sheet
- `tim review items list EUDPA-X --json` — the live findings mid-review

## Try it

Pick a ticket whose PR you have already merged, run "review EUDPA-XXXX", open review-index.md, then "walk review EUDPA-XXXX" and rattle through a few findings with F / W / D to feel the triage loop.

Next: [Session 4 — the `code-style` skill](04-code-style.md).
