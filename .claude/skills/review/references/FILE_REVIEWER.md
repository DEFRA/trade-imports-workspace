Review **one file** as part of a larger ticket review.

Your prompt specifies the repo, the file path, the commit(s), the mode
(FRESH / REFRESH / MERGE_RESOLVED), and the ticket ID.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Output — JSON via helper scripts

The per-file review artifact is a JSON file written by helper scripts —
never by hand. Schema:
`~/git/defra/trade-imports-workspace/.claude/skills/review/assets/file-review-schema.md`.

You will **not** write markdown. You will call three commands:

```bash
# For each finding (run as many times as you have findings):
~/git/defra/trade-imports-workspace/tools/review/file-review-add-item.sh EUDPA-XXXXX \
    --repo <repo> --file <file-path> \
    --line <line> --severity <Critical|Major|Minor> \
    --category <category> \
    --issue "<one-line description>" \
    --fix "Must: <what must become true>. One way: <a suggested change>" \
    [--best-practice <relative/path.md>]

# Exactly once, at the end:
~/git/defra/trade-imports-workspace/tools/review/file-review-set-verdict.sh EUDPA-XXXXX \
    --repo <repo> --file <file-path> \
    --verdict <SAFE|NEEDS_ATTENTION|RISKY> \
    --reason "<one sentence>"
```

The placeholder JSON file is already initialised — don't run
`file-review-init.sh`. Setting the verdict is what marks the file as
reviewed for the coverage gate.

If you have **no findings**, skip the add-item calls and go straight to
`set-verdict --verdict SAFE --reason "..."`.

### The `--fix` text has two parts

- **Must:** what must be true when the item is done. Required. State
  the end state, not an edit: "One function owns the port label
  format; every page calls it", not "Add a guard in `ports/index.js`".
- **One way:** a change that would get there. Optional, and only a
  suggestion. The fixer may choose a better way that meets the Must.

## Scope discipline

Two scopes — don't conflate them:

- **Findings scope = the diff, widened for code quality.** Flag issues
  introduced or touched by this PR. For functional findings (bugs,
  security, error paths, performance), a pre-existing problem in
  untouched code is not a finding, unless the PR substantially
  rewrites the function. For code-quality findings (see step 5), these
  are also in scope, wherever they sit in the file:
  - every comment and every name in the file, and every test title in
    a test file
  - any comment, JSDoc or doc line the diff makes untrue
  - the class, helper or path the change copies or sits beside
- **Context scope = broader.** Read the whole file, the related
  files (test ↔ source, controller ↔ service, mapper ↔ DTO, sibling
  enums/types in the same package), and the ticket AC. You can't
  judge whether a change is correct without seeing what it talks to.

A reviewer who reads only the hunk produces shallow findings. A
reviewer who flags functional problems in untouched code produces
noise. Aim for neither.

## Workflow

### 1. Determine mode

| Mode | Trigger in prompt | Meaning |
|---|---|---|
| FRESH | default | First-pass review of this file in this PR |
| REFRESH | `Mode: REFRESH` | Re-check prior findings + scan new lines since last review |
| MERGE_RESOLVED | `Mode: MERGE_RESOLVED` | File came out of a hand-resolved merge; the resolution exists in neither parent |

### 2. Load supporting context

In every mode:

1. **Per-PR best practices.** Read one file:
   ```
   ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/best-practices/{repo}.md
   ```
   `prepare-review.sh` already concatenated every best-practice file
   applicable to your repo there. Don't walk `.review-meta.json` **for
   best-practice paths**, and don't read individual
   `docs/best-practices/*.md` files — the bundle is the single source for
   those. (Reading `.review-meta.json` for the PR set is a different
   thing, and the behaviour-spec check in step 5 needs it.) When citing a rule on
   `file-review-add-item.sh --best-practice <path>`, use the relative
   path shown in the bundle's `## Source: docs/best-practices/...`
   headings (e.g. `node/pino-logging.md`).
2. **House rules.** Read
   `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`
   in full. Its rules apply to every file, whatever the language.
3. **Ticket.** Read `ticket.md` for AC and intent.

In REFRESH / MERGE_RESOLVED only, additionally:

4. **Prior consolidated items for this file** — this is the most
   important context:
   ```bash
   ~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --repo {repo} --file {file-path}
   ```
   Columns: `repo  id  file  line  severity  category  issue  fix  disposition  status  notes`.

   **Reporting rule for REFRESH / MERGE_RESOLVED:**

   The reconciler appends *all* of your findings to the consolidated
   items table as new entries. So your findings must contain **only**
   things not already represented there:

   - For each prior item (any disposition, any status) where the
     violation is still present in the current code: **do NOT
     re-report it.** The item already exists; re-reporting creates a
     duplicate.
   - For each prior item that is now resolved (violation no longer
     present in the code): **do NOT report it.** The orchestrator
     drains stale items separately.
   - For each prior `Fix + Done` item where the violation is BACK
     (regression): **DO report it**, with the prior item's `--category`
     and an `--issue` that starts `Regression of #N:`, naming the
     prior item. The reconciler emits a spot-check
     advisory but does not auto-mutate the prior `Fix + Done` row;
     the user re-walks the new entry.
   - For each genuinely new violation introduced by changes since
     the last review: **DO report it** as normal.

   Net: in REFRESH, your `.review.json` should contain only deltas —
   regressions and net-new findings. Often it's empty (verdict SAFE,
   no findings), and that's correct. `refresh/scope.sh --write-snapshot`
   already clears the prior `todos` array for files in Lists A and C
   before you run, so any todos in your `.review.json` at the end are
   genuinely new.

5. **Prior per-file review snapshot** — optional reading for context:
   `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/file-reviews/{repo}/{path_with_underscores}.review.json`.
   This is what *you* (or a prior reviewer) wrote last time. The
   consolidated items table above is the canonical source of truth.

### 3. Get the file-scoped diff

```bash
~/git/defra/trade-imports-workspace/tools/github/file-diff.sh {repo} {pr-number} {file-path} --ticket EUDPA-XXXXX
```

Returns only the hunks for your file — don't fetch the whole PR diff.
`--ticket` makes it read from the workspace's cached PR diff
(`workareas/reviews/EUDPA-XXXXX/.diffs/{repo}.diff`) instead of
hitting the GitHub API, which matters when 100 reviewers run in
parallel.

In MERGE_RESOLVED mode the prompt also gives you `old_sha` / `new_sha`;
the resolution delta is:

```bash
git -C ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo} \
    diff {old_sha}..{new_sha} -- {file-path}
```

### 4. Read the file and its related context

The file itself:

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo}/{file-path}
```

Then follow the relationships worth looking at — pick what's
applicable, don't read transitively forever:

| If reviewing… | Also read |
|---|---|
| Source (`Foo.java`, `foo.js`) | The matching test file, if any |
| Test (`FooTest.java`, `foo.test.js`) | The source under test |
| Controller | The service(s) it calls + the schema/DTO it accepts |
| Service | Its repository + the controllers that call it |
| Mapper | Both source and target types |
| DTO / Record | Sibling DTOs in the same package + the mapper |
| Enum | The mapper or controller consuming its values |
| `.njk` template | The controller / view-helper supplying its context |
| Config (`pom.xml`, `package.json`) | Usage sites of any newly added dependency |

If the file is a leaf with no obvious related context, that's fine —
move on. Use `Grep` to find callers/usages when it's not obvious.

### 5. Apply review criteria

Findings follow the scope rules above. Weigh the file against:

- The applicable best-practices files loaded in step 2 (cite them via
  `--best-practice`).
- The house rules in `.claude/rules/code-quality.md`.
- Correctness vs the AC in `ticket.md`.
- Bugs, null safety, error paths, security, performance.
- Test coverage — but only ask whether *this change* is tested, not
  whether the file's overall coverage is good.
- The four code-quality dimensions below. Work through each one for
  every file. A file with no finding in a dimension is fine; a
  dimension you skipped is not.

Engineering review means checking the change against the patterns the
codebase already sets: the feature-folder shape, the journey platform,
controllers, view models and obligations, the `frontend-change`
recipes, `docs/best-practices/`, how sibling features do the same
thing, and tests in the house style. Where GOV.UK guidance and the
page disagree, GOV.UK wins: raise it as a finding with the GOV.UK
end state as the Must, not as a question.

#### Naming: predict, then compare

For every function, method, variable, constant, flag and test helper
the diff adds or renames, and every name a changed line calls:

1. Read the name alone. Write down what you predict it returns and
   what it changes (state, session, database, redirect, log).
2. Read the body. Compare.
3. A mismatch is a finding. So is a name that needs its comment to be
   understood.

Examples from this codebase:

- `holdsSilently` in `check-answers/controller.js` sits under
  `// c-201: an amendment opens with no errors; Continue refused shows
  them.` The flag hides answer errors, and it is also true for a
  submitted notification. The comment decodes the name. Finding: the
  name. Must: a name that says what the flag does in every state it
  covers, with the comment removed.
- `report()` cleared state as well as reporting. Finding: the name
  hides a side effect.
- `save-actions.njk` took two overlapping booleans and six positional
  parameters. Finding: positional boolean flags.
- `User-Id`, `userId`, `ownerId` and "actor id" named one person in
  `NotificationTemplate.java`. Finding: one concept, several names.

Also flag: metaphors (`lightenRemote` for "exclude gh-pages from the
fetch"), a rename that stops part-way through the concept's
vocabulary (`telephone*` keys left beside `phone`), and a new name for
a value the repo already names (`HEADER_USER_ID` declared twice).

#### Structure: one home for each rule

- **Two homes for one rule.** The same rule, format or guard written
  in more than one place. Example: three port-label formats in
  `services/ports/index.js`. Must: one owner; the other places call it.
- **Wrong layer.** Logic sitting where the reader would not look for
  it. Example: retry, proxy and FormData re-encoding inside
  `call-counts/backend-fetch.js`, a folder for counting calls. Set
  codes or set names inside `engine/` or `services/persistence/`.
- **A second mechanism beside an existing one.** A new class, path or
  helper that mirrors one already there, instead of extending or
  extracting from it. Example: `EmfMetricWriter` copying
  `ExternalCallMetrics`; a second fetch path beside `setup-proxy.js`.
  Before you raise it, open the existing owner and quote its line.
- **Test set-up copied between tests.** Set-up used by two tests
  belongs in the shared helper (`engine/test-support.js`,
  `fit/<set>-journey.js`, `flows/<domain>/journey.ts`, the Java IT
  bases). A promoted helper whose local copies remain is a finding.
- **A pattern extended and its recipe left behind.** The change does
  what an `add-a-*` recipe describes, but the recipe still says the
  old way. Example: the `allowMissing` opt-in missing from
  `add-a-page.md`.

Feature folders: production controllers under
`sets/*/journeys/*/features/*` are independent by design. Near-identical
`get`, `post` and `render` bodies across feature controllers are not a
duplication finding, and the fix is never a shared controller. That
ruling covers production controllers only. It never covers test
support, and importing a sibling feature's helper is fine.

#### Logging: every decision leaves a trace

- **Silent decision.** A branch that changes the outcome (refusal,
  redirect, retry, fallback, state switch) and logs nothing. Example:
  the silent retry in `backend-fetch.js`.
- **Missing ids.** A log line support cannot search by: no
  notification reference, user, port code, dataset or status.
  Example: `ExternalCallMetrics` logging "failure in 5 ms" with no
  cause.
- **Lost cause.** `getMessage()` or `err.message` logged in place of
  the throwable or `{ err }`.
- **Bodies at INFO.** A request or response body logged at INFO.

"Support cannot tell X during an incident" is an accepted failure
scenario for a logging finding.

#### Test truth: the title is a claim

- **Title vs assertion.** Read the title, then the assertions. The
  title must state what the assertions prove, no more. Example:
  `store-contract.test.js` titled "flip status to submitted" asserts
  `SUBMITTED_ACTION_REQUIRED`.
- **Cannot fail.** Ask which production line, if removed, turns this
  test red. If none does, the test is a finding. This includes an
  assertion on a value the set-up itself wrote, and an absence check
  (`REMOVED_*` constants) where an exact positive assertion is
  possible.
- **Absorbed behaviour change.** A test whose expected value changed
  while its set-up did not. That is a behaviour change, made silently.
  Example: deleting `shouldOpenRun` moved the post-origin redirect
  from the commodities page to the hub, and `opening-run.test.js` was
  re-baselined from `pagePath(journeyId, 'commodities')` to
  `hubPath(journeyId)` on the same set-up. Critical unless the ticket
  asks for that change.

#### Build config ships with the feature

When the PR set adds client-side JavaScript for a feature, check that
the same PR set registers its bundle: the `webpack.config.js` entry,
any new SCSS partial in `_index.scss`, and any devDependency a test
environment needs (`jsdom` for `@vitest-environment jsdom`). A missing
entry is Critical: unit tests import the source directly and pass,
the page renders, and the script 404s in the browser.

#### Code-quality findings are real by default

Naming, comments, structure, duplication, logging, test readability
and history in code are code-quality findings. Raise them. These are
never reasons to drop one:

- it is a matter of taste
- it was there before this PR
- it is out of the ticket's scope
- a comparable file does it the same way

- the plan said to write it that way
- an earlier review or decision kept it

The only reason to drop one is that it is factually wrong: the copies
differ, the name does predict what the code returns and changes, or
the comment is accurate and describes only its own lines. Quote the
code that shows it.

Functional findings (`correctness`, `security`, `error-handling`,
`coverage-gap`) are the other way round: raise one only with evidence,
a concrete failure scenario, the acceptance criterion it breaks, or the
line it fails on. A functional hunch with none of these is not a
finding.

In MERGE_RESOLVED mode, additionally:

- For every prior `Fix + Done` item on this file (from step 2.4, the
  prior consolidated items):
  verify the fix is still in the resolved code. If undone by the
  merge, file it again with `--severity Critical`, the prior item's
  `--category`, and an `--issue` that starts `Regression of #N:`.
- Watch for behaviour smuggled in from the source branch (other
  tickets' code) that contradicts decisions for this ticket.
- Pay extra attention to the integration points where the two sides
  of the merge meet — most likely defect sites.

#### Behaviour-spec files

`openspec/specs/**/spec.md` and `openspec/coverage/**/coverage.json` are
the workspace's Behaviour Spec. `frontend-change` writes them at the end
of every increment, so they arrive in PRs as a claim about behaviour —
and a wrong claim is as damaging as wrong code, because the next person
trusts it. Two extra checks, both `--severity Critical` on a mismatch:

- **`openspec/specs/**/spec.md`** — for every added or changed
  Given/When/Then scenario, does it describe the same behaviour as the
  ticket's Acceptance Criteria in `ticket.md`? Not only "does the code
  satisfy the AC" — the usual question — but "does this spec update
  accurately represent it". A scenario that overstates, understates or
  quietly restates a different rule is a mismatch.
- **`openspec/coverage/**/coverage.json`** — for every `tests[]` link on
  a scenario this PR touched, is the named test real and does it witness
  that scenario? One rule, below. A link carried over unchanged from a
  previous increment's `coverage.json`, on a scenario this PR changed, is
  a coverage claim nobody re-verified. Untouched scenarios' links are out
  of scope.

**When a coverage link passes.** Either is enough:

- the named `file` appears in any diff under
  `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/.diffs/*.diff`; **or**
- it exists in the repo the link names, and its body actually asserts the
  scenario.

Flag Critical only when the file cannot be found at all, or is found and
does not cover the scenario. Links routinely name tests in
`trade-imports-ins-tests`, which often has no PR in the set — "not in
this PR's diff" is not on its own a finding.

**Which checkout to read.** `prepare-review.sh` clones every repo in the
PR set pinned at its merge commit under
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo}/`
— the same pinned path step 4 uses. Go there first. Only fall back to the
live clone at `~/git/defra/trade-imports-workspace/repos/{repo}/` when the
repo has no PR in the set, and say so in the finding: that clone sits on
whatever branch its owner left it on and may be dirty, so a Critical
raised against it can be a false positive. Either way record the ref you
resolved:

```bash
git -C <the checkout you read> rev-parse --short HEAD
```

The spec and the code it describes may land in **different PRs** — the
spec lives in `trade-imports-workspace`, the frontend code in its own
repo. Read `.review-meta.json` for the full PR set. "No code diff in this
PR" is not a reason to skip the check.

### 6. Filter your findings

**A good finding is:**
- Specific — names the function/line/pattern.
- In scope — see "Scope discipline".
- Cites a rule, a best-practice, a house rule, or a concrete failure
  mode.
- Has a Must (not just "consider improving").

**Don't add an item for:**
- A functional problem in code this PR does not touch.
- "Could be more SOLID/DRY/clean" without a concrete Must.
- Formatting preferences no rule states.
- Missing test coverage for code not in this PR.
- The same finding restated across different lines. One rule broken in
  several places is one finding with every line listed in `--issue`.

### 7. Write findings + verdict

For each finding that survives filtering, run `file-review-add-item.sh`
with the appropriate flags.

Then run `file-review-set-verdict.sh` once:

| Verdict | When |
|---|---|
| `SAFE` | No Critical or Major findings |
| `NEEDS_ATTENTION` | Major findings, no Criticals |
| `RISKY` | At least one Critical |

`--reason` is one sentence summarising why.

## Severity

| Severity | What |
|---|---|
| Critical | Bug, security issue, broken AC, a behaviour-spec update that misrepresents the AC or claims unverified coverage, an absorbed behaviour change, or a missing bundle entry |
| Major | Quality / maintainability / missing test for new behaviour. Every `naming`, `structure`, `duplication`, `logging` and `test-readability` finding is at least Major. |
| Minor | A best-practice breach with no effect on how a reader understands the code |

## Category

Give every finding exactly one `--category` from the fixed list in
`~/git/defra/trade-imports-workspace/.claude/skills/review/assets/file-review-schema.md`
→ "Category values". `file-review-add-item.sh` refuses any other word.

- Functional: `correctness`, `security`, `error-handling`,
  `coverage-gap`.
- Code quality: `naming`, `comments`, `structure`, `duplication`,
  `logging`, `test-readability`, `history`.

The step 5 dimensions map onto them: Naming is `naming`. Structure is
`structure`, except one rule in two homes and copied test set-up, which
are `duplication`. Logging is `logging`. Test truth is
`test-readability` for a title that over-claims or a test that cannot
fail, and `correctness` for an absorbed behaviour change. A missing
test for new behaviour, and a coverage link that does not witness its
scenario, are `coverage-gap`. A behaviour-spec scenario that misstates
the AC, and a missing bundle entry, are `correctness`.

## File type guidance

Behaviour-spec files match their own rows, not the generic Config row —
`coverage.json` is a behaviour claim, not configuration.

| Type | Specific scope |
|---|---|
| Source (`.java`, `.js`, `.ts`) | New/changed behaviour + tests for it; naming, structure and logging dimensions; every comment in the file |
| Test (`*Test.java`, `*.test.js`, `*.spec.ts`) | New tests assert behaviour not implementation; isolation; test-truth dimension on every title in the file; set-up in the shared helper |
| Template (`.njk`) | govuk-frontend usage, accessibility, content style |
| Behaviour spec (`openspec/specs/**/spec.md`) | Added/changed scenarios describe the same behaviour as the ticket AC; conventions in `openspec/config.yaml` (MUST not SHALL, observable-only scenarios, no test names, stable IDs) |
| Coverage (`openspec/coverage/**/coverage.json`) | Links on touched scenarios pass the two-way rule under "Behaviour-spec files" — in a PR-set diff, or present in the named repo and actually asserting the scenario; derived `coverage` values match the `tests[]` array |
| Config (`.yml`, `.json`, `pom.xml`, `package.json`) | New keys correct, no secrets, dep versions; do not flag missing comments |
| Lockfile (`package-lock.json`) | Only flag if a transitive dep has a known CVE; do not flag drift |

## Completion check

When you're done, your placeholder JSON file should have:

- `verdict` set (SAFE / NEEDS_ATTENTION / RISKY), not `null`.
- `reviewed_at` populated (`set-verdict` stamps it).
- `todos` populated for every finding (each with `id`, `line`,
  `severity`, `category`, `issue`, `fix`, and optionally
  `best_practice`).

The parent skill runs `verify-coverage.sh` afterwards — it checks
`.verdict != null`. If your file still has `verdict: null`, coverage
fails and you'll be re-spawned.
