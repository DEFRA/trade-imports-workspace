Implement Jira ticket EUDPA-774, "Save and continue always goes on through the rest of the journey", across the live animals and high-risk plants frontends. Orchestrate it as a Workflow. I'm opting in to multi-agent orchestration for this task.

## Read first
- The ticket: `tim jira ticket EUDPA-774`. Its acceptance criteria are the contract.
- The same description, locally: `~/git/defra/trade-imports-workspace/workareas/ticket-creation/EUDPA-328-save-and-continue-through-journey/description.jira.txt`
- The page-by-page investigation of today's behaviour, with code and test references: `save-and-continue-investigation.md` in the same folder.
- The `ticket` skill (implement flow) and the `frontend-change` skill's "change the journey flow" maintenance guard rails. Follow both repos' own recipe docs.
- `.claude/rules/code-quality.md`.

## The rule being built
- **Save and continue** on any journey page goes to the next page that applies, in the one page order (the order Overview lists the tasks). On the last page it goes to the review page. It does this however the page was reached: a new notification, Overview, a reopened draft, a review-page Change link or an amendment.
- **Back** goes to wherever the trader came from: the previous journey page, Overview or the review page. Carry that on the link or form, as the `change` parameter is carried today, not in session state.
- **Save and return to overview** stays as it is, and always goes to Overview.
- **Amend:** Amend opens the review page, and a Change link there opens the right journey page. From there the journey is normal: pages show Save and continue only, with no Save and return to the review and no `change` shortcut back. The buttons come from `shared/amend-form-actions.js`.
- **Remove, don't patch:** delete the opening run completely, as if it never existed. That means:
  - `flow/run-state.js` and everything that starts, ends or reads it
  - `RUN_STEPS` run-only fields: `endsRunWhenComplete`, `backCandidates`, `offersBackWhen`
  - `kit.runBackLink`, `previousRunTarget` and `entryBackLink`
  - `nextInTaskRow`
  - the Back links hard-wired to Overview
  - the second internal page orders in `flow/flow.js` and `flow/task-rows.js`

  Keep one ordered page list with its gates (`pageGatePasses`) and derive the next page from it. Delete the tests whose subject is the opening run; don't invert them.
- **Out of scope, leave alone:**
  - sub-pages that return to the page that opened them: CPH, permanent address, add transporter, the picker's View link
  - the review page's own buttons and Continue, the declaration and the confirmation page
  - template mode, which the ticket doesn't cover. Keep its behaviour, but rebuild anything it gets from the deleted run code on the new mechanism.
- Animals and plants must route the same way, with the same rule in each frontend's platform code. Germinal is a set inside the animals frontend and follows the same rule.

## Setup
Work in place in this checkout and `repos/`. No worktrees, no side clones.
1. For each repo, run `git -C <repo> branch --show-current` and `git status`. Stash with `git stash push -u` only if a switch forces it. Leave untracked `workareas/` files alone.
2. Fetch, and branch from the latest `origin/main` in each repo you change:
   - `trade-imports-animals-frontend`
   - `trade-imports-plants-frontend`
   - `trade-imports-ins-tests`
   - this workspace, for `openspec/`
3. Use the same branch name everywhere: `feat/EUDPA-774-save-and-continue-through-journey`.
4. Before starting, check for open PRs or branches that touch the same routing code: `shared/kit.js`, `flow/*`, `shared/amend-form-actions.js`. Run `gh search prs --owner DEFRA --state open` and check `feat/EUDPA-690-type-question` in particular. Report any overlap before building on it.

## Workflow shape (suggested)
1. **Understand:** one agent per frontend maps every journey page's Save and continue and Back today against the investigation report, and confirms the list of code to delete.
2. **Plan:** one plan, reviewed by an adversarial agent against every acceptance criterion and the "remove, don't patch" rule.
3. **Implement:** animals first (canary), then plants to match. Apply the plants changes to its own copy of the platform code, not by copying files across. The animals frontend, plants frontend and tests repos are separate, so per-repo agents can run in parallel once the animals design is proven.
4. **Spec and tests:**
   - Rewrite REQ-FLOW-003 and REQ-FLOW-007 in `openspec/specs/live-animals/journey-flow/spec.md`, the plants journey-flow spec, and every page spec that states a Save and continue or Back destination. Remove any scenario about the opening run or about returning to Overview on Save and continue.
   - Update the coverage links.
   - Add E2E tests for: Save and continue from Overview, from a reopened draft, from a Change link and from an amendment. Back stepping in reverse after several Save and continues from Overview. Amend pages showing Save and continue only.
5. **Verify:**
   - Unit and integration tests in each frontend.
   - The E2E suites for animals, plants and ins against the local stack: `tim docker dev` with the branch.
   - `tim spec lint` and `tim spec gaps --none` for the touched prefixes.
   - A final completeness check: grep both frontends for `run-state`, `runBackLink`, `backCandidates`, `offersBackWhen`, `nextInTaskRow` and `endsRunWhenComplete`, and expect nothing.

## Finish
- A red test on the branch is yours to fix.
- Push the branches; the SonarCloud pre-push gate runs. Raise one PR per repo against `main`, cross-linked, each body naming EUDPA-774.
- Post the PR links and the check results, then stop. Don't merge without my go.
- The Design Release 2.1 backlogs (`workareas/shared/design-release-2-1/`) have already had this navigation taken out of their rows (PR #219), so don't edit them.
