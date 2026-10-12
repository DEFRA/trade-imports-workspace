# Handover: review what the Design Release 2.1 build produced

Written Monday 12 October 2026 by the orchestrating session, for a fresh agent. Sam is starting the week with
this: work out what got built over the weekend, check it's the right thing, find where bad ideas went in, and see
what's still needed. Make that manageable for him and his colleagues. Your job ends with five pages
(Claude artifacts) and a branch they can all look at. You don't build any more rows.

## What exists now

The parity programme builds the real GB notification services up to Design Release 2.1 of the prototype.
The workarea is `workareas/shared/design-release-2-1`, and the workspace branch is `feat/NO_JIRA-design-release-2-1`.
`backlog.json` there is the main backlog. Split-off themes live in `themes/<id>/backlog.json`, and their split
pointers stay in the main backlog. `themes/HOW-TO-BUILD.md` lists every theme's ticket, branch and pull requests.

| Theme | Ticket | Branch suffix (after `feat/EUDPA-N-design-release-2-1-`) | State |
|---|---|---|---|
| Journey foundation | EUDPA-691 | `journey-foundation` | Done, 7 of 7 |
| Reference lists | EUDPA-692 | `reference-lists` | Done, 3 of 3 |
| Commodities and import reason | EUDPA-693 | `commodities-and-reason` | 6 of 10; 4 wait on MDM commodities |
| Arrival and transit | EUDPA-694 | `arrival-and-transit` | Done, 5 of 5 |
| Origin page | EUDPA-695 | `origin-page` | Done, 3 of 3 |
| Overview and review | EUDPA-696 | `overview-and-review` | 16 landed; inc-108 and inc-117 wait on main inc-054 |
| Type question and templates | EUDPA-690 | branch `feat/NO_JIRA-design-release-2-1-type-question-and-templates` | **Still building, and incomplete.** See "Templates is still in flight" below |

Stacking: commodities, arrival and transit, and origin page branch from journey foundation with reference
lists merged in. Overview and review is built on all five. Templates branched separately from `main`. Merge order is:
journey foundation and reference lists, then 693, 694 and 695, then 696. Templates can go at any point; it has 4 rows
that wait on rows in other themes.

Nothing is merged to `main`. **Never merge to `main`.** Sam merges.

Published pages already exist. Read each one with the Artifact tool's `read` action before changing it:
- "Design Release 2.1 work by theme": https://claude.ai/artifact/FHJCGEJ8jm7zs9mLXT4YBw (the progress report to update)
- "Design Release 2.1 decisions": https://claude.ai/artifact/ChnyYcakTW2GfgG7Jx23wH (Sam's rulings)

Rulings are in `sources/ruling-sam-*.md`, and deferred work is in `deferred.md`.

## Templates is still in flight

- **Where it stands:** the templates theme (EUDPA-690) is still building on Sam's second laptop. Sam has told that
  loop to stop once it lands its current increment. Some of its rows will be left unbuilt.
- **Don't wait for it.** Start every step below without templates.
- **When laptop 2 has stopped and pushed:**
  - The templates branch is in its 5 repos: animals frontend, animals backend, INS frontend, plants frontend and tests.
    Its backlog and OpenSpec commits are on the workspace branch.
  - Sam will tell you, or you'll see it pushed. Treat `themes/type-question-and-templates/backlog.json` on the pushed
    workspace branch as the truth for what's done.
- **Then, in this order:**
  1. **Merge templates into the combined branch.** Pull the workspace branch first; laptop 2's backlog may conflict
     with local changes, and laptop 2's version wins for that theme's files. Merge `feat/NO_JIRA-...-templates` into
     the combined branch in each repo and log the conflicts. Expect clashes with journey foundation's opening run.
     Re-prove the branch: unit tests, lint, full E2E under the lease.
  2. **Re-run the checks on what templates added.** Run steps 2 to 4 again on its diff only, and add the results to
     the existing pages rather than starting new ones. Update the progress report.
  3. **Build its remaining rows on this laptop.** Laptop 2 is too slow for the tests and stops after this increment.
     - On the templates branch (not the combined one), run `tim workspace branch
       feat/NO_JIRA-design-release-2-1-type-question-and-templates`.
     - Launch the increment build loop with `themes/type-question-and-templates/build-args.json`, branch lifecycle,
       by `scriptPath`. See `themes/HOW-TO-BUILD.md`.
     - Commit and push the theme's backlog path-limited after each run.
     - When it finishes, merge templates into the combined branch again and re-prove it.
- **One stack, one lease.** The combined branch's E2E runs and the templates build both need the Docker stack. Run
  them one after the other, never side by side. Switch the repos back to the combined branch
  (`tim workspace branch feat/NO_JIRA-design-release-2-1-combined`) before any combined-branch run.

## Two things checked before you start

1. **The proxy worry is mostly a false alarm, but the new code still needs review.**
   - `src/server/common/helpers/proxy/setup-proxy.js` is CDP template boilerplate. It's unchanged from `main`, and
     the build didn't add it.
   - The build did add a 2-second connect timeout with one retry for backend calls, in
     `src/server/common/helpers/call-counts/backend-fetch.js` in the animals and plants frontends. It goes through npm
     `undici`'s own `fetch` and `FormData`: animals `19a76c54` and `d66b1dce`, plants `5e044ac` and `aebac72`.
     That's a cross-cutting change to every backend call, made to get round a local Docker forwarder stall. Make it
     the engineering review's first item:
     - Is it needed in CDP?
     - Does it behave behind CDP's `HTTP_PROXY`?
     - Should it exist at all?
   - The animals frontend's `test:fit:ci` global timeout went from 900s to 1500s on the branch. Review that too.
2. **OpenSpec was updated for each increment, but nobody has checked it's complete.** The workspace branch has about
   40 `feat(design-release-2-1-*)` commits touching `openspec/` since 9 October, one per row. Those commits prove
   specs were touched, not that every behaviour now in code is in a spec. The audit in step 2 still matters. Check
   whether the templates laptop pushed its `openspec/` commits to the workspace branch.

## Standing rules (these are Sam's, and not negotiable)

- Commit only the paths you changed. Never stage `docs/repos/*.md`; one of them is already staged and belongs to
  something else. Leave stashes alone.
- One command per Bash call: no `&&`, `;`, `|` or `cd`. Use `~/` paths, never `/Users/`. Bare `node` and `curl` are
  denied.
- Never print or log `DEVELOPER_API_KEY` or any token.
- No AI writes to `cdp-app-config` or the CDP platform repos.
- Never change the stack's `host.docker.internal` routing.
- Use `tim` for stack operations. Take the stack lease (`tim docker lease`) before running E2E.
- Sam's reading style: summary first, tables, plain English (GDS), no time estimates, and progress as "N of TOTAL (P%)".
  Refer to work by its headline, not just an inc id. Never ask Sam to confirm lists of ids.
- Sam asked for workflows by name, so the Workflow tool is authorised for steps 2 to 4. Launch by `scriptPath`.
  Keep fan-out to about 6 agents at once.

## The work, in order

### 1. One combined branch

Create `feat/NO_JIRA-design-release-2-1-combined` in every repo any theme touched:
- animals frontend, animals backend, INS frontend, plants frontend and tests;
- stub, reference-data and performance tests;
- anything the templates branch adds.

Build it from `main` by merging, in this order:
- journey foundation, then reference lists;
- commodities and import reason, arrival and transit, and origin page;
- overview and review.

Templates comes in later; see "Templates is still in flight". Overview and review already contains the first five,
so in practice you merge 696. Check that
with `git merge-base` rather than assuming it.

- **Resolving conflicts:** resolve each conflict on its merits and write down every resolution.
- **Proving the branch:** unit tests and lint in each repo, then the full E2E suite under the lease
  (`npm run test:docker-compose` in the tests repo) on a dev-mode stack on this branch.
- **CI:** open one **draft** PR per repo, titled as a combined review branch and marked "do not merge", so CI publishes
  branch images. Never merge them.
- **Record:** write the branch, the PRs and the conflict log to `workareas/shared/design-release-2-1/combined/README.md`.

Every later step reads this branch, not the theme branches.

### 2. OpenSpec catch-up workflow

Find every place the behaviour spec under `openspec/` doesn't describe what the combined branch now does, and fix
the spec. This is the `spec-catchup` skill's job, run across the changed surface. Read
`.claude/skills/spec-catchup/SKILL.md` and `docs/reference/openspec.md` first.

1. **Scope.** Take the diff from `main` to the combined branch in each repo and map the changed files to the
   capabilities they implement (`openspec/specs/<capability>/spec.md`).
2. **Fan out per capability.** One agent each reads the diff, the source and the spec. It writes down every behaviour
   that's in code but not in the spec, every requirement the code contradicts, and any coverage link that's broken.
3. **Verify adversarially.** A second agent tries to refute each gap before it's fixed. Keep only confirmed gaps.
4. **Fix.** Edit specs to match the code. Where the code looks wrong rather than the spec, don't change the spec.
   List it as a question for the business page in step 3.
5. **Prove it.** `openspec validate` passes, the spec lint passes, and `tim spec gaps` shows no new unlinked Thens.
6. **Commit.** Commit path-limited to `openspec/` on the workspace branch, and push.
7. **Report.** Write `combined/openspec-audit.md`: capabilities checked, gaps found and fixed, questions raised.

### 3. Business review page (for BAs, POs and SMEs)

One published page that lets a non-engineer go through every change and answer: "Is this the right change, from a
business point of view?"

- **One card per change a user would notice, grouped by page or journey step.** Not one card per increment. Each card
  has:
  - **What changed:** plain English, no code words.
  - **Before and after screenshots:** `main` against the combined branch. Use `tim capture` from the E2E traces, or a
    small Playwright capture against each stack. Same data, same viewport.
  - **The prototype screen it copies, if there is one.** The prototype is the authority on look and feel only.
  - **Which rows it came from**, as a footnote.
  - **Rulings:** any of Sam's rulings or decision-page entries that shaped it.
- **A way to answer.** Each card takes a verdict from each reviewer: Right, Wrong or Not sure, plus a comment. Keep
  the answers in the artifact's shared database (the `db` capability; load the `artifact-capabilities` skill first)
  so colleagues' answers collect in one place and you can read them back.
- **Open questions come first:**
  - the review checks the build left for Sam (listed below);
  - the code-looks-wrong items from step 2;
  - the hidden "opens in a new tab" warning on the HMRC links (inc-115). It's visually hidden, so sighted users get
    no warning.
- **Where screenshots and verdicts live:** keep the source and screenshots under `combined/business-review/`. Upload
  the screenshots as artifact assets, not inline `data:` URIs, if the page gets large.

Review checks the build left (the rows' review gates):

| Row | Check |
|---|---|
| inc-001 | Opening run order |
| inc-003 | Soft save, and the refused format |
| inc-004 | Amend endings |
| inc-015 | Walk from origin to arrival details |
| inc-021 | Cattle walk and horses-only walk, plus both Back links |
| inc-101 | Review page structure: cards straight under numbered sections, titles up a level, renamed cards |
| inc-104 | Commodity card and species blocks, and where the row's Change link sits |
| inc-111 | Submitted view: how it's told apart from the review, the header with no status strip, and the Back link |

Also read the templates theme's own review checks from its run logs or backlog.

### 4. Engineering review page

One published page, for engineers, ranking review effort by risk. Run it as a review workflow: find, then
adversarially verify, then rank.

- **Priority 1: anything outside the frontends.**
  - animals backend (#107, and templates #106);
  - stub, reference-data, tests, performance tests;
  - the workspace's `tim/`, `.claude/skills/requirements-pipeline/` and `scripts/stack/` changes since 9 October.
- **Priority 2: frontend code outside a feature folder.** In each frontend, everything under `src/server/common/`,
  `src/config/`, `src/client/`, build config, `package.json`, and anything shared between features. The
  `backend-fetch.js` change heads this list.
- **Priority 3: feature-folder changes.** Sample these; don't read every line. Look for:
  - display logic in the model (see `obligation-purity.js`);
  - code reaching across feature folders;
  - tests that test implementation, or seed journey tests;
  - comments that should have been removed.
- **Findings.** Each finding has:
  - the file and line;
  - what's wrong;
  - a concrete scenario that breaks it;
  - severity;
  - a suggested fix.

  Verdicts and comments go in the artifact's shared database, as in step 3.
- **Also cover these:**
  - the test changes made to beat flakes: `test.slow()` added, dashboard pagination seeded rather than clicked,
    address-book `beforeEach` reordered. Check none of them weakened an assertion.
  - The leaked tests commit `65b6afc`, kept on `backup/inc-107-leaked-commit`. Decide whether anything in it is needed.

### 5. Progress report

Update "Design Release 2.1 work by theme" (FHJCGEJ8jm7zs9mLXT4YBw) in place. Read it first and keep its shape.

**Count every row across the main backlog and every theme backlog.** Don't count a split pointer and its theme
row twice. Use `tim backlog check <workarea> --json` per backlog.

**Show these:**
- **Implemented:** rows `done`, as N of TOTAL (P%). Count dropped rows separately, outside the total.
- **Ready to build:** rows `todo` with nothing unmet.
- **Blocked:** each row with its reason and what unblocks it. Today's known blockers:
  - MDM commodities, for 4 commodities rows;
  - permanent addresses (main inc-054), for inc-108 and inc-117;
  - main-backlog blockers such as EUDPA-390 address search.

**Per theme:** ticket, branch, PRs, and a link to the business and engineering review pages.

## Finish

Tell Sam, in one short message:
- the combined branch and its PRs;
- what the OpenSpec audit found;
- the links to the four pages: business review, engineering review, the updated progress report, and the decisions
  page if you changed it;
- anything you couldn't do and why;
- where templates stands: merged in or still waiting on laptop 2, and how many of its rows are left to build here.

Then add one line to `MEMORY.md` pointing at this handover's outcome.
