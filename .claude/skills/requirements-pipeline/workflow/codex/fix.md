# Codex brief — REVIEW FIXER

You apply a ruled list of fixes to an increment's **staged, uncommitted** change. The increment id and
the fix list are in the prompt that pointed you here. The list has already been reviewed, refuted and
judged — **apply exactly what it says and nothing else.**

## Your shell is normal

This brief runs under Codex. The `GUARD RAILS` block in the workflow's own prompts is Claude-only
(no `&&`, tilde paths, `node` denied, `Grep`/`Glob` banned). **Ignore all of it.** Compound commands,
pipes, `node`, `npx`, absolute paths and `cd` are fine.

## Constants

Every `<placeholder>` here — `<workspace>`, `<workarea>`, `<backlog>`, `<plan>`, `<logs>`, `<skills>`,
`<branch>`, `<INCREMENT_ID>`, `<gateUnit>` — is bound to a real value in the prompt that pointed you here. Use those bindings;
never guess one.

Workspace root `<workspace>`; plan of record `<backlog>`; logs
`<logs>`; repos under `<workspace>/repos/`.

Every repo this increment touches is already on branch `<branch>` — cut for this increment by an earlier
stage, or, on a local run, the branch the run was given. Do not switch branches and do not create one,
even where no separate increment branch seems to exist: your fixes stay staged on `<branch>`, where the
land stage commits them.

## Rules

- **Apply the ruled fixes only.** If you spot something else, put it in `notes` — do not fix it. The
  scope fence is the whole point of this step.
- **But finish every fix you start.** The fence stops you taking on other people's work; it never excuses
  leaving your own half-applied. A fix that needs a test updated, a caller repointed or a second file
  touched to be correct is not finished until those are done. If in doubt, do it. Where you genuinely
  leave something out, write it in `notes` as \`DEFERRED: <what>\` on its own line so the orchestrator can
  find it and confirm it is tracked — deferred work buried in prose gets lost.
- **A ruling overrides the finding's own suggested fix.** Where the prompt says the judge overruled the
  reviewer, follow the judge.
- If a fix turns out to be **wrong or impossible** — it breaks a test that is pinning correct behaviour,
  or the premise is false — **stop on that item**, leave it unapplied, and explain in `notes`. Do not
  improvise an alternative, and never weaken or delete a test to make a fix land.
- Read the increment before you start: its `acceptanceCriteria` are the contract every fix serves, and
  `<plan>` is how it was built.
- Keep the house idiom: for Java, mirror the package idiom already in the repo you are editing — read
  what is there rather than assuming a package name. Otherwise the workspace best practices under
  `<workspace>/docs/best-practices/`.
- **Stage** your work (`git add`), do **not** commit.

## Verify before you report

A repo's own rungs — format check, lint, typecheck, unit tests, `mvn verify` — belong to `tim build gate`,
which reads them from `<skills>/requirements-pipeline/references/gates.json`. Check your fixes with its unit
phase, and never pick, add or substitute a script for those rungs:
`<gateUnit>`
It prints one JSON line; each rung has an `ok` and a `log`. Then run the plan's sections 5 and 6 checks as
the plan writes them, each to a file under `<logs>`, read once.

**Browser-driven suites are not yours to run** — the gate's FIT and E2E phases, and Lighthouse, cannot start
under your sandbox, and the verification-ladder stage runs the whole gate outside it. A browser phase you
could not run is not a reason to report `ok: false`.

At most 3 self-repair attempts on a red rung; if still red, report `ok: false` with exactly what is red and
what you tried.

- **Use what is already known.** The prompt that pointed you here carries the implementor's notes. Where
  they diagnose a red rung or say what got it green, start from that rather than diagnosing it again.
- **Compare every red rung with the baseline.** The prompt lists every rung of the baseline gate, run before
  any edit, with its log. Every one was green then, so a rung red now was caused by this increment, even
  when the failing test's own file is unchanged. Repair it or diagnose it; "pre-existing" is not available.
- **Re-run the unit phase after your last fix**, not only the rung that was red: a fix to one rung can break
  another. Only a green run after your final edit counts.
- **Never background a command** (no trailing `&`). Every command runs in the foreground and returns.
- **A red format rung** is repaired by running the repo's `format` script and then the unit phase again, and
  that counts as one of your 3 repairs.
- **Never start or stop the workspace stack**, and never drive `docker`. The gate owns the stack. A stack
  that is up is not in your way: leave it.

## Report

Your final message must satisfy the schema given via `--output-schema`: `ok`, `summary`, `changedFiles`,
`notes`. Write each `changedFiles` entry as `<repoKey>:<repo-relative path>`, the repo key being
`frontend`, `backend` or `tests` — review is grouped by repo and language from it. In `notes`, state for
each ruled fix whether it was applied, name anything you deliberately left alone, and write down any
diagnosis of a red suite and what got it green — the ladder stage is given your notes.
