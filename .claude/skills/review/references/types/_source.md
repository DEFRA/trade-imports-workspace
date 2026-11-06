## Reviewing source files

Judge each file from its diff, its content and the ticket. Whether the
change is tested belongs to the test reviewers and the consistency
reviewer, not you.

### Reading other files: at most 5

You may read up to 5 files from the repo checkout named under "Your
group", in total for the group. Read a file only when a changed line
depends on it and you cannot judge the line without it:

- a type, record or constant a changed line uses, to see its fields or
  values
- the configuration a changed line is driven by, such as the
  `application.yml` keys a bean or an allowlist reads
- a function a changed line calls, to see what it returns or throws
- the one existing caller of a function whose contract the change alters

Open it with Read at `<repo checkout>/<path>`. Do not search the repo:
no `grep`, `find` or `git grep`. A path you have to search for is one you
do not need. Name each file you read in the `reason` of the file it
helped you judge. A finding that rests on a file you read quotes that
file at file:line.

For every file, check correctness first (below), then null safety, error
paths, security and performance, then the code-quality checks. Work
through each check for every file. A file with no finding in a check is
fine; a check you skipped is not. Behaviour findings (`correctness`,
`error-handling`, `logging`) matter more than comment and naming findings:
do not let the second crowd out the first.

### Correctness: find the input that makes it wrong

For every branch, condition, return value and default the diff adds or
changes:

1. Say what the ticket needs the line to do.
2. Name an input or state that is easy to meet in production and walk it
   through the line. Try a list where only some items pass, an empty list,
   a missing or unrecognised value, a failure part-way through, and a
   value with a unit or type.
3. A result that breaks the ticket, or that the caller cannot tell from
   success, is a `correctness` finding. The failure scenario is that
   input and the result it gives.

The bugs to look for:

- **Any or all:** `anyMatch` where the rule needs every item, or the one
  item that matters (the primary, the latest), and the reverse.
- **Silent fallback:** a lookup that misses and goes on as `undefined`,
  `null`, `0` or an empty value, with no log and no error, so bad data
  travels on.
- **Units and types dropped:** one fixed unit, type or format written for
  values that each carry their own (bytes written as a count, seconds as
  milliseconds).
- **Flag in disguise:** an `int`, string or magic value used as a
  true-or-false flag.
- **Library meaning:** a library call whose result means less than the
  name suggests (a server is up, but not the one writes go to). Use your
  5 reads on that library's types only when the brief does not show them.

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
  are in this brief or in a file you read, and quote the existing one's
  line.
- **Literals:** a value one function uses lives in that function.

### Logging: every decision leaves a trace

- **Silent decision:** a branch that changes the outcome (refusal,
  redirect, retry, fallback, state switch) and logs nothing.
- **Missing ids:** a log line support cannot search by, with no
  notification reference, user, port code, dataset or status.
- **Lost cause:** the message logged in place of the throwable or `{ err }`.
- **Body at INFO:** a request or response body logged at INFO.
- **Failure at the success level:** a failed call or caught error logged
  at the same level as a success, so an alert or a search on level misses
  it.

"Support cannot tell X during an incident" is an accepted failure
scenario for a logging finding.

### Comments

Every comment in each file: it describes only the lines below it, says
nothing about callers, other modules or tests, and holds no ticket keys,
history or rationale. A comment that decodes a name means the name is the
finding.
