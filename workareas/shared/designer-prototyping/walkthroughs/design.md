# Walkthroughs as documentation, and the Playwright report on GitHub Pages

Sam's ask, condensed: every prototype, including each design release, gets
FIT-style Playwright walkthroughs made for it automatically. They are
documentation, not tests. The Playwright report, with video, screenshots and
trace, goes to the `gh-pages` branch using the cleanup logic from the other
repos. That report is the shareable demo of the prototype. All of this has to
be written into the skills and docs.

Branch: `feat/NO_JIRA-designer-prototyping`, in both the workspace and
`repos/trade-imports-plants-prototype`. Nothing is pushed.

## 0. What is already there (so we build on it, not beside it)

- `fit/designer-sets.fit.spec.js` already walks **every design release** to
  confirmation, one test per happy-path scenario, with axe. It runs in the
  `journeys` project (video and trace on), so a design release is **not**
  without FIT coverage. The earlier fact that "a design release gets NO FIT
  specs" is only true of *copied* specs. This walk is a **gate**: its step
  names are slugs (`3. origin`), it takes no picture per step, and it walks
  scenarios rather than the labelled examples designers write. We keep it as
  the gate and do not change it.
- `scripts/designer/show/walk.js` fills in and sends any page using only the
  field names from `happy-path.json`: `fillFields`, `submitAndWait`,
  `pageHeading`, `tickEveryCheckbox`, `hasPostForm`, `errorMessages`.
- `scripts/designer/show/capture.js` already has the on-screen walk with a
  fallback that sends the answers directly: `startOnScreen`, `walkStep`,
  `sendDirectly`, `send` and `walkOnFromHub`. It also has the error-state
  capture (`captureErrors`, `canShowErrors`) and `recordWalkthrough` (the
  single `walk.webm` that `designer:show --video` makes). These functions are
  module-private today.
- `src/server/prototype-seed/examples.js` has `loadExamples(setId)`, which
  imports only `fs`, `fixtures.js`, `grammar.js` and `scenarios/default.js`,
  so a Playwright spec can import it. It returns each set's **labelled
  examples** ("Draft, just started", "Submitted, then amended"). A release
  with no scenario file gets the default four or five. Each example carries
  `steps`, `through`, `submit`, `amend`, `cancelAmend`, `delete`, `fixture`
  and `organisationId`.
- `scripts/designer/lib/sets.js` provides `listSets`, `releaseInfo` (with
  `title`) and `defaultSet`. `scripts/designer/show/server.js` provides
  `findFreePort` (3203 and up).
- The Playwright web server runs with `PROTOTYPE_SEED=false`, so every
  dashboard starts empty.
- `vitest.config.js` excludes `fit/**`. Anything under `fit/` never reaches
  vitest.
- `overrides.json` → `deleted` holds `.github/workflows/cleanup-e2e-reports.yml`,
  `e2e-tests.yml` and `lighthouse.yml`. **The prototype's new workflow must not
  use those names**, or the weekly sync deletes it.
- On this branch the only sets are `high-risk-plants` and `sample-journey`.
  Releases live on `design/*` branches, so a pull request's report shows the
  real journey (the baseline) and whatever releases that branch holds.

## 1. Walkthroughs as documentation

### 1.1 Generated at run time, never checked in

**Decision: generate every walkthrough at run time from what the set already
has, which is its labelled examples and its live pages. Check in no spec per
release.**

Why:

- A checked-in spec per release goes out of date on the first page move, the
  first weekly sync or the first new example. Designers would then have to
  keep a test file in step, which is exactly the effort Sam wants to remove.
- The narration designers would want to write **already exists and is
  already theirs**. Each example's `label` ("Submitted, then amended") names
  the story. Each page's own `<h1>` names the step. A release's own wording
  changes flow straight into the report.
- The one piece of narration that has nowhere to live today is a sentence
  explaining *why* a story exists. That goes in an optional `story` key in the
  example grammar (see 1.6), in the scenario file designers already edit. No
  generated file is ever needed.

### 1.2 Where it lives

| Path | Owner | What |
| --- | --- | --- |
| `fit/walkthroughs/walkthroughs.walkthrough.spec.js` | new, `ours` via `fit/walkthroughs/**` | The one spec. It generates a `describe` per set and a `test` per story. |
| `scripts/designer/walkthrough/plan.js` (+ `plan.test.js`) | `ours` via `scripts/designer/**` | Pure code: sets and examples in, story plans out (see 1.4). Unit tested with vitest. |
| `scripts/designer/walkthrough/verdict.js` (+ test) | same | Reads the Playwright JSON report and gives the exit code and plain-English summary (see 1.8). |
| `scripts/designer/walkthrough/options.js`, `cli.js`, `run.js` (+ tests) | same | `designer:walkthrough` (see 1.9). |
| `scripts/designer/show/drive.js` (+ `drive.test.js` where logic is pure) | same | The on-screen walking **extracted from `capture.js`**: `send`, `startNotification`, `startOnScreen`, `sendDirectly`, `walkStep`, `walkOnFromHub`, `captureErrors`/`canShowErrors`. Each takes an `onNote(text)` callback in place of pushing onto `run.notes`. `capture.js` imports them back, and its behaviour and tests stay the same. Reuse, not duplication. |

The spec's file name ends `.walkthrough.spec.js`, so the `journeys` project's
`**/*.fit.spec.js` never matches it and vitest's `fit/**` exclude covers it.

### 1.3 The Playwright project (`playwright.config.js`, patched)

Add one project, defined **only when `PROTOTYPE_WALKTHROUGHS=true`**:

```js
const walkthroughsOn = process.env.PROTOTYPE_WALKTHROUGHS === 'true'
// ...
projects: [
  journeysProject, featuresProject,
  ...(walkthroughsOn ? [{
    name: 'walkthroughs',
    testDir: './fit/walkthroughs',
    testMatch: '**/*.walkthrough.spec.js',
    timeout: 300_000,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: `http://localhost:${port}`,
      viewport: { width: 1280, height: 720 },
      video: { mode: 'on', size: { width: 1280, height: 720 } },
      trace: 'on',
      screenshot: 'on',
      launchOptions: { slowMo: Number(process.env.WALKTHROUGH_SLOWMO ?? 250) }
    }
  }] : [])
]
```

Why the project is opt-in: the upstream `test:fit`, `test:fit:journeys`,
`test:fit:features` and `test:fit:ci` scripts run every defined project. Opting
in keeps walkthroughs out of the gate **without editing any upstream script**,
so there are fewer merge conflicts each week. Only `designer:walkthrough`
sets the flag.

The same edit adds **record everything**. When
`PLAYWRIGHT_RECORD_EVERYTHING=true`, `journeys` and `features` also get
`video: 'on'`, `trace: 'on'` and `screenshot: 'on'`. Without it, the local
defaults stay as they are today (features: video off, trace
retain-on-failure; screenshot only-on-failure). CI sets it for the FIT job,
because Sam asked for video, screenshots and trace on.

`overrides.json` → the `patched` entry for `playwright.config.js` gets a new
`why`, adding: "an opt-in `walkthroughs` project (PROTOTYPE_WALKTHROUGHS=true)
for fit/walkthroughs, and PLAYWRIGHT_RECORD_EVERYTHING=true turning video,
trace and screenshots on for every project, for the published report".

### 1.4 What gets walked: sets and stories (`plan.js`)

`planWalkthroughs({ sets, only })` returns
`[{ setId, title, stories: [...] }]`:

- **Sets**: `listSets()`, minus `sample-journey` and any set with no
  happy-path fixture (the same rule as `designer-sets.fit.spec.js`). It is
  filtered by `WALKTHROUGH_SETS=a,b` when that is set. `high-risk-plants` is
  **always included unless filtered out**, because it is the baseline every
  release is compared with. Title: `releaseInfo(id).title`, or for
  `high-risk-plants` "The real journey (high-risk plants)", then ` (<id>)`.
- **Stories**: `loadExamples(setId)`, in the scenario file's order. Each
  becomes
  `{ kind: 'example', name: label, slug, story, steps, through, submit, amend, cancelAmend, delete, fixture, madeBy: organisationId }`.
  If `loadExamples` throws an `ExampleGrammarError`, the plan carries
  `{ kind: 'broken', message }`, which becomes one failing test that quotes
  the message. The report shows it; it does not crash the run.
- **One error-messages story per set**:
  `{ kind: 'errors', name: 'What each page says when something is missing', steps }`
  uses the first example with no `through` and no `delete` (a full walk).
  Failing that, it uses the first happy-path scenario.
- A set with no examples but with scenarios (this cannot happen with
  `defaultExamples` today) falls back to one story per scenario, named after
  its `useCase`.

### 1.5 One story, as the report shows it

Every test has `tag: ['@walkthrough', '@<set-id>']` and these annotations:
`Story` (the `story` key, or else the fixture's `useCase`), `Example link`
(`/examples/<set>/<slug>`) and `Answers from` (the fixture). If the example
names an organisation, the test also carries `Made by <organisationId> in the
example data`.

The test signs in as its own organisation, `walkthrough-<set>-<slug>`, so its
dashboard shows only its own notification. Stories run in parallel.

Each page is one `test.step`. Its name is the page's own heading, read after
arrival:

```
test.step(`${n}. ${heading ?? slug}`, async () => {
  // 1. pause WALKTHROUGH_PAUSE_MS (default 800) so the video lingers
  // 2. full-page JPEG (quality 70) to testInfo.outputPath(`${nn}-${slugOrKey}.jpg`),
  //    attached by path as `${nn} ${heading}` (visible in the step, and
  //    readable by an agent from test-results/)
  // 3. soft checks: #main-content visible; no new console errors since arrival
  // 4. the page's action (fill + send, tick + send, or nothing on the last page)
})
```

The page sequence:

1. **The dashboard**: `startOnScreen` (its start button, with a fallback that
   posts directly).
2. **Each page in `steps`**: `walkStep` fills from `resolveStepFields`
   through `fillFields` and sends with `submitAndWait`. If the screen will not
   move on, the answers are sent directly and the test gets a `Sent directly`
   annotation naming the page and what it said. The story never fails for a
   UI mismatch alone.
3. **`through`**: the story stops on that page. The step is named
   `${n}. ${heading} (the story stops here, left to fill in)`.
4. **Otherwise**, the task list, then check your answers
   (`notification-view`). With `submit`: `notification-view`, then
   `declaration` (`tickEveryCheckbox`), then `confirmation`, as
   `walkOnFromHub` does. With no `submit`, the story ends on check your
   answers ("ready to check and send").
5. **`amend`, `cancelAmend`, `delete`**: `actionOnScreen(slug)` for `amend`,
   `cancel-amend` and `delete`. It tries (a) a form on the current page whose
   `action` ends `/<slug>`, clicking its main button. Failing that, (b) it
   opens `…/<slug>`, and if that page has a POST form (a confirm page), it
   pictures the page as a step and sends it. Failing that, (c) it posts
   directly with the crumb (`send`), with a `Sent directly: no button for it
   on screen` annotation. The page that follows is a step too.
6. **"The dashboard afterwards"**: back to the set's address, pictured, so the
   story ends on the status tag the example exists to show.

**The error-messages story** walks the same pages. On each page where
`canShowErrors` holds and `hasPostForm` is true, it first sends the form
empty. If an error summary appears, a nested
`test.step('What it says when nothing is filled in')` pictures it and adds an
`Error messages` annotation listing them, then goes back. If the empty form
moves on instead, it records the note "moves on when sent empty" and goes
back, as `captureErrors` does today. It then fills and sends the page
normally. A research release with errors off simply shows no error states,
which is correct: it documents what participants see.

**Health, kept light.** `page.on('console')` (type `error`),
`page.on('pageerror')` and document responses with status ≥ 400 are gathered
per step. At the end of the test,
`expect.soft(problems, 'Console errors or failed pages').toEqual([])`. There
is no axe here (the `journeys` gate already runs it) and no copy assertions.
The only hard failures are "could not start a notification" and "the page
never loaded". Both leave a red story in the report and never block (see
1.8).

### 1.6 Optional narration: a `story` key in the example grammar

`src/server/prototype-seed/grammar.js` (ours): add `'story'` to
`EXAMPLE_KEYS`. It is checked with `isText` (message: "has a story that is not
text. Write one or two plain sentences, like story: 'A trader whose potatoes
arrived yesterday sends the notification late.'"). It is carried onto the
checked example as `story: raw.story ?? null`. The seed ignores it. Update the
grammar comment block at the top and `grammar.test.js`.
`scenarios/high-risk-plants.js` gets a `story` on each example, so the
baseline reads well. `default.js` stays as it is: the useCase fallback covers
it.

### 1.7 CI failure policy

- **FIT Tests** (`journeys` + `features`) still gate, as today.
- **Walkthroughs** job: red stories are **reported, never blocking**. The job
  fails only on a **crash**, meaning any of these:
  - no JSON report was written
  - the JSON report has top-level `errors` (the web server did not start, a
    config error or a syntax error in the spec)
  - zero walkthrough tests ran while the plan had sets
  - the run hit the global timeout
- Red stories are listed in the job summary and the PR comment, and each one
  becomes a `::warning::` annotation.

### 1.8 `verdict.js`

`readVerdict(jsonReport, { expectedSets })` returns
`{ crashed, reason, sets: [{ setId, title, stories: [{ name, status, stoppedAt, sentDirectly: [...] }] }] }`.
`summaryLines(verdict)` gives plain English, for example "The real journey
(high-risk-plants): 10 of 10 stories walked to the end." and "Working release
(plants-working): 5 of 6. 'Deleted draft' stopped at 'Are you sure you want
to delete…': the page said '…'". `exitCodeOf(verdict)` is `crashed ? 1 : 0`.
All three are pure and unit tested against fixture JSON: a pass, some red
stories, a web-server crash (top-level `errors`) and zero tests.

### 1.9 `designer:walkthrough` (designer and agent command)

`package.json`: add `"designer:walkthrough": "node scripts/designer/walkthrough/cli.js"`
to the `designer:*` block. The `patched` `why` for `package.json` already
covers "one block of designer:* scripts", so it only needs the new name
listed if the `why` names them (it does not).

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:walkthrough -- [--set <id>[,<id>]] [--all] [--no-open] [--show] [--ci]
```

- Default set: `defaultSet()`, the designer's working release. With no
  working release, it uses `high-risk-plants`. `--all` walks every set, and
  `--set` names them.
- The steps it takes:
  1. Check the Chromium install. If it is missing, print the same friendly
     line `designer:show` uses.
  2. `findFreePort()` (3203 and up), so the designer's `npm run dev` on 3103
     and a stack plants-frontend on 3003 are never touched.
  3. `npm run build:frontend`.
  4. Spawn `@playwright/test`'s CLI through `process.execPath` and
     `require.resolve` (no npx), with `test --project=walkthroughs` and this
     environment: `PROTOTYPE_WALKTHROUGHS=true`, `WALKTHROUGH_SETS`, `PORT`,
     `PLAYWRIGHT_HTML_OUTPUT_DIR=.cache/designer/walkthrough/report` (check
     the variable name against 1.63; `PLAYWRIGHT_HTML_REPORT` is the older
     one), `PLAYWRIGHT_JSON_OUTPUT_NAME=.cache/designer/walkthrough/report.json`,
     `--output=.cache/designer/walkthrough/test-results` and
     `--reporter=list,html,json`. Everything goes under `.cache/`, which git
     ignores, so `git status` does not change.
  5. Print `summaryLines`, the report path and the picture folder
     (`.cache/designer/walkthrough/test-results/`).
  6. Unless `--no-open`, serve the report with Playwright's `show-report`.
     The trace viewer needs http, not `file://`. Tell the designer: "Your
     walkthrough is open at http://localhost:9323. Press Ctrl+C here when you
     have finished looking."
- `--show` only serves the last report again.
- **Agents always pass `--no-open`** (serving blocks), then read the JPEGs
  under `test-results/` before describing anything. The designer runs
  `-- --show` to look.
- `--ci` means every set, `PORT=3054`, `--reporter=list,github,blob,json`,
  the blob report at `blob-report/` and JSON at
  `walkthrough-results/report.json`, no serving, and the exit code from
  `verdict`. It also writes the summary to `$GITHUB_STEP_SUMMARY` when that is
  set.
- `PLAYWRIGHT_RECORD_EVERYTHING` has no effect here: the project always
  records.

### 1.10 `designer:show --video` stays

`--video` stays for "one video in my gallery". The walkthrough report is the
fuller thing: every example, a picture per step, error states and a trace.
Routing sends "record a walkthrough", "a demo", "show and tell" and "send this
to stakeholders" to the walkthrough first (section 4).

### 1.11 The hand-off story links the walkthrough

`scripts/designer/prototype.json`: add
`"reportsUrl": "https://defra.github.io/trade-imports-plants-prototype/reports/"`.
This is the one place the URL is written, and everything else composes from
it. `scripts/designer/handoff/story.js` (and its test): when `reportsUrl` is
set, the story and brief gain a line: "See it walked through, page by page:
<reportsUrl>main/#?q=@<set>". The line notes that it shows the saved version
once the pull request is merged. Before then, the skill substitutes
`pr-<n>/`.

## 2. Publishing the report

### 2.1 Shape

- **One merged HTML report per run**, not one per project. It holds FIT
  (`journeys`, `features`) and `walkthroughs`. Filters make the parts
  shareable on their own:
  - Demo link: `<base>/reports/pr-<n>/#?q=@walkthrough`
  - One release: `<base>/reports/pr-<n>/#?q=@<set-id>`
  - Everything: `<base>/reports/pr-<n>/`

  One report means one link to keep and one prune rule. Tags make separate
  reports unnecessary.
- Stable paths on `gh-pages`: `reports/pr-<n>/` for a pull request and
  `reports/main/` for `main` (push, the Monday schedule, and a manual run on
  `main`). A manual run on any other branch keeps only the Actions artifact.
- Report title (merge config reporter option `title`):
  "Plants prototype, PR #<n>: <head ref>" or "Plants prototype, main at
  <sha7>".

### 2.2 `.github/workflows/check-pull-request.yml` (ours)

Triggers: keep `schedule`, and keep `pull_request` with its types. Add
`push: branches: [main]` and `workflow_dispatch:`. Every existing job runs on
the new triggers unchanged, so no job name changes and no required check is
renamed. On `main` that duplicates `publish.yml`'s unit tests, which is an
accepted cost.

Add at the top:

```yaml
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

The concurrency group stops an older run from publishing over a newer run's
report for the same pull request.

**Job `playwright` ("FIT Tests"), changed.** Add
`env: PLAYWRIGHT_RECORD_EVERYTHING: 'true'` to the run step. Run it as
`npm run test:fit:ci -- --reporter=list,github,html,blob`. A later
`--reporter` overrides the script's own, because commander takes the last
value; the code builder **must prove that locally** before relying on it.
If it does not hold, the step runs `npm run build:frontend` and then the
Playwright CLI with `test:fit:ci`'s flags plus `--project=journeys
--project=features`. Keep the `frontend-playwright-report` upload as it is,
and add:

```yaml
- name: Upload the blob report
  if: always()
  uses: actions/upload-artifact@v7
  with: { name: blob-fit, path: blob-report/, retention-days: 3 }
```

**New job `walkthroughs` ("Walkthroughs")**, with no `needs`. Steps:
checkout, setup-node, align npm, `npm ci`, `npm run playwright:install`, then
`npm run designer:walkthrough -- --ci`. Then, with `if: always()`, upload
`blob-walkthroughs` (`blob-report/`, 3 days) and `walkthrough-results`
(`walkthrough-results/`, `test-results/`, 14 days). `timeout-minutes: 30`.

**New job `merge-report` ("Merge the Playwright report")**:
`needs: [playwright, walkthroughs]`,
`if: always() && (needs.playwright.result != 'skipped' || needs.walkthroughs.result != 'skipped')`.
Steps:

1. checkout, setup-node, align npm, `npm ci`.
2. Download the `blob-*` artifacts into `all-blobs/`, then copy them to
   `merged-blobs/report-fit.zip` and `report-walkthroughs.zip`. They must be
   renamed, because both jobs write `report.zip`. A missing one is skipped.
3. Run `playwright merge-reports --config scripts/reports/merge.config.js merged-blobs`
   through `npm exec --no -- playwright …` or a
   `"reports:merge": "playwright merge-reports --config scripts/reports/merge.config.js"`
   script. **Prefer the script**, added next to the `designer:*` block, and
   list it in the package.json `why`. `merge.config.js` reads `REPORT_TITLE`,
   and its reporters are `html` (`outputFolder: 'playwright-report'`,
   `open: 'never'`, `title`) and `json` (`outputFile: 'merged/report.json'`).
4. Upload `prototype-playwright-report` (`playwright-report/` and
   `merged/report.json`, 14 days). This is the fallback artifact.

**New job `publish-report` ("Publish the Playwright report")**:
`needs: merge-report`, `if: always() && needs.merge-report.result == 'success'`,
and it skips a pull request from a fork
(`github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository`)
and a manual run off `main`. It has the same guards as the originals:

```yaml
permissions: { contents: write, pages: read, pull-requests: write, issues: write }
concurrency: { group: pages-${{ github.repository }}, cancel-in-progress: false }
```

Steps:

1. Checkout (for the comment script), setup-node, `npm ci`. `pr-comment.js`
   uses node builtins only, so `npm ci` can be dropped if the builder prefers
   a bare `node`.
2. Download `prototype-playwright-report`.
3. Work out the destination: `pr-${{ github.event.pull_request.number }}` or
   `main`.
4. `peaceiris/actions-gh-pages@v4` with `publish_dir: ./playwright-report`,
   `destination_dir: reports/<dest>` and `keep_files: false`. As in
   `lighthouse.yml`, that replaces only this folder, so the previous run's
   videos go. Give it `id: deploy` and `continue-on-error: true`. The first
   run creates `gh-pages`.
5. Is Pages on? Run
   `gh api "repos/${REPO}/pages" --jq .html_url 2>/dev/null || true`. A
   non-empty value is the site base (it copes with a custom domain). If it is
   empty, Pages is off and there is no web link.
6. `REPORT_URL` is `<html_url>reports/<dest>/` only if
   `steps.deploy.outcome == 'success'` and Pages is on. Otherwise it is
   empty. `RUN_URL` is
   `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`.
7. `node scripts/reports/pr-comment.js merged/report.json > comment.md`. The
   script takes env `REPORT_URL`, `RUN_URL`, `HEAD_SHA` and `DESTINATION`.
   Append it to `$GITHUB_STEP_SUMMARY` on every event.
8. For a pull request only, create or update the sticky comment with
   `gh api`. List the issue comments, find the one whose body starts with
   `<!-- prototype-playwright-report -->`, then PATCH it, or POST a new one if
   there is none. This is plain `gh`, as the workspace workflows use, with no
   new third-party action.

### 2.3 `scripts/reports/pr-comment.js` (+ test; new ours line `scripts/reports/**`)

It is pure: `commentFor(report, { reportUrl, runUrl, sha, destination })`
returns markdown, and a thin CLI wraps it.

```
<!-- prototype-playwright-report -->
### The prototype, walked through

**[Watch the walkthroughs](<reportUrl>#?q=@walkthrough)**: every release on this branch, page by page, with a picture of each page, a video and a trace.

| Release | Stories | Walked to the end |
| --- | --- | --- |
| [The real journey (high-risk-plants)](<reportUrl>#?q=@high-risk-plants) | 10 | 10 |
| [Working release (plants-working)](<reportUrl>#?q=@plants-working) | 6 | 5: 'Deleted draft' stopped at … |

FIT tests: 212 passed, 0 failed, 3 flaky. [The whole report](<reportUrl>)

Updated for <sha7>. A new link can take a minute to appear while GitHub Pages publishes it.
```

If `reportUrl` is empty, the first paragraph becomes: "The report could not
be published as a web page (GitHub Pages is not turned on for this repository
yet). Download **prototype-playwright-report** from [this run](<runUrl>),
unzip it and open `playwright-report/index.html`." The table and counts
remain. The script groups walkthrough tests by their `@<set>` tag and reads
FIT counts from the `journeys` and `features` projects. Tests use fixture
JSON covering: all green, red stories, Pages off, no walkthroughs (the
walkthrough job crashed, "The walkthroughs did not run: see the Walkthroughs
check") and no FIT.

### 2.4 `.github/workflows/prune-reports.yml` (new, ours)

This is the cleanup copied from `cleanup-e2e-reports.yml`. It has a new name,
because that name is in `deleted`.

```yaml
name: Prune Playwright reports
on:
  pull_request: { types: [closed] }
  schedule: [{ cron: '17 3 * * *' }]
  workflow_dispatch:
permissions: { contents: write, pull-requests: read }
jobs:
  prune-and-truncate:
    runs-on: ubuntu-latest
    concurrency: { group: pages-${{ github.repository }}, cancel-in-progress: false }
```

The steps follow the original, with these changes:

1. **Stop cleanly if there is no `gh-pages` yet**: run
   `gh api repos/$REPO/branches/gh-pages` and set an output. Every later step
   is guarded by it.
2. Checkout `gh-pages` (`fetch-depth: 1`).
3. **Keep-list** by PR number, not a cleaned-up branch name:
   `main`, plus `pr-<n>` for every open pull request with
   `updated_at >= 21 days ago`:
   `gh api "repos/${REPO}/pulls?state=open&per_page=100" --paginate --jq ".[] | select(.updated_at >= \"$cutoff\") | \"pr-\(.number)\""`.
   On `pull_request: closed`, force-remove
   `pr-${{ github.event.pull_request.number }}`, as the original's `HEAD_REF`
   defence does.
4. Prune every `reports/*/` directory that is not on the list.
5. Orphan-reset `gh-pages` exactly as the original does, with the same bot
   identity, an `--allow-empty` commit and a force push. This keeps the
   branch's history, and so its size, down to what is live, which matters
   more here because every run adds videos.

### 2.5 `overrides.json`

- `ours`, added: `fit/walkthroughs/**`, `scripts/reports/**` and
  `.github/workflows/prune-reports.yml`.
- `patched` `why`, updated: `playwright.config.js` (1.3), and `package.json`
  (the new `reports:merge` script sits beside the `designer:*` block).

## 3. The production boot check fix (`check-pull-request.yml`, `boot-check`)

The step "Assert the chooser and a real page's sign-in are wired up" compares
the whole `%{redirect_url}`. That URL is now
`http://localhost:3103/auth/sign-in?redirect=%2Fhigh-risk-plants`. The fix
compares the **path** and allows the query. The app does not change.

```bash
real_set_redirect=$(curl --silent --output /dev/null --write-out '%{redirect_url}' "http://localhost:${APP_PORT}/high-risk-plants")
redirect_path="${real_set_redirect%%\?*}"
case "$redirect_path" in
  http://*|https://*) redirect_path="/${redirect_path#*://*/}" ;;
esac
if [ "$redirect_path" != "/auth/sign-in" ]; then
  echo "Expected /high-risk-plants to redirect to /auth/sign-in signed out, got: $real_set_redirect" >&2
  exit 1
fi
```

The step does not assert the `redirect` query. It is the app's behaviour and
free to change, and the ask was the path. Update the comment above it to say
the query is allowed on purpose. The code builder checks the parameter
expansion with a scratch bash script on the three shapes: absolute with a
query, absolute without, and a relative path.

The same pass adds to `release-canary`, after the chooser boot check: run
`npm run designer:walkthrough -- --ci --set plants-working` as "Walk the
throwaway release through". That proves a brand-new release gets its
walkthrough with no designer effort. Add `walkthrough-results/` and
`.cache/designer/walkthrough/` to that job's failure upload.

## 4. Skills and docs: every touchpoint

The docs builder owns all of these. Plain English, GDS style. Say "the
walkthrough" and "the report", never "project" or "blob". Every command is in
the tilde `--prefix` form. **Never edit `src/server/app/docs/**`.**

### Workspace skill: `~/git/defra/trade-imports-workspace/.claude/skills/prototype/`

- **`references/ROUTING.md`**
  - Outcomes, "A demo or stakeholder review" row. Add the phrases "send this
    to stakeholders", "something I can share", "a link to the demo". The
    parts become: 1. pick the release; 2. examples; 3. **the walkthrough**
    (`show-my-change`, "record a walkthrough"); 4. a review pack gallery
    where they want before/after; 5. save and open a pull request. **The pull
    request's report link is the shareable demo**, and after merge the
    `reports/main/` link is the lasting one. Until it is deployed, demo from a
    laptop with `designer:fresh`.
  - Phrases: in the `show-my-change` row, add "walk every example through",
    "the walkthrough report", "the Playwright report". In the
    `share-my-change` row, add "send this to stakeholders", "a link I can
    share", "where's the report link".
  - "How every change ends": no change. The walkthrough is not a per-change
    step, because CI makes it.
  - "The designer commands": add `designer:walkthrough`, "every example
    walked through page by page, in a report with pictures, video and trace".
- **`references/show-my-change.md`**
  - Step 2 table: "record a walkthrough" and "demo video" now point to
    `designer:walkthrough -- --set <id> --no-open`. Keep `--video` for "one
    video in my gallery". "make a review pack" is the gallery command plus a
    walkthrough run. "something I can share" means the pull request's report
    link (`share-my-change`).
  - New step, "Record a walkthrough": the command. Say up front that it takes
    a few minutes. Read the summary lines. **Open the step pictures under
    `.cache/designer/walkthrough/test-results/` with Read before describing
    them.** Name any red story and its `Sent directly` notes. Tell the
    designer to run `designer:walkthrough -- --show` to watch the report
    (never run `--show` from the agent, because it blocks).
  - Step 6: offer to save and open a pull request, "and every push publishes
    this walkthrough as a web page you can send to anyone".
  - References: add the spec and `scripts/designer/walkthrough/`.
- **`references/share-my-change.md`**
  - Step 6.4: replace the `frontend-playwright-report` sentence (around line
    228) with this. The checks publish a report within about 10 minutes, and
    the pull request gets a comment with its link. Give the designer
    `<reportsUrl>pr-<n>/#?q=@walkthrough`, read from `prototype.json`.
    That link is the demo to send stakeholders. If the comment says Pages is
    not on, give the artifact route and say the maintainer has to turn Pages
    on.
  - Step 7 (check on a pull request): read the report comment
    (`gh pr view … --comments`) and report red stories in plain words. They
    never block the merge.
- **`references/share-my-change/pr-body.md`**, "Checking it": replace the
  `frontend-playwright-report` bullet with this. "The checks publish a
  walkthrough of every release on this branch. The link appears in a comment
  on this pull request."
- **`references/design-release.md`**
  - Section B, after `new:set`, one paragraph. Your release gets its own
    walkthrough automatically, on every pull request and on
    `designer:walkthrough`, made from its examples, so there is nothing to
    write. The real journey's walkthrough sits beside it as the baseline.
  - Section C (freeze): a frozen release's walkthrough stays as its lasting
    record.
  - Section F (retire): its walkthrough stops with it.
  - Verify: add "ran `designer:walkthrough -- --set <new id> --no-open` and
    every story reached its end", for a new release.
- **`references/research-session.md`**
  - Step 5 (before the session): run `designer:walkthrough -- --set <research release> --no-open`
    as the dry run. Each task's example is a story, so every story that walks
    to its end means every task link works. With errors off, the error story
    shows no messages, and that is expected.
  - "After the sessions": link the report in the research write-up.
- **`references/example-data.md`**: every example is now also a walkthrough
  story. The `label` is the story's name, so write it for a stakeholder. Add
  the optional `story` sentence (the grammar change in 1.6).
- **`references/hand-off.md`** and **`references/raise-the-story.md`**: the
  story and brief carry the walkthrough link (`designer:handoff` adds it from
  `prototype.json`). In the Jira dry run, check that the link is present, in
  wiki markup as `[See it walked through|<url>]`. Before merge, use
  `pr-<n>/`, and after merge use `main/`.
- **`references/run-the-prototype.md`**: in "New here", "You can see the whole
  prototype walked through without running anything:
  `<reportsUrl>main/#?q=@walkthrough`". In "Next steps", add
  `designer:walkthrough`.
- **`references/check-my-change.md`**: a red walkthrough story is not a
  failed check. Explain it (the "Walkthroughs" section in
  `checks-and-errors.md`) and route to `example-data` or `change-the-journey`.
- **`SKILL.md`**: only if a load-bearing rule or the offer list names outputs.
  Add one line saying that agents run `designer:walkthrough` with
  `--no-open`, never `--show`. Keep it minimal.

### Prototype repo `.md` files

- **`PROTOTYPE.md`**: a new section, "Walkthroughs: the prototype documents
  itself". It covers what a walkthrough is, where to see one (the
  `reports/main/` link and the pull request comment), how to run one
  (`designer:walkthrough`) and how to change its words (the example `label`
  and `story`, and the page headings).
- **`AGENTS.md`**:
  - "What this repo is": add item 7, walkthroughs made at run time from each
    set's examples in `fit/walkthroughs/`, published by CI to `gh-pages`.
  - Load-bearing rules: add that a generated walkthrough spec is never
    checked in, and a walkthrough never gates.
  - "Extra rules": `fit/walkthroughs/` is prototype-owned.
- **`README.md`** (patched): **only** the "For maintainers" section, which
  the `why` already covers. Add the report URLs, the prune workflow, and
  "turn on GitHub Pages: Settings, Pages, Deploy from a branch, `gh-pages`,
  `/ (root)`".
- **`.claude/rules/ownership.md`**: its `paths:` include `fit/**`. Add
  `fit/walkthroughs/**` to the exceptions: prototype-owned, editable on a
  `chore/*` branch, and never needed on a `design/*` branch.
- **`.claude/rules/prototype-seed.md`**: examples are walkthrough stories.
  Covers the label wording and the optional `story`.
- **`docs/designers/seeing-your-change.md`**:
  - Replace "The video on every pull request" (around line 206) with "The
    walkthrough on every pull request", covering the comment link, the
    `#?q=@<release>` filter, and how to read a step (the heading, picture,
    video and trace).
  - Add a "Record a walkthrough on your laptop" section.
  - Update the options table's "A video of the whole journey" row.
- **`docs/designers/sharing-and-handing-off.md`**: lines 52-53 become the
  report link. Add a sentence on sending the link to stakeholders. The hand-off
  brief carries the link.
- **`docs/designers/research-sessions.md`**: the walkthrough as the
  pre-session dry run.
- **`docs/designers/design-releases.md`**: a new release gets its walkthrough
  automatically.
- **`docs/designers/example-data.md`**: examples are stories. Covers the
  `story` key and the grammar table.
- **`docs/designers/checks-and-errors.md`**: a new "Walkthroughs" section. A
  red story does not block; it covers what "Sent directly" means, what "the
  story stops here" means, and the boot check wording change.
- **`docs/designers/glossary.md`**: walkthrough, story, the report, a
  Playwright trace.
- **`docs/designers/README.md`** and **`docs/designers/your-first-hour.md`**:
  one line each, with the `reports/main/` link as the first thing to look at.

### Workspace docs (outside the two listed roots, included because "bake it into the docs" covers it)

- **`docs/repos/trade-imports-plants-prototype.md`**: the CI section gains the
  Walkthroughs job, the report publishing, the prune workflow, the Pages
  prerequisite and the report URLs.

## 5. Verification (code builder)

Run each check, one command per call, from the tilde `--prefix` form:

1. `npm --prefix … run test` passes vitest for `plan`, `verdict`, `options`,
   `drive`, `pr-comment`, `grammar`, `story`, and the existing `capture`
   tests.
2. `npm --prefix … run lint` and `run format:check` both pass.
3. `npm --prefix … run designer:walkthrough -- --set high-risk-plants --no-open`
   gives a report under `.cache/designer/walkthrough/report/`. Every example
   is a test, and the step names are page headings. Read a few step JPEGs to
   check them. A video and a trace are attached. The summary says "N of N".
   The error story holds error pictures.
4. A throwaway release, made the canary way
   (`run new:set -- plants-working --from high-risk-plants --title "Working release" --describe "Throwaway"`),
   then `designer:walkthrough -- --set plants-working --no-open`, then
   restore it with `git -C … restore .` and `git -C … clean -fdq -- src/server`.
   Check `git status` is clean before and after.
5. `designer:walkthrough -- --ci` exits 0 with red stories present: force one
   with a scratch `WALKTHROUGH_SETS` and a broken example in a temporary copy,
   then revert. It exits 1 when the web server cannot start (for example,
   when the port is taken).
6. `PLAYWRIGHT_RECORD_EVERYTHING=true` through `test:fit:ci -- --reporter=list,github,html,blob`.
   Prove the last `--reporter` wins, with `blob-report/` present and a video
   for a features test. Put the env var in the npm script call or a scratch
   script (no env prefix in Bash).
7. `reports:merge` on the two blob zips produces one HTML report with all
   three projects, and `#?q=@walkthrough` filters to the walkthroughs. Then
   run `pr-comment.js` on `merged/report.json`, both with and without
   `REPORT_URL`.
8. Check the YAML by reading it. Run `actionlint` only if it is already
   installed. The CI run itself cannot be exercised locally, so the report
   must say so.
9. `designer:where` names every new path "Yours".

## 6. Sam's jobs and known limits

- **Turn on GitHub Pages**: repo Settings, Pages, "Deploy from a branch",
  `gh-pages`, `/ (root)`. The branch appears after the first merged run or
  the first PR run. Until then the workflow uploads the artifact, and the PR
  comment says Pages is off. Nothing fails.
- If `DEFRA/trade-imports-plants-prototype` is private, Pages needs the org's
  plan, and a private-repo Pages site is visible to org members only. The
  report holds only stub data, the same as the deployed prototype.
- Branch protection: no check is renamed. "Walkthroughs", "Merge the
  Playwright report" and "Publish the Playwright report" are new and must
  **not** be made required.
- Size: roughly tens of MB per PR (JPEG steps, 1280×720 videos). The daily
  prune and orphan reset keep `gh-pages` to live PRs and `main`. The Pages
  limit is 1 GB per site.
- The published report of an open PR is public if the repo is public. That
  is the point: the report is the shareable demo.
- The weekly sync PR gets a report too, which gives "what the real journey
  looks like this week" for free.

## 7. Calls made (flagged, not gated)

1. Walkthroughs are generated at run time, not checked-in specs. The `story`
   key covers narration.
2. The walkthrough project is opt-in by environment variable, so no upstream
   `test:fit*` script is edited.
3. There is one merged report with tag filters, not a report per project.
4. Reports are published from `check-pull-request.yml` with new triggers, not
   a reusable workflow, so no required-check name changes.
5. The Walkthroughs job fails only on a crash. Red stories are warnings.
6. Stories are the labelled examples plus one error-messages story per set.
   There is no axe in walkthroughs, because the FIT gate has it.
7. The prune workflow has a new name, because `cleanup-e2e-reports.yml` is in
   `deleted`.
8. `designer:show --video` is kept. The walkthrough becomes the first route
   for "record a walkthrough".
9. `README.md` (patched) is edited only inside its "For maintainers" section.
10. The workspace page `docs/repos/trade-imports-plants-prototype.md` is in
    the docs builder's paths.
