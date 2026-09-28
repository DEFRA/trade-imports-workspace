# Assessment: prototype to story to the real service ("handoff-to-real")

This lens covers the path from a designer's change in the plants prototype to a
story in Jira and then to the change built in the real plants frontend (and the
plants backend when the change needs a new service). The new premise is that
designers work from the workspace root. That means the real repos, the
workspace skills, `tim`, `tools/` and `openspec/` are all within reach.

Pinned HEADs, read on 2026-09-28:

- workspace `27ec04a2` (branch `feat/NO_JIRA-designer-prototyping`)
- `repos/trade-imports-plants-prototype` `801f61a` (same branch)
- `repos/trade-imports-plants-frontend` `357d0ce` (`main`, read only)

Nothing here was changed in any repo. This file is the only thing written.

## 1. What the hand-off does today

| Piece | What it does | Evidence |
|---|---|---|
| `hand-off` skill | Writes `handoffs/<date>-<slug>/` with `brief.jira.txt`, `brief.md`, `upstream.patch`, `report.json` and `screenshots/`. Route 1 writes the folder from a design release. Route 2 applies the ready part to the prototype's **own copy** of `high-risk-plants` on a `handoff/<slug>` branch **inside the prototype**. | `repos/trade-imports-plants-prototype/.claude/skills/hand-off/SKILL.md:8-27, 147-156, 299-348` |
| Jira | Paste only. The designer pastes `brief.jira.txt` into a new EUDPA story and attaches the patch and screenshots by hand. | `hand-off/SKILL.md:286-297, 395-404`; `handoffs/README.md:36-45`; `scripts/designer/prototype.json:11-12` |
| `prepare-handoff` workflow | Dry run → triage (judge) → `git switch -c handoff/<slug> main` in the prototype → `git apply --3way` → pinned-test updates → `npm test`, lint, `test:fit:features` **in the prototype** → `designer:show` → two commits → switch back. It never pushes. | `repos/trade-imports-plants-prototype/.claude/workflows/prepare-handoff.js:159-166, 363-378, 389-445, 474-513` |
| `upstream.patch` | The change in plants-frontend paths. Checked with `git apply --check` against the prototype's copy and, once fetched, against `upstream/main` (GitHub, push `DISABLED`). Prototype-owned service `index.js`/`client.js` travel as "proposed", with `isStubDataMode` rewritten to `isStubMode`. | `scripts/designer/handoff/cli.js:357-362`; `scripts/designer/handoff/contract.js:119-179`; `git remote -v` shows `upstream … DISABLED (push)` |
| Service contract | `CONTRACT` in the service's `index.js` (owner, `baseUrlEnv`, operations with method and path, record fields, examples, open questions) becomes a "Service to build" section with open questions such as which backend owns the data. | `scripts/designer/handoff/brief.js:253-265, 508-617`; `src/server/app/services/transporters/index.js:20-60` |
| Pointer for an implementer | One paragraph: start from the patch, follow the recipe, "an agent can make it with the frontend-change skill … or the ticket skill once it has an EUDPA number", update `openspec/specs/plants`. | `scripts/designer/handoff/brief.js:624-645` |
| Branch name | Suggested only, as `feat/EUDPA-XXXX-<slug>`. | `scripts/designer/handoff/cli.js:336` |

The refinement round's assessment (`refinement/assess-prototype-to-ticket.md`)
closed the story-shape gaps. The one gap it left open on purpose was "nothing
creates the ticket" (`refinement/README.md:180`). That was because designers
were assumed to have no workspace and no Jira credentials. That assumption no
longer holds.

## 2. What the new premise changes

1. **The real repo is right there.** Route 2 today proves the change against a
   *copy* of the real journey inside the prototype, on a branch that can never
   be merged anywhere. `prepare-handoff.js:512` says so: "Never merge
   `handoff/<slug>` into the prototype's main". With
   `repos/trade-imports-plants-frontend` in reach, that copy-proof is a detour.
   The same work can start on a real branch in the real repo, using the real
   recipes and the real verification ladder. The workspace build loop already
   has this target:
   `tools/journey-builder/targets.json` → `high-risk-plants-frontend`
   (`implementorSkill: frontend-change`, `verify.unit: test:high-risk-plants`,
   `repos.backend: repos/trade-imports-plants-backend`).
2. **The ticket can be created, not pasted.** `tools/jira/create-ticket.sh`,
   `attach-file.sh` and `link-tickets.sh` exist, and the `ticket-creator` skill
   drives them. `tim jira` is read only: `tim/src/commands/jira/index.js:26-54`
   registers only `ticket` and `comments`, and
   `tim/src/clients/jira-client.js` has only `whoami`, `getTicket` and
   `getComments`.
3. **At the workspace root nothing prompts before outward-facing actions.**
   `.claude/settings.json:63-64` allows `Bash(~/…/tools/**)`, which includes
   `tools/jira/create-ticket.sh`. Line 88 allows `Bash(tim:*)` and line 83
   allows `Bash(git -C ~/git/defra/trade-imports-workspace/*:*)`, which
   includes `git -C … push`. Only force-push is denied (lines 51-52). There is
   no sonar pre-push hook for plants-frontend: it is not one of the eight
   sonar-integrated repos in the workspace `CLAUDE.md`. So consent has to come
   from the skill's own gates, and a `tim` create command must not create
   anything by default.
4. **Two routing tables now compete.** At the workspace root, "raise a ticket"
   matches `ticket-creator` in the workspace `CLAUDE.md` routing index. That
   skill runs a serial GDS interview and knows nothing about the prototype's
   evidence. Meanwhile "raise a Jira" / "a ticket for the devs" match the
   prototype's `hand-off` row (`AGENTS.md`, Phrases). The workspace index is
   load-bearing, so the prototype-to-story route needs a row there, and
   `ticket-creator` needs a "NOT for a prototype change" clause.
5. **Branch parity now applies.** Once a story exists, the real work spans up
   to four repos: plants-frontend, plants-backend (new service), the workspace
   (the `openspec/` spec sync that `frontend-change` Step 5 writes) and the
   tests repo when E2E is touched. All four must use one name:
   `feat/EUDPA-N-<slug>` (workspace `CLAUDE.md` rule 2). The stack's
   `--branch` probe (`scripts/stack/run-stack.sh -b`) only picks up both the
   frontend and backend images when the names match.

## 3. Redesigned path

```
design release (prototype, design/<set>-<slug>)
   │
   ▼  A. EVIDENCE: prototype script, deterministic, unchanged core
npm --prefix ~/…/trade-imports-plants-prototype run designer:handoff -- … --json
   │     brief.md, brief.jira.txt, upstream.patch, report.json, screenshots/
   ▼  B. STORY: workspace, the designer's words only, designer confirms
workareas/ticket-creation/<slug>/draft.md  (ticket-creator's draft shape)
   │     "raise it" ─► tim handoff raise <folder> --epic EUDPA-E   (dry run by default)
   │                    = tim jira create + attach (patch, screenshots) + link
   │     no credentials ─► paste fallback (today's brief.jira.txt, unchanged)
   ▼  C. START THE REAL WORK: only when asked; never pushes, never merges
   ├─ C1 words, or up to 3 frontend-only elements:
   │     prepare-handoff (re-targeted) in repos/trade-imports-plants-frontend
   │     on feat/EUDPA-N-<slug>: git apply --3way upstream.patch, then
   │     frontend-change once per element (target profile high-risk-plants-frontend),
   │     ladder green, commits stay local
   └─ C2 new service, or 4+ elements, or a clash with a ruling:
         requirements-pipeline DISTIL with the hand-off folder as a source
         → workareas/shared/handoffs/<slug>/backlog.json (full-stack rows)
         → STOP. BUILD is launched by Sam or a developer, never from a designer session
   ▼  D. AFTER THE REAL TEAM MERGES
prototype: take the service's line out of `ours` → weekly sync brings the real one →
retire or refresh the design release; update the hand-off's status lines
```

### A. Evidence stays in the prototype

`scripts/designer/handoff/*` knows the prototype's internals: sets,
`overrides.json`, copy modules, `prototype-support`, `CONTRACT`. It is
prototype-owned code with its own behavioural tests (`handoff.e2e.test.js`,
`brief.test.js` and others). Moving it into `tim` would couple `tim` to one
repo's layout. Keep it where it is, and call it from the workspace with
`npm --prefix`. That form is already allowed (`.claude/settings.json:85`).

Two small changes:

- `report.json` gains `story.ready` (no placeholders and criteria not draft),
  so stage B can refuse a story that is not ready without re-parsing the
  brief.
- The apply check should also run against the workspace's plants-frontend
  `origin/main`, read only (`git -C ~/…/repos/trade-imports-plants-frontend fetch origin`
  and then `git … apply --check` against that ref's tree). This is in addition
  to the prototype's `upstream/main` check. Never check against the working
  checkout, because `repos/` checkouts are often mid-spike.

### B. The story is created through tim, with a dry run first

Sam asked: "can the ticket-from-prototype use the tim stuff to create the
ticket?" Yes. But `tim` needs write commands first, and they must follow
`tim/CLAUDE.md`:

- Use the library-first `jira-client`. Never shell out to `create-ticket.sh`.
- Mock at the network boundary with undici `MockAgent`.
- Ship code and test together, with `--json` and GDS plain English.

Proposed surface:

| Command | Does | Safety |
|---|---|---|
| `tim jira create --type Story --summary … --description-file … [--parent EUDPA-E] [--label …] [--priority …]` | Mirrors `tools/jira/create-ticket.sh:5-19` | **Dry run by default**: prints the exact REST payload and `would create`. It creates only with `--yes`. Exit 2 on bad input before any network call (`tim/.claude/rules/cli-patterns.md`). |
| `tim jira attach <key> <file…>` | Mirrors `attach-file.sh` | Dry run by default. Refuses a filename the issue already has, because the bash tool silently adds a second copy (`attach-file.sh:10-13`). |
| `tim jira link <key> <type> <target>` | Mirrors `link-tickets.sh` | Dry run by default. Keeps the counter-intuitive `Blocks` direction documented (memory: "Blocks link direction"). |
| `tim handoff raise <handoff-folder> --epic EUDPA-E [--yes]` | Composite. Reads `report.json` and `brief.jira.txt`. Refuses when `story.ready` is false (placeholders or draft criteria remain), so the designer's words are never invented. Creates the story, attaches `upstream.patch` and every screenshot, and links a parent or related key. Prints the key, the URL and the branch name `feat/EUDPA-N-<slug>`. | Dry run unless `--yes`. `--json` envelope. |

The skill keeps `ticket-creator`'s conventions:

- The epic is always asked. Offer candidates from `tools/ticket-creator/prepare-ticket-creation.sh` → `epics.txt`. `prototype.json` can hold a default epic for the designer to confirm.
- Labels come from `known-labels.md`.
- A draft goes to `workareas/ticket-creation/<slug>/draft.md` with `Status: DRAFT`.
- Creation happens only after an explicit "raise it" (ticket-creator Step 4, `SKILL.md:196-227`).

The designer's "raise it" works the same way as "open a pull request" does
under prototype rule 8: the explicit request in their own message is the yes.

When `tim auth --json` reports no Jira credentials, today's paste flow is the
fallback, unchanged. The designer never needs a skill name for either path.

### C. Starting the real work

**Where route 2 goes.** The prototype's `handoff/<slug>` branches retire.
`prepare-handoff` is re-targeted:

1. **Preconditions.**
   - A story key exists (stage B), or the run uses the `NO_JIRA` spelling that
     is already used for work without a ticket (for example
     `feat/NO_JIRA-frontend-alignment`).
   - The plants-frontend checkout is clean, and `git -C … branch --show-current`
     is recorded so the checkout can be restored. Memory: "repos/ checkouts
     move mid-session".
2. **Branch.** `git -C ~/…/repos/trade-imports-plants-frontend switch -c feat/EUDPA-N-<slug> origin/main`.
   Do not use `tools/ticket/setup-branch.sh` until it is fixed: it creates
   `feature/EUDPA-X-<slug>` (`tools/ticket/setup-branch.sh:65`). That breaks
   workspace rule 2 and would break parity with any `feat/` branch the
   hand-off makes.
3. **Starting point.** `git apply --3way --include=<upstream-ready paths> upstream.patch`.
   The judge's triage (`prepare-handoff.js:324-356`) stays. The patch is a
   starting point, not the implementation.
4. **House conventions.** Run `frontend-change` once per element, recipe
   verbatim. Pass the target from the profile: repo
   `repos/trade-imports-plants-frontend`, set `high-risk-plants`, unit script
   `test:high-risk-plants`. `frontend-change/SKILL.md:6-13, 98-105` already
   says the target is an input.

   This is how the patch's prototype-shaped code becomes house-shaped:
   - the recipe's convention tests
   - copy parity (`copy.en.js` and `copy.cy.js`)
   - the co-located `*.fit.spec.js` and axe checks
   - `lint:arch`
   - the node best-practices (`.claude/rules/node.md`)
5. **Ladder.** Run the `frontend-change` Step 4 ladder with the plants
   scripts. This replaces `prepare-handoff.js:389-397`, which ran the ladder in
   the prototype.
6. **Spec sync.** `frontend-change` Step 5 writes `openspec/` in the
   **workspace** checkout (`SKILL.md:225-238`). That checkout is the one the
   designer's session is running from. Switching its branch mid-session to
   `feat/EUDPA-N-<slug>` would swap `CLAUDE.md`, the skills and `tim` under the
   running agent. So under a designer session, write the spec delta as
   `openspec.patch` in the hand-off folder. The developer who takes the branch
   applies it on the same-named workspace branch, which keeps parity. When the
   workspace is on `main` and clean, the run can instead cut the same-named
   branch and leave the spec write uncommitted there, as `frontend-change` 5.8
   already does.
7. **Commit.** Commit on the local branch only. Never push, never open a pull
   request, never merge. The run ends by switching plants-frontend back to its
   recorded branch and printing the branch name for the developer.

A pull request is opened only on an explicit request. Merging always waits for
Sam's explicit go (memory "Never auto-merge — wait for Sam").

**When to use requirements-pipeline instead.** `frontend-change` is "one
increment per invocation" (`SKILL.md:446-447`). It does not touch Java.
`requirements-pipeline` is where a multi-increment or full-stack change
belongs: its rows are "a full-stack slice, never a layer" (`SHAPE.md:30-35`).
Its description already covers "a prototype, a design release" as sources.

So C2 does the following:

- It runs DISTIL with these sources:
  - the hand-off folder
  - the design branch
  - `repo:plants-frontend` and `repo:plants-backend` (and their rulings)
  - `openspec/specs/plants`
- It writes `workareas/shared/handoffs/<slug>/backlog.json`. Every criterion
  cites `handoff:<folder>` or `EUDPA-N` as provenance.
- It stops there.

The designer session **never launches BUILD**. The `lifecycle: 'full'` loop
raises its own ticket per row and merges its own increments on green
(`BUILD.md:85-97`, and the memory exception for requirements-pipeline). That
standing ruling is for runs Sam launches. From a designer session it would be
an auto-merge nobody asked for.

To avoid two tickets for one change, the loop's per-row tickets should link
`Relates` to the hand-off story. That is one `tim jira link`, or a
`relatesTo` envelope field. Alternatively the hand-off can skip stage B and let
BUILD raise the tickets. Sam should rule on which.

### D. After the real team merges

Record the order in `handoffs/README.md` "Keeping track":

1. Take the prototype-owned service's line out of `ours` first. Keep the
   folder: `designer:service retire` deletes both (`service/cli.js:223-249`).
2. The weekly sync then brings the real `services/<name>/` in over it.
   Otherwise `ours` keeps the prototype's copy for good and hides the real one.
3. Then refresh or retire the design release.

Open question: the real `stub.js` has fixed rows. After retirement the
designer loses the editable store the prototype's stub gave them. Decide
whether the prototype patches the real stub (a `patched` entry) or keeps
examples elsewhere.

## 4. The new-service case, end to end

Worked example: `transporters` (owner `new-api`, base URL env
`TRADE_IMPORTS_TRANSPORTERS_URL`, `GET/POST /organisation/{organisationId}/transporters`).
The service is in `src/server/app/services/transporters/index.js:20-60`.

1. **Check the contract against house conventions, deterministically, before
   the story.** This is new: a function in `scripts/designer/handoff/` (or
   `tim spec` if it should serve other repos). It checks:
   - the REST rules in `docs/best-practices/rest-api/rest-api.md`: kebab-case
     paths (line 14, 199), plural nouns, no `/v1` (line 193), camelCase JSON
     (line 208);
   - sibling services: the address book scopes by
     `@RequestMapping("/organisation/{orgId}/addresses")`
     (`repos/trade-imports-address-book/…/OperatorController.java:44`), so the
     prototype's `{organisationId}` should become `{orgId}` for consistency.
     The plants backend instead carries the user in headers
     (`NotificationController.java:36, 201-202`), so the owner choice decides
     the shape.

   Findings go into the story's open questions. They are never auto-fixed.
2. **Check it against the existing rulings.** plants-frontend removed the
   transport and transporter services on purpose. Behaviour
   `customs-no-sps-hold-or-matching` says the journey collects no transport
   details (`repos/trade-imports-plants-frontend/src/server/app/docs/services.md:29-34`,
   `sets/high-risk-plants/docs/services.md:61-66`,
   `sets/high-risk-plants/spec/journey-spec.json`). The same applies to
   uploads: "There is no document-upload service" (`docs/services.md:36-38`).

   The hand-off must surface a clash like this as a **conflict for the product
   owner**, the way DISTIL does (`DISTIL.md` §reconcile, "any clash with an
   existing ruling"). It must not ship a patch that quietly re-adds a removed
   service. Today `build.js` only scans for old words
   (`specImpactOf`, `build.js:513-518`). It does not check behaviours a new
   service contradicts.
3. **Write one full-stack story, never a "backend half".** Its repos are:
   - `trade-imports-plants-frontend`
   - the owner's repo: `OWNER_REPOS` in `brief.js:253-257` maps
     `plants-backend` to `trade-imports-plants-backend`; `ins` to address-book
     or ins-backend; `new-api` to "to be agreed"
   - the tests repo, if E2E is touched

   Its Tech Notes name the house conventions for each side:
   - **Frontend.** `services/<name>/{index,client,stub}.js` with `isStubMode()`
     (`contract.js:119-126`), a convict key and env var row
     (`docs/services.md:56-66`), and a `configure*` seam in
     `routes-high-risk-plants.js` (`sets/high-risk-plants/docs/services.md:33-39`).
   - **Backend.** A Spring Boot noun controller per
     `docs/best-practices/java/{spring-boot,openapi-springdoc,spring-data-mongodb,modern-java}.md`,
     records with null guards, and ITs under `mvn verify` (memory).
   - **Stack.** An env knob using `host.docker.internal`
     (`docker/stack/AGENTS.md`).
   - **Platform.** A `cdp-app-config` entry, drafted locally for Sam to commit.
     No AI writes there (memory).
4. **Build it through requirements-pipeline (C2), not frontend-change alone.**
   One row, `repos: [frontend, backend]`, acceptance observable end to end.
   Branches `feat/EUDPA-N-<slug>` in plants-frontend, plants-backend and the
   workspace (spec). Verify with `tim docker … --branch feat/EUDPA-N-<slug>`,
   or `scripts/stack/run-stack.sh -b`, so both branch images are probed.

## 5. What each existing piece becomes

| Today | Becomes |
|---|---|
| `hand-off` skill (prototype) | Evidence plus the designer conversation only. Steps 1-9 before either route stay: never invent words, criteria drafted and confirmed, links. Its "Hand-off note" (`SKILL.md:395-404`) changes from "paste it" to "raise it" (stage B), with paste as the no-credentials fallback. "Nothing is ever pushed to plants-frontend" (`SKILL.md:41-44`) now has to cover the real checkout too: "a designer session never pushes any repo". Route 2 moves to stage C. |
| Workspace routing | A new workspace-level row, `design-handoff` (or `hand-off` moved to `.claude/skills/`), in the `CLAUDE.md` skill routing index. Triggers: "hand this to the real team", "make this real", "raise a story from the prototype". `ticket-creator`'s description gains "NOT for a change made in the plants prototype". It shares `ticket-creator`'s draft, epic and label steps, not its serial interview. |
| `prepare-handoff.js` | Re-targeted, as in C1 above. `GUARD_RAILS` (`:159-166`) changes: the workspace tilde form; `git -C` for two repos; record and restore the plants-frontend branch; never push, open a PR or merge. The Apply phase (`:363-378`) switches from `git switch -c handoff/<slug> main` in the prototype to `feat/EUDPA-N-<slug>` from `origin/main` in plants-frontend, plus `frontend-change` per element. The Verify phase uses the target profile's scripts. The Write phase writes the hand-off folder and `openspec.patch`. It gains a `ticket` arg (key or `NO_JIRA`). It adds a C2 exit that writes a DISTIL request instead of building when `servicesToBuild` is non-empty or a ruling clashes. It keeps `scriptPath` launch and the args contract (`:33-65`), and keeps `MODELS` and the three-repair budget. |
| `upstream.patch` | Kept. It is the evidence attached to the story and the starting point for C1's `git apply --3way`. It is never the deliverable: `frontend-change` makes it house-shaped. Its apply check is also run against plants-frontend `origin/main` in the workspace. |
| `brief.jira.txt` | Becomes the description for `tim handoff raise`, and the paste fallback. |
| `handoff/*` branches in the prototype, and `AGENTS.md` rule 10's `handoff/*` exception | Retired. Real-service files are edited in the real repo on `feat/EUDPA-N-<slug>`, never in the prototype. `maintain/*` stays. |
| `handoffs/README.md` "Keeping track" | Adds the story key and the real branch, filled by `tim handoff raise`, and the post-merge order from section D. |
| `brief.js` `addForTheDeveloper` (`:624-645`) | Names the branch actually made, the target profile, and C1 or C2. It no longer suggests "an agent can…". |

## 6. Branch parity and consent: rules the redesign must enforce

- **One name everywhere:** `feat/EUDPA-N-<slug>` in plants-frontend, plants-backend,
  the tests repo and the workspace's openspec change. The prototype's
  `design/<set>-<slug>` stays as the design record and is linked from the
  story, not renamed.
- **Fix the parity hazard** in `tools/ticket/setup-branch.sh:65`
  (`feature/` → `feat/`). Otherwise the `ticket` skill, which the brief itself
  recommends, drifts from the hand-off's branches.
- **Check parity with `tim workspace branch`.** It reports "Branches differ
  across repos" (`tim/src/commands/workspace/branch.js:321-326`). Run it at
  the end of C1 or C2 and quote it.
- **Consent gates live in the skill and in `tim`,** because the workspace
  allowlist does not prompt: `tim` writes are dry run unless `--yes`; Jira is
  raised only after "raise it"; the designer session never pushes, opens a PR
  or merges; BUILD is never launched from a designer session.
- **Settings proposal (for Sam, not applied).** Add `ask` rules for
  `Bash(~/git/defra/trade-imports-workspace/tools/jira/create-ticket.sh*)`,
  `…/attach-file.sh*`, `…/link-tickets.sh*`, `Bash(tim jira create*)`,
  `Bash(tim handoff raise*)` and `Bash(git -C * push*)`, so outward-facing
  actions prompt at the workspace root. Written to
  `workspace-adapt/settings-proposal.md`.

## 7. Open questions for Sam

1. One story from the hand-off, and BUILD's tickets link to it? Or no story,
   and BUILD raises the tickets (C2 only)?
2. May a designer session create a local `feat/EUDPA-N-<slug>` branch in
   plants-frontend (C1)? Or should it stop at the story and leave the branch to
   a developer? (This assessment assumes it may, on an explicit ask, with no
   push.)
3. The default epic for design hand-offs, for `prototype.json`.
4. Whether a `NO_JIRA` C1 run is allowed when the designer has no Jira
   credentials.
5. After retirement, how the prototype keeps editable examples for a service
   the real team has built (section D).

## 8. What was not tested

- No `tim` write command exists yet, so none was run. Dry-run behaviour is
  specified above, not proven.
- No Jira call of any kind was made.
- No branch was created in any repo.
