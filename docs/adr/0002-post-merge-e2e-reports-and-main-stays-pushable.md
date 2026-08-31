# 2. Post-merge E2E reports rather than blocks, and `main` stays directly pushable

- Status: Accepted
- Date: 2026-08-31
- Ticket: [EUDPA-358](https://eaflood.atlassian.net/browse/EUDPA-358)

## Context

Nothing ran the E2E suite after a merge to `main`.
`trade-imports-animals-tests/.github/workflows/workspace-e2e-tests.yml` triggers
on `workflow_run` from "Publish Branch Image" and gates its jobs on
`github.event.workflow_run.event == 'pull_request'`, so E2E ran for pull
requests and manual dispatch and never for a push to `main`.

The gap was not theoretical. Commit `b272812` was pushed straight to the tests
repo's `main` on 2026-08-28 — a single-parent commit, so it never went through a
PR — and left `main` red against the frontend's `main` for three days without
anyone being told. Between that push and this ADR, the only scheduled workflow
to have run on tests `main` was the nightly "Cleanup E2E Reports" cron.

Branch protection today, in both repos, is thinner than the word "protected"
suggests:

```bash
gh api repos/DEFRA/trade-imports-animals-tests/rulesets/14590352 \
  --jq '{rules: [.rules[].type], bypass: .bypass_actors}'
# {"rules":["deletion","non_fast_forward"],"bypass":[]}
```

`trade-imports-animals-frontend` carries the same two rules. Neither repo
requires a pull request and neither requires a status check, so a direct push to
`main` is permitted and unreviewed.

Two questions therefore had to be settled together: what a post-merge E2E run
should *do* about a failure, and whether direct pushes to `main` should be
blocked outright.

## Decision

**Post-merge E2E reports; it does not block, and it does not revert.**

By the time a post-merge run finishes, the commit is already on `main` — there
is no gate left to hold. The workflow publishes its verdict as a **commit
status** with context `main-e2e`, which is a namespace the PR path never writes
into, so "failed" is distinguishable from "never ran":

| At a `main` SHA | Meaning |
|---|---|
| no `main-e2e` status | never ran |
| `pending` | running, or the run was lost |
| `failure` / `error` | ran and failed |
| `success` | ran and passed |

A red run opens (or comments on) a single marker-driven tracking issue, and a
subsequent green run closes it. That is the whole of the enforcement.

**`main` stays directly pushable in both repos. We do not add a required-PR or
required-status rule as part of this ticket.**

Recommended follow-up, for a maintainer to take deliberately rather than as a
side effect of this change: require a pull request on `main` in
`trade-imports-animals-tests` and `trade-imports-animals-frontend`. That single
rule closes the actual hole — `b272812` was a direct push, and a PR requirement
would have routed it through the E2E path that already exists and already works.

**Do not make the PR-side `E2E Tests` check a required status check.** It is
produced by a `workflow_run`-triggered workflow, which GitHub attributes to the
default branch. Such a check is not reliably associated with the PR's head
commit, so requiring it deadlocks merges: the PR waits for a check that never
arrives at the SHA being merged. Require a PR first; require checks only after
the E2E signal has been moved onto a trigger that reports against the PR head.

## Consequences

- A red `main` is now visible within one E2E cycle instead of indefinitely, and
  the SHA carries a durable verdict that survives log retention.
- The reporting workflow writes exactly the signal a required-status-check rule
  consumes, so promoting it to blocking later is a settings change and not a
  rewrite. The hook is installed; the gate is not.
- Direct pushes to `main` remain possible, so the class of failure that produced
  `b272812` can recur. The post-merge run now catches it quickly rather than
  preventing it, and this is a deliberate trade rather than an oversight.
- Merges made in quick succession can go unverified: the workflow uses
  `concurrency: main-e2e` with `cancel-in-progress: false`, and GitHub keeps at
  most one queued run per group, so a middle commit's run can be dropped before
  it starts. Such a SHA carries no `main-e2e` status, which reads correctly as
  "never ran".

## Alternatives considered

- **Auto-revert a red `main`.** Rejected. E2E is the flakiest signal in the
  estate — the journey specs are known to fail transiently on a fresh stack and
  recover on retry — so automated reverts would rewrite `main` on false
  positives, which is far more damaging than a slow human response to a red
  tracking issue.
- **Block the merge with a required post-merge check.** Incoherent by
  construction: the merge has already happened when the run starts.
- **Add branch protection in this ticket.** Rejected as out of scope. Branch
  protection changes who can do what and belongs to a maintainer's explicit
  decision, not to a CI plumbing change. The recommendation is recorded here
  precisely so it can be taken separately.
- **Extend `workspace-e2e-tests.yml` to cover pushes instead of adding a new
  workflow.** Rejected: a `workflow_run` run is attributed to the default
  branch, so every PR run already stamps check runs onto `main`'s HEAD. Reusing
  that workflow's job ids would add a second, indistinguishable set of
  `e2e / e2e (N, 3)` runs to the very SHA the post-merge run is meant to judge.
  See `docs/best-practices/github-actions.md` section 7.
