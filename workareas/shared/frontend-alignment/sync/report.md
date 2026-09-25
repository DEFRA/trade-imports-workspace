# Frontend alignment sync: survey report

## 0. What was decided for you

**Repos.** The work covers four repos: ins-frontend (PR #27), animals-frontend (PR #339), plants-frontend (PR #69) and the tests repo (PR #227). These are the four repos the alignment branch changes, and each has an open alignment pull request. The workspace repo only holds the programme's state.

**Precedence.**
1. Sam's rulings of 24 September.
2. main, for behaviour.
3. The alignment ledger (stages.json), for structure and naming.
4. The branch's code as it stands.

In short, main decides what the code does and the ledger decides where it lives. Where a verifier disproved a survey claim, the verifier's finding was used.

**Direction: merge main into the branch in every repo.** Do not replay the branch onto main.

| Repo | main since fork | Branch since fork | Merge conflicts | Replay conflicts |
|---|---|---|---|---|
| ins | 16 commits, 55 files | 34 commits, 271 files | 31 files, 36 hunks (13 content conflicts, 18 files the branch moved and main edited) | Stopped after 3 of 30 commits. All 3 conflicted: 12 files, 14 hunks, with the deepest restructuring still ahead |
| animals | 7 commits, 189 files | 19 commits, 101 files | 12 files, 21 hunks | 14 files, 22 hunks, across 4 of 15 commits |
| plants | 11 commits, 145 files | 13 commits, 54 files | 6 files, 9 hunks | 7 files, 11 hunks, across 4 of 12 commits |
| tests | 9 commits, 40 files | 7 commits, 8 files | 1 file, 1 hunk | 1 file, 1 hunk |

Why a replay loses:
- **The Files changed tab is the same either way.** GitHub compares against the merge base. After a merge, that base is main's tip, so the tab shows current main plus the restructure. Measured: animals shows 100 files whether merged or replayed, and plants shows 54.
- **A replay needs a force-push or a new branch.** Force-pushing is forbidden. A new branch name would have to be used in all four repos, because the stack's `--branch` probe needs the same name everywhere. That means four new pull requests.
- **A replay rewrites every commit SHA the ledger cites.** That is 15 in animals, 12 in plants and 5 in tests. It also throws away the green CI on each stage commit.
- **A replay throws away merge work already done by hand.** That includes the port of the handshake QA fix into ins's aligned tree (merge 1446fcc).
- **A merge fits how the branch already works.** The branch already carries earlier merges of main in every repo.

**ins main has moved since the brief.** The dev-only address lookup spike landed as ins 0.22.0. ins main is now 16 commits and 55 files ahead, not the 9 commits and 39 files the brief measured.

## 1. Questions for Sam

Each question has a default. The default gets built if nobody answers.

1. **Open question 29: should ins take the journeys' full countries reader and their export-block filter?**
   - Default: no. ins keeps its narrower reader, as stage s19 decision D4 ruled. The sync neither adds nor removes reader surface.
   - Touches: inc-014, which is blocked.
   - Sides: the alignment ledger (s19 D4) against the brief, which says the question waits on Sam.
2. **May the four pull requests leave draft and be requested for review?**
   - Default: they stay drafts until you say so.
   - Touches: inc-015, which is blocked.
   - Sides: your ruling that the branch is to merge, against the rule that nothing merges without you.
3. **Should the spike's dev/local check live in the spike's own folder, or on the shared run-mode service?**
   - Default: in the spike's own folder. The run-mode service stays identical in all three frontends.
   - Touches: inc-007 (the run-mode file in the merge) and inc-008 (the spike wire-in).
   - Sides: main put an extra export on the run-mode service. The ledger (stages s03 and s18) made that file identical across ins, animals and plants.
4. **Should ins bring back the `#/` import alias now, or should main's new files use the branch's relative imports?**
   - Default: relative imports. Bringing back the alias stays a separate decision that can be reversed later.
   - Touches: inc-007 and inc-008.
   - Sides: main's new files use `#/`. The ledger removed the alias.
5. **Should the tests fixture read each service's development cookie name from that service's own config, rather than from a lookup in the fixture?**
   - Default: a small lookup in the fixture, used for ins and plants. animals keeps the plain `sid` default.
   - Touches: inc-004.
   - Sides: the handshake QA survey against stage s24, which parked a redesign of the shared cookie-name override.
6. **Is SonarCloud Automatic Analysis switched off for ins-frontend?** You can check this under Administration, then Analysis Method.
   - Default: assume it is off. Update the Automatic Analysis file for parity with plants only, and say so in the PR body. If it turns out to be on, treat the change as a real quality-gate fix.
   - Touches: inc-002.
   - Sides: the survey called this a live gate gap. The verifier found the CI scan was already live, so Automatic Analysis is very likely off.
7. **Should the dev-only spike page get a Playwright fit spec on the branch?**
   - Default: no. It is a temporary dev-only page, and main shipped it without one.
   - Touches: inc-008.
   - Sides: stage s21 put a fit spec beside every feature controller. main shipped none.

## 2. What precedence settled

The verifier overturned a survey on each of these:

- **Co-residency suite.** The survey listed it as a clean merge. It actually fails in both journeys: nothing registers a session strategy for the branch's session-gated routes, and it pins the deleted `/signout` route. Both journey merges now repair it. plants gets a copy of animals' test session helper.
- **Sign-in controller import in animals and plants.** Git brings in main's new set-free import and drops `base`. Two failure paths that only the branch has still call `base()`, so they would throw on a real sign-in failure. In plants this happens silently, with no conflict marker. The resolution imports the set-free helper and shared copy only, and routes all four failure paths through them.
- **Tests repo `auth-state.ts`.** The two sides merge with no conflict marker, but the result is wrong. The type loses plants' cookie field, so the plants entry no longer compiles. The cookie-name function never reads that field either, so plants would fall back to `sid` and collide with animals. The handshake QA survey's reading beat the security-coverage verifier's reading, because it read the whole function. The resolution keeps main's host-based cookie name and extends it to plants.
- **Spike gate placement.** The survey put the dev/local check in the static route list. That list is evaluated once, when the module loads. The check now runs when the service routes register, inside the sign-in-enabled block, as main's did. main's ported tests depend on that.
- **Resurrected ins files.** The survey treated main's edited add-address and home controller tests as plain deletions. They are actually conflicts where main edited files the branch had deleted, and the trial merge brings them back with `#/` imports that cannot resolve. Both are deleted. The same applies to the old per-page router plugin. On top of that, main's address-book paths change brings back 16 dead files that duplicate the branch's own single source of paths. The merge deletes them all.
- **Routes barrel alias.** The survey renamed the export inside main's per-set gateway file. That breaks your ruling to adopt EUDPA-619 as it stands. main's gateway files now stay exactly as main has them, and the routes barrel re-exports the gateway under the shared name. This applies in animals and plants.
- **Swapped attribution.** In animals' three forged-request controller tests, the survey credited both sides to main. In fact the session helper is the branch's and the set-prefixed mount is main's. The resolution keeps both: session helper first, then main's prefixed mount.

Settled with no change of direction:
- **animals' reference-data 503 test.** Keep the branch's test over main's version, which stubs fetch. The recorded reason is that the branch removed the flake's cause and all three repos now share one test text. It is not a breach of the no-fetch-stub rule, which only applies to ins.
- **plants still has the reference-data 503 flake that animals fixed.** A follow-up row fixes it.
- **Tests repo sign-in spec.** Only one line needs a hand decision: the sign-out link check. Git already applies main's other three additions.
- **animals' date guard.** It takes main's comment wording, which is the accurate one. plants is left for later.
- **plants' error helper.** Import `chromeFor` and `sharedCopy` only. Keeping `base` would fail lint.
- **ins dashboard list test.** Keep main's `afterEach`. Two of main's new tests change the mocked base URL and need it reset.
- **Sign-in error page change.** It applies to animals and plants only. The survey said ins's sign-in changed too, but the relevant ins commit does not touch it.
- **ins config.** The URL format change merges with no marker. Only the run-mode and environment block needs resolving.
- **animals config.** The config file merges clean. Only the config test file conflicts, because both sides created it.
- **ins lockfile conflict.** Only the Playwright bump caused it, not the Sonar change as well.
- **ins lockfile regeneration.** Call the pinned npm explicitly. A plain install uses whatever npm is on the machine.
- **Tests repo package change.** main also bumped the Playwright CLI from 0.1.14 to 0.1.21.

## 3. Already met

The merge carries these in. Each merge row must show they survived.

- **req-003:** in ins and animals, a push from a Claude Code session runs the real SonarCloud quality gate and is blocked if it fails. The merged hook matches main exactly.
- **req-005:** main changed no CI workflow file in any of the four repos.
- **req-010:** on animals' Amend pages, a country or port code that has dropped out of reference data is cleared with a "no longer available" error.
- **req-011:** on plants' origin and arrival-details pages, a stale country or landing code is cleared in the same way, respecting the potato commodity gate.
- **req-013:** picking any of animals' six shipped transporters now sends an ISO country code.
- **req-016:** ins refuses to start with a malformed address book or animals frontend URL. The test file lands clean.
- **req-019:** animals' party-picker test covers all five party types.
- **req-020:** the end-to-end suite proves the ins add-address link for all five party pickers, with the right gating on CDP and locally.
- **req-022:** main's ZAP and accessibility work in the tests repo lands intact.
- **req-026:** ins's merge keeps the branch's run-mode service unchanged.
- **req-039:** the tests repo's URL layer runs on the per-set prefixes.
- **req-040:** every other animals and plants feature test takes main's URL-prefix edits exactly as main has them.

## 4. The increments

| id | Title | Acceptance | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | Pre-align: Playwright 1.63 in all four repos | 3 | ins, animals, plants, tests | none | todo |
| inc-002 | Pre-align: ins's SonarCloud treats the Playwright suite as tests | 5 | ins | none | todo |
| inc-003 | Pre-align: animals' date guard says what it guards against | 2 | animals | none | todo |
| inc-004 | Merge main into the tests repo | 7 | tests | inc-001 | todo |
| inc-005 | Merge main into plants | 8 | plants | inc-001 | todo |
| inc-006 | Merge main into animals | 9 | animals | inc-001, inc-003 | todo |
| inc-007 | Merge main into ins, with its links into live animals | 7 | ins | inc-001, inc-002 | todo |
| inc-008 | Wire in: ins's dev-only address lookup spike in the aligned structure | 6 | ins | inc-007 | todo |
| inc-009 | Wire in: ins's add-address form is never replayed from the browser cache | 3 | ins | inc-007 | todo |
| inc-010 | Follow-up: plants' error-page tests stop depending on local reference data | 3 | plants | inc-005 | todo |
| inc-011 | End to end: the four branches work together, locally and in CI | 5 | ins, animals, plants, tests | inc-004 to inc-010 | todo |
| inc-012 | Merge readiness: the alignment report proposes the merge | 5 | workspace only | inc-011 | todo |
| inc-013 | Merge readiness: the four pull requests propose the merge | 5 | ins, animals, plants, tests | inc-012 | todo |
| inc-014 | Open question 29: ins's countries reader surface | 1 | ins | none | blocked |
| inc-015 | Lift the drafts | 1 | ins, animals, plants, tests | inc-013 | blocked |

There are 15 increments: 13 to do and 2 blocked on you.

The merges run in this order: tests, then plants, then animals, then ins. plants goes before animals as the trial run for the per-set composition pattern: the router gate, the barrel alias, the set-free sign-in error page and the co-residency repair. It is the smallest journey merge.

There are 57 requirements:
- 52 adopted, of which 12 are already met
- 4 out of scope
- 1 open question

## 5. Coverage

The survey split main's changes into 11 clusters. In this table, "Added" counts claims that the verifier found and the survey had missed.

| Cluster | Claims | Held | Added | Resolutions held | Requirements backed | Corrections |
|---|---|---|---|---|---|---|
| Playwright 1.63 | 5 | 5 | 2 | 5 of 5 | 6 | Tests repo CLI bump; call the pinned npm explicitly |
| Sonar pre-push gate | 3 | 3 | 2 | 2 of 2 | 5 | None; plants is out of scope |
| Playwright suite counted as tests (EUDPA-618) | 6 | 5 | 2 | 2 of 3 | 4 | Automatic Analysis premise refuted |
| Stale reference-data codes (EUDPA-573) | 5 | 5 | 1 | 15 of 18 | 7 | Swapped test attribution; countries on first read is an ins-only change |
| Transporter country code (EUDPA-620) | 3 | 3 | 0 | none needed | 1 | None |
| Reference-data 503 test stub | 4 | 3 | 1 | 1 of 1 | 4 | Reason is shared test text, not the no-fetch-stub rule; plants still has the flake |
| Handshake QA (EUDPA-333) | 7 | 7 | 1 | 11 of 11 | 9 | animals config is not in conflict |
| Tests security coverage | 5 | 5 | 2 | 2 of 2 | 5 | Overturned on the cookie fixture; the sign-in spec needs one hand-edited line |
| Address lookup spike (EUDPA-390) | 17 | 17 | 3 | 3 of 5 | 8 | When the gate runs, the display surface, the test helper, the config marker |
| Address-book paths (EUDPA-311) | 5 | 5 | 0 | 20 of 21 | 3 | Cause of the lockfile conflict |
| Per-set URL prefixes (EUDPA-619) | 8 | 6 | 14 | 20 of 27 | 22 | Barrel alias, co-residency, sign-in import, resurrected files, set-prefixed dashboard 404, `/signout` mentions |
| **Total** | **68** | **64** | **28** | **81 of 95** | | |

The per-set URL prefixes cluster needed the most correction. Its verifier added 14 claims, and a quarter of its planned resolutions changed.

Several requirements are backed by more than one cluster:
- req-042 (merge the tests repo) and req-056 (merge animals) draw on four or five clusters each.
- req-044 (the report proposes the merge) draws on four.
- req-021 (the per-service sign-in cookie) draws on the handshake QA and security-coverage clusters. They disagreed, and the handshake QA reading won.

These rest only on a verifier's added claim:
- req-015: plants' 503 flake
- req-041: the three forged-request tests
- req-033 and req-052: no `/signout` outside the OIDC module
- req-048 and req-054: the set-prefixed dashboard answers 404 when sign-in is off

None of the requirements is marked as inferred.

## 6. Out of scope

- **plants' pre-push quality gate (req-004).** plants main still runs the unlicensed no-op Sonar Stop hook, and so does the branch. main decides behaviour, and plants' main has not taken the fix. Raise it as an ordinary fix against plants main, separate from this sync.
- **ins duplication exemptions for copy decks and address-book stub seeds (req-009).** The Playwright suite fix does not need them to pass the gate, and nobody has asked for them.
- **Stale-code warnings on the hub's Completed status and the check-answers card (req-012).** The stale reference-data fix deliberately kept current behaviour there. No alignment stage touches those pages.
- **plants' date guard wording (req-036).** It is not in conflict. Flag it for the next plants and animals byte-equality pass.
- **ins's countries reader surface (req-047).** This is open question 29. A blocked row records it, and it is not built.

## 7. Corrections to the handover brief

- **Countries loading on first read is an ins-only change.** animals and plants already loaded countries on first read on main before the fork. The report and the PR bodies should say ins only.
- **The reference copy of the workflow is at** `workareas/shared/frontend-alignment/frontend-alignment.reference.js`.
- **The PR checks helper is** `tools/github-actions/wait-for-pr-checks.sh`.
- **ins is pinned to npm 11.6.2 on the branch.** The pin metadata is back, but stage s20 removed the pinned-install script. Every ins lockfile regeneration must call the pinned npm explicitly, then run a clean install.
- **ins main has moved.** It is now 16 commits and 55 files ahead, not 9 and 39, because the address lookup spike landed.
