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
- **Before pushing code changes:** a `PreToolUse` hook runs the real SonarCloud quality gate automatically on `git push` and blocks the push if it fails (see SonarCloud integration below). If `SONAR_TOKEN` isn't set locally, the hook skips gracefully — run the same check manually in that case.

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
| `frontend-change` | "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend" | One recipe-verbatim increment on a frontend repo (today `trade-imports-animals-frontend`, src/server/app): recipes for additive elements, guard-railed maintenance for obligations and journey flow, verification ladder throughout, then a post-verification sync of the `openspec/` behaviour spec and coverage entries the increment touched. |
| `requirements-pipeline` | "distil requirements", "distil these sources", "turn these requirements into a backlog", "build a backlog from", "consolidate requirements", "re-distil", "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build" | Sources in, one backlog.json of full-stack requirement increments out (DISTIL), then built one increment at a time through the increment build loop (BUILD). The backlog shape, the loop and its Codex briefs live beside it. |
| `spec-catchup` | "catch the spec up", "the spec is behind", "spec-catchup", "is the behaviour spec stale" | **The code does something the spec does not say** — judges `tim spec candidates` (Task fan-out when large), auto-applies `spec.md` + coverage fixes (no walk), advances the baseline with `--require-ruled`. |
| `spec-cover` | "cover the gaps", "prove the spec", "spec-cover", "fill coverage holes" | **The spec says something no test proves** — judges `tim spec gaps` (Task fan-out per gap when many), auto-writes a test in a service repo + coverage links (no walk). Does not advance the baseline. |

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
| `repos/trade-imports-ins-backend` | DEFRA/trade-imports-ins-backend | Aggregates notification events into a cross-journey read model | Java / Spring Boot |
| `repos/trade-imports-plants-frontend` | DEFRA/trade-imports-plants-frontend | High-risk plants journey (implemented on the shared journey platform; requirements still being reconciled) | Node.js |
| `repos/trade-imports-plants-prototype` | DEFRA/trade-imports-plants-prototype | Prototype copy of the plants frontend — its `upstream` remote is `trade-imports-plants-frontend`; sync with `git fetch upstream` then `git merge upstream/main` | Node.js |
| `repos/trade-imports-plants-backend` | DEFRA/trade-imports-plants-backend | High-risk plants notification persistence | Java / Spring Boot |
| `repos/trade-imports-schemas` | DEFRA/trade-imports-schemas | Shared schema definitions | Node.js |

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
tim capture <workarea> --app <name>  # photograph a running app from its own Playwright traces
tim backlog registry list # every registered programme, its profile and workarea
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
- [`docs/repos/architecture-overview.md`](docs/repos/architecture-overview.md) —
  how the services connect and what each is responsible for (read this first
  when a task crosses repos). Per-repo pages sit alongside it in
  [`docs/repos/`](docs/repos/).
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
- `docs/analysis/` — point-in-time, cross-repo investigation write-ups (not
  volatile catalogues — snapshot findings, re-run the investigation if the
  codebases have moved on). See
  [`docs/analysis/gbn-ag-field-lineage.md`](docs/analysis/gbn-ag-field-lineage.md)
  for the frontend → NotificationAggregate → GBN-AG → PIMS GBN-AG field-mapping
  audit, and
  [`docs/analysis/sonarcloud-branch-gate-status.md`](docs/analysis/sonarcloud-branch-gate-status.md)
  for the branch-level (not PR-scoped) quality gate status of all eight
  sonar-integrated repos — read it before trusting a green PR check as
  evidence that a repo's `main` is clean.

## SonarCloud integration

`trade-imports-animals-frontend`, `-admin`, `-backend`, `-dynamics-gateway`, `-address-book`, `-reference-data`, `-ins-backend`, and `-ins-frontend` each have a SonarCloud Claude Code integration committed to `.claude/` and `.mcp.json`. This provides:

- **Secrets scanning** — `UserPromptSubmit` and `PreToolUse(Read)` hooks block prompts/reads containing API keys or tokens.
- **MCP server** — query SonarCloud issues, quality gate status and rules directly via the per-repo `sonar-*` MCP servers (e.g. `mcp__sonar-gateway__search_sonar_issues_in_projects` for `trade-imports-dynamics-gateway`), without needing to run anything locally first.
- **Pre-push quality gate** — a `PreToolUse(Bash)` hook fires only when the command is an actual `git push`, running the canonical shared script at [`tools/sonar/sonar-push-check.sh`](tools/sonar/sonar-push-check.sh) (one copy, referenced by every repo's `.claude/settings.json` via its `$HOME`-absolute path — not duplicated per repo). It runs the *real* build/test/analysis pipeline CI uses (`mvn clean verify sonar:sonar` for Java repos, `npm ci && npm test` then `sonar-scanner` for Node repos) against the current branch's open PR when one exists, and **blocks the push** if the quality gate fails. Every other Bash command passes through untouched.

**Why not the server-side "Agentic Analysis" (Vortex) feature** the `sonar` CLI also offers (`sonar analyze agentic`, or `sonar analyze --staged`'s quality-check half): this DEFRA SonarCloud organization does not have that feature licensed (`403 Vortex Analysis is not available for this organization`) — confirmed by direct testing, not a config problem. The secrets-scanning half of the `sonar` CLI integration above is unaffected and still works. Don't reach for `sonar analyze agentic`/`--staged` expecting a working quality check; use the pre-push hook or run its script manually instead.

**Requires `SONAR_TOKEN`** in the environment (a personal SonarCloud token, works across all these repos) — set alongside the other credentials in `~/.zshrc`. If it isn't set, the hook skips gracefully rather than blocking pushes over a missing local prerequisite; CI's own SonarCloud Scan check is still the authoritative backstop either way. To run the same check manually (e.g. mid-investigation, or on a repo without an open PR yet):

```bash
bash ~/git/defra/trade-imports-workspace/tools/sonar/sonar-push-check.sh <<< '{"tool_input":{"command":"git push"}}'
```

(the script reads its trigger command from that JSON on stdin, matching the real hook's contract) — or just invoke the underlying `mvn .../sonar:sonar` or `sonar-scanner` command the script runs, directly.

## Reference catalogues

The volatile catalogues live as topic files under [`docs/reference/`](docs/reference/) — read the relevant one on demand; edit the topic file, not this list:

- [`docs/reference/make-targets.md`](docs/reference/make-targets.md) — every `make` target and what it does.
- [`docs/reference/workflows.md`](docs/reference/workflows.md) — common workflows (setup, daily update, running the stack, tests).
- [`docs/reference/tools-index.md`](docs/reference/tools-index.md) — the full `tools/` script index (args + purpose).
- [`docs/reference/worker-references.md`](docs/reference/worker-references.md) — per-skill fan-out worker personas.
- [`docs/reference/workareas.md`](docs/reference/workareas.md) — the `workareas/` runtime-cache map.
- [`docs/reference/openspec.md`](docs/reference/openspec.md) — OpenSpec CLI, coverage gap queries, and how to read coverage rows for the Behaviour Spec under `openspec/` (authoring conventions: [`openspec/config.yaml`](openspec/config.yaml)).
