# STYLE_IMPLEMENTOR cheat-sheet

Reference catalogue for the STYLE_IMPLEMENTOR worker
(`.claude/skills/code-style/references/STYLE_IMPLEMENTOR.md`). The
persona owns the goal, success criteria and workflow; this file holds
the common fix patterns it points at.

The full rule text lives in
`~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md`,
and the house rules in
`~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` —
consult them for anything below.

## Common fix patterns

Order matters: apply fixes that change shape (Rule 2 fat-arrow
conversion, Rule 5 helper extraction) BEFORE fixes that depend on names
(Rule 6 renames, Rule 15 comment fixes that become renames) so you
don't fight your own diff.

| Rule | Typical change |
|------|---------------|
| 2 | `function foo()` → `const foo = () =>` |
| 5 | Extract duplicated block into named helper |
| 6 | Rename a name that does not predict what the code returns and changes; rename every caller, test and twin |
| 12 | `\|\|` → `??` for nullish defaults; remove redundant `?? null` when value is already nullable |
| 13 | Replace bare literal with named `const` |
| 15, `code-quality` | Delete the comment. If it decoded a name, rename or extract instead (below) |

## Rule 15: fix a comment

Work through these in order and stop at the first that applies.

1. **The comment describes something other than the lines below it**
   (a caller, another module, the backend, a library, the UI, a test),
   **or carries an id, a release name or history.** Delete it. Change
   nothing else.
2. **The comment restates what the code does.** Delete it.
3. **The comment explains what a name means.** The name is the defect.
   Rename the symbol so the comment is not needed, then delete the
   comment.
4. **The comment labels a block.** Extract the block into a function
   named for what it does, then delete the comment.
5. **The comment is stale.** Delete it. Do not rewrite it to match the
   code.

Never reword the comment, move it, or copy it to callers, tests or the
twin repo.

### Example: a comment decoding a name

From `check-answers/controller.js` in the animals frontend.

Bad:

```js
// c-201: an amendment opens with no errors; Continue refused shows them.
const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)
```

Good:

```js
const hidesAnswerErrors = readOnly || (journey.status === state.AMEND && !refused)
```

The comment carried a backlog id and decoded the name. The new name
says what the flag does in every state it covers, so the comment goes.
Rename every use in the file, and the same concept in the twin
frontend when it has one.

### Example: a comment labelling a block

Bad:

```js
// filter out inactive users and get their IDs
const result = users.filter((user) => user.active).map((user) => user.id)
```

Good:

```js
const activeUserIds = users.filter((user) => user.active).map((user) => user.id)
```
