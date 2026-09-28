# Designer prototyping: refinement plan

Built from Sam's four refinement comments and the four assessments in this folder (`assess-intent-first.md`, `assess-real-service-pattern.md`, `assess-prototype-to-ticket.md`, `assess-fidelity-and-experience.md`). Repo: `repos/trade-imports-plants-prototype`, branch `feat/NO_JIRA-designer-prototyping`.

## Verdicts

| Theme | Verdict |
|---|---|
| 1. Purpose: close to the real frontend, the next page is just there | **Mostly covered, some fixes needed.** Releases are full copies of the real journey on the real engine, components and example data. The gaps: nothing tells a designer when the real journey has moved on since their release was made (they only find out at hand-off), `your-first-hour.md` step 9 contradicts the skill, and PROTOTYPE.md repeats three other docs and does not list the differences from the real service in one place. Fixes are C4 (drift) and C1 (docs). The missing-hook error on first run needs Sam to apply `scripts/designer/hooks/settings-proposal.json` on a `maintain/` branch. Agents may not edit settings. |
| 2. Intent-first: say what you want, no need to know skill names | **Partly covered, needs a change.** The routing table works in Claude Code and names skill paths. But it matches phrases, not outcomes: 3 of 10 paper-test phrasings misroute and 1 stalls. The "nothing fits" fallback is a dead end. AGENTS.md is only a pointer. There is no name a designer can use to call it. The designer docs put a skill name beside every phrase. Fix: C1. |
| 3. New services follow the real index/client/stub pattern in the right place | **Not covered, needs a change.** Fakes live in `src/server/prototype-services/` with their own registry and API names. Pages import them by a seven-`../` path the real frontend never has. Every rule forbids `src/server/app/services/**`. The sync throws when upstream later adds a path under an `ours` glob. Fix: C2. |
| 4. Make a ticket from the prototype | **Partly covered, needs a change.** The hand-off writes Jira wiki markup, a patch and screenshots, and prepare-handoff can build it with tests. But the brief is not a story: it has no As/I want/So that, no Given/When/Then, no Tech Notes, no link to the prototype and no flow or validation tables. It has no API contract for a new service. Pages that use a fake are left out of the patch, and concept-only work cannot be handed off. Fix: C3, which uses the service contract from C2. |

## One routing design: always-loaded instructions, plus a handle a designer can name

- **AGENTS.md is the single full source.** It holds the load-bearing rules, the "work out what they want" step, the outcomes table, the phrase table and the fallback that splits a request into parts. Cursor, Codex and Copilot load it without doing anything. CLAUDE.md becomes `@AGENTS.md` plus only the Claude-Code-only notes (Workflow tool, `.claude/rules` globs, hooks), so Claude Code loads the same text. That gives one copy that cannot drift and needs nothing hooked in.
- **Each route names its steps file by path** (`.claude/skills/<x>/SKILL.md`), so a host that never loads skills still reaches the same steps.
- **The `design` skill is a handle, not a second router.** "Use the design skill", "/design" or just "design" sends the agent to the AGENTS.md section "Working out what they want", and nothing else. AGENTS.md also says: if the designer says "use the design skill" and you have no skills, follow that section. That way the handle works on every host.
- The 13 skills stay as they are. Designers never need their names. Docs lead with "just say what you want", and skill names move to a note for maintainers.

Why not one big skill with the 13 as references: that relies on the skill being loaded, which is what Sam said not to do, and it would repeat the routing.

## Service shape (C2 defines it, C3 reads it)

Every prototype-owned service lives at `src/server/app/services/<name>/`. Each one has its own `ours` entry, `src/server/app/services/<name>/**`, so the real folders stay upstream-owned.

- `index.js` has the same shape as the barrel the INS frontend uses for its address book: `const impl = () => (isStubDataMode() ? stub : client)`. Each operation is a named export. It also exports `NEEDS_A_REAL_SERVICE` (one plain sentence) and `CONTRACT`. `index.js` and `client.js` never import prototype-only code, so a developer can copy them across unchanged.
- `client.js` calls an env URL with the org and tracing headers the real clients send, and has a `toRecord` mapping. It is the proposed real client.
- `stub.js` holds the starter rows as a JS array. Its only prototype-only import is `src/server/prototype-support/`.
- `<name>.test.js` covers both stub behaviour and the client wire mapping, using nock at the network boundary.
- `CONTRACT` = `{ service, owner: 'plants-backend'|'new-api'|'ins', baseUrlEnv, operations: [{ name, method, path, params, returns, errors }], record: { fields: [{ name, type, required, enum? }] }, examples: [...], openQuestions: [...] }`.

**Why the stores stay per release (this behaviour is really needed):** stub stores stay per release and per org (`createFakeStore` keyed by the active set). Several design releases run side by side in one server. A transporter added in release A must not show up in release B, and each release's Reset must clear only its own data. That is how a real multi-tenant backend behaves, so the pages behave the same. Only `stub.js` knows about it.

## Changes

### C1: front door and intent-first routing (owns every shared file)
Owns: `AGENTS.md`, `CLAUDE.md`, `PROTOTYPE.md`, `overrides.json`, `package.json`, `.claude/skills/design/**`, `.claude/skills/run-the-prototype/**`, `.claude/rules/**`, `.claude/workflows/design-session.js`, `.claude/workflows/design-session.test.js`, `.claude/workflows/README.md`, `docs/designers/README.md`, `docs/designers/your-first-hour.md`, `docs/designers/design-releases.md`, `docs/designers/where-changes-go.md`, `docs/designers/glossary.md`, `scripts/designer/suite.test.js`.

1. **AGENTS.md** is the full source. Move all of CLAUDE.md's rules, routing, workflows, branches, "how every change ends" and the commands into it. Add a section called "Working out what they want", placed before the tables:
   1. Name the outcome.
   2. Split it into parts.
   3. Map each part with the outcomes table, then the phrase table.
   4. Check what already holds.
   5. Do the parts in order.
   6. Ask one plain question only when the request is truly ambiguous.
2. Add an outcomes table covering: a demo or stakeholder review; a research round; crit notes; I'm new or what can I do here (newcomer route in run-the-prototype); a new feature the real service lacks (goes to fake-a-service, which builds a real-pattern service); a ticket, story or Jira for the developers (goes to hand-off); stay current with the real service (release drift, then design-release carry); start from scratch.
3. Widen the phrase triggers: overdue, late, behind; ticket, story, Jira, backlog; demo, playback, show and tell; upload, attach; latest, out of date; participants skip or start past the X page.
4. Replace "When nothing fits…" with the split-into-parts fallback. Anything the real service cannot do goes to fake-a-service.
5. Add the handle line: "use the design skill" or "design" means follow "Working out what they want".
6. Rule 10 exception: prototype-owned service folders (the per-service `ours` entries under `src/server/app/services/`) may be edited on `design/*` branches through fake-a-service only. The real folders stay forbidden. Add the same exception to `.claude/rules/ownership.md` (heading and body) and `.claude/rules/designer-sets.md`.
7. **CLAUDE.md** becomes `@AGENTS.md` plus the Claude-Code-only notes (Workflow tool launch by `scriptPath`, rule globs, hook messages).
8. Add **`.claude/skills/design/SKILL.md`** (`name: design`, broad triggers: "design", "help me design", "I need…", "can you make it so…", "use the design skill"). It holds no table. It reads AGENTS.md "Working out what they want", sends lists of notes to design-session, and always ends with check, show and the hand-off line.
9. **run-the-prototype**: add a newcomer section. It runs preflight and start, then prints the "You want to / Say something like" table with no skill names. When `designer:release list` shows real-journey drift above 0 (C4), it says so in one line.
10. **design-session.js**: the classify step reads routing from AGENTS.md, not CLAUDE.md. It splits vague notes instead of refusing them. Allowed paths drop `src/server/prototype-services/` and add the prototype-owned service globs and `src/server/prototype-support/`.
11. **overrides.json `ours`**:
    - add `.claude/skills/design/**`, `src/server/prototype-support/**`, `src/server/app/services/transporters/**`, `src/server/app/services/templates/**`, `src/server/app/services/ins-address-book/**` and `src/server/app/services/notification-search/**`, each one on its own line;
    - remove `src/server/prototype-services/**`.
12. **package.json**: add `"designer:service": "node scripts/designer/service/cli.js"`.
13. **Docs**:
    - PROTOTYPE.md: slim to about 100 lines. Keep what it is, "just say what you want" with a table that has no Skill column, "if Claude seems lost, say 'use the design skill'", a link to your-first-hour, a new "How close is this to the real service?" section (releases are snapshots with a drift column, prototype-owned services, design gaps, the dead header Address book link, the dashboard Commodity/Arrival bug, Welsh not shown, shared data), known gaps, and deploying and merging. Move each cut fact into design-releases.md or where-changes-go.md after checking it is there.
    - your-first-hour.md 238-239: `--before` works as soon as Claude has started the release.
    - docs/designers/README.md: lead with "just say what you want".
14. **suite.test.js**: assert that every skill folder is in `ours`, AGENTS.md names every skill path, CLAUDE.md imports AGENTS.md, and no file outside `src/server/prototype-support` names `prototype-services`.

Acceptance:
- CLAUDE.md is `@AGENTS.md` plus Claude-Code-only notes. AGENTS.md alone holds all rules and routing.
- The re-run paper test (10 phrasings, recorded in assess-intent-first.md) gives 10 of 10 routed with no stall.
- A "use the design skill" line exists in AGENTS.md and the design skill exists and is in `ours`.
- The designer docs show no skill-name column.
- `npm run test` passes for `suite.test.js` and `design-session.test.js`, and `npm run lint` is clean.

### C2: prototype-owned services on the real index/client/stub pattern
Owns: `src/server/app/services/transporters/**`, `src/server/app/services/templates/**`, `src/server/app/services/ins-address-book/**`, `src/server/app/services/notification-search/**`, `src/server/prototype-services/**` (deleted), `src/server/prototype-support/**` (new), `src/server/prototype-data/**`, `src/server/app/sets/sample-journey/**`, `src/server/app/routes-sample-journey.js`, `scripts/designer/service/**`, `scripts/new-set/**`, `scripts/sync-upstream/**`, `.claude/skills/fake-a-service/**`, `.claude/skills/port-a-kit-page/**`, `docs/designers/services-and-dashboards.md`, `fit/designer-sets.fit.spec.js`.

1. **prototype-support.** Move `lib/{fake-store,persist,active-set,registry}.js` and `records/{wrap,persistence,seed-link}.js` to `src/server/prototype-support/`. This is stub plumbing only. It may be imported by `stub.js` files and release gateways, never by `index.js` or `client.js`.
2. **transporters.** Build `{index,client,stub,transporters.test.js}` in the shape above. The operations are `listTransporters(orgId, {search, page})`, `getTransporter`, `createTransporter` and `deleteTransporter`. Validation throws a 400 problem body that `isValidationFailure` and `mapApiErrorsToFormErrors` map, exactly as the INS address book does. `TRADE_IMPORTS_TRANSPORTERS_URL` is new.
3. **templates.** Same shape, with `TRADE_IMPORTS_PLANTS_BACKEND_URL` + `/templates`. `journey.js` (the engine glue) moves out of services. fake-a-service.md tells agents to write it in the release's own feature at `sets/<release>/journeys/linear/features/templates/from-template.js`.
4. **ins-address-book.** This is a copy of the INS frontend address-book API: list, create, get, update and delete Address, the INS wire shape, and `TRADE_IMPORTS_ADDRESS_BOOK_URL`. Its read side joins a `prototype-data` `withExtraParties` overlay (added rows in, hidden rows out, for the active set), so pickers keep importing the real `services/address-book/index.js` unchanged.
5. **notification-search.** Dashboard filters, tabs and counts, reusing the current `records/{query,filters,dashboard,derived-columns}.js` logic. The client is the proposed plants-backend list query. The stub queries the release's wrapped records store.
6. Rename `NEEDS_A_REAL_SERVICE` and `CONTRACT` into each `index.js`. The Reset registry stays in `prototype-support`. `describeFakes` is replaced by reading `CONTRACT` from each prototype-owned service.
7. Delete `src/server/prototype-services/`. Rewrite every import. `scripts/new-set/designer-records.js` wires the new paths.
8. **`scripts/designer/service/` (cli.js plus tests)**:
   - `new <name> --owner <plants-backend|new-api|ins> --describe "<text>"` refuses a name that `git ls-tree upstream/main src/server/app/services/<name>` already has, and a known removed name (`commercial-transporters`, and animals `transporters` flagged as a warning). It writes the index/client/stub/test templates with a `CONTRACT` skeleton and adds the per-service `ours` entry through `addOwnedPaths`.
   - `retire <name>` uses `removeOwnedPaths`.
   - `list` prints each prototype-owned service with its `NEEDS_A_REAL_SERVICE`.
9. **Harden the sync (sync.js, git.js, summary.js plus tests).** When an `ours` path was added only upstream, or added on both sides, never run `git checkout HEAD` on it.
   - Under `src/server/app/services/<name>/`, record `service-arrived`, label the PR `needs-person`, and write a summary line telling the maintainer to retire the prototype one.
   - Anywhere else, remove the path so `ours` stays in charge.
10. **fake-a-service** SKILL and references (fake-a-service.md, address-book-pages.md, dashboard-filters-and-tabs.md, confirm-then-act.md):
    - update the existing-services table, the imports table and worked examples 1 and 2;
    - base "Making a new service" on `designer:service new`, and drop the swap-three-imports step;
    - document the set-owned tier `sets/<release>/services/<name>/` for journey vocabulary only;
    - change the "Never edit shared code" guard rail to allow the prototype-owned folders.
11. **port-a-kit-page** SKILL:51 uses the new paths.
12. Rewrite **docs/designers/services-and-dashboards.md** to match.

Acceptance:
- Nothing imports `prototype-services`.
- Each service folder has `index.js`, `client.js`, `stub.js` and a test. `index.js` chooses between stub and client with `isStubDataMode`. `index.js` and `client.js` import nothing from `prototype-support`.
- Each service has its own `ours` line.
- `designer:service new foo` makes a working service. `new countries` is refused.
- The sync unit tests cover upstream-only-added and add/add under a service glob.
- `npm run test`, `npm run lint` and `npm run test:fit:features` pass.
- A release's transporter picker still pages, saves, validates and resets per release.

### C3: prototype to an implementation-ready story
Owns: `scripts/designer/handoff/**`, `scripts/designer/prototype.json`, `.claude/skills/hand-off/**`, `.claude/workflows/prepare-handoff.js`, `.claude/workflows/prepare-handoff.test.js`, `handoffs/README.md`.

1. **Story block** first in `brief.jira.txt`, in the EUDPA story template shape:
   - a summary;
   - *As*/*I want*/*So that* from `--as/--want/--so-that`, with placeholders when they are not given;
   - +*Acceptance Criteria+* as Given/When/Then from a `--criteria` file the agent drafts and the designer confirms. Copy changes get their criteria generated deterministically;
   - a `{panel}` Tech Notes block: patch status, drift, services, tests, recipe path, and the branch `feat/EUDPA-XXXX-<slug>`.
   The current sections become "Detail".
2. **See the prototype** section:
   - a repeatable `--link` option for the branch URL, the PR URL, and the deployed URL once `deployedUrl` is set;
   - `designer:examples` deep links;
   - steps to run it locally every time.
3. **Journey flow** section: before and after page order (the `designer:release orders` logic) and any gate or condition changes. **Validation** section: one table row per rule, with field, rule, English error and Welsh error from the changed features' schema and copy files.
4. **Service to build** section for each prototype-owned service `impact.js` detects (kind `prototype-service`: imports of `services/<name>/` whose folder is a per-service `ours` glob):
   - the `CONTRACT` operations, record fields, examples and open questions (which backend owns the data, the proposed REST noun endpoint);
   - `index.js` and `client.js` go into the patch marked "proposed". `stub.js`'s one prototype-only import is named.
   The story asks only for the backend endpoint plus hardening the client. Pages that use the service now stay in the patch.
5. **Tests to add**, based on added pages, fields and services and the recipe in the real repo's `docs/testing.md`. Also a **For the developer or agent** paragraph that points to the plants-frontend recipe doc, the workspace `frontend-change` and `ticket` skills, and `openspec/specs/plants` plus coverage. `specImpact` also scans the workspace `openspec/specs/plants`.
6. **`--brief-only`** mode, for sample-journey-based releases and pure concepts, replaces the throw in `resolveChain`.
7. **hand-off SKILL**: ask for who, what and so that alongside why, in the designer's own words. Never invent any of them. After writing, check that there is a story line that is not a placeholder and at least one criterion, and list the placeholders left. It triggers on ticket, story, Jira and backlog.
8. `prepare-handoff.js:294` and its allowed paths match the new service location.

Acceptance:
- `brief.test.js` covers the story block, links, flow, validation, the service contract, tests to add and brief-only.
- A hand-off of a release that uses transporters puts the service's `index.js`, `client.js` and pages into `upstream.patch`, and that patch applies to plants-frontend `main` in `handoff.e2e.test.js`.
- A pasted `brief.jira.txt` gives READY or NEEDS WORK-with-placeholders-only on a ticket-refiner dry read.
- `npm run test` and `npm run lint` pass.

### C4: tell designers when their release has fallen behind the real journey
Owns: `scripts/designer/release/**`, `.claude/skills/design-release/**`.

1. Add a drift helper at `scripts/designer/release/drift.js`: files and pages under `sets/high-risk-plants` changed between the release's `fromCommit` and `HEAD`. It is a port of the hand-off `driftOf` logic. C3 may import it later, but does not need to.
2. `designer:release list` gets a "Real journey changed since" column. `designer:release drift <release>` gives the page list.
3. The design-release SKILL mentions it in one line when it is above 0 and offers "pick up the real team's changes" (carry or remount).

Acceptance: `list.test.js` covers 0 and above 0. A release made at an old commit shows its changed pages. `npm run test` passes.

## Order
C1, C2, C3 and C4 own disjoint files and can run in parallel. C3's contract detection assumes C2's `CONTRACT` shape, as written above. Land C2 before running C3's e2e hand-off test. C1's `ours` and `package.json` entries match C2's folders.

## Trials (designer words, no skill names)
1. **New service (Claude Code):** "In my working release I'd like importers to be able to save a vehicle they use a lot, with the registration, haulier and trailer type, and then just pick it on the transport page next time. The real service can't do that yet."
2. **Ticket for the devs (Claude Code):** "On my working release, change the hint on the reason for import question to 'Tell us why you are bringing these plants in' and add a yes/no question asking whether the plants were grown under glass. Then write it up as a story the developers can pick up and build properly in the real service."
3. **No-skills host (reads only AGENTS.md):** "Hi, I'm new to this. What can I do here? And could you show me the dashboard with a few overdue notifications on it?"
4. **Vague:** "We've got a stakeholder demo on Thursday. Can you get the prototype into good shape for it?"
