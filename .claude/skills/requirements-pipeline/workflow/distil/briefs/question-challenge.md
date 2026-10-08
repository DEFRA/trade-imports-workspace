# Question challenge: settle every question a rule can settle

Questions are minimal by default. A reconciler raises a question when it cannot see what settles a difference. A
challenger looks again, harder, at one question: precedence and every ruling. Only a question that survives the
challenge reaches the report and the owner. This step is how the rule is enforced: a reconciler's question is a
proposal, never the last word.

The verdict's shape is defined, field by field, in
`.claude/skills/requirements-pipeline/references/challenge.schema.json`. Read it before you write.

## Challenging one question

Your prompt names one question conflict. Read it, every requirement that cites it, every claim its positions rest on,
and every ruling source's claims. Then decide, in this order:

1. **Does a ruling settle it?** Read every ruling, including the rules a ruling sets for weighing the others, such as
   "the prototype wins by default; only a judgement on the same difference, or a real constraint the prototype cannot
   express, overrides it". Apply each rule to this difference. A ruling that says how differences of this kind are
   settled settles this one, even when it does not name it.
2. **Does precedence settle it?** Where the positions come from two or more sources, the higher-ranked source in
   `sources.json`'s `precedence` wins, unless a ruling says otherwise.
3. **Is it a blocker, not a choice?** Where the difference waits on somebody outside the programme (a platform team
   raising a limit, access being granted, another team's ticket) and the design itself is settled, it is never a
   question. Its verdict is `blocked`: what is adopted is the design, and `blocker` says who must do what.
4. **Only then a question.** Where neither a ruling nor precedence settles it, and it is truly a choice a person must
   make, the verdict is `question`. `why` says what the person must weigh that nothing settles. `outcome` is the
   default that will be built if nobody answers.

Common cases:

- A judgement an earlier release made on the same difference, where a ruling says such judgements override the
  default: `precedence`, following the judgement, citing the ruling claim and the judgement's claim.
- A difference where the ruling's default winner (such as the prototype) is clear and no override applies:
  `precedence`, the default winner.
- A size, rate or quota the platform caps, with a ticket to raise it: `blocked`, the design's value adopted, the
  blocker naming the platform change and its ticket.
- Two readings of the target that build different things for different environments, with nothing that ranks them:
  `question`, with a default that says what each environment gets.

Write the verdict to the file your prompt names. Cite in `claims` the ruling claims you applied and the winning
position's claim. For `precedence` and `blocked`, list in `overruled` the position claims the outcome sets aside. Run
the check command until it passes, and answer with the structured output your prompt asks for.

You write the verdict only. The apply step rewrites the conflict and its requirements.

## Applying the verdicts

The apply step reads every verdict that settles its question and rewrites `requirements.json` and `conflicts.json`
to match:

- **A `precedence` verdict.** The conflict's `resolution` becomes `precedence`, its `outcome` the verdict's outcome,
  its `overruled` the verdict's overruled claims, and it loses `question` and `default`. Every requirement that cites
  only settled conflicts becomes `adopted` (or `out-of-scope`, where the outcome excludes it), reworded to what the
  outcome adopts, with no overruled claim left in its `claims`. A precedence conflict needs positions from at least
  two sources: where the ruling is what settles it, add the ruling's position, citing the ruling claim.
- **A `blocked` verdict.** As for precedence, and every requirement it holds back is `adopted` with `blockedBy` set to
  the verdict's blocker. The consolidator puts it in a `blocked` row whose open questions name the blocker.
- **A `question` verdict.** Nothing to apply: the question stands.

`tim distil coverage` checks each verdict was applied: a settling verdict's conflict is no longer a question, and a
blocked one's requirements carry `blockedBy` and none is still a question. Fix every problem it names, and check again
until it passes.
