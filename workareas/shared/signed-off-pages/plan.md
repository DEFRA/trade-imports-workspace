# Signed-off pages: the spec is the contract

Plan, not built. Replaces the file-sorting approach in `options-v1-file-lanes.md`, which is kept for its history of past changes.

## Summary

- **`openspec/` is the contract** for a signed-off page. The tests are its evidence. `coverage.json` joins the two.
- **Keep spec and tests in step automatically,** on every route a change takes, not only when a skill remembers.
- **Watch the spec, not the code.** A change to a signed-off scenario, or to a test linked to one, needs a person's decision.
- **Not a hard block.** The work carries on. The pull requests stay as drafts, and a Jira ticket explains the spec change for the right people to approve or refuse.
- **Applies to everyone working in the workspace,** whether through the build loop or a single ticket.

## Plan of action

**1. Move the banner level into feature folders**
- Each feature's `page.js` gains `maturity: 'exploring' | 'detailing' | 'agreed' | 'readyForLive'`, defaulting to exploring.
- The banner reads the level from the page, not from route patterns. `page-levels.js` and its section matching go.
- Both frontends get this, plus the plants prototype when it next syncs.

**2. Record the level in the spec**
- Each `openspec/specs/<domain>/journey-pages/<page>/spec.md` carries a `**Maturity**:` line.
- For Agreed and Ready for live, the page's scenarios are marked signed off, shared specs included.
- `tim spec lint` checks the feature folder, the spec line and the scenario marks agree.

**3. Catch up the spec**
- Run "catch-up and cover" for each area, starting with the pages nearest sign-off.
- Done when lint is clean and every scenario on those pages has a test.

**4. Keep spec and tests in step automatically**
- The `ticket` skill gets the spec-sync step the build loop already has.
- A workspace CI job runs `tim spec lint` on `openspec/` changes.

**5. Build the tripwire**
- `tim spec diff --signed-off` reports changes to signed-off scenarios, and edits to tests linked to them.
- The rule-6 exception goes in `.claude/rules/`: for a linked test, fix the code, not the test.

**6. Wire it in everywhere**
- Build loop: a check after each row's spec sync. A trip parks the row and the loop carries on.
- Skills: `ticket` and `frontend-change` run the check before a pull request. The upgrade and style skills run it to prove nothing changed.
- Frontend pull request check: flags edits to linked tests, for work outside Claude.

**7. Draft plus ticket when it trips**
- Raise a Jira ticket saying what changes and why, through `tim jira create`.
- Keep the pull requests as drafts, linked to the ticket. A person approves or refuses.

**8. Canary, then roll out**
- Prove the whole flow on the animals frontend with a stand-in signed-off page on a throwaway branch.
- Then plants and INS.

**9. Sign off the first real page**
- Promoting a page means: check its scenarios are thorough, set the level in `page.js`, mark the spec, all in one reviewed pull request.

## What exists today

| Part | State |
|---|---|
| Spec sync in the build loop | **Already on every row.** Plan section 8 names it, the implementor writes it, review judges the spec diff against the code diff, the ladder runs `tim spec lint`, the land stage commits `openspec/`, and Done posts a scenario-by-scenario diff to the row's ticket. A theme-end spec check runs lint and gaps. |
| Spec sync in `frontend-change` | Yes, after every increment |
| Spec sync in `review` and `prototype` | Mentioned |
| Spec sync in `ticket` | **None.** The single-ticket route never touches the spec. |
| Spec sync in `govuk-upgrade`, `npm-upgrade`, `code-style` | None. Mostly right: upgrades and style changes should not change behaviour. |
| CI | **No spec check.** `tim-ci` tests `tim` only. |
| What a commit did to the spec | `tim spec diff` |
| Whether links are valid | `tim spec lint` |
| What isn't proven | `tim spec gaps` |
| Bring the spec in line with code, and tests in line with the spec | `spec-catchup`, `spec-cover` |
| Page maturity | `page-maturity/page-levels.js` in each frontend, read by the banner only. No page is at Agreed or Ready for live today. |
| Pull request draft state in the loop | Already a person's. The loop never un-drafts or merges a theme pull request. |

## The design

### 1. A signed-off mark in the spec

- Goes on **scenarios,** because a page's behaviour is spread across `journey-pages/<page>` and shared specs such as `journey-obligations/review` and `page-titles`.
- Set when a page is promoted to Agreed or Ready for live, in the same pull request as the `page-levels.js` change.
- `tim spec lint` checks the two agree: a signed-off page has marked scenarios, and a marked scenario belongs to a signed-off page.

### 2. One check: `tim spec diff --signed-off`

It reports any change to a signed-off scenario:
- the scenario itself was added, changed or removed;
- **a test linked to it in `coverage.json` was edited or deleted.** This closes the gap where an agent changes behaviour, updates the test to match and never touches the spec. The test is the spec's evidence, so no import chasing is needed.

### 3. What happens when it trips

- The work carries on.
- A Jira ticket is raised through `tim jira create`. It says which signed-off scenarios change, from what to what, and why.
- The workspace pull request for the spec and each repo's pull request share one branch name. They stay as drafts and link the ticket.
- Approved: a person un-drafts and merges as normal. Refused: the spec change comes out, and so does the code behind it.

### 4. Where it runs

| Route | How |
|---|---|
| Build loop | A new stage after the row's spec sync. A trip keeps the theme pull request as a draft, raises the ticket and parks the row, and the loop carries on with other rows. |
| Single tickets | The `ticket` skill gains the spec-sync step the build loop already has, then runs the check before raising a pull request. |
| Upgrades and style | `govuk-upgrade`, `npm-upgrade` and `code-style` run the check only. A trip means the "no behaviour change" work changed behaviour, and that is worth a person's look. |
| Anything outside Claude | A pull request check in each frontend flags edits to tests linked to signed-off scenarios. A workspace CI job runs `tim spec diff --signed-off` on `openspec/` changes. |
| Workspace rule | A line in `.claude/rules/`: a change touching a signed-off scenario is raised, not decided by the agent. Rule 6, which says a red test on your branch is yours to fix, gets an exception: for a linked test, fix the code, not the test. |

## Stages

### Stage 1: catch-up

The spec must be in step before it can be watched.

- Run "catch-up and cover" per domain: animals, plants, ins, animals-admin. That means `spec-catchup` then `spec-cover`.
- Start with the domains whose pages will be signed off first.
- Done when `tim spec lint` is clean and `tim spec gaps --none` is empty for that domain's pages.

### Stage 2: keep it in step automatically

- Spec sync in the `ticket` skill.
- A workspace CI job for `tim spec lint` on `openspec/` changes.
- A drift check: the theme-end spec check in the build loop also runs per row.

### Stage 3: watch signed-off scenarios

- The signed-off mark and its lint.
- `tim spec diff --signed-off`.
- The build-loop stage, the skill steps and the frontend pull request check.
- The draft-plus-ticket flow.
- Canary: the animals frontend, with a stand-in signed-off page on a throwaway branch.

## Not covered

- **Wording and layout** aren't in the spec. Design tweaks pass unless a screenshot test is linked as coverage.
- **The spec only protects what it says.** Promoting a page includes checking its scenarios are thorough and fully covered.
- **Backend changes** are caught only where an end-to-end test linked to a signed-off scenario runs on the backend's pull request.
- **The mark protects nothing** until a page is promoted.

## Calls made

- Both Agreed and Ready for live count as signed off.
- The mark sits on scenarios, not capabilities.
- An edit to a linked test counts as a change to its scenario.
- No new sync stage in the build loop: it already syncs. The new stage is the signed-off check.
- Upgrade and style skills run the check, not a sync.
