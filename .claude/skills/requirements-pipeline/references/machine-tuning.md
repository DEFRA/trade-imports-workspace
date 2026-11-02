# Tuning the gate to a machine

`tim build gate` runs the same rungs on every machine (`gates.json`). How hard
it drives each one is a property of the machine, so it lives in a per-machine
file inside the workspace that git ignores:

- `config/machine.json` at the workspace root, or the path in `TIM_MACHINE_CONFIG`
- [`config/machine.example.json`](../../../../config/machine.example.json) is the committed example

**Set it once per machine with `tim build tune`**, with the stack free and
nothing else heavy running. It takes the stack lease, starts the stack, times
every FIT and E2E rung in `gates.json` at 2, 3 and 4 workers one run at a time,
picks each rung's count by the rule under "Measuring a machine" below, writes
`config/machine.json` and gives the stack back. It takes about an hour.
`--dry-run` reports without writing; `--counts` times other counts. Each run's
log, samples and summary go to `workareas/machine-tuning/<time>/`.

| Setting | What it does |
|---|---|
| `workers["<repo>/<rung>"]` | Worker count for that FIT or E2E rung, passed as `--workers=N` after the rung's `scope`. Playwright takes the last `--workers`, so it overrides the script's own. Unit rungs never take one. |
| `parallelRepos` | Replaces `gates.json`'s: how many repos' unit and FIT rungs run at once. |
| `stackAfterLocal` | Replaces `gates.json`'s: whether the stack starts only after unit and FIT finish. |

A machine with no file runs as `gates.json` and each script say: the
frontends' `test:fit:ci` use `--workers=100%` (ins-frontend: Playwright's 50%),
and the E2E suite uses `PLAYWRIGHT_WORKERS` or Playwright's 50% of cores. CI
does not go through the gate, so nothing here changes CI.

The gate result lists each rung's `workers` and the `machine.config` it read.

`tim build workers` prints the same counts. The build loop runs it once at
launch and puts the counts in every stage's guard rails, so a FIT or E2E run a
stage makes itself (a red probe, a plan check, a reviewer's or fixer's check)
passes the same `--workers` as the gate. Without that, those runs take the
scripts' own default: `--workers=100%` started 10 browsers on the machine
below, two repos at once, and swapped out 208,000 pages in 20 seconds on 22
October. A change to the file reaches the gate at its next run and the stages
at the loop's next launch.

## Measuring a machine

`tim build tune` does this. To measure one suite by hand, measure with the
stack up, because the build loop holds it up for the whole run. Run one suite
at a time and nothing else.

```bash
tim docker lease status
tim docker lease acquire --holder "machine tuning" --json
M=~/git/defra/trade-imports-workspace/workareas/machine-tuning
R=~/git/defra/trade-imports-workspace/repos
for w in 2 3 4 6; do
  tim build measure --label animals-fit-w$w --out $M --cwd $R/trade-imports-animals-frontend -- npm run test:fit:ci -- --workers=$w
done
for w in 2 3 4; do
  tim build measure --label e2e-w$w --out $M --cwd $R/trade-imports-ins-tests -- npm run test:docker-compose -- --workers=$w
done
docker run --rm alpine free -m   # the Docker VM's own memory, beyond the containers
tim docker lease release --holder "machine tuning" --json
```

`tim build measure` samples load, free memory, swap, Docker memory and CPU, and
how long a shell takes to start (a stand-in for whether the terminal stays
usable) every 5 seconds, and writes `<label>.json`, `.csv` and `.log`.

Pick, per suite, the fewest workers past which the time stops falling (within
5% of the fastest). Back off one if that count swaps (`swapoutPages` above
zero) or the shell's worst start time climbs past 100 ms. `tim build tune`
applies exactly this rule.

## Measured on 22 October 2026

Apple Silicon, 10 cores (4 performance, 6 efficiency), 16 GB. Docker Desktop
6 CPUs and 10 GiB, VM disk on an external SSD. Every repo on `main`, the whole
stack up in dev mode. Swap was already about 2.9 GB used before each run.

### Stack

| Step | Time | Peak load | Docker containers | Notes |
|---|---|---|---|---|
| Stack start (`lease acquire`, dev mode, from source) | 4m 50s | 16.5 | 6.6 GiB | Started cleanly; ins-backend healthy first time |
| Stack idle | – | – | 6.6 GiB | Host 11.3 GiB in use, no swapping |
| Docker VM after E2E (`free -m` inside) | – | – | 8.4 of 9.7 GiB used | VM's own 1 GiB swap full, 1.3 GiB available |

### FIT, stack up

| Suite | Workers | Wall | Result | Peak load | Lowest free | Swapped out | Shell p95 / worst |
|---|---|---|---|---|---|---|---|
| plants (254) | 2 | 116s | pass | 17.6 | 41% | 0 | 15 / 15 ms |
| plants | 3 | 90s | pass | 29.7 | 38% | 0 | 22 / 22 ms |
| plants | **4** | **82s** | pass | 29.7 | 36% | 0 | 40 / 40 ms |
| plants | 6 | 87s | pass | 37.0 | 34% | 50,112 pages (0.8 GiB) | 46 / 46 ms |
| animals (477) | 2 | 333s | pass | 25.7 | 43% | 0 | 15 / 18 ms |
| animals | 3 | 285s | pass | 24.8 | 37% | 0 | 29 / 34 ms |
| animals | **4** | **234s** | pass | 18.5 | 36% | 23,620 pages (0.4 GiB) | 40 / 41 ms |
| animals | 6 | 233s | pass | 25.8 | 33% | 79,608 pages (1.2 GiB) | 78 / 186 ms |
| ins (56) | 2 | 17s | pass | 17.0 | 57% | 0 | 9 / 9 ms |
| ins | **3** | **13s** | pass | 10.5 | 52% | 0 | 8 / 8 ms |
| ins | 4 | 13s | pass | 6.7 | 48% | 0 | 11 / 11 ms |
| ins | 6 | 14s | pass | 6.4 | 40% | 0 | 8 / 8 ms |

### Backend and E2E, stack up

| Step | Workers | Wall | Result | Peak load | Lowest free | Swapped out | Docker peak | Shell worst |
|---|---|---|---|---|---|---|---|---|
| ins-backend `mvn -B verify` | – | 50s | pass (42 tests) | 4.6 | 54% | 0 | 6.5 GiB | 17 ms |
| ins-tests `test:docker-compose` (374) | 2 | 427s | 367 passed, 7 skipped | 6.0 | 47% | 0 | 7.2 GiB | 29 ms |
| ins-tests | **3** | **363s** | 367 passed, 7 skipped | 6.0 | 44% | 0 | 7.4 GiB | 20 ms |
| ins-tests | 4 | 352s | 367 passed, 7 skipped | 8.0 | 41% | 0 | 7.2 GiB | 13 ms |

Load average on macOS counts threads waiting on I/O and the Docker VM's vCPUs,
so it runs high (17 at idle just after the stack start). Swap and the shell's
start time are the better signals of a frozen terminal.

### Settings chosen for this machine

In [`config/machine.example.json`](../../../../config/machine.example.json):

- **FIT plants and animals: 4.** Past 4 the time stops falling (animals 234s
  at 4, 233s at 6) and swapping starts. This chip has 4 performance cores, and
  `--workers=100%` would start 10 browsers. Animals at 4 swapped a little
  (0.4 GiB); if the terminal lags during a gate, drop animals to 3 (285s, no swap).
- **FIT ins-frontend: 3.** The suite takes 13s from 3 workers up.
- **E2E: 3.** 363s against 352s at 4 and 427s at 2, no swap at any count. 3
  leaves room for a person typing beside the gate. Playwright's default here
  would be 5.
- **parallelRepos 1, stackAfterLocal true.** Kept as `gates.json` has them.
  Two FIT suites at 4 workers each would be 8 browsers, which is the point
  where swapping started. The stack start drives load to 16, so nothing else
  should overlap it.

Every suite now finishes well inside FIT's 900s global timeout (worst 333s, at 2
workers). The 900s timeout is not wrong for this machine at these settings,
so the scripts keep it.

### Docker Desktop

- **CPUs: 6 is enough.** The stack started in under 5 minutes and every E2E
  run passed. The containers peaked at about 3 CPUs' worth during E2E.
- **Memory: keep 10 GiB.** The containers alone peaked at 7.6 GiB, and inside
  the VM 8.4 of 9.7 GiB was in use with the VM's own swap full. 8 GiB would
  leave the Java services short.
- To give the Mac more memory, start a smaller stack rather than shrinking the
  VM. `mssql` is the biggest container (1.1 GiB) and the dev-mode Java services
  about 0.5 GiB each; `run-stack.sh --profile` and `-e <service>` drop the ones
  a run does not need.

### What happened on 21 October

- The 2-worker FIT setting came from a `gates.json` change that was never
  committed. Animals FIT on that branch (591 tests) hit the 900s timeout with
  519 passed.
- The same day's E2E took 1,315s at 2 workers; on 22 October it took 427s. With
  Docker at 10 CPUs and the gate's suites crowding 4 performance cores, the
  machine was overloaded. The timing failures came from that load, not from
  too few workers.
- The stack failure at 22:56 was the Docker daemon dying (a 502 from the Docker
  socket), the VM crash, not an ins-backend race. The one at 23:01 had
  ins-backend exit with code 1; its container log was not kept. A clean stack
  start on 22 October did not reproduce it.

## Measured on 29 October 2026

Apple Silicon, 12 cores, 18 GiB. Docker Desktop 8 CPUs, 10 GiB and 2 GiB swap
— the CPUs cut from 12, which was every core the machine has, and the memory
raised from 8092 MiB, which was below the floor the 22 October run set.
`tim build tune` with the whole stack up in dev mode, every repo on `main`.

**Read these as a worker-count cap, not as what this machine can do.** Every
figure below was measured with the whole stack up, because that is what
`tim build tune` does — and no gate run puts a FIT suite in those conditions.
`gates.json` sets `stackAfterLocal: true`, so `tim build gate` starts the stack
only once unit and FIT have finished (`tim/src/build/gate.js:456`), and an
`e2e: "ci"` build takes no lease at all, so nothing is up. The FIT numbers here
are therefore a worst case nobody runs, and the e2e numbers are for a rung an
`e2e: "ci"` run never asks for.

What the file is for on this machine is the cap: the narrow FIT runs individual
build-loop stages make themselves — a red probe, a plan check, a reviewer's or
fixer's local proof — take `--workers=100%` without it, which is ten browsers
for one spec file on a 12-core machine.

For the record of what was seen: animals FIT did not finish at 2 or 3 workers
against the 900s global timeout, and the e2e suite took 33.5 minutes at 2
workers while swapping 8.8 million pages. Against the 22 October machine's 234s
and 23,620 pages for animals FIT, this is a machine deep in swap — but it is
also a 641-test suite where that one was 477, measured under a stack the gate
would have deferred, on a host that began the run with 18 GB already swapped
out. Do not read a capability verdict into it, and do not re-run the tune to
settle it: under `e2e: "ci"` the question does not arise.

### FIT and E2E, stack up

| Rung | Workers | Wall | Result | Swapped out | Slowest shell start |
|---|---|---|---|---|---|
| plants/fit | 2 | 382s | 334 passed (6.2m) | 997,904 | 92 ms |
| plants/fit | 3 | 329s | 334 passed (5.4m) | 554,700 | 130 ms |
| plants/fit | **4** | **258s** | 334 passed (4.2m) | 553,933 | 42 ms |
| animals/fit | 2 | 907s | **timed out at 900s** | 1,088,568 | 150 ms |
| animals/fit | 3 | 907s | **timed out at 900s** | 642,692 | 200 ms |
| animals/fit | **4** | **757s** | 641 passed (12.5m) | 1,444,672 | 265 ms |
| ins-frontend/fit | 2 | 46s | 106 passed (41.3s) | 77,541 | 29 ms |
| ins-frontend/fit | 3 | 40s | 106 passed (36.4s) | 120,292 | 32 ms |
| ins-frontend/fit | **4** | **34s** | 106 passed (30.1s) | 96,856 | 39 ms |
| ins-tests/e2e | **2** | **2011s** | 562 passed, 12 skipped (33.5m) | 8,834,213 | 745 ms |

Runs, samples and summaries are in `workareas/machine-tuning/20261029T204923Z/`.
The e2e rung at 3 and 4 workers was never measured — see "Both runs were
killed" below.

### Settings chosen for this machine

`config/machine.json` was assembled by hand from the ten runs above, because the
tune was killed before it could write the file. Re-run `tim build tune` to
replace it with a measured one.

```json
{
  "parallelRepos": 1,
  "stackAfterLocal": true,
  "workers": {
    "trade-imports-plants-frontend/fit": 4,
    "trade-imports-animals-frontend/fit": 4,
    "trade-imports-ins-frontend/fit": 4,
    "trade-imports-ins-tests/e2e": 2
  }
}
```

- **Animals FIT: 4.** The only count that finishes. The rule's back-off does not
  apply when the lower counts fail outright.
- **Plants FIT: 4.** Fastest by 71s over 3 workers, and the *lowest* shell start
  time of the three counts (42 ms against 130 ms at 3).
- **ins-frontend FIT: 4.** Fastest, and the whole suite is half a minute.
- **E2E: 2.** One data point, and it passed. It is also a count this machine
  will not use: an `e2e: "ci"` build drops the e2e phase, and that is how a theme
  is built here. Kept so the key is not missing if somebody ever runs
  `e2e: "local"`, not because 2 is the measured answer.
- **parallelRepos 1, stackAfterLocal true.** As `gates.json` has them.

**Where this departs from the rule.** "Back off one if that count swaps" cannot
be applied here, because every count on this machine swaps — the back-off
assumes a lower count that does not. For plants and ins-frontend the lower count
swaps *more* than the chosen one, so backing off would have cost time and bought
no headroom. The counts above are the fastest completing count per rung, not the
rule's output.

### Docker Desktop

- **CPUs: 8 of 12.** Cut from 12. Giving the VM every core is what overloaded
  the machine on 21 October.
- **Memory: 10 GiB.** After the e2e run the VM reported 8,474 of 9,937 MiB in
  use, with 499 of its 2,048 MiB of swap used — using its swap but not filling
  it, where the 22 October machine at 10 GiB filled the 1 GiB it had.
- **12 GiB was tried first, and 10 GiB is no worse.** At 12 GiB
  (`workareas/machine-tuning/20261029T182839Z/`) animals FIT timed out at 2
  workers, passed at 3 in 739s and at 4 in 712s, swapping 1,272,332 pages at 4.
  At 10 GiB it times out at 2 *and* 3, and takes 757s at 4 swapping 1,444,672.
  Within the noise of a machine this far into swap, the allocation is not what
  decides it.
- **The host is the constraint, not the VM.** With the stack down, macOS still
  reported 16.5 GB of its 17.4 GB swap in use and 27% of memory free. The
  gate's suites put Playwright browsers on top of that, which is where the
  million-page swap-outs come from. Shrinking the VM hands memory to a host that
  is already paging; it does not make the suites fit.

### Both runs were killed

Two `tim build tune` runs on 29 October were killed mid-run by something outside
tim: the first after about 50 minutes, the second after about 1h46m, during the
e2e rung's second worker count. Neither wrote `config/machine.json`, and each
left the stack up with the lease still held by its dead process. Recover with
`tim docker lease release --holder "<the holder the status line names>"`, which
takes the stack down and clears the lease in one go. Expect to need it again.

### Two repos had no devDependencies

In the first run, plants FIT and ins-frontend FIT failed in 1 to 3 seconds at
every worker count, exit 127, on `sh: webpack: command not found` — neither repo
had its devDependencies installed, so `build:frontend` died before Playwright
started. Six of that run's twelve measurements were junk for that reason alone.

`tim build gate` installs a repo whose installed dependencies differ from its
`package-lock.json` before running its rungs. **`tim build tune` does not**, so
it measures whatever state the repos happen to be in. Installing both repos by
hand is what made the second run's frontend figures real.

`npm ci` has to run with the shell inside the repo. Under
`npm --prefix <repo> ci` it fails with `Missing: <package>@0.0.0 from lock file`
against a lockfile that is perfectly in step — the same trap `tim/CLAUDE.md`
records for tim's own install, and it applies to the service repos too.
