# Session 4: the `code-style` skill

**Objective:** Lint a PR's JavaScript against the team's 16-rule style guide, then triage and apply the fixes.

Companion deck: `04-code-style.pptx`.

## What it's for

Plain linters miss the things this team actually cares about: project-specific conventions, and JSDoc that has quietly drifted out of sync with the code. Catching those by eye across a multi-repo PR is dull, slow work — and the kind that gets skipped under pressure.

code-style reviews every .js file in a ticket's PRs against one agreed 16-rule guide, lets you triage the findings, then applies the ones you accept — editing, testing and committing each file for you, and backing out anything that breaks a test.

What you get:

- **One agreed standard** — the same 16-rule guide applied to every file, every time
- **Catches JSDoc drift** — the doc-vs-code mismatches a plain linter won't
- **Fixes, not just flags** — accepted fixes applied, tested and committed for you

## How you trigger it

You launch it in natural language: "style review EUDPA-1234" · "walk style EUDPA-1234" · "fix style EUDPA-1234"

## Watch it run

1. **Review** — "style review EUDPA-1234" pulls the PRs, finds every .js file, and reviews each one in parallel against the baked rule bundle.
2. **Aggregate** — it gates on 100% coverage, then rolls findings up per repo with a verdict: COMPLIANT, MINOR ISSUES or NEEDS WORK.
3. **Walk** — "walk style EUDPA-1234" steps through the findings so you mark each one Fix, Won't-fix or Discuss.
4. **Fix** — "fix style EUDPA-1234" applies the agreed fixes a file at a time — edit, test, commit — reverting anything that breaks rather than forcing it through.

## Reading the output

Per-repo under workareas/code-style-reviews/EUDPA-X/.

- `style-review.<repo>.md` — verdict, file-by-file summary, and the Items table
- `Items table` — each row: the rule, severity (FAIL / WARN), the issue, and the suggested fix
- `style-rules.<repo>.md` — the baked rule bundle it checks against (the 16 rules + JSDoc)
- `commits` — applied fixes land as real commits; broken tests are reverted, not forced

## How you use it

- **Reach for it when** — a JS-touching PR is up and you want it clean before review
- **Where you decide** — you triage every finding; nothing changes until you say Fix
- **How it fits** — runs alongside review — review for the logic, code-style for the JS guide

## Live view

Don't memorise the surface — read the current version:

- `style review · walk · fix style` — review, triage, then apply fixes
- `.claude/skills/code-style/SKILL.md` — the modes and triggers
- `workareas/code-style-reviews/EUDPA-X/` — the per-repo summaries and rule bundle

## Try it

Pick a ticket with a JS-touching PR, run "style review EUDPA-XXXX", then "walk style EUDPA-XXXX" to triage. Read style-review.<repo>.md for the verdict and the Items table.

Next: [Session 5 — the `understanding-check` skill](05-understanding-check.md).
