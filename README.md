# trade-imports workspace

Local workspace aggregating the independent GitHub repos of the DEFRA trade imports services. Not a monorepo — each repo has its own git history, remotes, and CI. This folder provides shared tooling and cross-repo context.

## Repos

| Folder | GitHub | Role | Stack |
|--------|--------|------|-------|
| `repos/trade-imports-animals-frontend` | [DEFRA/trade-imports-animals-frontend](https://github.com/DEFRA/trade-imports-animals-frontend) | User-facing web application | Node.js |
| `repos/trade-imports-animals-backend` | [DEFRA/trade-imports-animals-backend](https://github.com/DEFRA/trade-imports-animals-backend) | API / business logic service | Java / Spring Boot |
| `repos/trade-imports-animals-tests` | [DEFRA/trade-imports-animals-tests](https://github.com/DEFRA/trade-imports-animals-tests) | End-to-end / integration test suite | Node.js |
| `repos/trade-imports-animals-admin` | [DEFRA/trade-imports-animals-admin](https://github.com/DEFRA/trade-imports-animals-admin) | Internal admin interface | Node.js |
| `repos/trade-imports-stub` | [DEFRA/trade-imports-stub](https://github.com/DEFRA/trade-imports-stub) | Stub of upstream trade-imports services | Java / Spring Boot |
| `repos/trade-imports-reference-data` | [DEFRA/trade-imports-reference-data](https://github.com/DEFRA/trade-imports-reference-data) | Reference data service | Java / Spring Boot |
| `repos/trade-imports-defra-id-stub` | [DEFRA/trade-imports-defra-id-stub](https://github.com/DEFRA/trade-imports-defra-id-stub) | Stub of the Defra ID (OIDC) sign-in service | Node.js |
| `repos/trade-imports-dynamics-gateway` | [DEFRA/trade-imports-dynamics-gateway](https://github.com/DEFRA/trade-imports-dynamics-gateway) | Centralised gateway forwarding events to Azure Service Bus | Java / Spring Boot |
| `repos/trade-imports-address-book` | [DEFRA/trade-imports-address-book](https://github.com/DEFRA/trade-imports-address-book) | Org-scoped address book API | Java / Spring Boot |
| `repos/trade-imports-ins-frontend` | [DEFRA/trade-imports-ins-frontend](https://github.com/DEFRA/trade-imports-ins-frontend) | Import Notification Service front-door | Node.js |

## Quickstart

The workspace and every helper script under `tools/` hardcode the path
`~/git/defra/trade-imports-workspace`. If your checkout is
elsewhere, symlink it before doing anything else:

```bash
ln -s "$(pwd)" ~/git/defra/trade-imports-workspace
```

Then:

```bash
make setup    # clone all repos into repos/
make install  # npm install in all Node repos
```

Run `make help` for the full list of cross-repo commands.

## Skills

This workspace ships custom Claude Code skills under `.claude/skills/`. They must be invoked from the workspace root — `cd` into a repo first and they won't be discoverable.

Skills change often enough that any list here goes stale. For a live overview, paste this into Claude Code from the workspace root:

```
List every skill under .claude/skills/. For each, read its SKILL.md frontmatter and give me one line: name, trigger phrases, and what it does. Group by which phase of work they cover.
```

## Working on a single repo

```bash
cd repos/trade-imports-animals-frontend
git checkout -b feat/my-feature
# make changes, commit, push as normal
```

Each repo has its own `CLAUDE.md` with repo-specific context.

## Docs

- [Agent onboarding](docs/agent-onboarding.md) — credentials and canonical clone location for the agent skills
- [Local setup](docs/local-setup.md) — how to run the full stack locally
- [`docker/stack/AGENTS.md`](docker/stack/AGENTS.md) — workspace stack flags, overlays, env knobs
