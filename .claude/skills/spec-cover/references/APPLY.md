# Apply — cover findings (auto)

Auto-accept is already done by `SKILL.md` Step 4 before this file runs.
Write the test, update coverage links, make tests + lint clean, mark applied.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## write-test / strengthen

1. Apply `proposal.diff` under
   `~/git/defra/trade-imports-workspace/repos/<proposal.repo>/<proposal.file>`
   (create the file if needed; match neighbouring test style).
2. Run the narrowest test command that exercises the new test (repo's
   usual unit/fit/e2e invocation). **Auto-resolve:** non-zero → fix the
   test or surrounding setup yourself and re-run until green. Only
   `--defer` (and revert) if you cannot make it green without guessing.
3. Apply `proposal.coverageDiff` to
   `~/git/defra/trade-imports-workspace/<proposal.coverageFile>`
   (default `openspec/coverage/<capability>/coverage.json`). Link
   `type` / `repo` / `file` / `test` / `strength` must match what you
   wrote. Recalculate scenario and requirement rollups
   (`full` / `partial` / `none`) per `openspec/config.yaml`.

After a coverage link update:

```bash
tim spec lint --coverage --binding --capability <capability-path>
```

**Auto-resolve:** non-zero → fix coverage/binding yourself and re-lint
until clean before marking applied.

## accept-gap

Update `notes` on the scenario if the proposal says so. Do not add a
fake full link.

## Mark applied

```bash
tim spec findings applied F-00N --skill cover
```

## Commits

- Test file: leave uncommitted unless the user asked to commit in the
  service repo (same branch-parity rules as other cross-repo work).
- Coverage.json: leave uncommitted in the workspace; name it in the
  completion output.

Never run `tim spec baseline --advance` from this skill.
