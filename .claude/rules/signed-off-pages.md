# Signed-off pages

A signed-off page has behaviour a person has agreed. An agent can raise a
change to it, but never decides one. This applies to all work in the
workspace: the build loop, a single ticket, an upgrade, a style fix.

## What a signed-off page is

- Its feature folder's `page.js` has `maturity: 'agreed'` or
  `maturity: 'readyForLive'`.
- Its spec under `openspec/specs/<domain>/journey-pages/<page>/spec.md` has
  the same level on its `**Maturity**:` line.
- Every scenario in its contract has a `**Signed off**: <YYYY-MM-DD>` line,
  shared specs included, since a page's behaviour spreads across several.

The spec is the contract. The tests linked to its scenarios in
`openspec/coverage/**/coverage.json` are the evidence.

## What needs a person's decision

- A signed-off scenario is added, changed or removed, or loses its mark.
- A test linked to a signed-off scenario is edited or deleted.

A red linked test means the code is wrong. Fix the code, not the test, unless
a person has ruled the behaviour should change. This is the one exception to
CLAUDE.md rule 6.

## Find out

Before raising a pull request, run the check over your work:

```bash
tim spec diff --signed-off --range origin/main...HEAD --json
tim spec diff --signed-off --repo <repo> --base origin/main --json
```

The first covers the workspace's `openspec/`. The second covers each service
repo you changed. Exit code 3 means a signed-off scenario changes.

## When it trips

1. Carry on with the work. A trip is not a block.
2. Raise a Jira ticket from `result.ticketDraft`:
   - Write `summary` into a `tim-ticket/1` manifest, and `description` into
     the file its `descriptionFile` names.
   - `tim jira create --from <manifest> --json` for a dry run.
   - `tim jira create --from <manifest> --confirm <planId> --json` to create
     it.
3. Keep every pull request on the branch as a draft: the workspace one for
   `openspec/` and each repo's one, all on the same branch name. Link the
   ticket in each.
4. Stop there. A person approves or refuses:
   - Approved: they take the pull requests out of draft and merge as normal.
   - Refused: the spec change comes out, and the code behind it.

Never take a pull request out of draft, or merge it, while its ticket is open.

## Promoting a page

Promotion is its own reviewed pull request, never part of other work.

1. Check the page's scenarios are thorough: they say everything the page
   does. Then check each is proven: `tim spec gaps --capability <path>`
   must list none of them, for the page spec and every shared spec in its
   contract.
2. Set `maturity` in the page's `page.js` to `agreed` or `readyForLive`.
3. Set the same level on the spec's `**Maturity**:` line.
4. Mark each scenario in the page's contract `**Signed off**: <today>`.
5. Run `tim spec lint`, then raise one pull request per repo, on one branch
   name, for a person to review.

Marking a scenario signed off is a promotion, so `tim spec diff --signed-off`
does not report it.
