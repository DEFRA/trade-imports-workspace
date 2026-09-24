# Apply — accepted catch-up findings

Apply one accepted finding's proposal to disk, then mark it applied.
Never apply before `tim spec findings rule … --accept` or `--edit`.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Per verdict

### stale-link

Edit `openspec/coverage/<capability>/coverage.json` so `file` / `test`
match the real test (or demote `coverage` to `"none"` with `notes` if
nothing witnesses it). Match `frontend-change`'s coverage shape in
`~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/references/SPEC_SYNC.md`.

### spec-wrong / spec-gap

Apply the unified diff in `proposal.diff` to `proposal.file` (usually
`openspec/specs/<capability>/spec.md`). Keep MUST not SHALL, stable IDs,
and Given/When/Then. If the proposal also carries `coverageDiff` /
`coverageFile`, apply that too.

After a `spec.md` edit:

```bash
npx --yes @fission-ai/openspec@latest validate <capability-path> --strict
```

Non-zero is a halt — fix before marking applied.

### no-action

Nothing to apply (bucket only).

## Mark applied

```bash
tim spec findings applied F-00N --skill catchup
```

Refuses unless the finding is `accepted`. That is intentional: applied
always means a person said yes and the edit landed.

## Leave uncommitted

Name every openspec path you touched in the completion output. Do not
commit unless the user asked.
