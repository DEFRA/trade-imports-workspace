Cross-repo consistency analysis for an EUDP trade-imports ticket review.

Identify patterns present in some repos but absent in others. Produce
one `_consistency-check.md` per repo, using the 0-byte stub as a
tracking gate.

Paths anchored on `~/git/defra/trade-imports-workspace` — compute via the `find_workspace_root`
helper in `docs/agent-skills.md`.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Workspace

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/
├── ticket.md              # READ: change intent and AC
├── .review-meta.json      # READ: repos, PR numbers, commits
└── file-reviews/{repo}/
    └── _consistency-check.md  # WRITE: one per repo
```

## Workflow

### 1. Read context

```bash
cat ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/.review-meta.json
cat ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/ticket.md
```

### 2. Read all diffs (from the workspace cache)

`prepare-review.sh` already cached the full PR diff for every repo
at:

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/.diffs/{repo-name}.diff
```

Read those files directly — no need to call `gh pr diff` or
redirect to /tmp. You need the full picture across all repos
simultaneously, so collect every `.diffs/*.diff` listed in
`.review-meta.json` before analysing.

### 3. Analyse for cross-repo patterns

Look for these categories of change across the diffs:

| Category | What to look for |
|----------|-----------------|
| **Config / env vars** | New keys in `application.yml`, `.env`, Helm values, Bicep params — present in some repos, absent in others |
| **Dependency bumps** | Version changes in `package.json`, `pom.xml` — did all repos sharing this dep get the bump? |
| **Structural patterns** | New middleware, interceptor, annotation, filter, decorator introduced in one repo — do peer repos with the same structure have it? |
| **Test patterns** | Repos touching business logic that have no test changes relative to peers that do |
| **Documentation** | README, changelog, or Confluence updates in some repos but not others |
| **Feature flag / toggle** | Flags introduced in some repos but missing in services that also need them |
| **Naming and reuse** | One concept with two names across repos, layers or twin frontends (`userId` in one place, `ownerId` in another; `destinationCountryNames` beside `originPageCountryNames`). A rename that stops at one repo or one layer (`telephone*` left beside `phone`). A new constant, helper or client beside one that already exists (`HEADER_USER_ID` declared twice). A rule changed in one twin and not the other. |

For each pattern found, determine whether its absence in a given repo
is:

- **Expected** — the repo legitimately doesn't need it (different tech, different scope)
- **Suspicious** — the repo likely should have it, needs investigation

For naming and reuse, two names are a finding unless you can show the
two things differ. Quote the code that shows it.

### 3b. Find statements outside the diff that the change makes untrue

Run this for every repo, including a single-repo review.

1. From the diffs and `ticket.md`, list each rule, behaviour, name or
   default the change alters. Write each as a search term: the old
   name, the old literal, the old route, the old wording.
2. In the pinned review clone
   `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo}/`,
   search for each term outside the changed lines, in:
   - the repo's recipes and docs: `**/docs/add-a-*.md`,
     `src/server/app/docs/*.md`, `**/docs/*.md`, `AGENTS.md`,
     `CLAUDE.md`, `README.md`
   - JSDoc and Javadoc blocks, and line comments
   - test titles (`test(`, `it(`, `describe(`, `@DisplayName`)
   - `~/git/defra/trade-imports-workspace/docs/best-practices/` and
     `openspec/specs/` when the rule is one they state
3. Every hit that still states the old way is a finding. Record the
   file, the line, the old statement, and what is now true.

Example: commit `be35bf0c` changed how page anchors are worked out and
left `change-link.js:17-21` describing the old way. The file was not
in the diff, so no per-file reviewer could see it.

The Must for a stale comment is that the comment is gone, or the name
it decoded now says it. The Must for a stale recipe, doc or test title
is that it states the new behaviour.

### 4. Write consistency check per repo

For **every** repo in `.review-meta.json`, write to the existing 0-byte
stub:

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/file-reviews/{repo}/_consistency-check.md
```

Use this template:

```markdown
# Consistency Check: {repo-name}

**Ticket:** EUDPA-XXXXX
**All repos in scope:** {comma-separated list of all repos}
**PR:** #{pr-number} | **Commit:** {short-sha}

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `NEW_CONFIG_KEY` | repo-a ✅, repo-b ✅ | ❌ Not found | INCONSISTENT |
| `dependency@2.0.0` | repo-a ✅ | ✅ Present | CONSISTENT |

*If no cross-repo patterns apply: state "No shared patterns requiring cross-repo consistency."*

## Missing Changes

[Changes found in ≥1 other repo that appear absent here but should be present.
Include file path, line reference, and why it's expected in this repo.]

*None identified.* (if applicable)

## Unique Changes

[Changes in this repo not present in others — flag if suspicious, note if intentional.
Cross-reference ticket scope to justify.]

*None identified.* (if applicable)

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|

*None identified.* (if applicable)

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|

*None identified (searched: `term1`, `term2`, …).* (if applicable — always list the terms you searched)

## Verdict

**Status:** CONSISTENT / INCONSISTENCIES FOUND / SINGLE REPO
**Issues:** X inconsistencies found
**Summary:** [One sentence]
```

### Single-repo reviews

If `.review-meta.json` contains only one repo, skip the cross-repo
table and write "No cross-repo comparison is possible." under it. Still
fill **Naming and Reuse** (within the repo, and against its twin
frontend when there is one) and **Statements Made Untrue** (step 3b).
The status is `SINGLE REPO` when both are empty, otherwise
`INCONSISTENCIES FOUND`.

## Output

Every `_consistency-check.md` stub must be written (non-empty) before
`verify-consistency.sh` will pass.

The parent review skill runs `verify-consistency.sh` afterwards —
empty = pending, non-empty = reviewed.
