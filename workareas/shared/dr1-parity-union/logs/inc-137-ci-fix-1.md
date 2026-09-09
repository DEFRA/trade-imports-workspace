# inc-137 (EUDPA-514) — CI fixer attempt 1

## Verdict: no code change. Transient cross-repo image race. Re-ran, both PRs green.

## Evidence
The 11 E2E failures were all in the `[plants]` project — `tests/e2e/features/plants/arrival.spec.ts`
and `origin.spec.ts`. inc-137 touches only the live-animals documents feature (frontend) and the
live-animals accompanying-documents page object (tests). Nothing in either diff reaches the plants
journey, the plants frontend or the plants backend.

Timeline that produced the red (all 2026-09-08):
- 19:10:54  tests repo main E2E — green.
- 19:18:32  tests repo main takes c1d9de8 "test(high-risk-plants): cover the arrival-details page
            and follow the flow past origin (#172)". That commit rewrites exactly the two failing
            spec files and adds `PlantsArrivalDetailsPage`. Its own message says it lands
            "alongside DEFRA/trade-imports-plants-frontend#47".
- 19:21:43  plants-frontend main starts Publish run 34268501687 for
            "feat(high-risk-plants): Add the arrival-details page".
- 19:24:10  our two E2E runs start (34268741018 frontend, 34268727587 tests) and pull
            plants-frontend `:latest` — still the pre-arrival-details image.
- 19:26:54  the arrival-details plants-frontend image finishes publishing (amd64); arm64 19:28:55.
- 19:27:56+ the plants arrival/origin specs run and fail waiting for the Arrival details page.

So the new plants specs were on main before the plants-frontend image that satisfies them was
published. Both PRs picked the tests up and the image not, which is why both failed identically —
including the tests PR, whose own diff is four lines in a live-animals page object.

The two error shapes the watcher reported are exactly what that race predicts: `toHaveURL` failing
on `plantsArrivalDetails.expectedUrl(reference)` and a 30s timeout waiting for
`getByRole('heading', { name: 'Arrival details', level: 1 })` — the page did not exist in the
running image.

## Action
Re-ran both E2E workflow runs with the arrival-details image now published. No test was weakened,
skipped or deleted; no check was disabled; no file changed.

- frontend PR 282 E2E: pass (5m56s) — every other check on the PR already passed, Lighthouse CI
  included (it had merely not resolved before --fail-fast stopped the earlier watch).
- tests PR 173 E2E: pass (5m54s).

Both PRs are fully green.
