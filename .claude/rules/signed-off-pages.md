# Signed-off pages

A signed-off page has behaviour a person has agreed. Only the increment build
loop checks for changes to it. No other work runs the check, raises a ticket
for it or waits for a person because of it.

## What a signed-off page is

- Its feature folder's `page.js` has `maturity: 'agreed'` or
  `maturity: 'readyForLive'`.
- Its spec under `openspec/specs/<domain>/journey-pages/<page>/spec.md` has
  the same level on its `**Maturity**:` line.
- Every scenario in its contract has a `**Signed off**: <YYYY-MM-DD>` line,
  shared specs included, since a page's behaviour spreads across several.

The spec is the contract. The tests linked to its scenarios in
`openspec/coverage/**/coverage.json` are the evidence.

## How the build loop checks

The increment build loop (`requirements-pipeline` BUILD) looks for a change
to a signed-off scenario, or to a test linked to one:

- Full lifecycle: on each row, as the last step before merge. If it trips,
  the row's pull requests become drafts, a Jira ticket is raised and the row
  is held. The loop carries on with other rows.
- Branch lifecycle: once at theme end, after the engineering review. If it
  trips, the theme's open pull requests, the workspace one included, become
  drafts with a comment, and a ticket draft is written.

It never stops a run. The mechanics are in
[`BUILD.md`](../skills/requirements-pipeline/references/BUILD.md#the-signed-off-check).

## How a person decides

- Approve: take the pull requests out of draft. In the full lifecycle, set
  the row back to `todo` too, and the next launch merges it.
- Refuse: close the pull requests. The spec change comes out, and the code
  behind it.

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
