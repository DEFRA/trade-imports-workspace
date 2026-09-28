# Designers work from the workspace: handover

Date: 28 September 2026. Both the workspace and
`repos/trade-imports-plants-prototype` are on branch
`feat/NO_JIRA-designer-prototyping`. Nothing has been pushed, merged or
raised in Jira.

## What this work is

The designer suite for the high-risk plants prototype was first built for a
designer who clones only the prototype repo, with no workspace, no `tim`, no
`tools/`, no stack and no Jira access. You changed that premise: designers
will do all their work from the workspace. This run rebuilt the suite on the
new premise.

A designer now opens Claude Code at `~/git/defra/trade-imports-workspace`,
says what they want in their own words, and gets:

- a change in the prototype that follows house conventions (stub services,
  clients, controllers, templates, `copy.en.js`/`copy.cy.js`, validation),
  without having to ask for them
- a Jira story raised through `tim`, after a dry run and their own yes
- a route to build it for real in `trade-imports-plants-frontend`

## The architecture, and why

**The workspace is where things are built. The prototype is where they
run.**

1. **One workspace skill, `prototype`, is the designer's front door**
   (`.claude/skills/prototype/`). Skills nested under the gitignored
   `repos/` never load from the workspace root (tested), so the 14 skills in
   the prototype repo were dead weight. They became reference files under the
   one skill, with a single routing table (`references/ROUTING.md`). One skill,
   not 14, so generic phrases like "add a page" cannot hijack developer
   requests.
2. **Routing is per person, not per phrase.** Designers rarely say "the
   prototype". `tim prototype setup` writes a designer note into a gitignored
   `CLAUDE.local.md` at the workspace root. With that note, every request goes
   to `prototype`. Without it, a request that only names a shared page ("the
   dashboard") gets one question: the prototype, or which service? The
   workspace `CLAUDE.md` routing index has the new row, and `frontend-change`
   and `ticket-creator` say "not for the prototype".
3. **House conventions are automatic.** `references/house-conventions.md`
   sets one order of authority: the real repo's own docs and recipes, then the
   nearest real code (plants-frontend, else INS frontend), then
   `docs/best-practices/`. Every skipped step is logged. Every reference that
   writes code reads its list first (services, controllers, templates, copy,
   doc comments, backend contracts). Before every save, two layers run:
   - checks that always give the same answer, in `designer:check` and the
     prototype's CI: new ESLint rules (route params validated, POST handlers
     call `validate()`, service barrels never import prototype plumbing),
     service shape and `contract.json`, copy parity and copy-key use across
     every set, and an advisory GOV.UK wording note
   - judgement checks: the existing `code-style` and `review` personas, reused
     through a new branch-keyed local mode (`<repo>:<branch>`), not copied.
     Fixes are applied quietly. The designer hears "tidied to house style (N
     changes)".
4. **Commands use one form only**: `npm --prefix ~/git/…/trade-imports-plants-prototype run …`
   and `git -C ~/git/…/trade-imports-plants-prototype …`. A bare `git` from
   the workspace root would act on the workspace repo. A `tim` test fails any
   reference or workflow prompt that uses another form.
5. **What goes in `tim`**: only things that cross repos or reach an outside
   service. That is the Jira write surface, workspace safety (the prototype is
   skipped by `tim workspace reset|branch|update` unless named), pinned-npm
   install, and `tim prototype setup`. The prototype's own `designer:*`
   scripts stay in the prototype, because its CI runs them and it never
   depends on `tim`.
6. **Runtime.** The prototype runs standalone: `npm run dev` on port 3103,
   stub data, stub sign-in, no stack. The stack is never needed to see a
   change. It deploys to CDP dev from its own Dockerfile, with
   `NODE_ENV=production`, stub data (`isStubDataMode`) and sign-in through the
   Defra ID stub. The INS "Address book" link works whenever the INS frontend
   runs, and is set by `TRADE_IMPORTS_INS_FRONTEND_URL` on dev.
7. **Branches.** The prototype's `design/<set>-<slug>` branches are exempt from
   the workspace's same-name rule (written into `CLAUDE.md` rule 2), because
   the prototype has no stack image. Real work from a hand-off uses one
   `feat/EUDPA-N-<slug>` name across plants-frontend, plants-backend, tests
   and the workspace's `openspec/`. `handoff/<slug>` branches were kept, for
   one purpose only: making a checked `upstream.patch` from the real journey's
   files. They are never merged in the prototype.

## Can the ticket-from-prototype use tim to create the ticket?

**Yes. It does now.** `tim jira` was read-only. This run added:

- `tim jira create --from ticket.json`: a dry run by default. It sends
  nothing and prints every field, every attachment with its size, warnings
  (placeholders, `[Welsh needed]`, over-long descriptions) and a `planId`.
- `tim jira create --from ticket.json --confirm <planId>`: creates the story,
  attaches every file, links `relates`, and writes `ticket.created.json`. It
  refuses a stale `planId` (the ticket changed since the dry run) and refuses
  to create twice from the same folder.
- `tim jira attach` and `tim jira link`: dry run unless `--confirm`.
- `tim jira epics`: lists open epics (read-only). It uses Jira's new
  `/rest/api/3/search/jql` endpoint. It was checked live and returns 24 EUDPA
  epics.

`designer:handoff` writes the `tim-ticket/1` manifest (`ticket.json`) beside
the brief. The `prototype` skill's `raise-the-story.md` always shows the dry
run in plain words, and creates only on the designer's own yes in their own
message, never while a placeholder remains. `designer:handoff -- status
--dir <folder>` then records the ticket and the `feat/EUDPA-N-<slug>` branch.
`ticket-creator` uses the same `tim jira create`, so there is one way to create
a ticket. `tools/jira/*.sh` stay, because the build loop uses them.

The client, commands and manifest have behavioural tests, with nock at the
network boundary: 13 test files and 281 tests (including the prototype
workflow tests) pass. No real ticket was created during this run.

## What changed

### Workspace (commits `2fcda32a`, `daa24c03`, plus the review fixes below)

- `.claude/skills/prototype/`: the new skill, its `references/` (routing, house
  conventions, conventions pass, raise the story, build it for real, and the
  moved designer references) and `workflow/` (`design-session.js`,
  `port-kit-page.js`, `prepare-handoff.js`, `wording-sweep.js`)
- `tim/src/clients/jira-client.js`, `tim/src/commands/jira/{create,attach,link,epics,manifest,plan,shared}.js`
  and their tests
- `tim/src/commands/prototype/setup.js`; `tim/src/commands/workspace/{reset,branch,update,install,setup}.js`;
  `tim/src/constants/repos.js`; `repos.json` (`workspaceBranchSync: false`
  and a fetch-only `upstream` remote for the prototype)
- `tim/src/skill-workflows/prototype/*.test.js`, including
  `prompt-hygiene.test.js`
- `.claude/skills/code-style/**`, `.claude/skills/review/**`,
  `tools/style/prepare-style-local.sh`, `tools/review/prepare-review-local.sh`
  and friends: branch-keyed local mode
- `.claude/skills/frontend-change/SKILL.md` (plants target),
  `.claude/skills/ticket-creator/SKILL.md` (on `tim jira create`),
  `tools/ticket/setup-branch.sh` (`feature/` becomes `feat/`)
- `CLAUDE.md`, `.gitignore` (`CLAUDE.local.md`), `docs/agent-onboarding.md`
  (a designers section), `docs/repos/trade-imports-plants-prototype.md`,
  `docs/reference/{tools-index,workflows,workareas}.md`,
  `docs/best-practices/gds/language.md` (hint text), `tim/README.md`,
  `.claude/workflows/README.md`
- Drafts for you: `settings-proposal.md` and `cdp-app-config-draft.md` beside
  this file

### Prototype (commits `de5671f`, `8fa51dd`, plus the review fixes below)

- Deleted: `.claude/skills/**`, `.claude/workflows/**`,
  `scripts/designer/hooks/settings-proposal.json`, and the prototype's copies
  of the GDS language, patterns, service design and styles guides (the
  workspace `gds/` wins)
- `AGENTS.md` (now a repo contract with one pointer to the workspace skill),
  `CLAUDE.md`, `PROTOTYPE.md`, `README.md`, `.claude/rules/**`,
  `docs/designers/**`, `handoffs/README.md`, `overrides.json`
- House conventions: `scripts/designer/eslint-rules/**`, `eslint.config.js`,
  `src/server/prototype-checks/{copy-usage,gds-wording,service-conformance}.js`,
  `scripts/designer/check/**`
- Services: every prototype-owned service
  (`transporters`, `templates`, `ins-address-book`, `notification-search`)
  now has a `contract.json` and no floating doc blocks. `ins-address-book`
  stops claiming to be a copy. The service scaffold's templates follow the
  house shape.
- `sample-journey`'s saved transporters were rebuilt in the per-page folder
  shape (`add/`, `delete/`, `list/`), with `lib/validate`, a
  `transporter-id-params.js` Joi object that returns not found, and a country
  select with ISO codes
- Hand-off: `scripts/designer/handoff/**` writes `ticket.json`, backend and
  platform notes, the branch in every repo, and standing rulings. It has the
  new `status` verb.
- Runtime: `src/config/config.js` (Defra ID redirects default to 3103),
  `.github/workflows/check-pull-request.yml` (a production boot job beside
  the Defra ID stub image, and a design release canary that runs
  `designer:check --full`), `src/server/prototype-sets/production-run.test.js`

### Fixed in this final review (not committed)

- `raise-the-story.md` step 6 called `designer:handoff --status "…"`, a flag
  that does not exist. It now calls the real verb,
  `designer:handoff -- status --dir handoffs/<folder>`, and no longer offers a
  by-hand fallback.
- `ROUTING.md` said `prepare-handoff.js` works on a prototype `handoff/*`
  branch. It builds in plants-frontend on `feat/EUDPA-N-<slug>` (route C1) or
  writes a DISTIL request (C2). Both places now say so.
- Workspace `CLAUDE.md`: the routing row's bare "demo" trigger could catch
  developer requests. It is now "demo the prototype", plus "any request from a
  designer". The `tim` block said `tim jira epics` is a dry run by default. It
  is read-only, so it now has its own line.
- Prototype `guard-edit.js` pointed designers to "the hand-off skill", which
  no longer exists. The message and its test were updated.
- Prototype `eslint.config.js` still ignored the deleted
  `.claude/workflows/`. The dead block is gone. `overrides.json`'s `patched`
  notes for `eslint.config.js` and `src/config/config.test.js` now describe
  what the prototype actually changes, so the weekly sync keeps them.
- A `suite.test.js` comment still mentioned "a designer with only this repo".
  It now says a CI checkout.
- The execute bit on `tools/style/prepare-style-local.sh` and
  `tools/review/prepare-review-local.sh` was **not** in the commit, although
  the trial-fix notes said it was staged. It is staged in the index now. The
  on-disk `chmod` is blocked by the guard hook (see below).

Checks after these fixes: prototype `lint:js` is clean; 24 prototype test
files and 404 tests pass (hooks, suite, lib, config, sync-upstream,
hand-off); 13 `tim` test files and 281 tests pass (jira and prototype
workflows).

Review results that needed no fix:

- no remaining no-workspace assumption in the skill, the prototype's docs,
  rules or scripts
- every file this run added in the prototype is covered by an `ours` line
- `ticket-creator` and `raise-the-story` share one creator
- the workspace and prototype docs agree on the stack, the port, branches and
  the INS link

## How the trials went (honest)

Four trials ran from the workspace root, in a designer's words, each on its
own prototype branch (`feat/NO_JIRA-designer-prototyping-ws-trial-T1…T4`).
**None was a clean pass.** Every problem they found was then fixed (2
blockers, 13 majors, 19 minors; see `trials/fixes.md`). **The trials have not
been re-run since the fixes.** Only T2's full report is on disk. T1, T3 and T4
are known only from `trials/fixes.md` and their branches.

- **T1, change a hint then raise a ticket: partial.** The wording change and
  the hand-off folder were made. It never reached the Jira dry run, for two
  reasons: `raise-the-story` stopped on story placeholders before showing the
  plan, and `tim jira epics` failed with a 410 (an old Jira search endpoint).
  Both are fixed, and `tim jira epics` now works live.
- **T2, a new "saved transporters" service: partial.** The agent routed
  correctly, read the reading list, reused the existing service rather than
  making a second one, and built pages with `validate()`, GOV.UK macros only,
  copy parity and `[Welsh needed]`. `designer:check --full` passed. Two
  problems: a fresh release failed `designer:check` before any change (false
  copy-usage and lint errors), and the judgement layer could not start because
  the scripts were not executable. The first is fixed and now guarded by a CI
  canary. The second is only half fixed until you run the `chmod` below.
- **T3, "the dashboard feels cluttered": partial.** There was no designer note
  in the session, so the vague request risked going to `frontend-change`.
  "Before" pictures failed on a release with no saved commit, and discarding
  a never-saved release failed. All three are fixed, and the "prototype, or
  which service?" question was added. **Whether `CLAUDE.local.md` loads in
  your Claude Code build is still unproven.**
- **T4, "make templates real": partial.** A release and a C2 hand-off (a DISTIL
  request) were made. Gaps: no path for a design with no hand-off yet, a worked
  example that failed the prototype's own lint, and no backend or platform
  conventions in the brief. All are fixed.

Verified after the fixes: a fresh release copied from the real journey passes
`designer:check --full` (all 12 steps, 3,337 unit tests), and the full `tim`
suite passed (151 files, 1,894 tests).

## What only you can do

1. Apply, or reject, the workspace settings proposals in
   `workareas/shared/designer-prototyping/workspace-adapt/settings-proposal.md`:
   - ask rules for `tools/jira` writes, `tim jira * --confirm*` and
     `git -C * push*` (check the build loop's unattended runs first)
   - the `PreToolUse` Edit guard for prototype files
   - the sonar push-gate `git -C` gap
2. Delete the prototype's own `.claude/settings.json`, and add it to
   `overrides.json` `deleted` if you agree. It does nothing from the workspace
   root and carries stale sonar hooks. Agents may not edit settings files.
3. Run `! chmod +x tools/style/prepare-style-local.sh tools/review/prepare-review-local.sh`
   in the workspace. The execute bit is staged in git, but the guard hook
   blocks an agent's on-disk `chmod`. Without it, the conventions pass's
   judgement layer falls back to its inline checklist.
4. Run a local docker build and boot of the prototype image
   (`NODE_ENV=production` with the Defra ID stub). This run cannot verify it.
   The new CI boot job first runs on the branch's PR.
5. CDP dev:
   - commit the prototype's cdp-app-config env from the local draft
     (`cdp-app-config-draft.md`)
   - deploy `trade-imports-defra-id-stub` to dev with the prototype's redirect
     URLs
   - pin the prototype to one instance, or use redis sessions
6. Choose the default Jira epic for design hand-offs
   (`scripts/designer/prototype.json` `handOff.parentEpic`; EUDPA-407
   "High-risk plants import notification journey" looks right) and confirm the
   'UCD' label. Until then the skill lists epics and asks.
7. Confirm two calls this plan made:
   - a designer session may cut a local `feat/EUDPA-N-<slug>` branch in
     plants-frontend on an explicit ask (never push)
   - each hand-off raises one story, and any later build-loop tickets link to
     it with Relates
8. Confirm that `CLAUDE.local.md` loads in your Claude Code build (trial T3 is
   the canary: run `tim prototype setup`, open a fresh root session, and say
   "the dashboard feels cluttered"). If it does not load, the designer note
   falls back to a line in each designer's `~/.claude/CLAUDE.md`.
9. Review and merge the workspace and prototype
   `feat/NO_JIRA-designer-prototyping` branches. Nothing is pushed or merged
   by this plan. This review's fixes are uncommitted in both repos, and the
   workspace has a staged mode change.
10. Pass two things to the plants team:
    - their `docs/services.md` says the backend URL comes from convict, but
      their code reads `process.env`
    - a proposal to upstream the prototype's link-address exemption into
      plants `copy-parity.test.js`
11. Optional tidy-up: delete the four `…-ws-trial-T*` branches in the
    prototype once you have looked at them. They are local only.
