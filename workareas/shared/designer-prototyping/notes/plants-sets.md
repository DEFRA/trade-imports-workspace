# Plants prototype: the set mechanism and sync safety, from a designer's seat

Read against `repos/trade-imports-plants-prototype` at `feat/NO_JIRA-designer-prototyping`
(HEAD `aeb1617`, 2026-09-27). Every claim below was checked in source; file paths are
repo-relative.

## 1. What a set is, mechanically

A set is one Hapi plugin mounted under `/<set-id>`, plus the directory that plugin
composes from. Two sets ship today: `high-risk-plants` (the real journey, 2.5 MB,
~200 files) and `sample-journey` (one page, 40 KB, 10 files).

| Piece | Where | Owner at sync time |
|---|---|---|
| Set identity `SET_ID`, `SET_BASE = '/' + SET_ID` | `src/server/app/sets/<id>/set.js` | upstream for high-risk-plants; `ours` for any scaffolded set |
| Set content (obligations, journeys/linear/{config,flow,features}, services, docs, spec) | `src/server/app/sets/<id>/**` | same |
| Gateway (the composition root that calls the eight `configure*` seams with `SET_ID` first, sandboxes its extensions, wraps every route) | `src/server/app/routes-<id>.js` | same |
| Mount | high-risk-plants: `src/server/router.js` (patched, one line). Every other set: `src/server/prototype-sets/index.js` (`ours`) | |
| Chooser at `/` + `POST /reset/{setId}` | `src/server/sets-index/**`, template at `src/server/app/sets-index/template.njk` | `ours` |
| Chooser description | `src/server/prototype-sets/descriptions.js` (a literal map keyed by set id; a set missing from it still lists, just undescribed) | `ours` |
| Example data | `src/server/prototype-seed/**` — `SEEDERS = { 'high-risk-plants': seedHighRiskPlants }`, `SEED_AUTHOR_IDS` likewise | `ours` |

How a set becomes visible: `registerSetMount(SET_ID, SET_BASE)` in the gateway writes to a
module-level `mounts` Map in `src/server/app/shared/set-context.js`. The chooser reads
`mountedSetIds()` per request and renders one row per mount. So a set appears on `/` by
being mounted, full stop — no list to maintain. Reset is `records.clear()` inside the set's
context, then the set's seeder again if it has one.

Set context is an `AsyncLocalStorage`. Each gateway enters it on a sandboxed `onPreAuth`,
re-enters it in the `onPreHandler` entry guard (auth crosses an async boundary), and wraps
every route handler. When exactly one set is mounted, `soleSetId()` lets code outside any
request resolve the set anyway — this fallback is load-bearing for the unit suite and is
what makes copying high-risk-plants hard (section 4).

Templates: Nunjucks has two roots, `server/app` and `server/app/sets`
(`src/config/nunjucks/nunjucks.js`). A set's controllers build view names from
`TEMPLATES = '<set-id>/journeys/linear'` in `journeys/linear/config.js`, so the set id is
baked into every view path. Cookie names are the camelCase id
(`highRiskPlantsKnownJourneys`, ...) — two sets sharing a name would share the draft list.

Route prefixes are not a choice: `'/' + setId`, enforced by `registerSetMount` (throws on
empty prefix) and `no-set-singletons.test.js` (asserts `SET_BASE === '/' + SET_ID`).
Server-wide surface stays at the root: `/`, `/health`, `/auth/*`, `/public/*`,
`/reset/{setId}`, `/favicon.ico` — pinned by `co-residency.test.js` as an exact sorted list.

## 2. `npm run new:set -- <id> [--from <template>]`

`scripts/new-set/index.js`. Read fully; `--help` is harmless (it is treated as a set id,
fails the kebab-case check and exits 1 with no writes — confirmed by running it, tree
still clean).

What it does, in order:

1. Validates `<id>` is `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`. Refuses if `sets/<id>` exists or
   the template lacks either `sets/<from>/` or `routes-<from>.js`.
2. `copySetTree(sets/<from>, sets/<id>)` — recursive copy, rewriting every path segment
   (kebab id only) and every file's content through `transformContent`:
   - `<from>` → `<id>` (kebab: paths, `SET_ID`, `TEMPLATES`, doc links)
   - `camelCase(from)` → `camelCase(id)` (cookie names, plugin binding, `xxxObligationSet`)
   - `sentenceCase(from)` → `sentenceCase(id)` (`'Sample journey'` heading/body)
   - **every UUID literal is replaced with a fresh `randomUUID()` per match**
3. `copyRoutesFile(routes-<from>.js, routes-<id>.js)` same transform.
4. `registerSet(prototype-sets/index.js)` — string-splices an import pair and a
   `server.register(<camel>, { routes: { prefix: <SCREAMING>_BASE } })` before two anchor
   lines. Throws "mount it by hand" if the anchors have moved. Output is not prettier-formatted
   (hence next-step 1: `npm run format`).
5. `addOwnedPaths(overrides.json, ['src/server/app/sets/<id>/**', 'src/server/app/routes-<id>.js'])`.
6. Prints next steps: format, `npm test` + `npm run test:fit`, replace
   `features/welcome/`, add a description in `descriptions.js`.

What it does NOT touch: `descriptions.js`, `playwright.config.js`, `vitest.config.js`,
`package.json` scripts, `prototype-seed/`, `README.md`, `PROTOTYPE.md`.

### From `sample-journey` (the default) — works end to end

The copy is one obligation (`system: true`, so no page has to collect it), one `welcome`
page (`dashboardRoutePath()` GET rendering a heading and paragraph), empty `taskRows`,
`nextRunTarget → null`, `entryGuardTarget → null`. It boots, passes every platform
tripwire, lists on the chooser and the chooser FIT spec walks into it. The designer then
builds up from nothing using the high-risk-plants recipe docs as the reference. There are no
tests in the copy, so nothing to un-break.

### From `high-risk-plants` — NOT viable today without tooling work

The transform itself is sound for this template: the 27 obligation UUIDs each appear exactly
once in source (`obligations/sections/*.js`; feature bindings import the object, never the
string), so fresh-per-match does not break cross-references. `high-risk-plants` /
`highRiskPlants` are the only shapes present (no `High risk plants` in copy). `spec/*.json`
and `docs/*.md` carry no UUIDs and their `high-risk-plants` mentions rewrite cleanly.

What breaks, verified by reading the code paths:

1. **All ~50 copied `*.test.js` files fail.** `journeys/linear/test-support.js` (renamed
   `install<Camel>Journey`) calls `registerSetMount(SET_ID, SET_BASE)` with the new id.
   The vitest global setup (`test/setup-obligation-set.js` → `test/fixtures/index.js`)
   already mounted `high-risk-plants` (the fixture deliberately borrows that id so the
   sole-set fallback holds). Two ids mounted → `soleSetId()` is undefined → every
   `driveHandler(get)` call (engine/test-support.js, which never enters a set context)
   throws `No set context — no active set, and 2 sets are mounted`. The shipped
   high-risk-plants tests only pass because their id equals the fixture's.
2. **The 18 copied `*.fit.spec.js` files are run by vitest as unit tests.**
   `vitest.config.js` excludes only
   `src/server/app/sets/high-risk-plants/journeys/linear/features/**/*.fit.spec.js`
   (a literal). Vitest's default include matches `*.spec.js`, so the copies load
   `@playwright/test` under vitest and fail. `vitest.config.js` is an upstream file (not in
   `ours` or `patched`) — editing it is a new undeclared divergence.
3. **Playwright never discovers the copied FIT specs** (the `features` project's `testDir`
   is the high-risk-plants features dir), and if a project were added, the specs would still
   drive the wrong set: every one imports `BASE`/`setUrl` from `fit/set-base.js`, which
   re-exports high-risk-plants' `SET_BASE`. `playwright.config.js` is `patched`, so
   adding a project is at least a declared kind of change.
4. **No example data.** `prototype-seed/index.js` keys `SEEDERS` by literal set id, and
   `seed-high-risk-plants.js` + `scenarios.js` import high-risk-plants' `SET_BASE` and
   `flow/fixtures/happy-path.json` directly. A copied set's dashboard starts empty and
   "Reset this prototype's data" just clears it. All of `prototype-seed/**` is `ours`, so
   parameterising it by set is a safe prototype-side change.
5. `package.json` gains no `test:<id>` / `capture:<id>` scripts (patched file; fine to add).
6. Cosmetic: `README.md`, the set's `docs/README.md` "served surface" prose and
   `spec/` (1.0 MB of EUDPA-409 digest JSON) come along for the ride; `docs/` and `spec/`
   are ballast a design release does not need.

Platform tripwires that a faithful copy passes: `no-set-singletons.test.js` reads every
`routes-*.js` (regex-discovered) and would accept the copy; `.dependency-cruiser.cjs`
rules use `[^/]+`/`$1` capture groups and the known-violations baseline is `[]`, so
`lint:arch` passes; `copy-parity`/`copy-convention`/`contract`/`indexed`/`store-ops` name
high-risk-plants literally and ignore the copy; `co-residency` uses `arrayContaining` for
mounts and an exact root-route list that the copy does not disturb; eslint has no per-set
paths.

## 3. `npm run sync:upstream` and what overrides.json actually means

`scripts/sync-upstream/sync.js`, weekly at 04:00 Monday via `.github/workflows/sync-upstream.yml`
(`--push --summary`), or by hand. It has **not yet run in anger** — no `sync/upstream-*`
branch exists on origin; the first scheduled run is 2026-09-28. Today `HEAD` vs
`upstream/main` differs in 105 files, all accounted for by overrides.json (the set itself is
byte-identical to upstream: `git diff upstream/main HEAD -- src/server/app/sets/high-risk-plants`
is empty).

Steps: ensure `upstream` remote (push URL `DISABLED`) → fetch `upstream/main` → if already
an ancestor, write "nothing to do" and stop → `git switch -c sync/upstream-<date> main` →
`git merge --no-commit --no-ff upstream/main` → for every path in `git status --porcelain`:

| Rule (`rules.js#classifyPath`, first match wins) | Action |
|---|---|
| matches a `deleted` glob | `git rm -f --ignore-unmatch` — upstream's file never comes back |
| matches an `ours` glob | `git checkout HEAD -- path` (or `--ours` if conflicted), then `git add` — **upstream's version of the file is discarded entirely** |
| anything else (incl. `patched`) | left as git merged it — a clean 3-way merge stands, a conflict stays with markers |

then `git add -A`, `git commit --no-verify` (message notes the conflict count), run
`npm ci` (pinned npm 11.6.2) → `npm run lint` → `npm test` → `npm run test:fit`
(the "set boot check"), write the markdown summary, and with `--push` open a PR. The PR is
a **draft labelled `needs-person`** whenever any conflict remains or any check fails;
otherwise it opens ready. (Critic correction: PROTOTYPE.md says it "merges itself", but no
code merges it — `createPullRequest` is a bare `gh pr create`, and PRs opened with
`GITHUB_TOKEN` do not trigger the PR-check workflow. Someone must merge every sync PR.)

Semantics that matter for designers:

- **`patched` is documentation, not a rule.** `classifyPath` returns `'patched'` for every
  non-deleted, non-ours path, whether or not it is listed. The list exists so a human knows
  which upstream files carry a deliberate prototype change and why (`overrides.test.js`
  checks each literal patched path exists and never overlaps `ours`). There is **no test
  that the set of files differing from upstream equals `ours ∪ patched`** — undeclared drift
  is possible and only shows up as a surprise conflict later.
- **"The sync will overwrite anything you change" (PROTOTYPE.md) is not literally what
  happens.** An edit to an upstream-owned file is 3-way merged. It survives every week
  upstream leaves those lines alone; the week upstream touches the same hunk it becomes a
  conflict → `needs-person`. Semantic breakage (upstream renames a helper your page calls)
  merges cleanly and is caught only by the checks → also `needs-person`. So the real
  contract is: edits to non-`ours` paths are on borrowed time and land on a person to
  reconcile, not silently lost.
- **`ours` is the only true safe harbour** — and it is absolute: upstream changes to an
  `ours` path are thrown away, including a genuine upstream fix to a file that happens to
  match. That is the right behaviour for `sets/<new-id>/**` (upstream has no such path) and
  the reason `new:set` adds exactly those two globs.
- Checks run on the merged tree with conflict markers still in it, so a conflicted week's
  lint/test lines in the summary are noise; the conflicts list is the signal.

## 4. If a designer edits the `high-risk-plants` set directly

`src/server/app/sets/high-risk-plants/**` and `routes-high-risk-plants.js` are upstream's
(not in `ours`). Concretely, per kind of edit:

| Edit | Next Monday |
|---|---|
| Copy tweak in `copy.en.js` / `copy.cy.js` | survives until upstream edits the same lines; then conflict → draft PR, `needs-person`. Also: `copy-parity.test.js` fails the sync's checks if `cy` and `en` drift in shape, and the "every string leaf must differ between en and cy" rule bites a designer who edits only English to match Welsh (or vice versa) |
| Template change in a `.njk` | same merge story; nothing else guards templates |
| New feature folder + registration in `features/index.js`, `flow/flow.js`, `task-rows.js`, `evaluation.js`, an obligation in `obligations/sections/*` | the new folder survives (upstream never touches it); each barrel/flow edit is a conflict magnet because upstream edits those exact files when it adds pages. Boot guards (`assertFullCoverage`, `assertFulfilmentBindingCoverage`, `assertSetConfigured`) turn a half-registered feature into a boot failure that fails `test:fit` → `needs-person` |
| Anything in `journeys/linear/config.js` or `set.js` | conflict-prone and platform-visible (cookie names, TEMPLATES, mount) |

Two further consequences: (a) the change is in the deployed prototype but **not** in the real
service, and PROTOTYPE.md's stated route back is "raise a PR on plants-frontend"; once that
merges the next sync brings the same change in and the local copy conflicts with itself
unless byte-identical. (b) Every edit accumulates: with N designer edits outstanding the
probability of a `needs-person` week rises with each upstream sprint, and someone (not the
designer) has to resolve each one by hand on a `sync/upstream-<date>` branch.

Verdict: editing high-risk-plants in place is acceptable for a one-off copy experiment that
will be discarded or sent upstream within the week, and wrong as a way of working.

## 5. What a safe "design release" looks like

A design release = a designer-owned copy of the journey, mounted as its own set, that may
diverge from upstream indefinitely and is never merged back by the robot.

The mechanism already exists in principle — `new:set --from high-risk-plants` — and
`overrides.json` `ours` globs make it sync-proof the moment it is scaffolded. What is missing
is the surrounding tooling so the scaffold boots, tests and seeds without hand work. The
gaps in section 2 map one-to-one onto changes that are all on the prototype's own side
(`ours` or `patched` files), none upstream:

1. **Set-context for copied unit tests.** Either make `engine/test-support.js#driveHandler`
   enter a set context (upstream file — a real fix that belongs in plants-frontend and
   would help animals too), or have `new:set` drop `**/*.test.js` when copying from a
   template that is not `sample-journey`, or make each copied `test-support.js` wrap its
   installer in `withSetContext`. The cheapest safe option inside the prototype is to
   **not copy tests** for a design release: a designer's fork does not need to carry the
   engineering suite of the journey it forked from, and the platform tripwires
   (`no-set-singletons`, `set-completeness`, `co-residency`, chooser FIT) still prove the
   set boots.
2. **FIT specs.** Same call: drop `**/*.fit.spec.js` and `**/fit/` from the copy, or
   teach `new:set` to add a Playwright project + vitest exclude per set and rewrite the
   `fit/set-base.js` import to a per-set `set-base`. Dropping is simpler and honest; the
   chooser spec already asserts every mounted set boots with assets, no console errors
   and GOV.UK styles applied.
3. **Seed data per set.** Parameterise `prototype-seed/` by set: `SEEDERS` becomes
   "any mounted set whose directory carries `journeys/linear/flow/fixtures/happy-path.json`"
   (the copy carries it, path rewritten), `seed-high-risk-plants.js` takes `SET_BASE`
   from the set, `scenarios.js` resolves the fixture relative to the set. All `ours`.
4. **Trim ballast on copy.** Skip `spec/` (1.0 MB of digest JSON) and optionally `docs/`
   when the template is high-risk-plants; the design release should link to the source
   set's docs rather than fork them.
5. **`new:set` writes the description** (append to `descriptions.js`, `ours`) and a
   `test:<id>` script (patched `package.json`) so steps 1 and 4 of its printed next-steps
   disappear.
6. Add a `--from high-risk-plants` regression test in `scripts/new-set/` that scaffolds into
   a temp dir and boots the router (today `cli.test.js` covers only `parseArgs`).

With those, one design release = `npm run new:set -- <release-id> --from high-risk-plants`,
then edit freely under `src/server/app/sets/<release-id>/`, following the recipe docs
verbatim with `<release-id>` in place of `high-risk-plants`.

## 6. Is a set per design release viable?

- **Size.** Each release is a ~1.2 MB copy of `journeys/` + 56 KB obligations + 20 KB
  services (2.5 MB with `spec/` and `docs/`, which should be skipped). Node loads every
  mounted set at boot; four or five releases is nothing, dozens would be noticeable in
  `npm run dev` restart time and repo size, but that is not the working set a design team
  holds. Rule of thumb: keep live releases to a handful and delete (git rm the folder,
  the routes file, the mount lines, the two overrides globs, the description) when a release
  is superseded.
- **Route prefixes.** Free: `/<release-id>` by construction; `setIdForPath` takes the
  longest match so `/dr2` and `/dr2-alt` coexist. Ids must be kebab-case; pick something
  like `plants-dr2` rather than `dr2` so the chooser reads sensibly.
- **Cookies.** Free: derived from the camelCase id, so sessions in one release never see
  another's drafts. Sign-in is server-wide and shared.
- **Tests.** Platform suites cover every mounted set generically. Per-set tests are the
  cost centre and, per section 5, a design release should carry none of the forked
  suite; `copy-parity`/`copy-convention` only scan high-risk-plants, so a release's Welsh
  can lag its English without failing the build (a deliberate loosening — worth stating in
  the designer guide).
- **Seed data.** Viable once `prototype-seed` is set-parameterised (section 5.3); until
  then a release's dashboard is empty on first visit.
- **Sync.** Each release's two globs go into `ours`; the sync leaves them alone forever.
  A release never receives upstream improvements either — that is the point, and the
  designer guide should say "a release is a snapshot of the real journey on the day you
  made it".
- **Deployment.** Every push to `main` publishes one image (`publish.yml`); all sets ride
  the same deploy, so a release is live at `https://<prototype>/<release-id>` as soon as
  its PR merges. No per-release infrastructure.
- **Upstream re-sync of a release.** Not provided and should not be promised; if a
  release wants a later upstream feature, scaffold a fresh release from the then-current
  high-risk-plants and re-apply the design deltas (or cherry-pick the feature by hand).

Verdict: a set per design release is the right model and is cheap in every dimension except
the copied test suite, which should simply not be copied.

## 7. Which paths a designer can safely own

Safe (in `ours`, robot never touches):

- `src/server/app/sets/<their-set>/**` and `src/server/app/routes-<their-set>.js` for any
  set created with `new:set`
- `src/server/app/sets/sample-journey/**`, `routes-sample-journey.js`
- `src/server/prototype-sets/**` (mounts, descriptions)
- `src/server/prototype-seed/**`, `src/server/sets-index/**`, `src/server/app/sets-index/**`
- `PROTOTYPE.md`, `overrides.json`, `scripts/new-set/**`, `scripts/sync-upstream/**`

Declared-diverged, edit with care and update the `why` (in `patched`): `playwright.config.js`,
`package.json`, `README.md`, `src/config/config.js`, `src/server/router.js`, the four
`isStubDataMode` service seams, `src/server/common/services/mode.js`, and the rest of the
20-entry list.

Never, unless the change is meant for the real service: everything else — notably
`src/server/app/sets/high-risk-plants/**`, `routes-high-risk-plants.js`, `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`,
`src/server/app/shared/layout.njk`, `src/client/**`, `vitest.config.js`,
`webpack.config.js`, `.dependency-cruiser.cjs`, `fit/**` except `fit/sets-chooser.fit.spec.js`.

Gaps in that story worth closing: `vitest.config.js` will need a per-set exclude the
moment any set carries FIT specs (making it de facto patched), and `fit/set-base.js` is a
single-set helper masquerading as shared.

## 8. Loose ends noticed along the way

- `package.json` still carries `fit:start:workspace` → `check:workspace-stack`, whose
  script `scripts/check-workspace-stack.js` is in `deleted`; the script is dead.
- `docs/repos/trade-imports-plants-prototype.md` in the workspace says the repo is not
  cloned and nothing is verified — stale since 2026-09-21.
- `journeys/linear/docs/testing.md` still says "The set currently owns no test files" —
  upstream drift, not the prototype's to fix.
- `new:set` prints "Replace .../features/welcome/ with the real journey" even when
  `--from high-risk-plants` was used and there is no `welcome/`.
- `descriptions.test.js` only asserts high-risk-plants has a description; nothing fails
  when a new set is undescribed, so next-step 4 is easy to forget.
