# Tuning the gate to a machine

`tim build gate` runs the same rungs on every machine (`gates.json`). How hard
it drives each one is a property of the machine, so it lives in a per-machine
file that is never committed:

- `~/.config/tim/machine.json`, or the path in `TIM_MACHINE_CONFIG`
- start from [`machine.example.json`](machine.example.json) beside this file

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

## Measuring a machine

Measure with the stack up, because the build loop holds it up for the whole
run. Run one suite at a time and nothing else.

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

Pick, per suite, the fewest workers past which the time stops falling. Back off
one if that count swaps (`swapoutPages` above zero) or the shell's worst start
time climbs past about 100 ms.

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

In [`machine.example.json`](machine.example.json):

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
