# Post implement-review responses on PRs

After **`implement review EUDPA-XXXXX`** (or equivalent fix work) has been
**committed and pushed**, post one PR comment per affected repo PR. The comment
must be **tabular and aligned with the review items** the walker (and human PR
review) already recorded — not a free-form narrative.

**Trigger:** end of `BATCH_IMPLEMENTOR.md` Step 6 (after the chat final report),
or when the user asks to **post review fixes / review response** on the PR.

Canonical copy: `.claude/skills/review/references/REVIEW_PR_RESPONSE.md` — keep in sync.

---

## Step 1: Load state

```bash
~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --filter fix --json
```

Read PR numbers from `workareas/reviews/EUDPA-XXXXX/.review-meta.json` (`prs[]`).

Read rendered item wording (and any reviewer attribution) from:

`workareas/reviews/EUDPA-XXXXX/review.{repo}.md`

**Human PR review (priority):** If the reviewer posted a numbered table on the PR
(e.g. Hamid’s `# Code review — EUDPA-760` comment with **22 rows**), the PR
response **must use that reviewer’s `#` column for every row** — all of them,
not the smaller set in `items.{repo}.json`. The walker often **compresses**
several reviewer rows into one Fix item (e.g. Hamid #2, #4–#6, #13–#17, #21 →
walker item 6). Posting only walker rows makes the reply look like you ignored
most of the review.

Load the full reviewer table from the PR when needed:

```bash
gh api repos/DEFRA/{repo}/issues/comments/{comment_id} --jq '.body'
```

Use the **Issue** column text as “Reviewer raised”. Use **One way** / fix notes for the “Addressed” column.

For each repo you changed, note the **latest commit SHA** on the PR branch that
contains the fixes (`git -C repos/{repo} log -1 --oneline` on the PR branch).

---

## Step 2: One comment per PR

Post with `gh pr comment {n} --repo DEFRA/{repo} --body "$(cat <<'EOF' … EOF)"`.

Group rows **only for items whose `repo` matches that PR’s repo**. Do not merge
frontend and ins-tests into one comment.

If a Fix item was triaged **Won't Fix** or left **Not Done**, include it with
**Status** `Not done` / `Won't fix` and a short reason — do not omit it.

---

## Step 3: Table format (required)

Use this header and columns. Keep “Reviewer raised” to one sentence (from
**Issue**). “Addressed” is what landed in code (file or behaviour), plus
`{short-sha}` when Done.

```markdown
## Review follow-up — EUDPA-XXXXX

Responding to [reviewer comment on this PR]({link}) (and matching walker items).

**Branch commit:** `{short-sha}` — {one-line subject}

| # | File | Reviewer raised | Addressed | Status |
|---|------|-----------------|-----------|--------|
| 1 | `path/to/file` | {Issue text} | {concrete change} (`abc1234`) | Done |
| 2 | … | … | … | Not done — {reason} |
```

Rules:

- **#** matches the **reviewer’s** item id on that PR when they posted a numbered
  table; otherwise use `items.{repo}.json` ids. Restart at 1 per repo.
- Include **every** reviewer row (22 means 22 rows), with honest **Status**:
  `Done`, `Not done`, `Already fixed at {sha}`, `Deferred` (e.g. merged into
  follow-up #21), `Out of scope for this PR`.
- If several reviewer rows were fixed in one change, repeat the same commit in
  **Addressed** for each row — do not collapse to a single walker row.
- **File** is the path from the reviewer row (backticks).
- Do not invent rows; do not drop reviewer rows because the walker merged them.
- Link the reviewer comment when `review.{repo}.md` or `gh pr view … --comments`
  gives a URL (e.g. Hamid `@amieljemei` on the same PR).
- Optional footer for cross-repo pointers: “Item N on [other PR #…](url) (`sha`).”
- Optional footer for non-code items (e.g. Jira/doc): separate row with Status
  **Tracked elsewhere** and ticket id.

---

## Step 4: Confirm in chat

List each comment URL posted. If the user previously got a narrative comment,
post the table as a **new** comment (do not delete the old one unless they ask).

---

## Example (frontend)

Hamid’s [PR #457 review](https://github.com/DEFRA/trade-imports-animals-frontend/pull/457#issuecomment-6610342697) has **22 rows**; the PR reply table must list **#1–#22**, not the 7 compressed walker items in `items.trade-imports-animals-frontend.json`.
