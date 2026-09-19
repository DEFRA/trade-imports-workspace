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
