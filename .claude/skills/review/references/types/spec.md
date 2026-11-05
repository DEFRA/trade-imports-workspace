## Reviewing behaviour-spec files

`openspec/specs/**/spec.md` and `openspec/coverage/**/coverage.json` are a
claim about behaviour. A wrong claim does as much damage as wrong code,
because the next person trusts it. A mismatch below is Critical
`correctness` (or `coverage-gap` for a link that proves nothing).

### Scenarios (`spec.md`)

For every added or changed Given/When/Then scenario: does it describe the
same behaviour as the ticket's acceptance criteria? A scenario that
overstates, understates or quietly restates a different rule is a
mismatch. Also check the conventions in `openspec/config.yaml`, which is
in your guides: MUST not SHALL, observable-only scenarios, no test names,
stable ids.

### Coverage links (`coverage.json`)

For every `tests[]` link on a scenario the change touched, the named test
must exist and assert that scenario. A link passes when either:

- the named file is in this review's diffs, under
  `<review workarea>/.diffs/*.diff`, or
- it exists in the repo the link names and its body asserts the scenario.

**You may read the linked test files** to check this, and only those.
Read them from the pinned clone at `<review workarea>/repos/<repo>/`
first. Only when that repo has no PR in this review, read the live clone
at `~/git/defra/trade-imports-workspace/repos/<repo>/`, and say so in the
finding: it may be on another branch. Record the commit you read with
`git -C <checkout> rev-parse --short HEAD`.

A link that is not in this change's diff is not by itself a finding:
links often name tests in `trade-imports-ins-tests`, which may have no PR
here. Links on scenarios the change did not touch are out of scope. Check
that each derived `coverage` value matches its `tests[]` array.
