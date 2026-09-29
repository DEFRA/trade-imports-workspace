# Proof: human-paced walkthroughs and the stakeholder demo page

Checked 29 September 2026 on `feat/NO_JIRA-stakeholder-walkthroughs` (prototype
repo). Nothing committed or pushed.

## 1. The real journey, walked at a person's pace

`npm run designer:walkthrough -- --set high-risk-plants --no-open`
(log: `logs/proof-walkthrough.log`)

- **10 of 10 stories walked to the end.**
- **Total run time: 3 min 50 s wall clock** (Playwright: 3.6 min, 8 local
  workers). Stories took 28.5 s (draft, just started) to 2.8 min (amendment
  started, then cancelled).
- Featured video lengths, read from the page's `<video>` elements: 2 min 6 s
  (send), 1 min 26 s (save and come back), 2 min 34 s (change), 1 min 51 s
  (copy), 2 min 43 s (something missing).
- The site was copied into `local-site/`, then rebuilt there with the template
  fixes below (`reports:demo` against the same run). `local-site/tests/data/`
  also holds files left from the earlier run. Nothing links to them.

## 2. The page, as a stakeholder sees it

Screenshots (taken by `screens.spec.mjs` + `screens.config.mjs` in this
folder, run through the prototype's existing `test:fit` script with
`--config`, so no repo file is touched):

- `screens/demo-desktop-first-screen.png`: 1280×900, what shows before scrolling
- `screens/demo-desktop.png`: full page, 1280 wide
- `screens/demo-phone.png`: full page, 375 wide
- `screens/facts.json`: headings in order, every video's src, poster and
  duration, the image count, broken images, and the links
- `screens/forward.txt`: where an old `#?q=@walkthrough` link lands

What I saw:

- **Priority order is right.** The headings in order are: h1 "The plants
  prototype, walked through", h2 "How the service works today", then
  1. Send a notification from start to finish, 2. Save a notification and
  come back to it later, 3. Change a notification after sending it, 4. Start
  a new notification from an earlier one, 5. What happens when something is
  missing, then "Other journeys in this release" (5 rows, Watch and Details
  only), then "For the development team".
- **Plain English** throughout, with GOV.UK components in Arial.
- **Videos and pictures appear.** All 5 videos load their metadata, and all
  70 images load (0 broken). Every "See every step" link is a real
  `tests/#?testId=…`.
- **Old links still work.** A fresh load of `index.html#?q=@walkthrough`
  forwards to `tests/#?q=@walkthrough`.
- **Phone:** one column, with no sideways scrolling. The videos scale to the
  width.

### Fixed after looking

1. **Every featured video had the same poster.** Each story starts on the
   same empty dashboard, and the poster was the first page, so the five
   videos looked identical. The poster is now the story's **last** page (its
   outcome): the dashboard showing that notification as Submitted, Draft or
   Amending. `template.njk`, plus a test in `render.test.js`.
2. **You had to scroll past a 2-minute video to see what else was there.**
   Each release now opens with a numbered list of its featured journeys,
   each linked to its own heading, plus "Other journeys in this release (5)".
   The whole priority order now fits on the first screen
   (`demo-desktop-first-screen.png`). Built with `govuk-list--number` only.
   New test in `render.test.js`.

Left as is: locally, the caption says "What is on main today" whatever
branch the designer is on, and the dev section says "The FIT tests did not
run this time" (true, because a local run walks only). Both are right on CI.

## 3. Pacing, from the results rather than by watching

From `.cache/designer/walkthrough/report.json` (the `N. <heading>` steps):

- Each page step, meaning reading, answering and pressing, takes **4 to 14 s**
  in the normal stories. A one-question page (Overview, Notification
  submitted) takes 4.0 to 4.9 s. Long forms take 12 to 14 s (Arrival details
  12.1 s, the second Commodity details 13.8 s). The final dashboard lingers
  for 8.0 s. Pages in the error story take up to 21 s, because each is sent
  empty first.
- From the Submitted story's trace (`trace.zip` → `1-trace.trace`):
  - primary-button presses come **5 to 12 s apart**;
  - typing is real `pressSequentially` (`Frame.type`), taking **0.2 to
    0.8 s per answer** (for example 32.89 s to 33.69 s);
  - the trace has **27 cursor glides** (`mouseMove`);
  - there are no "Wait for timeout" rows, because the sleeps run in Node.
- This matches `pace.js`: reading 2 to 6 s (4 to 8 s on final pages), 70 ms a
  key, 400 ms after each choice and 500 ms resting on a button before the
  press.

## 4. CI publish and prune, traced

What holds:

- **Main:** the root swap removes everything except `reports/`, `.git` and
  `.nojekyll` (including the old root report's `data/` and `trace/`), then
  copies `site/`. The demo page is at `/`, the report at `/tests/`, and
  `reports/main/index.html` is rewritten as the hash-keeping redirect to
  `../../`. The demo page's head script forwards `#?…` to `tests/`.
- **A PR:** peaceiris publishes `./site` to `reports/pr-<n>/` with
  `keep_files:false`, so its `tests/` goes with it.
- **Prune:** only looks at `reports/<name>/`, so the root's `tests/`,
  `index.html`, `demo.css` and `media/` are untouched, and each
  `reports/pr-<n>/` goes as one folder. No change needed.
- **Artifacts:** `walkthrough-results` holds `walkthrough-results/` and
  `test-results/` (their common root is the workspace), so the download
  paths `walkthrough-download/walkthrough-results/report.json` and
  `walkthrough-download/test-results` are right. `prototype-playwright-report`
  holds `site/` and `merged/report.json`, which publish downloads to `.`.

Fixed:

1. **"Made by run" never showed.** The build step passed no `RUN_URL`. It now
   passes the run URL, and `SHA` is now the PR head
   (`github.event.pull_request.head.sha || github.sha`), not the merge
   commit, so it matches the PR comment's "Updated for".
2. **One failed `gh api` call could take the whole site down.** The
   changed-files step had no `continue-on-error`, and `reports:demo` would
   have thrown if the file was missing. Now the step is `continue-on-error`,
   and `cli.js` reads a missing file as "nothing changed". New test in
   `cli.test.js`.
3. **`cp -R playwright-report/. site/tests/` copied into a folder that did not
   exist yet.** It now runs `mkdir -p site/tests` first.

## 5. Other fix: the time estimate

`designer:walkthrough` said "about 10 minutes" and took 3 min 50 s. It
assumed 1 local worker and 1 minute per story. Measured, a story takes about
2 minutes, Playwright runs half the processors' worth of workers locally, and
no run is shorter than its longest story (about 3 minutes). `run.js` now
estimates `max(3, ceil(stories × 2 min / workers))`, with local workers set
to Playwright's default (`localWorkers`, injected through `deps`). CI stays
at 4 workers, so the real journey there comes to about 5 minutes. Tests are
in `run.test.js`. The skill's `references/show-my-change.md` timing line now
says the same.

## 6. Checks and tree

- `npm test`: 3513 passed, 8 skipped. `lint:js` and `format:check` are clean.
- `git status --short` in the prototype shows only source changes: the
  modified files plus the untracked `pace.js`, `pace.test.js`, `human-pace.js`
  and `scripts/reports/demo/`. Run output stays in the gitignored
  `.cache/designer/walkthrough/`.
- In this workarea (not the repo), I left `screens/` (including Playwright's
  `screens/.results/`), `local-site/`, `screens.spec.mjs` and
  `screens.config.mjs`.

Files changed in this pass:

- `.github/workflows/check-pull-request.yml`
- `scripts/reports/demo/cli.js`, `cli.test.js`
- `scripts/reports/demo/template.njk`, `render.test.js`
- `scripts/designer/walkthrough/run.js`, `run.test.js`
- workspace: `.claude/skills/prototype/references/show-my-change.md`
