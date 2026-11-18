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
2. **Workspace sonar hooks (P55).** Done 2026-11-18: the hooks run tim,
   a new session started clean, and `scripts/sonar/` is deleted.
3. **Merge.** Done 2026-11-18, by Claude at Sam's request: the 12 PRs are
   squash-merged, the workspace last (#263, `06b50173`). The blocked PRs
   needed a no-op commit, and animals-admin and performance-tests needed
   the picomatch advisory allowlisted (as animals-frontend already had,
   expiring 2026-11-25). #278 deletes the four E2E forwarders, which
   empties `scripts/`.
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
