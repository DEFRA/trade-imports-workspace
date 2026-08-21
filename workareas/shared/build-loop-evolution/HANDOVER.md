# Build loop — handover

> Paste everything below the line into a fresh session. Self-contained: it names every file you need
> and every fact that was verified rather than assumed. Read the two design threads at the end — they
> are the work, the rest is context.

---

You are continuing work on the **increment build loop** and the orchestration above it, in
`DEFRA/trade-imports-workspace`. It is built and merged. Your job is to keep refining it.

## 1. What exists

Three tiers, all on `main`, all under `.claude/workflows/`:

| Tier | File | Does |
|---|---|---|
| **L0** | `batch-orchestrator/L0-TOP-ORCHESTRATOR.md` | Top orchestrator. Starved context. Reads a ledger, spawns one L1, verifies cheaply, appends a ledger entry, spawns the next. Pulls and pushes the plan of record each batch. |
| **L1** | `batch-orchestrator/L1-BATCH-ORCHESTRATOR.md` | Batch orchestrator. Fresh subagent per batch. Owns all noisy work. Re-derives the next buildable increment after every landing. Dies at batch end. |
| **L2** | `increment-build-loop.js` | Per increment: ticket → branch → build → PR → CI → merge → main watch → Done. |

Supporting: `batch-orchestrator/README.md`, `batch-orchestrator/orchestrator-ledger.schema.json`,
`codex/{implement,review,fix}.md` + `codex/schemas/`.

**The context argument, which is the point of the whole design:** the only context-refresh primitive
available is *agent death*. A subagent starts fresh and its context is discarded when it returns; the
parent absorbs only the final report. Nothing else resets — in-session cron enqueues into the *same*
session. So L1 existing at all is the mechanism, not an optimisation. Do not collapse the tiers.

**How it got here** — PRs #3 (loop onto main), #4 (generified for any backlog, claude-or-codex),
#5 (two-tier orchestrator), #6 (ticket-to-merge lifecycle). Read those PR bodies before changing
anything; each records the reasoning and the limits, not just the diff.

## 2. Facts verified against the live system — do not re-derive, do not assume otherwise

- **The Jira board has no "In Dev".** Real transitions: `To Do`, `In Progress`, `Ready for Dev`,
  `Deskcheck`, `Dependency list`, `Dependency actioning`, `IN QA`, `Done`, `CLOSED`. Confirmed with
  `tools/jira/transition-ticket.sh <ANY-KEY> --list`.
- **`transition-ticket.sh --help` uses `In Dev` as placeholder text.** It is not board truth. A script's
  help is not a source.
- **The loop performs exactly two transitions**, `In Progress` and `Done`, both configurable. Sam's
  instruction was explicit: those two only, nothing else. Other statuses appear in the code *solely* so a
  human-moved ticket is not misread — never to move a ticket into one.
- **Never infer status order.** On this board "In Progress or beyond" is unknowable. Compare by exact
  string against the configured names only. `CLOSED` and `IN QA` are not passes however final they read.
- **`gh` is not in `.claude/settings.json`, and that is deliberate.** Sam runs auto mode, where a
  classifier grants permission. Do not add allowlist entries without asking. Note the classifier is not
  blanket-grant — it denied `git worktree remove` and a `git status` during the build session.
- **The canonical symlink now exists**: `~/git/defra/trade-imports-animals-workspace` →
  `~/git/defra/trade-imports-workspace`. Required by `CLAUDE.md` rule 1; `tools/` hardcodes it.
- **Two clones of the same repo exist** — `~/git/defra/trade-imports-animals` (older name, holds
  in-flight spike-branch work and the plant-products workarea on disk) and
  `~/git/defra/trade-imports-workspace` (canonical). Both have `origin` = `DEFRA/trade-imports-workspace`.
  The older one also has an `animals-workspace` remote pointing at the deprecated repo — a live footgun.
  **Which clone is canonical for building is still undecided.**
- **A workflow script has no filesystem, no environment, and cannot shell out.** `agent()` is its only
  primitive. This is why the workspace path is resolved by a preflight agent and why Codex is invoked
  by an agent rather than directly. Any design that needs the script to touch the world is wrong.
- **Nothing has ever been executed.** No ticket raised, no branch cut, no PR opened, no pipeline run.
  The `gh` flag combinations, the Jira create-and-transition path and the cross-repo merge ordering are
  all unverified against reality. **A single-increment dry run against a throwaway ticket was offered
  and not taken.** Offer it again before any large run.

## 3. Before any real run

- `epic` must be set — required under `lifecycle: 'full'`, no sensible default.
- `branch` changed meaning. It is the **base** branch (`main`), not a programme branch. Old configs
  carrying `spike/trace-to-requirements` will cut increment branches from the wrong place.
- **Dynamic workflow size** in `/config` — every run is 22–46 agents against a default guideline of 15.
- `lifecycle: 'local'` reverts to commit-locally-no-push. It works, and it does not hand over at all.

## 4. Known limits, carried forward honestly

- **L0's verification is cheap, so it is shallow.** It confirms a SHA, a merge and a ticket state. An
  increment that lands green and wrong is entirely L1's problem; there is no second line of defence.
- **One ledger writer, no locking.** Handover between engineers is supported; two engineers on one
  programme at once is not.
- **`gh pr merge --delete-branch`** removes the remote branch, so a crash between merge and the Done
  transition leaves a local branch with a gone upstream. The Branch stage is *told* to read that as
  "already merged, pass" — an instruction, not a mechanism. Thinnest part of the resume logic.
- **A dead L1 mid-batch loses unpushed backlog edits.** L0 pushes at batch close, not per increment.
- **Codex mode's review fan-out collapses** from 2n+1 reviewers to one brief wearing three hats, and
  per-finding `confidence` is lossy across the relay.

## 5. How to work on this

These were established the hard way during the build. Follow them.

- **Never work in Sam's checkouts.** Both have in-flight work. Use a git worktree off `origin/main` in
  the scratchpad, branch, PR, merge. Every change so far went in as its own PR.
- **Verify subagent claims yourself** before relaying them. Independently confirm the diff, the commit,
  the parse check. Agents have reported both real defects and confident nonsense.
- **Parse-check by comparison, not absolutely.** `increment-build-loop.js` has a pre-existing top-level
  `return` that esbuild rejects as an ESM error; the runtime wraps the body. Diff the error output
  against the pre-change version — identical means clean.
- **Subagents must edit with Edit/Write, never `sed`/`head`/`tail` line arithmetic.** A splice silently
  produced plausible broken code (dropped inner call, orphaned arguments) on this exact file.
- **Give every subagent a GUARD RAILS block**: no Grep/Glob tools, one command per Bash call, `~/` paths
  never literal `/Users/...`, no bare `node`, no `sonar`.
- **Do not touch `.claude/settings.json`** without asking. Permissions are Sam's decision.
- Sam delegates freely — "make sensible calls" — but wants the calls *named*, with anything genuinely
  uncertain flagged rather than smoothed over.

---

# THE WORK — two design threads

Both concern **how one increment's implementation affects the others**. Neither is built. Explore,
design, and check the design with Sam before building.

## Thread A — should related increments be worked as one unit?

If five increments all touch the same page, building them one after another may produce a worse result
than building them together: five separate passes each seeing only their own slice, five PRs, five
partial views of a page that ends up incoherent.

**The aim is the best, most coherent solution. Not fewer tokens, not less wall-clock.** If combining
produces better output it is worth being slower. Do not let any part of this design drift into an
efficiency argument.

Questions to answer:

- Can a classifier decide when increments should be combined? What is it actually keying on — same
  file, same page, same feature group, same obligation, shared acceptance criteria, an explicit
  `dependsOn` chain?
- What is the unit that gets combined — the ticket, the branch, the PR, the review, or just the
  implement stage? They can differ. One ticket with a wider brief is a different thing from five
  tickets on one branch.
- How does combining interact with the verification ladder and the review fan-out? A wider change means
  more review targets, which is `9 + 3n` agents per increment — combining raises `n`.
- What happens when a combined unit half-fails? Rollback granularity gets worse as units get wider.
  That is a real cost against the coherence benefit.

**The tension you must not paper over:** Sam confirmed earlier that the loop should build **one ticket
at a time**, specifically so it can change direction on contact with reality. Thread A pushes the other
way. The likely resolution is *one unit of work at a time, where a unit may be a coherent cluster
rather than always exactly one increment* — a refinement, not a reversal. Name this tension explicitly
in whatever you propose; do not quietly undo the earlier decision.

## Thread B — the backlog goes stale as it is built

A big design-up-front backlog is a snapshot. Twenty increments in, increments 73 and 74 may no longer
make sense. Nothing currently notices.

Sam's proposal: after an increment merges, **while waiting on the pipeline**, assess the remaining
backlog against one question — *does the implementation of this ticket fundamentally change any of the
subsequent increments?*

Three things this covers:

1. **Knock-on effects** — a later increment's premise invalidated by what just landed.
2. **Stale requirements** — a later increment describing a world that no longer exists.
3. **Newly discovered work** — implementing an increment reveals the need for another, which should be
   added to the backlog.

Design constraints, in Sam's words and his emphasis:

- **Light touch. Do not force it.** The failure mode he named directly: an agent given the job of
  checking will find something to justify the job. A reassessment that reports "no change" must be a
  first-class, expected, common outcome — and the prompt must make that psychologically easy, not
  grudging. Consider requiring evidence for any proposed change and defaulting hard to no-change.
- The pipeline watch is **genuinely idle wall-clock** — a blocking wait where nothing else happens.
  That is the natural home for this. But do not let "we have spare time" become a reason to do more
  than the question warrants; see the previous point.

Useful seams that already exist:

- **L1 already re-derives the next buildable increment after every landing.** That is the existing hook
  for noticing the backlog changed — extend it rather than bolting on a parallel mechanism.
- The loop already has a `premise-invalidated` early-return reason and a per-increment `notes` field.
- `backlog.json` is the plan of record; the ledger records batch history only. Anything this thread
  writes belongs in the backlog, and the four validation queries in L1 must still pass after any edit
  (`jq empty`, dangling `dependsOn`, forward references, unique ids).
- Adding an increment mid-run changes what "next buildable" means and can change the total. Progress is
  reported as **N of TOTAL (P%)** — work out what a growing TOTAL does to that before you change it.

Open questions worth putting to Sam:

- Who acts on a flagged change — does the loop edit the backlog itself, or halt for a human? Editing is
  faster; halting is safer, and this is a plan of record.
- Does a newly discovered increment get a ticket immediately, or sit unplanned until reviewed? The
  existing backlog already distinguishes planned increments from `UNPLANNED — DO NOT BUILD` stubs.
- Should reassessment look at the whole remaining backlog every time, or only increments that share
  files, a feature group, or a `dependsOn` edge with what just landed? Whole-backlog is thorough and
  gets expensive; scoped is cheap and can miss the surprising ones — which are exactly the ones worth
  catching.
