# How to build the split-off themes

Nine Design Release 2.1 themes are split off the main backlog. Each one builds on its own branch, with one draft pull
request per repo. Nothing merges to `main` until Sam checks the finished theme.

## Before you play any theme: the repo extracts are a week behind (2 November)

The 2 November re-distil folded the V4 data fields page in whole — 648 claims where the germinals-only scope had
produced 109 — and the parent `backlog.json` is now 100 rows in 10 themes. **But it reconciled against repo extracts
taken on 26 October**, because at the time `tim distil status` decided staleness from a hash over a source's `kind`,
`locator` and `scope` only, never over the repo's contents, so all 12 repo sources read "verified" and were skipped.

`tim` now records a repo extract's commit and reports the source `stale` when the checkout has moved
(3 November). That protects extracts written from now on, but **not these**: they record no commit, so there is
nothing to compare and they still read `verified`. Until a source is re-extracted, or
`tim distil stamp shared/design-release-2-1 --source repo:<id>` records its commit, the check is silent for it.

Code has landed in five areas since: commodities (EUDPA-617 and follow-ups), the **soft-save reversal**
(`25c23ef8`, inc-232 — already on `main`), the **whole documents theme** (EUDPA-724, plus EUDPA-751, -753, -754),
the address picker (EUDPA-706), and identification and the type-ahead (EUDPA-734, EUDPA-735).

So before playing a theme, do one of:

- **Reset the repo sources and re-distil** —
  `tim distil reset shared/design-release-2-1 --source repo:frontend --source repo:referencedata --source repo:stub --source repo:tests --source repo:perftests`,
  then relaunch `workflow/distil.js`. About four hours.
- **Or verify that theme's rows against current `main` by hand**, as commodities-and-reason was on 2 November.

**Which direction of staleness matters.** A stale "not built yet" is largely self-correcting: the loop plans each row
against the real code, so a row asking for what already exists is caught at plan time. A stale **`blocked`** marking
is not — `tim backlog next` never offers a blocked row, so it silently withholds work. Check the blocked rows first.

Each split theme also has a pick-up list in the report's "For the split branches" section — 126 entries across the
10 themes, which the re-distil never applies to a split backlog. The report re-lists each one at every re-distil
until the theme's `splitOff` pointer takes it in, so nothing is lost by applying a theme's list when it is played.
commodities-and-reason's 19 are applied; the other nine are not.

`tim backlog check` now **refuses** a theme whose pick-up holds requirements it has never placed in a row, and names
them, so playing one of those stops at the pre-flight. Six do today:

| Theme | Requirements it has never placed |
|---|---|
| `type-question-and-templates` | None now: placed on 4 November (req-2136 in the new `type-question` theme) |
| `overview-and-review` | req-905, req-906, req-908, req-931, req-2138 |
| `address-book` | req-611, req-2186, req-2199 |
| `journey-foundation` | req-405, req-582 |
| `origin-page` | req-032, req-2124 |
| `documents` | req-2179 |

`reference-lists`, `arrival-and-transit` and `design-snagging` pass: they have nothing new, only requirements whose
text changed. **Those the check deliberately does not refuse**, because a change may have been judged and declined —
commodities-and-reason carries 10 such on purpose. Read them from
`tim distil coverage shared/design-release-2-1 --json` (`result.backlog.splitOff[].changed`) and judge each.

## Stale branches (ruled 20 October)

Five themes were built on branches that will **not** be merged. Each is now a stale branch: a quarry to take code from,
not something to finish. On 2 November Sam ruled arrival and transit's branch reused instead: it builds on, with `main`
merged in through the loop (see its section below).

| Theme | Stale branch | Rows left | Open PRs to close when the theme is played |
|---|---|---|---|
| Type question and templates (EUDPA-690) | `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | 19 | animals frontend #398, animals backend #106, INS frontend #45, plants frontend #92, tests #20 |
| Commodities and import reason (EUDPA-693) | `feat/EUDPA-693-design-release-2-1-commodities-and-reason` | 13, of which 11 todo | animals frontend #401, tests #23, performance tests #17 |
| Arrival and transit (EUDPA-694) | `feat/EUDPA-694-design-release-2-1-arrival-and-transit` | 3 to build: reused, not stale (2 November); inc-240 landed 3 November | none: the theme builds on these PRs again |
| Origin page (EUDPA-695) | `feat/EUDPA-695-design-release-2-1-origin-page` | 0: retired | animals frontend #403, plants frontend #96, tests #25 (close once design snagging lands) |
| Overview and review (EUDPA-696) | `feat/EUDPA-696-design-release-2-1-overview-and-review` | 21 | animals frontend #404, animals backend #107, INS frontend #51, plants frontend #98, tests #26 |

- **When a theme is played,** cut a fresh branch from `main` after design snagging has landed, with the same name in
  every repo it touches. Use a new name so the stale branch stays as the quarry, for example
  `feat/EUDPA-696-overview-and-review`, and point the theme's `branch` at it then.
- **Salvage, don't merge.** Every row that was `done` on a stale branch and is not fully ported by design snagging is
  back to `todo`, trimmed to what `main` still lacks. Its note starts "Salvage:" and names the commits to take.
- **Port notes are gone.** "Drop at merge", "trim at merge" and "keep main's version at merge" notes no longer apply.
  The `merge` fields on templates rows are cleared.
- **Close the old PRs** in the table above when the fresh branch opens its own. Do not close them before. Delete the
  stale branches only after salvage is done.
- `themes.json` marks each of these themes with `staleBranch`. What changed row by row is in
  [`../snagging/trim.md`](../snagging/trim.md).

Before the performance tests PR #17 is closed, check whether bbc6e24 (EUDPA-676, #21) reached `main` under another
sha: the stale branch carries it.

On the build machine, pull the workspace branch `feat/NO_JIRA-design-release-2-1` first. Then run
`tim workspace branch <theme branch>`, open Claude Code at the workspace root and say the phrase for the theme.

## Taking `main` in while a theme builds

A theme branch is cut from `main` and lives for days, so `main` moves under it. A pull request that conflicts with its
base gets no checks from GitHub at all, so the row cannot be proved and the run stops. The loop now stops such a row at
once as `pr-conflict` rather than spending its CI fix attempts, which makes this a cadence to keep rather than a problem
to spot.

**One merge row per move, played through the loop. Never a hand merge.**

- **Never merge `main` in by hand on a theme branch.** A hand merge is unreviewed, unproved and invisible to the
  backlog, and leaves the next row to discover it. Both of the documents theme's merges were noticed only because its
  pull request stopped running checks.
- **Check before every launch**, in each repo the theme builds:

  ```bash
  git -C ~/git/defra/trade-imports-workspace/repos/<repo> fetch origin
  git -C ~/git/defra/trade-imports-workspace/repos/<repo> rev-list --count HEAD..origin/main
  ```

  Any count above zero, or a pull request GitHub reports as conflicting
  (`gh pr view <url> --json mergeable,mergeStateStatus`), calls for a merge row.
- **Write it as a row and put it before the rows that need it.** One row covers every repo that needs the merge — one
  key per repo in `merge`, each of them also in `repos`. Save the row to a file and add it:

  ```bash
  tim backlog add shared/design-release-2-1/themes/<theme> --from merge-row.json --before <the next todo row> --write --json
  ```

  To set the ref on a row that exists already:

  ```bash
  tim backlog set shared/design-release-2-1/themes/<theme> <id> --merge frontend=origin/main --json
  ```

- **Give the row the resolution, not just the instruction.** The loop plans, reviews and proves a merge row like any
  other, so its acceptance criteria say which side wins in each conflicting file. That is what makes it worth a row
  rather than a hand merge: inc-040's shared FIT helper needed both sides reconciled, and the review caught that the
  import its criteria named was the wrong predicate.
- **`gatePhases` follows the theme.** An `e2e: "ci"` theme's rows carry `gatePhases: []` and prove themselves on the
  pull requests; a merge row in that theme does the same.

The template, from the documents theme's inc-040:

```json
{
  "id": "inc-NNN",
  "title": "The theme branch takes in what main has landed since it was cut",
  "kind": "chore",
  "theme": "<theme>",
  "status": "todo",
  "repos": ["frontend", "tests"],
  "merge": { "frontend": "origin/main", "tests": "origin/main" },
  "gatePhases": [],
  "dependsOn": [],
  "detail": "What has landed on main since the branch was cut, which files conflict, and why each one conflicts.",
  "acceptanceCriteria": [
    "origin/main is merged into the theme branch in <each repo>, as one two-parent merge commit each, with no conflict markers left in any file.",
    "<each conflicting file> keeps <which side's work, named>.",
    "Every pull request reports no conflict with its base, so GitHub runs its checks again.",
    "Every pull request is green."
  ],
  "notes": [],
  "sources": [],
  "requirements": [],
  "openQuestions": []
}
```

Then check it before launching:

```bash
tim backlog check shared/design-release-2-1/themes/<theme>
```

## The business tickets, around every theme

A theme's Jira tickets are filled in automatically from the development work by the `theme-ticket` skill — one Story
per service domain, with acceptance criteria copied from `openspec/`. Run it at three points around the loop. It needs
no approval: the ticket is the thing the business reviews, so it is kept true rather than gated.

| When | Say | What it does |
|---|---|---|
| Before starting the loop on a theme | "the build loop is starting on `<theme>`" | Moves the theme's tickets to **In Dev**. Descriptions are left alone — openspec is written row by row, so a ticket regenerated mid-build describes a half-finished theme. |
| Once the loop has drained the theme | "write the business tickets for `<theme>`" | Derives the theme's scenarios from the commits it produced, splits them by domain, updates the theme's existing ticket as one domain and creates the others. |
| After the theme merges to `main` | "`<theme>` has merged" | Regenerates against `main` so the spec links do not point at a deleted branch, then moves each ticket to **Deskcheck**. |

The loop itself makes no Jira call — `lifecycle: branch` guarantees that — so these run in the orchestrating session
around it, not inside it.

To check nothing has drifted: "which theme tickets are stale". Tickets and their sources live in
[`../tickets/`](../tickets/).

## Journey foundation: EUDPA-691

- **Ticket:** [EUDPA-691](https://eaflood.atlassian.net/browse/EUDPA-691)
- **Branch:** `feat/EUDPA-691-design-release-2-1-journey-foundation`
- **Rows:** 7, all ready.
- **Pull requests:**
  - [animals frontend #399](https://github.com/DEFRA/trade-imports-animals-frontend/pull/399)
  - [INS frontend #46](https://github.com/DEFRA/trade-imports-ins-frontend/pull/46)
  - [plants frontend #93](https://github.com/DEFRA/trade-imports-plants-frontend/pull/93)
  - [tests #21](https://github.com/DEFRA/trade-imports-ins-tests/pull/21)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/journey-foundation, branch lifecycle on
  feat/EUDPA-691-design-release-2-1-journey-foundation"

## Reference lists: EUDPA-692

- **Ticket:** [EUDPA-692](https://eaflood.atlassian.net/browse/EUDPA-692)
- **Branch:** `feat/EUDPA-692-design-release-2-1-reference-lists`
- **Rows:** 3, all ready.
- **Pull requests:**
  - [animals frontend #400](https://github.com/DEFRA/trade-imports-animals-frontend/pull/400)
  - [INS frontend #47](https://github.com/DEFRA/trade-imports-ins-frontend/pull/47)
  - [plants frontend #94](https://github.com/DEFRA/trade-imports-plants-frontend/pull/94)
  - [reference-data #25](https://github.com/DEFRA/trade-imports-reference-data/pull/25)
  - [stub #18](https://github.com/DEFRA/trade-imports-stub/pull/18)
  - [tests #22](https://github.com/DEFRA/trade-imports-ins-tests/pull/22)
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/reference-lists, branch lifecycle on
  feat/EUDPA-692-design-release-2-1-reference-lists"

## Type question: EUDPA-690 (split from templates, 4 November)

- **Ticket:** [EUDPA-690](https://eaflood.atlassian.net/browse/EUDPA-690)
- **Why it is its own theme.** Templates was de-prioritised, so Sam split the "What are you importing?" question off
  it on 4 November ([`../sources/ruling-sam-2026-11-04.md`](../sources/ruling-sam-2026-11-04.md)). The rows moved with
  `tim backlog split … --rows … --to type-question`. The templates backlog keeps a `movedOut` pointer to them.
- **Branch:** `feat/EUDPA-690-type-question`, cut fresh from `main` in the animals frontend, plants frontend, INS
  frontend, tests and this workspace. **It is not merged when the last row lands.** Sam merges it.
- **Rows:** 5, all to do: the type question page (inc-148), Create new on the INS home (inc-149), the origin page's
  Back link and the way back to the type question (inc-150), Back from a review Change link (inc-171) and plants'
  Save and return checks on its commodity type page (inc-247, test-only: `main` already does it). inc-150 and inc-171
  were deferred only because building paused on 12 October; Sam included them.
- **Links between services work in CDP, the local Docker stack and the CI Docker stack.** Every row that adds a link
  or redirect between the INS, animals and plants frontends carries a criterion for it, and takes the address from the
  service's own config. Two CDP settings are missing and only Sam can add them: see the re-analysis.
- **Re-analysed against `main` on 4 November:**
  [`../reanalysis/REPORT-type-question-2026-11-04.md`](../reanalysis/REPORT-type-question-2026-11-04.md). Each row's
  "Salvage:" note names the stale-branch commits to take.
- **Loop args:** [`type-question/build-args.json`](type-question/build-args.json): `rigour: full`, `e2e: local`.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/type-question, branch lifecycle on
  feat/EUDPA-690-type-question"

## Templates: EUDPA-690 (parked, 4 November)

- **Parked.** Templates is de-prioritised. Its rows stay in `type-question-and-templates` and are not built now.
- **Stale branch:** `feat/NO_JIRA-design-release-2-1-type-question-and-templates`. Salvage from it when templates is
  played, on a fresh branch from `main` cut after the type question theme has landed.
- **Rows:** 12 to do, 1 blocked (design question 11), 3 deferred, 1 dropped. The 4 November pick-up placed
  req-1299 (new blocked row inc-248, the same sort as the parent's inc-162), req-2107 (new row inc-249) and req-2202
  (in inc-155). Invariant 9 now follows the 26 October ruling: Save and return makes the same checks as Save and
  continue.
- **Waits on the type question theme:** inc-153 on inc-149 and inc-154 on inc-148, through `externalDependsOn`.
- **Old PRs to close when played:** animals frontend #398, animals backend #106, INS frontend #45, plants frontend #92,
  tests #20. The type question theme's PRs replace the type question half of them.

## Commodities and import reason: EUDPA-693 (stale branch)

- **Ticket:** [EUDPA-693](https://eaflood.atlassian.net/browse/EUDPA-693)
- **Stale branch:** `feat/EUDPA-693-design-release-2-1-commodities-and-reason`. Salvage from it. EUDPA-617 rewrote the
  whole commodity search feature on 27 October, so the search-related salvage commits will not apply: rebuild from
  `main`, do not rebase.
- **When played:** a fresh branch from `main`. Both `landsAfter` conditions are now met — journey foundation merged
  13 October, design snagging part A 23 October — so the theme is playable.
- **Rows:** 13, of which 11 todo, 1 dropped (inc-012) and 1 blocked (inc-029), after the 2 November re-analysis and the re-distil pick-up
  ([`../reanalysis/REPORT-commodities-and-reason-2026-11-02.md`](../reanalysis/REPORT-commodities-and-reason-2026-11-02.md)).
  inc-011 and inc-020 were removed earlier: design snagging inc-205 and inc-207 port them to `main`. inc-021 was
  removed and inc-015's Back links moved out: design snagging inc-218 builds them.
- **What the 2 November re-analysis changed:** the MDM commodity integration (EUDPA-617) completed, so inc-013
  (sorted and bolded results, removable species chips), inc-019 (poultry by rail) and inc-023 (unweaned for pigs) are
  unblocked and `todo`. **inc-012, the catalogue row, is `dropped`** — not built, but never a requirement: all of its
  criteria were the prototype's hard-coded demo data (`app/data/commodities.js`, extracted as claims of
  `kind: "data"`), and claim 25 of `ruling:sam-2026-10-09` makes a list's content "what MDM serves […] never a reason
  to block a row or edit a list in code". Claim 28's commodity carve-out expired when commodities arrived from MDM.
  Three rows are new — inc-024 (which commodities ask for a number of packages, `blocked` on a product question),
  inc-025 (species labels regressed to the Latin name alone) and inc-026 (the frontend's stub commodity fixture is
  behind the MDM stub's).
- **Nothing is blocked.** inc-024 was unblocked later the same day: the V4 Data Fields page
  (`confluence:6497338582`) specifies the package-count commodity list in a collapsed `expand` macro the distil never
  opened, and **main's `PACKAGE_COUNT_CODES` matches it exactly** — all 23 chapter-01 codes. The row's work shrank to
  pinning the list against the page with a test. The prototype's nine-mammal list is simply wrong. inc-023 widened
  with the same source, from "cattle and pigs" to V4's five codes (equines, cattle, pigs, sheep, goats).
- **Read [`../reanalysis/v4-data-fields-commodity-rules-2026-11-02.md`](../reanalysis/v4-data-fields-commodity-rules-2026-11-02.md)
  before touching any commodity rule.** That page holds the authoritative list for eight rules — packages, CPH,
  passport, ear tag, tattoo, permanent address, unweaned and horse name — and the comparison found main right on
  packages, permanent address and passport, and wrong on unweaned, ear tag, tattoo and CPH. The last three belong to
  other themes and are in `deferred.md`. It also confirms by specification the dog/raccoon-dog defect raised on
  animals frontend PR #432.
- **Two things recorded in `deferred.md` rather than as rows,** because claim 25 puts them outside this programme:
  content requests to MDM (camel is absent; the horse is spelled `Equus cabalus`; two elephants sit under 0102), and
  one design question — the commodity heading in the journey is the bare CN code, because MDM holds no trader-facing
  name in any field. Fish needs nothing: it is absent from MDM and correct to be, since live aquatic animals are not
  a GBN-AG live-animal commodity and fish is managed under the IUU regime.
- **Old PRs to close when played:** animals frontend #401, tests #23, performance tests #17.

## Arrival and transit: EUDPA-694 (branch reused)

- **Ticket:** [EUDPA-694](https://eaflood.atlassian.net/browse/EUDPA-694)
- **Branch reused (Sam, 2 November).** The 20 October stale ruling no longer applies to this theme. It builds on
  `feat/EUDPA-694-design-release-2-1-arrival-and-transit` again, in the animals frontend, the plants frontend, the tests
  repo and this workspace, rather than on a fresh branch. Main comes in through the loop, as merge row inc-240, never
  by hand; the branch's old commits stay in its history as the source the rows take code from.
- **The workspace branch** took `main` outside the loop (2 November, with Sam's go), because a branch run cannot build
  the workspace repo and spec edits land on whatever branch it is on. Its 13 October spec commit 5a995a66 predates
  design snagging and the 26 October ruling, so the merge kept `main`'s spec; the rows rewrite it. Launch with the
  workspace on this branch so the spec lands on spec PR #154.
- **Rows:** 4 to build, in order: inc-240 (merge `main` into the animals frontend, plants frontend and tests branches,
  each tree ending identical to `main`), inc-241 (means of transport required on both save buttons, replacing inc-028
  under the 26 October Save and return ruling), inc-029 (transit page title and redirect), inc-174 (transit country list
  with territories). inc-025 dropped, inc-028 merged into inc-241. inc-026 went to design snagging inc-208; inc-027 is
  on `main` through reference lists; the transit Back link came with design snagging inc-218. Full detail:
  [`arrival-and-transit/reanalysis.md`](arrival-and-transit/reanalysis.md).
- **Pull requests that merge with the theme:** animals frontend #402, plants frontend #95, tests #24, workspace spec
  #154. Every plants journey change the branch carried is on `main`, so #95 changes no behaviour. It carries only the
  joi 18.3.1 and @hapi/content 6.0.3 security fix (GHSA-4528-x5fx-h6hg, GHSA-8494-f6mr-cjpv), kept on the theme by
  Sam's choice, and merges with the theme.
- **Carry-only pull requests:** stub #20, reference data #27 and INS frontend #49 have no diff against `main`. INS
  frontend's security fix reached `main` through its #73. No row builds there and they take no merge. They stay open
  only so the branch name resolves to a branch image in the stack; close them when the theme merges. Their 13 October
  images turned inc-240 red, so on 3 November, with Sam's go, `main` was merged into all three branches and their
  images rebuilt (see [`arrival-and-transit/reanalysis.md`](arrival-and-transit/reanalysis.md)).
- **Loop args:** [`arrival-and-transit/build-args.json`](arrival-and-transit/build-args.json): `rigour: full`,
  `e2e: ci`.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/arrival-and-transit, branch lifecycle on
  feat/EUDPA-694-design-release-2-1-arrival-and-transit"

## Origin page: EUDPA-695 (retired)

- **Ticket:** [EUDPA-695](https://eaflood.atlassian.net/browse/EUDPA-695)
- **Stale branch:** `feat/EUDPA-695-design-release-2-1-origin-page`. Design snagging inc-202 and inc-203 salvage all of
  it, including tests 4f9cec8.
- **Rows:** 0. All 3 rows were removed; inc-203 now holds their criteria and requirement ids. Nothing is left to play.
- **Old PRs to close once design snagging lands:** animals frontend #403, plants frontend #96, tests #25.

## Overview and review: EUDPA-696 (stale branch)

- **Ticket:** [EUDPA-696](https://eaflood.atlassian.net/browse/EUDPA-696)
- **Stale branch:** `feat/EUDPA-696-design-release-2-1-overview-and-review`, in five repos. It also carries merges of the
  other stale branches, so take only the commits each salvage note names.
- **When played:** a fresh branch from `main` after design snagging, for example
  `feat/EUDPA-696-overview-and-review`.
- **Rows:** 21: 15 to rebuild with salvage notes, 2 never built (inc-108, which waits on permanent addresses, and the
  inc-117 tests), 2 blocked and 2 dropped. inc-114 was removed: design snagging inc-217 ports it.
- **Old PRs to close when played:** animals frontend #404, animals backend #107, INS frontend #51, plants frontend #98,
  tests #26.

## Design snagging: EUDPA-720

- **Ticket:** [EUDPA-720](https://eaflood.atlassian.net/browse/EUDPA-720) (stub, raised 20 October; filled in per
  domain once the loop drains).
- **Branch:** `feat/EUDPA-720-design-release-2-1-design-snagging`, cut from `main`. It stacks on no other theme branch.
- **Rows:** 17, all ready (inc-202 to inc-220). Consolidated 20 October so each shared component or mechanism is one
  row: inc-211 ('Add a transporter' beside the search) merged into inc-210, the search box row, and inc-220 (Back from a
  submitted notification's view) merged into inc-218, the one Back links row. Both merged rows are `merged-into`; no
  criterion was lost. Shared component rows come first: inc-202 (type-ahead), inc-206 (date picker), inc-210 (search
  box), and the page rows that use them wait on them.
- **What it is:** the designers' review of the test environment against the prototype at 56371e2, 19 October
  ([`../snagging/assessment.md`](../snagging/assessment.md), rendered proof in
  [`../snagging/screens.html`](../snagging/screens.html)). It lands next, on its own in wave 2.
- **Also from a tester (20 October):** inc-218, Back during the opening run, comes from a tester's comment on the
  journey foundation ticket, EUDPA-691 ([`../snagging/eudpa-691/save-and-status.md`](../snagging/eudpa-691/save-and-status.md)).
  The amend fault from the same review ([`../snagging/eudpa-691/amend.md`](../snagging/eudpa-691/amend.md)) is a separate
  ticket, not a row here.
- **What it changes elsewhere:**
  - It salvages finished work from the stale origin page, commodities and import reason, arrival and transit, and
    overview and review branches to `main`. The source rows it ports in full were removed on 20 October, and their
    criteria and requirement ids now sit on the design snagging row that ports them.
  - It takes in documents inc-032, identification inc-046, inc-047 and inc-050, consignment parties inc-085 and inc-086,
    and waiting-on-design inc-190. It also carves two criteria out of transporters inc-037.
  - inc-218 takes in commodities and import reason inc-021 whole, and the Back links from commodities and import reason
    inc-015, arrival and transit inc-029 and type question and templates inc-171 (plants).
  - Later rows now hold only their deltas. A later row waits on a design snagging row only where it builds on code
    that row creates; the rest simply build from `main` after this theme lands.
- **Rendered proof:** each row says which screenshots to take again after it lands. Compare them with
  `../snagging/screens/prototype/`. The prototype walk is `../prototype-specs/e2e/snagging.fit.spec.js`.
- **Laptop A builds the documents-first rows, then stops (22 October).** Left here: inc-213 (consignment addresses),
  inc-223 (the upload documents tidy) and inc-218 (Back links). Sam then reviews and merges this branch.
- **The last five rows moved to laptop B (22 October)** with `tim backlog split --rows --to design-snagging-b`:
  inc-214 (identification details), inc-216 (check your answers), inc-217 (declaration and Notification submitted),
  inc-219 (CPH number) and inc-221 (the final tidy). This backlog keeps a `movedOut` pointer to them. See "Design
  snagging B" below.
- **Earlier (21 October):** laptop B's first six rows came back here with `--back-from`. The merge row, inc-222, is
  dropped: laptop B's branch becomes its own PR after this one merges.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/design-snagging, branch lifecycle on
  feat/EUDPA-720-design-release-2-1-design-snagging"

## Design snagging B: EUDPA-720, second laptop

- **Laptop B builds the last five design snagging rows (22 October),** so laptop A finishes the documents-first rows
  and stops for Sam's review. The five moved here with `tim backlog split --rows --to design-snagging-b`. Each was held
  in laptop A's backlog; here each is todo again.
- **Branch:** `feat/EUDPA-720-design-release-2-1-design-snagging-b`. Draft PRs: animals frontend #423, plants frontend
  #114, tests #47. After Sam merges laptop A's branch, this branch becomes the PR for the rest of design snagging.
- **Rows, in build order:**
  - inc-217, the declaration and Notification submitted pages. It merges laptop A's branch into all three repos
    first, because laptop B's branch was cut after inc-204 and is far behind.
  - inc-214, identification details
  - inc-216, check your answers without the red bar on a missing answer
  - inc-219, the CPH number
  - inc-221, the final tidy, last. It waits for the four rows above and for laptop A's inc-213, inc-223 and inc-218,
    and merges `origin/main` into all three repos first, so it builds on Sam's merged snagging work.
- **Known loop gap:** a relaunch that resumes an already-pushed row skips the merge. Laptop B's session checks the
  merge happened after inc-217 and after every relaunch.
- **Workspace branch:** laptop B works on `feat/NO_JIRA-design-release-2-1-snagging-b`, reset from
  `feat/NO_JIRA-design-release-2-1`, and merges back after each landed row and at the end.
- **Business tickets:** the theme-ticket WRITE flow runs once for the whole design snagging theme, not on laptop B.
- **Earlier (21 October):** laptop B's first six rows went back to laptop A after laptop B timed out on inc-210 and
  landed nothing.
- **Handover:** [`design-snagging-b/HANDOVER.md`](design-snagging-b/HANDOVER.md), with the paste-in prompt.
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/design-snagging-b, branch lifecycle on
  feat/EUDPA-720-design-release-2-1-design-snagging-b"

## Accompanying documents: EUDPA-724, second machine

- **Ticket:** [EUDPA-724](https://eaflood.atlassian.net/browse/EUDPA-724) (stub, raised 22 October under epic
  EUDPA-328; filled in per domain once the loop drains).
- **Branch:** `feat/EUDPA-724-design-release-2-1-documents`, cut from `main` in the animals frontend, the tests repo
  **and this workspace repo**. The animals backend is no longer in the theme.
- **The workspace builds on the theme branch, not a `NO_JIRA` branch.** Unlike design snagging, this theme's openspec
  changes go on `feat/EUDPA-724-design-release-2-1-documents` in the workspace too, so every repo it touches carries
  the same branch name. `workspace` is in the backlog envelope's `repos` and in `build-args.json`.
- **Starts after design snagging merges — satisfied.** Sam merged design snagging (animals frontend #421, plants
  frontend #113, tests #42), its documents page tidy inc-223 is `done`, and journey foundation inc-001 and inc-002,
  which inc-034 waits on, are both `done`. Nothing outside the theme holds the build up.
- **Rows:** 8 after the 26 October re-analysis, of which 5 are `todo`:
  - inc-031, Upload documents opens as soon as the origin is answered — test-and-spec work only, the behaviour is
    already on `main`, so no gate is built for it
  - inc-034, the page returns the trader to where they came from
  - inc-037, the document type list drops Health certificate (replaces inc-033)
  - inc-038, a document still being scanned no longer holds the trader (replaces inc-035)
  - inc-039, the spec states the file size and reference rules the service now applies (workspace only)

  and 3 are set aside: inc-033 and inc-035 `merged-into` the rows above, inc-036 `dropped`. inc-032 went to design
  snagging inc-215 on 19 October.
- **What the 26 October re-analysis changed:** inc-036 (files up to 50MB) is `dropped` — EUDPA-296 delivered it and
  CDP's managed nginx gives `/upload-and-scan` a 2304M body limit, so the request-size blocker is gone rather than
  lifted and **EUDPA-518 is not on this path**. inc-033's reference-characters half is done and tested on `main`,
  leaving only the document type list, and the backend drops out of the theme because it keeps `HEALTH_CERTIFICATE`
  on purpose. inc-035's Save and return half moved to **inc-232 in `themes/design-snagging-followups`** under Sam's
  26 October ruling, and its Save and continue criterion was withdrawn: EUDPA-296 made it impossible on purpose.
  inc-039 is new, raised by the re-analysis rather than by a source. Full detail is in the rows' own notes and in the
  handover.
- **Shared code:** this theme owns `features/documents`. The design snagging rows still to come (identification
  details, the review page, the declaration, the CPH number, the final tidy) don't touch it. inc-034 extends
  inc-218's `runBackLink` helper in `frontend:src/server/app/shared/kit.js` rather than writing a second Back-target
  rule.
- **The one clash to watch:** inc-038 and inc-232 both change what leaving Upload documents checks — inc-038 the scan
  branch of `leavePage`, inc-232 the hub-exit branch, on another branch in another theme. Whichever lands second
  updates the other's tests, so Save and return inherits the same rule: a document still scanning holds neither
  button, a rejected one holds both. The report says which order it happened in.
- **Handover:** [`documents/HANDOVER.md`](documents/HANDOVER.md), with the paste-in prompt. Loop args:
  [`documents/build-args.json`](documents/build-args.json).
- **Say:** "run the increment build loop on shared/design-release-2-1/themes/documents, branch lifecycle on
  feat/EUDPA-724-design-release-2-1-documents"

The stacked themes also carry their branch in repos they don't change, such as the INS frontend, stub, reference-data
and performance tests, each with a carry-only draft pull request. CI publishes a branch image only from a pull request,
and the loop refuses a repo on its branch with none. Close a carry-only pull request once the themes it carries have
merged, if its theme never changed that repo.

## What lands first

- **Order:** journey foundation and reference lists are on `main`. Design snagging lands next. Every other theme
  starts from `main` after that, on a fresh branch: accompanying documents (on a second machine), commodities and
  import reason and arrival and transit, then templates and overview and review.
- **No stacking.** No theme merges another theme's branch any more. Templates' old `merge` fields (inc-166, inc-168,
  inc-170, inc-171) are gone: inc-166 and inc-170 were removed, and inc-168 and inc-171 are deferred with no
  dependency on another stale theme.
- **The loop never commits its own backlog writes.** When a theme lands rows another theme waits on, commit and push
  that theme's `backlog.json` on the workspace branch, then pull it on the other machine before its next launch.
