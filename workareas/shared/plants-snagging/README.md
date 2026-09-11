# Plants snagging

Snagging pass over the first cut of the high-risk plants frontend, run on
2026-09-10. Three snags, no Jira, one branch pair per snag.

## How it runs

`backlog.json` is the state. `build-loop.run.js` is a copy of
`.claude/workflows/increment-build-loop.js` with its `FALLBACK` pointed here
and `lifecycle: 'local'`, so the loop implements, reviews (style + code +
adversarial verify + judge), fixes, runs the ladder and commits — but raises
no ticket, cuts no branch and pushes nothing.

Per snag the orchestrating session:

1. Cuts `fix/NO_JIRA-plants-<slug>` off fresh `origin/main` in BOTH
   `repos/trade-imports-plants-frontend` and `repos/trade-imports-animals-tests`
   (`--no-track`), same name in each.
2. Sets `increments: ['<id>']` in the run copy and launches it by `scriptPath`.
3. On landing, commits the tests repo with the same subject (the loop scopes
   its land stage to the increment's `repo` field).
4. Runs the full E2E suite against the dev stack, pushes both branches and
   raises the PRs against `main`.

Order: snag-002 (heading), snag-003 (contact picker), snag-001 (autocomplete
styles — detail filled in from the side-by-side diagnosis under `logs/`).

## Paused 2026-09-10 — where things stand

Sam paused the run to save the week's usage budget.

| Snag | State |
|---|---|
| snag-002 heading rename | **Done and raised.** Full E2E green (257 passed). plants-frontend [#65](https://github.com/DEFRA/trade-imports-plants-frontend/pull/65) + tests [#202](https://github.com/DEFRA/trade-imports-animals-tests/pull/202), same branch `fix/NO_JIRA-plants-place-of-destination-heading`, merge together. Not merged. |
| snag-003 contact picker | **Paused mid-implement.** Uncommitted, unreviewed edits sit in the working trees of both repos on `fix/NO_JIRA-plants-contact-address-picker` (every file in the brief was touched). See the increment's `notes` for the two resume options. |
| snag-001 autocomplete styles | **Not started.** Brief complete (detail, filesToTouch, acceptance criteria). Branch `fix/NO_JIRA-plants-autocomplete-styles` not yet cut. Port the finished SCSS to animals-frontend afterwards. |

Also uncommitted in the workspace repo: the `local`-lifecycle fix and the
`commitTrailer` config in `.claude/workflows/increment-build-loop.js`, and this
workarea. Both belong in a workspace PR.

A parallel session owns `package.json` + `scripts/obligation-graph.js` in
plants-frontend; leave them alone.

## Resuming

Check `backlog.json` for the first increment whose `status` is `todo` or
`paused`, put both repos on its `branch`, set it as the run copy's
`increments`, launch by `scriptPath`. After a landing: commit the tests repo
with the same subject and the session trailer, run
`npm --prefix repos/trade-imports-animals-tests run test:docker-compose`, push
both branches, raise the PR pair with the bodies under `logs/`.

## Completed 2026-09-10

Codex resumed the handover and completed the snagging run. All PRs remain open
for review; none was merged.

| Work | Commits | Pull requests |
|---|---|---|
| snag-002 — place-of-destination heading | frontend `da80c84`; tests `48f1a0e` | plants-frontend [#65](https://github.com/DEFRA/trade-imports-plants-frontend/pull/65); tests [#202](https://github.com/DEFRA/trade-imports-animals-tests/pull/202) |
| snag-003 — searchable, paged contact picker, deliberately bare | frontend `b4249cf`; tests `6e266b7` | plants-frontend [#66](https://github.com/DEFRA/trade-imports-plants-frontend/pull/66); tests [#203](https://github.com/DEFRA/trade-imports-animals-tests/pull/203) |
| snag-001 — autocomplete typography and arrow | frontend `832df71`; paired tests `df62507` | plants-frontend [#67](https://github.com/DEFRA/trade-imports-plants-frontend/pull/67); tests [#205](https://github.com/DEFRA/trade-imports-animals-tests/pull/205) |
| animals autocomplete port | frontend `518d5e94`; Darwin snapshot `5d74378`; Linux snapshot `48e6cbc` | animals-frontend [#314](https://github.com/DEFRA/trade-imports-animals-frontend/pull/314); matching tests [#210](https://github.com/DEFRA/trade-imports-animals-tests/pull/210) |
| local-lifecycle and configurable commit-trailer workflow fix, plus this workarea | workspace `5271d04` plus the final record update | workspace [#44](https://github.com/DEFRA/trade-imports-workspace/pull/44) |

The per-increment verification ladders and each source-mounted E2E rung passed.
The final snag-001 cross-service run finished with 257 passed and 1 skipped;
the animals-port E2E project finished with 150 passed. The animals visual
baseline changed by 163 pixels, all confined to the newly visible dropdown
arrow. Both the Darwin and Linux baselines were regenerated from inspected
actual output; the Linux correction was published from the tests branch whose
name matches the animals frontend branch.

One product question is deferred in `backlog.json`: the contact picker permits
a blank save while the destination and consignor pickers require a choice. The
increment preserves the existing, explicitly tested blank-save behaviour.

Nothing else was left incomplete. All nine PRs are intentionally unmerged, and the
two plants-frontend files owned by the parallel session were left untouched.
