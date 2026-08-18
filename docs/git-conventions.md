# Git Conventions

Observed across the trade-imports repos. The tests repo is the most consistent reference point — follow its patterns.

## Branch naming


type/TICKET/short-description


| Segment | Format | Example |
|---------|--------|---------|
| `type` | One of the types below | `feat` |
| `TICKET` | Jira ticket ID, uppercase | `EUDPA-42` |
| `short-description` | Kebab-case, brief | `add-origin-page` |

**Full example:** `feat/EUDPA-42/add-origin-page`


### Types

| Type | Use for |
|------|---------|
| `feat` | New feature or user-facing change |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependency updates, config |
| `ci` | CI/CD pipeline changes |
| `docs` | Documentation only |

---

## Commit messages

```
type(TICKET): short description
```

- **Type** — same vocabulary as branch types above
- **Ticket** — Jira ID in uppercase: `EUDPA-42`
- **Description** — imperative mood, lowercase, no full stop

**Examples:**
```
feat(EUDPA-42): add origin of import page
fix(EUDPA-31): read trace ID from request header
test(EUDPA-18): add reason for import tests
chore(deps): bump Playwright to 1.59.1
ci(EUDPA-28): rename GitHub workflow
docs(EUDPA-28): rewrite README
```

For dependency-only changes with no ticket, `chore(deps):` is fine without a ticket scope.

### Tense

Imperative, present tense. Write the commit as an instruction:
- `add origin page` not `added origin page`
- `fix trace ID bug` not `fixed trace ID bug`

---

## Pull requests

- Raise against `main`
- One PR per ticket (or per logical unit of work within a ticket)
- Once the PR is advertised as ready for review, preserve the commit history for reviewers. Don't force-push history changes (unless absolutely necessary);
- GitHub squash merge commit so `main` history is clean

---

## Notes from the history

- Ticket prefix is **EUDPA-** (not EUDP — a recurring typo in early admin commits)
- The frontend and backend repos use a looser `TICKET - Description` style in older commits; the tests repo conventional commit style is the target going forward
- Dependabot branches follow their own format (`dependabot/npm_and_yarn/...`) — leave those as-is
