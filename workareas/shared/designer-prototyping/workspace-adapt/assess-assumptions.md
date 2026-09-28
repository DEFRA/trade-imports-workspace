# Assess: "no workspace" assumptions in the plants-prototype designer suite

Lens: assumptions. The premise has changed. Designers now open Claude Code at the
workspace root (`~/git/defra/trade-imports-workspace`) and have tim, tools/, the stack,
openspec/, docs/best-practices/, the workspace skills and `repos/trade-imports-plants-frontend`.
The prototype still runs on its own stubs (`npm run dev`, no stack) and deploys to CDP dev
from its own Dockerfile.

Every path below is relative to `repos/trade-imports-plants-prototype/` unless it starts
with `~/` or names the workspace.

Verdicts: **KEEP** (still true), **CHANGE** (rewrite for the workspace), **DELETE**.

---

## 0. Evidence that changes everything (read first)

1. **The prototype's skills are invisible from the workspace root.** This session runs at
   the workspace root. Its skill listing has the workspace skills and the `docs:*` scoped
   skills (docs/ is tracked), but none of the 14 prototype skills (`design`, `hand-off`,
   `fake-a-service` ...). `repos/` is gitignored (`~/git/defra/trade-imports-workspace/.gitignore:67`
   `/repos/`), and nested `.claude/skills` under an ignored folder are not discovered.
   So everything that says "the `design` skill", "say 'use the design skill'" or
   "Claude Code loads the skills" is false for a designer at the workspace root.
2. **The prototype's `.claude/settings.json` does not apply.** Claude Code reads settings
   from the project dir, which is the workspace root. The Sonar hook scripts that are
   missing (and cause the "missing hook script" message) never run. The workspace
   settings.json, its allowlist and its `guard-bash.sh` / `guard-edits.sh` hooks run instead.
   Neither the prototype's current settings nor `scripts/designer/hooks/settings-proposal.json`
   will ever be loaded for a designer.
3. **The prototype's `.claude/rules/*.md` probably do not load.** Their `paths:` globs are
   repo-relative (`src/server/app/sets/**`). From the workspace root they would have to
   match `repos/trade-imports-plants-prototype/src/...`. Not verified in-session. Check it
   with a canary before relying on it either way. The workspace rules `~/.claude/rules/node.md`,
   `gds.md` and `copy.md` use `**/` globs, so they already fire on prototype files. That is
   the house-conventions hook the user wants, and today it works only by accident.
4. **The cwd is the workspace root, not the prototype root.** Every command block in the suite
   is `npm run designer:*`, `npm run dev` or bare `git ...`. Workspace guard rails forbid `cd`.
   So every command has to become `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run ...`
   and `git -C ~/.../repos/trade-imports-plants-prototype ...`.
   Concrete bug: `scripts/designer/where/cli.js:72` resolves relative paths against
   `INIT_CWD ?? process.cwd()`. Under `npm --prefix` from the workspace root, INIT_CWD is
   the workspace root. So `designer:where -- src/server/app/sets/x/set.js` returns "outside
   this repo" instead of the real owner. Rule 1 ("ask whose file it is") silently breaks.
   `scripts/designer/show/run.js:99` (`--reference` image path) has the same issue, but
   there it is correct: an image path the designer gives *is* relative to their cwd.
5. **The upstream remote is already there.** `git -C repos/trade-imports-plants-prototype remote -v`
   shows `upstream https://github.com/DEFRA/trade-imports-plants-frontend.git` (fetch) and
   `DISABLED` (push). The "a fresh clone has no upstream remote" steps are now a no-op
   on a workspace checkout.
6. **`tools/jira/create-ticket.sh` has no dry-run** (see its options, lines 6-12). `tim jira`
   is read-only (`ticket`, `comments`). A ticket raised from a hand-off needs a creating
   surface with `--dry-run`, and the guard rails require it.
7. **The real INS link works when INS runs.** `repos/trade-imports-plants-frontend/src/server/app/docs/services.md:62`
   says the header link is `tradeImportsInsFrontend.baseUrl` / `TRADE_IMPORTS_INS_FRONTEND_URL`,
   default `http://localhost:3002`. So "the Address book link goes nowhere" is only true when
   the INS frontend is not running. In the workspace it can run (stack or `tim docker`). On
   CDP dev it is an environment variable.

---

## 1. Top-level routing files

| Where | What it assumes | Verdict | Becomes |
|---|---|---|---|
| `AGENTS.md:3-7` "every coding agent in this repo: Claude Code, Cursor, Codex, Copilot … nothing here depends on skills being loaded" | The designer's agent opens in the prototype folder, and might not be Claude Code | CHANGE | The designer's agent is Claude Code at the workspace root. Keep AGENTS.md as the single routing source, but make the workspace reach it: add a designer row to the workspace `CLAUDE.md` skill routing index, and put the designer front door where the workspace can discover it (see finding 0.1). Keep "works without skills" as the fallback: it is the reason routing survives the skills being invisible. Drop Cursor, Codex and Copilot as named hosts (keep one generic line at most). |
| `AGENTS.md:9` and `PROTOTYPE.md:39` "say 'use the design skill'" | The `design` skill loads | CHANGE | From the workspace root it does not load (0.1). Either promote the designer front door to a workspace skill (`~/.claude/skills/design/` or `prototype-design/`, with the triggers in the workspace CLAUDE.md index), or make the escape phrase point at AGENTS.md by path. |
| `AGENTS.md:37` rule 7 "One shell command per call" / install via the preflight command | Standalone shell | KEEP + CHANGE | The rule matches workspace policy, so keep it. Change the command form to `npm --prefix ~/…/repos/trade-imports-plants-prototype run …`. The `npx --yes npm@11.6.2 ci` install is denied by workspace guard rails (no npx), so it needs a workspace allowlist entry or an npm script wrapper (see the settings proposal). |
| `AGENTS.md:40` rule 10 "Never edit `.claude/settings.json`" | The prototype's own settings matter | CHANGE | The prototype's settings.json is irrelevant at runtime (0.2). The rule now protects the workspace's `.claude/settings*.json` and `.claude/hooks/**`, which `guard-edits.sh` already enforces. Say that. |
| `AGENTS.md:117-128` Workflows, "How to launch them in Claude Code is in CLAUDE.md" | scriptPath `.claude/workflows/design-session.js` is resolved against the prototype root | CHANGE | From the workspace root that path resolves to `~/.claude/workflows/`. Use the full tilde path or a repo-rooted path. Also every agent step inside `design-session.js` (lines 275, 336-342, 391-393, 461-507), `port-kit-page.js`, `wording-sweep.js` and `prepare-handoff.js` runs bare `npm run …`. Workflow agents' cwd is reset to the workspace root, so each needs `npm --prefix` / `git -C` (workspace memory: no `cd` in workflow agent steps). |
| `AGENTS.md:130-136` branches `design/<set>-<slug>`, `handoff/<slug>`, `maintain/<slug>` | Only the prototype repo is involved | CHANGE (partly) | `design/*` stays: it is prototype-only work, with no cross-repo counterpart. `handoff/<slug>` crosses repos (the same change goes to plants-frontend). Workspace rule 2 wants `feat/EUDPA-XXXX-slug` with the same name in every affected repo. Once the ticket exists, the plants-frontend branch is `feat/EUDPA-N-slug`, and the prototype's route-2 branch should carry the same name. `scripts/designer/handoff/cli.js:336` already proposes `feat/EUDPA-XXXX-${slug}`: fill in the real number once the ticket is raised. `maintain/*` should become `chore/NO_JIRA-…` or `chore/EUDPA-…` to match workspace naming (the current trial branch is already `feat/NO_JIRA-designer-prototyping`). |
| `AGENTS.md:156` "Run every npm run and git command from the repo root … if your shell is somewhere else use --prefix / -C" | The shell is usually at the prototype root | CHANGE | Invert it. The shell is always at the workspace root, so `--prefix` / `-C` is the only form. Rewrite every command block in AGENTS.md, the skills and the docs, or add one line of indirection (see the recommendation on a `tim prototype` / `tim designer` pass-through). |
| `AGENTS.md:162` "Claude Code loads them for you; other hosts read them by hand" (rules) | Nested `.claude/rules` load | CHANGE | Probably false from the workspace root (0.3). Verify with a canary. If they do not load, move the path-scoped prototype rules into the workspace `.claude/rules/` with `repos/trade-imports-plants-prototype/...` globs (or `**/sets/**` guarded by prose), next to the existing `node.md`, `gds.md` and `copy.md`. |
| `CLAUDE.md:15-17` "A missing hook script" | The prototype settings.json is loaded | DELETE | It never loads at the workspace root (0.2). The message cannot appear, and "there is no automatic edit guard" is replaced by the proposal below. |
| `CLAUDE.md:7-9` launching a workflow by scriptPath | Relative to the prototype | CHANGE | Use the full path (see the Workflows row). |
| `PROTOTYPE.md:15` "Open Claude Code in this folder" | Opened in the prototype | CHANGE | "Open Claude Code in the trade-imports workspace (`~/git/defra/trade-imports-workspace`)". |
| `PROTOTYPE.md:42-46` "Using Cursor or another assistant" | A non-Claude host | DELETE | Designers work from the workspace in Claude Code. |
| `PROTOTYPE.md:48-51` missing hook script | As CLAUDE.md | DELETE | |
| `PROTOTYPE.md:69-70` "The Address book link goes nowhere … a separate service this prototype does not run" | No INS anywhere | CHANGE | Say that with `npm run dev` alone the link goes to `localhost:3002`, which only answers when the workspace's INS frontend runs (`tim docker` / stack, or `make start-ins-frontend`), and that on CDP dev `TRADE_IMPORTS_INS_FRONTEND_URL` decides it. Or point it at the prototype's own `ins-address-book` pages when there is no INS. The prototype must still never *need* the stack. |
| `PROTOTYPE.md:83-85` "It is not deployed yet … run demos from a laptop with `npm run dev`" | No deployment | KEEP until deployed, then CHANGE | Once the CDP dev deployment exists, point at it. Keep `npm run dev` / `designer:fresh` as the local path. |
| `PROTOTYPE.md:90-93` deployed sign-in via the Defra ID stub | Correct | KEEP | Also say the workspace can run the same Defra ID stub locally (`repos/trade-imports-defra-id-stub`) to rehearse the deployed sign-in, optionally. |

## 2. Skills (`.claude/skills/**`)

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| All 14 skills: invocation by the host | Discovered in the prototype | CHANGE | Invisible from the workspace root (0.1). The choices are (a) move or duplicate them into the workspace `.claude/skills/` with a `prototype-` prefix and add them to the workspace CLAUDE.md index, or (b) keep them in the prototype as steps files that one workspace front-door skill routes to by absolute path. (b) keeps the prototype sync-safe (`ours`) and needs a single workspace skill, so it is the simpler fit for "AGENTS.md is the single routing source". |
| Every skill's `npm run designer:*`, `npm run dev`, `npm test`, `npm run lint`, `git …` blocks (for example `run-the-prototype/SKILL.md:44,82,114,121,187,200,225`, `fake-a-service/SKILL.md:96,103,214,221,247,276,286,290,297,304`, `hand-off/SKILL.md:165-185,196,209,221,272-280`) | cwd = prototype root | CHANGE | Use the `npm --prefix …` / `git -C …` form, or a tim pass-through. |
| `run-the-prototype/SKILL.md:22-25` install with `npx --yes npm@11.6.2 ci` | npx is allowed | CHANGE | Workspace guard rails ban npx. Needs a workspace allowlist line or a wrapper script (proposal). |
| `run-the-prototype/SKILL.md:100-101` "If npm says Missing script designer:preflight, the designer tools are not on this branch" | The designer is on an arbitrary clone or branch | KEEP | Still possible if the prototype checkout is on `main` before the merge. |
| `run-the-prototype/SKILL.md:127-142` step 2.4 "Real service for hand-offs (a fresh clone has no upstream remote)" | Fresh standalone clone | CHANGE | The workspace checkout already has it (0.5). Keep the check as a no-op safety net, but word it as "the workspace set this up". Better: make `make setup` / `repos.json` own the upstream remote for the prototype (a `"upstream"` field), so the prototype does not need `git remote add` in its allowlist. |
| `run-the-prototype/SKILL.md:144-147` git name and email, `gh` | Designer's own machine | KEEP | The workspace onboarding (`docs/agent-onboarding.md`) already covers `GITHUB_TOKEN` and `gh`. Link to it. |
| `run-the-prototype/SKILL.md:152-179` port 3103, never kill | Standalone | KEEP | Also note that the stack's plants-frontend is on 3003 (`Makefile:221`) and the prototype on 3103, so both can run at once. Add a line: the stack is never needed to see a change. |
| `run-the-prototype/SKILL.md:264-270` stub sign-in URL | Correct | KEEP | |
| `hand-off/SKILL.md:3,11,288-292,397-404` "an EUDPA story ready to paste into Jira", "Paste the Summary line into Jira" | No Jira tooling | CHANGE | Designers at the workspace root have `tools/jira/create-ticket.sh`, `attach-file.sh`, `link-tickets.sh` and the `ticket-creator` skill. The hand-off should *create* the story, with the designer's yes: draft to `workareas/ticket-creation/<slug>/draft.md` (ticket-creator's contract), run a dry-run, then create, attach `upstream.patch` and the screenshots, and write the key back into the brief's status lines. Keep paste as the fallback when `JIRA_TOKEN` is not set. **Blocker:** create-ticket.sh has no `--dry-run` (0.6), and tim jira is read-only. Sam asked "can it use the tim stuff": add `tim jira create` / `tim jira attach` (library-first, nock-tested, `--dry-run`, `--json`), then have both ticket-creator and hand-off call it. |
| `hand-off/SKILL.md:41-44,160-191` add, lock and fetch the upstream remote, "a fresh git clone of the prototype has no upstream" | Standalone clone | CHANGE | The remote exists (0.5). Also, `repos/trade-imports-plants-frontend` is right there, so the patch can be checked against `upstream/main` (keep this: the sibling checkout may be mid-spike, per workspace memory) *and* the brief can cite real files by workspace path. |
| `hand-off/SKILL.md:291-296` "A developer applies the patch in their own clone of trade-imports-plants-frontend … an agent using the workspace's ticket or frontend-change skill" | The developer is elsewhere | CHANGE | The implementing agent is in the same workspace. Route 3, new: "make it real now" means the workspace `ticket` skill (once raised) or `frontend-change` against `repos/trade-imports-plants-frontend` on `feat/EUDPA-N-slug`, then spec-catchup / spec-cover for `openspec/specs/plants`. Note that `frontend-change` names only animals-frontend as its target today (`~/.claude/skills/frontend-change/SKILL.md:3,26,31`). It needs a plants target (the journey-builder targets.json has `high-risk-plants-frontend`). The real repo stays READ-ONLY for this run; say so. |
| `hand-off/SKILL.md:411-416` "Without the designer scripts … node scripts/designer/handoff/cli.js" | No npm script | CHANGE | `node` is banned by workspace guard rails. Drop it, or wrap it. |
| `fake-a-service/SKILL.md` (whole) and `references/fake-a-service.md` | House conventions live only inside the prototype | CHANGE | The skill never cites the workspace house conventions. Add a mandatory "read first" step: `~/…/docs/best-practices/node/code-style.md`, `hapi.md`, `testing/frontend.md`, `doc-comments/jsdoc.md`, and `repos/trade-imports-plants-frontend/src/server/app/docs/services.md` (the real run-mode and services contract), plus the real `countries/` and `ports/` `{index,client,stub}.js` as exemplars (read-only). After the change, run the `code-style` and `review` skills' checks, in their review mode, on the new files. The designer never asks for it. |
| `fake-a-service/references/address-book-pages.md:8-21` "a copy of the INS frontend's own address book service (DEFRA/trade-imports-ins-frontend …)" and `src/server/app/services/ins-address-book/index.js:8-13` | INS code seen from GitHub | CHANGE | It is at `repos/trade-imports-ins-frontend/src/server/app/services/address-book/` and `repos/trade-imports-address-book` (the API contract). Tell the agent to diff against those before changing `ins-address-book`, so the copy does not drift. A deterministic drift check belongs in tim (`tim prototype drift ins-address-book --json`). |
| `fake-a-service/references/service-home.md:10-13,79-91` ins-frontend / ins-backend read model | Unseen | CHANGE | Point at `repos/trade-imports-ins-frontend` and `repos/trade-imports-ins-backend`, and at `docs/repos/architecture-overview.md`. |
| `change-the-journey/references/routes.md:90,98` cites `src/server/app/docs/validation.md` (the prototype's copy) | Only prototype docs | KEEP + CHANGE | Keep the copy (synced weekly). Also point at the workspace `docs/best-practices/node/nunjucks.md`, `govuk-frontend.md` and `gds/`, and at openspec `specs/plants` for requirement wording. |
| `change-the-words/SKILL.md:518`, `port-a-kit-page/SKILL.md:97` "On a host without the Workflow tool (Cursor, for example)" | Cursor | CHANGE | Keep the manual fallback, drop Cursor. |
| `port-a-kit-page/references/find-the-old-page.md:8-31` `designer:kit find` searches beside the prototype and the home folder, "Never clone the old prototype yourself" | Standalone | KEEP + CHANGE | Still valid. Also search `~/git/defra/` and consider listing `GB-notification-service` in the workspace `repos.json` (read-only, `dockerStack: null`), so it is always at `repos/GB-notification-service`. `scripts/designer/kit/kit.js:19-22` SEARCH_DEPTH 3 from home already reaches `~/git/defra/x`. |
| `share-my-change/SKILL.md:198` "Open this link, paste the title" (no gh) | No gh | KEEP | A fallback. The workspace has `GITHUB_TOKEN` / `tim github`, so the preferred route could be `tim github` once it can open a PR (it cannot today). |
| `match-the-design`, `docs/designers/gov-uk/*` | See §4 | | |

## 3. Workflows (`.claude/workflows/**`)

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| `README.md:91-93` "Cursor and other agents cannot run these scripts" | Cursor | CHANGE | Drop Cursor. Keep the no-Workflow-tool fallback. |
| `design-session.js`, `prepare-handoff.js`, `port-kit-page.js`, `wording-sweep.js`: every `Run: npm run …` in the agent prompts | Agent cwd = prototype | CHANGE | Workflow agents start at the workspace root with cwd reset per call. Add a GUARD RAILS block (workspace memory: subagents spam permission prompts) and use `npm --prefix` / `git -C` throughout. `args-contract.test.js` can assert this: no bare `npm run` in any prompt string. |
| `prepare-handoff.js:481` "Never fill in the story's placeholders yourself" | | KEEP | |
| Launch location | Prototype `.claude/workflows/` | CHANGE | From the workspace root the Workflow tool resolves scriptPath against the workspace. Launch by absolute tilde path. Consider mirroring a thin launcher into the workspace `.claude/workflows/` (workspace memory: launch by scriptPath, never by name). |

## 4. docs/designers/**

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| `README.md:6` "Open Claude Code (or Cursor) in the prototype's folder" | Prototype folder | CHANGE | Workspace root. |
| `README.md:77-91` "For maintainers: how requests are routed … Every agent (Claude Code, Cursor, Codex, Copilot)" | Multi-host, skills in prototype | CHANGE | Describe the workspace front door, and that the prototype skills are steps files reached by path. |
| `your-first-hour.md:15-53` "Before you start": git clone the prototype, Cursor, `gh` optional, "You do not need … other services, passwords or environment variables" | Standalone clone | CHANGE | Step 3 becomes "clone the workspace to `~/git/defra/trade-imports-workspace` and run its setup" (workspace `docs/agent-onboarding.md`, canonical path rule 1), which clones `repos/trade-imports-plants-prototype`. Keep "you need no database or other services to *run* the prototype": that is still true and load-bearing. Add that Jira and GitHub credentials (`JIRA_*`, `GITHUB_TOKEN`) let Claude raise the story for you. Drop Cursor. |
| `your-first-hour.md:62` "A terminal open in the prototype's folder. Every command below runs there." | cwd | CHANGE | Claude runs them from the workspace. The commands shown for "do it yourself" can keep the `cd repos/trade-imports-plants-prototype` form for a human's own terminal. |
| `your-first-hour.md:128-130` "`npm start` … needs a Defra ID sign-in service" | No stub | CHANGE | Add: the workspace has the Defra ID stub (`repos/trade-imports-defra-id-stub`, part of the stack) if you want to rehearse the deployed sign-in. Optional, never required. |
| `where-changes-go.md:133-134` "Address book link goes nowhere" | No INS | CHANGE | As PROTOTYPE.md. |
| `where-changes-go.md:183`, `glossary.md:75`, `sharing-and-handing-off.md:58,123,169,178-184` "ready to paste into Jira", "Raise the story in the EUDPA Jira project and send its link" | Paste only | CHANGE | "Claude raises the story for you (after you say yes) and attaches the patch and pictures. Or, without Jira access, paste it." Keep who to send it to. |
| `sharing-and-handing-off.md:109-112` "when they set up the link to it on your computer, they lock its send address on purpose" | The skill sets up upstream | CHANGE | The workspace sets it up. Keep "nothing is ever sent to the real service". |
| `sharing-and-handing-off.md:171-174` "a developer applies the patch in their own copy" | Remote developer | CHANGE | Add the in-workspace route (frontend-change / ticket on plants-frontend). |
| `working-through-notes.md:55` "In Cursor or another assistant" | Cursor | DELETE | Or reduce it to "without the Workflow tool". |
| `docs/designers/gov-uk/*` "Each page stands alone: you do not need anything outside this repo" (`gov-uk/README.md:3-5`) | No workspace | CHANGE | These are near-duplicates of `~/…/docs/best-practices/gds/` (the diff shows the same filenames, with different text; the workspace also has `writing.md`, which the prototype lacks). Two sources will drift. Keep the prototype-specific ones (`templates-in-this-prototype.md`, `design-gaps.md`) and the designer-register summaries if they add value, but make the agent's source of truth the workspace `gds/` (the workspace `gds.md` / `copy.md` rules already point there). State which wins on conflict: the workspace one. |
| `recipes/*.md` | Prototype-only recipes | KEEP + CHANGE | Designer-register recipes are fine. Each should cite the real plants-frontend recipe or platform doc it mirrors (`repos/trade-imports-plants-frontend/src/server/app/docs/*.md`, e.g. `flow-and-gates.md`, `validation.md`), so the agent checks it against the source, not a paraphrase. |
| `services-and-dashboards.md:115-124,170-179` INS ownership notes | Seen from GitHub | CHANGE | Cite the workspace repos and `docs/repos/architecture-overview.md`. |

## 5. scripts/designer/** (code, comments, messages)

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| `suite.test.js:433-446` test "no designer file points outside this repo" (forbids `trade-imports-workspace`, `tim `, `tools/`, `openspec`, `~/git/defra`) | Hard rule: never reference the workspace | CHANGE (invert) | This test now enforces the wrong premise. Delete it, or invert it into "designer-facing files that name workspace paths use the canonical tilde form and point at files that exist". It will block every change in this list until it is changed. |
| `where/cli.js:72` `cwd = INIT_CWD ?? process.cwd()` | Invoked from the prototype root | CHANGE (bug) | Under `npm --prefix` from the workspace, relative repo paths resolve against the workspace root and get "outside" (0.4). Fix: when a relative path does not exist under cwd but does under REPO_ROOT, use REPO_ROOT. Or accept `repos/trade-imports-plants-prototype/…` workspace-relative paths as well. Add a behavioural test for both. |
| `hooks/guard-edit.js` + `hooks/settings-proposal.json` | Hooked from the prototype settings.json | CHANGE | The guard is reusable as-is: `REPO_ROOT` comes from the script location, and `ownershipOf` returns "outside" (allow) for non-prototype paths. So a workspace PreToolUse Edit hook can run `node ~/…/repos/trade-imports-plants-prototype/scripts/designer/hooks/guard-edit.js`. Two gaps. (1) `OPEN_BRANCH_PREFIXES = ['handoff/', 'maintain/']` (line 24) blocks real-service files on the `feat/*` and `chore/*` branches a workspace maintainer uses. Add `feat/`/`chore/`/`fix/`, or better, key on "not `design/*`". (2) The proposal targets the prototype's settings.json, which never loads. Rewrite it as a proposal for the **workspace** settings.json (in `workareas/shared/designer-prototyping/workspace-adapt/settings-proposal.md`, per guard rails). Its allowlist becomes `npm --prefix ~/…/repos/trade-imports-plants-prototype run designer:*` and similar. Leave the prototype's own settings.json as upstream's copy (it is inert for designers), or add it to `ours` as a plain `{}` only if a standalone use survives. |
| `preflight/checks.js:221-251` `checkUpstreamRemote` "A fresh clone has no upstream remote" | Standalone clone | KEEP (as a safety net) + CHANGE (message) | On a workspace checkout it reports OK. Reword the message to say the workspace setup normally does this. |
| `preflight/checks.js:256-307` gh / push checks | | KEEP | Could also accept `GITHUB_TOKEN` (workspace onboarding) as the sign-in. |
| `preflight` generally | Checks only the prototype | CHANGE | Add a check that it is run inside the canonical workspace (`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype`), that `repos/trade-imports-plants-frontend` exists (for hand-off impact), and whether `JIRA_*` is set (story creation). All of these are "Before you share", never blocking `npm run dev`. |
| `handoff/build.js:478-510` `workspaceSpecDir` = `path.resolve(root, '../..', 'openspec/specs/plants')`, "when the workspace is there to look in" | Workspace optional | CHANGE | The workspace is always there now. Resolve it as `~/git/defra/trade-imports-workspace/openspec/specs/plants` (the canonical path), not `../..` (fragile), and treat a missing one as an error rather than silently skipping. Use `tim spec gaps --json` / `tim spec lint` for spec impact rather than a grep of spec.md files (library-first, per tim/CLAUDE.md). |
| `handoff/brief.js:340-351` "Run it on your own computer: git clone <prototype>, cd, npm run dev" | The reader has no workspace | CHANGE | The reader (a developer or agent) is in the workspace: `git -C ~/…/repos/trade-imports-plants-prototype switch <branch>`, then `npm --prefix … run dev`. Keep the clone form as a second line for outsiders. |
| `handoff/brief.js:631-632,938,947` "in a clone of trade-imports-plants-frontend" | Remote dev | CHANGE | "in `repos/trade-imports-plants-frontend` on `feat/EUDPA-N-slug`". |
| `handoff/brief.js:643` "In the trade-imports workspace, an agent can make it with the frontend-change skill … ticket skill" | The workspace is elsewhere | KEEP (wording) + CHANGE | Now the primary route. Also name `spec-catchup` / `spec-cover` for openspec, and `code-style` / `review` before the PR. |
| `handoff/brief.js:767,772`, `handoff/cli.js:433` "Files under openspec/ are in the trade-imports workspace, not in plants-frontend" | | KEEP | Still accurate and useful. |
| `handoff/story.js:282-290` `AGENT_SKILLS` "when the workspace is there to look in" | Optional | CHANGE | Drop "when … there". |
| `handoff/cli.js:336` branch `feat/EUDPA-XXXX-${slug}` | No ticket number | CHANGE | Fill in the number once `tim jira create` returns it (re-run the brief with `--ticket EUDPA-N`). Keep the prototype's route-2 branch name in parity (workspace rule 2). |
| `handoff/handoff.e2e.test.js:57-58` "Present on a workspace checkout, absent in CI" | | KEEP | Correct: CI has no workspace, designers do. |
| `kit/kit.test.js:33` fake home `git/workspace/repos/plants-prototype` | Test fixture | KEEP | |
| `service/templates/*.tmpl` (index, client, stub, test) | Conventions encoded only here | KEEP + CHANGE | Check them against `docs/best-practices/node/code-style.md`, `doc-comments/jsdoc.md` and `testing/frontend.md` (mock at the network boundary with nock, behaviour not implementation). Note the real plants-frontend switches with `isStubMode()` (`services.md:8-10`), while the template uses the patched `isStubDataMode()`. That is correct for the prototype, but the brief must say a developer swaps it back. Also, the real `address-book` has no `stub.js` (only index and client), so "the real services' index/client/stub shape" is true for countries and ports only. Say so. |
| `prototype.json:3,8` `cloneUrl`s | | KEEP | Used for messages and fallbacks. |
| Deterministic designer steps in `scripts/designer/*` vs tim | Self-contained on purpose | CHANGE (partly) | Workspace convention: deterministic steps belong in tim. Things that must run on CDP or in the prototype's CI (the sync, seeding, the check tiers, the guard) stay in the prototype. Things only a workspace agent runs (Jira create/attach, INS drift, openspec impact, cross-repo patch check against plants-frontend, branch-parity checks) should be tim commands with `--json`. The prototype scripts call nothing in tim, which keeps the prototype sync-safe and CI-safe. |

## 6. overrides.json

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| `deleted: .claude/hooks/sonar-secrets/**, .claude/sonar-analyze.sh, .mcp.json` while `.claude/settings.json` (upstream's copy, which calls them) stays synced | The prototype settings matter | KEEP | Harmless now: it never loads at the workspace root. The settings-proposal plan to put `.claude/settings.json` in `ours` becomes optional. Prefer leaving it synced (less divergence). |
| `deleted: scripts/check-workspace-stack.js` | The prototype never uses the stack | KEEP | The prototype must not depend on the stack. |
| `patched: README.md` "workspace-stack sections trimmed" | No workspace | CHANGE | `README.md:173-174,234-238` still mention the workspace stack. Decide whether to keep a short "from the workspace" section; it is now true for everyone who touches it. |
| `ours: .claude/skills/*`, `.claude/rules/**`, `.claude/workflows/**`, `AGENTS.md`, `CLAUDE.md` | Skills live in the prototype | KEEP or CHANGE, depending on the placement decision | If the front door moves into the workspace, these can stay in `ours` as steps files. If they move wholesale, remove their `ours` lines, and `suite.test.js` "a new skill needs a row in AGENTS.md and its own line in ours" changes with them. |
| `patched: src/config/config.js` "default port 3103" | | KEEP | No clash with the stack's plants-frontend on 3003. |
| `patched: Dockerfile` "default port 3103" | | KEEP | Verify it runs with `isStubDataMode()` in production and signs in via the Defra ID stub (another lens's job). |

## 7. handoffs/README.md

| Where | Assumes | Verdict | Becomes |
|---|---|---|---|
| `:8` "a story ready to paste into Jira" | Paste | CHANGE | "raised in Jira for you, or ready to paste". |
| `:34-47` "Who to send it to … Paste the Summary line … attach … A developer who wants it now can apply upstream.patch in their own clone … In the trade-imports workspace, an agent can build it" | The designer has no Jira tools; the workspace is elsewhere | CHANGE | Lead with: Claude raises it (after a dry-run and the designer's yes) with `tim jira create` or `tools/jira/create-ticket.sh`, attaches the patch and screenshots, then links it. Building it for real is `ticket` / `frontend-change` in the same workspace on `feat/EUDPA-N-slug`. Keep paste as the fallback. |
| `:49-60` "Keeping track … Claude adds these lines" | Manual | CHANGE | Filled in automatically from the create result (`Ticket:`), and later from `tim github prs EUDPA-N` (`Merged in plants-frontend:`). |

## 8. Workspace-side items this lens found (outside the prototype)

- `~/git/defra/trade-imports-workspace/CLAUDE.md` skill routing index has no designer or prototype row. It is load-bearing, and a workspace-root designer session routes from it first. It needs a row with designer-language triggers ("change the wording on the prototype", "hand this to the real team", "demo on Thursday", "prototype" ...).
- The workspace `CLAUDE.md` repo map describes the prototype sync as "`git fetch upstream` then `git merge upstream/main`". That contradicts the prototype's `scripts/sync-upstream/**` + `overrides.json` sync, which a plain merge would bypass. Change it to name `npm run sync:upstream`.
- `~/git/defra/trade-imports-workspace/docs/repos/trade-imports-plants-prototype.md:9` still says "the repo is NOT cloned … Unclear from code". It is stale. Rewrite it from the prototype's README, PROTOTYPE.md and overrides.json.
- `repos.json:92-97` has no `upstream` field. Adding one (and teaching `make setup` / `tim workspace` to add a fetch-only upstream with `DISABLED` push) moves the remote set-up out of the designer flow.
- `~/.claude/skills/frontend-change` names only animals-frontend as its target. The hand-off's "build it properly" route needs a plants target.
- `tools/jira/create-ticket.sh` has no dry-run and `tim jira` cannot create, so the "ticket-from-prototype via tim" that Sam asked for needs `tim jira create|attach|link` with `--dry-run`.
- Workspace `.claude/rules/node.md`, `gds.md` and `copy.md` already fire on prototype files from the workspace root (`**/` globs). They are the automatic house-conventions path. Consider a `prototype.md` rule scoped to `repos/trade-imports-plants-prototype/**` that says which prototype rules override them (for example `'[Welsh needed] …'` placeholders versus the workspace copy-parity rule that "a translated value differs from its English").

## 9. What stays exactly as it is (the standalone runtime)

- `npm run dev` / `designer:fresh` / port 3103 / stub sign-in / `isStubDataMode()` patches: the prototype must run with no stack. Keep "you need no database or other services" (to run).
- The Dockerfile and CDP deploy path: sync-safe, no workspace dependency. The prototype's CI (`check-pull-request.yml`) has no workspace, so every `scripts/designer/*` test must keep passing without one. `handoff.e2e.test.js` already skips when the sibling is absent: keep that pattern for every new workspace-aware code path (degrade, never fail, in CI; fail loudly at the workspace root).
- Plain-English, never-name-a-skill, run-it-yourself rules (`AGENTS.md:11-18`).
