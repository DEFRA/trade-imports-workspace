# Build it for real

The designer says: "make this real", "start building it on the real
service", "build this properly", or agrees to that route after
`references/hand-off.md` or `references/raise-the-story.md`.

This is the primary route the brief points to: build the change properly in
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend`
(the real, live checkout — never the prototype's own copy of
`high-risk-plants`), on its own branch, through the same recipes and checks a
developer would use. It **never pushes, never opens a pull request, never
merges, and never launches a full build run on its own.** It stops with a
local commit (or, for C2, a request document) and tells the designer exactly
what to do next.

## Which route

- **C1** — words only, or up to three frontend-only elements (a field, a
  page, a section): applies the change directly, through
  `frontend-change`, on a new branch off `main`.
- **C2** — a new service, four or more elements, or a clash with a standing
  ruling in the real repos (for example plants' removed transporter service):
  too big for a direct apply. Writes a `requirements-pipeline` DISTIL request
  naming the sources, and stops. **A designer session never launches BUILD
  itself** — that is a developer's or a maintainer's call, from the DISTIL
  request this route writes.

If you are not sure which fits, count the elements and check
`references/house-conventions.md`'s "Kept deliberately" list for a standing
ruling the change might clash with (a service the real team removed on
purpose, say); when either points to C2, take C2.

## Guard rails

- **Never push, open a pull request, merge, or launch `requirements-pipeline`
  BUILD.** This route's job ends at a local commit (C1) or a written request
  document (C2).
- **Requires a clean checkout of `trade-imports-plants-frontend`** before
  starting: `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend status --porcelain`
  must print nothing. If it does not, stop and say so: something else is
  mid-change there.
- **Records and restores the starting branch** of `trade-imports-plants-frontend`,
  so a designer session never leaves that checkout on the wrong branch for
  whoever uses it next.
- **Same branch name everywhere**: `feat/<ticket>-<slug>` (or
  `feat/NO_JIRA-<slug>` with no ticket) across `trade-imports-plants-frontend`,
  `trade-imports-plants-backend` (when the change touches the backend
  contract) and the tests repo. The workspace itself is never switched to
  that branch under a running session — its own openspec update travels as a
  patch file instead (below). Quote
  `tim workspace branch` for the designer so they can see the parity rule for
  themselves.
- **Never edit `.claude/settings.json` or anything under `.claude/hooks/`**
  in any repo.
- **One Bash command per call.**

## Launch it

```text
Workflow({
  scriptPath: ".claude/skills/prototype/workflow/prepare-handoff.js",
  args: {
    handoff: "~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<yyyy-mm-dd>-<slug>",
    ticket: "EUDPA-N" or "NO_JIRA",
    route: "C1" | "C2" | "auto",
    dryRun: true
  }
})
```

Every key is required, with no defaults. `route: "auto"` lets the workflow
pick C1 or C2 from the hand-off's own report (element count, and any
standing-ruling clash it can detect); state the route yourself whenever you
already know it. **Always run once with `dryRun: true` first**, read the
result, and tell the designer the planned branch names, the recipe per
element and the route before running again with `dryRun: false`. A dry run
touches nothing in any repo — check
`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend status --porcelain`
(and the backend and tests repos, if the plan names them) print nothing
before and after.

## What C1 does

1. Records `trade-imports-plants-frontend`'s current branch, and requires the
   checkout to be clean.
2. `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend switch -c feat/<ticket>-<slug> origin/main`.
3. Applies the hand-off's `upstream.patch` upstream-ready part with
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend apply --3way`
   as a starting point — never the whole patch blind: it is a starting point
   for the recipes to finish, not the final diff.
4. Invokes the `frontend-change` skill once per element, with the target
   profile `high-risk-plants-frontend`, following that element's recipe
   (add-a-field, add-a-page, and so on) exactly as a developer would, rather
   than hand-editing the patched files.
5. Runs the plants ladder (the same checks `frontend-change` always runs:
   lint, unit tests, `lint:arch`, the copy-parity test, the fit/axe specs).
6. Writes the workspace's own behaviour-spec delta as
   `openspec.patch` inside the hand-off folder — **never** by switching the
   workspace repo to the feature branch under a running session. Whoever
   picks up the branch applies that patch to `~/git/defra/trade-imports-workspace`
   themselves once they are ready to open the spec PR alongside the code PR.
7. Commits the change **locally** on `feat/<ticket>-<slug>` in
   `trade-imports-plants-frontend`. Does not push.
8. Switches `trade-imports-plants-frontend` back to the branch it started on.
9. Prints the `tim workspace branch` parity quote (which repos now have a
   branch named `feat/<ticket>-<slug>`, and which still need one — the
   backend and tests repos are named but never touched automatically, since
   only the element actually asked for was a frontend one).

## What C2 does

Writes `<handoff>/distil-request.md` naming:

- the hand-off folder itself as a source
- the design branch (`design/<set>-<slug>` in the prototype)
- `repo:trade-imports-plants-frontend`
- `repo:trade-imports-plants-backend` (when the change needs a backend
  contract)
- `~/git/defra/trade-imports-workspace/openspec/specs/plants` (the standing
  behaviour spec, so DISTIL reconciles against what is already promised)

then stops. It touches no repo. Tell the designer plainly: "This is bigger
than one direct change, so I've written a request a developer (or a build
run) can pick up from
`<handoff>/distil-request.md`. I have not started building it — that's the
next step for whoever picks this up."

## Verify

- `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend status --porcelain`
  prints nothing before the run and, after a real (non-dry) C1 run, shows
  the checkout back on its starting branch with the working tree clean (the
  new commit lives on `feat/<ticket>-<slug>`, not on the branch you are back
  on).
- `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend log -1 --format="%H %s" feat/<ticket>-<slug>`
  shows the local commit.
- `<handoff>/openspec.patch` (C1) or `<handoff>/distil-request.md` (C2)
  exists.
- No `git push`, `gh pr create` or `requirements-pipeline` BUILD launch
  appears anywhere in the run's log.

## After the real team merges

Once `trade-imports-plants-frontend` merges the change on its own pull
request: for a feature that was a prototype-owned service, drop that
service's line from the prototype's `overrides.json` `ours` list first (tell
the maintainer, or do it on a `maintain/*` branch), so the next weekly sync
brings the real service in and retires the prototype's stand-in cleanly
rather than clashing with it. Nothing in a design release needs to change by
hand: the sync does the rest.
