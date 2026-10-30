# A4: machine and process — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settle the four machine-and-process chores that cost the documents theme hours but change no stage of the build loop: give Docker Desktop an allocation the stack can live in, measure this machine and write `config/machine.json`, give the CI fixer `tim sonar gate` so a SonarCloud failure is readable, and write down the `main`-merge cadence a theme branch keeps.

**Architecture:** Four unrelated changes on one branch, in two independent halves. The machine half (Tasks 1–3) is a settings change, a measurement run and the record it produces — no code. The factory half (Tasks 4–7) adds one read-only call to tim's existing SonarCloud client, one subcommand that renders it, and one paragraph in each of the loop's two CI-fixer prompts so a fixer knows to run it. Task 8 is editorial: the cadence and a merge-row template in the theme build guide. Task 9 corrects one wrong flag in the design.

**Tech Stack:** Node.js ESM, vitest, zod (tim's option schemas), commander (tim's CLI), `installHttpMocks` for the network boundary, execa for the command tests, and the simulated workflow runtime in `tim/src/test-support/workflow-runtime.js` that `workflow-contract.test.js` drives.

**Design this implements:** `workareas/shared/build-loop-efficiency/DESIGN.md`, section A4.

**Read "Why the Docker change comes before the tune" below before starting Task 1.** The design lists the tune first; this plan does not, and the reason is not a preference.

---

## Background an engineer needs before Task 1

**What A4 is.** Three of the four items are one-offs on this machine, not features. Nothing here changes what the build loop does, what it reviews, or what it tests. A1 (`e2e: "local" | "ci"`) has already landed on `main` as #191, which is why the Docker allocation below is worth getting right but is no longer blocking: an `e2e: "ci"` run never starts the stack at all.

**This machine, read on 29 October 2026.** Every number below came from a command, not from the design:

| What | Command | Reading |
|---|---|---|
| Host cores | `sysctl -n hw.ncpu` | 12 |
| Host memory | `sysctl -n hw.memsize` | 19327352832 bytes (18 GiB) |
| Docker CPUs, memory, swap | `jq '{Cpus, MemoryMiB, SwapMiB}' ~/Library/Group\ Containers/group.com.docker/settings-store.json` | 12, 8092 MiB, 1024 MiB |
| What the daemon reports | `docker info --format '{{.NCPU}} {{.MemTotal}}'` | 12, 8217686016 bytes |
| This machine's gate settings | `tim build workers` | `This machine has no settings file, so every FIT and E2E run uses its own script's worker count.` |

Note the offset between the two memory readings: Docker reports about 255 MiB less than the figure in the settings file, because the VM keeps some for itself. Task 1's verification allows for it.

**What `config/machine.json` is.** `tim build gate` runs the same rungs on every machine, from `.claude/skills/requirements-pipeline/references/gates.json`. *How hard* it drives each rung is a property of the machine, so it lives in `config/machine.json` at the workspace root, which is gitignored (`.gitignore:72`) — one file per machine, never committed. `config/machine.example.json` is the committed example, measured on a different machine (10 cores, 16 GB, Docker at 6 CPUs and 10 GiB). `tim build workers` prints what the file says; the gate passes each count as `--workers` after the rung's scope, and the build loop runs `tim build workers` once at launch and puts the counts in every stage's guard rails, so a FIT run a reviewer makes drives the machine no harder than the gate does. Without the file, `test:fit:ci` uses `--workers=100%` — ten browsers on this machine. `.claude/skills/requirements-pipeline/references/machine-tuning.md` is the reference for all of it.

**What `tim build tune` does.** Takes the workspace stack lease, starts the stack from local source, times every tunable FIT and E2E rung at 2, 3 and 4 workers one run at a time with `tim build measure` sampling the machine, picks each rung's count (the fewest workers past which the time stops falling, backed off one if that count swapped or kept a shell waiting over 100 ms), writes `config/machine.json`, and gives the stack back. It takes about an hour. **The design calls this `tim build tune --write`; there is no such flag.** Writing is the default; `--dry-run` is the opt-out. Task 9 corrects the design.

**Which rungs it will time here.** Four. `gates.json` has five FIT and E2E rungs, and `isTunable` in `tim/src/build/tune/tune.js` drops the one marked `exclusive`:

| Rung | Phase | Script | Tuned |
|---|---|---|---|
| `trade-imports-plants-frontend/fit` | fit | `test:fit:ci` | yes |
| `trade-imports-animals-frontend/fit` | fit | `test:fit:ci` | yes |
| `trade-imports-ins-frontend/fit` | fit | `test:fit:ci` | yes |
| `trade-imports-ins-tests/e2e` | e2e | `test:docker-compose` | yes |
| `trade-imports-performance-tests/e2e-k6` | e2e | `test:docker-compose` | no — `exclusive: true` |

**Why a SonarCloud gate failure is invisible today.** Each repo's `check-pull-request.yml` runs the scanner as a *step* inside its `pr-validator` job (`repos/trade-imports-animals-frontend/.github/workflows/check-pull-request.yml:51`), with no `-Dsonar.qualitygate.wait=true`. The step uploads the analysis and passes. SonarCloud weighs the gate afterwards and posts the verdict as a check run of its own. So when the gate fails there is **no failing job and no job log**: `gh run view --log-failed`, which is the first thing the loop's CI fixer is told to run, returns nothing at all. On inc-212 the fixer spent all three `ciFixAttempts` that way, and a hand fix afterwards found three S2187 blockers. A gate can also fail on a metric no issue list would ever show — `new_coverage` below 90 is a condition, not an issue.

**Why it has to be a `tim` command.** The loop's `DENIED_FORMS_LINE` (`increment-build-loop.js:1234`) tells every agent: "NEVER run `sonar` (not allowlisted; it is a milestone gate the human runs)." A `tim` command is one of the five check forms a plan may write (`PLAN_CHECK_FORMS`, line 1238), and `Bash(tim:*)` is already allowlisted in `.claude/settings.json:87`, so `tim sonar gate` needs no permission change. This is also CLAUDE.md rule 8: extend the tools, don't work round them.

**The gate API, read live on 29 October 2026.** `GET https://sonarcloud.io/api/qualitygates/project_status?projectKey=DEFRA_<repo>` (plus `pullRequest=<n>` or `branch=<name>`), no token needed for these public projects, returns:

```json
{
  "projectStatus": {
    "status": "OK",
    "conditions": [
      { "status": "OK", "metricKey": "new_coverage", "comparator": "LT", "periodIndex": 1, "errorThreshold": "90", "actualValue": "97.9" },
      { "status": "OK", "metricKey": "new_blocker_violations", "comparator": "GT", "periodIndex": 1, "errorThreshold": "0", "actualValue": "0" }
    ],
    "periods": [{ "index": 1, "mode": "days", "date": "2026-10-12T07:32:05+0000", "parameter": "14" }],
    "ignoredConditions": false
  }
}
```

The nine conditions the DEFRA gate weighs are `new_reliability_rating`, `new_security_rating`, `new_maintainability_rating`, `new_coverage`, `new_duplicated_lines_density`, `new_blocker_violations`, `new_critical_violations`, `new_major_violations` and `new_security_hotspots_reviewed`. `status` is `OK`, `ERROR` or `NONE` (`NONE` when nothing has been analysed). `comparator` says which way a condition fails: `GT` means the threshold is a ceiling (fails above it), `LT` means it is a floor (fails below it). `sonar.projectKey` in each repo's `sonar-project.properties` is `DEFRA_<repo name>`, which is exactly the prefix `projectKeyOf` in tim's client already adds.

**How tim is tested.** Three patterns, all of which this plan follows:

- **Client, at the network boundary.** `tim/src/clients/sonar-client.test.js` uses `installHttpMocks()`/`closeHttpMocks()` from `../test-support/http-mock.js` and asserts the whole returned object. No `fetch` is stubbed by hand.
- **Command, through the real CLI.** `tim/src/commands/sonar/index.test.js` unit-tests the exported `renderIssues` directly, and runs the built CLI with `execa('node', [TIM_CLI_PATH, 'sonar', ...args, '--json'], { reject: false, env: { TIM_NO_AUTO_PULL: '1' } })` for the usage errors, asserting `exitCode` and the `errors` array.
- **Loop prompts, through the simulated runtime.** `tim/src/backlog/workflow-contract.test.js` asserts prompt content with `expect(promptOf(run, '<label>')).toContain(...)`. The branch-lifecycle CI fixer is reached by `runMergeRow(FOUND, { green: false, failures: ['lint'], summary: 'red' }, null)` and labelled `inc-900 ci fix 1` (helper at line 5186); the full-lifecycle one by `runFactory({}, { 'inc-020 ci watch': { green: false, failures: ['unit: red'], summary: 'red' } })` and labelled `inc-020 ci fix 1`.

Run the suite with:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- sonar
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

**The `merge` field already exists.** Task 8 writes down a cadence, not a feature. `.claude/skills/requirements-pipeline/references/backlog.schema.json` already defines a row's `merge` as "Branch lifecycle only: a ref to merge into each named repo before the row is built, such as `{ "tests": "origin/main" }`. The loop fetches and runs `git merge --no-ff --no-commit <ref>`, the implementor resolves the merge by the plan, and the land stage commits it as a two-parent merge commit. Every key must be in the row's `repos`." The loop reads it at `increment-build-loop.js:4778` and logs each merge; the branch stage's return schema carries it (line 3528). `tim backlog add --from <file> --before <id> --write` adds such a row; `tim backlog set <workarea> <id> --merge tests=origin/main` sets the ref on a row that exists. Documents `inc-040` is the worked example to copy.

**House rules.** `.claude/rules/code-quality.md` governs comments, names and tests, and wins over anything in `docs/best-practices/`. Read it in full before writing code. In particular: no comment that restates the code; doc comments only on an exported public API; a test name says the behaviour, not the mechanism; and no ticket keys, backlog ids or release names in code or test titles.

**Branch.** All nine tasks land on one branch in the workspace repo, which is the only repo this plan touches:

```bash
git -C ~/git/defra/trade-imports-workspace checkout -b chore/NO_JIRA-build-loop-machine-and-process
```

The workspace repo is not one of the eight SonarCloud-integrated repos, so the pre-push quality gate hook skips it.

---

## Why the Docker change comes before the tune

`tim build tune` measures *this machine as configured* and writes the counts it measured. Docker Desktop currently holds 12 of 12 CPUs and 8092 MiB. Tuning first would spend an hour measuring an allocation we are about to change, and every count it wrote would be a count for a machine that no longer exists.

The order is therefore Task 1 (allocation) → Task 2 (tune) → Task 3 (record). Those three are strictly serial, and Task 2 wants the machine otherwise idle for about an hour.

**Tasks 4–9 are independent of all three** and can be done first, in parallel, or while the tune runs on another machine — but not while the tune runs on *this* one, because a test suite running beside it corrupts the measurement.

---

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| Docker Desktop settings (`~/Library/Group Containers/group.com.docker/settings-store.json`, via the GUI) | The VM's CPU and memory allocation | 1 |
| `config/machine.json` (gitignored, created) | This machine's worker counts, `parallelRepos` and `stackAfterLocal` | 2 |
| `.claude/skills/requirements-pipeline/references/machine-tuning.md` | The committed record of what this machine measured and what was chosen | 3 |
| `tim/src/clients/sonar-client.js` | `qualityGate` alongside `listIssues`, and the scope-params helper they share | 4 |
| `tim/src/clients/sonar-client.test.js` | The client's tests, at the HTTP boundary | 4 |
| `tim/src/commands/sonar/index.js` | `renderGate` and the `gate` subcommand | 5 |
| `tim/src/commands/sonar/index.test.js` | `renderGate`'s tests and the subcommand's usage errors | 5 |
| `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` | `SONAR_GATE_RULE`, bound into both CI-fixer prompts | 6 |
| `tim/src/backlog/workflow-contract.test.js` | That both fixers carry the rule | 6 |
| `tim/README.md` | `tim sonar gate`'s documentation | 7 |
| `workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md` | The `main`-merge cadence and the merge-row template | 8 |
| `workareas/shared/build-loop-efficiency/DESIGN.md` | The corrected flag | 9 |

---

## Task 1: Give Docker Desktop an allocation the stack can live in

**Files:** none in the repo. This changes Docker Desktop's own settings.

**What to set, and why.** The 22 October measurements in `machine-tuning.md` were taken on a 10-core, 16 GB machine with Docker at 6 CPUs and 10 GiB, and they say: the containers alone peaked at 7.6 GiB; inside the VM 8.4 of 9.7 GiB was in use with the VM's own 1 GiB swap full; "8 GiB would leave the Java services short"; 6 CPUs was enough, with the containers peaking at about 3 CPUs' worth during E2E. This machine has 12 cores and 18 GiB, and is currently giving Docker **all 12 CPUs** and **less than the 10 GiB that was already called the floor**. The 21 October note in the same file records what over-allocating CPUs did: "With Docker at 10 CPUs and the gate's suites crowding 4 performance cores, the machine was overloaded. The timing failures came from that load, not from too few workers."

| Setting | Now | Set to | Why |
|---|---|---|---|
| CPUs | 12 | **8** | Leaves 4 cores for the host. The containers peak at about 3 CPUs' worth, so 8 is generous; 12 is the over-allocation that caused the 21 October timing failures. |
| Memory | 8092 MiB | **12288 MiB** (12 GiB) | 10 GiB was the measured floor on a 16 GB machine and its VM still filled its swap. This machine has 2 GiB more to give, and 12 GiB still leaves 6 GiB for the host. |
| Swap | 1024 MiB | **2048 MiB** | The VM's own 1 GiB swap was full during E2E at 10 GiB of memory. |
| Disk | 61035 MiB | unchanged | Nothing measured says it is short. |

- [ ] **Step 1: Check nothing is using the stack**

```bash
tim docker lease status
docker ps --format '{{.Names}}' | head -20
```

Expected: the lease is free, and no stack containers are listed. **If either shows a stack in use, stop** — changing the allocation restarts the Docker VM and kills every container, which would break somebody's run. Wait for it, or ask.

- [ ] **Step 2: Record what the settings file says now**

```bash
jq '{Cpus, MemoryMiB, SwapMiB, DiskSizeMiB}' ~/Library/Group\ Containers/group.com.docker/settings-store.json
```

Expected, on this machine: `{ "Cpus": 12, "MemoryMiB": 8092, "SwapMiB": 1024, "DiskSizeMiB": 61035 }`. Keep the output — Task 3 records the before-and-after.

- [ ] **Step 3: Change the allocation in Docker Desktop**

This is a GUI change. Docker Desktop rewrites `settings-store.json` itself while it runs, so editing the file by hand is overwritten; and this version's `docker desktop` CLI has only `start`, `stop`, `restart`, `status` and `version` — no settings command (`docker desktop --help`).

Open **Docker Desktop → Settings → Resources → Advanced** and set:

- **CPUs: 8**
- **Memory: 12 GB**
- **Swap: 2 GB**

Then **Apply & restart**, and wait for the whale icon to stop animating.

- [ ] **Step 4: Verify both readings**

```bash
jq '{Cpus, MemoryMiB, SwapMiB}' ~/Library/Group\ Containers/group.com.docker/settings-store.json
docker info --format '{{.NCPU}} CPUs / {{.MemTotal}} bytes'
```

Expected: the settings file reports `{ "Cpus": 8, "MemoryMiB": 12288, "SwapMiB": 2048 }`, and `docker info` reports `8 CPUs` and a `MemTotal` of about 12.6e9 bytes — roughly 255 MiB under the allocation, as the Background section notes. An exact memory match is not expected; `8 CPUs` is.

- [ ] **Step 5: Nothing to commit**

Docker Desktop's settings are not in the repo. The record of this change is committed in Task 3.

---

## Task 2: Measure this machine and write `config/machine.json`

**Files:**
- Create: `config/machine.json` (gitignored — never committed)
- Writes logs to: `workareas/machine-tuning/<timestamp>/`

**Preconditions:** Task 1 done and Docker restarted; the stack lease free; nothing else heavy running. This takes about an hour, during which the machine should be left alone.

- [ ] **Step 1: Confirm there is no settings file yet, and the lease is free**

```bash
tim build workers
tim docker lease status
```

Expected: `This machine has no settings file, so every FIT and E2E run uses its own script's worker count.` and a free lease. If `tim build workers` already prints counts, a `config/machine.json` exists; read it before overwriting, because `tim build tune` keeps anything in the file it does not measure.

- [ ] **Step 2: Run the tune in the background**

A foreground Bash call is capped at ten minutes and this takes about an hour, so run it detached and keep the output:

```bash
tim build tune > ~/git/defra/trade-imports-workspace/workareas/machine-tuning/tune.log 2>&1
```

Run it with `run_in_background: true`. It takes the stack lease, starts the stack from local source, and times the four rungs in the Background table at 2, 3 and 4 workers — twelve runs.

- [ ] **Step 3: Watch it, without loading the machine**

```bash
tail -5 ~/git/defra/trade-imports-workspace/workareas/machine-tuning/tune.log
```

Poll this every few minutes. Run nothing else: a test suite beside the tune measures the wrong machine. Do not start the stack by hand — the tune holds the lease itself.

- [ ] **Step 4: Read the report**

```bash
cat ~/git/defra/trade-imports-workspace/workareas/machine-tuning/tune.log
```

Expected shape, from `renderTuneText` in `tim/src/commands/build/tune.js`:

```
Timed 4 rungs at 2, 3 and 4 workers each, with the workspace stack up.
  trade-imports-plants-frontend/fit: 4 workers. <the rule's reason>
    2 workers: 116s, passed, 0 pages swapped out, slowest shell start 15 ms
    3 workers: 90s, passed, 0 pages swapped out, slowest shell start 22 ms
    4 workers: 82s, passed, 0 pages swapped out, slowest shell start 40 ms
  ...
Wrote these counts to <workspace>/config/machine.json. The gate and the build loop use them from their next run.
Each run's log, samples and summary are in <workspace>/workareas/machine-tuning/<timestamp>.
```

The figures above are the 22 October readings from `machine-tuning.md`, shown so you recognise the format — this machine's own will differ, and Task 3 records whatever they are.

**If it refused instead**, the first line reads `Nothing was timed: tim could not take the workspace stack. <reason>` and it exits 1. Three reasons and what each needs:

- *The lease is held.* `tim docker lease status` names the holder. Wait, or release it if it belongs to a dead run: `tim docker lease release --holder "<the holder it names>" --json`.
- *The stack would not start.* Read the reason. A Maven Central 502 through Docker egress is the known one from this theme — it is transient, so run Step 2 again.
- *A rung's repo would not install.* The reason names the repo; fix the install (`npm ci` in that repo) and run Step 2 again.

- [ ] **Step 5: Verify the file is there and the counts are live**

```bash
jq . ~/git/defra/trade-imports-workspace/config/machine.json
tim build workers
```

Expected: the file holds a `workers` object keyed `<repo>/<rung>` with an entry per tuned rung, plus `parallelRepos` and `stackAfterLocal`; and `tim build workers` now prints those counts instead of the no-settings-file line.

- [ ] **Step 6: Confirm it is not staged**

```bash
git -C ~/git/defra/trade-imports-workspace status --short config/
```

Expected: no output. `config/machine.json` is gitignored at `.gitignore:72` — one file per machine. **Never force-add it.** There is nothing to commit in this task; Task 3 commits the record.

---

## Task 3: Record what this machine measured

**Files:**
- Modify: `.claude/skills/requirements-pipeline/references/machine-tuning.md` (add one dated section, after the existing `## Measured on 22 October 2026` section)

The reference file keeps a dated section per machine measured. The 22 October one stays exactly as it is — it describes a different machine, and `config/machine.example.json` still matches it.

- [ ] **Step 1: Write the new section**

Add this to `machine-tuning.md`, immediately after the final subsection of `## Measured on 22 October 2026` (the `### What happened on 21 October` block). Head it with the date the tune actually ran. Every number comes from a named source — fill each cell from that source, and leave no cell guessed:

- **Wall, result, swapped out, slowest shell** per rung and worker count: the `  N workers: ...` lines of the tune report, or `wallSeconds`, `exitCode`, `swapoutPages` and `shellStartMs.max` in `workareas/machine-tuning/<timestamp>/<label>.json`.
- **Chosen count and its reason**: the `  <repo>/<rung>: N workers. <reason>` line of the tune report.
- **Docker VM memory after E2E**: `docker run --rm alpine free -m`, run once with the stack still up.

````markdown
## Measured on <date the tune ran>

Apple Silicon, 12 cores, 18 GiB. Docker Desktop 8 CPUs, 12 GiB and 2 GiB swap
— raised from 12 CPUs and 8092 MiB, which gave the VM every core and less
memory than the 22 October floor. Measured by `tim build tune` with the whole
stack up in dev mode and nothing else running.

### FIT and E2E, stack up

| Rung | Workers | Wall | Result | Swapped out | Slowest shell start |
|---|---|---|---|---|---|
| plants/fit | 2 | | | | |
| plants/fit | 3 | | | | |
| plants/fit | 4 | | | | |
| animals/fit | 2 | | | | |
| animals/fit | 3 | | | | |
| animals/fit | 4 | | | | |
| ins-frontend/fit | 2 | | | | |
| ins-frontend/fit | 3 | | | | |
| ins-frontend/fit | 4 | | | | |
| ins-tests/e2e | 2 | | | | |
| ins-tests/e2e | 3 | | | | |
| ins-tests/e2e | 4 | | | | |

Embolden the count chosen for each rung.

### Settings chosen for this machine

In `config/machine.json`, written by the tune:

```json
```

Paste the file. Then one bullet per rung saying why that count won, in the
tune report's own words.

### Docker Desktop

- **CPUs: 8 of 12.** Set in this run. The containers peak at about 3 CPUs'
  worth, and giving the VM every core is what overloaded the machine on
  21 October.
- **Memory: 12 GiB.** Raised from 8092 MiB, below the 10 GiB floor the
  22 October run established. `docker run --rm alpine free -m` after E2E
  reported <reading> — <whether the VM still filled its swap>.
- **Swap: 2 GiB.** Raised from 1 GiB, which filled during E2E at 10 GiB of
  memory.

If the VM still swaps at 12 GiB, raise it again rather than cutting the stack:
`run-stack.sh --profile` and `-e <service>` drop containers a run does not
need, and `mssql` is the largest at about 1.1 GiB.
````

- [ ] **Step 2: Check the record against the file it describes**

```bash
jq . ~/git/defra/trade-imports-workspace/config/machine.json
grep -n "CPUs: 8 of 12" .claude/skills/requirements-pipeline/references/machine-tuning.md
```

Expected: the JSON block in the new section is character-for-character the file, and every rung in the file has a row and a bullet. A count in the prose that is not in the file is the failure this step catches.

- [ ] **Step 3: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/references/machine-tuning.md
git -C ~/git/defra/trade-imports-workspace commit -m "chore(NO_JIRA): record this machine's gate settings and Docker allocation"
```

---

## Task 4: `tim sonar gate` — reading the gate

**Files:**
- Modify: `tim/src/clients/sonar-client.js`
- Test: `tim/src/clients/sonar-client.test.js`

The client gets one more read-only call. It returns data and says nothing: the words are the command's job in Task 5, exactly as `listIssues` and `renderIssues` are split today.

- [ ] **Step 1: Write the failing tests**

Add to `tim/src/clients/sonar-client.test.js`, after the `describe('listIssues', ...)` block. The fixture is the live response shape from the Background section.

```javascript
describe('qualityGate', () => {
  const condition = (over) => ({
    status: 'OK',
    metricKey: 'new_coverage',
    comparator: 'LT',
    periodIndex: 1,
    errorThreshold: '90',
    actualValue: '97.9',
    ...over
  })

  test('returns the status and every condition the gate weighed on a pull request', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query({ projectKey: PROJECT, pullRequest: '435' })
      .reply(200, { projectStatus: { status: 'OK', conditions: [condition()] } })

    const result = await createSonarClient({ token: '' }).qualityGate(
      'trade-imports-plants-frontend',
      { pullRequest: 435 }
    )

    expect(result).toEqual({
      project: PROJECT,
      pullRequest: '435',
      branch: null,
      status: 'OK',
      conditions: [
        {
          metric: 'new_coverage',
          status: 'OK',
          comparator: 'LT',
          threshold: '90',
          actual: '97.9'
        }
      ],
      url: `${BASE}/summary/new_code?id=${PROJECT}&pullRequest=435`
    })
  })

  test('carries the threshold and the measurement of a failing condition', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(200, {
        projectStatus: {
          status: 'ERROR',
          conditions: [
            condition({
              status: 'ERROR',
              metricKey: 'new_blocker_violations',
              comparator: 'GT',
              errorThreshold: '0',
              actualValue: '3'
            })
          ]
        }
      })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT, {
      pullRequest: 435
    })

    expect({ status: result.status, condition: result.conditions[0] }).toEqual({
      status: 'ERROR',
      condition: {
        metric: 'new_blocker_violations',
        status: 'ERROR',
        comparator: 'GT',
        threshold: '0',
        actual: '3'
      }
    })
  })

  test('links the branch it was asked about', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query({ projectKey: PROJECT, branch: 'main' })
      .reply(200, { projectStatus: { status: 'OK', conditions: [] } })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT, {
      branch: 'main'
    })

    expect({ branch: result.branch, url: result.url }).toEqual({
      branch: 'main',
      url: `${BASE}/summary/new_code?id=${PROJECT}&branch=main`
    })
  })

  test('reports NONE with no conditions when nothing has been analysed', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(200, { projectStatus: { status: 'NONE', conditions: [] } })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT)

    expect({ status: result.status, conditions: result.conditions }).toEqual({
      status: 'NONE',
      conditions: []
    })
  })

  test('sends SONAR_TOKEN as a bearer token when one is set', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .matchHeader('authorization', 'Bearer secret')
      .reply(200, { projectStatus: { status: 'OK', conditions: [] } })

    const result = await createSonarClient({ token: 'secret' }).qualityGate(
      PROJECT
    )

    expect(result.status).toBe('OK')
  })

  test('maps a refusal to the same TimError the issue search does', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(404, {})

    await expect(
      createSonarClient({ token: '' }).qualityGate(PROJECT)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- sonar-client
```

Expected: the six new tests fail with `client.qualityGate is not a function`. The `listIssues` tests still pass.

- [ ] **Step 3: Share the scope parameters between the two calls**

`listIssues` builds its `pullRequest`/`branch` params inline. The gate call needs the same three lines, so lift them first. In `tim/src/clients/sonar-client.js`, add after `fileOf`:

```javascript
const scopeParamsOf = ({ pullRequest, branch }) => {
  const params = new URLSearchParams()
  if (pullRequest !== undefined) params.set('pullRequest', String(pullRequest))
  if (branch !== undefined) params.set('branch', branch)
  return params
}
```

Then in `listIssues`, replace these five lines:

```javascript
      const scopeParams = new URLSearchParams()
      if (pullRequest !== undefined) {
        scopeParams.set('pullRequest', String(pullRequest))
      }
      if (branch !== undefined) scopeParams.set('branch', branch)
```

with:

```javascript
      const scopeParams = scopeParamsOf({ pullRequest, branch })
```

The existing `listIssues` tests prove the refactor.

- [ ] **Step 4: Add the condition mapper and the call**

Add after `issueSummary`:

```javascript
const conditionSummary = ({
  status,
  metricKey,
  comparator,
  errorThreshold,
  actualValue
}) => ({
  metric: metricKey,
  status,
  comparator,
  threshold: errorThreshold ?? null,
  actual: actualValue ?? null
})
```

Add this method to the returned object, after `listIssues` — note the comma needed after `listIssues`'s closing brace, which is the last property today:

```javascript
    /**
     * The quality gate's verdict on a pull request, a branch or the main
     * branch, with every condition it weighed. A gate failure has no GitHub
     * job log, so this is the only machine-readable account of one.
     *
     * @param {string} project - repo name, with or without the DEFRA_ prefix
     * @param {object} [scope]
     * @param {string|number} [scope.pullRequest]
     * @param {string} [scope.branch]
     */
    qualityGate: async (project, { pullRequest, branch } = {}) => {
      const projectKey = projectKeyOf(project)
      const scopeParams = scopeParamsOf({ pullRequest, branch })
      const query = new URLSearchParams({ projectKey })
      for (const [name, value] of scopeParams) query.set(name, value)
      const data = await get(
        `/api/qualitygates/project_status?${query}`,
        `qualityGate(${projectKey})`
      )
      const scope = scopeParams.toString()
      return {
        project: projectKey,
        pullRequest: pullRequest === undefined ? null : String(pullRequest),
        branch: branch ?? null,
        status: data.projectStatus?.status ?? 'NONE',
        conditions: (data.projectStatus?.conditions ?? []).map(
          conditionSummary
        ),
        url: `${root}/summary/new_code?id=${projectKey}${scope ? `&${scope}` : ''}`
      }
    }
```

- [ ] **Step 5: Run them to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- sonar-client
```

Expected: every test in the file passes, the `listIssues` ones included.

- [ ] **Step 6: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add tim/src/clients/sonar-client.js tim/src/clients/sonar-client.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(NO_JIRA): read a SonarCloud quality gate's verdict and conditions"
```

---

## Task 5: `tim sonar gate` — the command

**Files:**
- Modify: `tim/src/commands/sonar/index.js`
- Test: `tim/src/commands/sonar/index.test.js`

**What it prints, and what it does not do.** It reports; it does not gate. Exit 0 whatever the verdict, like `tim sonar issues` — the pre-push hook and CI own the gating, and a reader that exited non-zero on a red gate would fail the fixer's own Bash call. When a failed condition counts violations, the render names the `tim sonar issues` command that lists them with file and line; when the only failures are coverage, duplication or hotspots, no issue list would explain them, so it does not.

- [ ] **Step 1: Write the failing tests**

In `tim/src/commands/sonar/index.test.js`, import `renderGate` alongside `renderIssues` at the top:

```javascript
import { renderIssues, renderGate } from './index.js'
```

Then add these blocks after `describe('renderIssues', ...)`:

```javascript
describe('renderGate', () => {
  const failing = {
    project: PROJECT,
    pullRequest: '435',
    branch: null,
    status: 'ERROR',
    url: `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`,
    conditions: [
      {
        metric: 'new_blocker_violations',
        status: 'ERROR',
        comparator: 'GT',
        threshold: '0',
        actual: '3'
      },
      {
        metric: 'new_coverage',
        status: 'ERROR',
        comparator: 'LT',
        threshold: '90',
        actual: '84.2'
      },
      {
        metric: 'new_security_rating',
        status: 'OK',
        comparator: 'GT',
        threshold: '1',
        actual: '1'
      }
    ]
  }

  test('names each failed condition with its threshold and what the code measured', () => {
    expect(renderGate(failing)).toBe(
      [
        `${PROJECT} PR 435: quality gate FAILED on 2 of 3 conditions`,
        '[FAILED] new_blocker_violations  0 allowed, 3 measured',
        '[FAILED] new_coverage  90 required, 84.2 measured',
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`,
        `The issues behind those conditions: \`tim sonar issues ${PROJECT} --pull-request 435\`.`
      ].join('\n')
    )
  })

  test('leaves out the issue command when no failed condition counts issues', () => {
    const text = renderGate({
      ...failing,
      conditions: [
        {
          metric: 'new_coverage',
          status: 'ERROR',
          comparator: 'LT',
          threshold: '90',
          actual: '84.2'
        }
      ]
    })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: quality gate FAILED on 1 of 1 conditions`,
        '[FAILED] new_coverage  90 required, 84.2 measured',
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('says a passing gate passed, and how many conditions it weighed', () => {
    const text = renderGate({
      ...failing,
      status: 'OK',
      conditions: failing.conditions.map((condition) => ({
        ...condition,
        status: 'OK'
      }))
    })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: quality gate passed on 3 conditions`,
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('says so when SonarCloud has analysed nothing', () => {
    const text = renderGate({ ...failing, status: 'NONE', conditions: [] })

    expect(text).toBe(
      [
        `${PROJECT} PR 435: no quality gate result — SonarCloud has not analysed it`,
        `https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=435`
      ].join('\n')
    )
  })

  test('names the branch it was asked about, and the branch issue command', () => {
    const text = renderGate({
      ...failing,
      pullRequest: null,
      branch: 'main',
      url: `https://sonarcloud.io/summary/new_code?id=${PROJECT}&branch=main`,
      conditions: [failing.conditions[0]]
    })

    expect(text).toContain(`${PROJECT} main: quality gate FAILED`)
    expect(text).toContain(`\`tim sonar issues ${PROJECT} --branch main\`.`)
  })
})

describe('tim sonar gate', () => {
  test('exits 2 with a USAGE error when given both a PR and a branch', async () => {
    const run = await runSonar([
      'gate',
      'trade-imports-plants-frontend',
      '--pull-request',
      '108',
      '--branch',
      'main'
    ])

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: 'Give --pull-request or --branch, not both.' }
    ])
  })

  test('exits 2 with a USAGE error for a PR that is not a number', async () => {
    const run = await runSonar([
      'gate',
      'trade-imports-plants-frontend',
      '--pull-request',
      'abc'
    ])

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: '--pull-request must be a PR number.' }
    ])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- commands/sonar
```

Expected: the `renderGate` tests fail with `renderGate is not a function`, and the two usage tests fail because `gate` is not a known subcommand.

- [ ] **Step 3: Write the renderer**

In `tim/src/commands/sonar/index.js`, add after `issueLine`:

```javascript
const METRICS_NO_ISSUE_EXPLAINS = [
  'new_coverage',
  'new_duplicated_lines_density',
  'new_security_hotspots_reviewed'
]

const measurement = ({ comparator, threshold, actual }) =>
  comparator === 'LT'
    ? `${threshold} required, ${actual} measured`
    : `${threshold} allowed, ${actual} measured`

const conditionLine = (condition) =>
  `[FAILED] ${condition.metric}  ${measurement(condition)}`

const issueCommandFor = (project, failed, { pullRequest, branch }) => {
  const countsIssues = failed.some(
    ({ metric }) => !METRICS_NO_ISSUE_EXPLAINS.includes(metric)
  )
  if (!countsIssues) return []
  const scope = pullRequest
    ? `--pull-request ${pullRequest}`
    : branch
      ? `--branch ${branch}`
      : ''
  const command = ['tim sonar issues', project, scope].filter(Boolean).join(' ')
  return [`The issues behind those conditions: \`${command}\`.`]
}
```

Then the renderer itself, after `renderIssues`:

```javascript
export const renderGate = ({
  project,
  pullRequest,
  branch,
  status,
  conditions,
  url
}) => {
  const where = pullRequest ? `PR ${pullRequest}` : (branch ?? 'main branch')
  const failed = conditions.filter((condition) => condition.status === 'ERROR')
  if (status === 'NONE') {
    return `${project} ${where}: no quality gate result — SonarCloud has not analysed it\n${url}`
  }
  if (failed.length === 0) {
    return `${project} ${where}: quality gate passed on ${conditions.length} conditions\n${url}`
  }
  return [
    `${project} ${where}: quality gate FAILED on ${failed.length} of ${conditions.length} conditions`,
    ...failed.map(conditionLine),
    url,
    ...issueCommandFor(project, failed, { pullRequest, branch })
  ].join('\n')
}
```

- [ ] **Step 4: Register the subcommand**

In the same file, inside `register`, add after the `issues` subcommand's `.action(...)` block:

```javascript
  sonar
    .command('gate <project>')
    .description(
      'Why a SonarCloud quality gate passed or failed on a pull request, a branch or the main branch: its status, and every condition it failed with the threshold and what the code measured. A gate failure has no GitHub job log — the scan step passes and SonarCloud posts its verdict as a check of its own — so this is how to read one. The project is the repo name, with or without the DEFRA_ prefix.'
    )
    .option('--pull-request <number>', "The pull request's own gate")
    .option('--branch <name>', "That branch's gate")
    .addHelpText(
      'after',
      '\nExample:\n  tim sonar gate trade-imports-animals-frontend --pull-request 435\n\nIt reports and exits 0 whatever the verdict. A public project needs no token; set SONAR_TOKEN for a private one.'
    )
    .action(function gateAction(project, options, command) {
      return makeClientAction({
        client: () => createSonarClient(),
        call: async (client) => client.qualityGate(project, scopeOf(options)),
        renderText: renderGate,
        timVersion
      }).call(this, project, options, command)
    })
```

`scopeOf` already refuses both scopes at once and a non-numeric PR, which is what the two usage tests assert.

- [ ] **Step 5: Run them to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- commands/sonar
```

Expected: every test in the file passes.

- [ ] **Step 6: Prove it against the real gate**

```bash
tim sonar gate trade-imports-animals-frontend
tim sonar gate trade-imports-animals-frontend --json
```

Expected: a line naming the project and `main branch`, the verdict, any failed conditions and the summary link; and a `result` object in the JSON envelope carrying `status` and `conditions`. On 29 October 2026 this project's main-branch gate was `OK` on nine conditions, so a pass with nine conditions is the likely reading. Exit code 0 either way.

- [ ] **Step 7: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add tim/src/commands/sonar/index.js tim/src/commands/sonar/index.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(NO_JIRA): add tim sonar gate, so a red quality gate can be read"
```

---

## Task 6: Put `tim sonar gate` in the CI fixer's hands

**Files:**
- Modify: `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js`
- Test: `tim/src/backlog/workflow-contract.test.js`

The loop has two CI fixers — the branch-lifecycle one (`branchCiFixPrompt`, line 3888) and the full-lifecycle one (inline, line 5845). Both open by telling the fixer to read the failing job's log, and that is exactly the instruction that finds nothing when the gate is what failed. Both get the same paragraph.

- [ ] **Step 1: Write the failing tests**

In `tim/src/backlog/workflow-contract.test.js`, add one test beside each fixer's existing prompt tests.

Beside the branch fixer's (next to `'binds the house rules into the branch CI fixer'`, about line 5453), where `runMergeRow` and `FOUND` are already in scope:

```javascript
      test('tells the branch CI fixer how to read a quality gate that has no job log', async () => {
        const run = await runMergeRow(
          FOUND,
          { green: false, failures: ['lint'], summary: 'red' },
          null
        )

        expect(promptOf(run, 'inc-900 ci fix 1')).toContain(
          'tim sonar gate <the repo name> --pull-request <n>'
        )
      })
```

Beside the full-lifecycle fixer's (next to `'binds the house rules into the CI fixer'`, about line 7313), using `runFactory` as those tests do:

```javascript
      test('tells the CI fixer how to read a quality gate that has no job log', async () => {
        const run = await runFactory(
          {},
          {
            'inc-020 ci watch': {
              green: false,
              failures: ['unit: red'],
              summary: 'red'
            }
          }
        )

        expect(promptOf(run, 'inc-020 ci fix 1')).toContain(
          'tim sonar gate <the repo name> --pull-request <n>'
        )
      })
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: both new tests fail, each reporting that the prompt does not contain the substring. Every other test in the file passes.

- [ ] **Step 3: Add the rule**

In `increment-build-loop.js`, add this immediately after the `ciFixStandards` template literal ends (the line `reads each one before the watcher looks again.\``, about line 2028) and before `const ciFixCommitCommand`:

```javascript
const SONAR_GATE_RULE = `   A SONARCLOUD QUALITY GATE FAILURE HAS NO JOB LOG. The scan step inside the workflow passes; SonarCloud weighs the
   gate afterwards and posts its verdict as a check of its own, so \`gh run view --log-failed\` shows you nothing at
   all. Read it with \`tim sonar gate <the repo name> --pull-request <n>\`, which names every failed condition with
   its threshold and what the code measured, then \`tim sonar issues <the repo name> --pull-request <n>\` for the
   issues behind a condition that counts violations. A fixer has spent all three attempts blind on one of these.`
```

- [ ] **Step 4: Bind it into the branch CI fixer**

In `branchCiFixPrompt`, step 1 ends with the Playwright instruction. Replace this block:

```
   \`gh run view <run-id> --repo <ghRepo> --log-failed > ${WORKAREA_TILDE}/logs/${id}-ci-fail-${attempt}.log 2>&1\`
   gives you the log. Read that file ONCE.
   **For a Playwright failure the evidence is \`test-results/*/error-context.md\` in the repo, NOT the tail of the
   run log.** Go and read those files.
```

with the same four lines followed by one more:

```
   \`gh run view <run-id> --repo <ghRepo> --log-failed > ${WORKAREA_TILDE}/logs/${id}-ci-fail-${attempt}.log 2>&1\`
   gives you the log. Read that file ONCE.
   **For a Playwright failure the evidence is \`test-results/*/error-context.md\` in the repo, NOT the tail of the
   run log.** Go and read those files.
${SONAR_GATE_RULE}
```

The `${attempt}` in the first line is what makes this block unique to the branch fixer — the full-lifecycle one says `${ciAttempt}`. Match on all four lines so the edit lands once.

- [ ] **Step 5: Bind it into the full-lifecycle CI fixer**

The same block appears in the inline prompt at about line 5858, with `${ciAttempt}` in place of `${attempt}`. Make the same insertion there:

```
   \`gh run view <run-id> --repo <ghRepo> --log-failed > ${WORKAREA_TILDE}/logs/${id}-ci-fail-${ciAttempt}.log 2>&1\`
   gives you the log. Read that file ONCE.
   **For a Playwright failure the evidence is \`test-results/*/error-context.md\` in the repo, NOT the tail of the
   run log.** Go and read those files.
${SONAR_GATE_RULE}
```

- [ ] **Step 6: Run them to verify they pass**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test -- workflow-contract
```

Expected: both new tests pass and the whole file stays green. A failure anywhere else means the insertion landed inside the wrong template literal — check which prompt took the line.

- [ ] **Step 7: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add .claude/skills/requirements-pipeline/workflow/increment-build-loop.js tim/src/backlog/workflow-contract.test.js
git -C ~/git/defra/trade-imports-workspace commit -m "feat(NO_JIRA): tell both CI fixers a quality gate failure has no job log"
```

---

## Task 7: Document `tim sonar gate`

**Files:**
- Modify: `tim/README.md`

The README already has a section headed `### \`tim sonar issues\` — why a SonarCloud gate failed`, which is now only the second half of the answer. The gate reader goes in front of it, and the heading stops over-claiming.

- [ ] **Step 1: Retitle the existing section**

Change the heading:

```markdown
### `tim sonar issues` — why a SonarCloud gate failed
```

to:

```markdown
### `tim sonar issues` — the issues a gate counted
```

Leave the rest of that section as it is.

- [ ] **Step 2: Add the gate section in front of it**

Insert this immediately before the retitled heading:

````markdown
### `tim sonar gate` — why a SonarCloud gate failed

A SonarCloud gate failure has no GitHub job log. The scan step inside the
workflow passes, and SonarCloud posts its verdict afterwards as a check of its
own, so `gh run view --log-failed` shows nothing. This is how to read one.

```bash
tim sonar gate trade-imports-animals-frontend --pull-request 435 [--json]
tim sonar gate trade-imports-animals-frontend --branch main [--json]
tim sonar gate trade-imports-animals-frontend            # the main branch
```

- Each failed condition names its metric, the threshold and what the code
  measured: `[FAILED] new_coverage  90 required, 84.2 measured`.
- When a failed condition counts violations, the last line gives the
  `tim sonar issues` command that lists them with file and line. Coverage,
  duplication and hotspot conditions get no such line — no issue list explains
  them.
- It reports and exits 0 whatever the verdict. The pre-push hook and CI own the
  gating.
- `--json` puts `{project, pullRequest, branch, status, conditions, url}` in
  `result`, where `status` is `OK`, `ERROR` or `NONE` and each condition is
  `{metric, status, comparator, threshold, actual}`.
- A public project needs no token. `SONAR_TOKEN` is sent when set, so a
  private project works too.
- Giving both `--pull-request` and `--branch`, or a PR that is not a number,
  fails with `USAGE` before any request is sent.
````

- [ ] **Step 3: Check the documentation against the code**

```bash
tim sonar gate --help
grep -n "tim sonar gate" tim/README.md .claude/skills/requirements-pipeline/workflow/increment-build-loop.js
```

Expected: the help text's options match the README's flags, and the loop's rule and the README agree on the command's spelling.

- [ ] **Step 4: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add tim/README.md
git -C ~/git/defra/trade-imports-workspace commit -m "docs(NO_JIRA): document tim sonar gate beside tim sonar issues"
```

---

## Task 8: Write the `main`-merge cadence into `HOW-TO-BUILD.md`

**Files:**
- Modify: `workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md`

The documents branch took `main` in twice in one day, neither time planned: once by hand on 27 October, and once as `inc-040` after the second move left the animals frontend pull request conflicting. GitHub runs no checks on a conflicting pull request, so the last row could not be proved and the run stopped at `ci-red`. `54e335d5` already made the loop stop such a row at once as `pr-conflict` rather than spending CI fix attempts on it, so what is left is a cadence to keep, not a failure to detect.

- [ ] **Step 1: Add the section**

Insert this after the paragraph ending `open Claude Code at the workspace root and say the phrase for the theme.` and before `## The business tickets, around every theme`:

````markdown
## Taking `main` in while a theme builds

A theme branch is cut from `main` and lives for days, so `main` moves under
it. A pull request that conflicts with its base gets no checks from GitHub at
all, so the row cannot be proved and the run stops. The loop now stops such a
row at once as `pr-conflict` rather than spending its CI fix attempts, which
makes this a cadence to keep rather than a problem to spot.

**One merge row per move, played through the loop. Never a hand merge.**

- **Never merge `main` in by hand on a theme branch.** A hand merge is
  unreviewed, unproved and invisible to the backlog, and leaves the next row to
  discover it. Both of the documents theme's merges were noticed only because
  its pull request stopped running checks.
- **Check before every launch**, in each repo the theme builds:

  ```bash
  git -C ~/git/defra/trade-imports-workspace/repos/<repo> fetch origin
  git -C ~/git/defra/trade-imports-workspace/repos/<repo> rev-list --count HEAD..origin/main
  ```

  Any count above zero, or a pull request GitHub reports as conflicting
  (`gh pr view <url> --json mergeable,mergeStateStatus`), calls for a merge row.
- **Write it as a row and put it before the rows that need it.** One row covers
  every repo that needs the merge — one key per repo in `merge`, each of them
  also in `repos`. Save the row to a file and add it:

  ```bash
  tim backlog add shared/design-release-2-1/themes/<theme> --from merge-row.json --before <the next todo row> --write --json
  ```

  To set the ref on a row that exists already:

  ```bash
  tim backlog set shared/design-release-2-1/themes/<theme> <id> --merge frontend=origin/main --json
  ```

- **Give the row the resolution, not just the instruction.** The loop plans,
  reviews and proves a merge row like any other, so its acceptance criteria say
  which side wins in each conflicting file. That is what makes it worth a row
  rather than a hand merge: `inc-040`'s shared FIT helper needed both sides
  reconciled, and the review caught that the import its criteria named was the
  wrong predicate.
- **`gatePhases` follows the theme.** An `e2e: "ci"` theme's rows carry
  `gatePhases: []` and prove themselves on the pull requests; a merge row in
  that theme does the same.

The template, from the documents theme's `inc-040`:

```json
{
  "id": "inc-NNN",
  "title": "The theme branch takes in what main has landed since it was cut",
  "kind": "chore",
  "theme": "<theme>",
  "status": "todo",
  "repos": ["frontend", "tests"],
  "merge": { "frontend": "origin/main", "tests": "origin/main" },
  "gatePhases": [],
  "dependsOn": [],
  "detail": "What has landed on main since the branch was cut, which files conflict, and why each one conflicts.",
  "acceptanceCriteria": [
    "origin/main is merged into the theme branch in <each repo>, as one two-parent merge commit each, with no conflict markers left in any file.",
    "<each conflicting file> keeps <which side's work, named>.",
    "Every pull request reports no conflict with its base, so GitHub runs its checks again.",
    "Every pull request is green."
  ],
  "notes": [],
  "sources": [],
  "requirements": [],
  "openQuestions": []
}
```

Then check it before launching:

```bash
tim backlog check shared/design-release-2-1/themes/<theme>
```
````

- [ ] **Step 2: Check the row template against the row it copies**

```bash
jq '.increments[] | select(.id=="inc-040") | {kind, repos, merge, gatePhases}' workareas/shared/design-release-2-1/themes/documents/backlog.json
```

Expected: `kind: "chore"`, both repo keys, `merge` with a key per repo, and `gatePhases: []` — the same fields, in the same shape, as the template. A field in the template that is not in the real row, or the other way round, is what this step catches.

- [ ] **Step 3: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add workareas/shared/design-release-2-1/themes/HOW-TO-BUILD.md
git -C ~/git/defra/trade-imports-workspace commit -m "docs(NO_JIRA): state the main-merge cadence a theme branch keeps"
```

---

## Task 9: Correct the design document

**Files:**
- Modify: `workareas/shared/build-loop-efficiency/DESIGN.md`

A4's first bullet names a flag that does not exist, and its second bullet now has an answer.

- [ ] **Step 1: Replace the two bullets**

In the `## A4 — Machine and process` section, replace:

```markdown
- **`tim build tune --write`** has never been run here: `config/machine.json` does not exist, so
  the gate runs every FIT and e2e rung at the worker count its own script says. Write it.
- **Docker Desktop's allocation** — 8.2GB of this machine's 19.3GB, and 12 CPUs shared with the
  host. Now optional rather than blocking, because a `"ci"` run never starts the stack.
```

with:

```markdown
- **`tim build tune`** had never been run here: `config/machine.json` did not exist, so the gate
  ran every FIT and e2e rung at the worker count its own script says. Written now, and recorded in
  `machine-tuning.md`. (Writing is the default; `--dry-run` is the opt-out. There is no `--write`.)
- **Docker Desktop's allocation** — was 8.2GB of this machine's 19.3GB, and 12 CPUs shared with the
  host; now 12GB and 8 CPUs, so the host keeps four cores and the Java services stay off the VM's
  swap. Optional rather than blocking, because a `"ci"` run never starts the stack.
```

- [ ] **Step 2: Commit**

```bash
git -C ~/git/defra/trade-imports-workspace add workareas/shared/build-loop-efficiency/DESIGN.md
git -C ~/git/defra/trade-imports-workspace commit -m "docs(NO_JIRA): correct A4's tune flag and record the Docker allocation"
```

---

## Verification before the pull request

- [ ] **Every test green**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim test
```

Expected: the whole tim suite passes. If `src/distil/trace.test.js` is red, `tim/node_modules` is stale: run `npm ci` with the shell inside `tim/`, which is the one command `--prefix` cannot do.

- [ ] **Format, then lint**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim run format
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
```

Expected: format rewrites nothing of substance, lint exits 0.

- [ ] **The gate reader works on a real pull request**

```bash
gh pr list --repo DEFRA/trade-imports-animals-frontend --state open --json number --jq '.[0].number'
tim sonar gate trade-imports-animals-frontend --pull-request <that number>
```

Expected: a verdict with its conditions, or the `no quality gate result` line if SonarCloud has not analysed that PR. Either is a pass; a `TimError` is not.

- [ ] **The counts this machine measured are live**

```bash
tim build workers
```

Expected: a count per tuned rung, not the no-settings-file line.

- [ ] **Nothing machine-specific is staged**

```bash
git -C ~/git/defra/trade-imports-workspace status --short
```

Expected: `config/machine.json` does not appear, and nothing under `workareas/machine-tuning/` is staged.

- [ ] **Push and raise the pull request**

```bash
git -C ~/git/defra/trade-imports-workspace push -u origin refs/heads/chore/NO_JIRA-build-loop-machine-and-process:refs/heads/chore/NO_JIRA-build-loop-machine-and-process
gh pr create --repo DEFRA/trade-imports-workspace --base main --head chore/NO_JIRA-build-loop-machine-and-process --title "Build loop: the machine and the process round it (A4 of the efficiency design)" --body-file <a body naming each of the four items and its evidence>
```

Then stop. CLAUDE.md rule 3: post the link and the evidence, and do not merge without the user's go in that conversation.

---

## What this plan does not do

- **No A1, A2 or A3.** A1 landed as #191. A2 (resume from the stage reached) and A3 (the rigour dial) are designed and unplanned.
- **No capacity reporter.** A3's intake table wants a line like `Docker 8.2/19.3GB, no machine.json — local e2e not viable`. Reading the allocation for that line belongs to A3's intake; this plan changes the allocation, it does not teach anything to read it.
- **No gating from `tim sonar gate`.** It exits 0 on a failed gate. The pre-push hook (`tools/sonar/sonar-push-check.sh`) and CI's own analysis own the gating, and a reader that exited non-zero would fail the fixer's own Bash call.
- **No change to CI.** Nothing here touches a workflow file, and `config/machine.json` is read only by the gate and the loop's stages — CI does not go through the gate.
- **No new sonar MCP server, and no change to the eight repos' `.claude/` integrations.** `tim sonar gate` reads the public web API, so it works from the workspace root with no container running.
- **No `e2e: "local"` run proving the new allocation.** Tasks 1–3 make local e2e viable again; whether a theme chooses it is the operator's call at BUILD intake.
