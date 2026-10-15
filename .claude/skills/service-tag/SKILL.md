---
name: service-tag
description: 'Tag the trade-imports-ins-tests specs in other domains that a service''s pull request should also run, and keep config/e2e-tests-pr-scope.json in step with those tags. For each non-default entry in the scope file it works out which domains call the service directly from the stack wiring, finds the specs there that reach the service, tags only the ones that exercise it, checks the tag map and fixtures table for drift, runs npm run lint, and leaves the changes unstaged, commits them or branches first, as the user chooses at the start. Use when asked to add or refresh service tags (triggers: "tag specs for <service>", "service-tag", "tag service specs", "add service tags"). NOT for writing new tests — use spec-cover. NOT for the future tags on the default entry (@auth, @smoke, @gateway and so on) — this skill skips that entry. NOT for changing which domains a service runs by path — edit the scope file by hand.'
---

A service tag marks a spec in another domain that a service's pull request should
also run. A service's PR already runs its own domain by path (its `suites` in
`config/e2e-tests-pr-scope.json`); the tag adds the few specs elsewhere that exercise
the service. This skill adds those tags to `trade-imports-ins-tests`, and adds or
removes the matching `tags` on each service's scope entry. It tags **only related
specs** — a tag that does not earn its place makes every PR for that service slower.

Background: [Test and spec vocabulary](../../../docs/testing/test-and-spec-vocabulary.md)
for domain, suite and service tag; [E2E tests: GitHub Actions](../../../docs/testing/e2e-tests-gh-actions.md)
for how a PR run uses them.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "tag specs for `<service>`" | Steps 0–6 for that one service |
| "service-tag", "tag service specs", "add service tags" | Steps 0–6 for every service in the scope file except `default` |

NOT for writing a new test — use `spec-cover`. NOT for the `default` entry or the
future tags in the "Repos that run everything" table. NOT for changing which domains
a service runs by path — that is a hand edit to `suites` in the scope file.

## Step 0: Start

1. Ask how to land the changes, before anything else (AskUserQuestion, recommended first):

   | Mode | Branches | Result |
   |---|---|---|
   | **A. Current branches, leave unstaged** (default) | stay on each repo's current branch | edits only, nothing staged |
   | **B. Current branches, commit** | stay | one commit per service in each repo |
   | **C. New branches, commit** | created from `main` in each repo | one commit per service in each repo |

   For C, also ask for the ticket number. The branch is `chore/<TICKET>-service-tagging`
   in **both** repos (workspace rule 2); let the user override the name.

2. Run the dispatcher:

   ```bash
   ~/git/defra/trade-imports-workspace/tools/service-tag/start-service-tag.sh
   ```

   Add `--service <name>` (short or full) for a one-service run. The first stdout line
   is `MODE: READY`; the JSON after it has each repo's branch and uncommitted files,
   the scope entries (each with the `dependents` that call it directly, read from the
   stack's compose wiring), the tag map, and an `alignment` list.

3. Apply the guards for the chosen mode:
   - A and B: refuse to continue if either repo is on `main`.
   - Any mode, if a repo has uncommitted files: list them and ask once whether to
     continue. In A they will sit in the same diff as this skill's edits.
   - C: do **not** create a branch yet. Create each repo's branch (`git -C <path> switch -c
     <branch> main`) immediately before the first edit in that repo, so a run that finds
     nothing to change creates nothing. If the branch already exists, ask.

## Step 1: Consistency check

Run before any tagging. It compares things that describe the same domains and fixtures:
the scope file's `suites`, `SERVICE_TAG_DOMAINS` in `trade-imports-ins-tests/config/service-tags.ts`
(what the lint reads), and the fixtures table in
[`references/service-decisions.md`](references/service-decisions.md).

Take every item in `alignment` from Step 0, and add one more check yourself: Read the
`PageFixtures` interface in `trade-imports-ins-tests/fixtures/ui.ts`. Every fixture there
must be in the fixtures table or in its "Not a signal" list, and every fixture the table
names must exist in the interface.

- **None found:** say nothing and go to Step 2.
- **Otherwise ask about each one separately** (AskUserQuestion), naming the service and
  the two values that disagree. For a map or scope mismatch offer:
  1. align the map to the scope file — recommended, since the scope file is what CI runs;
  2. align the scope file to the map — say that this changes what runs on that
     service's PRs;
  3. leave it.

  For a fixture mismatch offer: add it to a service's row (ask which), remove it from
  the table, or leave it.

  Apply the answer straight away, then ask the next one. Never batch them.

## Step 2: Discover and judge, per service

For each service (scope-file order), find its fixtures row in
[`references/service-decisions.md`](references/service-decisions.md). No row: stop and
ask the user for its fixtures.

**The domains to search** are the domains of the service's `dependents` from Step 0 (the
services that call it directly), plus any "Also exercised from" rows for it in the
decisions file, **minus** the domains it already runs by path (`domains_run_by_path`).
Only direct callers count — a caller of a caller is not related. No domains left: nothing
to tag, so say so in one line and go on to the next service.

For each domain, in its own Bash call, find the specs that use the service's fixtures
(use the indirect signal too where the row has one). Search `e2e/` only, because `a11y/`
and `security/` specs are never tagged:

```bash
grep -rlE "<fixture1>|<fixture2>" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests/tests/<domain>/e2e
```

No hits and no indirect signal: nothing to tag and nothing to say. Otherwise:

1. Drop any spec listed under "Ruled out" whose **Revisit if** condition is still false.
   If it is now true, keep the spec and note the row for removal in Step 5.
2. List the domain's specs to see their tags:

   ```bash
   ~/git/defra/trade-imports-workspace/tools/service-tag/list-specs.sh --domain <domain> --type e2e
   ```

3. Read the specs that matched and judge each by the rules below. Show the user the
   proposed set — spec, test or describe, and one line of evidence each — plus any
   near-misses you rejected and why. Wait for approval before editing.
4. If every hit was setup-only use and nothing is related, say so and note the specs for Step 5.

### What counts as related

- The spec **exercises the service**: it drives the service's pages or routes, calls its
  API, or asserts on data it stores or publishes. A journey that merely passes through a
  page the service does not own is not related. Signing in is never related.
- Choose the **smallest set that covers the link**. Prefer a spec that crosses the service
  boundary end to end. Once a link is covered, stop. If one service and domain pair
  reaches more than about five specs, pause and ask whether each earns its place.
- **Skip any spec carrying `@a11y`, `@active` or `@dynamics`.** The PR run
  (`test:docker-compose:ci` in the tests repo's `package.json`) filters those out, so a
  service tag on them never runs. Check the `tags` field `list-specs.sh` prints. This
  includes `@dynamics` specs that sit under `e2e/` (for example `animals/e2e/journeys/dynamics/`).
  Report each one skipped for this reason as a near-miss. `@compose` specs **do** run on
  PRs, so they are fine to tag. If `package.json` changes that filter, follow it.
- **Never tag a spec in a domain the service runs by path** — the lint rejects it.
- Tag at the **narrowest unit**: a single test when only some tests in a describe are
  related, the describe when all are.

### How to tag

Playwright takes tags on the test or describe options. Match what the file already does
(a string for one tag, an array for several) and add to an existing tag option rather
than writing a second:

```ts
test('shows the address picker', { tag: '@address-book' }, async ({ page }) => { ... });
test.describe('Address book', { tag: ['@compose', '@address-book'] }, () => { ... });
```

### Existing tags

Re-judge specs that already carry the service's tag with the same rules. A tag that no
longer fits is **reported, never removed** — list it for the user to decide.

## Step 3: Scope entry

After tagging a service, list its tag across the suite:

```bash
~/git/defra/trade-imports-workspace/tools/service-tag/list-specs.sh --tag <@tag>
```

- Specs carry the tag and the entry has no `tags`: add `"tags": ["<@tag>"]`.
- **No spec carries the tag** and the entry has `tags`: remove the `tags` key. The entry
  keeps its `suites`, so it stays valid. If a stale tag was reported in Step 2 and left
  in place, keep the `tags`.
- Leave `SERVICE_TAG_DOMAINS` alone — it says which domains a tag belongs to, whether
  or not a spec uses it yet.
- Keep each entry on one line, as the file does. Then check the JSON still parses:

  ```bash
  jq empty ~/git/defra/trade-imports-workspace/config/e2e-tests-pr-scope.json
  ```

## Step 4: Format and lint

Adding `{ tag }` as a middle argument stops prettier keeping the test call on one line,
so it rewraps the whole test body. The repo's commit hook rejects unformatted files, so
format every spec you edited. Pass the files' `~/git/...` paths:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests exec --no -- prettier --write <files>
```

The raw diff then shows mostly indentation. `git diff -w` shows only the tag and the
call wrapper; check that before moving on, and warn the user the plain diff is noisy.

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run lint
```

Fix any failure before moving on. The lint also rejects a tag on a spec in a domain
the service already runs, and checks the type tags.

## Step 5: Decisions file

[`references/service-decisions.md`](references/service-decisions.md) is input the skill
trusts, so keep it true. Propose an edit for each of these, **one at a time**
(AskUserQuestion, saying what changes and why), and apply it only on a yes. If there are
none, say nothing.

- A **Ruled out** row whose **Revisit if** condition is now true: remove the row.
- Specs whose hits were all unrelated: add a **Ruled out** row with the reason and a
  **Revisit if** condition, so the next run does not raise them again.
- A link you found that the wiring does not show (an event, or a test that drives
  another service): add an **Also exercised from** row. If a **Pending** link is now real,
  move it to that table.
- A row whose reason a spec or the code now contradicts: correct the reason.

## Step 6: Land

- **A:** change nothing in git. Print the uncommitted files in each repo.
- **B and C:** one commit per service in each repo, staging only the paths this skill
  touched (never `git add -A`). Subject `chore(<TICKET>): tag <service> specs`, taking the
  ticket from the branch name; body one line naming the tags and domains. Add the
  attribution line the session gives. The workspace commit holds the scope-file change,
  any decisions-file edit and any consistency fix; the ins-tests commit holds the spec
  tags and any map fix. Skip a repo with nothing to commit.
- **Never push.** A push runs the SonarCloud gate and publishes the branch; leave it to the user.

## Completion output

```
service-tag complete (<date>), mode <A|B|C>.

Aligned: <n> consistency question(s) answered — <list, or "none found">
<service>  <@tag>
  tagged:   <spec — domain>, ...
  skipped:  <ruled out / near-miss>, ...
  scope:    tags added | kept | removed
  stale:    <specs carrying the tag that no longer fit, or none>
Decisions file: <rows changed, or "no changes proposed">
Lint: clean

Landed: <uncommitted files | commit hashes per repo>
Next: <review the diff | open a PR for each repo>
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/service-tag/`:

| Script | Purpose |
|---|---|
| `start-service-tag.sh [--service <name>]` | Read-only. Repos' branches and uncommitted files, scope entries (default skipped), the tag map, and the alignment findings |
| `list-specs.sh [--domain <d>] [--type <t>] [--tag <@t>]` | Every spec with its tags as JSON, via `playwright test --list`; filter by domain, test type or tag |
