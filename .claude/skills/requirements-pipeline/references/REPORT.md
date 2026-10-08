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

- how many increments, and how many are ready, blocked or waiting
- what the backlog builds, in one line
- how many questions are open, and that each has a default. These are only the questions that survived the
  challenge: say how many were challenged and how many precedence, a ruling or a blocker settled
- any step that must happen before building
- anything that waits on someone outside the build loop

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

A table of every increment, in build order:

| Id | What it delivers | Criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|

Criteria is the count of acceptance criteria. Status is ready, blocked or waiting, plus **Review point** where the loop stops for the owner. Say in one line what a review point is.

Then **Check these ordering decisions:** a bullet each for every call the consolidator made that the owner might want another way. Examples: an increment ordered before another for a reason, a blocked row and what unblocks it, an increment that may be too big to review and how it would split, a row that is not todo and still covers a requirement now out of scope or already met.

### 9. `## Themes`

Only when the backlog has `themes`. Leave the section out otherwise.

One line first: each theme builds on its own branch and machine, and no two touch the same code. Then a table of every theme, in landing order:

| Wave | Theme | Rows | Touches | Depends on |
|---|---|---|---|---|

Wave is the theme's place in the landing order: wave 1 lands first, and themes in one wave build in parallel. Work it out from each theme's `dependsOn`: a theme's wave is one more than the latest wave it depends on. Rows lists the theme's row ids. Touches lists its code areas as written. List any row in no theme under the table.

Then **Cross-theme dependencies:** a bullet each for every row that depends on a row in another theme, or in no theme: the two ids, the two themes, and why the order is real. Say "None" when there are none.

### 10. `## Where the requirements came from`

The coverage proof:

- claims taken, from how many sources; how many held, were dropped and were added as missed
- the areas reconcile was cut into, in one line, so the reader sees every part of the service was weighed apart
- requirements made, by status: to build (and how many already in place), questions, out of scope
- a table per source: claims, held, added, cited (the working-set claims a requirement or conflict cites), and the requirements it backs (in scope in brackets)
- one line on unused sources: `tim distil coverage` refuses a source that backs nothing, so say every source backs at least one requirement, and name any source whose cited share is low, such as under a tenth, with what its uncited claims were about
- the strongest requirements: those most sources back
- the weakest: those that rest on one source, and any that rest only on inferred claims
- anything to confirm before passing the report on

### 11. `## Out of scope`

Every `out-of-scope` requirement, grouped under a `###` heading per reason, such as problems for the owning teams, platform work outside the loop, and exclusions a source or ruling made. A table or bullets per group, each with its requirement id.

### 12. `## Terms used`

A table of every abbreviation and term of art the report uses, alphabetical.

| Term | Meaning |
|---|---|

## Skeleton

```markdown
# <Programme>: backlog report

## Summary

- The backlog has <N> increments: <n> ready to build, <n> blocked.
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

**Check these ordering decisions:**

## Themes

Each theme builds on its own branch and machine. No two themes touch the same code.

| Wave | Theme | Rows | Touches | Depends on |
|---|---|---|---|---|

**Cross-theme dependencies:**

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
- When the backlog has themes, every theme appears once in the Themes table, and every row in exactly one theme or listed as in none.
- Every figure matches the files.
- No sentence runs to 25 words. No security weakness is described in detail.
