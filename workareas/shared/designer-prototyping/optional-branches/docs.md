# Optional branches — docs/skill half

Branch: `feat/NO_JIRA-optional-branches`, both repos (workspace and
`trade-imports-plants-prototype`), already existed based on `origin/main`.
Nothing committed — Sam commits. This file documents the working-tree diff
for review.

## The model this implements (Sam's ruling, 29 Sep 2026)

1. **Iterate locally, on whatever branch you're on — `main` included.**
   Running, changing, checking, showing and saving the prototype never
   requires a branch. No reference makes one unless told to.
2. **Share, two routes, the designer's choice:**
   - **Straight to `main` (the default when they just say "share this" or
     "push it").** Save, then push directly to `main`. The deployed
     prototype and its report update once the pipeline runs. No PR, no
     review gate — the same way the old GB-notification-service prototype
     worked (the designer committed every change straight to `main`).
   - **On a `design/*` branch**, only when the designer wants to share
     in-progress work without it touching `main` yet ("keep this off main",
     "put it on a branch first", "make a pull request", or a review is
     wanted). The agent makes `design/<release>-<slug>`, pushes it and opens
     a **draft** pull request; its checks publish a report at
     `reports/pr-<n>/` to send around.
3. The agent offers the branch route in one line, only when it would help,
   never by default and never as a nag. A stated preference ("I'd rather
   review things first", "just push to main from here on") holds for the
   rest of the session.
4. Pushing anywhere still needs the designer's own say-so — "save it" alone
   never pushes. A request to share ("share this", "push it", "make a pull
   request") is itself the yes; the agent never double-asks after that.
5. Research releases and hand-offs are unaffected: neither ever required a
   `design/*` branch specifically, and both still work identically on `main`
   or a branch.

## What changed, and why

### Workspace skill (`.claude/skills/prototype/`)

- **`SKILL.md` rule 11** — was "work on a `design/*` branch, make one before
  the first change from any other branch including `main`". Now: stay on
  whatever branch the designer is on, `main` included; offer a `design/*`
  branch only when it helps share without touching `main`; a stated
  preference holds for the session.
- **`references/ROUTING.md`, "Branches"** — the single routing source for
  this choice. Rewritten as two first-class ways of working (`main` /
  `design/*`), with someone else's `feat/*`/`chore/*`/trial branch called
  out as the one case that still forces a move. `handoff/*` and
  maintainer `chore/*` branches are unchanged — this ruling is about the
  designer's own work only.
- **`references/share-my-change.md`** — the save/share mechanics:
  - Section 3 ("Stay on the designer's own branch"): `main` is now a listed,
    fully supported case, first in the list; a `design/*` branch is made
    only from `main`, only on request.
  - Section 6 ("Send it to GitHub"): forks on the branch. On `main`, a plain
    `git push origin main` — no PR. On a `design/*` branch, push +
    **`gh pr create --draft`** (was a normal, non-draft PR) + the existing
    report-link flow. Both paths ask before pushing, per the existing rule
    that a push always needs the designer's own words.
  - Verify section: added the `origin/main` commit-match check for the
    direct-push path; noted the PR path now opens as a draft.
- **`references/design-release.md`, `change-the-words.md`,
  `change-the-journey.md`, `fake-a-service.md`** — each had its own copy of
  "if you're not on `design/*` (or `handoff/*`), switch to one" gating the
  first edit. All four now read: stay on `main` or your own `design/*` /
  `handoff/*` branch; only someone else's branch forces a move.
- **`references/check-my-change.md`, `build-it-for-real.md`,
  `hand-off.md`** — smaller wording fixes so a file "belonging to the real
  service" is described as never editable "whether the designer is on
  `main` or a `design/*` branch", rather than singling out `design/*`.
- **`workflow/design-session.js`** (the crit-notes / multi-request batch
  workflow) — the `Prepare` phase forced a `design/<set>-<slug>` branch off
  any non-`design/*` branch, `main` included. Now it stays on `main` by
  default and only branches when the caller passes the new optional
  `keepOffMain: true` (documented in `meta.whenToUse` and
  `workflow/README.md`) — set by whoever launches the workflow when the
  designer already asked to keep the session off `main`. Someone else's
  stray `feat/*`/`chore/*` branch is still not a place to build on, so that
  case still forces a move onto `design/*`.

### Prototype repo (`trade-imports-plants-prototype`)

- **`AGENTS.md`** — the repo contract's own "Branches" section rewritten the
  same way as `ROUTING.md`'s (this repo has no docs of its own beyond
  `AGENTS.md`/`PROTOTYPE.md`/`docs/designers/`, so the same shift is made in
  both places designers or agents would read it). Rules 1 and 6 (never edit
  a real-service file "on a `design/*` branch") reworded to "while working
  in a design release — on `main` or a `design/*` branch alike": the
  ownership rule was never really about the branch name, it was about not
  being a maintainer/hand-off context, and that's unchanged.
- **`PROTOTYPE.md`** — "Deploying and merging" → "Deploying, sharing and
  merging": states plainly that `main` is not protected and a direct push is
  the default, with the branch+draft-PR route offered as the alternative.
  Trimmed elsewhere to stay under the repo's own 130-line cap for this file
  (`scripts/designer/suite.test.js`) — see Verified below.
- **`docs/designers/sharing-and-handing-off.md`** — "Sharing it with others"
  restructured around the same fork (`main` direct vs. draft PR on a
  branch); "Getting it merged" retitled "Getting a branch merged" and now
  opens with "skip this if you pushed straight to `main`". Quick reference
  table updated.
- **`docs/designers/your-first-hour.md`** step 10, **`research-sessions.md`**
  step 2 — both previously said saving always lands on "a branch of its own"
  and the only route to a merged `main` was a pull request. Now describe
  save-then-share as two steps, with `main` the direct route and a branch
  only on request.
- **`.claude/rules/ownership.md`, `designer-sets.md`, `templates.md`** — same
  "on a `design/*` branch" → "while working in a design release (`main` or
  `design/*`)" rewording as `AGENTS.md`, for the file-ownership invariants
  these rule files gate (which prototype-owned service folders can be
  edited, which template plumbing must never change). These are about *what*
  can be touched, not *which branch* — the invariant already held on `main`
  in the old model too (a designer was never meant to be there), and now
  needs to say so explicitly since `main` is a normal place to be.
- **`docs/repos/trade-imports-plants-prototype.md`** (workspace-level repo
  reference, not in the file list given but describes the same contract to
  any agent reading it) — two lines asserting design releases and designer
  changes "are made on a `design/<set>-<slug>` branch" corrected to say a
  branch is offered, never required.

### The `reportsUrl` → `siteUrl` rename (found mid-task, not originally in scope)

The CI half of this same effort (see sibling file `ci.md`) renamed
`scripts/designer/prototype.json`'s `reportsUrl` (base:
`.../reports/`) to `siteUrl` (base: the site root, `.../`), and changed the
link shape so the *merged* report lives at the site root and only the PR
report keeps a `reports/pr-<n>/` path. Its own notes flag the workspace repo
as "another builder's" and leave it untouched. Every workspace skill file
that told an agent to "read `reportsUrl`" or build a `<reportsUrl>main/...`
link would have been quietly wrong the moment that config key changed — so
this was fixed here as part of the same pass, since it's the same
"reports/main" pattern the task called out by name:

- `references/show-my-change.md`, `run-the-prototype.md`, `hand-off.md`,
  `research-session.md`, `share-my-change.md`, `raise-the-story.md`,
  `ROUTING.md` — every `reportsUrl`/`<reportsUrl>main/...`/`reports/main/`
  mention updated to `siteUrl` / `<siteUrl>#?q=...` (main) /
  `<siteUrl>reports/pr-<n>/#?q=...` (PR), matching
  `scripts/designer/handoff/story.js`'s `walkthroughLink()` exactly.

## Not touched

- `.github/workflows/*` — another builder's (see `ci.md`).
- `.claude/settings.json`, `.claude/settings.local.json`, anything under
  `.claude/hooks/` — never edited, per this task's guard rails.
- **`scripts/designer/hooks/guard-edit.js`** — read, not edited (it's the
  hook script `.claude/settings.json` would wire in as a PreToolUse guard
  for Edit/Write). Worth flagging: it is **not currently wired into
  `.claude/settings.json`** — there's no Edit/Write matcher there, only
  Read/UserPromptSubmit/Stop hooks — so it's dormant either way. But its own
  logic (`isDesignBranch`) only ever guards on a `design/*` branch and
  allows everything on "any other branch ... main" by comment/design. If
  this hook is ever wired in later, it will need the same broadening this
  pass gave the docs and rules — otherwise editing a real-service file on
  `main` would sail through unguarded while the same edit on `design/*`
  would be blocked, the opposite of what the ownership rules now say
  everywhere else. Flagging for whoever wires it up, not fixing now since
  it's inactive and touching hook scripts is outside this task's guard
  rails.
- `scripts/designer/save`, `scripts/designer/preflight` and the rest of
  `scripts/designer/` — checked (`grep -rn "on main|design/|currentBranch|
  branch"`) and found no branch-based blocking or nagging on `main` to
  begin with. Saving, checking and preflight already worked identically
  whatever branch you're on; only the *documentation* and the *workflow
  script* told agents to force a branch, which is what this pass fixed.
- `scripts/designer/lib/ownership.js` (`designer:where`) — takes no branch
  input at all; file-ownership answers are identical on `main` or any
  branch, so nothing there needed changing.
- `docs/designers/README.md`, `seeing-your-change.md` — no branch
  enforcement language found; their `reports/main` link fixes are the CI
  builder's (see `ci.md`).

## Verified

- `npm --prefix ~/git/defra/trade-imports-workspace/tim test -- src/skill-workflows/prototype`:
  221/221 passing (covers `design-session.js`'s prompt content, including
  the `prepare` phase's branch logic).
- `npm --prefix ~/git/defra/trade-imports-workspace/tim test`: full suite,
  1906/1906 passing.
- `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype test`:
  full suite, 3420/3420 passing (0 skipped-unexpectedly), after trimming
  `PROTOTYPE.md` back under its 130-line cap
  (`scripts/designer/suite.test.js`) — first run caught it at 139 lines,
  fixed by tightening the new "Deploying, sharing and merging" section
  rather than cutting content, confirmed at 129 lines on the rerun.
- `grep -rn "must be on a design|design/\* branch before|On any other branch"`
  across the touched skill/repo docs and rules: no hits left.
- `grep -rn "reportsUrl|reports/main"` across `.claude/skills/prototype/`:
  no hits left.
