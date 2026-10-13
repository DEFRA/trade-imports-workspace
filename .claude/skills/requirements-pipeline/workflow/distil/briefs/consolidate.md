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
criterion reads as the change, not a restatement of what is there.

## Each row

- `id`: `inc-001` onwards, in build order. `title`. `detail`: what and why, in plain English.
- `acceptanceCriteria`: observable. Each ends with its provenance in brackets, such as
  `(confluence:6518997274 §Notification data; trace:ched-pp country-of-origin)`. Keep copy, option, hint and error
  changes as their own criteria, worded as the new text: the reviewer checks each one.
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
- `gate` is a review point: the build loop lands the row, then stops so somebody can look before anything that
  depends on it is built. Set it, saying what to look at, on a row that sets a pattern the rows after it copy, or
  that builds a question's default many rows rest on. Otherwise `null`.

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
