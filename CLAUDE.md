# trade-imports workspace

This is a local workspace aggregating the independent GitHub repos of the DEFRA trade imports services. It is **not** a monorepo — each repo has its own git history, remotes, and CI. This folder provides shared tooling and cross-repo context.

The load-bearing rules that agents must always honour are kept **inline** below. The volatile reference catalogues (make targets, common workflows, the `tools/` index, worker references, the workareas map) live as topic files under [`docs/reference/`](docs/reference/) — see the [Reference catalogues](#reference-catalogues) pointer near the foot of this file.

## Load-bearing rules

### 1. Canonical clone location

Clone the workspace to `~/git/defra/trade-imports-workspace` — see [`docs/agent-onboarding.md`](docs/agent-onboarding.md#1-canonical-clone-location). Scripts under `tools/` hardcode that path, so a checkout under any other name will not work. No env var to set, and no symlink to maintain: the canonical path is the checkout.

### 2. Branch naming + cross-repo branch parity

- Branch naming: `feat/EUDPA-XXXX[-slug]` or `chore/EUDPA-XXXX[-slug]` (also `fix/EUDPA-XXXX[-slug]`).
- Cross-repo branches must share the **same name** across every affected repo — the workspace stack's `--branch` flag probes each repo for a matching branch-tagged image and falls back to `:latest` per service, so mismatched names break the linked-branch pickup.
- PRs: raise against `main` in the relevant repo.
- Cross-repo changes: coordinate via the tests repo.

### 3. Banned actions

- **Never edit `docker/stack/.staged/`** — it is generated on every stack start; edits are silently overwritten.
- **Never commit `workareas/`** — it is gitignored runtime cache. The sole exception is `workareas/shared/` (tracked via a `.gitignore` negation for review handoff).
- **Never let cross-repo branches drift** — same branch name across every affected repo (see rule 2).
- **Before committing code changes:** run `sonar analyze --staged` and fix any BLOCKER or CRITICAL findings first (see SonarCloud integration below).

### 4. Skill routing index

Skills live at `.claude/skills/<name>/SKILL.md` and are auto-discovered. Route by trigger phrase:

| Skill | Triggers | Purpose |
|---|---|---|
| `ticket-creator` | "create ticket", "raise ticket", "new ticket", "file a bug", "flesh out ticket" | Create a new Jira ticket end-to-end (Bug/Story/Task). |
| `ticket-refiner` | "is ticket ready", "pre-refinement", "refinement check" | Assess whether a ticket is READY / NEEDS WORK / SPIKE REQUIRED. |
| `ticket` | "plan EUDPA-", "implement EUDPA-", "refactor", "tidy up" | Plan / implement / refactor an existing ticket. |
| `review` | "review EUDPA-", "re-review", "walk review", "implement review" | Code review across all languages and repos (correctness, security, tests). |
| `code-style` | "style review EUDPA-", "walk style EUDPA-", "triage style", "fix style EUDPA-", "lint review" | JS code-style review + remediation against the 17-rule guide. |
| `npm-upgrade` | "upgrade npm deps", "upgrade dependencies", "walk upgrade EUDPA-X", "implement upgrade EUDPA-X" | Three-phase non-govuk-frontend npm upgrade workflow + interactive manual-side walker. |
| `govuk-upgrade` | "upgrade govuk-frontend", "govuk upgrade", "walk govuk EUDPA-X", "implement govuk EUDPA-X" | Per-version govuk-frontend upgrade with CHANGELOG-driven plans (JSON-state, dispatcher, walker). |
| `skill-creator` | "scaffold skill `<name>`", "skill-create `<name>`", "new workspace skill `<name>`", "audit skill `<name>`", "audit skills" | Meta-skill — CREATE scaffolds a new workspace skill; AUDIT walks an existing skill against the 8-pattern checklist. |
| `understanding-check` | "interview EUDPA-X", "check understanding EUDPA-X", "understanding-check EUDPA-X" | Pre-merge author-understanding check on an AI-assisted PR. |
| `frontend-change` | "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend" | One recipe-verbatim increment on a frontend repo (today `trade-imports-animals-frontend`, src/server/app): recipes for additive elements, guard-railed maintenance for obligations and journey flow, verification ladder throughout. |

| `parity` | "compare these two things and give me a report", "compare X against Y", "set up a new comparison", "resume the comparison", "regenerate the parity report", "rebuild the findings report", "rule the parity decisions", "walk parity EUDPA-", "migrate parity EUDPA-", "recapture the parity corpus" | Build, check and adjudicate a findings report for a comparison corpus. COMPARE runs the whole pipeline from an interview to a rendered report, resumable at every phase. Renders a findings backlog as a decision surface with the code and the pictures in reach; migrates finding prose into structured slots under ten invariants. Hands `status`/`gate`/`dependsOn` to `journey-builder`. |

| `build-orchestrator` | "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build" | Drive an increment backlog through `increment-build-loop.js`, one increment per invocation, from the main session. Derives the next buildable increment, runs the loop, checks it landed, repeats until a set count or a stop condition — then prints a copy-paste handover prompt. Switches executor between Claude and Codex between increments. |

Per-skill fan-out worker personas are catalogued in [`docs/reference/worker-references.md`](docs/reference/worker-references.md).

## Repo map

| Folder | GitHub repo | Role | Stack |
|--------|------------|------|-------|
| `repos/trade-imports-animals-frontend` | DEFRA/trade-imports-animals-frontend | User-facing web application | Node.js |
| `repos/trade-imports-animals-backend` | DEFRA/trade-imports-animals-backend | API / business logic service | Java / Spring Boot |
| `repos/trade-imports-animals-tests` | DEFRA/trade-imports-animals-tests | End-to-end / integration test suite | Node.js |
| `repos/trade-imports-animals-admin` | DEFRA/trade-imports-animals-admin | Internal admin interface | Node.js |
| `repos/trade-imports-stub` | DEFRA/trade-imports-stub | Stub of upstream trade-imports services | Java / Spring Boot |
| `repos/trade-imports-reference-data` | DEFRA/trade-imports-reference-data | Reference data service | Java / Spring Boot |
| `repos/trade-imports-defra-id-stub` | DEFRA/trade-imports-defra-id-stub | Stub of the Defra ID (OIDC) sign-in service | Node.js |
| `repos/trade-imports-dynamics-gateway` | DEFRA/trade-imports-dynamics-gateway | Centralised gateway forwarding events to Azure Service Bus (ADR-EUDP-001 Option B) | Java / Spring Boot |
| `repos/trade-imports-address-book` | DEFRA/trade-imports-address-book | Org-scoped address book API (system of record for Standard Address Block records) | Java / Spring Boot |
| `repos/trade-imports-ins-frontend` | DEFRA/trade-imports-ins-frontend | Import Notification Service front-door (address-book UI, sign-in, dashboard shell) | Node.js |

Work on a specific repo by entering its directory:

```bash
cd repos/trade-imports-animals-frontend   # then use claude, git, npm etc. as normal
```

Run `make help` from this directory to see all cross-repo commands.

## `tim` CLI (alternative to Make + tools/)

[`tim/`](tim/) is a Node.js CLI that mirrors the Makefile + read-only
parts of `tools/`. Library-first integrations (octokit, REST clients —
no shell-out to `gh`/`jq`), behaviourally tested, deterministic
`--json` output for skill use. Dual-runs with the bash; pick whichever.

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim link   # tim on PATH
tim --help                # full surface
tim workspace status      # equivalent of `make status` + jq-friendly --json
tim docker dev            # equivalent of `scripts/stack/run-stack.sh -d`
tim jira ticket EUDPA-X   # equivalent of tools/jira/ticket.sh
tim auth                  # equivalent of tools/auth.sh
tim github prs EUDPA-X    # equivalent of tools/github/prs.sh
tim parity report EUDPA-X # render a findings report; see the parity skill
```

`tim/` is a sub-project of this repo rather than one of the cloned
repos, so the workspace-wide install, lint and test skip it. Run its own
scripts against it directly — no `cd` needed, and nothing in the
Makefile, which is deprecated:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim ci
npm --prefix ~/git/defra/trade-imports-workspace/tim test
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
```

`tim` finds the workspace by walking up from the current directory, then
falls back to the canonical path. Standing in another checkout — the old
`trade-imports-animals` clone, say — that walk-up wins and reads the
wrong data, so pass `--workspace ~/git/defra/trade-imports-workspace`
when you are not inside this one.

If `tim` behaves as though it is looking at a different workspace, check
`readlink -f "$(which tim)"` — a `tim` linked from an older clone resolves
that clone's `tools/` and `workareas/`.

See [`tim/CLAUDE.md`](tim/CLAUDE.md) for rails (test-on-input/output,
library-first, GDS plain English, `__mocks__`-style network-boundary
mocking via nock) and [`tim/README.md`](tim/README.md) for usage and
the env-var contract (the same `JIRA_USER`/`JIRA_TOKEN`/`JIRA_BASE_URL`
/ `GITHUB_TOKEN` the bash uses — seamless pickup).

Skills should prefer `tim <cmd> --json` over bare bash once a surface
is covered by tim — the JSON envelope is schema-versioned and stable.

## Workspace stack (what `make docker-compose-*` delegates to)

`scripts/stack/run-stack.sh` brings up the full stack from Dockerhub — the
only compose stack in the workspace and its repos. Supports `-b <branch>`
(probe for branch-tagged images), `-d/--dev` (build the repo-backed
services from local source under `repos/`), `-e <service>` (exclude one so
you can run it natively), and `--profile <name>` (run only a subset of
tiers). In `--dev` mode the Java backend, stub and reference-data hot-reload
edited source via Spring Boot DevTools; `bounce-backend.sh` is a fallback that
recreates the backend container (e.g. after a `pom.xml`/dependency change).

Init scripts are staged from their owning repos on every stack start
(backend: Floci init; tests repo: mongo seed fixtures; dynamics-gateway:
ASB emulator config) — locally from `repos/`, in CI via sparse fetch.
`docker/stack/.staged/` is generated; never edit it.

See `docker/stack/AGENTS.md` for the full index — flag reference, file
layout (role overlays + dev overlay), init-script ownership/staging, env
knobs that must use `host.docker.internal`, and the running-E2E recipe.

## Docs

- `docs/` — project documentation. Architecture notes, ADRs, runbooks.
- [`docs/adr/`](docs/adr/) — architecture decision records. See
  [`docs/adr/0001-consolidate-workspace-docs-under-docs.md`](docs/adr/0001-consolidate-workspace-docs-under-docs.md)
  for why `docs/` is the single canonical documentation root.
- [`docs/agent-skills.md`](docs/agent-skills.md) — agentskills.io
  conventions used in this workspace (path conventions,
  `find_workspace_root` helper, subagent format, cross-host notes).
- [`docs/agent-onboarding.md`](docs/agent-onboarding.md) — auth /
  credential setup for the agent skills.
- `docs/best-practices/` — tech-specific practice guides
  (gds/, java/, node/, playwright/, k6/, rest-api/, doc-comments/,
  docker-compose.md). Cited by SKILL.md files via
  `~/git/defra/trade-imports-workspace/docs/best-practices/<topic>/<file>`.

## SonarCloud integration

`trade-imports-animals-frontend`, `-admin`, `-backend`, and `-dynamics-gateway` each have a SonarCloud Claude Code integration committed to `.claude/` and `.mcp.json`. This provides:

- **Secrets scanning** — `UserPromptSubmit` and `PreToolUse` hooks block prompts/reads containing API keys or tokens
- **MCP server** — query SonarCloud issues and rules via the `sonarqube` MCP server
- **End-of-turn analysis** — a `Stop` hook runs `sonar analyze agentic` after each turn when uncommitted changes exist; any BLOCKER or CRITICAL findings are injected back as context so they can be addressed before the next response

**Before committing code changes:** run `sonar analyze --staged` (requires `sonar` CLI installed and `sonar auth login` completed) and fix any BLOCKER or CRITICAL findings before committing. Also run it when encountering CI failures, test failures, or unexpected behaviour. The MCP server can also be queried directly to fetch existing issues for a project.

## Reference catalogues

The volatile catalogues live as topic files under [`docs/reference/`](docs/reference/) — read the relevant one on demand; edit the topic file, not this list:

- [`docs/reference/make-targets.md`](docs/reference/make-targets.md) — every `make` target and what it does.
- [`docs/reference/workflows.md`](docs/reference/workflows.md) — common workflows (setup, daily update, running the stack, tests).
- [`docs/reference/tools-index.md`](docs/reference/tools-index.md) — the full `tools/` script index (args + purpose).
- [`docs/reference/worker-references.md`](docs/reference/worker-references.md) — per-skill fan-out worker personas.
- [`docs/reference/workareas.md`](docs/reference/workareas.md) — the `workareas/` runtime-cache map.
