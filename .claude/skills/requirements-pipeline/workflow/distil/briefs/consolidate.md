# Consolidate: requirements into backlog.json

Consolidate runs in two steps, and this brief is the method for both:

- **A drafter per area** drafts the rows for its area's requirements and records the code each row touches, in
  `distil/areas/<area id>/rows.json`. See [Drafting an area's rows](#drafting-an-areas-rows).
- **The combiner**, one agent, joins every area's drafts into `<workarea>/backlog.json` in the one backlog shape:
  it merges rows that repeat the same set-up, orders them, gives each its id and draws the themes. It drafts rows
  itself for any requirement no area drafted. Its output is checked by `tim backlog check` and `tim distil coverage`.

Your prompt says which you are, names the files and the check commands.

Read these before you write a row:

- `.claude/skills/requirements-pipeline/references/backlog.schema.json`: every field of the envelope and the row.
  `tim backlog check` validates against this file.
- `.claude/skills/requirements-pipeline/references/SHAPE.md`: the rules a schema cannot check. A row is a
  requirement, never a recipe. A row is a full-stack slice, never a layer. What an acceptance criterion may and may
  not name. Provenance. Themes.
- `sources.json`, `distil/requirements.json` and `distil/conflicts.json`.
- The existing `backlog.json`, when your prompt says one exists.

## Two passes

- **Pass 1, thin slices.** Group requirements into the thinnest end-to-end behaviours a user or system can observe.
  Each slice spans every repo it needs. Never a slice per layer ("the backend for X", "the tests for X"): a slice
  whose acceptance can only be observed once another slice in a different repo lands is a layer split, and is wrong.
- **Pass 2, combine.** Merge related slices where building them apart would repeat the same set-up, review and
  ladder for little gain: the same page or journey step, the same record, the same integration. Keep a slice apart
  where it carries an open question the others do not, or would make the increment too big to review in one
  sitting. Aim for three to ten acceptance criteria an increment. Say in each row's `notes` which slices it
  combines and why.

The drafter does pass 1 and pass 2 within its area. The combiner does pass 2 again across areas, merging rows from
two areas only where they truly repeat the same set-up.

An `exists` requirement is already met. It goes in the report, never in a `todo` or `blocked` increment. An acceptance
criterion covers only what the row changes, stated as what is true once the row lands.

## Each row

- `id`: `inc-001` onwards, in build order. `title`. `detail`: what and why, in plain English.
- `acceptanceCriteria`: observable. Each ends with its provenance in brackets, such as
  `(confluence:6518997274 §Notification data; trace:ched-pp country-of-origin)`. Keep copy, option, hint and error
  changes as their own criteria, worded as the new text: the reviewer checks each one. How to word them is in
  [Wording a criterion](#wording-a-criterion).
- **Every acceptance criterion can be observed in every environment the row names.** Never write one that cannot,
  such as a real cloud service on a local stack that has none. That is a reconcile problem, not yours to settle.
  The drafter lists the requirement in its draft's `unobservable`; the combiner puts it in its answer's
  `reconcileProblems`, with the environment and why, and the workflow sends it back to the reconciler. Where a
  question's default already says what each environment gets, write the criterion per environment to match it.
- `requirements`: the requirement ids it covers. Every adopted `new` or `change` requirement sits in exactly one
  increment whose status is `todo`, `blocked`, `done` or `deferred`.
- `sources`, `repos`, `kind`, `dependsOn` (a real ordering need only, never a layer order), `status`.
- `repos` is written in **merge order**, provider before consumer: a service before the frontend that calls it, a
  stub before the service that calls it, and a tests or performance-tests repo after every service it exercises.
  The build loop merges a row's PRs in that order, unless the keys are exactly `frontend`, `backend` and `tests`,
  which always merge backend, then tests, then frontend.
- `openQuestions` where a question touches it. A row a question touches is `todo` when the question has a default,
  so the builder follows the default and says so. It is `blocked` only when there is no safe default to build.
- **A requirement with `blockedBy` sits in a `blocked` row**, never a `todo` one, and the row's `openQuestions` name
  the blocker: who must do what. Keep such requirements apart from rows that can build now, so the rest is not held
  up. `tim distil coverage` refuses a todo row that covers one.
- A row that needs somebody to act first for any other reason, such as a platform change, says so in `notes` and is
  `blocked` until they have.
- `gate` is a review check: what somebody should look at once the theme is built. Set it, saying what to look at,
  on a row that sets a pattern the rows after it copy, or that builds a question's default many rows rest on.
  Otherwise `null`. A build runs unattended, so a gate never waits for a person mid-run: the build session records
  the check for the end-of-theme review and carries on.
- **Work the programme pushes out gets no row.** A follow-up ticket for another team, a chore in a repo the backlog
  does not build, or an action only a person can take goes in your answer's decisions, worded so the main session
  can add it to the workarea's `deferred.md`.

## Wording a criterion

A criterion is read by the planner, then turned into tests, Behaviour Spec scenarios and code. Every word in it can
end up in a test title or a comment. So:

- **State what is shown, never what is gone.** A criterion never says "no '<removed copy>'" or "does not show
  '<old text>'". It says exactly what the page shows. An exact positive check proves a removal; a quoted absence
  builds `REMOVED_*` constants and tests named after the old version.

  | Bad | Good |
  |---|---|
  | There is no "It can be up to 58 characters." sentence under the internal reference field | The internal reference field shows the label "Internal reference (optional)" and no hint |

  Use the design's own text for the label and hint. The example's words show the shape, not the copy.
- **No ids and no session words in a criterion, a `title` or a `detail`.** Requirement, conflict, row and ruling ids
  (`req-014`, `c-201`, `inc-004`, `ruling:sam-2026-10-02`) and release or session words ("Design Release 2.1",
  "the real service", "as ruled") never appear in the sentence. Ids stop at the plan: the planner reads them from
  `requirements`, `sources`, `notes` and the provenance bracket, and none of them reaches code. The provenance
  bracket at the end is the one place a source id goes in a criterion.

  | Bad | Good |
  |---|---|
  | Saving a submitted notification keeps the c-201 behaviour | Saving a submitted notification with no changes returns to the dashboard and leaves its status as submitted |
  | The heading matches the real service | The page heading is "Where are the goods coming from?" |

- **A change to how a value is formatted lists every page that shows the value**, in one row. Take the pages from
  the requirement, which names them: a field's own page, check your answers, the dashboard, the view of a submitted
  notification. A row that names one page builds one formatter there, and the next row builds a second.
- **Never name a source as the thing to match.** "As the prototype does" or "like the current service" is not
  observable. Say what the user sees.

## Cross-cutting chrome goes to its owning theme

Page chrome is the part of every page the layout owns: the page title, the header, the service name, phase and
maturity banners, the footer and the back link. A criterion about chrome belongs to the row that owns the layout,
in the foundation theme where the backlog has themes. A feature row that needs the change depends on that row. It
never carries the chrome criterion itself: a feature row that must meet it before the layout change lands can only
override the layout on its own pages, and that override stays.

Without themes, put the chrome change in one early row and make every row that relies on it depend on that row.

## Drafting an area's rows

You draft the rows for one area. Your prompt's `tim distil areas --area <id>` lists `toBuild`, the adopted `new` and
`change` requirements from your area, and `reconciled`, every requirement from it.

1. Read each requirement in `toBuild`, its claims in your area's working set, and its conflicts.
2. Work out **what code each requirement touches**, from the evidence: the target repos' claims name their files and
   feature folders, and the traces and specs name the pages. Be precise: the feature folder of the page
   (`frontend:src/server/app/sets/live-animals/journeys/linear/features/origin`), not the whole app.
3. Draft rows as the two passes say, within your area.
4. Write `distil/areas/<area id>/rows.json`:

   ```json
   {
     "area": "origin",
     "rows": [
       {
         "title": "…", "detail": "…", "acceptanceCriteria": ["… (prototype:dr2-1-source views/origin.njk)"],
         "requirements": ["req-014", "req-015"], "sources": [{ "source": "…", "ref": "…" }],
         "repos": ["backend", "frontend", "tests"], "kind": "…", "status": "todo", "gate": null,
         "openQuestions": [], "notes": "…",
         "touches": ["frontend:src/server/app/sets/live-animals/journeys/linear/features/origin"],
         "shared": ["frontend:src/server/app/sets/live-animals/journeys/linear/flow.js"],
         "existingRow": null
       }
     ],
     "unobservable": [],
     "splitOff": []
   }
   ```

   `touches` is the code the row owns; `shared` is code other areas' rows also change (the journey flow, the layout,
   shared copy, a shared component). `existingRow`, on a re-distil, names the row in `backlog.json` that already
   covers these requirements, so the combiner keeps its id; otherwise `null`. A draft row has no `id`: the combiner
   gives ids.
5. Cover every requirement in `toBuild` once, in a row or, when its code falls in a theme split off early, in
   `splitOff` (see [Themes split off early](#themes-split-off-early)). An area with nothing to build writes
   `"rows": []`.

## The envelope

- `programme`, `generatedFrom` (every source id), `invariants` (rules every increment keeps, each once).
- `repos`: the table the build loop takes, written from `sources.json`'s `repos`. Each key's `path` as it is there,
  and its `github` slug `DEFRA/<folder name>` unless the repo's remote says otherwise. Check each with the
  `git -C <workspace>/<path> remote get-url origin` command your prompt gives.
- `themes`, only when `sources.json` has a `themes` rule (see "Themes" below).

## Themes

Only when `sources.json` has a `themes` rule. It says how to draw the boundaries; follow it. The rules a theme keeps
are in `SHAPE.md`, "Themes". The aim is **several themes that genuinely build in parallel**.

- **Draw boundaries at feature-folder granularity, from what each row touches.** The drafts' `touches` say it. A
  frontend whose feature folders are independent by design (each page its own folder, such as
  `src/server/app/sets/live-animals/journeys/linear/features/<feature>`) is several themes, not one: group the rows
  of a few related feature folders into a theme, and name those folders in `touches`. Never name a whole app or a
  whole repo another theme also builds in.
- **Shared files go in a foundation theme in an early wave.** The journey flow, the layout, shared copy and any
  component several themes change (the drafts' `shared`) are one small foundation theme, whose rows make the shared
  change once. The feature themes depend on it and land in the next wave, in parallel with each other.
- **A theme holding most of the rows is a smell.** It means the boundary was drawn by repo, or around a shared file,
  rather than by the code each row owns. Redraw it: move the shared change to the foundation theme and split the
  rest by feature folder. Say in the theme's `why` how many rows it holds and why it cannot split further.
- **Give every row a `theme`.** Every `todo` and `blocked` row needs one. Give one to a row built or set aside only
  when it already has one.
- **Write the envelope's `themes`.** Each has an `id` in lower-case words joined by hyphens, a `title`, a `why`
  citing the requirements and code behind the boundary, `touches` as `<repoKey>:<path prefix>` for every repo its
  rows build in, and `dependsOn`.
- **A row that depends on a row in another theme makes its theme depend on that theme.** Keep these few: each one
  makes a machine wait. Where two themes would depend on each other, merge them, or redraw the boundary.
- `tim backlog check` names every overlap, missing theme and missing theme dependency. Fix each one.
- **On a re-distil, keep each row's theme**, unless the requirements behind it moved to another theme's code. Never
  rename a theme whose rows are built: its split's workarea and branch are named by it.

## Themes split off early

A theme split off early (`tim backlog split --theme`) has left `backlog.json`: its rows live only in its own backlog,
on its own branch. The backlog keeps one pointer per such theme in `splitOff`. Your prompt lists them when there are
any.

- **Carry `splitOff` over unchanged.** Never remove a pointer, and never change any of its fields but `pickUp`. The
  workflow compares every pointer before and after the combiner.
- **Never draft a row for a requirement a pointer holds**, in its `requirements` or its `pickUp`. `tim distil areas
  --area` already leaves them out of `toBuild` and lists them under the area's `splitOff`. `tim distil coverage`
  refuses a row that covers one.
- **Never put a split-off theme back in `themes`**, give a row its id as `theme`, or reuse the id of a row that moved
  with it. No theme left may touch its code.
- **Never rename or remove a theme a pointer's `dependsOn` names**, even one with no built row. The pointer is fixed,
  so the split-off theme would lose its place in the landing order. `tim backlog check` refuses it.
- **A requirement whose code falls in a split-off theme's `touches` is that branch's to build.** This is a new or
  changed requirement that a ruling brought in after the split. The drafter writes no row for it and lists it in its
  draft's `splitOff`:

  ```json
  "splitOff": [{ "requirement": "req-031", "theme": "origin-pages", "why": "It changes the origin page, which theme origin-pages owns." }]
  ```

  The combiner adds each such id to that pointer's `pickUp` instead of drafting a row. The report hands it to the
  branch.
- A row left here may depend on a row that moved. It does so through `externalDependsOn` on the split workarea,
  never `dependsOn`. Keep every one as it is.

## Re-distilling over an existing backlog

- **Keep every existing row id.** Never remove a row.
- **You may rewrite a `todo` or `blocked` row, and nothing else.** A `blocked` row waits on a decision and has no
  code behind it, so a later ruling changes it like a `todo` row. Every other status (`done`, `deferred`, `dropped`,
  `rejected`, `merged-into`) is built or set aside on purpose: never change its status, text or fields. The
  workflow compares every such row before and after you. A changed or removed row comes back to you as a problem to
  put right, and the run stops if it is still wrong after two send-backs.
- A `todo` or `blocked` row changes where the requirements behind it changed. Rewrite its `title`, `detail`,
  `acceptanceCriteria`, `notes` and `openQuestions` to the requirements as they stand now. Where it still has other
  work, take out of its `requirements` any requirement that is now `out-of-scope` or adopted as `exists`.
- **A `blocked` row whose blocker a ruling removed becomes `todo`.** Say in `notes` which ruling unblocked it. A row
  still waiting on somebody stays `blocked`, rewritten to what it now waits for. Nobody resets a status by hand.
- **Never keep a withdrawn claim.** A `todo` or `blocked` row never names a claim that a conflict's `overruled`
  lists, in any field, and never restates what that claim said. `tim distil coverage` refuses a row that does.
- **A `todo` or `blocked` row whose requirements are all out of scope or already met** keeps its id and becomes `dropped`. Keep
  its `requirements` as they were. Say in `notes` which ruling or source took them out, such as
  `Dropped: ruling:sam-2026-10-02 put req-014 out of scope.` A dropped row covers nothing, so coverage ignores it.
- A `done` or `deferred` row that covers a requirement now out of scope or already met stays as it is. `tim distil
  coverage` does not flag it, and the report lists it among the ordering decisions to check.
- **After a ruling that reverses an earlier decision, sweep every `todo` and `blocked` row,** not only the rows whose
  requirements changed. Search each row's `title`, `detail`, `acceptanceCriteria`, `notes` and `openQuestions` for the
  old model's words and rewrite every row that still states it. A note recording the reversal is correct: leave it.
  List each remaining match and why it stays in your answer's decisions. Rows built or set aside are never changed.
- **A `todo` or `blocked` row whose wording breaks [Wording a criterion](#wording-a-criterion)** (a quoted removal,
  an id, a session word, a source to match) is rewritten to it, keeping its id.
- New requirements go in new rows with new ids, after the last existing id.

## Finishing

The drafter:

1. Writes `rows.json` with the Write tool, at the absolute path its prompt gives.
2. Answers with the structured output its prompt asks for: how many rows, how many requirements they cover, and
   every decision it made.

The combiner:

1. Writes `backlog.json` with the Write tool, at the absolute path its prompt gives.
2. Runs both check commands its prompt gives, `tim backlog check` and `tim distil coverage`. Each exits 1 and names
   every problem. Fix every one and run both again, until both pass.
3. Answers with the structured output its prompt asks for, including how many themes and every decision it made.
