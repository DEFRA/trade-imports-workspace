## Reviewing source files

You may read only this brief. Judge each file from its diff, its content
and the ticket. Checks that need another file belong to the consistency
reviewer: whether the change is tested, whether a caller still fits, and
whether a template gets the data it uses.

For every file, check correctness against the ticket's acceptance
criteria, then bugs, null safety, error paths, security and performance,
then the three code-quality checks below. Work through each check for
every file. A file with no finding in a check is fine; a check you skipped
is not.

Check the change against the patterns the code already sets: the guides in
this brief, and what the other files in your group do. This is not a
design review.

### Naming: predict, then compare

For every function, method, parameter, variable, constant, flag and helper
the diff adds or renames, and every name a changed line calls:

1. Read the name alone. Write down what you predict it returns and what it
   changes (state, session, database, redirect, log).
2. Read the body. Compare.
3. A value the name does not cover, or a change it hides, is a finding. So
   is a name that needs its comment to be understood. Nothing (null or
   undefined) and an expected error such as not found are not mismatches,
   and a suffix naming them (`…OrNull`, `…OrNotFound`) is itself a finding.
   A name that predicts both is not a finding, even if another would read
   better.

Also a finding: a metaphor (`lightenRemote` for "exclude gh-pages from the
fetch"), a positional boolean flag, a rename that stops part-way through a
concept's words (`telephone*` left beside `phone`), and one concept with
several names within your group.

### Structure: one home for each rule

- **Two homes for one rule:** the same rule, format or guard written twice
  within your group. Must: one owner; the others call it.
- **Wrong layer:** logic where a reader would not look for it, such as
  retry and proxy code inside a folder for counting calls.
- **A second mechanism beside an existing one:** raise it only when both
  are in this brief, and quote the existing one's line.
- **Literals:** a value one function uses lives in that function.

### Logging: every decision leaves a trace

- **Silent decision:** a branch that changes the outcome (refusal,
  redirect, retry, fallback, state switch) and logs nothing.
- **Missing ids:** a log line support cannot search by, with no
  notification reference, user, port code, dataset or status.
- **Lost cause:** the message logged in place of the throwable or `{ err }`.
- **Body at INFO:** a request or response body logged at INFO.

"Support cannot tell X during an incident" is an accepted failure
scenario for a logging finding.

### Comments

Every comment in each file: it describes only the lines below it, says
nothing about callers, other modules or tests, and holds no ticket keys,
history or rationale. A comment that decodes a name means the name is the
finding.
