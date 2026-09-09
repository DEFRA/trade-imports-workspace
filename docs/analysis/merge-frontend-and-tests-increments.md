# Getting the EUDPA-409 backlog finished sooner

**Scope.** The question asked was whether the high-risk-plants backlog should
merge its tests-repo E2E increments into the frontend increments they test. The
objective behind the question is **wall-clock time to backlog completion**, so
this document answers the merging question inside that larger one, and ranks
every lever on time that the run record supports.

**Date.** 2026-09-09. Point-in-time. Every number comes from the EUDPA-409 run
logs, `backlog.json`, and GitHub Actions run durations read on the day. Re-run
the queries if the backlog has moved on.

**Read alongside.** [`parallel-backlog-split.md`](parallel-backlog-split.md),
written the same day, which found the remaining chain has dependency width 1 and
that the only axis of parallelism available is frontend-increment beside
tests-increment.

---

## 1. If you only read one thing

Merging frontend and tests increments is real but small: about **15 minutes per
merge**, and only one or two merges are still available. **Batching consecutive
frontend increments is worth four times more**, because it drops a whole
base-branch watch each time, which a frontend+tests merge does not.

The cheapest wins are not structural at all. Two sentences written into the
remaining increments — *reuse `features/address-book-picker`, do not copy it*
and *update the preceding plants spec on this branch before you push* — would
remove the two CI-fix cycles that are demonstrably recurring, and are worth
roughly **105 minutes** between them for about ten minutes of editing.

### Levers ranked by estimated minutes saved across the 13 remaining increments

| # | Lever | Est. saving | Confidence | Cost / risk |
|---|---|---|---|---|
| 1 | **Batch consecutive frontend increments** — 13 increments into 9 | **~100–120 min** | Medium | Backlog edit. Wider diff per reviewer; a red costs more |
| 2 | **Pre-empt the stale-spec E2E red** — every add-page increment updates the preceding plants spec on its own branch | **~65 min** | High | One sentence per increment. None |
| 3 | **Pre-empt the SonarCloud duplication red** — name `features/address-book-picker` and the 3% / 90% gate thresholds in the increments that would copy a sibling | **~40 min** | High | One sentence per increment. None |
| 4 | **Trim the frontend PR's E2E to the plants project / one shard** | ~40 min, high variance | Low | Changes a shared reusable workflow used by four repos. Loses cross-service cover |
| 5 | **Merge frontend+tests increment pairs** (the question as asked) | ~15–30 min | Medium | Backlog edit plus a push-ordering rule. See §6 |
| 6 | **Stop watching `Publish` on the base branch in the merge stage** | ~65 min | High | **Not available** — needs an edit to the shared `increment-build-loop.js`, which the skill forbids |

Levers 1 and 5 overlap: a frontend+tests merge is one particular batching, and
the weakest one. Levers 2 and 3 are independent of everything else and should be
done regardless of what is decided about merging.

---

## 2. Where the time actually goes

### One increment, measured

`inc-046` (identification-numbers page, frontend only) is the cleanest
single-attempt record in the logs. Stage boundaries from the log mtimes under
`workareas/journey-builder/EUDPA-409/logs/`:

| Stage | Clock | Minutes | Kind |
|---|---|---|---|
| Ticket | 16:20:00 → 16:20:05 | 0.1 | fixed |
| Branch + Baseline | 16:20:05 → 16:22:13 | 2.1 | fixed |
| Implement | 16:22:13 → 16:32:41 | 10.5 | variable |
| Review | 16:33:32 → 16:36:05 | 2.6 | variable |
| Verify findings + Judge | 16:36:05 → 16:40:20 | 4.3 | variable |
| Fix | 16:40:20 → 16:42:51 | 2.5 | variable |
| Ladder | 16:42:51 → 16:49:27 | 6.6 | variable |
| Land + Pull request | 16:49:27 → 16:51:34 | 2.1 | fixed |
| CI watch (green path) | — | ~9 | fixed |
| Merge + base-branch watch | — | ~8 | fixed |
| Done | — | ~1 | fixed |

**Fixed per-increment overhead ≈ 22–24 minutes. Variable work ≈ 26 minutes.**

For a tests-repo increment the fixed overhead is a little lower, because its
baseline is lint plus typecheck rather than a 1,600-test unit suite, and its
base-branch publish is quicker: **≈ 19 minutes**.

### The CI numbers that set the fixed overhead

Medians over the last ~11 runs per workflow, read on 2026-09-09.

| Repo | Workflow | Median |
|---|---|---|
| `plants-frontend` | Check Pull Request | 3m23s |
| `plants-frontend` | Publish Branch Image | 2m30s |
| `plants-frontend` | E2E Tests | 6m14s |
| `plants-frontend` | Lighthouse CI | 6m09s |
| `plants-frontend` | Publish (on `main`) | 7m47s |
| `animals-tests` | Check Pull Request | 0m28s |
| `animals-tests` | Publish Branch Image | 3m01s |
| `animals-tests` | E2E Tests | 6m31s |
| `animals-tests` | Publish (on `main`) | 2m46s |

E2E is gated on Publish Branch Image finishing — the observed gap between the
publish run ending and the E2E run being created is 3 to 4 seconds. So:

- **plants-frontend push to green ≈ 8m45s** (2m30 publish + 6m14 E2E, with
  Check Pull Request and Lighthouse running inside that window).
- **animals-tests push to green ≈ 9m30s.**

The `Publish (on main)` row is what the merge stage blocks on after each merge.
It is a docker image build and push, not a test, and it costs the frontend
7m47s of pure waiting on every increment. That is lever 6, and it is out of
reach because the fix is in the shared loop.

### The variance is worse than the median

On the `feat/EUDPA-533-…` branch the second frontend push took **19m39s** to go
green, not 6m. Shards 1 and 2 started immediately and took 5m42s and 4m21s;
**shard 3 waited 14m40s for a runner.** One earlier E2E run took 47m58s for the
same reason. The workspace reusable workflow runs a 3-shard matrix, so every
plants-frontend PR draws three GitHub-hosted runners at once, and the slowest
draw sets the wall clock.

---

## 3. What the frontend PR's E2E check actually runs

This matters to every part of the answer, so it is worth being exact.

`repos/trade-imports-plants-frontend/.github/workflows/e2e-tests.yml` triggers on
`workflow_run` of "Publish Branch Image" completing, and calls
`DEFRA/trade-imports-workspace/.github/workflows/e2e-tests.yml@main` with
`branch: <head_branch>`. `repos/trade-imports-animals-tests/.github/workflows/workspace-e2e-tests.yml`
is the identical shape. **Both repos' PR checks call the same reusable workflow
with the same branch name.**

Inside that workflow, per shard:

1. Check out the workspace at `main`.
2. Sanitise the branch into a docker tag, then probe
   `defradigital/trade-imports-animals-tests:<tag>` — **branch tag if it exists,
   `latest` otherwise**.
3. `./scripts/stack/run-stack.sh --branch <branch>` — the stack probes Dockerhub
   per service and takes the branch tag where published, `:latest` elsewhere.
4. `docker run … defradigital/trade-imports-animals-tests:<tag> run test:docker-compose:ci -- --shard=N/3`.

Two consequences.

**It works.** On one shared branch name, a frontend PR's E2E check runs the
branch's tests image against the branch's frontend image. That is the machinery
`inc-045` used, and it is the reason a merged increment is possible at all.

**It runs far more than plants.** `test:docker-compose:ci` is invoked with no
`--project`, so all four Playwright projects — `e2e`, `admin`, `ins`, `plants` —
run, roughly 245 tests, each shard standing up the whole workspace stack. Plants
is ~38 of those tests. Meanwhile the plants frontend's own `test:fit:ci` runs
171 plants-specific tests in 3m26s with no stack at all, inside Check Pull
Request. That imbalance is lever 4.

---

## 4. `inc-045` — the accidental precedent, and how it worked

`inc-045` is `repo: "frontend"` in the backlog. Its CI fixer found that
`tests/e2e/features/plants/destination.spec.ts` had gone stale — it asserted the
Overview URL straight after the destination page, and the new consignor page now
sits between them. The fixer branched the tests repo with the **same branch
name**, fixed the spec, raised PR #185, and the merge stage merged both.

```bash
gh pr view 51  -R DEFRA/trade-imports-plants-frontend --json headRefName,mergedAt
gh pr view 185 -R DEFRA/trade-imports-animals-tests   --json headRefName,mergedAt
```

Both are on `feat/EUDPA-533-add-consignor-select-page-parties-sectio`. Tests
merged at 15:04:41Z, frontend at 15:08:06Z — tests first, exactly as
`MERGE_RANK = { backend: 0, tests: 1, frontend: 2 }` in the loop dictates.

### This is not a one-off — it is the norm

Every `add-page` increment that has landed since the plants Playwright project
existed, and after a plants journey spec existed for the section before it, has
needed a same-branch tests-repo PR:

```bash
jq -r '.increments[] | select(.prs != null)
  | select([.prs[].repo] | index("tests"))
  | .id + "  " + (.ticket//"-") + "  type=" + .type + "  repo=" + (.repo//"-")
      + "  prs=" + ([.prs[] | .repo + "#" + (.number|tostring)] | join(","))' \
  workareas/journey-builder/EUDPA-409/backlog.json
```

| Increment | Ticket | Type | `repo` | PRs |
|---|---|---|---|---|
| inc-027 | EUDPA-486 | add-page | frontend | frontend#39, **tests#162** |
| inc-036 | EUDPA-499 | add-page | frontend | frontend#44, **tests#164** |
| inc-038 | EUDPA-503 | add-page | frontend | frontend#45, **tests#168** |
| inc-039 | EUDPA-513 | add-page | frontend | frontend#47, **tests#172** |
| inc-042 | EUDPA-517 | add-page | frontend | frontend#48, workspace#40, **tests#177** |
| inc-045 | EUDPA-533 | add-page | frontend | frontend#51, **tests#185** |

Six for six. The two `add-page` increments that did not need one — inc-023 (hub)
and inc-031 (commodities) — landed before any spec covered the section ahead of
them.

The tests-repo commit titles say it plainly: *"follow the plants opening run onto
the commodity-type page"*, *"follow the commodity section onto the origin page"*,
*"follow the journey into the arrival section"*, *"follow arrival details on to
the destination question"*, *"the destination continues to the consignor page,
not the Overview"*. Every new page moves the previous section's *Save and
continue* target, and the previous section's spec asserts that target.

**So the loop already builds frontend+tests increments on one branch every time
a page lands. It just does it through the CI-failure recovery path instead of
the front door.**

### The lucky bit

On `EUDPA-533`, the frontend's second E2E run started at 14:41:50. The tests-repo
branch image did not publish until 14:56:04. Shards 1 and 2 resolved the tests
tag at ~14:41:53 and got `:latest`. **Shard 3 was stuck in the runner queue until
14:56:33 and so got the branch tag** — and shard 3 was the one holding the
failing destination specs. The frontend PR went green because a queue stall
delayed the shard that needed the fix.

That is not a mechanism to rely on. It is dealt with in §6.

---

## 5. Mechanics — does a frontend+tests increment work today?

### Branch stage

`repos` is a plain array, derived once in the ticket stage (STEP 7) and used
verbatim by branch, baseline, PR, CI fix and merge. Nothing downstream cares how
long it is. STEP 7 maps:

```
frontend → ["frontend"]      backend → ["backend"]
tests    → ["tests"]         both    → ["backend","frontend"]  IN THAT ORDER
```

**There is no `repo` value meaning frontend-and-tests.** But there is a fallback
immediately below it:

> If the field is ABSENT, `null` or empty … Read its `band` and apply this:
> `frontend-work` or anything else that changes the UI → `["frontend","tests"]`

**So the smallest change is a backlog edit, not a loop edit: delete the `repo`
field from the increment.** An `add-page` increment plainly "changes what a user
sees", so the ticket stage lands on `["frontend","tests"]`, and every later stage
follows. `inc-019` already ran on the absent-`repo` route (it is `repo: "both"`
now, but its `notes` record that the extra left `repo` null and
`backlog-generate.sh` defaulted it).

Belt and braces: also write the intent into the increment's `notes`, because the
band rule is a judgement call handed to an agent rather than a lookup.

If a loop change is ever wanted, the minimal one is two lines — add a token to
`REPO_RULE` (line 282) and a clause to STEP 7 (line 948). It is not needed, and
`increment-build-loop.js` is shared by every programme, so do not.

### Baseline stage

Runs the fastest meaningful suite per repo. Frontend: `npm test` (~1m50s). Tests
repo: "read package.json and run its unit/lint script if one exists; if the suite
needs a running stack, SKIP it and say so" — so lint plus typecheck, ~30s. No
change needed.

### Ladder stage

This is the only stage that genuinely grows. The merged ladder is the frontend
ladder plus the tests-repo ladder:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend run test:high-risk-plants
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend run format:check
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend run lint
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend run test:fit:ci

npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run lint
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run typecheck
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run format:check
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose -- --project=plants
```

`test:fit:ci` needs **no** stack: it pins `PORT=3053`, boots the app itself
through the Playwright `webServer` block with `STUB_MODE=true`, and runs both the
`features` and `journeys` projects. Observed 3m26s in CI, ~3m locally.

The tests-repo rung **does** need the stack:

```bash
~/git/defra/trade-imports-workspace/scripts/stack/run-stack.sh -d
```

**Does the local dev stack genuinely serve a branch frontend to a branch test
run? Yes, and more directly than CI does.** Under `-d` the plants frontend is
built from local source at `repos/trade-imports-plants-frontend` with `src/`
bind-mounted and nodemon hot-reload, so it serves whatever is checked out — the
work branch, including uncommitted edits. The Playwright run is the local
`repos/trade-imports-animals-tests` checkout, also on the work branch.
`playwright.docker-compose.config.ts` maps `plants` to `http://localhost:3003`,
which is the port the compose file publishes for the plants frontend. No
Dockerhub, no branch-tag probing, nothing to get wrong. `--branch` is the CI
path; `-d` is the local path.

`--project=plants` needs no setup or auth dependency project — there is none in
`utils/playwright/shared-config.ts`. It does need the address book on :8089 (the
`globalSetup` seeds fixtures through it) and the Defra ID stub for sign-in, both
of which a default `run-stack.sh -d` brings up.

**Ladder cost.** The five plants spec files hold ~38 tests. `--project=plants`
locally, against an already-running stack, is a few minutes; the stack start
itself is 2–4 minutes and is a one-off for the session, not per increment. Call
it **+5 minutes on the ladder**, against the ~19 minutes of fixed overhead a
separate tests increment would have cost.

### Pull request stage

Raises at most one PR per repo, skipping any repo with no commits ahead of the
base. Persists each to `prs[]` immediately. Works unchanged for two repos —
`inc-019` and every one of the six CI-fixer cases above prove it.

### CI stage

Watches every PR in `prs[]`. **The two PRs' CI runs concurrently**, because they
are separate repos with separate Actions queues. So a merged increment waits
≈ max(8m45s, 9m30s) ≈ 9m30s, where two separate increments wait
8m45s + 9m30s ≈ 18m15s serially. **That is where most of the merging saving
comes from.**

### Merge stage

`sortForMerge` puts tests before frontend. Both PRs must be green before either
merges. After each merge it watches the base branch. The final sweep then checks
every configured GitHub repo for an open PR left on the branch:

```bash
gh pr list --repo DEFRA/trade-imports-plants-frontend --head <branch> --state open --json number,url,title
gh pr list --repo DEFRA/trade-imports-plants-backend  --head <branch> --state open --json number,url,title
gh pr list --repo DEFRA/trade-imports-animals-tests   --head <branch> --state open --json number,url,title
```

Any hit stops the run with `stopReason: "pr-left-open"`. Unchanged for a merged
increment.

**Note that the merge stage saves nothing.** Both repos still merge and both base
branches are still watched — 2m46s for tests, 7m47s for the frontend. That is why
a frontend+tests merge saves less than batching two frontend increments, which
drops a whole 7m47s watch.

---

## 6. The push-ordering hazard, and the fix

§4 showed the frontend E2E resolving the tests image tag once, per shard, at
shard start. Left to itself the PR stage pushes in `repos` order — which the band
fallback makes `["frontend","tests"]` — and the timings then run:

| t | Event |
|---|---|
| 0m00 | frontend pushed, Publish Branch Image starts |
| ~1m00 | tests pushed, Publish Branch Image starts |
| 2m30 | frontend branch image published; frontend E2E created |
| ~2m35 | **frontend E2E shards resolve the tests tag — the tests branch image does not exist yet, so they take `:latest`** |
| 4m00 | tests branch image published — too late |

The frontend PR then goes red on the stale spec it has already fixed on its own
branch, and the increment burns a full CI-fix cycle for nothing.

**Fix: push the tests repo first and let its branch image publish before pushing
the frontend.** Write this into the increment's `notes` so the PR stage follows
it:

```bash
WS=~/git/defra/trade-imports-workspace
BR=<the work branch>

git -C "$WS/repos/trade-imports-animals-tests" push -u origin "refs/heads/$BR:refs/heads/$BR"
gh pr create --repo DEFRA/trade-imports-animals-tests --base main --head "$BR" \
  --title "…" --body-file "$WS/workareas/journey-builder/EUDPA-409/logs/<id>-pr-tests.md"

# block until the tests branch image exists, so the frontend E2E shards can find it
RUN=$(gh run list --repo DEFRA/trade-imports-animals-tests --branch "$BR" \
        --workflow "Publish Branch Image" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN" --repo DEFRA/trade-imports-animals-tests --exit-status

git -C "$WS/repos/trade-imports-plants-frontend" push -u origin "refs/heads/$BR:refs/heads/$BR"
gh pr create --repo DEFRA/trade-imports-plants-frontend --base main --head "$BR" \
  --title "…" --body-file "$WS/workareas/journey-builder/EUDPA-409/logs/<id>-pr-frontend.md"
```

Costs about 3 minutes of serialisation. Saves a ~13-minute red cycle. Worth it.

Confirm the probe resolved as intended afterwards, in the E2E job's "Resolve
branch tag" step — it prints either `Tests image: branch (<tag>)` or
`Tests image: latest (no branch tag)`.

---

## 7. Per-increment verdicts for the four remaining E2E increments

### inc-047 — parties section spec — **merge, but not into its page increment**

`detail` covers two pages: consignor-select (**inc-045, already merged**) and
identification-numbers (**inc-046, in flight right now with PR #52 open**). Both
of its page increments are gone or going. The clean fold is no longer available.

It should still be batched — with **inc-048**, the contact page. That is not "a
page and its own spec" but it is the same saving, and it is safe: writing the
parties spec on the same branch as the contact page means the parties spec is
written against the journey the contact page creates, which is exactly what the
six stale-spec repairs above were doing after the fact.

Note what already happened here. PR #185 created
`page-objects/plants/plants-consignor-select-page.ts` carrying only the slug,
with the body saying *"the locators the consignor's own spec will want come with
that spec"*. That page object is waiting for inc-047. Nothing is lost by inc-047
arriving later than its page.

### inc-049 — contact section spec — **merge into inc-048**

The clean case. `detail` names exactly one page object,
`consignment-contact-select`, which is exactly what inc-048 builds. One page, one
spec, one branch, one CI round. Saving ≈ 15 minutes.

### inc-055 — check and submit section spec — **do not merge**

It spans inc-050 (CYA), inc-052 (declaration), inc-053 (confirmation) and
inc-054 (cancel-amend), and its `detail` also carries assertions **deferred from
inc-037, inc-043 and inc-044** that could not be written when those increments
ran because no check-answers feature or submit route existed yet:

- the origin-mismatch error on Check your answers with a Change link (carried
  from inc-037, ruling d-054);
- *Not provided* for a destination whose address-book record has since been
  deleted (carried from inc-043/inc-044).

There is no single page increment those belong to. Keep inc-055 as its own
increment, after inc-054.

### inc-057 — full happy-path journey spec — **do not merge**

Five end-to-end walks from sign-in to confirmation, one per mural use case,
crossing every section. It is the definition of journey-level. Keep it last.

### The general rule

**E2E that asserts a page's own behaviour belongs with the page. E2E that asserts
a property of the whole journey does not.**

Concretely, an add-page increment should carry:

- the new page's own spec — fields, validation, hub row, the flow edge in and the
  flow edge out;
- **the repair to the preceding section's spec**, because the new page moves its
  *Save and continue* target. This is not optional extra scope; it is what six of
  six page increments have already had to do, late, through the CI fixer.

A separate, journey-level increment should carry:

- properties that hold across pages — the submission gate, cross-page consistency
  errors, read-only-after-submit, the late-notification banner;
- assertions deferred from earlier increments because the page that proves them
  had not been built;
- the use-case walks.

Applied to what is left: the *only* remaining per-page fold is inc-049 into
inc-048. inc-047 is a batching opportunity rather than a fold. inc-055 and
inc-057 stay as they are. **That is a small result, and it is worth saying so
plainly: merging frontend and tests increments is not where the time is.**

---

## 8. The two CI-fix cycles that are worth more than merging

`inc-045`'s successful attempt ran 15:11 → 16:19 local, **68 minutes**. Two
CI-fix cycles took 34 of them — half the increment.

### Cycle 1 — SonarCloud `new_duplicated_lines_density`

The quality gate on the plants frontend, read live:

```bash
# via the sonarqube MCP server, project DEFRA_trade-imports-plants-frontend
new_duplicated_lines_density  errorThreshold 3
new_coverage                  errorThreshold 90
new_blocker_violations        errorThreshold 0
new_critical_violations       errorThreshold 0
new_major_violations          errorThreshold 0
```

The consignor-select page was built by copying the place-of-destination picker,
and the gate failed on duplication. The fixer's repair is visible in PR #51's own
file list: `features/address-book-picker/` gained `pagination.js` (+91),
`render.js` (+80) and `view-model.js` (+62), while `place-of-destination` lost
184 lines across its controller and view-model. That shared module is on `main`
today:

```
repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/address-book-picker/
  address-lines.js   30
  pagination.js      91
  render.js          80
  view-model.js      62
```

**inc-048 builds `consignment-contact-select` — another address-book picker.**
Unless its increment text says so, the implementor will copy `consignor-select`
and hit the same gate. inc-050 (check-answers) and inc-054 (cancel-amend, which
resembles the existing delete-notification confirmation page) carry the same
risk.

The remedy is a sentence in each increment's `detail`:

> Reuse `journeys/linear/features/address-book-picker/` — do not copy the sibling
> page. SonarCloud fails the PR at 3% new duplicated lines and 90% new coverage.

**Estimated saving: 3 occurrences × ~13 minutes ≈ 40 minutes.** Cost: three
sentences.

### Cycle 2 — the stale preceding spec

Covered in §4. Six for six. The remaining frontend increments that will move a
journey edge are inc-048, inc-050, inc-052, inc-053 and inc-054.

The remedy is a sentence in each increment's `detail`:

> This page changes where the preceding page's *Save and continue* goes. Update
> `repos/trade-imports-animals-tests/tests/e2e/features/plants/<preceding>.spec.ts`
> on the SAME branch, and add the page object under `page-objects/plants/`.
> Delete the `repo` field from this increment so the ticket stage branches the
> tests repo too. Push the tests repo first — see §6.

**Estimated saving: 5 occurrences × ~13 minutes ≈ 65 minutes.** Cost: five
sentences.

Note what this does to the merging question. Once these sentences exist, the
tests-repo work happens inside the frontend increment anyway — which is most of
what "merging" was going to buy, obtained without touching the backlog's
structure or its ids.

---

## 9. Sequential slots

Thirteen `todo` increments remain after inc-046, in a strict line. Four are
`blocked` behind `gate: sam` (inc-059, inc-060, inc-061) or hang off the end
(inc-062).

| Option | Slots | Machines | Est. wall clock |
|---|---|---|---|
| **Today** — inc-046 … inc-062 as authored | 14 | 1 | baseline |
| **Merge frontend+tests pairs only** — inc-049 into inc-048 | 13 | 1 | −15 min |
| **Batch as recommended** (§10) | 9 | 1 | −100 to −120 min |
| **Parallel split** (companion analysis, 5 edges re-pointed) | 10 | 2 | −29% of slots, second machine idle 6 of 10 |

### Merging and parallelism are mutually exclusive, and the merge is the better bet

The companion analysis found that the only parallel pairs available are
frontend-increment beside tests-increment: (047, 048), (049, 050), (055, 056),
(057, 058). Merging consumes exactly those pairs.

More than that — **the parallel split manufactures the failure that has already
happened six times.** Running inc-047 (parties spec) beside inc-048 (contact
page) means writing the parties spec against a journey that inc-048 is
simultaneously changing: the identification-numbers page's *Save and continue*
stops going to the hub and starts going to the contact page. inc-047 goes green,
merges, and inc-048 breaks it an hour later. The companion analysis named that as
"the biggest risk in the whole proposal and the claim protocol does nothing about
it". It is not a hypothetical; it is the exact shape of tests PRs #162, #164,
#168, #172, #177 and #185.

Two machines, ten slots, and a manufactured race is worse than one machine, nine
slots, and no race.

---

## 10. Recommended shape of the remaining backlog

Ids are bound to rulings and citations, so **nothing is renumbered**. Absorbed
increments keep their id and get `status: "merged-into"` with the absorbing id
named in `notes`, which is the convention the backlog already uses (inc-030,
inc-033 and inc-040 are `merged-into` today).

| Slot | Increments | Repos | Note |
|---|---|---|---|
| 1 | inc-046 | frontend | in flight, leave alone |
| 2 | **inc-047 + inc-048 + inc-049** | frontend + tests | contact page, its spec, and the parties spec |
| 3 | **inc-050 + inc-051** | frontend | check-answers page and its exemplar chore |
| 4 | **inc-052 + inc-053 + inc-054** | frontend | declaration, confirmation, cancel-amend |
| 5 | inc-055 | tests | check-and-submit journey spec |
| 6 | inc-056 | frontend | journey-smoke fit spec |
| 7 | inc-057 | tests | full happy-path journey spec |
| 8 | inc-058 | frontend | README chore |
| 9 | inc-062 | frontend | engine sync chore |

Fourteen slots become nine. Slots 3 and 4 are pure frontend batching and account
for most of the saving, because each dropped frontend increment drops a 7m47s
base-branch watch as well as its lifecycle stages.

Slot 2 is the frontend+tests merge, and is the one that needs the §6
push-ordering rule.

**Stop batching there.** Slots 5 to 9 are each either journey-level, gated, or a
chore whose blast radius is the whole engine (inc-062). Batching those buys the
same ~20 minutes each but raises the chance of a failed attempt, and `inc-045`
already showed what that costs — three attempts, two of them abandoned, before
the successful 68-minute run.

---

## 11. Migration — folding without renumbering or losing evidence

The rule is: **an absorbed increment's `detail` moves verbatim into the absorbing
increment's `detail`, under a heading that names its id.** The `detail` fields
carry evidence citations (`behaviours proportionate-questions-by-scope`,
`track-and-trace-data`, `scope-and-wipe-on-exit`, `lenient-page-validation`,
`address-book-picker`) and those citations are the link back to the ruled spec.
Losing them would break the audit trail from `decisions.json` through to the
code.

Do it as an edit in place. **Never regenerate** — `backlog-generate.sh`
renumbers, and the 2026-09-06 regeneration under d-084 already shifted every id
after `dashboard-date-submitted-real-list` by two.

```bash
B=~/git/defra/trade-imports-workspace/workareas/journey-builder/EUDPA-409/backlog.json

# 1. Read what is being folded, so the prose is preserved exactly.
jq -r '.increments[] | select(.id=="inc-047" or .id=="inc-049") | .id + "\n" + .detail' "$B"

# 2. Absorb: append each detail under a named heading in inc-048, drop inc-048's
#    `repo` so the ticket stage branches frontend AND tests, and record the
#    push-ordering rule and the two pre-emptions in `notes`.
#    Edit the file directly — the detail is long prose and jq string surgery on
#    it is a good way to lose a citation.

# 3. Mark the absorbed increments, keeping their ids and their own detail intact.
jq '(.increments[] | select(.id=="inc-047" or .id=="inc-049") | .status) = "merged-into"' "$B" > "$B.tmp"
jq empty "$B.tmp" && mv "$B.tmp" "$B"

# 4. Re-point the dependency edges that pointed at the absorbed increments.
jq '(.increments[] | select(.id=="inc-048") | .dependsOn) = ["inc-046"]
  | (.increments[] | select(.id=="inc-050") | .dependsOn) = ["inc-048"]' "$B" > "$B.tmp"
jq empty "$B.tmp" && mv "$B.tmp" "$B"
```

Step 4 matters: the build-orchestrator's derive query withholds `merged-into`
from selection but still requires every `dependsOn` to be in the `done` set, so
an increment left depending on a `merged-into` id can never be derived and the
run stalls.

Do the same for inc-051 into inc-050, and inc-053 and inc-054 into inc-052.

**Do this only between increments, never while a build is running** — inc-046 is
building against this file right now.

### What happens to E2E work whose page has already shipped

inc-047 is the case: it names page objects for consignor-select, and
consignor-select landed with inc-045 on 2026-09-09.

Nothing special. The spec is written against `main` plus whatever the absorbing
increment adds, and consignor-select is on `main`. The half-built page object
`page-objects/plants/plants-consignor-select-page.ts` (14 lines, slug only) is
already there waiting for its locators. The only thing lost is the tidiness of
"the page and its spec in one commit", and tidiness was never the objective.

The general answer: **an E2E increment whose page has already shipped is not
orphaned — it is simply late, and lateness costs nothing except the fixed
overhead of its own lifecycle.** Batch it onto whatever increment comes next in
the same repo pair and recover that overhead.

---

## 12. The strongest arguments against all of this

**Batching hides which change broke the build.** A five-page increment that goes
red on E2E tells you far less than a one-page increment that does. `inc-045` took
three attempts; a batched `inc-045` would have taken three attempts over three
times the work, and the two abandoned attempts left `ATTEMPT FAILED` notes and
wip commits that a bigger increment makes correspondingly harder to build on.
The estimate of ~20 minutes saved per batch assumes the batch goes green on the
same number of attempts as its parts would have. That assumption is the whole
case, and it is not tested.

**The saving is smaller than it looks because the work does not shrink.** Merging
two increments saves the fixed overhead and nothing else. The implement, review,
verify, judge, fix and ladder stages all still run over the same code. The
~100–120 minutes at the top of this document is roughly one and a half
increments' worth of wall clock out of a remaining run that is on the order of
13 hours. It is a 12 to 15 per cent saving, not a transformation.

**The biggest single lever is the one that cannot be pulled.** The frontend's
`Publish (on main)` watch costs 7m47s per increment — ~100 minutes across the
remaining run — for a docker image build that proves nothing about correctness.
Fixing it means editing `increment-build-loop.js`, which is shared by every
programme and which the skill says never to edit. Everything recommended here is
working around a wait that should not exist.

**And the variance dwarfs the medians.** One E2E run took 47m58s and one shard
waited 14m40s for a runner, both purely from GitHub-hosted runner availability.
Two bad draws would wipe out everything recommended here. Lever 4 — running one
shard instead of three for a plants-only change — is the only thing that reduces
that exposure, and it is the one lever this document is least confident about,
because it means changing a reusable workflow that four repos depend on.
