# STYLE_IMPLEMENTOR cheat-sheet

Reference catalogue for the STYLE_IMPLEMENTOR worker
(`.claude/skills/code-style/references/STYLE_IMPLEMENTOR.md`). The
persona owns the goal, success criteria and workflow; this file holds
the common fix patterns it points at.

The full rule text lives in
`~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md` — consult it
for anything below.

## Common fix patterns

Make the **minimal** change for each item. Order matters: apply fixes
that change shape (Rule 2 fat-arrow conversion, Rule 5 helper
extraction) BEFORE fixes that depend on names (Rule 6 renames) so you
don't fight your own diff.

| Rule | Typical change |
|------|---------------|
| 2 | `function foo()` → `const foo = () =>` |
| 5 | Extract duplicated block into named helper |
| 6 | Rename single-char or generic variable |
| 12 | `\|\|` → `??` for nullish defaults; remove redundant `?? null` when value is already nullable |
| 13 | Replace bare literal with named `const` |
