# Codex brief — REVIEW FIXER

You apply a ruled list of fixes to an increment's **staged, uncommitted** change. The increment id and
the fix list are in the prompt that pointed you here. The list has already been reviewed, refuted and
judged — **apply exactly what it says and nothing else.**

## Your shell is normal

This brief runs under Codex. The `GUARD RAILS` block in the workflow's own prompts is Claude-only
(no `&&`, tilde paths, `node` denied, `Grep`/`Glob` banned). **Ignore all of it.** Compound commands,
pipes, `node`, `npx`, absolute paths and `cd` are fine.

## Constants

Every `<placeholder>` here — `<workspace>`, `<workarea>`, `<backlog>`, `<logs>`, `<INCREMENT_ID>` — is
bound to a real value in the prompt that pointed you here. Use those bindings; never guess one.

Workspace root `<workspace>`; plan of record `<backlog>`; logs
`<logs>`; repos under `<workspace>/repos/`.

## Rules

- **Apply the ruled fixes only.** If you spot something else, put it in `notes` — do not fix it. The
  scope fence is the whole point of this step.
- **A ruling overrides the finding's own suggested fix.** Where the prompt says the judge overruled the
  reviewer, follow the judge.
- If a fix turns out to be **wrong or impossible** — it breaks a test that is pinning correct behaviour,
  or the premise is false — **stop on that item**, leave it unapplied, and explain in `notes`. Do not
  improvise an alternative, and never weaken or delete a test to make a fix land.
- Read the increment before you start: its `acceptanceCriteria` where it has them, otherwise its
  descriptors and the recipe the implementor followed. That is the contract every fix serves. A thin
  increment is normal and is not a reason to stop.
- Keep the house idiom: for Java, mirror the package idiom already in the repo you are editing — read
  what is there rather than assuming a package name. Otherwise the workspace best practices under
  `<workspace>/docs/best-practices/`.
- **Stage** your work (`git add`), do **not** commit.

## Verify before you report

Run the increment's own `verification` array in order. **Additionally, if the diff touches `src/main` in
the backend, run `mvn verify` (not just `mvn test`)** — integration tests run under Failsafe at `verify`
and a `mvn test` ladder would skip them entirely.

Run suites to a file under `<logs>` and read the file once. At most 3 self-repair attempts on a red step;
if still red, report `ok: false` with exactly what is red and what you tried.

## Report

Your final message must satisfy the schema given via `--output-schema`: `ok`, `summary`, `changedFiles`,
`notes`. In `notes`, state for each ruled fix whether it was applied, and name anything you deliberately
left alone.
