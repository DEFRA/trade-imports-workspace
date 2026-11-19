Research one govuk-frontend version's changelog entry and write a plan
for what (if anything) needs changing in the repo.

Your spawn prompt names the run, repo, version, the pre-baked changelog
file, and the pre-baked best-practices bundle.

Paths are relative to the workspace root, which your brief names. You may
start in a sub-repo, so run each command from that root.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

## Boundaries

Research and plan only. Do not edit source files, run npm commands, or
attempt any implementation.

---

## Inputs (provided in the spawn prompt)

- `{run-id}`, `{repo-name}`, `{repo-path}`, `{version}`
- Pre-baked changelog: `workareas/govuk-upgrades/{run-id}/{repo-name}/version__{version}.changelog.md`
- Best-practices bundle: `workareas/govuk-upgrades/{run-id}/{repo-name}/best-practices.md`

Canonical state: `versions.{repo-name}.json` in the same directory.
Schema: `.claude/skills/govuk-upgrade/assets/version-state-schema.md`.

---

## Workflow

1. Read the pre-baked changelog section.
2. Scan the repo for patterns from the changelog (Bash `grep -rn`).
3. Record findings via the `version-*` helpers.

---

## Step 1: Read the changelog section

Use the Read tool on the pre-baked file
`workareas/govuk-upgrades/{run-id}/{repo-name}/version__{version}.changelog.md`.

Focus on:

- **Breaking changes** — must address
- **Recommended changes** — address if patterns match
- **Deprecated features** — note for awareness

Optionally Read the best-practices bundle when the changelog mentions
component / pattern / accessibility / styles areas:
`workareas/govuk-upgrades/{run-id}/{repo-name}/best-practices.md`.

---

## Step 2: Scan the repo

For each breaking change, recommended change, or deprecated feature in
the changelog, search the repo with one Bash `grep -rn` call per pattern.

**File types to scan and what to look for:**

| Extension | What to search for |
|-----------|--------------------|
| `*.njk`, `*.html`, `*.hbs` | Macro names (e.g. `govukHeader`), parameter names (e.g. `serviceName`), CSS class names (e.g. `govuk-header__service-name`) |
| `*.scss`, `*.css` | SCSS variables (`$govuk-`), mixin names, `@forward`/`@use`/`@import` paths |
| `*.js`, `*.ts`, `*.mjs` | Import paths (`govuk-frontend`), class names, constructor calls, method names |
| `package.json` | The `govuk-frontend` version constraint |

For example `grep -rn --include="*.njk" govukHeader repos/{repo-name}/src`.
Do not use the Grep or Glob tools: they are not on the allowlist, so each
call waits on a permission prompt. Do not pipe the `grep`.

---

## Step 3: Record the classification

### If any files match patterns requiring changes → classify as `todo`

```bash
tim govuk classify \
  --run-id {run-id} --repo {repo-name} --govuk-version {version} \
  --classification todo \
  --summary "{one-line: what this version changes}"
```

Then, for each file that needs editing:

```bash
tim govuk add-change \
  --run-id {run-id} --repo {repo-name} --govuk-version {version} \
  --file {relative/path/to/file} \
  --why "{which changelog item requires this — quote the relevant line}" \
  --change "{specific, actionable description of what to change}"
```

Repeat for every file.

### If no files match any changelog patterns → classify as `noop`

```bash
tim govuk classify \
  --run-id {run-id} --repo {repo-name} --govuk-version {version} \
  --classification noop \
  --summary "{one-line: why no changes needed}"
```

`tim govuk classify --classification noop` clears any stale `changes[]`
automatically — no further calls needed.

---

## Classification guide

**Classify as `todo` when:**

- Any breaking changes apply to files in this repo
- Any recommended changes affect files in this repo
- A deprecated feature is actively used (even if not yet breaking)

**Classify as `noop` when:**

- No patterns from Breaking changes or Recommended changes appear in the repo
- Changes are purely internal to govuk-frontend (bug fixes, internal refactors, accessibility improvements not requiring template changes)

**When in doubt → `todo`**

---

## Unattended mode

Follow this section instead of "Step 3" and the "Classification guide"
when your spawn prompt has the line `Mode: unattended`. Nobody reviews
your plan before it is applied, so every changelog item gets an evidence
row that proves what happened to it. Steps 1 and 2 are the same.

### U1. One evidence row per changelog item

Record every item in the version's changelog section, not only the
breaking ones: breaking changes, recommended changes, deprecations, new
features and fixes.

```bash
tim govuk add-evidence \
  --run-id {run-id} --repo {repo-name} --govuk-version {version} \
  --item "{the changelog item's heading or first line}" \
  --outcome applied|not-applicable|needs-a-person \
  [--pattern "{the old form, as a fixed string}"] \
  [--reason "{why it does not apply, or what a person has to decide}"]
```

It counts the pattern's hits in the repo's tracked files now and
refuses an outcome the count contradicts: `applied` needs a pattern
with hits, and a `not-applicable` pattern must have none. Choose a
pattern that only the old form matches, such as a class name, macro
parameter, import path or SCSS variable. Check it first:

```bash
tim deps evidence count {repo-name} "{pattern}"
```

An item with several old forms gets one row per pattern.

### U2. Choose the outcome

| Outcome | When |
|---|---|
| `applied` | The change is mechanical, as `.claude/rules/nightly.md` defines it: a rename, an import path, a config format or a type fix, including a deprecation whose replacement the changelog names. The pattern is the old form and the repo contains it. Phase 3 makes the change. |
| `not-applicable` | The repo does not use what the item changes: give the pattern, which must have no hits, and the reason. Or the item is internal to govuk-frontend and changes nothing the repo or its users see: the reason says so, and no pattern is needed. |
| `needs-a-person` | Anything else: a change to what users see, a change in behaviour, a new feature with options, an item that asks you to check or consider something, a hit inside a test assertion, or anything you are unsure of. The reason says what to decide. |

When in doubt, choose `needs-a-person`. It replaces "when in doubt,
`todo`" in unattended mode.

### U3. Changes and classification

For each `applied` row, add one `tim govuk add-change` entry per file
the pattern hits, as in Step 3. Its `--why` quotes the item and its
`--change` says exactly what replaces the pattern. Add no change for a
`not-applicable` or `needs-a-person` row.

Then classify the version with `tim govuk classify`:

- `todo` when it has at least one `applied` row
- `noop` otherwise, with a summary that names any `needs-a-person` rows

A `noop` keeps its evidence rows: `classify` clears only `changes[]`.

### U4. No changelog section

When the pre-baked changelog file is missing, record one row and
classify the version `noop`:

```bash
tim govuk add-evidence \
  --run-id {run-id} --repo {repo-name} --govuk-version {version} \
  --item "No changelog section for v{version}" --outcome needs-a-person \
  --reason "Read the release notes and record each item"
```

Your confirmation line adds the row counts:
`Classified {version}: {todo|noop} ({N} files; {A} applied, {P} not applicable, {Q} need a person)`.

---

## Verifying your work

After your last helper call, the version entry in
`versions.{repo-name}.json` should have:

- `classification` set to `"todo"` or `"noop"`
- `classified_at` stamped
- `changes[]` populated (for `todo`) or empty (for `noop`)

Print a one-line confirmation in your final message:
`Classified {version}: {todo|noop} ({N} files)`.

---

## Return value on failure

If you cannot classify the version — the pre-baked changelog file is
missing, the repo scan cannot run, or the `version-*` helpers reject every
call — do **not** return an empty or silent result. A silently-empty
return (no classification, no changes) is indistinguishable from a clean
`noop`, and the downstream classification coverage gate will block the
parent with no clue why.

Every termination MUST use the success confirmation above **or** this
explicit failure shape — never a bare, empty return:

```
FAILED: {version} — {what failed}; tried: {channels}; coverage gate will block.
```

Example:

```
FAILED: 5.4.0 — pre-baked changelog file missing under workareas/govuk-upgrades/{run-id}/{repo-name}; tried: changelog read, best-practices bundle; coverage gate will block.
```
