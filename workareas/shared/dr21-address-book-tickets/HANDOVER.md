# DR2.1 address book — handover (2026-10-19, updated 2026-10-27)

## START HERE (2026-10-27): ticket 4 (EUDPA-710) built, at its gate

Tickets 1 to 3 are merged. Ticket 4, the list, is fully built: inc-063, inc-069 and inc-202 are `done`, CI is green on every PR, and every branch is pushed. Its seven PRs are ready to agree with the team, with final descriptions written on 27 and 28 October:

| PR | Holds |
|---|---|
| [address-book #18](https://github.com/DEFRA/trade-imports-address-book/pull/18) | inc-069: the widened search and `pageSize` 1 to 100, default 25. **Merge first** |
| [ins-frontend #65](https://github.com/DEFRA/trade-imports-ins-frontend/pull/65) | inc-063, inc-069, inc-202 |
| [ins-tests #53](https://github.com/DEFRA/trade-imports-ins-tests/pull/53) | inc-063, inc-069, inc-202 (also merges `main`) |
| [performance-tests #25](https://github.com/DEFRA/trade-imports-performance-tests/pull/25) | inc-202 |
| [animals-frontend #446](https://github.com/DEFRA/trade-imports-animals-frontend/pull/446) | the address book client's page size docs; the picker's page arithmetic named, not commented |
| [plants-frontend #128](https://github.com/DEFRA/trade-imports-plants-frontend/pull/128) | the same as animals #446 |
| [workspace #172](https://github.com/DEFRA/trade-imports-workspace/pull/172) (draft) | the spec, the theme backlog, `snagging.md`, `deferred.md` |

**Next, in order:**
1. Get the designer's answers to S-01, S-02 and S-03 in `../design-release-2-1/snagging.md`. Apply each on `feat/EUDPA-710-design-release-2-1-address-book-list` and move it to "Settled".
2. Agree the seven PRs with the team, mark #172 ready, and merge them together, address book first.
3. Ticket 5 (EUDPA-706, journey add page: inc-077, 078, 082, 080). Open `feat/EUDPA-706-design-release-2-1-address-book-journey-add` in its repos with draft PRs, the workspace one **from `main`**. Pull every clone, then launch the loop with `lifecycle: 'branch'` one increment at a time.

**Changed on 27 October:**
- **The workspace branch now comes from `main`.** The theme's backlog has been on `main` since #157, so planning moved from `chore/EUDPA-707-design-release-2-1-address-book-backlog` (built on Sam's combined branch, now history) to `feat/EUDPA-710-…-list`, which is also EUDPA-710's spec PR. Decision 3 below no longer applies: build runs commit straight to a ticket's main-based workspace branch, and nothing is moved by hand. We no longer need Sam to merge `main` into `feat/NO_JIRA-design-release-2-1`.
- **inc-069's page size goes on the request** (decided by Paul, for the team). cv-025 had no recorded reason, and a server-wide 8 broke the animals picker's `sliceAt`. Recorded in the row's notes.
- **Build loop gates now run detached** (workspace #170, merged): a gate longer than about 40 minutes used to be killed by the Bash tool's limit on background commands. `gate-wait` reports `GATE_DIED` at once.
- **Keep the clones on `main` current before a run.** Two baselines went red on 27 October because animals-frontend and backend were behind `main` (EUDPA-296's direct-to-uploader uploads) and the stack lacked their nginx sidecar. Pull every clean clone on `main`, and merge `main` into the ticket's tests branch, before launching.
- **Docker's disk filled up** (58 GB, 0 free), which killed MongoDB at stack start. `docker builder prune -f` freed 13 GB. Check `docker run --rm alpine df -h /` if the stack will not start.
- **This machine is not tuned yet:** run `tim build tune --write` between increments (about an hour, needs the stack).

**Follow-ups, not blocking** (all in `../design-release-2-1/deferred.md`): the animals picker asks for its own page size; the k6 worst-case search follows the wider search; tidy `addressCountFrom`; keep or drop the API's countryCode-only path; an address book API spec capability; shared add-form test builders in four ins-tests specs; the `sources.json` prototype path.

Resume prompt: *"Read workareas/shared/dr21-address-book-tickets/HANDOVER.md and carry on with the next step."*

## Ticket 3 (EUDPA-709) — built 2026-10-22, at its gate

- Tickets 1 and 2 merged (#57/#35/#126, #63/#40/#132), and #136 too. Every clone pulled to main. Main merged into `chore/…-backlog` as `7803b041`; inc-073 recorded as `bae04fbe` (both local, not pushed). Jira EUDPA-709 is In Dev (the user moved it).
- inc-073 landed in run `wf_5bdf0e54-e31` (branch lifecycle, one increment): ins-frontend `6e0ce28` on **#64**, ins-tests `3cf7101` on **#50**, CI green on both (draft). Its spec commit `f0c6c410` is cherry-picked onto a main-based workspace branch of the same name, **#146** (draft); `tim spec lint` 0, `tim spec gaps --none` 0.
- **Design answers, 2026-10-23, applied on ticket 3's branches:** 'Name or organisation' on every address page and 'Enter a name or organisation' for a blank name (ins-frontend `38984cc`, `e3b4ff3`; the address-book API too, new draft **address-book #17**); 'Select a country' on the add page (`37f5a1a`); the delete warning 'Deletions are permanent and you cannot undo this.' (`5927cfa`), kept as regular text. ins-tests `7f985f6`, workspace `c040ca5d`..`a7612daf`. EUDPA-708 review items #28 and #44 are closed with the designer's answers. ins-tests' uncommitted copied-list tidy in `address-book-edit.spec.ts`, left by the build loop, went into `7f985f6`. `cd280ac` is settled: the ticket 2 merge took main's seed-context fixture.
- **Next: the gate.** Agree #64, #50, #146 and address-book #17 with the team, write their final descriptions, mark ready, merge together. Then ticket 4 (EUDPA-710, `feat/EUDPA-710-design-release-2-1-address-book-list`): open its branches and draft PRs with an empty commit (insfrontend, tests: check inc-063/069/202's `repos` and narrow the envelope), pull every clone, take down any hand-started stack, launch one increment at a time.
- The new edit E2E specs create about a dozen addresses and delete two: the address clean-up follow-up below now covers them too.
- The run's follow-ups (not built): fold the add ('Select one') and edit ('Select a country') blank-country copy into one key after asking design; ins-frontend `nunjucks.js` names a missing `common/components` root; `docs/features.md:58-59` and `docs/testing.md` list the wrong fit fixtures and spec count; `ORGANISATION_ID_HEADER` still copied in three test files; absence assertions in view/delete/add controller tests and `fit/address-book-list.js:8` against the positive-assertion rule; explanatory comments in `expect-address-summary-links.js:10`, ins-tests `address-book-add-form.spec.ts:33` and `form-page.ts`; ins-tests `edit-page.ts` and `address-page.ts` open pages two ways.

## Style fixes on ticket 2 (2026-10-22)

- The code-style review of EUDPA-708 under #136's rules is fully triaged (ins-frontend 157 Fix, 4 Won't Fix, 2 Discuss for the designer; ins-tests 43 Fix). The fixes run one implementor per file, in the order of `style-items.sh EUDPA-708 --filter fix --status not-done --by-file --json`, with E2E scoped to the address-book and page-title specs; one full E2E run comes after the last file. Commits are local, not pushed. #136 now has the `design` finding category; the team's feedback on it was favourable.
- **Follow-up — E2E specs leave their addresses behind (likely root cause of the flake below):** on 2026-10-22 the shared E2E organisation's address book on the local stack held about 2,778 addresses — roughly one set per run from about 86 runs ("Newer Than Target" ×424, "Delete Summary Farm", "View Full Farm" and so on ×~86 each), because specs create addresses there and never delete them, and the local stack's database survives between runs (CI starts fresh). The animals contact page then lists them all and the seeded "Animal and Plant Health Agency" contact can drop out of what it shows (`addresses-edit.spec.ts:162`). Fix: every spec that creates an address deletes it afterwards or uses its own organisation, ticket 2's new specs included. The stack was restarted with fresh volumes the same day to clear it; this note is the underlying fix, still to do.
- **Consider afterwards — animals frontend flake, not caused by ticket 2:** the animals frontend sometimes answers a seeding POST (`POST /live-animals/notifications/<ref>/origin`, seen in `addresses-edit.spec.ts`) with a 500. Its log says only `TypeError: fetch failed`, with no target or cause, and no other container logged an error at that moment. First step: make the animals frontend log the failed call's target and cause, then find which connection breaks. A second flake, "socket hang up" from the animals frontend on a seeding request, is probably the same cause: the animals frontend drops a connection. ins-tests `cd280ac` (local) gave each test its own seed context on the theory of a stale kept-alive socket, but the hang-up came back afterwards (group 13, on `POST /live-animals/notifications`), so that theory is wrong. Decide whether to keep `cd280ac` (better test isolation) or revert it, and drop its commit message's claim. No container restart, OOM or error log lines up with either failure. A third symptom showed on 2026-10-22: a seeding `POST …/consignment/contact/select` answered 400. All three are in animals seeding (`flows/animals/seeded-journey.ts`, via `FrontendFormClient`), most often in `tests/animals/e2e/features/address-book/addresses-edit.spec.ts:162`, and they recur with ticket 2's ins-frontend change reverted. It is not seeding-specific: a journey page (`GET /live-animals/notifications/<ref>/commodities`, in `addresses-picker.spec.ts`) also answered 500 with `TypeError: fetch failed`, so the animals frontend's own outbound calls fail intermittently, whatever the request.

## Rules PR and ticket 2 refactor (2026-10-21)

- Ticket 2's ins-frontend #63 gained five behaviour-neutral refactor commits under #127's house rules (`2386e64`..`57bea7c`, all CI green, approvals stand). The user is not merging ticket 2 until the rules PR below is agreed and its rules are run over ticket 2's changes.
- Rules PR: **workspace #136** (draft), branch `chore/NO_JIRA-naming-rules-and-distil-mechanisms`, for the user to share with Sam. The workspace checkout is ON THAT BRANCH: switch back to `chore/EUDPA-707-design-release-2-1-address-book-backlog` before building ticket 3.
- Not in #136: the `…OrNull` style (team discussion) and an ESLint rule against `h` (one PR per frontend; counts: ins 8, animals 175, plants 127, admin 14).

## Done 2026-10-21

- Steps 1–3 below are done. Main merged into the backlog branch as `21b2f8d5` (local, not pushed; tim needed `npm ci` for #127's `jscpd`). A style review on #127's rules found 38 issues before the rework, 52 after (names churn, `standInOrigin` vs "no magic strings"), 15 on two untouched files; results are in the review-gaps Claude Doc's "Update, 21 October" section. The repo copy on main (`workareas/shared/review-gaps-eudpa-708/`) is not yet updated to match.
- `…OrNull` naming: the user's preference, held back for team discussion.
- Next: ticket 3 (EUDPA-709) — narrow the envelope's `repos`, pull every clone, launch the loop one increment at a time. Expect the stricter #127 reviewers to raise pre-existing debt in the address-book files (`orgId`, `h`, unlogged redirects, duplicate view/delete handlers).

## Superseded: START HERE (2026-10-21)

Ticket 2 (EUDPA-708) is built and reviewed: PRs ins-frontend #63, ins-tests #40 and workspace #132 are green drafts with up-to-date descriptions and replies to the user's review. Next, in order:

1. **Merge `origin/main` into `chore/EUDPA-707-design-release-2-1-address-book-backlog`** (and keep the user's uncommitted `scripts/stack/dev-service.sh` edit). The branch last shared history with main on 2026-10-16, so the EUDPA-708 build loop ran on pre-#127 rules: Sam's PR #127 (`7120acf2`, merged 2026-10-19 15:15 BST) added `.claude/rules/code-quality.md` (names predict what they return and change; doc comments only for an exported public API's contract), a predict-then-compare naming step in the style reviewer and the loop, and more. Expect conflicts only in `openspec/` and `workareas/`. Delete the untracked duplicate `workareas/shared/review-gaps-eudpa-708/` first — main already has that file.
2. **Prove whether #127 is strong enough:** run the loop's style reviewer on main's rules against ins-frontend `return-to.js`, `address-countries.js` and the view and delete controllers at `092e6cc` (before review), then at `7d9df5c` (after). Proposals 2–6 of the review-gaps doc look covered by #127; proposal 1 only partly (no `…OrNull`, parameter-naming or placeholder-scope rule); proposals 7–8 (distil: prototype handler code becoming requirements) are not covered at all.
3. **Update the review-gaps doc** (Claude Doc https://claude.ai/code/artifact/561d9daa-8fd3-4580-8db5-a2768c89d9ea and `main:workareas/shared/review-gaps-eudpa-708/review-gaps-eudpa-708.md`, discussed with Sam) with what #127 already covers and what the test shows is still missing.
4. Then ticket 3 (EUDPA-709): narrow the backlog envelope's `repos` to its rows' repos (decision 7), pull every clone under `repos/`, and launch the loop one increment at a time.

Resume prompt: *"Read workareas/shared/dr21-address-book-tickets/HANDOVER.md and carry on with the next step."*

## Decided (by the user, in order)

1. The Design Release 2.1 address-book theme is delivered as **six sequential tickets**, each on its own branch `feat/<KEY>-design-release-2-1-address-book[-slug]`. Team confirmed 2026-10-19.

   | # | Ticket | Rows (backlog `workareas/shared/design-release-2-1/themes/address-book/backlog.json`) |
   |---|---|---|
   | 1 | EUDPA-707 | inc-060, inc-062 (+ inc-059 until step A below is done) |
   | 2 | EUDPA-708 view and delete | inc-064, 065, 066 |
   | 3 | EUDPA-709 edit | inc-073 |
   | 4 | EUDPA-710 list | inc-063, 069, 202 |
   | 5 | EUDPA-706 journey add page | inc-077, 078, 082, 080 (706 was amended to this scope) |
   | 6 | EUDPA-711 types and uses | inc-067, 068, 061, 070, 071, 079 (+ inc-059 after step A) |

   One backlog, not six themes (tim refuses overlapping themes): rows ordered by ticket, a `gate` on each ticket's last row, tickets + branches in the envelope's `tickets`. Build each ticket with the loop's `lifecycle: 'branch'`.
2. **Option C** (done): the "Choose an address type" step (inc-061) moved from EUDPA-707 to EUDPA-711 — a type question that nothing saves read as a bug.
3. **Option B for the workspace** (done): a ticket's openspec goes on a **main-based** workspace branch with the same name as the service branches (PR to main, merged with them); backlog/planning lives on `chore/EUDPA-707-design-release-2-1-address-book-backlog` on top of `feat/NO_JIRA-design-release-2-1`. The build loop still commits both to one branch: move the openspec part by hand at the end of each ticket (loop change deferred).
4. **Address type and uses become required in the API** once the screens require them (EUDPA-711). No known use case for an address with no type after the backlog: all CDP non-prod address data has a 7-day TTL (cdp-app-config, EUDPA-644, since 2026-10-04; prod has none); addresses created before 2026-10-04 have no `expireAt` and never expire (a one-off delete would clear them if they matter). Transporters, when unblocked, are a new type value, not null.
5. **NEXT — approved, not started: move inc-059 (typed address record) from EUDPA-707 to EUDPA-711, built REQUIRED from the start.** Reason: nothing in tickets 2–5 uses it (inc-073's dependency on it is stale — its edit-keeps-type criterion already moved to inc-070); building optional fields now and making them required in 711 is two changes to one API.

6. **Required flips at inc-070, not inc-059** (decided 2026-10-19): inc-059 adds type and uses first in ticket 6, optional on the wire; inc-070, the first row whose add form sends them, makes both required (400) and changes every creator. The ticket merges as one, so the released API changes once.

7. **Narrow the envelope's `repos` per ticket** (decided 2026-10-19): the branch lifecycle requires every envelope repo on the ticket's branch with an open PR, so before each ticket the envelope's `repos` is cut to the repos that ticket's rows build, and the loop's `repos` arg matches. Ticket 2 (EUDPA-708): `insfrontend`, `tests`. The full map, to restore from:
   ```json
   {"frontend":{"path":"repos/trade-imports-animals-frontend","github":"DEFRA/trade-imports-animals-frontend"},"insfrontend":{"path":"repos/trade-imports-ins-frontend","github":"DEFRA/trade-imports-ins-frontend"},"addressbook":{"path":"repos/trade-imports-address-book","github":"DEFRA/trade-imports-address-book"},"tests":{"path":"repos/trade-imports-ins-tests","github":"DEFRA/trade-imports-ins-tests"},"perftests":{"path":"repos/trade-imports-performance-tests","github":"DEFRA/trade-imports-performance-tests"}}
   ```

8. **EUDPA-721, last, after EUDPA-711** (raised 2026-10-20): snag S36 from the Design Release 2.1 snag review — the live-animals party pickers' address table full width, address lines on separate lines, and a 'View' link to the INS address book in place of 'View details'. It overlaps inc-086 and inc-090 in the parent backlog's consignment-parties theme (neither covers the width); if that theme lands them first, check the criteria and close EUDPA-721 with nothing to do. Not a row in this backlog. The user is talking to the consignment-parties devs.

## Ticket 2 (EUDPA-708) — started 2026-10-19

Branch `feat/EUDPA-708-design-release-2-1-address-book-view-and-delete` in ins-frontend and ins-tests, draft PRs ins-frontend #63 and ins-tests #40; Jira In Dev. Built one increment per launch (workflow size guideline "large", under 50 agents). First launch `wf_e9438dfd-46c` stopped at branch-failed before decision 7; the second, `wf_5dc365ec-139`, at baseline-red because six service clones on main were behind origin (animals-backend lacked EUDPA-614) — **pull every clone under `repos/`, not just the ticket's, before a launch**. All archived.

**All three rows landed (2026-10-19/20), CI green on #63 and #40:** inc-064 `wf_5c6e8b3a-9e5`, inc-065 `wf_ebd46aaa-232`, inc-066 `wf_015108d2-4e3`. Backlog committed on `chore/…-backlog` (`48be94c7`, not pushed). The three spec commits are cherry-picked onto a main-based workspace branch of the same name in worktree `~/git/defra/trade-imports-workspace-708` (`93b64e7a`, `ab064f4f`, `9126adf7`; one conflict kept main's REQ-INS-ADDR-021 with its field widths); `tim spec lint` 0 findings; `tim spec gaps --none` 0 for ins/address-book and ins/page-titles. Pushed: workspace spec PR **#132** (draft); #63 and #40 descriptions written; worktree removed.

**Rulings 2026-10-20, from the user's review (all pushed, CI green):**
- The delete summary shows every filled field: the prototype's repeated-line removal is gone (code, tests, SCN-INS-ADDR-011-D, inc-065's criterion).
- Every address book banner names the address as it is stored — no sentence-casing (inc-065 built; inc-073 and inc-080 reworded). The delete page no longer re-trims; add and edit already save trimmed values.
- `countryNameOf` is now `countryLabelOf` (name, else the code). The list's own copy (`view-model/list.js:70`) is left for ticket 4.
- Each frontend validates the whole address it saves, country included (animals and plants do the same for in-place edits). inc-073 now keeps a blank Country option only when the stored country is not offered, and refuses an unknown country; inc-078 refuses one too. EUDPA-709's description updated.
- Lint gotcha: ins-frontend #58 added `code-quality/no-tracking-references` (no release names in test titles) and CI runs `format:check` — run both before pushing. Remaining: the inc-066 review checkpoint with the team, then mark #63, #40 and #132 ready and merge them together; push `chore/…-backlog` (`48be94c7`). Ticket 3 (EUDPA-709): narrow the envelope to its rows' repos first.

## Progress on step A (2026-10-19)

**Step A is complete.** Pushed 2026-10-19 (address-book force-pushed), PR titles and bodies updated, and every check on #14, #35, #126 and ins-frontend #57 is green. The worktree is removed. The `chore/…-backlog` branch commit (A4 + openspec) is local only and not pushed. Next: EUDPA-707's PRs go to review; then ticket 2 (EUDPA-708), built with the loop on its own branch.

Details:
- A1: address-book branch rebased to drop `19cf03b` (now `ab7e29c` → `5fa80cb`; old tip kept as local branch `backup/EUDPA-707-before-drop-inc-059`). `mvn clean verify` green (227 tests). **Needs `git push --force-with-lease`.**
- A2: ins-tests `c69eafa` reverts `daa3d83` (branch has merges, so no rebase). typecheck, lint, prettier clean.
- A3: workspace PR #126 branch, commit `3c7bbcaf`, in worktree `~/git/defra/trade-imports-workspace-707` (has an empty untracked `repos/` so `tim` accepts it; remove the worktree when done). Also removed on `chore/…-backlog` (decision: the programme copy must not claim behaviour whose row is `todo`). `tim spec lint` 0 findings on both.
- A4: backlog committed on `chore/…-backlog` per decision 6; `tim backlog check` clean; build-order simulation: tickets 2→6 build in order, each stopping at its last row's gate.
- A5: Jira EUDPA-707 (summary + description) and EUDPA-711 (description) updated.
- A6: new PR bodies drafted in the session scratchpad (lost with it). Rewrite them from the old bodies, without inc-059. #14 title → "feat(EUDPA-707): Design Release 2.1 validation messages"; #35 → "test(EUDPA-707): cover Design Release 2.1 messages and the address form"; #126 → "chore(EUDPA-707): spec Design Release 2.1 messages and the add form".

## Next steps (step A = decision 5, which absorbs decision 4)

A1. **address-book PR #14** (`repos/trade-imports-address-book`, branch `feat/EUDPA-707-design-release-2-1-address-book`): remove inc-059 — commit `19cf03b` (record type/uses; `AddressType`, `AddressUse`, `EnumNames`, `EnumNamesValidator`, mapper/response/request fields, `AddressCrudIT`/`AddressUpdateIT` typed cases, `OperatorComplianceIT`, the locked contract `docs/openapi/api-contract.locked.yaml` + `operators.yml`). Keep inc-060's messages (commit `98e3aa2`, which may touch the same `AddressRequest.java`). Run `mvn clean verify`. Commit locally.
A2. **ins-tests PR #35**: remove the typed-record spec (`address-book-typed-record.spec.ts`, from commit `daa3d83`) and anything only it uses. `npm run typecheck`, `npm run lint`, prettier on changed files.
A3. **workspace PR #126** (main-based `feat/EUDPA-707-design-release-2-1-address-book`): remove the requirement "An address can carry its address type and the uses it can be put to" and its six scenarios + coverage from `openspec/specs/ins/address-book/spec.md` and `openspec/coverage/ins/address-book/coverage.json`. `tim spec lint` (0 findings). The same openspec also exists on the `chore/…-backlog` branch — leave it there (it is the programme's copy) or remove it too; decide and say which.
A4. **Backlog** (on `chore/…-backlog`, the local workspace checkout): inc-059 → status `todo`, drop `commit`/`prs`, move into ticket 6 before inc-067; rewrite it so type and at least one use are **required** in the API (400 when missing), dropping its criterion "An address created without a type or uses, and every address saved before this change, is still accepted…"; add that every creator sends them: INS front door (add + journey mode), ins-frontend stub mode, ins-tests fixtures (inc-067), **ins-tests `flows/plants/journey.ts` and `adapters/http/address-book-api-client.ts`**, **ins-frontend `scripts/lighthouse/seed-address.js`**, performance-tests k6 (inc-070). Remove inc-059 from inc-073's `dependsOn` (stale) and add notes. Update envelope `tickets` (1: inc-060, inc-062; 6: inc-059 first). Re-run `tim backlog check shared/design-release-2-1/themes/address-book` and the build-order simulation (each ticket must build in order, gated on its last row).
A5. **Jira** (edit with `~/git/defra/trade-imports-workspace/tools/jira/update-ticket.sh KEY -s … -d - < file`; local copies in `workareas/ticket-creation/`):
   - EUDPA-707 (`dr21-address-book-ins/description.ticket1.jira.txt`): drop the type-fields bullet and inc-059 criterion; summary → e.g. "Design Release 2.1: address book — validation messages and the address form".
   - EUDPA-711 (`dr21-address-book-types-and-uses/description.jira.txt`): add "the address book API stores an address's type and uses, and requires both" + inc-059 criterion.
A6. **PR text**: update #14's title/body (no longer adds type fields), #35's body, #126's title/body. Then ask the user before pushing; after pushing, watch CI as below.

## State right now

PRs for EUDPA-707 (all draft, all checks green before step A):
- https://github.com/DEFRA/trade-imports-address-book/pull/14
- https://github.com/DEFRA/trade-imports-ins-frontend/pull/57 (unaffected by step A)
- https://github.com/DEFRA/trade-imports-ins-tests/pull/35
- https://github.com/DEFRA/trade-imports-workspace/pull/126

Closed: animals-frontend #414 (no 707 change), performance-tests #23 (its branch deleted). No branches exist yet for tickets 2–6. Jira tickets EUDPA-706..711 raised/amended; descriptions in `workareas/ticket-creation/dr21-address-book-*/`. Unrelated: the user's uncommitted `scripts/stack/dev-service.sh` edit in the workspace — leave it alone.

## Gotchas learned the hard way

- **The PR E2E pipeline borrows branches by name**: it checks out the *workspace* repo and *performance-tests* (k6 smoke job) at the PR's branch name if it exists, and uses `ins-tests:<branch>` image if published, else `:latest`. A stale same-named branch breaks every service's E2E. Keep same-named workspace branches current with main; delete (not just close) obsolete same-named branches.
- After pushing ins-tests, wait for its **"Publish Branch Image"** run before re-running service E2E (`gh run rerun <id> --failed`); read the failing *job* name first (smoke vs Playwright).
- GitHub's branch-rename API **closes** PRs whose head is the renamed branch.
- Shell hooks here: no `&&` chains in one Bash call; never `bash <script>` (denied — run scripts directly); use `git -C <path> push`, not `cd …; git push`.
- `SONAR_TOKEN` is not set in this shell, so the pre-push Sonar gate skips; CI's SonarCloud check is the backstop.
