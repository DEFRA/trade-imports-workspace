## Reviewing tests

Review tests the way a tester would: against the ticket, its acceptance
criteria and any behaviour-spec scenarios in this brief. **Do not read or
search the source under test.** Whether every new code branch is tested is
the consistency reviewer's check, not yours.

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
