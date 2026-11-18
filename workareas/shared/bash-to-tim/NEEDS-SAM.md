# Waiting on Sam

Everything in the bash-to-tim programme that an agent cannot do. The page
https://claude.ai/artifact/SodeNRwrvnhhQ5wzAkunhK shows the same list.
Run the scripts from the workspace root. They live in `sam/` beside this
file, untracked, and each asks before it changes anything.

The scope is the scripts under `tools/` and `scripts/`. Git hooks and
Claude hooks stay as they are, except where a hook runs one of those
scripts. So P19B (the guard hooks) is dropped, and the 8 service repos
keep their hook calling `tools/sonar/sonar-push-check.sh`, a one-line
forwarder into tim that stays.

1. **Stack check (P61, P62).** Done 2026-11-18: passed, all 21 containers
   started from local source and came down again.
2. **Workspace sonar hooks (P55).** `node workareas/shared/bash-to-tim/sam/2-switch-hooks.mjs`
   switches the workspace's push gate and four session hooks to tim and
   commits to #263. Then an agent deletes `scripts/sonar/` and sets P55
   done, before the merge.
3. **Merge.** `node workareas/shared/bash-to-tim/sam/3-merge-prs.mjs`
   squash-merges the 12 green PRs, service repos first and the workspace
   last, leaving the plants prototype out. Then an agent deletes the four
   E2E forwarders (`scripts/ci/*.sh`, `scripts/stack/run-stack.sh`), which
   exist only because service repos call `e2e-tests.yml@main`.
4. **SonarCloud token and live check (P56).** `node workareas/shared/bash-to-tim/sam/4-sonar-check.mjs`
   says how to save `SONAR_TOKEN` if it is missing, else runs the check on
   address-book and the hook on animals-frontend, passing and blocked.
5. **Allowlist test (P11).** `node workareas/shared/bash-to-tim/sam/5-allowlist-test.mjs`
   walks two sessions and saves `p11-results.json`. P71 and P72 wait on it.
6. **Plants prototype.** `ins-address-book.test.js` fails because
   ins-frontend exports `addressTypeOfRole` and `keepRolesOfferedBy` and the
   prototype does not, so its pre-commit hook is red. Port ins-frontend's
   typed address-book model, or stop the test tracking the sibling. Then an
   agent fixes the prototype's three red CI checks (the `plants-working`
   canary name, the joi audit, the font 404) and `README.md:300`.

## Optional

- Refresh the global tim link: `npm rm -g tim; npm --prefix tim link`.
- EUDPA-804, raised as the P26 test, is unassigned:
  `tim jira assign EUDPA-804 me --confirm`.
