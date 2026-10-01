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

### `tim distil` — the DISTIL files in one workarea

The deterministic steps of the requirements-pipeline skill's DISTIL phase, run
by the distil workflow's agents instead of hand-written `jq`. The workflow is
`.claude/skills/requirements-pipeline/workflow/distil.js`; its README lists
which stage runs which command. Each command
takes a workarea under `workareas/`, reads its `sources.json` and `distil/`
files, and checks them against the schemas beside `backlog.schema.json` in
`.claude/skills/requirements-pipeline/references/` (`sources`, `extract`,
`verify`, `requirements` and `conflicts`), read from the workspace at runtime.

```bash
tim distil status shared/my-programme --json        # every source's state and what it needs next: the work list
tim distil check shared/my-programme --source repo:tests --stage extract --chunk 150 --json   # one source's extract, with its verify ranges
tim distil check shared/my-programme --stage all --json                                     # every source, both stages
tim distil check shared/my-programme --source repo:tests --stage extract --clear-parts --json   # and, once it passes, remove old verify parts
tim distil stamp shared/my-programme --source repo:tests --json          # record the source's scope hash in its extract
tim distil merge-verify shared/my-programme --source repo:tests --json   # join verify parts into one file with the extract's hash, then remove them
tim distil adopt shared/my-programme --source repo:tests --json          # take on a source distilled by hand: record both hashes
tim distil working-set shared/my-programme --write --json   # held plus missed claims, to distil/working-set.json
tim distil coverage shared/my-programme --json      # requirements and conflicts against the working set, and the backlog
tim distil backlog-snapshot shared/my-programme --save before --json        # keep the row ids and the rows built or set aside
tim distil backlog-snapshot shared/my-programme --compare-to before --json  # rows removed, and rows built or set aside that changed, since
tim distil trace shared/my-programme --source trace:ched-p --out actions.txt --json -- actions   # playwright trace, in the source's .work folder
```

A source's state is `pending` (no extract), `extracted` (no verification),
`verified`, `stale` (its kind, locator or scope changed since it was
extracted, the extract records no scope hash, or its claims changed after they
were verified) or `invalid` (a file out of shape). `next` says what it needs:
`extract`, `verify` or nothing. A relaunch skips every verified source whose
scope hash and extract hash are unchanged.

`check`, `merge-verify`, `adopt` and `coverage` exit 1 (`LINT`) and name every
problem when anything is out of shape; `merge-verify` and `adopt` then write
nothing. With `--json`, `coverage` also lists each problem in
`errors[0].problems` with its scope, `reconcile` or `backlog`, so the workflow
routes it to the step that can fix it.

`trace` takes tim's options first, then `--`, then the `playwright trace`
subcommand. It runs the Playwright tim installs, in
`distil/extract/<slug>.work/`, so a trace opened there belongs to that source.

### `tim docker lease` — who holds the workspace stack

The workspace stack is one compose project per machine. A build stage that
needs it takes a lease first and gives it back before it finishes, so a stack
is never left up with nobody owning it.

```bash
tim docker lease acquire --holder "ibl-20261001T090000Z inc-003 ladder" --json  # start it, or reuse your own
tim docker lease release --holder "ibl-20261001T090000Z inc-003 ladder" --json  # take down what you started
tim docker lease status --json                                                    # up or down, and who holds it
```

- `acquire` on a stack that is down records the lease, then starts it
  (`run-stack.sh -d`; `--mode up` for the published images) and records its
  container ids. On a stack the same holder already leases it reuses it as it
  is, but only when that start finished and the containers are still the ones
  recorded. A start of the holder's own that died part-way (a timeout killing
  `acquire`, say) is taken down and started again; one still running is
  refused.
- `acquire` on a stack leased to anyone else, up with no lease at all (one
  somebody started by hand with `tim docker dev`), or restarted by hand under
  a lease (other container ids), refuses with `STACK_HELD`, naming the holder,
  its mode, its branches and when it took the lease. It never reuses or takes
  down such a stack.
- `release` takes down the stack its holder started, then clears the lease.
  It refuses a lease somebody else holds (`NOT_HOLDER`) and never touches a
  stack nobody leases. A stack restarted by hand under the lease is left up and
  the lease cleared (`FOREIGN_STACK`). When `stop-stack.sh` fails the lease is
  kept.
- A lease whose stack has gone, and whose start is not still running, is stale
  and the next `acquire` replaces it, under a lock (`stack-lease.json.lock`) so
  two processes never both take it over.
- While a lease is held, `tim docker up`, `dev`, `down`, `restart` and
  `bounce-backend` refuse with `STACK_HELD`, naming the holder. Add `--force`
  to go ahead anyway; the holder then refuses to reuse or take down what you
  start.

The lease is one file per machine, outside every repo: `TIM_STACK_LEASE`, or
`tim/stack-lease.json` under `XDG_STATE_HOME` (default `~/.local/state`).
`tim build gate` takes the same lease for its E2E phase.

**Running the gate by hand.** `tim build gate --phase e2e` refuses a stack you
started with `tim docker dev`, because nobody leases it. Either run
`tim docker down` first and let the gate start and stop its own stack, or hold
a lease yourself for the whole session:

```bash
tim docker lease acquire --holder "sam manual"
tim build gate shared/my-programme --phase e2e --holder "sam manual"
tim docker lease release --holder "sam manual"
```

### `tim build` — the build loop's deterministic steps

The build loop's start, branch and gate steps, run the same way every time.
Each reads the repos a backlog builds from its envelope `repos` map.

```bash
tim build start shared/my-programme --base main --jira-project EUDPA --epic EUDPA-20628 \
  --in-dev-status "In Dev" --done-status Done --board 13780 --json  # derive, ticket, branch
tim build branch shared/my-programme feat/EUDPA-123-origin --json   # every backlog repo on one branch
tim build gate shared/my-programme --phase unit --json      # unit rungs only
tim build gate shared/my-programme --json                   # unit, then FIT, then E2E
tim build gate shared/my-programme --logs /tmp/gate --json  # logs somewhere other than <workarea>/logs/
tim build gate shared/my-programme --phase e2e --holder "ibl-20261001T090000Z inc-003 ladder" --json
```

`tim build start` starts one increment, in three steps. **Derive**: the
increment `--id` names, or the next buildable one (`--last <id>` stops before
the ticket when the next one is the id the previous attempt built, reporting
`repeat`). **Ticket**: reuse the key on the row, or an open ticket under `--epic` with this increment's exact summary (a create that timed out may have raised one), or raise a Task under
`--epic` with the row's title, detail, acceptance criteria and sources as its
wiki-markup description, and record the key on the row before anything else,
so a retry never raises a second. A status other than `--in-dev-status` is
moved there by an exact-name transition; one already at `--done-status` is
left alone with a warning. Then the ticket is moved onto `--board`, every time.
**Branch**: the row's branch, or `<type>/<KEY>-<slug>` recorded on the row,
checked out in each of the increment's repos (a row naming none takes every repo, in `--repos` order when given) (fast-forwarded to what is
pushed), tracked from origin, or cut with `--no-track` from a freshly fetched
`origin/<base>`. A repo with uncommitted work stops it before any repo
changes. The result names `resumeAt` from the row's `commit` and `prs`. A
failure names its step (`failedStep`: `derive`, `ticket` or `branch`) and its
exact reason, and exits 1; nothing buildable is `id: null` and exits 0.

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
(`run-stack.sh -d`, the path `tim docker dev` takes), under a stack lease
held as `--holder` (default: this gate run). If the stack was down, the gate
starts it, leases it and always releases it afterwards; if this holder
already leases it, the gate rebuilds it from local source and leaves it up. A
stack leased to anyone else, or up with no lease, is refused and left alone,
and so is a FIT port such a stack holds: `stack.held` names the holder (null
for no lease) and the reason. Each rung writes to
`gate-<repo>-<rung>.log`; nothing streams. A rung that cannot run fails with
its reason. The result is `{green, rungs, stack}` and the command exits 1
unless every rung passed. gates.json refuses any rung that names a remote or
CDP script. The tests repo's E2E is one `e2e` rung that runs its whole suite; a
machine that times out under the full stack sets `PLAYWRIGHT_WORKERS` (e.g. 2
on a 16 GB machine) in its shell profile.

### `tim build runs archive|report` — what each run cost

Keeps the full transcripts of workflow runs and reports what each stage cost
and how long it took, so build-loop runs can be compared over time.

```bash
tim build runs archive wf_850da050-87a          # one run, by id or transcript folder path
tim build runs archive --all                    # every run Claude Code still holds for this workspace
tim build runs report wf_850da050-87a           # run → increment → stage → agent table
tim build runs report wf_850da050-87a --json    # the same, for mining
tim build runs report --all --session <id>      # one line per run, then each stage across them
tim build runs report --all --workflow all      # every workflow, not only increment-build-loop
```

`archive` copies a run's `journal.jsonl`, every agent's transcript and
`.meta.json`, the run's own record (`<session>/workflows/<runId>.json`: args,
`log()` lines, result, per-agent progress) and any subagents its agents
started, into `workareas/build-telemetry/runs/<runId>/`, and records the run in
`workareas/build-telemetry/index.json`. It only reads `~/.claude`. Running it
again copies only files that changed, so archiving a run while it is still
going, then again after it stops, is safe. A run with no record yet is indexed
as `unfinished`.

The archive lives under `workareas/` because git ignores it — transcripts hold
prompts, code and private context, and this repo is public — and outside
`~/.claude`, which deletes session folders after `cleanupPeriodDays` (30 days
unless set).

`report` reads only the archive. Tokens are summed once per model request from
each transcript: `input`, `output`, `cache write` and `cache read`, with
`total` the sum of all four, so cache reads dominate it. An agent's own
subagents count towards it. A stage's time is the span from its first agent's
start to its last one's end, so parallel reviewers are not double counted; the
JSON also carries `agentMs`, the sum. The increment and stage come from the
agent's label (`inc-004 review:frontend` → `inc-004`, `review`); agents with no
increment id sit under `(run)`.

### `tim jira create|attach|link|epics` — the Jira write surface

`tim jira ticket`/`comments` are read-only. Creating, attaching, linking and
listing epics writes to Jira, so all four follow one rule: **dry run by
default, a real write needs an explicit `--confirm`** (or, for `create`, a
matching `--confirm <planId>`). Nothing in the `.claude/settings.json`
allowlist stops `tim jira *`, so this contract — not the allowlist — is what
keeps a skill from creating something nobody agreed to.

```bash
tim jira create --from ticket.json --json          # dry run: prints the plan (fields, attachments with sizes, warnings) and a planId
tim jira create --from ticket.json --confirm <planId> --json   # creates the issue, attaches every file, links every `relates`, writes ticket.created.json
tim jira attach EUDPA-200 diagram.svg notes.md     # dry run: what would be attached
tim jira attach EUDPA-200 diagram.svg --confirm    # attaches for real; --replace re-attaches over an existing filename instead of adding a duplicate
tim jira link EUDPA-200 relates EUDPA-100          # dry run
tim jira link EUDPA-200 relates EUDPA-100 --confirm  # creates the link, then GETs the ticket back to verify it landed
tim jira epics --project EUDPA --json              # read-only: open epics in a project, for a hand-off's default parent (no dry-run/confirm — nothing is written)
```

`tim jira create --from <path>` reads a `tim-ticket/1` manifest (project,
type, summary, `descriptionFile`, parent, labels, priority, attachments,
relates) from the given JSON file, resolving `descriptionFile` and every
attachment path relative to the manifest's own directory. The dry run's
`planId` is a hash of the exact payload plus every attachment's own content
hash, so `--confirm <planId>` only succeeds when the plan it names is still
the plan on disk — edit the manifest after a dry run and the old `planId` is
refused, naming the mismatch, rather than silently creating something
different from what was shown. A manifest that already has a
`ticket.created.json` receipt beside it refuses to create again, naming the
key it already created. `create` and `attach` also exit `PARTIAL_FAILURE`
(not `ERROR`) when some but not all attachments fail, so the receipt still
gets written for what did succeed. The `ticket-creator` skill and the
`prototype` skill's hand-off both build a manifest and call this surface
rather than `../tools/jira/create-ticket.sh` + `attach-file.sh`.

### Workspace safety for repos outside the branch-parity contract

Not every repo under `repos/` follows the workspace's cross-repo
branch-parity rule (`CLAUDE.md` rule 2) — `trade-imports-plants-prototype`
has no Docker stack image to keep in step with. `repos.json` marks such a
repo `"workspaceBranchSync": false`, and `tim workspace reset|branch|update`
skip it by default, printing one plain skip line and listing it under
`skipped` in `--json`:

```bash
tim workspace update                                           # skips trade-imports-plants-prototype, updates every other repo
tim workspace update --include trade-imports-plants-prototype  # names it explicitly, so it updates too
tim workspace install --repo trade-imports-plants-prototype    # installs just this repo, using its own pinned npm version if `packageManager` differs from the one running
```

`tim workspace setup` also gives such a repo its own fetch-only `upstream`
remote from `repos.json` (name, url, `push: "DISABLED"`) — idempotent, so
running setup again reports "already set up" rather than erroring.

### `tim prototype setup`

Onboards a Claude Code session at the workspace root for a designer working
on the plants prototype, in one idempotent command:

```bash
tim prototype setup          # add the CLAUDE.local.md designer note, the upstream remote, install, and check Jira/GitHub readiness
tim prototype setup --remove # take the designer note back out of CLAUDE.local.md, leaving everything else in the file untouched
```

It writes a marker-delimited block into a gitignored `CLAUDE.local.md` at
the workspace root (running it again replaces the block with the same text
rather than duplicating it), reuses the `workspace setup`/`install` building
blocks scoped to just `trade-imports-plants-prototype`, and reports
Jira/GitHub auth readiness via the same probes `tim auth` uses — without
failing the command when Jira isn't configured yet. It never touches Jira
and never pushes.

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
