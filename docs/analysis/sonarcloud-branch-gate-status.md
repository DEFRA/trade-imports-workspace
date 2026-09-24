# SonarCloud branch-level gate status across the eight integrated repos

Branch-level (`branch=main`) SonarCloud quality gate status for every
sonar-integrated trade-imports repo, recorded because PR-scoped analysis never
re-surfaces a repo's pre-existing findings — so a repo's `main` can sit failing its
own gate for weeks while every PR against it passes a green check.

Raised and resolved under
[EUDPA-618](https://eaflood.atlassian.net/browse/EUDPA-618).

**Measured as of** 2026-09-24, by querying each repo's own gate directly —
`get_project_quality_gate_status` with `branch=main` via the per-repo `sonar-*` MCP
servers, never inferred from any PR's check.

## Status

| Repo | Gate (before) | Failing conditions | Gate (after) |
|---|---|---|---|
| `trade-imports-ins-frontend` | **ERROR** | `new_coverage` 88.8% (<90), `new_critical_violations` 1, `new_major_violations` 1 | fixed — see §1 |
| `trade-imports-ins-backend` | **ERROR** | `new_coverage` 87.3% (<90) | fixed — see §2 |
| `trade-imports-animals-frontend` | OK | — (`new_coverage` 95.9%) | OK |
| `trade-imports-animals-admin` | OK | — | OK |
| `trade-imports-animals-backend` | OK | — (`new_coverage` 97.3%) | OK |
| `trade-imports-dynamics-gateway` | OK | — (`new_coverage` 95.9%) | OK |
| `trade-imports-address-book` | OK | — | OK |
| `trade-imports-reference-data` | OK | — | OK |

Six of the eight were already clean. Only the two INS repos were failing, and they
were failing for entirely different reasons — one a misconfiguration, one a genuine
test gap.

The ticket's figures (`new_coverage` 80.8%, 56 open issues) were from when it was
raised; by 2026-09-24 ins-frontend read 88.8% and 49 open issues.

## 1. `trade-imports-ins-frontend` — the Playwright suite was scanned as production source

`sonar-project.properties` declared only `*.test.js` as test code. The Playwright
suite lives under `src/**/fit/` and is run by `npm run test:fit`, not by `npm test`
(vitest) — so it produces no lcov entry, and Sonar was analysing all eight of its
files as production source that no test covers:

| File | Lines to cover | Covered |
|---|---|---|
| `src/server/address-book/fit/add.fit.spec.js` | 66 | 0 |
| `src/server/address-book/fit/edit.fit.spec.js` | 51 | 0 |
| `src/server/address-book/fit/list.fit.spec.js` | 47 | 0 |
| `src/server/routes/home/fit/dashboard.fit.spec.js` | 39 | 0 |
| `src/server/address-book/fit/view.fit.spec.js` | 29 | 0 |
| `src/server/address-book/fit/address-form.js` | 28 | 0 |
| `src/server/address-book/fit/delete.fit.spec.js` | 26 | 0 |
| `src/server/address-book/fit/seed-address.js` | 2 | 0 |
| **Total** | **288** | **0** |

This one gap caused **all three** failing conditions. Both gate-failing violations
were in `dashboard.fit.spec.js` — a `javascript:S1192` CRITICAL (duplicated literal)
and a `javascript:S138` MAJOR (80-line function). They were reported against
Playwright test code, and dated 2026-09-09, which is why they landed inside the
new-code window while the other 47 findings (older) did not.

**Fix:** declare `src/**/fit/**` as tests, and exclude `src/client/**` from coverage.
This is `trade-imports-animals-frontend`'s existing configuration — a repo that
passes its gate and has zero open findings in its own fit specs. One deliberate
difference: animals-frontend matches `src/**/*.fit.spec.js`, which works there
because every file under its `fit/` directories carries that suffix. ins-frontend
has two Playwright page-object helpers beside the specs (`address-form.js`,
`seed-address.js`, between them 12 of the 49 findings), so it matches by directory.

**Measured effect** — a branch-scoped scan of the fix, not an estimate:

| | before | after |
|---|---|---|
| `lines_to_cover` | 1289 | 989 |
| `uncovered_lines` | 386 | 92 |
| `line_coverage` | 70.1% | 90.7% |
| `coverage` | **72.9%** | **87.5%** |

Only 0%-covered lines left the scope, so this cannot lower either the overall or the
new-code coverage figure. ins-frontend's CI passes no extra scanner arguments
(`SonarSource/sonarqube-scan-action` with nothing but `SONAR_TOKEN`), so these
numbers are measured under exactly the configuration CI will use.

Note the gap between `coverage` 87.5% and the 90% threshold: the gate condition is
`new_coverage`, not `coverage`, and the two are not derivable from one another. The
post-merge `Publish` scan of `main` is what settles it.

### Why this is a scoping correction, not a suppression

Worth stating plainly, because widening `sonar.exclusions` can read as hiding
problems. These are Playwright test files: `npm test` genuinely never executes them,
they contribute no coverage data by design, and the sibling repo already classifies
them this way. What changed is which files Sonar calls production code — not which
problems it is allowed to report about production code.

## 2. `trade-imports-ins-backend` — a real gap in the address-lookup token chain

Unlike ins-frontend, this was not a misconfiguration. Overall coverage was already
92.1%; the shortfall sat almost entirely in two classes under `addresslookup/`:

- `FederatedTokenConfig.java` — 64.2%, 22 uncovered lines and 2 uncovered
  conditions: the request interceptor timing the Entra token response, the lambda
  the bean returns, and `logTokenClaims` in full including its "not a JWT" branch.
  None of it was reachable from the existing tests, which stopped at the STS leg.
- `AddressLookupConfig.java` — 100% lines but 33.3% branches: the
  `sts-endpoint-override` null/blank ternary, and both outcomes of the interceptor
  that reports whether a bearer actually reached the gateway.

**Fix:** tests only, no production change. Driving the bean's own
`OAuth2AccessTokenResponseClient` through a `MockRestServiceServer`-backed
`RestClient.Builder` reaches the private `logTokenClaims` through the lambda that
calls it — no widened visibility, no reflection. `MockRestServiceServer` was already
the in-tree pattern (`AddressLookupClientTest`).

**Measured effect** — both classes now 100% line and 100% branch covered:

| | before | after |
|---|---|---|
| `lines_to_cover` | 408 | 408 |
| `uncovered_lines` | 28 | 6 |
| `line_coverage` | 93.1% | 98.5% |
| `coverage` | **92.1%** | **97.5%** |

135 tests pass, up from 128.

## Two further blind spots found along the way

Both are the same family of problem as the ticket itself — tooling measuring
something different from what you think it measures. The second was fixed here
because this ticket's own pushes would have triggered it; the first is recorded for
its own ticket.

### `ins-backend`'s coverage exclusions live only in the CI workflow

`.github/workflows/sonarcloud.yml` passes scanner arguments that appear nowhere in
`sonar-project.properties`:

```
-Dsonar.exclusions=**/src/test/**
-Dsonar.coverage.exclusions=**/configuration/*Config.java,**/configuration/tls/*.java,**/exceptions/*.java,**/filter/*Filter.java
```

So any scan that doesn't replicate that command line measures a different scope. On
identical code the same commit reads **79.4%** without those flags and **97.5%**
with them — an 18-point swing that has nothing to do with the code. This affects the
local pre-push hook, which passes neither. Moving these into
`sonar-project.properties` would make local and CI agree without changing what CI
measures.

The other four Java repos (`animals-backend`, `address-book`,
`dynamics-gateway`, `reference-data`) share a byte-identical
`sonar-project.properties`; whether their CI workflows also carry divergent flags
has not been checked.

### The pre-push hook passed no `sonar.branch.name` — fixed here

[`tools/sonar/sonar-push-check.sh`](../../tools/sonar/sonar-push-check.sh) set no
branch on its scanner invocation. Run from a feature branch with no PR open — which
is exactly what EUDPA-618's own tech notes recommended as the "easy way to trigger a
whole-repo scan" — the analysis carried neither `sonar.branch.name` nor the
`sonar.pullrequest.*` trio, and SonarCloud assigns such an analysis to the project's
**main** branch. So the first push of any new feature branch silently overwrote
`main`'s analysis with unmerged code, leaving `main`'s recorded quality state
describing code that was never on `main`.

Fixed: when no PR is open the hook now passes `-Dsonar.branch.name="$BRANCH"`, and
on a detached HEAD (no PR to scope to, no branch name to send) it skips rather than
submit an unnamed analysis. The PR-open path is unchanged.

Both scans behind this document predate that fix and passed
`-Dsonar.branch.name` explicitly for the same reason.

## Accepted, not fixed: ins-frontend's remaining findings

Of ins-frontend's 49 open findings, 18 were in `fit/` files and leave the scope with
the fix above, and 2 were fixed (below). The remaining **29** are all pre-existing,
all outside the new-code window, and none fails the gate. They are accepted as-is
rather than cleared in this ticket — clearing them is a `code-style` run, and 29
churn-level edits would bury the one-line configuration fix that actually mattered.

| Rule | Count | What |
|---|---|---|
| `javascript:S109` | 10 | Magic numbers — `255`/`254`/`12`/`20` field lengths in `address-schema.js`, `400` status codes in three controllers and `address-book-client.real.js` |
| `javascript:S1172` | 5 | Unused function parameters in `get-permissions.js` (4) and `auth/controller.js` |
| `javascript:S7763` | 5 | Prefer `export…from` re-exports — `address-book-client.js` (3), `filters.js` (2) |
| `javascript:S7772` | 3 | Prefer `node:` prefix — `state.js` (`node:crypto`), `nunjucks.js` and `server.js` (`node:path`) |
| `css:S8776` | 2 | Missing scoping root in `_links.scss` |
| `javascript:S1192` | 1 | Duplicated literal in `auth/controller.js` |
| `javascript:S3358` | 1 | Nested ternary in `address-book-client.stub.js` |
| `javascript:S2138` | 1 | `undefined` where `null` is meant, `list/controller.js` |
| `javascript:S7786` | 1 | `new Error()` should be `new TypeError()`, `config.js` |

### Fixed: two `javascript:S5332` criticals were false positives

`src/auth/get-safe-redirect.js` was flagged twice for "Using http protocol is
insecure". The URL in question is a parse-only sentinel — it gives a relative
redirect path an origin to resolve against so that anything escaping that origin can
be rejected, and its `origin` is compared against the same literal. It is never
fetched. Named as a constant on `https` so it no longer reads as an insecure
outbound URL; behaviour is identical and all 291 tests still pass.

Preferred over marking the issues FALSE_POSITIVE in SonarCloud: the code is
self-documenting, needs no SonarCloud admin rights, and survives a project re-key.

## What the gate actually measures

Every condition on every one of these eight repos' gates is a `new_*` metric —
`new_coverage`, `new_critical_violations`, `new_major_violations`,
`new_duplicated_lines_density`, the three `new_*_rating`s,
`new_security_hotspots_reviewed`.

So the branch-level gate is **not** a whole-repo gate. It is new-code-period scoped,
just against `main`'s period rather than a PR's diff. Pre-existing findings outside
that window fail no gate at all, PR-scoped or branch-scoped — which is why
ins-frontend could hold 49 open findings while reporting only 1 new critical and 1
new major.

The practical consequence: "main passes its own quality gate" is a weaker statement
than it sounds. The `coverage`, `violations` and `code_smells` measures are what
show a repo's actual state; the gate shows only what changed recently. Read both.

## Re-running this check

Query each repo's gate directly. Per-repo `sonar-*` MCP servers are configured in
each repo's `.mcp.json`:

```
get_project_quality_gate_status(projectKey="DEFRA_<repo>", branch="main")
```

For the overall picture rather than the new-code slice:

```
get_component_measures(branch="main", metricKeys=[
  "coverage", "lines_to_cover", "uncovered_lines",
  "conditions_to_cover", "uncovered_conditions", "violations", "code_smells"])
```

Two cautions learned here:

- `get_component_measures` returns **empty values for every `new_*` metric** on these
  projects, even while the gate simultaneously reports a `new_coverage` percentage.
  Don't read that emptiness as "the new-code window is empty" — read new-code figures
  off the gate response, or the SonarCloud UI's New Code tab.
- A locally-scanned feature branch is registered as a **short-lived** branch, so its
  issue counts and gate conditions are diff-scoped and not comparable to `main`'s.
  Its `coverage`/`lines_to_cover` measures *are* whole-repo and are the ones to
  compare. (`list_branches` shows only long-lived branches, which is how to tell.)

Never infer any of this from a PR's green check — that is the blind spot this
document exists to record.
