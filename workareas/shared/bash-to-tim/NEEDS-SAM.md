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
4. **SonarCloud token and live check (P56).** Done 2026-11-18: all four
   checks passed once `SONAR_TOKEN` was set and `sonar-scanner` installed.
5. **Allowlist test (P11).** Done 2026-11-18: a `*` inside a `:*` rule
   matches nothing, so P71 allows one literal prefix per repo. Recorded in
   `docs/agent-skills.md`.
6. **Relative allow rules and a second clone (P71 to P73).** Done
   2026-11-18: #280 and #283 replace every rule naming the fixed path, and
   #281 makes skills and docs type relative paths. A fresh clone at
   `~/git/defra/trade-imports-workspace-2` ran 12 typical commands with no
   prompt (`p73-results.json`).
7. **Plants prototype.** Done 2026-11-18: prototype #27 squash-merged
   (`6507801`) at Sam's request, and both `main` runs after it passed. It
   ports ins-frontend's typed address-book model, fixes the three red
   checks (release stylesheets load GOV.UK with the app's settings, the
   canary makes `ci-canary`, joi and `@hapi/content` upgraded), points
   `README.md` at `tim docker up`, and makes `scripts/designer/**` find the
   workspace from the checkout. It also fixes `kit.test.js`, which searched
   the real home folder and hung the pre-commit hook.

The programme is done.

## Optional

- Refresh the global tim link: `npm rm -g tim; npm --prefix tim link`.
- The picomatch advisory allowlist entries (GHSA-fc5q-39xc-vjpf) expire on
  2026-11-25 in every repo that has one, the prototype included. Renew or
  remove them before then, or each repo's audit goes red.
- The prototype's `AGENTS.md`, `docs/designers/**` and `.claude/rules/`
  still write `~/git/defra/trade-imports-workspace/…`, and its
  `suite.test.js` requires that form. Outside this programme's scope.
- Delete the second clone, `~/git/defra/trade-imports-workspace-2`.
- EUDPA-804, raised as the P26 test, is unassigned:
  `tim jira assign EUDPA-804 me --confirm`.
