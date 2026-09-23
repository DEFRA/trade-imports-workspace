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

### `tim capture` — photograph a running app

Runs an app's own FIT suite with Playwright tracing on, keeps the traces under
the workarea, and says which of the journey's pages the suite reached.

```bash
tim capture shared/my-programme --app animals-frontend          # run the suite, keep the traces
tim capture shared/my-programme --app animals-frontend --json   # the same, as one JSON line
```

The workarea's `capture.json` names each app it can capture. Each entry gives
the `repo` the app lives in, the `fitScript` that runs its FIT suite, the
Playwright `projects` to run, the `flow` module the journey's pages are
declared in, and the `pagePath` those pages are served under — a URL template
ending in `{slug}`, such as `/notifications/{journeyId}/{slug}`.

```json
{
  "apps": {
    "animals-frontend": {
      "repo": "repos/trade-imports-animals-frontend",
      "fitScript": "test:fit",
      "projects": ["chromium"],
      "flow": "src/server/app/flow.js",
      "pagePath": "/notifications/{journeyId}/{slug}"
    }
  }
}
```

Traces land in `<workarea>/traces/<app>/<sha>/`, one folder per commit, beside
a `manifest.json` (what ran, when, and how it exited) and a `coverage.json`
(every page in the flow, and whether a trace reached it). A capture never
writes over one that is already there: the sha names the folder, so re-running
at the same commit is refused rather than silently replacing the evidence.

The gap list is the point. The suite is the app's own, so a page it never
visits is a page nothing photographs — and those are the pages still needing a
spec before the app is fully captured. `tim capture` names them rather than
reporting a clean run over partial evidence.

The command reads the flow module before the suite starts, so a `capture.json`
naming the wrong flow is refused in a second rather than after a browser run.
Playwright has to be installed in the app's own repo; the suite is run there,
not here.

### `tim backlog` — programme backlogs

One writer core over any registered programme, through the profile the
programme names — `requirements-v2` for a DESIGN section 3.4 requirements
atom set.

```bash
tim backlog registry list --json                 # every registered programme, its profile and workarea
tim backlog registry show fixture-requirements    # one programme's resolved paths
tim backlog ingest fixture-requirements --dry-run --json  # assemble backlog.json from item files
tim backlog ingest <programme> --increments       # ingest requirement increments (requirements-v2 only)
tim backlog ingest <programme> --replace          # rebuild ids from scratch; refuses while any row is ruled or started
tim backlog ingest <programme> --op-id r1:inc-001:1:plan:t1:ingest --json   # replaying the same --op-id is a no-op that prints the original result
tim backlog ingest <programme> --expect-sha <sha256> --json                # refused with exit 3 if backlog.json has changed since
tim backlog state set <programme> inc-001 phase --value '"plan"' --json    # set one field on one increment's build/state.json entry (requirements-v2 only)
tim backlog state note <programme> inc-001 --file note.txt --stage plan --json  # append one note to build/journal.jsonl
tim backlog rule <programme> q-house-rules-source --option A --by sam --at 2026-09-21T10:00:00Z --words "..." --note "..." --json  # record and apply a ruling (requirements-v2 only)
tim backlog rule <programme> q-house-rules-source --by default --at 2026-09-21T10:00:00Z --json   # apply a defaulted question's default at once
tim backlog rule <programme> q-house-rules-source --option B --supersedes d-005 --by sam --at 2026-09-21T10:00:00Z --words "Move to option B." --note "..." --json  # reverse a decision in force, naming it with --supersedes
tim backlog rule <programme> q-house-rules-source --option B --by sam --at 2026-09-21T10:00:00Z --words "maybe B?" --note "..." --json  # a hedge in --words is recorded tentative, not applied; --supersedes is not used here
tim backlog question check-page <programme> --page design/decisions-for-sam.md --json  # check the hand-written decisions page's ids, defaults and blocked increments against backlog.json
```

Three commands work on any workarea's `backlog.json` in the one backlog shape,
with no registration. The shape is defined by
`.claude/skills/requirements-pipeline/references/backlog.schema.json`, which
`check` reads from the workspace at runtime and validates against; it then checks
what a schema cannot say (every dependency is in the backlog, no cycle, no
duplicate id). The requirements-pipeline skill's DISTIL and BUILD phases and the
build loop use them:

```bash
tim backlog check shared/my-programme --json     # the shape, dependencies, cycles and recipe fields; exits 1 when out of shape
tim backlog next shared/my-programme --json      # the next buildable id, or NONE
tim backlog set shared/my-programme inc-004 --commit abc1234 --status done --json   # record build state
tim backlog set shared/my-programme inc-004 --pr '{"repo":"frontend","url":"https://github.com/DEFRA/x/pull/9"}' --json
```

A programme is registered in `tools/backlog/registry.json` — including
`fixture-requirements`, the tracked fixture this file's own tests re-ingest on
every run. `tim backlog registry list` reports what it holds.

`tim backlog ingest`, `state set`, `state note` and `rule` (requirements-v2
only) all go through the same write-safety core: `--op-id` makes a call
idempotent (a replay returns the first result and writes nothing), and
`--expect-sha` refuses a write whose target changed underneath it. Both exit
3 (`LOST_UPDATE`) on a stale `--expect-sha` and 4 (`LOCKED`) when another
process holds the write lock after every retry.

### `tim build` — the build loop's deterministic steps

The build loop's branch and gate steps, run the same way every time. Both read
the repos a backlog builds from its envelope `repos` map.

```bash
tim build branch shared/my-programme feat/EUDPA-123-origin --json   # every backlog repo on one branch
tim build gate shared/my-programme --phase unit --json      # unit rungs only
tim build gate shared/my-programme --json                   # unit, then FIT, then E2E
tim build gate shared/my-programme --logs /tmp/gate --json  # logs somewhere other than <workarea>/logs/
```

`tim build branch` checks the branch out in each repo where it exists
locally, and otherwise cuts it with `--no-track` from `origin/<branch>` if the
remote has it, else from the repo's default branch. It changes nothing if a
repo it would move has uncommitted work (exit 1, `DIRTY_TREE`, naming the
files). Running it again is a no-op.

`tim build gate` runs the rungs in
`.claude/skills/requirements-pipeline/references/gates.json` for each backlog
repo, in backlog order: every unit rung, then every FIT rung (after checking
its ports are free — a held port fails the rung and names the holder), then
the E2E rungs against the workspace stack built from local source
(`run-stack.sh -d`, the path `tim docker dev` takes). If the stack was down,
the gate starts it and always stops it afterwards; if it was up, the gate
rebuilds it from local source and leaves it up. Each rung writes to
`gate-<repo>-<rung>.log`; nothing streams. A rung that cannot run fails with
its reason. The result is `{green, rungs, stack}` and the command exits 1
unless every rung passed. gates.json refuses any rung that names a remote or
CDP script.

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
