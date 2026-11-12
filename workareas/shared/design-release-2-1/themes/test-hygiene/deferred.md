# design-release-2-1-test-hygiene: deferred work

| What | Why | Where it lives | State |
|---|---|---|---|
| Delete `workareas/shared/design-release-2-1/themes/test-hygiene/build-args.json` from the workspace branch before workspace PR #253 merges | Sam, 12 November: the loop's settings file may live on the theme branch but must not reach `main` | A commit on `feat/NO_JIRA-design-release-2-1-test-hygiene` in the workspace, made once the loop has drained the theme | Done, 12 November: removed when the theme drained |
| The plants address-book picker's unit test (`results.test.js:59`) checks the legend's class list | Prove the legend is visually hidden by what a user or assistive technology gets, as the rest of the theme now does. Raised by the plants tests row (inc-236) | A later test-hygiene row in `trade-imports-plants-frontend` | Building as inc-267 (Sam, 12 November: fix it) |
| The tests repo's CDP `entrypoint.sh` has no visual profile for any domain | Decide whether the plants and animals screenshot tests should run on CDP as well as in GitHub Actions. Raised by inc-236 | A decision for Sam, then a change in `trade-imports-ins-tests` | Closed: Sam, 12 November, no screenshot tests on CDP is fine |
| The workspace testing guide's FIT helper table (`docs/best-practices/node/testing/frontend.md:166`) lists an out-of-date subset of the plants journey helpers | Bring it up to date, or point it at the plants repo's own testing guide. Raised by inc-236 | The workspace's `docs/` | Building as inc-268 (Sam, 12 November: fix it) |
