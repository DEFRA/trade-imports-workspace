# Session 1: the workspace, and running it locally

**Objective:** understand the agent-first development model, explain what
this workspace is and isn't, find your way around the repos and the
docs, know where to look for the current truth on anything, and bring the
full stack up on your own machine.

Companion deck: `01-workspace.pptx`.

## What it is

A local workspace that clones the trade-imports repos side by side, each
one an independent GitHub repo, and adds shared tooling and cross-repo
context on top.

The thing to hold onto: **this is not a monorepo**. Each repo keeps its
own git history, its own remotes, and its own CI. The workspace doesn't
own them — it sits alongside them and gives you one place to work across
all of them at once.

## How you work: agent-first

The development model here is **agent-first**. You don't usually drop into
a single repo and work by hand. You run `claude` in the workspace root,
and the harness wires itself up: the skills, the docs and best-practices,
and the cross-repo tools are all there out of the box. The skills then do
the cross-repo work for you — creating and refining tickets, planning and
implementing changes, reviewing PRs, running upgrades — driving the repos
through the shared `tools/` and the `tim` CLI.

That's the point of the workspace. Running `claude` here is meaningfully
more powerful than running it in a single vanilla repo. In a vanilla repo
you get a general assistant with one repo's context and none of the team's
encoded workflows. Here you get a project-aware agent: the team's
ticketing, review and upgrade skills, every repo in view, and the
best-practice guides baked in.

One caveat worth knowing early: if you `cd` into `repos/<service>` and run
the agent there, Claude Code sandboxes that sub-repo off the parent
`.claude/`, so you lose the workspace skills. So you generally work from
the root and let the skills reach into the repos — not the other way
round.

## Why it exists

The trade-imports estate spans a set of repos in two stacks, and it keeps
growing. Without something on top, every developer has to carry the whole
cross-repo workflow in their head.
The workspace turns that workflow into **harness engineering**: a single,
shared, tested place for the things the agent wires up when you run it
here.

It's the one place for:

- **Documentation** — architecture notes, ADRs, runbooks, a best-practice
  guide per stack, and a synced mirror of the team's Confluence pages, all
  under `docs/`.
- **Pipelines** — helpers for triggering and reading CI runs without
  leaving the workspace.
- **Dev scripts** — clone, update, lint and test every repo at once.
- **Docker** — one compose stack that stands up every service together,
  from published images or from your local source.
- **The agent harness** — skills and shared scripts that encode the team's
  workflows (ticketing, review, upgrades) as repeatable operations.

## The shape of the system

The repos all sit under `repos/`, but the useful way to hold them is by
role, not as a flat list. Most are real services you build; a few are
**stubs** that stand in for systems outside your control, so the whole
thing runs end-to-end on your machine.

- **What you build:** `frontend` (public web app), `admin` (internal admin
  UI), `backend` (API and business logic), `reference-data` (reference data
  service).
- **Stubs for the outside world:** `trade-imports-stub` (the upstream
  trade-imports services) and `defra-id-stub` (Defra ID sign-in / OIDC).
- **Edge and tests:** `dynamics-gateway` (forwards events to Azure Service
  Bus) and `tests` (the end-to-end suite that exercises all of it).

The full table of repos, roles and exact names lives in
[`CLAUDE.md`](../../CLAUDE.md) and is kept current there — no point copying
it here to rot.

Most of the time you don't touch these directly — the skills drive them
for you from the root. When you do need to (a manual `git` or `npm`
command, say), enter the directory with `cd repos/<name>`. Each repo has
its own `CLAUDE.md` with repo-specific context. Remember the caveat above:
running the agent from inside a sub-repo loses the workspace skills.

## Where things live

- `repos/` — the service repos.
- `docs/` — all documentation, including `docs/best-practices/` per stack
  and `docs/confluence/` (the synced mirror).
- `tools/` — shared shell scripts the skills call.
- `scripts/` — setup, update and the Docker stack runner.
- `docker/` — the full-stack compose setup.
- `tim/` — the workspace's Node CLI: every workspace command, with stable
  `--json` output for the skills.
- `.claude/skills/` — the agent skills (covered from Session 2 on).

## Live view

Don't memorise the command list — it changes. Read the current version
instead:

- **`tim --help`** — every `tim` command with a one-line description.
  `tim <command> --help` gives one command in full.
- **[`CLAUDE.md`](../../CLAUDE.md)** — the living index: repo map, `tim`
  commands, skills and tools, kept current as part of normal work.
- Ask Claude **"read CLAUDE.md and give me the repo map and the main `tim`
  commands"** for a guided version of the same.

## Running it locally

The day-one test: can you actually build and run all of this? You drive
the stack with `tim docker`, which runs the scripts under `scripts/stack/`
for you.

First-time setup, run once:

- `tim workspace setup` — clone every repo into `repos/`. Idempotent, so
  it's safe to re-run.
- `tim workspace install` — install dependencies in every repo (`npm ci`
  for Node, `mvn install` for Java).

Then the run loop:

- `tim docker dev` — build and run every service together from your local
  `repos/` (hot-reload for Node, volume mount for Java). Use `tim docker
  up` to run from published images instead.
- `tim docker logs` — follow the frontend, admin and backend logs, or name
  the services you want. `Ctrl-C` stops watching, not the stack.
- `tim docker bounce-backend` — recreate the backend to pick up edited
  Java source. `tim docker down` tears the stack down and wipes volumes
  for a clean slate.

Finally, exercise the running stack with the end-to-end suite:

```
cd repos/trade-imports-ins-tests
npm run test:docker-compose
```

That's the whole inner loop — set up once, bring the stack up from source,
watch it, change something, run the tests against it. The flags (run from a
branch's images, exclude a service to run it natively, limit to a profile)
live in `tim docker dev --help` and `docker/stack/AGENTS.md`.

## Try it

Before the next session, get the stack running end to end:

1. Clone the workspace to the canonical location
   (`~/git/defra/trade-imports-workspace`) — the tooling assumes
   this path. If yours is elsewhere, symlink it; see
   [`agent-onboarding.md`](../agent-onboarding.md). Then run `tim workspace
   setup` and `tim workspace install`.
2. Bring the stack up from source with `tim docker dev`, and watch it come
   up with `tim docker logs`.
3. Run the E2E suite against it (`npm run test:docker-compose` in the tests
   repo), and have a skim of `tim --help` and `CLAUDE.md` while it runs.

Next: [Session 2 — the `ticket` skill](02-ticket.md).
