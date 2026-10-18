# Code-quality factory changes: brief for every agent

Branch `chore/NO_JIRA-code-quality-factory` in the workspace and in every repo touched. Based on each repo's `origin/main`. Sam merges; nothing here merges.

Read first: [`report-v2.md`](report-v2.md) (the causes and the ranked recommendations), [`memory-audit.md`](memory-audit.md) (team rules that live only in Sam's personal memory and where each belongs).

## What we are fixing

AI-written code here is hard for a human to reason about. The main problems, in order of harm: structure (logic in the wrong layer, a second mechanism beside an existing one, one rule written in several places), names that hide what the code does, comments that go stale or prop up a weak name, logging without context, and tests whose titles claim more than they prove. Causes: a strict plan that writes code text and is never reviewed; a verifier and judge that throw code-quality findings away as "taste"; rules that live in one prompt, in personal memory, or that the written guides contradict; nobody keeping nearby docs, recipes and comments true; writers with no review; no mechanical checks.

## Binding constraints (Sam's rulings)

1. Review stays full strength. Never narrow, skip or weaken review because a better implementor or plan should do the job.
2. "Work at a lower level of abstraction / closer to the code / talk it through" is not an answer. The factory must produce readable code without it.
3. The verifier's default depends on the kind of finding. Functional findings: default refuted, as now. Code-quality findings (naming, comments, structure, duplication, logging, test readability, history in code): default real, fixed. "Taste", "pre-existing", "out of scope", "a comparable file does it" never refute these.
4. No strict plan. The plan records decisions, homes and owners; it never writes names, comments, test titles, log strings or code bodies. The implementor may improve names and shape. A plan review stage checks the plan before code exists.
5. Rules live in committed tooling any colleague gets: `.claude/rules/`, `docs/best-practices/`, skills, repo docs, lint. Never in personal memory.
6. Where Sam's memory and a committed doc conflict, the memory is Sam's ruling and wins, unless the memory is out of date (the audit marks those).

## The house rules (canonical text lives in `.claude/rules/code-quality.md`)

- A comment describes only the lines below it, and only when a name or extraction cannot. Never describe callers, other modules, the backend, a library, the UI or a test. No counts ("the one", "the only").
- No ticket keys, backlog, ruling or acceptance-criteria ids, release names or session vocabulary in code, comments or test titles.
- No history: no before/after narration, no `REMOVED_*`, no "…BeforeTheChange", no "renamed from".
- A name predicts its return value and side effects. No positional boolean flags. No metaphors. One concept, one name across layers and twin repos. A rename covers the concept's whole vocabulary.
- Set-up used by two tests goes in the shared helper. Promoting a helper deletes the local copies.
- Every branch that changes an outcome (refusal, redirect, retry, fallback, state switch) logs once, with the ids support searches by. Log the throwable or `{ err }`, never only `getMessage()`. No request or response bodies at INFO.
- A test title states what its assertions prove; a test must fail without the change it covers.

## How to work

- Plain English (GDS style) in every doc and prompt. Short sentences. No filler.
- The code and docs you write must meet the house rules themselves. No explanatory comments in what you add.
- Stay inside the files your task owns. Other agents are editing other files at the same time.
- Do not commit in the workspace repo unless your task says so; the parent commits. In a service repo your task owns, commit on `chore/NO_JIRA-code-quality-factory` when its lint and tests are green.
- Never touch: `docs/repos/trade-imports-*.md` (another session's uncommitted work sits there), `workareas/shared/ins-performance-testing/`, `workareas/shared/delivery-maturity/`, `tmp/`, `docker/stack/.staged/`, Sam's memory directory (except the one task that owns it).
- One shell command per Bash call: no `&&`, `;` or `|`, no `cd`. Use `git -C <path>` and `npm --prefix <path>`. Use `~/` paths, never `/Users/`. Redirect test output to a file and read the file; never pipe a test run.
- Run tests and lint for what you change. A red result is yours to fix. Never report "pre-existing" or "flaky" without proving it against `origin/main`.
