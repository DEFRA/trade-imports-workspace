# Codex brief — REVIEW FIXER

You apply a ruled list of fixes to an increment's **staged, uncommitted** change. The increment id and
the fix list are in the prompt that pointed you here. The list has already been reviewed, refuted and
judged — **apply exactly what it says and nothing else.**

## Your shell is normal

This brief runs under Codex. The `GUARD RAILS` block in the workflow's own prompts is Claude-only
(no `&&`, tilde paths, `node` denied, `Grep`/`Glob` banned). **Ignore all of it.** Compound commands,
pipes, `node`, `npx`, absolute paths and `cd` are fine.

## Constants

Every `<placeholder>` here — `<workspace>`, `<workarea>`, `<backlog>`, `<plan>`, `<logs>`, `<branch>`,
`<INCREMENT_ID>` — is bound to a real value in the prompt that pointed you here. Use those bindings;
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

Run the plan's section 6, "Ladder", in order, skipping only the browser legs below. It includes each
changed repo's unit, format and lint rungs. **Additionally, if the diff touches `src/main` in the backend, run `mvn verify`
(not just `mvn test`)** — integration tests run under Failsafe at `verify` and a `mvn test` ladder would
skip them entirely.

**Browser-driven suites are not yours to run** — the in-repo `*.fit.spec.js` suites, Playwright E2E and
Lighthouse cannot start under your sandbox, and a later verification-ladder stage runs them outside it.
Skip those rungs, run every other one, and name what you skipped in `notes`. A browser rung you could
not run is not a reason to report `ok: false`.

Run suites to a file under `<logs>` and read the file once. At most 3 self-repair attempts on a red step;
if still red, report `ok: false` with exactly what is red and what you tried.

- **Use what is already known.** The prompt that pointed you here carries the implementor's notes. Where
  they diagnose a red suite or say what got it green, start from that rather than diagnosing it again.
- **Compare every red rung with the baseline.** The prompt lists the baseline logs,
  `<logs>/<INCREMENT_ID>-baseline-<repo>.log`, written before any edit. A failure in a suite that was green
  at baseline was caused by this increment or the environment it left behind — a stack still up, a port
  held — even when the failing test's own file is unchanged. Repair it or diagnose it. Call a failure
  pre-existing only when the baseline log shows the same test failing the same way, and quote that line.
- **Re-run every rung after your last fix**, not only the one that was red: a fix to one rung can break
  another. Only a full pass after your final edit counts.
- **Never background a command** (no trailing `&`). Every rung runs in the foreground and returns.
- **Format runs in check mode.** The rung is `format:check`, never `format`. A red check is repaired by
  running `format` and then the check again, and that counts as one of your 3 repairs.
- **Never start the workspace stack** (`tim docker dev` / `up`). The ladder stage owns it, starts it for
  E2E and stops it after. If you find it up and a unit suite is failing on a port it holds, stop it with
  `tim docker down` — never raw `docker` — and re-run the suite.

## Report

Your final message must satisfy the schema given via `--output-schema`: `ok`, `summary`, `changedFiles`,
`notes`. Write each `changedFiles` entry as `<repoKey>:<repo-relative path>`, the repo key being
`frontend`, `backend` or `tests` — review is grouped by repo and language from it. In `notes`, state for
each ruled fix whether it was applied, name anything you deliberately left alone, and write down any
diagnosis of a red suite and what got it green — the ladder stage is given your notes.
