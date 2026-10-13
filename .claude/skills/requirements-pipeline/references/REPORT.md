# REPORT — the DISTIL report

The report is the one thing the user reads after a DISTIL run. It leads with the decisions they must make, and it proves the backlog covers the sources. The distil workflow's report step drafts it from the files on disk and returns it as text. The main session saves it as `workareas/<workarea>/report.md`.

Every figure comes from the files: `sources.json`, `distil/requirements.json`, `distil/conflicts.json`, `backlog.json`, and the counts the workflow passes in. Never estimate a number you can count.

## Writing rules

These follow [`docs/best-practices/gds/language.md`](../../../../docs/best-practices/gds/language.md). A first draft was rejected as waffle. These rules are why.

- **Short sentences.** Under 25 words each. One idea a sentence. Front-load what matters.
- **Active voice.** "The loop builds inc-003", not "inc-003 is built by the loop".
- **No negative contractions.** Write "cannot", "do not", "will not".
- **Tables for comparisons.** Use a table wherever a reader compares values: repos, precedence, increments, sources, test data, limits.
- **No filler.** No "It is worth noting", no "In order to", no recap of what a section is about to say.
- **No detail lost.** Short is not vague. Keep every id, figure, default and dependency.
- **Plain words.** Explain every abbreviation on first use, and list it in the terms table.
- **Numbers.** "one" in words, 2 and up as numerals, commas above 999, dates as 29 September 2026.
- **Security.** Never describe a security weakness in detail. The report may be pushed to a public repo. Name the finding, its requirement id and its owner, and say the detail is in the programme's local files.
- **Ids.** Cite requirements, conflicts and increments by id (`req-012`, `c-004`, `inc-007`), so a reader can look them up.

## Structure

Use these sections, in this order, with these headings. Leave out a section only where it says so.

### 1. `# <programme>: backlog report`, then `## Summary`

About five bullet lines. Each one is a fact the reader acts on:

- how many increments, how many are ready to go and how many are blocked, and what the blocked ones wait on
- what the backlog builds, in one line
- how many questions are open, and that each has a default. These are only the questions that survived the
  challenge: say how many were challenged and how many precedence, a ruling or a blocker settled
- any step that must happen before building
- anything that waits on someone outside the build loop
- any theme split off early that has work to pick up, naming its branch

### 2. `## Before you build: step 0`

Any change that must land before the build loop can run this backlog, such as a loop limit or a platform deployment. Say what to change and why. Leave the section out when there is none.

### 3. `## Decisions the pipeline made`

- **Repos.** A table: key, repo, why it is in `repos`. Then one line naming repos that are read but not changed.
- **Which source wins a disagreement.** The precedence from `sources.json`, highest first, as a numbered list. Name each source in words a reader knows, with its id where it helps.

### 4. `## Questions for <owner>`

Questions are minimal by default: every question the reconcilers raised was challenged against precedence and every ruling, and only the ones nothing settles are here. One line first: how many were challenged, how many were settled or found to wait on a blocker, and that each question left lists the default built if nobody answers. Then one heading per `question` conflict still in `conflicts.json`, numbered, worded as the question:

```markdown
### 1. <The question, as the owner would ask it>

- **Default:** <what is built if nobody answers>
- **Affects:** <the increments that change with the answer>
- **Why it is open:** <what the sources say, and why they do not settle it>
```

Use the same three labels, in the same order, every time. Where a default holds several values, put a table between the heading and the labels.

### 5. `## Waiting on others`

Every adopted requirement with `blockedBy`: what it needs, who must act, and the blocked increment that builds it. A blocker is never a question: the design is settled, and the row builds once somebody outside the programme acts. Leave the section out when there is none.

| Requirement | Waiting for | Increment |
|---|---|---|

### 6. `## Settled without a question`

A table of every `precedence` conflict: the decision, the source or rule that settled it, and the conflict id. Mark the ones the challenge settled, so the owner sees which questions a ruling answered.

| Decision | Settled by | Conflict |
|---|---|---|

### 7. `## Already in place`

A table of every adopted requirement whose delta is `exists`: the requirement and what already meets it. Leave the section out when there is none.

| Requirement | What already exists |
|---|---|

### 8. `## The increments`

Two groups, so the reader sees at once what can be built now and what cannot. Never number waves or phases.

`### Ready to go`: a table of every `todo` row, in build order:

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|

Criteria is the count of acceptance criteria. Lands after lists the row ids in `dependsOn` and `externalDependsOn`, the only order there is: a row builds once those have landed. Mark **Review point** where the loop stops for the owner, and say in one line what a review point is.

`### Blocked`: every `blocked` row, grouped under one `#### Waiting on <what>` heading per blocker, named in plain words: "Waiting on design", "Waiting on MDM commodities". Take the blocker from the `blockedBy` of the row's requirements. Order the groups by row count, largest first. Each group opens with one line: what must happen and who acts. Then a table:

| Id | What it delivers | Repos | Theme |
|---|---|---|---|

A row with two blockers goes under the first, and its line names the second.

Rows that are `done`, `deferred` or `dropped` go in one short table after both groups, with their status.

Then **Check these ordering decisions:** a bullet each for every call the consolidator made that the owner might want another way. Examples: an increment ordered before another for a reason, a blocked row and what unblocks it, an increment that may be too big to review and how it would split, a row that is not todo and still covers a requirement now out of scope or already met.

### 9. `## Themes`

Only when the backlog has `themes`. Leave the section out otherwise.

One line first: each theme builds on its own branch and machine, and no two touch the same code. Then a table of every theme. Themes with ready rows come first, those that can start now (depending on no other theme) at the top. Themes whose rows are all blocked come last:

| Theme | Ready | Blocked | Touches | Lands after |
|---|---|---|---|---|

Ready and Blocked are the theme's row ids by status. Touches lists its code areas as written. Lands after lists the themes in its `dependsOn`, or "nothing: can start now". Never number waves. List any row in no theme under the table.

A theme split off early (the backlog's `splitOff`) is in the table too. Its Ready cell says "split off to `<branch>`", because its rows live only in its own backlog.

Then **Cross-theme dependencies:** a bullet each for every row that depends on a row in another theme, or in no theme: the two ids, the two themes, and why the order is real. A row's `externalDependsOn` on a split-off theme's workarea counts. Say "None" when there are none.

### 10. `## For the split branches`

Only when a theme split off early has something to pick up. The workflow passes the list in. Leave the section out otherwise.

A split-off theme's rows live only in its own backlog, on its own branch, so a re-distil never rewrites them. This section is how a later ruling reaches them. One line first: the people building each branch add or change rows in that branch's own backlog, citing the requirement ids below.

Then one `###` heading per theme, named by its id, with its branch and workarea in the first line, and a table:

| Requirement | What happened | What it now says |
|---|---|---|

What happened is one of:

- **New since the split.** A requirement adopted after the split whose code falls in the theme's touches (its pointer's `pickUp`). The branch adds a row for it.
- **Changed since the split.** A requirement the theme held, still to build, whose statement, status, delta or blocker has changed. The branch rewrites the row that covers it.
- **No longer to build.** A requirement the theme held that is now out of scope, a question or gone. The branch drops or rewrites the row that covers it.

Each requirement sits under one of these, never two. A requirement the theme held that is now already in place (`nowInPlace` in the coverage result) is usually one the branch built and merged: leave it out of this section. It appears with every other `exists` requirement.

What it now says is the requirement's statement as `distil/requirements.json` has it, or its new status.

### 11. `## Where the requirements came from`

The coverage proof:

- claims taken, from how many sources; how many held, were dropped and were added as missed
- the areas reconcile was cut into, in one line, so the reader sees every part of the service was weighed apart
- requirements made, by status: to build (and how many already in place), questions, out of scope
- a table per source: claims, held, added, cited (the working-set claims a requirement or conflict cites), and the requirements it backs (in scope in brackets)
- one line on unused sources: `tim distil coverage` refuses a source that backs nothing, so say every source backs at least one requirement, and name any source whose cited share is low, such as under a tenth, with what its uncited claims were about
- the strongest requirements: those most sources back
- the weakest: those that rest on one source, and any that rest only on inferred claims
- anything to confirm before passing the report on

### 12. `## Out of scope`

Every `out-of-scope` requirement, grouped under a `###` heading per reason, such as problems for the owning teams, platform work outside the loop, and exclusions a source or ruling made. A table or bullets per group, each with its requirement id.

### 13. `## Terms used`

A table of every abbreviation and term of art the report uses, alphabetical.

| Term | Meaning |
|---|---|

## Skeleton

```markdown
# <Programme>: backlog report

## Summary

- The backlog has <N> increments: <n> ready to go, <n> blocked. The blocked ones wait on <blocker> (<n>), <blocker> (<n>).
- <What it builds, in one line.>
- <N> questions are open, of <n> challenged. Each has a default, so building can start without an answer.
- <Any step before building.>
- <Anything that waits on someone outside the loop.>

## Before you build: step 0

## Decisions the pipeline made

**Repos (<N>).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|

**Which source wins a disagreement**, highest first:

1. <source>

## Questions for <owner>

<n> questions were challenged against precedence and every ruling; <n> were settled and <n> wait on others. Each
question left lists the default that will be built if nobody answers.

### 1. <question>

- **Default:**
- **Affects:**
- **Why it is open:**

## Waiting on others

| Requirement | Waiting for | Increment |
|---|---|---|

## Settled without a question

## Already in place

## The increments

### Ready to go

| Id | What it delivers | Criteria | Repos | Lands after | Theme |
|---|---|---|---|---|---|

### Blocked

#### Waiting on <what>

<What must happen, and who acts.>

| Id | What it delivers | Repos | Theme |
|---|---|---|---|

**Check these ordering decisions:**

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Theme | Ready | Blocked | Touches | Lands after |
|---|---|---|---|---|

**Cross-theme dependencies:**

## For the split branches

Each branch below adds or changes rows in its own backlog for these requirements.

### <theme id>

Branch `<branch>`, backlog `<workarea>/backlog.json`.

| Requirement | What happened | What it now says |
|---|---|---|

## Where the requirements came from

## Out of scope

## Terms used
```

## Done means

- The summary is about five lines, and every line is a fact the reader acts on.
- Every `question` conflict left after the challenge has its own heading with Default, Affects and Why it is open, and no settled or blocked one is written as a question.
- Every requirement with `blockedBy` appears once under Waiting on others.
- Every source appears in the per-source table with its cited count.
- Every `precedence` conflict, every `exists` requirement, every increment and every `out-of-scope` requirement appears once.
- Every `todo` row is under Ready to go and every `blocked` row under one Waiting on heading. No wave or phase number appears anywhere.
- When the backlog has themes, every theme appears once in the Themes table, and every row in exactly one theme or listed as in none.
- Every requirement the workflow lists for a split branch appears once under For the split branches, under its theme, and the summary says a split branch has work to pick up.
- Every figure matches the files.
- No sentence runs to 25 words. No security weakness is described in detail.
