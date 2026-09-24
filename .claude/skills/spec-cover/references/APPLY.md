# Apply — cover findings (auto)

Auto-accept is already done by `SKILL.md` Step 4 before this file runs.
Write the test, probe it, update coverage links, make tests + lint clean,
mark applied.

Workers do **not** follow this file. Only the parent (or an APPLY Task
the parent spawned after accept, on a disjoint file) does.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## write-test / strengthen

1. Apply `proposal.diff` under
   `~/git/defra/trade-imports-workspace/repos/<proposal.repo>/<proposal.file>`
   (create the file if needed; match neighbouring test style).
2. Run the narrowest test command that exercises the new test. **Fix
   setup, never weaken the assertion.** A red test after a reasonable
   fix attempt → `--defer` and revert.
3. **Probe — required before `strength: "full"`.** Record it on
   `evidence.probe` (`kind`, `command`, `red`, `green`).
   - **unit / fit:** mutate the production line the scenario names
     (retain, purge, href). Run **only** the new test. It **must go
     red**. Restore production. Re-run. It **must go green**.
     `kind: "prod-mutation"`.
   - **e2e:** invert the strongest Then assertion (wrong name, wrong
     URL, old record). Must go red. Restore. Must go green.
     `kind: "assertion-invert"`. Also require every
     `evidence.thenClauses` entry to have its own `expect`.
   - Probe stays green → the test does not witness the claim. `--defer`,
     do not link `full`.
4. Apply `proposal.coverageDiff` to
   `~/git/defra/trade-imports-workspace/<proposal.coverageFile>`
   (default `openspec/coverage/<capability>/coverage.json`). Link
   `type` / `repo` / `file` / `test` / `strength` must match what you
   wrote. Recalculate scenario and requirement rollups
   (`full` / `partial` / `none`) per `openspec/config.yaml`.
   A `When` that follows / clicks / navigates cannot be `full` from
   unit-only hrefs. Missing Then clauses → `partial`, not `full`.

After a coverage link update:

```bash
tim spec lint --coverage --binding --links --capability <capability-path>
```

**Auto-resolve:** non-zero → fix coverage/binding/links yourself and
re-lint until clean before marking applied.

## accept-gap

Update `notes` on the scenario if the proposal says so. Do not add a
fake full link.

## Defer

```bash
tim spec findings rule F-00N --skill cover --defer --note <why>
```

Then revert that finding's test and coverage edits.

## Mark applied

```bash
tim spec findings applied F-00N --skill cover
```

Refuses unless the finding is already `accepted` (parent Step 4).

## Commits

- Test file: leave uncommitted unless the user asked to commit in the
  service repo (same branch-parity rules as other cross-repo work).
- Coverage.json: leave uncommitted in the workspace; name it in the
  completion output.

Never run `tim spec baseline --advance` from this skill.
