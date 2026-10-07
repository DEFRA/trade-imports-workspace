# Consolidate: requirements into backlog.json

You turn the adopted `new` and `change` requirements into increments, and write `<workarea>/backlog.json` in the one
backlog shape. Your prompt names the files and the two check commands.

Read these before you write a row:

- `.claude/skills/requirements-pipeline/references/backlog.schema.json`: every field of the envelope and the row.
  `tim backlog check` validates against this file.
- `.claude/skills/requirements-pipeline/references/SHAPE.md`: the rules a schema cannot check. A row is a
  requirement, never a recipe. A row is a full-stack slice, never a layer. What an acceptance criterion may and may
  not name. Provenance.
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

An `exists` requirement is already met. It goes in the report, never in a `todo` or `blocked` increment. An acceptance criterion
reads as the change, not a restatement of what is there.

## Each row

- `id`: `inc-001` onwards, in build order. `title`. `detail`: what and why, in plain English.
- `acceptanceCriteria`: observable. Each ends with its provenance in brackets, such as
  `(confluence:6518997274 §Notification data; trace:ched-pp country-of-origin)`.
- **Every acceptance criterion can be observed in every environment the row names.** Never write one that cannot,
  such as a real cloud service on a local stack that has none. That is a reconcile problem, not yours to settle.
  Put the requirement in your answer's `reconcileProblems`, with the environment and why, and the workflow sends it
  back to the reconciler. Where a question's default already says what each environment gets, write the criterion
  per environment to match it.
- `requirements`: the requirement ids it covers. Every adopted `new` or `change` requirement sits in exactly one
  increment whose status is `todo`, `blocked`, `done` or `deferred`.
- `sources`, `repos`, `kind`, `dependsOn` (a real ordering need only, never a layer order), `status`.
- `repos` is written in **merge order**, provider before consumer: a service before the frontend that calls it, a
  stub before the service that calls it, and a tests or performance-tests repo after every service it exercises.
  The build loop merges a row's PRs in that order, unless the keys are exactly `frontend`, `backend` and `tests`,
  which always merge backend, then tests, then frontend.
- `openQuestions` where a question touches it. A row a question touches is `todo` when the question has a default,
  so the builder follows the default and says so. It is `blocked` only when there is no safe default to build.
- A row that needs somebody to act first, such as a platform change, says so in `notes` and is `blocked` until
  they have.
- `gate` is a review point: the build loop lands the row, then stops so somebody can look before anything that
  depends on it is built. Set it, saying what to look at, on a row that sets a pattern the rows after it copy, or
  that builds a question's default many rows rest on. Otherwise `null`.

## The envelope

- `programme`, `generatedFrom` (every source id), `invariants` (rules every increment keeps, each once).
- `repos`: the table the build loop takes, written from `sources.json`'s `repos`. Each key's `path` as it is there,
  and its `github` slug `DEFRA/<folder name>` unless the repo's remote says otherwise. Check each with the
  `git -C <workspace>/<path> remote get-url origin` command your prompt gives.
- `themes`, only when `sources.json` has a `themes` rule (see "Themes" above).

## Themes

Only when `sources.json` has a `themes` rule. It says how to draw the boundaries; follow it. The rules a theme keeps
are in `SHAPE.md`, "Themes".

- **Work out what code each row's requirements touch** from the evidence: the `repo:` sources' extracts, and the
  pages, records and specs the requirements name. Group rows whose code is the same, so no two themes touch the same
  path.
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

1. Write `backlog.json` with the Write tool, at the absolute path your prompt gives.
2. Run both check commands your prompt gives, `tim backlog check` and `tim distil coverage`. Each exits 1 and names
   every problem. Fix every one and run both again, until both pass.
3. Answer with the structured output your prompt asks for, including every decision you made.
