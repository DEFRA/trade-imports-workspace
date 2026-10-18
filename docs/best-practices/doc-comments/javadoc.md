# Javadoc Format

Covers `.java` files. Read [`BEST_PRACTICES.md`](BEST_PRACTICES.md) first for the universal rules — this addendum covers when to write a block and its format.

---

## When to write a Javadoc comment

Default to **no comment**. Write Javadoc only to state an API contract:

- public methods on REST controllers whose descriptions springdoc publishes in the OpenAPI document
- public interfaces and classes that another module, library or service calls as a contract, where a caller needs a parameter constraint, return meaning or thrown exception that the signature and names cannot show

Do not write Javadoc for:

- `private` and package-private methods
- internal service, mapper and configuration classes
- simple getters, setters and record components
- a class whose responsibility is unclear from its name — rename the class instead
- a parameter that is unclear from its name — rename the parameter instead
- rationale, history or design notes — these go in the repo's `docs/`
- callers, other services, a library or a test (see "Claims about other code" in `BEST_PRACTICES.md`)
- `@Override` methods where the parent Javadoc still holds (use `{@inheritDoc}` if a block is needed at all)

---

## Block format

```java
/**
 * One-sentence summary ending with a full stop.
 *
 * @param paramName the constraint a caller must meet
 * @return what is returned, including when it is empty
 * @throws ExceptionType condition under which this is thrown
 */
public ReturnType methodName(ParamType paramName) { ... }
```

Place the comment immediately before the declaration with no blank line between them. Keep it to the contract: no longer description of how the method works.

---

## Tags

### `@param`

```
@param name description
```

- Name must match the actual parameter name exactly.
- If a parameter is renamed, reordered, added, or removed, update all `@param` tags.
- Do not include the type — it is in the signature.

### `@return`

```
@return description of what is returned
```

- Omit for `void` methods.
- Description must match what the method actually returns — check `return` statements.
- If the return type changed (e.g. now returns `Optional<T>` instead of `T`), update the description.

### `@throws`

```
@throws ExceptionType condition
```

- Only include for **checked exceptions** (required by the compiler) and **unchecked exceptions that are part of the method's documented contract**.
- Remove tags for exceptions that are no longer thrown.
- `ExceptionType` must be the simple class name of the actual exception thrown.

### `{@inheritDoc}`

Use on `@Override` methods to inherit the parent's Javadoc rather than duplicating or drifting from it.

```java
/**
 * {@inheritDoc}
 */
@Override
public User findById(String id) { ... }
```

---

## Accuracy checklist

When reviewing a `/** */` block on a Java method, first check it belongs at all: if the method is not an API contract as defined above, the fix is to delete the block. Otherwise verify each claim against the current code:

| Check | What to look for |
|-------|-----------------|
| Belongs | The method is an API contract and the block states only that contract |
| Param names | Every `@param name` matches a parameter in the method signature |
| No phantom params | No `@param` for parameters that no longer exist |
| Param count | Count of `@param` tags matches number of parameters |
| Return description | `@return` accurately describes what return statements produce |
| Void check | No `@return` on `void` methods |
| Throws types | `@throws ExceptionType` matches the exception actually thrown |
| Throws presence | No `@throws` for exceptions the method no longer throws |
| Summary | First sentence describes current responsibility, with no rationale, history or claims about other code |
| Inherited methods | `@Override` methods use `{@inheritDoc}` rather than a potentially-stale copy |
