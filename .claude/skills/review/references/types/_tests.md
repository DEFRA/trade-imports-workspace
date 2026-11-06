## Reviewing tests

Review tests the way a tester would: against the ticket, its acceptance
criteria and any behaviour-spec scenarios in this brief. Then use the
source each test covers, under "Source under test" at the end of this
brief, to find what no test proves. Read nothing outside this brief and do
not search the repo.

Judge the acceptance criteria and every test title from the ticket and
the assertions first, before you read the source, so the code does not
set what you expect it to do.

### Coverage gaps in the source under test

For each source file under "Source under test", list every branch the
change adds or alters: a condition, an early return, an error path, a
fallback, each value in a set or switch that the code treats differently,
and each rule its doc comment states. For each one, find the test in your
group whose assertion fails if that branch is deleted or inverted.

- No such test is a `coverage-gap` finding, at least Major, on the test
  file that should hold it (or on the source file when no test file in
  your group fits). Name the branch at its source file:line and the
  change that would leave every test green.
- A branch the change did not touch is not a gap. A source marked "Not
  changed by this review" has gaps only in what the tests in your group
  newly claim to cover.
- Do not review the source itself: its naming, comments and structure
  belong to the source reviewer.

Source changed by the review with no test file in your group is the
consistency reviewer's check. A brief with no "Source under test"
section, such as an E2E brief, skips this step.

### Acceptance criteria

For each acceptance criterion in the ticket, find the tests in your group
whose **assertions** prove it. A title alone is not evidence. Write what
you found to `<review workarea>/ac/<group id>.json`, in the same response
as your findings:

```json
[
  {"criterion": "AC1: the criterion as the ticket states it",
   "evidence": [{"file": "<path>", "line": 42, "test": "<test title>"}]},
  {"criterion": "AC2: …", "evidence": []}
]
```

List every criterion, including those with no evidence in your group. The
parent puts all groups together to decide which criteria no test proves,
because another group or repo may hold that test.

### Checks on every test

- **Title against assertions:** read the title, then the assertions. The
  title states what the assertions prove, no more. A title that claims
  more is a `test-readability` finding.
- **Cannot fail:** would an implementation that breaks the criterion still
  pass? An assertion on a value the set-up itself wrote, an absence check
  where an exact positive assertion is possible, and mocking the thing
  under test are `test-readability` findings.
- **Absorbed behaviour change:** an expected value changed while its
  set-up did not. That is a behaviour change made silently: a Critical
  `correctness` finding unless the ticket asks for that change.
- **Set-up copied between tests:** set-up used by two tests belongs in the
  shared test helper. A `duplication` finding.
- **Behaviour, not implementation:** assert inputs and outputs. Mock only
  what the code does not own (network, database, filesystem, clock).
- No ticket keys, acceptance-criteria ids or history in test titles.
