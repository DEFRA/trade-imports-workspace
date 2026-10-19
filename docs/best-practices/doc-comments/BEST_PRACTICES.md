# Doc Comment Accuracy

A doc comment is a contract between the author and the caller of a public API. Anywhere else it is a second description of the code that nobody keeps up to date. A comment that no longer matches its function is actively misleading — worse than no comment at all.

The house rules in `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` apply to every comment, doc comments included.

This guide covers the universal rules. For format and tag syntax, see the language-specific addenda:

- JavaScript / TypeScript → [`jsdoc.md`](jsdoc.md)
- Java → [`javadoc.md`](javadoc.md)

---

## The rule

**Presence is the violation, unless the comment states the contract of an exported public API.**

- No doc comment: fine.
- A doc comment on an internal helper, a private method, a controller handler or a test: a finding. Fix: delete it.
- A doc comment on an exported public API: every claim it makes must be true of the current code, and it must state only the contract. Contract means what a caller needs to call it correctly: parameter constraints, return shape, errors thrown.

Rationale, history and design notes are never contract. They go in the repo's `docs/` or the behaviour spec.

---

## What makes a comment inaccurate

### Parameter drift

The comment documents a parameter that was renamed, removed, or added without updating the doc.

```
// bad — param renamed from userId to id, @param not updated
// bad — new `role` parameter added, @param not added
// bad — `options` parameter removed, @param still present
```

### Return type or shape mismatch

The `@returns` / `@return` describes a type or shape that differs from what the function actually returns.

```
// bad — says returns {string}, function actually returns {User}
// bad — @returns present but function is void (returns undefined)
// bad — says nullable but function always returns a value
```

### Stale `@throws` / `@exception`

The comment documents an exception that is no longer thrown, or documents the wrong exception type.

```
// bad — documents @throws Error("not found") but the throw was removed
// bad — says @throws TypeError but actually throws RangeError
```

### Description mismatch

The summary sentence describes behaviour that has changed — a different responsibility, a renamed concern, or a completely repurposed function.

```
// bad — "Validates and saves the form" but validation was extracted elsewhere
// bad — "Sends a welcome email" but now sends any notification type
```

### Claims about other code

The comment describes something other than the code it sits on: its callers, other modules, the backend, a library, the UI or a test. It also covers counts such as "the one row" or "the only caller". These go stale when the other code changes, and the person changing that code never sees them.

```js
// bad — describes another page's test, and counts ("the one Change link")
/** The three statuses that leave nothing for the trader to do. The review
 * page's unfinished-card test applies this same predicate, so "no unfinished
 * card" and "ready for Check your answers" cannot drift apart. */
export const rowReady = (status) => ...

// bad — a release name, a count, and a claim about which other files carry links;
// a later change gave more rows a Change link and this went stale
/**
 * The one Change link a card carries, level with its title (design release 1).
 * Rows carry none: ...
 * ... as cards/movement/transit-countries.js does.
 */
export const cardAction = (journeyId, slug, visuallyHiddenText) => ...

// good — no comment; the names say what each returns
export const rowReady = (status) => ...
export const cardAction = (journeyId, slug, visuallyHiddenText) => ...
```

**Default fix: delete.** If the claim is a real constraint on this function, state it as this function's contract ("Throws if `code` is blank") or enforce it in code.

---

## Severity

| Severity | When |
|----------|------|
| **FAIL** | Wrong param name; `@returns` type is flatly wrong; documented `@throws` for an exception that was removed; any claim about other code; rationale, history, ticket or ruling ids in a doc comment; a doc comment on code that is not an exported public API (a house-rules breach) |
| **WARN** | Description vague or partly outdated but not wrong; `@returns` on a void function; `@throws` for the wrong exception subtype |
| **PASS** | No doc comment, or an accurate contract-only comment on an exported public API |

Every FAIL and WARN is fixed in the same change. None is "taste".

---

## When a comment is wrong: delete first

When a doc comment is stale or makes a claim about other code, delete it. Do not reword it.

Write a new one only if all of these hold:

1. The function or class is an exported public API.
2. A caller needs a contract that the signature and names cannot show.
3. A rename cannot carry it.

Then write only that contract, in as few lines as it takes.

If the comment explains a name, the name is the defect. Rename, then delete the comment in the same change.

```
// delete this — it says nothing the signature doesn't already say
/**
 * Gets the user by ID.
 * @param id The user ID
 * @returns The user
 */
const getUser = (id) => ...
```

---

## Proposed fix format

When flagging a doc comment violation in a todo list, put `[delete comment]` in the **Proposed Fix** column by default. Give a corrected block only when the three conditions above hold, so the fixer does not have to re-derive it.
