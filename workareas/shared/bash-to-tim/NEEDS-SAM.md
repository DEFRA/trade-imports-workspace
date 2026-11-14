# Waiting on Sam

Everything in the bash-to-tim programme that an agent cannot do. The loop
skips these and builds what it can. Remove an item once it is done.

The scripts below live in the session scratchpad. If it has gone, ask
for them again.

## Settings and hooks

Agents cannot edit `.claude/settings.json`.

1. **P55: switch the four sonar hooks to tim.** The tim commands are on the
   branch (`d4ca6050`). Run `settings-switch-sonar-hooks.mjs`, start a new
   session to check the SessionStart hooks run quietly, then set P55 to
   `todo`. The loop then deletes the three scripts under `scripts/sonar/`
   and rewrites the docs.
2. **Optional: allow the `gh` calls the review and style skills now make.**
   `settings-add-allow.mjs 'Bash(gh search prs:*)' 'Bash(gh pr diff:*)'
   'Bash(gh api repos/DEFRA/*/pulls/*/files:*)'`. The mid-pattern `*` in the
   last one is untested: P11 finds out whether it matches.
3. **Later allowlist removals** are listed per row in
   `settings-followups.md`. Remove them with `settings-remove-allow.mjs`.

## Your rows

4. **P11: test which allowlist patterns match without a prompt.** P71 and
   P72 wait on it.
5. **P19B: port the two guard hooks to Node.** P19's corpus is on the
   branch. Add `guard-bash.sh:120` naming the clone in use.
6. **P57 follow-up: switch the push gate hooks.** P57 landed with the two
   push gate scripts reduced to forwarders into `tim sonar push-check`.
   The hooks in this workspace's `.claude/settings.json` and in 8 repos'
   settings still name the scripts, so the scripts stay until those hooks
   switch. The canary steps are under `## P57` in `settings-followups.md`.

## Checks that need you

7. **SONAR_TOKEN is not set where agents look.** The P56 agents found it in
   neither the environment, `~/.zshrc` nor `~/.zshenv`. If so, the pre-push
   SonarCloud gate has been skipping on every push. Check with
   `! printenv SONAR_TOKEN | wc -c`.
8. **P56 live runs.** With the token set, run `tim sonar push-check` in
   `repos/trade-imports-address-book` and
   `repos/trade-imports-animals-frontend`, and check that the PR it analyses
   matches `gh pr view` for that branch.
9. **P61 and P62 stack canary.** The workspace stack was started by hand
   and nobody holds a lease, so no agent took it down. Once it is free,
   run `tim docker dev`, wait for healthy, then `tim build gate`, then
   `tim docker down`, all under a lease, on this branch. P61 and P62 land
   without it; CI's E2E at landing starts the stack through the same code.
10. **Optional: refresh your global tim link.** It still points at
    `tim/src/cli.js`, from before the launcher. It works again now that
    `cli.js` has its execute bit back, but `npm --prefix tim link` did not
    move it. `npm rm -g tim` then `npm --prefix tim link` does.
11. **Plants prototype: a red test and a stale README line.**
    `repos/trade-imports-plants-prototype/README.md:300` still names
    `run-stack.sh`. Fixing it needs a prototype commit, and the prototype's
    pre-commit hook fails today: `ins-address-book.test.js` checks the
    prototype against `trade-imports-ins-frontend`, whose barrel now
    exports `addressTypeOfRole` and `keepRolesOfferedBy`. Either port
    ins-frontend's typed address-book model into the prototype, or stop
    the test tracking the sibling. That choice is for whoever owns the
    prototype, so P62 leaves the line alone.

12. **After the merge: delete the E2E forwarders.** Service repos call
    `e2e-tests.yml@main`, and main's copy checks out this branch and runs
    `scripts/ci/resolve-scope.sh`, `normalise-suites.sh`,
    `normalise-tags.sh` and `scripts/stack/run-stack.sh` (the performance
    tests' `smoke.yml@main` runs `run-stack.sh` too). Those four are now
    forwarders into tim, so E2E runs before the merge. Once the workspace
    and performance-tests pull requests have merged, delete the four
    scripts. `scripts-ci.golden.test.js` skips while they forward.

## Done

- P26 canary: EUDPA-804 raised through `tim jira create` on 14 Nov 2026.
  It is unassigned: `tim jira assign EUDPA-804 me --confirm` if you want it.
