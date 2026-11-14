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
6. **P57, when the loop reaches it:** the push gate hook in this
   workspace's `.claude/settings.json` and in 8 repos' settings switches to
   `tim sonar push-check --hook`.

## Checks that need you

7. **SONAR_TOKEN is not set where agents look.** The P56 agents found it in
   neither the environment, `~/.zshrc` nor `~/.zshenv`. If so, the pre-push
   SonarCloud gate has been skipping on every push. Check with
   `! printenv SONAR_TOKEN | wc -c`.
8. **P56 live runs.** With the token set, run `tim sonar push-check` in
   `repos/trade-imports-address-book` and
   `repos/trade-imports-animals-frontend`, and check that the PR it analyses
   matches `gh pr view` for that branch.

## Done

- P26 canary: EUDPA-804 raised through `tim jira create` on 14 Nov 2026.
  It is unassigned: `tim jira assign EUDPA-804 me --confirm` if you want it.
