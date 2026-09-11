## What

This is the paired tests-repository PR for the shared accessible-autocomplete
styling increment. The four computed-style and paint-order tripwires live
beside each frontend component. It intentionally carries no animals visual
baselines: those live on the animals frontend's matching tests branch.

## Sibling PR

The implementation and browser-style tripwires are in
[DEFRA/trade-imports-plants-frontend #67](https://github.com/DEFRA/trade-imports-plants-frontend/pull/67).
Merge this paired branch with that PR.

## Verification

The plants E2E project is green (64 tests), and the full cross-service E2E
suite is green (257 passed, 1 skipped). Both ran against the verified
source-mounted development stack.

Snagging increment `snag-001` (`workareas/shared/plants-snagging`). No Jira
ticket by design.

Generated with OpenAI Codex.
