# Stakeholder walkthroughs: human pacing and a demo page

Sam asked for two things (product owner):

1. "The videos are too quick. Probably impacts traces too. Introduce a delay so
   these videos are watchable as if they were done by a human."
2. "The test report is quite hard to digest, quite overwhelming. If I was a
   stakeholder interested in the prototype, I'd want fewer specs, or grouped
   differently, with the high-priority stuff at the top."

Branch: `feat/NO_JIRA-stakeholder-walkthroughs`, in both the workspace and
`repos/trade-imports-plants-prototype`. Nothing is pushed.

The decisions in short:

- **A. Pacing.** Walkthroughs get human pacing from a new pace module. It
  scrolls each control to the centre, moves a visible cursor to it, types
  answers one key at a time, pauses after each choice, and waits on each page
  for a reading time based on how many words it shows (2 to 6 s, and 4 to 8 s
  on the confirmation page). `WALKTHROUGH_PACE=human|fast` controls it (human
  is the default) and so does `designer:walkthrough --fast`. The FIT projects
  and `designer:show` stay fast: the pacing hooks are optional, and they
  default to doing nothing.
- **B. Priority.** An example can carry `featured: <position>` and an optional
  `headline`. At most 4 examples can be featured, and the error-messages story
  is always featured last. The real journey's defaults are "Send a
  notification from start to finish", "Save a notification and come back to
  it", "Change a notification after sending it" and "What happens when
  something is missing". New releases inherit the same set through
  `scenarios/default.js`.
- **C. Demo page.** A GOV.UK-styled static page at the Pages root and at
  `reports/pr-<n>/`. It is built with nunjucks, the real `govuk-frontend`
  macros and a small Sass build that uses Arial (GDS Transport must not be used
  off gov.uk). For each release it shows the featured journeys in order, each
  with its summary, an embedded video and a collapsed strip of page pictures,
  then a short list of the other journeys. The Playwright report moves to
  `tests/`. Old `#?…` links are forwarded to `tests/`.
- **D. CI.** The merge job builds `site/`, which holds the demo page plus
  `tests/`, and the publish job publishes `site/` wherever it published
  `playwright-report/` before. Prune needs no logic change. The PR comment
  leads with the demo page.
- **E. Docs and skill.** The demo page becomes "the link to send
  stakeholders" everywhere. A new "Change what the demo page shows first"
  recipe lives in the example-data reference.

---

## 0. What is there today (checked on this branch)

- `playwright.config.js` has a `walkthroughs` project, which exists only when
  `PROTOTYPE_WALKTHROUGHS=true`. It records video (1280×720), trace and
  screenshots, uses `slowMo: WALKTHROUGH_SLOWMO ?? 250` and a 300 s timeout per
  test. `journeys` also uses a `DEMO_SLOWMO ?? 600` slowMo, which `test:fit`
  sets to 0. `features` has no slowMo.
- `fit/walkthroughs/walkthroughs.walkthrough.spec.js` generates one `describe`
  per set and one `test` per story, taken from `planWalkthroughs`
  (`scripts/designer/walkthrough/plan.js`). Each page is a `test.step` named
  `N. <page heading>`. The page is held with `page.waitForTimeout(800)`
  (`WALKTHROUGH_PAUSE_MS`), then pictured as a full-page JPEG attached as
  `NN <heading>`, then answered through `scripts/designer/show/drive.js`
  (`answerStep`, `startOnScreen`, `walkOnFromHub`, `captureErrors`). Those in
  turn call `scripts/designer/show/walk.js` (`fillFields` uses
  `locator.fill()` and `check()`, and `submitAndWait` clicks the primary
  button). `drive.js` and `walk.js` are shared with `designer:show`
  (`show/capture.js`).
- The stories are every labelled example (from
  `src/server/prototype-seed/scenarios/<set>.js`, or `scenarios/default.js`
  when a set has none), plus one error-messages story. For
  `high-risk-plants` that is 9 examples + 1 = **10 stories**, about **146
  page visits** in all (a full walk is about 15 pages, and the error story
  about 24).
- `designer:walkthrough` (`scripts/designer/walkthrough/run.js`) runs locally
  (html report in `.cache/designer/walkthrough/report/`) and with `--ci`
  (`blob,json` into `blob-report/` and `walkthrough-results/report.json`,
  output in `test-results/`).
- CI (`.github/workflows/check-pull-request.yml`) has these jobs:
  - `playwright` (FIT) and `walkthroughs` produce blobs.
  - `merge-report` runs `npm run reports:merge` and produces
    `playwright-report/` and `merged/report.json`.
  - `publish-report` puts main's report at the site root with a one-commit
    swap that keeps `reports/`, `.git` and `.nojekyll`, and keeps
    `reports/main/index.html` as a hash-preserving redirect to `../../`. It
    puts a PR's report at `reports/pr-<n>/` with peaceiris
    (`keep_files:false`), then writes a PR comment through
    `scripts/reports/pr-comment.js`, whose links go to `…/#?q=@<tag>`.
  - `release-canary` runs `designer:walkthrough -- --ci --set plants-working`.
- `prune-reports.yml` prunes only `reports/<name>/` folders that are not on
  the keep-list (`main` plus active `pr-<n>`), then orphan-resets `gh-pages`.
- Links in the form `#?q=@…` are also generated in code, by
  `scripts/designer/handoff/story.js` (`walkthroughLink`) and
  `scripts/reports/pr-comment.js`, and appear in many docs (§E).
- The prototype has a CSP (`src/server/common/helpers/content-security-policy.js`,
  using blankie). `page.addInitScript` is not subject to CSP, and styles set
  through the CSSOM (`el.style.x = …`) are not blocked by `style-src`.
- Ownership: `scripts/designer/**`, `scripts/reports/**`, `fit/walkthroughs/**`
  and `src/server/prototype-seed/**` are already in `ours`, so **every new file
  below falls under an existing `ours` glob**. `playwright.config.js` and
  `package.json` are `patched`: only their `why` text changes.
- The old Prototype Kit demo
  (`workareas/designer-prototyping/GB-notification-service/journey-demo/e2e/journey.js`)
  paced by hand. It centred with `scrollIntoView({block:'center',
  behavior:'smooth'})` and a 400 ms settle, typed with
  `pressSequentially(value, { delay })`, paused after each field and paused
  longer on each new page, and ran with slowMo 0. We reuse all of that,
  generically, driven by field names rather than by per-page helpers.

---

## A. Human pacing (walkthroughs only)

### A.1 One setting: `WALKTHROUGH_PACE=human|fast`

- `human` (the default) is used by CI's `walkthroughs` job and by
  `designer:walkthrough`.
- `fast` is for a designer checking that the stories still reach the end, and
  for CI's `release-canary`. That job proves a new release gets its
  walkthrough; it does not need watchable video, so it passes `--fast`.
- `designer:walkthrough -- --fast` sets `WALKTHROUGH_PACE=fast` through
  `playwrightEnv`. `options.js` gains `--fast` (a boolean) and a line in
  `USAGE`. An unknown `WALKTHROUGH_PACE` value falls back to `human` and the
  CLI prints one warning line.
- **slowMo goes to 0** for the walkthroughs project in both paces. slowMo
  slows every protocol call (counts, evaluates and waits as well as real
  actions), which gives jerky, uneven video. All the pacing is now explicit.
  `WALKTHROUGH_SLOWMO` stays as an override for maintainers (default `0`).
  `WALKTHROUGH_PAUSE_MS` is removed.
- The FIT projects are **not touched**. `journeys` keeps its
  `DEMO_SLOWMO`/`test:fit` behaviour and `features` stays as it is. The pace
  hooks are optional parameters, and they default to a no-op `NO_PACE`
  object, so `designer:show`, `fit/designer-sets.fit.spec.js` and every FIT
  spec behave exactly as they do today.

### A.2 The pace table (pure, unit tested)

New `scripts/designer/walkthrough/pace.js` (pure, with no Playwright import):

```js
export const PACES = Object.freeze({
  human: {
    readMsPerWord: 60,             // ~1000 wpm skim + a base: a person glancing, not reading every word
    readBaseMs: 1500,
    read: { min: 2000, max: 6000 },
    readFinal: { min: 4000, max: 8000 },   // confirmation, "after-*" and the last dashboard
    readErrors: { min: 2500, max: 5000 },  // an error summary on screen
    scrollSettleMs: 400,
    cursorSteps: 15,               // mouse.move steps: a glide, not a jump
    highlightMs: 350,              // the yellow focus ring before an action
    keyDelayMs: 70,                // per character
    maxTypingMs: 2500,             // a long value types faster, never longer than this
    afterChoiceMs: 400,            // after a radio, checkbox, select or typed field
    beforePressMs: 500,            // cursor resting on the button before it is pressed
    showCursor: true
  },
  fast: { /* every number 0, showCursor: false */ }
})
export const paceFromEnv = (value) => …        // 'human' | 'fast', unknown → 'human' + warning flag
export const readingTimeMs = (words, pace, role = 'page') => clamp(base + words × perWord, bounds[role])
export const keyDelayFor = (value, pace) => Math.min(pace.keyDelayMs, Math.floor(pace.maxTypingMs / length))
export const roleOfStep = (key) => 'final' for confirmation | after-* | dashboard-afterwards, else 'page'
```

The words counted are the visible words in `#main-content`, from
`innerText`, split on whitespace. A long check-your-answers page therefore
hits the 6 s cap, and a one-question page gets about 2 to 2.5 s.

### A.3 The browser side

New `scripts/designer/walkthrough/human-pace.js` (Playwright side). It has no
unit test, and the walkthrough run itself proves it.

- `installCursor(context)`: `context.addInitScript(...)` injects an overlay
  on every document:
  - a 22 px dark circle with a white ring, `position:fixed`,
    `pointer-events:none`, `z-index:2147483647` and `aria-hidden="true"`,
    that follows `mousemove` (a capture listener on `document`);
  - a short "press" pulse on `mousedown`;
  - a highlight box (a 3 px `#ffdd00` outline, the GOV.UK focus colour)
    that `highlight(rect)` draws over an element for `highlightMs`.

  Every overlay element carries `data-walkthrough-overlay`. Styles are set
  through the CSSOM only, so the CSP needs no change. (If a later CSP ever
  blocks this, the fallback is `bypassCSP: true` on the walkthroughs project
  only. Do not use it by default, because it changes what the page is
  allowed to do.) The last cursor position is kept in `sessionStorage`,
  inside a try/catch, so the cursor does not jump back to the corner on each
  new page.
- `createPace(page, settings)` returns the hooks that `walk.js`/`drive.js`
  call:
  - `settle()`: `waitForLoadState('load')`.
  - `linger(role)`: counts the words and sleeps for `readingTimeMs`.
  - `approach(locator)`: `scrollIntoView({block:'center',
    behavior:'smooth'})` in the page, sleep `scrollSettleMs`, then
    `boundingBox()` and `page.mouse.move(cx, cy, { steps })`, then
    `highlight`.
  - `type(locator, value)`: `approach`, `click`, `fill('')`, then
    `pressSequentially(value, { delay: keyDelayFor(value) })`, then sleep
    `afterChoiceMs`.
  - `choose(locator)`: `approach`, then the existing `check()`, then sleep.
  - `beforePress(button)`: `approach`, then sleep `beforePressMs`.

  Every sleep is a **Node-side** sleep (`node:timers/promises`), not
  `page.waitForTimeout`. The video still records the pause, and the trace's
  action list is not filled with "Wait for timeout" rows.
- `NO_PACE` (in `walk.js`, so `show/` does not import `walkthrough/`) has the
  same method names, all as async no-ops. `approach`, `type` and `choose`
  fall back to today's `fill()` and `check()`.

### A.4 The changes to shared helpers (behaviour identical when `pace` is omitted)

`scripts/designer/show/walk.js`:

- `fillFields(page, fields, { pace = NO_PACE } = {})`: a visible text box
  goes through `pace.type`, a radio or checkbox through `pace.choose`, and a
  visible select or enhanced type-ahead gets `pace.approach` on its visible
  box before today's `setValue`. Typing into accessible-autocomplete is
  unreliable, so the value is set as today but the cursor still goes there.
  Hidden fields stay instant.
- `submitAndWait(page, { timeout, pace = NO_PACE })`: runs
  `pace.beforePress(button)` before the click.
- `tickEveryCheckbox(page, { pace })`: each box goes through `pace.choose`.

`scripts/designer/show/drive.js`: `answerStep`, `startOnScreen`,
`walkOnFromHub` and `captureErrors` take and pass through `{ pace }`. The
direct-send fallback (`send`) is unchanged, because it is not on screen.

`fit/walkthroughs/walkthroughs.walkthrough.spec.js`:

- It reads `paceFromEnv(process.env.WALKTHROUGH_PACE)` once. In each test it
  calls `installCursor(context)` before `signIn`, and builds
  `pace = createPace(page, PACES[name])`.
- `pageStep`: in place of `page.waitForTimeout(PAUSE_MS)`, it runs
  `await pace.settle(); await pace.linger(roleOfStep(key))`, then takes the
  picture, **with the overlay hidden**:
  `page.screenshot({ …, style: '[data-walkthrough-overlay]{display:none!important}' })`
  (the `style` option is in Playwright 1.63). The page pictures on the demo
  page and in the report stay clean.
- `showErrorState` lingers with `role 'errors'`.
- Every `answerStep`/`startOnScreen`/`walkOnFromHub`/`captureErrors` call gets
  `{ pace }`. `pressAndWait` (amend, cancel and delete buttons) runs
  `pace.beforePress` before its click.
- `watchHealth` is unaffected. The overlay logs nothing, and its script runs
  before page scripts.

### A.5 What changes in the trace

The trace records the same steps, with the same `N. <heading>` names, so
`verdict.js` (`stoppedAt`) and the report's step list are unchanged. Inside
each step:

- `fill` becomes `click`, `fill('')` and `pressSequentially` for text boxes;
- a `mouse.move` (plus an `evaluate` for the scroll) comes before each
  control and each button;
- there are no "Wait for timeout" rows, because sleeps are Node-side;
- the overlay `div`s appear in the DOM snapshots and are marked
  `data-walkthrough-overlay`;
- the timeline is longer and matches the video one to one;
- trace size grows modestly, from more screencast frames.

The pictures attached to each step are taken without the overlay.

### A.6 Time budget and CI settings

| | Today (slowMo 250, 800 ms pause) | Human |
|---|---|---|
| Per page | ~3–4 s | ~8 s (reading ~3.5 s, ~2 controls × ~1.6 s, press ~0.6 s, nav ~0.5 s) |
| high-risk-plants, serial (146 pages) | ~9 min | ~20 min |
| Longest story (error messages, ~24 pages) | ~1.5 min | ~4 min |
| Typical full walk video | ~50 s | ~2 min |

- CI walkthroughs run with **`--workers=4`** (from `playwrightArgs` when
  `--ci`). The work is mostly idle waiting, and ubuntu-latest has 4 vCPUs,
  which is enough for 4 ffmpeg encoders at 1280×720. That brings the real
  journey to **about 6 to 7 minutes** of walking plus about 1 minute of boot.
  Each design release adds about 70 page visits (5 default examples plus the
  error story), which is about 2.5 minutes at 4 workers.
- Locally, `designer:walkthrough` leaves workers at Playwright's default. It
  walks only one set by default, so a single release takes about 5 to 8
  minutes. The CLI's "This takes a few minutes" line becomes "At a
  person's pace this takes about N minutes", with N estimated from
  `stories × 1 min / workers`. `--fast` is the quick check.
- Limits:
  - the walkthroughs project `timeout` goes from 300 000 to **600 000** ms;
  - `CI_GLOBAL_TIMEOUT_MS` goes from 25 to **40** minutes;
  - the `walkthroughs` job's `timeout-minutes` goes from 30 to **50**;
  - `release-canary` uses `--fast`, so its 25-minute limit stands.
- **No sharding now.** The rule is: when the `walkthroughs` job goes over
  25 minutes, turn it into a matrix of `--shard=i/n` (blob reports shard
  cleanly). The merge job's copy loop already renames each zip under
  `blob-walkthroughs-*`, and only needs the pattern widened to
  `blob-walkthroughs*`. Write that sentence as a comment above the job.
- No cap on story count. The stakeholder page is what gets short (§B), not
  the run.

---

## B. Priority: featured journeys

### B.1 In the example grammar

Two new optional keys on an example in
`src/server/prototype-seed/grammar.js` (`EXAMPLE_KEYS`, the header comment,
and validation):

```js
featured: 1,                                  // on the demo page, in this position (1 = first)
headline: 'Send a notification from start to finish'   // the demo page's title for it; defaults to label
```

The validation rules, each a plain sentence in `ExampleGrammarError`:

- `featured` is a whole number from 1 to 4;
- no two examples in a set share one;
- `headline` is non-empty text;
- `headline` without `featured` is a problem ("gives a headline but is not
  featured, so the headline would never show");
- more than 4 featured is a problem ("features 5 examples: the demo page
  shows 4 at most, plus what happens when something is missing").

The seed ignores both keys, just as it ignores `story`, so the chooser, the
example links and `designer:examples` are unchanged. The one-line summary is
the existing `story` key, so there is nothing new to write. A featured
example without a `story` makes `designer:examples -- check` print a warning,
but it is not an error: the demo page then falls back to the fixture's
`useCase`.

**Why on the example and not in `release.json`:** the real journey has no
`release.json`, the default examples have no file at all, and a
slug-list-in-metadata is one more place to keep in step. The position sits
next to the label and story it ranks, it travels when examples are copied,
and "put X first" is a one-number edit.

### B.2 In the plan

In `scripts/designer/walkthrough/plan.js`:

- `exampleStory` carries `featured` (a number or null) and `headline`
  (defaulting to the label).
- **The error-messages story is always featured, last.** Its position is one
  more than the highest featured example, so it is at most 5th. Its headline
  is "What happens when something is missing", and its summary is today's
  `story` text, reworded for stakeholders: "Each page is first sent with
  nothing filled in, to show the message a trader would see, then filled in
  properly."
- **The fallback when a set features nothing** (an old scenario file) is
  that the first example with `submit: true` is featured as 1, with the
  headline "Send a notification from start to finish", or failing that the
  first example. So every set always has a headline video.
- Stories are ordered with the featured ones first by position, then the
  rest in file order. The Playwright report therefore lists featured stories
  first too.
- `scenarioStory` (a set with a happy path but no examples) follows the same
  fallback.

In the spec, each test gets:

- the tag `@featured` for featured stories (so `tests/#?q=@featured`
  works);
- the annotations `{ type: 'Featured', description: '<n>' }` and
  `{ type: 'Headline', description: '<headline>' }`.

The demo page reads priority **from the JSON report's annotations**, not by
re-reading the sets, so the page always describes exactly what ran.

### B.3 Defaults

**`scenarios/high-risk-plants.js`** (4 featured examples + the error story):

| # | Example (slug) | Headline | Summary (`story`, reworded where needed) |
|---|---|---|---|
| 1 | `submitted` | Send a notification from start to finish | A trader bringing in seed potatoes answers every question, checks their answers and sends the notification. |
| 2 | `draft-midway` | Save a notification and come back to it later | A trader bringing in plants for planting answers about half the questions, leaves, and finds the draft waiting on their dashboard. |
| 3 | `amended` | Change a notification after sending it | A trader sends a notification for wood without bark, then starts to change it. |
| 4 | `copied` | Start a new notification from an earlier one | A trader reuses the answers from an earlier notification, with the goods arriving at Felixstowe instead. |
| 5 | (error story) | What happens when something is missing | (as above) |

These stay in the full report but are not featured:

- Draft, just started
- Submitted late
- Amendment started, then cancelled
- Deleted draft
- Another organisation's submitted notification

These are variations of the featured ones. "Copied" is featured over
"Submitted late" because it shows something new that a stakeholder would ask
about. Late is a tag on the dashboard, which is visible in the other videos.

**`scenarios/default.js`** (`PREFERRED`): `submitted` gets `featured: 1` with
the same headline, `draft-midway` gets `featured: 2`, and `amended` gets
`featured: 3`, with the same headlines and summaries. They need default
`story` text, because `default.js` has none today. Add the three sentences
above in a set-neutral form, for example "A trader answers every question,
checks their answers and sends the notification." `draft-just-started` and
`submitted-late` are not featured. Every new design release, whether made
from the real journey or from anything with a happy path, therefore gets the
same demo page shape with nothing to write. A release copied from a release
that has its own scenario file keeps that file's choices.

---

## C. The stakeholder page

### C.1 The layout on gh-pages

```
/                         ← main: the demo page (index.html, demo.css, media/)
/tests/                   ← main: the full Playwright report (FIT + every walkthrough)
/reports/main/index.html  ← redirect to ../../ (unchanged, keeps the hash)
/reports/pr-<n>/          ← a pull request's demo page
/reports/pr-<n>/tests/    ← that pull request's full Playwright report
/.nojekyll
```

Locally, `designer:walkthrough` writes the same shape to
`.cache/designer/walkthrough/site/` (`index.html` and `tests/`), so what a
designer sees is what CI publishes. `OUTPUTS.local.html` becomes
`…/site/tests` and a new `OUTPUTS.local.site` is added.

### C.2 How it is built: `npm run reports:demo`

New files, all under `scripts/reports/demo/` (already `ours`):

- `model.js` is **pure** and unit tested. It takes a walkthrough JSON report,
  an optional *links* JSON report and a context, and returns the page model.
  - It walks the specs (the same shape as `verdict.js`; export `specsOf` from
    there rather than copy it). It keeps `@walkthrough` specs and groups them
    by set tag, taking the set title from the `describe` title.
  - For each story it collects:
    - `headline` and `featured` from the annotations;
    - `summary`, from the `Story` annotation;
    - `status`, walked or stopped, using `verdict.js`'s `stoppedSentence`
      for a stopped one;
    - `durationMs`, from `result.duration`;
    - `video` and `trace`, from attachments named `video` and `trace`;
    - `pages`, from the image attachments whose names match `^\d{2} `, in
      order, with the caption being the name without the number;
    - `testId`.
  - **Attachment paths are re-rooted.** Each is taken relative to the
    walkthroughs project's `outputDir` in the report's own `config.projects`,
    then joined onto the `--results` folder given. This works on the runner
    that made it, after an artifact download, and locally.
  - **The test id comes from the links report.** The merged report's ids
    differ from the blob's, because `merge-reports` salts them. Match by
    `(set tag, test title)`. The details link is
    `tests/#?testId=<merged id>`, falling back to `tests/#?q=@<set-id>` when
    there is no match. Locally the links report is the walkthrough report
    itself.
  - **Set order.** Sets changed in this pull request come first (from
    `--changed-files`, a newline list of paths mapped to set ids with
    `setOfPath` from `scripts/designer/lib/sets.js`, plus
    `src/server/prototype-seed/scenarios/<id>.js`). Then working and research
    releases, by id; then frozen releases; then the real journey last,
    titled "How the service works today". A page that has only the real
    journey has one section and no contents list. Set titles and
    descriptions come from `releaseInfo`, which gives the release title and
    `release.json` `description`, read at build time from the checkout.
- `media.js` copies each video, poster and picture into the site **without
  duplicating what the report already holds**. The Playwright HTML report
  stores every attachment as `data/<sha1 of content>.<ext>`. For each file,
  it computes the sha1. If `<site>/tests/data/<sha1><ext>` exists, it links
  there; otherwise it copies the file to `<site>/media/<sha1><ext>` and links
  that. A unit test pins the naming against a real HTML report made in a
  temp folder, so a Playwright change shows up as a failed test, not as
  broken videos. The fallback copy means the page never breaks either way.
  Human-paced videos are about 5 to 10 MB each, so de-duplication keeps a
  report at roughly its current size rather than doubling it.
- `template.njk`, rendered with nunjucks using the **real `govuk-frontend`
  macros** from `node_modules/govuk-frontend/dist` (`govukPhaseBanner`,
  `govukTag`, `govukWarningText`, `govukDetails`, `govukSummaryList`,
  `govukInsetText`). The markup is therefore genuine GOV.UK markup.
- `demo.scss`, compiled at build time with the `sass` package already in
  devDependencies:

  ```scss
  @use "pkg:govuk-frontend" with ($govuk-font-family: arial, sans-serif, $govuk-include-default-font-face: false)
  ```

  plus about 20 lines for the video (`width:100%`) and the picture strip.
  The reason for this set-up is that GDS Transport is licensed only for
  service.gov.uk domains, and github.io is not one. There is no header crown
  and no footer crest, so no image assets are needed. The whole page is one
  `demo.css`. Rule 4's "no Sass" is about design-release templates, and
  this is maintainer report tooling (say so in the file's header comment).
- `cli.js` provides `npm run reports:demo -- --report <json> --results
  <folder> --site <folder> [--links <json>] [--changed-files <file>]`. It
  reads `REPORT_TITLE`, `PR_NUMBER`, `HEAD_REF`, `SHA` and `RUN_URL` from
  the environment, like `merge.config.js`. It has a plain-English error for
  each missing input and exits with 0 if there are no walkthroughs (it
  writes a page saying "The walkthroughs did not run this time" with a link
  to `tests/`).
- `package.json` gets `"reports:demo": "node scripts/reports/demo/cli.js"`,
  next to `reports:merge`, and the `patched` `why` for `package.json` in
  `overrides.json` gains "and reports:demo, which builds the stakeholder
  demo page".

`designer:walkthrough` (local) calls the same library after Playwright. The
walkthrough report is both the report and the links report, the results are
`OUTPUTS.local.results`, and the site is `OUTPUTS.local.site`. `--show` and
the default open serve `site/` through `playwright show-report <site>`, which
serves static files under the folder, so `/tests/` works too. **Check this in
the proof.** If it does not work, add a 30-line `node:http` static server in
`scripts/designer/walkthrough/serve.js` that reuses `findFreePort`.
`whereLines()` becomes:

```
Demo page: .cache/designer/walkthrough/site/index.html
Technical report (every step, trace): .cache/designer/walkthrough/site/tests/index.html
To watch it: npm run designer:walkthrough -- --show
```

### C.3 What the page says, top to bottom

1. A phase banner: `PROTOTYPE`, "This is a prototype of the import
   notification service for high-risk plants. It uses made-up data."
2. The title, `h1`: "The plants prototype, walked through".
3. A caption:
   - on main: "What is on main today. Updated 29 September 2026 (commit
     abc1234)";
   - on a pull request: "Proposed change: pull request #N, <branch>" plus an
     inset: "This shows a change that has not been agreed yet. [See what is
     on main](../../)".
4. "What this is", in two short paragraphs: "Each video shows someone using
   the prototype, page by page, at a normal pace. They are made
   automatically every time the prototype changes, so they always match it.
   The most important journeys are first."
5. Contents: links to `#set-<id>`, but only when there is more than one set.
6. For each set, a section with `id="set-<id>"`:
   - an `h2` with the set title and a tag: "Changed in this pull request",
     "Design release", "Frozen" or "Today's service";
   - the release description, if it has one;
   - each **featured** journey, in order:
     - an `h3` with "1. Send a notification from start to finish";
     - the summary paragraph;
     - if it stopped: a `govukWarningText` saying "This walkthrough stopped
       before the end: <stoppedSentence>". The video still plays up to that
       point;
     - `<video controls preload="metadata" poster="<first picture>"
       src="<video>">` with a text fallback link ("Download the video");
     - a small line: "2 minutes 10 seconds · 15 pages";
     - a `govukDetails` "See each page (15)", which opens to a wrapping strip
       of thumbnails. Each is an `<a>` to the full picture wrapping an
       `<img loading="lazy">` with the page heading as its caption and alt
       text;
     - a link: "See every step, and the technical detail" pointing to the
       test's `tests/#?testId=…`;
   - an `h3` "Other journeys in this release" followed by a
     `govukSummaryList`: each row has the headline or label as its key, the
     summary as its value, and the actions "Watch" (the video file) and
     "Details" (the tests link). No embedded players, so the page stays short.
7. An `h2` "For the development team": "[The technical report](tests/): every
   automatic test and every walkthrough, with traces", plus the FIT counts
   line (reusing `fitCounts` from `pr-comment.js` on the links/merged report)
   and "Made by run <RUN_URL>".
8. **Old links**, from an inline script in `<head>`:
   `if (location.hash.startsWith('#?')) location.replace('tests/' +
   location.hash)`. Every old `…/#?q=@walkthrough`,
   `…/#?q=@<set>` and `…/#?testId=…` link, at the root and under
   `reports/pr-<n>/`, lands in the right place in the report.
   `reports/main/` already redirects to `../../` with the hash, so it
   reaches the demo page, which forwards a `#?…` hash on to `tests/`. There
   are no workflow changes for the redirect.

Video format: Playwright records VP8 WebM. That plays in Chrome, Edge,
Firefox and Safari 14.1 and later on macOS. On older iOS Safari the fallback
"Download the video" link and the page pictures still work. Transcoding to
MP4 would need ffmpeg in CI, which is not worth it now; say so in
`model.js`'s header comment as a known limit.

Accessibility: the page is built from GOV.UK components. Videos have no
narration, so each featured journey's page strip, with its headings, is the
text alternative. Say this in the page: "Each video has no sound. The
pictures under it show the same pages."

---

## D. CI, publish and prune

In `check-pull-request.yml`:

1. **`walkthroughs` job**: `timeout-minutes: 50`. The run command is still
   `npm run designer:walkthrough -- --ci`, and pacing defaults to human
   (`--workers=4` comes from `playwrightArgs`). Add the sharding comment
   from A.6. The upload of `walkthrough-results` (`walkthrough-results/` +
   `test-results/`) is unchanged; the merge job now depends on it.
2. **`release-canary`**: `npm run designer:walkthrough -- --ci --fast --set
   plants-working`.
3. **`merge-report` job**:
   - Download the artifact `walkthrough-results` into `walkthrough-download/`.
     Use `continue-on-error`: a missing artifact just means no demo page
     content.
   - For a PR only, write the changed files:
     `gh api repos/${REPO}/pulls/${PR_NUMBER}/files --paginate --jq
     '.[].filename' > changed-files.txt`. This needs `pull-requests: read`
     on the job.
   - After `reports:merge`, add a step called "Build the demo page". It
     copies `playwright-report/.` into `site/tests/`, then runs
     `npm run reports:demo -- --report
     walkthrough-download/walkthrough-results/report.json --results
     walkthrough-download/test-results --links merged/report.json --site site
     [--changed-files changed-files.txt]`.
   - Upload `site/` and `merged/report.json` as `prototype-playwright-report`.
     `playwright-report/` is no longer uploaded separately, because it is
     `site/tests/`. **Say in the step comment that the download now holds
     `site/index.html` (the demo) and `site/tests/index.html` (the report).**
4. **`publish-report` job**:
   - The root swap becomes `cp -R ../site/. .` in place of
     `cp -R ../playwright-report/. .`. The existing
     `find … ! -name reports ! -name .git ! -name .nojekyll -exec rm -rf`
     already removes the old root report, including its `data/` and `trace/`,
     before the copy, so the old root-level report files do not linger next
     to `tests/`.
   - peaceiris gets `publish_dir: ./site`. For a PR,
     `destination_dir: reports/pr-<n>` with `keep_files:false` replaces the
     whole folder, `tests/` included.
   - The address step is unchanged: the URL is the demo page.
   - The comment step exports `REPORT_URL` as today. `pr-comment.js` derives
     the tests URL as `${REPORT_URL}tests/`.
   - The commit message becomes "chore: publish the prototype demo page and
     Playwright report for main at the site root".
5. **`scripts/reports/pr-comment.js`**: the comment leads with the demo page.

   ```
   <!-- prototype-playwright-report -->
   ### The prototype, walked through

   **[Watch the main journeys](<url>)**: short videos of the most important journeys, most important first — the link to send stakeholders.

   | Release | Featured on the demo page | Walked to the end |
   | --- | --- | --- |
   | [The real journey (high-risk-plants)](<url>#set-high-risk-plants) | 5 | 10 of 10 |

   For the development team: [every test and walkthrough, with traces](<url>tests/). FIT tests: 212 passed, 0 failed, 0 flaky.

   Updated for abc1234. A new link can take a minute to appear while GitHub Pages publishes it.
   ```

   The "no Pages" wording stays, pointing at the download, and now says to
   open `site/index.html`. The set-link helper `filtered` becomes two
   helpers: `demoLink(url, setId)` gives `#set-<id>`, and `testsLink(url,
   tag)` gives `tests/#?q=@<tag>`. A featured count per set comes from the
   `@featured` tag.
6. **`scripts/designer/handoff/story.js` `walkthroughLink`**: the URL becomes
   `${base}#set-${setId}` or `${base}reports/pr-${n}/#set-${setId}`, and the
   line becomes "Watch it walked through: <url>". Tests in `story.test.js`
   are updated to match.
7. **`prune-reports.yml`**: **no logic change.** `tests/`, `index.html`,
   `demo.css` and `media/` at the root are outside `reports/`, so the loop
   never sees them, and each `reports/pr-<n>/` (with its own `tests/`) is
   pruned as one folder. Only the header comment changes: "the demo page and
   the merged report (under tests/) for main at the site root".
8. `README.md`'s CI paragraph describes the demo page and `tests/` (doc,
   §E).

The failure modes are unchanged:

- a walkthroughs job that crashed still leaves FIT in `site/tests/` and a
  demo page saying the walkthroughs did not run;
- no Pages means the download holds both;
- a fork or Dependabot PR is still skipped.

---

## E. Skill and doc touchpoints

"The link to send stakeholders" becomes **the demo page**: `<siteUrl>` (main)
or `<siteUrl>reports/pr-<n>/` (a PR), with `#set-<id>` to jump to a release.
"The technical report" is `<siteUrl>tests/` (and `…/tests/#?q=@<id>`). Every
`#?q=@walkthrough` or `#?q=@<id>` given as a link for stakeholders is
replaced. Old links still work, through the forwarding in C.3.8.

Prototype repo (doc_paths):

| File | Change |
|---|---|
| `PROTOTYPE.md` "Walkthroughs" | Demo page link and what it shows, `tests/` for the detail, and "put X first" (the `featured` key). Pacing: human by default, `--fast` for a quick check |
| `docs/designers/seeing-your-change.md` (the walkthrough on every PR) | Demo page first, `tests/` second; replaces the `#?q=` lines at 214–217 |
| `docs/designers/example-data.md` | New section, "Choose what the demo page shows first": `featured`, `headline`, `story` as the summary, at most 4 plus the error story, and a worked example |
| `docs/designers/sharing-and-handing-off.md` | The link to send is the demo page (lines ~48, ~67) |
| `docs/designers/research-sessions.md` | Link (line ~113) to `#set-<id>` |
| `docs/designers/your-first-hour.md`, `docs/designers/README.md` | The opening link becomes the demo page |
| `docs/designers/glossary.md` | New entries "Demo page", "Featured journey", "Technical report"; replaces the `#?q=` text at ~122 |
| `docs/designers/design-releases.md`, `docs/designers/checks-and-errors.md` | A new release inherits the featured defaults. A red story shows as a warning on the demo page, not a failed check |
| `README.md` | The CI paragraph (lines 52–54): the demo page at the root, the report at `tests/` |
| `AGENTS.md` | Item 7 and rule 11: "change its examples (`label`, `story`, `featured`, `headline`)" |
| `.claude/rules/prototype-seed.md` | "Examples are walkthrough stories": add `featured` and `headline`, and the 4 + 1 limit |
| `.claude/rules/ownership.md` | Nothing new in ownership. Mention that `scripts/reports/demo/` is prototype-owned tooling, alongside `fit/walkthroughs/**` |

Workspace skill `.claude/skills/prototype/` (doc_paths):

| File | Change |
|---|---|
| `references/ROUTING.md` | The "A demo or stakeholder review" row: step 3 becomes "the walkthrough and its demo page", with a new step "choose what the demo page shows first (`references/example-data.md`, 'Featured journeys')". Step 5 sends the demo page link. The `show-my-change.md` triggers gain "the demo page". The `example-data.md` row gains the triggers "put the X journey first on the demo page", "feature this journey", "what shows first for stakeholders". Line ~175: the site root is the demo page |
| `references/show-my-change.md` | "Record a walkthrough": human pacing, `--fast`, time guidance (about 1 minute per story), and where the local demo page is (`.cache/designer/walkthrough/site/index.html`); agents check the page pictures in `site/` and `test-results/`. "Something I can share": `<siteUrl>#set-<id>`, `<siteUrl>reports/pr-<n>/#set-<id>`, or the zipped local `site/` folder (not `report/`) |
| `references/share-my-change.md` (lines ~285–291, ~322) and `references/share-my-change/pr-body.md` (~52) | The PR's demo page link, `reports/pr-<n>/`, is the one to send |
| `references/research-session.md` (~178–221) | `--no-open` is kept; the write-up links `<siteUrl>#set-<id>` |
| `references/run-the-prototype.md` (~80, ~290) | The demo page link replaces `#?q=@walkthrough` |
| `references/hand-off.md` (~13, ~337) and `references/raise-the-story.md` (~78) | The walkthrough link is `#set-<id>`, generated by `walkthroughLink` |
| `references/example-data.md` | New section, "Featured journeys (what the demo page shows first)". A designer's words ("put the amend journey first", "take deleted off the demo page", "call it 'Change a sent notification'") map to renumbering `featured`, removing it, or setting `headline`. Then run `designer:examples -- check <set>` and `designer:walkthrough -- --set <set> --fast --no-open` to see the order. Never feature more than 4. The error story is always last and cannot be moved (say so plainly) |
| `references/design-release.md` (~182) | A new release's demo page comes with 3 featured journeys plus the error story, with nothing to write |
| `references/check-my-change.md` (~61) | A red story shows a warning on the demo page and is still not a failed check |
| `SKILL.md` rule 12 | Unchanged (`--no-open`), plus "add `--fast` when you only need to know the stories reach the end" |

---

## F. Tests (vitest, pure modules) and the proof

Unit tests (all under globs that are already `ours`):

- `scripts/designer/walkthrough/pace.test.js`:
  - `readingTimeMs` bounds for each role;
  - `keyDelayFor` caps long values;
  - `paceFromEnv` handles human, fast, unknown and unset;
  - `roleOfStep`.
- `scripts/designer/walkthrough/options.test.js`: `--fast`.
  `run.test.js`: `playwrightEnv` sets `WALKTHROUGH_PACE`, `--ci` adds
  `--workers=4`, `whereLines` gives the new paths, and the local run calls
  the demo builder with the right inputs (through `deps`).
- `scripts/designer/walkthrough/plan.test.js`:
  - featured ordering;
  - the error story is last-featured;
  - the fallback feature when none is marked;
  - the headline defaults to the label;
  - scenario sets.
- `src/server/prototype-seed/grammar.test.js`: every new problem sentence.
  `examples.test.js`/default tests: `defaultExamples` marks 1, 2 and 3.
  `seed-*.test.js` still pass (the seed ignores the keys).
- `scripts/reports/demo/model.test.js`:
  - grouping and order (changed sets first, real journey last);
  - re-rooting of attachment paths;
  - merged id matching and its fallback;
  - stopped stories;
  - page captions from attachment names;
  - an empty report.

  `media.test.js`: sha1 naming against a real Playwright HTML report built in
  a temp folder, plus the fallback copy. `render.test.js`: the rendered HTML
  has, in order, the h1, the featured h3s in order, `<video>` with a
  resolvable `src` and `poster`, the summary list of other journeys, the
  `tests/` link and the hash-forwarding script. Assert the full rendered
  structure, not fragments.
- `scripts/reports/pr-comment.test.js`: the new lead line, the table links,
  `tests/`, and the no-Pages wording.
- `scripts/designer/handoff/story.test.js`: the new `walkthroughLink` URLs.

The proof (run by the implementer, and written to `proof.md` beside this
file):

1. `npm run designer:walkthrough -- --set high-risk-plants --no-open`. It
   reports 10 of 10 walked. Then:
   - watch `site/index.html`, and check the first featured video shows the
     cursor, the typing and a pause on each page;
   - check the time between pages in the trace (`playwright-trace` skill)
     is between 2 and 6 s;
   - confirm the page pictures have no cursor;
   - record the wall-clock time.
2. `--fast` runs in roughly today's time.
3. `--show` serves `/` and `/tests/`, and `#?q=@walkthrough` on `/` forwards
   to `tests/`.
4. `npm test`, `npm run lint` and `npm run format:check` all pass. FIT is
   unchanged (`npm run test:fit` takes the same time as before).
5. Build `site/` by hand from a local merge of the two blobs
   (`reports:merge`, then `reports:demo --links merged/report.json`) and
   confirm the "See every step" links open the right tests.

## G. Ownership split

**code_paths** (prototype code, tests, config, CI, overrides, package):

- `fit/walkthroughs/walkthroughs.walkthrough.spec.js`
- `scripts/designer/walkthrough/{pace.js,pace.test.js,human-pace.js,plan.js,plan.test.js,options.js,options.test.js,run.js,run.test.js}`
  (and `serve.js` only if C.2's check fails)
- `scripts/designer/show/{walk.js,drive.js}` and any existing tests of them
  that assert call shapes
- `scripts/designer/walkthrough/verdict.js` (export `specsOf`)
- `scripts/designer/handoff/{story.js,story.test.js}`
- `src/server/prototype-seed/{grammar.js,grammar.test.js,examples.test.js,scenarios/high-risk-plants.js,scenarios/default.js}`
- `scripts/reports/demo/{model.js,model.test.js,media.js,media.test.js,render.js,render.test.js,template.njk,demo.scss,cli.js}`
- `scripts/reports/{pr-comment.js,pr-comment.test.js}`
- `playwright.config.js` (walkthroughs: slowMo 0 default, timeout 600 000;
  plus its `why` in overrides)
- `package.json` (`reports:demo`)
- `overrides.json` (the `why` texts for `playwright.config.js` and
  `package.json` only; no new `ours` lines are needed)
- `.github/workflows/check-pull-request.yml`
- `.github/workflows/prune-reports.yml` (the header comment only)

**doc_paths**: the prototype `.md` files in §E, and everything under
`.claude/skills/prototype/` listed in §E.
