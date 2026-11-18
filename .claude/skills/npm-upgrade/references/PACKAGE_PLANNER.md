Research one npm package upgrade and write its classification into
the canonical JSON state.

Your prompt names the run, repo, package, current/target versions,
upgrade type, dependency kind, and a context-bundle directory.

Paths are relative to the workspace root, which your brief names. You may
start in a sub-repo, so run each command from that root.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

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
- Context bundle: `workareas/npm-upgrades/{run-id}/{repo}/.context/{normalized-package}/`
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
   - `usages` → one Bash `grep -rn` call (never the Grep tool, which is not allowlisted) over
     `repos/{repo}/src` for
     `from ['"]{package}` and `require\(['"]{package}` patterns.
3. **Read the per-repo best-practices bundle** if the package is
   framework-adjacent (Hapi, govuk-frontend, Vitest, Playwright).
   Path: `workareas/npm-upgrades/{run-id}/{repo}/best-practices.md`.
4. **Decide classification, risk, and whether the upgrade is safe to
   automate.** See Classification below.
5. **Write the classification into JSON** via
   `tim npm packages set-classification`. There is no markdown plan file
   to write — the JSON row is the plan.

---

## Writing the classification

```bash
tim npm packages set-classification \
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
tim npm packages set-classification \
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

## Unattended mode

Follow this section as well as the workflow above when your spawn
prompt has the line `Mode: unattended`. Nobody reviews your plan before
it is applied, so each item gets an evidence row that proves what
happened to it. The prompt also gives `Policy:` (`ci-is-enough` or
`changelog-driven`), `Set:`, and sometimes `Last failure:` (the error
that demoted the package in Phase 2).

### U1. Which items get a row

| Policy | Rows |
|---|---|
| `changelog-driven` | Every item in the changelog for each version after `{current}` up to and including `{target}`: breaking changes, deprecations, new features and fixes. |
| `ci-is-enough` | One row for each change this repo needs: each rename, import path, config change or type fix. None when it needs no change. |

With `Last failure:`, the rows must explain that failure: read the
failure, find the change in the changelog that caused it, and record it.

### U2. Record each row

```bash
tim npm packages add-evidence \
  --run-id {run-id} --repo {repo} --package {package} \
  --item "{the changelog item's heading or first line}" \
  --outcome applied|not-applicable|needs-a-person \
  [--pattern "{the old form, as a fixed string}"] \
  [--reason "{why it does not apply, or what a person has to decide}"]
```

It counts the pattern's hits in the repo's tracked files now and
refuses an outcome the count contradicts: `applied` needs a pattern
with hits, and a `not-applicable` pattern must have none. Choose a
pattern that only the old form matches, such as an import path, an
option name, a config key or a type name. `package.json` counts, so the
package's own name is never a pattern. Check it first:

```bash
tim deps evidence count {repo} "{pattern}"
```

An item with several old forms gets one row per pattern.

### U3. Choose the outcome

| Outcome | When |
|---|---|
| `applied` | The change is mechanical, as `.claude/rules/nightly.md` defines it: a rename, an import path, a config file moving to a new format with the same settings, or a type fix, including a deprecation whose replacement the changelog names. The pattern is the old form and the repo contains it. The implementor makes the change. |
| `not-applicable` | The repo does not use what the item changes: give the pattern, which must have no hits, and the reason. Or the item is internal to the package and changes nothing the repo uses: the reason says so, and no pattern is needed. |
| `needs-a-person` | Anything else: a change in runtime behaviour or defaults, a new Node or peer dependency range the repo must follow, a hit inside a test assertion, a change of what users see, an item that asks you to check or consider something, or anything you are unsure of. The reason says what to decide. |

When in doubt, choose `needs-a-person`.

When you cannot find a changelog after trying every channel in step 2
of the workflow, record one row:

```bash
tim npm packages add-evidence \
  --run-id {run-id} --repo {repo} --package {package} \
  --item "No changelog found for {current} to {target}" --outcome needs-a-person \
  --reason "Find the release notes and record each item"
```

### U4. Classify from the rows

- `auto` only when no row is `applied` or `needs-a-person`.
- `manual` otherwise. `--files-affected` lists the files the `applied`
  patterns hit, and `--changes-required` lists each `applied` row as
  "old → new".
- With `Last failure:`, also pass `--demoted-from-auto true`.

Your return line adds the row counts:
`DONE: {package} → {classification} (risk={RISK}; {A} applied, {P} not applicable, {Q} need a person)`.

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
`tim npm packages set-classification` rejects every call. Do **not** return an
empty or silent result: a silently-empty return leaves `classification`
null, which is indistinguishable from an unprocessed package, and the
classification coverage gate (`tim npm packages verify`, which
fails iff any `classification == null`) will block the parent with no clue
why.

Every termination MUST use `DONE`, `PARTIAL`, or this explicit failure
shape — never a bare, empty return:

```
FAILED: {package} — {what failed}; tried: {channels}; coverage gate will block.
```

Example:

```
FAILED: @hapi/hapi — context bundle directory missing under .context/@hapi__hapi; tried: bundle read, npm registry WebFetch, tim npm packages set-classification; coverage gate will block.
```
