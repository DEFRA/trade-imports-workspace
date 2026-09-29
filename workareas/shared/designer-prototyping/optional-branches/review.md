# Optional branches: adversarial review

What was reviewed: the uncommitted changes on `feat/NO_JIRA-optional-branches` in
`repos/trade-imports-plants-prototype` and in the workspace (the `prototype` skill and
`docs/repos/trade-imports-plants-prototype.md`). They were checked against Sam's ruling of
29 Sep 2026: main's report sits at the site root, each pull request keeps its own report,
main is not protected, and branches can be used but are never required.

Nothing was committed. Both test suites pass after the fixes: prototype 3420 passed and 8
skipped, tim 1906 passed. Prototype `format:check` and `lint:js` pass too. The logs are in
`logs/review-*.log`.

## 1. CI: the publish and prune steps, traced

| Scenario | Before this review | After |
| --- | --- | --- |
| Main publishes to `/` | It worked, but in two pushes: a "clear the root" commit, then peaceiris copied in the new report. If peaceiris failed (`continue-on-error`), **the site root was left empty** until the next main run. Even when it worked, the root 404'd between the two pushes. | **Fixed.** Once gh-pages exists, the root report is swapped in by hand in one commit (clear the old root files, copy the new report, touch `.nojekyll`, commit, push). If that fails, the old report stays up. peaceiris now runs only for pull requests, and for the very first publish, which creates gh-pages. |
| Root survives a PR publish | Yes. peaceiris with `destination_dir: reports/pr-<n>` and `keep_files: false` only clears that one folder. | Same. |
| Root survives a prune | Yes. Prune only touches `reports/*/`, and the orphan-reset keeps every file. | Same. |
| `reports/pr-<n>/` survives a main publish | Yes. The clear step leaves `reports/` alone. | Same. It is now one `find` in the one commit. |
| `.nojekyll` kept | Kept if it was there, but nothing added it back. | Every main publish now runs `touch .nojekyll`. |
| Old `reports/main/` links | **Broken.** Prune dropped `main` from its keep-list, so `reports/main/` was deleted and every old link (docs, Jira stories already raised, PR comments) returned 404. | **Fixed.** Every main publish writes `reports/main/index.html`, which redirects to `../../` and keeps the `#?q=@…` filter. A meta refresh backs it up. Prune keeps `main` on its keep-list so the redirect is never pruned. This is noted in README.md and in the workspace repo page. |
| Address step | `DEPLOYED` came from the peaceiris outcome only. | Now `deploy.outcome == 'success' \|\| deploy-root.outcome == 'success'`, compared with `"true"`. |
| Shell and YAML | `gh api …/pages` already dropped stdout on error and accepted only an `https://` value. `gh api branches/gh-pages --silent 2>/dev/null` is fine. The git identity was set before the commit. | The new step uses `set -euo pipefail` and sets the git identity before it commits. Its heredoc sits at the same indent as the rest of the block, so its `HTML` terminator lands in column 0 once YAML strips the indent. The push uses the checkout's saved credentials; the job has `contents: write`. |

Left open (these were already there, and fixing them needs a decision):
- **Queued publishes can be dropped.** `publish-report` and prune share
  `concurrency: pages-<repo>` with `cancel-in-progress: false`. GitHub still keeps only one
  pending run per group, so if a main publish is waiting and a pull request's publish joins the
  queue, the main publish is cancelled. The root report then stays stale until the next push
  to main or the Monday run. The ruling says Pages shows the report from the latest run on
  main, so this matters more now. Possible fixes are per-kind groups (`pages-root` and
  `pages-pr`, which would then need the two kinds of push to rebase or retry) or a retry loop
  on the push.
- The top-of-file comments in both workflows now describe the root, the per-PR folders and
  the redirect.

## 2. Skill and docs

Fixed:
- **"Share this" on main ignored "make a pull request".** `share-my-change.md` step 6 said the
  route "depends on the branch, never on how they phrased it". So a designer on `main` who
  said "make a pull request" or "keep this off main" at share time would have had their work
  pushed straight to `main`. This was the most serious skill bug. Step 6 now has an explicit
  "Which route" list:
  - On `main`, if they asked for a pull request, a review or to keep it off `main` (now or
    earlier in the session): make `design/<set>-<slug>`, move the local `main` back to
    `origin/main` so a later push cannot carry the kept-off commit there by surprise (nothing
    is lost, because every commit is on the new branch), then take the draft-PR route.
  - On `main` otherwise: push to `main`.
  - On `design/*`: open a draft PR.
- **Offering the branch in one line.** On `main`, the "shall I send this?" question may add one
  line saying the work goes straight to `main` unless they say "keep it off main". That line is
  given once per session and never again after they answer, and never on a `design/*` branch.
- The fetch and merge commands for a rejected push to main are now in the `git -C` form. A bare
  `git merge` from the workspace root would have acted on the workspace repo.
- **Rules that still only named `design/*`.** In these files, "never edit a real-service file"
  was only stated for `design/*` branches, which read as if editing on `main` were allowed:
  `SKILL.md` rules 1 and 10, `show-my-change.md`, `run-the-prototype.md`, and
  `share-my-change.md`'s "check ownership before saving". Each now says "on `main` or a
  `design/*` branch alike".
- `research-session.md` still said "merged to main… get it merged the day before". It now says
  the work reaches `main`, either pushed straight there or merged.
- `design-session.js` prepare step: on `main` with `keepOffMain`, the prompt said "stay on it"
  and then "switch -c" in the same bullet. Each case now has its own line. Without the flag
  the line reads "stay on it… Never make a branch and never mention one." The check is now the
  strict `keepOffMain === true`.
- `ROUTING.md` workflow table: added that `design-session` stays on the current branch, and
  when to pass `keepOffMain`.
- `sharing-and-handing-off.md`:
  - "Straight to main (the default)" now says it is the default *when you're working on
    `main`*.
  - "Claude always asks before sending… that choice sticks, Claude will not ask again"
    contradicted itself. It now says the route choice sticks for the session, and Claude still
    asks before each send.
- `PROTOTYPE.md` and `seeing-your-change.md`: "once merged, the lasting link" now says "once
  the work is on `main` (pushed straight there or merged)".
- `story.js` `walkthroughLink`: without a pull request, the note said "once the pull request is
  merged". It now says "once it is on main", and the test is updated to match.
- `docs/repos/trade-imports-plants-prototype.md` still said `reports/main/` for main. It now
  gives the site root and mentions the redirect.

Checked and fine:
- `AGENTS.md`, `ROUTING.md` "Branches", and `SKILL.md` rule 11: `main` is first-class, the
  `design/*` branch is offered in one line only when useful, and a stated preference holds for
  the session.
- `design-release.md`, `change-the-words.md`, `change-the-journey.md` and
  `fake-a-service.md` all stay on `main`.
- The hand-off works on `main`: `designBranch` is just the current branch, and `main` is on
  GitHub, so the brief never says "push it first".
- The save scripts (`scripts/designer/save`) have no branch check, so saving on `main` just
  works.

Needs Sam (not changed, because hooks are off-limits):
- **`scripts/designer/hooks/guard-edit.js` only guards `design/*` branches.** On `main` it
  allows every edit, including real-service files and frozen releases. Now that `main` is a
  normal place for a designer to work, the edit guard is off for designers working there. The
  written rules cover it, but the hook does not. One option: also guard `main`, and exempt
  `chore/*`, `handoff/*`, `maintain/*` and `feat/*`. Maintainers who edit real-service files
  directly on `main` would then be blocked. The weekly sync runs on `maintain/*` and is
  unaffected. The hook only runs where the prototype's `.claude/settings.json` wires it in.
- `share-my-change.md` step 3 still branches from someone else's `feat/*`/`chore/*` branch
  rather than moving to `main`, which ROUTING's "Branches" prefers. It is a small mismatch and
  was already there: unsaved changes have to come along, so switching to `main` may clash.
