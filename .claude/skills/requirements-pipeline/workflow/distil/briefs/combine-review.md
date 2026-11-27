# Combine review: merge the rows that suit combining

You review the finished `backlog.json` and merge the rows that suit combining. You write one file: the backlog.
Your prompt names it, the candidates, and the check commands.

Every row carries a fixed cost: a ticket, a branch, a plan, reviews, the ladder, a pull request and CI. Two rows
that share their code area, or that only wait on each other, repeat that cost for little gain.
`tim backlog combine-candidates` lists the pairs. You judge them.

Read these before you merge a row:

- `.claude/skills/requirements-pipeline/references/backlog.schema.json`: every field of the row.
- `.claude/skills/requirements-pipeline/references/SHAPE.md`: the rules a schema cannot check.
- `sources.json`, `distil/requirements.json` and `distil/conflicts.json`, for what each row's requirements say.

## The default is to combine

Merge each candidate pair unless the rows' notes, or what you find in the rows, give one of these reasons to stand
alone:

- **An open question the other row does not carry.** Merging would hold the other row's work behind a decision.
- **A different code area.** The pair shares a wait, or a broad touch, but builds in code that has nothing in
  common.
- **Too much for one plan.** The merged row would touch more than 3 service repos, or carry more than about 15
  acceptance criteria.

These are not reasons: "smaller is safer", a layer split (a row for the backend and a row for the frontend of one
behaviour), or different headings in the source.

## How to merge

A merge keeps the earlier row of the pair, and that row takes everything the other row held:

- its `acceptanceCriteria`, `requirements`, `sources`, `touches` and `openQuestions`, added to the earlier row's
  with none repeated;
- its `dependsOn`, so the earlier row's `dependsOn` becomes the union of both rows', minus any entry naming either
  of the two rows;
- its `repos`, added in merge order, provider before consumer;
- a note naming what it absorbed and why the two suit one plan, such as `Absorbed inc-007: both change the origin page.`

The row merged away keeps its id and changes in two ways only:

- its `status` becomes `merged-into`;
- it gains a note naming the one row it went into, such as `Merged into inc-004.` Its notes name no other row that is
  still to build.

No id is reused and no row is added. Where a row that waited on the merged-away row now waits on the row it went
into, change its `dependsOn` to match, and drop a `dependsOn` that would make a row wait on itself.

Each candidate you keep apart gets a note on the earlier row saying which of the three reasons holds, such as
`Stands alone from inc-009: it carries an open question inc-009 does not.`

## What you never do

- Merge a pair the prompt does not list.
- Change a row whose status is not `todo`, except the rows you merge away.
- Reword a criterion, add a requirement or draw a theme. The combiner did that.
- Remove a row.

## Finishing

1. Write `backlog.json` with the Write tool, at the absolute path your prompt gives.
2. Run every check command your prompt gives, and fix each problem they name, until they all pass.
3. Answer with the structured output your prompt asks for: one line for each row merged away, one line for each
   candidate kept apart with its reason, and every decision you made.
