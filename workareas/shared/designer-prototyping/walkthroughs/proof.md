# Walkthroughs: end-to-end proof, as a designer sees it

Date: 2026-09-28. Branch `feat/NO_JIRA-designer-prototyping` in both the
workspace and `repos/trade-imports-plants-prototype`. Nothing committed or
pushed.

## 1. A throwaway design release

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run new:set -- plants-walkthrough-proof --from high-risk-plants --title "Walkthrough proof" --purpose working
```

Made the release with no specs copied (19 browser tests, 51 unit tests and 8
spec files left out, as designed). Nothing was written for its walkthrough.

## 2. Its walkthrough

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:walkthrough -- --set plants-walkthrough-proof --no-open
```

Result: `Walkthrough proof (plants-walkthrough-proof): 6 of 6 stories walked
to the end.` in 35 seconds on port 3203. The six stories were Draft, just started;
Draft, part way through; Submitted; Submitted late; Submitted, then amended;
and What each page says when something is missing. They came from the
default examples, because a copied release has no scenario file of its own.

Step pictures I opened with Read (all under
`repos/trade-imports-plants-prototype/.cache/designer/walkthrough/test-results/`):

- `walkthroughs.walkthrough-W-53b65-hrough-proof-Submitted-late-walkthroughs/01-dashboard.jpg`:
  the empty dashboard ("You have not started any notifications in this
  session"), with the Start a new notification button.
- `walkthroughs.walkthrough-W-53b65-hrough-proof-Submitted-late-walkthroughs/15-dashboard-afterwards.jpg`:
  the dashboard afterwards, with one card for Potatoes from Portugal, arriving
  27 Sep 2026, tagged **Submitted** and **Late**. That is exactly what the
  story exists to show.
- `walkthroughs.walkthrough-W-5b778-s-when-something-is-missing-walkthroughs/06-origin-errors.jpg`:
  Origin of the import sent empty, showing the "There is a problem" summary
  and the inline error "Select the country where the consignment originates
  from".

Video and trace for the same stories:

- `.../walkthroughs.walkthrough-W-53b65-hrough-proof-Submitted-late-walkthroughs/video.webm`
  and `.../trace.zip`
- `.../walkthroughs.walkthrough-W-5b778-s-when-something-is-missing-walkthroughs/video.webm`
  and `.../trace.zip`

HTML report: `.cache/designer/walkthrough/report/index.html`. Its `data/`
folder holds 6 `.webm` videos and 6 trace `.zip` files, one of each per story,
and `trace/` holds the trace viewer. Every step is named after the page's own
heading. I read these from `.cache/designer/walkthrough/report.json`, which
the same run writes alongside the HTML report. Examples: "1. Import
notification service", "2. What are you importing?", "6. Origin of the
import", "12. Check your answers (ready to check and send)", "3. Commodity
details (the story stops here, left to fill in)", "14. Notification
submitted" and "15. Import notification service (afterwards)". The HTML
report's own data is a base64 zip inside `index.html`, so I could not read it
without node. It is the same test and step tree.

I also proved the CI claim that the last `--reporter` wins:
`npm run test:fit:ci -- --reporter=list,github,html,blob fit/sets-chooser.fit.spec.js`
wrote both `blob-report/report-9d77698.zip` and `playwright-report/`, and
passed 3 of 3. Without a file filter, the name is `report.zip`. The
merge-report step copies whichever it finds.

## 3. CI review against the workspace originals

Checked `check-pull-request.yml` (publish-report, merge-report,
walkthroughs, boot-check, release-canary) and `prune-reports.yml` against
`e2e-tests.yml`, `cleanup-e2e-reports.yml` and plants-frontend's
`lighthouse.yml`. These already match the originals: permissions at the
workflow level (`contents: read`) and job level (`contents: write`,
`pages: read`, `pull-requests: write`); concurrency (a
`pages-${{ github.repository }}` group shared by publish and prune, and a
per-PR run group that cancels older PR runs); `keep_files: false` with
`destination_dir`, so only this report's folder is replaced; the keep-list
by `pr-<n>` plus `main`; the closed PR force-removed from the list; the same
orphan reset; stopping cleanly when there is no `gh-pages` yet; the sticky
comment through `gh api`; and falling back to the Actions artifact when Pages
is off (`continue-on-error` on deploy, and an empty `REPORT_URL` switches
the comment to the download wording). `pr-comment.js` and `verdict.js` use
node built-ins only, so the publish job needs no `npm ci`.

Fixes made:

1. **`publish-report` now skips runs triggered by Dependabot**
   (`github.actor != 'dependabot[bot]'`), with a comment giving the reason.
   Those runs get a read-only token, so the gh-pages push and the PR
   comment could only fail. The fork guard was already there.
2. **`prune-reports.yml` now has a job-level `if`** that skips a
   `pull_request: closed` event from a fork, or one Dependabot closed. It
   had no guard, so the force-push would have gone red with a read-only
   token. The nightly run prunes those reports instead.
3. **`.gitignore` now ignores `walkthrough-results/` and `merged/`**, and
   the `overrides.json` `why` for `.gitignore` says so. Before, running
   `designer:walkthrough -- --ci` or `reports:merge` locally left untracked
   output in `git status`.

The boot-check fix strips the query with `${x%%\?*}` and the scheme and host
with `/${x#*://*/}`, then compares the result to `/auth/sign-in`. I checked
it by hand: `http://localhost:3103/auth/sign-in?redirect=%2Fhigh-risk-plants`,
`http://localhost:3103/auth/sign-in` and `/auth/sign-in?redirect=...` all
give `/auth/sign-in`, and an empty redirect fails as it should. A scratch
bash run of the same logic was denied by permissions, so this is reasoned,
not executed. None of the CI workflows can be run locally.

One finding for design.md, not a code change: design.md section 6 says "The
weekly sync PR gets a report too". That is not true. `sync-upstream.yml`
opens its pull request with `GITHUB_TOKEN`, which triggers no
`pull_request` workflows. The Monday 07:00 `schedule` run of
`check-pull-request.yml` publishes `reports/main/` instead. No doc repeats
the claim.

## 4. Routing: "we've got a show and tell on Thursday, can I send stakeholders something?"

Before: the Outcomes row matched on "show and tell" and "send this to
stakeholders", but gave only the pull request route. It never checked
whether Pages is on (it is not today:
`gh api repos/DEFRA/trade-imports-plants-prototype/pages` returns 404). It
never offered the `reports/main/` link for a release already on `main`. And
it said `--show` was "the only way to see it" before a pull request, which
gives the designer nothing they can send. The Phrases table also sent "send
this to stakeholders" and "a link I can share" to `share-my-change`, which
only covers the link after a pull request.

Fixed:

- `.claude/skills/prototype/references/show-my-change.md`, "Something I can
  share", is now an ordered choice:
  1. Check Pages with `gh api .../pages`. If it is off, say the maintainer
     turns it on, and give the exact settings.
  2. If the release is already on `main`, send
     `<reportsUrl>main/#?q=@<set-id>`.
  3. If it is not, open a pull request and send `<reportsUrl>pr-<n>/#?q=@<set-id>`.
     Push at least the day before the session.
  4. If there is no web link, zip `.cache/designer/walkthrough/report/`.
     The recipient opens `index.html`: steps, pictures and videos work, and
     only the trace needs http. Or run `--show` and share the screen.
- `references/ROUTING.md`: part 5 of the Outcomes row now points at that
  choice. "send this to stakeholders" and "a link I can share" moved to the
  `show-my-change` row, and `share-my-change` keeps "where's the report
  link on my pull request".
- `docs/designers/sharing-and-handing-off.md`: adds the zip-the-local-report
  route for a show and tell with no web link yet.
- `PROTOTYPE.md`: the Walkthroughs section says the `reports/main/` link
  works once the maintainer turns Pages on. The guide has a 130-line cap, which
  `scripts/designer/suite.test.js` enforces, so this went into the existing
  paragraph.
- `AGENTS.md` rule 11 and `.claude/rules/ownership.md` wrongly said nothing
  under `fit/walkthroughs/` is ever committed. The generator spec
  `fit/walkthroughs/walkthroughs.walkthrough.spec.js` is committed. The
  rule is now "no spec per release; change the release's examples instead".

## 5. Clean-up

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:release -- retire plants-walkthrough-proof --discard
```

This removed the set, its route file, its mount, its chooser description and
its two `overrides.json` lines. `git status --short` now shows only the
walkthrough work: the modified docs, rules, workflow, `.gitignore`,
`overrides.json`, `package.json`, `playwright.config.js`, the handoff, show
and seed scripts, plus the new `prune-reports.yml`, `fit/walkthroughs/`,
`scripts/designer/show/drive*.js`, `scripts/designer/walkthrough/` and
`scripts/reports/`. There is no proof release, and no report output (the
`.cache/`, `blob-report/`, `playwright-report/` and `test-results/` folders
are all ignored).

Checks after the fixes: `format:check` is clean. The full `npm test` gave
3419 passed and 1 failed. The failure was the 130-line cap on PROTOTYPE.md,
which my first edit broke. I fixed it, and `scripts/designer/suite.test.js`
then passed 29 of 29.

## Sam's jobs (unchanged from design.md, confirmed today)

- **Turn on GitHub Pages**: Settings, Pages, Deploy from a branch,
  `gh-pages`, `/ (root)`. The API returns 404 today, so the links will not
  work yet. The first pull request run creates `gh-pages`, and until Pages
  is on, the comment points at the `prototype-playwright-report` download.
- Do not make "Walkthroughs", "Merge the Playwright report" or "Publish the
  Playwright report" required checks.
