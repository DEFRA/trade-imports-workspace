# REFACTORER cheat-sheet

Reference catalogue for the REFACTORER worker
(`.claude/skills/ticket/references/REFACTORER.md`). The persona owns the
goal, success criteria and workflow; this file holds the smell
checklists, refactoring techniques, naming tables, quality checklist and
the test-run commands it points at.

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/...`. Bash expands `~` automatically.

## Running tests

Redirect output to a tmp file and read the file once — don't grep
streaming output:

```bash
# Java (backend / stub / reference-data)
mvn -f ~/git/defra/trade-imports-workspace/repos/<repo>/pom.xml verify > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# Node unit (frontend / admin)
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# E2E (only when changing tests repo or cross-cutting code)
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose > /tmp/e2e-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```

Swap `pre` for `post` when re-running after a change.

## Code smells to look for

### Function Smells
- [ ] >20 lines
- [ ] >3 parameters
- [ ] Boolean/flag parameters
- [ ] Multiple responsibilities
- [ ] Deep nesting (>2 levels)
- [ ] Side effects

### Naming Smells
- [ ] Single-letter variables
- [ ] Generic names (data, info, manager)
- [ ] A name that does not predict what the code returns and changes
      (`report()` that also clears state)
- [ ] Metaphors (`lightenRemote` for "exclude gh-pages from the fetch")
- [ ] One concept with several names (`User-Id`, `userId`, `ownerId`
      for one person)
- [ ] Inconsistent conventions

### Comment Smells (fix: delete first)
- [ ] Describes callers, other modules, the backend, a library, the UI
      or a test
- [ ] Counts things ("the one row", "the only caller")
- [ ] Narrates history ("used to", "renamed from", "before the change")
- [ ] Carries a ticket key, backlog or AC id, or release name
      (`// c-201: …`, `EUDPA-565`)
- [ ] Explains what a name means — rename or extract instead
- [ ] Names a file, literal or behaviour that no longer exists

### Structure Smells
- [ ] Duplicated code
- [ ] A second mechanism beside an existing owner
- [ ] One rule written in several places
- [ ] Logic in the wrong layer
- [ ] Long classes (>200 lines)
- [ ] God classes
- [ ] Train wrecks (a.getB().getC().getD())

### Logging Smells
- [ ] A branch that changes an outcome with no log line
- [ ] A log line without the ids support searches by
- [ ] `getMessage()` logged instead of the throwable or `{ err }`
- [ ] A request or response body at INFO

### Test Smells
- [ ] A title that claims more than its assertions prove
- [ ] Set-up pasted into several files instead of a shared helper
- [ ] History in tests: `REMOVED_*` constants, `…BeforeTheChange` names
- [ ] An absence asserted where an exact positive assertion would do

## Refactoring techniques

### Extract Method
```java
// Before: 45-line function
// After:
public void process(Notification n) {
    validateNotification(n);
    NotificationData data = transformNotification(n);
    saveNotification(data);
}
```

### Replace Flag Argument
```java
// Before: render(data, true)
// After: renderForExport(data) / renderForDisplay(data)
```

### Introduce Parameter Object
```java
// Before: search(country, commodity, from, to, page, size)
// After: search(SearchCriteria criteria, Pagination pagination)
```

### Replace Null with Optional
```java
// Before: getNotification(id) // might return null
// After: findNotification(id) // returns Optional<Notification>
```

### Replace a Comment with a Name
```javascript
// Bad: the comment decodes the name, and carries a backlog id
// c-201: an amendment opens with no errors; Continue refused shows them.
const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)

// Good: the name says what the value decides; no comment
const hidesAnswerErrors = readOnly || (journey.status === state.AMEND && !refused)
```

### Replace a History Constant with a Positive Assertion
```javascript
// Bad
const REMOVED_INTERNAL_REFERENCE_LIMIT = 'It can be up to 58 characters.'
expect(hint).not.toContain(REMOVED_INTERNAL_REFERENCE_LIMIT)

// Good
expect(hint).toBe('<the hint text the page shows now>')
```

### Log the Throwable
```java
// Bad
log.warn("Lookup failed: {}", e.getMessage());

// Good
log.warn("Address lookup failed for notification {}", notificationId, e);
```

### Compose Functions (Functional)
```typescript
// Before: imperative loops
// After:
return items
    .filter(item => item.isValid())
    .map(transform);
```

## Naming guidelines

### Functions
| Pattern | Example |
|---------|---------|
| Verb for actions | save, create, delete |
| Question for booleans | isValid, hasPermission |
| `find` for optional | findById (may return empty) |
| `get` for guaranteed | getById (throws if not found) |

### Variables
| Bad | Good |
|-----|------|
| d | daysSinceCreation |
| temp | unsavedChanges |
| data | commodityCodeResponse |

## Code quality checklist

### Functions
- [ ] Each does one thing
- [ ] <20 lines
- [ ] Max 3 parameters
- [ ] No flag parameters

### Classes
- [ ] Single responsibility
- [ ] Descriptive noun names
- [ ] Dependencies injected

### Structure
- [ ] No duplication
- [ ] Max 2 nesting levels
- [ ] Related code together
