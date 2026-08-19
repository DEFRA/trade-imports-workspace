# tim — Trade Imports CLI

Node.js Ink/React CLI for the [trade-imports workspace](../). Dual-runs alongside the bash tooling in [`../tools/`](../tools/) — start here when you want a tested, library-backed alternative to a `tools/*.sh` script or a `Makefile` target.

## Install

```bash
cd tim
npm install
npm i -g .
```

`tim` is now on your PATH. To uninstall:

```bash
npm un -g tim
```

For active CLI development (edits visible immediately, no reinstall):

```bash
cd tim
npm link
```

## Usage

### Interactive menu

Run with no arguments in a terminal to open the Ink menu:

```bash
tim
```

Arrow keys navigate, Enter selects, Enter on an empty input goes back. Every top-level entry is wired to the same library code the direct CLI uses — pick whichever you prefer.

#### Menu quick reference

| Menu path                                                    | CLI equivalent                    |
| ------------------------------------------------------------ | --------------------------------- |
| Workspace → Status                                           | `tim workspace status`            |
| Workspace → Branch                                           | `tim workspace branch [name]`     |
| Workspace → Install                                          | `tim workspace install`           |
| Workspace → Lint                                             | `tim workspace lint`              |
| Workspace → Test                                             | `tim workspace test`              |
| Workspace → Clean                                            | `tim workspace clean`             |
| Workspace → Setup                                            | `tim workspace setup`             |
| Workspace → Update                                           | `tim workspace update`            |
| Workspace → Reset                                            | `tim workspace reset`             |
| Docker → Start the stack (run-stack.sh)                      | `tim docker up`                   |
| Docker → Start the stack from local source (run-stack.sh -d) | `tim docker dev`                  |
| Docker → Stop the stack (stop-stack.sh)                      | `tim docker down`                 |
| Docker → Restart the whole stack (restart-stack.sh)          | `tim docker restart`              |
| Docker → Bounce backend (bounce-backend.sh)                  | `tim docker bounce-backend`       |
| Docker → Bounce mongo (bounce-mongo.sh)                      | `tim docker bounce-mongo`         |
| Start → Frontend (npm run dev)                               | `tim start frontend`              |
| Start → Backend (mvn spring-boot:run)                        | `tim start backend`               |
| Start → Admin (npm run dev)                                  | `tim start admin`                 |
| Auth                                                         | `tim auth`                        |
| Jira → Look up a ticket                                      | `tim jira ticket <id>`            |
| Jira → Read comments on a ticket                             | `tim jira comments <id>`          |
| GitHub → Find pull requests for a ticket                     | `tim github prs <ticketId>`       |
| GitHub → Open a single PR                                    | `tim github pr <repo> <number>`   |
| GitHub → Show a PR diff                                      | `tim github diff <repo> <number>` |
| Confluence → Look up a page                                  | `tim confluence page <id>`        |
| GitHub Actions → Recent workflow runs for a repo             | `tim gha runs <repo>`             |
| GitHub Actions → Status of a single run                      | `tim gha status <repo> <runId>`   |
| GitHub Actions → Wait for a run to finish                    | `tim gha wait <repo> <runId>`     |
| Quit                                                         | exits the menu                    |

### Direct CLI

Pass a subcommand to skip the menu and run a command in one shot:

```bash
tim hello
tim hello --json
tim --version
tim workspace status
tim workspace status --json | jq
```

Every command supports:

- `--json` — emit one structured JSON line on stdout (suppresses Ink)
- `--no-ui` — plain text on stdout (suppresses Ink; auto-set when stdout is not a TTY)
- `--verbose` — structured logs to stderr
- `--workspace <path>` — override the resolved workspace root

### `tim parity` — findings reports

Builds, checks and renders a backlog of comparison findings as a decision
surface. The corpus is data (`tools/parity/corpora.json`), and `sides[]` is a
list rather than a pair, so a comparison is not stuck at two sources.

```bash
tim parity normalise EUDPA-328 --write   # Pass 0: repo-relative paths, split screens
tim parity meta EUDPA-328 --write        # pins, captures, every derived count
tim parity citations EUDPA-328 --write   # extract citations[]; queue the ambiguous
tim parity evidence EUDPA-328 --write    # permalinks, blob ids, snippets, anchor checks
tim parity report EUDPA-328              # render report/index.html
tim parity report EUDPA-328 --target artifact   # one self-contained file to share
tim parity serve EUDPA-328               # serve it at full resolution
tim parity check EUDPA-328 --pass a      # the ten migration invariants
tim parity counts EUDPA-328 --json       # every number the masthead prints
```

The evidence — the pictures, and the commits they are of — has its own three
commands. Element crops are declared as data rather than written into a spec,
and a picture that moves under a pending ruling has to say so:

```bash
tim parity seed-anchors EUDPA-328 --write        # anchors.<side>.json from the compare deltas
tim parity insertion-anchors EUDPA-328 --write   # where a one-sided control would go
tim parity manifest EUDPA-328 --side prototype --sha 491b3926 --write
tim parity check-evidence EUDPA-328 [--strict]   # pin drift, captures, dead citations
tim parity repoint EUDPA-328 --side frontend --to <sha> [--accept]
tim parity report EUDPA-328 --reseal         # accept every picture that moved
```

`report` records what it showed you in `evidence/seals.json`. On the next
build, any picture that has changed carries a ribbon and is listed above
everything else, so nobody rules on a finding under an image that was swapped
without them. `repoint` is the same idea for a whole side: it writes a preview
of old beside new before anything is superseded.

Writers use the setters rather than editing JSON, so a fan-out worker cannot
reformat the file or touch a second increment:

```bash
tim parity set-slot EUDPA-328 inc-037 frontend --pass a --file slot.txt
tim parity set-decision EUDPA-328 inc-055 --question "…" --source authored
tim parity set-citation EUDPA-328 inc-096 c9 --repo prototype --path app/routes.js
```

Every subcommand takes a positional run id — there is no default, because a
report that silently rendered the wrong corpus would be worse than one that
refused.

### Bypassing the interactive menu

The menu only opens when stdout is a TTY and the user has not asked for plain text. In any of the following situations tim falls back to printing `--help` to stdout, so pipes, CI and skill scripts keep working unchanged:

- A subcommand was given (`tim workspace status`)
- Stdout is not a TTY (`tim | cat`, CI runs)
- `--no-ui` is on the command line
- `--json` is on the command line

## Auth

`tim` reuses the same environment variables as the bash tooling in [`../tools/`](../tools/) — anyone with the bash tools working gets seamless pickup with no new setup:

| Variable                                   | Used for                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL` | Jira and Confluence (Confluence sits at `${JIRA_BASE_URL}/wiki` with the same Atlassian token)                                                    |
| `GITHUB_TOKEN`                             | GitHub and GitHub Actions. If unset, `tim` falls back to one `gh auth token` call at startup                                                      |
| `TIM_WORKSPACE`                            | Workspace root override (same as `--workspace`)                                                                                                   |
| `TIM_GITHUB_BASE_URL`                      | Clone URL prefix override for `workspace setup` (default `https://github.com/DEFRA`) — used by the behavioural tests to clone from local fixtures |
| `TIM_NO_AUTO_PULL`                         | Set to any value to turn off the automatic workspace pull described below                                                                         |

Run [`../tools/auth.sh`](../tools/auth.sh) to verify your setup against the bash side. `tim auth` (when it lands) does the same via library clients.

## Staying up to date

Every `tim` command fast-forwards the workspace repo before it runs, so using tim keeps you current without having to remember to pull.

It is deliberately narrow:

- **Only on `main`.** On any other branch it does nothing. Merging or rebasing your feature branch is your call, not the CLI's.
- **`--ff-only`.** It either fast-forwards cleanly or does nothing. It cannot leave a half-finished merge or a rebase stopped on a conflict, and it will not touch a branch that has diverged from its upstream.
- **Never blocks the command.** No network, no remote, a diverged branch — it says so on stderr and carries on.
- **stdout stays clean.** Notes go to stderr, so `--json` output remains one parseable line.

This updates the workspace repo only. Use `tim workspace update` for the repos under `repos/`.

Turn it off with `TIM_NO_AUTO_PULL=1` — worth doing when working offline or on a slow link, since each run makes a network call (bounded to a 10 second timeout).

## Smoke checklist

After install, confirm:

```bash
tim --version              # prints a semver
tim hello                  # prints "Hello from tim"
tim hello --json | jq      # parses as JSON with ok, schema_version, tim_version, message
```

## Developing

```bash
npm test                   # vitest, coverage
npm run test:watch
npm run lint               # eslint + neostandard
npm run lint:fix
npm run format
npm run coverage
```

## Project rules

Project conventions live in [`CLAUDE.md`](CLAUDE.md) and `.claude/rules/`. Highlights:

- **Test on input/output.** No `toHaveBeenCalled[With]` — render the component, spawn the CLI, or call the function and assert on what comes back. Pre-commit hook (`forbid-spy-assertions.sh`) enforces this.
- **Library-first integrations.** External services go through typed clients under `src/clients/`. No shelling out to `gh`, `jq`, `curl`, or `../tools/*.sh`.
- **Mock at the network boundary.** `undici` MockAgent for HTTP; never `vi.mock()` your own client modules.
- **Code and tests ship together.** Every new `src/**/*.js` lands with a sibling `*.test.js`.
- **GDS plain English** for all user-facing strings.
