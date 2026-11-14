# tim — Trade Imports CLI

Node.js Ink/React CLI for the [trade-imports workspace](../). It is the workspace's command line: setting up and updating the repos, running the Docker stack, starting a service from source, Jira, Confluence, the backlog and the build loop all go through it. `tim docker` runs the stack scripts in [`../scripts/stack/`](../scripts/stack/). The scripts in [`../tools/`](../tools/) still exist for the jobs `tim` does not cover yet, but start here.

## Install

```bash
cd tim
npm install
npm i -g .
```

`tim` is now on your PATH. The global `tim` is a launcher: it finds the
workspace you address (`--workspace`, `TIM_WORKSPACE`, or the folders
above the current one) and, when that clone holds its own `tim/src/cli.js`
and `repos.json`, runs that clone's tim against that clone's repo roster.
One install serves every clone on the machine. A clone whose
`tim/node_modules` is missing is refused with exit code 2 and a message to
run `npm ci` in its `tim` folder.

To uninstall:

```bash
npm un -g tim
```

For active CLI development (edits visible immediately, no reinstall):

```bash
cd tim
npm link
```

## Usage

### Interactive menu

Run with no arguments in a terminal to open the Ink menu:

```bash
tim
```

Arrow keys navigate, Enter selects, Enter on an empty input goes back. Every top-level entry is wired to the same library code the direct CLI uses — pick whichever you prefer.

#### Menu quick reference

| Menu path                                                    | CLI equivalent                    |
| ------------------------------------------------------------ | --------------------------------- |
| Workspace → Status                                           | `tim workspace status`            |
| Workspace → Branch                                           | `tim workspace branch [name]`     |
| Workspace → Install                                          | `tim workspace install`           |
| Workspace → Lint                                             | `tim workspace lint`              |
| Workspace → Test                                             | `tim workspace test`              |
| Workspace → Clean                                            | `tim workspace clean`             |
| Workspace → Setup                                            | `tim workspace setup`             |
| Workspace → Update                                           | `tim workspace update`            |
| Workspace → Reset                                            | `tim workspace reset`             |
| Docker → Start the stack (run-stack.sh)                      | `tim docker up`                   |
| Docker → Start the stack from local source (run-stack.sh -d) | `tim docker dev`                  |
| Docker → Stop the stack (stop-stack.sh)                      | `tim docker down`                 |
| Docker → Restart the whole stack (restart-stack.sh)          | `tim docker restart`              |
| Docker → Bounce backend (bounce-backend.sh)                  | `tim docker bounce-backend`       |
| Start → Frontend (npm run dev)                               | `tim start frontend`              |
| Start → Backend (mvn spring-boot:run)                        | `tim start backend`               |
| Start → Admin (npm run dev)                                  | `tim start admin`                 |
| Auth                                                         | `tim auth`                        |
| Jira → Look up a ticket                                      | `tim jira ticket <id>`            |
| Jira → Read comments on a ticket                             | `tim jira comments <id>`          |
| Confluence → Look up a page                                  | `tim confluence page <id-or-url>` |
| Quit                                                         | exits the menu                    |

### Direct CLI

Pass a subcommand to skip the menu and run a command in one shot:

```bash
tim hello
tim hello --json
tim --version
tim workspace status
tim workspace status --json | jq
```

Every command supports:

- `--json` — emit one structured JSON line on stdout (suppresses Ink)
- `--no-ui` — plain text on stdout (suppresses Ink; auto-set when stdout is not a TTY)
- `--verbose` — structured logs to stderr
- `--workspace <path>` — override the resolved workspace root

### `tim workspace repo-state` — one report of several repos' git state

Reports each repo you name, from local git: its branch, HEAD, whether it is
dirty and every changed path, how many changes are staged, whether a merge is
in progress, and how far it is ahead of and behind origin. The build loop reads
it instead of asking an agent to read `git status` in each repo.

```bash
tim workspace repo-state --repos frontend:repos/trade-imports-plants-frontend,workspace:. --json
tim workspace repo-state --repos tests:repos/trade-imports-ins-tests --branch feat/EUDPA-1-x --base main
```

`--branch` adds whether each repo is on that branch and where the branch
points locally. `--base` counts commits against `origin/<base>`. `--fetch`
fetches origin first.

### `tim workspace pin-fetch` — keep gh-pages out of a clone

Pins one clone's fetch refspec so a bare `git fetch` or `git pull` cannot
bring in gh-pages, and deletes the gh-pages remote-tracking ref. Safe to run
again.

```bash
tim workspace pin-fetch . --exclude-gh-pages --prune
tim workspace pin-fetch workareas/reviews/EUDPA-1/repos/trade-imports-stub --pr 42 --include-main
```

`--exclude-gh-pages` fetches every branch except gh-pages (git 2.29 or
later); `--prune` then runs `git gc --prune=now`. `--pr <number>` fetches
only that pull request's head, as `origin/pr-<number>`; `--include-main`
adds main.

### `tim ci` — the e2e workflow's test scope

The E2E workflow (`.github/workflows/e2e-tests.yml`) runs these. Each
reads environment variables, as the workflow sets them, and prints only
what the step captures. A refusal prints `::error::<message>` on stderr and
exits 1. `--json` gives the result as one envelope instead.

```bash
REPOSITORY=DEFRA/trade-imports-ins-backend tim ci scope >> "$GITHUB_OUTPUT"
SUITES="tests/ins tests/animals" tim ci suites
TAGS="@ins-backend @gateway" tim ci tags
```

- `scope` prints `suites=` and `tags=` lines from the repo's entry in
  `config/e2e-tests-pr-scope.json` (`REPOSITORY` is owner/name; a repo with
  no entry uses `default`). With `MANUAL=true` it takes `SUITES` and `TAGS`
  instead. `all` runs every suite and stands alone. It notes where the
  scope came from on stderr.
- `suites` prints one Playwright path per line, giving a folder a trailing
  slash so `tests/animals` cannot also select `tests/animals-admin/`. It
  refuses a path outside `tests/`, with `..`, or with characters other than
  letters, digits, `.`, `_`, `-` and `/`.
- `tags` prints the tags joined by `|`, as one `--grep` pattern. It refuses
  a tag that is not `@` followed by letters, digits, `_` or `-`.

### `tim refine` — the ticket-refiner skill's workarea

```bash
tim refine prepare EUDPA-1234
tim refine finalize EUDPA-1234 --verdict READY --reason "Clear AC, repos identified"
```

- `prepare` writes `workareas/ticket-refinement/<ticket>/` in the workspace
  it runs in: `ticket.md` (the rendered description, comments and the
  Confluence pages the description links to), `.refinement-meta.json` with
  `verdict: null`, and `review.md` from the skill's template. It keeps a
  `review.md` that already has content. Running it again resets the
  verdict. Comments or a page it cannot read are left out, and `--json`
  lists them under `skipped`.
- `finalize` records the verdict, which must be `READY`, `NEEDS WORK` or
  `SPIKE REQUIRED`, its reason (null when empty) and `completed_at`,
  keeping the meta's other keys in place.

### `tim service-tag` — what the service-tag skill reads

```bash
tim service-tag start --service address-book --json
tim service-tag specs --domain animals --type e2e --json
```

- `start` reads, and changes nothing: the workspace's and the ins-tests
  clone's branch and `git status --porcelain` lines, each entry of
  `config/e2e-tests-pr-scope.json` but `default` (or the one `--service`
  names, short or full) with the services that call it directly, the
  `SERVICE_TAG_DOMAINS` map the ins-tests lint reads, and the places where
  the scope file and the map disagree. A direct call is a list-form
  `- TRADE_IMPORTS_<NAME>_URL=` entry under a service in
  `docker/stack/*.compose.yml`; `_BASE_URL` and map-form entries are not
  calls. Without `--json` it prints `MODE: READY`, then the report.
- `specs` lists the ins-tests clone's specs with their tags, each with one
  leading `@`, by asking Playwright to list the tests (no stack needed).
  `--domain` keeps specs under `tests/<domain>/`, `--type` those of one test
  type, and `--tag` those carrying the tag.
- Both refuse, with exit 1, a workspace with no `repos/trade-imports-ins-tests`;
  `start` also refuses one with no scope file.

### `tim capabilities extract` — read the capability map

```bash
tim capabilities extract docs/confluence/import-notification-capability-map.md
tim capabilities extract docs/confluence/import-notification-capability-map.md --format tsv
```

- A row is any table line whose first cell starts with a capability code
  (`CAP-0.4`, `CAP-H.3`, `COMMON-CAP-01.2`, `CORE-CAP-1.1`). A canonical
  row has the code alone in its first cell, an empty or `STATUS: <value>`
  second cell, and a name in its third.
- `list` (the default) prints `CODE — Name [STATUS]` for each row. When any
  row is not canonical it prints nothing on stdout, reports each broken row
  on stderr and exits 1.
- `tsv` prints `code`, `status`, `name`, `verdict` and `line` for every row,
  canonical or not, and exits 0.
- `--json` gives the rows, the violations, `total` and `canonical`. In
  `list` format a map that is not canonical is an error naming each broken
  row.

### `tim skill` — the skill-creator skill's steps

```bash
tim skill start "scaffold skill ticket-notes" --json
tim skill answer --run-id ticket-notes --field fanout.enabled --value 'true'
tim skill render --run-id ticket-notes
tim skill scaffold --run-id ticket-notes --dry-run
```

- `start` reads a trigger phrase. CREATE (`scaffold skill <name>`,
  `skill-create <name>`, `new workspace skill <name>`) refuses a skill
  folder that exists and seeds `workareas/skill-creator/<name>/decisions.json`
  unless it is there already. AUDIT_ONE (`audit skill <name>`,
  `review skill <name>`) names the skill's SKILL.md and audit file.
  AUDIT_ALL (`audit skills`, `audit all skills`) lists every skill with a
  SKILL.md except skill-creator. Plain output is `MODE: <mode>` then one
  line of JSON; `--json` puts the mode in `result.mode`.
- `answer` sets one answer under `answers`, splitting `--field` on dots and
  reading `--value` as JSON. It refuses a value that is not JSON and a
  field under a value that is not an object, and prints nothing.
- `render` prints the answers as markdown, with `(not answered)` where one
  is missing.
- `scaffold` refuses while an answer is missing, then writes SKILL.md, a
  reference per worker, a state schema for JSON state, a stub script per
  helper (executable), `decisions.md`, appends the skill's two
  `tools/<name>/` entries to `.claude/settings.json` (never twice) and
  stamps `scaffolded_at`. `--dry-run` only says what it would write.
- Every refusal exits 1. Paths come from the workspace tim runs in.

### `tim theme-ticket` — the theme-ticket skill's steps

```bash
tim theme-ticket start "which theme tickets are stale" --workarea shared/design-release-2-1
tim theme-ticket derive --workarea shared/design-release-2-1 --theme origin-page --out derived.json
tim theme-ticket stale --workarea shared/design-release-2-1
tim theme-ticket push workareas/shared/design-release-2-1/tickets/animals-journey --confirm
```

- `start` prints `MODE: <NAME>` (STUB, START, WRITE, MERGE or STALE, from
  `--mode` or the trigger phrase), then indented JSON with the workarea's
  paths, the branch and each ticket folder with its Jira key. It makes the
  workarea's `tickets/` folder if it is missing.
- `derive` finds the commits that wrote the theme's openspec (scoped by the
  theme, a Jira key `tickets.json` records for it, or a row scope), takes
  the scenarios they added, reads each from the current spec, and splits
  scenarios, spec files and rows by domain. A scenario a later commit
  renamed keeps its id and counts; one whose id no spec holds now is
  named in `warnings`. A review commit counts only inside the spec files
  the row commits wrote, unless `footprint-overrides.json` includes it.
  It fails rather than publish a split that does not sum, or one with an
  openspec area it has no domain for.
- `stale` compares, per ticket folder, the last change on the branch to
  the spec files its description links to against the Jira ticket's last
  update, as instants with their offsets. It reads only.
- `push` posts `description.txt` and the summary from `ticket.json` in one
  update, refusing hard-wrapped prose and `{expand}`. It is a dry run that
  sends nothing until `--confirm`.
- A usage error exits 2; every other refusal exits 1.

### `tim understanding-check` — the understanding-check skill's steps

```bash
tim understanding-check start EUDPA-123
tim understanding-check prepare EUDPA-123 --select
tim understanding-check prepare EUDPA-123 [--max-diff-bytes 200000]
tim understanding-check analysis add-finding EUDPA-123 --repo trade-imports-stub \
  --section edgeCases --evidence-file src/a.js --evidence-lines 4-9 --field case="Empty list"
tim understanding-check analysis complete EUDPA-123 --repo trade-imports-stub \
  --change-summary "Adds the check." --why-it-changed "Users asked for it."
tim understanding-check question add EUDPA-123 --category implementation \
  --prompt "Why does the retry skip 4xx?" --anchor-file src/retry.js --anchor-lines 42-58 \
  --expected-concepts "retry budget,idempotency" --rubric-pass "Names both reasons" \
  --rubric-partial "Names one reason but not the other" --rubric-fail "Conflates them"
tim understanding-check question replace EUDPA-123 --id Q3 ...   # the same options as add
tim understanding-check question remove EUDPA-123 --id Q3
tim understanding-check report EUDPA-123 --preview
tim understanding-check answer EUDPA-123 --question-id Q3 --answer-file answer.txt
tim understanding-check score EUDPA-123 --question-id Q3 --verdict PARTIAL \
  --rubric-match "Names one reason but not the other" --missed-concepts "retry budget" \
  --evidence-cited src/retry.js:42-58
tim understanding-check counts EUDPA-123
tim understanding-check verify EUDPA-123
tim understanding-check finalize EUDPA-123
tim understanding-check report EUDPA-123
```

- State lives in `workareas/understanding-checks/<ticket>/` of the
  workspace tim runs in.
- `start` prints `MODE: RESUME` and the meta when the check has
  `.interview-meta.json`. Otherwise it prints `MODE: FRESH` and makes the
  check's `.raw/` folder, where the skill saves what `gh` gives back:
  `prs.json` from `gh search prs`, then `<repo>.sha` and `<repo>.diff`
  from `gh pr view` and `gh pr diff`. tim makes no GitHub calls.
- `prepare --select` prints `<repo> <number>` for one pull request per
  repo: an open one over any other, then the newest.
- `prepare` fetches the ticket from Jira (`JIRA_USER`, `JIRA_TOKEN`,
  `JIRA_BASE_URL`) into `ticket.md`, cuts each saved diff to
  `--max-diff-bytes` (a cut is a coverage gap), redacts its secrets into
  `.diffs/<repo>.diff`, writes `best-practices/<repo>.md` and an
  `analysis.<repo>.json` placeholder, writes `.interview-meta.json`, then
  removes `.raw/`. A repo with no saved diff is left out. The redaction
  count goes to stderr; the matched text never does. `--json` gives the
  meta.
- `analysis add-finding` appends a finding to `analysis.<repo>.json`: an
  id one past the section's highest, each `--field KEY=VALUE` (split on
  the first `=`) in order, then the evidence. It prints the id.
  `analysis complete` stamps `changeSummary` and `whyItChanged` (at most
  300 characters each), `verdict: "complete"` and `completed_at`.
- `question add` appends a question to `questions.json`, starting the file
  with the ticket and `generated_at`, and prints its id, one past the
  number of questions. It refuses a 13th question, a category outside
  `architecture`, `implementation`, `scenario`, `debugging`,
  `test-coverage`, `operability` and `security`, and a PASS or PARTIAL
  clause without one of the categorical verbs (names, identifies,
  explains, describes, cites, distinguishes, contrasts, enumerates) as a
  whole word in any ASCII case. A letter, a decimal digit or an
  underscore next to the verb makes it part of a longer word.
  `--expected-concepts` splits on commas, drops empty parts, then trims
  each. `question replace` swaps a question for a new one with the same
  id; `question remove` drops one and numbers the rest from Q1.
- `answer` records the answer file's text, without its trailing
  newlines, as the question's only entry in `transcript.json`, last. An
  empty answer, or `--skipped`, records a skip.
- `score` writes the score onto the question's entry. The rubric match
  must quote the rubric: after each run of white space becomes one space,
  a match of at least 12 characters must hold a line of a clause, sit
  inside one, or hold one of its 24-character windows taken every 4
  characters. Otherwise the score is FAIL, `<unscorable>` and the missed
  concept `unscorable`, with an unscorable coverage gap on
  `.interview-meta.json`, and a match that was not empty or
  `<unscorable>` prints a warning on stderr.
- `report --preview` prints the plan-gate preview; `report` writes the
  ten-section `report.md`. A full report needs `questions.json`.
- `counts` prints PASS, PARTIAL, FAIL and PENDING overall and by question
  category, with security FAILs and coverage gaps. It refuses an answer to
  a question with no category in `questions.json`.
- `verify` lists, on stderr, every missing state file, incomplete or
  missing analysis, finding without evidence (a missing section counts as
  one), unanswered question and unscored answer, and exits 1 when there
  are any.
- `finalize` applies the counting rule in
  `.claude/skills/understanding-check/assets/verdict-rule.md`, stamps the
  verdict, its reason, `exit_code`, `completed_at` and the counts onto
  `.interview-meta.json`, and exits 0 for pass, 1 for needs-review and 2
  for high-risk. `--json` adds `meta_path`.
- Every refusal, a usage error included, exits 1, so it never reads as
  high-risk.

### `tim govuk` — start, read and change a govuk-frontend upgrade run

```bash
tim govuk start --ticket EUDPA-264
tim govuk start --branch chore/EUDPA-264-govuk-6 --target 6.1.0 --force
tim govuk plans --run-id EUDPA-264
tim govuk plans --run-id EUDPA-264 --repo trade-imports-animals-frontend --filter pending --sort-semver --json
tim govuk summaries --run-id EUDPA-264 --json
tim govuk render-plan --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1
tim govuk classify --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1 --classification todo --summary "Rename the header macro"
tim govuk add-change --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1 --file src/a.njk --why "..." --change "..."
tim govuk mark-done --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1 --commit 0123abc
tim govuk mark-failed --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1 --reason "npm test failed"
tim govuk apply --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1
```

- `start` finds every repo under `repos/` whose `package.json` lists
  govuk-frontend, writes `.run-meta.json`, puts each repo on the branch
  (`chore/<ticket>`, or `--branch` as given), seeds each repo's state with
  every stable version up to `--target` (else npm's latest, from
  `npm_config_registry` when set), caches govuk-frontend's CHANGELOG.md
  and each version's section, writes the best-practices bundle, prints
  the plans and reports each repo's `npm audit` critical and high counts.
  A re-run keeps each version's state; `--force` reseeds it. `--ticket`
  must be a key of `JIRA_PROJECT_KEY`, else EUDPA.
- State lives in `workareas/govuk-upgrades/<run>/<repo>/versions.<repo>.json`
  of the workspace tim runs in. `plans`, `summaries` and `render-plan`
  only read.
- `classify`, `add-change`, `mark-done` and `mark-failed` each change one
  version in the state file, through a temporary file and a rename, and
  print one line saying what they did. `--json` gives `{message, entry}`.
  `classify --classification noop` empties the version's changes;
  `--summary ""` clears the summary and leaving `--summary` out keeps it.
  Two writes to one file at the same moment can still lose one.
- `apply` sets the govuk-frontend constraint in the repo's `package.json`
  (the exact version, or the run's original prefix plus the version for
  the target or with `--final`), runs `npm install` and `npm test` in the
  repo's real path with their output in
  `/tmp/govuk-{install,test}-<repo>-<version>-<stamp>.txt`, commits
  everything in the repo and marks the version done. A failed npm step
  marks the version failed, prints the reason to stderr and exits 1. An
  intermediate noop version is only marked done, and a version already
  done is left alone. `--json` gives the outcome.
- `plans` prints each repo's counts (unplanned, todo, noop, done, failed)
  and its versions, then the totals. `--filter` lists only the versions
  that are `unplanned` (not classified), `todo` (classified todo, not
  applied), `noop`, `done`, `failed` or `pending` (not applied); the
  counts always cover every version. `--sort-semver` orders versions by
  their first three numeric parts. `--json` gives `run_id`, `repos` and
  `summary` as the result.
- `summaries` prints one tab-separated line per version that is not
  applied and is not a noop: repo, version, classification (`unplanned`
  when not classified), number of changes and summary, sorted by repo and
  then version. A run with no state files prints nothing.
- `render-plan` prints one version's plan as markdown, ending with its
  pre-baked changelog section. `--json` gives `{markdown}`.
- Every command that names one version takes `--govuk-version`, because
  `--version` prints tim's own version.
- A missing option, or a classification other than todo or noop, exits
  2; every other refusal exits 1.

### `tim review` — the review skill's helpers

```bash
tim review detect-tech repos/trade-imports-stub --no-ui
tim review detect-tech repos/trade-imports-animals-frontend --json
```

- `detect-tech` reads `.claude/skills/review/assets/routing.json` from the
  workspace tim runs in and prints the technologies it detects in the
  repo, with each one's best-practice files in routing order, as
  `{"technologies":[...],"best_practices":[...]}`. `--json` gives the same
  object as the result.
- A missing, empty or non-folder path prints empty arrays and exits 0.
  Routing it cannot read exits 1.

```bash
tim review file init EUDPA-1234 --repo trade-imports-stub --file src/Main.java --commit abc1234 --pr 42 --mode FRESH
tim review file add EUDPA-1234 --repo trade-imports-stub --file src/Main.java --line 41 --severity Major --category correctness --issue "Returns 200 for a missing id" --fix "Must: return 404."
tim review file verdict EUDPA-1234 --repo trade-imports-stub --file src/Main.java --verdict RISKY --reason "Logs a token"
tim review items list EUDPA-1234 --filter pending --json
tim review items add EUDPA-1234 --repo trade-imports-stub --file src/Main.java --line 41 --severity Major --category correctness --issue "..." --fix "..."
tim review items mark EUDPA-1234 --repo trade-imports-stub --item 3 --disposition Fix
tim review items status EUDPA-1234 --repo trade-imports-stub --item 3 --status Done --note abc1234
tim review items counts EUDPA-1234
```

- `file init|add|verdict` write one file's review under
  `workareas/reviews/<review-id>/file-reviews/<repo>/`, in the workspace
  tim runs in. `init` prints the file's path, `add` the new todo's id and
  `verdict` nothing. A todo's line is stored as a number.
- `items list|counts|add|mark|status` read and change
  `workareas/reviews/<review-id>/items.<repo>.json`. `list` prints one
  tab-separated line per item (repo, id, file, line, severity, category,
  issue, fix, disposition, status, notes); `add` prints the new id, with
  the line stored as text; `mark` and `status` print one confirmation
  line.
- `--json` gives the envelope: the items for `list`, the review id, repo,
  breakdown and total for `counts`, and the item written for the others.
- Every refusal exits 1, as the scripts they replace did.

```bash
tim review items render EUDPA-1234 --repo trade-imports-stub --write
tim review aggregate EUDPA-1234 --repo trade-imports-stub --write-items --section file-summary
gh api repos/DEFRA/trade-imports-stub/pulls/42/files --paginate --slurp > workareas/reviews/EUDPA-1234/.prs/trade-imports-stub-42.json
tim review verify files EUDPA-1234
tim review verify consistency EUDPA-1234
tim review verify style EUDPA-1234
tim review reconcile EUDPA-1234 --repo trade-imports-stub --dry-run
```

- `items render` prints a repo's `## Items` markdown table. `--write` puts
  it into `review.<repo>.md`: over the table there, else over a comment
  naming `tim review items render` or `render-items.sh`, else before
  `## Repository Verdict`.
- `aggregate` prints the File Analysis Summary, the items table or both.
  `--write-items` starts `items.<repo>.json` afresh from the file reviews
  and stamps `reconciled_at` on each reviewed one. `--json` gives each
  file's rollup.
- `verify files|consistency|style` write the checklist beside the file
  reviews and print the coverage. `files` reads each pull request's changed
  files from `.prs/<repo>-<pr>.json`, which `gh` writes, and refuses a pull
  request with none; tim never calls GitHub.
- `reconcile` appends each finding from the file reviews refreshed since
  they were last reconciled, and lists the fixed items in those files to
  spot-check. `--json` gives the counts, the items added and the
  spot-check.

```bash
tim review refresh pull EUDPA-1234
tim review refresh merge-resolved workareas/reviews/EUDPA-1234/repos/trade-imports-stub 1a2b3c4 5d6e7f8
tim review refresh gaps EUDPA-1234 --repo trade-imports-stub --pr 42
tim review refresh scope EUDPA-1234 --write-snapshot --json
tim review file-diff src/Main.java --ticket EUDPA-1234 --repo trade-imports-stub
gh pr diff 42 --repo DEFRA/trade-imports-stub | tim review file-diff src/Main.java --stdin
```

- `refresh pull` pins each review clone's fetch refspec to its pull
  request (and main for a merged one), fetches, and detaches at
  `origin/pr-<n>`, or `origin/main` for a merged pull request. It exits 1
  when any repo fails.
- `refresh merge-resolved` lists the files a merge commit in the window
  lists under `# Conflicts:`, leaving out one the window leaves unchanged.
- `refresh gaps` lists the files a pull request changes with no
  `.review.json`, from `.prs/<repo>-<pr>.json`, which `gh` writes.
- `refresh scope` pulls, then sorts the refresh into lists A (changed), B
  (open items in unchanged files), C (merge-resolved) and D (gaps) per
  repo. It prints a summary; `--json` gives the lists. `--write-snapshot`
  records the window in `.review-meta.json` and clears the findings of
  the files in lists A and C.
- `file-diff` prints one file's blocks from the review's cached pull
  request diff, `.diffs/<repo>.diff`, or from a diff piped in with
  `--stdin`. It refuses when there is no cached diff.

```bash
tim review start EUDPA-1234
tim review prepare EUDPA-1234 --select
tim review prepare EUDPA-1234
tim review prepare --branch feat/tidy-logs --desc "Tidy the logs"
tim review prepare --local trade-imports-stub feat/tidy-logs --files src/Main.java
tim review start --local trade-imports-stub feat/tidy-logs
```

- `start` prints `MODE: REFRESH` and the `refresh scope --write-snapshot`
  envelope when the review has a `review-index.md`. Otherwise it prints
  `MODE: FRESH`, makes the review's `.raw` folder and names the
  `gh search prs` command that fills it. With `--local` it prints
  `MODE: FRESH` and runs `prepare --local`.
- `prepare` reads what `gh` saved: `.raw/prs.json` from `gh search prs`,
  `.raw/<repo>.json` from `gh pr view`, `.prs/<repo>-<pr>.json` from
  `gh api .../files` and `.diffs/<repo>.diff` from `gh pr diff`. `--select`
  prints the pull request to save for each repo, as `<repo> <number>`.
  Without it, prepare writes `ticket.md` from Jira and Confluence (or from
  `--branch` and `--desc`), clones each pull request's merge commit (or
  head) into `repos/`, writes `.review-meta.json`, the best-practices
  bundles, the file review placeholders and the per-repo stubs, then
  removes `.raw`. `--json` gives the meta.
- `prepare --local` needs no Jira or GitHub. It lists the files the branch
  changes since its merge-base with main, plus staged and unstaged files,
  or takes `--files`, and writes the same workspace under
  `workareas/reviews/local/<repo>/<branch>`.

### `tim style` — the code-style skill's helpers

```bash
tim style file add EUDPA-1234 --repo trade-imports-stub --file src/a.js --line 4 --rule 6 --category naming --severity WARN --issue "Abbreviated name" --fix "Spell it out"
tim style file verdict EUDPA-1234 --repo trade-imports-stub --file src/a.js --verdict MINOR_ISSUES --reason "One long line"
tim style aggregate EUDPA-1234 --repo trade-imports-stub --write-items --section file-summary
tim style items list EUDPA-1234 --filter fix --status not-done --by-file --json
tim style items mark EUDPA-1234 --repo trade-imports-stub --item 3 --disposition Fix
tim style items status EUDPA-1234 --repo trade-imports-stub --item 3 --status Done --note abc1234
tim style items counts EUDPA-1234
tim style items render EUDPA-1234 --repo trade-imports-stub
tim style reconcile EUDPA-1234 --repo trade-imports-stub --dry-run
```

- They read and write `workareas/code-style-reviews/<review-id>/` in the
  workspace tim runs in, as `tim review`'s same-named commands do under
  `workareas/reviews/`.
- Style findings have a rule, a FAIL or WARN severity and, on items, an
  optional category; the line is stored as text and may be empty. The
  dispositions are Fix, Won't Fix, Discuss and Auto-Resolved.
- `items list` prints one tab-separated line per item (repo, id, file,
  line, rule, severity, issue, fix, disposition, status, notes).
  `--by-file` prints the items grouped by repo and file as JSON instead.
- `items mark` and `items status` end their line with `, Notes set` only
  when `--note` is given.
- `file verdict` takes COMPLIANT, MINOR_ISSUES or NEEDS_WORK.
  `aggregate`'s File Analysis Summary counts FAIL and WARN.
- `--json` gives the envelope: the items, or the groups, for `items list`,
  the review id, repo, breakdown and total for `items counts`, each file's
  rollup for `aggregate`, the summary for `reconcile`, and what was written
  for the others. Every refusal exits 1.

### `tim ticket` — the ticket skill's helpers

```bash
tim ticket prepare-plan EUDPA-1234 --repos trade-imports-stub,trade-imports-animals-frontend
tim ticket prepare-implement EUDPA-1234
tim ticket branch EUDPA-1234 --repo trade-imports-stub --slug tidy-logs --type chore
```

- `prepare-plan` writes `workareas/ticket-planning/<ticket>/ticket.md`
  (the ticket, its comments and the Confluence pages its description
  links to) and `.plan-meta.json`. With `--repos` it also detects each
  repo's technologies and writes `best-practices/<repo>.md`. It reads
  `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`. A ticket it cannot read
  exits 1.
- `prepare-implement` checks `plan.md` is there (exit 1 if not), detects
  the technologies again for the repos `.plan-meta.json` names, or for
  `--repo` alone, and writes `.implement-meta.json`. Prior pull request
  diffs come from `gh`, as `references/IMPLEMENTOR.md` says.
- `branch` fetches origin, checks out and fast-forwards `--base` (default
  `main`), then switches to `<type>/<ticket>-<slug>`: the local branch,
  else one tracking `origin/<branch>`, else a new one. `--type` is `feat`
  (the default), `fix` or `chore`. A git step that fails exits with git's
  code and message.
- The ticket must start with `EUDPA-` (`branch` also takes `NO_JIRA`), and
  a refused ticket or `--type` exits 2.

### `tim capture` — photograph a running app

Runs an app's own FIT suite with Playwright tracing on, keeps the traces under
the workarea, and says which of the journey's pages the suite reached.

```bash
tim capture shared/my-programme --app animals-frontend          # run the suite, keep the traces
tim capture shared/my-programme --app animals-frontend --json   # the same, as one JSON line
```

The workarea's `capture.json` names each app it can capture. Each entry gives
the `repo` the app lives in, the `fitScript` that runs its FIT suite, the
Playwright `projects` to run, the `flow` module the journey's pages are
declared in, and the `pagePath` those pages are served under — a URL template
ending in `{slug}`, such as `/notifications/{journeyId}/{slug}`.

```json
{
  "apps": {
    "animals-frontend": {
      "repo": "repos/trade-imports-animals-frontend",
      "fitScript": "test:fit",
      "projects": ["chromium"],
      "flow": "src/server/app/flow.js",
      "pagePath": "/notifications/{journeyId}/{slug}"
    }
  }
}
```

Traces land in `<workarea>/traces/<app>/<sha>/`, one folder per commit, beside
a `manifest.json` (what ran, when, and how it exited) and a `coverage.json`
(every page in the flow, and whether a trace reached it). A capture never
writes over one that is already there: the sha names the folder, so re-running
at the same commit is refused rather than silently replacing the evidence.

The gap list is the point. The suite is the app's own, so a page it never
visits is a page nothing photographs — and those are the pages still needing a
spec before the app is fully captured. `tim capture` names them rather than
reporting a clean run over partial evidence.

The command reads the flow module before the suite starts, so a `capture.json`
naming the wrong flow is refused in a second rather than after a browser run.
Playwright has to be installed in the app's own repo; the suite is run there,
not here.

### `tim backlog` — programme backlogs

One writer core over any registered programme, through the profile the
programme names — `requirements-v2` for a DESIGN section 3.4 requirements
atom set.

```bash
tim backlog registry list --json                 # every registered programme, its profile and workarea
tim backlog registry show fixture-requirements    # one programme's resolved paths
tim backlog ingest fixture-requirements --dry-run --json  # assemble backlog.json from item files
tim backlog ingest <programme> --increments       # ingest requirement increments (requirements-v2 only)
tim backlog ingest <programme> --replace          # rebuild ids from scratch; refuses while any row is ruled or started
tim backlog ingest <programme> --op-id r1:inc-001:1:plan:t1:ingest --json   # replaying the same --op-id is a no-op that prints the original result
tim backlog ingest <programme> --expect-sha <sha256> --json                # refused with exit 3 if backlog.json has changed since
tim backlog state set <programme> inc-001 phase --value '"plan"' --json    # set one field on one increment's build/state.json entry (requirements-v2 only)
tim backlog state note <programme> inc-001 --file note.txt --stage plan --json  # append one note to build/journal.jsonl
tim backlog rule <programme> q-house-rules-source --option A --by sam --at 2026-09-21T10:00:00Z --words "..." --note "..." --json  # record and apply a ruling (requirements-v2 only)
tim backlog rule <programme> q-house-rules-source --by default --at 2026-09-21T10:00:00Z --json   # apply a defaulted question's default at once
tim backlog rule <programme> q-house-rules-source --option B --supersedes d-005 --by sam --at 2026-09-21T10:00:00Z --words "Move to option B." --note "..." --json  # reverse a decision in force, naming it with --supersedes
tim backlog rule <programme> q-house-rules-source --option B --by sam --at 2026-09-21T10:00:00Z --words "maybe B?" --note "..." --json  # a hedge in --words is recorded tentative, not applied; --supersedes is not used here
tim backlog question check-page <programme> --page design/decisions-for-sam.md --json  # check the hand-written decisions page's ids, defaults and blocked increments against backlog.json
```

Four commands work on any workarea's `backlog.json` in the one backlog shape,
with no registration. The shape is defined by
`.claude/skills/requirements-pipeline/references/backlog.schema.json`, which
`check` reads from the workspace at runtime and validates against; it then checks
what a schema cannot say (every dependency is in the backlog, no cycle, no
duplicate id, the theme rules, and every `externalDependsOn` row is in its own
workarea's backlog). The requirements-pipeline skill's DISTIL and BUILD phases
and the build loop use them:

```bash
tim backlog check shared/my-programme --json     # the shape, dependencies, cycles, recipe fields and themes; exits 1 when out of shape
tim backlog next shared/my-programme --json      # the next buildable id, or NONE; an externalDependsOn row must be done in its own workarea
tim backlog set shared/my-programme inc-004 --commit abc1234 --status done --json   # record build state
tim backlog set shared/my-programme inc-004 --pr '{"repo":"frontend","url":"https://github.com/DEFRA/x/pull/9"}' --json
tim backlog set shared/my-programme inc-004 --attempt '{"stage":"ladder","reason":"ladder-red","at":"2026-10-30T11:00:00Z","planReviewed":true,"work":{"kind":"wip","branch":"feat/EUDPA-900-x","sha":"abc1234"}}' --json
tim backlog set shared/my-programme inc-004 --attempt none --json   # the next run builds it from the top
tim backlog split shared/my-programme --json     # a dry run: one backlog per theme, and the landing order
tim backlog split shared/my-programme --write --branch-prefix feat/EUDPA-123-plants --json
tim backlog split shared/my-programme --theme origin-pages --json          # a dry run: split one ready theme off early
tim backlog split shared/my-programme --theme origin-pages --write --json  # its rows leave backlog.json, which keeps a splitOff pointer
tim backlog move shared/my-programme inc-009 --before inc-004 --write --json   # reorder: the build takes the first buildable row in file order
tim backlog add shared/my-programme --from inc-012.json --after inc-004 --write --json   # add a row; refused if it puts the backlog out of shape
tim backlog notes shared/my-programme inc-004 --json                            # list a row's notes, numbered from 1
tim backlog notes shared/my-programme inc-004 --replace 3=note.txt --remove 6 --write --json
```

`move`, `add` and a `notes` edit are dry runs unless given `--write`.

`set --attempt` records how far a failed attempt at an increment got, so the
build loop's next launch restores its work and re-enters the pipeline at that
stage instead of planning and implementing the row again. Recording a `--commit`
clears it: a landed row has no attempt in flight.

`split` takes a backlog with `themes` and writes one backlog per theme at
`workareas/<workarea>/themes/<theme id>/backlog.json`, plus
`workareas/<workarea>/themes/themes.json`. Each split backlog carries the
parent's envelope (its programme suffixed with the theme id), only the repos
its rows use, its `theme`, `branch` (default `feat/NO_JIRA-<programme>-<theme id>`;
`--branch-prefix` replaces the part before the theme id), `parent` (the parent
workarea, its landing wave and the themes it lands after) and `touches`, and
only its own rows. A `dependsOn` on another theme's row becomes an
`externalDependsOn` on that theme's workarea; one on a row in no theme points
at the parent. `themes.json` lists each theme's id, title, workarea, branch,
wave, row count, `dependsOn` and `touches`, every cross-theme row dependency,
the rows in no theme, and the landing order as waves: themes in one wave have
no ordering need between them and build in parallel.

It is a dry run unless given `--write`. It checks the parent and every split
backlog first, and writes nothing if any fails (exit 1). It writes only the
files that change, so a second run changes nothing. On a re-split, a row whose
split copy the build loop has built or set aside (any status but `todo` or
`blocked`) is kept as it is; a `todo` or `blocked` row is refreshed from the
parent, keeping the ticket, branch, commit, pull requests, notes and open
questions written on the split copy. It refuses, writing nothing, when the
parent now puts a built row in another theme or in none.

A programme is registered in `tools/backlog/registry.json` — including
`fixture-requirements`, the tracked fixture this file's own tests re-ingest on
every run. `tim backlog registry list` reports what it holds.

`tim backlog ingest`, `state set`, `state note` and `rule` (requirements-v2
only) all go through the same write-safety core: `--op-id` makes a call
idempotent (a replay returns the first result and writes nothing), and
`--expect-sha` refuses a write whose target changed underneath it. Both exit
3 (`LOST_UPDATE`) on a stale `--expect-sha` and 4 (`LOCKED`) when another
process holds the write lock after every retry.

`tim backlog standards` lists what a task must read before it changes a file
or a repo, resolved from the working tree at the time you run it:

```bash
tim backlog standards --files plants-frontend:src/server/app/sets/high-risk-plants/journeys/linear/features/origin/controller.js --json
tim backlog standards --repo-level trade-imports-animals-frontend --json
tim backlog standards --lint      # every rule and routing path in the workspace resolves
```

Each entry lists the matching `.claude/rules` files, the code-style or review
routing's `bestPractice` files, `repoDocs`, the `CLAUDE.md` chain with its `@`
imports, and the memory index, each with its blob sha. `repoDocs` are the
repo's own docs, as `~/` paths, and only files that exist:

1. the file's topics' `repoRelativeBestPractice` from the code-style routing
   (for example `src/server/app/docs/validation.md` for a controller)
2. `src/server/app/docs/` `architecture.md`, `features.md`, `flow-and-gates.md`,
   `journey-flow-and-gates.md` and every `add-a-*.md` recipe
3. `src/server/app/sets/<set>/docs/` `README.md`, the same named docs and its
   recipes, for the set that holds the file, or for every set when the file is
   in none or the entry is for the whole repo

A file's rules come from the `.claude/rules` folders on its own folder's
ancestor chain only, never a whole-workspace scan, so stale copies under
`workareas/` or `.claude/worktrees/` never apply. A symlinked `.claude` (such
as `docs/.claude`) is skipped, so the root rules are not counted twice.
`--lint` walks every `.claude/rules` folder, skipping `node_modules`, `.git`,
`workareas`, `.claude/worktrees` and dot-folders other than `.claude`.

A rule points at the docs it needs in the list items of its body:

1. A list item is a line starting `- ` plus its indented continuation lines.
   Paragraph text and fenced code are never read for pointers.
2. The backticked token after `Topic dir:` is the rule's base folder, and must
   end with `/`.
3. Every other backticked token that ends in `.md`, after one level of brace
   expansion (`a/{b,c}.md`), is a pointer.
4. A pointer or Topic dir starting `~/git/defra/trade-imports-workspace/` is
   workspace-relative. Any other pointer resolves against the Topic dir, or the
   rule's own scope root when it has none.
5. The resolved paths, without repeats and in the order they appear, are the
   rule's `pointsTo`.

A repo key can be the full key (`workspace`, a folder under `repos/`, or a
programme's backlog key with `--programme`) or a short form that names one
repo: `plants-frontend`, `plantsFrontend` and `trade-imports-plants-frontend`
all name `repos/trade-imports-plants-frontend`. An unknown or ambiguous key
exits 2 and names the keys you can use. A `--files` path need not exist yet,
so a plan can name a file it will create, but it must be relative and stay
inside the repo.

### `tim distil` — the DISTIL files in one workarea

The deterministic steps of the requirements-pipeline skill's DISTIL phase, run
by the distil workflow's agents instead of hand-written `jq`. The workflow is
`.claude/skills/requirements-pipeline/workflow/distil.js`; its README lists
which stage runs which command. Each command
takes a workarea under `workareas/`, reads its `sources.json` and `distil/`
files, and checks them against the schemas beside `backlog.schema.json` in
`.claude/skills/requirements-pipeline/references/` (`sources`, `partition`,
`extract`, `verify`, `areas`, `reconcile-part`, `requirements`, `conflicts`
and `challenge`), read from the workspace at runtime.

Every source is extracted in parts: a characterise agent writes
`distil/extract/<slug>.partition.json`, one agent per part writes
`distil/extract/<slug>.part<N>.json`, and `merge-extract` joins them into
`distil/extract/<slug>.json`. Reconcile is cut into areas the same way: an
area-plan agent writes `distil/areas.json`, `areas --write` gives each area
its working set, one agent per area writes
`distil/areas/<area id>/reconciled.json`, and `merge-reconcile` joins them
into `distil/requirements.json` and `distil/conflicts.json`. Each question
conflict is then challenged, one verdict per file in `distil/challenge/`.

```bash
tim distil status shared/my-programme --json        # every source's state and what it needs next: the work list
tim distil check shared/my-programme --source repo:tests --stage partition --clear-parts --json   # the partition, then remove old extract parts
tim distil check shared/my-programme --source repo:tests --stage extract --part 2 --json           # one extract part file, against the partition
tim distil merge-extract shared/my-programme --source repo:tests --json   # join the extract parts into the extract and stamp its scope hash
tim distil check shared/my-programme --source repo:tests --stage extract --chunk 60 --json   # the extract, its parts and verify ranges
tim distil check shared/my-programme --stage all --json                                     # every source, both stages
tim distil check shared/my-programme --source repo:tests --stage extract --clear-parts --json   # and, once it passes, remove old verify parts
tim distil reset shared/my-programme --source repo:tests --json          # move a source's extract and verify files aside, so it is extracted again
tim distil reset shared/my-programme --all --json                        # every source
tim distil reset shared/my-programme --stage reconcile --json            # keep every extract; move requirements, conflicts, areas, verdicts, backlog and report aside
tim distil stamp shared/my-programme --source repo:tests --json          # record the source's scope hash in its extract
tim distil merge-verify shared/my-programme --source repo:tests --json   # join verify parts into one file with the extract's hash, then remove them
tim distil adopt shared/my-programme --source repo:tests --json          # take on a source distilled by hand: record both hashes
tim distil working-set shared/my-programme --write --json   # held plus missed claims, to distil/working-set.json
tim distil areas shared/my-programme --json                 # check distil/areas.json: every claim in an area, every existing id in one
tim distil areas shared/my-programme --write --json         # each area's working set, and clear the last reconcile's area files and verdicts
tim distil areas shared/my-programme --area origin --json   # one area's reconciled requirements, and those still to build
tim distil areas shared/my-programme --requirements --json  # every area's, and the requirements no area holds
tim distil merge-reconcile shared/my-programme --area origin --json   # check one area's reconciled.json, writing nothing
tim distil merge-reconcile shared/my-programme --json       # join every area into requirements.json and conflicts.json
tim distil challenge shared/my-programme --json             # the question conflicts to challenge, and the verdicts written
tim distil challenge shared/my-programme --conflict c-002 --json   # check one verdict
tim distil challenge shared/my-programme --clear --json     # remove every verdict
tim distil coverage shared/my-programme --json      # requirements and conflicts against the working set, sources, verdicts, and the backlog
tim distil backlog-snapshot shared/my-programme --save before --json        # keep the row ids and the rows built or set aside
tim distil backlog-snapshot shared/my-programme --compare-to before --json  # rows removed, and rows built or set aside that changed, since
tim distil trace shared/my-programme --source trace:ched-p --folder part2 --out actions.txt --json -- actions   # playwright trace, in a sub-folder of the source's .work folder
```

A source's state is `pending` (no extract), `extracted` (no verification),
`verified`, `stale` (its kind, locator or scope changed since it was
extracted, the extract records no scope hash, or its claims changed after they
were verified) or `invalid` (a file out of shape). `next` says what it needs:
`extract`, `verify` or nothing. A relaunch skips every verified source whose
scope hash and extract hash are unchanged. `reset` is how to extract one again
anyway: it moves the source's extract, partition, parts and verify files to
`distil/superseded/<time>/`, keeping them, and the source reads `pending`.

`check --stage partition` checks the partition alone: its parts numbered 1 to
n, no two sharing a prefix, no old claim id kept by two. `check --stage
extract` also checks every part file against `extract.schema.json` and its
prefix, that every part has its file and no file is outside the partition, no
claim id is in two parts, and that the extract is exactly its parts merged.
`--clear-parts` removes the part files the next stage writes: extract parts
after the partition stage, verify parts after any other.

`reset --stage reconcile` is how to reconcile from nothing after the
reconcile or consolidate method changes: it keeps every verified extract and
moves `requirements.json`, `conflicts.json`, the working sets, `areas.json` and
`distil/areas/`, `distil/challenge/`, the backlog snapshots, `backlog.json` and
`report.md` to `distil/superseded/<time>/reconcile/`. It refuses while a
backlog row has build work on it. A normal re-distil keeps every id and needs
no reset.

`areas` refuses a claim in no area, a slice whose source is not verified or
whose part or claim does not exist, a range that runs backwards, an area with
no claim, and an existing requirement or conflict in no area or two.
`merge-reconcile` refuses an area with no file, an id that is not the area's
(`req-<area>-NNN` new, or an existing id the area owns), an existing id left
out, a claim outside the area's working set, and a conflict nobody can find; it
numbers new ids on from the highest and writes `distil/areas/id-map.json`.
`coverage` refuses a verified source that backs no requirement or conflict
(its held claims were never weighed), a challenge verdict out of shape or not
applied, `blockedBy` on a requirement that is not adopted, and a todo row that
covers a blocked requirement. It reports each source's cited claims and every
blocked requirement.

`check`, `merge-extract`, `merge-verify`, `merge-reconcile`, `areas`,
`challenge --conflict`, `adopt` and `coverage` exit 1 (`LINT`) and name every
problem when anything is out of shape; `merge-extract`, `merge-verify`,
`merge-reconcile` and `adopt` then write nothing. With `--json`, `coverage`
also lists each problem in `errors[0].problems` with its scope, `reconcile` or
`backlog`, so the workflow routes it to the step that can fix it.

`trace` takes tim's options first, then `--`, then the `playwright trace`
subcommand. It runs in `distil/extract/<slug>.work/`, or with `--folder` in a
sub-folder of it, so a trace opened there belongs to that agent: part and
verify agents reading one source side by side never open over each other's
trace. Playwright cannot read a trace recorded by a newer version of itself,
so `open` reads the version the trace recorded and picks a Playwright at least
that new: tim's own (pinned to the newest the workspace repos use), else the
newest a cloned repo has installed. The folder records the choice, so every
later subcommand uses the same one. A trace newer than any of them is refused
with `MISSING_DEP` and the command that updates tim's.

### `tim docker` — run the workspace stack

```bash
tim docker up                        # start the stack from published Dockerhub images
tim docker up -b feat/EUDPA-123-x    # run each service's branch-tagged image where one exists
tim docker dev                       # build the repo-backed services from local source
tim docker up -e backend             # leave the backend out, to run it with tim start backend
tim docker restart -d                # stop the stack, wipe its volumes, start it from source
tim docker bounce-backend            # recreate the backend container only
tim docker logs [services...]        # follow service logs (Ctrl-C to stop)
tim docker owner                     # print the clone that owns the stack
tim docker down                      # stop the stack and wipe its volumes
```

`up`, `dev` and `restart` take `scripts/stack/run-stack.sh`'s flags: `-b`,
`-e`, `--profile`, `-d` and `--perf`. Run `tim docker up --help` for the full
list.

`tim start <service>` runs one service from source in the foreground:
`frontend`, `backend`, `admin`, `gateway`, `address-book`, `ins-backend`,
`plants-frontend` or `plants-backend`.

### `tim docker lease` — who holds the workspace stack

The workspace stack is one compose project per machine. A build run takes
one lease, held as its run id alone (such as `ibl-20261001T150000Z`), when
it starts; every stage and gate in the run passes that same `--holder`, so
each reuses the run's stack; the run gives the lease back when it ends. A
stack is never left up with nobody owning it.

```bash
tim docker lease acquire --holder "ibl-20261001T150000Z" --json  # start it, or reuse your own
tim docker lease release --holder "ibl-20261001T150000Z" --json  # take down what you started
tim docker lease status --json                                                    # up or down, and who holds it
```

- `acquire` on a stack that is down records the lease, then starts it
  (`run-stack.sh -d`; `--mode up` for the published images; `--mode perf` for
  the published images with both stubs on a latency profile) and records its
  container ids and, in dev mode, each locally built service's build and
  source fingerprints (what `tim build gate` compares on reuse). On a stack the same holder already leases it reuses it as it
  is, but only when that start finished and the containers are still the ones
  recorded. A start of the holder's own that died part-way (a timeout killing
  `acquire`, say) is taken down and started again; one still running is
  refused.
- `acquire` on a stack leased to anyone else, up with no lease at all (one
  somebody started by hand with `tim docker dev`), or restarted by hand under
  a lease (other container ids), refuses with `STACK_HELD`, naming the holder,
  its mode, its branches and when it took the lease. It never reuses or takes
  down such a stack.
- `release` takes down the stack its holder started, then clears the lease.
  It refuses a lease somebody else holds (`NOT_HOLDER`) and never touches a
  stack nobody leases. A stack restarted by hand under the lease is left up and
  the lease cleared (`FOREIGN_STACK`). When `stop-stack.sh` fails the lease is
  kept.
- A lease whose stack has gone, and whose start is not still running, is stale
  and the next `acquire` replaces it, under a lock (`stack-lease.json.lock`) so
  two processes never both take it over.
- While a lease is held, `tim docker up`, `dev`, `down`, `restart` and
  `bounce-backend` refuse with `STACK_HELD`, naming the holder. Add `--force`
  to go ahead anyway; the holder then refuses to reuse or take down what you
  start.
- Any clone of the workspace may own the one stack. The lease records the
  clone that took it (`workspace`). `acquire` and `release` refuse the same
  holder name from another clone: `acquire` with `STACK_HELD` while that
  stack is up or starting, `release` with `NOT_HOLDER`. Add `--force` to take
  or give back the lease anyway.
- `tim docker up`, `dev`, `down`, `restart` and `bounce-backend` read the
  clone each running container was started from (its
  `com.docker.compose.project.working_dir` label). When that is another clone
  they refuse with `STACK_OTHER_CLONE`, naming it. Add `--force` to go ahead
  anyway. `tim docker lease status --json` gives that clone as `workspace`.
- `tim docker owner` prints the clone that owns the stack: the clone its
  running containers were started from or, while it is still starting, the
  clone on its lease. It prints nothing on stdout when the stack is down.
  `--json` gives `{workspace, source, thisClone, ownedHere}`. Only the owner
  runs local E2E: the tests repo's docker-compose Playwright config, and
  `tim build gate`'s E2E phase, stop with "The stack belongs to <clone>"
  from any other clone. `ALLOW_FOREIGN_STACK=1` skips the Playwright check.

The lease is one file per machine, outside every repo: `TIM_STACK_LEASE`, or
`tim/stack-lease.json` under `XDG_STATE_HOME` (default `~/.local/state`).
`tim build gate` takes the same lease for its E2E phase.

### `tim docker perf` — the stack as a performance target

`tim docker perf` takes the stack lease in perf mode (`--mode perf` on
`tim docker lease acquire` does the same). It starts the published images
with `run-stack.sh --perf`, so both stubs answer at the latency profile in
`STUB_PROFILE` (default `sla`; the other value is `zero-delay`). The lease
records the profile, and `tim docker lease status` says
`perf mode, stubs on sla`. An unknown `STUB_PROFILE` exits 2 before anything
starts. A stack leased to a build, or up with no lease, is refused with
`STACK_HELD`. The holder defaults to `perf` followed by the clone's path,
such as `perf /path/to/your-clone`, and `tim docker
perf` prints the release command to run. The build gate never uses perf mode.

```bash
tim docker perf
STUB_PROFILE=zero-delay tim docker perf --json
tim docker lease release --holder "perf <this clone’s path>"
```

**Running the gate by hand.** `tim build gate --phase e2e` refuses a stack you
started with `tim docker dev`, because nobody leases it. Either run
`tim docker down` first and let the gate start and stop its own stack, or hold
a lease yourself for the whole session:

```bash
tim docker lease acquire --holder "sam manual"
tim build gate shared/my-programme --phase e2e --holder "sam manual"
tim docker lease release --holder "sam manual"
```

### `tim build` — the build loop's deterministic steps

The build loop's start, branch and gate steps, run the same way every time.
Each reads the repos a backlog builds from its envelope `repos` map.

```bash
tim build start shared/my-programme --base main --jira-project EUDPA --epic EUDPA-20628 \
  --in-dev-status "In Dev" --done-status Done --board 13780 --json  # derive, ticket, branch
tim build branch shared/my-programme feat/EUDPA-123-origin --json   # every backlog repo on one branch
tim build gate shared/my-programme --phase unit --json      # unit rungs only
tim build gate shared/my-programme --json                   # unit+FIT (repos at once), then k6 alone, then E2E
tim build gate shared/my-programme --serial --json          # one rung at a time: unit, then FIT, then E2E
tim build gate shared/my-programme --logs /tmp/gate --json  # logs somewhere other than <workarea>/logs/
tim build gate shared/my-programme --phase e2e --holder "ibl-20261001T150000Z" --json
tim build tune                                              # once per machine: time FIT and E2E at 2, 3, 4 workers, save config/machine.json
tim build workers --json                                    # this machine's worker counts, as the gate reads them
tim build push-workflows . --commit 4cd37b9c --json          # which workflows a push of that commit to main starts
```

How hard the gate drives the machine comes from the workspace's gitignored
`config/machine.json`, which `tim build tune` writes (see
[`machine-tuning.md`](../.claude/skills/requirements-pipeline/references/machine-tuning.md)).

`tim build start` starts one increment, in three steps. **Derive**: the
increment `--id` names, or the next buildable one (`--last <id>` stops before
the ticket when the next one is the id the previous attempt built, reporting
`repeat`). **Ticket**: reuse the key on the row, or an open ticket under `--epic` with this increment's exact summary (a create that timed out may have raised one), or raise a Task under
`--epic` with the row's title, detail, acceptance criteria and sources as its
wiki-markup description, and record the key on the row before anything else,
so a retry never raises a second. A status other than `--in-dev-status` is
moved there by an exact-name transition; one already at `--done-status` is
left alone with a warning. Then the ticket is moved onto `--board`, every time.
Jira's agile API answers a partial rejection with 200 and an error body, so
only a 204 counts as moved.
**Branch**: the row's branch, or `<type>/<KEY>-<slug>` recorded on the row,
checked out in each of the increment's repos (a row naming none takes every repo, in `--repos` order when given) (fast-forwarded to what is
pushed), tracked from origin, or cut with `--no-track` from a freshly fetched
`origin/<base>`. A repo with uncommitted work stops it before any repo
changes. The result names `resumeAt` from the row's `commit` and `prs`. A
failure names its step (`failedStep`: `derive`, `ticket` or `branch`) and its
exact reason, and exits 1; nothing buildable is `id: null` and exits 0.

`tim build branch` checks the branch out in each repo where it exists
locally, and otherwise cuts it with `--no-track` from `origin/<branch>` if the
remote has it, else from the repo's default branch. It changes nothing if a
repo it would move has uncommitted work (exit 1, `DIRTY_TREE`, naming the
files). Running it again is a no-op.

`tim build gate` runs the rungs in
`.claude/skills/requirements-pipeline/references/gates.json` for each backlog
repo: the unit rungs, the FIT rungs (each on the first free port at or above
the one gates.json plans for it, passed to its script as `PORT`; a rung that
moves records `{planned, used, heldBy}` in its `ports`, so two clones can run
the same FIT suite at once) and the E2E rungs against
the workspace stack built from local source (`run-stack.sh -d`, the path
`tim docker dev` takes), under a stack lease held as `--holder` (default:
this gate run). It runs in three layers, each starting only once the one
before has finished — passed or not. Layer one is every unit and FIT rung:
each repo's in the order gates.json lists them, while other repos run at the
same time. Layer two is every rung gates.json marks `exclusive` (the k6
performance suite), one at a time with nothing else running, so a
performance test never shares the machine. It goes before the Playwright
E2E so k6 measures a stack the E2E suite has not yet filled with data.
Layer three is the other E2E rungs, one after another. Taking the lease and
starting or refreshing the stack begins straight away, during layer one,
and is finished before layer two starts. Each FIT rung serves on its own port, clear
of the stack's, so FIT runs while the stack is up. `--serial` runs one rung at a time instead —
every unit rung, then every FIT rung, then E2E — to compare against.
Whichever way it runs, `rungs` comes back in plan order. One repo's rungs
never overlap, because its FIT rung builds the frontend into the folder its
unit rungs read. A red or flaky E2E rung leaves each stack container's log
beside its own, as `gate-stack-after-<repo>-<rung>-<container>.log`, written
before the stack goes.

On a Mac the gate stops the machine sleeping until it ends, with
`caffeinate -s -i` waiting on the gate's own process. A Mac nobody is using
falls asleep and then keeps waking for a few seconds of maintenance and
sleeping again. Each sleep freezes the Docker VM, the stack and Playwright
together, so pages that answer in a quarter of a second take several, and
the long cross-service E2E tests run out of time. Holding a sleep assertion
is the fix, not a longer timeout. If `caffeinate` cannot start, the gate says
so on stderr and carries on.

If the stack was down, the gate starts it, leases it and always releases it
afterwards. If this holder already leases it, the gate does not start it
again: it rebuilds only the services whose image inputs changed, restarts
only those whose bind-mounted `src/` changed (waiting until each is healthy),
and leaves the rest — see `docker/stack/AGENTS.md` for the fingerprints. A
stack leased to anyone else, or up with no lease, is refused and left alone:
`stack.held` names the holder (null
for no lease) and the reason. Each rung writes to `gate-<repo>-<rung>.log`;
nothing streams. A rung that cannot run fails with its reason.

The result is `{green, phase, serial, logs, durationMs, phases, layers,
rungs, stack}`: `durationMs` is the gate's own wall-clock time,
`phases.<unit|fit|e2e>.durationMs` each phase's (for E2E, the E2E rungs plus
any wait for the stack that ran on past layer one), and
`layers.local`, `layers.performance` and `layers.e2e` (each `{durationMs}`)
the time to the end of layer one, the exclusive rungs, and everything else
after layer one (other E2E rungs, any wait for the stack, taking it down). `stack.refresh` is null unless the stack was reused, then
`{ok, rebuilt, restarted, left, rebuildLog, restartLog, reason}`. The
command exits 1 unless every rung passed. gates.json refuses any rung that names a remote or
CDP script. The tests repo's E2E is one `e2e` rung that runs its whole suite; a
machine that times out under the full stack sets `PLAYWRIGHT_WORKERS` (e.g. 2
on a 16 GB machine) in its shell profile.

A rung whose `run` is `tim build duplication` or `tim build coverage` runs that
command in the rung's folder, in the unit phase. Every repo in gates.json has a
duplication rung; a repo whose suite writes a coverage report has a coverage
rung too, straight after the rung that writes it.

### `tim build duplication` — test code a branch copies

```bash
tim build duplication trade-imports-plants-frontend --json   # a folder under repos/, or a path
tim build duplication . --base origin/main                   # the default base
```

Finds blocks of 10 or more lines (and 50 or more tokens) copied between test
files: `*.test.js`, `*.fit.spec.js`, `*.spec.ts`, `*IT.java` and
`*Test.java`. It scans every test file in the repo with
[jscpd](https://www.npmjs.com/package/jscpd), a tim dependency, and keeps a
block only when one side is a test file changed since `--base` (committed or
not) and `--base` does not already have the copy. So a clone already on
`origin/main` never fails a branch. Set-up used by two tests belongs in the
shared test helper.

The result is `{base, minLines, minTokens, changedTestFiles, clones}`. Each
clone is `{lines, tokens, first, second}`, and `first` and `second` are
`{file, startLine, endLine}`. It exits 1 with `DUPLICATION_FOUND` when it
finds a clone, and 2 when `--base` does not exist.

### `tim build coverage` — how much of what a branch adds its tests cover

```bash
tim build coverage trade-imports-ins-frontend --json   # a folder under repos/, or a path
tim build coverage . --base origin/main --floor 90     # the defaults
```

Measures what a SonarCloud `new_coverage` condition measures, locally and
before the push rather than after it: every line and condition added since
`--base`, committed or not, that the repo's own coverage report knows about,
covered over coverable. It reads the report the suite has already written —
`coverage/lcov.info` for a Node project, `target/site/jacoco/jacoco.xml` beside
each `pom.xml` of a Java one, each found beside its own manifest so a
sub-project such as `tim/` is read in its own folder — and runs no test itself.

It applies the project's own Sonar properties, from
`sonar-project.properties` or a pom's `<sonar.*>` properties: a file must be
under `sonar.sources` where that is set, and out of `sonar.exclusions`,
`sonar.coverage.exclusions` and `sonar.test.inclusions`. Without them the
number counts files the gate never measures — a FIT helper, say — and reads
far below the gate's own. A changed file the report does not name at all, such
as a test, is left out either way.

The result is `{base, floor, reports, measuredAt, files, toCover, met, percent,
floorMet}`, and each file is `{file, lines, covered, conditions,
coveredConditions, uncovered}`. It exits 1 with `COVERAGE_UNDER_FLOOR` below
the floor, naming every uncovered line, and 2 when no report has been written
or `--base` does not exist.

`measuredAt` is when the report was written, and the text output says so: a
narrow test run (`npm test -- one.test.js`) overwrites the report with just
that run's files, so the number is the whole repo only when the whole suite
wrote it. In the gate the rung runs straight after the suite, so it is.

### `tim build push-workflows` — which workflows a pushed commit starts

```bash
tim build push-workflows . --commit 4cd37b9c --branch main --json
tim build push-workflows trade-imports-ins-tests --commit origin/main
```

Reads the repo's `.github/workflows` files as they are at the commit, and the
files the commit changes from its first parent. A workflow starts when it has a
push trigger whose `branches`, `branches-ignore` and `tags` filters let the
branch through, and whose `paths` or `paths-ignore` match at least one changed
file. `!` patterns count in order, as GitHub reads them. It reads local git
only, so fetch the commit first.

The result is `{commit, branch, changedFiles, workflows, starts}`. Each
workflow is `{file, name, starts, reason}`, where `name` is what GitHub calls
its runs (the workflow's `name`, else its path), and `starts` lists those
names. It always exits 0. The build loop's merge stage uses it to tell a merge
that starts no workflow, which has nothing to watch, from a run that has not
started yet.

### `tim spec diff` — what commits changed in the Behaviour Spec

```bash
tim spec diff --commit 575f5f3c --json
tim spec diff --commit e310d0af --commit 72fb2eda
tim spec diff --range main...HEAD
```

Compares each commit with its first parent under `openspec/specs` and
`openspec/coverage`, scenario by scenario: `added`, `changed` (its name or
steps), `removed`, or `coverage` (only its `coverage.json` entry changed). Each
scenario carries its coverage after the commit. `--range base..head` compares
base with head, and `base...head` compares their merge base with head; each
range is reported under `result.ranges`. A commit or range git cannot find is
listed under `skipped`. `result.touched` is every scenario id the commits and
ranges added, changed or re-proved. The build loop uses it to tell a theme's own
unproven scenarios from older ones, and to write each row's spec-diff Jira
comment.

#### `--signed-off` — changes that need a person's decision

```bash
tim spec diff --signed-off --range origin/main...HEAD
tim spec diff --signed-off --repo trade-imports-plants-frontend --base origin/main --json
tim spec diff --signed-off --uncommitted --repo trade-imports-plants-frontend --repo trade-imports-ins-tests --base origin/main --json
```

With `--signed-off`, the report holds only changes to signed-off scenarios (a
scenario with a `**Signed off**: <date>` line). From `--commit` and `--range`
it reports a scenario that is:

| Change     | Why it counts                                    |
| ---------- | ------------------------------------------------ |
| `added`    | It is new and already marked signed off          |
| `changed`  | It was signed off, and its name or steps changed |
| `removed`  | It was signed off, and it is gone                |
| `unmarked` | Its Signed off mark was taken away               |

Marking an existing scenario signed off is a promotion, reviewed in its own
pull request, so it does not count.

`--uncommitted` makes the same comparison between HEAD and the workspace's
working tree under `openspec/`, new files included. The build loop uses it on
each row's spec sync before the row is committed.

`--repo <name> --base <ref>` reads the files changed in `repos/<name>` against
`<ref>`, committed and uncommitted. It reports `test-edited` or `test-deleted`
for each signed-off scenario in the workspace's `openspec/` whose test, linked
by `repo`, `file` and `test` in `coverage.json`, changed. A new file does not
count. Repeat `--repo` to check several repos against the same `--base` in one
report.

It compares the linked test's own block, at the merge base and now, and
ignores changes to other tests in the same file:

| Linked test                                         | Reported                                 |
| --------------------------------------------------- | ---------------------------------------- |
| Its block is the same, bar trailing spaces          | Nothing                                  |
| Its block changed                                   | `test-edited`                            |
| Its title is gone, renamed included, or its file is | `test-deleted`                           |
| It can't be found on its own                        | `test-edited` for any change to the file |

A block is a JavaScript or TypeScript `test`, `it` or `describe` call titled
with a plain string, or a Java test method by name or `@DisplayName`, with its
annotations. A test can't be found on its own when its link names no test, its
title names several tests, it wasn't in the file before the change, or the
file can't be read; `why` then says so. `test.titles` lists only the linked
tests that changed.

A change to shared set-up, such as a `beforeEach` or a helper, that alters a
linked test without touching its block is not reported.

The scenario's links come from the workspace's working tree, so a scenario
removed in the same change is caught by `--commit` or `--range`, not by
`--repo`.

With `--signed-off`, a `--range` whose base or head git cannot find, or that
is not a range, is an error rather than `skipped`, so a missing fetch never
reads as nothing changed.

`result.signedOff` lists each change with its scenario id, name, capability,
`change`, `why`, `foundIn` (the commit, range, or repo and base), the test file
and titles for a test change, and the scenario's name and steps `before` and
`after`. `result.ticketDraft` is a plain-English Jira ticket, `summary` and
`description`, saying which signed-off behaviour changes, from what to what, for
a person to approve or refuse. It is `null` when nothing is found.

| Exit code | Meaning                                                |
| --------- | ------------------------------------------------------ |
| 0         | No signed-off scenario changes                         |
| 3         | At least one signed-off scenario changes               |
| 2         | A usage error, or a range, repo or base it cannot find |

A missing `git` also exits 3. Read `ok` in the `--json` envelope to tell the
two apart.

### `tim build run-jobs` — whether every job of a run has passed

```bash
gh api repos/DEFRA/trade-imports-plants-frontend/actions/runs/123/jobs?filter=latest > jobs.json
tim build run-jobs trade-imports-plants-frontend --commit 4cd37b9c --workflow .github/workflows/publish.yml --jobs jobs.json --json
```

A run's own status can stay in progress after its jobs have finished. This
judges the jobs instead: each must be completed with success or skipped, and
each job the workflow file defines at the commit must have a job in the run.
A matrix job counts by its name and a suffix. A job that calls a reusable
workflow needs a job named `<its name> / …`, every job of that workflow when
it is in the same repo, or one skipped job of its own name. tim reads the
saved file and local git only: it never calls GitHub itself.

The result is `{workflow, commit, green, declared, missing, notPassed, jobs}`.
It always exits 0. The build loop's merge stage uses it for a base-branch run
still showing in progress after its watches.

### `tim build probe` — does a test witness a line

```bash
tim build probe trade-imports-plants-frontend src/server/app/origin/controller.js \
  --line 42 --test-file src/server/app/origin/controller.test.js --json
tim build probe . tim/src/build/gate.js --search "exitCode === 0" --replace "exitCode !== 0" \
  --json -- npm --prefix tim test -- src/build/gate.test.js
```

Blanks out one line of a production file (`--line`, counting from 1), or
replaces text that appears exactly once (`--search` with `--replace`). Then
it runs the test, writes the file back byte for byte, checks git shows no
change to it, and runs the test again. Give the test as `--test-file` or as a
command after `--`, with every option before the `--`. `--test-file` runs a
`*.test.js` through `npm test -- --no-coverage`, a `*.fit.spec.js` through
`test:fit:ci`, and a Java class through `mvn verify` with `-Dtest`,
`-Dit.test` and `-Djacoco.skip=true`: one class never meets the project's
coverage threshold, so the check would fail the run whatever the test did.

The result is `{file, inversion, redWhenInverted, greenAfterRestore, restored,
logs}`. `redWhenInverted` true means the test failed without the line, so it
witnesses it. False means it does not: the line is dead, or the test checks
something else. Use it as review evidence, not as a gate. `greenAfterRestore`
false means the test was failing before the probe. A run that takes longer
than `--timeout-seconds` (default 270) counts as failed. The probe refuses a
file with uncommitted changes (`DIRTY_TREE`), so commit first. It exits 1
only when it could not put the file back (`NOT_RESTORED`). Logs go to
`--logs`, or `workareas/build-probe/` in the workspace.

### `tim build runs archive|report` — what each run cost

Keeps the full transcripts of workflow runs and reports what each stage cost
and how long it took, so build-loop runs can be compared over time.

```bash
tim build runs archive wf_850da050-87a          # one run, by id or transcript folder path
tim build runs archive --all                    # every run Claude Code still holds for this workspace
tim build runs report wf_850da050-87a           # run → increment → stage → agent table
tim build runs report wf_850da050-87a --json    # the same, for mining
tim build runs report --all --session <id>      # one line per run, then each stage across them
tim build runs report --all --workflow all      # every workflow, not only increment-build-loop
```

`archive` copies a run's `journal.jsonl`, every agent's transcript and
`.meta.json`, the run's own record (`<session>/workflows/<runId>.json`: args,
`log()` lines, result, per-agent progress) and any subagents its agents
started, into `workareas/build-telemetry/runs/<runId>/`, and records the run in
`workareas/build-telemetry/index.json`. It only reads `~/.claude`. Running it
again copies only files that changed, so archiving a run while it is still
going, then again after it stops, is safe. A run with no record yet is indexed
as `unfinished`.

The archive lives under `workareas/` because git ignores it — transcripts hold
prompts, code and private context, and this repo is public — and outside
`~/.claude`, which deletes session folders after `cleanupPeriodDays` (30 days
unless set).

`report` reads only the archive. Tokens are summed once per model request from
each transcript: `input`, `output`, `cache write` and `cache read`, with
`total` the sum of all four, so cache reads dominate it. An agent's own
subagents count towards it. A stage's time is the span from its first agent's
start to its last one's end, so parallel reviewers are not double counted; the
JSON also carries `agentMs`, the sum. The increment and stage come from the
agent's label (`inc-004 review:frontend` → `inc-004`, `review`); agents with no
increment id sit under `(run)`.

### `tim jira create|update|attach|link|assign|epics` — the Jira write surface

`tim jira ticket`/`comments` and `epics` are read-only. `tim jira ticket`
gives the ticket's parent, labels, last update time, subtasks and links, each
link read from this ticket's side; `--rendered` adds the description as Jira
renders it to HTML (`renderedDescription` in `--json`). `create`, `update`,
`attach`, `link` and `assign` write to Jira, so they follow one rule: **dry
run by default, a real write needs an explicit `--confirm`** (or, for
`create`, a matching `--confirm <planId>`). Nothing in the `.claude/settings.json`
allowlist stops `tim jira *`, so this contract — not the allowlist — is what
keeps a skill from creating something nobody agreed to.

```bash
tim jira create --from ticket.json --json          # dry run: prints the plan (fields, attachments with sizes, warnings) and a planId
tim jira create --from ticket.json --confirm <planId> --json   # creates the issue, attaches every file, links every `relates`, writes ticket.created.json
tim jira update EUDPA-200 --summary "A clearer title"   # dry run: the fields that would change, and their new values
tim jira update EUDPA-200 --description-file description.txt --confirm  # writes only the fields that differ, then reads the ticket back to check
tim jira update EUDPA-200 --priority High --parent EUDPA-215 --add-label urgent --confirm  # --parent none takes the parent away; --labels a,b replaces the labels
tim jira attach EUDPA-200 diagram.svg notes.md     # dry run: what would be attached
tim jira attach EUDPA-200 diagram.svg --confirm    # attaches for real; --replace re-attaches over an existing filename instead of adding a duplicate
tim jira link EUDPA-200 relates EUDPA-100          # dry run
tim jira link EUDPA-200 relates EUDPA-100 --confirm  # creates the link, then GETs the ticket back to verify it landed
tim jira link EUDPA-200 --blocks EUDPA-300 --confirm # EUDPA-200 blocks EUDPA-300; reads the link back and reports the direction Jira stored
tim jira link EUDPA-300 --blocked-by EUDPA-200       # dry run of the same link, from the other side
tim jira detach EUDPA-333 --list                    # read-only: id, filename, size and created time of each attachment
tim jira detach EUDPA-333 diagram.svg               # dry run: the attachment that would be deleted
tim jira detach EUDPA-333 diagram.svg --all --confirm  # deletes every attachment with that filename; without --all a shared filename is refused
tim jira detach --id 479899 --confirm               # deletes one attachment by its id
tim jira unlink EUDPA-368 --list                    # read-only: id, type and other side of each issue link
tim jira unlink --id 426407 --confirm               # deletes one issue link by its id (dry run without --confirm)
tim jira assign EUDPA-200 me                        # dry run: resolves "me" to your account id and shows who has the ticket now
tim jira assign EUDPA-200 <accountId> --confirm      # assigns it, then reads the assignee back to check
tim jira comment EUDPA-200 --body "Fixed on main."  # dry run: shows the comment that would be added
tim jira comment EUDPA-200 --file comment.txt --confirm  # posts it, then reads the comments back to check
tim jira epics --project EUDPA --json              # read-only: open epics in a project, for a hand-off's default parent (no dry-run/confirm — nothing is written)
tim jira epics --board 13780 [--include-done]      # read-only: the board's epics as 'KEY — summary' lines, open only unless --include-done (the board decides what is done)
tim jira labels --board 13780 --json               # read-only: how often each label appears in the board's backlog, most used first
tim jira search commodity MDM --open               # read-only: tickets in JIRA_PROJECT_KEY (or --project) whose text matches the words, newest change first; --open leaves out done tickets
tim jira search --jql "parent = EUDPA-125" --limit 100 --json  # read-only: sends the JQL as written (--limit defaults to 50, up to 500)
```

`tim jira create --from <path>` reads a `tim-ticket/1` manifest (project,
type, summary, `descriptionFile`, parent, labels, priority (Medium when
left out), attachments, relates) from the given JSON file, resolving `descriptionFile` and every
attachment path relative to the manifest's own directory. The dry run's
`planId` is a hash of the exact payload plus every attachment's own content
hash, so `--confirm <planId>` only succeeds when the plan it names is still
the plan on disk — edit the manifest after a dry run and the old `planId` is
refused, naming the mismatch, rather than silently creating something
different from what was shown. A manifest that already has a
`ticket.created.json` receipt beside it refuses to create again, naming the
key it already created. `create` and `attach` also exit `PARTIAL_FAILURE`
(not `ERROR`) when some but not all attachments fail, so the receipt still
gets written for what did succeed. `type` is one of `Story`, `Task`,
`Bug` or `Epic`. The description file's trailing newlines are dropped
before it is sent. Every ticket the workspace raises goes through this
surface; to take the new ticket yourself, follow it with
`tim jira assign <key> me --confirm`.

`tim jira link` takes exactly one link: `relates <key>`, `--blocks <key>` or
`--blocked-by <key>`. A positional `blocks` is refused, because the flags
make the direction explicit. Jira's `issueLink` field names mislead: the
blocker goes in `inwardIssue` and the blocked ticket in `outwardIssue`. The
client's `recordBlocker({ blocker, blocked })` owns that mapping. After the
write, the command reads the ticket's links back; if Jira stored the link the
other way round it fails with `UNKNOWN` and names the stored direction.
`--json` puts `{mode, key, target, type, requested, stored, verified}` in
`result`.

`tim jira assign` leaves a ticket already assigned to that account alone and
reports `unchanged`, even with `--confirm`. `--json` puts
`{mode, key, accountId, previousAssignee, assignee}` in `result` (`mode` is `dry-run`,
`assigned` or `unchanged`).

`tim jira update` rewrites a ticket that already exists: `--summary` for the
title, and `--description` or `--description-file` (not both) for the
description, as Jira wiki markup. `--priority` takes Lowest, Low, Medium,
High or Highest. `--parent` takes the parent epic's key, or `none` to take
the parent away. `--labels a,b` replaces the ticket's labels; `--add-label`,
which can be repeated, adds to the labels it has and is not used with
`--labels`. Labels compare as a set, so a new order is not a change. It
reads the ticket first and sends only
the fields whose value differs, so a field already holding that value is
left out of the write and a re-run reports `unchanged` rather than stamping
the ticket's history with a no-op. After the write it reads the ticket back
and fails with `UNKNOWN`, naming the field, if Jira still shows the old
value. `--json` puts `{mode, key, fields, before, url, after}` in `result`
(`mode` is `dry-run`, `updated` or `unchanged`).

`tim jira comment` takes the text from `--body` or `--file`, not both, and
sends it as Jira wiki markup. A ticket that already has a comment with the
same text is left alone and reports `unchanged`, even with `--confirm`, so a
retry never posts a duplicate. `--json` puts `{mode, key, body, comment}` in
`result` (`mode` is `dry-run`, `commented` or `unchanged`).

### `tim jira transition` — move a ticket's status

Moving a ticket is the whole job of this command, so it is **not** a dry run:
it changes the ticket straight away. It replaces
`../tools/jira/transition-ticket.sh`, which stays for use by hand.

```bash
tim jira transition EUDPA-200 "Done" --json   # moves the ticket to the status named exactly "Done", then reads it back to confirm
tim jira transition EUDPA-200 --list          # read-only: the transitions the ticket offers, each as `transition -> status`, with the resolutions each accepts
tim jira transition EUDPA-200 "Done" --resolution "Won't Do" --json   # moves the ticket and sets the resolution, then reads both back
```

- The name is matched exactly against the status each transition leads to.
  When no status matches, a transition with that name is used instead, and
  the output says which status the ticket ended in.
- `--resolution <name>` works only where the transition's screen has a
  resolution field that offers that name. Otherwise the command fails with
  `USAGE` before it moves anything, and names the resolutions it does offer.
- A ticket already in the status is left alone and reported as `unchanged`,
  so running it twice is safe.
- A status the ticket offers no transition to fails with `USAGE` (exit 2) and
  lists every transition it does offer.
- `--json` puts
  `{key, action, status, previousStatus, requested, transition, resolution}`
  in `result` (`action` is `moved`, `unchanged` or `listed`; `--list` gives
  `{key, action, status, transitions}`).

The increment build loop's done stage closes each ticket with
`tim jira transition <KEY> "<jiraDoneStatus>" --workspace <root> --json`.
`tim build start` moves a ticket to the working status through the same
client call (`moveToStatus` in `src/clients/jira-client.js`).

### GitHub: use the GitHub CLI

tim has no GitHub commands. Use `gh` directly. Every repo is a DEFRA repo.

| To                                   | Run                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Find the PRs for a ticket            | `gh search prs EUDPA-X --owner DEFRA --json repository,number,title,url,state`                                                                                            |
| Read a PR or its diff                | `gh pr view <n> --repo DEFRA/<repo>`, `gh pr diff <n> --repo DEFRA/<repo>`                                                                                                |
| Open a PR, unless one is open        | `gh pr list --repo DEFRA/<repo> --head <branch> --state open`, then `gh pr create`                                                                                        |
| Edit or close a PR                   | `gh pr edit <n> --repo DEFRA/<repo>`, `gh pr close <n> --repo DEFRA/<repo> --comment …`                                                                                   |
| Check a PR's checks once             | `gh pr checks <n> --repo DEFRA/<repo>` (exit 0 pass, 1 fail, 8 pending)                                                                                                   |
| Wait for a PR's checks to finish     | `gh pr checks <n> --repo DEFRA/<repo> --watch` (exit 0 pass, 1 fail; it waits with no limit)                                                                              |
| Read a failed job's log              | `gh run view <runId> --repo DEFRA/<repo> --log-failed`, or `gh run view --job <jobId> --log-failed`                                                                       |
| Read a SonarCloud check's report     | `gh api repos/DEFRA/<repo>/check-runs/<id> --jq '.output'`                                                                                                                |
| Run a job again                      | `gh run rerun <runId> --repo DEFRA/<repo> [--failed]`, or `--job <jobId>`                                                                                                 |
| List, check or wait for Actions runs | `gh run list`, `gh run view <id>`, `gh run watch <id> --exit-status`                                                                                                      |
| Merge a green PR                     | Run `gh pr checks <n> --repo DEFRA/<repo>` and merge only when it exits 0: `gh pr merge <n> --repo DEFRA/<repo> --squash --match-head-commit <sha>` checks nothing itself |
| Check GitHub sign-in                 | `gh auth status`                                                                                                                                                          |

### `tim sonar gate` — why a SonarCloud gate failed

A SonarCloud gate failure has no GitHub job log. The scan step inside the
workflow passes, and SonarCloud posts its verdict afterwards as a check of its
own, so `gh run view --log-failed` shows nothing. This is how to read one.

```bash
tim sonar gate trade-imports-animals-frontend --pull-request 435 [--json]
tim sonar gate trade-imports-animals-frontend --branch main [--json]
tim sonar gate trade-imports-animals-frontend            # the main branch
```

- Each failed condition names its metric, the threshold and what the code
  measured: `[FAILED] new_coverage  90 required, 84.2 measured`.
- When a failed condition counts violations, the last line gives the
  `tim sonar issues` command that lists them with file and line. Coverage,
  duplication and hotspot conditions get no such line — no issue list explains
  them.
- It reports and exits 0 whatever the verdict. The pre-push hook and CI own the
  gating.
- `--json` puts `{project, pullRequest, branch, status, conditions, url}` in
  `result`, where `status` is `OK`, `ERROR` or `NONE` and each condition is
  `{metric, status, comparator, threshold, actual}`.
- A public project needs no token. `SONAR_TOKEN` is sent when set, so a
  private project works too.
- Giving both `--pull-request` and `--branch`, or a PR that is not a number,
  fails with `USAGE` before any request is sent.

### `tim sonar issues` — the issues a gate counted

List the open SonarCloud issues on a pull request, a branch or the main
branch. The project is the repo name, with or without the `DEFRA_` prefix.

```bash
tim sonar issues trade-imports-plants-frontend --pull-request 108 [--json]
tim sonar issues trade-imports-plants-frontend --branch main [--json]
```

- On a pull request, these are the new issues its quality gate counts. Each
  entry shows the severity, type, rule, file and line, the message and a link.
- `--json` puts `{project, pullRequest, branch, total, issues}` in `result`.
- A public project needs no token. `SONAR_TOKEN` is sent when set, so a
  private project works too.
- Giving both `--pull-request` and `--branch`, or a PR that is not a number,
  fails with `USAGE` before any request is sent.

### Workspace safety for repos outside the branch-parity contract

Not every repo under `repos/` follows the workspace's cross-repo
branch-parity rule (`CLAUDE.md` rule 2) — `trade-imports-plants-prototype`
has no Docker stack image to keep in step with. `repos.json` marks such a
repo `"workspaceBranchSync": false`, and `tim workspace reset|branch|update`
skip it by default, printing one plain skip line and listing it under
`skipped` in `--json`:

```bash
tim workspace update                                           # skips trade-imports-plants-prototype, updates every other repo
tim workspace update --include trade-imports-plants-prototype  # names it explicitly, so it updates too
tim workspace install --repo trade-imports-plants-prototype    # installs just this repo, using its own pinned npm version if `packageManager` differs from the one running
```

`tim workspace setup` also gives such a repo its own fetch-only `upstream`
remote from `repos.json` (name, url, `push: "DISABLED"`) — idempotent, so
running setup again reports "already set up" rather than erroring.

### `tim prototype setup`

Onboards a Claude Code session at the workspace root for a designer working
on the plants prototype, in one idempotent command:

```bash
tim prototype setup          # add the CLAUDE.local.md designer note, the upstream remote, install, and check Jira and Confluence readiness
tim prototype setup --remove # take the designer note back out of CLAUDE.local.md, leaving everything else in the file untouched
```

It writes a marker-delimited block into a gitignored `CLAUDE.local.md` at
the workspace root (running it again replaces the block with the same text
rather than duplicating it), reuses the `workspace setup`/`install` building
blocks scoped to just `trade-imports-plants-prototype`, and reports
Jira and Confluence auth readiness via the same probes `tim auth` uses — without
failing the command when Jira isn't configured yet. It never touches Jira
and never pushes.

### Bypassing the interactive menu

The menu only opens when stdout is a TTY and the user has not asked for plain text. In any of the following situations tim falls back to printing `--help` to stdout, so pipes, CI and skill scripts keep working unchanged:

- A subcommand was given (`tim workspace status`)
- Stdout is not a TTY (`tim | cat`, CI runs)
- `--no-ui` is on the command line
- `--json` is on the command line

## Auth

`tim` reuses the same environment variables as the bash tooling in [`../tools/`](../tools/) — anyone with the bash tools working gets seamless pickup with no new setup:

| Variable                                   | Used for                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL` | Jira and Confluence (Confluence sits at `${JIRA_BASE_URL}/wiki` with the same Atlassian token)                                                    |
| `TIM_WORKSPACE`                            | Workspace root override (same as `--workspace`)                                                                                                   |
| `TIM_GITHUB_BASE_URL`                      | Clone URL prefix override for `workspace setup` (default `https://github.com/DEFRA`) — used by the behavioural tests to clone from local fixtures |
| `TIM_NO_AUTO_PULL`                         | Set to any value to turn off the automatic workspace pull described below                                                                         |

Run `tim auth` to check your setup. It checks Jira and Confluence through library clients. For GitHub, run `gh auth status`.

## Staying up to date

Every `tim` command fast-forwards the workspace repo before it runs, so using tim keeps you current without having to remember to pull.

It is deliberately narrow:

- **Only on `main`.** On any other branch it does nothing. Merging or rebasing your feature branch is your call, not the CLI's.
- **`--ff-only`.** It either fast-forwards cleanly or does nothing. It cannot leave a half-finished merge or a rebase stopped on a conflict, and it will not touch a branch that has diverged from its upstream.
- **Never blocks the command.** No network, no remote, a diverged branch — it says so on stderr and carries on.
- **stdout stays clean.** Notes go to stderr, so `--json` output remains one parseable line.

This updates the workspace repo only. Use `tim workspace update` for the repos under `repos/`.

Turn it off with `TIM_NO_AUTO_PULL=1` — worth doing when working offline or on a slow link, since each run makes a network call (bounded to a 10 second timeout).

## Smoke checklist

After install, confirm:

```bash
tim --version              # prints a semver
tim hello                  # prints "Hello from tim"
tim hello --json | jq      # parses as JSON with ok, schema_version, tim_version, message
```

## Developing

```bash
npm test                   # vitest, coverage
npm run test:watch
npm run lint               # eslint + neostandard
npm run lint:fix
npm run format
npm run coverage
```

## Project rules

Project conventions live in [`CLAUDE.md`](CLAUDE.md) and `.claude/rules/`. Highlights:

- **Test on input/output.** No `toHaveBeenCalled[With]` — render the component, spawn the CLI, or call the function and assert on what comes back. Pre-commit hook (`forbid-spy-assertions.sh`) enforces this.
- **Library-first integrations.** External services go through typed clients under `src/clients/`. No shelling out to `gh`, `jq`, `curl`, or `../tools/*.sh`.
- **No GitHub in tim.** GitHub work uses the GitHub CLI (`gh`) directly, outside tim. Never add a GitHub command or client to tim.
- **Mock at the network boundary.** `undici` MockAgent for HTTP; never `vi.mock()` your own client modules.
- **Code and tests ship together.** Every new `src/**/*.js` lands with a sibling `*.test.js`.
- **GDS plain English** for all user-facing strings.
