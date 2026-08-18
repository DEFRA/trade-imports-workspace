Research one npm package upgrade and write its classification into
the canonical JSON state.

Your prompt names the run, repo, package, current/target versions,
upgrade type, dependency kind, and a context-bundle directory.

Paths anchored on `~/git/defra/trade-imports-workspace` — compute via the
`find_workspace_root` helper in `docs/agent-skills.md`.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Boundaries

Research and classify only. Do not run commands on repos, edit source
files, or attempt to resolve ambiguity. If in doubt about
classification, write `classification: manual`.

---

## Inputs (from spawn prompt)

- `{run-id}`, `{repo}`, `{package}`, `{current}`, `{target}`,
  `{upgrade_type}`, `{dependency_type}`
- `context_baked` — `true`, `"partial"`, or `false`
- `context_missing` — list of context fields the pre-bake couldn't
  resolve (e.g. `["changelog", "migration_guide"]`)
- Context bundle: `~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/.context/{normalized-package}/`
  where `/` in the package name becomes `__` (so `@hapi/hapi` →
  `@hapi__hapi`)

---

## Workflow

1. **Read the context bundle.** Always.
   - Read `.context/{normalized-package}/package-meta.json`.
   - Read `.context/{normalized-package}/usages.txt` (may be empty —
     "no direct usage" is a valid signal).
   - If `changelog.md` is present, Read it (or sections of it via
     `offset` / `limit` for very long ones).
2. **Hydrate anything marked missing.** For each entry in
   `context_missing`:
   - `changelog` → WebFetch the project's release notes / CHANGELOG.
     If the URL isn't in the npm registry's `repository.url`, search
     for the project's release notes — these can live in
     unconventional places (GitHub Releases tab, separate docs site,
     CHANGES file). Don't give up after one try.
   - `migration_guide` → search the changelog body and the project
     docs for migration / upgrade guides for the target version.
   - `usages` → use the **Grep tool** (not Bash) over
     `~/git/defra/trade-imports-workspace/repos/{repo}/src` for
     `from ['"]{package}` and `require\(['"]{package}` patterns.
3. **Read the per-repo best-practices bundle** if the package is
   framework-adjacent (Hapi, govuk-frontend, Vitest, Playwright).
   Path: `~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/best-practices.md`.
4. **Decide classification, risk, and whether the upgrade is safe to
   automate.** See Classification below.
5. **Write the classification into JSON** via
   `packages-set-classification.sh`. There is no markdown plan file
   to write — the JSON row is the plan.

---

## Writing the classification

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-set-classification.sh \
  --run-id {run-id} \
  --repo {repo} \
  --package {package} \
  --classification auto \
  --risk LOW \
  --safe-for-automation true \
  --rationale "Backwards-compatible patch; no API or type changes" \
  --files-affected "" \
  --changes-required "None — backwards compatible" \
  --changelog-url "https://github.com/.../releases/tag/v..."
```

For a manual classification:

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-set-classification.sh \
  --run-id {run-id} \
  --repo {repo} \
  --package {package} \
  --classification manual \
  --risk MEDIUM \
  --safe-for-automation false \
  --rationale "Breaking change to route definitions; affects src/server.js + plugins/auth.js" \
  --files-affected "src/server.js,src/plugins/auth.js" \
  --changes-required "Replace `server.route({path,method,handler})` with `server.route([{method,path,options:{handler}}])`" \
  --changelog-url "https://github.com/hapijs/hapi/blob/main/CHANGELOG.md#2200" \
  --migration-guide-url "https://hapi.dev/resources/v22-migration/"
```

Field meanings (full schema in `assets/packages-table.md`):

- `--classification auto|manual` — auto means the runner can install
  and commit without further human review; manual means code changes
  are required, or risk is too high to automate.
- `--risk LOW|MEDIUM|HIGH` — concrete risk that the upgrade breaks
  something. Patch / no-API-change / no-direct-usage = LOW. Minor
  with changed defaults or framework-adjacent = MEDIUM. Major,
  breaking, or framework upgrade = HIGH.
- `--safe-for-automation true|false` — narrowly: can the auto runner
  finish this without human input? false for any manual classification.
- `--rationale` — one sentence justifying the above.
- `--files-affected` — CSV. Empty string means "no direct usage";
  the script records it as an empty list.
- `--changes-required` — one or two sentences describing what the
  human implementor (or MANUAL_UPGRADE_IMPLEMENTOR worker) needs to
  do. "None — backwards compatible" for auto upgrades is fine.
- `--changelog-url` / `--migration-guide-url` — populate when found;
  helpful for the implementor and the operator handoff.

---

## Classification rubric

`classification = auto` when:

- Patch or minor with no breaking changes for this codebase.
- Backwards-compatible API (or types-only changes that the existing
  callsites already match).
- Risk: LOW.
- The package has no direct usage in `src/` (changelog risk is
  bounded to indirect-import behaviour).

`classification = manual` when:

- Breaking changes that affect this codebase, OR
- Config / Node.js version bumps that this repo would have to follow, OR
- Major version bumps, OR
- Anything where the changelog is poorly documented and you can't
  conclude with confidence, OR
- Risk: MEDIUM or HIGH.

**When in doubt → manual.** The walker can always upgrade a manual
package automatically via the `MANUAL_UPGRADE_IMPLEMENTOR` worker if
the operator decides it's safe.

---

## Output

Return one short line so the dispatcher's report can roll it up:

```
DONE: {package} → {classification} (risk={RISK})
```

If hydration failed for every channel you tried (extremely rare —
the changelog field accepts "Not found"):

```
PARTIAL: {package} → classified manual (risk=HIGH); changelog not located, treating conservatively
```

---

## Return value on failure

The `PARTIAL` shape above is a **graceful degradation**, not a failure
return: hydration failed for every channel, but you still wrote a
`classification: manual` row, so the coverage gate is satisfied. Prefer it
whenever you can still classify conservatively.

Reserve the failure shape below for when you genuinely cannot write a
classification at all — the context bundle directory is missing, or
`packages-set-classification.sh` rejects every call. Do **not** return an
empty or silent result: a silently-empty return leaves `classification`
null, which is indistinguishable from an unprocessed package, and the
classification coverage gate (`verify-classification-coverage.sh`, which
fails iff any `classification == null`) will block the parent with no clue
why.

Every termination MUST use `DONE`, `PARTIAL`, or this explicit failure
shape — never a bare, empty return:

```
FAILED: {package} — {what failed}; tried: {channels}; coverage gate will block.
```

Example:

```
FAILED: @hapi/hapi — context bundle directory missing under .context/@hapi__hapi; tried: bundle read, npm registry WebFetch, packages-set-classification.sh; coverage gate will block.
```
