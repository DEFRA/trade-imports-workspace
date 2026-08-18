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
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/e2e-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
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
- [ ] Non-revealing names
- [ ] Inconsistent conventions

### Structure Smells
- [ ] Duplicated code
- [ ] Long classes (>200 lines)
- [ ] God classes
- [ ] Train wrecks (a.getB().getC().getD())

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
