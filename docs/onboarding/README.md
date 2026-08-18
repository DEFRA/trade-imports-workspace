# Onboarding

This folder is the onboarding programme for new developers joining the
DEFRA trade-imports workspace. It exists in two forms that share one
structure:

- **Live sessions** — screenshares with a facilitator, recorded so people
  who join later can watch them back.
- **This text version** — a fallback for when the recordings are not to
  hand, or when you would rather read than watch.

Each session below has its own page in this folder. The pages mirror the
session running order, so you can follow along live or work through them
on your own.

## Who this is for

Developers joining the team who need to get productive across the service
repos, the local stack, and the day-to-day tooling. It assumes you can
read Node and Java, but not that you know this workspace, the DEFRA
trade-imports domain, or the agent harness that sits on top.

The development model is **agent-first**: you run `claude` in the workspace
root and the harness — skills, docs, cross-repo tools — wires itself up.
Most of the programme is about driving that harness well, which is why the
later sessions are usage-focused tours of the skills.

## How we keep this from going stale

The mechanics of this workspace change often — skills get added, Make
targets get renamed. If these pages restated all of that, they would be
wrong within a month.

So they don't. Wherever a page would otherwise list "this command takes
these arguments and prints this", it instead tells you the **one prompt or
command that shows you the current truth**. The page teaches you where to
look; the workspace itself stays the source of truth.

The three live views you will use most:

- `make help` — every Make target with a one-line description, generated
  from the Makefile itself. The Makefile is the working command surface
  for the workspace today.
- The root [`CLAUDE.md`](../../CLAUDE.md) — the living index: repo map,
  Make targets, skill table, and tools table, all kept current as part of
  normal work.
- Ask Claude **"read the SKILL.md for `<skill>` and tell me what it does
  and how to drive it"** — the SKILL.md is what Claude actually executes,
  so it cannot drift from reality.

A note on `tim`: it's an experimental Node CLI intended to eventually
replace the Makefile, with stable `--json` output for the skills to lean
on. It isn't fully wired up or in routine use yet, so treat the Makefile
as the source of truth for now. If `tim` proves itself, it takes over and
these pages move with it.

## Session map

Session 1 is the foundation: what the workspace is, how you work in it, and
getting the full stack running on your machine. From Session 2 on it's one
skill per session — a demo of that skill, pitched by its name, so you learn
to drive the harness one tool at a time.

| # | Session (skill) | You will be able to | Page |
|---|-----------------|---------------------|------|
| 1 | The workspace, and running it locally | Understand the agent-first model, navigate the repos and docs, find the source of truth for anything, and bring the full stack up from source | [`01-workspace.md`](01-workspace.md) |
| 2 | `ticket` | Plan, implement and refactor an existing EUDPA ticket across the affected repos | [`02-ticket.md`](02-ticket.md) |
| 2b | `ticket` (deep dive) | Watch the skill take one real ticket (EUDPA-213) end to end — a transcript-driven walkthrough with terminal snippets | [`02b-ticket-walkthrough.md`](02b-ticket-walkthrough.md) |
| 3 | `review` | Run a cross-repo, cross-language correctness, security and test review on a PR | [`03-review.md`](03-review.md) |
| 4 | `code-style` | Review and remediate JavaScript against the team's style guide, rule by rule | [`04-code-style.md`](04-code-style.md) |
| 5 | `understanding-check` | Run a pre-merge check that the author understands an AI-assisted PR | [`05-understanding-check.md`](05-understanding-check.md) |
| 6 | `npm-upgrade` | Drive the three-phase npm dependency upgrade workflow | [`06-npm-upgrade.md`](06-npm-upgrade.md) |
| 7 | `govuk-upgrade` | Run a per-version, CHANGELOG-driven `govuk-frontend` upgrade | [`07-govuk-upgrade.md`](07-govuk-upgrade.md) |
| 8 | `skill-creator` | Scaffold a new workspace skill — and read how the existing ones are built | [`08-skill-creator.md`](08-skill-creator.md) |

Session 1 is essential for everyone. Sessions 2 to 8 are usage-focused
skill demos — the goal is to drive each skill confidently, not to learn its
internals. `skill-creator` (Session 8) lifts the lid for anyone who will
maintain or add to the harness.

### Ticketing track (for BAs and engineers)

Sessions 1 to 8 assume you write code. The ticketing track does not. It is
a short, self-contained path for anyone who creates or refines EUDPA tickets
— business analysts as well as engineers — and it starts from zero: no
terminal or git experience assumed. An engineer pairs with you once to set
up keys and environment variables; after that it is a terminal, three
commands, and a plain-English conversation.

| # | Session (skill) | You will be able to | Page |
|---|-----------------|---------------------|------|
| 0 | Getting started | Open a terminal, run `claude` in the workspace, and drive it by talking to it like a colleague — no code | [`00-getting-started.md`](00-getting-started.md) |
| 9 | `ticket-creator` | Create a well-formed EUDPA Jira ticket from a plain-English interview, approving a draft before anything lands in Jira | [`09-ticket-creator.md`](09-ticket-creator.md) |
| 10 | `ticket-refiner` | Check a ticket is ready for refinement and get a READY / NEEDS WORK / SPIKE REQUIRED verdict with the reasons | [`10-ticket-refiner.md`](10-ticket-refiner.md) |

Do these three in order — Session 0 first — and you can create and refine
tickets with Claude without touching the rest of the programme.

## Session 1: the workspace, and running it locally

Two headlines. First, this is **not a monorepo**: it is a local workspace
that clones the trade-imports repos side by side and adds shared tooling
and cross-repo context on top, while each repo keeps its own git history,
remotes, and CI.

Second, and more important, the way you work here is **agent-first**. You
run `claude` in the workspace root and the harness wires itself up — the
skills, the docs and best-practices, and the cross-repo tools are all
there. The skills drive the repos for you, rather than you working each
one by hand. Running the agent here is meaningfully more powerful than
running it in a single vanilla repo, where you'd get a general assistant
with one repo's context and none of the team's encoded workflows.

That power is **harness engineering**: rather than every developer holding
the cross-repo workflow in their head, the workspace makes it a single
place that the agent wires up for:

- **Documentation** — architecture notes, ADRs, runbooks, best-practice
  guides per stack, and a synced mirror of the team's Confluence pages,
  all under `docs/`.
- **Pipelines** — helpers for triggering and reading GitHub Actions runs,
  so CI is drivable without leaving the workspace.
- **Dev scripts** — the Makefile and `scripts/` that clone, update, lint
  and test all repos at once.
- **Docker** — one compose stack under `docker/` that stands up every
  service together, from published images or local source.
- **The agent harness** — the skills and `tools/` that encode the team's
  workflows (ticketing, review, upgrades) as repeatable, tested
  operations.

The session is partly a guided tour and partly hands-on. The tour covers
what the workspace is and how it's laid out; the reference for that is
`CLAUDE.md`, and `make help` is how you read the current command surface.
The hands-on half is the day-one "can I actually build and run this" loop:
`make setup` and `make install` once, then `scripts/stack/run-stack.sh
--dev` to build and run every service from your local `repos/`, tail
the logs to watch them, and the E2E suite in the tests repo to exercise the
running stack. The stack is driven by the scripts under `scripts/stack/`
(the `make docker-*` targets are thin wrappers); the flags and profiles
come from `scripts/stack/run-stack.sh --help`, not from the slides.

## The agent harness

Each of these sessions follows the same beat for every skill: **what it's
for → trigger it → watch it run → try it yourself**. They stay
usage-focused. None of them restate a skill's arguments, because
`make help` and the skill's own SKILL.md always have the current version.

### Session 2: `ticket`

The core engineering loop. Take an existing EUDPA ticket and use the
`ticket` skill to plan it, implement it across the affected repos, and
refactor. The session runs a single real ticket end to end — plan, then
implement, then tidy up — and shows how the skill leans on the shared
`tools/` and the per-repo best-practice guides as it works.

Raising and refining tickets (the `ticket-creator` and `ticket-refiner`
skills) are deliberately out of scope here — that's refinement and
management work, not the engineer's delivery day-to-day. They have their own
self-contained [ticketing track](#ticketing-track-for-bas-and-engineers)
(Sessions 0, 9 and 10), pitched for BAs and engineers alike. This session is
only about delivering a ticket that already exists.

### Session 3: `review`

A cross-repo, cross-language code review on a PR — correctness, security
and test coverage. The session triggers a review on a real PR, watches the
per-file fan-out run, and shows how to read the findings and dispositions
that come back.

### Session 4: `code-style`

The JavaScript style pass: `code-style` reviews a PR's `.js` against the
team's style guide and remediates it rule by rule. The session shows a run
on a real PR, how findings map to the rule guide, and how the fix step
works.

### Session 5: `understanding-check`

A coaching tool, not a merge gate. `understanding-check` looks at an
AI-assisted PR and generates evidence-anchored questions to check the
author actually understands the change, then scores the answers. The
session runs it on a real PR and reads the verdict and the paste-ready PR
comment it produces.

### Session 6: `npm-upgrade`

A three-phase workflow that discovers outdated npm packages, classifies
each as automatic or manual, runs the automatic ones, then walks the manual
ones with you. The session follows the shape of the workflow and where you,
the human, step in — not the per-package mechanics.

### Session 7: `govuk-upgrade`

A per-version, CHANGELOG-driven upgrade of `govuk-frontend`: the skill
plans each version's changes from its CHANGELOG, then applies them version
by version. The session shows one upgrade run and how the per-version plans
drive it.

### Session 8: `skill-creator`

For anyone who will maintain or grow the harness. `skill-creator` scaffolds
a new workspace skill end to end, and the session uses it as the way in to
how a skill is actually built — the SKILL.md entry point, the `references/`
worker prose, and the shared `tools/` scripts it calls. Usage-focused
still: enough internals to drive the skill and read an existing one, not a
deep dive into harness architecture.

The conventions every skill follows live in
[`agent-skills.md`](../agent-skills.md); the auth and credentials the
tools need live in [`agent-onboarding.md`](../agent-onboarding.md).

## Slide decks

Every session has a companion deck. The decks share one theme so the
recorded set looks and feels like a single programme. The theme and the
per-slide structure are specified in [`slide-theme.md`](slide-theme.md) so
that decks built later stay consistent with the ones built first.

Session 2 also has a deep-dive companion, `02b-ticket-walkthrough.pptx` — a
transcript-driven walkthrough of the `ticket` skill on one real ticket,
with terminal-snippet slides lifted from the captured logs under
`workareas/ticket-skill-demo/`. It keeps the programme theme but adds a
dark terminal card for showing prompts, commands, log output and diffs
verbatim.

## Build status and next steps

This page and the theme spec are the plan. The remaining build, in order:

1. Sign off the session map and the deck theme (this page +
   `slide-theme.md`).
2. Build Session 1 as the template — deck plus text page — to lock the
   look and tone before mass-producing. **Done.**
3. Build the remaining skill sessions (2 to 8) to match.

Owner and dates to be filled in once the plan is agreed.
