# inc-040 (EUDPA-606) — PR stage decision

Branch: `feat/EUDPA-606-six-hub-task-rows-are-labelled-different`

## What happened

- **frontend** — on the work branch, 1 commit ahead of `origin/main`, working tree clean.
  Pushed and PR raised: https://github.com/DEFRA/trade-imports-animals-frontend/pull/352
- **tests** — on the work branch, **0 commits** ahead of `origin/main`, but the working tree
  holds **10 staged, uncommitted files**. The staged diff is inc-040's own six label renames
  applied to the E2E suite (`flows/journey.ts`, both a11y specs, six e2e feature specs,
  one security spec — 'Uploaded documents' -> 'Upload documents',
  'Main reason for importing' -> 'Main reason for import',
  'Animal identification details' -> 'Identification details',
  'Transporter' -> 'Transport details',
  'Contact address' -> 'Contact address for this consignment').

So this is a cross-repo increment whose tests half was staged but never committed. The commit
stage did not cover the tests repo.

## Decision: ok:false, tests tree left untouched

I did **not** commit the staged tests work, and I did **not** raise a tests PR:

- Committing is the commit stage's remit, and that stage runs the verification ladder
  (lint, typecheck, the suite) plus the `sonar analyze --staged` gate before it commits.
  None of that has been run against these files, and the PR stage is forbidden from running
  `sonar`. Committing here would assert a verification that never happened.
- Following step 2 literally (`0 commits` -> skip, no failure) would have produced an
  ok:true frontend-only result and buried the problem.

Nothing destructive was done. No `reset`, no `clean`, no `stash` — the 10 files are still
staged exactly as found.

## Why PR 352 must not merge yet

The merge order for this increment is **tests before frontend**: CDP runs the tests repo's
suite against the deployed frontend. Merging PR 352 on its own puts the new hub labels on
`main` while the E2E suite still clicks the old ones, and every spec listed above goes red.

## To resume

Re-run the commit stage against the tests repo on this branch so the staged renames get
committed behind the verification ladder, then re-run this PR stage to push the tests branch
and raise its PR. Both PRs green (and approved, where that gate is on) before either merges.
