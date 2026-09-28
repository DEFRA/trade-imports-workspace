# Designer prototyping, workspace-first: plan

Date: 2026-09-28. Branch `feat/NO_JIRA-designer-prototyping` in the workspace and in
`repos/trade-imports-plants-prototype`. Inputs: the five `assess-*.md` files beside
this plan. This plan replaces the "designer clones only the prototype" premise.

## 1. The premise, in one paragraph

Designers open Claude Code at `~/git/defra/trade-imports-workspace`. The workspace is
where things are **built**: the agent reads the real plants-frontend, its recipes, the
backends' controllers and contracts, `openspec/`, `docs/best-practices/`, and uses the
workspace skills, `tim` and `tools/`. The prototype is where things **run**: `npm run dev`
on its own stubs, no docker stack, and a CDP dev deploy from its own Dockerfile. The
designer never names a skill, and never asks for house conventions: every stub service,
client, controller, template, copy file and test the agent writes follows them anyway.

## 2. Architecture decisions (the calls, and why)

### D1. One workspace front-door skill, `prototype`; the prototype keeps only its repo contract

- Nested `.claude/skills/` under the gitignored `repos/` never load from the workspace
  root (tested: `Skill('repos/trade-imports-plants-prototype:design')` is unknown). So the
  14 prototype skills are dead weight for a workspace-root designer.
- The agent layer moves to the workspace as **one** skill,
  `.claude/skills/prototype/` (name probed free: `Skill('prototype')` is unknown; `design`
  collides with a built-in). The 13 steps files become `references/<name>.md`; the
  `AGENTS.md` outcomes and phrase tables become `references/ROUTING.md`, the single
  routing source; the four workflows move to `.claude/skills/prototype/workflow/` (the
  requirements-pipeline pattern), so `tim`'s workflow-contract test covers them.
- Rejected: moving 14 skills one for one (listing budget is already exceeded, the
  `docs/.claude` symlink doubles every entry, and generic triggers like "add a page" or
  "save my work" would hijack developer requests). Rejected: leaving them in the
  prototype and opening them by path from a CLAUDE.md row (fragile, not invocable).
- The prototype keeps: a trimmed `AGENTS.md` (repo contract: ownership, `ours`, the
  GOV.UK toolbox, Welsh markers, branches; plus one pointer to the workspace skill),
  `CLAUDE.md` (`@AGENTS.md`), `.claude/rules/` (verified: nested `paths:` rules **do**
  fire from the root and stack with the workspace rules), `scripts/designer/`,
  `docs/designers/`, `overrides.json`. The `ours` lines for `.claude/skills/**` and
  `.claude/workflows/**` go, which shrinks the sync surface.

### D2. Routing without hijack: a CLAUDE.md row plus a per-person designer note

- New row in the workspace `CLAUDE.md` skill routing index for `prototype`, with
  triggers "the prototype", "my design release", "design/… branch", "crit notes",
  "research session", "demo", "hand this to the real team", "make this real", and a
  one-line disambiguation: *a request about pages, words, examples or journeys goes to
  `prototype` when the person is a designer (see `CLAUDE.local.md`) or names the
  prototype or a design release; otherwise the developer skills apply.*
- `frontend-change` and `ticket-creator` descriptions gain "NOT for the plants prototype
  or a design release (use `prototype`)".
- Designers never say "prototype", so the signal is per person:
  `tim prototype setup` writes a marker block into a gitignored root `CLAUDE.local.md`
  ("You are working with a designer. Route every request through the `prototype` skill
  unless they name a real repo."). Canary: trial T3 runs in a fresh root session. If
  `CLAUDE.local.md` does not load in the current Claude Code build, the fallback is an
  `@~/git/defra/trade-imports-workspace/…/designer-note.md` import line the setup offers
  to add to the designer's `~/.claude/CLAUDE.md`, with their yes.

### D3. Commands: the tilde `--prefix` / `-C` form is the only form

Every command in every reference, workflow prompt and designer doc becomes
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:<x> -- …`
and `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype …`.
Both are already allowlisted (`.claude/settings.json` lines 83, 85). Bare `git` from the
root would act on the **workspace** repo, which is the most dangerous failure here. A
test in `tim` asserts no workflow prompt or reference contains a bare `npm run`, a bare
`git ` command, `npx`, or `node scripts/`. Workflows launch by
`scriptPath: '.claude/skills/prototype/workflow/<name>.js'`.

### D4. What goes in tim, what stays in the prototype

- **Stays in the prototype** (runs in the prototype's CI or needs its internals):
  `designer:where|check|preflight|show|release|examples|words|research|handoff|kit|save|format|fresh|service`.
  No `tim design …` wrappers: they would be spawn-wrappers that add a second surface to
  drift. The prototype never imports tim.
- **Goes into tim** (crosses repos or reaches an outside service, workspace only):
  1. `tim jira create|attach|link|epics`: the Jira write surface Sam asked for.
  2. Workspace safety: `repos.json` `workspaceBranchSync: false` on the prototype, so
     `tim workspace reset|branch|update` skip it unless named.
  3. `tim workspace install --repo <name>` honouring `packageManager`'s pinned npm, and
     `tim workspace setup` owning the prototype's fetch-only `upstream` remote from
     `repos.json`.
  4. `tim prototype setup`: the designer note (D2), upstream remote check, install, and a
     `tim auth` readiness summary, `--json`.
- **Not built:** `tim prototype drift` (a prototype test that diffs against the sibling
  checkout does the same job and runs in `npm test`), a `tim scaffold service` (the
  scaffold is prototype-only; its templates are fixed to the house shape instead).

### D5. The hand-off raises the story itself, dry run first

- `designer:handoff` also writes `ticket.json` (schema `tim-ticket/1`: project, type
  Story, summary, `descriptionFile`, parent, labels `['UCD']`, priority, attachments,
  relates) and `ticket.description.jira.txt` (no Summary line, no "(attach …)"
  suffixes), and adds `story.ready` to `report.json`.
- `tim jira create --from ticket.json` is a **dry run by default**: zero requests, prints
  the plan (fields, attachments with sizes, warnings for placeholders like
  `[Who is this for?`, `[Welsh needed]`, `EUDPA-XXXX`, and descriptions over 32,767
  characters) and a `planId` (sha256 of the payload plus attachment hashes). A real
  create needs `--confirm <planId>` and exits 2 if the plan changed. It creates, attaches
  every file, links `relates`, then writes `ticket.created.json` and refuses to create
  from that manifest again. Consent is bound to the exact payload, because nothing in the
  allowlist stops `tim:*`.
- The hand-off reference runs: stop while placeholders remain → `tim auth --json` (no
  Jira → today's paste flow) → epic from `prototype.json` `handOff.parentEpic`, else
  `tim jira epics --json` → dry run, plan in plain words → one yes/no, a yes only from
  the designer's own message → `--confirm` → record `Ticket: EUDPA-N` and the branch
  `feat/EUDPA-N-<slug>` in `brief.md` status lines → `designer:save`.
- `ticket-creator` Step 5 switches to the same manifest and `tim jira create`, so there is
  one creator. `tools/jira/*.sh` stay (the build loop uses them).
- Call recorded: **one story per hand-off**; any build-loop tickets later link `Relates`
  to it (Sam may overrule, see for_sam).

### D6. The route onward to the real thing

The brief's primary route is "build it properly in `repos/trade-imports-plants-frontend`
on `feat/EUDPA-N-<slug>`". The re-targeted `prepare-handoff` workflow:

- **C1** (words, or up to three frontend-only elements): records plants-frontend's current
  branch; requires a clean checkout; `switch -c feat/EUDPA-N-<slug> origin/main`;
  `git apply --3way` the upstream-ready part of `upstream.patch` as a starting point; then
  `frontend-change` once per element with the `high-risk-plants-frontend` target profile
  (recipes, convention tests, copy parity, fit/axe specs, `lint:arch`); the plants ladder;
  spec delta written as `openspec.patch` in the hand-off folder (never switch the
  workspace's branch under a running session); commit locally; switch plants-frontend
  back; quote `tim workspace branch` parity. Never pushes, never opens a PR, never merges.
- **C2** (a new service, four or more elements, or a clash with a standing ruling such as
  plants' removed transporter service): writes a `requirements-pipeline` DISTIL request
  with the hand-off folder, the design branch, `repo:plants-frontend`,
  `repo:plants-backend` and `openspec/specs/plants` as sources. A designer session
  **never** launches BUILD.
- Both support `dryRun: true`: print the branch names across repos, the recipe per
  element, the target profile and the parity check, touching nothing. Trials use it.
- The prototype's `handoff/*` branches retire. `tools/ticket/setup-branch.sh` is fixed
  (`feature/` → `feat/`) so the `ticket` skill cannot drift from the hand-off's names.

### D7. Branch naming and parity

- Prototype `design/<set>-<slug>` stays: prototype-only, `dockerStack: null`, exempt from
  rule 2 (said in the workspace `CLAUDE.md`).
- Real work: one name, `feat/EUDPA-N-<slug>` (or `feat/NO_JIRA-<slug>` without Jira),
  across plants-frontend, plants-backend, tests and the workspace (openspec).
- `maintain/<slug>` → `chore/NO_JIRA-<slug>` or `chore/EUDPA-N-<slug>`.
- `guard-edit.js` opens on "not `design/*`" instead of a two-prefix allowlist.

### D8. House conventions are automatic

- **Ladder** (written once in `references/house-conventions.md`, cited everywhere):
  1. the target repo's own docs and recipes where they agree with its code;
  2. the nearest real exemplar's code (plants-frontend, else INS frontend);
  3. `docs/best-practices/**`;
  4. every skip of a higher rung is one line in the release's `design-gaps.md` or the brief.
- **Read-first step** in every code-producing reference (fake-a-service, change-the-journey,
  change-the-words, match-the-design, port-a-kit-page, example-data): the artefact's
  reading list (services → plants `app/docs/services.md`, set `docs/services.md`, INS
  `services/address-book/`, `docs/best-practices/rest-api/rest-api.md`, the owning
  backend's controller/OpenAPI; controllers → plants `docs/validation.md`,
  `node/hapi.md` §3, INS `add.controller.js` + `address-id-params.js`; templates →
  `node/nunjucks.md`, `node/govuk-frontend.md`, `gds/*`; copy → `gds/language.md`,
  `gds/writing.md`, plants `copy-parity.test.js`; doc comments → `doc-comments/jsdoc.md`).
  The workspace `gds/` is the source of truth; the prototype's `docs/designers/gov-uk/*`
  keeps only prototype-specific pages and says the workspace wins.
- **Conventions pass before every save**, two layers:
  1. deterministic, in `designer:check` (runs in the prototype's CI too): custom ESLint
     rules (`{param}` routes validate params; release POST handlers call `validate(`;
     service `index.js`/`client.js` never import `prototype-support`), service
     conformance (barrel shape, `contract.json` valid, no floating module doc block),
     copy checks over **every** set (owned `copy.en.js`/`copy.cy.js`, every `copy.<key>`
     read exists), and an advisory GDS wording pass (never fails, the designer's words win);
  2. judgement: the existing `code-style` `STYLE_FILE_REVIEWER`/`STYLE_IMPLEMENTOR` and
     `review` `FILE_REVIEWER` personas, reused (never copied) through a new
     **branch-keyed local mode** (`<repo>:<branch>`, state under
     `workareas/code-style-reviews/local/…` and `workareas/reviews/local/…`), with the
     bundle from `tim backlog standards --files trade-imports-plants-prototype:<path> --json`.
     FIX items are applied silently and re-checked; the designer hears "tidied to house
     style (N changes)" and only what changes what they see.
- **Fix the deviations already on the branch** (H1–H5, M3–M6, L1 from
  `assess-house-conventions.md`): `CONTRACT`/`NEEDS_A_REAL_SERVICE` → `contract.json`;
  no floating doc blocks; `??` not `||`; no mutation in loops; `ins-address-book` stops
  claiming to be a copy and gains a shape-drift test against the sibling INS checkout;
  `saved-transporters` rebuilt in the per-page folder shape with `lib/validate`, an
  `…IdParams` Joi object with `failAction → notFound`, and the house address pattern
  (country select, ISO code); transporter vocabulary moves into the release.
- **Kept deliberately** (recorded in `house-conventions.md`): barrels keep
  `isStubDataMode()`, because on CDP dev a prototype-owned service has no backend and must
  serve stub data; the hand-off's existing rewrite to `isStubMode()` produces the real
  shape, and the "copy unchanged" claim is corrected to say so. Clients read
  `process.env` for the backend URL (rung 2 beats rung 3: plants' real code does), and the
  plants docs-vs-code conflict goes to the plants team. Per-client HTTP helpers stay
  inlined (the real plants address-book client inlines too; each folder must lift alone).
  Design releases stay test-free; the hand-off's C1 writes the tests through the recipes.

### D9. Runtime and deploy

- Standalone stays: `npm run dev` / `designer:fresh` on 3103, stub sign-in,
  `isStubDataMode`, "no database or services needed to run". Every mention of the stack
  gains one line: the stack is never needed to see a change.
- Patched `config.js`: `DEFRA_ID_REDIRECT_URL` and `DEFRA_ID_SIGN_OUT_REDIRECT_URL` default
  to 3103, not 3003.
- `check-pull-request.yml` (ours) gains a boot job: build the image, run it with
  `NODE_ENV=production` beside `defradigital/trade-imports-defra-id-stub`, check
  `/health`, `/` → sign-in, a stub sign-in to the chooser, one release page and one
  example link. `production-run.test.js` extends to the chooser, `sample-journey` and a
  prototype-owned service.
- INS address-book link: it works whenever the INS frontend runs (stack, `tim docker`,
  `make start-ins-frontend`), is set by `TRADE_IMPORTS_INS_FRONTEND_URL` on CDP dev, and
  is never needed to see a change.

## 3. Change list (disjoint ownership)

| id | repo | order | title |
|---|---|---|---|
| W1 | workspace | 1 | tim jira write surface (create, attach, link, epics) |
| W2 | workspace | 1 | tim workspace safety, pinned install, `tim prototype setup` |
| W3 | workspace | 1 | code-style and review: branch-keyed local mode and designer-output routing |
| W4 | workspace | 1 | The `prototype` front-door skill, references and workflows |
| W5 | workspace | 2 | frontend-change plants target, ticket-creator on tim, setup-branch parity |
| W6 | workspace | 3 | Workspace docs, routing index and tim README |
| W7 | workspace | 1 | Drafts for Sam: settings proposal and cdp-app-config |
| P1 | prototype | 2 | Prototype repo contract and designer docs, workspace-first |
| P2 | prototype | 1 | Designer scripts: workspace-aware where, preflight, guard and suite test |
| P3 | prototype | 2 | Hand-off evidence: ticket manifest, real-repo route, parity branch |
| P4 | prototype | 1 | House conventions in services, scaffold, worked example and checks |
| P5 | prototype | 1 | Runtime and deploy: redirect defaults and a boot check in CI |

Order: wave 1 = W1, W2, W3, W4, W7, P2, P4, P5. Wave 2 = W5 (needs W1), P1 (needs W4's
skill path and P4's decisions), P3 (needs W1's manifest schema and P4's `contract.json`).
Wave 3 = W6 (documents everything).

Full specs and acceptance are in the structured plan returned with this file (and
repeated per change below in brief).

- **W1** owns `tim/src/clients/jira-client.js` (+test), `tim/src/commands/jira/**`,
  `tim/src/test-support/fixtures/jira/**`, `tim/CLAUDE.md`,
  `tim/.claude/rules/client-patterns.md`.
- **W2** owns `repos.json`, `tim/src/constants/repos.js` (+test),
  `tim/src/commands/workspace/{reset,branch,update,install,setup}.js` (+tests),
  `tim/src/commands/prototype/**`, `tim/src/cli.js`.
- **W3** owns `.claude/skills/code-style/**`, `.claude/skills/review/**`, `tools/style/**`,
  `tools/review/**`, `tim/src/backlog/standards.routing-golden.test.js`.
- **W4** owns `.claude/skills/prototype/**`, `tim/src/skill-workflows/prototype/**`.
- **W5** owns `.claude/skills/frontend-change/**`, `.claude/skills/ticket-creator/**`,
  `tools/ticket-creator/**`, `tools/ticket/setup-branch.sh`.
- **W6** owns `CLAUDE.md`, `docs/reference/**`, `docs/repos/trade-imports-plants-prototype.md`,
  `docs/agent-onboarding.md`, `.claude/workflows/README.md`, `tim/README.md`, `.gitignore`.
- **W7** owns `workareas/shared/designer-prototyping/workspace-adapt/settings-proposal.md`,
  `workareas/shared/designer-prototyping/workspace-adapt/cdp-app-config-draft.md`.
- **P1** owns `AGENTS.md`, `CLAUDE.md`, `PROTOTYPE.md`, `README.md`, `overrides.json`,
  `package.json`, `.claude/skills/**` (delete), `.claude/workflows/**` (delete),
  `.claude/rules/**`, `docs/designers/**`.
- **P2** owns `scripts/designer/{where,lib,preflight,hooks}/**`,
  `scripts/designer/suite.test.js`, `scripts/designer/prototype.json`.
- **P3** owns `scripts/designer/handoff/**` except `contract.js`/`contract.test.js`, and
  `handoffs/**`.
- **P4** owns `src/server/app/services/{transporters,templates,notification-search,ins-address-book}/**`,
  `scripts/designer/service/**`, `scripts/designer/check/**`,
  `scripts/designer/handoff/contract.js`, `scripts/designer/handoff/contract.test.js`,
  `scripts/designer/eslint-rules/**`, `eslint.config.js`, `src/server/prototype-checks/**`,
  `src/server/app/sets/sample-journey/**`.
- **P5** owns `src/config/config.js`, `src/config/config.test.js`,
  `.github/workflows/check-pull-request.yml`, `src/server/prototype-sets/production-run.test.js`.

## 4. Trials (workspace root, designer words)

- **T1 change + ticket**: "On the arrival date question, change the hint to 'Use the date
  on your booking confirmation'. Then raise a ticket for the devs so it goes into the real
  service." Must stop at a dry run of the Jira create.
- **T2 new service**: "Importers keep re-typing the same transporters. Let them save the
  ones they use a lot and pick one when they fill in a notification." Judged for house
  conventions against `docs/best-practices`.
- **T3 vague**: "The dashboard feels cluttered. Can you make it easier to find the ones I
  need to do something about?"
- **T4 make it real**: "The saved templates idea tested really well in research. Can we
  make it real and start building it on the real service?"

Success criteria are in the structured plan.

## 5. For Sam

See the structured plan's `for_sam`: settings proposals (W7), the prototype's inert
`.claude/settings.json`, a local docker build and boot, CDP config and instance count,
the default hand-off epic, the plants-frontend local-branch permission, the one-story
call, the push-gate gap, merges, and two plants-team hand-offs.
