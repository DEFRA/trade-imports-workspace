## What

This is the paired tests-repository PR for the shared accessible-autocomplete
styling increment. The four computed-style and paint-order tripwires live
beside each frontend component. This PR carries the Darwin and Linux animals
origin visual baselines regenerated after inspection confirmed their entire
163-pixel delta is the newly visible dropdown arrow.

## Sibling PR

The implementation and browser-style tripwires are in
[DEFRA/trade-imports-plants-frontend #67](https://github.com/DEFRA/trade-imports-plants-frontend/pull/67).
The byte-identical port is in
[DEFRA/trade-imports-animals-frontend #314](https://github.com/DEFRA/trade-imports-animals-frontend/pull/314).
Merge the coordinated PRs together.

## Verification

The plants E2E project is green (64 tests), and the full cross-service E2E
suite is green (257 passed, 1 skipped). After the animals port, its E2E project
is green (150 tests), including the regenerated visual baseline. Both ran
against the verified source-mounted development stack.

Snagging increment `snag-001` (`workareas/shared/plants-snagging`). No Jira
ticket by design.

Generated with OpenAI Codex.
