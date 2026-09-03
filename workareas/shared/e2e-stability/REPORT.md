
# E2E worker-scaling investigation

Date: 2026-09-03. Tests repo HEAD `0830b25`. Stack: `scripts/stack/run-stack.sh` from published `:latest` images (no `--dev`). Host: Apple M4 Max, 16 cores, 48 GiB; Docker Desktop VM 16 vCPUs, 32 GiB, Rosetta enabled. 28 instrumented runs: 10 at 8 workers, 3 at 12, 5 at 16, 3 at 24, 3 at 32 on one stack that was never restarted (the "w" series), then 2 at 8 and 2 at 12 on a freshly restarted stack (the "ctl" series).

## 1. The answer

The suite is not ten-runs-green at 8 workers. Of 10 consecutive 8-worker runs, 6 were green; of 12 including the fresh-stack controls, 7 were green (58%). No 8-worker run had a hard failure — every test passed once retries are counted — but 5 of 12 runs needed a retry, and two specs account for all of it: `addresses-picker.spec.ts` (2 runs) and the admin `dlq-events.spec.ts` "deletes all" test (4 runs). Both are spec defects that exist at every worker count, not load failures.

8 workers is the safe count on this machine. 12 workers is a knife-edge: 1 of 5 runs was green, and the long journeys run 25–29 s against a 30 s test budget. 16 workers and above are never green: the same three journey tests fail on both attempts in all five 16-worker runs, and the count of hard failures rises to 7–10 at 24–32.

16–32 workers is not reachable by adding workers. The `trade-imports-animals-frontend` container is a single Node process that is already at one core (105–133% CPU) from 8 workers upward, so total throughput is fixed and every extra worker only lengthens each test. Wall clock never falls as workers rise: median 115 s at 8, 121 s at 12, 139 s at 16, 150 s at 24, 156 s at 32. Making 16 green would take either a bigger test budget for six un-annotated journey tests (turns red into slow-green, saves no time) or a frontend that can use more than one core (cluster or replicas, plus a cheaper per-request cost) — and that second option is unmeasured.

## 2. The numbers

### Every run

| Label | Workers | Green | Wall (s) | Passed | Failed | Flaky | Peak load1 |
|---|---|---|---|---|---|---|---|
| w08-01 | 8 | yes | 111 | 176 | 0 | 0 | 7.37 |
| w08-02 | 8 | no | 110 | 175 | 0 | 1 | 6.96 |
| w08-03 | 8 | no | 127 | 174 | 0 | 2 | 6.25 |
| w08-04 | 8 | no | 125 | 175 | 0 | 1 | 7.56 |
| w08-05 | 8 | yes | 110 | 176 | 0 | 0 | 7.60 |
| w08-06 | 8 | no | 127 | 175 | 0 | 1 | 6.11 |
| w08-07 | 8 | yes | 114 | 176 | 0 | 0 | 5.00 |
| w08-08 | 8 | yes | 113 | 176 | 0 | 0 | 5.74 |
| w08-09 | 8 | yes | 115 | 176 | 0 | 0 | 8.34 |
| w08-10 | 8 | yes | 117 | 176 | 0 | 0 | 7.32 |
| w12-01 | 12 | no | 134 | 171 | 1 | 4 | 6.70 |
| w12-02 | 12 | no | 120 | 175 | 0 | 1 | 5.63 |
| w12-03 | 12 | no | 121 | 175 | 0 | 1 | 5.69 |
| w16-01 | 16 | no | 134 | 170 | 3 | 3 | 6.64 |
| w16-02 | 16 | no | 139 | 169 | 3 | 4 | 13.35 |
| w16-03 | 16 | no | 136 | 169 | 3 | 4 | 10.14 |
| w16-04 | 16 | no | 143 | 170 | 3 | 3 | 9.93 |
| w16-05 | 16 | no | 140 | 169 | 3 | 4 | 7.14 |
| w24-01 | 24 | no | 150 | 161 | 9 | 6 | 6.12 |
| w24-02 | 24 | no | 144 | 164 | 7 | 5 | 8.70 |
| w24-03 | 24 | no | 205 | 162 | 7 | 7 | 9.38 |
| w32-01 | 32 | no | 170 | 158 | 10 | 8 | 9.74 |
| w32-02 | 32 | no | 156 | 159 | 10 | 7 | 14.25 |
| w32-03 | 32 | no | 155 | 159 | 9 | 8 | 9.26 |
| ctl08-01 | 8 | yes | 115 | 176 | 0 | 0 | 6.34 |
| ctl08-02 | 8 | no | 121 | 175 | 0 | 1 | 5.18 |
| ctl12-01 | 12 | yes | 116 | 176 | 0 | 0 | 5.78 |
| ctl12-02 | 12 | no | 125 | 173 | 0 | 3 | 5.70 |

"Green" means zero failed and zero flaky. 177 tests are collected; 1 is skipped in every run, so passed + failed + flaky = 176. "Failed" means both attempts failed; "flaky" means the first attempt failed and the retry passed (`retries: 1` in `repos/trade-imports-animals-tests/utils/playwright/shared-config.ts`).

### By worker count

| Workers | Stack | Runs | Green | Median wall (s) | Worst wall (s) | Total failed | Total flaky |
|---|---|---|---|---|---|---|---|
| 8 | aged (w08-01..10) | 10 | 6 | 114.5 | 127 | 0 | 5 |
| 8 | fresh (ctl08) | 2 | 1 | 118 | 121 | 0 | 1 |
| 8 | all | 12 | 7 | 115 | 127 | 0 | 6 |
| 12 | aged (w12) | 3 | 0 | 121 | 134 | 1 | 6 |
| 12 | fresh (ctl12) | 2 | 1 | 120.5 | 125 | 0 | 3 |
| 12 | all | 5 | 1 | 121 | 134 | 1 | 9 |
| 16 | aged | 5 | 0 | 139 | 143 | 15 | 18 |
| 24 | aged | 3 | 0 | 150 | 205 | 23 | 18 |
| 32 | aged | 3 | 0 | 156 | 170 | 29 | 23 |

The 8-worker flakes, by spec: `dlq-events` "deletes all" 4 (w08-03, w08-04, w08-06, ctl08-02); `addresses-picker` 2 (w08-02, w08-03). Nothing else flaked at 8 workers in 12 runs.

There is no fresh-stack control at 16, 24 or 32 workers, and no run below 8 workers. Both gaps matter and are noted where they bite.

## 3. The scaling curve

Adding workers buys nothing. Median wall clock rises monotonically: 115 s at 8, 121 s at 12, 139 s at 16, 150 s at 24, 156 s at 32. On the fresh stack, 8 and 12 workers are indistinguishable (ctl08-01 115 s, ctl12-01 116 s). The suite is throughput-bound from 8 workers and there is no sub-8 cell, so the knee is at or below 8.

What it costs is latency per test, roughly in proportion to worker count, on every test that drives the animals frontend on `:3000`:

- `declaration.spec.ts` "renders the page controls" (a full `journey.toDeclaration()` in `beforeEach`): 17.7 s at 8 (w08-01), 25.0 s at 12 fresh (ctl12-01), 29.1 s at 12 aged (w12-01), 30.4 s timeout at 16 (w16-01), 35.2 s on both attempts at 24 (w24-01).
- `cph-number.spec.ts` (`journey.toCphNumber()` in `beforeEach`): 10.1–10.6 s at 8, 13.5–14.2 s at 12 fresh, 16.8–18.5 s at 12 aged, 22.8–24.0 s at 16, 30.1–30.6 s at 24 (fails, retries pass at 23–27 s in the tail).
- `all-operators.spec.ts` (carries `test.slow()`, 90 s budget): 17.9 s at 8, 30.2 s at 12 fresh, 35.3 s at 16, 52.0 s at 24, 75.9 s at 32.
- `amend-resubmit.spec.ts` (`test.slow()`): 21.7 s at 8, 37.4 s at 12 fresh, 46.5 s at 16, about 72 s at 24, 78–91 s at 32.

The stretch is about 1.5x from 8 to 12 on a like-for-like fresh stack, 2.0–2.6x from 8 to 16, and 4–6x from 8 to 32 — slightly worse than linear, because timed-out attempts and their retries add work to a server whose throughput is fixed.

Tests that never touch `:3000` do not slow down at all, while running concurrently with the saturated journey workers: the admin-project `dlq-events` replay/delete tests take 2.3 s at 8, 2.4 s at 16 and 2.4 s at 32; admin-auth tests 132–420 ms at 8, 159–493 ms at 16, 170–454 ms at 32; ins-project address-book tests 127–699 ms at 8 and 170–931 ms at 32. That isolates the slowdown to the animals-frontend path and excludes the backend, Mongo, Redis, the Docker VM, host CPU and Chromium contention.

Wall clock at 24–32 grows mainly through retry volume (30–43 test-timeouts per run, each burning a 30 s budget twice), not through a lower ceiling: the frontend's request-id counter in its log tails gives roughly 3,400–3,800 requests per run at 28–30 requests per second at every worker count from 8 to 32.

## 4. What breaks, and why

Ordered from most to least load-bearing. Where the refutation review narrowed a claim, the narrowed version is given and marked as such.

### 4.1 The animals frontend is one saturated Node process; extra workers only deepen its queue

Claim (narrowed by review): `trade-imports-animals-frontend` is the stack's only saturated resource. From 8 workers upward its container sits at 105–133% CPU in every in-run sample and does not go higher at 12, 16, 24 or 32. Because its throughput is fixed, per-request latency scales with the number of workers driving it, and any spec whose 8-worker duration is above roughly 30 s × 8 / N crosses the 30 s test budget at N workers. Why one core only yields about 29 requests per second is not measured: the development-mode configuration (uncached Nunjucks, pino-pretty logging of full request and response headers including three Iron cookies) and Rosetta translation are all present and all plausible, but no run separates them.

Mechanism: `docker/stack/frontend.compose.yml` runs one `trade-imports-animals-frontend` container (line 38 onward) with `NODE_ENV=development` (line 56), `platform: linux/amd64` (line 76), no `cpus`, `mem_limit` or replicas. Every journey page is a POST → 302 → GET rendered server-side by that process. Under `NODE_ENV=development`, `repos/trade-imports-animals-frontend/src/config/config.js` defaults `nunjucks.watch` and `nunjucks.noCache` to true with no env override (lines 300–311), `log.format` to `pino-pretty` (line 97) and `log.redact` to `[]` (lines 103–105); `src/config/nunjucks/nunjucks.js` passes those to `nunjucks.configure` (lines 24–25) and sets hapi-vision `isCached: config.get('isProduction')` — false (line 45).

Evidence:

- `workareas/shared/e2e-stability/runs/w08-03/stats.tsv` — the frontend is 103.89–116.56% CPU in all 14 in-run samples (lines 23, 44, 65 … 296); every other container is far lower (backend 11–29%, mongodb 5–30%, redis ≤ 1.23%; ins-frontend spikes to 54.99% once, line 282).
- `runs/w08-01/summary.json`, `runs/w16-01/summary.json`, `runs/w32-02/summary.json` — `peakContainerCpu` for the frontend is 117.36%, 125.34% and 131.26%; a flat ceiling while workers quadruple.
- `runs/w16-01/summary.json` lines 22–82 — all three hard failures are `Test timeout of 30000ms exceeded` inside `Journey.answerTransport`/`answerContact`/`toDeclaration` (`flows/journey.ts` lines 198–209, 320) with the awaited element resolved or the page rendered; the retry dies at 35 s with "Target page, context or browser has been closed", which is the teardown after a second 30 s timeout.
- `runs/w16-01/host.tsv` — load1 4.1–6.6 on 16 cores throughout; `runs/w16-02/host.tsv` — load1 8.2–13.35. Same failure set in both runs, so host CPU is not the determinant.
- `runs/w08-03/logs/trade-imports-trade-imports-animals-frontend-1.log` — every request produces a ~45-line pretty-printed record including the full cookie header (line 27); response times at the run tail (1–3 workers left) are 25–72 ms, so the code is fast when it is not queued.
- Section 3's admin/ins flat-line durations, which the original hypothesis did not use and which are the cleanest isolation of the `:3000` container.

Confidence: high on the mechanism (single saturated process, latency proportional to workers). Unmeasured: which part of the per-request cost dominates. `trade-imports-ins-frontend` runs the same `NODE_ENV=development` but `LOG_FORMAT=ecs` (`frontend.compose.yml` line 98) and peaked at 39–93%, so the logging format is a cheap A/B.

### 4.2 Six journey tests run on the default 30 s budget; their siblings carry `test.slow()`

Claim (narrowed by review): the set of tests that hard-fail or flake from 16 workers upward is exactly the set of full-journey tests without `test.slow()`: `declaration.spec.ts` (both tests, via the `beforeEach` at line 4), `persistence-notification.spec.ts` (both), `promoted-lifecycle.spec.ts` line 55, and `notification-dashboard-pagination.spec.ts`. Every journey test that passed above 30 s at 16 workers has `test.slow()` (90 s budget). Whether a crossed test is reported "failed" or "flaky" depends on whether its retry is scheduled while the pool is still saturated (persistence, promoted-lifecycle: retry within 0.3 s, still under 67 Chromium processes, fails) or in the run's tail (declaration, pagination: retry passes at 20–27 s).

Mechanism: `utils/playwright/shared-config.ts` sets `retries: 1` and `fullyParallel: true` but no `timeout`, so every test inherits Playwright's 30 000 ms, and that budget covers `beforeEach` plus the body. `flows/journey.ts` `toDeclaration()` (lines 316–323) runs `startNotification` + `completeAnswerSections` (seven sections, lines 212–220) + check-and-submit + declaration — 50 or more server renders. `notification-dashboard-pagination.spec.ts` lines 6–10 do 26 × (click Start, wait for origin heading, reopen dashboard) before the first assertion. At 8 workers these tests use 15–20 s of the budget; at 12 fresh, 24.5–29.3 s; at 16, over 30 s on the first attempt.

Evidence:

- `repos/trade-imports-animals-tests/tests/e2e/features/all-operators.spec.ts` line 8, `amend-resubmit.spec.ts` line 20, plus `change-from-cya.spec.ts`, `hub-groups-and-cya-rows.spec.ts`, `journeys/promoted-notification.spec.ts`, `notification-dashboard.spec.ts` (lines 46, 91), `documents-limits.spec.ts`, `admin/admin-notifications.spec.ts`, `admin/admin-outbox-events.spec.ts` — all carry `test.slow()` and pass at 30–47 s in the 16-worker runs.
- `tests/e2e/pages/declaration.spec.ts`, `journeys/persistence/persistence-notification.spec.ts`, `features/promoted-lifecycle.spec.ts` lines 55–71, `pages/notification-dashboard-pagination.spec.ts` — no `test.slow()`.
- `runs/ctl12-01/summary.json` — fresh stack, 12 workers, green: declaration 25.0/24.5 s, persistence 25.5 s, promoted-lifecycle 26.7 s, pagination 29.3 s. The margin at 12 is 0.7–5 s.
- `runs/w16-01/summary.json` — first attempts 30.1–32.4 s for all six; declaration retries 26.9 s and 26.6 s (flaky), pagination retry 20.1 s (flaky), persistence and promoted-lifecycle retries 35.3–35.6 s (failed).
- `tests/e2e/pages/cph-number.spec.ts` line 26 — `test.slow()` inside the body of "shows an error summary when submitted empty" does not protect the `beforeEach` journey, and that test still fails at 24 workers. `test.slow()` must be declared before the hook runs.

Confidence: high. This is a reporting-threshold explanation of why runs go red at 16, not of why the stack saturates. A wider budget would leave wall time at about 134 s.

### 4.3 The w series ran on an ageing stack; JVM memory crept to the cgroup ceiling and shaved 3–4 s off every journey's margin

Claim (narrowed by review): every w-series run has `restartedStack: false`, so w08-01 through w32-03 ran on one stack across about an hour. Over that hour `trade-imports-animals-backend` climbed from 677 MiB (66%) to 958 MiB (93.5%) by w08-10 — still green — and sat at 1019–1023 MiB (99.6–99.9% of its 1 GiB `mem_limit`) from the first sample of every 16-worker run onward; `trade-imports-address-book` went 51% → 80% → 99.7%. The frontend's own RSS grew 294 → 688 MiB. On the fresh stack the backend peaked at 613–620 MiB. At a fixed worker count the aged stack is 8–15% slower at 8 workers (w08-01 → w08-10: declaration 17.7 → 19.3 s, persistence 15.4 → 18.0 s) and 10–28% slower at 12 (ctl12-01 → w12-01: 25.0 → 29.1 s, 26.7 → 30.2 s). That is what tipped the 12-worker journeys over 30 s in w12-01. Nothing was OOM-killed or restarted in 28 runs, and the memory ceiling does not track the failure rate (green at 93.5%, three flakes at 60%), so it is a confound and a margin-eater, not the cause of the curve.

Mechanism: `docker/stack/backend.compose.yml` gives each JVM `mem_limit: 1g` with `-XX:MaxRAMPercentage=50.0 -XX:TieredStopAtLevel=1` (lines 14, 35). G1 grows the heap to its cap and non-heap plus page cache fill the rest, so RSS settles at the cgroup ceiling after enough consecutive suites and the kernel reclaims under `memory.max` (a 1023 → 1003 MiB dip is visible in w32-02). Mongo growth (667 → 4,862 notifications, 3,686 → 26,400 outbox documents) is ruled out as the driver: ctl12-01 on an empty database and w12-02 on 2,457 notifications give the same slowest-test times to within a second, and the backend's paginated list query costs about 10 ms at 160 rows and 12 ms at 2,520.

Evidence:

- `runs/w16-01/stats.tsv` line 5 — backend 1019 MiB / 1 GiB, 99.56%, at 15:50:06, before load ramped; line 16 — address-book 819.7 MiB, 80.05%.
- `runs/w08-01/summary.json` lines 135–150 — backend 677 MiB / 66.15%, address-book 523 MiB / 51.02%; `runs/ctl12-01/summary.json` lines 135–155 — backend 613 MiB / 59.86%, address-book 363 MiB / 35.46%.
- `runs/w08-01/summary.json` line 9 and every other w-run — `"restartedStack": false`; `runs/ctl08-01/stack-restart.log` — the only stack restart of the day.
- `runs/w08-01/stats.tsv` vs `runs/w16-01/stats.tsv` line 2 — frontend RSS 294 MiB → 688 MiB.

Confidence: medium. The 3–4 s per-journey ageing cost is measured; whether the JVM ceiling causes it, rather than merely accompanying it, is not. There is no fresh-stack 16-worker cell, so "16 fails deterministically" is established only on the aged stack. Extrapolating fresh-stack numbers (17.7 s at 8, 25.0 s at 12) puts the 16-worker journeys at 32–33 s — still over budget, but by 2–3 s, which would more likely produce flaky than failed verdicts.

### 4.4 `addresses-picker.spec.ts` is a pre-existing flaky spec, independent of worker count

Claim (narrowed by review): the paging loop at `tests/e2e/features/addresses-picker.spec.ts` lines 88–98 computes `lastPage` once from the "Showing 5 of N" caption, then clicks Next and reads a non-waiting `count()`, breaking on first sight of the target. Two defects: `count()` can run against the new document before its table is parsed, and the book is shared, never wiped and concurrently soft-deleted by `addresses-live-link.spec.ts`, which starts within 20 ms of the picker on the adjacent worker in every run. Either way the target is missed once and the loop walks to the last page. In the two 8-worker instances the loop reached the last page and the 5 s `toBeVisible` failed; at 12+ the walk itself exceeds the 30 s budget because the never-wiped book has grown (87 → 108 → 220 rows). Which of the two mechanisms caused the miss is not established by any artefact — no failing attempt has a trace (`trace: 'on-first-retry'`, and every retry passed).

Evidence:

- `runs/w08-02/test-results/e2e-features-addresses-pic-19f02--page-is-the-one-that-saves-e2e/error-context.md` lines 15–24, 69–113 — `element(s) not found` for `Select Paged Consignor 1788449009219`; snapshot is page 18 of 18, "Showing 2 of 87 addresses", oldest seed rows only, no Next link.
- `runs/w08-03/test-results/…/error-context.md` — page 22 of 22, "Showing 3 of 108".
- `runs/ctl12-02/test-results/…/error-context.md` — the loop timed out waiting for a Next link on page 7 of 7 ("Showing 5 of 35"); the loop clicks exactly `lastPage − 1` times, so `total` was ≥ 36 when read and 35 at the snapshot — a concurrent soft-delete during the walk, proven.
- `runs/w12-01/summary.json` lines 43–60 — 30 s timeout at page 44 of 44 ("Showing 5 of 220"), retry 10.2 s.
- Incidence: 2/10 at 8, 1/3 + 1/2 at 12, 3/5 at 16, 1/3 at 24, 1/3 at 32 — present at baseline, non-monotonic, and the picker passed cleanly in 4 of 6 runs at 24/32 where 7–10 other tests hard-failed.

Confidence: medium on the mechanism, high that it is a spec defect rather than a load finding. It accounts for at most one flaky title per run and none of the 16+ hard failures.

### 4.5 The DLQ "deletes all" test flakes one run in four regardless of load; root cause undetermined

Claim (narrowed by review): `tests/e2e/features/admin/dlq-events.spec.ts` "deletes all DLQ messages via the admin UI" timed out in 7 of 28 runs (w08-03, w08-04, w08-06, ctl08-02, ctl12-02, w24-03, w32-03; 0 of 8 at 12–16 workers), always at line 86 waiting for the "Confirm delete all" button, always 30.0–30.1 s, always passing its retry in 2.3–2.4 s. The screenshot shows the DLQ page with the seeded row listed, "Delete all" focused, no dialog, no banner. The admin container is idle (0–2% CPU) during the failing attempt. A click-before-hydration race is plausible — the button is `type: "button"` and the only thing that opens the dialog is `dialog.showModal()` bound by a `type="module"` script at `bodyEnd` — but it is contradicted by the sibling "replays all" test, which is wired through the same module (`replayAllBtn.addEventListener('click', … form.submit())`) and passed in all 28 first attempts and all 7 retries. No artefact covers the failing attempt: the trace is on-first-retry, the admin log tail starts after it, and the error-context has no ARIA snapshot (other timeouts in the corpus do carry one). The dynamics-gateway log shows a burst of five `/dlq/notifications` lists within 1.5 s of navigation in the failing attempts, versus exactly one list then the POST in passing attempts.

Mechanism (what is known): `flows/admin-navigation.ts` lines 24–27 reach `/dlq-events` by clicking a dashboard link with no load wait; `expectSeededRowListed` (spec lines 42–49) uses a non-waiting `isVisible()` and reloads inside `toPass`; the click at line 85 follows immediately. `repos/trade-imports-animals-admin/src/server/dlq-events/index.njk` lines 60–76 and 85–88, and `src/client/javascripts/dlq-events.js` lines 18–22, show there is no non-JS fallback.

Evidence: `runs/w08-03/test-results/e2e-features-admin-dlq-eve-a8bce-Q-messages-via-the-admin-UI-admin/error-context.md` lines 14–23 and `test-failed-1.png`; `runs/w08-03/stats.tsv` lines 281, 302 — admin at 1.64% and 0.02% during the wait; `runs/w08-03/logs/trade-imports-trade-imports-dynamics-gateway-1.log` lines 199–256 (list burst), 481–497 (retry).

Confidence: high that it is load-independent and not part of the scaling story; low on the cause. It runs against `:3001` and the gateway and never touches `:3000`.

### 4.6 Intermittent frontend 500 pages and one repeated OIDC sign-in failure above 8 workers

Claim (narrowed by review): five first-attempt failures across the 28 runs ended on the animals frontend's own "500 / Something went wrong" page (w24-01 consignment-details, w24-03 admin-notifications, w24-03 cph-number "accepts", w32-02 transporter, ctl12-02 cph-number "empty on load"); none at 8 workers in 12 runs, none at 16 in 5. Every one of the five was reported flaky — the retry passed in 9–23 s — so they contributed nothing to the hard failures. Separately, in w24-01 only, `auth.spec.ts` "allows signing into a page further in the journey" landed on "Sorry, we are unable to sign you in" on both attempts, a repeated Bell-callback error, and that is the one hard failure in this family.

Evidence: `runs/w24-01/test-results/e2e-pages-consignment-deta-dc69e-e-renders-the-page-controls-e2e/error-context.md` lines 64–65 — `heading "500"`, "Something went wrong"; `runs/w24-01/test-results/e2e-features-auth-Authenti-b2e97-page-further-in-the-journey-e2e-retry1/error-context.md` line 48. The frontend logs the exception only via `request.logger.error` (`repos/trade-imports-animals-frontend/src/server/common/helpers/errors.js` lines 19–40), the harness captures a 500-line tail covering the last few seconds, and `runs/w24-01/logs/` is empty, so the cause (backend 5xx, fetch error, address-book timeout, defra-id-stub) cannot be read from the artefacts.

Confidence: medium on the observation, none on the cause. The backend and address-book at 97–99% of their 1 GiB limits during every 24-worker run is an uninvestigated candidate; the ctl12-02 instance at 60% shows it is not sufficient on its own.

### 4.7 At 32 workers the per-worker sign-in mint occasionally exceeds its 2 × 20 s budget

Claim (narrowed by review): `fixtures/auth-state.ts` mints one session per worker with `SIGN_IN_ATTEMPTS = 2` and `LANDING_TIMEOUT_MS = 20_000` (lines 22–23, 77–99). Once in w32-01 (worker 14, charged to `headers.spec.ts`, flaky) and once in w32-02 (replacement worker 40, turning a `cph-number` retry into a hard failure) the mint failed with "could not sign in … in 2 attempts". The failing assertion is the dashboard heading after the OIDC redirect (line 83), served by the saturated frontend; the defra-id-stub sampled 12% CPU during the mint storm and peaked higher (38–57%) in green 8/12/16-worker runs. The stub's synchronous whole-file `sessions.json` rewrite on every token lookup is a real inefficiency but is bounded to one hour of sessions and costs seconds in total, not 20 s per mint.

Confidence: medium. Effect size is at most one test per 32-worker run; an amplifier of 4.1, not a cause.

### 4.8 What is not the constraint

- Host CPU. load1 never exceeded 14.25 on 16 cores. w24-01 failed 9 tests with load1 never above 6.12, lower than green 8-worker runs (7.6–8.3). w16-01 (peak 6.64) and w16-02 (peak 13.35) produced the identical three failures. Only the frontend's single thread is saturated inside the VM. Whether host CPU becomes the next ceiling once the frontend can use more cores is untested.
- Host memory. `host.tsv` column 3 (`sysctl vm.swapusage` used) reads 10.2–13.9 GB in every run and is highest during the green control runs (13.4 GB in ctl08-01 and ctl12-01) and lowest in the first run with hard failures (10.2 GB, w16-01). Compressor pages peak at about 1.5 M at 8 workers and at 32. No per-process memory was sampled. `summary.json` reports `peakSwapUsedMiB: 0` in every run because `tools/e2e-stability/summarise.mjs` line 133's `toMiB` regex requires a trailing `B` and the column reads e.g. `13718.62M` — a harness bookkeeping defect, not a finding.
- Container health. No container was unhealthy, restarted or OOM-killed in any of the 28 runs (`containers.tsv`).
- Mongo dataset growth. Ruled out as a duration driver by the fresh-vs-aged 12-worker comparison (see 4.3).

### 4.9 Raised but not tested

These were proposed and not put through refutation. They are not findings.

- At 24–32 workers the per-worker sign-in mint and the OIDC callback chain exceed their fixed 20 s / 5 s budgets and the failure is attributed to whichever test the worker started with.
- The three `test.slow()` tests that fail only at 24–32 do so because downstream pipelines (virus scan, amend/admin journeys) saturate, not just the frontend.
- The backend's RSS growth run over run, alongside unbounded outbox and shedLock collections, is one or two runs from an OOM kill.
- The DLQ "deletes all" failure is an independent admin → gateway → SQS flake (overlaps 4.5, which reached the same conclusion on the load-independence but not the SQS path).
- The JVMs at 99% of their limit act as a latency and error amplifier through cgroup direct reclaim (overlaps 4.3; the amplification itself is unmeasured).

## 5. Recommendations

Ordered by effect per unit of effort within each group.

### Makes the current 8-worker suite more reliable

1. **Fix the addresses-picker walk.** `repos/trade-imports-animals-tests/tests/e2e/features/addresses-picker.spec.ts` lines 88–98: after each `Next` click wait for the page to land (`await expect(page).toHaveURL(/[?&]page=\d+/)` or `await expect(page.getByText(showingFive)).toBeVisible()`), re-read `total` from the caption each iteration instead of once, and replace the one-shot `count()` with a polled `expect(...).toHaveCount(1)` guarded by a short timeout. Keep the cross-page no-JS selection assertion. Settles both candidate mechanisms at once. Measurement that confirms it: `--repeat-each 30 --workers 8` on this spec, expecting 0 of 30 versus 2 of 12 today.
2. **Capture, then fix, the DLQ "deletes all" flake.** First `test.use({ trace: 'retain-on-failure' })` in `tests/e2e/features/admin/dlq-events.spec.ts` and add a console/pageerror capture, so the next failing attempt is observable — today none is. In parallel, in `flows/admin-navigation.ts` line 26 wait for `load` after `btnDlqProcess.click()` (or navigate with `adminDlqEvents.open()`), and in `expectSeededRowListed` (spec lines 42–49) replace `isVisible()` + `reload()` with an auto-waiting `expect(...).toBeVisible()`. App side, the durable fix is progressive enhancement in `repos/trade-imports-animals-admin/src/server/dlq-events/index.njk`: make "Delete all" a real submit to a server-rendered confirmation page and keep the `<dialog>` as the JS enhancement. Evidence for the cause is thin; the trace is what settles it.
3. **Restart the stack between series and fix the harness.** `tools/e2e-stability/run-once.sh` already supports `--restart-stack`; use it at the start of every matrix, and never compare cells across an un-restarted hour. In `tools/e2e-stability/summarise.mjs` line 133 change the `toMiB` regex to accept `M`/`G` without a trailing `B` so `peakSwapUsedMiB` stops reading 0. In `run-once.sh` line 137 replace `docker logs --tail 500` with `--since <run start>` so the container logs cover the failure window, not the last 1–13 s.
4. **Pin the local worker count at 8.** In `repos/trade-imports-animals-tests/package.json` add `--workers=8` to `test:docker-compose` (line 33). Playwright's default on a 16-logical-core machine is already 50% = 8, so this only stops an explicit higher value. CI is unaffected: `test:docker-compose:ci` (line 37) and `workers: '50%'` under `process.env.CI` in `shared-config.ts` line 20 are separate paths.

### Makes higher worker counts viable

5. **Give the six un-annotated journey tests the budget their siblings have.** `tests/e2e/pages/declaration.spec.ts` and `pages/cph-number.spec.ts`: `test.describe.configure({ timeout: 90_000 })` on the describe (a `test.slow()` inside the body does not protect the `beforeEach` journey — see `cph-number.spec.ts` line 26). `journeys/persistence/persistence-notification.spec.ts` (both tests), `features/promoted-lifecycle.spec.ts` line 55 and `pages/notification-dashboard-pagination.spec.ts`: `test.slow()` as the first line. This turns 12–16 workers from red into slow-but-green; it does not make the suite faster and it does not touch the cause. Also shrink the pagination spec: create its 26 notifications through `notificationApi` (already exposed by `fixtures/ui.ts`) rather than 26 UI round-trips. CI trade-off: a genuine hang in these tests will now take 90 s to fail instead of 30 s.
6. **Cut the frontend's per-request cost, measuring as you go.** Step one costs nothing: in `docker/stack/frontend.compose.yml` add `LOG_FORMAT=ecs` to `trade-imports-animals-frontend` and `trade-imports-animals-admin` (the knob exists, `config.js` line 98; ins-frontend already uses it, line 98 of the compose file). Step two needs a small frontend change: add `env: 'NUNJUCKS_WATCH'` / `env: 'NUNJUCKS_NO_CACHE'` to `repos/trade-imports-animals-frontend/src/config/config.js` lines 300–311, make `src/config/nunjucks/nunjucks.js` line 45 `isCached: !config.get('nunjucks.noCache')`, and set both false in `frontend.compose.yml` for the published-image stack (the dev overlay `dev.compose.yml` can keep them on, because that is where the source bind mount lives). Do not flip `NODE_ENV=production` wholesale: it also turns on secure cookies, Redis TLS and the secure context, which break the `http://localhost` stack. Measurement that settles it: one 8-worker run per step, comparing the frontend CPU column of `stats.tsv` and the `declaration`/`all-operators` durations with w08-01..10. If CPU stays pinned near 100% after both steps, the cost is elsewhere in the process and needs a `--cpu-prof` run. Local trade-off: `LOG_FORMAT=ecs` makes the container log JSON rather than pretty-printed.
7. **Run the Node frontends natively.** Make the pin substitutable — `platform: ${STACK_PLATFORM:-linux/amd64}` in `docker/stack/frontend.compose.yml` (lines 35, 76, 117) — build the frontend's production target for `linux/arm64` locally and run one 8-worker cell against it. Longer term, ask the CDP publish workflow for multi-arch manifests so `:latest` resolves natively on Apple silicon. Rosetta's share of the ceiling is unmeasured; this run is the measurement.
8. **Give the frontend more than one core.** This is the only change that moves the ceiling itself. In `repos/trade-imports-animals-frontend/src/index.js` fork `WEB_CONCURRENCY` workers with `node:cluster` (default 1 so production is unchanged) — sessions already live in Redis (`SESSION_CACHE_ENGINE=redis`) so multi-process is safe — and set `WEB_CONCURRENCY=4` in `frontend.compose.yml`. Alternatively a second replica behind a small proxy. Then re-run the 16-worker cell and watch `host.tsv`: if load1 approaches 16 while per-request latency is still rising, host CPU has become the ceiling and the Docker VM should drop from 16 vCPUs to 8–10 so Chromium keeps cores of its own.
9. **Parameterise the JVM memory cap for local runs.** `mem_limit: ${JVM_MEM_LIMIT:-1g}` in `docker/stack/backend.compose.yml` (line 35 and the other four services) and `stubs.compose.yml`, run locally with `JVM_MEM_LIMIT=2g`. Keep `1g` as the default that f29dc65 chose for the CI runner. Evidence that this helps is thin: the measurement is a fresh-stack 16-worker cell (which does not exist today) against an aged one, and then the same pair at 2g.
10. **Beyond one stack, use two stacks.** Once the frontend ceiling is lifted, throughput past about 12–16 workers should come from the EUDPA-359 parallel alt stacks (two stacks × 8 workers) rather than more workers on one stack.

## 6. Ruled out

One line each, so this ground is not covered twice. The core observation in several of these survived; the specific claim did not.

- **Frontend queueing widens the two 8-worker flakes and pushes journeys past 30 s from 12 workers** — `dlq-events` runs against `:3001` and never touches the frontend; at 12 the journeys sit at 25–29 s (ctl12-01 green), and systematic failure starts at 16.
- **A ~29 req/s ceiling saturated at 8, with 12 workers adding a 1.5–1.9x pure queueing stretch** — like-for-like fresh runs give ~1.5x; the extra 10–28% is stack ageing; the journey specs crossed 30 s in 1 of 3 aged 12-worker runs, consistently only from 16.
- **The failing specs are those spending the whole budget on one linear journey; every other spec is far from the limit** — at 8–12 workers half the timeouts are short specs (dlq-events 2.3 s, addresses-picker 7 s, a cph-number stall) hitting the wall through a race or hang.
- **Tests cross 30 s in strict order of their 8-worker duration** — order is duration relative to each test's own budget (`test.slow()` gives 90 s); sub-second tests also fail at 24–32 through the sign-in fixture.
- **JVMs pinned at 99–100% from 12 workers onward as a GC-pressure source** — the climb is by uptime on an un-restarted stack (93.5% by the tenth 8-worker run, green); no correlation with failure rate; the EMF retry loop is shared by four flat JVMs; nothing OOM-killed.
- **addresses-picker's `count()` reads the new document before its table has parsed** — never observed; only w08-02/03 have the fast-fail signature; 12+ instances are 30 s walk timeouts; a concurrent soft-delete is an equal rival and is proven in ctl12-02.
- **Every full-journey test fails deterministically at 16+, with 12 as a threshold the retry rescues** — declaration ×2 were flaky, not failed, in all five 16-worker runs; w12-01's promoted-lifecycle failed both attempts at 12; 500-page and single-step stall modes exist alongside.
- **addresses-picker is a stale-previous-page race widened by frontend latency, with a hit rate rising under load** — Playwright 1.61.1's `click()` waits for the navigation to commit; incidence is non-monotonic (4 of 6 clean at 24/32); the retry in w12-01 passed with the frontend still at 108–114%.
- **The DLQ delete-all flake is a click-before-hydration race** — "Replay all" is wired through the same module and passed 28 of 28 first attempts; no artefact covers a failing attempt; the missing ARIA snapshot and duplicated error-context are unexplained.
- **Under 24-worker load a transient frontend 500 becomes a hard failure because the retry hits the slowdown** — all five 500-page snapshots ended flaky; the one hard failure (auth) was a repeated Bell error on both attempts; 500s also appeared at 12 (fresh stack) and 32, and never at 16.
- **32-worker mint storms overwhelm the defra-id-stub through synchronous `sessions.json` rewrites** — the stub sampled 12% CPU during the storm and peaked higher in green runs; the file is bounded to one hour; the failing step is the frontend-served dashboard; one test per run at most.
- **`NODE_ENV=development` multiplies per-page CPU and explains the degradation** — it is constant across all 28 runs including the green ones; frontend CPU is 115–134% in green and red runs alike; pino serialises on the event loop in both formats; a ceiling contributor of unmeasured size, not the cause of the slope.
- **Rosetta is a fixed multiplier on the hot core and 13 of 17 containers are pinned** — the pin count is right (mongodb, redis, floci, toxiproxy carry none); the translation cost is unmeasured and constant across worker counts; the host was never CPU-saturated.
- **Host memory over-commit (10–14 GB swap) adds tail latency at 16+** — swap was highest during the green control runs and lowest in the first failing run; compressor peaks are equal at 8 and 32; no per-process memory was sampled.
- **The matrix is confounded by Mongo growth (bigger dashboards, longer picker walks)** — ctl12-01 (0 rows) and w12-02 (2,457) give identical durations; the dashboard is paginated at 25 and its query costs 10 vs 12 ms; the picker loop breaks on first sight and never walks the book; the accumulated state that differs is JVM memory.
- **DLQ delete-all loses its click one run in four via link-click-at-commit plus `isVisible()`/`reload()` mid-load** — the gateway log shows five lists within 1.5 s with the second issued before the first completed, then a pair ~10 s later; the replay-all asymmetry stands; cause undetermined.
- **Dashboard pagination is where data growth adds 1–3 s per test** — backend list query 10 vs 12 ms; the spec slowed less fresh-to-aged than tests with no growing read; it flipped because its fresh-stack baseline (29.3 s) sat 0.7 s under the 30 s budget.

## 7. How to re-run this

One instrumented run:

    ~/git/defra/trade-imports-workspace/tools/e2e-stability/run-once.sh <label> <workers> [--restart-stack]

The script (`tools/e2e-stability/run-once.sh`) optionally stops and restarts the stack with `scripts/stack/stop-stack.sh` and `scripts/stack/run-stack.sh`, snapshots the environment and Mongo collection counts, starts two 5-second samplers (`docker stats` and host load / swap / Chromium process count / compressor pages), then runs the standard runner from the tests repo:

    npm run test:docker-compose -- --workers=<N> --reporter=list,json

Afterwards it copies `test-results/`, records `containers.tsv`, dumps a 500-line `docker logs` tail per container and runs `tools/e2e-stability/summarise.mjs` to derive `summary.json`.

Artefacts land in `~/git/defra/trade-imports-workspace/workareas/shared/e2e-stability/runs/<label>/`: `summary.json`, `report.json`, `run.log`, `stats.tsv`, `host.tsv`, `containers.tsv`, `env.txt`, `mongo-before.txt`, `mongo-after.txt`, `logs/<container>.log`, `test-results/<test-dir>/error-context.md` and `trace.zip` (retries only), and `stack-restart.log` when `--restart-stack` was passed. This report is the sibling `REPORT.md`.

Known harness defects to fix before the next matrix (see recommendation 3): `peakSwapUsedMiB` is always 0; the container log tails are too short to cover the failure window and `logs/` was empty in some runs (w24-01, ctl12-02); `errorSignatures` cannot see a rendered 500 page and files it as `test-timeout`. Gaps in this matrix: no fresh-stack control above 12 workers, no cell below 8 workers, no per-process CPU or memory on the host, and no event-loop utilisation for the frontend.


## 8. Addendum — 16 workers is slow, 24 and above is broken

Added after the report above, from a harness fix made in response to it (commits `bd2ea64`, `3ca50fd`).

Section 4 recorded, at medium confidence, that some first-attempt failures ended on the service's own 500
page rather than merely running out of time. That was invisible in `summary.json`, because a test that
lands on an error page and then times out waiting for a locator reports only the timeout — the status
lives in the page snapshot Playwright saves beside the failure, as a level-one heading. The summariser now
reads those snapshots, and all 29 captured runs have been re-derived from artefacts already on disk with
`resummarise.sh`. No test was re-run, so this is the same evidence read more carefully.

Rendered error pages, by worker count:

| Workers | Runs | Runs with a rendered 5xx | Total rendered 5xx |
|---|---|---|---|
| 8 | 12 | 0 | 0 |
| 12 | 5 | 1 (ctl12-02) | 1 |
| 16 | 5 | 0 | 0 |
| 24 | 3 | 2 (w24-01, w24-03) | 3 |
| 32 | 3 | 1 (w32-02) | 1 |

Five in total, matching the count section 4 arrived at independently.

This splits the degradation into two regimes, which the wall-clock numbers alone do not distinguish:

- **Up to 16 workers the service stays correct and only gets slower.** Every 16-worker failure across five
  runs is a pure timeout with the expected page in the snapshot. Nothing is erroring. Giving the six
  un-annotated journey tests the 90 s budget their siblings already have would therefore be expected to
  make 16 workers green — while buying no time, since 16 workers is already slower than 8.
- **From 24 workers the service starts failing outright.** Rendered 500s appear only at 24 and above.
  Raising test budgets would not fix that regime, because the requests are not slow, they are failing.

That sharpens recommendation 5 in section 5: a timeout increase is a legitimate fix for 16 workers and a
false one for 24 and 32. It also means the frontend-saturation mechanism in section 4 has a second-order
consequence worth separating — queueing that merely delays a response up to 16 workers begins to drop or
error it beyond that, and which of the two it is has not been established.

One correction to section 4's swap discussion, from the same fix: `peakSwapUsedMiB` had been reporting
zero for every run because the unit pattern required a trailing `B` that `sysctl vm.swapusage` does not
write. Real swap use was 10.4–13.9 GiB throughout. It rises with worker count in the `w` series
(11.0 GiB at 8, 12.3 at 24, 13.9 at 32) but was *highest* during the fresh-stack control runs
(13.4 GiB), which were the greenest of the matrix. Swap is therefore confirmed as not causal, which is
what section 4 concluded from the raw `host.tsv` samples before the summary field was fixed.
