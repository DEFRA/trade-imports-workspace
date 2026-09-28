# Assessment: prototype to ticket (Sam's comment 4)

Branch assessed: `feat/NO_JIRA-designer-prototyping` in `repos/trade-imports-plants-prototype`, HEAD `abae120`.
Read in full: `.claude/skills/hand-off/SKILL.md`, `.claude/workflows/prepare-handoff.js`,
`scripts/designer/handoff/{build.js,brief.js,cli.js}`, `handoffs/README.md`,
`scripts/designer/prototype.json`, `src/server/prototype-services/transporters/index.js`.
Compared against: workspace `ticket-creator` story template
(`.claude/skills/ticket-creator/assets/templates/story.md`) and the real
plants-frontend service pattern (`src/server/app/services/countries/{index,client,stub}.js`,
`src/server/app/sets/high-risk-plants/docs/services.md`).

## Verdict: partial

The hand-off is a strong **change report** (what files, what words, does the patch
apply, what tests pin the old words). It is not yet a **story**: it has no user
story, no acceptance criteria, no link to see the prototype running, no plain
description of flow or validation, and for a new service only one sentence plus
one example row. An agent on the real repo gets a patch, not a spec of intent.

## What is covered (with evidence)

| Need | Covered? | Evidence |
|---|---|---|
| Jira wiki markup, paste-ready | Yes | `brief.js:427-451` `renderBriefJira` (h1./h2./`\|\|` tables/`{{code}}`/escaping); `brief.test.js:229` escapes `[Welsh needed]` |
| Uses EUDPA project, says who to send it to | Yes | `scripts/designer/prototype.json:10-13`; `handoffs/README.md:19-28`; `SKILL.md:286-294` |
| No invented Jira integration | Yes | Designer pastes `brief.jira.txt` and attaches files (`handoffs/README.md:21-23`) |
| Screenshots before/after | Yes | `cli.js:202-223` copies from `designer:show` gallery, 2 MB cap; `brief.js:141-146` embeds per page; Jira form `!file\|thumbnail!` (`brief.js:441`) |
| Pages changed + files | Yes | `build.js:422-441` `groupPages`, `brief.js:132-146` |
| Copy table en + cy, Welsh to translate | Yes | `brief.js:147-190`, `build.js:403-420`, `findWelshMarkers` |
| Tests that pin old words | Yes (update only) | `build.js:467-468` `testImpactOf`, `brief.js:193-210` |
| Real-journey spec files quoting old words | Yes | `build.js:485-486`, `brief.js:212-232` |
| Patch in real-repo paths, checked with `git apply` vs prototype copy and `upstream/main` | Yes | `build.js:607-622`, `brief.js:67-88`, drift `build.js:525-538` |
| Prototype-only services detected and excluded, with dependents | Yes | `build.js:589-605`, `leaveOutDependents` `build.js:496-518` |
| Branch name suggestion follows workspace rule | Yes | `cli.js:209` `feat/EUDPA-XXXX-<slug>` |
| Route 2: change applied to real journey with tests, verified (`npm test`, lint, `test:fit:features`), repair loop | Yes | `prepare-handoff.js:321-403`; recipe tests step `prepare-handoff.js:330` |
| Status tracking after raising (ticket number, merged PR) | Yes | `handoffs/README.md:30-44`; `SKILL.md:296-299` |
| Research-mode rules and design gaps flagged | Yes | `build.js:675-684`, `brief.js:292-328` |

## Gaps

1. **Not in the EUDPA story shape.** `briefOutline` (`brief.js:120-255`) emits: title,
   "What and why", pages changed, Welsh, tests, spec, cannot ship, recipe, left out,
   drift, how to apply. The team's story template (`ticket-creator/assets/templates/story.md`)
   is `*As* / *I want* / *So that*`, `+*Acceptance Criteria*+` Given/When/Then, and a
   `{panel}` Tech Notes block. There is no As/I want/So that and no acceptance criteria
   at all (grep for "acceptance|Given|I want" in handoff scripts and skill: no hits).
   A ticket pasted from `brief.jira.txt` would fail the team's own `ticket-refiner` check.
2. **No link to the prototype.** `prototype.json:4` has `deployedUrl: null`, and the
   CLI has no option for a branch, commit, PR or example deep links (`cli.js:64-84`).
   `designer:examples -- links <set>` exists (CLAUDE.md "How every change ends") but is
   not used by the brief. A reader cannot click through the journey; they only see
   stills. Sam's "here's the prototype" is screenshots only.
3. **Flow and validation are only implicit.** A flow change lands under "Across the
   journey (flow, questions or shared parts)" as a file list (`brief.js:54-57`).
   There is no before/after page order (though `designer:release orders` can produce
   it), no gate/"show this page when" statement, and no list of validation rules
   (field, rule, error message en/cy) — error messages show only as copy-table rows,
   rules only inside the patch.
4. **New service: no API contract.** For a prototype service the brief says
   "uses X, which only exists in the prototype: it needs a real service", the
   `needsARealService` sentence and `JSON.stringify` of the first `data.json` row
   (`build.js:319-351`, `brief.js:257-260, 300-303`). It does not carry the operations
   and their shapes, even though the fake documents them well in JSDoc
   (`transporters/index.js:56-147`: `search(orgId,{query,page}) -> {results,total,page,totalPages,pageSize}`,
   `transporter(orgId,id)`, `addTransporter(orgId,fields)`, `validateTransporter`,
   `REQUIRED_FIELDS`, `TRANSPORTER_TYPES`). It does not say where the real one goes
   (`src/server/app/services/<name>/{index.js,client.js,stub.js}`, mode switch via
   `common/services/mode.js`, documented in plants-frontend `src/server/app/docs/services.md`)
   or which backend owns the data. And because fakes live in
   `src/server/prototype-services/` with their own registry, every file that uses one
   is dropped from the patch (`build.js:651-656`), so the page work that depends on
   the service does not travel at all — the real team rebuilds it from screenshots.
   This is the direct link to comment 3: if the fake were built as a real-pattern
   service (index + stub now, client later), the index, stub and the pages could
   ship in the patch and the story would ask only for `client.js` plus the backend
   endpoint.
5. **Tests to add are not listed.** Only "tests that pin the old words" (update).
   Route 1 never says "new page X needs a unit test and a fit spec per
   `docs/testing.md`". Route 2 does this (`prepare-handoff.js:330`) but only for the
   upstream-ready part.
6. **No pointer for an implementing agent.** The brief names the recipe
   (`brief.js:90-97`) but not the workspace's `frontend-change` skill, the real
   repo's recipe docs by path, or the workspace Behaviour Spec
   (`openspec/specs/plants`, `openspec/coverage/plants`) that a new behaviour should
   add to. `specImpact` only scans the set's `spec/` folder (`build.js:472-478`).
7. **Placeholder-based work cannot be handed off at all.** `resolveChain` throws for a
   release made from `sample-journey` (`build.js:135-138`) with the message "hand it
   over as a brief and screenshots only" — but no tool writes that brief. Same for a
   whole new idea with nothing to patch. Minor, but it is exactly the "not implemented
   yet" case Sam mentioned.
8. **Why is designer-supplied only** (`SKILL.md:62-68`) — correct not to invent, but
   there is no prompt to capture the user need (who, what, so that) which the story
   form needs.

## Recommended changes (no Jira API; designer still pastes)

1. **Add a story section to `briefOutline`, rendered first in `brief.jira.txt`**
   (and a copy-ready `story.jira.txt` if simpler), in the team template shape:
   - Summary line (Jira title) from `--title`.
   - `*As* / *I want* / *So that*` from new `--as`, `--want`, `--so-that` options
     (the skill asks the designer for these in their words; placeholders if not given,
     same rule as `--why`).
   - `+*Acceptance Criteria*+` Given/When/Then, one block per page/behaviour,
     drafted by the agent from the change (page shown when, fields, errors) and
     confirmed by the designer, passed as `--criteria <file>`; the script renders both
     Markdown and wiki. Deterministic generation of simple ones is possible (a copy
     change yields "Then the page shows <new>" per key).
   - `{panel}` Tech Notes: patch applies/drift, services to build, tests, recipe,
     branch name `feat/EUDPA-XXXX-<slug>`.
   Keep the existing detailed sections below as "Detail".
2. **Prototype links section.** Add `--link` (repeatable) and have the skill pass:
   the design branch on GitHub (after `share-my-change` pushes), the PR URL if any,
   `deployedUrl` + example deep links from `designer:examples -- links <set>` when a
   deployed prototype exists, and always "how to run it locally" (clone, switch
   branch, `npm run dev`, open `/<set>/...`). Set `deployedUrl` when there is one.
3. **Flow and validation sections.** Render before/after page order from
   `designer:release orders` for the changed pages; list gate changes; list
   validation rules (field, rule, English error, Welsh error) extracted from the
   release's schema/copy error keys for changed features.
4. **Service contract section per needed service.** From the fake's exports and
   JSDoc: each operation name, parameters, return shape, required fields, enums,
   error cases, example record(s) from `data.json`; the target location in
   plants-frontend (`src/server/app/services/<name>/index.js|client.js|stub.js`, stub
   chosen by mode as countries/ports do); the backend question (which service owns the
   data, proposed REST noun endpoints) as an open question for the team, not an
   invented answer. Best paired with comment 3: once fakes follow the real
   index/stub pattern, ship index + stub + pages in the patch and make the story ask
   only for `client.js` and the backend endpoint.
5. **"Tests to add" section.** For each added page/field/service, name the tests the
   real repo's `docs/testing.md` and recipe require (unit, fit feature spec, stub
   test), so route 1 is implementation-ready too.
6. **"For the developer or agent" section.** One paragraph: start from
   `upstream.patch`, follow the named recipe at
   `src/server/app/sets/high-risk-plants/docs/<recipe>.md`, in the workspace use the
   `frontend-change` / `ticket` skill with this brief as input, and add or update the
   Behaviour Spec under `openspec/specs/plants` with coverage.
7. **Brief-only hand-off** for releases with nothing to patch (placeholder-based or
   pure concept): `--brief-only` that skips the patch and writes story + screenshots +
   links + service contract, instead of throwing.
8. Skill update (`hand-off/SKILL.md` step 5): ask for the user need (as/want/so that)
   alongside the why; after writing, run a self-check that the Jira text has a
   non-placeholder story line and at least one acceptance criterion, and tell the
   designer which placeholders remain.
