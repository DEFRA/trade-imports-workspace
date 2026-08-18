# tim/ — Trade Imports CLI

Node.js Ink/React CLI for the trade-imports workspace. Dual-runs alongside the bash tooling in `../tools/`. See `README.md` for usage.

## Inherited best-practices (always in context)

@../docs/best-practices/node/code-style.md
@../docs/best-practices/node/testing/frontend.md
@../docs/best-practices/node/pino-logging.md
@../docs/best-practices/doc-comments/jsdoc.md
@../docs/best-practices/gds/language.md
@../docs/best-practices/gds/writing.md

## Hard rules (non-negotiable)

- **Test on input/output.** Spawn the CLI, assert stdout. Render the component, assert `lastFrame()`. Call the function, assert its return value or thrown error. `toHaveBeenCalled` and `toHaveBeenCalledWith` are banned outside the rare case where the call IS the external side-effect (outbound webhook, analytics emit) — and even then assert on the captured payload, not the spy record. Per-block override only with `// allow-spy-assertion: <why>`.
- **Library-first integrations.** External services go through a typed client under `src/clients/`. Never shell out to `gh`, `jq`, `curl`, or `../tools/*.sh`. The only sanctioned shell-out in the integration path is one `gh auth token` at startup when `GITHUB_TOKEN` is unset — that's credential retrieval, not service invocation.
- **Mock at the network boundary.** Client tests use `undici` MockAgent; feature/hook tests render real components. Don't `vi.mock()` your own modules — it leaves them untested and turns the feature test into a coupling check.
- **Ship code + behavioural test together.** Every new `src/**/*.js` lands with a sibling `*.test.js` in the same diff.
- **GDS plain English for all user-facing strings.** Ink screen text, error messages, `--help`, JSON `error.message`. Active voice, plain words, address the user directly. "Can't find …" not "Could not locate …".
- **JSDoc only where it earns its place** — exported / non-obvious only. No name-restating.

## Path-scoped rules

See `.claude/rules/` — loaded by glob:

- `cli-patterns.md` — `src/cli.js`, `src/commands/**`
- `client-patterns.md` — `src/clients/**`
- `test-patterns.md` — `**/*.test.js`
- `ink-screen-patterns.md` — `src/components/**`

## Scripts contract (matches the frontend repo)

`npm run lint`, `npm test`, `npm run test:watch`, `npm run format`, `npm run format:check`, `npm run coverage`.

## Auth env vars (reuse the bash contract)

- `JIRA_USER` + `JIRA_TOKEN` + `JIRA_BASE_URL` — used by `jira-client` AND `confluence-client`. Confluence sits at `${JIRA_BASE_URL}/wiki` with the same Atlassian token. Matches `../tools/jira/auth.sh` and `../tools/confluence/auth.sh`.
- `GITHUB_TOKEN` if set; otherwise tim runs `gh auth token` once at startup. Matches `../tools/github/auth.sh`.
- Anyone with the bash tools working should get seamless pickup with zero new env vars.

## When to use parent skills

Use `/review`, `/code-style`, `/ticket`, `/understanding-check` from the workspace root for tim/ changes. They work here without modification. Don't duplicate them under `tim/.claude/skills/`.

## What lives where

- `src/cli.js` — commander entry; auto-sets `--no-ui` when `!isTTY`
- `src/clients/*.js` — external service clients (octokit / undici); each with sibling `*.test.js`
- `src/components/features/<name>/` — Ink feature folders (one per command group)
- `src/components/common/` — shared screens (Menu, Loading, Error, Confirm, ParallelProgress, StreamingLog)
- `src/utils/`, `src/config/`, `src/env/`, `src/exec/`, `src/output/`, `src/logging/`, `src/healthcheck/`
- `src/test-support/http-mock.js` — undici MockAgent helpers + fixture loader
- `src/test-support/fixtures/` — co-located JSON response fixtures
