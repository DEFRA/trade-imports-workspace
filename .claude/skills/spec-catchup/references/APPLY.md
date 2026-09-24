# Apply — catch-up findings (auto)

Auto-accept is already done by `SKILL.md` Step 5 before this file runs.
Land the proposal, make lint clean, mark applied.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Per verdict

### stale-link

Land `proposal.diff` on `proposal.file` (usually the capability's
`coverage.json`). Recalculate scenario/requirement rollups if coverage
becomes `none`. Then lint (below) before marking applied. Match
`frontend-change`'s coverage shape in
`~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/references/SPEC_SYNC.md`.

### spec-wrong / spec-gap

Apply the unified diff in `proposal.diff` to `proposal.file` (usually
`openspec/specs/<capability>/spec.md`). Keep MUST not SHALL, stable IDs,
and Given/When/Then. If the proposal also carries `coverageDiff` /
`coverageFile`, apply that too — when `coverageDiff` is prose-only,
edit `coverage.json` by hand to match the new IDs/names/tests.

After a `spec.md` edit (and after coverage edits that change shape/IDs):

```bash
tim spec lint --specs --coverage --binding --links --capability <capability-path>
```

**Auto-resolve:** fix ID/name parity, missing coverage rows, rollups
and binding yourself and re-lint until clean. Prefer `tim spec lint`
over bare `openspec validate`. Only `--defer` if you cannot make it
clean without guessing behaviour:

```bash
tim spec findings rule F-00N --skill catchup --defer --note "..."
```

Revert that finding's openspec edits before continuing.

### no-action

Nothing to apply (bucket only).

## Mark applied

```bash
tim spec findings applied F-00N --skill catchup
```

Refuses unless the finding is `accepted` (auto-accept in Step 5).

## Leave uncommitted

Name every openspec path you touched in the completion output. Do not
commit unless the user asked.
