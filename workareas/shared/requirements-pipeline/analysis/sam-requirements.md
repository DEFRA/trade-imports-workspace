# Sam's hard requirements (verbatim intent, 2026-09-18)

## R1 — the brief
A requirements **distiller** that takes loose requirements from anywhere, including several
complementary sources, and writes a `backlog.json` of increments to build the thing. A backlog
**implementor** skill that works through `backlog.json` and uses Workflow to implement each
increment, in **claude-only** mode or **claude-driving-codex** mode.

- Not a build from zero: take the best bits of what exists and make it hang together.
- One `backlog.json` format across distiller, driver and build loop.
- A backlog increment is a **requirement** (what, why, acceptance). It is never a recipe (files,
  steps, code). The workflow owns the implementation, and plans it just in time.
- Distillation is **two-pass**: pass 1 writes the smallest increments until every requirement has
  been identified; pass 2 then **combines related increments** to cut per-increment workflow
  overhead.
- Quality matters above all, especially the requirements gathering and the **report** the distiller
  produces.

## R2 — the implementor reuses the workspace review skills live
The implementor's review stages must use the workspace `review` skill and the workspace
`code-style` skill, so any update to either skill is picked up automatically. Do not copy the
personas, rubrics or best-practice bundles into the workflow script or the codex briefs.
Reference them by path at run time: the SKILL.md, `references/*.md`, the best-practice bundles
the skills route each language to, and any mode or bundle routing the skill defines.

## R3 — path-scoped rules must reach the agents that write and review code
`.claude/rules/*.md` files with `paths:` globs (node, java, gds, playwright, k6, copy) must apply
whenever an agent works on a matching file. The harness loads them natively in the main session
when a matching file is Read. Whether they also load inside Workflow agents and subagents is
being probed, and the result is recorded in `rules-probe.md` here. In **codex** mode they never
load natively: Codex does not read `.claude/rules`. So the implementor must, at the least, resolve
which rule files match the changed and planned files and hand those rule files (by path) to every
codex stage. It must do the same for Claude stages if the probe shows they do not load there.

## R5 — the backlog does not depend on how it will be built
When the backlog is written, nobody knows whether it will be built Claude-only,
Claude-driving-Codex, or a mix, and the choice can change between increments. So:

- `backlog.json` carries **nothing specific to one executor**. No Claude-only fields (skill
  invocations, harness-loaded-rule assumptions, model tiers, Workflow args) and no Codex-only fields
  (briefs, output schemas, sandbox flags).
- Any context an increment needs is always written in, in a form any executor can use. That means
  the requirement, its acceptance, where it came from, which repos and areas it touches, and the
  open questions. It never relies on "the harness will inject it". If context would help one
  executor, write it into every increment so every executor gets it.
- Choosing the executor is a decision made at run time by the implementor, per run or per
  increment. All executor-specific context is resolved by the implementor at that moment,
  for whichever executor is building: the matching rules and the best-practice files they point to,
  the review and code-style persona files, the model tiers and the prompt shape.
- Test for it: the same `backlog.json`, unmodified, must build under either executor. Switching
  executor part-way through a backlog must need no backlog edit.

## R6 — Codex is a full executor, not a lesser fallback
Sam hits the weekly Claude limit, and today dropping into Codex mode gives worse results. Codex
has to be **seamless and just as good**. Sam should be able to say "delegate this batch of
increments to Codex" and have it build to the same standard, with no backlog edit and no
hand-holding.

What makes today's Codex mode worse, going by the README on main:
- one Codex reviewer over the whole change, instead of a style reviewer and a code reviewer per
  file plus a consistency reviewer
- no path rules or best-practice files
- a confidence value folded into prose
- only three stages delegated

The fix:
- **One stage contract, two adapters.** Every stage (plan, implement, review, verify, judge, fix,
  ladder, land) has one input contract and one output JSON schema, and **both executors run the
  same review personas and the same granularity**. Where Claude fans out one reviewer per file,
  Codex fans out one `codex exec` per file too, run concurrently. The personas are the workspace
  `review` / `code-style` persona files, read live by path (R2).
- **Instructions specific to each executor live in the implementor, not the backlog.** Sam's own
  suggestion: the backlog can carry metadata that one or both executors read, and the executor
  flag switches in "in Codex mode do X, in Claude mode do Y" instructions. Refinement: the backlog
  carries only **neutral** metadata that both executors can use (R5). Each executor gets an
  **executor profile**, a file owned by the implementor, holding that executor's preamble and
  deltas. Codex's preamble says: ignore the Claude GUARD RAILS; here are the rule files and the
  best-practice files they point to, resolved at run time; use `--output-schema` with every key
  listed as required. Claude's preamble says: the harness loads rules on Read, so follow their
  pointers and read a sibling file before writing. Each stage prompt = shared stage brief +
  executor profile + increment. That gets the effect Sam asked for, and the backlog stays free of
  executor detail.
- **Codex should take the heavy work.** The purpose is to save Claude usage. In Codex mode every
  stage that uses a lot of tokens runs on Codex: plan, implement, per-file review, adversarial
  verify and fix, and optionally judge. Claude keeps only thin orchestration: the shell and relay
  agents on the cheapest tier at low effort, and the checks against what is on disk. Which stages
  go to Codex is a per-run knob, with sensible defaults.
- **Switching is a sentence, not a config edit.** The implementor skill accepts "build inc-012 to
  inc-020 with Codex", or "Codex for the rest", and moves the executor between increments, reading
  it from the run state, not the backlog.
- **Parity proof.** Before this is called done, run one small increment each way and compare
  how thorough the review was, what the judge ruled and what the ladder showed.

## R7 — full-stack slices, never one repo at a time (added mid-design, 2026-09-18)
Sam: at one point the process would only touch one repo at once, so there was an increment for
the backend, then one for the frontend, then one for the tests. **That is an anti-pattern.** We
want full-stack slices of functionality. They produce better results because of the value of
shared context, and because the slice properly tests how the parts integrate.

- **An increment is a vertical slice of behaviour.** It spans every repo that behaviour needs:
  backend, frontend, tests, and any others (reference-data, stub, gateway, and so on). Repos are a
  **derived consequence** of the slice, never the way work is divided up. No increment may be
  "the backend half of X" or "the tests for X".
- **Pass 1 atoms are thin vertical slices too.** The smallest unit is the thinnest end-to-end
  behaviour a user or system can observe. It is not a per-repo task. Pass 2 combines related
  slices; it never re-splits them by layer.
- The distiller's checks must **reject layer-split increments**: an increment whose acceptance
  can only be observed after another increment in a different repo lands. The same goes for
  `dependsOn` chains that mirror backend → frontend → tests.
- **The implementor plans, builds, reviews and tests the whole slice in one pass.**
  - One plan across all repos touched.
  - One implementation context.
  - Reviewers see the change in every repo; the consistency reviewer checks the contract between
    repos.
  - The ladder runs every touched repo's rungs.
  - The definition of done includes an **integration proof**: E2E or a contract test in the tests
    repo exercising the slice through the real stack.
  - The same branch name in every repo (CLAUDE.md rule 2).
  - One PR per repo, landed as one unit, in provider-before-consumer merge order.
- Existing layer-split increments in legacy backlogs are re-slices at migration, not a precedent.

## R8 — build the right thing; the cost of building it is not a criterion (added 2026-09-18)
Sam: "time to implement the skill and the journey is absolutely not something to focus on. The
cost of building the factory versus the amount of time it will get run … Don't go 'it'll be fewer
changes to do this solution, so we're going to weight it heavier' … build the right thing."

- Choose between design options only on what they are like in use: output quality, the quality
  of the requirements and the report, Codex/Claude parity, full-stack slices, correctness, and
  whether they can operate under the rails. Operating under the rails is a real constraint; a
  design that cannot run is wrong.
- Implementation effort, the number of new files, diff size and "least new surface" carry **zero
  weight**. "Take the best bits" means reuse the good ideas and proven mechanisms, not minimise
  change. Where a rebuild is better in use, rebuild.
- Collapsing a fixed per-run overhead **is** a valid criterion, because it pays back on every run.
- Known contamination to undo: the design panel's "reuse / smallest new surface" angle and the
  judges' `reuse` dimension decided a tie. Every decision that rested on reuse or build cost must be
  re-decided on merit.

## R9: scope with sense, because R8 is not a licence to gold-plate (added 21 September 2026)

After 6 of 34 increments had landed 24,000 lines, Sam: "This is crazily slow. What's making this
work so big? It's a few CLI wrappers and prompt files?" and "re-scope with some sense".

- R8 means: when choosing between two ways to meet a requirement, do not pick the worse one
  because it is cheaper to build. It does **not** mean every risk a critic can imagine earns a new
  mechanism, or that nothing is ever cut.
- The scope is what Sam asked for in R1 to R7, done well, and **no more**:
  - a distiller: sources to verified vertical-slice atoms, a combine pass, `backlog.json`, a
    decision-led report;
  - an implementor: plan, audit, implement, review with the live workspace skills, verify,
    judge, fix, ladder, acceptance, land;
  - both working in Claude or Codex mode from the same backlog, with mechanical steps run as tim
    commands by a cheap runner.
- A mechanism earns its place only if it prevents a failure that has **actually happened**, or
  that the requested behaviour cannot work without. It does not earn its place because a critic
  can imagine it.

## R4 — hooks
Per-tool-call hooks (`PreToolUse` guard-bash, guard-edits and the sonar secrets check;
`PostToolUse` on git push) are configured in the workspace `.claude/settings.json` and do fire
inside subagents and workflow agents. The EUDPA-249 run proved it.

Session-level hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) do not fire inside workflow
agents. That includes each repo's `Stop` hook that runs `sonar analyze agentic`, which only
applies to a session whose working directory is that repo. So:

- Every agent prompt needs the permission-safe GUARD RAILS block, so the per-call hooks stay
  quiet.
- Anything a session-level hook would have done must be an **explicit** step in the workflow,
  or a step the driving session runs, or a gate recorded for Sam. The sonar check is the case
  in point: `sonar` is not allowlisted for agents.
