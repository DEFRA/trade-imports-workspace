# Lessons from the bootstrap build

Each lesson below changes a later increment of this programme, which is named in the lesson.

## L1: the plan audit needs a severity split (applies to inc-018, plan-audit)

On the inc-003 canary (run `wf_839ff25f-d65`), the audit gate was valuable, and then it never
passed.

- **Round 1 caught two real defects.** The first was a false premise: "the only tracked workflow is
  `increment-build-loop.js`", when `git grep` finds three more. The second was a build-cost reason
  that R8 forbids: acorn was rejected as "a new dependency".
- **Round 4 still failed, on one invariant command.** The command used `git diff` where it needed
  `git diff HEAD`. The implementer could have corrected that while executing.

An auditor told to "pass only if there are no objections" finds something every round. The fix,
now in `bootstrap-build.js`:

- **Blocking objections** fail the gate. They are: a false premise, a criterion that is uncovered or
  unproven, scope that no atom asks for, a breach of R1-R8 or the rails, and a design deviation
  not justified on merit.
- **Notes** pass. They are handed to the implementer, who must address them.

**How to apply:** the plan-audit output contract in DESIGN 7.4 stage 8 and 8.1 must carry
`objections[]` (blocking) and `notes[]`, and `advance` must pass the notes into the implement
task's input. The plan-audit brief must define both classes as above.

## L3: the plan audit must converge (applies to inc-018, plan-audit)

Even with a survey (L2) and blocking objections split from notes (L1), inc-005 failed four audit
rounds. This time each round raised a **new** valid blocking objection, where before the same
one had come back. The planner rewrote a 50 KB plan every round, and the fresh auditor found the
next issue. The batch spent 17 million subagent tokens to land a single increment.

The first audit round is where the value is: every canary's round 1 caught a real false premise.
Later rounds are a perfectionist loop. They are also redundant, because acceptance tests every
criterion independently against the final change.

**The fix, now in `bootstrap-build.js` (ruled by Sam, 21 September 2026):**
- At most two rounds.
- Round 2 is a **convergence** check. It asks whether each round-1 objection was resolved, and
  whether the revision introduced a regression.
- Anything else round 2 notices becomes a note for the implementer.

**How to apply:** DESIGN 7.4 stage 8 must bound plan-audit to two rounds, with round 2 given only
round 1's objections. `advance` enforces the bound, and the auditor's prompt does not.

## L4: size review by the diff (applies to inc-019, review)

In inc-004, 102 of 140 agents were per-file reviewers. Most of the files were one-line import
repoints left behind by moving two modules. A one-line change does not need two dedicated
reviewers.

**The fix, now in `bootstrap-build.js` (ruled by Sam, 21 September 2026):**
- A new file, or a file with more than 12 changed lines, keeps a dedicated style reviewer and a
  dedicated code reviewer.
- Smaller changes are grouped, at most 15 files to a group. Each group gets one reviewer, who
  applies both skills' personas, read live.
- Every changed file is still reviewed.

**How to apply:** DESIGN 7.4 stage 13 and the manifest (stage 12) must record each file's
changed-line count and route review on it. The threshold and group size are run knobs in
`run.json`, not backlog fields (R5). Codex gets the same routing (R6).

## L2: an increment that changes existing code needs a survey before the plan (applies to inc-018, plan)

inc-004 (generalise the parity writer into a core that serves any programme) failed the audit four
rounds running, and every objection was true. The audit cited, for instance, `ingest.js:287-290`,
where `numberOf` hardcodes `/^inc-(\d+)$/`, and the known-id map built on `increment.source` but
looked up with `finding.file`. A requirements backlog would therefore hand out colliding ids,
which is the very failure the requirement names as its falsifier.

The planner was not careless. It planned a generalisation without an inventory of where the code
assumes its current shape, so each round of audit surfaced another buried assumption. Four Opus
plan-and-audit pairs were spent to learn what one careful read of the module gives you.

**The fix, now in `bootstrap-build.js`:** a SURVEYOR runs before the planner and writes
`build/surveys/<id>.md`: files in scope, every assumption the live code makes that the requirement
would break (with file:line), mismatched store-and-read field pairs, tests that pin current
behaviour, the smallest set of seams, and any design claim the live code contradicts. The planner
must account for every item; the auditor checks the plan against the survey as its point (0).

**How to apply:** the plan stage in DESIGN 7.4 must take a survey input for any increment that
changes existing code. Either add a survey task before plan in the stage table, or make the
plan task's prepare step include the survey and require the plan to answer it. A survey by a
cheaper model pays for itself against one Opus plan-audit round, and the survey is also what the
plan auditor checks against.
