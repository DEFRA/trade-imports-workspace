# Placement and routing: where the designer skills live when Claude Code runs at the workspace root

Lens: placement-and-routing. Date: 2026-09-28. Branch: feat/NO_JIRA-designer-prototyping (workspace and prototype).

## Recommendation in one line

Hybrid, weighted towards the workspace. The workspace owns the designer **agent layer**: one front-door skill, its steps files as `references/`, the four workflows, and a row in the CLAUDE.md routing index. The prototype keeps only its **repo contract**: a trimmed AGENTS.md/CLAUDE.md, its `.claude/rules/`, `scripts/designer/*` and `overrides.json`. Do not name the front door `design`, because that name is already taken in this Claude Code build.

## What Claude Code actually discovers from the workspace root (tested in this session)

| Thing | Discovered from a root session? | Evidence |
|---|---|---|
| Workspace `.claude/skills/*` | Yes, listed at start-up | the session skill list |
| `docs/.claude/skills/*` | Yes, listed a second time as `docs:<name>` | `docs/.claude -> ../.claude` symlink (commit eb8f0f44, explained in `docs/agent-skills.md:171-173`). That symlink is what produces the "docs:code-style" style entries. |
| `repos/<repo>/.claude/skills/*` | **No** | `repos/trade-imports-animals-tests/.claude/skills/playwright-cli` and all 14 prototype skills are missing from the list. `Skill("repos/trade-imports-plants-prototype:design")` and `Skill("trade-imports-plants-prototype:design")` both return "Unknown skill", even after reading a prototype file. `/repos/` is gitignored (`.gitignore`), and `docs/agent-skills.md:174-176` records that sub-repos are sandboxed off (#31905). |
| Nested `CLAUDE.md` in a sub-repo | **Yes, lazily**: it loads on the first Read of a file under that repo | Reading `repos/trade-imports-schemas/package.json` injected `repos/trade-imports-schemas/CLAUDE.md`. The prototype `CLAUDE.md` (which `@AGENTS.md`-imports) loads the same way, but only **after** a prototype file has been touched. That is too late to route the opening request. |
| Nested `.claude/rules/*.md` with `paths:` | **Yes**, with globs resolved relative to the sub-repo | Reading `repos/trade-imports-plants-prototype/src/server/app/services/transporters/index.js` fired the prototype's `.claude/rules/ownership.md` (its glob is repo-relative) and the workspace's `.claude/rules/node.md` (`**/*.js`). Both layers stack. |
| Nested `.claude/settings.json` / hooks | No. Only the root project's settings apply | The prototype's `.claude/settings.json` is upstream's sonar-hook copy (not in `ours`), and it is inert from root. The allowlist that governs designers is the workspace's `.claude/settings.json` (line 85: `Bash(npm --prefix ~/git/defra/trade-imports-workspace/*:*)`). |
| Nested `.claude/workflows/*.js` | Not listed. A launch by `scriptPath` still works | Workspace workflows appear in the skill list (`args-canary`, `designer-prototyping-suite`). The prototype's do not. |
| Skill name `design` | **Collides** | `Skill("design")` → "cannot be used with Skill tool due to disable-model-invocation". This skill is neither user-level (`~/.claude/skills`) nor from a plugin (`~/.claude/plugins`), so it is built in. A workspace `design` skill would clash with it. |

Also: the skill listing is already over its description budget. From `docs:frontend-change` onwards the `docs:*` entries arrive **without descriptions**. Adding 14 more skills at the root (duplicated again as `docs:*`, which makes 28 entries) would push more descriptions out, for developers and designers alike. That is the strongest argument against moving the 14 skills over one for one.

## So the current placement (b-as-is) is broken at the root

With a session at the workspace root:
- none of the 14 prototype skills can be invoked, and the `design` front door does not exist
- AGENTS.md routing loads only after the agent has already read a prototype file. The opening "I need a late-notifications dashboard" is routed by the **workspace** CLAUDE.md index, which has no designer row. It would most likely land on `frontend-change` ("add a page to the frontend"), which targets `trade-imports-animals-frontend` (`.claude/skills/frontend-change/SKILL.md:3,26`). That is the wrong repo, and it is not a design release.
- every steps file and every workflow prompt says bare `npm run designer:*` and uses repo-relative paths (`.claude/workflows/design-session.js:146,275,336-507`), which assume the cwd is the prototype. From the root, those commands fail. The workspace guard rails also require `npm --prefix ~/…` and `git -C ~/…`.

Option (b), "keep them in the prototype and add workspace routing", only works if the workspace CLAUDE.md row tells the agent to open `repos/trade-imports-plants-prototype/AGENTS.md` and each `.claude/skills/<x>/SKILL.md` by path, as plain files. It can be done (AGENTS.md was already written so it works "with or without skills"), but it leaves problems:
- no native skill trigger, so routing depends on one CLAUDE.md row
- the prototype carries 14 skills and 4 workflows in `ours`, which the weekly upstream sync has to protect
- the steps cannot cite workspace assets (frontend-change's standing constraints, ticket-creator, tim, docs/best-practices) without breaking the prototype's "self-contained" claim, which is now moot anyway

## Options compared

| | (a) Move all to workspace | (b) Keep in prototype + a routing row | (c) Hybrid (recommended) |
|---|---|---|---|
| Invocable from root | yes | only as files opened by path | yes (one front door) |
| Listing budget | +14 skills (x2 with docs symlink) | +0 | +1 skill (x2 unless the symlink goes) |
| Reuses workspace skills (frontend-change, ticket-creator, code-style, review, tim, best-practices) | natural | awkward cross-repo citation | natural |
| Repo-local rules still fire on prototype files | only if kept in the prototype | yes | yes (kept in the prototype) |
| Upstream-sync surface (`overrides.json` `ours`) | shrinks | unchanged (14 skills + 4 workflows) | shrinks |
| Non-Claude hosts / developer inside the repo | lose the repo rules | keep them | keep the trimmed AGENTS.md |
| Risk of hijacking developer requests | high (14 generic triggers: "add a page", "check my changes", "save my work", "raise a Jira") | low | low (one front door with a narrow trigger) |

## The recommended shape (c)

**Workspace (the agent layer, the BUILD side):**
1. One skill, e.g. `.claude/skills/prototype/SKILL.md` (not `design`, because of the built-in collision). Its description is keyed on the prototype and on designer vocabulary: "the prototype", "design release", "crit notes", "research round", "demo/playback", "hand this to the real team", "a service the real one lacks". Its `NOT for` clauses: the real plants-frontend or any other repo (use frontend-change or ticket), an EUDPA ticket (use ticket).
2. The 13 steps files become `.claude/skills/prototype/references/<name>.md`, not separate skills. AGENTS.md's routing tables (outcomes, phrases, two-skill combos) move into `references/ROUTING.md`, which stays the one routing source. That is the same model as today, relocated.
3. The workflows `design-session`, `wording-sweep`, `port-kit-page` and `prepare-handoff` move to the workspace `.claude/workflows/`, launched by `scriptPath` as the workspace README and memory already require. Every agent prompt uses `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:*` and `git -C …`. These are already allowlisted (`.claude/settings.json:85`).
4. The steps **cite** workspace house conventions and do not copy them:
   - frontend-change's "Standing constraints" and its verification ladder, for controllers and pages
   - `docs/best-practices/node/{code-style,hapi,nunjucks,govuk-frontend,testing/frontend}.md` and `doc-comments/jsdoc.md`. The `node.md`/`gds.md`/`copy.md` rules already auto-fire on prototype files.
   - the `services/<name>/{index,client,stub}.js` pattern, as today
   - `code-style` / `review` persona checklists as the self-check before "show it"
   - `ticket-creator` + `tools/jira/create-ticket.sh` / `attach-file.sh` (dry-run first) for the hand-off ticket, in place of paste-only
5. One new row in the CLAUDE.md skill routing index (section 4), plus one disambiguation line: a request that names the prototype, a design release or a `design/*` branch, or that comes from someone who says they are a designer, goes to `prototype`. Everything else keeps its current routing. Add a matching `NOT for the plants prototype` clause to `frontend-change`'s description.
6. A per-person designer signal, so designers never have to say "prototype". Candidate: `tim designer setup` (a deterministic step, in tim per `tim/CLAUDE.md`). It writes a one-line designer note to the person's user memory (`~/.claude/CLAUDE.md`), or to a gitignored `CLAUDE.local.md` at the root (this would need a `.gitignore` line). A canary should confirm which of the two Claude Code honours, and whether it is still supported.

**Prototype (the repo contract, the RUN/DEPLOY side, sync-safe):**
- AGENTS.md trimmed to the repo-local contract: what the repo is, load-bearing rules 1-5, 7-10 (ownership, frozen releases, en+cy together, toolbox, replayed examples, install, never-edit list, the prototype-owned services rule), branch names and the `designer:*` command list. It loads lazily (proven above) as the guard whenever a prototype file is touched. It still serves Codex/Cursor and a developer who opens Claude Code inside the repo. Its routing tables leave, replaced by one line: "designer requests are routed by the workspace `prototype` skill".
- `.claude/rules/*` stays. It fires from the root with repo-relative globs.
- `scripts/designer/*`, `overrides.json` and `docs/designers/` stay. They are repo-bound deterministic tools that also run in CI and CDP. Cross-repo steps (ticket creation, reading plants-frontend and openspec) belong in tim or tools, not here.
- `.claude/skills/**` and `.claude/workflows/**` leave, and their `ours` lines are removed from `overrides.json`.

**Branch parity:** designer work lives on `design/<set>-<slug>` in the prototype only. The workspace checkout stays on `main` for a designer, who only reads it, so there is nothing to keep in parity. A hand-off that becomes real work uses one `feat/EUDPA-XXXX-<slug>` name across plants-frontend, the tests repo and the workspace (openspec), per CLAUDE.md rule 2. The prototype's `handoff/<slug>` branch is a staging branch and never pairs with those.

## Side finding

The `docs/.claude` symlink doubles every workspace skill in the listing and is already costing descriptions. It exists only for sessions launched from `docs/`. Retiring it, or replacing it with an instruction to launch from the root, is worth a separate decision. It matters more once designers, who never launch from `docs/`, share the root.

## Open checks (canary before the fan-out)

1. Pick the front-door name and confirm it is free: try `Skill("<name>")` before creating it.
2. Confirm that user memory or `CLAUDE.local.md` routes a designer phrase ("add a question about pallets") to `prototype` and not to `frontend-change`, in a fresh root session.
3. Confirm the moved workflows run from the root with `npm --prefix` and `git -C` and raise no permission prompts.
