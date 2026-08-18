# GitHub Actions — Best Practices

Applies to every repo in the EUDP Live Animals workspace. Focused on the publish-HTML-report-to-`gh-pages` story (E2E + Lighthouse) and the checkout-depth knobs that interact with it. Broader CI standardisation (e.g. `cdp-build-action` conventions, conventional-commits migration) is out of scope here — see the matching follow-up ticket.

---

## 1. Use the workspace reusable `e2e-tests.yml` — don't re-implement

E2E publishes go through the workspace-level reusable workflow at `DEFRA/trade-imports-workspace/.github/workflows/e2e-tests.yml`. Per-repo callers stay thin:

```yaml
jobs:
  e2e:
    uses: DEFRA/trade-imports-workspace/.github/workflows/e2e-tests.yml@main
    with:
      branch: ${{ github.head_ref || github.ref_name }}
```

The reusable workflow:

- Spins up the workspace stack via `scripts/stack/run-stack.sh --branch <name>` so the same branch tag drives all linked service images. `run-stack.sh` also stages the repo-owned init scripts (backend Floci init, tests-repo mongo seeds), sparse-fetching them from GitHub on the same branch (falling back to `main`) since CI checks out only the workspace repo.
- Shards Playwright × 3, merges blob reports, publishes the HTML report to `gh-pages` at `e2e/<branch-tag>/`.
- Outputs `report-url` so the caller can comment on the PR.

If you find yourself copying the publish step into a new repo's own `gh-pages` job, stop and call the reusable workflow instead.

---

## 2. One `gh-pages` branch per repo; namespace per-feature-branch under subdirectories

The publish layout is **one** `gh-pages` branch per repo with per-PR previews living at `e2e/<branch-tag>/` (and `lighthouse/<branch-tag>/` on frontend). Concurrent PRs coexist as sibling subdirectories on a single branch.

Do **not** introduce additional `gh-pages-*` git branches (one per PR, etc.) — `peaceiris/actions-gh-pages@v4` is configured with `keep_files: true` to preserve sibling subdirectories on every publish, and that mechanism only works on a single shared branch.

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./report/playwright-report
    destination_dir: e2e/${{ steps.branch-tag.outputs.tag }}
    keep_files: true        # preserves sibling PR previews
```

---

## 3. Retention is enforced in the shared cleanup workflow — don't opt out

`gh-pages` retention is handled by `DEFRA/trade-imports-workspace/.github/workflows/cleanup-e2e-reports.yml`. Three jobs route by input:

| Job | Trigger | Effect |
|---|---|---|
| `cleanup-branch` | PR closed (`head-ref` populated) | Deletes `e2e/<tag>/` **and** `lighthouse/<tag>/` for that branch. |
| `cleanup-stale` | Daily schedule (`head-ref == ''`, `mode == ''`) | Deletes any `e2e/*/` or `lighthouse/*/` whose last commit is older than 7 days. |
| `truncate-history` | Manual `workflow_dispatch` with `mode: truncate` (iteration 1) | Orphan-resets `gh-pages` history while preserving HEAD files — reclaims pack-size growth that HEAD-only pruning leaves behind. Promoted to a weekly schedule once the canary has been observed. |

Per-repo callers stay thin:

```yaml
jobs:
  cleanup:
    uses: DEFRA/trade-imports-workspace/.github/workflows/cleanup-e2e-reports.yml@main
    with:
      head-ref: ${{ github.head_ref || '' }}
```

If a repo needs different retention than the shared workflow, raise a follow-up rather than forking the cleanup logic.

---

## 4. `concurrency: pages-${{ github.repository }}` for every job that touches `gh-pages`

Every job that pushes to `gh-pages` — E2E publish, Lighthouse publish, the cleanup workflow's `truncate-history` — must share the **same** concurrency group:

```yaml
concurrency:
  group: pages-${{ github.repository }}
  cancel-in-progress: false   # never cancel an in-flight publish
```

Splitting the group (e.g. `pages-...-lighthouse`) allows E2E and Lighthouse to race onto the same branch, and either can race the orphan-reset, producing a corrupt force-push. `cancel-in-progress: false` is non-negotiable — cancelling a publish mid-flight would drop a freshly-pushed PR preview before peaceiris finishes the commit.

Caller-side concurrency (e.g. `lighthouse-${{ head_branch }}` to debounce a workflow_run trigger) is fine **at the workflow level**; the `pages-${{ github.repository }}` group must still scope the publishing job.

---

## 5. `fetch-depth: 1` for non-`gh-pages` checkouts; `single-branch: true` when you must use `fetch-depth: 0`

GitHub Actions clones the whole repo by default at depth 1. Most jobs in this workspace don't need more than that. Two jobs across the repos genuinely do, both because they call `anothrNick/github-tag-action` (via `DEFRA/cdp-build-action/build@main`) to compute the next semver tag, which runs `git fetch --tags --unshallow`:

- `publish-hotfix.yml`
- `sonarcloud.yml`

For those, the existing `fetch-depth: 0` stays — but always add `single-branch: true` so the checkout doesn't pull `gh-pages` (or any other branch) into the runner:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
    single-branch: true     # don't fetch gh-pages or other branches
    # Depth 0 is required for branch-based versioning
```

`single-branch: true` is supported on `actions/checkout@v4` and later — no version bump needed.

For everything else (regular PR checks, publish-branch, the workspace E2E reusable, `lighthouse.yml` checkouts of workspace and frontend), the default depth of 1 is correct — do not add `fetch-depth: 0`.

---

## 6. `peaceiris/actions-gh-pages` is a single-maintainer dependency — accept it with an exit ramp

We use `peaceiris/actions-gh-pages@v4` in two places (`e2e-tests.yml`, `lighthouse.yml`) because the first-party `actions/upload-pages-artifact` + `actions/deploy-pages` pair replaces the entire branch on every publish — incompatible with our multi-subdirectory layout for concurrent PR previews.

`peaceiris/actions-gh-pages` is Marketplace-listed, actively maintained, and has been the de-facto community standard for years, but it is single-maintainer. The exit ramp is built into the cleanup workflow's `truncate-history` job, which uses plain `git` commands (no `peaceiris` call). If the action is ever abandoned, we can swap the publish step for a hand-rolled `git push` using the same primitives the cleanup job already exercises.

Do not introduce additional third-party publish actions. Keep `peaceiris/actions-gh-pages@v4` everywhere it's used so the upgrade story stays one decision.

---

## References

- `~/git/defra/trade-imports-workspace/.github/workflows/e2e-tests.yml` — the publish source of truth
- `~/git/defra/trade-imports-workspace/.github/workflows/cleanup-e2e-reports.yml` — retention + history-truncation
- `repos/trade-imports-animals-frontend/.github/workflows/lighthouse.yml` — second publisher (concurrency group must match the E2E publisher)
- `peaceiris/actions-gh-pages` — <https://github.com/peaceiris/actions-gh-pages>
